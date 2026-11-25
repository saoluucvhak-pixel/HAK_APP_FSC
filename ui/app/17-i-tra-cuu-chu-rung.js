/* ========== 3.5.1: Tra cứu Google Sheet từ màn Thông tin chủ rừng (bảng Cha - Con) và tự điền hồ sơ ==========
 * Nút “🔍 Tra cứu Google Sheet” (đầu form) mở hộp Dữ liệu Google Sheets: bảng Cha = các hợp đồng (số hợp đồng, chủ rừng, CCCD, ký ngày, số rừng, số phiếu, tổng tấn, trạng thái),
 * chọn một dòng → hộp chi tiết (Con: rừng, tọa độ, phiếu cân). Nút “📥 Chọn hợp đồng này & Điền vào hồ sơ” chép thông tin chủ rừng của hợp đồng vào form (chưa lưu: bấm “Lưu thông tin”).
 * Không ghi gì khác vào hồ sơ; việc cập nhật rừng / phiếu cân vẫn do nút “Cập nhật vào hồ sơ” như trước. */
async function infoTraCuuMo() {
  if (!HB) return note('Chỉ dùng được ở bản desktop.', 'err');
  const fe = $('#infoForm'), g = n => fe && fe.elements[n] ? trim(fe.elements[n].value) : '';
  const q = g('soHopDong') || String(g('cccd')).replace(/\D/g, '') || g('ten');
  lkCtx = 'info'; lk.q = q; lk.tab = ''; lk.layout = 'hd'; lk.f = {from: '', to: '', minTan: '', maxTan: '', status: '', onlyIssues: false, sort: 'relevance'}; gs.stat = ''; lk.res = null;
  await lkOpen();
}
/* các trường chủ rừng của hợp đồng đang mở → form Thông tin chủ rừng; trả số ô đã đổi */
function infoDienTuHopDong(d, fe) {
  let n = 0; const set = (k, v) => { const el = fe.elements[k]; if (!el || v == null || String(v) === '') return; if (String(el.value) !== String(v)) { el.value = v; n++; } };
  const F = (d.owner && d.owner.fields) || [];
  F.forEach(x => set(x.key, x.value));
  set('soHopDong', (F.find(x => x.key === 'soHopDong') || {}).value || d.hd);
  if (!trim((fe.elements.cccd || {}).value) && d.cccd) set('cccd', d.cccd);
  if (fe.elements.nguoiDmId) fe.elements.nguoiDmId.value = '';   // thông tin chụp từ Google Sheets, không còn nối người của Danh mục
  const sel = document.getElementById('infoDm'); if (sel) sel.value = '';
  return n;
}
document.addEventListener('click', e => {
  const el = e.target && e.target.closest && e.target.closest('[data-act=infoTraCuu],[data-act=gsFillInfo]'); if (!el) return;
  e.preventDefault();
  if (el.dataset.act === 'infoTraCuu') return infoTraCuuMo();
  const m = gs.m, fe = $('#infoForm'); if (!m || !m.d) return; if (m.busy) return;
  if (!fe) { note('Không còn form Thông tin chủ rừng để điền.', 'err'); return; }
  const n = infoDienTuHopDong(m.d, fe), hd = m.d.hd;
  gsClose(); lkClose(); fe.dispatchEvent(new Event('input', {bubbles: true}));
  /* không gọi note()/render(): vẽ lại màn sẽ xóa các ô vừa điền */
  let box = document.getElementById('infoTraCuuMsg'); if (!box) { box = document.createElement('div'); box.id = 'infoTraCuuMsg'; box.className = 'msg ok'; box.setAttribute('role', 'status'); box.style.gridColumn = '1/-1'; const kh = document.getElementById('infoTraCuu3'); if (kh) kh.after(box); }
  box.textContent = 'Đã điền ' + n + ' ô từ hợp đồng ' + hd + ' vào form. Kiểm tra rồi bấm “Lưu thông tin”.';
  const f1 = fe.elements.ten; if (f1 && f1.focus) f1.focus();
});
