/* DATA-06: đội trực tiếp không bắt buộc Tổ trưởng; đội giao khoán vẫn bắt buộc. */
const test = require('node:test'), assert = require('node:assert');
const M = require('../src/model.js');
const lo = moHinhKy => ({
  doi: [{id: 'doi1', ten: 'Đội 1', hinhThuc: {moHinhKy}}],
  nc: [{_row: 1, ten: 'Công nhân A', vaiTro: 'Công nhân cưa', doiId: 'doi1'}]
});
test('đội trực tiếp không có Tổ trưởng: không lỗi', () => {
  assert.deepStrictEqual(M.teamErrors(lo('tructiep')), []);
});
test('đội giao khoán không có Tổ trưởng: vẫn báo lỗi', () => {
  assert.deepStrictEqual(M.teamErrors(lo('giaokhoan')).map(e => e.text), ['Đội “Đội 1” chưa có Tổ trưởng']);
});
