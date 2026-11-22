'use strict';
/* G2 — TEST VIẾT TRƯỚC cho src/phanbophieu.js (phanBoPhieu). Thiết kế: docs/THIET_KE_DU_LIEU_DOI_SO_PHAN_BO.md mục 3.2 + 5.1;
 * quyết định CHỦ: Phụ lục QĐ của docs/DAC_TA_GOOGLE_SHEETS_THEO_HOP_DONG.md (QĐ1 dự kiến = hecta từng rừng × tấn/ha; QĐ2 "vượt" tính so dự kiến thuần; QĐ3 hợp đồng 1 rừng thiếu hecta vẫn nhận mọi phiếu).
 * Dữ liệu CHỈ GIẢ LẬP. Ở G2 các test này phải ĐỎ vì CHUA_CAI_DAT. */
const test = require('node:test'), assert = require('node:assert');
const {phanBoPhieu} = require('../src/phanbophieu');
const B = require('../src/bks');

/* phiếu: P('GL2-0001','06/11/2026',20500, {row}) ; key = khóa nghiệp vụ như HAKBks.khoaPhieu */
let _r = 0;
const P = (so, ngay, kg, x) => Object.assign({key: B.khoaPhieu({soPhieu: so, ngay}), so, ngay, kg, row: ++_r}, x || {});
const R = (id, ha, dinhMuc) => ({id, ha, dinhMuc});
const deep = o => { Object.freeze(o); Object.values(o).forEach(v => { if (v && typeof v === 'object' && !Object.isFrozen(v)) deep(v); }); return o; };
const gan = r => Object.fromEntries(r.gan.map(g => [g.key, g.rungId]));
const rungOf = (r, id) => r.rung.find(x => x.id === id);
const ma = (r, m, rungId) => r.canhBao.filter(c => c.ma === m && (rungId === undefined || c.rungId === rungId));
const kOf = (so, ngay) => B.khoaPhieu({soPhieu: so, ngay});

/* HD-GL-0002: 9 phiếu cố ý xáo thứ tự; rừng 1 = 0,65 ha × 95 = 61,75 t; rừng 2 = 0,55 × 95 = 52,25 t */
const hd2 = () => [P('GL2-0004', '07/11/2026', 21200), P('GL2-0001', '06/11/2026', 20500), P('GL2-0009', '10/11/2026', 20000), P('GL2-0002', '06/11/2026', 20000), P('GL2-0006', '08/11/2026', 20400),
  P('GL2-0003', '07/11/2026', 21100), P('GL2-0008', '09/11/2026', 21000), P('GL2-0005', '08/11/2026', 20800), P('GL2-0007', '09/11/2026', 20600)];
const rung2 = () => [R('R1', 0.65, 95), R('R2', 0.55, 95)];
const SO2 = n => 'GL2-000' + n;

