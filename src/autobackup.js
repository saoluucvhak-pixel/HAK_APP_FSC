'use strict';
/* Tự sao lưu xoay vòng mỗi ngày khi mở ứng dụng (chạy trên máy, không cần mạng).
 * - Mỗi ngày (theo lịch máy) tối đa MỘT bản: <thư mục sao lưu>/tu-dong-YYYY-MM-DD.sqlite; đã có bản của hôm nay thì không làm gì.
 * - Dùng sao lưu trực tuyến của SQLite (db.backup) nên bản sao nhất quán kể cả giao dịch còn trong WAL; ghi qua file tạm,
 *   mở lại kiểm tra (PRAGMA quick_check) rồi mới đổi tên thành bản chính thức. Lỗi thì xóa file tạm, không đụng bản cũ.
 * - Chỉ giữ `keep` bản tự động gần nhất (mặc định 7); KHÔNG xóa các bản sao lưu khác (trước nâng cấp, trước khôi phục, trước xóa, sao lưu tay).
 * - Cơ sở dữ liệu trống (chưa có chủ rừng) thì bỏ qua để không đẩy các bản có dữ liệu ra khỏi vòng giữ.
 * - opts.refresh (khi đóng ứng dụng hoặc định kỳ, lúc dữ liệu đã đổi sau bản của hôm nay): LÀM MỚI bản của hôm nay để nó chứa cả việc đã làm trong ngày.
 *   Bản mới ghi ra file tạm và qua kiểm tra rồi mới thay bản cũ bằng một lần đổi tên; lỗi thì bản cũ của hôm nay còn nguyên.
 * Không phụ thuộc Electron để kiểm thử được bằng Node. */
const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const PREFIX = 'tu-dong-';
const pad = n => String(n).padStart(2, '0');
const dayOf = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());   // ngày theo giờ máy, không theo UTC
/* phiếu #13a: CHU KỲ tự sao lưu. Mỗi chu kỳ một kiểu tên file; trong một khoảng (ngày / tuần ISO / khung 2 giờ) tối đa MỘT bản, làm mới được khi dữ liệu đổi.
 *   ngay: tu-dong-YYYY-MM-DD.sqlite (như trước)   tuan: tu-dong-tuan-YYYY-Www.sqlite   2gio: tu-dong-YYYY-MM-DD-HH00.sqlite (HH chẵn) */
function tuanISO(d) {
  const t = new Date(d.getFullYear(), d.getMonth(), d.getDate()); const thu = (t.getDay() + 6) % 7; t.setDate(t.getDate() - thu + 3);   // thứ Năm của tuần
  const nam = t.getFullYear(), dau = new Date(nam, 0, 4), tuan = 1 + Math.round(((t - dau) / 86400000 - 3 + ((dau.getDay() + 6) % 7)) / 7);
  return nam + '-W' + pad(tuan);
}
const CHU_KY = {
  ngay: {re: /^tu-dong-(\d{4}-\d{2}-\d{2})\.sqlite$/, khoa: d => dayOf(d), ten: k => PREFIX + k + '.sqlite', ngayCua: m => m[1]},
  tuan: {re: /^tu-dong-tuan-(\d{4}-W\d{2})\.sqlite$/, khoa: d => tuanISO(d), ten: k => PREFIX + 'tuan-' + k + '.sqlite', ngayCua: m => m[1]},
  '2gio': {re: /^tu-dong-(\d{4}-\d{2}-\d{2})-(\d{2})00\.sqlite$/, khoa: d => dayOf(d) + '-' + pad(d.getHours() - d.getHours() % 2) + '00', ten: k => PREFIX + k + '.sqlite', ngayCua: m => m[1]}
};
const ky = c => CHU_KY[c] || CHU_KY.ngay;
const RE = CHU_KY.ngay.re;

/* Danh sách bản tự động CỦA MỘT CHU KỲ trong thư mục (mặc định: hằng ngày), mới nhất trước */
function list(dir, chuKy) {
  const k = ky(chuKy);
  let names = [];
  try { names = fs.readdirSync(dir); } catch (e) { return []; }
  return names.filter(n => k.re.test(n)).sort().reverse().map(n => {
    let size = 0; try { size = fs.statSync(path.join(dir, n)).size; } catch (e) { /* bỏ qua */ }
    return {file: path.join(dir, n), name: n, day: k.ngayCua(k.re.exec(n)), size, chuKy: chuKy || 'ngay'};
  });
}

