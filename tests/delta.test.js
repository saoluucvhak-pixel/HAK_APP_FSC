'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs'), os = require('os'), path = require('path');
const {Store} = require('../src/store');
const D = require('../src/delta');

const F = (id, ma, n = 2) => MM.ensureForest({id, info: {maRung: ma, tenRung: 'Rừng ' + ma}, nc: [], dx: [], pc: Array.from({length: n}, (_, i) => ({_id: 'p' + i, soPhieu: ma + '-' + i, kl: 10 + i}))});
const O = (id, forests) => ({id, info: {ma: 'CR-' + id, ten: 'CHỦ ' + id, cccd: '0490000000' + id.length}, forests: Object.fromEntries(forests.map(f => [f.id, f]))});
/* cấu trúc 2.0 (giai đoạn 3): giao diện giữ dữ liệu đã chuẩn hóa (lô có đội), như SQLite lưu */
const MM = require('../src/model');
const LK = require('../src/lienket');
const chuanHoa = db => { Object.values(db.rs || {}).forEach(o => Object.values(o.forests || {}).forEach(f => { if (LK.canChuan(f)) LK.chuanLo(f); })); return db; };   // như giao diện chuanHoaDb (3.0: ID dòng)
const base = () => chuanHoa(MM.ensureDb(base0()));
const base0 = () => ({v: 2, rs: {a: O('a', [F('fa1', 'A1'), F('fa2', 'A2')]), b: O('b', [F('fb1', 'B1')]), c: O('c', [])}, congTy: {c1: {id: 'c1', ten: 'CTY', mst: '1'}}, norm: {x: 1}});
const clone = x => JSON.parse(JSON.stringify(x));
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'hakqn-delta-'));
/* lưu theo phần thay đổi giống cách giao diện làm (ui/app/02-luu-tru-trang-thai.js) */
function deltaSave(s, cache, db) {
  const snap = D.snapshot(db), d = D.diff(cache.snap, snap);
  d.rev = cache.rev; d.side = D.side(db); d.counts = snap.counts;
  const r = s.saveDelta(d); return {r, cache: {rev: r.rev, snap}};
}
const rows = s => ({o: s.db.prepare('SELECT id,ma,ten,cccd,data,hash FROM owners ORDER BY id').all(), f: s.db.prepare('SELECT id,owner_id,ma_rung,ten_rung,data,hash FROM forests ORDER BY id').all(),
  c: s.db.prepare('SELECT id,ten,mst,data,hash FROM companies ORDER BY id').all(), m: s.db.prepare("SELECT key,value FROM meta WHERE key NOT LIKE 'lk:%' ORDER BY key").all()});

test('delta: chuỗi JSON và mã băm GIỐNG HỆT lưu toàn bộ (Store.explode) — lưu toàn bộ ngay sau đó không ghi dòng nào', () => {
  const s = new Store(':memory:'), db = base(), snap = D.snapshot(db), ex = s.explode(db);
  ex.owners.forEach(o => assert.strictEqual(snap.owners.get(o.id), o.data));
  ex.forests.forEach(f => assert.deepStrictEqual(snap.forests.get(f.id), {owner: f.owner_id, json: f.data}));
  let cache = {rev: s.save(base()).rev, snap: D.snapshot(base())};
  const db2 = base(); db2.rs.a.forests.fa1.pc[0].kl = 99; db2.rs.b.info.ten = 'ĐỔI';
  ({cache} = deltaSave(s, cache, db2));
  assert.strictEqual(s.save(db2).changed, 0, 'lưu toàn bộ sau khi lưu theo phần thay đổi: không còn gì khác');
});

test('delta: chuỗi thao tác (sửa, thêm, chuyển lô sang chủ khác, xóa lô, xóa chủ, công ty, meta) cho kết quả trùng khớp lưu toàn bộ', () => {
  const A = new Store(':memory:'), B = new Store(':memory:');
  let db = base(); A.save(clone(db)); let cache = {rev: B.save(clone(db)).rev, snap: D.snapshot(db)};
  const steps = [
    d => { d.rs.a.forests.fa1.pc.push({_id: 'px', soPhieu: 'MỚI', kl: 5}); },
    d => { d.rs.d = O('d', [F('fd1', 'D1', 3)]); },
    d => { d.rs.b.forests.fa2 = d.rs.a.forests.fa2; delete d.rs.a.forests.fa2; },    // chuyển lô fa2 sang chủ b
    d => { delete d.rs.b.forests.fb1; },
    d => { delete d.rs.c; },
    d => { d.congTy.c2 = {id: 'c2', ten: 'CTY 2', mst: '2'}; delete d.congTy.c1; d.norm = {x: 2}; d.dinhMuc = [1, 2]; },
    d => { d.rs.a.info.ten = 'NGUYỄN A'; d.rs.d.forests.fd1.info.maRung = 'D1-SỬA'; },
    d => { /* không đổi gì */ }
  ];
  for (const st of steps) {
    st(db); A.save(clone(db));
    const {r, cache: c2} = deltaSave(B, cache, clone(db)); cache = c2;
    assert.strictEqual(r.mode, 'delta');
    assert.deepStrictEqual(rows(B), rows(A));
  }
  assert.deepStrictEqual(B.load(), A.load());
});

