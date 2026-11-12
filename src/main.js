'use strict';
const {app, BrowserWindow, ipcMain, dialog, Menu, shell, net, safeStorage} = require('electron');
const path = require('path');
const fs = require('fs');
const {Store, SCHEMA_VERSION} = require('./store');
const {Lookup} = require('./lookup');
const LoRung = require('./lorung');
const Settings = require('./settings');
const {GoogleAuth, fileIdOf} = require('./google-auth');

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
      try { return lookup.load(await gauth.exportXlsx(fileIdOf(link), ctl.signal), 'google', link + ' (tài khoản Google)'); }
      catch (e) { apiErr = e; if (e.code === 'network' || e.code === 'timeout') return fail(e.message); }
    }
    try { return lookup.load(await fetchPublic(url, ctl.signal), 'google', link); }
    catch (e) {
      const why = e.name === 'AbortError' ? 'Hết thời gian chờ kết nối' : e.http ? e.message : 'Không kết nối được (' + e.message + ')';
      return fail(apiErr ? 'Đăng nhập Google: ' + apiErr.message + ' · Liên kết công khai: ' + why : why);
    }
  } finally { clearTimeout(timer); }
}

const TITLE = 'HAKQN – Hồ sơ khai thác và vận chuyển gỗ keo';
let store = null, win = null, loc = null;

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
  loc = Settings.resolve(dir, process.env);
  fs.mkdirSync(path.dirname(loc.dbFile), {recursive: true});
  store = new Store(loc.dbFile, {log, backupDir: loc.backupDir});
  loc.missing.forEach(m => log('WARN', 'Thư mục cài đặt không còn: ' + m + ', dùng mặc định'));
  lookup = new Lookup(store);
  gauth = new GoogleAuth({dir: app.getPath('userData'), fetch: (u, o) => net.fetch(u, o), openExternal: u => shell.openExternal(u), safeStorage});
}

function wrap(fn) { return (...a) => { try { return {ok: true, ...fn(...a)}; } catch (e) { log('ERROR', e.message); return {ok: false, error: e.message}; } }; }

