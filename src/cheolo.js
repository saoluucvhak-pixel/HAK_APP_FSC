/* KIỂM TRA CHÉO LÔ (bản 2.2, mục 2.4): bắt chồng lấn GIỮA các lô, việc ràng buộc trong một lô không thấy. Hàm thuần, chỉ đọc.
 * kiemTra(db, oid, fid, opt) → [{kind: 'chan' | 'doi', nhom, text, ref, go: {ftab}}] cho lô (oid, fid):
 *  - phiếu cân CÙNG số phiếu, ngày cân và biển số đã có ở lô khác: CHẶN (BM-08, 09, 10, 14);
 *  - một xe có phiếu cân ở hai lô với khoảng giờ cân giao nhau: cảnh báo;
 *  - một người (CCCD) thuộc nhân công của hai lô có thời gian khai thác giao nhau: cảnh báo (đã xác nhận 15/11/2026: không chặn);
 *  - tổng phiếu cân lệch sản lượng dự kiến (diện tích × định mức) quá ngưỡng %: cảnh báo (mặc định 10%, đặt db.nguongLechSanLuong để đổi). */
(function (root) {
  const BKS = () => (typeof require === 'function' ? require('./bks.js') : root.HAKBks);   // một quy tắc chuẩn hóa BKS (src/bks.js)
  const NL = () => (typeof require === 'function' ? require('./nhaplieu.js') : root.HAKNhapLieu);   // quy tắc CCCD duy nhất (src/nhaplieu.js, phiếu #14): 9 hoặc 12 chữ số
  const NGUONG_MAC_DINH = 10;
  const s = v => String(v == null ? '' : v).trim();
  const digits = v => s(v).replace(/\D/g, '');
  const plate = v => BKS().khoa(v);
  /* ngày lịch dùng CHUNG (src/dates.js): “1/11/2026” và “01/11/2026” là cùng một ngày; ngày thiếu hoặc không có thật cho null/0 và KHÔNG làm căn cứ kết luận hai phiếu là cùng chuyến */
  const Dt = () => (typeof require !== 'undefined' ? require('./dates') : root.HAKDates);
  const DM = () => (typeof require !== 'undefined' ? require('./dinhmuc') : root.HAKDinhMuc);   // sản lượng dự kiến, tổng phiếu: cùng định nghĩa với giao diện
  const dmy = v => { const p = Dt().parse(s(v)); return p ? new Date(p.y, p.m - 1, p.d) : null; };
  const gio = v => { const m = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(s(v)); return m ? (+m[1]) * 3600 + (+m[2]) * 60 + (+(m[3] || 0)) : null; };
  const moc = (ngay, g) => { const d = dmy(ngay), t = gio(g); return d && t != null ? d.getTime() + t * 1000 : null; };
  const lots = db => { const out = []; Object.values((db && db.rs) || {}).forEach(o => Object.values((o && o.forests) || {}).forEach(f => out.push({oid: o.id, fid: f.id, f, ma: s((f.info || {}).maRung) || f.id}))); return out; };
  const khoang = p => { const a = moc(p.ngay, p.gioCan1), b = moc(p.ngay2 || p.ngay, p.gioCan2); if (a == null || b == null) return null; return b >= a ? [a, b] : [a, b + 86400000]; };
  /* khóa đối chiếu: số phiếu (bỏ khoảng trắng, hoa), ngày lịch hợp lệ (yyyymmdd), biển số chuẩn hóa. Thiếu số phiếu, ngày không có thật hoặc thiếu biển số: null (không đối chiếu; lỗi ngày báo ở bước kiểm tra phiếu cân). Dữ liệu gốc không bị đổi. */
  const khoaPhieu = p => { const so = s(p.soPhieu).toUpperCase().replace(/\s+/g, ''), d = Dt().key(s(p.ngay)), b = plate(p.bienSo); return so && d && b ? so + '|' + d + '|' + b : null; };
  /* phiếu cân của lô (oid, fid) GIỐNG HỆT một phiếu đã lưu ở lô khác: [{p, ma}] (p là phiếu trong `pcList`, mặc định phiếu đã lưu của lô; ma là mã lô kia). Dùng chung cho Kiểm tra và cổng xuất (BM-08, 09, 10, 14). */
  /* CHỈ MỤC chéo lô (dựng MỘT lần cho cả db, dùng lại cho mọi lô: tránh dựng lại mỗi lần gọi khi duyệt nhiều lô): theo khóa phiếu và theo biển số (kèm khoảng giờ cân). Hàm thuần; người gọi tự bỏ chỉ mục khi dữ liệu đổi. */
  /* HIỆU NĂNG: khóa phiếu, biển số chuẩn hóa và khoảng giờ cân của TỪNG phiếu được nhớ theo chính đối tượng phiếu, kèm các trường nguồn đã dùng để tính.
   * Mỗi lần dùng lại đều so các trường nguồn (phiếu sửa tại chỗ thì tính lại), nên kết quả luôn bằng tính trực tiếp. Sửa một ô ở lô đang mở không phải
   * phân tích lại ngày giờ của mọi phiếu ở các lô khác (100.000 phiếu: ~600 ms mỗi lần dựng chỉ mục → vài chục ms). Mảng `b` dùng chung: chỉ đọc. */
  const nhoPhieu = new WeakMap();
  function suyRa(q) {
    if (!q || typeof q !== 'object') return {k: khoaPhieu(q), pl: plate(q.bienSo), b: khoang(q)};
    const c = nhoPhieu.get(q);
    if (c && c.so === q.soPhieu && c.ngay === q.ngay && c.bien === q.bienSo && c.ngay2 === q.ngay2 && c.g1 === q.gioCan1 && c.g2 === q.gioCan2) return c;
    const n = {so: q.soPhieu, ngay: q.ngay, bien: q.bienSo, ngay2: q.ngay2, g1: q.gioCan1, g2: q.gioCan2, k: khoaPhieu(q), pl: plate(q.bienSo), b: khoang(q)};
    nhoPhieu.set(q, n); return n;
  }
  function taoChiMuc(db) {
    const all = lots(db), byKey = new Map(), byPlate = new Map(), add = (m, k, v) => { const a = m.get(k); if (a) a.push(v); else m.set(k, [v]); };
    all.forEach(l => (l.f.pc || []).forEach(q => { const x = suyRa(q), k = x.k, pl = x.pl; if (k) add(byKey, k, l); if (pl) add(byPlate, pl, {l, q, k, b: x.b}); }));
    return {db, all, byKey, byPlate};
  }
  const chiMucCua = (db, ctx) => ctx && ctx.db === db ? ctx : taoChiMuc(db);
  function phieuTrung(db, oid, fid, pcList, ctx) {
    const cm = chiMucCua(db, ctx), me = cm.all.find(l => l.oid === oid && l.fid === fid); if (!me) return [];
    return (pcList || me.f.pc || []).map(p => { const k = suyRa(p).k, hit = k && (cm.byKey.get(k) || []).find(l => l !== me); return hit ? {p, ma: hit.ma} : null; }).filter(Boolean);
  }
  function kiemTra(db, oid, fid, opt) {
    const cm = chiMucCua(db, opt && opt.chiMuc), all = cm.all, me = all.find(l => l.oid === oid && l.fid === fid), items = []; if (!me) return items;
    const others = all.filter(l => l !== me), f = me.f, add = (kind, nhom, text, ref, go) => items.push({kind, nhom, text, ref: ref || '', go: go || {ftab: 'dx'}});
    // 1. phiếu cân trùng hẳn với lô khác (cổng xuất chặn qua checkPC dùng cùng hàm phieuTrung)
    const dup = phieuTrung(db, oid, fid, f.pc, cm);
    if (dup.length) add('chan', 'Chéo lô: phiếu cân trùng', dup.length + ' phiếu cân giống hệt (cùng số phiếu, cùng ngày cân, cùng biển số; ngày viết khác nhau như 1/11 và 01/11 vẫn là một ngày) đã có ở lô khác: ' + dup.slice(0, 5).map(x => 'phiếu ' + x.p.soPhieu + ' (' + x.p.ngay + ', ' + s(x.p.bienSo) + ') ↔ lô ' + x.ma).join('; ') + (dup.length > 5 ? '; …' : '') + '. Một phiếu cân chỉ thuộc một lô: kiểm tra rồi xóa hoặc chuyển ở lô sai (phần mềm không tự xóa).', 'Phiếu ' + dup[0].p.soPhieu);
    // 2. một xe ở hai lô trùng giờ cân
    const xung = new Map();
    (f.pc || []).forEach(p => { const x = suyRa(p), a = x.b, pl = x.pl; if (!a || !pl) return; (cm.byPlate.get(pl) || []).forEach(e => { const l = e.l, q = e.q; if (l === me || (e.k && e.k === x.k)) return; const b = e.b; if (b && a[0] < b[1] && b[0] < a[1]) { const k = pl + '|' + l.ma; if (!xung.has(k)) xung.set(k, {bien: p.bienSo, lo: l.ma, p, q, n: 0}); xung.get(k).n++; } }); });
    xung.forEach(x => add('doi', 'Chéo lô: xe trùng giờ cân', 'Xe ' + x.bien + ' có ' + x.n + ' phiếu cân trùng khoảng giờ cân với lô ' + x.lo + ' (phiếu ' + x.p.soPhieu + ' ngày ' + x.p.ngay + ' và phiếu ' + x.q.soPhieu + '): một xe không thể ở hai nơi cùng lúc, đối chiếu giờ cân hoặc biển số.', x.bien));
    // 3. người ở hai lô có thời gian khai thác giao nhau
    const kt = l => { const a = dmy((l.f.info || {}).tuNgay), b = dmy((l.f.info || {}).denNgay); return a ? [a.getTime(), b ? b.getTime() : Infinity] : null; }, mk = kt(me);
    if (mk) {
      const mine = new Map(); (f.nc || []).forEach(r => { const c = digits(r.cccd); if (NL().cccdHopLe(c)) mine.set(c, r); });
      const seen = new Set();
      others.forEach(l => { const k = kt(l); if (!k || !(mk[0] <= k[1] && k[0] <= mk[1])) return; (l.f.nc || []).forEach(r => { const c = digits(r.cccd); if (mine.has(c) && !seen.has(c + '|' + l.ma)) { seen.add(c + '|' + l.ma); add('doi', 'Chéo lô: người ở hai lô', s(mine.get(c).ten) + ' (CCCD ' + c + ') cũng là nhân công của lô ' + l.ma + ' có thời gian khai thác giao với lô này. Kiểm tra có đúng một người làm ở hai lô cùng lúc không.', s(mine.get(c).ten), {ftab: 'nc'}); } }); });
    }
    // 4. lệch sản lượng dự kiến
    const info = f.info || {}, dk = DM().sanLuongDuKien(db, info) || 0, tt = DM().tongPhieuTan(f.pc);   // lô dùng định mức gỗ keo mặc định cũng được kiểm; tổng làm tròn từng phiếu theo kg
    const ng = (opt && opt.nguong) || (db && db.nguongLechSanLuong) || NGUONG_MAC_DINH;
    if (dk > 0 && tt > 0) { const lech = Math.abs(tt - dk) / dk * 100; if (lech > ng) add('doi', 'Chéo lô: lệch sản lượng dự kiến', 'Tổng phiếu cân ' + String(Math.round(tt * 1000) / 1000).replace('.', ',') + ' tấn lệch ' + String(Math.round(lech * 10) / 10).replace('.', ',') + '% so với sản lượng dự kiến ' + String(Math.round(dk * 1000) / 1000).replace('.', ',') + ' tấn (ngưỡng ' + ng + '%). Đối chiếu diện tích, định mức hoặc phiếu cân.', '', {ftab: 'finfo'}); }
    return items;
  }
  const api = {kiemTra, phieuTrung, taoChiMuc, khoaPhieu, NGUONG_MAC_DINH};
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.HAKCheoLo = api;
})(typeof self !== 'undefined' ? self : this);
