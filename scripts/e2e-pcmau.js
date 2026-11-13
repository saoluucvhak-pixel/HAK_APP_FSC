'use strict';
/* File Excel mẫu phiếu cân có thêm giờ cân 1/2, cân lần 1/2, khối lượng kg, khách hàng (Electron thật): nạp đúng, giờ dạng ô giờ,
 * chỉ có kg thì tấn = kg ÷ 1000, cảnh báo kg/tấn lệch, file cũ không có các cột mới vẫn nạp được.
 * Chạy: xvfb-run -a node scripts/e2e-pcmau.js */
const {_electron: electron} = require('playwright-core');
const path = require('path'), fs = require('fs'), os = require('os');
const XLSX = require('xlsx'), JSZip = require('jszip');
const M = require('../src/xlsxmau');
const src = fs.readFileSync(path.join(__dirname, 'e2e-inan2.js'), 'utf8');
const {lot, seed} = new Function(src.slice(src.indexOf('const nv ='), src.indexOf('const plain =')) + '; return {lot, seed};')();
const root = path.join(__dirname, '..');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hakqn-pcmau-'));
let fail = 0; const ok = (name, cond, extra) => { console.log((cond ? 'ĐẠT  ' : 'LỖI  ') + name + (!cond && extra ? ' — ' + extra : '')); if (!cond) fail++; };
(async () => {
  // 1. file mẫu do phần mềm tạo có đủ cột mới
  const tpl = await M.build('pc', JSZip, {version: '9'}); const wbT = XLSX.read(tpl, {type: 'buffer'});
  const heads = XLSX.utils.sheet_to_json(wbT.Sheets.PHIEU_CAN, {header: 1})[0];
  ok('file mẫu phiếu cân có các cột Giờ cân 1/2, Cân lần 1/2 (kg), Khối lượng (kg), Khách hàng', ['Giờ cân 1', 'Giờ cân 2', 'Cân lần 1 (kg)', 'Cân lần 2 (kg)', 'Khối lượng (kg)', 'Khách hàng'].every(h => heads.includes(h)), heads.join('|'));
  // 2. file điền dữ liệu (giờ dạng ô giờ Excel; dòng 3 chỉ có kg; dòng 4 kg và tấn lệch)
  const rows = [heads,
    [1, '05/10/2026', 8 / 24 + 15 / 1440, 9 / 24 + 40 / 1440, '92C-12345', 'PC001', 40400, 15000, 25400, 25.4, 'NGUYỄN VĂN AN', 'KCN Điện Nam, Quảng Nam', ''],
    [2, '06/10/2026', '08:30', '10:05', '92C-67890', 'PC002', 39600, 15000, 24600, 24.6, 'NGUYỄN VĂN AN', 'KCN Điện Nam, Quảng Nam', ''],
    [3, '07/10/2026', '', '', '92C-12345', 'PC003', '', '', 20000, '', 'TRẦN THỊ BÌNH', 'KCN Điện Nam, Quảng Nam', 'chỉ có kg'],
    [4, '08/10/2026', '', '', '92C-67890', 'PC004', '', '', 30000, 31, '', 'KCN Điện Nam, Quảng Nam', 'kg lệch tấn']];
  const f1 = path.join(dir, 'pc_moi.xlsx'), wb1 = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb1, XLSX.utils.aoa_to_sheet(rows), 'PHIEU_CAN'); XLSX.writeFile(wb1, f1);
  // file cũ: chỉ các cột cũ
  const old = [['STT', 'Ngày cân', 'Biển kiểm soát', 'Số phiếu cân', 'Khối lượng (tấn)', 'Nơi giao (nhà máy)', 'Ghi chú'], [1, '05/10/2026', '92C-12345', 'OLD1', 10, 'KCN', '']];
  const f2 = path.join(dir, 'pc_cu.xlsx'), wb2 = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb2, XLSX.utils.aoa_to_sheet(old), 'PHIEU_CAN'); XLSX.writeFile(wb2, f2);

  const app = await electron.launch({executablePath: require('electron'), args: [root, '--no-sandbox'], env: {...process.env, HAKQN_DB: path.join(dir, 'p.sqlite'), HAKQN_USERDATA: path.join(dir, 'ud'), ELECTRON_DISABLE_SECURITY_WARNINGS: '1'}});
  const w = await app.firstWindow(); const errs = []; w.on('pageerror', e => errs.push(e.message)); w.on('dialog', d => d.accept()); await w.waitForSelector('#side');
  await w.evaluate(d => window.hak.save(d), seed([lot('fa', 'R-A', {exp: {}, pc: []})])); await w.reload(); await w.waitForSelector('#side');
  await w.click('[data-open=own1]'); await w.click('[data-tab=rung]'); await w.click('[data-forest=fa]'); await w.click('[data-ftab=dx]');
  await w.setInputFiles('input[data-file="pc"]', f1); await w.waitForTimeout(900);
  const db = () => w.evaluate(() => window.hak.loadSync().db); let d = await db(); const pc = Object.values(d.rs.own1.forests)[0].pc, by = n => pc.find(p => p.soPhieu === n);
  ok('nạp 4 phiếu', pc.length === 4, JSON.stringify(pc.map(p => p.soPhieu)));
  ok('PC001: giờ cân từ ô giờ Excel (08:15:00, 09:40:00), cân lần 1/2, kg, tấn, khách hàng', !!by('PC001') && by('PC001').gioCan1 === '08:15:00' && by('PC001').gioCan2 === '09:40:00' && by('PC001').can1 === 40400 && by('PC001').can2 === 15000 && by('PC001').klKg === 25400 && by('PC001').kl === 25.4 && by('PC001').khachHang === 'NGUYỄN VĂN AN', JSON.stringify(by('PC001')));
  ok('PC002: giờ dạng chữ giữ nguyên', !!by('PC002') && by('PC002').gioCan1 === '08:30' && by('PC002').gioCan2 === '10:05');
  ok('PC003: chỉ có kg (20.000) → tấn = 20', !!by('PC003') && by('PC003').kl === 20 && by('PC003').klKg === 20000, JSON.stringify(by('PC003')));
  const txt = await w.innerText('#main');
  ok('PC004: kg (30.000) và tấn (31) lệch nhau → cảnh báo, vẫn nạp', !!by('PC004') && /không khớp nhau/.test(txt));
  ok('danh sách phiếu cân hiện các cột mới', ['Giờ cân 1', 'Giờ cân 2', 'Cân lần 1 (kg)', 'Khách hàng'].every(h => txt.includes(h)) && /08:15:00/.test(txt));
  // file cũ vẫn nạp
  await w.setInputFiles('input[data-file="pc"]', f2); await w.waitForTimeout(900);
  d = await db(); const pc2 = Object.values(d.rs.own1.forests)[0].pc;
  ok('file cũ (không có cột mới) vẫn nạp được', pc2.length === 1 && pc2[0].soPhieu === 'OLD1' && pc2[0].kl === 10 && pc2[0].gioCan1 === '', JSON.stringify(pc2));
  ok('không có lỗi JavaScript', errs.length === 0, errs.join('|'));
  await app.close(); console.log(fail ? 'CÓ ' + fail + ' LỖI' : 'TẤT CẢ ĐẠT'); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
