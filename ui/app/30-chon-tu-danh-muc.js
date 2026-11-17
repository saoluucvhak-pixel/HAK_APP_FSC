/* ========== HỢP ĐỒNG (cha) → NGƯỜI / XE / PHIẾU CÂN (con): chọn từ Danh mục ==========
 * Cách tổ chức ghi nhận của lô:
 *  - Thông tin gốc của người lao động và xe nằm ở DANH MỤC (nhập tay hoặc nạp Excel ở màn Danh mục). Lô KHÔNG nạp Excel nhân công / xe.
 *  - Tab Nhân công: lô có nhiều HỢP ĐỒNG NHÂN CÔNG, mỗi hợp đồng là một ĐỘI (f.doi); nhân công là bảng con của đội (nc.doiId), chọn từng người từ Danh mục lao động.
 *    Số người của đội = số người đã chọn vào đội.
 *  - Tab Vận chuyển: lô có nhiều HỢP ĐỒNG VẬN CHUYỂN (f.hdvc); xe là bảng con của hợp đồng (dx.hdvcId), chọn từ Danh mục xe.
 *    Phiếu cân là bảng con của hợp đồng vận chuyển: phiếu thuộc hợp đồng có xe mang biển số của phiếu (đối chiếu với danh sách xe của hợp đồng);
 *    phiếu có biển số chưa thuộc xe nào của lô được nêu riêng để đổi biển số hoặc thêm xe vào hợp đồng.
 * Người / xe chưa có trong Danh mục: nút “… mới (chưa có trong danh mục)” nhập một lần tại chỗ, phần mềm ghi vào Danh mục khi lưu lô (ui/app/20 dmGhiTuLo) — vẫn một nguồn.
 * Dòng chọn vào đi qua BẢN NHÁP của lô như mọi thay đổi khác (HAKStage), ghi khi bấm “Lưu dữ liệu vào lô”. */
