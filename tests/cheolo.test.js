'use strict';
const test = require('node:test'), assert = require('node:assert/strict');
const C = require('../src/cheolo');
const pc = (so, ngay, bien, g1, g2, kl) => ({soPhieu: so, ngay, bienSo: bien, gioCan1: g1, gioCan2: g2, kl: kl || 10});
const lo = (id, ma, o) => ({id, info: Object.assign({maRung: ma, tuNgay: '01/10/2026', denNgay: '30/10/2026', dienTich: 2, dinhMucTanHa: 10}, o.info), pc: o.pc || [], nc: o.nc || []});
const mk = (...ls) => ({rs: {o1: {id: 'o1', forests: Object.fromEntries(ls.map(l => [l.id, l]))}}});
const nhom = (r, n) => r.filter(x => x.nhom === n);
test('phiếu cân giống hệt ở lô khác bị chặn; khác ngày hoặc biển số thì không', () => {
  const db = mk(lo('a', 'A', {pc: [pc('1001', '05/10/2026', '92C-123.45', '08:00', '09:00')]}), lo('b', 'B', {pc: [pc('1001', '05/10/2026', '92c12345', '08:00', '09:00'), pc('1002', '06/10/2026', '92C-1', '08:00', '09:00')]}));
  const r = C.kiemTra(db, 'o1', 'b'); const t = nhom(r, 'Chéo lô: phiếu cân trùng'); assert.equal(t.length, 1); assert.equal(t[0].kind, 'chan'); assert.match(t[0].text, /1 phiếu cân giống hệt/); assert.match(t[0].text, /lô A/);
  assert.equal(nhom(C.kiemTra(mk(lo('a', 'A', {pc: [pc('1001', '05/10/2026', '92C-1', '08:00', '09:00')]}), lo('b', 'B', {pc: [pc('1001', '06/10/2026', '92C-1', '08:00', '09:00')]})), 'o1', 'b'), 'Chéo lô: phiếu cân trùng').length, 0);
});
test('một xe ở hai lô trùng khoảng giờ cân: cảnh báo; giờ không giao nhau thì không', () => {
  const a = lo('a', 'A', {pc: [pc('1', '05/10/2026', '92C-1', '08:00:00', '09:30:00')]});
  const b = n => lo('b', 'B', {pc: [pc('2', '05/10/2026', '92C-1', n[0], n[1])]});
  const r = nhom(C.kiemTra(mk(a, b(['09:00:00', '10:00:00'])), 'o1', 'b'), 'Chéo lô: xe trùng giờ cân'); assert.equal(r.length, 1); assert.equal(r[0].kind, 'doi');
  assert.equal(nhom(C.kiemTra(mk(a, b(['10:00:00', '11:00:00'])), 'o1', 'b'), 'Chéo lô: xe trùng giờ cân').length, 0);
});
test('một người ở hai lô có thời gian khai thác giao nhau: cảnh báo, không chặn; không giao nhau thì không báo', () => {
  const nc = [{ten: 'AN', cccd: '049085007001'}];
  const r = nhom(C.kiemTra(mk(lo('a', 'A', {nc}), lo('b', 'B', {nc, info: {tuNgay: '20/10/2026', denNgay: '30/11/2026'}})), 'o1', 'b'), 'Chéo lô: người ở hai lô'); assert.equal(r.length, 1); assert.equal(r[0].kind, 'doi');
  assert.equal(nhom(C.kiemTra(mk(lo('a', 'A', {nc}), lo('b', 'B', {nc, info: {tuNgay: '01/12/2026', denNgay: '30/12/2026'}})), 'o1', 'b'), 'Chéo lô: người ở hai lô').length, 0);
});
test('tổng phiếu cân lệch sản lượng dự kiến quá 10% thì cảnh báo; trong ngưỡng hoặc đổi ngưỡng thì không', () => {
  const l = kl => lo('a', 'A', {pc: [pc('1', '05/10/2026', '92C-1', '', '', kl)]});   // dự kiến 2 ha × 10 = 20 tấn
  assert.equal(nhom(C.kiemTra(mk(l(25)), 'o1', 'a'), 'Chéo lô: lệch sản lượng dự kiến').length, 1);
  assert.equal(nhom(C.kiemTra(mk(l(21)), 'o1', 'a'), 'Chéo lô: lệch sản lượng dự kiến').length, 0);
  assert.equal(nhom(C.kiemTra(mk(l(25)), 'o1', 'a', {nguong: 30}), 'Chéo lô: lệch sản lượng dự kiến').length, 0);
});

