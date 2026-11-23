'use strict';
/* Bản 3.0 — lõi thuần: BKS và định danh phiếu (src/bks.js), phân bổ khối lượng (src/phanbo.js), vị trí có ID (src/vitri.js),
 * danh mục đối tượng (src/doituong.js), danh mục xe (src/xedm.js). */
const test = require('node:test'), assert = require('node:assert/strict');
const B = require('../src/bks'), PB = require('../src/phanbo'), VT = require('../src/vitri'), DT = require('../src/doituong'), XE = require('../src/xedm');
const clone = x => JSON.parse(JSON.stringify(x));

test('BKS: khóa so khớp bỏ hoa thường, khoảng trắng, dấu chấm, gạch; BKS nguồn giữ nguyên', () => {
  assert.equal(B.khoa('77C-123.45'), B.khoa('77c 12345')); assert.equal(B.khoa('77C-123.45'), '77C12345'); assert.equal(B.khoa(''), '');
});
test('BKS: chỉ tự chọn xe khi khớp DUY NHẤT trong hợp đồng; thiếu / không khớp / nhiều dòng có lý do và nơi đang có xe', () => {
  const xe = [{id: 'x1', bienSo: '77C-123.45'}, {id: 'x2', bienSo: '77C-999.99'}];
  assert.equal(B.chonXe(xe, '77c 12345').xe.id, 'x1');
  assert.equal(B.chonXe(xe, '').ma, 'thieu-bks');
  assert.equal(B.chonXe(xe.concat({id: 'x3', bienSo: '77C12345'}), '77C-123.45').ma, 'nhieu');
  const r = B.chonXe(xe, '92C-000.01', {khac: [{hdId: 'hd2', hdTen: 'HĐ 02', bienSo: '92C00001'}], danhMuc: [{bks: '92C-000.01'}]});
  assert.equal(r.ma, 'khong-khop'); assert.match(r.lyDo, /HĐ 02/); assert.match(r.lyDo, /Danh mục xe/);
});
test('Phiếu: khóa nghiệp vụ = số phiếu + ngày (1/11 và 01/11 cùng ngày); không theo BKS; thiếu số hoặc ngày thì không có khóa', () => {
  assert.equal(B.khoaPhieu({soPhieu: ' p 01 ', ngay: '1/11/2026', bienSo: 'A'}), B.khoaPhieu({soPhieu: 'P01', ngay: '01/11/2026', bienSo: 'B'}));
  assert.equal(B.khoaPhieu({soPhieu: 'P01', ngay: '31/11/2026'}), ''); assert.equal(B.khoaPhieu({ngay: '01/11/2026'}), '');
  const rung = [{id: 'a', soPhieu: 'P01', ngay: '01/11/2026', hdvcId: 'hd1'}, {id: 'b', soPhieu: 'P02', ngay: '02/11/2026', nguonId: 'gs:9'}];
  assert.deepEqual(B.phieuDaCo(rung, {soPhieu: 'p01', ngay: '1/11/2026', bienSo: 'đổi biển'}).map(p => p.id), ['a']);
  assert.deepEqual(B.phieuDaCo(rung, {nguonId: 'gs:9'}).map(p => p.id), ['b']);
});