const dmc = {kind: '', q: '', sel: new Set()};
const dmcKey = (kind, d) => kind === 'nc' ? HAKModel.cccdSo(d.cccd) : HAKStage.bienKey(d.bienSo);
/* hợp đồng vận chuyển đang chọn của lô (mặc định hợp đồng đầu): dùng chung cho bảng xe, bảng phiếu cân và hộp chọn xe */
function hdDangChon(rec) {
  rec = rec || curRec(); if (!rec || !rec.hdvc) return null;
  const list = HAKModel.hdOrder({dx: rec.dx, hdvc: rec.hdvc});
  return list.find(h => h.id === curHd) || list[0] || null;
}
const hdTenHienThi = (rec, h) => { const list = HAKModel.hdOrder({dx: rec.dx, hdvc: rec.hdvc}); return trim(h.ten) || (h.donViId ? (h.ben || {}).ten || '' : '') || 'Hợp đồng ' + (list.indexOf(h) + 1); };
/* nguồn chọn: dòng hiệu lực của Danh mục chưa có trong lô (bản nháp) */
function dmcNguon(kind) {
  const st = stCur(), rec = curRec(), co = new Set(((st ? st.cur[kind] : rec && rec[kind]) || []).map(r => dmcKey(kind, r)));
  return (kind === 'nc' ? dmNguonLd() : dmNguonXe()).filter(d => { const k = dmcKey(kind, d); return k && !co.has(k); });
}
function dmChonMo(kind, q) {
  const f = curForest(), rec = curRec(); if (!f || !rec) return;
  if (loKhoa(f)) return loKhoaNote(f);
  if (kind === 'dx' && !hdDangChon(stJob(rec))) return note('Chưa có hợp đồng vận chuyển: bấm “+ Thêm hợp đồng vận chuyển” trước, rồi chọn xe cho hợp đồng đó.', 'warn');
  if (!stGet(true)) return;
  dmc.kind = kind; dmc.q = q || ''; dmc.sel = new Set(); dmChonVe();
}
function dmcLoc() {
  const w = foldVi(dmc.q).split(/\s+/).filter(Boolean), L = dmcNguon(dmc.kind);
  const txt = d => dmc.kind === 'nc' ? [d.ten, d.cccd, d.diaChi, d.chucVu, d.viTri, d.sdt].join(' ') : [d.bienSo, HAKStage.bienKey(d.bienSo), d.chuXe, d.taiXe, d.loaiXe, d.cccdTx].join(' ');
  return w.length ? L.filter(d => { const t = foldVi(txt(d)); return w.every(x => t.includes(x)); }) : L;
}
function dmcBang() {
  const L = dmcLoc(), nc = dmc.kind === 'nc';
  if (!L.length) return '<p class="mut" id="dmcTrong" style="margin:10px 0">' + (dmcNguon(dmc.kind).length ? 'Không có dòng nào khớp từ khóa.' : (nc ? 'Mọi người trong Danh mục lao động đã có trong lô, hoặc Danh mục chưa có ai.' : 'Mọi xe trong Danh mục xe đã có trong lô, hoặc Danh mục chưa có xe.')) + '</p>';
  const hh = v => v && dmHetHan(v) ? '<span class="pill err">' + esc(v) + '</span>' : esc(v || '');
  return '<div class="wrap" style="max-height:46vh;overflow:auto"><table id="dmcTbl"><thead><tr><th style="width:34px"><input type="checkbox" id="dmcAll" aria-label="Chọn tất cả dòng đang hiện"></th>' +
    (nc ? '<th>Họ và tên</th><th>CCCD</th><th>Ngày sinh</th><th>Nơi thường trú</th><th>Chức vụ</th><th>Vị trí</th>' : '<th>Biển số</th><th>Loại xe</th><th>Chủ xe</th><th>Tài xế</th><th>Hạn GPLX</th><th>Hạn đăng kiểm</th><th>Hạn bảo hiểm</th>') + '</tr></thead><tbody>' +
    L.slice(0, 300).map(d => { const k = dmcKey(dmc.kind, d); return '<tr><td><input type="checkbox" data-dmc="' + esc(k) + '"' + (dmc.sel.has(k) ? ' checked' : '') + ' aria-label="Chọn ' + esc(nc ? d.ten : d.bienSo) + '"></td>' +
      (nc ? '<td><b>' + esc(d.ten) + '</b></td><td>' + esc(d.cccd) + '</td><td>' + esc(d.ngaySinh) + '</td><td>' + esc(d.diaChi) + '</td><td>' + esc(d.chucVu || '') + '</td><td>' + esc(d.viTri || '') + '</td>'
        : '<td><b>' + esc(d.bienSo) + '</b></td><td>' + esc(d.loaiXe || '') + '</td><td>' + esc(d.chuXe) + '</td><td>' + esc(d.taiXe) + '</td><td>' + hh(d.hanGplx) + '</td><td>' + hh(d.hanDangKiem) + '</td><td>' + hh(d.hanBaoHiem) + '</td>') + '</tr>'; }).join('') +
    '</tbody></table></div>' + (L.length > 300 ? '<p class="mut" style="margin:4px 0">Đang hiện 300 / ' + L.length + ' dòng: gõ từ khóa để thu hẹp.</p>' : '');
}
function dmcNut() { const n = dmc.sel.size, b = document.getElementById('dmcXong'); if (b) { b.disabled = !n; b.textContent = n ? 'Thêm ' + n + (dmc.kind === 'nc' ? ' người vào đội' : ' xe vào hợp đồng') : 'Chưa chọn dòng nào'; } }
function dmChonVe() {
  const rec = stJob(curRec()), o = curOwner(), nc = dmc.kind === 'nc', t = nc ? curTeam() : null, h = nc ? null : hdDangChon(rec);
  const dich = nc ? 'Đội: <b>' + esc(trim(t && t.ten) || 'Đội ' + ((rec.doi || []).findIndex(d => t && d.id === t.id) + 1)) + '</b>' : 'Hợp đồng vận chuyển: <b>' + esc(hdTenHienThi(rec, h)) + '</b>';
  $('#stBody').innerHTML = '<div class="gh"><h2>' + (nc ? 'Chọn nhân công từ Danh mục lao động' : 'Chọn xe từ Danh mục xe') + '</h2><button class="btn ghost sm" data-act="stClose">✕ Đóng</button></div>' +
    '<p class="mut" style="margin:0 0 8px">Chủ rừng: <b>' + esc(o.info.ten) + '</b> · Lô: <b>' + esc(rec.info.maRung) + '</b> · ' + dich + '. Lô chụp lại thông tin mới nhất của danh mục; các dòng chọn vào bản nháp, ghi khi bấm “Lưu dữ liệu vào lô”.</p>' +
    '<div class="row" style="gap:8px;flex-wrap:wrap;align-items:flex-end;margin-bottom:8px"><label style="flex:1;min-width:240px">Tìm trong danh mục<br><input id="dmcQ" style="width:100%" value="' + esc(dmc.q) + '" placeholder="' + (nc ? 'họ tên, CCCD, thường trú, vị trí' : 'biển số, chủ xe, tài xế') + '"></label>' +
    '<button class="btn ghost sm" data-act="stAdd" data-kind="' + dmc.kind + '" id="dmcMoi" title="Nhập một lần tại đây; phần mềm ghi vào Danh mục khi lưu lô">' + (nc ? '+ Người mới (chưa có trong danh mục)' : '+ Xe mới (chưa có trong danh mục)') + '</button>' +
    '<button class="btn ghost sm" data-act="dmcDanhMuc" title="Thêm, sửa hoặc nạp Excel ở màn Danh mục">Mở Danh mục…</button></div>' +
    '<div id="dmcList">' + dmcBang() + '</div>' +
    '<div class="row" style="justify-content:flex-end;margin-top:10px;gap:8px"><button class="btn ghost" data-act="stClose">Hủy</button><button class="btn" data-act="dmcXong" id="dmcXong" disabled>Chưa chọn dòng nào</button></div>';
  $('#stBox').classList.add('on'); dmcNut();
  const q = document.getElementById('dmcQ'); if (q) q.focus();
}
/* đưa các dòng đã chọn vào bản nháp của lô, gắn vào đội / hợp đồng đang chọn */
function dmChonXong() {
  const kind = dmc.kind, st = stGet(true), rec = curRec(); if (!st || !rec || !dmc.sel.size) return;
  const nc = kind === 'nc', t = nc ? curTeam() : null, h = nc ? null : hdDangChon(stJob(rec));
  if (!nc && !h) return note('Chưa có hợp đồng vận chuyển để thêm xe.', 'warn');
  const giu = {kind: stm.kind, id: stm.id, vals: stm.vals}; let n = 0;
  dmcNguon(kind).filter(d => dmc.sel.has(dmcKey(kind, d))).forEach(d => {
    stm.kind = kind; stm.id = null;
    stm.vals = Object.fromEntries(ST_FIELDS[kind].map(([k]) => [k, k === 'nguoiKy' ? 'Chủ xe' : k === 'vaiTro' ? 'Công nhân' : k === 'danhXung' ? 'Ông' : '']));
    if (nc) dmDienNguoi(d); else dmDienXe(d);   // cùng cách chụp với chọn từng dòng (ui/app/20)
    const row = ST_NORM[kind](Object.assign({}, stm.vals, {maRung: rec.info.maRung}));
    row._nguon = 'Danh mục'; if (stm.vals._dmNgay != null) row._dmNgay = stm.vals._dmNgay;
    if (nc) {
      row.doiId = t ? t.id : '';
      /* vai trò và vị trí hợp lệ ngay khi chọn (khỏi sửa từng người): đội đã có Tổ trưởng thì người chọn thêm là Công nhân; Tổ trưởng mang vị trí “Tổ trưởng”;
       * người chưa có vị trí hợp lệ trong danh mục nhận vị trí công nhân đầu tiên của Định mức nhân công. Sửa lại được ở nút Sửa của từng dòng. */
      const ds = chucDanhAll(), cn = ds.find(x => x !== 'Tổ trưởng') || '', daCoTT = st.cur.nc.some(r => r.doiId === row.doiId && isTT(r));
      if (isTT(row) && daCoTT) row.vaiTro = 'Công nhân';
      if (isTT(row)) { if (ds.includes('Tổ trưởng')) row.chucDanh = 'Tổ trưởng'; }
      else if (!ds.includes(row.chucDanh) || row.chucDanh === 'Tổ trưởng') row.chucDanh = cn || row.chucDanh;
    } else row.hdvcId = h.id;
    HAKStage.addRow(st, kind, row); n++;
  });
  Object.assign(stm, giu);
  st.src[kind] = st.src[kind] || 'Danh mục'; stErrList = null; $('#stBox').classList.remove('on');
  pushNote('Đã chọn ' + n + (nc ? ' người vào ' + (trim(t && t.ten) ? 'đội “' + trim(t.ten) + '”' : 'đội đang chọn') : ' xe vào hợp đồng “' + hdTenHienThi(stJob(rec), h) + '”') + ' (bản nháp). Kiểm tra vai trò' + (nc ? ', vị trí' : ', người ký') + ' rồi bấm “Lưu dữ liệu vào lô”.', 'ok');
  render();
}
document.addEventListener('input', e => { if (e.target && e.target.id === 'dmcQ') { dmc.q = e.target.value; const b = document.getElementById('dmcList'); if (b) b.innerHTML = dmcBang(); } });
document.addEventListener('change', e => {
  const t = e.target; if (!t || !t.closest || !t.closest('#dmcList')) return;
  if (t.id === 'dmcAll') { document.querySelectorAll('#dmcList [data-dmc]').forEach(c => { c.checked = t.checked; if (t.checked) dmc.sel.add(c.dataset.dmc); else dmc.sel.delete(c.dataset.dmc); }); return dmcNut(); }
  if (t.dataset.dmc != null) { if (t.checked) dmc.sel.add(t.dataset.dmc); else dmc.sel.delete(t.dataset.dmc); dmcNut(); }
});
/* thanh thao tác của bảng con (thay cho “Nạp file …” và “+ Thêm …” của nhân công / xe): chọn từ danh mục là cách chính */
function dmcThanh(kind, rec) {
  const nc = kind === 'nc', n = dmcNguon(kind).length;
  return '<div class="row" style="gap:8px;flex-wrap:wrap;align-items:center"><button class="btn sm" data-act="dmChon" data-kind="' + kind + '" id="dmChon_' + kind + '">' + (nc ? '+ Chọn nhân công từ danh mục' : '+ Chọn xe từ danh mục') + '</button>' +
    '<button class="btn ghost sm" data-act="stAdd" data-kind="' + kind + '" title="Nhập một lần tại đây; phần mềm ghi vào Danh mục khi lưu lô">' + (nc ? '+ Người mới (chưa có trong danh mục)' : '+ Xe mới (chưa có trong danh mục)') + '</button>' +
    '<span class="mut">' + (n ? 'Danh mục còn ' + n + (nc ? ' người' : ' xe') + ' chưa có trong lô.' : (nc ? 'Danh mục lao động' : 'Danh mục xe') + ' chưa có dòng nào khác để chọn.') + ' Nạp Excel ' + (nc ? 'lao động' : 'xe') + ' ở màn <b>Danh mục</b>.</span>' +
    /* CHUYỂN TIẾP: nạp Excel nhân công / xe thẳng vào lô không còn trên giao diện (không có nút, người dùng không bấm được). Ô chọn file ẩn dưới đây giữ đường nạp cũ
     * cho các bộ kiểm thử đầu-cuối đang dùng nó để dựng dữ liệu; bỏ cùng mã nạp theo lô khi các bộ đó chuyển sang dựng dữ liệu qua Danh mục. */
    '<input type="file" accept=".xlsx,.xls" data-file="' + kind + '" hidden></div>';
}
/* Phiếu cân: mở Tra cứu Google Sheets ở tab HoSoKeo, tìm sẵn theo mã lô đang mở. Chọn kết quả → “Điền vào rừng đang mở” → màn xem trước cho chọn từng phiếu
 * và đổi biển số (ui/app/17: lk.sel, lk.plateOv) trước khi ghi vào bản nháp của lô. */
async function lkMoPhieuCan() {
  const f = curForest(), o = curOwner(); if (!HB || !f || !o) return;
  if (loKhoa(f)) return loKhoaNote(f);
  lk.tab = 'HoSoKeo_QC'; lk.q = trim((f.info || {}).maRung) || trim((o.info || {}).cccd) || ''; lk.res = null;
  await lkOpen();
}
