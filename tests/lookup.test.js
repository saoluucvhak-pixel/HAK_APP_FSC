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
  assert.strictEqual(r1.ok, false); assert.match(r1.errors[0], /Tab “ToaDoRung”.*thiếu cột.*DienTich_m2/);
  const r2 = L.load(build('missingTab'), 'google', 'sheet'); assert.match(r2.errors[0], /Thiếu tab “ToaDoRung”/);
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

test('bộ lọc thông minh: trường:giá trị, loại trừ, tự nhận CCCD/biển số, cụm từ', () => {
  const {L} = fresh(); L.load(build(), 'excel', 'x');
  const r = L.search('bien:92C-55555', ''); assert.strictEqual(r.total, 1); assert.strictEqual(r.rows[0].phieu, '2001/2026/NK');
  assert.strictEqual(L.search('92c55555', '').total, 1);                      // gõ biển số không dấu gạch vẫn nhận
  assert.strictEqual(L.search('049000000002', '').rows[0].tab, 'HoSoRung_QC'); // 12 số = CCCD, khớp chính xác xếp đầu
  assert.strictEqual(L.search('cccd:049000000002', '').total, 4);
  assert.strictEqual(L.search('rung:20260220_002', '').total, 1);
  assert.strictEqual(L.search('phieu:1002', '').rows[0].phieu, '1002/2026/NK');
  assert.strictEqual(L.search('ten:"tran thi binh"', '').total >= 3, true);
  const all = L.search('nguyen van an', '').total, ex = L.search('nguyen van an -1002', '').total;
  assert.ok(ex < all);                                                         // -từ loại trừ
  assert.strictEqual(L.search('rung:101', 'HoSoKeo_QC').total, 0);             // tab không có trường rung
});

test('bộ lọc thông minh: khoảng ngày cân, khối lượng, tình trạng hợp đồng, dòng cần kiểm tra, sắp xếp', () => {
  const {L} = fresh(); L.load(build(), 'excel', 'x');
  const d = L.search('', 'HoSoKeo_QC', {from: '01/03/2026', to: '31/03/2026'}); assert.ok(d.total > 0);
  assert.ok(d.rows.every(x => x.ngay.endsWith('/03/2026')));
  assert.strictEqual(L.search('', '', {from: '2026-04-01'}).total, 1);        // chỉ HoSoKeo_QC mới có ngày cân
  const t = L.search('', 'HoSoKeo_QC', {minTan: 5, sort: 'tan'}); assert.ok(t.rows.length && t.rows.every(x => x.tanNum >= 5));
  assert.ok(t.rows[0].tanNum >= t.rows[t.rows.length - 1].tanNum);
  assert.deepStrictEqual(Object.keys(L.search('nguyen van an', '').facets.status).sort(), ['Đang thực hiện', 'Đã thanh lý']);
  assert.strictEqual(L.search('nguyen van an', '', {status: 'Đã thanh lý'}).total, 1);
  const bad = L.search('', '', {onlyIssues: true});
  assert.ok(bad.total >= 3); assert.ok(bad.rows.every(x => x.flags.length));
  assert.ok(bad.rows.some(x => x.flags.includes('Lệch tấn–kg')) && bad.rows.some(x => x.flags.includes('Biển số là tên xe')));
  const s = L.search('nguyen van an', 'HoSoKeo_QC', {sort: 'ngay'}); assert.ok(s.rows[0].dk >= s.rows[s.rows.length - 1].dk);
  assert.strictEqual(s.stats.phieu, s.total); assert.ok(s.stats.tan > 0);
});

test('bộ lọc thông minh: xếp theo độ khớp, gợi ý nới lỏng khi không có kết quả, đường nhanh', () => {
  const {L} = fresh(); L.load(build(), 'excel', 'x');
  const r = L.search('2001/2026', ''); assert.strictEqual(r.rows[0].phieu, '2001/2026/NK');
  const z = L.search('nguyen khongco', ''); assert.strictEqual(z.total, 0);
  assert.ok(z.relax.length && z.relax[0].drop === 'khongco' && z.relax[0].total > 0);
  const f = L.search('', 'HoSoRung_QC'); assert.strictEqual(f.total, 5); assert.strictEqual(f.facets.tab.HoSoKeo_QC, 8);
  assert.strictEqual(L.search('', '', 5).rows.length, 5);                      // tương thích kiểu gọi cũ (limit là số)
});

