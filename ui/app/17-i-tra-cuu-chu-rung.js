/* ========== 3.5.1: Tra cứu Google Sheet từ màn Thông tin chủ rừng (bảng Cha - Con) và tự điền hồ sơ ==========
 * Nút “🔍 Tra cứu Google Sheet” (đầu form) mở hộp Dữ liệu Google Sheets: bảng Cha = các hợp đồng (số hợp đồng, chủ rừng, CCCD, ký ngày, số rừng, số phiếu, tổng tấn, trạng thái),
 * chọn một dòng → hộp chi tiết (Con: rừng, tọa độ, phiếu cân). Nút “📥 Chọn hợp đồng này & Điền vào hồ sơ” chép thông tin chủ rừng của hợp đồng vào form (chưa lưu: bấm “Lưu thông tin”).
 * Không ghi gì khác vào hồ sơ; việc cập nhật rừng / phiếu cân vẫn do nút “Cập nhật vào hồ sơ” như trước. */
async function infoTraCuuMo() {
  if (!HB) return note('Chỉ dùng được ở bản desktop.', 'err');
  const fe = $('#infoForm'), g = n => fe && fe.elements[n] ? trim(fe.elements[n].value) : '';
  const q = g('soHopDong') || String(g('cccd')).replace(/\D/g, '') || g('ten') || g('ma');
  lkCtx = 'info'; lk.q = q; lk.tab = ''; lk.layout = 'hd'; lk.f = {from: '', to: '', minTan: '', maxTan: '', status: '', onlyIssues: false, sort: 'relevance'}; gs.stat = ''; lk.res = null;
  await lkOpen();
}
/* danh xưng theo tên: có chữ “Thị” (sau họ) → Bà; “Văn” → Ông; không rõ → '' (giữ lựa chọn hiện có) */
function danhXungTuTen(ten) {
  const t = String(ten || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase().split(/\s+/).filter(Boolean);
  if (t.slice(1).includes('thi')) return 'Bà'; if (t.slice(1).includes('van')) return 'Ông'; return '';
}
function infoDatDanhXung(fe, v) { const r = [...fe.querySelectorAll('input[name=danhXung]')].find(x => x.value === v); if (r) r.checked = true; }
/* các trường chủ rừng của hợp đồng đang mở → form Thông tin chủ rừng; trả số ô đã đổi */
function infoDienTuHopDong(d, fe) {
  let n = 0; const set = (k, v) => { const el = fe.elements[k]; if (!el || v == null || String(v) === '') return; if (String(el.value) !== String(v)) { el.value = v; n++; } };
  const F = (d.owner && d.owner.fields) || [];
  F.forEach(x => set(x.key, x.value));
  set('soHopDong', (F.find(x => x.key === 'soHopDong') || {}).value || d.hd);
  if (!trim((fe.elements.cccd || {}).value) && d.cccd) set('cccd', d.cccd);
  { const dx = danhXungTuTen((fe.elements.ten || {}).value); if (dx) infoDatDanhXung(fe, dx); }
  if (!trim((fe.elements.ma || {}).value) && trim((fe.elements.cccd || {}).value)) { fe.elements.ma.value = trim(fe.elements.cccd.value); const cb = document.getElementById('maTheoCccd'); if (cb) cb.checked = true; }
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
  const o0 = curOwner(), coLo = o0 && forestList(o0).length > 0;
  if (o0 && !coLo) {   // chủ rừng mới: lưu thông tin, tạo ngay Rừng 1 liên kết (mã lô = mã chủ rừng-R1) rồi mở lô
    fe.requestSubmit();
    const o1 = curOwner();
    if (o1 && !forestList(o1).length && trim(o1.info.ma)) {
      newForest(); const f = curForest(), ma = trim(o1.info.ma) + '-R1';
      if (f && !HAKLoRung.lotsByMa(db, ma).length) { f.info.maRung = ma; f.info.tenRung = 'Rừng 1'; }
      persist(); note('Đã điền ' + n + ' ô từ hợp đồng ' + hd + ', lưu thông tin chủ rừng và tạo ' + ((f && f.info.tenRung) || 'rừng') + ' · ' + ((f && f.info.maRung) || '') + '.'); return;
    }
    return;
  }
  /* không gọi note()/render(): vẽ lại màn sẽ xóa các ô vừa điền */
  let box = document.getElementById('infoTraCuuMsg'); if (!box) { box = document.createElement('div'); box.id = 'infoTraCuuMsg'; box.className = 'msg ok'; box.setAttribute('role', 'status'); box.style.gridColumn = '1/-1'; const kh = document.getElementById('infoTraCuu3'); if (kh) kh.after(box); }
  box.textContent = 'Đã điền ' + n + ' ô từ hợp đồng ' + hd + ' vào form. Kiểm tra rồi bấm “Lưu thông tin”.';
  const f1 = fe.elements.ten; if (f1 && f1.focus) f1.focus();
});

document.addEventListener('keydown', e => {   // Enter ở bốn ô định danh = Tra cứu Sheets (không lưu form)
  const t = e.target; if (e.key !== 'Enter' || !t || !t.closest || !t.closest('#infoTraCuu3') || t.tagName !== 'INPUT' || t.type === 'checkbox') return;
  e.preventDefault(); if (HB) infoTraCuuMo();
});
document.addEventListener('input', e => {   // ô tích “Dùng số CCCD làm Mã chủ rừng”: mã theo CCCD; gõ tay vào ô Mã thì bỏ tích (mã tự đặt)
  const t = e.target, fe = t && t.form; if (!fe || fe.id !== 'infoForm' || !fe.elements.ma) return;
  const cb = document.getElementById('maTheoCccd'); if (!cb) return;
  if (t.name === 'ma' && cb.checked) { cb.checked = false; fe.elements.ma.readOnly = false; return; }
  if (t.id === 'maTheoCccd' || t.name === 'cccd') { if (cb.checked) fe.elements.ma.value = String(fe.elements.cccd.value).replace(/\D/g, ''); }
  fe.elements.ma.readOnly = cb.checked && !!trim(fe.elements.cccd.value);
});
document.addEventListener('change', e => {   // họ tên đổi → gợi ý danh xưng (Thị → Bà, Văn → Ông)
  const t = e.target, fe = t && t.form; if (!fe || fe.id !== 'infoForm' || t.name !== 'ten') return;
  const dx = danhXungTuTen(t.value); if (dx) infoDatDanhXung(fe, dx);
});
/* bấm đúp một dòng hợp đồng (khi mở từ form Thông tin chủ rừng) = mở chi tiết rồi “Chọn hợp đồng này & Điền vào hồ sơ” */
document.addEventListener('dblclick', async e => {
  const row = e.target && e.target.closest && e.target.closest('#lkBox [data-gsrow]'); if (!row || lkCtx !== 'info') return;
  for (let i = 0; i < 30 && !(gs.m && gs.m.d); i++) await new Promise(r => setTimeout(r, 50));
  const b = document.getElementById('gsFillInfo'); if (b) b.click();
});
