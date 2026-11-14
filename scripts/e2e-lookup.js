'use strict';
/* Kiểm thử đầu-cuối phần Tra cứu Google Sheets bằng Electron thật, dữ liệu giả lập (xvfb-run node scripts/e2e-lookup.js) */
const {_electron: electron} = require('playwright-core');
const {saveStage: stSave} = require('./lib-stage');
const path = require('path'), fs = require('fs'), os = require('os'), http = require('http');
const {build} = require('../tests/fixtures/make-lookup');
const root = path.join(__dirname, '..');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hakqn-lk-')), dbFile = path.join(dir, 'lk.sqlite');
const good = path.join(dir, 'gia_lap.xlsx'), bad = path.join(dir, 'thieu_cot.xlsx');
fs.writeFileSync(good, build()); fs.writeFileSync(bad, build('missingCol'));
let fail = 0; const ok = (n, c) => { console.log((c ? 'ĐẠT  ' : 'LỖI  ') + n); if (!c) fail++; };
let serverOn = true;
const srv = http.createServer((q, r) => { if (!serverOn) { r.writeHead(503); return r.end('down'); } r.writeHead(200, {'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}); r.end(build()); });

(async () => {
  await new Promise(r => srv.listen(0, '127.0.0.1', r));
  const url = 'http://127.0.0.1:' + srv.address().port + '/export.xlsx';
  const launch = () => electron.launch({executablePath: require('electron'), args: [root, '--no-sandbox'], env: {...process.env, HAKQN_CLOSE: 'discard', HAKQN_DB: dbFile, HAKQN_SHEET_URL: url}});
  const pick = (app, p) => app.evaluate(({dialog}, p) => { dialog.showOpenDialog = async () => ({canceled: false, filePaths: [p]}); }, p);
  let app = await launch(), w = await app.firstWindow(); const errs = []; w.on('pageerror', e => errs.push(e.message));
  w.on('dialog', d => d.accept());
  await w.waitForSelector('#side');
  ok('menu Tra cứu Google Sheets hiện trên thanh điều hướng', await w.isVisible('header [data-act=lkOpen]'));
  await w.click('header [data-act=lkOpen]'); await w.waitForSelector('#lkBox.on');
  ok('chưa có bản tra cứu thì báo rõ', (await w.innerText('#lkBody')).includes('chưa có'));
  // Nhập bản Excel
  await pick(app, good); await w.click('[data-act=lkExcel]'); await w.waitForFunction(() => /Đã cập nhật bản tra cứu/.test(document.getElementById('lkBody').innerText));
  ok('nhập Excel: hiện nguồn file + số dòng từng tab', /File Excel “gia_lap.xlsx”/.test(await w.innerText('#lkBody')) && /HoSoKeo: 8/.test(await w.innerText('#lkBody')));
  // Excel sai cột: giữ bản cũ
  await pick(app, bad); await w.click('[data-act=lkExcel]'); await w.waitForFunction(() => /Chưa cập nhật bản tra cứu/.test(document.getElementById('lkBody').innerText));
  ok('Excel thiếu cột: báo tab + cột, vẫn dùng bản cũ', /ToaDoRung.*DienTich_m2/.test(await w.innerText('#lkBody')) && /gia_lap.xlsx/.test(await w.innerText('#lkBody')));
  // Tìm không dấu, lọc tab
  await w.click('[data-lktab=HoSoRung_QC]'); await w.fill('#lkQ', 'nguyen van an'); await w.click('[data-act=lkFind]'); await w.waitForTimeout(200);
  ok('tìm không dấu theo tên trong tab HoSoRung_QC: 3 dòng', (await w.$$('[data-lkpick]')).length === 3);
  await w.click('[data-lktab=""]'); await w.fill('#lkQ', '1001/2026'); await w.click('[data-act=lkFind]'); await w.waitForTimeout(200);
  ok('tìm số phiếu cân trong Tất cả', (await w.$$('[data-lkpick]')).length === 1);
  // Chọn kết quả -> tạo chủ rừng + rừng mới
  await w.click('[data-lkpick]'); await w.waitForSelector('[data-act=lkModeNew]');
  ok('kết quả có cảnh báo trùng số hợp đồng khác CCCD', /cũng được dùng cho 1 CCCD khác/.test(await w.innerText('#lkBody')));
  ok('liệt kê hợp đồng khác của cùng chủ', (await w.$$('[data-lkhd]')).length === 1);
  await w.selectOption('#lkOwner', 'new'); await w.click('[data-act=lkModeNew]'); await w.waitForSelector('[data-act=lkApply]');
  const pv = await w.innerText('#lkBody');
  ok('xem trước: có tab · dòng · cột nguồn', /HoSoRung · dòng 2 · cột “Họ và tên chủ rừng”/.test(pv));
  ok('xem trước: điểm GPS độ-phút-giây được quy đổi và gắn nhãn', /đã quy đổi từ/.test(pv));
  ok('xem trước: cần ghép tên xe với biển số', /XE CN NAM/.test(pv) && /cần ghép biển/.test(pv));
  ok('xem trước: phiếu lệch tấn/kg cần kiểm tra', /cần kiểm tra — Phiếu cân 1003\/2026\/NK: khối lượng lệch, cột Tấn = 4.9 và cột KG = 5000/.test(pv));
  await w.fill('[data-lkalias]', '92C-99999'); await w.dispatchEvent('[data-lkalias]', 'change'); await w.waitForTimeout(100);
  await w.click('[data-act=lkPcAll]');
  await w.check('[data-lkkl]');
  await w.click('[data-act=lkApply]'); await w.waitForSelector('#lkBox.on', {state: 'hidden'}); await stSave(w); await w.click('[data-ftab=finfo]').catch(() => {});
  ok('đã tạo chủ rừng mới từ kết quả', (await w.innerText('#side')).includes('NGUYỄN VĂN AN'));
  ok('thanh ngữ cảnh: mã rừng 20260110_001', /20260110_001/.test(await w.innerText('#ctxForest')));
  const finfo = await w.$eval('#forestForm', f => Object.fromEntries(new FormData(f)));
  ok('diện tích 2,5 ha; tọa độ chỉ điền khi người dùng chọn', +finfo.dienTich === 2.5 && finfo.lat === '');
  ok('khối lượng thực tế = tổng 2 phiếu đã chọn (2,84 + 4,44 = 7,28)', +finfo.khoiLuong === 7.28);
  await w.click('[data-ftab=dx]'); const vc = await w.innerText('#main');
  ok('2 phiếu cân ghi vào rừng, biển ghép từ tên xe', /1001\/2026\/NK/.test(vc) && /1002\/2026\/NK/.test(vc) && /92C-99999/.test(vc) && !/1003\/2026\/NK/.test(vc));
  // Nhập lại cùng nguồn vào rừng đang mở: không tạo bản trùng
  await w.click('[data-ftab=finfo]'); await w.click('#forestForm [data-act=lkOpen]'); await w.waitForSelector('#lkBox.on');
  await w.click('[data-lktab=""]'); await w.fill('#lkQ', '1001/2026'); await w.click('[data-act=lkFind]'); await w.waitForTimeout(150);
  await w.click('[data-lkpick]'); await w.click('[data-act=lkModeFill]'); await w.waitForSelector('[data-act=lkApply]');
  const pv2 = await w.innerText('#lkBody');
  ok('nhập lại: phiếu đã có hiện "bỏ qua", trường giống nhau hiện "giống nhau"', /bỏ qua — Đã có trong hồ sơ/.test(pv2) && /giống nhau/.test(pv2));
  await w.click('[data-act=lkPcAll]'); await w.click('[data-act=lkApply]'); await w.waitForSelector('#lkBox.on', {state: 'hidden'}); await stSave(w); await w.click('[data-ftab=finfo]').catch(() => {});
  await w.click('[data-ftab=dx]');
  ok('nhập lại không tạo phiếu trùng', ((await w.innerText('#main')).match(/1001\/2026\/NK/g) || []).length === 1);
  // Ô đã có dữ liệu khác: bắt buộc chọn
  await w.click('[data-ftab=finfo]'); await w.fill('#forestForm [name=diaDiem]', 'Địa điểm do người dùng nhập'); await w.click('#forestForm button[type=submit]');
  await w.click('#forestForm [data-act=lkOpen]'); await w.fill('#lkQ', '1001/2026'); await w.click('[data-act=lkFind]'); await w.waitForTimeout(150);
  await w.click('[data-lkpick]'); await w.click('[data-act=lkModeFill]'); await w.click('[data-act=lkApply]'); await w.waitForTimeout(150);
  ok('ô đã có giá trị khác: chưa chọn thì không cho lưu', /Chưa lưu: Rừng: chọn giữ hay thay “Địa điểm khai thác/.test(await w.innerText('#lkBody')));
  await w.check('[data-lkrad="forest|diaDiem|keep"]'); await w.click('[data-act=lkApply]'); await w.waitForSelector('#lkBox.on', {state: 'hidden'}); await stSave(w); await w.click('[data-ftab=finfo]').catch(() => {});
  ok('chọn giữ hiện có: giá trị người dùng nhập được giữ', (await w.$eval('#forestForm [name=diaDiem]', i => i.value)) === 'Địa điểm do người dùng nhập');
  // Hợp đồng nhiều rừng: tạo rừng mới cho chủ đã có, mã rừng trùng bị chặn
  await w.click('header [data-act=lkOpen]'); await w.fill('#lkQ', 'tran thi binh'); await w.click('[data-act=lkFind]'); await w.waitForTimeout(150);
  await w.click('[data-lkpick] >> nth=0'); await w.waitForSelector('input[name=lkF]');
  ok('hợp đồng có 2 rừng: hiện 2 phương án để chọn', (await w.$$('input[name=lkF]')).length === 2);
  await w.click('[data-act=lkModeNew]'); await w.waitForSelector('[data-act=lkApply]');
  ok('hợp đồng nhiều rừng: phiếu cân không chọn sẵn', !(await w.isChecked('[data-lkpc="2001/2026/NK"]')));
  ok('chủ rừng khác CCCD: mặc định tạo chủ rừng mới', /chủ rừng mới “TRẦN THỊ BÌNH”/.test(await w.innerText('#lkBody')));
  await w.click('[data-act=lkApply]'); await w.waitForTimeout(150);
  ok('diện tích khác nhau giữa hai nguồn: bắt buộc chọn', /Chọn giá trị diện tích/.test(await w.innerText('#lkBody')));
  await w.check('[data-lkarea="1"]'); await w.check('[data-lkgps="0"]');
  await w.screenshot({path: path.join(process.env.SHOTS || dir, 'xem_truoc.png'), fullPage: true});
  await w.click('[data-act=lkApply]'); await w.waitForSelector('#lkBox.on', {state: 'hidden'}); await stSave(w); await w.click('[data-ftab=finfo]').catch(() => {});
  await w.click('header [data-act=lkOpen]'); await w.fill('#lkQ', '20260220_001'); await w.click('[data-act=lkFind]'); await w.waitForTimeout(150);
  await w.click('[data-lkpick]'); await w.waitForTimeout(150);
  const fi2 = await w.$eval('#forestForm', f => Object.fromEntries(new FormData(f)));
  ok('chọn diện tích từ ToaDoRung (50.000 m² = 5 ha) và tọa độ điểm đã chọn', +fi2.dienTich === 5 && +fi2.lat === 15.5);
  ok('mã rừng đã có: không cho tạo mới, gợi ý mở rừng đó', /Không tạo mới được: mã rừng 20260220_001 đã có/.test(await w.innerText('#lkBody')));
  await w.click('[data-act=lkClose]');
  // Đồng bộ Google Sheets (máy chủ giả lập), rồi đồng bộ lỗi
  await w.click('header [data-act=lkOpen]'); await w.click('[data-act=lkSync]'); await w.waitForFunction(() => /Đã cập nhật bản tra cứu/.test(document.getElementById('lkBody').innerText));
  ok('đồng bộ Google Sheets thành công', /Bản tra cứu đang dùng:<\/b> Google Sheets|Bản tra cứu đang dùng: Google Sheets/.test(await w.innerText('#lkBody')));
  serverOn = false; await w.click('[data-act=lkSync]'); await w.waitForFunction(() => /Chưa cập nhật bản tra cứu/.test(document.getElementById('lkBody').innerText));
  await w.fill('#lkQ', 'nguyen'); await w.click('[data-act=lkFind]'); await w.waitForTimeout(150);
  ok('đồng bộ lỗi: báo lỗi, vẫn tra cứu bản đã lưu', /HTTP 503/.test(await w.innerText('#lkBody')) && (await w.$$('[data-lkpick]')).length > 0);
  ok('không có lỗi JavaScript', errs.length === 0); if (errs.length) console.log(errs);
  await app.close();
  // Mở lại khi "mất mạng": máy chủ tắt, bản tra cứu và hồ sơ vẫn còn
  srv.close();
  app = await launch(); w = await app.firstWindow(); w.on('pageerror', e => errs.push(e.message)); await w.waitForSelector('#side');
  ok('mở lại: hồ sơ 2 chủ rừng còn nguyên', (await w.$$('[data-open]')).length === 2);
  await w.click('header [data-act=lkOpen]'); await w.waitForTimeout(300);
  ok('mở lại khi mất kết nối: vẫn tra cứu được bản đã lưu', (await w.$$('[data-lkpick]')).length > 0 && /Google Sheets/.test(await w.innerText('#lkBody')));
  ok('không có lỗi JavaScript sau khi mở lại', errs.length === 0);
  await app.close();
  console.log(fail ? 'CÓ ' + fail + ' LỖI' : 'TẤT CẢ ĐẠT'); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
