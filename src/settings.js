'use strict';
/* Cài đặt hệ thống: thư mục dữ liệu và thư mục sao lưu. Không phụ thuộc Electron để kiểm thử bằng Node.
 * File settings.json luôn nằm ở thư mục cố định của ứng dụng (userData) vì phải đọc được TRƯỚC khi mở cơ sở dữ liệu.
 * Trống = dùng mặc định: dữ liệu ở userData/hakqn.sqlite, bản sao lưu ở thư mục "backups" cạnh file dữ liệu. */
const fs = require('fs'), path = require('path');
const DB_NAME = 'hakqn.sqlite';

const file = userDir => path.join(userDir, 'settings.json');
function load(userDir) {
  try {
    const j = JSON.parse(fs.readFileSync(file(userDir), 'utf8'));
    return {dataDir: typeof j.dataDir === 'string' ? j.dataDir : '', backupDir: typeof j.backupDir === 'string' ? j.backupDir : '',
      lastBackup: typeof j.lastBackup === 'string' ? j.lastBackup : '', remindDays: Number.isInteger(j.remindDays) && j.remindDays >= 0 && j.remindDays <= 365 ? j.remindDays : 7,
      autoKeep: Number.isInteger(j.autoKeep) && j.autoKeep >= 0 && j.autoKeep <= 60 ? j.autoKeep : 7};   // số bản tự sao lưu hằng ngày được giữ; 0 = tắt
  } catch (e) { return {dataDir: '', backupDir: '', lastBackup: '', remindDays: 7, autoKeep: 7}; }
}
function save(userDir, s) {
  fs.mkdirSync(userDir, {recursive: true});
  const tmp = file(userDir) + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify({dataDir: s.dataDir || '', backupDir: s.backupDir || '', lastBackup: s.lastBackup || '', remindDays: s.remindDays == null ? 7 : s.remindDays, autoKeep: s.autoKeep == null ? 7 : s.autoKeep}, null, 2));
  fs.renameSync(tmp, file(userDir));   // ghi trọn vẹn rồi mới thay, tránh file cài đặt dở dang
}
/* Đã đến lúc nhắc sao lưu toàn bộ chưa. remindDays 0 = tắt. Chưa từng sao lưu: tính từ lần đầu cài (firstSeen) để không nhắc ngay ngày đầu. Trả {due, days} (days = số ngày từ lần sao lưu cuối, null nếu chưa từng). */
function backupDue(s, nowMs, firstSeenMs) {
  if (!s.remindDays) return {due: false, days: null};
  const last = s.lastBackup ? Date.parse(s.lastBackup) : NaN;
  const base = Number.isFinite(last) ? last : firstSeenMs;
  if (!Number.isFinite(base)) return {due: false, days: null};
  const days = Math.floor((nowMs - base) / 86400000);
  return {due: days >= s.remindDays, days: Number.isFinite(last) ? days : null, since: Number.isFinite(last) ? 'last' : 'first'};
}
/* Thư mục phải có thật, là thư mục và ghi được; báo lỗi tiếng Việt cụ thể. Trả đường dẫn tuyệt đối đã chuẩn hóa. */
function checkFolder(dir) {
  const d = String(dir || '').trim();
  if (!d) throw new Error('Chưa chọn thư mục.');
  if (!path.isAbsolute(d)) throw new Error('Cần đường dẫn đầy đủ (ví dụ D:\\HAKQN), không dùng đường dẫn tương đối.');
  const abs = path.resolve(d);
  let st; try { st = fs.statSync(abs); } catch (e) { throw new Error('Thư mục “' + abs + '” không tồn tại.'); }
  if (!st.isDirectory()) throw new Error('“' + abs + '” không phải thư mục.');
  const probe = path.join(abs, '.hakqn-ghi-thu-' + process.pid);
  try { fs.writeFileSync(probe, 'x'); fs.unlinkSync(probe); } catch (e) { throw new Error('Không ghi được vào thư mục “' + abs + '” (' + (e.code || e.message) + '). Chọn thư mục khác hoặc kiểm tra quyền.'); }
  return abs;
}
/* Ổ đích phải đủ chỗ cho bản sao (kích thước dữ liệu x 2 + 10 MB dự phòng). Không đọc được dung lượng trống thì cho qua (không chặn oan). */
function checkSpace(dir, bytes, free) {
  let f = free; if (f == null) { try { const st = fs.statfsSync(dir); f = st.bavail * st.bsize; } catch (e) { return true; } }
  const need = bytes * 2 + 10 * 1024 * 1024;
  if (f < need) throw new Error('Ổ đích không đủ chỗ trống: còn ' + Math.floor(f / 1048576) + ' MB, cần khoảng ' + Math.ceil(need / 1048576) + ' MB. Giải phóng dung lượng hoặc chọn ổ khác.');
  return true;
}
/* Cần đúng needBytes (không nhân đôi): dùng khi đã tính theo thao tác thực tế. */
function checkFree(dir, needBytes, free, label) {
  let f = free; if (f == null) { try { const st = fs.statfsSync(dir); f = st.bavail * st.bsize; } catch (e) { return true; } }
  const need = Math.ceil(needBytes * 1.1) + 5 * 1024 * 1024;
  if (f < need) throw new Error((label || 'Ổ') + ' không đủ chỗ trống: còn ' + Math.floor(f / 1048576) + ' MB, cần khoảng ' + Math.ceil(need / 1048576) + ' MB (' + dir + '). Giải phóng dung lượng hoặc chọn ổ khác.');
  return true;
}
/* Nguyên nhân lỗi hệ thống bằng tiếng Việt, kèm đường dẫn. */
function describeError(e, p) {
  const c = e && e.code, at = p ? ' “' + p + '”' : '';
  if (c === 'ENOENT') return 'Không tìm thấy' + at + ' (ổ có thể chưa được kết nối, đã đổi tên hoặc bị xóa)';
  if (c === 'EACCES' || c === 'EPERM') return 'Không có quyền truy cập' + at;
  if (c === 'ENOSPC') return 'Ổ đã hết dung lượng' + at;
  if (c === 'EBUSY') return 'File đang được chương trình khác sử dụng' + at;
  if (c === 'EIO' || c === 'ENXIO' || c === 'ENODEV' || c === 'ENOTCONN' || c === 'ETIMEDOUT') return 'Lỗi đọc/ghi ổ đĩa hoặc mất kết nối ổ' + at + ' (' + c + ')';
  if (c === 'EROFS') return 'Ổ chỉ cho phép đọc' + at;
  return (e && e.message ? e.message : String(e)) + (p ? ' (' + p + ')' : '');
}
/* Kiểm tra vị trí dữ liệu ĐÃ CẤU HÌNH khi khởi động: cả thư mục lẫn file hakqn.sqlite. Không tự đổi sang vị trí khác.
 * Trả {state: 'ok'} hoặc {state: 'unavailable', path, dir, code, reason}. Chưa cấu hình (dùng mặc định) hoặc đang bị khóa bởi biến môi trường thì luôn ok
 * (cài mới chưa có file là bình thường). */
