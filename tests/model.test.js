'use strict';
/* Giai đoạn 1 của cấu trúc bảng mẹ – bảng con (docs/THIET_KE_BANG_ME_CON.md): chuyển dữ liệu 1.4.x → 2.0 và dựng lại dạng cũ.
 * Bất biến: legacyDb(migrateDb(db)) giống hệt db, nên biểu mẫu đọc dữ liệu y nguyên (bản in giống từng byte). */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs'), os = require('os'), path = require('path');
const M = require('../src/model');
const {Store} = require('../src/store');
const DB = require('../src/dinhbien');

const clone = x => JSON.parse(JSON.stringify(x));
const roundTrip = (db0, label) => {
  const db = clone(db0);   // dữ liệu lưu thật luôn qua JSON (không có thuộc tính undefined)
  const before = clone(db), m = M.migrateDb(db, DB.MAC_DINH);
  assert.deepStrictEqual(db, before, label + ': không sửa đối tượng đầu vào');
  assert.deepStrictEqual(M.legacyDb(m), before, label + ': dựng lại giống hệt');
  assert.deepStrictEqual(M.migrateDb(m, DB.MAC_DINH), m, label + ': chạy lại không đổi gì');
  return m;
};
const fixtureDb = name => { const d = fs.mkdtempSync(path.join(os.tmpdir(), 'hakqn-model-')), f = path.join(d, 'x.sqlite'); fs.copyFileSync(path.join(__dirname, 'fixtures', name), f); const s = new Store(f); const db = s.load(); s.close(); return db; };
const nv = (i, vai, ten, cd, cccd, o) => Object.assign({_row: i + 1, vaiTro: vai, danhXung: 'Ông', ten, ngaySinh: '01/01/1985', cccd, ngayCap: '01/01/2021', noiCap: 'CA', diaChi: 'Đà Nẵng', chucDanh: cd}, o || {});
const xe = (bien, ky, o) => Object.assign({_row: 2, chuXe: 'CHỦ ' + bien, cccd: '0490000' + bien.replace(/\D/g, '').slice(-5), ngayCap: '01/01/2021', noiCap: 'CA', diaChi: 'ĐN', bienSo: bien, nguoiKy: ky || 'Chủ xe', sdt: '0905'}, o || {});

test('mô hình 2.0: cơ sở dữ liệu thật của bản 1.0.0 và 1.4.x — chuyển rồi dựng lại giống hệt, chạy lại không đổi', () => {
  for (const f of ['hakqn_v1_0_0.sqlite', 'hakqn_v1_4.sqlite']) {
    const m = roundTrip(fixtureDb(f), f);
    Object.values(m.rs).forEach(o => Object.values(o.forests).forEach(l => { assert.strictEqual(l.cauTruc, 2); assert.ok(l.doi.length >= 1); }));
  }
});

test('mô hình 2.0: dữ liệu dùng chung của các bộ e2e (e2e-inan2) và dữ liệu đo hiệu năng — dựng lại giống hệt', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'scripts', 'e2e-inan2.js'), 'utf8');
  const {lot, seed, PC, EXP0, EXP1} = new Function(src.slice(src.indexOf('const nv ='), src.indexOf('const plain =')) + '; return {lot, seed, PC, EXP0, EXP1};')();
  roundTrip(seed([lot('fa', 'R-A', {exp: EXP0, pc: PC}), lot('fb', 'R-B', {exp: EXP1, pc: PC, kl: 40})]), 'e2e-inan2');
  roundTrip(require('../scripts/perf-luu').sample(5, 2, 10), 'perf-luu');
});

