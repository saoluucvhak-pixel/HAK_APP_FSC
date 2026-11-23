'use strict';
/* G2 — TEST VIẾT TRƯỚC: tra cứu "Dữ liệu Google Sheets" theo MÃ HỢP ĐỒNG (S1, S2, QĐ1, QĐ4, QĐ5, QĐ10/MĐ1).
 * Nguồn: docs/DAC_TA_GOOGLE_SHEETS_THEO_HOP_DONG.md (R1-R11, T3-T7, E1, E6-E8, Phụ lục QĐ) và docs/THIET_KE_DU_LIEU_DOI_SO_PHAN_BO.md §2.7.
 * Dữ liệu GIẢ LẬP (CCCD 0490000000xx, mã HD-GL-…). Test ghi [guard] là hành vi HIỆN CÓ phải giữ (xanh từ G2).
 *
 * API GIẢ ĐỊNH (chưa có trong mã; G3 phải khớp hoặc báo để sửa test) — Lookup#build(hd) với MỘT tham số chuỗi (chữ ký cũ build(cccd, hd, rungHint) vẫn chạy):
 *   {ok:true, hd: <chuẩn hóa HOA, gọn khoảng trắng>, cccdList: [CCCD (baseCccd) khác nhau ở HoSoRung, sắp tăng],
 *    nhieuCccd: bool  // QĐ4: cờ CẢNH BÁO NẶNG, KHÔNG phải lỗi cứng (không có ok:false, không ném lỗi)
 *    canhBaoNang: [{ma:'nhieu-cccd', cccd:[…], dong:[số dòng Sheet HoSoRung]}],
 *    lech: [{tab, row, cccd}]          // dòng ở HoSoKeo/ToaDoRung có CCCD ≠ CCCD hợp đồng (sau baseCccd + cccdSo; không bù số 0 giữa CMND 9 và CCCD 12 số)
 *    forests: [{maRung, hecta, dinhMuc, duKienKg|null, ghep: 'hecta'|'dia-chi'|'thu-tu'|'', ghepTam: bool, gps: [...] , dong: <dòng HoSoRung>}]   // MỖI dòng HoSoRung = một rừng (QĐ1)
 *    phieu: [{soPhieu, row, kl, klKg, lechCccd: bool, …}]  // phiếu thuộc HỢP ĐỒNG (không thuộc từng rừng)
 *    owner, warns: [], notes: []}
 *   Lookup#load(buf,…) giữ nguyên: trả {ok, errors[], notes[]}.
 * Ở G2 các test không ghi [guard] phải ĐỎ vì build(hd) chưa tồn tại / hành vi chưa cài. */
const test = require('node:test'), assert = require('node:assert');
const XLSX = require('xlsx');
const {Store} = require('../src/store');
const {Lookup} = require('../src/lookup');

