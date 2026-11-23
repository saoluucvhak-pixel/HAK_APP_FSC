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
const NHOM_DT = [['tatca', 'Tất cả'], ['doitac', 'Có quyền ký hợp đồng'], ['nhancong', 'Nhân công'], ['taixe', 'Tài xế'], ['chuxe', 'Chủ xe'], ['ngung', 'Ngừng sử dụng']];
const kyChon = k => k.vanChuyen && k.nhanCong ? 'ca' : k.vanChuyen ? 'vc' : k.nhanCong ? 'nc' : '';
const kyTu = v => ({vanChuyen: v === 'vc' || v === 'ca', nhanCong: v === 'nc' || v === 'ca'});
const selKy = (name, v) => '<select name="' + name + '">' + [['', 'Không'], ['vc', 'Vận chuyển'], ['nc', 'Nhân công'], ['ca', 'Cả hai']].map(([k, t]) => '<option value="' + k + '"' + (k === v ? ' selected' : '') + '>' + t + '</option>').join('') + '</select>';
const fld30 = (name, label, v, o) => { o = o || {};
return '<label' + (o.wide ? ' style="grid-column:1/-1"' : '') + '><span' + (o.req ? ' class="req"' : '') + '>' + label + '</span><input name="' + name + '" value="' + esc(v == null ? '' : v) + '"' + (o.ph ? ' placeholder="' + esc(o.ph) + '"' : '') + ' autocomplete="off"></label>'; };
banNhapUI.push({ten: 'Hồ sơ đối tượng đang sửa', dirty: () => !!cd.sua && !!document.getElementById('dtForm') && JSON.stringify(dtDocForm()) !== cd.goc, luu: () => dtLuu(), bo: () => { cd.sua = null; cd.loi = []; }});
/* thể nhân MỘT lớp: tối đa một người → form "Thêm cá nhân" gom thông tin người ngay trong form; nhiều hơn một người (dữ liệu cũ) → giữ bảng con để sửa đủ mọi người */
const dtMot = x => !!x && x.loai !== 'phapnhan' && (x.nguoi || []).length <= 1;
const cb30 = (k, t, o) => '<label style="flex-direction:row;align-items:center;gap:6px"><input type="checkbox" name="' + k + '"' + (o ? ' checked' : '') + '> ' + t + '</label>';
function dtDocForm() {
  const fm = document.getElementById('dtForm'); if (!fm || !cd.sua) return cd.sua;
  const g = n => (fm.elements[n] ? fm.elements[n].value : ''), c = n => !!(fm.elements[n] && fm.elements[n].checked), x = Object.assign({}, cd.sua);
  ['ma', 'ten', 'mst', 'diaChi', 'sdt', 'daiDien', 'chucVuDaiDien'].forEach(k => { if (fm.elements[k]) x[k] = trim(g(k)); });
  if (fm.elements.kyHD) x.kyHD = kyTu(g('kyHD'));
  if (document.getElementById('nganhPn')) { const a = HAKNganh.dsNganh(db).filter(n => c('ngpn_' + n.id)).map(n => n.id); if (a.length) x.nganh = a; else delete x.nganh; }
  if (fm.elements.hoTen) {   // thể nhân một lớp: người duy nhất đọc từ chính form; tên đối tượng mặc định là họ tên; địa chỉ, SĐT dùng chung đối tượng và người
    const cu = (cd.sua.nguoi || [])[0] || {}, p = Object.assign({}, cu, {hoTen: g('hoTen'), cccd: g('cccd'), ngayCap: g('ngayCap'), noiCap: g('noiCap'), hanCccd: g('hanCccd'), gioiTinh: g('gioiTinh'), ngaySinh: g('ngaySinh'), gplx: g('gplx'), hanGplx: g('hanGplx'), viTriId: g('viTriId'), chucDanhKy: g('chucDanhKy'),
      diaChi: x.diaChi, sdt: x.sdt, vaiTro: {nhanCong: c('vtNhanCong'), taiXe: c('vtTaiXe'), chuXe: c('vtChuXe')}, kyHD: {vanChuyen: c('kyVC'), nhanCong: c('kyNC')}});
    cvDocForm(fm, p);
    ['hoTen', 'cccd', 'ngayCap', 'noiCap', 'hanCccd', 'ngaySinh', 'gplx', 'hanGplx', 'chucDanhKy'].forEach(k => { p[k] = trim(p[k]); });
    x.nguoi = [p]; x.ten = x.ten || p.hoTen; x.loai = 'thenhan';
  }
  return x;
}
/* cấu hình Smart Filter của Danh mục đối tượng (tách riêng để kiểm bằng unit): "Nhóm" là trường chọn nhanh, kết quả GIỐNG HỆT HAKDoiTuong.loc;
 * chữ tìm khớp theo từng từ (mọi từ phải có) trên cùng các cột như HAKDoiTuong.loc. */
