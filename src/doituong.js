/* DANH MỤC ĐỐI TƯỢNG (bản 3.0; docs/THIET_KE_3_0.md). Hàm thuần, dùng chung ở giao diện, tiến trình chính và kiểm thử Node.
 *
 * db.dmDoiTuong = [{id, ma, ten, loai: 'phapnhan'|'thenhan', mst, diaChi, sdt, kyHD: {vanChuyen, nhanCong}, daiDien, chucVuDaiDien, ngung, ngayCapNhat,
 *                   nguoi: [{id, hoTen, cccd, ngayCap, noiCap, hanCccd, diaChi, gioiTinh, ngaySinh, sdt, gplx, hanGplx, viTriId, chucDanhKy,
 *                            vaiTro: {nhanCong, taiXe, chuXe}, kyHD: {vanChuyen, nhanCong}, ngung}]}]
 *  - Pháp nhân: địa chỉ = trụ sở; ký hợp đồng qua người đại diện (daiDien, chucVuDaiDien). Thể nhân: địa chỉ = thường trú; bảng con “Đối tác” (nguoi) là từng người.
 *  - MỘT NGƯỜI MỘT HỒ SƠ: một người có thể vừa Nhân công, vừa Tài xế, vừa Chủ xe (vaiTro); CCCD không trùng giữa các hồ sơ.
 *  - Quyền ký hợp đồng (kyHD) quản lý riêng: pháp nhân khai ở đối tượng; thể nhân khai ở từng người (người đứng tên ký).
 *  - Mã định danh (mã đối tượng, MST, CCCD, GPLX, SĐT) luôn là VĂN BẢN (giữ số 0 đầu).
 * Mọi hàm không sửa đầu vào trừ khi ghi rõ. */
