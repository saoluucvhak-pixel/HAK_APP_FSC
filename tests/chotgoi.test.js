'use strict';
/* B5: gói đóng băng của lô đã chốt (chot.goi) ở bảng chot_goi; JSON lô chỉ giữ {at, nguoi, phienBan, hash, hashDL}. */
const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('fs'), os = require('os'), path = require('path');
const {Store, MIGRATIONS} = require('../src/store');
const V = require('../src/vongdoi'), D = require('../src/delta'), M = require('../src/model');
const tmp = () => path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'hakqn-chotgoi-')), 'd.sqlite');
const lo = (id, ma) => M.ensureForest({id, info: {maRung: ma, tenRung: 'Rừng ' + ma}, nc: [{ten: 'A', cccd: '049085000001'}], dx: [], exp: {},
  pc: Array.from({length: 50}, (_, i) => ({_id: 'p' + i, soPhieu: ma + '-' + i, ngay: '01/11/2026', bienSo: '92C-12345', kl: 10 + i}))});
const goc = () => ({v: 2, rs: {r1: {id: 'r1', info: {ma: 'C', ten: 'CHỦ', cccd: '049067005459'}, forests: {f1: lo('f1', 'R-1'), f2: lo('f2', 'R-2')}}}});
const dongLo = (s, id) => s.db.prepare('SELECT data FROM forests WHERE id=?').get(id).data;
const goiRows = s => s.db.prepare('SELECT forest_id, phien_ban, hash, data FROM chot_goi ORDER BY forest_id, phien_ban').all();

test('chốt rồi lưu: gói vào chot_goi, JSON lô không còn goi; đọc lên có hashDL, nguyenVen đúng mà không cần gói; sao lưu (kemGoi) có lại gói', () => {
  const s = new Store(':memory:'); s.save(goc());
  const db = s.load(), f = db.rs.r1.forests.f1; assert.ok(V.chot(f, 'KT', '2026-11-01T00:00:00Z', []).ok); const goi = f.chot.goi, hash = f.chot.hash;
  s.save(db);
  assert.ok(!/"goi":/.test(dongLo(s, 'f1')), 'JSON lô không chứa gói');
  assert.deepStrictEqual(goiRows(s).map(r => [r.forest_id, r.phien_ban, r.hash, r.data === goi]), [['f1', 1, hash, true]]);
  const L = s.load().rs.r1.forests.f1;
  assert.equal(L.chot.goi, undefined); assert.equal(L.chot.hash, hash); assert.equal(L.chot.hashDL, V.bamDuLieu(goi));
  assert.equal(V.kiemToanVen(L).ma, 'thieu-goi', 'không có gói trong bộ nhớ thì không kết luận nguyên vẹn');
  assert.ok(V.nguyenVen(L, null, s.kiemGoi('f1')), 'còn nguyên (gói kiểm trên SQLite)'); L.pc[3].kl = 999; assert.equal(V.kiemToanVen(L, null, s.kiemGoi('f1')).ma, 'du-lieu-khac', 'đổi dữ liệu → khác bản chụp');
  assert.equal(s.load({kemGoi: true}).rs.r1.forests.f1.chot.goi, goi, 'sao lưu toàn bộ mang gói như trước');
  assert.deepStrictEqual(s.docGoi('f1'), {phienBan: 1, hash, at: '2026-11-01T00:00:00Z', data: goi});
  assert.equal(s.save(s.load()).changed, 0, 'lưu lại không ghi gì');
  assert.equal(s.save(db).changed, 0, 'bản trong bộ nhớ còn goi: lưu lại cũng không ghi gì (băm theo JSON đã tách gói)');
  s.close();
});

test('lưu theo phần thay đổi cũng tách gói; khóa chỉ đọc (LOCKED) vẫn chặn sửa dữ liệu lô đã chốt', () => {
  const s = new Store(':memory:'); s.save(goc());
  let db = s.load(); const snap = D.snapshot(db); V.chot(db.rs.r1.forests.f2, 'KT', '2026-11-02T00:00:00Z', []); const goi = db.rs.r1.forests.f2.chot.goi;
  const sn2 = D.snapshot(db), d = D.diff(snap, sn2); d.rev = s.rev; d.sideD = D.diffSide(snap.side, sn2.side); d.counts = sn2.counts;
  assert.equal(s.saveDelta(d).mode, 'delta');
  assert.ok(!/"goi":/.test(dongLo(s, 'f2'))); assert.equal(s.docGoi('f2').data, goi);
  db = s.load(); db.rs.r1.forests.f2.pc[0].kl = 1;
  assert.throws(() => s.save(db), e => e.code === 'LOCKED');
  db = s.load(); assert.ok(V.luuTru(db.rs.r1.forests.f2, '2026-11-03T00:00:00Z').ok); s.save(db);
  assert.ok(s.load().rs.r1.forests.f2.luuTru, 'thao tác vòng đời vẫn ghi được');
  s.close();
});

