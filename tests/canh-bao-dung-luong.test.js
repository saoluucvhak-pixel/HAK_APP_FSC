'use strict';
/* BK-04: cảnh báo sớm khi ổ chứa dữ liệu / thư mục sao lưu còn dưới 500 MB trống (không chặn thao tác). */
const test = require('node:test'), assert = require('node:assert');
const fs = require('fs'), os = require('os'), path = require('path');
const S = require('../src/settings');
const MB = 1048576;

test('canhBaoDungLuong: thấp khi còn dưới ngưỡng, đủ thì không; freeMB làm tròn xuống', () => {
  assert.deepStrictEqual(S.canhBaoDungLuong('D:\\HAK', 100 * MB + 5, 500), {dir: 'D:\\HAK', thap: true, freeMB: 100});
  assert.deepStrictEqual(S.canhBaoDungLuong('D:\\HAK', 500 * MB, 500), {dir: 'D:\\HAK', thap: false, freeMB: 500});
  assert.strictEqual(S.canhBaoDungLuong('x', 500 * MB - 1, 500).thap, true);
  assert.strictEqual(S.canhBaoDungLuong('x', 0, 500).thap, true);
});
test('canhBaoDungLuong: không đọc được dung lượng thì không cảnh báo oan', () => {
  const r = S.canhBaoDungLuong(path.join(os.tmpdir(), 'khong-ton-tai-' + process.pid), undefined, 500);
  assert.strictEqual(r.thap, false); assert.strictEqual(r.freeMB, null);
  assert.strictEqual(S.canhBaoDungLuong('x', NaN, 500).thap, false);
});
test('canhBaoDungLuong: đọc ổ thật (thư mục tạm) cho số hợp lý; ngưỡng cực lớn thì báo thấp', () => {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'hakqn-dl-'));
  const a = S.canhBaoDungLuong(d, undefined, 1e12); assert.strictEqual(a.thap, true); assert.ok(a.freeMB > 0);
});
test('kiemDungLuong: gộp các thư mục cùng ổ, bỏ trống, chỉ trả ổ thấp, không ném lỗi', () => {
  const ra = S.kiemDungLuong([['Thư mục dữ liệu', 'A'], ['Sao lưu SQLite', 'A'], ['Sao lưu JSON', 'B'], ['Ổ thứ hai', '']], 500, d => (d === 'A' ? 100 * MB : 900 * MB));
  assert.strictEqual(ra.length, 1); assert.strictEqual(ra[0].freeMB, 100);
  assert.deepStrictEqual(ra[0].nhan, ['Thư mục dữ liệu', 'Sao lưu SQLite']);
  assert.deepStrictEqual(S.kiemDungLuong([['x', 'A']], 500, () => { throw new Error('boom'); }), []);
});
test('hằng ngưỡng mặc định là 500 MB', () => assert.strictEqual(S.NGUONG_DUNG_LUONG_MB, 500));
