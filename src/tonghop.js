/* TRANG TỔNG HỢP THEO ĐỐI TƯỢNG (bản 2.2, mục 5.2): người, xe, đối tác, chủ rừng. Hàm thuần, chỉ đọc dữ liệu (xuyên lô).
 * Mỗi hàm trả {tieuDe, muc: [{ten, cot: [...], dong: [[...]]}], ghiChu: [...]} để giao diện dựng bảng; không có nơi nhập mới. */
(function (root) {
  const s = v => String(v == null ? '' : v).trim();
  const digits = v => s(v).replace(/\D/g, '');
  const plate = v => s(v).toUpperCase().replace(/[\s.\-]/g, '');
  const tan = v => Math.round(v * 1000) / 1000;
  const DM = (typeof require !== 'undefined') ? require('./danhmuc') : root.HAKDanhMuc;
  const lots = db => { const out = []; Object.values((db && db.rs) || {}).forEach(o => Object.values((o && o.forests) || {}).forEach(f => out.push({o, f, oid: o.id, ma: s((f.info || {}).maRung) || f.id}))); return out; };
  const doiTen = (f, id) => { const d = (f.doi || []).find(x => x.id === id); return d ? (s(d.ten) || 'Đội') : ''; };
  const hdTen = (f, id) => { const h = (f.hdvc || []).find(x => x.id === id); return h ? (s(h.ten) || 'Đội xe') : ''; };
  const sumKl = pcs => tan(pcs.reduce((n, p) => n + (typeof p.kl === 'number' ? p.kl : 0), 0));

  function nguoi(db, cccd) {
    const k = digits(cccd), p = DM.timNguoi(db, k); if (!p) return null;
    const ls = (db.dmLaoDong || []).filter(r => digits(r.cccd) === k).sort((a, b) => String(b.ngayCapNhat).localeCompare(String(a.ngayCapNhat)));
    const lo = [];
    lots(db).forEach(l => (l.f.nc || []).forEach(r => { if (digits(r.cccd) !== k) return; const mine = (l.f.pc || []).filter(x => r.doiId && x.doiId === r.doiId); lo.push([l.ma, s(l.o.info && l.o.info.ten), doiTen(l.f, r.doiId), s(r.vaiTro), s(r.chucDanh), s((l.f.info || {}).tuNgay), s((l.f.info || {}).denNgay), mine.length, sumKl(mine)]); }));
    const xe = (db.dmXeVC || []).filter(r => digits(r.cccdTx) === k).map(r => [s(r.bienSo), s(r.ngayCapNhat), s(r.hanGplx), s(r.hanDangKiem)]);
    return {tieuDe: p.ten + ' · CCCD ' + p.cccd, loai: 'nguoi', muc: [
      {ten: 'Thông tin hiện hành', cot: ['Họ và tên', 'Ngày sinh', 'Thường trú', 'Ngày cấp', 'Nơi cấp', 'SĐT', 'Vai trò'], dong: [[p.ten, p.ngaySinh, p.diaChi, p.ngayCap, p.noiCap, p.sdt, p.vaiTro.join(', ')]]},
      {ten: 'Lịch sử dòng danh mục lao động (mới nhất trước)', cot: ['Ngày cập nhật', 'Thường trú', 'SĐT', 'Chức vụ', 'Vị trí'], dong: ls.map(r => [s(r.ngayCapNhat), s(r.diaChi), s(r.sdt), s(r.chucVu), s(r.viTri)])},
      {ten: 'Các lô đã tham gia', cot: ['Lô', 'Chủ rừng', 'Đội', 'Vai trò', 'Vị trí', 'Từ ngày', 'Đến ngày', 'Phiếu cân của đội', 'Khối lượng đội (tấn)'], dong: lo},
      {ten: 'Xe đứng tên tài xế', cot: ['Biển số', 'Cập nhật', 'Hạn GPLX', 'Hạn đăng kiểm'], dong: xe}], ghiChu: []};
  }
  function xe(db, bien) {
    const k = plate(bien), m = DM.layXe(db.dmXeVC || [], bien), r = m && m.row; if (!r && !lots(db).some(l => (l.f.dx || []).some(x => plate(x.bienSo) === k))) return null;
    const ls = (db.dmXeVC || []).filter(x => plate(x.bienSo) === k).sort((a, b) => String(b.ngayCapNhat).localeCompare(String(a.ngayCapNhat)));
    const lo = []; lots(db).forEach(l => (l.f.dx || []).forEach(x => { if (plate(x.bienSo) !== k) return; const pcs = (l.f.pc || []).filter(p => plate(p.bienSo) === k); lo.push([l.ma, s(l.o.info && l.o.info.ten), hdTen(l.f, x.hdvcId), pcs.length, sumKl(pcs)]); }));
    const het = (db.dmXeVC && r) ? [['Giấy phép lái xe', r.hanGplx], ['Đăng kiểm', r.hanDangKiem], ['Bảo hiểm', r.hanBaoHiem]].filter(x => s(x[1])) : [];
    return {tieuDe: 'Xe ' + (r ? r.bienSo : bien), loai: 'xe', muc: [
      {ten: 'Thông tin hiện hành', cot: ['Biển số', 'Chủ xe', 'Tài xế', 'CCCD tài xế', 'Số GPLX'], dong: r ? [[s(r.bienSo), s(r.chuXe), s(r.taiXe), s(r.cccdTx), s(r.gplx)]] : []},
      {ten: 'Giấy tờ và hạn', cot: ['Giấy tờ', 'Hạn'], dong: het},
      {ten: 'Lịch sử dòng danh mục xe (mới nhất trước)', cot: ['Ngày cập nhật', 'Tài xế', 'Hạn GPLX', 'Hạn đăng kiểm', 'Hạn bảo hiểm'], dong: ls.map(x => [s(x.ngayCapNhat), s(x.taiXe), s(x.hanGplx), s(x.hanDangKiem), s(x.hanBaoHiem)])},
      {ten: 'Các lô và đội xe đã chạy', cot: ['Lô', 'Chủ rừng', 'Đội xe', 'Số chuyến', 'Khối lượng (tấn)'], dong: lo}], ghiChu: []};
  }
  function doiTac(db, id) {
    const d = (db.dmDoiTac || []).find(x => x.id === id); if (!d) return null; const hd = [];
    lots(db).forEach(l => (l.f.hdvc || []).forEach(h => { if (DM.doiTacKey(h) !== id) return; const xs = (l.f.dx || []).filter(x => x.hdvcId === h.id), ks = new Set(xs.map(x => plate(x.bienSo))), pcs = (l.f.pc || []).filter(p => ks.has(plate(p.bienSo))); hd.push([l.ma, s(l.o.info && l.o.info.ten), s(h.ten) || 'Đội xe', xs.length, pcs.length, sumKl(pcs)]); }));
    return {tieuDe: s(d.ten) + (d.mst ? ' · MST ' + d.mst : d.cccd ? ' · CCCD ' + d.cccd : ''), loai: 'doitac', muc: [
      {ten: 'Thông tin', cot: ['Tên', 'Loại', 'CCCD / MST', 'Địa chỉ', 'SĐT'], dong: [[s(d.ten), d.loai === 'doanhnghiep' ? 'Doanh nghiệp' : 'Cá nhân', s(d.mst || d.cccd), s(d.diaChi), s(d.sdt)]]},
      {ten: 'Hợp đồng vận chuyển theo lô', cot: ['Lô', 'Chủ rừng', 'Đội xe', 'Số xe', 'Số chuyến', 'Khối lượng (tấn)'], dong: hd}], ghiChu: []};
  }
  function chuRung(db, oid) {
    const o = ((db && db.rs) || {})[oid]; if (!o) return null; const i = o.info || {};
    const dong = Object.values(o.forests || {}).map(f => { const fi = f.info || {}, dk = typeof fi.dienTich === 'number' && typeof fi.dinhMucTanHa === 'number' ? tan(fi.dienTich * fi.dinhMucTanHa) : ''; const tt = sumKl(f.pc || []); return [s(fi.maRung), s(fi.diaDiem), typeof fi.dienTich === 'number' ? fi.dienTich : '', dk, tt, (f.pc || []).length, f.dung ? 'Đã dừng' : f.chot ? (f.luuTru ? 'Lưu trữ' : 'Đã chốt') : '']; });
    return {tieuDe: s(i.ten) + (i.cccd ? ' · CCCD ' + i.cccd : ''), loai: 'chu', muc: [{ten: 'Các lô của chủ rừng', cot: ['Lô', 'Địa điểm', 'Diện tích (ha)', 'Dự kiến (tấn)', 'Thực tế (tấn)', 'Số phiếu', 'Chốt'], dong}], ghiChu: []};
  }
  const api = {nguoi, xe, doiTac, chuRung};
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.HAKTongHop = api;
})(typeof self !== 'undefined' ? self : this);
