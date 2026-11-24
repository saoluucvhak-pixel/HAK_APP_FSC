'use strict';
/* PR D — kiểm kỹ các điểm còn lại của lần soát độc lập (F2, F5, F6, F8). Dữ liệu giả lập, hàm thật của src/nhap.js, src/delta.js, src/stage.js.
 *  F2  áp từ Sheets lần hai đặt giá trị khác cho cùng ánh xạ biển số: GIỮ giá trị lần hai (CHỦ quyết 24/11/2026)
 *  F5  bản nháp dòng (nhân công, xe, phiếu cân) đi qua bản tạm (đóng đột ngột) rồi mở lại: lưu ra đúng như bản gốc, số mã dòng không trùng
 *  F6  I6: dữ liệu lô cũ chưa dùng nháp: JSON, ảnh chụp và băm ghi xuống đĩa y hệt (không đổi một byte)
 *  F8  lô tạo thẳng dưới chủ rừng mới còn ở dạng nháp: ghi nhận hành vi (chủ rừng đi cùng lô đầu tiên được lưu, đúng I1) */
const test = require('node:test'), assert = require('node:assert/strict'), crypto = require('crypto');
const Nhap = require('../src/nhap.js'), Delta = require('../src/delta.js'), Stage = require('../src/stage.js');
const clone = x => JSON.parse(JSON.stringify(x));
const sha = s => crypto.createHash('sha256').update(s).digest('hex');
const mo = () => ({rs: {
  o1: {id: 'o1', ten: 'Chủ 1 giả lập', forests: {f1: {id: 'f1', info: {maRung: 'R1'}, n: 1}, f2: {id: 'f2', info: {maRung: 'R2'}, n: 2}}},
  o2: {id: 'o2', ten: 'Chủ 2 giả lập', forests: {f3: {id: 'f3', info: {maRung: 'R3'}, n: 3}}}}, bienAlias: {a1: 'X1'}});

test('F2: áp lần hai đặt giá trị khác cho ánh xạ đã có lô được lưu → giữ giá trị lần hai, và đi xuống đĩa', () => {
  const db = mo(), st = Nhap.tao(Delta.snapshot(db));
  /* lần áp thứ nhất: ánh xạ a1 = V1 cho hai lô f1, f2 */
  db.bienAlias.a1 = 'V1'; st.loDirty.add('f1'); st.loDirty.add('f2'); st.aliasNhap.set('a1', {had: true, old: 'X1', lots: new Set(['f1', 'f2'])});
  /* lưu f1 → ánh xạ đã có lô được lưu (coLuu), còn f2 */
  st.loDirty.delete('f1'); let ra = clone(Nhap.dbGhi(db, st)); st.snap = Delta.snapshot(ra); Nhap.chot(db, st);
  assert.equal(st.aliasNhap.get('a1').coLuu, true); assert.deepEqual([...st.aliasNhap.get('a1').lots], ['f2']);
  /* lần áp thứ hai (như gsApply): cùng khóa, giá trị khác, cho lô f3 */
  const ex = st.aliasNhap.get('a1'); db.bienAlias.a1 = 'V2'; st.loDirty.add('f3'); ex.lots.add('f3');
  /* bỏ hết f2 và f3: không còn lô nháp liên quan → vì đã có lô được lưu nên ánh xạ ở lại, GIÁ TRỊ LẦN HAI */
  Nhap.veBanDaLuu(db, st, 'f2'); Nhap.veBanDaLuu(db, st, 'f3');
  assert.equal(db.bienAlias.a1, 'V2', 'giữ giá trị lần hai trong bộ nhớ'); assert.equal(st.aliasNhap.has('a1'), false); assert.equal(st.canGhi, true, 'phải xuống đĩa');
  assert.equal(Nhap.dbGhi(db, st).bienAlias.a1, 'V2', 'và ghi xuống đĩa giá trị lần hai');
});

