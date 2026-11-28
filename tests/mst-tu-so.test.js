'use strict';
/* DATA-04: MST bắt đầu bằng 0 bị Excel/Google Sheets ép thành số nên mất số 0 đầu → bù lại (9 → 10 số, 12 → 13 số). */
const test = require('node:test'), assert = require('node:assert');
const NL = require('../src/nhaplieu'), DT = require('../src/doituong');

test('mstTuSo: 9 số → 10, 12 số → 13, còn lại giữ nguyên', () => {
  assert.strictEqual(NL.mstTuSo(101234567), '0101234567');
  assert.strictEqual(NL.mstTuSo('101234567'), '0101234567');
  assert.strictEqual(NL.mstTuSo(310123456789), '0310123456789');
  assert.strictEqual(NL.mstTuSo('0101234567'), '0101234567');
  assert.strictEqual(NL.mstTuSo('0101234567890'), '0101234567890');
  assert.strictEqual(NL.mstTuSo(1101234567), '1101234567');
  assert.strictEqual(NL.mstTuSo('abc'), 'abc');
  assert.strictEqual(NL.mstTuSo('010123456-001'), '010123456-001');
  assert.strictEqual(NL.mstTuSo('12345'), '12345');
  assert.strictEqual(NL.mstTuSo(1.5), 1.5);
  assert.strictEqual(NL.mstTuSo(''), '');
});
test('nhập Excel danh mục đối tượng: ô MST số 9 chữ số được nhận thành 10 số, hợp lệ', () => {
  const r = DT.docExcel([{'Mã đối tượng': 'A1', 'Tên đối tượng': 'Công ty A', 'Loại': 'Pháp nhân', 'Mã số thuế': 101234567},
    {'Mã đối tượng': 'A2', 'Tên đối tượng': 'Công ty B', 'Loại': 'Pháp nhân', 'Mã số thuế': 310123456789}], [], []);
  assert.strictEqual(r.doiTuong[0].dt.mst, '0101234567');
  assert.strictEqual(r.doiTuong[1].dt.mst, '0310123456-789');   // chuan() hiển thị MST chi nhánh dạng 10-3
  assert.ok(!r.doiTuong.some(d => (d.loi || []).some(e => /Mã số thuế/.test(e))), JSON.stringify(r.doiTuong.map(d => d.loi)));
});
