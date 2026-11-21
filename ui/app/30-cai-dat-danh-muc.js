/* ========== CÀI ĐẶT 3.0: Danh mục đối tượng, Danh mục xe, Vị trí, Giao diện, Hướng dẫn, Cần đối chiếu (docs/THIET_KE_3_0.md) ==========
 * Một nguồn: db.dmDoiTuong (src/doituong.js), db.dmXe (src/xedm.js), db.dmViTri (src/vitri.js). Ba danh mục cũ (dmLaoDong, dmXeVC, dmDoiTac) giữ trong SQLite làm
 * bản lưu trữ, không sửa nữa; các chỗ cần dạng cũ đọc qua dmCu() (dựng từ danh mục mới).
 * BẢN NHÁP MÀN CHI TIẾT: form đang sửa giữ ở `cd`; rời trang khi còn thay đổi → hộp hỏi Lưu / Bỏ thay đổi / Tiếp tục chỉnh sửa (roiTrang). */
const cd = {nhom: 'tatca', q: '', sua: null, goc: '', loi: [], msg: null, ngSua: null, dtXem: null, xe: {q: '', sua: null, goc: '', loi: [], xem: null}, vtMsg: null};
const dmDT = () => db.dmDoiTuong || [], dmXE = () => db.dmXe || [], dmVT = () => db.dmViTri || [];   // chỉ đọc (withDefaults / SQLite v15 bảo đảm có mảng)
const ten30 = id => { const v = HAKViTri.timId(dmVT(), id); return v ? v.ten : ''; };
/* dạng cũ (bản 2.x) dựng từ danh mục mới — cho tìm kiếm, tổng hợp, việc cần làm… đọc một nguồn */
function dmCu() {
  const ld = [], xe = [], dt = [];
  dmDT().forEach(o => (o.nguoi || []).forEach(p => {
    if (p.vaiTro && p.vaiTro.nhanCong) ld.push({ngayCapNhat: o.ngayCapNhat || '', cccd: p.cccd, ten: p.hoTen, gioiTinh: p.gioiTinh, ngaySinh: p.ngaySinh, diaChi: p.diaChi, ngayCap: p.ngayCap, noiCap: p.noiCap, sdt: p.sdt, chucVu: '', viTri: ten30(p.viTriId)});
  }));
  dmXE().forEach(x => { const c = HAKXeDM.chuXe(dmDT(), x.chuXeId) || {}, ng = c.ng || {};
    xe.push({ngayCapNhat: x.ngayCapNhat, bienSo: x.bks, chuXe: c.ten || '', cccd: ng.cccd || '', ngaySinh: ng.ngaySinh || '', diaChi: ng.diaChi || (c.dt && c.dt.diaChi) || '', ngayCap: ng.ngayCap || '', noiCap: ng.noiCap || '', sdt: ng.sdt || '', loaiXe: x.loaiXe, hanDangKiem: x.hanKiemDinh,
    hanBaoHiem: x.hanBaoHiem, taiXe: '', cccdTx: '', gplx: '', hanGplx: ''}); });
  HAKDoiTuong.tatCaNguoi(dmDT()).filter(x => x.ng.vaiTro && x.ng.vaiTro.taiXe).forEach(x => xe.push({ngayCapNhat: x.dt.ngayCapNhat || '', bienSo: '', chuXe: '', taiXe: x.ng.hoTen, cccdTx: x.ng.cccd, diaChiTx: x.ng.diaChi, ngayCapTx: x.ng.ngayCap, noiCapTx: x.ng.noiCap, gplx: x.ng.gplx, hanGplx: x.ng.hanGplx}));
  dmDT().forEach(o => { if (o.loai === 'phapnhan') dt.push({id: o.nguonCu || o.id, loai: 'doanhnghiep', ten: o.ten, mst: o.mst, daiDien: o.daiDien, chucVu: o.chucVuDaiDien, diaChi: o.diaChi, sdt: o.sdt}); });
  return {dmLaoDong: ld, dmXeVC: xe, dmDoiTac: dt};
}

/* ---------- hộp thoại riêng (#dlgBox) ---------- */
function dlgMo(html) { const b = document.getElementById('dlgBox'); if (!b) return; document.getElementById('dlgBody').innerHTML = html; b.classList.add('on'); const f = b.querySelector('input,select,button'); if (f) f.focus(); }
function dlgDong() { if (typeof hakSfDraft !== 'undefined') hakSfDraft = null; const b = document.getElementById('dlgBox'); if (b) { b.classList.remove('on'); const d = document.getElementById('dlgBody'); if (d) d.innerHTML = ''; } }   // đóng là xóa nội dung (không còn form ẩn trùng id)

