'use strict';
/* Đọc một module giao diện đã chia thành nhiều file ui/app/NN-<chữ>-*.js: các phần ghép theo thứ tự tên file chính là module gốc
 * (build-html ghép bằng nối chuỗi, nên chia theo ranh giới dòng không đổi renderer/index.html). */
const fs = require('fs'), path = require('path');
const DIR = path.join(__dirname, '..', 'ui', 'app');
/* tên các file (không thư mục) của module NN, đúng thứ tự ghép */
const tepUi = nn => fs.readdirSync(DIR).filter(f => new RegExp('^' + nn + '-.*\\.js$').test(f)).sort();
/* nội dung ghép của module NN */
const docUi = nn => tepUi(nn).map(f => fs.readFileSync(path.join(DIR, f), 'utf8')).join('');
module.exports = {tepUi, docUi};
