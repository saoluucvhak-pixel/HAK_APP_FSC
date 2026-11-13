/* Quy trình tạo và in hồ sơ theo ĐỢT. Hàm thuần (không đọc giao diện), dùng chung cho màn hình “Quy trình hồ sơ” và kiểm thử.
 *
 * Mô hình:
 *  - Danh mục mẫu: mỗi biểu mẫu thuộc đúng MỘT đợt. Đợt 1 = hồ sơ làm được trước khi khai thác (chỉ cần dữ liệu đợt 1: chủ rừng, rừng, nhân công, đội xe, đơn giá,
 *    ngày ký, địa chỉ giao, định mức). Đợt 2 = BM-08, BM-09, BM-10, BM-14 (cần phiếu cân, khối lượng thực tế, ngày lập biên bản, tiền).
 *  - BẤT BIẾN (kiểm thử `scripts/e2e-batbien.js`): file đợt 1 giống hệt nhau dù đợt 2 chưa hay đã có dữ liệu, nên bản in lại sau này không lệch bản đã in.
 *  - Mỗi mẫu có 3 trạng thái độc lập: DỮ LIỆU (du | nhap | thieu), IN ẤN (chua | da | doi) và, riêng đợt 2, hướng in (giấy trắng / nền + in đè: src/inan2.js).
 *  - IN ẤN: người dùng xác nhận “đã in”; phần mềm ghi chữ ký nội dung (băm file sẽ in). Sau đó dữ liệu đổi → chữ ký đổi → “đã in nhưng dữ liệu đã đổi, cần in lại”. */