const P = (kg, doiId) => ({kl: kg / 1000, doiId});
test('Phân bổ: một đội nhận toàn bộ 100 tấn', () => {
  const t = PB.tinh({doi: [{id: 'd1'}], pc: [P(60000), P(40000)]});
  assert.equal(t.cheDo, 'motDoi'); assert.equal(t.doi[0].tan, 100); assert.equal(t.chuaGan, 0);
});
test('Phân bổ: hai đội theo phiếu 60 / 40; phiếu chưa gán hiện riêng; chia đều 50 / 50', () => {
  const f = {doi: [{id: 'd1'}, {id: 'd2'}], pc: [P(60000, 'd1'), P(40000, 'd2')]};
  let t = PB.tinh(f); assert.equal(t.cheDo, 'theoPhieu'); assert.deepEqual(t.doi.map(d => d.tan), [60, 40]);
  f.pc.push(P(1500, '')); t = PB.tinh(f); assert.equal(t.chuaGan, 1.5); assert.equal(t.chuaGanPhieu, 1);
  t = PB.tinh({doi: f.doi, pc: [P(60000, 'd1'), P(40000, 'd2')], phanBo: {cheDo: 'chiaDeu'}}); assert.equal(t.cheDo, 'chiaDeu'); assert.deepEqual(t.doi.map(d => d.tan), [50, 50]);
});
test('Phân bổ chia đều: tổng lẻ 1 kg → đội đứng trước nhận 1 kg dư; tổng luôn khớp', () => {
  const t = PB.tinh({doi: [{id: 'd1'}, {id: 'd2'}], pc: [P(100001)], phanBo: {cheDo: 'chiaDeu'}});
  assert.deepEqual(t.doi.map(d => d.kg), [50001, 50000]); assert.equal(t.doi[0].kg + t.doi[1].kg, t.tongKg);
});
test('Phân bổ: từ ba đội luôn theo phiếu (chia đều không áp dụng)', () => {
  assert.equal(PB.tinh({doi: [{id: 'a'}, {id: 'b'}, {id: 'c'}], pc: [P(9000, 'a')], phanBo: {cheDo: 'chiaDeu'}}).cheDo, 'theoPhieu');
});

const dbVT = () => ({dinhBien: [{chucDanh: 'Tổ trưởng', soNguoi: 1}, {chucDanh: 'Công nhân cưa', soNguoi: 2}], dinhBienVer: [{tuNgay: '01/01/2027', rows: [{chucDanh: 'Công nhân cưa', soNguoi: 3}]}],
  dinhMuc: {'Công nhân cưa': {qa: 2}}, dinhMucBan: [{tuNgay: '01/01/2027', dm: {'Công nhân cưa': {qa: 3}}}],
  rs: {o: {forests: {
    f1: {nc: [{ten: 'A', chucDanh: 'Công nhân cưa'}], doi: [{hinhThuc: {donGiaTan: {'Tổ trưởng': 1, 'Công nhân cưa': 2}}}]},
    f2: {chot: {at: 't'}, nc: [{ten: 'B', chucDanh: 'Công nhân cưa'}], doi: [{hinhThuc: {donGiaTan: {'Công nhân cưa': 2}}}]}}}}});
test('Vị trí: dựng danh mục có ID từ mọi tên đang dùng; chạy lại giữ ID, không thêm trùng', () => {
  const db = dbVT(); db.dmViTri = VT.dung(db); assert.deepEqual(db.dmViTri.map(x => x.ten), ['Tổ trưởng', 'Công nhân cưa']);
  assert.deepEqual(VT.dung(db), db.dmViTri);
  assert.equal(VT.tim(db.dmViTri, 'cong nhan CUA').id, db.dmViTri[1].id);
});
test('Vị trí: đổi tên giữ liên kết định biên, định mức BHLĐ, đơn giá, nhân công; lô đã chốt giữ tên đã áp dụng', () => {
  const db = dbVT(); db.dmViTri = VT.dung(db); const id = VT.tim(db.dmViTri, 'Công nhân cưa').id;
  const r = VT.doiTen(db, id, 'Thợ cưa');
  // có lô đã chốt dùng tên cũ: định biên / định mức BHLĐ dùng chung GIỮ mục tên cũ (in lại lô chốt) và thêm bản sao tên mới
  assert.ok(r.ok); assert.ok(r.so.giuTenCu);
  assert.deepEqual(db.dinhBien.map(x => x.chucDanh).filter(x => /cưa/.test(x)), ['Công nhân cưa', 'Thợ cưa']); assert.deepEqual(db.dinhBienVer[0].rows.map(x => x.chucDanh).filter(x => /cưa/.test(x)), ['Công nhân cưa', 'Thợ cưa']);
  assert.deepEqual(db.dinhMuc, {'Công nhân cưa': {qa: 2}, 'Thợ cưa': {qa: 2}}); assert.deepEqual(db.dinhMucBan[0].dm, {'Công nhân cưa': {qa: 3}, 'Thợ cưa': {qa: 3}});
  const f1 = db.rs.o.forests.f1, f2 = db.rs.o.forests.f2;
  assert.deepEqual(Object.keys(f1.doi[0].hinhThuc.donGiaTan), ['Tổ trưởng', 'Thợ cưa'], 'giữ thứ tự khóa');
  assert.equal(f1.nc[0].chucDanh, 'Thợ cưa'); assert.equal(f1.nc[0].viTriId, id);
  assert.equal(f2.nc[0].chucDanh, 'Công nhân cưa'); assert.ok(f2.doi[0].hinhThuc.donGiaTan['Công nhân cưa']); assert.equal(r.so.loKhoa, 1);
  assert.equal(VT.doiTen(db, id, 'Tổ trưởng').ok, false, 'không trùng tên vị trí khác');
});
test('Vị trí: không có lô đã chốt dùng tên cũ → đổi khóa định biên, định mức BHLĐ (không để lại mục tên cũ)', () => {
  const db = dbVT(); delete db.rs.o.forests.f2; db.dmViTri = VT.dung(db); const id = VT.tim(db.dmViTri, 'Công nhân cưa').id;
  const r = VT.doiTen(db, id, 'Thợ cưa');
  assert.ok(r.ok && !r.so.giuTenCu); assert.equal(db.dinhBien[1].chucDanh, 'Thợ cưa'); assert.equal(db.dinhBienVer[0].rows[0].chucDanh, 'Thợ cưa');
  assert.deepEqual(db.dinhMuc, {'Thợ cưa': {qa: 2}}); assert.deepEqual(db.dinhMucBan[0].dm, {'Thợ cưa': {qa: 3}});
});

