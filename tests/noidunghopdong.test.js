'use strict';
/* src/noidunghopdong.js — nội dung các biểu mẫu hợp đồng và biên bản, tách khỏi giao diện (ui/app/06).
 * Kiểm thử không cần Electron: ctx giả cấp các tiện ích; nội dung từng biểu mẫu đầy đủ được kiểm bằng so bản in (scripts/so-ban-in.js). */
const test = require('node:test'), assert = require('node:assert');
const fs = require('fs'), path = require('path');
const K = require('../src/noidunghopdong');
const HopDong = require('../src/hopdong');
const trim = s => String(s == null ? '' : s).trim();
const mk = (extra = {}) => K.create(Object.assign({
  trim, HAKHopDong: HopDong, theCompany: () => ({ten: ' CÔNG TY MUA '}),
  personName: (dx, ten) => (dx ? dx + ' ' : '') + ten,
  keyName: s => trim(s).toUpperCase(), HAKModel: {cccdSo: s => String(s == null ? '' : s).replace(/\D/g, '')},
  upper: s => String(s).toUpperCase(), P: (t, o) => ({p: t, o}), T: (w, rows, o) => ({t: rows, o})
}, extra));

test('ctx: mọi tên mà mã dùng qua ctx.<tên> đều có trong TEN_NGOAI (giao diện cấp đủ, không sót)', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'src', 'noidunghopdong.js'), 'utf8');
  const used = [...new Set([...src.matchAll(/\bctx\.([A-Za-z_$][\w$]*)/g)].map(m => m[1]))].sort();
  assert.deepStrictEqual(used, [...K.TEN_NGOAI].sort());
});

test('ctx: giao diện cấp getter cho đúng các tên này (ui/app/06 khớp TEN_NGOAI)', () => {
  const ui = fs.readFileSync(path.join(__dirname, '..', 'ui', 'app', '06-noi-dung-hop-dong.js'), 'utf8');
  const got = [...ui.matchAll(/^\s+get ([A-Za-z_$][\w$]*)\(\) \{ return \1; \}/gm)].map(m => m[1]).sort();
  assert.deepStrictEqual(got, [...K.TEN_NGOAI].sort());
});

test('trả về đủ các hàm dựng biểu mẫu mà giao diện dùng', () => {
  const api = mk();
  ['docGiaoKhoan', 'docHDLD', 'docHDVC', 'docXNKLVC', 'docTTVC', 'docNghiemThu', 'docNhatKy', 'docKiemTraHienTruong', 'docThamDinh', 'docSoTaiNan', 'signTable', 'partyBlock', 'kyBenB', 'benKhoanIn', 'benBGiaoKhoan'].forEach(n => assert.strictEqual(typeof api[n], 'function', n));
});

test('dot: giá trị trống thì in dấu chấm; có giá trị thì giữ nguyên', () => {
  const api = mk();
  assert.strictEqual(api.dot('', 3), '………'); assert.strictEqual(api.dot(undefined), '……'.repeat(1) + '…'.repeat(4)); assert.strictEqual(api.dot('07', 3), '07');
});

test('rungRef: mã rừng, tọa độ và thời gian khai thác nối bằng dấu chấm giữa', () => {
  const api = mk();
  assert.strictEqual(api.rungRef({maRung: 'R-1', lat: 15.5, lng: 108.1, tuNgay: '05/10/2026', denNgay: '20/10/2026'}), 'Mã rừng: R-1 · Tọa độ (WGS84): 15.5, 108.1 · Thời gian khai thác: 05/10/2026 – 20/10/2026');
  assert.strictEqual(api.rungRef({maRung: 'R-1', tuNgay: '05/10/2026'}), 'Mã rừng: R-1 · Thời gian khai thác: 05/10/2026');
  assert.strictEqual(api.rungRef({}), '');
});

