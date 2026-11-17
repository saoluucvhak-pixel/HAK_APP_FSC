/* ========== 3.0: PHIẾU CÂN THUỘC HỢP ĐỒNG VẬN CHUYỂN ==========
 * Trang chi tiết hợp đồng vận chuyển có phần Phiếu cân: “Tra cứu HoSoKeo”, “Nạp Excel”, “Thêm phiếu cân”; bảng chỉ có phiếu của hợp đồng (và phiếu chưa thuộc hợp đồng nào).
 * MỘT quy tắc cho phiếu nhập tay, Excel và Google Sheets HoSoKeo:
 *  - hợp đồng đang mở là ĐÍCH; không bao giờ tự chuyển phiếu sang hợp đồng khác;
 *  - xe chỉ tự chọn khi BKS (đã chuẩn hóa) khớp DUY NHẤT một xe ĐÃ LƯU của hợp đồng đích;
 *  - BKS chỉ khớp xe ở hợp đồng khác: “Xe này thuộc hợp đồng [số]” — phiếu ở lại khung xem trước (bản nháp chưa lưu được) cho tới khi người dùng chọn xe hợp lệ,
 *    thêm xe vào hợp đồng đích, hoặc chủ động đổi hợp đồng đích.
 * Đổi xe của phiếu: lưu ID dòng xe, giữ BKS gốc, khối lượng, định danh phiếu. Chuyển phiếu ĐÃ LƯU sang hợp đồng khác: hộp xác nhận (hợp đồng cũ, mới, xe, cước),
 * xe phải thuộc hợp đồng mới, ghi ngay trong một giao dịch; lỗi thì trả lại như cũ và báo rõ. */
