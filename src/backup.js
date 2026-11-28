'use strict';
/* Sao lưu toàn bộ (JSON + SQLite) và ghi file JSON an toàn (sao lưu lô). Không phụ thuộc Electron.
 *
 * Nguyên tắc:
 *  - Mỗi file ghi vào tên tạm, đọc lại để kiểm tra, rồi mới đổi tên thành tên chính thức; không bao giờ ghi đè bản sao lưu có sẵn
 *    (trùng tên thì thêm _2, _3…, kể cả khi bấm hai lần liên tiếp trong cùng một giây).
 *  - "Sao lưu toàn bộ" chỉ thành công khi CẢ HAI file đã ghi và qua kiểm tra. Lỗi một file: báo file nào dùng được, dọn file tạm.
 *  - io (mặc định fs) và hooks cho phép kiểm thử lỗi giả lập (hết dung lượng, mất kết nối giữa chừng). */
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const Settings = require('./settings');
const DM = require('./datamove');

const sha = t => crypto.createHash('sha256').update(t).digest('hex');
const pad = (n, w = 2) => String(n).padStart(w, '0');
function stampOf(d) { return d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) + '-' + pad(d.getHours()) + pad(d.getMinutes()) + pad(d.getSeconds()) + '-' + pad(d.getMilliseconds(), 3); }

/* Kiểm tra tên cuối cùng, kể cả bí danh hệ thống tệp trỏ vào SQLite đang mở. */
function backupDestination(file, liveFile) {
  const target = /\.(?:json|sqlite)$/i.test(file) ? file : file + '.sqlite';
  const key = p => process.platform === 'win32' ? path.resolve(p).toLowerCase() : path.resolve(p);
  const deny = () => { throw new Error('Không thể ghi đè lên chính cơ sở dữ liệu đang mở. Hãy chọn tên hoặc thư mục khác.'); };
  if (key(target) === key(liveFile)) deny();
  let dst;
  try { dst = fs.statSync(target, {bigint: true}); }
  catch (e) { if (e.code === 'ENOENT') return target; throw e; }
  const src = fs.statSync(liveFile, {bigint: true});
  if (dst.ino !== 0n && dst.ino === src.ino && dst.dev === src.dev) deny();
  return target;
}

function uniqueBase(dir, base, exts, io) {
  for (let n = 0; n < 1000; n++) {
    const b = base + (n ? '_' + (n + 1) : '');
    if (exts.every(e => !io.existsSync(path.join(dir, b + e)))) return b;
  }
  throw new Error('Không tạo được tên file sao lưu duy nhất trong ' + dir);
}

/* Ghi text vào file qua tên tạm: ghi, đọc lại so sánh, (verify tùy chọn), đổi tên. Lỗi thì xóa file tạm và ném lỗi tiếng Việt. */
function writeFileVerified(file, text, io, verify, replace = false) {
  const tmp = file + '.tmp-' + process.pid;
  try {
    io.writeFileSync(tmp, text);
    const back = io.readFileSync(tmp, 'utf8');
    if (back.length !== text.length || sha(back) !== sha(text)) throw new Error('nội dung ghi ra không khớp bản gốc');
    if (verify) verify(back);
    if (!replace && io.existsSync(file)) throw new Error('file đã tồn tại (không ghi đè)');
    io.renameSync(tmp, file);
    return file;
  } catch (e) {
    try { io.unlinkSync(tmp); } catch (er) { /* chưa tạo */ }
    const err = new Error(Settings.describeError(e, file));
    err.code = e.code; err.described = true; throw err;
  }
}

/* BK-01: chép file đã sao lưu sang thư mục thứ hai qua tệp tạm .tmp-<pid> rồi đổi tên (không ghi đè). Trả {skipped} | {ok, dir, files, error}. Không bao giờ ném lỗi. */
function chepSangOThuHai(dir2, parts, io) {
  const list = (parts || []).filter(p => p && p.ok && p.file);
  if (!dir2 || !list.length) return {ok: true, skipped: true, dir: dir2 || '', files: [], error: ''};
  const out = {ok: true, skipped: false, dir: dir2, files: [], error: ''};
  try { (io.mkdirSync || fs.mkdirSync)(dir2, {recursive: true}); } catch (e) { return {ok: false, skipped: false, dir: dir2, files: [], error: Settings.describeError(e, dir2)}; }
  for (const p of list) {
    if (path.resolve(path.dirname(p.file)) === path.resolve(dir2)) continue;   // ổ thứ hai trùng thư mục chính: bản đã nằm sẵn ở đó
    const to = path.join(dir2, path.basename(p.file)), tmp = to + '.tmp-' + process.pid;
    try {
      if (io.existsSync(to)) throw new Error('file đã tồn tại ở thư mục thứ hai (không ghi đè)');
      (io.copyFileSync || fs.copyFileSync)(p.file, tmp); io.renameSync(tmp, to); out.files.push(to);
    } catch (e) {
      try { io.unlinkSync(tmp); } catch (er) { /* chưa tạo */ }
      out.ok = false; out.error += (out.error ? '; ' : '') + path.basename(p.file) + ': ' + Settings.describeError(e, to);
    }
  }
  return out;
}

