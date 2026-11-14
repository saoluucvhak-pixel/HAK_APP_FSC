'use strict';
const test = require('node:test'), assert = require('node:assert');
const DM = require('../src/dinhmuc');
const base = () => ({dinhMuc: {'Tổ trưởng': {qa: '1 bộ', giay: '1 đôi'}, 'Công nhân khai thác': {qa: '1 bộ'}, 'Công nhân cưa': {qa: '1 bộ', nut: '2 đôi'}}});

test('dữ liệu cũ (chưa có ngày hiệu lực): một bản gốc áp dụng mọi ngày', () => {
  const db = base(); assert.strictEqual(DM.versions(db).length, 1);
  assert.strictEqual(DM.pick(db, '15/10/2026').ver.base, true); assert.strictEqual(DM.normFor(db, 'Tổ trưởng', '01/01/2020').norm.qa, '1 bộ');
});
test('nhiều bản: dùng bản có hiệu lực từ ngày lớn nhất không vượt ngày tham chiếu', () => {
  const db = base(); db.dinhMucTu = '01/01/2025';
  let r = DM.addVersion(db, '01/07/2026', 'b'); assert.ok(r.ok);
  DM.setNorm(db, r.id, Object.assign({}, db.dinhMucBan[0].dm, {'Tổ trưởng': {qa: '2 bộ', giay: '1 đôi'}}));
  assert.strictEqual(DM.normFor(db, 'Tổ trưởng', '30/06/2026').norm.qa, '1 bộ');
  assert.strictEqual(DM.normFor(db, 'Tổ trưởng', '01/07/2026').norm.qa, '2 bộ', 'đúng ngày hiệu lực');
  assert.strictEqual(DM.normFor(db, 'Tổ trưởng', '15/10/2026').norm.qa, '2 bộ');
  assert.strictEqual(DM.normFor(db, 'Tổ trưởng', '').norm.qa, '2 bộ', 'không có ngày: bản mới nhất');
});
test('ngày trước mọi bản: không có bản hiệu lực (báo thiếu), có bản sớm nhất để gợi ý', () => {
  const db = base(); db.dinhMucTu = '01/01/2025'; const p = DM.pick(db, '31/12/2024');
  assert.strictEqual(p.found, false); assert.strictEqual(p.earliest.tuNgay, '01/01/2025');
});
test('thêm bản: ngày phải có thật, không trùng; sao chép từ bản chọn; không chạm bản gốc', () => {
  const db = base(); assert.strictEqual(DM.addVersion(db, '31/02/2026', 'b').ok, false);
  assert.ok(DM.addVersion(db, '01/03/2026', 'b').ok); assert.strictEqual(DM.addVersion(db, '1/3/2026', 'b').ok, false, 'trùng ngày');
  db.dinhMucBan[0].dm['Tổ trưởng'].qa = 'đã sửa'; assert.strictEqual(db.dinhMuc['Tổ trưởng'].qa, '1 bộ');
  assert.deepStrictEqual(DM.versions(db).map(v => v.tuNgay), ['', '01/03/2026']);
});
test('đổi ngày, xóa bản (không xóa bản gốc), bản gốc có thể để trống ngày', () => {
  const db = base(); const r = DM.addVersion(db, '01/03/2026', 'b');
  assert.strictEqual(DM.setDate(db, r.id, '').ok, false); assert.ok(DM.setDate(db, r.id, '15/04/2026').ok); assert.strictEqual(db.dinhMucBan[0].tuNgay, '15/04/2026');
  assert.ok(DM.setDate(db, 'b', '01/01/2025').ok); assert.strictEqual(db.dinhMucTu, '01/01/2025'); assert.ok(DM.setDate(db, 'b', '').ok);
  assert.strictEqual(DM.removeVersion(db, 'b').ok, false); assert.ok(DM.removeVersion(db, r.id).ok); assert.strictEqual(DM.versions(db).length, 1);
});
test('thêm vị trí mới: không trùng (không phân biệt hoa thường), không phải Tổ trưởng; xóa khi không còn người giữ', () => {
  const db = base(); assert.ok(DM.addPosition(db, '  Công   nhân phụ ').ok); assert.deepStrictEqual(DM.allPositions(db), [...DM.BASE, 'Công nhân phụ']);
  assert.strictEqual(DM.addPosition(db, 'công nhân PHỤ').ok, false); assert.strictEqual(DM.addPosition(db, 'Tổ trưởng phó').ok, false); assert.strictEqual(DM.addPosition(db, '').ok, false);
  assert.strictEqual(DM.removePosition(db, 'Công nhân cưa').ok, false); assert.strictEqual(DM.removePosition(db, 'Công nhân phụ', n => n === 'Công nhân phụ').ok, false);
  assert.ok(DM.removePosition(db, 'Công nhân phụ', () => false).ok); assert.deepStrictEqual(DM.allPositions(db), DM.BASE);
});
test('vị trí có trong định mức nhưng chưa khai (lô khôi phục từ máy khác) vẫn được nhận', () => {
  const db = base(); db.dinhMuc['Lái máy xúc'] = {qa: '1 bộ'}; assert.ok(DM.allPositions(db).includes('Lái máy xúc'));
});