test('mô hình 2.0: lô nhiều đội — mỗi Tổ trưởng một đội theo cột Đội, giữ thứ tự cũ; hình thức, đơn giá, số văn bản chép vào từng đội', () => {
  const nc = [nv(1, 'Công nhân', 'A1', 'Công nhân cưa', '049000000012', {doi: 'Đội 1'}), nv(2, 'Tổ trưởng', 'TT2', 'Tổ trưởng', '049000000021', {doi: 'Đội 2'}),
    nv(3, 'Tổ trưởng', 'TT1', 'Tổ trưởng', '049000000011', {doi: 'đội 1'}), nv(4, 'Công nhân', 'B1', 'Công nhân khai thác', '049000000022', {doi: 'ĐỘI 2'}), nv(5, 'Công nhân', 'LẠC', 'Công nhân cưa', '049000000099', {doi: 'Không có'})];
  const info = {maRung: 'R', hinhThucLuong: 'ngaycong', moHinhKy: 'giaokhoan', donGiaNgay: {'Tổ trưởng': 400000}, dienTich: 3, vanChuyen: {mode: 'coDinh', coDinh: 50000}, cuLy: 12};
  const db = {v: 2, rs: {o: {id: 'o', info: {ten: 'C'}, forests: {f: {id: 'f', info, nc, dx: [], pc: [{soPhieu: 'P1', kl: 5}],
    exp: {soKT: '01', ngayKy: '01/10/2026', soVC: '02', pcNgay: '05/10/2026', fscNgay: '01/09/2026'},
    cc: {'2026-10': {'049000000012': {'1': 1}, '049000000021': {'2': 1}, '049000000777': {'3': 1}}, '2026-09': {}}}}}}};
  const m = roundTrip(db, 'nhiều đội'), l = m.rs.o.forests.f;
  assert.deepStrictEqual(l.doi.map(d => [d.ten, d.ttKey]), [['Đội 2', '049000000021'], ['đội 1', '049000000011']], 'mỗi Tổ trưởng một đội, theo thứ tự Tổ trưởng');
  assert.deepStrictEqual(l.doi.map(d => d.nc.map(r => r.ten)), [['TT2', 'B1', 'LẠC'], ['A1', 'TT1']], 'người ghi đội không có Tổ trưởng vào đội đầu để không mất');
  l.doi.forEach(d => { assert.deepStrictEqual(d.hinhThuc, {hinhThucLuong: 'ngaycong', moHinhKy: 'giaokhoan', donGiaNgay: {'Tổ trưởng': 400000}}); assert.deepStrictEqual(d.exp, {soKT: '01', ngayKy: '01/10/2026'}); });
  assert.deepStrictEqual(l.doi[1].cc, {'2026-10': {'049000000012': {'1': 1}}}, 'chấm công theo người của đội');
  assert.deepStrictEqual(l._cu.cc, {'2026-10': {'049000000777': {'3': 1}}}, 'chấm công của người không còn trong danh sách được giữ');
  assert.ok(!('hinhThucLuong' in l.info) && !('vanChuyen' in l.info) && l.info.dienTich === 3, 'thông tin rừng chỉ còn trường của rừng');
  assert.deepStrictEqual(l.exp, {fscNgay: '01/09/2026'}, 'exp của lô chỉ còn số/ngày của lô');
  assert.ok(l.pc.every(p => !('doiId' in p)), 'lô nhiều đội: phiếu cân cũ chưa gán đội');
  assert.deepStrictEqual(l.hdvc.map(h => [h._choDonVi, h.cuoc, h.exp]), [[true, {vanChuyen: {mode: 'coDinh', coDinh: 50000}, cuLy: 12}, {soVC: '02', pcNgay: '05/10/2026', ngayKy: '01/10/2026'}]], 'chưa có xe: cước giữ ở hợp đồng chờ chọn đơn vị');
});

