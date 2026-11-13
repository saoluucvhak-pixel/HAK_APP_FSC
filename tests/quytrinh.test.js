'use strict';
const test = require('node:test'), assert = require('node:assert');
const Q = require('../src/quytrinh');
const items = mo => Q.applicable(mo).map(f => ({code: f.code, ready: 'du', sig: 's' + f.code}));

test('danh mục: mỗi mẫu đúng một đợt; đợt 2 gồm BM-08, 09, 10, 14; đợt 1 gồm 16 mẫu', () => {
  const codes = Q.FORMS.map(f => f.code); assert.strictEqual(new Set(codes).size, codes.length, 'mã không trùng');
  assert.deepStrictEqual(Q.FORMS.filter(f => f.dot === 2).map(f => f.code).sort(), ['08', '09', '10', '14']); assert.strictEqual(Q.FORMS.filter(f => f.dot === 1).length, 16);
});
test('mẫu áp dụng theo hình thức hợp đồng: giao khoán có BM-01, BM-20; trực tiếp có BM-03; đợt 1 đứng trước đợt 2', () => {
  const gk = Q.applicable('giaokhoan').map(f => f.code), tt = Q.applicable('tructiep').map(f => f.code);
  assert.ok(gk.includes('01') && gk.includes('20') && !gk.includes('03')); assert.ok(tt.includes('03') && !tt.includes('01') && !tt.includes('20'));
  assert.ok(Q.applicable('giaokhoan').findIndex(f => f.dot === 2) > Q.applicable('giaokhoan').map(f => f.dot).lastIndexOf(1));
});
test('in ấn: chưa in → đã in (khớp) → dữ liệu đổi → in lại khớp; bỏ xác nhận', () => {
  const st = Q.emptyState(); let L = Q.evaluate(items('giaokhoan'), st); assert.ok(L.every(x => x.printed === 'chua'));
  Q.mark(st, '01', 's01', '2026-01-01T00:00:00Z'); L = Q.evaluate(items('giaokhoan'), JSON.parse(JSON.stringify(st))); assert.strictEqual(L.find(x => x.code === '01').printed, 'da');
  const changed = items('giaokhoan').map(x => x.code === '01' ? {...x, sig: 'khac'} : x); assert.strictEqual(Q.evaluate(changed, st).find(x => x.code === '01').printed, 'doi', 'dữ liệu đổi sau khi in');
  Q.mark(st, '01', 'khac', 'n'); assert.strictEqual(Q.evaluate(changed, st).find(x => x.code === '01').printed, 'da');
  assert.strictEqual(Q.unmark(st, '01'), true); assert.strictEqual(Q.unmark(st, '01'), false);
});
test('tổng hợp từng đợt và việc nên làm tiếp theo theo đúng thứ tự quy trình', () => {
  const st = Q.emptyState(); let L = Q.evaluate(items('giaokhoan'), st), s = Q.summary(L);
  assert.deepStrictEqual([s.dot1.total, s.dot2.total, s.dot1.chuaIn], [15, 4, 15], 'giao khoán: 15 mẫu đợt 1 (không có BM-03), 4 mẫu đợt 2, chưa in mẫu nào');
  assert.strictEqual(Q.next(s, {chuaChuanBi: 'khai công ty'}).step, 'chuanbi'); assert.strictEqual(Q.next(s, {}).step, 'dot1');
  Q.applicable('giaokhoan').filter(f => f.dot === 1).forEach(f => Q.mark(st, f.code, 's' + f.code, 'n')); L = Q.evaluate(items('giaokhoan'), st); s = Q.summary(L);
  assert.strictEqual(s.dot1.xong, true); assert.strictEqual(Q.next(s, {coPhieuCan: false}).step, 'khaithac'); assert.strictEqual(Q.next(s, {coPhieuCan: true}).step, 'dot2');
  Q.applicable('giaokhoan').filter(f => f.dot === 2).forEach(f => Q.mark(st, f.code, 's' + f.code, 'n')); s = Q.summary(Q.evaluate(items('giaokhoan'), st)); assert.strictEqual(Q.next(s, {coPhieuCan: true}).step, 'xong');
  const bad = items('giaokhoan').map(x => x.code === '02' ? {...x, sig: 'doi'} : x); assert.strictEqual(Q.next(Q.summary(Q.evaluate(bad, st)), {coPhieuCan: true}).step, 'dot1', 'mẫu đợt 1 đổi sau khi in được nêu trước đợt 2');
});
test('stateOf tạo mới khi hỏng; peek không ghi vào dữ liệu', () => {
  const f = {inAn: 'hỏng'}; assert.deepStrictEqual(Q.stateOf(f).items, {}); const g = {a: 1}; assert.deepStrictEqual(Q.peek(g).items, {}); assert.deepStrictEqual(Object.keys(g), ['a']);
});

