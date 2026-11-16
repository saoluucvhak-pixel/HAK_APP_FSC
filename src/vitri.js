/* DANH MỤC VỊ TRÍ CÓ ID ỔN ĐỊNH (bản 3.0). Hàm thuần.
 * db.dmViTri = [{id: 'vt<N>', ten, ngung}]. Các bảng nghiệp vụ hiện có vẫn dùng TÊN vị trí làm khóa (định biên nhân công db.dinhBien / dinhBienVer,
 * định mức BHLĐ db.dinhMuc / dinhMucBan, đơn giá theo vị trí của đội donGiaTan / donGiaHa / donGiaNgay, chức danh dòng nhân công nc.chucDanh) để
 * biểu mẫu in như trước. ID là liên kết ổn định: đổi tên vị trí (doiTen) đổi MỘT LẦN mọi bảng đang dùng tên cũ, nên định mức, đơn giá vẫn đúng vị trí.
 * Lô đã chốt / đã dừng KHÔNG bị đổi (giữ tên và giá trị đã áp dụng để in lại đúng); dòng nhân công nối bằng nc.viTriId.
 *  - dung(db, tenDangDung): dựng / bổ sung danh mục từ mọi tên đang có (giữ id cũ, thêm id mới); không sửa db, trả danh mục mới.
 *  - tim(dm, ten) / timId(dm, id); doiTen(db, id, tenMoi): {ok, error, so: {...}} sửa trực tiếp db; them(dm, ten). */
(function (root) {
  'use strict';
  const s = v => String(v == null ? '' : v).replace(/\s+/g, ' ').trim();
  const fold = v => s(v).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();
  const DG = ['donGiaTan', 'donGiaHa', 'donGiaNgay'];
  const tim = (dm, ten) => { const k = fold(ten); return k ? (dm || []).find(x => fold(x.ten) === k) || null : null; };
  const timId = (dm, id) => (dm || []).find(x => x.id === id) || null;
  const idMoi = dm => { const used = new Set((dm || []).map(x => x.id)); let k = used.size + 1; while (used.has('vt' + k)) k++; return 'vt' + k; };
  function them(dm, ten) { const t = s(ten); if (!t) return null; const c = tim(dm, t); if (c) return c; const x = {id: idMoi(dm), ten: t, ngung: false}; dm.push(x); return x; }
  /* mọi tên vị trí đang có trong db (theo thứ tự xuất hiện, không trùng): định biên (gốc + phiên bản), định mức BHLĐ (gốc + bản), đơn giá của đội, chức danh nhân công, danh mục lao động cũ */
  function tenDangCo(db) {
    const out = [], add = t => { t = s(t); if (t && !out.some(x => fold(x) === fold(t))) out.push(t); };
    (db.dinhBien || []).forEach(r => add(r && r.chucDanh));
    (db.dinhBienVer || []).forEach(v => ((v && v.rows) || []).forEach(r => add(r && r.chucDanh)));
    Object.keys(db.dinhMuc || {}).forEach(add);
    (db.dinhMucBan || []).forEach(v => Object.keys((v && v.dm) || {}).forEach(add));
    Object.values(db.rs || {}).forEach(o => Object.values((o && o.forests) || {}).forEach(f => {
      (f.nc || []).forEach(r => add(r && r.chucDanh));
      [f.info || {}, ...(f.doi || []).map(d => (d && d.hinhThuc) || {})].forEach(i => DG.forEach(m => Object.keys(i[m] || {}).forEach(add)));
    }));
    (db.dmLaoDong || []).forEach(r => add(r && r.viTri));
    return out;
  }
  function dung(db, tenThem) {
    const dm = JSON.parse(JSON.stringify(Array.isArray(db && db.dmViTri) ? db.dmViTri : []));
    (tenThem || []).concat(tenDangCo(db || {})).forEach(t => them(dm, t));
    return dm;
  }
  /* đổi khóa của một đối tượng {tên cũ: giá trị} sang tên mới, giữ thứ tự khóa; trả số khóa đã đổi */
  function doiKhoa(o, cu, moi) {
    if (!o || typeof o !== 'object') return 0; const keys = Object.keys(o), k = keys.find(x => fold(x) === fold(cu)); if (!k || k === moi) return 0;
    if (keys.some(x => x !== k && fold(x) === fold(moi))) return 0;   // tên mới đã có giá trị riêng: không ghi đè
    const v = o[k], ds = keys.map(x => [x === k ? moi : x, x === k ? v : o[x]]); keys.forEach(x => delete o[x]); ds.forEach(([x, y]) => { o[x] = y; }); return 1;
  }
  const khoa = f => !!(f && (f.chot || f.dung));
  function doiTen(db, id, tenMoi) {
    const dm = db.dmViTri || [], vt = timId(dm, id), moi = s(tenMoi);
    if (!vt) return {ok: false, error: 'Không có vị trí này'};
    if (!moi) return {ok: false, error: 'Tên vị trí không được để trống'};
    const trung = tim(dm, moi); if (trung && trung.id !== id) return {ok: false, error: 'Đã có vị trí “' + trung.ten + '”'};
    const cu = vt.ten, so = {dinhBien: 0, dinhMuc: 0, donGia: 0, nhanCong: 0, loKhoa: 0};
    if (cu === moi) return {ok: true, so};
    (db.dinhBien || []).forEach(r => { if (r && fold(r.chucDanh) === fold(cu)) { r.chucDanh = moi; so.dinhBien++; } });
    (db.dinhBienVer || []).forEach(v => ((v && v.rows) || []).forEach(r => { if (r && fold(r.chucDanh) === fold(cu)) { r.chucDanh = moi; so.dinhBien++; } }));
    so.dinhMuc += doiKhoa(db.dinhMuc, cu, moi); (db.dinhMucBan || []).forEach(v => { so.dinhMuc += doiKhoa(v && v.dm, cu, moi); });
    Object.values(db.rs || {}).forEach(o => Object.values((o && o.forests) || {}).forEach(f => {
      const dung = (f.nc || []).some(r => r && (r.viTriId === id || fold(r.chucDanh) === fold(cu)));
      if (khoa(f)) { if (dung) so.loKhoa++; return; }   // lô đã chốt / dừng: giữ tên đã áp dụng
      (f.nc || []).forEach(r => { if (r && (r.viTriId === id || (!r.viTriId && fold(r.chucDanh) === fold(cu)))) { r.chucDanh = moi; r.viTriId = id; so.nhanCong++; } });
      [f.info || {}, ...(f.doi || []).map(d => (d && d.hinhThuc) || {})].forEach(i => DG.forEach(m => { so.donGia += doiKhoa(i[m], cu, moi); }));
    }));
    (db.dmLaoDong || []).forEach(r => { if (r && fold(r.viTri) === fold(cu)) r.viTri = moi; });
    vt.ten = moi;
    return {ok: true, so};
  }
  const api = {tim, timId, them, dung, tenDangCo, doiTen, fold};
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.HAKViTri = api;
})(typeof self !== 'undefined' ? self : this);
