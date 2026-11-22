'use strict';
/* BỔ SUNG bản nháp (QĐ7): "Lưu và đóng" lưu mọi lô nháp · khôi phục lô mới của chủ rừng đã có · sửa tay chủ rừng đang nháp · xóa lô nháp · lưu lô khi lô khác còn nháp.
 * (Dữ liệu giả lập dùng chung với e2e-sheets-hop-dong.js.)
 * Kiểm thử đầu-cuối màn "Dữ liệu Google Sheets" theo HỢP ĐỒNG (Electron thật, Excel giả lập sinh ngay trong bài; không dữ liệu thật):
 *  bảng hợp đồng + tìm không dấu · modal Cha–Con 2 rừng · phân bổ vượt dự kiến · hợp đồng 300 phiếu ở 1024x768 · hộp xác nhận 2 bước (QĐ4) ·
 *  ghép tạm (QĐ10) · "Cập nhật vào hồ sơ" ghi BẢN NHÁP và idempotent · chặn CCCD khác (R6) · lô chốt không ghi · ca biên (hợp đồng không có, Esc, ≤820 px, chuỗi độc hại).
 * Chạy: xvfb-run -a node scripts/e2e-sheets-hop-dong.js */
const {_electron: electron} = require('playwright-core');
const XLSX = require('xlsx');
const {saveStage: stSave} = require('./lib-stage');
const path = require('path'), fs = require('fs'), os = require('os');
const root = path.join(__dirname, '..');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hakqn-sheets-nn-')), dbFile = path.join(dir, 'd.sqlite');
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
const lotX = {id: 'fx', info: {maRung: 'GL-X99', tenRung: 'Lô GL-X99', diaDiem: 'Thôn X', dienTich: 1}, nc: [], dx: [], pc: []};
const seed = {v: 2, dmXeVC: [xeDm], rs: {oc: own('oc', 'CR-C', NC, C(14), lotX), oh: own('oh', 'CR-H', 'ĐẶNG VĂN HAI giả lập', C(20), lotH), oe: own('oe', 'CR-E', 'CHỦ KHÁC giả lập', C(99), lotE), of: own('of', 'CR-F', NF, C(18), lotF)}};

