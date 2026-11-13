'use strict';
const test = require('node:test'), assert = require('node:assert');
const K = require('../src/khoan');

test('đơn giá khoán của tổ = tổng đơn giá các vị trí ÷ số người; nhân sản lượng bằng tổng tiền từng người', () => {
  const d = K.derive([420000, 330000, 330000], 30);
  assert.strictEqual(d.N, 3); assert.strictEqual(d.sumRates, 1080000); assert.strictEqual(d.price, 360000);
  assert.deepStrictEqual(d.amounts, [4200000, 3300000, 3300000]); assert.strictEqual(d.total, 10800000); assert.strictEqual(d.byPrice, 10800000); assert.strictEqual(d.diff, 0);
});
test('đủ ba vị trí: 1 tổ trưởng, 2 công nhân khai thác, 1 công nhân cưa', () => {
  const d = K.derive([420000, 330000, 330000, 380000], 40);
  assert.strictEqual(d.price, 365000); assert.strictEqual(d.total, 14600000); assert.strictEqual(d.byPrice, 14600000);
});
test('sản lượng lẻ: sai khác giữa đơn giá × sản lượng và tổng từng người chỉ do làm tròn, tối đa N/2 đồng', () => {
  for (const [rates, v] of [[[420000, 330000, 380000], 29.75], [[420000, 330000, 330000, 380000, 380000], 33.333], [[400000, 350000, 350000, 350000, 350000, 380000, 380000], 61.287]]) {
    const d = K.derive(rates, v); assert.ok(Math.abs(d.diff) <= d.N / 2 + 1e-6, 'diff ' + d.diff + ' N ' + d.N);
    assert.strictEqual(d.total, d.amounts.reduce((s, a) => s + a, 0));
  }
});
test('thiếu đơn giá của một người hoặc chưa có sản lượng: không suy ra', () => {
  assert.strictEqual(K.derive([420000, null, 330000], 30).price, null); assert.strictEqual(K.derive([], 30).ok, false);
  const d = K.derive([420000, 330000], null); assert.strictEqual(d.price, 375000); assert.strictEqual(d.total, null);
});
test('định dạng đơn giá', () => {
  assert.strictEqual(K.fmtPrice(360000), '360.000'); assert.strictEqual(K.fmtPrice(356666.6667), '356.666,67'); assert.strictEqual(K.fmtPrice(null), ''); assert.strictEqual(K.fmtPrice(1080000), '1.080.000');
});