test('PB-01 HD-GL-0002: 2 rừng, dung sai 5 %: phiếu 1-3 vào rừng 1 (61,600 t), 4-9 vào rừng 2 (124,000 t); xử lý theo ngày rồi số phiếu; vượt tính so dự kiến thuần (QĐ2) = 71,750 t', () => {
  const r = phanBoPhieu(hd2(), rung2(), 0.05, [], {giuTay: true, nhanDu: true});
  assert.strictEqual(r.ok, true);
  const g = gan(r);
  [1, 2, 3].forEach(n => assert.strictEqual(g[kOf(SO2(n), n < 3 ? '06/11/2026' : '07/11/2026')], 'R1'));
  assert.deepStrictEqual(r.gan.map(x => x.key), ['GL2-0001|', 'GL2-0002|', 'GL2-0003|', 'GL2-0004|', 'GL2-0005|', 'GL2-0006|', 'GL2-0007|', 'GL2-0008|', 'GL2-0009|'].map((s, i) => kOf(SO2(i + 1), ['06/11/2026', '06/11/2026', '07/11/2026', '07/11/2026', '08/11/2026', '08/11/2026', '09/11/2026', '09/11/2026', '10/11/2026'][i])), 'thứ tự xử lý: ngày tăng rồi số phiếu');
  assert.deepStrictEqual(r.gan.map(x => x.rungId), ['R1', 'R1', 'R1', 'R2', 'R2', 'R2', 'R2', 'R2', 'R2']);
  assert.ok(r.gan.every(x => x.cach === 'tu-dong'));
  assert.strictEqual(rungOf(r, 'R1').tongKg, 61600); assert.strictEqual(rungOf(r, 'R2').tongKg, 124000);
  assert.strictEqual(rungOf(r, 'R1').duKienKg, 61750); assert.strictEqual(rungOf(r, 'R2').duKienKg, 52250);
  assert.strictEqual(ma(r, 'vuot-du-kien', 'R2').length, 1); assert.strictEqual(ma(r, 'vuot-du-kien', 'R2')[0].vuotKg, 71750);
  assert.strictEqual(ma(r, 'vuot-du-kien', 'R1').length, 0);
  assert.strictEqual(ma(r, 'trong-dung-sai', 'R1').length, 0, 'rừng 1 chưa chạm dự kiến');
});
test('PB-01b kết quả HD-GL-0002 như nhau ở dung sai 0 % và 30 %', () => {
  [0, 0.3].forEach(ds => { const r = phanBoPhieu(hd2(), rung2(), ds, [], {giuTay: true, nhanDu: true}); assert.deepStrictEqual(r.gan.map(x => x.rungId), ['R1', 'R1', 'R1', 'R2', 'R2', 'R2', 'R2', 'R2', 'R2']); });
});
test('PB-02 hợp đồng 1 rừng: mọi phiếu vào rừng đó, cach = mot-rung (HD-GL-0001, 61,600 t < 76,00 t)', () => {
  const ps = [P('GL1-0001', '06/11/2026', 20500), P('GL1-0002', '06/11/2026', 19980), P('GL1-0003', '07/11/2026', 21120)];
  const r = phanBoPhieu(ps, [R('R1', 0.8, 95)], 0.05, [], {giuTay: true, nhanDu: true});
  assert.strictEqual(r.gan.length, 3); assert.ok(r.gan.every(x => x.rungId === 'R1' && x.cach === 'mot-rung')); assert.strictEqual(rungOf(r, 'R1').tongKg, 61600);
  assert.strictEqual(ma(r, 'vuot-du-kien').length, 0);
});
test('PB-02b QĐ3: hợp đồng 1 rừng thiếu hecta hoặc định mức vẫn nhận MỌI phiếu, chỉ cảnh báo thiếu dự kiến, không cảnh báo vượt', () => {
  [R('R1', null, 95), R('R1', 0.8, null), R('R1', undefined, undefined)].forEach(rg => {
    const r = phanBoPhieu([P('A1', '06/11/2026', 20000), P('A2', '07/11/2026', 99000)], [rg], 0.05, [], {giuTay: true, nhanDu: true});
    assert.strictEqual(r.gan.length, 2); assert.ok(r.gan.every(x => x.rungId === 'R1' && x.cach === 'mot-rung'));
    assert.strictEqual(ma(r, 'thieu-du-kien').length >= 1, true); assert.strictEqual(ma(r, 'vuot-du-kien').length, 0);
  });
});
test('PB-02c 1 rừng có dự kiến mà tổng vượt: cảnh báo vuot-du-kien với vuotKg so dự kiến thuần, vẫn gán hết', () => {
  const r = phanBoPhieu([P('A1', '06/11/2026', 30000), P('A2', '07/11/2026', 30000)], [R('R1', 0.5, 100)], 0.05, [], {giuTay: true, nhanDu: true});   // dự kiến 50.000
  assert.strictEqual(r.gan.length, 2); assert.strictEqual(ma(r, 'vuot-du-kien', 'R1')[0].vuotKg, 10000);
});
test('PB-03 phieu rỗng: ok, gan rỗng; daDung vẫn được tính vào rung[]; phiếu đã có không bị phân bổ lại (idempotent, P8)', () => {
  const r = phanBoPhieu([], rung2(), 0.05, [{rungId: 'R1', kg: 23500}], {giuTay: true, nhanDu: true});
  assert.strictEqual(r.ok, true); assert.deepStrictEqual(r.gan, []); assert.deepStrictEqual(r.chuaPhanBo, []);
  assert.strictEqual(rungOf(r, 'R1').daDungKg, 23500); assert.strictEqual(rungOf(r, 'R1').themKg, 0); assert.strictEqual(rungOf(r, 'R1').tongKg, 23500);
});
test('PB-03b rungs rỗng: mọi phiếu vào chuaPhanBo khong-co-rung', () => {
  const r = phanBoPhieu([P('A1', '06/11/2026', 1000), P('A2', '06/11/2026', 1000)], [], 0.05, [], {giuTay: true, nhanDu: true});
  assert.deepStrictEqual(r.gan, []); assert.deepStrictEqual(r.chuaPhanBo.map(x => x.lyDo), ['khong-co-rung', 'khong-co-rung']);
});
test('PB-04 phiếu đã có trong lô tính vào "đã dùng": daDung R1 = 50.000 kg, giới hạn 64.837 → phiếu 14.837 vào R1, phiếu 14.838 sang R2', () => {
  const ds = [{rungId: 'R1', kg: 50000}];
  const a = phanBoPhieu([P('A1', '06/11/2026', 14837)], rung2(), 0.05, ds, {giuTay: true, nhanDu: true}); assert.strictEqual(a.gan[0].rungId, 'R1');
  const b = phanBoPhieu([P('A1', '06/11/2026', 14838)], rung2(), 0.05, ds, {giuTay: true, nhanDu: true}); assert.strictEqual(b.gan[0].rungId, 'R2');
});
test('PB-04b biến thể 3.2a/3.2b HD-GL-0002: lô sẵn 23,5 t → GL2-0003 vẫn vào rừng 1 (64,6 ≤ 64,837); lô sẵn 24,5 t → GL2-0003 sang rừng 2', () => {
  const sans = hd2().filter(p => p.so !== 'GL2-0001');
  const a = phanBoPhieu(sans, rung2(), 0.05, [{rungId: 'R1', kg: 23500}], {giuTay: true, nhanDu: true});
  assert.strictEqual(gan(a)[kOf('GL2-0003', '07/11/2026')], 'R1'); assert.strictEqual(gan(a)[kOf('GL2-0004', '07/11/2026')], 'R2'); assert.strictEqual(rungOf(a, 'R1').tongKg, 64600);
  const b = phanBoPhieu(sans, rung2(), 0.05, [{rungId: 'R1', kg: 24500}], {giuTay: true, nhanDu: true});
  assert.strictEqual(gan(b)[kOf('GL2-0002', '06/11/2026')], 'R1'); assert.strictEqual(gan(b)[kOf('GL2-0003', '07/11/2026')], 'R2');
});
test('PB-04c daDung có rungId lạ: không cộng, có cảnh báo da-dung-khong-ro-rung', () => {
  const r = phanBoPhieu([P('A1', '06/11/2026', 1000)], rung2(), 0.05, [{rungId: 'ZZ', kg: 99999}], {giuTay: true, nhanDu: true});
  assert.strictEqual(ma(r, 'da-dung-khong-ro-rung').length, 1); assert.strictEqual(rungOf(r, 'R1').daDungKg, 0); assert.strictEqual(r.gan[0].rungId, 'R1');
});
test('PB-05 nhiều rừng thiếu dự kiến (HD-GL-0008): không tự nhận, lyDo thieu-du-kien (P10); đặt tay vẫn gán được', () => {
  const rs = [R('R1', null, 95), R('R2', undefined, 95)];
  const r = phanBoPhieu([P('GL8-0001', '10/11/2026', 20000), P('GL8-0002', '11/11/2026', 20000)], rs, 0.05, [], {giuTay: true, nhanDu: true});
  assert.deepStrictEqual(r.gan, []); assert.deepStrictEqual(r.chuaPhanBo.map(x => x.lyDo), ['thieu-du-kien', 'thieu-du-kien']);
  assert.ok(ma(r, 'chua-phan-bo').length >= 1 && ma(r, 'chua-phan-bo')[0].n === 2);
  const t = phanBoPhieu([P('GL8-0001', '10/11/2026', 20000, {rungTay: 'R2'}), P('GL8-0002', '11/11/2026', 20000)], rs, 0.05, [], {giuTay: true, nhanDu: true});
  assert.deepStrictEqual(t.gan.map(x => [x.rungId, x.cach]), [['R2', 'tay']]); assert.strictEqual(t.chuaPhanBo[0].lyDo, 'thieu-du-kien');
});
test('PB-05b rừng thiếu dự kiến không bao giờ nhận phiếu tự động (P10); ha/định mức là chuỗi, âm, 0, NaN coi là thiếu', () => {
  [R('R1', '0.65', 95), R('R1', -1, 95), R('R1', 0, 95), R('R1', NaN, 95), R('R1', 0.65, 0), R('R1', 0.65, '95')].forEach(bad => {
    const r = phanBoPhieu([P('A1', '06/11/2026', 20000), P('A2', '07/11/2026', 20000)], [bad, R('R2', 0.65, 95)], 0.05, [], {giuTay: true, nhanDu: true});
    assert.ok(r.gan.every(x => x.rungId === 'R2'), JSON.stringify(bad)); assert.strictEqual(rungOf(r, 'R1').themKg, 0);
  });
});
test('PB-06 rungTay + giuTay: đặt tay được giữ và cộng vào tích lũy; giuTay=false bỏ đặt tay, tính lại toàn bộ (nút "Phân bổ tự động")', () => {
  const mk = () => { const ps = hd2(); ps.find(p => p.so === 'GL2-0002').rungTay = 'R2'; return ps; };
  const a = phanBoPhieu(mk(), rung2(), 0.05, [], {giuTay: true, nhanDu: true});
  assert.deepStrictEqual(a.gan.find(x => x.key === kOf('GL2-0002', '06/11/2026')), {key: kOf('GL2-0002', '06/11/2026'), rungId: 'R2', cach: 'tay', kg: 20000});
  assert.strictEqual(rungOf(a, 'R1').tongKg, 62800, 'GL2-0001 + 0003 + 0004 (0002 đã đặt tay sang R2, tính vào tích lũy R2)');
  const b = phanBoPhieu(mk(), rung2(), 0.05, [], {giuTay: false, nhanDu: true});
  assert.deepStrictEqual(b.gan.map(x => x.rungId), ['R1', 'R1', 'R1', 'R2', 'R2', 'R2', 'R2', 'R2', 'R2']); assert.ok(b.gan.every(x => x.cach === 'tu-dong'));
});
test('PB-06b phiếu đặt tay cộng vào tích lũy của rừng trước khi chạy tự động', () => {
  const ps = [P('A1', '06/11/2026', 30000, {rungTay: 'R1'}), P('A2', '07/11/2026', 20000), P('A3', '08/11/2026', 20000)];   // R1 dự kiến 40.000, giới hạn 40.000 (dung sai 0)
  const r = phanBoPhieu(ps, [R('R1', 0.4, 100), R('R2', 0.3, 100)], 0, [], {giuTay: true, nhanDu: true});
  assert.strictEqual(gan(r)[kOf('A2', '07/11/2026')], 'R2'); assert.strictEqual(rungOf(r, 'R1').tongKg, 30000);
});
test('PB-07 rungTay rỗng = người dùng bỏ: nguoi-dung-bo, không bao giờ vào gan; rungTay id lạ: rung-khong-ton-tai', () => {
  const r = phanBoPhieu([P('A1', '06/11/2026', 1000, {rungTay: ''}), P('A2', '06/11/2026', 1000, {rungTay: 'ZZ'}), P('A3', '06/11/2026', 1000)], rung2(), 0.05, [], {giuTay: true, nhanDu: true});
  assert.deepStrictEqual(Object.fromEntries(r.chuaPhanBo.map(x => [x.key, x.lyDo])), {[kOf('A1', '06/11/2026')]: 'nguoi-dung-bo', [kOf('A2', '06/11/2026')]: 'rung-khong-ton-tai'});
  assert.deepStrictEqual(r.gan.map(x => x.key), [kOf('A3', '06/11/2026')]);
});
test('PB-08 dung sai 0 % (HD-GL-0007): tích lũy đúng bằng dự kiến 40.000 vẫn ở rừng 1 (≤), phiếu 15.000 sang rừng 2', () => {
  const ps = [P('GL7-0001', '08/11/2026', 20000), P('GL7-0002', '08/11/2026', 20000), P('GL7-0003', '09/11/2026', 15000)];
  const r = phanBoPhieu(ps, [R('R1', 0.4, 100), R('R2', 0.3, 100)], 0, [], {giuTay: true, nhanDu: true});
  assert.deepStrictEqual(r.gan.map(x => x.rungId), ['R1', 'R1', 'R2']); assert.strictEqual(rungOf(r, 'R1').tongKg, 40000);
  const r2 = phanBoPhieu([P('A1', '08/11/2026', 20000), P('A2', '08/11/2026', 20001)], [R('R1', 0.4, 100), R('R2', 0.3, 100)], 0, [], {giuTay: true, nhanDu: true});
  assert.deepStrictEqual(r2.gan.map(x => x.rungId), ['R1', 'R2'], 'thêm 1 kg thì sang rừng sau');
});
test('PB-08b dung sai 30 %: giới hạn = dự kiến × 1,3; phiếu vừa đúng bằng giới hạn vào, +1 kg sang rừng sau', () => {
  const rs = [R('R1', 0.5, 100), R('R2', 0.5, 100)];   // 50.000 → 65.000
  const a = phanBoPhieu([P('A1', '06/11/2026', 65000)], rs, 0.3, [], {giuTay: true, nhanDu: true}); assert.strictEqual(a.gan[0].rungId, 'R1'); assert.strictEqual(rungOf(a, 'R1').gioiHanKg, 65000);
  const b = phanBoPhieu([P('A1', '06/11/2026', 65001)], rs, 0.3, [], {giuTay: true, nhanDu: true}); assert.strictEqual(b.gan[0].rungId, 'R2');
});
test('PB-09 giới hạn bằng số nguyên: 61,75 t × 5 % = 64.837 kg (không 64.838); phiếu đưa tích lũy tới 64.837 vào R1, 64.838 sang R2', () => {
  const r = phanBoPhieu([P('A1', '06/11/2026', 64837)], rung2(), 0.05, [], {giuTay: true, nhanDu: true});
  assert.strictEqual(rungOf(r, 'R1').gioiHanKg, 64837); assert.strictEqual(r.gan[0].rungId, 'R1');
  assert.strictEqual(phanBoPhieu([P('A1', '06/11/2026', 64838)], rung2(), 0.05, [], {giuTay: true, nhanDu: true}).gan[0].rungId, 'R2');
  assert.strictEqual(rungOf(r, 'R1').duKienKg, 61750);
});
test('PB-09b không sinh sai số dấu phẩy động: dự kiến 100.000 kg, dung sai 0,01…0,30 cho giới hạn nguyên chính xác', () => {
  [0, 0.01, 0.05, 0.07, 0.1, 0.29, 0.3].forEach(ds => {
    const r = phanBoPhieu([P('A1', '06/11/2026', 1)], [R('R1', 1, 100), R('R2', 1, 100)], ds, [], {giuTay: true, nhanDu: true});
    assert.strictEqual(rungOf(r, 'R1').gioiHanKg, 100000 + Math.round(ds * 1000) * 100, 'dung sai ' + ds);
  });
});
test('PB-10 dung sai ngoài [0; 0,30], NaN, chuỗi, thiếu → {ok:false, loi:"dung-sai"}; id rừng trùng → rung-trung-id', () => {
  [-0.01, 0.31, 1, NaN, Infinity, '0.05', undefined, null].forEach(ds => { const r = phanBoPhieu([P('A1', '06/11/2026', 1)], rung2(), ds, [], {giuTay: true, nhanDu: true}); assert.strictEqual(r.ok, false, String(ds)); assert.strictEqual(r.loi, 'dung-sai'); });
  const t = phanBoPhieu([P('A1', '06/11/2026', 1)], [R('R1', 1, 1), R('R1', 1, 1)], 0.05, [], {});
  assert.strictEqual(t.ok, false); assert.strictEqual(t.loi, 'rung-trung-id');
});
test('PB-11 phân loại đầu vào: khóa trùng (giữ dòng nhỏ nhất), thiếu ngày, kl ≤ 0, boQua lech-cccd (boQua thắng rungTay: P9) — mỗi phiếu đúng một nhóm (P1)', () => {
  const ps = [P('A1', '06/11/2026', 1000, {row: 5}), P('A1', '06/11/2026', 1000, {row: 9}), P('A2', '', 1000, {key: 'A2|'}), P('A3', '06/11/2026', 0), P('A4', '06/11/2026', -5),
    P('A5', '06/11/2026', 1000, {boQua: 'lech-cccd', rungTay: 'R1'}), P('A6', '06/11/2026', 1000)];
  const r = phanBoPhieu(ps, rung2(), 0.05, [], {giuTay: true, nhanDu: true});
  assert.strictEqual(r.gan.length + r.chuaPhanBo.length, 7, 'P1: |gan| + |chuaPhanBo| = |phieu| (khóa trùng thứ hai là một mục trung-nguon)');
  const ly = Object.fromEntries(r.chuaPhanBo.map(x => [x.key, x.lyDo]));
  assert.strictEqual(ly[kOf('A5', '06/11/2026')], 'lech-cccd'); assert.strictEqual(ly['A2|'], 'thieu-ngay'); assert.strictEqual(ly[kOf('A3', '06/11/2026')], 'thieu-kl'); assert.strictEqual(ly[kOf('A4', '06/11/2026')], 'thieu-kl');
  assert.ok(!r.gan.some(x => x.key === kOf('A5', '06/11/2026')));
  assert.strictEqual(r.chuaPhanBo.filter(x => x.lyDo === 'trung-nguon').length, 1, 'bản trùng thứ hai là trung-nguon'); assert.strictEqual(r.gan.filter(x => x.key === kOf('A1', '06/11/2026')).length, 1);
});
test('PB-11b khóa trùng nội bộ: giữ phiếu có row nhỏ nhất, phiếu còn lại trung-nguon; "pa 1" và "PA1" cùng ngày là cùng khóa', () => {
  const a = P('pa 1', '06/11/2026', 1000, {row: 7}), b = P('PA1', '06/11/2026', 1000, {row: 3});
  assert.strictEqual(a.key, b.key);
  const r = phanBoPhieu([a, b], rung2(), 0.05, [], {giuTay: true, nhanDu: true});
  assert.strictEqual(r.gan.length, 1); assert.strictEqual(r.chuaPhanBo.length, 1); assert.strictEqual(r.chuaPhanBo[0].lyDo, 'trung-nguon');
});
test('PB-12 thứ tự: cùng ngày xếp số phiếu theo số tự nhiên (PA2 trước PA10); hoán vị đầu vào không đổi kết quả (P7)', () => {
  const rs = [R('R1', 0.3, 100), R('R2', 0.3, 100)];   // giới hạn 30.000 mỗi rừng (dung sai 0)
  const base = () => [P('PA10', '06/11/2026', 20000), P('PA2', '06/11/2026', 20000), P('PB1', '05/11/2026', 5000)];
  const r = phanBoPhieu(base(), rs, 0, [], {giuTay: true, nhanDu: true});
  assert.deepStrictEqual(r.gan.map(x => x.key), [kOf('PB1', '05/11/2026'), kOf('PA2', '06/11/2026'), kOf('PA10', '06/11/2026')], 'ngày trước, rồi số tự nhiên');
  assert.strictEqual(gan(r)[kOf('PA2', '06/11/2026')], 'R1'); assert.strictEqual(gan(r)[kOf('PA10', '06/11/2026')], 'R2');
  const rev = phanBoPhieu(base().reverse(), rs, 0, [], {giuTay: true, nhanDu: true});
  assert.deepStrictEqual(rev.gan, r.gan); assert.deepStrictEqual(rev.chuaPhanBo, r.chuaPhanBo);
});
test('PB-13 nhanDu=false ("phần còn lại vào rừng N"): dừng ở phiếu đầu tiên không vừa; các phiếu sau (kể cả nhỏ hơn) → het-du-kien', () => {
  const rs = [R('R1', 0.3, 100), R('R2', 0.3, 100)];
  const ps = [P('A1', '01/11/2026', 20000), P('A2', '02/11/2026', 20000), P('A3', '03/11/2026', 15000), P('A4', '04/11/2026', 1000)];
  const r = phanBoPhieu(ps, rs, 0, [], {giuTay: true, nhanDu: false});
  assert.deepStrictEqual(r.gan.map(x => x.rungId), ['R1', 'R2']); assert.deepStrictEqual(r.chuaPhanBo.map(x => x.lyDo), ['het-du-kien', 'het-du-kien']);
  const c = phanBoPhieu(ps, rs, 0, [], {giuTay: true, nhanDu: true}); assert.deepStrictEqual(c.gan.map(x => x.rungId), ['R1', 'R2', 'R2', 'R2']);
});
test('PB-14 "rừng cuối" là rừng cuối TRONG tập rừng có dự kiến: rừng giữa thiếu dự kiến bị bỏ qua; rừng cuối thiếu dự kiến thì rừng liền trước nhận phần dư', () => {
  const a = phanBoPhieu([P('A1', '01/11/2026', 20000), P('A2', '02/11/2026', 20000), P('A3', '03/11/2026', 20000)], [R('R1', 0.3, 100), R('R2', null, 100), R('R3', 0.3, 100)], 0, [], {giuTay: true, nhanDu: true});
  assert.deepStrictEqual(a.gan.map(x => x.rungId), ['R1', 'R3', 'R3']); assert.strictEqual(rungOf(a, 'R2').themKg, 0); assert.ok(ma(a, 'thieu-du-kien', 'R2').length >= 1);
  const b = phanBoPhieu([P('A1', '01/11/2026', 20000), P('A2', '02/11/2026', 20000), P('A3', '03/11/2026', 20000)], [R('R1', 0.3, 100), R('R2', 0.3, 100), R('R3', null, 100)], 0, [], {giuTay: true, nhanDu: true});
  assert.deepStrictEqual(b.gan.map(x => x.rungId), ['R1', 'R2', 'R2']);
});
test('PB-15 phiếu lớn hơn giới hạn của mọi rừng (Q4 mặc định: nghiêm theo quy tắc): trôi sang rừng cuối, các rừng trước trống kèm cảnh báo rung-bo-trong', () => {
  const r = phanBoPhieu([P('A1', '01/11/2026', 50000)], [R('R1', 0.1, 100), R('R2', 0.1, 100), R('R3', 0.1, 100)], 0, [], {giuTay: true, nhanDu: true});
  assert.deepStrictEqual(r.gan.map(x => x.rungId), ['R3']); assert.strictEqual(ma(r, 'rung-bo-trong', 'R1').length, 1); assert.strictEqual(ma(r, 'rung-bo-trong', 'R2').length, 1); assert.strictEqual(ma(r, 'rung-bo-trong', 'R3').length, 0);
});
test('PB-15b trong khoảng (dự kiến, giới hạn]: cảnh báo trong-dung-sai, không vuot-du-kien; vượt giới hạn mới là vuot-du-kien', () => {
  const rs = [R('R1', 0.6, 100), R('R2', 0.6, 100)];   // 60.000 → 63.000
  const a = phanBoPhieu([P('A1', '01/11/2026', 61000)], rs, 0.05, [], {giuTay: true, nhanDu: true});
  assert.strictEqual(ma(a, 'trong-dung-sai', 'R1').length, 1); assert.strictEqual(ma(a, 'vuot-du-kien', 'R1').length, 0);
  const b = phanBoPhieu([P('A1', '01/11/2026', 70000)], [R('R1', 0.6, 100)], 0.05, [], {giuTay: true, nhanDu: true});
  assert.strictEqual(ma(b, 'vuot-du-kien', 'R1')[0].vuotKg, 10000);
});
test('PB-16 bất biến P1-P5, P7 trên 1.000 bộ dữ liệu giả lập (hạt giống cố định)', () => {
  let s = 12345; const rnd = n => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s % n; };
  for (let it = 0; it < 1000; it++) {
    const nr = 1 + rnd(4), rs = [], dsMil = rnd(31) * 10, ds = dsMil / 1000;
    for (let j = 0; j < nr; j++) rs.push(R('R' + j, rnd(5) === 0 ? null : (1 + rnd(20)) / 10, 90 + rnd(20)));
    const np = rnd(25), ps = [];
    for (let i = 0; i < np; i++) ps.push(P('S' + (1 + rnd(40)), (1 + rnd(9)) + '/11/2026', 1000 + rnd(30000)));
    const dd = rnd(3) ? [] : [{rungId: 'R0', kg: rnd(30000)}];
    const r = phanBoPhieu(ps, rs, ds, dd, {giuTay: true, nhanDu: true});
    assert.strictEqual(r.gan.length + r.chuaPhanBo.length, ps.length, 'P1 bảo toàn');
    assert.strictEqual(new Set(r.gan.map(x => x.key)).size, r.gan.length, 'P2 mỗi khóa tối đa một rừng');
    assert.ok(r.chuaPhanBo.filter(x => x.lyDo !== 'trung-nguon').every(x => !r.gan.some(g => g.key === x.key)), 'P1 không vừa gán vừa chưa gán');
    assert.ok(r.gan.every(g => Number.isInteger(g.kg) && g.kg === ps.find(p => p.key === g.key).kg), 'không chia đôi, kg nguyên');
    r.rung.forEach(x => { assert.strictEqual(x.tongKg, x.daDungKg + x.themKg, 'P3'); assert.strictEqual(x.themKg, r.gan.filter(g => g.rungId === x.id).reduce((a, g) => a + g.kg, 0)); });
    const idx = r.gan.filter(g => g.cach === 'tu-dong').map(g => rs.findIndex(x => x.id === g.rungId)); assert.deepStrictEqual(idx, idx.slice().sort((a, b) => a - b), 'P4 đơn điệu');
    rs.filter(x => x.ha != null).forEach((x, _, arr) => { const info = rungOf(r, x.id), last = arr[arr.length - 1].id === x.id; if (!last && nr > 1 && info.themKg > 0) assert.ok(info.tongKg <= info.gioiHanKg, 'P5'); });
    const sh = phanBoPhieu(ps.slice().reverse(), rs, ds, dd, {giuTay: true, nhanDu: true}); assert.deepStrictEqual(sh.gan, r.gan, 'P7');
  }
});
test('PB-17 không sửa đầu vào (đóng băng sâu) và tất định: hai lần gọi cho cùng kết quả', () => {
  const ps = deep(hd2()), rs = deep(rung2()), dd = deep([{rungId: 'R1', kg: 100}]), op = deep({giuTay: true, nhanDu: true});
  const a = phanBoPhieu(ps, rs, 0.05, dd, op), b = phanBoPhieu(ps, rs, 0.05, dd, op); assert.deepStrictEqual(a, b);
});
test('PB-18 hiệu năng: 300 phiếu × 3 rừng < 50 ms', () => {
  const ps = []; for (let i = 1; i <= 300; i++) ps.push(P('GL300-' + String(i).padStart(4, '0'), String(1 + Math.floor((i - 1) / 10)).padStart(2, '0') + '/11/2026', 19000 + (i * 37) % 2500));
  const t = process.hrtime.bigint(); const r = phanBoPhieu(ps, [R('R1', 0.9, 95), R('R2', 0.8, 95), R('R3', 0.7, 95)], 0.05, [], {giuTay: true, nhanDu: true});
  assert.strictEqual(r.gan.length, 300); assert.ok(Number(process.hrtime.bigint() - t) / 1e6 < 50);
});

