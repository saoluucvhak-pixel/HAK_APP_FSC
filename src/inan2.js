/* Luồng "In hồ sơ đợt 2" cho BM-08, BM-09, BM-10, BM-14. Hàm thuần (không đọc giao diện) dùng chung cho màn hình Xuất hồ sơ và kiểm thử.
 *
 * Hai trạng thái độc lập cho từng mục (BM-08, BM-14 theo lô; BM-09, BM-10 theo từng nhóm người vận chuyển, khóa nhóm = số CCCD người ký):
 *   - "Đủ dữ liệu để in": tính lại mỗi lần từ dữ liệu hiện có (không lưu).
 *   - "Đã in mẫu nền": do người dùng xác nhận, LƯU trong dữ liệu của lô (f.inDot2) cùng chữ ký bố cục tại thời điểm xác nhận.
 * Chữ ký bố cục = băm của chính file mẫu nền sẽ in (XML tài liệu + khổ giấy, lề, chân trang), nên mọi thay đổi làm xê dịch chữ cố định, số dòng, ngắt trang
 * (danh sách công nhân, nhóm vận chuyển, địa chỉ dài, phiên bản mẫu…) đều làm chữ ký đổi. Điền số vào các ô trống dành sẵn KHÔNG làm đổi chữ ký. */
