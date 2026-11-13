'use strict';
const test = require('node:test');
const assert = require('node:assert');
const B = require('../src/bannhap');
const FULL = {ngayKy: true, diaChiGiao: true, klThucTe: true, ntNgay: true, pcNgay: true, nguoiMua: true};

test('đủ điều kiện: mọi biểu mẫu là bản chính thức', () => {
  for (const code of Object.keys(B.FORMS)) assert.deepStrictEqual(B.issues(code, FULL), [], code);
});
test('mẫu không có điều kiện riêng luôn là bản chính thức, dù thiếu mọi thứ', () => {
  for (const code of ['02', '03', '05', '07', '12', '13', '18', '19']) assert.deepStrictEqual(B.issues(code, {}), [], code);
});
test('điều kiện riêng từng mẫu: thiếu gì báo đúng thứ đó và nơi bổ sung', () => {
  const k = (code, c) => B.issues(code, Object.assign({}, FULL, c)).map(x => x.key);
  assert.deepStrictEqual(k('01', {ngayKy: false}), ['ngayKy']);
  assert.deepStrictEqual(k('04', {ngayKy: false, diaChiGiao: false}), ['ngayKy', 'diaChiGiao']);
  assert.deepStrictEqual(k('08', {klThucTe: false}), ['klThucTe']);
  assert.deepStrictEqual(k('08', {ntNgay: false, pcNgay: false}), [], 'BM-08 không cần ngày lập biên bản');
  assert.deepStrictEqual(k('09', {pcNgay: false}), ['pcNgay']); assert.deepStrictEqual(k('10', {pcNgay: false}), ['pcNgay']);
  assert.deepStrictEqual(k('14', {klThucTe: false, ntNgay: false}), ['klThucTe', 'ntNgay']);
  assert.deepStrictEqual(k('14', {pcNgay: false}), [], 'BM-14 không cần ngày xác nhận khối lượng vận chuyển');
  assert.deepStrictEqual(k('11', {nguoiMua: false}), ['nguoiMua']);
  assert.deepStrictEqual(k('20', {ngayKy: false}), ['ngayKy']);
  assert.ok(B.issues('14', {}).every(x => x.text && x.where));
});
test('nhãn và tên file: BM-xx_BAN_NHAP_…; file trong thư mục: thư_mục/BAN_NHAP_tên; không gắn hai lần', () => {
  assert.strictEqual(B.draftPath('08_Bang_thanh_toan_tien_cong_A.docx'), '08_BAN_NHAP_Bang_thanh_toan_tien_cong_A.docx');
  assert.strictEqual(B.draftPath('09_XN_khoi_luong_VC/LE_VAN_XE.docx'), '09_XN_khoi_luong_VC/BAN_NHAP_LE_VAN_XE.docx');
  assert.strictEqual(B.draftPath(B.draftPath('14_BB.docx')), '14_BAN_NHAP_BB.docx');
  assert.ok(/^BẢN NHÁP – chưa đủ dữ liệu/.test(B.banner(B.issues('14', {}))));
  assert.ok(/BM-14/.test(B.label('14')));
});
