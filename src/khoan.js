/* Đơn giá khoán của tổ suy ra từ định biên nhân sự (hình thức giao khoán).
 * Mỗi người được chia đều sản lượng (tấn hoặc ha): tiền của người i = làm tròn(sản lượng ÷ N × đơn giá vị trí i).
 * Đơn giá khoán của tổ (giá Tổ trưởng ký với chủ rừng) = (tổng đơn giá các vị trí theo định biên) ÷ N, nên
 *   đơn giá khoán × sản lượng  =  tổng tiền của từng người cộng lại (sai khác chỉ do làm tròn từng người, tối đa N/2 đồng).
 * Tổng tiền dùng trong biểu mẫu LUÔN là tổng tiền từng người cộng lại. Hàm thuần, dùng chung cho BM-01, BM-08, BM-14 và kiểm thử. */
(function (root) {
  /* rates: đơn giá của từng người (số > 0, theo định biên: Tổ trưởng + công nhân…); vol: sản lượng hoặc null */
  function derive(rates, vol) {
    const N = rates.length, ok = N > 0 && rates.every(r => typeof r === 'number' && r > 0);
    const sumRates = ok ? rates.reduce((s, r) => s + r, 0) : null, price = ok ? sumRates / N : null;
    const each = (ok && typeof vol === 'number' && vol > 0) ? vol / N : null;
    const amounts = each != null ? rates.map(r => Math.round(each * r)) : null, total = amounts ? amounts.reduce((s, a) => s + a, 0) : null;
    const byPrice = (price != null && each != null) ? price * vol : null;
    return {N, ok, sumRates, price, each, amounts, total, byPrice, diff: (total != null && byPrice != null) ? byPrice - total : null};
  }
  const grp = n => String(Math.floor(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  /* hiển thị đơn giá: số nguyên → 360.000; có lẻ → 356.666,67 */
  function fmtPrice(p) {
    if (p == null || !isFinite(p)) return '';
    if (Number.isInteger(p)) return grp(p);
    const s = (Math.round(p * 100) / 100).toFixed(2), [i, d] = s.split('.');
    return d === '00' ? grp(+i) : grp(+i) + ',' + d;
  }
  const api = {derive, fmtPrice};
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.HAKKhoan = api;
})(typeof self !== 'undefined' ? self : this);
