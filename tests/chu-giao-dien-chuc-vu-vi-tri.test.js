'use strict';
/* Chữ GIAO DIỆN đã đổi “Vai trò” → “Chức vụ”, “Chức danh” (nghĩa vị trí) → “Vị trí”; chữ trong bản in và tên trường lưu giữ nguyên.
 * Đọc nguồn (không cần Electron). */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs'), path = require('path');
const doc = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');

test('báo cáo Danh sách lao động và Vận chuyển: cột “Chức vụ”, “Vị trí”, không còn “Vai trò”/“Chức danh”', () => {
  const s = doc('ui/reports.js');
  assert.ok(s.includes("{h: 'Chức vụ', w: 8}, {h: 'Vị trí', w: 10}"));
  assert.ok(!/h: 'Vai trò'/.test(s) && !/h: 'Chức danh'/.test(s));
  assert.ok(s.includes('chức vụ, vị trí, ngày sinh'));
});

test('hướng dẫn và nhãn kiểm tra xuất dùng “vị trí”', () => {
  assert.ok(!/Vai trò “Tổ trưởng”/.test(doc('docs/HUONG_DAN.md')));
  assert.ok(doc('ui/app/09-tong-quan-giao-dien.js').includes("'Định mức BHLĐ theo vị trí'"));
  assert.ok(doc('ui/app/10-a-kiem-tra-xuat.js').includes("'Định mức BHLĐ theo vị trí'"));
  assert.ok(!/theo chức danh/.test(doc('ui/app.src.html')));
});

test('chữ bản in giữ nguyên', () => {
  assert.ok(doc('src/noidunghopdong.js').includes('Đơn giá khoán theo vai trò'));
  assert.ok(doc('ui/app/08-in-ho-so-dot-2.js').includes("'Nơi cư trú', 'Chức danh', 'Chữ ký'"));
});
