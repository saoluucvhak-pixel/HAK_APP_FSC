'use strict';
const test = require('node:test');
const assert = require('node:assert');
const {Store} = require('../src/store');
const {Lookup, parseCoord, isPlate, dedupe} = require('../src/lookup');
const {build} = require('./fixtures/make-lookup');

const fresh = () => { const s = new Store(':memory:'); const L = new Lookup(s); return {s, L}; };

test('nạp Excel đủ 3 tab, giữ CCCD/mã hợp đồng/số phiếu dạng văn bản, ngày dd/mm/yyyy', () => {
  const {L} = fresh(); const r = L.load(build(), 'excel', 'gia_lap.xlsx');
  assert.ok(r.ok, JSON.stringify(r.errors));
  assert.deepStrictEqual(r.counts, {HoSoKeo_QC: 8, HoSoRung_QC: 5, ToaDoRung_QC: 7});
  const d = L.rows("tab='HoSoRung_QC' AND k_hd='401'", [])[0];
  assert.strictEqual(d['Mã KH_CCCD'], '049000000004'); // số mất số 0 đầu được bù đủ 12 chữ số
  assert.strictEqual(L.rows("tab='HoSoKeo_QC' AND k_phieu='4001'", [])[0]['Ngày nhập'], '01/04/2026');
});

test('thiếu cột hoặc thiếu tab: báo rõ tab/cột và GIỮ bản tra cứu cũ', () => {
  const {L} = fresh(); L.load(build(), 'excel', 'a.xlsx');
  const r1 = L.load(build('missingCol'), 'excel', 'b.xlsx');
  assert.strictEqual(r1.ok, false); assert.match(r1.errors[0], /ToaDoRung_QC.*DienTich_m2/);
  const r2 = L.load(build('missingTab'), 'google', 'sheet'); assert.match(r2.errors[0], /Thiếu tab "ToaDoRung_QC"/);
  const st = L.status(); assert.strictEqual(st.active.detail, 'a.xlsx'); assert.strictEqual(st.last.ok, false);
  assert.strictEqual(L.search('', '').total, 20);
  const r3 = L.load(Buffer.from('không phải excel'), 'google', 'x'); assert.strictEqual(r3.ok, false); assert.strictEqual(L.status().active.detail, 'a.xlsx');
});

test('tìm có dấu/không dấu, theo CCCD, số phiếu, biển số, mã rừng; lọc theo tab', () => {
  const {L} = fresh(); L.load(build(), 'excel', 'x');
  assert.strictEqual(L.search('nguyen van an', 'HoSoRung_QC').total, 3);
  assert.strictEqual(L.search('NGUYỄN VĂN AN', 'HoSoRung_QC').total, 3);
  assert.strictEqual(L.search('1002/2026', '').rows[0].tab, 'HoSoKeo_QC');
  assert.strictEqual(L.search('92C-55555', 'HoSoKeo_QC').total, 1);
  assert.strictEqual(L.search('20260220_002', 'ToaDoRung_QC').total, 1);
  assert.strictEqual(L.search('049000000002', '').total, 4);
  assert.strictEqual(L.search('loc thuong', '').total >= 2, true);
});

test('ghép theo CCCD + hợp đồng: một chủ nhiều hợp đồng, trùng số hợp đồng khác CCCD, trùng tên chủ', () => {
  const {L} = fresh(); L.load(build(), 'excel', 'x');
  const hit = L.search('1001/2026', 'HoSoKeo_QC').rows[0];
  const c = L.candidates(hit.tab, hit.row);
  assert.ok(c.ok); assert.strictEqual(c.cccd, '049000000001'); assert.strictEqual(c.hd, '101');
  assert.strictEqual(c.forests.length, 1);
  assert.strictEqual(c.forests[0].maRung, '20260110_001');
  assert.strictEqual(c.forests[0].phieu.length, 3); // không lẫn phiếu của CCCD 049000000003 cùng số HĐ 101
  assert.ok(c.warns.some(w => /cũng được dùng cho 1 CCCD khác/.test(w)));
  assert.deepStrictEqual(c.others.map(o => o.hd), ['102']);
  const own = Object.fromEntries(c.owner.fields.map(f => [f.key, f.value]));
  assert.strictEqual(own.ten, 'NGUYỄN VĂN AN'); assert.strictEqual(own.cccd, '049000000001'); assert.strictEqual(own.ngayCap, '25/06/2021');
  assert.ok(c.owner.ref.some(f => f.key === 'diaChiHienTai'));
  const f = c.forests[0];
  assert.strictEqual(f.fields.find(x => x.key === 'diaDiem').value, 'Thôn Phú Cường, xã Quế Sơn Trung'); // khử chuỗi lặp
  assert.strictEqual(f.areaConflict, false); // 2,5 ha = 25.000 m²
  assert.strictEqual(f.gps.length, 2); assert.ok(f.gps[1].converted); assert.ok(Math.abs(f.gps[1].lat - 15.815586) < 1e-5);
  const p2 = f.phieu.find(p => p.soPhieu === '1002/2026/NK'); assert.strictEqual(p2.isPlate, false); // tên xe, cần ghép biển
  const p3 = f.phieu.find(p => p.soPhieu === '1003/2026/NK'); assert.match(p3.issue, /lệch/);
  assert.strictEqual(f.docs[0].loai, 'Giấy chứng nhận QSDĐ'); assert.strictEqual(f.docs[0].so, '030QSDĐ'); assert.strictEqual(f.docs.length, 1);
  // trùng tên chủ nhưng khác CCCD -> kết quả riêng
  const other = L.candidates('HoSoRung_QC', L.search('xa viet an', 'HoSoRung_QC').rows[0].row);
  assert.strictEqual(other.cccd, '049000000003'); assert.strictEqual(other.forests[0].gps[0].ok, false);
});

