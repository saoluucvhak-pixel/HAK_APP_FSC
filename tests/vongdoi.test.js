'use strict';
const test = require('node:test'), assert = require('node:assert/strict');
const V = require('../src/vongdoi');
const sum = (k1, k2, x2) => ({dot1: {total: 3, xong: true, kyXong: k1, daKy: k1 ? 3 : 1}, dot2: {total: 4, xong: x2 !== undefined ? x2 : k2, kyXong: k2, daKy: k2 ? 4 : 0}});
test('vòng đời: 4 trạng thái tự suy ra theo dữ liệu', () => {
  assert.equal(V.trangThai({pc: []}, sum(false, false)), 'dang-lap');
  assert.equal(V.trangThai({pc: []}, sum(true, false)), 'da-ky-dot1');
  assert.equal(V.trangThai({pc: [{}]}, sum(true, false)), 'dang-khai-thac');
  assert.equal(V.trangThai({pc: [{}], info: {denNgay: '30/11/2026'}}, sum(true, false)), 'cho-quyet-toan');
  assert.equal(V.trangThai({pc: [{}], info: {denNgay: '30/11/2026'}}, sum(true, true)), 'dang-khai-thac', 'đợt 2 đã in và ký xong thì không còn chờ quyết toán');
});
test('điều kiện chốt: nêu đủ việc còn thiếu; đủ thì rỗng', () => {
  const f = {pc: [{}]};
  assert.deepEqual(V.dieuKienChot({f, sum: sum(true, true), chan: 0, pcChuaGan: 0}), []);
  const t = V.dieuKienChot({f: {pc: []}, sum: sum(true, false), chan: 2, pcChuaGan: 3});
  assert.ok(t.some(x => /2 mục chặn/.test(x)) && t.some(x => /3 phiếu cân chưa gán/.test(x)) && t.some(x => /Chưa có phiếu cân/.test(x)) && t.some(x => /Đợt 2/.test(x)));
});
test('chốt: lưu gói đóng băng và dấu vân tay; sau đó chỉ đọc; sửa dữ liệu thì gói không còn nguyên vẹn; mở khóa bắt buộc lý do và ghi nhật ký; chốt lại là phiên bản 2', () => {
  const f = {id: 'f', info: {maRung: 'R'}, pc: [{soPhieu: '1'}]};
  const r = V.chot(f, 'Người lập', 't1', []); assert.ok(r.ok); assert.equal(f.chot.phienBan, 1); assert.ok(V.chiDoc(f)); assert.equal(V.trangThai(f, sum(true, true)), 'da-chot');
  assert.ok(V.nguyenVen(f)); f.pc[0].soPhieu = '2'; assert.equal(V.nguyenVen(f), false); f.pc[0].soPhieu = '1'; assert.ok(V.nguyenVen(f));
  assert.equal(V.chot(f, 'x', 't', []).ok, false, 'không chốt hai lần');
  assert.equal(V.moKhoa(f, '  ', 'a', 't2').ok, false);
  assert.ok(V.moKhoa(f, 'Sửa số phiếu', 'a', 't2').ok); assert.ok(!f.chot && !V.chiDoc(f));
  assert.deepEqual(f.nhatKy.map(x => x.hanh), ['chot', 'mokhoa']); assert.equal(f.nhatKy[1].lyDo, 'Sửa số phiếu');
  assert.ok(V.chot(f, 'Người lập', 't3', []).ok); assert.equal(f.chot.phienBan, 2, 'chốt lại là phiên bản 2');
  assert.equal(V.chot({pc: []}, 'x', 't', ['Còn mục chặn']).ok, false);
});
test('lưu trữ và dừng lô', () => {
  const f = {pc: [{}]}; assert.equal(V.luuTru(f, 't').ok, false, 'chỉ lưu trữ lô đã chốt');
  V.chot(f, 'x', 't0', []); assert.ok(V.luuTru(f, 't1').ok); assert.equal(V.trangThai(f, {}), 'luu-tru'); V.boLuuTru(f, 't2'); assert.equal(V.trangThai(f, {}), 'da-chot');
  const g = {pc: []}; assert.equal(V.dung(g, '', '15/11/2026', 'x', 't').ok, false); assert.ok(V.dung(g, 'Chủ rừng hủy', '15/11/2026', 'x', 't').ok);
  assert.equal(V.trangThai(g, {}), 'da-dung'); assert.ok(V.chiDoc(g)); assert.ok(V.moLai(g, 'tiếp tục', 'x', 't2').ok); assert.ok(!V.chiDoc(g));
});
