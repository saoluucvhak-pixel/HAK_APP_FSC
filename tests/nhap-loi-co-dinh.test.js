'use strict';
/* Lỗi tìm ra bởi test mô hình (hạt 20276362): áp một hợp đồng có ánh xạ biển số cho hai lô A, B; lưu A rồi bỏ (hoặc xóa) B.
 * Ánh xạ phải đi cùng lô A đã lưu (giá trị mới được ghi); trước đây aliasHoan hoàn ánh xạ về giá trị cũ dù A đã lưu, nên ghi theo thứ tự "bỏ B rồi lưu A" khác "lưu A rồi bỏ B". */
const test = require('node:test'), assert = require('node:assert/strict');
const Nhap = require('../src/nhap.js'), Delta = require('../src/delta.js');
const clone = x => JSON.parse(JSON.stringify(x));
function dung() {
  const db = {rs: {o1: {id: 'o1', ten: 'Chủ giả lập', forests: {A: {id: 'A', info: {maRung: 'RA'}, n: 1}, B: {id: 'B', info: {maRung: 'RB'}, n: 1}}}}, bienAlias: {x: 'CU'}};
  const st = Nhap.tao(Delta.snapshot(db));
  // áp hợp đồng: sửa cả hai lô và đổi ánh xạ x
  ['A', 'B'].forEach(id => { db.rs.o1.forests[id].n++; st.loDirty.add(id); });
  st.aliasNhap.set('x', {had: true, old: 'CU', lots: new Set(['A', 'B'])}); db.bienAlias.x = 'MOI';
  return {db, st};
}
function luu(W, fid) { const sN = Nhap.chup(W.st); Nhap.chuChot(W.st, 'o1'); W.st.loDirty.delete(fid); const out = clone(Nhap.dbGhi(W.db, W.st)); W.st.snap = Delta.snapshot(out); Nhap.chot(W.db, W.st); return out; }
test('lưu lô A rồi bỏ lô B: ánh xạ đi cùng lô A đã lưu (giá trị mới)', () => {
  const W = dung(); luu(W, 'A'); Nhap.veBanDaLuu(W.db, W.st, 'B');
  assert.equal(W.db.bienAlias.x, 'MOI', 'ánh xạ không bị hoàn về giá trị cũ khi lô A đã lưu');
  assert.equal(W.st.aliasNhap.size, 0, 'sổ ánh xạ được chốt');
  assert.equal(Nhap.dbGhi(W.db, W.st).bienAlias.x, 'MOI', 'lần ghi kế tiếp mang ánh xạ mới xuống đĩa');
});
test('bỏ lô B rồi lưu lô A: cùng kết quả (không phụ thuộc thứ tự)', () => {
  const W = dung(); Nhap.veBanDaLuu(W.db, W.st, 'B'); const out = luu(W, 'A');
  assert.equal(out.bienAlias.x, 'MOI');
});
test('bỏ cả hai lô: ánh xạ hoàn về giá trị cũ', () => {
  const W = dung(); Nhap.veBanDaLuu(W.db, W.st, 'A'); Nhap.veBanDaLuu(W.db, W.st, 'B');
  assert.equal(W.db.bienAlias.x, 'CU'); assert.equal(W.st.aliasNhap.size, 0);
});

/* Lỗi 3 (hạt 20403066): chủ rừng mới có hai lô A, B nháp; lưu A (chủ rừng đã xuống đĩa), xóa A (lô đã lưu), rồi bỏ B. Sổ chủ rừng vẫn ghi "mới"
 * nên veBanDaLuu xóa chủ rừng khỏi bộ nhớ dù nó đã nằm trong bản đã lưu: lần ghi sau làm mất chủ rừng đã lưu. */
