/* ========== 3.0: DANH SÁCH HỢP ĐỒNG → TRANG CHI TIẾT (tab Nhân công, tab Vận chuyển của mỗi rừng) ==========
 * Tab mở ra DANH SÁCH hợp đồng của rừng (Nhân công: mỗi đội một hợp đồng; Vận chuyển: mỗi đội xe một hợp đồng). Chọn một hợp đồng → trang chi tiết
 * có tên rừng, số hợp đồng và nút “Quay lại danh sách”. Hợp đồng đang mở được nhớ theo từng rừng: lưu xong vẫn ở đúng hợp đồng, đúng phần đang làm. */
var hdMoS = {};   // {mã rừng: {nc: id đội | null, dx: id hợp đồng vận chuyển | null}}
var hdMo = k => { const s = hdMoS[NAV.curF]; return (s && s[k]) || null; };
function hdMoDat(k, id) { (hdMoS[NAV.curF] = hdMoS[NAV.curF] || {})[k] = id || null; if (k === 'nc') NAV.curDoi = id || null; if (k === 'dx') NAV.curHd = id || null; }
/* hợp đồng đang mở còn trong lô (đội / hợp đồng có thể vừa bị xóa, khôi phục): trả bản ghi hoặc null (và quên id cũ) */
function hdMoHopLe(k, rec) {
  const id = hdMo(k); if (!id) return null;
  const x = (k === 'nc' ? rec.doi : rec.hdvc || []).find(d => d.id === id);
  if (!x) { hdMoDat(k, null); return null; }
  if (k === 'nc') NAV.curDoi = id; else NAV.curHd = id;
  return x;
}
var tenRungHd = rec => { const i = rec.info || {}; return [i.maRung, i.tenRung].filter(Boolean).join(' · ') || 'rừng chưa đặt tên'; };
var soHdNc = (rec, d) => { const e = Object.assign({}, rec.exp || {}, d.exp || {}); return trim(e.soKT || ''); };
var soHdVc = (rec, h) => trim(((h && h.exp) || {}).soVC || (rec.exp || {}).soVC || '');
var tenDoiNc = (rec, d) => trim(d.ten) || (rec.doi.length > 1 ? 'Đội ' + (rec.doi.indexOf(d) + 1) : 'Đội khai thác');
var tenDoiVc = (rec, h) => { const l = HAKModel.hdOrder({dx: rec.dx, hdvc: rec.hdvc}); return trim(h.ten) || (h.donViId ? (h.ben || {}).ten || '' : '') || 'Đội xe ' + (l.indexOf(h) + 1); };

/* đầu trang chi tiết: MỘT dòng — quay lại danh sách, loại hợp đồng, đội, số. Rừng / lô không lặp ở đây: đã có ở thanh ngữ cảnh và đường dẫn (phiếu #06, D-03) */
function hdDau(k, rec, ten, so) {
  return '<div class="hdDau" id="hdDau">' +
    '<button class="btn ghost sm" data-act="hdQuayLai" data-kind="' + k + '" id="hdQuayLai">← Quay lại danh sách</button>' +
    '<div class="hdDauTen"><b>' + (k === 'nc' ? 'Hợp đồng nhân công' : 'Hợp đồng vận chuyển') + '</b> · <span id="hdDauTen">' + esc(ten) + '</span> · <span id="hdDauSo">' + (so ? 'số ' + esc(so) : '<span class="mut">chưa có số</span>') + '</span></div></div>';
}