test('mô hình 2.0: vận chuyển — mỗi người ký một hợp đồng (như bản cũ), xe giữ bản chụp; danh mục đơn vị và xe gộp giữa các lô, lô mới nhất thắng', () => {
  const f1 = {id: 'f1', info: {maRung: 'R1', tuNgay: '01/01/2026', vanChuyen: {mode: 'tanKm', donGiaKm: 1000}}, nc: [], pc: [{soPhieu: 'P', bienSo: '92C-11111', kl: 3}],
    dx: [xe('92C-11111', 'Chủ xe', {hanBH: '01/01/2026'}), xe('92C-22222', 'Tài xế', {taiXe: 'TÀI XẾ T', cccdTx: '049000000555'}), xe('92C-33333', 'Chủ xe', {chuXe: 'CHỦ 92C-11111', cccd: '049000011111'})]};
  const f2 = {id: 'f2', info: {maRung: 'R2', tuNgay: '01/06/2026'}, nc: [], dx: [xe('92C-11111', 'Chủ xe', {hanBH: '01/12/2026'})]};
  const db = {v: 2, rs: {a: {id: 'a', info: {}, forests: {f1}}, b: {id: 'b', info: {}, forests: {f2}}}};
  const m = roundTrip(db, 'vận chuyển'), l1 = m.rs.a.forests.f1;
  assert.deepStrictEqual(l1.hdvc.map(h => [h.donVi.vaiTro, h.donVi.ten, h.xe.map(x => x.row.bienSo)]), [['Chủ xe', 'CHỦ 92C-11111', ['92C-11111', '92C-33333']], ['Tài xế', 'TÀI XẾ T', ['92C-22222']]]);
  assert.ok(l1.hdvc.every(h => h.cuoc.vanChuyen.mode === 'tanKm'), 'cước của lô chép vào từng hợp đồng');
  assert.strictEqual(Object.keys(m.dmDonViVC).length, 2, 'người ký trùng CCCD giữa hai lô: một đơn vị');
  assert.strictEqual(m.dmXe.xe_92C11111.hanBH, '01/12/2026', 'xe trùng biển số: danh mục giữ bản của lô mới nhất');
  assert.strictEqual(l1.hdvc[0].xe[0].row.hanBH, '01/01/2026', 'hợp đồng của lô cũ giữ bản chụp riêng');
  assert.ok(l1.pc[0].doiId === 'doi1', 'lô một đội: phiếu cân tự gán đội');
});

test('mô hình 2.0: danh mục vị trí là nguồn duy nhất — gom định biên (đúng thứ tự), vị trí mặc định cũ, vị trí thêm, định mức BHLĐ, đơn giá, chức danh nhân công', () => {
  const db = {v: 2, chucDanhThem: ['Lái máy'], dinhMuc: {'Thợ phụ': {}}, rs: {o: {id: 'o', info: {}, forests: {f: {id: 'f', info: {donGiaTan: {'Bảo vệ': 1}}, nc: [nv(1, 'Công nhân', 'X', 'Nấu ăn', '049000000001')]}}}}};
  const vt = M.migrateDb(db, DB.MAC_DINH).dmViTri;
  assert.deepStrictEqual(vt.map(v => v.ten), ['Tổ trưởng', 'Công nhân cưa', 'Công nhân bóc vỏ', 'Công nhân bốc xếp', 'Công nhân khai thác', 'Lái máy', 'Thợ phụ', 'Bảo vệ', 'Nấu ăn']);
  assert.deepStrictEqual(vt.slice(0, 4).map(v => v.soNguoi), [1, 2, 3, 2], 'số người theo định biên');
  assert.ok(vt.slice(4).every(v => v.soNguoi === 0), 'vị trí ngoài định biên: số người 0');
  assert.strictEqual(new Set(vt.map(v => v.id)).size, vt.length, 'mã vị trí không trùng');
});

test('mô hình 2.0: lô thiếu khóa (không có nc, dx, exp, cc) và lô rỗng vẫn dựng lại đúng', () => {
  roundTrip({v: 2, rs: {o: {id: 'o', info: {}, forests: {f: {id: 'f', info: {maRung: 'X'}}, g: {id: 'g', info: {}, nc: [], dx: [], exp: {}, cc: {}, pc: []}}}}}, 'thiếu khóa');
  roundTrip({v: 2, rs: {}}, 'rỗng');
});
