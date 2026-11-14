'use strict';
/* Danh mục "Công ty mua hàng" và điểm đến vận chuyển. Thuần dữ liệu, không phụ thuộc DOM/Electron: dùng ở giao diện (nhúng khi build) và kiểm thử Node.
 *
 * Công ty (db.congTy[id]):
 *   {id, ten, mst, diaChi, nguoiDaiDien, chucVu, sdt, fax, noiLap, email, diaChiGiao: [{id, nhan, diaChi}], ghiChu}
 *   - ten (tên pháp lý) và diaChi (địa chỉ công ty/trụ sở) BẮT BUỘC; các trường còn lại tùy chọn.
 *   - diaChiGiao: các địa chỉ giao hàng khác của công ty (kho, nhà máy…); địa chỉ công ty luôn là lựa chọn đầu tiên.
 * Công ty mua hàng là một VAI TRÒ riêng, chọn theo từng rừng; hồ sơ rừng lưu BẢN CHỤP (info.muaHang) tên + địa chỉ đã xác nhận:
 *   {congTyId, ten, mst, diaChiId ('' = địa chỉ công ty), diaChiNhan, diaChi, nguoiDaiDien, chucVu, sdt, xacNhan: ISO}
 *   Danh mục đổi địa chỉ thì bản chụp GIỮ NGUYÊN cho đến khi người dùng xác nhận cập nhật.
 * Điểm đến hiệu lực của rừng (diemDen): ưu tiên bản chụp công ty; hồ sơ cũ chưa chọn công ty dùng điểm đến nhập tay (exp.vcDiemDen). */
