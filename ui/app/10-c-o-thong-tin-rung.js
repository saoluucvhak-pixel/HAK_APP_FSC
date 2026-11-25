/* Ô Định mức (tấn/ha) của rừng: để trống thì dùng định mức gỗ keo mặc định (hiệu lực theo ngày bắt đầu khai thác); tự điền thì dùng số của rừng */
function dmField(i) {
  const own = typeof i.dinhMucTanHa === 'number' && i.dinhMucTanHa > 0, k = HAKDinhMuc.keoPick(db, i.tuNgay || '');
  const ph = k.found ? 'mặc định ' + fmtTan(k.item.tanHa) + ' tấn/ha' : 'chưa có định mức mặc định';
  const note = own ? 'Đang dùng số riêng của rừng. <button type="button" class="linkbtn" data-act="dmDefault">Dùng mặc định</button>'
    : k.found ? 'Đang dùng định mức gỗ keo mặc định <b>' + fmtTan(k.item.tanHa) + ' tấn/ha</b> (hiệu lực từ ' + (k.item.tuNgay || '…') + '). Tự điền số khác nếu rừng khác định mức.'
    : 'Chưa có định mức mặc định: khai ở <b>Định mức → Định mức gỗ keo</b>, hoặc tự điền số cho rừng.';
  return '<label><span>Định mức (tấn/ha)</span><input name="dinhMucTanHa" data-group-number inputmode="decimal" value="' + esc(displayInputNumber(i.dinhMucTanHa)) + '" placeholder="' + esc(ph) + '"><small class="mut" id="dmNote">' + note + '</small></label>';
}
/* Ô Định mức thời gian khai thác (ngày/ha) của rừng: để trống thì dùng định mức mặc định (hiệu lực theo ngày bắt đầu khai thác) */
function dmTgField(i) {
  const own = typeof i.dinhMucNgayHa === 'number' && i.dinhMucNgayHa > 0, k = HAKDinhMuc.tgPick(db, i.tuNgay || '');
  const ph = k.found ? 'mặc định ' + fmtTan(k.item.ngayHa) + ' ngày/ha' : 'chưa có định mức mặc định';
  const note = own ? 'Đang dùng số riêng của rừng. <button type="button" class="linkbtn" data-act="tgDefault">Dùng mặc định</button>'
    : k.found ? 'Đang dùng định mức mặc định <b>' + fmtTan(k.item.ngayHa) + ' ngày/ha</b> (hiệu lực từ ' + (k.item.tuNgay || '…') + ').' : 'Chưa có định mức mặc định: khai ở <b>Định mức → Định mức thời gian khai thác</b>, hoặc tự điền số cho rừng.';
  return '<label><span>Định mức thời gian khai thác (ngày/ha)</span><input name="dinhMucNgayHa" data-group-number inputmode="decimal" value="' + esc(displayInputNumber(i.dinhMucNgayHa)) + '" placeholder="' + esc(ph) + '"><small class="mut" id="tgDmNote">' + note + '</small></label>';
}
/* Ô Số đội khai thác của rừng: các đội làm song song nên thời gian dự kiến chia cho số đội. Để trống thì lấy theo số Tổ trưởng ở tab Nhân công. */
function soDoiNote(i, nc) {
  return 'Lô có <b>' + nDoiNc(nc) + ' đội</b> làm song song (lập ở bảng “Nhân công khai thác”, tab Nhân công): thời gian dự kiến chia cho số đội.';
}
function soDoiField(i, nc) {
  return '<label><span>Số đội khai thác</span><small class="mut" id="soDoiNote">' + soDoiNote(i, nc) + '</small></label>';
}
/* Thời gian khai thác dự kiến của rừng = diện tích × ngày/ha; có ngày bắt đầu thì hiện ngày kết thúc dự kiến (không tính Chủ nhật) */
function tgDuKienHtml(i, pcs, nd) {
  nd = nd || 1; const d = ngayHaEff(i), n = d ? HAKDinhMuc.soNgay(haDoi(i, nd), d.v) : null, tan = dinhMucEff(i), ns = d && tan ? HAKDinhMuc.nangSuat(tan.v, d.v) : null;
  if (n == null) return 'Chưa tính được thời gian khai thác dự kiến: cần <b>diện tích</b> và <b>định mức thời gian khai thác (ngày/ha)</b>.';
  const kt = i.tuNgay && HAKDates.isValid(i.tuNgay) ? HAKDinhMuc.ngayKetThuc(i.tuNgay, n) : '';
  const han = trim(i.denNgay || '');
  return 'Thời gian khai thác dự kiến: <b>' + n + ' ngày</b> (' + String(i.dienTich).replace('.', ',') + ' ha × ' + String(d.v).replace('.',
  ',') + ' ngày/ha' + (nd > 1 ? ' ÷ ' + nd + ' đội làm song song' : '') + ', không tính Chủ nhật' + (ns ? '; năng suất 1 ngày' + (nd > 1 ? ' của mỗi đội' : '') + ' ≈ ' + String(ns).replace('.', ',') + ' tấn' : '') + ').' +
    (kt ? ' Bắt đầu ' + esc(i.tuNgay) + ' → <b>kết thúc dự kiến ' + esc(kt) + '</b>' + (han && han !== kt ? ' (ô “đến ngày” đang là ' + esc(han) + ')' : '') + '. <button type="button" class="linkbtn" data-act="fillDenDk">Điền ngày kết thúc dự kiến</button>' :
    ' Nhập <b>từ ngày</b> để tính ngày kết thúc dự kiến.') + (() => {
    const L = tgLechOf(i, pcs, nd); return L && L.canhBao ? '<br><b class="tgWarn" id="tgLech">Cảnh báo: ' + esc(tgLechText(i, L)) + '</b>' : L && L.loi ? '<br><b class="tgWarn" id="tgLech">Cảnh báo: ' + esc(L.loi) + '.</b>' : ''; })();
}
const fillBtn = (act, label) => '<small class="mut"><button type="button" class="linkbtn" data-act="' + act + '">' + label + '</button></small>';
/* ghi chú dưới ô cự ly: đang dùng số nào, từ đâu, và vì sao chưa có */
function cuLyNote(i) {
  const e = HAKCuLy.eff(i), k = v => String(v).replace('.', ',') + ' km';
  if (e.nguon === 'nhập tay') return 'Đang dùng cự ly <b>nhập tay ' + k(e.km) + '</b>.' + (e.auto != null ? ' Tự tính từ tọa độ: ' + k(e.auto) + ' (đường chim bay). Xóa ô để dùng số tự tính.' : '');
  if (e.nguon === 'tự tính') return 'Đang dùng cự ly <b>tự tính ' + k(e.km) + '</b>: khoảng cách <b>đường chim bay</b> từ tọa độ rừng đến tọa độ nơi giao, chưa phải quãng đường xe chạy (thường dài hơn). Nhập số km thực tế vào ô trên nếu khác.';
  return 'Chưa có cự ly: ' + e.thieu + '.';
}
/* Khối lượng thực tế từng đội (lô giao khoán nhiều đội): tùy chọn; trống hết thì chia theo số người (src/doi.js khoiLuong) */
function klDoiField(f) {
  const i = fInfo(f), r0 = {info: Object.assign({}, i, {_klPC: klPhieu(f.pc)}), nc: f.nc || [], doi: f.doi || null, pc: f.pc || []};
  if (!(f.doi || []).some(d => typeof d.klHoSoCu === 'number')) return '';   // chỉ hồ sơ cũ đã nhập khối lượng từng đội; bản mới: khối lượng đội = phiếu cân của đội
  const kq = doiOf(r0), b = kq; if (!b.multi) return '';
  return '<fieldset style="grid-column:1/-1;border:1px solid var(--line,#ddd);border-radius:8px;padding:8px 12px"><legend class="mut">Khối lượng thực tế từng đội của hồ sơ cũ (tấn) — chỉ hiển thị</legend>' +
    '<div class="row" style="gap:10px;flex-wrap:wrap">' + b.doi.map(d => '<span><b>' + esc(doiLabel(d)) + '</b>: ' + (typeof d.team.klHoSoCu === 'number' ? fmtTan(d.team.klHoSoCu) + ' tấn' : '—') + '</span>').join('') + '</div>' +
    '<small class="mut">Số nhập tay của bản cũ, đang dùng cho BM-08 và BM-14 của từng đội. Bỏ số hồ sơ cũ (nút ở ô khối lượng lô) thì khối lượng đội lấy theo phiếu cân đã gán đội.</small>' +
    (kq.klLoi ? '<div class="msg warn" style="margin-top:6px">' + esc(kq.klLoi) + '</div>' : '') + '</fieldset>';
}
function panelForest(f, muc) {
  const i = fInfo(f);
  const start = k => '<div class="mucForm" data-muc-form="' + k + '"' + (k === muc ? '' : ' hidden') + '>';
  const inp = (k, label, o = {}) => '<label' + (o.wide ? ' style="grid-column:1/-1"' : '') + '><span class="' + (o.req ? 'req' : '') + '">' + label + '</span>' +
    '<input name="' + k + '" value="' + esc(typeof i[k] === 'number' && ['dienTich', 'cuLy', 'dienTichSoDo', 'dienTichGps'].includes(k) ? displayInputNumber(i[k]) : (['tuNgay', 'denNgay'].includes(k) ? displayInputDate(i[k]) ?? '' : i[k] ?? '')) + '"' + (['dienTich', 'cuLy', 'dienTichSoDo', 'dienTichGps'].includes(k) ? ' data-group-number inputmode="decimal"' : '') + (o.ph ? ' placeholder="' + esc(o.ph) + '"' : '') + '>' + (o.btn || '') + '</label>';
  const sl = forestYield(i);
  return '<div class="card"><h3 style="margin-top:0">Thông tin khai thác của rừng</h3>' +
    (() => { const t = trim((i || {}).tuNgay); if (!t) return ''; const g = HAKDinhBien.get(db, t); return g.ngayLoi ? '<div class="msg err" id="tuNgayLoi" style="margin-bottom:8px"><b>Ngày bắt đầu khai thác sai:</b> ' + esc(g.ngayLoi) + '. Dữ liệu cũ được giữ nguyên để bạn sửa.</div>' : ''; })() +
    '<form id="forestForm" class="grid">' +
    start('chung') + inp('maRung', 'Mã rừng', {req: true}) + inp('tenRung', 'Tên rừng / lô') + inp('diaDiem', 'Địa điểm khai thác (rừng)', {req: true, wide: true}) +
    inp('dienTich', 'Diện tích khảo sát / theo hợp đồng (ha)') + inp('dienTichSoDo', 'Diện tích theo Sổ đỏ (ha)') + inp('dienTichGps', 'Diện tích đo GPS — ToaDoRung (ha)') + '<div id="doiSoatDT" style="grid-column:1/-1">' + doiSoatDienTichHtml(i) + '</div>' + inp('tuNgay', 'Thời gian khai thác — từ ngày', {btn: fillBtn('fillTu', 'Lấy ngày cân nhỏ nhất')}) + inp('denNgay', 'Thời gian khai thác — đến ngày', {btn: fillBtn('fillDen', 'Lấy ngày cân lớn nhất')}) + '</div>' +
    start('toado') + inp('lat', 'Vĩ độ WGS84 (điểm tâm)', {ph: 'vd: 15.912345'}) + inp('lng', 'Kinh độ WGS84 (điểm tâm)', {ph: 'vd: 108.123456'}) +
    inp('cuLy', 'Cự ly vận chuyển (km) — rừng đến nơi giao', {ph: HAKCuLy.auto(i) != null ? 'Để trống = tự tính ' + String(HAKCuLy.auto(i)).replace('.', ',') + ' km' : 'Để trống = tự tính từ tọa độ; hoặc nhập số km thực tế'}) + '<p class="mut" id="cuLyNote" style="grid-column:1/-1;margin:0">' +
    cuLyNote(i) + '</p></div>' +
    start('dinhmuc') + dmField(i) +
    dmTgField(i) + soDoiField(i, f.nc) + '<p class="mut" id="tgNote" style="grid-column:1/-1;margin:0">' + tgDuKienHtml(i, f.pc, nDoiOf(i, f.nc)) + '</p>' +
    '<label><span>Sản lượng dự kiến (tự tính = diện tích × định mức)</span><input id="slDuKien" value="' + (sl == null ? '' : fmt(Math.round(sl)) + ' tấn') + '" readonly placeholder="Nhập diện tích và định mức"></label>' +
    (typeof i.klHoSoCu === 'number' && i.klHoSoCu > 0
      ? '<label><span>Khối lượng thực tế của hồ sơ cũ (tấn) — chỉ hiển thị</span><div id="klCu"><b>' + fmtTan(i.klHoSoCu) + ' tấn</b> <span class="mut">— số nhập tay của bản cũ, đang được dùng làm khối lượng lô; tổng phiếu cân hiện là ' + (klPhieu(f.pc) > 0 ? fmtTan(klPhieu(f.pc)) + ' tấn' : '—') + '.</span> <button type="button" class="linkbtn" data-act="boKlCu">Bỏ số hồ sơ cũ, lấy theo phiếu cân</button></div></label>'
      : '<label><span>Khối lượng khai thác thực tế (tấn)</span><div id="klPC"><b>' + (klPhieu(f.pc) > 0 ? fmtTan(klPhieu(f.pc)) + ' tấn</b> <span class="mut">— tổng ' + (f.pc || []).filter(p => p.kl > 0).length + ' phiếu cân (một nguồn duy nhất)</span>' :
      '—</b> <span class="mut">chưa có phiếu cân: hồ sơ dùng sản lượng dự kiến</span>') + '</div></label>') +
    klDoiField(f) + '</div>' +
    /* Ô cũ “Đơn giá giao khoán Tổ trưởng”: chỉ còn hiện ở hồ sơ cũ đã có giá trị (để hợp đồng đã in không đổi). Lô mới nhập đơn giá Tổ trưởng ở bảng đơn giá theo vị trí (tab Nhân công);
     * đơn giá khoán của cả tổ luôn suy ra từ định biên. Xóa trống ô này thì ô biến mất và hợp đồng chuyển sang cách tính mới. */
    '<div style="grid-column:1/-1" class="row"><button class="btn sro" type="submit" tabindex="-1" aria-hidden="true">Lưu</button>' + (HB ? '<button class="btn ghost" type="button" data-act="lkOpen">Lấy dữ liệu từ Google Sheets</button>' : '') + '<button class="btn danger sm" type="button" data-act="delForest" style="margin-left:auto" title="Xóa hẳn rừng này cùng nhân công, xe, phiếu cân của rừng">Xóa rừng</button></div></form></div>';
}

