'use strict';
/* TEST MÔ HÌNH NGẪU NHIÊN cho lõi bản nháp (src/nhap.js, PR D bước 1). Sinh chuỗi thao tác ngẫu nhiên (hạt giống cố định, in ra khi đỏ để tái hiện),
 * chạy MÔ HÌNH THAM CHIẾU RẤT ĐƠN GIẢN song song với mã thật và kiểm các bất biến sau MỖI thao tác:
 *   I1  cái ghi xuống đĩa (dbGhi) = bản đã lưu + đúng phần người dùng đã bấm lưu
 *   I2  bỏ thay đổi / xóa đưa phần liên quan về đúng bản đã lưu; bộ nhớ (db) luôn đúng bản nháp người dùng đang thấy
 *   I3  tự lưu tạm rồi mở lại (đóng đột ngột) dựng lại đúng bản nháp, không ghi đè dữ liệu đã lưu
 *   I4  lô / chủ rừng / ánh xạ đã lưu không bao giờ bị dbGhi bỏ ra khỏi bản ghi
 *   I5  lưu lỗi hoàn đúng phần đã bỏ, không mất mục nháp
 *   I7  sổ nháp không mồ côi (loMoi ⊆ loDirty, mọi lô trong sổ còn trong db...)
 * Lớp nối dưới đây lặp lại ĐÚNG thứ tự gọi của giao diện (ui/app/11-d-luu-ban-nhap.js stSave/stDiscard, 14-thao-tac.js delForest/delRs/saveInfo,
 * 17-h-hop-dong-cap-nhat.js gsApply, 20-nhap-tu-danh-muc.js nhapTamGhi/nhapTamKhoiPhuc, 02-luu-tru-trang-thai.js saveOnce): hàm thật là src/nhap.js. */
const test = require('node:test'), assert = require('node:assert/strict');
const Nhap = require('../src/nhap.js'), Delta = require('../src/delta.js');

const SO_CHUOI = +process.env.NHAP_SO_CHUOI || 5000, DO_DAI = [20, 60], HAT_GOC = +process.env.NHAP_HAT || 20260524;
const clone = x => JSON.parse(JSON.stringify(x));
function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

/* ===== thế giới (mã thật) ===== */
function mo() {
  const db = {rs: {
    o1: {id: 'o1', ten: 'Chủ 1', forests: {f1: {id: 'f1', info: {maRung: 'R1'}, n: 1}, f2: {id: 'f2', info: {maRung: 'R2'}, n: 1}}},
    o2: {id: 'o2', ten: 'Chủ 2', forests: {f3: {id: 'f3', info: {maRung: 'R3'}, n: 1}}}
  }, bienAlias: {a1: 'X1'}};
  const st = Nhap.tao(Delta.snapshot(db));
  return {db, st, dia: clone(db), seq: 0};
}
const ghiRa = W => Nhap.dbGhi(W.db, W.st);                      // nội dung sẽ ghi (không sửa gì)
function ghi(W) {                                               // saveOnce thành công
  const out = clone(ghiRa(W)); W.dia = out; W.st.snap = Delta.snapshot(out); Nhap.chot(W.db, W.st);
}
const loCua = (W, fid) => Object.entries(W.db.rs).find(([, o]) => o.forests && o.forests[fid]);