test('chủ rừng đã lưu (cùng lô A) không bị xóa khi bỏ lô B nháp cuối cùng sau khi lô A đã bị xóa', () => {
  const db = {rs: {}, bienAlias: {}}, st = Nhap.tao(Delta.snapshot(db));
  db.rs.o9 = {id: 'o9', ten: 'Chủ mới giả lập', forests: {A: {id: 'A', info: {maRung: 'RA'}, n: 0}, B: {id: 'B', info: {maRung: 'RB'}, n: 0}}};
  st.chuNhap.set('o9', {moi: true}); ['A', 'B'].forEach(id => { st.loDirty.add(id); st.loMoi.add(id); });
  // lưu A
  Nhap.chuChot(st, 'o9'); st.loDirty.delete('A'); let out = clone(Nhap.dbGhi(db, st)); st.snap = Delta.snapshot(out); Nhap.chot(db, st);
  assert.ok(out.rs.o9 && out.rs.o9.forests.A && !out.rs.o9.forests.B, 'chủ rừng và lô A đã xuống đĩa, lô B nháp thì chưa');
  // xóa lô A đã lưu (delForest) rồi ghi
  st.loDirty.delete('A'); st.loMoi.delete('A'); Nhap.aliasHoan(db, st, 'A'); delete db.rs.o9.forests.A; out = clone(Nhap.dbGhi(db, st)); st.snap = Delta.snapshot(out); Nhap.chot(db, st);
  assert.ok(out.rs.o9, 'chủ rừng (không còn lô đã lưu) vẫn nằm trong bản đã lưu');
  // bỏ lô B
  Nhap.veBanDaLuu(db, st, 'B');
  assert.ok(db.rs.o9, 'chủ rừng đã lưu không bị xóa khỏi bộ nhớ');
  assert.ok(Nhap.dbGhi(db, st).rs.o9, 'lần ghi kế tiếp vẫn mang chủ rừng đã lưu');
});
test('chủ rừng mới chưa từng lưu: bỏ lô nháp cuối cùng thì bỏ cả chủ rừng', () => {
  const db = {rs: {}, bienAlias: {}}, st = Nhap.tao(Delta.snapshot(db));
  db.rs.o8 = {id: 'o8', ten: 'Chủ mới giả lập', forests: {A: {id: 'A', info: {maRung: 'RA'}, n: 0}}}; st.chuNhap.set('o8', {moi: true}); st.loDirty.add('A'); st.loMoi.add('A');
  Nhap.veBanDaLuu(db, st, 'A'); assert.equal(db.rs.o8, undefined);
});

