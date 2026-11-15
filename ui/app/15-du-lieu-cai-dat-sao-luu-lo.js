/* ===== Vị trí dữ liệu đã cấu hình không truy cập được (ổ rút ra, thư mục/file bị chuyển, không có quyền…) ===== */
const issueUi = {msg: null, busy: false};
function renderIssue() {
  const it = dataIssueUi || {}, why = {DIR_MISSING: 'Thư mục dữ liệu không còn', FILE_MISSING: 'Không thấy file cơ sở dữ liệu', NO_PERMISSION: 'Không có quyền truy cập', OPEN_FAILED: 'Không mở được cơ sở dữ liệu', IO: 'Lỗi đọc/ghi ổ đĩa'}[it.code] || 'Không truy cập được cơ sở dữ liệu';
  document.getElementById('side') && (document.getElementById('side').style.display = 'none');
  $('#main').innerHTML = '<div class="card" id="dataIssue"><h2 style="margin-top:0">' + esc(why) + '</h2>' +
    '<p>Phần mềm <b>chưa mở</b> dữ liệu của bạn để không ghi nhầm vào một bản mặc định cũ hoặc trống.</p>' +
    '<div class="msg err" style="word-break:break-all"><b>Đường dẫn:</b> <code id="issuePath">' + esc(it.path || '') + '</code><br><b>Nguyên nhân:</b> <span id="issueReason">' + esc(it.reason || '') + '</span></div>' +
    '<p class="mut">Nếu dữ liệu nằm trên ổ ngoài hoặc ổ mạng, hãy cắm lại ổ rồi bấm <b>Thử lại</b>. Cấu hình đường dẫn cũ được giữ nguyên cho đến khi bạn chọn đổi.</p>' +
    (issueUi.msg ? '<div class="msg ' + issueUi.msg[1] + '" id="issueMsg">' + esc(issueUi.msg[0]) + '</div>' : '') +
    '<div class="row" style="gap:8px;flex-wrap:wrap"><button class="btn" data-act="dataRetry" id="dataRetryBtn">Thử lại</button>' +
    '<button class="btn ghost" data-act="dataPick" id="dataPickBtn">Chọn cơ sở dữ liệu khác…</button>' +
    '<button class="btn ghost" data-act="dataDefault" id="dataDefaultBtn">Dùng vị trí mặc định…</button></div></div>';
  const cx = document.getElementById('ctxBar'); if (cx) cx.style.display = 'none';
}
async function issueAct(kind) {
  if (issueUi.busy) return; issueUi.busy = true;
  try {
    const r = await (kind === 'retry' ? HB.data.retry() : kind === 'pick' ? HB.data.pickOther() : HB.data.useDefault());
    if (r.canceled) return;
    if (r.ok) { issueUi.msg = ['Đã mở được cơ sở dữ liệu, đang tải lại…', 'ok']; return; }
    if (r.issue) dataIssueUi = r.issue;
    issueUi.msg = [r.error || 'Vẫn chưa mở được: ' + ((r.issue && r.issue.reason) || ''), 'err'];
  } catch (e) { issueUi.msg = ['Lỗi: ' + e.message, 'err']; }
  finally { issueUi.busy = false; renderIssue(); }
}

