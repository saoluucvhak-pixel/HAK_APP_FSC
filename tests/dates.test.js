'use strict';
/* Hồi quy lỗi ngày phiếu cân: phiếu 5 tấn ngày 31/02/2026 từng được cộng vào báo cáo khi lọc 01/02/2026–31/03/2026 vì dateKey chỉ kiểm tra dạng chuỗi. */
const test = require('node:test');
const assert = require('node:assert');
const D = require('../src/dates.js');
const R = require('../ui/reports.js');

test('ngày lịch: tháng 2, năm nhuận, độ dài tháng', () => {
  assert.strictEqual(D.isValid('28/02/2026'), true);
  assert.strictEqual(D.isValid('29/02/2026'), false);    // 2026 không nhuận
  assert.strictEqual(D.isValid('30/02/2026'), false);
  assert.strictEqual(D.isValid('31/02/2026'), false);
  assert.strictEqual(D.isValid('29/02/2028'), true);     // 2028 nhuận
  assert.strictEqual(D.isValid('29/02/2024'), true);
  assert.strictEqual(D.isValid('29/02/1900'), false);    // chia hết cho 100 nhưng không chia hết cho 400
  assert.strictEqual(D.isValid('29/02/2000'), true);     // chia hết cho 400
  assert.strictEqual(D.isValid('31/04/2026'), false); assert.strictEqual(D.isValid('30/04/2026'), true);
  assert.strictEqual(D.isValid('31/12/2026'), true); assert.strictEqual(D.isValid('01/13/2026'), false); assert.strictEqual(D.isValid('00/01/2026'), false);
  assert.strictEqual(D.isValid('1/2/2026'), true);       // ngày, tháng 1 chữ số vẫn nhận (như trước)
  ['', null, undefined, '2026-02-01', '01-02-2026', 'abc', '31/02/26', '01/01/0000'].forEach(v => assert.strictEqual(D.isValid(v), false, String(v)));
  assert.strictEqual(D.key('31/02/2026'), 0); assert.strictEqual(D.key('28/02/2026'), 20260228);
  assert.strictEqual(D.fromIso('2026-02-28'), '28/02/2026'); assert.strictEqual(D.fromIso('2026-02-31'), '');
});

test('lý do ngày sai nêu rõ để người dùng sửa', () => {
  assert.match(D.why('31/02/2026'), /tháng 2\/2026 chỉ có 28 ngày/); assert.match(D.why('31/02/2026'), /không phải năm nhuận/);
  assert.match(D.why('29/02/2028') + '', /^$/);
  assert.match(D.why('31/04/2026'), /chỉ có 30 ngày/); assert.doesNotMatch(D.why('31/04/2026'), /nhuận/);
  assert.match(D.why(''), /thiếu ngày/); assert.match(D.why('abc'), /không đúng dạng/); assert.match(D.why('01/13/2026'), /không có tháng 13/);
});

test('khoảng ngày lọc: đầu/cuối kỳ, bị đảo, ngày sai', () => {
  assert.strictEqual(D.inRange('01/02/2026', '01/02/2026', '31/03/2026'), true);   // đúng ngày đầu kỳ
  assert.strictEqual(D.inRange('31/03/2026', '01/02/2026', '31/03/2026'), true);   // đúng ngày cuối kỳ
  assert.strictEqual(D.inRange('31/01/2026', '01/02/2026', '31/03/2026'), false);  // trước đầu kỳ 1 ngày
  assert.strictEqual(D.inRange('01/04/2026', '01/02/2026', '31/03/2026'), false);  // sau cuối kỳ 1 ngày
  assert.strictEqual(D.inRange('29/02/2028', '01/02/2028', '29/02/2028'), true);   // cuối kỳ là ngày nhuận
  assert.strictEqual(D.inRange('31/02/2026', '01/02/2026', '31/03/2026'), false);  // ngày không có thật: không lọt vào kỳ
  assert.strictEqual(D.inRange('31/02/2026', '', ''), true);                       // không lọc gì thì giữ (việc loại do kiểm tra phiếu đảm nhiệm)
  assert.strictEqual(D.inRange('15/02/2026', '31/03/2026', '01/02/2026'), false);  // khoảng bị đảo: rỗng, không tự đổi chỗ
  assert.match(D.range('31/03/2026', '01/02/2026').problem, /sau ngày kết thúc/);
  assert.match(D.range('31/02/2026', '').problem, /Ngày bắt đầu: .*không có thật/);
  assert.match(D.range('', '31/04/2026').problem, /Ngày kết thúc/);
  assert.strictEqual(D.inRange('15/02/2026', '31/02/2026', ''), false);            // đầu kỳ không có thật: báo lỗi, không đoán
  assert.deepStrictEqual(D.range('', ''), {from: 0, to: 0, problem: ''});
});

