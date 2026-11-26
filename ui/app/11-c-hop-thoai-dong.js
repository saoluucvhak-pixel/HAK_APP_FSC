/* ----- hộp thoại thêm / sửa một dòng ----- */
const ST_FIELDS = {
  nc: [['vaiTro', 'Chức vụ', ['Tổ trưởng', 'Công nhân']], ['stt', 'STT'], ['danhXung', 'Danh xưng', ['Ông', 'Bà']], ['ten', 'Họ và tên'], ['ngaySinh', 'Ngày sinh (dd/mm/yyyy)'], ['cccd', 'CCCD (12 số; CMND 9 số)'], ['ngayCap', 'Ngày cấp CCCD'], ['noiCap', 'Nơi cấp'], ['diaChi', 'Địa chỉ thường trú'],
  ['chucDanh', 'Vị trí', () => chucDanhAll()], ['doi', 'Đội (trống: vào đội đang chọn ở bảng Nhân công khai thác; ghi đúng tên đội để vào đội đó)']],
  dx: [['stt', 'STT'], ['bienSo', 'Biển kiểm soát'], ['loaiXe', 'Loại xe'], ['chuXe', 'Chủ xe'], ['ngaySinh', 'Ngày sinh chủ xe'], ['cccd', 'CCCD chủ xe'], ['ngayCap', 'Ngày cấp CCCD'], ['noiCap', 'Nơi cấp'], ['diaChi', 'Thường trú chủ xe'], ['cavet', 'Ngày cấp cà vẹt'], ['sdt', 'Số điện thoại'],
  ['nguoiKy', 'Người ký HĐ vận chuyển', ['Chủ xe', 'Tài xế']],
    ['taiXe', 'Tên tài xế'], ['ngaySinhTx', 'Ngày sinh tài xế'], ['cccdTx', 'CCCD tài xế'], ['ngayCapTx', 'Ngày cấp CCCD tài xế'], ['noiCapTx', 'Nơi cấp CCCD tài xế'], ['diaChiTx', 'Thường trú tài xế'], ['gplx', 'Số GPLX'], ['hanGplx', 'Ngày đến hạn GPLX'], ['hanBH', 'Ngày đến hạn bảo hiểm'],
    ['kdTu', 'Kiểm định từ ngày'], ['kdDen', 'Kiểm định đến ngày']],
  pc: [['soPhieu', 'Số phiếu'], ['ngay', 'Ngày cân 1 (dd/mm/yyyy)'], ['bienSo', 'Xe (biển số)', 'XE'], ['gioCan1', 'Giờ cân 1'], ['ngay2', 'Ngày cân 2 (dd/mm/yyyy; để trống = tự suy ra từ giờ cân)'], ['gioCan2', 'Giờ cân 2'], ['can1', 'Cân lần 1 (kg)'], ['can2', 'Cân lần 2 (kg)'], ['klKg',
  'Khối lượng (kg)'], ['kl', 'Khối lượng (tấn)'], ['khachHang', 'Khách hàng'], ['diaChi', 'Địa chỉ rừng trên phiếu'], ['donGia', 'Đơn giá (đồng/tấn)'], ['thanhTien', 'Thành tiền (đồng)'], ['nguonGoc', 'Nguồn gốc'], ['soCT', 'Số chứng từ'], ['trangThai', 'Trạng thái (OK hoặc trống = in)'], ['noiGiao',
  'Nơi giao (nhà máy)'], ['ghiChu', 'Ghi chú']]
};
const ST_NORM = {nc: normNC, dx: normDX, pc: normPC};
const stm = {kind: '', id: null, vals: {}, parent: null, errs: [], kyKhac: '', kyKhacMo: false};   // trạng thái hộp thoại đang mở (parent: hộp thoại phiếu cân chờ quay lại sau khi thêm xe)
const stStr = v => v == null ? '' : typeof v === 'number' ? String(v).replace('.', ',') : String(v);
function stAct(act, el) {
  const kind = el.dataset.kind, i = el.dataset.i != null ? +el.dataset.i : null;
  if (act !== 'stSave' && act !== 'stClose') pcGanBao = null;   // 3.0: khung xem trước phiếu nạp chỉ hiện ngay sau lượt nạp; thao tác khác trên bản nháp thì ẩn (bấm Lưu bị chặn vẫn giữ để xử lý)
  if (act === 'stAdd') return stOpen(kind, null);
  if (act === 'stEdit') return stOpen(kind, i);
  if (act === 'stDel') return stDelete(kind, i);
  if (act === 'stRestore') { HAKStage.restoreRow(stCur(), kind, el.dataset.id); stErrList = null; loSaveIssue = null; return render(); }
  if (act === 'stAddXe') { stOpen('dx', null); stm.vals.bienSo = el.dataset.bien || ''; return stRender(); }
  if (act === 'stPend') return stPendAct(el);
  if (act === 'stSave') return stSave();
  if (act === 'stDiscard') return stDiscard();
  if (act === 'stGo') { const st = stCur(), k = st ? HAKStage.dirtyKinds(st)[0] : null; if (k) { NAV.ftab = ST_TAB[k]; render(); } return; }
  if (act === 'stClose') { const parent = stm.parent; $('#stBox').classList.remove('on'); stm.parent = null; if (parent) { const st = stCur(); stOpen(parent.kind, parent.id ? st.cur[parent.kind].findIndex(r => r._id === parent.id) : null, parent.vals); } }
}
function stApplyGate() {
  if (!stDirtyCur()) return; const why = stBlockText();
  document.querySelectorAll('#main button[data-act=dl], #main button[data-act=d2dl], #main button[data-act=d2confirm], #main button[data-act=d2legacy], #main button[data-act=pcPrint], #main button[data-act=ccPrint]').forEach(b => { b.disabled = true; b.title = why; });
}
function stOpen(kind, idx, vals, parent) {
  const st = stGet(true); if (!st) return;
  const row = idx != null ? st.cur[kind][idx] : null;
  stm.kind = kind; stm.id = row ? row._id : null; stm.parent = parent || null; stm.errs = []; stm.kyKhac = ''; stm.kyKhacMo = false;
  stm.vals = vals || Object.fromEntries(ST_FIELDS[kind].map(([k]) => [k, row ? stStr(row[k]) : (k === 'nguoiKy' ? 'Chủ xe' : k === 'vaiTro' ? 'Công nhân' : k === 'danhXung' ? 'Ông' : '')]));
  if (!row && !vals && kind === 'pc') stm.vals.trangThai = 'OK';
  stRender();
}
function stRender() {
  const kind = stm.kind, st = stCur(), rec = curRec(), o = curOwner(); if (!st || !rec) return;
  const plates = [...new Set(st.cur.dx.map(x => x.bienSo).filter(Boolean))];
  const daLuu = kind === 'pc' && stm.id && st.base.pc.some(b => b._id === stm.id);   // ô Số phiếu của dòng ĐÃ LƯU bị khóa: đổi số phải qua “Đổi số phiếu” (có lý do, có nhật ký)
  const fld = ([k, label, opt]) => {
    const v = stm.vals[k] == null ? '' : stm.vals[k];
    if (daLuu && k === 'soPhieu') return '<label><span>' + esc(label) + ' (đã lưu: chỉ đổi qua nút bên cạnh)</span><span class="row" style="gap:6px;flex-wrap:nowrap"><input name="' + k + '" value="' + esc(v) + '" readonly aria-readonly="true" style="flex:1"><button type="button" class="btn ghost sm" data-act="pcDoiSoForm">Đổi số phiếu…</button></span></label>';
    if (opt === 'XE') return '<label><span>' + esc(label) + '</span><select name="' + k + '">' + '<option value="">— chọn xe của lô —</option>' + plates.map(p => '<option value="' + esc(p) + '"' + (HAKStage.bienKey(p) === HAKStage.bienKey(v) ? ' selected' : '') + '>' + esc(p) +
    '</option>').join('') + (v && !plates.some(p => HAKStage.bienKey(p) === HAKStage.bienKey(v)) ? '<option value="' + esc(v) + '" selected>' + esc(v) + ' (chưa có trong lô)</option>' : '') + '<option value="__new">+ Thêm xe mới…</option></select></label>';
    if (opt) { const list = typeof opt === 'function' ? opt() : opt;
    return '<label><span>' + esc(label) + '</span><select name="' + k + '">' + (list.includes(v) ? '' : '<option value="">—</option>') + list.map(x => '<option' + (x === v ? ' selected' : '') + '>' + esc(x) + '</option>').join('') + '</select></label>'; }
    return '<label><span>' + esc(label) + '</span><input name="' + k + '" value="' + esc(v) + '"></label>';
  };
  const title = (stm.id ? 'Sửa ' : 'Thêm ') + ST_LABEL[kind];
  $('#stBody').innerHTML = '<div class="gh"><h2>' + title + '</h2><button class="btn ghost sm" data-act="stClose">✕ Đóng</button></div>' +
    '<p class="mut" style="margin:0 0 8px">Chủ rừng: <b>' + esc(o.info.ten) + '</b> · Lô: <b>' + esc(rec.info.maRung) + '</b>. Dòng này chỉ vào bản nháp; hồ sơ lô thay đổi khi bấm “Lưu dữ liệu vào lô”.</p>' +
    (stm.errs.length ? '<div class="msg err"><b>Chưa đưa vào bản nháp:</b><ul class="issues">' + stm.errs.map(e => '<li>' + esc(e) + '</li>').join('') + '</ul></div>' : '') +
    (kind === 'dx' && !stm.id ? (() => { const hId = hdMo('dx'), daCo = new Set(st.cur.dx.filter(r => hId && r.hdvcId === hId).map(r => HAKStage.bienKey(r.bienSo))), L = dmNguonXe().filter(x => !daCo.has(HAKStage.bienKey(x.bienSo)));
    /* 3.0: mỗi xe một lần trong một hợp đồng */ return L.length ? '<label style="display:block;margin-bottom:8px"><span>Chọn xe từ Danh mục xe vận chuyển (thông tin mới nhất)</span><input type="search" class="locNhanh" data-locsel="xeDm" placeholder="Gõ biển số hoặc tên chủ xe để lọc…" autocomplete="off" aria-label="Lọc xe trong danh mục"><select id="xeDm"><option value="">— nhập xe mới (tự vào Danh mục khi lưu lô) —</option>' +
    L.map(x => '<option value="' + esc(HAKStage.bienKey(x.bienSo)) + '">' + esc(x.bienSo + ' · ' + (x.chuXe || '')) + '</option>').join('') + '</select></label>' : '';
    })() : '') +
    (kind === 'nc' && !stm.id ? (() => { const dId = (curTeam() || {}).id, daCo = new Set(st.cur.nc.filter(r => !rec.doi || rec.doi.length < 2 || r.doiId === dId).map(r => HAKModel.cccdSo(r.cccd))), L = dmNguonLd().filter(r => !daCo.has(HAKModel.cccdSo(r.cccd)));   // 3.0: không trùng trong cùng đội; người ở đội khác vẫn chọn được, có ghi chú
      const doiKhac = c => { const x = st.cur.nc.find(r => HAKModel.cccdSo(r.cccd) === c); const d = x && (rec.doi || []).find(y => y.id === x.doiId); return d ? ' — đang ở ' + (d.ten || 'đội khác') : ''; };
      return L.length ? '<label style="display:block;margin-bottom:8px"><span>Chọn người từ Danh mục đối tượng (theo CCCD, thông tin mới nhất)</span><input type="search" class="locNhanh" data-locsel="ncDm" placeholder="Gõ tên hoặc CCCD để lọc…" autocomplete="off" aria-label="Lọc người trong danh mục"><select id="ncDm"><option value="">— nhập người mới (tự vào Danh mục khi lưu lô) —</option>' + L.map(r => '<option value="' +
      esc(HAKModel.cccdSo(r.cccd)) + '">' + esc((r._nhan || r.ten) + ' · CCCD ' + HAKModel.cccdSo(r.cccd) + doiKhac(HAKModel.cccdSo(r.cccd))) + '</option>').join('') +
      '</select><small class="mut">Điền sẵn họ tên, ngày sinh, CCCD, ngày cấp, nơi cấp, địa chỉ; chức vụ, vị trí và đội chọn cho lô này. Thông tin được chụp lại trong lô, sửa ở lô này không đổi lô khác.</small></label>' : '';
      })() : '') +
    '<form id="stForm" class="grid">' + (kind === 'dx' ? dxFormHtml(fld) : ST_FIELDS[kind].map(fld).join('')) + '<div style="grid-column:1/-1" class="row"><button class="btn" type="submit">' + (stm.id ? 'Cập nhật vào bản nháp' : 'Thêm vào bản nháp') + '</button><button class="btn ghost" type="button" data-act="stClose">Hủy</button></div></form>';
  $('#stBox').classList.add('on');
}
/* 3.5.1: FORM THÊM XE theo khối — Phương tiện / Chủ xe / Tài xế / Người ký. Chủ xe và tài xế CHỌN từ Danh mục đối tượng; CCCD, ngày sinh, địa chỉ, GPLX tự điền (chụp vào dòng xe của lô,
 * không đổi danh mục). Các ô chi tiết giữ tên trường cũ để sửa tay khi người chưa có trong danh mục. */
