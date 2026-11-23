/* DANH MỤC ĐI KÈM GÓI LÔ RỪNG (bản 3.0). Hàm thuần.
 * Sao lưu một lô: mang theo đúng các mục Danh mục đối tượng / Danh mục xe / Vị trí mà lô trỏ tới (theo ID).
 * Khôi phục trên máy có danh mục KHÁC: nối từng mục với danh mục của máy đích —
 *   vị trí theo tên (không phân biệt hoa thường, dấu); đối tượng: pháp nhân theo MST (không có MST thì tên), người theo CCCD; xe theo BKS chuẩn hóa.
 *   Có trên máy: dùng mục của máy (không ghi đè), lô trỏ sang ID của máy; thông tin khác nhau được liệt kê.
 *   Chưa có: thêm vào danh mục máy (ID mới nếu ID trong gói đã dùng cho mục khác).
 *   Người cùng CCCD mà khác họ tên: không tự nối — lô giữ bản chụp, mục được ghi vào “Cần đối chiếu”.
 *   Thể nhân không có CCCD: nối theo họ tên + ngày sinh khi khớp duy nhất; cùng họ tên mà không khớp duy nhất → “Cần đối chiếu”, không thêm (phiếu #05).
 * Lô đã chốt / dừng: không sửa dữ liệu lô (bản in giữ nguyên); chỉ bổ sung danh mục còn thiếu. */
