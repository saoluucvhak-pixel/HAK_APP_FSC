'use strict';
/* Đợt D (P2-3 src, Trung-1 src): chỉ mục mã hợp đồng, summaryHd, cleanSearchOpts, che CCCD trong cảnh báo. Dữ liệu GIẢ LẬP (CCCD 0490000000xx). */
const test = require('node:test'), assert = require('node:assert');
const XLSX = require('xlsx');
const {Store} = require('../src/store');
const {Lookup, cleanSearchOpts, maskCccd} = require('../src/lookup');

const H_KEO = ['Mã khách hàng', 'Mã hợp đồng', 'SỐ PHIẾU CÂN', 'Ngày nhập', 'Biển số 1', 'KL hàng (KG)', 'Đơn giá', 'Họ và tên chủ rừng'];
const H_RUNG = ['Mã KH_CCCD', 'Họ và tên chủ rừng', 'Mã hợp đồng', 'Ngày ký hợp đồng', 'ĐỊA CHỈ RỪNG', 'HECTA', 'Định mức tấn/Ha'];
const H_TD = ['Mã rừng', 'Số hợp đồng', 'HoVaTenChuRung', 'SoCCCD', 'DiaChiRungTrong', 'DienTich_m2', 'Latitude_Vĩ độ', 'Longtitude_Kinh độ', 'ID_GPS'];
const sheet = (h, rows) => XLSX.utils.aoa_to_sheet([h].concat(rows.map(r => h.map(c => r[c] === undefined ? null : r[c]))));
function fresh(keo, rung, td) {
  const w = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(w, sheet(H_KEO, keo), 'HoSoKeo'); XLSX.utils.book_append_sheet(w, sheet(H_RUNG, rung), 'HoSoRung'); XLSX.utils.book_append_sheet(w, sheet(H_TD, td), 'ToaDoRung');
  const L = new Lookup(new Store(':memory:')), r = L.load(XLSX.write(w, {type: 'buffer', bookType: 'xlsx'}), 'excel', 'gia_lap.xlsx'); assert.ok(r.ok, JSON.stringify(r.errors)); return L;
}
const cc = n => '0490' + String(n).padStart(8, '0');
function nhieuHd(n) {
  const keo = [], rung = [], td = [];
  for (let i = 1; i <= n; i++) {
    const hd = 'HD-GL-' + String(i).padStart(5, '0'), c = cc(i);
    rung.push({'Mã KH_CCCD': c, 'Họ và tên chủ rừng': 'Chủ Giả Lập ' + i, 'Mã hợp đồng': hd, 'Ngày ký hợp đồng': '05/10/2026', 'ĐỊA CHỈ RỪNG': 'Xã GL ' + i, 'HECTA': 1, 'Định mức tấn/Ha': 90});
    td.push({'Mã rừng': 'R-' + i, 'Số hợp đồng': hd, 'HoVaTenChuRung': 'Chủ Giả Lập ' + i, 'SoCCCD': c, 'DiaChiRungTrong': 'Xã GL ' + i, 'DienTich_m2': 10000, 'Latitude_Vĩ độ': 15.6, 'Longtitude_Kinh độ': 108.1, 'ID_GPS': 'g' + i});
    for (let k = 1; k <= 3; k++) keo.push({'Mã khách hàng': c, 'Mã hợp đồng': hd, 'SỐ PHIẾU CÂN': 'GL' + i + '-' + k, 'Ngày nhập': '06/11/2026', 'Biển số 1': '43C-100.01', 'KL hàng (KG)': 20000 + k, 'Đơn giá': 1, 'Họ và tên chủ rừng': 'Chủ Giả Lập ' + i});
  }
  return fresh(keo, rung, td);
}