test('F6/I6: dữ liệu lô cũ chưa dùng nháp — dbGhi trả đúng đối tượng cũ; JSON, ảnh chụp và băm không đổi một byte', () => {
  const db = mo(), st = Nhap.tao(Delta.snapshot(db)), truoc = JSON.stringify(db), bamTruoc = sha(truoc), snapTruoc = [...Delta.snapshot(db).forests].map(([k, v]) => k + v.json).join('|');
  assert.equal(Nhap.dbGhi(db, st), db, 'không có nháp: ghi nguyên db (cùng đối tượng)');
  assert.equal(JSON.stringify(Nhap.dbGhi(db, st)), truoc); assert.equal(sha(JSON.stringify(Nhap.dbGhi(db, st))), bamTruoc);
  assert.equal([...Delta.snapshot(Nhap.dbGhi(db, st)).forests].map(([k, v]) => k + v.json).join('|'), snapTruoc, 'ảnh chụp từng lô y hệt');
  /* có nháp ở lô f1 (và chủ rừng mới): các lô KHÁC (f2, f3) vẫn y hệt từng byte trong nội dung sẽ ghi */
  db.rs.o1.forests.f1.n = 99; st.loDirty.add('f1'); st.snap = Delta.snapshot(JSON.parse(truoc));
  db.rs.oN = {id: 'oN', ten: 'Mới', forests: {fN: {id: 'fN', n: 0}}}; st.chuNhap.set('oN', {moi: true}); st.loDirty.add('fN'); st.loMoi.add('fN');
  const ghi = Nhap.dbGhi(db, st), sn = Delta.snapshot(ghi), goc = Delta.snapshot(JSON.parse(truoc));
  ['f2', 'f3'].forEach(f => assert.equal(sn.forests.get(f).json, goc.forests.get(f).json, 'lô ' + f + ' không đổi một byte'));
  assert.equal(sn.forests.get('f1').json, goc.forests.get('f1').json, 'lô nháp f1 ghi theo bản đã lưu'); assert.equal(sn.forests.has('fN'), false, 'lô mới chưa lưu không xuống đĩa');
  /* đi qua bản tạm (đóng đột ngột) rồi mở lại: lô cũ không bị chạm */
  const tam = JSON.stringify(Nhap.tamChup(db, st, ['o1|f1', 'oN|fN'])), d = JSON.parse(tam), db2 = clone(JSON.parse(truoc)), st2 = Nhap.tao(Delta.snapshot(db2));
  Object.entries(d.lots).forEach(([k, f]) => Nhap.tamPhucHoiLo(db2, st2, k, f, d.chu[k.split('|')[0]], new Set(d.moi))); Nhap.tamPhucHoiAlias(db2, st2, d.alias);
  ['f2', 'f3'].forEach(f => assert.equal(JSON.stringify(db2.rs[f === 'f3' ? 'o2' : 'o1'].forests[f]), JSON.stringify(JSON.parse(truoc).rs[f === 'f3' ? 'o2' : 'o1'].forests[f]), 'sau khôi phục lô ' + f + ' y hệt'));
});

test('F8: lô tạo THẲNG dưới chủ rừng mới còn nháp — chủ rừng đi cùng lô đầu tiên được lưu (I1); lô nháp thì không xuống đĩa', () => {
  const db = mo(), st = Nhap.tao(Delta.snapshot(db));
  /* gsApply tạo chủ rừng mới oN cùng lô nháp L (chưa lưu) */
  db.rs.oN = {id: 'oN', ten: 'Chủ mới từ Sheets giả lập', forests: {L: {id: 'L', info: {maRung: 'RL'}, n: 1}}}; st.chuNhap.set('oN', {moi: true}); st.loDirty.add('L'); st.loMoi.add('L');
  let ghi = Nhap.dbGhi(db, st); assert.equal(ghi.rs.oN, undefined, 'chưa lô nào được lưu: chủ rừng mới không xuống đĩa');
  /* người dùng tạo thẳng một lô M dưới chủ rừng này (không qua nháp) */
  db.rs.oN.forests.M = {id: 'M', info: {maRung: 'RM'}, n: 0};
  ghi = Nhap.dbGhi(db, st);
  assert.ok(ghi.rs.oN, 'lô M là lô đầu tiên được lưu của chủ rừng mới → chủ rừng đi cùng (đúng I1)');
  assert.deepEqual(Object.keys(ghi.rs.oN.forests), ['M'], 'chỉ lô M xuống đĩa; lô nháp L vẫn ở ngoài');
  assert.equal(ghi.rs.oN.ten, 'Chủ mới từ Sheets giả lập', 'thông tin chủ rừng (đang là nháp) đi cùng lô M — ghi nhận để CHỦ biết');
  /* sau khi ghi: chủ rừng còn trong sổ vì L còn nháp; bỏ L thì chủ rừng ở lại cùng lô M, không bị xóa */
  const ra = clone(ghi); st.snap = Delta.snapshot(ra); Nhap.chot(db, st); assert.equal(st.chuNhap.has('oN'), true);
  Nhap.veBanDaLuu(db, st, 'L'); assert.ok(db.rs.oN && db.rs.oN.forests.M, 'bỏ L: chủ rừng và lô M còn nguyên'); assert.equal(db.rs.oN.forests.L, undefined); assert.equal(st.chuNhap.has('oN'), false);
  assert.deepEqual(Object.keys(Nhap.dbGhi(db, st).rs.oN.forests), ['M']);
});
test('F8 (đối chứng): chủ rừng ĐÃ CÓ đang sửa nháp, tạo thẳng lô mới → chủ rừng ghi theo bản đã lưu (không kéo bản sửa nháp xuống đĩa)', () => {
  const db = mo(), st = Nhap.tao(Delta.snapshot(db));
  db.rs.o1.ten = 'Sửa nháp'; st.chuNhap.set('o1', {moi: false}); db.rs.o1.forests.f1.n = 5; st.loDirty.add('f1');
  db.rs.o1.forests.M = {id: 'M', info: {maRung: 'RM'}, n: 0};
  const ghi = Nhap.dbGhi(db, st); assert.equal(ghi.rs.o1.ten, 'Chủ 1 giả lập', 'bản sửa nháp của chủ rừng không xuống đĩa'); assert.ok(ghi.rs.o1.forests.M, 'lô M thẳng thì xuống đĩa'); assert.equal(ghi.rs.o1.forests.f1.n, 1, 'lô nháp f1 giữ bản đã lưu');
});