test('hồi quy bộ lọc: truy vấn sai định dạng không gây lỗi và không đổi nghĩa', () => {
  const {L} = fresh(); L.load(build(), 'excel', 'x');
  ['"abc', '"', ':::', 'cccd:', 'cccd:""', 'bien:', '%', "'; DROP TABLE lookup_rows;--", '(nguyen', '[a-z]+', 'a\\b', 'x'.repeat(3000), 'tinhtrang:', 'phieu:%'].forEach(q => assert.doesNotThrow(() => L.search(q, ''), q));
  assert.strictEqual(L.search('%', '').total, 0);                                 // % không phải ký tự đại diện
  assert.strictEqual(L.search('-', '').total, L.search('', '').total);            // token chỉ gồm dấu gạch bị bỏ qua, không loại trừ
  assert.strictEqual(L.search('"nguyen van an', '').total, L.search('nguyen van an', '').total); // ngoặc kép lẻ
  assert.strictEqual(L.search('hd: 101', '').total, L.search('hd:101', '').total); assert.ok(L.search('hd:101', '').total > 0);
  assert.strictEqual(L.search('0490 0000 0002', '').total, 4);                    // CCCD gõ có dấu cách
  assert.strictEqual(L.search('49000000002', '').total, 4);                       // CCCD mất số 0 đầu vẫn tìm được
  assert.strictEqual(L.search('049000000002', 'HoSoKeo_QC').total, 1);
  assert.ok(L.search('', 'KhongCoTab').total === 20);                             // tab lạ: bỏ qua, không lỗi
});

test('hồi quy bộ lọc: kết hợp nhiều bộ lọc, báo cảnh báo khi giá trị sai, xóa bộ lọc trở về đủ dòng', () => {
  const {L} = fresh(); L.load(build(), 'excel', 'x');
  const all = L.search('', '').total;
  const combo = L.search('nguyen', 'HoSoKeo_QC', {from: '01/01/2026', to: '31/01/2026', minTan: 3, maxTan: 5, onlyIssues: true, sort: 'ngay'});
  assert.deepStrictEqual(combo.rows.map(r => r.phieu).sort(), ['1002/2026/NK', '1003/2026/NK']); assert.deepStrictEqual(combo.warns, []);
  assert.strictEqual(L.search('', '', {}).total, all);                            // xóa bộ lọc = quay lại đủ dòng
  assert.ok(L.search('', '', {from: 'abc'}).warns[0].includes('không đúng định dạng ngày'));
  assert.ok(L.search('', 'HoSoKeo_QC', {minTan: 'x'}).warns[0].includes('không phải số'));
  const inv = L.search('', '', {from: '31/12/2026', to: '01/01/2026'}); assert.strictEqual(inv.total, 0); assert.ok(inv.warns.some(w => /sau ngày kết thúc/.test(w)));
  assert.strictEqual(L.search('', 'HoSoKeo_QC', {minTan: 10, maxTan: 1}).total, 0);
  assert.strictEqual(L.search('', 'HoSoKeo_QC', {from: '2026-01-23', to: '2026-01-23'}).rows[0].phieu, '1002/2026/NK'); // ngày dạng ô chọn ngày
});

test('hồi quy: phiếu thiếu ngày, ngày không có thật (31/02/2026), hoặc hai đơn vị chênh nhau được đánh dấu cần kiểm tra, không chọn được', () => {
  const XLSX = require('xlsx'); const wb = XLSX.read(build(), {type: 'buffer', cellDates: true, cellNF: true});
  const ws = wb.Sheets['HoSoKeo']; const head = XLSX.utils.sheet_to_json(ws, {header: 1})[0]; const col = XLSX.utils.encode_col(head.indexOf('Ngày nhập'));
  delete ws[col + '2'];                                                       // dòng 2 (phiếu 1001) mất ngày cân
  ws[col + '3'] = {t: 's', v: '31/02/2026'};                                  // dòng 3 (phiếu 1002) ngày không có thật
  ws[col + '4'] = {t: 's', v: '29/02/2028'};                                  // dòng 4 (phiếu 1003) ngày có thật (năm nhuận) dạng chữ
  const {L} = fresh(); assert.ok(L.load(XLSX.write(wb, {type: 'buffer', bookType: 'xlsx', cellDates: true}), 'excel', 'x').ok);
  const hit = L.search('1001/2026', 'HoSoKeo_QC'); assert.ok(hit.rows[0].flags.includes('Thiếu ngày cân'));
  const c = L.candidates('HoSoKeo_QC', hit.rows[0].row); const p = c.forests[0].phieu.find(x => x.soPhieu === '1001/2026/NK');
  assert.strictEqual(p.ngay, ''); assert.match(p.issue, /ngày cân/);
  const bad = L.search('1002/2026', 'HoSoKeo_QC').rows[0]; assert.ok(bad.flags.includes('Ngày cân không có thật'));
  const pb = L.candidates('HoSoKeo_QC', bad.row).forests[0].phieu.find(x => x.soPhieu === '1002/2026/NK');
  assert.strictEqual(pb.ngay, ''); assert.match(pb.issue, /Ngày cân sai: .*tháng 2\/2026 chỉ có 28 ngày/);      // không chọn được, nêu lý do
  const ok29 = L.candidates('HoSoKeo_QC', L.search('1003/2026', 'HoSoKeo_QC').rows[0].row).forests[0].phieu.find(x => x.soPhieu === '1003/2026/NK');
  assert.strictEqual(ok29.ngay, '29/02/2028'); assert.doesNotMatch(String(ok29.issue), /Ngày cân sai/);          // 29/02/2028 hợp lệ
  const inFeb = L.search('', 'HoSoKeo_QC', {from: '01/02/2026', to: '31/03/2026'}).rows.map(r => r.phieu);
  assert.ok(!inFeb.includes('1002/2026/NK') && !inFeb.includes('1001/2026/NK'));                                   // phiếu ngày sai/thiếu không lọt vào kỳ
  assert.ok(L.search('', 'HoSoKeo_QC', {from: '31/02/2026'}).warns.some(w => /Ngày bắt đầu.*không đúng định dạng/.test(w)));   // ngày lọc không có thật bị báo
  const kg = L.candidates('HoSoKeo_QC', L.search('4001', 'HoSoKeo_QC').rows[0].row).forests[0].phieu[0];
  assert.strictEqual(kg.kl, 2);                                              // 2.000 kg ÷ 1.000 khi cột tấn trống
  const diff = L.candidates('HoSoKeo_QC', L.search('1003/2026', 'HoSoKeo_QC').rows[0].row).forests[0].phieu.find(x => x.soPhieu === '1003/2026/NK');
  assert.match(diff.issue, /lệch/);                                           // 4,9 tấn so với 5.000 kg
  const area = L.candidates('HoSoRung_QC', L.search('loc thuong', 'HoSoRung_QC').rows[0].row).forests[0];
  assert.ok(area.areaConflict && area.area.length === 2 && area.area[1].value === 6); // 60.000 m² ÷ 10.000 = 6 ha, khác 3 ha của HECTA
});

