'use strict';
/* Số hợp đồng và năm trong biểu mẫu: MỘT quy tắc dùng chung cho BM-01, BM-04, BM-09, BM-10, BM-14 và BM-20 (và phần xem trước ở tab Xuất hồ sơ).
 * Số in = <phần số>/<năm>-<hậu tố>, ví dụ 015/2026-KT.
 *  - Người dùng nhập số ĐÃ ĐẦY ĐỦ (có dấu “/” hoặc đã có hậu tố, ví dụ 015/2025-KT): GIỮ NGUYÊN, không ghép thêm.
 *  - Chỉ nhập phần số (015): ghép năm lấy từ NGÀY KÝ HỢP LỆ của chính hợp đồng đó + hậu tố.
 *  - Thiếu hoặc sai ngày ký: để trống năm (“……”) và báo rõ cần bổ sung ngày nào; không bao giờ tự điền một năm cố định.
 * Ngày của từng văn bản: HĐ khai thác (KT) và HĐ vận chuyển (HĐVC) = ngày ký hợp đồng chung; Giấy ủy quyền (UQ) = ngày lập giấy, nếu trống dùng ngày ký chung;
 * biên bản nghiệm thu, thanh lý (NTTL) = ngày lập biên bản; xác nhận khối lượng (XNKL) = ngày lập biên bản. */
(function (root) {
  const D = typeof HAKDates !== 'undefined' ? HAKDates : (typeof require === 'function' ? require('./dates.js') : root.HAKDates);
  const trim = v => (v == null ? '' : String(v)).replace(/\s+/g, ' ').trim();
  const NAM_TRONG = '……', SO_TRONG = '…………';

  /* Số đã đầy đủ? (có dấu / hoặc kết thúc bằng hậu tố của văn bản đó) */
  const daDayDu = (so, hau) => /\//.test(so) || new RegExp('[-–]\\s*' + hau.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i').test(so);

  /* so: giá trị người nhập; hau: KT | UQ | NTTL | HĐVC | XNKL; ngay: ngày ký/lập của chính văn bản (dd/mm/yyyy) */
  function soDayDu(so, hau, ngay) {
    const s = trim(so), p = D.parse(trim(ngay)), nam = p ? String(p.y) : '';
    let text;
    if (s && daDayDu(s, hau)) text = s;                                       // giữ nguyên số đã đầy đủ
    else text = (s || SO_TRONG) + '/' + (nam || NAM_TRONG) + '-' + hau;
    const full = !!s && daDayDu(s, hau);
    return {so: text, nam: full ? '' : nam, ngay: p ? D.format(p) : '', giuNguyen: full, thieuNgay: !full && !p, thieuSo: !s};
  }

  /* ex: tham số xuất hồ sơ đã gộp ngày ký mặc định (ex.ngayKy) */
  function numbers(ex) {
    ex = ex || {};
    return {
      kt: soDayDu(ex.soKT, 'KT', ex.ngayKy),
      uq: soDayDu(ex.uqSo, 'UQ', ex.uqNgay || ex.ngayKy),
      nt: soDayDu(ex.ntSo, 'NTTL', ex.ntNgay),
      vc: soDayDu(ex.soVC, 'HĐVC', ex.ngayKy),
      xn: soDayDu(ex.pcSo, 'XNKL', ex.pcNgay)
    };
  }
  /* Các việc cần bổ sung để số in có đủ năm (cho phần xem trước) */
  function canBoSung(ex) {
    const n = numbers(ex), out = [];
    const need = (x, label, truong) => { if (!x.giuNguyen && x.thieuNgay) out.push({label, truong}); };
    need(n.kt, 'Hợp đồng khai thác (BM-01, BM-14, BM-20)', 'Ngày ký hợp đồng');
    need(n.uq, 'Giấy ủy quyền (BM-20)', 'Ngày lập giấy ủy quyền hoặc Ngày ký hợp đồng');
    need(n.nt, 'Biên bản nghiệm thu, thanh lý (BM-14)', 'Nghiệm thu, thanh lý: ngày lập');
    need(n.vc, 'Hợp đồng vận chuyển (BM-04, BM-09, BM-10)', 'Ngày ký hợp đồng');
    need(n.xn, 'Biên bản xác nhận khối lượng (BM-09, BM-10)', 'Xác nhận KL, thanh toán: ngày lập');
    return out;
  }
  const ngayTrong = () => 'ngày ….. tháng ….. năm …….';   // dòng ngày để trống: không ghi sẵn một năm cố định

  const api = {NAM_TRONG, SO_TRONG, soDayDu, numbers, canBoSung, ngayTrong, daDayDu};
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.HAKHopDong = api;
})(typeof self !== 'undefined' ? self : this);
