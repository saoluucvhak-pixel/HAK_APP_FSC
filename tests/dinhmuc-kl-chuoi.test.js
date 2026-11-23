/* DATA-03: kgPhieu không được đoán sai khối lượng khi chuỗi có nhiều dấu phẩy/chấm. */
const test = require('node:test'), assert = require('node:assert');
const DM = require('../src/dinhmuc.js');
test('chuỗi nhiều dấu phẩy mơ hồ tính 0 kg', () => {
  assert.strictEqual(DM.kgPhieu({kl: '1,250,000'}), 0);
  assert.strictEqual(DM.tongPhieuKg([{kl: '1,250,000'}, {kl: '1.250,5'}]), 1250500);
});
test('các dạng hợp lệ vẫn đúng', () => {
  assert.strictEqual(DM.kgPhieu({kl: '1,5'}), 1500);
  assert.strictEqual(DM.kgPhieu({kl: '1,250'}), 1250);   // kiểu Việt: 1,25 tấn, giữ như trước (khớp HAKSo.parseKl)
  assert.strictEqual(DM.kgPhieu({kl: '12.5'}), 12500);
  assert.strictEqual(DM.kgPhieu({kl: '1.250,5'}), 1250500);
  assert.strictEqual(DM.kgPhieu({kl: 2.3}), 2300);
  assert.strictEqual(DM.kgPhieu({kl: 'abc'}), 0);
  assert.strictEqual(DM.kgPhieu({kl: '-3'}), 0);
});