const luongOptions = (direct, cur) => {
  const opts = direct ? [['sanluong', 'Theo tấn (đ/tấn)'], ['ngaycong', 'Theo ngày công (đ/công, một ngày công bao nhiêu tiền)']] : [['sanluong', 'Khoán theo tấn (đ/tấn)'], ['ha', 'Khoán theo ha (đ/ha)'], ['ngaycong', 'Khoán, trả theo ngày công (đ/công; Tổ trưởng nhận thay cả tổ)']];
  const all = opts.some(o => o[0] === cur) ? opts : [...opts, [cur, '' + (BASIS[cur] ? BASIS[cur].short : cur) + ' — không áp dụng cho hình thức này, hãy chọn lại']];
  return all.map(([v, l]) => '<option value="' + v + '"' + (v === cur ? ' selected' : '') + '>' + l + '</option>').join('');
};
function panelLuong(rec) {
  const f = curForest(), t = rec.doi && f ? curTeam(f) : null, i = t ? infoTeam(rec, rec.doi.find(d => d.id === t.id) || t) : rec.info, direct = isDirect(i), cur = i.hinhThucLuong || 'sanluong';
  /* Bảng đơn giá theo vị trí (bản 2.2): mỗi dòng một vị trí đang có người trong đội kèm số người; vị trí chưa có người gập trong mục riêng. Tên ô (dt_/ha_/dn_ + số thứ tự vị trí) giữ nguyên để lưu như cũ. */
  const nguoi = ((rec.nc || []).filter(r => !rec.doi || !t || r.doiId === t.id)), dem = {}; nguoi.forEach(r => { const k = trim(r.chucDanh); dem[k] = (dem[k] || 0) + 1; });
  const rate = (pre, map, unit) => {
    const ds = chucDanhAll().map((cd, k) => ({cd, k, n: dem[cd] || 0})), co = ds.filter(x => x.n), chua = ds.filter(x => !x.n);
    const row = x => '<tr><td>' + esc(x.cd) + '</td><td style="text-align:center">' + x.n + '</td><td><input name="' + pre + x.k + '" value="' + esc(displayInputNumber((map || {})[x.cd])) + '" inputmode="numeric" data-group-number="integer" style="text-align:right;width:140px"> <span class="mut">' + unit + '</span></td></tr>';
    return '<div class="wrap" style="grid-column:1/-1"><table class="normTbl dgTbl" style="min-width:0;table-layout:auto"><thead><tr><th>Vị trí đang có người</th><th>Số người</th><th>Đơn giá (' + unit + ')</th></tr></thead><tbody>' +
      (co.length ? co.map(row).join('') : '<tr><td colspan="3" class="mut">Đội chưa có người: thêm nhân công để thấy các vị trí cần đơn giá.</td></tr>') + '</tbody></table>' +
      (chua.length ? '<details style="margin-top:6px"><summary class="mut">Vị trí chưa có người (' + chua.length + ')</summary><table class="normTbl" style="min-width:0;table-layout:auto"><tbody>' + chua.map(row).join('') + '</tbody></table></details>' : '') + '</div>';
  };
  const grp = (name, html) => '<div class="grid" data-grp="' + name + '" style="grid-column:1/-1;' + (cur === name ? '' : 'display:none') + '">' + html + '</div>';
  return '<div class="card"><h3 style="margin-top:0">Thông số hợp đồng và đơn giá' + (t && rec.doi.length > 1 ? ' — đội “' + esc(t.ten || '') + '”' : '') + '</h3>' +
    '<p class="mut" style="margin-top:0">Chọn thành viên từ Danh mục đối tượng. <b>Giao khoán</b>: chủ rừng ký với Tổ trưởng, công nhân ký một Giấy ủy quyền cho Tổ trưởng; tính theo tấn, ha hoặc ngày công. <b>Trực tiếp</b>: chủ rừng ký hợp đồng lao động với tất cả nhân công; tính theo tấn hoặc ngày công. Sản lượng (tấn, ha) hoặc số công chia đều cho mọi người; đơn giá theo từng vị trí.</p>' +
    '<form id="luongForm" class="grid">' +
    '<label style="grid-column:1/-1"><span>Hình thức hợp đồng</span><select name="moHinhKy">' +
      '<option value="giaokhoan"' + (!direct ? ' selected' : '') + '>Giao khoán: chủ rừng ký với Tổ trưởng; công nhân ký một Giấy ủy quyền cho Tổ trưởng</option>' +
      '<option value="tructiep"' + (direct ? ' selected' : '') + '>Trực tiếp: chủ rừng ký hợp đồng lao động với tất cả nhân công</option></select></label>' +
    '<label style="grid-column:1/-1"><span>Cơ sở tính đơn giá</span><select name="hinhThucLuong">' + luongOptions(direct, cur) + '</select></label>' +
    '<div style="grid-column:1/-1" class="row"><button class="btn ghost sm" type="button" data-act="luongLay">Lấy đơn giá từ đội khác hoặc lô gần nhất</button><span class="mut" id="luongLayMsg"></span></div>' +
    grp('sanluong', rate('dt_', i.donGiaTan, 'đ/tấn', true)) + grp('ha', rate('ha_', i.donGiaHa, 'đ/ha')) + grp('ngaycong', rate('dn_', i.donGiaNgay, 'đ/công')) +
    '<label><span>Hợp đồng lao động từ ngày</span><input name="ngayBDLD" value="' + esc(displayInputDate(i.ngayBDLD) ?? '') + '" placeholder="' + esc(displayInputDate(i.tuNgay) || 'để trống nếu chưa biết') + '"></label>' +
    '<div style="grid-column:1/-1" class="row"><button class="btn sro" type="submit" tabindex="-1" aria-hidden="true">Lưu</button></div></form></div>';
}