/* Sao lưu toàn bộ. o = {db (better-sqlite3), data (đối tượng JSON), outDir, outDir2 (thư mục thứ hai, tùy chọn), dbBytes, now, io, hooks}
 * Trả {ok, json: {ok, file, error}, sqlite: {ok, file, error}, message}. ok=true chỉ khi cả hai file dùng được. */
async function backupAll(o) {
  const io = o.io || fs, hooks = o.hooks || {}, now = (o.now || (() => new Date()))();
  const res = {ok: false, json: {ok: false, file: '', error: ''}, sqlite: {ok: false, file: '', error: ''}, message: ''};
  const folder = (dir, label) => {
    try {
      if (o.createDirs) fs.mkdirSync(dir, {recursive: true});
      return Settings.checkFolder(dir);
    } catch (e) {
      throw new Error('Thư mục sao lưu ' + label + ' không dùng được. ' + Settings.describeError(e, dir));
    }
  };
  const base = 'HoSoKhaiThac_SaoLuu_' + stampOf(now);
  let jsonFile = '', sqlFile = '';
  // Mỗi định dạng kiểm tra thư mục, dung lượng và dữ liệu nguồn riêng.
  try {
    const dir = folder(o.outDirJson || o.outDir, 'JSON');
    const data = typeof o.data === 'function' ? o.data() : o.data;
    const text = JSON.stringify(data, null, 2);
    Settings.checkFree(dir, Buffer.byteLength(text), hooks.freeBytes, 'Ổ chứa bản sao lưu JSON');
    jsonFile = path.join(dir, uniqueBase(dir, base, ['.json', '.sqlite'], io) + '.json');
    if (hooks.beforeJson) hooks.beforeJson();
    writeFileVerified(jsonFile, text, io, t => { const j = JSON.parse(t); if (!j || typeof j !== 'object' || !j.rs) throw new Error('JSON sao lưu thiếu dữ liệu hồ sơ');
      if (Array.isArray(data.goiLichSu) && (!Array.isArray(j.goiLichSu) || j.goiLichSu.length !== data.goiLichSu.length)) throw new Error('JSON sao lưu thiếu bản chụp chốt'); });   // phiếu #11
    res.json = {ok: true, file: jsonFile, error: ''};
  } catch (e) { res.json = {ok: false, file: jsonFile, error: e.described ? e.message : Settings.describeError(e, jsonFile || o.outDirJson || o.outDir)}; }
  // 2. SQLite
  let sqlTmp = '';
  try {
    const dir = folder(o.outDir, 'SQLite');
    const dbBytes = typeof o.dbBytes === 'function' ? o.dbBytes() : o.dbBytes;
    Settings.checkFree(dir, dbBytes || 0, hooks.freeBytes, 'Ổ chứa bản sao lưu SQLite');
    const stem = jsonFile ? path.basename(jsonFile, '.json') : base;
    sqlFile = path.join(dir, uniqueBase(dir, stem, ['.sqlite'], io) + '.sqlite');
    sqlTmp = sqlFile + '.tmp-' + process.pid;
    if (hooks.beforeSqlite) hooks.beforeSqlite();
    const fp = DM.fingerprint(o.db);
    await o.db.backup(sqlTmp);
    if (hooks.afterSqliteCopy) hooks.afterSqliteCopy(sqlTmp);
    const fpAfter = DM.fingerprint(o.db);
    const bi = DM.inspect(sqlTmp, undefined, {cleanSidecars: true});
    if (!bi.ok) throw new Error('file SQLite sao lưu không qua kiểm tra (' + bi.error + ')');
    const khopTruoc = JSON.stringify(bi.counts) === JSON.stringify(fp.counts) && bi.version === fp.version;
    const khopSau = JSON.stringify(bi.counts) === JSON.stringify(fpAfter.counts) && bi.version === fpAfter.version;
    if (!khopTruoc && !khopSau) throw new Error('file SQLite sao lưu không khớp số bản ghi của dữ liệu gốc');
    if (io.existsSync(sqlFile)) throw new Error('file đã tồn tại (không ghi đè)');
    io.renameSync(sqlTmp, sqlFile);
    res.sqlite = {ok: true, file: sqlFile, error: ''};
    /* lô 6 (T-08): nếu có thao tác lưu chen vào giữa lúc db.backup đang chạy, đồng bộ lại file .json từ chính bản .sqlite vừa sao lưu để hai file cùng một mốc */
    if (!khopTruoc && khopSau && res.json.ok) {
      try {
        const KSL = require('./khosaoluu'), snap = KSL.docBanSqlite(sqlFile);
        const snapData = Object.assign({}, snap.data, snap.goi && snap.goi.length ? {goiLichSu: snap.goi} : {});
        writeFileVerified(jsonFile, JSON.stringify(snapData, null, 2), io, undefined, true);
      } catch (_) { /* giữ nguyên bản JSON đã ghi */ }
    }
  } catch (e) {
    if (sqlTmp) for (const x of ['', '-wal', '-shm', '-journal']) { try { io.unlinkSync(sqlTmp + x); } catch (er) { /* không có */ } }
    res.sqlite = {ok: false, file: sqlFile, error: Settings.describeError(e, sqlFile || o.outDir)};
  }
  res.ok = res.json.ok && res.sqlite.ok;
  /* BK-01: có thư mục sao lưu thứ hai (USB/ổ ngoài) thì chép các file đã qua kiểm tra sang đó. Lỗi ổ thứ hai KHÔNG làm hỏng kết quả chính, chỉ báo riêng. */
  res.copy2 = chepSangOThuHai(o.outDir2, [res.json, res.sqlite], io);
  if (res.ok) res.message = 'Đã sao lưu: ' + jsonFile + ' và ' + sqlFile + (res.copy2.skipped ? '' : res.copy2.ok ? '. Đã chép thêm sang thư mục thứ hai: ' + res.copy2.dir : '. CẢNH BÁO: chưa chép được sang thư mục thứ hai (' + res.copy2.error + '); bản sao lưu chính vẫn đầy đủ.');
  else {
    const usable = [res.json.ok ? 'JSON (' + jsonFile + ')' : '', res.sqlite.ok ? 'SQLite (' + sqlFile + ')' : ''].filter(Boolean);
    res.message = 'Sao lưu KHÔNG đầy đủ. ' + (res.json.ok ? '' : 'Lỗi file JSON: ' + res.json.error + '. ') + (res.sqlite.ok ? '' : 'Lỗi file SQLite: ' + res.sqlite.error + '. ') +
      (usable.length ? 'File dùng được: ' + usable.join('; ') + '. ' : 'Không có file nào dùng được. ') + 'Kiểm tra kết nối ổ, quyền ghi và dung lượng của thư mục bị lỗi, hoặc chọn thư mục khác rồi sao lưu lại.';
  }
  return res;
}

