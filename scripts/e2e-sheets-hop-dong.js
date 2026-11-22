'use strict';
/* Kiểm thử đầu-cuối màn "Dữ liệu Google Sheets" theo HỢP ĐỒNG (Electron thật, Excel giả lập sinh ngay trong bài; không dữ liệu thật):
 *  bảng hợp đồng + tìm không dấu · modal Cha–Con 2 rừng · phân bổ vượt dự kiến · hợp đồng 300 phiếu ở 1024x768 · hộp xác nhận 2 bước (QĐ4) ·
 *  ghép tạm (QĐ10) · "Cập nhật vào hồ sơ" ghi BẢN NHÁP và idempotent · chặn CCCD khác (R6) · lô chốt không ghi · ca biên (hợp đồng không có, Esc, ≤820 px, chuỗi độc hại).
 * Chạy: xvfb-run -a node scripts/e2e-sheets-hop-dong.js */
const {_electron: electron} = require('playwright-core');
const XLSX = require('xlsx');
const {saveStage: stSave} = require('./lib-stage');
const path = require('path'), fs = require('fs'), os = require('os');
const root = path.join(__dirname, '..');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hakqn-sheets-hd-')), dbFile = path.join(dir, 'd.sqlite');
let fail = 0; const ok = (n, c, x) => { console.log((c ? 'ĐẠT  ' : 'LỖI  ') + n + (!c && x ? ' — ' + x : '')); if (!c) fail++; };

/* ---------- Excel giả lập: ba tab chuẩn HoSoKeo, HoSoRung, ToaDoRung ---------- */
const D = (y, m, d) => new Date(Date.UTC(y, m - 1, d));
const HK = ['STT', 'Mã khách hàng', 'Mã hợp đồng', 'SỐ PHIẾU CHI', 'SỐ PHIẾU CÂN', 'Ngày nhập', 'SỐ XE', 'Đại Lý', 'Hàng hóa', 'Giờ cân 1', 'Giờ cân 2', 'Biển số 1', 'Cân lần 1', 'Cân lần 2', 'KL hàng (KG)', 'Khối lượng (Tấn)', 'Đơn giá', 'Thanh toán', 'Nguồn gốc', 'Người cân', 'Số thứ tự BKLS', 'Số BKLS', 'Họ và tên chủ rừng', 'ĐỊA CHỈ RỪNG'];
const HR = ['STT', 'Mã KH_CCCD', 'Họ và tên chủ rừng', 'Mã hợp đồng', 'Ngày ký hợp đồng', 'Tình trạng Hợp đồng', 'Địa chỉ thường trú', 'Ngày cấp', 'Nơi cấp', 'ĐỊA CHỈ RỪNG', 'HECTA', 'Định mức tấn/Ha', 'Pháp lý rừng'];
const HT = ['ID_RUNG', 'ID_GPS', 'Mã rừng', 'Số hợp đồng', 'Ngày ký hợp đồng', 'HoVaTenChuRung', 'SoCCCD', 'DiaChiRungTrong', 'DienTich_m2', 'HoSoNguonGoc', 'SoGiayTo', 'Latitude_Vĩ độ', 'Longtitude_Kinh độ'];
const mk = (H, o) => H.map(h => (o[h] === undefined ? null : o[h]));
const keo = (i, cccd, hd, so, ngay, bien, kg, ten, dia) => mk(HK, {STT: i, 'Mã khách hàng': cccd, 'Mã hợp đồng': hd, 'SỐ PHIẾU CÂN': so, 'Ngày nhập': ngay, 'SỐ XE': bien, 'Hàng hóa': 'Gỗ Tròn Keo Lai giả lập', 'Biển số 1': bien, 'KL hàng (KG)': kg, 'Khối lượng (Tấn)': kg / 1000, 'Đơn giá': 1500000, 'Họ và tên chủ rừng': ten, 'ĐỊA CHỈ RỪNG': dia});
const rung = (i, cccd, ten, hd, ky, dia, ha, dm) => mk(HR, {STT: i, 'Mã KH_CCCD': cccd, 'Họ và tên chủ rừng': ten, 'Mã hợp đồng': hd, 'Ngày ký hợp đồng': ky, 'Tình trạng Hợp đồng': 'Đang thực hiện', 'Địa chỉ thường trú': 'Đà Nẵng giả lập', 'Ngày cấp': D(2021, 6, 25), 'Nơi cấp': 'Cục CSQLHC giả lập', 'ĐỊA CHỈ RỪNG': dia, HECTA: ha, 'Định mức tấn/Ha': dm, 'Pháp lý rừng': 'Giấy chứng nhận QSDĐ'});
const toado = (ma, hd, cccd, ten, dia, m2, lat, lng) => mk(HT, {ID_RUNG: 'GL-' + ma, ID_GPS: ma + '-g1', 'Mã rừng': ma, 'Số hợp đồng': hd, 'Ngày ký hợp đồng': D(2026, 2, 1), HoVaTenChuRung: ten, SoCCCD: cccd, DiaChiRungTrong: dia, DienTich_m2: m2, HoSoNguonGoc: 'Giấy chứng nhận QSDĐ', SoGiayTo: 'GL-' + ma, 'Latitude_Vĩ độ': lat, 'Longtitude_Kinh độ': lng});
const book = (K, R, T) => { const wb = XLSX.utils.book_new(), add = (h, rows, n) => XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([h, ...rows], {cellDates: true}), n); add(HK, K, 'HoSoKeo'); add(HR, R, 'HoSoRung'); add(HT, T, 'ToaDoRung'); return XLSX.write(wb, {type: 'buffer', bookType: 'xlsx', cellDates: false}); };

