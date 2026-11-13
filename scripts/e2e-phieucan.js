'use strict';
/* In phiếu cân bằng nguyên bản công cụ PhieuCan (Electron thật): mở từ rừng và từ menu, nạp đúng phiếu cân, khổ giấy lỗ 240 × 279 mm,
 * bản PDF in ra và bản PDF tải về đúng khổ giấy và đúng số trang. Chạy: xvfb-run -a node scripts/e2e-phieucan.js */
const {_electron: electron} = require('playwright-core');
const path = require('path'), fs = require('fs'), os = require('os');
const src = fs.readFileSync(path.join(__dirname, 'e2e-inan2.js'), 'utf8');
const {lot, seed} = new Function(src.slice(src.indexOf('const nv ='), src.indexOf('const plain =')) + '; return {lot, seed};')();
const root = path.join(__dirname, '..');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hakqn-pcin-')), out = path.join(dir, 'out');
let fail = 0; const ok = (name, cond, extra) => { console.log((cond ? 'ĐẠT  ' : 'LỖI  ') + name + (!cond && extra ? ' — ' + extra : '')); if (!cond) fail++; };
const mm = pt => Math.round(pt / 72 * 25.4 * 10) / 10;
const box = buf => [...buf.toString('latin1').matchAll(/\/MediaBox\s*\[\s*0\s+0\s+([\d.]+)\s+([\d.]+)\s*\]/g)].map(x => [mm(+x[1]), mm(+x[2])]);
const clearOut = () => { fs.mkdirSync(out, {recursive: true}); for (const f of fs.readdirSync(out)) fs.unlinkSync(path.join(out, f)); };
const P = (stt, so, bien, c1, c2, kg, kh, g1, g2) => ({_row: stt + 1, maRung: 'R-A', stt: String(stt), ngay: '0' + (4 + stt) + '/10/2026', gioCan1: g1, gioCan2: g2, bienSo: bien, soPhieu: so, can1: c1, can2: c2, klKg: kg, kl: kg / 1000, khachHang: kh, noiGiao: 'KCN Điện Nam', ghiChu: ''});
(async () => {
  const app = await electron.launch({executablePath: require('electron'), args: [root, '--no-sandbox'], env: {...process.env, HAKQN_DB: path.join(dir, 'p.sqlite'), HAKQN_USERDATA: path.join(dir, 'ud'), HAKQN_DOWNLOAD_DIR: out, ELECTRON_DISABLE_SECURITY_WARNINGS: '1'}});
  const w = await app.firstWindow(); const errs = []; w.on('pageerror', e => errs.push(e.message)); w.on('dialog', d => d.accept()); await w.waitForSelector('#side');
  const L = lot('fa', 'R-A', {exp: {}, pc: [P(1, 'PA1', '92C-12345', 40400, 15000, 25400, 'NGUYỄN VĂN AN', '08:15:00', '09:40:00'), P(2, 'PA2', '92C-67890', 39600, 15000, 24600, 'NGUYỄN VĂN AN', '10:05:00', '11:20:00'), P(3, 'PA3', '92C-12345', 35000, 15000, 20000, '', '13:00:00', '14:10:00')]});
  const D = seed([L]); D.congTy = {c1: {id: 'c1', ten: 'CÔNG TY TNHH MẪU PHÁT', mst: '', diaChi: '12 Đường Số 3, KCN Điện Nam, Quảng Nam', nguoiDaiDien: '', chucVu: '', sdt: '0235 3811 222', fax: '0235 3811 333', noiLap: 'Điện Bàn', email: '', diaChiGiao: [], ghiChu: ''}};
  await w.evaluate(d => window.hak.save(d), D); await w.reload(); await w.waitForSelector('#side');
  const tool = async fn => { const [pw] = await Promise.all([app.waitForEvent('window'), fn()]); await pw.waitForLoadState('domcontentloaded'); return pw; };

  // 1. từ rừng: nạp đúng 3 phiếu
  await w.click('[data-open=own1]'); await w.click('[data-tab=rung]'); await w.click('[data-forest=fa]'); await w.click('[data-ftab=dx]');
  ok('tab Vận chuyển có nút In phiếu cân', !!(await w.$('#main [data-act=pcPrint]')));
  const pw = await tool(() => w.click('#main [data-act=pcPrint]'));
  await pw.waitForFunction(() => document.querySelectorAll('#tb tr.row').length === 3, null, {timeout: 15000});
  const cnt = await pw.innerText('#count');
  ok('công cụ mở bằng đúng file gốc, tải sẵn 3 phiếu của rừng, mặc định 2 phiếu / trang → 2 trang', (await pw.title()) === 'PhieuCan' && /Đã chọn 3\/3 phiếu · 2 trang/.test(cnt) && (await pw.$$eval('#tb tr.row td:nth-child(2)', t => t.map(x => x.textContent))).join() === 'PA1,PA2,PA3', cnt);
  ok('tiêu đề phiếu lấy từ thông tin công ty đã khai (tên, địa chỉ, điện thoại, fax, nơi lập), không dùng giá trị mặc định của công cụ', (await pw.inputValue('#coName')) === 'CÔNG TY TNHH MẪU PHÁT' && (await pw.inputValue('#coAddr')) === '12 Đường Số 3, KCN Điện Nam, Quảng Nam' && (await pw.inputValue('#coPhone')) === '0235 3811 222' && (await pw.inputValue('#coFax')) === '0235 3811 333' && (await pw.inputValue('#place')) === 'Điện Bàn');
  const t0 = await pw.$eval('#render', r => r.innerText);
  ok('phiếu in đúng thông tin công ty: tên, địa chỉ, điện thoại, FAX, “Điện Bàn, ngày …”; không còn tên công ty mặc định', /CÔNG TY TNHH MẪU PHÁT/.test(t0) && /12 Đường Số 3/.test(t0) && /0235 3811 222/.test(t0) && /FAX\s*:\s*0235 3811 333/.test(t0) && /Điện Bàn,\s*ngày\s*05\s*tháng\s*10\s*năm\s*2026/.test(t0) && !/HOÀNG ANH KHÔI/.test(t0), t0.slice(0, 400));
  ok('khổ giấy mặc định giấy lỗ 240 × 279 mm (@page) và tờ in rộng 240 mm', (await pw.$eval('#pageStyle', s => s.textContent)) === '@page{size:240mm 279mm;margin:0}' && (await pw.inputValue('#paper')) === '240x279' && await pw.$eval('#render .sheet', s => Math.abs(s.getBoundingClientRect().width - 240 * 96 / 25.4) < 1.5));
  if (process.env.SHOTS) { await pw.setViewportSize({width: 1280, height: 860}); await pw.waitForTimeout(400); await pw.screenshot({path: path.join(process.env.SHOTS, 'phieucan_cong_cu.png')}); }   // ảnh để xem khi cần
  const txt = await pw.$eval('#render', r => r.innerText);
  ok('nội dung phiếu: tên công ty, “PHIẾU CÂN”, số phiếu, biển số, cân lần 1/2 (kg), khối lượng, giờ cân, địa chỉ rừng, khách hàng', /CÔNG TY TNHH MẪU PHÁT/.test(txt) && /PHIẾU CÂN/.test(txt) && /PA1/.test(txt) && /92C-12345/.test(txt) && /40\.400/.test(txt) && /15\.000/.test(txt) && /25\.400/.test(txt) && /05\/10\/2026 08:15:00/.test(txt) && /Thôn A/.test(txt) && /NGUYỄN VĂN AN/.test(txt), txt.slice(0, 500));
  ok('phiếu không khách hàng lấy tên chủ rừng; không giá mua thì in 0', /NGUYỄN VĂN MỘT/.test(txt) && /Giá mua\s*:\s*0/.test(txt), txt.slice(0, 600));

  // 2. PDF in ra đúng khổ giấy
  const pdfOf = async () => Buffer.from(await app.evaluate(async ({BrowserWindow}) => { const t = BrowserWindow.getAllWindows().find(x => x.getTitle() === 'PhieuCan'); return (await t.webContents.printToPDF({preferCSSPageSize: true, printBackground: true})).toString('base64'); }), 'base64');
  let b = box(await pdfOf());
  ok('bản in (PDF qua máy in của Chromium): 2 trang, mỗi trang đúng 240 × 279 mm', b.length === 2 && b.every(x => Math.abs(x[0] - 240) <= 0.3 && Math.abs(x[1] - 279) <= 0.3), JSON.stringify(b));
  await pw.$eval('#paper', (e, v) => { e.value = v; e.dispatchEvent(new Event('input', {bubbles: true})); }, '210x297'); await pw.waitForTimeout(300); b = box(await pdfOf());
  ok('chọn A4 thì bản in là 210 × 297 mm (chọn khổ giấy hoạt động như bản gốc)', b.length === 2 && b.every(x => Math.abs(x[0] - 210) <= 0.3 && Math.abs(x[1] - 297) <= 0.3), JSON.stringify(b));
  await pw.$eval('#paper', (e, v) => { e.value = v; e.dispatchEvent(new Event('input', {bubbles: true})); }, '240x279'); await pw.waitForTimeout(300);

  // 3. nút “Tải PDF PhieuCan” của công cụ
  clearOut();
  await pw.$eval('#pdf', b => b.click()); let f = null; for (let i = 0; i < 200 && !f; i++) { f = fs.readdirSync(out).find(x => x === 'PhieuCan.pdf'); if (!f) await pw.waitForTimeout(150); } await pw.waitForTimeout(400);
  b = f ? box(fs.readFileSync(path.join(out, f))) : [];
  ok('“Tải PDF PhieuCan”: file PhieuCan.pdf có 2 trang, mỗi trang 240 × 279 mm', b.length === 2 && b.every(x => Math.abs(x[0] - 240) <= 0.3 && Math.abs(x[1] - 279) <= 0.3), JSON.stringify(b));
  await pw.close();

  // 4. từ menu ngang: công cụ trống để nạp file Excel
  const pw2 = await tool(() => w.$eval('[data-act=pcPrint][data-blank]', b => b.click()));
  await pw2.waitForSelector('#drop');
  ok('menu ngang “In phiếu cân”: mở công cụ trống (chưa có dữ liệu), vẫn có ô chọn file Excel', /Chưa có dữ liệu/.test(await pw2.innerText('#fileinfo')) && !!(await pw2.$('#file')) && (await pw2.$$('#tb tr.row')).length === 0);
  await pw2.close();
  ok('không có lỗi JavaScript', errs.length === 0, errs.join('|'));
  await app.close(); console.log(fail ? 'CÓ ' + fail + ' LỖI' : 'TẤT CẢ ĐẠT'); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
