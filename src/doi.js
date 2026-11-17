/* Đội khai thác: MỖI TỔ TRƯỞNG LÀ MỘT ĐỘI và ký hợp đồng giao khoán riêng (như mỗi người ký hợp đồng vận chuyển một hợp đồng). Hàm thuần, không phụ thuộc giao diện, dùng chung ở giao diện (nhúng khi build) và kiểm thử Node.
 *
 * Nhân công có thêm cột `doi` (tên đội, tùy chọn):
 *   - Lô có 0 hoặc 1 Tổ trưởng: một đội duy nhất gồm mọi người, cột `doi` bị bỏ qua (hồ sơ cũ không đổi).
 *   - Lô có từ 2 Tổ trưởng: mỗi Tổ trưởng phải có tên đội khác nhau; mỗi công nhân phải ghi tên đội trùng với đội của một Tổ trưởng.
 * Sản lượng (tấn hoặc ha) của lô chia cho các đội THEO SỐ NGƯỜI (mỗi người một phần như nhau, đúng quy tắc khoán chia đều trong từng đội). */
(function (root) {
  const trim = s => String(s == null ? '' : s).replace(/\s+/g, ' ').trim();
  const fold = s => trim(s).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();
  const keyOf = r => String(r.cccd || r.ten || '');
  /* nc: danh sách nhân công; isTT: hàm nhận diện Tổ trưởng.
   * Trả {multi, doi: [{key, ten, tt, members, n, share}], errs: [{row, text}], orphans: [nhân công chưa thuộc đội nào]} */
  function build(nc, isTT) {
    nc = nc || []; const tts = nc.filter(isTT), errs = [], orphans = [];
    if (tts.length <= 1) {
      const others = nc.filter(r => !isTT(r));
      return {multi: false, doi: tts.length ? [{key: keyOf(tts[0]), ten: trim(tts[0].doi), tt: tts[0], members: others, n: nc.length, share: 1}] : [], errs, orphans};
    }
    const by = new Map(), doi = [];
    tts.forEach(t => {
      const k = fold(t.doi);
      if (!k) { errs.push({row: t._row, text: 'Tổ trưởng “' + t.ten + '” chưa ghi tên đội: lô có nhiều Tổ trưởng thì mỗi Tổ trưởng là một đội, ghi tên đội ở cột Đội'}); return; }
      if (by.has(k)) { errs.push({row: t._row, text: 'Tên đội “' + trim(t.doi) + '” trùng với Tổ trưởng “' + by.get(k).tt.ten + '”: mỗi Tổ trưởng một đội riêng'}); return; }
      const d = {key: keyOf(t), ten: trim(t.doi), tt: t, members: [], n: 1, share: 0}; by.set(k, d); doi.push(d);
    });
    nc.filter(r => !isTT(r)).forEach(r => {
      const k = fold(r.doi), d = k ? by.get(k) : null;
      if (d) { d.members.push(r); d.n++; return; }
      orphans.push(r); errs.push({row: r._row, text: k ? 'Đội “' + trim(r.doi) + '” của “' + r.ten + '” không có Tổ trưởng' : '“' + r.ten + '” chưa thuộc đội nào: lô có nhiều Tổ trưởng thì ghi tên đội ở cột Đội'});
    });
    const total = doi.reduce((s, d) => s + d.n, 0) || 1; doi.forEach(d => { d.share = d.n / total; });
    return {multi: true, doi, errs, orphans};
  }
  /* Chia một số lượng (tấn hoặc ha) cho các đội theo tỷ lệ số người, đơn vị 0,001; tổng luôn khớp đúng.
   * GIỮ NGUYÊN SỐ ĐÃ IN: cách chia từ trước (làm tròn từng đội, đội cuối nhận phần còn lại) vẫn là cách chính, để lô nhiều đội không đổi số
   * trên các mẫu đã in, đã ký hay đã chốt. Chỉ khi cách đó cho một đội số ÂM (lượng rất nhỏ, ví dụ 0,002 tấn chia 4 đội ra -0,001) mới chia lại
   * theo phần dư lớn nhất: chia phần nguyên trước rồi cấp phần dư cho số lẻ lớn nhất. */
  function chiaCu(vol, doi) {
    let used = 0;
    return doi.map((d, i) => { const v = i === doi.length - 1 ? Math.round((vol - used) * 1000) / 1000 : Math.round(vol * d.share * 1000) / 1000; used += v; return v; });
  }
  function chia(vol, doi) {
    const units = Math.round(vol * 1000);
    if (typeof vol !== 'number' || !(vol > 0) || !Number.isSafeInteger(units) || !doi.length) return doi.map(() => null);
    const shares = doi.map(d => d.share);
    if (shares.some(share => !Number.isFinite(share) || share < 0)) return doi.map(() => null);
    const total = shares.reduce((sum, share) => sum + share, 0);
    if (!Number.isFinite(total) || total <= 0) return doi.map(() => null);
    const cu = chiaCu(vol, doi);
    if (cu.every(v => v >= 0)) return cu;
    const exact = shares.map(share => units * (share / total));
    const allocated = exact.map(Math.floor);
    const order = exact.map((value, index) => ({index, remainder: value - allocated[index]}));
    order.sort((a, b) => b.remainder - a.remainder || a.index - b.index);
    const remaining = units - allocated.reduce((sum, value) => sum + value, 0);
    if (remaining < 0 || remaining > order.length) return doi.map(() => null);
    order.slice(0, remaining).forEach(({index}) => { allocated[index]++; });
    return allocated.map(value => value / 1000);
  }
  /* Khối lượng thực tế của từng đội. Phiếu cân không ghi đội nên MẶC ĐỊNH chia theo số người (chia).
   * Nếu năng suất các đội khác nhau, người dùng nhập khối lượng thực tế riêng từng đội: klDoi = {khóa Tổ trưởng (keyOf): tấn}.
   * Chỉ dùng số nhập khi đủ MỌI đội và tổng khớp khối lượng thực tế của lô (lệch ≤ 1 kg); thiếu hoặc lệch thì vẫn chia theo số người và trả `loi` để báo.
   * Trả {vals: [tấn hoặc null theo thứ tự doi], nguon: 'nhap' | 'songuoi', loi: ''} */
  function khoiLuong(vol, doi, klDoi) {
    const m = klDoi || {}, given = doi.map(d => typeof m[d.key] === 'number' && isFinite(m[d.key]) && m[d.key] >= 0 ? m[d.key] : null), n = given.filter(v => v != null).length;
    const fallback = loi => ({vals: chia(vol, doi), nguon: 'songuoi', loi});
    if (!n || !doi.length) return fallback('');
    if (n < doi.length) return fallback('mới nhập khối lượng thực tế cho ' + n + '/' + doi.length + ' đội: nhập đủ mọi đội hoặc để trống hết (đang chia theo số người)');
    const sum = Math.round(given.reduce((s, v) => s + v, 0) * 1000) / 1000;
    if (!(typeof vol === 'number' && vol > 0)) return fallback('đã nhập khối lượng từng đội (tổng ' + String(sum).replace('.', ',') + ' tấn) nhưng chưa có khối lượng thực tế của cả lô để đối chiếu');
    if (Math.abs(sum - vol) > 0.001) return fallback('tổng khối lượng thực tế các đội ' + String(sum).replace('.', ',') + ' tấn khác khối lượng thực tế của lô ' + String(vol).replace('.', ',') + ' tấn (đang chia theo số người)');
    return {vals: given.map(v => Math.round(v * 1000) / 1000), nguon: 'nhap', loi: ''};
  }
  /* Hình thức trực tiếp không có hợp đồng giao khoán nên không chia đội: coi cả lô là một đội (Tổ trưởng đầu tiên, mọi người còn lại) */
  function single(nc, isTT) {
    nc = nc || []; const t = nc.find(isTT);
    return {multi: false, doi: t ? [{key: keyOf(t), ten: trim(t.doi), tt: t, members: nc.filter(r => r !== t), n: nc.length, share: 1}] : [], errs: [], orphans: []};
  }
  const api = {chiaCu, build, single, chia, khoiLuong, keyOf, fold};
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.HAKDoi = api;
})(typeof self !== 'undefined' ? self : this);
