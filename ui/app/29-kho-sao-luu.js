/* ========== KHO SAO LƯU (Cài đặt → Sao lưu và khôi phục; xử lý ở src/khosaoluu.js, src/main.js) ==========
 * Một nơi xem mọi bản sao lưu trên máy (tự động hằng ngày, sao lưu toàn bộ, bản tự tạo trước khi nâng cấp / khôi phục / xóa): thời điểm, loại, dung lượng;
 * kiểm tra từng bản có dùng được không; khôi phục toàn bộ từ bản .sqlite (có xem trước số liệu, phần mềm sao lưu dữ liệu hiện tại trước khi ghi) hoặc bản .json
 * (qua màn xem trước sẵn có); xóa bản cũ để giải phóng ổ đĩa. Nhãn trạng thái sao lưu ở thanh ngữ cảnh mở thẳng màn này. */
const ksl = {d: null, msg: null, loc: '', kiem: {}, busy: false, st: null};
const kslMB = b => b >= 1073741824 ? (b / 1073741824).toFixed(2).replace('.', ',') + ' GB' : b >= 1048576 ? (b / 1048576).toFixed(1).replace('.', ',') + ' MB' : Math.max(1, Math.ceil(b / 1024)) + ' KB';
const kslNgay = iso => { const d = new Date(iso), n = Math.round((new Date(new Date().toDateString()) - new Date(d.toDateString())) / 86400000); return n <= 0 ? 'hôm nay' : n === 1 ? 'hôm qua' : n + ' ngày trước'; };
/* dữ liệu vừa bị THAY từ nơi khác (khôi phục toàn bộ, khôi phục lô, khôi phục từ kho): bản nháp và dấu “chưa lưu” cũ không còn đích; bản đã lưu = đúng dữ liệu vừa nạp.
 * Không làm bước này thì một lô đang “chưa lưu” sẽ bị ghi lại bằng bản TRƯỚC khi khôi phục ở lần lưu kế tiếp (dbGhi dùng savedSnap cũ). */
