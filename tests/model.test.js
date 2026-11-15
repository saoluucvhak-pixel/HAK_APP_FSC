'use strict';
/* Cấu trúc 2.0, giai đoạn 3 (docs/THIET_KE_BANG_ME_CON.md): đội khai thác là bảng con của lô, nhân công mang doiId.
 * Bất biến: lô cũ chuẩn hóa rồi dựng lại dạng cũ giống hệt; chuẩn hóa chạy lại không đổi. */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs'), os = require('os'), path = require('path');
const M = require('../src/model');
const {Store} = require('../src/store');

const clone = x => JSON.parse(JSON.stringify(x));
/* các trường đã bỏ ở giai đoạn 6 (SQLite v6) được kiểm riêng bằng test chuyển dữ liệu từng trường (cuối tệp); phần còn lại dựng lại giống hệt */
const boCu = db => { const c = clone(db); Object.values((c && c.rs) || {}).forEach(o => Object.values(o.forests || {}).forEach(f => {
  ['soDoi', 'khoiLuong', 'klHoSoCu', 'klDoi', 'donGia', 'donGiaTan'].forEach(k => { if (f.info) delete f.info[k]; });
  (f.nc || []).forEach(r => { delete r.doi; }); (f.pc || []).forEach(r => { delete r.doi; }); (f.dx || []).forEach(r => { delete r.doiXe; });
  if (f.info && f.info.vanChuyen) { delete f.info.vanChuyen.mode; delete f.info.vanChuyen.bac; delete f.info.vanChuyen.bacCu; }
})); return c; };
const roundTrip = (db0, label) => {
  const db = clone(db0), before = clone(db), m = M.ensureDb(db);
  assert.deepStrictEqual(db, before, label + ': không sửa đầu vào');
  assert.deepStrictEqual(boCu(M.legacyDb(m)), boCu(before), label + ': dựng lại dạng cũ giống hệt (trừ các trường đã bỏ ở giai đoạn 6)');
  assert.deepStrictEqual(M.ensureDb(m), m, label + ': chuẩn hóa lại không đổi');
  return m;
};
const {MIGRATIONS} = require('../src/store');
// mở fixture cũ CHỈ đến v3 (chưa chuyển đội) để có đúng dữ liệu dạng 1.4.x làm đầu vào
const fixtureDb = name => { const d = fs.mkdtempSync(path.join(os.tmpdir(), 'hakqn-model-')), f = path.join(d, 'x.sqlite'); fs.copyFileSync(path.join(__dirname, 'fixtures', name), f); const s = new Store(f, {migrations: MIGRATIONS.slice(0, 3)}); const db = s.load(); s.close(); return db; };
const nv = (i, vai, ten, cd, cccd, o) => Object.assign({_row: i + 1, vaiTro: vai, danhXung: 'Ông', ten, ngaySinh: '01/01/1985', cccd, chucDanh: cd}, o || {});
const lotOf = m => Object.values(m.rs)[0].forests[Object.keys(Object.values(m.rs)[0].forests)[0]];

test('đội khai thác: cơ sở dữ liệu thật 1.0.0, 1.4.x và dữ liệu e2e — chuẩn hóa rồi dựng lại giống hệt; mỗi lô có đội, mọi nhân công thuộc đội', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'scripts', 'e2e-inan2.js'), 'utf8');
  const {lot, seed, PC, EXP0, EXP1} = new Function(src.slice(src.indexOf('const nv ='), src.indexOf('const plain =')) + '; return {lot, seed, PC, EXP0, EXP1};')();
  const dbs = {'1.0.0': fixtureDb('hakqn_v1_0_0.sqlite'), '1.4.x': fixtureDb('hakqn_v1_4.sqlite'), e2e: seed([lot('fa', 'R-A', {exp: EXP0, pc: PC}), lot('fb', 'R-B', {exp: EXP1, pc: PC, kl: 40})]), perf: require('../scripts/perf-luu').sample(4, 2, 5)};
  for (const [k, db] of Object.entries(dbs)) {
    const m = roundTrip(db, k);
    Object.values(m.rs).forEach(o => Object.values(o.forests).forEach(f => {
      assert.ok(f.doi.length >= 1, k + ': có đội');
      (f.nc || []).forEach(r => assert.ok(f.doi.some(d => d.id === r.doiId), k + ': nhân công thuộc đội'));
      M.DOI_INFO.forEach(x => assert.ok(!(x in f.info), k + ': ' + x + ' không còn ở thông tin rừng'));
    }));
  }
});