test('cha–con: gom kết quả theo hợp đồng (CCCD + mã hợp đồng), dòng của 3 tab là con', () => {
  const {L} = fresh(); L.load(build(), 'excel', 'x');
  const r = L.search('nguyen van an', '', {group: 'contract'});
  assert.ok(Array.isArray(r.groups) && r.rows.length === 0 && r.groupTotal === r.groups.length);
  const g101 = r.groups.find(g => g.cccd === '049000000001' && g.hd === '101');
  assert.ok(g101); assert.strictEqual(g101.ten, 'NGUYỄN VĂN AN'); assert.strictEqual(g101.tinhTrang, 'Đang thực hiện'); assert.strictEqual(g101.hecta, null === g101.hecta ? null : g101.hecta);
  assert.strictEqual(g101.phieu, 3); assert.strictEqual(g101.tan, 12.18);               // 2,84 + 4,44 + 4,9 tấn (tấn có giá trị ưu tiên)
  assert.deepStrictEqual(g101.rungs, ['20260110_001']); assert.strictEqual(g101.flags, 2);  // phiếu tên xe + phiếu lệch + (điểm GPS lỗi nếu có)
  assert.strictEqual(g101.pick.tab, 'HoSoRung_QC');                                        // ưu tiên dòng hợp đồng để mở màn hình ghi
  // trùng số hợp đồng 101 nhưng khác CCCD -> cha riêng, không lẫn
  assert.ok(r.groups.find(g => g.cccd === '049000000003' && g.hd === '101') && r.groups.filter(g => g.hd === '101').length === 2);
  // dòng thiếu CCCD tự thành cha riêng
  const lone = L.search('9001/2026', '', {group: 'contract'}); assert.strictEqual(lone.groups.length, 1); assert.strictEqual(lone.groups[0].cccd, '');
  // kết hợp với bộ lọc: chỉ phiếu trong kỳ
  const kỳ = L.search('', 'HoSoKeo_QC', {group: 'contract', from: '01/03/2026'}); assert.ok(kỳ.groups.every(g => g.phieu >= 1) && kỳ.groups.every(g => g.matched.HoSoKeo_QC === g.phieu));
  assert.strictEqual(L.search('', '', {group: 'contract', limit: 2}).groups.length, 2);
});

