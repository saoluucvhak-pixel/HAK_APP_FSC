'use strict';
/* PR D bước 3: báo cáo chất lượng Google Sheet — CHỈ SỐ ĐẾM. Dữ liệu GIẢ LẬP (CCCD 0490000000xx, tên "giả lập").
 * TEST BẢO MẬT BẮT BUỘC: bảng xuất không chứa bất kỳ chuỗi giả lập nào đã đưa vào (CCCD, tên, địa chỉ, mã hợp đồng, số phiếu, biển số, mã rừng, khóa). */
const test = require('node:test'), assert = require('node:assert/strict');
const XLSX = require('xlsx');
const {Store} = require('../src/store');
const {Lookup} = require('../src/lookup');
const CL = require('../src/chatluong');

const H_KEO = ['Mã khách hàng', 'Mã hợp đồng', 'SỐ PHIẾU CÂN', 'Ngày nhập', 'Biển số 1', 'KL hàng (KG)', 'Đơn giá', 'Họ và tên chủ rừng'];
const H_RUNG = ['Mã KH_CCCD', 'Họ và tên chủ rừng', 'Mã hợp đồng', 'Ngày ký hợp đồng', 'ĐỊA CHỈ RỪNG', 'HECTA', 'Định mức tấn/Ha'];
const H_TD = ['Mã rừng', 'Số hợp đồng', 'HoVaTenChuRung', 'SoCCCD', 'DiaChiRungTrong', 'DienTich_m2', 'Latitude_Vĩ độ', 'Longtitude_Kinh độ', 'ID_GPS'];
const sheet = (h, rows) => XLSX.utils.aoa_to_sheet([h].concat(rows.map(r => h.map(c => r[c] === undefined ? null : r[c]))));
function fresh(keo, rung, td, nap) {
  const w = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(w, sheet(H_KEO, keo), 'HoSoKeo'); XLSX.utils.book_append_sheet(w, sheet(H_RUNG, rung), 'HoSoRung'); XLSX.utils.book_append_sheet(w, sheet(H_TD, td), 'ToaDoRung');
  const store = new Store(':memory:'); if (nap) store.save(nap);   // nap: dữ liệu lô ĐÃ CÓ trong ứng dụng (để so “nghi đổi số”)
  const L = new Lookup(store), r = L.load(XLSX.write(w, {type: 'buffer', bookType: 'xlsx'}), 'excel', 'gia_lap.xlsx'); assert.ok(r.ok, JSON.stringify(r.errors)); return L;
}
const CC1 = '049000000011', CC2 = '049000000022', CC3 = '049000000033';
const SECRETS = [CC1, CC2, CC3, 'Chủ Giả Lập Một', 'Chủ Giả Lập Hai', 'Xã Giả Lập', 'HD-GL-0001', 'HD-GL-0002', 'HD-GL-0003', 'PC-GL-001', 'PC-GL-002', 'PC-GL-003', 'OLD-001', 'OLD-002', '43C-111.11', '43C-222.22', 'R-GL-01', 'giả lập'];
function duLieu(nap, bienDau = '43C-111.11') {
  const rung = [
    {'Mã KH_CCCD': CC1, 'Họ và tên chủ rừng': 'Chủ Giả Lập Một', 'Mã hợp đồng': 'HD-GL-0001', 'Ngày ký hợp đồng': '05/10/2026', 'ĐỊA CHỈ RỪNG': 'Xã Giả Lập', 'HECTA': 1, 'Định mức tấn/Ha': 90},
    {'Mã KH_CCCD': CC2, 'Họ và tên chủ rừng': 'Chủ Giả Lập Hai', 'Mã hợp đồng': 'HD-GL-0002', 'Ngày ký hợp đồng': '05/10/2026', 'ĐỊA CHỈ RỪNG': 'Xã Giả Lập', 'HECTA': 1, 'Định mức tấn/Ha': 90},
    {'Mã KH_CCCD': CC3, 'Họ và tên chủ rừng': 'Chủ Giả Lập Hai', 'Mã hợp đồng': 'HD-GL-0002', 'Ngày ký hợp đồng': '05/10/2026', 'ĐỊA CHỈ RỪNG': 'Xã Giả Lập', 'HECTA': 1, 'Định mức tấn/Ha': 90}];   // HD-0002 có hai CCCD
  const td = [{'Mã rừng': 'R-GL-01', 'Số hợp đồng': 'HD-GL-0001', 'HoVaTenChuRung': 'Chủ Giả Lập Một', 'SoCCCD': CC1, 'DienTich_m2': 10000, 'Latitude_Vĩ độ': 15.6, 'Longtitude_Kinh độ': 108.1}];
  const k = (c, hd, so, ngay, bks, kg) => ({'Mã khách hàng': c, 'Mã hợp đồng': hd, 'SỐ PHIẾU CÂN': so, 'Ngày nhập': ngay, 'Biển số 1': bks, 'KL hàng (KG)': kg, 'Đơn giá': 1, 'Họ và tên chủ rừng': 'Chủ Giả Lập Một'});
  const keo = [k(CC1, 'HD-GL-0001', 'PC-GL-001', '06/11/2026', bienDau, 20000), k(CC1, 'HD-GL-0001', 'PC-GL-002', '06/11/2026', '43C-111.11', 20000),   // nghi đổi số (cùng ngày, biển, kg)
    k(CC1, 'HD-GL-0001', 'PC-GL-003', '99/99/9999', '', 18000), k(CC1, 'HD-GL-0001', 'PC-GL-001', '06/11/2026', '43C-222.22', 17000)];   // ngày lỗi + thiếu biển (dòng 3); trùng khóa số phiếu + ngày với dòng 1 (dòng 4)
  return fresh(keo, rung, td, nap);
}
/* lô đã có trong ứng dụng với mã rừng R-GL-01 (cùng mã rừng ở ToaDoRung của Sheet) và các phiếu đã lưu */
const loCo = pc => ({v: 2, rs: {oGL: {id: 'oGL', info: {ma: 'CR-GL', ten: 'Chủ Giả Lập Một', cccd: CC1}, forests: {fGL: {id: 'fGL', info: {maRung: 'R-GL-01', tenRung: 'Lô giả lập'}, nc: [], dx: [], pc}}}}});