function dbThayToanBo(moi) {
  db = withDefaults(moi); dbEpoch++; Object.keys(stages).forEach(k => delete stages[k]); loDirty.clear();   // saveCache giữ nguyên: phiên bản (rev) đã cũ nên lần lưu kế bị từ chối STALE và tự lưu toàn bộ
  try { savedSnap = HAKDelta.snapshot(db); } catch (e) { savedSnap = null; }
  doiDuLieu();
}
function panelKhoSaoLuu() {
  /* Sao lưu / khôi phục bằng FILE (trước đây ở menu “⋯ Thêm”): sao lưu toàn bộ, khôi phục toàn bộ từ .json, khôi phục một lô. Ô chọn file nằm sẵn ở khung trang (#restoreInput). */
  const tuFile = '<div class="card" style="margin:10px 0" id="kslTuFile"><h3 style="margin:0 0 6px">Sao lưu và khôi phục bằng file</h3>' +
    '<p class="mut" style="margin:0 0 8px">Dùng khi chuyển dữ liệu sang máy khác hoặc khôi phục từ file đã lưu ở ổ ngoài. Mọi lần khôi phục đều có màn xem trước và phần mềm tự sao lưu dữ liệu hiện tại trước khi ghi.</p>' +
    '<div class="row" style="gap:8px;flex-wrap:wrap"><button class="btn" data-act="backup" id="backupAllBtn">Sao lưu toàn bộ dữ liệu' + (HB ? ' (.json + .sqlite)' : ' (.json)') + '</button>' +
    '<label class="btn ghost" for="restoreInput" id="restoreLbl" style="cursor:pointer">Khôi phục toàn bộ từ file .json…</label>' +
    '<button class="btn ghost" data-act="lotRestore" id="lotRestoreBtn">Khôi phục lô rừng…</button></div></div>';
  if (!HB) return '<div class="card"><h2 style="margin-top:0">Sao lưu và khôi phục</h2><div class="msg warn">Bản chạy trong trình duyệt lưu dữ liệu trong trình duyệt: hãy sao lưu ra file thường xuyên. Kho sao lưu tự động chỉ có ở bản cài trên Windows.</div>' + tuFile + '</div>';
  return '<div class="card"><h2 style="margin-top:0">Sao lưu và khôi phục</h2>' + (ksl.msg ? '<div class="msg ' + ksl.msg[1] + '" id="kslMsg">' + esc(ksl.msg[0]) + '</div>' : '') + tuFile + '<div id="kslBox" class="mut">Đang đọc thư mục sao lưu…</div></div>';
}
function kslPaint() {
  const box = document.getElementById('kslBox'), d = ksl.d; if (!box || !d) return;
  const st = ksl.st || {}, rm = st.remind || {}, au = st.auto || {};
  const items = d.items.filter(x => !ksl.loc || x.loai === ksl.loc), loai = [...new Map(d.items.map(x => [x.loai, x.tenLoai])).entries()];
  const tuDong = !au.keep ? '<span class="pill warn">đang tắt</span> Bật ở tab Hệ thống.' : au.last ? '<b>' + esc(kslNgay(au.last.day + 'T12:00:00')) + '</b> (' + esc(au.last.day.split('-').reverse().join('/')) + ', ' + kslMB(au.last.size) + ') · giữ ' + au.keep + ' bản gần nhất' : 'chưa có bản nào';
  const toanBo = rm.lastBackup ? '<b>' + esc(kslNgay(rm.lastBackup)) + '</b> (' + esc(fmtDT(rm.lastBackup)) + ')' + (rm.due ? ' <span class="pill warn">đã đến hạn nhắc</span>' : '') : '<b>chưa có</b>' + (rm.due ? ' <span class="pill warn">nên sao lưu</span>' : '');
  box.className = '';
  box.innerHTML = '<div class="card" style="margin:10px 0" id="kslTinhTrang"><h3 style="margin:0 0 6px">Tình trạng</h3>' +
    '<div>Tự sao lưu hằng ngày: ' + tuDong + (d.chuaVaoBanTuDong ? ' · <span class="pill warn" id="kslChuaVao">có thay đổi chưa vào bản hôm nay</span> <span class="mut">(tự làm mới khi đóng phần mềm, hoặc bấm “Tự sao lưu ngay”)</span>' : '') + '</div>' +
    '<div style="margin-top:4px">Sao lưu toàn bộ (.json + .sqlite, nên lưu ra ổ khác): ' + toanBo + '</div>' +
    '<div class="mut" style="margin-top:4px;word-break:break-all">Thư mục: ' + d.dirs.map(x => '<code>' + esc(x) + '</code>').join(' · ') + '</div>' +
    (d.loi && d.loi.length ? '<div class="msg warn" style="margin-top:6px">Không đọc được: ' + d.loi.map(x => esc(x.dir) + ' (' + esc(x.error) + ')').join('; ') + '</div>' : '') +
    '<div class="row" style="margin-top:10px;gap:8px;flex-wrap:wrap"><button class="btn ghost" data-act="kslAuto" id="kslAutoBtn"' + (au.keep ? '' : ' disabled') + '>Tự sao lưu ngay</button>' +
    '<button class="btn ghost" data-act="setOpenBackup">Mở thư mục sao lưu</button><button class="btn ghost" data-act="kslTai">Tải lại danh sách</button></div></div>' +
    '<div class="card" style="margin:10px 0"><div class="row" style="justify-content:space-between;flex-wrap:wrap;gap:8px"><h3 style="margin:0">Các bản sao lưu trên máy</h3>' +
    '<span class="mut" id="kslTong">' + d.tong.soBan + ' bản · ' + kslMB(d.tong.bytes) + '</span></div>' +
    (d.items.length ? '<div class="row" style="margin:8px 0;gap:8px;align-items:center"><label style="flex-direction:row;gap:6px;align-items:center">Loại <select id="kslLoc"><option value="">Tất cả (' + d.items.length + ')</option>' + loai.map(([m, t]) => '<option value="' + esc(m) + '"' + (ksl.loc === m ? ' selected' : '') + '>' + esc(t) + ' (' + d.items.filter(x => x.loai === m).length + ')</option>').join('') + '</select></label></div>' +
      '<div class="wrap" style="max-height:460px;overflow:auto"><table id="kslBang"><tr><th>Thời điểm</th><th>Loại</th><th>Tên file</th><th style="text-align:right">Dung lượng</th><th>Kiểm tra</th><th></th></tr>' +
      items.map((x, i) => { const k = ksl.kiem[x.file];
        return '<tr data-ksl-loai="' + esc(x.loai) + '"><td style="white-space:nowrap">' + esc(fmtDT(x.mtime)) + '</td><td><span class="pill">' + esc(x.tenLoai) + '</span></td><td style="word-break:break-all"><code>' + esc(x.name) + '</code>' + (d.dirs.length > 1 ? '<br><small class="mut">' + esc(x.dir) + '</small>' : '') + '</td><td style="text-align:right;white-space:nowrap">' + kslMB(x.size) + '</td>' +
          '<td data-ksl-kiem>' + (!k ? '<span class="mut">chưa kiểm</span>' : k.ok ? '<span class="pill ok">dùng được</span><br><small class="mut">' + (k.counts.owners || 0) + ' chủ rừng, ' + (k.counts.forests || 0) + ' lô' + (k.version ? ' · cấu trúc v' + k.version : '') + '</small>' : '<span class="pill err">không dùng được</span><br><small>' + esc(k.error) + '</small>') + '</td>' +
          '<td style="white-space:nowrap"><button class="btn ghost sm" data-act="kslKiem" data-i="' + i + '">Kiểm tra</button> <button class="btn ghost sm" data-act="kslKhoiPhuc" data-i="' + i + '">Khôi phục…</button> <button class="btn danger sm" data-act="kslXoa" data-i="' + i + '">Xóa</button></td></tr>'; }).join('') + '</table></div>' +
      '<p class="mut" style="margin:8px 0 0">Khôi phục từ bản .sqlite thay <b>toàn bộ</b> hồ sơ trên máy bằng bản đó (có xem trước; dữ liệu hiện tại được sao lưu trước khi ghi nên hoàn tác được bằng chính màn này). Bản .json mở màn xem trước cho phép chọn giữ / ghi đè / giữ cả hai. Bản “Trước khi…” do phần mềm tự tạo trước mỗi thao tác lớn; loại “Trước khi khôi phục”, “Trước khi khôi phục lô”, “Trước khi xóa” tự giữ 20 bản gần nhất.</p>'
      : '<p class="mut" id="kslTrong">Chưa có bản sao lưu nào trong thư mục sao lưu.</p>') + '</div>';
  ksl.hien = items;
  const sel = document.getElementById('kslLoc'); if (sel) sel.addEventListener('change', () => { ksl.loc = sel.value; kslPaint(); });
}
async function kslLoad() {
  if (!HB || !HB.saoLuu) return;
  const [r, s] = await Promise.all([HB.saoLuu.list(), HB.settings.get()]);
  if (!r.ok) { const b = document.getElementById('kslBox'); if (b) b.innerHTML = '<div class="msg err">Không đọc được thư mục sao lưu: ' + esc(r.error) + '</div>'; return; }
  ksl.d = r; ksl.st = s.ok ? s.settings : null; kslPaint(); bkChipFill(ksl.st);
}
const kslItem = el => (ksl.hien || [])[+el.dataset.i] || null;
async function kslKiem(el) {
  const x = kslItem(el); if (!x) return;
  const r = await HB.saoLuu.verify(x.file);
  ksl.kiem[x.file] = r.ok ? r.kiem : {ok: false, counts: {}, error: r.error}; kslPaint();
}
async function kslAuto() {
  if (ksl.busy) return; ksl.busy = true;
  try { const r = await HB.saoLuu.autoNow(); ksl.msg = r.ok ? [r.auto && r.auto.skipped ? (r.auto.reason === 'empty' ? 'Chưa có hồ sơ nên chưa sao lưu.' : 'Bản tự sao lưu của hôm nay đã chứa dữ liệu mới nhất.') : 'Đã tự sao lưu và kiểm tra: ' + ((r.auto && r.auto.file) || ''), 'ok'] : ['Tự sao lưu không được: ' + (r.error || 'lỗi không rõ'), 'err']; }
  finally { ksl.busy = false; }
  render();
}
async function kslXoa(el) {
  const x = kslItem(el); if (!x) return;
  if (!confirm('Xóa bản sao lưu này khỏi ổ đĩa?\n\n' + x.name + ' (' + x.tenLoai + ', ' + fmtDT(x.mtime) + ', ' + kslMB(x.size) + ')\n\nKhông hoàn tác được.')) return;
  const r = await HB.saoLuu.remove(x.file); delete ksl.kiem[x.file];
  ksl.msg = r.ok ? ['Đã xóa ' + x.name + ' (' + kslMB(x.size) + ').', 'ok'] : ['Không xóa được: ' + r.error, 'err']; render();
}
async function kslKhoiPhuc(el) {
  const x = kslItem(el); if (!x || ksl.busy) return;
  if (x.dinhDang === 'json') {   // bản .json: đi qua màn xem trước của “Khôi phục toàn bộ dữ liệu” (giữ / ghi đè / giữ cả hai / thay toàn bộ)
    const r = await HB.saoLuu.readJson(x.file); if (!r.ok) return note('Không đọc được bản sao lưu: ' + r.error, 'err');
    return restoreAll({text: async () => r.text});
  }
  ksl.busy = true; let p; try { p = await HB.saoLuu.preview(x.file); } finally { ksl.busy = false; }
  if (!p.ok) { ksl.kiem[x.file] = {ok: false, counts: {}, error: p.error}; ksl.msg = ['Không khôi phục được từ ' + x.name + ': ' + p.error + ' Dữ liệu trên máy chưa bị thay đổi.', 'err']; return render(); }
  const I = p.xem.trongBan, E = p.xem.trenMay, row = (l, a, b) => '<tr><td>' + l + '</td><td style="text-align:right">' + fmt(a) + '</td><td style="text-align:right">' + fmt(b) + (a !== b ? ' <span class="pill warn">khác</span>' : '') + '</td></tr>';
  window.__ksl = x;
  $('#impBody').innerHTML = '<h2>Khôi phục từ bản sao lưu</h2><table><tr><th>Bản sao lưu</th><td><code>' + esc(x.name) + '</code></td></tr><tr><th>Loại</th><td>' + esc(x.tenLoai) + '</td></tr><tr><th>Thời điểm</th><td>' + esc(fmtDT(x.mtime)) + ' · ' + kslMB(x.size) + ' · cấu trúc v' + p.xem.version + '</td></tr></table>' +
    '<table id="kslXem"><tr><th></th><th style="text-align:right">Đang có trên máy</th><th style="text-align:right">Trong bản sao lưu</th></tr>' + row('Chủ rừng', E.owners, I.owners) + row('Lô rừng', E.forests, I.forests) + row('Nhân công', E.nc, I.nc) + row('Xe', E.dx, I.dx) + row('Phiếu cân', E.pc, I.pc) + row('Công ty mua hàng', E.companies, I.companies) + '</table>' +
    '<div class="msg warn"><b>Thay toàn bộ hồ sơ trên máy bằng bản sao lưu này.</b> Mọi thay đổi sau thời điểm của bản sao lưu sẽ không còn trong dữ liệu đang dùng' + (loDirty.size || stDirtyCur() ? ', kể cả <b>thay đổi chưa lưu</b> của lô đang mở' : '') + '.</div>' +
    '<p class="mut">Trước khi ghi, phần mềm sao lưu dữ liệu hiện tại (bản “Trước khi khôi phục” trong kho) và ghi trong một giao dịch: lỗi giữa chừng thì không đổi gì. Hồ sơ đã chốt trong bản sao lưu phải còn toàn vẹn. File sao lưu gốc và bản tra cứu Google Sheets không bị đổi.</p>' +
    '<div class="row" style="justify-content:flex-end"><button class="btn ghost" data-act="kslHuy">Hủy</button><button class="btn" data-act="kslGo" id="kslGoBtn">Thay toàn bộ bằng bản này</button></div>';
  $('#impBox').classList.add('on');
}
async function kslGo() {
  const x = window.__ksl; if (!x || ksl.busy) return;
  if (!confirm('THAY TOÀN BỘ hồ sơ trên máy bằng bản sao lưu ' + x.name + ' (' + fmtDT(x.mtime) + ')?\n\nDữ liệu hiện tại được sao lưu trước khi ghi.')) return;
  ksl.busy = true; let r; try { r = await HB.saoLuu.restore(x.file); } finally { ksl.busy = false; }
  $('#impBox').classList.remove('on'); window.__ksl = null;
  if (!r.ok) { ksl.msg = ['Không khôi phục được, dữ liệu cũ giữ nguyên: ' + r.error, 'err']; return render(); }
  dbThayToanBo(r.db); cur = null; curF = null;
  ksl.msg = ['Đã khôi phục từ ' + r.name + ': ' + r.counts.owners + ' chủ rừng, ' + r.counts.forests + ' lô, ' + r.counts.nc + ' nhân công, ' + r.counts.dx + ' xe, ' + r.counts.pc + ' phiếu cân' + (r.goiCu ? '; chép thêm ' + r.goiCu + ' bản chụp của các lần chốt trước' : '') + '. Dữ liệu trước khi khôi phục: ' + r.backup, 'ok'];
  render();
}
/* Nhãn trạng thái sao lưu ở thanh ngữ cảnh (bản cài): bản tự sao lưu gần nhất; đến hạn nhắc sao lưu toàn bộ thì chuyển màu cảnh báo. Bấm để mở Kho sao lưu. */
function bkChipFill(s) {
  const el = document.getElementById('bkChip'); if (!el || !HB) return;
  const ve = st => {
    if (!st) return; const au = st.auto || {}, rm = st.remind || {};
    const t = !au.keep ? 'Tự sao lưu: tắt' : au.last ? 'Tự sao lưu: ' + kslNgay(au.last.day + 'T12:00:00') : 'Tự sao lưu: chưa có';
    el.textContent = t + (rm.due ? ' · cần sao lưu toàn bộ' : ''); el.hidden = false;
    el.classList.toggle('warn', !!rm.due || !au.keep); el.classList.toggle('ok', !rm.due && !!au.keep && !!au.last);
    el.title = 'Sao lưu toàn bộ gần nhất: ' + (rm.lastBackup ? fmtDT(rm.lastBackup) : 'chưa có') + '. Bấm để mở Sao lưu và khôi phục.';
  };
  if (s) return ve(s);
  HB.settings.get().then(r => { if (r && r.ok) ve(r.settings); }).catch(() => {});
}
if (HB) { document.addEventListener('DOMContentLoaded', () => { setTimeout(bkChipFill, 1500); setInterval(bkChipFill, 600000); }); }
/* Ctrl+S: lưu lô đang mở (như bấm “Lưu dữ liệu vào lô”); không có gì chưa lưu thì chỉ báo. Không lưu khi đang mở hộp thoại nhập / khôi phục. */
document.addEventListener('keydown', e => {
  if (!(e.ctrlKey || e.metaKey) || e.altKey || (e.key !== 's' && e.key !== 'S')) return;
  e.preventDefault();
  if (document.querySelector('#impBox.on, #stBox.on, #lkBox.on, #rpBox.on')) return;
  if (document.activeElement && typeof document.activeElement.blur === 'function' && /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName)) document.activeElement.blur();   // ô đang gõ: ghi nhận giá trị (sự kiện change) trước khi lưu
  setTimeout(async () => {
    if (document.querySelector('.formMsg')) return;   // ô vừa nhập chưa hợp lệ (khung đang báo lỗi): không báo “không có thay đổi”
    if (typeof window.__stDirty !== 'function' || !window.__stDirty().length) return showSave(curForest() ? 'Không có thay đổi chưa lưu (Ctrl+S)' : saveSt.text, false);
    const r = await window.__stSaveCurrent();
    if (r && r.ok === false && r.error) note('Chưa lưu được: ' + r.error, 'err');
  }, 0);
});
/* ===== Cài đặt → Giao diện (bảng màu, sáng / tối) và Trợ giúp: các mục trước đây ở menu “⋯ Thêm” ===== */
function panelSetUi() {
  const dark = document.documentElement.dataset.theme === 'dark';
  setTimeout(() => setSkin(document.documentElement.dataset.skin), 0);   // vẽ danh sách bảng màu vào #skinPick sau khi khung đã vào trang
  return '<div class="card"><h2 style="margin-top:0">Giao diện</h2>' +
    '<div class="card" style="margin:10px 0"><h3 style="margin:0 0 6px">Chế độ sáng / tối</h3><div class="row" style="gap:8px"><button class="btn' + (dark ? ' ghost' : '') + '" data-act="themeSet" data-theme-v="light" id="themeLight">Sáng</button><button class="btn' + (dark ? '' : ' ghost') + '" data-act="themeSet" data-theme-v="dark" id="themeDark">Tối</button></div></div>' +
    '<div class="card" style="margin:10px 0"><h3 style="margin:0 0 6px">Bảng màu</h3><div class="mi-sec" id="skinPick" role="group" aria-label="Bảng màu" style="max-width:420px;padding:0"></div></div></div>';
}
function panelSetHelp() {
  return '<div class="card"><h2 style="margin-top:0">Trợ giúp</h2>' +
    '<div class="card" style="margin:10px 0"><h3 style="margin:0 0 4px">Hướng dẫn sử dụng</h3><p class="mut" style="margin:0 0 8px">Tài liệu đầy đủ theo từng màn hình, mở ngay trong phần mềm.</p><button class="btn" data-act="guide" id="guideBtn">Mở hướng dẫn sử dụng</button></div>' +
    '<div class="card" style="margin:10px 0"><h3 style="margin:0 0 4px">Hướng dẫn bắt đầu</h3><p class="mut" style="margin:0 0 8px">Sáu bước đầu tiên, hiện ở màn Tổng quan và tự đánh dấu bước đã xong.</p><button class="btn ghost" data-act="hdHien" id="hdHienBtn">Hiện hướng dẫn bắt đầu ở Tổng quan</button></div>' +
    '<div class="card" style="margin:10px 0"><h3 style="margin:0 0 4px">Phím tắt</h3><div class="mut"><b>Ctrl+S</b> lưu lô đang mở · <b>Ctrl+K</b> tìm kiếm toàn cục · <b>Esc</b> đóng hộp thoại</div></div></div>';
}
