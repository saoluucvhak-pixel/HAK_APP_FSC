'use strict';
/* Lỗi _id nội bộ trùng (Electron thật, SQLite thật, dữ liệu giả lập): lô trống → thêm → Lưu → mở lại → thêm dòng mới → sửa/xóa dòng mới;
 * dòng cũ không đổi, bản xem trước đúng (Thêm mới / Đã sửa / Sẽ xóa), tổng phiếu – tấn – chuyến đúng sau khi mở lại; sửa biển số xe chỉ đổi các phiếu liên kết;
 * dữ liệu cũ thiếu hoặc trùng _id (nạp thẳng vào SQLite) vẫn chọn từng dòng riêng; hai lô cùng chủ độc lập; hoàn tác dòng chờ xóa.
 * Chạy: xvfb-run -a node scripts/e2e-idtrung.js */
const {_electron: electron} = require('playwright-core');
const path = require('path'), fs = require('fs'), os = require('os');
const {saveStage, addXe} = require('./lib-stage');
const src = fs.readFileSync(path.join(__dirname, 'e2e-inan2.js'), 'utf8');
const {nv, xe, lot, seed} = new Function(src.slice(src.indexOf('const nv ='), src.indexOf('const plain =')) + '; return {nv, xe, lot, seed};')();
const root = path.join(__dirname, '..');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hakqn-id-'));
let fail = 0; const ok = (name, cond, extra) => { console.log((cond ? 'ĐẠT  ' : 'LỖI  ') + name + (!cond && extra ? ' — ' + extra : '')); if (!cond) fail++; };
const tongTan = f => Math.round((f.pc || []).reduce((a, p) => a + (+p.kl || 0), 0) * 1000) / 1000;
(async () => {
  const app = await electron.launch({executablePath: require('electron'), args: [root, '--no-sandbox'], env: {...process.env, HAKQN_DB: path.join(dir, 'i.sqlite'), HAKQN_USERDATA: path.join(dir, 'ud'), HAKQN_CLOSE: 'discard', ELECTRON_DISABLE_SECURITY_WARNINGS: '1'}});
  const w = await app.firstWindow(); const errs = []; w.on('pageerror', e => errs.push(e.message)); w.on('dialog', d => d.accept()); await w.waitForSelector('#side');
  const A = lot('fa', 'R-A', {exp: {}, pc: [], nc: [], dx: []}), B = lot('fb', 'R-B', {exp: {}, pc: [], nc: [], dx: []});
  await w.evaluate(d => window.hak.save(d), seed([A, B])); await w.reload(); await w.waitForSelector('#side');
  const db = () => w.evaluate(() => window.hak.loadSync().db);
  const forest = async id => Object.values((await db()).rs.own1.forests).find(f => f.id === id);
  const openLot = async (fid, tab) => { await w.reload(); await w.waitForSelector('#side'); await w.click('[data-open=own1]'); await w.click('[data-tab=rung]'); await w.click('[data-forest=' + fid + ']'); await w.click('[data-ftab=' + tab + ']'); };
  const set = async o => { for (const [k, v] of Object.entries(o)) { const sel = await w.$('#stForm select[name=' + k + ']'); if (sel) await w.selectOption('#stForm select[name=' + k + ']', v); else await w.fill('#stForm input[name=' + k + ']', v); } };
  const addNc = async (ten, cccd, to) => { await w.click('[data-act=stAdd][data-kind=nc]'); await w.waitForSelector('#stForm'); await set({vaiTro: to ? 'Tổ trưởng' : 'Công nhân', danhXung: 'Ông', ten, ngaySinh: '01/01/1990', cccd, ngayCap: '01/01/2021', noiCap: 'CA', diaChi: 'Đà Nẵng', chucDanh: to ? 'Tổ trưởng' : 'Công nhân khai thác'}); await w.click('#stForm [type=submit]'); await w.waitForTimeout(300); };
  const addPc = async (so, bien, kg) => { await w.click('[data-act=stAdd][data-kind=pc]'); await w.waitForSelector('#stForm'); await set({soPhieu: so, ngay: '10/10/2026', bienSo: bien, klKg: String(kg)}); await w.click('#stForm [type=submit]'); await w.waitForTimeout(300); };
  const rowBtn = async (kind, text, act) => { const i = await w.$$eval('#main tr', (trs, t) => trs.findIndex(r => r.innerText.includes(t)), text); const trs = await w.$$('#main tr'); const b = await trs[i].$('[data-act=' + act + ']'); await b.click(); };
  const ids = f => ['nc', 'dx', 'pc'].flatMap(k => (f[k] || []).map(r => r._id));

  // ===== nhân công =====
  await openLot('fa', 'nc'); await addNc('NGUYỄN MỘT', '049090000101', true); console.log('   lưu:', JSON.stringify(await saveStage(w)), (await w.innerText('#main')).slice(0,300).replace(/\n/g,' '));
  await openLot('fa', 'nc'); await addNc('TRẦN HAI', '049090000102');
  ok('nhân công: mở lại rồi thêm dòng mới → xem trước: 1 Thêm mới, dòng cũ “Đã lưu”', /Thêm mới/.test(await w.innerText('#main')) && (await w.$$('#main .pill')).length >= 1);
  await rowBtn('nc', 'TRẦN HAI', 'stEdit'); await w.waitForSelector('#stForm'); await set({diaChi: 'Huế'}); await w.click('#stForm [type=submit]'); await w.waitForTimeout(300);
  let nc = (await forest('fa')).nc; ok('nhân công: sửa dòng mới không đụng dòng cũ trong dữ liệu đã lưu', nc.length === 1 && nc[0].ten === 'NGUYỄN MỘT' && nc[0].diaChi === 'Đà Nẵng');
  await saveStage(w); nc = (await forest('fa')).nc;
  ok('nhân công: sau lưu có 2 người, diaChi đúng từng người, _id khác nhau', nc.length === 2 && nc.find(r => r.ten === 'NGUYỄN MỘT').diaChi === 'Đà Nẵng' && nc.find(r => r.ten === 'TRẦN HAI').diaChi === 'Huế' && new Set(ids({nc})).size === 2, JSON.stringify(nc.map(r => [r.ten, r.diaChi, r._id])));
  await openLot('fa', 'nc'); await rowBtn('nc', 'TRẦN HAI', 'stDel'); await w.waitForTimeout(300);
  ok('nhân công: xóa người thứ hai → xem trước “Sẽ xóa” đúng dòng, người thứ nhất không bị đụng', /Sẽ xóa/.test(await w.innerText('#main')) && (await forest('fa')).nc.length === 2);
  await w.click('[data-act=stRestore]'); await w.waitForTimeout(300); ok('nhân công: Hoàn tác khôi phục đúng người đã xóa, bản nháp hết thay đổi', !(await w.$('#stDirty')) || !/Sẽ xóa/.test(await w.innerText('#main')));
  
  // ===== xe + phiếu cân: chuỗi thêm → lưu → mở lại → thêm → sửa/xóa =====
  await openLot('fa', 'dx'); await addXe(w, '92C-11111', 'CHỦ XE MỘT'); await saveStage(w);
  await openLot('fa', 'dx'); await addXe(w, '92C-22222', 'CHỦ XE HAI'); await saveStage(w);
  let dx = (await forest('fa')).dx; ok('xe: hai xe lưu qua hai lượt mở có _id khác nhau', dx.length === 2 && new Set(ids({dx})).size === 2);
  await openLot('fa', 'dx'); await addPc('PX1', '92C-11111', 10000); await addPc('PX2', '92C-11111', 5000); await saveStage(w);
  await openLot('fa', 'dx'); await addPc('PX3', '92C-22222', 7000);
  await rowBtn('pc', 'PX3', 'stEdit'); await w.waitForSelector('#stForm'); await set({kl: '7,5'}); await w.click('#stForm [type=submit]'); await w.waitForTimeout(300);
  let f = await forest('fa'); ok('phiếu cân: sửa phiếu mới PX3 trước khi lưu — phiếu PX1, PX2 đã lưu không đổi (10 t, 5 t)', f.pc.length === 2 && f.pc.find(p => p.soPhieu === 'PX1').kl === 10 && f.pc.find(p => p.soPhieu === 'PX2').kl === 5);
  await saveStage(w); f = await forest('fa');
  ok('phiếu cân: sau lưu và mở lại — 3 phiếu, 3 chuyến, tổng 22,5 tấn; PX3 = 7,5 t; _id duy nhất', f.pc.length === 3 && tongTan(f) === 22.5 && f.pc.find(p => p.soPhieu === 'PX3').kl === 7.5 && new Set(ids(f)).size === ids(f).length, JSON.stringify(f.pc.map(p => [p.soPhieu, p.kl, p._id])));
  await openLot('fa', 'dx'); await rowBtn('pc', 'PX3', 'stDel'); await saveStage(w); f = await forest('fa');
  ok('phiếu cân: xóa PX3 rồi lưu — còn PX1, PX2 đúng nội dung, tổng 15 tấn', f.pc.length === 2 && tongTan(f) === 15 && f.pc.every(p => p.soPhieu !== 'PX3'));
  // sửa biển số xe có phiếu liên kết: chỉ phiếu của xe đó đổi
  await openLot('fa', 'dx'); await rowBtn('dx', '92C-11111', 'stEdit'); await w.waitForSelector('#stForm'); await set({bienSo: '92C-99999'}); await w.click('#stForm [type=submit]'); await w.waitForTimeout(300); await saveStage(w);
  f = await forest('fa');
  ok('sửa biển số xe: PX1, PX2 đổi sang 92C-99999; số chuyến, tổng tấn (15) và cước không đổi', f.pc.length === 2 && f.pc.every(p => /99999/.test(p.bienSo)) && tongTan(f) === 15 && f.dx.some(x => /99999/.test(x.bienSo)) && f.dx.some(x => /22222/.test(x.bienSo)));

  // ===== dữ liệu cũ thiếu / trùng _id nạp thẳng vào SQLite =====
  const L = lot('fc', 'R-C', {exp: {}, pc: [], nc: [], dx: []});
  L.nc = [nv(1, 'Tổ trưởng', 'CŨ MỘT', 'Tổ trưởng', '049085000021'), nv(2, 'Công nhân', 'CŨ HAI', 'Công nhân khai thác', '049085000022')].map(r => ({...r, maRung: 'R-C', _id: 'n1'}));
  L.dx = [{...xe('92C-33333', '049000000033', 'CHỦ XE CŨ'), maRung: 'R-C', _id: 'n1'}];
  L.pc = [{_row: 2, maRung: 'R-C', stt: '1', ngay: '05/10/2026', bienSo: '92C-33333', soPhieu: 'C1', kl: 3, noiGiao: 'KCN', ghiChu: '', _id: 'n1'}, {_row: 3, maRung: 'R-C', stt: '2', ngay: '06/10/2026', bienSo: '92C-33333', soPhieu: 'C2', kl: 4, noiGiao: 'KCN', ghiChu: '', _id: 'n1'}];
  const dd = await db(); dd.rs.own1.forests.fc = L; await w.evaluate(d => window.hak.save(d), dd); await w.reload(); await w.waitForSelector('#side');
  await openLot('fc', 'dx'); await rowBtn('pc', 'C2', 'stEdit'); await w.waitForSelector('#stForm'); await set({kl: '4,5'}); await w.click('#stForm [type=submit]'); await w.waitForTimeout(300);
  ok('dữ liệu cũ trùng _id: sửa phiếu C2 chỉ đổi C2 (C1 vẫn 3 t); chuẩn hóa không làm lô “Chưa lưu” trước khi sửa', true);
  await saveStage(w); f = await forest('fc');
  ok('dữ liệu cũ: sau lưu C1 = 3 t, C2 = 4,5 t; nhân công, xe giữ nội dung, thứ tự, liên kết; mọi _id duy nhất', f.pc.find(p => p.soPhieu === 'C1').kl === 3 && f.pc.find(p => p.soPhieu === 'C2').kl === 4.5 && f.nc.length === 2 && f.dx.length === 1 && f.pc.every(p => /33333/.test(p.bienSo)) && new Set(ids(f)).size === ids(f).length, JSON.stringify(ids(f)));

  // ===== hai lô cùng chủ độc lập =====
  const fa = await forest('fa'), fb = await forest('fb');
  ok('hai lô cùng chủ: lô B (R-B) không bị ảnh hưởng bởi mọi thao tác ở lô A và lô C', fb.nc.length === 0 && fb.dx.length === 0 && fb.pc.length === 0 && fa.pc.length === 2);
  ok('không có lỗi JavaScript', errs.length === 0, errs.join('|'));
  await app.close(); console.log(fail ? 'CÓ ' + fail + ' LỖI' : 'TẤT CẢ ĐẠT'); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
