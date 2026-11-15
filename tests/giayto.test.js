'use strict';
const test = require('node:test'), assert = require('node:assert');
const G = require('../src/giayto');
const xe = (bien, o) => Object.assign({bienSo: bien, chuXe: 'A', taiXe: '', kdDen: '31/12/2026', hanBH: '31/12/2026', hanGplx: ''}, o);
const pc = (so, ngay, bien, row) => ({soPhieu: so, ngay, bienSo: bien, _row: row});

test('phiếu chạy sau ngày hết hạn là quá hạn; đúng ngày hết hạn thì còn hiệu lực; không so với hôm nay', () => {
  const r = G.quaHan([xe('92C-1', {kdDen: '10/10/2026'})], [pc('P1', '10/10/2026', '92C-1', 2), pc('P2', '11/10/2026', '92C-1', 3), pc('P0', '01/10/2026', '92C-1', 4)]);
  assert.deepStrictEqual(r.map(x => [x.soPhieu, x.giayTo, x.han]), [['P2', 'kiểm định', '10/10/2026']]);
});
test('mỗi giấy tờ một dòng; GPLX chỉ xét khi xe có tài xế; biển số khớp không phân biệt dấu cách, gạch, hoa thường', () => {
  const x = xe('92C-123.45', {kdDen: '01/01/2026', hanBH: '01/02/2026', taiXe: 'B', hanGplx: '01/03/2026'});
  const r = G.quaHan([x], [pc('P1', '05/05/2026', '92c 12345', 2)]);
  assert.deepStrictEqual(r.map(v => v.giayTo), ['kiểm định', 'bảo hiểm', 'GPLX']);
  assert.deepStrictEqual(G.quaHan([Object.assign({}, x, {taiXe: ''})], [pc('P1', '05/05/2026', '92C-12345', 2)]).map(v => v.giayTo), ['kiểm định', 'bảo hiểm']);
});
test('hạn trống, sai ngày, phiếu thiếu ngày hoặc biển không thuộc xe nào thì bỏ qua (đã có lỗi riêng); mô tả nêu số phiếu, ngày, giấy tờ', () => {
  const x = xe('92C-1', {kdDen: '', hanBH: '31/02/2026'});
  assert.deepStrictEqual(G.quaHan([x], [pc('P1', '05/05/2026', '92C-1', 2), pc('P2', '', '92C-1', 3), pc('P3', '05/05/2026', '99X-9', 4)]), []);
  const v = G.quaHan([xe('92C-1', {kdDen: '01/01/2026'})], [pc('P9', '05/05/2026', '92C-1', 2)])[0];
  assert.match(G.text(v), /phiếu P9 ngày 05\/05\/2026 \(xe 92C-1\): kiểm định đã hết hạn từ 01\/01\/2026/);
});
