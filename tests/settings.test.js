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
  fs.writeFileSync(S.file(u), '{hỏng'); assert.deepEqual(S.load(u), {dataDir: '', backupDir: ''});
});
test('thư mục đã chọn bị xóa mất: quay về mặc định và báo trong missing', () => {
  const u = tmp(), d = path.join(tmp(), 'khong-co'); S.save(u, {dataDir: d, backupDir: ''});
  const r = S.resolve(u); assert.equal(r.dbFile, path.join(u, 'hakqn.sqlite')); assert.deepEqual(r.missing, [d]);
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
