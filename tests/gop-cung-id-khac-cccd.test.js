'use strict';
/* Phiếu #12 (quyết định 6 của CHỦ, 19/11/2026): gộp dữ liệu từ máy khác — chủ rừng CÙNG ID nội bộ mà CCCD KHÁC hẳn là hai người khác nhau:
 * dừng để đối chiếu, không ghi gì (cả "giữ", "ghi đè", "giữ cả hai" và khôi phục gói lô). Một bên trống CCCD, hoặc chỉ khác cách viết: như cũ. */
const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('fs'), os = require('os'), path = require('path');
const {Store} = require('../src/store'); const M = require('../src/model'); const L = require('../src/lorung');
const tmp = () => path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'hakqn-gop-')), 'hakqn.sqlite');
const lo = (id, ma, kl) => M.ensureForest({id, info: {maRung: ma, tenRung: 'Rừng ' + ma}, nc: [], dx: [], exp: {}, pc: [{_id: id + 'p', soPhieu: '001', ngay: '01/11/2026', bienSo: '92C-12345', kl}]});
const may = (info, ma, kl) => ({v: 2, rs: {o1: {id: 'o1', info, forests: {f1: lo('f1', ma, kl)}}}});
const A = {ma: 'C01', ten: 'NGUYỄN VĂN A', cccd: '049067005459'}, Bn = {ma: 'C02', ten: 'TRẦN B', cccd: '049067000002'};
const trenMay = () => { const s = new Store(tmp()); s.save(may(A, 'R-1', 20)); return s; };
const sha = t => require('crypto').createHash('sha256').update(t).digest('hex');

test('cùng ID, CCCD khác hẳn: xem trước báo mâu thuẫn; cả 3 cách gộp đều ném lỗi, dữ liệu và bản sao lưu không đổi', () => {
  const file = may(Bn, 'R-9', 10);
  for (const st of ['skip', 'overwrite', 'both']) {
    const s = trenMay(), truoc = JSON.stringify(s.load()), bk = fs.existsSync(s.backupDir) ? fs.readdirSync(s.backupDir).length : 0;
    const pv = s.previewImport(file);
    assert.ok(pv.plan.conflicts.some(c => /cùng ID nội bộ/.test(c.moTa) && /…0002/.test(c.moTa) && /…5459/.test(c.moTa)), st + ': ' + JSON.stringify(pv.plan.conflicts));
    assert.throws(() => s.applyImport(file, st, st === 'both' ? {maMoi: {f1: 'R-9-2'}} : undefined), /cùng ID nội bộ/);
    assert.equal(JSON.stringify(s.load()), truoc, st + ': dữ liệu không đổi');
    assert.equal(fs.existsSync(s.backupDir) ? fs.readdirSync(s.backupDir).length : 0, bk, st + ': không tạo bản sao lưu trước khi khôi phục');
    s.close();
  }
});

test('gói lô cùng tình huống: previewLot báo mâu thuẫn, applyLot ném lỗi', () => {
  const s = trenMay(), src = may(Bn, 'R-9', 10);
  const pkg = L.parsePackage(JSON.stringify(L.seal(L.exportLot(src, 'o1', 'f1', {}), sha)), sha).pkg;
  const plan = s.previewLot(pkg);
  assert.ok(!plan.ok && plan.conflicts.some(c => /cùng ID nội bộ/.test(c.moTa)), JSON.stringify(plan.conflicts));
  assert.throws(() => s.applyLot(pkg, 'thay'));
  assert.equal(s.load().rs.o1.info.ten, 'NGUYỄN VĂN A');
  s.close();
});

test('cùng ID, CCCD giống nhau chỉ khác cách viết: không mâu thuẫn, gộp như cũ', () => {
  const s = trenMay();
  const pv = s.previewImport(may(Object.assign({}, A, {cccd: '049 067 005 459'}), 'R-1', 20));
  assert.deepEqual(pv.plan.conflicts, []);
  s.close();
});

test('CMND 9 số giữ nguyên 9 số ở cả hai bên: không mâu thuẫn', () => {
  const s = new Store(tmp()); s.save(may(Object.assign({}, A, {cccd: '049067005'}), 'R-1', 20));
  assert.deepEqual(s.previewImport(may(Object.assign({}, A, {cccd: '049067005'}), 'R-1', 20)).plan.conflicts, []);
  s.close();
});

test('cùng ID, một bên trống CCCD: không mâu thuẫn (như cũ)', () => {
  const s = trenMay();
  assert.deepEqual(s.previewImport(may(Object.assign({}, A, {cccd: ''}), 'R-1', 20)).plan.conflicts, []);
  s.close();
  const s2 = new Store(tmp()); s2.save(may(Object.assign({}, A, {cccd: ''}), 'R-1', 20));
  assert.deepEqual(s2.previewImport(may(A, 'R-1', 20)).plan.conflicts, []);
  s2.close();
});
