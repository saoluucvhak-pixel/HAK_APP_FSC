/* DANH MỤC XE (bản 3.0). Hàm thuần.
 * db.dmXe = [{id: 'xe<N>', bks, ngayCapNhat, hanKiemDinh, hanBaoHiem, loaiXe, chuXeId, ngung}]
 *  - chuXeId: id NGƯỜI có vai trò Chủ xe (bảng con của thể nhân) hoặc id PHÁP NHÂN đứng tên xe (src/doituong.js). Lưu liên kết bằng ID.
 *  - BKS so khớp theo khóa chuẩn hóa (src/bks.js): mỗi xe một dòng; BKS nguồn giữ nguyên cách viết.
 *  - Nhập Excel: Chọn file → Xem trước (mới / trùng / thay đổi / lỗi; thay đổi chủ xe hiện cả hai) → Sửa hoặc bỏ dòng → Lưu danh mục. */
(function (root) {
  'use strict';
  const D = () => (typeof HAKDates !== 'undefined' ? HAKDates : (typeof require === 'function' ? require('./dates.js') : root.HAKDates));
  const B = () => (typeof require === 'function' ? require('./bks.js') : root.HAKBks);
  const NL = () => (typeof require === 'function' ? require('./nhaplieu.js') : root.HAKNhapLieu);   // quy tắc CCCD duy nhất (src/nhaplieu.js, phiếu #14): 9 hoặc 12 chữ số
  const DT = () => (typeof require === 'function' ? require('./doituong.js') : root.HAKDoiTuong);
  const s = v => String(v == null ? '' : v).replace(/\s+/g, ' ').trim();
  const so = v => String(v == null ? '' : v).replace(/\D/g, '');
  const clone = x => JSON.parse(JSON.stringify(x));
  const ngayOk = v => !s(v) || !!D().parse(s(v));
  const TRUONG = ['bks', 'ngayCapNhat', 'hanKiemDinh', 'hanBaoHiem', 'loaiXe', 'chuXeId'];
  const chuan = x => { const o = {id: s(x && x.id)}; TRUONG.forEach(k => { o[k] = s(x && x[k]); }); o.bks = o.bks.toUpperCase(); o.ngung = !!(x && x.ngung); return o; };
  const tim = (dm, id) => (dm || []).find(x => x.id === id) || null;
  const timBks = (dm, bks) => { const k = B().khoa(bks); return k ? (dm || []).find(x => B().khoa(x.bks) === k) || null : null; };
  const idMoi = dm => { const used = new Set((dm || []).map(x => x.id)); let k = used.size + 1; while (used.has('xe' + k)) k++; return 'xe' + k; };
  /* chủ xe: {loai: 'nguoi'|'phapnhan', ten, cccd|mst, dt, ng} hoặc null */
  function chuXe(dmDT, id) {
    if (!id) return null; const a = DT().timNguoi(dmDT, id); if (a) return {loai: 'nguoi', ten: a.ng.hoTen, cccd: a.ng.cccd, dt: a.dt, ng: a.ng, nhan: DT().nhanNguoi(a.dt, a.ng)};
    const p = DT().tim(dmDT, id); return p ? {loai: 'phapnhan', ten: p.ten, mst: p.mst, dt: p, ng: null, nhan: p.ten} : null;
  }
  /* các lựa chọn chủ xe: người có vai trò Chủ xe và pháp nhân (đang dùng) */
  const chonChuXe = dmDT => DT().nguoiTheoVaiTro(dmDT, 'chuXe').map(x => ({id: x.ng.id, nhan: x.nhan, loai: 'nguoi'}))
    .concat((dmDT || []).filter(o => o.loai === 'phapnhan' && !o.ngung).map(o => ({id: o.id, nhan: o.ten + ' (pháp nhân)', loai: 'phapnhan'})));
  function kiem(dm, x, dmDT) {
    const e = [], o = chuan(x);
    if (!o.bks) e.push('Thiếu BKS');
    const t = timBks(dm, o.bks); if (t && t.id !== o.id) e.push('BKS ' + o.bks + ' đã có trong danh mục (' + t.bks + ')');
    [['ngayCapNhat', 'ngày cập nhật'], ['hanKiemDinh', 'hạn kiểm định'], ['hanBaoHiem', 'hạn bảo hiểm']].forEach(([k, n]) => { if (!ngayOk(o[k])) e.push(n + ' “' + o[k] + '” không phải ngày có thật (dd/mm/yyyy)'); });
    if (o.chuXeId) { const c = chuXe(dmDT, o.chuXeId); if (!c) e.push('Chủ xe không còn trong Danh mục đối tượng'); else if (c.loai === 'nguoi' && !(c.ng.vaiTro && c.ng.vaiTro.chuXe)) e.push(c.ten + ' chưa có vai trò Chủ xe'); }
    return e;
  }
  function luu(dm, x, dmDT) {
    const list = clone(dm || []), o = chuan(x), errs = kiem(list, o, dmDT); if (errs.length) return {ok: false, errs, dm};
    if (!o.id) o.id = idMoi(list);
    const i = list.findIndex(y => y.id === o.id); if (i < 0) list.push(o); else list[i] = o;
    return {ok: true, errs: [], dm: list, xe: o};
  }
  /* xe hết hạn kiểm định / bảo hiểm so với ngày `ngay` (dd/mm/yyyy): ['kiểm định', 'bảo hiểm'] */
  function hetHan(x, ngay) { const t = D().parse(s(ngay)); if (!t) return []; const out = []; [['hanKiemDinh', 'kiểm định'], ['hanBaoHiem', 'bảo hiểm']].forEach(([k, n]) => { const h = D().parse(s(x[k])); if (h && h.key < t.key) out.push(n); }); return out; }

  /* ---------- nhập Excel ---------- */
  const COT = {'Ngày cập nhật': 'ngayCapNhat', 'Số BKS': 'bks', 'BKS': 'bks', 'Biển số xe': 'bks', 'Ngày hết hạn kiểm định': 'hanKiemDinh', 'Hạn kiểm định': 'hanKiemDinh',
    'Ngày hết hạn bảo hiểm': 'hanBaoHiem', 'Hạn bảo hiểm': 'hanBaoHiem', 'Loại xe': 'loaiXe', 'Chủ xe': 'chuXe', 'CCCD / MST chủ xe': 'chuXeSo'};
  /* chủ xe từ ô Excel: theo CCCD (người có vai trò Chủ xe) hoặc MST (pháp nhân); không có số thì theo tên, chỉ khi DUY NHẤT */
  function timChuXe(dmDT, ten, soDinhDanh) {
    const k = so(soDinhDanh), ds = chonChuXe(dmDT);
    if (k) {
      const a = DT().timCccd(dmDT, k); if (a) return a.ng.vaiTro && a.ng.vaiTro.chuXe ? {id: a.ng.id} : {loi: a.ng.hoTen + ' (CCCD ' + k + ') chưa có vai trò Chủ xe trong Danh mục đối tượng'};
      const p = (dmDT || []).find(o => o.loai === 'phapnhan' && so(o.mst) === k); if (p) return {id: p.id};
      return {loi: 'Không có chủ xe mang số ' + k + ' trong Danh mục đối tượng'};
    }
    if (!s(ten)) return {id: ''};
    const f = DT().fold, m = ds.filter(x => f(x.nhan.replace(/ \(pháp nhân\)$/, '').replace(/^.* — /, '')) === f(ten));
    return m.length === 1 ? {id: m[0].id} : {loi: m.length ? 'Có ' + m.length + ' chủ xe tên “' + s(ten) + '”: ghi CCCD / MST để chọn đúng' : 'Chủ xe “' + s(ten) + '” chưa có trong Danh mục đối tượng (vai trò Chủ xe hoặc pháp nhân)'};
  }
  /* rows: [{tiêu đề: giá trị}] → {dong: [{so, xe, trangThai: 'moi'|'trung'|'doi'|'loi', loi: [], cu, chuXeCu, chuXeMoi}]} */
  function docExcel(rows, dm, dmDT) {
    const out = [], daThay = new Map();
    (rows || []).forEach((r0, i) => {
      const r = {}; Object.entries(r0 || {}).forEach(([h, v]) => { const k = COT[s(h)]; if (k) r[k] = s(v); });
      if (!Object.values(r).some(Boolean)) return;
      const loi = [], c = timChuXe(dmDT, r.chuXe, r.chuXeSo); if (c.loi) loi.push(c.loi);
      const cu = timBks(dm, r.bks), x = chuan({id: cu ? cu.id : '', bks: r.bks, ngayCapNhat: r.ngayCapNhat, hanKiemDinh: r.hanKiemDinh, hanBaoHiem: r.hanBaoHiem, loaiXe: r.loaiXe, chuXeId: c.id || (cu && !s(r.chuXe) && !s(r.chuXeSo) ? cu.chuXeId : '')});
      kiem((dm || []).filter(y => !cu || y.id !== cu.id), x, dmDT).filter(e => !/Chủ xe/.test(e) || !c.loi).forEach(e => loi.push(e));
      const kb = B().khoa(x.bks); if (kb && daThay.has(kb)) loi.push('BKS trùng với dòng ' + daThay.get(kb) + ' trong cùng file'); if (kb) daThay.set(kb, i + 2);
      const tt = loi.length ? 'loi' : !cu ? 'moi' : JSON.stringify(chuan(cu)) === JSON.stringify(x) ? 'trung' : 'doi';
      const cx = id => { const v = chuXe(dmDT, id); return v ? v.nhan + (v.cccd ? ' · CCCD ' + v.cccd : v.mst ? ' · MST ' + v.mst : '') : ''; };
      out.push({so: i + 2, xe: x, trangThai: tt, loi, cu: cu ? chuan(cu) : null, chuXeCu: cu ? cx(cu.chuXeId) : '', chuXeMoi: cx(x.chuXeId), khacChuXe: !!(cu && cu.chuXeId && x.chuXeId && cu.chuXeId !== x.chuXeId)});
    });
    return {dong: out};
  }
  /* lưu các dòng được chọn (mới / thay đổi; đã sửa ở xem trước) vào danh mục: {ok, dm, them, sua, loi} */
  function apDungExcel(dm, dong, dmDT) {
    let list = clone(dm || []), them = 0, sua = 0; const loi = [];
    (dong || []).filter(d => d.trangThai === 'moi' || d.trangThai === 'doi').forEach(d => { const r = luu(list, d.xe, dmDT); if (!r.ok) { loi.push('Dòng ' + d.so + ': ' + r.errs.join('; ')); return; } list = r.dm; if (d.cu) sua++; else them++; });
    return {ok: !loi.length, dm: list, them, sua, loi};
  }

  /* ---------- chuyển từ danh mục xe cũ (dmXeVC, nhiều dòng theo ngày) ---------- */
  /* mỗi BKS một xe theo dòng mới nhất; chủ xe nối theo CCCD chủ xe (người có vai trò Chủ xe), không có thì Cần đối chiếu. Trả {dm, canDoiChieu}. */
  function tuDanhMucCu(dmXeVC, dmDT, hienCo) {
    const dm = clone(hienCo || []), can = [], dates = D(), nk = v => { const p = dates.parse(s(v)); return p ? p.key : 0; };
    const by = new Map(); (dmXeVC || []).forEach((r, i) => { if (!r) return; const k = B().khoa(r.bienSo); if (!k) return; const c = by.get(k); if (!c || nk(r.ngayCapNhat) >= nk(c.ngayCapNhat)) by.set(k, r); });
    by.forEach(r => {
      if (timBks(dm, r.bienSo)) return;
      let chu = ''; const k = so(r.cccd);
      if (NL().cccdHopLe(k)) { const a = DT().timCccd(dmDT, k); if (a) chu = a.ng.id; }
      if (!chu && s(r.chuXe)) can.push({loai: 'xe', ref: s(r.bienSo), lyDo: 'Xe ' + s(r.bienSo) + ': chủ xe “' + s(r.chuXe) + '” chưa xác định được hồ sơ (thiếu CCCD 9 hoặc 12 số): chọn chủ xe ở Danh mục xe', goc: {bienSo: r.bienSo, chuXe: r.chuXe}});
      dm.push(chuan({id: idMoi(dm), bks: s(r.bienSo), ngayCapNhat: s(r.ngayCapNhat), hanKiemDinh: s(r.hanDangKiem), hanBaoHiem: s(r.hanBaoHiem), loaiXe: s(r.loaiXe), chuXeId: chu}));
    });
    return {dm, canDoiChieu: can};
  }
  const api = {COT, chuan, tim, timBks, idMoi, chuXe, chonChuXe, kiem, luu, hetHan, timChuXe, docExcel, apDungExcel, tuDanhMucCu};
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.HAKXeDM = api;
})(typeof self !== 'undefined' ? self : this);
