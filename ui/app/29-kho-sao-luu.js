/* ========== KHO SAO LƯU (Cài đặt → Sao lưu và khôi phục; xử lý ở src/khosaoluu.js, src/main.js) ==========
 * Một nơi xem mọi bản sao lưu trên máy (tự động hằng ngày, sao lưu toàn bộ, bản tự tạo trước khi nâng cấp / khôi phục / xóa): thời điểm, loại, dung lượng;
 * kiểm tra từng bản có dùng được không; khôi phục toàn bộ từ bản .sqlite (có xem trước số liệu, phần mềm sao lưu dữ liệu hiện tại trước khi ghi) hoặc bản .json
 * (qua màn xem trước sẵn có); xóa bản cũ để giải phóng ổ đĩa. Nhãn trạng thái sao lưu ở thanh ngữ cảnh mở thẳng màn này. */
const ksl = {d: null, msg: null, loc: '', kiem: {}, busy: false, st: null, tab: 'thaotac'};   // tab: tab con đang mở của “Sao lưu và khôi phục” (PR C), nhớ trong phiên
const SB_TABS = [['thaotac', 'Thao tác'], ['thumuc', 'Thư mục và lịch'], ['ban', 'Các bản sao lưu']];
const kslMB = b => b >= 1073741824 ? (b / 1073741824).toFixed(2).replace('.', ',') + ' GB' : b >= 1048576 ? (b / 1048576).toFixed(1).replace('.', ',') + ' MB' : Math.max(1, Math.ceil(b / 1024)) + ' KB';
const kslNgay = iso => { const d = new Date(iso), n = Math.round((new Date(new Date().toDateString()) - new Date(d.toDateString())) / 86400000); return n <= 0 ? 'hôm nay' : n === 1 ? 'hôm qua' : n + ' ngày trước'; };
/* dữ liệu vừa bị THAY từ nơi khác (khôi phục toàn bộ, khôi phục lô, khôi phục từ kho): bản nháp và dấu “chưa lưu” cũ không còn đích; bản đã lưu = đúng dữ liệu vừa nạp.
 * Không làm bước này thì một lô đang “chưa lưu” sẽ bị ghi lại bằng bản TRƯỚC khi khôi phục ở lần lưu kế tiếp (dbGhi dùng savedSnap cũ). */
function dbThayToanBo(moi) {
  db = withDefaults(moi); dbEpoch++; Object.keys(stages).forEach(k => delete stages[k]); loDirty.clear(); loMoi.clear(); chuNhap.clear(); aliasNhap.clear();   // saveCache giữ nguyên: phiên bản (rev) đã cũ nên lần lưu kế bị từ chối STALE và tự lưu toàn bộ
  try { savedSnap = HAKDelta.snapshot(db); } catch (e) { savedSnap = null; }
  doiDuLieu();
}
/* 3.0 + phiếu #13b (quyết định 7): bốn thao tác ở đầu màn (Sao lưu toàn bộ, Khôi phục toàn bộ, Sao lưu lô, Khôi phục lô) */
function backupConfirmSaved() {
  if (storeOk && !stDirtyList().length && !saveTimer) return true;
  const dList = stDirtyList();
  if (dList.length) {
    return confirm('Đang có ' + dList.length + ' lô còn bản nháp chưa bấm "Lưu dữ liệu vào lô".\n\nBản sao lưu toàn bộ sẽ chỉ gồm dữ liệu đã lưu vào máy (chưa gồm các bản nháp này).\n\n• Bấm OK: Vẫn sao lưu ngay các dữ liệu đã lưu.\n• Bấm Hủy: Quay lại để bấm "Lưu dữ liệu vào lô" trước khi sao lưu.');
  }
  if (!storeOk) {
    return confirm('Cơ sở dữ liệu đang có lỗi ghi nhận gần nhất. Dữ liệu đã lưu an toàn trước đó vẫn có thể sao lưu.\n\n• Bấm OK: Sao lưu các dữ liệu an toàn đã lưu.\n• Bấm Hủy: Kiểm tra lại lỗi lưu trước.');
  }
  return true;
}

const kslNut = () => '<div class="card" style="margin:0 0 10px" id="kslNut"><h3 style="margin:0 0 6px">Sao lưu và khôi phục</h3><p class="mut">Sau khi nhập hoặc sửa, bấm “Lưu dữ liệu vào lô”. Để mang cả hồ sơ sang máy khác, chọn lưu bản sao ra tệp hoặc USB. Nếu chỉ cần một lô, mở lô đó và chọn “Sao lưu lô rừng”.</p><div class="row" style="gap:8px;flex-wrap:wrap">' +
  '<button class="btn" data-act="backup" id="kslJson">Sao lưu toàn bộ dữ liệu (.json' + (HB ? ' + .sqlite' : '') + ')</button>' +
  (HB && HB.backupSaveAs ? '<button class="btn ghost" data-act="backupSaveAs" id="kslSaveAsBtn">Lưu bản sao lưu ra tệp / USB…</button>' : '') +
  (HB && HB.restorePick ? '<button class="btn ghost" data-act="restorePick" id="restorePickBtn">Khôi phục toàn bộ dữ liệu (.json / .sqlite)…</button>' : '') +
  '<label class="btn ghost" style="' + (HB && HB.restorePick ? 'display:none;' : '') + 'cursor:pointer" id="restoreLbl">Khôi phục toàn bộ dữ liệu (.json)<input type="file" accept=".json,application/json" data-file="restore" hidden></label>' +
  (HB ? '<button class="btn ghost" data-act="lotBackup" id="kslLotSaveBtn">Sao lưu lô rừng…</button><button class="btn ghost" data-act="lotRestore" id="lotRestoreBtn">Khôi phục lô rừng…</button>' : '') + '</div></div>';
