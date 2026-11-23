/* Phát hiện phiếu cân "nghi đổi số" (hàm thuần, không IO), theo docs/THIET_KE_DU_LIEU_DOI_SO_PHAN_BO.md mục 3.3:
 *   phatHienDoiSo(phieuSheet[], phieuLo[], opt) → {ketQua: [{idx, tt, loId?, ungVien?, canhTranh?}], tomTat}
 *   tt ∈ 'trung' (khớp khóa số phiếu + ngày) | 'trung-so-cu' (khớp bí danh soCu) | 'nghi-doi-so' | 'moi' | 'khong-xet'.
 * Khớp khóa luôn thắng; lô đã được một dòng Sheet nhận ở lượt 1 không bao giờ là ứng viên ở lượt 2 (N7).
 * Không tự chọn ứng viên: người dùng quyết; sau mỗi thao tác "Đổi số" gọi lại hàm.
 * Thao tác ghi doiSoPhieu nằm ở src/stage.js; HAKBks.khoaTatCa ở src/bks.js. */
(function (root) {
  'use strict';
  const B = () => (typeof require === 'function' ? require('./bks.js') : root.HAKBks);
  const D = () => (typeof HAKDates !== 'undefined' ? HAKDates : (typeof require === 'function' ? require('./dates.js') : root.HAKDates));
  const TT = ['trung', 'trung-so-cu', 'nghi-doi-so', 'moi', 'khong-xet'];
  const ngayKey = v => { const t = String(v == null ? '' : v).trim(); const p = t ? D().parse(t) : null; return p && p.key ? String(p.key) : ''; };
  const kgLam = v => { const n = typeof v === 'number' ? v : (v === '' || v == null ? NaN : Number(v)); return Number.isFinite(n) ? Math.round(n) : NaN; };
  const cmpSo = (a, b) => { a = String(a == null ? '' : a); b = String(b == null ? '' : b); return a < b ? -1 : a > b ? 1 : 0; };
  const them = (m, k, v) => { if (!m.has(k)) m.set(k, []); m.get(k).push(v); };

  const MAX_UV = 20, MAX_N = 5000;
  /* LƯU Ý: s.kg và l.kg phải là SỐ đã chuẩn hóa (người gọi tự đổi chuỗi kiểu Việt Nam 'x.xxx' / 'x,xx' sang số trước); chuỗi không phải số hợp lệ bị coi là không có kg.
   * Quá 5000 dòng Sheet hoặc 5000 lô → trả {loi:'qua-lon', ketQua:[], tomTat} (không ném). */
  function phatHienDoiSo(phieuSheet, phieuLo, opt) {
    const bks = B(), sheet = phieuSheet || [], lo = phieuLo || [];
    if (sheet.length > MAX_N || lo.length > MAX_N) { const tomTat = {canhTranh: 0}; TT.forEach(t => { tomTat[t] = 0; }); return {loi: 'qua-lon', ketQua: [], tomTat, soDong: sheet.length, soLo: lo.length, toiDa: MAX_N}; }
    const nguong = opt && typeof opt.nguongKg === 'number' && opt.nguongKg >= 0 ? opt.nguongKg : 1;
    // 1. chỉ mục trên phieuLo
    const byKhoa = new Map(), byBiDanh = new Map(), byNgayBks = new Map();
    lo.forEach(l => {
      const k = bks.khoaPhieu({soPhieu: l.so, ngay: l.ngay}); if (k) them(byKhoa, k, l);
      (l.soCu || []).forEach(c => { const kc = bks.khoaPhieu({soPhieu: c && c.so, ngay: (c && c.ngay) || l.ngay}); if (kc) them(byBiDanh, kc, l); });
      const nk = ngayKey(l.ngay), bk = bks.khoa(l.bks); if (nk && bk) them(byNgayBks, nk + '|' + bk, {l, kg: kgLam(l.kg), cnt: 0});
    });
    const daNhan = new Set(), kq = new Map();
    const dau = list => list.slice().sort((a, b) => cmpSo(a.id, b.id))[0];   // chọn tất định, không phụ thuộc thứ tự đầu vào (N6)
    // 2. lượt 1: khớp khóa (hiện hành rồi bí danh)
    sheet.forEach(s => {
      const k = bks.khoaPhieu({soPhieu: s.so, ngay: s.ngay});
      if (!k) { kq.set(s.idx, {idx: s.idx, tt: 'khong-xet'}); return; }
      if (byKhoa.has(k)) { const l = byKhoa.get(k); l.forEach(x => daNhan.add(x.id)); kq.set(s.idx, {idx: s.idx, tt: 'trung', loId: dau(l).id}); return; }
      if (byBiDanh.has(k)) { const l = byBiDanh.get(k); l.forEach(x => daNhan.add(x.id)); kq.set(s.idx, {idx: s.idx, tt: 'trung-so-cu', loId: dau(l).id}); }
    });
    // 3. lượt 2: nghi đổi số (cùng ngày, cùng BKS chuẩn hóa, |Δkg| ≤ nguongKg), chưa dòng Sheet nào nhận lô.
    //    Mỗi dòng chỉ giữ tối đa MAX_UV ứng viên (gần nhất trước); cờ nhieuHon khi bị cắt. Tranh chấp chỉ đếm, không dựng mảng đầy đủ.
    byNgayBks.forEach(ds => ds.forEach(e => { e.nhan = daNhan.has(e.l.id); }));
    const lenh = new Map();   // idx Sheet → {nk, bk, kg}
    const duyet = (q, cb) => { const ds = q.ds; for (let i = 0; i < ds.length; i++) { const e = ds[i]; if (e.nhan) continue; const d = q.kg - e.kg; if (d <= nguong && d >= -nguong) cb(e); } };   // e.kg NaN → so sánh sai → bị loại
    sheet.forEach(s => {
      if (kq.has(s.idx)) return;
      const nk = ngayKey(s.ngay), bk = bks.khoa(s.bks), kg = kgLam(s.kg);
      if (!nk || !bk || !Number.isFinite(kg)) { kq.set(s.idx, {idx: s.idx, tt: 'moi'}); return; }
      const q = {kg, ds: byNgayBks.get(nk + '|' + bk) || []}, top = []; let tong = 0;
      const truoc = (x, y) => Math.abs(x.dKg) - Math.abs(y.dKg) || cmpSo(x.so, y.so) || cmpSo(x.id, y.id);
      duyet(q, e => {
        tong++; e.cnt++;
        const l = e.l, u = {id: l.id, so: l.so, ngay: l.ngay, bks: l.bks, kg: e.kg, dKg: kg - e.kg, lo: l.lo};
        if (top.length === MAX_UV && truoc(u, top[MAX_UV - 1]) >= 0) return;
        let i = top.length; while (i > 0 && truoc(u, top[i - 1]) < 0) i--;
        top.splice(i, 0, u); if (top.length > MAX_UV) top.pop();
      });
      if (!tong) { kq.set(s.idx, {idx: s.idx, tt: 'moi'}); return; }
      const e = {idx: s.idx, tt: 'nghi-doi-so', ungVien: top}; if (tong > MAX_UV) e.nhieuHon = true;
      kq.set(s.idx, e); lenh.set(s.idx, q);
    });
    // 4. tranh chấp: một lô là ứng viên của ≥ 2 dòng Sheet (xét trên TOÀN BỘ ứng viên, kể cả phần bị cắt)
    lenh.forEach((q, idx) => { let tranh = false; duyet(q, e => { if (e.cnt > 1) tranh = true; }); if (tranh) kq.get(idx).canhTranh = true; });
    const ketQua = sheet.map(s => kq.get(s.idx)), tomTat = {canhTranh: 0};
    TT.forEach(t => { tomTat[t] = 0; });
    ketQua.forEach(k => { tomTat[k.tt]++; if (k.canhTranh) tomTat.canhTranh++; });
    return {ketQua, tomTat};
  }
  const api = {phatHienDoiSo};
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.HAKDoiSo = api;
})(typeof self !== 'undefined' ? self : this);
