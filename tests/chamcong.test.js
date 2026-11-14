'use strict';
const test = require('node:test'), assert = require('node:assert');
const C = require('../src/chamcong');

test('khóa tháng, số ngày trong tháng, Chủ nhật', () => {
  assert.strictEqual(C.key(2026, 2), '2026-02'); assert.strictEqual(C.daysIn('2026-02'), 28); assert.strictEqual(C.daysIn('2028-02'), 29); assert.strictEqual(C.daysIn('2026-10'), 31);
  assert.strictEqual(C.isSunday('2026-10', 11), true); assert.strictEqual(C.isSunday('2026-10', 5), false);
});
test('các tháng trong thời gian khai thác; thiếu hoặc sai ngày thì rỗng', () => {
  assert.deepStrictEqual(C.monthsBetween(new Date(2026, 9, 20), new Date(2026, 11, 5)), ['2026-10', '2026-11', '2026-12']);
  assert.deepStrictEqual(C.monthsBetween(new Date(2026, 11, 20), new Date(2027, 0, 5)), ['2026-12', '2027-01']);
  assert.deepStrictEqual(C.monthsBetween(null, new Date(2026, 0, 1)), []); assert.deepStrictEqual(C.monthsBetween(new Date(2026, 5, 1), new Date(2026, 4, 1)), []);
});
test('đọc ô nhập: trống, số, dấu phẩy, ngoài khoảng và không phải số', () => {
  assert.strictEqual(C.parseCell(''), null); assert.strictEqual(C.parseCell('  '), null); assert.strictEqual(C.parseCell('1'), 1); assert.strictEqual(C.parseCell('0,5'), 0.5); assert.strictEqual(C.parseCell('0.25'), 0.25); assert.strictEqual(C.parseCell('0'), 0);
  for (const bad of ['abc', '-1', '4', '1,234', '1.5.2', '١']) assert.strictEqual(C.parseCell(bad), undefined, bad);
});
test('ghi, đọc, xóa ô; xóa hết thì dọn các nhánh rỗng', () => {
  const cc = {}; C.set(cc, '2026-10', 'A', 5, 1); C.set(cc, '2026-10', 'A', 6, 0.5); C.set(cc, '2026-10', 'B', 5, 0);
  assert.strictEqual(C.get(cc, '2026-10', 'A', 5), 1); assert.strictEqual(C.get(cc, '2026-10', 'B', 5), 0); assert.strictEqual(C.get(cc, '2026-10', 'B', 6), null); assert.strictEqual(C.get(cc, '2026-11', 'A', 5), null);
  assert.strictEqual(C.hasAny(cc), true);
  C.set(cc, '2026-10', 'A', 5, null); C.set(cc, '2026-10', 'A', 6, null); C.set(cc, '2026-10', 'B', 5, null);
  assert.deepStrictEqual(cc, {}); assert.strictEqual(C.hasAny(cc), false); assert.strictEqual(C.hasAny(undefined), false);
});
test('tổng công: theo tháng và cả đợt, làm tròn 2 số lẻ; ô 0 vẫn tính là đã chấm', () => {
  const cc = {}; C.set(cc, '2026-10', 'A', 5, 1); C.set(cc, '2026-10', 'A', 6, 0.5); C.set(cc, '2026-11', 'A', 2, 0.25); C.set(cc, '2026-10', 'B', 5, 0);
  assert.strictEqual(C.monthTotal(cc, '2026-10', 'A'), 1.5); assert.strictEqual(C.total(cc, 'A'), 1.75); assert.strictEqual(C.total(cc, 'B'), 0); assert.strictEqual(C.total(cc, 'C'), 0);
  const d = {}; for (let i = 1; i <= 3; i++) C.set(d, '2026-10', 'A', i, 0.1); assert.strictEqual(C.total(d, 'A'), 0.3);
});
test('điền đủ công: bỏ Chủ nhật và giữ trong khoảng ngày khai thác', () => {
  const cc = {}, n = C.fillWork(cc, '2026-10', ['A', 'B'], new Date(2026, 9, 5), new Date(2026, 9, 11));
  assert.strictEqual(n, 6); assert.strictEqual(C.monthTotal(cc, '2026-10', 'A'), 6); assert.strictEqual(C.get(cc, '2026-10', 'A', 11), null); assert.strictEqual(C.get(cc, '2026-10', 'B', 5), 1); assert.strictEqual(C.get(cc, '2026-10', 'A', 4), null);
  const e = {}; C.fillWork(e, '2026-10', ['A'], null, null); assert.strictEqual(C.monthTotal(e, '2026-10', 'A'), 27);   // 31 ngày trừ 4 Chủ nhật (4, 11, 18, 25)
  C.clearMonth(e, '2026-10'); assert.deepStrictEqual(e, {});
});
test('khóa người: ưu tiên CCCD, không có thì họ tên', () => {
  assert.strictEqual(C.personKey({cccd: '049085000001', ten: 'A'}), '049085000001'); assert.strictEqual(C.personKey({cccd: '', ten: 'TRẦN A'}), 'TRẦN A'); assert.strictEqual(C.personKey(null), '');
});