const H_KEO = ['STT', 'Mã khách hàng', 'Mã hợp đồng', 'SỐ PHIẾU CHI', 'SỐ PHIẾU CÂN', 'Ngày nhập', 'SỐ XE', 'Đại Lý', 'Hàng hóa', 'Giờ cân 1', 'Giờ cân 2', 'Biển số 1', 'Cân lần 1', 'Cân lần 2', 'KL hàng (KG)', 'Khối lượng (Tấn)', 'Đơn giá', 'Thanh toán', 'Nguồn gốc', 'Người cân', 'Số thứ tự BKLS', 'Số BKLS', 'Họ và tên chủ rừng', 'ĐỊA CHỈ RỪNG'];
const H_RUNG = ['STT', 'Mã KH_CCCD', 'Họ và tên chủ rừng', 'Mã hợp đồng', 'Mã thanh lý hợp đồng', 'Ngày ký hợp đồng', 'Ngày thanh lý', 'Tình trạng Hợp đồng', 'Địa chỉ thường trú', 'Địa chỉ hiện tại', 'Ngày cấp', 'Nơi cấp', 'SĐT', 'ĐỊA CHỈ RỪNG', 'HECTA', 'Định mức tấn/Ha', 'Pháp lý rừng', 'Tọa độ', 'Định mức quy đổi Tấn/M3', 'Quy cách đường kính', 'Quy cách chiều dài', 'Phương án khai thác', 'Năm trồng'];
const H_TD = ['ID_RUNG', 'ID_GPS', 'Mã rừng', 'Số hợp đồng', 'Ngày ký hợp đồng', 'HoVaTenChuRung', 'SoCCCD', 'ThuongTru', 'DiaChiRungTrong', 'DienTich_m2', 'HoSoNguonGoc', 'SoGiayTo', 'NgayGiayTo', 'Latitude_Vĩ độ', 'Longtitude_Kinh độ', 'Location', 'Địa điểm tra GPS'];
const aoa = (head, rows, cols) => { const h = cols || head; return [h].concat(rows.map(r => h.map(c => (r[c] === undefined ? null : r[c])))); };
/* dựng xlsx: dòng dữ liệu đầu = dòng 2 của Sheet. o = {keo, rung, td} mảng đối tượng theo tên cột; o.cols = {keo, rung, td} để chỉ giữ một số cột; o.names = tên tab */
function wb(o) {
  const nm = o.names || ['HoSoKeo', 'HoSoRung', 'ToaDoRung'], c = o.cols || {}, w = XLSX.utils.book_new();
  [[o.keo || [], H_KEO, c.keo, nm[0]], [o.rung || [], H_RUNG, c.rung, nm[1]], [o.td || [], H_TD, c.td, nm[2]]].forEach(([rows, head, cols, name]) => XLSX.utils.book_append_sheet(w, XLSX.utils.aoa_to_sheet(aoa(head, rows, cols)), name));
  return XLSX.write(w, {type: 'buffer', bookType: 'xlsx'});
}
const fresh = o => { const s = new Store(':memory:'), L = new Lookup(s), r = L.load(wb(o), 'excel', 'gia_lap.xlsx'); assert.ok(r.ok, JSON.stringify(r.errors)); return L; };
const K = (cccd, hd, so, ngay, kg, bks, x) => Object.assign({'Mã khách hàng': cccd, 'Mã hợp đồng': hd, 'SỐ PHIẾU CÂN': so, 'Ngày nhập': ngay, 'Biển số 1': bks || '43C-100.01', 'SỐ XE': bks || '43C-100.01', 'KL hàng (KG)': kg, 'Đơn giá': 1, 'Thanh toán': 'x', 'Họ và tên chủ rừng': 'Chủ Giả Lập', 'ĐỊA CHỈ RỪNG': 'x'}, x || {});
const RG = (cccd, hd, ha, dia, x) => Object.assign({'Mã KH_CCCD': cccd, 'Họ và tên chủ rừng': 'Chủ Giả Lập', 'Mã hợp đồng': hd, 'Ngày ký hợp đồng': '05/10/2026', 'Địa chỉ thường trú': 'x', 'Địa chỉ hiện tại': 'x', 'Ngày cấp': '01/01/2020', 'Nơi cấp': 'x', 'SĐT': '0900000001', 'ĐỊA CHỈ RỪNG': dia || 'x', 'HECTA': ha, 'Định mức tấn/Ha': 95, 'Pháp lý rừng': 'Giấy xác nhận UBND xã'}, x || {});
const TD = (cccd, hd, ma, m2, dia, lat, lng, x) => Object.assign({'Mã rừng': ma, 'Số hợp đồng': hd, 'HoVaTenChuRung': 'Chủ Giả Lập', 'SoCCCD': cccd, 'ThuongTru': 'x', 'DiaChiRungTrong': dia || 'x', 'DienTich_m2': m2, 'HoSoNguonGoc': 'Giấy xác nhận', 'SoGiayTo': 'XN-1', 'NgayGiayTo': '01/01/2020', 'Latitude_Vĩ độ': lat || 15.6, 'Longtitude_Kinh độ': lng || 108.1, 'ID_GPS': ma + '-g'}, x || {});
const C = (n) => '0490000000' + String(n).padStart(2, '0');
const rungCua = (r, ma) => r.forests.find(f => f.maRung === ma);
const dongSheet = (r) => r.forests.map(f => f.dong);