(function (root) {
  /* kind = mã nút xuất lẻ trong tab Xuất hồ sơ; only = chỉ áp dụng cho hình thức hợp đồng đó */
  const FORMS = [
    {code: '01', name: 'Hợp đồng khai thác (giao khoán)', dot: 1, kind: 'gk', only: 'giaokhoan'},
    {code: '20', name: 'Giấy ủy quyền', dot: 1, kind: 'uq', only: 'giaokhoan'},
    {code: '03', name: 'Hợp đồng lao động', dot: 1, kind: 'hdld', only: 'tructiep'},
    {code: '02', name: 'Cấp phát bảo hộ lao động', dot: 1, kind: 'bhld'},
    {code: '04', name: 'Hợp đồng vận chuyển', dot: 1, kind: 'hdvc'},
    {code: '05', name: 'Bảng chấm công', dot: 1, kind: 'cc'},
    {code: '06', name: 'Danh sách đội khai thác', dot: 1, kind: 'dsd'},
    {code: '07', name: 'Xác nhận đào tạo ATLĐ', dot: 1, kind: 'xn'},
    {code: '11', name: 'Cam kết nguồn gốc', dot: 1, kind: 'ckng'},
    {code: '12', name: 'Cam kết lao động', dot: 1, kind: 'cklc'},
    {code: '13', name: 'Kiểm tra hiện trường', dot: 1, kind: 'kthn'},
    {code: '15', name: 'Sổ theo dõi tai nạn, sự cố', dot: 1, kind: 'stai'},
    {code: '16', name: 'Kiểm tra, bảo dưỡng thiết bị', dot: 1, kind: 'tbi'},
    {code: '17', name: 'Thẩm định chủ rừng và rừng', dot: 1, kind: 'tdcr'},
    {code: '18', name: 'Nhật ký khai thác', dot: 1, kind: 'nkkt'},
    {code: '19', name: 'Phổ biến chính sách FSC', dot: 1, kind: 'fsc'},
    {code: '08', name: 'Bảng thanh toán tiền công', dot: 2, kind: 'tc'},
    {code: '09', name: 'Xác nhận khối lượng vận chuyển', dot: 2, kind: 'xnvc'},
    {code: '10', name: 'Thanh toán tiền vận chuyển', dot: 2, kind: 'ttvc'},
    {code: '14', name: 'Nghiệm thu, thanh lý khai thác', dot: 2, kind: 'nttl'}
  ];
  const byCode = c => FORMS.find(f => f.code === c) || null;
  /* mẫu áp dụng cho hình thức hợp đồng mo ('giaokhoan' | 'tructiep'), theo thứ tự: đợt 1 rồi đợt 2 */
  const applicable = mo => FORMS.filter(f => !f.only || f.only === mo).sort((a, b) => a.dot - b.dot);

  const emptyState = () => ({v: 1, items: {}});
  const peek = f => (f && f.inAn && typeof f.inAn.items === 'object' && f.inAn.items ? f.inAn : emptyState());
  function stateOf(f) { if (!f.inAn || typeof f.inAn.items !== 'object' || !f.inAn.items) f.inAn = emptyState(); return f.inAn; }
  const mark = (st, code, sig, now) => { st.items[code] = {at: now, sig}; return st.items[code]; };
  const unmark = (st, code) => { const had = !!st.items[code]; delete st.items[code]; return had; };

  /* items: [{code, ready: 'du'|'nhap'|'thieu', sig}] → thêm printed: 'chua' | 'da' | 'doi', at */
  function evaluate(items, st) {
    return items.map(it => {
      const r = st && st.items ? st.items[it.code] : null;
      const printed = !r ? 'chua' : (r.sig === it.sig ? 'da' : 'doi');
      return Object.assign({}, it, {printed, at: r ? r.at : '', form: byCode(it.code)});
    });
  }
  /* tổng hợp từng đợt: số mẫu, đủ dữ liệu, đã in và còn khớp, đã in nhưng dữ liệu đổi, bản nháp */
  function summary(list) {
    const out = {};
    [1, 2].forEach(d => {
      const L = list.filter(x => x.form && x.form.dot === d);
      out['dot' + d] = {total: L.length, du: L.filter(x => x.ready === 'du').length, nhap: L.filter(x => x.ready === 'nhap').length, thieu: L.filter(x => x.ready === 'thieu').length,
        daIn: L.filter(x => x.printed === 'da').length, doi: L.filter(x => x.printed === 'doi').length, chuaIn: L.filter(x => x.printed === 'chua').length,
        xong: L.length > 0 && L.every(x => x.printed === 'da' && x.ready === 'du')};
    });
    return out;
  }
  /* việc nên làm tiếp theo (một câu), theo thứ tự quy trình */
  function next(sum, o) {
    o = o || {};
    if (o.chuaChuanBi) return {step: 'chuanbi', text: 'Hoàn tất bước chuẩn bị: ' + o.chuaChuanBi};
    const a = sum.dot1;
    if (a.thieu) return {step: 'dot1', text: 'Đợt 1 còn ' + a.thieu + ' mẫu chưa đủ dữ liệu để xuất.'};
    if (a.doi) return {step: 'dot1', text: 'Đợt 1: ' + a.doi + ' mẫu đã in nhưng dữ liệu đã đổi, cần in lại.'};
    if (a.chuaIn || a.nhap) return {step: 'dot1', text: 'In đợt 1: còn ' + a.chuaIn + ' mẫu chưa in' + (a.nhap ? ', ' + a.nhap + ' mẫu đang là bản nháp' : '') + '.'};
    if (!o.coPhieuCan) return {step: 'khaithac', text: 'Đợt 1 đã in xong. Chờ khai thác và cân: nạp phiếu cân, nhập khối lượng thực tế.'};
    const b = sum.dot2;
    if (b.doi) return {step: 'dot2', text: 'Đợt 2: ' + b.doi + ' mẫu đã in nhưng dữ liệu đã đổi, cần in lại.'};
    if (b.chuaIn || b.nhap || b.thieu) return {step: 'dot2', text: 'In đợt 2: còn ' + (b.chuaIn) + ' mẫu chưa in (xem hướng in giấy trắng hoặc nền + in đè).'};
    return {step: 'xong', text: 'Hồ sơ đã in xong cả hai đợt và còn khớp dữ liệu hiện tại.'};
  }
  const api = {FORMS, byCode, applicable, emptyState, peek, stateOf, mark, unmark, evaluate, summary, next};
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.HAKQuyTrinh = api;
})(typeof self !== 'undefined' ? self : this);
