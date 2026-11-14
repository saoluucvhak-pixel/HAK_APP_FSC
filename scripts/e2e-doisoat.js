'use strict';
/* Đối soát số liệu với bảng tính tay ĐỘC LẬP (Electron thật, dữ liệu giả lập): hai lô A và B cùng chủ, hai bên vận chuyển, phiếu trong và ngoài kỳ, số lẻ nhiều chữ số.
 * Mỗi con số mong đợi được cộng tay ngay trong file này (đơn vị tấn; mỗi phiếu làm tròn đến kg như biểu mẫu), rồi so với Tổng quan, báo cáo cha–con và Sổ phiếu cân (xem trước và Excel).
 * Chạy: xvfb-run -a node scripts/e2e-doisoat.js */
const {_electron: electron} = require('playwright-core');
const path = require('path'), fs = require('fs'), os = require('os');
const XLSX = require('xlsx');
const src = fs.readFileSync(path.join(__dirname, 'e2e-inan2.js'), 'utf8');
const {nv, xe, lot, seed} = new Function(src.slice(src.indexOf('const nv ='), src.indexOf('const plain =')) + '; return {nv, xe, lot, seed};')();
const root = path.join(__dirname, '..');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hakqn-ds-')), out = path.join(dir, 'out');
let fail = 0; const ok = (name, cond, extra) => { console.log((cond ? 'ĐẠT  ' : 'LỖI  ') + name + (!cond && extra ? ' — ' + extra : '')); if (!cond) fail++; };
const clearOut = () => { fs.mkdirSync(out, {recursive: true}); for (const f of fs.readdirSync(out)) fs.unlinkSync(path.join(out, f)); };
const P = (maRung, stt, ngay, bien, so, kl) => ({_row: stt + 1, maRung, stt: String(stt), ngay, bienSo: bien, soPhieu: so, kl, noiGiao: 'KCN Điện Nam, Quảng Nam', ghiChu: ''});

/* ===== BẢNG TÍNH TAY (nguồn chân lý của kiểm thử) ===== */
const A_PC = [['05/10/2026', '92C-12345', 'A1', 12.5], ['06/10/2026', '92C-67890', 'A2', 9.25], ['07/10/2026', '92C-12345', 'A3', 8], ['08/10/2026', '92C-12345', 'A4', 3.33333], ['09/10/2026', '92C-67890', 'A5', 3.33333], ['05/09/2026', '92C-12345', 'A6', 10]];   // A6: ngoài kỳ (tháng 9)
const B_PC = [['04/10/2026', '92C-55555', 'B1', 15.32], ['05/10/2026', '92C-55555', 'B2', 7.005], ['06/09/2026', '92C-55555', 'B3', 3.333]];   // B3: ngoài kỳ
const kg = t => Math.round(t * 1000);                         // mỗi phiếu làm tròn đến kg
const sumT = list => list.reduce((s, p) => s + kg(p[3]), 0) / 1000;
const inOct = list => list.filter(p => /\/10\/2026$/.test(p[0]));
const EXP = {
  A_all: sumT(A_PC), B_all: sumT(B_PC), A_oct: sumT(inOct(A_PC)), B_oct: sumT(inOct(B_PC)),
  tripsAll: A_PC.length + B_PC.length, tripsOct: inOct(A_PC).length + inOct(B_PC).length
};
EXP.all = (kg(EXP.A_all * 1) + kg(EXP.B_all * 1)) / 1000; EXP.oct = (kg(EXP.A_oct) + kg(EXP.B_oct)) / 1000;
const close = (a, b) => typeof a === 'number' && Math.abs(a - b) < 1e-9;
const fmtVN = n => n.toLocaleString('vi-VN', {maximumFractionDigits: 3});