/* ===== G4-sửa: P2-1 phiếu thiếu khóa/ngày; P2-2 chuẩn hóa kg; phần tử rỗng ===== */
const OPT = {giuTay: true, nhanDu: true};
test('PB-19 hai phiếu A1, A2 cùng thiếu ngày (key rỗng) → hai mục thieu-ngay phân biệt được, không trung-nguon', () => {
  const ps = [P('A1', '', 1000, {key: ''}), P('A2', undefined, 1000, {key: undefined}), P('A3', '06/11/2026', 1000)];
  const r = phanBoPhieu(ps, rung2(), 0.05, [], OPT);
  const th = r.chuaPhanBo.filter(x => x.lyDo === 'thieu-ngay');
  assert.strictEqual(th.length, 2); assert.strictEqual(r.chuaPhanBo.filter(x => x.lyDo === 'trung-nguon').length, 0);
  assert.strictEqual(r.gan.length, 1); assert.strictEqual(r.gan.length + r.chuaPhanBo.length, 3);
  assert.strictEqual(new Set(th.map(x => x.row)).size, 2, 'mỗi mục phân biệt được bằng row');
  assert.strictEqual(new Set(th.map(x => x.idx)).size, 2, 'và bằng chỉ số đầu vào');
});
test('PB-19b phiếu có ngày nhưng không có key → thieu-so (không gán, không trung-nguon)', () => {
  const ps = [P('', '06/11/2026', 1000, {key: ''}), P('', '06/11/2026', 1000, {key: ''})];
  const r = phanBoPhieu(ps, rung2(), 0.05, [], OPT);
  assert.deepStrictEqual(r.chuaPhanBo.map(x => x.lyDo), ['thieu-so', 'thieu-so']); assert.strictEqual(r.gan.length, 0);
});
test('PB-20 kg kiểu chuỗi / NaN / > 1e9 / 1.7e308 / 0,4 → kg-khong-hop-le; không còn Infinity/null/NaN trong gan', () => {
  const bad = [['S1', '1000'], ['S2', NaN], ['S3', 1.7e308], ['S4', 0.4], ['S5', Infinity], ['S6', 1e9 + 1]];
  const ps = bad.map(([s, kg]) => P(s, '06/11/2026', kg)).concat([P('OK', '06/11/2026', 1000)]);
  const r = phanBoPhieu(ps, rung2(), 0.05, [], OPT);
  assert.deepStrictEqual(r.chuaPhanBo.map(x => x.lyDo), bad.map(() => 'kg-khong-hop-le'));
  assert.strictEqual(r.gan.length, 1); assert.strictEqual(r.gan[0].kg, 1000);
  r.rung.forEach(x => ['duKienKg', 'gioiHanKg', 'daDungKg', 'themKg', 'tongKg'].forEach(k => { if (x[k] != null) assert.ok(Number.isFinite(x[k]), k); }));
  assert.ok(!/Infinity|NaN/.test(JSON.stringify(r.rung)) && !/null/.test(JSON.stringify(r.gan)));
});
test('PB-20b kg âm và 0 không bao giờ được gán (vào chuaPhanBo); kg lẻ được làm tròn Math.round (1000,6 → 1001; 0,5 → 1)', () => {
  const r = phanBoPhieu([P('N1', '06/11/2026', -5), P('N2', '06/11/2026', 0), P('N3', '06/11/2026', 1000.6), P('N4', '07/11/2026', 0.5)], rung2(), 0.05, [], OPT);
  assert.strictEqual(r.chuaPhanBo.length, 2); assert.ok(r.chuaPhanBo.every(x => x.lyDo === 'thieu-kl' || x.lyDo === 'kg-khong-hop-le'));
  assert.deepStrictEqual(r.gan.map(x => x.kg), [1001, 1]);
  assert.ok(r.gan.every(x => Number.isInteger(x.kg)));
});
test('PB-21 daDung[].kg chuỗi / NaN / âm / 0 / quá lớn → cảnh báo da-dung-khong-ro-rung, không cộng vào rừng; số lẻ được làm tròn', () => {
  const dd = [{rungId: 'R1', kg: '500'}, {rungId: 'R1', kg: NaN}, {rungId: 'R1', kg: -1}, {rungId: 'R1', kg: 0}, {rungId: 'R1', kg: 1.7e308}, {rungId: 'R1', kg: 0.4}, {rungId: 'R1', kg: 100.4}];
  const r = phanBoPhieu([], rung2(), 0.05, dd, OPT);
  assert.strictEqual(ma(r, 'da-dung-khong-ro-rung').length, 6); assert.strictEqual(rungOf(r, 'R1').daDungKg, 100);
});
test('PB-22 phần tử null/undefined trong rungs và phieu không ném lỗi, bị bỏ qua và có cảnh báo phan-tu-rong', () => {
  let r;
  assert.doesNotThrow(() => { r = phanBoPhieu([null, P('A1', '06/11/2026', 1000), undefined], [null, R('R1', 0.65, 95), undefined, R('R2', 0.55, 95)], 0.05, [null], OPT); });
  assert.strictEqual(r.ok, true); assert.strictEqual(r.gan.length, 1); assert.strictEqual(r.rung.length, 2);
  assert.strictEqual(ma(r, 'phan-tu-rong').length, 4);
});
