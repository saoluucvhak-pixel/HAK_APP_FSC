'use strict';
/* Ghép giao diện: lấy app.src.html (khung HTML + CSS) và các module nghiệp vụ/giao diện ui/app/NN-*.js (ghép theo thứ tự tên file
 * vào CÙNG một khối <script>, trong cùng hàm bao 'use strict' nên dùng chung phạm vi biến như khi còn là một file), nhúng thư viện
 * SheetJS, JSZip và mẫu báo cáo (ui/reports.js), ghi ra renderer/index.html.
 * Thêm module: tạo file ui/app/NN-ten.js (NN quyết định thứ tự); mỗi file phải đọc được cú pháp riêng lẻ (công cụ quét kiểm tra). */
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const APP_DIR = path.join(root, 'ui', 'app');
const appModules = () => fs.readdirSync(APP_DIR).filter(n => /^\d{2}-[a-z0-9-]+\.js$/.test(n)).sort();
/* Nguồn giao diện đã ghép module (chưa nhúng thư viện): dùng cho build và cho kiểm thử đọc nguồn */
function appSource() {
  const shell = fs.readFileSync(path.join(root, 'ui', 'app.src.html'), 'utf8');
  if (!shell.includes('/*@@APP@@*/')) throw new Error('build-html: ui/app.src.html thiếu chỗ ghép /*@@APP@@*/');
  const body = appModules().map(n => { const t = fs.readFileSync(path.join(APP_DIR, n), 'utf8'); if (!t.endsWith('\n')) throw new Error('build-html: ' + n + ' phải kết thúc bằng xuống dòng'); return t; }).join('');
  return shell.replace('/*@@APP@@*/', () => body);
}
const rd = p => fs.readFileSync(path.join(root, p), 'utf8');
const lib = p => fs.readFileSync(path.join(root, 'node_modules', p), 'utf8');
/* Content-Security-Policy: chỉ chạy đúng các khối <script> có sẵn trong file (theo mã băm SHA-256), không 'unsafe-inline' cho script,
 * nên mã chèn qua dữ liệu (ví dụ <img onerror=...> trong tên chủ rừng) không chạy; không tải tài nguyên ngoài, không gọi mạng từ giao diện.
 * style 'unsafe-inline' vì giao diện dùng thuộc tính style. Dựng lại mã băm mỗi lần build nên sửa script không cần sửa tay CSP. */
function withCsp(html) {
  const hashes = [];
  html.replace(/<script>([\s\S]*?)<\/script>/g, (m, body) => { hashes.push("'sha256-" + require('crypto').createHash('sha256').update(body, 'utf8').digest('base64') + "'"); return m; });
  if (/<script\s+[^>]/.test(html)) throw new Error('build-html: chỉ hỗ trợ thẻ <script> không thuộc tính (CSP theo mã băm)');
  if (/\son[a-z]+\s*=\s*["']/i.test(html.replace(/<script>[\s\S]*?<\/script>/g, '').replace(/<style>[\s\S]*?<\/style>/g, ''))) throw new Error('build-html: có thuộc tính sự kiện nội tuyến (onclick=...) sẽ bị CSP chặn');
  const csp = ["default-src 'none'", 'script-src ' + hashes.join(' '), "style-src 'unsafe-inline'", "img-src 'self' data: blob:", "font-src 'self' data:",
    "connect-src 'none'", "object-src 'none'", "base-uri 'none'", "form-action 'none'", "frame-src 'none'", "worker-src 'none'"].join('; ');
  return html.replace('<meta charset="utf-8">', () => '<meta charset="utf-8">\n<meta http-equiv="Content-Security-Policy" content="' + csp + '">');
}
const OUT = path.join(root, 'renderer', 'index.html');
/* Dựng nội dung renderer/index.html (không ghi file) */
function render() {
  const src = appSource();
  return withCsp(
  src.replace('/*@@LUXE@@*/', () => rd('ui/vendor/hak-design-system/luxe.css')).replace('/*@@COMPONENTS@@*/', () => rd('ui/vendor/hak-design-system/components.css')).replace('/*@@SKINS@@*/', () => rd('ui/skins.css'))
    .replace('/*@@DATES@@*/', () => rd('src/dates.js')).replace('/*@@CULY@@*/', () => rd('src/culy.js')).replace('/*@@DINHBIEN@@*/', () => rd('src/dinhbien.js')).replace('/*@@DOI@@*/', () => rd('src/doi.js')).replace('/*@@BANNHAP@@*/', () => rd('src/bannhap.js')).replace('/*@@INAN2@@*/', () => rd('src/inan2.js')).replace('/*@@KHOAN@@*/', () => rd('src/khoan.js')).replace('/*@@CHAMCONG@@*/', () => rd('src/chamcong.js')).replace('/*@@MONEY@@*/', () => rd('src/money.js')).replace('/*@@STAGE@@*/', () => rd('src/stage.js')).replace('/*@@PHIEUCAN@@*/', () => rd('src/phieucan.js')).replace('/*@@DINHMUC@@*/', () => rd('src/dinhmuc.js')).replace('/*@@QUYTRINH@@*/', () => rd('src/quytrinh.js')).replace('/*@@NHAPLIEU@@*/', () => rd('src/nhaplieu.js')).replace('/*@@MUAHANG@@*/', () => rd('src/muahang.js')).replace('/*@@LORUNG@@*/', () => rd('src/lorung.js')).replace('/*@@XLSXMAU@@*/', () => rd('src/xlsxmau.js')).replace('/*@@HOPDONG@@*/', () => rd('src/hopdong.js')).replace('/*@@SF@@*/', () => rd('ui/vendor/hak-smart-filter/core/smart-filter.js') + '\n' + rd('ui/vendor/hak-smart-filter/browser.js'))
    .replace('/*@@XLSX@@*/', () => lib('xlsx/dist/xlsx.full.min.js')).replace('/*@@JSZIP@@*/', () => lib('jszip/dist/jszip.min.js')).replace('/*@@REPORTS@@*/', () => fs.readFileSync(path.join(root, 'ui', 'reports.js'), 'utf8')));
}
function build() { fs.mkdirSync(path.dirname(OUT), {recursive: true}); fs.writeFileSync(OUT, render()); }
module.exports = {appSource, appModules, render, build, OUT};
if (require.main === module) { build(); console.log('Đã tạo renderer/index.html (' + appModules().length + ' module giao diện)'); }