/* ====== S1/R1/R2: khóa là MÃ HỢP ĐỒNG ====== */
test('LK-01 build(hd): "hd-gl-0001", " HD-GL-0001 ", "HD-GL-0001" cho cùng một hợp đồng; kết quả có đủ rừng, tọa độ, phiếu (R1, R2)', () => {
  const L = fresh({keo: [K(C(11), 'HD-GL-0001', 'GL1-0001', '06/11/2026', 20500), K(C(11), 'HD-GL-0001', 'GL1-0002', '06/11/2026', 19980)], rung: [RG(C(11), 'HD-GL-0001', 0.8, 'Xã Giả Lập A')],
    td: [TD(C(11), 'HD-GL-0001', 'R-GL01-01', 8000, 'Xã Giả Lập A', 15.600001, 108.100001), TD(C(11), 'HD-GL-0001', 'R-GL01-01', 8000, 'Xã Giả Lập A', 15.600101, 108.100201)]});
  const a = L.build('HD-GL-0001'), b = L.build('hd-gl-0001'), c = L.build('  HD-GL-0001  ');
  assert.strictEqual(a.hd, 'HD-GL-0001'); assert.deepStrictEqual(b, a); assert.deepStrictEqual(c, a);
  assert.strictEqual(a.forests.length, 1); assert.strictEqual(a.forests[0].maRung, 'R-GL01-01'); assert.strictEqual(a.forests[0].gps.length, 2); assert.strictEqual(a.phieu.length, 2);
  assert.strictEqual(a.phieu.reduce((t, p) => t + p.klKg, 0), 40480);
});
test('LK-01b E1: cùng một hợp đồng viết khác hoa/thường/khoảng trắng giữa ba tab → MỘT hợp đồng đủ ba tab', () => {
  const L = fresh({keo: [K(C(66), 'Hd-Gl-0006', 'GL6-0002', '19/11/2026', 21000)], rung: [RG(C(66), 'HD-GL-0006', 0.5, 'Xã Giả Lập F')], td: [TD(C(66), ' hd-gl-0006 ', 'R-GL06-01', 5000, 'Xã Giả Lập F')]});
  const r = L.build('HD-GL-0006'); assert.strictEqual(r.forests.length, 1); assert.strictEqual(r.forests[0].maRung, 'R-GL06-01'); assert.strictEqual(r.forests[0].gps.length, 1); assert.strictEqual(r.phieu.length, 1);
});
test('R2 [guard] chữ ký cũ build(cccd, hd) vẫn chạy và trả đủ nội dung (HD-GL-0006 cấu trúc cũ, tab _QC: 1 rừng, 1 tọa độ, 2 phiếu = 41,000 t)', () => {
  const L = fresh({names: ['HoSoKeo_QC', 'HoSoRung_QC', 'ToaDoRung_QC'], keo: [K(C(66), 'HD-GL-0006', 'GL6-0001', '18/11/2026', 20000, '43C-600.01'), K(C(66), 'HD-GL-0006', 'GL6-0002', '19/11/2026', 21000, '43C-600.01')],
    rung: [RG(C(66), 'HD-GL-0006', 0.5, 'Xã Giả Lập F', {'Họ và tên chủ rừng': 'Bùi Thị Giả Sáu'})], td: [TD(C(66), 'HD-GL-0006', 'R-GL06-01', 5000, 'Xã Giả Lập F', 15.690001, 108.190001)]});
  const r = L.build(C(66), 'HD-GL-0006');
  assert.strictEqual(r.cccd, C(66)); assert.strictEqual(r.hd, 'HD-GL-0006'); assert.strictEqual(r.forests.length, 1); assert.strictEqual(r.forests[0].maRung, 'R-GL06-01'); assert.strictEqual(r.forests[0].gps.length, 1);
  assert.strictEqual(r.forests[0].phieu.reduce((t, p) => t + p.klKg, 0), 41000); assert.strictEqual(r.owner.fields.find(f => f.key === 'ten').value, 'Bùi Thị Giả Sáu');
});
test('R11/T7 build(hd) mới cho Sheet cấu trúc cũ ra cùng nội dung với chữ ký cũ (cùng rừng, cùng phiếu, cùng chủ rừng)', () => {
  const L = fresh({names: ['HoSoKeo_QC', 'HoSoRung_QC', 'ToaDoRung_QC'], keo: [K(C(66), 'HD-GL-0006', 'GL6-0001', '18/11/2026', 20000), K(C(66), 'HD-GL-0006', 'GL6-0002', '19/11/2026', 21000)], rung: [RG(C(66), 'HD-GL-0006', 0.5, 'Xã Giả Lập F')], td: [TD(C(66), 'HD-GL-0006', 'R-GL06-01', 5000, 'Xã Giả Lập F')]});
  const o = L.build(C(66), 'HD-GL-0006'), n = L.build('HD-GL-0006');
  assert.deepStrictEqual(n.owner, o.owner); assert.deepStrictEqual(n.forests.map(f => f.maRung), o.forests.map(f => f.maRung));
  assert.deepStrictEqual(n.phieu.map(p => [p.soPhieu, p.klKg, p.ngay]), o.forests[0].phieu.map(p => [p.soPhieu, p.klKg, p.ngay]));
  assert.deepStrictEqual(n.forests[0].gps, o.forests[0].gps);
});