test('đội khai thác: giao khoán nhiều Tổ trưởng → mỗi Tổ trưởng một đội theo cột Đội; hình thức, đơn giá, số văn bản chép vào từng đội; người ghi đội lạ chưa thuộc đội (báo lỗi như bản cũ)', () => {
  const nc = [nv(1, 'Công nhân', 'A1', 'Công nhân cưa', '1', {doi: 'Đội 1'}), nv(2, 'Tổ trưởng', 'TT2', 'Tổ trưởng', '2', {doi: 'Đội 2'}), nv(3, 'Tổ trưởng', 'TT1', 'Tổ trưởng', '3', {doi: 'đội 1'}), nv(4, 'Công nhân', 'B1', 'Công nhân cưa', '4', {doi: 'ĐỘI 2'}), nv(5, 'Công nhân', 'LẠC', 'Công nhân cưa', '5', {doi: 'Không có'})];
  const db = {v: 2, rs: {o: {id: 'o', info: {}, forests: {f: {id: 'f', info: {maRung: 'R', hinhThucLuong: 'ngaycong', moHinhKy: 'giaokhoan', donGiaNgay: {'Tổ trưởng': 1}, dienTich: 3}, nc, exp: {soKT: '01', ntNgay: '02/10/2026', fscNgay: '01/09/2026', ngayKy: '01/10/2026'}}}}}};
  const f = lotOf(roundTrip(db, 'nhiều đội'));
  assert.deepStrictEqual(f.doi.map(d => [d.id, d.ten]), [['doi1', 'Đội 2'], ['doi2', 'đội 1']]);
  assert.deepStrictEqual(f.nc.map(r => r.ten + ':' + r.doiId), ['A1:doi2', 'TT2:doi1', 'TT1:doi2', 'B1:doi1', 'LẠC:']);
  f.doi.forEach(d => { assert.deepStrictEqual(d.hinhThuc, {hinhThucLuong: 'ngaycong', moHinhKy: 'giaokhoan', donGiaNgay: {'Tổ trưởng': 1}}); assert.deepStrictEqual(d.exp, {soKT: '01', ntNgay: '02/10/2026'}); });
  assert.deepStrictEqual(f.exp, {fscNgay: '01/09/2026', ngayKy: '01/10/2026'}, 'số/ngày của lô (và ngày ký chung) ở lại lô');
  assert.deepStrictEqual(M.teamErrors(f).map(e => e.text), ['Đội “Không có” của “LẠC” không có Tổ trưởng: chọn đội cho người này (lô có 2 đội)']);
});

test('đội khai thác: hình thức trực tiếp có nhiều Tổ trưởng vẫn là MỘT đội (như bản cũ); lô không có nhân công vẫn có một đội', () => {
  const nc = [nv(1, 'Tổ trưởng', 'T1', 'Tổ trưởng', '1', {doi: 'A'}), nv(2, 'Tổ trưởng', 'T2', 'Tổ trưởng', '2', {doi: 'B'})];
  const f = lotOf(roundTrip({v: 2, rs: {o: {id: 'o', info: {}, forests: {f: {id: 'f', info: {moHinhKy: 'tructiep'}, nc}}}}}, 'trực tiếp'));
  assert.strictEqual(f.doi.length, 1); assert.deepStrictEqual(M.teamErrors(f), []);
  const g = lotOf(roundTrip({v: 2, rs: {o: {id: 'o', info: {}, forests: {g: {id: 'g', info: {maRung: 'X'}}}}}}, 'không nhân công'));
  assert.deepStrictEqual(g.doi.map(d => d.id), ['doi1']);
});

