'use strict';
/* Số văn bản theo ĐỘI XE (src/sovb.js): số in ra lấy từ số riêng lưu theo ID đội xe hoặc số chung của lô — không phụ thuộc thứ tự đội (hồi quy lỗi 2.2.0-rc: hậu tố .1/.2 tính theo vị trí lúc xuất). */
const test = require('node:test'), assert = require('node:assert/strict');
const SV = require('../src/sovb.js');
const lo = () => ({id: 'fa', info: {maRung: 'R-A', tuNgay: '01/10/2026'}, exp: {soVC: '07', pcSo: '09', ngayKy: '02/10/2026', pcNgay: '20/12/2026'}, doi: [{id: 'd1', exp: {}}], hdvc: [{id: 'hdA', ten: 'Đội xe A', exp: {}}, {id: 'hdB', ten: 'Đội xe B', exp: {}}]});
const soCua = (f, id, t) => SV.soDoiXe(f).find(x => x.id === id && x.truong === t).in;

test('hai đội xe dùng số chung: cùng in 07/2026-HĐVC, không có hậu tố; đổi thứ tự hay còn một đội thì số của A không đổi', () => {
  const f = lo(); assert.equal(soCua(f, 'hdA', 'soVC'), '07/2026-HĐVC'); assert.equal(soCua(f, 'hdB', 'soVC'), '07/2026-HĐVC'); assert.equal(soCua(f, 'hdA', 'pcSo'), '09/2026-XNKL');
  f.hdvc.reverse(); assert.equal(soCua(f, 'hdA', 'soVC'), '07/2026-HĐVC', 'đổi thứ tự');
  f.hdvc = f.hdvc.filter(h => h.id === 'hdA'); assert.equal(soCua(f, 'hdA', 'soVC'), '07/2026-HĐVC', 'chỉ còn đội A');
});
test('dùng chung số của lô: báo cả hai đội (loại chung), không sửa dữ liệu', () => {
  const f = lo(), truoc = JSON.stringify(f), tr = SV.trungDoiXe(f);
  assert.deepEqual(tr.map(g => [g.truong, g.so, g.loai, g.doi.map(d => d.ten).join('+')]), [['soVC', '07/2026-HĐVC', 'chung', 'Đội xe A+Đội xe B'], ['pcSo', '09/2026-XNKL', 'chung', 'Đội xe A+Đội xe B']]);
  assert.equal(JSON.stringify(f), truoc); assert.equal(SV.trungDoiXe(f, ['hdA']).length, 0, 'chỉ một đội có xe: không báo');
});
test('xác nhận cấp số (dien): lưu số đầy đủ theo ID đội xe; đổi thứ tự, xóa B, thêm C, đổi người ký: số của A giữ nguyên, C không nhận lại số của B', () => {
  const f = lo(); assert.ok(SV.dien(f, new Date(2026, 9, 5)) >= 4);
  const a = f.hdvc.find(h => h.id === 'hdA').exp, b = f.hdvc.find(h => h.id === 'hdB').exp;
  assert.deepEqual([a.soVC, a.pcSo, b.soVC, b.pcSo], ['01/2026/HĐVC-RA', '01/2026/XNKL-RA', '02/2026/HĐVC-RA', '02/2026/XNKL-RA']); assert.equal(SV.trungDoiXe(f).length, 0);
  f.hdvc.reverse(); assert.equal(soCua(f, 'hdA', 'soVC'), '01/2026/HĐVC-RA'); assert.equal(soCua(f, 'hdA', 'pcSo'), '01/2026/XNKL-RA');
  f.hdvc = f.hdvc.filter(h => h.id !== 'hdB'); f.hdvc.push({id: 'hdC', ten: 'Đội xe C', exp: {}}); f.hdvc[0].key = 'tx:khac'; f.hdvc[0].ben = {ten: 'NGƯỜI KÝ MỚI'};
  SV.dien(f, new Date(2026, 9, 6));
  assert.equal(soCua(f, 'hdA', 'soVC'), '01/2026/HĐVC-RA', 'số của A giữ nguyên'); assert.equal(soCua(f, 'hdC', 'soVC'), '03/2026/HĐVC-RA', 'C nhận 03, không nhận lại 02 của B'); assert.deepEqual(f.sttDaCap.doiXe, [1, 2, 3]);
  assert.equal(SV.dien(f), 0, 'chạy lại không cấp thêm');
});
test('xem trước (deXuat, soDoiXe, trungDoiXe) không ghi gì vào lô', () => { const f = lo(), truoc = JSON.stringify(f); SV.deXuat(f); SV.soDoiXe(f); SV.trungDoiXe(f); assert.equal(JSON.stringify(f), truoc); });
test('số riêng người dùng nhập được giữ; hai đội nhập trùng số riêng: báo cả hai (loại riêng), không tự nối hậu tố', () => {
  const f = lo(); f.hdvc[0].exp = {soVC: '11/2026-HĐVC'}; f.hdvc[1].exp = {soVC: '11/2026-hđvc'}; const truoc = JSON.stringify(f);
  const tr = SV.trungDoiXe(f).find(g => g.truong === 'soVC'); assert.equal(tr.loai, 'rieng'); assert.deepEqual(tr.doi.map(d => d.id), ['hdA', 'hdB']);
  SV.dien(f); assert.equal(f.hdvc[0].exp.soVC, '11/2026-HĐVC'); assert.equal(f.hdvc[1].exp.soVC, '11/2026-hđvc'); assert.equal(JSON.parse(truoc).hdvc[0].exp.soVC, f.hdvc[0].exp.soVC);
});
test('hồ sơ cũ đã in bằng số chung: xác nhận số trên giấy lưu số đầy đủ cho ĐÚNG đội đó; đổi số chung của lô sau này không làm đổi số của đội', () => {
  const f = lo(); assert.equal(SV.giuSoDangIn(f, 'hdA'), 2); assert.deepEqual(f.hdvc[0].exp, {soVC: '07/2026-HĐVC', pcSo: '09/2026-XNKL'}); assert.deepEqual(f.hdvc[1].exp, {});
  f.exp.soVC = '99'; assert.equal(soCua(f, 'hdA', 'soVC'), '07/2026-HĐVC'); assert.equal(soCua(f, 'hdB', 'soVC'), '99/2026-HĐVC');
  assert.equal(SV.giuSoDangIn(f, 'hdA'), 0, 'đã có số riêng: không ghi đè');
});
test('lô một đội xe: số chung của lô, không cảnh báo', () => { const f = lo(); f.hdvc.pop(); assert.equal(soCua(f, 'hdA', 'soVC'), '07/2026-HĐVC'); assert.equal(SV.trungDoiXe(f).length, 0); });
test('không giới hạn số đội xe: năm đội — ba đội dùng số chung được nêu đủ cả ba; hai đội trùng số riêng thành một nhóm riêng; cấp số cho năm đội ra năm số khác nhau', () => {
  const f = lo(); f.hdvc = ['A', 'B', 'C', 'D', 'E'].map(x => ({id: 'hd' + x, ten: 'Đội xe ' + x, exp: {}})); f.hdvc[3].exp = {soVC: '50/2026-HĐVC'}; f.hdvc[4].exp = {soVC: '50/2026-HĐVC'};
  const tr = SV.trungDoiXe(f).filter(g => g.truong === 'soVC');
  assert.deepEqual(tr.map(g => [g.so, g.loai, g.doi.map(d => d.id).join()]), [['07/2026-HĐVC', 'chung', 'hdA,hdB,hdC'], ['50/2026-HĐVC', 'rieng', 'hdD,hdE']]);
  f.hdvc[4].exp.soVC = '51/2026-HĐVC'; SV.dien(f, new Date(2026, 9, 5));
  assert.equal(new Set(f.hdvc.map(h => h.exp.soVC)).size, 5); assert.equal(new Set(f.hdvc.map(h => h.exp.pcSo)).size, 5); assert.equal(SV.trungDoiXe(f).length, 0);
  const truoc = f.hdvc.map(h => [h.id, h.exp.soVC, h.exp.pcSo]).sort().join('|'); f.hdvc.reverse(); f.hdvc.splice(1, 1); SV.dien(f);
  assert.ok(f.hdvc.every(h => truoc.includes([h.id, h.exp.soVC, h.exp.pcSo].join())), 'đảo thứ tự và xóa một đội: số các đội còn lại giữ nguyên');
});
