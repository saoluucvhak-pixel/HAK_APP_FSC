'use strict';
const test = require('node:test'), assert = require('node:assert');
const M = require('../src/danhmuc');
const ld = (cccd, ngay, o) => Object.assign({ngayCapNhat: ngay, cccd, ten: 'LÊ A', gioiTinh: 'Nam', ngaySinh: '01/01/1985', diaChi: 'Đà Nẵng', ngayCap: '01/01/2021', noiCap: 'CA', sdt: '0905', chucVu: 'Công nhân', viTri: 'Công nhân cưa'}, o);
const xe = (bien, ngay, o) => Object.assign({ngayCapNhat: ngay, bienSo: bien, chuXe: 'A', taiXe: 'B', cccdTx: '049000000001', hanGplx: '01/01/2030', hanDangKiem: '01/06/2027', hanBaoHiem: '01/06/2027'}, o);

test('lao động: nhiều dòng theo ngày cập nhật, luôn lấy dòng mới nhất; cùng ngày thì dòng thêm sau; CCCD ghi có dấu cách vẫn gộp', () => {
  const L = [ld('049085000001', '01/03/2026', {diaChi: 'Cũ'}), ld('049 085 000 001', '01/09/2026', {diaChi: 'Mới'}), ld('049085000001', '15/05/2026', {diaChi: 'Giữa'}), ld('049085000001', '01/09/2026', {diaChi: 'Cùng ngày, sau'})];
  assert.strictEqual(M.layLaoDong(L, '049085000001').row.diaChi, 'Cùng ngày, sau');
  assert.deepStrictEqual(M.lichSuLaoDong(L, '049085000001').map(r => r.diaChi), ['Cùng ngày, sau', 'Mới', 'Giữa', 'Cũ']);
  assert.strictEqual(M.layLaoDong(L, '123'), null); assert.strictEqual(M.layLaoDong(L, '049085000999'), null);
  assert.strictEqual(M.laoDongHieuLuc(L).length, 1);
});
test('dòng thiếu ngày cập nhật coi là cũ nhất (dữ liệu chuyển từ bản cũ)', () => {
  const L = [ld('049085000001', '', {diaChi: 'Chuyển từ bản cũ'}), ld('049085000001', '01/01/2026', {diaChi: 'Có ngày'})];
  assert.strictEqual(M.layLaoDong(L, '049085000001').row.diaChi, 'Có ngày');
});
test('xe: biển số so khớp bỏ dấu chấm, gạch, khoảng trắng, không phân biệt hoa thường; lấy dòng mới nhất', () => {
  const X = [xe('92C-123.45', '01/01/2026', {taiXe: 'CŨ'}), xe('92c 12345', '01/07/2026', {taiXe: 'MỚI'}), xe('92C-999.99', '01/01/2026')];
  assert.strictEqual(M.layXe(X, '92C12345').row.taiXe, 'MỚI'); assert.strictEqual(M.xeHieuLuc(X).length, 2);
  assert.deepStrictEqual(M.lichSuXe(X, '92C-123.45').map(r => r.taiXe), ['MỚI', 'CŨ']); assert.strictEqual(M.layXe(X, ''), null);
});
test('kiểm lao động: bắt buộc tên, CCCD 12 số, ngày cập nhật; chức vụ trong danh mục; vị trí trong danh mục vị trí', () => {
  const VI = ['Công nhân cưa', 'Công nhân bóc vỏ'];
  assert.ok(M.kiemLaoDong(ld('049085000001', '01/01/2026'), VI).ok);
  const e = M.kiemLaoDong(ld('123', '31/02/2026', {ten: '', chucVu: 'Giám đốc', viTri: 'Lái máy', gioiTinh: 'X', ngaySinh: '31/02/1990'}), VI).errs.join('|');
  ['thiếu họ tên', 'CCCD phải đủ 12', 'ngày cập nhật phải đúng', 'chức vụ phải chọn', 'vị trí “Lái máy” không có', 'giới tính là Nam hoặc Nữ', 'ngày sinh không có thật'].forEach(t => assert.ok(e.includes(t), t + ' | ' + e));
  assert.strictEqual(M.kiemLaoDong(ld('049 085 000 001', '01/01/2026'), VI).row.cccd, '049085000001', 'CCCD chuẩn hóa chỉ còn chữ số');
  assert.ok(M.kiemLaoDong(ld('049085000001', '01/01/2026', {viTri: 'Công nhân CƯA'}), VI).ok, 'vị trí so khớp không phân biệt hoa thường');
});
test('kiểm xe: biển số, ngày cập nhật, tài xế có CCCD, các ngày hết hạn có thật', () => {
  assert.ok(M.kiemXe(xe('92c-1', '01/01/2026')).ok);
  assert.strictEqual(M.kiemXe(xe('92c-1', '01/01/2026')).row.bienSo, '92C-1');
  const e = M.kiemXe(xe('', '', {cccdTx: '12', hanGplx: '30/02/2030', hanDangKiem: '31/04/2027'})).errs.join('|');
  ['thiếu biển số', 'ngày cập nhật', 'tài xế phải có CCCD', 'ngày hết hạn giấy phép không có thật', 'ngày hết hạn đăng kiểm không có thật'].forEach(t => assert.ok(e.includes(t), t + ' | ' + e));
  assert.ok(M.kiemXe(xe('92C-1', '01/01/2026', {taiXe: '', cccdTx: ''})).ok, 'xe không có tài xế (chủ xe tự lái) hợp lệ');
});
test('thêm dòng: cùng khóa cùng ngày thì thay; khác ngày thì thêm (giữ lịch sử); không sửa đầu vào', () => {
  const L = [ld('049085000001', '01/03/2026')], before = JSON.stringify(L);
  let r = M.themLaoDong(L, ld('049085000001', '01/03/2026', {sdt: '0999'})); assert.deepStrictEqual([r.list.length, r.them, r.list[0].sdt], [1, false, '0999']);
  r = M.themLaoDong(L, ld('049085000001', '01/09/2026')); assert.deepStrictEqual([r.list.length, r.them], [2, true]); assert.strictEqual(JSON.stringify(L), before);
  const rx = M.themXe([xe('92C-1', '01/01/2026')], xe('92c 1', '01/02/2026')); assert.strictEqual(rx.list.length, 2);
});
test('bản chụp vào lô và so với danh mục: chức vụ → vai trò, vị trí → chức danh; xe → kdDen, hanBH; nêu trường đã lệch', () => {
  const d = ld('049085000001', '01/09/2026', {chucVu: 'Tổ trưởng', viTri: 'Công nhân cưa', diaChi: 'Mới'});
  const r = M.chupLaoDong(d, {stt: '3', maRung: 'R-A', ten: 'cũ'}); assert.deepStrictEqual([r.vaiTro, r.chucDanh, r.diaChi, r.stt, r.maRung, r.ten], ['Tổ trưởng', 'Công nhân cưa', 'Mới', '3', 'R-A', 'LÊ A']);
  assert.deepStrictEqual(M.khacLaoDong({ten: 'LÊ A', ngaySinh: '01/01/1985', ngayCap: '01/01/2021', noiCap: 'CA', diaChi: 'Cũ'}, d), ['thường trú']);
  const x = xe('92C-1', '01/09/2026', {hanDangKiem: '01/12/2027'}), rx = M.chupXe(x, {stt: '1', nguoiKy: 'Chủ xe'});
  assert.deepStrictEqual([rx.kdDen, rx.hanBH, rx.taiXe, rx.stt, rx.nguoiKy], ['01/12/2027', '01/06/2027', 'B', '1', 'Chủ xe']);
  assert.deepStrictEqual(M.khacXe({taiXe: 'B', cccdTx: '049000000001', gplx: '', hanGplx: '01/01/2030', kdDen: '01/06/2027', hanBH: '01/06/2027'}, x), ['hạn đăng kiểm']);
});

