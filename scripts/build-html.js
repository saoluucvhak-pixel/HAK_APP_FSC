'use strict';
/* Ghép giao diện: lấy app.src.html (nguồn giao diện), nhúng thư viện SheetJS, JSZip và mẫu báo cáo (ui/reports.js), ghi ra renderer/index.html */
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const src = fs.readFileSync(path.join(root, 'ui', 'app.src.html'), 'utf8');
const rd = p => fs.readFileSync(path.join(root, p), 'utf8');
const lib = p => fs.readFileSync(path.join(root, 'node_modules', p), 'utf8');
fs.mkdirSync(path.join(root, 'renderer'), {recursive: true});
fs.writeFileSync(path.join(root, 'renderer', 'index.html'),
  src.replace('/*@@LUXE@@*/', () => rd('ui/vendor/hak-design-system/luxe.css')).replace('/*@@COMPONENTS@@*/', () => rd('ui/vendor/hak-design-system/components.css')).replace('/*@@SKINS@@*/', () => rd('ui/skins.css'))
    .replace('/*@@DATES@@*/', () => rd('src/dates.js')).replace('/*@@BANNHAP@@*/', () => rd('src/bannhap.js')).replace('/*@@INAN2@@*/', () => rd('src/inan2.js')).replace('/*@@KHOAN@@*/', () => rd('src/khoan.js')).replace('/*@@NHAPLIEU@@*/', () => rd('src/nhaplieu.js')).replace('/*@@MUAHANG@@*/', () => rd('src/muahang.js')).replace('/*@@LORUNG@@*/', () => rd('src/lorung.js')).replace('/*@@XLSXMAU@@*/', () => rd('src/xlsxmau.js')).replace('/*@@HOPDONG@@*/', () => rd('src/hopdong.js')).replace('/*@@SF@@*/', () => rd('ui/vendor/hak-smart-filter/core/smart-filter.js') + '\n' + rd('ui/vendor/hak-smart-filter/browser.js'))
    .replace('/*@@XLSX@@*/', () => lib('xlsx/dist/xlsx.full.min.js')).replace('/*@@JSZIP@@*/', () => lib('jszip/dist/jszip.min.js')).replace('/*@@REPORTS@@*/', () => fs.readFileSync(path.join(root, 'ui', 'reports.js'), 'utf8')));
console.log('Đã tạo renderer/index.html');
