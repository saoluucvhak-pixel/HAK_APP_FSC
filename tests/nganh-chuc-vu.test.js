'use strict';
/* PR B: ngành nghề và chức vụ (src/nganh.js): suy ngành từ dữ liệu cũ, chức vụ → vaiTro tương thích, kiểm người, gieo sẵn. Dữ liệu thử: người giả lập. */
const test = require('node:test'), assert = require('node:assert/strict');
const N = require('../src/nganh.js');
const db = {};
const ng = (o) => Object.assign({id: 'p1', hoTen: 'NGUYEN VAN A', cccd: '049090001111', vaiTro: {}}, o);

test('gieo sẵn: hai ngành và năm chức vụ khi danh mục chưa có; đã có thì không gieo', () => {
  const g = N.gieo({}); assert.deepEqual(g.dmNganh.map(x => x.ten), ['Khai thác gỗ keo', 'Vận chuyển']);
  assert.deepEqual(g.dmChucVu.map(x => x.ten), ['Chủ xe', 'Tổ trưởng', 'Công nhân', 'Tài xế', 'Khác']);
  const g2 = N.gieo({dmNganh: [{id: 'x', ten: 'X'}], dmChucVu: [{id: 'y', ten: 'Y'}]}); assert.equal(g2.dmNganh, null); assert.equal(g2.dmChucVu, null);
});
test('dữ liệu cũ (chưa có chức vụ): ngành suy từ vaiTro; không đổi dữ liệu', () => {
  const p = ng({vaiTro: {nhanCong: true}}), snap = JSON.stringify(p);
  assert.deepEqual(N.nganhNguoi(db, p), [N.KT]); assert.deepEqual(N.nganhNguoi(db, ng({vaiTro: {taiXe: true}})), [N.VC]);
  assert.deepEqual(N.nganhNguoi(db, ng({vaiTro: {chuXe: true, nhanCong: true}})).sort(), [N.KT, N.VC].sort());
  assert.deepEqual(N.nganhNguoi(db, ng()), []); assert.equal(JSON.stringify(p), snap, 'không sửa đầu vào');
});
test('chức vụ đã khai: ngành theo chức vụ; “Khác” dùng ngành người chọn', () => {
  assert.deepEqual(N.nganhNguoi(db, ng({chucVu: ['cvToTruong', 'cvCongNhan']})), [N.KT]);
  assert.deepEqual(N.nganhNguoi(db, ng({chucVu: ['cvTaiXe']})), [N.VC]);
  assert.deepEqual(N.nganhNguoi(db, ng({chucVu: ['cvKhac'], nganh: [N.VC]})), [N.VC]);
  assert.deepEqual(N.nganhNguoi(db, ng({chucVu: ['cvKhac']})), [], 'Khác chưa chọn ngành: chưa thuộc ngành nào');
});
test('kiemNguoi: chức vụ “Khác” bắt chọn ngành; chức vụ có ngành thì không đòi', () => {
  assert.equal(N.kiemNguoi(db, ng({chucVu: ['cvKhac']})).length, 1);
  assert.equal(N.kiemNguoi(db, ng({chucVu: ['cvKhac'], nganh: [N.KT]})).length, 0);
  assert.equal(N.kiemNguoi(db, ng({chucVu: ['cvCongNhan']})).length, 0);
});
test('vaiTroTuChucVu: giữ tương thích khóa vaiTro cũ (Tổ trưởng và Công nhân đều bật nhanCong)', () => {
  assert.deepEqual(N.vaiTroTuChucVu(db, ['cvToTruong']), {nhanCong: true, taiXe: false, chuXe: false});
  assert.deepEqual(N.vaiTroTuChucVu(db, ['cvTaiXe', 'cvChuXe']), {nhanCong: false, taiXe: true, chuXe: true});
  assert.deepEqual(N.vaiTroTuChucVu(db, ['cvKhac']), {nhanCong: false, taiXe: false, chuXe: false});
});
test('ngành của đối tượng: pháp nhân chọn tay hoặc suy từ quyền ký; thể nhân gộp ngành các người đang dùng', () => {
  assert.deepEqual(N.nganhDoiTuong(db, {loai: 'phapnhan', nganh: [N.KT, N.VC]}), [N.KT, N.VC]);
  assert.deepEqual(N.nganhDoiTuong(db, {loai: 'phapnhan', kyHD: {nhanCong: true}}), [N.KT]);
  assert.deepEqual(N.nganhDoiTuong(db, {loai: 'phapnhan', kyHD: {vanChuyen: true}}), [N.VC]);
  assert.deepEqual(N.nganhDoiTuong(db, {loai: 'phapnhan'}), []);
  assert.deepEqual(N.nganhDoiTuong(db, {loai: 'thenhan', nguoi: [ng({vaiTro: {taiXe: true}}), ng({id: 'p2', ngung: true, vaiTro: {nhanCong: true}})]}), [N.VC], 'người ngừng sử dụng không tính');
});
test('chucVuNhan: chữ chức vụ (cũ suy từ vaiTro); thuocNganh', () => {
  assert.equal(N.chucVuNhan(db, ng({chucVu: ['cvToTruong', 'cvCongNhan']})), 'Tổ trưởng, Công nhân');
  assert.equal(N.chucVuNhan(db, ng({vaiTro: {nhanCong: true, taiXe: true}})), 'Công nhân, Tài xế');
  assert.ok(N.thuocNganh([N.KT], N.KT) && !N.thuocNganh([N.VC], N.KT) && N.thuocNganh([], ''));
});

