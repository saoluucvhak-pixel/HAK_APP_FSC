/* PHÂN BỔ PHIẾU CÂN vào các rừng của MỘT hợp đồng (hàm thuần). KHÔNG phải src/phanbo.js (đó là phân bổ khối lượng nhân công theo đội).
 * Thiết kế: docs/THIET_KE_DU_LIEU_DOI_SO_PHAN_BO.md mục 3.2 + Phụ lục QĐ của docs/DAC_TA_GOOGLE_SHEETS_THEO_HOP_DONG.md:
 *   QĐ1 dự kiến (kg) = hecta của TỪNG rừng × định mức tấn/ha × 1000; QĐ2 "vượt dự kiến" tính so với dự kiến thuần (không cộng dung sai);
 *   QĐ3 hợp đồng 1 rừng thiếu hecta/định mức vẫn nhận mọi phiếu.
 * Chữ ký: phanBoPhieu(phieu[], rungs[], dungSai, daDung[], opts) → {ok, loi?, gan[], chuaPhanBo[], rung[], canhBao[]}
 * Toàn bộ phép tính bằng số nguyên kg (giới hạn = dự kiến + floor(dự kiến × dsMil / 1000)); không sửa đầu vào; tất định.
 * Độ phức tạp: thời gian O(P log P + R + D), bộ nhớ O(P + R). */