/* chỉ xóa bản tự động CÙNG chu kỳ, vượt quá `keep` bản; không đụng bản chu kỳ khác hay các bản "trước …" */
function prune(dir, keep, chuKy) {
  const removed = [];
  list(dir, chuKy).slice(keep).forEach(b => { try { fs.unlinkSync(b.file); removed.push(b.name); } catch (e) { /* để lần sau */ } });
  return removed;
}
/* lô 6 (T-10): dọn các file tạm *.tmp-<pid> mồ côi cũ hơn 1 ngày trong thư mục sao lưu */
function cleanStaleTmp(dir, nowMs) {
  let names = []; try { names = fs.readdirSync(dir); } catch (e) { return 0; }
  let n = 0; const cut = (nowMs || Date.now()) - 86400000;
  names.filter(x => /\.tmp-\d+(-wal|-shm|-journal)?$/.test(x)).forEach(x => {
    const p = path.join(dir, x);
    try { if (fs.statSync(p).mtimeMs < cut) { fs.unlinkSync(p); n++; } } catch (e) { /* bỏ qua */ }
  });
  return n;
}

/* store: Store (src/store.js). opts: {dir (thư mục sao lưu, mặc định store.backupDir), keep (số bản giữ, 1..60), now: () => Date}
 * Trả {ok, skipped?, reason?, file?, removed[], error?} — không ném lỗi (khởi động ứng dụng không được hỏng vì sao lưu). */
async function daily(store, opts = {}) { return tuDong(store, Object.assign({}, opts, {chuKy: 'ngay'})); }
/* opts.chuKy: 'ngay' | 'tuan' | '2gio' (phiếu #13a). Cùng quy tắc như hằng ngày: đã có bản của khoảng hiện tại thì bỏ qua, trừ khi refresh (dữ liệu đã đổi). */
async function tuDong(store, opts = {}) {
  const keep = Math.max(1, Math.min(60, parseInt(opts.keep, 10) || 7)), chuKy = CHU_KY[opts.chuKy] ? opts.chuKy : 'ngay', k = ky(chuKy);
  const dir = opts.dir || store.backupDir, nowDate = (opts.now || (() => new Date()))(), day = k.khoa(nowDate);
  cleanStaleTmp(dir, nowDate.getTime());
  const out = path.join(dir, k.ten(day)), tmp = out + '.tmp-' + process.pid;
  try {
    if (!store || !store.db || store.file === ':memory:') return {ok: true, skipped: true, reason: 'memory', removed: []};
    if (store.isEmpty()) return {ok: true, skipped: true, reason: 'empty', removed: []};
    const coRoi = fs.existsSync(out);
    if (coRoi && !opts.refresh) return {ok: true, skipped: true, reason: 'today', file: out, removed: prune(dir, keep, chuKy)};
    fs.mkdirSync(dir, {recursive: true});
    await store.db.backup(tmp);
    // bản sao mang chế độ WAL của nguồn: chuyển về một file độc lập (DELETE) rồi kiểm tra, để không sinh -wal/-shm cạnh bản sao lưu
    const chk = new Database(tmp, {fileMustExist: true});
    let res; try { chk.pragma('journal_mode = DELETE'); res = chk.pragma('quick_check', {simple: true}); } finally { chk.close(); }
    if (res !== 'ok') throw new Error('bản sao không qua kiểm tra (' + res + ')');
    fs.renameSync(tmp, out);   // thay bản cũ của hôm nay (nếu có) bằng một lần đổi tên
    return {ok: true, file: out, refreshed: coRoi, chuKy, removed: prune(dir, keep, chuKy)};
  } catch (e) {
    for (const x of ['', '-wal', '-shm', '-journal']) { try { fs.unlinkSync(tmp + x); } catch (e2) { /* không có file tạm */ } }
    return {ok: false, error: e.message, removed: []};
  }
}

/* Chép bản tự sao lưu `file` sang thư mục THỨ HAI (ổ ngoài, thư mục đồng bộ): ghi qua file tạm rồi đổi tên; chỉ giữ `keep` bản tự động gần nhất ở đó.
 * Lỗi (ổ rút ra, hết chỗ) chỉ trả {ok: false, error}: bản chính ở thư mục sao lưu vẫn còn nguyên. */
function copyTo(file, dir2, keep, opts = {}) {
  try {
    if (!file || !dir2) return {ok: true, skipped: true};
    const out = path.join(dir2, path.basename(file)), tmp = out + '.tmp-' + process.pid;
    fs.mkdirSync(dir2, {recursive: true});
    /* overwrite: bản của hôm nay vừa được làm mới thì bản ở thư mục thứ hai cũng thay theo */
    if (opts.overwrite || !fs.existsSync(out)) { try { fs.copyFileSync(file, tmp); fs.renameSync(tmp, out); } catch (e) { try { fs.unlinkSync(tmp); } catch (e2) { /* không có file tạm */ } throw e; } }
    return {ok: true, file: out, removed: prune(dir2, Math.max(1, Math.min(60, parseInt(keep, 10) || 7)), opts.chuKy)};
  } catch (e) { return {ok: false, error: e.message, removed: []}; }
}

module.exports = {daily, tuDong, list, prune, cleanStaleTmp, copyTo, dayOf, tuanISO, CHU_KY, PREFIX};
