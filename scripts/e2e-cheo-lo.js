'use strict';
/* Kiểm tra chéo lô (bản 2.2): phiếu cân trùng hẳn với lô khác bị chặn BM-08/09/10/14; người ở hai lô trùng thời gian chỉ cảnh báo; lệch sản lượng dự kiến quá 10% (Electron thật, SQLite thật).
 * Chạy: xvfb-run -a node scripts/e2e-cheo-lo.js */
const {_electron: electron} = require('playwright-core');
const path = require('path'), fs = require('fs'), os = require('os');
const src = fs.readFileSync(path.join(__dirname, 'e2e-inan2.js'), 'utf8');
const {lot, seed, P} = new Function(src.slice(src.indexOf('const nv ='), src.indexOf('const plain =')) + '; return {lot, seed, P};')();
const root = path.join(__dirname, '..');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hakqn-cl-'));
let fail = 0; const ok = (name, cond, extra) => { console.log((cond ? 'ĐẠT  ' : 'LỖI  ') + name + (!cond && extra ? ' — ' + extra : '')); if (!cond) fail++; };
(async () => {
  const app = await electron.launch({executablePath: require('electron'), args: [root, '--no-sandbox'], env: {...process.env, HAKQN_CLOSE: 'discard', HAKQN_DB: path.join(dir, 'd.sqlite'), HAKQN_USERDATA: path.join(dir, 'ud'), HAKQN_DOWNLOAD_DIR: path.join(dir, 'out')}});
  const w = await app.firstWindow(); const errs = []; w.on('pageerror', e => errs.push(e.message)); w.on('dialog', d => d.accept()); await w.waitForSelector('#side');
  const A = lot('fa', 'R-A', {exp: {}, kl: null, pc: [P(1, '05/10/2026', '92C-12345', 'PA1', 12.5)]});
  const B = lot('fb', 'R-B', {exp: {}, kl: null, pc: [P(1, '05/10/2026', '92C-12345', 'PA1', 12.5), P(2, '06/10/2026', '92C-67890', 'PB2', 9)]});
  B.nc = B.nc.map(r => ({...r, maRung: 'R-B'})); B.dx = B.dx.map(r => ({...r, maRung: 'R-B'})); B.pc = B.pc.map(r => ({...r, maRung: 'R-B'}));
  await w.evaluate(d => window.hak.save(d), seed([A, B])); await w.reload(); await w.waitForSelector('#side');
  await w.click('[data-open=own1]'); await w.click('[data-tab=rung]'); await w.click('[data-forest=fb]'); await w.click('[data-ftab=kt]'); await w.waitForTimeout(500);
  const t = await w.innerText('#main');
  ok('lô R-B có phiếu PA1 giống hệt lô R-A: mục chặn (nhóm Phiếu cân) nêu số phiếu và mã lô', /giống hệt/.test(t) && /Phiếu PA1/.test(t) && /lô R-A/.test(t), t.slice(0, 500));
  ok('hai lô có cùng nhân công và thời gian giao nhau: cảnh báo “người ở hai lô”', /Chéo lô: người ở hai lô|cũng là nhân công của lô/.test(t));
  ok('lô R-B (diện tích 2 ha, định mức 80 tấn/ha = 160 tấn dự kiến) lệch quá 10% so với 21,5 tấn phiếu cân: cảnh báo lệch sản lượng', /lệch sản lượng dự kiến|lệch .*% so với sản lượng dự kiến/.test(t));
  ok('không có lỗi script trên màn hình', errs.length === 0, errs.join(' | '));
  await app.close(); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