/* ---------- RỜI TRANG KHI CÒN THAY ĐỔI: Lưu / Bỏ thay đổi / Tiếp tục chỉnh sửa ---------- */
/* các màn chi tiết đăng ký bản nháp của mình: {ten, dirty(), luu() → true nếu lưu được, bo()} */
const banNhapUI = [];
const banNhapDo = () => banNhapUI.find(x => { try { return x.dirty(); } catch (e) { return false; } }) || null;
let roiCho = null;   // thao tác điều hướng đang chờ người dùng chọn
const DIEU_HUONG = '[data-act=goHome],[data-act=openSettings],[data-act^=openSet],[data-act=openCty],[data-act=rpOpen],[data-act=lkOpen],[data-act=openNorm],[data-open],[data-forest],[data-ftab],[data-tab],[data-muc-lo],[data-act=newRs],[data-act=hdQuayLai],[data-act=ktGo],[data-act=chonHd],[data-act=chonDoi]';
document.addEventListener('click', e => {
  const el = e.target && e.target.closest && e.target.closest(DIEU_HUONG); if (!el || el.closest('#dlgBox')) return;
  if (el.dataset.quaylai) { if (cd.xe.sua) cd.xe.sua = xeDocForm(); if (cd.sua) cd.sua = dtDocForm(); veLaiGhi(el.dataset.quaylai); return; }   // mở danh mục rồi quay lại: giữ bản đang nhập, không hỏi
  if (veLai && (/^nav/.test(el.id || '') || el.dataset.open || el.dataset.forest)) veLai = null;   // đi nơi khác bằng thanh chính / chọn chủ rừng, rừng: thôi nhắc quay lại
  const bn = banNhapDo(); if (!bn || el.dataset.roiOk) return;
  e.preventDefault(); e.stopImmediatePropagation(); roiCho = el;
  dlgMo('<h3 style="margin-top:0">Còn thay đổi chưa lưu</h3><p>' + esc(bn.ten) + ' có thay đổi chưa lưu. Bạn muốn làm gì?</p>' +
    '<div class="row" style="gap:8px;justify-content:flex-end;flex-wrap:wrap"><button class="btn" data-act="roiLuu" id="roiLuu">Lưu</button><button class="btn danger" data-act="roiBo" id="roiBo">Bỏ thay đổi</button><button class="btn ghost" data-act="roiTiep" id="roiTiep">Tiếp tục chỉnh sửa</button></div>');
}, true);
async function roiXuLy(chon) {
  const bn = banNhapDo(), el = roiCho; dlgDong(); roiCho = null; if (!bn || !el) return;
  if (chon === 'tiep') return;
  if (chon === 'luu') { const ok = await bn.luu(); if (!ok) return; } else bn.bo();
  const lai = timLai(el); lai.dataset.roiOk = '1'; try { lai.click(); } finally { delete lai.dataset.roiOk; }
}
/* sau khi lưu / bỏ, màn được vẽ lại: nút điều hướng cũ đã rời DOM (bấm nó không tới bộ xử lý) → tìm lại nút tương ứng theo id hoặc thuộc tính data-* */
function timLai(el) {
  if (el.isConnected) return el;
  if (el.id) { const x = document.getElementById(el.id); if (x) return x; }
  const sel = el.tagName.toLowerCase() + Object.keys(el.dataset).filter(k => k !== 'roiOk').map(k => '[data-' + k.replace(/[A-Z]/g, c => '-' + c.toLowerCase()) + '="' + String(el.dataset[k]).replace(/["\\]/g, '\\$&') + '"]').join('');
  return document.querySelector(sel) || el;
}

/* ---------- DANH MỤC ĐỐI TƯỢNG ---------- */
const NHOM_DT = [['tatca', 'Tất cả'], ['doitac', 'Đối tác (ký hợp đồng)'], ['nhancong', 'Nhân công'], ['taixe', 'Tài xế'], ['chuxe', 'Chủ xe'], ['ngung', 'Ngừng sử dụng']];
const kyChon = k => k.vanChuyen && k.nhanCong ? 'ca' : k.vanChuyen ? 'vc' : k.nhanCong ? 'nc' : '';
const kyTu = v => ({vanChuyen: v === 'vc' || v === 'ca', nhanCong: v === 'nc' || v === 'ca'});
const selKy = (name, v) => '<select name="' + name + '">' + [['', 'Không'], ['vc', 'Vận chuyển'], ['nc', 'Nhân công'], ['ca', 'Cả hai']].map(([k, t]) => '<option value="' + k + '"' + (k === v ? ' selected' : '') + '>' + t + '</option>').join('') + '</select>';
const fld30 = (name, label, v, o) => { o = o || {};
return '<label' + (o.wide ? ' style="grid-column:1/-1"' : '') + '><span' + (o.req ? ' class="req"' : '') + '>' + label + '</span><input name="' + name + '" value="' + esc(v == null ? '' : v) + '"' + (o.ph ? ' placeholder="' + esc(o.ph) + '"' : '') + ' autocomplete="off"></label>'; };
banNhapUI.push({ten: 'Hồ sơ đối tượng đang sửa', dirty: () => !!cd.sua && JSON.stringify(dtDocForm()) !== cd.goc, luu: () => dtLuu(), bo: () => { cd.sua = null; cd.loi = []; }});
function dtDocForm() {
  const fm = document.getElementById('dtForm'); if (!fm || !cd.sua) return cd.sua;
  const g = n => (fm.elements[n] ? fm.elements[n].value : ''), x = Object.assign({}, cd.sua);
  ['ma', 'ten', 'mst', 'diaChi', 'sdt', 'daiDien', 'chucVuDaiDien'].forEach(k => { if (fm.elements[k]) x[k] = trim(g(k)); });
  if (fm.elements.loai) x.loai = g('loai'); if (fm.elements.kyHD) x.kyHD = kyTu(g('kyHD'));
  return x;
}
function panelSetDt() {
  const SF = HAKCore.sf, baseDs = HAKDoiTuong.loc(dmDT(), cd.nhom, cd.q);
  const sfCfg = {
    screenId: 'dm_doi_tuong', title: 'Danh mục đối tượng',
    searchPlaceholder: 'Lọc theo tên, mã, CCCD, MST, địa chỉ…',
    quickFields: ['loai', 'thieuCccd'],
    advancedFields: ['q', 'loai', 'vaiTro', 'kyHd', 'thieuCccd', 'ngung'],
    matchQ: (o, q) => SF.hay([o.ma, o.ten, o.mst, o.diaChi, o.sdt, o.daiDien].concat((o.nguoi || []).map(p => p.hoTen + ' ' + p.cccd + ' ' + p.sdt))).includes(q),
    fields: [
      {key: 'loai', label: 'Loại', type: 'enum', options: [{value: 'thenhan', label: 'Thể nhân'}, {value: 'phapnhan', label: 'Pháp nhân'}], match: (o, v) => o.loai === v},
      {key: 'vaiTro', label: 'Vai trò', type: 'multi', options: [{value: 'nhanCong', label: 'Nhân công'}, {value: 'taiXe', label: 'Tài xế'}, {value: 'chuXe', label: 'Chủ xe'}], match: (o, vals) => (o.nguoi || []).some(p => p.vaiTro && vals.some(k => p.vaiTro[k]))},
      {key: 'kyHd', label: 'Quyền ký HĐ', type: 'multi', options: [{value: 'nhanCong', label: 'Ký Nhân công'}, {value: 'vanChuyen', label: 'Ký Vận chuyển'}], match: (o, vals) => vals.some(k => (o.kyHD && o.kyHD[k]) || (o.nguoi || []).some(p => p.kyHD && p.kyHD[k]))},
      {key: 'thieuCccd', label: 'Chưa có CCCD', type: 'bool', match: o => o.loai !== 'phapnhan' && (o.nguoi || []).some(p => !trim(p.cccd))},
      {key: 'ngung', label: 'Đang ngừng sử dụng', type: 'bool', match: o => !!o.ngung}
    ]
  };
  const sfRes = hakSfApply('dm_doi_tuong', sfCfg, baseDs);
  const sfOn = SF.activeCount(hakSfGet('dm_doi_tuong', sfCfg).filter.getState()) > 0;
  const ds = sfRes.rows, x = cd.sua;
  const bang = '<div class="wrap" id="dtWrap" style="max-height:min(60vh,520px)"><table id="dtBang"' + (ds.length ? ' style="min-width:860px"' : '') + '><thead><tr><th>Mã</th><th>Tên đối tượng</th><th>Loại</th><th>MST</th><th>Địa chỉ</th><th>SĐT</th><th>Ký hợp đồng</th><th>Người · vai trò</th><th></th></tr></thead><tbody>' +
    (ds.length ? ds.map(o => '<tr data-dt="' + esc(o.id) + '"><td>' + esc(o.ma) + '</td><td><b>' + esc(o.ten) + '</b></td><td>' + HAKDoiTuong.LOAI[o.loai] + '</td><td>' + esc(o.mst) + '</td><td>' + esc(o.diaChi) + '</td><td>' + esc(o.sdt) + '</td><td>' +
      esc(o.loai === 'phapnhan' ? HAKDoiTuong.kyText(o.kyHD) : HAKDoiTuong.kyText({vanChuyen: (o.nguoi || []).some(p => p.kyHD && p.kyHD.vanChuyen), nhanCong: (o.nguoi || []).some(p => p.kyHD && p.kyHD.nhanCong)})) + '</td><td>' +
      (o.nguoi || []).map(p => esc(p.hoTen) + (HAKDoiTuong.vaiText(p.vaiTro) ? ' <small class="mut">(' + esc(HAKDoiTuong.vaiText(p.vaiTro)) + ')</small>' : '')).join('<br>') + '</td>' +
      '<td style="white-space:nowrap"><button class="btn ghost sm" data-dtsua="' + esc(o.id) + '">Sửa</button> <button class="btn ghost sm" data-dtngung="' + esc(o.id) + '">' + (o.ngung ? 'Dùng lại' : 'Ngừng') + '</button></td></tr>').join('')
      : '<tr><td colspan="9" class="mut" id="dtTrong">Không có đối tượng nào' + (cd.q || cd.nhom !== 'tatca' || sfOn ? ' khớp bộ lọc' : '') + '.</td></tr>') + '</tbody></table></div>';
  const form = !x ? '' : '<form id="dtForm" class="card" style="margin:10px 0"><h3 style="margin:0 0 8px">' + (x.id ? 'Sửa đối tượng ' + esc(x.ma) : 'Thêm đối tượng') + '</h3>' +
    (cd.loi.length ? '<div class="msg err" id="dtLoi">' + cd.loi.map(esc).join('<br>') + '</div>' : '') +
    '<div class="grid">' + fld30('ma', 'Mã đối tượng (trống: tự cấp)', x.ma) + fld30('ten', 'Tên đối tượng', x.ten, {req: true}) +
    '<label><span>Loại</span><select name="loai" id="dtLoai"><option value="thenhan"' + (x.loai !== 'phapnhan' ? ' selected' : '') + '>Thể nhân</option><option value="phapnhan"' + (x.loai === 'phapnhan' ? ' selected' : '') + '>Pháp nhân</option></select></label>' +
    fld30('mst', 'Mã số thuế', x.mst) + fld30('diaChi', x.loai === 'phapnhan' ? 'Địa chỉ trụ sở' : 'Địa chỉ thường trú', x.diaChi) + fld30('sdt', 'Số điện thoại', x.sdt) +
    (x.loai === 'phapnhan' ? '<label><span>Ký hợp đồng</span>' + selKy('kyHD', kyChon(x.kyHD || {})) + '</label>' + fld30('daiDien', 'Người đại diện', x.daiDien) + fld30('chucVuDaiDien', 'Chức danh người đại diện', x.chucVuDaiDien) : '') + '</div>' +
    (x.loai !== 'phapnhan' ? '<h4 style="margin:12px 0 6px">Đối tác (người)</h4><div class="wrap" style="max-height:260px"><table id="dtNguoiTbl" style="min-width:720px"><thead><tr><th>Họ tên</th><th>CCCD</th><th>SĐT</th><th>Vai trò</th><th>Ký hợp đồng</th><th>Vị trí mặc định</th><th></th></tr></thead><tbody>' +
      ((x.nguoi || []).length ? x.nguoi.map((p, i) => '<tr><td><b>' + esc(p.hoTen) + '</b></td><td>' + esc(p.cccd) + '</td><td>' + esc(p.sdt) + '</td><td>' + esc(HAKDoiTuong.vaiText(p.vaiTro)) + '</td><td>' + esc(HAKDoiTuong.kyText(p.kyHD || {})) + '</td><td>' + esc(ten30(p.viTriId)) + '</td>' +
        '<td style="white-space:nowrap"><button type="button" class="btn ghost sm" data-ngsua="' + i + '">Sửa</button> <button type="button" class="btn ghost sm" data-ngbo="' + i + '">Bỏ</button></td></tr>').join('') : '<tr><td colspan="7" class="mut">Chưa có người nào: bấm “Thêm người”.</td></tr>') +
      '</tbody></table></div><div class="row" style="margin-top:6px"><button type="button" class="btn ghost sm" data-act="ngThem" id="ngThem">+ Thêm người</button></div>' : '') +
    '<div class="row" style="gap:8px;margin-top:12px"><button class="btn" type="submit" id="dtLuu">Lưu</button><button class="btn ghost" type="button" data-act="dtHuy" id="dtHuy">Hủy</button></div></form>';
  return '<div class="card"><h3 style="margin-top:0">Danh mục đối tượng</h3>' + (cd.msg ? '<div class="msg ' + cd.msg[1] + '" id="dtMsg">' + esc(cd.msg[0]) + '</div>' : '') +
    '<p class="mut" style="margin-top:0">Khai báo <b>một lần</b>: pháp nhân (công ty, ký qua người đại diện) hoặc thể nhân (từng người trong bảng Đối tác). Một người có thể vừa là Nhân công, Tài xế, Chủ xe; quyền ký hợp đồng khai riêng. Hợp đồng chỉ hiện đối tượng phù hợp.</p>' +
    '<div class="row" style="gap:8px;flex-wrap:wrap;align-items:flex-end"><label>Lọc theo<select id="dtNhom">' + NHOM_DT.map(([k, t]) => '<option value="' + k + '"' + (cd.nhom === k ? ' selected' : '') + '>' + t + '</option>').join('') + '</select></label>' +
    '<label style="flex:1;min-width:200px">Tìm<input id="dtQ" value="' + esc(cd.q) + '" placeholder="tên, mã, MST, CCCD, SĐT"></label>' +
    '<button class="btn" data-act="dtThem" id="dtThem">+ Thêm đối tượng</button><label class="btn ghost" style="cursor:pointer">Nhập Excel<input type="file" accept=".xlsx,.xls" data-dtfile="1" hidden></label><button class="btn ghost" data-act="dtMau">Tải file mẫu</button></div>' +
    hakSfBarHtml('dm_doi_tuong', sfRes.total, sfRes.kept) + form + '<div style="margin-top:10px">' + bang + '</div><p class="mut" style="margin:6px 0 0" id="dtDem">' + ds.length + ' đối tượng</p></div>';
}
function dtMo(id) { const o = id ? HAKDoiTuong.tim(dmDT(), id) : null; cd.sua = o ? JSON.parse(JSON.stringify(o)) : {id: '', ma: '', ten: '', loai: 'thenhan', kyHD: {}, nguoi: []}; cd.goc = JSON.stringify(cd.sua); cd.loi = []; cd.msg = null; render();
const f = document.querySelector('#dtForm [name=ten]'); if (f) f.focus(); }
async function dtLuu() {
  const x = dtDocForm(), r = HAKDoiTuong.luu(dmDT(), x, todayStr());
  if (!r.ok) { cd.sua = x; cd.loi = r.errs; render(); return false; }
  db.dmDoiTuong = r.dm; cd.sua = null; cd.loi = []; cd.msg = ['Đã lưu “' + r.dt.ten + '” (mã ' + r.dt.ma + ').' + (r.canhBao.length ? ' Lưu ý: ' + r.canhBao.join('; ') + '.' : ''), r.canhBao.length ? 'warn' : 'ok']; persist(); render(); return true;   // phiếu #05: cảnh báo, không chặn lưu
}
function ngMo(i) {
  const p = i == null ? {hoTen: '', vaiTro: {}, kyHD: {}} : (cd.sua.nguoi || [])[i]; cd.ngSua = i == null ? -1 : i;
  const cb = (k, t, o) => '<label style="flex-direction:row;align-items:center;gap:6px"><input type="checkbox" name="' + k + '"' + (o ? ' checked' : '') + '> ' + t + '</label>';
  dlgMo('<form id="ngForm"><h3 style="margin-top:0">' + (i == null ? 'Thêm người' : 'Sửa ' + esc(p.hoTen)) + ' — ' + esc(cd.sua.ten || 'đối tượng mới') + '</h3><div id="ngLoi"></div><div class="grid">' +
    fld30('hoTen', 'Họ tên', p.hoTen, {req: true}) + fld30('cccd', 'Số CCCD', p.cccd) + fld30('ngayCap', 'Ngày cấp (dd/mm/yyyy)', p.ngayCap) + fld30('noiCap', 'Nơi cấp', p.noiCap) + fld30('hanCccd', 'Hạn CCCD', p.hanCccd) +
    fld30('diaChi', 'Địa chỉ thường trú', p.diaChi) + '<label><span>Giới tính</span><select name="gioiTinh"><option></option><option' + (p.gioiTinh === 'Nam' ? ' selected' : '') + '>Nam</option><option' + (p.gioiTinh === 'Nữ' ? ' selected' : '') + '>Nữ</option></select></label>' +
    fld30('ngaySinh', 'Ngày sinh', p.ngaySinh) + fld30('sdt', 'Số điện thoại', p.sdt) + fld30('gplx', 'Số giấy phép lái xe', p.gplx) + fld30('hanGplx', 'Hạn GPLX', p.hanGplx) +
    '<label><span>Vị trí mặc định</span><select name="viTriId"><option value="">—</option>' + dmVT().filter(v => !v.ngung).map(v => '<option value="' + esc(v.id) + '"' + (v.id === p.viTriId ? ' selected' : '') + '>' + esc(v.ten) + '</option>').join('') + '</select></label>' +
    fld30('chucDanhKy', 'Chức danh khi ký (nếu có)', p.chucDanhKy) + '</div>' +
    '<div class="row" style="gap:14px;flex-wrap:wrap;margin-top:8px"><b>Vai trò:</b>' + cb('vtNhanCong', 'Nhân công', p.vaiTro && p.vaiTro.nhanCong) + cb('vtTaiXe', 'Tài xế', p.vaiTro && p.vaiTro.taiXe) + cb('vtChuXe', 'Chủ xe', p.vaiTro && p.vaiTro.chuXe) + '</div>' +
    '<div class="row" style="gap:14px;flex-wrap:wrap;margin-top:6px"><b>Ký hợp đồng:</b>' + cb('kyVC', 'Vận chuyển', p.kyHD && p.kyHD.vanChuyen) + cb('kyNC', 'Nhân công', p.kyHD && p.kyHD.nhanCong) + '</div>' +
    '<div class="row" style="gap:8px;justify-content:flex-end;margin-top:12px"><button class="btn" type="submit" id="ngLuu">Lưu người</button><button class="btn ghost" type="button" data-act="dlgDong">Hủy</button></div></form>');
}
function ngLuu(fm) {
  const g = n => trim((fm.elements[n] || {}).value || ''), c = n => !!(fm.elements[n] && fm.elements[n].checked), cu = cd.ngSua >= 0 ? cd.sua.nguoi[cd.ngSua] : {};
  const p = Object.assign({}, cu, {hoTen: g('hoTen'), cccd: g('cccd'), ngayCap: g('ngayCap'), noiCap: g('noiCap'), hanCccd: g('hanCccd'), diaChi: g('diaChi'), gioiTinh: g('gioiTinh'), ngaySinh: g('ngaySinh'), sdt: g('sdt'), gplx: g('gplx'), hanGplx: g('hanGplx'), viTriId: g('viTriId'), chucDanhKy: g('chucDanhKy'),
    vaiTro: {nhanCong: c('vtNhanCong'), taiXe: c('vtTaiXe'), chuXe: c('vtChuXe')}, kyHD: {vanChuyen: c('kyVC'), nhanCong: c('kyNC')}});
  const thu = Object.assign({}, dtDocForm(), {nguoi: (cd.sua.nguoi || []).map((q, i) => i === cd.ngSua ? p : q).concat(cd.ngSua < 0 ? [p] : [])});
  const so = cd.ngSua < 0 ? thu.nguoi.length : cd.ngSua + 1, cuaNguoi = HAKDoiTuong.kiem(dmDT(), thu).filter(x => new RegExp('^Người ' + so + '[ :]').test(x));
  if (cuaNguoi.length) { document.getElementById('ngLoi').innerHTML = '<div class="msg err">' + cuaNguoi.map(esc).join('<br>') + '</div>'; return; }
  if (!thu.ten && p.hoTen) thu.ten = p.hoTen;   // thể nhân một người: tên đối tượng mặc định là họ tên
  cd.sua = thu; dlgDong(); render();
}
async function dtExcel(file) {
  try {
    const rows = await docSheetObj(file), xem = HAKDoiTuong.docExcel(rows, dmDT(), dmVT());
    cd.dtXem = xem.doiTuong.map(m => Object.assign(m, {chon: m.trangThai === 'moi' || m.trangThai === 'doi'}));
    xemExcelDt();
  } catch (e) { cd.msg = ['Không đọc được file: ' + e.message, 'err']; render(); }
}
const TT_XEM = {moi: ['ok', 'Mới'], trung: ['', 'Trùng (không đổi)'], doi: ['warn', 'Thay đổi'], loi: ['err', 'Lỗi']};
function xemExcelDt() {
  const m = cd.dtXem || [], dem = k => m.filter(x => x.trangThai === k).length;
  $('#impBody').innerHTML = '<h2>Nhập Excel — Danh mục đối tượng</h2><p>Mới: <b>' + dem('moi') + '</b> · Thay đổi: <b>' + dem('doi') + '</b> · Trùng: <b>' + dem('trung') + '</b> · Lỗi: <b>' + dem('loi') + '</b>. Bỏ chọn dòng không muốn lưu; dòng lỗi sửa trong file rồi nạp lại.</p>' +
    '<div class="wrap" style="max-height:50vh"><table id="dtXemTbl"><tr><th></th><th>Dòng</th><th>Đối tượng</th><th>Người</th><th>Trạng thái</th></tr>' +
    m.map((x, i) => '<tr data-tt="' + x.trangThai + '"><td><input type="checkbox" data-dtxem="' + i + '"' + (x.chon ? ' checked' : '') + (x.trangThai === 'loi' || x.trangThai === 'trung' ? ' disabled' : '') + '></td><td>' + x.dong.join(', ') + '</td><td><b>' + esc(x.dt.ten) +
    '</b><br><small class="mut">' + esc(x.dt.ma || '(tự cấp mã)') + ' · ' + HAKDoiTuong.LOAI[x.dt.loai] + (x.dt.mst ? ' · MST ' + esc(x.dt.mst) : '') + '</small></td><td>' +
      x.dt.nguoi.map(p => esc(p.hoTen) + ' <small class="mut">' + esc(p.cccd) + '</small>').join('<br>') + '</td><td><span class="pill ' + TT_XEM[x.trangThai][0] + '">' + TT_XEM[x.trangThai][1] + '</span>' + (x.loi.length ? '<br><small>' + x.loi.map(esc).join('<br>') + '</small>' : '') +
      '</td></tr>').join('') + '</table></div>' +
    '<div class="row" style="justify-content:flex-end;gap:8px;margin-top:10px"><button class="btn ghost" data-act="impCancel">Hủy</button><button class="btn" data-act="dtExcelLuu" id="dtExcelLuu">Lưu danh mục</button></div>';
  $('#impBox').classList.add('on');
}
function dtExcelLuu() {
  const muc = (cd.dtXem || []).filter(x => x.chon), r = HAKDoiTuong.apDungExcel(dmDT(), muc, todayStr());
  $('#impBox').classList.remove('on'); cd.dtXem = null;
  if (r.them || r.sua) { db.dmDoiTuong = r.dm; persist(); }
  cd.msg = ['Đã lưu danh mục từ Excel: thêm ' + r.them + ', cập nhật ' + r.sua + '.' + (r.loi.length ? ' Chưa lưu: ' + r.loi.join('; ') : ''), r.loi.length ? 'warn' : 'ok']; render();
}
function dtMau() {
  const h = Object.keys(HAKDoiTuong.COT), wb = XLSX.utils.book_new(), ws = XLSX.utils.aoa_to_sheet([h,
    ['DT0001', 'TỔ KHAI THÁC TRẦN SƠN', 'Thể nhân', '', 'Quế Sơn, Quảng Nam', '0905000001', 'Nhân công', '', '', 'TRẦN SƠN', '049085000001', '01/01/2021', 'Cục CS QLHC', '01/01/2036', 'Quế Sơn, Quảng Nam', 'Nam', '01/01/1985', '0905000001', '', '', 'Tổ trưởng', 'Tổ trưởng', 'Nhân công', 'x'],
    ['DT0001', 'TỔ KHAI THÁC TRẦN SƠN', 'Thể nhân', '', '', '', '', '', '', 'LÊ PHÚ', '049085000002', '', '', '', '', 'Nam', '', '', '', '', 'Công nhân cưa', '', 'Nhân công', ''],
    ['DT0002', 'CÔNG TY TNHH VẬN TẢI A', 'Pháp nhân', '0401234567', 'Đà Nẵng', '0236000000', 'Vận chuyển', 'NGUYỄN VĂN B', 'Giám đốc', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '']]);
  ws['!cols'] = h.map(x => ({wch: Math.max(12, x.length + 2)}));
  Object.keys(ws).filter(k => /^[A-Z]+\d+$/.test(k)).forEach(k => { ws[k].t = 's'; ws[k].z = '@'; });   // mọi ô là văn bản: giữ số 0 đầu của CCCD, MST, SĐT
  XLSX.utils.book_append_sheet(wb, ws, 'DoiTuong');
  download(new Blob([XLSX.write(wb, {type: 'array', bookType: 'xlsx'})], {type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}), 'Mau_DanhMuc_DoiTuong.xlsx');
}
/* đọc sheet đầu thành [{tiêu đề: chuỗi}] — mọi ô đọc là VĂN BẢN như hiển thị trong Excel */
function docSheetObj(file) {
  return new Promise((ok, loi) => { const fr = new FileReader(); fr.onerror = () => loi(new Error('Không đọc được file.')); fr.onload = () => { try { const wb = XLSX.read(fr.result, {type: 'array'}), ws = wb.Sheets[wb.SheetNames[0]];
    ok(XLSX.utils.sheet_to_json(ws, {defval: '', raw: false}).map(r => { const o = {}; Object.entries(r).forEach(([k, v]) => { o[trim(k)] = String(v == null ? '' : v); }); return o; })); } catch (e) { loi(e); } }; fr.readAsArrayBuffer(file); });
}

/* ---------- DANH MỤC XE ---------- */
banNhapUI.push({ten: 'Xe đang sửa', dirty: () => !!cd.xe.sua && JSON.stringify(xeDocForm()) !== cd.xe.goc, luu: () => xeLuu(), bo: () => { cd.xe.sua = null; cd.xe.loi = []; }});
banNhapUI.push({
  ten: 'Thông tin công ty mua hàng',
  dirty: () => NAV.view === 'cty' && !!document.getElementById('ctyForm') && !!cty.goc && JSON.stringify(ctyReadForm()) !== cty.goc,
  luu: () => ctySave(),
  bo: () => { cty.edit = null; cty.goc = ''; }
});
banNhapUI.push({
  ten: 'Tên vị trí đang sửa',
  dirty: () => NAV.view === 'setvt' && [...document.querySelectorAll('#vtBang [data-vtten]')].some(inp => { const v = dmVT().find(x => x.id === inp.dataset.vtten); return v && trim(inp.value) && trim(inp.value) !== trim(v.ten); }),
  luu: () => {
    for (const inp of document.querySelectorAll('#vtBang [data-vtten]')) {
      const v = dmVT().find(x => x.id === inp.dataset.vtten);
      if (v && trim(inp.value) && trim(inp.value) !== trim(v.ten)) {
        const r = HAKViTri.doiTen(db, v.id, inp.value);
        if (!r.ok) { cd.vtMsg = [r.error, 'err']; render(); return false; }
      }
    }
    persist(); return true;
  },
  bo: () => { document.querySelectorAll('#vtBang [data-vtten]').forEach(inp => { const v = dmVT().find(x => x.id === inp.dataset.vtten); if (v) inp.value = v.ten; }); }
});
function xeDocForm() { const fm = document.getElementById('xeForm'); if (!fm || !cd.xe.sua) return cd.xe.sua; const x = Object.assign({}, cd.xe.sua); ['bks', 'ngayCapNhat', 'hanKiemDinh', 'hanBaoHiem', 'loaiXe', 'chuXeId'].forEach(k => { if (fm.elements[k]) x[k] = trim(fm.elements[k].value); });
return x; }
const chonChuXeHtml = (v, name) => '<select name="' + (name || 'chuXeId') + '"><option value="">— chưa chọn —</option>' + HAKXeDM.chonChuXe(dmDT()).map(c => '<option value="' + esc(c.id) + '"' + (c.id === v ? ' selected' : '') + '>' + esc(c.nhan) + '</option>').join('') + '</select>';
function panelSetXe() {
  const C = cd.xe, SF = HAKCore.sf, w = foldVi(C.q).split(/\s+/).filter(Boolean), baseDs = dmXE().filter(x => { if (!w.length) return true; const c = HAKXeDM.chuXe(dmDT(), x.chuXeId); const t = foldVi([x.bks, x.loaiXe, c && c.nhan].join(' ')); return w.every(k => t.includes(k)); });
  const hom = todayStr();
  const loaiOpts = [...new Set(dmXE().map(v => trim(v.loaiXe)).filter(Boolean))].sort();
  const sfCfg = {
    screenId: 'dm_xe', title: 'Danh mục xe vận chuyển',
    searchPlaceholder: 'Lọc theo BKS, loại xe, chủ xe…',
    quickFields: ['hanGt'],
    advancedFields: ['q', 'loaiXe', 'hanGt'],
    matchQ: (v, q) => { const c = HAKXeDM.chuXe(dmDT(), v.chuXeId); return SF.hay([v.bks, v.loaiXe, c && c.nhan]).includes(q); },
    fields: [
      {key: 'loaiXe', label: 'Loại xe', type: 'multi', withNone: true, options: loaiOpts, match: (v, vals) => SF.inSet(vals, v.loaiXe)},
      {key: 'hanGt', label: 'Giấy tờ xe', type: 'enum', options: [{value: 'het', label: 'Có giấy tờ hết hạn'}, {value: 'con', label: 'Còn hạn'}], match: (v, val) => { const h = HAKXeDM.hetHan(v, hom).length > 0; return val === 'het' ? h : !h; }}
    ]
  };
  const sfRes = hakSfApply('dm_xe', sfCfg, baseDs), ds = sfRes.rows;
  const sfXeOn = SF.activeCount(hakSfGet('dm_xe', sfCfg).filter.getState()) > 0;
  const x = C.sua;
  const form = !x ? '' : '<form id="xeForm" class="card" style="margin:10px 0"><h3 style="margin:0 0 8px">' + (x.id ? 'Sửa xe ' + esc(x.bks) : 'Thêm xe') + '</h3>' + (C.loi.length ? '<div class="msg err" id="xeLoi">' + C.loi.map(esc).join('<br>') + '</div>' : '') +
    '<div class="grid">' + fld30('ngayCapNhat', 'Ngày cập nhật', x.ngayCapNhat || hom) + fld30('bks', 'Số BKS', x.bks, {req: true, ph: '92C-123.45'}) + fld30('hanKiemDinh', 'Ngày hết hạn kiểm định', x.hanKiemDinh) + fld30('hanBaoHiem', 'Ngày hết hạn bảo hiểm', x.hanBaoHiem) + fld30('loaiXe',
    'Loại xe', x.loaiXe) +
    '<label><span>Chủ xe (người có vai trò Chủ xe hoặc pháp nhân)</span>' + chonChuXeHtml(x.chuXeId) + '</label></div>' +
    '<p class="mut" style="margin:6px 0 0">Chưa có chủ xe trong danh sách? <button type="button" class="btn ghost sm" data-act="openSetDt" data-quaylai="setxe">Mở Danh mục đối tượng</button> (bản đang nhập được giữ để quay lại).</p>' +
    '<div class="row" style="gap:8px;margin-top:12px"><button class="btn" type="submit" id="xeLuu">Lưu</button><button class="btn ghost" type="button" data-act="xeHuy">Hủy</button></div></form>';
  return '<div class="card"><h3 style="margin-top:0">Danh mục xe</h3>' + (cd.msg ? '<div class="msg ' + cd.msg[1] + '" id="xeMsg">' + esc(cd.msg[0]) + '</div>' : '') +
    '<div class="row" style="gap:8px;flex-wrap:wrap;align-items:flex-end"><label style="flex:1;min-width:200px">Tìm<input id="xeQ" value="' + esc(C.q) + '" placeholder="BKS, loại xe, chủ xe"></label><button class="btn" data-act="xeThem" id="xeThem">+ Thêm xe</button>' +
    '<label class="btn ghost" style="cursor:pointer">Nhập Excel<input type="file" accept=".xlsx,.xls" data-xefile="1" hidden></label><button class="btn ghost" data-act="xeMau">Tải file mẫu</button></div>' +
    hakSfBarHtml('dm_xe', sfRes.total, sfRes.kept) + form +
    '<div class="wrap" style="max-height:min(60vh,520px);margin-top:10px"><table id="xeBang"' + (ds.length ? ' style="min-width:760px"' : '') + '><thead><tr><th>Ngày cập nhật</th><th>Số BKS</th><th>Hạn kiểm định</th><th>Hạn bảo hiểm</th><th>Loại xe</th><th>Chủ xe</th><th></th></tr></thead><tbody>' +
    (ds.length ? ds.map(v => { const c = HAKXeDM.chuXe(dmDT(), v.chuXeId), het = HAKXeDM.hetHan(v, hom);
      return '<tr data-xe="' + esc(v.id) + '"><td>' + esc(v.ngayCapNhat) + '</td><td><b>' + esc(v.bks) + '</b></td><td>' + esc(v.hanKiemDinh) + (het.includes('kiểm định') ? ' <span class="pill err">hết hạn</span>' : '') + '</td><td>' + esc(v.hanBaoHiem) + (het.includes('bảo hiểm') ?
      ' <span class="pill err">hết hạn</span>' : '') + '</td><td>' + esc(v.loaiXe) + '</td><td>' + (c ? esc(c.nhan) : '<span class="mut">chưa chọn</span>') + '</td>' +
        '<td><button class="btn ghost sm" data-xesua="' + esc(v.id) + '">Sửa</button></td></tr>'; }).join('') : '<tr><td colspan="7" class="mut" id="xeTrong">' + (C.q || sfXeOn ? 'Không có xe nào khớp bộ lọc.' : 'Chưa có xe nào.') + '</td></tr>') + '</tbody></table></div><p class="mut" style="margin:6px 0 0">' + ds.length + ' xe</p></div>';
}
function xeMo(id) { const v = id ? HAKXeDM.tim(dmXE(), id) : null; cd.xe.sua = v ? Object.assign({}, v) : {id: '', bks: '', ngayCapNhat: todayStr(), hanKiemDinh: '', hanBaoHiem: '', loaiXe: '', chuXeId: ''}; cd.xe.goc = JSON.stringify(cd.xe.sua); cd.xe.loi = []; cd.msg = null; render(); }
async function xeLuu() {
  const x = xeDocForm(), r = HAKXeDM.luu(dmXE(), x, dmDT());
  if (!r.ok) { cd.xe.sua = x; cd.xe.loi = r.errs; render(); return false; }
  db.dmXe = r.dm; cd.xe.sua = null; cd.xe.loi = []; cd.msg = ['Đã lưu xe ' + r.xe.bks + '.', 'ok']; persist(); render(); return true;
}
async function xeExcel(file) {
  try { const rows = await docSheetObj(file); cd.xe.xem = HAKXeDM.docExcel(rows, dmXE(), dmDT()).dong.map(d => Object.assign(d, {chon: d.trangThai === 'moi' || d.trangThai === 'doi'})); xemExcelXe(); }
  catch (e) { cd.msg = ['Không đọc được file: ' + e.message, 'err']; render(); }
}
/* xem trước: sửa trực tiếp BKS, hạn, loại xe, chủ xe của từng dòng; kiểm lại ngay; bỏ chọn dòng không lưu */
function xeXemKiemLai(i) {
  const d = cd.xe.xem[i], ds = dmXE().filter(y => !d.cu || y.id !== d.cu.id), loi = HAKXeDM.kiem(ds, d.xe, dmDT());
  const kb = HAKBks.khoa(d.xe.bks); if (kb && cd.xe.xem.some((e, j) => j !== i && HAKBks.khoa(e.xe.bks) === kb)) loi.push('BKS trùng với dòng khác trong file');
  const cu = HAKXeDM.timBks(dmXE(), d.xe.bks); d.cu = cu ? HAKXeDM.chuan(cu) : null; d.xe.id = cu ? cu.id : '';
  d.loi = loi; d.trangThai = loi.length ? 'loi' : !cu ? 'moi' : JSON.stringify(HAKXeDM.chuan(cu)) === JSON.stringify(HAKXeDM.chuan(d.xe)) ? 'trung' : 'doi';
  const cx = id => { const v = HAKXeDM.chuXe(dmDT(), id); return v ? v.nhan : ''; }; d.chuXeCu = cu ? cx(cu.chuXeId) : ''; d.chuXeMoi = cx(d.xe.chuXeId); d.khacChuXe = !!(cu && cu.chuXeId && d.xe.chuXeId && cu.chuXeId !== d.xe.chuXeId);
  d.chon = d.trangThai === 'moi' || d.trangThai === 'doi';
}
function xemExcelXe() {
  const m = cd.xe.xem || [], dem = k => m.filter(x => x.trangThai === k).length, inp = (i, k, v) => '<input data-xex="' + i + '" data-k="' + k + '" value="' + esc(v) + '" style="width:100%;min-width:90px">';
  $('#impBody').innerHTML = '<h2>Nhập Excel — Danh mục xe</h2><p>Mới: <b>' + dem('moi') + '</b> · Thay đổi: <b>' + dem('doi') + '</b> · Trùng: <b>' + dem('trung') + '</b> · Lỗi: <b>' + dem('loi') + '</b>. Sửa ngay trong bảng hoặc bỏ chọn dòng không lưu.</p>' +
    '<div class="wrap" style="max-height:50vh"><table id="xeXemTbl" style="min-width:880px"><tr><th></th><th>Dòng</th><th>Số BKS</th><th>Hạn kiểm định</th><th>Hạn bảo hiểm</th><th>Loại xe</th><th>Chủ xe</th><th>Trạng thái</th></tr>' +
    m.map((d, i) => '<tr data-tt="' + d.trangThai + '"><td><input type="checkbox" data-xechon="' + i + '"' + (d.chon ? ' checked' : '') + (d.trangThai === 'loi' || d.trangThai === 'trung' ? ' disabled' : '') + '></td><td>' + d.so + '</td><td>' + inp(i, 'bks', d.xe.bks) + '</td><td>' + inp(i,
    'hanKiemDinh', d.xe.hanKiemDinh) + '</td><td>' + inp(i, 'hanBaoHiem', d.xe.hanBaoHiem) + '</td><td>' + inp(i, 'loaiXe', d.xe.loaiXe) + '</td><td>' +
      chonChuXeHtml(d.xe.chuXeId, 'xechu' + i).replace('<select ', '<select data-xex="' + i + '" data-k="chuXeId" ') + (d.khacChuXe ? '<div class="msg warn" style="margin:4px 0 0;padding:4px 8px">Khác chủ xe trong danh mục:<br>đang có: <b>' + esc(d.chuXeCu) + '</b><br>trong file: <b>' +
      esc(d.chuXeMoi) + '</b></div>' : '') + '</td>' +
      '<td><span class="pill ' + TT_XEM[d.trangThai][0] + '">' + TT_XEM[d.trangThai][1] + '</span>' + (d.loi.length ? '<br><small>' + d.loi.map(esc).join('<br>') + '</small>' : '') + '</td></tr>').join('') + '</table></div>' +
    '<div class="row" style="justify-content:flex-end;gap:8px;margin-top:10px"><button class="btn ghost" data-act="impCancel">Hủy</button><button class="btn" data-act="xeExcelLuu" id="xeExcelLuu">Lưu danh mục</button></div>';
  $('#impBox').classList.add('on');
}
function xeExcelLuu() {
  const r = HAKXeDM.apDungExcel(dmXE(), (cd.xe.xem || []).filter(d => d.chon), dmDT());
  $('#impBox').classList.remove('on'); cd.xe.xem = null;
  if (r.them || r.sua) { db.dmXe = r.dm; persist(); }
  cd.msg = ['Đã lưu danh mục xe từ Excel: thêm ' + r.them + ', cập nhật ' + r.sua + '.' + (r.loi.length ? ' Chưa lưu: ' + r.loi.join('; ') : ''), r.loi.length ? 'warn' : 'ok']; render();
}
function xeMau() {
  const h = ['Ngày cập nhật', 'Số BKS', 'Ngày hết hạn kiểm định', 'Ngày hết hạn bảo hiểm', 'Loại xe', 'Chủ xe', 'CCCD / MST chủ xe'], wb = XLSX.utils.book_new(), ws = XLSX.utils.aoa_to_sheet([h, [todayStr(), '92C-123.45', '31/12/2027', '30/06/2027', 'Xe tải', 'LÊ VĂN XE', '049000000077']]);
  Object.keys(ws).filter(k => /^[A-Z]+\d+$/.test(k)).forEach(k => { ws[k].t = 's'; ws[k].z = '@'; }); ws['!cols'] = h.map(x => ({wch: x.length + 4}));
  XLSX.utils.book_append_sheet(wb, ws, 'Xe'); download(new Blob([XLSX.write(wb, {type: 'array', bookType: 'xlsx'})], {type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}), 'Mau_DanhMuc_Xe.xlsx');
}

/* ---------- VỊ TRÍ (ID ổn định; đổi tên giữ liên kết định mức) ---------- */
function panelSetVt() {
  const dung = id => { let n = 0; Object.values(db.rs || {}).forEach(o => Object.values(o.forests || {}).forEach(f => (f.nc || []).forEach(r => { if (r && (r.viTriId === id)) n++; }))); return n; };
  return '<div class="card"><h3 style="margin-top:0">Vị trí công việc</h3>' + (cd.vtMsg ? '<div class="msg ' + cd.vtMsg[1] + '" id="vtMsg">' + esc(cd.vtMsg[0]) + '</div>' : '') +
    '<p class="mut" style="margin-top:0">Vị trí dùng trong Định mức nhân công, định mức bảo hộ lao động, đơn giá theo vị trí và dòng nhân công. Đổi tên ở đây cập nhật mọi bảng đang dùng; hồ sơ đã chốt giữ tên đã áp dụng để in lại đúng.</p>' +
    '<div class="wrap" style="max-height:min(60vh,520px)"><table id="vtBang"><thead><tr><th>Mã</th><th>Tên vị trí</th><th>Đang dùng (dòng nhân công)</th><th></th></tr></thead><tbody>' +
    dmVT().map(v => '<tr><td>' + esc(v.id) + '</td><td><input data-vtten="' + esc(v.id) + '" value="' + esc(v.ten) + '" style="width:100%"></td><td>' + dung(v.id) + '</td><td><button class="btn ghost sm" data-vtdoi="' + esc(v.id) + '">Đổi tên</button></td></tr>').join('') +
    '</tbody></table></div><div class="row" style="gap:8px;margin-top:8px"><input id="vtMoi" placeholder="Tên vị trí mới"><button class="btn ghost" data-act="vtThem">Thêm vị trí</button></div></div>';
}

/* ---------- GIAO DIỆN, HƯỚNG DẪN ---------- */
function panelSetGd() {
  const k = document.documentElement.dataset.skin, dark = document.documentElement.dataset.theme === 'dark';
  return '<div class="card"><h3 style="margin-top:0">Giao diện</h3><div class="row" style="gap:8px;align-items:center"><b>Chế độ</b><button class="btn ghost" data-act="theme" id="themeBtn2">' + (dark ? 'Chế độ sáng' : 'Chế độ tối') + '</button></div>' +
    '<div class="mi-sec" id="skinPick" role="group" aria-label="Bảng màu" style="margin-top:10px">' + '<b>Bảng màu</b>' + SKINS.map(([id, label, c]) => '<button class="skinbtn' + (id === k ? ' on' : '') + '" data-skinpick="' + id + '" aria-pressed="' + (id === k) + '"><span class="sw">' +
    c.map(x => '<i style="background:' + x + '"></i>').join('') + '</span>' + esc(label) + '</button>').join('') + '</div></div>';
}
function panelSetHd() {
  return '<div class="card"><h3 style="margin-top:0">Hướng dẫn</h3><div class="row" style="gap:8px;flex-wrap:wrap"><button class="btn" data-act="guide" id="hdSuDung">Hướng dẫn sử dụng</button><button class="btn ghost" data-act="hdHien" id="hdHienBtn">Hướng dẫn bắt đầu</button></div>' +
    '<p class="mut">Phím tắt: Ctrl+K tìm kiếm; Ctrl+S lưu dữ liệu vào lô đang mở.</p></div>';
}
/* ---------- CẦN ĐỐI CHIẾU (dữ liệu chuyển đổi hoặc gộp chưa tự liên kết được) ---------- */
const CAN_LOAI = {nhancong: 'Nhân công', phieu: 'Phiếu cân', nguoi: 'Người (danh mục)', doituong: 'Đối tượng (danh mục)', hdvc: 'Hợp đồng vận chuyển', xe: 'Xe vận chuyển'};
function panelSetCan() {
  const ds = (db.canDoiChieu || []).map(c => Object.assign({noi: 'Danh mục'}, c));
  Object.entries(db.rs || {}).forEach(([oid, o]) => Object.values(o.forests || {}).forEach(f => (f.canDoiChieu || []).forEach(c => ds.push(Object.assign({noi: 'Rừng ' + ((f.info || {}).maRung || f.id), oid, fid: f.id}, c)))));
  return '<div class="card"><h3 style="margin-top:0">Cần đối chiếu</h3><p class="mut" style="margin-top:0">Các dòng phần mềm <b>không tự liên kết</b> khi chuyển dữ liệu hoặc gộp hồ sơ từ máy khác (không xác định được duy nhất). Dữ liệu gốc giữ nguyên; xử lý ở Danh mục hoặc trong hợp đồng của rừng rồi bấm Đã xử lý.</p>' +
    (ds.length ? '<div class="wrap" style="max-height:min(60vh,520px)"><table id="canBang"><thead><tr><th>Nơi</th><th>Loại</th><th>Lý do</th><th></th></tr></thead><tbody>' + ds.map((c, i) => '<tr><td>' + esc(c.noi) + '</td><td>' + esc(CAN_LOAI[c.loai] || c.loai) + '</td><td>' + esc(c.lyDo) + '</td><td style="white-space:nowrap">' +
      (c.fid ? '<button class="btn ghost sm" data-canmo="' + esc(c.oid + '|' + c.fid + '|' + (c.loai === 'xe' || c.loai === 'phieu' || c.loai === 'hdvc' ? 'dx' : 'nc')) + '">Mở rừng</button> ' : '') + '<button class="btn ghost sm" data-canxong="' + esc((c.fid || '') + '|' + c.loai + '|' + c.ref) +
      '">Đã xử lý</button></td></tr>').join('') + '</tbody></table></div>' : '<p id="canTrong">Không còn dòng nào cần đối chiếu.</p>') + '</div>';
}

/* ---------- sự kiện ---------- */
document.addEventListener('click', e => {
  const t = e.target, el = t.closest && t.closest('[data-act],[data-dtsua],[data-dtngung],[data-ngsua],[data-ngbo],[data-xesua],[data-vtdoi],[data-canmo],[data-canxong]'); if (!el) return;
  const a = el.dataset.act;
  if (a === 'roiLuu') return roiXuLy('luu'); if (a === 'roiBo') return roiXuLy('bo'); if (a === 'roiTiep') return roiXuLy('tiep');
  if (a === 'dlgDong') return dlgDong();
  if (a === 'dtThem') return dtMo(null); if (a === 'dtHuy') { cd.sua = null; cd.loi = []; return render(); } if (a === 'dtMau') return dtMau();
  if (a === 'dtExcelLuu') return dtExcelLuu(); if (a === 'xeExcelLuu') return xeExcelLuu();
  if (a === 'ngThem') { cd.sua = dtDocForm(); return ngMo(null); }
  if (a === 'xeThem') return xeMo(null); if (a === 'xeHuy') { cd.xe.sua = null; cd.xe.loi = []; return render(); } if (a === 'xeMau') return xeMau();
  if (a === 'vtThem') { const v = trim(($('#vtMoi') || {}).value || ''); if (!v) { cd.vtMsg = ['Nhập tên vị trí.', 'warn']; return render(); } if (HAKViTri.tim(dmVT(), v)) { cd.vtMsg = ['Đã có vị trí “' + v + '”.', 'warn']; return render(); } if (!Array.isArray(db.dmViTri)) db.dmViTri = []; HAKViTri.them(db.dmViTri, v);
  cd.vtMsg = ['Đã thêm vị trí “' + v + '”.', 'ok']; persist(); return render(); }
  if (el.dataset.dtsua) return dtMo(el.dataset.dtsua);
  if (el.dataset.dtngung) { const o = HAKDoiTuong.tim(dmDT(), el.dataset.dtngung); const r = HAKDoiTuong.ngung(dmDT(), o.id, !o.ngung); if (r.ok) { db.dmDoiTuong = r.dm; persist(); cd.msg = [(o.ngung ? 'Dùng lại ' : 'Ngừng sử dụng ') + o.ten + '.', 'ok']; } return render(); }
  if (el.dataset.ngsua) { cd.sua = dtDocForm(); return ngMo(+el.dataset.ngsua); }
  if (el.dataset.ngbo) { cd.sua = dtDocForm(); const p = cd.sua.nguoi[+el.dataset.ngbo]; if (!confirm('Bỏ ' + p.hoTen + ' khỏi đối tượng này? (Hồ sơ rừng đã chụp thông tin người này không đổi.)')) return; cd.sua.nguoi = cd.sua.nguoi.filter((_, i) => i !== +el.dataset.ngbo); return render(); }
  if (el.dataset.xesua) return xeMo(el.dataset.xesua);
  if (el.dataset.vtdoi) { const id = el.dataset.vtdoi, inp = document.querySelector('[data-vtten="' + id + '"]'), r = HAKViTri.doiTen(db, id, inp ? inp.value : '');
  cd.vtMsg = r.ok ? ['Đã đổi tên vị trí: cập nhật ' + r.so.dinhBien + ' dòng định biên, ' + r.so.dinhMuc + ' định mức BHLĐ, ' + r.so.donGia + ' đơn giá, ' + r.so.nhanCong + ' dòng nhân công' + (r.so.loKhoa ? '; ' + r.so.loKhoa +
  ' lô đã chốt giữ tên cũ (định biên, định mức BHLĐ giữ thêm mục tên cũ để in lại đúng)' : '') + '.',
  'ok'] : [r.error, 'err']; if (r.ok) persist(); return render(); }
  if (el.dataset.canmo) { const [oid, fid, ft] = el.dataset.canmo.split('|'); NAV.cur = oid; NAV.curF = fid; NAV.view = 'owner'; NAV.tab = 'rung'; NAV.ftab = ft; return render(); }
  if (el.dataset.canxong) { const [fid, loai, ref] = el.dataset.canxong.split('|'), bo = l => (l || []).filter(c => !(c.loai === loai && c.ref === ref));
    if (fid) { Object.values(db.rs || {}).forEach(o => Object.values(o.forests || {}).forEach(f => { if (f.id === fid) { if (loKhoa(f)) { note('Chưa đánh dấu Đã xử lý: lô ' + ((f.info || {}).maRung || f.id) + ' đã ' + (f.dung ? 'dừng' : 'chốt') + ' (chỉ đọc).', 'err'); return; } f.canDoiChieu = bo(f.canDoiChieu); persistLo(f); } })); } else { db.canDoiChieu = bo(db.canDoiChieu); persist(); } return render(); }
});
document.addEventListener('submit', e => {
  const id = e.target && e.target.id; if (!['dtForm', 'ngForm', 'xeForm'].includes(id)) return; e.preventDefault();
  if (id === 'dtForm') return dtLuu(); if (id === 'ngForm') return ngLuu(e.target); if (id === 'xeForm') return xeLuu();
});
document.addEventListener('change', e => {
  const t = e.target; if (!t) return;
  if (t.id === 'dtNhom') { cd.nhom = t.value; return render(); }
  if (t.id === 'dtLoai') { cd.sua = Object.assign(dtDocForm(), {loai: t.value}); return render(); }
  if (t.dataset && t.dataset.dtfile && t.files && t.files[0]) { const f = t.files[0]; t.value = ''; return dtExcel(f); }
  if (t.dataset && t.dataset.xefile && t.files && t.files[0]) { const f = t.files[0]; t.value = ''; return xeExcel(f); }
  if (t.dataset && t.dataset.dtxem != null) { cd.dtXem[+t.dataset.dtxem].chon = t.checked; return; }
  if (t.dataset && t.dataset.xechon != null) { cd.xe.xem[+t.dataset.xechon].chon = t.checked; return; }
  if (t.dataset && t.dataset.xex != null) { const i = +t.dataset.xex; cd.xe.xem[i].xe[t.dataset.k] = trim(t.value); xeXemKiemLai(i); return xemExcelXe(); }
});
document.addEventListener('input', e => {
  const t = e.target; if (!t) return;
  if (t.id === 'dtQ') { cd.q = t.value; clearTimeout(cd._tq); cd._tq = setTimeout(() => { render(); const q = document.getElementById('dtQ'); if (q) { q.focus(); q.setSelectionRange(q.value.length, q.value.length); } }, 250); }
  if (t.id === 'xeQ') { cd.xe.q = t.value; clearTimeout(cd._tx); cd._tx = setTimeout(() => { render(); const q = document.getElementById('xeQ'); if (q) { q.focus(); q.setSelectionRange(q.value.length, q.value.length); } }, 250); }
});
document.addEventListener('keydown', e => { if (e.key === 'Escape') { const b = document.getElementById('dlgBox'); if (b && b.classList.contains('on')) { e.preventDefault(); if (roiCho) roiXuLy('tiep'); else dlgDong(); } } });