test('đội khai thác: thêm, sửa, chuyển người, xóa đội; lỗi cấu trúc đội', () => {
  let f = M.ensureForest({id: 'f', info: {hinhThucLuong: 'sanluong', donGiaTan: {'Tổ trưởng': 400000}}, nc: [nv(1, 'Tổ trưởng', 'T1', 'Tổ trưởng', '1'), nv(2, 'Công nhân', 'C1', 'Công nhân cưa', '2')]});
  const a = M.addTeam(f, ' Đội 2 '); f = a.f;
  assert.deepStrictEqual(f.doi[1], {id: 'doi2', ten: 'Đội 2', hinhThuc: {hinhThucLuong: 'sanluong', donGiaTan: {'Tổ trưởng': 400000}}, dienTich: null, exp: {}}, 'đội mới chép hình thức, đơn giá của đội đầu');
  assert.ok(M.teamErrors(f).some(e => /chưa ghi tên đội|chưa có tên/.test(e.text)), 'nhiều đội: đội đầu chưa có tên');
  f = M.updateTeam(f, 'doi1', {ten: 'Đội 1', hinhThuc: {moHinhKy: 'tructiep', hinhThucLuong: 'ngaycong'}, dienTich: 1.5, exp: {soKT: '07'}}).f;
  assert.deepStrictEqual([f.doi[0].hinhThuc.moHinhKy, f.doi[0].hinhThuc.hinhThucLuong, f.doi[0].dienTich, f.doi[0].exp.soKT, f.doi[1].hinhThuc.hinhThucLuong], ['tructiep', 'ngaycong', 1.5, '07', 'sanluong'], 'mỗi đội hình thức, cách tính riêng');
  assert.match(M.removeTeam(f, 'doi1').error, /còn 2 nhân công/);
  f = M.moveMembers(f, [1], 'doi2').f;
  assert.deepStrictEqual(M.membersOf(f, f.doi[1]).map(r => r.ten), ['C1']);
  assert.ok(M.teamErrors(f).some(e => /Đội “Đội 2” chưa có Tổ trưởng/.test(e.text)));
  f = M.moveMembers(f, [1], 'doi1').f; const r = M.removeTeam(f, 'doi2'); assert.ok(r.ok); f = r.f;
  assert.match(M.removeTeam(f, 'doi1').error, /ít nhất một đội/);
  assert.deepStrictEqual(M.infoOf({maRung: 'R'}, f.doi[0]), {maRung: 'R', hinhThucLuong: 'ngaycong', donGiaTan: {'Tổ trưởng': 400000}, moHinhKy: 'tructiep'});
});

test('đội khai thác: dòng nhân công thêm sau (không có doiId) — lô một đội tự vào đội đó; nhiều đội để chưa thuộc đội', () => {
  let f = M.ensureForest({id: 'f', info: {}, nc: [nv(1, 'Tổ trưởng', 'T', 'Tổ trưởng', '1')]});
  f.nc.push(nv(2, 'Công nhân', 'MỚI', 'Công nhân cưa', '2'));
  assert.strictEqual(M.ensureForest(f).nc[1].doiId, 'doi1');
  f = M.addTeam(f, 'B').f; f.nc.push(nv(3, 'Công nhân', 'MỚI2', 'Công nhân cưa', '3'));
  assert.strictEqual(M.ensureForest(f).nc[2].doiId, '');
});

test('đội khai thác: nạp lại CẢ danh sách (mọi dòng chưa có doiId) — chia đội theo cột Đội như bản cũ, đội cùng tên giữ id, hình thức, số văn bản; dòng lẻ ghi đúng tên đội vào đội đó', () => {
  let f = M.ensureForest({id: 'f', info: {hinhThucLuong: 'sanluong', moHinhKy: 'giaokhoan'}, exp: {soKT: '05'}, nc: [nv(1, 'Tổ trưởng', 'T1', 'Tổ trưởng', '1', {doi: 'A'})]});
  f = M.updateTeam(f, 'doi1', {ten: 'A', dienTich: 2}).f;
  const moi = [nv(1, 'Tổ trưởng', 'TB', 'Tổ trưởng', '9', {doi: 'B'}), nv(2, 'Tổ trưởng', 'T1', 'Tổ trưởng', '1', {doi: 'a'}), nv(3, 'Công nhân', 'C', 'Công nhân cưa', '3', {doi: 'B'})];
  const g = M.ensureForest(Object.assign({}, f, {nc: moi}));
  assert.deepStrictEqual(g.doi.map(d => [d.id, d.ten]), [['doi2', 'B'], ['doi1', 'A']], 'đội A giữ id doi1; đội B mới');
  assert.deepStrictEqual([g.doi[1].dienTich, g.doi[1].exp.soKT, g.doi[0].hinhThuc.moHinhKy, g.doi[0].exp.soKT], [2, '05', 'giaokhoan', undefined], 'đội cũ giữ diện tích, số HĐ; đội mới chép hình thức, chưa có số');
  assert.deepStrictEqual(g.nc.map(r => r.ten + ':' + r.doiId), ['TB:doi2', 'T1:doi1', 'C:doi2']);
  assert.deepStrictEqual(M.ensureForest(g), g, 'chạy lại không đổi');
  g.nc.push(nv(4, 'Công nhân', 'D', 'Công nhân cưa', '4', {doi: 'Ａ'.normalize('NFKC')}));
  assert.strictEqual(M.ensureForest(g).nc[3].doiId, 'doi1', 'dòng lẻ ghi tên đội A → đội A');
});