const COUNTS = {HoSoKeo_QC: 8, HoSoRung_QC: 5, ToaDoRung_QC: 7};
test('tên tab chuẩn mới HoSoKeo/HoSoRung/ToaDoRung và tên cũ _QC đều đọc được, không cần ghi chú', () => {
  for (const v of [undefined, 'legacy']) {
    const r = fresh().L.load(build(v), 'excel', 'x');
    assert.ok(r.ok, JSON.stringify(r.errors)); assert.deepStrictEqual(r.counts, COUNTS); assert.deepStrictEqual(r.notes, []);
  }
});
test('tên tab khác chữ hoa/thường, khoảng trắng, dấu gạch (cả bộ mới lẫn _QC): nhận tự động và ghi chú', () => {
  for (const nm of ['HOsokeo |hosorung |  TOADORUNG', 'hosokeo_qc |HoSoRung-QC|ToaDoRung QC']) {
    const a = fresh().L.load(build('names:' + nm), 'google', 'sheet khac');
    assert.ok(a.ok, JSON.stringify(a.errors)); assert.deepStrictEqual(a.counts, COUNTS); assert.strictEqual(a.notes.length, 3); assert.match(a.notes[0], /được nhận là “HoSoKeo”/);
  }
});
test('đổi thứ tự cột và có thêm cột: nhận theo tiêu đề, dữ liệu đọc đúng như bản gốc', () => {
  const {L} = fresh(), r = L.load(build('order'), 'excel', 'x');
  assert.ok(r.ok, JSON.stringify(r.errors)); assert.deepStrictEqual(r.counts, COUNTS);
  const base = fresh().L; base.load(build(), 'excel', 'x');
  assert.deepStrictEqual(L.search('', '').total, base.search('', '').total);
  assert.strictEqual(L.rows("tab='HoSoRung_QC' AND k_hd='401'", [])[0]['Mã KH_CCCD'], '049000000004');
});
test('tên tab khác hẳn nhưng đủ cột: CHỈ ĐỀ XUẤT, chờ người dùng xác nhận; chưa xác nhận thì không đổi bản đang dùng', () => {
  const {L} = fresh(); L.load(build(), 'excel', 'goc.xlsx');
  const before = JSON.stringify(L.status());
  const r = L.load(build('names:Sheet1|Sheet2|Sheet3'), 'google', 'sheet khac', {sheetKey: 'google:S1'});
  assert.strictEqual(r.ok, false); assert.ok(r.pending && !r.errors);
  assert.deepStrictEqual(Object.fromEntries(Object.entries(r.pending).map(([k, v]) => [k, [v.kind, v.proposed]])), {HoSoKeo_QC: ['confirm', 'Sheet1'], HoSoRung_QC: ['confirm', 'Sheet2'], ToaDoRung_QC: ['confirm', 'Sheet3']});
  assert.strictEqual(JSON.stringify(L.status()), before, 'đề xuất chưa xác nhận không đổi bản tra cứu hay mốc cập nhật');
  assert.strictEqual(L.search('', '').total, 20);
});
test('xác nhận tab khác tên: nạp được, ghi nhớ ánh xạ theo ID bảng tính; lần sau không hỏi lại; bảng tính khác không dùng ánh xạ này', () => {
  const {L} = fresh(), buf = build('names:Sheet1|Sheet2|Sheet3');
  const ok1 = L.load(buf, 'google', 'x', {sheetKey: 'google:S1', choices: {HoSoKeo_QC: 'Sheet1', HoSoRung_QC: 'Sheet2', ToaDoRung_QC: 'Sheet3'}});
  assert.ok(ok1.ok, JSON.stringify(ok1.errors)); assert.deepStrictEqual(ok1.counts, COUNTS); assert.deepStrictEqual(ok1.picks, {HoSoKeo_QC: 'Sheet1', HoSoRung_QC: 'Sheet2', ToaDoRung_QC: 'Sheet3'});
  const again = L.load(buf, 'google', 'x', {sheetKey: 'google:S1'});
  assert.ok(again.ok && again.counts.HoSoKeo_QC === 8, 'đã nhớ ánh xạ nên không hỏi lại');
  const other = L.load(buf, 'google', 'x', {sheetKey: 'google:KHAC'}); assert.ok(other.pending, 'bảng tính khác ID phải xác nhận lại');
});
test('người dùng chọn tab thiếu cột: từ chối, nêu tên tab và cột thiếu, không ghi nhận ánh xạ', () => {
  const {L} = fresh(), buf = build('names:Sheet1|Sheet2|Sheet3');
  const r = L.load(buf, 'google', 'x', {sheetKey: 'google:S1', choices: {HoSoKeo_QC: 'Sheet2', HoSoRung_QC: 'Sheet1', ToaDoRung_QC: 'Sheet3'}});
  assert.strictEqual(r.ok, false); assert.match(r.errors.join(' '), /Tab “Sheet2” \(chọn làm “HoSoKeo”\) thiếu cột/);
  assert.strictEqual(L.getMeta('tabmap'), null); assert.strictEqual(L.status().active, null);
});
test('có đồng thời tên mới và tên _QC: hiển thị danh sách để chọn (đề xuất tên chuẩn); chọn xong nạp được', () => {
  const {L} = fresh(), buf = build('both');
  const r = L.load(buf, 'google', 'x', {sheetKey: 'google:S2'});
  assert.ok(r.pending); for (const role of Object.keys(COUNTS)) { const p = r.pending[role]; assert.strictEqual(p.kind, 'choose'); assert.strictEqual(p.candidates.length, 2); assert.strictEqual(p.proposed, { HoSoKeo_QC: 'HoSoKeo', HoSoRung_QC: 'HoSoRung', ToaDoRung_QC: 'ToaDoRung' }[role]); }
  const ok1 = L.load(buf, 'google', 'x', {sheetKey: 'google:S2', choices: {HoSoKeo_QC: 'HoSoKeo_QC', HoSoRung_QC: 'HoSoRung', ToaDoRung_QC: 'ToaDoRung_QC'}});
  assert.ok(ok1.ok, JSON.stringify(ok1.errors)); assert.deepStrictEqual(ok1.picks, {HoSoKeo_QC: 'HoSoKeo_QC', HoSoRung_QC: 'HoSoRung', ToaDoRung_QC: 'ToaDoRung_QC'});
  assert.ok(L.load(buf, 'google', 'x', {sheetKey: 'google:S2'}).ok, 'lần sau theo ánh xạ đã chọn');
});
test('hai tab tên tùy ý có cùng cấu trúc: không tự chọn, cho người dùng chọn', () => {
  const r = fresh().L.load(build('twin'), 'google', 'x', {sheetKey: 'google:S3'});
  assert.ok(r.pending); assert.strictEqual(r.pending.HoSoKeo_QC.kind, 'choose'); assert.deepStrictEqual(r.pending.HoSoKeo_QC.candidates.sort(), ['Sheet1', 'Sheet4']);
  assert.strictEqual(r.pending.HoSoRung_QC.kind, 'confirm');
});
test('đổi tên tab sau khi đã ánh xạ: nhận diện lại theo cấu trúc và hỏi xác nhận; trả lại tên chuẩn thì tự nhận', () => {
  const {L} = fresh();
  assert.ok(L.load(build('names:Sheet1|Sheet2|Sheet3'), 'google', 'x', {sheetKey: 'google:S4', choices: {HoSoKeo_QC: 'Sheet1', HoSoRung_QC: 'Sheet2', ToaDoRung_QC: 'Sheet3'}}).ok);
  const renamed = L.load(build('names:Phieu can|Chu rung|Toa do'), 'google', 'x', {sheetKey: 'google:S4'});
  assert.ok(renamed.pending && renamed.pending.HoSoKeo_QC.proposed === 'Phieu can', 'tab đã nhớ không còn: đề xuất theo cấu trúc, chưa tự ghi');
  assert.strictEqual(L.search('', '').total, 20, 'bản đang dùng không đổi trong lúc chờ xác nhận');
  const back = L.load(build(), 'google', 'x', {sheetKey: 'google:S4'}); assert.ok(back.ok && back.notes.length === 0);
});
test('thiếu cột bắt buộc khi tên tab đúng chuẩn: báo tên tab và tên cột, giữ bản cũ', () => {
  const {L} = fresh(); L.load(build(), 'excel', 'a.xlsx');
  const r = L.load(build('missingCol'), 'excel', 'b.xlsx');
  assert.strictEqual(r.ok, false); assert.match(r.errors[0], /Tab “ToaDoRung” \(vai trò “ToaDoRung”\) thiếu cột: “DienTich_m2”/);
  assert.strictEqual(L.status().active.detail, 'a.xlsx');
});
test('thiếu tab thật sự: báo rõ file đang có những tab nào', () => {
  const r = fresh().L.load(build('missingTab'), 'google', 'x');
  assert.strictEqual(r.ok, false); assert.match(r.errors[0], /Thiếu tab “ToaDoRung”/); assert.ok(r.errors.some(e => /File đang có các tab: “HoSoKeo”, “HoSoRung”/.test(e)), JSON.stringify(r.errors));
  const w = fresh().L.load(build('names:Sheet1|Sheet2|Sheet3').constructor === Buffer ? Buffer.from('x') : Buffer.from('x'), 'google', 'x'); assert.strictEqual(w.ok, false);
});

