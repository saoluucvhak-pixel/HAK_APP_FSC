/* BIỂN KIỂM SOÁT (BKS) và ĐỊNH DANH PHIẾU CÂN (bản 3.0). Hàm thuần, dùng chung ở giao diện, tiến trình chính và kiểm thử Node.
 *  - khoa(bks): khóa so khớp — viết hoa, bỏ khoảng trắng, dấu chấm, dấu gạch ngang (77C-123.45 và 77c 12345 là cùng BKS). BKS nguồn giữ nguyên ở dữ liệu.
 *  - chonXe(xeHopDong, bks, o): chọn xe trong hợp đồng đang mở cho một phiếu: CHỈ tự chọn khi có đúng một xe khớp; còn lại trả lý do và nơi đang có xe.
 *  - khoaPhieu(p): khóa nghiệp vụ của phiếu cân = số phiếu + ngày cân (ngày theo lịch, 1/11 và 01/11 là một ngày). KHÔNG theo BKS: đổi BKS không sinh phiếu mới. */
(function (root) {
  'use strict';
  const D = () => (typeof HAKDates !== 'undefined' ? HAKDates : (typeof require === 'function' ? require('./dates.js') : root.HAKDates));
  const s = v => String(v == null ? '' : v).replace(/\s+/g, ' ').trim();
  const khoa = v => String(v == null ? '' : v).normalize('NFKC').replace(/\(\s*xe\s+c[uũ]\s*\)/gi, '').toUpperCase().replace(/[\s.\-]/g, '').replace(/[\s.\-–—_·/\\]+/g, '');
  const soPhieu = v => s(v).toUpperCase().replace(/\s+/g, '');
  const ngayKhoa = v => { const p = D().parse(s(v)); return p ? String(p.key) : ''; };
  /* khóa nghiệp vụ: '' khi thiếu số phiếu hoặc ngày cân hợp lệ (phiếu đó không dùng để nhận diện trùng) */
  const khoaPhieu = p => { const so = soPhieu(p && p.soPhieu), d = ngayKhoa(p && p.ngay); return so && d ? so + '|' + d : ''; };

  /* xeHopDong: [{id, bienSo|bks, ...}] các dòng xe của hợp đồng đang mở; o.khac: [{hdId, hdTen, bienSo}] xe ở hợp đồng khác của rừng; o.danhMuc: [{bks}] Danh mục xe.
   * Trả {xe: dòng xe | null, ma: 'khop'|'thieu-bks'|'khong-khop'|'nhieu', lyDo, noiKhac: [mô tả nơi đang có xe]} */
  function chonXe(xeHopDong, bks, o) {
    o = o || {}; const k = khoa(bks), bienCua = x => x.bienSo != null ? x.bienSo : x.bks;
    if (!k) return {xe: null, ma: 'thieu-bks', lyDo: 'Phiếu chưa có BKS: chọn xe trong hợp đồng', noiKhac: []};
    const khop = (xeHopDong || []).filter(x => khoa(bienCua(x)) === k);
    if (khop.length === 1) return {xe: khop[0], ma: 'khop', lyDo: '', noiKhac: []};
    if (khop.length > 1) return {xe: null, ma: 'nhieu', lyDo: 'BKS ' + s(bks) + ' khớp ' + khop.length + ' dòng xe trong hợp đồng: chọn đúng dòng', noiKhac: []};
    const noi = [];
    (o.khac || []).filter(x => khoa(x.bienSo) === k).forEach(x => noi.push('hợp đồng vận chuyển ' + (x.hdTen || x.hdId)));
    if ((o.danhMuc || []).some(x => khoa(bienCua(x)) === k)) noi.push('Danh mục xe (chưa thêm vào hợp đồng này)');
    return {xe: null, ma: 'khong-khop', lyDo: 'BKS ' + s(bks) + ' không có trong hợp đồng đang mở' + (noi.length ? ': xe đang có ở ' + noi.join('; ') : ''), noiKhac: noi};
  }
  /* phiếu đã có trong rừng (theo khóa nghiệp vụ, hoặc theo id nguồn nếu có): [{p, hdvcId}] — để báo vị trí thay vì thêm trùng */
  function phieuDaCo(pcRung, p) {
    const k = khoaPhieu(p), nguon = s(p && p.nguonId);
    return (pcRung || []).filter(q => q && ((nguon && s(q.nguonId) === nguon) || (k && khoaPhieu(q) === k)));
  }
  /* mọi khóa nhận diện một phiếu: khóa hiện hành rồi khóa bí danh của từng soCu[] (ngày của chính bí danh; thiếu thì lấy ngày phiếu). Dữ liệu cũ không có soCu → chỉ một khóa. */
  const khoaTatCa = p => [khoaPhieu(p)].concat(((p && p.soCu) || []).map(c => khoaPhieu({soPhieu: c && c.so, ngay: (c && c.ngay) || (p && p.ngay)})));
  function bienTuSheet(p, ...maps) {
    const raw = String(p.bienRaw || '');
    if (p.isPlate) return raw.toUpperCase();
    const key = raw.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[đĐ]/g, 'd').toLowerCase().trim();
    for (const map of maps) {
      if (map && Object.hasOwn(map, key) && typeof map[key] === 'string' && map[key]) return map[key];
    }
    return '';
  }
  const api = {khoa, khoaPhieu, soPhieu, chonXe, phieuDaCo, khoaTatCa, bienTuSheet};
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.HAKBks = api;
})(typeof self !== 'undefined' ? self : this);
