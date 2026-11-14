'use strict';
const test = require('node:test'), assert = require('node:assert');
const M = require('../src/money');
const {moneyOf} = require('../src/lookup');

test('đọc tiền: định dạng được chấp nhận cho ra đúng số', () => {
  const ok = {'1250000': 1250000, '1250,5': 1250.5, '1250.50': 1250.5, '1.250.000': 1250000, '1.250.000,5': 1250000.5, '1,250,000': 1250000, '1,250,000.5': 1250000.5, '1250 đ': 1250, '1.250.000 VNĐ': 1250000, ' 1250 ': 1250, '1250 đồng': 1250, '0': 0};
  for (const [s, v] of Object.entries(ok)) { const r = M.parse(s); assert.ok(r.ok && r.value === v, s + ' → ' + JSON.stringify(r)); }
  assert.strictEqual(M.parse(25000).value, 25000); assert.strictEqual(M.parse(0).value, 0);
});
test('đọc tiền: các ca đã tái hiện sai (số âm, 1250.50, mũ, chữ lẫn số, dấu liền nhau, nhóm nghìn sai)', () => {
  const bad = {'-1.250.000': /số âm/, '−5': /số âm/, '1e6': /mũ/, '12 abc': /ký tự không phải số/, '1..2': /đặt sai chỗ/, '1.2.3': /không hợp lệ/, '1.250': /mơ hồ/, '1,250': /mơ hồ/, '.5': /đặt sai chỗ/, '5.': /đặt sai chỗ/, '1.2345': /không hợp lệ/, '١٢٣': /ký tự/, '999999999999999': /vượt phạm vi/};
  for (const [s, re] of Object.entries(bad)) { const r = M.parse(s); assert.ok(!r.ok && re.test(r.reason), s + ' → ' + JSON.stringify(r)); assert.strictEqual(r.value, null); }
  assert.ok(!M.parse(-5).ok); assert.ok(!M.parse(NaN).ok); assert.ok(!M.parse(Infinity).ok); assert.ok(!M.parse(1e13).ok); assert.ok(!M.parse({}).ok);
});
test('đọc tiền: phân biệt ô trống, số 0 và lỗi', () => {
  for (const v of [null, undefined, '', '   ']) assert.ok(M.parse(v).ok && M.parse(v).blank && M.parse(v).value === null);
  const z = M.parse('0'); assert.ok(z.ok && !z.blank && z.value === 0);
  assert.strictEqual(M.positive('0'), null); assert.strictEqual(M.positive('-1'), null); assert.strictEqual(M.positive(''), null); assert.strictEqual(M.positive('1.250.000'), 1250000);
});
test('thông báo lỗi nêu giá trị gốc và lý do; ô trống không báo; số 0 chỉ báo khi yêu cầu số dương', () => {
  assert.strictEqual(M.problem('Đơn giá', ''), ''); assert.strictEqual(M.problem('Đơn giá', 1250000), '');
  assert.strictEqual(M.problem('Đơn giá', '-1.250.000'), 'Đơn giá: “-1.250.000” là số âm');
  assert.match(M.problem('Đơn giá', 0), /bằng 0/); assert.strictEqual(M.problem('Đơn giá', 0, {allowZero: true}), '');
});
test('lookup.moneyOf dùng cùng bộ đọc: không còn ca sai cũ', () => {
  assert.strictEqual(moneyOf('-1.250.000'), null); assert.strictEqual(moneyOf('1250.50'), 1250.5); assert.strictEqual(moneyOf('1e6'), null); assert.strictEqual(moneyOf('12 abc'), null); assert.strictEqual(moneyOf('1..2'), null); assert.strictEqual(moneyOf('1.2.3'), null);
  assert.strictEqual(moneyOf('1.250.000'), 1250000); assert.strictEqual(moneyOf('1,250,000'), 1250000); assert.strictEqual(moneyOf('1.250.000,5'), 1250000.5); assert.strictEqual(moneyOf('Đã thanh toán'), null);
});
