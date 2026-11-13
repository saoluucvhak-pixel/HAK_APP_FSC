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
  /* Hướng in đợt 2 của một mẫu, tổng hợp từ trạng thái từng mục (BM-09, BM-10: mỗi người vận chuyển một mục; src/inan2.js).
   * items = [{advice}] với advice: trang | nen | thieu | de | cho | kiemtra | doibocuc.  Trả {cls, text, key}. */
  function route(items) {
    const n = items.length, c = a => items.filter(x => x.advice === a).length;
    if (!n) return {cls: 'err', key: 'trong', text: 'Chưa có mục nào (khai đội xe ở tab Vận chuyển)'};
    if (c('doibocuc')) return {cls: 'err', key: 'doibocuc', text: 'Bố cục đã đổi sau khi in nền: in lại nền hoặc in giấy trắng'};
    if (c('de') + c('kiemtra') === n) return {cls: 'ok', key: 'de', text: 'Nền đã in, đủ dữ liệu: in đè' + (c('kiemtra') ? ' (đối chiếu nền in từ trước)' : '')};
    if (c('cho') === n) return {cls: 'warn', key: 'cho', text: 'Nền đã in, chờ bổ sung dữ liệu để in đè'};
    if (c('trang') === n) return {cls: 'ok', key: 'trang', text: 'Đủ dữ liệu, chưa in nền: in giấy trắng'};
    if (c('nen') === n) return {cls: 'warn', key: 'nen', text: 'Chưa đủ để in đầy đủ: in mẫu nền trước'};
    if (c('thieu') === n) return {cls: 'err', key: 'thieu', text: 'Chưa đủ dữ liệu để dựng cả mẫu nền'};
    const parts = [['de', 'in đè'], ['kiemtra', 'đối chiếu nền cũ'], ['cho', 'nền đã in, chờ dữ liệu'], ['trang', 'giấy trắng'], ['nen', 'in nền'], ['thieu', 'chưa đủ dữ liệu']].map(([k, l]) => c(k) ? c(k) + '/' + n + ' ' + l : '').filter(Boolean);
    return {cls: 'warn', key: 'hon', text: 'Từng nhóm khác nhau: ' + parts.join('; ')};
  }
  /* d2 = {nenReady, nenPrinted, deReady, cho, doibocuc, trang} (đếm số MỤC đợt 2) */
  const d2Text = d2 => (!d2 ? '' : 'nền ' + d2.nenPrinted + ' mục · in đè ' + d2.deReady + ' mục');
  /* việc nên làm tiếp (một câu), theo thứ tự quy trình. o: {chuaChuanBi, coPhieuCan, d2} */
  function next(sum, o) {
    o = o || {}; const d2 = o.d2 || {nenReady: 0, nenPrinted: 0, deReady: 0, cho: 0, doibocuc: 0, trang: 0};
    if (o.chuaChuanBi) return {step: 'chuanbi', text: 'Hoàn tất bước chuẩn bị: ' + o.chuaChuanBi};
    const a = sum.dot1;
    if (a.thieu) return {step: 'dot1', text: 'Đợt 1 còn ' + a.thieu + ' mẫu chưa đủ dữ liệu để xuất.'};
    if (a.doi) return {step: 'dot1', text: 'Đợt 1: ' + a.doi + ' mẫu đã in nhưng dữ liệu đã đổi, cần in lại.'};
    if (a.chuaIn || a.nhap) return {step: 'dot1', text: 'In đợt 1: còn ' + a.chuaIn + ' mẫu chưa in' + (a.nhap ? ', ' + a.nhap + ' mẫu đang là bản nháp' : '') + '.'};
    const b = sum.dot2;
    if (b.xong) return {step: 'xong', text: 'Hồ sơ đã in xong cả hai đợt và còn khớp dữ liệu hiện tại.'};
    if (d2.doibocuc) return {step: 'dot2', text: 'Đợt 2: ' + d2.doibocuc + ' mục đã đổi bố cục sau khi in nền. Không in đè được: in lại mẫu nền (rồi xác nhận lại) hoặc in đầy đủ trên giấy trắng.'};
    if (!o.coPhieuCan) {
      if (d2.nenPrinted) return {step: 'khaithac', text: 'Đã in nền ' + d2.nenPrinted + ' mục đợt 2. Chờ khai thác và cân: nạp phiếu cân, nhập khối lượng thực tế và ngày lập; khi đủ dữ liệu sẽ in đè lên tờ nền đã in.'};
      if (d2.nenReady) return {step: 'khaithac', text: 'Đợt 1 đã in xong. Có thể in sẵn mẫu nền đợt 2 ngay bây giờ (chữ cố định in sẵn, số để trống; nhớ bấm “Xác nhận đã in mẫu nền”), rồi chờ phiếu cân; hoặc chờ đủ dữ liệu để in đầy đủ một lần trên giấy trắng.'};
      return {step: 'khaithac', text: 'Đợt 1 đã in xong. Chờ khai thác và cân: nạp phiếu cân, nhập khối lượng thực tế.'};
    }
    if (d2.deReady) return {step: 'dot2', text: 'In đè đợt 2: nạp lại tờ mẫu nền đã in cho ' + d2.deReady + ' mục rồi in phần bổ sung' + (d2.trang ? '; ' + d2.trang + ' mục chưa in nền thì in giấy trắng' : '') + '. Sau khi in xong, đánh dấu đã in.'};
    if (d2.cho) return {step: 'dot2', text: 'Đã in nền ' + d2.cho + ' mục nhưng còn thiếu dữ liệu để in đè: bổ sung (xem cột “Hướng in”).'};
    if (b.doi) return {step: 'dot2', text: 'Đợt 2: ' + b.doi + ' mẫu đã in nhưng dữ liệu đã đổi, cần in lại.'};
    if (b.chuaIn || b.nhap || b.thieu) return {step: 'dot2', text: 'In đợt 2: ' + (d2.trang ? d2.trang + ' mục đủ dữ liệu, chưa in nền: in giấy trắng. ' : '') + 'Sau khi in xong (giấy trắng hoặc in đè), đánh dấu đã in.'};
    return {step: 'dot2', text: 'Đợt 2: đánh dấu các mẫu đã in xong.'};
  }
  const api = {FORMS, byCode, applicable, emptyState, peek, stateOf, mark, unmark, evaluate, summary, route, d2Text, next};
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.HAKQuyTrinh = api;
})(typeof self !== 'undefined' ? self : this);