var pcTatCa = false, xeTatCa = false;   // trang chi tiết: xem mọi phiếu / mọi xe của rừng thay vì chỉ của hợp đồng   // trang chi tiết: xem mọi phiếu của rừng thay vì chỉ phiếu của hợp đồng
var pcGanBao = null;   // kết quả gán hợp đồng / xe của lượt nạp gần nhất: {hdId, ten, dong: [{soPhieu, ngay, kl, bks, xe, lyDo}]}
function tenHdId(f, id) { const h = (f.hdvc || []).find(x => x.id === id); return h ? tenDoiVc({dx: f.dx, hdvc: f.hdvc}, h) : id; }
function xeKhacHd(f, dx, hId) { return (dx || []).filter(r => r.hdvcId && r.hdvcId !== hId).map(r => ({bienSo: r.bienSo, hdId: r.hdvcId, hdTen: tenHdId(f, r.hdvcId)})); }
/* nhãn hợp đồng vận chuyển cho thông báo: “số 07 (Đội xe 2)” hoặc tên đội xe khi chưa có số */
function nhanHdId(f, id) { const h = (f.hdvc || []).find(x => x.id === id); if (!h) return id; const so = soHdVc(f, h), ten = tenHdId(f, id); return so ? 'số ' + so + ' (' + ten + ')' : ten; }
/* chọn xe cho một phiếu trong hợp đồng hId: chỉ XE ĐÃ LƯU (dòng xe có trong lô đã lưu) của hợp đồng; {xe, ma, lyDo} */
function chonXePhieu(f, dx, hId, bks) { const luu = new Set(((f && f.dx) || []).map(r => r && r.id).filter(Boolean)); const xe = (dx || []).filter(r => r.hdvcId === hId && r.id && luu.has(r.id)); return HAKBks.chonXe(xe, bks, {khac: xeKhacHd(f, dx, hId), danhMuc: dmXE()}); }
/* ID dòng cho xe thêm trong bản nháp (để phiếu nhận xe trước khi lưu; tầng lưu giữ ID đã có) */
function idXeMoi(st, f) { const dung = new Set([...(st.cur.dx || []), ...(st.base.dx || []), ...((f && f.dx) || [])].map(r => r && r.id).filter(Boolean)); let k = dung.size + 1; while (dung.has('xr' + k)) k++; return 'xr' + k; }
var pgChoXe = null;   // phiếu (_id) đang chờ xe vừa thêm vào hợp đồng đích
/* hợp đồng khác có xe khớp BKS (đã chuẩn hóa) của phiếu: [hdvcId] */
function hdCoXe(dx, hId, bks) { const k = HAKBks.khoa(bks); return k ? [...new Set((dx || []).filter(r => r.hdvcId && r.hdvcId !== hId && HAKBks.khoa(r.bienSo) === k).map(r => r.hdvcId))] : []; }
/* đích của phiếu mới khi đang mở hợp đồng hId: LUÔN hId (không tự chuyển). Trả {hdvcId, xe, lyDo, choXuLy: [hợp đồng có xe] khi BKS chỉ khớp xe ở hợp đồng khác} */
function phieuDich(f, dx, hId, bks) {
  const c = chonXePhieu(f, dx, hId, bks); if (c.xe) return {hdvcId: hId, xe: c.xe, lyDo: ''};
  const coXeTrongDich = (dx || []).some(r => r.hdvcId === hId && HAKBks.khoa(r.bienSo) === HAKBks.khoa(bks) && HAKBks.khoa(bks));
  const khac = coXeTrongDich ? [] : hdCoXe(dx, hId, bks);
  if (khac.length) return {hdvcId: hId, xe: null, lyDo: 'Xe này thuộc hợp đồng ' + khac.map(id => nhanHdId(f, id)).join(', '), choXuLy: khac};
  return {hdvcId: hId, xe: null, lyDo: coXeTrongDich ? 'xe cùng BKS trong hợp đồng chưa lưu: lưu xe trước rồi chọn' : c.lyDo};
}
/* phiếu (đã gắn hợp đồng) cần người dùng xử lý: chưa có xe, BKS không khớp xe nào của hợp đồng mà khớp xe ở hợp đồng khác. Dùng cho kiểm tra bản nháp (chặn lưu). */
function phieuSaiHd(dx, p) {
  if (!p || !p.hdvcId || p.xeRowId || p.xeTay) return null;
  const k = HAKBks.khoa(p.bienSo); if (!k) return null;
  if ((dx || []).some(r => r.hdvcId === p.hdvcId && HAKBks.khoa(r.bienSo) === k)) return null;
  const khac = hdCoXe(dx, p.hdvcId, p.bienSo); return khac.length ? khac : null;
}
/* sau khi nạp (Excel, Google Sheets) vào bản nháp: phiếu MỚI vào hợp đồng đang mở (hoặc theo xe ở hợp đồng khác), xe theo BKS khớp duy nhất */
function ganPhieuHopDong(st, ids, f) {
  pcGanBao = null;
  const hId = hdMo('dx'); if (!hId || !st || !f || !(ids || []).length || !(f.hdvc || []).some(h => h.id === hId)) return null;
  const moi = st.cur.pc.filter(p => ids.includes(p._id) && !p.hdvcId);   // chỉ phiếu MỚI (phiếu đã có, được cập nhật, giữ hợp đồng / xe của nó)
  moi.forEach(p => { const c = phieuDich(f, st.cur.dx, hId, p.bienSo); p.hdvcId = c.hdvcId; if (c.xe && c.xe.id) p.xeRowId = c.xe.id; else delete p.xeRowId; });
  pcGanBao = {hdId: hId, fid: f.id, ids: moi.map(p => p._id)};
  return pcGanBao;
}
/* thêm một phiếu (nhập tay) vào khung xem trước của lượt đang mở */
function pcGanThem(id) { const hId = hdMo('dx'), f = curForest(); if (!hId || !f) return; if (!pcGanBao || pcGanBao.hdId !== hId || pcGanBao.fid !== f.id) pcGanBao = {hdId: hId, fid: f.id, ids: []}; if (!pcGanBao.ids.includes(id)) pcGanBao.ids.push(id); }
/* KHUNG XEM TRƯỚC phiếu vừa nạp / thêm (tính lại từ bản nháp): rừng, hợp đồng đích (số), số phiếu, ngày, KL, BKS nguồn, xe được chọn; phiếu cần xử lý có ba cách */
function pcGanBaoHtml() {
  const b = pcGanBao, f = curForest(), st = stCur(); if (!b || !f || !st || b.hdId !== hdMo('dx') || b.fid !== f.id) return '';
  const rows = st.cur.pc.filter(p => b.ids.includes(p._id)); if (!rows.length) return '';
  const xeDich = st.cur.dx.filter(r => r.hdvcId === b.hdId && r.id), can = rows.filter(p => phieuSaiHd(st.cur.dx, p)).length;
  const xeCua = p => p.xeRowId ? st.cur.dx.find(r => r.id === p.xeRowId) : null;
  const dongXe = p => {
    const x = xeCua(p), sai = phieuSaiHd(st.cur.dx, p);
    if (x) return esc(x.bienSo + (x.taiXe ? ' · ' + x.taiXe : '')) + (HAKBks.khoa(x.bienSo) !== HAKBks.khoa(p.bienSo) ? ' <small class="mut">(BKS phiếu giữ nguyên)</small>' : '');
    if (!sai) { const c = phieuDich(f, st.cur.dx, p.hdvcId, p.bienSo); return '<span class="pill warn">chưa chọn</span> <small>' + esc(c.lyDo || 'chọn xe sau khi lưu') + '</small>'; }
    return '<div class="msg err" style="margin:0;padding:4px 8px">Xe này thuộc hợp đồng ' + esc(sai.map(id => nhanHdId(f, id)).join(', ')) + '</div>' +
      '<div class="row" style="gap:6px;flex-wrap:wrap;margin-top:4px">' +
      (xeDich.length ? '<select data-pgxe="' + esc(p._id) + '" style="max-width:170px"><option value="">— chọn xe của hợp đồng này —</option>' + xeDich.map(r => '<option value="' + esc(r.id) + '">' + esc(r.bienSo + (r.taiXe ? ' · ' + r.taiXe : '')) + '</option>').join('') + '</select>' : '') +
      '<button class="btn ghost sm" data-act="pgThemXe" data-id="' + esc(p._id) + '">Thêm xe vào hợp đồng này</button>' +
      sai.map(id => '<button class="btn ghost sm" data-act="pgDoiHd" data-id="' + esc(p._id) + '" data-hd="' + esc(id) + '">Đổi đích sang hợp đồng ' + esc(nhanHdId(f, id)) + '</button>').join('') + '</div>';
  };
  return '<div class="card" id="pcGanBao"><div class="row" style="justify-content:space-between;gap:8px;flex-wrap:wrap"><h4 style="margin:0">Xem trước phiếu nạp — rừng <b id="pgRung">' + esc([f.info.maRung, f.info.tenRung].filter(Boolean).join(' · ')) + '</b> · hợp đồng đích <b id="pgDich">' + esc(nhanHdId(f, b.hdId)) + '</b>: ' + rows.length + ' phiếu' +
    (can ? ', <span style="color:var(--err)" id="pgCan">' + can + ' phiếu cần xử lý trước khi lưu</span>' : '') + '</h4><button class="btn ghost sm" data-act="pcGanDong">Đóng</button></div>' +
    '<div class="wrap" style="max-height:320px"><table id="pcGanTbl"><thead><tr><th>Số phiếu</th><th>Ngày</th><th style="text-align:right">KL (tấn)</th><th>BKS nguồn</th><th>Hợp đồng</th><th>Xe được chọn</th></tr></thead><tbody>' +
    rows.map(p => '<tr data-pg="' + esc(p._id) + '"><td>' + esc(p.soPhieu) + '</td><td>' + esc(p.ngay) + '</td><td style="text-align:right">' + (typeof p.kl === 'number' ? fmtTan(p.kl) : esc(p.kl)) + '</td><td>' + esc(p.bienSo) + '</td><td>' + esc(nhanHdId(f, p.hdvcId)) + '</td><td>' + dongXe(p) + '</td></tr>').join('') + '</tbody></table></div></div>';
}
/* ba cách xử lý phiếu trong khung xem trước (sửa bản nháp, chưa ghi) */
function pgChonXe(id, xeId) { const st = stCur(), p = st && st.cur.pc.find(x => x._id === id), x = st && st.cur.dx.find(r => r.id === xeId); /* xe của hợp đồng đích (đã lưu hoặc vừa thêm trong bản nháp) */ if (!p || !x || x.hdvcId !== p.hdvcId) return; p.xeRowId = x.id; p.xeTay = true; doiDuLieu(); render(); }
/* “Thêm xe vào hợp đồng này”: mở form thêm xe (chọn từ Danh mục xe hoặc nhập) vào hợp đồng đích; xe thêm xong gán ngay cho phiếu (BKS nguồn của phiếu giữ nguyên).
 * Một BKS chỉ có một dòng xe trong lô: xe đang thuộc hợp đồng khác thì dùng “Đổi đích” hoặc chọn xe khác. */