/* ===== Điểm bàn giao nêu chưa có test tái hiện: race lưu hẹn giờ × lưu tay (hai lần lưu xen kẽ, có chèn lỗi) ===== */
function dungMoi() {
  const db = {rs: {}, bienAlias: {k: 'CU'}}, st = Nhap.tao(Delta.snapshot(db));
  db.rs.O = {id: 'O', ten: 'Chủ mới giả lập', forests: {A: {id: 'A', info: {maRung: 'RA'}, n: 0}}};
  st.chuNhap.set('O', {moi: true}); st.loDirty.add('A'); st.loMoi.add('A');
  st.aliasNhap.set('k', {had: true, old: 'CU', lots: new Set(['A'])}); db.bienAlias.k = 'MOI';
  return {db, st};
}
const hoanTat = (W, out) => { W.st.snap = Delta.snapshot(out); Nhap.chot(W.db, W.st); };
test('race: lưu hẹn giờ (đang bay) xong GIỮA lúc bấm lưu tay; lần lưu tay LỖI thì nháp được hoàn đủ, không mất, không rò xuống đĩa', () => {
  const W = dungMoi();
  const w1 = clone(Nhap.dbGhi(W.db, W.st));                       // lần lưu hẹn giờ chụp trước (bản nháp chưa lưu bị bỏ ra)
  assert.equal(w1.rs.O, undefined); assert.equal(w1.bienAlias.k, 'CU');
  const sNhap = Nhap.chup(W.st); Nhap.chuChot(W.st, 'O'); const hadLo = W.st.loDirty.delete('A');   // bấm "Lưu dữ liệu vào lô" khi lần lưu 1 còn đang bay
  hoanTat(W, w1);                                                 // lần lưu 1 xong: chốt sổ khi lô A tạm không còn trong loDirty
  assert.equal(W.st.chuNhap.size + W.st.aliasNhap.size + W.st.loMoi.size, 0, 'sổ đã bị chốt trong lúc lần lưu tay chưa ghi');
  // lần lưu tay LỖI: hoàn đúng phần đã bỏ
  if (hadLo) W.st.loDirty.add('A'); Nhap.khoiPhuc(W.st, sNhap);
  assert.ok(W.st.loDirty.has('A') && W.st.loMoi.has('A') && W.st.chuNhap.get('O') && W.st.aliasNhap.has('k'), 'nháp hoàn đủ: lô, lô mới, chủ rừng mới, ánh xạ');
  const w3 = Nhap.dbGhi(W.db, W.st);
  assert.equal(w3.rs.O, undefined, 'chủ rừng mới vẫn chưa xuống đĩa'); assert.equal(w3.bienAlias.k, 'CU', 'ánh xạ vẫn chưa xuống đĩa');
  assert.ok(W.db.rs.O && W.db.rs.O.forests.A, 'bộ nhớ còn đủ bản nháp'); assert.equal(W.db.bienAlias.k, 'MOI');
});
test('race: lưu hẹn giờ xong giữa lúc bấm lưu tay; lần lưu tay THÀNH CÔNG thì chủ rừng, lô, ánh xạ xuống đĩa đủ', () => {
  const W = dungMoi();
  const w1 = clone(Nhap.dbGhi(W.db, W.st));
  Nhap.chuChot(W.st, 'O'); W.st.loDirty.delete('A'); hoanTat(W, w1);
  const w2 = clone(Nhap.dbGhi(W.db, W.st)); hoanTat(W, w2);
  assert.ok(w2.rs.O && w2.rs.O.forests.A, 'chủ rừng và lô A xuống đĩa'); assert.equal(w2.bienAlias.k, 'MOI');
});
test('lưu lỗi hai lần liên tiếp rồi thành công: mỗi lần lỗi hoàn đủ, lần thành công ghi đủ một lần', () => {
  const W = dungMoi();
  for (let i = 0; i < 2; i++) { const sN = Nhap.chup(W.st); Nhap.chuChot(W.st, 'O'); const had = W.st.loDirty.delete('A'); if (had) W.st.loDirty.add('A'); Nhap.khoiPhuc(W.st, sN); }
  assert.ok(W.st.chuNhap.get('O') && W.st.aliasNhap.has('k') && W.st.loMoi.has('A'));
  Nhap.chuChot(W.st, 'O'); W.st.loDirty.delete('A'); const out = clone(Nhap.dbGhi(W.db, W.st)); hoanTat(W, out);
  assert.ok(out.rs.O && out.rs.O.forests.A && out.bienAlias.k === 'MOI');
});
/* nhánh localStorage (không có tiến trình chính): persist ghi W = dbGhi(), chụp sn = snapshot(W), rồi savedSnap = sn và chốt sổ. Cùng lõi thuần với đường có tiến trình chính. */
test('nhánh localStorage: ghi W, chụp rồi chốt sổ: sau lần ghi thành công lô đã lưu không còn nháp', () => {
  const W = dungMoi(); Nhap.chuChot(W.st, 'O'); W.st.loDirty.delete('A');
  const ws = clone(Nhap.dbGhi(W.db, W.st)), sn = Delta.snapshot(ws); W.st.snap = sn; Nhap.chot(W.db, W.st);
  assert.ok(ws.rs.O); assert.equal(W.st.chuNhap.size + W.st.aliasNhap.size + W.st.loMoi.size, 0);
  assert.ok(sn.owners.has('O') && sn.forests.has('A'), 'ảnh chụp bản đã lưu mang chủ rừng và lô');
});
test('nhánh localStorage: không chụp được bản đã lưu (snap null) mà còn nháp: dbGhi trả nguyên db nên giao diện phải chặn ghi (không rò nháp qua đường này)', () => {
  const W = dungMoi(); W.st.snap = null;
  assert.equal(Nhap.dbGhi(W.db, W.st), W.db, 'khi chưa có ảnh chụp, lõi trả nguyên db: người gọi bắt buộc không ghi khi còn nháp (02-luu-tru-trang-thai.js persist đã chặn: "Chưa ghi: không chụp được bản đã lưu")');
});

