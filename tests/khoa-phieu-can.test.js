'use strict';
/* Phiếu #04 (ND-04, kịch bản B-06 và B-07 của docs/RA_SOAT_01.md): một khóa phiếu cân (HAKBks.khoaPhieu = số phiếu chuẩn hóa + ngày) ở mọi đường nhập.
 * Quyết định của CHỦ (18/11/2026): cùng số phiếu nhưng KHÁC ngày là hợp lệ và có cảnh báo (không chặn); cùng số phiếu VÀ cùng ngày trong cùng lô thì chặn, nêu phiếu đã có ở hợp đồng nào. */
const test = require('node:test'), assert = require('node:assert');
const K = require('../src/docphieucan'), Money = require('../src/money'), Dates = require('../src/dates'), PC = require('../src/phieucan'), S = require('../src/stage'), BKS = require('../src/bks');
const trim = s => String(s == null ? '' : s).trim();
const {toDec} = require('../src/so');
const api = K.create({trim, pad2: n => (n < 10 ? '0' : '') + n, numSwap: s => s, fmtRaw: n => String(n), fmt: n => String(n), toDec, normDate: s => trim(s), HAKMoney: Money, HAKDates: Dates, HAKPhieuCan: PC,
  volumeOf: () => null, curForest: () => ({}), nhanHdId: (f, id) => 'Hợp đồng ' + id, phieuSaiHd: () => null, cheoCtx: () => ({}), db: {rs: {}}});
const P = (so, ngay, extra) => Object.assign({soPhieu: so, ngay, bienSo: '92C-12345', kl: 10, xeRowId: 'x1', hdvcId: 'h1'}, extra);
const rec = pc => ({info: {maRung: 'R-A'}, exp: {}, doi: [], hdvc: [{id: 'h1', donViId: 'u'}, {id: 'h2', donViId: 'u'}], dx: [{id: 'x1', bienSo: '92C-12345'}], pc: pc.map((p, i) => Object.assign({_row: i + 2}, p))});
const errs = c => c.errs.filter(m => /phiếu|Phiếu/i.test(m) && /trùng|đã có/.test(m)), warns = c => c.warns.filter(m => /cùng số phiếu/i.test(m));

