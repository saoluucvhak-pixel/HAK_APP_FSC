'use strict';
/* G2 — TEST VIẾT TRƯỚC cho src/doiso.js (phatHienDoiSo). Thiết kế mục 3.3 + 5.2; quy tắc QĐ9 (loại phiếu đã khớp khóa trước khi so).
 * Dữ liệu GIẢ LẬP (HD-GL-0005, mục 3.6 của đặc tả). Ở G2 phải ĐỎ vì CHUA_CAI_DAT. */
const test = require('node:test'), assert = require('node:assert');
const {phatHienDoiSo} = require('../src/doiso');

const L = (id, so, ngay, bks, kg, soCu) => Object.assign({id, lo: 'R-GL05-01', so, ngay, bks, kg}, soCu ? {soCu} : {});
const S = (idx, so, ngay, bks, kg) => ({idx, row: idx + 2, so, ngay, bks, kg});
const deep = o => { Object.freeze(o); Object.values(o).forEach(v => { if (v && typeof v === 'object' && !Object.isFrozen(v)) deep(v); }); return o; };
const tt = r => Object.fromEntries(r.ketQua.map(k => [k.idx, k.tt]));
const kq = (r, idx) => r.ketQua.find(k => k.idx === idx);
const lo5 = () => [L('a', 'GL5-0101', '12/11/2026', '43C-500.05', 21300), L('b', 'GL5-0201', '13/11/2026', '43C-500.06', 20500), L('c', 'GL5-0301', '14/11/2026', '43C-500.07', 20500), L('d', 'GL5-0401', '15/11/2026', '43C-500.08', 20000)];
const sheet5 = () => [S(0, 'GL5-0102', '12/11/2026', '43C50005', 21300), S(1, 'GL5-0202', '13/11/2026', '43C-500.06', 20501), S(2, 'GL5-0302', '14/11/2026', '43C-500.07', 20502),
  S(3, 'GL5-0401', '15/11/2026', '43C-500.08', 20000), S(4, 'GL5-0402', '15/11/2026', '43C-500.08', 20000)];

