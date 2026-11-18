/* ========== Công ty mua hàng: MỘT hồ sơ công ty (phần mềm dùng cho một công ty) + địa chỉ giao theo từng rừng (src/muahang.js) ========== */
const MH = HAKMuaHang;
const cty = {edit: null, tried: false, msg: null};                           // màn hình hồ sơ công ty
const mh = {fid: '', open: false, addrId: '', msg: null};                    // chọn địa chỉ giao ở tab Vận chuyển (theo rừng đang mở)
/* Hồ sơ công ty duy nhất lưu ở db.congTy (bảng companies); nếu dữ liệu cũ có nhiều bản thì dùng bản đầu theo tên. Mọi lô dùng chung hồ sơ này. */
const theCompany = () => Object.values(db.congTy || {}).sort((a, b) => (a.ten || '').localeCompare(b.ten || '', 'vi'))[0] || null;
const addrRowHtml = a => '<div class="ctyAddr row" style="margin-top:6px" data-aid="' + esc(a.id) + '"><input name="a_nhan" placeholder="Nhãn (vd: Kho cảng)" value="' + esc(a.nhan) + '" style="flex:1 1 160px"><input name="a_dia" placeholder="Địa chỉ giao hàng" value="' + esc(a.diaChi) +
'" style="flex:3 1 280px"><input name="a_toado" placeholder="Tọa độ: vĩ độ, kinh độ" title="Dán từ Google Maps, vd 15.912345, 108.123456; dùng để tự tính cự ly vận chuyển" value="' + esc(HAKCuLy.fmtToaDo(a.lat,
a.lng)) + '" style="flex:1 1 170px"><button type="button" class="btn danger sm" data-act="ctyDelAddr">Xóa</button></div>';
function ctyForestsUsing() { const c = theCompany(); return c ? Object.values(db.rs).reduce((n, o) => n + forestList(o).filter(f => f.info.muaHang && f.info.muaHang.congTyId === c.id).length, 0) : 0; }
function panelCty() {
  const c = cty.edit || theCompany() || MH.newCompany(), m = cty.msg; cty.msg = null; cty.edit = c;
  const f = (k, label, o = {}) => '<label' + (o.wide ? ' style="grid-column:1/-1"' : '') + '><span class="' + (o.req ? 'req' : '') + '">' + label + '</span><input name="' + k + '" value="' + esc(c[k] ?? '') + '"' + (o.ph ? ' placeholder="' + esc(o.ph) + '"' : '') + '></label>';
  return '<div class="hero"><div><h2>Công ty mua hàng</h2><p class="mut">Khai một lần cho cả phần mềm. Mỗi rừng chỉ chọn <b>địa chỉ giao hàng</b> của công ty này ở <b>tab Vận chuyển</b>; địa chỉ đó là địa điểm vận chuyển đến trong BM-04, BM-09, BM-10 và Sổ phiếu cân.' +
    (theCompany() ? ' ' + ctyForestsUsing() + ' rừng đã chọn địa chỉ giao.' : '') + '</p></div></div>' + (m ? '<div class="msg ' + m.kind + '">' + esc(m.text) + '</div>' : '') +
    '<div class="card" id="ctyCard"><form id="ctyForm" class="grid">' +
    f('ten', 'Tên pháp lý', {req: true, wide: true}) + f('mst', 'Mã số thuế', {ph: '10 hoặc 13 chữ số'}) + f('diaChi', 'Địa chỉ công ty', {req: true, wide: true}) +
    '<label><span>Tọa độ trụ sở (vĩ độ, kinh độ)</span><input name="toaDo" value="' + esc(HAKCuLy.fmtToaDo(c.lat, c.lng)) + '" placeholder="VD: 15.912345, 108.123456 (dán từ Google Maps)"><small class="mut">Tùy chọn. Có tọa độ nơi giao thì phần mềm tự tính cự ly vận chuyển từ rừng đến đây.</small></label>' +
    f('nguoiDaiDien', 'Người đại diện') + f('nguoiLap', 'Người lập biểu', {ph: 'khai một lần; dùng cho nhật ký, Sổ in, chốt hồ sơ, báo cáo'}) + f('chucVu', 'Chức vụ') + f('sdt', 'Số điện thoại') + f('fax', 'Fax', {ph: 'tùy chọn; in ở tiêu đề phiếu cân'}) + f('noiLap', 'Nơi lập chứng từ', {
    ph: 'VD: Đà Nẵng; in trước ngày tháng năm trên phiếu cân'}) + f('email', 'Email') +
    '<div style="grid-column:1/-1"><div class="mut">Địa chỉ giao hàng khác (kho, nhà máy…). Khi chọn điểm đến cho rừng, địa chỉ công ty luôn là lựa chọn đầu tiên, sau đó là các địa chỉ này.</div><div id="ctyAddrs">' + (c.diaChiGiao || []).map(addrRowHtml).join('') + '</div>' +
      '<button type="button" class="btn ghost sm" style="margin-top:6px" data-act="ctyAddAddr">+ Thêm địa chỉ giao hàng</button></div>' +
    '<div id="ctyMsg" style="grid-column:1/-1"></div><div style="grid-column:1/-1" class="row"><button class="btn" type="submit">Lưu thông tin công ty</button></div></form></div>';
}
function ctyReadForm() {
  const form = $('#ctyForm'), fd = new FormData(form), c = {...(cty.edit || MH.newCompany())};
  ['ten', 'mst', 'diaChi', 'nguoiDaiDien', 'nguoiLap', 'chucVu', 'sdt', 'fax', 'noiLap', 'email'].forEach(k => { c[k] = fd.get(k) ?? ''; });
  const td = HAKCuLy.parseToaDo(fd.get('toaDo')); c.lat = td ? td.lat : null; c.lng = td ? td.lng : null; c.toaDoSai = String(fd.get('toaDo') || '').trim() && !td ? String(fd.get('toaDo')).trim() : '';
  c.diaChiGiao = [...form.querySelectorAll('.ctyAddr')].map(r => { const raw = r.querySelector('[name=a_toado]').value, t = HAKCuLy.parseToaDo(raw);
  return {id: r.dataset.aid || '', nhan: r.querySelector('[name=a_nhan]').value, diaChi: r.querySelector('[name=a_dia]').value, lat: t ? t.lat : null, lng: t ? t.lng : null, toaDoSai: raw.trim() && !t ? raw.trim() : ''}; });
  return MH.clean(c, newId);
}
/* tọa độ gõ sai dạng không được lặng lẽ bỏ: báo như lỗi chặn lưu */
function ctyGeoErrors(c) { const e = []; if (c.toaDoSai) e.push('Tọa độ trụ sở “' + c.toaDoSai + '” sai dạng (vd 15.912345, 108.123456; vĩ độ trước, kinh độ sau)');
(c.diaChiGiao || []).forEach((a, i) => { if (a.toaDoSai) e.push('Tọa độ địa chỉ giao thứ ' + (i + 1) + ' “' + a.toaDoSai + '” sai dạng (vd 15.912345, 108.123456)'); }); return e; }
function ctyShowMsg() {
  const box = $('#ctyMsg'); if (!box || !$('#ctyForm')) return;
  const c = ctyReadForm(), v = MH.validate(c, {}, c.id); v.errors.push(...ctyGeoErrors(c));
  box.innerHTML = (cty.tried && v.errors.length ? '<div class="msg err">Chưa lưu: ' + v.errors.map(esc).join('; ') + '</div>' : '') + (v.warnings.length ? '<div class="msg warn">' + v.warnings.map(esc).join('<br>') + '</div>' : '');
  return v;
}
function ctySave() {
  const c = ctyReadForm(); c.id = c.id || (theCompany() || {}).id || newId('c');
  const v = MH.validate(c, {}, c.id), ge = ctyGeoErrors(c); delete c.toaDoSai;
  if (v.errors.length || ge.length) { cty.tried = true; ctyShowMsg(); return; }
  db.congTy = {[c.id]: c}; persist();                       // một hồ sơ duy nhất
  cty.edit = null;
  cty.msg = {kind: v.warnings.length ? 'warn' : 'ok', text: 'Đã lưu thông tin công ty “' + c.ten + '”.' + (v.warnings.length ? ' Lưu ý: ' + v.warnings.join('; ') : '') + (ctyForestsUsing() ?
  ' Các rừng đã chọn địa chỉ GIỮ địa chỉ đã lưu cho đến khi bạn xác nhận cập nhật ở tab Vận chuyển của từng rừng.' : '')};
  render();
}