const nguoi = (o) => Object.assign({hoTen: 'NGƯỜI', cccd: '', vaiTro: {}, kyHD: {}}, o);
test('Đối tượng: một người nhiều vai trò dùng cùng hồ sơ; xuất hiện ở cả bộ chọn Tài xế và Chủ xe', () => {
  let r = DT.luu([], {ten: 'LÊ VĂN XE', loai: 'thenhan', nguoi: [nguoi({hoTen: 'LÊ VĂN XE', cccd: '049000000077', gplx: '790123', vaiTro: {taiXe: true, chuXe: true}})]});
  assert.ok(r.ok, r.errs.join()); const dm = r.dm;
  assert.deepEqual(DT.nguoiTheoVaiTro(dm, 'taiXe').map(x => x.ng.cccd), ['049000000077']);
  assert.deepEqual(DT.nguoiTheoVaiTro(dm, 'chuXe').map(x => x.ng.cccd), ['049000000077']);
  assert.equal(DT.nguoiTheoVaiTro(dm, 'taiXe')[0].nhan, 'LÊ VĂN XE', 'tên đối tượng trùng họ tên: hiện một lần');
  assert.match(dm[0].ma, /^DT\d{4}$/); assert.equal(typeof dm[0].nguoi[0].cccd, 'string');
});
test('Đối tượng: CCCD không trùng giữa các hồ sơ; MST 10/13 số; pháp nhân có quyền ký phải có người đại diện', () => {
  let dm = DT.luu([], {ten: 'A', loai: 'thenhan', nguoi: [nguoi({hoTen: 'A', cccd: '049000000001'})]}).dm;
  assert.match(DT.luu(dm, {ten: 'B', loai: 'thenhan', nguoi: [nguoi({hoTen: 'B', cccd: '049 000 000 001'})]}).errs.join(), /đã có ở hồ sơ “A”/);
  assert.match(DT.luu(dm, {ten: 'C', loai: 'phapnhan', mst: '12345', kyHD: {vanChuyen: true}}).errs.join(), /10 hoặc 13 chữ số.*người đại diện|người đại diện.*10 hoặc 13/);
  assert.ok(DT.luu(dm, {ten: 'C', loai: 'phapnhan', mst: '0401234567', kyHD: {vanChuyen: true}, daiDien: 'ÔNG B', chucVuDaiDien: 'Giám đốc'}).ok);
  assert.match(DT.luu(dm, {ten: 'D', loai: 'thenhan', nguoi: []}).errs.join(), /ít nhất một người/);
  assert.match(DT.luu(dm, {ten: 'E', loai: 'thenhan', nguoi: [nguoi({hoTen: 'E', vaiTro: {taiXe: true}})]}).errs.join(), /giấy phép lái xe/);
});
test('Đối tượng: bên ký theo loại hợp đồng — pháp nhân qua đại diện, thể nhân theo người có quyền ký; nhãn rõ đối tượng và họ tên', () => {
  let dm = DT.luu([], {ten: 'CÔNG TY VT A', loai: 'phapnhan', mst: '0401234567', kyHD: {vanChuyen: true}, daiDien: 'ÔNG B', chucVuDaiDien: 'Giám đốc'}).dm;
  dm = DT.luu(dm, {ten: 'TỔ KHAI THÁC SƠN', loai: 'thenhan', kyHD: {}, nguoi: [nguoi({hoTen: 'TRẦN SƠN', cccd: '049000000002', kyHD: {nhanCong: true}, vaiTro: {nhanCong: true}}), nguoi({hoTen: 'LÊ PHÚ', cccd: '049000000003', vaiTro: {nhanCong: true}})]}).dm;
  assert.deepEqual(DT.benKy(dm, 'vanChuyen').map(x => x.nhan), ['CÔNG TY VT A (đại diện: ÔNG B, Giám đốc)']);
  assert.deepEqual(DT.benKy(dm, 'nhanCong').map(x => x.nhan), ['TỔ KHAI THÁC SƠN — TRẦN SƠN']);
  assert.deepEqual(DT.nguoiTheoVaiTro(dm, 'nhanCong').map(x => x.nhan), ['TỔ KHAI THÁC SƠN — LÊ PHÚ', 'TỔ KHAI THÁC SƠN — TRẦN SƠN']);
  assert.deepEqual(DT.loc(dm, 'doitac').map(x => x.ten).sort(), ['CÔNG TY VT A', 'TỔ KHAI THÁC SƠN']);
  assert.deepEqual(DT.loc(dm, 'nhancong', 'phu').map(x => x.ten), ['TỔ KHAI THÁC SƠN']);
  dm = DT.ngung(dm, dm[0].id).dm; assert.deepEqual(DT.benKy(dm, 'vanChuyen'), []); assert.deepEqual(DT.loc(dm, 'ngung').map(x => x.ten), ['CÔNG TY VT A']);
});
test('Đối tượng: nhập Excel — gộp dòng theo mã, mới / trùng / thay đổi / lỗi, mã định danh giữ dạng văn bản (số 0 đầu)', () => {
  let dm = DT.luu([], {ma: 'DT0001', ten: 'LÊ VĂN XE', loai: 'thenhan', nguoi: [nguoi({hoTen: 'LÊ VĂN XE', cccd: '049000000077', gplx: '790', vaiTro: {taiXe: true}})]}).dm;
  const rows = [
    {'Mã đối tượng': 'DT0001', 'Tên đối tượng': 'LÊ VĂN XE', 'Loại': 'Thể nhân', 'Họ tên': 'LÊ VĂN XE', 'CCCD': '049000000077', 'Số GPLX': '790', 'Vai trò': 'Tài xế, Chủ xe'},
    {'Mã đối tượng': 'DT0009', 'Tên đối tượng': 'TỔ SƠN', 'Loại': 'Thể nhân', 'Họ tên': 'TRẦN SƠN', 'CCCD': '049000000002', 'Vai trò': 'Nhân công', 'Người ký': 'x', 'Ký hợp đồng': 'Nhân công'},
    {'Mã đối tượng': 'DT0009', 'Tên đối tượng': 'TỔ SƠN', 'Loại': 'Thể nhân', 'Họ tên': 'LÊ PHÚ', 'CCCD': '049000000003', 'Vai trò': 'Nhân công'},
    {'Tên đối tượng': 'CÔNG TY B', 'Loại': 'Pháp nhân', 'Mã số thuế': '0401234567', 'Ký hợp đồng': 'Vận chuyển'},
    {'Tên đối tượng': 'SAI', 'Loại': 'Thể nhân', 'Họ tên': 'SAI', 'CCCD': '049000000077'}];
  const x = DT.docExcel(rows, dm, []), tt = x.doiTuong.map(m => m.dt.ten + ':' + m.trangThai);
  assert.deepEqual(tt, ['LÊ VĂN XE:doi', 'TỔ SƠN:moi', 'CÔNG TY B:loi', 'SAI:loi'], JSON.stringify(x.doiTuong.map(m => m.loi)));
  assert.equal(x.doiTuong[1].dt.nguoi.length, 2); assert.equal(x.doiTuong[1].dt.nguoi[0].cccd, '049000000002');
  const a = DT.apDungExcel(dm, x.doiTuong); assert.equal(a.them, 1); assert.equal(a.sua, 1);
  assert.deepEqual(a.dm[0].nguoi[0].vaiTro, {nhanCong: false, taiXe: true, chuXe: true});
  assert.deepEqual(DT.docExcel(rows.slice(0, 1), a.dm, []).doiTuong.map(m => m.trangThai), ['trung']);
});
test('Đối tượng: chuyển từ danh mục cũ — gộp vai trò theo CCCD, doanh nghiệp thành pháp nhân, thiếu CCCD vào Cần đối chiếu; chạy lại không thêm', () => {
  const vt = [{id: 'vt1', ten: 'Công nhân cưa'}];
  const db = {dmLaoDong: [{ngayCapNhat: '01/01/2026', cccd: '049000000077', ten: 'LÊ VĂN XE', viTri: 'Công nhân cưa', chucVu: 'Công nhân'}, {cccd: '', ten: 'KHÔNG CCCD'}],
    dmXeVC: [{ngayCapNhat: '02/01/2026', bienSo: '92C-12345', chuXe: 'LÊ VĂN XE', cccd: '049000000077', taiXe: 'LÊ VĂN XE', cccdTx: '049000000077', gplx: '790'}, {bienSo: '92C-1', taiXe: 'TÀI XẾ KHÔNG SỐ'}],
    dmDoiTac: [{id: 'dn:dv1', loai: 'doanhnghiep', ten: 'CÔNG TY VT A', mst: '0401234567', daiDien: 'ÔNG B', chucVu: 'GĐ'}]};
  const r = DT.tuDanhMucCu(db, vt);
  const p = r.dm.find(o => o.loai === 'thenhan'); assert.deepEqual(p.nguoi[0].vaiTro, {nhanCong: true, taiXe: true, chuXe: true}); assert.equal(p.nguoi[0].viTriId, 'vt1'); assert.equal(p.nguoi[0].gplx, '790');
  const pn = r.dm.find(o => o.loai === 'phapnhan'); assert.equal(pn.nguonCu, 'dn:dv1'); assert.ok(pn.kyHD.vanChuyen); assert.equal(DT.timTuDoiTacCu(r.dm, 'dn:dv1').id, pn.id);
  assert.equal(r.canDoiChieu.length, 2); assert.match(r.canDoiChieu.map(c => c.lyDo).join('|'), /KHÔNG CCCD.*TÀI XẾ KHÔNG SỐ|TÀI XẾ KHÔNG SỐ.*KHÔNG CCCD/);
  assert.deepEqual(DT.tuDanhMucCu(db, vt, r.dm).dm, r.dm, 'chạy lại không đổi');
});

