'use strict';
/* B6: danh mục (lao động, xe, đối tác) ở bảng SQLite riêng, mỗi mục một dòng (danh_muc); lưu theo phần thay đổi chỉ ghi dòng đã đổi. */
const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('fs'), os = require('os'), path = require('path');
const {Store, MIGRATIONS} = require('../src/store');
const D = require('../src/delta');
const tmp = () => path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'hakqn-dmbang-')), 'd.sqlite');
const nguoi = i => ({ngayCapNhat: '01/01/2026', cccd: '0490850' + String(i).padStart(5, '0'), ten: 'NGƯỜI ' + i, diaChi: 'Quế Sơn'});
const xe = i => ({ngayCapNhat: '01/01/2026', bienSo: '92C-' + String(10000 + i), chuXe: 'CHỦ ' + i});
const goc = () => ({v: 2, rs: {o: {id: 'o', info: {ma: 'C', ten: 'CHỦ', cccd: '049067005459'}, forests: {}}}, congTy: {c1: {id: 'c1', ten: 'CTY', mst: '1'}}, norm: {x: 1},
  dmLaoDong: [nguoi(1), nguoi(2), nguoi(3)], dmXeVC: [], dmDoiTac: [{id: 'dn:a', loai: 'doanhnghiep', ten: 'CTY VT A'}]});
const clone = x => JSON.parse(JSON.stringify(x));
const dongDM = s => s.db.prepare('SELECT kind, ord, data FROM danh_muc ORDER BY kind, ord').all();
const metaDM = s => s.db.prepare("SELECT key FROM meta WHERE key IN ('dmLaoDong','dmXeVC','dmDoiTac')").all().map(r => r.key);
function deltaSave(s, cache, db) {
  const snap = D.snapshot(db), d = D.diff(cache.snap, snap);
  d.rev = cache.rev; d.sideD = D.diffSide(cache.snap.side, snap.side); d.counts = snap.counts;
  const r = s.saveDelta(d); return {r, d, cache: {rev: r.rev, snap}};
}

test('v13: chuyển danh mục từ meta sang bảng danh_muc theo dòng; đọc lại giống hệt; danh mục rỗng vẫn là []; chạy lại không đổi', () => {
  const file = tmp(), s12 = new Store(file, {migrations: MIGRATIONS.slice(0, 12)});
  s12.save(goc()); const truoc = s12.load(); s12.close();
  const s = new Store(file);
  assert.deepStrictEqual(metaDM(s), [], 'khóa danh mục không còn ở meta');
  assert.equal(dongDM(s).filter(r => r.kind === 'dmLaoDong').length, 3);
  assert.deepStrictEqual(s.load(), truoc, 'đọc lại giống hệt trước nâng cấp');
  assert.deepStrictEqual(s.load().dmXeVC, [], 'danh mục rỗng vẫn là mảng rỗng');
  const bk = fs.readdirSync(path.join(path.dirname(file), 'backups')); assert.ok(bk.some(n => /truoc-nang-cap-v12/.test(n)), 'sao lưu trước khi nâng cấp');
  const dong = dongDM(s); MIGRATIONS[12](s.db); assert.deepStrictEqual(dongDM(s), dong, 'chạy lại v13 không đổi');
  assert.deepStrictEqual(s.save(truoc).changed, 0, 'lưu toàn bộ ngay sau đó không ghi dòng nào');
  s.close();
});

test('lưu toàn bộ: chỉ ghi dòng danh mục đã đổi; bỏ dòng thừa ở cuối; bỏ danh mục thì xóa', () => {
  const s = new Store(':memory:'), db = goc(); s.save(db);
  const db2 = clone(db); db2.dmLaoDong[1].diaChi = 'ĐỔI';
  assert.equal(s.save(db2).changed, 1, 'một dòng đổi → một lần ghi');
  db2.dmLaoDong.pop(); assert.equal(s.save(db2).changed, 1);
  assert.deepStrictEqual(s.load().dmLaoDong, db2.dmLaoDong);
  delete db2.dmDoiTac; s.save(db2); assert.ok(!('dmDoiTac' in s.load()), 'bỏ danh mục khỏi db → không còn trong SQLite');
  s.close();
});

test('lưu theo phần thay đổi: gửi và ghi đúng các dòng đã đổi (không gửi cả danh mục); kết quả như lưu toàn bộ', () => {
  const s = new Store(':memory:'), big = goc(); big.dmLaoDong = Array.from({length: 1500}, (_, i) => nguoi(i)); big.dmXeVC = Array.from({length: 300}, (_, i) => xe(i));
  let cache = {rev: s.save(big).rev, snap: D.snapshot(big)};
  const db2 = clone(big); db2.dmLaoDong[700].diaChi = 'MỚI'; db2.dmXeVC.push(xe(999)); db2.norm = {x: 2}; db2.congTy.c2 = {id: 'c2', ten: 'CTY 2', mst: '2'};
  let x = deltaSave(s, cache, db2); cache = x.cache;
  assert.equal(x.r.mode, 'delta');
  assert.deepStrictEqual(Object.keys(x.d.sideD.set).sort(), ['c:c2', 'd:dmLaoDong:700', 'd:dmXeVC', 'd:dmXeVC:300', 'm:norm']);
  assert.ok(JSON.stringify(x.d.sideD).length < 2000, 'gói gửi nhỏ: ' + JSON.stringify(x.d.sideD).length + ' byte');
  assert.deepStrictEqual(s.load(), Object.assign(clone(db2), {v: 2}));
  const db3 = clone(db2); db3.dmLaoDong.splice(1498, 2); delete db3.congTy.c1; delete db3.norm; db3.dmXeVC = [];
  x = deltaSave(s, cache, db3); cache = x.cache;
  const L = s.load(); assert.deepStrictEqual(L.dmLaoDong, db3.dmLaoDong); assert.deepStrictEqual(L.dmXeVC, []); assert.ok(!('norm' in L)); assert.deepStrictEqual(Object.keys(L.congTy), ['c2']);
  assert.equal(s.save(db3).changed, 0, 'lưu toàn bộ sau đó không ghi gì: hai đường lưu cho cùng kết quả');
  s.close();
});

test('lưu theo phần thay đổi: khóa sai dạng, JSON hỏng, danh mục thiếu dòng → MISMATCH, không ghi gì', () => {
  const s = new Store(':memory:'), db = goc(); const rev = s.save(db).rev, truoc = s.load(), counts = {owners: 1, forests: 0};
  const thu = sideD => assert.throws(() => s.saveDelta({rev, upO: {}, upF: {}, delO: [], delF: [], counts, sideD}), e => e.code === 'MISMATCH');
  thu({set: {'d:dmLaoDong:0': '{hỏng'}, del: []});
  thu({set: {'x:abc': '1'}, del: []});
  thu({set: {'m:lk:abc': '1'}, del: []});
  thu({set: {'d:dmKhac:0': '{}'}, del: []});
  thu({set: {'d:dmLaoDong:9': '{}'}, del: []});
  thu({set: {'c:c9': '{"id":"khac"}'}, del: []});
  assert.deepStrictEqual(s.load(), truoc);
  s.close();
});
