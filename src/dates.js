'use strict';
/* Quy tắc ngày lịch DÙNG CHUNG cho nhập Excel, lấy phiếu từ tra cứu, kiểm tra phiếu cân và báo cáo.
 * Định dạng dd/mm/yyyy (ngày, tháng 1–2 chữ số, năm 4 chữ số). Ngày phải CÓ THẬT trên lịch: đúng số ngày của tháng, đúng năm nhuận.
 * Ví dụ: 31/02/2026 và 29/02/2026 không có thật; 29/02/2028 có thật (2028 là năm nhuận); 29/02/1900 không có thật (1900 không nhuận).
 * Không phụ thuộc DOM hay Electron: chạy được ở trình duyệt (nhúng khi build), tiến trình chính và kiểm thử Node. */
(function (root) {
  const isLeap = y => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
  const daysIn = (y, m) => [31, isLeap(y) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m - 1];
  const pad2 = n => String(n).padStart(2, '0');

  /* 'dd/mm/yyyy' -> {y, m, d, key} nếu là ngày có thật, ngược lại null. key = yyyymmdd (số, so sánh được). */
  function parse(v) {
    const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(String(v == null ? '' : v).trim());
    if (!m) return null;
    const d = +m[1], mo = +m[2], y = +m[3];
    if (y < 1900 || y > 2200 || mo < 1 || mo > 12 || d < 1 || d > daysIn(y, mo)) return null;
    return {y, m: mo, d, key: y * 10000 + mo * 100 + d};
  }
  /* yyyymmdd; 0 nếu thiếu hoặc không có thật (để các phép so sánh/sắp xếp cũ vẫn dùng được, 0 = không xác định) */
  const key = v => { const p = parse(v); return p ? p.key : 0; };
  const isValid = v => !!parse(v);
  const format = p => pad2(p.d) + '/' + pad2(p.m) + '/' + p.y;
  /* 'yyyy-mm-dd' (ô chọn ngày của trình duyệt) -> 'dd/mm/yyyy'; '' nếu không có thật */
  function fromIso(s) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s || '').trim());
    if (!m) return '';
    const p = parse(+m[3] + '/' + +m[2] + '/' + m[1]);
    return p ? format(p) : '';
  }

  /* Lý do ngày không hợp lệ (tiếng Việt, đủ cụ thể để người dùng sửa); '' nếu hợp lệ */
  function why(v) {
    const s = String(v == null ? '' : v).trim();
    if (!s) return 'thiếu ngày';
    const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s);
    if (!m) return 'ngày “' + s + '” không đúng dạng dd/mm/yyyy';
    const d = +m[1], mo = +m[2], y = +m[3];
    if (mo < 1 || mo > 12) return 'ngày ' + s + ' không có thật (không có tháng ' + mo + ')';
    if (y < 1900 || y > 2200) return 'ngày ' + s + ' có năm ngoài khoảng 1900–2200';
    if (d < 1) return 'ngày ' + s + ' không có thật (ngày phải từ 1)';
    if (d > daysIn(y, mo)) return 'ngày ' + s + ' không có thật (tháng ' + mo + '/' + y + ' chỉ có ' + daysIn(y, mo) + ' ngày' + (mo === 2 && !isLeap(y) ? '; ' + y + ' không phải năm nhuận' : '') + ')';
    return '';
  }

  /* Kiểm tra khoảng ngày lọc. Trả {from, to, problem}: from/to là key (0 = không giới hạn); problem = '' hoặc lý do (ngày sai, khoảng bị đảo).
   * Khoảng đảo hoặc ngày sai KHÔNG tự đổi chỗ/đoán: lọc ra rỗng và báo lý do. */
  function range(from, to) {
    const f = String(from || '').trim(), t = String(to || '').trim(), out = {from: 0, to: 0, problem: ''};
    if (f) { const p = parse(f); if (!p) out.problem = 'Ngày bắt đầu: ' + why(f); else out.from = p.key; }
    if (t) { const p = parse(t); if (!p) out.problem = (out.problem ? out.problem + '; ' : '') + 'Ngày kết thúc: ' + why(t); else out.to = p.key; }
    if (!out.problem && out.from && out.to && out.from > out.to) out.problem = 'Ngày bắt đầu (' + f + ') sau ngày kết thúc (' + t + '): không có dòng nào thỏa';
    return out;
  }
  /* Một ngày có nằm trong khoảng lọc không. Ngày không có thật: false khi có lọc (không đoán); true khi không lọc gì. Khoảng lỗi: false. */
  function inRange(v, from, to) {
    const r = range(from, to);
    if (r.problem) return false;
    if (!r.from && !r.to) return true;
    const k = key(v);
    if (!k) return false;
    return (!r.from || k >= r.from) && (!r.to || k <= r.to);
  }

  const api = {isLeap, daysIn, parse, key, isValid, format, fromIso, why, range, inRange};
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.HAKDates = api;
})(typeof self !== 'undefined' ? self : this);
