/* LIÊN KẾT TRONG LÔ và CHUYỂN ĐỔI 3.0 (docs/THIET_KE_3_0.md). Hàm thuần.
 *
 * Lô giữ BẢN CHỤP để in (họ tên, CCCD, BKS…); 3.0 thêm ID và liên kết:
 *   nc[].id ('tv<N>'), nguoiId, viTriId   — dòng thành viên của đội (hợp đồng nhân công)
 *   dx[].id ('xr<N>'), xeId, taiXeId       — dòng xe của hợp đồng vận chuyển
 *   pc[].id ('pc<N>'), hdvcId, xeRowId     — phiếu cân thuộc hợp đồng vận chuyển, dùng đúng dòng xe
 *   hdvc[].benKy {doiTuongId, nguoiId}; doi[].benNhanKhoan {doiTuongId, nguoiId}
 *   cc: khóa người = ID dòng thành viên (src/chamcong.js personKey)
 *   canDoiChieu: [{loai, ref, lyDo, goc}] — các dòng không tự liên kết được (giữ nguyên dữ liệu gốc)
 *
 * chuanLo(f): CHỈ dựa vào dữ liệu trong lô — gán ID dòng còn thiếu, đổi khóa chấm công sang ID thành viên. Chạy khi lưu lô (lô chưa chốt / chưa dừng).
 *   Chấm công cũ theo CCCD / họ tên: khớp MỘT dòng → đổi khóa; khớp NHIỀU dòng (một người ở hai đội) → chép cho từng dòng (bản in không đổi) và ghi Cần đối chiếu;
 *   không khớp dòng nào → giữ nguyên khóa cũ và ghi Cần đối chiếu.
 * noiDanhMuc(f, db): nối liên kết với danh mục đối tượng / xe / vị trí (chỉ khi khớp DUY NHẤT); phiếu cân → hợp đồng + dòng xe khi BKS khớp đúng một dòng xe của lô.
 * chuyenDoi(db, homNay): chạy cả ba danh mục và mọi lô chưa khóa — dùng cho SQLite v15 và bản sao lưu JSON cũ (withDefaults). Chạy lại không đổi. */
