'use strict';
/* Định mức gỗ keo (tấn/ha) có hiệu lực từ ngày làm mặc định cho rừng; nút lấy ngày cân nhỏ nhất / lớn nhất và tổng khối lượng từ phiếu cân (Electron thật, dữ liệu giả lập).
 * Chạy: xvfb-run -a node scripts/e2e-keo.js */
const {_electron: electron} = require('playwright-core');
const path = require('path'), fs = require('fs'), os = require('os');
const src = fs.readFileSync(path.join(__dirname, 'e2e-inan2.js'), 'utf8');
const {lot, seed, PC} = new Function(src.slice(src.indexOf('const nv ='), src.indexOf('const plain =')) + '; return {lot, seed, PC};')();
const root = path.join(__dirname, '..');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hakqn-keo-'));
let fail = 0; const ok = (name, cond, extra) => { console.log((cond ? 'ĐẠT  ' : 'LỖI  ') + name + (!cond && extra ? ' — ' + extra : '')); if (!cond) fail++; };
(async () => {
  const app = await electron.launch({executablePath: require('electron'), args: [root, '--no-sandbox'], env: {...process.env, HAKQN_CLOSE: 'discard', HAKQN_DB: path.join(dir, 'k.sqlite'), HAKQN_USERDATA: path.join(dir, 'ud'), ELECTRON_DISABLE_SECURITY_WARNINGS: '1'}});
  const w = await app.firstWindow(); const errs = []; w.on('pageerror', e => errs.push(e.message)); w.on('dialog', d => d.accept()); await w.waitForSelector('#side');
  const A = lot('fa', 'R-A', {exp: {}, pc: PC}), B = lot('fb', 'R-B', {exp: {}, pc: []});
  for (const L of [A, B]) { L.info.dinhMucTanHa = null; L.info.tuNgay = '01/10/2026'; L.info.denNgay = ''; L.info.khoiLuong = null; L.info.dienTich = 2; }
  B.nc = A.nc.map(r => ({...r, maRung: 'R-B'})); B.dx = A.dx.map(r => ({...r, maRung: 'R-B'}));
  await w.evaluate(d => window.hak.save(d), seed([A, B])); await w.reload(); await w.waitForSelector('#side');
  const db = () => w.evaluate(() => window.hak.loadSync().db);
  const toForest = async fid => { await w.click('[data-open=own1]').catch(() => {}); await w.click('[data-tab=rung]'); await w.click('[data-forest=' + fid + ']'); await w.click('[data-ftab=finfo]'); await w.waitForSelector('#forestForm'); };
  // 1. khai định mức gỗ keo trong màn Định mức
  await w.evaluate(() => document.querySelector('[data-act=openNorm]').click()); await w.waitForSelector('#keoForm');
  ok('màn Định mức có mục “Định mức gỗ keo: 1 ha = ? tấn” với ô hiệu lực từ ngày', !!(await w.$('#keoForm input[name=k_tu]')) && /1 ha = \? tấn/.test(await w.innerText('#main')));
  const fillNew = async (tu, tan) => { const r = await w.$('#keoForm tr[data-keo=new]'); await (await r.$('[name=k_tu]')).fill(tu); await (await r.$('[name=k_tan]')).fill(tan); await w.click('#keoForm button[type=submit]'); await w.waitForTimeout(500); };
  await fillNew('01/01/2025', '80'); await w.evaluate(() => document.querySelector('[data-act=openNorm]').click()); await w.waitForSelector('#keoForm');
  await fillNew('01/07/2026', '95,5'); let d = await db();
  ok('lưu hai định mức gỗ keo: 80 từ 01/01/2025 và 95,5 từ 01/07/2026', JSON.stringify(d.dinhMucKeo) === JSON.stringify([{tuNgay: '01/01/2025', tanHa: 80}, {tuNgay: '01/07/2026', tanHa: 95.5}]), JSON.stringify(d.dinhMucKeo));
  await w.evaluate(() => document.querySelector('[data-act=openNorm]').click()); await w.waitForSelector('#keoForm'); await fillNew('31/02/2026', '70');
  ok('ngày không có thật: từ chối, không ghi', /Chưa lưu định mức gỗ keo/.test(await w.innerText('#main')) && (await db()).dinhMucKeo.length === 2);
  // 2. rừng lấy định mức mặc định theo ngày bắt đầu khai thác
  await w.reload(); await w.waitForSelector('#side'); await toForest('fa');
  ok('rừng bắt đầu 01/10/2026: định mức mặc định 95,5 tấn/ha (gợi ý trong ô), sản lượng dự kiến 191 tấn', /mặc định 95,5 tấn\/ha/.test(await w.getAttribute('#forestForm [name=dinhMucTanHa]', 'placeholder')) && (await w.inputValue('#slDuKien')) === '191 tấn' && /Đang dùng định mức gỗ keo mặc định/.test(await w.innerText('#dmNote')), await w.inputValue('#slDuKien'));
  await w.fill('#forestForm [name=tuNgay]', '01/05/2026'); await w.waitForTimeout(200);
  await w.fill('#forestForm [name=dienTich]', '2'); await w.waitForTimeout(200);
  ok('sản lượng dự kiến theo định mức hiệu lực tại ngày bắt đầu mới', (await w.inputValue('#slDuKien')) === '160 tấn', await w.inputValue('#slDuKien'));
  // 3. tự điền định mức riêng của rừng
  await w.fill('#forestForm [name=dinhMucTanHa]', '100'); await w.waitForTimeout(200);
  ok('tự điền 100 tấn/ha: sản lượng dự kiến 200 tấn', (await w.inputValue('#slDuKien')) === '200 tấn');
  await w.click('#forestForm button[type=submit]'); await w.waitForTimeout(600); d = await db();
  ok('lưu định mức riêng của rừng (100) và ngày bắt đầu mới', d.rs.own1.forests.fa.info.dinhMucTanHa === 100 && d.rs.own1.forests.fa.info.tuNgay === '01/05/2026');
  await toForest('fa'); await w.click('[data-act=dmDefault]'); await w.waitForTimeout(200);
  ok('nút “Dùng mặc định”: xóa số riêng, sản lượng dự kiến theo mặc định (160 tấn)', (await w.inputValue('#forestForm [name=dinhMucTanHa]')) === '' && (await w.inputValue('#slDuKien')) === '160 tấn', await w.inputValue('#slDuKien'));
  // 4. nút lấy từ phiếu cân
  await w.click('[data-act=fillTu]'); await w.click('[data-act=fillDen]'); await w.click('[data-act=fillKl]');
  ok('nút lấy ngày cân nhỏ nhất, lớn nhất và tổng khối lượng từ phiếu cân (05/10/2026, 07/10/2026, 29,75)', (await w.inputValue('#forestForm [name=tuNgay]')) === '05/10/2026' && (await w.inputValue('#forestForm [name=denNgay]')) === '07/10/2026' && (await w.inputValue('#forestForm [name=khoiLuong]')) === '29,75');
  await w.fill('#forestForm [name=khoiLuong]', '30'); await w.click('#forestForm button[type=submit]'); await w.waitForTimeout(600); d = await db(); const ia = d.rs.own1.forests.fa.info;
  ok('vẫn tự sửa được số rồi lưu: từ ngày, đến ngày từ phiếu cân; khối lượng tự điền 30; định mức mặc định (rừng không lưu số riêng)', ia.tuNgay === '05/10/2026' && ia.denNgay === '07/10/2026' && ia.khoiLuong === 30 && (ia.dinhMucTanHa == null), JSON.stringify([ia.tuNgay, ia.denNgay, ia.khoiLuong, ia.dinhMucTanHa]));
  // 5. rừng chưa có phiếu cân: báo rõ
  await toForest('fb'); await w.click('[data-act=fillTu]'); await w.click('[data-act=fillKl]');
  ok('rừng chưa có phiếu cân: nút báo rõ, không điền gì', /Chưa có phiếu cân/.test(await w.innerText('#forestHint')) && (await w.inputValue('#forestForm [name=khoiLuong]')) === '');
  ok('không có lỗi JavaScript', errs.length === 0, errs.join('|'));
  await app.close(); console.log(fail ? 'CÓ ' + fail + ' LỖI' : 'TẤT CẢ ĐẠT'); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
