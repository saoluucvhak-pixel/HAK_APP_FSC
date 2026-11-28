'use strict';
/* PR C: màn Cài đặt dùng TAB NGANG cùng kiểu Danh mục (hak-catalog-tabs): Dữ liệu, Sao lưu và khôi phục, Google Sheets, Hiển thị (gồm Hiển thị số và Giao diện),
 * Hướng dẫn, Cần đối chiếu; “Sao lưu và khôi phục” chia ba tab con (Thao tác, Thư mục và lịch, Các bản sao lưu). Quét mã nguồn giao diện (giữ cấu trúc và mã màn / id cũ). */
const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('fs'), path = require('path');
const doc = n => fs.readFileSync(path.join(__dirname, '..', 'ui', 'app', n), 'utf8');
const m15 = doc('15-du-lieu-cai-dat-sao-luu-lo.js'), m29 = doc('29-kho-sao-luu.js');

test('Cài đặt: sáu tab ngang đúng tên, giữ mã màn và id setTab_<màn> cũ', () => {
  const khoi = /const SET_TABS = \[([\s\S]*?)\];/.exec(m15)[1];
  [['settings', 'Dữ liệu'], ['setbk', 'Sao lưu và khôi phục'], ['setgs', 'Google Sheets'], ['setfmt', 'Hiển thị'], ['sethd', 'Hướng dẫn'], ['setcan', 'Cần đối chiếu']].forEach(([v, l]) => assert.ok(khoi.includes("'" + v + "', '" + l + "'"), v + ' → ' + l));
  assert.ok(!/'Hệ thống'/.test(khoi), 'tên cũ “Hệ thống” đã đổi thành “Dữ liệu”');
  assert.ok(!/'Giao diện'/.test(khoi) && !/'Hiển thị số'/.test(khoi), 'Giao diện và Hiển thị số là tab con của Hiển thị, không còn tab riêng');
  assert.match(m15, /function settingsFrame\(active, inner\) \{[\s\S]*?hak-catalog-tabs[\s\S]*?\}\n/, 'khung dùng hak-catalog-tabs');
  assert.ok(!/class="mucLayout"/.test(/function settingsFrame[\s\S]*?\n\}\n/.exec(m15)[0]), 'không còn menu dọc mucLayout/mucNav ở khung Cài đặt');
});
test('Hiển thị: hai tab con Hiển thị số và Giao diện, id setSub_setfmt và setTab_setgd', () => {
  const k = /const SET_HIEN_THI = \[([\s\S]*?)\];/.exec(m15)[1];
  assert.ok(k.includes("'setfmt', 'Hiển thị số', 'openSetFmt', 'setSub_setfmt'") && k.includes("'setgd', 'Giao diện', 'openSetGd', 'setTab_setgd'"));
});
test('Sao lưu và khôi phục: ba tab con; thông báo kết quả nằm trên các tab con (thấy ở mọi tab con)', () => {
  assert.match(m29, /const SB_TABS = \[\['thaotac', 'Thao tác'\], \['thumuc', 'Thư mục và lịch'\], \['ban', 'Các bản sao lưu'\]\]/);
  assert.match(m29, /return msgHtml \+ '<nav class="hak-catalog-tabs sub" id="sbTabs"/, 'msgHtml đứng trước thanh tab con, không nằm trong khung Thao tác');
  ['kslBox', 'kslBoxB', 'kslBoxC'].forEach(id => assert.ok(m29.includes('id="' + id + '"'), id));
  assert.match(m29, /data-sbpane="' \+ k \+ '"[\s\S]{0,80}hidden/, 'khung tab con ẩn bằng hidden (chữ gõ dở không mất khi đổi tab)');
});
