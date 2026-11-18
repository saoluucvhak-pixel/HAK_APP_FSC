'use strict';
/* Định mức nhân công khi CHỈ CÓ bản gốc (Electron thật, SQLite thật): ngày bắt đầu 31/11/2026 không có thật phải báo lỗi (không âm thầm dùng bản gốc), hiện rõ ở Thông tin rừng,
 * Nhân công và Kiểm tra; giữ nguyên giá trị ngày cũ; ngày hợp lệ và ngày trống dùng bản gốc; sửa ngày thì hết lỗi. Chạy: xvfb-run -a node scripts/e2e-dinhbien-goc.js */
const {_electron: electron} = require('playwright-core');
const path = require('path'), fs = require('fs'), os = require('os');
const src = fs.readFileSync(path.join(__dirname, 'e2e-inan2.js'), 'utf8');
const {lot, seed} = new Function(src.slice(src.indexOf('const nv ='), src.indexOf('const plain =')) + '; return {lot, seed};')();
const root = path.join(__dirname, '..'), dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hakqn-dbg-'));
let fail = 0; const ok = (name, cond, extra) => { console.log((cond ? 'ĐẠT  ' : 'LỖI  ') + name + (!cond && extra ? ' — ' + extra : '')); if (!cond) fail++; };
(async () => {
  const app = await electron.launch({executablePath: require('electron'), args: [root, '--no-sandbox'], env: {...process.env, HAKQN_CLOSE: 'discard', HAKQN_DB: path.join(dir, 'd.sqlite'), HAKQN_USERDATA: path.join(dir, 'ud')}});
  const w = require('./_hd30').boc(await app.firstWindow()); const errs = []; w.on('pageerror', e => errs.push(e.message)); w.on('dialog', d => d.accept()); await w.waitForSelector('#side');
  const mk = (id, ma, tu) => { const l = lot(id, ma, {exp: {}, kl: null, pc: []}); l.info.tuNgay = tu; l.info.denNgay = ''; l.nc = l.nc.map(r => ({...r, maRung: ma})); l.dx = l.dx.map(r => ({...r, maRung: ma})); return l; };
  const D = seed([mk('fa', 'R-A', '30/11/2026'), mk('fb', 'R-B', '31/11/2026'), mk('fc', 'R-C', ''), mk('fd', 'R-D', '29/02/2028'), mk('fe', 'R-E', '29/02/2027')]);
  delete D.dinhBienVer;   // chỉ có bản gốc
  await w.evaluate(d => window.hak.save(d), D); await w.reload(); await w.waitForSelector('#side');
  const lo = async id => (await w.evaluate(() => window.hak.loadSync().db)).rs.own1.forests[id];
  const open = async (id, tab) => { if (!(await w.$('[data-ftab=nc]'))) { await w.click('[data-open=own1]'); await w.click('[data-tab=rung]'); } else await w.click('[data-tab=rung]').catch(() => {}); await w.click('[data-forest=' + id + ']'); await w.click('[data-ftab=' + tab + ']'); await w.waitForTimeout(350); };
  await open('fb', 'finfo');
  ok('Thông tin rừng: ngày 31/11/2026 (chỉ có bản gốc) báo lỗi rõ, nêu ngày', !!(await w.$('#tuNgayLoi')) && /31\/11\/2026/.test(await w.innerText('#tuNgayLoi')));
  await w.click('[data-ftab=nc]'); await w.waitForTimeout(300);
  ok('Nhân công: báo ngày sai, không dùng bản gốc để so định mức', !!(await w.$('#dbNgayLoi')) && !/1 đội \d+ người/.test(await w.innerText('#main')));
  await w.click('[data-ftab=kt]'); await w.waitForTimeout(300); ok('Kiểm tra: có mục chặn “ngày bắt đầu sai”', /ngày bắt đầu sai|31\/11\/2026/.test(await w.innerText('#main')));
  ok('giữ nguyên giá trị ngày cũ trong dữ liệu', (await lo('fb')).info.tuNgay === '31/11/2026');
  await open('fa', 'finfo'); ok('30/11/2026 hợp lệ: không báo lỗi, dùng bản gốc', !(await w.$('#tuNgayLoi'))); await w.click('[data-ftab=nc]'); await w.evaluate(() => window.__hak.mucLo('nc', 'dongia'));   /* 3.0: so định mức ở mục “Hình thức và đơn giá” */ await w.waitForTimeout(300); ok('Nhân công 30/11: không có thông báo ngày sai và có so định mức', !(await w.$('#dbNgayLoi')) && /1 đội \d+ người/.test(await w.innerText('#main')));
  await open('fc', 'finfo'); ok('ngày trống: không báo lỗi', !(await w.$('#tuNgayLoi')));
  await open('fd', 'finfo'); ok('29/02/2028 (năm nhuận): hợp lệ', !(await w.$('#tuNgayLoi')));
  await open('fe', 'finfo'); ok('29/02/2027 (năm thường): báo lỗi', !!(await w.$('#tuNgayLoi')));
  await w.click('#navNorm'); await w.waitForSelector('#dbVerBar'); const t = await w.innerText('#main');
  ok('màn Định mức nhân công: nêu riêng các lô có ngày sai (R-B và R-E)', /R-B/.test(t) && /R-E/.test(t) && /Chưa xác định được phiên bản của 2 lô/.test(t), t.slice(0, 500));
  await open('fb', 'finfo'); await w.fill('#forestForm [name=tuNgay]', '30/11/2026'); await w.evaluate(() => document.getElementById('forestForm').requestSubmit()); await w.waitForTimeout(400);
  await w.click('button[data-act=stSave]').catch(() => {}); await w.waitForTimeout(600);
  ok('sửa ngày thành 30/11/2026 và lưu: hết báo lỗi', (await lo('fb')).info.tuNgay === '30/11/2026' && !(await w.$('#tuNgayLoi')));
  ok('không có lỗi script trên màn hình', errs.length === 0, errs.join(' | '));
  await app.close(); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
