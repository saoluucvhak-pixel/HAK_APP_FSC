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
const docUi = name => fs.readFileSync(path.join(__dirname, '..', 'ui/app', name), 'utf8');

test('khôi phục gói lô cập nhật theo ID đích, giữ bản nháp lô còn lại', async () => {
  const pkgUi = docUi('15-du-lieu-cai-dat-sao-luu-lo.js');
  const dbCu = chu({a: lo('a', 'A đang lưu'), b: lo('b', 'B đang lưu')});
  const db = chu({a: lo('a', 'A nháp'), b: lo('b', 'B nháp')});
  const dbMoi = chu({a: lo('a', 'A trong gói'), b: dbCu.rs.o.forests.b});
  dbMoi.dinhMuc = {moi: {ten: 'Định mức trong gói'}};
  const pkg = {lo: {id: 'aMayNguon'}};
  const context = {db, HAKDelta, stages: {'o|a': {}, 'o|b': {}}, loDirty: new Set(['a', 'b']),
    loMoi: new Set(), chuNhap: new Map(), loCanSaoLuuSheets: new Set(['b']), loSaveIssue: null,
    aliasHoan() {}, doiDuLieu() {}, nhapTamGhi() {}, stKeyOf: (o, f) => o + '|' + f,
    document: {querySelector: () => ({value: 'thay'})}, $: () => ({classList: {remove() {}}}),
    window: {__lot: pkg}, NAV: {}, confirm: () => true, render() {}, note() {}, lotCnt() {},
    storeSave: job => job(), HB: {
      loadSync: () => ({ok: true, db: dbCu}),
      lotApply: async incoming => {
        assert.equal(incoming, pkg);
        return {ok: true, doi: true, ownerId: 'o', forestId: 'a', db: dbMoi, rev: 'moi', plan: {}};
      }
    }};
  await vm.runInNewContext(doan('function dbCapNhatKhoiPhucRieng', '/* 3.0 + phiếu') +
    pkgUi.slice(pkgUi.indexOf('async function lotGo'), pkgUi.indexOf('async function restoreAll')) +
    'lotGo()', context);
  assert.equal(db.rs.o.forests.a.info.tenRung, 'A trong gói');
  assert.equal(db.rs.o.forests.b.info.tenRung, 'B nháp');
  assert.deepEqual(Object.keys(context.stages), ['o|b']);
  assert.deepEqual([...context.loCanSaoLuuSheets], ['b']);
  assert.equal(db.dinhMuc.moi.ten, 'Định mức trong gói');
  assert.equal(context.saveCache.rev, 'moi');
});

test('lỗi tạo bản dự phòng Sheets của lô A không chặn ghi lô B', async () => {
  const sheetsUi = docUi('17-e-ghi-vao-ho-so.js');
  const loUi = docUi('11-b-ban-nhap.js');
  const a = lo('a', 'A'), b = lo('b', 'B');
  let current = a, writes = 0;
  const context = {HB: {saoLuu: {truocSheets: async () => ({ok: false, error: 'Thư mục thiếu quyền ghi'})}},
    loCanSaoLuuSheets: new Set(['a']), loDirty: new Set(['a', 'b']), curForest: () => current,
    nhapChup() {}, curOwner() {}, pushNote() {}, render() {}, nhapTamGhi() {},
    persistNow: async () => { writes++; return {ok: true}; }};
  const fn = (source, name) => source.slice(source.indexOf('async function ' + name), source.indexOf('\n}\n', source.indexOf('async function ' + name)) + 3);
  vm.runInNewContext(fn(sheetsUi, 'saoLuuTruocKhiLuuLo') + fn(loUi, 'luuLoTT'), context);
  const error = await vm.runInNewContext('luuLoTT({tuKhung: true})', context);
  assert.equal(error.code, 'BACKUP_SHEETS');
  assert.match(error.error, /Bản nháp còn nguyên/);
  assert.equal(writes, 0);
  current = b;
  assert.equal((await vm.runInNewContext('luuLoTT({tuKhung: true})', context)).ok, true);
  assert.equal(writes, 1);
  assert.deepEqual([...context.loDirty], ['a']);
});

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