test('định mức gỗ keo (tấn/ha) có hiệu lực từ ngày: chọn theo ngày, mặc định bản mới nhất khi không có ngày', () => {
  const db = {}; assert.strictEqual(DM.keoPick(db, '01/01/2026').item, null);
  assert.ok(DM.keoAdd(db, '01/01/2025', 80).ok); assert.ok(DM.keoAdd(db, '01/07/2026', '95,5').ok);
  assert.strictEqual(DM.keoPick(db, '30/06/2026').item.tanHa, 80); assert.strictEqual(DM.keoPick(db, '01/07/2026').item.tanHa, 95.5);
  assert.strictEqual(DM.keoPick(db, '').item.tanHa, 95.5, 'không có ngày: bản mới nhất'); assert.strictEqual(DM.keoPick(db, '31/12/2024').found, false);
});
test('định mức gỗ keo: kiểm tra ngày, số lớn hơn 0, không trùng ngày; sửa cả danh sách không ghi khi có lỗi', () => {
  const db = {}; assert.strictEqual(DM.keoAdd(db, '31/02/2026', 80).ok, false); assert.strictEqual(DM.keoAdd(db, '01/01/2026', 0).ok, false); assert.strictEqual(DM.keoAdd(db, '01/01/2026', 'abc').ok, false); assert.strictEqual(DM.keoAdd(db, '01/01/2026', 5000).ok, false);
  assert.ok(DM.keoAdd(db, '01/01/2026', 80).ok); assert.strictEqual(DM.keoAdd(db, '1/1/2026', 90).ok, false);
  const r = DM.keoSetAll(db, [{tuNgay: '01/01/2026', tanHa: 80}, {tuNgay: '01/01/2026', tanHa: 90}]); assert.strictEqual(r.ok, false); assert.strictEqual(db.dinhMucKeo.length, 1, 'không ghi khi có lỗi');
  assert.ok(DM.keoSetAll(db, [{tuNgay: '01/03/2026', tanHa: 85}, {tuNgay: '01/01/2026', tanHa: 80}]).ok); assert.deepStrictEqual(DM.keoItems(db).map(x => x.tuNgay), ['01/01/2026', '01/03/2026']);
});