const xe = (bien, chu, cccd, o) => Object.assign({bienSo: bien, chuXe: chu, cccd, nguoiKy: 'Chủ xe'}, o || {});
test('đội xe: dữ liệu cũ mỗi người ký một đội (chủ xe hoặc tài xế) như bản cũ; xe đã thuộc đội thì giữ đội; xe mới vào đội cùng người ký; chạy lại không đổi', () => {
  const f = M.ensureForest({id: 'f', info: {}, dx: [xe('A', 'An', '0491'), xe('B', 'Bình', '0492'), xe('C', 'An', '049-1'), xe('D', 'Chủ D', '0499', {nguoiKy: 'Tài xế', taiXe: 'Tâm', cccdTx: '0777'})]});
  assert.deepStrictEqual(f.hdvc.map(h => [h.id, h.key]), [['hd1', '0491'], ['hd2', '0492'], ['hd3', '0777']]);
  assert.deepStrictEqual(f.dx.map(r => r.hdvcId), ['hd1', 'hd2', 'hd1', 'hd3']);
  assert.deepStrictEqual(M.ensureForest(f), f); assert.ok(!M.needsEnsure(f));
  const g = JSON.parse(JSON.stringify(f)); g.dx[1].cccd = '0493';
  const h = M.ensureForest(g);
  assert.deepStrictEqual([h.dx[1].hdvcId, h.hdvc[1].key], ['hd2', '0493'], 'sửa CCCD của người ký: xe giữ đội, người ký của đội theo xe');
  g.dx.push(xe('E', 'An', '0491')); assert.strictEqual(M.ensureForest(g).dx[4].hdvcId, 'hd1', 'xe mới cùng người ký An vào đội của An');
  assert.deepStrictEqual(M.legacyForest(h).dx.map(r => 'hdvcId' in r), [false, false, false, false]);
});

test('đội xe: thêm đội, chuyển xe, chọn người ký trong đội hoặc doanh nghiệp (danh mục), cước và số riêng, chặn xóa khi còn xe', () => {
  let f = M.ensureForest({id: 'f', info: {vanChuyen: {mode: 'coDinh', coDinh: 50000}}, dx: [xe('A', 'An', '0491'), xe('B', 'Bình', '0492', {taiXe: 'Tư', cccdTx: '0444'})]});
  const t = M.addHd(f, 'Đội xe số 1'); f = t.f;
  f = M.moveXe(f, [0, 1], t.id).f;
  assert.deepStrictEqual([f.dx.map(r => r.hdvcId), f.hdvc.map(h => h.id)], [[t.id, t.id], [t.id]], 'hai xe vào một đội: một hợp đồng; đội trống không có gì riêng thì bỏ');
  assert.strictEqual(f.hdvc[0].key, '0491', 'chưa chọn người ký: người ký của xe đầu tiên');
  assert.deepStrictEqual(M.signersOf(f, f.hdvc[0]).map(x => x.ten + ':' + x.vaiTro), ['An:Chủ xe', 'Bình:Chủ xe', 'Tư:Tài xế']);
  f = M.updateHd(f, t.id, {key: '0444'}).f;
  assert.deepStrictEqual([f.hdvc[0].key, M.signerOf(M.xeOf(f, f.hdvc[0]), '0444').tx], ['0444', true], 'chọn tài xế Tư của xe B làm người ký của đội');
  const dv = {id: 'dn1', loai: 'doanhnghiep', ten: 'Công ty VT Hòa Phát', mst: '0401234567'};
  f = M.updateHd(f, t.id, {donVi: dv, cuoc: {mode: 'tanKm', donGiaKm: 1500}, exp: {soVC: '07', pcSo: ''}}).f;
  assert.deepStrictEqual([f.hdvc[0].donViId, f.hdvc[0].ben, f.hdvc[0].cuoc, f.hdvc[0].exp], ['dn1', dv, {mode: 'tanKm', donGiaKm: 1500}, {soVC: '07'}], 'đội xe ký với doanh nghiệp: chụp lại thông tin');
  assert.match(M.removeHd(f, t.id).error, /còn 2 xe/);
  assert.deepStrictEqual(M.ensureForest(f), f);
  const d2 = M.addHdDonVi(f, dv); f = d2.f; f = M.moveXe(f, [1], d2.id).f;
  assert.deepStrictEqual(M.hdOrder(f).map(h => h.id), [t.id, d2.id]);
  assert.ok(M.removeHd(M.moveXe(f, [1], t.id).f, d2.id).ok);
});