/* ===== mô hình tham chiếu: chỉ "đã lưu" và "nháp" ===== */
function moHinh() {
  const saved = {owners: {o1: {ten: 'Chủ 1'}, o2: {ten: 'Chủ 2'}}, forests: {f1: {oid: 'o1', n: 1}, f2: {oid: 'o1', n: 1}, f3: {oid: 'o2', n: 1}}, alias: {a1: 'X1'}};
  return {saved, draft: clone(saved), dirtyF: new Set(), moiF: new Set(), ownerDirty: new Map(), pend: new Map()};
}
/* ánh xạ đang chờ: lots = lô liên quan chưa quyết; coLuu = đã có ít nhất một lô liên quan được lưu; had/old = giá trị trước */
function chotAlias(M, k) {
  const p = M.pend.get(k); if (!p) return;
  if ([...p.lots].some(id => M.dirtyF.has(id))) return;
  if (p.coLuu) M.saved.alias[k] = M.draft.alias[k]; else { if (p.had) M.draft.alias[k] = p.old; else delete M.draft.alias[k]; }
  M.pend.delete(k);
}
function mhLuu(M, fid) {
  const f = M.draft.forests[fid]; M.saved.forests[fid] = clone(f); M.dirtyF.delete(fid); M.moiF.delete(fid);
  if (M.ownerDirty.has(f.oid)) { M.saved.owners[f.oid] = clone(M.draft.owners[f.oid]); M.ownerDirty.delete(f.oid); }
  else if (!M.saved.owners[f.oid]) M.saved.owners[f.oid] = clone(M.draft.owners[f.oid]);
  M.pend.forEach(p => { if (p.lots.has(fid)) { p.coLuu = true; p.lots.delete(fid); } });   // lô đã lưu: ghi nhớ coLuu, thôi giữ trong danh sách chờ
  [...M.pend.keys()].forEach(k => chotAlias(M, k));
}
function mhBo(M, fid) {
  const f = M.draft.forests[fid];
  if (M.saved.forests[fid]) M.draft.forests[fid] = clone(M.saved.forests[fid]); else delete M.draft.forests[fid];
  M.dirtyF.delete(fid); M.moiF.delete(fid);
  M.pend.forEach(p => p.lots.delete(fid)); [...M.pend.keys()].forEach(k => chotAlias(M, k));
  if (f && M.ownerDirty.has(f.oid) && !Object.entries(M.draft.forests).some(([id, x]) => x.oid === f.oid && M.dirtyF.has(id))) {
    if (!M.saved.owners[f.oid] && !Object.values(M.draft.forests).some(x => x.oid === f.oid)) delete M.draft.owners[f.oid];
    else if (M.saved.owners[f.oid]) M.draft.owners[f.oid] = clone(M.saved.owners[f.oid]);
    M.ownerDirty.delete(f.oid);
  }
}
/* nội dung kỳ vọng trên đĩa nếu ghi ngay bây giờ = bản đã lưu */
const dangDia = M => ({owners: clone(M.saved.owners), forests: clone(M.saved.forests), alias: clone(M.saved.alias)});
function dangRam(db) { const o = {}, f = {}; Object.entries(db.rs).forEach(([oid, ow]) => { o[oid] = {ten: ow.ten}; Object.entries(ow.forests || {}).forEach(([fid, x]) => { f[fid] = {oid, n: x.n}; }); }); return {owners: o, forests: f, alias: clone(db.bienAlias || {})}; }

