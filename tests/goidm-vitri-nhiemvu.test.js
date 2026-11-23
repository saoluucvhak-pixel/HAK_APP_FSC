'use strict';
/* Gói danh mục mang theo nhiemVu / ghiChu của vị trí (tùy chọn, chỉ có khi khác rỗng); gói và dữ liệu cũ y hệt trước */
const test = require('node:test'), assert = require('node:assert/strict');
const GD = require('../src/goidm');

const lo = () => ({id: 'f1', nc: [{ten: 'NGƯỜI THỬ', cccd: '049000000011', viTriId: 'vt1'}, {ten: 'NGƯỜI THỬ 2', cccd: '049000000012', viTriId: 'vt2'}], dx: [], hdvc: [], doi: []});
const dbA = () => ({dmDoiTuong: [], dmXe: [], dmViTri: [
  {id: 'vt1', ten: 'Công nhân cưa', ngung: false, nhiemVu: 'Hạ cây theo tuyến', ghiChu: 'Có chứng chỉ an toàn'},
  {id: 'vt2', ten: 'Khác', ngung: false}]});

test('đóng gói rồi đọc lại (JSON): nhiemVu/ghiChu giữ nguyên; vị trí không có hai trường thì không sinh khóa', () => {
  const g = JSON.parse(JSON.stringify(GD.dongGoi(dbA(), lo())));
  const may = {dmViTri: [], dmDoiTuong: [], dmXe: []};
  const n = GD.noi(may, g);
  const v1 = n.dm.dmViTri.find(v => v.ten === 'Công nhân cưa'), v2 = n.dm.dmViTri.find(v => v.ten === 'Khác');
  assert.equal(v1.nhiemVu, 'Hạ cây theo tuyến'); assert.equal(v1.ghiChu, 'Có chứng chỉ an toàn');
  assert.ok(!('nhiemVu' in v2) && !('ghiChu' in v2));
});

test('gói cũ (không có hai trường): kết quả y hệt, không thêm khóa nào', () => {
  const db = dbA(); db.dmViTri.forEach(v => { delete v.nhiemVu; delete v.ghiChu; });
  const g = GD.dongGoi(db, lo());
  assert.equal(JSON.stringify(g.viTri), JSON.stringify([{id: 'vt1', ten: 'Công nhân cưa', ngung: false}, {id: 'vt2', ten: 'Khác', ngung: false}]));
  const may = {dmViTri: [{id: 'vt9', ten: 'công nhân cưa', ngung: false}], dmDoiTuong: [], dmXe: []};
  const n = GD.noi(may, g);
  assert.equal(JSON.stringify(n.dm.dmViTri.find(v => v.id === 'vt9')), JSON.stringify({id: 'vt9', ten: 'công nhân cưa', ngung: false}));
  assert.deepEqual(n.khac, []);
});

test('gộp hai máy: máy đích đã có vị trí nhưng thiếu nhiemVu/ghiChu thì được bổ sung từ gói; không sửa đầu vào', () => {
  const g = GD.dongGoi(dbA(), lo());
  const may = {dmViTri: [{id: 'vt9', ten: 'Công nhân cưa', ngung: false}], dmDoiTuong: [], dmXe: []};
  const truoc = JSON.stringify(may);
  const n = GD.noi(may, g), v = n.dm.dmViTri.find(x => x.id === 'vt9');
  assert.equal(v.nhiemVu, 'Hạ cây theo tuyến'); assert.equal(v.ghiChu, 'Có chứng chỉ an toàn');
  assert.equal(JSON.stringify(may), truoc);
});

test('gộp hai máy: máy đích đã có nội dung thì GIỮ bản máy, ghi chú khác biệt; máy có mà gói không có thì giữ', () => {
  const g = GD.dongGoi(dbA(), lo());
  const may = {dmViTri: [{id: 'vt9', ten: 'Công nhân cưa', ngung: false, nhiemVu: 'Bản của máy đích'}, {id: 'vt8', ten: 'Khác', ngung: false, nhiemVu: 'Việc khác', ghiChu: 'Ghi chú máy'}], dmDoiTuong: [], dmXe: []};
  const n = GD.noi(may, g);
  const a = n.dm.dmViTri.find(x => x.id === 'vt9'), b = n.dm.dmViTri.find(x => x.id === 'vt8');
  assert.equal(a.nhiemVu, 'Bản của máy đích'); assert.equal(a.ghiChu, 'Có chứng chỉ an toàn', 'trường máy đích còn trống được bổ sung');
  assert.equal(b.nhiemVu, 'Việc khác'); assert.equal(b.ghiChu, 'Ghi chú máy');
  assert.ok(n.khac.some(t => /Công nhân cưa/.test(t) && /nhiệm vụ/.test(t) && /MÁY/.test(t)), JSON.stringify(n.khac));
});