/* ---------- danh sách hợp đồng nhân công (Cha — Master Pane) ---------- */
function panelDsNC(rec, opt = {}) {
  const ds = rec.doi || [], chua = (rec.nc || []).filter(r => !ds.some(d => d.id === r.doiId)).length;
  const selId = opt.selId || '';
  const tt = d => { const x = (rec.nc || []).find(r => r.doiId === d.id && isTT(r)); return x ? x.ten : ''; };
  const ben = d => { const n = benTen(d.benNhanKhoan); if (n) return n; const t = tt(d); return t ? t + ' (TT)' : '—'; };
  const pbk = HAKPhanBo.tinh(rec), cg = pbk.cheDo === 'theoPhieu' ? chuaGanCuaLo(rec) : null;
  const kl = d => {
    const x = pbk.doi.find(y => y.id === d.id);
    if (x && x.kg > 0) return fmtT(x.kg) + ' t';
    return cg ? 'chưa gán phiếu' : '—';
  };
  const row = (d, i) => {
    const info = infoTeam(rec, d), so = soHdNc(rec, d), on = d.id === selId;
    const cnt = (rec.nc || []).filter(r => r.doiId === d.id).length;
    return '<tr class="hak-master-row' + (on ? ' on' : '') + '" data-act="chonDoi" data-doi="' + esc(d.id) + '" aria-selected="' + (on ? 'true' : 'false') + '" tabindex="0">' +
      '<td style="text-align:center">' + (i + 1) + '</td>' +
      '<td><b>' + esc(tenDoiNc(rec, d)) + '</b><br><small class="mut">' + (so ? 'HĐ ' + esc(so) : 'chưa có số') + ' · ' + (isDirect(info) ? 'Trực tiếp' : 'Giao khoán') + ' · ' + esc(ben(d)) + '</small></td>' +
      '<td style="text-align:center">' + cnt + '</td>' +
      '<td style="text-align:right;white-space:nowrap">' + kl(d) + '</td></tr>';
  };
  return '<div id="dsHdNc"><div class="hak-pane-head"><h3>Hợp đồng nhân công (' + ds.length + ')</h3></div>' +
    '<div class="hak-pane-body" style="padding:10px 12px"><div class="row" style="gap:6px;margin-bottom:8px"><input id="doiMoiTen" placeholder="Tên đội mới…" style="flex:1;min-width:110px"><button class="btn sm" data-act="themDoi">+ Thêm đội</button></div>' +
    '<div class="hak-master-list"><table id="dsHdNcTbl"><thead><tr><th>#</th><th>Hợp đồng nhân công</th><th>Người</th><th style="text-align:right">KL</th></tr></thead><tbody>' +
    (ds.length ? ds.map(row).join('') : '<tr><td colspan="4" class="mut">Chưa có đội nào: nhập tên rồi bấm “+ Thêm đội”.</td></tr>') + '</tbody></table></div>' +
    (chua ? '<div class="msg warn" style="margin-top:8px" id="dsHdNcChua">' + chua + ' người chưa thuộc đội nào.</div>' : '') + '</div></div>' +
    (ds.length ? '<div style="padding:0 12px 12px">' + panelPhanBo(rec) + '</div>' : '');
}

/* ---------- danh sách hợp đồng vận chuyển (Cha — Master Pane) ---------- */
function panelDsVC(rec, opt = {}) {
  const F = {dx: rec.dx, hdvc: rec.hdvc || []}, list = HAKModel.hdOrder(F), gs = groupsDX(rec), pc = rec.pc || [];
  const selId = opt.selId || '';
  const ky = h => { const n = benTen(h.benKy); if (n) return n;
    if (h.donViId) return (h.ben || {}).ten || '(đơn vị)'; const g = gs.find(x => x.hd === h); return g ? (g.ten || '') + ' (' + g.vaiTro + ')' : 'chưa có bên ký'; };
  const soPhieu = h => pc.filter(p => p.hdvcId === h.id).length;
  const row = (h, i) => {
    const so = soHdVc(rec, h), on = h.id === selId;
    return '<tr class="hak-master-row' + (on ? ' on' : '') + '" data-act="chonHd" data-hd="' + esc(h.id) + '" aria-selected="' + (on ? 'true' : 'false') + '" tabindex="0">' +
      '<td style="text-align:center">' + (i + 1) + '</td>' +
      '<td><b>' + esc(tenDoiVc(rec, h)) + '</b><br><small class="mut">' + (so ? 'HĐ ' + esc(so) : 'chưa có số') + ' · ' + esc(ky(h)) + ' · ' + cuocText(rec, h) + '</small></td>' +
      '<td style="text-align:center">' + HAKModel.xeOf(F, h).length + '</td>' +
      '<td style="text-align:center">' + soPhieu(h) + '</td></tr>';
  };
  const chua = (rec.dx || []).filter(r => !list.some(h => h.id === r.hdvcId)).length;
  return '<div id="dsHdVc"><div class="hak-pane-head"><h3>Hợp đồng vận chuyển (' + list.length + ')</h3></div>' +
    '<div class="hak-pane-body" style="padding:10px 12px"><div class="row" style="gap:6px;margin-bottom:8px"><input id="hdMoiTen" placeholder="Tên đội xe mới…" style="flex:1;min-width:110px"><button class="btn sm" data-act="themHd">+ Thêm HĐ</button></div>' +
    '<div class="hak-master-list"><table id="dsHdVcTbl"><thead><tr><th>#</th><th>Đội xe · Hợp đồng</th><th>Xe</th><th>Phiếu</th></tr></thead><tbody>' +
    (list.length ? list.map(row).join('') : '<tr><td colspan="4" class="mut">Chưa có hợp đồng vận chuyển: bấm “+ Thêm HĐ”.</td></tr>') + '</tbody></table></div>' +
    (chua && list.length ? '<div class="msg warn" style="margin-top:8px" id="dsHdVcChua">' + chua + ' xe chưa thuộc hợp đồng nào.</div>' : '') + '</div></div>';
}