test('DS-01 HD-GL-0005: 0102 và 0202 nghi đổi số (ứng viên đúng), 0302 (lệch 2 kg) là mới, 0401 trùng khóa, 0402 là mới (QĐ9/N7: ứng viên duy nhất đã được 0401 khớp khóa)', () => {
  const r = phatHienDoiSo(sheet5(), lo5(), {nguongKg: 1});
  assert.deepStrictEqual(tt(r), {0: 'nghi-doi-so', 1: 'nghi-doi-so', 2: 'moi', 3: 'trung', 4: 'moi'});
  assert.strictEqual(kq(r, 0).ungVien[0].id, 'a'); assert.strictEqual(kq(r, 0).ungVien[0].dKg, 0);
  assert.strictEqual(kq(r, 1).ungVien[0].id, 'b'); assert.strictEqual(Math.abs(kq(r, 1).ungVien[0].dKg), 1);
  assert.strictEqual(kq(r, 3).loId, 'd');
  assert.strictEqual(r.tomTat['nghi-doi-so'], 2); assert.strictEqual(r.tomTat.moi, 2); assert.strictEqual(r.tomTat.trung, 1);
});
test('DS-02 lệch đúng 1 kg → nghi; 2 kg → mới; nguongKg=0 thì 1 kg cũng là mới; số lẻ được làm tròn kg trước khi so', () => {
  const lo = [L('a', 'A1', '12/11/2026', '43C-1', 20000)];
  const one = (kg, opt) => phatHienDoiSo([S(0, 'B1', '12/11/2026', '43C-1', kg)], lo, opt || {nguongKg: 1}).ketQua[0].tt;
  assert.strictEqual(one(20001), 'nghi-doi-so'); assert.strictEqual(one(19999), 'nghi-doi-so'); assert.strictEqual(one(20002), 'moi'); assert.strictEqual(one(19998), 'moi');
  assert.strictEqual(one(20001, {nguongKg: 0}), 'moi'); assert.strictEqual(one(20000, {nguongKg: 0}), 'nghi-doi-so');
  assert.strictEqual(one(20000.4), 'nghi-doi-so', '20000,4 làm tròn 20000'); assert.strictEqual(one(20001.6), 'moi', '20001,6 làm tròn 20002');
});
test('DS-03 BKS viết khác nhưng cùng khóa chuẩn hóa (77C-123.45 / 77c 12345) → nghi đổi số', () => {
  const r = phatHienDoiSo([S(0, 'B1', '12/11/2026', '77c 12345', 20000)], [L('a', 'A1', '12/11/2026', '77C-123.45', 20000)], {nguongKg: 1}); assert.strictEqual(r.ketQua[0].tt, 'nghi-doi-so');
});
test('DS-03b hai chuyến CÙNG ngày, CÙNG biển, KL gần nhau nhưng cả hai số đều đã có khớp khóa: không báo nhầm', () => {
  const lo = [L('a', 'A1', '12/11/2026', '43C-1', 20000), L('b', 'A2', '12/11/2026', '43C-1', 20001)];
  const r = phatHienDoiSo([S(0, 'A1', '12/11/2026', '43C-1', 20000), S(1, 'A2', '12/11/2026', '43C-1', 20001)], lo, {nguongKg: 1});
  assert.deepStrictEqual(tt(r), {0: 'trung', 1: 'trung'}); assert.ok(!r.ketQua.some(k => k.ungVien && k.ungVien.length));
});
test('DS-04 thiếu BKS hoặc thiếu ngày không kết luận: Sheet thiếu BKS → mới; lô thiếu BKS → mới; Sheet thiếu ngày → khong-xet', () => {
  assert.strictEqual(phatHienDoiSo([S(0, 'B1', '12/11/2026', '', 20000)], [L('a', 'A1', '12/11/2026', '43C-1', 20000)], {nguongKg: 1}).ketQua[0].tt, 'moi');
  assert.strictEqual(phatHienDoiSo([S(0, 'B1', '12/11/2026', '43C-1', 20000)], [L('a', 'A1', '12/11/2026', '', 20000)], {nguongKg: 1}).ketQua[0].tt, 'moi');
  assert.strictEqual(phatHienDoiSo([S(0, 'B1', '', '43C-1', 20000)], [L('a', 'A1', '12/11/2026', '43C-1', 20000)], {nguongKg: 1}).ketQua[0].tt, 'khong-xet');
  assert.strictEqual(phatHienDoiSo([S(0, 'B1', '31/02/2026', '43C-1', 20000)], [L('a', 'A1', '12/11/2026', '43C-1', 20000)], {nguongKg: 1}).ketQua[0].tt, 'khong-xet', 'ngày không có thật');
});
test('DS-05 ngày lệch 1 ngày (cân qua đêm) → mới, đúng quy tắc "cùng ngày"', () => {
  assert.strictEqual(phatHienDoiSo([S(0, 'B1', '13/11/2026', '43C-1', 20000)], [L('a', 'A1', '12/11/2026', '43C-1', 20000)], {nguongKg: 1}).ketQua[0].tt, 'moi');
});
test('DS-06 khớp khóa luôn thắng: "pa 1" = "PA1", 1/11 = 01/11 → trung, KHÔNG bao giờ nghi (N2)', () => {
  const r = phatHienDoiSo([S(0, 'pa 1', '1/11/2026', '43C-1', 20000)], [L('a', 'PA1', '01/11/2026', '43C-1', 20000)], {nguongKg: 1});
  assert.strictEqual(r.ketQua[0].tt, 'trung'); assert.strictEqual(r.ketQua[0].loId, 'a'); assert.ok(!r.ketQua[0].ungVien);
});
test('DS-07 Sheet mang số cũ (soCu) cùng ngày → trung-so-cu, trỏ về lô hiện mang số mới', () => {
  const lo = [L('a', 'GL5-0102', '12/11/2026', '43C-500.05', 21300, [{so: 'GL5-0101', ngay: '12/11/2026'}])];
  const r = phatHienDoiSo([S(0, 'GL5-0101', '12/11/2026', '43C-500.05', 21300)], lo, {nguongKg: 1}); assert.strictEqual(r.ketQua[0].tt, 'trung-so-cu'); assert.strictEqual(r.ketQua[0].loId, 'a');
});
test('DS-08 Sheet mang số cũ nhưng KHÁC ngày so với soCu[].ngay (chuyến khác) → mới', () => {
  const lo = [L('a', 'B1', '12/11/2026', '43C-1', 20000, [{so: 'A1', ngay: '12/11/2026'}])];
  const r = phatHienDoiSo([S(0, 'A1', '20/11/2026', '43C-9', 30000)], lo, {nguongKg: 1}); assert.strictEqual(r.ketQua[0].tt, 'moi');
});
test('DS-09 hai dòng Sheet cùng một ứng viên → cả hai canhTranh; sau khi "Đổi số" một dòng và gọi lại, dòng kia thành mới', () => {
  const sh = [S(0, 'B1', '12/11/2026', '43C-1', 20000), S(1, 'B2', '12/11/2026', '43C-1', 20000)], lo = [L('a', 'A1', '12/11/2026', '43C-1', 20000)];
  const r = phatHienDoiSo(sh, lo, {nguongKg: 1});
  assert.deepStrictEqual(tt(r), {0: 'nghi-doi-so', 1: 'nghi-doi-so'}); assert.ok(kq(r, 0).canhTranh && kq(r, 1).canhTranh);
  const lo2 = [L('a', 'B1', '12/11/2026', '43C-1', 20000, [{so: 'A1', ngay: '12/11/2026'}])];   // người dùng đã Đổi số A1 → B1
  const r2 = phatHienDoiSo(sh, lo2, {nguongKg: 1}); assert.deepStrictEqual(tt(r2), {0: 'trung', 1: 'moi'}); assert.ok(!kq(r2, 1).canhTranh);
});
test('DS-09b một dòng Sheet có nhiều ứng viên (cùng ngày/BKS/KL): ungVien liệt kê đủ, sắp theo |Δkg| rồi số phiếu, không tự chọn', () => {
  const lo = [L('a', 'A2', '12/11/2026', '43C-1', 20001), L('b', 'A1', '12/11/2026', '43C-1', 20000), L('c', 'A3', '12/11/2026', '43C-1', 19999)];
  const r = phatHienDoiSo([S(0, 'Z9', '12/11/2026', '43C-1', 20000)], lo, {nguongKg: 1}); assert.strictEqual(r.ketQua[0].tt, 'nghi-doi-so');
  assert.deepStrictEqual(r.ketQua[0].ungVien.map(u => u.id), ['b', 'a', 'c']);
  assert.strictEqual(r.ketQua[0].loId, undefined, 'không tự chọn một ứng viên');
});
test('DS-10 Sheet có cả số cũ (khớp khóa) và số mới của hai chuyến cùng ngày/BKS/KL: số cũ trùng, số mới là mới (N7)', () => {
  const r = phatHienDoiSo([S(0, 'A1', '15/11/2026', '43C-1', 20000), S(1, 'A2', '15/11/2026', '43C-1', 20000)], [L('a', 'A1', '15/11/2026', '43C-1', 20000)], {nguongKg: 1});
  assert.deepStrictEqual(tt(r), {0: 'trung', 1: 'moi'});
});
test('DS-11 chuỗi đổi số A→B→C: Sheet mang A, B hoặc C đều trung/trung-so-cu; Sheet đổi tiếp sang D → nghi so với lô hiện mang C', () => {
  const lo = [L('a', 'C', '12/11/2026', '43C-1', 20000, [{so: 'A', ngay: '12/11/2026'}, {so: 'B', ngay: '12/11/2026'}])];
  const r = phatHienDoiSo([S(0, 'A', '12/11/2026', '43C-1', 20000), S(1, 'B', '12/11/2026', '43C-1', 20000), S(2, 'C', '12/11/2026', '43C-1', 20000)], lo, {nguongKg: 1});
  assert.deepStrictEqual(tt(r), {0: 'trung-so-cu', 1: 'trung-so-cu', 2: 'trung'});
  const d = phatHienDoiSo([S(0, 'D', '12/11/2026', '43C-1', 20000)], lo, {nguongKg: 1}); assert.strictEqual(d.ketQua[0].tt, 'nghi-doi-so'); assert.strictEqual(d.ketQua[0].ungVien[0].so, 'C');
});
test('DS-12 phieuLo rỗng → mọi dòng hợp lệ là mới (N5)', () => {
  const r = phatHienDoiSo(sheet5(), [], {nguongKg: 1}); assert.ok(Object.values(tt(r)).every(v => v === 'moi')); assert.strictEqual(r.ketQua.length, 5);
});
test('DS-13 hoán vị phieuSheet và phieuLo không đổi kết quả theo idx (N6)', () => {
  const a = phatHienDoiSo(sheet5(), lo5(), {nguongKg: 1}), b = phatHienDoiSo(sheet5().reverse(), lo5().reverse(), {nguongKg: 1});
  assert.deepStrictEqual(tt(b), tt(a)); assert.deepStrictEqual(b.ketQua.map(k => [k.idx, k.loId || (k.ungVien || []).map(u => u.id).join()]).sort(), a.ketQua.map(k => [k.idx, k.loId || (k.ungVien || []).map(u => u.id).join()]).sort());
});
test('DS-14 cùng khóa có ở hai lô của hợp đồng: trung; cả hai lô được coi là đã nhận nên không thành ứng viên của dòng khác (N7)', () => {
  const lo = [L('a', 'A1', '12/11/2026', '43C-1', 20000), Object.assign(L('b', 'A1', '12/11/2026', '43C-1', 20000), {lo: 'R-GL05-02'})];
  const r = phatHienDoiSo([S(0, 'A1', '12/11/2026', '43C-1', 20000), S(1, 'Z9', '12/11/2026', '43C-1', 20000)], lo, {nguongKg: 1});
  assert.strictEqual(r.ketQua[0].tt, 'trung'); assert.ok(['a', 'b'].includes(r.ketQua[0].loId)); assert.strictEqual(r.ketQua[1].tt, 'moi');
});
test('DS-15 không sửa đầu vào (đóng băng sâu) và tất định', () => {
  const sh = deep(sheet5()), lo = deep(lo5()), op = deep({nguongKg: 1});
  assert.deepStrictEqual(phatHienDoiSo(sh, lo, op), phatHienDoiSo(sh, lo, op));
});
test('N1 mỗi dòng Sheet đúng một tt, thuộc tập cho phép; N3 mọi nghi đều cùng ngày, cùng BKS chuẩn hóa, |Δkg| ≤ 1', () => {
  const r = phatHienDoiSo(sheet5(), lo5(), {nguongKg: 1});
  assert.strictEqual(r.ketQua.length, 5); r.ketQua.forEach(k => assert.ok(['trung', 'trung-so-cu', 'nghi-doi-so', 'moi', 'khong-xet'].includes(k.tt)));
  r.ketQua.filter(k => k.tt === 'nghi-doi-so').forEach(k => k.ungVien.forEach(u => assert.ok(Math.abs(u.dKg) <= 1)));
});

