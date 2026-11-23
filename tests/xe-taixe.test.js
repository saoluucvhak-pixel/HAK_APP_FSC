'use strict';
/* Danh mục xe: tài xế thường chạy (taiXeId) — src/xedm.js, src/goidm.js */
const test = require('node:test'), assert = require('node:assert/strict');
const XE = require('../src/xedm'), GD = require('../src/goidm');

const dmDT = () => [
  {id: 'dt1', ten: 'LÊ VĂN XE', loai: 'thenhan', nguoi: [{id: 'ng1', hoTen: 'LÊ VĂN XE', cccd: '049000000077', diaChi: 'Quế Sơn', ngayCap: '01/01/2021', noiCap: 'Cục CS', gplx: 'GP-1', hanGplx: '01/01/2030', vaiTro: {taiXe: true, chuXe: true}}]},
  {id: 'dt2', ten: 'TRẦN SƠN', loai: 'thenhan', nguoi: [{id: 'ng2', hoTen: 'TRẦN SƠN', cccd: '049085000001', vaiTro: {nhanCong: true}}]},
  {id: 'dt3', ten: 'CÔNG TY A', loai: 'phapnhan', mst: '0401234567', nguoi: []}];

test('xe chưa có tài xế: JSON y hệt bản cũ (không có khóa taiXeId)', () => {
  const r = XE.luu([], {bks: '92c-12345', loaiXe: 'Đầu kéo'}, dmDT());
  assert.ok(r.ok);
  assert.equal(JSON.stringify(r.xe), JSON.stringify({id: 'xe1', bks: '92C-12345', ngayCapNhat: '', hanKiemDinh: '', hanBaoHiem: '', loaiXe: 'Đầu kéo', chuXeId: '', ngung: false}));
  assert.ok(!('taiXeId' in XE.chuan({bks: 'A', taiXeId: '  '})));
});

test('gắn rồi bỏ tài xế', () => {
  let r = XE.luu([], {bks: '92C-1', taiXeId: 'ng1'}, dmDT()); assert.ok(r.ok); assert.equal(r.xe.taiXeId, 'ng1');
  assert.equal(XE.taiXe(dmDT(), 'ng1').gplx, 'GP-1');
  r = XE.luu(r.dm, Object.assign({}, r.xe, {taiXeId: ''}), dmDT()); assert.ok(r.ok); assert.ok(!('taiXeId' in r.dm[0]));
  assert.equal(XE.taiXe(dmDT(), ''), null);
});

test('kiểm: người không có vai trò Tài xế / không còn trong danh mục → báo lỗi', () => {
  let r = XE.luu([], {bks: '92C-1', taiXeId: 'ng2'}, dmDT()); assert.equal(r.ok, false); assert.match(r.errs.join(), /TRẦN SƠN chưa có vai trò Tài xế/);
  r = XE.luu([], {bks: '92C-1', taiXeId: 'ng99'}, dmDT()); assert.equal(r.ok, false); assert.match(r.errs.join(), /Tài xế không còn trong Danh mục đối tượng/);
  r = XE.luu([], {bks: '92C-1', taiXeId: 'dt3'}, dmDT()); assert.equal(r.ok, false);   // pháp nhân không phải tài xế
});

test('chonTaiXe: chỉ người có vai trò Tài xế, bỏ người ngừng', () => {
  assert.deepEqual(XE.chonTaiXe(dmDT()).map(x => x.id), ['ng1']);
  const d = dmDT(); d[0].nguoi[0].ngung = true; assert.deepEqual(XE.chonTaiXe(d), []);
});

test('nhập Excel: xe đã có tài xế không bị mất tài xế khi file không có cột tài xế', () => {
  const dm = XE.luu([], {bks: '92C-1', loaiXe: 'A', taiXeId: 'ng1'}, dmDT()).dm;
  const r = XE.docExcel([{'Số BKS': '92C-1', 'Loại xe': 'A'}], dm, dmDT());
  assert.equal(r.dong[0].trangThai, 'trung'); assert.equal(r.dong[0].xe.taiXeId, 'ng1');
});

test('dienTaiXeLo: điền khi trống, không ghi đè dòng đã có tài xế', () => {
  const ng = XE.taiXe(dmDT(), 'ng1').ng;
  assert.deepEqual(XE.dienTaiXeLo(ng, {}, 'ng1'), {taiXe: 'LÊ VĂN XE', cccdTx: '049000000077', diaChiTx: 'Quế Sơn', ngayCapTx: '01/01/2021', noiCapTx: 'Cục CS', gplx: 'GP-1', hanGplx: '01/01/2030', taiXeId: 'ng1'});
  assert.deepEqual(XE.dienTaiXeLo(ng, {taiXe: 'NGƯỜI KHÁC'}, 'ng1'), {});
  assert.deepEqual(XE.dienTaiXeLo(ng, {cccdTx: '049000000999'}, 'ng1'), {});
  assert.deepEqual(XE.dienTaiXeLo(null, {}, 'ng1'), {});
});

const mayA = () => ({dmViTri: [], dmDoiTuong: dmDT(), dmXe: [{id: 'xe1', bks: '92C-12345', chuXeId: 'ng1', taiXeId: 'ng1'}]});
const loA = () => ({id: 'f1', info: {}, doi: [], nc: [], hdvc: [], pc: [], dx: [{bienSo: '92C-12345', xeId: 'xe1'}]});

test('gói danh mục: mang theo tài xế của xe và ánh xạ lại theo CCCD trên máy đích', () => {
  const g = GD.dongGoi(mayA(), loA());
  assert.ok(g.doiTuong.some(o => o.id === 'dt1'));
  const dmB = dmDT(); dmB[0].id = 'dtB'; dmB[0].nguoi[0].id = 'ngB';
  const r = GD.noi({dmDoiTuong: [dmB[0]], dmXe: [], dmViTri: []}, g);
  assert.equal(r.dm.dmXe[0].taiXeId, 'ngB'); assert.equal(r.dm.dmXe[0].chuXeId, 'ngB');
});

test('gói danh mục: máy đích chưa có người → thêm người từ gói; xe không tài xế vẫn không có khóa taiXeId', () => {
  const g = GD.dongGoi(mayA(), loA());
  const r = GD.noi({dmDoiTuong: [], dmXe: [], dmViTri: []}, g);
  assert.equal(r.dm.dmXe[0].taiXeId, 'ng1');
  const m = mayA(); delete m.dmXe[0].taiXeId;
  const r2 = GD.noi({dmDoiTuong: [], dmXe: [], dmViTri: []}, GD.dongGoi(m, loA()));
  assert.ok(!('taiXeId' in r2.dm.dmXe[0]));
});

test('gói danh mục: người trên máy đích chưa có vai trò Tài xế → bỏ rỗng và báo', () => {
  const g = GD.dongGoi(mayA(), loA());
  const dmB = dmDT(); dmB[0].nguoi[0].vaiTro = {chuXe: true};
  const r = GD.noi({dmDoiTuong: [dmB[0]], dmXe: [], dmViTri: []}, g);
  assert.ok(!('taiXeId' in r.dm.dmXe[0])); assert.ok(r.khac.some(x => /tài xế thường chạy/.test(x)));
});
