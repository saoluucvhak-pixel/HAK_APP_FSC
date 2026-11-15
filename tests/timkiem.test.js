'use strict';
const test = require('node:test'), assert = require('node:assert/strict');
const T = require('../src/timkiem');
const db = {rs: {o1: {id: 'o1', info: {ten: 'NGUYỄN VĂN AN', ma: 'CR-01', cccd: '049067005459'}, forests: {f1: {id: 'f1', info: {maRung: 'QS-07', tenRung: 'Rừng Quế Sơn', diaDiem: 'Thôn 3'},
  nc: [{ten: 'LÊ THỊ BÌNH', cccd: '049085007001', chucDanh: 'Công nhân cưa'}], dx: [{bienSo: '92C-123.45', chuXe: 'TRẦN XE', taiXe: 'PHẠM TÀI', cccd: '049000000077'}],
  pc: [{soPhieu: '01234', ngay: '12/10/2026', bienSo: '92C-123.45', kl: 12.5}], exp: {soKT: '015/2026'}, doi: [{id: 'd1', ten: 'Đội 1', exp: {ntSo: '03'}}], hdvc: []}}}},
  dmLaoDong: [{cccd: '049085007001', ten: 'LÊ THỊ BÌNH', viTri: 'Công nhân cưa'}], dmDoiTac: [{id: 'dn:1', ten: 'CÔNG TY VẬN TẢI MINH ĐỨC', mst: '0400123456'}], dmDonViVC: {}};
const nhom = (r, n) => r.find(x => x.nhom === n).ds;
test('tìm không dấu, không phân biệt hoa thường: "nguyen van an" ra chủ rừng; "le thi binh" ra người ở lô và danh mục', () => {
  const r = T.tim(db, 'nguyen van an'); assert.equal(nhom(r, 'Chủ rừng')[0].nhan, 'NGUYỄN VĂN AN');
  const p = nhom(T.tim(db, 'le thi binh'), 'Người'); assert.equal(p.length, 2); assert.ok(p.some(x => x.dich.to === 'lo') && p.some(x => x.dich.to === 'dm'));
});
test('biển số khớp sau khi bỏ dấu chấm, gạch, khoảng trắng; ra xe và phiếu cân', () => {
  const r = T.tim(db, '92c12345'); assert.equal(nhom(r, 'Xe')[0].nhan, '92C-123.45'); assert.equal(nhom(r, 'Phiếu cân').length, 1);
});
test('CCCD và số phiếu tìm theo đoạn cuối', () => {
  assert.equal(nhom(T.tim(db, '5459'), 'Chủ rừng').length, 1, 'đoạn cuối CCCD');
  assert.equal(nhom(T.tim(db, '1234'), 'Phiếu cân').length, 1, 'đoạn cuối số phiếu 01234');
  assert.equal(nhom(T.tim(db, '99'), 'Phiếu cân').length, 0, 'không khớp số phiếu hay biển số');
});
test('mã lô, số văn bản, MST đối tác', () => {
  assert.equal(nhom(T.tim(db, 'qs-07'), 'Lô')[0].nhan, 'QS-07');
  assert.equal(nhom(T.tim(db, '015/2026'), 'Văn bản')[0].nhan, 'Số 015/2026');
  assert.equal(nhom(T.tim(db, '0400123456'), 'Đối tác')[0].dich.tab, 'doitac');
});
test('truy vấn quá ngắn không ra gì; nhiều từ phải có đủ; mỗi nhóm bị cắt theo giới hạn', () => {
  assert.ok(T.tim(db, 'a').every(x => x.ds.length === 0));
  assert.equal(nhom(T.tim(db, 'que son khong co'), 'Lô').length, 0);
  assert.ok(nhom(T.tim(db, 'ngu'), 'Chủ rừng').length <= 8);
});