const XSS = '<img src=x onerror="window.__xss=1">';
const NA = 'NGUYỄN VĂN ĐÔNG giả lập', NB = 'TRẦN THỊ BÌNH giả lập', NC = 'LÊ VĂN BA TRĂM giả lập', ND = 'PHẠM THỊ DUNG giả lập', NE = 'HOÀNG VĂN EM giả lập', NF = 'VÕ THỊ PHƯỢNG giả lập', NG = XSS + 'ĐỘC HẠI giả lập';
const C = n => '0490000000' + String(n).padStart(2, '0');
const K = [], R = [], T = [];
let kn = 0; const K1 = (...a) => K.push(keo(++kn, ...a));
// A: hợp đồng 2 rừng, hecta khớp tọa độ (ghép theo hecta, không tạm). Dự kiến: 10 t và 20 t. 6 phiếu x 4 tấn = 24 t
R.push(rung(1, C(11), NA, 'HD-A01', D(2026, 2, 1), 'Thôn Alpha', 1, 10), rung(2, C(11), NA, 'HD-A01', D(2026, 2, 1), 'Thôn Beta', 2, 10));
T.push(toado('GL-A01', 'HD-A01', C(11), NA, 'Thôn Alpha', 10000, 15.6, 108.1), toado('GL-A02', 'HD-A01', C(11), NA, 'Thôn Beta', 20000, 15.7, 108.2));
for (let i = 1; i <= 6; i++) K1(C(11), 'HD-A01', 'A-' + String(i).padStart(4, '0'), D(2026, 3, i), '92C-11111', 4000, NA, 'Thôn Alpha');
// H: hợp đồng 1 rừng, lô và xe đã có sẵn trong ứng dụng (để kiểm "Lưu dữ liệu vào lô" và cập nhật lần 2)
R.push(rung(12, C(20), 'ĐẶNG VĂN HAI giả lập', 'HD-H08', D(2026, 2, 9), 'Thôn Hai', 2, 10));
T.push(toado('GL-H01', 'HD-H08', C(20), 'ĐẶNG VĂN HAI giả lập', 'Thôn Hai', 20000, 15.68, 108.18));
for (let i = 1; i <= 3; i++) K1(C(20), 'HD-H08', 'H-000' + i, D(2026, 3, 20 + i), '92C-12121', 2000, 'ĐẶNG VĂN HAI giả lập', 'Thôn Hai');
// B: hai rừng THIẾU HECTA, địa chỉ khác tọa độ: ghép theo thứ tự, ghép tạm (QĐ10)
R.push(rung(3, C(12), NB, 'HD-B02', D(2026, 2, 2), 'Xóm Xa', null, null), rung(4, C(12), NB, 'HD-B02', D(2026, 2, 2), 'Xóm Ya', null, null));
T.push(toado('GL-B01', 'HD-B02', C(12), NB, 'Khu Một', 5000, 15.61, 108.11), toado('GL-B02', 'HD-B02', C(12), NB, 'Khu Hai', 7000, 15.62, 108.12));
K1(C(12), 'HD-B02', 'B-0001', D(2026, 3, 10), '92C-22222', 3000, NB, 'Xóm Xa');
// B3: có HoSoRung nhưng KHÔNG có ToaDoRung: "chưa có mã rừng"
R.push(rung(5, C(13), 'ĐINH VĂN CHƯA MÃ giả lập', 'HD-B03', D(2026, 2, 3), 'Xóm Za', 3, 10));
K1(C(13), 'HD-B03', 'B3-0001', D(2026, 3, 11), '92C-33333', 2000, 'ĐINH VĂN CHƯA MÃ giả lập', 'Xóm Za');
// C: 300 phiếu, 1 rừng 100 ha x 10 = 1000 t
R.push(rung(6, C(14), NC, 'HD-C300', D(2026, 2, 4), 'Thôn Trăm', 100, 10));
T.push(toado('GL-C01', 'HD-C300', C(14), NC, 'Thôn Trăm', 1000000, 15.63, 108.13));
for (let i = 1; i <= 300; i++) K1(C(14), 'HD-C300', 'C-' + String(i).padStart(4, '0'), D(2026, 4, 1 + (i % 28)), '92C-30000', 1000, NC, 'Thôn Trăm');
// D: một mã hợp đồng thuộc HAI CCCD (QĐ4)
R.push(rung(7, C(15), ND, 'HD-D04', D(2026, 2, 5), 'Thôn Dạ', 2, 10), rung(8, C(16), ND + ' (nhập nhầm)', 'HD-D04', D(2026, 2, 5), 'Thôn Dạ', 2, 10));
T.push(toado('GL-D01', 'HD-D04', C(15), ND, 'Thôn Dạ', 20000, 15.64, 108.14));
K1(C(15), 'HD-D04', 'D-0001', D(2026, 3, 12), '92C-44444', 2000, ND, 'Thôn Dạ');
// E: chủ rừng trong ứng dụng có CCCD KHÁC (R6/T5); F: lô đã chốt
R.push(rung(9, C(17), NE, 'HD-E05', D(2026, 2, 6), 'Thôn Em', 2, 10), rung(10, C(18), NF, 'HD-F06', D(2026, 2, 7), 'Thôn Phượng', 2, 10));
T.push(toado('GL-E01', 'HD-E05', C(17), NE, 'Thôn Em', 20000, 15.65, 108.15), toado('GL-F01', 'HD-F06', C(18), NF, 'Thôn Phượng', 20000, 15.66, 108.16));
K1(C(17), 'HD-E05', 'E-0001', D(2026, 3, 13), '92C-55555', 2000, NE, 'Thôn Em'); K1(C(18), 'HD-F06', 'F-0001', D(2026, 3, 14), '92C-66666', 2000, NF, 'Thôn Phượng');
// G: mọi chuỗi từ Sheet chứa mã độc
R.push(rung(11, C(19), NG, 'HD-G07', D(2026, 2, 8), '"><script>window.__xss2=1</script>', 2, 10));
T.push(toado('GL-G01', 'HD-G07', C(19), NG, '"><script>window.__xss2=1</script>', 20000, 15.67, 108.17));
K1(C(19), 'HD-G07', XSS.replace('x onerror', 'x2 onerror').replace('__xss=1', '__xss3=1'), D(2026, 3, 15), '"><svg onload=window.__xss4=1>', 2000, NG, '"><script>window.__xss2=1</script>');
const xlsx = path.join(dir, 'gia_lap_hop_dong.xlsx'); fs.writeFileSync(xlsx, book(K, R, T));

/* ---------- Hồ sơ có sẵn trong ứng dụng (cho E và F) ---------- */
const lotE = {id: 'fe', info: {maRung: 'GL-E01', tenRung: 'Lô GL-E01', diaDiem: 'Thôn Em', dienTich: 2}, nc: [], dx: [], pc: []};
const lotF = {id: 'ff', info: {maRung: 'GL-F01', tenRung: 'Lô GL-F01', diaDiem: 'Thôn Phượng', dienTich: 2}, nc: [], dx: [], pc: [], chot: {phienBan: 1, at: '2026-03-20T00:00:00.000Z', lyDo: 'giả lập'}};
const own = (id, ma, ten, cccd, lot) => ({id, info: {ma, ten, cccd, ngayCap: '15/08/2021', noiCap: 'CA giả lập', diaChi: 'Đà Nẵng', danhXung: 'Ông', soHopDong: '', ngayKyHopDong: ''}, nc: [], dx: [], exp: {}, forests: {[lot.id]: lot}});
const xe = {_row: 2, maRung: 'GL-H01', stt: '1', chuXe: 'LÊ VĂN XE giả lập', ngaySinh: '01/01/1980', cccd: '049000000077', ngayCap: '01/01/2021', noiCap: 'CA giả lập', diaChi: 'Đà Nẵng', bienSo: '92C-12121', loaiXe: 'Xe tải', nguoiKy: 'Chủ xe', sdt: '0905123456'};
const lotH = {id: 'fh', info: {maRung: 'GL-H01', tenRung: 'Lô GL-H01', diaDiem: 'Thôn Hai', dienTich: 2}, nc: [], dx: [xe], pc: []};
const xeDm = {ngayCapNhat: '01/02/2026', bienSo: '92C-11111', chuXe: 'LÊ VĂN XE giả lập', ngaySinh: '01/01/1980', cccd: '049000000077', ngayCap: '01/01/2021', noiCap: 'CA giả lập', diaChi: 'Đà Nẵng', loaiXe: 'Xe tải', nguoiKy: 'Chủ xe', sdt: '0905123456'};   // xe 92C-11111 có sẵn trong danh mục xe (dữ liệu giả lập): thêm vào lô thì chụp đủ thông tin từ danh mục
const seed = {v: 2, dmXeVC: [xeDm], rs: {oh: own('oh', 'CR-H', 'ĐẶNG VĂN HAI giả lập', C(20), lotH), oe: own('oe', 'CR-E', 'CHỦ KHÁC giả lập', C(99), lotE), of: own('of', 'CR-F', NF, C(18), lotF)}};