(function (root) {
  'use strict';
  const D = () => (typeof HAKDates !== 'undefined' ? HAKDates : (typeof require === 'function' ? require('./dates.js') : root.HAKDates));
  const s = v => String(v == null ? '' : v).replace(/\s+/g, ' ').trim();
  const so = v => String(v == null ? '' : v).replace(/\D/g, '');
  const NL = () => (typeof require === 'function' ? require('./nhaplieu.js') : root.HAKNhapLieu);   // quy tắc CCCD duy nhất (src/nhaplieu.js, phiếu #14): 9 hoặc 12 chữ số
  const fold = v => s(v).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();
  const clone = x => JSON.parse(JSON.stringify(x));
  const LOAI = {phapnhan: 'Pháp nhân', thenhan: 'Thể nhân'};
  const VAI_TRO = {nhanCong: 'Nhân công', taiXe: 'Tài xế', chuXe: 'Chủ xe'};
  const KY = {vanChuyen: 'Vận chuyển', nhanCong: 'Nhân công'};
  const ngayOk = v => !s(v) || !!D().parse(s(v));
  const coCo = o => ({vanChuyen: !!(o && o.vanChuyen), nhanCong: !!(o && o.nhanCong)});
  const vaiCo = o => ({nhanCong: !!(o && o.nhanCong), taiXe: !!(o && o.taiXe), chuXe: !!(o && o.chuXe)});
  const kyText = k => (k.vanChuyen && k.nhanCong ? 'Vận chuyển, Nhân công' : k.vanChuyen ? 'Vận chuyển' : k.nhanCong ? 'Nhân công' : 'Không');
  const vaiText = v => Object.keys(VAI_TRO).filter(k => v && v[k]).map(k => VAI_TRO[k]).join(', ');

  /* ---------- chuẩn hóa ---------- */
  const NGUOI_TRUONG = ['hoTen', 'cccd', 'ngayCap', 'noiCap', 'hanCccd', 'diaChi', 'gioiTinh', 'ngaySinh', 'sdt', 'gplx', 'hanGplx', 'viTriId', 'chucDanhKy'];
  /* PR B: chucVu / nganh (mảng id) là trường TÙY CHỌN — chỉ ghi khi khác rỗng để JSON, dấu vân tay và delta của dữ liệu cũ giữ y hệt */
  function tuyChon(o, src) { ['chucVu', 'nganh'].forEach(k => { const a = Array.isArray(src && src[k]) ? src[k].map(s).filter(Boolean) : []; if (a.length) o[k] = [...new Set(a)]; }); }
  function chuanNguoi(p) {
    const o = {id: s(p && p.id)}; NGUOI_TRUONG.forEach(k => { o[k] = s(p && p[k]); });
    o.cccd = so(o.cccd) || o.cccd; o.vaiTro = vaiCo(p && p.vaiTro); o.kyHD = coCo(p && p.kyHD); o.ngung = !!(p && p.ngung); tuyChon(o, p); return o;
  }
  function chuan(dt) {
    const mstRaw = s(dt && dt.mst).replace(/\s/g, ''), mst = /^\d{13}$/.test(mstRaw) ? mstRaw.slice(0, 10) + '-' + mstRaw.slice(10) : mstRaw;
    const o = {id: s(dt && dt.id), ma: s(dt && dt.ma), ten: s(dt && dt.ten), loai: dt && dt.loai === 'phapnhan' ? 'phapnhan' : 'thenhan', mst, diaChi: s(dt && dt.diaChi), sdt: s(dt && dt.sdt),
      kyHD: coCo(dt && dt.kyHD), daiDien: s(dt && dt.daiDien), chucVuDaiDien: s(dt && dt.chucVuDaiDien), ngung: !!(dt && dt.ngung), ngayCapNhat: s(dt && dt.ngayCapNhat), nguonCu: s(dt && dt.nguonCu),
      nguoi: ((dt && dt.nguoi) || []).map(chuanNguoi)};
    tuyChon(o, dt);
    if (o.loai === 'phapnhan') o.nguoi = o.nguoi.filter(p => s(p.hoTen));   // pháp nhân: không dùng bảng con người (đại diện khai ở đối tượng); giữ người đã có (tài xế của công ty)
    return o;
  }

  /* ---------- ID và mã ---------- */
  const tatCaNguoi = dm => (dm || []).flatMap(dt => (dt.nguoi || []).map(ng => ({dt, ng})));
  function idDoiTuong(dm) { const used = new Set((dm || []).map(x => x.id)); let k = used.size + 1; while (used.has('dt' + k)) k++; return 'dt' + k; }
  function idNguoi(dm, them) { const used = new Set(tatCaNguoi(dm).map(x => x.ng.id).concat(them || [])); let k = used.size + 1; while (used.has('ng' + k)) k++; return 'ng' + k; }
  function maMoi(dm) { const used = new Set((dm || []).map(x => s(x.ma).toUpperCase())); let k = (dm || []).length + 1; while (used.has('DT' + String(k).padStart(4, '0'))) k++; return 'DT' + String(k).padStart(4, '0'); }

  /* ---------- truy vấn ---------- */
  const tim = (dm, id) => (dm || []).find(x => x.id === id) || null;
  const timNguoi = (dm, id) => { for (const dt of dm || []) { const ng = (dt.nguoi || []).find(p => p.id === id); if (ng) return {dt, ng}; } return null; };
  const timCccd = (dm, cccd) => { const k = so(cccd); return k ? tatCaNguoi(dm).find(x => so(x.ng.cccd) === k) || null : null; };
  /* nhãn một người cho bộ chọn: tên đối tượng và họ tên khi khác nhau (một đối tượng nhiều người) */
  const nhanNguoi = (dt, ng) => (dt.nguoi || []).length > 1 || fold(dt.ten) !== fold(ng.hoTen) ? dt.ten + ' — ' + ng.hoTen : ng.hoTen;
  /* mọi người đang dùng có chức vụ `vai` (nhanCong | taiXe | chuXe): [{dt, ng, nhan}] */
  const nguoiTheoVaiTro = (dm, vai) => tatCaNguoi(dm).filter(x => !x.dt.ngung && !x.ng.ngung && x.ng.vaiTro && x.ng.vaiTro[vai]).map(x => Object.assign(x, {nhan: nhanNguoi(x.dt, x.ng)}))
    .sort((a, b) => a.nhan.localeCompare(b.nhan, 'vi'));
  /* bên ký được loại hợp đồng `loai` (vanChuyen | nhanCong): pháp nhân có quyền ký (qua người đại diện) và người (thể nhân) có quyền ký. [{dt, ng|null, nhan, daiDien, chucVu}] */
  function benKy(dm, loai) {
    const out = [];
    (dm || []).filter(dt => !dt.ngung).forEach(dt => {
      if (dt.loai === 'phapnhan') { if (dt.kyHD && dt.kyHD[loai]) out.push({dt, ng: null, nhan: dt.ten + (dt.daiDien ? ' (đại diện: ' + dt.daiDien + (dt.chucVuDaiDien ? ', ' + dt.chucVuDaiDien : '') + ')' : ''), daiDien: dt.daiDien, chucVu: dt.chucVuDaiDien}); return; }
      (dt.nguoi || []).filter(ng => !ng.ngung && ((ng.kyHD && ng.kyHD[loai]) || (dt.kyHD && dt.kyHD[loai] && (dt.nguoi || []).length === 1))).forEach(ng => out.push({dt, ng, nhan: nhanNguoi(dt, ng), daiDien: ng.hoTen, chucVu: ng.chucDanhKy}));
    });
    return out.sort((a, b) => a.nhan.localeCompare(b.nhan, 'vi'));
  }
  /* lọc danh sách đối tượng theo nghiệp vụ (MISA): 'tatca' | 'doitac' (có quyền ký) | 'nhancong' | 'taixe' | 'chuxe' | 'ngung'; q: chữ tìm (tên, mã, MST, CCCD, SĐT, họ tên người) */
  function loc(dm, nhom, q) {
    const w = fold(q).split(/\s+/).filter(Boolean);
    return (dm || []).filter(dt => {
      if (nhom === 'ngung') { if (!dt.ngung) return false; } else if (dt.ngung) return false;
      const ng = dt.nguoi || [];
      if (nhom === 'doitac' && !((dt.kyHD && (dt.kyHD.vanChuyen || dt.kyHD.nhanCong)) || ng.some(p => p.kyHD && (p.kyHD.vanChuyen || p.kyHD.nhanCong)))) return false;
      if (nhom === 'nhancong' && !ng.some(p => p.vaiTro && p.vaiTro.nhanCong)) return false;
      if (nhom === 'taixe' && !ng.some(p => p.vaiTro && p.vaiTro.taiXe)) return false;
      if (nhom === 'chuxe' && !(ng.some(p => p.vaiTro && p.vaiTro.chuXe) || dt.loai === 'phapnhan')) return false;
      if (!w.length) return true;
      const t = fold([dt.ma, dt.ten, dt.mst, dt.sdt, dt.diaChi].concat(ng.flatMap(p => [p.hoTen, p.cccd, p.sdt, p.gplx])).join(' '));
      return w.every(x => t.includes(x));
    });
  }

  /* ---------- kiểm tra và lưu ---------- */
  /* lỗi của MỘT đối tượng so với danh mục (trùng mã, MST, CCCD với hồ sơ khác; trường bắt buộc; ngày không có thật). Trả [chuỗi]. */
  function kiem(dm, dt) {
    const e = [], x = chuan(dt), khac = (dm || []).filter(o => o.id !== x.id);
    if (!x.ten) e.push('Thiếu tên đối tượng');
    if (x.ma && khac.some(o => s(o.ma).toUpperCase() === x.ma.toUpperCase())) e.push('Mã đối tượng ' + x.ma + ' đã dùng cho hồ sơ khác');
    if (x.mst && khac.some(o => so(o.mst) && so(o.mst) === so(x.mst))) e.push('Mã số thuế ' + x.mst + ' đã có ở hồ sơ khác');
    if (x.mst && !/^\d{10}(-?\d{3})?$/.test(x.mst.replace(/\s/g, ''))) e.push('Mã số thuế phải có 10 hoặc 13 chữ số');
    if (x.loai === 'phapnhan' && (x.kyHD.vanChuyen || x.kyHD.nhanCong) && !x.daiDien) e.push('Pháp nhân có quyền ký hợp đồng phải khai người đại diện');
    if (x.loai === 'thenhan' && !x.nguoi.length) e.push('Thể nhân phải có ít nhất một người trong phần Thông tin cá nhân');
    const cccdLo = new Map();
    x.nguoi.forEach((p, i) => {
      const lb = 'Người ' + (i + 1) + (p.hoTen ? ' (' + p.hoTen + ')' : '');
      if (!p.hoTen) e.push(lb + ': thiếu họ tên');
      if (p.cccd && !NL().cccdHopLe(p.cccd)) e.push(lb + ': CCCD phải gồm 9 hoặc 12 chữ số');
      if (p.cccd) { if (cccdLo.has(p.cccd)) e.push(lb + ': trùng CCCD với người khác trong cùng hồ sơ'); cccdLo.set(p.cccd, 1); const o = timCccd(khac, p.cccd); if (o) e.push(lb + ': CCCD ' + p.cccd + ' đã có ở hồ sơ “' + o.dt.ten + '” (một người một hồ sơ: thêm chức vụ ở hồ sơ đó)'); }
      [['ngayCap', 'ngày cấp'], ['hanCccd', 'hạn CCCD'], ['ngaySinh', 'ngày sinh'], ['hanGplx', 'hạn GPLX']].forEach(([k, t]) => { if (!ngayOk(p[k])) e.push(lb + ': ' + t + ' “' + p[k] + '” không phải ngày có thật (dd/mm/yyyy)'); });
      if (p.vaiTro.taiXe && !p.gplx) e.push(lb + ': tài xế phải có số giấy phép lái xe');
    });
    return e;
  }
  /* CẢNH BÁO (không chặn lưu) — phiếu #05:
   *  - ND-06: thể nhân chưa có CCCD / pháp nhân chưa có MST mà trùng tên (không phân biệt hoa thường, dấu) với hồ sơ cùng loại khác;
   *  - ND-09: người có chức vụ Nhân công / Tài xế thiếu ngày sinh, ngày cấp, nơi cấp, địa chỉ thường trú (lô sẽ đòi khi chọn vào đội / xe). Trả [chuỗi]. */
  function canhBao(dm, dt) {
    const w = [], x = chuan(dt), khac = (dm || []).filter(o => o && o.id !== x.id && o.loai === x.loai && fold(o.ten) && fold(o.ten) === fold(x.ten));
    const coKhoa = x.loai === 'phapnhan' ? !!so(x.mst) : x.nguoi.some(p => p.cccd);
    if (!coKhoa && khac.length) w.push((x.loai === 'phapnhan' ? 'Pháp nhân chưa có mã số thuế' : 'Thể nhân chưa có CCCD') + ' và trùng tên với ' + khac.map(o => '“' + o.ten + '” (mã ' + (o.ma || '?') + ')').join(', ') +
      ': kiểm tra có phải cùng một đối tượng không; nếu đúng, sửa hồ sơ cũ thay vì thêm mới');
    const sdtHopLe = v => !s(v) || /^[0-9 .()+\-]{8,20}$/.test(s(v));
    if (!sdtHopLe(x.sdt)) w.push('Số điện thoại đối tượng “' + x.sdt + '” chưa đúng định dạng (8–20 ký tự số)');
    x.nguoi.forEach((p, i) => {
      if (!sdtHopLe(p.sdt)) w.push('Người ' + (i + 1) + (p.hoTen ? ' (' + p.hoTen + ')' : '') + ': số điện thoại “' + p.sdt + '” chưa đúng định dạng');
      if (!(p.vaiTro && (p.vaiTro.nhanCong || p.vaiTro.taiXe))) return;
      const thieu = [['ngaySinh', 'ngày sinh'], ['ngayCap', 'ngày cấp'], ['noiCap', 'nơi cấp'], ['diaChi', 'địa chỉ thường trú']].filter(([k]) => !s(p[k])).map(([, t]) => t);
      if (thieu.length) w.push('Người ' + (i + 1) + (p.hoTen ? ' (' + p.hoTen + ')' : '') + ': thiếu ' + thieu.join(', ') + ' — lô sẽ đòi khi chọn vào ' + (p.vaiTro.nhanCong ? 'đội khai thác' : 'xe vận chuyển'));
    });
    return w;
  }
  /* lưu (thêm mới khi chưa có id) — trả {ok, errs, canhBao, dm: danh mục mới, dt} */
  function luu(dm, dt, homNay) {
    const list = clone(dm || []), x = chuan(dt);
    const errs = kiem(list, x); if (errs.length) return {ok: false, errs, canhBao: [], dm: dm, dt: x};
    const cb = canhBao(list, x);
    if (!x.id) x.id = idDoiTuong(list);
    if (!x.ma) x.ma = maMoi(list);
    const moi = []; x.nguoi.forEach(p => { if (!p.id) { p.id = idNguoi(list.filter(o => o.id !== x.id).concat([x]), moi); moi.push(p.id); } });
    x.ngayCapNhat = s(homNay) || x.ngayCapNhat;
    const i = list.findIndex(o => o.id === x.id); if (i < 0) list.push(x); else list[i] = x;
    return {ok: true, errs: [], canhBao: cb, dm: list, dt: x};
  }
  /* ---------- người / xe MỚI nhập trong lô → Danh mục (phiếu #05, ND-05) ----------
   * Lưu lô KHÔNG ghi danh mục cũ (dmLaoDong, dmXeVC). Giao diện hỏi rồi mới thêm vào Danh mục đối tượng / Danh mục xe.
   * moiTuLo: dòng nhân công chưa nối danh mục (không nguoiId), có họ tên và CCCD 9/12 số chưa có ở danh mục; dòng xe chưa nối (không xeId), BKS chưa có ở Danh mục xe. */
  const XEDM = () => (typeof require === 'function' ? require('./xedm.js') : root.HAKXeDM);
  const BKS = () => (typeof require === 'function' ? require('./bks.js') : root.HAKBks);
  function moiTuLo(dmDT, dmXe, nc, dx) {
    const nguoi = [], xe = [], daC = new Set(), daB = new Set();
    (nc || []).forEach(r => { if (!r || s(r.nguoiId)) return; const c = so(r.cccd); if (!NL().cccdHopLe(r.cccd) || !s(r.ten) || daC.has(c) || timCccd(dmDT, c)) return; daC.add(c); nguoi.push(r); });
    (dx || []).forEach(r => { if (!r || s(r.xeId)) return; const k = BKS().khoa(r.bienSo); if (!k || daB.has(k) || XEDM().timBks(dmXe, r.bienSo)) return; daB.add(k); xe.push(r); });
    return {nguoi, xe};
  }
  /* thêm các dòng moi (kết quả moiTuLo) vào danh mục. Trả {dmDoiTuong, dmXe, nguoi: [{r, id}], xe: [{r, id}], loi: [chuỗi]} — KHÔNG sửa đầu vào */
  function themTuLo(dmDT, dmXe, moi, homNay) {
    let dt = clone(dmDT || []), dx = clone(dmXe || []); const nguoi = [], xe = [], loi = [];
    ((moi && moi.nguoi) || []).forEach(r => {
      const g = s(r.danhXung) === 'Bà' ? 'Nữ' : s(r.danhXung) === 'Ông' ? 'Nam' : '';
      const k = luu(dt, {loai: 'thenhan', ten: s(r.ten), diaChi: s(r.diaChi), sdt: s(r.sdt), nguoi: [{hoTen: s(r.ten), cccd: so(r.cccd), ngaySinh: s(r.ngaySinh), ngayCap: s(r.ngayCap), noiCap: s(r.noiCap), diaChi: s(r.diaChi), sdt: s(r.sdt), gioiTinh: g, vaiTro: {nhanCong: true}}]}, homNay);
      if (k.ok) { dt = k.dm; nguoi.push({r, id: k.dt.nguoi[0].id}); } else loi.push(s(r.ten) + ': ' + k.errs.join('; '));
    });
    ((moi && moi.xe) || []).forEach(r => {
      const a = so(r.cccd) ? timCccd(dt, r.cccd) : null, chu = a && a.ng.vaiTro && a.ng.vaiTro.chuXe ? a.ng.id : '';   // chủ xe chỉ nối khi đã có hồ sơ người mang chức vụ Chủ xe
      const k = XEDM().luu(dx, {bks: s(r.bienSo), ngayCapNhat: s(homNay), hanKiemDinh: s(r.kdDen), hanBaoHiem: s(r.hanBH), loaiXe: s(r.loaiXe), chuXeId: chu}, dt);
      if (k.ok) { dx = k.dm; xe.push({r, id: k.xe.id}); } else loi.push('Xe ' + s(r.bienSo) + ': ' + k.errs.join('; '));
    });
    return {dmDoiTuong: dt, dmXe: dx, nguoi, xe, loi};
  }
  /* ngừng / dùng lại (không xóa: hồ sơ cũ vẫn tra được) */
  function ngung(dm, id, co) { const list = clone(dm || []), dt = tim(list, id); if (!dt) return {ok: false, error: 'Không có đối tượng này'}; dt.ngung = co !== false; return {ok: true, dm: list}; }

  /* ---------- nhập Excel (Danh mục đối tượng) ---------- */
  /* Một dòng Excel = một người (thể nhân) hoặc một pháp nhân (để trống họ tên). Các dòng cùng Mã đối tượng (hoặc cùng tên thể nhân khi trống mã) gộp thành một đối tượng.
   * Cột: tiêu đề → trường. Giá trị luôn đọc là VĂN BẢN. */
  const COT = {'Mã đối tượng': 'ma', 'Tên đối tượng': 'ten', 'Loại': 'loai', 'Mã số thuế': 'mst', 'Địa chỉ': 'diaChi', 'Số điện thoại': 'sdt', 'Ký hợp đồng': 'kyHD',
    'Người đại diện': 'daiDien', 'Chức vụ người đại diện': 'chucVuDaiDien', 'Họ tên': 'hoTen', 'CCCD': 'cccd', 'Ngày cấp': 'ngayCap', 'Nơi cấp': 'noiCap', 'Hạn CCCD': 'hanCccd',
    'Thường trú': 'diaChiNg', 'Giới tính': 'gioiTinh', 'Ngày sinh': 'ngaySinh', 'SĐT người': 'sdtNg', 'Số GPLX': 'gplx', 'Hạn GPLX': 'hanGplx', 'Vị trí mặc định': 'viTri',
    'Chức danh khi ký': 'chucDanhKy', 'Vai trò': 'vaiTro', 'Chức vụ': 'vaiTro', 'Người ký': 'nguoiKy'};
  const yesKy = v => {
    const t = fold(v);
    if (/^(khong|khong co|no|0|false|-+)$/.test(t)) return {vanChuyen: false, nhanCong: false};
    const both = /ca hai|ca 2/.test(t) || /^(co|x|1|yes|true|ok)$/.test(t);
    return {vanChuyen: both || /van chuyen/.test(t), nhanCong: both || /nhan cong/.test(t)};
  };
  const laNguoiKy = v => {
    const t = fold(v);
    if (!t || /^(khong|khong co|no|0|false|-+)$/.test(t)) return false;
    return /^(co|x|1|yes|true|ok|nguoi ky|ky)$/.test(t) || /van chuyen|nhan cong|ca hai|ca 2/.test(t);
  };
  const yesVai = v => { const t = fold(v); return {nhanCong: /nhan cong|lao dong/.test(t), taiXe: /tai xe/.test(t), chuXe: /chu xe/.test(t)}; };
  /* rows: [{tiêu đề: giá trị}]; vt: danh mục vị trí (tên → id). Trả {doiTuong: [{dt, dong: [số dòng], trangThai: 'moi'|'trung'|'doi'|'loi', loi: [], canhBao: [], cu}], loi: []} */
  function docExcel(rows, dm, vt) {
    const nhom = new Map(), loiChung = [];
    (rows || []).forEach((r0, i) => {
      const r = {}; Object.entries(r0 || {}).forEach(([h, v]) => { const k = COT[s(h)]; if (k) r[k] = k === 'mst' ? s(NL().mstTuSo(typeof v === 'string' ? s(v) : v)) : s(v); });   // MST: ô số Excel/Sheets mất số 0 đầu (9 → 10, 12 → 13 số)
      if (!Object.values(r).some(Boolean)) return;
      const dong = i + 2, loai = /phap/.test(fold(r.loai)) ? 'phapnhan' : 'thenhan';
      const khoa = r.ma ? 'ma:' + r.ma.toUpperCase() : loai === 'phapnhan' ? (so(r.mst) ? 'mst:' + so(r.mst) : 'ten:' + fold(r.ten)) : 'ten:' + fold(r.ten || r.hoTen) + '|' + so(r.cccd);
      let g = nhom.get(khoa);
      if (!g) { g = {dt: {ma: r.ma, ten: r.ten || r.hoTen, loai, mst: r.mst, diaChi: r.diaChi || (loai === 'thenhan' ? r.diaChiNg : ''), sdt: r.sdt, kyHD: yesKy(r.kyHD), daiDien: r.daiDien, chucVuDaiDien: r.chucVuDaiDien, nguoi: []}, dong: []}; nhom.set(khoa, g); }
      g.dong.push(dong);
      if (r.hoTen) {
        const v = vt && r.viTri ? (vt.find(x => fold(x.ten) === fold(r.viTri)) || null) : null;
        const nk = s(r.nguoiKy) ? (laNguoiKy(r.nguoiKy) ? (/van chuyen|nhan cong|ca hai|ca 2/.test(fold(r.nguoiKy)) ? yesKy(r.nguoiKy) : (g.dt.kyHD.vanChuyen || g.dt.kyHD.nhanCong ? g.dt.kyHD : {vanChuyen: true, nhanCong: true})) : {vanChuyen: false, nhanCong: false}) : {vanChuyen: false, nhanCong: false};
        g.dt.nguoi.push({hoTen: r.hoTen, cccd: r.cccd, ngayCap: r.ngayCap, noiCap: r.noiCap, hanCccd: r.hanCccd, diaChi: r.diaChiNg, gioiTinh: r.gioiTinh, ngaySinh: r.ngaySinh, sdt: r.sdtNg,
          gplx: r.gplx, hanGplx: r.hanGplx, viTriId: v ? v.id : '', chucDanhKy: r.chucDanhKy, vaiTro: yesVai(r.vaiTro), kyHD: nk, _viTriTen: v ? '' : r.viTri});
      }
    });
    const out = [], seenCccdFile = new Map(), seenTenFile = new Map();
    nhom.forEach(g => {
      const loi = [], dt = g.dt;
      dt.nguoi.forEach(p => { if (p._viTriTen) loi.push('Vị trí “' + p._viTriTen + '” chưa có trong danh mục vị trí (Định mức nhân công)'); delete p._viTriTen; });
      // đối chiếu với danh mục: theo mã, MST (pháp nhân) hoặc CCCD của người đầu tiên
      const cu = (dt.ma && (dm || []).find(o => s(o.ma).toUpperCase() === dt.ma.toUpperCase())) || (dt.loai === 'phapnhan' && so(dt.mst) && (dm || []).find(o => so(o.mst) === so(dt.mst))) ||
        (dt.nguoi.length && dt.nguoi[0].cccd && (timCccd(dm, dt.nguoi[0].cccd) || {}).dt) || null;
      if (cu) { dt.id = cu.id; dt.ma = dt.ma || cu.ma; dt.nguoi.forEach(p => { const o = p.cccd && (cu.nguoi || []).find(x => so(x.cccd) === so(p.cccd)); if (o) p.id = o.id; }); }
      // CCCD đã có mà họ tên khác: không tự ghi đè (có thể gõ nhầm số), báo để đối chiếu
      dt.nguoi.forEach(p => { const o = p.cccd && timCccd(dm, p.cccd); if (o && fold(o.ng.hoTen) !== fold(p.hoTen)) loi.push('CCCD ' + so(p.cccd) + ' đã có ở hồ sơ “' + o.dt.ten + '” với họ tên “' + o.ng.hoTen + '”, khác “' + p.hoTen + '” trong file: đối chiếu trước khi nhập'); });
      // Lô 8 (T-17): kiểm trùng CCCD và cùng tên có/không CCCD ngay giữa các dòng trong cùng file Excel
      dt.nguoi.forEach(p => {
        const c = so(p.cccd), fn = fold(p.hoTen);
        if (c) {
          if (seenCccdFile.has(c)) loi.push('CCCD ' + c + ' trùng với dòng ' + seenCccdFile.get(c).dong.join(', ') + ' (' + seenCccdFile.get(c).ten + ') trong cùng file Excel');
          else seenCccdFile.set(c, {dong: g.dong, ten: p.hoTen || dt.ten});
        }
        if (fn) {
          const prev = seenTenFile.get(fn);
          if (prev && (!!prev.cccd !== !!c)) loi.push('Người “' + p.hoTen + '” trùng họ tên với dòng ' + prev.dong.join(', ') + ' trong file nhưng một dòng có CCCD, một dòng không có CCCD: kiểm tra gộp thành một dòng');
          else if (!prev) seenTenFile.set(fn, {dong: g.dong, cccd: c});
        }
      });
      const ds = (dm || []).filter(o => !cu || o.id !== cu.id);
      kiem(ds, dt).forEach(x => loi.push(x));
      const cb = canhBao(ds, dt);
      const x = chuan(dt), tt = loi.length ? 'loi' : !cu ? 'moi' : JSON.stringify(chuan(Object.assign({}, cu, {ngayCapNhat: ''}))) === JSON.stringify(Object.assign(x, {ngayCapNhat: ''})) ? 'trung' : 'doi';
      out.push({dt: x, dong: g.dong, trangThai: tt, loi, canhBao: cb, cu: cu ? chuan(cu) : null});
    });
    return {doiTuong: out, loi: loiChung};
  }
  /* áp dụng các mục đã chọn của xem trước (mới, thay đổi) vào danh mục: {ok, dm, them, sua, loi} — mục lỗi / trùng bỏ qua */
  function apDungExcel(dm, muc, homNay) {
    let list = clone(dm || []), them = 0, sua = 0; const loi = [];
    (muc || []).filter(m => m.trangThai === 'moi' || m.trangThai === 'doi').forEach(m => {
      const goc = m.dt.id ? tim(list, m.dt.id) : null, dt = goc ? Object.assign({}, goc, m.dt, {nguoi: (goc.nguoi || []).filter(p => !m.dt.nguoi.some(q => q.id === p.id)).concat(m.dt.nguoi)}) : m.dt;
      const r = luu(list, dt, homNay); if (!r.ok) { loi.push((m.dt.ten || '') + ': ' + r.errs.join('; ')); return; }
      list = r.dm; if (goc) sua++; else them++;
    });
    return {ok: !loi.length, dm: list, them, sua, loi};
  }

  /* ---------- chủ rừng chọn từ Danh mục đối tượng (phiếu #09, ND-08) ----------
   * Chủ rừng là một người (thể nhân) của danh mục: chọn thì điền sẵn họ tên, danh xưng, CCCD, ngày cấp, nơi cấp, địa chỉ (thường trú của người, không có thì của hồ sơ).
   * Hồ sơ chủ rừng giữ BẢN CHỤP các trường đó (info.*) và id người đã chọn (info.nguoiDmId): sửa danh mục sau không làm đổi hồ sơ đã lưu. Vẫn nhập tay được. */
  function chupChuRung(dm, ngId) {
    const m = timNguoi(dm, ngId); if (!m) return null; const dt = m.dt, ng = m.ng;
    return {nguoiDmId: ng.id, danhXung: ng.gioiTinh === 'Nữ' ? 'Bà' : ng.gioiTinh === 'Nam' ? 'Ông' : '', ten: s(ng.hoTen), cccd: s(ng.cccd), ngayCap: s(ng.ngayCap), noiCap: s(ng.noiCap), diaChi: s(ng.diaChi) || s(dt.diaChi), sdt: s(ng.sdt) || s(dt.sdt)};
  }
  /* người của danh mục để chọn làm chủ rừng (bỏ người / hồ sơ ngừng): [{id, nhan}] sắp theo tên */
  const nguoiChonChuRung = dm => tatCaNguoi(dm).filter(x => !x.dt.ngung && !x.ng.ngung).map(x => ({id: x.ng.id, nhan: nhanNguoi(x.dt, x.ng) + (s(x.ng.cccd) ? ' · CCCD ' + s(x.ng.cccd) : '')})).sort((a, b) => a.nhan.localeCompare(b.nhan, 'vi'));
  /* CCCD nhập tay trùng một người của danh mục (không phải người đã chọn ở ô chọn): trả {dt, ng} để cảnh báo (không chặn); null nếu không trùng */
  const trungDanhMuc = (dm, cccd, nguoiDmId) => { const m = timCccd(dm, cccd); return m && m.ng.id !== s(nguoiDmId) ? m : null; };

  /* ---------- chuyển từ danh mục cũ (bản 2.x) ---------- */
  /* Dựng danh mục đối tượng từ dmLaoDong (người lao động, nhiều dòng theo ngày), dmXeVC (tài xế, chủ xe) và dmDoiTac (doanh nghiệp, cá nhân ký) — “Người chung” theo CCCD.
   * Mỗi CCCD (9 hoặc 12 số, phiếu #14) = một thể nhân một người, gộp chức vụ; thông tin lấy dòng mới nhất, chỗ trống bù từ nguồn khác. Doanh nghiệp = pháp nhân có quyền ký Vận chuyển.
   * Người không có CCCD hợp lệ (tài xế / chủ xe chỉ có tên) KHÔNG tự tạo: ghi Cần đối chiếu. hienCo: danh mục mới đã có (chạy lại không thêm trùng).
   * Trả {dm, canDoiChieu: [{loai, ref, lyDo, goc}], so: {nguoi, phapNhan}}. vt: danh mục vị trí để nối viTriId. */
  function tuDanhMucCu(db, vt, hienCo) {
    const dm = clone(hienCo || []), can = [], dates = D(), nk = v => { const p = dates.parse(s(v)); return p ? p.key : 0; };
    const by = new Map(), put = (cccd, ngay, vai, o) => { const k = so(cccd); if (!NL().cccdHopLe(k)) return false; const e = by.get(k) || {cccd: k, vai: {}, ky: {}, ds: []}; Object.assign(e.vai, vai || {}); e.ds.push(Object.assign({t: nk(ngay)}, o)); by.set(k, e); return true; };
    (db.dmLaoDong || []).forEach(r => { if (!r) return; const vi = vt && r.viTri ? (vt.find(x => fold(x.ten) === fold(r.viTri)) || {}).id : ''; if (!put(r.cccd, r.ngayCapNhat, {nhanCong: true}, {hoTen: s(r.ten), gioiTinh: s(r.gioiTinh), ngaySinh: s(r.ngaySinh), diaChi: s(r.diaChi), ngayCap: s(r.ngayCap), noiCap: s(r.noiCap), sdt: s(r.sdt), viTriId: vi || '', _tt: fold(r.chucVu) === 'to truong'}) && s(r.ten)) can.push({loai: 'nguoi', ref: s(r.ten), lyDo: 'Lao động “' + s(r.ten) + '” không có CCCD 9 hoặc 12 số: chưa tạo hồ sơ đối tượng', goc: r}); });
    (db.dmXeVC || []).forEach(r => {
      if (!r) return;
      if (s(r.taiXe) && !put(r.cccdTx, r.ngayCapNhat, {taiXe: true}, {hoTen: s(r.taiXe), diaChi: s(r.diaChiTx), ngayCap: s(r.ngayCapTx), noiCap: s(r.noiCapTx), gplx: s(r.gplx), hanGplx: s(r.hanGplx)})) can.push({loai: 'nguoi', ref: s(r.taiXe), lyDo: 'Tài xế “' + s(r.taiXe) + '” (xe ' + s(r.bienSo) + ') không có CCCD 9 hoặc 12 số: chưa tạo hồ sơ', goc: {bienSo: r.bienSo, taiXe: r.taiXe}});
      if (s(r.chuXe) && !put(r.cccd, r.ngayCapNhat, {chuXe: true}, {hoTen: s(r.chuXe), ngaySinh: s(r.ngaySinh), diaChi: s(r.diaChi), ngayCap: s(r.ngayCap), noiCap: s(r.noiCap), sdt: s(r.sdt)})) can.push({loai: 'nguoi', ref: s(r.chuXe), lyDo: 'Chủ xe “' + s(r.chuXe) + '” (xe ' + s(r.bienSo) + ') không có CCCD 9 hoặc 12 số: chưa tạo hồ sơ', goc: {bienSo: r.bienSo, chuXe: r.chuXe}});
    });
    const dn = [];
    (db.dmDoiTac || []).forEach(r => {
      if (!r) return;
      if (r.loai === 'doanhnghiep') { dn.push(r); return; }
      const vai = /tai xe/.test(fold(r.vaiTro)) ? {taiXe: true} : {chuXe: true};
      if (!put(r.cccd, '', vai, {hoTen: s(r.ten), ngaySinh: s(r.ngaySinh), diaChi: s(r.diaChi), ngayCap: s(r.ngayCap), noiCap: s(r.noiCap), sdt: s(r.sdt), _ky: true})) can.push({loai: 'nguoi', ref: s(r.ten), lyDo: 'Đối tác cá nhân “' + s(r.ten) + '” không có CCCD 9 hoặc 12 số: chưa tạo hồ sơ', goc: r});
    });
    let nNguoi = 0, nPN = 0;
    [...by.values()].forEach(e => {
      if (timCccd(dm, e.cccd)) return;   // đã có (chạy lại)
      const ds = e.ds.slice().reverse().sort((a, b) => b.t - a.t), p = {cccd: e.cccd, vaiTro: e.vai, kyHD: {vanChuyen: e.ds.some(x => x._ky), nhanCong: e.ds.some(x => x._tt)}};
      ['hoTen', 'gioiTinh', 'ngaySinh', 'diaChi', 'ngayCap', 'noiCap', 'sdt', 'gplx', 'hanGplx', 'viTriId'].forEach(k => { const x = ds.find(d => s(d[k])); p[k] = x ? x[k] : ''; });
      if (p.vaiTro.taiXe && !p.gplx) can.push({loai: 'nguoi', ref: e.cccd, lyDo: 'Tài xế ' + p.hoTen + ' (CCCD ' + e.cccd + ') chưa có số GPLX: bổ sung ở Danh mục đối tượng', goc: null});
      const id = idDoiTuong(dm), pid = idNguoi(dm);
      dm.push(chuan({id, ma: maMoi(dm), ten: p.hoTen, loai: 'thenhan', diaChi: p.diaChi, sdt: p.sdt, kyHD: p.kyHD, nguoi: [Object.assign(p, {id: pid})]})); nNguoi++;
    });
    dn.forEach(r => {
      if ((dm || []).some(o => o.nguonCu === r.id || (so(r.mst) && so(o.mst) === so(r.mst)) || (o.loai === 'phapnhan' && fold(o.ten) === fold(r.ten)))) return;
      dm.push(chuan({id: idDoiTuong(dm), ma: maMoi(dm), ten: s(r.ten), loai: 'phapnhan', mst: s(r.mst), diaChi: s(r.diaChi), sdt: s(r.sdt), kyHD: {vanChuyen: true}, daiDien: s(r.daiDien), chucVuDaiDien: s(r.chucVu), nguonCu: r.id})); nPN++;
    });
    return {dm, canDoiChieu: can, so: {nguoi: nNguoi, phapNhan: nPN}};
  }
  /* id pháp nhân đã chuyển từ đối tác doanh nghiệp cũ ('dn:<mã>') — để nối hợp đồng vận chuyển cũ (hdvc.donViId) */
  const timTuDoiTacCu = (dm, idCu) => (dm || []).find(o => o.nguonCu === idCu) || null;

  const api = {chupChuRung, nguoiChonChuRung, trungDanhMuc, LOAI, VAI_TRO, KY, COT, kyText, vaiText, chuan, chuanNguoi, idDoiTuong, idNguoi, maMoi, tim, timNguoi, timCccd, nhanNguoi, nguoiTheoVaiTro, benKy, loc, kiem, canhBao, luu, moiTuLo, themTuLo, ngung,
    docExcel, apDungExcel, yesKy, laNguoiKy, yesVai, tuDanhMucCu, timTuDoiTacCu, tatCaNguoi, fold};
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.HAKDoiTuong = api;
})(typeof self !== 'undefined' ? self : this);
