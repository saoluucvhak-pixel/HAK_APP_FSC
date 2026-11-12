'use strict';
/* Tạo tests/fixtures/hakqn_v1_0_0.sqlite: cơ sở dữ liệu đúng cấu trúc của bản 1.0.0 (user_version = 2), ghi bằng CHÍNH MÃ NGUỒN của commit 74bfc27 (v1.0.0).
 * Chạy một lần (cần lịch sử git): ELECTRON_RUN_AS_NODE=1 node_modules/electron/dist/electron scripts/make-v100-fixture.js
 * Dữ liệu hoàn toàn giả lập. Chứa các tình huống hồ sơ cũ cần giữ nguyên khi nâng cấp:
 *   R-CU1: điểm đến vận chuyển nhập tay (exp.vcDiemDen), cước cố định; phiếu có "Nơi giao" khác nhau
 *   R-CU2: cước theo bậc cự ly (mode tanDoan) — bản mới không còn cách này, hồ sơ phải báo rõ cần chọn lại, dữ liệu bậc giữ nguyên
 *   R-CU3: phiếu cũ ngày 31/02/2026 (không có thật) và 29/02/2028 (có thật)
 * Kèm bản tra cứu 3 tab (lookup_sets/lookup_rows) để kiểm tra bản tra cứu offline còn nguyên sau nâng cấp. */
const fs = require('fs'), os = require('os'), path = require('path'), cp = require('child_process');
const root = path.join(__dirname, '..');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'hakqn-v100-'));
fs.mkdirSync(path.join(tmp, 'src'));
for (const f of ['store.js', 'lookup.js']) fs.writeFileSync(path.join(tmp, 'src', f), cp.execFileSync('git', ['show', '74bfc27:src/' + f], {cwd: root, maxBuffer: 1 << 26}));
fs.symlinkSync(path.join(root, 'node_modules'), path.join(tmp, 'node_modules'));
const {Store} = require(path.join(tmp, 'src', 'store.js'));
const {Lookup} = require(path.join(tmp, 'src', 'lookup.js'));
const {build} = require(path.join(root, 'tests', 'fixtures', 'make-lookup.js'));

const out = path.join(root, 'tests', 'fixtures', 'hakqn_v1_0_0.sqlite');
for (const e of ['', '-wal', '-shm']) fs.rmSync(out + e, {force: true});
const s = new Store(out);
if (s.db.pragma('user_version', {simple: true}) !== 2) throw new Error('mã v1.0.0 phải tạo cấu trúc v2');
const P = (stt, ngay, bien, so, kl, noi) => ({_row: stt + 1, stt: String(stt), ngay, bienSo: bien, soPhieu: so, kl, noiGiao: noi, ghiChu: ''});
const info = (ma, ten, extra) => ({maRung: ma, tenRung: ten, diaDiem: 'Thôn ' + ma + ', xã Quế Sơn Trung', lat: 15.6, lng: 108.1, dienTich: 2, dinhMucTanHa: 80, cuLy: 45, tuNgay: '01/10/2026', denNgay: '30/11/2026', donGia: 340000, giayTo: [], ...extra});
const xe = (bien) => ({_row: 2, maRung: '', stt: '1', chuXe: 'CHỦ XE ' + bien, ngaySinh: '01/01/1980', cccd: '049000000077', ngayCap: '01/01/2021', noiCap: 'CA', diaChi: 'Đà Nẵng', bienSo: bien, loaiXe: 'Xe tải', nguoiKy: 'Chủ xe'});
const forest = (id, ma, ten, extra, exp, pc) => ({id, info: info(ma, ten, extra), nc: [], dx: [xe('92C-12345'), xe('92C-67890')], pc, exp: exp || {}});
const db = {v: 2, dinhMuc: {'Tổ trưởng': {qa: '1 bộ'}}, rs: {
  own1: {id: 'own1', info: {ma: 'CR-CU', ten: 'CHỦ RỪNG CŨ', ngaySinh: '06/10/1967', cccd: '049067005459', ngayCap: '15/08/2021', noiCap: 'CA', diaChi: 'Đà Nẵng', danhXung: 'Ông'}, forests: {
    f1: forest('f1', 'R-CU1', 'Rừng cũ 1', {vanChuyen: {mode: 'coDinh', coDinh: 52000, bac: []}}, {vcDiemDen: 'Nhà máy dăm Quảng Nam, KCN Điện Nam – Điện Ngọc', soVC: '07'},
      [P(1, '05/01/2026', '92C-12345', 'PC-A1', 12.5, 'Nhà máy dăm Quảng Nam'), P(2, '20/02/2026', '92C-67890', 'PC-A2', 9.25, 'Kho Điện Bàn')]),
    f2: forest('f2', 'R-CU2', 'Rừng cũ 2', {vanChuyen: {mode: 'tanDoan', donGiaKm: 1000, coDinh: 52000, bac: [{den: 50, gia: 40000}, {den: 100, gia: 55000}]}}, {vcDiemDen: 'Cảng dăm Kỳ Hà'},
      [P(1, '10/03/2026', '92C-12345', 'PC-B1', 8, 'Cảng dăm Kỳ Hà')]),
    f3: forest('f3', 'R-CU3', 'Rừng cũ 3', {vanChuyen: {mode: 'tanKm', donGiaKm: 1000, coDinh: null, bac: []}}, {},
      [P(1, '31/02/2026', '92C-12345', 'PC-C1', 5, 'Nhà máy X'), P(2, '29/02/2028', '92C-67890', 'PC-C2', 3, 'Nhà máy X'), P(3, '15/03/2026', '92C-12345', 'PC-C3', 7, 'Nhà máy X')])}, nc: [], dx: [], exp: {}}}};
s.save(db);
const L = new Lookup(s); const r = L.load(build(), 'excel', 'gia_lap_HoSoKeo_QC.xlsx'); if (!r.ok) throw new Error(JSON.stringify(r.errors));
s.db.pragma('wal_checkpoint(TRUNCATE)'); s.db.pragma('journal_mode = DELETE'); s.close();
for (const e of ['-wal', '-shm']) fs.rmSync(out + e, {force: true});
console.log('Đã tạo ' + path.relative(root, out) + ' (' + fs.statSync(out).size + ' byte, user_version 2)');
