/* VÒNG ĐỜI LÔ và CHỐT HỒ SƠ (bản 2.2, mục 4.1–4.2). Hàm thuần, không đọc giao diện.
 * 7 trạng thái: 4 trạng thái đầu tự suy ra từ dữ liệu; 3 trạng thái cuối do người dùng bấm.
 *   dang-lap (đợt 1 chưa in xong và ký) → da-ky-dot1 (mọi mẫu đợt 1 đã in, đã ký, còn khớp; chưa có phiếu cân) → dang-khai-thac (đã có phiếu cân)
 *   → cho-quyet-toan (đã nhập ngày kết thúc khai thác, đợt 2 chưa in xong và ký) ; da-chot | luu-tru | da-dung (chỉ đọc).
 * Dữ liệu lô: f.chot = {at, nguoi, phienBan, hash, hashDL, goi} (B5: SQLite giữ goi ở bảng chot_goi, lô đọc lên không có goi; hashDL = dấu vân tay phần dữ liệu để kiểm nguyenVen) ; f.luuTru = {at} ; f.dung = {at, ngay, lyDo} ; f.nhatKy = [{at, hanh, lyDo, nguoi, phienBan}]. */
(function (root) {
  const s = v => String(v == null ? '' : v).trim();
  const TEN = {'dang-lap': 'Đang lập', 'da-ky-dot1': 'Đã ký đợt 1', 'dang-khai-thac': 'Đang khai thác', 'cho-quyet-toan': 'Chờ quyết toán', 'da-chot': 'Đã chốt', 'luu-tru': 'Lưu trữ', 'da-dung': 'Đã dừng'};
  const CHI_DOC = new Set(['da-chot', 'luu-tru', 'da-dung']);
  /* sum = HAKQuyTrinh.summary(...) ; f = lô (chot, luuTru, dung, info.denNgay, pc) */
  function trangThai(f, sum) {
    f = f || {}; sum = sum || {};
    if (f.dung) return 'da-dung';
    if (f.chot && f.luuTru) return 'luu-tru';
    if (f.chot) return 'da-chot';
    const d1 = sum.dot1 || {}, d2 = sum.dot2 || {};
    if (!d1.kyXong) return 'dang-lap';
    if (s((f.info || {}).denNgay) && !d2.kyXong) return 'cho-quyet-toan';
    return (f.pc || []).length ? 'dang-khai-thac' : 'da-ky-dot1';
  }
  const chiDoc = f => !!(f && (f.dung || f.chot));
  /* Điều kiện chốt: không còn mục chặn, mọi phiếu cân đã gán đội, mọi mẫu (cả hai đợt) đã in, đã ký và còn khớp. Trả danh sách việc còn thiếu (rỗng = chốt được). */
  function dieuKienChot(o) {
    o = o || {}; const thieu = [], sum = o.sum || {};
    if (chiDoc(o.f)) thieu.push(o.f.dung ? 'Lô đã dừng' : 'Lô đã chốt');
    if (o.chan > 0) thieu.push('Còn ' + o.chan + ' mục chặn xuất hồ sơ (tab Kiểm tra)');
    if (o.pcChuaGan > 0) thieu.push('Còn ' + o.pcChuaGan + ' phiếu cân chưa gán đội');
    if (!((o.f || {}).pc || []).length) thieu.push('Chưa có phiếu cân (chưa khai thác)');
    [1, 2].forEach(d => { const x = sum['dot' + d] || {}; if (x.total && !x.xong) thieu.push('Đợt ' + d + ': còn mẫu chưa in hoặc thiếu dữ liệu'); else if (x.total && !x.kyXong) thieu.push('Đợt ' + d + ': còn ' + (x.total - (x.daKy || 0)) + ' mẫu chưa đánh dấu đã ký'); });
    return thieu;
  }
  /* băm FNV-1a 64 bit (hex) của chuỗi: dấu vân tay của gói đã chốt, không dùng cho bảo mật */
  function bam(str) {
    let h1 = 0x811c9dc5 | 0, h2 = 0x1b873593 | 0;
    for (let i = 0; i < str.length; i++) { const c = str.charCodeAt(i); h1 = Math.imul(h1 ^ c, 16777619); h2 = Math.imul(h2 ^ c, 2246822519) ^ (h1 >>> 13); }
    return ((h1 >>> 0).toString(16).padStart(8, '0') + (h2 >>> 0).toString(16).padStart(8, '0'));
  }
  const phienBanKe = f => ((f && f.nhatKy) || []).filter(x => x.hanh === 'chot').length + 1;
  /* dấu vân tay PHẦN DỮ LIỆU của lô: bỏ các khóa vòng đời (chot, luuTru, dung, nhatKy) — đúng phép so của nguyenVen trước đây (gói bỏ nhatKy) */
  const bamDuLieu = g => { const c = JSON.parse(typeof g === 'string' ? g : JSON.stringify(g)); delete c.chot; delete c.luuTru; delete c.dung; delete c.nhatKy; return bam(JSON.stringify(c)); };
  /* lô đã chốt từ bản cũ (có goi, chưa có hashDL): tính hashDL từ gói. Sửa trực tiếp f; trả true nếu có đổi. Chạy lại không đổi. */
  function ganHashDL(f) { if (!f || !f.chot || f.chot.hashDL || typeof f.chot.goi !== 'string') return false; try { f.chot.hashDL = bamDuLieu(f.chot.goi); return true; } catch (e) { return false; } }
  const ghi = (f, hanh, lyDo, nguoi, now, extra) => { f.nhatKy = Array.isArray(f.nhatKy) ? f.nhatKy : []; f.nhatKy.push(Object.assign({at: now, hanh, lyDo: s(lyDo), nguoi: s(nguoi)}, extra || {})); return f; };
  /* CHỐT: lưu gói đóng băng (bản chụp dữ liệu lô) kèm dấu vân tay; sửa trực tiếp f. Trả {ok, error, chot}. */
  function chot(f, nguoi, now, thieu) {
    if (thieu && thieu.length) return {ok: false, error: thieu.join('; ')};
    if (chiDoc(f)) return {ok: false, error: 'Lô đã chốt hoặc đã dừng'};
    const copy = JSON.parse(JSON.stringify(f)); delete copy.chot; delete copy.luuTru; delete copy.dung;
    const goi = JSON.stringify(copy), pb = phienBanKe(f);
    f.chot = {at: now, nguoi: s(nguoi), phienBan: pb, hash: bam(goi), hashDL: bamDuLieu(copy), goi}; ghi(f, 'chot', '', nguoi, now, {phienBan: pb, hash: f.chot.hash});
    return {ok: true, chot: f.chot};
  }
  /* MỞ KHÓA: bắt buộc nhập lý do, ghi nhật ký; gói cũ giữ trong nhật ký (hash). Sau khi sửa phải chốt lại (phiên bản kế tiếp). */
  function moKhoa(f, lyDo, nguoi, now) {
    if (!f || !f.chot) return {ok: false, error: 'Lô chưa chốt'};
    if (!s(lyDo)) return {ok: false, error: 'Phải nhập lý do mở khóa'};
    ghi(f, 'mokhoa', lyDo, nguoi, now, {phienBan: f.chot.phienBan, hash: f.chot.hash}); delete f.chot; delete f.luuTru; return {ok: true};
  }
  /* kiểm gói đã chốt còn nguyên không (dữ liệu lô hiện tại so với bản chụp lúc chốt): so dấu vân tay phần dữ liệu (hashDL), không cần nạp gói;
   * lô chưa có hashDL thì so với gói (goi truyền vào hoặc f.chot.goi); không có gì để so thì coi là nguyên vẹn */
  function nguyenVen(f, goi) {
    if (!f || !f.chot) return true; const h = bamDuLieu(f);
    if (f.chot.hashDL) return h === f.chot.hashDL;
    const g = goi || f.chot.goi; if (typeof g !== 'string') return true;
    return h === bamDuLieu(g);
  }
  function luuTru(f, now) { if (!f || !f.chot) return {ok: false, error: 'Chỉ lưu trữ lô đã chốt'}; f.luuTru = {at: now}; ghi(f, 'luutru', '', '', now); return {ok: true}; }
  function boLuuTru(f, now) { if (f && f.luuTru) { delete f.luuTru; ghi(f, 'boluutru', '', '', now); } return {ok: true}; }
  function dung(f, lyDo, ngay, nguoi, now) {
    if (!s(lyDo)) return {ok: false, error: 'Phải nhập lý do dừng lô'};
    if (chiDoc(f) && !f.dung) return {ok: false, error: 'Lô đã chốt: mở khóa trước khi dừng'};
    f.dung = {at: now, ngay: s(ngay), lyDo: s(lyDo)}; ghi(f, 'dung', lyDo, nguoi, now); return {ok: true};
  }
  function moLai(f, lyDo, nguoi, now) { if (!f || !f.dung) return {ok: false, error: 'Lô chưa dừng'}; if (!s(lyDo)) return {ok: false, error: 'Phải nhập lý do mở lại lô'}; ghi(f, 'molai', lyDo, nguoi, now); delete f.dung; return {ok: true}; }
  /* KHÓA CHỈ ĐỌC Ở TẦNG LƯU: lô đang chốt hoặc dừng (bản ĐÃ LƯU) không được đổi dữ liệu so với bản đã lưu, ngoại trừ các khóa vòng đời. Hai bản so bằng chuỗi chuẩn (khóa sắp thứ tự)
   * nên chỉ khác thứ tự khóa không bị tính là thay đổi. Dùng ở giao diện (trước khi gửi) và ở Store (trước khi ghi). */
  const KHOA_VONG_DOI = ['chot', 'luuTru', 'dung', 'nhatKy'];
  const chuan = v => Array.isArray(v) ? '[' + v.map(chuan).join(',') + ']' : v && typeof v === 'object' ? '{' + Object.keys(v).sort().filter(k => v[k] !== undefined).map(k => JSON.stringify(k) + ':' + chuan(v[k])).join(',') + '}' : JSON.stringify(v === undefined ? null : v);
  const boVongDoi = f => { const c = Object.assign({}, f); KHOA_VONG_DOI.forEach(k => { delete c[k]; }); return c; };
  const doiNgoaiVongDoi = (cu, moi) => chuan(boVongDoi(cu)) !== chuan(boVongDoi(moi));
  const viPhamKhoa = (cu, moi) => !!cu && chiDoc(cu) && !!moi && doiNgoaiVongDoi(cu, moi);
  const api = {KHOA_VONG_DOI, doiNgoaiVongDoi, viPhamKhoa, TEN, CHI_DOC, trangThai, chiDoc, dieuKienChot, chot, moKhoa, nguyenVen, luuTru, boLuuTru, dung, moLai, bam, phienBanKe, bamDuLieu, ganHashDL};
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.HAKVongDoi = api;
})(typeof self !== 'undefined' ? self : this);
