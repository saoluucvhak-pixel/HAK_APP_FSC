'use strict';
/* Việc cần làm trên màn Tổng quan (bản 2.2): phiếu cân chưa gán đội (chặn), giấy tờ xe sắp hết hạn (cảnh báo), bấm dòng để đến đúng lô và tab (Electron thật, SQLite thật).
 * Chạy: xvfb-run -a node scripts/e2e-viec-can-lam.js */
const {_electron: electron} = require('playwright-core');
const path = require('path'), fs = require('fs'), os = require('os');
const src = fs.readFileSync(path.join(__dirname, 'e2e-inan2.js'), 'utf8');
const {nv, lot, seed} = new Function(src.slice(src.indexOf('const nv ='), src.indexOf('const plain =')) + '; return {nv, lot, seed};')();
const root = path.join(__dirname, '..');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hakqn-vcl-'));
let fail = 0; const ok = (name, cond, extra) => { console.log((cond ? 'ĐẠT  ' : 'LỖI  ') + name + (!cond && extra ? ' — ' + extra : '')); if (!cond) fail++; };
const ddmmyyyy = d => String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0') + '/' + d.getFullYear();
(async () => {
  const app = await electron.launch({executablePath: require('electron'), args: [root, '--no-sandbox'], env: {...process.env, HAKQN_CLOSE: 'discard', HAKQN_DB: path.join(dir, 'd.sqlite'), HAKQN_USERDATA: path.join(dir, 'ud'), HAKQN_DOWNLOAD_DIR: path.join(dir, 'out')}});
  const w = require('./_hd30').boc(await app.firstWindow()); const errs = []; w.on('pageerror', e => errs.push(e.message)); w.on('dialog', d => d.accept()); await w.waitForSelector('#side');
  const p = (i, vai, ten, cd, doi) => ({...nv(i, vai, ten, cd, '04908500' + String(5000 + i)), maRung: 'R-A', doi});
  const nc = [p(1, 'Tổ trưởng', 'TT MỘT', 'Tổ trưởng', 'Đội 1'), p(2, 'Tổ trưởng', 'TT HAI', 'Tổ trưởng', 'Đội 2')];
  const ngayHet = new Date(); ngayHet.setDate(ngayHet.getDate() + 10);
  const A = lot('fa', 'R-A', {exp: {}, kl: null, nc, pc: [{_row: 2, maRung: 'R-A', stt: '1', ngay: ddmmyyyy(new Date()), bienSo: '92C-12345', soPhieu: 'PX1', kl: 10, noiGiao: 'KCN Điện Nam, Quảng Nam'}]});
  A.dx = A.dx.map(r => ({...r, kdDen: ddmmyyyy(ngayHet)}));
  await w.evaluate(d => window.hak.save(d), seed([A])); await w.reload(); await w.waitForSelector('#side'); await w.click('#navHome'); await w.waitForSelector('#vclBox');
  const t = await w.innerText('#vclBox');
  ok('khung Việc cần làm có dòng “phiếu cân chưa gán đội” (Chặn) và “đăng kiểm còn 10 ngày” (Cảnh báo)', /Chặn[\s\S]*chưa gán đội/.test(t) && /Cảnh báo[\s\S]*đăng kiểm còn 10 ngày|còn 10 ngày/.test(t), t.slice(0, 500));
  ok('dòng chặn xếp trước dòng cảnh báo', t.indexOf('Chặn') < t.indexOf('Cảnh báo'));
  await w.click('#vclBox [data-act=vclMo] >> nth=0'); await w.waitForTimeout(500);
  ok('bấm dòng đầu: mở đúng lô R-A, tab Vận chuyển (phiếu cân)', /R-A/.test(await w.innerText('#main')) && !!(await w.$('[data-ftab=dx].on')));
  ok('không có lỗi script trên màn hình', errs.length === 0, errs.join(' | '));
  await app.close(); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
