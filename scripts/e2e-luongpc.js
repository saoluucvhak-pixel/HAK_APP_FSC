'use strict';
/* Cả luồng phiếu cân (Electron thật, bảng tính Google Sheets giả lập): đổi biển số xe NGAY trong bảng xem trước rồi đưa qua rừng → in phiếu cân đúng biển mới,
 * đủ giờ cân, cân 1/2, khối lượng, khách hàng, địa chỉ, đơn giá, thành tiền; sau đó đổi xe lần nữa bằng “cập nhật biển số xe” → in phiếu cân lại ra biển mới nhất.
 * Chạy: xvfb-run -a node scripts/e2e-luongpc.js */
const {_electron: electron} = require('playwright-core');
const path = require('path'), fs = require('fs'), os = require('os');
const {build} = require('../tests/fixtures/make-lookup');
const root = path.join(__dirname, '..');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hakqn-lpc-'));
let fail = 0; const ok = (name, cond, extra) => { console.log((cond ? 'ĐẠT  ' : 'LỖI  ') + name + (!cond && extra ? ' — ' + extra : '')); if (!cond) fail++; };
const wf = (name, v) => { const f = path.join(dir, name); fs.writeFileSync(f, build(v)); return f; };
(async () => {
  const app = await electron.launch({executablePath: require('electron'), args: [root, '--no-sandbox'], env: {...process.env, HAKQN_DB: path.join(dir, 'l.sqlite'), HAKQN_USERDATA: path.join(dir, 'ud'), HAKQN_SHEET_URL: 'http://127.0.0.1:9/none.xlsx', ELECTRON_DISABLE_SECURITY_WARNINGS: '1'}});
  const w = await app.firstWindow(); const errs = []; w.on('pageerror', e => errs.push(e.message)); w.on('dialog', d => d.accept()); await w.waitForSelector('#side');
  const db = () => w.evaluate(() => window.hak.loadSync().db);
  const forest = async () => Object.values(Object.values((await db()).rs)[0].forests)[0];
  const pcOf = async so => (await forest()).pc.find(p => p.soPhieu === so);
  const find = async q => { await w.click('header [data-act=lkOpen]'); await w.waitForSelector('#lkQ'); await w.click('[data-lktab="HoSoKeo_QC"]'); await w.fill('#lkQ', q); await w.click('[data-act=lkFind]'); await w.waitForTimeout(250); };
  const printText = async expectRows => {
    await w.click('[data-ftab=xuat]'); await w.waitForSelector('#pcPrintCard');
    const [pw] = await Promise.all([app.waitForEvent('window'), w.$eval('#pcPrintCard [data-act=pcPrint]', b => b.click())]);
    await pw.waitForFunction(n => document.querySelectorAll('#tb tr.row').length === n, expectRows, {timeout: 15000});
    const t = await pw.$eval('#render', r => r.innerText), c = await pw.innerText('#count'); await pw.close(); return {t, c};
  };

  // ===== A. đổi xe rồi mới đưa qua =====
  ok('nhập bảng tính Google Sheets giả lập', (await w.evaluate(p => window.hak.lookup.importExcel(p), wf('goc.xlsx'))).ok);
  await find('1001/2026'); await w.click('[data-lkpick]'); await w.waitForSelector('[data-act=lkModeNew]');
  await w.selectOption('#lkOwner', 'new'); await w.click('[data-act=lkModeNew]'); await w.waitForSelector('[data-act=lkApply]');
  await w.fill('[data-lkalias]', '92C-99999'); await w.dispatchEvent('[data-lkalias]', 'change'); await w.waitForTimeout(150);
  const ov = '[data-lkov="1001/2026/NK"]';
  ok('phiếu 1001 trong bảng xem trước đang là 92C-12345', (await w.inputValue(ov)) === '92C-12345');
  await w.fill(ov, '92c-77777'); await w.dispatchEvent(ov, 'change'); await w.waitForTimeout(200);   // xe đã đổi: sửa ngay trước khi đưa qua
  await w.click('[data-act=lkPcAll]');
  ok('đã đổi biển 1001 → 92C-77777 (viết hoa), phiếu 1002 ghép tên xe → 92C-99999, cả hai được chọn đưa qua', (await w.inputValue(ov)) === '92C-77777' && /đã đổi từ 92C-12345/.test(await w.innerText('#lkBody')) && (await w.$$eval('[data-lkpc]:checked', e => e.length)) >= 2);
  await w.click('[data-act=lkApply]'); await w.waitForSelector('#lkBox.on', {state: 'hidden'}); await w.waitForTimeout(600);
  let p1 = await pcOf('1001/2026/NK'), p2 = await pcOf('1002/2026/NK');
  ok('đưa qua rừng: phiếu 1001 mang biển ĐÃ ĐỔI 92C-77777 (không phải 92C-12345); phiếu 1002 là 92C-99999', !!p1 && p1.bienSo === '92C-77777' && !!p2 && p2.bienSo === '92C-99999', JSON.stringify([p1 && p1.bienSo, p2 && p2.bienSo]));
  ok('phiếu 1001 mang đủ trường để in: giờ cân 1/2, cân 1/2, KL kg và tấn, khách hàng, địa chỉ rừng, nguồn gốc, đơn giá 1.500.000, thành tiền 4.260.000',
    p1.gioCan1 === '08:15:00' && p1.gioCan2 === '09:40:00' && p1.can1 === 6840 && p1.can2 === 4000 && p1.klKg === 2840 && p1.kl === 2.84 && p1.khachHang === 'NGUYỄN VĂN AN' && /Phú Cường/.test(p1.diaChi) && !!p1.nguonGoc && p1.donGia === 1500000 && p1.thanhTien === 4260000, JSON.stringify(p1));
  let pr = await printText(2);
  ok('in phiếu cân: công cụ nhận 2 phiếu; phiếu in ra biển 92C-77777 và 92C-99999, cân 6.840 / 4.000, khối lượng 2.840, giá mua 1.500 đ/kg, thành tiền 4.260.000, địa chỉ rừng, khách hàng, giờ cân',
    /Đã chọn 2\/2 phiếu/.test(pr.c) && pr.t.includes('92C-77777') && pr.t.includes('92C-99999') && !pr.t.includes('92C-12345') && /6\.840/.test(pr.t) && /4\.000/.test(pr.t) && /2\.840/.test(pr.t) && /Giá mua\s*:\s*1\.500\s*đ\/kg/.test(pr.t) && /4\.260\.000\s*\(vnđ\)/.test(pr.t) && /Phú Cường/.test(pr.t) && /NGUYỄN VĂN AN/.test(pr.t) && /08:15:00/.test(pr.t), pr.t.slice(0, 600));

  // ===== B. bảng tính cập nhật xe mới → cập nhật biển số xe =====
  ok('nhập bảng tính có biển số mới (1001: 92C-12345 → 92C-54321)', (await w.evaluate(p => window.hak.lookup.importExcel(p), wf('moi.xlsx', 'newplate'))).ok);
  await w.click('[data-ftab=finfo]'); await w.click('#forestForm [data-act=lkOpen]'); await w.waitForSelector('#lkBox.on');
  await w.click('[data-lktab="HoSoKeo_QC"]'); await w.fill('#lkQ', '1001/2026'); await w.click('[data-act=lkFind]'); await w.waitForTimeout(250);
  await w.click('[data-lkpick]'); await w.click('[data-act=lkModeFill]'); await w.waitForSelector('[data-act=lkApply]');
  ok('khung “Biển số xe khác với hồ sơ” nêu 92C-77777 → 92C-54321', /Biển số xe khác với hồ sơ/.test(await w.innerText('#lkBienDoi').catch(() => '')) && /92C-77777/.test(await w.innerText('#lkBienDoi').catch(() => '')) && /92C-54321/.test(await w.innerText('#lkBienDoi').catch(() => '')));
  await w.click('[data-act=lkPlateOnly]'); await w.waitForTimeout(900);
  p1 = await pcOf('1001/2026/NK');
  ok('cập nhật biển số: 1001 thành 92C-54321, các trường in (cân, khối lượng, khách hàng, giá) giữ nguyên', p1.bienSo === '92C-54321' && p1.can1 === 6840 && p1.klKg === 2840 && p1.khachHang === 'NGUYỄN VĂN AN' && p1.donGia === 1500000 && p1.thanhTien === 4260000, JSON.stringify(p1));
  await w.click('[data-act=lkClose]'); await w.waitForTimeout(300);
  pr = await printText(2);
  ok('in phiếu cân lại: ra biển mới nhất 92C-54321, không còn 92C-77777; giá và thành tiền vẫn đúng', pr.t.includes('92C-54321') && !pr.t.includes('92C-77777') && pr.t.includes('92C-99999') && /4\.260\.000\s*\(vnđ\)/.test(pr.t), pr.t.slice(0, 400));
  ok('không có lỗi JavaScript', errs.length === 0, errs.join('|'));
  await app.close(); console.log(fail ? 'CÓ ' + fail + ' LỖI' : 'TẤT CẢ ĐẠT'); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
