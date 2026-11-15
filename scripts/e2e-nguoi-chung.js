'use strict';
/* Người chung (bản 2.2): một CCCD một người dù là lao động, tài xế hay đối tác; gõ CCCD nhận ra người đã có và điền sẵn; gộp hai người (Electron thật, SQLite thật).
 * Chạy: xvfb-run -a node scripts/e2e-nguoi-chung.js */
const {_electron: electron} = require('playwright-core');
const path = require('path'), fs = require('fs'), os = require('os');
const src = fs.readFileSync(path.join(__dirname, 'e2e-inan2.js'), 'utf8');
const {lot, seed} = new Function(src.slice(src.indexOf('const nv ='), src.indexOf('const plain =')) + '; return {lot, seed};')();
const root = path.join(__dirname, '..');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hakqn-nc-'));
let fail = 0; const ok = (name, cond, extra) => { console.log((cond ? 'ĐẠT  ' : 'LỖI  ') + name + (!cond && extra ? ' — ' + extra : '')); if (!cond) fail++; };
(async () => {
  const app = await electron.launch({executablePath: require('electron'), args: [root, '--no-sandbox'], env: {...process.env, HAKQN_CLOSE: 'discard', HAKQN_DB: path.join(dir, 'd.sqlite'), HAKQN_USERDATA: path.join(dir, 'ud'), HAKQN_DOWNLOAD_DIR: path.join(dir, 'out')}});
  const w = await app.firstWindow(); const errs = []; w.on('pageerror', e => errs.push(e.message)); w.on('dialog', d => d.accept()); await w.waitForSelector('#side');
  const D = seed([lot('fa', 'R-A', {exp: {}, kl: null, pc: []})]);
  D.dmLaoDong = [{ngayCapNhat: '01/10/2026', cccd: '049085007001', ten: 'NGUYỄN VĂN AN', gioiTinh: 'Nam', ngaySinh: '05/05/1985', diaChi: 'Quế Sơn', ngayCap: '01/01/2021', noiCap: 'CA QUẢNG NAM', sdt: '0905111222', chucVu: 'Công nhân', viTri: 'Công nhân cưa'},
    {ngayCapNhat: '01/09/2026', cccd: '049085007002', ten: 'NGUYEN VAN AN (gõ sai CCCD)', diaChi: 'Quế Sơn', chucVu: 'Công nhân', viTri: 'Công nhân cưa'}];
  D.dmXeVC = []; D.dmDoiTac = [];
  await w.evaluate(d => window.hak.save(d), D); await w.reload(); await w.waitForSelector('#side');
  await w.click('#navDm'); await w.click('[data-dmtab=nguoi]'); await w.waitForSelector('#dmNguoiTbl');
  ok('tab Người (chung) liệt kê 2 người, vai trò Lao động', (await w.$$('#dmNguoiTbl tbody tr')).length === 2 && /Lao động/.test(await w.innerText('#dmNguoiTbl')));
  // gõ CCCD ở form Xe: nhận ra người, điền sẵn tài xế
  await w.click('[data-dmtab=xe]'); await w.waitForSelector('#dmXeForm');
  await w.fill('#dmXeForm [name=cccdTx]', '049085007001'); await w.dispatchEvent('#dmXeForm [name=cccdTx]', 'change'); await w.waitForTimeout(300);
  const v = await w.$eval('#dmXeForm', f => ({tx: f.taiXe.value, dc: f.diaChiTx.value, nc: f.noiCapTx.value, ngc: f.ngayCapTx.value}));
  ok('gõ CCCD tài xế đã có ở danh mục Lao động: điền sẵn tên, thường trú, ngày cấp, nơi cấp', v.tx === 'NGUYỄN VĂN AN' && v.dc === 'Quế Sơn' && v.ngc === '01/01/2021' && v.nc === 'CA QUẢNG NAM', JSON.stringify(v));
  ok('có thông báo nhận ra người', /Đã nhận ra/.test(await w.innerText('#dmXeForm')));
  await w.fill('#dmXeForm [name=ngayCapNhat]', '01/11/2026'); await w.fill('#dmXeForm [name=bienSo]', '92C-777.88'); await w.fill('#dmXeForm [name=chuXe]', 'CHỦ XE');
  await w.evaluate(() => document.getElementById('dmXeForm').requestSubmit()); await w.waitForTimeout(400);
  await w.click('[data-dmtab=nguoi]'); await w.waitForSelector('#dmNguoiTbl');
  ok('người đó giờ có 2 vai trò (Lao động, Tài xế), vẫn là một dòng', (await w.$$('#dmNguoiTbl tbody tr')).length === 2 && /Tài xế/.test(await w.innerText('#dmNguoiTbl')));
  // gộp hai người: 007002 (gõ sai) vào 007001
  await w.click('[data-dmgop="049085007002"]'); await w.waitForSelector('#dmGopForm');
  await w.selectOption('#dmGopForm [name=den]', '049085007001'); await w.evaluate(() => document.getElementById('dmGopForm').requestSubmit()); await w.waitForTimeout(500);
  ok('gộp xong: còn 1 người', (await w.$$('#dmNguoiTbl tbody tr')).length === 1);
  const d = await w.evaluate(() => window.hak.loadSync().db);
  ok('SQLite: mọi dòng lao động mang CCCD đúng, lịch sử giữ đủ 2 dòng', (d.dmLaoDong || []).length === 2 && d.dmLaoDong.every(r => r.cccd === '049085007001'), JSON.stringify(d.dmLaoDong.map(r => r.cccd)));
  ok('không có lỗi script trên màn hình', errs.length === 0, errs.join(' | '));
  await app.close(); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
