/* DANH MỤC VỊ TRÍ CÓ ID ỔN ĐỊNH (bản 3.0). Hàm thuần.
 * db.dmViTri = [{id: 'vt<N>', ten, ngung}]. Các bảng nghiệp vụ hiện có vẫn dùng TÊN vị trí làm khóa (định biên nhân công db.dinhBien / dinhBienVer,
 * định mức BHLĐ db.dinhMuc / dinhMucBan, đơn giá theo vị trí của đội donGiaTan / donGiaHa / donGiaNgay, chức danh dòng nhân công nc.chucDanh) để
 * biểu mẫu in như trước. ID là liên kết ổn định: đổi tên vị trí (doiTen) đổi MỘT LẦN mọi bảng đang dùng tên cũ, nên định mức, đơn giá vẫn đúng vị trí.
 * Lô đã chốt / đã dừng KHÔNG bị đổi (giữ tên và giá trị đã áp dụng để in lại đúng); dòng nhân công nối bằng nc.viTriId.
 *  - dung(db, tenDangDung): dựng / bổ sung danh mục từ mọi tên đang có (giữ id cũ, thêm id mới); không sửa db, trả danh mục mới.
 *  - tim(dm, ten) / timId(dm, id); doiTen(db, id, tenMoi): {ok, error, so: {...}} sửa trực tiếp db; them(dm, ten, nhiemVu?, ghiChu?); sua(dm, id, {nhiemVu, ghiChu});
 *    dangDung(db, id); xoa(db, id): đang dùng → “Ngừng sử dụng”, chưa dùng → xóa hẳn, vị trí mặc định không xóa. */
