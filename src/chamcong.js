/* Chấm công thực tế theo ngày (hình thức tính lương theo ngày công, cả giao khoán lẫn trực tiếp).
 * Dữ liệu lưu trong rừng: cc = { 'yyyy-mm': { <khóa người>: { '1': 1, '2': 0.5, ... } } }.
 * Khóa người = CCCD, không có thì họ tên. Ô để trống = chưa chấm; 0 = nghỉ. Một ô là số công của ngày đó (0 đến 3, tối đa 2 số lẻ).
 * Quy tắc tính tiền: nếu rừng đã có bất kỳ dữ liệu chấm công nào thì số công mỗi người = tổng công đã chấm của người đó (người chưa chấm = 0);
 * chưa có dữ liệu thì dùng số công theo thời gian khai thác (trừ Chủ nhật). Hàm thuần, dùng chung cho giao diện, BM-05, BM-08 và kiểm thử. */
(function (root) {
  const pad = n => (n < 10 ? '0' : '') + n;
  const key = (y, m) => y + '-' + pad(m);
  const daysIn = k => { const [y, m] = k.split('-').map(Number); return new Date(y, m, 0).getDate(); };
  const isSunday = (k, d) => { const [y, m] = k.split('-').map(Number); return new Date(y, m - 1, d).getDay() === 0; };
  const personKey = r => String((r && (r.cccd || r.ten)) || '').trim();
  /* các tháng (yyyy-mm) từ ngày a đến ngày b (Date); thiếu một trong hai thì rỗng */
  function monthsBetween(a, b) {
    if (!(a instanceof Date) || !(b instanceof Date) || isNaN(a) || isNaN(b) || b < a) return [];
    const out = []; let y = a.getFullYear(), m = a.getMonth() + 1; const ey = b.getFullYear(), em = b.getMonth() + 1;
    while (y < ey || (y === ey && m <= em)) { out.push(key(y, m)); m++; if (m > 12) { m = 1; y++; } if (out.length > 60) break; }
    return out;
  }
  /* đọc ô nhập của người dùng: '', '1', '0,5', '0.5' → null | số; trả undefined nếu không hợp lệ */
  function parseCell(s) {
    const t = String(s == null ? '' : s).trim().replace(',', '.'); if (t === '') return null;
    if (!/^\d+(\.\d{1,2})?$/.test(t)) return undefined; const v = Number(t); return v >= 0 && v <= 3 ? v : undefined;
  }
  const get = (cc, k, p, d) => { const v = (((cc || {})[k] || {})[p] || {})[d]; return typeof v === 'number' ? v : null; };
  /* ghi một ô; v = null thì xóa ô (dọn các nhánh rỗng) */
  function set(cc, k, p, d, v) {
    if (v == null) { const m = cc[k] && cc[k][p]; if (m) { delete m[d]; if (!Object.keys(m).length) delete cc[k][p]; if (!Object.keys(cc[k]).length) delete cc[k]; } return cc; }
    ((cc[k] = cc[k] || {})[p] = cc[k][p] || {})[d] = v; return cc;
  }
  const hasAny = cc => Object.values(cc || {}).some(m => Object.values(m || {}).some(p => Object.keys(p || {}).length > 0));
  const round2 = x => Math.round(x * 100) / 100;
  const total = (cc, p) => round2(Object.values(cc || {}).reduce((s, m) => s + Object.values((m || {})[p] || {}).reduce((a, v) => a + (typeof v === 'number' ? v : 0), 0), 0));
  const monthTotal = (cc, k, p) => round2(Object.values(((cc || {})[k] || {})[p] || {}).reduce((a, v) => a + (typeof v === 'number' ? v : 0), 0));
  /* điền 1 công cho mọi ngày làm việc (không phải Chủ nhật) của tháng k nằm trong [a, b] (Date) cho các người ps; ghi đè ô đã có */
  function fillWork(cc, k, ps, a, b) {
    const n = daysIn(k), [y, m] = k.split('-').map(Number); let c = 0;
    for (let d = 1; d <= n; d++) { const t = new Date(y, m - 1, d); if (t.getDay() === 0 || (a && t < a) || (b && t > b)) continue; ps.forEach(p => set(cc, k, p, d, 1)); c++; }
    return c;
  }
  const clearMonth = (cc, k) => { delete cc[k]; return cc; };
  const api = {key, daysIn, isSunday, personKey, monthsBetween, parseCell, get, set, hasAny, total, monthTotal, fillWork, clearMonth};
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.HAKChamCong = api;
})(typeof window !== 'undefined' ? window : globalThis);
