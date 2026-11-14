'use strict';
/* Báo cáo “Danh sách lao động theo lô” và “Danh sách xe vận chuyển theo lô” (Electron thật): xem trước, xuất Word và Excel.
 * Chạy: xvfb-run -a node scripts/e2e-bcld.js */
const {_electron: electron} = require('playwright-core');
const path = require('path'), fs = require('fs'), os = require('os');
const XLSX = require('xlsx'), JSZip = require('jszip');
const src = fs.readFileSync(path.join(__dirname, 'e2e-inan2.js'), 'utf8');
const {lot, seed, PC} = new Function(src.slice(src.indexOf('const nv ='), src.indexOf('const plain =')) + '; return {lot, seed, PC};')();
const root = path.join(__dirname, '..');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hakqn-bcld-')), out = path.join(dir, 'out');
let fail = 0; const ok = (name, cond, extra) => { console.log((cond ? 'ĐẠT  ' : 'LỖI  ') + name + (!cond && extra ? ' — ' + extra : '')); if (!cond) fail++; };
const clearOut = () => { fs.mkdirSync(out, {recursive: true}); for (const f of fs.readdirSync(out)) fs.unlinkSync(path.join(out, f)); };
(async () => {
  const app = await electron.launch({executablePath: require('electron'), args: [root, '--no-sandbox'], env: {...process.env, HAKQN_CLOSE: 'discard', HAKQN_DB: path.join(dir, 'r.sqlite'), HAKQN_USERDATA: path.join(dir, 'ud'), HAKQN_DOWNLOAD_DIR: out, ELECTRON_DISABLE_SECURITY_WARNINGS: '1'}});
  const w = await app.firstWindow(); const errs = []; w.on('pageerror', e => errs.push(e.message)); w.on('dialog', d => d.accept()); await w.waitForSelector('#side');
  const L = lot('fa', 'R-A', {exp: {}, pc: PC, kl: 30}); L.dx[0].sdt = '0905123456';
  await w.evaluate(d => window.hak.save(d), seed([L])); await w.reload(); await w.waitForSelector('#side');
  await w.evaluate(() => document.querySelector('[data-act=rpOpen]').click()); await w.waitForSelector('.rpl');
  ok('Báo cáo có hai mẫu mới: Danh sách lao động và Danh sách xe', !!(await w.$('[data-rpsel=laodong]')) && !!(await w.$('[data-rpsel=danhsachxe]')));
  const exportTo = async (sel, ext) => { clearOut(); await w.click(sel); let f = null; for (let i = 0; i < 80 && !f; i++) { f = fs.readdirSync(out).find(x => x.endsWith(ext)); if (!f) await w.waitForTimeout(150); } await w.waitForTimeout(200); return path.join(out, f); };
  // lao động
  await w.click('[data-rpsel=laodong]'); await w.waitForTimeout(400);
  let t = await w.innerText('#rpBody');
  ok('xem trước lao động: tổng hợp theo lô (3 người, 1 tổ trưởng) và chi tiết theo tên', /BÁO CÁO DANH SÁCH LAO ĐỘNG THEO LÔ RỪNG/.test(await w.innerText('#rpBox')) && /TRẦN TỔ TRƯỞNG/.test(t) && /LÊ CÔNG NHÂN/.test(t) && /PHẠM CƯA/.test(t) && /Tổ trưởng/.test(t));
  let wb = XLSX.readFile(await exportTo('[data-act=rpExcel]', '.xlsx')); let aoa = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], {header: 1, defval: ''});
  ok('Excel lao động: có đủ 3 người với CCCD và đơn giá (420.000, 330.000, 380.000)', ['049085000001', '049085000002', '049085000003'].every(c => aoa.some(r => r.some(v => String(v) === c))) && [420000, 330000, 380000].every(g => aoa.some(r => r.includes(g))));
  let docx = await exportTo('[data-act=rpWord]', '.docx'); let xml = await (await JSZip.loadAsync(fs.readFileSync(docx))).file('word/document.xml').async('string');
  ok('Word lao động: tiêu đề và tên lao động', /BÁO CÁO DANH SÁCH LAO ĐỘNG THEO LÔ RỪNG/.test(xml) && /TRẦN TỔ TRƯỞNG/.test(xml));
  // xe
  await w.click('[data-rpsel=danhsachxe]'); await w.waitForTimeout(400); t = await w.innerText('#rpBody');
  ok('xem trước danh sách xe: hai xe, số chuyến và khối lượng theo phiếu cân (92C-12345: 2 chuyến, 20,5 tấn)', /92C-12345/.test(t) && /92C-67890/.test(t) && /20,5/.test(t));
  wb = XLSX.readFile(await exportTo('[data-act=rpExcel]', '.xlsx')); aoa = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], {header: 1, defval: ''});
  const x1 = aoa.find(r => r.includes('92C-12345')); ok('Excel danh sách xe: xe 92C-12345 có SĐT, 2 chuyến, 20,5 tấn (số thật)', !!x1 && x1.includes('0905123456') && x1.includes(2) && x1.some(v => typeof v === 'number' && Math.abs(v - 20.5) < 1e-9), JSON.stringify(x1));
  docx = await exportTo('[data-act=rpWord]', '.docx'); xml = await (await JSZip.loadAsync(fs.readFileSync(docx))).file('word/document.xml').async('string');
  ok('Word danh sách xe: tiêu đề và biển số', /BÁO CÁO DANH SÁCH XE VẬN CHUYỂN THEO LÔ RỪNG/.test(xml) && /92C-67890/.test(xml));
  ok('không có lỗi JavaScript', errs.length === 0, errs.join('|'));
  await app.close(); console.log(fail ? 'CÓ ' + fail + ' LỖI' : 'TẤT CẢ ĐẠT'); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
