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
const P = (stt, so, bien, c1, c2, kg, kh, g1, g2, gia, tien) => ({donGia: gia === undefined ? 1250000 : gia, thanhTien: tien === undefined ? Math.floor(kg * 1250 / 1000) * 1000 : tien, _row: stt + 1, maRung: 'R-A', stt: String(stt), ngay: '0' + (4 + stt) + '/10/2026', gioCan1: g1, gioCan2: g2, bienSo: bien, soPhieu: so, can1: c1, can2: c2, klKg: kg, kl: kg / 1000, khachHang: kh, noiGiao: 'KCN Điện Nam', ghiChu: ''});
(async () => {
  const app = await electron.launch({executablePath: require('electron'), args: [root, '--no-sandbox'], env: {...process.env, HAKQN_DB: path.join(dir, 'p.sqlite'), HAKQN_USERDATA: path.join(dir, 'ud'), HAKQN_DOWNLOAD_DIR: out, ELECTRON_DISABLE_SECURITY_WARNINGS: '1'}});
  const w = await app.firstWindow(); const errs = []; w.on('pageerror', e => errs.push(e.message)); w.on('dialog', d => d.accept()); await w.waitForSelector('#side');
  const L = lot('fa', 'R-A', {exp: {}, pc: [P(1, 'PA1', '92C-12345', 40400, 15000, 25400, 'NGUYỄN VĂN AN', '08:15:00', '09:40:00'), P(2, 'PA2', '92C-67890', 39600, 15000, 24600, 'NGUYỄN VĂN AN', '10:05:00', '11:20:00'), P(3, 'PA3', '92C-12345', 35000, 15000, 20000, '', '13:00:00', '14:10:00')]});
  const D = seed([L]); D.congTy = {c1: {id: 'c1', ten: 'CÔNG TY TNHH MẪU PHÁT', mst: '', diaChi: '12 Đường Số 3, KCN Điện Nam, Quảng Nam', nguoiDaiDien: '', chucVu: '', sdt: '0235 3811 222', fax: '0235 3811 333', noiLap: 'Điện Bàn', email: '', diaChiGiao: [], ghiChu: ''}};
  await w.evaluate(d => window.hak.save(d), D); await w.reload(); await w.waitForSelector('#side');
  const tool = async fn => { const [pw] = await Promise.all([app.waitForEvent('window'), fn()]); await pw.waitForLoadState('domcontentloaded'); return pw; };

  // 1. từ rừng: nạp đúng 3 phiếu
  await w.click('[data-open=own1]'); await w.click('[data-tab=rung]'); await w.click('[data-forest=fa]'); await w.click('[data-ftab=xuat]');
  ok('mục In phiếu cân nằm ở tab Xuất hồ sơ (theo rừng), báo 3 phiếu, 1 phiếu thiếu khách hàng; không còn nút ở menu ngang hay tab Vận chuyển', !!(await w.$('#pcPrintCard [data-act=pcPrint]')) && /3 phiếu cân của rừng này/.test(await w.innerText('#pcPrintCard')) && /2 phiếu đủ thông tin; còn thiếu: khách hàng \(1 phiếu\)/.test(await w.innerText('#pcPrintCard')) && !(await w.$('.nb[data-act=pcPrint]')));
  if (process.env.SHOTS) await (await w.$('#pcPrintCard')).screenshot({path: path.join(process.env.SHOTS, 'phieucan_the_xuat_ho_so.png')});
  const pw = await tool(() => w.$eval('#pcPrintCard [data-act=pcPrint]', b => b.click()));
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
  ok('phiếu không khách hàng lấy tên chủ rừng; giá mua 1.250 đ/kg (đơn giá 1.250.000 đ/tấn) và thành tiền 31.750.000 lấy từ phiếu cân', /NGUYỄN VĂN MỘT/.test(txt) && /Giá mua\s*:\s*1\.250\s*đ\/kg/.test(txt) && /31\.750\.000\s*\(vnđ\)/.test(txt), txt.slice(0, 700));

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

  // 4. giao diện công cụ đã gọn: dữ liệu và công ty lấy từ phần mềm
  ok('công cụ đã gọn: không còn ô chọn file Excel, tải mẫu, cột khách hàng, thông tin công ty, cột Số CT/đơn giá; vẫn còn khổ giấy, dịch lề, loại hàng, danh sách phiếu', !(await pw.isVisible('#drop')) && !(await pw.isVisible('#getTpl')) && !(await pw.isVisible('#khWrap')) && !(await pw.isVisible('#coBox')) && !(await pw.isVisible('#soCol')) && !(await pw.isVisible('#priceCol')) && (await pw.isVisible('#goods')) && (await pw.isVisible('#tb')) && (await pw.isVisible('#pdf')) && (await pw.isVisible('#print')));
  await pw.close();

  // 5. cùng một khung nhìn cho mọi nguồn phiếu cân: file nhập ở rừng, Google Sheets, cập nhật biển số; báo phiếu thiếu thông tin
  const imp = P(1, 'IM1', '92C-11111', 30000, 10000, 20000, 'KH A', '08:00:00', '09:00:00');                                  // như nhập file ở rừng
  const goo = {...P(2, 'GS1', '92C-22222', 31000, 11000, 20000, 'KH B', '10:00:00', '11:00:00'), klTan: 20, maKhachHang: 'K01', noiGiao: '', _src: {tab: 'HoSoKeo_QC', row: 5}};   // như đưa từ Google Sheets
  const upd = {...P(3, 'UP1', '92C-33333', 32000, 12000, 20000, 'KH C', '12:00:00', '13:00:00'), _src: {tab: 'HoSoKeo_QC', row: 6}};   // sau khi cập nhật biển số xe
  const thieu = {...P(4, 'TH1', '92C-44444', null, null, null, '', '', '', null, null), kl: 15, klKg: null};                                 // thiếu giờ cân, cân 1/2, khách hàng
  const D2 = seed([lot('fa', 'R-A', {exp: {}, pc: [imp, goo, upd, thieu]})]); D2.congTy = D.congTy;
  await w.waitForTimeout(700); await w.evaluate(d => window.hak.save(d), D2); await w.reload(); await w.waitForSelector('#side');
  await w.click('[data-open=own1]'); await w.click('[data-tab=rung]'); await w.click('[data-forest=fa]'); await w.click('[data-ftab=xuat]');
  const card = await w.innerText('#pcPrintCard');
  ok('báo rõ phiếu còn thiếu: 3 phiếu đủ thông tin, 1 phiếu thiếu cân lần 1/2, giờ cân, khách hàng; chỉ cách bổ sung', /4 phiếu cân của rừng này/.test(card) && /3 phiếu đủ thông tin/.test(card) && /cân lần 1 \(1 phiếu\)/.test(card) && /giờ cân 1 \(1 phiếu\)/.test(card) && /khách hàng \(1 phiếu\)/.test(card) && /đơn giá \(1 phiếu\)/.test(card) && /Tra cứu Google Sheets/.test(card), card);
  const pw3 = await tool(() => w.$eval('#pcPrintCard [data-act=pcPrint]', b => b.click()));
  await pw3.waitForFunction(() => document.querySelectorAll('#tb tr.row').length === 4, null, {timeout: 15000});
  const t3 = await pw3.$eval('#render', r => r.innerText);
  ok('4 phiếu từ các nguồn khác nhau cùng in được, đủ trường: số phiếu, biển số, cân, khách hàng; phiếu thiếu thì để trống phần thiếu', ['IM1', 'GS1', 'UP1', 'TH1', '92C-11111', '92C-22222', '92C-33333', '92C-44444', 'KH A', 'KH B', 'KH C'].every(x => t3.includes(x)) && /30\.000/.test(t3) && /31\.000/.test(t3) && /32\.000/.test(t3) && /25\.000\.000\s*\(vnđ\)/.test(t3) && /Giá mua\s*:\s*0/.test(t3), t3.slice(0, 300));   // IM1 20.000 kg × 1.250 = 25.000.000; TH1 không giá thì in 0
  await pw3.close();
  await w.$eval('[data-act=guide]', b => b.click()); const gd = await w.innerText('#guideBox');
  ok('Hướng dẫn sử dụng trong phần mềm đã nói về giao khoán trả theo ngày công, chấm công thực tế, quy trình theo đợt, in đợt 2 (giấy trắng hoặc nền + in đè), mẫu Excel phiếu cân đầy đủ trường, đổi biển số khi đưa qua và in phiếu cân', /tấn, ha hoặc ngày công/.test(gd) && /Chấm công thực tế/.test(gd) && /Quy trình hồ sơ theo đợt/.test(gd) && /giấy trắng/.test(gd) && /Một file mẫu Excel đầy đủ trường/.test(gd) && /sửa biển số ngay trong bảng xem trước/.test(gd) && /nguyên bản công cụ PhieuCan/.test(gd) && /8a\. Đổi biển số xe của phiếu cân/.test(gd) && /Chỉ cập nhật biển số xe \(n phiếu\)/.test(gd) && /8b\. In phiếu cân/.test(gd) && /Tải PDF PhieuCan/.test(gd) && !/Bước 1 – Mẫu trống/.test(gd), gd.slice(0, 200));
  ok('không có lỗi JavaScript', errs.length === 0, errs.join('|'));
  await app.close(); console.log(fail ? 'CÓ ' + fail + ' LỖI' : 'TẤT CẢ ĐẠT'); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
