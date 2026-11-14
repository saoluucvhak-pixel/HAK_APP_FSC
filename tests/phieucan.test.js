'use strict';
const test = require('node:test'), assert = require('node:assert'), fs = require('fs'), path = require('path'), crypto = require('crypto');
const PC = require('../src/phieucan');
const FILE = path.join(__dirname, '..', 'renderer', 'PhieuCan.html');
// Dấu vân tay của file công cụ gốc: đổi dù một byte (bố cục mm, khổ giấy, chữ) là kiểm thử này báo ngay. Chỉ cập nhật khi chủ động thay bản gốc mới.
const SHA = fs.readFileSync(path.join(__dirname, 'phieucan.sha256'), 'utf8').trim();

test('file công cụ in phiếu cân giữ nguyên bản gốc từng byte', () => {
  // so theo nội dung với ký tự xuống dòng LF: máy Windows có thể đổi LF thành CRLF khi lấy mã về (đã đặt .gitattributes -text), không làm đổi bản in
  const buf = fs.readFileSync(FILE), lf = Buffer.from(buf.toString('latin1').replace(/\r\n/g, '\n'), 'latin1');
  assert.strictEqual(crypto.createHash('sha256').update(lf).digest('hex'), SHA);
});
test('khổ giấy lỗ 240 × 279 mm và bố cục tuyệt đối theo mm vẫn có trong file', () => {
  const h = fs.readFileSync(FILE, 'utf8');
  assert.ok(h.includes('@page{size:240mm 279mm;margin:0}')); assert.ok(h.includes('<option value="240x279">Giấy lỗ 240 × 279 mm</option>')); assert.ok(h.includes('.slip{position:absolute;left:17mm;width:187.5mm;height:112mm'));
});
test('bảng nạp vào công cụ: đủ cột công cụ yêu cầu, KL tính kg, địa chỉ lấy từ rừng, khách hàng trống thì lấy chủ rừng', () => {
  const rec = {info: {ten: 'NGUYỄN VĂN MỘT', diaDiem: 'Thôn A, Xã B'}, pc: [
    {soPhieu: 'PA1', ngay: '05/10/2026', gioCan1: '08:15:00', gioCan2: '09:40:00', bienSo: '92C-12345', can1: 40400, can2: 15000, klKg: 25400, kl: 25.4, khachHang: 'NGUYỄN VĂN AN'},
    {soPhieu: 'PA2', ngay: '06/10/2026', gioCan1: '', gioCan2: '', bienSo: '92C-67890', can1: null, can2: null, klKg: null, kl: 9.25, khachHang: ''}]};
  const a = PC.aoa(rec);
  assert.deepStrictEqual(a[0].slice(0, 13), ['Số phiếu', 'Ngày cân 1', 'Giờ cân 1', 'Ngày cân 2', 'Giờ cân 2', 'Biển số 1', 'Cân 1', 'Cân 2', 'KL', 'Khách hàng', 'Địa chỉ', 'ĐG_AD', 'Thành tiền']);
  assert.strictEqual(a.length, 3); assert.ok(a.every(r => r.length === PC.HEAD.length));
  assert.deepStrictEqual(a[1].slice(0, 11), ['PA1', '05/10/2026', '08:15:00', '05/10/2026', '09:40:00', '92C-12345', 40400, 15000, 25400, 'NGUYỄN VĂN AN', 'Thôn A, Xã B']);
  assert.strictEqual(a[2][8], 9250); assert.strictEqual(a[2][9], 'NGUYỄN VĂN MỘT'); assert.strictEqual(a[2][6], '');
});
test('mã nạp dữ liệu dùng ô chọn file của công cụ và an toàn với ký tự đặc biệt', () => {
  const js = PC.inject([['Số phiếu'], ['a"b', 'x\u2028y', 1]]);
  assert.ok(js.includes('getElementById("file")') && js.includes('XLSX.write')); assert.doesNotThrow(() => new Function(js)); assert.ok(!js.includes('\u2028'));
});
test('thông tin công ty điền vào tiêu đề phiếu; chưa khai công ty thì không gửi gì; fax trống thì xóa fax mặc định', () => {
  assert.deepStrictEqual(PC.company(null), {}); assert.deepStrictEqual(PC.company({ten: '  '}), {});
  const co = PC.company({ten: 'CÔNG TY A', diaChi: '1 Đường B', sdt: '0236 111', fax: '', noiLap: 'Huế'});
  assert.deepStrictEqual(co, {coName: 'CÔNG TY A', coAddr: '1 Đường B', coPhone: '0236 111', coFax: '', place: 'Huế'});
  const js = PC.inject([], co); assert.doesNotThrow(() => new Function(js));
  for (const k of ['coName', 'coAddr', 'coPhone', 'coFax', 'place']) assert.ok(js.includes('getElementById("' + k + '")'), k);   // fax trống vẫn được xóa
  const js2 = PC.inject([], PC.company({ten: 'B', diaChi: 'x'})); assert.ok(!js2.includes('"place"'));   // nơi lập trống: giữ giá trị của công cụ
  assert.ok(!PC.inject([], {}).includes('"coName"'));
});
test('cùng một khung nhìn cho phiếu từ file nhập ở rừng, Google Sheets và cập nhật biển số: cùng dòng dữ liệu, thiếu gì thì báo', () => {
  const base = {ngay: '05/10/2026', gioCan1: '08:00:00', gioCan2: '09:00:00', can1: 40000, can2: 15000, klKg: 25000, kl: 25, khachHang: 'KH', donGia: 1250000, thanhTien: 31250000};
  const imp = {_row: 2, soPhieu: 'A1', bienSo: '92C-1', ...base, noiGiao: 'KCN'};
  const goo = {_row: 3, soPhieu: 'A1', bienSo: '92C-1', ...base, klTan: 25, maKhachHang: 'K1', noiGiao: '', _src: {tab: 'HoSoKeo_QC', row: 9}};
  const upd = {...imp, bienSo: '92C-1', _src: {tab: 'HoSoKeo_QC', row: 9}};
  const rec = pc => ({info: {ten: 'CHỦ', diaDiem: 'Thôn A'}, pc: [pc]});
  assert.deepStrictEqual(PC.aoa(rec(imp)), PC.aoa(rec(goo))); assert.strictEqual(PC.aoa(rec(imp))[1][11], 1250000); assert.strictEqual(PC.aoa(rec(imp))[1][12], 31250000); assert.deepStrictEqual(PC.aoa(rec(imp)), PC.aoa(rec(upd)));
  for (const p of [imp, goo, upd]) { const g = PC.gaps([p]); assert.strictEqual(g.full, 1); assert.deepStrictEqual(g.issues, []); }
  const g = PC.gaps([imp, {soPhieu: 'B2', ngay: '', bienSo: '92C-2', can1: null, can2: undefined, kl: 0, gioCan1: '', gioCan2: '', khachHang: ''}]);
  assert.strictEqual(g.total, 2); assert.strictEqual(g.full, 1); assert.deepStrictEqual(g.issues[0].missing, ['ngày cân', 'cân lần 1', 'cân lần 2', 'khối lượng', 'giờ cân 1', 'giờ cân 2', 'khách hàng', 'đơn giá', 'thành tiền']); assert.strictEqual(g.by['cân lần 1'], 1);
  assert.deepStrictEqual(PC.gaps([]), {total: 0, full: 0, issues: [], by: {}});
  const kgOnly = PC.gaps([{...imp, klKg: null, kl: 25}]); assert.strictEqual(kgOnly.full, 1);   // chỉ có tấn: vẫn đủ khối lượng
});
test('giao diện gọn: ẩn phần Excel, công ty, cột Số CT / đơn giá nhưng không đụng tới bố cục phiếu', () => {
  for (const id of ['#drop', '#getTpl', '#fileinfo', '#khWrap', '#coBox', '#soCol', '#priceCol']) assert.ok(PC.SIMPLE_CSS.includes(id), id);
  assert.ok(!/\.sheet|\.slip|@page/.test(PC.SIMPLE_CSS));
});


