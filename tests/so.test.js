'use strict';
const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('fs'), path = require('path');
const So = require('../src/so'), K = require('../src/docphieucan'), Money = require('../src/money'), Dates = require('../src/dates'), PC = require('../src/phieucan'), T = require('../src/tienich');
const trim = s => String(s == null ? '' : s).trim();
const api = K.create({trim, pad2: n => (n < 10 ? '0' : '') + n, numSwap: s => s, fmtRaw: n => String(n), fmt: n => String(n), toDec: So.toDec, normDate: s => trim(s), HAKMoney: Money, HAKDates: Dates, HAKPhieuCan: PC,
  volumeOf: () => null, curForest: () => ({}), nhanHdId: (f, id) => 'Hợp đồng ' + id, phieuSaiHd: () => null, cheoCtx: () => ({}), db: {rs: {}}});

test('parseKl bảng ca kg: từ chối 0x10, 1e1, số âm; 12.500 kg = 12500; 12,500 mơ hồ', () => {
  for (const x of ['0x10', '1e1', '-5']) assert.equal(So.parseKl(x, {don: 'kg'}).ok, false, x);
  assert.equal(So.parseKl('', {don: 'kg'}).blank, true);
  assert.equal(So.parseKl('1.234,5', {don: 'kg'}).value, 1234.5);
  assert.equal(So.parseKl('12.500', {don: 'kg'}).value, 12500);
  const mh = So.parseKl('12,500', {don: 'kg'}); assert.equal(mh.ok, false); assert.equal(mh.moHo, true);
});

test('parseKl bảng ca tấn: từ chối 0x10, 1e1; 25.350 tấn = 25.35; 12,500 mơ hồ', () => {
  for (const x of ['0x10', '1e1']) assert.equal(So.parseKl(x, {don: 'tan'}).ok, false, x);
  assert.equal(So.parseKl('25.350', {don: 'tan'}).value, 25.35);
  const mh = So.parseKl('12,500', {don: 'tan'}); assert.equal(mh.ok, false); assert.equal(mh.moHo, true);
});

test('cùng một ô "7.500" cột kg qua Dán, Excel kiểu chữ (normPC) và Thêm tay cho cùng 7500 kg (7,5 tấn)', () => {
  const dan = T.danParse('Số phiếu\tNgày cân 1\tBiển số\tKhối lượng (kg)\nP1\t05/10/2026\t92C-12345\t7.500')[1][3];
  const rExcel = api.normPC({soPhieu: 'P1', ngay: '05/10/2026', bienSo: '92C-12345', klKg: '7.500'});
  const rDan = api.normPC({soPhieu: 'P1', ngay: '05/10/2026', bienSo: '92C-12345', klKg: dan});
  const rTay = api.normPC({soPhieu: 'P1', ngay: '05/10/2026', bienSo: '92C-12345', klKg: '7.500'});
  assert.equal(rExcel.klKg, 7500); assert.equal(rExcel.kl, 7.5);
  assert.equal(rDan.klKg, 7500); assert.equal(rDan.kl, 7.5);
  assert.equal(rTay.klKg, 7500); assert.equal(rTay.kl, 7.5);
});

test('normPC cân chữ: can1 "12.500", can2 "5.000" (kg) → klKg 7500, kl 7,5', () => {
  const r = api.normPC({soPhieu: 'P1', ngay: '05/10/2026', bienSo: '92C-12345', can1: '12.500', can2: '5.000'});
  assert.equal(r.can1, 12500); assert.equal(r.can2, 5000); assert.equal(r.klKg, 7500); assert.equal(r.kl, 7.5);
});

test('docBangDonGia / parseDonGia: "abc" → lỗi và đơn giá cũ giữ nguyên; "" → xóa; "-5000", "5000abc" → lỗi; "1.250.000" → 1250000', () => {
  const cu = {'Tổ trưởng': 420000, 'Công nhân cưa': 350000};
  const r1 = So.docBangDonGia([['Tổ trưởng', 'abc'], ['Công nhân cưa', '']], cu);
  assert.equal(r1.ok, false);
  assert.equal(r1.map['Tổ trưởng'], 420000, 'đơn giá cũ giữ nguyên khi nhập chữ lạ');
  assert.equal(r1.map['Công nhân cưa'], null, 'ô trống thì xóa đơn giá');
  for (const bad of ['-5000', '5000abc', '0']) assert.equal(So.parseDonGia(bad).ok, false, bad);
  assert.equal(So.parseDonGia('1.250.000').value, 1250000);
});

test('checkPC khối lượng bất thường (> 60 tấn) và cân đảo (cân 1 ≤ cân 2)', () => {
  const rec = pcs => ({info: {maRung: 'R-A'}, exp: {}, doi: [], hdvc: [{id: 'h1', donViId: 'u'}], dx: [{id: 'x1', bienSo: '92C-12345'}], pc: pcs.map((p, i) => Object.assign({_row: i + 2, soPhieu: 'P' + i, ngay: '05/10/2026', bienSo: '92C-12345', xeRowId: 'x1', hdvcId: 'h1'}, p))});
  const c1 = api.checkPC(rec([{kl: 120}, {kl: 25350}]));
  assert.equal(c1.errs.length, 0, 'vượt 60 tấn chỉ cảnh báo, không chặn');
  assert.equal(c1.warns.filter(w => /vượt ngưỡng 60 tấn/.test(w)).length, 2);
  const c2 = api.checkPC(rec([api.normPC({_row: 2, soPhieu: 'P1', ngay: '05/10/2026', bienSo: '92C-12345', can1: 14900, can2: 40000}), api.normPC({_row: 3, soPhieu: 'P2', ngay: '05/10/2026', bienSo: '92C-12345', can1: 40000, can2: 40000})]));
  assert.equal(c2.errs.filter(e => /Cân lần 1 phải lớn hơn cân lần 2/.test(e)).length, 2);
  assert.equal(c2.errs.filter(e => /Thiếu khối lượng/.test(e)).length, 0, 'cân đảo không báo nhầm là Thiếu khối lượng');
});

test('N-04: không còn const toDec = hoặc const toNum = tự định nghĩa trong tests/*.test.js', () => {
  const dir = path.join(__dirname);
  const viPham = [];
  for (const f of fs.readdirSync(dir).filter(x => x.endsWith('.test.js'))) {
    const s = fs.readFileSync(path.join(dir, f), 'utf8');
    if (/^\s*const\s+(toDec|toNum)\s*=/m.test(s)) viPham.push(f);
  }
  assert.deepEqual(viPham, []);
});

test('ô nhập số định dạng theo Cài đặt và chuyển về đúng giá trị nghiệp vụ', () => {
  assert.equal(So.groupInput('1250000,75', 'vi'), '1.250.000,75');
  assert.equal(So.groupInput('1250000.75', 'en'), '1,250,000.75');
  assert.equal(So.groupInput('1250000,', 'vi'), '1.250.000,');
  assert.equal(So.groupInput('12.5', 'vi'), '12.5');
  assert.equal(So.groupInput('1234', 'en', true), '1,234');
  assert.equal(So.readInput('1.250.000,75', 'vi'), 1250000.75);
  assert.equal(So.readInput('1,250,000.75', 'en'), 1250000.75);
  assert.equal(So.readInput('1,234', 'en', true), 1234);
  assert.equal(So.readInput('1,2', 'en'), 'x');
  assert.equal(So.readInput('', 'en', true), null);
});
