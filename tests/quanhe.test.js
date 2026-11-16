'use strict';
/* 3.0 P3 — kiểm quan hệ ở tầng lưu SQLite (src/quanhe.js, Store mã QUAN_HE): không ghi gì khi sai quan hệ, dữ liệu cũ còn nguyên. */
const test = require('node:test'), assert = require('node:assert/strict');
const QH = require('../src/quanhe'), M = require('../src/model'), V = require('../src/vongdoi'), D = require('../src/delta'), LK = require('../src/lienket');
const {Store} = require('../src/store');
const lo = () => { const f = M.ensureForest({id: 'f1', info: {maRung: 'R-1'}, nc: [{ten: 'A', cccd: '049000000001', vaiTro: 'Tổ trưởng'}], dx: [{bienSo: '92C-1', cccd: '049000000077', chuXe: 'X', nguoiKy: 'Chủ xe'}, {bienSo: '92C-2', cccd: '049000000078', chuXe: 'Y', nguoiKy: 'Chủ xe'}],
  pc: [{soPhieu: 'P1', ngay: '01/11/2026', bienSo: '92C-1', kl: 1}]}); LK.chuanLo(f); return f; };
const db = f => ({v: 2, rs: {o: {id: 'o', info: {ten: 'C'}, forests: {f1: f}}}});

test('quan hệ hợp lệ: thành viên / xe / phiếu trỏ đúng; thành viên chưa thuộc đội (“”) không chặn lưu', () => {
  const f = lo(); f.pc[0].hdvcId = f.dx[0].hdvcId; f.pc[0].xeRowId = f.dx[0].id; f.nc.push({ten: 'B', doiId: ''});
  assert.deepEqual(QH.kiem(f), []);
});
test('sai quan hệ: thành viên thuộc đội không có, xe thuộc hợp đồng không có, phiếu dùng xe của hợp đồng khác, phiếu có xe mà thiếu hợp đồng, ID dòng trùng', () => {
  const f = lo(); f.nc[0].doiId = 'doiX'; f.dx[1].hdvcId = 'hdX';
  f.pc.push({id: 'pc9', soPhieu: 'P2', hdvcId: f.dx[0].hdvcId, xeRowId: f.dx[1].id}, {id: 'pc8', soPhieu: 'P3', xeRowId: f.dx[0].id}, {id: 'pc8', soPhieu: 'P4'});
  const loi = QH.kiem(f).join(' | ');
  ['đội “doiX”', 'hợp đồng vận chuyển “hdX”', 'P2: xe 92C-2 không thuộc hợp đồng', 'P3: có xe nhưng chưa có hợp đồng', 'Phiếu cân trùng mã “pc8”'].forEach(x => assert.ok(loi.includes(x), x + ' — ' + loi));
});
test('lô đã chốt / dừng không kiểm (không đổi được)', () => { const f = lo(); f.nc[0].doiId = 'doiX'; V.chot(f, 'KT', 't', []); assert.deepEqual(QH.kiem(f), []); });

test('Store: lưu toàn bộ sai quan hệ → QUAN_HE, không ghi gì; lưu theo phần thay đổi cũng vậy', () => {
  const s = new Store(':memory:'), f = lo(); s.save(db(f)); const truoc = JSON.stringify(s.load());
  const x = s.load(); x.rs.o.forests.f1.pc[0].hdvcId = 'hdKhongCo'; x.rs.o.forests.f1.pc[0].kl = 99;
  assert.throws(() => s.save(x), e => e.code === 'QUAN_HE' && /hdKhongCo/.test(e.message) && Array.isArray(e.loi));
  assert.equal(JSON.stringify(s.load()), truoc);
  const a = s.load(), snap = D.snapshot(a); a.rs.o.forests.f1.nc[0].doiId = 'doiX';
  const sn2 = D.snapshot(a), d = D.diff(snap, sn2); d.rev = s.rev; d.sideD = D.diffSide(snap.side, sn2.side); d.counts = sn2.counts;
  assert.throws(() => s.saveDelta(d), e => e.code === 'QUAN_HE'); assert.equal(JSON.stringify(s.load()), truoc);
});
