'use strict';
/* src/docphieucan.js — đọc Excel và xử lý phiếu cân, tách khỏi giao diện (ui/app/03). Kiểm thử không cần Electron:
 * ctx giả cấp tiện ích; việc ghép phiếu với hợp đồng và xe được kiểm bằng e2e (e2e-phieu30, e2e-doichieu30) và so bản in. */
const test = require('node:test'), assert = require('node:assert');
const fs = require('fs'), path = require('path');
const K = require('../src/docphieucan');
const Money = require('../src/money');
const trim = s => String(s == null ? '' : s).trim();
const {toDec} = require('../src/so');
const mk = () => K.create({
  trim, pad2: n => (n < 10 ? '0' : '') + n, numSwap: s => s, fmtRaw: n => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.'),
  toDec, normDate: s => trim(s), HAKMoney: Money
});

test('ctx: mọi tên mà mã dùng qua ctx.<tên> đều có trong TEN_NGOAI (giao diện cấp đủ, không sót)', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'src', 'docphieucan.js'), 'utf8');
  const used = [...new Set([...src.matchAll(/\bctx\.([A-Za-z_$][\w$]*)/g)].map(m => m[1]))].sort();
  assert.deepStrictEqual(used, [...K.TEN_NGOAI].sort());
});

test('ctx: giao diện cấp getter cho đúng các tên này (ui/app/03 khớp TEN_NGOAI)', () => {
  const ui = fs.readFileSync(path.join(__dirname, '..', 'ui', 'app', '03-doc-excel-phieu-can.js'), 'utf8');
  const got = [...ui.matchAll(/^\s+get ([A-Za-z_$][\w$]*)\(\) \{ return \1; \}/gm)].map(m => m[1]).sort();
  assert.deepStrictEqual(got, [...K.TEN_NGOAI].sort());
});

test('trả về đủ các hàm mà các module giao diện khác dùng', () => {
  const api = mk();
  ['checkPC', 'normPC', 'normNC', 'normDX', 'parseSheet', 'payVC', 'tripsOf', 'groupsPC', 'doiXeOfPc', 'doiChieuPcVanChuyen', 'pcThuocNhom', 'pcKhopXeVC', 'pcNgoaiPhamViVC', 'totalKg', 'fmtT', 'moneyWords', 'bienKey', 'hanLoiOf'].forEach(n => assert.strictEqual(typeof api[n], 'function', n));
});

test('bienKey: viết hoa và bỏ khoảng trắng, dấu chấm, dấu gạch ngang (77C-123.45 và 77c 12345 là cùng BKS)', () => {
  const api = mk();
  assert.strictEqual(api.bienKey('77C-123.45'), '77C12345'); assert.strictEqual(api.bienKey('77c 12345'), '77C12345'); assert.strictEqual(api.bienKey(null), '');
  assert.strictEqual(api.bienKey('77C-123.45'), api.bienKey('77c 12345'));
});

test('pcKhopXeVC: có ID dòng xe thì chỉ khớp theo ID; không có thì khớp theo BKS đã chuẩn hóa; BKS trống không khớp', () => {
  const api = mk();
  assert.strictEqual(api.pcKhopXeVC({xeRowId: 'x1', bienSo: 'AAA'}, {id: 'x1', bienSo: 'BBB'}), true);
  assert.strictEqual(api.pcKhopXeVC({xeRowId: 'x1', bienSo: 'BBB'}, {id: 'x2', bienSo: 'BBB'}), false);
  assert.strictEqual(api.pcKhopXeVC({bienSo: '92c 123.45'}, {id: 'x9', bienSo: '92C-12345'}), true);
  assert.strictEqual(api.pcKhopXeVC({bienSo: ''}, {id: 'x9', bienSo: ''}), false);
});

test('totalKg và fmtT: cộng khối lượng theo kg làm tròn từng phiếu, bỏ phiếu không có số; hiển thị tấn 3 số lẻ', () => {
  const api = mk();
  assert.strictEqual(api.totalKg([{kl: 12.5}, {kl: 9.25}, {kl: 'x'}, {}]), 21750);
  assert.strictEqual(api.totalKg([{kl: 0.0004}, {kl: 0.0004}]), 0);
  assert.strictEqual(api.fmtT(25400), '25,400'); assert.strictEqual(api.fmtT(1234567), '1.234,567'); assert.strictEqual(api.fmtT(0), '0,000');
});

test('moneyWords: đọc số tiền bằng chữ tiếng Việt', () => {
  const api = mk();
  assert.strictEqual(api.moneyWords(0), 'Không đồng.');
  assert.strictEqual(api.moneyWords(1500000), 'Một triệu năm trăm nghìn đồng chẵn.');
  assert.strictEqual(api.moneyWords(21), 'Hai mươi mốt đồng chẵn.');
  assert.strictEqual(api.moneyWords(105), 'Một trăm lẻ năm đồng chẵn.');
});

test('normPC: để trống khối lượng thì lấy Cân 1 − Cân 2; chỉ điền kg thì tấn = kg ÷ 1000; giờ cân chỉ lấy phần giờ', () => {
  const api = mk();
  const a = api.normPC({_row: 2, soPhieu: ' 1001 ', ngay: '05/10/2026', can1: 40400, can2: 15000, gioCan1: '05/10/2026 08:25:30', gioCan2: 0.4});
  assert.strictEqual(a.soPhieu, '1001'); assert.strictEqual(a.klKg, 25400); assert.strictEqual(a.kl, 25.4);
  assert.strictEqual(a.gioCan1, '08:25:30'); assert.strictEqual(a.gioCan2, '09:36:00');
  assert.strictEqual(api.normPC({klKg: 2840}).kl, 2.84);
  assert.strictEqual(api.normPC({kl: '12,5'}).kl, 12.5);
});

test('normPC: số phiếu dạng số được ghi thành chữ; ô chỉ có ngày thì không có giờ', () => {
  const api = mk();
  assert.strictEqual(api.normPC({soPhieu: 1001}).soPhieu, '1001');
  assert.strictEqual(api.normPC({gioCan1: '05/10/2026'}).gioCan1, '');
});

test('noneVal: các cách ghi “không có” được coi là trống; giá trị thật giữ nguyên', () => {
  const api = mk();
  ['Không', 'không có', 'N/A', '-', 'x'].forEach(v => assert.strictEqual(api.noneVal(v), '', v));
  assert.strictEqual(api.noneVal('Tổ trưởng'), 'Tổ trưởng');
});
