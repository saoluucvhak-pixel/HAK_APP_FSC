'use strict';
/* Tạo tests/fixtures/hakqn_v1_4.sqlite: cơ sở dữ liệu cấu trúc v3 (cùng cấu trúc bản 1.4.0) có một chủ hai lô A và B với đủ dữ liệu của bản 1.4.x:
 * số điện thoại chủ rừng, số và ngày ký hợp đồng, Công ty mua hàng + địa chỉ giao đã chốt của từng lô, cước tấn/km (A) và cố định (B), nhân công, xe, phiếu cân,
 * kèm bản tra cứu 3 tab. Dữ liệu hoàn toàn giả lập. Dùng để thử "cài đè" từ bản cũ.
 * Lưu ý trung thực: file này được ghi bằng lớp lưu trữ của mã HIỆN TẠI (cấu trúc v3 không đổi từ 1.2.0 nên bản 1.4.0 mở được); bản 1.4.0 chưa có ô điện thoại và số hợp đồng,
 * nên các trường này chỉ được thử "giữ nguyên qua cài đè" chứ không phải do bản 1.4.0 nhập.
 * Chạy: ELECTRON_RUN_AS_NODE=1 node_modules/electron/dist/electron scripts/make-v14-fixture.js */
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const {Store} = require(path.join(root, 'src', 'store.js'));
const {Lookup} = require(path.join(root, 'src', 'lookup.js'));
const {build} = require(path.join(root, 'tests', 'fixtures', 'make-lookup.js'));
const out = path.join(root, 'tests', 'fixtures', 'hakqn_v1_4.sqlite');
for (const e of ['', '-wal', '-shm']) fs.rmSync(out + e, {force: true});
const s = new Store(out);
const nv = (ma, stt, vai, ten, cd, cccd) => ({_row: stt + 1, maRung: ma, vaiTro: vai, stt: String(stt), danhXung: 'Ông', ten, ngaySinh: '01/01/1985', cccd, ngayCap: '01/01/2021', noiCap: 'CA', diaChi: 'Đà Nẵng', chucDanh: cd});
const xe = (ma, bien) => ({_row: 2, maRung: ma, stt: '1', chuXe: 'LÊ VĂN XE', ngaySinh: '01/01/1980', cccd: '049000000077', ngayCap: '01/01/2021', noiCap: 'CA', diaChi: 'Đà Nẵng', bienSo: bien, loaiXe: 'Xe tải', nguoiKy: 'Chủ xe', sdt: '0905123456'});
const P = (ma, stt, ngay, bien, so, kl) => ({_row: stt + 1, maRung: ma, stt: String(stt), ngay, bienSo: bien, soPhieu: so, kl, noiGiao: 'KCN Điện Nam, Quảng Nam', ghiChu: ''});
const MUA = {congTyId: 'c1', ten: 'CÔNG TY TNHH DĂM AN PHÁT', mst: '0401234567', diaChiId: 'a1', diaChiNhan: 'Cảng Kỳ Hà', diaChi: 'Cảng dăm Kỳ Hà, Núi Thành, Quảng Nam', nguoiDaiDien: '', chucVu: '', sdt: '', xacNhan: '2026-10-01T00:00:00.000Z'};
const MUAB = Object.assign({}, MUA, {diaChiId: '', diaChiNhan: 'Địa chỉ công ty', diaChi: 'KCN Điện Nam – Điện Ngọc, Điện Bàn, Quảng Nam'});
const lot = (id, ma, ten, vc, mua, cuLy, pc) => ({id, info: {hinhThucLuong: 'sanluong', moHinhKy: 'giaokhoan', donGiaTan: {'Tổ trưởng': 420000, 'Công nhân khai thác': 330000, 'Công nhân cưa': 380000}, khoiLuong: 21.75, maRung: ma, tenRung: ten, diaDiem: 'Thôn ' + ma, lat: 15.6, lng: 108.1, dienTich: 2, dinhMucTanHa: 80, cuLy, tuNgay: '01/10/2026', denNgay: '30/11/2026', donGia: 340000, giayTo: [], vanChuyen: vc, muaHang: mua},
  nc: [nv(ma, 1, 'Tổ trưởng', 'TRẦN TỔ TRƯỞNG', 'Tổ trưởng', '049085000001'), nv(ma, 2, 'Công nhân', 'LÊ CÔNG NHÂN', 'Công nhân khai thác', '049085000002'), nv(ma, 3, 'Công nhân', 'PHẠM CƯA', 'Công nhân cưa', '049085000003')],
  dx: [xe(ma, '92C-12345'), xe(ma, '92C-67890')], pc, exp: {soKT: '015', ngayKy: '02/10/2026', soVC: '07'}});
const db = {v: 2, dinhMuc: {'Tổ trưởng': {qa: '1 bộ'}}, bienAlias: {'92c12345': '92C-12345'}, congTy: {c1: {id: 'c1', ten: 'CÔNG TY TNHH DĂM AN PHÁT', mst: '0401234567', diaChi: 'KCN Điện Nam – Điện Ngọc, Điện Bàn, Quảng Nam', nguoiDaiDien: 'Nguyễn Văn A', chucVu: 'Giám đốc', sdt: '0905000001', email: '', diaChiGiao: [{id: 'a1', nhan: 'Cảng Kỳ Hà', diaChi: 'Cảng dăm Kỳ Hà, Núi Thành, Quảng Nam'}], ghiChu: ''}},
  rs: {own1: {id: 'own1', info: {ma: 'CR-01', ten: 'NGUYỄN VĂN MỘT', danhXung: 'Ông', cccd: '049067005459', ngayCap: '15/08/2021', noiCap: 'CA', diaChi: 'Đà Nẵng', sdt: '0905 123 456', soHopDong: 'HD-2026/015', ngayKyHopDong: '02/10/2026', ngaySinh: '06/10/1967'}, nc: [], dx: [], exp: {}, forests: {
    fa: lot('fa', 'R-A', 'Lô A', {mode: 'tanKm', donGiaKm: 1000, coDinh: null, bac: []}, MUA, 45, [P('R-A', 1, '05/10/2026', '92C-12345', 'PA1', 12.5), P('R-A', 2, '06/10/2026', '92C-67890', 'PA2', 9.25)]),
    fb: lot('fb', 'R-B', 'Lô B', {mode: 'coDinh', coDinh: 52000, bac: []}, MUAB, null, [P('R-B', 1, '07/10/2026', '92C-12345', 'PB1', 8)])}}}};
s.save(db);
const L = new Lookup(s); const r = L.load(build(), 'excel', 'gia_lap_HoSoKeo_QC.xlsx'); if (!r.ok) throw new Error(JSON.stringify(r.errors));
s.db.pragma('wal_checkpoint(TRUNCATE)'); s.db.pragma('journal_mode = DELETE'); s.close();
for (const e of ['-wal', '-shm']) fs.rmSync(out + e, {force: true});
console.log('Đã tạo ' + path.relative(root, out) + ' (' + fs.statSync(out).size + ' byte)');