function checkConfigured(userDir, env = {}) {
  const s = load(userDir);
  if (env.HAKQN_DB || !s.dataDir) return {state: 'ok'};
  const dir = s.dataDir, file = path.join(dir, DB_NAME), bad = (code, reason) => ({state: 'unavailable', path: file, dir, code, reason});
  let st;
  try { st = fs.statSync(dir); } catch (e) { return bad(e.code === 'ENOENT' || e.code === 'ENOTDIR' ? 'DIR_MISSING' : e.code === 'EACCES' || e.code === 'EPERM' ? 'NO_PERMISSION' : 'IO', describeError(e, dir)); }
  if (!st.isDirectory()) return bad('DIR_MISSING', '“' + dir + '” không còn là thư mục');
  // Thử ghi thật vào thư mục (accessSync không phản ánh quyền ACL của Windows)
  const probe = path.join(dir, '.hakqn-ghi-thu-' + process.pid);
  try { fs.writeFileSync(probe, 'x'); fs.unlinkSync(probe); } catch (e) { return bad(e.code === 'EACCES' || e.code === 'EPERM' || e.code === 'EROFS' ? 'NO_PERMISSION' : 'IO', describeError(e, dir)); }
  let fst;
  try { fst = fs.statSync(file); } catch (e) { return bad(e.code === 'ENOENT' ? 'FILE_MISSING' : e.code === 'EACCES' || e.code === 'EPERM' ? 'NO_PERMISSION' : 'IO', e.code === 'ENOENT' ? 'Thư mục còn nhưng không thấy file ' + DB_NAME + ' (file đã bị chuyển/xóa, hoặc đây là ổ khác trùng tên thư mục)' : describeError(e, file)); }
  if (!fst.isFile()) return bad('FILE_MISSING', '“' + file + '” không phải file');
  try { const fd = fs.openSync(file, 'r+'); fs.closeSync(fd); } catch (e) { return bad(e.code === 'EACCES' || e.code === 'EPERM' || e.code === 'EROFS' ? 'NO_PERMISSION' : 'IO', describeError(e, file)); }   // mở thử đọc-ghi file dữ liệu (không ghi gì)
  return {state: 'ok'};
}
/* Vị trí đang dùng. env.HAKQN_DB (kiểm thử/triển khai đặc biệt) được ưu tiên và khóa thư mục dữ liệu.
 * Thư mục dữ liệu đã cấu hình KHÔNG tự thay bằng mặc định khi không truy cập được (xem checkConfigured): tránh ghi vào một bản cũ hoặc trống.
 * Thư mục sao lưu không còn thì dùng thư mục mặc định và báo trong missing (không làm mất dữ liệu chính). */
function resolve(userDir, env = {}) {
  const s = load(userDir);
  const defData = userDir, dataDir = s.dataDir || defData;
  const dbFile = env.HAKQN_DB || path.join(dataDir, DB_NAME);
  const dataOut = env.HAKQN_DB ? path.dirname(env.HAKQN_DB) : dataDir;
  const defBackup = path.join(dataOut, 'backups');
  const backupDir = s.backupDir && fs.existsSync(s.backupDir) ? s.backupDir : defBackup;
  return {dbFile, dataDir: dataOut, defaultDataDir: defData, backupDir, defaultBackupDir: defBackup,
    customData: !env.HAKQN_DB && dataDir !== defData, customBackup: backupDir !== defBackup, lockedByEnv: !!env.HAKQN_DB,
    missing: [s.backupDir && !fs.existsSync(s.backupDir) ? s.backupDir : ''].filter(Boolean)};
}
module.exports = {DB_NAME, load, save, backupDue, checkFolder, checkSpace, checkFree, describeError, checkConfigured, resolve, file};