/* ====== QĐ4: mã hợp đồng nhiều CCCD → cảnh báo nặng, KHÔNG chặn cứng ====== */
test('LK-02 QĐ4/T3: mã hợp đồng có 2 CCCD khác nhau ở HoSoRung (dòng 2 và 3) → cờ cảnh báo nặng + số dòng; KHÔNG ném lỗi, KHÔNG ok:false/LOI_DU_LIEU', () => {
  const L = fresh({rung: [RG(C(33), 'HD-GL-0003', 0.9, 'Xã Giả Lập C'), RG(C(34), 'HD-GL-0003', 0.9, 'Xã Giả Lập C', {'Họ và tên chủ rừng': 'Lê Văn Giả Bốn'})], td: [TD(C(33), 'HD-GL-0003', 'R-GL03-01', 9000)], keo: [K(C(33), 'HD-GL-0003', 'GL3-0001', '16/11/2026', 20000)]});
  let r; assert.doesNotThrow(() => { r = L.build('HD-GL-0003'); });
  assert.notStrictEqual(r.ok, false); assert.ok(!r.loiDuLieu && !r.error);
  assert.strictEqual(r.nhieuCccd, true); assert.deepStrictEqual(r.cccdList, [C(33), C(34)]);
  assert.strictEqual(r.canhBaoNang.length, 1); assert.strictEqual(r.canhBaoNang[0].ma, 'nhieu-cccd'); assert.deepStrictEqual(r.canhBaoNang[0].dong, [2, 3]); assert.deepStrictEqual(r.canhBaoNang[0].cccd.slice().sort(), [C(33), C(34)]);
  assert.ok(r.forests.length >= 1 && r.phieu.length === 1, 'dữ liệu vẫn trả về để người dùng quyết định sau 2 lần xác nhận');
});
test('LK-02b hợp đồng một CCCD (kể cả hậu tố _1 và hai dòng HoSoRung = hai rừng) KHÔNG bị cờ nhiều CCCD', () => {
  const L = fresh({rung: [RG(C(22), 'HD-GL-0002', 0.65, 'A'), RG(C(22) + '_1', 'HD-GL-0002', 0.55, 'B')], td: [TD(C(22), 'HD-GL-0002', 'R1', 6500, 'A'), TD(C(22), 'HD-GL-0002', 'R2', 5500, 'B')]});
  const r = L.build('HD-GL-0002'); assert.strictEqual(r.nhieuCccd, false); assert.deepStrictEqual(r.canhBaoNang, []); assert.deepStrictEqual(r.cccdList, [C(22)]);
});
test('LK-02c [guard] đường cũ candidates() với mã hợp đồng nhiều CCCD vẫn chạy (cảnh báo "cũng được dùng cho 1 CCCD khác", ok)', () => {
  const L = fresh({rung: [RG(C(33), 'HD-GL-0003', 0.9), RG(C(34), 'HD-GL-0003', 0.9)], td: [], keo: []});
  const c = L.candidates('HoSoRung_QC', 2); assert.ok(c.ok); assert.ok(c.warns.some(w => /cũng được dùng cho 1 CCCD khác/.test(w)));
});

/* ====== S1/R5/R7: CCCD lệch ====== */
test('LK-03 R5/T4: CCCD ở HoSoKeo (phiếu GL4-0003) và ToaDoRung (dòng 2) lệch CCCD hợp đồng → lech[] có tab + số dòng, phiếu đánh lechCccd; hai phiếu đúng thì không', () => {
  const L = fresh({rung: [RG(C(44), 'HD-GL-0004', 1.0, 'Xã Giả Lập D')], keo: [K(C(44), 'HD-GL-0004', 'GL4-0001', '12/11/2026', 20000), K(C(44), 'HD-GL-0004', 'GL4-0002', '13/11/2026', 19800), K(C(99), 'HD-GL-0004', 'GL4-0003', '14/11/2026', 21000)],
    td: [TD(C(45), 'HD-GL-0004', 'R-GL04-01', 10000, 'Xã Giả Lập D'), TD(C(44), 'HD-GL-0004', 'R-GL04-01', 10000, 'Xã Giả Lập D')]});
  const r = L.build('HD-GL-0004'); assert.strictEqual(r.nhieuCccd, false);
  assert.strictEqual(r.lech.length, 2);
  const k = r.lech.find(x => /HoSoKeo/.test(x.tab)), t = r.lech.find(x => /ToaDoRung/.test(x.tab)); assert.strictEqual(k.row, 4); assert.strictEqual(k.cccd, C(99)); assert.strictEqual(t.row, 2); assert.strictEqual(t.cccd, C(45));
  assert.deepStrictEqual(r.phieu.filter(p => p.lechCccd).map(p => p.soPhieu), ['GL4-0003']);
});
test('LK-05/E8 hậu tố "_2" ở mã khách và CCCD dạng số mất số 0 đầu KHÔNG báo lệch (so sau baseCccd + cccdTuSo)', () => {
  const L = fresh({rung: [RG(C(44), 'HD-GL-0004', 1.0)], keo: [K(C(44) + '_2', 'HD-GL-0004', 'GL4-0001', '12/11/2026', 20000), K(49000000044, 'HD-GL-0004', 'GL4-0002', '13/11/2026', 20000)], td: [TD(C(44) + '_2', 'HD-GL-0004', 'R1', 10000)]});
  const r = L.build('HD-GL-0004'); assert.deepStrictEqual(r.lech, []); assert.ok(r.phieu.every(p => !p.lechCccd));
});
test('LK-06 CMND 9 số và CCCD 12 số của cùng một người là hai khóa khác nhau → lech (mặc định thiết kế Q8/Q24, CHỦ chưa quyết riêng)', () => {
  const L = fresh({rung: [RG(C(44), 'HD-GL-0004', 1.0)], keo: [K('049000044', 'HD-GL-0004', 'GL4-0001', '12/11/2026', 20000)], td: []});
  const r = L.build('HD-GL-0004'); assert.strictEqual(r.lech.length, 1); assert.strictEqual(r.phieu[0].lechCccd, true);
});
test('LK-08 R7: tab không có CCCD (ô trống) → không báo lệch, vẫn nhận phiếu, chỉ ghi chú "thiếu CCCD để đối chiếu"', () => {
  const L = fresh({rung: [RG(C(44), 'HD-GL-0004', 1.0)], keo: [K('', 'HD-GL-0004', 'GL4-0001', '12/11/2026', 20000)], td: [TD('', 'HD-GL-0004', 'R1', 10000)]});
  const r = L.build('HD-GL-0004'); assert.deepStrictEqual(r.lech, []); assert.strictEqual(r.phieu.length, 1); assert.ok(r.notes.concat(r.warns).some(w => /thiếu CCCD/i.test(w)));
});

