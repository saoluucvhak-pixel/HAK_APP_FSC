/* DATA-05: ID nhân công / xe đã xóa được lưu bền ở f.idDaCap để không bao giờ cấp lại ở phiên sau. */
const test = require('node:test'), assert = require('node:assert');
const LK = require('../src/lienket.js');
const lo = () => ({id: 'f', info: {}, nc: [{id: 'tv1', ten: 'A'}, {id: 'tv2', ten: 'B'}], dx: [{id: 'xr1', bienSo: '75C-1'}, {id: 'xr2', bienSo: '75C-2'}], pc: []});

test('xóa dòng: ghi idDaCap; phiên sau (không truyền tham số) không cấp lại ID đã xóa', () => {
  const f = lo();
  f.nc = [f.nc[0]]; f.dx = [f.dx[0]];   // xóa tv2, xr2
  LK.chuanLo(f, {daXoaNc: ['tv1', 'tv2'], daXoaDx: ['xr1', 'xr2']});
  assert.deepStrictEqual(f.idDaCap, {nc: ['tv2'], dx: ['xr2']});
  const g = JSON.parse(JSON.stringify(f));   // lưu rồi nạp lại
  g.nc.push({ten: 'C'}); g.dx.push({bienSo: '75C-3'});
  LK.chuanLo(g);
  assert.strictEqual(g.nc[1].id, 'tv3'); assert.strictEqual(g.dx[1].id, 'xr3');
});

test('lô chưa xóa dòng nào: không ghi idDaCap, JSON y hệt cũ', () => {
  const f = lo(), truoc = JSON.stringify(f);
  LK.chuanLo(f, {daXoaNc: ['tv1', 'tv2'], daXoaDx: ['xr1', 'xr2']});
  assert.strictEqual(JSON.stringify(f), truoc);
  assert.ok(!('idDaCap' in f));
});

test('idDaCap đi qua Store lưu rồi nạp lại nguyên vẹn', () => {
  const {Store} = require('../src/store');
  const s = new Store(':memory:'), f = lo(); f.nc = [f.nc[0]]; LK.chuanLo(f, {daXoaNc: ['tv1', 'tv2']});
  s.save({v: 2, rs: {o1: {id: 'o1', info: {ten: 'A'}, forests: {f: f}}}});
  assert.deepStrictEqual(s.load().rs.o1.forests.f.idDaCap, {nc: ['tv2']});
  s.close();
});