test('SM-01 summaryHd: trạng thái đủ / cần xem / lỗi, không trả phiếu/GPS', () => {
  const L = fresh(
    [{'Mã khách hàng': cc(1), 'Mã hợp đồng': 'HD-A', 'SỐ PHIẾU CÂN': 'P1', 'Ngày nhập': '06/11/2026', 'KL hàng (KG)': 20000, 'Đơn giá': 1}, {'Mã khách hàng': cc(1), 'Mã hợp đồng': 'HD-A', 'SỐ PHIẾU CÂN': 'P2', 'Ngày nhập': '06/11/2026', 'KL hàng (KG)': 10500, 'Đơn giá': 1}, {'Mã khách hàng': cc(3), 'Mã hợp đồng': 'HD-C', 'SỐ PHIẾU CÂN': 'P3', 'Ngày nhập': '06/11/2026', 'KL hàng (KG)': 1000, 'Đơn giá': 1}],
    [{'Mã KH_CCCD': cc(1), 'Họ và tên chủ rừng': 'Chủ Giả Lập A', 'Mã hợp đồng': 'HD-A', 'Ngày ký hợp đồng': '05/10/2026', 'ĐỊA CHỈ RỪNG': 'x', 'HECTA': 1, 'Định mức tấn/Ha': 90}, {'Mã KH_CCCD': cc(2), 'Họ và tên chủ rừng': 'Chủ Giả Lập B', 'Mã hợp đồng': 'HD-B', 'Ngày ký hợp đồng': '05/10/2026', 'ĐỊA CHỈ RỪNG': 'y', 'HECTA': 1, 'Định mức tấn/Ha': 90}, {'Mã KH_CCCD': cc(4), 'Họ và tên chủ rừng': 'Chủ Giả Lập D', 'Mã hợp đồng': 'HD-B', 'Ngày ký hợp đồng': '05/10/2026', 'ĐỊA CHỈ RỪNG': 'z', 'HECTA': 1, 'Định mức tấn/Ha': 90}],
    [{'Mã rừng': 'R-A', 'Số hợp đồng': 'HD-A', 'HoVaTenChuRung': 'Chủ Giả Lập A', 'SoCCCD': cc(1), 'DienTich_m2': 10000, 'Latitude_Vĩ độ': 15.6, 'Longtitude_Kinh độ': 108.1}]);
  const r = L.summaryHd(['hd-a', 'HD-B', 'HD-KHONG-CO', 'HD-C']);
  assert.strictEqual(r.ok, true); assert.strictEqual(r.items.length, 4);
  const [a, b, x, c] = r.items;
  assert.deepStrictEqual({hd: a.hd, status: a.status, ten: a.ten, cccd: a.cccd, ngay: a.ngay, nRung: a.nRung, nPhieu: a.nPhieu, tan: a.tan}, {hd: 'HD-A', status: 'ok', ten: 'Chủ Giả Lập A', cccd: cc(1), ngay: '05/10/2026', nRung: 1, nPhieu: 2, tan: 30.5});
  assert.strictEqual(b.status, 'err'); assert.ok(b.why[0].includes('2 CCCD'));
  assert.strictEqual(x.ok, false); assert.strictEqual(x.status, 'err');
  assert.strictEqual(c.status, 'warn'); assert.ok(c.why.includes('thiếu HoSoRung'));
  items_khong_phieu(r);
  function items_khong_phieu(res) { res.items.forEach(i => { assert.ok(!('phieu' in i) && !('forests' in i) && !('gps' in i)); }); }
  // khớp bản đầy đủ build(hd)
  const full = L.build('HD-A'); assert.strictEqual(a.nPhieu, full.phieu.length);
});
test('SM-02 summaryHd: kiểm tra đầu vào (không phải mảng, > 200 mã, phần tử không phải chuỗi)', () => {
  const L = nhieuHd(3);
  assert.strictEqual(L.summaryHd('HD-GL-00001').ok, false); assert.strictEqual(L.summaryHd(new Array(201).fill('HD-GL-00001')).ok, false);
  const r = L.summaryHd([null, 5, {}, 'x'.repeat(65), 'HD-GL-00002']); assert.strictEqual(r.ok, true); assert.deepStrictEqual(r.items.map(i => i.ok), [false, false, false, false, true]);
  assert.strictEqual(L.summaryHd([]).items.length, 0);
});
test('SM-03 chỉ mục hợp đồng: cùng mã viết khác hoa/thường gộp một; nạp bản mới thì chỉ mục đổi', () => {
  const L = nhieuHd(5);
  assert.deepStrictEqual(L.build('hd-gl-00003'), L.build(' HD-GL-00003 '));
  const w = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(w, sheet(H_KEO, []), 'HoSoKeo');
  XLSX.utils.book_append_sheet(w, sheet(H_RUNG, [{'Mã KH_CCCD': cc(9), 'Họ và tên chủ rừng': 'Chủ Giả Lập 9', 'Mã hợp đồng': 'HD-MOI', 'ĐỊA CHỈ RỪNG': 'x', 'HECTA': 1, 'Định mức tấn/Ha': 90}]), 'HoSoRung'); XLSX.utils.book_append_sheet(w, sheet(H_TD, []), 'ToaDoRung');
  assert.ok(L.load(XLSX.write(w, {type: 'buffer', bookType: 'xlsx'}), 'excel', 'moi.xlsx').ok);
  assert.strictEqual(L.build('HD-GL-00003').ok, false); assert.strictEqual(L.build('HD-MOI').ok, true);
});
test('SM-04 cleanSearchOpts: limit chỉ nhận số nguyên dương ≤ 100000', () => {
  assert.strictEqual(cleanSearchOpts({limit: 50}).limit, 50); assert.strictEqual(cleanSearchOpts({limit: 100000}).limit, 100000);
  [-1, 0, NaN, Infinity, 1.5, 100001, '5', null, {}, []].forEach(v => assert.ok(!('limit' in cleanSearchOpts({limit: v})), String(v)));
  assert.deepStrictEqual(cleanSearchOpts(null), {}); assert.deepStrictEqual(cleanSearchOpts([1]), {}); assert.strictEqual(cleanSearchOpts(7).limit, 7);
  assert.strictEqual(cleanSearchOpts({sort: 'ngay', limit: -3}).sort, 'ngay');
});
test('SM-05 Trung-1: cảnh báo nhiều CCCD không chứa CCCD đầy đủ (che 3 số đầu…3 số cuối); cccdList vẫn đủ', () => {
  const L = fresh([], [{'Mã KH_CCCD': cc(33), 'Họ và tên chủ rừng': 'Chủ Giả Lập X', 'Mã hợp đồng': 'HD-X', 'ĐỊA CHỈ RỪNG': 'a', 'HECTA': 1, 'Định mức tấn/Ha': 90}, {'Mã KH_CCCD': cc(34), 'Họ và tên chủ rừng': 'Chủ Giả Lập Y', 'Mã hợp đồng': 'HD-X', 'ĐỊA CHỈ RỪNG': 'b', 'HECTA': 1, 'Định mức tấn/Ha': 90}], []);
  const r = L.build('HD-X'); assert.deepStrictEqual(r.cccdList, [cc(33), cc(34)]);
  const w = r.warns.join(' | '); assert.ok(!w.includes(cc(33)) && !w.includes(cc(34)), w); assert.ok(w.includes('049…033') && w.includes('049…034'), w);
  assert.strictEqual(maskCccd('049000000033'), '049…033'); assert.strictEqual(maskCccd('12345'), '12345');
});
test('SM-06 đo thời gian 2000 hợp đồng: summaryHd (10 lô × 200) ≤ 1,5 s', () => {
  const L = nhieuHd(2000), codes = []; for (let i = 1; i <= 2000; i++) codes.push('HD-GL-' + String(i).padStart(5, '0'));
  const t0 = process.hrtime.bigint(); let n = 0, tot = 0;
  for (let i = 0; i < 2000; i += 200) { const r = L.summaryHd(codes.slice(i, i + 200)); assert.ok(r.ok); n += r.items.length; r.items.forEach(x => { assert.strictEqual(x.status, 'ok'); tot += x.tan; }); }
  const ms = Number(process.hrtime.bigint() - t0) / 1e6; console.log('summaryHd 2000 hợp đồng: ' + ms.toFixed(0) + ' ms');
  assert.strictEqual(n, 2000); assert.ok(Math.abs(tot - 2000 * 60.006) < 0.01, String(tot)); assert.ok(ms <= 1500, ms + ' ms');
});
