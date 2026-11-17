'use strict';
/* Danh mục người lao động dùng chung (theo CCCD): thêm nhân công chọn người đã có ở lô khác, điền sẵn thông tin; mỗi lô chụp lại, không sửa ngược lô nguồn (Electron thật, SQLite thật).
 * Chạy: xvfb-run -a node scripts/e2e-nguoi-danhmuc.js */
const {_electron: electron} = require('playwright-core');
const path = require('path'), fs = require('fs'), os = require('os');
const src = fs.readFileSync(path.join(__dirname, 'e2e-inan2.js'), 'utf8');
const {nv, lot, seed} = new Function(src.slice(src.indexOf('const nv ='), src.indexOf('const plain =')) + '; return {nv, lot, seed};')();
const root = path.join(__dirname, '..');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hakqn-ngdm-'));
let fail = 0; const ok = (name, cond, extra) => { console.log((cond ? 'ĐẠT  ' : 'LỖI  ') + name + (!cond && extra ? ' — ' + extra : '')); if (!cond) fail++; };
(async () => {
  const app = await electron.launch({executablePath: require('electron'), args: [root, '--no-sandbox'], env: {...process.env, HAKQN_CLOSE: 'discard', HAKQN_DB: path.join(dir, 'd.sqlite'), HAKQN_USERDATA: path.join(dir, 'ud'), HAKQN_DOWNLOAD_DIR: path.join(dir, 'out')}});
  const w = require('./_hd30').boc(await app.firstWindow()); const errs = []; w.on('pageerror', e => errs.push(e.message)); w.on('dialog', d => d.accept()); await w.waitForSelector('#side');
  const A = lot('fa', 'R-A', {exp: {}, kl: null, pc: [], nc: [nv(1, 'Tổ trưởng', 'TRẦN CŨ', 'Tổ trưởng', '049085007001'), nv(2, 'Công nhân', 'LÊ THỢ CƯA', 'Công nhân khai thác', '049085007002')]});
  const B = lot('fb', 'R-B', {exp: {}, kl: null, pc: [], nc: [nv(1, 'Tổ trưởng', 'TỔ TRƯỞNG B', 'Tổ trưởng', '049085007009')]});
  B.nc = B.nc.map(r => ({...r, maRung: 'R-B'})); B.dx = B.dx.map(r => ({...r, maRung: 'R-B'}));
  await w.evaluate(d => window.hak.save(d), seed([A, B])); await w.reload(); await w.waitForSelector('#side');
  const db = async () => (await w.evaluate(() => window.hak.loadSync().db)).rs.own1.forests;
  const open = async (id, ftab) => { await w.click('[data-open=own1]'); await w.click('[data-tab=rung]'); await w.click('[data-forest=' + id + ']'); await w.click('[data-ftab=' + ftab + ']'); await w.waitForTimeout(300); };
  await open('fb', 'nc'); await w.click('[data-act=stAdd][data-kind=nc]'); await w.waitForSelector('#stForm');
  const opts = await w.$$eval('#ncDm option', o => o.map(x => x.textContent.trim()));
  ok('form thêm nhân công có ô “Chọn người đã có”: người của lô khác (TRẦN CŨ, LÊ THỢ CƯA), không có người đã ở lô này', opts.some(x => /TRẦN CŨ/.test(x)) && opts.some(x => /LÊ THỢ CƯA/.test(x)) && !opts.some(x => /TỔ TRƯỞNG B/.test(x)), opts.join('|'));
  await w.selectOption('#ncDm', '049085007002'); await w.waitForTimeout(300);
  const v = await w.$eval('#stForm', f => ({ten: f.ten.value, cccd: f.cccd.value, ngaySinh: f.ngaySinh.value, ngayCap: f.ngayCap.value, noiCap: f.noiCap.value, diaChi: f.diaChi.value, chucDanh: f.chucDanh.value, vaiTro: f.vaiTro.value}));
  ok('chọn người: điền sẵn họ tên, CCCD, ngày sinh, ngày cấp, nơi cấp, địa chỉ', v.ten === 'LÊ THỢ CƯA' && v.cccd === '049085007002' && v.ngaySinh === '01/01/1985' && v.ngayCap === '01/01/2021' && v.noiCap === 'CA' && v.diaChi === 'Đà Nẵng', JSON.stringify(v));
  await w.selectOption('#stForm [name=vaiTro]', 'Công nhân'); await w.selectOption('#stForm [name=chucDanh]', 'Công nhân khai thác'); await w.click('#stForm button[type=submit]'); await w.waitForTimeout(500);
  await w.click('button[data-act=stSave]'); await w.waitForTimeout(500); const F = await db(), p = F.fb.nc.find(r => r.cccd === '049085007002');
  ok('lưu: người được chụp vào lô B với đầy đủ thông tin', !!p && p.ten === 'LÊ THỢ CƯA' && p.ngaySinh === '01/01/1985' && p.noiCap === 'CA', JSON.stringify(p));
  ok('lô nguồn A không bị đổi', F.fa.nc.length === 2 && F.fa.nc.every(r => r.ten === 'TRẦN CŨ' || r.ten === 'LÊ THỢ CƯA'));
  await w.click('[data-act=stAdd][data-kind=nc]'); await w.waitForSelector('#stForm');
  const opts2 = await w.$$eval('#ncDm option', o => o.map(x => x.textContent.trim()));
  ok('sau khi thêm, người đó không còn trong danh sách chọn của lô B (tránh trùng CCCD)', !opts2.some(x => /LÊ THỢ CƯA/.test(x)) && opts2.some(x => /TRẦN CŨ/.test(x)), opts2.join('|'));
  ok('không có lỗi script trên màn hình', errs.length === 0, errs.join(' | '));
  await app.close(); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