/* TRUNG-1: giới hạn độ phức tạp */
test('TRUNG-1 3000 dòng × 3000 lô cùng ngày+biển+kg: dưới 800 ms, mỗi dòng ≤ 20 ứng viên + nhieuHon, canhTranh đếm đủ', () => {
  const lo = Array.from({length: 3000}, (_, i) => L('l' + String(i).padStart(5, '0'), 'A' + i, '12/11/2026', '43C-500.05', 20000));
  const sh = Array.from({length: 3000}, (_, i) => S(i, 'B' + i, '12/11/2026', '43C-500.05', 20000));
  const t0 = Date.now(), r = phatHienDoiSo(sh, lo, {nguongKg: 1}), ms = Date.now() - t0;
  assert.ok(ms < 800, 'chạy ' + ms + ' ms');
  assert.ok(r.ketQua.every(k => k.tt === 'nghi-doi-so' && k.ungVien.length === 20 && k.nhieuHon === true && k.canhTranh === true));
  assert.strictEqual(r.tomTat['nghi-doi-so'], 3000); assert.strictEqual(r.tomTat.canhTranh, 3000);
});
test('TRUNG-1 ≤ 20 ứng viên thì không có cờ nhieuHon', () => {
  const lo = Array.from({length: 20}, (_, i) => L('l' + i, 'A' + i, '12/11/2026', '43C-500.05', 20000));
  const r = phatHienDoiSo([S(0, 'B', '12/11/2026', '43C-500.05', 20000)], lo, {});
  assert.strictEqual(r.ketQua[0].ungVien.length, 20); assert.ok(!r.ketQua[0].nhieuHon);
});
test('TRUNG-1 5001 dòng Sheet hoặc 5001 lô → lỗi qua-lon có cấu trúc, không ném', () => {
  const nhieuS = Array.from({length: 5001}, (_, i) => S(i, 'B' + i, '12/11/2026', '43C-500.05', 1)), nhieuL = Array.from({length: 5001}, (_, i) => L('l' + i, 'A' + i, '12/11/2026', 'x', 1));
  const r1 = phatHienDoiSo(nhieuS, [], {}), r2 = phatHienDoiSo([S(0, 'B', '12/11/2026', '43C-500.05', 1)], nhieuL, {});
  [r1, r2].forEach(r => { assert.strictEqual(r.loi, 'qua-lon'); assert.deepStrictEqual(r.ketQua, []); assert.ok(r.tomTat && r.tomTat.canhTranh === 0); });
  assert.strictEqual(phatHienDoiSo(nhieuS.slice(0, 5000), [], {}).loi, undefined, '5000 vẫn được xử lý');
});
