'use strict';
/* Đóng ứng dụng khi lô còn thay đổi chưa lưu (Electron thật): Quay lại chỉnh sửa (cửa sổ còn, bản nháp còn), Lưu và đóng (dữ liệu có sau khi mở lại),
 * Bỏ thay đổi và đóng (không có gì được ghi). Câu trả lời của hộp thoại đặt sẵn bằng HAKQN_CLOSE (đổi lúc chạy).
 * Chạy: xvfb-run -a node scripts/e2e-dongapp.js */
const {_electron: electron} = require('playwright-core');
const path = require('path'), fs = require('fs'), os = require('os');
const src = fs.readFileSync(path.join(__dirname, 'e2e-inan2.js'), 'utf8');
const {lot, seed} = new Function(src.slice(src.indexOf('const nv ='), src.indexOf('const plain =')) + '; return {lot, seed};')();
const root = path.join(__dirname, '..');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hakqn-da-'));
let fail = 0; const ok = (name, cond, extra) => { console.log((cond ? 'ĐẠT  ' : 'LỖI  ') + name + (!cond && extra ? ' — ' + extra : '')); if (!cond) fail++; };
const launch = close => electron.launch({executablePath: require('electron'), args: [root, '--no-sandbox'], env: {...process.env, HAKQN_CLOSE: close, HAKQN_DB: path.join(dir, 'd.sqlite'), HAKQN_USERDATA: path.join(dir, 'ud'), ELECTRON_DISABLE_SECURITY_WARNINGS: '1'}});
const draft = async (w, ten, cccd) => {
  await w.click('[data-open=own1]'); await w.click('[data-tab=rung]'); await w.click('[data-forest=fa]'); await w.click('[data-ftab=nc]'); await w.click('[data-act=stAdd][data-kind=nc]'); await w.waitForSelector('#stForm');
  const set = async (k, v) => { const sel = await w.$('#stForm select[name=' + k + ']'); if (sel) await w.selectOption('#stForm select[name=' + k + ']', v); else await w.fill('#stForm input[name=' + k + ']', v); };
  for (const [k, v] of Object.entries({vaiTro: 'Công nhân', danhXung: 'Ông', ten, ngaySinh: '01/01/1990', cccd, ngayCap: '01/01/2021', noiCap: 'CA', diaChi: 'Đà Nẵng', chucDanh: 'Công nhân khai thác'})) await set(k, v);
  await w.click('#stForm [type=submit]'); await w.waitForSelector('#stDirty');
};
const names = async w => (await w.evaluate(() => window.hak.loadSync().db)).rs.own1.forests.fa.nc.map(r => r.ten);
(async () => {
  let app = await launch('back'), w = await app.firstWindow(); const errs = []; w.on('pageerror', e => errs.push(e.message)); w.on('dialog', d => d.accept()); await w.waitForSelector('#side');
  await w.evaluate(d => window.hak.save(d), seed([lot('fa', 'R-A', {exp: {}, pc: []})])); await w.reload(); await w.waitForSelector('#side');
  const base = (await names(w)).length;
  await draft(w, 'NGUYỄN QUAY LẠI', '049090000031');
  await app.evaluate(({BrowserWindow}) => BrowserWindow.getAllWindows()[0].close()); await w.waitForTimeout(1200);
  ok('Quay lại chỉnh sửa: đóng cửa sổ khi còn bản nháp thì cửa sổ vẫn còn, bản nháp còn nguyên, chưa ghi gì', (await app.windows()).length === 1 && !!(await w.$('#stDirty')) && /NGUYỄN QUAY LẠI/.test(await w.innerText('#main')) && (await names(w)).length === base);
  await app.evaluate(() => { process.env.HAKQN_CLOSE = 'discard'; }); await app.evaluate(({BrowserWindow}) => BrowserWindow.getAllWindows()[0].close()).catch(() => {}); await new Promise(r => setTimeout(r, 2000));
  let exited = false; try { await w.evaluate(() => 1); } catch (e) { exited = true; }
  ok('Bỏ thay đổi và đóng: ứng dụng đóng', exited);
  app = await launch('discard'); w = await app.firstWindow(); await w.waitForSelector('#side');
  ok('mở lại: không có nhân công NGUYỄN QUAY LẠI (bản nháp bị bỏ, không ghi gì)', !(await names(w)).includes('NGUYỄN QUAY LẠI') && (await names(w)).length === base);
  await draft(w, 'TRẦN LƯU RỒI ĐÓNG', '049090000032');
  await app.evaluate(() => { process.env.HAKQN_CLOSE = 'save'; }); await app.evaluate(({BrowserWindow}) => BrowserWindow.getAllWindows()[0].close()).catch(() => {}); await new Promise(r => setTimeout(r, 2500));
  exited = false; try { await w.evaluate(() => 1); } catch (e) { exited = true; }
  ok('Lưu và đóng: lưu bản nháp rồi đóng ứng dụng', exited);
  app = await launch('discard'); w = await app.firstWindow(); await w.waitForSelector('#side');
  ok('mở lại: nhân công TRẦN LƯU RỒI ĐÓNG đã được lưu', (await names(w)).includes('TRẦN LƯU RỒI ĐÓNG') && (await names(w)).length === base + 1);
  ok('không có lỗi JavaScript', errs.length === 0, errs.join('|'));
  await app.close(); console.log(fail ? 'CÓ ' + fail + ' LỖI' : 'TẤT CẢ ĐẠT'); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