test('B-06: "PA 1" và "PA1" cùng ngày là MỘT phiếu: nạp Excel báo trùng (trước đây không báo)', () => {
  const c = api.checkPC(rec([P('PA 1', '05/10/2026'), P('PA1', '05/10/2026')]));
  assert.strictEqual(errs(c).length, 1, c.errs.join(' | '));
  assert.match(errs(c)[0], /Dòng 3/); assert.match(errs(c)[0], /dòng 2/);
});
test('B-06: "PA1" khác ngày KHÔNG còn là lỗi chặn; có cảnh báo nêu số phiếu, ngày và dòng đã có', () => {
  const c = api.checkPC(rec([P('PA1', '05/10/2026'), P('PA1', '06/10/2026')]));
  assert.strictEqual(errs(c).length, 0, c.errs.join(' | '));
  assert.strictEqual(warns(c).length, 1, c.warns.join(' | '));
  assert.match(warns(c)[0], /PA1/); assert.match(warns(c)[0], /05\/10\/2026/); assert.match(warns(c)[0], /dòng 2/);
});
test('B-07: phiếu trùng hẳn (số + ngày) ở hợp đồng khác của lô: chặn và nêu phiếu đã có ở hợp đồng nào', () => {
  const c = api.checkPC(rec([P('PA1', '05/10/2026', {hdvcId: 'h1'}), P('PA1', '5/10/2026', {hdvcId: 'h2'})]));
  assert.strictEqual(errs(c).length, 1, c.errs.join(' | ')); assert.match(errs(c)[0], /h1/);   // phiếu có trước nằm ở hợp đồng h1
});
test('cùng số khác ngày ở hợp đồng khác: cảnh báo nêu hợp đồng của phiếu đã có', () => {
  const c = api.checkPC(rec([P('PA1', '05/10/2026', {hdvcId: 'h1'}), P('PA1', '06/10/2026', {hdvcId: 'h2'})]));
  assert.strictEqual(errs(c).length, 0); assert.match(warns(c)[0], /h1/);
});
test('phiếu số khác nhau, hoặc cùng số trùng ngày viết khác (1/11 và 01/11): quy tắc ngày theo lịch', () => {
  assert.strictEqual(api.checkPC(rec([P('A', '05/10/2026'), P('B', '05/10/2026')])).warns.filter(m => /cùng số phiếu/i.test(m)).length, 0);
  assert.strictEqual(errs(api.checkPC(rec([P('A1', '1/11/2026'), P('A1', '01/11/2026')]))).length, 1);
});
test('một khóa duy nhất: nạp Excel, thêm tay và giữa các lô cùng dùng HAKBks (số phiếu bỏ khoảng trắng + ngày)', () => {
  assert.strictEqual(BKS.khoaPhieu({soPhieu: 'pa 1', ngay: '5/10/2026'}), BKS.khoaPhieu({soPhieu: 'PA1', ngay: '05/10/2026'}));
  assert.notStrictEqual(BKS.khoaPhieu({soPhieu: 'PA1', ngay: '05/10/2026'}), BKS.khoaPhieu({soPhieu: 'PA1', ngay: '06/10/2026'}));
  assert.strictEqual(S.KEY.pc({soPhieu: 'pa 1'}), S.KEY.pc({soPhieu: 'PA1'}), 'bản nháp (stage) so số phiếu theo cùng cách chuẩn hóa');
});
test('nạp Excel vào bản nháp: "PA 1" khớp phiếu "PA1" đã lưu (cùng ngày) thì cập nhật, không thêm phiếu thứ hai', () => {
  const st = S.create({nc: [], dx: [], pc: [{soPhieu: 'PA1', ngay: '05/10/2026', bienSo: '92C-1', kl: 5}]});
  const rep = S.merge(st, 'pc', [{soPhieu: 'PA 1', ngay: '05/10/2026', bienSo: '92C-1', kl: 5, noiGiao: 'Kho'}], {source: 'Excel: a.xlsx'});
  assert.strictEqual(st.cur.pc.length, 1); assert.strictEqual(rep.add, 0); assert.strictEqual(rep.upd, 1);
});
test('chuyến khác ở bước Cần đối chiếu: cùng số phiếu nhưng khác ngày được giữ số phiếu; cùng số cùng ngày vẫn phải số mới', () => {
  const st = S.create({nc: [], dx: [], pc: [{soPhieu: 'PA1', ngay: '05/10/2026', bienSo: '92C-1', kl: 5}]});
  S.merge(st, 'pc', [{soPhieu: 'PA1', ngay: '06/10/2026', bienSo: '92C-1', kl: 5}], {source: 'Excel'});
  assert.ok(S.resolve(st, S.pendingOf(st)[0].pid, 'other', {}).ok); assert.deepStrictEqual(st.cur.pc.map(r => r.soPhieu), ['PA1', 'PA1']);
  const t = S.create({nc: [], dx: [], pc: [{soPhieu: 'PA1', ngay: '05/10/2026', bienSo: '92C-1', kl: 5}]});
  S.merge(t, 'pc', [{soPhieu: 'PA1', ngay: '05/10/2026', bienSo: '92C-9', kl: 5}], {source: 'Excel'});
  const q = S.pendingOf(t)[0].pid; assert.ok(!S.resolve(t, q, 'other', {}).ok); assert.ok(!S.resolve(t, q, 'other', {soPhieu: 'pa 1'}).ok); assert.ok(S.resolve(t, q, 'other', {soPhieu: 'PA1-B'}).ok);
});
test('Lô 7b (T-15): HAKBks.khoa chuẩn hóa gạch dài (–, —), gạch dưới (_), dấu chấm giữa (·), dấu gạch chéo (/), chữ rộng và đuôi "(xe cũ)"', () => {
  assert.strictEqual(BKS.khoa('92C–12345'), BKS.khoa('92C-12345'));
  assert.strictEqual(BKS.khoa('92C—123.45'), BKS.khoa('92C-12345'));
  assert.strictEqual(BKS.khoa('92C_123·45'), BKS.khoa('92C-12345'));
  assert.strictEqual(BKS.khoa('92C/12345 (xe cũ)'), BKS.khoa('92C-12345'));
  assert.strictEqual(BKS.khoa('９２Ｃ－１２３４５'), BKS.khoa('92C-12345'));
});
