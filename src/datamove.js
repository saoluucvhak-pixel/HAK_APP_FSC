'use strict';
/* Đổi thư mục dữ liệu an toàn. Không phụ thuộc Electron (dùng better-sqlite3) để kiểm thử bằng Node.
 *
 * Nguyên tắc:
 *  - Mọi bước ghi đều làm trên file tạm trong thư mục đích; chỉ "đổi tên" (nguyên tử) khi file tạm đã qua kiểm tra toàn vẹn.
 *  - Đường dẫn mới chỉ được lưu vào cấu hình SAU KHI cơ sở dữ liệu mới đã mở và dùng được. Lỗi ở bất kỳ bước nào: hoàn tác file,
 *    giữ nguyên phiên làm việc cũ (cấu hình không đổi).
 *  - Ghi đè: bản dự phòng nhất quán của đích (kể cả giao dịch đã commit còn trong WAL) được tạo bằng cơ chế sao lưu SQLite và phải mở
 *    được trước khi động vào file đích. Đích đang được tiến trình khác dùng thì dừng và báo.
 *  - Bản cũ (nguồn) không bao giờ bị xóa hay sửa.
 * Hàm relocate nhận các bước "hooks.step(tên)" để kiểm thử lỗi giả lập (ném lỗi tại bước đó). */
const fs = require('fs'), path = require('path');
const Database = require('better-sqlite3');
const Settings = require('./settings');

const REQUIRED_TABLES = ['meta', 'owners', 'forests'];
const MAGIC = 'SQLite format 3\0';

class RelocError extends Error { constructor(code, message, extra) { super(message); this.code = code; Object.assign(this, extra || {}); } }

const size = f => { try { return fs.statSync(f).size; } catch (e) { return 0; } };
const sizeWithWal = f => size(f) + size(f + '-wal');
const stampOf = d => d.toISOString().replace(/[:.]/g, '-');