test('hdRef: căn cứ hợp đồng chủ rừng; không có số và ngày thì không in', () => {
  const api = mk();
  assert.strictEqual(api.hdRef({soHopDong: 'HD-9', ngayKyHopDong: '01/10/2026'}), 'Căn cứ Hợp đồng số HD-9 ký ngày 01/10/2026.');
  assert.strictEqual(api.hdRef({ngayKyHopDong: '01/10/2026'}), 'Căn cứ Hợp đồng số ………… ký ngày 01/10/2026.');
  assert.strictEqual(api.hdRef({}), '');
});

test('ngayLine và buyerName: ngày ký có thì ghi, không thì dòng ngày để trống; tên bên mua lấy lô rồi công ty mặc định', () => {
  const api = mk();
  assert.strictEqual(api.ngayLine({ngayKy: '02/10/2026'}), 'ngày 02/10/2026');
  assert.strictEqual(api.ngayLine({}), HopDong.ngayTrong());
  assert.strictEqual(api.buyerName({info: {muaHang: {ten: 'BÊN MUA A'}}}), 'BÊN MUA A');
  assert.strictEqual(api.buyerName({info: {}}), 'CÔNG TY MUA');
});

test('benKhoanIn (R2): pháp nhân ký qua người đại diện kèm chức danh; chưa chọn bên nhận khoán thì không có bản chụp', () => {
  const api = mk();
  assert.strictEqual(api.benKhoanIn({doi: [{}]}, null), null);
  const r = api.benKhoanIn({doi: [{benNhanKhoanBan: {loai: 'phapnhan', ten: 'CÔNG TY KHAI THÁC X', mst: '0401', diaChi: 'Đà Nẵng', daiDien: 'LÊ ĐẠI DIỆN', chucVu: 'Giám đốc'}}]}, {ten: 'TỔ TRƯỞNG B', cccd: '049'});
  assert.strictEqual(r.phapNhan, true); assert.strictEqual(r.ten, 'CÔNG TY KHAI THÁC X'); assert.strictEqual(r.ky, 'LÊ ĐẠI DIỆN'); assert.strictEqual(r.chucVuKy, 'Giám đốc'); assert.strictEqual(r.laTT, false);
  assert.strictEqual(r.p.loai, 'doanhnghiep'); assert.strictEqual(r.p.mst, '0401');
});

test('benKhoanIn (R2): thể nhân trùng CCCD với Tổ trưởng thì đánh dấu là Tổ trưởng; khác thì không', () => {
  const api = mk(), team = cccd => ({doi: [{benNhanKhoanBan: {loai: 'thenhan', danhXung: 'Ông', ten: 'TRẦN MỘT', cccd}}]});
  assert.strictEqual(api.benKhoanIn(team('049 085-007001'), {ten: 'TRẦN MỘT', cccd: '049085007001'}).laTT, true);
  assert.strictEqual(api.benKhoanIn(team('049085007999'), {ten: 'TRẦN MỘT', cccd: '049085007001'}).laTT, false);
  assert.strictEqual(api.benKhoanIn(team('049085007001'), null).ky, 'Ông TRẦN MỘT');
});

test('kyBenB (R2): có bên nhận khoán thì ký theo bên đó (pháp nhân có đóng dấu); chưa có thì ký theo Tổ trưởng', () => {
  const api = mk();
  const pn = {doi: [{benNhanKhoanBan: {loai: 'phapnhan', ten: 'CÔNG TY X', daiDien: 'LÊ A', chucVu: 'Giám đốc'}}]};
  assert.deepStrictEqual(api.kyBenB(pn, {ten: 'TT'}, 'TT'), ['ĐẠI DIỆN BÊN B', 'Giám đốc (Ký, ghi rõ họ tên, đóng dấu)', 'LÊ A']);
  assert.deepStrictEqual(api.kyBenB({doi: [{}]}, {ten: 'TT'}, 'TỔ TRƯỞNG'), ['ĐẠI DIỆN BÊN B', '(Ký, ghi rõ họ tên)', 'TỔ TRƯỞNG']);
});
