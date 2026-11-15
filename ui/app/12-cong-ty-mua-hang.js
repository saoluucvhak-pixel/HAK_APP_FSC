/* ========== Công ty mua hàng: MỘT hồ sơ công ty (phần mềm dùng cho một công ty) + địa chỉ giao theo từng rừng (src/muahang.js) ========== */
const MH = HAKMuaHang;
const cty = {edit: null, tried: false, msg: null};                           // màn hình hồ sơ công ty
const mh = {fid: '', open: false, addrId: '', msg: null};                    // chọn địa chỉ giao ở tab Vận chuyển (theo rừng đang mở)
/* Hồ sơ công ty duy nhất lưu ở db.congTy (bảng companies); nếu dữ liệu cũ có nhiều bản thì dùng bản đầu theo tên. Mọi lô dùng chung hồ sơ này. */
const theCompany = () => Object.values(db.congTy || {}).sort((a, b) => (a.ten || '').localeCompare(b.ten || '', 'vi'))[0] || null;
const addrRowHtml = a => '<div class="ctyAddr row" style="margin-top:6px" data-aid="' + esc(a.id) + '"><input name="a_nhan" placeholder="Nhãn (vd: Kho cảng)" value="' + esc(a.nhan) + '" style="flex:1 1 160px"><input name="a_dia" placeholder="Địa chỉ giao hàng" value="' + esc(a.diaChi) + '" style="flex:3 1 280px"><input name="a_toado" placeholder="Tọa độ: vĩ độ, kinh độ" title="Dán từ Google Maps, vd 15.912345, 108.123456; dùng để tự tính cự ly vận chuyển" value="' + esc(HAKCuLy.fmtToaDo(a.lat, a.lng)) + '" style="flex:1 1 170px"><button type="button" class="btn danger sm" data-act="ctyDelAddr">Xóa</button></div>';
function ctyForestsUsing() { const c = theCompany(); return c ? Object.values(db.rs).reduce((n, o) => n + forestList(o).filter(f => f.info.muaHang && f.info.muaHang.congTyId === c.id).length, 0) : 0; }
function panelCty() {
  const c = cty.edit || theCompany() || MH.newCompany(), m = cty.msg; cty.msg = null; cty.edit = c;
  const f = (k, label, o = {}) => '<label' + (o.wide ? ' style="grid-column:1/-1"' : '') + '><span class="' + (o.req ? 'req' : '') + '">' + label + '</span><input name="' + k + '" value="' + esc(c[k] ?? '') + '"' + (o.ph ? ' placeholder="' + esc(o.ph) + '"' : '') + '></label>';
  return '<div class="hero"><div><h2>Công ty mua hàng</h2><p class="mut">Khai một lần cho cả phần mềm. Mỗi rừng chỉ chọn <b>địa chỉ giao hàng</b> của công ty này ở <b>tab Vận chuyển</b>; địa chỉ đó là địa điểm vận chuyển đến trong BM-04, BM-09, BM-10 và Sổ phiếu cân.' +
    (theCompany() ? ' ' + ctyForestsUsing() + ' rừng đã chọn địa chỉ giao.' : '') + '</p></div></div>' + (m ? '<div class="msg ' + m.kind + '">' + esc(m.text) + '</div>' : '') +
    '<div class="card" id="ctyCard"><form id="ctyForm" class="grid">' +
    f('ten', 'Tên pháp lý', {req: true, wide: true}) + f('mst', 'Mã số thuế', {ph: '10 hoặc 13 chữ số'}) + f('diaChi', 'Địa chỉ công ty', {req: true, wide: true}) +
    '<label><span>Tọa độ trụ sở (vĩ độ, kinh độ)</span><input name="toaDo" value="' + esc(HAKCuLy.fmtToaDo(c.lat, c.lng)) + '" placeholder="VD: 15.912345, 108.123456 (dán từ Google Maps)"><small class="mut">Tùy chọn. Có tọa độ nơi giao thì phần mềm tự tính cự ly vận chuyển từ rừng đến đây.</small></label>' +
    f('nguoiDaiDien', 'Người đại diện') + f('chucVu', 'Chức vụ') + f('sdt', 'Số điện thoại') + f('fax', 'Fax', {ph: 'tùy chọn; in ở tiêu đề phiếu cân'}) + f('noiLap', 'Nơi lập chứng từ', {ph: 'VD: Đà Nẵng; in trước ngày tháng năm trên phiếu cân'}) + f('email', 'Email') +
    '<div style="grid-column:1/-1"><div class="mut">Địa chỉ giao hàng khác (kho, nhà máy…). Khi chọn điểm đến cho rừng, địa chỉ công ty luôn là lựa chọn đầu tiên, sau đó là các địa chỉ này.</div><div id="ctyAddrs">' + (c.diaChiGiao || []).map(addrRowHtml).join('') + '</div>' +
      '<button type="button" class="btn ghost sm" style="margin-top:6px" data-act="ctyAddAddr">+ Thêm địa chỉ giao hàng</button></div>' +
    '<div id="ctyMsg" style="grid-column:1/-1"></div><div style="grid-column:1/-1" class="row"><button class="btn" type="submit">Lưu thông tin công ty</button></div></form></div>';
}
function ctyReadForm() {
  const form = $('#ctyForm'), fd = new FormData(form), c = {...(cty.edit || MH.newCompany())};
  ['ten', 'mst', 'diaChi', 'nguoiDaiDien', 'chucVu', 'sdt', 'fax', 'noiLap', 'email'].forEach(k => { c[k] = fd.get(k) ?? ''; });
  const td = HAKCuLy.parseToaDo(fd.get('toaDo')); c.lat = td ? td.lat : null; c.lng = td ? td.lng : null; c.toaDoSai = String(fd.get('toaDo') || '').trim() && !td ? String(fd.get('toaDo')).trim() : '';
  c.diaChiGiao = [...form.querySelectorAll('.ctyAddr')].map(r => { const raw = r.querySelector('[name=a_toado]').value, t = HAKCuLy.parseToaDo(raw); return {id: r.dataset.aid || '', nhan: r.querySelector('[name=a_nhan]').value, diaChi: r.querySelector('[name=a_dia]').value, lat: t ? t.lat : null, lng: t ? t.lng : null, toaDoSai: raw.trim() && !t ? raw.trim() : ''}; });
  return MH.clean(c, newId);
}
/* tọa độ gõ sai dạng không được lặng lẽ bỏ: báo như lỗi chặn lưu */
function ctyGeoErrors(c) { const e = []; if (c.toaDoSai) e.push('Tọa độ trụ sở “' + c.toaDoSai + '” sai dạng (vd 15.912345, 108.123456; vĩ độ trước, kinh độ sau)'); (c.diaChiGiao || []).forEach((a, i) => { if (a.toaDoSai) e.push('Tọa độ địa chỉ giao thứ ' + (i + 1) + ' “' + a.toaDoSai + '” sai dạng (vd 15.912345, 108.123456)'); }); return e; }
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
  cty.msg = {kind: v.warnings.length ? 'warn' : 'ok', text: 'Đã lưu thông tin công ty “' + c.ten + '”.' + (v.warnings.length ? ' Lưu ý: ' + v.warnings.join('; ') : '') + (ctyForestsUsing() ? ' Các rừng đã chọn địa chỉ GIỮ địa chỉ đã lưu cho đến khi bạn xác nhận cập nhật ở tab Vận chuyển của từng rừng.' : '')};
  render();
}

