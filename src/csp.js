'use strict';
/* Content-Security-Policy theo mã băm cho các trang HTML của ứng dụng (dùng chung cho scripts/build-html.js và src/main.js).
 * Trình phân tích HTML đổi CRLF / CR thành LF TRƯỚC khi băm nội dung script, nên ở đây cũng chuẩn hóa như vậy rồi mới băm
 * (nguồn checkout trên Windows có thể có CRLF; băm nguyên văn thì CSP chặn mọi script). */
const crypto = require('crypto');

const lf = html => String(html).replace(/\r\n?/g, '\n');
const hashOf = body => "'sha256-" + crypto.createHash('sha256').update(body, 'utf8').digest('base64') + "'";

/* Mã băm của mọi khối <script> nội tuyến (không có src). Quét lần lượt từ đầu file: chuỗi "<script" nằm TRONG một script
 * (ví dụ thư viện ghi '<script src=...><\/script>') thuộc phần thân của script đó, không bị tính là khối riêng. */
function scriptHashes(html) {
  const out = [], re = /<script(\s[^>]*)?>([\s\S]*?)<\/script>/gi, src = lf(html);
  let m;
  while ((m = re.exec(src))) { if (!/\bsrc\s*=/i.test(m[1] || '')) out.push(hashOf(m[2])); }
  return [...new Set(out)];
}

/* Chuỗi chính sách: script chỉ theo mã băm (không 'unsafe-inline'), không tải tài nguyên ngoài. extra: {chỉ thị: 'giá trị'} ghi đè/bổ sung. */
function policy(hashes, extra = {}) {
  const d = {'default-src': "'none'", 'script-src': hashes.join(' ') || "'none'", 'style-src': "'unsafe-inline'", 'img-src': "'self' data: blob:",
    'font-src': "'self' data:", 'connect-src': "'none'", 'object-src': "'none'", 'base-uri': "'none'", 'form-action': "'none'", 'frame-src': "'none'", 'worker-src': "'none'", ...extra};
  return Object.entries(d).map(([k, v]) => k + ' ' + v).join('; ');
}

module.exports = {lf, hashOf, scriptHashes, policy};
