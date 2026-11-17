'use strict';
/* 3.0 P8 — gói lô rừng mang danh mục lô dùng; khôi phục trên máy có danh mục khác (src/goidm.js, src/lorung.js) */
const test = require('node:test'), assert = require('node:assert/strict');
const GD = require('../src/goidm'), LR = require('../src/lorung'), V = require('../src/vongdoi');

const dmMayA = () => ({
  dmViTri: [{id: 'vt1', ten: 'Tổ trưởng'}, {id: 'vt2', ten: 'Công nhân cưa'}],
  dmDoiTuong: [
    {id: 'dt1', ma: 'DT0001', ten: 'TỔ TRẦN SƠN', loai: 'thenhan', nguoi: [{id: 'ng1', hoTen: 'TRẦN SƠN', cccd: '049085000001', vaiTro: {nhanCong: true}, kyHD: {nhanCong: true}}]},
    {id: 'dt2', ma: 'DT0002', ten: 'LÊ VĂN XE', loai: 'thenhan', nguoi: [{id: 'ng2', hoTen: 'LÊ VĂN XE', cccd: '049000000077', vaiTro: {taiXe: true, chuXe: true}, gplx: 'G1', kyHD: {vanChuyen: true}}]},
    {id: 'dt3', ma: 'DT0003', ten: 'CÔNG TY VẬN TẢI A', loai: 'phapnhan', mst: '0401234567', kyHD: {vanChuyen: true}, daiDien: 'B', nguoi: []},
    {id: 'dt4', ma: 'DT0004', ten: 'KHÔNG DÙNG', loai: 'thenhan', nguoi: [{id: 'ng9', hoTen: 'AI ĐÓ', cccd: '049000000999'}]}],
  dmXe: [{id: 'xe1', bks: '92C-12345', chuXeId: 'ng2'}, {id: 'xe2', bks: '92C-99999', chuXeId: 'dt3'}]
});
const loA = () => ({id: 'f1', info: {maRung: 'R-1'}, doi: [{id: 'doi1', benNhanKhoan: {doiTuongId: 'dt1', nguoiId: 'ng1'}}],
  nc: [{ten: 'TRẦN SƠN', cccd: '049085000001', nguoiId: 'ng1', viTriId: 'vt1', doiId: 'doi1'}], dx: [{bienSo: '92C-12345', xeId: 'xe1', taiXeId: 'ng2', hdvcId: 'hd1'}],
  hdvc: [{id: 'hd1', benKy: {doiTuongId: 'dt2', nguoiId: 'ng2'}}], pc: []});

test('đóng gói: chỉ mục lô trỏ tới (kèm đối tượng của người, chủ xe); không mang mục không dùng', () => {
  const g = GD.dongGoi(dmMayA(), loA());
  assert.deepEqual(g.viTri.map(v => v.id), ['vt1']);
  assert.deepEqual(g.doiTuong.map(o => o.id).sort(), ['dt1', 'dt2']);
  assert.deepEqual(g.xe.map(x => x.id), ['xe1']);
});

test('máy đích danh mục khác: nối theo CCCD / MST / BKS / tên vị trí, lô trỏ sang ID của máy; mục chưa có được thêm', () => {
  const g = GD.dongGoi(dmMayA(), loA());
  const mayB = {dmViTri: [{id: 'vt1', ten: 'Công nhân khai thác'}, {id: 'vt7', ten: 'tổ trưởng'}],
    dmDoiTuong: [{id: 'dt1', ten: 'ĐỐI TƯỢNG KHÁC', loai: 'thenhan', nguoi: [{id: 'ng1', hoTen: 'NGƯỜI KHÁC', cccd: '049000000111'}]},
      {id: 'dt5', ten: 'LÊ VĂN XE', loai: 'thenhan', nguoi: [{id: 'ng5', hoTen: 'LÊ VĂN XE', cccd: '049000000077'}]}],
    dmXe: [{id: 'xe1', bks: '43A-11111'}, {id: 'xe9', bks: '92c 123.45', chuXeId: 'ng5'}]};
  const n = GD.noi(mayB, g), f = loA();
  assert.equal(n.doi.vt.vt1, 'vt7', 'vị trí theo tên, không theo ID trùng');
  assert.equal(n.doi.ng.ng2, 'ng5', 'người theo CCCD'); assert.equal(n.doi.dt.dt2, 'dt5');
  assert.equal(n.doi.xe.xe1, 'xe9', 'xe theo BKS chuẩn hóa');
  assert.notEqual(n.doi.dt.dt1, 'dt1', 'đối tượng chưa có mà ID gói đã dùng: cấp ID mới'); assert.notEqual(n.doi.ng.ng1, 'ng1');
  assert.ok(n.dm.dmDoiTuong.some(o => o.ten === 'TỔ TRẦN SƠN' && o.nguoi[0].cccd === '049085000001'));
  assert.equal(mayB.dmDoiTuong.length, 2, 'không sửa đầu vào');
  GD.doiIdLo(f, n.doi);
  assert.equal(f.nc[0].viTriId, 'vt7'); assert.equal(f.nc[0].nguoiId, n.doi.ng.ng1); assert.equal(f.dx[0].xeId, 'xe9'); assert.equal(f.dx[0].taiXeId, 'ng5');
  assert.deepEqual(f.hdvc[0].benKy, {doiTuongId: 'dt5', nguoiId: 'ng5'}); assert.equal(f.doi[0].benNhanKhoan.doiTuongId, n.doi.dt.dt1);
});

