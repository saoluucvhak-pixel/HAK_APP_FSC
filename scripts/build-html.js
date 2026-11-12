'use strict';
/* Ghép giao diện: lấy app.src.html (nguồn giao diện), nhúng thư viện SheetJS, JSZip và mẫu báo cáo (ui/reports.js), ghi ra renderer/index.html */
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const src = fs.readFileSync(path.join(root, 'ui', 'app.src.html'), 'utf8');
const lib = p => fs.readFileSync(path.join(root, 'node_modules', p), 'utf8');
fs.mkdirSync(path.join(root, 'renderer'), {recursive: true});
fs.writeFileSync(path.join(root, 'renderer', 'index.html'),
  src.replace('/*@@XLSX@@*/', () => lib('xlsx/dist/xlsx.full.min.js')).replace('/*@@JSZIP@@*/', () => lib('jszip/dist/jszip.min.js')).replace('/*@@REPORTS@@*/', () => fs.readFileSync(path.join(root, 'ui', 'reports.js'), 'utf8')));
console.log('Đã tạo renderer/index.html');
