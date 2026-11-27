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

/* ===== Danh mục dùng chung (tách riêng khỏi Cài đặt theo chuẩn V10.4) & Cài đặt hệ thống ===== */
const DM_TABS = [['setdt', 'Đối tượng (người và pháp nhân)', 'openSetDt'], ['setxe', 'Xe vận chuyển', 'openSetXe'], ['setvt', 'Vị trí công việc', 'openSetVt'], ['setnv', 'Ngành nghề và chức vụ', 'openSetNv'], ['cty', 'Công ty mua hàng', 'openCty']];
const DM_VIEWS = ['setdt', 'setxe', 'setvt', 'setnv', 'cty'];
/* Cài đặt: tab NGANG cùng kiểu Danh mục (hak-catalog-tabs). “Hiển thị” gộp Hiển thị số và Giao diện (hai màn giữ nguyên, chuyển bằng tab con); “Hệ thống” đổi tên “Dữ liệu”. Giữ nguyên mã màn (NAV.view) và id nút setTab_<màn>. */
const SET_TABS = [['settings', 'Dữ liệu', 'openSettings'], ['setbk', 'Sao lưu và khôi phục', 'openSetBk'], ['setdon', 'Dọn dẹp hồ sơ', 'openSetDon'], ['setgs', 'Google Sheets', 'openSetGs'], ['setfmt', 'Hiển thị', 'openSetFmt'], ['setaccount', 'Tài khoản', 'openSetAccount'], ['sethd', 'Hướng dẫn', 'openSetHd'], ['setcan', 'Cần đối chiếu', 'openSetCan']];
const SET_HIEN_THI = [['setfmt', 'Hiển thị số', 'openSetFmt', 'setSub_setfmt'], ['setgd', 'Giao diện', 'openSetGd', 'setTab_setgd']];
const SET_VIEWS = ['settings', 'setbk', 'setdon', 'setgs', 'setfmt', 'setgd', 'setaccount', 'sethd', 'setcan'];
function danhMucFrame(active, inner) {
  return '<div class="row" style="justify-content:space-between;align-items:baseline;flex-wrap:wrap;gap:8px"><div><h2 style="margin:0">Danh mục dùng chung</h2><div class="mut" style="font-size:12.5px">Khai báo một lần cho đối tượng, xe vận chuyển, vị trí công việc và công ty mua hàng để dùng lại cho mọi lô rừng.</div></div></div>' +
    veLaiThanh() + '<nav class="hak-catalog-tabs" aria-label="Các danh mục dữ liệu gốc">' + DM_TABS.map(([v, l, a]) => '<button type="button"' + (active === v ? ' aria-current="page"' : '') + ' data-act="' + a + '" id="setTab_' + v + '">' + l + '</button>').join('') +
    '</nav><section class="mucNoiDung" aria-label="' + esc((DM_TABS.find(t => t[0] === active) || [, 'Danh mục'])[1]) + '">' + inner + '</section>';
}
function settingsFrame(active, inner) {
  const nhomHT = SET_HIEN_THI.some(t => t[0] === active), top = nhomHT ? 'setfmt' : active;
  return '<h2>Cài đặt</h2>' + veLaiThanh() + '<nav class="hak-catalog-tabs" aria-label="Các mục cài đặt">' + SET_TABS.map(([v, l, a]) => '<button type="button"' + (top === v ? ' aria-current="page"' : '') + ' data-act="' + a + '" id="setTab_' + v + '">' + l + '</button>').join('') + '</nav>' +
    (nhomHT ? '<nav class="hak-catalog-tabs sub" id="setSubTabs" aria-label="Nhóm hiển thị">' + SET_HIEN_THI.map(([v, l, a, id]) => '<button type="button"' + (active === v ? ' aria-current="page"' : '') + ' data-act="' + a + '" id="' + id + '">' + l + '</button>').join('') + '</nav>' : '') +
    '<section class="mucNoiDung">' + inner + '</section>';
}
const setgs = {st: null, msg: null, cl: null};
function panelSetGs() {
  if (!HB) return '<div class="card"><div class="msg warn">Địa chỉ Google Sheets chỉ có ở bản cài trên Windows.</div></div>';
  const st = setgs.st || {};
  return '<div class="card"><h3 style="margin-top:0">Địa chỉ bảng tính Google Sheets</h3>' +
    '<p class="mut" style="margin-top:0">Bảng tính (chỉ đọc) dùng cho màn <b>Dữ liệu Google Sheets</b>: tab HoSoKeo (phiếu cân), HoSoRung, ToaDoRung. Bảng tính để chế độ “Ai có liên kết đều xem được”; nếu bị giới hạn quyền, đăng nhập Google ở màn Tra cứu.</p>' +
    (setgs.msg ? '<div class="msg ' + setgs.msg.kind + '" id="setGsMsg">' + esc(setgs.msg.text) + '</div>' : '') +
    '<div class="row"><input id="setGsLink" style="flex:1" value="' + esc(st.sheetUrl || '') + '" placeholder="https://docs.google.com/spreadsheets/d/…"><button class="btn" data-act="setGsSave">Lưu địa chỉ</button></div>' +
    '<p class="mut" style="margin-bottom:0">Việc đồng bộ dữ liệu làm ở màn Dữ liệu Google Sheets.</p></div>' +
    '<div class="card"><h3 style="margin-top:0">Báo cáo chất lượng dữ liệu Google Sheets</h3>' +
    '<p class="mut" style="margin-top:0">Chỉ đọc. Bấm một nút để có <b>bảng số đếm</b> (số hợp đồng theo trạng thái, số rừng thiếu mã, số phiếu lỗi ngày, thiếu biển số, nghi đổi số, cặp trùng khóa, thời gian tổng hợp…). <b>Không có</b> CCCD, họ tên, địa chỉ, số hợp đồng, số phiếu, biển số hay mã rừng: có thể gửi lại để kiểm tra dữ liệu thật mà không lộ thông tin cá nhân.</p>' +
    '<div class="row"><button class="btn" data-act="setGsChatLuong" id="setGsChatLuong">Tạo báo cáo chất lượng</button>' + (setgs.cl && setgs.cl.ok ? '<button class="btn ghost" data-act="setGsCLCopy" id="setGsCLCopy">Sao chép bảng</button>' : '') + '</div>' +
    (setgs.cl ? (setgs.cl.ok ? '<pre id="setGsCLBang" style="white-space:pre-wrap;margin:8px 0 0">' + esc(setgs.cl.bang) + '</pre>' : '<div class="msg warn" id="setGsCLLoi">' + esc(setgs.cl.error || 'Chưa có dữ liệu Google Sheets: đồng bộ ở màn Dữ liệu Google Sheets trước.') + '</div>') : '') + '</div>';
}
function panelSetFmt() {
  const row = (v, label, ex) => '<label style="flex-direction:row;gap:8px;align-items:center;color:var(--ink)"><input type="radio" name="numStyle" value="' + v + '"' + ((db.dinhDangSo === 'en' ? 'en' : 'vi') === v ? ' checked' : '') + ' data-act="setNumStyle"> <span><b>' + label + '</b> · ví dụ ' +
  ex + '</span></label>';
  const sample = n => { const t = n.toLocaleString('vi-VN', {maximumFractionDigits: 3}); return t; };
  return '<div class="card"><h3 style="margin-top:0">Hiển thị số</h3>' +
    '<p class="mut" style="margin-top:0">Chọn cách hiển thị số trên màn hình (tiền, khối lượng, diện tích). Báo cáo dùng kiểu số đã chọn. Excel hiển thị dấu phân cách số theo cài đặt của Excel. Biểu mẫu hồ sơ dùng kiểu Việt Nam.</p>' +
    row('vi', 'Kiểu Việt Nam', sample(1234567.5)) + row('en', 'Kiểu quốc tế', sample(1234567.5).replace(/[.,]/g, c => (c === '.' ? ',' : '.'))) +
    '<label>Định dạng ngày khai thác, lương và báo cáo <select data-act="setReportDateStyle"><option value="vi">Ngày/tháng/năm (05/10/2026)</option><option value="iso"' +
    (db.dinhDangNgayBaoCao === 'iso' ? ' selected' : '') + '>Năm-tháng-ngày (2026-10-05)</option></select></label></div>';
}
const setg = {s: null, msg: null};
function panelSettings() {
  if (!HB) return '<div class="card"><h2>Cài đặt hệ thống</h2><div class="msg warn">Cài đặt thư mục dữ liệu và sao lưu chỉ có ở bản cài trên Windows.</div></div>';
  return '<div class="card"><h2 style="margin-top:0">Cài đặt hệ thống</h2>' + (setg.msg ? '<div class="msg ' + setg.msg[1] + '" id="setMsg">' + esc(setg.msg[0]) + '</div>' : '') +
    '<div id="setBox" class="mut">Đang đọc cài đặt…</div></div>';
}
/* BK-04: dải cảnh báo vàng khi ổ chứa dữ liệu / thư mục sao lưu còn dưới 500 MB trống (số liệu s.dungLuong do tiến trình chính tính khi đọc cài đặt; không chặn thao tác). Tab khác dùng lại được. */
function dungLuongHtml(s) {
  const ds = s && s.dungLuong; if (!ds || !ds.length) return '';
  return '<div class="msg warn" data-dung-luong>Dung lượng trống sắp hết (dưới 500 MB): ' + ds.map(d => esc(d.nhan.join(', ')) + ' (<code>' + esc(d.dir) + '</code>): còn ' + d.freeMB + ' MB').join('; ') + '. Giải phóng dung lượng hoặc chọn ổ khác để tránh sao lưu thất bại.</div>';
}
function settingsPaint() {
  const s = setg.s, box = document.getElementById('setBox'); if (!s || !box) return;
  const row = (title, desc, path, custom, def, act, actDef, extra) => '<div class="card" style="margin:10px 0"><h3 style="margin:0 0 4px">' + title + '</h3><p class="mut" style="margin:0 0 8px">' + desc + '</p>' +
    '<div style="word-break:break-all"><b>Đang dùng:</b> <code data-set-path>' + esc(path) + '</code> <span class="pill ' + (custom ? 'ok' : '') + '">' + (custom ? 'thư mục riêng' : 'mặc định') + '</span></div>' +
    '<div class="row" style="margin-top:8px;gap:8px;flex-wrap:wrap"><button class="btn" data-act="' + act + '"' + (s.lockedByEnv && act === 'setData' ? ' disabled' : '') + '>Chọn thư mục…</button>' +
    (custom ? '<button class="btn ghost" data-act="' + actDef + '">Về mặc định</button>' : '') + (extra || '') + '</div>' +
    '<div class="mut" style="margin-top:6px;font-size:12px">Mặc định: ' + esc(def) + '</div></div>';
  const di = s.dbInfo || {}, nowCard = '<div class="card" style="margin:10px 0" id="dbNow"><h3 style="margin:0 0 4px">Cơ sở dữ liệu đang dùng</h3><div style="word-break:break-all"><code data-db-now>' + esc(s.dbFile) + '</code></div><div class="mut" style="margin-top:4px">' + (di.size != null ?
  'Dung lượng ' + (di.size / 1048576 >= 1 ? (di.size / 1048576).toFixed(1) + ' MB' : Math.ceil(di.size / 1024) + ' KB') : '') + (di.mtime ? ' · sửa lần cuối ' + esc(new Date(di.mtime).toLocaleString('vi-VN')) : '') + (di.version ? ' · cấu trúc v' + di.version : '') + '</div></div>';
  box.className = ''; box.innerHTML = dungLuongHtml(s) + nowCard +
    (s.missing.length ? '<div class="msg warn">Thư mục đã chọn trước đây không còn: ' + s.missing.map(esc).join('; ') + '. Ứng dụng đang dùng vị trí mặc định.</div>' : '') +
    (s.lockedByEnv ? '<div class="msg warn">Vị trí dữ liệu đang được cố định bởi biến môi trường HAKQN_DB nên không đổi được ở đây.</div>' : '') +
    row('Thư mục dữ liệu', 'Nơi lưu cơ sở dữ liệu hồ sơ (hakqn.sqlite). Khi đổi, ứng dụng <b>sao chép</b> dữ liệu sang thư mục mới và dùng từ đó; bản cũ được giữ nguyên, không xóa. Nên chọn thư mục trên ổ cứng của máy này (không chọn ổ mạng hoặc thư mục đang đồng bộ đám mây, dễ làm hỏng file).',
    s.dbFile, s.customData, s.defaultDataDir, 'setData', 'setDataDefault', '<button class="btn ghost" data-act="setOpenData">Mở thư mục chứa dữ liệu</button>') +
    '<p class="mut" style="margin:10px 0 0">Thư mục sao lưu SQLite, thư mục sao lưu JSON, tự sao lưu định kỳ, nhắc sao lưu và kho các bản sao lưu nằm ở tab <b>Sao lưu và khôi phục</b>. <button class="btn ghost sm" data-act="openSetBk" id="moKhoSaoLuu">Mở Sao lưu và khôi phục</button></p>';
}
/* Tự sao lưu hằng ngày (src/autobackup.js): mỗi ngày một bản trong thư mục sao lưu, xoay vòng giữ N bản gần nhất */
function autoBackupCard(a) {
  if (!a) return '';
  const r = a.result, last = a.last, sz = b => b / 1048576 >= 1 ? (b / 1048576).toFixed(1) + ' MB' : Math.ceil(b / 1024) + ' KB';
  const st = !a.keep ? 'Đang tắt.' : r && !r.ok ? '<span class="warnTxt">Lần chạy gần nhất không được: ' + esc(r.error || '') + '</span>' : r && r.skipped && r.reason === 'empty' ? 'Chưa có hồ sơ nên chưa sao lưu.' : '';
  return '<div class="card" style="margin:10px 0" id="autoBk"><h3 style="margin:0 0 4px">Tự sao lưu hằng ngày</h3><p class="mut" style="margin:0 0 8px">Mỗi ngày, lần đầu mở phần mềm sẽ tự lưu một bản cơ sở dữ liệu (tu-dong-năm-tháng-ngày.sqlite) vào thư mục sao lưu ở trên và chỉ giữ số bản gần nhất chọn dưới đây. Khi đóng phần mềm (và mỗi 2 giờ nếu để máy mở), bản của hôm nay được làm mới nếu dữ liệu đã đổi, nên bản tự sao lưu chứa cả việc làm trong ngày. Bản này nằm cùng máy, không thay cho sao lưu toàn bộ ra ổ khác.</p>' +
    '<div class="row" style="gap:8px;flex-wrap:wrap;align-items:center"><label>Giữ <select id="setAutoKeep">' + [[0, 'Tắt'], [3, '3 bản'], [7, '7 bản'], [14, '14 bản'], [30, '30 bản']].map(o => '<option value="' + o[0] + '"' + (o[0] === a.keep ? ' selected' : '') + '>' + o[1] +
    '</option>').join('') + '</select></label>' +
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
async function settingsBackup2(reset) {
  const r = await HB.settings.setBackup2(reset); if (r.canceled) return;
  setg.msg = ksl.msg = r.ok ? [reset ? 'Đã tắt thư mục sao lưu thứ hai.' : 'Đã chọn thư mục sao lưu thứ hai: mỗi bản tự sao lưu hằng ngày được chép thêm sang đó.', 'ok'] : ['Không đổi được thư mục sao lưu thứ hai: ' + r.error, 'err'];
  setg.s = r.ok ? r.settings : setg.s; render();
}
async function settingsBackup(reset, fromSaveHelp) {
  const r = await HB.settings.setBackup(reset);
  if (r.canceled) return;
  if (fromSaveHelp) return note(r.ok ? 'Đã đổi thư mục sao lưu SQLite. Bấm “Thử lưu lại” để ghi lô.' : 'Không đổi được thư mục sao lưu SQLite. ' + r.error, r.ok ? 'ok' : 'err');
  setg.msg = ksl.msg = r.ok ? ['Đã ' + (reset ? 'về thư mục sao lưu mặc định' : 'đổi thư mục sao lưu') + ': ' + r.settings.backupDir, 'ok'] : ['Không đổi được thư mục sao lưu: ' + r.error, 'err'];
  setg.s = r.ok ? r.settings : setg.s; render();
}
async function settingsBackupJson(reset) {
  const r = await HB.settings.setBackupJson(reset);
  if (r.canceled) return;
  setg.msg = ksl.msg = r.ok ? ['Đã ' + (reset ? 'về thư mục sao lưu JSON mặc định' : 'đổi thư mục sao lưu JSON') + ': ' + r.settings.backupDirJson, 'ok'] : ['Không đổi được thư mục sao lưu JSON: ' + r.error, 'err'];
  setg.s = r.ok ? r.settings : setg.s; render();
}

/* ===== Sao lưu / khôi phục MỘT lô rừng (chạy trên máy, không cần mạng) ===== */
async function lotBackup() {
  const f = curForest(), o = curOwner(); if (!f || !o) return note('Hãy mở một lô rừng trước khi sao lưu.', 'err');
  if (!HB) return note('Sao lưu lô rừng cần bản cài trên Windows.', 'err');
  if (stDirtyCur()) {
    if (!confirm('Lô này còn thay đổi chưa lưu.\n\nBấm OK để lưu dữ liệu vào lô trước rồi sao lưu ngay bản mới nhất (hoặc Hủy để quay lại).')) return;
    const sv = await stSave({tuKhung: true});
    if (!sv || !sv.ok) return;
  }
  const W = dbGhi();
  let pkg; try { pkg = HAKLoRung.exportLot(W, o.id, f.id, {version: (dbInfo && dbInfo.version) || ''}); } catch (e) { return note('Không sao lưu được lô: ' + e.message, 'err'); }
  const r = await HB.lotSave(pkg);
  if (r.canceled) return;
  if (r.ok && r.canhBao) pushNote('Cảnh báo: ' + r.canhBao, 'err');
  note(r.ok ? 'Đã sao lưu lô ' + pkg.maLo + ' (' + pkg.kiemTra.nc + ' nhân công, ' + pkg.kiemTra.dx + ' xe, ' + pkg.kiemTra.pc + ' phiếu cân) vào: ' + r.file + (f.chot ? '. ' + lotPhamViText(f) : '') : 'Không sao lưu được lô: ' + r.error, r.ok ? 'ok' : 'err');
}
/* PHẠM VI gói sao lưu riêng lô đối với lô đã chốt: gói chỉ mang BẢN CHỐT HIỆN HÀNH (một bản chụp); bản chụp của các lần chốt trước ở lại máy nguồn (bảng chot_goi),
 * nhật ký vòng đời (lần chốt, lý do mở khóa, dấu vân tay từng lần) đi theo gói. Dùng chung cho thông báo sau khi sao lưu và màn xem trước khi khôi phục. */
function lotPhamViText(f) {
  const c = f && f.chot; if (!c) return '';
  const truoc = (f.nhatKy || []).filter(x => x.hanh === 'chot' && x.phienBan && x.phienBan !== c.phienBan).map(x => x.phienBan);
  return 'Phạm vi gói: chỉ mang bản chốt hiện hành (phiên bản ' + c.phienBan + ', dấu vân tay ' + c.hash + ').' + (truoc.length ? ' Bản chụp của lần chốt trước (phiên bản ' + truoc.join(', ') + ') không nằm trong gói, vẫn lưu ở máy đã chốt;' : '') + ' Nhật ký vòng đời (lần chốt, lý do mở khóa, dấu vân tay từng lần) đi theo gói. Muốn phục hồi cả các bản chụp cũ: dùng Sao lưu toàn bộ (file .sqlite).';
}
const lotCnt = c => c ? c.nc + ' nhân công, ' + c.dx + ' xe, ' + c.pc + ' phiếu cân, ' + fmtTan(c.kl) + ' tấn' : '';
/* So sánh số liệu một lô: trước (đang có trên máy) và sau (trong file). Một cột khi lô chưa có trên máy. */
function lotFigTable(P) {
  const I = P.incoming, E = P.existing, row = (l, f) => '<tr><td>' + l + '</td>' + (E ? '<td>' + f(E) + '</td>' : '') + '<td>' + f(I) + '</td></tr>';
  const chg = (a, b) => E && a !== b ? ' <span class="pill warn">thay đổi</span>' : '';
  return '<div class="wrap"><table><tr><th></th>' + (E ? '<th>Trước: đang có trên máy</th><th>Sau: bản trong file</th>' : '<th>Trong file</th>') + '</tr>' +
    [['Nhân công', x => fmt(x.nc), 'nc'], ['Xe', x => fmt(x.dx), 'dx'], ['Phiếu cân', x => fmt(x.pc), 'pc'], ['Tổng khối lượng (tấn)', x => fmtTan(x.kl), 'kl'], ['Giấy tờ', x => fmt(x.giayTo), 'giayTo'], ['Cách tính cước', x => esc(x.cuoc), 'cuoc'], ['Địa chỉ giao hàng đã chốt',
    x => esc(x.diemDen || '(chưa có)'), 'diemDen']]
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
      (exists ? ' Lô này <b>đã tồn tại</b> trên máy.' : ' Lô <b>chưa có</b> trên máy.') + '</div>' : '<div class="msg err" id="lotDung"><b>' + (P.conflicts.some(c => c.loai === 'toanVen') ?
      'Dừng: hồ sơ đã chốt trong file không toàn vẹn — không khôi phục từ file này.</b> Chưa ghi gì; hồ sơ trên máy, các lô khác và file nguồn giữ nguyên. Bấm Hủy rồi chọn bản sao lưu khác để đối chiếu.' : 'Dừng: không xác định được lô đích, cần đối chiếu.</b> Chưa ghi gì.') + '<br>' +
      P.conflicts.map(c => '• ' + esc(c.moTa)).join('<br>') + '</div>') +
    (P.giuTrongChu.length ? '<p class="mut">Các lô khác của chủ này trên máy giữ nguyên: ' + P.giuTrongChu.map(x => esc(x.ma)).join(', ') + '.</p>' : '') +
    (P.dungChung.khac.length || P.dungChung.them.length ? '<div class="msg warn"><b>Thiết lập dùng chung: máy đích giữ nguyên thiết lập của mình</b>, chỉ bổ sung mục máy chưa có.<br>' + P.dungChung.khac.concat(P.dungChung.them).map(x => '• ' + esc(x.text) +
    '<br><small class="mut">Phần hồ sơ có thể khác: ' + esc(x.anhHuong) + '</small>').join('<br>') + '</div>' : '<p class="mut">Thiết lập dùng chung (định mức BHLĐ, ánh xạ biển số) của lô trùng với máy đích.</p>') +
    P.ghiChu.map(x => '<p class="mut">' + esc(x) + '</p>').join('') + (pk.lo && pk.lo.chot ? '<p class="mut" id="lotPhamVi">' + esc(lotPhamViText(pk.lo)) + '</p>' : '') +
    (P.ok && exists ? '<p><b>Lô đã có trên máy:</b></p><label><input type="radio" name="lotAct" value="giu" checked> <span>Giữ bản hiện có (không đổi gì)</span></label><label><input type="radio" name="lotAct" value="thay"> <span>Thay đúng lô này bằng bản trong file (các lô khác không bị đụng tới)</span></label>' : '') +
    '<p class="mut">Phần mềm tự sao lưu cơ sở dữ liệu trước khi ghi và ghi trong một giao dịch.</p>' +
    '<div class="row" style="justify-content:flex-end"><button class="btn ghost" data-act="lotCancel">Hủy</button>' + (P.ok ? '<button class="btn" data-act="lotGo">' + (exists ? 'Thực hiện' : 'Khôi phục lô') + '</button>' : '') + '</div>';
  $('#impBox').classList.add('on');
}
async function lotGo() {
  const act = (document.querySelector('input[name=lotAct]:checked') || {}).value || 'giu';
  if (act === 'thay' && !confirm('Thay lô này trên máy bằng bản trong file? Chỉ lô này bị thay; phần đang có trên máy vẫn còn trong bản sao lưu tự động.')) return;
  const pkg = window.__lot;
  if (!pkg) return;
  const r = await storeSave(async () => {
    const cu = HB.loadSync();
    if (!cu?.ok) return cu;
    const result = await HB.lotApply(pkg, act);
    if (result?.ok && result.doi) {
      dbCapNhatKhoiPhucRieng({dich: {ownerId: result.ownerId, forestIds: [result.forestId]},
        dbMoi: result.db, dbCu: cu.db, rev: result.rev});
    }
    return result;
  });
  $('#impBox').classList.remove('on'); window.__lot = null;
  if (!r?.ok) return note('Không khôi phục được lô, dữ liệu cũ giữ nguyên: ' + (r?.error || 'Hãy thử lại.'), 'err');
  if (!r.doi) return note('Giữ bản hiện có của lô ' + r.plan.maLo + ': không có gì thay đổi.');
  NAV.cur = r.ownerId; NAV.curF = r.forestId; NAV.view = 'owner'; NAV.tab = 'rung'; NAV.ftab = 'finfo'; render();
  note('Đã khôi phục lô ' + r.plan.maLo + ' (' + lotCnt(r.plan.incoming) + '). Bản sao lưu trước khi ghi: ' + r.backup, 'ok');
}
async function restoreAll(file) {
  try {
    let o; try { o = JSON.parse(await file.text()); } catch (e) { if (e instanceof SyntaxError) throw new Error('File JSON bị hỏng hoặc bị cắt dở, không đọc được nội dung.'); throw e; }
    if (o && o.loai === HAKLoRung.KIND) throw new Error('Đây là gói sao lưu MỘT lô rừng. Dùng “Khôi phục lô rừng…” ở Cài đặt → Sao lưu và khôi phục.');
    const k = HAKLoRung.kiemSaoLuu(o);   // lô 2 (T-11): kiểm cấu trúc và phiên bản TRƯỚC mọi bước; file thiếu "v" mà đã có rừng là v2, không chuyển như v1
    if (!k.ok) throw new Error(k.error);
    const o2 = k.v1 ? migrateV1(o) : Object.assign({}, o, {v: 2});
    if (HB) return importWithPreview(withDefaults(o2));
    if (!confirm('Khôi phục sẽ thay toàn bộ dữ liệu hiện có trên trình duyệt này. Tiếp tục?')) return;
    db = withDefaults(o2); dbEpoch++; Object.keys(stages).forEach(k => delete stages[k]); loDirty.clear(); loMoi.clear(); chuNhap.clear(); aliasNhap.clear(); loCanSaoLuuSheets.clear(); savedSnap = null; persist(); NAV.cur = null; NAV.curF = null;
    note('Đã khôi phục ' + Object.keys(db.rs).length + ' hồ sơ chủ rừng.');
  } catch (e) { note('Không khôi phục được: ' + e.message, 'err'); }
}