/* bàn phím: Enter / Space trên một dòng danh sách mở hợp đồng (như bấm chuột) */
document.addEventListener('keydown', e => {
  if (e.key !== 'Enter' && e.key !== ' ') return;
  const tr = e.target && e.target.closest && e.target.closest('#dsHdNcTbl tr[data-act], #dsHdVcTbl tr[data-act]'); if (!tr || e.target !== tr) return;
  e.preventDefault(); tr.click();
});

/* ---------- người ký hợp đồng vận chuyển: từ Danh mục đối tượng (chỉ đối tượng có quyền ký Vận chuyển, không ngừng sử dụng) ----------
 * Trả dạng “đối tác” mà hợp đồng vận chuyển đã dùng (hdvc.donViId + bản chụp hdvc.ben, in đúng như trước): pháp nhân = doanh nghiệp (id cũ 'dn:…' nếu chuyển
 * từ danh mục cũ, không thì 'dt:<mã đối tượng>'); người của thể nhân = người ký cá nhân (id 'ct:<CCCD>' như cũ, không có CCCD thì 'ng:<mã người>'). */
function doiTacKyVC() {
  return HAKDoiTuong.benKy(dmDT(), 'vanChuyen').filter(({dt, ng}) => HAKNganh.hopNganh(db, dt, ng, HAKNganh.VC)).map(({dt, ng}) => ng
    ? {id: ng.cccd ? 'ct:' + ng.cccd : 'ng:' + ng.id, loai: 'nguoiKyVC', ten: ng.hoTen, cccd: ng.cccd, ngaySinh: ng.ngaySinh, ngayCap: ng.ngayCap, noiCap: ng.noiCap, diaChi: ng.diaChi, sdt: ng.sdt,
      vaiTro: ng.vaiTro && ng.vaiTro.chuXe ? 'Chủ xe' : ng.vaiTro && ng.vaiTro.taiXe ? 'Tài xế' : '', chucVu: ng.chucDanhKy || '', doiTuongId: dt.id, doiTuongTen: dt.ten, nguoiId: ng.id}
    : {id: dt.nguonCu || 'dt:' + dt.id, loai: 'doanhnghiep', ten: dt.ten, mst: dt.mst, daiDien: dt.daiDien, chucVu: dt.chucVuDaiDien, diaChi: dt.diaChi, sdt: dt.sdt, doiTuongId: dt.id});
}

/* ---------- mở Cài đặt (danh mục) từ hợp đồng / bản đang nhập rồi QUAY LẠI đúng chỗ ----------
 * Nút có data-quaylai: không hỏi Lưu / Bỏ (bản nhập dở giữ nguyên trong bộ nhớ: bản nháp của lô, xe / đối tượng đang sửa ở Cài đặt);
 * Cài đặt hiện thanh “Quay lại …” đưa về đúng rừng, tab, hợp đồng đang mở. */
var veLai = null;
function veLaiGhi(noi) {
  veLai = {noi, view: NAV.view, tab: NAV.tab, ftab: NAV.ftab, cur: typeof NAV.cur !== 'undefined' ? NAV.cur : null, curF: NAV.curF, hd: Object.assign({}, hdMoS[NAV.curF] || {}),
    ten: noi === 'setxe' ? 'Danh mục xe (xe đang nhập)' : noi === 'setdt' ? 'Danh mục đối tượng (đang sửa)' : NAV.view === 'owner' && NAV.curF ? 'hợp đồng đang mở' : 'màn trước'};
}
function veLaiThanh() {
  return veLai ? '<div class="msg" id="veLaiBar" style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin:0 0 10px"><span>Đang mở từ <b>' + esc(veLai.ten) + '</b>: bản đang nhập vẫn được giữ.</span><button class="btn sm" data-act="veLai" id="veLaiBtn">← Quay lại ' + esc(veLai.ten) +
  '</button></div>' : '';
}
function veLaiDi() {
  const v = veLai; veLai = null; if (!v) return render();
  if (v.noi === 'setxe' || v.noi === 'setdt') NAV.view = v.noi;
  else { NAV.view = v.view; NAV.tab = v.tab; NAV.ftab = v.ftab; if (v.cur != null && typeof NAV.cur !== 'undefined') NAV.cur = v.cur; NAV.curF = v.curF; hdMoS[NAV.curF] = v.hd; if (v.hd.nc) NAV.curDoi = v.hd.nc; if (v.hd.dx) NAV.curHd = v.hd.dx; }
  render();
}
document.addEventListener('click', e => {
  const el = e.target && e.target.closest && e.target.closest('[data-act=veLai]'); if (!el) return;
  e.preventDefault(); veLaiDi();
});