test('phiếu cân gắn đội: lô một đội tự gán; lô nhiều đội phiếu cũ chưa gán, phiếu mới theo cột Đội; gán hàng loạt; chặn xóa đội còn phiếu; dựng lại dạng cũ bỏ doiId', () => {
  const pc = (so, kl, o) => Object.assign({soPhieu: so, kl, ngay: '05/10/2026', bienSo: 'A'}, o || {});
  let f = M.ensureForest({id: 'f', info: {}, nc: [nv(1, 'Tổ trưởng', 'T', 'Tổ trưởng', '1')], pc: [pc('P1', 10)]});
  assert.strictEqual(f.pc[0].doiId, 'doi1');
  const g = M.ensureForest({id: 'g', info: {moHinhKy: 'giaokhoan'}, nc: [nv(1, 'Tổ trưởng', 'A', 'Tổ trưởng', '1', {doi: 'A'}), nv(2, 'Tổ trưởng', 'B', 'Tổ trưởng', '2', {doi: 'B'})], pc: [pc('P1', 10), pc('P2', 5)]});
  assert.deepStrictEqual(g.pc.map(r => r.doiId), ['', ''], 'phiếu cũ của lô nhiều đội: chưa gán');
  g.pc.push(pc('P3', 2, {doi: 'b'})); assert.strictEqual(M.ensureForest(g).pc[2].doiId, 'doi2', 'phiếu mới ghi cột Đội B');
  const r = M.assignPc(g, [0, 1], 'doi1'); assert.deepStrictEqual([r.n, r.f.pc.map(x => x.doiId)], [2, ['doi1', 'doi1', 'doi2']]);
  f = M.addTeam(f, 'Hai').f; assert.match(M.removeTeam(M.moveMembers(f, [0], 'doi2').f, 'doi1').error, /còn 1 phiếu cân/);
  assert.ok(!('doiId' in M.legacyForest(r.f).pc[0]));
});

test('danh mục người lao động: gộp theo CCCD, lô mới nhất thắng, bỏ dòng thiếu tên hoặc CCCD sai, không sửa lô nguồn', () => {
  const M = require('../src/model');
  const nv = (ten, cccd, o) => Object.assign({ten, cccd, ngaySinh: '01/01/1990', ngayCap: '01/01/2021', noiCap: 'CA', diaChi: 'Đà Nẵng', danhXung: 'Ông'}, o);
  const rs = {a: {forests: {f1: {info: {tuNgay: '01/03/2026'}, nc: [nv('LÊ A', '049085000001', {diaChi: 'Cũ'}), nv('', '049085000002'), nv('SAI', '123')]},
    f2: {info: {tuNgay: '01/09/2026'}, nc: [nv('LÊ ANH', '049 085 000 001', {diaChi: 'Mới'}), nv('BÙI B', '049085000003')]}}},
    b: {forests: {f3: {info: {tuNgay: ''}, nc: [nv('LÊ CŨ NHẤT', '049085000001', {diaChi: 'Rất cũ'})]}}}};
  const before = JSON.stringify(rs), L = M.nguoiDanhMuc(rs);
  assert.strictEqual(JSON.stringify(rs), before);
  assert.deepStrictEqual(L.map(r => [r.ten, r.diaChi]), [['BÙI B', 'Đà Nẵng'], ['LÊ ANH', 'Mới']]);   // CCCD ghi có dấu cách vẫn gộp; ngày bắt đầu 01/09/2026 thắng; dòng thiếu tên và CCCD sai bị bỏ
  assert.deepStrictEqual(M.nguoiDanhMuc(null), []);
});

