'use strict';
/* Sổ văn bản và quy tắc đánh số (bản 2.2): bảng số theo quy tắc STT/NĂM/LOẠI-MÃLÔ, điền ô trống không ghi đè số đã có, số trùng lô khác bị báo (Electron thật, SQLite thật).
 * Chạy: xvfb-run -a node scripts/e2e-so-van-ban.js */
const {_electron: electron} = require('playwright-core');
const path = require('path'), fs = require('fs'), os = require('os');
const src = fs.readFileSync(path.join(__dirname, 'e2e-inan2.js'), 'utf8');
const {nv, lot, seed} = new Function(src.slice(src.indexOf('const nv ='), src.indexOf('const plain =')) + '; return {nv, lot, seed};')();
const root = path.join(__dirname, '..');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hakqn-svb-'));
let fail = 0; const ok = (name, cond, extra) => { console.log((cond ? 'ĐẠT  ' : 'LỖI  ') + name + (!cond && extra ? ' — ' + extra : '')); if (!cond) fail++; };
(async () => {
  const app = await electron.launch({executablePath: require('electron'), args: [root, '--no-sandbox'], env: {...process.env, HAKQN_CLOSE: 'discard', HAKQN_DB: path.join(dir, 'd.sqlite'), HAKQN_USERDATA: path.join(dir, 'ud'), HAKQN_DOWNLOAD_DIR: path.join(dir, 'out')}});
  const w = await app.firstWindow(); const errs = []; w.on('pageerror', e => errs.push(e.message)); w.on('dialog', d => d.accept()); await w.waitForSelector('#side');
  const p = (i, vai, ten, cd, doi) => ({...nv(i, vai, ten, cd, '04908500' + String(6000 + i)), maRung: 'R-A', doi});
  const nc = [p(1, 'Tổ trưởng', 'TT MỘT', 'Tổ trưởng', 'Đội 1'), p(2, 'Tổ trưởng', 'TT HAI', 'Tổ trưởng', 'Đội 2')];
  const A = lot('fa', 'R-A', {exp: {ngayKy: '02/10/2026'}, kl: null, nc, pc: []});
  const B = lot('fb', 'R-B', {exp: {soKT: '015'}, kl: null, pc: []}); B.nc = B.nc.map(r => ({...r, maRung: 'R-B'})); B.dx = B.dx.map(r => ({...r, maRung: 'R-B'}));
  const D = seed([A, B]); await w.evaluate(d => window.hak.save(d), D); await w.reload(); await w.waitForSelector('#side');
  await w.click('[data-open=own1]'); await w.click('[data-tab=rung]'); await w.click('[data-forest=fa]'); await w.click('[data-ftab=xuat]'); await w.waitForSelector('#soVanBan');
  const t = await w.innerText('#soVanBan');
  ok('Sổ văn bản liệt kê đội 1, đội 2 và đội xe với số theo quy tắc (01/2026/HĐGK-RA, 02/2026/GUQ-RA)', /01\/2026\/HĐGK-RA/.test(t) && /02\/2026\/GUQ-RA/.test(t) && /HĐVC-RA/.test(t), t.slice(0, 500));
  await w.click('[data-act=svbDien]'); await w.waitForTimeout(500); await w.click('button[data-act=stSave]'); await w.waitForTimeout(600);
  const F = (await w.evaluate(() => window.hak.loadSync().db)).rs.own1.forests.fa;
  ok('sau khi điền và lưu: số của từng đội theo STT riêng, đội 1 = 01, đội 2 = 02', /^01\/2026\/HĐGK-RA$/.test(F.doi[0].exp.soKT) && /^02\/2026\/HĐGK-RA$/.test(F.doi[1].exp.soKT) && F.doi[1].stt === 2, JSON.stringify(F.doi.map(d => d.exp)));
  ok('điền không ghi đè số đã có và điền lại thì hết ô trống', (await w.$eval('[data-act=svbDien]', b => b.disabled)));
  // lô B có số 015 riêng; gán số trùng với lô A cho B rồi kiểm tra báo trùng
  const D2 = await w.evaluate(() => window.hak.loadSync().db); const so = D2.rs.own1.forests.fa.doi[0].exp.soKT; D2.rs.own1.forests.fb.doi[0].exp.soKT = so;
  await w.evaluate(d => window.hak.save(d), D2); await w.reload(); await w.waitForSelector('#side');
  await w.click('[data-open=own1]'); await w.click('[data-tab=rung]'); await w.click('[data-forest=fb]'); await w.click('[data-ftab=kt]'); await w.waitForTimeout(500);
  ok('lô B có số trùng lô A: mục “Số văn bản trùng” ở tab Kiểm tra', /Số văn bản trùng|cũng đang dùng ở lô R-A/.test(await w.innerText('#main')), (await w.innerText('#main')).slice(0, 300));
  ok('không có lỗi script trên màn hình', errs.length === 0, errs.join(' | '));
  await app.close(); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
