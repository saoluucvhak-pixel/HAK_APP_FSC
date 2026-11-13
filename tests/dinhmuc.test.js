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