/* Lỗi 2 (hạt 20323876): đóng đột ngột sau khi một lô liên quan đã lưu. Bản tạm chỉ nhớ các lô còn nháp nên mất thông tin "đã có lô được lưu":
 * bỏ lô cuối cùng sau khi mở lại hoàn ánh xạ về giá trị cũ dù lô đã lưu dựa vào giá trị mới. Cờ coLuu đi theo bản tạm. */
test('đóng đột ngột sau khi lô A đã lưu: mở lại rồi bỏ lô B, ánh xạ giữ giá trị mới (không hoàn nhầm)', () => {
  const W = dung(); luu(W, 'A');                                       // A đã lưu (ánh xạ chờ lô B), đĩa giữ ánh xạ cũ
  const ks = ['o1|B'], tam = JSON.parse(JSON.stringify(Nhap.tamChup(W.db, W.st, ks)));
  assert.equal(tam.alias.x.coLuu, true, 'bản tạm ghi nhận đã có lô liên quan được lưu');
  const dia = clone(Nhap.dbGhi(W.db, W.st)); assert.equal(dia.bienAlias.x, 'CU', 'trên đĩa ánh xạ vẫn là giá trị cũ vì lô B còn nháp');
  const V = {db: clone(dia), st: null}; V.st = Nhap.tao(Delta.snapshot(V.db));       // mở lại từ đĩa
  Object.entries(tam.lots).forEach(([k, f]) => Nhap.tamPhucHoiLo(V.db, V.st, k, f, tam.chu[k.split('|')[0]], new Set(tam.moi)));
  Nhap.tamPhucHoiAlias(V.db, V.st, tam.alias);
  assert.equal(V.db.bienAlias.x, 'MOI'); assert.ok(V.st.aliasNhap.get('x').coLuu);
  Nhap.veBanDaLuu(V.db, V.st, 'B');
  assert.equal(V.db.bienAlias.x, 'MOI', 'ánh xạ không bị hoàn về CU vì lô A đã lưu dựa vào giá trị mới');
  assert.equal(V.st.canGhi, true, 'phải persist để ánh xạ xuống đĩa');
  assert.equal(Nhap.dbGhi(V.db, V.st).bienAlias.x, 'MOI');
});
test('bản tạm cũ (không có coLuu) vẫn khôi phục như trước', () => {
  const V = {db: {rs: {o1: {id: 'o1', forests: {B: {id: 'B', n: 2}}}}, bienAlias: {}}}; V.st = Nhap.tao(Delta.snapshot(V.db));
  Nhap.tamPhucHoiLo(V.db, V.st, 'o1|B', {id: 'B', n: 3}, undefined, new Set());
  Nhap.tamPhucHoiAlias(V.db, V.st, {x: {v: 'MOI', had: true, old: 'CU', lots: ['B']}});
  assert.equal(V.db.bienAlias.x, 'MOI'); assert.equal(V.st.aliasNhap.get('x').coLuu, undefined);
  Nhap.veBanDaLuu(V.db, V.st, 'B'); assert.equal(V.db.bienAlias.x, 'CU', 'không có lô nào đã lưu: hoàn về giá trị cũ');
});