/* Xem một file có phải cơ sở dữ liệu HAKQN dùng được không (mở chỉ-đọc): toàn vẹn, phiên bản cấu trúc, các bảng bắt buộc, số bản ghi từng bảng. */
function inspect(file, supportedVersion, opts = {}) {
  const out = {file, ok: false, exists: false, isSqlite: false, isHakqn: false, integrity: '', version: 0, tables: [], counts: {}, size: 0, mtime: null, code: '', error: ''};
  let st;
  try { st = fs.statSync(file); } catch (e) { out.code = e.code === 'ENOENT' ? 'MISSING' : 'IO'; out.error = Settings.describeError(e, file); return out; }
  out.exists = true; out.size = st.size; out.mtime = st.mtime.toISOString();
  let fd;
  try { fd = fs.openSync(file, 'r'); const b = Buffer.alloc(16); fs.readSync(fd, b, 0, 16, 0); out.isSqlite = b.toString('latin1') === MAGIC; }
  catch (e) { out.code = 'IO'; out.error = Settings.describeError(e, file); return out; }
  finally { if (fd != null) try { fs.closeSync(fd); } catch (e) { /* bỏ qua */ } }
  if (!out.isSqlite) { out.code = 'NOT_SQLITE'; out.error = 'Không phải file cơ sở dữ liệu SQLite hoặc đã bị hỏng.'; return out; }
  let db;
  try {
    db = new Database(file, {readonly: true, fileMustExist: true});
    const ic = db.pragma('integrity_check').map(r => r.integrity_check);
    out.integrity = ic.join('; ');
    if (!(ic.length === 1 && ic[0] === 'ok')) { out.code = 'CORRUPT'; out.error = 'Cơ sở dữ liệu bị hỏng (kiểm tra toàn vẹn: ' + out.integrity.slice(0, 160) + ').'; return out; }
    out.version = db.pragma('user_version', {simple: true});
    out.tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all().map(r => r.name);
    for (const t of out.tables) out.counts[t] = db.prepare('SELECT count(*) AS n FROM "' + t.replace(/"/g, '""') + '"').get().n;
    out.isHakqn = REQUIRED_TABLES.every(t => out.tables.includes(t));
    if (!out.isHakqn) { out.code = 'NOT_HAKQN'; out.error = 'Đây không phải cơ sở dữ liệu của HAKQN (thiếu bảng ' + REQUIRED_TABLES.filter(t => !out.tables.includes(t)).join(', ') + ').'; return out; }
    if (supportedVersion != null && out.version > supportedVersion) { out.code = 'NEWER_VERSION'; out.error = 'Cơ sở dữ liệu thuộc phiên bản cấu trúc mới hơn (v' + out.version + ') so với ứng dụng này (hỗ trợ đến v' + supportedVersion + '). Hãy cài bản ứng dụng mới hơn.'; return out; }
    if (out.version < 1) { out.code = 'NOT_HAKQN'; out.error = 'Cơ sở dữ liệu chưa có phiên bản cấu trúc HAKQN hợp lệ.'; return out; }
    out.ok = true; return out;
  } catch (e) {
    out.code = /SQLITE_BUSY|locked/i.test(e.message) ? 'BUSY' : /CANTOPEN/i.test(e.code || e.message) ? 'IO' : 'NOT_SQLITE';
    out.error = out.code === 'BUSY' ? 'Cơ sở dữ liệu đang bị khóa bởi tiến trình khác.' : 'Không mở được cơ sở dữ liệu: ' + e.message;
    return out;
  } finally { if (db) try { db.close(); } catch (e) { /* bỏ qua */ } if (opts.cleanSidecars) cleanSidecars(file); }
}
/* Mở chỉ-đọc một bản sao ở chế độ WAL có thể để lại -shm/-wal rỗng cạnh file: dọn (chỉ khi WAL rỗng, tuyệt đối không đụng WAL có dữ liệu). */
function cleanSidecars(file) {
  if (size(file + '-wal') === 0) { for (const x of ['-wal', '-shm']) try { fs.unlinkSync(file + x); } catch (e) { /* không có */ } }
}

/* Dấu vân tay để so hai cơ sở dữ liệu có cùng nội dung: phiên bản cấu trúc + số bản ghi từng bảng. */
function fingerprint(db) {
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all().map(r => r.name);
  const counts = {}; for (const t of tables) counts[t] = db.prepare('SELECT count(*) AS n FROM "' + t.replace(/"/g, '""') + '"').get().n;
  return {version: db.pragma('user_version', {simple: true}), counts};
}
const sameFp = (a, b) => a.version === b.version && JSON.stringify(a.counts) === JSON.stringify(b.counts);

/* Mở file với khóa độc quyền: thất bại nếu tiến trình khác đang mở cơ sở dữ liệu (kể cả chế độ WAL). */
function openExclusive(file) {
  const db = new Database(file, {fileMustExist: true, timeout: 0});
  try {
    db.pragma('locking_mode = EXCLUSIVE');
    db.prepare('SELECT count(*) FROM sqlite_master').get();
    db.exec('BEGIN IMMEDIATE; COMMIT');   // giữ khóa ghi: nếu bên khác đang giữ thì ném SQLITE_BUSY
    return db;
  } catch (e) { try { db.close(); } catch (er) { /* bỏ qua */ } throw e; }
}

const same = (a, b) => path.resolve(a) === path.resolve(b);
const devOf = d => { try { return fs.statSync(d).dev; } catch (e) { return null; } };
const unique = (dir, base, ext) => { let n = 0, f; do { f = path.join(dir, base + (n ? '_' + (n + 1) : '') + ext); n++; } while (fs.existsSync(f)); return f; };

/* Dọn dấu vết lần đổi trước bị ngắt giữa chừng (app đóng, mất điện): khôi phục file đích đã đổi tên tạm nếu thiếu, xóa file tạm của chính ta. */
function recoverInterrupted(destDir, log = () => {}) {
  const done = [];
  let names = []; try { names = fs.readdirSync(destDir); } catch (e) { return done; }
  const dest = path.join(destDir, Settings.DB_NAME);
  for (const n of names) {
    const m = /^hakqn\.sqlite(-wal|-shm)?\.thay-(.+)$/.exec(n);
    if (m && !fs.existsSync(dest + (m[1] || ''))) { try { fs.renameSync(path.join(destDir, n), dest + (m[1] || '')); done.push('khôi phục ' + n); log('WARN', 'Khôi phục file đích bị đổi tên dở: ' + n); } catch (e) { /* để lần sau */ } }
  }
  for (const n of names) {
    if (/^hakqn\.sqlite\.tmp-\d+-\d+$/.test(n)) { try { fs.unlinkSync(path.join(destDir, n)); done.push('xóa tạm ' + n); } catch (e) { /* bỏ qua */ } }
  }
  return done;
}

/* o = {srcDb, srcFile, destDir, choice: 'copy'|'use'|'overwrite'|undefined, backupDir, supportedVersion,
 *      openNew(file) -> Store (đã mở), commitConfig() (ném lỗi nếu không lưu được), hooks: {step(name)}, log, now}
 * Trả {ok, choice, newStore, backupFile, replacedKept}. Ném RelocError (đã hoàn tác) khi lỗi. */
async function relocate(o) {
  const log = o.log || (() => {}), step = name => { if (o.hooks && o.hooks.step) return o.hooks.step(name); };
  const dest = path.join(o.destDir, Settings.DB_NAME), stamp = stampOf((o.now || (() => new Date()))());
  const undo = [];            // các bước hoàn tác, chạy ngược
  let newStore = null;
  const rollback = () => {
    if (newStore) { try { newStore.db.close(); } catch (e) { /* bỏ qua */ } newStore = null; }
    for (const f of undo.reverse()) { try { f(); } catch (e) { log('ERROR', 'Hoàn tác lỗi: ' + e.message); } }
    undo.length = 0;
  };
  try {
    Settings.checkFolder(o.destDir);
    for (const s of recoverInterrupted(o.destDir, log)) log('INFO', 'Dọn lần đổi trước: ' + s);
    if (same(dest, o.srcFile)) throw new RelocError('SAME', 'Đó đang là cơ sở dữ liệu hiện tại.');
    const exists = fs.existsSync(dest);
    let choice = o.choice;
    if (exists && !choice) throw new RelocError('NEED_CHOICE', 'Thư mục đích đã có cơ sở dữ liệu.');
    if (!exists) { if (choice === 'use') throw new RelocError('MISSING', 'Thư mục đích chưa có ' + Settings.DB_NAME + ' để dùng.'); choice = 'copy'; }
    const srcBytes = sizeWithWal(o.srcFile), destBytes = exists ? sizeWithWal(dest) : 0;

    /* ---- Dùng dữ liệu có sẵn ---- */
    if (choice === 'use') {
      const insp = inspect(dest, o.supportedVersion);
      if (!insp.ok) throw new RelocError(insp.code || 'INVALID', 'Không thể dùng cơ sở dữ liệu trong thư mục đó: ' + insp.error, {inspect: insp});
      // nâng cấp cấu trúc (nếu bản cũ hơn) sẽ tạo bản chụp trước khi nâng cấp: cần chỗ ở thư mục sao lưu
      if (insp.version < o.supportedVersion && o.backupDir) { fs.mkdirSync(o.backupDir, {recursive: true}); Settings.checkFree(o.backupDir, destBytes, null, 'Ổ chứa bản sao lưu'); }
    } else {
      /* ---- Dung lượng theo thao tác thực tế: file tạm ở đích (kích thước nguồn); với ghi đè còn bản dự phòng ở thư mục sao lưu ---- */
      const needDest = srcBytes, needBackup = choice === 'overwrite' ? destBytes : 0;
      if (needBackup) fs.mkdirSync(o.backupDir, {recursive: true});
      if (needBackup && devOf(o.backupDir) === devOf(o.destDir)) Settings.checkFree(o.destDir, needDest + needBackup, null, 'Ổ đích (cũng chứa bản dự phòng)');
      else { Settings.checkFree(o.destDir, needDest, null, 'Ổ đích'); if (needBackup) Settings.checkFree(o.backupDir, needBackup, null, 'Ổ chứa bản sao lưu'); }
    }

    /* ---- Ghi đè: bản dự phòng nhất quán của đích (gồm cả WAL) trước khi động vào ---- */
    let backupFile = null;
    if (choice === 'overwrite') {
      const insp = inspect(dest);
      if (!insp.isSqlite || insp.code === 'NOT_SQLITE' || insp.code === 'CORRUPT' || insp.code === 'IO')
        throw new RelocError('DEST_UNUSABLE', 'Không thể ghi đè một cách an toàn vì không tạo được bản dự phòng đọc được của file đích: ' + insp.error + ' Hãy di chuyển hoặc xóa file này thủ công rồi thử lại, hoặc chọn thư mục khác.', {inspect: insp});
      if (!insp.isHakqn) throw new RelocError('NOT_HAKQN', 'File ' + Settings.DB_NAME + ' ở thư mục đích không phải cơ sở dữ liệu HAKQN nên không ghi đè. ' + insp.error, {inspect: insp});
      let t;
      try { t = openExclusive(dest); }
      catch (e) { throw new RelocError('IN_USE', 'Cơ sở dữ liệu ở thư mục đích đang được chương trình hoặc tiến trình khác sử dụng nên không thể thay thế an toàn (' + (e.code || e.message) + '). Hãy đóng chương trình đang dùng nó rồi thử lại.'); }
      try {
        fs.mkdirSync(o.backupDir, {recursive: true});
        backupFile = unique(o.backupDir, 'truoc-ghi-de-' + stamp, '.sqlite');
        undo.push(() => { try { fs.unlinkSync(backupFile); } catch (e) { /* có thể chưa tạo */ } });
        const fpDest = fingerprint(t);
        await t.backup(backupFile);
        const bi = inspect(backupFile, undefined, {cleanSidecars: true});
        if (!bi.ok && bi.code !== 'NEWER_VERSION') throw new RelocError('BACKUP_FAILED', 'Bản dự phòng của file đích không đọc được (' + bi.error + '); chưa thay đổi gì.');
        if (JSON.stringify(bi.counts) !== JSON.stringify(fpDest.counts) || bi.version !== fpDest.version) throw new RelocError('BACKUP_FAILED', 'Bản dự phòng của file đích không khớp nội dung gốc; chưa thay đổi gì.');
        undo.pop();   // bản dự phòng đã kiểm tra: giữ lại kể cả khi các bước sau lỗi
      } catch (e) { if (e instanceof RelocError) throw e; throw new RelocError('BACKUP_FAILED', 'Không tạo được bản dự phòng của file đích: ' + Settings.describeError(e, backupFile) + '. Chưa thay đổi gì.'); }
      finally { try { t.close(); } catch (e) { /* bỏ qua */ } }
      await step('after-backup');
    }

    /* ---- Bản sao nguồn vào file tạm trong thư mục đích, kiểm tra trước khi dùng ---- */
    if (choice === 'copy' || choice === 'overwrite') {
      const tmp = dest + '.tmp-' + process.pid + '-' + Date.now();
      undo.push(() => { for (const x of ['', '-wal', '-shm', '-journal']) try { fs.unlinkSync(tmp + x); } catch (e) { /* không có */ } });
      const fpSrc = fingerprint(o.srcDb);
      await o.srcDb.backup(tmp);
      await step('after-tmp');
      const ti = inspect(tmp, o.supportedVersion, {cleanSidecars: true});
      if (!ti.ok) throw new RelocError('COPY_INVALID', 'Bản sao dữ liệu ở thư mục đích không qua kiểm tra (' + ti.error + '); dữ liệu cũ không bị ảnh hưởng.');
      if (JSON.stringify(ti.counts) !== JSON.stringify(fpSrc.counts) || ti.version !== fpSrc.version) throw new RelocError('COPY_INVALID', 'Bản sao không khớp số bản ghi với dữ liệu đang dùng; dữ liệu cũ không bị ảnh hưởng.');
      // thay file đích (nếu có) bằng bản đã kiểm tra: đổi tên file cũ sang tên tạm để hoàn tác được
      const replaced = [];
      if (exists) {
        for (const x of ['', '-wal', '-shm']) {
          const f = dest + x; if (!fs.existsSync(f)) continue;
          const r = f + '.thay-' + stamp; fs.renameSync(f, r); replaced.push([f, r]);
        }
        undo.push(() => { try { if (fs.existsSync(dest)) fs.unlinkSync(dest); for (const x of ['-wal', '-shm']) try { fs.unlinkSync(dest + x); } catch (e) { /* không có */ } } catch (e) { /* bỏ qua */ } for (const [f, r] of replaced) { try { fs.renameSync(r, f); } catch (e) { log('ERROR', 'Không khôi phục được ' + f + ': ' + e.message); } } });
        await step('after-replace-old');
      } else undo.push(() => { try { fs.unlinkSync(dest); } catch (e) { /* chưa tạo */ } });
      fs.renameSync(tmp, dest);
      await step('after-replace');
      o._replaced = replaced;
    }

    /* ---- Mở và dùng thử cơ sở dữ liệu mới, rồi mới lưu đường dẫn ---- */
    try {
      newStore = o.openNew(dest);
      newStore.load();   // đọc thử
      const ic = newStore.db.pragma('integrity_check').map(r => r.integrity_check);
      if (!(ic.length === 1 && ic[0] === 'ok')) throw new Error('kiểm tra toàn vẹn sau khi mở: ' + ic.join('; '));
    } catch (e) { throw new RelocError('OPEN_FAILED', 'Không mở được cơ sở dữ liệu mới: ' + (e.message || e) + '. Vẫn dùng vị trí cũ.'); }
    await step('after-open');
    try { await step('commit'); o.commitConfig(); }
    catch (e) { throw new RelocError('CONFIG_FAILED', 'Không lưu được cấu hình đường dẫn mới: ' + (e.message || e) + '. Vẫn dùng vị trí cũ, dữ liệu ở đích được giữ nguyên.'); }
    await step('after-commit');
    // thành công: bản dự phòng đã kiểm tra, xóa các file đích cũ đã đổi tên tạm
    let kept = [];
    for (const [, r] of (o._replaced || [])) { try { fs.unlinkSync(r); } catch (e) { kept.push(r); } }
    undo.length = 0;
    return {ok: true, choice, newStore, backupFile, replacedKept: kept};
  } catch (e) {
    if (!e.simulateCrash) rollback();
    else { if (newStore) { try { newStore.db.close(); } catch (er) { /* bỏ qua */ } } }   // giả lập app bị đóng đột ngột: không hoàn tác
    if (e instanceof RelocError) { e.rolledBack = !e.simulateCrash; throw e; }
    const re = new RelocError('FAILED', 'Đổi thư mục dữ liệu không hoàn tất: ' + (e.message || e) + '. Dữ liệu cũ và đường dẫn cũ được giữ nguyên.', {rolledBack: !e.simulateCrash});
    throw re;
  }
}

module.exports = {inspect, cleanSidecars, fingerprint, sameFp, openExclusive, relocate, recoverInterrupted, RelocError, REQUIRED_TABLES};
