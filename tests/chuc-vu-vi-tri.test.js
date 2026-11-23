'use strict';
/* Thống nhất thuật ngữ: “Vai trò” → “Chức vụ”, cột “Chức danh” của dòng nhân công → “Vị trí”.
 * Mẫu Excel nhân công tải về dùng tiêu đề MỚI; nhập Excel/dán vẫn đọc được CẢ tiêu đề cũ (file Excel cũ vẫn nhập bình thường).
 * Tên trường lưu (vaiTro, chucDanh) và giá trị đã lưu không đổi. */
const test = require('node:test');
const assert = require('node:assert');
const JSZip = require('jszip'), XLSX = require('xlsx');
global.XLSX = XLSX;
const M = require('../src/xlsxmau');
const TI = require('../src/tienich');
const DT = require('../src/doituong');
const K = require('../src/docphieucan');
const Money = require('../src/money');
const html = require('../scripts/build-html').appSource();
const trim = s => String(s == null ? '' : s).trim();
const legacyOf = () => { const m = /const H_LEGACY = (\{[^}]*\});\s*Object\.assign\(H_LEGACY, NC_ALIAS\)/.exec(html); return m ? Object.assign(eval('(' + m[1] + ')'), objOf('NC_ALIAS')) : {'Mã rừng': 'maRung'}; };
const objOf = name => { const m = new RegExp('const ' + name + ' = (\\{[\\s\\S]*?\\});').exec(html); return m ? eval('(' + m[1] + ')') : null; };
const arrOf = name => { const m = new RegExp('const ' + name + " = (\\[[^\\]]*\\]);").exec(html); return m ? eval(m[1]) : null; };
const api = K.create({
  trim, pad2: n => (n < 10 ? '0' : '') + n, numSwap: s => s, fmtRaw: String, toDec: s => s, normDate: s => trim(s), normCccd: s => trim(s),
  HAKMoney: Money, get H_LEGACY() { return legacyOf(); }
});
/* FileReader giả: parseSheet đọc ArrayBuffer của file */
global.FileReader = class { readAsArrayBuffer(f) { setTimeout(() => { this.result = f.buf; this.onload(); }, 0); } };
const taoFile = (heads, rows) => { const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([heads, ...rows]), 'NHAN_CONG'); const b = XLSX.write(wb, {type: 'array', bookType: 'xlsx'}); return {buf: b}; };

const CU = ['Vai trò', 'STT', 'Danh xưng', 'Họ và tên', 'Ngày sinh', 'CCCD', 'Ngày cấp CCCD', 'Nơi cấp CCCD', 'Địa chỉ thường trú', 'Chức danh', 'Đội'];
const MOI = CU.map(h => h === 'Vai trò' ? 'Chức vụ' : h === 'Chức danh' ? 'Vị trí' : h);
const DONG = ['Tổ trưởng', '1', 'Ông', 'TRẦN VĂN TỔ', '15/03/1985', '049085000001', '01/01/2021', 'Cục', 'Thôn 2', 'Tổ trưởng', ''];

test('mẫu Excel nhân công mới ghi “Chức vụ” và “Vị trí”, không còn “Vai trò”/“Chức danh”', async () => {
  const sp = M.SPECS.nc, ten = sp.cols.map(c => c.n);
  assert.ok(ten.includes('Chức vụ') && ten.includes('Vị trí'), ten.join('|'));
  assert.ok(!ten.includes('Vai trò') && !ten.includes('Chức danh'), ten.join('|'));
  const wb = XLSX.read(await M.build('nc', JSZip, {version: '9.9.9'}), {type: 'array'});
  const dong1 = XLSX.utils.sheet_to_json(wb.Sheets[sp.sheet], {header: 1, defval: ''})[0];
  assert.deepStrictEqual(dong1, MOI);
  const huongDan = JSON.stringify(XLSX.utils.sheet_to_json(wb.Sheets.HUONG_DAN, {header: 1, defval: ''}));
  assert.ok(!/Vai trò/.test(huongDan), 'trang hướng dẫn không còn “Vai trò”');
  assert.ok(/Chức vụ/.test(huongDan) && /Vị trí/.test(huongDan));
});

