'use strict';
/* Tiện ích bản 2.3 (src/tienich.js): dán từ Excel, mục lục, in lại / ký lại, trang Chỉ xem, hướng dẫn lần đầu. */
const test = require('node:test'), assert = require('node:assert/strict');
const T = require('../src/tienich.js'), Q = require('../src/quytrinh.js');

test('dán từ Excel: tách ô theo TAB, dòng theo xuống dòng; ô có nháy kép chứa TAB / xuống dòng / nháy; bỏ dòng trống', () => {
  const a = T.danParse('Số phiếu\tNgày cân 1\tBiển số 1\tKL\r\nP1\t05/10/2026\t92C-12345\t12,5\r\n\r\n"P\t2"\t06/10/2026\t"92C-""A"""\t1.234,5\n');
  assert.deepEqual(a, [['Số phiếu', 'Ngày cân 1', 'Biển số 1', 'KL'], ['P1', '05/10/2026', '92C-12345', 12.5], ['P\t2', '06/10/2026', '92C-"A"', 1234.5]]);
});
test('dán từ Excel: số ghi kiểu Việt Nam thành số; CCCD, điện thoại, số có 0 đứng đầu, ngày giữ nguyên là chữ', () => {
  assert.equal(T.danO('12,345'), 12.345); assert.equal(T.danO('12345'), 12345); assert.equal(T.danO('12.5'), 12.5); assert.equal(T.danO('1.234.567'), 1234567);
  assert.equal(T.danO('049067005459'), '049067005459'); assert.equal(T.danO('0905123456'), '0905123456'); assert.equal(T.danO('015'), '015'); assert.equal(T.danO('05/10/2026'), '05/10/2026'); assert.equal(T.danO('  '), '');
});
test('dán từ Excel: thiếu dòng tiêu đề hoặc thiếu cột bắt buộc thì báo rõ, không nạp', () => {
  assert.equal(T.danKiem(T.danParse(''), ['Số phiếu']).ok, false);
  const k = T.danKiem(T.danParse('P1\t05/10/2026\t92C-12345'), ['Số phiếu', 'Ngày cân 1']); assert.equal(k.ok, false); assert.match(k.error, /Số phiếu, Ngày cân 1/);
  assert.deepEqual(T.danKiem(T.danParse('ghi chú\nSố phiếu\tNgày cân 1\nP1\t05/10/2026\nP2\t06/10/2026'), ['Số phiếu', 'Ngày cân 1']), {ok: true, error: '', dong: 2, cot: 2});
});
test('mục lục: đúng thứ tự file trong gói, mã mẫu, tên, đối tượng, số bản; không tự liệt kê tờ mục lục', () => {
  const ml = T.mucLuc([{path: '00_Muc_luc.docx'}, {path: '01_HD_Giao_khoan/Doi_1.docx', pham: {ten: 'Đội 1'}}, {path: '04_HDVC/LE_VAN_XE.docx'}], m => 'Tên ' + m, m => m === '01' ? 2 : 1);
  assert.deepEqual(ml, [{stt: 1, ma: '01', ten: 'Tên 01', doiTuong: 'Đội 1', file: '01_HD_Giao_khoan/Doi_1.docx', soBan: 2}, {stt: 2, ma: '04', ten: 'Tên 04', doiTuong: '', file: '04_HDVC/LE_VAN_XE.docx', soBan: 1}]);
});
test('in lại, ký lại: Sổ in ghi “ký lại lần 2”; phụ lục chỉ gồm mẫu in hoặc ký từ lần thứ hai', () => {
  const f = {}, st = Q.stateOf(f);
  Q.mark(st, '01', 's1', '2026-11-01T00:00:00Z'); assert.ok(Q.ky(st, '01', 's1', '2026-11-02T00:00:00Z')); Q.mark(st, '04', 'x', '2026-11-02T00:00:00Z'); Q.ky(st, '04', 'x', '2026-11-02T01:00:00Z');
  assert.equal(T.kyLai(st.soIn).length, 0, 'in và ký một lần: không có phụ lục');
  Q.mark(st, '01', 's2', '2026-11-05T00:00:00Z'); assert.ok(Q.ky(st, '01', 's2', '2026-11-06T00:00:00Z'));
  assert.equal(st.soIn.filter(x => x.ma === '01' && x.hanh === 'ky').map(x => x.lyDo).join('|'), 'đã ký|ký lại lần 2');
  const k = T.kyLai(st.soIn); assert.deepEqual(k.map(g => [g.ma, g.lanIn, g.lanKy]), [['01', 2, 2]]); assert.equal(k[0].dong.length, 4); assert.equal(T.lyDoKy(st.soIn, '01'), 'ký lại lần 3'); assert.equal(T.lyDoKy(st.soIn, '09'), 'đã ký');
});
test('trang Chỉ xem: một trang HTML tự đủ, không script, không tài nguyên ngoài; mọi giá trị được thoát ký tự', () => {
  const h = T.chiXemHtml({taoLuc: '16/11/2026', phienBan: '2.3.0', chu: {ten: '<img src=x onerror=alert(1)>', ma: 'CR-01'}, lo: {ma: 'R-A', ten: 'Lô "A" & B', trangThai: 'Đã chốt'}, chot: {phienBan: 2, hash: 'abc', at: 'x'},
    tong: {nc: 3, dx: 2, pc: 3, kl: '29,75'}, doi: [{ten: 'Đội 1', toTruong: 'A', soNguoi: 3, kl: '29,75'}], doiXe: [{ten: 'Đội xe 1', nguoiKy: 'B', soXe: 1, soHD: '01/2026/HĐVC-RA', soXN: '01/2026/XNKL-RA', kl: '20,5'}],
    nc: [[1, 'NGUYỄN <b>A</b>', 'Tổ trưởng', 'Tổ trưởng', 'Đội 1']], dx: [], pc: [[1, '05/10/2026', 'PA1', '92C-12345', '12,5', 'Đội 1']], nhatKy: [{at: 't', hanh: 'Mở khóa (phiên bản 1)', lyDo: 'sửa <script>x</script>'}], files: ['01_HD.docx']});
  assert.ok(h.startsWith('<!doctype html>')); assert.ok(!/<script/i.test(h) && !/<img/i.test(h) && !/onerror=alert\(1\)>/.test(h.replace(/&lt;img src=x onerror=alert\(1\)&gt;/g, '')) && !/https?:\/\//.test(h));
  ['BẢN CHỈ XEM', 'R-A', 'Lô &quot;A&quot; &amp; B', '&lt;img src=x onerror=alert(1)&gt;', 'NGUYỄN &lt;b&gt;A&lt;/b&gt;', '01/2026/HĐVC-RA', 'Phiên bản chốt', 'sửa &lt;script&gt;x&lt;/script&gt;', '01_HD.docx', 'Không có dữ liệu.'].forEach(x => assert.ok(h.includes(x), x));
});
test('hướng dẫn lần đầu: bước xong tính từ dữ liệu; không sửa dữ liệu', () => {
  assert.deepEqual(T.huongDan({rs: {}}).map(x => x.xong), [false, false, false, false, false, false]);
  const db = {rs: {o1: {forests: {f1: {nc: [{}], dx: [], pc: [], inAn: {items: {}}}}}}}, truoc = JSON.stringify(db);
  assert.deepEqual(T.huongDan(db).map(x => [x.id, x.xong]), [['chu', true], ['lo', true], ['nc', true], ['dx', false], ['pc', false], ['xuat', false]]);
  db.rs.o1.forests.f1.dx = [{}]; db.rs.o1.forests.f1.pc = [{}]; db.rs.o1.forests.f1.inAn.items['01'] = {}; assert.ok(T.huongDan(db).every(x => x.xong)); assert.notEqual(JSON.stringify(db), truoc);
});
