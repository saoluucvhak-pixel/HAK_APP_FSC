/* NGÀNH NGHỀ và CHỨC VỤ (PR B, quyết định của CHỦ 23/11/2026) — hàm thuần, không đọc biến toàn cục.
 *  - db.dmNganh = [{id, ten, ngung?}]            (gieo sẵn: Khai thác gỗ keo, Vận chuyển; thêm / sửa / ngừng sử dụng được)
 *  - db.dmChucVu = [{id, ten, nganh, vaiTro, ngung?}]   nganh = id ngành mặc định ('' = bắt chọn, như chức vụ “Khác”); vaiTro = khóa cũ giữ tương thích
 *    ('nhanCong' | 'taiXe' | 'chuXe' | ''): chức vụ này bật khóa vaiTro tương ứng của người (mã cũ dùng vaiTro.{nhanCong,taiXe,chuXe} vẫn chạy y như trước).
 *  - người (db.dmDoiTuong[].nguoi[]): chucVu?: [id chức vụ], nganh?: [id ngành] (chỉ khi chức vụ không có ngành mặc định, ví dụ “Khác”) — TÙY CHỌN, chỉ ghi khi khác rỗng.
 *  - đối tượng pháp nhân: nganh?: [id ngành] (chọn tay, được chọn cả hai) — tùy chọn.
 * Dữ liệu cũ chưa có các trường này: ngành SUY RA từ vai trò / quyền ký đang có (Nhân công → Khai thác; Tài xế, Chủ xe → Vận chuyển; quyền ký Nhân công → Khai thác,
 * Vận chuyển → Vận chuyển), không bắt nhập lại, JSON cũ giữ y hệt. “Tổ trưởng” trong lô vẫn là chữ ở cột Chức vụ của dòng nhân công (src/model.js isTT), không phải cờ ở đây. */
(function (root) {
  'use strict';
  const s = v => String(v == null ? '' : v).trim();
  const KT = 'khaiThac', VC = 'vanChuyen';
  const NGANH_MAC_DINH = [{id: KT, ten: 'Khai thác gỗ keo'}, {id: VC, ten: 'Vận chuyển'}];
  const CHUC_VU_MAC_DINH = [
    {id: 'cvChuXe', ten: 'Chủ xe', nganh: VC, vaiTro: 'chuXe'}, {id: 'cvToTruong', ten: 'Tổ trưởng', nganh: KT, vaiTro: 'nhanCong'},
    {id: 'cvCongNhan', ten: 'Công nhân', nganh: KT, vaiTro: 'nhanCong'}, {id: 'cvTaiXe', ten: 'Tài xế', nganh: VC, vaiTro: 'taiXe'}, {id: 'cvKhac', ten: 'Khác', nganh: '', vaiTro: ''}];
  const clone = a => a.map(x => Object.assign({}, x));
  const ds = (dm, mac) => (Array.isArray(dm) && dm.length ? dm : clone(mac));
  const dsNganh = db => ds(db && db.dmNganh, NGANH_MAC_DINH), dsChucVu = db => ds(db && db.dmChucVu, CHUC_VU_MAC_DINH);
  const mang = v => (Array.isArray(v) ? v.map(s).filter(Boolean) : []);
  const hop = (a, b) => [...new Set(a.concat(b))];

  /* gieo sẵn khi chưa có (trả danh mục để người gọi ghi vào db; không sửa db) */
  const gieo = db => ({dmNganh: Array.isArray(db && db.dmNganh) && db.dmNganh.length ? null : clone(NGANH_MAC_DINH), dmChucVu: Array.isArray(db && db.dmChucVu) && db.dmChucVu.length ? null : clone(CHUC_VU_MAC_DINH)});

  /* ngành của MỘT người (mảng id, không trùng): chức vụ đã khai → ngành mặc định của chức vụ (hoặc ngành người chọn cho chức vụ không có ngành); chưa khai chức vụ → suy từ vaiTro cũ */
  function nganhNguoi(db, p) {
    if (!p) return [];
    const cvs = mang(p.chucVu), dm = dsChucVu(db);
    let out = mang(p.nganh);
    if (cvs.length) cvs.forEach(id => { const c = dm.find(x => x.id === id); if (c && c.nganh) out = hop(out, [c.nganh]); });
    else { const v = p.vaiTro || {}; if (v.nhanCong) out = hop(out, [KT]); if (v.taiXe || v.chuXe) out = hop(out, [VC]); }
    return out;
  }
  /* ngành của một đối tượng: pháp nhân → ngành đã chọn, chưa chọn thì suy từ quyền ký (Nhân công → Khai thác, Vận chuyển → Vận chuyển); thể nhân → hợp ngành các người đang dùng */
  function nganhDoiTuong(db, dt) {
    if (!dt) return [];
    if (dt.loai === 'phapnhan') { const c = mang(dt.nganh); if (c.length) return c; const k = dt.kyHD || {}; return hop(k.nhanCong ? [KT] : [], k.vanChuyen ? [VC] : []); }
    return (dt.nguoi || []).filter(p => !p.ngung).reduce((a, p) => hop(a, nganhNguoi(db, p)), []);
  }
  const thuocNganh = (ds_, nganh) => !nganh || ds_.includes(nganh);

  /* khóa vaiTro cũ suy từ các chức vụ đã chọn: giữ tương thích mã dùng vaiTro.{nhanCong,taiXe,chuXe} */
  function vaiTroTuChucVu(db, ids) {
    const dm = dsChucVu(db), v = {nhanCong: false, taiXe: false, chuXe: false};
    mang(ids).forEach(id => { const c = dm.find(x => x.id === id); if (c && c.vaiTro && c.vaiTro in v) v[c.vaiTro] = true; });
    return v;
  }
  /* chữ hiển thị chức vụ của người: “Tổ trưởng, Công nhân”; chưa khai chức vụ thì suy từ vaiTro cũ (Nhân công → Công nhân, Tài xế, Chủ xe) */
  function chucVuNhan(db, p) {
    if (!p) return '';
    const dm = dsChucVu(db), cvs = mang(p.chucVu);
    if (cvs.length) return cvs.map(id => (dm.find(x => x.id === id) || {}).ten).filter(Boolean).join(', ');
    const v = p.vaiTro || {}, t = []; if (v.nhanCong) t.push('Công nhân'); if (v.taiXe) t.push('Tài xế'); if (v.chuXe) t.push('Chủ xe'); return t.join(', ');
  }
  /* tên ngành từ id */
  const tenNganh = (db, id) => ((dsNganh(db).find(x => x.id === id)) || {}).ten || id;
  /* kiểm khai báo người: chức vụ không có ngành mặc định (Khác) thì bắt chọn ngành. Trả [chuỗi lỗi] */
  function kiemNguoi(db, p) {
    const dm = dsChucVu(db), e = [], cvs = mang(p && p.chucVu);
    if (cvs.some(id => { const c = dm.find(x => x.id === id); return c && !c.nganh; }) && !mang(p.nganh).length) e.push('Chức vụ “Khác” phải chọn ngành nghề');
    return e;
  }

  const api = {KT, VC, NGANH_MAC_DINH, CHUC_VU_MAC_DINH, dsNganh, dsChucVu, gieo, nganhNguoi, nganhDoiTuong, thuocNganh, vaiTroTuChucVu, chucVuNhan, tenNganh, kiemNguoi};
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.HAKNganh = api;
})(typeof self !== 'undefined' ? self : this);
