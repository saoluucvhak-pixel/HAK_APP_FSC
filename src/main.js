'use strict';
const {app, BrowserWindow, ipcMain, dialog, Menu, shell, net, safeStorage, session} = require('electron');
const path = require('path');
const fs = require('fs');
const {Store, SCHEMA_VERSION} = require('./store');
const {Lookup} = require('./lookup');
const LoRung = require('./lorung');
const Settings = require('./settings');
const DM = require('./datamove');
const Backup = require('./backup');
const AutoBackup = require('./autobackup');
const {GoogleAuth, fileIdOf} = require('./google-auth');

/* Biến môi trường CHỈ dành cho kiểm thử tự động (giả lập lỗi, thay hộp thoại, đổi nguồn tải bảng tính...): bị xóa trong bản đã đóng gói (bộ cài),
 * để không tiến trình nào trên máy đặt được chúng nhằm bỏ qua hộp thoại xác nhận hay đổi nguồn dữ liệu. HAKQN_USERDATA/HAKQN_DB/HAKQN_SMOKE* vẫn dùng cho kiểm tra khói bản cài. */
const TEST_ONLY_ENV = ['HAKQN_FAIL_SAVE', 'HAKQN_SHEET_URL', 'HAKQN_TEST_BACKUP_FAIL', 'HAKQN_LOT_DIR', 'HAKQN_LOT_FILE', 'HAKQN_PICK_DIR', 'HAKQN_PICK_CHOICE',
  'HAKQN_RELOC_DELAY_MS', 'HAKQN_TEST_FAIL_STEP', 'HAKQN_CONFIRM_DEFAULT', 'HAKQN_DOWNLOAD_DIR', 'HAKQN_CLOSE'];
if (app.isPackaged) TEST_ONLY_ENV.forEach(k => { delete process.env[k]; });
/* Đường dẫn file do giao diện gửi lên (thay hộp thoại chọn file) chỉ nhận khi chạy từ mã nguồn (kiểm thử); bản cài luôn hỏi qua hộp thoại của hệ điều hành */
const rendererPath = p => (!app.isPackaged && typeof p === 'string' && p) ? p : null;

// Kiểm thử/ chạy thử có thể đặt thư mục dữ liệu riêng, không đụng dữ liệu thật
if (process.env.HAKQN_USERDATA) app.setPath('userData', process.env.HAKQN_USERDATA);

const SHEET_ID = '1QD_VeaUgR0_unMb7NzLykFqvGGgUUrWPvSeaff_OPVc';
const DEFAULT_SHEET = 'https://docs.google.com/spreadsheets/d/' + SHEET_ID + '/edit?usp=sharing';
let lookup = null;
/* Link chia sẻ -> link tải .xlsx chỉ đọc (bảng tính để chế độ "Ai có liên kết đều xem được", không cần đăng nhập) */
function exportUrl(link) {
  if (process.env.HAKQN_SHEET_URL) return process.env.HAKQN_SHEET_URL;
  const m = /\/spreadsheets\/d\/([A-Za-z0-9_-]+)/.exec(link || '');
  return m ? 'https://docs.google.com/spreadsheets/d/' + m[1] + '/export?format=xlsx' : null;
}
let gauth = null;
/* Nạp bản tra cứu. Tab tên khác chuẩn / nhiều tab phù hợp: giữ bản tải về trong bộ nhớ chờ người dùng xác nhận hoặc chọn (lookup:confirmTabs),
 * KHÔNG đổi bản tra cứu đang dùng cho đến khi cả ba vai trò đã xác định và kiểm tra thành công. sheetKey = định danh bảng tính (ID Google / excel:tên file). */
let pendingTabs = null;
function loadLookup(buf, source, detail, sheetKey) {
  const r = lookup.load(buf, source, detail, {sheetKey});
  pendingTabs = r.pending ? {buf, source, detail, sheetKey} : null;
  return r;
}
const sheetKeyOf = link => 'google:' + (fileIdOf(link) || link);
const fetchPublic = async (url, signal) => {
  const res = await net.fetch(url, {signal, redirect: 'follow'});
  if (!res.ok) { const e = new Error('Máy chủ trả lỗi HTTP ' + res.status + (res.status === 401 || res.status === 403 || res.status === 404 ? ' (bảng tính chưa để "Ai có liên kết đều xem được" hoặc sai liên kết; có thể dùng "Đăng nhập Google")' : '')); e.http = res.status; throw e; }
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.slice(0, 2).toString() !== 'PK') { const e = new Error('Nội dung tải về không phải bảng tính (bảng tính yêu cầu đăng nhập; có thể dùng "Đăng nhập Google")'); e.http = 401; throw e; }
  return buf;
};
/* Đồng bộ: đã đăng nhập Google -> tải qua Drive API (chỉ đọc); không thì (hoặc API lỗi quyền) tải qua liên kết công khai.
 * Bản tra cứu chỉ được thay khi lookup.load đọc và kiểm tra đủ 3 tab; mọi lỗi đều giữ bản cũ. */
async function syncSheets() {
  const link = lookup.getMeta('sheetUrl') || DEFAULT_SHEET, url = exportUrl(link);
  if (!url) return lookup.failAttempt('google', link, 'Liên kết Google Sheets không hợp lệ');
  const ctl = new AbortController(), timer = setTimeout(() => ctl.abort(), 45000);
  const fail = (msg) => lookup.failAttempt('google', link, msg + '. Bản tra cứu cũ vẫn được dùng.');
  try {
    let apiErr = null;
    if (gauth.status().signedIn && !process.env.HAKQN_SHEET_URL) {
      try { return loadLookup(await gauth.exportXlsx(fileIdOf(link), ctl.signal), 'google', link + ' (tài khoản Google)', sheetKeyOf(link)); }
      catch (e) { apiErr = e; if (e.code === 'network' || e.code === 'timeout') return fail(e.message); }
    }
    try { return loadLookup(await fetchPublic(url, ctl.signal), 'google', link, sheetKeyOf(link)); }
    catch (e) {
      const why = e.name === 'AbortError' ? 'Hết thời gian chờ kết nối' : e.http ? e.message : 'Không kết nối được (' + e.message + ')';
      return fail(apiErr ? 'Đăng nhập Google: ' + apiErr.message + ' · Liên kết công khai: ' + why : why);
    }
  } finally { clearTimeout(timer); }
}

const TITLE = 'HAKQN – Hồ sơ khai thác và vận chuyển gỗ keo';
let store = null, win = null, loc = null;
let dataIssue = null;        // khác null khi vị trí dữ liệu đã cấu hình không mở được: KHÔNG tự dùng bản mặc định, chờ người dùng chọn
let relocating = null;       // Promise khi đang đổi thư mục dữ liệu: mọi thao tác ghi chờ xong rồi mới chạy trên cơ sở dữ liệu mới
let notice = null;           // thông báo hiện sau khi cửa sổ tải lại từ cơ sở dữ liệu mới (không phụ thuộc vào renderer kịp lưu trước khi tải lại)
let backingUp = false;       // đang sao lưu toàn bộ: chặn bấm hai lần

/* Nhật ký lỗi: không ghi dữ liệu cá nhân (che dãy từ 6 chữ số liên tiếp: CCCD, số điện thoại...) và không ghi nội dung hồ sơ */
function log(level, msg) {
  try {
    const dir = path.join(app.getPath('userData'), 'logs'); fs.mkdirSync(dir, {recursive: true});
    const clean = String(msg).replace(/\d{6,}/g, '***').slice(0, 300);
    fs.appendFileSync(path.join(dir, 'app.log'), new Date().toISOString() + ' ' + level + ' ' + clean + '\n');
  } catch (e) { /* bỏ qua */ }
}