test('người cùng CCCD khác họ tên: không tự nối, ghi Cần đối chiếu; lô đã chốt không đổi dữ liệu', () => {
  const g = GD.dongGoi(dmMayA(), loA());
  const mayC = {dmViTri: [], dmXe: [], dmDoiTuong: [{id: 'dtX', ten: 'X', loai: 'thenhan', nguoi: [{id: 'ngX', hoTen: 'TÊN KHÁC', cccd: '049085000001'}]}]};
  const n = GD.noi(mayC, g);
  assert.ok(n.can.some(c => /TRẦN SƠN/.test(c.lyDo) && /TÊN KHÁC/.test(c.lyDo)));
  assert.ok(!n.doi.ng.ng1, 'không nối người trùng CCCD khác tên');
  const f = loA(); V.chot(f, 'KT', '2026-11-01T00:00:00.000Z', []); const truoc = JSON.stringify(f);
  assert.equal(GD.doiIdLo(f, {dt: {dt1: 'zz'}, ng: {ng1: 'zz'}, xe: {xe1: 'zz'}, vt: {vt1: 'zz'}}), 0); assert.equal(JSON.stringify(f), truoc);
});

test('gói lô: sao lưu mang danh mục, xem trước liệt kê mục thêm / khác, khôi phục bổ sung danh mục và nối lô; gói cũ không có danh mục vẫn khôi phục được', () => {
  const dbA = Object.assign(dmMayA(), {rs: {o1: {id: 'o1', info: {ten: 'CHỦ A', cccd: '049000000001', ma: 'CR-1'}, forests: {f1: loA()}}}});
  const pkg = LR.exportLot(dbA, 'o1', 'f1', {now: '2026-11-16T00:00:00.000Z'});
  assert.ok(pkg.dungChung.danhMuc && pkg.dungChung.danhMuc.doiTuong.length === 2);
  const dbB = {rs: {}, dmViTri: [{id: 'vt7', ten: 'Tổ trưởng'}], dmDoiTuong: [{id: 'dt5', ten: 'LÊ VĂN XE', loai: 'thenhan', nguoi: [{id: 'ng5', hoTen: 'LÊ VĂN XE', cccd: '049000000077', gplx: 'KHÁC'}]}], dmXe: []};
  const plan = LR.planLot(dbB, pkg);
  assert.ok(plan.ok); assert.ok(plan.dungChung.them.some(x => /TỔ TRẦN SƠN/.test(x.text))); assert.ok(plan.dungChung.khac.some(x => /LÊ VĂN XE.*DÙNG BẢN CỦA MÁY/.test(x.text)));
  const r = LR.applyLot(dbB, pkg, 'giu');
  const f = r.next.rs[r.ownerId].forests[r.forestId];
  assert.equal(f.nc[0].viTriId, 'vt7'); assert.equal(f.dx[0].taiXeId, 'ng5'); assert.ok(r.next.dmXe.some(x => x.bks === '92C-12345' && x.chuXeId === 'ng5'));
  assert.equal(dbB.dmDoiTuong.length, 1, 'không sửa dữ liệu máy đích trước khi ghi');
  const cu = JSON.parse(JSON.stringify(pkg)); delete cu.dungChung.danhMuc;   // gói bản cũ
  const r2 = LR.applyLot({rs: {}}, cu, 'giu'); assert.ok(r2.doi && !r2.next.dmDoiTuong);
});
