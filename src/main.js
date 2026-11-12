'use strict';
const {app, BrowserWindow, ipcMain, dialog, Menu, shell, net} = require('electron');
const path = require('path');
const fs = require('fs');
const {Store, SCHEMA_VERSION} = require('./store');
const {Lookup} = require('./lookup');

const SHEET_ID = '1QD_VeaUgR0_unMb7NzLykFqvGGgUUrWPvSeaff_OPVc';
const DEFAULT_SHEET = 'https://docs.google.com/spreadsheets/d/' + SHEET_ID + '/edit?usp=sharing';
let lookup = null;
/* Link chia sẻ -> link tải .xlsx chỉ đọc (bảng tính để chế độ "Ai có liên kết đều xem được", không cần đăng nhập) */
function exportUrl(link) {
  if (process.env.HAKQN_SHEET_URL) return process.env.HAKQN_SHEET_URL;
  const m = /\/spreadsheets\/d\/([A-Za-z0-9_-]+)/.exec(link || '');
  return m ? 'https://docs.google.com/spreadsheets/d/' + m[1] + '/export?format=xlsx' : null;
}
async function syncSheets() {
  const link = lookup.getMeta('sheetUrl') || DEFAULT_SHEET, url = exportUrl(link);
  if (!url) return lookup.failAttempt('google', link, 'Liên kết Google Sheets không hợp lệ');
  const ctl = new AbortController(), timer = setTimeout(() => ctl.abort(), 45000);
  try {
    const res = await net.fetch(url, {signal: ctl.signal, redirect: 'follow'});
    if (!res.ok) return lookup.failAttempt('google', link, 'Máy chủ trả lỗi HTTP ' + res.status + (res.status === 401 || res.status === 403 || res.status === 404 ? ' (bảng tính chưa để "Ai có liên kết đều xem được" hoặc sai liên kết)' : ''));
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.slice(0, 2).toString() !== 'PK') return lookup.failAttempt('google', link, 'Nội dung tải về không phải bảng tính (có thể bảng tính yêu cầu đăng nhập). Bản tra cứu cũ vẫn được dùng.');
    return lookup.load(buf, 'google', link);
  } catch (e) {
    return lookup.failAttempt('google', link, (e.name === 'AbortError' ? 'Hết thời gian chờ kết nối' : 'Không kết nối được (' + e.message + ')') + '. Bản tra cứu cũ vẫn được dùng.');
  } finally { clearTimeout(timer); }
}

const TITLE = 'HAKQN – Hồ sơ khai thác và vận chuyển gỗ keo';
let store = null, win = null;

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
  store = new Store(process.env.HAKQN_DB || path.join(dir, 'hakqn.sqlite'), {log});
  lookup = new Lookup(store);
}

function wrap(fn) { return (...a) => { try { return {ok: true, ...fn(...a)}; } catch (e) { log('ERROR', e.message); return {ok: false, error: e.message}; } }; }

function registerIpc() {
  ipcMain.on('db:load', e => {
    try { e.returnValue = {ok: true, db: store.load(), file: store.file, schema: SCHEMA_VERSION, version: app.getVersion()}; }
    catch (err) { log('ERROR', err.message); e.returnValue = {ok: false, error: err.message}; }
  });
  ipcMain.handle('db:save', (e, db) => wrap(() => store.save(db))());
  ipcMain.handle('import:preview', (e, db) => wrap(() => store.previewImport(db))());
  ipcMain.handle('import:apply', (e, db, strategy) => wrap(() => ({...store.applyImport(db, strategy), db: store.load()}))());
  ipcMain.handle('backup:to', async () => {
    try {
      const r = await dialog.showOpenDialog(win, {title: 'Chọn thư mục lưu bản sao lưu', properties: ['openDirectory', 'createDirectory']});
      if (r.canceled || !r.filePaths[0]) return {ok: true, canceled: true};
      const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const jsonFile = path.join(r.filePaths[0], 'HoSoKhaiThac_SaoLuu_' + stamp + '.json');
      const sqlFile = path.join(r.filePaths[0], 'HoSoKhaiThac_SaoLuu_' + stamp + '.sqlite');
      fs.writeFileSync(jsonFile, JSON.stringify(store.load(), null, 2));
      await store.db.backup(sqlFile);
      return {ok: true, jsonFile, sqlFile};
    } catch (e) { log('ERROR', e.message); return {ok: false, error: e.message}; }
  });
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
  ipcMain.handle('lookup:search', (e, q, tab, opts) => wrap(() => lookup.search(q || '', tab || '', opts || {}))());
  ipcMain.handle('lookup:candidates', (e, tab, row) => { try { return lookup.candidates(tab, row); } catch (err) { log('ERROR', err.message); return {ok: false, error: err.message}; } });
  ipcMain.handle('lookup:build', (e, cccd, hd) => wrap(() => lookup.build(cccd, hd, ''))());
  ipcMain.handle('app:openData', () => { shell.showItemInFolder(store.file); return {ok: true}; });
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
  });
  app.on('window-all-closed', () => { if (store) { try { store.close(); } catch (e) {} } app.quit(); });
}