function openStore() {
  const dir = app.getPath('userData'); fs.mkdirSync(dir, {recursive: true});
  if (store) { try { store.db.close(); } catch (e) { /* đã đóng */ } store = null; }
  loc = Settings.resolve(dir, process.env);
  gauth = new GoogleAuth({dir, fetch: (u, o) => net.fetch(u, o), openExternal: u => shell.openExternal(u), safeStorage});
  // Kiểm tra cả thư mục lẫn file hakqn.sqlite đã cấu hình TRƯỚC khi mở (Store sẽ tự tạo file trống nếu thiếu): không tự chuyển sang bản mặc định
  const chk = Settings.checkConfigured(dir, process.env);
  if (chk.state !== 'ok') { dataIssue = chk; lookup = null; log('ERROR', 'Không truy cập được dữ liệu đã cấu hình (' + chk.code + ')'); return false; }
  try {
    fs.mkdirSync(path.dirname(loc.dbFile), {recursive: true});
    store = new Store(loc.dbFile, {log, backupDir: loc.backupDir});
    lookup = new Lookup(store); dataIssue = null;
  } catch (e) {
    store = null; lookup = null;
    dataIssue = {state: 'unavailable', path: loc.dbFile, dir: path.dirname(loc.dbFile), code: 'OPEN_FAILED', reason: Settings.describeError(e, loc.dbFile)};
    log('ERROR', 'Không mở được cơ sở dữ liệu: ' + e.message); return false;
  }
  loc.missing.forEach(m => log('WARN', 'Thư mục sao lưu đã chọn không còn: ' + m + ', dùng mặc định'));
  runAutoBackup();
  return true;
}

/* Tự sao lưu xoay vòng hằng ngày khi mở cơ sở dữ liệu (src/autobackup.js): chạy nền, không chặn khởi động; lỗi chỉ ghi nhật ký và hiện ở Cài đặt hệ thống */
let autoBk = null;   // kết quả lần chạy gần nhất trong phiên
let autoBkP = null;  // Promise của lần chạy đang dở (kiểm tra khói chờ xong rồi mới thoát)
function runAutoBackup() {
  let st; try { st = Settings.load(app.getPath('userData')); } catch (e) { return; }
  if (!st.autoKeep) { autoBk = {ok: true, skipped: true, reason: 'off'}; return; }
  const s = store, dir = loc.backupDir;
  autoBkP = AutoBackup.daily(s, {keep: st.autoKeep, dir}).then(r => {
    autoBk = {...r, at: new Date().toISOString()};
    if (!r.ok) log('ERROR', 'Tự sao lưu hằng ngày không được: ' + r.error);
    else if (!r.skipped) log('INFO', 'Tự sao lưu hằng ngày: ' + path.basename(r.file) + (r.removed.length ? ' (xóa ' + r.removed.length + ' bản cũ)' : ''));
  }, e => { autoBk = {ok: false, error: e.message}; });
}

const NO_STORE = () => 'Chưa mở được cơ sở dữ liệu' + (dataIssue ? ': ' + dataIssue.reason + ' (' + dataIssue.path + ')' : '') + '. Hãy xử lý ở màn hình thông báo trước.';
function wrap(fn, anyState) { return (...a) => { try { if (!store && !anyState) throw Object.assign(new Error(NO_STORE()), {unavailable: true}); return {ok: true, ...fn(...a)}; } catch (e) { log('ERROR', e.message); return {ok: false, error: e.message, unavailable: !!e.unavailable}; } }; }
/* Mọi thao tác ghi/đọc dữ liệu chờ nếu đang đổi thư mục dữ liệu: không mất thao tác lưu phát sinh lúc đó, và chạy trên cơ sở dữ liệu mới sau khi chuyển */
const afterReloc = fn => async (...a) => { if (relocating) { try { await relocating; } catch (e) { /* lỗi đã được báo ở nơi đổi */ } } return fn(...a); };

