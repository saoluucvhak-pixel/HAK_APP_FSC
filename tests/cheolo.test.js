'use strict';
const test = require('node:test'), assert = require('node:assert/strict');
const C = require('../src/cheolo');
const pc = (so, ngay, bien, g1, g2, kl) => ({soPhieu: so, ngay, bienSo: bien, gioCan1: g1, gioCan2: g2, kl: kl || 10});
const lo = (id, ma, o) => ({id, info: Object.assign({maRung: ma, tuNgay: '01/10/2026', denNgay: '30/10/2026', dienTich: 2, dinhMucTanHa: 10}, o.info), pc: o.pc || [], nc: o.nc || []});
const mk = (...ls) => ({rs: {o1: {id: 'o1', forests: Object.fromEntries(ls.map(l => [l.id, l]))}}});
const nhom = (r, n) => r.filter(x => x.nhom === n);
test('phiếu cân giống hệt ở lô khác bị chặn; khác ngày hoặc biển số thì không', () => {
  const db = mk(lo('a', 'A', {pc: [pc('1001', '05/10/2026', '92C-123.45', '08:00', '09:00')]}), lo('b', 'B', {pc: [pc('1001', '05/10/2026', '92c12345', '08:00', '09:00'), pc('1002', '06/10/2026', '92C-1', '08:00', '09:00')]}));
  const r = C.kiemTra(db, 'o1', 'b'); const t = nhom(r, 'Chéo lô: phiếu cân trùng'); assert.equal(t.length, 1); assert.equal(t[0].kind, 'chan'); assert.match(t[0].text, /1 phiếu cân giống hệt/); assert.match(t[0].text, /lô A/);
  assert.equal(nhom(C.kiemTra(mk(lo('a', 'A', {pc: [pc('1001', '05/10/2026', '92C-1', '08:00', '09:00')]}), lo('b', 'B', {pc: [pc('1001', '06/10/2026', '92C-1', '08:00', '09:00')]})), 'o1', 'b'), 'Chéo lô: phiếu cân trùng').length, 0);
});
test('một xe ở hai lô trùng khoảng giờ cân: cảnh báo; giờ không giao nhau thì không', () => {
  const a = lo('a', 'A', {pc: [pc('1', '05/10/2026', '92C-1', '08:00:00', '09:30:00')]});
  const b = n => lo('b', 'B', {pc: [pc('2', '05/10/2026', '92C-1', n[0], n[1])]});
  const r = nhom(C.kiemTra(mk(a, b(['09:00:00', '10:00:00'])), 'o1', 'b'), 'Chéo lô: xe trùng giờ cân'); assert.equal(r.length, 1); assert.equal(r[0].kind, 'doi');
  assert.equal(nhom(C.kiemTra(mk(a, b(['10:00:00', '11:00:00'])), 'o1', 'b'), 'Chéo lô: xe trùng giờ cân').length, 0);
});
test('một người ở hai lô có thời gian khai thác giao nhau: cảnh báo, không chặn; không giao nhau thì không báo', () => {
  const nc = [{ten: 'AN', cccd: '049085007001'}];
  const r = nhom(C.kiemTra(mk(lo('a', 'A', {nc}), lo('b', 'B', {nc, info: {tuNgay: '20/10/2026', denNgay: '30/11/2026'}})), 'o1', 'b'), 'Chéo lô: người ở hai lô'); assert.equal(r.length, 1); assert.equal(r[0].kind, 'doi');
  assert.equal(nhom(C.kiemTra(mk(lo('a', 'A', {nc}), lo('b', 'B', {nc, info: {tuNgay: '01/12/2026', denNgay: '30/12/2026'}})), 'o1', 'b'), 'Chéo lô: người ở hai lô').length, 0);
});
test('tổng phiếu cân lệch sản lượng dự kiến quá 10% thì cảnh báo; trong ngưỡng hoặc đổi ngưỡng thì không', () => {
  const l = kl => lo('a', 'A', {pc: [pc('1', '05/10/2026', '92C-1', '', '', kl)]});   // dự kiến 2 ha × 10 = 20 tấn
  assert.equal(nhom(C.kiemTra(mk(l(25)), 'o1', 'a'), 'Chéo lô: lệch sản lượng dự kiến').length, 1);
  assert.equal(nhom(C.kiemTra(mk(l(21)), 'o1', 'a'), 'Chéo lô: lệch sản lượng dự kiến').length, 0);
  assert.equal(nhom(C.kiemTra(mk(l(25)), 'o1', 'a', {nguong: 30}), 'Chéo lô: lệch sản lượng dự kiến').length, 0);
});