function dtSfCfg() {
  const SF = HAKCore.sf;
  return {
    screenId: 'dm_doi_tuong', title: 'Danh mục đối tượng',
    searchPlaceholder: 'Tìm theo tên, mã, MST, CCCD, SĐT…',
    quickFields: ['nhom', 'q', 'loai', 'thieuCccd'],
    advancedFields: ['q', 'nhom', 'loai', 'vaiTro', 'kyHd', 'thieuCccd', 'ngung'],
    matchQ: (o, q) => { const h = SF.hay([o.ma, o.ten, o.mst, o.sdt, o.diaChi].concat((o.nguoi || []).flatMap(p => [p.hoTen, p.cccd, p.sdt, p.gplx]))); return q.split(/\s+/).filter(Boolean).every(w => h.includes(w)); },
    fields: [
      {key: 'nhom', label: 'Nhóm', type: 'enum', options: NHOM_DT.filter(([k]) => k !== 'tatca').map(([k, t]) => ({value: k, label: t})), match: (o, v) => HAKDoiTuong.loc([o], v, '').length === 1},
      {key: 'loai', label: 'Loại', type: 'enum', options: [{value: 'thenhan', label: 'Thể nhân'}, {value: 'phapnhan', label: 'Pháp nhân'}], match: (o, v) => o.loai === v},
      {key: 'vaiTro', label: 'Chức vụ', type: 'multi', options: [{value: 'nhanCong', label: 'Nhân công'}, {value: 'taiXe', label: 'Tài xế'}, {value: 'chuXe', label: 'Chủ xe'}], match: (o, vals) => (o.nguoi || []).some(p => p.vaiTro && vals.some(k => p.vaiTro[k]))},
      {key: 'kyHd', label: 'Quyền ký HĐ', type: 'multi', options: [{value: 'nhanCong', label: 'Ký Nhân công'}, {value: 'vanChuyen', label: 'Ký Vận chuyển'}], match: (o, vals) => vals.some(k => (o.kyHD && o.kyHD[k]) || (o.nguoi || []).some(p => p.kyHD && p.kyHD[k]))},
      {key: 'thieuCccd', label: 'Chưa có CCCD', type: 'bool', match: o => o.loai !== 'phapnhan' && (o.nguoi || []).some(p => !trim(p.cccd))},
      {key: 'ngung', label: 'Đang ngừng sử dụng', type: 'bool', match: o => !!o.ngung}
    ]
  };
}
/* dòng gốc trước Smart Filter: đối tượng đang dùng, hoặc đã ngừng khi chọn nhóm “Ngừng sử dụng” (như HAKDoiTuong.loc) */
const dtGoc = st => HAKDoiTuong.loc(dmDT(), st.one.nhom || (st.flag.ngung ? 'ngung' : 'tatca'), '');
/* nhận chữ tìm / nhóm do tìm kiếm chung (Ctrl+K) đặt vào cd rồi chuyển sang bộ lọc (một lần) */
function dtNhanTuTim(screenId, cfg, giu) {
  if (!giu.q) return;
  const inst = hakSfGet(screenId, cfg); inst.filter.reset();
  inst.filter.setState(HAKCore.sf.normalize(Object.assign({}, inst.filter.getState(), {q: giu.q}), cfg)); giu.q = '';
}
function panelSetDt() {
  const SF = HAKCore.sf, sfCfg = dtSfCfg();
  dtNhanTuTim('dm_doi_tuong', sfCfg, cd);
  const baseDs = dtGoc(hakSfGet('dm_doi_tuong', sfCfg).filter.getState());
  const sfRes = hakSfApply('dm_doi_tuong', sfCfg, baseDs);
  const sfOn = SF.activeCount(hakSfGet('dm_doi_tuong', sfCfg).filter.getState()) > 0;
  const ds = sfRes.rows, x = cd.sua;
  const bang = '<div class="wrap" id="dtWrap" style="max-height:min(60vh,520px)"><table id="dtBang"' + (ds.length ? ' style="min-width:860px"' : '') + '><thead><tr><th>Mã</th><th>Tên đối tượng</th><th>Loại</th><th>MST</th><th>Địa chỉ</th><th>SĐT</th><th>Ký hợp đồng</th><th>Người · chức vụ</th><th></th></tr></thead><tbody>' +
    (ds.length ? ds.map(o => '<tr data-dt="' + esc(o.id) + '"><td>' + esc(o.ma) + '</td><td><b>' + esc(o.ten) + '</b></td><td>' + HAKDoiTuong.LOAI[o.loai] + '</td><td>' + esc(o.mst) + '</td><td>' + esc(o.diaChi) + '</td><td>' + esc(o.sdt) + '</td><td>' +
      esc(o.loai === 'phapnhan' ? HAKDoiTuong.kyText(o.kyHD) : HAKDoiTuong.kyText({vanChuyen: (o.nguoi || []).some(p => p.kyHD && p.kyHD.vanChuyen), nhanCong: (o.nguoi || []).some(p => p.kyHD && p.kyHD.nhanCong)})) + '</td><td>' +
      (o.nguoi || []).map(p => esc(p.hoTen) + Object.keys(HAKDoiTuong.VAI_TRO).filter(k => p.vaiTro && p.vaiTro[k]).map(k => ' <span class="pill" data-vai="' + k + '">' + esc(HAKDoiTuong.VAI_TRO[k]) + '</span>').join('')).join('<br>') + '</td>' +
      '<td style="white-space:nowrap"><button class="btn ghost sm" data-dtsua="' + esc(o.id) + '">Sửa</button> <button class="btn ghost sm" data-dtngung="' + esc(o.id) + '">' + (o.ngung ? 'Dùng lại' : 'Ngừng') + '</button></td></tr>').join('')
      : '<tr><td colspan="9" class="mut" id="dtTrong">Không có đối tượng nào' + (sfOn ? ' khớp bộ lọc' : '') + '.</td></tr>') + '</tbody></table></div>';
  const mot = dtMot(x), p0 = mot ? ((x.nguoi || [])[0] || {hoTen: '', vaiTro: {}, kyHD: {}}) : null, pn = !!x && x.loai === 'phapnhan';
  const tieuDe = !x ? '' : x.id ? 'Sửa ' + (pn ? 'doanh nghiệp ' : mot ? 'cá nhân ' : 'đối tượng ') + esc(x.ma) : pn ? 'Thêm doanh nghiệp' : 'Thêm cá nhân';
  const khoiMot = !mot ? '' : fld30('hoTen', 'Họ tên', p0.hoTen, {req: true}) + fld30('cccd', 'Số CCCD', p0.cccd) + fld30('ngayCap', 'Ngày cấp (dd/mm/yyyy)', p0.ngayCap) + fld30('noiCap', 'Nơi cấp', p0.noiCap) + fld30('hanCccd', 'Hạn CCCD', p0.hanCccd) +
    fld30('ngaySinh', 'Ngày sinh', p0.ngaySinh) + '<label><span>Giới tính</span><select name="gioiTinh"><option></option><option' + (p0.gioiTinh === 'Nam' ? ' selected' : '') + '>Nam</option><option' + (p0.gioiTinh === 'Nữ' ? ' selected' : '') + '>Nữ</option></select></label>' +
    fld30('diaChi', 'Địa chỉ thường trú', p0.diaChi || x.diaChi) + fld30('sdt', 'Số điện thoại', p0.sdt || x.sdt) + fld30('gplx', 'Số giấy phép lái xe', p0.gplx) + fld30('hanGplx', 'Hạn GPLX', p0.hanGplx) +
    '<label><span>Vị trí mặc định</span><select name="viTriId"><option value="">—</option>' + dmVT().filter(v => !v.ngung || v.id === p0.viTriId).map(v => '<option value="' + esc(v.id) + '"' + (v.id === p0.viTriId ? ' selected' : '') + '>' + esc(v.ten) + '</option>').join('') + '</select></label>' +
    fld30('chucDanhKy', 'Chức danh khi ký (nếu có)', p0.chucDanhKy);
  const form = !x ? '' : '<form id="dtForm" class="card" style="margin:10px 0"><h3 style="margin:0 0 8px">' + tieuDe + '</h3>' +
    (cd.loi.length ? '<div class="msg err" id="dtLoi">' + cd.loi.map(esc).join('<br>') + '</div>' : '') +
    '<div class="grid">' + (mot ? khoiMot : '') + fld30('ma', 'Mã đối tượng (trống: tự cấp)', x.ma) + fld30('ten', mot ? 'Tên đối tượng (trống: lấy theo họ tên; điền nếu là hộ kinh doanh, tổ…)' : pn ? 'Tên doanh nghiệp' : 'Tên đối tượng', mot && trim(x.ten) === trim(p0.hoTen) ? '' : x.ten, {req: !mot}) +
    fld30('mst', 'Mã số thuế', x.mst) + (mot ? '' : fld30('diaChi', pn ? 'Địa chỉ trụ sở' : 'Địa chỉ thường trú', x.diaChi) + fld30('sdt', 'Số điện thoại', x.sdt)) +
    (pn ? '<label><span>Ký hợp đồng</span>' + selKy('kyHD', kyChon(x.kyHD || {})) + '</label>' + fld30('daiDien', 'Người đại diện', x.daiDien) + fld30('chucVuDaiDien', 'Chức danh người đại diện', x.chucVuDaiDien) : '') + '</div>' + (pn ? ngPnFormHtml(x) : '') +
    (mot ? '<div class="row" style="gap:14px;flex-wrap:wrap;margin-top:8px"><b>Chức vụ:</b>' + cb30('vtNhanCong', 'Nhân công', p0.vaiTro && p0.vaiTro.nhanCong) + cb30('vtTaiXe', 'Tài xế', p0.vaiTro && p0.vaiTro.taiXe) + cb30('vtChuXe', 'Chủ xe', p0.vaiTro && p0.vaiTro.chuXe) + '</div>' + cvFormHtml(p0) +
      '<div class="row" style="gap:14px;flex-wrap:wrap;margin-top:6px"><b>Quyền ký hợp đồng:</b>' + cb30('kyVC', 'Vận chuyển', p0.kyHD && p0.kyHD.vanChuyen) + cb30('kyNC', 'Nhân công', p0.kyHD && p0.kyHD.nhanCong) + '</div>' : '') +
    (!pn && !mot ? '<h4 style="margin:12px 0 6px">Thông tin cá nhân (đối tượng có nhiều người)</h4><div class="wrap" style="max-height:260px"><table id="dtNguoiTbl" style="min-width:720px"><thead><tr><th>Họ tên</th><th>CCCD</th><th>SĐT</th><th>Chức vụ</th><th>Ký hợp đồng</th><th>Vị trí mặc định</th><th></th></tr></thead><tbody>' +
      x.nguoi.map((p, i) => '<tr><td><b>' + esc(p.hoTen) + '</b></td><td>' + esc(p.cccd) + '</td><td>' + esc(p.sdt) + '</td><td>' + esc(HAKDoiTuong.vaiText(p.vaiTro)) + '</td><td>' + esc(HAKDoiTuong.kyText(p.kyHD || {})) + '</td><td>' + esc(ten30(p.viTriId)) + '</td>' +
        '<td style="white-space:nowrap"><button type="button" class="btn ghost sm" data-ngsua="' + i + '">Sửa</button> <button type="button" class="btn ghost sm" data-ngbo="' + i + '">Bỏ</button></td></tr>').join('') +
      '</tbody></table></div><div class="row" style="margin-top:6px"><button type="button" class="btn ghost sm" data-act="ngThem" id="ngThem">+ Thêm người</button></div>' : '') +
    '<div class="row" style="gap:8px;margin-top:12px"><button class="btn" type="submit" id="dtLuu">Lưu</button><button class="btn ghost" type="button" data-act="dtHuy" id="dtHuy">Hủy</button></div></form>';
  return '<div class="card"><h3 style="margin-top:0">Danh mục đối tượng</h3>' + (cd.msg ? '<div class="msg ' + cd.msg[1] + '" id="dtMsg">' + esc(cd.msg[0]) + '</div>' : '') +
    '<p class="mut" style="margin-top:0">Khai báo <b>một lần</b>: cá nhân (một người, khai ngay trong một form) hoặc doanh nghiệp (công ty, ký qua người đại diện). Một người có thể vừa là Nhân công, Tài xế, Chủ xe; quyền ký hợp đồng khai riêng. Hợp đồng chỉ hiện đối tượng phù hợp. Khi chọn vào lô, thông tin được chụp lại: sửa danh mục không đổi lô đã lập.</p>' +
    '<div class="row" style="gap:8px;flex-wrap:wrap;align-items:flex-end">' +
    '<button class="btn" data-act="cnThem" id="cnThem">+ Thêm cá nhân</button><button class="btn ghost" data-act="dnThem" id="dnThem">+ Thêm doanh nghiệp</button><label class="btn ghost" style="cursor:pointer">Nhập Excel<input type="file" accept=".xlsx,.xls" data-dtfile="1" hidden></label><button class="btn ghost" data-act="dtMau">Tải file mẫu</button></div>' +
    hakSfBarHtml('dm_doi_tuong', sfRes.total, sfRes.kept) + form + '<div style="margin-top:10px">' + bang + '</div><p class="mut" style="margin:6px 0 0" id="dtDem">' + ds.length + ' đối tượng</p></div>';
}
function dtMo(id, loai) { const o = id ? HAKDoiTuong.tim(dmDT(), id) : null; cd.sua = o ? JSON.parse(JSON.stringify(o)) : {id: '', ma: '', ten: '', loai: loai === 'phapnhan' ? 'phapnhan' : 'thenhan', kyHD: {}, nguoi: []}; cd.loi = []; cd.msg = null; render();
cd.goc = JSON.stringify(dtDocForm());   // mốc "chưa đổi" lấy từ chính form đã vẽ (cùng cách đọc với lúc kiểm thay đổi)
const f = document.querySelector('#dtForm [name=hoTen]') || document.querySelector('#dtForm [name=ten]'); if (f) f.focus(); }
async function dtLuu() {
  const x = dtDocForm(), le = (x.nguoi || []).reduce((a, p) => a.concat(HAKNganh.kiemNguoi(db, p)), []);
  if (le.length) { cd.sua = x; cd.loi = le; render(); return false; }
  const r = HAKDoiTuong.luu(dmDT(), x, todayStr());
  if (!r.ok) { cd.sua = x; cd.loi = r.errs; render(); return false; }
  db.dmDoiTuong = r.dm; cd.sua = null; cd.loi = []; cd.msg = ['Đã lưu “' + r.dt.ten + '” (mã ' + r.dt.ma + ').' + (r.canhBao.length ? ' Lưu ý: ' + r.canhBao.join('; ') + '.' : ''), r.canhBao.length ? 'warn' : 'ok']; persist(); render(); return true;   // phiếu #05: cảnh báo, không chặn lưu
}
function ngMo(i) {
  const p = i == null ? {hoTen: '', vaiTro: {}, kyHD: {}} : (cd.sua.nguoi || [])[i]; cd.ngSua = i == null ? -1 : i;
  const cb = cb30;
  dlgMo('<form id="ngForm"><h3 style="margin-top:0">' + (i == null ? 'Thêm người' : 'Sửa ' + esc(p.hoTen)) + ' — ' + esc(cd.sua.ten || 'đối tượng mới') + '</h3><div id="ngLoi"></div><div class="grid">' +
    fld30('hoTen', 'Họ tên', p.hoTen, {req: true}) + fld30('cccd', 'Số CCCD', p.cccd) + fld30('ngayCap', 'Ngày cấp (dd/mm/yyyy)', p.ngayCap) + fld30('noiCap', 'Nơi cấp', p.noiCap) + fld30('hanCccd', 'Hạn CCCD', p.hanCccd) +
    fld30('diaChi', 'Địa chỉ thường trú', p.diaChi) + '<label><span>Giới tính</span><select name="gioiTinh"><option></option><option' + (p.gioiTinh === 'Nam' ? ' selected' : '') + '>Nam</option><option' + (p.gioiTinh === 'Nữ' ? ' selected' : '') + '>Nữ</option></select></label>' +
    fld30('ngaySinh', 'Ngày sinh', p.ngaySinh) + fld30('sdt', 'Số điện thoại', p.sdt) + fld30('gplx', 'Số giấy phép lái xe', p.gplx) + fld30('hanGplx', 'Hạn GPLX', p.hanGplx) +
    '<label><span>Vị trí mặc định</span><select name="viTriId"><option value="">—</option>' + dmVT().filter(v => !v.ngung || v.id === p.viTriId).map(v => '<option value="' + esc(v.id) + '"' + (v.id === p.viTriId ? ' selected' : '') + '>' + esc(v.ten) + '</option>').join('') + '</select></label>' +
    fld30('chucDanhKy', 'Chức danh khi ký (nếu có)', p.chucDanhKy) + '</div>' +
    '<div class="row" style="gap:14px;flex-wrap:wrap;margin-top:8px"><b>Chức vụ:</b>' + cb('vtNhanCong', 'Nhân công', p.vaiTro && p.vaiTro.nhanCong) + cb('vtTaiXe', 'Tài xế', p.vaiTro && p.vaiTro.taiXe) + cb('vtChuXe', 'Chủ xe', p.vaiTro && p.vaiTro.chuXe) + '</div>' + cvFormHtml(p) +
    '<div class="row" style="gap:14px;flex-wrap:wrap;margin-top:6px"><b>Ký hợp đồng:</b>' + cb('kyVC', 'Vận chuyển', p.kyHD && p.kyHD.vanChuyen) + cb('kyNC', 'Nhân công', p.kyHD && p.kyHD.nhanCong) + '</div>' +
    '<div class="row" style="gap:8px;justify-content:flex-end;margin-top:12px"><button class="btn" type="submit" id="ngLuu">Lưu người</button><button class="btn ghost" type="button" data-act="dlgDong">Hủy</button></div></form>');
}
function ngLuu(fm) {
  const g = n => trim((fm.elements[n] || {}).value || ''), c = n => !!(fm.elements[n] && fm.elements[n].checked), cu = cd.ngSua >= 0 ? cd.sua.nguoi[cd.ngSua] : {};
  const p = Object.assign({}, cu, {hoTen: g('hoTen'), cccd: g('cccd'), ngayCap: g('ngayCap'), noiCap: g('noiCap'), hanCccd: g('hanCccd'), diaChi: g('diaChi'), gioiTinh: g('gioiTinh'), ngaySinh: g('ngaySinh'), sdt: g('sdt'), gplx: g('gplx'), hanGplx: g('hanGplx'), viTriId: g('viTriId'), chucDanhKy: g('chucDanhKy'),
    vaiTro: {nhanCong: c('vtNhanCong'), taiXe: c('vtTaiXe'), chuXe: c('vtChuXe')}, kyHD: {vanChuyen: c('kyVC'), nhanCong: c('kyNC')}});
  cvDocForm(fm, p); { const le = HAKNganh.kiemNguoi(db, p); if (le.length) { document.getElementById('ngLoi').innerHTML = '<div class="msg err">' + le.map(esc).join('<br>') + '</div>'; return; } }
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
/* ô đang sửa của một dòng vị trí: tên, nhiệm vụ, ghi chú (cột Vị trí / Nhiệm vụ / Ghi chú) */
const vtDocDong = inp => { const id = inp.dataset.vtten, tr = inp.closest('tr'), g = k => { const e = tr && tr.querySelector('[' + k + '="' + id + '"]'); return e ? trim(e.value) : null; }; return {id, ten: trim(inp.value), nhiemVu: g('data-vtnv'), ghiChu: g('data-vtgc')}; };
const vtKhac = (d, v) => !!v && ((d.ten && d.ten !== trim(v.ten)) || (d.nhiemVu != null && d.nhiemVu !== trim(v.nhiemVu)) || (d.ghiChu != null && d.ghiChu !== trim(v.ghiChu)));
/* lưu một dòng: đổi tên (một lần cho mọi bảng) rồi nhiệm vụ / ghi chú; trả {ok, error, doiTen} */
function vtLuuDong(d) {
  const v = HAKViTri.timId(dmVT(), d.id); if (!v) return {ok: false, error: 'Không có vị trí này'};
  let rt = null; if (d.ten && d.ten !== trim(v.ten)) { rt = HAKViTri.doiTen(db, d.id, d.ten); if (!rt.ok) return rt; }
  HAKViTri.sua(dmVT(), d.id, {nhiemVu: d.nhiemVu == null ? v.nhiemVu : d.nhiemVu, ghiChu: d.ghiChu == null ? v.ghiChu : d.ghiChu}); return {ok: true, doiTen: rt};
}
banNhapUI.push({
  ten: 'Vị trí đang sửa',
  dirty: () => NAV.view === 'setvt' && [...document.querySelectorAll('#vtBang [data-vtten]')].some(inp => vtKhac(vtDocDong(inp), dmVT().find(x => x.id === inp.dataset.vtten))),
  luu: () => {
    for (const inp of document.querySelectorAll('#vtBang [data-vtten]')) {
      const d = vtDocDong(inp), v = dmVT().find(x => x.id === d.id);
      if (vtKhac(d, v)) { const r = vtLuuDong(d); if (!r.ok) { cd.vtMsg = [r.error, 'err']; render(); return false; } }
    }
    persist(); return true;
  },
  bo: () => { document.querySelectorAll('#vtBang [data-vtten]').forEach(inp => { const v = dmVT().find(x => x.id === inp.dataset.vtten); if (v) { inp.value = v.ten; const tr = inp.closest('tr'), n = tr.querySelector('[data-vtnv]'), g = tr.querySelector('[data-vtgc]'); if (n) n.value = v.nhiemVu || ''; if (g) g.value = v.ghiChu || ''; } }); }
});
function xeDocForm() { const fm = document.getElementById('xeForm'); if (!fm || !cd.xe.sua) return cd.xe.sua; const x = Object.assign({}, cd.xe.sua); ['bks', 'ngayCapNhat', 'hanKiemDinh', 'hanBaoHiem', 'loaiXe', 'chuXeId', 'taiXeId'].forEach(k => { if (fm.elements[k]) x[k] = trim(fm.elements[k].value); });
if (!x.taiXeId && !('taiXeId' in cd.xe.sua)) delete x.taiXeId;   // xe chưa có tài xế: không thêm khóa rỗng (không làm “đang sửa dở” giả)
return x; }
const chonChuXeHtml = (v, name) => '<select name="' + (name || 'chuXeId') + '"><option value="">— chưa chọn —</option>' + HAKXeDM.chonChuXe(dmDT()).map(c => '<option value="' + esc(c.id) + '"' + (c.id === v ? ' selected' : '') + '>' + esc(c.nhan) + '</option>').join('') + '</select>';
const chonTaiXeHtml = v => '<select name="taiXeId"><option value="">— chưa chọn —</option>' + HAKXeDM.chonTaiXe(dmDT()).filter(c => { const x = HAKDoiTuong.timNguoi(dmDT(), c.id); return !x || c.id === v || HAKNganh.hopNganh(db, x.dt, x.ng, HAKNganh.VC); }).map(c => '<option value="' + esc(c.id) + '"' + (c.id === v ? ' selected' : '') + '>' + esc(c.nhan) + '</option>').join('') + '</select>';
function panelSetXe() {
  const C = cd.xe, SF = HAKCore.sf;
  const hom = todayStr();
  const loaiOpts = [...new Set(dmXE().map(v => trim(v.loaiXe)).filter(Boolean))].sort();
  const sfCfg = {
    screenId: 'dm_xe', title: 'Danh mục xe vận chuyển',
    searchPlaceholder: 'Lọc theo BKS, loại xe, chủ xe, tài xế…',
    quickFields: ['q', 'hanGt'],
    advancedFields: ['q', 'loaiXe', 'hanGt'],
    matchQ: (v, q) => { const c = HAKXeDM.chuXe(dmDT(), v.chuXeId), tx = HAKXeDM.taiXe(dmDT(), v.taiXeId), h = SF.hay([v.bks, v.loaiXe, c && c.nhan, tx && tx.nhan]); return q.split(/\s+/).filter(Boolean).every(w => h.includes(w)); },
    fields: [
      {key: 'loaiXe', label: 'Loại xe', type: 'multi', withNone: true, options: loaiOpts, match: (v, vals) => SF.inSet(vals, v.loaiXe)},
      {key: 'hanGt', label: 'Giấy tờ xe', type: 'enum', options: [{value: 'het', label: 'Có giấy tờ hết hạn'}, {value: 'con', label: 'Còn hạn'}], match: (v, val) => { const h = HAKXeDM.hetHan(v, hom).length > 0; return val === 'het' ? h : !h; }}
    ]
  };
  dtNhanTuTim('dm_xe', sfCfg, C);
  const sfRes = hakSfApply('dm_xe', sfCfg, dmXE()), ds = sfRes.rows;
  const sfXeOn = SF.activeCount(hakSfGet('dm_xe', sfCfg).filter.getState()) > 0;
  const x = C.sua;
  const form = !x ? '' : '<form id="xeForm" class="card" style="margin:10px 0"><h3 style="margin:0 0 8px">' + (x.id ? 'Sửa xe ' + esc(x.bks) : 'Thêm xe') + '</h3>' + (C.loi.length ? '<div class="msg err" id="xeLoi">' + C.loi.map(esc).join('<br>') + '</div>' : '') +
    '<div class="grid">' + fld30('ngayCapNhat', 'Ngày cập nhật', x.ngayCapNhat || hom) + fld30('bks', 'Số BKS', x.bks, {req: true, ph: '92C-123.45'}) + fld30('hanKiemDinh', 'Ngày hết hạn kiểm định', x.hanKiemDinh) + fld30('hanBaoHiem', 'Ngày hết hạn bảo hiểm', x.hanBaoHiem) + fld30('loaiXe',
    'Loại xe', x.loaiXe) +
    '<label><span>Chủ xe (người có chức vụ Chủ xe hoặc pháp nhân)</span>' + chonChuXeHtml(x.chuXeId) + '</label>' +
    '<label><span>Tài xế thường chạy (người có chức vụ Tài xế)</span>' + chonTaiXeHtml(x.taiXeId) + '</label></div>' +
    '<p class="mut" style="margin:6px 0 0">Tài xế là chức vụ của người trong Danh mục đối tượng.</p>' +
    '<p class="mut" style="margin:6px 0 0">Chưa có chủ xe hoặc tài xế trong danh sách? <button type="button" class="btn ghost sm" data-act="openSetDt" data-quaylai="setxe">Mở Danh mục đối tượng</button> (bản đang nhập được giữ để quay lại).</p>' +
    '<div class="row" style="gap:8px;margin-top:12px"><button class="btn" type="submit" id="xeLuu">Lưu</button><button class="btn ghost" type="button" data-act="xeHuy">Hủy</button></div></form>';
  return '<div class="card"><h3 style="margin-top:0">Danh mục xe</h3>' + (cd.msg ? '<div class="msg ' + cd.msg[1] + '" id="xeMsg">' + esc(cd.msg[0]) + '</div>' : '') +
    '<div class="row" style="gap:8px;flex-wrap:wrap;align-items:flex-end"><button class="btn" data-act="xeThem" id="xeThem">+ Thêm xe</button>' +
    '<label class="btn ghost" style="cursor:pointer">Nhập Excel<input type="file" accept=".xlsx,.xls" data-xefile="1" hidden></label><button class="btn ghost" data-act="xeMau">Tải file mẫu</button></div>' +
    hakSfBarHtml('dm_xe', sfRes.total, sfRes.kept) + form +
    '<div class="wrap" style="max-height:min(60vh,520px);margin-top:10px"><table id="xeBang"' + (ds.length ? ' style="min-width:860px"' : '') + '><thead><tr><th>Ngày cập nhật</th><th>Số BKS</th><th>Hạn kiểm định</th><th>Hạn bảo hiểm</th><th>Loại xe</th><th>Chủ xe</th><th>Tài xế</th><th></th></tr></thead><tbody>' +
    (ds.length ? ds.map(v => { const c = HAKXeDM.chuXe(dmDT(), v.chuXeId), tx = HAKXeDM.taiXe(dmDT(), v.taiXeId), het = HAKXeDM.hetHan(v, hom);
      return '<tr data-xe="' + esc(v.id) + '"><td>' + esc(v.ngayCapNhat) + '</td><td><b>' + esc(v.bks) + '</b></td><td>' + esc(v.hanKiemDinh) + (het.includes('kiểm định') ? ' <span class="pill err">hết hạn</span>' : '') + '</td><td>' + esc(v.hanBaoHiem) + (het.includes('bảo hiểm') ?
      ' <span class="pill err">hết hạn</span>' : '') + '</td><td>' + esc(v.loaiXe) + '</td><td>' + (c ? esc(c.nhan) : '<span class="mut">chưa chọn</span>') + '</td><td>' + (tx ? esc(tx.nhan) : '<span class="mut">chưa chọn</span>') + '</td>' +
        '<td><button class="btn ghost sm" data-xesua="' + esc(v.id) + '">Sửa</button></td></tr>'; }).join('') : '<tr><td colspan="8" class="mut" id="xeTrong">' + (sfXeOn ? 'Không có xe nào khớp bộ lọc.' : 'Chưa có xe nào.') + '</td></tr>') + '</tbody></table></div><p class="mut" style="margin:6px 0 0">' + ds.length + ' xe</p></div>';
}
function xeMo(id) { const v = id ? HAKXeDM.tim(dmXE(), id) : null; cd.xe.sua = v ? Object.assign({}, v) : {id: '', bks: '', ngayCapNhat: todayStr(), hanKiemDinh: '', hanBaoHiem: '', loaiXe: '', chuXeId: '', taiXeId: ''}; cd.xe.goc = JSON.stringify(cd.xe.sua); cd.xe.loi = []; cd.msg = null; render(); }
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
/* Smart Filter của Vị trí: chỉ lọc dòng HIỂN THỊ (tên/mã), không đổi danh mục */
function vtSfCfg() {
  const SF = HAKCore.sf;
  return {
    screenId: 'dm_vi_tri', title: 'Vị trí công việc',
    searchPlaceholder: 'Tìm theo tên, nhiệm vụ hoặc ghi chú…',
    quickFields: ['q'], advancedFields: ['q'], fields: [],
    matchQ: (v, q) => { const h = SF.hay([v.ten, v.id, v.nhiemVu, v.ghiChu]); return q.split(/\s+/).filter(Boolean).every(w => h.includes(w)); }
  };
}
/* danh mục trống hoàn toàn (cài mới): gieo sẵn vài vị trí để chọn, một lần mỗi phiên (xóa hết rồi thì không gieo lại trong phiên này) */
let vtDaGieo = false;
function vtGieoSan() { if (vtDaGieo) return; vtDaGieo = true; if (Array.isArray(db.dmViTri) && !db.dmViTri.length && HAKViTri.gieoSan(db.dmViTri)) persist(); }
/* ---------- Ngành nghề và chức vụ (PR B) ---------- */
const nvDS = k => (k === 'dmNganh' ? HAKNganh.dsNganh(db) : HAKNganh.dsChucVu(db));
function nvGhiSan() { ['dmNganh', 'dmChucVu'].forEach(k => { if (!Array.isArray(db[k]) || !db[k].length) db[k] = nvDS(k).map(x => Object.assign({}, x)); }); }
function panelSetNv() {
  const ng = nvDS('dmNganh'), cv = nvDS('dmChucVu'), nut = (a, k, id, t) => '<button class="btn ghost sm" data-act="' + a + '" data-nv="' + k + '|' + esc(id) + '">' + t + '</button> ';
  const optNg = (cur, ro) => '<option value="">— chọn khi nhập người —</option>' + ng.filter(n => !n.ngung || n.id === cur).map(n => '<option value="' + esc(n.id) + '"' + (n.id === cur ? ' selected' : '') + '>' + esc(n.ten) + '</option>').join('');
  return '<div class="card"><h3 style="margin-top:0">Ngành nghề</h3>' + (cd.nvMsg ? '<div class="msg ' + cd.nvMsg[1] + '" id="nvMsg">' + esc(cd.nvMsg[0]) + '</div>' : '') +
    '<p class="mut" style="margin-top:0">Ngành nghề dùng để lọc Bên nhận khoán, nhân công, bên vận chuyển và tài xế. Một doanh nghiệp được chọn cả hai ngành. Mục đang được dùng không xóa hẳn mà chuyển sang “Ngừng sử dụng”.</p>' +
    '<div class="wrap"><table id="nvNganh"><thead><tr><th>Ngành nghề</th><th>Đang dùng</th><th><span class="sro">Thao tác</span></th></tr></thead><tbody>' +
    ng.map(n => '<tr data-nvrow="' + esc(n.id) + '"' + (n.ngung ? ' class="mut"' : '') + '><td><input data-nvten="dmNganh|' + esc(n.id) + '" value="' + esc(n.ten) + '" style="width:100%" aria-label="Tên ngành nghề">' + (n.ngung ? '<span class="pill">Ngừng sử dụng</span>' : '') + '</td><td>' + (HAKNganh.dangDungNganh(db, n.id) || 'Chưa dùng') + '</td><td style="white-space:nowrap">' +
      nut('nvDoi', 'dmNganh', n.id, 'Lưu') + (n.ngung ? nut('nvDung', 'dmNganh', n.id, 'Dùng lại') : '') + nut('nvXoa', 'dmNganh', n.id, n.ngung ? 'Xóa' : 'Xóa / Ngừng') + '</td></tr>').join('') +
    '</tbody></table></div><div class="row" style="gap:8px;margin-top:8px;align-items:flex-end;flex-wrap:wrap"><label><span>Tên ngành nghề mới</span><input id="nvMoiNg" placeholder="Tên ngành nghề mới"></label><button class="btn" data-act="nvThemNg" id="nvThemNg">Thêm ngành nghề</button></div></div>' +
    '<div class="card"><h3 style="margin-top:0">Chức vụ</h3><p class="mut" style="margin-top:0">Chức vụ gắn với ngành mặc định. Chức vụ không có ngành (như “Khác”) thì khi nhập người phải chọn ngành. “Tổ trưởng” trong lô vẫn là chữ ở cột Chức vụ của dòng nhân công.</p>' +
    '<div class="wrap"><table id="nvChucVu"><thead><tr><th>Chức vụ</th><th>Ngành mặc định</th><th>Đang dùng</th><th><span class="sro">Thao tác</span></th></tr></thead><tbody>' +
    cv.map(c => '<tr data-nvrow="' + esc(c.id) + '"' + (c.ngung ? ' class="mut"' : '') + '><td><input data-nvten="dmChucVu|' + esc(c.id) + '" value="' + esc(c.ten) + '" style="width:100%" aria-label="Tên chức vụ">' + (c.ngung ? '<span class="pill">Ngừng sử dụng</span>' : '') + '</td><td><select data-nvng="dmChucVu|' + esc(c.id) + '" aria-label="Ngành mặc định">' + optNg(c.nganh) + '</select></td><td>' + (HAKNganh.dangDungChucVu(db, c.id) || 'Chưa dùng') + '</td><td style="white-space:nowrap">' +
      nut('nvDoi', 'dmChucVu', c.id, 'Lưu') + (c.ngung ? nut('nvDung', 'dmChucVu', c.id, 'Dùng lại') : '') + nut('nvXoa', 'dmChucVu', c.id, c.ngung ? 'Xóa' : 'Xóa / Ngừng') + '</td></tr>').join('') +
    '</tbody></table></div><div class="row" style="gap:8px;margin-top:8px;align-items:flex-end;flex-wrap:wrap"><label><span>Tên chức vụ mới</span><input id="nvMoiCv" placeholder="Tên chức vụ mới"></label><label><span>Ngành mặc định</span><select id="nvMoiCvNg">' + optNg('') + '</select></label><button class="btn" data-act="nvThemCv" id="nvThemCv">Thêm chức vụ</button></div></div>';
}
function nvXuLy(a, el) {
  nvGhiSan(); const kid = el && el.dataset.nv ? el.dataset.nv.split('|') : [], k = kid[0], id = kid[1];
  let r;
  if (a === 'nvThemNg') r = HAKNganh.themNganh(db, ($('#nvMoiNg') || {}).value);
  else if (a === 'nvThemCv') r = HAKNganh.themChucVu(db, ($('#nvMoiCv') || {}).value, ($('#nvMoiCvNg') || {}).value);
  else if (a === 'nvDoi') { const t = document.querySelector('[data-nvten="' + k + '|' + id + '"]'), n = document.querySelector('[data-nvng="' + k + '|' + id + '"]'); r = HAKNganh.doi(db, k, id, t ? t.value : '', n ? n.value : undefined); if (r.ok) r.thongBao = 'Đã lưu.'; }
  else if (a === 'nvDung') { r = HAKNganh.dung(db, k, id, false); if (r.ok) r.thongBao = 'Đã dùng lại.'; }
  else if (a === 'nvXoa') r = HAKNganh.xoa(db, k, id);
  cd.nvMsg = r.ok ? [r.thongBao || 'Đã thêm.', r.kieu === 'ngung' ? 'warn' : 'ok'] : [r.error, 'err']; if (r.ok) persist(); return render();
}
/* chức vụ và ngành trong form người (PR B): giữ ba ô vai trò cũ (mã cũ và e2e cũ vẫn chạy); chức vụ chi tiết cộng thêm, đồng bộ vai trò cũ */
function cvFormHtml(p) {
  const cvs = HAKNganh.dsChucVu(db).filter(c => !c.ngung || (p.chucVu || []).includes(c.id)), ng = HAKNganh.dsNganh(db).filter(n => !n.ngung || (p.nganh || []).includes(n.id));
  return '<div class="row" style="gap:14px;flex-wrap:wrap;margin-top:6px" id="cvChiTiet"><b>Chức vụ chi tiết:</b>' + cvs.map(c => cb30('cv_' + c.id, esc(c.ten), (p.chucVu || []).includes(c.id))).join('') + '</div>' +
    '<div class="row" style="gap:14px;flex-wrap:wrap;margin-top:6px" id="nganhNguoi"><b>Ngành nghề (bắt buộc khi chọn chức vụ “Khác”):</b>' + ng.map(n => cb30('ng_' + n.id, esc(n.ten), (p.nganh || []).includes(n.id))).join('') + '</div>';
}
function cvDocForm(fm, p) {   // ghi chucVu/nganh vào p (chỉ khi không rỗng) và cộng vai trò cũ suy từ chức vụ
  const c = n => !!(fm.elements[n] && fm.elements[n].checked), cvs = HAKNganh.dsChucVu(db).filter(x => c('cv_' + x.id)).map(x => x.id);
  const kc = cvs.some(id => !(HAKNganh.dsChucVu(db).find(x => x.id === id) || {}).nganh), ng = kc ? HAKNganh.dsNganh(db).filter(n => c('ng_' + n.id)).map(n => n.id) : [];
  if (cvs.length) p.chucVu = cvs; else delete p.chucVu; if (ng.length) p.nganh = ng; else delete p.nganh;
  const v = HAKNganh.vaiTroTuChucVu(db, cvs); p.vaiTro = {nhanCong: !!(p.vaiTro && p.vaiTro.nhanCong) || v.nhanCong, taiXe: !!(p.vaiTro && p.vaiTro.taiXe) || v.taiXe, chuXe: !!(p.vaiTro && p.vaiTro.chuXe) || v.chuXe};
  return p;
}
function ngPnFormHtml(x) {
  return '<div class="row" style="gap:14px;flex-wrap:wrap;margin-top:6px" id="nganhPn"><b>Ngành nghề của doanh nghiệp:</b>' + HAKNganh.dsNganh(db).filter(n => !n.ngung || (x.nganh || []).includes(n.id)).map(n => cb30('ngpn_' + n.id, esc(n.ten), (x.nganh || []).includes(n.id))).join('') + '</div>';
}
function panelSetVt() {
  vtGieoSan();
  const sfCfg = vtSfCfg(), sfRes = hakSfApply('dm_vi_tri', sfCfg, dmVT()), ds = sfRes.rows, sfOn = HAKCore.sf.activeCount(hakSfGet('dm_vi_tri', sfCfg).filter.getState()) > 0;
  return '<div class="card"><h3 style="margin-top:0">Vị trí công việc</h3>' + (cd.vtMsg ? '<div class="msg ' + cd.vtMsg[1] + '" id="vtMsg">' + esc(cd.vtMsg[0]) + '</div>' : '') +
    '<p class="mut" style="margin-top:0">Danh mục thêm, sửa, xóa được. Vị trí dùng trong Định mức nhân công, định mức bảo hộ lao động, đơn giá theo vị trí và dòng nhân công. Đổi tên ở đây cập nhật mọi bảng đang dùng; hồ sơ đã chốt giữ tên đã áp dụng để in lại đúng. Vị trí <b>đang được dùng</b> không xóa hẳn mà chuyển sang “Ngừng sử dụng”; vị trí mặc định (Tổ trưởng, Công nhân khai thác, Công nhân cưa) không xóa được.</p>' +
    hakSfBarHtml('dm_vi_tri', sfRes.total, sfRes.kept) +
    '<div class="wrap" style="max-height:min(60vh,520px)"><table id="vtBang"><thead><tr><th>Vị trí</th><th>Nhiệm vụ</th><th>Ghi chú</th><th>Đang dùng</th><th><span class="sro">Thao tác</span></th></tr></thead><tbody>' +
    (ds.length ? '' : '<tr><td colspan="5" class="mut" id="vtTrong">' + (sfOn ? 'Không có vị trí nào khớp bộ lọc.' : 'Chưa có vị trí nào.') + '</td></tr>') +
    ds.map(v => { const d = HAKViTri.dangDung(db, v.id), mac = HAKViTri.MAC_DINH.some(m => HAKViTri.fold(m) === HAKViTri.fold(v.ten));
      return '<tr data-vtrow="' + esc(v.id) + '"' + (v.ngung ? ' class="mut"' : '') + '><td><input data-vtten="' + esc(v.id) + '" value="' + esc(v.ten) + '" style="width:100%" aria-label="Tên vị trí">' + (v.ngung ? '<span class="pill">Ngừng sử dụng</span>' : '') + '</td>' +
      '<td><input data-vtnv="' + esc(v.id) + '" value="' + esc(v.nhiemVu || '') + '" style="width:100%" aria-label="Nhiệm vụ"></td><td><input data-vtgc="' + esc(v.id) + '" value="' + esc(v.ghiChu || '') + '" style="width:100%" aria-label="Ghi chú"></td>' +
      '<td title="' + esc(d.nhanCong + ' dòng nhân công, ' + d.dinhBien + ' bảng định biên, ' + d.dinhMuc + ' bản định mức BHLĐ, ' + d.donGia + ' bảng đơn giá') + '">' + (d.tong ? d.tong : 'Chưa dùng') + '</td>' +
      '<td style="white-space:nowrap"><button class="btn ghost sm" data-vtdoi="' + esc(v.id) + '">Lưu</button> ' + (v.ngung ? '<button class="btn ghost sm" data-vtdung="' + esc(v.id) + '">Dùng lại</button> ' : '') + (mac ? '' : '<button class="btn ghost sm" data-vtxoa="' + esc(v.id) + '">Xóa</button>') + '</td></tr>'; }).join('') +
    '</tbody></table></div><div class="row" style="gap:8px;margin-top:8px;flex-wrap:wrap;align-items:flex-end"><label><span>Tên vị trí mới</span><input id="vtMoi" placeholder="Tên vị trí mới"></label><label style="flex:1;min-width:200px"><span>Nhiệm vụ</span><input id="vtMoiNv" placeholder="Nhiệm vụ (không bắt buộc)"></label><label style="flex:1;min-width:160px"><span>Ghi chú</span><input id="vtMoiGc" placeholder="Ghi chú (không bắt buộc)"></label><button class="btn ghost" data-act="vtThem">Thêm vị trí</button></div></div>';
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
  const t = e.target, el = t.closest && t.closest('[data-act],[data-dtsua],[data-dtngung],[data-ngsua],[data-ngbo],[data-xesua],[data-vtdoi],[data-vtxoa],[data-vtdung],[data-canmo],[data-canxong]'); if (!el) return;
  const a = el.dataset.act;
  if (a === 'roiLuu') return roiXuLy('luu'); if (a === 'roiBo') return roiXuLy('bo'); if (a === 'roiTiep') return roiXuLy('tiep');
  if (a === 'dlgDong') return dlgDong();
  if (/^nv(ThemNg|ThemCv|Doi|Dung|Xoa)$/.test(a || '')) return nvXuLy(a, el);
  if (a === 'cnThem') return dtMo(null, 'thenhan'); if (a === 'dnThem') return dtMo(null, 'phapnhan'); if (a === 'dtHuy') { cd.sua = null; cd.loi = []; return render(); } if (a === 'dtMau') return dtMau();
  if (a === 'dtExcelLuu') return dtExcelLuu(); if (a === 'xeExcelLuu') return xeExcelLuu();
  if (a === 'ngThem') { cd.sua = dtDocForm(); return ngMo(null); }
  if (a === 'xeThem') return xeMo(null); if (a === 'xeHuy') { cd.xe.sua = null; cd.xe.loi = []; return render(); } if (a === 'xeMau') return xeMau();
  if (a === 'vtThem') { const v = trim(($('#vtMoi') || {}).value || ''), nv = trim(($('#vtMoiNv') || {}).value || ''), gc = trim(($('#vtMoiGc') || {}).value || ''); if (!v) { cd.vtMsg = ['Nhập tên vị trí.', 'warn']; return render(); } if (HAKViTri.tim(dmVT(), v)) { cd.vtMsg = ['Đã có vị trí “' + v + '”.', 'warn']; return render(); } if (!Array.isArray(db.dmViTri)) db.dmViTri = []; HAKViTri.them(db.dmViTri, v, nv, gc);
  cd.vtMsg = ['Đã thêm vị trí “' + v + '”.', 'ok']; persist(); return render(); }
  if (el.dataset.vtxoa) { const id = el.dataset.vtxoa, v = HAKViTri.timId(dmVT(), id); if (!v) return; if (!HAKViTri.dangDung(db, id).tong && !confirm('Xóa hẳn vị trí “' + v.ten + '”? Vị trí chưa được dùng ở đâu.')) return;
    const r = HAKViTri.xoa(db, id); cd.vtMsg = [r.ok ? r.thongBao : r.error, r.ok ? (r.kieu === 'ngung' ? 'warn' : 'ok') : 'err']; if (r.ok) persist(); return render(); }
  if (el.dataset.vtdung) { const v = HAKViTri.timId(dmVT(), el.dataset.vtdung); if (v) { v.ngung = false; persist(); cd.vtMsg = ['Dùng lại vị trí “' + v.ten + '”.', 'ok']; } return render(); }
  if (el.dataset.dtsua) return dtMo(el.dataset.dtsua);
  if (el.dataset.dtngung) { const o = HAKDoiTuong.tim(dmDT(), el.dataset.dtngung); const r = HAKDoiTuong.ngung(dmDT(), o.id, !o.ngung); if (r.ok) { db.dmDoiTuong = r.dm; persist(); cd.msg = [(o.ngung ? 'Dùng lại ' : 'Ngừng sử dụng ') + o.ten + '.', 'ok']; } return render(); }
  if (el.dataset.ngsua) { cd.sua = dtDocForm(); return ngMo(+el.dataset.ngsua); }
  if (el.dataset.ngbo) { cd.sua = dtDocForm(); const p = cd.sua.nguoi[+el.dataset.ngbo]; if (!confirm('Bỏ ' + p.hoTen + ' khỏi đối tượng này? (Hồ sơ rừng đã chụp thông tin người này không đổi.)')) return; cd.sua.nguoi = cd.sua.nguoi.filter((_, i) => i !== +el.dataset.ngbo); return render(); }
  if (el.dataset.xesua) return xeMo(el.dataset.xesua);
  if (el.dataset.vtdoi) { const id = el.dataset.vtdoi, inp = document.querySelector('[data-vtten="' + id + '"]'), r = inp ? vtLuuDong(vtDocDong(inp)) : {ok: false, error: 'Không có vị trí này'}, so = r.doiTen && r.doiTen.so;
  cd.vtMsg = r.ok ? (so ? ['Đã lưu vị trí; đổi tên: cập nhật ' + so.dinhBien + ' dòng định biên, ' + so.dinhMuc + ' định mức BHLĐ, ' + so.donGia + ' đơn giá, ' + so.nhanCong + ' dòng nhân công' + (so.loKhoa ? '; ' + so.loKhoa +
  ' lô đã chốt giữ tên cũ (định biên, định mức BHLĐ giữ thêm mục tên cũ để in lại đúng)' : '') + '.', 'ok'] : ['Đã lưu vị trí.', 'ok']) : [r.error, 'err']; if (r.ok) persist(); return render(); }
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
  if (t.dataset && t.dataset.dtfile && t.files && t.files[0]) { const f = t.files[0]; t.value = ''; return dtExcel(f); }
  if (t.dataset && t.dataset.xefile && t.files && t.files[0]) { const f = t.files[0]; t.value = ''; return xeExcel(f); }
  if (t.dataset && t.dataset.dtxem != null) { cd.dtXem[+t.dataset.dtxem].chon = t.checked; return; }
  if (t.dataset && t.dataset.xechon != null) { cd.xe.xem[+t.dataset.xechon].chon = t.checked; return; }
  if (t.dataset && t.dataset.xex != null) { const i = +t.dataset.xex; cd.xe.xem[i].xe[t.dataset.k] = trim(t.value); xeXemKiemLai(i); return xemExcelXe(); }
});
document.addEventListener('keydown', e => { if (e.key === 'Escape') { const b = document.getElementById('dlgBox'); if (b && b.classList.contains('on')) { e.preventDefault(); if (roiCho) roiXuLy('tiep'); else dlgDong(); } } });