/* ====== QĐ1 + QĐ10 (MĐ1): nhiều dòng HoSoRung = nhiều rừng; ghép dòng HoSoRung ↔ mã rừng ToaDoRung ====== */
const HD2 = (rung, td) => fresh({rung, td, keo: [K(C(22), 'HD-GL-0002', 'GL2-0001', '06/11/2026', 20500)]}).build('HD-GL-0002');
test('QĐ1 nhiều dòng HoSoRung cùng hợp đồng + cùng CCCD = nhiều rừng (không còn cảnh báo "dùng dòng …"); mỗi rừng mang HECTA của dòng của nó', () => {
  const r = HD2([RG(C(22), 'HD-GL-0002', 0.65, 'Lô A'), RG(C(22), 'HD-GL-0002', 0.55, 'Lô B')], [TD(C(22), 'HD-GL-0002', 'R-GL02-01', 6500, 'Lô A'), TD(C(22), 'HD-GL-0002', 'R-GL02-02', 5500, 'Lô B')]);
  assert.strictEqual(r.forests.length, 2); assert.deepStrictEqual(r.forests.map(f => f.hecta).sort(), [0.55, 0.65]); assert.ok(!r.warns.some(w => /dùng dòng|cùng CCCD và hợp đồng/.test(w)));
});
test('MĐ1-(1) ghép theo HECTA ≈ DienTich_m2 ÷ 10.000, ưu tiên hơn địa chỉ và thứ tự; dự kiến = HECTA đúng dòng đã ghép × tấn/ha (QĐ1)', () => {
  // HoSoRung xếp NGƯỢC thứ tự ToaDoRung, địa chỉ cố ý đặt chéo: chỉ HECTA đưa về đúng mã rừng
  const r = HD2([RG(C(22), 'HD-GL-0002', 0.55, 'Lô A', {'Định mức tấn/Ha': 95}), RG(C(22), 'HD-GL-0002', 0.65, 'Lô B', {'Định mức tấn/Ha': 95})],
    [TD(C(22), 'HD-GL-0002', 'R-GL02-01', 6500, 'Lô A', 15.61, 108.11), TD(C(22), 'HD-GL-0002', 'R-GL02-02', 5500, 'Lô B', 15.62, 108.12)]);
  const a = rungCua(r, 'R-GL02-01'), b = rungCua(r, 'R-GL02-02');
  assert.strictEqual(a.hecta, 0.65); assert.strictEqual(a.duKienKg, 61750); assert.strictEqual(a.ghep, 'hecta'); assert.strictEqual(a.ghepTam, false); assert.strictEqual(a.gps[0].lat, 15.61);
  assert.strictEqual(b.hecta, 0.55); assert.strictEqual(b.duKienKg, 52250); assert.strictEqual(b.ghep, 'hecta'); assert.strictEqual(b.ghepTam, false); assert.strictEqual(b.gps[0].lat, 15.62);
});
test('MĐ1 dung sai 0,5 %: lệch 0,4 % ghép theo HECTA (không tạm); lệch 0,6 % KHÔNG ghép theo HECTA (rơi xuống (3), ghép tạm)', () => {
  const mot = ha => HD2([RG(C(22), 'HD-GL-0002', ha, 'Địa chỉ không khớp một')], [TD(C(22), 'HD-GL-0002', 'R-GL02-01', 10000, 'Chỗ khác hẳn')]).forests[0];
  const trong = mot(1.004), ngoai = mot(1.006);
  assert.strictEqual(trong.ghep, 'hecta'); assert.strictEqual(trong.ghepTam, false); assert.strictEqual(trong.maRung, 'R-GL02-01');
  assert.notStrictEqual(ngoai.ghep, 'hecta'); assert.strictEqual(ngoai.ghepTam, true);
});
test('MĐ1-(2) HECTA không khớp thì ghép theo địa chỉ (không dấu, không phân biệt hoa/thường), mang cờ ghép tạm — cần xác nhận', () => {
  const r = HD2([RG(C(22), 'HD-GL-0002', 0.9, 'Thôn Giả Lập Bắc'), RG(C(22), 'HD-GL-0002', 0.8, 'Thôn Giả Lập Nam')],
    [TD(C(22), 'HD-GL-0002', 'R-GL02-01', 6500, 'THON GIA LAP NAM', 15.61, 108.11), TD(C(22), 'HD-GL-0002', 'R-GL02-02', 5500, 'thôn giả lập bắc', 15.62, 108.12)]);
  const nam = rungCua(r, 'R-GL02-01'), bac = rungCua(r, 'R-GL02-02');
  assert.strictEqual(nam.hecta, 0.8); assert.strictEqual(bac.hecta, 0.9); assert.ok(nam.ghep === 'dia-chi' && bac.ghep === 'dia-chi'); assert.ok(nam.ghepTam && bac.ghepTam);
  assert.strictEqual(nam.duKienKg, 76000); assert.strictEqual(bac.duKienKg, 85500);
});
test('MĐ1-(3) HECTA và địa chỉ đều không khớp thì ghép theo thứ tự xuất hiện trong Sheet, ghép tạm', () => {
  const r = HD2([RG(C(22), 'HD-GL-0002', 0.9, 'Xóm 1'), RG(C(22), 'HD-GL-0002', 0.8, 'Xóm 2')], [TD(C(22), 'HD-GL-0002', 'R-GL02-01', 6500, 'Đồi X'), TD(C(22), 'HD-GL-0002', 'R-GL02-02', 5500, 'Đồi Y')]);
  assert.strictEqual(rungCua(r, 'R-GL02-01').hecta, 0.9); assert.strictEqual(rungCua(r, 'R-GL02-02').hecta, 0.8); assert.ok(r.forests.every(f => f.ghep === 'thu-tu' && f.ghepTam === true));
});
test('MĐ1 một mã rừng không bị hai dòng HoSoRung cùng chiếm: dòng thứ hai cùng HECTA khớp mã đã bị lấy thì chuyển sang mã còn lại (ghép tạm)', () => {
  const r = HD2([RG(C(22), 'HD-GL-0002', 0.65, 'Xóm 1'), RG(C(22), 'HD-GL-0002', 0.65, 'Xóm 2')], [TD(C(22), 'HD-GL-0002', 'R-GL02-01', 6500, 'Đồi X'), TD(C(22), 'HD-GL-0002', 'R-GL02-02', 9900, 'Đồi Y')]);
  const ma = r.forests.map(f => f.maRung); assert.deepStrictEqual(ma.slice().sort(), ['R-GL02-01', 'R-GL02-02']); assert.strictEqual(new Set(ma).size, 2);
  assert.strictEqual(r.forests.find(f => f.ghep === 'hecta').maRung, 'R-GL02-01'); assert.strictEqual(r.forests.find(f => f.maRung === 'R-GL02-02').ghepTam, true);
});
test('MĐ1 không ghép được (nhiều dòng HoSoRung hơn mã rừng): rừng thừa hiện "chưa có mã rừng" (maRung rỗng), vẫn có hecta/dự kiến của dòng nó, không chiếm mã của rừng khác', () => {
  const r = HD2([RG(C(22), 'HD-GL-0002', 0.65, 'Xóm 1'), RG(C(22), 'HD-GL-0002', 0.3, 'Xóm 2')], [TD(C(22), 'HD-GL-0002', 'R-GL02-01', 6500, 'Đồi X')]);
  assert.strictEqual(r.forests.length, 2); const khong = r.forests.filter(f => f.maRung === ''); assert.strictEqual(khong.length, 1); assert.strictEqual(khong[0].hecta, 0.3); assert.strictEqual(khong[0].duKienKg, 28500);
  assert.strictEqual(rungCua(r, 'R-GL02-01').hecta, 0.65); assert.deepStrictEqual(r.forests.map(f => f.maRung).filter(Boolean), ['R-GL02-01']);
});
test('QĐ1/QĐ3 HECTA trống (HD-GL-0008): rừng vẫn có trong danh sách, duKienKg = null kèm ghi chú thiếu dự kiến (không tự bịa)', () => {
  const r = fresh({rung: [RG(C(88), 'HD-GL-0008', null, 'Xã Giả Lập H')], td: [TD(C(88), 'HD-GL-0008', 'R-GL08-01', null, 'Xã Giả Lập H')], keo: [K(C(88), 'HD-GL-0008', 'GL8-0001', '10/11/2026', 20000)]}).build('HD-GL-0008');
  assert.strictEqual(r.forests.length, 1); assert.strictEqual(r.forests[0].duKienKg, null); assert.ok(r.notes.concat(r.warns).some(w => /hecta|dự kiến/i.test(w)));
});