/* ===== Quản lý và dọn dẹp hồ sơ chủ rừng (Cài đặt → Dọn dẹp hồ sơ) ===== */
const setdon = {owners: null, loading: false, msg: null, filter: ''};

function panelSetDon() {
  if (!HB || !HB.owners) {
    return '<div class="card"><div class="msg warn">Quản lý dọn dẹp cơ sở dữ liệu chỉ hoạt động trên phiên bản máy tính (SQLite).</div></div>';
  }
  const curIds = new Set(Object.keys(db.rs || {}));
  const list = setdon.owners || [];
  const q = trim(setdon.filter).toLowerCase();
  const filtered = list.filter(o => {
    if (!q) return true;
    return (o.ten || '').toLowerCase().includes(q) ||
           (o.ma || '').toLowerCase().includes(q) ||
           (o.cccd || '').toLowerCase().includes(q);
  });
  const unlisted = list.filter(o => !curIds.has(o.id));

  return '<div class="card" style="margin-bottom:12px">' +
    '<h3 style="margin:0 0 6px">Quản lý &amp; Dọn dẹp hồ sơ chủ rừng trong cơ sở dữ liệu</h3>' +
    '<p class="mut" style="margin:0 0 10px">Hồ sơ chủ rừng lưu trong cơ sở dữ liệu trên máy tính. Dọn dẹp các hồ sơ không còn sử dụng hoặc đưa các hồ sơ đã lưu vào danh sách làm việc chính. Việc dọn hồ sơ được tách biệt độc lập với việc lưu và cập nhật lô rừng.</p>' +
    (setdon.msg ? '<div class="msg ' + setdon.msg[1] + '" style="margin-bottom:10px">' + esc(setdon.msg[0]) + '</div>' : '') +
    '<div class="grid3" style="gap:10px;margin-bottom:12px">' +
      '<div class="card" style="margin:0;padding:10px;background:var(--bg-sub, #f8f9fa)">' +
        '<div class="mut" style="font-size:12px">Tổng hồ sơ trong CSDL</div>' +
        '<div style="font-size:20px;font-weight:700">' + list.length + '</div>' +
      '</div>' +
      '<div class="card" style="margin:0;padding:10px;background:var(--bg-sub, #f8f9fa)">' +
        '<div class="mut" style="font-size:12px">Đang mở trong phiên làm việc</div>' +
        '<div style="font-size:20px;font-weight:700;color:var(--ok, #107c41)">' + (list.length - unlisted.length) + '</div>' +
      '</div>' +
      '<div class="card" style="margin:0;padding:10px;background:var(--bg-sub, #f8f9fa)">' +
        '<div class="mut" style="font-size:12px">Lưu trên máy (chưa nạp ra màn hình)</div>' +
        '<div style="font-size:20px;font-weight:700;color:' + (unlisted.length ? 'var(--warn, #d83b01)' : 'var(--mut)') + '">' + unlisted.length + '</div>' +
      '</div>' +
    '</div>' +
    (unlisted.length ? (
      '<div class="msg warn" style="margin-bottom:12px">' +
        '<b>Có ' + unlisted.length + ' hồ sơ đang lưu trong CSDL nhưng chưa hiển thị trên danh sách làm việc.</b><br>' +
        'Các hồ sơ này được giữ an toàn trong máy và không ảnh hưởng đến việc lưu lô hiện tại. Bạn có thể:' +
        '<div class="row" style="gap:8px;margin-top:8px;flex-wrap:wrap">' +
          '<button type="button" class="btn sm" data-act="donHsLoadAll">📥 Đưa tất cả vào danh sách làm việc</button>' +
          '<button type="button" class="btn danger sm" data-act="donHsPurgeUnlisted">🗑️ Dọn dẹp tất cả hồ sơ này khỏi CSDL</button>' +
        '</div>' +
      '</div>'
    ) : '') +
    '<div class="row" style="gap:8px;align-items:center;margin-bottom:10px">' +
      '<input type="text" id="setDonSearch" placeholder="Lọc theo tên, mã, CCCD…" value="' + esc(setdon.filter) + '" style="max-width:280px">' +
      '<button type="button" class="btn ghost sm" data-act="setDonRefresh">Làm mới danh sách</button>' +
    '</div>' +
    '<div class="wrap" style="max-height:480px">' +
      '<table>' +
        '<thead><tr>' +
          '<th>Tên chủ rừng</th>' +
          '<th>Mã</th>' +
          '<th>CCCD</th>' +
          '<th style="text-align:center">Số lô</th>' +
          '<th>Trạng thái</th>' +
          '<th style="text-align:right">Thao tác</th>' +
        '</tr></thead>' +
        '<tbody>' +
          (filtered.length ? filtered.map(o => {
            const inMem = curIds.has(o.id);
            return '<tr>' +
              '<td><b>' + esc(o.ten || '(chưa đặt tên)') + '</b> ' + (o.danhXung ? '<span class="mut">(' + esc(o.danhXung) + ')</span>' : '') + '</td>' +
              '<td><code>' + esc(o.ma || '—') + '</code></td>' +
              '<td>' + esc(o.cccd || '—') + '</td>' +
              '<td style="text-align:center"><span class="pill ok">' + (o.soLo || 0) + ' lô</span></td>' +
              '<td>' + (inMem ? '<span class="pill ok">Đang trong danh sách</span>' : '<span class="pill warn">Lưu trên máy (chưa nạp)</span>') + '</td>' +
              '<td style="text-align:right;white-space:nowrap">' +
                (!inMem ? '<button type="button" class="btn sm" data-act="donHsLoad" data-id="' + esc(o.id) + '" style="margin-right:6px">Đưa vào danh sách</button>' : '') +
                '<button type="button" class="btn danger sm" data-act="donHsDel" data-id="' + esc(o.id) + '" data-ten="' + esc(o.ten || o.ma || o.id) + '">Xóa</button>' +
              '</td>' +
            '</tr>';
          }).join('') : '<tr><td colspan="6" class="mut" style="text-align:center">Không có hồ sơ nào khớp.</td></tr>') +
        '</tbody>' +
      '</table>' +
    '</div>' +
  '</div>';
}

