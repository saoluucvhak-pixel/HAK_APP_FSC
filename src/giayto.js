/* Hạn giấy tờ xe theo NGÀY PHIẾU CÂN. Hàm thuần, không phụ thuộc giao diện, dùng chung ở giao diện (nhúng khi build) và kiểm thử Node.
 *
 * Mỗi phiếu cân so với giấy tờ của CHÍNH xe chạy phiếu đó (khớp biển số): kiểm định (kdDen), bảo hiểm (hanBH), GPLX của tài xế (hanGplx, chỉ khi xe có tài xế).
 * Phiếu có ngày cân SAU ngày hết hạn là phiếu chạy khi giấy tờ đã hết hạn. Ngày hết hạn là ngày CÒN hiệu lực cuối cùng: cân đúng ngày hết hạn thì hợp lệ.
 * Không so với ngày hôm nay (đó là cảnh báo “sắp hết hạn” ở màn xe). Hạn hoặc ngày cân trống, sai định dạng thì bỏ qua ở đây (đã có lỗi ngày ở nơi nhập). */
(function (root) {
  const BKS = () => (typeof require === 'function' ? require('./bks.js') : root.HAKBks);   // một quy tắc chuẩn hóa BKS (src/bks.js)
  const D = typeof HAKDates !== 'undefined' ? HAKDates : (typeof require === 'function' ? require('./dates.js') : root.HAKDates);
  const trim = s => String(s == null ? '' : s).replace(/\s+/g, ' ').trim();
  const bienKey = v => BKS().khoa(v);
  const GIAY_TO = [['kdDen', 'kiểm định', false], ['hanBH', 'bảo hiểm', false], ['hanGplx', 'GPLX', true]];   // [trường, tên giấy tờ, chỉ xét khi xe có tài xế]
  /* xe: danh sách xe; pcs: phiếu cân. Trả [{bienSo, soPhieu, ngay, row, giayTo, han}] theo thứ tự phiếu, mỗi (phiếu, giấy tờ) một dòng */
  function quaHan(xe, pcs) {
    const by = {}; (xe || []).forEach(x => { const k = bienKey(x.bienSo); if (k && !by[k]) by[k] = x; });
    const out = [];
    (pcs || []).forEach(p => {
      const x = by[bienKey(p.bienSo)], ng = D.parse(trim(p.ngay)); if (!x || !ng) return;
      GIAY_TO.forEach(([k, ten, caTx]) => {
        if (caTx && !trim(x.taiXe)) return;
        const h = D.parse(trim(x[k])); if (!h) return;
        if (ng.key > h.key) out.push({bienSo: x.bienSo, soPhieu: p.soPhieu || '', ngay: trim(p.ngay), row: p._row, giayTo: ten, han: trim(x[k])});
      });
    });
    return out;
  }
  /* câu mô tả một dòng quá hạn */
  const text = v => 'phiếu ' + (v.soPhieu || '(không số)') + ' ngày ' + v.ngay + ' (xe ' + v.bienSo + '): ' + v.giayTo + ' đã hết hạn từ ' + v.han;
  const api = {quaHan, text};
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.HAKGiayTo = api;
})(typeof self !== 'undefined' ? self : this);