(function (root) {
  'use strict';
  const s = v => String(v == null ? '' : v).replace(/\s+/g, ' ').trim();
  const fold = v => s(v).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();
  const DG = ['donGiaTan', 'donGiaHa', 'donGiaNgay'];
  const tim = (dm, ten) => { const k = fold(ten); return k ? (dm || []).find(x => fold(x.ten) === k) || null : null; };
  const timId = (dm, id) => (dm || []).find(x => x.id === id) || null;
  const idMoi = dm => { const used = new Set((dm || []).map(x => x.id)); let k = used.size + 1; while (used.has('vt' + k)) k++; return 'vt' + k; };
  const MAC_DINH = ['Tổ trưởng', 'Công nhân khai thác', 'Công nhân cưa'];   // trùng BASE của src/dinhmuc.js (có test): ba vị trí mặc định, không xóa được
  const GIEO = ['Công nhân cưa', 'Công nhân lột vỏ và bốc xếp', 'Quản lý chung', 'Khác'];   // chỉ gieo khi danh mục hoàn toàn trống
  /* nhiemVu / ghiChu là tùy chọn: chỉ ghi khóa khi khác rỗng, bản ghi không dùng chúng cho JSON y hệt bản cũ */
  const datTuyChon = (x, o) => { ['nhiemVu', 'ghiChu'].forEach(k => { if (!o || !(k in o)) return; const v = s(o[k]); if (v) x[k] = v; else delete x[k]; }); };
  function them(dm, ten, nhiemVu, ghiChu) { const t = s(ten); if (!t) return null; const c = tim(dm, t); if (c) return c; const x = {id: idMoi(dm), ten: t, ngung: false}; datTuyChon(x, {nhiemVu, ghiChu}); dm.push(x); return x; }
  function sua(dm, id, o) { const x = timId(dm, id); if (!x) return {ok: false, error: 'Không có vị trí này'}; datTuyChon(x, o); return {ok: true}; }
  /* mọi tên vị trí đang có trong db (theo thứ tự xuất hiện, không trùng): định biên (gốc + phiên bản), định mức BHLĐ (gốc + bản), đơn giá của đội, chức danh nhân công, danh mục lao động cũ */
  function tenDangCo(db) {
    const out = [], add = t => { t = s(t); if (t && !out.some(x => fold(x) === fold(t))) out.push(t); };
    (db.dinhBien || []).forEach(r => add(r && r.chucDanh));
    (db.dinhBienVer || []).forEach(v => ((v && v.rows) || []).forEach(r => add(r && r.chucDanh)));
    Object.keys(db.dinhMuc || {}).forEach(add);
    (db.dinhMucBan || []).forEach(v => Object.keys((v && v.dm) || {}).forEach(add));
    Object.values(db.rs || {}).forEach(o => Object.values((o && o.forests) || {}).forEach(f => {
      (f.nc || []).forEach(r => add(r && r.chucDanh));
      [f.info || {}, ...(f.doi || []).map(d => (d && d.hinhThuc) || {})].forEach(i => DG.forEach(m => Object.keys(i[m] || {}).forEach(add)));
    }));
    (db.dmLaoDong || []).forEach(r => add(r && r.viTri));
    return out;
  }
  function dung(db, tenThem) {
    const dm = JSON.parse(JSON.stringify(Array.isArray(db && db.dmViTri) ? db.dmViTri : []));
    (tenThem || []).concat(tenDangCo(db || {})).forEach(t => them(dm, t));
    return dm;
  }
  /* đổi khóa của một đối tượng {tên cũ: giá trị} sang tên mới, giữ thứ tự khóa; trả số khóa đã đổi */
  function doiKhoa(o, cu, moi) {
    if (!o || typeof o !== 'object') return 0; const keys = Object.keys(o), k = keys.find(x => fold(x) === fold(cu)); if (!k || k === moi) return 0;
    if (keys.some(x => x !== k && fold(x) === fold(moi))) return 0;   // tên mới đã có giá trị riêng: không ghi đè
    const v = o[k], ds = keys.map(x => [x === k ? moi : x, x === k ? v : o[x]]); keys.forEach(x => delete o[x]); ds.forEach(([x, y]) => { o[x] = y; }); return 1;
  }
  const khoa = f => !!(f && (f.chot || f.dung));
  function doiTen(db, id, tenMoi) {
    const dm = db.dmViTri || [], vt = timId(dm, id), moi = s(tenMoi);
    if (!vt) return {ok: false, error: 'Không có vị trí này'};
    if (!moi) return {ok: false, error: 'Tên vị trí không được để trống'};
    const trung = tim(dm, moi); if (trung && trung.id !== id) return {ok: false, error: 'Đã có vị trí “' + trung.ten + '”'};
    const cu = vt.ten, so = {dinhBien: 0, dinhMuc: 0, donGia: 0, nhanCong: 0, loKhoa: 0, giuTenCu: false};
    if (cu === moi) return {ok: true, so};
    /* lô đã chốt / dừng dùng tên cũ: in lại theo tên cũ nên định biên, định mức BHLĐ dùng chung GIỮ mục tên cũ và thêm bản sao tên mới (không đổi khóa) */
    const giu = Object.values(db.rs || {}).some(o => Object.values((o && o.forests) || {}).some(f => khoa(f) && (f.nc || []).some(r => r && (r.viTriId === id || fold(r.chucDanh) === fold(cu)))));
    so.giuTenCu = giu;
    const bangDB = rows => { if (!Array.isArray(rows)) return; const cuR = rows.filter(r => r && fold(r.chucDanh) === fold(cu)); if (!cuR.length) return;
      if (!giu) { cuR.forEach(r => { r.chucDanh = moi; so.dinhBien++; }); return; }
      if (!rows.some(r => r && fold(r.chucDanh) === fold(moi))) cuR.forEach(r => { rows.splice(rows.indexOf(r) + 1, 0, Object.assign(JSON.parse(JSON.stringify(r)), {chucDanh: moi})); so.dinhBien++; }); };
    const khoaDM = o => { if (!o || typeof o !== 'object') return 0; if (!giu) return doiKhoa(o, cu, moi); const k = Object.keys(o).find(x => fold(x) === fold(cu)); if (!k || Object.keys(o).some(x => fold(x) === fold(moi))) return 0; o[moi] = JSON.parse(JSON.stringify(o[k])); return 1; };
    bangDB(db.dinhBien); (db.dinhBienVer || []).forEach(v => bangDB(v && v.rows));
    so.dinhMuc += khoaDM(db.dinhMuc); (db.dinhMucBan || []).forEach(v => { so.dinhMuc += khoaDM(v && v.dm); });
    Object.values(db.rs || {}).forEach(o => Object.values((o && o.forests) || {}).forEach(f => {
      const dung = (f.nc || []).some(r => r && (r.viTriId === id || fold(r.chucDanh) === fold(cu)));
      if (khoa(f)) { if (dung) so.loKhoa++; return; }   // lô đã chốt / dừng: giữ tên đã áp dụng
      (f.nc || []).forEach(r => { if (r && (r.viTriId === id || (!r.viTriId && fold(r.chucDanh) === fold(cu)))) { r.chucDanh = moi; r.viTriId = id; so.nhanCong++; } });
      [f.info || {}, ...(f.doi || []).map(d => (d && d.hinhThuc) || {})].forEach(i => DG.forEach(m => { so.donGia += doiKhoa(i[m], cu, moi); }));
    }));
    (db.dmLaoDong || []).forEach(r => { if (r && fold(r.viTri) === fold(cu)) r.viTri = moi; });
    vt.ten = moi;
    return {ok: true, so};
  }
  /* gieo sẵn vài vị trí để chọn, CHỈ khi danh mục hoàn toàn trống (không thêm vào danh mục đã có dữ liệu); sửa dm tại chỗ, trả số vị trí đã gieo */
  function gieoSan(dm) { if (!Array.isArray(dm) || dm.length) return 0; GIEO.forEach(t => them(dm, t)); return dm.length; }
  /* vị trí đang được dùng ở đâu (theo tên, không phân biệt hoa thường): dòng nhân công của mọi lô, định biên (gồm phiên bản), định mức BHLĐ (gồm bản), đơn giá của lô và đội */
  function dangDung(db, id) {
    const vt = timId((db || {}).dmViTri, id), r = {nhanCong: 0, dinhBien: 0, dinhMuc: 0, donGia: 0, tong: 0}; if (!vt) return r;
    const k = fold(vt.ten), eq = t => fold(t) === k, co = o => Object.keys(o || {}).some(eq);
    Object.values(db.rs || {}).forEach(o => Object.values((o && o.forests) || {}).forEach(f => {
      (f.nc || []).forEach(n => { if (n && (n.viTriId === id || eq(n.chucDanh))) r.nhanCong++; });
      [f.info || {}, ...(f.doi || []).map(d => (d && d.hinhThuc) || {})].forEach(i => DG.forEach(m => { if (co(i[m])) r.donGia++; }));
    }));
    r.dinhBien = [db.dinhBien].concat((db.dinhBienVer || []).map(v => v && v.rows)).reduce((n, rows) => n + (Array.isArray(rows) && rows.some(x => x && eq(x.chucDanh)) ? 1 : 0), 0);
    r.dinhMuc = (co(db.dinhMuc) ? 1 : 0) + (db.dinhMucBan || []).filter(v => v && co(v.dm)).length;
    r.tong = r.nhanCong + r.dinhBien + r.dinhMuc + r.donGia; return r;
  }
  /* xóa vị trí: đang dùng thì chuyển “Ngừng sử dụng” (giữ mọi liên kết), chưa dùng thì xóa hẳn; ba vị trí mặc định không xóa */
  function xoa(db, id) {
    const dm = db.dmViTri || [], vt = timId(dm, id); if (!vt) return {ok: false, error: 'Không có vị trí này'};
    if (MAC_DINH.some(m => fold(m) === fold(vt.ten))) return {ok: false, error: 'Vị trí “' + vt.ten + '” là vị trí mặc định của phần mềm, không xóa được'};
    const d = dangDung(db, id);
    if (d.tong > 0) { vt.ngung = true; return {ok: true, kieu: 'ngung', dung: d, thongBao: 'Vị trí “' + vt.ten + '” đang được dùng (' + [d.nhanCong && d.nhanCong + ' dòng nhân công', d.dinhBien && d.dinhBien + ' bảng định biên', d.dinhMuc && d.dinhMuc + ' bản định mức BHLĐ', d.donGia && d.donGia + ' bảng đơn giá'].filter(Boolean).join(', ') + ') nên chuyển sang “Ngừng sử dụng”, không xóa hẳn.'}; }
    db.dmViTri = dm.filter(x => x.id !== id); return {ok: true, kieu: 'xoa', dung: d, thongBao: 'Đã xóa vị trí “' + vt.ten + '”.'};
  }
  const api = {tim, timId, them, sua, dung, tenDangCo, doiTen, dangDung, xoa, fold, MAC_DINH, GIEO, gieoSan};
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.HAKViTri = api;
})(typeof self !== 'undefined' ? self : this);
