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
  assert.strictEqual(ds.foot[11], 22.75);               // tổng vẫn gồm phiếu trùng (quy tắc hiển thị rõ, không tự xóa)
  assert.strictEqual(byForest.rows[0][1], 'R1'); assert.strictEqual(byPlate.rows.length, 3); assert.strictEqual(byDay.foot[3], 22.75);
  assert.ok(m.notes.some(n => /nhiều lần/.test(n) && /P2/.test(n) && /vẫn được cộng vào tổng/.test(n) && /1 phiếu trùng/.test(n)));
  assert.deepStrictEqual(ds.rows.filter(r => r[13]).map(r => r[4]), ['P2', 'P2']);   // cả hai dòng trùng đều được đánh dấu, không dòng nào bị xóa
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

test('báo cáo phiếu cân đã cập nhật biển số xe: theo lô, biển cũ/mới, lọc kỳ theo ngày cân, tổng hợp theo lô', () => {
  const rs = JSON.parse(JSON.stringify(recs));
  rs[0].bienLog = [{soPhieu: 'P1', ngay: '05/01/2026', kl: 12.5, cu: '92C-11111', moi: '92C-99999', at: '2026-04-01T08:30:00.000Z', nguon: 'Google Sheets'},
    {soPhieu: 'P2', ngay: '20/02/2026', kl: 9.25, cu: '92C-22222', moi: '92C-88888', at: '2026-04-01T08:30:00.000Z', nguon: 'Google Sheets'},
    {soPhieu: 'P1', ngay: '05/01/2026', kl: 12.5, cu: '92C-99999', moi: '92C-77777', at: '2026-05-02T09:00:00.000Z', nguon: 'Google Sheets'}];
  const rep = R.REPORTS.find(x => x.id === 'bienso'); assert.ok(rep, 'có báo cáo bienso');
  const m = rep.build(rs, {from: '', to: '', today: '01/06/2026'});
  assert.strictEqual(m.id, 'bienso'); const det = m.sections[1].rows;
  assert.strictEqual(det.length, 3); assert.deepStrictEqual(det[0].slice(1, 7), ['R1', 'NGUYỄN VĂN AN', 'P1', '05/01/2026', '92C-11111', '92C-99999']);
  assert.ok(det.some(r => r[3] === 'P1' && r[5] === '92C-99999' && r[6] === '92C-77777'), 'đổi biển nhiều lần: giữ đủ các dòng');
  assert.strictEqual(m.sections[0].rows.length, 2, 'mỗi lô một dòng tổng hợp'); assert.strictEqual(m.sections[0].rows[0][4], 2, '2 phiếu khác nhau đã cập nhật (P1, P2)');
  assert.ok(m.notes.join(' ').includes('nhiều lần'), 'ghi chú đổi nhiều lần');
  const k = rep.build(rs, {from: '01/02/2026', to: '28/02/2026', today: '01/06/2026'}); assert.strictEqual(k.sections[1].rows.length, 1, 'chỉ phiếu cân ngày trong kỳ'); assert.strictEqual(k.sections[1].rows[0][3], 'P2');
  const none = rep.build(recs, {from: '', to: '', today: '01/06/2026'}); assert.strictEqual(none.sections[1].rows.length, 0); assert.ok(none.notes.join(' ').includes('Chưa có phiếu cân nào được cập nhật biển số'));
  assert.ok(R.toAoa(m, {org: 'HAK GROUP', today: '01/06/2026', stamp: 'x', scope: ''}).length > 5, 'xuất được ra bảng Excel');
});