const vcOptions = cur => {
  const opts = [['coDinh', 'Đơn giá cố định (đồng/tấn)'], ['tanKm', 'Đơn giá tấn/km (đồng/tấn/km × cự ly)']];
  const all = opts.some(o => o[0] === cur) ? opts : [...opts, [cur, 'Theo bậc cự ly — không còn áp dụng, hãy chọn lại']];
  return all.map(([v, l]) => '<option value="' + v + '"' + (v === cur ? ' selected' : '') + '>' + l + '</option>').join('');
};
function panelVc(rec) {
  const i = rec.info, vc = i.vanChuyen || {}, tp = transportPrice(i), cur = vc.mode || 'tanKm';
  const show = m => cur === m ? '' : 'display:none';
  return '<div class="card"><h3 style="margin-top:0">Cước vận chuyển chung của lô (chủ rừng trả bên vận chuyển)</h3><p class="mut" style="margin-top:0">Áp cho mọi hợp đồng vận chuyển không đặt cước riêng.</p>' +
    '<p class="mut" style="margin-top:0">Hai cách tính đơn giá: <b>cố định</b> (một giá đồng/tấn) hoặc <b>tấn/km</b> (đơn giá × cự ly). Cự ly vận chuyển của rừng: <b>' + (HAKCuLy.eff(i).km ? String(HAKCuLy.eff(i).km).replace('.', ',') + ' km (' + HAKCuLy.eff(i).nguon + ')' : 'chưa có') + '</b> (mặc định tự tính từ tọa độ rừng đến nơi giao, hoặc nhập tay ở tab Thông tin rừng; chỉ cần khi tính theo tấn/km).</p>' +
    '<form id="vcForm" class="grid">' +
    '<label style="grid-column:1/-1"><span>Cách tính đơn giá vận chuyển</span><select name="vcMode">' + vcOptions(cur) + '</select></label>' +
    '<label data-vcgrp="coDinh" style="' + show('coDinh') + '"><span>Đơn giá cố định (đồng/tấn)</span><input name="vcCoDinh" value="' + esc(vc.coDinh ?? '') + '"></label>' +
    '<label data-vcgrp="tanKm" style="' + show('tanKm') + '"><span>Đơn giá tấn/km (đồng/tấn/km)</span><input name="vcKm" value="' + esc(vc.donGiaKm ?? '') + '"></label>' +
    '<div data-vcgrp="tanKm" style="grid-column:1/-1;' + (cur === 'tanKm' ? '' : 'display:none') + '" class="mut">Cự ly vận chuyển: <b>' + (HAKCuLy.eff(i).km ? String(HAKCuLy.eff(i).km).replace('.', ',') + ' km (' + HAKCuLy.eff(i).nguon + (HAKCuLy.eff(i).nguon === 'tự tính' ? ', đường chim bay' :
    '') + ')' : 'chưa có') + '</b> · xem và sửa ở <button type="button" class="btn ghost sm" data-act="ktGo" data-go="{&quot;ftab&quot;:&quot;finfo&quot;,&quot;muc&quot;:&quot;toado&quot;}">tab Thông tin rừng → Tọa độ và cự ly → Cự ly vận chuyển (km)</button></div>' +
    '<label><span>Vận chuyển từ ngày (dd/mm/yyyy)</span><input name="vcTu" value="' + esc(vc.tuNgay ?? '') + '" placeholder="' + esc(displayInputDate(i.tuNgay) || 'để trống nếu chưa biết') + '"></label>' +
    '<div style="grid-column:1/-1" class="mut">' + (tp.loi ? 'Chưa tính được đơn giá vận chuyển: ' + esc(tp.loi) : 'Đơn giá vận chuyển hiện tại: ' + fmt(tp.gia) + ' đồng/tấn (' + esc(tp.text) + ')') + '</div>' +
    '<div style="grid-column:1/-1" class="row"><button class="btn sro" type="submit" tabindex="-1" aria-hidden="true">Lưu</button></div></form>' +
    '<h4 style="margin:12px 0 4px">Số văn bản chung của các đội xe <span class="mut" style="font-weight:400">· đội xe đặt số riêng ở bảng Đội xe bên dưới; để trống thì in dòng chấm</span></h4>' +
    expInputs([['soVC', 'Số HĐ vận chuyển (phần số hoặc số đầy đủ)', 'năm lấy từ ngày ký các hợp đồng của lô'], ['vcChiPhi', 'HĐVC: chi phí khác (cầu đường, bốc xếp, thuế)', 'trống = dòng chấm'],
      ['pcSo', 'Xác nhận KL vận chuyển: số biên bản', 'năm lấy từ ngày lập biên bản'], ['pcNgay', 'Xác nhận KL, thanh toán: ngày lập', 'dd/mm/yyyy'],
      ['pcNguoiLap', 'Thanh toán vận chuyển: người lập bảng', 'trống = để ký tay'], ['pcNguong', 'Cảnh báo lệch khối lượng (%)', 'VD: 5 · trống = không kiểm tra']], expLo(rec)) + '</div>';
}
function giayRowHtml(g) {
  g = g || {};
  const opts = '<option value="">— chọn —</option>' + GIAY_LOAI.map(o => '<option' + (g.loai === o ? ' selected' : '') + '>' + o + '</option>').join('');
  const txt = (k, label) => '<label>' + label + '<input name="' + k + '" value="' + esc(g[k.slice(2)] ?? '') + '"></label>';
  return '<div class="giayRow" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:8px;border:1px dashed var(--line);border-radius:6px;padding:8px;margin-bottom:8px">' +
    '<label>Loại giấy<select name="g_loai">' + opts + '</select></label>' +
    txt('g_ten', 'Tên giấy (bắt buộc nếu chọn Khác)') + txt('g_so', 'Số') + txt('g_ngayCap', 'Ngày cấp') + txt('g_coQuan', 'Cơ quan cấp') + txt('g_hanDen', 'Hạn đến (nếu có)') +
    '<div style="align-self:end"><button type="button" class="btn danger sm" data-act="delGiay">Xóa dòng</button></div></div>';
}

