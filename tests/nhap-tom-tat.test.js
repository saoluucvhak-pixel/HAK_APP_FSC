'use strict';
/* PR D bước 2: câu “Chưa lưu: N lô, X chủ rừng mới, Y ánh xạ biển số” và danh sách cụ thể khi đóng còn nháp. Dữ liệu giả lập. */
const test = require('node:test'), assert = require('node:assert/strict');
const N = require('../src/nhap');
test('tomTat: nêu đúng N lô, X chủ rừng mới, Y ánh xạ; bỏ phần bằng 0', () => {
  const r = N.tomTat({lo: [{ten: 'R-A', moi: true, phieuMoi: 12}, {ten: 'R-B'}], chu: [{ten: 'Chủ giả lập', moi: true}, {ten: 'Chủ cũ', moi: false}], alias: 3});
  assert.equal(r.dong, 'Chưa lưu: 2 lô, 1 chủ rừng mới, 3 ánh xạ biển số');
  assert.deepEqual(r.chiTiet, ['Lô R-A (lô mới): 12 phiếu mới', 'Lô R-B', 'Chủ rừng mới: Chủ giả lập', '3 ánh xạ tên xe → biển số']);
  assert.equal(N.tomTat({lo: [{ten: 'R-A'}], chu: [], alias: 0}).dong, 'Chưa lưu: 1 lô');
  const rong = N.tomTat({}); assert.equal(rong.dong, ''); assert.equal(rong.tong, 0);
});