test('hướng in đợt 2 (giấy trắng / nền + in đè) tổng hợp từ trạng thái từng mục', () => {
  const R = adv => Q.route(adv.map(a => ({advice: a})));
  assert.strictEqual(R(['trang', 'trang']).key, 'trang'); assert.strictEqual(R(['nen']).key, 'nen'); assert.strictEqual(R(['thieu']).key, 'thieu');
  assert.strictEqual(R(['de', 'de']).key, 'de'); assert.strictEqual(R(['cho', 'cho']).key, 'cho'); assert.strictEqual(R([]).key, 'trong');
  assert.strictEqual(R(['de', 'doibocuc']).key, 'doibocuc', 'một nhóm đổi bố cục thì cả mẫu cảnh báo');
  const m = R(['de', 'trang', 'cho']); assert.strictEqual(m.key, 'hon'); assert.ok(/1\/3 in đè/.test(m.text) && /1\/3 giấy trắng/.test(m.text));
  assert.ok(/đối chiếu/.test(R(['kiemtra', 'de']).text));
});
test('việc nên làm tiếp nêu đúng bước in nền, chờ dữ liệu, in đè', () => {
  const st = Q.emptyState(); Q.applicable('giaokhoan').filter(f => f.dot === 1).forEach(f => Q.mark(st, f.code, 's' + f.code, 'n'));
  const s = Q.summary(Q.evaluate(items('giaokhoan'), st)), N = (o) => Q.next(s, o);
  assert.ok(/in sẵn mẫu nền đợt 2/.test(N({coPhieuCan: false, d2: {nenReady: 6, nenPrinted: 0, deReady: 0, cho: 0, doibocuc: 0, trang: 0}}).text));
  assert.ok(/Đã in nền 6 mục/.test(N({coPhieuCan: false, d2: {nenReady: 6, nenPrinted: 6, deReady: 0, cho: 6, doibocuc: 0, trang: 0}}).text));
  const de = N({coPhieuCan: true, d2: {nenReady: 6, nenPrinted: 6, deReady: 6, cho: 0, doibocuc: 0, trang: 0}}); assert.strictEqual(de.step, 'dot2'); assert.ok(/In đè đợt 2: nạp lại tờ mẫu nền đã in cho 6 mục/.test(de.text));
  assert.ok(/Bố cục/.test(N({coPhieuCan: true, d2: {nenReady: 6, nenPrinted: 6, deReady: 4, cho: 0, doibocuc: 2, trang: 0}}).text) || /đổi bố cục/.test(N({coPhieuCan: true, d2: {nenReady: 6, nenPrinted: 6, deReady: 4, cho: 0, doibocuc: 2, trang: 0}}).text));
  assert.ok(/giấy trắng/.test(N({coPhieuCan: true, d2: {nenReady: 6, nenPrinted: 0, deReady: 0, cho: 0, doibocuc: 0, trang: 6}}).text));
  assert.ok(/thiếu dữ liệu để in đè/.test(N({coPhieuCan: true, d2: {nenReady: 6, nenPrinted: 6, deReady: 0, cho: 6, doibocuc: 0, trang: 0}}).text));
});