test('quản lý danh mục: thêm, trùng tên, đổi tên, xóa/ngừng', () => {
  const N = require('../src/nganh'), db = {dmDoiTuong: [{id: 'a', loai: 'thenhan', ten: 'A', nguoi: [{id: 'p1', hoTen: 'Người giả lập', chucVu: ['cvToTruong']}]}]};
  assert.equal(N.themNganh(db, '  ').ok, false);
  assert.equal(N.themNganh(db, 'vận CHUYỂN').ok, false, 'trùng tên không phân biệt dấu/hoa thường');
  assert.equal(N.themNganh(db, 'Chế biến').ok, true);
  const ng = db.dmNganh.find(x => x.ten === 'Chế biến');
  assert.equal(N.themChucVu(db, 'Thợ máy', ng.id).ok, true);
  const cv = db.dmChucVu.find(x => x.ten === 'Thợ máy');
  assert.equal(N.xoa(db, 'dmNganh', ng.id).kieu, 'ngung', 'ngành đang là mặc định của chức vụ → ngừng');
  assert.equal(N.xoa(db, 'dmChucVu', cv.id).kieu, 'xoa');
  assert.equal(N.xoa(db, 'dmChucVu', 'cvToTruong').ok, false, 'mục gieo sẵn không xóa');
  assert.equal(N.dangDungChucVu(db, 'cvToTruong'), 1);
  assert.equal(N.doi(db, 'dmChucVu', 'cvKhac', 'Công nhân', '').ok, false, 'đổi sang tên trùng bị chặn');
});

test('chuẩn hóa đối tượng giữ chucVu/nganh khi có, không thêm khóa khi rỗng (JSON cũ y hệt)', () => {
  const D = require('../src/doituong');
  const cu = D.chuan({id: 'x', ten: 'A', loai: 'thenhan', nguoi: [{id: 'p', hoTen: 'Người giả lập'}]});
  assert.equal('chucVu' in cu.nguoi[0], false); assert.equal('nganh' in cu.nguoi[0], false); assert.equal('nganh' in cu, false);
  const moi = D.chuan({id: 'x', ten: 'A', loai: 'phapnhan', nganh: ['khaiThac', 'vanChuyen', ''], nguoi: [{id: 'p', hoTen: 'B', chucVu: ['cvKhac', 'cvKhac'], nganh: ['vanChuyen']}]});
  assert.deepEqual(moi.nganh, ['khaiThac', 'vanChuyen']); assert.deepEqual(moi.nguoi[0].chucVu, ['cvKhac']); assert.deepEqual(moi.nguoi[0].nganh, ['vanChuyen']);
});

test('lọc theo ngành: chỉ loại khi đã khai rõ ngành; dữ liệu cũ không ai biến mất', () => {
  const N = require('../src/nganh'), db = {};
  assert.equal(N.hopNganh(db, {loai: 'thenhan'}, {vaiTro: {taiXe: true}}, N.KT), true, 'cũ chưa khai: giữ');
  assert.equal(N.hopNganh(db, {loai: 'thenhan'}, {chucVu: ['cvTaiXe']}, N.KT), false, 'khai Tài xế (Vận chuyển): không hiện ở Khai thác');
  assert.equal(N.hopNganh(db, {loai: 'thenhan'}, {chucVu: ['cvKhac'], nganh: ['khaiThac']}, N.KT), true);
  assert.equal(N.hopNganh(db, {loai: 'phapnhan', nganh: ['khaiThac', 'vanChuyen']}, null, N.VC), true, 'doanh nghiệp chọn cả hai ngành');
  assert.equal(N.hopNganh(db, {loai: 'phapnhan', nganh: ['vanChuyen']}, null, N.KT), false);
  assert.equal(N.hopNganh(db, {loai: 'phapnhan'}, null, N.KT), true);
});