/* “Chỉ định người khác…”: người ký của CẢ ĐỘI XE (hợp đồng vận chuyển đang mở) là một người / doanh nghiệp có quyền ký Vận chuyển trong Danh mục đối tượng, không phải chủ xe hay tài xế của xe này; áp dụng khi bấm “Thêm vào bản nháp” */
function dxKyKhacOpts() {
  const dv = dmDoiTacAll().filter(x => x && x.loai === 'doanhnghiep');
  return dv.map(d => ({v: 'd:' + HAKDanhMuc.chuanDoiTacId(d.id), t: d.ten + (d.daiDien ? ' (đại diện: ' + d.daiDien + ')' : '') + ' · doanh nghiệp'})).concat(dmCaNhan().map(d => ({v: 'd:' + HAKDanhMuc.chuanDoiTacId(d.id), t: (d.doiTuongTen && d.doiTuongTen !== d.ten ? d.doiTuongTen + ' — ' : '') + d.ten + (d.cccd ? ' · CCCD ' + d.cccd : '')})));
}
function dxKyKhacHtml() {
  if (!stm.kyKhacMo || !hdMo('dx')) return '';
  const L = dxKyKhacOpts();
  return '<div id="dxKyKhacBox" class="row" style="gap:8px;margin-top:8px;flex-wrap:wrap;align-items:flex-end"><label style="flex:1;min-width:240px"><span>Người ký của đội xe (quyền ký Vận chuyển)</span><input type="search" class="locNhanh" data-locsel="dxKyKhac" placeholder="Gõ tên hoặc CCCD để lọc…" autocomplete="off" aria-label="Lọc người ký"><select id="dxKyKhac"><option value="">— chọn người ký —</option>' +
    L.map(o => '<option value="' + esc(o.v) + '"' + (o.v === stm.kyKhac ? ' selected' : '') + '>' + esc(o.t) + '</option>').join('') + '</select></label><button type="button" class="btn ghost sm" data-act="kyThemNhanh">+ Thêm người ký</button></div>' +
    '<p class="mut" style="margin:4px 0 0">Áp dụng cho cả đội xe đang mở khi bấm “Thêm vào bản nháp”. Chưa chọn thì giữ người ký hiện có.</p>';
}
const dxChonChu = () => HAKXeDM.chonChuXe(dmDT()), dxChonTx = () => HAKXeDM.chonTaiXe(dmDT());
function dxChuDangChon(v) {
  const so = HAKModel.cccdSo(v.cccd || ''), ten = trim(v.chuXe || '');
  const c = dxChonChu().find(x => { const h = HAKXeDM.chuXe(dmDT(), x.id); return h && ((so && HAKModel.cccdSo(h.cccd || '') === so) || (!so && ten && trim(h.ten) === ten)); });
  return c ? c.id : '';
}
function dxTxDangChon(v) {
  if (v.taiXeId && dxChonTx().some(x => x.id === v.taiXeId)) return v.taiXeId;
  const so = HAKModel.cccdSo(v.cccdTx || ''); if (!so) return '';
  const c = dxChonTx().find(x => { const h = HAKXeDM.taiXe(dmDT(), x.id); return h && HAKModel.cccdSo(h.cccd || '') === so; });
  return c ? c.id : '';
}
function dxDienChu(id) {   // chọn chủ xe: chụp thông tin từ Danh mục đối tượng (chọn lại trống: giữ nguyên các ô để sửa tay)
  const c = id ? HAKXeDM.chuXe(dmDT(), id) : null; if (!c) return;
  const ng = c.ng || {}, dt = c.dt || {};
  Object.assign(stm.vals, {chuXe: c.ten || '', ngaySinh: ng.ngaySinh || '', cccd: ng.cccd || '', ngayCap: ng.ngayCap || '', noiCap: ng.noiCap || '', diaChi: ng.diaChi || dt.diaChi || '', sdt: ng.sdt || dt.sdt || ''});
}
function dxDienTx(id) {
  const c = id ? HAKXeDM.taiXe(dmDT(), id) : null; if (!c) return;
  ['taiXe', 'ngaySinhTx', 'cccdTx', 'ngayCapTx', 'noiCapTx', 'diaChiTx', 'gplx', 'hanGplx'].forEach(k => { stm.vals[k] = ''; });
  Object.assign(stm.vals, {ngaySinhTx: c.ng.ngaySinh || ''}, HAKXeDM.dienTaiXeLo(c.ng, {}, id));
}
const dxThe = (a, nhan) => !a ? '' : '<div class="dxThe mut" style="grid-column:1/-1;border:1px dashed var(--line);border-radius:6px;padding:6px 10px">' + nhan.filter(([, v]) => trim(v)).map(([k, v]) => '<span style="margin-right:12px"><b>' + k + ':</b> ' + esc(v) + '</span>').join('') + '</div>';
function dxFormHtml(fld) {
  const v = stm.vals, F = (k, label) => fld([k, label]), chu = dxChuDangChon(v), tx = dxTxDangChon(v);
  const sel = (id, name, list, cur, ph) => '<label style="grid-column:1/-1"><span>' + name + '</span><input type="search" class="locNhanh" data-locsel="' + id + '" placeholder="Gõ tên, CCCD hoặc biển số để lọc…" autocomplete="off" aria-label="Lọc: ' + name + '"><select id="' + id + '"><option value="">' + ph + '</option>' + list.map(x => '<option value="' + esc(x.id) + '"' + (x.id === cur ? ' selected' : '') + '>' + esc(x.nhan) + '</option>').join('') + '</select></label>';
  const blk = (ten, noi) => '<fieldset class="dxKhoi" style="grid-column:1/-1;border:1px solid var(--line);border-radius:8px;margin:0;padding:8px 10px"><legend><b>' + ten + '</b></legend><div class="grid">' + noi + '</div></fieldset>';
  const kyOpt = ['Chủ xe', 'Tài xế'].map(x => seg30('radio', 'nguoiKy', x, (v.nguoiKy || 'Chủ xe') === x, x)).join('');
  return blk('Phương tiện', F('bienSo', 'Biển kiểm soát (*)') + F('loaiXe', 'Loại xe') + F('kdDen', 'Kiểm định đến ngày') + F('hanBH', 'Bảo hiểm đến ngày') + F('cavet', 'Ngày cấp cà vẹt') + '<span style="grid-column:1/-1"><button type="button" class="btn ghost sm" data-act="dxThemXeDm" id="dxThemXeDm" title="Lưu xe này (biển số, loại xe, hạn kiểm định, hạn bảo hiểm, chủ xe đã chọn) vào Danh mục xe ngay bây giờ">+ Thêm xe mới vào danh mục</button></span>') +
    blk('Chủ xe', sel('xeChuDm', 'Chọn chủ xe từ Danh mục đối tượng', dxChonChu(), chu, '— nhập tay (người chưa có trong danh mục) —') +
      '<span style="grid-column:1/-1"><button type="button" class="btn ghost sm" data-act="dxThemNguoi" data-vt="chuXe">+ Thêm chủ xe mới</button></span>' + dxThe(chu, [['Họ tên', v.chuXe], ['CCCD', v.cccd], ['Ngày cấp', v.ngayCap], ['Nơi cấp', v.noiCap], ['SĐT', v.sdt]]) + '<details style="grid-column:1/-1"' + (chu ? '' : ' open') + '><summary class="mut">Thông tin chủ xe' + (chu ? ' (tự điền từ Danh mục; mở để sửa tay)' : '') + '</summary><div class="grid">' + F('chuXe', 'Chủ xe') + F('ngaySinh', 'Ngày sinh chủ xe') + F('cccd', 'CCCD chủ xe') + F('ngayCap', 'Ngày cấp CCCD') + F('noiCap', 'Nơi cấp') + F('diaChi', 'Thường trú chủ xe') + F('sdt', 'Số điện thoại') + '</div></details>') +
    blk('Tài xế', sel('xeTxDm', 'Chọn tài xế từ Danh mục đối tượng', dxChonTx(), tx, '— nhập tay (người chưa có trong danh mục) —') +
      '<span style="grid-column:1/-1"><button type="button" class="btn ghost sm" data-act="dxThemNguoi" data-vt="taiXe">+ Thêm tài xế mới</button></span>' + dxThe(tx, [['Họ tên', v.taiXe], ['CCCD', v.cccdTx], ['Ngày cấp', v.ngayCapTx], ['Nơi cấp', v.noiCapTx], ['Số GPLX', v.gplx], ['Hạn GPLX', v.hanGplx]]) + '<details style="grid-column:1/-1"' + (tx ? '' : ' open') + '><summary class="mut">Thông tin tài xế' + (tx ? ' (tự điền từ Danh mục; mở để sửa tay)' : '') + '</summary><div class="grid">' + F('taiXe', 'Tên tài xế') + F('ngaySinhTx', 'Ngày sinh tài xế') + F('cccdTx', 'CCCD tài xế') + F('ngayCapTx', 'Ngày cấp CCCD tài xế') + F('noiCapTx', 'Nơi cấp CCCD tài xế') + F('diaChiTx', 'Thường trú tài xế') + F('gplx', 'Số GPLX') + F('hanGplx', 'Ngày đến hạn GPLX') + '</div></details>') +
    '<div style="grid-column:1/-1">' + segNhom('Người ký HĐ vận chuyển:', 'dxNguoiKy', kyOpt + (hdMo('dx') ? '<button type="button" class="segOp segNut' + (stm.kyKhacMo ? ' on' : '') + '" data-act="dxKyKhacToggle" id="dxKyKhacBtn" aria-pressed="' + !!stm.kyKhacMo + '">Chỉ định người khác…</button>' : '')) + dxKyKhacHtml() + '</div>';
}
/* DANH MỤC XE: xe đã nhập ở mọi lô, gộp theo biển số (lô có ngày bắt đầu khai thác mới nhất thắng); chọn khi thêm xe để khỏi nhập lại giấy tờ */
function xeDanhMuc() {
  const by = new Map(), dk = s => { const p = HAKDates.parse(s || ''); return p ? p.y * 10000 + p.m * 100 + p.d : 0; };
  Object.values(db.rs || {}).forEach(o => forestList(o).forEach(f => (f.dx || []).forEach(r => { const k = HAKStage.bienKey(r.bienSo); if (!k) return; const t = dk((f.info || {}).tuNgay), cur = by.get(k); if (!cur || t >= cur.t) by.set(k, {t, r}); })));
  return [...by.values()].map(x => x.r).sort((a, b) => String(a.bienSo).localeCompare(String(b.bienSo)));
}
function stRead() { const f = $('#stForm'); if (!f) return stm.vals; const fd = new FormData(f); ST_FIELDS[stm.kind].forEach(([k]) => { if (fd.has(k)) stm.vals[k] = (fd.get(k) ?? '').toString(); }); return stm.vals; }
function stFinishRow() {
  const kind = stm.kind, st = stCur(), rec = curRec(); if (!st || !rec) return;
  const vals = stRead(), o = Object.assign({}, vals, {maRung: rec.info.maRung}); if (o.bienSo === '__new') o.bienSo = '';
  const row = ST_NORM[kind](o); const idx = stm.id ? st.cur[kind].findIndex(r => r._id === stm.id) : -1;
  const old = idx >= 0 ? st.cur[kind][idx] : null; if (kind === 'pc') HAKPhieuCan.chuanHoaNgay2(row, old);   // ngày cân 2 trống thì suy ra từ ngày cân 1 và giờ cân
   row._row = old ? old._row : st.cur[kind].reduce((m, r) => Math.max(m, +r._row || 0), 1) + 1; if (old) row._id = old._id;
  if (kind === 'nc' && rec.doi) { const m = trim(row.doi) && rec.doi.find(d => HAKDoi.fold(d.ten) === HAKDoi.fold(row.doi)), t = curTeam(); row.doiId = m ? m.id : old && old.doiId !== undefined ? old.doiId : (t ? t.id : ''); }   // đội của người: cột Đội khớp tên đội → đội đó; sửa người cũ → giữ đội; người mới → đội đang chọn
  const list = st.cur[kind].slice(); if (idx >= 0) list[idx] = row; else list.push(row);
  const reMine = new RegExp('(?:^Dòng\\s+' + row._row + ':|\\bdòng\\s+' + row._row + '\\b)', 'i');
  const chk = ST_CHECK[kind](kind === 'nc' ? Object.assign({}, stJob(rec), ganDoi(rec.doi, list)) : Object.assign({}, stJob(rec), {[kind]: list})), mine = chk.errs.filter(m => reMine.test(m));
  if (mine.length) { stm.errs = mine; return stRender(); }
  if (kind === 'dx' && old && HAKStage.bienKey(old.bienSo) !== HAKStage.bienKey(row.bienSo)) {
    const lk = HAKStage.linkedPc(st, old.bienSo);
    if (lk.length && !confirm('Đổi biển số xe ' + old.bienSo + ' → ' + row.bienSo + ' sẽ đổi biển số của ' + lk.length + ' phiếu cân liên kết:\n' + lk.slice(0, 12).map(p => '• ' + p.soPhieu + ' (' + p.ngay + ', ' + fmtT(Math.round((+p.kl || 0) * 1000)) + ' tấn)').join('\n') + (lk.length > 12 ?
    '\n• … và ' + (lk.length - 12) + ' phiếu khác' : '') + '\n\nSố chuyến, khối lượng và tiền không đổi. Tiếp tục?')) return;
  }
  row._nguon = old && old._nguon ? old._nguon : 'Nhập tay';
  if (old && old.id && !row.id) row.id = old.id;
  if (old && old.soCu && !row.soCu) row.soCu = JSON.parse(JSON.stringify(old.soCu));   // biểu mẫu không mang soCu: giữ vết đổi số của phiếu
  if (kind === 'pc') { ['hdvcId', 'xeRowId', 'xeTay'].forEach(k => { if (old && old[k] && !row[k]) row[k] = old[k]; }); if (!old && hdMo('dx')) { const f = curForest(), c = f && phieuDich(f, st.cur.dx, hdMo('dx'), row.bienSo); if (c) { row.hdvcId = c.hdvcId;
  if (c.xe && c.xe.id) row.xeRowId = c.xe.id; } } }   // 3.0: phiếu thêm tay ở hợp đồng đang mở   // 3.0: ID dòng (chấm công, phiếu cân, phân bổ nối theo ID) không đổi khi sửa
  ['nguoiId', 'viTriId', 'xeId', 'taiXeId'].forEach(k => { const v = vals[k] != null ? vals[k] : old && old[k]; if (v) row[k] = v; });   // 3.0: liên kết danh mục (chọn từ danh mục; sửa tay giữ liên kết)
  { const dmN = vals._dmNgay != null ? vals._dmNgay : old && old._dmNgay; if (dmN != null && (kind === 'nc' || kind === 'dx')) row._dmNgay = dmN; }   // ngày chụp danh mục: giữ khi sửa tay, mới khi chọn từ danh mục
  if (!old && kind === 'dx') pgSauThemXe(st, row);   // 3.0: xe thêm ở hợp đồng đang mở vào đúng hợp đồng, có ID dòng; phiếu chờ xe nhận xe này
  if (!old) skGhi(st, kind, 'Nhập tay', 1);
  if (old) HAKStage.updateRow(st, kind, old._id, row); else { const nid = HAKStage.addRow(st, kind, row); if (kind === 'pc' && hdMo('dx')) pcGanThem(nid); }   // 3.0: phiếu nhập tay cũng hiện ở khung xem trước (cùng quy tắc hợp đồng đích)
  st.src[kind] = st.src[kind] || 'Nhập tay';
  if (kind === 'dx' && stm.kyKhac && hdMo('dx')) { const er = kyDatHd(hdMo('dx'), stm.kyKhac); if (er) pushNote('Chưa đổi được người ký của đội xe: ' + er, 'err'); }   // “Chỉ định người khác…”
  stm.kyKhac = ''; stm.kyKhacMo = false;
  stErrList = null; loSaveIssue = null; const parent = stm.parent; stm.errs = []; $('#stBox').classList.remove('on');
  if (parent) { parent.vals.bienSo = row.bienSo; stOpen(parent.kind, parent.id ? st.cur[parent.kind].findIndex(r => r._id === parent.id) : null, parent.vals); return; }
  render();
}
function stDelete(kind, i) {
  const st = stGet(true), r = st && st.cur[kind][i]; if (!r) return;
  const base = st.base[kind].some(b => b._id === r._id);
  if (kind === 'dx') { const lk = HAKStage.linkedPc(st, r.bienSo); if (lk.length) { alert('Không xóa được xe ' + r.bienSo + ': còn ' + lk.length + ' phiếu cân liên kết.\n\n' + lk.slice(0,
  15).map(p => '• ' + p.soPhieu + ' (' + p.ngay + ')').join('\n') + (lk.length > 15 ? '\n• … và ' + (lk.length - 15) + ' phiếu khác' : '') + '\n\nXử lý (sửa sang xe khác hoặc xóa) các phiếu này ở mục Phiếu cân trước.'); return; } }
  if (kind === 'nc' && base) {   // 3.0: xóa người có ngày chấm công — nêu các ngày liên quan trước khi xóa (chấm công nối theo ID dòng thành viên)
    const f = curForest(), cc = (f && f.cc) || {}, k = HAKChamCong.personKey(r), ngay = [];
    Object.keys(cc).sort().forEach(m => Object.keys((cc[m] || {})[k] || {}).sort((x, y) => x - y).forEach(d => ngay.push(d.padStart(2, '0') + '/' + m.slice(5) + '/' + m.slice(0, 4))));
    if (ngay.length && !confirm((r.ten || 'Người này') + ' có ' + ngay.length + ' ngày đã chấm công:\n' + ngay.slice(0, 20).join(', ') + (ngay.length > 20 ? ', …' : '') + '\n\nXóa người này thì các ngày công trên không còn được tính. Tiếp tục?')) return;
  }
  if (base && !confirm('Xóa bản ghi đã lưu' + (r.ten ? ' “' + r.ten + '”' : r.bienSo ? ' “' + r.bienSo + '”' : r.soPhieu ? ' “' + r.soPhieu + '”' : '') + ' khỏi lô?\nBản ghi chỉ thật sự bị xóa khi bấm “Lưu dữ liệu vào lô”; có thể “Hoàn tác” trước đó.')) return;
  HAKStage.removeRow(st, kind, r._id); stErrList = null; loSaveIssue = null; render();
}
