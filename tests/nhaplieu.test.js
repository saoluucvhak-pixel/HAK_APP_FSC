'use strict';
const test = require('node:test'), assert = require('node:assert/strict');
const N = require('../src/nhaplieu.js');
const base = () => ({info: {tuNgay: '01/10/2026', denNgay: '30/11/2026', ngayKyHopDong: '25/09/2026'}, exp: {}, pc: []});
const by = (items, nhom) => items.filter(x => x.nhom === nhom);

test('hồ sơ nhất quán không có cảnh báo', () => {
  const j = base(); j.exp = {ngayKy: '25/09/2026', ntNgay: '05/12/2026', pcNgay: '05/12/2026', tuNgayTT: '01/10/2026', denNgayTT: '30/11/2026', soKT: '07/2026-HĐKT'};
  j.pc = [{ngay: '05/10/2026', soPhieu: 'A'}, {ngay: '20/11/2026', soPhieu: 'B'}];
  assert.deepEqual(N.kiemTra(j), []);
});
test('ngày không có thật bị chặn, nêu rõ ô nào', () => {
  const j = base(); j.exp.ntNgay = '31/02/2026'; j.info.denNgay = '30/13/2026';
  const r = by(N.kiemTra(j), 'Ngày nhập sai');
  assert.equal(r.length, 2); assert.ok(r.every(x => x.kind === 'chan')); assert.ok(r.some(x => /Nghiệm thu/.test(x.text) && /31\/02\/2026/.test(x.text)));
});
test('khoảng ngày khai thác và kỳ thanh toán bị đảo', () => {
  const j = base(); j.info.tuNgay = '01/12/2026'; j.exp.tuNgayTT = '30/11/2026'; j.exp.denNgayTT = '01/10/2026';
  const r = by(N.kiemTra(j), 'Khoảng ngày bị đảo'); assert.equal(r.length, 2); assert.ok(r.every(x => x.kind === 'chan'));
});
test('ngày ký hợp đồng nhập ở hai nơi khác nhau: nêu ô nào được dùng; trùng nhau thì không báo', () => {
  const j = base(); j.exp.ngayKy = '26/09/2026';
  const r = by(N.kiemTra(j), 'Một ngày nhập ở hai nơi'); assert.equal(r.length, 1); assert.match(r[0].text, /ưu tiên/);
  j.exp.ngayKy = '25/09/2026'; assert.equal(by(N.kiemTra(j), 'Một ngày nhập ở hai nơi').length, 0);
});
test('thứ tự ngày: ký sau khai thác, nghiệm thu trước khi kết thúc, xác nhận KL trước phiếu cuối', () => {
  const j = base(); j.info.ngayKyHopDong = '15/10/2026'; j.exp.ntNgay = '20/11/2026'; j.exp.pcNgay = '10/11/2026'; j.pc = [{ngay: '25/11/2026', soPhieu: 'Z'}];
  const t = by(N.kiemTra(j), 'Thứ tự ngày').map(x => x.text).join('|');
  assert.match(t, /ký hợp đồng 15\/10\/2026 sau ngày bắt đầu/); assert.match(t, /nghiệm thu 20\/11\/2026 trước ngày kết thúc/); assert.match(t, /phiếu cân cuối cùng \(25\/11\/2026\)/);
});
test('phiếu cân trước thời gian: gộp thành một mục, không lặp theo từng phiếu', () => {
  const j = base(); j.pc = Array.from({length: 30}, (_, i) => ({ngay: '0' + (1 + i % 9) + '/09/2026', soPhieu: 'P' + i}));
  const r = by(N.kiemTra(j), 'Phiếu cân ngoài thời gian'); assert.equal(r.length, 1); assert.match(r[0].text, /^30 phiếu/);
});
test('số hợp đồng đầy đủ có năm khác năm của ngày văn bản', () => {
  const j = base(); j.exp.soKT = '07/2025-HĐKT'; j.exp.ngayKy = '25/09/2026';
  assert.equal(by(N.kiemTra(j), 'Năm trong số khác năm của ngày').length, 1);
  j.exp.soKT = '07'; assert.equal(by(N.kiemTra(j), 'Năm trong số khác năm của ngày').length, 0);
});
test('kỳ thanh toán vượt ngoài thời gian khai thác', () => {
  const j = base(); j.exp.denNgayTT = '15/12/2026'; assert.equal(by(N.kiemTra(j), 'Thứ tự ngày').length, 1);
});
