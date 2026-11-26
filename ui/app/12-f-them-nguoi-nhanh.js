/* ========== 3.5.1 / 3.7.1: Hộp “Thêm nhanh” người ký / bên nhận khoán / chủ xe / tài xế ngay tại chỗ (không rời màn đang nhập) ==========
 * Ghi vào Danh mục đối tượng (thể nhân một người) đúng quy tắc HAKDoiTuong.luu rồi tự chọn người vừa thêm:
 *  - ô Người ký của đội xe (hợp đồng vận chuyển): người có quyền ký Vận chuyển;
 *  - ô Bên nhận khoán của đội khai thác (hợp đồng nhân công): người có quyền ký Nhân công;
 *  - form Thêm xe: chủ xe (chức vụ Chủ xe) hoặc tài xế (chức vụ Tài xế, bắt buộc GPLX). */
const qnTen = {kyVC: 'người ký hợp đồng vận chuyển', kyNC: 'bên nhận khoán (ký hợp đồng nhân công)', chuXe: 'chủ xe', taiXe: 'tài xế'};
let qnCtx = null;
function qnMo(vt) {
  qnCtx = {vt}; const f = (n, l, req) => '<label><span' + (req ? ' class="req"' : '') + '>' + l + '</span><input name="' + n + '" autocomplete="off"></label>';
  dlgMo('<form id="qnForm"><h3 style="margin-top:0" id="dlgBoxTitle">Thêm ' + qnTen[vt] + '</h3><p class="mut" style="margin-top:0">Lưu vào Danh mục đối tượng' + (vt === 'kyVC' ? ' (kèm quyền ký Vận chuyển)' : vt === 'kyNC' ? ' (kèm quyền ký Nhân công)' : '') + ' và chọn ngay vào màn đang nhập.</p><div id="qnLoi"></div>' +
    '<div class="grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:10px 14px">' + f('hoTen', 'Họ tên', true) + f('cccd', 'Số CCCD (12 số; CMND 9 số)', true) + f('ngayCap', 'Ngày cấp (dd/mm/yyyy)') + f('noiCap', 'Nơi cấp') + f('sdt', 'Số điện thoại') + f('diaChi', 'Địa chỉ thường trú') +
    (vt === 'taiXe' ? f('gplx', 'Số giấy phép lái xe', true) + f('hanGplx', 'Hạn GPLX (dd/mm/yyyy)') : '') + '</div>' +
    '<div class="row" style="gap:8px;justify-content:flex-end;margin-top:12px"><button class="btn" type="submit" id="qnLuu">💾 Lưu thông tin</button><button class="btn ghost" type="button" data-act="dlgDong" id="qnHuy">Hủy bỏ</button></div></form>');
}
function qnLuu(fm) {
  const g = n => trim((fm.elements[n] || {}).value || ''), vt = qnCtx && qnCtx.vt; if (!vt) return;
  const p = {hoTen: g('hoTen'), cccd: g('cccd'), ngayCap: g('ngayCap'), noiCap: g('noiCap'), sdt: g('sdt'), diaChi: g('diaChi'), gioiTinh: '', ngaySinh: '', hanCccd: '', gplx: g('gplx'), hanGplx: g('hanGplx'),
    vaiTro: {nhanCong: vt === 'kyNC', taiXe: vt === 'taiXe', chuXe: vt === 'chuXe'}, kyHD: {vanChuyen: vt === 'kyVC', nhanCong: vt === 'kyNC'}};
  const loi = m => { document.getElementById('qnLoi').innerHTML = '<div class="msg err">' + m.map(esc).join('<br>') + '</div>'; };
  if (!p.hoTen) return loi(['Thiếu họ tên.']);
  const le = HAKNganh.kiemNguoi(db, p); if (le.length) return loi(le);
  const r = HAKDoiTuong.luu(dmDT(), {id: '', ma: '', ten: p.hoTen, loai: 'thenhan', kyHD: {}, diaChi: p.diaChi, sdt: p.sdt, nguoi: [p]}, todayStr());
  if (!r.ok) return loi(r.errs);
  db.dmDoiTuong = r.dm; persist(); dlgDong();
  const ng = (r.dt.nguoi || [])[0] || {};
  if (vt === 'kyVC' && document.getElementById('stForm') && stm.kyKhacMo) {   // đang ở form Thêm xe, mục “Chỉ định người khác…”: chọn ngay người vừa thêm
    const ct = dmCaNhan().find(d => (p.cccd && HAKModel.cccdSo(d.cccd) === HAKModel.cccdSo(p.cccd)) || trim(d.ten) === p.hoTen);
    if (ct) { stRead(); stm.kyKhac = 'd:' + HAKDanhMuc.chuanDoiTacId(ct.id); stRender(); }
    return;
  }
  if (vt === 'kyVC') {   // chọn ngay vào ô Người ký (không vẽ lại màn: giữ các ô đang nhập)
    const sel = document.querySelector('#hdForm [name=ky]'), ct = dmCaNhan().find(d => (p.cccd && HAKModel.cccdSo(d.cccd) === HAKModel.cccdSo(p.cccd)) || trim(d.ten) === p.hoTen);
    if (sel && ct) { const v = 'd:' + HAKDanhMuc.chuanDoiTacId(ct.id); let o = [...sel.options].find(x => x.value === v);
      if (!o) { o = document.createElement('option'); o.value = v; o.textContent = (ct.ten || '') + (ct.cccd ? ' · CCCD ' + ct.cccd : '') + ' · người ký (Danh mục đối tượng)'; sel.appendChild(o); }
      sel.value = v; sel.dispatchEvent(new Event('change', {bubbles: true})); }
  } else if (vt === 'kyNC') {   // chọn ngay vào ô Bên nhận khoán (hợp đồng nhân công)
    const sel = document.querySelector('select[name=benNK]'), ct = dmCaNhan().find(d => (p.cccd && HAKModel.cccdSo(d.cccd) === HAKModel.cccdSo(p.cccd)) || trim(d.ten) === p.hoTen);
    if (sel && ct) {
      const v = ng && ng.id ? 'ng:' + ng.id : 'dt:' + ct.id;
      let o = [...sel.options].find(x => x.value === v);
      if (!o) { o = document.createElement('option'); o.value = v; o.textContent = (ct.ten || '') + (ct.cccd ? ' · CCCD ' + ct.cccd : '') + ' · Bên nhận khoán (Danh mục)'; sel.appendChild(o); }
      sel.value = v; sel.dispatchEvent(new Event('change', {bubbles: true}));
    }
  } else if (ng.id) {   // form Thêm xe đang mở: điền chủ xe / tài xế vừa thêm
    stRead(); if (vt === 'taiXe') { dxDienTx(ng.id); stm.vals.taiXeId = ng.id; } else dxDienChu(ng.id); stRender();
  }
}
document.addEventListener('click', e => {
  const el = e.target && e.target.closest && e.target.closest('[data-act=kyThemNhanh],[data-act=kyThemNhanhNC],[data-act=dxThemNguoi]'); if (!el) return;
  e.preventDefault();
  const act = el.dataset.act;
  qnMo(act === 'kyThemNhanh' ? 'kyVC' : act === 'kyThemNhanhNC' ? 'kyNC' : el.dataset.vt);
});
document.addEventListener('submit', e => { if (e.target && e.target.id === 'qnForm') { e.preventDefault(); e.stopPropagation(); qnLuu(e.target); } }, true);
/* lọc nhanh khi gõ (typeahead) cho ô Người ký: ẩn các lựa chọn không khớp, giữ lựa chọn đang chọn */
document.addEventListener('input', e => {
  const t = e.target; if (!t) return;
  const sel = t.id === 'kyLoc' ? (t.form && t.form.elements.ky) : t.dataset && t.dataset.locsel ? document.getElementById(t.dataset.locsel) : null; if (!sel) return;
  const fold = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase(), q = fold(t.value).split(/\s+/).filter(Boolean);
  [...sel.options].forEach(o => { o.hidden = !!q.length && o.value !== sel.value && !q.every(w => fold(o.textContent).includes(w)); });
});
/* “+ Thêm xe mới vào danh mục” trong form Thêm xe: lưu ngay xe đang nhập vào Danh mục xe (đúng quy tắc HAKXeDM.luu: BKS không trùng, ngày hợp lệ), chủ xe là người đã chọn ở khối Chủ xe */
document.addEventListener('click', e => {
  const b = e.target && e.target.closest && e.target.closest('[data-act=dxThemXeDm]'); if (!b) return; e.preventDefault();
  const v = stRead(), chuSel = document.getElementById('xeChuDm'), ct = chuSel && chuSel.value ? HAKXeDM.chuXe(dmDT(), chuSel.value) : null;
  const r = HAKXeDM.luu(dmXE(), {id: '', bks: v.bienSo, ngayCapNhat: todayStr(), hanKiemDinh: v.kdDen, hanBaoHiem: v.hanBH, loaiXe: v.loaiXe, chuXeId: ct ? chuSel.value : ''}, dmDT());
  const hien = (kind, text) => { stRender(); const body = document.getElementById('stBody'), h = body && body.querySelector('form'); if (h) { const d = document.createElement('div'); d.className = 'msg ' + kind; d.id = 'dxDmMsg'; d.textContent = text; h.parentNode.insertBefore(d, h); } };
  if (!r.ok) return hien('err', 'Chưa thêm vào Danh mục xe: ' + r.errs.join('; '));
  db.dmXe = r.dm; persist(); hien('ok', 'Đã thêm xe ' + r.xe.bks + ' vào Danh mục xe.');
});
document.addEventListener('click', e => {
  const b = e.target && e.target.closest && e.target.closest('[data-act=dxKyKhacToggle]'); if (!b) return; e.preventDefault();
  stRead(); stm.kyKhacMo = !stm.kyKhacMo; stRender();
});
document.addEventListener('change', e => { const t = e.target; if (t && t.id === 'dxKyKhac') stm.kyKhac = t.value; });