function panelGiay(f) {
  const list = f.info.giayTo || [];
  return '<div class="card"><div class="row" style="justify-content:space-between"><h3 style="margin:0">Hồ sơ pháp lý của rừng</h3>' +
    '<button type="button" class="btn ghost sm" data-act="addGiay">+ Thêm giấy tờ</button></div>' +
    '<p class="mut">Chỉ lưu thông tin giấy tờ (loại, số, ngày cấp, cơ quan cấp), không lưu file scan.</p>' +
    '<form id="giayForm"><div id="giayList">' + (list.map(giayRowHtml).join('') || '<p class="mut">Chưa có giấy tờ.</p>') + '</div>' +
    '<button class="btn sro" type="submit" tabindex="-1" aria-hidden="true">Lưu</button></form></div>';
}

/* 3.5.1: Đối soát 3 nguồn diện tích đất rừng — Sổ đỏ, khảo sát / hợp đồng, đo GPS (ToaDoRung). Chỉ cảnh báo, không chặn lưu; ngưỡng chênh 0,01 ha (100 m²). */
const DT_NGUONG = 0.01;
function doiSoatDienTichKetQua(v) {   // v = {soDo, khaoSat, gps} (ha hoặc rỗng)
  const nguon = [['Sổ đỏ (GCNQSDĐ)', v.soDo], ['Khảo sát / hợp đồng', v.khaoSat], ['Đo GPS (ToaDoRung)', v.gps]].map(([ten, x]) => ({ten, v: typeof x === 'number' && isFinite(x) ? x : null}));
  const co = nguon.filter(x => x.v != null);
  if (co.length < 2) return {nguon, tt: 'thieu', lech: null};
  const mx = co.reduce((a, b) => (b.v > a.v ? b : a)), mn = co.reduce((a, b) => (b.v < a.v ? b : a)), lech = Math.round((mx.v - mn.v) * 10000) / 10000;
  return {nguon, tt: lech > DT_NGUONG ? 'xungDot' : 'khop', lech, mx, mn, pct: mn.v > 0 ? Math.round(lech / mn.v * 1000) / 10 : null};
}
function doiSoatDienTichHtml(i) {
  const r = doiSoatDienTichKetQua({soDo: i.dienTichSoDo, khaoSat: i.dienTich, gps: i.dienTichGps}), ha = v => (v == null ? '—' : formatNumber(v, 4) + ' ha');
  const pill = r.tt === 'xungDot' ? '<span class="pill err">Xung đột diện tích (areaConflict)</span>' : r.tt === 'khop' ? '<span class="pill ok">Khớp giữa các nguồn</span>' : '<span class="pill">Chưa đủ nguồn để đối soát</span>';
  return '<div class="card" style="margin:0" data-tt="' + r.tt + '"><div class="row" style="justify-content:space-between;align-items:center;gap:8px"><b>Đối soát diện tích đất rừng (3 nguồn)</b>' + pill + '</div>' +
    '<div class="kpi" style="margin-top:6px">' + r.nguon.map(x => '<div><b>' + ha(x.v) + '</b>' + esc(x.ten) + '</div>').join('') + '</div>' +
    (r.tt === 'xungDot' ? '<div class="msg warn" style="margin:6px 0 0">Chênh <b>' + formatNumber(r.lech, 4) + ' ha</b>' + (r.pct != null ? ' (' + String(r.pct).replace('.', ',') + '%)' : '') + ' giữa <b>' + esc(r.mx.ten) + '</b> và <b>' + esc(r.mn.ten) + '</b>. Đối chiếu giấy chứng nhận, biên bản khảo sát và tọa độ trước khi đánh giá FSC. Chỉ cảnh báo, không chặn lưu.</div>' : '') + '</div>';
}
document.addEventListener('input', e => {   // cập nhật thẻ khi sửa một trong ba ô diện tích
  const t = e.target, fm = t && t.form; if (!fm || fm.id !== 'forestForm' || !['dienTich', 'dienTichSoDo', 'dienTichGps'].includes(t.name)) return;
  const n = k => { const el = fm.elements[k]; return el && trim(el.value) ? readInputNumber(el.value) : null; }, box = document.getElementById('doiSoatDT');
  if (box) box.innerHTML = doiSoatDienTichHtml({dienTichSoDo: n('dienTichSoDo'), dienTich: n('dienTich'), dienTichGps: n('dienTichGps')});
});
