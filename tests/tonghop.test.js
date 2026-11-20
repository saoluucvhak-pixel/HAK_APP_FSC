'use strict';
const test = require('node:test'), assert = require('node:assert/strict');
const T = require('../src/tonghop');
const db = {rs: {o1: {id: 'o1', info: {ten: 'CHỦ A', cccd: '049067005459'}, forests: {
  f1: {id: 'f1', info: {maRung: 'QS-07', diaDiem: 'Thôn 3', dienTich: 2, dinhMucTanHa: 10, tuNgay: '01/10/2026'}, doi: [{id: 'd1', ten: 'Đội 1'}], hdvc: [{id: 'h1', ten: 'Đội xe 1', donViId: 'dv1'}],
    nc: [{ten: 'AN', cccd: '049085007001', vaiTro: 'Công nhân', chucDanh: 'Công nhân cưa', doiId: 'd1'}], dx: [{bienSo: '92C-123.45', hdvcId: 'h1'}], pc: [{soPhieu: '1', bienSo: '92c12345', kl: 12.5, doiId: 'd1'}, {soPhieu: '2', bienSo: '92C-1', kl: 5, doiId: 'd1'}]},
  f2: {id: 'f2', info: {maRung: 'QS-08'}, doi: [], hdvc: [], nc: [], dx: [], pc: [], chot: {at: 'x'}}}}},
  dmLaoDong: [{ngayCapNhat: '01/10/2026', cccd: '049085007001', ten: 'AN', diaChi: 'Quế Sơn', viTri: 'Công nhân cưa'}, {ngayCapNhat: '01/11/2026', cccd: '049085007001', ten: 'AN', diaChi: 'Đại Lộc'}],
  dmXeVC: [{ngayCapNhat: '01/10/2026', bienSo: '92C-123.45', chuXe: 'X', taiXe: 'AN', cccdTx: '049085007001', hanDangKiem: '01/01/2027'}], dmDoiTac: [{id: 'dn:dv1', loai: 'doanhnghiep', ten: 'CTY VẬN TẢI', mst: '0400'}]};
test('tổng hợp người: thông tin hiện hành, lịch sử, các lô đã tham gia (khối lượng của đội), xe đứng tên tài xế', () => {
  const r = T.nguoi(db, '049085007001'); assert.equal(r.muc[0].dong[0][2], 'Đại Lộc'); assert.equal(r.muc[1].dong.length, 2);
  assert.deepEqual(r.muc[2].dong[0].slice(0, 5), ['QS-07', 'CHỦ A', 'Đội 1', 'Công nhân', 'Công nhân cưa']); assert.equal(r.muc[2].dong[0][8], 17.5); assert.equal(r.muc[3].dong.length, 1);
  assert.equal(T.nguoi(db, '049000000000'), null);
});
test('tổng hợp xe: số chuyến và khối lượng theo biển số chuẩn hóa; giấy tờ và hạn', () => {
  const r = T.xe(db, '92c12345'); assert.deepEqual(r.muc[3].dong[0], ['QS-07', 'CHỦ A', 'Đội xe 1', 1, 12.5]); assert.equal(r.muc[1].dong[0][0], 'Đăng kiểm'); assert.equal(T.xe(db, '00A00000'), null);
});
test('tổng hợp đối tác và chủ rừng', () => {
  const d = T.doiTac(db, 'dn:dv1'); assert.deepEqual(d.muc[1].dong[0], ['QS-07', 'CHỦ A', 'Đội xe 1', 1, 1, 12.5]);
  const c = T.chuRung(db, 'o1'); assert.equal(c.muc[0].dong.length, 2); assert.equal(c.muc[0].dong[0][3], 20); assert.equal(c.muc[0].dong[0][4], 17.5); assert.equal(c.muc[0].dong[1][6], 'Đã chốt');
  // lô 5a (T-13): lô chưa điền dinhMucTanHa riêng vẫn lấy định mức gỗ keo mặc định qua HAKDinhMuc.sanLuongDuKien
  const db2 = JSON.parse(JSON.stringify(db)); delete db2.rs.o1.forests.f1.info.dinhMucTanHa; db2.dinhMucKeo = [{tuNgay: '01/01/2026', tanHa: 80}];
  assert.equal(T.chuRung(db2, 'o1').muc[0].dong[0][3], 160);
});
