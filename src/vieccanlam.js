/* VIỆC CẦN LÀM (bản 2.2, mục 5.4 và 11.5): gom việc cần xử lý của mọi lô cho màn Tổng quan. Hàm thuần, chỉ đọc.
 * viecCanLam(db, o) → [{muc: 'chan' | 'canh' | 'nhac', ma, text, oid, fid, ftab}] xếp mục chặn trước, rồi cảnh báo, rồi nhắc việc.
 * o = {homNay: Date, tienDo: {[fid]: {noIn, chuaKy, trangThai}} (từ quy trình in/ký của giao diện), nguong: {hanGiayTo: 30, khongPhieuMoi: 5, chuaChot: 30}}.
 * Quy tắc: lô còn mẫu nợ in hoặc chưa ký (nhắc); phiếu cân chưa gán đội khi lô có nhiều đội (chặn đợt 2); giấy tờ xe còn hạn dưới N ngày hoặc đã hết hạn (cảnh báo);
 * đang khai thác mà quá N ngày không có phiếu mới (nhắc); phiếu cuối đã quá N ngày mà lô chưa chốt (nhắc); lô quá ngày kết thúc dự kiến chưa chốt (nhắc). Lô đã dừng, đã chốt, lưu trữ không tính. */
(function (root) {
  const BKS = () => (typeof require === 'function' ? require('./bks.js') : root.HAKBks);   // một quy tắc chuẩn hóa BKS (src/bks.js)
  const s = v => String(v == null ? '' : v).trim();
  const dmy = v => { const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s(v)); if (!m) return null; const d = new Date(+m[3], +m[2] - 1, +m[1]); return d.getFullYear() === +m[3] && d.getMonth() === +m[2] - 1 && d.getDate() === +m[1] ? d : null; };
  const ngay = (a, b) => Math.round((a - b) / 86400000);
  const plate = v => BKS().khoa(v);
  const NGUONG = {hanGiayTo: 30, khongPhieuMoi: 5, chuaChot: 30};
  const THU_TU = {chan: 0, canh: 1, nhac: 2};
  function viecCanLam(db, o) {
    o = o || {}; const hom = o.homNay || new Date(), ng = Object.assign({}, NGUONG, o.nguong || {}), out = [], dm = (db && db.dmXeVC) || [];
    const day = new Date(hom.getFullYear(), hom.getMonth(), hom.getDate());
    Object.values((db && db.rs) || {}).forEach(ow => Object.values((ow && ow.forests) || {}).forEach(f => {
      if (f.dung || f.chot) return;
      const i = f.info || {}, ma = s(i.maRung) || f.id, add = (muc, text, ftab) => out.push({muc, ma, text, oid: ow.id, fid: f.id, ftab: ftab || 'xuat'}), td = (o.tienDo || {})[f.id] || {};
      if (td.noIn > 0) add('nhac', td.noIn + ' mẫu chưa in hoặc đã in nhưng dữ liệu đã đổi: in lại', 'xuat');
      if (td.chuaKy > 0) add('nhac', td.chuaKy + ' mẫu đã in nhưng chưa đánh dấu đã ký', 'xuat');
      const pcs = f.pc || [], doi = f.doi || [];
      if (doi.length > 1) { const chua = pcs.filter(p => !p.doiId || !doi.some(d => d.id === p.doiId)).length; if (chua) add('chan', chua + ' phiếu cân chưa gán đội (chặn BM-08, BM-14): gán ở bảng phiếu cân', 'dx'); }
      // giấy tờ xe: hạn của dòng danh mục mới nhất, hoặc của xe trong lô
      const het = new Set();
      (f.dx || []).forEach(x => {
        const hs = [['đăng kiểm', x.kdDen], ['bảo hiểm', x.hanBH], ['GPLX', x.hanGplx]];
        const m = dm.filter(r => plate(r.bienSo) === plate(x.bienSo)).sort((a, b) => (dmy(b.ngayCapNhat) || 0) - (dmy(a.ngayCapNhat) || 0))[0];
        if (m) { hs[0][1] = m.hanDangKiem || hs[0][1]; hs[1][1] = m.hanBaoHiem || hs[1][1]; hs[2][1] = m.hanGplx || hs[2][1]; }
        hs.forEach(([ten, v]) => { const d = dmy(v); if (!d) return; const con = ngay(d, day); if (con < 0) het.add('Xe ' + x.bienSo + ': ' + ten + ' đã hết hạn ' + s(v)); else if (con <= ng.hanGiayTo) het.add('Xe ' + x.bienSo + ': ' + ten + ' còn ' + con + ' ngày (hết hạn ' + s(v) + ')'); });
      });
      [...het].slice(0, 6).forEach(t => add('canh', t, 'dx'));
      const cuoi = pcs.map(p => dmy(p.ngay)).filter(Boolean).sort((a, b) => b - a)[0];
      if (cuoi) {
        const qua = ngay(day, cuoi);
        if (td.trangThai === 'dang-khai-thac' && qua > ng.khongPhieuMoi && !s(i.denNgay)) add('nhac', 'Đang khai thác nhưng ' + qua + ' ngày chưa có phiếu cân mới (phiếu cuối ' + cuoi.toLocaleDateString('vi-VN') + ')', 'dx');
        if (qua > ng.chuaChot) add('nhac', 'Phiếu cân cuối đã ' + qua + ' ngày mà lô chưa chốt hồ sơ', 'xuat');
      }
      const den = dmy(i.denNgay); if (den && ngay(day, den) > 0 && !(cuoi && ngay(day, cuoi) > ng.chuaChot)) add('nhac', 'Đã quá ngày kết thúc khai thác dự kiến ' + s(i.denNgay) + ' (' + ngay(day, den) + ' ngày) mà lô chưa chốt', 'finfo');
    }));
    return out.sort((a, b) => THU_TU[a.muc] - THU_TU[b.muc] || a.ma.localeCompare(b.ma, 'vi'));
  }
  const api = {viecCanLam, NGUONG};
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.HAKViecCanLam = api;
})(typeof self !== 'undefined' ? self : this);