test('Xe: chủ xe theo ID (người có chức vụ Chủ xe hoặc pháp nhân); BKS không trùng; ngày hợp lệ', () => {
  let dm = DT.luu([], {ten: 'LÊ VĂN XE', loai: 'thenhan', nguoi: [nguoi({hoTen: 'LÊ VĂN XE', cccd: '049000000077', vaiTro: {chuXe: true}})]}).dm;
  dm = DT.luu(dm, {ten: 'PHẠM CÔNG', loai: 'thenhan', nguoi: [nguoi({hoTen: 'PHẠM CÔNG', cccd: '049000000005', vaiTro: {nhanCong: true}})]}).dm;
  const ng = dm[0].nguoi[0].id, kc = dm[1].nguoi[0].id;
  assert.deepEqual(XE.chonChuXe(dm).map(x => x.id), [ng]);
  let x = XE.luu([], {bks: '77c-123.45', chuXeId: ng, hanKiemDinh: '31/12/2026'}, dm); assert.ok(x.ok); assert.equal(x.xe.bks, '77C-123.45');
  assert.match(XE.luu(x.dm, {bks: '77C 12345'}, dm).errs.join(), /đã có/);
  assert.match(XE.luu([], {bks: 'A', chuXeId: kc}, dm).errs.join(), /chưa có chức vụ Chủ xe/);
  assert.match(XE.luu([], {bks: 'A', hanBaoHiem: '30/02/2026'}, dm).errs.join(), /không phải ngày có thật/);
  assert.deepEqual(XE.hetHan(x.xe, '01/01/2027'), ['kiểm định']);
});
test('Xe: nhập Excel — xem trước mới / trùng / đổi (khác chủ xe hiện cả hai) / lỗi; lưu xong có trong danh mục', () => {
  let dm = DT.luu([], {ten: 'LÊ VĂN XE', loai: 'thenhan', nguoi: [nguoi({hoTen: 'LÊ VĂN XE', cccd: '049000000077', vaiTro: {chuXe: true}})]}).dm;
  dm = DT.luu(dm, {ten: 'CÔNG TY VT A', loai: 'phapnhan', mst: '0401234567'}).dm;
  let xe = XE.luu([], {bks: '92C-12345', chuXeId: dm[0].nguoi[0].id, loaiXe: 'Tải'}, dm).dm;
  const rows = [{'Số BKS': '92c 12345', 'Loại xe': 'Tải', 'CCCD / MST chủ xe': '0401234567'}, {'Số BKS': '92C-12345', 'Loại xe': 'Tải'}, {'Số BKS': '77C-999.99', 'Chủ xe': 'LÊ VĂN XE'}, {'Số BKS': '1', 'Chủ xe': 'AI ĐÓ'}];
  const p = XE.docExcel(rows, xe, dm);
  assert.deepEqual(p.dong.map(d => d.trangThai), ['doi', 'loi', 'moi', 'loi']);
  assert.ok(p.dong[0].khacChuXe); assert.match(p.dong[0].chuXeCu, /LÊ VĂN XE/); assert.match(p.dong[0].chuXeMoi, /CÔNG TY VT A/);
  assert.match(p.dong[1].loi.join(), /trùng với dòng 2/); assert.match(p.dong[3].loi.join(), /chưa có trong Danh mục đối tượng/);
  const a = XE.apDungExcel(xe, p.dong, dm); assert.equal(a.them, 1); assert.equal(a.sua, 1); assert.ok(XE.timBks(a.dm, '77C99999'));
});
test('Xe: chuyển từ danh mục xe cũ — mỗi BKS một xe theo dòng mới nhất, chủ xe theo CCCD; không xác định được thì Cần đối chiếu', () => {
  const dm = DT.luu([], {ten: 'LÊ VĂN XE', loai: 'thenhan', nguoi: [nguoi({hoTen: 'LÊ VĂN XE', cccd: '049000000077', vaiTro: {chuXe: true}})]}).dm;
  const cu = [{ngayCapNhat: '01/01/2026', bienSo: '92C-12345', cccd: '049000000077', chuXe: 'LÊ VĂN XE', hanDangKiem: '01/06/2026'}, {ngayCapNhat: '01/03/2026', bienSo: '92c 12345', cccd: '049000000077', chuXe: 'LÊ VĂN XE', hanDangKiem: '01/06/2027'}, {bienSo: '77C-1', chuXe: 'KHÔNG SỐ'}];
  const r = XE.tuDanhMucCu(cu, dm);
  assert.equal(r.dm.length, 2); assert.equal(r.dm[0].hanKiemDinh, '01/06/2027'); assert.equal(r.dm[0].chuXeId, dm[0].nguoi[0].id);
  assert.equal(r.canDoiChieu.length, 1); assert.deepEqual(XE.tuDanhMucCu(cu, dm, r.dm).dm, r.dm);
});
