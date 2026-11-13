'use strict';
/* Kiểm thử tra cứu offline và luồng ghi vào hồ sơ (Electron thật, dữ liệu giả lập): nhập Excel không cần mạng, kg → tấn khi cột tấn trống,
 * dòng thiếu CCCD, chỉ ghi trường và phiếu đã chọn, nhập lại cùng nguồn không sinh phiếu trùng, mở lại app vẫn tra cứu được. */
const {_electron: electron} = require('playwright-core');
const path = require('path'), fs = require('fs'), os = require('os');
const root = path.join(__dirname, '..');
const FIX = path.join(root, 'tests', 'fixtures');
const dbFile = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'hakqn-lk2-')), 'lk2.sqlite');
let fail = 0; const ok = (name, cond, extra) => { console.log((cond ? 'ĐẠT  ' : 'LỖI  ') + name + (!cond && extra ? ' — ' + extra : '')); if (!cond) fail++; };
const launch = () => electron.launch({executablePath: require('electron'), args: [root, '--no-sandbox'], env: {...process.env, HAKQN_DB: dbFile, HAKQN_SHEET_URL: 'http://127.0.0.1:9/none.xlsx', ELECTRON_DISABLE_SECURITY_WARNINGS: '1'}});
const find = async (w, q, tab = '') => { await w.click('header [data-act=lkOpen]'); await w.waitForSelector('#lkQ'); await w.click('[data-lktab="' + tab + '"]'); await w.fill('#lkQ', q); await w.click('[data-act=lkFind]'); await w.waitForTimeout(200); };

