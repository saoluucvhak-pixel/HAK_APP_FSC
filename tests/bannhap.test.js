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

test('điều kiện mới (1.4.37): ngày công cần chấm công; cước tấn/km cần cự ly nhập tay; lô nhiều đội cần khối lượng từng đội khớp; lời gọi cũ không truyền cờ thì không đổi', () => {
  const all = {ngayKy: true, diaChiGiao: true, klThucTe: true, ntNgay: true, pcNgay: true, nguoiMua: true};
  assert.deepStrictEqual(B.issues('08', {...all, chamCong: false}).map(x => x.key), ['chamCong']);
  assert.deepStrictEqual(B.issues('14', {...all, klDoi: false}).map(x => x.key), ['klDoi']);
  for (const c of ['04', '09', '10']) assert.deepStrictEqual(B.issues(c, {...all, cuLyThuc: false}).map(x => x.key), ['cuLyThuc'], c);
  for (const c of ['01', '04', '08', '09', '10', '14']) assert.deepStrictEqual(B.issues(c, all), [], 'không truyền cờ mới: ' + c);
  assert.match(B.issues('04', {...all, cuLyThuc: false})[0].text, /đường chim bay/);
});
test('3.0: BM-09, BM-10 cần đối chiếu đủ phiếu thuộc phạm vi mẫu (pcDoiChieu); lời gọi cũ không truyền cờ thì không đổi', () => {
  const k = (code, c) => B.issues(code, Object.assign({}, FULL, c)).map(x => x.key);
  assert.deepStrictEqual(k('09', {pcDoiChieu: false}), ['pcDoiChieu']); assert.deepStrictEqual(k('10', {pcDoiChieu: false}), ['pcDoiChieu']);
  assert.deepStrictEqual(k('08', {pcDoiChieu: false}), [], 'BM-08 không theo đối chiếu xe'); assert.deepStrictEqual(k('09', {}), []);
  assert.ok(B.issues('09', {pcDoiChieu: false}).find(x => x.key === 'pcDoiChieu').where.includes('Đối chiếu khối lượng'));
});