test('file mẫu tra cứu: ba tab tên chuẩn, đủ cột bắt buộc, nạp được (rỗng) và cột mã/CCCD định dạng văn bản', () => {
  const XLSX = require('xlsx'), {buildTemplate, TABS, TAB_NAMES, STD, allCols} = require('../src/lookup');
  const buf = buildTemplate('9.9.9'), wb = XLSX.read(buf, {type: 'buffer', cellNF: true});
  assert.deepStrictEqual(wb.SheetNames, ['HUONG_DAN', 'HoSoKeo', 'HoSoRung', 'ToaDoRung']);
  for (const r of TAB_NAMES) assert.deepStrictEqual(XLSX.utils.sheet_to_json(wb.Sheets[STD[r]], {header: 1})[0], allCols(r));
  const guide = XLSX.utils.sheet_to_json(wb.Sheets.HUONG_DAN, {header: 1}).map(x => x.join(' ')).join('\n');
  assert.ok(/9\.9\.9/.test(guide) && /_QC/.test(guide) && /xác nhận/.test(guide));
  const ws = wb.Sheets.HoSoRung, col = XLSX.utils.encode_col(TABS.HoSoRung_QC.req.indexOf('Mã KH_CCCD'));
  assert.strictEqual(ws[col + '2'].z, '@', 'cột CCCD là văn bản để giữ số 0 đầu');
  const r = fresh().L.load(buf, 'excel', 'mau.xlsx'); assert.ok(r.ok, JSON.stringify(r.errors)); assert.deepStrictEqual(r.counts, {HoSoKeo_QC: 0, HoSoRung_QC: 0, ToaDoRung_QC: 0});
});

