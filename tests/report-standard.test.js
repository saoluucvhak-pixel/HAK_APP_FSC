'use strict';
/* Đối chiếu báo cáo HAKQN với HAK Accounting & Reporting Standard V1.0 (bản sao trong ui/vendor) và kiểm tra bảng cha–con. */
const test = require('node:test');
const assert = require('node:assert');
const STD = require('../ui/vendor/hak-accounting-report-standard/index.js');
const R = require('../ui/reports.js');

const mk = (chu, ma, rung, dt, pc, pct = 60) => ({chuRung: chu, maChu: ma, maRung: rung, tenRung: 'Rừng ' + rung, diaDiem: 'Thôn ' + rung, dienTich: dt, dinhMuc: 10, nc: 1, dx: 1, pct, pc, thieu: []});
const P = (ngay, so, kl, bien = '92C-1') => ({ngay, soPhieu: so, bienSo: bien, kl, noiGiao: 'NM'});
const recs = [
  mk('NGUYỄN VĂN AN', 'K1', 'R1', 2, [P('05/01/2026', 'P1', 12.5), P('20/02/2026', 'P2', 9.25)]),
  mk('NGUYỄN VĂN AN', 'K1', 'R2', 1.5, [P('15/02/2026', 'P3', 4.125)], 40),
  mk('TRẦN THỊ BÌNH', 'K2', 'R3', 1, [], 20)];

test('định dạng số của báo cáo khớp formatNumber của chuẩn (kiểu Việt Nam, âm, làm tròn, hàng nghìn)', () => {
  for (const v of [0, 5, 1250000.75, -3.5, 999.999, 1000, 1234567.891, 0.005, 21.75, 31.7500001, -1234.5678]) {
    for (const d of [0, 2, 3]) assert.strictEqual(R.fmtNum(v, d), STD.formatNumber(v, {maxDecimals: d, minDecimals: d}), v + '/' + d);
  }
  assert.strictEqual(R.fmtCell(80, 'pct'), STD.formatNumber(80, {maxDecimals: 1, minDecimals: 1}) + '%');
  assert.strictEqual(R.fmtCell('', 'n2'), ''); assert.strictEqual(R.fmtCell(null, 'n2'), '');   // ô trống không phải số 0
});

test('căn lề theo chuẩn: số phải, ngày giữa, văn bản/mã trái (STT là nhãn nên giữ giữa)', () => {
  for (const rp of R.REPORTS) {
    const m = rp.build(recs, {from: '01/01/2026', to: '28/02/2026', today: '12/11/2026', detail: true});
    m.sections.forEach(s => s.cols.forEach(c => {
      const type = c.f === 'date' || /^(Ngày|Thời gian)/.test(c.h) ? 'date' : ['n0', 'n1', 'n2', 'n3', 'pct'].includes(c.f) ? 'decimal' : 'text';
      const want = c.h === 'STT' ? 'center' : STD.alignFor(type);
      assert.strictEqual(c.al, want, rp.id + ' · ' + c.h);
    }));
    assert.ok(m.unit && /Đơn vị tính/.test(m.unit), rp.id + ' thiếu đơn vị tính');
    assert.ok(R.toAoa(m, {org: 'HAK', stamp: '12/11/2026 08:00', scope: 'x'})[4][0].startsWith('Lập lúc 12/11/2026 08:00'), rp.id + ' thiếu thời điểm lập');
  }
});

test('schema cột của báo cáo hợp lệ theo validateColumns của chuẩn', () => {
  for (const rp of R.REPORTS) rp.build(recs, {today: 'x'}).sections.forEach(s => {
    const cols = s.cols.map((c, i) => ({key: 'c' + i, label: c.h, type: ['n0'].includes(c.f) ? 'integer' : ['n1', 'n2', 'n3'].includes(c.f) ? 'decimal' : c.f === 'pct' ? 'percent' : c.f === 'date' ? 'date' : 'text'}));
    assert.strictEqual(STD.validateColumns(cols).length, s.cols.length);
  });
});

test('Excel: ô ngày thật, chuỗi dạng công thức được vô hiệu, CCCD/mã giữ dạng văn bản, bộ lọc tự động ở bảng chính', () => {
  const evil = [mk('=HYPERLINK("x")', '+1', '@R', 1, [P('01/02/2026', '-P', 1, '=cmd')])];
  const m = R.REPORTS.find(r => r.id === 'phieucan').build(evil, {today: 'x'});
  const a = R.toAoa(m, {org: '=SUM(1)', today: 'x'});
  const t = a.tables[0], row = a[t.first];
  assert.ok(row[1] instanceof Date && row[1].toISOString().startsWith('2026-02-01'));          // ngày là ô ngày thật
  assert.ok(typeof row[7] === 'number');                                                          // khối lượng là ô số thật
  assert.strictEqual(row[2], "'-P"); assert.strictEqual(row[3], "'=cmd"); assert.strictEqual(row[4], "'=HYPERLINK(\"x\")");
  assert.strictEqual(R.safeText('-5'), '-5'); assert.strictEqual(R.safeText('049000000001'), '049000000001');   // số thật và chuỗi số không bị đổi
  assert.ok(t.last >= t.first && t.cols === 9);
});

test('cha–con: chủ rừng = tổng rừng = tổng phiếu cân; tổng cộng khớp chỉ tiêu; kèm phiếu thì có cấp 2', () => {
  const o = {from: '01/01/2026', to: '28/02/2026', today: 'x'};
  const flat = R.chaCon(recs, o), full = R.chaCon(recs, {...o, detail: true});
  const s = flat.sections[0];
  assert.deepStrictEqual(s.levels, [0, 1, 1, 0, 1]);                                       // 2 chủ, 3 rừng, không có cấp phiếu
  const sum = lv => Math.round(s.rows.filter((r, i) => s.levels[i] === lv).reduce((x, r) => x + r[6], 0) * 1000) / 1000;
  assert.strictEqual(sum(0), 25.875); assert.strictEqual(sum(1), 25.875); assert.strictEqual(s.foot[6], 25.875);   // 12,5 + 9,25 + 4,125
  assert.strictEqual(flat.kpis.find(k => /Khối lượng/.test(k.label)).value, 25.875);
  assert.strictEqual(s.rows[0][5], 3); assert.strictEqual(s.rows[0][6], 25.875);          // cha An: 3 chuyến, 25,875 tấn
  assert.strictEqual(s.rows[0][7], 50);                                                   // tiến độ cha = trung bình rừng con (60, 40)
  const f = full.sections[0];
  assert.deepStrictEqual(f.levels.filter(l => l === 2).length, 3);                          // 3 phiếu ở cấp 2
  const sum2 = Math.round(f.rows.filter((r, i) => f.levels[i] === 2).reduce((x, r) => x + r[6], 0) * 1000) / 1000;
  assert.strictEqual(sum2, 25.875);                                                       // tổng phiếu = tổng rừng
  assert.strictEqual(f.rows[2][0], '• Phiếu P1');
  assert.strictEqual(R.chaCon(recs, {from: '01/03/2026', today: 'x'}).sections[0].foot[6], 0);   // kỳ không có phiếu
  const dup = R.chaCon([mk('A', 'K1', 'R1', 1, [P('01/02/2026', 'X', 1)]), mk('A', 'K1', 'R2', 1, [P('02/02/2026', 'X', 2)])], {today: 'x'});
  assert.ok(dup.notes.some(n => /vẫn được cộng vào tổng/.test(n)) && dup.sections[0].foot[6] === 3);   // phiếu trùng vẫn tính, có ghi chú
});