test('báo cáo danh sách lao động theo lô: tổng hợp theo vị trí, chi tiết, tuổi, cảnh báo dưới 18 và thiếu thông tin', () => {
  const rs = JSON.parse(JSON.stringify(recs));
  rs[0].tuNgay = '01/10/2026';
  rs[0].donVi = 'đ/tấn';
  rs[0].ncList = [
    {vaiTro: 'Công nhân', stt: '2', danhXung: 'Ông', ten: 'LÊ VĂN NHÂN', chucDanh: 'Công nhân khai thác', ngaySinh: '01/01/1990', cccd: '049090000002', diaChi: 'Đà Nẵng', ngayCap: '01/01/2021', noiCap: 'CA', rate: 330000},
    {vaiTro: 'Tổ trưởng', stt: '1', danhXung: 'Ông', ten: 'TRẦN TỔ', chucDanh: 'Tổ trưởng', ngaySinh: '15/03/1985', cccd: '049085000001', diaChi: 'Đà Nẵng', ngayCap: '01/01/2021', noiCap: 'CA', rate: 420000},
    {vaiTro: 'Công nhân', stt: '3', danhXung: 'Ông', ten: 'EM TRẺ', chucDanh: 'Công nhân cưa', ngaySinh: '01/06/2010', cccd: '12345', diaChi: 'Đà Nẵng', ngayCap: '', noiCap: '', rate: 380000}];
  const m = R.REPORTS.find(x => x.id === 'laodong').build(rs, {from: '', to: '', today: '15/11/2026'});
  assert.strictEqual(m.id, 'laodong'); const s0 = m.sections[0].rows[0], det = m.sections[1].rows;
  assert.deepStrictEqual(s0.slice(1, 9), ['R1', 'NGUYỄN VĂN AN', 3, 1, 1, 1, 0, 1], 'tổng hợp theo vị trí; 1 người dưới 18');
  assert.strictEqual(det[0][4], 'Tổ trưởng', 'tổ trưởng đứng đầu'); assert.strictEqual(det[0][7], 41, 'tuổi tại ngày bắt đầu khai thác 01/10/2026 (sinh 15/03/1985)');
  assert.strictEqual(det.find(r => /EM TRẺ/.test(r[3]))[7], 16);
  assert.ok(m.notes.some(n => /dưới 18 tuổi/.test(n))); const bad = m.sections.find(x => /cần bổ sung/.test(x.heading)); assert.ok(bad && bad.rows.length === 1 && /CCCD/.test(bad.rows[0][3]));
  assert.strictEqual(m.kpis.find(k => /Tổng số lao động/.test(k.label)).value, 3); assert.ok(R.toAoa(m, {org: 'HAK', today: '15/11/2026', stamp: 'x', scope: ''}).length > 5);
  assert.ok(R.REPORTS.find(x => x.id === 'laodong').build(recs, {from: '', to: '', today: '15/11/2026'}).notes.some(n => /Chưa có nhân công/.test(n)));
});
test('báo cáo danh sách xe theo lô: xe, người ký, số chuyến và khối lượng theo phiếu cân, biển lạ trong phiếu cân', () => {
  const rs = JSON.parse(JSON.stringify(recs));
  rs[0].pc.push({ngay: '11/03/2026', bienSo: '92C 333.33', soPhieu: 'P9', kl: 5, noiGiao: 'NM'});   // biển không có trong danh sách xe
  rs[0].dxList = [{bienSo: '92C-22222', loaiXe: 'Xe tải', chuXe: 'LÊ VĂN XE', nguoiKy: 'Tài xế', taiXe: 'PHẠM TÀI', cccd: '049080000001', cccdTx: '049090000009', sdt: '0905123456', hanBH: '31/12/2026', hanGplx: ''},
    {bienSo: '92C-11111', loaiXe: 'Xe tải', chuXe: 'HÀ VĂN CHỦ', nguoiKy: 'Chủ xe', taiXe: '', cccd: '049070000007', cccdTx: '', sdt: '', hanBH: '', hanGplx: ''}];
  const m = R.REPORTS.find(x => x.id === 'danhsachxe').build(rs, {from: '', to: '', today: '15/11/2026'}), det = m.sections[1].rows;
  assert.strictEqual(det.length, 2); const a = det.find(r => r[3] === '92C-11111'), b = det.find(r => r[3] === '92C-22222');
  assert.strictEqual(a[12], 1); assert.strictEqual(a[13], 12.5); assert.strictEqual(a[6], 'Chủ xe'); assert.strictEqual(a[8], '049070000007');
  assert.strictEqual(b[6], 'Tài xế'); assert.strictEqual(b[7], 'PHẠM TÀI'); assert.strictEqual(b[8], '049090000009', 'tài xế ký: CCCD của tài xế'); assert.strictEqual(b[13], 9.25);
  const unk = m.sections.find(x => /chưa có trong danh sách xe/.test(x.heading)); assert.ok(unk && unk.rows.length >= 1, 'biển 92C-33333 (phiếu ngày 11/03) không có trong danh sách xe');
  assert.ok(m.notes.some(n => /chưa có số điện thoại/.test(n)));
  assert.strictEqual(m.sections[0].rows[0][3], 2); assert.strictEqual(m.sections[0].foot[3], 2);
  const k = R.REPORTS.find(x => x.id === 'danhsachxe').build(rs, {from: '01/02/2026', to: '28/02/2026', today: 'x'}); assert.strictEqual(k.sections[1].rows.find(r => r[3] === '92C-11111')[12], 0, 'lọc kỳ: chuyến ngoài kỳ không tính');
  assert.ok(R.toAoa(m, {org: 'HAK', today: 'x', stamp: 'x', scope: ''}).length > 5);
});
