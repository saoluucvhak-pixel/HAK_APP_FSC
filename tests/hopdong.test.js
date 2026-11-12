'use strict';
const test = require('node:test');
const assert = require('node:assert');
const H = require('../src/hopdong');

test('hồ sơ năm 2026 và năm 2027: năm lấy từ ngày ký của chính hợp đồng', () => {
  assert.strictEqual(H.numbers({soKT: '015', ngayKy: '05/01/2026'}).kt.so, '015/2026-KT');
  assert.strictEqual(H.numbers({soKT: '015', ngayKy: '05/01/2027'}).kt.so, '015/2027-KT');
  assert.strictEqual(H.numbers({soKT: '8', ngayKy: '31/12/2025'}).kt.so, '8/2025-KT', 'không còn ghi cứng 2026');
  const n = H.numbers({soKT: '015', ngayKy: '05/01/2027', uqSo: '02', uqNgay: '20/01/2027', ntSo: '03', ntNgay: '15/03/2028', soVC: '07', pcSo: '09', pcNgay: '01/02/2027'});
  assert.deepStrictEqual([n.uq.so, n.nt.so, n.vc.so, n.xn.so], ['02/2027-UQ', '03/2028-NTTL', '07/2027-HĐVC', '09/2027-XNKL'], 'mỗi văn bản lấy năm theo ngày của chính nó');
});
test('Giấy ủy quyền không có ngày lập riêng thì dùng ngày ký hợp đồng chung', () => {
  assert.strictEqual(H.numbers({uqSo: '02', ngayKy: '10/10/2027'}).uq.so, '02/2027-UQ');
});
test('thiếu hoặc sai ngày ký: để trống năm, không điền năm cố định, nêu trường cần bổ sung', () => {
  for (const ngay of ['', undefined, '31/02/2026', '29/02/2026', 'abc']) {
    const k = H.numbers({soKT: '015', ngayKy: ngay}).kt; assert.strictEqual(k.so, '015/……-KT', String(ngay)); assert.ok(k.thieuNgay);
    assert.ok(!/2026|2027/.test(k.so));
  }
  assert.strictEqual(H.numbers({soKT: '015', ngayKy: '29/02/2028'}).kt.so, '015/2028-KT', 'ngày nhuận có thật được nhận');
  assert.strictEqual(H.numbers({}).kt.so, '…………/……-KT');
  const cbs = H.canBoSung({soKT: '015', ngayKy: ''}); assert.ok(cbs.some(x => /Ngày ký hợp đồng/.test(x.truong)) && cbs.some(x => /BM-01/.test(x.label)));
  assert.strictEqual(H.canBoSung({soKT: '015/2026-KT', uqSo: '02/2026-UQ', ntSo: '03/2026-NTTL', soVC: '07/2026-HĐVC', pcSo: '09/2026-XNKL'}).length, 0, 'số đã đầy đủ thì không cần ngày');
});
test('số hợp đồng đã có hậu tố hoặc đã đầy đủ: giữ nguyên, không ghép thêm năm', () => {
  for (const [so, hau] of [['015/2025-KT', 'KT'], ['015/2026-KT', 'KT'], ['HD-12/2024', 'KT'], ['015-KT', 'KT'], ['02/2026-UQ', 'UQ'], ['07/2026-HĐVC', 'HĐVC']]) {
    const r = H.soDayDu(so, hau, '05/01/2027'); assert.strictEqual(r.so, so, so); assert.ok(r.giuNguyen);
  }
  assert.strictEqual(H.numbers({soKT: '015/2025-KT', ngayKy: '05/01/2027'}).kt.so, '015/2025-KT', 'ngày ký 2027 không đổi số đã có năm 2025');
});
test('BM-01, BM-14 và BM-20 tham chiếu cùng một số hợp đồng khai thác trên cùng hồ sơ giao khoán', () => {
  const ex = {soKT: '015', ngayKy: '05/01/2027', uqNgay: '20/03/2028', ntNgay: '15/06/2028'};   // ngày lập UQ và nghiệm thu khác năm không làm đổi số HĐ khai thác
  const n = H.numbers(ex); assert.strictEqual(n.kt.so, '015/2027-KT');
  assert.strictEqual(H.numbers(Object.assign({}, ex, {ngayKy: '05/01/2027'})).kt.so, n.kt.so);
  assert.notStrictEqual(n.uq.nam, n.kt.nam, 'số UQ theo ngày lập UQ, còn số KT theo ngày ký HĐ');
});
test('dòng ngày để trống không ghi sẵn năm', () => assert.ok(!/20\d\d/.test(H.ngayTrong()) && /năm …/.test(H.ngayTrong())));