/* ---------- bên ký / bên nhận khoán: liên kết ID tới Danh mục đối tượng ({doiTuongId, nguoiId}) ---------- */
function benTim(b) {
  if (!b || !b.doiTuongId) return null;
  const dt = HAKDoiTuong.tim(dmDT(), b.doiTuongId); if (!dt) return null;
  const x = b.nguoiId ? HAKDoiTuong.timNguoi(dmDT(), b.nguoiId) : null;
  return {dt, ng: x ? x.ng : null};
}
function benTen(b) { const x = benTim(b); if (!x) return ''; return x.ng ? HAKDoiTuong.nhanNguoi(x.dt, x.ng) : x.dt.ten + (x.dt.daiDien ? ' (đại diện: ' + x.dt.daiDien + ')' : ''); }
/* giá trị ô chọn ↔ liên kết: 'dt:<id>' (pháp nhân) | 'ng:<id>' (người của thể nhân) */
var benGiaTri = b => !b || !b.doiTuongId ? '' : b.nguoiId ? 'ng:' + b.nguoiId : 'dt:' + b.doiTuongId;
function benTuGiaTri(v) {
  v = String(v || '');
  if (v.startsWith('ng:')) { const x = HAKDoiTuong.timNguoi(dmDT(), v.slice(3)); return x ? {doiTuongId: x.dt.id, nguoiId: x.ng.id} : null; }
  if (v.startsWith('dt:')) { const dt = HAKDoiTuong.tim(dmDT(), v.slice(3)); return dt ? {doiTuongId: dt.id, nguoiId: ''} : null; }
  return null;
}
/* ô “Bên nhận khoán” của hợp đồng nhân công (giao khoán): đối tượng có quyền ký Nhân công */
function benNhanKhoanHtml(t) {
  const L = HAKDoiTuong.benKy(dmDT(), 'nhanCong').filter(({dt, ng}) => HAKNganh.hopNganh(db, dt, ng, HAKNganh.KT)), cur = benGiaTri(t.benNhanKhoan);
  return '<label><span>Bên nhận khoán (đối tượng có quyền ký Nhân công)</span><select name="benNK"><option value="">— Tổ trưởng của đội (như trước) —</option>' +
    L.map(({dt, ng, nhan}) => { const v = ng ? 'ng:' + ng.id : 'dt:' + dt.id; return '<option value="' + esc(v) + '"' + (v === cur ? ' selected' : '') + '>' + esc(nhan) + '</option>'; }).join('') +
    (cur && !L.some(({dt, ng}) => (ng ? 'ng:' + ng.id : 'dt:' + dt.id) === cur) ? '<option value="' + esc(cur) + '" selected>' + esc(benTen(t.benNhanKhoan) || '(đã ngừng / không còn quyền ký)') + '</option>' : '') +
    '</select><small class="mut">Chưa có? <button type="button" class="btn ghost sm" data-act="openSetDt" data-quaylai="nc">Mở Danh mục đối tượng</button></small></label>';
}
/* bên nhận khoán: danh mục đã đổi sau khi chụp (cập nhật có chủ ý); thông tin còn thiếu để in */
function benNhanKhoanCanhBao(rec, t) {
  const c = t.benNhanKhoanBan, thieu = benNhanKhoanThieu(c);
  return (benNhanKhoanLech(t) ? '<div class="msg warn" id="benNKDoi" style="grid-column:1/-1">Danh mục đã sửa thông tin bên nhận khoán sau khi chọn: hợp đồng vẫn in thông tin lúc chọn. <button type="button" class="btn ghost sm" data-act="benNKCapNhat">Cập nhật theo danh mục</button></div>' : '') +
    (c && thieu.length ? '<div class="msg err" id="benNKThieu" style="grid-column:1/-1">Bên nhận khoán còn thiếu ' + esc(thieu.join(', ')) + ': bổ sung ở Danh mục đối tượng rồi “Cập nhật theo danh mục” trước khi xuất bản chính thức.</div>' : '') +
    (c ? '<div class="mut" id="benNKIn" style="grid-column:1/-1">Bản in: <b>' + esc(c.ten) + '</b>' + (c.loai === 'phapnhan' ? ' · MST ' + esc(c.mst || '…') + ' · đại diện ' + esc(c.daiDien || '…') + (c.chucVu ? ' (' + esc(c.chucVu) + ')' : '') : (c.cccd ? ' · CCCD ' + esc(c.cccd) : '') + (c.chucVu ? ' (' + esc(c.chucVu) + ')' : '')) +
    '. Tổ trưởng vẫn đứng tên ở các mục của đội (danh sách, ủy quyền, chấm công).</div>' : '');
}
/* Bên nhận khoán không nhất thiết là Tổ trưởng: ký hợp đồng khoán nhân công AI ký cũng được (quyết định của chủ). Không còn cảnh báo vàng “chưa là Tổ trưởng”;
 * dòng trung tính #benNKIn ở trên nêu tên, chức vụ (nếu có) và nhắc Tổ trưởng vẫn đứng tên ở các mục của đội. */

