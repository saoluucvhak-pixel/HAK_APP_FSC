/* DANH MỤC ĐI KÈM GÓI LÔ RỪNG (bản 3.0). Hàm thuần.
 * Sao lưu một lô: mang theo đúng các mục Danh mục đối tượng / Danh mục xe / Vị trí mà lô trỏ tới (theo ID).
 * Khôi phục trên máy có danh mục KHÁC: nối từng mục với danh mục của máy đích —
 *   vị trí theo tên (không phân biệt hoa thường, dấu); đối tượng: pháp nhân theo MST (không có MST thì tên), người theo CCCD; xe theo BKS chuẩn hóa.
 *   Có trên máy: dùng mục của máy (không ghi đè), lô trỏ sang ID của máy; thông tin khác nhau được liệt kê.
 *   Chưa có: thêm vào danh mục máy (ID mới nếu ID trong gói đã dùng cho mục khác).
 *   Người cùng CCCD mà khác họ tên: không tự nối — lô giữ bản chụp, mục được ghi vào “Cần đối chiếu”.
 * Lô đã chốt / dừng: không sửa dữ liệu lô (bản in giữ nguyên); chỉ bổ sung danh mục còn thiếu. */
(function (root) {
  'use strict';
  const s = v => String(v == null ? '' : v).trim();
  const so = v => s(v).replace(/\D/g, '');
  const fold = v => s(v).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd').toLowerCase().replace(/\s+/g, ' ');
  const bk = v => s(v).toUpperCase().replace(/[\s.\-]/g, '');
  const clone = x => JSON.parse(JSON.stringify(x));
  const khoa = f => !!(f && (f.chot || f.dung));

  /* các ID danh mục lô đang trỏ tới */
  function idCuaLo(f) {
    const dt = new Set(), ng = new Set(), xe = new Set(), vt = new Set();
    (f.nc || []).forEach(r => { if (r && s(r.nguoiId)) ng.add(r.nguoiId); if (r && s(r.viTriId)) vt.add(r.viTriId); });
    (f.dx || []).forEach(r => { if (r && s(r.xeId)) xe.add(r.xeId); if (r && s(r.taiXeId)) ng.add(r.taiXeId); });
    (f.hdvc || []).forEach(h => { const b = h && h.benKy; if (b && s(b.doiTuongId)) dt.add(b.doiTuongId); if (b && s(b.nguoiId)) ng.add(b.nguoiId); });
    (f.doi || []).forEach(d => { const b = d && d.benNhanKhoan; if (b && s(b.doiTuongId)) dt.add(b.doiTuongId); if (b && s(b.nguoiId)) ng.add(b.nguoiId); });
    return {dt, ng, xe, vt};
  }
  /* phần danh mục của gói: {doiTuong, xe, viTri} — đối tượng mang đủ bảng người (để nối theo CCCD), xe kèm đối tượng chủ xe */
  function dongGoi(db, f) {
    const id = idCuaLo(f), DT = (db && db.dmDoiTuong) || [], XE = (db && db.dmXe) || [], VT = (db && db.dmViTri) || [];
    const xe = XE.filter(x => id.xe.has(x.id));
    xe.forEach(x => { if (s(x.chuXeId)) { if (DT.some(o => o.id === x.chuXeId)) id.dt.add(x.chuXeId); else id.ng.add(x.chuXeId); } });
    const doiTuong = DT.filter(o => id.dt.has(o.id) || (o.nguoi || []).some(p => id.ng.has(p.id)));
    return {doiTuong: clone(doiTuong), xe: clone(xe), viTri: clone(VT.filter(v => id.vt.has(v.id)))};
  }
  const idMoi = (dung, tien) => { let k = dung.size + 1; while (dung.has(tien + k)) k++; const v = tien + k; dung.add(v); return v; };

  /* Nối danh mục của gói vào danh mục máy (KHÔNG sửa đầu vào). Trả {dm: {dmDoiTuong, dmXe, dmViTri}, doi: {dt, ng, xe, vt} (id gói → id máy), them: [...], khac: [...], can: [...]} */
  function noi(db, goi) {
    const DT = clone((db && db.dmDoiTuong) || []), XE = clone((db && db.dmXe) || []), VT = clone((db && db.dmViTri) || []);
    const doi = {dt: {}, ng: {}, xe: {}, vt: {}}, them = [], khac = [], can = [];
    const g = goi || {};
    // vị trí
    const dungVt = new Set(VT.map(v => v.id));
    (g.viTri || []).forEach(v => {
      const m = VT.find(x => fold(x.ten) === fold(v.ten));
      if (m) { doi.vt[v.id] = m.id; return; }
      const id = dungVt.has(v.id) ? idMoi(dungVt, 'vt') : (dungVt.add(v.id), v.id);
      VT.push(Object.assign(clone(v), {id})); doi.vt[v.id] = id; them.push('Vị trí “' + s(v.ten) + '”');
    });
    // đối tượng và người
    const dungDt = new Set(DT.map(o => o.id)), dungNg = new Set(DT.flatMap(o => (o.nguoi || []).map(p => p.id)));
    const nguoiCccd = k => { for (const o of DT) for (const p of o.nguoi || []) if (so(p.cccd) && so(p.cccd) === k) return {o, p}; return null; };
    (g.doiTuong || []).forEach(o => {
      let m = null;
      if (o.loai === 'phapnhan') m = DT.find(x => x.loai === 'phapnhan' && ((so(o.mst) && so(x.mst) === so(o.mst)) || (!so(o.mst) && fold(x.ten) === fold(o.ten))));
      else { for (const p of o.nguoi || []) { const a = so(p.cccd) && nguoiCccd(so(p.cccd)); if (a && fold(a.p.hoTen) === fold(p.hoTen)) { m = a.o; break; } } }
      if (m) {
        doi.dt[o.id] = m.id;
        if (o.loai === 'phapnhan' && ['ten', 'diaChi', 'daiDien', 'chucVuDaiDien'].some(k => s(m[k]) !== s(o[k]))) khac.push('Đối tượng “' + s(o.ten) + '”: thông tin trong gói khác máy — DÙNG BẢN CỦA MÁY');
      }
      const dich = m || Object.assign(clone(o), {id: dungDt.has(o.id) ? idMoi(dungDt, 'dt') : (dungDt.add(o.id), o.id), nguoi: []});
      if (!m) { DT.push(dich); doi.dt[o.id] = dich.id; them.push('Đối tượng “' + s(o.ten) + '”'); }
      (o.nguoi || []).forEach(p => {
        const a = so(p.cccd) ? nguoiCccd(so(p.cccd)) : (m ? {o: m, p: (m.nguoi || []).find(q => fold(q.hoTen) === fold(p.hoTen))} : null);
        if (a && a.p) {
          if (fold(a.p.hoTen) !== fold(p.hoTen)) { can.push({loai: 'nguoi', ref: p.id, lyDo: 'Người “' + s(p.hoTen) + '” (CCCD ' + s(p.cccd) + ') trong gói trùng CCCD với “' + s(a.p.hoTen) + '” trên máy: chưa nối, đối chiếu ở Danh mục đối tượng', goc: clone(p)}); return; }
          doi.ng[p.id] = a.p.id;
          if (['ngayCap', 'noiCap', 'diaChi', 'gplx', 'hanGplx'].some(k => s(a.p[k]) && s(p[k]) && s(a.p[k]) !== s(p[k]))) khac.push('Người “' + s(p.hoTen) + '”: giấy tờ trong gói khác máy — DÙNG BẢN CỦA MÁY');
          return;
        }
        const id = dungNg.has(p.id) ? idMoi(dungNg, 'ng') : (dungNg.add(p.id), p.id);
        dich.nguoi = dich.nguoi || []; dich.nguoi.push(Object.assign(clone(p), {id})); doi.ng[p.id] = id; if (m) them.push('Người “' + s(p.hoTen) + '” vào đối tượng “' + s(m.ten) + '”');
      });
    });
    // xe
    const dungXe = new Set(XE.map(x => x.id));
    (g.xe || []).forEach(x => {
      const m = XE.find(y => bk(y.bks) && bk(y.bks) === bk(x.bks));
      const chu = s(x.chuXeId) ? (doi.ng[x.chuXeId] || doi.dt[x.chuXeId] || '') : '';
      if (m) { doi.xe[x.id] = m.id; if (chu && s(m.chuXeId) && m.chuXeId !== chu) khac.push('Xe ' + s(x.bks) + ': chủ xe trong gói khác máy — DÙNG BẢN CỦA MÁY'); return; }
      const id = dungXe.has(x.id) ? idMoi(dungXe, 'xe') : (dungXe.add(x.id), x.id);
      XE.push(Object.assign(clone(x), {id, chuXeId: chu})); doi.xe[x.id] = id; them.push('Xe ' + s(x.bks));
    });
    return {dm: {dmDoiTuong: DT, dmXe: XE, dmViTri: VT}, doi, them, khac, can};
  }
  /* đổi ID trong lô theo bảng doi (sửa f). Lô khóa: không đổi gì. Trả số liên kết đã đổi. */
  function doiIdLo(f, doi) {
    if (khoa(f)) return 0; let n = 0;
    const d = (m, v) => { if (s(v) && m[v] && m[v] !== v) { n++; return m[v]; } return v; };
    (f.nc || []).forEach(r => { if (!r) return; if (r.nguoiId) r.nguoiId = d(doi.ng, r.nguoiId); if (r.viTriId) r.viTriId = d(doi.vt, r.viTriId); });
    (f.dx || []).forEach(r => { if (!r) return; if (r.xeId) r.xeId = d(doi.xe, r.xeId); if (r.taiXeId) r.taiXeId = d(doi.ng, r.taiXeId); });
    [...(f.hdvc || []).map(h => h && h.benKy), ...(f.doi || []).map(x => x && x.benNhanKhoan)].forEach(b => { if (!b) return; if (b.doiTuongId) b.doiTuongId = d(doi.dt, b.doiTuongId); if (b.nguoiId) b.nguoiId = d(doi.ng, b.nguoiId); });
    return n;
  }
  const api = {idCuaLo, dongGoi, noi, doiIdLo};
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.HAKGoiDM = api;
})(typeof self !== 'undefined' ? self : this);
