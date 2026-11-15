/* KIỂM TRA CHÉO LÔ (bản 2.2, mục 2.4): bắt chồng lấn GIỮA các lô, việc ràng buộc trong một lô không thấy. Hàm thuần, chỉ đọc.
 * kiemTra(db, oid, fid, opt) → [{kind: 'chan' | 'doi', nhom, text, ref, go: {ftab}}] cho lô (oid, fid):
 *  - phiếu cân CÙNG số phiếu, ngày cân và biển số đã có ở lô khác: CHẶN (BM-08, 09, 10, 14);
 *  - một xe có phiếu cân ở hai lô với khoảng giờ cân giao nhau: cảnh báo;
 *  - một người (CCCD) thuộc nhân công của hai lô có thời gian khai thác giao nhau: cảnh báo (đã xác nhận 15/11/2026: không chặn);
 *  - tổng phiếu cân lệch sản lượng dự kiến (diện tích × định mức) quá ngưỡng %: cảnh báo (mặc định 10%, đặt db.nguongLechSanLuong để đổi). */
(function (root) {
  const NGUONG_MAC_DINH = 10;
  const s = v => String(v == null ? '' : v).trim();
  const digits = v => s(v).replace(/\D/g, '');
  const plate = v => s(v).toUpperCase().replace(/[\s.\-]/g, '');
  const dmy = v => { const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s(v)); if (!m) return null; const d = new Date(+m[3], +m[2] - 1, +m[1]); return d.getFullYear() === +m[3] && d.getMonth() === +m[2] - 1 && d.getDate() === +m[1] ? d : null; };
  const gio = v => { const m = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(s(v)); return m ? (+m[1]) * 3600 + (+m[2]) * 60 + (+(m[3] || 0)) : null; };
  const moc = (ngay, g) => { const d = dmy(ngay), t = gio(g); return d && t != null ? d.getTime() + t * 1000 : null; };
  const lots = db => { const out = []; Object.values((db && db.rs) || {}).forEach(o => Object.values((o && o.forests) || {}).forEach(f => out.push({oid: o.id, fid: f.id, f, ma: s((f.info || {}).maRung) || f.id}))); return out; };
  const khoang = p => { const a = moc(p.ngay, p.gioCan1), b = moc(p.ngay2 || p.ngay, p.gioCan2); if (a == null || b == null) return null; return b >= a ? [a, b] : [a, b + 86400000]; };
  function kiemTra(db, oid, fid, opt) {
    const all = lots(db), me = all.find(l => l.oid === oid && l.fid === fid), items = []; if (!me) return items;
    const others = all.filter(l => l !== me), f = me.f, add = (kind, nhom, text, ref, go) => items.push({kind, nhom, text, ref: ref || '', go: go || {ftab: 'dx'}});
    // 1. phiếu cân trùng hẳn với lô khác
    const key = p => s(p.soPhieu).toUpperCase() + '|' + s(p.ngay) + '|' + plate(p.bienSo);
    const idx = new Map(); others.forEach(l => (l.f.pc || []).forEach(p => { if (s(p.soPhieu)) { const k = key(p); if (!idx.has(k)) idx.set(k, l.ma); } }));
    const dup = (f.pc || []).filter(p => s(p.soPhieu) && idx.has(key(p)));
    if (dup.length) { const lo = [...new Set(dup.map(p => idx.get(key(p))))]; add('chan', 'Chéo lô: phiếu cân trùng', dup.length + ' phiếu cân giống hệt (cùng số phiếu, ngày cân, biển số) đã có ở lô ' + lo.join(', ') + ', ví dụ phiếu ' + dup[0].soPhieu + ' ngày ' + dup[0].ngay + '. Một phiếu cân chỉ thuộc một lô: xóa ở lô sai.', 'Phiếu ' + dup[0].soPhieu); }
    // 2. một xe ở hai lô trùng giờ cân
    const xung = new Map();
    (f.pc || []).forEach(p => { const a = khoang(p); if (!a || !plate(p.bienSo)) return; others.forEach(l => (l.f.pc || []).forEach(q => { if (plate(q.bienSo) !== plate(p.bienSo) || key(q) === key(p)) return; const b = khoang(q); if (b && a[0] < b[1] && b[0] < a[1]) { const k = plate(p.bienSo) + '|' + l.ma; if (!xung.has(k)) xung.set(k, {bien: p.bienSo, lo: l.ma, p, q, n: 0}); xung.get(k).n++; } })); });
    xung.forEach(x => add('doi', 'Chéo lô: xe trùng giờ cân', 'Xe ' + x.bien + ' có ' + x.n + ' phiếu cân trùng khoảng giờ cân với lô ' + x.lo + ' (phiếu ' + x.p.soPhieu + ' ngày ' + x.p.ngay + ' và phiếu ' + x.q.soPhieu + '): một xe không thể ở hai nơi cùng lúc, đối chiếu giờ cân hoặc biển số.', x.bien));
    // 3. người ở hai lô có thời gian khai thác giao nhau
    const kt = l => { const a = dmy((l.f.info || {}).tuNgay), b = dmy((l.f.info || {}).denNgay); return a ? [a.getTime(), b ? b.getTime() : Infinity] : null; }, mk = kt(me);
    if (mk) {
      const mine = new Map(); (f.nc || []).forEach(r => { const c = digits(r.cccd); if (c.length === 12) mine.set(c, r); });
      const seen = new Set();
      others.forEach(l => { const k = kt(l); if (!k || !(mk[0] <= k[1] && k[0] <= mk[1])) return; (l.f.nc || []).forEach(r => { const c = digits(r.cccd); if (mine.has(c) && !seen.has(c + '|' + l.ma)) { seen.add(c + '|' + l.ma); add('doi', 'Chéo lô: người ở hai lô', s(mine.get(c).ten) + ' (CCCD ' + c + ') cũng là nhân công của lô ' + l.ma + ' có thời gian khai thác giao với lô này. Kiểm tra có đúng một người làm ở hai lô cùng lúc không.', s(mine.get(c).ten), {ftab: 'nc'}); } }); });
    }
    // 4. lệch sản lượng dự kiến
    const info = f.info || {}, dk = typeof info.dienTich === 'number' && typeof info.dinhMucTanHa === 'number' ? info.dienTich * info.dinhMucTanHa : 0, tt = (f.pc || []).reduce((n, p) => n + (typeof p.kl === 'number' ? p.kl : 0), 0);
    const ng = (opt && opt.nguong) || (db && db.nguongLechSanLuong) || NGUONG_MAC_DINH;
    if (dk > 0 && tt > 0) { const lech = Math.abs(tt - dk) / dk * 100; if (lech > ng) add('doi', 'Chéo lô: lệch sản lượng dự kiến', 'Tổng phiếu cân ' + String(Math.round(tt * 1000) / 1000).replace('.', ',') + ' tấn lệch ' + String(Math.round(lech * 10) / 10).replace('.', ',') + '% so với sản lượng dự kiến ' + String(Math.round(dk * 1000) / 1000).replace('.', ',') + ' tấn (ngưỡng ' + ng + '%). Đối chiếu diện tích, định mức hoặc phiếu cân.', '', {ftab: 'finfo'}); }
    return items;
  }
  const api = {kiemTra, NGUONG_MAC_DINH};
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.HAKCheoLo = api;
})(typeof self !== 'undefined' ? self : this);
