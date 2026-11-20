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

test('kiểu ô chuẩn: ngày gõ nhanh thành dd/mm/yyyy, chỉ khi ra ngày có thật; CCCD bỏ ký tự thừa', () => {
  const N = require('../src/nhaplieu');
  assert.deepStrictEqual(['151126', '15112026', '15-11-26', '15.11.2026', '15/11/26', '1/2/2026', '150185'].map(N.chuanHoaNgay), ['15/11/2026', '15/11/2026', '15/11/2026', '15/11/2026', '15/11/2026', '01/02/2026', '15/01/1985']);
  assert.deepStrictEqual(['310226', '31/02/2026', 'abc', '', '  '].map(N.chuanHoaNgay), ['310226', '31/02/2026', 'abc', '', ''], 'ngày không có thật hoặc không nhận ra: giữ nguyên');
  assert.deepStrictEqual(['049 085 007 001', '049.085.007.001', '049085007001', '12', 'abc'].map(N.chuanHoaCccd), ['049085007001', '049085007001', '049085007001', '12', 'abc']);
});

test('giấy ủy quyền phải cùng ngày hoặc trước hợp đồng giao khoán: sau thì chặn; cùng ngày hoặc trước thì không báo', () => {
  const j = u => Object.assign(base(), {exp: {ngayKy: '02/10/2026', uqNgay: u}});
  const th = items => items.filter(x => x.nhom === 'Ủy quyền sau hợp đồng');
  assert.equal(th(N.kiemTra(j('03/10/2026'))).length, 1); assert.equal(th(N.kiemTra(j('03/10/2026')))[0].kind, 'chan');
  assert.equal(th(N.kiemTra(j('02/10/2026'))).length, 0); assert.equal(th(N.kiemTra(j('01/10/2026'))).length, 0); assert.equal(th(N.kiemTra(j(''))).length, 0);
});

test('Lô 11 (11a, 11c, 11d): xóa tham chiếu #moreMenu, cccdHopLe từ chối chữ lẫn trong số, fmtNum/fmtVi không xuất "-0"', () => {
  const fs = require('fs'), path = require('path');
  const R = require('../ui/reports');
  const TI = require('../src/tienich');
  const html = require('../scripts/build-html').appSource();

  // 11a: không còn #moreMenu trong mã nguồn giao diện
  assert.equal(/moreMenu/.test(html), false, 'không còn tham chiếu #moreMenu trong giao diện');

  // 11c: cccdHopLe chỉ nhận 9 hoặc 12 chữ số (chấp nhận dấu cách/chấm ngăn cách, từ chối chữ cái lẫn vào như "049067005abc")
  assert.equal(N.cccdHopLe('049067005'), true);
  assert.equal(N.cccdHopLe('049067005459'), true);
  assert.equal(N.cccdHopLe('049 067 005 459'), true);
  assert.equal(N.cccdHopLe('049067005abc'), false);
  assert.equal(N.cccdHopLe('12345'), false);

  // 11d: -0 và số âm rất nhỏ làm tròn về 0 không bao giờ xuất dấu trừ ("-0", "-0,000")
  assert.equal(R.fmtCell(-0, 'n0'), '0');
  assert.equal(R.fmtCell(-0, 'n3'), '0,000');
  assert.equal(R.fmtCell(-0.0001, 'n3'), '0,000');
  assert.equal(TI.fmtVi(-0), '0');
  assert.equal(TI.fmtVi(-0, 3), '0,000');
  assert.equal(TI.fmtVi(-0.0001, 3), '0,000');
});