/* Sao lưu một lô: ghi file JSON qua tên tạm + đọc lại + kiểm tra gói lô; không ghi đè file có sẵn khi tự chọn tên (unique=true). */
function saveLotFile(o) {
  const io = o.io || fs;
  let file = o.file;
  if (o.unique) {
    const dir = path.dirname(file), ext = path.extname(file), base = path.basename(file, ext);
    file = path.join(dir, uniqueBase(dir, base, [ext], io) + ext);
  }
  io.mkdirSync ? io.mkdirSync(path.dirname(file), {recursive: true}) : fs.mkdirSync(path.dirname(file), {recursive: true});
  const tmp = file + '.tmp-' + process.pid;
  try {
    io.writeFileSync(tmp, o.text);
    const back = io.readFileSync(tmp, 'utf8');
    if (back.length !== o.text.length || sha(back) !== sha(o.text)) throw new Error('nội dung ghi ra không khớp bản gốc');
    if (o.verify) o.verify(back);
    io.renameSync(tmp, file);   // chọn qua hộp thoại Lưu: hệ điều hành đã hỏi ghi đè
    return file;
  } catch (e) {
    try { io.unlinkSync(tmp); } catch (er) { /* chưa tạo */ }
    throw new Error(Settings.describeError(e, file));
  }
}

module.exports = {backupDestination, backupAll, saveLotFile, writeFileVerified, stampOf};
