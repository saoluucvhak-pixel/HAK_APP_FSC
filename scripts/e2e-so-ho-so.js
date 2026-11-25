'use strict';
/* Sổ hồ sơ khai thác (bản 2.2): mỗi lô một dòng với trạng thái vòng đời, quy mô, sản lượng dự kiến / thực tế, tiền; lọc theo trạng thái; dòng tổng (Electron thật, SQLite thật).
 * Chạy: xvfb-run -a node scripts/e2e-so-ho-so.js */
const {_electron: electron} = require('playwright-core');
const path = require('path'), fs = require('fs'), os = require('os');
const src = fs.readFileSync(path.join(__dirname, 'e2e-inan2.js'), 'utf8');
const {lot, seed, P} = new Function(src.slice(src.indexOf('const nv ='), src.indexOf('const plain =')) + '; return {lot, seed, P};')();
const V = require('../src/vongdoi');
const root = path.join(__dirname, '..');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hakqn-sohs-'));
let fail = 0; const ok = (name, cond, extra) => { console.log((cond ? 'ĐẠT  ' : 'LỖI  ') + name + (!cond && extra ? ' — ' + extra : '')); if (!cond) fail++; };
(async () => {
  const app = await electron.launch({executablePath: require('electron'), args: [root, '--no-sandbox'], env: {...process.env, HAKQN_CLOSE: 'discard', HAKQN_DB: path.join(dir, 'd.sqlite'), HAKQN_USERDATA: path.join(dir, 'ud'), HAKQN_DOWNLOAD_DIR: path.join(dir, 'out')}});
  const w = require('./_hd30').boc(await app.firstWindow()); const errs = []; w.on('pageerror', e => errs.push(e.message)); w.on('dialog', d => d.accept()); await w.waitForSelector('#side');
  const A = lot('fa', 'R-A', {exp: {soKT: '015', ngayKy: '02/10/2026'}, kl: null, pc: [P(1, '05/10/2026', '92C-12345', 'PA1', 12.5), P(2, '06/10/2026', '92C-67890', 'PA2', 9.25)]});
  const B = lot('fb', 'R-B', {exp: {}, kl: null, pc: [P(3, '07/10/2026', '92C-12345', 'PB1', 5)]});
  B.nc = B.nc.map(r => ({...r, maRung: 'R-B'})); B.dx = B.dx.map(r => ({...r, maRung: 'R-B'})); B.pc = B.pc.map(r => ({...r, maRung: 'R-B'}));
  V.chot(B, 'Người lập', '2026-11-10T01:00:00.000Z', []);
  await w.evaluate(d => window.hak.save(d), seed([A, B])); await w.reload(); await w.waitForSelector('#side');
  await w.click('[data-act=rpOpen]'); await w.waitForSelector('#rpBody'); await w.evaluate(() => {
    document.getElementById('rpFrom').value = '';
    const end = document.getElementById('rpTo');
    end.value = '';
    end.dispatchEvent(new Event('change', {bubbles: true}));
  });
  ok('hộp Báo cáo có mẫu “Sổ hồ sơ khai thác”', !!(await w.$('[data-rpsel=sohoso]')));
  await w.click('[data-rpsel=sohoso]'); await w.waitForTimeout(500); let t = await w.innerText('#rpBody');
  ok('mỗi lô một dòng: R-A và R-B', /R-A/.test(t) && /R-B/.test(t) && /Sổ hồ sơ theo lô/.test(t), t.slice(0, 400));
  ok('lô R-B đã chốt hiện trạng thái Đã chốt và ngày chốt 10/11/2026', /R-B[^\n]*Đã chốt/.test(t) && /10\/11\/2026/.test(t), t.slice(0, 800));
  ok('thực tế theo phiếu cân: R-A 21,75 tấn (12,5 + 9,25), R-B 5 tấn; tổng 26,75', /21,75/.test(t) && /26,75/.test(t), t.slice(0, 900));
  ok('có cột trạng thái, mẫu nợ in, mẫu chưa ký', /Trạng thái/.test(t) && /Mẫu nợ in/.test(t) && /Mẫu chưa ký/.test(t));
  await w.selectOption('#rpOne_trangThai', 'Đã chốt'); await w.waitForTimeout(500); t = await w.innerText('#rpBody');
  ok('lọc “Đã chốt”: chỉ còn lô R-B', /R-B/.test(t) && !/R-A\b/.test(t.split('Sổ hồ sơ theo lô')[1] || ''), t.slice(0, 600));
  ok('không có lỗi script trên màn hình', errs.length === 0, errs.join(' | '));
  await app.close(); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