/* ===== GIAI ĐOẠN 6.1: bỏ trường cũ, chuyển dữ liệu từng trường ===== */
const lot6 = o => Object.assign({id: 'f', info: {maRung: 'R', hinhThucLuong: 'sanluong', moHinhKy: 'giaokhoan', donGiaTan: {'Công nhân khai thác': 330000}, dienTich: 3}, exp: {},
  nc: [nv(1, 'Tổ trưởng', 'TT A', 'Tổ trưởng', '111111111111'), nv(2, 'Công nhân', 'CN', 'Công nhân khai thác', '222222222222')], dx: [], pc: []}, o);
const ens = f => M.ensureForest(clone(f));
test('v6: info.soDoi bị bỏ; chạy lại không đổi', () => {
  const f = ens(lot6({info: {maRung: 'R', soDoi: 3}})); assert.ok(!('soDoi' in f.info)); assert.deepStrictEqual(ens(f), f); assert.ok(!M.coTruongCu(f));
});
test('v6: khối lượng nhập tay → klHoSoCu (khối lượng lô vẫn lấy số đó), 0/trống thì bỏ hẳn', () => {
  let f = ens(lot6({info: {maRung: 'R', khoiLuong: 29.75}})); assert.strictEqual(f.info.klHoSoCu, 29.75); assert.ok(!('khoiLuong' in f.info));
  f = ens(lot6({info: {maRung: 'R', khoiLuong: null}})); assert.ok(!('klHoSoCu' in f.info) && !('khoiLuong' in f.info));
  f = ens(lot6({info: {maRung: 'R', khoiLuong: 0}})); assert.ok(!('klHoSoCu' in f.info));
});
test('v6: klDoi (khóa Tổ trưởng) → klHoSoCu của đội có Tổ trưởng đó', () => {
  const nc = [nv(1, 'Tổ trưởng', 'TT A', 'Tổ trưởng', '111111111111', {doi: 'Đội 1'}), nv(2, 'Tổ trưởng', 'TT B', 'Tổ trưởng', '222222222222', {doi: 'Đội 2'})];
  const f = ens(lot6({nc, info: {maRung: 'R', hinhThucLuong: 'sanluong', moHinhKy: 'giaokhoan', klDoi: {'111111111111': 20, '222222222222': 9.5}}}));
  assert.deepStrictEqual(f.doi.map(d => [d.ten, d.klHoSoCu]), [['Đội 1', 20], ['Đội 2', 9.5]]); assert.ok(!('klDoi' in f.info));
});
test('v6: đơn giá Tổ trưởng hồ sơ cũ → bảng đơn giá theo vị trí của đội (chỉ khi tính theo tấn và chưa có giá Tổ trưởng); bỏ donGia', () => {
  let f = ens(lot6({info: {maRung: 'R', hinhThucLuong: 'sanluong', moHinhKy: 'giaokhoan', donGia: 420000, donGiaTan: {'Công nhân khai thác': 330000}}}));
  assert.deepStrictEqual(f.doi[0].hinhThuc.donGiaTan, {'Công nhân khai thác': 330000, 'Tổ trưởng': 420000}); assert.ok(!('donGia' in f.doi[0].hinhThuc));
  f = ens(lot6({info: {maRung: 'R', hinhThucLuong: 'sanluong', moHinhKy: 'giaokhoan', donGia: 420000, donGiaTan: {'Tổ trưởng': 500000}}})); assert.strictEqual(f.doi[0].hinhThuc.donGiaTan['Tổ trưởng'], 500000, 'giá đã có ở bảng được giữ');
  f = ens(lot6({info: {maRung: 'R', hinhThucLuong: 'ngaycong', moHinhKy: 'giaokhoan', donGia: 420000}})); assert.ok(!('donGia' in f.doi[0].hinhThuc) && !(f.doi[0].hinhThuc.donGiaNgay || {})['Tổ trưởng'], 'cách tính khác tấn: giá cũ không dùng, chỉ bỏ');
});
test('v6: cước theo bậc cự ly → tấn/km, giữ dữ liệu bậc ở bacCu', () => {
  const f = ens(lot6({info: {maRung: 'R', vanChuyen: {mode: 'tanDoan', bac: [{den: 50, gia: 40000}], donGiaKm: 700}}}));
  assert.strictEqual(f.info.vanChuyen.mode, 'tanKm'); assert.deepStrictEqual(f.info.vanChuyen.bacCu, [{den: 50, gia: 40000}]); assert.ok(!('bac' in f.info.vanChuyen)); assert.strictEqual(f.info.vanChuyen.donGiaKm, 700);
});
test('v6: chữ ở cột Đội / Đội xe chỉ bỏ khi dòng đã có đội; dòng chưa thuộc đội giữ chữ để báo lỗi', () => {
  const nc = [nv(1, 'Tổ trưởng', 'TT A', 'Tổ trưởng', '111111111111', {doi: 'Đội 1'}), nv(2, 'Tổ trưởng', 'TT B', 'Tổ trưởng', '222222222222', {doi: 'Đội 2'}), nv(3, 'Công nhân', 'LẠC', 'Công nhân khai thác', '333333333333', {doi: 'Đội 9'})];
  const f = ens(lot6({nc})); assert.deepStrictEqual(f.nc.map(r => [r.doiId !== '', 'doi' in r]), [[true, false], [true, false], [false, true]]);
});
test('v6: SQLite nâng cấp v5 → v6 có sao lưu file trước, chỉ đổi cột data của forests, hồ sơ khác nguyên vẹn', () => {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'hakqn-v6-')), file = path.join(d, 'x.sqlite');
  const s5 = new Store(file, {migrations: MIGRATIONS.slice(0, 5)});
  const o = {id: 'o', info: {ten: 'CHỦ', ma: 'C1', cccd: '049067005459'}, forests: {f: lot6({info: {maRung: 'R', hinhThucLuong: 'sanluong', moHinhKy: 'giaokhoan', soDoi: 2, khoiLuong: 12, donGia: 400000}})}};
  s5.save({v: 2, rs: {o}}); s5.close();
  const s6 = new Store(file), f = s6.load().rs.o.forests.f;
  assert.strictEqual(s6.db.pragma('user_version', {simple: true}), MIGRATIONS.length); assert.ok(MIGRATIONS.length >= 6);
  assert.ok(!('soDoi' in f.info) && f.info.klHoSoCu === 12 && f.doi[0].hinhThuc.donGiaTan['Tổ trưởng'] === 400000);
  assert.ok(fs.readdirSync(path.join(d, 'backups')).some(n => /^truoc-nang-cap-v5-len-v\d/.test(n)), 'có bản sao file trước khi nâng cấp'); s6.close();
});

