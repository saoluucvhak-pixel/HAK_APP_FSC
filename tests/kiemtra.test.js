'use strict';
const test = require('node:test'), assert = require('node:assert');
const K = require('../src/kiemtra');

test('chuẩn hóa mục: mức chặn / đối chiếu, nhóm, biểu mẫu mặc định theo nhóm, nơi sửa (nhận cả tên cũ kind và go)', () => {
  const a = K.muc({kind: 'chan', nhom: 'Đội xe', text: 'Dòng 3: thiếu SĐT', ref: 'Dòng 3', go: {ftab: 'dx'}});
  assert.deepStrictEqual([a.muc, a.nhom, a.bieuMau, a.noiSua], ['chan', 'Đội xe', ['04', '09', '10'], {ftab: 'dx'}]);
  const b = K.muc({muc: 'doi', nhom: 'Checklist FSC', text: 'x'}); assert.deepStrictEqual([b.muc, b.bieuMau], ['doi', []]);
  assert.strictEqual(K.muc({kind: 'xyz', nhom: 'N', text: 't'}).muc, 'doi', 'mức lạ coi là cần đối chiếu (không chặn)');
  assert.deepStrictEqual(K.muc({nhom: 'Lạ', text: 't', bieuMau: ['08']}).bieuMau, ['08'], 'biểu mẫu nêu rõ thì dùng nguyên');
});
test('đối tượng: mặc định cả lô; có “Dòng n” thì là một dòng; nêu rõ đội / đội xe thì giữ tên', () => {
  assert.deepStrictEqual(K.muc({nhom: 'Thông tin rừng', text: 'thiếu diện tích'}).doiTuong, {loai: 'lo', ten: '', dong: null});
  assert.deepStrictEqual(K.muc({nhom: 'Nhân công', text: 'Dòng 7: thiếu CCCD', ref: 'Dòng 7'}).doiTuong, {loai: 'dong', ten: '', dong: 7});
  assert.deepStrictEqual(K.muc({nhom: 'Giấy tờ xe hết hạn lúc chạy phiếu', text: 'x', doiTuong: {loai: 'doiXe', ten: 'LÊ VĂN MỘT'}}).doiTuong, {loai: 'doiXe', ten: 'LÊ VĂN MỘT', dong: null});
  assert.strictEqual(K.muc({nhom: 'N', text: 't', doiTuong: {loai: 'khong-co'}}).doiTuong.loai, 'lo');
});
test('bảng nhóm → biểu mẫu: mọi nhóm của Kiểm tra trước khi xuất có quy tắc rõ; nhóm chặn nào cũng gắn ít nhất một biểu mẫu', () => {
  const chan = ['Thông tin chủ rừng', 'Thông tin rừng', 'Mã lô trùng (dữ liệu cũ)', 'Hình thức, đơn giá', 'Nhân công', 'Định mức BHLĐ', 'Đội xe', 'Giấy tờ xe hết hạn lúc chạy phiếu', 'Cước vận chuyển', 'Phiếu cân', 'Phiếu cân: ngày thiếu hoặc sai', 'Phiếu cân trùng số', 'Phiếu cân: biển số chưa ghép với xe'];
  chan.forEach(n => assert.ok(K.bieuMauCuaNhom(n).length > 0, n));
  const doi = ['Giấy tờ xe', 'Địa chỉ giao hàng', 'Cự ly vận chuyển', 'Định mức nhân công', 'Thời gian khai thác', 'Số đội', 'Phiếu cân chưa gán đội', 'Chênh lệch sản lượng', 'Checklist FSC'];
  doi.forEach(n => assert.ok(n in K.BIEU_MAU_NHOM, n));
  assert.deepStrictEqual(K.bieuMauCuaNhom('Giấy tờ xe hết hạn lúc chạy phiếu'), ['09', '10'], 'chỉ BM-09, BM-10 (không chặn hợp đồng vận chuyển BM-04)');
  assert.deepStrictEqual(K.bieuMauCuaNhom('Thông tin rừng'), K.TAT_CA); assert.deepStrictEqual(K.bieuMauCuaNhom('không có nhóm này'), []);
  const cp = K.bieuMauCuaNhom('Nhân công'); cp.push('XX'); assert.ok(!K.bieuMauCuaNhom('Nhân công').includes('XX'), 'trả bản sao');
});
test('tóm tắt, biểu mẫu bị chặn, lý do cho cổng xuất, lọc theo đội / đội xe', () => {
  const L = [K.muc({kind: 'chan', nhom: 'Đội xe', text: 'Dòng 2: thiếu SĐT', ref: 'Dòng 2'}), K.muc({kind: 'chan', nhom: 'Giấy tờ xe hết hạn lúc chạy phiếu', text: 'Đội xe “A”: phiếu P1', doiTuong: {loai: 'doiXe', ten: 'A'}}),
    K.muc({kind: 'doi', nhom: 'Định mức nhân công', text: 'thiếu 1 cưa', doiTuong: {loai: 'doi', ten: 'Đội 1'}}), K.muc({kind: 'doi', nhom: 'Checklist FSC', text: 'Tọa độ'})];
  const t = K.tomTat(L); assert.deepStrictEqual([t.chan, t.doi, t.tong], [2, 2, 4]); assert.deepStrictEqual(t.theoDoiTuong, {lo: 1, doi: 1, doiXe: 1, dong: 1}); assert.deepStrictEqual(t.theoNhom['Đội xe'], {chan: 1, doi: 0});
  const b = K.bieuMauBiChan(L); assert.deepStrictEqual(Object.keys(b).sort(), ['04', '09', '10']); assert.strictEqual(b['09'].length, 2); assert.strictEqual(b['04'].length, 1);
  assert.ok(K.biChan(L, '09') && !K.biChan(L, '08') && !K.biChan([], '09'));
  assert.match(K.lyDoChan(L, '09', 1), /^Đội xe: Dòng 2: thiếu SĐT… \(\+1\)$/); assert.strictEqual(K.lyDoChan(L, '08'), '');
  assert.deepStrictEqual(K.theoDoiTuong(L, 'doiXe', 'A').map(x => x.nhom), ['Giấy tờ xe hết hạn lúc chạy phiếu', 'Checklist FSC'], 'đội xe A: mục của đội xe A và của cả lô (không lấy dòng riêng, không lấy mục của đội khai thác)');
  const only = K.theoDoiTuong(L, 'doiXe', 'B'); assert.ok(only.every(x => x.doiTuong.loai === 'lo') && only.length === 1, 'đội xe B: chỉ mục của cả lô (không lấy mục của đội xe A)');
  assert.deepStrictEqual(K.tomTat(null), {chan: 0, doi: 0, tong: 0, theoNhom: {}, theoDoiTuong: {lo: 0, doi: 0, doiXe: 0, dong: 0}});
});