/* ===== thao tác (mã thật + mô hình) ===== */
function opGop(W, M, R) {
  const kieu = R() < 0.35 ? 'chuMoi' : 'chuCu', oid = kieu === 'chuMoi' ? 'oN' + (++W.seq) : (R() < 0.5 ? 'o1' : 'o2');
  if (!W.db.rs[oid] && kieu === 'chuCu') return false;
  const mois = [], sua = [];
  if (!W.db.rs[oid]) { W.db.rs[oid] = {id: oid, ten: 'Mới ' + oid, forests: {}}; W.st.chuNhap.set(oid, {moi: true}); M.draft.owners[oid] = {ten: 'Mới ' + oid}; M.ownerDirty.set(oid, true); }
  else if (R() < 0.4) { W.db.rs[oid].ten = 'Sửa ' + (++W.seq); if (!W.st.chuNhap.has(oid)) W.st.chuNhap.set(oid, {moi: false}); M.draft.owners[oid].ten = W.db.rs[oid].ten; M.ownerDirty.set(oid, true); }
  const soLo = 1 + Math.floor(R() * 2);
  for (let i = 0; i < soLo; i++) {
    const co = Object.keys(W.db.rs[oid].forests);
    if (co.length && R() < 0.5) { const fid = co[Math.floor(R() * co.length)]; if (!locked(W, fid)) { W.db.rs[oid].forests[fid].n++; M.draft.forests[fid].n++; sua.push(fid); } }
    else { const fid = 'fN' + (++W.seq); W.db.rs[oid].forests[fid] = {id: fid, info: {maRung: fid}, n: 0}; M.draft.forests[fid] = {oid, n: 0}; mois.push(fid); }
  }
  const cham = mois.concat(sua); if (!cham.length) return true;
  cham.forEach(id => { W.st.loDirty.add(id); M.dirtyF.add(id); }); mois.forEach(id => { W.st.loMoi.add(id); M.moiF.add(id); });
  if (R() < 0.5) {
    const k = R() < 0.5 ? 'a1' : 'aN' + (1 + Math.floor(R() * 3)), had = Object.hasOwn(W.db.bienAlias, k), old = W.db.bienAlias[k], v = 'V' + (++W.seq);
    W.db.bienAlias[k] = v; M.draft.alias[k] = v;
    const ex = W.st.aliasNhap.get(k); if (ex) cham.forEach(id => ex.lots.add(id)); else W.st.aliasNhap.set(k, {had, old, lots: new Set(cham)});
    const p = M.pend.get(k); if (p) cham.forEach(id => p.lots.add(id)); else M.pend.set(k, {lots: new Set(cham), had, old, coLuu: false});
  }
  return true;
}
const locked = () => false;
const dirtyL = W => [...W.st.loDirty];
function opLuu(W, M, R, loi) {   // stSave
  const ds = dirtyL(W); if (!ds.length) return false; const fid = ds[Math.floor(R() * ds.length)], lc = loCua(W, fid); if (!lc) return false; const oid = lc[0];
  const sNhap = Nhap.chup(W.st); Nhap.chuChot(W.st, oid); const hadLo = W.st.loDirty.delete(fid);
  if (loi) { if (hadLo) W.st.loDirty.add(fid); Nhap.khoiPhuc(W.st, sNhap); return 'loi'; }
  ghi(W); mhLuu(M, fid); return true;
}
function opBo(W, M, R) {   // stDiscard → loHoan
  const ds = dirtyL(W); if (!ds.length) return false; const fid = ds[Math.floor(R() * ds.length)];
  Nhap.veBanDaLuu(W.db, W.st, fid); mhBo(M, fid); if (W.st.canGhi) { W.st.canGhi = false; ghi(W); } return true;   // như loVeBanDaLuu: ánh xạ vừa chốt thì persist
}
function opXoaLo(W, M, R) {   // delForest
  const tat = Object.entries(W.db.rs).flatMap(([oid, o]) => Object.keys(o.forests || {}).map(f => [oid, f])); if (!tat.length) return false;
  const [oid, fid] = tat[Math.floor(R() * tat.length)];
  if (W.st.loDirty.has(fid) || W.st.loMoi.has(fid)) Nhap.veBanDaLuu(W.db, W.st, fid);
  W.st.loDirty.delete(fid); W.st.loMoi.delete(fid); Nhap.aliasHoan(W.db, W.st, fid);
  if (W.db.rs[oid]) delete W.db.rs[oid].forests[fid];
  mhBo(M, fid); delete M.draft.forests[fid]; delete M.saved.forests[fid]; ghi(W); return true;
}
function opXoaRung(W, M, R) {   // delRs
  const ids = Object.keys(W.db.rs); if (!ids.length) return false; const oid = ids[Math.floor(R() * ids.length)], o = W.db.rs[oid];
  Object.keys(o.forests || {}).forEach(fid => { W.st.loDirty.delete(fid); W.st.loMoi.delete(fid); Nhap.aliasHoan(W.db, W.st, fid); mhBo(M, fid); delete M.draft.forests[fid]; delete M.saved.forests[fid]; });
  delete W.db.rs[oid]; W.st.chuNhap.delete(oid); delete M.draft.owners[oid]; delete M.saved.owners[oid]; M.ownerDirty.delete(oid); ghi(W); return true;
}
function opSuaTay(W, M, R) {   // saveInfo
  const ids = Object.keys(W.db.rs); if (!ids.length) return false; const oid = ids[Math.floor(R() * ids.length)];
  W.db.rs[oid].ten = 'Tay ' + (++W.seq); M.draft.owners[oid].ten = W.db.rs[oid].ten;
  const cn = W.st.chuNhap.get(oid); if (cn && !cn.moi) W.st.chuNhap.delete(oid);
  if (M.saved.owners[oid]) { M.saved.owners[oid] = clone(M.draft.owners[oid]); M.ownerDirty.delete(oid); }
  ghi(W); return true;
}
function opGhiTuDo(W) { ghi(W); return true; }   // lưu danh mục / cài đặt: persist không kèm thay đổi nháp
function opKhoiPhucToanBo(W, M) {   // dbThayToanBo / khôi phục: xóa cả ba sổ, savedSnap về bản vừa nạp
  W.db = clone(W.dia); W.st = Nhap.tao(Delta.snapshot(W.db));
  M.draft = dangDia(M); M.draft.owners = clone(M.saved.owners); M.dirtyF.clear(); M.moiF.clear(); M.ownerDirty.clear(); M.pend.clear(); return true;
}
function opDongDot(W, M) {   // nhapTamGhi → mở lại → nhapTamKhoiPhuc (hàm thật: Nhap.tamChup / tamPhucHoiLo / tamPhucHoiAlias)
  const ks = []; Object.entries(W.db.rs).forEach(([oid, o]) => Object.keys(o.forests || {}).forEach(fid => { if (W.st.loDirty.has(fid)) ks.push(oid + '|' + fid); }));
  const nhapTam = JSON.stringify(Nhap.tamChup(W.db, W.st, ks));
  W.db = clone(W.dia); W.st = Nhap.tao(Delta.snapshot(W.db));   // đóng đột ngột: đĩa giữ bản đã ghi
  const d = JSON.parse(nhapTam), moiSet = new Set(d.moi);
  Object.entries(d.lots).forEach(([k, f]) => { const oid = k.split('|')[0], c = d.chu[oid]; if (!W.db.rs[oid] && !c) return; Nhap.tamPhucHoiLo(W.db, W.st, k, f, c, moiSet); });
  Nhap.tamPhucHoiAlias(W.db, W.st, d.alias); if (W.st.canGhi) { W.st.canGhi = false; ghi(W); }
  return 'dongdot';
}
const OPS = [[opGop, 5], [opLuu, 4], [(W, M, R) => opLuu(W, M, R, true), 1], [opBo, 2], [opXoaLo, 1], [opXoaRung, 0.5], [opSuaTay, 1], [opGhiTuDo, 1.5], [opKhoiPhucToanBo, 0.4], [opDongDot, 1.2]];
function chonOp(R) { const t = OPS.reduce((a, [, w]) => a + w, 0); let x = R() * t; for (const [f, w] of OPS) { if ((x -= w) < 0) return f; } return OPS[0][0]; }