test('chỉ mục chéo lô dùng lại cho nhiều lô cho kết quả giống hệt tính riêng từng lô (và nhanh hơn rõ khi nhiều lô)', () => {
  const C = require('../src/cheolo'), mk = (id, ma, n, off) => ({id, info: {maRung: ma, tuNgay: '01/10/2026', denNgay: '30/11/2026'}, nc: [], pc: Array.from({length: n}, (_, i) => { const g = off + i; return {soPhieu: 'S' + g, ngay: String(1 + (g % 28)).padStart(g % 2 ? 2 : 1, '0') + '/11/2026', bienSo: '92C-' + (10000 + (g % 7)), gioCan1: '0' + (g % 9) + ':00', gioCan2: '0' + (g % 9) + ':45', kl: 5, _row: i + 2}; })});
  const forests = {}; for (let i = 0; i < 12; i++) forests['f' + i] = mk('f' + i, 'R' + i, 60, i * 40);   // các lô chồng nhau 20 số phiếu
  const db = {rs: {o: {id: 'o', forests}}}, cm = C.taoChiMuc(db);
  Object.keys(forests).forEach(fid => { assert.deepStrictEqual(C.kiemTra(db, 'o', fid, {chiMuc: cm}), C.kiemTra(db, 'o', fid)); assert.deepStrictEqual(C.phieuTrung(db, 'o', fid, null, cm), C.phieuTrung(db, 'o', fid)); });
  assert.ok(C.kiemTra(db, 'o', 'f1').some(x => x.nhom === 'Chéo lô: phiếu cân trùng'), 'dữ liệu thử có phiếu trùng thật');
  assert.deepStrictEqual(C.phieuTrung(db, 'o', 'f1', null, C.taoChiMuc({rs: {}})), C.phieuTrung(db, 'o', 'f1'), 'chỉ mục của db khác bị bỏ qua, dựng lại đúng');
});

test('A2: lệch sản lượng dự kiến dùng CÙNG định nghĩa với giao diện: lô chưa tự điền định mức dùng định mức gỗ keo mặc định theo ngày bắt đầu; tổng phiếu làm tròn từng phiếu theo kg', () => {
  const DM = require('../src/dinhmuc');
  const l = lo('a', 'A', {info: {dinhMucTanHa: null}, pc: [pc('1', '05/10/2026', '92C-1', '', '', 30)]}), db = mk(l);
  assert.equal(nhom(C.kiemTra(db, 'o1', 'a'), 'Chéo lô: lệch sản lượng dự kiến').length, 0, 'chưa có định mức nào: không kiểm');
  db.dinhMucKeo = [{tuNgay: '01/01/2026', tanHa: 10}];   // dự kiến 2 ha × 10 = 20 tấn; phiếu 30 tấn lệch 50%
  const r = nhom(C.kiemTra(db, 'o1', 'a'), 'Chéo lô: lệch sản lượng dự kiến');
  assert.equal(r.length, 1, 'lô dùng định mức gỗ keo mặc định cũng được kiểm');
  assert.equal(DM.sanLuongDuKien(db, l.info), 20);
  assert.equal(DM.tongPhieuTan([{kl: 1.0004}, {kl: 1.0004}, {kl: 'x'}, {kl: -1}]), 2, 'làm tròn từng phiếu theo kg (1,0004 tấn = 1.000 kg)');
  db.dinhMucKeo = [{tuNgay: '01/12/2026', tanHa: 10}];   // định mức chỉ hiệu lực sau ngày bắt đầu: không có định mức cho lô
  assert.equal(nhom(C.kiemTra(db, 'o1', 'a'), 'Chéo lô: lệch sản lượng dự kiến').length, 0);
});

test('Lô 7b (T-15): cùng số phiếu và ngày cân ở hai lô nhưng khác BKS — phieuTrung trả khacBks=true và kiemTra báo cảnh báo mềm (kind="doi"), không chặn', () => {
  const db = mk(
    lo('a', 'A', {pc: [pc('1001', '05/10/2026', '92C-111.11', '08:00', '09:00')]}),
    lo('b', 'B', {pc: [pc('1001', '5/10/2026', '92C-222.22', '10:00', '11:00')]})
  );
  const dup = C.phieuTrung(db, 'o1', 'b');
  assert.equal(dup.length, 1);
  assert.equal(dup[0].khacBks, true);
  assert.equal(dup[0].ma, 'A');
  const items = C.kiemTra(db, 'o1', 'b');
  assert.equal(nhom(items, 'Chéo lô: phiếu cân trùng').length, 0);
  const soft = nhom(items, 'Chéo lô: phiếu cân cùng số và ngày ở lô khác');
  assert.equal(soft.length, 1);
  assert.equal(soft[0].kind, 'doi');
  assert.match(soft[0].text, /92C-222\.22/);
  assert.match(soft[0].text, /92C-111\.11/);
});
