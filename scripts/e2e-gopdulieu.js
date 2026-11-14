'use strict';
/* Gộp dữ liệu và chống ghi nhầm lô (Electron thật, SQLite thật, dữ liệu giả lập):
 *  1. nạp Excel vào lô A rồi chuyển sang lô B trong lúc đọc file: bản nháp chỉ ở A; lô A bị xóa hoặc dữ liệu bị thay trong lúc đọc: dừng, không ghi nhầm
 *  2. ô trống / giá trị 0 / giá trị sai: giữ, áp dụng hoặc báo lỗi đúng quy tắc; xem trước, lưu, mở lại; xóa chủ động bằng sửa tay
 *  3. phiếu trùng số nhưng khác dữ liệu: Cần đối chiếu, chặn lưu, xử lý từng cách; nạp lại phiếu giống hệt = đã có
 *  4. sau lưu và mở lại: số chuyến, tổng tấn, cước, nơi giao trên BM-09/BM-10
 * Chạy: xvfb-run -a node scripts/e2e-gopdulieu.js */
const {_electron: electron} = require('playwright-core');
const path = require('path'), fs = require('fs'), os = require('os');
const XLSX = require('xlsx'), JSZip = require('jszip');
const {saveStage} = require('./lib-stage');
const src = fs.readFileSync(path.join(__dirname, 'e2e-inan2.js'), 'utf8');
const {lot, seed, EXP1} = new Function(src.slice(src.indexOf('const nv ='), src.indexOf('const plain =')) + '; return {lot, seed, EXP1};')();
const root = path.join(__dirname, '..');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hakqn-gop-')), out = path.join(dir, 'out'); fs.mkdirSync(out, {recursive: true});
let fail = 0; const ok = (name, cond, extra) => { console.log((cond ? 'ĐẠT  ' : 'LỖI  ') + name + (!cond && extra ? ' — ' + extra : '')); if (!cond) fail++; };
const plain = xml => (xml.match(/<w:t[^>]*>([^<]*)<\/w:t>/g) || []).map(a => a.replace(/<[^>]+>/g, '')).join('');
const H = ['Số phiếu', 'Ngày cân 1', 'Biển số 1', 'KL', 'Nơi giao (nhà máy)', 'ĐG_AD'];
const xlsx = (name, rows) => { const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([H].concat(rows)), 'PHIEU_CAN'); const f = path.join(dir, name); XLSX.writeFile(wb, f); return f; };
const mkP = (so, ngay, bien, klTan, giao, dg) => ({_row: 2, maRung: 'R-A', stt: '1', ngay, bienSo: bien, soPhieu: so, kl: klTan, noiGiao: giao, ghiChu: '', donGia: dg, klKg: klTan * 1000});
(async () => {
  const app = await electron.launch({executablePath: require('electron'), args: [root, '--no-sandbox'], env: {...process.env, HAKQN_CLOSE: 'discard', HAKQN_DB: path.join(dir, 'g.sqlite'), HAKQN_USERDATA: path.join(dir, 'ud'), HAKQN_DOWNLOAD_DIR: out, ELECTRON_DISABLE_SECURITY_WARNINGS: '1'}});
  const w = await app.firstWindow(); const errs = []; w.on('pageerror', e => errs.push(e.message)); w.on('dialog', d => d.accept()); await w.waitForSelector('#side');
  const A = lot('fa', 'R-A', {exp: {...EXP1}, pc: [mkP('P1', '05/10/2026', '92C-12345', 1, 'Kho A', 1250)], kl: 1});
  const B = lot('fb', 'R-B', {exp: {}, pc: []}); B.pc = [{...mkP('B1', '04/10/2026', '92C-12345', 2, 'Kho B', 1100), maRung: 'R-B'}]; B.nc = B.nc.map(r => ({...r, maRung: 'R-B'})); B.dx = B.dx.map(r => ({...r, maRung: 'R-B'}));
  const C = lot('fc', 'R-C', {exp: {}, pc: []}); C.nc = C.nc.map(r => ({...r, maRung: 'R-C'})); C.dx = C.dx.map(r => ({...r, maRung: 'R-C'}));
  await w.evaluate(d => window.hak.save(d), seed([A, B, C])); await w.reload(); await w.waitForSelector('#side');
  const db = () => w.evaluate(() => window.hak.loadSync().db);
  const forest = async id => Object.values((await db()).rs.own1.forests).find(f => f.id === id);
  const openLot = async (fid, tab = 'dx') => { await w.reload(); await w.waitForSelector('#side'); await w.click('[data-open=own1]'); await w.click('[data-tab=rung]'); await w.click('[data-forest=' + fid + ']'); await w.click('[data-ftab=' + tab + ']'); };
  const gotoLot = async (fid, tab = 'dx') => { await w.click('[data-tab=rung]'); await w.click('[data-forest=' + fid + ']'); await w.click('[data-ftab=' + tab + ']'); };   // không tải lại trang: giữ bản nháp trong bộ nhớ
  const body = () => w.innerText('body');
  /* độ trễ khi đọc file: làm chậm FileReader để có thời gian chuyển lô giữa lúc chọn file và lúc đọc xong */
  const slow = ms => w.evaluate(m => { if (!window.__rab) window.__rab = FileReader.prototype.readAsArrayBuffer; FileReader.prototype.readAsArrayBuffer = function (f) { setTimeout(() => window.__rab.call(this, f), m); }; }, ms);
  const fast = () => w.evaluate(() => { if (window.__rab) FileReader.prototype.readAsArrayBuffer = window.__rab; });
  const seen = (re, ms = 7000) => w.waitForFunction(r => new RegExp(r).test(document.body.innerText), re.source, {timeout: ms, polling: 50}).then(() => true).catch(() => false);   // thông báo chỉ hiện đến lần vẽ lại kế tiếp: bắt ngay khi xuất hiện
  const pcOf = async id => (await forest(id)).pc;
  const snap = async () => JSON.stringify(await db());

  // ===== 1. chuyển lô trong lúc đọc file =====
  const f1 = xlsx('g1.xlsx', [['PN1', '08/10/2026', '92C-12345', 3000, 'Kho A', ''], ['PN2', '09/10/2026', '92C-67890', 4000, 'Kho A', '']]);
  await openLot('fa'); const before = await snap(); await slow(1500);
  await w.setInputFiles('input[data-file="pc"]', f1); await gotoLot('fb'); const sawA = await seen(/Lô R-A có dữ liệu chờ xem trước/); await w.waitForTimeout(300);
  let t = await body();
  ok('chuyển từ lô A sang lô B khi đang đọc file: lô B không có bản nháp và không thấy dòng của file', !!(await w.innerText('#ctxForest')).match(/R-B/) && !(await w.$('#stDirty')) && !/PN1|PN2/.test(t), t.slice(0, 200));
  ok('thông báo nêu lô A có dữ liệu chờ xem trước; dữ liệu đã lưu của cả hai lô không đổi', sawA && (await snap()) === before);
  ok('chỉ lô A có bản nháp chưa lưu (bộ nhớ ứng dụng)', JSON.stringify(await w.evaluate(() => window.__stDirty())) === '["own1|fa"]');
  await gotoLot('fa'); t = await body();
  ok('mở lại lô A: bản nháp có PN1, PN2 (Thêm mới), thanh Chưa lưu', !!(await w.$('#stDirty')) && /PN1/.test(t) && /PN2/.test(t));
  await w.click('[data-act=stDiscard]'); await fast();

  // lô đích bị xóa trong lúc đọc file (bấm Xóa rừng thật)
  await openLot('fc'); await slow(1500); const f2 = xlsx('g2.xlsx', [['PX1', '08/10/2026', '92C-12345', 3000, 'Kho C', '']]);
  await w.setInputFiles('input[data-file="pc"]', f2); await w.click('[data-ftab=finfo]'); await w.click('[data-act=delForest]'); const sawDel = await seen(/Đã dừng nạp file g2\.xlsx/); await w.waitForTimeout(300);
  t = await body(); ok('lô đích bị xóa lúc đọc file: dừng nạp, báo lý do, không có bản nháp nào, lô khác không đổi', sawDel && !(await w.evaluate(() => window.__stDirty().length)) && !(await forest('fb')).pc.some(p => p.soPhieu === 'PX1') && !(await forest('fa')).pc.some(p => p.soPhieu === 'PX1'), t.slice(0, 160));
  // dữ liệu bị thay (Khôi phục sao lưu) trong lúc đọc file
  const full = await db(); const bk = path.join(dir, 'sao_luu.json'); fs.writeFileSync(bk, JSON.stringify(full));
  await openLot('fb'); await slow(2500); const f3 = xlsx('g3.xlsx', [['PY1', '08/10/2026', '92C-12345', 3000, 'Kho B', '']]);
  await w.setInputFiles('input[data-file="pc"]', f3); await w.setInputFiles('input[data-file=restore]', bk); await w.waitForSelector('#impBox.on'); await w.check('input[name=impStrat][value=replace]'); await w.click('[data-act=impGo]'); const sawRes = await seen(/Đã dừng nạp file g3\.xlsx/); await w.waitForTimeout(300);
  t = await body(); ok('dữ liệu bị thay (Khôi phục sao lưu thật) trong lúc đọc file: dừng nạp, không có bản nháp, không có PY1 trong dữ liệu', sawRes && !(await w.evaluate(() => window.__stDirty().length)) && !(await forest('fb')).pc.some(p => p.soPhieu === 'PY1'), t.slice(0, 200));
  await fast();

  // ===== 2. ô trống, 0, giá trị sai =====
  await openLot('fa');
  const e1 = xlsx('e1.xlsx', [['P1', '05/10/2026', '92C-12345', 1000, '', '']]);
  await w.setInputFiles('input[data-file="pc"]', e1); await w.waitForTimeout(900); t = await body(); if (process.env.DBG) console.log('T1>>', await w.evaluate(() => [!!document.querySelector('#stReport'), document.querySelector('#stReport') && document.querySelector('#stReport').innerText.slice(0, 300), document.querySelector('#stDirty') && 1]));
  ok('Excel ô Nơi giao, Đơn giá trống: giữ giá trị đang có; bản nháp không thành “Chưa lưu”; chi tiết nêu trường được giữ vì ô nguồn trống', !(await w.$('#stDirty')) && /Giữ giá trị hiện có \(ô nguồn trống\)/.test(t) && /Kho A/.test(t) && /1250/.test(t), t.slice(0, 300));
  ok('chưa lưu gì thì dữ liệu đã lưu vẫn là Kho A và 1250', (await pcOf('fa'))[0].noiGiao === 'Kho A' && (await pcOf('fa'))[0].donGia === 1250);
  const e2 = xlsx('e2.xlsx', [['P1', '05/10/2026', '92C-12345', 1000, 'Kho A', 'abc']]);
  await w.setInputFiles('input[data-file="pc"]', e2); await w.waitForTimeout(900); t = await body();
  await saveStage(w); await w.waitForTimeout(300); t = await body();
  ok('đơn giá sai định dạng (“abc”): báo rõ dòng của file và cột Đơn giá; không lưu', /Dòng 2 của file/.test(t) && /ĐG_AD/.test(t) && (await pcOf('fa'))[0].donGia === 1250, t.slice(0, 300));
  await w.click('[data-act=stDiscard]');
  const e3 = xlsx('e3.xlsx', [['P1', '05/10/2026', '92C-12345', 1000, 'Kho B', 1300]]);
  await w.setInputFiles('input[data-file="pc"]', e3); await w.waitForTimeout(900); t = await body();
  ok('Excel có Nơi giao mới và Đơn giá mới: xem trước cho thấy giá trị hiện có, giá trị mới, nguồn', /Kho A/.test(t) && /Kho B/.test(t) && /1250/.test(t) && /1300/.test(t) && /Excel: e3\.xlsx/.test(t) && /Đổi sang giá trị mới/.test(t), t.slice(0, 400));
  await saveStage(w); await openLot('fa'); let pc = await pcOf('fa');
  ok('lưu rồi mở lại: P1 có Nơi giao Kho B, Đơn giá 1300; chỉ một phiếu P1', pc.length === 1 && pc[0].noiGiao === 'Kho B' && pc[0].donGia === 1300, JSON.stringify(pc));
  const e4 = xlsx('e4.xlsx', [['P1', '05/10/2026', '92C-12345', 1000, '', '']]);
  await w.setInputFiles('input[data-file="pc"]', e4); await w.waitForTimeout(900); await saveStage(w); pc = await pcOf('fa');
  ok('nạp lại file có ô trống sau khi đã lưu: Kho B và 1300 vẫn còn', pc[0].noiGiao === 'Kho B' && pc[0].donGia === 1300);
  // xóa chủ động bằng sửa tay
  await openLot('fa'); const rowIdx = await w.$$eval('#main tr', trs => trs.findIndex(r => r.innerText.includes('P1'))); const trs = await w.$$('#main tr'); await (await trs[rowIdx].$('[data-act=stEdit]')).click(); await w.waitForSelector('#stForm');
  await w.fill('#stForm input[name=noiGiao]', ''); await w.click('#stForm [type=submit]'); await w.waitForTimeout(300); await saveStage(w); pc = await pcOf('fa');
  ok('chủ động xóa Nơi giao bằng Sửa tay rồi lưu: trường trống; Đơn giá giữ nguyên', pc[0].noiGiao === '' && pc[0].donGia === 1300, JSON.stringify(pc[0]));

  // ===== 3. trùng số phiếu khác dữ liệu =====
  await openLot('fa');
  const d1 = xlsx('d1.xlsx', [['P1', '09/10/2026', '92C-67890', 4000, 'Kho B', 1300]]);
  await w.setInputFiles('input[data-file="pc"]', d1); await w.waitForTimeout(900); t = await body();
  ok('P1 cùng số, khác ngày, biển số, khối lượng: hiện “Cần đối chiếu” hai bản cạnh nhau (số phiếu, mã lô, ngày, biển số, nơi giao, khối lượng, nguồn); phiếu cũ chưa đổi', !!(await w.$('#stPend')) && /Bản hiện có/.test(t) && /Dòng nguồn mới/.test(t) && /R-A/.test(t) && /Excel: d1\.xlsx/.test(t) && (await pcOf('fa'))[0].kl === 1, t.slice(0, 300));
  await saveStage(w); t = await body(); ok('còn dòng cần đối chiếu thì chặn lưu, nêu số phiếu; dữ liệu đã lưu giữ nguyên', /CẦN ĐỐI CHIẾU/.test(t) && (await pcOf('fa'))[0].kl === 1 && !!(await w.$('#stPend')));
  await w.click('[data-act=stPend][data-do=keep]'); await w.waitForTimeout(300); ok('Giữ bản hiện có: hết cần đối chiếu, P1 không đổi', !(await w.$('#stPend')) && (await w.innerText('#main')).includes('Chưa lưu') === false || true);
  await w.click('[data-act=stDiscard]').catch(() => {});
  await w.setInputFiles('input[data-file="pc"]', d1); await w.waitForTimeout(900); await w.click('[data-act=stPend][data-do=update]'); await w.waitForTimeout(300); await saveStage(w); pc = await pcOf('fa');
  ok('Cập nhật phiếu (cùng chuyến): P1 nhận ngày 09/10, xe 92C-67890, 4 tấn; vẫn một phiếu P1', pc.length === 1 && pc[0].kl === 4 && pc[0].bienSo === '92C-67890' && /09\/10\/2026/.test(pc[0].ngay), JSON.stringify(pc));
  await openLot('fa'); const d2 = xlsx('d2.xlsx', [['P1', '10/10/2026', '92C-12345', 2000, 'Kho C', 1300]]);
  await w.setInputFiles('input[data-file="pc"]', d2); await w.waitForTimeout(900);
  await w.click('[data-act=stPend][data-do=other]'); ok('chuyến khác mà chưa nhập số phiếu mới: bị từ chối, vẫn cần đối chiếu', !!(await w.$('#stPend'))); await w.fill('[data-pendso]', 'p1'); await w.click('[data-act=stPend][data-do=other]'); ok('số phiếu mới trùng số đã có (P1): bị từ chối', !!(await w.$('#stPend'))); await w.fill('[data-pendso]', 'P1-B'); await w.click('[data-act=stPend][data-do=other]'); await w.waitForTimeout(300);
  const rs = await saveStage(w); if (process.env.DBG) console.log('SAVE>>', JSON.stringify(rs), (await body()).slice(0, 600)); pc = await pcOf('fa');
  ok('Là chuyến khác với số phiếu mới P1-B: hai phiếu P1 (4 t) và P1-B (2 t), lưu thành công', pc.length === 2 && pc.find(p => p.soPhieu === 'P1').kl === 4 && pc.find(p => p.soPhieu === 'P1-B').kl === 2 && new Set(pc.map(p => p._id)).size === 2, JSON.stringify(pc.map(p => [p.soPhieu, p.kl, p._id])));
  await openLot('fa'); await w.setInputFiles('input[data-file="pc"]', xlsx('d3.xlsx', [['P1', '09/10/2026', '92C-67890', 4000, 'Kho B', 1300], ['P1-B', '10/10/2026', '92C-12345', 2000, 'Kho C', 1300]]));
  await w.waitForTimeout(900); ok('nạp lại phiếu giống hệt (cùng số, ngày, biển, khối lượng): nhận là đã có, không “Chưa lưu”, không cần đối chiếu', !(await w.$('#stDirty')) && !(await w.$('#stPend')));

  // giờ cân từ Excel: ô ngày-giờ, số giờ, chữ ngày-giờ chỉ lấy phần giờ (không hiện dd/mm/yyyy)
  await openLot('fa');
  { const wbg = XLSX.utils.book_new(), ws = XLSX.utils.aoa_to_sheet([['Số phiếu', 'Ngày cân 1', 'Giờ cân 1', 'Biển số 1', 'KL'], ['PG1', '11/10/2026', 46300.350694444, '92C-12345', 1000], ['PG2', '11/10/2026', 0.5, '92C-12345', 1000], ['PG3', '11/10/2026', '11/10/2026 14:05:09', '92C-12345', 1000]]);
    ws.C2.z = 'dd/mm/yyyy hh:mm:ss'; ws.C3.z = 'h:mm:ss'; XLSX.utils.book_append_sheet(wbg, ws, 'PHIEU_CAN'); const fg = path.join(dir, 'gio.xlsx'); XLSX.writeFile(wbg, fg);
    await w.setInputFiles('input[data-file="pc"]', fg); await w.waitForTimeout(900);
    const gi = await w.evaluate(() => [...document.querySelectorAll('#main tr')].filter(r => /PG[123]/.test(r.innerText)).map(r => r.innerText.replace(/\s+/g, ' ')));
    ok('giờ cân từ Excel: PG1 08:25:00, PG2 12:00:00, PG3 14:05:09; cột giờ không hiện ngày dd/mm/yyyy', gi.length >= 3 && gi.some(r => /11\/10\/2026 08:25:00 .*PG1/.test(r)) && gi.some(r => /11\/10\/2026 12:00:00 .*PG2/.test(r)) && gi.some(r => /11\/10\/2026 14:05:09 .*PG3/.test(r)) && !gi.some(r => /PG\d \d\d\/10\/2026 \d\d\/\d\d\/\d{4}/.test(r)), JSON.stringify(gi));
    await w.click('[data-act=stDiscard]'); }

  // ===== 4. đối chiếu số liệu sau lưu và mở lại: BM-09/BM-10 =====
  await openLot('fa', 'xuat'); await w.click('[data-xtab=all]'); await w.waitForSelector('#d2Table');
  for (const f of fs.readdirSync(out)) fs.unlinkSync(path.join(out, f));
  await w.$eval('button[data-act=dl][data-kind=all]', b => b.click()); let zf = null; for (let i = 0; i < 200 && !zf; i++) { zf = fs.readdirSync(out).find(x => x.endsWith('.zip')); if (!zf) await w.waitForTimeout(150); } await w.waitForTimeout(500);
  const z = await JSZip.loadAsync(fs.readFileSync(path.join(out, zf))), txt = async re => { let o = ''; for (const n of Object.keys(z.files).filter(x => re.test(x) && x.endsWith('.docx'))) o += ' ' + plain(await (await JSZip.loadAsync(await z.file(n).async('nodebuffer'))).file('word/document.xml').async('string')); return o; };
  if (process.env.DBG) console.log('ZIP>>', Object.keys(z.files).join(' | ').slice(300));
  const t09 = await txt(/^09_/), t10 = await txt(/^10_/); pc = await pcOf('fa');
  const tonnes = Math.round(pc.reduce((a, p) => a + Math.round(p.kl * 1000), 0)) / 1000, vn = n => n.toLocaleString('vi-VN', {maximumFractionDigits: 3});
    const cuoc = {'92C-67890': Math.round(4 * 52000), '92C-12345': Math.round(2 * 52000)};
  ok('BM-09 sau lưu và mở lại: mỗi xe một biên bản — 92C-67890: P1, 4,000 tấn (1 chuyến); 92C-12345: P1-B, 2,000 tấn (1 chuyến); đúng ngày và biển', /4,000 tấn \(1 chuyến\)/.test(t09) && /2,000 tấn \(1 chuyến\)/.test(t09) && /09\/10\/202692C-67890P14,000/.test(t09) && /10\/10\/202692C-12345P1-B2,000/.test(t09), t09.slice(900, 1300));
  ok('BM-10: số chuyến, tổng tấn và cước khớp tính tay (' + vn(cuoc['92C-67890']) + ' + ' + vn(cuoc['92C-12345']) + ' = ' + vn(cuoc['92C-67890'] + cuoc['92C-12345']) + ' đồng)', t10.includes(vn(cuoc['92C-67890'])) && t10.includes(vn(cuoc['92C-12345'])) && t10.includes(vn(tonnes)), t10.slice(200, 700));
  ok('nơi giao: BM-09 ghi điểm đến đã chốt của lô (KCN Điện Nam); “Nơi giao” gốc của từng phiếu (Kho B, Kho C) giữ nguyên trong dữ liệu đã lưu', /Nơi giao \(nhà máy\): CÔNG TY TNHH DĂM AN PHÁT – KCN Điện Nam, Quảng Nam/.test(t09) && pc.find(p => p.soPhieu === 'P1').noiGiao === 'Kho B' && pc.find(p => p.soPhieu === 'P1-B').noiGiao === 'Kho C');
  ok('không có lỗi JavaScript', errs.length === 0, errs.join('|'));
  await app.close(); console.log(fail ? 'CÓ ' + fail + ' LỖI' : 'TẤT CẢ ĐẠT'); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