function registerIpc() {
  ipcMain.on('db:load', e => {
    if (!store) { e.returnValue = {ok: false, unavailable: true, issue: dataIssue, error: NO_STORE()}; return; }
    try { e.returnValue = {ok: true, db: store.load(), file: store.file, schema: SCHEMA_VERSION, version: app.getVersion(), notice}; notice = null; }
    catch (err) { log('ERROR', err.message); e.returnValue = {ok: false, error: err.message}; }
  });
  /* HAKQN_FAIL_SAVE=<đường dẫn file>: khi file đó tồn tại thì lần lưu giả lập thất bại (chỉ dùng để kiểm thử “lưu lỗi”) */
  ipcMain.handle('db:save', afterReloc((e, db, opts) => (process.env.HAKQN_FAIL_SAVE && fs.existsSync(process.env.HAKQN_FAIL_SAVE)) ? {ok: false, error: 'giả lập lỗi ghi (kiểm thử)'} : wrap(() => store.save(db, {allowBulkDelete: !!(opts && opts.allowBulkDelete)}))()));
  ipcMain.handle('import:preview', afterReloc((e, db, opts) => wrap(() => store.previewImport(db, opts))()));
  ipcMain.handle('import:apply', afterReloc((e, db, strategy, opts) => wrap(() => ({...store.applyImport(db, strategy, opts), db: store.load()}))()));
  ipcMain.handle('backup:to', afterReloc(async () => {
    if (!store) return {ok: false, error: NO_STORE(), unavailable: true};
    if (backingUp) return {ok: false, error: 'Đang sao lưu, vui lòng đợi xong rồi bấm lại.'};
    backingUp = true;
    try {
      let outDir;
      if (loc.customBackup) outDir = loc.backupDir;   // đã chọn thư mục sao lưu ở Cài đặt hệ thống: lưu thẳng vào đó
      else {
        const r = await dialog.showOpenDialog(win, {title: 'Chọn thư mục lưu bản sao lưu', defaultPath: loc.backupDir, properties: ['openDirectory', 'createDirectory']});
        if (r.canceled || !r.filePaths[0]) return {ok: true, canceled: true};
        outDir = r.filePaths[0];
      }
      const t = process.env.HAKQN_TEST_BACKUP_FAIL;   // chỉ dùng khi kiểm thử: json | sqlite | enospc | space
      const hooks = {};
      if (t === 'json' || t === 'enospc') hooks.beforeJson = () => { throw Object.assign(new Error('giả lập'), {code: t === 'enospc' ? 'ENOSPC' : 'EIO'}); };
      if (t === 'sqlite') hooks.beforeSqlite = () => { throw Object.assign(new Error('giả lập'), {code: 'EIO'}); };
      if (t === 'space') hooks.freeBytes = 1024;
      const res = await Backup.backupAll({db: store.db, data: store.load(), outDir, dbBytes: sizeWithWal(store.file), hooks});
      if (res.ok) { try { const ud = app.getPath('userData'); Settings.save(ud, {...Settings.load(ud), lastBackup: new Date().toISOString()}); } catch (er) { log('WARN', 'Không ghi được ngày sao lưu: ' + er.message); } }   // chỉ khi cả hai file đã ghi và qua kiểm tra
      else log('ERROR', 'Sao lưu không đầy đủ: ' + res.message);
      return {ok: res.ok, error: res.ok ? undefined : res.message, message: res.message, jsonFile: res.json.file, sqlFile: res.sqlite.file, json: res.json, sqlite: res.sqlite};
    } catch (e) { log('ERROR', e.message); return {ok: false, error: e.message}; }
    finally { backingUp = false; }
  }));
  /* Sao lưu / khôi phục MỘT lô rừng: chạy hoàn toàn trên máy, không cần mạng. Khi kiểm thử tự động: HAKQN_LOT_DIR (thư mục lưu) và HAKQN_LOT_FILE (file mở) thay cho hộp thoại. */
  const sha = txt => require('crypto').createHash('sha256').update(txt).digest('hex');
  const sizeWithWal = f => { let n = 0; for (const x of ['', '-wal']) try { n += fs.statSync(f + x).size; } catch (e) { /* không có */ } return n; };
  ipcMain.handle('lot:save', async (e, pkg) => {
    try {
      const sealed = LoRung.seal(LoRung.parsePackage(pkg).pkg || (() => { throw new Error('Dữ liệu lô không hợp lệ.'); })(), sha), name = LoRung.fileName(sealed);
      let file = process.env.HAKQN_LOT_DIR ? path.join(process.env.HAKQN_LOT_DIR, name) : null;
      if (!file) {
        const r = await dialog.showSaveDialog(win, {title: 'Lưu sao lưu lô rừng', defaultPath: path.join(loc.customBackup ? loc.backupDir : app.getPath('documents'), name), filters: [{name: 'Sao lưu lô rừng HAKQN', extensions: ['json']}]});
        if (r.canceled || !r.filePath) return {ok: true, canceled: true};
        file = r.filePath;
      }
      // ghi qua file tạm, đọc lại kiểm tra gói lô; tên tự đặt (kiểm thử) không ghi đè bản có sẵn; chọn qua hộp thoại thì hệ điều hành đã hỏi ghi đè
      const out = Backup.saveLotFile({file, text: JSON.stringify(sealed, null, 2), unique: !!process.env.HAKQN_LOT_DIR, verify: t => { const pp = LoRung.parsePackage(t, sha); if (!pp.ok) throw new Error('gói lô ghi ra không hợp lệ: ' + pp.error); }});
      return {ok: true, file: out};
    } catch (err) { log('ERROR', err.message); return {ok: false, error: err.message}; }
  });
  ipcMain.handle('lot:open', async (e, filePath) => {
    try {
      if (!store) throw new Error(NO_STORE());
      if (relocating) await relocating.catch(() => {});
      let p = rendererPath(filePath) || process.env.HAKQN_LOT_FILE;
      if (!p) {
        const r = await dialog.showOpenDialog(win, {title: 'Chọn file sao lưu lô rừng', filters: [{name: 'Sao lưu lô rừng HAKQN', extensions: ['json']}], properties: ['openFile']});
        if (r.canceled || !r.filePaths[0]) return {ok: true, canceled: true};
        p = r.filePaths[0];
      }
      const parsed = LoRung.parsePackage(fs.readFileSync(p, 'utf8'), sha);
      if (!parsed.ok) return {ok: false, error: parsed.error, file: p};
      return {ok: true, file: p, pkg: parsed.pkg, plan: store.previewLot(parsed.pkg)};
    } catch (err) { log('ERROR', err.message); return {ok: false, error: err.message}; }
  });
  ipcMain.handle('lot:apply', afterReloc((e, pkg, action) => wrap(() => {
    const parsed = LoRung.parsePackage(pkg, sha); if (!parsed.ok) throw new Error(parsed.error);
    return {...store.applyLot(parsed.pkg, action), db: store.load()};
  })()));
  ipcMain.handle('lookup:audit', () => wrap(() => ({audit: lookup.audit()}))());
  ipcMain.handle('lookup:status', () => wrap(() => ({...lookup.status(), sheetUrl: lookup.getMeta('sheetUrl') || DEFAULT_SHEET}))());
  ipcMain.handle('lookup:setSheet', afterReloc((e, link) => wrap(() => { if (!exportUrl(link)) throw new Error('Liên kết không phải Google Sheets'); lookup.setMeta('sheetUrl', link); return {}; })()));
  ipcMain.handle('lookup:sync', afterReloc(async () => { try { return await syncSheets(); } catch (e) { log('ERROR', e.message); return {ok: false, errors: [e.message]}; } }));
  ipcMain.handle('lookup:importExcel', afterReloc(async (e, filePath) => {
    try {
      let p = rendererPath(filePath);
      if (!p) {
        const r = await dialog.showOpenDialog(win, {title: 'Chọn file Excel tra cứu (HoSoKeo_QC.xlsx)', filters: [{name: 'Excel', extensions: ['xlsx', 'xlsm', 'xls']}], properties: ['openFile']});
        if (r.canceled || !r.filePaths[0]) return {ok: true, canceled: true};
        p = r.filePaths[0];
      }
      return loadLookup(fs.readFileSync(p), 'excel', path.basename(p), 'excel:' + path.basename(p));
    } catch (err) { log('ERROR', err.message); return {ok: false, errors: [err.message]}; }
  }));
  ipcMain.handle('lookup:confirmTabs', afterReloc((e, choices) => {
    try {
      if (!lookup) throw new Error(NO_STORE());
      if (!pendingTabs) return {ok: false, errors: ['Không còn bản tải về đang chờ xác nhận tab. Hãy đồng bộ hoặc nhập file lại.']};
      const p = pendingTabs, r = lookup.load(p.buf, p.source, p.detail, {sheetKey: p.sheetKey, choices: choices || {}});
      if (r.ok) pendingTabs = null;           // thành công: đã kiểm tra cấu trúc và ghi nhớ ánh xạ
      return r;                                // lỗi (ví dụ chọn tab thiếu cột): giữ bản chờ để người dùng chọn lại
    } catch (err) { log('ERROR', err.message); return {ok: false, errors: [err.message]}; }
  }));
  ipcMain.handle('lookup:template', () => { try { return {ok: true, file: 'HAK_Mau_TraCuu.xlsx', bytes: require('./lookup').buildTemplate(app.getVersion())}; } catch (err) { return {ok: false, error: err.message}; } });
  ipcMain.handle('lookup:cancelTabs', () => { pendingTabs = null; return {ok: true}; });
  ipcMain.handle('google:status', () => gauth.status());
  ipcMain.handle('google:login', async () => { try { return {ok: true, status: await gauth.login()}; } catch (e) { log('ERROR', 'google login: ' + e.code); return {ok: false, code: e.code, error: e.message, status: gauth.status()}; } });
  ipcMain.handle('google:logout', () => ({ok: true, status: gauth.logout()}));
  ipcMain.handle('lookup:search', (e, q, tab, opts) => wrap(() => lookup.search(q || '', tab || '', opts || {}))());
  ipcMain.handle('lookup:candidates', (e, tab, row) => { try { return lookup.candidates(tab, row); } catch (err) { log('ERROR', err.message); return {ok: false, error: err.message}; } });
  ipcMain.handle('lookup:build', (e, cccd, hd) => wrap(() => lookup.build(cccd, hd, ''))());
  /* ===== Cài đặt hệ thống: thư mục dữ liệu, thư mục sao lưu. Kiểm thử tự động: HAKQN_PICK_DIR (thư mục chọn) và HAKQN_PICK_CHOICE ('use' | 'overwrite') thay cho hộp thoại. ===== */
  const remind = () => { const ud = app.getPath('userData'), st = Settings.load(ud); let first = NaN; try { first = fs.statSync(loc.dbFile).birthtimeMs || fs.statSync(loc.dbFile).ctimeMs; } catch (er) { /* chưa có file */ } return {remindDays: st.remindDays, lastBackup: st.lastBackup, ...Settings.backupDue(st, Date.now(), first)}; };
  const dbInfo = () => { try { const st = fs.statSync(loc.dbFile); return {size: st.size, mtime: st.mtime.toISOString(), version: store ? store.db.pragma('user_version', {simple: true}) : null, open: !!store}; } catch (e) { return {size: 0, mtime: null, version: null, open: !!store}; } };
  const autoView = () => { let st = {}; try { st = Settings.load(app.getPath('userData')); } catch (e) { /* mặc định */ } const ls = AutoBackup.list(loc.backupDir); return {keep: st.autoKeep, count: ls.length, last: ls[0] ? {name: ls[0].name, day: ls[0].day, size: ls[0].size} : null, result: autoBk}; };
  const setView = () => ({issue: dataIssue, dbInfo: dbInfo(), remind: remind(), auto: autoView(), dbFile: loc.dbFile, dataDir: loc.dataDir, defaultDataDir: loc.defaultDataDir, customData: loc.customData, backupDir: loc.backupDir, defaultBackupDir: loc.defaultBackupDir, customBackup: loc.customBackup, lockedByEnv: loc.lockedByEnv, missing: loc.missing});
  const pickFolder = async title => {
    if (process.env.HAKQN_PICK_DIR) return process.env.HAKQN_PICK_DIR;
    const r = await dialog.showOpenDialog(win, {title, properties: ['openDirectory', 'createDirectory']});
    return r.canceled || !r.filePaths[0] ? '' : r.filePaths[0];
  };
  ipcMain.handle('settings:get', () => wrap(() => ({settings: setView()}), true)());
  ipcMain.handle('settings:setRemind', (e, days) => wrap(() => { const ud = app.getPath('userData'); const d = Math.max(0, Math.min(365, parseInt(days, 10) || 0)); Settings.save(ud, {...Settings.load(ud), remindDays: d}); return {settings: setView()}; })());
  ipcMain.handle('settings:setAutoKeep', (e, n) => wrap(() => { const ud = app.getPath('userData'); const k = Math.max(0, Math.min(60, parseInt(n, 10) || 0)); Settings.save(ud, {...Settings.load(ud), autoKeep: k}); if (k) runAutoBackup(); return {settings: setView()}; })());
  ipcMain.handle('settings:openBackup', () => { try { fs.mkdirSync(loc.backupDir, {recursive: true}); shell.openPath(loc.backupDir); return {ok: true}; } catch (e) { return {ok: false, error: e.message}; } });
  ipcMain.handle('settings:setBackup', async (e, reset) => {
    try {
      let dir = '';
      if (!store) throw new Error(NO_STORE());   // chưa mở được dữ liệu: không ghi cấu hình rồi mới báo lỗi
      if (!reset) { dir = await pickFolder('Chọn thư mục lưu bản sao lưu'); if (!dir) return {ok: true, canceled: true}; dir = Settings.checkFolder(dir); }
      const cur = Settings.load(app.getPath('userData')); Settings.save(app.getPath('userData'), {...cur, backupDir: dir});
      loc = Settings.resolve(app.getPath('userData'), process.env); if (store) store.backupDir = loc.backupDir;
      log('INFO', 'Đổi thư mục sao lưu: ' + (reset ? 'mặc định' : 'thư mục riêng'));
      return {ok: true, settings: setView()};
    } catch (err) { log('ERROR', err.message); return {ok: false, error: err.message}; }
  });
  /* Đổi thư mục dữ liệu (src/datamove.js): bản sao qua file tạm có kiểm tra toàn vẹn; ghi đè có bản dự phòng nhất quán đã kiểm tra; chỉ lưu đường dẫn mới
   * sau khi mở và dùng được cơ sở dữ liệu mới; lỗi ở bước nào cũng hoàn tác và giữ phiên làm việc cũ. Trong lúc đổi, mọi thao tác lưu chờ rồi chạy trên cơ sở dữ liệu mới. */
  const vi = d => d ? new Date(d).toLocaleString('vi-VN') : 'không rõ';
  const describeDb = i => (i.counts && i.counts.owners != null ? i.counts.owners + ' chủ rừng, ' + (i.counts.forests || 0) + ' lô rừng · ' : '') + 'cấu trúc v' + i.version + ' · sửa lần cuối ' + vi(i.mtime);
  ipcMain.handle('settings:setData', async (e, reset) => {
    if (relocating) return {ok: false, error: 'Đang đổi thư mục dữ liệu, vui lòng đợi xong.'};
    let done; relocating = new Promise(r => { done = r; });
    try {
      if (!store) throw new Error(NO_STORE());
      if (loc.lockedByEnv) throw new Error('Vị trí dữ liệu đang được cố định bởi biến môi trường HAKQN_DB; không đổi được trong ứng dụng.');
      const userDir = app.getPath('userData');
      let dir = loc.defaultDataDir;
      if (!reset) { dir = await pickFolder('Chọn thư mục lưu dữ liệu'); if (!dir) return {ok: true, canceled: true}; }
      dir = Settings.checkFolder(dir);
      const target = path.join(dir, Settings.DB_NAME);
      if (path.resolve(target) === path.resolve(loc.dbFile)) return {ok: true, same: true, settings: setView()};
      let choice;
      if (fs.existsSync(target)) {
        const insp = DM.inspect(target, SCHEMA_VERSION);
        choice = process.env.HAKQN_PICK_CHOICE;
        if (!choice) {
          const canUse = insp.ok, canOver = insp.ok || insp.code === 'NEWER_VERSION';
          if (!canUse && !canOver) return {ok: false, code: insp.code, error: 'Thư mục này đã có file ' + Settings.DB_NAME + ' nhưng không dùng được và cũng không thể ghi đè an toàn: ' + insp.error + ' Hãy di chuyển hoặc xóa file đó thủ công, hoặc chọn thư mục khác.'};
          const buttons = [...(canUse ? ['Dùng dữ liệu có sẵn'] : []), 'Ghi đè bằng dữ liệu đang dùng', 'Hủy'];
          const m = await dialog.showMessageBox(win, {type: 'question', title: TITLE, message: 'Thư mục này đã có dữ liệu HAKQN.',
            detail: target + '\nĐích: ' + (insp.ok ? describeDb(insp) : insp.error) + '\nĐang dùng: ' + describeDb(DM.inspect(store.file, SCHEMA_VERSION)) + '\n\n' + (canUse ? 'Dùng dữ liệu có sẵn: chuyển sang bản ở thư mục đó, không sao chép gì.\n' : '') + 'Ghi đè: thay bằng dữ liệu đang dùng; bản có sẵn ở đích được sao lưu nhất quán (kèm giao dịch còn trong WAL) vào thư mục sao lưu và kiểm tra mở được trước khi thay.', buttons, defaultId: buttons.length - 1, cancelId: buttons.length - 1});
          const label = buttons[m.response];
          choice = label === 'Dùng dữ liệu có sẵn' ? 'use' : label.startsWith('Ghi đè') ? 'overwrite' : null;
        }
        if (!choice) return {ok: true, canceled: true};
      }
      const failAt = process.env.HAKQN_TEST_FAIL_STEP, delay = +process.env.HAKQN_RELOC_DELAY_MS || 0;
      const hooks = {step: async n => { if (delay && n === 'after-tmp') await new Promise(r => setTimeout(r, delay)); if (failAt === n) throw new Error('Lỗi giả lập tại bước ' + n); }};
      const prev = Settings.load(userDir), want = reset ? '' : dir;
      const backupDirFor = d => loc.customBackup ? loc.backupDir : path.join(d, 'backups');
      const res = await DM.relocate({srcDb: store.db, srcFile: store.file, destDir: dir, choice, backupDir: loc.customBackup ? loc.backupDir : path.join(loc.dataDir, 'backups'), supportedVersion: SCHEMA_VERSION,
        openNew: f => new Store(f, {log, backupDir: backupDirFor(dir)}),
        commitConfig: () => { Settings.save(userDir, {...Settings.load(userDir), dataDir: want}); if ((Settings.load(userDir).dataDir || '') !== want) throw new Error('cấu hình không được ghi'); },
        hooks, log});
      // chuyển phiên làm việc sang cơ sở dữ liệu mới; lỗi ở đây thì trả cấu hình về như cũ
      const old = store, from = loc.dbFile;
      try {
        store = res.newStore; loc = Settings.resolve(userDir, process.env); store.backupDir = loc.backupDir; lookup = new Lookup(store); dataIssue = null;
      } catch (er) {
        try { Settings.save(userDir, prev); } catch (e2) { log('ERROR', 'Không trả được cấu hình: ' + e2.message); }
        try { res.newStore.db.close(); } catch (e3) { /* bỏ qua */ }
        store = old; loc = Settings.resolve(userDir, process.env); lookup = new Lookup(store);
        throw new Error('Không chuyển được phiên làm việc sang cơ sở dữ liệu mới: ' + er.message + '. Vẫn dùng vị trí cũ.');
      }
      try { old.db.close(); } catch (er) { /* đã đóng */ }
      log('INFO', 'Đổi thư mục dữ liệu (' + res.choice + ')');
      notice = 'Đã chuyển dữ liệu sang ' + loc.dbFile + (res.choice === 'use' ? ' (dùng dữ liệu có sẵn ở đó)' : ' (đã sao chép và kiểm tra)') + '. Bản cũ vẫn còn ở ' + from + ', xóa tay khi chắc chắn không cần.' + (res.backupFile ? ' Bản dự phòng của dữ liệu đã có ở đích: ' + res.backupFile + '.' : '');
      setTimeout(() => { if (win && !win.isDestroyed()) win.webContents.reload(); }, 150);   // trả kết quả về renderer trước, rồi tải lại từ cơ sở dữ liệu mới
      return {ok: true, choice: res.choice, from, backupFile: res.backupFile || null, settings: setView()};
    } catch (err) { log('ERROR', err.message); return {ok: false, error: err.message, code: err.code, rolledBack: err.rolledBack !== false, settings: (() => { try { return setView(); } catch (e) { return null; } })()}; }
    finally { relocating = null; done(); }
  });
  /* Ổ hoặc thư mục dữ liệu đã cấu hình không truy cập được: thử lại / chọn cơ sở dữ liệu khác / (xác nhận) dùng vị trí mặc định. Cấu hình cũ giữ nguyên cho đến khi người dùng chọn đổi. */
  ipcMain.handle('data:status', () => ({ok: true, unavailable: !store, issue: dataIssue}));
  ipcMain.handle('data:retry', () => { if (store) return {ok: true}; const ok = openStore(); if (ok) setTimeout(() => { if (win && !win.isDestroyed()) win.webContents.reload(); }, 150); return {ok, unavailable: !ok, issue: dataIssue}; });
  ipcMain.handle('data:pickOther', async () => {
    try {
      const userDir = app.getPath('userData'), dir = await pickFolder('Chọn thư mục chứa cơ sở dữ liệu HAKQN (file ' + Settings.DB_NAME + ')');
      if (!dir) return {ok: true, canceled: true};
      const insp = DM.inspect(path.join(dir, Settings.DB_NAME), SCHEMA_VERSION);
      if (!insp.ok) return {ok: false, error: 'Thư mục đó không dùng được: ' + (insp.code === 'MISSING' ? 'không có file ' + Settings.DB_NAME + ' trong thư mục.' : insp.error)};
      const prev = Settings.load(userDir);
      Settings.save(userDir, {...prev, dataDir: dir});
      if (!openStore()) { const why = dataIssue; Settings.save(userDir, prev); openStore(); return {ok: false, error: 'Không mở được cơ sở dữ liệu đã chọn: ' + (why && why.reason) + '. Cấu hình cũ được giữ nguyên.', issue: dataIssue}; }
      setTimeout(() => { if (win && !win.isDestroyed()) win.webContents.reload(); }, 150);
      return {ok: true, settings: setView()};
    } catch (err) { log('ERROR', err.message); return {ok: false, error: err.message}; }
  });
  ipcMain.handle('data:useDefault', async () => {
    try {
      const userDir = app.getPath('userData'), defFile = path.join(userDir, Settings.DB_NAME), exists = fs.existsSync(defFile), insp = exists ? DM.inspect(defFile, SCHEMA_VERSION) : null;
      let okc = process.env.HAKQN_CONFIRM_DEFAULT === '1';
      if (!okc) {
        const m = await dialog.showMessageBox(win, {type: 'warning', title: TITLE, message: 'Dùng cơ sở dữ liệu ở vị trí mặc định?',
          detail: 'Vị trí mặc định: ' + defFile + '\n' + (exists ? (insp.ok ? 'Đã có dữ liệu: ' + describeDb(insp) + '. Đây có thể là bản cũ hoặc khác với dữ liệu ở ổ chính.' : 'Đã có file nhưng không dùng được: ' + insp.error) : 'Chưa có file: sẽ tạo cơ sở dữ liệu trống.') +
            '\n\nĐường dẫn đang cấu hình (' + ((dataIssue && dataIssue.dir) || '') + ') sẽ không còn được dùng. Dữ liệu ở đó không bị xóa.', buttons: ['Dùng vị trí mặc định', 'Hủy'], defaultId: 1, cancelId: 1});
        okc = m.response === 0;
      }
      if (!okc) return {ok: true, canceled: true};
      const prev = Settings.load(userDir);
      Settings.save(userDir, {...prev, dataDir: ''});
      if (!openStore()) { const why = dataIssue; Settings.save(userDir, prev); openStore(); return {ok: false, error: 'Không mở được cơ sở dữ liệu mặc định: ' + (why && why.reason) + '. Cấu hình cũ được giữ nguyên.', issue: dataIssue}; }
      setTimeout(() => { if (win && !win.isDestroyed()) win.webContents.reload(); }, 150);
      return {ok: true};
    } catch (err) { log('ERROR', err.message); return {ok: false, error: err.message}; }
  });
  ipcMain.handle('phieucan:open', async (e, rows, company) => { try { await openPhieuCan(rows, company); return {ok: true}; } catch (err) { log('ERROR', 'phieucan: ' + err.message); return {ok: false, error: err.message}; } });
  ipcMain.handle('app:openData', () => { shell.showItemInFolder(loc.dbFile); return {ok: true}; });
}

