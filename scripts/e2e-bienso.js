'use strict';
/* Cập nhật biển số xe của phiếu cân từ bảng tính tra cứu, và Báo cáo “Phiếu cân đã cập nhật biển số xe” theo lô (Electron thật, bảng tính giả lập).
 * Chạy: xvfb-run -a node scripts/e2e-bienso.js */
const {_electron: electron} = require('playwright-core');
const path = require('path'), fs = require('fs'), os = require('os');
const {build} = require('../tests/fixtures/make-lookup');
const root = path.join(__dirname, '..');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hakqn-bs-'));
let fail = 0; const ok = (name, cond, extra) => { console.log((cond ? 'ĐẠT  ' : 'LỖI  ') + name + (!cond && extra ? ' — ' + extra : '')); if (!cond) fail++; };
const wf = (name, v) => { const f = path.join(dir, name); fs.writeFileSync(f, build(v)); return f; };
(async () => {
  const app = await electron.launch({executablePath: require('electron'), args: [root, '--no-sandbox'], env: {...process.env, HAKQN_DB: path.join(dir, 'b.sqlite'), HAKQN_USERDATA: path.join(dir, 'ud'), HAKQN_SHEET_URL: 'http://127.0.0.1:9/none.xlsx', ELECTRON_DISABLE_SECURITY_WARNINGS: '1'}});
  const w = await app.firstWindow(); const errs = []; w.on('pageerror', e => errs.push(e.message)); w.on('dialog', d => d.accept()); await w.waitForSelector('#side');
  const db = () => w.evaluate(() => window.hak.loadSync().db);
  const find = async (q, tab = 'HoSoKeo_QC') => { await w.click('header [data-act=lkOpen]'); await w.waitForSelector('#lkQ'); await w.click('[data-lktab="' + tab + '"]'); await w.fill('#lkQ', q); await w.click('[data-act=lkFind]'); await w.waitForTimeout(250); };
  // 1. nạp lần đầu: phiếu 1001 (92C-12345) và 1002 (ghép tên xe với 92C-99999)
  ok('nhập bảng tính', (await w.evaluate(p => window.hak.lookup.importExcel(p), wf('goc.xlsx'))).ok);
  await find('1001/2026'); await w.click('[data-lkpick]'); await w.waitForSelector('[data-act=lkModeNew]');
  await w.selectOption('#lkOwner', 'new'); await w.click('[data-act=lkModeNew]'); await w.waitForSelector('[data-act=lkApply]');
  await w.fill('[data-lkalias]', '92C-99999'); await w.dispatchEvent('[data-lkalias]', 'change'); await w.waitForTimeout(150); await w.click('[data-act=lkPcAll]');
  ok('lần nạp đầu không có phiếu nào đổi biển (chưa hiện khung cập nhật biển số)', !(await w.$('#lkBienDoi')));
  await w.click('[data-act=lkApply]'); await w.waitForSelector('#lkBox.on', {state: 'hidden'}); await w.waitForTimeout(500);
  let d = await db(); const forest = () => Object.values(Object.values(d.rs)[0].forests)[0];
  const pc1 = () => forest().pc.find(p => p.soPhieu === '1001/2026/NK');
  ok('phiếu 1001 đã vào hồ sơ với biển 92C-12345, chưa có nhật ký đổi biển', !!pc1() && pc1().bienSo === '92C-12345' && !(forest().bienLog || []).length);
  const kl0 = pc1().kl, ngay0 = pc1().ngay;
  // 2. bảng tính cập nhật biển số xe mới
  ok('nhập bảng tính có biển số mới (92C-12345 → 92C-54321)', (await w.evaluate(p => window.hak.lookup.importExcel(p), wf('moi.xlsx', 'newplate'))).ok);
  await w.click('[data-ftab=finfo]'); await w.click('#forestForm [data-act=lkOpen]'); await w.waitForSelector('#lkBox.on');
  await w.click('[data-lktab="HoSoKeo_QC"]'); await w.fill('#lkQ', '1001/2026'); await w.click('[data-act=lkFind]'); await w.waitForTimeout(250);
  await w.click('[data-lkpick]'); await w.click('[data-act=lkModeFill]'); await w.waitForSelector('[data-act=lkApply]');
  const box = await w.innerText('#lkBienDoi').catch(() => '');
  ok('khung “Biển số xe khác với hồ sơ” nêu phiếu 1001: 92C-12345 → 92C-54321', /Biển số xe khác với hồ sơ/.test(box) && /1001\/2026\/NK/.test(box) && /92C-12345/.test(box) && /92C-54321/.test(box), box.slice(0, 300));
  ok('dòng phiếu ghi rõ “Biển số khác … (chỉ khác biển số)”', /Biển số khác: 92C-12345 → 92C-54321 \(chỉ khác biển số\)/.test(await w.innerText('#lkBody')));
  await w.click('[data-act=lkPlateOnly]'); await w.waitForTimeout(900); d = await db();
  ok('chỉ cập nhật biển số: biển mới 92C-54321, ngày và khối lượng giữ nguyên', pc1().bienSo === '92C-54321' && pc1().kl === kl0 && pc1().ngay === ngay0, JSON.stringify(pc1()));
  const lg = forest().bienLog || [];
  ok('ghi nhật ký đổi biển số: số phiếu, biển cũ, biển mới, thời điểm, nguồn', lg.length === 1 && lg[0].soPhieu === '1001/2026/NK' && lg[0].cu === '92C-12345' && lg[0].moi === '92C-54321' && !!lg[0].at && lg[0].nguon === 'Google Sheets', JSON.stringify(lg));
  ok('sau khi cập nhật: phiếu hiện “bỏ qua” (khớp bảng tính), khung đổi biển biến mất', !(await w.$('#lkBienDoi')) && /Đã cập nhật biển số xe của 1 phiếu cân/.test(await w.innerText('#lkBody')));
  await w.click('[data-act=lkClose]');
  // 3. báo cáo theo lô
  await w.evaluate(() => document.querySelector('[data-act=rpOpen]').click()); await w.waitForSelector('#rpBox.on, .rpl');
  ok('Báo cáo có mẫu “Phiếu cân đã cập nhật biển số xe”', !!(await w.$('[data-rpsel=bienso]')));
  await w.click('[data-rpsel=bienso]'); await w.waitForTimeout(400);
  const rtext = await w.innerText('#rpBox');
  ok('báo cáo hiện phiếu 1001 với biển cũ 92C-12345, biển mới 92C-54321, nguồn Google Sheets, theo mã rừng', /1001\/2026\/NK/.test(rtext) && /92C-12345/.test(rtext) && /92C-54321/.test(rtext) && /Google Sheets/.test(rtext) && new RegExp(forest().info.maRung).test(rtext), rtext.slice(0, 500));
  ok('không có lỗi JavaScript', errs.length === 0, errs.join('|'));
  await app.close(); console.log(fail ? 'CÓ ' + fail + ' LỖI' : 'TẤT CẢ ĐẠT'); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