(function (root) {
  'use strict';
  const D = () => (typeof HAKDates !== 'undefined' ? HAKDates : (typeof require === 'function' ? require('./dates.js') : root.HAKDates));
  const okNum = v => typeof v === 'number' && Number.isFinite(v) && v > 0;
  /* kg hợp lệ: number hữu hạn, 0 < kg ≤ 1e9 (chặn Infinity), làm tròn Math.round, kết quả ≥ 1; ngược lại null */
  const chuanKg = v => { if (typeof v !== 'number' || !Number.isFinite(v) || v > 1e9) return null; const r = Math.round(v); return r >= 1 ? r : null; };
  /* lý do kg không dùng được cho PHIẾU: thiếu/≤ 0 → 'thieu-kl' (giữ hành vi cũ); còn lại → 'kg-khong-hop-le' */
  const lyDoKg = v => (v == null || (typeof v === 'number' && v <= 0) ? 'thieu-kl' : 'kg-khong-hop-le');
  const coKey = k => k != null && k !== '';
  const cmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
  /* so sánh số phiếu theo "số tự nhiên": PA2 < PA10 */
  function cmpSo(a, b) {
    const x = String(a == null ? '' : a).match(/\d+|\D+/g) || [], y = String(b == null ? '' : b).match(/\d+|\D+/g) || [];
    for (let i = 0; i < Math.min(x.length, y.length); i++) {
      const dx = /^\d/.test(x[i]), dy = /^\d/.test(y[i]);
      let c;
      if (dx && dy) { c = cmp(x[i].replace(/^0+(?=\d)/, '').length, y[i].replace(/^0+(?=\d)/, '').length) || cmp(x[i].replace(/^0+(?=\d)/, ''), y[i].replace(/^0+(?=\d)/, '')); } else c = cmp(x[i], y[i]);
      if (c) return c;
    }
    return cmp(x.length, y.length);
  }

  function phanBoPhieu(phieu, rungs, dungSai, daDung, opts) {
    const o = opts || {}, giuTay = o.giuTay !== false, nhanDu = o.nhanDu !== false;
    phieu = phieu || []; rungs = rungs || []; daDung = daDung || [];
    const canhBao = [], laObj = x => x != null && typeof x === 'object';
    /* phần tử null/undefined/không phải đối tượng: bỏ qua + cảnh báo (không sửa mảng đầu vào) */
    const loc = (arr, nguon) => arr.filter((x, idx) => { if (laObj(x)) return true; canhBao.push({ma: 'phan-tu-rong', nguon, idx}); return false; });
    const phieuIdx = phieu.map((p, i) => ({p, i})).filter(e => { if (laObj(e.p)) return true; canhBao.push({ma: 'phan-tu-rong', nguon: 'phieu', idx: e.i}); return false; });
    rungs = loc(rungs, 'rungs'); daDung = daDung.filter(x => x != null);
    if (typeof dungSai !== 'number' || !Number.isFinite(dungSai) || dungSai < 0 || dungSai > 0.30) return {ok: false, loi: 'dung-sai'};
    const ids = new Set();
    for (const r of rungs) { if (ids.has(r.id)) return {ok: false, loi: 'rung-trung-id'}; ids.add(r.id); }
    const dsMil = Math.round(dungSai * 1000), dk = D();

    /* 2. dự kiến / giới hạn / đã dùng theo rừng */
    const info = new Map(), du = new Map(), gh = new Map();
    for (const r of rungs) {
      const d = okNum(r.ha) && okNum(r.dinhMuc) ? Math.round(r.ha * r.dinhMuc * 1000) : null;
      du.set(r.id, d); gh.set(r.id, d == null ? null : d + Math.floor(d * dsMil / 1000));
      info.set(r.id, {id: r.id, duKienKg: d, gioiHanKg: gh.get(r.id), daDungKg: 0, themKg: 0, tongKg: 0, soPhieuThem: 0, canhBao: []});
    }
    for (const x of daDung) {
      const ri = x && info.get(x.rungId);
      const kgD = ri ? chuanKg(x.kg) : null;
      if (ri && kgD != null) ri.daDungKg += kgD; else canhBao.push({ma: 'da-dung-khong-ro-rung', rungId: x && x.rungId, kg: x && x.kg});
    }

    /* 3. phân loại đầu vào (mỗi phiếu đúng một nhóm) */
    const lst = phieuIdx.map(({p, i}) => ({p, i, nk: dk.key(p.ngay) || 0, kg: chuanKg(p.kg)})).sort((a, b) => a.nk - b.nk || cmpSo(a.p.so, b.p.so) || cmp(a.p.key, b.p.key) || (a.p.row - b.p.row) || (a.i - b.i));
    const giu = new Map();                                 // key → phiếu giữ (row nhỏ nhất)
    for (const e of lst) { if (!coKey(e.p.key)) continue; const g = giu.get(e.p.key); if (!g || (e.p.row < g.p.row)) giu.set(e.p.key, e); }
    const gan = [], chua = [], tapTuDong = [], tayList = [];
    for (const e of lst) {
      const p = e.p, ky = coKey(p.key), ly = (l) => chua.push(ky ? {key: p.key, lyDo: l, row: p.row} : {key: p.key, lyDo: l, row: p.row, idx: e.i});
      if (ky && giu.get(p.key) !== e) ly('trung-nguon');
      else if (!e.nk) ly('thieu-ngay');
      else if (!ky) ly('thieu-so');
      else if (e.kg == null) ly(lyDoKg(p.kg));
      else if (p.boQua) ly(p.boQua);
      else if (giuTay && p.rungTay === '') ly('nguoi-dung-bo');
      else if (giuTay && p.rungTay != null && info.has(p.rungTay)) { tayList.push(e); }
      else if (giuTay && p.rungTay != null) ly('rung-khong-ton-tai');
      else tapTuDong.push(e);
    }
    const pos = new Map(); lst.forEach((e, k) => pos.set(e, k));
    const cum = new Map(); info.forEach((ri, id) => cum.set(id, ri.daDungKg));
    for (const e of tayList) { const ri = info.get(e.p.rungTay); ri.themKg += e.kg; ri.soPhieuThem++; cum.set(ri.id, cum.get(ri.id) + e.kg); gan.push({e, g: {key: e.p.key, rungId: ri.id, cach: 'tay', kg: e.kg}}); }

    /* 4-7. phân bổ tự động */
    const passed = new Set();
    let E = [];
    if (!rungs.length) tapTuDong.forEach(e => chua.push({key: e.p.key, lyDo: 'khong-co-rung', row: e.p.row}));
    else {
      E = rungs.length === 1 ? rungs.slice() : rungs.filter(r => gh.get(r.id) != null);
      if (!E.length) tapTuDong.forEach(e => chua.push({key: e.p.key, lyDo: 'thieu-du-kien', row: e.p.row}));
      else {
        let idx = 0, het = false;
        for (const e of tapTuDong) {
          if (het) { chua.push({key: e.p.key, lyDo: 'het-du-kien', row: e.p.row}); continue; }
          const kg = e.kg; let r = null;
          for (;;) {
            const c = E[idx], laCuoi = idx === E.length - 1, g = gh.get(c.id);
            if ((laCuoi && nhanDu) || g == null || cum.get(c.id) + kg <= g) { r = c; break; }
            if (!laCuoi) { passed.add(c.id); idx++; } else break;
          }
          if (!r) { het = true; chua.push({key: e.p.key, lyDo: 'het-du-kien', row: e.p.row}); continue; }
          if (nhanDu && E.every(c => gh.get(c.id) != null && kg > gh.get(c.id))) canhBao.push({ma: 'phieu-lon-hon-gioi-han', key: e.p.key, kg});
          const ri = info.get(r.id); ri.themKg += kg; ri.soPhieuThem++; cum.set(r.id, cum.get(r.id) + kg);
          gan.push({e, g: {key: e.p.key, rungId: r.id, cach: rungs.length === 1 ? 'mot-rung' : 'tu-dong', kg}});
        }
      }
    }

    /* 8. tổng kết */
    for (const r of rungs) {
      const ri = info.get(r.id), d = du.get(r.id), g = gh.get(r.id);
      ri.tongKg = ri.daDungKg + ri.themKg;
      const add = c => { ri.canhBao.push(c); canhBao.push(c); };
      if (g != null && ri.tongKg > g) add({ma: 'vuot-du-kien', rungId: r.id, vuotKg: ri.tongKg - d});
      else if (g != null && ri.tongKg > d) add({ma: 'trong-dung-sai', rungId: r.id});
      if (d == null) add({ma: 'thieu-du-kien', rungId: r.id});
      if (d != null && ri.themKg === 0 && ri.daDungKg === 0 && passed.has(r.id)) add({ma: 'rung-bo-trong', rungId: r.id});
    }
    if (chua.length) canhBao.push({ma: 'chua-phan-bo', n: chua.length});
    gan.sort((a, b) => pos.get(a.e) - pos.get(b.e));
    return {ok: true, gan: gan.map(x => x.g), chuaPhanBo: chua, rung: rungs.map(r => info.get(r.id)), canhBao};
  }
  const api = {phanBoPhieu};
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.HAKPhanBoPhieu = api;
})(typeof self !== 'undefined' ? self : this);