/* Kiểm tra khói cho bản đã cài (dùng trong CI và khi nghiệm thu): HAKQN_SMOKE=<file kết quả>, HAKQN_SMOKE_PHASE=create|verify|upgrade|upgrade14 (upgrade: mở dữ liệu do bản 1.0.0 tạo; upgrade14: một chủ hai lô của bản 1.4.x).
 * create: ghi 1 chủ rừng có 2 rừng; verify: đọc lại sau khi đóng/mở app. Cả hai kiểm tra giao diện có bộ lọc mới và menu Báo cáo. */
/* Kiểm tra khói đổi thư mục dữ liệu bằng bộ cài thật (CI Windows): sao chép, ghi đè có bản dự phòng, hoàn tác khi lỗi, đích đang được dùng,
 * dùng dữ liệu có sẵn, ổ biến mất. Dùng đúng hàm DM.relocate như thao tác thật; thư mục làm việc: HAKQN_SMOKE_DIR (mặc định thư mục tạm). */
async function smokeRelocate() {
  const out = process.env.HAKQN_SMOKE, r = {phase: 'relocate', version: app.getVersion(), platform: process.platform, checks: {}};
  try {
    const base = fs.mkdtempSync(path.join(process.env.HAKQN_SMOKE_DIR || require('os').tmpdir(), 'hakqn-reloc-'));
    const mk = (tag, k) => ({v: 2, rs: Object.fromEntries(Array.from({length: k}, (_, i) => [tag + i, {id: tag + i, info: {ma: tag + i, ten: 'CHỦ ' + tag + i, cccd: '04900000000' + i}, forests: {}}]))});
    const dir = n => { const d = path.join(base, n); fs.mkdirSync(d, {recursive: true}); return d; };
    const owners = f => DM.inspect(f).counts.owners;
    const src = new Store(path.join(dir('src'), Settings.DB_NAME)); src.save(mk('S', 3));
    const cfg = {dataDir: ''}, bk = dir('bk');
    const run = (destDir, choice, o = {}) => DM.relocate({srcDb: src.db, srcFile: src.file, destDir, choice, backupDir: bk, supportedVersion: SCHEMA_VERSION, log,
      openNew: f => new Store(f, {backupDir: path.join(destDir, 'backups')}), hooks: o.hooks, commitConfig: () => { if (o.failCommit) throw new Error('giả lập'); cfg.dataDir = destDir; }});
    const fails = async p => { try { await p; return null; } catch (e) { return e; } };
    // 1. sao chép sang thư mục trống
    const d1 = dir('d1'), r1 = await run(d1);
    r.checks.copy = r1.choice === 'copy' && owners(path.join(d1, Settings.DB_NAME)) === 3 && cfg.dataDir === d1 && fs.readdirSync(d1).filter(n => /\.tmp-|\.thay-/.test(n)).length === 0;
    r1.newStore.db.close();
    // 2. ghi đè đích có dữ liệu khác: bản dự phòng nhất quán mở được; đích mang dữ liệu nguồn
    const d2 = dir('d2'), t2 = new Store(path.join(d2, Settings.DB_NAME)); t2.save(mk('D', 5)); t2.db.close();
    cfg.dataDir = '';
    const r2 = await run(d2, 'overwrite');
    r.checks.overwrite = r2.choice === 'overwrite' && !!r2.backupFile && DM.inspect(r2.backupFile).ok && owners(r2.backupFile) === 5 && owners(path.join(d2, Settings.DB_NAME)) === 3 && cfg.dataDir === d2 && fs.readdirSync(d2).filter(n => /\.tmp-|\.thay-/.test(n)).length === 0;
    r2.newStore.db.close();
    // 3. lỗi sau khi đã thay file đích / khi lưu cấu hình: hoàn tác, đích cũ nguyên vẹn, cấu hình không đổi
    for (const [name, o] of [['rollbackReplace', {hooks: {step: n => { if (n === 'after-replace') throw new Error('giả lập'); }}}], ['rollbackCommit', {failCommit: true}]]) {
      const d = dir('d3' + name), t = new Store(path.join(d, Settings.DB_NAME)); t.save(mk('D', 4)); t.db.close(); cfg.dataDir = '';
      const e = await fails(run(d, 'overwrite', o));
      r.checks[name] = !!e && cfg.dataDir === '' && owners(path.join(d, Settings.DB_NAME)) === 4 && DM.inspect(path.join(d, Settings.DB_NAME)).ok && fs.readdirSync(d).filter(n => /\.tmp-|\.thay-/.test(n)).length === 0;
    }
    // 4. đích đang được tiến trình khác mở: ghi đè bị từ chối, đích không đổi (khóa file thật của Windows)
    const d4 = dir('d4'), t4 = new Store(path.join(d4, Settings.DB_NAME)); t4.save(mk('D', 2)); cfg.dataDir = '';
    const e4 = await fails(run(d4, 'overwrite'));
    r.checks.inUse = !!e4 && e4.code === 'IN_USE' && cfg.dataDir === '' && owners(path.join(d4, Settings.DB_NAME)) === 2;
    t4.db.close();
    // 5. dùng dữ liệu có sẵn
    const r5 = await run(d4, 'use');
    r.checks.useExisting = r5.choice === 'use' && cfg.dataDir === d4 && Object.keys(r5.newStore.load().rs).length === 2; r5.newStore.db.close();
    // 6. đích hỏng: từ chối cả hai lựa chọn, giữ nguyên byte
    const d6 = dir('d6'), bad = Buffer.from('SQLite format 3\0' + 'x'.repeat(4000), 'latin1'); fs.writeFileSync(path.join(d6, Settings.DB_NAME), bad);
    const e6a = await fails(run(d6, 'use')), e6b = await fails(run(d6, 'overwrite'));
    r.checks.corruptDest = !!e6a && !!e6b && Buffer.compare(fs.readFileSync(path.join(d6, Settings.DB_NAME)), bad) === 0;
    // 7. ổ biến mất rồi xuất hiện lại
    const ud = dir('ud'), drive = dir('ODIA'), t7 = new Store(path.join(drive, Settings.DB_NAME)); t7.save(mk('M', 2)); t7.db.close();
    Settings.save(ud, {dataDir: drive, backupDir: ''}); fs.renameSync(drive, drive + '.rut');
    const c7a = Settings.checkConfigured(ud); fs.mkdirSync(drive); const c7b = Settings.checkConfigured(ud); fs.rmdirSync(drive); fs.renameSync(drive + '.rut', drive); const c7c = Settings.checkConfigured(ud);
    r.checks.driveGone = c7a.state === 'unavailable' && c7a.code === 'DIR_MISSING' && c7b.code === 'FILE_MISSING' && c7c.state === 'ok' && Settings.load(ud).dataDir === drive && !fs.existsSync(path.join(ud, Settings.DB_NAME));
    // 9. không có quyền truy cập file dữ liệu đã cấu hình: Windows dùng ACL từ chối ghi (icacls), POSIX không root dùng chmod; root thì không tạo được ca này (ghi vào skipped)
    {
      const ud9 = dir('ud9'), d9 = dir('ODIN'), f9 = path.join(d9, Settings.DB_NAME), t9 = new Store(f9); t9.save(mk('N', 1)); t9.db.close(); Settings.save(ud9, {dataDir: d9, backupDir: ''});
      const cp = require('child_process'), who = process.env.USERNAME || 'Everyone'; let undo = null;
      try {
        if (process.platform === 'win32') { cp.execFileSync('icacls', [f9, '/deny', who + ':(W,WD,AD)'], {stdio: 'ignore'}); undo = () => cp.execFileSync('icacls', [f9, '/remove:d', who], {stdio: 'ignore'}); }
        else if (process.getuid && process.getuid() !== 0) { fs.chmodSync(f9, 0o444); undo = () => fs.chmodSync(f9, 0o644); }
      } catch (e) { r.error = 'Không đặt được quyền thử: ' + e.message; }
      if (undo) {
        const c9 = Settings.checkConfigured(ud9); undo(); const c9b = Settings.checkConfigured(ud9);
        r.checks.noPermission = c9.state === 'unavailable' && c9.code === 'NO_PERMISSION' && c9.path === f9 && c9b.state === 'ok' && Settings.load(ud9).dataDir === d9;
      } else { r.skipped = (r.skipped || []).concat('noPermission (chạy bằng root, không đặt được quyền từ chối)'); r.checks.noPermission = true; }
    }
    // 8. sao lưu toàn bộ: hai file riêng, bấm liền không ghi đè, lỗi một file giữ lại file dùng được
    const out8 = dir('bk8'), now = () => new Date(2026, 10, 13, 9, 0, 0, 1);
    const b1 = await Backup.backupAll({db: src.db, data: src.load(), outDir: out8, now}), b2 = await Backup.backupAll({db: src.db, data: src.load(), outDir: out8, now});
    const b3 = await Backup.backupAll({db: src.db, data: src.load(), outDir: out8, now, hooks: {beforeSqlite: () => { throw Object.assign(new Error('giả lập'), {code: 'EIO'}); }}});
    r.checks.backup = b1.ok && b2.ok && b1.json.file !== b2.json.file && !b3.ok && b3.json.ok && !b3.sqlite.ok && fs.readdirSync(out8).filter(n => /\.tmp-/.test(n)).length === 0;
    src.db.close();
  } catch (e) { r.error = e.message; }
  r.ok = !r.error && Object.values(r.checks).every(Boolean);
  fs.writeFileSync(out, JSON.stringify(r, null, 2));
  app.exit(r.ok ? 0 : 3);
}

