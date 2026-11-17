'use strict';
/* Bảng đơn giá theo vị trí của đội (bản 2.2): chỉ vị trí đang có người, số người, lấy đơn giá từ đội khác / lô gần nhất, lưu như cũ (Electron thật, SQLite thật).
 * Chạy: xvfb-run -a node scripts/e2e-dongia-vitri.js */
const {_electron: electron} = require('playwright-core');
const path = require('path'), fs = require('fs'), os = require('os');
const src = fs.readFileSync(path.join(__dirname, 'e2e-inan2.js'), 'utf8');
const {nv, lot, seed} = new Function(src.slice(src.indexOf('const nv ='), src.indexOf('const plain =')) + '; return {nv, lot, seed};')();
const root = path.join(__dirname, '..');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hakqn-dg-'));
let fail = 0; const ok = (name, cond, extra) => { console.log((cond ? 'ĐẠT  ' : 'LỖI  ') + name + (!cond && extra ? ' — ' + extra : '')); if (!cond) fail++; };
(async () => {
  const app = await electron.launch({executablePath: require('electron'), args: [root, '--no-sandbox'], env: {...process.env, HAKQN_CLOSE: 'discard', HAKQN_DB: path.join(dir, 'd.sqlite'), HAKQN_USERDATA: path.join(dir, 'ud'), HAKQN_DOWNLOAD_DIR: path.join(dir, 'out')}});
  const w = require('./_hd30').boc(await app.firstWindow()); const errs = []; w.on('pageerror', e => errs.push(e.message)); w.on('dialog', d => d.accept()); await w.waitForSelector('#side');
  const A = lot('fa', 'R-A', {exp: {}, kl: null, pc: [], nc: [nv(1, 'Tổ trưởng', 'TT A', 'Tổ trưởng', '049085007101'), nv(2, 'Công nhân', 'CN A1', 'Công nhân khai thác', '049085007102'), nv(3, 'Công nhân', 'CN A2', 'Công nhân khai thác', '049085007103')]});
  A.info.hinhThucLuong = 'sanluong'; A.info.donGiaTan = {'Tổ trưởng': 15000, 'Công nhân khai thác': 90000}; A.info.tuNgay = '01/09/2026';
  const B = lot('fb', 'R-B', {exp: {}, kl: null, pc: [], nc: [nv(1, 'Tổ trưởng', 'TT B', 'Tổ trưởng', '049085007201'), nv(2, 'Công nhân', 'CN B1', 'Công nhân khai thác', '049085007202')]});
  B.info.hinhThucLuong = 'sanluong'; B.info.tuNgay = '01/11/2026';
  B.nc = B.nc.map(r => ({...r, maRung: 'R-B'})); B.dx = B.dx.map(r => ({...r, maRung: 'R-B'}));
  await w.evaluate(d => window.hak.save(d), seed([A, B])); await w.reload(); await w.waitForSelector('#side');
  await w.click('[data-open=own1]'); await w.click('[data-tab=rung]'); await w.click('[data-forest=fb]'); await w.click('[data-ftab=nc]'); await w.waitForTimeout(400);
  const rows = await w.$$eval('[data-grp=sanluong] .dgTbl tbody tr', r => r.map(x => x.innerText.replace(/\s+/g, ' ').trim()));
  ok('bảng đơn giá chỉ liệt kê vị trí đang có người, kèm số người (Tổ trưởng 1, Công nhân khai thác 1)', rows.length === 2 && /Tổ trưởng.*1/.test(rows[0]) && /Công nhân khai thác.*1/.test(rows[1]), rows.join(' | '));
  ok('vị trí chưa có người nằm trong mục gập riêng', !!(await w.$('#luongForm details')));
  await w.click('[data-act=luongLay]'); await w.waitForTimeout(300);
  const v = await w.$eval('#luongForm', f => Object.fromEntries([...f.querySelectorAll('input[name^=dt_]')].filter(i => i.value).map(i => [i.name, i.value])));
  ok('Lấy đơn giá từ lô gần nhất: điền đơn giá Tổ trưởng 15000 và Công nhân khai thác 90000', Object.values(v).includes('15000') && Object.values(v).includes('90000'), JSON.stringify(v));
  ok('chỉ điền vào bản nháp: hiện thanh Chưa lưu', !!(await w.$('#stDirty')) || !!(await w.$('#loDirty')) || /Chưa lưu/.test(await w.innerText('#main')));
  await w.click('button[data-act=stSave]').catch(() => {}); await w.waitForTimeout(500);
  const F = (await w.evaluate(() => window.hak.loadSync().db)).rs.own1.forests;
  const g = ((F.fb.doi || [])[0] && F.fb.doi[0].hinhThuc && F.fb.doi[0].hinhThuc.donGiaTan) || F.fb.info.donGiaTan || {}; ok('lưu như cũ: đơn giá nằm trong bảng donGiaTan của đội', g['Tổ trưởng'] === 15000 && g['Công nhân khai thác'] === 90000, JSON.stringify(F.fb.info.donGiaTan) + JSON.stringify((F.fb.doi || []).map(d => d.hinhThuc && d.hinhThuc.donGiaTan)));
  ok('không có lỗi script trên màn hình', errs.length === 0, errs.join(' | '));
  await app.close(); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