/* ===== Cài đặt hệ thống: thư mục dữ liệu và thư mục sao lưu (bản cài trên máy; xử lý ở src/main.js, src/settings.js) ===== */
/* Cài đặt: Hệ thống (thư mục dữ liệu, sao lưu) · Google Sheets (địa chỉ bảng tính) · Công ty (công ty mua hàng) · Hiển thị số */
const SET_TABS = [['settings', 'Hệ thống', 'openSettings'], ['setgs', 'Google Sheets', 'openSetGs'], ['cty', 'Công ty', 'openCty'], ['setfmt', 'Hiển thị số', 'openSetFmt']];
function settingsFrame(active, inner) {
  return '<h2>Cài đặt</h2><div class="tabs">' + SET_TABS.map(([v, l, a]) => '<button class="' + (active === v ? 'on' : '') + '" data-act="' + a + '" id="setTab_' + v + '">' + l + '</button>').join('') + '</div>' + inner;
}
const setgs = {st: null, msg: null};
function panelSetGs() {
  if (!HB) return '<div class="card"><div class="msg warn">Địa chỉ Google Sheets chỉ có ở bản cài trên Windows.</div></div>';
  const st = setgs.st || {};
  return '<div class="card"><h3 style="margin-top:0">Địa chỉ bảng tính Google Sheets</h3>' +
    '<p class="mut" style="margin-top:0">Bảng tính (chỉ đọc) dùng cho màn <b>Tra cứu Google Sheets</b>: tab HoSoKeo (phiếu cân), HoSoRung, ToaDoRung. Bảng tính để chế độ “Ai có liên kết đều xem được”; nếu bị giới hạn quyền, đăng nhập Google ở màn Tra cứu.</p>' +
    (setgs.msg ? '<div class="msg ' + setgs.msg.kind + '" id="setGsMsg">' + esc(setgs.msg.text) + '</div>' : '') +
    '<div class="row"><input id="setGsLink" style="flex:1" value="' + esc(st.sheetUrl || '') + '" placeholder="https://docs.google.com/spreadsheets/d/…"><button class="btn" data-act="setGsSave">Lưu địa chỉ</button></div>' +
    '<p class="mut" style="margin-bottom:0">Việc đồng bộ dữ liệu làm ở màn Tra cứu Google Sheets.</p></div>';
}
function panelSetFmt() {
  const row = (v, label, ex) => '<label style="flex-direction:row;gap:8px;align-items:center;color:var(--ink)"><input type="radio" name="numStyle" value="' + v + '"' + ((db.dinhDangSo === 'en' ? 'en' : 'vi') === v ? ' checked' : '') + ' data-act="setNumStyle"> <span><b>' + label + '</b> · ví dụ ' + ex + '</span></label>';
  const sample = n => { const t = n.toLocaleString('vi-VN', {maximumFractionDigits: 3}); return t; };
  return '<div class="card"><h3 style="margin-top:0">Hiển thị số</h3>' +
    '<p class="mut" style="margin-top:0">Chọn cách hiển thị số trên màn hình (tiền, khối lượng, diện tích). Ngày luôn là <b>dd/mm/yyyy</b> (ví dụ 05/10/2026) cho nhập liệu, kiểm tra và biểu mẫu. Biểu mẫu Word và file in luôn dùng kiểu Việt Nam.</p>' +
    row('vi', 'Kiểu Việt Nam', sample(1234567.5)) + row('en', 'Kiểu quốc tế', sample(1234567.5).replace(/[.,]/g, c => (c === '.' ? ',' : '.'))) + '</div>';
}
const setg = {s: null, msg: null};
function panelSettings() {
  if (!HB) return '<div class="card"><h2>Cài đặt hệ thống</h2><div class="msg warn">Cài đặt thư mục dữ liệu và sao lưu chỉ có ở bản cài trên Windows.</div></div>';
  return '<div class="card"><h2 style="margin-top:0">Cài đặt hệ thống</h2>' + (setg.msg ? '<div class="msg ' + setg.msg[1] + '" id="setMsg">' + esc(setg.msg[0]) + '</div>' : '') +
    '<div id="setBox" class="mut">Đang đọc cài đặt…</div></div>';
}
function settingsPaint() {
  const s = setg.s, box = document.getElementById('setBox'); if (!s || !box) return;
  const row = (title, desc, path, custom, def, act, actDef, extra) => '<div class="card" style="margin:10px 0"><h3 style="margin:0 0 4px">' + title + '</h3><p class="mut" style="margin:0 0 8px">' + desc + '</p>' +
    '<div style="word-break:break-all"><b>Đang dùng:</b> <code data-set-path>' + esc(path) + '</code> <span class="pill ' + (custom ? 'ok' : '') + '">' + (custom ? 'thư mục riêng' : 'mặc định') + '</span></div>' +
    '<div class="row" style="margin-top:8px;gap:8px;flex-wrap:wrap"><button class="btn" data-act="' + act + '"' + (s.lockedByEnv && act === 'setData' ? ' disabled' : '') + '>Chọn thư mục…</button>' +
    (custom ? '<button class="btn ghost" data-act="' + actDef + '">Về mặc định</button>' : '') + (extra || '') + '</div>' +
    '<div class="mut" style="margin-top:6px;font-size:12px">Mặc định: ' + esc(def) + '</div></div>';
  const di = s.dbInfo || {}, nowCard = '<div class="card" style="margin:10px 0" id="dbNow"><h3 style="margin:0 0 4px">Cơ sở dữ liệu đang dùng</h3><div style="word-break:break-all"><code data-db-now>' + esc(s.dbFile) + '</code></div><div class="mut" style="margin-top:4px">' + (di.size != null ? 'Dung lượng ' + (di.size / 1048576 >= 1 ? (di.size / 1048576).toFixed(1) + ' MB' : Math.ceil(di.size / 1024) + ' KB') : '') + (di.mtime ? ' · sửa lần cuối ' + esc(new Date(di.mtime).toLocaleString('vi-VN')) : '') + (di.version ? ' · cấu trúc v' + di.version : '') + '</div></div>';
  box.className = ''; box.innerHTML = nowCard +
    (s.missing.length ? '<div class="msg warn">Thư mục đã chọn trước đây không còn: ' + s.missing.map(esc).join('; ') + '. Ứng dụng đang dùng vị trí mặc định.</div>' : '') +
    (s.lockedByEnv ? '<div class="msg warn">Vị trí dữ liệu đang được cố định bởi biến môi trường HAKQN_DB nên không đổi được ở đây.</div>' : '') +
    row('Thư mục dữ liệu', 'Nơi lưu cơ sở dữ liệu hồ sơ (hakqn.sqlite). Khi đổi, ứng dụng <b>sao chép</b> dữ liệu sang thư mục mới và dùng từ đó; bản cũ được giữ nguyên, không xóa. Nên chọn thư mục trên ổ cứng của máy này (không chọn ổ mạng hoặc thư mục đang đồng bộ đám mây, dễ làm hỏng file).', s.dbFile, s.customData, s.defaultDataDir, 'setData', 'setDataDefault', '<button class="btn ghost" data-act="setOpenData">Mở thư mục chứa dữ liệu</button>') +
    row('Thư mục sao lưu', 'Nơi lưu bản sao lưu tự động trước khi nâng cấp dữ liệu, bản tự sao lưu hằng ngày, bản sao lưu toàn bộ (⋯ Thêm → Sao lưu toàn bộ dữ liệu: lưu thẳng vào đây, không hỏi lại) và thư mục gợi ý khi sao lưu lô rừng. Nên chọn ổ khác hoặc ổ USB để phòng hỏng máy.', s.backupDir, s.customBackup, s.defaultBackupDir, 'setBackup', 'setBackupDefault', '<button class="btn ghost" data-act="setOpenBackup">Mở thư mục sao lưu</button>') +
    '<div class="card" style="margin:10px 0"><h3 style="margin:0 0 4px">Nhắc sao lưu</h3><p class="mut" style="margin:0 0 8px">Khi mở phần mềm, nhắc sao lưu toàn bộ dữ liệu nếu đã quá số ngày dưới đây kể từ lần sao lưu cuối (⋯ Thêm → Sao lưu toàn bộ dữ liệu).</p>' +
    '<div class="row" style="gap:8px;flex-wrap:wrap;align-items:center"><label>Nhắc sau <select id="setRemind">' + [[0, 'Không nhắc'], [3, '3 ngày'], [7, '7 ngày'], [14, '14 ngày'], [30, '30 ngày']].map(o => '<option value="' + o[0] + '"' + (o[0] === s.remind.remindDays ? ' selected' : '') + '>' + o[1] + '</option>').join('') + '</select></label>' +
    '<span class="mut">Sao lưu toàn bộ lần cuối: ' + (s.remind.lastBackup ? esc(new Date(s.remind.lastBackup).toLocaleString('vi-VN')) : 'chưa có') + '</span></div></div>' + autoBackupCard(s.auto);
  const ak = document.getElementById('setAutoKeep');
  if (ak) ak.addEventListener('change', async () => { const r = await HB.settings.setAutoKeep(ak.value); if (r.ok) { setg.s = r.settings; setg.msg = [+ak.value ? 'Đã lưu: giữ ' + ak.value + ' bản tự sao lưu hằng ngày gần nhất.' : 'Đã tắt tự sao lưu hằng ngày.', 'ok']; render(); } });
  const sel = document.getElementById('setRemind');
  if (sel) sel.addEventListener('change', async () => { const r = await HB.settings.setRemind(sel.value); if (r.ok) { setg.s = r.settings; setg.msg = ['Đã lưu mức nhắc sao lưu.', 'ok']; render(); } });
}
/* Tự sao lưu hằng ngày (src/autobackup.js): mỗi ngày một bản trong thư mục sao lưu, xoay vòng giữ N bản gần nhất */
function autoBackupCard(a) {
  if (!a) return '';
  const r = a.result, last = a.last, sz = b => b / 1048576 >= 1 ? (b / 1048576).toFixed(1) + ' MB' : Math.ceil(b / 1024) + ' KB';
  const st = !a.keep ? 'Đang tắt.' : r && !r.ok ? '<span class="warnTxt">Lần chạy gần nhất không được: ' + esc(r.error || '') + '</span>' : r && r.skipped && r.reason === 'empty' ? 'Chưa có hồ sơ nên chưa sao lưu.' : '';
  return '<div class="card" style="margin:10px 0" id="autoBk"><h3 style="margin:0 0 4px">Tự sao lưu hằng ngày</h3><p class="mut" style="margin:0 0 8px">Mỗi ngày, lần đầu mở phần mềm sẽ tự lưu một bản cơ sở dữ liệu (tu-dong-năm-tháng-ngày.sqlite) vào thư mục sao lưu ở trên và chỉ giữ số bản gần nhất chọn dưới đây. Bản này nằm cùng máy, không thay cho sao lưu toàn bộ ra ổ khác.</p>' +
    '<div class="row" style="gap:8px;flex-wrap:wrap;align-items:center"><label>Giữ <select id="setAutoKeep">' + [[0, 'Tắt'], [3, '3 bản'], [7, '7 bản'], [14, '14 bản'], [30, '30 bản']].map(o => '<option value="' + o[0] + '"' + (o[0] === a.keep ? ' selected' : '') + '>' + o[1] + '</option>').join('') + '</select></label>' +
    '<span class="mut" data-auto-last>' + (last ? 'Bản gần nhất: ' + esc(last.day.split('-').reverse().join('/')) + ' (' + sz(last.size) + ') · đang có ' + a.count + ' bản' : 'Chưa có bản tự sao lưu nào') + '</span>' + (st ? ' <span class="mut">' + st + '</span>' : '') + '</div></div>';
}
async function settingsLoad() {
  if (!HB) return;
  const r = await HB.settings.get();
  if (r.ok) { setg.s = r.settings; settingsPaint(); } else { const b = document.getElementById('setBox'); if (b) b.innerHTML = '<div class="msg err">Không đọc được cài đặt: ' + esc(r.error) + '</div>'; }
}
async function settingsData(reset) {
  setg.msg = ['Đang kiểm tra và sao chép dữ liệu… không đóng phần mềm lúc này (thao tác lưu trong lúc đó được giữ lại và chạy sau khi chuyển xong).', 'warn']; render();
  const r = await HB.settings.setData(reset);
  if (r.canceled) { setg.msg = null; return render(); }
  if (!r.ok) {
    setg.msg = ['Không đổi được thư mục dữ liệu: ' + r.error + (r.rolledBack === false ? '' : ' — Đã hoàn tác; vẫn dùng ' + ((r.settings && r.settings.dbFile) || 'vị trí cũ') + ', dữ liệu cũ và dữ liệu ở thư mục đích được giữ nguyên.'), 'err'];
    if (r.settings) setg.s = r.settings;
    return render();
  }
  if (r.same) { setg.msg = ['Đó đang là thư mục dữ liệu hiện tại.', 'warn']; return render(); }
  // chương trình chính tự tải lại cửa sổ từ cơ sở dữ liệu mới và hiện thông báo kết quả sau khi tải
}
async function settingsBackup(reset) {
  const r = await HB.settings.setBackup(reset);
  if (r.canceled) return;
  setg.msg = r.ok ? ['Đã ' + (reset ? 'về thư mục sao lưu mặc định' : 'đổi thư mục sao lưu') + ': ' + r.settings.backupDir, 'ok'] : ['Không đổi được thư mục sao lưu: ' + r.error, 'err'];
  setg.s = r.ok ? r.settings : setg.s; render();
}

