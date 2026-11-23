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
const stm = {kind: '', id: null, vals: {}, parent: null, errs: []};   // trạng thái hộp thoại đang mở (parent: hộp thoại phiếu cân chờ quay lại sau khi thêm xe)
const stStr = v => v == null ? '' : typeof v === 'number' ? String(v).replace('.', ',') : String(v);
function stAct(act, el) {
  const kind = el.dataset.kind, i = el.dataset.i != null ? +el.dataset.i : null;
  if (act !== 'stSave' && act !== 'stClose') pcGanBao = null;   // 3.0: khung xem trước phiếu nạp chỉ hiện ngay sau lượt nạp; thao tác khác trên bản nháp thì ẩn (bấm Lưu bị chặn vẫn giữ để xử lý)
  if (act === 'stAdd') return stOpen(kind, null);
  if (act === 'stEdit') return stOpen(kind, i);
  if (act === 'stDel') return stDelete(kind, i);
  if (act === 'stRestore') { HAKStage.restoreRow(stCur(), kind, el.dataset.id); stErrList = null; return render(); }
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
  stm.kind = kind; stm.id = row ? row._id : null; stm.parent = parent || null; stm.errs = [];
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
    /* 3.0: mỗi xe một lần trong một hợp đồng */ return L.length ? '<label style="display:block;margin-bottom:8px"><span>Chọn xe từ Danh mục xe vận chuyển (thông tin mới nhất)</span><select id="xeDm"><option value="">— nhập xe mới (tự vào Danh mục khi lưu lô) —</option>' +
    L.map(x => '<option value="' + esc(HAKStage.bienKey(x.bienSo)) + '">' + esc(x.bienSo + ' · ' + (x.chuXe || '')) + '</option>').join('') + '</select></label>' : '';
    })() : '') +
    (kind === 'nc' && !stm.id ? (() => { const dId = (curTeam() || {}).id, daCo = new Set(st.cur.nc.filter(r => !rec.doi || rec.doi.length < 2 || r.doiId === dId).map(r => HAKModel.cccdSo(r.cccd))), L = dmNguonLd().filter(r => !daCo.has(HAKModel.cccdSo(r.cccd)));   // 3.0: không trùng trong cùng đội; người ở đội khác vẫn chọn được, có ghi chú
      const doiKhac = c => { const x = st.cur.nc.find(r => HAKModel.cccdSo(r.cccd) === c); const d = x && (rec.doi || []).find(y => y.id === x.doiId); return d ? ' — đang ở ' + (d.ten || 'đội khác') : ''; };
      return L.length ? '<label style="display:block;margin-bottom:8px"><span>Chọn người từ Danh mục đối tượng (theo CCCD, thông tin mới nhất)</span><select id="ncDm"><option value="">— nhập người mới (tự vào Danh mục khi lưu lô) —</option>' + L.map(r => '<option value="' +
      esc(HAKModel.cccdSo(r.cccd)) + '">' + esc((r._nhan || r.ten) + ' · CCCD ' + HAKModel.cccdSo(r.cccd) + doiKhac(HAKModel.cccdSo(r.cccd))) + '</option>').join('') +
      '</select><small class="mut">Điền sẵn họ tên, ngày sinh, CCCD, ngày cấp, nơi cấp, địa chỉ; chức vụ, vị trí và đội chọn cho lô này. Thông tin được chụp lại trong lô, sửa ở lô này không đổi lô khác.</small></label>' : '';
      })() : '') +
    '<form id="stForm" class="grid">' + ST_FIELDS[kind].map(fld).join('') + '<div style="grid-column:1/-1" class="row"><button class="btn" type="submit">' + (stm.id ? 'Cập nhật vào bản nháp' : 'Thêm vào bản nháp') + '</button><button class="btn ghost" type="button" data-act="stClose">Hủy</button></div></form>';
  $('#stBox').classList.add('on');
}
/* DANH MỤC XE: xe đã nhập ở mọi lô, gộp theo biển số (lô có ngày bắt đầu khai thác mới nhất thắng); chọn khi thêm xe để khỏi nhập lại giấy tờ */
function xeDanhMuc() {
  const by = new Map(), dk = s => { const p = HAKDates.parse(s || ''); return p ? p.y * 10000 + p.m * 100 + p.d : 0; };
  Object.values(db.rs || {}).forEach(o => forestList(o).forEach(f => (f.dx || []).forEach(r => { const k = HAKStage.bienKey(r.bienSo); if (!k) return; const t = dk((f.info || {}).tuNgay), cur = by.get(k); if (!cur || t >= cur.t) by.set(k, {t, r}); })));
  return [...by.values()].map(x => x.r).sort((a, b) => String(a.bienSo).localeCompare(String(b.bienSo)));
}
function stRead() { const f = $('#stForm'); if (!f) return stm.vals; const fd = new FormData(f); ST_FIELDS[stm.kind].forEach(([k]) => { stm.vals[k] = (fd.get(k) ?? '').toString(); }); return stm.vals; }
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
  if (old) HAKStage.updateRow(st, kind, old._id, row); else { const nid = HAKStage.addRow(st, kind, row); if (kind === 'pc' && hdMo('dx')) pcGanThem(nid); }   // 3.0: phiếu nhập tay cũng hiện ở khung xem trước (cùng quy tắc hợp đồng đích)
  st.src[kind] = st.src[kind] || 'Nhập tay';
  stErrList = null; const parent = stm.parent; stm.errs = []; $('#stBox').classList.remove('on');
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
  HAKStage.removeRow(st, kind, r._id); stErrList = null; render();
}
