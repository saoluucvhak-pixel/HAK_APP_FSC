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

test('Lô 8 (T-17): docExcel cột Người ký nhận đúng từ khóa ("Không có"/"Công ty" -> false, "Có"/"x"/"1"/"yes" -> true), báo trùng CCCD trong cùng tệp, chuẩn hóa MST, cảnh báo SĐT; checkNC báo trùng CCCD khác tên ở hai đội', () => {
  const DT = require('../src/doituong');
  const Model = require('../src/model');
  // 1. laNguoiKy / yesKy
  assert.strictEqual(DT.laNguoiKy('Không có'), false);
  assert.strictEqual(DT.laNguoiKy('Công ty'), false);
  for (const w of ['Có', 'co', 'x', 'X', '1', 'yes']) assert.strictEqual(DT.laNguoiKy(w), true, w);

  const r1 = DT.docExcel([{'Họ tên': 'Nguyễn Văn A', 'CCCD': '049085000001', 'Ký hợp đồng': 'Vận chuyển', 'Người ký': 'Không có'}], [], []);
  assert.strictEqual(r1.doiTuong[0].dt.nguoi[0].kyHD.vanChuyen, false);
  const r2 = DT.docExcel([{'Họ tên': 'Nguyễn Văn A', 'CCCD': '049085000001', 'Ký hợp đồng': 'Vận chuyển', 'Người ký': 'Có'}], [], []);
  assert.strictEqual(r2.doiTuong[0].dt.nguoi[0].kyHD.vanChuyen, true);

  // 2. Hai dòng cùng CCCD trong một tệp Excel -> báo lỗi ngay ở xem trước
  const rDup = DT.docExcel([
    {'Mã đối tượng': 'DT01', 'Họ tên': 'Nguyễn Văn A', 'CCCD': '049085000001'},
    {'Mã đối tượng': 'DT02', 'Họ tên': 'Trần Văn B', 'CCCD': '049085000001'}
  ], [], []);
  assert.strictEqual(rDup.doiTuong[1].trangThai, 'loi');
  assert.ok(rDup.doiTuong[1].loi.some(m => /trùng với dòng/.test(m)));

  // 3. Chuẩn hóa MST bỏ khoảng trắng & cảnh báo SĐT sai định dạng
  const saved = DT.luu([], {loai: 'phapnhan', ten: 'Công ty X', mst: '012 345 6789', sdt: 'abc!!'}, '20/11/2026');
  assert.strictEqual(saved.ok, true);
  assert.strictEqual(saved.dt.mst, '0123456789');
  assert.ok(saved.canhBao.some(m => /Số điện thoại/.test(m)));

  // 4. checkNC báo lỗi khi cùng CCCD nhưng khác họ tên ở hai đội
  const api = K.create({
    db: {rs: {}},
    trim,
    HAKDates: Dates,
    HAKModel: Model,
    isCccd: s => /^(\d{9}|\d{12})$/.test(trim(s)),
    dateKey: () => 20261001,
    todayStr: () => '01/10/2026',
    ageAt: () => 30,
    chucDanhAll: () => ['Tổ trưởng', 'Công nhân khai thác'],
    keyName: s => trim(s).toLowerCase(),
    numSwap: s => s
  });
  const rec = {
    info: {maRung: 'R-1', tuNgay: '01/10/2026', hinhThucLuong: 'sanluong', donGiaTan: {'Tổ trưởng': 400000, 'Công nhân khai thác': 300000}},
    doi: [{id: 'doi1', ten: 'Đội 1', hinhThuc: {}}, {id: 'doi2', ten: 'Đội 2', hinhThuc: {}}],
    nc: [
      {_row: 2, vaiTro: 'Tổ trưởng', danhXung: 'Ông', ten: 'Nguyễn Văn A', ngaySinh: '01/01/1985', ngayCap: '01/01/2021', noiCap: 'CA', diaChi: 'QN', cccd: '049085000001', chucDanh: 'Tổ trưởng', doiId: 'doi1'},
      {_row: 3, vaiTro: 'Tổ trưởng', danhXung: 'Ông', ten: 'Trần Văn B', ngaySinh: '01/01/1985', ngayCap: '01/01/2021', noiCap: 'CA', diaChi: 'QN', cccd: '049085000002', chucDanh: 'Tổ trưởng', doiId: 'doi2'},
      {_row: 4, vaiTro: 'Công nhân', danhXung: 'Ông', ten: 'Lê Văn Khác Tên', ngaySinh: '01/01/1985', ngayCap: '01/01/2021', noiCap: 'CA', diaChi: 'QN', cccd: '049085000001', chucDanh: 'Công nhân khai thác', doiId: 'doi2'}
    ]
  };
  const chk = api.checkNC(rec);
  assert.ok(chk.errs.some(m => /049085000001.*trùng nhau nhưng khác họ tên/.test(m)), chk.errs.join(' | '));
});
