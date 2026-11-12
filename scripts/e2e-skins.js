'use strict';
/* Kiểm thử bộ chọn bảng màu trong Electron thật: 4 bảng màu × sáng/tối × (1366×768, 1920×1080).
 * Kiểm tra: áp dụng đúng, đổi thật (màu thanh trên cùng và nền khác nhau), nhớ sau khi mở lại, không tràn ngang, không lỗi JavaScript.
 * Ảnh chụp lưu ở SHOTS (mặc định thư mục tạm). Chạy: xvfb-run -a node scripts/e2e-skins.js (Linux) hoặc node scripts/e2e-skins.js (Windows). */
const {_electron: electron} = require('playwright-core');
const path = require('path'), fs = require('fs'), os = require('os');
const root = path.join(__dirname, '..');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'hakqn-skin-')), shots = process.env.SHOTS || path.join(tmp, 'shots');
fs.mkdirSync(shots, {recursive: true});
let fail = 0; const ok = (name, cond, extra) => { console.log((cond ? 'ĐẠT  ' : 'LỖI  ') + name + (!cond && extra ? ' — ' + extra : '')); if (!cond) fail++; };
const SKINS = ['luxe', 'classic', 'neutral', 'champagne'];
const forest = (id, ma, dt, pc) => ({id, info: {maRung: ma, tenRung: 'Rừng ' + ma, diaDiem: 'Thôn A, xã Quế Sơn Trung, thành phố Đà Nẵng', lat: 15.5, lng: 108.1, dienTich: dt, dinhMucTanHa: 10, cuLy: null, tuNgay: '01/01/2026', denNgay: '28/02/2026', donGia: 340000, giayTo: []}, nc: [], dx: [], pc, exp: {}});
const SEED = {v: 2, rs: {o1: {id: 'o1', info: {ma: 'K1', ten: 'NGUYỄN VĂN AN', cccd: '049000000001', diaChi: 'Quế Sơn', danhXung: 'Ông'}, nc: [], dx: [], exp: {}, forests: {
  f1: forest('f1', 'R1', 2, [{stt: 1, ngay: '05/01/2026', bienSo: '92C-11111', soPhieu: 'P1', kl: 12.5, noiGiao: 'NM'}]), f2: forest('f2', 'R2', 1.5, [])}}}};

(async () => {
  const launch = () => electron.launch({executablePath: require('electron'), args: [root, '--no-sandbox'], env: {...process.env, HAKQN_DB: path.join(tmp, 'skin.sqlite'), HAKQN_USERDATA: path.join(tmp, 'userdata'), ELECTRON_DISABLE_SECURITY_WARNINGS: '1'}});
  let app = await launch(), w = await app.firstWindow(); const errs = []; w.on('pageerror', e => errs.push(e.message)); w.on('dialog', d => d.accept());
  await w.waitForSelector('#side');
  await w.evaluate(db => window.hak.save(db), SEED); await w.reload(); await w.waitForSelector('#side');
  const size = async (W, H) => { await app.evaluate(({BrowserWindow}, [a, b]) => { const win = BrowserWindow.getAllWindows()[0]; win.setContentSize(a, b); }, [W, H]); await w.waitForTimeout(250); };
  const css = (sel, prop) => w.$eval(sel, (e, p) => getComputedStyle(e)[p], prop);
  const setTheme = async t => { const cur = await w.evaluate(() => document.documentElement.dataset.theme || 'light'); if (cur !== t) { await w.click('#themeBtn'); await w.waitForTimeout(350); } };
  const pick = async k => { await w.click('#moreMenu summary'); await w.click('[data-skinpick=' + k + ']'); await w.waitForTimeout(250); await w.click('main'); await w.waitForTimeout(150); };

  const bars = {}, bgs = {}, brands = {};
  ok('mặc định là luxe (navy + champagne)', await w.evaluate(() => document.documentElement.dataset.skin) === 'luxe');
  for (const [W, H] of [[1366, 768], [1920, 1080]]) {
    await size(W, H);
    for (const k of SKINS) for (const th of ['light', 'dark']) {
      await setTheme(th); await pick(k);
      const tag = `${k}/${th}/${W}x${H}`;
      ok(tag + ': áp dụng đúng bảng màu và chế độ', await w.evaluate(() => [document.documentElement.dataset.skin, document.documentElement.dataset.theme || 'light']).then(a => a[0] === k && a[1] === th));
      if (th === 'light' && W === 1366) { bars[k] = await css('header.top', 'backgroundColor'); bgs[k] = await css('body', 'backgroundColor'); brands[k] = await css('.btn:not(.ghost)', 'backgroundColor'); }
      const over = async (name, fn) => { await fn(); const o = await w.evaluate(() => ({p: document.documentElement.scrollWidth - innerWidth, m: (() => { const g = document.querySelector('.on .gd'); return g ? g.scrollWidth - g.clientWidth : 0; })()})); ok(`${tag}: ${name} không tràn ngang`, o.p <= 0 && o.m <= 0, JSON.stringify(o)); };
      await over('tổng quan', async () => { await w.click('[data-act=goHome]'); await w.waitForTimeout(100); await w.screenshot({path: path.join(shots, `${k}_${th}_${W}_tongquan.png`)}); });
      await over('hồ sơ rừng', async () => { await w.click('[data-open]'); await w.click('[data-sforest] >> nth=0'); await w.waitForTimeout(150); if (W === 1366) await w.screenshot({path: path.join(shots, `${k}_${th}_${W}_rung.png`)}); });
      await over('báo cáo cha–con', async () => { await w.click('header [data-act=rpOpen]'); await w.click('[data-rpsel=chacon]'); await w.waitForTimeout(150); if (W === 1366) await w.screenshot({path: path.join(shots, `${k}_${th}_${W}_baocao.png`)}); });
      await w.click('[data-act=rpClose]');
    }
  }
  ok('4 bảng màu cho 4 màu thanh trên cùng khác nhau', new Set(Object.values(bars)).size === 4, JSON.stringify(bars));
  ok('4 bảng màu cho 4 màu nền khác nhau', new Set(Object.values(bgs)).size === 4, JSON.stringify(bgs));
  ok('4 bảng màu cho 4 màu nút chính khác nhau', new Set(Object.values(brands)).size === 4, JSON.stringify(brands));
  await pick('classic'); await setTheme('light');
  await app.close();
  // Mở lại: nhớ lựa chọn của người dùng (bảng màu và chế độ), không đổi dữ liệu hồ sơ
  app = await launch(); w = await app.firstWindow(); w.on('pageerror', e => errs.push(e.message)); await w.waitForSelector('#side');
  ok('mở lại: nhớ bảng màu classic (xanh ngọc)', await w.evaluate(() => document.documentElement.dataset.skin) === 'classic');
  ok('mở lại: bảng màu không làm đổi dữ liệu hồ sơ', (await w.$$('[data-open]')).length === 1);
  await w.click('#moreMenu summary'); ok('menu bảng màu đánh dấu đúng lựa chọn đang dùng', await w.$eval('[data-skinpick=classic]', e => e.classList.contains('on') && e.getAttribute('aria-pressed') === 'true') && (await w.$$('[data-skinpick]')).length === 4);
  ok('không có lỗi JavaScript', errs.length === 0, errs.join('; '));
  await app.close();
  console.log('Ảnh chụp: ' + shots);
  console.log(fail ? 'CÓ ' + fail + ' LỖI' : 'TẤT CẢ ĐẠT'); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