/* ===== Sao lưu / khôi phục MỘT lô rừng (chạy trên máy, không cần mạng) ===== */
async function lotBackup() {
  const f = curForest(), o = curOwner(); if (!f || !o) return note('Hãy mở một lô rừng trước khi sao lưu.', 'err');
  if (!HB) return note('Sao lưu lô rừng cần bản cài trên Windows.', 'err');
  if (stDirtyCur() && !confirm('Lô này còn thay đổi chưa lưu. File sao lưu chỉ gồm dữ liệu ĐÃ LƯU (không gồm phần chưa lưu).\n\nTiếp tục sao lưu?')) return;
  let pkg; try { pkg = HAKLoRung.exportLot(db, o.id, f.id, {version: (dbInfo && dbInfo.version) || ''}); } catch (e) { return note('Không sao lưu được lô: ' + e.message, 'err'); }
  const r = await HB.lotSave(pkg);
  if (r.canceled) return;
  note(r.ok ? 'Đã sao lưu lô ' + pkg.maLo + ' (' + pkg.kiemTra.nc + ' nhân công, ' + pkg.kiemTra.dx + ' xe, ' + pkg.kiemTra.pc + ' phiếu cân) vào: ' + r.file : 'Không sao lưu được lô: ' + r.error, r.ok ? 'ok' : 'err');
}
const lotCnt = c => c ? c.nc + ' nhân công, ' + c.dx + ' xe, ' + c.pc + ' phiếu cân, ' + fmtTan(c.kl) + ' tấn' : '';
/* So sánh số liệu một lô: trước (đang có trên máy) và sau (trong file). Một cột khi lô chưa có trên máy. */
function lotFigTable(P) {
  const I = P.incoming, E = P.existing, row = (l, f) => '<tr><td>' + l + '</td>' + (E ? '<td>' + f(E) + '</td>' : '') + '<td>' + f(I) + '</td></tr>';
  const chg = (a, b) => E && a !== b ? ' <span class="pill warn">thay đổi</span>' : '';
  return '<div class="wrap"><table><tr><th></th>' + (E ? '<th>Trước: đang có trên máy</th><th>Sau: bản trong file</th>' : '<th>Trong file</th>') + '</tr>' +
    [['Nhân công', x => fmt(x.nc), 'nc'], ['Xe', x => fmt(x.dx), 'dx'], ['Phiếu cân', x => fmt(x.pc), 'pc'], ['Tổng khối lượng (tấn)', x => fmtTan(x.kl), 'kl'], ['Giấy tờ', x => fmt(x.giayTo), 'giayTo'], ['Cách tính cước', x => esc(x.cuoc), 'cuoc'], ['Địa chỉ giao hàng đã chốt', x => esc(x.diemDen || '(chưa có)'), 'diemDen']]
      .map(([l, f, k]) => '<tr><td>' + l + '</td>' + (E ? '<td>' + f(E) + '</td>' : '') + '<td>' + f(I) + (E && E[k] !== I[k] ? ' <span class="pill warn">thay đổi</span>' : '') + '</td></tr>').join('') + '</table></div>';
}
async function lotRestoreOpen(filePath) {
  if (!HB) return note('Khôi phục lô rừng cần bản cài trên Windows.', 'err');
  const r = await HB.lotOpen(filePath);
  if (r.canceled) return;
  if (!r.ok) return note('Không khôi phục được: ' + r.error + ' Dữ liệu trên máy chưa bị thay đổi.', 'err');
  const P = r.plan, pk = r.pkg, exists = P.lo.state === 'trung';
  window.__lot = pk;
  $('#impBody').innerHTML = '<h2>Khôi phục lô rừng</h2>' +
    '<table><tr><th>Chủ rừng</th><td><b>' + esc(P.chu.ten) + '</b> · mã ' + esc(P.chu.ma) + '</td></tr><tr><th>Mã lô</th><td><b>' + esc(P.maLo) + '</b> ' + esc(P.tenLo) + '</td></tr>' +
    '<tr><th>Thời điểm sao lưu</th><td>' + esc(fmtDT(P.xuatLuc)) + '</td></tr></table>' + lotFigTable(P) +
    (P.ok ? '<div class="msg ' + (exists ? 'warn' : 'ok') + '">' + (P.chu.state === 'co' ? 'Chủ rừng <b>đã có</b> trên máy: lô sẽ được ' + (exists ? 'xử lý theo lựa chọn bên dưới' : 'thêm vào đúng chủ này') + '.' : 'Chủ rừng <b>chưa có</b> trên máy: sẽ tạo chủ mới từ thông tin trong file rồi thêm lô.') +
      (exists ? ' Lô này <b>đã tồn tại</b> trên máy.' : ' Lô <b>chưa có</b> trên máy.') + '</div>' : '<div class="msg err"><b>Dừng: không xác định được lô đích, cần đối chiếu.</b> Chưa ghi gì.<br>' + P.conflicts.map(c => '• ' + esc(c.moTa)).join('<br>') + '</div>') +
    (P.giuTrongChu.length ? '<p class="mut">Các lô khác của chủ này trên máy giữ nguyên: ' + P.giuTrongChu.map(x => esc(x.ma)).join(', ') + '.</p>' : '') +
    (P.dungChung.khac.length || P.dungChung.them.length ? '<div class="msg warn"><b>Thiết lập dùng chung: máy đích giữ nguyên thiết lập của mình</b>, chỉ bổ sung mục máy chưa có.<br>' + P.dungChung.khac.concat(P.dungChung.them).map(x => '• ' + esc(x.text) + '<br><small class="mut">Phần hồ sơ có thể khác: ' + esc(x.anhHuong) + '</small>').join('<br>') + '</div>' : '<p class="mut">Thiết lập dùng chung (định mức BHLĐ, ánh xạ biển số) của lô trùng với máy đích.</p>') +
    P.ghiChu.map(x => '<p class="mut">' + esc(x) + '</p>').join('') +
    (P.ok && exists ? '<p><b>Lô đã có trên máy:</b></p><label><input type="radio" name="lotAct" value="giu" checked> Giữ bản hiện có (không đổi gì)</label><label><input type="radio" name="lotAct" value="thay"> Thay đúng lô này bằng bản trong file (các lô khác không bị đụng tới)</label>' : '') +
    '<p class="mut">Phần mềm tự sao lưu cơ sở dữ liệu trước khi ghi và ghi trong một giao dịch.</p>' +
    '<div class="row" style="justify-content:flex-end"><button class="btn ghost" data-act="lotCancel">Hủy</button>' + (P.ok ? '<button class="btn" data-act="lotGo">' + (exists ? 'Thực hiện' : 'Khôi phục lô') + '</button>' : '') + '</div>';
  $('#impBox').classList.add('on');
}
async function lotGo() {
  const act = (document.querySelector('input[name=lotAct]:checked') || {}).value || 'giu';
  if (act === 'thay' && !confirm('Thay lô này trên máy bằng bản trong file? Chỉ lô này bị thay; phần đang có trên máy vẫn còn trong bản sao lưu tự động.')) return;
  const r = await HB.lotApply(window.__lot, act);
  $('#impBox').classList.remove('on'); window.__lot = null;
  if (!r.ok) return note('Không khôi phục được lô, dữ liệu cũ giữ nguyên: ' + r.error, 'err');
  db = withDefaults(r.db); dbEpoch++; Object.keys(stages).forEach(k => delete stages[k]);
  if (!r.doi) return note('Giữ bản hiện có của lô ' + r.plan.maLo + ': không có gì thay đổi.');
  cur = r.ownerId; curF = r.forestId; view = 'owner'; tab = 'rung'; ftab = 'finfo'; render();
  note('Đã khôi phục lô ' + r.plan.maLo + ' (' + lotCnt(r.plan.incoming) + '). Bản sao lưu trước khi ghi: ' + r.backup, 'ok');
}
async function restoreAll(file) {
  try {
    const o = JSON.parse(await file.text());
    if (o && o.loai === HAKLoRung.KIND) throw new Error('Đây là gói sao lưu MỘT lô rừng. Dùng “Khôi phục lô rừng…” trong menu Thêm.');
    if (!o || typeof o !== 'object' || !o.rs) throw new Error('File không đúng định dạng sao lưu.');
    if (HB) return importWithPreview(withDefaults(o.v === 2 ? o : migrateV1(o)));
    if (!confirm('Khôi phục sẽ thay toàn bộ dữ liệu hiện có trên trình duyệt này. Tiếp tục?')) return;
    db = withDefaults(o.v === 2 ? o : migrateV1(o)); dbEpoch++; Object.keys(stages).forEach(k => delete stages[k]); persist(); cur = null; curF = null;
    note('Đã khôi phục ' + Object.keys(db.rs).length + ' hồ sơ chủ rừng.');
  } catch (e) { note('Không khôi phục được: ' + e.message, 'err'); }
}

