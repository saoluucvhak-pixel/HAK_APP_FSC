'use strict';
const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('fs'), os = require('os'), path = require('path');
const S = require('../src/settings.js');
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'hakqn-set-'));

test('mặc định: dữ liệu ở userData, sao lưu ở backups cạnh file dữ liệu', () => {
  const u = tmp(), r = S.resolve(u);
  assert.equal(r.dbFile, path.join(u, 'hakqn.sqlite')); assert.equal(r.backupDir, path.join(u, 'backups')); assert.equal(r.customData, false); assert.equal(r.customBackup, false);
});
test('lưu rồi đọc lại; file hỏng hoặc thiếu thì về mặc định', () => {
  const u = tmp(), d = tmp(), b = tmp();
  S.save(u, {dataDir: d, backupDir: b});
  const r = S.resolve(u); assert.equal(r.dbFile, path.join(d, 'hakqn.sqlite')); assert.equal(r.backupDir, b); assert.ok(r.customData && r.customBackup);
  fs.writeFileSync(S.file(u), '{hỏng'); assert.deepEqual(S.load(u), {dataDir: '', backupDir: '', lastBackup: '', remindDays: 7, autoKeep: 7});
});
test('thư mục dữ liệu đã cấu hình bị mất: KHÔNG tự quay về mặc định (giữ đường dẫn, báo không truy cập được); thư mục sao lưu mất thì dùng mặc định và báo', () => {
  const u = tmp(), d = path.join(tmp(), 'khong-co'), b = path.join(tmp(), 'khong-co-bk'); S.save(u, {dataDir: d, backupDir: b});
  const r = S.resolve(u); assert.strictEqual(r.dbFile, path.join(d, 'hakqn.sqlite')); assert.deepStrictEqual(r.missing, [b]); assert.strictEqual(r.backupDir, path.join(d, 'backups'));
  assert.strictEqual(S.checkConfigured(u).state, 'unavailable');
});
test('thư mục sao lưu mặc định đi theo thư mục dữ liệu mới', () => {
  const u = tmp(), d = tmp(); S.save(u, {dataDir: d, backupDir: ''});
  assert.equal(S.resolve(u).backupDir, path.join(d, 'backups'));
});
test('HAKQN_DB khóa vị trí dữ liệu', () => {
  const u = tmp(), d = tmp(); S.save(u, {dataDir: d, backupDir: ''});
  const r = S.resolve(u, {HAKQN_DB: path.join(u, 'x', 'a.sqlite')}); assert.equal(r.dbFile, path.join(u, 'x', 'a.sqlite')); assert.ok(r.lockedByEnv); assert.equal(r.customData, false);
});
test('checkFolder: rỗng, tương đối, không tồn tại, là file, ghi được', () => {
  const d = tmp(), f = path.join(d, 'a.txt'); fs.writeFileSync(f, '1');
  assert.throws(() => S.checkFolder(''), /Chưa chọn/); assert.throws(() => S.checkFolder('abc'), /đầy đủ/);
  assert.throws(() => S.checkFolder(path.join(d, 'no')), /không tồn tại/); assert.throws(() => S.checkFolder(f), /không phải thư mục/);
  assert.equal(S.checkFolder(d), d); assert.deepEqual(fs.readdirSync(d), ['a.txt']);
});
test('checkSpace: đủ chỗ thì qua, thiếu chỗ báo rõ số MB; không đọc được thì không chặn', () => {
  const d = tmp();
  assert.equal(S.checkSpace(d, 1024, 500 * 1048576), true);
  assert.throws(() => S.checkSpace(d, 100 * 1048576, 150 * 1048576), /không đủ chỗ trống: còn 150 MB, cần khoảng 210 MB/);
  assert.equal(S.checkSpace(path.join(d, 'khong-co'), 1024), true);
});
test('nhắc sao lưu: tắt, chưa đến hạn, quá hạn, chưa từng sao lưu', () => {
  const day = 86400000, now = Date.parse('2026-11-20T00:00:00Z');
  const st = o => ({remindDays: 7, lastBackup: '', ...o});
  assert.equal(S.backupDue(st({remindDays: 0, lastBackup: '2020-01-01T00:00:00Z'}), now, now).due, false);
  assert.deepEqual(S.backupDue(st({lastBackup: new Date(now - 3 * day).toISOString()}), now, now - 99 * day), {due: false, days: 3, since: 'last'});
  assert.equal(S.backupDue(st({lastBackup: new Date(now - 8 * day).toISOString()}), now, now).due, true);
  assert.equal(S.backupDue(st(), now, now - 2 * day).due, false);   // mới cài, chưa đến hạn
  const r = S.backupDue(st(), now, now - 10 * day); assert.ok(r.due && r.days === null);
  assert.equal(S.backupDue(st(), now, NaN).due, false);
});
test('lưu cài đặt giữ nguyên các trường khác và mặc định nhắc 7 ngày', () => {
  const u = tmp(); assert.equal(S.load(u).remindDays, 7);
  S.save(u, {...S.load(u), lastBackup: '2026-11-01T00:00:00.000Z', remindDays: 14}); S.save(u, {...S.load(u), dataDir: ''});
  assert.deepEqual([S.load(u).lastBackup, S.load(u).remindDays], ['2026-11-01T00:00:00.000Z', 14]);
});
