'use strict';
const test = require('node:test'), assert = require('node:assert');
const NK = require('../src/nhatkytruyxuat.js');

test('gom nhật ký lô: tạo lô, nạp, đổi số, đổi biển, in, ký, chốt — xếp theo thời gian', () => {
  const f = {
    taoLuc: '2026-11-01T01:00:00.000Z', info: {maRung: 'R-A'},
    nhatKyNap: [{at: '2026-11-02T01:00:00.000Z', kind: 'pc', nguon: 'Excel: phieu.xlsx', them: 5, capNhat: 1, giu: 0, loi: 0}, {at: '2026-11-02T02:00:00.000Z', kind: 'dx', nguon: 'Danh mục', them: 3}],
    soLog: [{pid: 'p1', soCu: 'P1', soMoi: 'P9', ngay: '05/11/2026', lyDo: 'nhập nhầm', at: '2026-11-03T01:00:00.000Z', nguon: {tab: 'HoSoKeo_QC', row: 4, col: 'Số phiếu'}}],
    bienLog: [{soPhieu: 'P9', ngay: '05/11/2026', cu: '92C-1', moi: '92C-2', at: '2026-11-03T02:00:00.000Z'}],
    inAn: {soIn: [{at: '2026-11-04T01:00:00.000Z', ma: '08', hanh: 'in', lyDo: 'in lần đầu'}, {at: '2026-11-04T03:00:00.000Z', ma: '08', hanh: 'ky'}]},
    nhatKy: [{at: '2026-11-05T01:00:00.000Z', hanh: 'chot', lyDo: '', nguoi: 'Kế toán', phienBan: '3.5.1'}]
  };
  const ev = NK.build(f, {tenBM: m => 'BM-' + m});
  assert.strictEqual(ev.length, 8);
  assert.deepStrictEqual(ev.map(e => e.loai), ['tao', 'nap', 'nap', 'doiSo', 'doiBien', 'in', 'ky', 'vongDoi']);
  const t = ev.map(e => Date.parse(e.at)); assert.deepStrictEqual(t, t.slice().sort((a, b) => a - b));
  assert.match(ev.find(e => e.loai === 'nap').text, /Nạp phiếu cân từ Excel: phieu\.xlsx: thêm 5, cập nhật 1/);
  assert.match(ev.find(e => e.loai === 'doiSo').text, /P1 → P9.*nhập nhầm.*HoSoKeo_QC · dòng 4/);
  assert.match(ev.find(e => e.loai === 'doiBien').text, /92C-1 → 92C-2/);
  assert.match(ev.find(e => e.loai === 'ky').text, /Ký BM-08/);
  const vd = ev.find(e => e.loai === 'vongDoi'); assert.match(vd.text, /Chốt lô \(phiên bản 3\.5\.1\)/); assert.strictEqual(vd.nguoi, 'Kế toán');
});
test('lô trống hoặc thiếu thời điểm: không lỗi, dòng không rõ thời điểm xếp cuối, không sửa dữ liệu gốc', () => {
  assert.deepStrictEqual(NK.build(null), []); assert.deepStrictEqual(NK.build({}), []);
  const f = {soLog: [{soCu: 'A', soMoi: 'B'}], bienLog: [{soPhieu: 'B', cu: 'x', moi: 'y', at: '2026-11-01T00:00:00Z'}]}, truoc = JSON.stringify(f);
  const ev = NK.build(f); assert.strictEqual(ev[0].loai, 'doiBien'); assert.strictEqual(ev[1].loai, 'doiSo'); assert.strictEqual(JSON.stringify(f), truoc);
});
