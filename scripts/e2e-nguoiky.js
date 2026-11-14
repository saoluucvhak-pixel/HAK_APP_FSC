'use strict';
/* Hai người ký hợp đồng vận chuyển không được bị gộp thành MỘT hợp đồng (Electron thật, SQLite thật, dữ liệu giả lập):
 * - hai xe, hai họ tên khác nhau, cùng số CCCD: báo lỗi nêu rõ hai dòng; không xuất hồ sơ; thêm xe như vậy trong bản nháp thì không lưu được
 * - cùng một người (cùng CCCD, cùng họ tên) ký cho hai xe: một hợp đồng (đúng)
 * - hai CCCD khác nhau: hai hợp đồng
 * Chạy: xvfb-run -a node scripts/e2e-nguoiky.js */
const {_electron: electron} = require('playwright-core');
const path = require('path'), fs = require('fs'), os = require('os'); const JSZip = require('jszip');
const {saveStage} = require('./lib-stage');
const src = fs.readFileSync(path.join(__dirname, 'e2e-inan2.js'), 'utf8');
const {xe, lot, seed, EXP1} = new Function(src.slice(src.indexOf('const nv ='), src.indexOf('const plain =')) + '; return {xe, lot, seed, EXP1};')();
const root = path.join(__dirname, '..');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hakqn-nk-')), out = path.join(dir, 'out'); fs.mkdirSync(out);
let fail = 0; const ok = (name, cond, extra) => { console.log((cond ? 'ĐẠT  ' : 'LỖI  ') + name + (!cond && extra ? ' — ' + extra : '')); if (!cond) fail++; };
(async () => {
  const app = await electron.launch({executablePath: require('electron'), args: [root, '--no-sandbox'], env: {...process.env, HAKQN_CLOSE: 'discard', HAKQN_DB: path.join(dir, 'n.sqlite'), HAKQN_USERDATA: path.join(dir, 'ud'), HAKQN_DOWNLOAD_DIR: out, ELECTRON_DISABLE_SECURITY_WARNINGS: '1'}});
  const w = await app.firstWindow(); const errs = []; w.on('pageerror', e => errs.push(e.message)); w.on('dialog', d => d.accept()); await w.waitForSelector('#side');
  const mk = (id, ma, dx) => { const l = lot(id, ma, {exp: {...EXP1}, pc: [], dx}); l.dx = l.dx.map(r => ({...r, maRung: ma})); l.nc = l.nc.map(r => ({...r, maRung: ma})); return l; };
  const A = mk('fa', 'R-A', [xe('92C-1', '049000000077', 'NGUYỄN VĂN A'), xe('92C-2', '049000000077', 'TRẦN VĂN B')]);   // cùng CCCD, khác tên
  const B = mk('fb', 'R-B', [xe('92C-3', '049000000077', 'NGUYỄN VĂN A'), xe('92C-4', '049000000077', 'NGUYỄN VĂN A')]);   // cùng một người
  const C = mk('fc', 'R-C', [xe('92C-5', '049000000077', 'NGUYỄN VĂN A'), xe('92C-6', '049000000078', 'TRẦN VĂN B')]);   // hai người
  await w.evaluate(d => window.hak.save(d), seed([A, B, C])); await w.reload(); await w.waitForSelector('#side');
  const openLot = async (fid, tab = 'dx') => { await w.reload(); await w.waitForSelector('#side'); await w.click('[data-open=own1]'); await w.click('[data-tab=rung]'); await w.click('[data-forest=' + fid + ']'); await w.click('[data-ftab=' + tab + ']'); await w.waitForTimeout(300); };
  const download = async () => { for (const f of fs.readdirSync(out)) fs.unlinkSync(path.join(out, f)); await w.click('[data-ftab=xuat]'); await w.click('[data-xtab=all]'); await w.waitForSelector('#d2Table'); await w.waitForTimeout(300); const b = await w.$('button[data-act=dl][data-kind=all]:not([disabled])'); if (!b) return null; await b.click(); let z = null; for (let i = 0; i < 100 && !z; i++) { z = fs.readdirSync(out).find(x => x.endsWith('.zip')); await w.waitForTimeout(200); } await w.waitForTimeout(500); return z ? Object.keys((await JSZip.loadAsync(fs.readFileSync(path.join(out, z)))).files).filter(n => /^04_.*\.docx$/.test(n)) : null; };
  await openLot('fa'); let t = await w.innerText('#main');
  ok('hai người ký khác tên, cùng CCCD: báo lỗi nêu CCCD, hai họ tên và hai dòng', /CCCD 049000000077/.test(t) && /NGUYỄN VĂN A/.test(t) && /TRẦN VĂN B/.test(t) && /MỘT hợp đồng/.test(t), t.slice(0, 200));
  ok('lô đó không xuất được hồ sơ khi còn lỗi người ký (không âm thầm ra 1 hợp đồng)', (await download()) === null);
  await openLot('fb'); ok('một người ký cho hai xe (cùng CCCD, cùng họ tên): không báo lỗi', !/trùng nhau nhưng khác họ tên/.test(await w.innerText('#main')));
  let f = await download(); ok('một người ký hai xe: đúng 1 hợp đồng vận chuyển', f && f.length === 1, JSON.stringify(f));
  await openLot('fc'); f = await download(); ok('hai người ký khác CCCD: 2 hợp đồng vận chuyển', f && f.length === 2, JSON.stringify(f));
  // thêm xe thứ hai cùng CCCD khác tên vào bản nháp: không lưu được
  await openLot('fc'); await w.click('[data-act=stAdd][data-kind=dx]'); await w.waitForSelector('#stForm');
  const set = async (k, v) => { const sel = await w.$('#stForm select[name=' + k + ']'); if (sel) await w.selectOption('#stForm select[name=' + k + ']', v); else await w.fill('#stForm input[name=' + k + ']', v); };
  for (const [k, v] of Object.entries({bienSo: '92C-7', chuXe: 'LÊ VĂN C', ngaySinh: '01/01/1980', cccd: '049000000077', ngayCap: '01/01/2021', noiCap: 'CA', diaChi: 'Đà Nẵng', sdt: '0905123456', nguoiKy: 'Chủ xe', loaiXe: 'Xe tải'})) await set(k, v);
  await w.click('#stForm [type=submit]'); await w.waitForTimeout(300);
  const r = await saveStage(w); const saved = (await w.evaluate(() => window.hak.loadSync().db)).rs.own1.forests.fc.dx.length;
  ok('thêm xe mới có CCCD trùng người khác tên: không lưu được, nêu rõ lý do, dữ liệu đã lưu giữ nguyên (2 xe)', r && r.ok === false && saved === 2 && /trùng nhau nhưng khác họ tên/.test(await w.innerText('body')), JSON.stringify(r));
  ok('không có lỗi JavaScript', errs.length === 0, errs.join('|'));
  await app.close(); console.log(fail ? 'CÓ ' + fail + ' LỖI' : 'TẤT CẢ ĐẠT'); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
