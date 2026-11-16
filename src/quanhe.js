/* KIỂM QUAN HỆ TRONG MỘT LÔ (bản 3.0) — dùng ở tầng lưu SQLite (src/store.js, mã QUAN_HE) và ở giao diện trước khi gửi. Hàm thuần.
 *  - hợp đồng thuộc đúng rừng: mã hợp đồng nhân công (doi) / vận chuyển (hdvc) không trùng trong lô; mọi tham chiếu chỉ tới hợp đồng CỦA LÔ NÀY;
 *  - thành viên thuộc đúng đội: nc.doiId là một đội của lô ('' = chưa thuộc đội — báo ở Kiểm tra, không chặn lưu);
 *  - xe thuộc đúng hợp đồng: dx.hdvcId là một hợp đồng vận chuyển của lô;
 *  - phiếu dùng đúng xe của hợp đồng: pc.xeRowId (nếu có) là một dòng xe của lô THUỘC pc.hdvcId; pc.hdvcId (nếu có) là hợp đồng của lô; pc.doiId là đội của lô hoặc '';
 *  - ID dòng (nc, dx, pc) không trùng trong bảng.
 * Lô đã chốt / đã dừng: không kiểm (không đổi được). Trả [chuỗi lỗi]; rỗng = hợp lệ. */
(function (root) {
  'use strict';
  const s = v => String(v == null ? '' : v).trim();
  function kiem(f) {
    const loi = []; if (!f || typeof f !== 'object' || f.chot || f.dung) return loi;
    const ma = s(f.info && f.info.maRung) || s(f.id), doi = Array.isArray(f.doi) ? f.doi : [], hd = Array.isArray(f.hdvc) ? f.hdvc : [];
    const trung = (ds, ten) => { const seen = new Set(); ds.forEach(x => { const id = s(x && x.id); if (!id) return; if (seen.has(id)) loi.push(ten + ' trùng mã “' + id + '”'); seen.add(id); }); return seen; };
    const doiIds = trung(doi, 'Hợp đồng nhân công (đội)'), hdIds = trung(hd, 'Hợp đồng vận chuyển');
    const nc = (f.nc || []).filter(Boolean), dx = (f.dx || []).filter(Boolean), pc = (f.pc || []).filter(Boolean);
    trung(nc, 'Dòng thành viên'); const xeIds = trung(dx, 'Dòng xe'); trung(pc, 'Phiếu cân');
    nc.forEach(r => { const d = s(r.doiId); if (d && !doiIds.has(d)) loi.push('Thành viên “' + s(r.ten) + '” thuộc đội “' + d + '” không có trong rừng ' + ma); });
    const xeHd = new Map(dx.map(r => [s(r.id), s(r.hdvcId)]));
    dx.forEach(r => { const h = s(r.hdvcId); if (h && !hdIds.has(h)) loi.push('Xe ' + s(r.bienSo) + ' thuộc hợp đồng vận chuyển “' + h + '” không có trong rừng ' + ma); });
    pc.forEach(p => {
      const lb = 'Phiếu ' + (s(p.soPhieu) || '(chưa số)'), h = s(p.hdvcId), x = s(p.xeRowId), d = s(p.doiId);
      if (h && !hdIds.has(h)) loi.push(lb + ': hợp đồng vận chuyển “' + h + '” không có trong rừng ' + ma);
      if (x && !xeIds.has(x)) loi.push(lb + ': dòng xe “' + x + '” không có trong rừng ' + ma);
      else if (x && !h) loi.push(lb + ': có xe nhưng chưa có hợp đồng vận chuyển');
      else if (x && xeHd.get(x) !== h) loi.push(lb + ': xe ' + s((dx.find(r => s(r.id) === x) || {}).bienSo) + ' không thuộc hợp đồng vận chuyển của phiếu');
      if (d && !doiIds.has(d)) loi.push(lb + ': gán cho đội “' + d + '” không có trong rừng ' + ma);
    });
    return loi;
  }
  const api = {kiem};
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.HAKQuanHe = api;
})(typeof self !== 'undefined' ? self : this);