async function setDonLoad() {
  if (!HB || !HB.owners || setdon.loading) return;
  setdon.loading = true;
  try {
    const r = await HB.owners.list();
    if (r && r.ok) {
      setdon.owners = r.owners || [];
      const curIds = new Set(Object.keys(db.rs || {}));
      const unlisted = (setdon.owners || []).filter(o => !curIds.has(o.id));
      if (!unlisted.length) window.__hakPreservedOwners = null;
      render();
    }
  } catch (e) {
    setdon.msg = ['Lỗi tải danh sách hồ sơ: ' + e.message, 'err'];
    render();
  } finally {
    setdon.loading = false;
  }
}

async function donHsLoad(id) {
  if (!HB || !HB.owners) return;
  try {
    const r = await HB.owners.get(id);
    if (!r || !r.ok || !r.owner) return note('Không tải được hồ sơ: ' + (r?.error || 'lỗi không rõ'), 'err');
    db.rs[id] = r.owner;
    doiDuLieu();
    setdon.msg = ['Đã đưa hồ sơ "' + (r.owner.info?.ten || r.owner.info?.ma || id) + '" vào danh sách làm việc.', 'ok'];
    renderSide();
    setDonLoad();
  } catch (e) {
    note('Lỗi: ' + e.message, 'err');
  }
}

