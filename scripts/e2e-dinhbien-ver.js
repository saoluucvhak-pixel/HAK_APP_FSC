'use strict';
/* Định mức nhân công có phiên bản theo ngày hiệu lực (bản 2.2): lô trước ngày giữ bản cũ, lô sau dùng bản mới (Electron thật, SQLite thật).
 * Chạy: xvfb-run -a node scripts/e2e-dinhbien-ver.js */
const {_electron: electron} = require('playwright-core');
const path = require('path'), fs = require('fs'), os = require('os');
const src = fs.readFileSync(path.join(__dirname, 'e2e-inan2.js'), 'utf8');
const {nv, lot, seed} = new Function(src.slice(src.indexOf('const nv ='), src.indexOf('const plain =')) + '; return {nv, lot, seed};')();
const root = path.join(__dirname, '..');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hakqn-dbv-'));
let fail = 0; const ok = (name, cond, extra) => { console.log((cond ? 'ĐẠT  ' : 'LỖI  ') + name + (!cond && extra ? ' — ' + extra : '')); if (!cond) fail++; };
(async () => {
  const app = await electron.launch({executablePath: require('electron'), args: [root, '--no-sandbox'], env: {...process.env, HAKQN_CLOSE: 'discard', HAKQN_DB: path.join(dir, 'd.sqlite'), HAKQN_USERDATA: path.join(dir, 'ud'), HAKQN_DOWNLOAD_DIR: path.join(dir, 'out')}});
  const w = await app.firstWindow(); const errs = []; w.on('pageerror', e => errs.push(e.message)); w.on('dialog', d => d.accept()); await w.waitForSelector('#side');
  const A = lot('fa', 'R-A', {exp: {}, kl: null, pc: []}), B = lot('fb', 'R-B', {exp: {}, kl: null, pc: []});
  B.nc = B.nc.map(r => ({...r, maRung: 'R-B'})); B.dx = B.dx.map(r => ({...r, maRung: 'R-B'})); B.info.tuNgay = '01/12/2026'; B.info.denNgay = '';
  const D = seed([A, B]);   // định mức nhân công mặc định: 1 đội 8 người
  await w.evaluate(d => window.hak.save(d), D); await w.reload(); await w.waitForSelector('#side');
  await w.click('#navNorm'); await w.waitForSelector('#dbVerBar');
  ok('có thanh phiên bản: chỉ bản gốc, áp dụng cho 2 lô', /Bản gốc/.test(await w.innerText('#dbVerBar')) && /2<\/b> lô|áp dụng cho 2 lô/.test(await w.innerText('#main')));
  await w.fill('#dbVerNew', '31/02/2026'); await w.click('[data-act=dbVerAdd]'); await w.waitForTimeout(300);
  ok('ngày không có thật: báo lỗi, chưa thêm', (await w.$$eval('#dbVerSel option', o => o.length)) === 1);
  await w.fill('#dbVerNew', '01/11/2026'); await w.click('[data-act=dbVerAdd]'); await w.waitForTimeout(400);
  ok('thêm phiên bản từ 01/11/2026 và chọn sẵn phiên bản đó', (await w.$$eval('#dbVerSel option', o => o.map(x => x.textContent))).length === 2 && /01\/11\/2026/.test(await w.$eval('#dbVerSel', s => s.selectedOptions[0].textContent)));
  await w.evaluate(() => { const tr = [...document.querySelectorAll('#dbForm tr[data-db]')].find(t => t.querySelector('[name=b_cd]').value === 'Công nhân cưa'); tr.querySelector('[name=b_so]').value = '5'; document.getElementById('dbForm').requestSubmit(); });
  await w.waitForTimeout(500);
  const D2 = await w.evaluate(() => window.hak.loadSync().db);
  ok('lưu vào phiên bản mới; bản gốc không đổi', !D2.dinhBien || (D2.dinhBien.find(r => r.chucDanh === 'Công nhân cưa') || {}).soNguoi === 2 && ((D2.dinhBienVer || [])[0] || {}).rows.find(r => r.chucDanh === 'Công nhân cưa').soNguoi === 5, JSON.stringify([D2.dinhBien, D2.dinhBienVer]));
  const lech = async fid => { await w.click('[data-open=own1]'); await w.click('[data-tab=rung]'); await w.click('[data-forest=' + fid + ']'); await w.click('[data-ftab=nc]'); await w.waitForTimeout(400); return (await w.innerText('#main')); };
  const ta = await lech('fa'), tb = await lech('fb');
  ok('lô bắt đầu 01/10/2026 (trước ngày hiệu lực) so với định mức gốc: 1 đội 8 người', /1 đội 8 người/.test(ta), (ta.match(/1 đội \d+ người/) || [''])[0]);
  ok('lô bắt đầu 01/12/2026 (sau ngày hiệu lực) so với phiên bản mới: 1 đội 11 người', /1 đội 11 người/.test(tb), (tb.match(/1 đội \d+ người/) || [''])[0]);
  ok('không có lỗi script trên màn hình', errs.length === 0, errs.join(' | '));
  await app.close(); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
