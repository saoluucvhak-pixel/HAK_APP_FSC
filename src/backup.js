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

function uniqueBase(dir, base, exts, io) {
  for (let n = 0; n < 1000; n++) {
    const b = base + (n ? '_' + (n + 1) : '');
    if (exts.every(e => !io.existsSync(path.join(dir, b + e)))) return b;
  }
  throw new Error('Không tạo được tên file sao lưu duy nhất trong ' + dir);
}

/* Ghi text vào file qua tên tạm: ghi, đọc lại so sánh, (verify tùy chọn), đổi tên. Lỗi thì xóa file tạm và ném lỗi tiếng Việt. */
function writeFileVerified(file, text, io, verify) {
  const tmp = file + '.tmp-' + process.pid;
  try {
    io.writeFileSync(tmp, text);
    const back = io.readFileSync(tmp, 'utf8');
    if (back.length !== text.length || sha(back) !== sha(text)) throw new Error('nội dung ghi ra không khớp bản gốc');
    if (verify) verify(back);
    if (io.existsSync(file)) throw new Error('file đã tồn tại (không ghi đè)');
    io.renameSync(tmp, file);
    return file;
  } catch (e) {
    try { io.unlinkSync(tmp); } catch (er) { /* chưa tạo */ }
    const err = new Error(Settings.describeError(e, file));
    err.code = e.code; err.described = true; throw err;
  }
}

/* Sao lưu toàn bộ. o = {db (better-sqlite3), data (đối tượng JSON), outDir, dbBytes, now, io, hooks}
 * Trả {ok, json: {ok, file, error}, sqlite: {ok, file, error}, message}. ok=true chỉ khi cả hai file dùng được. */
async function backupAll(o) {
  const io = o.io || fs, hooks = o.hooks || {}, now = (o.now || (() => new Date()))();
  const res = {ok: false, json: {ok: false, file: '', error: ''}, sqlite: {ok: false, file: '', error: ''}, message: ''};
  const fail = (m) => { res.message = m; return res; };
  let outDir;
  try { outDir = Settings.checkFolder(o.outDir); } catch (e) { return fail('Thư mục sao lưu không dùng được: ' + e.message); }
  const text = JSON.stringify(o.data, null, 2);
  try { Settings.checkFree(outDir, Buffer.byteLength(text) + (o.dbBytes || 0), hooks.freeBytes, 'Ổ chứa bản sao lưu'); }
  catch (e) { return fail(e.message + ' Chưa ghi file nào; mốc sao lưu gần nhất được giữ nguyên.'); }
  const base = uniqueBase(outDir, 'HoSoKhaiThac_SaoLuu_' + stampOf(now), ['.json', '.sqlite'], io);
  const jsonFile = path.join(outDir, base + '.json'), sqlFile = path.join(outDir, base + '.sqlite');
  // 1. JSON
  try {
    if (hooks.beforeJson) hooks.beforeJson();
    writeFileVerified(jsonFile, text, io, t => { const j = JSON.parse(t); if (!j || typeof j !== 'object' || !j.rs) throw new Error('JSON sao lưu thiếu dữ liệu hồ sơ'); });
    res.json = {ok: true, file: jsonFile, error: ''};
  } catch (e) { res.json = {ok: false, file: jsonFile, error: e.described ? e.message : Settings.describeError(e, jsonFile)}; }
  // 2. SQLite
  const sqlTmp = sqlFile + '.tmp-' + process.pid;
  try {
    if (hooks.beforeSqlite) hooks.beforeSqlite();
    const fp = DM.fingerprint(o.db);
    await o.db.backup(sqlTmp);
    if (hooks.afterSqliteCopy) hooks.afterSqliteCopy(sqlTmp);
    const bi = DM.inspect(sqlTmp, undefined, {cleanSidecars: true});
    if (!bi.ok) throw new Error('file SQLite sao lưu không qua kiểm tra (' + bi.error + ')');
    if (JSON.stringify(bi.counts) !== JSON.stringify(fp.counts) || bi.version !== fp.version) throw new Error('file SQLite sao lưu không khớp số bản ghi của dữ liệu gốc');
    if (io.existsSync(sqlFile)) throw new Error('file đã tồn tại (không ghi đè)');
    io.renameSync(sqlTmp, sqlFile);
    res.sqlite = {ok: true, file: sqlFile, error: ''};
  } catch (e) {
    for (const x of ['', '-wal', '-shm', '-journal']) { try { io.unlinkSync(sqlTmp + x); } catch (er) { /* không có */ } }
    res.sqlite = {ok: false, file: sqlFile, error: Settings.describeError(e, sqlFile)};
  }
  res.ok = res.json.ok && res.sqlite.ok;
  if (res.ok) res.message = 'Đã sao lưu: ' + jsonFile + ' và ' + sqlFile;
  else {
    const usable = [res.json.ok ? 'JSON (' + jsonFile + ')' : '', res.sqlite.ok ? 'SQLite (' + sqlFile + ')' : ''].filter(Boolean);
    res.message = 'Sao lưu KHÔNG đầy đủ. ' + (res.json.ok ? '' : 'Lỗi file JSON: ' + res.json.error + '. ') + (res.sqlite.ok ? '' : 'Lỗi file SQLite: ' + res.sqlite.error + '. ') +
      (usable.length ? 'File dùng được: ' + usable.join('; ') + '. ' : 'Không có file nào dùng được. ') + 'Mốc “sao lưu toàn bộ gần nhất” được giữ nguyên; hãy sao lưu lại.';
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

module.exports = {backupAll, saveLotFile, writeFileVerified, stampOf};
