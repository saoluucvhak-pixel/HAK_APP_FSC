'use strict';
const test = require('node:test'), assert = require('node:assert'), fs = require('fs'), path = require('path'), crypto = require('crypto');
const PC = require('../src/phieucan');
const FILE = path.join(__dirname, '..', 'renderer', 'PhieuCan.html');
// Dấu vân tay của file công cụ gốc: đổi dù một byte (bố cục mm, khổ giấy, chữ) là kiểm thử này báo ngay. Chỉ cập nhật khi chủ động thay bản gốc mới.
const SHA = fs.readFileSync(path.join(__dirname, 'phieucan.sha256'), 'utf8').trim();

test('file công cụ in phiếu cân giữ nguyên bản gốc từng byte', () => {
  assert.strictEqual(crypto.createHash('sha256').update(fs.readFileSync(FILE)).digest('hex'), SHA);
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
  assert.deepStrictEqual(a[0].slice(0, 11), ['Số phiếu', 'Ngày cân 1', 'Giờ cân 1', 'Ngày cân 2', 'Giờ cân 2', 'Biển số 1', 'Cân 1', 'Cân 2', 'KL', 'Khách hàng', 'Địa chỉ']);
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
  assert.ok(!PC.inject([], {}).includes('getElementById'));
});