/* ---------- BẢN CHỤP BÊN NHẬN KHOÁN (in biểu mẫu giao khoán) ----------
 * pháp nhân: {loai:'phapnhan', ten, mst, diaChi, sdt, daiDien, chucVu}; thể nhân: {loai:'canhan', ten (họ tên), danhXung, ngaySinh, cccd, ngayCap, noiCap, diaChi, sdt, chucVu (chức danh khi ký), doiTuongTen} */
function benNhanKhoanChup(b) {
  const x = benTim(b); if (!x) return null;
  if (!x.ng) return {loai: 'phapnhan', ten: x.dt.ten || '', mst: x.dt.mst || '', diaChi: x.dt.diaChi || '', sdt: x.dt.sdt || '', daiDien: x.dt.daiDien || '', chucVu: x.dt.chucVuDaiDien || ''};
  const p = x.ng; return {loai: 'canhan', ten: p.hoTen || '', danhXung: p.gioiTinh === 'Nữ' ? 'Bà' : p.gioiTinh === 'Nam' ? 'Ông' : '', ngaySinh: p.ngaySinh || '', cccd: p.cccd || '', ngayCap: p.ngayCap || '', noiCap: p.noiCap || '', diaChi: p.diaChi || x.dt.diaChi || '', sdt: p.sdt || '',
  chucVu: p.chucDanhKy || '', doiTuongTen: x.dt.ten || ''};
}
/* thông tin còn thiếu để in bên nhận khoán (theo bản chụp): [tên trường] */
function benNhanKhoanThieu(c) {
  if (!c) return [];
  const k = c.loai === 'phapnhan' ? [['ten', 'tên pháp nhân'], ['mst', 'mã số thuế'], ['diaChi', 'địa chỉ trụ sở'], ['daiDien', 'người đại diện'], ['chucVu', 'chức danh người đại diện']]
    : [['ten', 'họ tên'], ['cccd', 'số CCCD'], ['ngayCap', 'ngày cấp CCCD'], ['noiCap', 'nơi cấp CCCD'], ['diaChi', 'địa chỉ thường trú']];
  return k.filter(([f]) => !trim(c[f] || '')).map(([, t]) => t);
}
/* danh mục đã đổi so với bản chụp đang in */
function benNhanKhoanLech(t) { const c = t && t.benNhanKhoanBan, m = t && benNhanKhoanChup(t.benNhanKhoan); if (!c || !m) return false; return JSON.stringify(c) !== JSON.stringify(m); }
document.addEventListener('click', e => {   // cập nhật bản chụp bên nhận khoán theo danh mục (có chủ ý)
  const el = e.target && e.target.closest && e.target.closest('[data-act=benNKCapNhat]'); if (!el) return;
  const f = curForest(), t = f && curTeam(f); if (!t || !t.benNhanKhoan || loKhoa(f)) return;
  t.benNhanKhoanBan = benNhanKhoanChup(t.benNhanKhoan); persistLo(); note('Đã cập nhật thông tin bên nhận khoán theo Danh mục đối tượng (chưa lưu).', 'ok'); render();
});