test('dựng danh mục từ lô (v7): một dòng mỗi lô cho mỗi CCCD / biển số, ngày cập nhật = ngày bắt đầu khai thác, lô mới hơn thắng, lô chưa có ngày thì dòng chưa rõ ngày (cũ nhất)', () => {
  const nv = (cccd, ten, o) => Object.assign({cccd, ten, vaiTro: 'Công nhân', chucDanh: 'Công nhân cưa', ngaySinh: '01/01/1985', diaChi: 'Đà Nẵng', ngayCap: '01/01/2021', noiCap: 'CA'}, o);
  const rs = {a: {forests: {f1: {info: {tuNgay: '01/03/2026'}, nc: [nv('049085000001', 'LÊ A', {diaChi: 'Cũ'}), nv('123', 'SAI CCCD')], dx: [{bienSo: '92c-1', chuXe: 'X', taiXe: 'T', cccdTx: '049000000001', kdDen: '01/06/2027', hanBH: '01/07/2027'}]},
    f2: {info: {tuNgay: '01/09/2026'}, nc: [nv('049085000001', 'LÊ A', {diaChi: 'Mới', vaiTro: 'Tổ trưởng'})], dx: []}, f3: {info: {}, nc: [nv('049085000002', 'BÙI B', {vaiTro: 'Lạ'})], dx: []}}}};
  const x = M.dungTuLo(rs, '15/11/2026');
  assert.deepStrictEqual(x.laoDong.map(r => [r.cccd, r.ngayCapNhat, r.diaChi]), [['049085000002', '', 'Đà Nẵng'], ['049085000001', '01/03/2026', 'Cũ'], ['049085000001', '01/09/2026', 'Mới']]);
  assert.strictEqual(M.layLaoDong(x.laoDong, '049085000001').row.chucVu, 'Tổ trưởng'); assert.strictEqual(x.laoDong[0].chucVu, '', 'vai trò ngoài danh mục chức vụ để trống');
  assert.deepStrictEqual([x.xe.length, x.xe[0].bienSo, x.xe[0].hanDangKiem, x.xe[0].hanBaoHiem, x.xe[0].ngayCapNhat], [1, '92C-1', '01/06/2027', '01/07/2027', '01/03/2026']);
});