test('chatLuong: đếm đúng các chỉ số trên dữ liệu giả lập', () => {
  const r = duLieu().chatLuong(); assert.equal(r.ok, true);
  const s = r.so;
  assert.equal(s.hopDong, 2); assert.equal(s.hdNhieuCccd, 1); assert.equal(s.hdLoi, 1, 'HD-0002 nhiều CCCD → Lỗi');
  assert.equal(s.hdDu + s.hdCanXem + s.hdLoi, 2);
  assert.equal(s.phieu, 4); assert.equal(s.phieuNgayLoi, 1); assert.equal(s.phieuThieuBienSo, 1);
  assert.equal(s.phieuNghiDoiSo, 0, 'ứng dụng chưa có phiếu nào của lô này để so → không có phiếu nghi đổi số'); assert.equal(s.capTrungKhoa, 1);
  assert.equal(s.dongHoSoRung, 3); assert.equal(s.dongToaDoRung, 1); assert.equal(s.dongHoSoKeo, 4);
  assert.ok(Number.isInteger(s.thoiGianMs) && s.thoiGianMs >= 0);
});
test('BẢO MẬT: bảng và đối tượng xuất KHÔNG chứa chuỗi giả lập nào (CCCD, tên, địa chỉ, mã hợp đồng, số phiếu, biển số, mã rừng)', () => {
  const r = duLieu().chatLuong(), tat = JSON.stringify(r) + '\n' + r.bang;
  SECRETS.forEach(x => assert.ok(!tat.toLowerCase().includes(x.toLowerCase()), 'lộ chuỗi: ' + x));
  assert.ok(!/0490000000\d\d/.test(tat), 'lộ dạng CCCD 0490000000xx');
  assert.deepEqual(Object.keys(r).sort(), ['bang', 'ok', 'so']); assert.deepEqual(Object.keys(r.so).sort(), CL.KHOA.map(k => k[0]).sort());
  Object.values(r.so).forEach(v => assert.ok(Number.isInteger(v) && v >= 0, 'giá trị không phải số nguyên: ' + v));
  assert.ok(r.bang.split('\n').every(l => /^[^:]+: \d+$/.test(l)), 'mỗi dòng chỉ là “Nhãn: số”');
});
test('BẢO MẬT (hàm thuần): đưa chuỗi bẩn vào mọi trường, đầu ra vẫn chỉ là số theo danh sách trắng', () => {
  const bẩn = '0490000000zz-Tên giả lập-HD-GL-9';
  const r = CL.tinh({hd: [{trangThai: bẩn, nCccd: bẩn, rung: [{maRung: bẩn, ghepTam: bẩn, extra: bẩn}], phieu: [{soPhieu: bẩn, ngay: bẩn, bienRaw: bẩn, klKg: bẩn, issue: bẩn, cccd: bẩn}], cccd: bẩn, ten: bẩn}], dong: {HoSoRung: bẩn, extra: bẩn}, ms: bẩn, cccd: bẩn});
  const tat = JSON.stringify(r) + CL.bang(r); assert.ok(!tat.includes('giả lập') && !tat.includes('0490000000zz') && !tat.includes('HD-GL-9'));
  Object.values(r.so).forEach(v => assert.ok(Number.isInteger(v) && v >= 0));
});
test('chatLuong: chưa có dữ liệu → báo rõ, không ném lỗi; không có tham số IPC', () => {
  const L = new Lookup(new Store(':memory:')); const r = L.chatLuong(); assert.equal(r.ok, false); assert.equal(r.noData, true);
  assert.equal(L.chatLuong.length, 0, 'chatLuong() không nhận tham số');
});

