'use strict';
/* Phiếu #10 (thêm theo nghiệm thu #06b): bảng phiếu cân ở khung rất hẹp — Electron thật, cửa sổ 1024×700 (bề rộng nhỏ nhất của cửa sổ app;
 * cùng bề rộng CSS với màn 1366×768 phóng 150 % khi cửa sổ không phóng to). Trang chi tiết hợp đồng vận chuyển → mục Phiếu cân:
 *  - cột mục (Hợp đồng, Xe và tài xế, Phiếu cân, Số và ngày văn bản) lên TRÊN nội dung thành một thanh ngang, không chiếm một cột bên trái;
 *  - khung bảng phiếu cân rộng ≥ 85 % vùng nội dung (main 3.0: 439/717 px = 61 %, chỉ thấy 2 cột đầu: Dòng, Thao tác);
 *  - thấy trọn ít nhất 5 cột đầu không cần cuộn ngang (đến hết cột BKS); trang không cuộn ngang;
 *  - ở 1920×1080 cột mục vẫn nằm bên trái (bố cục khung rộng không đổi).
 * Chạy: xvfb-run -a node scripts/e2e-pc-hep.js   (IN=1: chỉ in số đo) */
const {_electron: electron} = require('playwright-core');
const path = require('path'), fs = require('fs'), os = require('os');
const src = fs.readFileSync(path.join(__dirname, 'e2e-inan2.js'), 'utf8');
const {lot, seed, PC, EXP1} = new Function(src.slice(src.indexOf('const nv ='), src.indexOf('const plain =')) + '; return {lot, seed, PC, EXP1};')();
const root = path.join(__dirname, '..');
let fail = 0; const ok = (name, cond, extra) => { console.log((cond ? 'ĐẠT  ' : 'LỖI  ') + name + (!cond && extra ? ' — ' + extra : '')); if (!cond) fail++; };
async function do1(rong, cao) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hakqn-pch-'));
  const app = await electron.launch({executablePath: require('electron'), args: [root, '--no-sandbox'], env: {...process.env, HAKQN_CLOSE: 'discard', HAKQN_DB: path.join(dir, 'd.sqlite'), HAKQN_USERDATA: path.join(dir, 'ud')}});
  const w = await app.firstWindow(); const errs = []; w.on('pageerror', e => errs.push(e.message)); await w.waitForSelector('#side');
  await app.evaluate(({BrowserWindow}, s) => BrowserWindow.getAllWindows()[0].setContentSize(s[0], s[1]), [rong, cao]);
  await w.evaluate(d => window.hak.save(d), seed([lot('fa', 'R-A', {exp: EXP1, pc: PC, kl: 29.75}), lot('fb', 'R-B', {exp: {}, pc: []})])); await w.reload(); await w.waitForSelector('#side');
  await w.click('[data-open=own1]'); await w.click('[data-tab=rung]'); await w.click('[data-forest=fa]'); await w.click('[data-ftab=dx]'); await w.waitForTimeout(200);
  await w.click('#dsHdVcTbl tbody tr[data-act]'); await w.waitForSelector('.mucNav');
  await w.evaluate(() => window.__hak.mucLo && window.__hak.mucLo('dx', 'phieu')); await w.waitForSelector('#stTbl_pc');
  const m = await w.evaluate(() => {
    const t = document.querySelector('#stTbl_pc'), wr = t.closest('.wrap') || t.parentElement, main = document.querySelector('main'), nav = document.querySelector('.mucNav');
    const rw = wr.getBoundingClientRect(), rn = nav.getBoundingClientRect(), cs = getComputedStyle(main);
    const noiDung = main.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    const cot = [...t.rows[0].cells].filter(c => c.getBoundingClientRect().right <= rw.right + 1).map(c => c.textContent.trim());
    return {vw: innerWidth, noiDung: Math.round(noiDung), wrapW: Math.round(rw.width), tile: Math.round(rw.width / noiDung * 100), cot, navTren: rn.bottom <= rw.top + 1, navTrai: rn.right <= rw.left + 1, cuonTrang: document.documentElement.scrollWidth > innerWidth + 1};
  });
  await app.close(); m.errs = errs; return m;
}
(async () => {
  const a = await do1(1024, 700), b = await do1(1920, 1080);
  if (process.env.IN) { console.log(JSON.stringify({a, b})); process.exit(0); }
  ok('1024×700: cột mục lên trên bảng phiếu cân (thanh ngang), không chiếm cột bên trái', a.navTren && !a.navTrai, JSON.stringify(a));
  ok('1024×700: khung bảng phiếu cân rộng ≥ 85 % vùng nội dung (' + a.wrapW + '/' + a.noiDung + ' px = ' + a.tile + ' %)', a.tile >= 85, JSON.stringify(a));
  ok('1024×700: thấy trọn ≥ 5 cột đầu không cần cuộn ngang (' + a.cot.join(', ') + ')', a.cot.length >= 5, JSON.stringify(a.cot));
  ok('1024×700: trang không cuộn ngang (chỉ khung bảng cuộn)', !a.cuonTrang);
  ok('1920×1080: cột mục vẫn nằm bên trái bảng (bố cục khung rộng không đổi)', b.navTrai, JSON.stringify(b));
  ok('không có lỗi script', !a.errs.length && !b.errs.length, a.errs.concat(b.errs).join(' | '));
  console.log(fail ? 'CÓ ' + fail + ' LỖI' : 'TẤT CẢ ĐẠT'); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