/* ===== kiểm bất biến ===== */
function kiem(W, M, nhat) {
  const ghiNay = ghiRa(W), ram = dangRam(W.db);
  assert.deepEqual(dangRam(ghiNay), dangDia(M), 'I1/I4: nội dung ghi xuống đĩa phải đúng bản đã lưu của mô hình\n' + nhat);
  assert.deepEqual(dangRam(ghiNay), dangRam(W.dia), 'I8: không có thay đổi đã chốt mà chưa xuống đĩa (bản sẽ ghi == bản đã ghi gần nhất)\n' + nhat);
  assert.deepEqual(dangRam({rs: W.db.rs, bienAlias: W.db.bienAlias}), dangRam({rs: Object.fromEntries(Object.entries(M.draft.owners).map(([oid, o]) => [oid, {ten: o.ten, forests: Object.fromEntries(Object.entries(M.draft.forests).filter(([, f]) => f.oid === oid).map(([fid, f]) => [fid, {n: f.n}]))}])), bienAlias: M.draft.alias}), 'I2/I3: bộ nhớ phải đúng bản nháp người dùng thấy\n' + nhat);
  assert.deepEqual([...W.st.loDirty].sort(), [...M.dirtyF].sort(), 'tập lô nháp\n' + nhat);
  /* I7 sổ không mồ côi */
  W.st.loMoi.forEach(id => assert.ok(W.st.loDirty.has(id), 'I7: loMoi ⊆ loDirty (' + id + ')\n' + nhat));
  W.st.loDirty.forEach(id => assert.ok(loCua(W, id), 'I7: lô nháp còn trong db (' + id + ')\n' + nhat));
  W.st.chuNhap.forEach((cn, oid) => assert.ok(W.db.rs[oid], 'I7: chủ rừng trong sổ còn trong db (' + oid + ')\n' + nhat));
  W.st.aliasNhap.forEach((v, k) => { assert.ok(k in (W.db.bienAlias || {}), 'I7: ánh xạ trong sổ còn trong db (' + k + ')\n' + nhat); assert.ok([...v.lots].some(id => W.st.loDirty.has(id)), 'I7: ánh xạ trong sổ còn lô nháp liên quan (' + k + ')\n' + nhat); });
  assert.deepEqual(Object.keys(ram.alias).sort(), Object.keys(M.draft.alias).sort());
}

function chayChuoi(seed) {
  const R = rng(seed), W = mo(), M = moHinh(), nhat = [], n = DO_DAI[0] + Math.floor(R() * (DO_DAI[1] - DO_DAI[0]));
  for (let i = 0; i < n; i++) {
    const op = chonOp(R), kq = op(W, M, R); nhat.push(op.name || 'loi');
    if (kq === false) continue;
    try { kiem(W, M, 'hạt=' + seed + ' bước ' + i + ' (' + (op.name || 'luuLoi') + '): ' + nhat.join(' > ')); }
    catch (e) { e.message = 'Tái hiện: NHAP_HAT=' + seed + ' NHAP_SO_CHUOI=1\n' + e.message; throw e; }
  }
}

test('mô hình ngẫu nhiên: ' + SO_CHUOI + ' chuỗi thao tác giữ bất biến I1–I5, I7 của bản nháp', () => {
  const hat = process.env.NHAP_HAT ? HAT_GOC : HAT_GOC, so = SO_CHUOI;
  for (let i = 0; i < so; i++) chayChuoi(hat + i * 7919);
});
