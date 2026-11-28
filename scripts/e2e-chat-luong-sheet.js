'use strict';
/* PR D bước 3 — báo cáo chất lượng Google Sheet, CHỈ SỐ ĐẾM (Electron thật, SQLite thật; Excel giả lập sinh ngay trong bài):
 *  - chưa có dữ liệu: báo rõ, không lỗi script
 *  - có dữ liệu: bấm “Tạo báo cáo chất lượng” hiện bảng “Nhãn: số”; sao chép được; KHÔNG chứa CCCD / tên / địa chỉ / số hợp đồng / số phiếu / biển số / mã rừng
 * Chạy: xvfb-run -a node scripts/e2e-chat-luong-sheet.js */
const {_electron: electron} = require('playwright-core');
const XLSX = require('xlsx');
const path = require('path'), fs = require('fs'), os = require('os');
const src = fs.readFileSync(path.join(__dirname, 'e2e-inan2.js'), 'utf8');
const {lot, seed, P} = new Function(src.slice(src.indexOf('const nv ='), src.indexOf('const plain =')) + '; return {lot, seed, P};')();
const root = path.join(__dirname, '..');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hakqn-cl-'));
let fail = 0; const ok = (name, cond, extra) => { console.log((cond ? 'ĐẠT  ' : 'LỖI  ') + name + (!cond && extra ? ' — ' + extra : '')); if (!cond) fail++; };
const HK = ['Mã khách hàng', 'Mã hợp đồng', 'SỐ PHIẾU CÂN', 'Ngày nhập', 'Biển số 1', 'KL hàng (KG)', 'Đơn giá', 'Họ và tên chủ rừng'];
const HR = ['Mã KH_CCCD', 'Họ và tên chủ rừng', 'Mã hợp đồng', 'Ngày ký hợp đồng', 'ĐỊA CHỈ RỪNG', 'HECTA', 'Định mức tấn/Ha'];
const HT = ['Mã rừng', 'Số hợp đồng', 'HoVaTenChuRung', 'SoCCCD', 'DiaChiRungTrong', 'DienTich_m2', 'Latitude_Vĩ độ', 'Longtitude_Kinh độ', 'ID_GPS'];
const CC = '049000000077', TEN = 'Chủ Giả Lập E2E', HD = 'HD-GL-E2E-1', BKS = '43C-555.55', RUNG = 'R-GL-E2E-1', DIA = 'Xã Giả Lập E2E', SOP = 'PC-GL-E2E-';
const wb = XLSX.utils.book_new(), add = (h, rows, n) => XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([h, ...rows]), n);
add(HK, [[CC, HD, SOP + '1', '06/11/2026', BKS, 20000, 1, TEN], [CC, HD, SOP + '2', '06/11/2026', BKS, 20000, 1, TEN], [CC, HD, SOP + '3', '31/31/2026', '', 18000, 1, TEN]], 'HoSoKeo');
add(HR, [[CC, TEN, HD, '05/10/2026', DIA, 1, 90]], 'HoSoRung'); add(HT, [[RUNG, HD, TEN, CC, DIA, 10000, 15.6, 108.1, 'g1']], 'ToaDoRung');
const xlsx = path.join(dir, 'gia_lap.xlsx'); XLSX.writeFile(wb, xlsx);
(async () => {
  const app = await electron.launch({executablePath: require('electron'), args: [root, '--no-sandbox'], env: {...process.env, HAKQN_CLOSE: 'discard', HAKQN_DB: path.join(dir, 'd.sqlite'), HAKQN_USERDATA: path.join(dir, 'ud'), HAKQN_DOWNLOAD_DIR: path.join(dir, 'out')}});
  const w = require('./_hd30').boc(await app.firstWindow()); const errs = []; w.on('pageerror', e => errs.push(e.message)); w.on('dialog', d => d.accept()); await w.waitForSelector('#side');
  // nghi đổi số so với phiếu ĐÃ CÓ trong lô của ứng dụng (24/11/2026): nạp sẵn lô R-GL-E2E-1 có một phiếu cùng ngày, biển số, khối lượng với PC-1 và PC-2 nhưng khác số phiếu
  await w.evaluate(d => window.hak.save(d), seed([lot('fa', RUNG, {exp: {}, pc: [P(9, '06/11/2026', BKS, 'OLD-E2E', 20)], kl: null})])); await w.reload(); await w.waitForSelector('#side');
  const mo = async () => { await w.click('#navSet'); await w.click('#setTab_setgs'); await w.waitForSelector('#setGsChatLuong'); };
  await mo(); await w.click('#setGsChatLuong'); await w.waitForSelector('#setGsCLLoi');
  ok('chưa có dữ liệu: báo rõ, không có bảng', /Google Sheets/.test(await w.innerText('#setGsCLLoi')) && !(await w.$('#setGsCLBang')));
  ok('nhập Excel giả lập', (await w.evaluate(p => window.hak.lookup.importExcel(p), xlsx)).ok);
  await mo(); await w.click('#setGsChatLuong'); await w.waitForSelector('#setGsCLBang');
  const bang = await w.innerText('#setGsCLBang');
  ok('bảng có nhãn và số đúng: 1 hợp đồng, 3 phiếu, 1 phiếu ngày lỗi, 1 thiếu biển số, 2 nghi đổi số (so với phiếu đã có trong lô)', /Số hợp đồng: 1\b/.test(bang) && /Số phiếu: 3\b/.test(bang) && /ngày không đọc được: 1\b/.test(bang) && /thiếu biển số: 1\b/.test(bang) && /nghi đổi số \(so với phiếu đã có trong lô\): 2\b/.test(bang), bang);
  ok('mỗi dòng chỉ là “Nhãn: số”', bang.split('\n').filter(Boolean).every(l => /^[^:]+: \d+$/.test(l.trim())), bang);
  const tat = bang + '\n' + await w.innerText('#main');
  const lo = [CC, TEN, HD, BKS, RUNG, DIA, SOP, 'OLD-E2E', 'giả lập'].filter(x => tat.toLowerCase().includes(x.toLowerCase()));
  ok('BẢO MẬT: màn báo cáo không lộ CCCD, tên, mã hợp đồng, biển số, mã rừng, địa chỉ, số phiếu', lo.length === 0, lo.join(' | '));
  const rs = await w.evaluate(() => window.hak.lookup.chatLuong());
  ok('IPC chỉ trả {ok, so, bang} và toàn số nguyên', Object.keys(rs).sort().join() === 'bang,ok,so' && Object.values(rs.so).every(v => Number.isInteger(v)), JSON.stringify(Object.keys(rs)));
  await w.click('#setGsCLCopy'); await w.waitForTimeout(300);
  ok('Sao chép bảng: có thông báo kết quả', /sao chép/i.test(await w.innerText('#main')));
  ok('không có lỗi script', errs.length === 0, errs.join('; '));
  await app.close(); console.log(fail ? 'CÓ ' + fail + ' LỖI' : 'TẤT CẢ ĐẠT'); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