function panelKhoSaoLuu() {
  if (!HB) return kslNut() + '<div class="card"><div class="msg warn">Kho sao lưu (các bản .sqlite tự động) chỉ có ở bản cài trên Windows.</div></div>';
  const m = ksl.msg || setg.msg;
  const msgHtml = m ? '<div class="msg ' + m[1] + '" id="kslMsg"><span id="setMsg">' + esc(m[0]) + '</span></div>' : '';
  if (!SB_TABS.some(t => t[0] === ksl.tab)) ksl.tab = 'thaotac';
  const pane = (k, inner) => '<section data-sbpane="' + k + '" id="sbPane_' + k + '"' + (ksl.tab === k ? '' : ' hidden') + '>' + inner + '</section>';   // ẩn bằng hidden: phần tử vẫn có trong trang, chữ gõ dở không mất khi đổi tab
  return msgHtml + '<nav class="hak-catalog-tabs sub" id="sbTabs" aria-label="Sao lưu và khôi phục">' + SB_TABS.map(([k, l]) => '<button type="button" data-sbtab="' + k + '" id="sbTab_' + k + '"' + (ksl.tab === k ? ' aria-current="page"' : '') + '>' + l + '</button>').join('') + '</nav>' +
    pane('thaotac', kslNut() + '<div class="card"><h2 style="margin-top:0">Kho sao lưu và cài đặt sao lưu</h2><div id="kslBox" class="mut">Đang đọc thư mục sao lưu…</div></div>') +
    pane('thumuc', '<div id="kslBoxB" class="mut">Đang đọc cài đặt sao lưu…</div>') + pane('ban', '<div id="kslBoxC" class="mut">Đang đọc thư mục sao lưu…</div>');
}
function kslPaint() {
  const box = document.getElementById('kslBox'), d = ksl.d; if (!box || !d) return;
  const st = ksl.st || {}, rm = st.remind || {}, au = st.auto || {}, ck = au.chuKy || (au.keep ? 'ngay' : 'tat');
  const items = d.items.filter(x => !ksl.loc || x.loai === ksl.loc), loai = [...new Map(d.items.map(x => [x.loai, x.tenLoai])).entries()];
  const sz = b => b / 1048576 >= 1 ? (b / 1048576).toFixed(1) + ' MB' : Math.ceil(b / 1024) + ' KB';
  const tuDong = !au.keep || ck === 'tat' ? '<span class="pill warn">đang tắt</span>' : au.last ? '<b>' + esc(kslNgay(au.last.day + 'T12:00:00')) + '</b> (' + esc(au.last.day.split('-').reverse().join('/')) + ', ' + kslMB(au.last.size) + ') · giữ ' + au.keep + ' bản gần nhất' : 'chưa có bản nào';
  const toanBo = rm.lastBackup ? '<b>' + esc(kslNgay(rm.lastBackup)) + '</b> (' + esc(fmtDT(rm.lastBackup)) + ')' + (rm.due ? ' <span class="pill warn">đã đến hạn nhắc</span>' : '') : '<b>chưa có</b>' + (rm.due ? ' <span class="pill warn">nên sao lưu</span>' : '');
  const r = au.result, last = au.last;
  const stTxt = !au.keep || ck === 'tat' ? 'Đang tắt.' : r && !r.ok ? '<span class="warnTxt">Lần chạy gần nhất không được: ' + esc(r.error || '') + '</span>' : r && r.skipped && r.reason === 'empty' ? 'Chưa có hồ sơ nên chưa sao lưu.' : '';
  const sqlCard = '<div class="card" style="margin:10px 0" id="autoBk"><h3 style="margin:0 0 4px">Thư mục và tự sao lưu SQLite (Tự sao lưu hằng ngày / định kỳ)</h3>' +
    '<p class="mut" style="margin:0 0 8px">Nơi lưu bản sao lưu tự động trước khi nâng cấp dữ liệu, bản tự sao lưu định kỳ và bản .sqlite khi bấm Sao lưu toàn bộ. Khi đóng phần mềm (và định kỳ khi để máy mở), bản hiện hành được làm mới nếu dữ liệu đã đổi.</p>' +
    '<div style="word-break:break-all"><b>Đang dùng:</b> <code data-set-path>' + esc(st.backupDir || '') + '</code> <span class="pill ' + (st.customBackup ? 'ok' : '') + '">' + (st.customBackup ? 'thư mục riêng' : 'mặc định') + '</span></div>' +
    '<div class="row" style="margin-top:8px;gap:8px;flex-wrap:wrap"><button class="btn" data-act="setBackup">Chọn thư mục…</button>' + (st.customBackup ? '<button class="btn ghost" data-act="setBackupDefault">Về mặc định</button>' : '') + '<button class="btn ghost" data-act="setOpenBackup">Mở thư mục sao lưu</button></div>' +
    '<div class="mut" style="margin-top:4px;font-size:12px">Mặc định: ' + esc(st.defaultBackupDir || '') + '</div>' +
    '<div class="row" style="margin-top:10px;gap:8px;flex-wrap:wrap;align-items:center">' +
    '<label>Chu kỳ <select id="setAutoChuKy">' + [['tat', 'Tắt'], ['2gio', 'Mỗi 2 giờ'], ['ngay', 'Hằng ngày'], ['tuan', 'Hằng tuần']].map(o => '<option value="' + o[0] + '"' + (o[0] === ck ? ' selected' : '') + '>' + o[1] + '</option>').join('') + '</select></label>' +
    '<label>Giữ <select id="setAutoKeep">' + [[0, 'Tắt'], [3, '3 bản'], [7, '7 bản'], [14, '14 bản'], [30, '30 bản']].map(o => '<option value="' + o[0] + '"' + (o[0] === au.keep ? ' selected' : '') + '>' + o[1] + '</option>').join('') + '</select></label>' +
    '<button class="btn ghost sm" data-act="kslAuto">Sao lưu ngay</button>' +
    '<span class="mut" data-auto-last>' + (last ? 'Bản gần nhất: ' + esc(last.day.split('-').reverse().join('/')) + ' (' + sz(last.size) + ') · đang có ' + au.count + ' bản' : 'Chưa có bản tự sao lưu nào') + '</span>' + (stTxt ? ' <span class="mut">' + stTxt + '</span>' : '') + '</div>' +
    '<div style="margin-top:10px;padding-top:10px;border-top:1px solid var(--line,#ddd)" id="dbBk2"><h4 style="margin:0 0 4px">Thư mục sao lưu thứ hai</h4><p class="mut" style="margin:0 0 6px">Mỗi bản tự sao lưu SQLite được chép thêm sang đây (ổ ngoài, USB, thư mục đồng bộ) để phòng hỏng cả máy. Ổ không cắm thì bỏ qua, bản chính vẫn còn.</p>' +
    (au.dir2 ? '<div style="word-break:break-all"><b>Đang dùng:</b> <code>' + esc(au.dir2) + '</code></div>' + ((au.result && au.result.copy2 && !au.result.copy2.ok) ? '<div class="msg warn" style="margin-top:6px">Lần chép gần nhất không được: ' + esc(au.result.copy2.error) + '</div>' : '') : '<div class="mut">Chưa chọn.</div>') +
    '<div class="row" style="margin-top:6px;gap:8px"><button class="btn sm" data-act="setBackup2">Chọn thư mục…</button>' + (au.dir2 ? '<button class="btn ghost sm" data-act="setBackup2Off">Tắt</button>' : '') + '</div>' +
    ((ksl.targets && ksl.targets.length) ? ('<div style="margin-top:8px"><small class="mut">Gợi ý kết nối nhanh thư mục Cloud / Ổ đĩa ngoài:</small><div class="row" style="gap:6px;margin-top:4px">' + ksl.targets.map(t => '<button type="button" class="btn ghost sm" data-act="setBk2Quick" data-path="' + esc(t.path) + '" title="Gán ' + esc(t.path) + ' làm thư mục sao lưu thứ hai">' + (t.type === 'cloud' ? '☁️ ' : '💾 ') + esc(t.name) + '</button>').join('') + '</div></div>') : '') +
    '</div></div>';
  const jsonDir = st.backupDirJson || st.backupDir || '';
  const jsonCard = '<div class="card" style="margin:10px 0" id="jsonBk"><h3 style="margin:0 0 4px">Thư mục sao lưu JSON</h3><p class="mut" style="margin:0 0 8px">Nơi lưu file .json khi bấm Sao lưu toàn bộ dữ liệu và thư mục gợi ý khi sao lưu lô rừng.</p>' +
    '<div style="word-break:break-all"><b>Đang dùng:</b> <code data-set-json-path>' + esc(jsonDir) + '</code> <span class="pill ' + (st.customBackupJson ? 'ok' : '') + '">' + (st.customBackupJson ? 'thư mục riêng' : 'mặc định') + '</span></div>' +
    '<div class="row" style="margin-top:8px;gap:8px;flex-wrap:wrap"><button class="btn" data-act="setBackupJson">Chọn thư mục…</button>' + (st.customBackupJson ? '<button class="btn ghost" data-act="setBackupJsonDefault">Về mặc định</button>' : '') + '<button class="btn ghost" data-act="setOpenBackupJson">Mở thư mục sao lưu JSON</button></div></div>';
  const remindCard = '<div class="card" style="margin:10px 0" id="remindBk"><h3 style="margin:0 0 4px">Nhắc sao lưu</h3><p class="mut" style="margin:0 0 8px">Khi mở phần mềm, nhắc sao lưu toàn bộ dữ liệu nếu đã quá số ngày dưới đây kể từ lần sao lưu cuối.</p>' +
    '<div class="row" style="gap:8px;flex-wrap:wrap;align-items:center"><label>Nhắc sau <select id="setRemind">' + [[0, 'Không nhắc'], [3, '3 ngày'], [7, '7 ngày'], [14, '14 ngày'], [30, '30 ngày']].map(o => '<option value="' + o[0] + '"' + (o[0] === rm.remindDays ? ' selected' : '') + '>' + o[1] + '</option>').join('') + '</select></label>' +
    '<span class="mut">Sao lưu toàn bộ lần cuối: ' + (rm.lastBackup ? esc(new Date(rm.lastBackup).toLocaleString('vi-VN')) : 'chưa có') + '</span></div></div>';
  box.className = '';
  box.innerHTML = dungLuongHtml(st) + '<div class="card" style="margin:10px 0" id="kslTinhTrang"><h3 style="margin:0 0 6px">Tình trạng</h3>' +
    '<div>Tự sao lưu hằng ngày: ' + tuDong + (d.chuaVaoBanTuDong ? ' · <span class="pill warn" id="kslChuaVao">có thay đổi chưa vào bản hôm nay</span> <span class="mut">(tự làm mới khi đóng phần mềm, hoặc bấm “Tự sao lưu ngay”)</span>' : '') + '</div>' +
    '<div style="margin-top:4px">Sao lưu toàn bộ (.json + .sqlite, nên lưu ra ổ khác): ' + toanBo + '</div>' +
    '<div class="mut" style="margin-top:4px;word-break:break-all">Thư mục: ' + d.dirs.map(x => '<code>' + esc(x) + '</code>').join(' · ') + '</div>' +
    (d.loi && d.loi.length ? '<div class="msg warn" style="margin-top:6px">Không đọc được: ' + d.loi.map(x => esc(x.dir) + ' (' + esc(x.error) + ')').join('; ') + '</div>' : '') +
    '<div class="row" style="margin-top:10px;gap:8px;flex-wrap:wrap"><button class="btn" data-act="backup" id="kslToanBo">Sao lưu toàn bộ ngay</button><button class="btn ghost" data-act="kslAuto" id="kslAutoBtn"' + (au.keep ? '' : ' disabled') + '>Tự sao lưu ngay</button>' +
    '<button class="btn ghost" data-act="setOpenBackup">Mở thư mục sao lưu</button><button class="btn ghost" data-act="kslTai">Tải lại danh sách</button></div></div>' +
    remindCard;
  const boxB = document.getElementById('kslBoxB'), boxC = document.getElementById('kslBoxC');
  if (boxB) { boxB.className = ''; boxB.innerHTML = sqlCard + jsonCard; }
  if (boxC) { boxC.className = ''; boxC.innerHTML =
    '<div class="card" style="margin:10px 0"><div class="row" style="justify-content:space-between;flex-wrap:wrap;gap:8px"><h3 style="margin:0">Các bản sao lưu trên máy</h3>' +
    '<span class="mut" id="kslTong">' + d.tong.soBan + ' bản · ' + kslMB(d.tong.bytes) + '</span></div>' +
    (d.items.length ? '<div class="row" style="margin:8px 0;gap:8px;align-items:center"><label style="flex-direction:row;gap:6px;align-items:center">Loại <select id="kslLoc"><option value="">Tất cả (' + d.items.length + ')</option>' + loai.map(([m, t]) => '<option value="' + esc(m) + '"' +
    (ksl.loc === m ? ' selected' : '') + '>' + esc(t) + ' (' + d.items.filter(x => x.loai === m).length + ')</option>').join('') + '</select></label></div>' +
      '<div class="wrap" style="max-height:460px;overflow:auto"><table id="kslBang"><tr><th>Thời điểm</th><th>Loại</th><th>Tên file</th><th style="text-align:right">Dung lượng</th><th>Kiểm tra</th><th></th></tr>' +
      items.map((x, i) => { const k = ksl.kiem[x.file];
        return '<tr data-ksl-loai="' + esc(x.loai) + '"><td style="white-space:nowrap">' + esc(fmtDT(x.mtime)) + '</td><td><span class="pill">' + esc(x.tenLoai) + '</span></td><td style="overflow-wrap:anywhere;min-width:180px"><code>' + esc(x.name) + '</code>' + (d.dirs.length > 1 ? '<br><small class="mut">' +
        esc(x.dir) + '</small>' : '') + '</td><td style="text-align:right;white-space:nowrap">' + kslMB(x.size) + '</td>' +
          '<td data-ksl-kiem>' + (!k ? '<span class="mut">chưa kiểm</span>' : k.ok ? '<span class="pill ok">dùng được</span><br><small class="mut">' + (k.counts.owners || 0) + ' chủ rừng, ' + (k.counts.forests || 0) + ' lô' + (k.version ? ' · cấu trúc v' + k.version : '') + '</small>' :
          '<span class="pill err">không dùng được</span><br><small>' + esc(k.error) + '</small>') + '</td>' +
          '<td style="white-space:nowrap"><button class="btn ghost sm" data-act="kslChiTiet" data-i="' + i + '" title="Xem danh sách chủ rừng &amp; trích xuất khôi phục từng phần">🔍 Chi tiết</button> <button class="btn ghost sm" data-act="kslKiem" data-i="' + i + '">Kiểm tra</button> <button class="btn ghost sm" data-act="kslKhoiPhuc" data-i="' + i + '">Khôi phục…</button> <button class="btn danger sm" data-act="kslXoa" data-i="' + i + '">Xóa</button></td></tr>';
          }).join('') + '</table></div>' +
      '<p class="mut" style="margin:8px 0 0">Khôi phục từ bản .sqlite thay <b>toàn bộ</b> hồ sơ trên máy bằng bản đó (có xem trước; dữ liệu hiện tại được sao lưu trước khi ghi nên hoàn tác được bằng chính màn này). Bản .json mở màn xem trước cho phép chọn giữ / ghi đè / giữ cả hai. Bản “Trước khi…” do phần mềm tự tạo trước mỗi thao tác lớn; loại “Trước khi khôi phục”, “Trước khi khôi phục lô”, “Trước khi xóa” tự giữ 20 bản gần nhất.</p>'
      : '<p class="mut" id="kslTrong">Chưa có bản sao lưu nào trong thư mục sao lưu.</p>') + '</div>'; }
  ksl.hien = items;
  const sel = document.getElementById('kslLoc'); if (sel) sel.addEventListener('change', () => { ksl.loc = sel.value; kslPaint(); });
  const ckEl = document.getElementById('setAutoChuKy');
  if (ckEl) ckEl.addEventListener('change', async () => { const prev = ck, r = await HB.settings.setAutoChuKy(ckEl.value); if (r && r.ok) { setg.s = ksl.st = r.settings; setg.msg = ksl.msg = [ckEl.value === 'tat' ? 'Đã tắt tự sao lưu.' : 'Đã lưu chu kỳ tự sao lưu.', 'ok']; render(); } else { ckEl.value = prev; setg.msg = ksl.msg = ['Không lưu được chu kỳ tự sao lưu: ' + ((r && r.error) || 'lỗi không rõ'), 'err']; render(); } });
  const ak = document.getElementById('setAutoKeep');
  if (ak) ak.addEventListener('change', async () => { const prev = String(au.keep ?? 7), r = await HB.settings.setAutoKeep(ak.value); if (r && r.ok) { setg.s = ksl.st = r.settings; setg.msg = ksl.msg = [+ak.value ? 'Đã lưu: giữ ' + ak.value + ' bản tự sao lưu hằng ngày gần nhất.' : 'Đã tắt tự sao lưu hằng ngày.', 'ok']; render(); } else { ak.value = prev; setg.msg = ksl.msg = ['Không lưu được cài đặt tự sao lưu: ' + ((r && r.error) || 'lỗi không rõ'), 'err']; render(); } });
  const rmEl = document.getElementById('setRemind');
  if (rmEl) rmEl.addEventListener('change', async () => { const prev = String(rm.remindDays ?? 7), r = await HB.settings.setRemind(rmEl.value); if (r && r.ok) { setg.s = ksl.st = r.settings; setg.msg = ksl.msg = ['Đã lưu mức nhắc sao lưu.', 'ok']; render(); } else { rmEl.value = prev; setg.msg = ksl.msg = ['Không lưu được mức nhắc sao lưu: ' + ((r && r.error) || 'lỗi không rõ'), 'err']; render(); } });
}
async function backupSaveAs(fromSaveHelp) {
  if (!HB || !HB.backupSaveAs || ksl.busy || !backupConfirmSaved()) return;
  ksl.busy = true;
  try {
    const r = await HB.backupSaveAs();
    if (!r || r.canceled) return;
    ksl.msg = r.ok ? ['Đã lưu bản sao lưu toàn bộ ra tệp: ' + r.file, 'ok'] : ['Không lưu được bản sao lưu: ' + (r.error || 'lỗi không rõ'), 'err'];
    if (fromSaveHelp) pushNote(...ksl.msg);
    render();
  } finally { ksl.busy = false; }
}
async function kslRestorePick() {
  if (!HB || !HB.restorePick || ksl.busy) return;
  const r = await HB.restorePick();
  if (!r || r.canceled) return;
  if (!r.ok) { ksl.msg = setg.msg = ['Không khôi phục được: ' + r.error, 'err']; return render(); }
  if (r.dinhDang === 'json') return restoreAll({text: async () => r.text});
  ksl.loc = '';
  await kslLoad();
  const idx = (ksl.hien || []).findIndex(x => x.name === r.name || x.file === r.file);
  if (idx >= 0) return kslKhoiPhuc({dataset: {i: String(idx)}});
}
async function kslLoad() {
  if (!HB || !HB.saoLuu) return;
  const [r, s, tg] = await Promise.all([
    HB.saoLuu.list(),
    HB.settings.get(),
    (HB.settings && HB.settings.detectTargets) ? HB.settings.detectTargets() : Promise.resolve({targets: []})
  ]);
  if (!r.ok) { const b = document.getElementById('kslBox'); if (b) b.innerHTML = '<div class="msg err">Không đọc được thư mục sao lưu: ' + esc(r.error) + '</div>'; return; }
  ksl.d = r; ksl.st = s.ok ? s.settings : null; ksl.targets = (tg && tg.ok ? tg.targets : []) || [];
  kslPaint(); bkChipFill(ksl.st);
}
const kslItem = el => (ksl.hien || [])[+el.dataset.i] || null;
async function kslKiem(el) {
  const x = kslItem(el); if (!x) return;
  const r = await HB.saoLuu.verify(x.file);
  ksl.kiem[x.file] = r.ok ? r.kiem : {ok: false, counts: {}, error: r.error}; kslPaint();
}
async function kslAuto() {
  if (ksl.busy) return; ksl.busy = true;
  try { const r = await HB.saoLuu.autoNow(); ksl.msg = r.ok ? [r.auto && r.auto.skipped ? (r.auto.reason === 'empty' ? 'Chưa có hồ sơ nên chưa sao lưu.' : 'Bản tự sao lưu của hôm nay đã chứa dữ liệu mới nhất.') : 'Đã tự sao lưu và kiểm tra: ' + ((r.auto && r.auto.file) || ''),
  'ok'] : ['Tự sao lưu không được: ' + (r.error || 'lỗi không rõ'), 'err']; }
  finally { ksl.busy = false; }
  render();
}
async function kslXoa(el) {
  const x = kslItem(el); if (!x) return;
  const warnNangCap = x.loai === 'nangcap' ? '\n\nCẢNH BÁO: Đây là bản sao lưu TRƯỚC KHI NÂNG CẤP cấu trúc dữ liệu — đường lui duy nhất nếu cần đối chiếu dữ liệu trước nâng cấp.' : '';
  if (!confirm('Xóa bản sao lưu này khỏi ổ đĩa?\n\n' + x.name + ' (' + x.tenLoai + ', ' + fmtDT(x.mtime) + ', ' + kslMB(x.size) + ')' + warnNangCap + '\n\nKhông hoàn tác được.')) return;
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
  $('#impBody').innerHTML = '<h2>Khôi phục từ bản sao lưu</h2><table><tr><th>Bản sao lưu</th><td><code>' + esc(x.name) + '</code></td></tr><tr><th>Loại</th><td>' + esc(x.tenLoai) + '</td></tr><tr><th>Thời điểm</th><td>' + esc(fmtDT(x.mtime)) + ' · ' + kslMB(x.size) + ' · cấu trúc v' +
  p.xem.version + '</td></tr></table>' +
    '<table id="kslXem"><tr><th></th><th style="text-align:right">Đang có trên máy</th><th style="text-align:right">Trong bản sao lưu</th></tr>' + row('Chủ rừng', E.owners, I.owners) + row('Lô rừng', E.forests, I.forests) + row('Nhân công', E.nc, I.nc) + row('Xe', E.dx, I.dx) + row('Phiếu cân',
    E.pc, I.pc) + row('Công ty mua hàng', E.companies, I.companies) + '</table>' +
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
  dbThayToanBo(r.db); NAV.cur = null; NAV.curF = null;
  ksl.msg = ['Đã khôi phục từ ' + r.name + ': ' + r.counts.owners + ' chủ rừng, ' + r.counts.forests + ' lô, ' + r.counts.nc + ' nhân công, ' + r.counts.dx + ' xe, ' + r.counts.pc + ' phiếu cân' + (r.goiCu ? '; chép thêm ' + r.goiCu + ' bản chụp của các lần chốt trước' : '') +
  '. Dữ liệu trước khi khôi phục: ' + r.backup,
  'ok'];
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
async function kslChiTiet(el) {
  const x = kslItem(el); if (!x || ksl.busy) return;
  ksl.busy = true; let r;
  try { r = await HB.saoLuu.inspectDetail(x.file); }
  finally { ksl.busy = false; }
  if (!r || !r.ok || !r.detail) return note('Không đọc được chi tiết: ' + ((r && r.error) || 'lỗi không rõ'), 'err');
  const d = r.detail;
  window.__kslDetail = {file: x.file, name: x.name, detail: d};
  let html = '<h2>🔍 Khám phá &amp; Trích xuất bản sao lưu</h2>' +
    '<p>Tệp: <code>' + esc(x.name) + '</code> (' + esc(x.tenLoai) + ', ' + esc(fmtDT(x.mtime)) + ') · <b>' + d.soChuRong + ' chủ rừng</b>, <b>' + d.soLoRung + ' lô rừng</b></p>' +
    '<div class="msg" style="background:var(--accSoft);border:1px solid var(--acc);color:var(--ink);margin-bottom:12px">' +
      '<b>Trích xuất từng phần an toàn:</b> Bạn có thể chọn khôi phục <b>riêng 1 chủ rừng</b> hoặc <b>riêng 1 lô rừng</b> từ bản sao lưu này vào máy tính mà <b>không ảnh hưởng</b> đến các chủ rừng/lô khác đang làm việc.' +
    '</div>' +
    '<div class="wrap" style="max-height:55vh;overflow:auto;margin-bottom:14px">';
  
  if (!d.owners.length) {
    html += '<p class="mut" style="text-align:center">Bản sao lưu này không có hồ sơ chủ rừng nào.</p>';
  } else {
    d.owners.forEach(o => {
      html += '<div class="card" style="margin-bottom:10px;border-left:4px solid var(--acc)">' +
        '<div class="row" style="justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">' +
          '<div>' +
            '<b style="font-size:15px">' + esc(o.ten || '(chưa đặt tên)') + '</b> ' + (o.danhXung ? '<span class="mut">(' + esc(o.danhXung) + ')</span>' : '') +
            '<div class="mut" style="font-size:12px;margin-top:2px">Mã: <code>' + esc(o.ma || '—') + '</code> · CCCD: ' + esc(o.cccd || '—') + ' · ' + o.soRung + ' lô rừng</div>' +
          '</div>' +
          '<div class="row" style="gap:6px">' +
            '<button type="button" class="btn sm" data-act="kslRestoreOwner" data-oid="' + esc(o.id) + '" data-name="' + esc(o.ten || o.id) + '">📥 Khôi phục riêng chủ này</button>' +
          '</div>' +
        '</div>';
      if (o.forests && o.forests.length) {
        html += '<table style="margin-top:8px;font-size:12.5px;width:100%">' +
          '<thead><tr><th>Mã lô</th><th>Tên rừng</th><th style="text-align:right">Diện tích</th><th style="text-align:center">Số phiếu</th><th style="text-align:right">Sản lượng</th><th>Trạng thái</th><th style="text-align:right">Thao tác</th></tr></thead>' +
          '<tbody>' +
          o.forests.map(f => {
            return '<tr>' +
              '<td><code>' + esc(f.maRung || f.id) + '</code></td>' +
              '<td>' + esc(f.tenRung || 'Rừng') + '</td>' +
              '<td style="text-align:right">' + (f.dienTich ? f.dienTich + ' ha' : '—') + '</td>' +
              '<td style="text-align:center">' + f.soPhieu + '</td>' +
              '<td style="text-align:right">' + (f.tongKg ? (f.tongKg / 1000).toFixed(2).replace('.', ',') + ' tấn' : '—') + '</td>' +
              '<td><span class="pill ' + (f.trangThai === 'Đã chốt' ? 'ok' : '') + '">' + esc(f.trangThai) + '</span></td>' +
              '<td style="text-align:right"><button type="button" class="btn ghost sm" data-act="kslRestoreForest" data-oid="' + esc(o.id) + '" data-fid="' + esc(f.id) + '" data-ma="' + esc(f.maRung || f.id) + '">📥 Lấy riêng lô này</button></td>' +
            '</tr>';
          }).join('') +
          '</tbody></table>';
      }
      html += '</div>';
    });
  }
  html += '</div>' +
    '<div class="row" style="justify-content:space-between;flex-wrap:wrap;gap:8px">' +
      '<button type="button" class="btn ghost" data-act="dlgDong">Đóng</button>' +
      '<button type="button" class="btn ghost" data-act="kslKhoiPhucTuDetail">Khôi phục toàn bộ bằng bản này…</button>' +
    '</div>';
  
  $('#impBody').innerHTML = html;
  $('#impBox').classList.add('on');
}

async function kslDoRestoreOwner(oid, name) {
  const d = window.__kslDetail; if (!d || ksl.busy) return;
  if (!confirm('Khôi phục riêng chủ rừng "' + (name || oid) + '" (kèm các lô của chủ này)?\n\nCác chủ rừng và lô khác đang có trên máy sẽ được BẢO TOÀN NGUYÊN VẸN 100%.\nPhần mềm sẽ tự động sao lưu trước khi ghi.')) return;
  ksl.busy = true;
  try {
    const r = await HB.saoLuu.restoreOwner(d.file, oid, 'overwrite');
    if (!r || !r.ok) return note('Không khôi phục được chủ rừng: ' + (r?.error || 'lỗi không rõ'), 'err');
    dbThayToanBo(r.db);
    note('Đã khôi phục thành công chủ rừng "' + (name || oid) + '" vào máy. Bản sao lưu trước khi ghi: ' + r.backup, 'ok');
    $('#impBox').classList.remove('on');
    render();
  } catch (e) {
    note('Lỗi: ' + e.message, 'err');
  } finally {
    ksl.busy = false;
  }
}

async function kslDoRestoreForest(oid, fid, maRung) {
  const d = window.__kslDetail; if (!d || ksl.busy) return;
  if (!confirm('Khôi phục riêng lô rừng "' + (maRung || fid) + '" vào máy?\n\nCác lô khác và chủ rừng khác đang có trên máy sẽ được BẢO TOÀN NGUYÊN VẸN 100%.\nPhần mềm sẽ tự động sao lưu trước khi ghi.')) return;
  ksl.busy = true;
  try {
    const r = await HB.saoLuu.restoreForest(d.file, oid, fid, 'overwrite');
    if (!r || !r.ok) return note('Không khôi phục được lô rừng: ' + (r?.error || 'lỗi không rõ'), 'err');
    dbThayToanBo(r.db);
    note('Đã khôi phục thành công lô rừng "' + (maRung || fid) + '" vào máy. Bản sao lưu trước khi ghi: ' + r.backup, 'ok');
    $('#impBox').classList.remove('on');
    render();
  } catch (e) {
    note('Lỗi: ' + e.message, 'err');
  } finally {
    ksl.busy = false;
  }
}

async function quickBackup() {
  if (!HB || !HB.backupTo || ksl.busy) return;
  if (saveTimer) {
    clearTimeout(saveTimer);
    saveTimer = null;
    await storeSave();
  }
  if (!backupConfirmSaved()) return;
  showSave('… Đang sao lưu toàn bộ');
  ksl.busy = true;
  try {
    const r = await HB.backupTo();
    if (!r) return;
    if (r.ok) {
      const msg = 'Đã sao lưu toàn bộ dữ liệu lúc ' + hhmm() + (r.copy2 && r.copy2.ok && !r.copy2.skipped ? ' (kèm bản sao dự phòng sang ' + (r.copy2.dir || 'ổ thứ hai') + ')' : '') + '.';
      pushNote(msg, 'ok');
      showSave('Đã sao lưu lúc ' + hhmm(), false);
      if (typeof bkChipFill === 'function') bkChipFill();
      window.__hakWorkDone = 0;
      updateBkPulse(false);
    } else {
      pushNote('Không sao lưu được: ' + (r.error || r.message || 'lỗi không rõ'), 'err');
      showSave('Lỗi sao lưu', true);
    }
  } catch (e) {
    pushNote('Lỗi sao lưu: ' + e.message, 'err');
  } finally {
    ksl.busy = false;
    render();
  }
}

function updateBkPulse(active) {
  const btn = document.getElementById('quickBackupBtn');
  if (btn) btn.classList.toggle('pulse-bk', !!active);
}

function notifyWorkDone(amount = 1) {
  window.__hakWorkDone = (window.__hakWorkDone || 0) + amount;
  if (window.__hakWorkDone >= 15) {
    updateBkPulse(true);
  }
}

async function setBk2Quick(targetPath) {
  if (!HB || !HB.settings || !HB.settings.setBackup2Dir) return;
  try {
    const r = await HB.settings.setBackup2Dir(targetPath);
    if (r && r.ok) {
      note('Đã gán thư mục sao lưu thứ hai: ' + targetPath + '. Bản sao lưu sẽ tự động được chép thêm vào đây.', 'ok');
      kslLoad();
    } else {
      note('Không gán được thư mục: ' + ((r && r.error) || 'lỗi không rõ'), 'err');
    }
  } catch (e) {
    note('Lỗi: ' + e.message, 'err');
  }
}

if (HB) { document.addEventListener('DOMContentLoaded', () => { setTimeout(bkChipFill, 1500); setInterval(bkChipFill, 600000); }); }
/* Ctrl+S: lưu lô; Ctrl+B: sao lưu toàn bộ */
document.addEventListener('keydown', e => {
  if (!(e.ctrlKey || e.metaKey) || e.altKey) return;
  if (e.key === 'b' || e.key === 'B') {
    e.preventDefault();
    quickBackup();
    return;
  }
  if (e.key !== 's' && e.key !== 'S') return;
  e.preventDefault();
  if (document.querySelector('#impBox.on, #stBox.on, #lkBox.on, #rpBox.on, #dlgBox.on, #guideBox.on, #tkBox, #thBox')) return;
  if (document.activeElement && typeof document.activeElement.blur === 'function' && /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName)) document.activeElement.blur();   // ô đang gõ: ghi nhận giá trị (sự kiện change) trước khi lưu
  setTimeout(async () => {
    if (document.querySelector('.formMsg')) return;   // ô vừa nhập chưa hợp lệ (khung đang báo lỗi): không báo “không có thay đổi”
    if (typeof window.__stDirty !== 'function' || !window.__stDirty().length) return showSave(curForest() ? 'Không có thay đổi chưa lưu (Ctrl+S)' : saveSt.text, false);
    const r = await window.__stSaveCurrent();
    if (r && r.ok === false && r.error) note('Chưa lưu được: ' + r.error, 'err');
  }, 0);
});
/* PR C: đổi tab con của Sao lưu và khôi phục (không vẽ lại: chỉ hiện / ẩn khung, nhớ tab trong phiên) */
document.addEventListener('click', e => {
  const b = e.target && e.target.closest && e.target.closest('[data-sbtab]'); if (!b) return;
  ksl.tab = b.dataset.sbtab;
  document.querySelectorAll('[data-sbpane]').forEach(x => { x.hidden = x.dataset.sbpane !== ksl.tab; });
  document.querySelectorAll('[data-sbtab]').forEach(x => { if (x.dataset.sbtab === ksl.tab) x.setAttribute('aria-current', 'page'); else x.removeAttribute('aria-current'); });
});