test('một tab không được gán cho hai vai trò: lựa chọn mới trùng → không nạp, nêu tên tab và hai vai trò, cho chọn lại', () => {
  const {L} = fresh(), buf = build('names:Sheet1|Sheet2|Sheet3');
  assert.ok(L.load(buf, 'google', 'x', {sheetKey: 'google:D1', choices: {HoSoKeo_QC: 'Sheet1', HoSoRung_QC: 'Sheet2', ToaDoRung_QC: 'Sheet3'}}).ok);
  const before = L.status().active.loadedAt, tm = JSON.stringify(L.getMeta('tabmap'));
  const r = L.load(buf, 'google', 'x', {sheetKey: 'google:D1', choices: {HoSoKeo_QC: 'Sheet1', HoSoRung_QC: 'Sheet1', ToaDoRung_QC: 'Sheet3'}});
  assert.strictEqual(r.ok, false); assert.ok(r.pending, 'cho chọn lại'); assert.match(r.conflicts.join(' '), /Tab “Sheet1” đang được gán cho cả “HoSoKeo” và “HoSoRung”/);
  assert.ok(r.pending.HoSoKeo_QC && r.pending.HoSoRung_QC && !r.pending.ToaDoRung_QC);
  assert.strictEqual(L.status().active.loadedAt, before, 'giữ bản tra cứu gần nhất và thời điểm nạp thành công'); assert.strictEqual(JSON.stringify(L.getMeta('tabmap')), tm, 'không ghi đè ánh xạ đã nhớ');
});
test('ánh xạ đã nhớ gán một tab cho hai vai trò: không nạp, báo lỗi, cho chọn lại', () => {
  const {L} = fresh(), buf = build('names:Sheet1|Sheet2|Sheet3');
  assert.ok(L.load(buf, 'google', 'x', {sheetKey: 'google:D2', choices: {HoSoKeo_QC: 'Sheet1', HoSoRung_QC: 'Sheet2', ToaDoRung_QC: 'Sheet3'}}).ok);
  L.setMeta('tabmap', {'google:D2': {HoSoKeo_QC: 'Sheet1', HoSoRung_QC: 'Sheet1', ToaDoRung_QC: 'Sheet3'}});
  const r = L.load(buf, 'google', 'x', {sheetKey: 'google:D2'});
  assert.strictEqual(r.ok, false); assert.match(r.conflicts.join(' '), /Tab “Sheet1” đang được gán cho cả “HoSoKeo” và “HoSoRung”/);
  const fix = L.load(buf, 'google', 'x', {sheetKey: 'google:D2', choices: {HoSoKeo_QC: 'Sheet1', HoSoRung_QC: 'Sheet2'}});
  assert.ok(fix.ok, JSON.stringify(fix.errors || fix.conflicts)); assert.strictEqual(fix.picks.HoSoRung_QC, 'Sheet2');
});
test('HoSoKeo chỉ cần MỘT trong hai cột “KL hàng (KG)” / “Khối lượng (Tấn)”', () => {
  const sumT = r => r.rows.reduce((q, x) => q + (x.tanNum || 0), 0);
  const a = fresh().L; assert.ok(a.load(build('kgOnly'), 'excel', 'kg.xlsx').ok); const t1 = a.search('', 'HoSoKeo_QC', {limit: 50});
  assert.ok(Math.abs(sumT(t1) - (2.84 + 4.44 + 5 + 3 + 6 + 7 + 1 + 2)) < 1e-9, 'kg-only: chia 1000, tổng ' + sumT(t1));
  const b = fresh().L; assert.ok(b.load(build('tanOnly'), 'excel', 'tan.xlsx').ok); const t2 = b.search('', 'HoSoKeo_QC', {limit: 50});
  assert.ok(Math.abs(sumT(t2) - (2.84 + 4.44 + 4.9 + 3 + 6 + 7 + 1)) < 1e-9, 'tấn-only: ' + sumT(t2));
  assert.ok(t2.rows.some(x => (x.flags || []).join().includes('Thiếu khối lượng')), 'dòng 8 không có tấn bị báo thiếu khối lượng');
  const both = fresh().L; assert.ok(both.load(build(), 'excel', 'ca.xlsx').ok);
  const cd = both.candidates('HoSoRung_QC', both.search('', 'HoSoRung_QC', {limit: 50}).rows.find(x => x.hd === '101' && x.cccd === '049000000001').row);
  const iss = JSON.stringify(cd); assert.ok(/Phiếu cân 1003\/2026\/NK: khối lượng lệch, cột Tấn = 4\.9 và cột KG = 5000/.test(iss), 'cả hai cột lệch: nêu số phiếu và cả hai giá trị');
  const c = fresh().L, r = c.load(build('noWeight'), 'excel', 'khong.xlsx');
  assert.strictEqual(r.ok, false); assert.match(r.errors.join(' '), /Tab “HoSoKeo” \(vai trò “HoSoKeo”\) thiếu cột: một trong hai cột “KL hàng \(KG\)” hoặc “Khối lượng \(Tấn\)”/);
});

