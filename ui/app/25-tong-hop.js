/* ========== Trang tổng hợp theo đối tượng (bản 2.2, mục 5.2; src/tonghop.js) ==========
 * Mở từ kết quả tìm kiếm (nút “Tổng hợp”) cho người, xe, đối tác, chủ rừng: thông tin hiện hành, lịch sử danh mục, các lô đã tham gia, số chuyến và khối lượng. Chỉ đọc. */
let thOn = null;
function thMo(loai, key) {
  const f = {nguoi: HAKTongHop.nguoi, xe: HAKTongHop.xe, doitac: HAKTongHop.doiTac, chu: HAKTongHop.chuRung}[loai], r = f ? f(Object.assign({}, db, dmCu()), key) : null;
  if (!r) return note('Không có dữ liệu tổng hợp cho đối tượng này.', 'warn');
  thOn = r; thVe();
}
function thDong() { thOn = null; thVe(); }
function thVe() {
  let box = document.getElementById('thBox');
  if (!thOn) { if (box) box.remove(); return; }
  const fmt = v => typeof v === 'number' ? String(v).replace('.', ',') : esc(v == null ? '' : v);
  const html = '<div id="thPanel" role="dialog" aria-label="Tổng hợp" style="position:fixed;left:50%;top:6vh;transform:translateX(-50%);width:min(980px,96vw);max-height:86vh;overflow:auto;background:var(--card,#fff);color:var(--ink,#111);border:1px solid var(--line,#ccc);border-radius:12px;box-shadow:0 12px 40px rgba(0,0,0,.3);padding:14px;z-index:1000">' +
    '<div class="row" style="justify-content:space-between;align-items:center"><h2 style="margin:0">' + esc(thOn.tieuDe) + '</h2><button class="btn ghost sm" data-thdong="1">✕ Đóng</button></div>' +
    thOn.muc.map(m => '<h4 style="margin:12px 0 4px">' + esc(m.ten) + ' <span class="mut">(' + m.dong.length + ')</span></h4>' + (m.dong.length ? '<div class="wrap"><table class="normTbl" style="min-width:0;table-layout:auto"><thead><tr>' + m.cot.map(c => '<th>' + esc(c) + '</th>').join('') +
    '</tr></thead><tbody>' + m.dong.map(d => '<tr>' + d.map(v => '<td>' + fmt(v) + '</td>').join('') + '</tr>').join('') + '</tbody></table></div>' : '<p class="mut" style="margin:0">Chưa có.</p>')).join('') + '</div>';
  if (!box) { box = document.createElement('div'); box.id = 'thBox'; box.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.35);z-index:999'; document.body.appendChild(box); box.addEventListener('mousedown', e => { if (e.target === box) thDong(); }); }
  box.innerHTML = html; box.querySelector('[data-thdong]').addEventListener('click', thDong);
}
document.addEventListener('keydown', e => { if (thOn && e.key === 'Escape') { e.preventDefault(); thDong(); } });
