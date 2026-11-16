'use strict';
/* Tìm kiếm toàn cục (bản 2.2): Ctrl+K, tìm không dấu, biển số liền, bấm kết quả mở đúng lô / danh mục, Esc đóng (Electron thật, SQLite thật).
 * Chạy: xvfb-run -a node scripts/e2e-timkiem.js */
const {_electron: electron} = require('playwright-core');
const path = require('path'), fs = require('fs'), os = require('os');
const src = fs.readFileSync(path.join(__dirname, 'e2e-inan2.js'), 'utf8');
const {nv, lot, seed, P} = new Function(src.slice(src.indexOf('const nv ='), src.indexOf('const plain =')) + '; return {nv, lot, seed, P};')();
const root = path.join(__dirname, '..');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hakqn-tk-'));
let fail = 0; const ok = (name, cond, extra) => { console.log((cond ? 'ĐẠT  ' : 'LỖI  ') + name + (!cond && extra ? ' — ' + extra : '')); if (!cond) fail++; };
(async () => {
  const app = await electron.launch({executablePath: require('electron'), args: [root, '--no-sandbox'], env: {...process.env, HAKQN_CLOSE: 'discard', HAKQN_DB: path.join(dir, 'd.sqlite'), HAKQN_USERDATA: path.join(dir, 'ud'), HAKQN_DOWNLOAD_DIR: path.join(dir, 'out')}});
  const w = require('./_hd30').boc(await app.firstWindow()); const errs = []; w.on('pageerror', e => errs.push(e.message)); w.on('dialog', d => d.accept()); await w.waitForSelector('#side');
  const A = lot('fa', 'R-A', {exp: {soKT: '015', ngayKy: '02/10/2026'}, kl: null, pc: [P(1, '05/10/2026', '92C-12345', 'PA1', 12.5)], nc: [nv(1, 'Tổ trưởng', 'TRẦN TỔ TRƯỞNG', 'Tổ trưởng', '049085007001')]});
  const D = seed([A]); D.dmLaoDong = [{ngayCapNhat: '01/11/2026', cccd: '049085007001', ten: 'TRẦN TỔ TRƯỞNG', viTri: 'Tổ trưởng', chucVu: 'Tổ trưởng'}];
  await w.evaluate(d => window.hak.save(d), D); await w.reload(); await w.waitForSelector('#side');
  await w.keyboard.press('Control+k'); await w.waitForSelector('#tkInput');
  ok('Ctrl+K mở ô tìm', !!(await w.$('#tkPanel')));
  await w.fill('#tkInput', 'nguyen van mot'); await w.waitForTimeout(300);
  ok('gõ không dấu “nguyen van mot”: ra chủ rừng NGUYỄN VĂN MỘT', /Chủ rừng/.test(await w.innerText('#tkPanel')) && /NGUYỄN VĂN MỘT/.test(await w.innerText('#tkPanel')));
  await w.fill('#tkInput', '92c12345'); await w.waitForTimeout(300);
  const t = await w.innerText('#tkPanel'); ok('biển số gõ liền “92c12345”: ra Xe và Phiếu cân', /Xe/.test(t) && /Phiếu cân/.test(t) && /92C-12345/.test(t), t.slice(0, 200));
  await w.fill('#tkInput', 'tran to truong'); await w.waitForTimeout(300);
  ok('tìm người: ra ở lô và ở danh mục lao động', (await w.$$('.tkItem')).length >= 2);
  await w.click('.tkItem >> nth=0'); await w.waitForTimeout(500);
  ok('bấm kết quả: đóng hộp tìm và mở đúng lô R-A', !(await w.$('#tkBox')) && /R-A/.test(await w.innerText('#main')));
  await w.keyboard.press('Control+k'); await w.fill('#tkInput', '5459'); await w.waitForTimeout(300);
  ok('đoạn cuối CCCD “5459” tìm ra chủ rừng', /NGUYỄN VĂN MỘT/.test(await w.innerText('#tkPanel')));
  await w.keyboard.press('Escape'); await w.waitForTimeout(200);
  ok('Esc đóng hộp tìm', !(await w.$('#tkBox')));
  await w.click('#tkBtn'); await w.waitForSelector('#tkInput'); await w.fill('#tkInput', 'tran to truong'); await w.waitForTimeout(300);
  const dmIdx = await w.$$eval('.tkItem', els => els.findIndex(e => /Danh mục lao động/.test(e.innerText)));
  await w.click('.tkItem >> nth=' + dmIdx); await w.waitForTimeout(500);
  ok('bấm kết quả danh mục: mở Cài đặt → Danh mục đối tượng đã lọc', /Danh mục đối tượng/.test(await w.innerText('#main')) && (await w.$$('#dtBang tbody tr[data-dt]')).length === 1, String((await w.$$('#dtBang tbody tr[data-dt]')).length));
  // trang tổng hợp theo đối tượng
  await w.keyboard.press('Control+k'); await w.waitForSelector('#tkInput'); await w.fill('#tkInput', '92c12345'); await w.waitForTimeout(300);
  await w.click('[data-tkth] >> nth=0'); await w.waitForSelector('#thPanel');
  const th = await w.innerText('#thPanel');
  ok('nút Tổng hợp ở kết quả xe: mở trang tổng hợp xe 92C-12345 với lô đã chạy, số chuyến, khối lượng', /Xe 92C-12345/.test(th) && /Các lô và đội xe đã chạy/.test(th) && /R-A/.test(th) && /12,5/.test(th), th.slice(0, 400));
  await w.keyboard.press('Escape'); await w.waitForTimeout(200); ok('Esc đóng trang tổng hợp', !(await w.$('#thBox')));
  ok('không có lỗi script trên màn hình', errs.length === 0, errs.join(' | '));
  await app.close(); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