/* ----- Chọn địa chỉ giao hàng cho TỪNG rừng (tab Vận chuyển) ----- */
function mhSnapshotNow() { const c = theCompany(); return c ? MH.snapshot(c, mh.addrId) : null; }
function panelMua(rec) {
  const f = curForest(); if (!f) return '';
  if (mh.fid !== f.id) Object.assign(mh, {fid: f.id, open: false, addrId: '', msg: null});
  const i = rec.info, m = i.muaHang, co = theCompany(), dd = MH.diemDen(i, rec.exp), dr = MH.drift(i, db.congTy), vcMode = (i.vanChuyen || {}).mode || 'tanKm';
  const mis = MH.mismatches(rec.pc || [], dd.src === 'congty' ? dd : null);
  const msg = mh.msg; mh.msg = null;
  let cur;
  if (!co && !m) cur = '<div class="msg warn">Chưa khai thông tin công ty mua hàng. <button class="btn sm" data-act="openCty">Khai thông tin công ty</button></div>' + (dd.src === 'thucong' ? '<div class="msg warn">Đang dùng điểm đến nhập tay trước đây: <b>' + esc(dd.text) + '</b>.</div>' : '');
  else if (m) cur = '<div class="hint" style="display:block"><b>' + esc(m.ten) + '</b>' + (m.mst ? ' · MST ' + esc(m.mst) : '') + '<br>Địa chỉ giao hàng: <b>' + esc(m.diaChiNhan || 'Địa chỉ công ty') + '</b> — ' + esc(m.diaChi) + '<br><span class="mut">Đã xác nhận ' + esc(fmtDT(m.xacNhan)) + ' · lưu cùng hồ sơ rừng này</span></div>';
  else if (dd.src === 'thucong') cur = '<div class="msg warn">Rừng này chưa chọn địa chỉ giao của công ty. Đang dùng điểm đến nhập tay trước đây: <b>' + esc(dd.text) + '</b>. Chọn địa chỉ giao để dùng địa chỉ trong hồ sơ công ty.</div>';
  else cur = '<div class="msg warn">Chưa chọn địa chỉ giao hàng cho rừng này: địa điểm vận chuyển đến đang trống, các biểu mẫu cần điểm đến (BM-04, BM-09, BM-10) sẽ in dòng chấm.</div>';
  let drift = '';
  if (dr.state === 'thaydoi') drift = '<div class="msg warn">Thông tin công ty đã thay đổi (' + esc(dr.why) + '). Hồ sơ rừng vẫn GIỮ: <b>' + esc(dr.saved.ten) + ' – ' + esc(dr.saved.diaChi) + '</b>. Hồ sơ công ty hiện là: <b>' + esc(dr.current.ten) + (dr.current.diaChi ? ' – ' + esc(dr.current.diaChi) : '') + '</b>. <button class="btn sm" data-act="mhOpen">Xem và cập nhật</button></div>';
  else if (dr.state === 'xoa') drift = '<div class="msg warn">Hồ sơ công ty “' + esc(dr.saved.ten) + '” không còn trong phần mềm. Hồ sơ rừng vẫn giữ tên và địa chỉ đã lưu.</div>';
  const misBox = mis.length ? '<div class="msg warn">Nơi giao trên <b>' + mis.length + ' phiếu cân</b> khác địa chỉ giao đã chọn (' + esc([...new Set(mis.map(p => p.noiGiao))].slice(0, 4).join('; ')) + '). Nội dung gốc của phiếu được giữ nguyên; hãy đối chiếu phiếu hoặc điểm đến.</div>' : '';
  let pick = '';
  if (mh.open && co) {
    const addrs = MH.addressesOf(co), a = MH.addressOf(co, mh.addrId), snap = mhSnapshotNow(), oldT = dd.text, newT = snap ? snap.ten + ' – ' + snap.diaChi : '';
    pick = '<div class="card" style="border-color:var(--brand)"><h4 style="margin:0 0 8px">Chọn địa chỉ giao hàng của ' + esc(co.ten) + '</h4>' +
      '<label><span>Địa chỉ giao hàng</span><select id="mhAddr">' + addrs.map(x => '<option value="' + esc(x.id || '@main') + '"' + (x.id === (mh.addrId || '') ? ' selected' : '') + '>' + esc(x.nhan) + ' — ' + esc(x.diaChi) + '</option>').join('') + '</select></label>';
    if (a) {
      pick += '<div class="wrap" style="margin-top:8px"><table><tr><th></th><th>Địa điểm vận chuyển đến</th></tr>' +
        '<tr><td>' + (dd.src === 'thucong' ? 'Giá trị nhập tay cũ' : dd.src === 'congty' ? 'Hiện đang lưu trong hồ sơ' : 'Hiện tại') + '</td><td>' + (oldT ? esc(oldT) : '<span class="mut">(trống)</span>') + '</td></tr>' +
        '<tr><td><b>' + (dd.src ? 'Địa chỉ đề xuất / mới' : 'Địa chỉ mới') + '</b></td><td><b>' + esc(newT) + '</b>' + (oldT === newT ? ' <span class="pill ok">không thay đổi</span>' : '') + '</td></tr></table></div>';
      if (oldT !== newT && vcMode === 'tanKm') pick += '<div class="msg warn">Đơn giá vận chuyển đang tính <b>theo tấn/km</b> (cự ly ' + (typeof i.cuLy === 'number' ? fmt(i.cuLy) + ' km' : 'chưa nhập') + '). Đổi điểm đến <b>không tự sửa cự ly hay đơn giá</b>: hãy kiểm tra lại cự ly vận chuyển ở tab Thông tin rừng trước khi xuất hồ sơ.</div>';
      if (dd.src === 'thucong') pick += '<p class="mut" style="margin:6px 0 0">Xác nhận sẽ dùng địa chỉ trong hồ sơ công ty thay cho điểm đến nhập tay (giá trị nhập tay cũ vẫn được giữ trong hồ sơ nhưng không còn được dùng).</p>';
    }
    pick += '<div class="row" style="margin-top:8px"><button class="btn" data-act="mhConfirm">Xác nhận và lưu vào hồ sơ rừng</button><button class="btn ghost" data-act="mhCancel">Hủy</button></div></div>';
  }
  const ddBox = '<label style="margin-top:8px"><span>Địa điểm vận chuyển đến (tự điền từ địa chỉ giao đã chọn)</span><input id="mhDiemDen" readonly value="' + esc(dd.diaChi) + '" placeholder="Chưa có: chọn địa chỉ giao hàng"></label>';
  return '<div class="card"><div class="row" style="justify-content:space-between"><h3 style="margin:0">Địa chỉ giao hàng và điểm đến vận chuyển</h3>' + (co ? '<button class="btn' + (m ? ' ghost' : '') + '" data-act="mhOpen">' + (m ? 'Đổi địa chỉ giao' : 'Chọn địa chỉ giao hàng') + '</button>' : '') + '</div>' +
    '<p class="mut" style="margin:4px 0 8px">Công ty mua hàng khai một lần ở <b>Cài đặt → Công ty</b> (menu ngang trên cùng); mỗi rừng chọn địa chỉ giao của công ty đó. Địa chỉ đã chọn là địa điểm đến ở màn hình này, trong BM-04, BM-09, BM-10 và Sổ phiếu cân.</p>' +
    (msg ? '<div class="msg ' + msg.kind + '">' + esc(msg.text) + '</div>' : '') + cur + ddBox + drift + misBox + pick + '</div>';
}
function panelDX(rec) {
  const c = checkDX(rec);
  const head = panelMua(rec) + panelVc(rec) + panelImport('dx', rec) + stBar('dx', rec) + stErrBox();
  if (!rec.dx.length && !stCur()) return head + '<div class="empty">Chưa có danh sách vận chuyển. Bấm “+ Thêm xe”, hoặc “Tải file mẫu”, điền rồi nạp lại.</div>';
  return head + issuesBox(c.errs, c.warns) + stTable('dx', rec, ['Chủ xe', 'Biển kiểm soát', 'Loại xe', 'Người ký HĐ', 'Tài xế', 'Số GPLX', 'Hạn GPLX', 'Hạn bảo hiểm', 'Kiểm định'],
    r => '<td>' + esc(r.chuXe) + '</td><td>' + esc(r.bienSo) + '</td><td>' + esc(r.loaiXe) + '</td><td>' + (driverSigns(r) ? 'Tài xế' : 'Chủ xe') + '</td><td>' + esc(r.taiXe) + '</td><td>' + esc(r.gplx) + '</td><td>' + esc(r.hanGplx) + '</td><td>' + esc(r.hanBH) + '</td><td>' + esc((r.kdTu || r.kdDen) ? (r.kdTu || '…') + ' – ' + (r.kdDen || '…') : '') + '</td>', c);
}

