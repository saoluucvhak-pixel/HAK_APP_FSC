'use strict';
/* Phiếu #14 (v3.1.0): quyết định số 1 của CHỦ (18/11) — CCCD hợp lệ khi có 9 (CMND) hoặc 12 chữ số, Ở MỌI NƠI. Phiếu #05 làm danh mục đối tượng, chủ rừng, thành viên lô; còn sót:
 *  (1) src/stage.js: khóa nhân công thêm số 0 vào CCCD ngắn hơn 12 số → CMND 9 số "049067005" và CCCD 12 số "000049067005" cùng khóa → gộp nhầm hai người;
 *  (2) src/danhmuc.js (danh mục lao động / xe cũ): đòi 12 số, bỏ người CMND 9 số; (3) src/lookup.js (tra cứu Google Sheets): cờ "không đủ 12 số", nhận dạng truy vấn, ô số Excel;
 *  (4) ô số Excel / normCccd bù 0 cho đủ 12 số. Quy tắc DUY NHẤT ở src/nhaplieu.js: chỉ lấy chữ số, không tự thêm số 0 khi đã 9 hoặc 12 số; ô SỐ Excel mất số 0 đầu: 8 số → 9, 10–11 số → 12. */
const test = require('node:test'), assert = require('node:assert');
const fs = require('fs'), path = require('path');
const NL = require('../src/nhaplieu'), S = require('../src/stage'), DM = require('../src/danhmuc'), L = require('../src/lookup'), DT = require('../src/doituong'), XE = require('../src/xedm');

