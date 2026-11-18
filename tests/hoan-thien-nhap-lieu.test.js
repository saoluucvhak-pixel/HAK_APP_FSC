'use strict';
/* Phiếu #09: (1) ND-08 chủ rừng chọn từ Danh mục đối tượng (bản chụp, cảnh báo CCCD trùng); (2) đội “chưa có phiếu cân nào” khi phiếu đã gán hết cho đội khác: cảnh báo như phiếu #03, không đổi số in;
 * (3) bỏ ô “Điền tổng … vào Khối lượng khai thác thực tế” (khối lượng thực tế của lô lấy tự động từ tổng phiếu cân). Hàm thuần, kiểm bằng Node. */
const test = require('node:test'), assert = require('node:assert');
const fs = require('fs'), path = require('path');
const K = require('../src/kiemtranhieudoi'), PB = require('../src/phanbo'), DM = require('../src/dinhmuc'), Dates = require('../src/dates'), Doi = require('../src/doi'), DT = require('../src/doituong');

const api = K.create({db: {rs: {}}, trim: s => String(s == null ? '' : s).trim(), HAKDates: Dates, HAKDoi: Doi, HAKPhanBo: PB, isTT: r => /^tổ trưởng/i.test(r.vaiTro || ''), klPhieu: DM.tongPhieuTan, isCccd: () => true, numSwap: s => s});
const nv = (i, doiId, vai) => ({_row: i, ten: 'NGƯỜI ' + i, vaiTro: vai, doiId, cccd: '0490000000' + (10 + i)});
const rec = (pc, extra) => Object.assign({info: {_klPC: 30, dienTich: 2}, doi: [{id: 'd1', ten: 'Đội 1'}, {id: 'd2', ten: 'Đội 2'}], phanBo: {cheDo: 'theoPhieu'},
  nc: [nv(1, 'd1', 'Tổ trưởng'), nv(2, 'd1', 'Công nhân'), nv(3, 'd1', 'Công nhân'), nv(4, 'd2', 'Tổ trưởng')], pc}, extra || {});
const P = (so, kl, doiId) => ({soPhieu: so, ngay: '05/10/2026', bienSo: '92C-12345', kl, doiId});

test('đội chưa có phiếu cân nào (phiếu đã gán hết cho đội khác): có cảnh báo nêu tên đội; số in vẫn chia theo số người, không đổi', () => {
  const b = api.doiOf(rec([P('P1', 10, 'd1'), P('P2', 20, 'd1')]));
  assert.deepStrictEqual(b.doi.map(d => d.khoiLuong), [22.5, 7.5], 'số in không đổi');
  assert.strictEqual(b.klNguon, 'songuoi'); assert.strictEqual(PB.chuaGanXuat(b), null, 'không còn phiếu chưa gán: hộp #03 không áp dụng');
  const c = PB.chuaPhieuXuat(b); assert.ok(c, 'phải có cảnh báo');
  assert.deepStrictEqual(c.doi, ['Đội 2']); assert.deepStrictEqual(c.chia.map(x => [x.ten, x.tan]), [['Đội 1', 22.5], ['Đội 2', 7.5]]);
  assert.match(PB.chuaPhieuDong(c), /Đội 2/); assert.match(PB.chuaPhieuDong(c), /chưa có phiếu cân nào/); assert.strictEqual(PB.chuaPhieuDong(null), '');
});
test('không cảnh báo đội chưa có phiếu khi: mỗi đội đều có phiếu; còn phiếu chưa gán (hộp #03 lo); chia đều; một đội; chưa có phiếu', () => {
  assert.strictEqual(PB.chuaPhieuXuat(api.doiOf(rec([P('P1', 10, 'd1'), P('P2', 20, 'd2')]))), null, 'mỗi đội một phiếu');
  const dg = api.doiOf(rec([P('P1', 10, 'd1'), P('P2', 20)])); assert.ok(PB.chuaGanXuat(dg), 'còn phiếu chưa gán'); assert.strictEqual(PB.chuaPhieuXuat(dg), null, 'không hiện hai hộp');
  assert.strictEqual(PB.chuaPhieuXuat(api.doiOf(rec([P('P1', 10, 'd1'), P('P2', 20, 'd1')], {phanBo: {cheDo: 'chiaDeu'}}))), null, 'chia đều');
  assert.strictEqual(PB.chuaPhieuXuat(api.doiOf(rec([P('P1', 10, 'd1')], {doi: [{id: 'd1', ten: 'Đội 1'}], nc: [nv(1, 'd1', 'Tổ trưởng'), nv(2, 'd1', 'Công nhân')]}))), null, 'một đội');
  assert.strictEqual(PB.chuaPhieuXuat(api.doiOf(rec([]))), null); assert.strictEqual(PB.chuaPhieuXuat(null), null);
});
test('hàm cảnh báo đội chưa có phiếu không sửa dữ liệu, không đổi số in (gọi nhiều lần như nhau)', () => {
  const r = rec([P('P1', 10, 'd1'), P('P2', 20, 'd1')]), truoc = JSON.stringify(r), a = api.doiOf(r).doi.map(d => d.khoiLuong);
  PB.chuaPhieuXuat(api.doiOf(r)); PB.chuaPhieuXuat(api.doiOf(r)); assert.deepStrictEqual(api.doiOf(r).doi.map(d => d.khoiLuong), a); assert.strictEqual(JSON.stringify(r), truoc);
});

