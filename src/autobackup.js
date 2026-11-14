'use strict';
/* Tự sao lưu xoay vòng mỗi ngày khi mở ứng dụng (chạy trên máy, không cần mạng).
 * - Mỗi ngày (theo lịch máy) tối đa MỘT bản: <thư mục sao lưu>/tu-dong-YYYY-MM-DD.sqlite; đã có bản của hôm nay thì không làm gì.
 * - Dùng sao lưu trực tuyến của SQLite (db.backup) nên bản sao nhất quán kể cả giao dịch còn trong WAL; ghi qua file tạm,
 *   mở lại kiểm tra (PRAGMA quick_check) rồi mới đổi tên thành bản chính thức. Lỗi thì xóa file tạm, không đụng bản cũ.
 * - Chỉ giữ `keep` bản tự động gần nhất (mặc định 7); KHÔNG xóa các bản sao lưu khác (trước nâng cấp, trước khôi phục, trước xóa, sao lưu tay).
 * - Cơ sở dữ liệu trống (chưa có chủ rừng) thì bỏ qua để không đẩy các bản có dữ liệu ra khỏi vòng giữ.
 * Không phụ thuộc Electron để kiểm thử được bằng Node. */
const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const PREFIX = 'tu-dong-';
const RE = /^tu-dong-(\d{4}-\d{2}-\d{2})\.sqlite$/;
const pad = n => String(n).padStart(2, '0');
const dayOf = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());   // ngày theo giờ máy, không theo UTC

/* Danh sách bản tự động trong thư mục, mới nhất trước */
function list(dir) {
  let names = [];
  try { names = fs.readdirSync(dir); } catch (e) { return []; }
  return names.filter(n => RE.test(n)).sort().reverse().map(n => {
    let size = 0; try { size = fs.statSync(path.join(dir, n)).size; } catch (e) { /* bỏ qua */ }
    return {file: path.join(dir, n), name: n, day: RE.exec(n)[1], size};
  });
}

function prune(dir, keep) {
  const removed = [];
  list(dir).slice(keep).forEach(b => { try { fs.unlinkSync(b.file); removed.push(b.name); } catch (e) { /* để lần sau */ } });
  return removed;
}

/* store: Store (src/store.js). opts: {dir (thư mục sao lưu, mặc định store.backupDir), keep (số bản giữ, 1..60), now: () => Date}
 * Trả {ok, skipped?, reason?, file?, removed[], error?} — không ném lỗi (khởi động ứng dụng không được hỏng vì sao lưu). */
async function daily(store, opts = {}) {
  const keep = Math.max(1, Math.min(60, parseInt(opts.keep, 10) || 7));
  const dir = opts.dir || store.backupDir, day = dayOf((opts.now || (() => new Date()))());
  const out = path.join(dir, PREFIX + day + '.sqlite'), tmp = out + '.tmp-' + process.pid;
  try {
    if (!store || !store.db || store.file === ':memory:') return {ok: true, skipped: true, reason: 'memory', removed: []};
    if (store.isEmpty()) return {ok: true, skipped: true, reason: 'empty', removed: []};
    if (fs.existsSync(out)) return {ok: true, skipped: true, reason: 'today', file: out, removed: prune(dir, keep)};
    fs.mkdirSync(dir, {recursive: true});
    await store.db.backup(tmp);
    // bản sao mang chế độ WAL của nguồn: chuyển về một file độc lập (DELETE) rồi kiểm tra, để không sinh -wal/-shm cạnh bản sao lưu
    const chk = new Database(tmp, {fileMustExist: true});
    let res; try { chk.pragma('journal_mode = DELETE'); res = chk.pragma('quick_check', {simple: true}); } finally { chk.close(); }
    if (res !== 'ok') throw new Error('bản sao không qua kiểm tra (' + res + ')');
    fs.renameSync(tmp, out);
    return {ok: true, file: out, removed: prune(dir, keep)};
  } catch (e) {
    for (const x of ['', '-wal', '-shm', '-journal']) { try { fs.unlinkSync(tmp + x); } catch (e2) { /* không có file tạm */ } }
    return {ok: false, error: e.message, removed: []};
  }
}

module.exports = {daily, list, prune, dayOf, PREFIX};