test('phiếu cân lấy thêm giờ cân 1/2, cân lần 1/2 (kg), khối lượng kg và tấn, khách hàng', () => {
  const {L} = fresh(); assert.ok(L.load(build(), 'excel', 'gia_lap.xlsx').ok);
  const hit = L.search('1001/2026', 'HoSoKeo_QC').rows[0], c = L.candidates(hit.tab, hit.row), p = c.forests.flatMap(f => f.phieu).find(x => x.soPhieu === '1001/2026/NK');
  assert.ok(p, 'có phiếu 1001'); assert.strictEqual(p.gioCan1, '08:15:00'); assert.strictEqual(p.gioCan2, '09:40:00');
  assert.strictEqual(p.can1, 6840); assert.strictEqual(p.can2, 4000); assert.strictEqual(p.klKg, 2840); assert.strictEqual(p.klTan, 2.84); assert.strictEqual(p.khachHang, 'NGUYỄN VĂN AN'); assert.strictEqual(p.maKhachHang, '049000000001');
  const k = c.forests.flatMap(f => f.phieu).find(x => x.soPhieu === '1004/2026/NK');
  if (k) assert.strictEqual(k.khachHang, 'NGUYỄN VĂN AN', 'bỏ hậu tố _001 của tên khách hàng');
  const L2 = fresh().L; assert.ok(L2.load(build('tanOnly'), 'excel', 't.xlsx').ok);
  const h2 = L2.search('1001/2026', 'HoSoKeo_QC').rows[0], q = L2.candidates(h2.tab, h2.row).forests.flatMap(f => f.phieu).find(x => x.soPhieu === '1001/2026/NK');
  assert.strictEqual(q.klKg, 2840, 'chỉ có cột tấn: kg = tấn × 1000'); assert.strictEqual(q.klTan, 2.84);
});

test('số tiền trong bảng tính: số thật, chữ có dấu chấm nghìn, dấu phẩy thập phân; không phải số dương thì không có', () => {
  const {moneyOf} = require('../src/lookup');
  assert.strictEqual(moneyOf(1250000), 1250000); assert.strictEqual(moneyOf('1.250.000'), 1250000); assert.strictEqual(moneyOf('1,250,000'), 1250000); assert.strictEqual(moneyOf('1.250.000,5'), 1250000.5);
  assert.strictEqual(moneyOf('1250 đ'), 1250); assert.strictEqual(moneyOf(0), null); assert.strictEqual(moneyOf(-5), null); assert.strictEqual(moneyOf(''), null); assert.strictEqual(moneyOf('Đã thanh toán'), null); assert.strictEqual(moneyOf(undefined), null);
});

test('phiếu cân từ Google Sheets có đơn giá và thành tiền (cột “Đơn giá”, “Thanh toán”) để in phiếu cân', () => {
  const {L} = fresh(); L.load(build(), 'excel', 'x');
  const c = L.candidates('HoSoKeo_QC', L.search('1001/2026', '').rows[0].row), f = c.forests[0], p = f.phieu.find(x => x.soPhieu === '1001/2026/NK');
  assert.strictEqual(p.donGia, 1500000); assert.strictEqual(p.thanhTien, 4260000);   // 2.840 kg × 1.500.000 đ/tấn
  assert.ok(f.phieu.every(x => x.donGia === null || typeof x.donGia === 'number') && f.phieu.every(x => x.thanhTien === null || typeof x.thanhTien === 'number'));
});