async function donHsLoadAll() {
  if (!HB || !HB.owners) return;
  const curIds = new Set(Object.keys(db.rs || {}));
  const unlisted = (setdon.owners || []).filter(o => !curIds.has(o.id));
  if (!unlisted.length) return;
  let count = 0;
  for (const item of unlisted) {
    const r = await HB.owners.get(item.id);
    if (r && r.ok && r.owner) {
      db.rs[item.id] = r.owner;
      count++;
    }
  }
  doiDuLieu();
  window.__hakPreservedOwners = null;
  setdon.msg = ['Đã đưa ' + count + ' hồ sơ vào danh sách làm việc.', 'ok'];
  renderSide();
  setDonLoad();
}

async function donHsDel(id, ten) {
  if (!HB || !HB.owners) return;
  if (!confirm('Dọn dẹp hồ sơ "' + (ten || id) + '" khỏi cơ sở dữ liệu trên máy?\n\nPhần mềm sẽ tự động sao lưu CSDL trước khi xóa. Bạn có thể khôi phục lại khi cần.')) return;
  try {
    const r = await HB.owners.remove(id);
    if (!r || !r.ok) return note('Không xóa được: ' + (r?.error || 'lỗi không rõ'), 'err');
    if (db.rs[id]) {
      delete db.rs[id];
      if (NAV.cur === id) { NAV.cur = null; NAV.curF = null; }
      doiDuLieu();
      renderSide();
    }
    setdon.msg = ['Đã dọn dẹp hồ sơ "' + (ten || id) + '" khỏi cơ sở dữ liệu.', 'ok'];
    setDonLoad();
  } catch (e) {
    note('Lỗi: ' + e.message, 'err');
  }
}

async function donHsPurgeUnlisted() {
  if (!HB || !HB.owners) return;
  const curIds = new Set(Object.keys(db.rs || {}));
  const unlisted = (setdon.owners || []).filter(o => !curIds.has(o.id));
  if (!unlisted.length) return;
  if (!confirm('Xác nhận dọn dẹp vĩnh viễn ' + unlisted.length + ' hồ sơ đang lưu trên máy nhưng không dùng trong danh sách làm việc?\n\nPhần mềm sẽ sao lưu toàn bộ cơ sở dữ liệu trước khi dọn dẹp.')) return;
  try {
    const ids = unlisted.map(o => o.id);
    const r = await HB.owners.purgeUnlisted(ids);
    if (!r || !r.ok) return note('Không dọn dẹp được: ' + (r?.error || 'lỗi không rõ'), 'err');
    window.__hakPreservedOwners = null;
    setdon.msg = ['Đã dọn dẹp sạch sẽ ' + (r.deleted || ids.length) + ' hồ sơ khỏi cơ sở dữ liệu.', 'ok'];
    setDonLoad();
  } catch (e) {
    note('Lỗi: ' + e.message, 'err');
  }
}