function registerIpc() {
  ipcMain.on('db:load', e => {
    try { e.returnValue = {ok: true, db: store.load(), file: store.file, schema: SCHEMA_VERSION, version: app.getVersion()}; }
    catch (err) { log('ERROR', err.message); e.returnValue = {ok: false, error: err.message}; }
  });
  ipcMain.handle('db:save', (e, db) => wrap(() => store.save(db))());
  ipcMain.handle('import:preview', (e, db, opts) => wrap(() => store.previewImport(db, opts))());
  ipcMain.handle('import:apply', (e, db, strategy, opts) => wrap(() => ({...store.applyImport(db, strategy, opts), db: store.load()}))());
  ipcMain.handle('backup:to', async () => {
    try {
      let outDir;
      if (loc.customBackup) outDir = Settings.checkFolder(loc.backupDir);   // đã chọn thư mục sao lưu ở Cài đặt hệ thống: lưu thẳng vào đó
      else {
        const r = await dialog.showOpenDialog(win, {title: 'Chọn thư mục lưu bản sao lưu', defaultPath: loc.backupDir, properties: ['openDirectory', 'createDirectory']});
        if (r.canceled || !r.filePaths[0]) return {ok: true, canceled: true};
        outDir = r.filePaths[0];
      }
      const r = {filePaths: [outDir]};
      const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const jsonFile = path.join(r.filePaths[0], 'HoSoKhaiThac_SaoLuu_' + stamp + '.json');
      const sqlFile = path.join(r.filePaths[0], 'HoSoKhaiThac_SaoLuu_' + stamp + '.sqlite');
      fs.writeFileSync(jsonFile, JSON.stringify(store.load(), null, 2));
      await store.db.backup(sqlFile);
      try { const ud = app.getPath('userData'); Settings.save(ud, {...Settings.load(ud), lastBackup: new Date().toISOString()}); } catch (er) { log('WARN', 'Không ghi được ngày sao lưu: ' + er.message); }
      return {ok: true, jsonFile, sqlFile};
    } catch (e) { log('ERROR', e.message); return {ok: false, error: e.message}; }
  });
  /* Sao lưu / khôi phục MỘT lô rừng: chạy hoàn toàn trên máy, không cần mạng. Khi kiểm thử tự động: HAKQN_LOT_DIR (thư mục lưu) và HAKQN_LOT_FILE (file mở) thay cho hộp thoại. */
  const sha = txt => require('crypto').createHash('sha256').update(txt).digest('hex');
  ipcMain.handle('lot:save', async (e, pkg) => {
    try {
      const sealed = LoRung.seal(LoRung.parsePackage(pkg).pkg || (() => { throw new Error('Dữ liệu lô không hợp lệ.'); })(), sha), name = LoRung.fileName(sealed);
      let file = process.env.HAKQN_LOT_DIR ? path.join(process.env.HAKQN_LOT_DIR, name) : null;
      if (!file) {
        const r = await dialog.showSaveDialog(win, {title: 'Lưu sao lưu lô rừng', defaultPath: path.join(loc.customBackup ? loc.backupDir : app.getPath('documents'), name), filters: [{name: 'Sao lưu lô rừng HAKQN', extensions: ['json']}]});
        if (r.canceled || !r.filePath) return {ok: true, canceled: true};
        file = r.filePath;
      }
      fs.mkdirSync(path.dirname(file), {recursive: true});
      fs.writeFileSync(file, JSON.stringify(sealed, null, 2));
      return {ok: true, file};
    } catch (err) { log('ERROR', err.message); return {ok: false, error: err.message}; }
  });
  ipcMain.handle('lot:open', async (e, filePath) => {
    try {
      let p = filePath || process.env.HAKQN_LOT_FILE;
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
  ipcMain.handle('lot:apply', (e, pkg, action) => wrap(() => {
    const parsed = LoRung.parsePackage(pkg, sha); if (!parsed.ok) throw new Error(parsed.error);
    return {...store.applyLot(parsed.pkg, action), db: store.load()};
  })());
  ipcMain.handle('lookup:status', () => wrap(() => ({...lookup.status(), sheetUrl: lookup.getMeta('sheetUrl') || DEFAULT_SHEET}))());
  ipcMain.handle('lookup:setSheet', (e, link) => wrap(() => { if (!exportUrl(link)) throw new Error('Liên kết không phải Google Sheets'); lookup.setMeta('sheetUrl', link); return {}; })());
  ipcMain.handle('lookup:sync', async () => { try { return await syncSheets(); } catch (e) { log('ERROR', e.message); return {ok: false, errors: [e.message]}; } });
  ipcMain.handle('lookup:importExcel', async (e, filePath) => {
    try {
      let p = filePath;
      if (!p) {
        const r = await dialog.showOpenDialog(win, {title: 'Chọn file Excel tra cứu (HoSoKeo_QC.xlsx)', filters: [{name: 'Excel', extensions: ['xlsx', 'xlsm', 'xls']}], properties: ['openFile']});
        if (r.canceled || !r.filePaths[0]) return {ok: true, canceled: true};
        p = r.filePaths[0];
      }
      return lookup.load(fs.readFileSync(p), 'excel', path.basename(p));
    } catch (err) { log('ERROR', err.message); return {ok: false, errors: [err.message]}; }
  });
  ipcMain.handle('google:status', () => gauth.status());
  ipcMain.handle('google:login', async () => { try { return {ok: true, status: await gauth.login()}; } catch (e) { log('ERROR', 'google login: ' + e.code); return {ok: false, code: e.code, error: e.message, status: gauth.status()}; } });
  ipcMain.handle('google:logout', () => ({ok: true, status: gauth.logout()}));
  ipcMain.handle('lookup:search', (e, q, tab, opts) => wrap(() => lookup.search(q || '', tab || '', opts || {}))());
  ipcMain.handle('lookup:candidates', (e, tab, row) => { try { return lookup.candidates(tab, row); } catch (err) { log('ERROR', err.message); return {ok: false, error: err.message}; } });
  ipcMain.handle('lookup:build', (e, cccd, hd) => wrap(() => lookup.build(cccd, hd, ''))());
  /* ===== Cài đặt hệ thống: thư mục dữ liệu, thư mục sao lưu. Kiểm thử tự động: HAKQN_PICK_DIR (thư mục chọn) và HAKQN_PICK_CHOICE ('use' | 'overwrite') thay cho hộp thoại. ===== */
  const remind = () => { const ud = app.getPath('userData'), st = Settings.load(ud); let first = NaN; try { first = fs.statSync(loc.dbFile).birthtimeMs || fs.statSync(loc.dbFile).ctimeMs; } catch (er) { /* chưa có file */ } return {remindDays: st.remindDays, lastBackup: st.lastBackup, ...Settings.backupDue(st, Date.now(), first)}; };
  const setView = () => ({remind: remind(), dbFile: loc.dbFile, dataDir: loc.dataDir, defaultDataDir: loc.defaultDataDir, customData: loc.customData, backupDir: loc.backupDir, defaultBackupDir: loc.defaultBackupDir, customBackup: loc.customBackup, lockedByEnv: loc.lockedByEnv, missing: loc.missing});
  const pickFolder = async title => {
    if (process.env.HAKQN_PICK_DIR) return process.env.HAKQN_PICK_DIR;
    const r = await dialog.showOpenDialog(win, {title, properties: ['openDirectory', 'createDirectory']});
    return r.canceled || !r.filePaths[0] ? '' : r.filePaths[0];
  };
  ipcMain.handle('settings:get', () => wrap(() => ({settings: setView()}))());
  ipcMain.handle('settings:setRemind', (e, days) => wrap(() => { const ud = app.getPath('userData'); const d = Math.max(0, Math.min(365, parseInt(days, 10) || 0)); Settings.save(ud, {...Settings.load(ud), remindDays: d}); return {settings: setView()}; })());
  ipcMain.handle('settings:openBackup', () => { try { fs.mkdirSync(loc.backupDir, {recursive: true}); shell.openPath(loc.backupDir); return {ok: true}; } catch (e) { return {ok: false, error: e.message}; } });
  ipcMain.handle('settings:setBackup', async (e, reset) => {
    try {
      let dir = '';
      if (!reset) { dir = await pickFolder('Chọn thư mục lưu bản sao lưu'); if (!dir) return {ok: true, canceled: true}; dir = Settings.checkFolder(dir); }
      const cur = Settings.load(app.getPath('userData')); Settings.save(app.getPath('userData'), {...cur, backupDir: dir});
      loc = Settings.resolve(app.getPath('userData'), process.env); store.backupDir = loc.backupDir;
      log('INFO', 'Đổi thư mục sao lưu: ' + (reset ? 'mặc định' : 'thư mục riêng'));
      return {ok: true, settings: setView()};
    } catch (err) { log('ERROR', err.message); return {ok: false, error: err.message}; }
  });
  /* Đổi thư mục dữ liệu: sao chép trọn vẹn cơ sở dữ liệu sang thư mục mới (không xóa bản cũ), rồi mở lại từ vị trí mới.
   * Thư mục mới đã có dữ liệu: người dùng chọn dùng dữ liệu có sẵn đó hoặc ghi đè (bản đang có ở đó được lưu lại trước). */
  ipcMain.handle('settings:setData', async (e, reset) => {
    try {
      if (loc.lockedByEnv) throw new Error('Vị trí dữ liệu đang được cố định bởi biến môi trường HAKQN_DB; không đổi được trong ứng dụng.');
      const userDir = app.getPath('userData');
      let dir = loc.defaultDataDir;
      if (!reset) { dir = await pickFolder('Chọn thư mục lưu dữ liệu'); if (!dir) return {ok: true, canceled: true}; }
      dir = Settings.checkFolder(dir);
      const target = path.join(dir, Settings.DB_NAME);
      let used = 0; for (const x of ['', '-wal']) try { used += fs.statSync(loc.dbFile + x).size; } catch (er) { /* không có */ }
      Settings.checkSpace(dir, used);
      if (path.resolve(target) === path.resolve(loc.dbFile)) return {ok: true, same: true, settings: setView()};
      let choice = 'copy';
      if (fs.existsSync(target)) {
        choice = process.env.HAKQN_PICK_CHOICE;
        if (!choice) {
          const m = await dialog.showMessageBox(win, {type: 'question', title: TITLE, message: 'Thư mục này đã có dữ liệu HAKQN.', detail: target + '\n\nDùng dữ liệu có sẵn trong thư mục đó, hay ghi đè bằng dữ liệu đang dùng? (Khi ghi đè, bản có sẵn được lưu lại trong thư mục sao lưu.)', buttons: ['Dùng dữ liệu có sẵn', 'Ghi đè bằng dữ liệu đang dùng', 'Hủy'], defaultId: 2, cancelId: 2});
          choice = ['use', 'overwrite'][m.response];
        }
        if (!choice) return {ok: true, canceled: true};
      }
      if (choice === 'overwrite') { fs.mkdirSync(loc.backupDir, {recursive: true}); fs.copyFileSync(target, path.join(loc.backupDir, 'truoc-ghi-de-' + new Date().toISOString().replace(/[:.]/g, '-') + '.sqlite')); for (const x of ['-wal', '-shm']) try { fs.unlinkSync(target + x); } catch (er) { /* không có */ } fs.unlinkSync(target); }
      if (choice === 'copy' || choice === 'overwrite') await store.db.backup(target);   // sao chép nhất quán, kể cả khi đang mở
      const from = loc.dbFile;
      Settings.save(userDir, {...Settings.load(userDir), dataDir: reset ? '' : dir});
      try { store.db.close(); } catch (er) { /* đã đóng */ }
      openStore();
      if (win && !win.isDestroyed()) win.webContents.reload();
      log('INFO', 'Đổi thư mục dữ liệu (' + choice + ')');
      return {ok: true, choice, from, settings: setView()};
    } catch (err) { log('ERROR', err.message); return {ok: false, error: err.message}; }
  });
  ipcMain.handle('app:openData', () => { shell.showItemInFolder(store.file); return {ok: true}; });
}

/* Kiểm tra khói cho bản đã cài (dùng trong CI và khi nghiệm thu): HAKQN_SMOKE=<file kết quả>, HAKQN_SMOKE_PHASE=create|verify|upgrade|upgrade14 (upgrade: mở dữ liệu do bản 1.0.0 tạo; upgrade14: một chủ hai lô của bản 1.4.x).
 * create: ghi 1 chủ rừng có 2 rừng; verify: đọc lại sau khi đóng/mở app. Cả hai kiểm tra giao diện có bộ lọc mới và menu Báo cáo. */
async function smoke() {
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
    r.checks.reportMenu = r.dom.reportMenu && r.dom.reports >= 5; r.checks.smartFilter = r.dom.sideFilter && r.dom.filter === true; r.checks.lookupMenu = r.dom.lookupMenu === true;
    if (phase === 'upgrade') r.checks.ownerInUi = await win.webContents.executeJavaScript("document.getElementById('side').innerText.includes('CHỦ RỪNG CŨ')"); // giao diện hiện lại chủ rừng cũ
    if (phase === 'verify') r.checks.ownerInUi = r.dom.ownerShown; // sau khi đóng và mở lại, giao diện phải hiện lại chủ rừng đã lưu
  } catch (e) { r.error = e.message; }
  r.ok = !r.error && Object.values(r.checks).every(Boolean);
  fs.writeFileSync(out, JSON.stringify(r, null, 2));
  app.exit(r.ok ? 0 : 3);
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
  win.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));
}