(function (root) {
  const ORDER = ['08', '09', '10', '14'];
  const FORMS = {
    '08': {label: 'BM-08 Bảng thanh toán tiền công', grouped: false},
    '09': {label: 'BM-09 Xác nhận khối lượng vận chuyển', grouped: true},
    '10': {label: 'BM-10 Thanh toán tiền vận chuyển', grouped: true},
    '14': {label: 'BM-14 Nghiệm thu, thanh lý khai thác', grouped: false}
  };
  /* Phiên bản mẫu đợt 2: tăng khi thay đổi cách dựng bố cục (mọi tờ nền cũ hết giá trị đối chiếu) */
  const TEMPLATE_VER = '1';
  const keyOf = (code, gkey) => (FORMS[code] && FORMS[code].grouped ? code + ':' + String(gkey == null ? '' : gkey) : code);
  const splitKey = k => { const i = String(k).indexOf(':'); return i < 0 ? {code: k, gkey: ''} : {code: k.slice(0, i), gkey: k.slice(i + 1)}; };

  /* băm 53 bit (cyrb53), đồng bộ, ổn định giữa máy */
  function hash(str) {
    let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
    for (let i = 0; i < str.length; i++) { const c = str.charCodeAt(i); h1 = Math.imul(h1 ^ c, 2654435761); h2 = Math.imul(h2 ^ c, 1597334677); }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
  }
  /* layout = {ver, land, tight, footer, xml}: trả {sig, info} (info dùng để giải thích khi chữ ký đổi) */
  function signature(l) {
    const sig = hash(JSON.stringify([TEMPLATE_VER, !!l.land, !!l.tight, l.footer || '', l.xml || '']));
    const info = Object.assign({ver: TEMPLATE_VER, land: !!l.land, tight: !!l.tight}, l.stats || {});
    return {sig, info};
  }
  const INFO_LABEL = {ver: 'phiên bản mẫu', land: 'hướng giấy', tight: 'cỡ lề/chữ thu gọn', rows: 'số dòng bảng', paras: 'số đoạn văn', maxLine: 'độ dài dòng dài nhất', workers: 'số người lao động', trips: 'số chuyến', nguoi: 'người ký'};
  const fmtV = (k, v) => k === 'land' ? (v ? 'khổ ngang' : 'khổ dọc') : k === 'tight' ? (v ? 'thu gọn' : 'thường') : String(v);
  /* khác biệt dễ hiểu giữa thông tin bố cục lúc in nền và hiện tại */
  function layoutDiff(a, b) {
    const out = [];
    if (!a || !b) return out;
    Object.keys(INFO_LABEL).forEach(k => { if (a[k] !== undefined && b[k] !== undefined && a[k] !== b[k]) out.push(INFO_LABEL[k] + ': ' + fmtV(k, a[k]) + ' → ' + fmtV(k, b[k])); });
    return out;
  }

  /* ----- trạng thái lưu trong lô ----- */
  const emptyState = () => ({v: 1, items: {}});
  function stateOf(f) {
    if (!f.inDot2 || typeof f.inDot2 !== 'object' || typeof f.inDot2.items !== 'object' || !f.inDot2.items) f.inDot2 = emptyState();
    return f.inDot2;
  }
  /* Chỉ đọc (không tạo trường mới trong dữ liệu của lô): dùng khi chỉ hiển thị */
  const peek = f => (f && f.inDot2 && typeof f.inDot2.items === 'object' && f.inDot2.items ? f.inDot2 : emptyState());
  /* Xác nhận đã in nền: ghi chữ ký bố cục hiện tại. it = mục từ app: {key, sig, info} */
  function confirm(st, it, now) { st.items[it.key] = {at: now, sig: it.sig, info: it.info || null, legacy: false}; return st.items[it.key]; }
  /* Tờ nền in từ trước khi có chức năng này: chưa biết bố cục, bắt buộc đối chiếu trước khi in đè */
  function confirmLegacy(st, it, now) { st.items[it.key] = {at: now, sig: '', info: null, legacy: true, crossChecked: false}; return st.items[it.key]; }
  function crossChecked(st, key, now) { const r = st.items[key]; if (r && r.legacy) { r.crossChecked = true; r.crossAt = now; } return !!r; }
  function unconfirm(st, key) { const had = !!st.items[key]; delete st.items[key]; return had; }

  /* ----- đánh giá một mục -----
   * it: {key, code, gkey, label, nenMissing: [câu], fullMissing: [câu], sig, info, tab}   (nenMissing/fullMissing rỗng = đủ)
   * Trả {…it, printed, nenReady, fullReady, advice, why, diff}
   * advice: 'trang' (đủ dữ liệu, chưa in nền → in đầy đủ giấy trắng) | 'nen' (chưa đủ để in đầy đủ nhưng đủ để in nền) | 'thieu' (chưa đủ cả nền)
   *         'de' (đủ dữ liệu, đã in nền, bố cục khớp → in đè) | 'cho' (đã in nền, chờ đủ dữ liệu) | 'kiemtra' (nền in từ trước, cần đối chiếu)
   *         'doibocuc' (đã in nền nhưng bố cục đã đổi → in lại nền hoặc in đầy đủ giấy trắng) */
  function evaluate(it, st) {
    const rec = st && st.items ? st.items[it.key] : null;
    const nenReady = !(it.nenMissing || []).length, fullReady = !(it.fullMissing || []).length, printed = !!rec;
    const o = Object.assign({}, it, {printed, nenReady, fullReady, diff: [], legacy: !!(rec && rec.legacy), at: rec ? rec.at : '', crossChecked: !!(rec && rec.crossChecked)});
    if (!printed) { o.advice = fullReady ? 'trang' : nenReady ? 'nen' : 'thieu'; return o; }
    if (rec.legacy) {
      o.advice = !fullReady ? 'cho' : rec.crossChecked ? 'de' : 'kiemtra';
      return o;
    }
    const same = rec.sig === it.sig;
    if (!same) { o.advice = 'doibocuc'; o.diff = layoutDiff(rec.info, it.info); return o; }
    o.advice = fullReady ? 'de' : 'cho';
    return o;
  }
  /* Gom: danh sách mục đã đánh giá → các gói và thông điệp chính */
  function plan(list) {
    const by = a => list.filter(x => x.advice === a);
    const trang = list.filter(x => x.fullReady && (x.advice === 'trang' || x.advice === 'doibocuc')),
      nen = list.filter(x => x.nenReady && (x.advice === 'trang' || x.advice === 'nen' || x.advice === 'doibocuc')),
      de = list.filter(x => x.advice === 'de'), kiemtra = by('kiemtra'), cho = by('cho'), thieu = by('thieu');
    const allFull = list.length > 0 && list.every(x => x.fullReady), nonePrinted = list.every(x => !x.printed);
    return {
      trang, nen, de, kiemtra, cho, thieu, doibocuc: by('doibocuc'),
      /* nút chính: đủ dữ liệu cả bốn mẫu và chưa mẫu nào in nền → in đầy đủ một lần trên giấy trắng */
      primary: allFull && nonePrinted ? 'trang' : de.length || kiemtra.length ? 'de' : nen.length ? 'nen' : '',
      allFull, nonePrinted, anyPrinted: list.some(x => x.printed)
    };
  }
  /* Có đủ cả bốn mẫu (mỗi mẫu ít nhất một mục) không: BM-09/10 cần ít nhất một nhóm vận chuyển */
  const coverage = list => ORDER.filter(c => !list.some(x => x.code === c));

  const api = {ORDER, FORMS, TEMPLATE_VER, keyOf, splitKey, hash, signature, layoutDiff, INFO_LABEL, emptyState, stateOf, peek, confirm, confirmLegacy, crossChecked, unconfirm, evaluate, plan, coverage};
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.HAKInAn2 = api;
})(typeof self !== 'undefined' ? self : this);
