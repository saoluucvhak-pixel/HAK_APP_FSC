'use strict';
/* File Excel mẫu phiếu cân có thêm giờ cân 1/2, cân lần 1/2, khối lượng kg, khách hàng (Electron thật): nạp đúng, giờ dạng ô giờ,
 * chỉ có kg thì tấn = kg ÷ 1000, cảnh báo kg/tấn lệch, file cũ không có các cột mới vẫn nạp được.
 * Chạy: xvfb-run -a node scripts/e2e-pcmau.js */
const {_electron: electron} = require('playwright-core');
const {saveStage: stSave, addXe} = require('./lib-stage');
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
  ok('file mẫu phiếu cân có đủ cột để in phiếu cân (cùng tên cột với công cụ PhieuCan): Giờ cân 1/2, Cân 1/2, KL, Khách hàng, Địa chỉ, ĐG_AD, Thành tiền, Trạng thái…', ['Số phiếu', 'Ngày cân 1', 'Giờ cân 1', 'Ngày cân 2', 'Giờ cân 2', 'Biển số 1', 'Cân 1', 'Cân 2', 'KL', 'Khách hàng', 'Địa chỉ', 'ĐG_AD', 'So_CT', 'Đơn giá_TC', 'Trạng thái', 'Thành tiền'].every(h => heads.includes(h)), heads.join('|'));
  // 2. file điền dữ liệu (giờ dạng ô giờ Excel; dòng 3 chỉ có kg; dòng 4 kg và tấn lệch; dòng 5 chỉ có Cân 1 và Cân 2)
  const R = o => heads.map(h => o[h] ?? '');
  const rows = [heads,
    R({'STT': 1, 'Ngày cân 1': '05/10/2026', 'Giờ cân 1': 8 / 24 + 15 / 1440, 'Giờ cân 2': 9 / 24 + 40 / 1440, 'Biển số 1': '92C-12345', 'Số phiếu': 'PC001', 'Cân 1': 40400, 'Cân 2': 15000, 'KL': 25400, 'Khối lượng (tấn)': 25.4, 'Khách hàng': 'NGUYỄN VĂN AN', 'Địa chỉ': 'Thôn A, xã B', 'ĐG_AD': 1250000, 'Thành tiền': 31750000, 'Trạng thái': 'OK', 'Nơi giao (nhà máy)': 'KCN Điện Nam, Quảng Nam'}),
    R({'STT': 2, 'Ngày cân 1': '06/10/2026', 'Giờ cân 1': '08:30', 'Giờ cân 2': '10:05', 'Biển số 1': '92C-67890', 'Số phiếu': 'PC002', 'Cân 1': 39600, 'Cân 2': 15000, 'KL': 24600, 'Khối lượng (tấn)': 24.6, 'Khách hàng': 'NGUYỄN VĂN AN', 'ĐG_AD': '1.250.000', 'Nơi giao (nhà máy)': 'KCN Điện Nam, Quảng Nam'}),
    R({'STT': 3, 'Ngày cân 1': '07/10/2026', 'Biển số 1': '92C-12345', 'Số phiếu': 'PC003', 'KL': 20000, 'Khách hàng': 'TRẦN THỊ BÌNH', 'Ghi chú': 'chỉ có kg'}),
    R({'STT': 4, 'Ngày cân 1': '08/10/2026', 'Biển số 1': '92C-67890', 'Số phiếu': 'PC004', 'KL': 30000, 'Khối lượng (tấn)': 31, 'Ghi chú': 'kg lệch tấn'}),
    R({'STT': 5, 'Ngày cân 1': '09/10/2026', 'Biển số 1': '92C-12345', 'Số phiếu': 'PC005', 'Cân 1': 36000, 'Cân 2': 15500, 'Đơn giá_TC': 1300000, 'Trạng thái': 'HỦY'})];
  const f1 = path.join(dir, 'pc_moi.xlsx'), wb1 = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb1, XLSX.utils.aoa_to_sheet(rows), 'PHIEU_CAN'); XLSX.writeFile(wb1, f1);
  // file cũ: chỉ các cột cũ
  const old = [['STT', 'Ngày cân', 'Biển kiểm soát', 'Số phiếu cân', 'Khối lượng (tấn)', 'Nơi giao (nhà máy)', 'Ghi chú'], [1, '05/10/2026', '92C-12345', 'OLD1', 10, 'KCN', '']];   // tên cột của file mẫu cũ
  const f2 = path.join(dir, 'pc_cu.xlsx'), wb2 = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb2, XLSX.utils.aoa_to_sheet(old), 'PHIEU_CAN'); XLSX.writeFile(wb2, f2);

  const app = await electron.launch({executablePath: require('electron'), args: [root, '--no-sandbox'], env: {...process.env, HAKQN_CLOSE: 'discard', HAKQN_DB: path.join(dir, 'p.sqlite'), HAKQN_USERDATA: path.join(dir, 'ud'), ELECTRON_DISABLE_SECURITY_WARNINGS: '1'}});
  const w = await app.firstWindow(); const errs = []; w.on('pageerror', e => errs.push(e.message)); w.on('dialog', d => d.accept()); await w.waitForSelector('#side');
  await w.evaluate(d => window.hak.save(d), seed([lot('fa', 'R-A', {exp: {}, pc: []})])); await w.reload(); await w.waitForSelector('#side');
  await w.click('[data-open=own1]'); await w.click('[data-tab=rung]'); await w.click('[data-forest=fa]'); await w.click('[data-ftab=dx]');
  await w.setInputFiles('input[data-file="pc"]', f1); await w.waitForTimeout(900); await stSave(w);
  const db = () => w.evaluate(() => window.hak.loadSync().db); let d = await db(); const pc = Object.values(d.rs.own1.forests)[0].pc, by = n => pc.find(p => p.soPhieu === n);
  ok('nạp 5 phiếu', pc.length === 5, JSON.stringify(pc.map(p => p.soPhieu)));
  ok('PC001: giờ cân từ ô giờ Excel (08:15:00, 09:40:00), cân lần 1/2, kg, tấn, khách hàng', !!by('PC001') && by('PC001').gioCan1 === '08:15:00' && by('PC001').gioCan2 === '09:40:00' && by('PC001').can1 === 40400 && by('PC001').can2 === 15000 && by('PC001').klKg === 25400 && by('PC001').kl === 25.4 && by('PC001').khachHang === 'NGUYỄN VĂN AN', JSON.stringify(by('PC001')));
  ok('PC001 có đơn giá 1.250.000 và thành tiền 31.750.000; PC003 không có giá thì để trống', by('PC001').donGia === 1250000 && by('PC001').thanhTien === 31750000 && by('PC003').donGia == null, JSON.stringify([by('PC001'), by('PC003')]));
  ok('PC002: giờ dạng chữ giữ nguyên', !!by('PC002') && by('PC002').gioCan1 === '08:30' && by('PC002').gioCan2 === '10:05');
  ok('PC003: chỉ có kg (20.000) → tấn = 20', !!by('PC003') && by('PC003').kl === 20 && by('PC003').klKg === 20000, JSON.stringify(by('PC003')));
  const txt = await w.innerText('#main');
  ok('PC004: kg (30.000) và tấn (31) lệch nhau → cảnh báo, vẫn nạp', !!by('PC004') && /không khớp nhau/.test(txt));
  ok('danh sách phiếu cân hiện các cột mới', ['Giờ cân 1', 'Giờ cân 2', 'Cân lần 1 (kg)', 'Khách hàng'].every(h => txt.includes(h)) && /08:15:00/.test(txt));
  ok('PC005: chỉ có Cân 1 và Cân 2 → KL tự tính 20.500 kg (20,5 tấn); Đơn giá_TC dùng khi ĐG_AD trống; Trạng thái HỦY được giữ', by('PC005').klKg === 20500 && by('PC005').kl === 20.5 && by('PC005').donGia === 1300000 && by('PC005').trangThai === 'HỦY', JSON.stringify(by('PC005')));
  ok('PC002: đơn giá dạng chữ “1.250.000” đọc thành số', by('PC002').donGia === 1250000, JSON.stringify(by('PC002')));
  // in phiếu cân dùng chính dữ liệu này; phiếu trạng thái HỦY mặc định không chọn
  await w.click('[data-ftab=xuat]'); await w.waitForSelector('#pcPrintCard');
  const [pw] = await Promise.all([app.waitForEvent('window'), w.$eval('#pcPrintCard [data-act=pcPrint]', b => b.click())]);
  await pw.waitForFunction(() => document.querySelectorAll('#tb tr.row').length === 5, null, {timeout: 15000});
  ok('in phiếu cân: công cụ nhận đủ 5 phiếu, phiếu trạng thái HỦY không được chọn sẵn (4/5)', /Đã chọn 4\/5 phiếu/.test(await pw.innerText('#count')), await pw.innerText('#count'));
  const pt = await pw.$eval('#render', r => r.innerText);
  ok('phiếu in có giờ cân, cân lần 1/2, khối lượng, khách hàng, địa chỉ rừng, giá mua và thành tiền từ file', /08:15:00/.test(pt) && /40\.400/.test(pt) && /25\.400/.test(pt) && /Thôn A, xã B/.test(pt) && /Giá mua\s*:\s*1\.250\s*đ\/kg/.test(pt) && /31\.750\.000\s*\(vnđ\)/.test(pt), pt.slice(0, 500));
  await pw.close(); await w.click('[data-ftab=dx]');
  // file cũ vẫn nạp
  await w.setInputFiles('input[data-file="pc"]', f2); await w.waitForTimeout(900); await stSave(w);
  d = await db(); const pc2 = Object.values(d.rs.own1.forests)[0].pc;
  const old1 = pc2.find(p => p.soPhieu === 'OLD1');
  ok('file cũ (không có cột mới) vẫn nạp được; nạp thêm KHÔNG xóa các phiếu đã lưu (5 phiếu trước + OLD1 = 6)', pc2.length === 6 && !!old1 && old1.kl === 10 && old1.gioCan1 === '', JSON.stringify(pc2.map(p => p.soPhieu)));
  // file mẫu của chính công cụ PhieuCan (tiêu đề ở dòng 4, KL để trống, trang tính tên PhieuCan) nạp thẳng vào Vận chuyển
  await w.setInputFiles('input[data-file="pc"]', path.join(root, 'tests', 'fixtures', 'MauPhieuCan_cong_cu.xlsx')); await w.waitForTimeout(900);
  ok('phiếu có biển chưa thuộc đội xe của lô: báo “Thêm xe …” và chưa lưu được', !!(await w.$('#stMissXe')) && /92C-25941/.test(await w.innerText('#stMissXe')));
  for (const b of ['92C-25941', '92C-15844', '92C-11918']) await addXe(w, b);
  await stSave(w);
  d = await db(); const pc3 = Object.values(d.rs.own1.forests)[0].pc, t1 = pc3.find(p => p.soPhieu === '101');
  ok('file mẫu của công cụ in phiếu cân (tiêu đề dòng 4) nạp được: 3 phiếu, giờ cân, Cân 1/2, KL tự tính, khách hàng, địa chỉ, đơn giá, trạng thái', pc3.length === 9 && !!t1 && t1.bienSo === '92C-25941' && /^06:15/.test(t1.gioCan1) && t1.can1 === 15900 && t1.can2 === 5460 && t1.klKg === 10440 && t1.kl === 10.44 && t1.khachHang === 'TRẦN ANH LAN' && /Thu Bồn/.test(t1.diaChi) && t1.donGia === 1710000 && t1.trangThai === 'OK' && /^\d\d\/\d\d\/\d{4}$/.test(t1.ngay), JSON.stringify(t1));
  ok('không có lỗi JavaScript', errs.length === 0, errs.join('|'));
  await app.close(); console.log(fail ? 'CÓ ' + fail + ' LỖI' : 'TẤT CẢ ĐẠT'); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