/* ====== QĐ5 / S2: cột bắt buộc của từng tab (nhận tab theo cột) ====== */
const MIN = {keo: ['Mã hợp đồng', 'SỐ PHIẾU CÂN', 'Ngày nhập', 'KL hàng (KG)'], rung: ['Mã hợp đồng', 'HECTA'], td: ['Mã rừng', 'Số hợp đồng', 'Latitude_Vĩ độ', 'Longtitude_Kinh độ']};
const minWb = (cols) => wb({cols, keo: [K(C(11), 'HD-GL-0001', 'GL1-0001', '06/11/2026', 20500)], rung: [RG(C(11), 'HD-GL-0001', 0.8)], td: [TD(C(11), 'HD-GL-0001', 'R-GL01-01', 8000)]});
test('QĐ5/R9 tối thiểu: ba tab chỉ có cột bắt buộc (HoSoKeo: Mã hợp đồng, SỐ PHIẾU CÂN, Ngày nhập, KL; HoSoRung: Mã hợp đồng, HECTA; ToaDoRung: Mã rừng, Số hợp đồng, vĩ/kinh độ) vẫn nạp được (thiếu cột chỉ-để-kiểm-tra/ưu tiên không lỗi)', () => {
  const L = new Lookup(new Store(':memory:')), r = L.load(minWb(MIN), 'excel', 'toi_thieu.xlsx'); assert.strictEqual(r.ok, true, JSON.stringify(r.errors));
  const b = L.build('HD-GL-0001'); assert.strictEqual(b.forests.length, 1); assert.strictEqual(b.phieu.length, 1);
});
test('QĐ5/R9 thiếu một cột bắt buộc → lỗi nêu đúng TÊN TAB và TÊN CỘT, bản tra cứu cũ giữ nguyên', () => {
  [['rung', 'HoSoRung', 'HECTA'], ['rung', 'HoSoRung', 'Mã hợp đồng'], ['td', 'ToaDoRung', 'Mã rừng'], ['td', 'ToaDoRung', 'Longtitude_Kinh độ'], ['keo', 'HoSoKeo', 'SỐ PHIẾU CÂN'], ['keo', 'HoSoKeo', 'Ngày nhập']].forEach(([k, tab, col]) => {
    const L = new Lookup(new Store(':memory:')); assert.ok(L.load(minWb(MIN), 'excel', 'tot.xlsx').ok, 'bản tốt phải nạp được');
    const cols = Object.assign({}, MIN, {[k]: MIN[k].filter(c => c !== col)}), r = L.load(minWb(cols), 'excel', 'hong.xlsx');
    assert.strictEqual(r.ok, false, tab + ' thiếu ' + col); const msg = (r.errors || []).join(' | '); assert.ok(msg.includes(tab) && msg.includes(col), msg);
    assert.strictEqual(L.status().active.detail, 'tot.xlsx');
  });
  const L = new Lookup(new Store(':memory:')); assert.ok(L.load(minWb(MIN), 'excel', 'tot.xlsx').ok);
  const r = L.load(minWb(Object.assign({}, MIN, {keo: ['Mã hợp đồng', 'SỐ PHIẾU CÂN', 'Ngày nhập']})), 'excel', 'hong.xlsx'); assert.strictEqual(r.ok, false); assert.match((r.errors || []).join(' '), /HoSoKeo/); assert.match((r.errors || []).join(' '), /KL hàng|Khối lượng/);
});
test('QĐ5 [guard] mỗi tab có một cột đặc trưng để không nhầm vai trò: tab chỉ có "Mã hợp đồng" + "SỐ PHIẾU CÂN" + "Ngày nhập" + KL không được nhận làm HoSoRung (thiếu HECTA)', () => {
  const L = new Lookup(new Store(':memory:'));
  const r = L.load(wb({names: ['HoSoKeo', 'HoSoRung', 'ToaDoRung'], cols: Object.assign({}, MIN, {rung: ['Mã hợp đồng', 'SỐ PHIẾU CÂN', 'Ngày nhập', 'KL hàng (KG)']})}), 'excel', 'nham.xlsx');
  assert.strictEqual(r.ok, false);
});
test('R2/R11 tương thích Sheet cấu trúc cũ đủ cột (tab _QC): vẫn nạp ok với bộ cột đầy đủ của v3.2.0', () => {
  const L = fresh({names: ['HoSoKeo_QC', 'HoSoRung_QC', 'ToaDoRung_QC'], keo: [K(C(66), 'HD-GL-0006', 'GL6-0001', '18/11/2026', 20000)], rung: [RG(C(66), 'HD-GL-0006', 0.5)], td: [TD(C(66), 'HD-GL-0006', 'R-GL06-01', 5000)]});
  assert.strictEqual(L.status().active.counts.HoSoKeo_QC, 1);
});

