/* ========== 3.0: PHIẾU CÂN THUỘC HỢP ĐỒNG VẬN CHUYỂN ==========
 * Trang chi tiết hợp đồng vận chuyển có phần Phiếu cân: “Tra cứu HoSoKeo”, “Nạp Excel”, “Thêm phiếu cân”; bảng chỉ có phiếu của hợp đồng (và phiếu chưa thuộc hợp đồng nào).
 * Phiếu mới nạp khi đang mở một hợp đồng vào hợp đồng đó; xe chỉ tự chọn khi BKS (đã chuẩn hóa) khớp DUY NHẤT một xe của hợp đồng — không thì ghi lý do và xe đang ở đâu.
 * Đổi xe của phiếu: lưu ID dòng xe, giữ BKS gốc của phiếu. Chuyển phiếu sang hợp đồng khác: chọn lại xe trong hợp đồng mới, cước tính theo hợp đồng mới, ghi trong một lần lưu. */
var pcTatCa = false, xeTatCa = false;   // trang chi tiết: xem mọi phiếu / mọi xe của rừng thay vì chỉ của hợp đồng   // trang chi tiết: xem mọi phiếu của rừng thay vì chỉ phiếu của hợp đồng
var pcGanBao = null;   // kết quả gán hợp đồng / xe của lượt nạp gần nhất: {hdId, ten, dong: [{soPhieu, ngay, kl, bks, xe, lyDo}]}
function tenHdId(f, id) { const h = (f.hdvc || []).find(x => x.id === id); return h ? tenDoiVc({dx: f.dx, hdvc: f.hdvc}, h) : id; }
function xeKhacHd(f, dx, hId) { return (dx || []).filter(r => r.hdvcId && r.hdvcId !== hId).map(r => ({bienSo: r.bienSo, hdId: r.hdvcId, hdTen: tenHdId(f, r.hdvcId)})); }
/* chọn xe cho một phiếu trong hợp đồng hId: {xe, lyDo} (xe = dòng xe của hợp đồng, null khi không duy nhất) */
function chonXePhieu(f, dx, hId, bks) { const xe = (dx || []).filter(r => r.hdvcId === hId); return HAKBks.chonXe(xe, bks, {khac: xeKhacHd(f, dx, hId), danhMuc: dmXE()}); }
/* nơi đặt một phiếu mới khi đang mở hợp đồng hId: BKS khớp duy nhất xe của hId → hId + xe đó; không khớp trong hId mà khớp duy nhất MỘT xe ở hợp đồng khác của rừng
 * → phiếu đi theo xe đó (báo rõ); còn lại → hId, chưa chọn xe, kèm lý do. Trả {hdvcId, xe, lyDo} */