(function (root) {
  const trim = v => (v == null ? '' : String(v)).replace(/\s+/g, ' ').trim();
  const fold = s => trim(s).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();
  const MAIN = '';   // diaChiId của địa chỉ công ty (trụ sở)

  /* Mã số thuế VN: 10 chữ số, hoặc 13 chữ số (10 + 3 của đơn vị phụ thuộc; có thể ghi 0123456789-001). Trả về dạng chuẩn hóa bỏ dấu cách và dấu gạch. */
  const normMst = v => trim(v).replace(/[\s.\-]/g, '');
  const mstValid = v => { const m = normMst(v); return m === '' || /^\d{10}$/.test(m) || /^\d{13}$/.test(m); };
  const mstShow = v => { const m = normMst(v); return m.length === 13 ? m.slice(0, 10) + '-' + m.slice(10) : m; };

  function newCompany() { return {id: '', ten: '', mst: '', diaChi: '', nguoiDaiDien: '', chucVu: '', sdt: '', fax: '', noiLap: '', email: '', diaChiGiao: [], ghiChu: ''}; }

  /* Chuẩn hóa dữ liệu nhập (không đổi ý nghĩa): cắt khoảng trắng, MST chuẩn hóa, bỏ địa chỉ giao rỗng, giữ id địa chỉ */
  function clean(o, newId) {
    const c = Object.assign(newCompany(), o || {});
    ['ten', 'diaChi', 'nguoiDaiDien', 'chucVu', 'sdt', 'fax', 'noiLap', 'email', 'ghiChu'].forEach(k => { c[k] = trim(c[k]); });
    c.mst = mstShow(c.mst);
    let n = 0;
    c.diaChiGiao = (Array.isArray(c.diaChiGiao) ? c.diaChiGiao : []).map(a => ({id: trim(a && a.id) || (newId ? newId('a') : 'a' + (++n)), nhan: trim(a && a.nhan), diaChi: trim(a && a.diaChi)})).filter(a => a.diaChi || a.nhan);
    return c;
  }

  /* Lỗi chặn lưu (tên, địa chỉ bắt buộc) và cảnh báo không chặn (MST sai dạng hoặc trùng, email/SĐT lạ, địa chỉ giao trùng/thiếu) */
  function validate(c, all, selfId) {
    const errors = [], warnings = [];
    if (!c.ten) errors.push('Thiếu tên pháp lý của công ty');
    if (!c.diaChi) errors.push('Thiếu địa chỉ công ty');
    (c.diaChiGiao || []).forEach((a, i) => { if (!a.diaChi) errors.push('Địa chỉ giao hàng thứ ' + (i + 1) + (a.nhan ? ' (' + a.nhan + ')' : '') + ' chưa có địa chỉ'); });
    if (c.mst && !mstValid(c.mst)) warnings.push('Mã số thuế “' + c.mst + '” không đúng dạng (10 hoặc 13 chữ số)');
    const dup = c.mst ? mstDuplicates(c.mst, all, selfId) : [];
    if (dup.length) warnings.push('Mã số thuế ' + c.mst + ' đã có ở công ty: ' + dup.map(d => d.ten || '(chưa đặt tên)').join('; ') + '. Kiểm tra có nhập trùng không (vẫn lưu được).');
    if (c.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.email)) warnings.push('Email “' + c.email + '” không đúng dạng');
    if (c.sdt && !/^[0-9 .()+\-]{8,20}$/.test(c.sdt)) warnings.push('Số điện thoại “' + c.sdt + '” không đúng dạng');
    const seen = new Set([fold(c.diaChi)]);
    (c.diaChiGiao || []).forEach(a => { const k = fold(a.diaChi); if (k && seen.has(k)) warnings.push('Địa chỉ giao “' + a.diaChi + '” trùng với một địa chỉ khác của công ty'); seen.add(k); });
    return {errors, warnings};
  }

  function mstDuplicates(mst, all, selfId) {
    const k = normMst(mst); if (!k) return [];
    return Object.values(all || {}).filter(x => x && x.id !== selfId && normMst(x.mst) === k);
  }

  /* Các địa chỉ có thể chọn để giao hàng: địa chỉ công ty trước, rồi các địa chỉ giao khác */
  function addressesOf(c) {
    if (!c) return [];
    return [{id: MAIN, nhan: 'Địa chỉ công ty', diaChi: c.diaChi}, ...(c.diaChiGiao || []).map(a => ({id: a.id, nhan: a.nhan || 'Địa chỉ giao hàng', diaChi: a.diaChi}))];
  }
  const addressOf = (c, id) => addressesOf(c).find(a => a.id === (id || MAIN)) || null;

  /* Bản chụp lưu theo rừng sau khi người dùng xác nhận */
  function snapshot(c, diaChiId, now) {
    const a = addressOf(c, diaChiId);
    if (!c || !a || !trim(a.diaChi)) return null;
    return {congTyId: c.id, ten: c.ten, mst: c.mst, diaChiId: a.id, diaChiNhan: a.nhan, diaChi: a.diaChi, nguoiDaiDien: c.nguoiDaiDien, chucVu: c.chucVu, sdt: c.sdt, xacNhan: now || new Date().toISOString()};
  }

  /* Điểm đến hiệu lực của rừng. info.muaHang (bản chụp đã xác nhận) → công ty; không có thì điểm đến nhập tay cũ (exp.vcDiemDen) */
  function diemDen(info, ex) {
    const m = (info || {}).muaHang;
    if (m && trim(m.diaChi)) return {src: 'congty', ten: trim(m.ten), diaChi: trim(m.diaChi), nhan: m.diaChiNhan || '', text: [trim(m.ten), trim(m.diaChi)].filter(Boolean).join(' – ')};
    const t = trim((ex || {}).vcDiemDen);
    if (t) return {src: 'thucong', ten: '', diaChi: t, nhan: '', text: t};
    return {src: '', ten: '', diaChi: '', nhan: '', text: ''};
  }

  /* Bản chụp có còn khớp danh mục không? 'ok' | 'thaydoi' (danh mục đã đổi tên/địa chỉ) | 'xoa' (công ty không còn trong danh mục) | 'none' */
  function drift(info, all) {
    const m = (info || {}).muaHang; if (!m) return {state: 'none'};
    const c = (all || {})[m.congTyId];
    if (!c) return {state: 'xoa', saved: m};
    const a = addressOf(c, m.diaChiId);
    if (!a) return {state: 'thaydoi', saved: m, current: {ten: c.ten, diaChi: '', nhan: ''}, why: 'địa chỉ giao đã chọn không còn trong danh mục'};
    const changed = [];
    if (trim(c.ten) !== trim(m.ten)) changed.push('tên');
    if (trim(a.diaChi) !== trim(m.diaChi)) changed.push('địa chỉ');
    return changed.length ? {state: 'thaydoi', saved: m, current: {ten: c.ten, diaChi: a.diaChi, nhan: a.nhan}, why: changed.join(' và ') + ' trong danh mục đã đổi'} : {state: 'ok', saved: m};
  }

  /* So "Nơi giao" ghi trên phiếu cân (dữ liệu thực tế từ nguồn, giữ nguyên) với điểm đến theo hồ sơ.
   * Khớp khi một bên nằm trong bên kia sau khi bỏ dấu, hạ chữ thường, gộp khoảng trắng và dấu câu — so với tên công ty, địa chỉ hoặc nhãn địa chỉ đã chọn. */
  const norm = s => fold(s).replace(/[^a-z0-9]+/g, ' ').trim();
  function noiGiaoKhop(noiGiao, dd) {
    const n = norm(noiGiao); if (!n) return true;                      // phiếu không ghi nơi giao: không có gì để đối chiếu
    return [dd.ten, dd.diaChi, dd.nhan, dd.text].map(norm).filter(Boolean).some(t => t.includes(n) || n.includes(t));
  }
  function mismatches(pc, dd) {
    if (!dd || !dd.diaChi) return [];
    return (pc || []).filter(p => !noiGiaoKhop(p.noiGiao, dd));
  }

  const api = {MAIN, trim, fold, normMst, mstValid, mstShow, newCompany, clean, validate, mstDuplicates, addressesOf, addressOf, snapshot, diemDen, drift, noiGiaoKhop, mismatches};
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.HAKMuaHang = api;
})(typeof self !== 'undefined' ? self : this);