/* Ngày cân 2: số đã nhập thì hiện nguyên; không có thì suy từ ngày cân 1 và giờ cân (giờ cân 2 sớm hơn giờ cân 1 = qua nửa đêm, +1 ngày) và ghi “suy ra” */
function ngay2Cell(r) {
  const n = HAKPhieuCan.ngay2Of(r); if (!n.ngay) return '';
  return esc(n.ngay) + (n.nguon === 'suy ra' ? '<br><small class="mut" title="Phiếu chưa có ngày cân 2: suy ra từ ngày cân 1 và giờ cân 1, giờ cân 2">suy ra</small>' : n.nguon === 'theo ngày cân 1' ? '<br><small class="mut" title="Thiếu giờ cân nên lấy theo ngày cân 1">theo ngày cân 1</small>' : '');
}
function panelPhieuCan(rec) {
  const c = checkPC(rec), pc = rec.pc || [];
  const head = panelImport('pc', rec) + stBar('pc', rec);
  if (!pc.length && !stCur()) return head + '<div class="empty">Chưa có phiếu cân. Bấm “+ Thêm phiếu cân”, hoặc “Tải file mẫu”, mỗi chuyến một dòng theo phiếu cân nhà máy, rồi nạp lại.</div>';
  const R = '<span style="display:block;text-align:right">', num = (v, f) => typeof v === 'number' ? fmt(v) : '';
  const t = stTable('pc', rec, ['Cân lần 1 (ngày, giờ)', 'Cân lần 2 (ngày, giờ)', 'Biển kiểm soát', 'Số phiếu cân', R + 'Cân lần 1 (kg)</span>', R + 'Cân lần 2 (kg)</span>', R + 'Khối lượng (kg)</span>', R + 'Khối lượng (tấn)</span>', 'Khách hàng', R + 'Đơn giá</span>', R + 'Thành tiền</span>', 'Nơi giao'],
    r => '<td>' + (HAKDates.isValid(r.ngay) ? esc(r.ngay) : esc(r.ngay) + '<br><small style="color:var(--err)">' + esc(HAKDates.why(r.ngay)) + ' (bấm Sửa)</small>') + '<br><span class="mut">' + esc(r.gioCan1 || '') + '</span></td><td>' + ngay2Cell(r) + '<br><span class="mut">' + esc(r.gioCan2 || '') + '</span></td><td>' + esc(r.bienSo) +
      '</td><td>' + esc(r.soPhieu) + '</td><td style="text-align:right">' + num(r.can1) + '</td><td style="text-align:right">' + num(r.can2) +
      '</td><td style="text-align:right">' + (typeof r.klKg === 'number' ? fmt(r.klKg) : (typeof r.kl === 'number' ? fmt(Math.round(r.kl * 1000)) : '')) + '</td><td style="text-align:right">' + (typeof r.kl === 'number' ? fmtT(Math.round(r.kl * 1000)) : esc(r.kl)) +
      '</td><td>' + esc(r.khachHang || '') + '</td><td style="text-align:right">' + num(r.donGia) + '</td><td style="text-align:right">' + num(r.thanhTien) + '</td><td>' + esc(r.noiGiao) + '</td>', c);
  return head + issuesBox(c.errs, c.warns) + t.replace('</tbody></table></div>', '</tbody><tfoot><tr><td colspan="9"><b>Tổng ' + pc.length + ' chuyến (bản ' + (stCur() ? 'nháp' : 'đã lưu') + ')</b></td><td style="text-align:right"><b>' + fmtT(totalKg(pc)) + ' tấn</b></td><td colspan="5"></td></tr></tfoot></table></div>');
}