(async () => {
  const launch = mode => electron.launch({executablePath: require('electron'), args: [root, '--no-sandbox'], env: {...process.env, HAKQN_CLOSE: mode || 'discard', HAKQN_DB: dbFile, HAKQN_USERDATA: path.join(dir, 'ud'), HAKQN_SHEET_URL: 'http://127.0.0.1:9/none.xlsx'}});
  const boot = async (mode, seedIt) => {
    const app = await launch(mode), w = require('./_hd30').boc(await app.firstWindow()); w.on('pageerror', e => errs.push(e.message)); w.on('dialog', d => d.accept());
    await app.evaluate(({BrowserWindow}) => { const x = BrowserWindow.getAllWindows()[0]; x.setMinimumSize(1024, 640); x.setContentSize(1024, 768); });
    await w.waitForSelector('#side');
    if (seedIt) { await w.evaluate(x => window.hak.save(x), seed); await w.reload(); await w.waitForSelector('#side'); ok('nhập Excel giả lập', (await w.evaluate(p => window.hak.lookup.importExcel(p), xlsx)).ok); }
    return {app, w};
  };
  const errs = [];
  const apply = async (w, hd, boChu) => {
    await w.click('header [data-act=lkOpen]'); await w.waitForSelector('#lkBox.on'); await w.waitForSelector('#lkQ');
    await w.evaluate(h => window.moDuLieuSheets({maHd: h}), hd); await w.waitForSelector('#hdBox.on'); await w.waitForSelector('#hdBox [data-gsrg]');
    await w.click('#hdBox [data-gstab=pc]'); await w.waitForSelector('#hdBox .gsPcT'); await w.click('[data-act=gsAll]');
    if (boChu) { await w.click('#hdBox [data-gstab=ho]'); for (let i = 0; i < 30; i++) { const c = await w.$('#hdBox input[data-gsf^="own|"]:checked'); if (!c) break; await c.click(); await w.waitForTimeout(80); } }   // chỉ tạo lô mới, không đổi thông tin chủ rừng
    await w.click('#hdBox [data-act=gsApply]');
    await w.waitForTimeout(800); if (await w.$('#hdAsk.on')) await w.click('#hdAskBody [data-act=gsAskYes]');
    await w.waitForSelector('#gsSum', {timeout: 15000});
    await w.keyboard.press('Escape'); await w.waitForTimeout(150); if (await w.$('#lkBox.on')) { await w.keyboard.press('Escape'); await w.waitForTimeout(150); }
  };
  const dbOf = w => w.evaluate(() => window.hak.loadSync().db);
  const mem = (w, c) => w.evaluate(c => { const T = window.__hak.nhapTest, db = T.db(), o = Object.values(db.rs).find(x => x.info.cccd === c); return o ? {id: o.id, sdt: o.info.sdt, fs: Object.values(o.forests).map(f => ({id: f.id, ma: f.info.maRung, dirty: T.loDirty().includes(f.id), moi: T.loMoi().includes(f.id)})), chu: T.chuNhap(), alias: T.aliasNhap()} : null; }, c);

  /* ===== 1. "Lưu và đóng" (HAKQN_CLOSE=save) lưu MỌI lô nháp, kể cả khi không mở lô nào ===== */
  let {app, w} = await boot('save', true);
  await apply(w, 'HD-A01');
  ok('1. sau cập nhật: chủ rừng + 2 lô nháp trong bộ nhớ', (await mem(w, C(11))).fs.length === 2);
  ok('1. dữ liệu đã lưu chưa có chủ rừng A', !Object.values((await dbOf(w)).rs).some(o => o.info.cccd === C(11)));
  await app.close().catch(() => {});
  ({app, w} = await boot('discard', false));
  const dA = Object.values((await dbOf(w)).rs).find(o => o.info.cccd === C(11));
  ok('1. "Lưu và đóng": cả 2 lô nháp + chủ rừng đã được lưu (có phiếu cân), không mất lô nào', !!dA && Object.values(dA.forests).length === 2 && Object.values(dA.forests).every(f => f.pc.length > 0), JSON.stringify(dA && Object.values(dA.forests).map(f => [f.info.maRung, f.pc.length])));
  ok('1. không còn bản nháp sau khi mở lại', (await w.evaluate(() => window.__stDirty().length)) === 0);

  /* ===== 2. Khôi phục lô MỚI của chủ rừng ĐÃ CÓ (HD-C300, chủ rừng oc đã có lô GL-X99) ===== */
  await apply(w, 'HD-C300', true);
  let m = await mem(w, C(14));
  ok('2. lô GL-C01 mới nằm trong chủ rừng đã có, ở bản nháp', !!m && m.fs.some(f => f.ma === 'GL-C01' && f.dirty && f.moi) && m.fs.some(f => f.ma === 'GL-X99' && !f.dirty) && m.chu.length === 0, JSON.stringify(m));
  await w.waitForTimeout(1500); await w.reload(); await w.waitForSelector('#side'); await w.waitForTimeout(1200);
  m = await mem(w, C(14));
  ok('2. mở lại: lô nháp mới của chủ rừng đã có được KHÔI PHỤC (không bị xóa bản tạm), vẫn chưa lưu', !!m && m.fs.some(f => f.ma === 'GL-C01' && f.dirty && f.moi) && !Object.values((await dbOf(w)).rs).some(o => Object.values(o.forests).some(f => f.info.maRung === 'GL-C01')), JSON.stringify(m));

  /* ===== 4. Xóa lô nháp: dọn sổ, không rò xuống đĩa ===== */
  const fC = m.fs.find(f => f.ma === 'GL-C01').id;
  await w.click('[data-open=' + m.id + ']'); if (await w.$('#stBox.on #stGDrop')) await w.click('#stGDrop'); await w.click('[data-tab=rung]'); await w.click('[data-forest=' + fC + ']');
  await w.evaluate(() => { const b = document.querySelector('[data-act=delForest]'); if (b) b.click(); }); await w.waitForTimeout(500);
  m = await mem(w, C(14));
  ok('4. xóa lô nháp: lô biến mất, các sổ nháp sạch (không còn chủ rừng/ánh xạ treo)', !!m && m.fs.every(f => f.ma !== 'GL-C01') && (await w.evaluate(() => window.__hak.nhapTest.loMoi().length)) === 0 && m.chu.length === 0, JSON.stringify(m));
  await w.evaluate(() => window.__hak.nhapTest.persistNow()); await w.waitForTimeout(400);
  ok('4. một lần lưu sau đó không ghi lô đã xóa xuống đĩa', !Object.values((await dbOf(w)).rs).some(o => Object.values(o.forests).some(f => f.info.maRung === 'GL-C01')));

  /* ===== 5 và 6. Chủ rừng đã có (HD-H08, owner oh) có thông tin nháp; sửa tay chủ rừng; lưu lô khi lô khác còn nháp ===== */
  await apply(w, 'HD-H08');
  m = await mem(w, C(20));
  ok('5. chủ rừng H có lô nháp (HD-H08)', !!m && m.fs.some(f => f.dirty));
  await w.click('[data-open=' + m.id + ']'); if (await w.$('#stBox.on #stGDrop')) await w.click('#stGDrop'); await w.waitForTimeout(200);
  if (await w.$('#infoForm')) {
    await w.fill('#infoForm [name=sdt]', '0905000111'); await w.$eval('#infoForm', f => f.requestSubmit()); await w.waitForTimeout(800);
    ok('5. sửa tay thông tin chủ rừng đang nháp: ĐÃ lưu xuống đĩa thật (không bị ghi bản cũ)', ((await dbOf(w)).rs[m.id].info.sdt) === '0905000111');
    ok('5. sổ chủ rừng nháp được gộp (không còn hoàn tác sửa tay)', !(await mem(w, C(20))).chu.includes(m.id));
  } else ok('5. có form thông tin chủ rừng', false);
  ok('không có lỗi JavaScript', errs.length === 0, errs.join(' | '));
  await app.close().catch(() => {});
  console.log(fail ? 'CÓ ' + fail + ' LỖI' : 'TẤT CẢ ĐẠT'); process.exit(fail ? 1 : 0);
})().catch(e => { console.error('NGOẠI LỆ', e); process.exit(2); });