async function smoke() {
  if (process.env.HAKQN_SMOKE_PHASE === 'relocate') return smokeRelocate();
  const out = process.env.HAKQN_SMOKE, phase = process.env.HAKQN_SMOKE_PHASE || 'create', r = {phase, version: app.getVersion(), online: net.isOnline(), file: store.file, checks: {}};
  try {
    const mkF = (id, ma, dia) => ({id, info: {maRung: ma, tenRung: 'Rừng ' + ma, diaDiem: dia, lat: null, lng: null, dienTich: 2, dinhMucTanHa: 10, cuLy: null, tuNgay: '', denNgay: '', donGia: 340000, giayTo: []}, nc: [], dx: [], pc: [{stt: 1, ngay: '05/01/2026', bienSo: '92C-11111', soPhieu: 'S-' + ma, kl: 10, noiGiao: 'NM'}], exp: {}});
    if (phase === 'create') {
      const db = store.load(); db.rs = db.rs || {};
      db.rs.smoke1 = {id: 'smoke1', info: {ma: 'SMOKE-1', ten: 'CHỦ RỪNG THỬ NGHIỆM', ngaySinh: '01/01/1970', cccd: '049000000099', ngayCap: '01/01/2021', noiCap: 'CA', diaChi: 'Đà Nẵng', danhXung: 'Ông'}, forests: {f1: mkF('f1', 'R1', 'Thôn A'), f2: mkF('f2', 'R2', 'Thôn B')}, nc: [], dx: [], exp: {}};
      store.save(db);
    }
    const db2 = store.load(), o = (db2.rs || {}).smoke1;
    if (phase === 'upgrade') {
      // Nâng cấp từ v1.0.0: dữ liệu do bản 1.0.0 tạo (tests/fixtures/hakqn_v1_0_0.sqlite) phải còn đủ sau khi cài đè bản mới
      const own = (db2.rs || {}).own1, F = (own && own.forests) || {}, bk = fs.existsSync(store.backupDir) ? fs.readdirSync(store.backupDir) : [];
      r.checks.upOwner = !!own && own.info.ten === 'CHỦ RỪNG CŨ';
      r.checks.upThreeForests = Object.keys(F).length === 3;
      r.checks.upRecords = ['f1', 'f2', 'f3'].map(k => F[k] ? F[k].dx.length + '/' + F[k].pc.length : '').join() === '2/2,2/1,2/3';
      r.checks.upTypedDestination = !!F.f1 && F.f1.exp.vcDiemDen === 'Nhà máy dăm Quảng Nam, KCN Điện Nam – Điện Ngọc' && !F.f1.info.muaHang;   // địa chỉ cũ còn nguyên, chưa tự đổi
      r.checks.upBacSauCu = !!F.f2 && F.f2.info.vanChuyen.mode === 'tanDoan' && F.f2.info.vanChuyen.bac.length === 2;
      r.checks.upBackup = bk.some(f => /^truoc-nang-cap-v2-len-v\d+-/.test(f));
      r.checks.upSchema = store.db.pragma('user_version', {simple: true}) === SCHEMA_VERSION;
      const lk = lookup.status(); r.checks.upLookup = !!lk && JSON.stringify(lk).length > 20;
    } else if (phase === 'upgrade14') {
      // Cài đè từ bản 1.4.0: một chủ hai lô A và B (tests/fixtures/hakqn_v1_4.sqlite) còn đủ dữ liệu sau khi cài bản mới
      const own = (db2.rs || {}).own1, F = (own && own.forests) || {}, A = F.fa || {info: {}, exp: {}}, B = F.fb || {info: {}, exp: {}};
      r.checks.u14Owner = !!own && own.info.ten === 'NGUYỄN VĂN MỘT';
      r.checks.u14Phone = !!own && own.info.sdt === '0905 123 456';
      r.checks.u14Contract = !!own && own.info.soHopDong === 'HD-2026/015' && own.info.ngayKyHopDong === '02/10/2026';
      r.checks.u14TwoLots = Object.keys(F).length === 2;
      r.checks.u14Records = ['fa', 'fb'].map(k => F[k] ? F[k].nc.length + '/' + F[k].dx.length + '/' + F[k].pc.length : '').join() === '3/2/2,3/2/1';
      r.checks.u14Delivery = !!A.info.muaHang && A.info.muaHang.diaChi === 'Cảng dăm Kỳ Hà, Núi Thành, Quảng Nam' && !!B.info.muaHang && B.info.muaHang.diaChi.startsWith('KCN Điện Nam');
      r.checks.u14Freight = A.info.vanChuyen.mode === 'tanKm' && A.info.vanChuyen.donGiaKm === 1000 && A.info.cuLy === 45 && B.info.vanChuyen.mode === 'coDinh' && B.info.vanChuyen.coDinh === 52000;
      r.checks.u14Company = Object.keys(db2.congTy || {}).length === 1;
      r.checks.u14Schema = store.db.pragma('user_version', {simple: true}) === SCHEMA_VERSION;
      const lk = lookup.status(); r.checks.u14Lookup = !!lk && JSON.stringify(lk).length > 20;
      r.checks.ownerInUi = await win.webContents.executeJavaScript("document.getElementById('side').innerText.includes('NGUYỄN VĂN MỘT')");
    } else {
      r.checks.owner = !!o && o.info.ten === 'CHỦ RỪNG THỬ NGHIỆM';
      r.checks.twoForests = !!o && Object.keys(o.forests || {}).length === 2;
      r.checks.forestData = !!o && o.forests.f2.info.diaDiem === 'Thôn B' && o.forests.f1.pc.length === 1;
    }
    await new Promise(res => { if (win.webContents.isLoading()) win.webContents.once('did-finish-load', res); else res(); });
    r.dom = await win.webContents.executeJavaScript(`(async()=>({title: document.title, reportMenu: !!document.querySelector('[data-act=rpOpen]'), lookupMenu: !!document.querySelector('[data-act=lkOpen]'), sideFilter: !!document.getElementById('sideQ'),
      reports: typeof HAKReports === 'object' && HAKReports.REPORTS.length, ownerShown: document.getElementById('side').innerText.includes('CHỦ RỪNG THỬ NGHIỆM'),
      filter: await window.hak.lookup.search('', '', {onlyIssues: true, from: '2026-01-01', sort: 'tan'}).then(x => x.ok && !!x.facets).catch(() => false)}))()`);
    if (app.isPackaged) r.checks.testEnvOff = TEST_ONLY_ENV.every(k => !(k in process.env));   // bản cài: biến môi trường kiểm thử đã bị xóa
    r.checks.reportMenu = r.dom.reportMenu && r.dom.reports >= 5; r.checks.smartFilter = r.dom.sideFilter && r.dom.filter === true; r.checks.lookupMenu = r.dom.lookupMenu === true;
    if (phase === 'upgrade') r.checks.ownerInUi = await win.webContents.executeJavaScript("document.getElementById('side').innerText.includes('CHỦ RỪNG CŨ')"); // giao diện hiện lại chủ rừng cũ
    if (phase === 'verify') r.checks.ownerInUi = r.dom.ownerShown; // sau khi đóng và mở lại, giao diện phải hiện lại chủ rừng đã lưu
  } catch (e) { r.error = e.message; }
  if (autoBkP) { try { await autoBkP; } catch (e) { /* đã ghi vào autoBk */ } }   // không thoát giữa lúc đang tự sao lưu
  r.autoBackup = autoBk;
  r.ok = !r.error && Object.values(r.checks).every(Boolean);
  fs.writeFileSync(out, JSON.stringify(r, null, 2));
  app.exit(r.ok ? 0 : 3);
}

