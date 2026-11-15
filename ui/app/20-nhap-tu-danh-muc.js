/* ========== Nhập theo hợp đồng từ Danh mục (bản 2.1, giai đoạn C) ==========
 * - Chọn người / xe từ danh mục khi thêm vào lô (lô chụp lại thông tin, hồ sơ đã in không đổi khi danh mục đổi sau này).
 * - Người / xe MỚI nhập trong lô được ghi luôn vào danh mục khi lưu lô (không nhập hai nơi).
 * - Nút “Cập nhật từ danh mục”: làm mới có chủ ý bản chụp trong bản nháp của lô. */
const dmNguonLd = () => {
  const dm = HAKDanhMuc.laoDongHieuLuc(db.dmLaoDong || []), co = new Set(dm.map(r => HAKDanhMuc.cccdSo(r.cccd)));
  const them = HAKModel.nguoiDanhMuc(db.rs).filter(r => !co.has(HAKDanhMuc.cccdSo(r.cccd))).map(r => ({ngayCapNhat: '', cccd: HAKDanhMuc.cccdSo(r.cccd), ten: r.ten, gioiTinh: '', ngaySinh: r.ngaySinh || '', diaChi: r.diaChi || '', ngayCap: r.ngayCap || '', noiCap: r.noiCap || '', sdt: r.sdt || '', chucVu: r.vaiTro || '', viTri: r.chucDanh || ''}));
  return dm.concat(them).sort((a, b) => String(a.ten).localeCompare(String(b.ten), 'vi'));
};
const dmNguonXe = () => {
  const dm = HAKDanhMuc.xeHieuLuc(db.dmXeVC || []), co = new Set(dm.map(r => HAKDanhMuc.bienKey(r.bienSo)));
  const them = xeDanhMuc().filter(r => !co.has(HAKDanhMuc.bienKey(r.bienSo))).map(r => ({ngayCapNhat: '', bienSo: r.bienSo, chuXe: r.chuXe || '', taiXe: r.taiXe || '', cccdTx: r.cccdTx || '', diaChiTx: r.diaChiTx || '', ngayCapTx: r.ngayCapTx || '', noiCapTx: r.noiCapTx || '', gplx: r.gplx || '', hanGplx: r.hanGplx || '', hanDangKiem: r.kdDen || '', hanBaoHiem: r.hanBH || '', _goc: r}));   // _goc: các trường riêng của xe ở lô cũ (chủ xe, loại xe…) để điền sẵn
  return dm.concat(them).sort((a, b) => String(a.bienSo).localeCompare(String(b.bienSo)));
};
/* điền ô hộp thoại thêm người từ một dòng danh mục */
function dmDienNguoi(d) {
  const goc = Object.assign({}, stm.vals), r = HAKDanhMuc.chupLaoDong(d, goc);
  ['ten', 'cccd', 'ngaySinh', 'ngayCap', 'noiCap', 'diaChi', 'vaiTro', 'chucDanh'].forEach(k => { if (r[k] != null) stm.vals[k] = stStr(r[k]); });
  if (d.gioiTinh) stm.vals.danhXung = d.gioiTinh === 'Nữ' ? 'Bà' : 'Ông';
}
function dmDienXe(d) {
  const r = HAKDanhMuc.chupXe(d, Object.assign({}, stm.vals));
  if (d._goc) ST_FIELDS.dx.forEach(([k]) => { if (k !== 'stt' && d._goc[k] != null && d._goc[k] !== '') stm.vals[k] = stStr(d._goc[k]); });
  ['bienSo', 'chuXe', 'taiXe', 'cccdTx', 'diaChiTx', 'ngayCapTx', 'noiCapTx', 'gplx', 'hanGplx', 'kdDen', 'hanBH'].forEach(k => { if (r[k] != null && r[k] !== '') stm.vals[k] = stStr(r[k]); });
}
/* người / xe mới của lô (chưa có trong danh mục) → ghi vào danh mục; trả số dòng thêm */
function dmGhiTuLo(st) {
  let n = 0; const hom = todayStr(), baseIds = k => new Set(st.base[k].map(b => b._id));
  const bn = baseIds('nc'), bx = baseIds('dx'); let ld = db.dmLaoDong || [], xe = db.dmXeVC || [];
  st.cur.nc.forEach(r => {
    if (bn.has(r._id)) return; const k = HAKDanhMuc.cccdSo(r.cccd); if (k.length !== 12 || !trim(r.ten) || HAKDanhMuc.layLaoDong(ld, k)) return;
    const t = HAKDanhMuc.themLaoDong(ld, {ngayCapNhat: hom, cccd: k, ten: r.ten, gioiTinh: r.danhXung === 'Bà' ? 'Nữ' : r.danhXung === 'Ông' ? 'Nam' : '', ngaySinh: r.ngaySinh || '', diaChi: r.diaChi || '', ngayCap: r.ngayCap || '', noiCap: r.noiCap || '', sdt: r.sdt || '', chucVu: r.vaiTro || '', viTri: r.chucDanh || ''}); ld = t.list; n++;
  });
  st.cur.dx.forEach(r => {
    if (bx.has(r._id)) return; if (!HAKDanhMuc.bienKey(r.bienSo) || HAKDanhMuc.layXe(xe, r.bienSo)) return;
    const t = HAKDanhMuc.themXe(xe, {ngayCapNhat: hom, bienSo: r.bienSo, chuXe: r.chuXe || '', taiXe: r.taiXe || '', cccdTx: r.cccdTx || '', diaChiTx: r.diaChiTx || '', ngayCapTx: r.ngayCapTx || '', noiCapTx: r.noiCapTx || '', gplx: r.gplx || '', hanGplx: r.hanGplx || '', hanDangKiem: r.kdDen || '', hanBaoHiem: r.hanBH || ''}); xe = t.list; n++;
  });
  if (n) { db.dmLaoDong = ld; db.dmXeVC = xe; persist(); }
  return n;
}
/* dòng của lô khác bản chụp so với dòng mới nhất của danh mục: [{row, d, khac}] */
function dmLechLo(kind, rows) {
  const out = [];
  (rows || []).forEach(r => {
    if (kind === 'nc') { const m = HAKDanhMuc.layLaoDong(db.dmLaoDong || [], r.cccd); if (!m) return; const k = HAKDanhMuc.khacLaoDong(r, m.row); if (k.length) out.push({row: r, d: m.row, khac: k}); }
    else { const m = HAKDanhMuc.layXe(db.dmXeVC || [], r.bienSo); if (!m) return; const k = HAKDanhMuc.khacXe(r, m.row); if (k.length) out.push({row: r, d: m.row, khac: k}); }
  });
  return out;
}
function dmThanhLech(kind) {
  const st = stCur(), rec = curRec(); const rows = st ? st.cur[kind] : (rec && rec[kind]) || [];
  const l = dmLechLo(kind, rows); if (!l.length) return '';
  return '<div class="msg warn" id="dmLech' + kind + '">Danh mục có thông tin <b>mới hơn</b> bản chụp trong lô cho ' + l.length + ' ' + (kind === 'nc' ? 'người' : 'xe') + ': ' + l.slice(0, 6).map(x => esc((kind === 'nc' ? x.row.ten : x.row.bienSo) + ' (' + x.khac.join(', ') + ')')).join('; ') + (l.length > 6 ? ' …' : '') + '. <button class="btn sm" data-act="dmCapNhatLo" data-kind="' + kind + '">Cập nhật từ danh mục</button> <span class="mut">Chỉ đổi trong bản nháp; hồ sơ lô đổi khi bấm “Lưu dữ liệu vào lô”.</span></div>';
}
function dmCapNhatLo(kind) {
  const st = stGet(true); if (!st) return;
  const l = dmLechLo(kind, st.cur[kind]); let n = 0;
  l.forEach(x => { const row = kind === 'nc' ? HAKDanhMuc.chupLaoDong(x.d, x.row) : HAKDanhMuc.chupXe(x.d, x.row); if (HAKStage.updateRow(st, kind, x.row._id, row).ok !== false) n++; });
  stErrList = null; note('Đã cập nhật ' + n + ' dòng từ danh mục vào bản nháp. Bấm “Lưu dữ liệu vào lô” để ghi.', 'ok'); render();
}
