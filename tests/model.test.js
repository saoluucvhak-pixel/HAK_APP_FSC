'use strict';
/* Cấu trúc 2.0, giai đoạn 3 (docs/THIET_KE_BANG_ME_CON.md): đội khai thác là bảng con của lô, nhân công mang doiId.
 * Bất biến: lô cũ chuẩn hóa rồi dựng lại dạng cũ giống hệt; chuẩn hóa chạy lại không đổi. */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs'), os = require('os'), path = require('path');
const M = require('../src/model');
const {Store} = require('../src/store');

const clone = x => JSON.parse(JSON.stringify(x));
const roundTrip = (db0, label) => {
  const db = clone(db0), before = clone(db), m = M.ensureDb(db);
  assert.deepStrictEqual(db, before, label + ': không sửa đầu vào');
  assert.deepStrictEqual(M.legacyDb(m), before, label + ': dựng lại dạng cũ giống hệt');
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