if (!app.requestSingleInstanceLock()) app.quit();
else {
  app.on('second-instance', () => { if (win) { if (win.isMinimized()) win.restore(); win.focus(); } });
  app.whenReady().then(() => {
    try { openStore(); } catch (e) { log('ERROR', e.message); dialog.showErrorBox(TITLE, 'Không mở được cơ sở dữ liệu: ' + e.message); app.quit(); return; }
    Menu.setApplicationMenu(Menu.buildFromTemplate([
      {label: 'Tệp', submenu: [{label: 'Mở thư mục dữ liệu', click: () => shell.showItemInFolder(store.file)}, {type: 'separator'}, {role: 'quit', label: 'Thoát'}]},
      {label: 'Xem', submenu: [{role: 'zoomIn', label: 'Phóng to'}, {role: 'zoomOut', label: 'Thu nhỏ'}, {role: 'resetZoom', label: 'Cỡ chữ mặc định'}, {role: 'togglefullscreen', label: 'Toàn màn hình'}]}
    ]));
    registerIpc(); createWindow();
    if (process.env.HAKQN_SMOKE) setTimeout(() => smoke().catch(() => app.exit(4)), 1500);
  });
  app.on('window-all-closed', () => { if (store) { try { store.close(); } catch (e) {} } app.quit(); });
}
