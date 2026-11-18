'use strict';
/* Phiếu #02 (ND-02, ND-03; rà soát 01: C-01, C-04, B-05): MỘT cách tính tổng khối lượng phiếu cân và MỘT quy tắc so biển số.
 * Trên main 13d82a3: C-01 ra 24,691 / 24,692 tùy hàm; B-05 không báo trùng "92C-12345" và "92C12345". */
const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const L = require('../src/lorung'), DM = require('../src/dinhmuc'), PB = require('../src/phanbo'), TH = require('../src/tonghop');
const K = require('../src/kiemtranhieudoi'), Dates = require('../src/dates'), BKS = require('../src/bks');

test('C-01: phiếu chưa làm tròn đến kg — mọi nơi cộng ra cùng một số (làm tròn từng phiếu rồi cộng)', () => {
  const pc = [{kl: 12.3455}, {kl: 12.3455}, {kl: 0.0004}];
  assert.equal(DM.tongPhieuTan(pc), 24.692);
  assert.equal(L.sumKl(pc), 24.692, 'lorung.sumKl (gói sao lưu lô, xem trước khôi phục)');
  assert.equal(PB.tinh({doi: [], pc}).tong, 24.692, 'phân bổ');
  assert.equal(DM.tongPhieuKg(pc), 24692);
  assert.deepEqual(pc.map(DM.kgPhieu), [12346, 12346, 0]);
});

test('C-01: trang tổng hợp theo xe cộng khối lượng bằng cùng hàm', () => {
  const db = {rs: {o1: {id: 'o1', info: {ten: 'A'}, forests: {f1: {id: 'f1', info: {maRung: 'R-1'}, dx: [{bienSo: '92C-123.45'}], pc: [{bienSo: '92C12345', kl: 12.3455}, {bienSo: '92c 123.45', kl: 12.3455}]}}}}};
  const r = TH.xe(db, '92C-12345'), dong = r.muc.flatMap(m => m.dong), so = JSON.stringify(dong);
  assert.ok(so.includes('24.692') || so.includes('24,692'), so);
});

test('kgPhieu: số, chuỗi có dấu phẩy, không hợp lệ, âm, 0', () => {
  assert.equal(DM.kgPhieu({kl: 9.25}), 9250); assert.equal(DM.kgPhieu({kl: '9,25'}), 9250); assert.equal(DM.kgPhieu({kl: 'x'}), 0);
  assert.equal(DM.kgPhieu({kl: -1}), 0); assert.equal(DM.kgPhieu({kl: 0}), 0); assert.equal(DM.kgPhieu(null), 0); assert.equal(DM.tongPhieuTan(null), 0);
});

test('B-05: xe trùng BKS khác cách viết trong cùng lô bị báo trùng', () => {
  const api = K.create({db: {rs: {}}, trim: s => String(s == null ? '' : s).trim(), HAKDates: Dates, isCccd: s => /^\d{12}$/.test(s), numSwap: s => s, hdTenKhop: () => true,
    signerKey: r => r.cccd, keyName: s => s, todayStr: () => '18/11/2026', dateKey: s => Dates.parse(s) ? Dates.parse(s).key : 0});
  const x = (row, b) => ({_row: row, chuXe: 'CHỦ ' + row, bienSo: b, nguoiKy: 'Chủ xe', cccd: '04900000000' + row, ngaySinh: '01/01/1980', ngayCap: '01/01/2021', noiCap: 'CA', diaChi: 'x', cavet: 'x', kdDen: '01/01/2030', hanBH: '01/01/2030'});
  const trung = api.checkDX({info: {maRung: 'R-A'}, dx: [x(2, '92C-12345'), x(3, '92C12345'), x(4, '92c 123.45'), x(5, '92C-67890')], hdvc: null}).errs.filter(e => /trùng/.test(e));
  assert.equal(trung.length, 2, JSON.stringify(trung));
  assert.match(trung[0], /^Dòng 3: Biển kiểm soát trùng dòng 2/); assert.match(trung[1], /^Dòng 4: Biển kiểm soát trùng dòng 2/);
});

test('ND-03: chỉ còn MỘT định nghĩa chuẩn hóa BKS (src/bks.js); timkiem.js giữ cách so riêng cho tìm kiếm (có chú thích)', () => {
  const pat = /toUpperCase\(\)\.replace\(\/\[\\s\.\\-\]\/g, ''\)/;
  const files = [...fs.readdirSync(path.join(root, 'src')).map(n => 'src/' + n), ...fs.readdirSync(path.join(root, 'ui', 'app')).map(n => 'ui/app/' + n), 'ui/reports.js'].filter(n => n.endsWith('.js'));
  const co = files.filter(n => pat.test(fs.readFileSync(path.join(root, n), 'utf8')));
  assert.deepEqual(co, ['src/bks.js'], 'còn bản sao: ' + co.join(', '));
  const tk = fs.readFileSync(path.join(root, 'src', 'timkiem.js'), 'utf8');
  assert.match(tk, /const plate = v => fold\(v\)\.replace\(\/\[\\s\.\\-\]\/g, ''\);\s+\/\/ RIÊNG tìm kiếm/);
  assert.equal(BKS.khoa(' 92c-123.45 '), '92C12345');
});

test('ND-02: phiếu ghi từ HoSoKeo có khối lượng làm tròn đến kg (lookup.js)', () => {
  const src = fs.readFileSync(path.join(root, 'src', 'lookup.js'), 'utf8');
  assert.match(src, /if \(tan > 0\) kl = Math\.round\(tan \* 1000\) \/ 1000;/);
});
