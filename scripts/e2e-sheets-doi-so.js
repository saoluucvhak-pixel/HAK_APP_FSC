'use strict';
/* Kiểm thử đầu-cuối "Nghi đổi số phiếu" từ Google Sheets (S8, QĐ9): Electron thật, Excel giả lập sinh trong bài.
 *  - Sheet đổi số 1001 → 1001B cùng ngày, cùng biển số, cùng khối lượng: mặc định KHÔNG ghi; chọn "Đổi số" giữ nguyên phiếu, KHÔNG cộng đôi tổng tấn
 *  - tải lại Sheet (số mới hoặc số cũ) không thêm lại phiếu; "Là chuyến khác (thêm mới)" thêm đúng một phiếu
 * Chạy: xvfb-run -a node scripts/e2e-sheets-doi-so.js */
const {_electron: electron} = require('playwright-core');
const XLSX = require('xlsx');
const {saveStage: stSave} = require('./lib-stage');
const path = require('path'), fs = require('fs'), os = require('os');
const root = path.join(__dirname, '..');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hakqn-sheets-ds-')), dbFile = path.join(dir, 'd.sqlite');
let fail = 0; const ok = (n, c, x) => { console.log((c ? 'ĐẠT  ' : 'LỖI  ') + n + (!c && x ? ' — ' + x : '')); if (!c) fail++; };

const D = (y, m, d) => new Date(Date.UTC(y, m - 1, d));
const HK = ['STT', 'Mã khách hàng', 'Mã hợp đồng', 'SỐ PHIẾU CÂN', 'Ngày nhập', 'SỐ XE', 'Hàng hóa', 'Biển số 1', 'KL hàng (KG)', 'Khối lượng (Tấn)', 'Họ và tên chủ rừng', 'ĐỊA CHỈ RỪNG'];
const HR = ['STT', 'Mã KH_CCCD', 'Họ và tên chủ rừng', 'Mã hợp đồng', 'Ngày ký hợp đồng', 'ĐỊA CHỈ RỪNG', 'HECTA', 'Định mức tấn/Ha'];
const HT = ['ID_RUNG', 'ID_GPS', 'Mã rừng', 'Số hợp đồng', 'HoVaTenChuRung', 'SoCCCD', 'DiaChiRungTrong', 'DienTich_m2', 'Latitude_Vĩ độ', 'Longtitude_Kinh độ'];
const mk = (H, o) => H.map(h => (o[h] === undefined ? null : o[h]));
const CC = '049000000021', TEN = 'PHẠM VĂN ĐỔI giả lập';
const keo = (i, so, ngay, bien, kg) => mk(HK, {STT: i, 'Mã khách hàng': CC, 'Mã hợp đồng': 'HD-S01', 'SỐ PHIẾU CÂN': so, 'Ngày nhập': ngay, 'SỐ XE': bien, 'Hàng hóa': 'Gỗ Tròn Keo giả lập', 'Biển số 1': bien, 'KL hàng (KG)': kg, 'Khối lượng (Tấn)': kg / 1000, 'Họ và tên chủ rừng': TEN, 'ĐỊA CHỈ RỪNG': 'Thôn Đổi'});
const book = phieu => {
  const wb = XLSX.utils.book_new(), add = (h, rows, n) => XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([h, ...rows], {cellDates: true}), n);
  add(HK, phieu.map((p, i) => keo(i + 1, ...p)), 'HoSoKeo');
  add(HR, [mk(HR, {STT: 1, 'Mã KH_CCCD': CC, 'Họ và tên chủ rừng': TEN, 'Mã hợp đồng': 'HD-S01', 'Ngày ký hợp đồng': D(2026, 1, 10), 'ĐỊA CHỈ RỪNG': 'Thôn Đổi', HECTA: 5, 'Định mức tấn/Ha': 10})], 'HoSoRung');
  add(HT, [mk(HT, {ID_RUNG: 'GL-S01', ID_GPS: 'S01-g1', 'Mã rừng': 'GL-S01', 'Số hợp đồng': 'HD-S01', HoVaTenChuRung: TEN, SoCCCD: CC, DiaChiRungTrong: 'Thôn Đổi', DienTich_m2: 50000, 'Latitude_Vĩ độ': 15.6, 'Longtitude_Kinh độ': 108.1})], 'ToaDoRung');
  return XLSX.write(wb, {type: 'buffer', bookType: 'xlsx', cellDates: false});
};
const P1 = ['S-1001', D(2026, 1, 22), '92C-22222', 2840], P2 = ['S-1002', D(2026, 1, 23), '92C-22222', 4440];
const f1 = path.join(dir, 's1.xlsx'), f2 = path.join(dir, 's2_doi_so.xlsx'), f3 = path.join(dir, 's3_chuyen_khac.xlsx');
fs.writeFileSync(f1, book([P1, P2]));
fs.writeFileSync(f2, book([['S-1001B', ...P1.slice(1)], P2]));            // số 1001 → 1001B, cùng ngày/biển/khối lượng
fs.writeFileSync(f3, book([['S-1001B', ...P1.slice(1)], ['S-1002X', ...P2.slice(1)]]));   // 1002 vắng, xuất hiện 1002X cùng ngày/biển/khối lượng

