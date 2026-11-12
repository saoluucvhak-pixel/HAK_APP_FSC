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
    return {dataDir: typeof j.dataDir === 'string' ? j.dataDir : '', backupDir: typeof j.backupDir === 'string' ? j.backupDir : ''};
  } catch (e) { return {dataDir: '', backupDir: ''}; }
}
function save(userDir, s) {
  fs.mkdirSync(userDir, {recursive: true});
  const tmp = file(userDir) + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify({dataDir: s.dataDir || '', backupDir: s.backupDir || ''}, null, 2));
  fs.renameSync(tmp, file(userDir));   // ghi trọn vẹn rồi mới thay, tránh file cài đặt dở dang
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
/* Vị trí đang dùng. env.HAKQN_DB (kiểm thử/triển khai đặc biệt) được ưu tiên và khóa thư mục dữ liệu. */
function resolve(userDir, env = {}) {
  const s = load(userDir);
  const defData = userDir, dataDir = s.dataDir && fs.existsSync(s.dataDir) ? s.dataDir : defData;
  const dbFile = env.HAKQN_DB || path.join(dataDir, DB_NAME);
  const dataOut = env.HAKQN_DB ? path.dirname(env.HAKQN_DB) : dataDir;
  const defBackup = path.join(dataOut, 'backups');
  const backupDir = s.backupDir && fs.existsSync(s.backupDir) ? s.backupDir : defBackup;
  return {dbFile, dataDir: dataOut, defaultDataDir: defData, backupDir, defaultBackupDir: defBackup,
    customData: !env.HAKQN_DB && dataDir !== defData, customBackup: backupDir !== defBackup, lockedByEnv: !!env.HAKQN_DB,
    missing: [s.dataDir && !fs.existsSync(s.dataDir) ? s.dataDir : '', s.backupDir && !fs.existsSync(s.backupDir) ? s.backupDir : ''].filter(Boolean)};
}
module.exports = {DB_NAME, load, save, checkFolder, resolve, file};
