'use strict';
const test = require('node:test');
const assert = require('node:assert');
const R = require('../ui/reports.js');

const recs = [
  {chuRung: 'NGUYỄN VĂN AN', maChu: 'A', maRung: 'R1', tenRung: 'Rừng 1', diaDiem: 'Quế Sơn', dienTich: 2, dinhMuc: 10, tuNgay: '01/01/2026', denNgay: '28/02/2026', nc: 5, dx: 2, pct: 80,
    pc: [{ngay: '05/01/2026', bienSo: '92C-11111', soPhieu: 'P1', kl: 12.5, noiGiao: 'NM'}, {ngay: '20/02/2026', bienSo: '92C-22222', soPhieu: 'P2', kl: 9.25, noiGiao: 'NM'}, {ngay: '10/03/2026', bienSo: '', soPhieu: 'P2', kl: 1, noiGiao: 'NM'}],
    thieu: [{label: 'Tọa độ lô khai thác (FSC)', hint: 'Chưa nhập tọa độ'}]},
  {chuRung: 'TRẦN THỊ BÌNH', maChu: 'B', maRung: 'R2', tenRung: 'Rừng 2', diaDiem: 'Nông Sơn', dienTich: 1, dinhMuc: 10, nc: 0, dx: 0, pct: 30, pc: [],
    thieu: [{label: 'Giấy tờ pháp lý đất/rừng', hint: 'Chưa khai giấy tờ'}, {label: 'Biên bản BHLĐ có ngày cấp', hint: 'Nhập ở tab Xuất hồ sơ', warn: true}]}
];

test('định dạng số kiểu Việt Nam', () => {
  assert.strictEqual(R.fmtNum(1234567.891, 3), '1.234.567,891'); assert.strictEqual(R.fmtCell(80, 'pct'), '80,0%'); assert.strictEqual(R.fmtCell(5, 'n0'), '5'); assert.strictEqual(R.fmtCell('abc'), 'abc');
});

test('sản lượng: lọc theo kỳ, tổng, % so với dự kiến, cảnh báo', () => {
  const all = R.sanLuong(recs, {}), s = all.sections[0];
  assert.strictEqual(s.rows[0][7], 22.75); // 12,5 + 9,25 + 1
  const kyI = R.sanLuong(recs, {from: '01/01/2026', to: '28/02/2026'}).sections[0];
  assert.strictEqual(kyI.rows[0][7], 21.75); assert.strictEqual(kyI.rows[0][9], 2); assert.strictEqual(kyI.rows[0][8], 108.8); // 21,75 / 20 = 108,75%
  assert.strictEqual(kyI.foot[7], 21.75);
  assert.ok(R.sanLuong(recs, {from: '01/01/2026', to: '28/02/2026'}).notes.some(n => /vượt định mức/.test(n)));
  assert.ok(all.notes.some(n => /chưa có phiếu cân/.test(n) && /R2/.test(n)));
  assert.strictEqual(all.kpis.find(k => /Số chuyến/.test(k.label)).value, 3);
});

test('sổ phiếu cân: sắp theo ngày, tổng hợp theo rừng/biển/ngày, phát hiện trùng số phiếu', () => {
  const m = R.soPhieuCan(recs, {}), [ds, byForest, byPlate, byDay] = m.sections;
  assert.deepStrictEqual(ds.rows.map(r => r[1]), ['05/01/2026', '20/02/2026', '10/03/2026']);
  assert.strictEqual(ds.foot[7], 22.75);               // tổng vẫn gồm phiếu trùng (quy tắc hiển thị rõ, không tự xóa)
  assert.strictEqual(byForest.rows[0][1], 'R1'); assert.strictEqual(byPlate.rows.length, 3); assert.strictEqual(byDay.foot[3], 22.75);
  assert.ok(m.notes.some(n => /nhiều lần/.test(n) && /P2/.test(n) && /vẫn được cộng vào tổng/.test(n) && /1 phiếu trùng/.test(n)));
  assert.deepStrictEqual(ds.rows.filter(r => r[8]).map(r => r[2]), ['P2', 'P2']);   // cả hai dòng trùng đều được đánh dấu, không dòng nào bị xóa
  assert.strictEqual(m.kpis.find(k => /Phiếu trùng/.test(k.label)).value, 1); assert.ok(m.notes.some(n => /chưa có biển/.test(n)));
  assert.strictEqual(R.soPhieuCan(recs, {from: '01/03/2026', to: '31/03/2026'}).sections[0].rows.length, 1);
});

test('tiến độ và điều hành: xếp thấp → cao, liệt kê hạng mục thiếu, rủi ro', () => {
  const t = R.tienDo(recs, {today: '12/11/2026'});
  assert.strictEqual(t.sections[0].rows[0][2], 'R2'); assert.strictEqual(t.sections[0].foot[8], 55);
  assert.strictEqual(t.sections[1].rows.length, 3); assert.strictEqual(t.sections[1].rows[1][5], 'Lưu ý');
  const d = R.dieuHanh(recs, {});
  assert.strictEqual(d.orient, 'portrait'); assert.strictEqual(d.kpis.find(k => /Khối lượng/.test(k.label)).value, 22.75);
  const issues = d.sections[1].rows.map(r => r[3]);
  assert.ok(issues.includes('Chưa có phiếu cân') && issues.includes('Hồ sơ FSC dưới 50%') && issues.includes('Sản lượng thực tế vượt định mức'));
});

test('mọi báo cáo dựng được với dữ liệu rỗng và xuất bảng phẳng', () => {
  R.REPORTS.forEach(r => { const m = r.build([], {from: '', to: '', today: 'x'}); assert.ok(m.title && m.sections.length); const a = R.toAoa(m, {org: 'HAK', today: 'x'}); assert.ok(a.length > 5); });
  const a = R.toAoa(R.sanLuong(recs, {}), {org: 'HAK', today: '12/11/2026'});
  assert.strictEqual(a[1][0], 'BÁO CÁO SẢN LƯỢNG KHAI THÁC THEO RỪNG');
});
