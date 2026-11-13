'use strict';
/* Bộ lọc thông minh cho mẫu báo cáo (Electron thật): tìm nhanh, lô rừng, điều kiện riêng của Danh sách lao động và Danh sách xe,
 * chip điều kiện, xóa hết, bộ lọc đã lưu; số liệu và file xuất khớp phần đã lọc.
 * Chạy: xvfb-run -a node scripts/e2e-bcloc.js */
const {_electron: electron} = require('playwright-core');
const path = require('path'), fs = require('fs'), os = require('os');
const XLSX = require('xlsx');
const src = fs.readFileSync(path.join(__dirname, 'e2e-inan2.js'), 'utf8');
const {nv, xe, lot, seed, PC} = new Function(src.slice(src.indexOf('const nv ='), src.indexOf('const plain =')) + '; return {nv, xe, lot, seed, PC};')();
const root = path.join(__dirname, '..');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hakqn-bcloc-')), out = path.join(dir, 'out');
let fail = 0; const ok = (name, cond, extra) => { console.log((cond ? 'ĐẠT  ' : 'LỖI  ') + name + (!cond && extra ? ' — ' + extra : '')); if (!cond) fail++; };
const clearOut = () => { fs.mkdirSync(out, {recursive: true}); for (const f of fs.readdirSync(out)) fs.unlinkSync(path.join(out, f)); };
(async () => {
  const app = await electron.launch({executablePath: require('electron'), args: [root, '--no-sandbox'], env: {...process.env, HAKQN_DB: path.join(dir, 'f.sqlite'), HAKQN_USERDATA: path.join(dir, 'ud'), HAKQN_DOWNLOAD_DIR: out, ELECTRON_DISABLE_SECURITY_WARNINGS: '1'}});
  const w = await app.firstWindow(); const errs = []; w.on('pageerror', e => errs.push(e.message)); w.on('dialog', d => d.accept()); await w.waitForSelector('#side');
  const A = lot('fa', 'R-A', {exp: {}, pc: PC, kl: 30}); A.dx[1].sdt = '';
  const B = lot('fb', 'R-B', {exp: {}, pc: [], nc: [nv(1, 'Tổ trưởng', 'ĐỖ TỔ B', 'Tổ trưởng', '049085000011'), nv(2, 'Công nhân', 'EM NHỎ', 'Công nhân khai thác', '049012000012')].map(r => ({...r, maRung: 'R-B'})), dx: [{...xe('92C-55555', '049000000099', 'TRẦN CHỦ XE B'), maRung: 'R-B', sdt: ''}]});
  B.nc[1].ngaySinh = '01/06/2012';   // dưới 18 tuổi
  await w.evaluate(d => window.hak.save(d), seed([A, B])); await w.reload(); await w.waitForSelector('#side');
  await w.evaluate(() => document.querySelector('[data-act=rpOpen]').click()); await w.waitForSelector('.rpl');
  const body = () => w.innerText('#rpBody');
  const rows = async () => (await w.$$eval('#rpBody table', ts => ts.map(t => [...t.querySelectorAll('tr')].map(r => [...r.children].map(c => c.textContent.trim())))));
  const exportXlsx = async () => { clearOut(); await w.click('[data-act=rpExcel]'); let f = null; for (let i = 0; i < 80 && !f; i++) { f = fs.readdirSync(out).find(x => x.endsWith('.xlsx')); if (!f) await w.waitForTimeout(150); } await w.waitForTimeout(200); const wb = XLSX.readFile(path.join(out, f)); return XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], {header: 1, defval: ''}); };
  const q = async v => { await w.fill('#rpQ', v); await w.press('#rpQ', 'Enter'); await w.waitForTimeout(350); };

  // ===== Danh sách lao động =====
  await w.click('[data-rpsel=laodong]'); await w.waitForSelector('#rpSf');
  let t = await body();
  ok('mẫu có thanh bộ lọc thông minh: tìm nhanh, lô rừng, chức danh, vai trò, ô chỉ dưới 18 tuổi / hồ sơ cần bổ sung, bộ lọc đã lưu', !!(await w.$('#rpQ')) && !!(await w.$('#rpOne_rung')) && !!(await w.$('#rpOne_chucDanh')) && !!(await w.$('#rpOne_vaiTro')) && !!(await w.$('#rpFlag_onlyMinors')) && !!(await w.$('#rpFlag_onlyMissing')) && !!(await w.$('#rpPreset')));
  ok('chưa lọc: đủ 5 lao động của 2 lô', /Tổng số lao động/.test(t) && (await rows())[1].length >= 6 && /ĐỖ TỔ B/.test(t) && /PHẠM CƯA/.test(t));
  await q('cưa');
  t = await body(); let det = (await rows())[1];
  ok('tìm nhanh “cưa” (không phân biệt dấu): chỉ còn PHẠM CƯA, chip “Tìm: cưa”, tổng hợp và KPI khớp', /PHẠM CƯA/.test(t) && !/LÊ CÔNG NHÂN/.test(t) && !/ĐỖ TỔ B/.test(t) && !!(await w.$('.pill:has-text("Tìm: cưa")')) && /Phạm vi lọc|Tìm: cưa/.test(t) && (await w.$$eval('#rpBody .kpi div', d => d.map(x => x.textContent)))[1].startsWith('1'), JSON.stringify(det));
  const x1 = await exportXlsx(); ok('Excel xuất đúng phần đã lọc (1 người) và ghi phạm vi lọc', x1.some(r => r.some(v => /PHẠM CƯA/.test(String(v)))) && !x1.some(r => r.some(v => /ĐỖ TỔ B/.test(String(v)))) && x1.some(r => r.some(v => /Tìm: cưa/.test(String(v)))));
  await w.click('.pill:has-text("Tìm: cưa") .chipx'); await w.waitForTimeout(300);
  ok('bỏ chip: trở lại đủ lao động', /ĐỖ TỔ B/.test(await body()) && !(await w.$('#rpSf .pill:has-text("Tìm:")')));
  await w.selectOption('#rpOne_chucDanh', 'Tổ trưởng'); await w.waitForTimeout(350); t = await body();
  ok('chức danh “Tổ trưởng”: chỉ 2 tổ trưởng (hai lô)', /TRẦN TỔ TRƯỞNG/.test(t) && /ĐỖ TỔ B/.test(t) && !/PHẠM CƯA/.test(t) && !!(await w.$('.pill:has-text("Chức danh: Tổ trưởng")')));
  await w.click('[data-act=rpClearAll]'); await w.waitForTimeout(300);
  await w.selectOption('#rpOne_rung', 'R-B'); await w.waitForTimeout(350); t = await body();
  ok('lô rừng R-B: chỉ lao động của lô B', /ĐỖ TỔ B/.test(t) && /EM NHỎ/.test(t) && !/PHẠM CƯA/.test(t));
  await w.check('#rpFlag_onlyMinors'); await w.waitForTimeout(350); t = await body();
  ok('chỉ người dưới 18 tuổi: còn EM NHỎ (tuổi 14), bỏ tổ trưởng B; chip điều kiện', /EM NHỎ/.test(t) && !/ĐỖ TỔ B/.test(t) && !!(await w.$('.pill:has-text("Chỉ người dưới 18 tuổi")')));
  // bộ lọc đã lưu
  await w.fill('#rpPresetName', 'Lao động dưới 18'); await w.click('[data-act=rpPresetSave]'); await w.waitForTimeout(300);
  ok('lưu bộ lọc: hiện trong danh sách bộ lọc đã lưu', (await w.$$eval('#rpPreset option', o => o.map(x => x.textContent))).includes('Lao động dưới 18'));
  await w.click('[data-act=rpClearAll]'); await w.waitForTimeout(300); ok('xóa hết: không còn chip', !(await w.$('#rpSf .pill')) && /ĐỖ TỔ B/.test(await body()));
  await w.selectOption('#rpPreset', 'Lao động dưới 18'); await w.waitForTimeout(400); t = await body();
  ok('mở bộ lọc đã lưu: khôi phục lô R-B và chỉ người dưới 18 tuổi', /EM NHỎ/.test(t) && !/ĐỖ TỔ B/.test(t) && (await w.inputValue('#rpOne_rung')) === 'R-B' && (await w.isChecked('#rpFlag_onlyMinors')));
  await w.click('[data-act=rpPresetDel]'); await w.waitForTimeout(300);
  ok('xóa bộ lọc đã lưu', !(await w.$$eval('#rpPreset option', o => o.map(x => x.textContent))).includes('Lao động dưới 18'));
  await w.click('[data-act=rpClearAll]'); await w.waitForTimeout(300);

  // ===== Danh sách xe =====
  await w.click('[data-rpsel=danhsachxe]'); await w.waitForSelector('#rpFlag_onlyNoPhone');
  ok('mẫu Danh sách xe có điều kiện riêng: người ký, chưa có SĐT, có/chưa có chuyến', !!(await w.$('#rpOne_nguoiKy')) && !!(await w.$('#rpFlag_onlyNoPhone')) && !!(await w.$('#rpFlag_onlyTrips')) && !!(await w.$('#rpFlag_onlyNoTrips')));
  t = await body(); ok('chưa lọc: đủ 3 xe', /92C-12345/.test(t) && /92C-67890/.test(t) && /92C-55555/.test(t));
  await w.check('#rpFlag_onlyNoPhone'); await w.waitForTimeout(350); t = await body();
  ok('chỉ xe chưa có SĐT: 92C-12345 (có SĐT) bị loại; còn 92C-67890 và 92C-55555', !/92C-12345/.test(t) && /92C-67890/.test(t) && /92C-55555/.test(t));
  await w.uncheck('#rpFlag_onlyNoPhone'); await w.check('#rpFlag_onlyTrips'); await w.waitForTimeout(350); t = await body();
  ok('chỉ xe có chuyến trong kỳ: 92C-12345 và 92C-67890; xe 92C-55555 (lô B chưa có phiếu cân) bị loại', /92C-12345/.test(t) && /92C-67890/.test(t) && !/92C-55555/.test(t));
  await w.uncheck('#rpFlag_onlyTrips'); await w.waitForTimeout(300);
  await q('55555'); t = await body(); ok('tìm nhanh theo biển số “55555”: chỉ xe 92C-55555', /92C-55555/.test(t) && !/92C-12345/.test(t));
  const x2 = await exportXlsx(); ok('Excel danh sách xe đã lọc: chỉ xe 92C-55555', x2.some(r => r.includes('92C-55555')) && !x2.some(r => r.includes('92C-12345')));
  await w.click('[data-act=rpClearAll]'); await w.waitForTimeout(300);
  // mẫu khác: tìm nhanh số phiếu ở Sổ phiếu cân
  await w.click('[data-rpsel=phieucan]'); await w.waitForSelector('#rpQ'); await q('PA2'); t = await body();
  ok('Sổ phiếu cân: tìm nhanh số phiếu PA2 chỉ còn một phiếu; KPI Số phiếu cân = 1', /PA2/.test(t) && !/PA1\b/.test(t) && (await w.$$eval('#rpBody .kpi div', d => d.map(x => x.textContent)))[0].startsWith('1'));
  ok('không có lỗi JavaScript', errs.length === 0, errs.join('|'));
  await app.close(); console.log(fail ? 'CÓ ' + fail + ' LỖI' : 'TẤT CẢ ĐẠT'); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
