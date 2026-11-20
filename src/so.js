/* Bộ đọc khối lượng và đơn giá dùng chung (lô 1: T-01, T-02, T-03, N-04). Hàm thuần, dùng ở giao diện, tiến trình chính và kiểm thử Node.
 *  - parseKl(v, {don: 'kg'|'tan'}): từ chối "0x…", "1e…", số âm, chữ lạ; "12,500" luôn báo mơ hồ; "12.500" theo đơn vị cột ('kg' → 12500, 'tan' → 12.5, không rõ đơn vị → báo mơ hồ).
 *  - toDec(v, o): bộ đổi số thập phân dùng chung cho normPC, biểu mẫu và kiểm thử (thay các bản sao toDec rải rác).
 *  - parseDonGia(v) / docBangDonGia(entries, oldMap): dùng HAKMoney.parse; ô trống = xóa đơn giá; chữ lạ hoặc số âm = báo lỗi và giữ nguyên đơn giá cũ. */
(function (root) {
  'use strict';
  const Money = () => (typeof HAKMoney !== 'undefined' ? HAKMoney : (typeof require === 'function' ? require('./money.js') : root.HAKMoney));
  const trim = v => String(v == null ? '' : v).replace(/[\u00a0\u2007\u202f]/g, ' ').trim();
  const fail = (raw, reason, moHo) => ({ok: false, blank: false, moHo: !!moHo, value: null, reason, error: reason, raw});

  function parseKl(v, o) {
    o = o || {}; const don = o.don || '';
    if (v === null || v === undefined) return {ok: true, blank: true, moHo: false, value: null, reason: '', error: '', raw: v};
    if (typeof v === 'number') {
      if (!isFinite(v)) return fail(v, 'không phải số hữu hạn');
      if (v < 0) return fail(v, 'khối lượng không được là số âm');
      return {ok: true, blank: false, moHo: false, value: v, reason: '', error: '', raw: v};
    }
    if (typeof v !== 'string') return fail(v, 'không phải số');
    const t = trim(v);
    if (t === '') return {ok: true, blank: true, moHo: false, value: null, reason: '', error: '', raw: v};
    if (/^[-−–]/.test(t)) return fail(v, 'khối lượng không được là số âm');
    if (/^0[xXobOB]/.test(t) || /[eE]/.test(t)) return fail(v, 'định dạng số không hợp lệ');
    if (/[^\d.,]/.test(t) || /[.,]{2,}/.test(t) || /^[.,]|[.,]$/.test(t)) return fail(v, 'có ký tự không phải số');
    if (/^\d{1,3},\d{3}$/.test(t)) return fail(v, 'định dạng mơ hồ (“' + t + '” có 3 chữ số sau dấu phẩy)', true);
    if (/^\d{1,3}\.\d{3}$/.test(t)) {
      if (don === 'kg') return {ok: true, blank: false, moHo: false, value: Number(t.replace(/\./g, '')), reason: '', error: '', raw: v};
      if (don === 'tan') return {ok: true, blank: false, moHo: false, value: Number(t), reason: '', error: '', raw: v};
      return fail(v, 'định dạng mơ hồ (“' + t + '” chưa rõ đơn vị kg hay tấn)', true);
    }
    let n = null;
    if (/^\d+$/.test(t)) n = Number(t);
    else if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(t)) n = Number(t.replace(/\./g, '').replace(',', '.'));
    else if (/^\d+,\d+$/.test(t)) n = Number(t.replace(',', '.'));
    else if (/^\d+\.\d+$/.test(t)) n = Number(t);
    else return fail(v, 'định dạng số không hợp lệ');
    if (!isFinite(n)) return fail(v, 'không phải số hữu hạn');
    return {ok: true, blank: false, moHo: false, value: n, reason: '', error: '', raw: v};
  }

  function toDec(v, o) {
    if (o && o.don) {
      const r = parseKl(v, o);
      return r.blank ? null : r.ok ? r.value : 'x';
    }
    if (v === null || v === undefined) return null;
    if (typeof v === 'number') return isFinite(v) ? v : 'x';
    const t = trim(v);
    if (t === '') return null;
    if (/^0[xXobOB]/.test(t) || /[eE]/.test(t)) return 'x';
    if (/^-?\d{1,3}(\.\d{3})+(,\d+)?$/.test(t)) { const n = Number(t.replace(/\./g, '').replace(',', '.')); return isFinite(n) ? n : 'x'; }
    const s = t.replace(',', '.');
    if (!/^-?\d+(\.\d+)?$/.test(s)) return 'x';
    const n = Number(s);
    return isFinite(n) ? n : 'x';
  }

  function parseDonGia(v) {
    const r = Money().parse(v);
    if (r.blank) return {ok: true, blank: true, value: null, reason: '', error: '', raw: v};
    if (!r.ok) return {ok: false, blank: false, value: null, reason: r.reason, error: r.reason, raw: v};
    if (!(r.value > 0)) return {ok: false, blank: false, value: null, reason: 'phải là số lớn hơn 0', error: 'phải là số lớn hơn 0', raw: v};
    return {ok: true, blank: false, value: r.value, reason: '', error: '', raw: v};
  }

  /* entries: [[chucDanh, rawVal], ...]; oldMap: bảng đơn giá hiện có (giữ nguyên giá trị cũ nếu ô nhập bị lỗi) */
  function docBangDonGia(entries, oldMap) {
    const map = Object.assign({}, oldMap || {}), errs = [];
    (entries || []).forEach(([cd, raw]) => {
      const r = parseDonGia(raw);
      if (r.blank) { map[cd] = null; return; }
      if (!r.ok) { errs.push('Đơn giá vị trí “' + cd + '”: “' + String(raw) + '” ' + r.reason); return; }
      map[cd] = r.value;
    });
    return {ok: errs.length === 0, map, errs};
  }

  const MAX_TAN_CHUYEN = 60;
  const api = {parseKl, toDec, parseDonGia, docBangDonGia, MAX_TAN_CHUYEN};
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.HAKSo = api;
})(typeof self !== 'undefined' ? self : this);
