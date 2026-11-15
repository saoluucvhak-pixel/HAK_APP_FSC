'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs'), path = require('path');
const JSZip = require('jszip'), XLSX = require('xlsx');
const M = require('../src/xlsxmau');
const html = require('../scripts/build-html').appSource();   // khung ui/app.src.html + các module ui/app/*.js
const headOf = name => { const m = new RegExp('const ' + name + ' = (\\{[\\s\\S]*?\\});').exec(html); return Object.keys(eval('(' + m[1] + ')')); };
const reqOf = name => eval(new RegExp('const ' + name + " = (\\[[^\\]]*\\]);").exec(html)[1]);
const HEAD = {nc: headOf('H_NC'), dx: headOf('H_DX'), pc: headOf('H_PC')}, REQ = {nc: reqOf('NC_REQ'), dx: reqOf('DX_REQ'), pc: reqOf('PC_REQ')};

/* kiểm tra XML đúng cú pháp: thẻ đóng mở cân, ký tự đặc biệt đã thoát */
function wellFormed(xml) {
  const stack = [], re = /<(\/?)([A-Za-z_:][\w:.-]*)([^<>]*?)(\/?)>|<\?[\s\S]*?\?>|<!--[\s\S]*?-->/g; let m, last = 0;
  while ((m = re.exec(xml))) {
    if (!m[2]) continue;
    const between = xml.slice(last, m.index); if (/&(?!(amp|lt|gt|quot|apos|#\d+|#x[0-9a-fA-F]+);)/.test(between)) throw new Error('& chưa thoát gần: ' + between.slice(0, 40));
    last = re.lastIndex;
    if (m[1]) { const top = stack.pop(); if (top !== m[2]) throw new Error('thẻ đóng ' + m[2] + ' không khớp ' + top); } else if (!m[4]) stack.push(m[2]);
    if (/&(?!(amp|lt|gt|quot|apos|#\d+|#x[0-9a-fA-F]+);)/.test(m[3])) throw new Error('& chưa thoát trong thuộc tính');
  }
  if (stack.length) throw new Error('thẻ chưa đóng: ' + stack.join(','));
  return true;
}

for (const kind of M.KINDS) {
  test('mẫu ' + kind + ': tên cột trùng đúng tiêu đề phần mềm đọc, cột bắt buộc khớp, ví dụ đủ cột', () => {
    const sp = M.SPECS[kind];
    assert.deepStrictEqual(sp.cols.map(c => c.n), HEAD[kind], 'thứ tự và tên cột phải trùng H_' + kind.toUpperCase());
    REQ[kind].forEach(n => assert.strictEqual(sp.cols.find(c => c.n === n).req, 'Có', n + ' là cột bắt buộc của bộ nạp'));
    sp.example.forEach(r => assert.strictEqual(r.length, sp.cols.length, 'dòng ví dụ đủ ' + sp.cols.length + ' cột'));
    sp.cols.forEach(c => { assert.ok(c.fmt && c.note && c.req, 'mô tả đủ cho cột ' + c.n); });
  });
  test('mẫu ' + kind + ': file .xlsx hợp lệ, 3 trang tính, trang dữ liệu có tiêu đề ở dòng 1 để phần mềm đọc, trang ví dụ không phải trang dữ liệu', async () => {
    const bytes = await M.build(kind, JSZip, {version: '9.9.9'}), sp = M.SPECS[kind];
    const z = await JSZip.loadAsync(bytes);
    for (const f of Object.keys(z.files).filter(n => /\.(xml|rels)$/.test(n))) assert.ok(wellFormed(await z.file(f).async('string')), f);
    const wb = XLSX.read(bytes, {type: 'array'});
    assert.deepStrictEqual(wb.SheetNames, ['HUONG_DAN', sp.sheet, 'VI_DU']);
    const data = XLSX.utils.sheet_to_json(wb.Sheets[sp.sheet], {header: 1, defval: ''});
    assert.deepStrictEqual(data[0], HEAD[kind], 'dòng 1 của trang dữ liệu là tiêu đề đúng');
    assert.strictEqual(data.length, 1, 'trang dữ liệu để trống, không có dòng ví dụ lẫn vào (tránh nhập nhầm)');
    const ex = XLSX.utils.sheet_to_json(wb.Sheets.VI_DU, {header: 1, defval: ''});
    assert.deepStrictEqual(ex[1], HEAD[kind]); assert.strictEqual(ex.length, 2 + sp.example.length);
    const guide = XLSX.utils.sheet_to_json(wb.Sheets.HUONG_DAN, {header: 1, defval: ''}).map(r => r.join(' | ')).join('\n');
    for (const c of sp.cols) assert.ok(guide.includes(c.n), 'hướng dẫn mô tả cột ' + c.n);
    assert.ok(/phiên bản 9\.9\.9/.test(guide) && /Lỗi thường gặp/.test(guide) && /Các bước thực hiện/.test(guide));
  });
  test('mẫu ' + kind + ': định dạng (tô màu tiêu đề bắt buộc, cố định dòng tiêu đề, bộ lọc, danh sách chọn, cột văn bản giữ số 0 đầu)', async () => {
    const z = await JSZip.loadAsync(await M.build(kind, JSZip)), sp = M.SPECS[kind];
    const sh = await z.file('xl/worksheets/sheet2.xml').async('string'), st = await z.file('xl/styles.xml').async('string');
    assert.ok(/<pane ySplit="1"[^>]*state="frozen"/.test(sh) && /<autoFilter ref="A1:/.test(sh));
    assert.strictEqual((sh.match(/<dataValidation /g) || []).length, sp.cols.length, 'mỗi cột có ô gợi ý khi chọn ô');
    sp.cols.filter(c => c.list).forEach(c => assert.ok(sh.includes('<formula1>"' + c.list.join(',') + '"</formula1>'), 'danh sách chọn ' + c.n));
    assert.ok(/<col min="1" max="1"[^>]*style="10"/.test(sh) && /numFmtId="49"/.test(st), 'cột là văn bản');
    const nReq = sp.cols.filter(c => c.req === 'Có').length, red = (sh.match(/<c r="[A-Z]+1" s="8"/g) || []).length;
    assert.strictEqual(red, nReq, 'tiêu đề cột bắt buộc tô màu riêng');
  });
}

test('mẫu không có cột Mã rừng và Mã rừng không còn là cột bắt buộc của bộ nạp (dữ liệu luôn nạp vào lô đang mở)', () => {
  for (const k of M.KINDS) {
    assert.ok(!M.SPECS[k].cols.some(c => c.n === 'Mã rừng'), k + ': mẫu không có cột Mã rừng');
    assert.ok(!REQ[k].includes('Mã rừng'), k + ': Mã rừng không bắt buộc');
    assert.ok(!HEAD[k].includes('Mã rừng'), k + ': tiêu đề mẫu không có Mã rừng');
  }
  assert.ok(/const H_LEGACY = \{'Mã rừng': 'maRung'\}/.test(html), 'file cũ còn cột Mã rừng vẫn đọc được');
});

test('mẫu nhân công nhận danh sách vị trí của phần mềm (kể cả vị trí người dùng thêm): cột Chức danh và danh sách chọn', async () => {
  const bytes = await M.build('nc', JSZip, {version: '9', chucDanh: ['Tổ trưởng', 'Công nhân khai thác', 'Công nhân cưa', 'Công nhân phụ']});
  const z = await JSZip.loadAsync(bytes), all = (await Promise.all(Object.keys(z.files).filter(n => /sheet\d\.xml$/.test(n)).map(n => z.file(n).async('string')))).join('');
  assert.ok(/Công nhân phụ/.test(all), 'vị trí mới có trong mẫu');
  const wb = XLSX.read(bytes, {type: 'buffer'}); assert.ok(XLSX.utils.sheet_to_json(wb.Sheets.HUONG_DAN, {header: 1}).map(r => r.join(' ')).join('\n').includes('Công nhân phụ'));
  const def = await JSZip.loadAsync(await M.build('nc', JSZip, {version: '9'})), d = (await Promise.all(Object.keys(def.files).filter(n => /sheet\d\.xml$/.test(n)).map(n => def.file(n).async('string')))).join('');
  assert.ok(!/Công nhân phụ/.test(d), 'không truyền danh sách thì giữ ba vị trí mặc định');
});