/* CSP cho cửa sổ in phiếu cân: renderer/PhieuCan.html được giữ NGUYÊN BẢN (kiểm thử mã băm tests/phieucan.sha256) nên không chèn thẻ meta;
 * thay vào đó bộ xử lý giao thức file:// của phiên mặc định thêm header Content-Security-Policy cho ĐÚNG file đó (script chỉ chạy theo mã băm
 * tính từ chính file, không tải tài nguyên ngoài). Mọi file khác đi qua nguyên vẹn. Giữ phiên mặc định để công cụ còn đọc được cài đặt
 * đã lưu trong localStorage. HAKQN_PC_CSP_EXTRA (chỉ khi chạy từ mã nguồn): JSON bổ sung chỉ thị, dùng khi rà vi phạm CSP. */
const PC_FILE = path.join(__dirname, '..', 'renderer', 'PhieuCan.html');
let pcCsp = null;
function phieuCanCsp() {
  if (pcCsp) return pcCsp;
  const CSP = require('./csp');
  let extra = {}; if (!app.isPackaged && process.env.HAKQN_PC_CSP_EXTRA) { try { extra = JSON.parse(process.env.HAKQN_PC_CSP_EXTRA); } catch (e) { /* bỏ qua */ } }
  pcCsp = CSP.policy(CSP.scriptHashes(fs.readFileSync(PC_FILE, 'utf8')), extra);   // cùng chính sách chặt như giao diện chính (đã chạy đủ in, tải PDF, khổ giấy: không vi phạm)
  return pcCsp;
}
const samePath = (a, b) => process.platform === 'win32' ? path.resolve(a).toLowerCase() === path.resolve(b).toLowerCase() : path.resolve(a) === path.resolve(b);
function installFileCsp() {
  const {fileURLToPath} = require('url');
  session.defaultSession.protocol.handle('file', async req => {
    const res = await net.fetch(req, {bypassCustomProtocolHandlers: true});
    let p = ''; try { p = fileURLToPath(req.url.split(/[?#]/)[0]); } catch (e) { return res; }
    if (!samePath(p, PC_FILE)) return res;
    const h = new Headers(res.headers); h.set('Content-Security-Policy', phieuCanCsp());
    return new Response(res.body, {status: res.status, statusText: res.statusText, headers: h});
  });
}

/* In phiếu cân: mở NGUYÊN BẢN công cụ renderer/PhieuCan.html (không sửa file) trong cửa sổ riêng, nạp sẵn phiếu cân của rừng bằng ô chọn file của chính công cụ (src/phieucan.js) */
let pcWin = null;
async function openPhieuCan(rows, company) {
  const list = Array.isArray(rows) ? rows.slice(0, 5001).map(r => Array.isArray(r) ? r.slice(0, 40).map(v => (typeof v === 'number' || typeof v === 'string') ? v : '') : []) : [];
  if (!pcWin || pcWin.isDestroyed()) {
    pcWin = new BrowserWindow({width: 1280, height: 860, minWidth: 900, minHeight: 600, title: 'In phiếu cân', autoHideMenuBar: true, backgroundColor: '#f5f2ec',
      webPreferences: {contextIsolation: true, nodeIntegration: false, sandbox: true}});
    pcWin.webContents.setWindowOpenHandler(() => ({action: 'deny'}));
    pcWin.on('closed', () => { pcWin = null; });
  } else { if (pcWin.isMinimized()) pcWin.restore(); pcWin.focus(); }
  const w = pcWin;
  // gỡ cả hai bộ lắng nghe sau khi có kết quả: cửa sổ dùng lại nhiều lần không tích lũy listener (MaxListenersExceededWarning)
  await new Promise((res, rej) => {
    const wc = w.webContents, done = () => { wc.removeListener('did-finish-load', okL); wc.removeListener('did-fail-load', failL); };
    const okL = () => { done(); res(); }, failL = (e, c, d) => { done(); rej(new Error(d)); };
    wc.on('did-finish-load', okL); wc.on('did-fail-load', failL);
    w.loadFile(path.join(__dirname, '..', 'renderer', 'PhieuCan.html')).catch(() => { /* lỗi đã báo qua did-fail-load */ });
  });
  await w.webContents.insertCSS(require('./phieucan').SIMPLE_CSS);
  const co = company && typeof company === 'object' ? Object.fromEntries(['coName', 'coAddr', 'coPhone', 'coFax', 'place'].map(k => [k, typeof company[k] === 'string' ? company[k] : ''])) : {};
  { const r = await w.webContents.executeJavaScript(require('./phieucan').inject(list, co)); if (r !== true) throw new Error('Không nạp được dữ liệu vào công cụ in phiếu cân: ' + r); }
}

function createWindow() {
  win = new BrowserWindow({
    width: 1366, height: 820, minWidth: 1024, minHeight: 640, title: TITLE, backgroundColor: '#f4f6f8',
    webPreferences: {preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false, sandbox: true}
  });
  win.webContents.on('will-navigate', e => e.preventDefault());
  // Tải biểu mẫu/ZIP: hỏi nơi lưu (mặc định thư mục Tải về). Khi kiểm thử tự động: lưu thẳng vào HAKQN_DOWNLOAD_DIR.
  win.webContents.session.on('will-download', (e, item) => {
    const dir = process.env.HAKQN_DOWNLOAD_DIR;
    if (dir) { fs.mkdirSync(dir, {recursive: true}); item.setSavePath(path.join(dir, item.getFilename())); }
    else item.setSaveDialogOptions({title: 'Lưu file', defaultPath: path.join(app.getPath('downloads'), item.getFilename())});
  });
  win.webContents.setWindowOpenHandler(() => ({action: 'deny'}));
  win.on('page-title-updated', e => e.preventDefault());
  /* Đóng ứng dụng khi lô còn thay đổi chưa lưu: Lưu và đóng / Bỏ thay đổi và đóng / Quay lại chỉnh sửa. HAKQN_CLOSE=save|discard|back trả lời sẵn (kiểm thử tự động). */
  let closing = false;
  win.on('close', async e => {
    if (closing) return; e.preventDefault();
    // giao diện treo/không trả lời trong 3 giây: vẫn cho đóng (không kẹt cửa sổ), coi như không có thay đổi để hỏi
    const ask = (js, fallback) => Promise.race([win.webContents.executeJavaScript(js), new Promise(r => setTimeout(() => r(fallback), 3000))]).catch(() => fallback);
    let n = 0; try { n = (await ask('window.__stDirty ? window.__stDirty().length : 0', 0)) || 0; } catch (err) { n = 0; }
    let pick = 1;   // 0 = lưu và đóng, 1 = bỏ thay đổi và đóng (không có gì để hỏi), 2 = quay lại
    if (n > 0) {
      const auto = {save: 0, discard: 1, back: 2}[process.env.HAKQN_CLOSE];
      pick = auto !== undefined ? auto : (await dialog.showMessageBox(win, {type: 'warning', title: TITLE, message: 'Còn thay đổi chưa lưu', detail: 'Lô đang mở có nhân công, xe hoặc phiếu cân chưa lưu. Dữ liệu chưa lưu sẽ mất nếu đóng ngay.', buttons: ['Lưu và đóng', 'Bỏ thay đổi và đóng', 'Quay lại chỉnh sửa'], defaultId: 0, cancelId: 2, noLink: true})).response;
      if (pick === 0) { let r = null; try { r = await Promise.race([win.webContents.executeJavaScript('window.__stSaveCurrent ? window.__stSaveCurrent() : {ok: true}'), new Promise(res => setTimeout(() => res(null), 15000))]); } catch (err) { r = null; } if (!r || !r.ok) pick = 2; }
    }
    if (pick === 2) return;
    closing = true; win.close();
  });
  win.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));
}

if (!app.requestSingleInstanceLock()) app.quit();
else {
  app.on('second-instance', () => { if (win) { if (win.isMinimized()) win.restore(); win.focus(); } });
  app.whenReady().then(() => {
    try { openStore(); } catch (e) { log('ERROR', e.message); dialog.showErrorBox(TITLE, 'Không khởi động được: ' + e.message); app.quit(); return; }   // vị trí dữ liệu không mở được: không thoát, màn hình chính hiện thông báo và cho thử lại/chọn khác
    Menu.setApplicationMenu(Menu.buildFromTemplate([
      {label: 'Tệp', submenu: [{label: 'Mở thư mục dữ liệu', click: () => shell.showItemInFolder(loc.dbFile)}, {type: 'separator'}, {role: 'quit', label: 'Thoát'}]},
      {label: 'Xem', submenu: [{role: 'zoomIn', label: 'Phóng to'}, {role: 'zoomOut', label: 'Thu nhỏ'}, {role: 'resetZoom', label: 'Cỡ chữ mặc định'}, {role: 'togglefullscreen', label: 'Toàn màn hình'}]}
    ]));
    try { installFileCsp(); } catch (e) { log('ERROR', 'Không đặt được CSP cho cửa sổ in phiếu cân: ' + e.message); }
    registerIpc(); createWindow();
    if (process.env.HAKQN_SMOKE) setTimeout(() => smoke().catch(() => app.exit(4)), 1500);
  });
  app.on('window-all-closed', () => { if (store) { try { store.close(); } catch (e) {} } app.quit(); });
}