function pgThemXe(id) { const st = stCur(), p = st && st.cur.pc.find(x => x._id === id); if (!p) return; pgChoXe = id; const gan = pcGanBao; stOpen('dx', null); pcGanBao = gan; }
/* sau khi thêm xe trong bản nháp (stFinishRow): xe vào hợp đồng đang mở, có ID dòng; phiếu đang chờ nhận xe */
function pgSauThemXe(st, row) {
  const f = curForest(); if (!row.id) row.id = idXeMoi(st, f); if (hdMo('dx') && !row.hdvcId) row.hdvcId = hdMo('dx');
  const p = pgChoXe && st.cur.pc.find(x => x._id === pgChoXe); pgChoXe = null;
  if (p && row.hdvcId === p.hdvcId) { p.xeRowId = row.id; p.xeTay = true; }
}
function pgDoiHd(id, hId) { const st = stCur(), f = curForest(), p = st && st.cur.pc.find(x => x._id === id); if (!p || !f) return; const c = chonXePhieu(f, st.cur.dx, hId, p.bienSo); p.hdvcId = hId; delete p.xeTay; if (c.xe && c.xe.id) p.xeRowId = c.xe.id; else delete p.xeRowId; doiDuLieu(); note('Đã đổi hợp đồng đích của phiếu ' + (p.soPhieu || '') + ' sang ' + nhanHdId(f, hId) + (c.xe ? ' (xe ' + c.xe.bienSo + ')' : '') + '.', 'ok'); render(); }
/* đầu phần Phiếu cân của trang chi tiết hợp đồng */
function pcDauHd(rec, hMo) {
  const pc = rec.pc || [], cua = pc.filter(p => p.hdvcId === hMo.id).length, chua = pc.filter(p => !p.hdvcId).length;
  return '<div id="pcHd"><div class="row" style="justify-content:space-between;flex-wrap:wrap;gap:8px"><h3 style="margin:0">Phiếu cân của hợp đồng: ' + cua + (chua ? ' <small class="mut">· ' + chua + ' phiếu của rừng chưa thuộc hợp đồng nào</small>' : '') + '</h3>' +
    '<span class="row" style="gap:6px;flex-wrap:wrap">' + (HB ? '<button class="btn ghost sm" data-act="lkOpen" id="pcTraCuu">Tra cứu HoSoKeo</button>' : '') +
    '<button class="btn ghost sm" data-act="pcPrint" data-hd="' + esc(hMo.id) + '">In phiếu cân</button></span></div>' +
    '<div class="row importActions">' + (pcTatCa ? '<span class="mut">Đang xem mọi phiếu cân của rừng.</span> <button class="btn ghost sm" data-act="pcTheoHd">Chỉ phiếu của hợp đồng này</button>' : '<span class="mut">Gồm phiếu của hợp đồng này và phiếu chưa gán.</span> <button class="btn ghost sm" data-act="pcTatCa">Xem mọi phiếu của rừng</button>') + '</div></div>';
}
/* hai cột của trang chi tiết: Xe của hợp đồng (ID dòng xe; giữ BKS gốc của phiếu) và Hợp đồng (chuyển phiếu) */
function pcCotHd(rec, r, hMo) {
  const f = curForest(), ix = (rec.pc || []).indexOf(r), sua = !stCur() && ix >= 0 && f && !loKhoa(f), hId = r.hdvcId || '';
  const xe = (rec.dx || []).filter(x => x.hdvcId === hId && x.id), tuDong = !r.xeRowId && hId ? chonXePhieu(f || rec, rec.dx, hId, r.bienSo) : null;
  const cur = xe.find(x => x.id === r.xeRowId) || (tuDong && tuDong.xe && xe.includes(tuDong.xe) ? tuDong.xe : null);   // chưa lưu ID xe: BKS khớp duy nhất một xe của hợp đồng
  let xeHtml;
  if (!hId) xeHtml = '<span class="mut">—</span>';
  else if (sua && xe.length) xeHtml = '<select data-pcxe="' + ix + '" style="max-width:130px"><option value="">— chưa chọn xe —</option>' + xe.map(x => '<option value="' + esc(x.id) + '"' + (cur === x ? ' selected' : '') + '>' + esc(x.bienSo + (x.taiXe ? ' · ' + x.taiXe : '')) + '</option>').join('') + '</select>';
  else xeHtml = cur ? esc(cur.bienSo) : '<span class="pill warn">chưa chọn</span>';
  if (hId && !cur) { const c = chonXePhieu(f || rec, rec.dx, hId, r.bienSo); if (!c.xe || !c.xe.id) xeHtml += '<br><small class="mut">' + esc(c.lyDo || 'chọn xe trong hợp đồng') + '</small>'; }
  if (cur && HAKBks.khoa(cur.bienSo) !== HAKBks.khoa(r.bienSo)) xeHtml += '<br><small class="mut" title="BKS ghi trên phiếu (nguồn) được giữ nguyên">BKS phiếu: ' + esc(r.bienSo) + '</small>';
  const list = rec.hdvc || [];
  const hdHtml = sua && (list.length > 1 || (!hId && list.length)) ? '<select aria-label="Hợp đồng của phiếu" data-pchd="' + ix + '" style="max-width:130px">' + (hId ? '' : '<option value="" selected>(chưa thuộc)</option>') + list.map(h => '<option value="' + esc(h.id) + '"' + (h.id === hId ? ' selected' : '') + '>' + esc(tenDoiVc(rec, h)) + '</option>').join('') + '</select>'
    : hId ? esc(tenDoiVc(rec, list.find(h => h.id === hId) || {ten: hId})) : '<span class="pill warn">chưa thuộc</span>';
  return '<td>' + xeHtml + '<div style="margin-top:4px" title="Hợp đồng vận chuyển của phiếu"><small class="mut">Hợp đồng:</small> ' + hdHtml + '</div></td>';   // một cột: bảng không rộng thêm (nút Sửa, Xóa vẫn trong tầm nhìn)
}
function pcDoiXe(ix, id) {
  const f = curForest(), p = f && (f.pc || [])[ix]; if (!p) return;
  if (id) { const x = (f.dx || []).find(r => r.id === id); if (!x) return; p.xeRowId = id; p.hdvcId = x.hdvcId; p.xeTay = true; } else { delete p.xeRowId; delete p.xeTay; }   // BKS gốc của phiếu (p.bienSo) giữ nguyên; xe chọn tay không tự đổi theo BKS
  persistLo(); render();
}
/* CHUYỂN PHIẾU ĐÃ LƯU sang hợp đồng khác: hộp xác nhận hợp đồng cũ, mới, xe (phải thuộc hợp đồng mới), cước áp dụng; xác nhận thì ghi ngay một giao dịch */
var pcChuyen = null;   // {fid, ix, id (định danh phiếu), hId}
const cuocHd = (f, hId) => { const rec = curRec(), h = (f.hdvc || []).find(x => x.id === hId); try { const t = transportPrice(vcInfo(rec, h)); return t.loi ? t.loi : fmt(t.gia) + ' đ/tấn' + (h && h.cuoc ? ' (cước riêng)' : ' (cước chung)'); } catch (e) { return '—'; } };
function pcChuyenHd(ix, hId) {
  const f = curForest(), p = f && (f.pc || [])[ix]; if (!p || !(f.hdvc || []).some(h => h.id === hId) || p.hdvcId === hId) return render();
  if (loDirty.has(f.id) || stCur()) { note('Lưu hoặc bỏ các thay đổi đang có của lô trước khi chuyển phiếu sang hợp đồng khác.', 'warn'); return render(); }
  const xe = (f.dx || []).filter(r => r.hdvcId === hId && r.id), c = chonXePhieu(f, f.dx, hId, p.bienSo), xeCu = p.xeRowId ? (f.dx || []).find(r => r.id === p.xeRowId) : null;
  pcChuyen = {fid: f.id, ix, id: p.id || '', hId};
  dlgMo('<form id="pcChuyenForm"><h3 style="margin-top:0">Chuyển phiếu ' + esc(p.soPhieu || '') + ' sang hợp đồng khác</h3>' +
    '<table id="pcChuyenTbl"><tr><th></th><th>Hợp đồng cũ</th><th>Hợp đồng mới</th></tr>' +
    '<tr><td>Hợp đồng</td><td>' + esc(p.hdvcId ? nhanHdId(f, p.hdvcId) : '(chưa thuộc)') + '</td><td><b>' + esc(nhanHdId(f, hId)) + '</b></td></tr>' +
    '<tr><td>Xe</td><td>' + esc(xeCu ? xeCu.bienSo : '—') + '</td><td>' + (xe.length ? '<select name="xe"><option value="">— chọn xe của hợp đồng mới —</option>' + xe.map(r => '<option value="' + esc(r.id) + '"' + (c.xe === r ? ' selected' : '') + '>' + esc(r.bienSo + (r.taiXe ? ' · ' + r.taiXe : '')) + '</option>').join('') + '</select>' : '<span class="pill err">hợp đồng mới chưa có xe</span>') + '</td></tr>' +
    '<tr><td>Cước áp dụng</td><td>' + esc(p.hdvcId ? cuocHd(f, p.hdvcId) : '—') + '</td><td>' + esc(cuocHd(f, hId)) + '</td></tr>' +
    '<tr><td>Phiếu</td><td colspan="2">' + esc(p.soPhieu || '') + ' · ' + esc(p.ngay || '') + ' · BKS ' + esc(p.bienSo || '') + ' · ' + (typeof p.kl === 'number' ? fmtTan(p.kl) + ' tấn' : '') + ' (giữ nguyên định danh, BKS, khối lượng, đội phân bổ)</td></tr></table>' +
    '<div id="pcChuyenLoi"></div><div class="row" style="gap:8px;justify-content:flex-end;margin-top:10px"><button class="btn" type="submit" id="pcChuyenOk"' + (xe.length ? '' : ' disabled') + '>Chuyển và lưu</button><button class="btn ghost" type="button" data-act="dlgDong" id="pcChuyenHuy">Hủy</button></div></form>');
}
async function pcChuyenXacNhan(fm) {
  const c = pcChuyen, f = curForest(); if (!c || !f || f.id !== c.fid) return dlgDong();
  const p = (f.pc || [])[c.ix]; if (!p || (c.id && p.id !== c.id)) { dlgDong(); return note('Phiếu đã thay đổi, mở lại để chuyển.', 'warn'); }
  const xeId = fm.elements.xe ? fm.elements.xe.value : '', x = (f.dx || []).find(r => r.id === xeId);
  if (!x || x.hdvcId !== c.hId) { document.getElementById('pcChuyenLoi').innerHTML = '<div class="msg err">Chọn một xe thuộc hợp đồng mới.</div>'; return; }
  const cu = {hdvcId: p.hdvcId, xeRowId: p.xeRowId, xeTay: p.xeTay};
  p.hdvcId = c.hId; p.xeRowId = x.id; p.xeTay = true;   // xe do người dùng xác nhận
  persistLo(); const r = await luuLoTT({tuKhung: true});   // ghi ngay cả lô (một giao dịch SQLite); trả {ok, error}
  if (!r || !r.ok) {   // lưu lỗi: trả lại như cũ (không để dữ liệu nửa vời trong bộ nhớ)
    ['hdvcId', 'xeRowId', 'xeTay'].forEach(k => { if (cu[k] === undefined) delete p[k]; else p[k] = cu[k]; }); loDirty.delete(f.id); persistLo(); loDirty.delete(f.id);
    document.getElementById('pcChuyenLoi') ? document.getElementById('pcChuyenLoi').innerHTML = '<div class="msg err">Không lưu được, phiếu giữ ở hợp đồng cũ: ' + esc((r && r.error) || 'lỗi không rõ') + '</div>' : note('Không lưu được, phiếu giữ ở hợp đồng cũ: ' + ((r && r.error) || 'lỗi không rõ'), 'err');
    return;
  }
  pcChuyen = null; dlgDong(); note('Đã chuyển phiếu ' + (p.soPhieu || '') + ' sang hợp đồng ' + nhanHdId(f, c.hId) + ' (xe ' + x.bienSo + '). Cước: ' + cuocHd(f, c.hId) + '.', 'ok'); render();
}
document.addEventListener('change', e => {
  const t = e.target; if (!t || !t.dataset) return;
  if (t.dataset.pcxe != null) return pcDoiXe(Number(t.dataset.pcxe), t.value);
  if (t.dataset.pchd != null) return pcChuyenHd(Number(t.dataset.pchd), t.value);
  if (t.dataset.pgxe != null && t.value) return pgChonXe(t.dataset.pgxe, t.value);
});
document.addEventListener('submit', e => { if (e.target && e.target.id === 'pcChuyenForm') { e.preventDefault(); pcChuyenXacNhan(e.target); } });
document.addEventListener('click', e => {
  const el = e.target && e.target.closest && e.target.closest('[data-act=pgThemXe],[data-act=pgDoiHd]'); if (!el) return;
  if (el.dataset.act === 'pgThemXe') pgThemXe(el.dataset.id); else pgDoiHd(el.dataset.id, el.dataset.hd);
});
document.addEventListener('click', e => {
  const el = e.target && e.target.closest && e.target.closest('[data-act=pcTatCa],[data-act=pcTheoHd],[data-act=pcGanDong],[data-act=xeTatCa],[data-act=xeTheoHd]'); if (!el) return;
  const a = el.dataset.act; if (a === 'xeTatCa') xeTatCa = true; else if (a === 'xeTheoHd') xeTatCa = false; else if (a === 'pcTatCa') pcTatCa = true; else if (a === 'pcTheoHd') pcTatCa = false; else pcGanBao = null; render();
});
