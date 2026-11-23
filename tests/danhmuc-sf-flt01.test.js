'use strict';
/* FLT-01: Danh mục đối tượng / xe chỉ còn MỘT bộ lọc (Smart Filter). Nhóm và chữ tìm cho kết quả GIỐNG HỆT bộ lọc cũ (HAKDoiTuong.loc, ô #xeQ). */
const test = require('node:test'), assert = require('node:assert/strict'), fs = require('fs'), path = require('path'), vm = require('vm');
const DT = require('../src/doituong'), XE = require('../src/xedm'), SFM = require('../ui/vendor/hak-smart-filter/index.js');
const nguon = fs.readFileSync(process.env.HAK_NGUON30 || path.join(__dirname, '..', 'ui', 'app', '30-cai-dat-danh-muc.js'), 'utf8');

const ng = (hoTen, cccd, vaiTro, o) => Object.assign({hoTen, cccd, sdt: '', gplx: '', vaiTro: vaiTro || {}, kyHD: {}}, o || {});
const DM = [
  {id: 'a', ma: 'DT0001', ten: 'LÊ VĂN XE', loai: 'thenhan', kyHD: {}, nguoi: [ng('LÊ VĂN XE', '049085000077', {taiXe: true, chuXe: true}, {gplx: 'GP-777', kyHD: {vanChuyen: true}})]},
  {id: 'b', ma: 'DT0002', ten: 'TỔ CƯA TRẦN SƠN', loai: 'thenhan', kyHD: {}, nguoi: [ng('TRẦN SƠN', '049085000001', {nhanCong: true}), ng('LÊ PHÚ', '049085000002', {nhanCong: true}, {sdt: '0905123456'})]},
  {id: 'c', ma: 'DT0003', ten: 'CÔNG TY TNHH VẬN TẢI A', loai: 'phapnhan', mst: '0401234567', diaChi: 'Đà Nẵng', daiDien: 'NGUYỄN VĂN B', kyHD: {vanChuyen: true}, nguoi: []},
  {id: 'd', ma: 'DT0004', ten: 'ĐỖ THỊ NGỪNG', loai: 'thenhan', ngung: true, kyHD: {}, nguoi: [ng('ĐỖ THỊ NGỪNG', '049085000009', {nhanCong: true})]},
  {id: 'e', ma: 'DT0005', ten: 'CÔNG TY NGỪNG B', loai: 'phapnhan', ngung: true, kyHD: {nhanCong: true}, nguoi: []}
];
const XE_DM = [{id: 'x1', bks: '92C-123.45', loaiXe: 'Xe tải', chuXeId: 'a', taiXeId: ''}, {id: 'x2', bks: '92C-456.78', loaiXe: 'Xe ben', chuXeId: '', taiXeId: ''}];

function nap() {
  const ctx = {document: {addEventListener() {}, getElementById: () => null}, HAKCore: {sf: SFM.core}, HAKDoiTuong: DT, HAKXeDM: XE, db: {dmDoiTuong: DM, dmXe: XE_DM, dmViTri: []},
    trim: v => String(v == null ? '' : v).trim(), esc: v => String(v), HAKViTri: {timId: () => null}, foldVi: v => String(v), console};
  vm.createContext(ctx);
  vm.runInContext(nguon + '\n;this.__x = {dtSfCfg: typeof dtSfCfg === "function" ? dtSfCfg : null, dtGoc: typeof dtGoc === "function" ? dtGoc : null, NHOM_DT};', ctx);
  return ctx.__x;
}
const M = nap();
const moi = (nhom, q) => {
  const f = SFM.createFilter(M.dtSfCfg());
  if (nhom && nhom !== 'tatca') f.setField('nhom', nhom);
  if (q) f.setState(Object.assign({}, f.getState(), {q}));
  return Array.from(f.filter(M.dtGoc(f.getState())).rows.map(o => o.id));
};

test('FLT-01: màn Danh mục không còn ô lọc cũ #dtNhom, #dtQ, #xeQ; Nhóm và ô tìm nằm trong Smart Filter', () => {
  assert.doesNotMatch(nguon, /id="dtNhom"|id="dtQ"|id="xeQ"/);
  const cfg = M.dtSfCfg(); assert.ok(cfg.quickFields.includes('nhom') && cfg.quickFields.includes('q'));
  assert.deepEqual(Array.from(cfg.fields.find(f => f.key === 'nhom').options.map(o => o.value)), ['doitac', 'nhancong', 'taixe', 'chuxe', 'ngung']);
});
test('FLT-01: mỗi nhóm cho đúng tập đối tượng như HAKDoiTuong.loc cũ', () => {
  for (const [k] of M.NHOM_DT) assert.deepEqual(moi(k, ''), DT.loc(DM, k, '').map(o => o.id), 'nhóm ' + k);
  assert.deepEqual(moi('ngung', ''), ['d', 'e']); assert.deepEqual(moi('tatca', ''), ['a', 'b', 'c']);
});
test('FLT-01: chữ tìm (theo từng từ, không dấu, MST/CCCD/SĐT/GPLX) khớp bộ lọc cũ ở mọi nhóm', () => {
  for (const q of ['', 'le van', 'LÊ XE', '0401234567', '049085000002', '0905123456', 'gp-777', 'tran son', 'da nang', 'khongco', 'ngung', 'do thi']) {
    for (const [k] of M.NHOM_DT) assert.deepEqual(moi(k, q), DT.loc(DM, k, q).map(o => o.id), 'nhóm ' + k + ' · q=' + q);
  }
});
test('FLT-01: Danh mục xe tìm theo từng từ (BKS, loại xe, chủ xe) bằng matchQ của Smart Filter, không còn #xeQ', () => {
  const src = nguon.match(/function panelSetXe\(\) \{[\s\S]*?\n\}\n/)[0];
  assert.match(src, /quickFields: \['q', 'hanGt'\]/);
  assert.match(src, /every\(w => h\.includes\(w\)\)/);
});
