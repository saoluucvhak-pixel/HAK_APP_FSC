'use strict';
/* P2-2: hộp sửa người giữ vị trí đã ngừng; P2-3: tự điền Nhiệm vụ chỉ ở sự kiện change, không ở mỗi phím gõ. */
const test = require('node:test'), assert = require('node:assert/strict'), fs = require('fs'), path = require('path');
const doc = f => fs.readFileSync(path.join(__dirname, '..', 'ui', 'app', f), 'utf8');
test('P2-2 ngMo: ô Vị trí giữ vị trí hiện tại của người dù đã ngừng', () => {
  const src = doc('30-cai-dat-danh-muc.js'), i = src.indexOf('function ngMo'), j = src.indexOf('function ngLuu');
  const mo = src.slice(i, j);
  assert.ok(mo.includes('!v.ngung || v.id === p.viTriId'));
  assert.ok(!/dmVT\(\)\.filter\(v => !v\.ngung\)\./.test(mo));
});
test('P2-3 dbChonViTri chỉ chạy ở change, không ở input', () => {
  const src = doc('10-d-dinh-muc-nhap-excel.js');
  assert.ok(!src.split('\n').some(l => l.includes("addEventListener('input'") && l.includes('dbChonViTri')));   // 3.7.1: hộp thoại Thêm/Sửa vị trí định biên, tự điền chỉ ở change
  const chg = src.split('\n').find(l => l.includes("addEventListener('change'") && l.includes('dbChonViTri'));
  assert.ok(chg);
});
