/* Sửa theo soát độc lập PR thứ hai: so.toDec('-0'), nhập Excel xe (chủ xe mất số 0 đầu), sao lưu thủ công khi ổ thứ hai trùng thư mục chính. */
const test = require('node:test'), assert = require('node:assert');
const fs = require('fs'), os = require('os'), path = require('path');
const SO = require('../src/so.js'), XE = require('../src/xedm.js'), BK = require('../src/backup.js');

test('so.toDec: chuỗi "-0" và "-0,0" cho 0 chứ không phải -0', () => {
  ['-0', '-0,0', '-0.0'].forEach(t => { const v = SO.toDec(t); assert.ok(v === 'x' || Object.is(v, 0), t + ' → ' + String(v) + (Object.is(v, -0) ? ' (-0)' : '')); });
});
test('xedm.timChuXe: MST pháp nhân mất số 0 đầu (9 chữ số) vẫn tìm đúng pháp nhân', () => {
  const dt = [{id: 'dt1', loai: 'phapnhan', ten: 'CÔNG TY VẬN TẢI A', mst: '0401234567', ngung: false, nguoi: []}];
  const r = XE.timChuXe(dt, '', '401234567'); assert.deepStrictEqual(r, {id: 'dt1'});
  assert.ok(XE.timChuXe(dt, '', '999999999').loi, 'số lạ vẫn báo lỗi');
});
test('backupAll: thư mục thứ hai trùng thư mục chính không báo lỗi giả', async () => {
  const {Store} = require('../src/store'), d = fs.mkdtempSync(path.join(os.tmpdir(), 'bk2-')), sd = fs.mkdtempSync(path.join(os.tmpdir(), 'bk2s-'));
  const s = new Store(path.join(sd, 'a.sqlite')); s.save({v: 2, rs: {o1: {id: 'o1', info: {ma: 'A', ten: 'X', cccd: '049000000001'}, forests: {}}}});
  try {
    const r = await BK.backupAll({db: s.db, data: s.load(), outDir: d, outDir2: d, now: () => new Date(2026, 10, 13, 9, 30, 15, 123)});
    assert.strictEqual(r.ok, true, JSON.stringify(r));
    assert.ok(r.copy2.ok, 'copy2 không được báo lỗi: ' + JSON.stringify(r.copy2));
    assert.ok(!/CẢNH BÁO/.test(r.message || ''), r.message);
  } finally { s.close(); fs.rmSync(d, {recursive: true, force: true}); fs.rmSync(sd, {recursive: true, force: true}); }
});
