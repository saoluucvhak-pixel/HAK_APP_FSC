'use strict';
const test = require('node:test'), assert = require('node:assert/strict');
const V = require('../src/vieccanlam');
const hom = new Date(2026, 10, 15);
const lo = (id, o) => Object.assign({id, info: {maRung: id.toUpperCase()}, doi: [], pc: [], dx: []}, o);
const mk = (...ls) => ({rs: {o1: {id: 'o1', forests: Object.fromEntries(ls.map(l => [l.id, l]))}}});
test('mục chặn trước rồi cảnh báo rồi nhắc; phiếu cân chưa gán đội chỉ tính khi lô có nhiều đội', () => {
  const db = mk(lo('a', {doi: [{id: 'd1'}, {id: 'd2'}], pc: [{ngay: '14/11/2026', doiId: 'd1'}, {ngay: '14/11/2026'}], dx: [{bienSo: '92C-1', kdDen: '25/11/2026'}]}), lo('b', {doi: [{id: 'd1'}], pc: [{ngay: '14/11/2026'}]}));
  const r = V.viecCanLam(db, {homNay: hom, tienDo: {a: {noIn: 2, chuaKy: 1, trangThai: 'dang-khai-thac'}}});
  assert.deepEqual(r.map(x => x.muc), ['chan', 'canh', 'nhac', 'nhac']);
  assert.match(r[0].text, /1 phiếu cân chưa gán đội/); assert.equal(r[0].ma, 'A'); assert.match(r[1].text, /đăng kiểm còn 10 ngày/);
  assert.ok(!r.some(x => x.ma === 'B'), 'lô một đội không báo phiếu chưa gán');
});
test('giấy tờ xe: đã hết hạn và còn hạn dài; theo dòng danh mục mới nhất', () => {
  const db = mk(lo('a', {dx: [{bienSo: '92C-1', kdDen: '01/01/2026', hanBH: '01/01/2030'}]})); db.dmXeVC = [{ngayCapNhat: '01/10/2026', bienSo: '92c1', hanDangKiem: '10/11/2026'}, {ngayCapNhat: '01/11/2026', bienSo: '92C-1', hanDangKiem: '10/11/2027'}];
  assert.equal(V.viecCanLam(db, {homNay: hom}).length, 0, 'danh mục mới nhất đã gia hạn đăng kiểm');
  db.dmXeVC = []; const r = V.viecCanLam(db, {homNay: hom}); assert.equal(r.length, 1); assert.match(r[0].text, /đăng kiểm đã hết hạn/);
});
test('quá hạn không có phiếu mới, phiếu cuối lâu chưa chốt, quá ngày kết thúc; lô đã chốt hoặc dừng không tính', () => {
  const db = mk(lo('a', {pc: [{ngay: '05/11/2026'}]}), lo('b', {pc: [{ngay: '01/09/2026'}], chot: {at: 'x'}}), lo('c', {pc: [{ngay: '10/11/2026'}], dung: {at: 'x'}}), lo('d', {pc: [{ngay: '01/10/2026'}], info: {maRung: 'D', denNgay: '30/10/2026'}}));
  const r = V.viecCanLam(db, {homNay: hom, tienDo: {a: {trangThai: 'dang-khai-thac'}}});
  assert.ok(r.some(x => x.ma === 'A' && /10 ngày chưa có phiếu cân mới/.test(x.text)));
  assert.ok(r.some(x => x.ma === 'D' && /đã 45 ngày mà lô chưa chốt/.test(x.text)));
  assert.ok(!r.some(x => x.ma === 'B' || x.ma === 'C'));
});