test('hợp đồng nhiều rừng: phiếu cân không gán sẵn; diện tích lệch giữa hai nguồn', () => {
  const {L} = fresh(); L.load(build(), 'excel', 'x');
  const c = L.candidates('HoSoRung_QC', L.search('tran thi binh', 'HoSoRung_QC').rows[0].row);
  assert.strictEqual(c.forests.length, 2); assert.strictEqual(c.forests[0].phieu[0].assignable, false);
  assert.ok(c.forests[0].warns.some(w => /phiếu cân không được chọn sẵn/.test(w)));
  const c2 = L.candidates('HoSoRung_QC', L.search('loc thuong', 'HoSoRung_QC').rows[0].row);
  assert.strictEqual(c2.forests[0].areaConflict, true); // 3 ha so với 60.000 m² = 6 ha
  const t = L.candidates('ToaDoRung_QC', L.search('20260220_002', 'ToaDoRung_QC').rows[0].row);
  assert.strictEqual(t.forests[0].maRung, '20260220_002'); // ưu tiên đúng rừng được chọn
});

test('khối lượng: thiếu cột tấn thì lấy kg / 1000; dòng không có mã khách báo lỗi', () => {
  const {L} = fresh(); L.load(build(), 'excel', 'x');
  const c = L.candidates('HoSoKeo_QC', L.search('4001', 'HoSoKeo_QC').rows[0].row);
  assert.strictEqual(c.forests[0].phieu[0].kl, 2);
  const bad = L.candidates('HoSoKeo_QC', L.search('9001/2026', 'HoSoKeo_QC').rows[0].row);
  assert.strictEqual(bad.ok, false); assert.match(bad.error, /không có CCCD/);
});

test('tọa độ: thập phân, độ-phút-giây, có chữ bán cầu, ngoài Việt Nam, nhầm cột', () => {
  assert.deepStrictEqual([parseCoord(15.6, 'lat').ok, parseCoord('15,6', 'lat').value], [true, 15.6]);
  const d = parseCoord('15.48.56.109N', 'lat'); assert.ok(d.ok && d.converted); assert.ok(Math.abs(d.value - 15.815586) < 1e-6);
  assert.ok(parseCoord('108°10\'40.827"E', 'lng').ok);
  assert.ok(parseCoord('15.605254N', 'lat').converted);
  assert.strictEqual(parseCoord(154712975, 'lat').ok, false);
  assert.match(parseCoord(108.2, 'lat').reason, /nhầm cột/);
  assert.strictEqual(parseCoord('107.763.738', 'lng').ok, false); // không rõ định dạng thì không đoán
  assert.strictEqual(parseCoord('48P8001291711525', 'lat').ok, false);
});

test('biển số và khử chuỗi lặp', () => {
  assert.ok(isPlate('92C-12345')); assert.ok(isPlate('76M-2052')); assert.ok(isPlate('43C-123.45')); assert.ok(!isPlate('XE CN NAM')); assert.ok(!isPlate('CN TÙNG'));
  assert.strictEqual(dedupe('A, B, A, B'), 'A, B'); assert.strictEqual(dedupe('Giấy chứng nhận QSDĐ, Giấy chứng nhận QSDĐ'), 'Giấy chứng nhận QSDĐ');
});
