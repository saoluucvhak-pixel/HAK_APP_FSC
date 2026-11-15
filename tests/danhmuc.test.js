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

test('tạo lô từ lô cũ: chép đội, nhân công, xe, đơn giá, cước; bỏ phiếu cân, chấm công, số/ngày văn bản, thời gian; người và xe lấy dòng danh mục mới nhất; không sửa lô nguồn', () => {
  const M = require('../src/danhmuc');
  const src = {id: 'a', info: {maRung: 'R-A', tenRung: 'Lô A', diaDiem: 'Thôn A', dienTich: 2, tuNgay: '01/10/2026', denNgay: '30/11/2026', giayTo: [{x: 1}], donGia: 1, vanChuyen: {mode: 'coDinh', coDinh: 52000}, muaHang: {congTyId: 'c1', xacNhan: '2026-10-01'}, cuLy: 45},
    doi: [{id: 'd1', ten: 'Đội 1', hinhThuc: {donGiaTan: {'Tổ trưởng': 420000}, ngayBDLD: '05/10/2026'}, dienTich: 1, exp: {soKT: '015'}}], hdvc: [{id: 'h1', cuoc: {x: 1}, exp: {soVC: '07'}}],
    nc: [{ten: 'CŨ', cccd: '049085007001', diaChi: 'Quế Sơn', vaiTro: 'Tổ trưởng', chucDanh: 'Tổ trưởng', doiId: 'd1', maRung: 'R-A', _nguon: 'Excel'}],
    dx: [{bienSo: '92C-1', taiXe: 'X', hanGplx: '01/01/2026', hdvcId: 'h1', maRung: 'R-A'}], pc: [{soPhieu: 'P1'}], cc: {a: 1}, exp: {soKT: '015'}, inDot2: {bm08: 1}};
  const truoc = JSON.stringify(src);
  const dmLd = [{ngayCapNhat: '01/11/2026', cccd: '049085007001', ten: 'MỚI', diaChi: 'Đại Lộc', chucVu: 'Công nhân', viTri: 'Công nhân cưa'}], dmXe = [{ngayCapNhat: '01/11/2026', bienSo: '92C1', taiXe: 'Y', hanGplx: '01/01/2030'}];
  const r = M.loTuLoCu(src, {id: 'b', maRung: 'R-B', tenRung: 'Lô B', dmLaoDong: dmLd, dmXe});
  assert.strictEqual(JSON.stringify(src), truoc, 'lô nguồn không đổi');
  const f = r.f;
  assert.deepStrictEqual([f.id, f.info.maRung, f.info.tuNgay, f.info.denNgay, f.info.dienTich, f.info.diaDiem, f.info.giayTo.length, f.info.muaHang.xacNhan, f.info.muaHang.congTyId], ['b', 'R-B', '', '', null, '', 0, '', 'c1']);
  assert.deepStrictEqual([f.pc.length, 'cc' in f, JSON.stringify(f.exp), 'inDot2' in f, JSON.stringify(f.doi[0].exp), f.doi[0].hinhThuc.ngayBDLD, f.doi[0].dienTich, JSON.stringify(f.hdvc[0].exp)], [0, false, '{}', false, '{}', '', null, '{}']);
  assert.deepStrictEqual([f.doi[0].hinhThuc.donGiaTan['Tổ trưởng'], f.info.vanChuyen.coDinh, f.hdvc[0].cuoc.x], [420000, 52000, 1], 'đơn giá và cước được giữ');
  assert.deepStrictEqual([f.nc[0].ten, f.nc[0].diaChi, f.nc[0].vaiTro, f.nc[0].chucDanh, f.nc[0].doiId, f.nc[0].maRung, '_nguon' in f.nc[0]], ['MỚI', 'Đại Lộc', 'Tổ trưởng', 'Tổ trưởng', 'd1', 'R-B', false], 'thông tin theo danh mục, vai trò và đội của lô nguồn');
  assert.deepStrictEqual([f.dx[0].taiXe, f.dx[0].hanGplx, f.dx[0].hdvcId, f.dx[0].maRung], ['Y', '01/01/2030', 'h1', 'R-B']);
  assert.deepStrictEqual([r.nguoi, r.xe], [1, 1]);
});

test('người chung: một CCCD = một người dù là lao động, tài xế hay đối tác; dòng mới nhất thắng, chỗ trống bù từ nguồn khác; gộp hai người giữ lịch sử và không sửa dữ liệu truyền vào', () => {
  const M = require('../src/danhmuc');
  const db = {
    dmLaoDong: [{ngayCapNhat: '01/09/2026', cccd: '049085007001', ten: 'AN', diaChi: 'Quế Sơn', ngayCap: '01/01/2021', noiCap: 'CA QN', chucVu: 'Công nhân', viTri: 'Công nhân cưa'}, {ngayCapNhat: '01/11/2026', cccd: '049085007001', ten: 'AN', diaChi: 'Đại Lộc', sdt: '0905'}],
    dmXeVC: [{ngayCapNhat: '01/10/2026', bienSo: '92C-1', taiXe: 'AN', cccdTx: '049085007001', diaChiTx: 'Thăng Bình', ngayCapTx: '02/02/2020', noiCapTx: 'CA'}, {ngayCapNhat: '01/10/2026', bienSo: '92C-2', taiXe: 'SAI', cccdTx: '049085007099', diaChiTx: 'X'}],
    dmDoiTac: [{id: 'ct:049085007001', loai: 'nguoiKyVC', ten: 'AN', cccd: '049085007001', ngaySinh: '05/05/1985'}, {id: 'dn:1', loai: 'doanhnghiep', ten: 'CTY', mst: '0400'}]};
  const n = M.timNguoi(db, '049085007001');
  assert.deepStrictEqual([n.vaiTro.join(','), n.diaChi, n.sdt, n.ngaySinh, n.noiCap], ['Lao động,Tài xế,Đối tác', 'Đại Lộc', '0905', '05/05/1985', 'CA'], 'dòng mới nhất có giá trị thắng (nơi cấp: dòng tài xế 01/10 mới hơn dòng lao động 01/09); chỗ trống bù từ nguồn khác');
  assert.strictEqual(M.nguoiChung(db).length, 2, 'doanh nghiệp không phải người');
  const truoc = JSON.stringify(db);
  assert.strictEqual(M.gopNguoi(db, '123', '049085007001').ok, false); assert.strictEqual(M.gopNguoi(db, '049085007001', '049085007001').ok, false); assert.strictEqual(M.gopNguoi(db, '049085000000', '049085007001').ok, false);
  const g = M.gopNguoi(db, '049085007099', '049085007001');
  assert.ok(g.ok); assert.strictEqual(JSON.stringify(db), truoc, 'không sửa dữ liệu truyền vào');
  assert.deepStrictEqual([g.so.xe, g.db.dmXeVC[1].cccdTx], [1, '049085007001']);
  assert.strictEqual(M.nguoiChung(Object.assign({}, db, g.db)).length, 1, 'sau gộp chỉ còn một người');
  assert.strictEqual(g.db.dmLaoDong.length, 2, 'lịch sử lao động giữ nguyên');
});
