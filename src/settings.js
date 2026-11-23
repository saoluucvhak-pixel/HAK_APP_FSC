'use strict';
/* Cài đặt hệ thống: thư mục dữ liệu và thư mục sao lưu. Không phụ thuộc Electron để kiểm thử bằng Node.
 * File settings.json luôn nằm ở thư mục cố định của ứng dụng (userData) vì phải đọc được TRƯỚC khi mở cơ sở dữ liệu.
 * Trống = dùng mặc định: dữ liệu ở userData/hakqn.sqlite, bản sao lưu ở thư mục "backups" cạnh file dữ liệu. */
const fs = require('fs'), path = require('path');
const DB_NAME = 'hakqn.sqlite';

const file = userDir => path.join(userDir, 'settings.json');
const CHU_KY = ['tat', '2gio', 'ngay', 'tuan'];   // phiếu #13a: chu kỳ tự sao lưu SQLite
const str = v => typeof v === 'string' ? v : '';
/* phiếu #13a: thư mục sao lưu SQLite (backupDirSql) và JSON (backupDirJson) riêng; chu kỳ tự sao lưu (autoChuKy).
 * Chuyển cài đặt cũ: backupDir cũ thành giá trị ban đầu cho CẢ HAI thư mục; autoKeep = 0 → 'tat', còn lại → 'ngay'. backupDir giữ làm tên cũ của thư mục SQLite. */
