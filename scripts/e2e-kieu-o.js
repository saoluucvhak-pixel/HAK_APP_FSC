'use strict';
/* Kiểu ô chuẩn (bản 2.2): gõ ngày nhanh (151126, 15-11-26) thành dd/mm/yyyy; CCCD bỏ khoảng trắng; ngày sai giữ nguyên để báo lỗi (Electron thật).
 * Chạy: xvfb-run -a node scripts/e2e-kieu-o.js */
const {_electron: electron} = require('playwright-core');
const path = require('path'), fs = require('fs'), os = require('os');
const root = path.join(__dirname, '..');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hakqn-ko-'));
let fail = 0; const ok = (name, cond, extra) => { console.log((cond ? 'ĐẠT  ' : 'LỖI  ') + name + (!cond && extra ? ' — ' + extra : '')); if (!cond) fail++; };
(async () => {
  const app = await electron.launch({executablePath: require('electron'), args: [root, '--no-sandbox'], env: {...process.env, HAKQN_CLOSE: 'discard', HAKQN_DB: path.join(dir, 'd.sqlite'), HAKQN_USERDATA: path.join(dir, 'ud'), HAKQN_DOWNLOAD_DIR: path.join(dir, 'out')}});
  const w = require('./_hd30').boc(await app.firstWindow()); const errs = []; w.on('pageerror', e => errs.push(e.message)); w.on('dialog', d => d.accept()); await w.waitForSelector('#side');
  await w.click('text=+ Chủ rừng mới'); await w.waitForSelector('#infoForm');
  const go = async (name, v) => { await w.fill('#infoForm [name="' + name + '"]', v); await w.dispatchEvent('#infoForm [name="' + name + '"]', 'change'); return w.inputValue('#infoForm [name="' + name + '"]'); };
  ok('ngày cấp CCCD gõ 151121 → 15/11/2021', (await go('ngayCap', '151121')) === '15/11/2021');
  ok('ngày cấp gõ 15-01-85 → 15/01/1985; 8 chữ số 15112021 → 15/11/2021', (await go('ngayCap', '15-01-85')) === '15/01/1985' && (await go('ngayCap', '15112021')) === '15/11/2021');
  ok('ngày không có thật 310226 giữ nguyên để báo lỗi', (await go('ngayCap', '310226')) === '310226');
  ok('CCCD gõ có khoảng trắng được làm sạch', (await go('cccd', '049 067 005 459')) === '049067005459');
  ok('không có lỗi script trên màn hình', errs.length === 0, errs.join(' | '));
  await app.close(); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
