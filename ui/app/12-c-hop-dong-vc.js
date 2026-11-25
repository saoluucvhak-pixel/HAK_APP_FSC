const dmDoiTacAll = () => {
  const dt = doiTacKyVC(), ids = new Set(dt.map(x => x && x.id));
  return [...dt, ...(db.dmDoiTac || []).filter(d => d && !ids.has(d.id))];
};
const dmVC = () => dmDoiTacAll().filter(x => x && x.loai === 'doanhnghiep').sort((a, b) => String(a.ten).localeCompare(String(b.ten), 'vi'));
const dmCaNhan = () => dmDoiTacAll().filter(x => x && x.loai !== 'doanhnghiep').sort((a, b) => String(a.ten).localeCompare(String(b.ten), 'vi'));
const doiTacCua = h => h && h.donViId ? HAKDanhMuc.timDoiTac(dmDoiTacAll(), h.donViId) : null;
const cuocText = (rec, h) => { const t = transportPrice(vcInfo(rec, h)); return (t.loi ? '<span class="pill err">' + esc(t.loi) + '</span>' : esc(fmt(t.gia) + ' đ/tấn')) + (h.cuoc ? ' <span class="pill">riêng</span>' : ' <span class="mut">(cước chung)</span>'); };
function panelHdvc(rec) {
  if (!rec.hdvc) return '';
  const F = {dx: rec.dx, hdvc: rec.hdvc}, list = HAKModel.hdOrder(F), gs = groupsDX(rec), gOf = h => gs.find(g => g.hd === h);
  const sel = list.find(h => h.id === NAV.curHd) || null;
  const tenDoi = (h, k) => trim(h.ten) || 'Đội xe ' + (k + 1);
  const ky = h => { if (h.donViId) return esc((h.ben || {}).ten || '(đơn vị)') + ' <span class="mut">(' + esc(vaiTroDV(h.ben)) + ')</span>'; const g = gOf(h); return g ? esc(g.ten || '') + ' <span class="mut">(' + esc(g.vaiTro) + ')</span>' : '<span class="mut">chưa có xe</span>'; };
  const row = (h, k) => '<tr class="' + (sel && sel.id === h.id ? 'sel' : '') + '" data-act="chonHd" data-hd="' + esc(h.id) + '" style="cursor:pointer"><td><b>' + esc(tenDoi(h,
  k)) + '</b>' + (sel && sel.id === h.id ? ' <span class="pill">đang chọn</span>' : '') + '</td><td>' + ky(h) + '</td><td style="text-align:center">' + HAKModel.xeOf(F, h).length + '</td><td>' + cuocText(rec, h) + '</td><td>' + esc((h.exp || {}).soVC || '') + (h.exp && h.exp.soVC ? '' :
  ' <span class="mut">(số chung)</span>') + '</td></tr>';
  const dv = dmVC();
  let html = '<div class="card" id="hdvcKT"><div class="row" style="justify-content:space-between"><h3 style="margin:0">Đội xe và hợp đồng vận chuyển: ' + list.length + ' đội xe (' + list.length + ' hợp đồng)</h3>' +
    '<span class="row"><input id="hdMoiTen" placeholder="Tên đội xe mới" style="width:180px"><button class="btn ghost sm" data-act="themHd">+ Thêm đội xe</button></span></div>' +
    '<p class="mut" style="margin:6px 0">Mỗi <b>đội xe</b> ký một hợp đồng vận chuyển (như đội khai thác). Người ký của đội: một chủ xe / tài xế trong đội, hoặc một <b>doanh nghiệp</b> trong danh mục. Xe mới chưa chọn đội: vào đội xe đang chọn; chưa chọn đội thì mỗi người ký một đội như trước. Chọn đội xe của từng xe ở cột “Đội xe”.</p>' +
    (list.length ? '<div class="wrap"><table class="normTbl" style="min-width:0;table-layout:auto"><thead><tr><th>Đội xe</th><th>Người ký</th><th>Số xe</th><th>Cước</th><th>Số HĐ</th></tr></thead><tbody>' + list.map(row).join('') + '</tbody></table></div>' : '<p class="mut">Chưa có đội xe: thêm xe (tay, Excel hoặc chọn từ danh mục xe) hoặc thêm đội xe.</p>') +
    '<p class="mut" style="margin:6px 0 0">Người ký là đối tượng có quyền ký Vận chuyển trong Danh mục đối tượng' + (dv.length ? ' (' + dv.length + ' pháp nhân)' : '') + '.</p>';
  if (hdMo('dx') && sel) html = '<div class="card" id="hdvcKT">';   // 3.0 trang chi tiết: danh sách đội xe ở trang danh sách
  if (sel) {
    const k = list.indexOf(sel), c = sel.cuoc || {}, mode = c.mode || ((rec.info.vanChuyen || {}).mode) || 'tanKm', e = sel.exp || {}, xe = HAKModel.xeOf(F, sel).length;
    const dtNow = doiTacCua(sel), doi = !!(dtNow && ['ten', 'mst', 'daiDien', 'chucVu', 'diaChi', 'sdt', 'cccd', 'ngaySinh', 'ngayCap', 'noiCap'].some(k => trim(dtNow[k] || '') !== trim((sel.ben || {})[k] || '')));   // so các trường in trên hợp đồng
    const ppl = HAKModel.signersOf(F, sel), cur = sel.donViId ? 'd:' + HAKDanhMuc.chuanDoiTacId(sel.donViId) : 'p:' + sel.key;
    const opts = ppl.map(x => '<option value="p:' + esc(x.key) + '"' + ('p:' + x.key === cur ? ' selected' : '') + '>' + esc(x.ten + ' · ' + x.vaiTro + ' xe ' + x.bienSo) + '</option>').join('') + dv.map(d => '<option value="d:' + esc(d.id) + '"' + ('d:' + d.id === cur ? ' selected' : '') + '>' +
    esc(d.ten + (d.daiDien ? ' (đại diện: ' + d.daiDien + ')' : '') + ' · pháp nhân (Danh mục đối tượng)') + '</option>').join('') + dmCaNhan().map(d => '<option value="d:' + esc(d.id) + '"' + ('d:' + d.id === cur ? ' selected' : '') + '>' + esc((d.doiTuongTen && d.doiTuongTen !== d.ten ?
    d.doiTuongTen + ' — ' : '') + d.ten + (d.cccd ? ' · CCCD ' + d.cccd : '') + ' · người ký (Danh mục đối tượng)') + '</option>').join('');
    html += '<form id="hdForm" class="grid" style="margin-top:10px;border-top:1px solid var(--line,#ddd);padding-top:10px"><h4 class="sro">' + esc(tenDoi(sel, k)) + ': hợp đồng vận chuyển</h4>' +
      (doi ? '<div class="msg warn" style="grid-column:1/-1">Danh mục đối tượng đã sửa thông tin của bên này sau khi chọn: hợp đồng vẫn in thông tin lúc chọn. <button class="btn ghost sm" type="button" data-act="hdCapNhatDv">Cập nhật theo danh mục</button></div>' : '') +
      '<label><span>Tên đội xe</span><input name="ten" value="' + esc(sel.ten || '') + '"></label>' +
      '<label><span>Người ký hợp đồng của đội</span><input type="search" id="kyLoc" placeholder="Gõ tên, CCCD hoặc biển số để lọc…" autocomplete="off" aria-label="Lọc người ký"><span class="row" style="gap:6px;flex-wrap:nowrap"><select name="ky" style="flex:1">' + (opts || '<option value="">— đội chưa có xe, chưa có đơn vị trong danh mục —</option>') + '</select><button type="button" class="btn ghost sm" data-act="kyThemNhanh" id="kyThemNhanh">+ Thêm người ký</button></span><small class="mut" id="hdKyHuongDan">Thêm xe ở tab “Xe và tài xế”, hệ thống sẽ tự động đưa Chủ xe / Tài xế vào danh sách chọn người ký.</small></label>' +
      '<label style="grid-column:1/-1"><span><input type="checkbox" name="rieng"' + (sel.cuoc ? ' checked' : '') + '> Cước riêng cho đội xe này (bỏ chọn = dùng cước chung của lô)</span></label>' +
      '<label><span>Cách tính</span><select name="vcMode">' + vcOptions(mode) + '</select></label>' +
      '<label><span>Đơn giá cố định (đồng/tấn)</span><input name="vcCoDinh" value="' + esc(c.coDinh ?? '') + '"></label>' +
      '<label><span>Đơn giá tấn/km (đồng/tấn/km)</span><input name="vcKm" value="' + esc(c.donGiaKm ?? '') + '"></label>' +
      '<label><span>Vận chuyển từ ngày</span><input name="vcTu" value="' + esc(c.tuNgay ?? '') + '"></label>' +
      '<div class="row" style="grid-column:1/-1"><button class="btn sro" type="submit" tabindex="-1" aria-hidden="true">Lưu</button>' + (!xe ? '<button class="btn danger sm" type="button" data-act="xoaHd">Xóa đội xe</button>' : '') + '</div></form>';
  }
  return html + '</div>';
}
/* Số và ngày văn bản của đội xe đang chọn, sửa trong mục riêng. */
function panelHdvcVB(rec) {
  if (!rec.hdvc) return '';
  const sel = HAKModel.hdOrder({dx: rec.dx, hdvc: rec.hdvc}).find(h => h.id === NAV.curHd); if (!sel) return '';
  const e = sel.exp || {}, k = HAKModel.hdOrder({dx: rec.dx, hdvc: rec.hdvc}).indexOf(sel), ten = trim(sel.ten) || 'Đội xe ' + (k + 1);
  const o = (n, lb) => '<label><span>' + lb + '</span><input name="' + n + '" value="' + esc(e[n] || '') + '"></label>';
  return '<div class="card" id="hdVB"><h4 style="margin:0 0 6px">Số và ngày văn bản của ' + esc(ten) + ' <span class="mut" style="font-weight:400">· để trống thì dùng số chung của lô</span></h4><form id="hdVbForm" class="grid">' +
    o('soVC', 'Số HĐ vận chuyển (trống = số chung của lô)') + o('vcChiPhi', 'Chi phí khác (trống = chung)') + o('pcSo', 'Số biên bản xác nhận KL (trống = chung)') + o('pcNgay', 'Ngày lập xác nhận KL (trống = chung)') +
    '<button class="sro" type="submit" tabindex="-1" aria-hidden="true">Lưu</button></form></div>';
}
function dvForm(d) {
  d = d || {};
  const f = (k, l) => '<label><span>' + l + '</span><input name="' + k + '" value="' + esc(d[k] || '') + '"></label>';
  return '<form id="dvForm" class="grid" style="margin-top:6px"><input type="hidden" name="dvId" value="' + esc(d.id || '') + '"><h4 style="grid-column:1/-1;margin:0">' + (d.id ? 'Sửa đơn vị' : 'Thêm doanh nghiệp vận chuyển') + '</h4>' +
    f('ten', 'Tên doanh nghiệp') + f('mst', 'Mã số thuế') + f('diaChi', 'Địa chỉ trụ sở') + f('daiDien', 'Người đại diện') + f('chucVu', 'Chức vụ') + f('sdt', 'Điện thoại') +
    '<div class="row" style="grid-column:1/-1"><button class="btn" type="submit">Lưu vào danh mục</button></div></form>';
}
/* cột Đội xe của bảng xe: lô có từ 2 đội xe (không trong bản nháp) chọn đội ngay tại dòng */
function hdCell(rec, r) {
  if (!rec.hdvc) return '';
  const F = {dx: rec.dx, hdvc: rec.hdvc}, list = HAKModel.hdOrder(F), h = HAKModel.hdOf(F, r), ix = (rec.dx || []).indexOf(r);
  const tenDoi = x => trim(x.ten) || (x.donViId ? (x.ben || {}).ten || '' : '') || 'Đội xe ' + (list.indexOf(x) + 1);
  if (list.length < 2 || stCur() || ix < 0) return h ? esc(tenDoi(h)) : '';
  return '<select data-xehd="' + ix + '">' + list.map(x => '<option value="' + esc(x.id) + '"' + (h === x ? ' selected' : '') + '>' + esc(tenDoi(x)) + '</option>').join('') + '</select>';
}
