'use strict';
/* Tự lưu bản nháp (bản 2.2): máy treo hoặc mất điện thì mở lại hỏi khôi phục; đóng có chủ ý (bỏ thay đổi) thì không giữ bản tạm (Electron thật, SQLite thật).
 * Chạy: xvfb-run -a node scripts/e2e-nhap-tam.js */
const {_electron: electron} = require('playwright-core');
const path = require('path'), fs = require('fs'), os = require('os');
const src = fs.readFileSync(path.join(__dirname, 'e2e-inan2.js'), 'utf8');
const {nv, lot, seed} = new Function(src.slice(src.indexOf('const nv ='), src.indexOf('const plain =')) + '; return {nv, lot, seed};')();
const root = path.join(__dirname, '..');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hakqn-nt-'));
let fail = 0; const ok = (name, cond, extra) => { console.log((cond ? 'ĐẠT  ' : 'LỖI  ') + name + (!cond && extra ? ' — ' + extra : '')); if (!cond) fail++; };
const launch = () => electron.launch({executablePath: require('electron'), args: [root, '--no-sandbox'], env: {...process.env, HAKQN_CLOSE: 'discard', HAKQN_DB: path.join(dir, 'd.sqlite'), HAKQN_USERDATA: path.join(dir, 'ud'), HAKQN_DOWNLOAD_DIR: path.join(dir, 'out')}});
const open = async w => { await w.click('[data-open=own1]'); await w.click('[data-tab=rung]'); await w.click('[data-forest=fa]'); await w.click('[data-ftab=finfo]'); await w.waitForTimeout(300); };
(async () => {
  let app = await launch(), w = await app.firstWindow(), msgs = []; const errs = []; w.on('pageerror', e => errs.push(e.message)); w.on('dialog', d => { msgs.push(d.message()); d.accept(); }); await w.waitForSelector('#side');
  const A = lot('fa', 'R-A', {exp: {}, kl: null, pc: [], nc: [nv(1, 'Tổ trưởng', 'TT A', 'Tổ trưởng', '049085007101')]});
  await w.evaluate(d => window.hak.save(d), seed([A])); await w.reload(); await w.waitForSelector('#side'); msgs.length = 0;
  await open(w);
  await w.evaluate(() => { const f = document.getElementById('forestForm'); f.elements.diaDiem.value = 'THÔN GÕ TẠM'; f.elements.diaDiem.dispatchEvent(new Event('change', {bubbles: true})); });
  await w.waitForTimeout(500); ok('sửa một ô: hiện thanh Chưa lưu', /Chưa lưu/.test(await w.innerText('#main')));
  await w.waitForTimeout(3800);
  ok('đã tự lưu bản tạm (localStorage)', await w.evaluate(() => !!localStorage.getItem('hakqn.nhapTam.v1')));
  await app.evaluate(({app: a}) => { setTimeout(() => a.exit(0), 50); }).catch(() => {}); await new Promise(r => setTimeout(r, 2500));   // mô phỏng mất điện / treo máy: thoát ngay, không qua đường đóng bình thường (chạy được cả Windows, không phụ thuộc tín hiệu kill)
  app = await launch(); w = await app.firstWindow(); msgs = []; w.on('pageerror', e => errs.push(e.message)); w.on('dialog', d => { msgs.push(d.message()); d.accept(); }); await w.waitForSelector('#side'); await w.waitForTimeout(1500);
  ok('mở lại: hỏi “Khôi phục thay đổi chưa lưu”, nêu mã lô', msgs.some(m => /chưa lưu/.test(m) && /R-A/.test(m)), msgs.join(' | '));
  const saved = (await w.evaluate(() => window.hak.loadSync().db)).rs.own1.forests.fa.info.diaDiem;
  ok('chưa ghi vào SQLite khi mới khôi phục (dữ liệu đã lưu giữ nguyên)', saved !== 'THÔN GÕ TẠM', saved);
  await open(w); ok('thay đổi được khôi phục vào ô và thanh Chưa lưu', (await w.inputValue('#forestForm [name=diaDiem]')) === 'THÔN GÕ TẠM' && /Chưa lưu/.test(await w.innerText('#main')));
  await w.click('button[data-act=stSave]'); await w.waitForTimeout(600);
  ok('bấm Lưu dữ liệu vào lô: ghi vào SQLite', (await w.evaluate(() => window.hak.loadSync().db)).rs.own1.forests.fa.info.diaDiem === 'THÔN GÕ TẠM');
  await w.waitForTimeout(3500); ok('sau khi lưu: bản tạm bị xóa', await w.evaluate(() => !localStorage.getItem('hakqn.nhapTam.v1')));
  // đóng có chủ ý (bỏ thay đổi): không giữ bản tạm
  await w.evaluate(() => { const f = document.getElementById('forestForm'); f.elements.diaDiem.value = 'SẼ BỎ'; f.elements.diaDiem.dispatchEvent(new Event('change', {bubbles: true})); }); await w.waitForTimeout(3800);
  ok('có bản tạm của thay đổi sắp bỏ', await w.evaluate(() => !!localStorage.getItem('hakqn.nhapTam.v1')));
  // hồi quy (CI Windows lượt 141): sau khi tiến trình chính xóa bản tạm lúc đóng, bộ hẹn giờ 1 giây của giao diện không được ghi lại bản tạm khi lô vẫn còn thay đổi chưa lưu
  await w.evaluate(() => window.__nhapTamXoa()); await w.waitForTimeout(2500);
  ok('đóng có chủ ý: bản tạm đã xóa không bị bộ hẹn giờ ghi lại dù lô còn thay đổi chưa lưu', await w.evaluate(() => !localStorage.getItem('hakqn.nhapTam.v1') && window.__stDirty().length > 0));
  await app.close(); app = await launch(); w = await app.firstWindow(); msgs = []; w.on('dialog', d => { msgs.push(d.message()); d.accept(); }); await w.waitForSelector('#side'); await w.waitForTimeout(1500);
  ok('đóng và chọn bỏ thay đổi: mở lại không hỏi khôi phục', !msgs.some(m => /chưa lưu/.test(m)), msgs.join(' | '));
  ok('không có lỗi script trên màn hình', errs.length === 0, errs.join(' | '));
  await app.close(); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
