'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const HAKDelta = require('../src/delta');

const ui = fs.readFileSync(path.join(__dirname, '..', 'ui/app/29-kho-sao-luu.js'), 'utf8');
const doan = (name, end) => ui.slice(ui.indexOf(name), ui.indexOf(end));
const lo = (id, tenRung) => ({id, info: {tenRung}});
const chu = (forests, congTy = {}) => ({v: 2, rs: {o: {id: 'o', forests}}, congTy});

test('khôi phục vào ID đích: thay bản nháp lô A, giữ bản nháp lô B thuộc cùng chủ rừng', () => {
  const target = lo('aMay', 'Lô A vừa khôi phục');
  const bDraft = lo('b', 'Bản nháp B');
  const db = chu({aMay: lo('aMay', 'Nháp A'), b: bDraft}, {cty1: {id: 'cty1', ten: 'Bản trên máy'}});
  const dbCu = chu({aMay: lo('aMay', 'A trước khi khôi phục'), b: lo('b', 'B đang lưu')}, db.congTy);
  const dbMoi = chu({aMay: target, b: dbCu.rs.o.forests.b}, {...db.congTy, cty2: {id: 'cty2', ten: 'Công ty mới'}});
  const stages = {'o|aMay': {}, 'o|b': {}}, loDirty = new Set(['aMay', 'b']);
  const context = {db, dbMoi, dbCu, HAKDelta, stages, loDirty, loMoi: new Set(), chuNhap: new Map(),
    loCanSaoLuuSheets: new Set(['aMay', 'b']), loSaveIssue: null, aliasHoan() {}, doiDuLieu() {}, nhapTamGhi() {},
    stKeyOf: (oid, fid) => oid + '|' + fid};
  vm.runInNewContext(doan('function dbCapNhatKhoiPhucRieng', '/* 3.0 + phiếu') +
    'dbCapNhatKhoiPhucRieng({dich: {ownerId: "o", forestIds: ["aMay"]}, dbMoi, dbCu, rev: "moi"});', context);
  assert.equal(db.rs.o.forests.aMay, target);
  assert.equal(db.rs.o.forests.b, bDraft);
  assert.deepEqual(Object.keys(stages), ['o|b']);
  assert.deepEqual([...loDirty], ['b']);
  assert.deepEqual([...context.loCanSaoLuuSheets], ['b']);
  assert.equal(db.congTy.cty2.ten, 'Công ty mới');
  assert.equal(context.saveCache.rev, 'moi');
  assert.equal(JSON.parse(context.savedSnap.forests.get('b').json).info.tenRung, 'B đang lưu');
});

test('Ctrl+B báo lỗi ghi đang chờ và dừng trước khi gọi sao lưu', async () => {
  const calls = [], notes = [];
  const context = {HB: {backupTo: async () => calls.push('backupTo')}, ksl: {}, backupBusy: false,
    saveTimer: 1, storeOk: true, clearTimeout() {}, render() {},
    storeSave: async () => ({ok: false, error: 'Mô phỏng lỗi ghi SQLite'}),
    pushNote: (text, kind) => notes.push({text, kind}), showSave: (text, err) => { context.status = {text, err}; }};
  await vm.runInNewContext(doan('async function quickBackup', 'function updateBkPulse') + 'quickBackup()', context);
  assert.deepEqual(calls, []);
  assert.equal(context.storeOk, false);
  assert.equal(context.status.err, true);
  assert.equal(notes[0].kind, 'err');
  assert.match(notes[0].text, /Mô phỏng lỗi ghi SQLite/);
});