(async () => {
  let app = await launch(), w = await app.firstWindow(); const errs = []; w.on('pageerror', e => errs.push(e.message)); w.on('dialog', d => d.accept());
  await w.waitForSelector('#side');
  // 1. Nhập Excel (đường offline) và kiểm tra đủ 3 tab
  const imp = await w.evaluate(p => window.hak.lookup.importExcel(p), path.join(FIX, 'gia_lap_HoSoKeo_QC.xlsx'));
  ok('nhập file Excel offline: đủ 3 tab (8 phiếu, 5 hợp đồng, 7 điểm GPS)', imp.ok && imp.counts.HoSoKeo_QC === 8 && imp.counts.HoSoRung_QC === 5 && imp.counts.ToaDoRung_QC === 7, JSON.stringify(imp));
  const bad = await w.evaluate(p => window.hak.lookup.importExcel(p), path.join(FIX, 'gia_lap_thieu_tab.xlsx'));
  ok('file thiếu tab: báo rõ tab, giữ bản cũ', !bad.ok && /Thiếu tab “ToaDoRung”/.test(bad.errors.join()) && (await w.evaluate(() => window.hak.lookup.status())).active.counts.HoSoKeo_QC === 8);

  // 2. Dòng thiếu CCCD: không ghi được, báo rõ
  await find(w, '9001/2026'); await w.click('[data-lkpick]'); await w.waitForTimeout(250);
  ok('dòng thiếu CCCD: báo không xác định được chủ rừng, không mở màn hình ghi', /không có CCCD/.test(await w.innerText('#lkBody')) && !(await w.$('[data-act=lkModeNew]')));
  await w.click('[data-act=lkClose]');

  // 3. Cột tấn trống: lấy kg ÷ 1.000 (2.000 kg = 2 tấn); CCCD số mất số 0 đầu vẫn ghép đúng
  await find(w, '4001', 'HoSoKeo_QC'); await w.click('[data-lkpick]'); await w.waitForSelector('[data-act=lkModeNew]');
  await w.selectOption('#lkOwner', 'new'); await w.click('[data-act=lkModeNew]'); await w.waitForSelector('[data-act=lkApply]');
  ok('biển 43C-12345 chưa có trong danh sách xe: không chọn sẵn, có cảnh báo (quy tắc checklist)', /biển chưa có trong danh sách xe của rừng/.test(await w.innerText('#lkBody')) && !(await w.isChecked('[data-lkpc="4001"]')));
  await w.click('[data-act=lkPcAll]');
  const pv = await w.innerText('#lkBody');
  ok('xem trước: phiếu 4001 lấy 2 tấn từ 2.000 kg, CCCD 049000000004 (bù số 0 đầu)', /4001/.test(pv) && /049000000004/.test(pv) && /đã chọn 1 phiếu, 2 tấn/.test(pv), pv.slice(pv.indexOf('Phiếu cân'), pv.indexOf('Phiếu cân') + 120));
  await w.click('[data-act=lkApply]'); await w.waitForSelector('#lkBox.on', {state: 'hidden'});
  await w.click('[data-ftab=dx]');
  ok('đã ghi phiếu 4001 vào rừng mới', /4001/.test(await w.innerText('#main')) && /LÊ VĂN ĐÔNG/.test(await w.innerText('#side')));

  // 4. Chỉ ghi trường và phiếu đã chọn: bỏ chọn 1 phiếu và 1 trường
  await find(w, '1001/2026', 'HoSoKeo_QC'); await w.click('[data-lkpick]'); await w.waitForSelector('[data-act=lkModeNew]');
  await w.selectOption('#lkOwner', 'new'); await w.click('[data-act=lkModeNew]'); await w.waitForSelector('[data-act=lkApply]');
  await w.fill('[data-lkalias]', '92C-99999'); await w.dispatchEvent('[data-lkalias]', 'change'); await w.waitForTimeout(100);
  await w.click('[data-act=lkPcAll]');
  ok('phiếu có tấn/kg lệch: không chọn sẵn và không cho chọn', !(await w.isChecked('[data-lkpc="1003/2026/NK"]')) && await w.isDisabled('[data-lkpc="1003/2026/NK"]'));
  await w.uncheck('[data-lkpc="1001/2026/NK"]'); await w.uncheck('[data-lksel="forest|diaDiem"]');
  await w.click('[data-act=lkApply]'); await w.waitForSelector('#lkBox.on', {state: 'hidden'});
  const f = await w.$eval('#forestForm', x => Object.fromEntries(new FormData(x)));
  ok('trường bỏ chọn (địa điểm khai thác) không được ghi', f.diaDiem === '', JSON.stringify(f));
  await w.click('[data-ftab=dx]'); let main = await w.innerText('#main');
  ok('chỉ phiếu 1002 được ghi; 1001 (bỏ chọn) và 1003 (lệch) không được ghi', /1002\/2026\/NK/.test(main) && !/1001\/2026\/NK/.test(main) && !/1003\/2026\/NK/.test(main));

  // 5. Nhập lại cùng nguồn vào rừng đang mở: phiếu đã có hiện "bỏ qua", không sinh bản trùng
  await w.click('[data-ftab=finfo]'); await w.click('#forestForm [data-act=lkOpen]'); await w.waitForSelector('#lkBox.on');
  await w.click('[data-lktab="HoSoKeo_QC"]'); await w.fill('#lkQ', '1002/2026'); await w.click('[data-act=lkFind]'); await w.waitForTimeout(200);
  await w.click('[data-lkpick]'); await w.click('[data-act=lkModeFill]'); await w.waitForSelector('[data-act=lkApply]');
  ok('phiếu đã có hiện “bỏ qua”, ô chọn bị khóa', /bỏ qua/.test(await w.innerText('#lkBody')) && await w.isDisabled('[data-lkpc="1002/2026/NK"]'));
  await w.click('[data-act=lkApply]'); await w.waitForTimeout(300);
  if (await w.isVisible('#lkBox.on')) await w.click('[data-act=lkClose]');
  await w.click('[data-ftab=dx]'); main = await w.innerText('#main');
  ok('nhập lại không tạo phiếu trùng (đúng 1 dòng 1002)', (main.match(/1002\/2026\/NK/g) || []).length === 1);
  // 5b. Chế độ cha–con (master–detail), chip điều kiện (Smart Filter), bộ lọc đã lưu
  if (await w.isVisible('#lkBox.on')) await w.click('[data-act=lkClose]');
  await w.click('header [data-act=lkOpen]'); await w.waitForSelector('#lkQ');
  if (await w.$('[data-act=lkClearAll]')) await w.click('[data-act=lkClearAll]');
  await w.fill('#lkQ', 'nguyen van an'); await w.click('[data-act=lkFind]'); await w.waitForTimeout(200);
  await w.click('[data-lklayout=tree]'); await w.waitForSelector('tr.lkg'); await w.waitForTimeout(300);
  ok('cha–con: 3 hợp đồng của “nguyen van an” (khóa CCCD + hợp đồng, không lẫn hợp đồng 101 của CCCD khác)', (await w.$$('tr.lkg')).length === 3);
  ok('cha–con: khung chi tiết hiện đủ phiếu của hợp đồng 101 (3 phiếu, 12,18 tấn)', /3\s*Phiếu cân/.test(await w.innerText('#lkDetail')) && /12,18/.test(await w.innerText('#lkDetail')));
  await w.click('[data-lkdt=phieu]');
  const det = await w.innerText('#lkDetail');
  ok('cha–con: tab phiếu cân liệt kê 1001, 1002, 1003 và cờ kiểm tra', /1001\/2026\/NK/.test(det) && /1003\/2026\/NK/.test(det) && /Biển số là tên xe|lệch/.test(det));
  await w.click('tr.lkg >> nth=1'); await w.waitForTimeout(300);
  ok('cha–con: chọn dòng khác thì khung chi tiết đổi theo (hợp đồng 102)', /Hợp đồng 102/.test(await w.innerText('#lkDetail')));
  await w.click('#lkAdv summary'); await w.fill('#lkFrom', '2026-01-01'); await w.fill('#lkTo', '2026-01-31'); await w.check('#lkIssues'); await w.click('[data-act=lkFind]'); await w.waitForTimeout(250);
  ok('Smart Filter: chip điều kiện và dòng phạm vi lọc dùng chung một chuỗi', (await w.$$('[data-lkrm]')).length === 3 && /Phạm vi lọc: Tìm: nguyen van an · Ngày: 01\/01\/2026 → 31\/01\/2026 · Chỉ dòng cần kiểm tra/.test(await w.innerText('#lkScope')));
  ok('cha–con kết hợp bộ lọc: chỉ còn hợp đồng có phiếu lỗi trong kỳ', (await w.$$('tr.lkg')).length === 1);
  await w.fill('#lkPresetName', 'Phiếu lỗi tháng 1'); await w.click('[data-act=lkPresetSave]');
  await w.click('[data-lkrm="2"]'); await w.waitForTimeout(250);
  ok('gỡ một chip: điều kiện đó bị bỏ và kết quả cập nhật', (await w.$$('[data-lkrm]')).length === 2);
  await w.click('[data-act=lkClearAll]'); await w.waitForTimeout(250);
  ok('xóa hết: không còn chip, trở về đủ hợp đồng', (await w.$$('[data-lkrm]')).length === 0 && (await w.$$('tr.lkg')).length > 3);
  await w.selectOption('#lkPreset', 'Phiếu lỗi tháng 1'); await w.waitForTimeout(350);
  ok('mở bộ lọc đã lưu: khôi phục đủ 3 điều kiện và kết quả', (await w.$$('[data-lkrm]')).length === 3 && (await w.$$('tr.lkg')).length === 1);
  await w.click('#lkDetail [data-lkpick]'); await w.waitForFunction(() => /Chủ rừng: .*CCCD/.test(document.getElementById('lkBody').innerText));
  ok('nút “Chọn để ghi vào hồ sơ” từ khung chi tiết mở đúng màn hình ghi (chủ rừng, CCCD, hợp đồng 101, cảnh báo trùng số hợp đồng)', /Hợp đồng 101/.test(await w.innerText('#lkBody')) && /cũng được dùng cho 1 CCCD khác/.test(await w.innerText('#lkBody')));
  if (await w.isVisible('#lkBox.on')) await w.click('[data-act=lkClose]');
  ok('không có lỗi JavaScript', errs.length === 0, errs.join('; '));
  await app.close();

  // 6. Mở lại app (không mạng; địa chỉ đồng bộ trỏ vào cổng đóng): hồ sơ và bản tra cứu còn nguyên, đồng bộ lỗi vẫn giữ bản cũ
  app = await launch(); w = await app.firstWindow(); w.on('pageerror', e => errs.push(e.message)); await w.waitForSelector('#side');
  ok('mở lại: 2 chủ rừng còn nguyên', (await w.$$('[data-open]')).length === 2);
  await w.click('header [data-act=lkOpen]'); await w.click('[data-act=lkSync]'); await w.waitForFunction(() => /Chưa cập nhật bản tra cứu/.test(document.getElementById('lkBody').innerText), null, {timeout: 60000});
  const body = await w.innerText('#lkBody');
  ok('đồng bộ khi không kết nối: báo nguyên nhân và nói rõ vẫn dùng bản cũ', /Không kết nối được/.test(body) && /vẫn được dùng|vẫn dùng/.test(body), body.slice(0, 300));
  await w.fill('#lkQ', 'nguyen van an'); await w.click('[data-act=lkFind]'); await w.waitForTimeout(200);
  ok('sau lỗi vẫn tra cứu offline được bản đã lưu', (await w.$$('[data-lkpick]')).length > 0);
  ok('không có lỗi JavaScript sau khi mở lại', errs.length === 0, errs.join('; '));
  await app.close();
  console.log(fail ? 'CÓ ' + fail + ' LỖI' : 'TẤT CẢ ĐẠT'); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