test('thành tiền: có thì dùng; thiếu mà có đơn giá và khối lượng thì tự tính nên không coi là thiếu; thiếu đơn giá thì báo', () => {
  const p = {soPhieu: 'X', ngay: '05/10/2026', gioCan1: '1', gioCan2: '2', bienSo: 'B', can1: 5, can2: 2, klKg: 3000, khachHang: 'K'};
  assert.deepStrictEqual(PC.gaps([{...p, donGia: 1000000}]).issues, []);
  assert.deepStrictEqual(PC.gaps([{...p, thanhTien: 3000000}]).issues[0].missing, ['đơn giá']);
  assert.deepStrictEqual(PC.gaps([p]).issues[0].missing, ['đơn giá', 'thành tiền']);
});

test('ngày cân 2 suy ra từ ngày cân 1 và giờ cân: giờ cân 2 sớm hơn giờ cân 1 = qua nửa đêm (+1 ngày), còn lại cùng ngày', () => {
  const P = require('../src/phieucan');
  assert.strictEqual(P.suyNgay2('05/10/2026', '08:15:00', '09:40:00'), '05/10/2026');
  assert.strictEqual(P.suyNgay2('05/10/2026', '08:15', '08:15'), '05/10/2026');
  assert.strictEqual(P.suyNgay2('05/10/2026', '23:50:00', '00:20:00'), '06/10/2026');
  assert.strictEqual(P.suyNgay2('31/12/2026', '23:00', '01:00'), '01/01/2027');
  assert.strictEqual(P.suyNgay2('28/02/2028', '22:00', '02:00'), '29/02/2028');   // năm nhuận
  assert.strictEqual(P.suyNgay2('28/02/2027', '22:00', '02:00'), '01/03/2027');
  assert.strictEqual(P.suyNgay2('31/02/2026', '22:00', '02:00'), '');            // ngày không có thật
  assert.strictEqual(P.suyNgay2('05/10/2026', '', '09:00'), ''); assert.strictEqual(P.suyNgay2('05/10/2026', '25:00', '09:00'), '');
});
test('ngay2Of: ngày cân 2 nhập thật thì giữ đúng; không có thì suy ra; thiếu giờ thì theo ngày cân 1; in phiếu dùng đúng ngày này', () => {
  const P = require('../src/phieucan');
  assert.deepStrictEqual(P.ngay2Of({ngay: '05/10/2026', ngay2: '7/10/2026', gioCan1: '08:00', gioCan2: '09:00'}), {ngay: '07/10/2026', nguon: 'nhập'});
  assert.deepStrictEqual(P.ngay2Of({ngay: '05/10/2026', gioCan1: '23:50:00', gioCan2: '00:20:00'}), {ngay: '06/10/2026', nguon: 'suy ra'});
  assert.deepStrictEqual(P.ngay2Of({ngay: '05/10/2026'}), {ngay: '05/10/2026', nguon: 'theo ngày cân 1'});
  assert.deepStrictEqual(P.ngay2Of({}), {ngay: '', nguon: ''});
  const rows = P.aoa({info: {ten: 'A'}, pc: [{soPhieu: 'X1', ngay: '05/10/2026', gioCan1: '23:50:00', gioCan2: '00:20:00', bienSo: '92C-1', kl: 1}]});
  assert.strictEqual(rows[1][1], '05/10/2026'); assert.strictEqual(rows[1][3], '06/10/2026');   // cột Ngày cân 2 của công cụ in
});
test('ngay2Warn: chỉ cảnh báo khi ngày cân 2 nhập thật mâu thuẫn với ngày cân 1 và giờ cân', () => {
  const P = require('../src/phieucan');
  assert.strictEqual(P.ngay2Warn({ngay: '05/10/2026', gioCan1: '23:50', gioCan2: '00:20'}).length, 0);   // chưa nhập ngày cân 2: không cảnh báo (sẽ suy ra)
  assert.ok(/trước ngày cân 1/.test(P.ngay2Warn({ngay: '05/10/2026', ngay2: '03/10/2026'})[0]));
  assert.ok(/cách ngày cân 1 .* 3 ngày/.test(P.ngay2Warn({ngay: '05/10/2026', ngay2: '08/10/2026'})[0]));
  assert.ok(/qua nửa đêm.*06\/10\/2026/.test(P.ngay2Warn({ngay: '05/10/2026', ngay2: '05/10/2026', gioCan1: '23:50', gioCan2: '00:20'})[0]));
  assert.ok(/hơn 24 giờ/.test(P.ngay2Warn({ngay: '05/10/2026', ngay2: '06/10/2026', gioCan1: '08:00', gioCan2: '10:00'})[0]));
  assert.strictEqual(P.ngay2Warn({ngay: '05/10/2026', ngay2: '06/10/2026', gioCan1: '23:50', gioCan2: '00:20'}).length, 0);
});
