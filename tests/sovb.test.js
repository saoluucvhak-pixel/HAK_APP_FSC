'use strict';
const test = require('node:test'), assert = require('node:assert/strict');
const S = require('../src/sovb');
const lo = () => ({id: 'f', info: {maRung: 'QS-07', tuNgay: '05/10/2026'}, exp: {ngayKy: '02/10/2026'}, doi: [{id: 'd1', ten: 'Đội 1', exp: {uqNgay: '01/10/2026'}}, {id: 'd2', ten: 'Đội 2', exp: {soKT: '015'}}], hdvc: [{id: 'h1', ten: '', exp: {}}]});
test('mã lô gọn: bỏ dấu, khoảng trắng, ký tự lạ', () => { assert.equal(S.maLo('QS-07'), 'QS07'); assert.equal(S.maLo(' đà nẵng 3 '), 'DANANG3'); });
test('đề xuất: STT hai chữ số theo đội, năm theo ngày văn bản, ký hiệu theo loại; số đã có thì không đề xuất', () => {
  const r = S.deXuat(lo(), new Date(2026, 10, 15)), g = (id, truong) => r.find(x => x.id === id && x.truong === truong);
  assert.equal(g('d1', 'soKT').deXuat, '01/2026/HĐGK-QS07'); assert.equal(g('d1', 'uqSo').deXuat, '01/2026/GUQ-QS07'); assert.equal(g('d2', 'uqSo').deXuat, '02/2026/GUQ-QS07');
  assert.equal(g('d2', 'soKT').hienCo, '015'); assert.equal(g('d2', 'soKT').deXuat, '', 'số đã có không bị đề xuất lại'); assert.equal(g('h1', 'soVC').deXuat, '01/2026/HĐVC-QS07'); assert.equal(g('h1', 'pcSo').deXuat, '01/2026/XNKL-QS07');
});
test('điền: chỉ ô trống; giữ số cũ; đội giữ STT đã cấp kể cả khi đội khác bị xóa', () => {
  const f = lo(), n = S.dien(f, new Date(2026, 10, 15)); assert.ok(n > 0); assert.equal(f.doi[1].exp.soKT, '015', 'không ghi đè'); assert.equal(f.doi[0].exp.soKT, '01/2026/HĐGK-QS07'); assert.deepEqual([f.doi[0].stt, f.doi[1].stt], [1, 2]);
  f.doi.shift(); assert.equal(S.deXuat(f).find(x => x.truong === 'uqSo').stt, 2, 'đội 2 vẫn là STT 02 sau khi đội 1 bị xóa');
  const g = lo(); S.dien(g); const copy = JSON.stringify(g); assert.equal(S.dien(g), 0); assert.equal(JSON.stringify(g), copy, 'chạy lại không đổi gì');
});
test('trùng số giữa các lô', () => {
  const db = {rs: {o: {id: 'o', forests: {a: {id: 'a', info: {maRung: 'A'}, doi: [{id: 'd', exp: {soKT: '01/2026/HĐGK-QS07'}}], hdvc: []}, b: {id: 'b', info: {maRung: 'B'}, doi: [{id: 'd', exp: {soKT: '01/2026/hđgk-qs07', uqSo: 'X'}}], hdvc: []}}}}};
  assert.deepEqual(S.trung(db, 'o', 'b'), [{so: '01/2026/hđgk-qs07', truong: 'soKT', ma: 'A'}]); assert.equal(S.trung(db, 'o', 'a').length, 1);
});