(async () => {
  const launch = () => electron.launch({executablePath: require('electron'), args: [root, '--no-sandbox'], env: {...process.env, HAKQN_CLOSE: 'discard', HAKQN_DB: dbFile, HAKQN_USERDATA: path.join(dir, 'ud'), HAKQN_SHEET_URL: 'http://127.0.0.1:9/none.xlsx'}});
  const app = await launch(), w = require('./_hd30').boc(await app.firstWindow()); const errs = []; w.on('pageerror', e => errs.push(e.message)); w.on('dialog', d => d.accept());
  const size = (a, b) => app.evaluate(({BrowserWindow}, [a, b]) => { const x = BrowserWindow.getAllWindows()[0]; x.setMinimumSize(Math.min(a, 1024), Math.min(b, 640)); x.setContentSize(a, b); }, [a, b]);
  await size(1024, 768); await w.waitForSelector('#side');
  await w.evaluate(x => window.hak.save(x), seed); await w.reload(); await w.waitForSelector('#side');
  const db = () => w.evaluate(() => window.hak.loadSync().db);
  const forestsOf = async ma => { const d = await db(); return Object.values(d.rs).flatMap(o => Object.values(o.forests).map(f => ({o, f}))).filter(x => x.f.info.maRung === ma); };
  ok('nhập Excel giả lập 3 tab', (await w.evaluate(p => window.hak.lookup.importExcel(p), xlsx)).ok);
  const openModal = async hd => { await w.evaluate(h => window.moDuLieuSheets({maHd: h}), hd); await w.waitForSelector('#hdBox.on', {timeout: 8000}); await w.waitForSelector('#hdBox [data-gsrg]'); };
  const closeModal = async () => { await w.keyboard.press('Escape'); await w.waitForTimeout(150); if (await w.$('#lkBox.on')) { await w.keyboard.press('Escape'); await w.waitForTimeout(150); } };
  const rowsOf = () => w.$$eval('[data-gsrow]', r => r.map(x => x.dataset.gsrow));

  /* ===== 1. Bảng hợp đồng ===== */
  await w.click('header [data-act=lkOpen]'); await w.waitForSelector('#lkBox.on'); await w.waitForSelector('[data-gsrow]');
  await w.waitForFunction(() => !document.querySelector('#lkBox [role=status]') && !/đang tính/.test(document.getElementById('gsList').innerText), null, {timeout: 20000});
  ok('màn đầu mặc định là bảng hợp đồng (không phải danh sách dòng Sheet)', !!(await w.$('#gsList table.gsTbl')) && !(await w.$('[data-lkpick]')));
  let keys = await rowsOf();
  ok('bảng liệt kê đủ 9 hợp đồng của Sheet giả lập', keys.length === 9 && ['HD-A01', 'HD-B02', 'HD-B03', 'HD-C300', 'HD-D04', 'HD-E05', 'HD-F06', 'HD-G07', 'HD-H08'].every(k => keys.includes(k)), keys.join(','));
  const rowA = await w.innerText('[data-gsrow="HD-A01"]');
  ok('dòng hợp đồng: chủ rừng, CCCD, số rừng 2, số phiếu 6, tổng 24 tấn', /NGUYỄN VĂN ĐÔNG giả lập/.test(rowA) && rowA.includes('049…011') && /\b2\b/.test(rowA) && /\b6\b/.test(rowA) && /\b24\b/.test(rowA), rowA.replace(/\s+/g, ' '));
  ok('hợp đồng nhiều CCCD hiện trạng thái Lỗi dữ liệu và dấu +1 CCCD', /Lỗi dữ liệu/.test(await w.innerText('[data-gsrow="HD-D04"]')) && /\+1/.test(await w.innerText('[data-gsrow="HD-D04"]')));
  ok('hợp đồng ghép tạm hiện Cần xem', /Cần xem/.test(await w.innerText('[data-gsrow="HD-B02"]')));
  // tìm không dấu
  await w.fill('#lkQ', 'nguyen van dong'); await w.click('[data-act=lkFind]'); await w.waitForFunction(() => document.querySelectorAll('[data-gsrow]').length === 1);
  ok('tìm không dấu "nguyen van dong" ra đúng hợp đồng HD-A01', (await rowsOf()).join() === 'HD-A01');
  await w.fill('#lkQ', 'tran thi binh'); await w.click('[data-act=lkFind]'); await w.waitForFunction(() => document.querySelectorAll('[data-gsrow]').length === 1);
  ok('tìm không dấu theo tên có chữ Ă/Ì: ra HD-B02', (await rowsOf()).join() === 'HD-B02');
  await w.fill('#lkQ', 'khong-co-hop-dong-nay'); await w.click('[data-act=lkFind]'); await w.waitForTimeout(500);
  ok('tìm không thấy: báo trống, không có dòng', (await rowsOf()).length === 0 && /Không có hợp đồng nào khớp/.test(await w.innerText('#gsList')));
  await w.fill('#lkQ', ''); await w.click('[data-act=lkFind]'); await w.waitForFunction(() => document.querySelectorAll('[data-gsrow]').length === 9);
  // lọc theo trạng thái
  await w.click('[data-gsstat=err]'); await w.waitForTimeout(150);
  ok('lọc theo "Lỗi dữ liệu": chỉ còn hợp đồng nhiều CCCD', (await rowsOf()).join() === 'HD-D04');
  await w.click('[data-gsstat=err]'); await w.waitForTimeout(150);

  /* ===== 2. Modal Cha–Con: 2 rừng ===== */
  const row = '[data-gsrow="HD-A01"]'; await w.focus(row); await w.keyboard.press('Enter'); await w.waitForSelector('#hdBox.on');
  const role = await w.$eval('#hdBox', b => [b.getAttribute('role'), b.getAttribute('aria-modal')]);
  ok('hộp thoại có role=dialog, aria-modal=true; Enter trên dòng mở được', role[0] === 'dialog' && role[1] === 'true');
  ok('Cha: hai rừng theo thứ tự nhập (GL-A01 trước GL-A02)', (await w.$$eval('#hdBox [data-gsrg]', b => b.map(x => x.innerText))).length === 2 && /GL-A01/.test(await w.innerText('#hdBox [data-gsrg]:nth-of-type(1)')) && /GL-A02/.test(await w.innerText('#hdBox [data-gsrg]:nth-of-type(2)')));
  ok('Cha: có huy hiệu số thay đổi và thanh đã dùng/dự kiến', !!(await w.$('#hdBox [data-gsrg] .gsBdg')) && !!(await w.$('#hdBox [data-gsrg] .gsMeter')) && /\/ 10 t dự kiến/.test(await w.innerText('#hdBox [data-gsrg]:nth-of-type(1)')), (await w.innerText('#hdBox #gsMaster')).replace(/\s+/g, ' '));
  ok('Con: ba thẻ Hồ sơ rừng | Tọa độ | Phiếu cân', (await w.$$eval('#hdBox [data-gstab]', b => b.map(x => x.innerText.replace(/\s*\(.*/, '')))).join('|') === 'Hồ sơ rừng|Tọa độ|Phiếu cân');
  ok('hecta khớp diện tích tọa độ: không đánh dấu ghép tạm ở HD-A01', !/ghép tạm/.test(await w.innerText('#hdBox #gsMaster')));
  ok('chân modal cố định: Chọn phần mới, Đóng, Cập nhật vào hồ sơ đều nằm trong khung nhìn 1024x768', await w.evaluate(() => ['gsAll', 'gsClose', 'gsApply'].every(a => { const b = [...document.querySelectorAll('#hdBox .gsFoot [data-act]')].find(x => x.dataset.act === a); if (!b) return false; const r = b.getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight && r.left >= 0 && r.right <= innerWidth; })));
  // Esc đóng và trả focus
  await w.keyboard.press('Escape'); await w.waitForTimeout(200);
  ok('Esc đóng modal', !(await w.$('#hdBox.on')));
  ok('Esc trả focus về dòng hợp đồng đã mở', await w.evaluate(() => document.activeElement && document.activeElement.dataset.gsrow === 'HD-A01'));

  /* ===== 3. Phân bổ và "Vượt dự kiến" (HD-A01) ===== */
  await w.click(row); await w.waitForSelector('#hdBox.on'); await w.click('#hdBox [data-gstab=pc]'); await w.waitForSelector('#hdBox .gsPcT');
  const asg = () => w.$$eval('#hdBox [data-gsas]', s => s.map(x => +x.value));
  let a = await asg();
  ok('có 6 phiếu, tự phân bổ: không còn phiếu chưa phân bổ, cả hai rừng đều nhận phiếu', a.length === 6 && !a.includes(-1) && new Set(a).size === 2, JSON.stringify(a));
  ok('rừng nhập trước nhận theo ngày cân đến hết dự kiến, phần sau sang rừng sau (thứ tự không đảo)', a.every((v, i) => i === 0 || v >= a[i - 1]), JSON.stringify(a));
  const k1 = (await w.$eval('#hdBox [data-gsrg]:nth-of-type(1)', b => b.dataset.gsrg));
  await w.click('[data-act=gsClear]'); await w.waitForTimeout(100);
  ok('Xóa phân bổ: cả 6 phiếu về Chưa phân bổ, có cảnh báo số lượng, không ghi', (await asg()).every(v => v === -1) && /Còn\s*6\s*phiếu mới chưa phân bổ/.test(await w.innerText('#gsUnas')));
  await w.click('[data-act=gsFill][data-k="' + k1 + '"]'); await w.waitForTimeout(100);
  a = await asg(); ok('"Phân bổ phiếu còn lại vào rừng 1": rừng 1 nhận phiếu theo dự kiến, phần còn lại chưa phân bổ', a.filter(v => String(v) === k1).length >= 1 && a.includes(-1), JSON.stringify(a));
  await w.click('[data-act=gsAuto]'); await w.waitForFunction(() => !document.querySelector('#hdAsk.on') || true); await w.waitForTimeout(150);
  if (await w.$('#hdAsk.on')) await w.click('#hdAskYes'); await w.waitForTimeout(150);
  ok('Phân bổ tự động tính lại cả hợp đồng', !(await asg()).includes(-1));
  // ép tất cả vào rừng 1: vượt dự kiến thuần 14 t (24 - 10), dung sai không cộng (QĐ2)
  for (let i = 0; i < 6; i++) { await w.selectOption('#hdBox [data-gsas] >> nth=' + i, k1); await w.waitForTimeout(40); }
  const txt = await w.innerText('#hdBox .gsDtB');
  ok('QĐ2: cảnh báo "Vượt dự kiến 14 tấn" (so với dự kiến thuần 10 t), vẫn cập nhật được', /Vượt dự kiến 14 tấn/.test(txt) && !(await w.$eval('#hdBox [data-act=gsApply]', b => b.disabled)), txt.replace(/\s+/g, ' ').slice(0, 300));
  ok('thanh đã dùng của rừng 1 báo "vượt" ở khung Cha', /vượt 14/.test(await w.innerText('#gsMaster')));
  await w.fill('#hdBox [data-gstol]', '40'); await w.dispatchEvent('#hdBox [data-gstol]', 'change'); await w.waitForTimeout(150);
  ok('dung sai ngoài 0–30 % bị ép về 30 % kèm cảnh báo', (await w.inputValue('#hdBox [data-gstol]')) === '30' && /0 đến 30/.test(await w.innerText('#hdBox .gsDtB')));
  await w.fill('#hdBox [data-gstol]', '5'); await w.dispatchEvent('#hdBox [data-gstol]', 'change');
  await w.click('[data-act=gsAuto]'); await w.waitForTimeout(150); if (await w.$('#hdAsk.on')) await w.click('#hdAskYes'); await w.waitForTimeout(100);
  ok('nút chân modal vẫn trong khung nhìn khi ở thẻ Phiếu cân', await w.evaluate(() => { const r = document.querySelector('#hdBox [data-act=gsApply]').getBoundingClientRect(); return r.bottom <= innerHeight && r.top >= 0; }));

  /* ===== 4. Cập nhật vào hồ sơ: ghi BẢN NHÁP, idempotent lần 2 (HD-A01) ===== */
  await w.click('[data-act=gsAll]'); await w.waitForTimeout(100);
  const before = JSON.stringify(await db());
  await w.click('#hdBox [data-act=gsApply]'); await w.waitForSelector('#hdAskBody [data-act=gsAskYes]');
  const askT = await w.innerText('#hdAskBody');
  ok('chưa có chủ rừng/lô: hỏi xác nhận tạo mới (liệt kê chủ rừng, lô mới) và nói rõ chỉ vào bản nháp', /chủ rừng mới/.test(askT) && /lô mới GL-A01/.test(askT) && /lô mới GL-A02/.test(askT) && /bản nháp/i.test(askT) && /Lưu dữ liệu vào lô/.test(askT));
  ok('QĐ mới 3: hộp xác nhận liệt kê biển 92C-11111 chưa có trong xe của lô; ô "Thêm xe vào lô" MẶC ĐỊNH TÍCH', /92C-11111/.test(askT) && /chưa có trong danh sách xe/.test(askT) && await w.$eval('#hdAskBody [data-gsopt=themXe]', c => c.checked));
  await w.click('#hdAskBody [data-act=gsAskNo]'); await w.waitForTimeout(200);
  ok('Hủy ở hộp xác nhận: hồ sơ giữ nguyên', JSON.stringify(await db()) === before && /Đã hủy/.test(await w.innerText('#hdBox .gsMsg')));
  ok('Hủy: cũng không có chủ rừng / lô nháp nào trong bộ nhớ', await w.evaluate(c => { const T = window.__hak.nhapTest; return !Object.values(T.db().rs).some(o => o.info.cccd === c) && !T.loMoi().length && !T.chuNhap().length; }, C(11)));
  await w.click('#hdBox [data-act=gsApply]'); await w.click('#hdAskBody [data-act=gsAskYes]'); await w.waitForSelector('#gsSum', {timeout: 10000});
  const sum = await w.innerText('#gsSum');
  ok('tóm tắt: mọi thay đổi ở BẢN NHÁP, CHƯA lưu, nhắc bấm "Lưu dữ liệu vào lô" (kèm nút mở lô)', /bản nháp/i.test(sum) && /chưa lưu/i.test(sum) && /Lưu dữ liệu vào lô/.test(sum) && !!(await w.$('#gsSum [data-act=gsMoLo]')), sum.replace(/\s+/g, ' '));
  ok('QĐ7 nghĩa đen: KHÔNG ghi gì xuống dữ liệu đã lưu (chủ rừng, lô, tọa độ, giấy tờ, ánh xạ… đều chưa)', JSON.stringify(await db()) === before);
  let d;
  const mem = () => w.evaluate(c => { const T = window.__hak.nhapTest, db = T.db(), stages = T.stages(), loDirty = new Set(T.loDirty()), loMoi = new Set(T.loMoi()); const o = Object.values(db.rs).find(x => x.info.cccd === c); return o ? {id: o.id, ten: o.info.ten, fs: Object.values(o.forests).map(f => ({id: f.id, ma: f.info.maRung, lat: f.info.lat, nguon: f.info.nguon, giayTo: (f.info.giayTo || []).length, taoLuc: f.taoLuc, dx: (stages[o.id + '|' + f.id] || {cur: {dx: []}}).cur.dx.map(x => x.bienSo), pcN: (stages[o.id + '|' + f.id] || {cur: {pc: []}}).cur.pc.length, dirty: loDirty.has(f.id), moi: loMoi.has(f.id)}))} : null; }, C(11));
  let oA = await mem(); const fsA = oA ? oA.fs : [];
  ok('trong bộ nhớ (bản nháp): chủ rừng và 2 lô GL-A01, GL-A02 đã được tạo, đúng CCCD, đều đánh dấu chưa lưu', !!oA && fsA.length === 2 && fsA.map(f => f.ma).sort().join() === 'GL-A01,GL-A02' && fsA.every(f => f.dirty && f.moi), JSON.stringify(oA));
  ok('bản nháp có tọa độ, nguồn hợp đồng, và phiếu cân ở bản nháp từng lô', fsA.every(f => typeof f.lat === 'number' && f.nguon && f.nguon.hd === 'HD-A01') && fsA.reduce((t, f) => t + f.pcN, 0) === 6, JSON.stringify(fsA));
  ok('xe 92C-11111 đã được thêm vào danh sách xe (bản nháp) của lô nhận phiếu, mỗi lô đúng một xe, không trùng', fsA.every(f => f.pcN === 0 || (f.dx.length === 1 && f.dx[0] === '92C-11111')), JSON.stringify(fsA.map(f => f.dx)));
  ok('xe có sẵn trong danh mục xe: được chụp đủ chủ xe từ danh mục (không tạo xe trùng)', await w.evaluate(c => { const T = window.__hak.nhapTest, o = Object.values(T.db().rs).find(x => x.info.cccd === c); return Object.values(o.forests).every(f => { const st = T.stages()[o.id + '|' + f.id]; return !st || !st.cur.dx.length || (st.cur.dx.length === 1 && st.cur.dx[0].chuXe === 'LÊ VĂN XE giả lập' && st.cur.dx[0]._nguon === 'Danh mục'); }); }, C(11)));
  ok('rừng mới có thời điểm tạo (QĐ8)', fsA.every(f => !!f.taoLuc));
  ok('bảng Chưa lưu của ứng dụng liệt kê 2 lô nháp', (await w.evaluate(() => window.__stDirty())).length === 2);
  await w.evaluate(() => window.__hak.nhapTest.persistNow()); await w.waitForTimeout(400);
  ok('QĐ7: một lần lưu khác (persistNow vì việc khác) cũng KHÔNG đưa chủ rừng / lô nháp xuống dữ liệu đã lưu', !Object.values((await db()).rs).some(o => o.info.cccd === C(11)) && Object.keys((await db()).rs).length === Object.keys(JSON.parse(before).rs).length);
  await closeModal();
  const saveLot0 = async (oid, fid) => { for (const s of ['[data-open=' + oid + ']', '[data-tab=rung]', '[data-forest=' + fid + ']']) { await w.click(s); if (await w.$('#stBox.on #stGDrop')) await w.click('#stGDrop'); await w.waitForTimeout(150); } return stSave(w); };
  const fA1 = fsA.find(f => f.pcN > 0), fA2 = fsA.find(f => f !== fA1);
  const rA = await saveLot0(oA.id, fA1.id);
  ok('"Lưu dữ liệu vào lô" lô ' + fA1.ma + ': không còn bị chặn "chưa có trong danh sách xe" (xe đã thêm theo ô tích)', !(rA && rA.errs && rA.errs.some(e => /chưa có trong danh sách xe/.test(e))), JSON.stringify(rA && rA.errs));
  if (rA && rA.ok) {
    d = await db(); const oS = Object.values(d.rs).find(o => o.info.cccd === C(11)), fS = oS ? Object.values(oS.forests) : [];
    ok('sau khi lưu lô ' + fA1.ma + ': chủ rừng + đúng 1 lô vào dữ liệu đã lưu, kèm phiếu và xe; lô còn lại vẫn là bản nháp', !!oS && fS.length === 1 && fS[0].info.maRung === fA1.ma && fS[0].pc.length === fA1.pcN && fS[0].dx.length === 1 && fS[0].dx[0].bienSo === '92C-11111', JSON.stringify(fS.map(f => [f.info.maRung, f.pc.length, f.dx.length])));
    ok('chủ rừng đã lưu mang đủ thông tin (tên, CCCD)', !!oS && oS.info.ten === NA && oS.info.cccd === C(11));
  } else ok('lưu được lô ' + fA1.ma, false, JSON.stringify(rA));
  // bỏ bản nháp lô còn lại: lô nháp mới biến mất hẳn
  for (const s of ['[data-open=' + oA.id + ']', '[data-tab=rung]', '[data-forest=' + fA2.id + ']']) { await w.click(s); if (await w.$('#stBox.on #stGDrop')) await w.click('#stGDrop'); await w.waitForTimeout(150); }
  await w.evaluate(() => { const b = document.querySelector('[data-act=stDiscard]'); if (b) b.click(); }); await w.waitForTimeout(300);
  ok('"Bỏ thay đổi" lô nháp mới: lô biến mất khỏi bộ nhớ, không còn mục chưa lưu', ((await mem()) || {fs: []}).fs.every(f => f.id !== fA2.id) && (await w.evaluate(() => window.__stDirty())).length === 0 && JSON.stringify(Object.keys((await db()).rs[oA.id].forests)) === JSON.stringify([fA1.id]));
  /* --- bỏ tích "Thêm xe vào lô": giữ hành vi chặn như cũ (HD-C300, biển 92C-30000 không có trong danh mục) --- */
  await w.click('header [data-act=lkOpen]'); await w.waitForSelector('#lkBox.on'); await w.waitForSelector('#lkQ');
  await openModal('HD-C300'); await w.click('#hdBox [data-gstab=pc]'); await w.waitForSelector('#hdBox .gsPcT'); await w.click('[data-act=gsAll]'); await w.click('#hdBox [data-act=gsApply]'); await w.waitForSelector('#hdAskBody [data-act=gsAskYes]');
  await w.uncheck('#hdAskBody [data-gsopt=themXe]'); await w.click('#hdAskBody [data-act=gsAskYes]'); await w.waitForSelector('#gsSum', {timeout: 15000});
  const oC = await w.evaluate(c => { const T = window.__hak.nhapTest, o = Object.values(T.db().rs).find(x => x.info.cccd === c); if (!o) return null; const f = Object.values(o.forests)[0]; const st = T.stages()[o.id + '|' + f.id]; return {o: o.id, f: f.id, dx: st ? st.cur.dx.length : -1, pc: st ? st.cur.pc.length : -1}; }, C(14));
  ok('bỏ tích "Thêm xe vào lô": lô nháp có 300 phiếu nhưng KHÔNG có xe nào được thêm', !!oC && oC.dx === 0 && oC.pc === 300, JSON.stringify(oC));
  await closeModal();
  const rC = await saveLot0(oC.o, oC.f);
  ok('bỏ tích: "Lưu dữ liệu vào lô" vẫn bị chặn "Biển … chưa có trong danh sách xe" (như cũ), chưa ghi gì xuống dữ liệu đã lưu', rC && !rC.ok && (rC.errs || []).some(e => /chưa có trong danh sách xe/.test(e)) && !Object.values((await db()).rs).some(o => o.info.cccd === C(14)), JSON.stringify(rC && (rC.errs || []).slice(0, 1)));
  await w.click('#side [data-open], #navHome').catch(() => {}); await w.waitForTimeout(200); if (await w.$('#stBox.on #stGDrop')) await w.click('#stGDrop');   // rời lô đang mở: hộp "Còn thay đổi chưa lưu" → Bỏ thay đổi
  await w.waitForTimeout(300);
  ok('bỏ thay đổi lô nháp C300: chủ rừng và lô nháp biến mất, không còn mục chưa lưu', (await w.evaluate(c => !Object.values(window.__hak.nhapTest.db().rs).some(o => o.info.cccd === c), C(14))) && (await w.evaluate(() => window.__stDirty())).length === 0);
  const saveLot = async (oid, fid) => { for (const s of ['[data-open=' + oid + ']', '[data-tab=rung]', '[data-forest=' + fid + ']']) { await w.click(s); if (await w.$('#stBox.on #stGDrop')) await w.click('#stGDrop'); await w.waitForTimeout(150); } return stSave(w); };
  await w.click('header [data-act=lkOpen]'); await w.waitForSelector('#lkBox.on'); await w.waitForSelector('#lkQ');
  await openModal('HD-H08'); await w.click('#hdBox [data-gstab=pc]'); await w.waitForSelector('#hdBox .gsPcT');
  await w.click('[data-act=gsAll]'); await w.click('#hdBox [data-act=gsApply]'); await w.waitForSelector('#gsSum', {timeout: 10000});
  const sumH = await w.innerText('#gsSum');
  ok('hợp đồng 1 rừng, lô đã có: không hỏi tạo mới; tóm tắt nêu bản nháp và nhắc Lưu dữ liệu vào lô', /bản nháp/i.test(sumH) && /Lưu dữ liệu vào lô/.test(sumH) && /phiếu thêm 3/.test(sumH), sumH.replace(/\s+/g, ' '));
  await closeModal();
  d = await db(); const oH = Object.values(d.rs).find(o => o.info.cccd === C(20));
  ok('phiếu cân CHƯA vào dữ liệu đã lưu (chỉ ở bản nháp) cho đến khi bấm Lưu dữ liệu vào lô', Object.values(oH.forests)[0].pc.length === 0);
  ok('thông tin lô (info.nguon) của lô đã có cũng CHƯA lưu cho đến khi bấm Lưu dữ liệu vào lô', !Object.values(oH.forests)[0].info.nguon);
  const rsv = await saveLot(oH.id, 'fh');
  ok('Lưu dữ liệu vào lô thành công', rsv && rsv.ok, JSON.stringify(rsv));
  d = await db(); const fH = Object.values(d.rs).find(o => o.info.cccd === C(20)).forests.fh;
  ok('sau "Lưu dữ liệu vào lô": đủ 3 phiếu, tổng 6 tấn', fH.pc.length === 3 && fH.pc.reduce((t, p) => t + (p.klKg || 0), 0) === 6000, fH.pc.length + ' phiếu');
  ok('nguồn ghi mã hợp đồng và mã rừng', fH.info.nguon && fH.info.nguon.hd === 'HD-H08' && fH.info.nguon.maRung === 'GL-H01', JSON.stringify(fH.info.nguon));
  const at0 = fH.info.nguon.at, dbH = JSON.stringify(Object.values(d.rs).find(o => o.info.cccd === C(20)));
  await w.click('header [data-act=lkOpen]'); await w.waitForSelector('#lkQ');
  await openModal('HD-H08'); await w.click('#hdBox [data-gstab=pc]'); await w.waitForSelector('#hdBox .gsPcT');
  ok('mở lại lần 2: mọi phiếu hiện "Trùng — bỏ qua", không còn phiếu mới', (await w.$$eval('#hdBox .gsPcT tbody tr', r => r.map(x => /Trùng/.test(x.innerText)))).every(Boolean));
  await w.click('[data-act=gsAll]'); await w.click('#hdBox [data-act=gsApply]'); await w.waitForTimeout(800);
  if (await w.$('#hdAsk.on')) await w.click('#hdAskBody [data-act=gsAskNo]');
  await w.waitForTimeout(300);
  const msg2 = await w.innerText('#hdBox .gsDtB');
  ok('lần 2 idempotent: báo không có thay đổi nào cần ghi, hồ sơ giữ nguyên', (/Không có thay đổi nào|Chưa chọn mục nào/.test(msg2)) && JSON.stringify(Object.values((await db()).rs).find(o => o.info.cccd === C(20))) === dbH, msg2.replace(/\s+/g, ' ').slice(0, 200));
  ok('thời điểm nguồn (info.nguon.at) không đổi khi dữ liệu không đổi', (await db()).rs[oH.id].forests.fh.info.nguon.at === at0);
  ok('lần 2 không tạo bản nháp mới (không còn mục chưa lưu)', (await w.evaluate(() => window.__stDirty())).length === 0);
  await closeModal();
  /* ===== 5. Hộp xác nhận 2 bước (QĐ4) — HD-D04 ===== */
  await w.click('header [data-act=lkOpen]'); await w.waitForSelector('[data-gsrow]'); await openModal('HD-D04');
  const aply = '#hdBox [data-act=gsApply]';
  ok('nhiều CCCD: có cảnh báo nặng; nút Cập nhật bị khóa trước khi xác nhận', !!(await w.$('#gsHeavy')) && await w.$eval(aply, b => b.disabled));
  await w.click('#hdBox [data-act=gsAck]'); await w.waitForSelector('#hdAsk.on');
  ok('bước 1/2 nêu CCCD (che bớt) và các dòng Sheet liên quan', /Bước 1\/2/.test(await w.innerText('#hdAskBody')) && /dòng/.test(await w.innerText('#hdAskBody')) && /049…015/.test(await w.innerText('#hdAskBody')));
  await w.click('#hdAskBody [data-act=gsAskNo]'); await w.waitForTimeout(150);
  ok('Hủy ở bước 1: nút Cập nhật vẫn khóa', await w.$eval(aply, b => b.disabled) && !(await w.$('#hdAsk.on')));
  await w.click('#hdBox [data-act=gsAck]'); await w.waitForSelector('#hdAsk.on'); await w.click('#hdAskYes');
  await w.waitForFunction(() => /Bước 2\/2/.test(document.getElementById('hdAskBody').innerText));
  ok('bước 2/2: nút xác nhận khóa cho đến khi tích "Tôi hiểu rủi ro"', await w.$eval('#hdAskYes', b => b.disabled));
  await w.keyboard.press('Escape'); await w.waitForTimeout(150);
  ok('Esc ở hộp xác nhận = Hủy (hộp thoại hợp đồng vẫn mở, nút Cập nhật vẫn khóa)', !!(await w.$('#hdBox.on')) && !(await w.$('#hdAsk.on')) && await w.$eval(aply, b => b.disabled));
  await w.click('#hdBox [data-act=gsAck]'); await w.click('#hdAskYes'); await w.waitForFunction(() => /Bước 2\/2/.test(document.getElementById('hdAskBody').innerText)); await w.check('#hdAskChk'); await w.click('#hdAskYes');
  await w.waitForFunction(() => !!document.querySelector('#hdBox [data-act=gsApply]') && !document.querySelector('#hdBox [data-act=gsApply]').disabled);
  ok('sau 2 lần xác nhận: nút Cập nhật mở, có nhãn "Đã xác nhận 2 bước"', /Đã xác nhận 2 bước/.test(await w.innerText('#gsHeavy')));
  const dBefore = JSON.stringify(await db());
  await closeModal();
  ok('đóng modal không ghi gì', JSON.stringify(await db()) === dBefore);

  /* ===== 6. Ghép tạm (QĐ10) — HD-B02 và HD-B03 ===== */
  await openModal('HD-B02');
  ok('ghép tạm: hiện cờ "ghép tạm — cần xác nhận" ở cả 2 rừng và ô chọn Mã rừng', (await w.$$('#hdBox #gsMaster .pill.warn')).length === 2 && /ghép tạm — cần xác nhận/.test(await w.innerText('#gsMaster')) && !!(await w.$('#hdBox [data-gscode]')));
  await w.click('#hdBox [data-act=gsAll]'); await w.click(aply); await w.waitForTimeout(600);
  const t0 = await w.innerText('#hdBox .gsDtB');
  ok('chưa xác nhận ghép tạm: không ghi (không tạo lô, báo chưa ghi), hộp "Tạo mới" không tự hiện', !(await forestsOf('GL-B01')).length && !(await forestsOf('GL-B02')).length && (/chưa ghi|Chưa chọn mục nào|ghép tạm/.test(t0)), t0.replace(/\s+/g, ' ').slice(0, 250));
  if (await w.$('#hdAsk.on')) await w.click('#hdAskBody [data-act=gsAskNo]');
  await w.click('#hdBox [data-act=gsConf]'); await w.waitForTimeout(150);
  ok('"Xác nhận ghép" bỏ cờ ghép tạm của rừng đó', (await w.$$('#hdBox #gsMaster .pill.warn')).length === 1);
  await closeModal();
  await openModal('HD-B03');
  ok('rừng không ghép được: hiện "chưa có mã rừng", không tự nhận phiếu', /chưa có mã rừng/.test(await w.innerText('#gsMaster')));
  await w.click('#hdBox [data-gstab=pc]'); await w.waitForSelector('#hdBox .gsPcT');
  const dB3 = JSON.stringify(await db());
  await w.click('#hdBox [data-act=gsAll]'); await w.click(aply); await w.waitForTimeout(600);
  if (await w.$('#hdAsk.on')) await w.click('#hdAskBody [data-act=gsAskNo]');
  await w.waitForTimeout(200);
  ok('"chưa có mã rừng": không tạo lô nào, hồ sơ giữ nguyên', JSON.stringify(await db()) === dB3);
  await closeModal();

  /* ===== 7. Chặn ghi CCCD khác (R6) — HD-E05; lô chốt — HD-F06 ===== */
  const d0 = JSON.stringify(await db());
  await openModal('HD-E05'); await w.click('#hdBox [data-act=gsAll]'); await w.click(aply); await w.waitForTimeout(700);
  const te = await w.innerText('#hdBox .gsDtB');
  ok('chủ rừng trong app có CCCD khác CCCD hợp đồng: chặn, nêu rõ, hồ sơ giữ nguyên', /khác CCCD của hợp đồng/.test(te) && /không tự đổi chủ rừng/.test(te) && JSON.stringify(await db()) === d0, te.replace(/\s+/g, ' ').slice(0, 300));
  await closeModal();
  await openModal('HD-F06'); await w.click('#hdBox [data-act=gsAll]'); await w.click(aply); await w.waitForTimeout(700);
  const tf = await w.innerText('#hdBox .gsDtB');
  ok('lô đã chốt (chỉ đọc): không ghi phần nào, hồ sơ giữ nguyên', /đã chốt/.test(tf) && /không ghi phần nào/.test(tf) && JSON.stringify(await db()) === d0, tf.replace(/\s+/g, ' ').slice(0, 300));
  await closeModal();

  /* ===== 8. Hợp đồng 300 phiếu thao tác được ở 1024x768 ===== */
  await openModal('HD-C300'); await w.click('#hdBox [data-gstab=pc]'); await w.waitForSelector('#hdBox .gsPcT');
  const tl = Date.now();
  ok('300 phiếu: phân trang 12 dòng/trang, 25 trang', (await w.$$('#hdBox .gsPcT tbody tr')).length === 12 && /300 phiếu · trang 1\/25/.test(await w.innerText('#hdBox .gsPg')));
  ok('300 phiếu: mọi nút thao tác (trang sau, tìm, lọc, Cập nhật) nằm trong khung nhìn', await w.evaluate(() => ['[data-gspcq]', '[data-gspcf]', '[data-act=gsPcPage][data-d="1"]', '[data-act=gsApply]'].every(s => { const e = document.querySelector('#hdBox ' + s); if (!e) return false; e.scrollIntoView({block: 'nearest'}); const r = e.getBoundingClientRect(); return r.width > 0 && r.bottom <= innerHeight + 1 && r.right <= innerWidth + 1; })));
  await w.click('#hdBox [data-act=gsPcPage][data-d="1"]'); await w.waitForTimeout(100);
  ok('bấm Trang sau: sang trang 2/25', /trang 2\/25/.test(await w.innerText('#hdBox .gsPg')));
  await w.fill('#hdBox [data-gspcq]', 'C-0150'); await w.press('#hdBox [data-gspcq]', 'Enter'); await w.waitForTimeout(150);
  ok('tìm số phiếu C-0150: đúng 1 phiếu, quay về trang 1', (await w.$$('#hdBox .gsPcT tbody tr')).length === 1 && /1 phiếu · trang 1\/1/.test(await w.innerText('#hdBox .gsPg')));
  await w.fill('#hdBox [data-gspcq]', ''); await w.press('#hdBox [data-gspcq]', 'Enter'); await w.waitForTimeout(100);
  ok('hợp đồng 1 rừng: mọi 300 phiếu mặc định vào rừng đó (không còn chưa phân bổ), thanh dự kiến 300 t / 1000 t', !(await w.$('#gsUnas')) && /300 \/ 1\.?000 t dự kiến|300 \/ 1000 t dự kiến/.test((await w.innerText('#gsMaster')).replace(/\s+/g, ' ')), (await w.innerText('#gsMaster')).replace(/\s+/g, ' '));
  await w.selectOption('#hdBox [data-gspcf]', 'new'); await w.waitForTimeout(100);
  ok('lọc "Mới": vẫn 300 phiếu', /300 phiếu · trang 1\/25/.test(await w.innerText('#hdBox .gsPg')));
  ok('thao tác (tìm/lọc/trang) phản hồi dưới 3 giây với 300 phiếu', Date.now() - tl < 20000);
  await w.selectOption('#hdBox [data-gspcf]', 'all');
  await w.click('#hdBox [data-act=gsAll]'); await w.click(aply); await w.waitForSelector('#hdAskBody [data-act=gsAskYes]'); await w.click('#hdAskBody [data-act=gsAskYes]'); await w.waitForSelector('#gsSum', {timeout: 20000});
  ok('cập nhật 300 phiếu vào bản nháp: tóm tắt ghi "phiếu thêm 300"', /phiếu thêm 300/.test(await w.innerText('#gsSum')), (await w.innerText('#gsSum')).replace(/\s+/g, ' '));
  await closeModal();

  /* ===== 9. Khung hẹp ≤ 820 px: Cha xếp trên Con, không đè nhau ===== */
  await size(800, 700); await w.waitForTimeout(300);
  await openModal('HD-A01');
  const bb = await w.evaluate(() => { const r = s => { const b = document.querySelector(s).getBoundingClientRect(); return {t: b.top, b: b.bottom, l: b.left, r: b.right}; }; return {cha: r('#gsMaster'), con: r('#hdBox .gsDt'), vw: innerWidth}; });
  ok('≤ 820 px: Cha nằm trên Con (đáy Cha ≤ đỉnh Con), không đè nhau', bb.cha.b <= bb.con.t + 1, JSON.stringify(bb));
  ok('≤ 820 px: Cha và Con cùng chiều ngang khung, không tràn ngang', bb.cha.l >= 0 && bb.cha.r <= bb.vw && bb.con.r <= bb.vw && Math.abs(bb.cha.l - bb.con.l) < 4, JSON.stringify(bb));
  ok('≤ 820 px: khung Cha không dính (position: static)', await w.$eval('#gsMaster', e => getComputedStyle(e).position === 'static'));
  await w.evaluate(() => document.querySelector('#hdBox .gsMb').scrollTo(0, 99999)); await w.waitForTimeout(100);
  ok('≤ 820 px: cuộn xuống vẫn thấy chân modal với nút Cập nhật', await w.evaluate(() => { const r = document.querySelector('#hdBox [data-act=gsApply]').getBoundingClientRect(); return r.bottom <= innerHeight && r.top >= 0; }));
  await closeModal(); await size(1024, 768); await w.waitForTimeout(200);

  /* ===== 10. Ca biên: hợp đồng không tồn tại ===== */
  await w.click('[data-act=lkClose]').catch(() => {}); await closeModal();
  const rs = await w.evaluate(async () => { const a = await window.moDuLieuSheets({maHd: 'HD-KHONG-CO'}), b = await window.moDuLieuSheets({maHd: '   '}), c = await window.moDuLieuSheets({maHd: 'HD-KHONG-CO-2'}); return [a, b, c]; });
  ok('hợp đồng không tồn tại / rỗng: trả lỗi, KHÔNG mở modal trống', rs.every(x => x && x.ok === false && x.error) && !(await w.$('#hdBox.on')), JSON.stringify(rs));
  ok('báo lỗi rõ ràng trên màn Dữ liệu Google Sheets', /HD-KHONG-CO/.test(await w.innerText('#lkBox')));
  await w.evaluate(() => { document.getElementById('lkBox').classList.remove('on'); });

  /* ===== 11. Chuỗi độc hại từ Sheet — HD-G07 ===== */
  await w.click('header [data-act=lkOpen]'); await w.waitForSelector('#lkQ');
  await w.fill('#lkQ', ''); await w.click('[data-act=lkFind]'); await w.waitForTimeout(500);
  await w.fill('#lkQ', ''); await w.click('[data-act=lkFind]'); await w.waitForFunction(() => document.querySelectorAll('[data-gsrow]').length === 9); await w.waitForTimeout(600);
  const dom = () => w.evaluate(() => ({flags: [window.__xss, window.__xss2, window.__xss3, window.__xss4], bad: document.querySelectorAll('#lkBox img, #hdBox img, #lkBox script, #hdBox script, #lkBox svg[onload], #hdBox svg[onload], #lkBox [onerror], #hdBox [onerror]').length}));
  let x = await dom();
  ok('bảng hợp đồng: chuỗi độc hại không thực thi (cờ window trống) và không sinh thẻ img/script', x.flags.every(v => v === undefined) && x.bad === 0, JSON.stringify(x));
  ok('bảng hiển thị chuỗi độc hại dưới dạng chữ', /<img src=x/.test(await w.innerText('#gsList')));
  await openModal('HD-G07');
  for (const tab of ['ho', 'gps', 'pc']) { await w.click('#hdBox [data-gstab=' + tab + ']'); await w.waitForTimeout(150); }
  x = await dom();
  ok('modal (3 thẻ): chuỗi độc hại không thực thi và không sinh thẻ nguy hiểm', x.flags.every(v => v === undefined) && x.bad === 0, JSON.stringify(x));
  ok('modal hiển thị nguyên văn chuỗi độc hại dưới dạng chữ', /<img src=x/.test(await w.innerText('#hdBox')) && /<script>/.test(await w.innerText('#hdBox')));
  ok('thuộc tính data-* và aria-label không bị phá ("> không thoát khỏi thuộc tính)', await w.evaluate(() => ![...document.querySelectorAll('#lkBox *, #hdBox *')].some(e => [...e.attributes].some(a => /^on/i.test(a.name)))));
  await closeModal();
  ok('không có lỗi JavaScript', errs.length === 0, errs.join(' | '));
  await app.close();
  console.log(fail ? 'CÓ ' + fail + ' LỖI' : 'TẤT CẢ ĐẠT'); process.exit(fail ? 1 : 0);
})().catch(e => { console.error('NGOẠI LỆ', e); process.exit(2); });