test('định mức thời gian khai thác 1 ha = ? ngày: hiệu lực từ ngày, kiểm tra đầu vào, chọn theo ngày bắt đầu', () => {
  const db = {};
  assert.ok(DM.tgAdd(db, '01/01/2025', '5').ok); assert.ok(DM.tgAdd(db, '01/07/2026', '4,5').ok);
  assert.deepStrictEqual(DM.tgItems(db).map(x => [x.tuNgay, x.ngayHa]), [['01/01/2025', 5], ['01/07/2026', 4.5]]);
  assert.strictEqual(DM.tgPick(db, '15/03/2026').item.ngayHa, 5); assert.strictEqual(DM.tgPick(db, '01/10/2026').item.ngayHa, 4.5);
  assert.strictEqual(DM.tgPick(db, '').item.ngayHa, 4.5);                                  // chưa có ngày: bản mới nhất
  assert.strictEqual(DM.tgPick(db, '01/01/2024').found, false);                            // trước mọi bản
  assert.ok(!DM.tgAdd(db, '01/01/2025', '6').ok);                                          // trùng ngày hiệu lực
  assert.ok(!DM.tgAdd(db, '31/02/2026', '5').ok); assert.ok(!DM.tgAdd(db, '01/02/2026', '0').ok); assert.ok(!DM.tgAdd(db, '01/02/2026', 'abc').ok); assert.ok(!DM.tgAdd(db, '01/02/2026', '400').ok);
  const before = JSON.stringify(db.dinhMucNgay); assert.ok(!DM.tgSetAll(db, [{tuNgay: '01/01/2025', ngayHa: '5'}, {tuNgay: '01/01/2025', ngayHa: '6'}]).ok); assert.strictEqual(JSON.stringify(db.dinhMucNgay), before);
});
test('thời gian khai thác dự kiến = diện tích × ngày/ha làm tròn lên; ngày kết thúc bỏ qua Chủ nhật; năng suất 1 ngày = ? tấn', () => {
  assert.strictEqual(DM.soNgay(2, 5), 10); assert.strictEqual(DM.soNgay(2.5, 5), 13); assert.strictEqual(DM.soNgay(0.1, 5), 1);   // 2,5 × 5 = 12,5 → 13; tối thiểu 1
  assert.strictEqual(DM.soNgay(null, 5), null); assert.strictEqual(DM.soNgay(2, 0), null); assert.strictEqual(DM.soNgay(2, 'x'), null);
  // 01/10/2026 là thứ Năm: 6 ngày khai thác = T5,T6,T7,(CN bỏ),T2,T3,T4 → kết thúc thứ Tư 07/10/2026
  assert.strictEqual(DM.ngayKetThuc('01/10/2026', 1), '01/10/2026'); assert.strictEqual(DM.ngayKetThuc('01/10/2026', 3), '03/10/2026'); assert.strictEqual(DM.ngayKetThuc('01/10/2026', 4), '05/10/2026'); assert.strictEqual(DM.ngayKetThuc('01/10/2026', 6), '07/10/2026');
  assert.strictEqual(DM.ngayKetThuc('04/10/2026', 1), '05/10/2026');   // bắt đầu Chủ nhật: ngày khai thác đầu là thứ Hai
  assert.strictEqual(DM.ngayKetThuc('29/12/2026', 4), '01/01/2027');   // qua năm: T3 29, T4 30, T5 31, T6 01/01 là ngày thứ 4
  assert.strictEqual(DM.ngayKetThuc('31/02/2026', 3), ''); assert.strictEqual(DM.ngayKetThuc('01/10/2026', 0), ''); assert.strictEqual(DM.ngayKetThuc('', 3), '');
  assert.strictEqual(DM.nangSuat(80, 5), 16); assert.strictEqual(DM.nangSuat(80, 3), 26.67); assert.strictEqual(DM.nangSuat(null, 5), null); assert.strictEqual(DM.nangSuat(80, 0), null);
});

test('cảnh báo thời gian khai thác thực tế lệch dự kiến: đếm ngày không tính Chủ nhật, ngưỡng max(3 ngày, 20%), cả dài hơn lẫn ngắn hơn', () => {
  // 01/10/2026 (T5) → 15/10/2026: 13 ngày khai thác (bỏ CN 04 và 11)
  assert.strictEqual(DM.demNgay('01/10/2026', '15/10/2026'), 13); assert.strictEqual(DM.demNgay('04/10/2026', '04/10/2026'), 0); assert.strictEqual(DM.demNgay('15/10/2026', '01/10/2026'), null);
  assert.strictEqual(DM.demNgay('31/02/2026', '15/10/2026'), null);
  const ok13 = DM.lechThoiGian('01/10/2026', '15/10/2026', 13); assert.deepStrictEqual([ok13.thucTe, ok13.lech, ok13.canhBao], [13, 0, false]);
  // dự kiến 10 ngày: ngưỡng = max(3, 2) = 3 → lệch 3 chưa cảnh báo, lệch 4 cảnh báo
  assert.strictEqual(DM.lechThoiGian('01/10/2026', '13/10/2026', 10).nguong, 3);                                  // 01-13/10 = 11 ngày: lệch +1
  assert.strictEqual(DM.lechThoiGian('01/10/2026', '13/10/2026', 10).canhBao, false);
  const l3 = DM.lechThoiGian('01/10/2026', '16/10/2026', 10); assert.deepStrictEqual([l3.thucTe, l3.lech, l3.canhBao], [14, 4, true]);   // 01-16/10: 14 ngày, +4 > 3
  // dự kiến 100 ngày: ngưỡng 20 ngày
  assert.strictEqual(DM.lechThoiGian('01/01/2026', '30/04/2026', 100).nguong, 20);
  const ngan = DM.lechThoiGian('01/10/2026', '07/10/2026', 13); assert.deepStrictEqual([ngan.thucTe, ngan.lech, ngan.canhBao, ngan.tyLe], [6, -7, true, -53.8]);   // ngắn hơn nhiều cũng cảnh báo
  assert.deepStrictEqual(DM.lechThoiGian('15/10/2026', '01/10/2026', 13), {loi: 'ngày kết thúc trước ngày bắt đầu'});
  assert.strictEqual(DM.lechThoiGian('01/10/2026', '', 13), null); assert.strictEqual(DM.lechThoiGian('01/10/2026', '15/10/2026', null), null);
});