test('delta: rev lệch (đã ghi từ nơi khác) → STALE, không ghi gì', () => {
  const s = new Store(':memory:'), db = base(); const cache = {rev: s.save(db).rev, snap: D.snapshot(db)};
  s.save(base());                                                     // ghi từ nơi khác (khôi phục, khôi phục lô...)
  const db2 = base(); db2.rs.a.info.ten = 'X';
  assert.throws(() => deltaSave(s, cache, db2), e => e.code === 'STALE');
  assert.strictEqual(s.load().rs.a.info.ten, 'CHỦ a');
});

test('delta: ảnh chụp lệch thật với cơ sở dữ liệu → MISMATCH, hoàn tác cả giao dịch', () => {
  const s = new Store(':memory:'), db = base(); const r0 = s.save(db);
  const wrong = base(); delete wrong.rs.c;                             // ảnh chụp sai: thiếu chủ c (không ứng với cơ sở dữ liệu)
  const db2 = base(); db2.rs.a.info.ten = 'X'; delete db2.rs.c;
  const before = rows(s);
  assert.throws(() => deltaSave(s, {rev: r0.rev, snap: D.snapshot(wrong)}, db2), e => e.code === 'MISMATCH');
  assert.deepStrictEqual(rows(s), before);
  const d = {rev: s.rev, upO: {}, upF: {zz: {owner: 'khong-co', json: JSON.stringify(F('zz', 'Z'))}}, delO: [], delF: [], side: D.side(base()), counts: {owners: 3, forests: 4}};
  assert.throws(() => s.saveDelta(d), e => e.code === 'MISMATCH', 'lô gắn với chủ rừng không có');
  assert.deepStrictEqual(rows(s), before);
});

test('delta: cùng bảo vệ như lưu toàn bộ — chặn xóa từ 2 chủ rừng, sao lưu trước khi xóa, từ chối JSON sai / sai mã', () => {
  const dir = tmp(), bk = path.join(dir, 'bk'), s = new Store(path.join(dir, 'x.sqlite'), {backupDir: bk}), db = base();
  let cache = {rev: s.save(db).rev, snap: D.snapshot(db)};
  const two = base(); delete two.rs.b; delete two.rs.c;
  assert.throws(() => deltaSave(s, cache, two), e => e.code === 'BULK_DELETE');
  assert.strictEqual(Object.keys(s.load().rs).length, 3);
  const one = base(); delete one.rs.c;
  ({cache} = deltaSave(s, cache, one));
  assert.ok(fs.readdirSync(bk).some(n => n.startsWith('truoc-xoa-')), 'có bản sao lưu trước khi xóa');
  const bad = j => ({rev: s.rev, upO: {a: j}, upF: {}, delO: [], delF: [], side: D.side(one), counts: {owners: 2, forests: 3}});
  assert.throws(() => s.saveDelta(bad('{hỏng')), e => e.code === 'MISMATCH');
  assert.throws(() => s.saveDelta(bad(JSON.stringify({id: 'khac', info: {}}))), e => e.code === 'MISMATCH');
  assert.throws(() => s.saveDelta({rev: s.rev}), e => e.code === 'MISMATCH', 'thiếu số đếm');
  assert.throws(() => s.saveDelta(null), e => e.code === 'MISMATCH');
});

test('delta: snapshot phát hiện trùng mã nội bộ (để giao diện lưu toàn bộ và nhận lỗi DUP_ID)', () => {
  const db = base(); db.rs.b.forests.fa1 = F('fa1', 'TRÙNG');
  assert.strictEqual(D.snapshot(db).dup, true);
  assert.strictEqual(D.snapshot(base()).dup, false);
  assert.deepStrictEqual(D.snapshot(base()).counts, {owners: 3, forests: 3});
});

test('delta: đổi 1 phiếu trong 10.000 phiếu chỉ gửi 1 lô, nhanh hơn rõ so với lưu toàn bộ', () => {
  const {sample} = require('../scripts/perf-luu'), s = new Store(':memory:'), db = sample(50, 2, 100);
  const r0 = s.save(db); let cache = {rev: r0.rev, snap: D.snapshot(db)};
  db.rs.o3.forests.f3_1.pc[5].kl = 1;
  const snap = D.snapshot(db), d = D.diff(cache.snap, snap);
  assert.strictEqual(D.size(d), 1);
  assert.deepStrictEqual(Object.keys(d.upF), ['f3_1']);
  d.rev = cache.rev; d.side = D.side(db); d.counts = snap.counts;
  assert.strictEqual(s.saveDelta(d).changed, 1);
  assert.strictEqual(s.load().rs.o3.forests.f3_1.pc[5].kl, 1);
});