function load(userDir) {
  let j = {};
  try { j = JSON.parse(fs.readFileSync(file(userDir), 'utf8')) || {}; } catch (e) { j = {}; }
  const autoKeep = Number.isInteger(j.autoKeep) && j.autoKeep >= 0 && j.autoKeep <= 60 ? j.autoKeep : 7;   // số bản tự sao lưu được giữ; 0 = tắt (cài đặt cũ)
  const backupDirSql = str(j.backupDirSql) || str(j.backupDir), backupDirJson = 'backupDirJson' in j ? str(j.backupDirJson) : str(j.backupDir);
  const autoChuKy = CHU_KY.includes(j.autoChuKy) ? j.autoChuKy : (autoKeep === 0 ? 'tat' : 'ngay');
  return {dataDir: str(j.dataDir), backupDir: backupDirSql, backupDirSql, backupDirJson, backupDir2: str(j.backupDir2),
    lastBackup: str(j.lastBackup), remindDays: Number.isInteger(j.remindDays) && j.remindDays >= 0 && j.remindDays <= 365 ? j.remindDays : 7,
    autoKeep: autoChuKy === 'tat' ? 0 : (autoKeep || 7), autoChuKy};
}
function save(userDir, s) {
  fs.mkdirSync(userDir, {recursive: true});
  const tmp = file(userDir) + '.tmp', sql = s.backupDirSql != null ? s.backupDirSql : (s.backupDir || '');
  const chuKy = s.autoKeep === 0 ? 'tat' : CHU_KY.includes(s.autoChuKy) ? s.autoChuKy : 'ngay', keep = s.autoKeep == null ? 7 : s.autoKeep;   // giữ 0 bản = Tắt (cài đặt cũ "Giữ: Tắt")
  fs.writeFileSync(tmp, JSON.stringify({dataDir: s.dataDir || '', backupDir: sql || '', backupDirSql: sql || '', backupDirJson: s.backupDirJson != null ? s.backupDirJson : sql || '', backupDir2: s.backupDir2 || '',
    lastBackup: s.lastBackup || '', remindDays: s.remindDays == null ? 7 : s.remindDays, autoKeep: chuKy === 'tat' ? 0 : (keep || 7), autoChuKy: chuKy}, null, 2));
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
/* BK-04: cảnh báo sớm dung lượng trống. Hàm thuần: free = số byte trống (bỏ trống thì đọc ổ chứa dir). Không đọc được → không cảnh báo (không báo oan). Không chặn thao tác. */
const NGUONG_DUNG_LUONG_MB = 500;
function canhBaoDungLuong(dir, free, nguong) {
  let f = free; if (f === undefined || f === null) { try { const st = fs.statfsSync(dir); f = st.bavail * st.bsize; } catch (e) { f = NaN; } }
  if (typeof f !== 'number' || !isFinite(f) || f < 0) return {dir, thap: false, freeMB: null};
  return {dir, thap: f < (nguong == null ? NGUONG_DUNG_LUONG_MB : nguong) * 1048576, freeMB: Math.floor(f / 1048576)};
}
/* mục = [[nhãn, thư mục]]: gộp theo thư mục, bỏ mục trống, chỉ trả các thư mục thấp: [{dir, freeMB, nhan: [nhãn…]}]. freeOf(dir) → byte (kiểm thử); không bao giờ ném lỗi. */
function kiemDungLuong(muc, nguong, freeOf) {
  const by = new Map();
  for (const [nhan, dir] of muc || []) { if (!dir) continue; const e = by.get(dir) || {dir, nhan: []}; e.nhan.push(nhan); by.set(dir, e); }
  const out = [];
  for (const e of by.values()) {
    try { const r = canhBaoDungLuong(e.dir, freeOf ? freeOf(e.dir) : undefined, nguong); if (r.thap) out.push({dir: e.dir, freeMB: r.freeMB, nhan: e.nhan}); } catch (er) { /* bỏ qua */ }
  }
  return out;
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
  const f = file(userDir);
  if (fs.existsSync(f)) {
    try { JSON.parse(fs.readFileSync(f, 'utf8')); }
    catch (e) {
      const badFile = f + '.bad';
      try { if (!fs.existsSync(badFile)) fs.copyFileSync(f, badFile); } catch (_) {}
      return {state: 'unavailable', path: f, dir: userDir, code: 'SETTINGS_CORRUPT', reason: 'File cấu hình settings.json bị hỏng hoặc bị cắt dở (đã giữ bản sao settings.json.bad để kiểm tra).'};
    }
  }
  const s = load(userDir);
  if (env.HAKQN_DB || !s.dataDir) return {state: 'ok'};
  const dir = s.dataDir, dbFile = path.join(dir, DB_NAME), bad = (code, reason) => ({state: 'unavailable', path: dbFile, dir, code, reason});
  let st;
  try { st = fs.statSync(dir); } catch (e) { return bad(e.code === 'ENOENT' || e.code === 'ENOTDIR' ? 'DIR_MISSING' : e.code === 'EACCES' || e.code === 'EPERM' ? 'NO_PERMISSION' : 'IO', describeError(e, dir)); }
  if (!st.isDirectory()) return bad('DIR_MISSING', '“' + dir + '” không còn là thư mục');
  // Thử ghi thật vào thư mục (accessSync không phản ánh quyền ACL của Windows)
  const probe = path.join(dir, '.hakqn-ghi-thu-' + process.pid);
  try { fs.writeFileSync(probe, 'x'); fs.unlinkSync(probe); } catch (e) { return bad(e.code === 'EACCES' || e.code === 'EPERM' || e.code === 'EROFS' ? 'NO_PERMISSION' : 'IO', describeError(e, dir)); }
  let fst;
  try { fst = fs.statSync(dbFile); } catch (e) { return bad(e.code === 'ENOENT' ? 'FILE_MISSING' : e.code === 'EACCES' || e.code === 'EPERM' ? 'NO_PERMISSION' : 'IO', e.code === 'ENOENT' ? 'Thư mục còn nhưng không thấy file ' + DB_NAME + ' (file đã bị chuyển/xóa, hoặc đây là ổ khác trùng tên thư mục)' : describeError(e, dbFile)); }
  if (!fst.isFile()) return bad('FILE_MISSING', '“' + dbFile + '” không phải file');
  try { const fd = fs.openSync(dbFile, 'r+'); fs.closeSync(fd); } catch (e) { return bad(e.code === 'EACCES' || e.code === 'EPERM' || e.code === 'EROFS' ? 'NO_PERMISSION' : 'IO', describeError(e, dbFile)); }   // mở thử đọc-ghi file dữ liệu (không ghi gì)
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
  const backupDir = s.backupDirSql && fs.existsSync(s.backupDirSql) ? s.backupDirSql : defBackup;   // thư mục sao lưu SQLite (tên cũ backupDir)
  const backupDirJson = s.backupDirJson && fs.existsSync(s.backupDirJson) ? s.backupDirJson : defBackup;
  return {dbFile, dataDir: dataOut, defaultDataDir: defData, backupDir, backupDirSql: backupDir, backupDirJson, defaultBackupDir: defBackup,
    customData: !env.HAKQN_DB && dataDir !== defData, customBackup: backupDir !== defBackup, customBackupJson: backupDirJson !== defBackup, lockedByEnv: !!env.HAKQN_DB,
    missing: [s.backupDirSql && !fs.existsSync(s.backupDirSql) ? s.backupDirSql : '', s.backupDirJson && s.backupDirJson !== s.backupDirSql && !fs.existsSync(s.backupDirJson) ? s.backupDirJson : ''].filter(Boolean)};
}
module.exports = {DB_NAME, CHU_KY, load, save, backupDue, checkFolder, checkSpace, checkFree, canhBaoDungLuong, kiemDungLuong, NGUONG_DUNG_LUONG_MB, describeError, checkConfigured, resolve, file};