(async () => {
  console.log('   · bảng tính tay: A tất cả ' + EXP.A_all + ' t, B tất cả ' + EXP.B_all + ' t, cộng ' + EXP.all + ' t, ' + EXP.tripsAll + ' chuyến; kỳ tháng 10: A ' + EXP.A_oct + ' t, B ' + EXP.B_oct + ' t, cộng ' + EXP.oct + ' t, ' + EXP.tripsOct + ' chuyến');
  const app = await electron.launch({executablePath: require('electron'), args: [root, '--no-sandbox'], env: {...process.env, HAKQN_CLOSE: 'discard', HAKQN_DB: path.join(dir, 'd.sqlite'), HAKQN_USERDATA: path.join(dir, 'ud'), HAKQN_DOWNLOAD_DIR: out, ELECTRON_DISABLE_SECURITY_WARNINGS: '1'}});
  const w = await app.firstWindow(); const errs = []; w.on('pageerror', e => errs.push(e.message)); w.on('dialog', d => d.accept()); await w.waitForSelector('#side');
  const A = lot('fa', 'R-A', {exp: {}, pc: A_PC.map((r, i) => P('R-A', i + 1, r[0], r[1], r[2], r[3])), kl: 40});   // khối lượng thực tế nhập tay 40 t (lệch phiếu cân 46,416 t)
  const B = lot('fb', 'R-B', {exp: {}, pc: B_PC.map((r, i) => P('R-B', i + 1, r[0], r[1], r[2], r[3])), nc: [nv(1, 'Tổ trưởng', 'ĐỖ TỔ B', 'Tổ trưởng', '049085000011')].map(r => ({...r, maRung: 'R-B'})), dx: [{...xe('92C-55555', '049000000099', 'TRẦN CHỦ XE B'), maRung: 'R-B'}]});
  await w.evaluate(d => window.hak.save(d), seed([A, B])); await w.reload(); await w.waitForSelector('#side');

  // ===== Tổng quan =====
  await w.click('#navHome'); await w.waitForSelector('.kpi'); await w.waitForTimeout(500);
  const kpi = await w.$$eval('.kpi > div', d => d.map(x => x.innerText.replace(/\s+/g, ' ').trim()));
  const kpiOf = label => kpi.find(k => k.includes(label)) || '';
  ok('Tổng quan: khối lượng đã cân = ' + fmtVN(EXP.all) + ' tấn (cộng làm tròn từng phiếu đến kg), ' + EXP.tripsAll + ' chuyến', kpiOf('Khối lượng đã cân').startsWith(fmtVN(EXP.all) + ' ') && kpiOf('Số chuyến').startsWith(EXP.tripsAll + ' '), JSON.stringify(kpi));
  ok('Tổng quan: sản lượng dự kiến 2 lô × (2 ha × 80 t/ha) = 320 t; tỷ lệ đã cân/dự kiến = ' + (Math.round(EXP.all / 320 * 1000) / 10) + '%', /^320[,.]0 Sản lượng dự kiến/.test(kpiOf('Sản lượng dự kiến')) && kpiOf('Đã cân so với dự kiến').startsWith(fmtVN(Math.round(EXP.all / 320 * 1000) / 10).replace(/,0$/, '') ), kpiOf('Sản lượng dự kiến') + ' | ' + kpiOf('Đã cân so với dự kiến'));
  ok('Tổng quan: hiện riêng khối lượng thực tế NHẬP TAY (40 t) và cảnh báo lô A lệch tổng phiếu cân (40 t so với ' + fmtVN(EXP.A_all) + ' t)', kpiOf('thực tế nhập tay').startsWith('40,000') && /lệch tổng phiếu cân/.test(await w.innerText('#main')) && new RegExp('nhập tay 40 tấn, phiếu cân ' + fmtVN(EXP.A_all).replace(/\./g, '\\.') + ' tấn').test(await w.innerText('#main')), (await w.innerText('#main')).slice(0, 600));

  // ===== Báo cáo, lọc kỳ tháng 10 =====
  await w.evaluate(() => document.querySelector('[data-act=rpOpen]').click()); await w.waitForSelector('.rpl');
  const setRange = async (a, b) => { await w.fill('#rpFrom', a); await w.fill('#rpTo', b); await w.dispatchEvent('#rpTo', 'change'); await w.waitForTimeout(400); };
  const exportRows = async () => { clearOut(); await w.click('[data-act=rpExcel]'); let f = null; for (let i = 0; i < 80 && !f; i++) { f = fs.readdirSync(out).find(x => x.endsWith('.xlsx')); if (!f) await w.waitForTimeout(150); } await w.waitForTimeout(250); const wb = XLSX.readFile(path.join(out, f)); return XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], {header: 1, defval: ''}); };
  const totalRow = rows => rows.find(r => String(r[0]).trim() === 'TỔNG CỘNG');
  await w.$eval('[data-rpsel=chacon]', b => b.click()); await w.waitForTimeout(300); await setRange('2026-10-01', '2026-10-31');
  let rows = await exportRows(), tr = totalRow(rows);
  ok('Báo cáo cha–con, kỳ tháng 10: TỔNG CỘNG ' + EXP.tripsOct + ' chuyến, ' + EXP.oct + ' tấn (ô số, không phải chữ)', !!tr && close(tr[5], EXP.tripsOct) && close(tr[6], EXP.oct), JSON.stringify(tr));
  const lotRow = ma => rows.find(r => String(r[1]).trim() === ma);
  ok('cha–con: từng lô khớp bảng tay: R-A ' + EXP.A_oct + ' t, R-B ' + EXP.B_oct + ' t; chủ rừng = tổng hai lô', !!lotRow('R-A') && !!lotRow('R-B') && close(lotRow('R-A')[6], EXP.A_oct) && close(lotRow('R-B')[6], EXP.B_oct) && close(lotRow('R-A')[6] + lotRow('R-B')[6], EXP.oct), JSON.stringify([lotRow('R-A'), lotRow('R-B')]));
  await w.$eval('[data-rpsel=phieucan]', b => b.click()); await w.waitForTimeout(300); await setRange('2026-10-01', '2026-10-31');
  rows = await exportRows(); tr = totalRow(rows); const kpis = await w.$$eval('#rpBody .kpi div', d => d.map(x => x.textContent));
  ok('Sổ phiếu cân, kỳ tháng 10: KPI số phiếu ' + EXP.tripsOct + ', tấn ' + fmtVN(EXP.oct) + '; ngoài kỳ (A6, B3) không được cộng', kpis[0].startsWith(String(EXP.tripsOct)) && kpis.some(k => k.includes(fmtVN(EXP.oct))), JSON.stringify(kpis));
  const so = rows.map(r => String(r[4])).filter(Boolean);
  ok('sổ phiếu cân (Excel): có A1…A5, B1, B2; KHÔNG có A6 và B3', ['A1', 'A2', 'A3', 'A4', 'A5', 'B1', 'B2'].every(x => so.includes(x)) && !so.includes('A6') && !so.includes('B3'), JSON.stringify(so));
  await setRange('', ''); await w.waitForTimeout(300);
  await w.$eval('[data-rpsel=chacon]', b => b.click()); await w.waitForTimeout(300); rows = await exportRows(); tr = totalRow(rows);
  ok('cha–con, không lọc kỳ: ' + EXP.tripsAll + ' chuyến, ' + EXP.all + ' tấn = Tổng quan', !!tr && close(tr[5], EXP.tripsAll) && close(tr[6], EXP.all), JSON.stringify(tr));
  ok('không có lỗi JavaScript', errs.length === 0, errs.join('|'));
  await app.close(); console.log(fail ? 'CÓ ' + fail + ' LỖI' : 'TẤT CẢ ĐẠT'); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
