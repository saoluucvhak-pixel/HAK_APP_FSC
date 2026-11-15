'use strict';
/* Đo hiệu năng với BỘ DỮ LIỆU LỚN (B5–B7): 50 lô × 2.000 phiếu cân, mỗi lô 30 nhân công (2 đội), 15 xe (3 đội xe); danh mục 1.500 người / 300 xe, mỗi khóa 3 dòng lịch sử;
 * 10 lô đã chốt (có gói đóng băng). Đo: mở app, vẽ tab Kiểm tra / Xuất hồ sơ / Vận chuyển, một lần lưu khi sửa một ô (thời gian, số byte phần ngoài hồ sơ gửi kèm), kích thước file SQLite.
 * Chạy: xvfb-run -a node scripts/perf-dulieu.js [--out reports/perf/ten.json] */
const {_electron: electron} = require('playwright-core');
const path = require('path'), fs = require('fs'), os = require('os');
const root = path.join(__dirname, '..');
const arg = k => { const i = process.argv.indexOf(k); return i < 0 ? null : process.argv[i + 1]; };
const NHO = process.argv.includes('--nho');   // chạy thử nhanh với dữ liệu nhỏ
const N_LO = NHO ? 12 : 50, N_PC = NHO ? 50 : 2000, N_NC = 30, N_XE = 15, N_NGUOI = NHO ? 50 : 1500, N_XEDM = NHO ? 20 : 300, N_CHOT = 10;
const pad = (n, k) => String(n).padStart(k, '0');
function duLieu() {
  const forests = {};
  for (let l = 0; l < N_LO; l++) {
    const id = 'f' + l, ma = 'R-' + pad(l, 3);
    const nc = Array.from({length: N_NC}, (_, i) => ({_id: 'n' + i, _row: i + 2, maRung: ma, vaiTro: i % 15 === 0 ? 'Tổ trưởng' : 'Công nhân', stt: String(i + 1), danhXung: 'Ông', ten: 'NGƯỜI ' + pad(l * N_NC + i, 5), ngaySinh: '01/01/1985', cccd: '0490' + pad(l * N_NC + i, 8), ngayCap: '01/01/2021', noiCap: 'CA', diaChi: 'Thôn A, xã B', chucDanh: i % 15 === 0 ? 'Tổ trưởng' : 'Công nhân khai thác', doi: 'Đội ' + (i < 15 ? 1 : 2), _dmNgay: '01/01/2026'}));
    const dx = Array.from({length: N_XE}, (_, i) => ({_id: 'x' + i, _row: i + 2, maRung: ma, stt: String(i + 1), bienSo: '92C-' + pad(l * N_XE + i, 5), loaiXe: 'Xe tải', chuXe: 'CHỦ XE ' + (i % 3), cccd: '0491' + pad(l * 3 + (i % 3), 8), ngaySinh: '01/01/1980', ngayCap: '01/01/2021', noiCap: 'CA', diaChi: 'Đà Nẵng', sdt: '0905123456', nguoiKy: 'Chủ xe', kdDen: '01/01/2030', hanBH: '01/01/2030', _dmNgay: '01/01/2026'}));
    const pc = Array.from({length: N_PC}, (_, i) => ({_id: 'p' + i, _row: i + 2, maRung: ma, stt: String(i + 1), ngay: pad(1 + (i % 28), 2) + '/10/2026', gioCan1: pad(6 + (i % 12), 2) + ':' + pad(i % 60, 2), gioCan2: pad(7 + (i % 12), 2) + ':' + pad(i % 60, 2), bienSo: dx[i % N_XE].bienSo, soPhieu: 'P' + l + '-' + i, kl: 12.345, klKg: 12345, can1: 30000, can2: 17655, noiGiao: 'KCN Điện Nam', khachHang: 'CTY A'}));
    forests[id] = {id, info: {maRung: ma, tenRung: 'Lô ' + l, diaDiem: 'Thôn A', lat: 15.6, lng: 108.1, dienTich: 20, dinhMucTanHa: 80, cuLy: 45, tuNgay: '01/10/2026', denNgay: '30/10/2026', giayTo: [], hinhThucLuong: 'sanluong', moHinhKy: 'giaokhoan', donGiaTan: {'Tổ trưởng': 420000, 'Công nhân khai thác': 330000}, vanChuyen: {mode: 'coDinh', coDinh: 50000}}, nc, dx, pc, exp: {soKT: '015', ngayKy: '02/10/2026'}};
  }
  const db = {v: 2, rs: {own1: {id: 'own1', info: {ma: 'CR-01', ten: 'NGUYỄN VĂN MỘT', cccd: '049067005459', ngayCap: '15/08/2021', noiCap: 'CA', diaChi: 'Đà Nẵng', danhXung: 'Ông'}, forests}}};
  db.dmLaoDong = []; for (let i = 0; i < N_NGUOI; i++) for (let k = 0; k < 3; k++) db.dmLaoDong.push({ngayCapNhat: '0' + (k + 1) + '/01/2026', cccd: '0490' + pad(i, 8), ten: 'NGƯỜI ' + pad(i, 5), gioiTinh: 'Nam', ngaySinh: '01/01/1985', diaChi: 'Thôn A, xã B lần ' + k, ngayCap: '01/01/2021', noiCap: 'CA', sdt: '', chucVu: 'Công nhân', viTri: 'Công nhân khai thác'});
  db.dmXeVC = []; for (let i = 0; i < N_XEDM; i++) for (let k = 0; k < 3; k++) db.dmXeVC.push({ngayCapNhat: '0' + (k + 1) + '/01/2026', bienSo: '92C-' + pad(i, 5), chuXe: 'CHỦ XE ' + i, taiXe: '', cccdTx: '', diaChiTx: '', ngayCapTx: '', noiCapTx: '', gplx: '', hanGplx: '', hanDangKiem: '01/01/2030', hanBaoHiem: '01/01/2030'});
  return db;
}
(async () => {
  const giu = arg('--giu');   // --giu <thư mục>: dựng dữ liệu một lần rồi dùng lại (đo nhiều lần, chạy profiler)
  const dir = giu || fs.mkdtempSync(path.join(os.tmpdir(), 'hakqn-perfdl-')); fs.mkdirSync(dir, {recursive: true});
  const dbFile = path.join(dir, 'p.sqlite'), env = {...process.env, HAKQN_CLOSE: 'discard', HAKQN_DB: dbFile, HAKQN_USERDATA: path.join(dir, 'ud')}, coSan = giu && fs.existsSync(dbFile);
  let app = await electron.launch({executablePath: require('electron'), args: [root, '--no-sandbox'], env}); let w = await app.firstWindow(); await w.waitForSelector('#side', {timeout: 120000});
  if (!coSan) { const D = duLieu(); await w.evaluate(d => window.hak.save(d, {allowBulkDelete: true}), D); }
  // 10 lô đã chốt: chốt bằng hàm của app (gói đóng băng như người dùng chốt)
  if (!coSan) await w.evaluate(n => { const db = window.hak.loadSync().db; Object.values(db.rs.own1.forests).slice(0, n).forEach(f => HAKVongDoi.chot(f, 'Đo hiệu năng', new Date().toISOString(), [])); return window.hak.save(db, {allowBulkDelete: true}); }, N_CHOT);
  await app.close();
  const kq = {duLieu: {lo: N_LO, phieuMoiLo: N_PC, nhanCong: N_NC, xe: N_XE, danhMucNguoi: N_NGUOI * 3, danhMucXe: N_XEDM * 3, loChot: N_CHOT}};
  kq.fileSQLiteMB = Math.round(fs.statSync(dbFile).size / 1048576 * 10) / 10;
  const t0 = Date.now(); app = await electron.launch({executablePath: require('electron'), args: [root, '--no-sandbox'], env}); w = await app.firstWindow(); await w.waitForSelector('#side', {timeout: 120000}); kq.moAppMs = Date.now() - t0;
  if (process.argv.includes('--profile')) {   // hồ sơ CPU khi vẽ tab Thông tin rừng: hàm nào tốn thời gian nhất (tự thân)
    const cdp = await w.context().newCDPSession(w); await cdp.send('Profiler.enable'); await cdp.send('Profiler.start');
    const pt = (arg('--profile-tab') || 'finfo').split(':');   // --profile-tab xuat:all: tab cần đo
    for (let i = 0; i < 3; i++) await w.evaluate(([t, x]) => window.__perf.ve('own1', 'f11', t, x), [pt[0], pt[1]]);
    const {profile} = await cdp.send('Profiler.stop'), self = {}, dt = profile.timeDeltas, by = new Map(profile.nodes.map(n => [n.id, n]));
    profile.samples.forEach((id, i) => { const n = by.get(id), k = (n.callFrame.functionName || '(ẩn danh)') + ' @' + (n.callFrame.url.split('/').pop() || '') + ':' + n.callFrame.lineNumber; self[k] = (self[k] || 0) + (dt[i] || 0); });
    console.log(Object.entries(self).sort((a, b) => b[1] - a[1]).slice(0, 25).map(([k, v]) => Math.round(v / 1000) + ' ms  ' + k).join('\n'));
    await app.close(); return;
  }
  const ve = async (t, x) => { const a = []; for (let i = 0; i < 3; i++) a.push(await w.evaluate(([t, x]) => window.__perf.ve('own1', 'f11', t, x), [t, x])); return Math.min(...a); };
  kq.veMs = {thongTinRung: await ve('finfo'), nhanCong: await ve('nc'), vanChuyen: await ve('dx'), kiemTra: await ve('kt'), xuatHoSo: await ve('xuat', 'all')};
  kq.dungLuong = await w.evaluate(() => window.__perf.dungLuong());
  // một lần lưu khi sửa một ô (số HĐ của đội) rồi Lưu dữ liệu vào lô
  await w.evaluate(() => window.__perf.ve('own1', 'f11', 'nc'));
  const a = Date.now(); await w.fill('#doiKTVb input[data-exp=soKT]', '099'); await w.dispatchEvent('#doiKTVb input[data-exp=soKT]', 'change');
  const r = await w.evaluate(async () => { const a = performance.now(); const r = await window.__stSaveCurrent(); return {ok: r && r.ok, ms: Math.round(performance.now() - a), cach: window.__saveStats.last}; }); kq.luuMotO = Object.assign(r, {tongMs: Date.now() - a});
  // lần lưu thứ hai (đã có ảnh chụp của lần trước: lưu theo phần thay đổi — trường hợp thường gặp)
  await w.evaluate(() => window.__perf.ve('own1', 'f11', 'nc')); await w.fill('#doiKTVb input[data-exp=soKT]', '098'); await w.dispatchEvent('#doiKTVb input[data-exp=soKT]', 'change');
  kq.luuLanHai = await w.evaluate(async () => { const a = performance.now(); const r = await window.__stSaveCurrent(); return {ok: r && r.ok, ms: Math.round(performance.now() - a), cach: window.__saveStats.last, sideBytes: window.__saveStats.sideBytes}; });
  // sửa MỘT dòng danh mục lao động (4.500 dòng) rồi lưu: B6 chỉ gửi và ghi dòng đó
  kq.luuDanhMuc = await w.evaluate(() => window.__perf.luuMotDongDanhMuc());
  await app.close();
  console.log(JSON.stringify(kq, null, 1));
  const out = arg('--out'); if (out) { fs.mkdirSync(path.dirname(out), {recursive: true}); fs.writeFileSync(out, JSON.stringify(kq, null, 1)); }
})().catch(e => { console.error(e); process.exit(2); });
