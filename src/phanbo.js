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
  const kgCua = p => (typeof require === 'function' ? require('./dinhmuc.js') : root.HAKDinhMuc).kgPhieu(p);   // kg của một phiếu (một định nghĩa: src/dinhmuc.js)
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
  /* CẢNH BÁO KHI XUẤT (phiếu #03, quyết định của CHỦ 18/11/2026: không chặn xuất): ở chế độ “theo phiếu” còn phiếu chưa gán đội thì khối lượng từng đội ở BM-08 / BM-14
   * lặng lẽ chia THEO SỐ NGƯỜI (doiOf), còn màn Phân bổ chỉ hiện “chưa phân bổ”. Hàm này nhận kết quả doiOf (b) và trả nội dung cảnh báo, hoặc null khi không rơi vào trường hợp đó
   * (gán đủ, chia đều, một đội, số nhập tay của hồ sơ cũ, không có phiếu). Chỉ đọc: không đổi dữ liệu và không đổi số in.
   * → {soPhieu, kg, tan, phieu: [{soPhieu, ngay, bienSo, kg, tan}], chia: [{ten, tan}] (phần từng đội sẽ in), nguon: 'songuoi'} */
  function chuaGanXuat(b) {
    if (!b || !b.multi || b.klNguon !== 'songuoi') return null;
    const ds = (b.phieuChuaGan || []).filter(p => kgCua(p) > 0); if (!ds.length) return null;
    const kg = ds.reduce((a, p) => a + kgCua(p), 0);
    return {soPhieu: ds.length, kg, tan: kg / 1000, phieu: ds.map(p => ({soPhieu: p.soPhieu == null ? '' : String(p.soPhieu), ngay: p.ngay || '', bienSo: p.bienSo || '', kg: kgCua(p), tan: kgCua(p) / 1000})),
      chia: (b.doi || []).map(d => ({ten: d.ten || '', tan: d.khoiLuong})), nguon: 'songuoi'};
  }
  const tanVN = t => String(Math.round(t * 1000) / 1000).replace('.', ',');
  /* một dòng giải thích dùng ở màn Phân bổ và danh sách hợp đồng (thay cho “0 t” / “—” im lặng) */
  const chuaGanDong = c => !c ? '' : tanVN(c.tan) + ' t (' + c.soPhieu + ' phiếu) chưa gán đội; khi in BM-08 và BM-14, khối lượng sẽ chia theo số người của từng đội' +
    (c.chia && c.chia.length ? ' (' + c.chia.map(x => (x.ten || 'đội') + ' ' + tanVN(x.tan) + ' t').join(', ') + ')' : '') + '.';
  /* có phân bổ đầy đủ (không còn phiếu chưa gán) */
  const du = (f, cd) => { const t = tinh(f, cd); return t.chuaGanPhieu === 0; };
  /* phiếu #09: phiếu đã gán hết cho đội khác nhưng còn đội CHƯA CÓ phiếu cân nào, khối lượng đội đang chia theo số người (BM-08, BM-14) → nội dung cảnh báo; null nếu không rơi vào trường hợp này. Không đổi số in. */
  function chuaPhieuXuat(b) {
    if (!b || !b.multi || b.klNguon !== 'songuoi') return null;
    const ten = (b.doiChuaPhieu || []).filter(x => x != null); if (!ten.length) return null;
    return {doi: ten.map(t => t || 'Đội'), chia: (b.doi || []).map(d => ({ten: d.ten || '', tan: d.khoiLuong})), nguon: 'songuoi'};
  }
  const chuaPhieuDong = c => !c ? '' : 'đội ' + c.doi.map(t => '“' + t + '”').join(', ') + ' chưa có phiếu cân nào (phiếu đã gán hết cho đội khác); khi in BM-08 và BM-14, khối lượng sẽ chia theo số người của từng đội' + (c.chia.length ? ' (' + c.chia.map(x => (x.ten || 'Đội') + ' ' + tanVN(x.tan) + ' t').join(', ') + ')' : '');
  const api = {CHE_DO, cheDo, cheDoHopLe, tinh, theoDoi, du, kgCua, chuaGanXuat, chuaGanDong, chuaPhieuXuat, chuaPhieuDong};
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.HAKPhanBo = api;
})(typeof self !== 'undefined' ? self : this);
