'use strict';
/* src/kiemtranhieudoi.js — kiểm tra dữ liệu lô nhiều đội, tách khỏi giao diện (ui/app/04). Kiểm thử không cần Electron:
 * ctx giả cấp cơ sở dữ liệu và vài tiện ích; mọi tên khác dùng từ giao diện được khai báo trong TEN_NGOAI. */
const test = require('node:test'), assert = require('node:assert');
const fs = require('fs'), path = require('path');
const K = require('../src/kiemtranhieudoi');
const Dates = require('../src/dates');
const trim = s => String(s == null ? '' : s).trim();
const mk = (db = {rs: {}}) => K.create({db, trim, HAKDates: Dates, isCccd: s => /^\d{12}$/.test(trim(s)), numSwap: s => s});

test('ctx: mọi tên mà mã dùng qua ctx.<tên> đều có trong TEN_NGOAI (giao diện cấp đủ, không sót)', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'src', 'kiemtranhieudoi.js'), 'utf8');
  const used = [...new Set([...src.matchAll(/\bctx\.([A-Za-z_$][\w$]*)/g)].map(m => m[1]))].sort();
  assert.deepStrictEqual(used, [...K.TEN_NGOAI].sort());
  assert.ok(K.TEN_NGOAI.includes('db') && K.TEN_NGOAI.includes('trim'));
});

test('ctx: giao diện cấp getter cho đúng các tên này (ui/app/04 khớp TEN_NGOAI)', () => {
  const ui = fs.readFileSync(path.join(__dirname, '..', 'ui', 'app', '04-kiem-tra-du-lieu-nhieu-doi.js'), 'utf8');
  const got = [...ui.matchAll(/^\s+get ([A-Za-z_$][\w$]*)\(\) \{ return \1; \}/gm)].map(m => m[1]).sort();
  assert.deepStrictEqual(got, [...K.TEN_NGOAI].sort());
});

test('trả về đủ các hàm mà các module giao diện khác dùng', () => {
  const api = mk();
  ['infoErrors', 'forestErrors', 'checkNC', 'checkDX', 'doiOf', 'payRows', 'payrollPlan', 'gate', 'gateRaw', 'rateOf', 'giaErrors', 'normErrors', 'nhapLieuAll'].forEach(n => assert.strictEqual(typeof api[n], 'function', n));
  assert.ok(api.KIND_BM && api.BASIS);
});

test('infoErrors: chủ rừng đủ thông tin không có lỗi; thiếu mã, danh xưng, CCCD, địa chỉ có lỗi nêu đúng', () => {
  const api = mk();
  const ok = {ma: 'CR-1', ten: 'NGUYỄN VĂN AN', danhXung: 'Ông', cccd: '049000000001', ngayCap: '01/01/2021', noiCap: 'CA', diaChi: 'Đà Nẵng'};
  assert.deepStrictEqual(api.infoErrors(ok, null), []);
  const bad = api.infoErrors({ten: 'A', danhXung: 'x', cccd: '123'}, null);
  ['Thiếu Mã chủ rừng', 'Chọn danh xưng Ông/Bà', 'CCCD phải gồm 9 hoặc 12 chữ số', 'Thiếu Ngày cấp CCCD', 'Thiếu Nơi cấp CCCD', 'Thiếu Địa chỉ thường trú'].forEach(m => assert.ok(bad.includes(m), m));
});

test('infoErrors: mã chủ rừng trùng chủ khác báo lỗi, chính chủ đó thì không', () => {
  const db = {rs: {a: {info: {ma: 'CR-1'}}, b: {info: {ma: 'CR-2'}}}};
  const api = mk(db), base = {ten: 'A', danhXung: 'Ông', cccd: '049000000001', ngayCap: '01/01/2021', noiCap: 'CA', diaChi: 'x'};
  assert.ok(api.infoErrors({...base, ma: 'CR-1'}, 'b').includes('Mã chủ rừng đã tồn tại'));
  assert.ok(!api.infoErrors({...base, ma: 'CR-1'}, 'a').includes('Mã chủ rừng đã tồn tại'));
  assert.ok(api.infoErrors({...base, ma: 'CR-9', sdt: 'abc'}, null).some(m => /Số điện thoại/.test(m)));
});

test('infoErrors đọc cơ sở dữ liệu HIỆN TẠI lúc gọi (ctx.db đổi thì kết quả đổi theo)', () => {
  const ctx = {db: {rs: {}}, trim, HAKDates: Dates, isCccd: () => true, numSwap: s => s};
  const api = K.create(ctx), base = {ma: 'CR-1', ten: 'A', danhXung: 'Ông', cccd: '1', ngayCap: 'x', noiCap: 'x', diaChi: 'x'};
  assert.deepStrictEqual(api.infoErrors(base, 'z'), []);
  ctx.db = {rs: {a: {info: {ma: 'CR-1'}}}};
  assert.deepStrictEqual(api.infoErrors(base, 'z'), ['Mã chủ rừng đã tồn tại']);
});

test('hình thức trả lương: trực tiếp không được tính theo ha; giao khoán được', () => {
  const api = mk();
  assert.strictEqual(api.isDirect({moHinhKy: 'tructiep'}), true); assert.strictEqual(api.isDirect({moHinhKy: 'giaokhoan'}), false);
  assert.strictEqual(api.basisAllowed(true, 'ha'), false); assert.strictEqual(api.basisAllowed(false, 'ha'), true); assert.strictEqual(api.basisAllowed(true, 'ngaycong'), true);
  assert.deepStrictEqual(api.giaErrors({hinhThucLuong: 'sanluong'}), []);
  assert.ok(api.giaErrors({moHinhKy: 'tructiep', hinhThucLuong: 'ha'}).length > 0);
});

test('workDays: không tính Chủ nhật (05–11/10/2026 có 7 ngày, 1 Chủ nhật → 6)', () => {
  const api = mk();
  assert.strictEqual(api.workDays(new Date(2026, 9, 5), new Date(2026, 9, 11)), 6);
  assert.strictEqual(api.workDays(new Date(2026, 9, 4), new Date(2026, 9, 4)), 0, '04/10/2026 là Chủ nhật');
});

test('thông tin theo đội: đội ghi đè phần của lô; không đội thì dùng của lô', () => {
  const api = mk(), rec = {info: {hinhThucLuong: 'sanluong', donGia: 100}, doi: [{id: 'd1', hinhThuc: {hinhThucLuong: 'ngaycong'}}, {id: 'd2'}], nc: []};
  assert.strictEqual(api.infoTeam(rec, rec.doi[0]).hinhThucLuong, 'ngaycong');
  assert.strictEqual(api.infoTeam(rec, rec.doi[0]).donGia, 100);
  assert.strictEqual(api.infoTeam(rec, rec.doi[1]).hinhThucLuong, 'sanluong');
  assert.strictEqual(api.infoTeam(rec, null), rec.info);
  assert.deepStrictEqual(api.teamInfos(rec).map(x => x.hinhThucLuong), ['ngaycong', 'sanluong']);
});

test('định dạng số công và tấn theo kiểu Việt Nam', () => {
  const api = mk();
  assert.strictEqual(api.fmtCong(12.5), '12,5'); assert.strictEqual(api.fmtTan(2.84), '2,84'); assert.strictEqual(api.fmtTan(1000), '1.000');
});
