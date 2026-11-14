'use strict';
/* Giao diện ghép từ ui/app.src.html + ui/app/NN-*.js + thư viện trong node_modules: bản renderer/index.html đã commit phải khớp mã nguồn hiện tại
 * (tránh commit giao diện dựng từ thư viện cũ, ví dụ SheetJS trước khi nâng cấp). Sửa: npm run build:html rồi commit lại. */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs'), path = require('path'), vm = require('vm');
const B = require('../scripts/build-html');

test('renderer/index.html đã commit khớp với mã nguồn và thư viện hiện tại (đã chạy npm run build:html)', () => {
  assert.ok(fs.readFileSync(B.OUT, 'utf8') === B.render(), 'renderer/index.html chưa dựng lại: chạy npm run build:html');
});

test('mỗi module ui/app/*.js đọc được cú pháp riêng lẻ, kết thúc bằng xuống dòng, ghép theo thứ tự số', () => {
  const mods = B.appModules();
  assert.ok(mods.length >= 10, 'phải có các module giao diện');
  assert.deepStrictEqual(mods, [...mods].sort());
  const all = fs.readdirSync(path.join(__dirname, '..', 'ui', 'app'));
  assert.deepStrictEqual(all.filter(n => n.endsWith('.js')).sort(), mods, 'file .js trong ui/app phải đặt tên NN-ten.js để được ghép');
  mods.forEach(n => {
    const t = fs.readFileSync(path.join(__dirname, '..', 'ui', 'app', n), 'utf8');
    assert.ok(t.endsWith('\n'), n);
    assert.doesNotThrow(() => new vm.Script('(() => {\n"use strict";\n' + t + '\n})', {filename: n}), n);
  });
});

test('giao diện có CSP theo mã băm và SheetJS đã nâng cấp', () => {
  const html = fs.readFileSync(B.OUT, 'utf8');
  assert.match(html, /<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'sha256-/);
  assert.doesNotMatch(html, /script-src[^;]*'unsafe-inline'/);
  assert.match(html, /make_xlsx_lib\(e\)\{e\.version="0\.20\.3"/);
});

test('CSP: nguồn có CRLF (checkout trên Windows) cho cùng mã băm như LF — trình duyệt chuẩn hóa CRLF trước khi băm', () => {
  const crypto = require('crypto'), h = s => "'sha256-" + crypto.createHash('sha256').update(s, 'utf8').digest('base64') + "'";
  const lf = B.withCsp('<meta charset="utf-8">\n<script>\nvar a = 1;\nvar b = 2;\n</script>\n');
  const crlf = B.withCsp('<meta charset="utf-8">\r\n<script>\r\nvar a = 1;\r\nvar b = 2;\r\n</script>\r\n');
  assert.strictEqual(crlf, lf);
  assert.ok(lf.includes(h('\nvar a = 1;\nvar b = 2;\n')), 'mã băm tính trên nội dung LF');
  assert.ok(!/\r/.test(B.render()), 'renderer/index.html không còn ký tự CR');
});
