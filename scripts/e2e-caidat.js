'use strict';
/* Cài đặt hệ thống (Electron thật): đổi thư mục sao lưu và thư mục dữ liệu, dữ liệu không mất, nhớ qua lần mở lại.
 * Chạy: xvfb-run -a node scripts/e2e-caidat.js */
const {_electron: electron} = require('playwright-core');
const path = require('path'), fs = require('fs'), os = require('os');
const root = path.join(__dirname, '..');
const base = fs.mkdtempSync(path.join(os.tmpdir(), 'hakqn-cd-')), ud = path.join(base, 'ud'), bk = path.join(base, 'saoluu'), dd = path.join(base, 'dulieu');
fs.mkdirSync(bk); fs.mkdirSync(dd);
let fail = 0; const ok = (name, cond, extra) => { console.log((cond ? 'ĐẠT  ' : 'LỖI  ') + name + (!cond && extra ? ' — ' + extra : '')); if (!cond) fail++; };
const launch = env => electron.launch({executablePath: require('electron'), args: [root, '--no-sandbox'], env: {...process.env, HAKQN_USERDATA: ud, ...env}});
(async () => {
  let app = await launch({HAKQN_PICK_DIR: bk}); let w = await app.firstWindow(); const errs = []; w.on('pageerror', e => errs.push(e.message)); w.on('dialog', d => d.accept()); await w.waitForSelector('#side');
  await w.click('text=+ Chủ rừng mới'); await w.fill('#infoForm [name="ma"]', 'CR-CD'); await w.fill('#infoForm [name="ten"]', 'NGUYỄN CÀI ĐẶT'); for (const [k, v] of Object.entries({cccd: '049067005459', ngayCap: '15/08/2021', noiCap: 'CA', diaChi: 'Đà Nẵng'})) await w.fill(`#infoForm [name="${k}"]`, v); await w.selectOption('#infoForm [name="danhXung"]', 'Ông'); await w.click('#infoForm button[type=submit]'); await w.waitForTimeout(1500);
  await w.click('#moreMenu summary'); await w.click('#openSettingsBtn'); await w.waitForSelector('#setBox [data-set-path]');
  let t = await w.innerText('#main');
  ok('mặc định: hiện đường dẫn dữ liệu và sao lưu, nhãn “mặc định”', /hakqn\.sqlite/.test(t) && (t.match(/mặc định/g) || []).length >= 2, t.slice(0, 300));
  await w.click('[data-act=setBackup]'); await w.waitForSelector('#setMsg');
  ok('đổi thư mục sao lưu: báo thành công, nhãn “thư mục riêng”', /đổi thư mục sao lưu/.test(await w.innerText('#setMsg')) && /thư mục riêng/.test(await w.innerText('#main')));
  await w.click('#moreMenu summary'); await w.click('[data-act=backup]'); await w.waitForTimeout(800);
  const bfiles = fs.readdirSync(bk);
  ok('sao lưu toàn bộ lưu thẳng vào thư mục đã chọn (.json và .sqlite), không hỏi lại', bfiles.some(f => f.endsWith('.json')) && bfiles.some(f => f.endsWith('.sqlite')), bfiles.join(','));
  const sr = await w.evaluate(() => window.hak.settings.get());
  ok('sao lưu toàn bộ ghi nhận ngày sao lưu cuối; chưa đến hạn nhắc', !!sr.settings.remind.lastBackup && sr.settings.remind.due === false, JSON.stringify(sr.settings.remind));
  const r0 = await w.evaluate(() => window.hak.settings.setRemind(30));
  ok('đổi mức nhắc sao lưu được lưu', r0.ok && r0.settings.remind.remindDays === 30);
  // đổi thư mục dữ liệu
  await app.close(); app = await launch({HAKQN_PICK_DIR: dd}); w = await app.firstWindow(); w.on('dialog', d => d.accept()); await w.waitForSelector('#side');
  ok('mở lại: dữ liệu và thư mục sao lưu được nhớ', /CÀI ĐẶT/i.test(await w.innerText('#sideList')));
  await w.click('#moreMenu summary'); await w.click('#openSettingsBtn'); await w.waitForSelector('#setBox [data-set-path]');
  await w.click('[data-act=setData]'); await w.waitForFunction(() => /Đã chuyển dữ liệu/.test((document.querySelector('#main') || {}).innerText || ''), null, {timeout: 25000}); await w.waitForSelector('#side');
  const t2 = await w.innerText('#main');
  ok('đổi thư mục dữ liệu: file mới có trong thư mục đã chọn, bản cũ còn nguyên', fs.existsSync(path.join(dd, 'hakqn.sqlite')) && fs.existsSync(path.join(ud, 'hakqn.sqlite')));
  ok('sau khi đổi: thông báo nêu vị trí mới và bản cũ', /Đã chuyển dữ liệu/.test(t2) && t2.includes(dd), t2.slice(0, 300));
  await w.click('[data-act=goHome]').catch(() => {});
  ok('dữ liệu chủ rừng còn nguyên sau khi đổi thư mục', /CÀI ĐẶT/i.test(await w.innerText('#sideList')));
  await app.close();
  app = await launch({HAKQN_PICK_CHOICE: 'overwrite'}); w = await app.firstWindow(); w.on('pageerror', e => errs.push(e.message)); await w.waitForSelector('#side');
  ok('mở lại lần nữa: vẫn dùng thư mục dữ liệu mới và còn dữ liệu', /CÀI ĐẶT/i.test(await w.innerText('#sideList')));
  const st = await w.evaluate(() => window.hak.settings.get());
  ok('cài đặt báo đúng đường dẫn', st.settings.dbFile === path.join(dd, 'hakqn.sqlite') && st.settings.backupDir === bk && st.settings.customData && st.settings.customBackup, JSON.stringify(st.settings));
  const rb = await w.evaluate(() => window.hak.settings.setBackup(true));
  ok('về thư mục sao lưu mặc định (cạnh file dữ liệu)', rb.ok && !rb.settings.customBackup && rb.settings.backupDir === path.join(dd, 'backups'), JSON.stringify(rb));
  const rd = await w.evaluate(() => window.hak.settings.setData(true));   // về mặc định: thư mục mặc định đã có dữ liệu cũ → ghi đè (đã chọn 'overwrite')
  await w.waitForSelector('#side');
  ok('về thư mục dữ liệu mặc định: thành công, bản có sẵn được lưu lại trước khi ghi đè', rd.ok && rd.choice === 'overwrite' && !rd.settings.customData && fs.readdirSync(path.join(dd, 'backups')).some(f => /^truoc-ghi-de-/.test(f)), JSON.stringify(rd));
  ok('dữ liệu vẫn còn sau khi về mặc định', /CÀI ĐẶT/i.test(await w.innerText('#sideList')));
  await app.close(); ok('không có lỗi JavaScript', errs.length === 0, errs.join('|'));
  console.log(fail ? 'CÓ ' + fail + ' LỖI' : 'TẤT CẢ ĐẠT'); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
