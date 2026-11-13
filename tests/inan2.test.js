'use strict';
const test = require('node:test'), assert = require('node:assert');
const IA = require('../src/inan2');
const it = (code, gkey, o = {}) => Object.assign({key: IA.keyOf(code, gkey), code, gkey: gkey || '', label: code, nenMissing: [], fullMissing: [], sig: 'S-' + code + (gkey || ''), info: {ver: '1', land: false, rows: 10, paras: 30, maxLine: 80}}, o);
const ALL = () => [it('08'), it('09', 'A'), it('09', 'B'), it('10', 'A'), it('10', 'B'), it('14')];

test('khóa mục: BM-08 và BM-14 theo lô; BM-09/BM-10 theo mã nhóm vận chuyển ổn định', () => {
  assert.strictEqual(IA.keyOf('08'), '08'); assert.strictEqual(IA.keyOf('14', 'x'), '14');
  assert.strictEqual(IA.keyOf('09', '0490'), '09:0490'); assert.deepStrictEqual(IA.splitKey('10:0490'), {code: '10', gkey: '0490'}); assert.deepStrictEqual(IA.splitKey('08'), {code: '08', gkey: ''});
});
test('hai trạng thái độc lập: chưa in nền + đủ dữ liệu → giấy trắng; chưa đủ → nền hoặc thiếu', () => {
  const st = IA.emptyState();
  assert.strictEqual(IA.evaluate(it('08'), st).advice, 'trang');
  assert.strictEqual(IA.evaluate(it('08', '', {fullMissing: [{text: 'x'}]}), st).advice, 'nen');
  assert.strictEqual(IA.evaluate(it('08', '', {nenMissing: [{text: 'x'}], fullMissing: [{text: 'x'}]}), st).advice, 'thieu');
});
test('đã in nền: đủ dữ liệu + bố cục khớp → in đè; chưa đủ → chờ; ghi nhận bền (đối tượng thuần JSON)', () => {
  const st = IA.emptyState(), a = it('09', 'A', {fullMissing: [{text: 'phiếu cân'}]});
  IA.confirm(st, a, '2026-01-01T00:00:00.000Z');
  assert.strictEqual(IA.evaluate(a, st).advice, 'cho');
  const b = it('09', 'A'); assert.strictEqual(IA.evaluate(b, JSON.parse(JSON.stringify(st))).advice, 'de', 'đọc lại từ JSON vẫn nhớ');
  assert.strictEqual(IA.evaluate(it('09', 'B'), st).advice, 'trang', 'nhóm khác chưa in nền');
});
test('bố cục đổi sau khi in nền → không in đè; nêu khác biệt; điền số vào ô trống (chữ ký giữ nguyên) không mất xác nhận', () => {
  const st = IA.emptyState(); IA.confirm(st, it('08'), 'n');
  const moved = it('08', '', {sig: 'S-moi', info: {ver: '1', land: false, rows: 12, paras: 30, maxLine: 120}});
  const r = IA.evaluate(moved, st); assert.strictEqual(r.advice, 'doibocuc'); assert.deepStrictEqual(r.diff, ['số dòng bảng: 10 → 12', 'độ dài dòng dài nhất: 80 → 120']);
  assert.strictEqual(IA.evaluate(it('08'), st).advice, 'de');
});
test('bỏ xác nhận (tờ nền hỏng/mất) và xác nhận lại', () => {
  const st = IA.emptyState(); IA.confirm(st, it('14'), 'n'); assert.strictEqual(IA.unconfirm(st, '14'), true); assert.strictEqual(IA.unconfirm(st, '14'), false);
  assert.strictEqual(IA.evaluate(it('14'), st).advice, 'trang');
});
test('nền in từ trước: bắt buộc đối chiếu rồi mới in đè; chưa đủ dữ liệu thì chờ', () => {
  const st = IA.emptyState(); IA.confirmLegacy(st, it('10', 'A'), 'n');
  assert.strictEqual(IA.evaluate(it('10', 'A'), st).advice, 'kiemtra');
  IA.crossChecked(st, '10:A', 'n2'); assert.strictEqual(IA.evaluate(it('10', 'A'), st).advice, 'de');
  assert.strictEqual(IA.evaluate(it('10', 'A', {fullMissing: [{text: 'x'}]}), st).advice, 'cho');
});
test('stateOf: tạo mới khi thiếu hoặc hỏng, giữ nguyên khi hợp lệ', () => {
  const f = {}; const s1 = IA.stateOf(f); assert.strictEqual(f.inDot2, s1); assert.strictEqual(IA.stateOf(f), s1);
  const g = {inDot2: 'hỏng'}; assert.deepStrictEqual(IA.stateOf(g).items, {});
});
test('gói: đủ cả bốn mẫu, chưa in nền → nút chính là giấy trắng; nền in một phần → tách giấy trắng và in đè', () => {
  let st = IA.emptyState(), list = ALL().map(x => IA.evaluate(x, st)), p = IA.plan(list);
  assert.strictEqual(p.primary, 'trang'); assert.strictEqual(p.trang.length, 6); assert.strictEqual(p.de.length, 0);
  IA.confirm(st, it('08'), 'n'); IA.confirm(st, it('09', 'A'), 'n');
  p = IA.plan(ALL().map(x => IA.evaluate(x, st)));
  assert.deepStrictEqual(p.de.map(x => x.key).sort(), ['08', '09:A']); assert.deepStrictEqual(p.trang.map(x => x.key).sort(), ['09:B', '10:A', '10:B', '14']);
  assert.strictEqual(p.primary, 'de');
});
test('chưa đủ dữ liệu đầy đủ nhưng đủ dựng nền → nút chính là in nền; mục đã đổi bố cục được in lại nền hoặc giấy trắng', () => {
  const list = ALL().map(x => IA.evaluate(Object.assign(x, {fullMissing: [{text: 'x'}]}), IA.emptyState()));
  const p = IA.plan(list); assert.strictEqual(p.primary, 'nen'); assert.strictEqual(p.nen.length, 6); assert.strictEqual(p.trang.length, 0);
  const st = IA.emptyState(); IA.confirm(st, it('08'), 'n');
  const q = IA.plan([IA.evaluate(it('08', '', {sig: 'moi'}), st)]); assert.strictEqual(q.doibocuc.length, 1); assert.strictEqual(q.nen.length, 1); assert.strictEqual(q.trang.length, 1); assert.strictEqual(q.de.length, 0);
});
test('coverage: báo mẫu chưa có mục nào (ví dụ chưa khai đội xe → thiếu BM-09, BM-10)', () => {
  assert.deepStrictEqual(IA.coverage([it('08'), it('14')]), ['09', '10']); assert.deepStrictEqual(IA.coverage(ALL()), []);
});
test('chữ ký bố cục: ổn định, khác khi khổ giấy/lề/chân trang/nội dung đổi', () => {
  const base = {land: true, tight: false, footer: 'f', xml: '<x/>'};
  assert.strictEqual(IA.signature(base).sig, IA.signature(Object.assign({}, base)).sig);
  for (const ch of [{land: false}, {tight: true}, {footer: 'g'}, {xml: '<y/>'}]) assert.notStrictEqual(IA.signature(Object.assign({}, base, ch)).sig, IA.signature(base).sig);
});