/* ====== G4-sửa: P2-3, P2-4, P2-5, THẤP-4, THẤP-5, P2-9 ====== */
const {checkQuery} = require('../src/lookup');
test('G4 P2-3: HECTA = 0 → duKienKg null kèm ghi chú thiếu hecta/định mức (không phải 0)', () => {
  const L = fresh({keo: [], rung: [RG(C(70), 'HD-GL-0070', 0)], td: []});
  const r = L.build('HD-GL-0070');
  assert.strictEqual(r.forests[0].duKienKg, null);
  assert.ok(r.notes.some(n => n.includes('thiếu hecta hoặc định mức, không tính được dự kiến')), JSON.stringify(r.notes));
  const L2 = fresh({keo: [], rung: [RG(C(71), 'HD-GL-0071', 0.5, 'x', {'Định mức tấn/Ha': 0})], td: []});
  assert.strictEqual(L2.build('HD-GL-0071').forests[0].duKienKg, null);
  const L3 = fresh({keo: [], rung: [RG(C(72), 'HD-GL-0072', 0.5)], td: []});
  assert.strictEqual(L3.build('HD-GL-0072').forests[0].duKienKg, 47500);
});
test('G4 P2-4: hai dòng HoSoRung cùng HECTA và hai mã rừng cùng diện tích → ghép theo thứ tự, ghepTam, ghi chú hòa', () => {
  const L = fresh({keo: [], rung: [RG(C(73), 'HD-GL-0073', 0.5, 'a'), RG(C(73), 'HD-GL-0073', 0.5, 'b')], td: [TD(C(73), 'HD-GL-0073', 'R-A', 5000), TD(C(73), 'HD-GL-0073', 'R-B', 5000)]});
  const r = L.build('HD-GL-0073');
  assert.deepStrictEqual(r.forests.map(f => [f.maRung, f.ghep, f.ghepTam]), [['R-A', 'thu-tu', true], ['R-B', 'thu-tu', true]]);
  assert.ok(r.notes.some(n => n.includes('hòa — cần xác nhận mã rừng')), JSON.stringify(r.notes));
  // không hòa: vẫn nhãn hecta
  const L2 = fresh({keo: [], rung: [RG(C(74), 'HD-GL-0074', 0.5), RG(C(74), 'HD-GL-0074', 1)], td: [TD(C(74), 'HD-GL-0074', 'R-A', 5000), TD(C(74), 'HD-GL-0074', 'R-B', 10000)]});
  assert.deepStrictEqual(L2.build('HD-GL-0074').forests.map(f => [f.maRung, f.ghep, f.ghepTam]), [['R-A', 'hecta', false], ['R-B', 'hecta', false]]);
});
test('G4 P2-5: hợp đồng chỉ có ToaDoRung/HoSoKeo với ≥ 2 CCCD khác nhau, không có HoSoRung → nhieuCccd + canhBaoNang', () => {
  const L = fresh({keo: [K(C(76), 'HD-GL-0075', 'GL75-1', '18/11/2026', 20000)], rung: [], td: [TD(C(75), 'HD-GL-0075', 'R-X', 5000)]});
  const r = L.build('HD-GL-0075');
  assert.strictEqual(r.ok, true); assert.strictEqual(r.nhieuCccd, true);
  assert.strictEqual(r.canhBaoNang.length, 1); assert.strictEqual(r.canhBaoNang[0].ma, 'nhieu-cccd');
  assert.deepStrictEqual(r.canhBaoNang[0].cccd.slice().sort(), [C(75), C(76)]);
  const L1 = fresh({keo: [K(C(77), 'HD-GL-0077', 'GL77-1', '18/11/2026', 20000)], rung: [], td: [TD(C(77), 'HD-GL-0077', 'R-X', 5000)]});
  assert.strictEqual(L1.build('HD-GL-0077').nhieuCccd, false);
});
test('G4 THẤP-4: Mã rừng __proto__/constructor/toString không làm đường cũ build(cccd,hd) ném lỗi', () => {
  ['__proto__', 'constructor', 'toString', 'hasOwnProperty'].forEach(m => {
    const L = fresh({keo: [], rung: [RG(C(78), 'HD-GL-0078', 0.5)], td: [TD(C(78), 'HD-GL-0078', m, 5000), TD(C(78), 'HD-GL-0078', 'R-OK', 5000)]});
    const r = L.build(C(78), 'HD-GL-0078', '');
    assert.deepStrictEqual(r.forests.map(f => f.maRung).sort(), [m, 'R-OK'].sort(), m);
  });
});
test('G4 THẤP-5: checkQuery từ chối khóa quá dài hoặc không phải chuỗi', () => {
  assert.strictEqual(checkQuery('a'.repeat(200)), null);
  assert.strictEqual(checkQuery(undefined), null); assert.strictEqual(checkQuery(''), null);
  const bad = checkQuery('a'.repeat(201)); assert.deepStrictEqual(bad, {ok: false, error: 'Từ khóa quá dài (tối đa 200 ký tự).'});
  [{}, [], 5, true].forEach(v => assert.strictEqual(checkQuery(v).ok, false));
});
test('G4 P2-9: hdRows đệm tập k_hd theo set_id; nạp bản mới thì đọc lại', () => {
  const L = fresh({keo: [], rung: [RG(C(79), 'HD-GL-0079', 0.5), RG(C(80), 'HD-GL-0080', 0.5)], td: []});
  let n = 0; const orig = L.db.prepare.bind(L.db);
  L.db.prepare = sql => { if (/DISTINCT k_hd/.test(sql)) n++; return orig(sql); };
  assert.strictEqual(L.build('HD-GL-0079').ok, true); assert.strictEqual(L.build('hd-gl-0080').ok, true); assert.strictEqual(L.build('HD-GL-0079').ok, true);
  assert.strictEqual(n, 1, 'chỉ một truy vấn DISTINCT cho ba lần tra');
  assert.ok(L.load(wb({keo: [], rung: [RG(C(81), 'HD-GL-0081', 0.5)], td: []}), 'excel', 'moi.xlsx').ok);
  assert.strictEqual(L.build('HD-GL-0081').ok, true, 'bản mới phải thấy HD-GL-0081');
  assert.strictEqual(L.build('HD-GL-0079').ok, false, 'bản mới không còn HD-GL-0079');
  assert.strictEqual(n, 2);
});
