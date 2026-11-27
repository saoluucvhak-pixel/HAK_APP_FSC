'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {LocalAccount} = require('../src/local-account');

function profile(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hak-local-account-'));
  t.after(() => fs.rmSync(dir, {recursive: true, force: true}));
  return dir;
}

test('hồ sơ cũ dùng trực tiếp và cấu hình tài khoản hỏng khóa ứng dụng', async t => {
  const dir = profile(t);
  assert.deepEqual(new LocalAccount(dir).status(), {mode: 'single', unlocked: true});
  assert.deepEqual(new LocalAccount(dir, {requireSetup: true}).status(), {mode: 'setup', unlocked: false});
  fs.writeFileSync(path.join(dir, 'local-account.json'), '{"version":1,"mode":"account"}');
  const auth = new LocalAccount(dir);
  assert.deepEqual(auth.status(), {mode: 'unavailable', unlocked: false});
  assert.equal((await auth.request('create', {})).ok, false);
});

test('tạo tài khoản ghi một lần khi có yêu cầu đồng thời, thông tin trả về không có bản băm', async t => {
  const dir = profile(t);
  const auth = new LocalAccount(dir);
  const password = 'Mat-Khau-Kiem-Thu';
  const pending = auth.request('create', {user: 'người-dùng', password, confirm: password});
  assert.equal((await auth.request('create', {user: 'khac', password, confirm: password})).ok, false);
  assert.deepEqual(await pending, {ok: true, mode: 'account', unlocked: true, user: 'người-dùng'});
  const locked = new LocalAccount(dir);
  assert.deepEqual(locked.status(), {mode: 'account', unlocked: false});
  assert.equal((await locked.request('disable', {user: 'người-dùng', password})).ok, false);
});
