'use strict';
/* Phiếu #10 mục 1 (gọn phần đầu lô) — Electron thật, 1366×768 phóng 150% (cùng cách đo với scripts/anh-man-hinh.js) và 1920×1080:
 *  - tab chủ rừng, tên lô, đường dẫn, “Danh sách rừng · Tiến độ”, nút của lô nằm gọn (≤ 2 hàng cùng với tab lô);
 *  - nội dung dưới tab lô bắt đầu cao hơn ít nhất 100 px (điểm ảnh màn hình ở 150%) so với main 17a5d43 (đo ở đây: DAU_LO_MAIN);
 *  - vẫn đủ thông tin: tên lô, đường dẫn, tiến độ, Danh sách rừng mở được, nút + Rừng mới / Sao lưu lô rừng / Xóa rừng.
 * Chạy: xvfb-run -a node scripts/e2e-dau-lo.js   (IN=1: chỉ in số đo, không kiểm) */
const {_electron: electron} = require('playwright-core');
const path = require('path'), fs = require('fs'), os = require('os');
const src = fs.readFileSync(path.join(__dirname, 'e2e-inan2.js'), 'utf8');
const {lot, seed, PC, EXP1} = new Function(src.slice(src.indexOf('const nv ='), src.indexOf('const plain =')) + '; return {lot, seed, PC, EXP1};')();
const root = path.join(__dirname, '..');
const MAIN_150 = 320;   // đo trên main 17a5d43 bằng chính bài này (IN=1): đáy hàng tab lô ở tab Thông tin rừng, CSS px, 1366×768 150% (1920×1080: 322)
let fail = 0; const ok = (name, cond, extra) => { console.log((cond ? 'ĐẠT  ' : 'LỖI  ') + name + (!cond && extra ? ' — ' + extra : '')); if (!cond) fail++; };
async function do1(rong, cao, scale) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hakqn-dl-'));
  const app = await electron.launch({executablePath: require('electron'), args: [root, '--no-sandbox', '--force-device-scale-factor=' + scale], env: {...process.env, HAKQN_CLOSE: 'discard', HAKQN_DB: path.join(dir, 'd.sqlite'), HAKQN_USERDATA: path.join(dir, 'ud')}});
  const w = await app.firstWindow(); const errs = []; w.on('pageerror', e => errs.push(e.message)); await w.waitForSelector('#side');
  await app.evaluate(({BrowserWindow}, s) => BrowserWindow.getAllWindows()[0].setContentSize(s[0], s[1]), [rong, cao]);
  await w.evaluate(d => window.hak.save(d), seed([lot('fa', 'R-A', {exp: EXP1, pc: PC, kl: 29.75}), lot('fb', 'R-B', {exp: {}, pc: []})])); await w.reload(); await w.waitForSelector('#side');
  await w.click('[data-open=own1]'); await w.click('[data-tab=rung]'); await w.click('[data-forest=fa]'); await w.waitForTimeout(400); await w.evaluate(() => window.scrollTo(0, 0));
  const m = await w.evaluate(() => { const t = document.querySelector('.rungTabs'), main = document.getElementById('main'), r = t.getBoundingClientRect();
    const tops = [...main.querySelectorAll('[data-tab], h2, #loCrumb, .rungTomTat > summary, #lotBackupBtn, [data-act=delForest], [data-ftab]')].filter(e => e.offsetParent && e.getBoundingClientRect().height > 1).map(e => e.getBoundingClientRect().top).sort((x, y) => x - y);
    const hang = tops.reduce((n, t, i) => n + (i && t - tops[i - 1] > 16 ? 1 : 0), tops.length ? 1 : 0);   // số hàng: các phần tử cách nhau > 16 px theo chiều dọc
    return {day: Math.round(r.bottom), hang, coTen: /R-A/.test((main.querySelector('h2') || {}).textContent || '') && /Lô R-A/.test(document.getElementById('loCrumb').innerText), crumb: !!document.getElementById('loCrumb'), chip: /Tiến độ \d+%/.test(main.innerText), nut: !!document.getElementById('lotBackupBtn') && !!main.querySelector('[data-act=delForest]') && !!main.querySelector('[data-act=newForest]')}; });
  await w.click('.rungTomTat > summary'); await w.waitForTimeout(200);
  m.dsMo = await w.isVisible('[data-forest=fb]');
  await app.close(); m.errs = errs; return m;
}
(async () => {
  const a = await do1(1366, 768, 1.5), b = await do1(1920, 1080, 1);
  if (process.env.IN) { console.log(JSON.stringify({a, b})); process.exit(0); }
  ok('1366×768 150%: nội dung bắt đầu cao hơn ≥ 100 px so với main (đáy tab lô ' + a.day + ' CSS px, main ' + MAIN_150 + '; chênh ' + (MAIN_150 - a.day) + ' CSS px = ' + Math.round((MAIN_150 - a.day) * 1.5) + ' điểm ảnh màn hình)', MAIN_150 - a.day >= 100, JSON.stringify(a));
  ok('1366×768 150%: tab chủ rừng, tên lô, đường dẫn, tiến độ, nút của lô và tab lô: 2 hàng', a.hang <= 2, a.hang + ' hàng');
  ok('đủ thông tin: tên lô, đường dẫn, chip tiến độ, nút của lô; Danh sách rừng mở được', a.coTen && a.crumb && a.chip && a.nut && a.dsMo && b.coTen && b.chip && b.dsMo, JSON.stringify({a, b}));
  ok('1920×1080: phần đầu lô một hàng + tab lô', b.hang <= 2, b.hang + ' hàng');
  ok('không có lỗi script', !a.errs.length && !b.errs.length, a.errs.concat(b.errs).join(' | '));
  console.log(fail ? 'CÓ ' + fail + ' LỖI' : 'TẤT CẢ ĐẠT'); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