test('mã nhóm cố định: mọi nhóm do gate, exportCheck, nhaplieu, cheolo, giayto, sovb sinh ra đều được khai trong K.NHOM kèm biểu mẫu (rỗng nếu chỉ để đối chiếu)', () => {
  const fs = require('fs'), path = require('path'), root = path.join(__dirname, '..');
  const files = ['src/nhaplieu.js', 'src/cheolo.js', 'src/giayto.js', 'src/sovb.js', 'src/vieccanlam.js', 'ui/app/04-kiem-tra-du-lieu-nhieu-doi.js', ...require('./_ui').tepUi('10').map(f => 'ui/app/' + f)];
  const found = new Set();
  files.forEach(f => {
    const t = fs.readFileSync(path.join(root, f), 'utf8');
    for (const m of t.matchAll(/\badd\((?:'(?:chan|doi)'|kind|x\.kind|k)\s*,\s*'([^']+)'/g)) found.add(m[1]);
    for (const m of t.matchAll(/\bnhom:\s*'([^']+)'/g)) found.add(m[1]);
  });
  assert.ok(found.size >= 20, 'quét được các nhóm: ' + [...found].join(' | '));
  const thieu = [...found].filter(n => !K.maNhom(n));
  assert.deepStrictEqual(thieu, [], 'nhóm chưa khai mã và biểu mẫu trong src/kiemtra.js (NHOM): ' + thieu.join(' | '));
  Object.entries(K.NHOM).forEach(([ma, v]) => { assert.ok(v.ten && Array.isArray(v.bieuMau), ma); assert.strictEqual(K.maNhom(v.ten), ma, 'tên nhóm không trùng nhau: ' + ma); assert.ok(/^[a-z0-9-]+$/.test(ma), 'mã nhóm ổn định, không dấu: ' + ma); });
  assert.strictEqual(K.muc({ma: 'doi-xe', text: 'x', kind: 'chan'}).nhom, 'Đội xe', 'khai theo mã: tên hiển thị suy ra từ mã');
  assert.strictEqual(K.muc({nhom: 'Đội xe', text: 'x', kind: 'chan'}).ma, 'doi-xe', 'khai theo tên: mã suy ra từ tên');
});
test('chanCho: lỗi của đội 2 không chặn biểu mẫu của đội 1; lỗi cả lô và lỗi một dòng chặn mọi đội; lỗi đội xe không chặn đội khai thác', () => {
  const L = [K.muc({kind: 'chan', nhom: 'Hình thức, đơn giá', text: 'Đội “Hai”: thiếu đơn giá', doiTuong: {loai: 'doi', ten: 'Hai'}}), K.muc({kind: 'chan', nhom: 'Giấy tờ xe hết hạn lúc chạy phiếu', text: 'x', doiTuong: {loai: 'doiXe', ten: 'Xe B'}})];
  const d1 = {loai: 'doi', ten: 'Một'}, d2 = {loai: 'doi', ten: 'Hai'}, x1 = {loai: 'doiXe', ten: 'Xe A'}, x2 = {loai: 'doiXe', ten: 'Xe B'};
  assert.strictEqual(K.chanCho(L, '01', d1).length, 0, 'đội Một: BM-01 không bị chặn'); assert.strictEqual(K.chanCho(L, '01', d2).length, 1, 'đội Hai: BM-01 bị chặn');
  assert.strictEqual(K.chanCho(L, '08', d1).length, 0); assert.strictEqual(K.chanCho(L, '08', d2).length, 1);
  const Lx = L.slice(1);   // chỉ mục của đội xe B
  assert.strictEqual(K.chanCho(Lx, '09', x1).length, 0, 'đội xe A: BM-09 không bị chặn'); assert.strictEqual(K.chanCho(Lx, '09', x2).length, 1, 'đội xe B: BM-09 bị chặn');
  assert.strictEqual(K.chanCho(L, '09', x1).length, 0, 'lỗi đơn giá của đội khai thác không chặn biểu mẫu vận chuyển');
  const ld = [K.muc({kind: 'chan', nhom: 'Ngày nhập sai', text: 'Đội “Hai”: ngày sai', doiTuong: {loai: 'doi', ten: 'Hai'}})];
  assert.strictEqual(K.chanCho(ld, '04', x1).length, 0, 'mục của một đội khai thác (dù nhóm chặn mọi biểu mẫu) không chặn biểu mẫu vận chuyển');
  assert.strictEqual(K.chanCho(ld, '08', d1).length, 0); assert.strictEqual(K.chanCho(ld, '08', d2).length, 1); assert.strictEqual(K.chanCho(ld, '02', null).length, 1, 'biểu mẫu một file cho cả lô (BM-02): mục của đội nào cũng chặn');
  assert.strictEqual(K.chanCho(Lx, '04', x2).length, 0, 'giấy tờ hết hạn chỉ chặn BM-09, BM-10, không chặn hợp đồng vận chuyển BM-04');
  assert.strictEqual(K.chanCho(L, '01', null).length, 1, 'không nêu đối tượng: cả lô, thấy mọi mục');
  const lo = [K.muc({kind: 'chan', nhom: 'Thông tin rừng', text: 'thiếu diện tích'}), K.muc({kind: 'chan', nhom: 'Nhân công', text: 'Dòng 3: thiếu CCCD', ref: 'Dòng 3'})];
  [d1, d2, x1].forEach(p => assert.strictEqual(K.chanCho(lo, '01', p).length, 2, 'mục cả lô và mục một dòng chặn mọi đối tượng'));
  assert.strictEqual(K.chanCho(lo, '04', x1).length, 1, 'mục cả lô chặn mọi đội xe; mục nhân công không chặn BM-04');
  assert.deepStrictEqual(K.chanCho(Lx, '09', x2).map(x => x.ma), ['giay-to-xe-het-han']);
});
test('biểu mẫu bị chặn theo nhóm: nhân công không chặn hợp đồng vận chuyển, đội xe không chặn BM-01, phiếu cân chéo lô chặn 08, 09, 10, 14', () => {
  assert.ok(!K.NHOM['nhan-cong'].bieuMau.includes('04') && !K.NHOM['nhan-cong'].bieuMau.includes('09'));
  assert.ok(!K.NHOM['doi-xe'].bieuMau.includes('01'));
  assert.deepStrictEqual(K.NHOM['cheo-pc-trung'].bieuMau, ['08', '09', '10', '14']);
  assert.deepStrictEqual(K.bieuMauCuaNhom('cheo-pc-trung'), ['08', '09', '10', '14'], 'khai theo mã');
});