const dm = () => DT.luu([], {ten: 'TRẦN CHỦ RỪNG', loai: 'thenhan', diaChi: 'Quảng Nam', nguoi: [{hoTen: 'TRẦN CHỦ RỪNG', cccd: '049090001234', ngayCap: '01/02/2021', noiCap: 'CA Quảng Nam', diaChi: 'Duy Xuyên', gioiTinh: 'Nam', vaiTro: {nhanCong: true}},
  {hoTen: 'LÊ THỊ NGỪNG', cccd: '049090004321', gioiTinh: 'Nữ', ngung: true}]}, '18/11/2026').dm;
test('ND-08: chọn người từ Danh mục đối tượng điền sẵn họ tên, danh xưng, CCCD, ngày cấp, nơi cấp, địa chỉ và ghi id người đã chọn', () => {
  const d = dm(), id = d[0].nguoi[0].id, c = DT.chupChuRung(d, id);
  assert.deepStrictEqual([c.nguoiDmId, c.danhXung, c.ten, c.cccd, c.ngayCap, c.noiCap, c.diaChi], [id, 'Ông', 'TRẦN CHỦ RỪNG', '049090001234', '01/02/2021', 'CA Quảng Nam', 'Duy Xuyên']);
  assert.strictEqual(DT.chupChuRung(d, 'khong-co'), null);
  const bi = DT.chupChuRung(DT.luu(d, Object.assign({}, d[0], {nguoi: [Object.assign({}, d[0].nguoi[0], {diaChi: '', gioiTinh: 'Nữ'})]}), '19/11/2026').dm, id); assert.strictEqual(bi.diaChi, 'Quảng Nam', 'người không có địa chỉ: lấy địa chỉ hồ sơ'); assert.strictEqual(bi.danhXung, 'Bà');
});
test('ND-08: bản chụp — sửa danh mục sau không làm đổi thông tin đã chụp; danh sách chọn bỏ người ngừng', () => {
  const d = dm(), c = DT.chupChuRung(d, d[0].nguoi[0].id), chup = JSON.stringify(c);
  const sua = DT.luu(d, Object.assign({}, d[0], {nguoi: [Object.assign({}, d[0].nguoi[0], {hoTen: 'TÊN MỚI', cccd: '049090009999'}), d[0].nguoi[1]]}), '19/11/2026').dm;
  assert.strictEqual(JSON.stringify(c), chup, 'bản chụp đã lấy không đổi'); assert.strictEqual(DT.chupChuRung(sua, d[0].nguoi[0].id).ten, 'TÊN MỚI', 'lần chọn sau lấy thông tin mới');
  const L = DT.nguoiChonChuRung(d); assert.strictEqual(L.length, 1); assert.match(L[0].nhan, /TRẦN CHỦ RỪNG/); assert.match(L[0].nhan, /049090001234/);
});
test('ND-08: CCCD nhập tay trùng người của danh mục → cảnh báo (không chặn); người đã chọn ở ô chọn thì không cảnh báo', () => {
  const d = dm(), id = d[0].nguoi[0].id;
  assert.ok(DT.trungDanhMuc(d, '049090001234', ''), 'nhập tay trùng'); assert.ok(DT.trungDanhMuc(d, '049 090.001234', ''), 'bỏ khoảng trắng, dấu chấm');
  assert.strictEqual(DT.trungDanhMuc(d, '049090001234', id), null, 'đã chọn đúng người này'); assert.strictEqual(DT.trungDanhMuc(d, '049090007777', ''), null, 'CCCD khác'); assert.strictEqual(DT.trungDanhMuc(d, '', ''), null);
});
test('ô “Điền tổng … tấn vào Khối lượng khai thác thực tế” đã bỏ (ô không làm gì); xuất hiện ở ui/app không còn data-lkkl', () => {
  const dir = path.join(__dirname, '..', 'ui', 'app');
  for (const f of fs.readdirSync(dir)) assert.ok(!/data-lkkl|'lkkl' in sel/.test(fs.readFileSync(path.join(dir, f), 'utf8')), f);
});
