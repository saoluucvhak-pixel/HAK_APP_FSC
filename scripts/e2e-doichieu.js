'use strict';
/* Báo cáo “Đối chiếu bản tra cứu: tọa độ, hồ sơ rừng, phiếu cân” (Electron thật, bảng tính Google Sheets giả lập):
 * rừng thiếu tọa độ, phiếu cân thiếu hồ sơ rừng, xem trước, bộ lọc, xuất Excel và Word; chưa có bản tra cứu thì báo rõ.
 * Chạy: xvfb-run -a node scripts/e2e-doichieu.js */
const {_electron: electron} = require('playwright-core');
const path = require('path'), fs = require('fs'), os = require('os');
const XLSX = require('xlsx'), JSZip = require('jszip');
const {build} = require('../tests/fixtures/make-lookup');
const src = fs.readFileSync(path.join(__dirname, 'e2e-inan2.js'), 'utf8');
const {lot, seed, PC} = new Function(src.slice(src.indexOf('const nv ='), src.indexOf('const plain =')) + '; return {lot, seed, PC};')();
const root = path.join(__dirname, '..');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hakqn-dc-')), out = path.join(dir, 'out');
let fail = 0; const ok = (name, cond, extra) => { console.log((cond ? 'ĐẠT  ' : 'LỖI  ') + name + (!cond && extra ? ' — ' + extra : '')); if (!cond) fail++; };
const clearOut = () => { fs.mkdirSync(out, {recursive: true}); for (const f of fs.readdirSync(out)) fs.unlinkSync(path.join(out, f)); };
(async () => {
  const app = await electron.launch({executablePath: require('electron'), args: [root, '--no-sandbox'], env: {...process.env, HAKQN_DB: path.join(dir, 'd.sqlite'), HAKQN_USERDATA: path.join(dir, 'ud'), HAKQN_DOWNLOAD_DIR: out, HAKQN_SHEET_URL: 'http://127.0.0.1:9/none.xlsx', ELECTRON_DISABLE_SECURITY_WARNINGS: '1'}});
  const w = await app.firstWindow(); const errs = []; w.on('pageerror', e => errs.push(e.message)); w.on('dialog', d => d.accept()); await w.waitForSelector('#side');
  await w.evaluate(d => window.hak.save(d), seed([lot('fa', 'R-A', {exp: {}, pc: PC, kl: 30})])); await w.reload(); await w.waitForSelector('#side');   // báo cáo cần có ít nhất một hồ sơ để mở
  const openRp = async () => { await w.evaluate(() => document.querySelector('[data-act=rpOpen]').click()); await w.waitForSelector('.rpl'); await w.$eval('[data-rpsel=doichieu]', b => b.click()); await w.waitForTimeout(700); };
  const body = () => w.innerText('#rpBody');

  // 1. chưa có bản tra cứu
  await openRp();
  ok('có mẫu “Đối chiếu bản tra cứu”; chưa có bản tra cứu thì nói rõ và hướng dẫn đồng bộ', !!(await w.$('[data-rpsel=doichieu]')) && /Chưa có bản tra cứu/.test(await body()), (await body()).slice(0, 300));
  await w.click('[data-act=rpClose]').catch(() => {});

  // 2. nạp bảng tính giả lập rồi mở lại
  const f = path.join(dir, 'goc.xlsx'); fs.writeFileSync(f, build());
  ok('nạp bảng tính tra cứu giả lập', (await w.evaluate(p => window.hak.lookup.importExcel(p), f)).ok);
  await openRp(); let t = await body();
  ok('mục I: rừng của CCCD 049000000003 (hợp đồng 101) có dòng tọa độ nhưng không dùng được (vĩ độ sai)', /I\. Rừng \(HoSoRung\) thiếu tọa độ/.test(t) && /049000000003/.test(t) && /tọa độ không dùng được/.test(t), t.slice(0, 500));
  ok('mục II: phiếu 9001 (hợp đồng 999, không CCCD) thiếu hồ sơ rừng; có gợi ý “chưa có trong HoSoRung”', /II\. Phiếu cân \(HoSoKeo\) thiếu hồ sơ rừng/.test(t) && /999/.test(t) && /9001\/2026\/NK/.test(t) && /chưa có trong HoSoRung/.test(t));
  const kpi = await w.$$eval('#rpBody .kpi div', d => d.map(x => x.textContent));
  ok('chỉ số: 1 rừng thiếu tọa độ, 1 phiếu thiếu hồ sơ rừng (1 tấn), 0 rừng chưa có phiếu', kpi.length >= 4 && /^1/.test(kpi[0]) && /^1/.test(kpi[1]) && /^1/.test(kpi[2]) && /^0/.test(kpi[3]), JSON.stringify(kpi));
  // 3. bộ lọc
  await w.fill('#rpQ', '999'); await w.press('#rpQ', 'Enter'); await w.waitForTimeout(400); t = await body();
  ok('tìm nhanh “999”: chỉ còn dòng của hợp đồng 999; mục rừng thiếu tọa độ không còn dòng', /9001\/2026\/NK/.test(t) && !/049000000003/.test(t));
  await w.click('[data-act=rpClearAll]'); await w.waitForTimeout(300);
  await w.check('#rpFlag_onlyToaDo'); await w.waitForTimeout(350); t = await body();
  ok('chỉ rừng thiếu tọa độ: còn mục I, bỏ phiếu thiếu hồ sơ rừng', /049000000003/.test(t) && !/9001\/2026\/NK/.test(t));
  await w.uncheck('#rpFlag_onlyToaDo'); await w.waitForTimeout(300);
  // 4. xuất Excel và Word
  clearOut(); await w.click('[data-act=rpExcel]'); let x = null; for (let i = 0; i < 80 && !x; i++) { x = fs.readdirSync(out).find(n => n.endsWith('.xlsx')); if (!x) await w.waitForTimeout(150); } await w.waitForTimeout(250);
  const wb = XLSX.readFile(path.join(out, x)), aoa = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], {header: 1, defval: ''});
  ok('Excel: có tiêu đề báo cáo, rừng thiếu tọa độ và phiếu 9001', aoa.some(r => r.some(v => /ĐỐI CHIẾU BẢN TRA CỨU/.test(String(v)))) && aoa.some(r => r.some(v => /049000000003/.test(String(v)))) && aoa.some(r => r.some(v => /9001\/2026\/NK/.test(String(v)))));
  clearOut(); await w.click('[data-act=rpWord]'); x = null; for (let i = 0; i < 80 && !x; i++) { x = fs.readdirSync(out).find(n => n.endsWith('.docx')); if (!x) await w.waitForTimeout(150); } await w.waitForTimeout(250);
  const xml = await (await JSZip.loadAsync(fs.readFileSync(path.join(out, x)))).file('word/document.xml').async('string');
  ok('Word: có tiêu đề, mục I và mục II', /ĐỐI CHIẾU BẢN TRA CỨU/.test(xml) && /thiếu tọa độ/.test(xml) && /thiếu hồ sơ rừng/.test(xml));
  ok('không có lỗi JavaScript', errs.length === 0, errs.join('|'));
  await app.close(); console.log(fail ? 'CÓ ' + fail + ' LỖI' : 'TẤT CẢ ĐẠT'); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