test('bộ đọc nhân công: tiêu đề MỚI đọc ra vaiTro và chucDanh', async () => {
  const H = objOf('H_NC'), REQ = arrOf('NC_REQ'), AL = undefined;
  assert.ok(H && REQ && objOf('NC_ALIAS'), 'phải có H_NC, NC_REQ, NC_ALIAS');
  const r = await api.parseSheet(taoFile(MOI, [DONG]), 'NHAN_CONG', H, REQ, api.normNC, AL);
  assert.strictEqual(r.rows.length, 1);
  assert.strictEqual(r.rows[0].vaiTro, 'Tổ trưởng'); assert.strictEqual(r.rows[0].chucDanh, 'Tổ trưởng');
});

test('bộ đọc nhân công: file Excel CŨ (tiêu đề “Vai trò”/“Chức danh”) vẫn nhập đúng cả hai trường', async () => {
  const H = objOf('H_NC'), REQ = arrOf('NC_REQ'), AL = undefined;
  const dong2 = ['Công nhân', '2', 'Ông', 'LÊ VĂN KHAI', '20/07/1990', '049090000002', '15/06/2022', 'Cục', 'Thôn 2', 'Công nhân khai thác', ''];
  const r = await api.parseSheet(taoFile(CU, [DONG, dong2]), 'NHAN_CONG', H, REQ, api.normNC, AL);
  assert.deepStrictEqual(r.rows.map(x => [x.vaiTro, x.chucDanh, x.ten]), [['Tổ trưởng', 'Tổ trưởng', 'TRẦN VĂN TỔ'], ['Công nhân', 'Công nhân khai thác', 'LÊ VĂN KHAI']]);
});

test('bộ đọc nhân công: thiếu cột bắt buộc báo bằng tên MỚI', async () => {
  const H = objOf('H_NC'), REQ = arrOf('NC_REQ'), AL = undefined;
  await assert.rejects(api.parseSheet(taoFile(['Họ và tên', 'CCCD'], [['A', '1']]), 'NHAN_CONG', H, REQ, api.normNC, AL), /Chức vụ.*Vị trí|Vị trí.*Chức vụ/);
});

test('H_LEGACY (bộ đọc dùng chung) chứa tiêu đề cũ của nhân công', () => {
  assert.strictEqual(legacyOf()['Vai trò'], 'vaiTro'); assert.strictEqual(legacyOf()['Chức danh'], 'chucDanh'); assert.strictEqual(legacyOf()['Mã rừng'], 'maRung');
  assert.ok(/Object\.assign\(H_LEGACY, NC_ALIAS\)/.test(html));
});

test('dán từ Excel: danKiem nhận tiêu đề mới lẫn cũ', () => {
  const REQ = arrOf('NC_REQ');
  assert.ok(TI.danKiem([MOI, DONG], REQ).ok, 'tiêu đề mới');
  assert.ok(TI.danKiem([CU, DONG], REQ).ok, 'tiêu đề cũ');
  assert.ok(!TI.danKiem([['Họ và tên', 'CCCD'], ['A', '1']], REQ).ok);
  assert.ok(/Chức vụ/.test(TI.danKiem([['Họ và tên', 'CCCD'], ['A', '1']], REQ).error));
});

test('nhập Excel Danh mục đối tượng: cột “Chức vụ” và cột cũ “Vai trò” đều đọc ra vaiTro', () => {
  const dong = h => ({'Tên đối tượng': 'A', 'Loại': 'Thể nhân', 'Họ tên': 'NGUYỄN VĂN A', 'CCCD': '049085000001', [h]: 'Nhân công, Tài xế'});
  for (const h of ['Chức vụ', 'Vai trò']) {
    const x = DT.docExcel([dong(h)], [], []), n = x.doiTuong[0].dt.nguoi[0];
    assert.deepStrictEqual([n.vaiTro.nhanCong, n.vaiTro.taiXe, n.vaiTro.chuXe], [true, true, false], h);
  }
});
