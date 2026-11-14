/* Đọc số tiền / đơn giá từ ô bảng tính, ô nhập tay và Google Sheets: MỘT quy tắc cho mọi đường nhập.
 * Kiểm tra TOÀN BỘ chuỗi trước khi đổi sang số; không tự đoán định dạng mơ hồ.
 *  - Ô số thật: hữu hạn, trong phạm vi.
 *  - Chuỗi chấp nhận: 1250000 | 1250,5 | 1250.50 (tối đa 2 số lẻ, không có nhóm nghìn) | 1.250.000 | 1.250.000,5 (kiểu Việt: chấm là nghìn) | 1,250,000 | 1,250,000.5 (kiểu Anh),
 *    có thể kèm đơn vị cuối: đ, vnđ, vnd, đồng.
 *  - Từ chối: số âm, ký hiệu mũ (1e6), chữ lẫn trong số, dấu chấm hoặc phẩy liền nhau, nhóm nghìn sai chỗ (1.2.3), định dạng mơ hồ (1.250 hoặc 1,250: có thể là 1.250 đồng hoặc 1 250 đồng),
 *    số ngoài phạm vi (> 1.000 tỷ).
 *  - Phân biệt: ô trống (blank, không phải lỗi), số 0 (ok, value 0) và lỗi (ok false, kèm lý do để báo người dùng).
 * parse(v) → {ok, blank, value, reason, raw}. Hàm thuần, dùng chung ở giao diện và tiến trình chính. */
(function (root) {
  const MAX = 1e12;
  const SUFFIX = /\s*(?:vnđ|vnd|đồng|dong|đ)\.?$/i;
  function fail(raw, reason) { return {ok: false, blank: false, value: null, reason, raw}; }
  function parse(v) {
    if (v === null || v === undefined) return {ok: true, blank: true, value: null, reason: '', raw: v};
    if (typeof v === 'number') {
      if (!isFinite(v)) return fail(v, 'không phải số hữu hạn');
      if (v < 0) return fail(v, 'là số âm');
      if (v > MAX) return fail(v, 'vượt phạm vi cho phép (tối đa 1.000 tỷ)');
      return {ok: true, blank: false, value: v, reason: '', raw: v};
    }
    if (typeof v !== 'string') return fail(v, 'không phải số');
    let t = v.replace(/[   ]/g, ' ').trim();
    if (t === '') return {ok: true, blank: true, value: null, reason: '', raw: v};
    t = t.replace(SUFFIX, '').trim();
    if (/^[-−–]/.test(t)) return fail(v, 'là số âm');
    if (/[eE]\d/.test(t) && /^\d/.test(t)) return fail(v, 'viết dạng mũ (1e6) nên không đọc được');
    if (/[^\d.,]/.test(t)) return fail(v, 'có ký tự không phải số');
    if (/[.,]{2,}/.test(t) || /^[.,]/.test(t) || /[.,]$/.test(t)) return fail(v, 'dấu chấm hoặc phẩy đặt sai chỗ');
    let n = null;
    if (/^\d+$/.test(t)) n = Number(t);
    else if (/^\d{1,3}(\.\d{3}){2,}$/.test(t)) n = Number(t.replace(/\./g, ''));                       // 1.250.000
    else if (/^\d{1,3}(,\d{3}){2,}$/.test(t)) n = Number(t.replace(/,/g, ''));                        // 1,250,000
    else if (/^\d{1,3}(\.\d{3})+,\d{1,2}$/.test(t)) n = Number(t.replace(/\./g, '').replace(',', '.'));   // 1.250.000,5
    else if (/^\d{1,3}(,\d{3})+\.\d{1,2}$/.test(t)) n = Number(t.replace(/,/g, ''));                  // 1,250,000.5
    else if (/^\d+[.,]\d{1,2}$/.test(t)) n = Number(t.replace(',', '.'));                             // 1250.50 | 1250,5
    else if (/^\d{1,3}[.,]\d{3}$/.test(t)) return fail(v, 'định dạng mơ hồ (“' + t + '” có thể là ' + t.replace(/[.,]/, '') + ' hoặc ' + t.replace(',', '.') + '): nhập 1250 hoặc 1.250,000');
    else return fail(v, 'định dạng không hợp lệ');
    if (!isFinite(n) || n > MAX) return fail(v, 'vượt phạm vi cho phép (tối đa 1.000 tỷ)');
    return {ok: true, blank: false, value: n, reason: '', raw: v};
  }
  /* Giá trị số dương hoặc null (trống, bằng 0 hoặc lỗi): dùng khi chỉ cần số hợp lệ */
  const positive = v => { const r = parse(v); return r.ok && r.value > 0 ? r.value : null; };
  /* Mô tả lỗi cho người dùng: “Đơn giá phiếu PC001: “-1.250.000” là số âm”. Trả '' khi ô trống hoặc hợp lệ và dương (hoặc 0 khi cho phép). */
  function problem(label, v, opt) {
    const r = parse(v); opt = opt || {};
    if (r.blank) return '';
    if (!r.ok) return label + ': “' + String(r.raw) + '” ' + r.reason;
    if (r.value === 0 && !opt.allowZero) return label + ': bằng 0, cần số lớn hơn 0';
    return '';
  }
  const api = {parse, positive, problem, MAX};
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.HAKMoney = api;
})(typeof window !== 'undefined' ? window : globalThis);
