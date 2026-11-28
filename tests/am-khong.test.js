'use strict';
/* DATA-02: số -0 dạng number lọt qua kiểm "< 0" và hiện ra giá trị -0 (in "-0", so sánh Object.is sai). Chuẩn hóa -0 → 0 ở đầu các hàm đọc. */
const test = require('node:test'), assert = require('node:assert');
const Money = require('../src/money'), So = require('../src/so'), K = require('../src/docphieucan');
const trim = s => String(s == null ? '' : s).trim();
const ctx = {trim, pad2: n => (n < 10 ? '0' : '') + n, numSwap: s => s, fmtRaw: n => String(n), normDate: s => trim(s), toDec: So.toDec, HAKMoney: Money};

test('money.parse(-0): ok, value là +0 (không phải -0)', () => {
  const r = Money.parse(-0);
  assert.ok(r.ok); assert.ok(Object.is(r.value, 0), 'value phải là +0');
  assert.ok(Money.parse(-1).ok === false);
});
test('so.parseKl / toDec(-0): value là +0', () => {
  const r = So.parseKl(-0, {don: 'kg'});
  assert.ok(r.ok); assert.ok(Object.is(r.value, 0));
  assert.ok(Object.is(So.toDec(-0), 0)); assert.ok(Object.is(So.toDec(-0, {don: 'tan'}), 0));
  assert.strictEqual(So.parseKl(-1, {don: 'kg'}).ok, false);
});
test('normPC: khối lượng -0 thành 0, không giữ -0', () => {
  const api = K.create(ctx);
  const p = api.normPC({_row: 2, soPhieu: '1', ngay: '05/10/2026', can1: -0, can2: -0, kl: -0, klKg: -0});
  assert.ok(Object.is(p.kl, 0), 'kl'); assert.ok(Object.is(p.klKg, 0), 'klKg');
  assert.ok(Object.is(p.can1, 0), 'can1'); assert.ok(Object.is(p.can2, 0), 'can2');
});