test('đối chiếu bản tra cứu: rừng thiếu/không dùng được tọa độ, phiếu cân thiếu hồ sơ rừng, tọa độ thiếu hồ sơ rừng, rừng chưa có phiếu', () => {
  const {L} = fresh(); L.load(build(), 'excel', 'x');
  let a = L.audit();
  assert.strictEqual(a.ok, true); assert.deepStrictEqual(a.counts, {HoSoRung: 5, ToaDoRung: 7, HoSoKeo: 8});
  assert.deepStrictEqual(a.rungThieuToaDo.map(x => x.hd), ['101']); assert.match(a.rungThieuToaDo[0].lyDo, /tọa độ không dùng được/); assert.strictEqual(a.rungThieuToaDo[0].cccd, '049000000003');   // vĩ độ 154712975 sai
  assert.deepStrictEqual(a.phieuThieuHoSoRung.map(x => [x.hd, x.soPhieu, x.tan]), [['999', 1, 1]]); assert.match(a.phieuThieuHoSoRung[0].goiY, /chưa có trong HoSoRung/);   // phiếu 9001 không có CCCD và hợp đồng 999
  assert.deepStrictEqual(a.toaDoThieuHoSoRung, []); assert.deepStrictEqual(a.rungChuaCoPhieu, []);
  // bỏ toàn bộ ToaDoRung của hợp đồng 201 → rừng thiếu tọa độ; bỏ HoSoRung 201 → phiếu và tọa độ mồ côi, và hợp đồng 401 bị bỏ phiếu → rừng chưa có phiếu
  L.db.prepare("DELETE FROM lookup_rows WHERE tab='ToaDoRung_QC' AND k_hd='201'").run();
  a = L.audit(); assert.ok(a.rungThieuToaDo.some(x => x.hd === '201' && x.soDongToaDo === 0 && /không có dòng nào/.test(x.lyDo)));
  L.db.prepare("DELETE FROM lookup_rows WHERE tab='HoSoKeo_QC' AND k_hd='401'").run();
  a = L.audit(); assert.deepStrictEqual(a.rungChuaCoPhieu.map(x => x.hd), ['401']);
  L.db.prepare("DELETE FROM lookup_rows WHERE tab='HoSoRung_QC' AND k_hd='201'").run();
  a = L.audit(); assert.ok(!a.rungThieuToaDo.some(x => x.hd === '201'));
  const p = a.phieuThieuHoSoRung.find(x => x.hd === '201'); assert.ok(p && p.soPhieu === 1 && p.tan === 6 && p.vd === '2001/2026/NK' && p.tuNgay === '01/03/2026');
});
test('đối chiếu khi chưa có bản tra cứu', () => { const {L} = fresh(); assert.deepStrictEqual(L.audit(), {ok: false, noData: true}); });

test('đối chiếu cấp lô: hợp đồng có hai lô mà chỉ một lô có tọa độ; phiếu cân không ghi mã lô thì “chưa xác định được lô”, không tự gán', () => {
  const {L} = fresh(); L.load(build(), 'excel', 'x');
  const rows = L.rows("tab='ToaDoRung_QC' AND k_hd='101' AND k_cccd='049000000001'", []); assert.strictEqual(rows.length, 2);
  const d = {...rows[1]}; delete d._tab; delete d._row; d['Mã rừng'] = 'HAKQN01B'; d['Latitude_Vĩ độ'] = 'abc';   // lô thứ hai của hợp đồng 101: tọa độ hỏng
  L.db.prepare("UPDATE lookup_rows SET data=? WHERE tab='ToaDoRung_QC' AND row_no=?").run(JSON.stringify(d), rows[1]._row);
  const a = L.audit(), lo = a.rungThieuToaDo.filter(x => x.hd === '101' && x.cccd === '049000000001');
  assert.deepStrictEqual(lo.map(x => [x.maRung, x.kind]), [['HAKQN01B', 'sai']]);   // lô 20260110_001 có tọa độ nên không bị báo; chỉ lô HAKQN01B
  assert.match(lo[0].lyDo, /Lô HAKQN01B/); assert.match(lo[0].lyDo, /tọa độ không dùng được/); assert.strictEqual(lo[0].soLo, 2);
  const mo = a.phieuChuaXacDinhLo.find(x => x.hd === '101' && x.cccd === '049000000001');
  assert.ok(mo); assert.strictEqual(mo.soPhieu, 3); assert.strictEqual(mo.tan, 12.18); assert.strictEqual(mo.loCoThe, '20260110_001, HAKQN01B'); assert.strictEqual(mo.tab, 'HoSoKeo_QC'); assert.match(mo.dongKeo, /\d/); assert.match(mo.lyDo, /Chưa xác định được lô/); assert.match(mo.vd, /1001\/2026\/NK/);
  assert.ok(!a.rungChuaCoPhieu.some(x => x.hd === '101' && x.cccd === '049000000001'));
  // hợp đồng chỉ một lô: phiếu gán rõ, không vào danh sách “chưa xác định”
  assert.ok(a.phieuChuaXacDinhLo.some(x => x.hd === '201' && x.soLo === 2 && x.soPhieu === 1));   // hợp đồng 201 của dữ liệu thử cũng có hai lô
  assert.ok(!a.phieuChuaXacDinhLo.some(x => x.hd === '401'));   // hợp đồng một lô: phiếu gán rõ ràng
  // dòng tọa độ không ghi Mã rừng
  const t2 = L.rows("tab='ToaDoRung_QC' AND k_hd='201'", [])[0], e = {...t2}; delete e._tab; delete e._row; e['Mã rừng'] = '';
  L.db.prepare("UPDATE lookup_rows SET data=? WHERE tab='ToaDoRung_QC' AND row_no=?").run(JSON.stringify(e), t2._row);
  assert.ok(L.audit().rungThieuToaDo.some(x => x.hd === '201' && x.kind === 'thieuMa' && /không ghi Mã rừng/.test(x.lyDo)));
});
