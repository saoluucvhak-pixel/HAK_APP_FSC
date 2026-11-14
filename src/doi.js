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
  /* chia một số lượng (tấn hoặc ha) cho các đội theo số người; làm tròn 3 chữ số, đội cuối nhận phần còn lại để tổng khớp đúng */
  function chia(vol, doi) {
    if (typeof vol !== 'number' || !(vol > 0) || !doi.length) return doi.map(() => null);
    let used = 0; return doi.map((d, i) => { const v = i === doi.length - 1 ? Math.round((vol - used) * 1000) / 1000 : Math.round(vol * d.share * 1000) / 1000; used += v; return v; });
  }
  /* Hình thức trực tiếp không có hợp đồng giao khoán nên không chia đội: coi cả lô là một đội (Tổ trưởng đầu tiên, mọi người còn lại) */
  function single(nc, isTT) {
    nc = nc || []; const t = nc.find(isTT);
    return {multi: false, doi: t ? [{key: keyOf(t), ten: trim(t.doi), tt: t, members: nc.filter(r => r !== t), n: nc.length, share: 1}] : [], errs: [], orphans: []};
  }
  const api = {build, single, chia, keyOf, fold};
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.HAKDoi = api;
})(typeof self !== 'undefined' ? self : this);
