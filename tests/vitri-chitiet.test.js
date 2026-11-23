'use strict';
/* Danh mục vị trí chi tiết: nhiệm vụ, ghi chú, xóa/ngừng, gieo sẵn (src/vitri.js). */
const test = require('node:test'), assert = require('node:assert/strict');
const VT = require('../src/vitri'), DM = require('../src/dinhmuc');
const clone = x => JSON.parse(JSON.stringify(x));

test('them: nhiemVu và ghiChu chỉ ghi khóa khi khác rỗng; gọi cũ cho JSON y hệt', () => {
  const a = [], b = [];
  VT.them(a, 'Thợ A'); VT.them(b, 'Thợ A', '', '  ');
  assert.equal(JSON.stringify(a), JSON.stringify([{id: 'vt1', ten: 'Thợ A', ngung: false}]));
  assert.equal(JSON.stringify(a), JSON.stringify(b));
  const c = []; VT.them(c, 'Thợ B', ' Cưa  cây ', 'Có chứng chỉ');
  assert.deepEqual(c[0], {id: 'vt1', ten: 'Thợ B', ngung: false, nhiemVu: 'Cưa cây', ghiChu: 'Có chứng chỉ'});
});
test('sua: đặt và xóa nhiemVu/ghiChu (rỗng thì bỏ khóa)', () => {
  const dm = []; VT.them(dm, 'Thợ A', 'Cưa', 'x');
  assert.equal(VT.sua(dm, 'vt1', {nhiemVu: 'Bốc xếp', ghiChu: ''}).ok, true);
  assert.deepEqual(dm[0], {id: 'vt1', ten: 'Thợ A', ngung: false, nhiemVu: 'Bốc xếp'});
  assert.equal(VT.sua(dm, 'vt9', {}).ok, false);
});
test('xoa: chưa dùng thì xóa hẳn; đang dùng thì chuyển Ngừng sử dụng; vị trí mặc định không xóa', () => {
  const db = {dmViTri: [], rs: {}};
  VT.them(db.dmViTri, 'Thợ A'); VT.them(db.dmViTri, 'Thợ B'); VT.them(db.dmViTri, 'Tổ trưởng');
  db.rs = {o1: {forests: {f1: {nc: [{chucDanh: 'Thợ B', viTriId: 'vt2'}]}}}};
  const r1 = VT.xoa(db, 'vt1'); assert.equal(r1.ok, true); assert.equal(r1.kieu, 'xoa'); assert.equal(VT.timId(db.dmViTri, 'vt1'), null);
  const r2 = VT.xoa(db, 'vt2'); assert.equal(r2.ok, true); assert.equal(r2.kieu, 'ngung'); assert.equal(VT.timId(db.dmViTri, 'vt2').ngung, true); assert.match(r2.thongBao, /Ngừng sử dụng/);
  const r3 = VT.xoa(db, 'vt3'); assert.equal(r3.ok, false); assert.match(r3.error, /mặc định/);
  assert.equal(VT.xoa(db, 'vt99').ok, false);
});
test('dangDung: tính theo nhân công, định biên, định mức BHLĐ, đơn giá của lô và đội', () => {
  const db = {dmViTri: [], dinhBien: [{chucDanh: 'Thợ A', soNguoi: 2}], dinhMuc: {'Thợ B': {}}, dinhMucBan: [{tuNgay: '01/01/2026', dm: {'Thợ C': {}}}],
    rs: {o: {forests: {f: {nc: [], info: {donGiaTan: {'Thợ D': 5}}, doi: [{hinhThuc: {donGiaNgay: {'Thợ E': 1}}}]}}}}};
  ['Thợ A', 'Thợ B', 'Thợ C', 'Thợ D', 'Thợ E', 'Thợ F'].forEach(t => VT.them(db.dmViTri, t));
  const d = id => VT.dangDung(db, id).tong;
  assert.deepEqual([1, 2, 3, 4, 5, 6].map(i => d('vt' + i) > 0), [true, true, true, true, true, false]);
  assert.equal(VT.xoa(db, 'vt6').kieu, 'xoa');
  assert.equal(VT.xoa(db, 'vt1').kieu, 'ngung');
});
test('MAC_DINH trùng ba vị trí mặc định của định mức BHLĐ', () => {
  assert.deepEqual(VT.MAC_DINH, DM.allPositions({}));
});
test('gieo sẵn chỉ khi danh mục trống; dung() không tự gieo; danh mục đã có dữ liệu không bị thêm', () => {
  assert.deepEqual(VT.dung({}), []);
  const dm = []; assert.equal(VT.gieoSan(dm), 4);
  assert.deepEqual(dm.map(x => x.ten), ['Công nhân cưa', 'Công nhân lột vỏ và bốc xếp', 'Quản lý chung', 'Khác']);
  assert.equal(JSON.stringify(dm[0]), JSON.stringify({id: 'vt1', ten: 'Công nhân cưa', ngung: false}));
  const co = [{id: 'vt1', ten: 'Thợ A', ngung: false}]; assert.equal(VT.gieoSan(co), 0); assert.deepEqual(co.map(x => x.ten), ['Thợ A']);
});
test('doiTen giữ nhiemVu/ghiChu của vị trí', () => {
  const db = {dmViTri: [], rs: {}}; VT.them(db.dmViTri, 'Thợ A', 'Cưa', 'g');
  assert.equal(VT.doiTen(db, 'vt1', 'Thợ A2').ok, true);
  assert.deepEqual(clone(db.dmViTri[0]), {id: 'vt1', ten: 'Thợ A2', ngung: false, nhiemVu: 'Cưa', ghiChu: 'g'});
});

test('P2-1 dangDung đếm viTriId mặc định của người và dmLaoDong; xoa không xóa hẳn', () => {
  const mk = () => { const db = {dmViTri: [], rs: {}}; VT.them(db.dmViTri, 'Thợ Lạ'); return db; };
  const a = mk(); a.dmDoiTuong = [{id: 'd1', nguoi: [{hoTen: 'A', viTriId: 'vt1'}]}];
  assert.equal(VT.dangDung(a, 'vt1').tong, 1);
  const rA = VT.xoa(a, 'vt1'); assert.equal(rA.kieu, 'ngung'); assert.equal(a.dmViTri.length, 1); assert.equal(a.dmViTri[0].ngung, true);
  const b = mk(); b.dmLaoDong = [{viTri: ' thợ lạ '}];
  assert.equal(VT.dangDung(b, 'vt1').tong, 1);
  assert.equal(VT.xoa(b, 'vt1').kieu, 'ngung');
  const c = mk(); c.dmDoiTuong = [{nguoi: [{viTriId: 'vt9'}, {}]}]; c.dmLaoDong = [{viTri: 'Khác'}];
  assert.equal(VT.dangDung(c, 'vt1').tong, 0);
  assert.equal(VT.xoa(c, 'vt1').kieu, 'xoa');
});