function issuesBox(errs, warns) {
  let h = '';
  if (errs.length) h += '<div class="msg err"><b>Lỗi (' + errs.length + ') — cần sửa trong file rồi nạp lại:</b><ul class="issues">' + errs.slice(0, 40).map(e => '<li>' + esc(e) + '</li>').join('') + (errs.length > 40 ? '<li>… còn ' + (errs.length - 40) + ' lỗi</li>' : '') + '</ul></div>';
  else h += '<div class="msg ok">Không có lỗi.</div>';
  if (warns.length) h += '<div class="msg warn"><b>Cảnh báo (' + warns.length + '):</b><ul class="issues">' + warns.slice(0, 20).map(e => '<li>' + esc(e) + '</li>').join('') + '</ul></div>';
  return h;
}

/* Xem trước SỐ ĐẦY ĐỦ sẽ in trên biểu mẫu (cùng quy tắc với lúc xuất: src/hopdong.js) và nhắc việc cần bổ sung để có năm */
function soPreviewHtml(rec, exo, which) {
  const ex = Object.assign({}, exo || rec.exp || {}); if (!ex.ngayKy && rec.info.ngayKyHopDong) ex.ngayKy = rec.info.ngayKyHopDong;
  const n = HAKHopDong.numbers(ex), direct = isDirect(rec.info), cbs = HAKHopDong.canBoSung(ex);
  const line = (label, x, forms) => '<tr><td>' + label + '</td><td><b>' + esc(x.so) + '</b></td><td class="mut">' + forms + (x.giuNguyen ? ' · số đã đầy đủ, giữ nguyên' : x.nam ? ' · năm ' + x.nam + ' lấy từ ngày ' + esc(x.ngay) : ' · <span style="color:var(--err)">chưa có năm</span>') + '</td></tr>';
  const rows = which === 'vc' ? [line('Hợp đồng vận chuyển', n.vc, 'BM-04, BM-09, BM-10'), line('Biên bản xác nhận khối lượng', n.xn, 'BM-09, BM-10')]
    : [...(direct ? [] : [line('Hợp đồng khai thác (giao khoán)', n.kt, 'BM-01, BM-14, BM-20'), line('Giấy ủy quyền', n.uq, 'BM-20')]), line('Biên bản nghiệm thu, thanh lý', n.nt, 'BM-14')];
  const need = cbs.filter(c => which === 'vc' ? /BM-04|BM-09/.test(c.label) : /BM-01|BM-14|BM-20/.test(c.label));
  return '<table><tr><th>Văn bản</th><th>Số đầy đủ sẽ in</th><th>Ghi chú</th></tr>' + rows.join('') + '</table>' +
    (need.length ? '<div class="msg warn" style="margin-top:6px">Chưa có năm trong số: ' + need.map(c => esc(c.label) + ' — bổ sung <b>' + esc(c.truong) + '</b> (dd/mm/yyyy, ngày có thật)').join('; ') + '. Năm được lấy từ ngày ký của chính hợp đồng, không ghi sẵn năm cố định.</div>' : '');
}
/* Màn hình "In hồ sơ đợt 2": việc cần làm ở trên cùng; bảng chi tiết từng mẫu/nhóm ở dưới, mỗi dòng chỉ hiện nút hợp với tình trạng */
const D2_SHORT = {trang: 'Giấy trắng', nen: 'In nền', thieu: 'Thiếu dữ liệu', de: 'In đè', cho: 'Chờ dữ liệu', kiemtra: 'Đối chiếu nền cũ', doibocuc: 'In lại nền hoặc giấy trắng'};
const D2_TONE = {trang: 'ok', nen: 'warn', thieu: 'err', de: 'ok', cho: 'warn', kiemtra: 'warn', doibocuc: 'err'};
const D2_TAB = {finfo: 'Thông tin rừng', nc: 'Nhân công', dx: 'Vận chuyển', xuat: 'Xuất hồ sơ'};
/* nhãn phân biệt các nhóm vận chuyển cùng tên: biển số xe và 4 số cuối CCCD */
function d2GroupLabel(rec, gr) { const xe = [...new Set(gr.xe.map(r => r.bienSo).filter(Boolean))]; return gr.ten + ' (' + gr.vaiTro.toLowerCase() + ')' + (xe.length ? ' · xe ' + xe.slice(0, 2).join(', ') + (xe.length > 2 ? ' +' + (xe.length - 2) : '') : '') + (gr.cccd ? ' · CCCD …' + String(gr.cccd).slice(-4) : ''); }
function d2Panel(rec) {
  const {list, plan, absent} = d2Eval(rec), IA = HAKInAn2;
  const ab = (act, label, o = {}) => '<button class="btn sm ' + (o.primary ? '' : 'ghost') + '" ' + (o.disabled ? 'disabled ' : '') + 'data-act="' + act + '"' + (o.mode ? ' data-mode="' + o.mode + '"' : '') + (o.keys ? ' data-keys="' + esc(o.keys.join('|')) + '"' : '') + (o.title ? ' title="' + esc(o.title) + '"' : '') + '>' + label + '</button>';
  const keysOf = a => a.map(x => x.key);
  const same = list.length > 0 && list.every(x => x.advice === list[0].advice);
  const rows = list.map(x => { const k = [x.key], adv = x.advice;
    const bNen = ab('d2dl', 'Tải nền', {mode: 'nen', keys: k, title: 'Tải mẫu nền của riêng mẫu này'}), bTrang = ab('d2dl', 'Tải giấy trắng', {mode: 'trang', keys: k, title: 'Tải bản đầy đủ, in một lần trên giấy trắng'}),
      bDe = ab('d2dl', 'Tải in đè', {mode: 'de', keys: k, title: 'Tải phần bổ sung để in đè lên tờ nền đã in'}), bConf = ab('d2confirm', 'Đã in nền', {keys: k, title: 'Xác nhận đã in tờ nền này (ghi nhận bố cục hiện tại)'}),
      bOld = ab('d2legacy', 'Đã có nền in từ trước', {keys: k, title: 'Tờ nền in trước khi có chức năng này: bắt buộc đối chiếu trước khi in đè'}), bUndo = ab('d2undo', 'Bỏ xác nhận', {keys: k, title: 'Tờ nền hỏng, mất hoặc muốn in lại trên giấy trắng'});
    const vis = {trang: [bTrang], nen: [bNen, bConf], thieu: [], de: [bDe], cho: [], kiemtra: [bDe], doibocuc: [bNen, bConf]}[adv];
    const more = {trang: [x.nenReady && bNen, bConf, bOld], nen: [bOld], thieu: [], de: [x.fullReady && bTrang, bUndo], cho: [bUndo], kiemtra: [x.fullReady && bTrang, bUndo], doibocuc: [x.fullReady && bTrang, bUndo]}[adv].filter(Boolean);
    const acts = vis.join(' ') + (more.length ? ' <details class="d2more"><summary>Khác</summary><div class="d2menu">' + more.join('') + '</div></details>' : '');
    const miss = x.fullMissing;
    const note = (adv === 'doibocuc' ? '<div class="msg warn">Bố cục mẫu đã khác lúc in nền' + (x.diff.length ? ' (' + x.diff.map(esc).join('; ') + ')' : ' (chữ cố định như tên, địa chỉ, số hợp đồng đã đổi)') + '. Tờ nền cũ không còn khớp: in lại mẫu nền rồi xác nhận lại, hoặc in đầy đủ trên giấy trắng.</div>' : '') +
      (adv === 'kiemtra' ? '<div class="msg warn">Chưa biết bố cục tờ nền in từ trước. Trước khi in đè, đối chiếu tờ nền với mẫu hiện tại (khổ giấy, hướng giấy, lề, chữ cố định, số dòng); app sẽ hỏi khi bạn bấm “Tải in đè”.</div>' : '') +
      (miss.length ? '<div class="mut">Còn thiếu để in đầy đủ: ' + miss.map(m => esc(m.text) + ' <button class="btn ghost sm" data-act="ktGo" data-go="' + esc(JSON.stringify(m.go)) + '">Mở ' + (D2_TAB[m.go.ftab] || 'tab') + '</button>').join('; ') + '</div>' : '');
    return '<tr data-d2="' + esc(x.key) + '" data-adv="' + adv + '"><td><b>' + esc(x.label) + '</b>' + note + '</td><td>' + (x.fullReady ? 'Đủ' : x.nenReady ? 'Đủ để in nền' : 'Chưa đủ') + '</td><td>' + (x.printed ? (x.legacy ? 'Nền in từ trước' : 'Đã in ' + esc((x.at || '').slice(0, 10).split('-').reverse().join('/'))) : '—') + '</td>' + (same ? '' : '<td class="' + D2_TONE[adv] + '">' + D2_SHORT[adv] + '</td>') + '<td class="d2act">' + acts + '</td></tr>'; }).join('');
  const nT = plan.trang.length, nN = plan.nen.length, nD = plan.de.length + plan.kiemtra.length, full4 = plan.allFull && !absent.length;
  const absentTxt = absent.length ? '<div class="msg warn">Chưa có mục nào cho ' + absent.map(c => esc(IA.FORMS[c].label)).join(', ') + (absent.some(c => c === '09' || c === '10') ? ' (khai đội xe ở tab Vận chuyển)' : '') + '.</div>' : '';
  const summary = same ? '<div class="msg ' + D2_TONE[list[0].advice] + '" id="d2Sum">Cả ' + list.length + ' mục: ' + ({trang: 'đủ dữ liệu, chưa in nền. Nên in đầy đủ trên giấy trắng', nen: 'chưa đủ để in đầy đủ, đủ để in mẫu nền', thieu: 'chưa đủ dữ liệu để dựng cả mẫu nền', de: 'đã in nền, đủ dữ liệu. In đè phần bổ sung', cho: 'đã in nền, chờ bổ sung dữ liệu', kiemtra: 'nền in từ trước, cần đối chiếu', doibocuc: 'bố cục đã đổi sau khi in nền'}[list[0].advice]) + '.</div>' : '';
  const action = (title, sub, btns) => '<div class="docrow"><div><b>' + title + '</b><div class="mut">' + sub + '</div></div><div class="d2btns">' + btns + '</div></div>';
  return '<div class="card" id="d2Card"><h3 style="margin-top:0">In hồ sơ đợt 2 <span class="mut" style="font-weight:400">BM-08, BM-09, BM-10, BM-14</span></h3>' +
    '<p class="mut" style="margin:0 0 8px">Khi đủ dữ liệu, in đầy đủ một lần trên giấy trắng (cách A). Chưa đủ thì in mẫu nền trước, xác nhận đã in, rồi in đè phần bổ sung lên đúng tờ đó (cách B). Mẫu nền và phần in đè không có chữ “BẢN NHÁP”.</p>' +
    '<details class="d2help"><summary>Cách in chi tiết</summary><p class="mut">Cách B: in mẫu nền (số biên bản, ngày lập, khối lượng, tiền để trống), bấm “Xác nhận đã in mẫu nền”. Khi có số liệu, nạp lại tờ mẫu nền đã in vào máy in và in đè phần bổ sung, cùng khổ A4, tỉ lệ 100%, cùng máy in, đúng chiều giấy. Riêng BM-09, Bảng kê khối lượng đính kèm luôn in đầy đủ trên giấy mới. Tải file Word hoặc ZIP không làm đổi trạng thái; chỉ nút xác nhận mới ghi nhận đã in.</p></details>' +
    absentTxt + summary +
    action('Cách A: in đầy đủ đợt 2 trên giấy trắng', full4 && plan.nonePrinted ? 'Cả bốn biểu mẫu đủ điều kiện in chính thức, chưa in nền.' : nT ? nT + ' mục đủ điều kiện in chính thức (chưa in nền hoặc cần in lại).' : 'Chưa mục nào đủ điều kiện in chính thức.', ab('d2dl', 'In đầy đủ đợt 2 – dùng giấy trắng', {primary: plan.primary === 'trang', mode: 'trang', keys: keysOf(plan.trang), disabled: !nT})) +
    action('Cách B, bước 1: in mẫu nền đợt 2', (nN ? nN + ' mục đủ dữ liệu để dựng nền.' : 'Chưa mục nào đủ dữ liệu để dựng nền.') + ' Sau khi in, bấm xác nhận để app nhớ.', ab('d2dl', 'In mẫu nền đợt 2', {primary: plan.primary === 'nen', mode: 'nen', keys: keysOf(plan.nen), disabled: !nN}) + ab('d2confirm', 'Xác nhận đã in mẫu nền', {keys: keysOf(plan.nen), disabled: !nN, title: 'Ghi nhận cả bộ đã in nền; có thể xác nhận từng mẫu ở bảng dưới'})) +
    action('Cách B, bước 2: in đè phần bổ sung', (nD ? nD + ' mục đã in nền, đủ dữ liệu' + (plan.kiemtra.length ? ' (' + plan.kiemtra.length + ' mục nền in từ trước, sẽ hỏi đối chiếu)' : '') + '. Nạp lại tờ nền đã in rồi in.' : 'Chưa mục nào vừa đã in nền vừa đủ dữ liệu.') + (plan.cho.length ? ' Đang chờ dữ liệu: ' + plan.cho.length + ' mục.' : ''), ab('d2dl', 'In đè phần bổ sung', {primary: plan.primary === 'de', mode: 'de', keys: plan.de.concat(plan.kiemtra).map(x => x.key), disabled: !nD})) +
    (plan.doibocuc.length ? '<div class="msg warn" id="d2Dirty">' + plan.doibocuc.length + ' mục đã đổi bố cục sau khi in nền: không dùng phần in đè cho các mục này.</div>' : '') +
    '<table class="tbl" id="d2Table" style="width:100%;margin-top:8px"><thead><tr><th>Biểu mẫu</th><th>Dữ liệu</th><th>Mẫu nền</th>' + (same ? '' : '<th>Nên dùng</th>') + '<th>Thao tác</th></tr></thead><tbody>' + rows + '</tbody></table></div>';
}