function phieuDich(f, dx, hId, bks) {
  const c = chonXePhieu(f, dx, hId, bks); if (c.xe) return {hdvcId: hId, xe: c.xe, lyDo: ''};
  const k = HAKBks.khoa(bks), khac = k ? (dx || []).filter(r => r.hdvcId && r.hdvcId !== hId && HAKBks.khoa(r.bienSo) === k) : [];
  if (c.ma === 'khong-khop' && khac.length === 1) return {hdvcId: khac[0].hdvcId, xe: khac[0], lyDo: 'xe ' + khac[0].bienSo + ' thuộc hợp đồng ' + tenHdId(f, khac[0].hdvcId) + ': phiếu vào hợp đồng đó', khac: true};
  return {hdvcId: hId, xe: null, lyDo: c.lyDo};
}
/* sau khi nạp (Excel, Google Sheets) vào bản nháp: phiếu MỚI vào hợp đồng đang mở (hoặc theo xe ở hợp đồng khác), xe theo BKS khớp duy nhất */
function ganPhieuHopDong(st, ids, f) {
  pcGanBao = null;
  const hId = hdMo('dx'); if (!hId || !st || !f || !(ids || []).length || !(f.hdvc || []).some(h => h.id === hId)) return null;
  const dong = [];
  st.cur.pc.filter(p => ids.includes(p._id) && !p.hdvcId).forEach(p => {   // chỉ phiếu MỚI (phiếu đã có, được cập nhật, giữ hợp đồng / xe của nó)
    const c = phieuDich(f, st.cur.dx, hId, p.bienSo);
    p.hdvcId = c.hdvcId; if (c.xe && c.xe.id) p.xeRowId = c.xe.id; else delete p.xeRowId;
    dong.push({soPhieu: p.soPhieu, ngay: p.ngay, kl: p.kl, bks: p.bienSo, hd: tenHdId(f, c.hdvcId), khac: !!c.khac, xe: c.xe ? c.xe.bienSo + (c.xe.taiXe ? ' · ' + c.xe.taiXe : '') : '', lyDo: c.lyDo});
  });
  pcGanBao = {hdId: hId, ten: tenHdId(f, hId), rung: [f.info.maRung, f.info.tenRung].filter(Boolean).join(' · '), dong};
  return pcGanBao;
}
function pcGanBaoHtml() {
  const b = pcGanBao; if (!b || b.hdId !== hdMo('dx') || !b.dong.length) return '';
  const thieu = b.dong.filter(d => !d.xe).length;
  return '<div class="card" id="pcGanBao"><div class="row" style="justify-content:space-between"><h4 style="margin:0">Phiếu vừa nạp → rừng <b>' + esc(b.rung) + '</b>, hợp đồng <b>' + esc(b.ten) + '</b>: ' + b.dong.length + ' phiếu' + (thieu ? ', <span style="color:var(--err)">' + thieu + ' phiếu chưa chọn được xe</span>' : '') + '</h4><button class="btn ghost sm" data-act="pcGanDong">Đóng</button></div>' +
    '<div class="wrap" style="max-height:260px"><table id="pcGanTbl"><thead><tr><th>Số phiếu</th><th>Ngày</th><th style="text-align:right">KL (tấn)</th><th>BKS nguồn</th><th>Hợp đồng</th><th>Xe được chọn</th></tr></thead><tbody>' +
    b.dong.map(d => '<tr><td>' + esc(d.soPhieu) + '</td><td>' + esc(d.ngay) + '</td><td style="text-align:right">' + (typeof d.kl === 'number' ? fmtTan(d.kl) : esc(d.kl)) + '</td><td>' + esc(d.bks) + '</td><td>' + esc(d.hd) + (d.khac ? ' <span class="pill warn">theo xe</span>' : '') + '</td><td>' + (d.xe ? esc(d.xe) + (d.khac ? ' <small class="mut">' + esc(d.lyDo) + '</small>' : '') : '<span class="pill warn">chưa chọn</span> <small>' + esc(d.lyDo) + '</small>') + '</td></tr>').join('') + '</tbody></table></div></div>';
}
/* đầu phần Phiếu cân của trang chi tiết hợp đồng */
function pcDauHd(rec, hMo) {
  const pc = rec.pc || [], cua = pc.filter(p => p.hdvcId === hMo.id).length, chua = pc.filter(p => !p.hdvcId).length;
  return '<div class="card" id="pcHd"><div class="row" style="justify-content:space-between;flex-wrap:wrap;gap:8px"><h3 style="margin:0">Phiếu cân của hợp đồng: ' + cua + (chua ? ' <small class="mut">· ' + chua + ' phiếu của rừng chưa thuộc hợp đồng nào</small>' : '') + '</h3>' +
    '<span class="row" style="gap:6px;flex-wrap:wrap">' + (HB ? '<button class="btn ghost sm" data-act="lkOpen" id="pcTraCuu">Tra cứu HoSoKeo</button>' : '') +
    '<button class="btn ghost sm" data-act="pcNapExcel" id="pcNapExcel">Nạp Excel</button>' +
    '<button class="btn sm" data-act="stAdd" data-kind="pc" id="pcThem">+ Thêm phiếu cân</button></span></div>' +
    '<div class="row" style="margin-top:6px">' + (pcTatCa ? '<span class="mut">Đang xem mọi phiếu cân của rừng.</span> <button class="btn ghost sm" data-act="pcTheoHd">Chỉ phiếu của hợp đồng này</button>' : '<span class="mut">Đang xem phiếu của hợp đồng này (và phiếu chưa thuộc hợp đồng).</span> <button class="btn ghost sm" data-act="pcTatCa">Xem mọi phiếu của rừng</button>') + '</div></div>' + pcGanBaoHtml();
}
/* hai cột của trang chi tiết: Xe của hợp đồng (ID dòng xe; giữ BKS gốc của phiếu) và Hợp đồng (chuyển phiếu) */
function pcCotHd(rec, r, hMo) {
  const f = curForest(), ix = (rec.pc || []).indexOf(r), sua = !stCur() && ix >= 0 && f && !loKhoa(f), hId = r.hdvcId || '';
  const xe = (rec.dx || []).filter(x => x.hdvcId === hId && x.id), tuDong = !r.xeRowId && hId ? chonXePhieu(f || rec, rec.dx, hId, r.bienSo) : null;
  const cur = xe.find(x => x.id === r.xeRowId) || (tuDong && tuDong.xe && xe.includes(tuDong.xe) ? tuDong.xe : null);   // chưa lưu ID xe: BKS khớp duy nhất một xe của hợp đồng
  let xeHtml;
  if (!hId) xeHtml = '<span class="mut">—</span>';
  else if (sua && xe.length) xeHtml = '<select data-pcxe="' + ix + '"><option value="">— chưa chọn xe —</option>' + xe.map(x => '<option value="' + esc(x.id) + '"' + (cur === x ? ' selected' : '') + '>' + esc(x.bienSo + (x.taiXe ? ' · ' + x.taiXe : '')) + '</option>').join('') + '</select>';
  else xeHtml = cur ? esc(cur.bienSo) : '<span class="pill warn">chưa chọn</span>';
  if (hId && !cur) { const c = chonXePhieu(f || rec, rec.dx, hId, r.bienSo); if (!c.xe || !c.xe.id) xeHtml += '<br><small class="mut">' + esc(c.lyDo || 'chọn xe trong hợp đồng') + '</small>'; }
  if (cur && HAKBks.khoa(cur.bienSo) !== HAKBks.khoa(r.bienSo)) xeHtml += '<br><small class="mut" title="BKS ghi trên phiếu (nguồn) được giữ nguyên">BKS phiếu: ' + esc(r.bienSo) + '</small>';
  const list = rec.hdvc || [];
  const hdHtml = sua && list.length > 1 ? '<select data-pchd="' + ix + '">' + (hId ? '' : '<option value="" selected>(chưa thuộc)</option>') + list.map(h => '<option value="' + esc(h.id) + '"' + (h.id === hId ? ' selected' : '') + '>' + esc(tenDoiVc(rec, h)) + '</option>').join('') + '</select>'
    : hId ? esc(tenDoiVc(rec, list.find(h => h.id === hId) || {ten: hId})) : '<span class="pill warn">chưa thuộc</span>';
  return '<td>' + xeHtml + '</td><td>' + hdHtml + '</td>';
}
function pcDoiXe(ix, id) {
  const f = curForest(), p = f && (f.pc || [])[ix]; if (!p) return;
  if (id) { const x = (f.dx || []).find(r => r.id === id); if (!x) return; p.xeRowId = id; p.hdvcId = x.hdvcId; } else delete p.xeRowId;   // BKS gốc của phiếu (p.bienSo) giữ nguyên
  persistLo(); render();
}
function pcChuyenHd(ix, hId) {
  const f = curForest(), p = f && (f.pc || [])[ix]; if (!p || !(f.hdvc || []).some(h => h.id === hId) || p.hdvcId === hId) return;
  const c = chonXePhieu(f, f.dx, hId, p.bienSo), tu = p.hdvcId ? tenHdId(f, p.hdvcId) : '(chưa thuộc)';
  p.hdvcId = hId; if (c.xe && c.xe.id) p.xeRowId = c.xe.id; else delete p.xeRowId;   // kiểm lại xe trong hợp đồng mới; cước tính theo hợp đồng mới khi in
  persistLo(); note('Đã chuyển phiếu ' + (p.soPhieu || '') + ' từ ' + tu + ' sang ' + tenHdId(f, hId) + (c.xe ? ' (xe ' + c.xe.bienSo + ')' : ': ' + c.lyDo) + '. Cước vận chuyển tính theo hợp đồng mới.', c.xe ? 'ok' : 'warn'); render();
}
document.addEventListener('change', e => {
  const t = e.target; if (!t || !t.dataset) return;
  if (t.dataset.pcxe != null) return pcDoiXe(Number(t.dataset.pcxe), t.value);
  if (t.dataset.pchd != null) return pcChuyenHd(Number(t.dataset.pchd), t.value);
});
document.addEventListener('click', e => {
  const el = e.target && e.target.closest && e.target.closest('[data-act=pcTatCa],[data-act=pcTheoHd],[data-act=pcGanDong],[data-act=pcNapExcel],[data-act=xeTatCa],[data-act=xeTheoHd]'); if (!el) return;
  const a = el.dataset.act; if (a === 'pcNapExcel') { const i = document.querySelector('input[data-file=pc]'); if (i) i.click(); return; } if (a === 'xeTatCa') xeTatCa = true; else if (a === 'xeTheoHd') xeTatCa = false; else if (a === 'pcTatCa') pcTatCa = true; else if (a === 'pcTheoHd') pcTatCa = false; else pcGanBao = null; render();
});
