'use strict';
const test = require('node:test'), assert = require('node:assert/strict');
const B = require('../src/bieumau'), Q = require('../src/quytrinh');
test('bảng biểu mẫu khớp danh mục quy trình: cùng 20 mã, cùng đợt, cùng mẫu chỉ áp dụng theo hình thức', () => {
  assert.deepEqual(B.BM.map(x => x.ma).sort(), Q.FORMS.map(x => x.code).sort());
  Q.FORMS.forEach(f => { const b = B.byMa(f.code); assert.equal(b.dot, f.dot, f.code); assert.equal(b.only || '', f.only || '', f.code); });
});
test('thứ tự in: đợt 1 nhóm Lô → từng đội khai thác (ủy quyền trước hợp đồng) → đội xe → nhật ký; đợt 2: đội khai thác trước, đội xe sau', () => {
  const l = B.thuTuIn({mo: 'giaokhoan', doi: [{ten: 'Đội 1'}, {ten: 'Đội 2'}], doiXe: [{ten: 'Xe A'}]});
  const ma = (dot, doi) => l.filter(x => x.dot === dot && (doi === undefined || x.doi === doi)).map(x => x.ma);
  assert.deepEqual(ma(1).slice(0, 7), ['17', '11', '12', '13', '19', '15', '16']);
  assert.deepEqual(ma(1, 'Đội 1').slice(0, 3), ['20', '01', '06'], 'ủy quyền (20) trước hợp đồng (01)');
  const i1 = l.findIndex(x => x.doi === 'Đội 1' && x.ma === '05'), i2 = l.findIndex(x => x.doi === 'Đội 2' && x.ma === '20');
  assert.ok(i1 >= 0 && i1 < i2, 'đội 1 in xong mới đến đội 2');
  const d1 = l.filter(x => x.dot === 1).map(x => x.ma); assert.ok(d1.indexOf('04') > d1.indexOf('05') && d1.indexOf('18') > d1.indexOf('04'), 'đội xe sau đội khai thác, nhật ký cuối đợt 1');
  assert.deepEqual(l.filter(x => x.dot === 2).map(x => x.ma + (x.doi ? '/' + x.doi : '')), ['08/Đội 1', '14/Đội 1', '08/Đội 2', '14/Đội 2', '09/Xe A', '10/Xe A']);
  assert.deepEqual(l.map(x => x.stt), l.map((x, i) => i + 1), 'số thứ tự liên tục');
});
test('hình thức trực tiếp: có BM-03 thay BM-01 và BM-20; chỉ đợt 2: lọc theo đợt', () => {
  const l = B.thuTuIn({mo: 'tructiep', doi: [{ten: ''}], doiXe: [{ten: ''}]});
  assert.ok(l.some(x => x.ma === '03') && !l.some(x => x.ma === '01' || x.ma === '20'));
  assert.deepEqual(B.thuTuIn({mo: 'giaokhoan', doi: [{ten: ''}], doiXe: [{ten: ''}]}, 2).map(x => x.ma), ['08', '14', '09', '10']);
});