(function (root) {
  'use strict';
  const req = (n, g) => (typeof require === 'function' ? require('./' + n) : root[g]);
  const DT = () => req('doituong.js', 'HAKDoiTuong'), XE = () => req('xedm.js', 'HAKXeDM'), VT = () => req('vitri.js', 'HAKViTri'), B = () => req('bks.js', 'HAKBks');
  const s = v => String(v == null ? '' : v).replace(/\s+/g, ' ').trim();
  const so = v => String(v == null ? '' : v).replace(/\D/g, '');
  const has = (o, k) => !!o && Object.prototype.hasOwnProperty.call(o, k);
  const khoa = f => !!(f && (f.chot || f.dung));
  const pk = r => String((r && (r.cccd || r.ten)) || '').trim();   // khóa chấm công CŨ (trước 3.0)

  function themCan(f, c) {
    f.canDoiChieu = Array.isArray(f.canDoiChieu) ? f.canDoiChieu : [];
    if (!f.canDoiChieu.some(x => x.loai === c.loai && x.ref === c.ref)) f.canDoiChieu.push(c);
  }
  /* gán ID còn thiếu cho các dòng của một bảng; tiền tố cố định, số tăng dần không dùng lại số đã có */
  function ganIdBang(rows, pre) {
    let n = 0; const used = new Set((rows || []).map(r => r && r.id).filter(Boolean));
    (rows || []).forEach(r => { if (!r || typeof r !== 'object' || s(r.id)) return; let k = used.size + 1; while (used.has(pre + k)) k++; r.id = pre + k; used.add(r.id); n++; });
    return n;
  }
  /* đổi khóa chấm công sang ID dòng thành viên (sửa f); trả số khóa đã đổi */
  function doiKhoaChamCong(f) {
    const cc = f.cc; if (!cc || typeof cc !== 'object') return 0;
    const nc = (f.nc || []).filter(r => r && s(r.id)), ids = new Set(nc.map(r => r.id)); let n = 0;
    Object.keys(cc).forEach(thang => {
      const m = cc[thang]; if (!m || typeof m !== 'object') return;
      Object.keys(m).forEach(k => {
        if (ids.has(k)) return;   // đã theo ID
        const khop = nc.filter(r => pk(r) === k);
        if (khop.length === 1) { const id = khop[0].id; if (!m[id]) { m[id] = m[k]; delete m[k]; n++; } return; }
        if (khop.length > 1) {
          khop.forEach(r => { if (!m[r.id]) m[r.id] = JSON.parse(JSON.stringify(m[k])); }); delete m[k]; n++;
          themCan(f, {loai: 'chamcong', ref: k, lyDo: 'Chấm công tháng ' + thang + ' của “' + (khop[0].ten || k) + '” (một người ở ' + khop.length + ' dòng / đội) đang tính cho cả ' + khop.length + ' dòng: kiểm tra và chấm riêng từng đội trước khi tính tiền', goc: null});
          return;
        }
        themCan(f, {loai: 'chamcong', ref: k, lyDo: 'Chấm công tháng ' + thang + ' theo “' + k + '” không khớp người nào trong lô: chọn đúng người hoặc xóa', goc: null});
      });
    });
    return n;
  }
  /* o.batKe: chuẩn hóa cả lô đang khóa — CHỈ dùng để SO SÁNH (kiểm khóa chỉ đọc: bản đã lưu đang khóa so với bản vừa mở khóa đã được gán ID), không ghi */
  /* PHIẾU ĐI THEO XE: phiếu đã gắn dòng xe thì thuộc hợp đồng của dòng xe đó (chuyển xe sang hợp đồng khác → phiếu theo xe, như bản cũ nhóm phiếu theo biển số);
   * dòng xe đã bỏ → bỏ liên kết xe (phiếu giữ nguyên, chọn lại xe); phiếu chưa gắn xe → chỉ tự gắn khi BKS khớp ĐÚNG MỘT dòng xe của lô. Trả số phiếu đã đổi. */
  function dongBoPhieu(f) {
    const dx = (f.dx || []).filter(r => r && s(r.id)), byId = new Map(dx.map(r => [r.id, r])), hd = new Set((f.hdvc || []).map(h => h && h.id)); let n = 0;
    (f.pc || []).forEach(p => {
      if (!p || typeof p !== 'object') return;
      if (p.xeRowId && !byId.has(p.xeRowId)) { delete p.xeRowId; n++; }
      if (p.xeRowId) { const h = byId.get(p.xeRowId).hdvcId; if (h && p.hdvcId !== h) { p.hdvcId = h; n++; } return; }
      if (p.hdvcId && !hd.has(p.hdvcId)) { delete p.hdvcId; n++; }
      const k = B().khoa(p.bienSo); if (!k) return;
      const m = dx.filter(r => B().khoa(r.bienSo) === k); if (m.length !== 1 || !m[0].hdvcId) return;
      if (p.hdvcId && p.hdvcId !== m[0].hdvcId) return;   // đã chọn hợp đồng khác: không tự đổi
      p.xeRowId = m[0].id; p.hdvcId = m[0].hdvcId; n++;
    });
    return n;
  }
  function chuanLo(f, o) {
    if (!f || typeof f !== 'object' || (khoa(f) && !(o && o.batKe))) return 0;
    const n = ganIdBang(f.nc, 'tv') + ganIdBang(f.dx, 'xr') + ganIdBang(f.pc, 'pc') + doiKhoaChamCong(f);
    return n + dongBoPhieu(f);
  }
  const canChuan = f => !!f && typeof f === 'object' && !khoa(f) && (['nc', 'dx', 'pc'].some(k => (f[k] || []).some(r => r && typeof r === 'object' && !s(r.id))) || dongBoPhieu(JSON.parse(JSON.stringify({dx: f.dx, hdvc: f.hdvc, pc: f.pc}))) > 0 ||
    Object.values(f.cc || {}).some(m => { const ids = new Set((f.nc || []).map(r => r && r.id)); return Object.keys(m || {}).some(k => !ids.has(k) && (f.nc || []).some(r => r && pk(r) === k)); }));

  /* nối liên kết danh mục cho MỘT lô (sửa f; bỏ qua lô khóa). db: {dmDoiTuong, dmXe, dmViTri}. Trả số liên kết đã ghi. */
  function noiDanhMuc(f, db) {
    if (!f || khoa(f)) return 0;
    const dm = db.dmDoiTuong || [], xe = db.dmXe || [], vt = db.dmViTri || [], D = DT(); let n = 0;
    (f.nc || []).forEach(r => {
      if (!r) return;
      if (!r.nguoiId && so(r.cccd)) { const a = D.timCccd(dm, r.cccd); if (a) { r.nguoiId = a.ng.id; n++; } else themCan(f, {loai: 'nhancong', ref: r.id || pk(r), lyDo: 'Nhân công “' + s(r.ten) + '” (CCCD ' + so(r.cccd) + ') chưa có trong Danh mục đối tượng', goc: {ten: r.ten, cccd: r.cccd}}); }
      else if (!r.nguoiId && s(r.ten)) themCan(f, {loai: 'nhancong', ref: r.id || pk(r), lyDo: 'Nhân công “' + s(r.ten) + '” chưa có CCCD: không tự liên kết với Danh mục đối tượng', goc: {ten: r.ten}});
      if (!r.viTriId && s(r.chucDanh)) { const v = VT().tim(vt, r.chucDanh); if (v) { r.viTriId = v.id; n++; } }
    });
    (f.dx || []).forEach(r => {
      if (!r) return;
      if (!r.xeId && s(r.bienSo)) { const x = XE().timBks(xe, r.bienSo); if (x) { r.xeId = x.id; n++; } else themCan(f, {loai: 'xe', ref: r.id || s(r.bienSo), lyDo: 'Xe ' + s(r.bienSo) + ' chưa có trong Danh mục xe', goc: {bienSo: r.bienSo}}); }
      if (!r.taiXeId && so(r.cccdTx)) { const a = D.timCccd(dm, r.cccdTx); if (a) { r.taiXeId = a.ng.id; n++; } }
    });
    (f.hdvc || []).forEach(h => {
      if (!h || h.benKy) return;
      if (h.donViId) { const p = D.timTuDoiTacCu(dm, h.donViId) || D.timTuDoiTacCu(dm, 'dn:' + h.donViId) || D.tim(dm, h.donViId); if (p) { h.benKy = {doiTuongId: p.id, nguoiId: ''}; n++; } else themCan(f, {loai: 'hdvc', ref: h.id, lyDo: 'Hợp đồng vận chuyển ' + (h.ten || h.id) + ': đơn vị ký chưa xác định được trong Danh mục đối tượng', goc: {donViId: h.donViId}}); return; }
      if (so(h.key)) { const a = D.timCccd(dm, h.key); if (a) { h.benKy = {doiTuongId: a.dt.id, nguoiId: a.ng.id}; n++; } }
    });
    (f.doi || []).forEach(d => {
      if (!d || d.benNhanKhoan) return;
      const tt = (f.nc || []).filter(r => r && r.doiId === d.id && /^tổ trưởng/i.test(s(r.vaiTro)));
      if (tt.length === 1 && so(tt[0].cccd)) { const a = D.timCccd(dm, tt[0].cccd); if (a) { d.benNhanKhoan = {doiTuongId: a.dt.id, nguoiId: a.ng.id}; n++; } }
    });
    // phiếu cân → hợp đồng vận chuyển + dòng xe: chỉ khi BKS khớp đúng MỘT dòng xe của lô
    (f.pc || []).forEach(p => {
      if (!p || (p.hdvcId && p.xeRowId)) return;
      const k = B().khoa(p.bienSo), m = (f.dx || []).filter(r => r && k && B().khoa(r.bienSo) === k);
      if (m.length === 1 && m[0].hdvcId) { p.hdvcId = m[0].hdvcId; p.xeRowId = m[0].id; n++; return; }
      themCan(f, {loai: 'phieu', ref: p.id || s(p.soPhieu), lyDo: 'Phiếu ' + s(p.soPhieu) + ' (' + s(p.ngay) + ', BKS ' + (s(p.bienSo) || 'trống') + '): ' + (!k ? 'chưa có BKS' : m.length ? 'BKS khớp ' + m.length + ' dòng xe' : 'BKS không có trong xe của lô') + ' — chọn hợp đồng và xe', goc: {soPhieu: p.soPhieu, bienSo: p.bienSo}});
    });
    return n;
  }

  /* chuyển đổi cả db (sửa db truyền vào). Trả báo cáo {doiTuong: {nguoi, phapNhan}, xe, viTri, lo, loKhoa, can} */
  function chuyenDoi(db, homNay) {
    const bao = {doiTuong: {nguoi: 0, phapNhan: 0}, xe: 0, viTri: 0, lo: 0, loKhoa: 0, can: 0};
    const truocVT = (db.dmViTri || []).length; db.dmViTri = VT().dung(db); bao.viTri = db.dmViTri.length - truocVT;
    const d = DT().tuDanhMucCu(db, db.dmViTri, db.dmDoiTuong || []); db.dmDoiTuong = d.dm; bao.doiTuong = d.so;
    const truocXe = (db.dmXe || []).length, x = XE().tuDanhMucCu(db.dmXeVC || [], db.dmDoiTuong, db.dmXe || []); db.dmXe = x.dm; bao.xe = db.dmXe.length - truocXe;
    const can = (db.canDoiChieu || []).slice(); d.canDoiChieu.concat(x.canDoiChieu).forEach(c => { if (!can.some(y => y.loai === c.loai && y.ref === c.ref)) can.push(c); }); db.canDoiChieu = can;
    Object.values(db.rs || {}).forEach(o => Object.values((o && o.forests) || {}).forEach(f => {
      if (!f || typeof f !== 'object') return; if (khoa(f)) { bao.loKhoa++; return; }
      const a = chuanLo(f), b = noiDanhMuc(f, db); if (a || b) bao.lo++; bao.can += (f.canDoiChieu || []).length;
    }));
    bao.can += can.length;
    return bao;
  }
  /* db đã chuyển 3.0 chưa (có danh mục mới) */
  const daChuyen = db => Array.isArray(db && db.dmDoiTuong) && Array.isArray(db && db.dmXe) && Array.isArray(db && db.dmViTri);
  const api = {chuanLo, canChuan, dongBoPhieu, ganIdBang, doiKhoaChamCong, noiDanhMuc, chuyenDoi, daChuyen, pkCu: pk};
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.HAKLienKet = api;
})(typeof self !== 'undefined' ? self : this);