test('mở khóa rồi chốt lại: giữ gói của từng phiên bản; docGoi không ghi phiên bản → bản mới nhất', () => {
  const s = new Store(':memory:'); s.save(goc());
  let db = s.load(); V.chot(db.rs.r1.forests.f1, 'KT', 't1', []); s.save(db);
  db = s.load(); V.moKhoa(db.rs.r1.forests.f1, 'sửa', 'KT', 't2'); s.save(db);
  db = s.load(); db.rs.r1.forests.f1.pc[0].kl = 77; s.save(db);
  db = s.load(); V.chot(db.rs.r1.forests.f1, 'KT', 't3', []); s.save(db);
  assert.deepStrictEqual(s.dsGoi('f1').map(x => x.phienBan), [1, 2]);
  assert.equal(s.docGoi('f1').phienBan, 2); assert.equal(JSON.parse(s.docGoi('f1', 1).data).pc[0].kl, 10); assert.equal(JSON.parse(s.docGoi('f1').data).pc[0].kl, 77);
  assert.ok(V.nguyenVen(s.load().rs.r1.forests.f1, null, s.kiemGoi('f1')));
  s.close();
});

test('v14: lô đã chốt từ bản cũ (gói trong JSON lô) → gói ra chot_goi, có hashDL; phần dữ liệu lô không đổi; sao lưu trước; chạy lại không đổi', () => {
  const file = tmp(), s13 = new Store(file, {migrations: MIGRATIONS.slice(0, 13)});
  const d0 = goc(); V.chot(d0.rs.r1.forests.f1, 'KT', '2026-10-01T00:00:00Z', []); delete d0.rs.r1.forests.f1.chot.hashDL;   // bản cũ: chưa có hashDL
  s13.save(d0); const truoc = s13.load(); assert.ok(/"goi":/.test(dongLo(s13, 'f1'))); s13.close();
  const s = new Store(file), L = s.load(), f = L.rs.r1.forests.f1, f0 = truoc.rs.r1.forests.f1;
  assert.ok(!/"goi":/.test(dongLo(s, 'f1')));
  assert.equal(s.docGoi('f1').data, f0.chot.goi);
  assert.equal(f.chot.hashDL, V.bamDuLieu(f0.chot.goi)); assert.ok(V.nguyenVen(f, null, s.kiemGoi('f1')));
  assert.equal(V.doiNgoaiVongDoi(f0, f), false, 'phần dữ liệu lô (ngoài khóa vòng đời) giống hệt: bản in không đổi');
  assert.deepStrictEqual(s.load({kemGoi: true}).rs.r1.forests.f1.chot.goi, f0.chot.goi);
  assert.ok(fs.readdirSync(path.join(path.dirname(file), 'backups')).some(n => /truoc-nang-cap-v13/.test(n)));
  const r0 = goiRows(s), l0 = dongLo(s, 'f1'); MIGRATIONS[13](s.db); assert.deepStrictEqual(goiRows(s), r0); assert.equal(dongLo(s, 'f1'), l0, 'chạy lại không đổi');
  s.close();
});

test('nguyenVen: lô cũ chưa có hashDL so với gói như trước; ganHashDL chạy lại không đổi', () => {
  const f = lo('f9', 'R-9'); V.chot(f, 'KT', 't', []); delete f.chot.hashDL;
  assert.ok(V.nguyenVen(f)); f.pc[0].kl = 5; assert.equal(V.nguyenVen(f), false); f.pc[0].kl = 10;
  assert.equal(V.ganHashDL(f), true); const h = f.chot.hashDL; assert.equal(V.ganHashDL(f), false); assert.equal(f.chot.hashDL, h); assert.ok(V.nguyenVen(f));
});