test('quy tắc chung: chỉ lấy chữ số; 9 hoặc 12 số hợp lệ; ô số Excel mất số 0 đầu được bù đúng (8 → 9, 10–11 → 12)', () => {
  assert.strictEqual(NL.cccdSo('049 067.005-'), '049067005'); assert.strictEqual(NL.cccdSo(null), '');
  assert.ok(NL.cccdHopLe('049067005')); assert.ok(NL.cccdHopLe('049085000001')); assert.ok(!NL.cccdHopLe('0490670051')); assert.ok(!NL.cccdHopLe('04906700')); assert.ok(!NL.cccdHopLe(''));
  assert.strictEqual(NL.cccdTuSo(49067005), '049067005', '8 số → 9 số'); assert.strictEqual(NL.cccdTuSo(123456789), '123456789', '9 số giữ nguyên'); assert.strictEqual(NL.cccdTuSo(4906700512), '004906700512', '10 số → 12 số');
  assert.strictEqual(NL.cccdTuSo(49085000001), '049085000001', '11 số → 12 số');
  assert.strictEqual(NL.cccdTuSo(49085000012345), '49085000012345', 'dài hơn 12 số: giữ nguyên để báo lỗi'); assert.strictEqual(NL.cccdTuSo(1234567), '1234567', 'ngắn hơn 8 số: giữ nguyên');
});
test('(1) bản nháp: CMND 9 số và CCCD 12 số "000049067005" KHÔNG cùng khóa; nạp người thứ hai thêm dòng mới, không đổi tên người thứ nhất', () => {
  assert.notStrictEqual(S.KEY.nc({cccd: '049067005'}), S.KEY.nc({cccd: '000049067005'}));
  const st = S.create({nc: [{ten: 'NGUYỄN A', cccd: '049067005'}], dx: [], pc: []});
  const rep = S.merge(st, 'nc', [{ten: 'TRẦN B', cccd: '000049067005'}], {source: 'Excel'});
  assert.strictEqual(rep.add, 1, 'thêm dòng mới'); assert.strictEqual(st.cur.nc.length, 2); assert.strictEqual(st.cur.nc.find(r => r.cccd === '049067005').ten, 'NGUYỄN A');
  const lai = S.merge(st, 'nc', [{ten: 'NGUYỄN A', cccd: '049 067 005'}], {source: 'Excel'}); assert.strictEqual(lai.add, 0, 'cùng CMND viết có khoảng trắng: cùng người');
});
const ngay = '01/11/2026';
test('(2) danh mục lao động cũ: kiemLaoDong nhận CMND 9 số, báo lỗi "9 hoặc 12 chữ số" cho độ dài khác', () => {
  const ok9 = DM.kiemLaoDong({ngayCapNhat: ngay, cccd: '049067005', ten: 'NGUYỄN A'}), ok12 = DM.kiemLaoDong({ngayCapNhat: ngay, cccd: '049085000001', ten: 'LÊ B'}), xau = DM.kiemLaoDong({ngayCapNhat: ngay, cccd: '0490670051', ten: 'C'});
  assert.ok(!ok9.errs.some(e => /CCCD/.test(e)), ok9.errs.join('; ')); assert.ok(!ok12.errs.some(e => /CCCD/.test(e)));
  assert.ok(xau.errs.some(e => /CCCD phải có 9 hoặc 12 chữ số/.test(e)), xau.errs.join('; '));
});
test('(2) danh mục xe cũ: CCCD tài xế và chủ xe 9 số được nhận', () => {
  const r = DM.kiemXe({ngayCapNhat: ngay, bienSo: '92C-12345', taiXe: 'TÀI XẾ A', cccdTx: '049067005', cccd: '049085000009', chuXe: 'CHỦ XE'}), loi = DM.kiemXe({ngayCapNhat: ngay, bienSo: '92C-12346', taiXe: 'T', cccdTx: '04906700', cccd: '0490850000091', chuXe: 'C'});
  assert.ok(!r.errs.some(e => /CCCD/.test(e)), r.errs.join('; ')); assert.strictEqual(loi.errs.filter(e => /CCCD.*9 hoặc 12 chữ số|9 hoặc 12 chữ số/.test(e)).length, 2, loi.errs.join('; '));
});
test('(2) danh mục cũ: laoDongHieuLuc giữ người CMND 9 số; layLaoDong tìm được; gopNguoi gộp 9 số với 12 số', () => {
  const list = [{ngayCapNhat: ngay, cccd: '049067005', ten: 'NGUYỄN A'}, {ngayCapNhat: ngay, cccd: '049085000001', ten: 'LÊ B'}];
  assert.strictEqual(DM.laoDongHieuLuc(list).length, 2); assert.ok(DM.layLaoDong(list, '049067005'));
  const r = DM.gopNguoi({dmLaoDong: list, dmXeVC: [], dmDoiTac: []}, '049067005', '049085000001'); assert.ok(r.ok, r.error);
  const lech = DM.gopNguoi({dmLaoDong: list, dmXeVC: [], dmDoiTac: []}, '0490670051', '049085000001'); assert.ok(!lech.ok); assert.match(lech.error, /9 hoặc 12 chữ số/);
});
test('(3) tra cứu: dòng HoSoRung có CMND 9 số không còn cờ "CCCD không đủ 12 số"; cờ mới nêu "9 hoặc 12 số" khi sai độ dài', () => {
  const dong = c => ({'Mã KH_CCCD': c, 'HECTA': 2, 'Tình trạng Hợp đồng': 'Đang khai thác'});
  assert.ok(!L.describe('HoSoRung_QC', dong('049067005')).flags.some(f => /CCCD/.test(f)));
  assert.ok(!L.describe('HoSoRung_QC', dong('049085000001')).flags.some(f => /CCCD/.test(f)));
  assert.ok(L.describe('HoSoRung_QC', dong('0490670051')).flags.includes('CCCD không đúng 9 hoặc 12 số'));
});
test('(3) tra cứu: parseQuery tự nhận 9 và 12 số là CCCD; 10–11 số vẫn được bù số 0 đầu; số khác là từ thường', () => {
  const f = q => L.parseQuery(q).fields.filter(x => x.f === 'cccd');
  assert.deepStrictEqual(f('049067005').map(x => x.v), ['049067005']); assert.deepStrictEqual(f('049085000001').map(x => x.v), ['049085000001']);
  assert.deepStrictEqual(f('4906700512').map(x => x.v), ['004906700512']); assert.strictEqual(f('12345678').length, 0);
});
test('(3)(4) ô số Excel: 49067005 → 049067005 (CMND mất số 0 đầu); 9 và 12 số giữ nguyên; 11 số → 12 số', () => {
  assert.strictEqual(L.cellValue({t: 'n', v: 49067005}, false, true), '049067005'); assert.strictEqual(L.cellValue({t: 'n', v: 123456789}, false, true), '123456789');
  assert.strictEqual(L.cellValue({t: 'n', v: 49085000001}, false, true), '049085000001'); assert.strictEqual(L.cellValue({t: 'n', v: 4906700512}, false, true), '004906700512');
});
test('(2) chuyển danh mục cũ sang mới và các nơi dùng danh mục cũ: người CMND 9 số không bị loại', () => {
  const r = DT.tuDanhMucCu({dmLaoDong: [{ngayCapNhat: ngay, cccd: '049067005', ten: 'NGUYỄN A'}], dmXeVC: [], dmDoiTac: []}, [], []);
  assert.strictEqual(r.so.nguoi, 1); assert.ok(DT.timCccd(r.dm, '049067005'));
  const xe = XE.tuDanhMucCu([{ngayCapNhat: ngay, bienSo: '92C-12345', chuXe: 'CHỦ', cccd: '049067005'}], r.dm.concat([]), []); assert.ok(xe.dm.length === 1);
});
test('(4) không còn đoạn bù "padStart(12" ngoài quy tắc chung: stage.js, danhmuc.js, 01-cau-hinh-tien-ich.js dùng HAKNhapLieu', () => {
  const doc = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
  for (const f of ['src/stage.js', 'src/danhmuc.js', 'ui/app/01-cau-hinh-tien-ich.js']) assert.ok(!/padStart\(12/.test(doc(f)), f);
  assert.ok(/cccdTuSo/.test(doc('ui/app/01-cau-hinh-tien-ich.js')) && /cccdSo|HAKNhapLieu/.test(doc('src/stage.js')));
});
