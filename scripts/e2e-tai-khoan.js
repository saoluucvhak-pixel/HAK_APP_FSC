'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {_electron: electron} = require('playwright-core');
const root = path.join(__dirname, '..');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'hakqn-account-'));
const password = 'DangNhap-KiemThu-2026';
const user = 'kiemthu';
const launch = async (profile, setup = false) => {
  const dir = path.join(tmp, profile);
  const app = await electron.launch({executablePath: require('electron'),
    args: [root, '--no-sandbox', ...(setup ? ['--hakqn-account-setup-test'] : [])],
    env: {...process.env, HAKQN_CLOSE: 'discard', HAKQN_USERDATA: dir, HAKQN_DB: path.join(dir, 'data.sqlite')}});
  return {app, page: await app.firstWindow(), dir};
};
const switchSettings = async page => {
  await page.locator('#navSet').click();
  await page.locator('#setTab_setaccount').click();
  await page.locator('#setAccountForm').waitFor();
};
const fill = async (form, secret, confirm) => {
  await form.locator('[name=user]').fill(user);
  await form.locator('[name=password]').fill(secret);
  if (confirm !== undefined) await form.locator('[name=confirm]').fill(confirm);
  await form.locator('button[type=submit]').click();
};
const seed = {v: 2, rs: {cr: {id: 'cr', info: {ma: 'CR-01', ten: 'Chủ rừng kiểm thử'}, forests: {}}}};
const savedName = page => page.evaluate(() => window.hak.loadSync().db.rs.cr.info.ten);
const ok = message => console.log('ĐẠT  ' + message);

(async () => {
  let run;
  try {
    run = await launch('single');
    await run.page.locator('#side').waitFor();
    assert.equal(await run.page.evaluate(() => window.hak.account.status()).then(r => r.mode), 'single');
    assert.equal(await run.page.evaluate(d => window.hak.save(d), seed).then(r => r.ok), true);
    ok('mở trực tiếp ở chế độ một người và lưu được hồ sơ');
    await switchSettings(run.page);
    await fill(run.page.locator('#setAccountForm'), password, password);
    await run.page.locator('#setAccountForm[data-account-action=disable]').waitFor();
    const config = JSON.parse(fs.readFileSync(path.join(run.dir, 'local-account.json'), 'utf8'));
    assert.equal(config.mode, 'account');
    assert.match(config.hash, /^[\da-f]{64}$/);
    assert.notEqual(config.hash, password);
    await run.app.close();

    run = await launch('single');
    await run.page.locator('#accountForm').waitFor();
    assert.equal(await run.page.evaluate(() => window.hak.loadSync().code), 'ACCOUNT_LOCKED');
    assert.equal(await run.page.evaluate(() => window.hak.backupTo()).then(r => r.code), 'ACCOUNT_LOCKED');
    await fill(run.page.locator('#accountForm'), 'Sai-Mat-Khau');
    await run.page.locator('#accountFeedback').filter({hasText: 'không đúng'}).waitFor();
    await fill(run.page.locator('#accountForm'), password);
    await run.page.locator('#side').waitFor();
    assert.equal(await savedName(run.page), 'Chủ rừng kiểm thử');
    ok('bật tài khoản, khởi động lại phải đăng nhập và dữ liệu giữ nguyên');

    await switchSettings(run.page);
    await fill(run.page.locator('#setAccountForm'), 'Sai-Mat-Khau');
    await run.page.locator('#setAccountFeedback').filter({hasText: 'không đúng'}).waitFor();
    assert.equal(await run.page.evaluate(() => window.hak.account.status()).then(r => r.mode), 'account');
    await fill(run.page.locator('#setAccountForm'), password);
    await run.page.locator('#setAccountForm[data-account-action=create]').waitFor();
    await run.app.close();

    run = await launch('single');
    await run.page.locator('#side').waitFor();
    assert.equal(await savedName(run.page), 'Chủ rừng kiểm thử');
    ok('tắt đăng nhập chỉ khi xác thực đúng, lần sau mở trực tiếp');
    await run.app.close();

    run = await launch('installer', true);
    await run.page.locator('#accountConfirm').waitFor();
    assert.equal(await run.page.evaluate(() => window.hak.loadSync().code), 'ACCOUNT_LOCKED');
    assert.equal(fs.existsSync(path.join(run.dir, 'data.sqlite')), false);
    await fill(run.page.locator('#accountForm'), password, 'Nhap-Lai-Sai');
    await run.page.locator('#accountFeedback').filter({hasText: 'chưa khớp'}).waitFor();
    await fill(run.page.locator('#accountForm'), password, password);
    await run.page.locator('#side').waitFor();
    await run.app.close();

    run = await launch('installer', true);
    await run.page.locator('#accountForm').waitFor();
    assert.equal(await run.page.locator('#accountConfirmRow').isVisible(), false);
    ok('chế độ tài khoản lúc cài yêu cầu tạo tài khoản, sau đó đăng nhập bình thường');
  } finally {
    if (run) await run.app.close().catch(() => {});
  }
})().catch(error => { console.error(error); process.exitCode = 2; });