test('F5: bản nháp dòng (stages) qua bản tạm: lưu ra đúng như bản gốc, mã dòng mới không trùng', () => {
  const saved = {nc: [{ten: 'TRẦN TỔ TRƯỞNG', cccd: '049000000001', chucDanh: 'Tổ trưởng'}, {ten: 'LÊ CÔNG NHÂN', cccd: '049000000002', chucDanh: 'Công nhân'}], dx: [{bienSo: '92C-123.45', chuXe: 'A'}],
    pc: [{soPhieu: 'P1', bienSo: '92C-12345', ngay: '05/10/2026', kl: 10.5}, {soPhieu: 'P2', bienSo: '92C-12345', ngay: '06/10/2026', kl: 5.25}]};
  const st = Stage.create(clone(saved));
  const idMoi = Stage.addRow(st, 'nc', {ten: 'PHẠM CƯA GIẢ LẬP', cccd: '049000000003'});
  Stage.updateRow(st, 'nc', st.cur.nc[1]._id, Object.assign({}, st.cur.nc[1], {chucDanh: 'Công nhân cưa'}));
  Stage.removeRow(st, 'pc', st.cur.pc[0]._id);
  Stage.merge(st, 'pc', [{soPhieu: 'P9', bienSo: '92C-67890', ngay: '08/10/2026', kl: 7, _ngay2Suy: true}], {source: 'Google Sheets'});
  const gon = s => Object.assign({}, s, Array.isArray(s.nhatKy) ? {nhatKy: s.nhatKy.map(({truoc: _t, ...r}) => r)} : {});   // y hệt nhapTamStageGon (ui/app/20-nhap-tu-danh-muc.js)
  const khoiPhuc = JSON.parse(JSON.stringify(gon(st)));
  assert.equal(Stage.dirty(khoiPhuc), Stage.dirty(st), 'còn dirty như trước'); assert.deepEqual(Stage.dirtyKinds(khoiPhuc), Stage.dirtyKinds(st));
  const a = Stage.commit(st), b = Stage.commit(khoiPhuc);
  assert.deepEqual(b.lists, a.lists, 'lưu từ bản tạm cho đúng kết quả như bản gốc (nhân công, xe, phiếu cân)');
  assert.equal(b.lists.nc.length, 3); assert.equal(b.lists.pc.length, 2, 'bỏ P1, thêm P9 → 2 phiếu');
  /* thao tác tiếp trên bản đã khôi phục: mã dòng mới không trùng mã nào đã có */
  const them = Stage.addRow(khoiPhuc, 'nc', {ten: 'THÊM SAU KHÔI PHỤC', cccd: '049000000004'});
  const tatCa = ['nc', 'dx', 'pc'].flatMap(k => khoiPhuc.cur[k].map(r => r._id));
  assert.equal(new Set(tatCa).size, tatCa.length, 'mã dòng không trùng'); assert.notEqual(them, idMoi);
});

test('F4: mọi tài liệu mà chú thích của lõi bản nháp và test của nó trích dẫn đều có trong repo', () => {
  const fs = require('fs'), path = require('path'), root = path.join(__dirname, '..');
  const nguon = ['src/nhap.js', 'tests/nhap-mo-hinh.test.js', 'tests/nhap-loi-co-dinh.test.js', 'tests/nhap-kiem-ky.test.js', 'ui/app/02-luu-tru-trang-thai.js', 'ui/app/20-nhap-tu-danh-muc.js'];
  const ref = new Set(); nguon.forEach(f => { (fs.readFileSync(path.join(root, f), 'utf8').match(/docs\/[A-Za-z0-9_.-]+\.md/g) || []).forEach(x => ref.add(x)); });
  assert.ok(ref.size > 0, 'có ít nhất một tham chiếu tài liệu để kiểm');
  ref.forEach(x => assert.ok(fs.existsSync(path.join(root, x)), 'tài liệu được trích dẫn không có trong repo: ' + x));
});