test('v7: SQLite dựng danh mục lao động và danh mục xe từ dữ liệu 2.0, chỉ thêm khóa meta, không đổi hồ sơ lô; không ghi đè danh mục đã có', () => {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'hakqn-v7-')), file = path.join(d, 'x.sqlite');
  const s6 = new Store(file, {migrations: MIGRATIONS.slice(0, 6)});
  const f = lot6({info: {maRung: 'R', hinhThucLuong: 'sanluong', moHinhKy: 'giaokhoan', tuNgay: '01/10/2026'}, dx: [{_row: 2, bienSo: '92C-1', chuXe: 'A', taiXe: 'B', cccdTx: '049000000009', nguoiKy: 'Chủ xe', cccd: '049000000001', kdDen: '01/12/2027'}]});
  s6.save({v: 2, rs: {o: {id: 'o', info: {ten: 'CHỦ', ma: 'C1', cccd: '049067005459'}, forests: {f}}}}); const truoc = JSON.stringify(s6.load().rs); s6.close();
  const s7 = new Store(file), db = s7.load();
  assert.strictEqual(s7.db.pragma('user_version', {simple: true}), MIGRATIONS.length); assert.ok(MIGRATIONS.length >= 7);
  assert.strictEqual(JSON.stringify(db.rs), truoc, 'hồ sơ lô không đổi');
  assert.deepStrictEqual(db.dmLaoDong.map(r => [r.cccd, r.ngayCapNhat, r.viTri]), [['111111111111', '01/10/2026', 'Tổ trưởng'], ['222222222222', '01/10/2026', 'Công nhân khai thác']]);
  assert.deepStrictEqual([db.dmXeVC.length, db.dmXeVC[0].bienSo, db.dmXeVC[0].hanDangKiem], [1, '92C-1', '01/12/2027']); s7.close();
});