const rec = (pc) => ({chuRung: 'A', maChu: 'K1', maRung: 'R1', tenRung: 'Rừng 1', diaDiem: 'Thôn', dienTich: 2, dinhMuc: 10, nc: 1, dx: 1, pct: 60, thieu: [], pc});
const P = (ngay, so, kl) => ({ngay, soPhieu: so, bienSo: '92C-1', kl, noiGiao: 'NM'});

test('HỒI QUY: phiếu 5 tấn ngày 31/02/2026 không được cộng vào báo cáo khi lọc 01/02/2026–31/03/2026', () => {
  const recs = [rec([P('10/02/2026', 'P1', 10), P('31/02/2026', 'P2', 5), P('15/03/2026', 'P3', 7)])];
  const o = {from: '01/02/2026', to: '31/03/2026', today: 'x'};
  const sl = R.sanLuong(recs, o); assert.strictEqual(sl.sections[0].rows[0][7], 17, 'thực tế phải là 10 + 7, không gồm 5 tấn ngày sai');
  assert.strictEqual(sl.sections[0].foot[7], 17); assert.strictEqual(sl.kpis.find(k => /Thực tế/.test(k.label)).value, 17);
  const pcn = R.soPhieuCan(recs, o); assert.strictEqual(pcn.sections[0].foot[11], 17); assert.strictEqual(pcn.kpis.find(k => /Số phiếu cân/.test(k.label)).value, 2);
  assert.strictEqual(R.dieuHanh(recs, o).kpis.find(k => /Khối lượng/.test(k.label)).value, 17);
  assert.strictEqual(R.chaCon(recs, o).sections[0].foot[6], 17);
});

test('phiếu ngày sai bị loại khỏi tổng ở cả báo cáo có kỳ và không kỳ, hiển thị số phiếu + lý do', () => {
  const recs = [rec([P('10/02/2026', 'P1', 10), P('31/02/2026', 'P2', 5), P('29/02/2026', 'P4', 2), P('29/02/2028', 'P5', 1), P('abc', 'P6', 3)])];
  for (const o of [{from: '', to: '', today: 'x'}, {from: '01/02/2026', to: '31/03/2028', today: 'x'}]) {
    const pcn = R.soPhieuCan(recs, o), body = pcn.sections[0].rows.map(r => r[4]);
    assert.deepStrictEqual(body.sort(), ['P1', 'P5'], JSON.stringify(o));                    // chỉ phiếu có ngày thật
    assert.strictEqual(pcn.sections[0].foot[11], 11);
    const ex = pcn.sections.find(s => /Phiếu cân bị loại/.test(s.heading));
    assert.ok(ex, 'phải có mục liệt kê phiếu bị loại'); assert.deepStrictEqual(ex.rows.map(r => r[1]).sort(), ['P2', 'P4', 'P6']);
    assert.ok(ex.rows.find(r => r[1] === 'P2')[3].includes('tháng 2/2026 chỉ có 28 ngày'));  // lý do cụ thể
    assert.ok(ex.rows.find(r => r[1] === 'P6')[3].includes('không đúng dạng'));
    assert.strictEqual(pcn.kpis.find(k => /bị loại/.test(k.label)).value, 3);
    assert.ok(pcn.notes.some(n => /3 phiếu .*ngày không hợp lệ/.test(n) && /P2/.test(n)));
    const sl = R.sanLuong(recs, o); assert.strictEqual(sl.sections[0].rows[0][7], 11); assert.ok(sl.notes.some(n => /ngày không hợp lệ/.test(n)));
    const ch = R.chaCon(recs, o); assert.strictEqual(ch.sections[0].foot[6], 11); assert.ok(ch.notes.some(n => /ngày không hợp lệ/.test(n)));
  }
});

test('ngày đầu/cuối kỳ và năm nhuận được tính; khoảng bị đảo cho kết quả rỗng và báo lý do', () => {
  const recs = [rec([P('01/02/2028', 'A', 1), P('29/02/2028', 'B', 2), P('01/03/2028', 'C', 4), P('31/01/2028', 'D', 8)])];
  const kyNhuan = R.soPhieuCan(recs, {from: '01/02/2028', to: '29/02/2028', today: 'x'}); assert.strictEqual(kyNhuan.sections[0].foot[11], 3);   // A + B, gồm 29/02/2028
  const dao = R.soPhieuCan(recs, {from: '29/02/2028', to: '01/02/2028', today: 'x'});
  assert.strictEqual(dao.sections[0].rows.length, 0); assert.ok(dao.notes.some(n => /sau ngày kết thúc/.test(n)));
  assert.match(R.periodText('01/02/2026', '28/02/2026'), /01\/02\/2026/);
});
