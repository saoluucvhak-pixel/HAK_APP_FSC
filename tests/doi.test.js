'use strict';
const test = require('node:test'), assert = require('node:assert');
const D = require('../src/doi');
const isTT = r => /^tổ trưởng/i.test(r.vaiTro || '');
const P = (row, vai, ten, doi) => ({_row: row, vaiTro: vai, ten, doi, cccd: '04908500' + String(1000 + row)});

test('một Tổ trưởng: một đội gồm mọi người, cột Đội bị bỏ qua (hồ sơ cũ không đổi)', () => {
  const r = D.build([P(2, 'Tổ trưởng', 'A', ''), P(3, 'Công nhân', 'B', 'Đội xyz'), P(4, 'Công nhân', 'C', '')], isTT);
  assert.deepStrictEqual([r.multi, r.doi.length, r.doi[0].n, r.doi[0].share, r.errs.length], [false, 1, 3, 1, 0]); assert.strictEqual(r.doi[0].tt.ten, 'A'); assert.deepStrictEqual(r.doi[0].members.map(x => x.ten), ['B', 'C']);
  assert.deepStrictEqual(D.build([], isTT).doi, []); assert.strictEqual(D.build([P(2, 'Công nhân', 'B', '')], isTT).doi.length, 0);   // không có Tổ trưởng: chưa có đội nào
});
test('hai Tổ trưởng = hai đội: mỗi công nhân theo tên đội, chia sản lượng theo số người', () => {
  const nc = [P(2, 'Tổ trưởng', 'TT1', 'Đội 1'), P(3, 'Công nhân', 'A1', 'đội 1'), P(4, 'Công nhân', 'A2', 'Đội 1'), P(5, 'Tổ trưởng', 'TT2', 'Đội 2'), P(6, 'Công nhân', 'B1', 'ĐỘI 2')];
  const r = D.build(nc, isTT); assert.strictEqual(r.multi, true); assert.deepStrictEqual(r.errs, []);
  assert.deepStrictEqual(r.doi.map(d => [d.ten, d.tt.ten, d.n, d.members.map(m => m.ten)]), [['Đội 1', 'TT1', 3, ['A1', 'A2']], ['Đội 2', 'TT2', 2, ['B1']]]);
  assert.deepStrictEqual(r.doi.map(d => d.share), [0.6, 0.4]);
  assert.deepStrictEqual(D.chia(10, r.doi), [6, 4]); assert.deepStrictEqual(D.chia(2.5, r.doi), [1.5, 1]);
  const t = D.chia(100, D.build([P(2, 'Tổ trưởng', 'T1', 'a'), P(3, 'Công nhân', 'x', 'a'), P(4, 'Tổ trưởng', 'T2', 'b'), P(5, 'Công nhân', 'y', 'b'), P(6, 'Tổ trưởng', 'T3', 'c')], isTT).doi); assert.strictEqual(Math.round(t.reduce((s, v) => s + v, 0) * 1000) / 1000, 100);   // tổng luôn khớp
  assert.deepStrictEqual(D.chia(null, r.doi), [null, null]); assert.deepStrictEqual(D.chia(0, r.doi), [null, null]);
});
test('nhiều Tổ trưởng: thiếu tên đội, trùng tên đội, công nhân chưa thuộc đội hoặc ghi đội không có Tổ trưởng đều báo rõ theo dòng', () => {
  const nc = [P(2, 'Tổ trưởng', 'TT1', ''), P(3, 'Tổ trưởng', 'TT2', 'Đội 2'), P(4, 'Tổ trưởng', 'TT3', 'đội 2'), P(5, 'Công nhân', 'A', ''), P(6, 'Công nhân', 'B', 'Đội 9'), P(7, 'Công nhân', 'C', 'Đội 2')];
  const r = D.build(nc, isTT), t = r.errs.map(e => e.row + ':' + e.text);
  assert.ok(t.some(x => /^2:Tổ trưởng “TT1” chưa ghi tên đội/.test(x))); assert.ok(t.some(x => /^4:Tên đội “đội 2” trùng với Tổ trưởng “TT2”/.test(x)));
  assert.ok(t.some(x => /^5:“A” chưa thuộc đội nào/.test(x))); assert.ok(t.some(x => /^6:Đội “Đội 9” của “B” không có Tổ trưởng/.test(x)));
  assert.deepStrictEqual(r.orphans.map(o => o.ten), ['A', 'B']); assert.strictEqual(r.doi.length, 1);
});