(async () => {
  const app = await electron.launch({executablePath: require('electron'), args: [root, '--no-sandbox'], env: {...process.env, HAKQN_CLOSE: 'discard', HAKQN_DB: dbFile, HAKQN_USERDATA: path.join(dir, 'ud'), HAKQN_SHEET_URL: 'http://127.0.0.1:9/none.xlsx'}});
  const w = require('./_hd30').boc(await app.firstWindow()); const errs = []; w.on('pageerror', e => errs.push(e.message)); w.on('dialog', d => d.accept());
  await app.evaluate(({BrowserWindow}) => { BrowserWindow.getAllWindows()[0].setContentSize(1024, 768); }); await w.waitForSelector('#side');
  // hồ sơ có sẵn: chủ rừng đúng CCCD, lô GL-S01 và xe 92C-22222 (phiếu cân chỉ lưu được khi biển số có trong danh sách xe)
  const xe = {_row: 2, maRung: 'GL-S01', stt: '1', chuXe: 'LÊ VĂN XE giả lập', ngaySinh: '01/01/1980', cccd: '049000000077', ngayCap: '01/01/2021', noiCap: 'CA giả lập', diaChi: 'Đà Nẵng', bienSo: '92C-22222', loaiXe: 'Xe tải', nguoiKy: 'Chủ xe', sdt: '0905123456'};
  await w.evaluate(x => window.hak.save(x), {v: 2, rs: {os: {id: 'os', info: {ma: 'CR-S', ten: TEN, cccd: CC, ngayCap: '15/08/2021', noiCap: 'CA giả lập', diaChi: 'Đà Nẵng', danhXung: 'Ông', soHopDong: '', ngayKyHopDong: ''}, nc: [], dx: [], exp: {}, forests: {fs: {id: 'fs', info: {maRung: 'GL-S01', tenRung: 'Lô GL-S01', diaDiem: 'Thôn Đổi', dienTich: 5}, nc: [], dx: [xe], pc: []}}}}}); await w.reload(); await w.waitForSelector('#side');
  const db = () => w.evaluate(() => window.hak.loadSync().db);
  const lotOf = async () => { const d = await db(); const o = Object.values(d.rs).find(x => String(x.info.cccd) === CC); return o ? {o, f: Object.values(o.forests).find(f => f.info.maRung === 'GL-S01')} : {}; };
  const tong = f => ((f && f.pc) || []).reduce((t, p) => t + (typeof p.klKg === 'number' ? p.klKg : Math.round(p.kl * 1000)), 0);
  const load = async f => (await w.evaluate(p => window.hak.lookup.importExcel(p), f)).ok;
  const openModal = async () => { await w.evaluate(() => window.moDuLieuSheets({maHd: 'HD-S01'})); await w.waitForSelector('#hdBox.on'); await w.click('#hdBox [data-gstab=pc]'); await w.waitForSelector('#hdBox .gsPcT'); };
  const closeModal = async () => { await w.keyboard.press('Escape'); await w.waitForTimeout(150); if (await w.$('#lkBox.on')) { await w.keyboard.press('Escape'); await w.waitForTimeout(150); } };
  const stBan = async () => { const {o, f} = await lotOf(); for (const s of ['[data-open=' + o.id + ']', '[data-tab=rung]', '[data-forest=' + f.id + ']']) { await w.click(s); if (await w.$('#stBox.on #stGSave')) { await w.click('#stGSave'); await w.waitForTimeout(600); } } return stSave(w); };
  const apply = async () => { await w.click('#hdBox [data-act=gsApply]'); await w.waitForTimeout(700); if (await w.$('#hdAsk.on')) await w.click('#hdAskBody [data-act=gsAskYes]'); await w.waitForTimeout(700); };
  const pcRows = () => w.$$eval('#hdBox .gsPcT tbody tr', r => r.map(x => x.innerText.replace(/\s+/g, ' ')));

  /* ===== Bước 1: nạp 2 phiếu đầu tiên ===== */
  ok('nạp Excel lần 1 (phiếu S-1001, S-1002)', await load(f1));
  await openModal(); await w.click('[data-act=gsAll]'); await apply(); await closeModal(); await stBan();
  let {f} = await lotOf();
  ok('lô GL-S01 có 2 phiếu, tổng 7.280 kg', !!f && f.pc.length === 2 && tong(f) === 7280 && f.pc.some(p => p.soPhieu === 'S-1001'), f && JSON.stringify(f.pc.map(p => [p.soPhieu, p.klKg])));
  const id1001 = f.pc.find(p => p.soPhieu === 'S-1001')._id;

  /* ===== Bước 2: Sheet đổi số S-1001 → S-1001B ===== */
  ok('nạp Excel lần 2 (S-1001 đổi thành S-1001B)', await load(f2));
  await openModal();
  const rows = await pcRows();
  ok('S-1001B hiện "Nghi đổi số", S-1002 "Trùng"', rows.some(r => /S-1001B/.test(r) && /Nghi đổi số/.test(r)) && rows.some(r => /S-1002/.test(r) && /Trùng/.test(r)), rows.join(' || '));
  ok('panel nghi đổi số nêu cặp số cũ → số Sheet và có hai nút chọn', /Nghi đổi số phiếu/.test(await w.innerText('.gsSus')) && /S-1001/.test(await w.innerText('.gsSus')) && !!(await w.$('[data-act=gsDsn][data-v=doi]')) && !!(await w.$('[data-act=gsDsn][data-v=khac]')) && /\(giữ nguyên phiếu\)/.test(await w.innerText('[data-act=gsDsn][data-v=doi]')) && /Là chuyến khác \(thêm mới\)/.test(await w.innerText('[data-act=gsDsn][data-v=khac]')));
  ok('phiếu nghi đổi số: ô tích bị khóa (không tự ghi)', await w.$eval('#hdBox [data-gssp]', () => true) && (await w.$$eval('#hdBox .gsPcT tbody tr', r => r.filter(x => /Nghi đổi số/.test(x.innerText)).every(x => x.querySelector('[data-gssp]').disabled))));
  const dBefore = JSON.stringify(await db());
  await w.click('[data-act=gsAll]'); await apply();
  ok('mặc định (chưa chọn): Cập nhật KHÔNG ghi gì, hồ sơ giữ nguyên', JSON.stringify(await db()) === dBefore);
  ok('thông báo nêu bỏ qua phiếu nghi đổi số chưa chọn hoặc không có gì để ghi', /nghi đổi số chưa chọn|Không có thay đổi|Chưa chọn mục nào/.test(await w.innerText('#hdBox .gsDtB')), (await w.innerText('#hdBox .gsDtB')).replace(/\s+/g, ' ').slice(0, 250));
  await w.click('[data-act=gsDsn][data-v=doi]'); await w.waitForTimeout(150);
  ok('chọn "Đổi số": hàng chuyển sang "Đổi số", nêu "giữ nguyên phiếu"', /Đổi số S-1001 → S-1001B \(giữ nguyên phiếu\)/.test((await pcRows()).join(' ')) || /Đã chọn đổi số/.test(await w.innerText('.gsSus')));
  await apply(); await closeModal();
  ok('QĐ7: "Cập nhật" chỉ đổi số trong BẢN NHÁP — dữ liệu đã lưu vẫn là số cũ cho đến khi bấm Lưu dữ liệu vào lô', JSON.stringify(await db()) === dBefore || (await lotOf()).f.pc.every(x => x.soPhieu !== 'S-1001B'));
  await stBan();
  ({f} = await lotOf());
  ok('sau đổi số: vẫn 2 phiếu, KHÔNG cộng đôi tổng tấn (7.280 kg, không phải 10.120 kg)', f.pc.length === 2 && tong(f) === 7280, f.pc.length + ' phiếu, ' + tong(f) + ' kg');
  const p = f.pc.find(x => x._id === id1001);
  ok('phiếu giữ nguyên _id, số mới S-1001B, số cũ S-1001 vào soCu', !!p && p.soPhieu === 'S-1001B' && Array.isArray(p.soCu) && p.soCu.some(c => c.so === 'S-1001'), JSON.stringify(p));
  ok('nhật ký đổi số f.soLog có mục S-1001 → S-1001B (ngoài nhatKy)', Array.isArray(f.soLog) && f.soLog.some(l => l.soCu === 'S-1001' && l.soMoi === 'S-1001B') && !JSON.stringify(f.nhatKy || []).includes('soLog'), JSON.stringify(f.soLog));

  /* ===== Bước 3: tải lại Sheet — không thêm lại ===== */
  ok('tải lại Sheet bản đổi số (S-1001B)', await load(f2));
  await openModal();
  const r3 = await pcRows();
  ok('tải lại số mới: cả 2 phiếu "Trùng — bỏ qua", không còn nghi đổi số', r3.every(r => /Trùng/.test(r)) && !(await w.$('.gsSus')), r3.join(' || '));
  await w.click('[data-act=gsAll]'); await apply(); await closeModal(); await stBan();
  ({f} = await lotOf());
  ok('tải lại không thêm phiếu: vẫn 2 phiếu, 7.280 kg', f.pc.length === 2 && tong(f) === 7280);
  ok('nạp lại BẢN CŨ của Sheet (số S-1001): nhận ra qua số cũ, không thêm phiếu', await load(f1));
  await openModal(); const r3b = await pcRows();
  ok('bản cũ: phiếu S-1001 nhận ra là phiếu đã đổi số ("số cũ"), không thành phiếu mới', r3b.every(r => /Trùng|số cũ/.test(r)) && !(await w.$('[data-gssp]:not([disabled])')), r3b.join(' || '));
  await closeModal();

  /* ===== Bước 4: "Là chuyến khác (thêm mới)" ===== */
  ok('nạp Excel lần 3 (S-1002 vắng, có S-1002X cùng ngày/biển/khối lượng)', await load(f3));
  await openModal();
  const r4 = await pcRows();
  ok('S-1002X hiện "Nghi đổi số" (ứng viên S-1002)', r4.some(r => /S-1002X/.test(r) && /Nghi đổi số/.test(r)), r4.join(' || '));
  await w.click('[data-act=gsDsn][data-v=khac]'); await w.waitForTimeout(150);
  ok('chọn "Là chuyến khác": hiện đã chọn và phiếu thành Mới', /Đã chọn là chuyến khác/.test(await w.innerText('.gsSus')) && (await pcRows()).some(r => /S-1002X/.test(r) && /Mới/.test(r)));
  await apply(); await closeModal(); await stBan();
  ({f} = await lotOf());
  ok('"Là chuyến khác": thêm đúng 1 phiếu mới S-1002X (3 phiếu, 11.720 kg), S-1002 giữ nguyên', f.pc.length === 3 && tong(f) === 11720 && f.pc.some(x => x.soPhieu === 'S-1002X') && f.pc.some(x => x.soPhieu === 'S-1002'), f.pc.map(x => x.soPhieu).join(','));
  ok('không phiếu nào có số trùng + ngày trùng', new Set(f.pc.map(x => x.soPhieu + '|' + x.ngay)).size === f.pc.length);
  ok('không có lỗi JavaScript', errs.length === 0, errs.join(' | '));
  await app.close();
  console.log(fail ? 'CÓ ' + fail + ' LỖI' : 'TẤT CẢ ĐẠT'); process.exit(fail ? 1 : 0);
})().catch(e => { console.error('NGOẠI LỆ', e); process.exit(2); });
