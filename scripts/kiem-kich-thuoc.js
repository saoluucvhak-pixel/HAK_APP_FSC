'use strict';
/* Cảnh báo (KHÔNG chặn) khi mã nguồn tự viết phình to: file lớn hơn 40 KB hoặc có dòng dài hơn 300 ký tự.
 * Mục đích: giữ mã dễ đọc, dễ đối chiếu sau khi đã tách module và ngắt dòng (docs/KE_HOACH_TACH_CODE.md, Bước 4).
 * Chạy: node scripts/kiem-kich-thuoc.js [--ngat]   (--ngat: thoát mã 1 nếu có cảnh báo) */
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const MAX_KB = 40, MAX_DONG = 300;
/* chỉ mã chạy trong ứng dụng; các kịch bản e2e/công cụ trong scripts/ chứa nhiều dữ liệu thử dán sẵn nên không xét */
const THU_MUC = ['src', 'ui/app'];
const dsFile = [];
THU_MUC.forEach(function quet(d) {
  for (const e of fs.readdirSync(path.join(ROOT, d), {withFileTypes: true})) {
    const rel = d + '/' + e.name;
    if (e.isDirectory()) quet(rel); else if (/\.js$/.test(e.name)) dsFile.push(rel);
  }
});
let canhBao = 0;
for (const f of dsFile) {
  const s = fs.readFileSync(path.join(ROOT, f), 'utf8'), kb = Buffer.byteLength(s) / 1024;
  const dong = s.split('\n'); const dai = dong.filter(l => l.length > MAX_DONG);
  if (kb > MAX_KB) { canhBao++; console.log('::warning file=' + f + '::File ' + kb.toFixed(0) + ' KB (> ' + MAX_KB + ' KB): cân nhắc chia nhỏ theo chức năng'); }
  if (dai.length) { canhBao++; console.log('::warning file=' + f + '::' + dai.length + ' dòng dài hơn ' + MAX_DONG + ' ký tự (dòng dài nhất ' + Math.max(...dai.map(l => l.length)) + '): cân nhắc ngắt dòng'); }
}
console.log('Kiểm tra kích thước mã: ' + dsFile.length + ' file, ' + canhBao + ' cảnh báo (không chặn).');
if (canhBao && process.argv.includes('--ngat')) process.exit(1);