test('nghi đổi số: dùng ĐÚNG quy tắc của màn cập nhật vào hồ sơ (so Sheet với phiếu đã có trong lô, cùng ngày + biển + kg ±1)', () => {
  /* lô đã có phiếu OLD-001 cùng ngày, biển, kg với PC-GL-001 và PC-GL-002 trên Sheet, khác số phiếu → cả hai dòng Sheet đều là ứng viên (nghi đổi số) */
  const pcLo = [{soPhieu: 'OLD-001', ngay: '06/11/2026', bienSo: '43C-111.11', klKg: 20000}];
  assert.equal(duLieu(loCo(pcLo)).chatLuong().so.phieuNghiDoiSo, 2);
  /* khối lượng lệch quá 1 kg: không nghi */
  assert.equal(duLieu(loCo([{soPhieu: 'OLD-001', ngay: '06/11/2026', bienSo: '43C-111.11', klKg: 20003}])).chatLuong().so.phieuNghiDoiSo, 0);
  /* khác ngày hoặc khác biển số: không nghi */
  assert.equal(duLieu(loCo([{soPhieu: 'OLD-001', ngay: '07/11/2026', bienSo: '43C-111.11', klKg: 20000}])).chatLuong().so.phieuNghiDoiSo, 0);
  assert.equal(duLieu(loCo([{soPhieu: 'OLD-001', ngay: '06/11/2026', bienSo: '43C-222.22', klKg: 20000}])).chatLuong().so.phieuNghiDoiSo, 0);
  /* lô đã có đúng PC-GL-001 (khớp khóa): dòng đó là “đã có”, lô ấy đã được nhận nên PC-GL-002 KHÔNG còn là nghi đổi số */
  assert.equal(duLieu(loCo([{soPhieu: 'PC-GL-001', ngay: '06/11/2026', bienSo: '43C-111.11', klKg: 20000}])).chatLuong().so.phieuNghiDoiSo, 0);
  /* lô mã rừng khác (không thuộc hợp đồng này): không dùng để so */
  const khac = loCo(pcLo); khac.rs.oGL.forests.fGL.info.maRung = 'R-KHAC-99'; assert.equal(duLieu(khac).chatLuong().so.phieuNghiDoiSo, 0);
});
test('BẢO MẬT: có phiếu đã có trong lô, bảng vẫn không chứa số phiếu / biển số / mã rừng của lô', () => {
  const r = duLieu(loCo([{soPhieu: 'OLD-001', ngay: '06/11/2026', bienSo: '43C-111.11', klKg: 20000}])).chatLuong(), tat = JSON.stringify(r) + '\n' + r.bang;
  ['OLD-001', 'OLD-002', 'oGL', 'fGL', 'CR-GL', 'Lô giả lập'].concat(SECRETS).forEach(x => assert.ok(!tat.toLowerCase().includes(x.toLowerCase()), 'lộ chuỗi: ' + x));
});
test('cặp trùng khóa: dùng khóa chuẩn hóa của phần mềm (khác cách viết hoa / dấu cách vẫn là trùng)', () => {
  const CL2 = require('../src/chatluong');
  const r = CL2.tinh({hd: [{trangThai: 'ok', nCccd: 1, rung: [], phieu: [{soPhieu: 'ab 12', ngay: '06/11/2026', bienRaw: 'x', klKg: 1}, {soPhieu: 'AB12', ngay: '6/11/2026', bienRaw: 'x', klKg: 1}]}]});
  assert.equal(r.so.capTrungKhoa, 1);
});

test('nghi đổi số: dùng ánh xạ tên xe đã lưu nhưng giữ báo cáo chỉ gồm số đếm', () => {
  const db = loCo([{soPhieu: 'OLD-001', ngay: '06/11/2026', bienSo: '43C-111.11', klKg: 20000}]);
  const ten = 'Xe Giả Lập';
  assert.equal(duLieu(db, ten).chatLuong().so.phieuNghiDoiSo, 1);
  db.bienAlias = {'xe gia lap': '43C-111.11'};
  const r = duLieu(db, ten).chatLuong();
  assert.equal(r.so.phieuNghiDoiSo, 2);
  assert.ok(!JSON.stringify(r).includes(ten));
});
