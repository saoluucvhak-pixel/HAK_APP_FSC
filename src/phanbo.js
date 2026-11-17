/* PHÂN BỔ KHỐI LƯỢNG NHÂN CÔNG theo rừng (bản 3.0). Hàm thuần.
 * Nguồn: toàn bộ phiếu cân ĐÃ LƯU của rừng (mọi hợp đồng vận chuyển). Đơn vị tính nội bộ: kg (số nguyên) để tổng luôn khớp.
 *  - một đội: đội nhận toàn bộ khối lượng rừng;
 *  - đúng hai đội: chọn một cách cho cả rừng — 'theoPhieu' (mỗi phiếu gán tối đa một đội qua pc.doiId) hoặc 'chiaDeu' (mỗi đội một nửa;
 *    tổng lẻ 1 kg thì 1 kg dư cho đội đứng TRƯỚC theo thứ tự đội trong rừng);
 *  - từ ba đội: luôn 'theoPhieu'.
 * cheDo(f): cách đang dùng (mặc định 'theoPhieu'; f.phanBo.cheDo = 'chiaDeu' chỉ có hiệu lực khi rừng có đúng hai đội).
 * tinh(f, cheDo?): {cheDo, tongKg, doi: [{id, ten, kg, soPhieu}], chuaGanKg, chuaGanPhieu, tong, ...tấn} — không sửa f. */
(function (root) {
  'use strict';
  const kgCua = p => { const v = typeof p.kl === 'number' ? p.kl : parseFloat(String(p.kl == null ? '' : p.kl).replace(',', '.')); return isFinite(v) && v > 0 ? Math.round(v * 1000) : 0; };
  const CHE_DO = {theoPhieu: 'Chọn phiếu theo đội', chiaDeu: 'Chia đều tổng khối lượng', motDoi: 'Một đội nhận toàn bộ'};
  function cheDoHopLe(f, cd) {
    const n = ((f && f.doi) || []).length;
    if (n <= 1) return 'motDoi';
    if (n === 2 && cd === 'chiaDeu') return 'chiaDeu';
    return 'theoPhieu';
  }
  const cheDo = f => cheDoHopLe(f, f && f.phanBo && f.phanBo.cheDo);
  function tinh(f, cd) {
    const doi = (f && f.doi) || [], pc = ((f && f.pc) || []).filter(Boolean), che = cheDoHopLe(f, cd === undefined ? (f && f.phanBo && f.phanBo.cheDo) : cd);
    const tongKg = pc.reduce((a, p) => a + kgCua(p), 0), out = doi.map(d => ({id: d.id, ten: d.ten || '', kg: 0, soPhieu: 0}));
    let chuaGanKg = 0, chuaGanPhieu = 0;
    if (che === 'motDoi') { if (out[0]) { out[0].kg = tongKg; out[0].soPhieu = pc.length; } else { chuaGanKg = tongKg; chuaGanPhieu = pc.length; } }
    else if (che === 'chiaDeu') { const nua = Math.floor(tongKg / 2); out[0].kg = tongKg - nua; out[1].kg = nua; out[0].soPhieu = out[1].soPhieu = pc.length; }
    else pc.forEach(p => { const d = out.find(x => x.id === p.doiId); if (d) { d.kg += kgCua(p); d.soPhieu++; } else { chuaGanKg += kgCua(p); chuaGanPhieu++; } });
    const tan = kg => kg / 1000;
    return {cheDo: che, ten: CHE_DO[che], tongKg, tong: tan(tongKg), doi: out.map(d => Object.assign(d, {tan: tan(d.kg)})), chuaGanKg, chuaGan: tan(chuaGanKg), chuaGanPhieu, soPhieu: pc.length};
  }
  /* khối lượng (tấn) của từng đội theo phân bổ: {doiId: tấn}; đội chưa có phiếu gán nhận 0 */
  const theoDoi = (f, cd) => Object.fromEntries(tinh(f, cd).doi.map(d => [d.id, d.tan]));
  /* có phân bổ đầy đủ (không còn phiếu chưa gán) */
  const du = (f, cd) => { const t = tinh(f, cd); return t.chuaGanPhieu === 0; };
  const api = {CHE_DO, cheDo, cheDoHopLe, tinh, theoDoi, du, kgCua};
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.HAKPhanBo = api;
})(typeof self !== 'undefined' ? self : this);
