'use strict';
/* Phiếu #15 (v3.1.0): chữ hướng dẫn cũ KHÔNG được hiện cho người dùng. Menu “⋯ Thêm” không còn từ bản 3.0 (Sao lưu, Khôi phục, Hướng dẫn nằm ở Cài đặt); “Tab Phiếu cân” cũng không còn (phiếu cân nằm trong hợp đồng vận chuyển).
 * Phiếu #06b dùng grep nhưng bỏ sót vì chữ nằm trong chuỗi HTML dài: kiểm thử này đọc mã nguồn, BỎ chú thích (dòng bắt đầu bằng hai dấu gạch chéo, hoặc khối chú thích; nơi được phép giữ chú thích lịch sử) rồi báo lỗi nếu còn chữ cũ ở phần còn lại
 * (chuỗi, HTML, tài liệu hướng dẫn). Bộ quét chữ tách chuỗi '…', "…", `…` đúng để dấu // trong địa chỉ (https://…) không bị coi là chú thích. */
const test = require('node:test'), assert = require('node:assert');
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const CU = [/⋯\s*Thêm/, /Tab Phiếu cân/];

/* bỏ chú thích của mã JavaScript, giữ nguyên chuỗi và số dòng (chú thích thay bằng khoảng trắng / xuống dòng) */
function boChuThichJs(src) {
  let out = '', i = 0, q = null; const n = src.length;
  while (i < n) {
    const c = src[i], d = src[i + 1];
    if (q) { out += c; if (c === '\\') { out += d || ''; i += 2; continue; } if (c === q) q = null; i++; continue; }
    if (c === '/' && d === '*') { const j = src.indexOf('*/', i + 2), e = j < 0 ? n : j + 2; out += src.slice(i, e).replace(/[^\n]/g, ' '); i = e; continue; }
    if (c === '/' && d === '/') { let j = src.indexOf('\n', i); if (j < 0) j = n; out += ' '.repeat(j - i); i = j; continue; }
    if (c === "'" || c === '"' || c === '`') q = c;
    out += c; i++;
  }
  return out;
}
const boChuThichHtml = s => s.replace(/<!--[\s\S]*?-->/g, m => m.replace(/[^\n]/g, ' '));
const gap = (ten, noiDung) => { const r = []; noiDung.split('\n').forEach((dong, i) => CU.forEach(re => { if (re.test(dong)) r.push(ten + ':' + (i + 1) + ' → ' + dong.trim().slice(0, 100)); })); return r; };

test('bộ bỏ chú thích: giữ chuỗi có “//”, bỏ chú thích dòng và khối, giữ số dòng', () => {
  const m = "const a = 'https://x.y'; // ⋯ Thêm cũ\nconst b = \"⋯ Thêm\"; /* Tab Phiếu cân\n cũ */ const c = `x // ⋯ Thêm`;\n";
  const s = boChuThichJs(m); assert.strictEqual(s.split('\n').length, m.split('\n').length);
  assert.ok(s.includes('https://x.y')); assert.strictEqual(gap('t', s).length, 2, 'chỉ hai chuỗi “⋯ Thêm” trong chuỗi (dấu nháy kép và template) còn lại: ' + s);
});
test('ui/app/*.js: không còn “⋯ Thêm” / “Tab Phiếu cân” ngoài chú thích (kể cả trong chuỗi HTML dài)', () => {
  const dir = path.join(root, 'ui', 'app'); let loi = [];
  for (const f of fs.readdirSync(dir).filter(x => x.endsWith('.js'))) loi = loi.concat(gap('ui/app/' + f, boChuThichJs(fs.readFileSync(path.join(dir, f), 'utf8'))));
  assert.deepStrictEqual(loi, [], 'chữ hướng dẫn cũ còn hiện cho người dùng:\n' + loi.join('\n'));
});
test('ui/app.src.html (ngoài chú thích HTML) và docs/HUONG_DAN.md: không còn chữ cũ', () => {
  const loi = gap('ui/app.src.html', boChuThichHtml(fs.readFileSync(path.join(root, 'ui', 'app.src.html'), 'utf8'))).concat(gap('docs/HUONG_DAN.md', fs.readFileSync(path.join(root, 'docs', 'HUONG_DAN.md'), 'utf8')));
  assert.deepStrictEqual(loi, [], loi.join('\n'));
});
test('src/*.js (chuỗi hiển thị trong ứng dụng, ví dụ gợi ý và hướng dẫn): không còn chữ cũ ngoài chú thích', () => {
  const dir = path.join(root, 'src'); let loi = [];
  for (const f of fs.readdirSync(dir).filter(x => x.endsWith('.js'))) loi = loi.concat(gap('src/' + f, boChuThichJs(fs.readFileSync(path.join(dir, f), 'utf8'))));
  assert.deepStrictEqual(loi, [], loi.join('\n'));
});