(function (root) {
  'use strict';
  const s = v => String(v == null ? '' : v).trim();
  const so = v => s(v).replace(/\D/g, '');
  const fold = v => s(v).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd').toLowerCase().replace(/\s+/g, ' ');
  const bk = v => (typeof require === 'function' ? require('./bks.js') : root.HAKBks).khoa(v);   // một quy tắc chuẩn hóa BKS (src/bks.js)
  const clone = x => JSON.parse(JSON.stringify(x));
  const khoa = f => !!(f && (f.chot || f.dung));
  const ngayK = v => { const t = s(v).split(/[\/.\-]/).map(x => parseInt(x, 10)); return t.length === 3 && t.every(n => n > 0) ? t.join('/') : ''; };   // 05/01/1980 và 5/1/1980 là một ngày

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
    xe.forEach(x => { if (s(x.taiXeId)) id.ng.add(x.taiXeId); });   // tài xế thường chạy của xe (người) cũng mang theo
    const doiTuong = DT.filter(o => id.dt.has(o.id) || (o.nguoi || []).some(p => id.ng.has(p.id)));
    return {doiTuong: clone(doiTuong), xe: clone(xe), viTri: clone(VT.filter(v => id.vt.has(v.id)))};
  }
  const idMoi = (dung, tien) => { let k = dung.size + 1; while (dung.has(tien + k)) k++; const v = tien + k; dung.add(v); return v; };

  /* Nối danh mục của gói vào danh mục máy (KHÔNG sửa đầu vào). opts.loKhoa: lô đã chốt/dừng không đổi được ID trong lô nên mục thêm mới phải giữ nguyên ID gốc; nếu ID gốc đã bị chiếm bởi mục khác trên máy thì đưa vào Cần đối chiếu, không cấp ID khác làm lô chốt trỏ nhầm người (lô 3c, T-07). Trả {dm: {dmDoiTuong, dmXe, dmViTri}, doi: {dt, ng, xe, vt} (id gói → id máy), them: [...], khac: [...], can: [...]} */
  function noi(db, goi, opts) {
    const loKhoa = !!(opts && opts.loKhoa);
    const DT = clone((db && db.dmDoiTuong) || []), XE = clone((db && db.dmXe) || []), VT = clone((db && db.dmViTri) || []);
    const doi = {dt: {}, ng: {}, xe: {}, vt: {}}, them = [], khac = [], can = [];
    const g = goi || {};
    // vị trí
    const dungVt = new Set(VT.map(v => v.id));
    (g.viTri || []).forEach(v => {
      const m = VT.find(x => fold(x.ten) === fold(v.ten));
      if (m) {
        doi.vt[v.id] = m.id;
        if (loKhoa && m.id !== v.id) can.push({loai: 'vitri', ref: v.id, lyDo: 'Lô đã chốt trỏ vị trí “' + s(v.ten) + '” theo ID “' + v.id + '”, nhưng trên máy vị trí này có ID “' + m.id + '”: lô chốt giữ nguyên dữ liệu gốc', goc: clone(v)});
        return;
      }
      if (loKhoa && dungVt.has(v.id)) {
        can.push({loai: 'vitri', ref: v.id, lyDo: 'Lô đã chốt trỏ vị trí “' + s(v.ten) + '” (ID “' + v.id + '”) nhưng ID này đang dùng cho vị trí khác trên máy: chưa thêm để không trỏ nhầm', goc: clone(v)});
        return;
      }
      const id = dungVt.has(v.id) ? idMoi(dungVt, 'vt') : (dungVt.add(v.id), v.id);
      VT.push(Object.assign(clone(v), {id})); doi.vt[v.id] = id; them.push('Vị trí “' + s(v.ten) + '”');
    });
    // đối tượng và người
    const dungDt = new Set(DT.map(o => o.id)), dungNg = new Set(DT.flatMap(o => (o.nguoi || []).map(p => p.id)));
    const maDtUsed = new Set(DT.map(o => s(o.ma).toUpperCase()).filter(Boolean));
    const maDtMoi = () => { let k = DT.length + 1; while (maDtUsed.has('DT' + String(k).padStart(4, '0'))) k++; const v = 'DT' + String(k).padStart(4, '0'); maDtUsed.add(v); return v; };
    const nguoiCccd = k => { for (const o of DT) for (const p of o.nguoi || []) if (so(p.cccd) && so(p.cccd) === k) return {o, p}; return null; };
    (g.doiTuong || []).forEach(o => {
      let m = null;
      if (o.loai === 'phapnhan') m = DT.find(x => x.loai === 'phapnhan' && ((so(o.mst) && so(x.mst) === so(o.mst)) || (!so(o.mst) && fold(x.ten) === fold(o.ten))));
      else {
        for (const p of o.nguoi || []) { const a = so(p.cccd) && nguoiCccd(so(p.cccd)); if (a && fold(a.p.hoTen) === fold(p.hoTen)) { m = a.o; break; } }
        /* phiếu #05 (ND-06, B-10): thể nhân KHÔNG có CCCD nào — nối theo họ tên + ngày sinh khi khớp DUY NHẤT; trùng họ tên mà không khớp duy nhất thì “Cần đối chiếu”,
         * không tạo hồ sơ mới (khôi phục cùng gói hai lần không nhân đôi) */
        if (!m && !(o.nguoi || []).some(p => so(p.cccd))) {
          const ng = o.nguoi || [], cungTen = DT.filter(x => x.loai !== 'phapnhan' && (x.nguoi || []).some(q => ng.some(p => fold(p.hoTen) && fold(q.hoTen) === fold(p.hoTen))));
          const khop = cungTen.filter(x => (x.nguoi || []).some(q => ng.some(p => fold(q.hoTen) === fold(p.hoTen) && ngayK(p.ngaySinh) && ngayK(q.ngaySinh) === ngayK(p.ngaySinh))));
          const cungId = cungTen.filter(x => x.id === o.id);   // hồ sơ do chính gói này thêm ở lần khôi phục trước (cùng ID, cùng họ tên)
          if (khop.length === 1) m = khop[0]; else if (!khop.length && cungId.length === 1) m = cungId[0];
          else if (cungTen.length) {
            can.push({loai: 'doituong', ref: o.id, lyDo: 'Đối tượng “' + s(o.ten) + '” trong gói chưa có CCCD; trên máy có ' + cungTen.length + ' hồ sơ cùng họ tên (' + cungTen.map(x => s(x.ma) || x.id).join(', ') + ')' +
              (khop.length > 1 ? ', ' + khop.length + ' hồ sơ trùng cả ngày sinh' : ', không khớp ngày sinh') + ': chưa nối, chưa thêm — đối chiếu ở Danh mục đối tượng'});
            return;
          }
        }
      }
      if (m) {
        doi.dt[o.id] = m.id;
        if (o.loai === 'phapnhan' && ['ten', 'diaChi', 'daiDien', 'chucVuDaiDien'].some(k => s(m[k]) !== s(o[k]))) khac.push('Đối tượng “' + s(o.ten) + '”: thông tin trong gói khác máy — DÙNG BẢN CỦA MÁY');
      }
      const nguoiMoi = [];
      (o.nguoi || []).forEach(p => {
        const a = so(p.cccd) ? nguoiCccd(so(p.cccd)) : (m ? {o: m, p: (m.nguoi || []).find(q => fold(q.hoTen) === fold(p.hoTen))} : null);
        if (a && a.p) {
          if (fold(a.p.hoTen) !== fold(p.hoTen)) { can.push({loai: 'nguoi', ref: p.id, lyDo: 'Người “' + s(p.hoTen) + '” (CCCD ' + s(p.cccd) + ') trong gói trùng CCCD với “' + s(a.p.hoTen) + '” trên máy: chưa nối, đối chiếu ở Danh mục đối tượng', goc: clone(p)}); return; }
          doi.ng[p.id] = a.p.id;
          if (loKhoa && a.p.id !== p.id) can.push({loai: 'nguoi', ref: p.id, lyDo: 'Lô đã chốt trỏ người “' + s(p.hoTen) + '” theo ID “' + p.id + '”, trên máy người này có ID “' + a.p.id + '”: lô chốt giữ nguyên dữ liệu gốc', goc: clone(p)});
          if (['ngayCap', 'noiCap', 'diaChi', 'gplx', 'hanGplx'].some(k => s(a.p[k]) && s(p[k]) && s(a.p[k]) !== s(p[k]))) khac.push('Người “' + s(p.hoTen) + '”: giấy tờ trong gói khác máy — DÙNG BẢN CỦA MÁY');
          return;
        }
        if (loKhoa && dungNg.has(p.id)) {
          can.push({loai: 'nguoi', ref: p.id, lyDo: 'Lô đã chốt trỏ người “' + s(p.hoTen) + '” (ID “' + p.id + '”) nhưng ID này đang thuộc về người khác trên máy: chưa thêm để tránh lô chốt trỏ nhầm người', goc: clone(p)});
          return;
        }
        const id = dungNg.has(p.id) ? idMoi(dungNg, 'ng') : (dungNg.add(p.id), p.id);
        nguoiMoi.push(Object.assign(clone(p), {id})); doi.ng[p.id] = id;
        if (m) them.push('Người “' + s(p.hoTen) + '” vào đối tượng “' + s(m.ten) + '”');
      });
      if (m) {
        if (nguoiMoi.length) { m.nguoi = (m.nguoi || []).concat(nguoiMoi); }
        return;
      }
      /* Lô 3c (T-07): thể nhân mà toàn bộ người bị đưa vào Cần đối chiếu (0 người hợp lệ để thêm) → KHÔNG thêm đối tượng rỗng 0 người */
      if (o.loai !== 'phapnhan' && !nguoiMoi.length) return;
      if (loKhoa && dungDt.has(o.id)) {
        can.push({loai: 'doituong', ref: o.id, lyDo: 'Lô đã chốt trỏ đối tượng “' + s(o.ten) + '” (ID “' + o.id + '”) nhưng ID này đang thuộc về đối tượng khác trên máy: chưa thêm để tránh trỏ nhầm', goc: clone(o)});
        return;
      }
      const id = dungDt.has(o.id) ? idMoi(dungDt, 'dt') : (dungDt.add(o.id), o.id);
      const ma = s(o.ma) && !maDtUsed.has(s(o.ma).toUpperCase()) ? (maDtUsed.add(s(o.ma).toUpperCase()), s(o.ma)) : maDtMoi();
      const dich = Object.assign(clone(o), {id, ma, nguoi: nguoiMoi});
      DT.push(dich); doi.dt[o.id] = dich.id; them.push('Đối tượng “' + s(o.ten) + '”');
    });
    // xe
    const dungXe = new Set(XE.map(x => x.id));
    (g.xe || []).forEach(x => {
      const m = XE.find(y => bk(y.bks) && bk(y.bks) === bk(x.bks));
      const chu = s(x.chuXeId) ? (doi.ng[x.chuXeId] || doi.dt[x.chuXeId] || '') : '';
      /* tài xế thường chạy: ánh xạ sang người trên máy đích; không có người đó, hoặc người đó chưa có vai trò Tài xế trên máy → bỏ rỗng và báo */
      let tai = s(x.taiXeId) ? (doi.ng[x.taiXeId] || '') : '';
      if (tai) { const ngT = DT.reduce((a, o) => a || (o.nguoi || []).find(p => p.id === tai), null); if (!ngT || !(ngT.vaiTro && ngT.vaiTro.taiXe)) tai = ''; }
      if (m) {
        doi.xe[x.id] = m.id;
        if (loKhoa && m.id !== x.id) can.push({loai: 'xe', ref: x.id, lyDo: 'Lô đã chốt trỏ xe ' + s(x.bks) + ' theo ID “' + x.id + '”, trên máy xe này có ID “' + m.id + '”: lô chốt giữ nguyên dữ liệu gốc', goc: clone(x)});
        if (chu && s(m.chuXeId) && m.chuXeId !== chu) khac.push('Xe ' + s(x.bks) + ': chủ xe trong gói khác máy — DÙNG BẢN CỦA MÁY');
        if (tai && s(m.taiXeId) && m.taiXeId !== tai) khac.push('Xe ' + s(x.bks) + ': tài xế thường chạy trong gói khác máy — DÙNG BẢN CỦA MÁY');
        return;
      }
      if (loKhoa && dungXe.has(x.id)) {
        can.push({loai: 'xe', ref: x.id, lyDo: 'Lô đã chốt trỏ xe ' + s(x.bks) + ' (ID “' + x.id + '”) nhưng ID này đang dùng cho xe khác trên máy: chưa thêm để tránh trỏ nhầm', goc: clone(x)});
        return;
      }
      const id = dungXe.has(x.id) ? idMoi(dungXe, 'xe') : (dungXe.add(x.id), x.id);
      if (s(x.taiXeId) && !tai) khac.push('Xe ' + s(x.bks) + ': tài xế thường chạy trong gói không có (hoặc chưa có vai trò Tài xế) trên máy — để trống, chọn lại ở Danh mục xe');
      const moiXe = Object.assign(clone(x), {id, chuXeId: chu}); if (tai) moiXe.taiXeId = tai; else delete moiXe.taiXeId;
      XE.push(moiXe); doi.xe[x.id] = id; them.push('Xe ' + s(x.bks));
    });
    return {dm: {dmDoiTuong: DT, dmXe: XE, dmViTri: VT}, doi, them, khac, can};
  }
  /* đổi ID trong lô theo bảng doi (sửa f; unmapped ID được xóa nếu thuộc tập unmapped để không trỏ nhầm sang mục khác của máy đích). Lô khóa: không đổi gì. Trả số liên kết đã đổi. */
  function doiIdLo(f, doi, unmapped) {
    if (khoa(f)) return 0; let n = 0;
    const u = unmapped || {};
    const d = (m, uSet, v) => {
      if (!s(v)) return v;
      if (m && m[v]) { if (m[v] !== v) n++; return m[v]; }
      if (uSet && uSet.has(v)) { n++; return ''; }
      return v;
    };
    (f.nc || []).forEach(r => { if (!r) return; if (r.nguoiId) r.nguoiId = d(doi.ng, u.ng, r.nguoiId); if (r.viTriId) r.viTriId = d(doi.vt, u.vt, r.viTriId); });
    (f.dx || []).forEach(r => { if (!r) return; if (r.xeId) r.xeId = d(doi.xe, u.xe, r.xeId); if (r.taiXeId) r.taiXeId = d(doi.ng, u.ng, r.taiXeId); });
    [...(f.hdvc || []).map(h => h && h.benKy), ...(f.doi || []).map(x => x && x.benNhanKhoan)].forEach(b => { if (!b) return; if (b.doiTuongId) b.doiTuongId = d(doi.dt, u.dt, b.doiTuongId); if (b.nguoiId) b.nguoiId = d(doi.ng, u.ng, b.nguoiId); });
    return n;
  }
  const api = {idCuaLo, dongGoi, noi, doiIdLo};
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.HAKGoiDM = api;
})(typeof self !== 'undefined' ? self : this);
