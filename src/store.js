'use strict';
/* Lớp lưu trữ SQLite cho HAKQN. Không phụ thuộc Electron để kiểm thử được bằng Node.
 * Mô hình dữ liệu của giao diện: db = { v:2, rs:{ [idChuRung]: { id, info, forests:{ [idRung]: {...} } } }, ...khác }
 * Mỗi chủ rừng là 1 dòng bảng owners, mỗi rừng là 1 dòng bảng forests (nhân công, xe, phiếu cân, thông số nằm trong cột data của rừng đó).
 * Danh mục công ty mua hàng (db.congTy) là bảng companies (mỗi công ty một dòng, từ cấu trúc v3).
 * Các khóa cấp cao khác (ví dụ định mức BHLĐ) lưu ở bảng meta. */
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const LoRung = require('./lorung');

// Mỗi phần tử nâng cấp từ version (i) lên (i+1). Không sửa phần tử đã phát hành, chỉ thêm phần tử mới.
const MIGRATIONS = [
  function v1(db) {
    db.exec(`
      CREATE TABLE meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
      CREATE TABLE owners (
        id TEXT PRIMARY KEY, ma TEXT NOT NULL DEFAULT '', ten TEXT NOT NULL DEFAULT '', cccd TEXT NOT NULL DEFAULT '',
        data TEXT NOT NULL, hash TEXT NOT NULL, updated_at TEXT NOT NULL);
      CREATE TABLE forests (
        id TEXT PRIMARY KEY, owner_id TEXT NOT NULL REFERENCES owners(id) ON DELETE CASCADE,
        ma_rung TEXT NOT NULL DEFAULT '', ten_rung TEXT NOT NULL DEFAULT '',
        data TEXT NOT NULL, hash TEXT NOT NULL, updated_at TEXT NOT NULL);
      CREATE INDEX idx_forests_owner ON forests(owner_id);
      CREATE INDEX idx_forests_ma ON forests(ma_rung);
      CREATE INDEX idx_owners_cccd ON owners(cccd);`);
  },
  function v2(db) { require('./lookup').MIGRATION(db); },
  /* v3: danh mục công ty mua hàng. Chỉ THÊM bảng; không đổi, không xóa dữ liệu hồ sơ nào (owners, forests, meta, bản tra cứu giữ nguyên). */
  function v3(db) {
    db.exec(`
      CREATE TABLE companies (
        id TEXT PRIMARY KEY, ten TEXT NOT NULL DEFAULT '', mst TEXT NOT NULL DEFAULT '',
        data TEXT NOT NULL, hash TEXT NOT NULL, updated_at TEXT NOT NULL);
      CREATE INDEX idx_companies_mst ON companies(mst);`);
  },
  /* v4 (cấu trúc 2.0, giai đoạn 3): ĐỘI KHAI THÁC là bảng con của lô (src/model.js). Mỗi lô: hình thức, cách tính, đơn giá, số văn bản của đội chuyển từ
   * thông tin rừng / thông số xuất sang lô.doi; mỗi nhân công mang doiId. Chỉ đổi cột data của forests (và hash); không xóa dòng nào.
   * Chạy trong giao dịch nâng cấp, sau khi đã sao lưu file (snapshotFile trước khi nâng cấp). */
  function v4(db) {
    const M = require('./model'), up = db.prepare('UPDATE forests SET data=?, hash=? WHERE id=?');
    db.prepare('SELECT id, data FROM forests').all().forEach(r => {
      const f = JSON.parse(r.data); if (!M.needsEnsure(f)) return;
      const data = JSON.stringify(M.ensureForest(f)); up.run(data, sha(data), r.id);
    });
  },
  /* v5 (giai đoạn 4): HỢP ĐỒNG VẬN CHUYỂN là bảng con của lô, xe mang hdvcId (src/model.js). Mỗi người ký (chủ xe / tài xế) một hợp đồng như bản cũ;
   * cước, số hợp đồng để trống = dùng của lô nên bản in không đổi. Chỉ đổi cột data của forests. */
  function v5(db) {
    const M = require('./model'), up = db.prepare('UPDATE forests SET data=?, hash=? WHERE id=?');
    db.prepare('SELECT id, data FROM forests').all().forEach(r => {
      const f = JSON.parse(r.data); if (!M.needsEnsure(f)) return;
      const data = JSON.stringify(M.ensureForest(f)); up.run(data, sha(data), r.id);
    });
  },
  /* v6 (giai đoạn 6): BỎ TRƯỜNG CŨ ĐÃ ĐƯỢC THAY (src/model.js xoaTruongCu): info.soDoi, khối lượng nhập tay → klHoSoCu (chỉ hiển thị), klDoi → doi[].klHoSoCu,
   * đơn giá Tổ trưởng hồ sơ cũ → bảng đơn giá theo vị trí của đội, cước bậc cự ly → tấn/km (giữ bậc ở bacCu), chữ ở cột Đội / Đội xe của dòng đã có đội. Một chiều;
   * chạy sau khi sao lưu file (snapshotFile trước khi nâng cấp); chỉ đổi cột data của forests. */
  function v6(db) {
    const M = require('./model'), up = db.prepare('UPDATE forests SET data=?, hash=? WHERE id=?');
    db.prepare('SELECT id, data FROM forests').all().forEach(r => {
      const f = JSON.parse(r.data); if (!M.needsEnsure(f)) return;
      const data = JSON.stringify(M.ensureForest(f)); up.run(data, sha(data), r.id);
    });
  },
  /* v7 (bản 2.1, docs/THIET_KE_QUY_TRINH_2_1.md): DANH MỤC LAO ĐỘNG và DANH MỤC XE dùng chung, nhiều dòng theo ngày cập nhật (src/danhmuc.js). Dựng từ nhân công và xe của mọi lô;
   * chỉ THÊM hai khóa ở bảng meta (dmLaoDong, dmXeVC) khi chưa có; không đổi hồ sơ lô nào nên bản in không đổi. Chạy sau khi sao lưu file. */
  function v7(db) {
    const DM = require('./danhmuc'), g = k => { const r = db.prepare('SELECT value FROM meta WHERE key=?').get(k); return r ? JSON.parse(r.value) : null; };
    const rs = {}; db.prepare('SELECT owner_id, data FROM forests').all().forEach(r => { const o = rs[r.owner_id] = rs[r.owner_id] || {forests: {}}; const f = JSON.parse(r.data); o.forests[f.id || r.owner_id + '/' + Object.keys(o.forests).length] = f; });
    const d = new Date(), homNay = String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0') + '/' + d.getFullYear();
    const x = DM.dungTuLo(rs, homNay), put = db.prepare('INSERT INTO meta(key,value) VALUES(?,?) ON CONFLICT(key) DO NOTHING');
    if (g('dmLaoDong') == null) put.run('dmLaoDong', JSON.stringify(x.laoDong));
    if (g('dmXeVC') == null) put.run('dmXeVC', JSON.stringify(x.xe));
  },
  /* v8 (bản 2.2): ĐỐI TÁC dùng chung. Dựng từ danh mục đơn vị vận chuyển (doanh nghiệp) và người ký cá nhân của mọi đội xe; THÊM vào dmDoiTac (không ghi đè dòng đã có). Không đổi hồ sơ lô, bản in không đổi. */
  function v8(db) {
    const DM = require('./danhmuc'), g = k => { const r = db.prepare('SELECT value FROM meta WHERE key=?').get(k); return r ? JSON.parse(r.value) : null; };
    const rs = {}; db.prepare('SELECT owner_id, data FROM forests').all().forEach(r => { const o = rs[r.owner_id] = rs[r.owner_id] || {forests: {}}; const f = JSON.parse(r.data); o.forests[f.id || r.owner_id + '/' + Object.keys(o.forests).length] = f; });
    const list = DM.dungDoiTac(rs, g('dmDonViVC') || {}, g('dmDoiTac') || []);
    db.prepare('INSERT INTO meta(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').run('dmDoiTac', JSON.stringify(list));
  },
  /* v9 (bản 2.2): LỊCH SỬ STT văn bản đã cấp theo lô và theo nhóm (f.sttDaCap = {doi: [..], doiXe: [..]}, src/sovb.js). Khởi tạo từ STT đang lưu của đội, đội xe và STT đọc được từ các số văn bản dạng NN/NĂM/…;
   * KHÔNG đánh lại số cũ, không đổi nội dung văn bản. GIỚI HẠN: đội đã xóa TRƯỚC bản này không có lịch sử nên số của đội đó (nếu không còn ở văn bản nào) có thể bị cấp lại; app cảnh báo số trùng trong lô và giữa các lô. */
  function v9(db) {
    const SV = require('./sovb'), up = db.prepare('UPDATE forests SET data=?, hash=? WHERE id=?');
    db.prepare('SELECT id, data FROM forests').all().forEach(r => {
      const f = JSON.parse(r.data); if (!SV.khoiTaoLichSu(f)) return;
      const data = JSON.stringify(f); up.run(data, sha(data), r.id);
    });
  },
  /* v10 (bản 2.2 sửa lỗi): ĐỐI TÁC MỘT NGUỒN. Gộp danh mục đơn vị vận chuyển cũ (meta dmDonViVC) vào dmDoiTac (id 'dn:<mã>') rồi bỏ dmDonViVC: doanh nghiệp chỉ còn ở một nơi, mọi màn đọc và sửa cùng nơi đó.
   * dmDonViVC là nơi duy nhất từng cho sửa doanh nghiệp nên dòng 'dn:' cùng mã lấy theo nó. KHÔNG đổi lô nào: đội xe cũ trỏ 'dv1' được hiểu là 'dn:dv1' (src/danhmuc.js chuanDoiTacId), bản chụp bên B (ben) giữ nguyên nên bản in không đổi. Chạy sau khi sao lưu file. */
  function v10(db) {
    const DM = require('./danhmuc'), g = k => { const r = db.prepare('SELECT value FROM meta WHERE key=?').get(k); return r ? JSON.parse(r.value) : null; };
    const dv = g('dmDonViVC'); if (dv == null) return;
    const r = DM.hopNhatDoiTac(dv, g('dmDoiTac') || []);
    db.prepare('INSERT INTO meta(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').run('dmDoiTac', JSON.stringify(r.list));
    db.prepare("DELETE FROM meta WHERE key='dmDonViVC'").run();
  },
  /* v11 (A4): NGÀY CHỤP DANH MỤC cho dòng nhân công / xe nhập trước khi có _dmNgay (src/danhmuc.js ganNgayChup): ngày cập nhật của dòng danh mục hiện hành, không có thì ngày nâng cấp.
   * Chỉ đổi cột data của forests có dòng được gán; bản in không đổi (_dmNgay không in). Chạy sau khi sao lưu file. */
  function v11(db) {
    const DM = require('./danhmuc'), g = k => { const r = db.prepare('SELECT value FROM meta WHERE key=?').get(k); return r ? JSON.parse(r.value) : null; };
    const ld = g('dmLaoDong') || [], xe = g('dmXeVC') || [], d = new Date(), homNay = String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0') + '/' + d.getFullYear();
    const up = db.prepare('UPDATE forests SET data=?, hash=? WHERE id=?');
    db.prepare('SELECT id, data FROM forests').all().forEach(r => { const f = JSON.parse(r.data); if (!DM.ganNgayChup(f, ld, xe, homNay)) return; const data = JSON.stringify(f); up.run(data, sha(data), r.id); });
  },
  /* v12 (A3): trạng thái in đợt 2 của BM-09 / BM-10 theo ĐỘI XE ('09:hd:<id>') thay cho CCCD / tên người ký (src/model.js doiKhoaInVC). Lô đã chốt / dừng giữ nguyên.
   * Chỉ đổi cột data của forests có mục được đổi; bản in không đổi. Chạy sau khi sao lưu file. */
  function v12(db) {
    const M = require('./model'), up = db.prepare('UPDATE forests SET data=?, hash=? WHERE id=?');
    db.prepare('SELECT id, data FROM forests').all().forEach(r => { const f = JSON.parse(r.data); if (!M.doiKhoaInVC(f)) return; const data = JSON.stringify(f); up.run(data, sha(data), r.id); });
  },
  /* v13 (B6): DANH MỤC (lao động, xe, đối tác) ra bảng riêng, MỘT DÒNG MỖI MỤC (danh_muc: loại, thứ tự, JSON, băm); danh_muc_bang ghi danh mục nào đang có
   * (danh mục rỗng [] vẫn là "có", như khóa meta trước đây). Chuyển nguyên từng dòng từ meta rồi bỏ khóa meta; khóa không phải mảng thì để nguyên ở meta.
   * Không đổi hồ sơ lô nào nên bản in không đổi. Chạy sau khi sao lưu file; chạy lại không đổi (meta đã không còn khóa danh mục). */
  function v13(db) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS danh_muc (kind TEXT NOT NULL, ord INTEGER NOT NULL, data TEXT NOT NULL, hash TEXT NOT NULL, PRIMARY KEY (kind, ord));
      CREATE TABLE IF NOT EXISTS danh_muc_bang (kind TEXT PRIMARY KEY);
    `);
    const g = db.prepare('SELECT value FROM meta WHERE key=?'), put = db.prepare('INSERT INTO danh_muc(kind,ord,data,hash) VALUES(?,?,?,?)');
    DM_BANG.forEach(k => {
      const r = g.get(k); if (!r) return; let v; try { v = JSON.parse(r.value); } catch (e) { return; }
      if (!Array.isArray(v)) return;
      db.prepare('DELETE FROM danh_muc WHERE kind=?').run(k);
      v.forEach((row, i) => { const data = JSON.stringify(row); put.run(k, i, data, sha(data)); });
      db.prepare('INSERT OR IGNORE INTO danh_muc_bang(kind) VALUES(?)').run(k);
      db.prepare('DELETE FROM meta WHERE key=?').run(k);
    });
  },
  /* v14 (B5): GÓI ĐÓNG BĂNG của lô đã chốt (chot.goi — bản chụp cả lô, có thể vài MB) ra bảng chot_goi (một dòng mỗi lô × phiên bản chốt).
   * JSON của lô chỉ còn chot = {at, nguoi, phienBan, hash, hashDL}: mở app, lưu, kiểm tra không phải đọc / chép / băm gói. hashDL tính từ gói để kiểm "còn nguyên".
   * Không đổi phần dữ liệu lô nên bản in không đổi; khóa chỉ đọc giữ nguyên (chot là khóa vòng đời). Chạy sau khi sao lưu file; chạy lại không đổi (lô đã hết goi). */
  function v14(db) {
    db.exec('CREATE TABLE IF NOT EXISTS chot_goi (forest_id TEXT NOT NULL, phien_ban INTEGER NOT NULL, hash TEXT NOT NULL, at TEXT NOT NULL, data TEXT NOT NULL, PRIMARY KEY (forest_id, phien_ban))');
    const up = db.prepare('UPDATE forests SET data=?, hash=? WHERE id=?'), put = db.prepare('INSERT INTO chot_goi(forest_id,phien_ban,hash,at,data) VALUES(?,?,?,?,?) ON CONFLICT(forest_id,phien_ban) DO UPDATE SET hash=excluded.hash, at=excluded.at, data=excluded.data');
    db.prepare("SELECT id, data FROM forests WHERE data LIKE '%\"goi\":%'").all().forEach(r => {
      const x = tachGoi(JSON.parse(r.data)); if (!x.goi) return;
      put.run(r.id, x.goi.phienBan, x.goi.hash, x.goi.at, x.goi.data);
      const data = JSON.stringify(x.f); up.run(data, sha(data), r.id);
    });
  },
  /* v15 (3.0, docs/THIET_KE_3_0.md): DANH MỤC ĐỐI TƯỢNG, DANH MỤC XE, VỊ TRÍ CÓ ID dựng từ ba danh mục cũ (dmLaoDong, dmXeVC, dmDoiTac — giữ nguyên làm bản lưu trữ,
   * không sửa); mọi lô CHƯA chốt / dừng: ID dòng (thành viên, xe, phiếu), chấm công theo ID thành viên, liên kết danh mục khi khớp DUY NHẤT, phiếu → hợp đồng + xe.
   * Dòng không tự liên kết được: giữ dữ liệu gốc, ghi “Cần đối chiếu” (lô.canDoiChieu; danh mục: meta canDoiChieu). Lô đã chốt / dừng không đổi (dấu vân tay giữ nguyên).
   * Chạy sau khi sao lưu file (Store.migrate); chạy lại không đổi (src/lienket.js chuyenDoi). Bản in của lô không đổi: lô giữ bản chụp, chỉ thêm ID. */
  function v15(db) {
    const LK = require('./lienket'), g = k => { const r = db.prepare('SELECT value FROM meta WHERE key=?').get(k); return r ? JSON.parse(r.value) : undefined; };
    const dm = k => db.prepare('SELECT 1 FROM danh_muc_bang WHERE kind=?').get(k) ? db.prepare('SELECT data FROM danh_muc WHERE kind=? ORDER BY ord').all(k).map(r => JSON.parse(r.data)) : (g(k) || undefined);
    const o = {rs: {}};
    ['dinhBien', 'dinhBienVer', 'dinhMuc', 'dinhMucBan', 'canDoiChieu'].forEach(k => { const v = g(k); if (v !== undefined) o[k] = v; });
    DM_BANG.forEach(k => { const v = dm(k); if (v !== undefined) o[k] = v; });
    const rows = db.prepare('SELECT id, owner_id, data FROM forests').all(), truoc = new Map();
    rows.forEach(r => { const f = JSON.parse(r.data); (o.rs[r.owner_id] = o.rs[r.owner_id] || {forests: {}}).forests[r.id] = f; truoc.set(r.id, r.data); });
    LK.chuyenDoi(o);
    const up = db.prepare('UPDATE forests SET data=?, hash=? WHERE id=?');
    rows.forEach(r => { const f = o.rs[r.owner_id].forests[r.id], data = JSON.stringify(f); if (data !== truoc.get(r.id)) up.run(data, sha(data), r.id); });
    const put = db.prepare('INSERT INTO danh_muc(kind,ord,data,hash) VALUES(?,?,?,?) ON CONFLICT(kind,ord) DO UPDATE SET data=excluded.data, hash=excluded.hash');
    ['dmDoiTuong', 'dmXe', 'dmViTri'].forEach(k => {
      db.prepare('DELETE FROM danh_muc WHERE kind=?').run(k);
      o[k].forEach((x, i) => { const data = JSON.stringify(x); put.run(k, i, data, sha(data)); });
      db.prepare('INSERT OR IGNORE INTO danh_muc_bang(kind) VALUES(?)').run(k);
    });
    db.prepare('INSERT INTO meta(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').run('canDoiChieu', JSON.stringify(o.canDoiChieu || []));
  }
];

const sha = s => crypto.createHash('sha1').update(s).digest('hex');
const LK = require('./lienket');
const DM_BANG = ['dmLaoDong', 'dmXeVC', 'dmDoiTac', 'dmDoiTuong', 'dmXe', 'dmViTri', 'dmNganh', 'dmChucVu'];
/* B5: tách gói đóng băng khỏi JSON của lô đã chốt. f = lô (đối tượng). Trả {f: lô không còn chot.goi, goi: {phienBan, hash, at, data} | null}. Không sửa f đầu vào. */
function tachGoi(f) {
  if (!f || !f.chot || typeof f.chot.goi !== 'string') return {f, goi: null};
  const V = require('./vongdoi'), chot = Object.assign({}, f.chot), data = chot.goi; delete chot.goi;
  if (!chot.hashDL) { const k = V.kiemGoi(chot, data, f.id); if (k.ok) chot.hashDL = k.bamDL; }   // gói hỏng / sai dấu vân tay: KHÔNG tính dấu vân tay mới; gói giữ nguyên ở chot_goi để đối chiếu
  return {f: Object.assign({}, f, {chot}), goi: {phienBan: Number(chot.phienBan) || 0, hash: String(chot.hash || ''), at: String(chot.at || ''), data}};
}   // danh mục lưu theo dòng ở bảng danh_muc (v13); trùng src/delta.js DM_BANG
const now = () => new Date().toISOString();

class Store {
  constructor(file, opts = {}) {
    this.file = file;
    this.backupDir = opts.backupDir || path.join(path.dirname(file), 'backups');
    this.log = opts.log || (() => {});
    this.migrations = opts.migrations || MIGRATIONS;
    this.target = this.migrations.length;
    const existed = file !== ':memory:' && fs.existsSync(file);
    this.db = new Database(file);
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('foreign_keys = ON');
    this.migrate(existed);
    this._bump();
  }

  migrate(existed) {
    const cur = this.db.pragma('user_version', {simple: true});
    if (cur > this.target) throw new Error('Cơ sở dữ liệu thuộc phiên bản mới hơn ứng dụng (v' + cur + '). Hãy cài bản ứng dụng mới hơn.');
    if (cur === this.target) return;
    // Có dữ liệu cũ thì sao lưu trước khi nâng cấp cấu trúc (lô 6, T-10: không sinh bản trùng khi nâng cấp lỗi mở lại nhiều lần, giữ tối đa 3 bản)
    if (existed && cur > 0) this.snapshotFile('truoc-nang-cap-v' + cur + '-len-v' + this.target, {dedupByHash: true, keep: 3});
    const run = this.db.transaction(() => {
      for (let v = cur; v < this.target; v++) { this.migrations[v](this.db); this.db.pragma('user_version = ' + (v + 1)); }
    });
    run();
  }

  /* opts.keep: chỉ giữ N bản gần nhất cùng tiền tố tag (bản tự động trước khi xóa), không đụng các bản khác; opts.dedupByHash: dùng lại bản cùng tag và cùng nội dung */
  snapshotFile(tag, opts = {}) {
    if (this.file === ':memory:') return null;
    fs.mkdirSync(this.backupDir, {recursive: true});
    this.db.pragma('wal_checkpoint(TRUNCATE)');
    const re = new RegExp('^' + tag + '-\\d{4}-.*\\.sqlite$');
    if (opts.dedupByHash) {
      const srcHash = crypto.createHash('sha256').update(fs.readFileSync(this.file)).digest('hex');
      const existing = fs.readdirSync(this.backupDir).filter(n => re.test(n)).sort().reverse();
      for (const n of existing) {
        const p = path.join(this.backupDir, n);
        try { if (crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex') === srcHash) return p; } catch (_) {}
      }
    }
    const out = path.join(this.backupDir, tag + '-' + now().replace(/[:.]/g, '-') + '.sqlite'), tmp = out + '.tmp-' + process.pid;
    try { fs.copyFileSync(this.file, tmp); fs.renameSync(tmp, out); }
    catch (e) { try { fs.unlinkSync(tmp); } catch (_) {} throw e; }
    if (opts.keep > 0) {
      const old = fs.readdirSync(this.backupDir).filter(n => re.test(n)).sort();
      old.slice(0, Math.max(0, old.length - opts.keep)).forEach(n => { try { fs.unlinkSync(path.join(this.backupDir, n)); } catch (e) { /* bỏ qua */ } });
    }
    return out;
  }

  /* Đọc toàn bộ dữ liệu thành đối tượng db của giao diện. opts.kemGoi: gắn lại gói đóng băng (chot.goi) cho lô đã chốt — dùng khi sao lưu ra file (bản sao lưu như trước B5) */
  load(opts) {
    const out = {v: 2, rs: {}};
    this.db.prepare('SELECT key, value FROM meta').all().forEach(r => { if (!r.key.startsWith('lk:')) out[r.key] = JSON.parse(r.value); }); // 'lk:' = dữ liệu của bản tra cứu, không thuộc hồ sơ
    if (this._coBangDM()) {
      const bang = new Set(this.db.prepare('SELECT kind FROM danh_muc_bang').all().map(r => r.kind));
      bang.forEach(k => { out[k] = []; });
      this.db.prepare('SELECT kind, data FROM danh_muc ORDER BY kind, ord').all().forEach(r => { if (bang.has(r.kind)) out[r.kind].push(JSON.parse(r.data)); });
    }
    out.congTy = {};
    this.db.prepare('SELECT id, data FROM companies').all().forEach(r => { out.congTy[r.id] = JSON.parse(r.data); });
    this.db.prepare('SELECT id, data FROM owners').all().forEach(r => { const o = JSON.parse(r.data); o.forests = {}; out.rs[r.id] = o; });
    this.db.prepare('SELECT id, owner_id, data FROM forests').all().forEach(r => { if (out.rs[r.owner_id]) out.rs[r.owner_id].forests[r.id] = JSON.parse(r.data); });
    if (opts && opts.kemGoi && this._coBangGoi()) Object.values(out.rs).forEach(o => Object.values(o.forests).forEach(f => { if (f.chot && f.chot.goi == null) { const g = this.docGoi(f.id, f.chot.phienBan); if (g) f.chot.goi = g.data; } }));
    return out;
  }
  _coBangGoi() { if (this._goiOk == null) this._goiOk = !!this.db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='chot_goi'").get(); return this._goiOk; }
  /* B5: đọc gói đóng băng của một lô (phiên bản chốt; bỏ trống = phiên bản mới nhất). Trả {phienBan, hash, at, data} hoặc null. */
  docGoi(forestId, phienBan) {
    if (!this._coBangGoi()) return null;
    const r = phienBan != null ? this.db.prepare('SELECT phien_ban, hash, at, data FROM chot_goi WHERE forest_id=? AND phien_ban=?').get(String(forestId), Number(phienBan))
      : this.db.prepare('SELECT phien_ban, hash, at, data FROM chot_goi WHERE forest_id=? ORDER BY phien_ban DESC LIMIT 1').get(String(forestId));
    return r ? {phienBan: r.phien_ban, hash: r.hash, at: r.at, data: r.data} : null;
  }
  /* KIỂM GÓI ĐÃ CHỐT của một lô ngay trên SQLite (src/vongdoi.js kiemGoi): đọc chot của lô và gói đúng phiên bản. Trả kết quả kiemGoi (không kèm dữ liệu gói), {ma:'chua-chot'} nếu lô chưa chốt.
   * Gói còn nằm trong JSON lô (bản chưa nâng cấp, chạy trong bộ nhớ) cũng được kiểm. Không sửa gì. */
  kiemGoi(forestId) {
    const V = require('./vongdoi'), row = this.db.prepare('SELECT data FROM forests WHERE id=?').get(String(forestId));
    if (!row) return {ok: false, ma: 'thieu-goi', lyDo: 'Không có lô ' + forestId};
    let f; try { f = JSON.parse(row.data); } catch (e) { return {ok: false, ma: 'json-hong', lyDo: 'Dữ liệu lô không đọc được'}; }
    if (!f.chot) return {ok: true, ma: 'chua-chot', lyDo: ''};
    const g = typeof f.chot.goi === 'string' ? f.chot.goi : ((this.docGoi(f.id || forestId, f.chot.phienBan) || {}).data);
    const k = V.kiemGoi(f.chot, g, f.id || forestId); return {ok: k.ok, ma: k.ma, lyDo: k.lyDo, bamDL: k.bamDL, phienBan: f.chot.phienBan || null, hash: f.chot.hash || ''};
  }
  /* LỊCH SỬ BẢN CHỤP của một lô: mọi phiên bản chốt còn lưu ở chot_goi, mỗi bản được kiểm riêng (JSON đọc được, đúng cấu trúc, dấu vân tay tính từ chính chuỗi gói khớp dấu vân tay ghi lúc chốt
   * và khớp nhật ký vòng đời của lô nếu có). Trả [{phienBan, hash, at, bytes, ok, ma, lyDo, hienHanh}] — không kèm dữ liệu, không sửa gì. */
  lichSuGoi(forestId) {
    if (!this._coBangGoi()) return [];
    const V = require('./vongdoi'), fid = String(forestId), row = this.db.prepare('SELECT data FROM forests WHERE id=?').get(fid);
    let f = null; try { f = row ? JSON.parse(row.data) : null; } catch (e) { f = null; }
    const nk = (f && Array.isArray(f.nhatKy) ? f.nhatKy : []).filter(x => x.hanh === 'chot'), hh = f && f.chot ? f.chot.phienBan : null;
    return this.db.prepare('SELECT phien_ban, hash, at, data FROM chot_goi WHERE forest_id=? ORDER BY phien_ban').all(fid).map(r => {
      const k = V.kiemGoi({hash: r.hash}, r.data, fid), ghi = nk.find(x => x.phienBan === r.phien_ban);
      const lech = k.ok && ghi && ghi.hash && ghi.hash !== r.hash ? 'Dấu vân tay của bản chụp (' + r.hash + ') khác dấu vân tay ghi trong nhật ký lúc chốt (' + ghi.hash + ')' : '';
      return {phienBan: r.phien_ban, hash: r.hash, at: r.at, bytes: r.data.length, ok: k.ok && !lech, ma: lech ? 'hash-khong-khop' : k.ma, lyDo: lech || k.lyDo, hienHanh: r.phien_ban === hh};
    });
  }
  /* các phiên bản gói đã lưu của một lô (không kèm dữ liệu) */
  dsGoi(forestId) { return this._coBangGoi() ? this.db.prepare('SELECT phien_ban phienBan, hash, at, length(data) bytes FROM chot_goi WHERE forest_id=? ORDER BY phien_ban').all(String(forestId)) : []; }
  /* lô đang ghi có chot.goi (vừa chốt, hoặc nạp từ bản sao lưu): ghi gói vào chot_goi, JSON lô bỏ goi. Gọi TRONG giao dịch (dòng gói ghi cùng lô). */
  _tachGoiKhiGhi(row) {
    if (!this._coBangGoi() || row.data.indexOf('"goi":') < 0) return row;
    const x = tachGoi(JSON.parse(row.data)); if (!x.goi) return row;
    const data = JSON.stringify(x.f);
    return Object.assign({}, row, {data, hash: sha(data), goi: x.goi});
  }
  _ghiGoi(fid, g) { if (g) (this._goiPut || (this._goiPut = this.db.prepare('INSERT INTO chot_goi(forest_id,phien_ban,hash,at,data) VALUES(?,?,?,?,?) ON CONFLICT(forest_id,phien_ban) DO UPDATE SET hash=excluded.hash, at=excluded.at, data=excluded.data'))).run(fid, g.phienBan, g.hash, g.at, g.data); }

  isEmpty() { return this.db.prepare('SELECT COUNT(*) c FROM owners').get().c === 0; }

  /* Câu lệnh ghi dùng chung cho save và saveDelta */
  _stmts() {
    if (this._st) return this._st;
    this._st = {
      upO: this.db.prepare(`INSERT INTO owners(id,ma,ten,cccd,data,hash,updated_at) VALUES(@id,@ma,@ten,@cccd,@data,@hash,@t)
        ON CONFLICT(id) DO UPDATE SET ma=@ma,ten=@ten,cccd=@cccd,data=@data,hash=@hash,updated_at=@t`),
      upF: this.db.prepare(`INSERT INTO forests(id,owner_id,ma_rung,ten_rung,data,hash,updated_at) VALUES(@id,@owner_id,@ma_rung,@ten_rung,@data,@hash,@t)
        ON CONFLICT(id) DO UPDATE SET owner_id=@owner_id,ma_rung=@ma_rung,ten_rung=@ten_rung,data=@data,hash=@hash,updated_at=@t`),
      upC: this.db.prepare(`INSERT INTO companies(id,ten,mst,data,hash,updated_at) VALUES(@id,@ten,@mst,@data,@hash,@t)
        ON CONFLICT(id) DO UPDATE SET ten=@ten,mst=@mst,data=@data,hash=@hash,updated_at=@t`),
      delO: this.db.prepare('DELETE FROM owners WHERE id=?'), delF: this.db.prepare('DELETE FROM forests WHERE id=?'), delC: this.db.prepare('DELETE FROM companies WHERE id=?'),
      putMeta: this.db.prepare('INSERT INTO meta(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value')
    };
    return this._st;
  }
  _coBangDM() { if (this._dmOk == null) this._dmOk = !!this.db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='danh_muc'").get(); return this._dmOk; }
  /* ghi một danh mục theo dòng: chỉ dòng có băm khác, bỏ dòng thừa ở cuối. rows = mảng; null = bỏ danh mục. Trả số dòng đã ghi / xóa. Gọi TRONG giao dịch. */
  _ghiDM(k, rows) {
    if (!rows) { const n = this.db.prepare('DELETE FROM danh_muc WHERE kind=?').run(k).changes; this.db.prepare('DELETE FROM danh_muc_bang WHERE kind=?').run(k); return n; }
    const have = new Map(this.db.prepare('SELECT ord, hash FROM danh_muc WHERE kind=?').all(k).map(r => [r.ord, r.hash])), up = this._dmUp || (this._dmUp = this.db.prepare('INSERT INTO danh_muc(kind,ord,data,hash) VALUES(?,?,?,?) ON CONFLICT(kind,ord) DO UPDATE SET data=excluded.data, hash=excluded.hash'));
    let n = 0;
    rows.forEach((r, i) => { const data = typeof r === 'string' ? r : JSON.stringify(r), h = sha(data); if (have.get(i) !== h) { up.run(k, i, data, h); n++; } });
    n += this.db.prepare('DELETE FROM danh_muc WHERE kind=? AND ord>=?').run(k, rows.length).changes;
    this.db.prepare('INSERT OR IGNORE INTO danh_muc_bang(kind) VALUES(?)').run(k);
    return n;
  }
  /* Danh mục công ty (db.congTy) và các khóa meta: ghi theo đúng trạng thái trong `side` (như lưu toàn bộ). Gọi TRONG giao dịch. */
  _writeSide(side, t) {
    const st = this._stmts(); let changed = 0;
    const comps = Object.entries(side.congTy || {}).map(([id, c]) => { const o = {...c, id: c.id || id}, data = JSON.stringify(o); return {id: o.id, ten: String(o.ten || ''), mst: String(o.mst || ''), data, hash: sha(data)}; });
    const haveC = new Map(this.db.prepare('SELECT id, hash FROM companies').all().map(r => [r.id, r.hash]));
    comps.forEach(c => { if (haveC.get(c.id) !== c.hash) { st.upC.run({...c, t}); changed++; } });
    const keepC = new Set(comps.map(c => c.id));
    haveC.forEach((h, id) => { if (!keepC.has(id)) { st.delC.run(id); changed++; } });
    const dmBang = this._coBangDM(), laDM = k => dmBang && DM_BANG.includes(k) && Array.isArray(side[k]);
    if (dmBang) DM_BANG.forEach(k => { changed += this._ghiDM(k, laDM(k) ? side[k] : null); });   // danh mục theo dòng; không phải mảng thì lưu ở meta như cũ
    const metaKeys = Object.keys(side).filter(k => k !== 'rs' && k !== 'v' && k !== 'congTy' && !laDM(k));
    this.db.prepare("DELETE FROM meta WHERE key NOT LIKE 'lk:%' AND key NOT IN (" + (metaKeys.map(() => '?').join(',') || "''") + ')').run(...metaKeys);
    metaKeys.forEach(k => st.putMeta.run(k, JSON.stringify(side[k])));
    return changed;
  }
  /* B6: ghi phần ngoài hồ sơ THEO PHẦN THAY ĐỔI (src/delta.js diffSide): 'm:<khóa meta>', 'c:<id công ty>', 'd:<danh mục>' ('#số dòng'), 'd:<danh mục>:<thứ tự>'.
   * Kiểm tra trước khi ghi: khóa đúng dạng, JSON đọc được (sai → MISMATCH, giao diện lưu toàn bộ). Gọi TRONG giao dịch. */
  _writeSideDelta(sd, t) {
    const bad = m => { throw Object.assign(new Error('Dữ liệu lưu theo phần thay đổi không hợp lệ: ' + m), {code: 'MISMATCH'}); };
    const set = sd && typeof sd.set === 'object' && sd.set ? sd.set : {}, del = Array.isArray(sd && sd.del) ? sd.del.map(String) : [];
    const st = this._stmts(), dmBang = this._coBangDM(); let changed = 0;
    const dmUp = this.db.prepare('INSERT INTO danh_muc(kind,ord,data,hash) VALUES(?,?,?,?) ON CONFLICT(kind,ord) DO UPDATE SET data=excluded.data, hash=excluded.hash');
    const parse = (k, j) => { if (typeof j !== 'string') bad(k); try { return JSON.parse(j); } catch (e) { return bad(k); } };
    const dm = k => { const m = /^d:([A-Za-z]+)(?::(\d+))?$/.exec(k); if (!m || !DM_BANG.includes(m[1]) || !dmBang) bad(k); return {kind: m[1], ord: m[2] == null ? null : +m[2]}; };
    del.forEach(k => {
      if (k.startsWith('m:')) { if (k.startsWith('m:lk:')) bad(k); changed += this.db.prepare('DELETE FROM meta WHERE key=?').run(k.slice(2)).changes; }
      else if (k.startsWith('c:')) changed += st.delC.run(k.slice(2)).changes;
      else if (k.startsWith('d:')) { const x = dm(k); if (x.ord == null) changed += this._ghiDM(x.kind, null); else changed += this.db.prepare('DELETE FROM danh_muc WHERE kind=? AND ord=?').run(x.kind, x.ord).changes; }
      else bad(k);
    });
    Object.entries(set).forEach(([k, j]) => {
      if (k.startsWith('m:')) {
        const key = k.slice(2); if (!key || key === 'rs' || key === 'v' || key === 'congTy' || key.startsWith('lk:')) bad(k); parse(k, j);
        st.putMeta.run(key, j); if (dmBang && DM_BANG.includes(key)) this._ghiDM(key, null); changed++;
      } else if (k.startsWith('c:')) {
        const c = parse(k, j); if (!c || typeof c !== 'object' || String(c.id) !== k.slice(2)) bad(k);
        st.upC.run({id: k.slice(2), ten: String(c.ten || ''), mst: String(c.mst || ''), data: j, hash: sha(j), t}); changed++;
      } else if (k.startsWith('d:')) {
        const x = dm(k);
        if (x.ord == null) { const n = /^#(\d+)$/.exec(j); if (!n) bad(k); changed += this.db.prepare('DELETE FROM danh_muc WHERE kind=? AND ord>=?').run(x.kind, +n[1]).changes; this.db.prepare('INSERT OR IGNORE INTO danh_muc_bang(kind) VALUES(?)').run(x.kind); this.db.prepare('DELETE FROM meta WHERE key=?').run(x.kind); }
        else { parse(k, j); dmUp.run(x.kind, x.ord, j, sha(j)); changed++; }
      } else bad(k);
    });
    if (dmBang) DM_BANG.forEach(k => {   // số dòng của mỗi danh mục phải liền mạch 0..n-1 (ảnh chụp lệch → hoàn tác, lưu toàn bộ)
      const r = this.db.prepare('SELECT COUNT(*) c, MAX(ord) m FROM danh_muc WHERE kind=?').get(k);
      if (r.c && r.m !== r.c - 1) bad('danh mục ' + k + ' thiếu dòng');
    });
    return changed;
  }
  /* KIỂM QUAN HỆ (3.0, src/quanhe.js): hợp đồng thuộc đúng rừng, thành viên thuộc đúng đội, xe thuộc đúng hợp đồng, phiếu dùng đúng xe của hợp đồng.
   * Gọi TRƯỚC giao dịch: có lỗi thì không ghi gì (mã QUAN_HE); giao diện giữ dữ liệu đang nhập để sửa và lưu lại. */
  _kiemQuanHe(lots) {
    const QH = require('./quanhe'), loi = [];
    (lots || []).forEach(f => QH.kiem(f).forEach(x => loi.push(x)));
    if (loi.length) throw Object.assign(new Error('Dữ liệu chưa đúng quan hệ nên chưa ghi: ' + loi.slice(0, 5).join('; ') + (loi.length > 5 ? ' (và ' + (loi.length - 5) + ' lỗi khác)' : '') + '. Dữ liệu đang nhập vẫn còn để sửa.'), {code: 'QUAN_HE', loi});
  }
  /* Chủ rừng còn TRỐNG HOÀN TOÀN trong SQLite (bấm "+ Chủ rừng mới" nhưng chưa nhập thông tin nào và chưa có lô rừng nào):
   * không tính vào giới hạn chặn xóa hàng loạt (giao diện tự dọn các dòng rỗng cũ khi mở cột trái) và không sinh bản sao lưu truoc-xoa thừa. */
  _chuRong(oid) {
    const id = String(oid);
    if (this.db.prepare('SELECT 1 FROM forests WHERE owner_id=? LIMIT 1').get(id)) return false;
    const row = this.db.prepare('SELECT ma, ten, cccd, data FROM owners WHERE id=?').get(id);
    if (!row) return true;
    if (String(row.ma || '').trim() || String(row.ten || '').trim() || String(row.cccd || '').trim()) return false;
    try {
      return require('./model').chuRongTrong(JSON.parse(row.data));
    } catch (e) { return false; }
  }
  _guardDelete(goneO, goneF, opts) {
    const thatO = (goneO || []).filter(id => !this._chuRong(id));
    if (thatO.length >= 2 && !opts.allowBulkDelete) {
      const owner = this.db.prepare('SELECT ten FROM owners WHERE id=?');
      const forests = this.db.prepare('SELECT COUNT(*) AS total FROM forests WHERE owner_id=?');
      const blockedOwners = thatO.map(id => ({name: owner.get(String(id))?.ten || '', forests: forests.get(String(id))?.total || 0}));
      throw Object.assign(new Error('Đã chặn lưu vì lần ghi sẽ xóa ' + thatO.length + ' hồ sơ chủ rừng.'), {code: 'BULK_DELETE', blockedOwners});
    }
    if (thatO.length || (goneF && goneF.length)) { try { this.snapshotFile('truoc-xoa', {keep: 20}); } catch (e) { throw new Error('Không sao lưu được trước khi xóa nên chưa ghi: ' + e.message); } }
  }
  /* KHÓA CHỈ ĐỌC Ở TẦNG LƯU (mã LOCKED): lô đang chốt hoặc dừng trong cơ sở dữ liệu không nhận thay đổi dữ liệu, trừ các khóa vòng đời (chot, luuTru, dung, nhatKy: chốt, mở khóa,
   * lưu trữ, dừng, mở lại). rowsF: các lô sẽ ghi {id, data}. Gọi TRƯỚC khi ghi: có vi phạm thì không ghi gì. */
  _kiemKhoa(rowsF, xoaF, xoaO) {
    const V = require('./vongdoi'), M = require('./model'), get = this.db.prepare('SELECT data FROM forests WHERE id=?'), bad = [];
    const gone = new Set((xoaF || []).map(String));   // xóa lô (hoặc cả chủ rừng) đang chốt / dừng cũng phải mở khóa trước
    (xoaO || []).forEach(oid => this.db.prepare('SELECT id FROM forests WHERE owner_id=?').all(String(oid)).forEach(r => gone.add(r.id)));
    gone.forEach(id => { const row = get.get(id); if (!row) return; try { const f = JSON.parse(row.data); if (V.chiDoc(f)) bad.push((f.info && f.info.maRung) || id); } catch (e) { /* dòng hỏng: không chặn */ } });
    rowsF.forEach(r => {
      const row = get.get(r.id); if (!row) return;
      let cu, moi; try { cu = JSON.parse(row.data); moi = JSON.parse(r.data); } catch (e) { return; }
      const cuN = M.needsEnsure(cu) ? M.ensureForest(cu) : cu; if (!V.chiDoc(moi)) LK.chuanLo(cuN, {batKe: true});   // 3.0: ID dòng gán tất định — lô vừa mở khóa được gán ID trong cùng lần lưu, không tính là sửa dữ liệu
      if (V.viPhamKhoa(cuN, moi)) bad.push((moi.info && moi.info.maRung) || r.id);
    });
    if (bad.length) throw Object.assign(new Error('Lô ' + bad.slice(0, 5).join(', ') + (bad.length > 5 ? '…' : '') + ' đã chốt hoặc đã dừng (chỉ đọc): không ghi thay đổi dữ liệu. Mở khóa (nhập lý do) hoặc mở lại lô trước khi sửa.'), {code: 'LOCKED', lots: bad});
  }
  /* Phiên bản dữ liệu trong phiên làm việc: đổi sau MỖI lần ghi hồ sơ (save, saveDelta, khôi phục...). Giao diện chỉ được lưu theo phần thay đổi
   * khi ảnh chụp của nó ứng đúng phiên bản này (src/delta.js); khác thì lưu toàn bộ. */
  _bump() { this.rev = crypto.randomUUID(); return this.rev; }

  /* Ghi đối tượng db của giao diện: chỉ ghi các dòng đã đổi, trong một giao dịch. Lỗi thì không đổi gì.
   * Bảo vệ chống mất dữ liệu: db phải có rs là đối tượng (không nhận {} / null); xóa từ 2 chủ rừng trở lên trong MỘT lần lưu bị từ chối
   * trừ khi opts.allowBulkDelete (khôi phục 'replace'); lần lưu nào có xóa chủ rừng hoặc lô rừng đều sao lưu file trước khi ghi. */
  save(db, opts = {}) {
    if (!db || typeof db !== 'object' || !db.rs || typeof db.rs !== 'object' || Array.isArray(db.rs)) throw new Error('Dữ liệu lưu không hợp lệ (thiếu danh sách chủ rừng). Không ghi gì để tránh mất dữ liệu.');
    const rows = this.explode(db);
    const have = new Map(this.db.prepare('SELECT id, hash FROM owners').all().map(r => [r.id, r.hash]));
    // so cả chủ của lô: chuyển lô sang chủ rừng khác mà nội dung không đổi vẫn phải cập nhật owner_id (trước đây bị bỏ qua, mở lại lô quay về chủ cũ)
    const haveF = new Map(this.db.prepare('SELECT id, hash, owner_id FROM forests').all().map(r => [r.id, r.hash + '|' + r.owner_id]));
    const keepO = new Set(rows.owners.map(o => o.id)), keepF = new Set(rows.forests.map(f => f.id));
    let goneO = [...have.keys()].filter(id => !keepO.has(id)), goneF = [...haveF.keys()].filter(id => !keepF.has(id));
    if (opts.preserveMissingOwners) {
      const explicitDel = new Set(Array.isArray(opts.delO) ? opts.delO.map(String) : []);
      goneO = goneO.filter(id => explicitDel.has(String(id)));
      goneF = goneF.filter(id => {
        const row = this.db.prepare('SELECT owner_id FROM forests WHERE id=?').get(id);
        return row && (keepO.has(row.owner_id) || explicitDel.has(String(row.owner_id)));
      });
    }
    this._guardDelete(goneO, goneF, opts);
    if (!opts.boQuaKhoa) this._kiemKhoa(rows.forests.filter(f => haveF.has(f.id) && haveF.get(f.id) !== f.hash + '|' + f.owner_id), goneF, goneO);
    const st = this._stmts(), t = now(); let changed = 0, goiCu = 0;
    this.db.transaction(() => {
      changed += this._writeSide(db, t);
      rows.owners.forEach(o => { if (have.get(o.id) !== o.hash) { st.upO.run({...o, t}); changed++; } });
      rows.forests.forEach(f => { this._ghiGoi(f.id, f.goi); if (haveF.get(f.id) !== f.hash + '|' + f.owner_id) { const {goi: _g, ...r} = f; st.upF.run({...r, t}); changed++; } });
      goneO.forEach(id => { st.delO.run(id); changed++; });
      goneF.forEach(id => { if (haveF.has(id)) { st.delF.run(id); changed++; } });
      if (this._coBangGoi() && (goneO.length || goneF.length || !keepF.size)) this.db.prepare('DELETE FROM chot_goi WHERE forest_id NOT IN (SELECT id FROM forests)').run();
      /* LỊCH SỬ BẢN CHỤP đi kèm (khôi phục từ bản .sqlite, src/khosaoluu.js): bản chụp của các lần chốt TRƯỚC được chép trong CÙNG giao dịch với hồ sơ, chỉ cho lô còn
       * trong dữ liệu vừa ghi, không ghi đè bản đã có. Lỗi ở đây hoàn tác cả lần ghi: không có trạng thái "hồ sơ đã thay nhưng thiếu lịch sử". */
      if (Array.isArray(opts.goiLichSu) && opts.goiLichSu.length && this._coBangGoi()) {
        const put = this.db.prepare('INSERT OR IGNORE INTO chot_goi(forest_id,phien_ban,hash,at,data) VALUES(?,?,?,?,?)');
        opts.goiLichSu.forEach(g => { if (keepF.has(String(g.forest_id))) goiCu += put.run(String(g.forest_id), g.phien_ban, g.hash, g.at, g.data).changes; });
      }
    })();
    const preservedO = [...have.keys()].filter(id => !keepO.has(id) && !goneO.includes(id));
    const preservedOwners = preservedO.map(id => {
      const row = this.db.prepare('SELECT ten FROM owners WHERE id=?').get(id);
      const cnt = this.db.prepare('SELECT COUNT(*) AS c FROM forests WHERE owner_id=?').get(id);
      return {id, name: row?.ten || '', forests: cnt?.c || 0};
    });
    return {changed, at: t, rev: this._bump(), mode: 'full', goiCu, preservedOwners};
  }

  /* Lưu theo phần thay đổi (src/delta.js). d = {rev, upO: {id: json}, upF: {id: {owner, json}}, delO: [id], delF: [id], side, counts: {owners, forests}}.
   * - d.rev phải khớp phiên bản hiện tại (STALE nếu không): ảnh chụp của giao diện ứng đúng trạng thái đang có trong cơ sở dữ liệu;
   * - cùng các bảo vệ như lưu toàn bộ (chặn xóa hàng loạt, sao lưu trước khi xóa); JSON từng dòng phải đọc được và đúng mã;
   * - sau khi ghi, số chủ rừng và lô rừng phải bằng đúng số giao diện đang có (MISMATCH nếu lệch) — lệch thì hoàn tác cả giao dịch.
   * Giao diện gặp STALE / MISMATCH thì tự lưu toàn bộ, nên không mất thay đổi nào. */
  saveDelta(d, opts = {}) {
    if (!d || typeof d !== 'object' || typeof d.rev !== 'string') throw Object.assign(new Error('Dữ liệu lưu theo phần thay đổi không hợp lệ.'), {code: 'MISMATCH'});
    if (d.rev !== this.rev) throw Object.assign(new Error('Dữ liệu trên máy đã đổi từ nơi khác (khôi phục, đổi thư mục...): cần lưu toàn bộ.'), {code: 'STALE'});
    const upO = d.upO && typeof d.upO === 'object' ? d.upO : {}, upF = d.upF && typeof d.upF === 'object' ? d.upF : {};
    const delO = Array.isArray(d.delO) ? d.delO.map(String) : [], delF = Array.isArray(d.delF) ? d.delF.map(String) : [];
    const counts = d.counts || {}, side = d.side && typeof d.side === 'object' ? d.side : {}, sideD = d.sideD && typeof d.sideD === 'object' ? d.sideD : null;
    const bad = m => { throw Object.assign(new Error('Dữ liệu lưu theo phần thay đổi không hợp lệ: ' + m), {code: 'MISMATCH'}); };
    if (!Number.isInteger(counts.owners) || !Number.isInteger(counts.forests)) bad('thiếu số đếm');
    const rowsO = Object.entries(upO).map(([id, json]) => {
      let o; try { o = JSON.parse(json); } catch (e) { bad('chủ rừng ' + id); }
      if (!o || typeof o !== 'object' || o.id !== id || 'forests' in o) bad('chủ rừng ' + id);
      const info = o.info || {};
      return {id, ma: String(info.ma || ''), ten: String(info.ten || ''), cccd: String(info.cccd || ''), data: json, hash: sha(json)};
    });
    const M = require('./model');
    const rowsF = Object.entries(upF).map(([id, v]) => {
      let f; try { f = JSON.parse(v && v.json); } catch (e) { bad('lô ' + id); }
      if (!f || typeof f !== 'object' || (f.id || id) !== id || !v.owner || delO.includes(String(v.owner))) bad('lô ' + id);
      if (M.needsEnsure(f)) f = M.ensureForest(f);
      if (LK.canChuan(f)) LK.chuanLo(f);
      const json = JSON.stringify(f) === v.json ? v.json : JSON.stringify(f);   // chuẩn hóa đội, ID dòng như lưu toàn bộ
      const fi = f.info || {};
      return this._tachGoiKhiGhi({id, owner_id: String(v.owner), ma_rung: String(fi.maRung || ''), ten_rung: String(fi.tenRung || ''), data: json, hash: sha(json)});
    });
    if (delF.some(id => id in upF) || delO.some(id => id in upO)) bad('vừa sửa vừa xóa cùng một dòng');
    this._kiemQuanHe(Object.values(upF).map(v => { try { return JSON.parse(v.json); } catch (e) { return null; } }).filter(Boolean));
    this._guardDelete(delO, delF, opts);
    if (!opts.boQuaKhoa) this._kiemKhoa(rowsF, delF, delO);
    const st = this._stmts(), t = now(); let changed = 0;
    const tx = this.db.transaction(() => {
      changed += sideD ? this._writeSideDelta(sideD, t) : this._writeSide(side, t);   // B6: phần ngoài hồ sơ theo phần thay đổi (danh mục theo dòng)
      rowsO.forEach(o => { st.upO.run({...o, t}); changed++; });
      rowsF.forEach(f => { this._ghiGoi(f.id, f.goi); const {goi: _g, ...r} = f; st.upF.run({...r, t}); changed++; });
      delF.forEach(id => { changed += st.delF.run(id).changes; });
      delO.forEach(id => { changed += st.delO.run(id).changes; });
      if (this._coBangGoi() && (delF.length || delO.length)) this.db.prepare('DELETE FROM chot_goi WHERE forest_id NOT IN (SELECT id FROM forests)').run();
      const n = this.db.prepare('SELECT (SELECT COUNT(*) FROM owners) o, (SELECT COUNT(*) FROM forests) f').get();
      if (n.o !== counts.owners || n.f !== counts.forests) bad('sau khi ghi có ' + n.o + ' chủ / ' + n.f + ' lô, giao diện có ' + counts.owners + ' / ' + counts.forests);
    });
    try { tx(); } catch (e) { if (/FOREIGNKEY|FOREIGN KEY/i.test(String(e.code) + e.message)) bad('lô gắn với chủ rừng không có'); throw e; }   // lệch ảnh chụp → giao diện lưu toàn bộ
    return {changed, at: t, rev: this._bump(), mode: 'delta'};
  }

  /* Mã nội bộ (id) chủ rừng và lô rừng là khóa chính: trùng thì bản sau ghi đè bản trước trong SQLite → dừng và báo, không ghi gì */
  explode(db) {
    const M = require('./model');
    const owners = [], forests = [], seenO = new Map(), seenF = new Map(), dups = [], kiemLo = [];
    Object.entries(db.rs || {}).forEach(([id, o]) => {
      if (!o || typeof o !== 'object') throw new Error('Hồ sơ chủ rừng "' + id + '" không hợp lệ. Không ghi gì.');
      const {forests: fs_, ...rest} = o; rest.id = rest.id || id;
      if (seenO.has(rest.id)) dups.push('chủ rừng ' + rest.id); seenO.set(rest.id, true);
      const data = JSON.stringify(rest), info = rest.info || {};
      owners.push({id: rest.id, ma: String(info.ma || ''), ten: String(info.ten || ''), cccd: String(info.cccd || ''), data, hash: sha(data)});
      Object.entries(fs_ || {}).forEach(([fid, f0]) => {
        let f = M.needsEnsure(f0) ? M.ensureForest(f0) : f0;   // mọi lô ghi xuống đều có đội và mọi nhân công có doiId (tiến trình chính là nơi có thẩm quyền)
        if (LK.canChuan(f)) { if (f === f0) f = JSON.parse(JSON.stringify(f0)); LK.chuanLo(f); }   // 3.0: ID dòng, chấm công theo ID thành viên (lô chưa khóa)
        const fd = JSON.stringify(f), fi = f.info || {}, idF = f.id || fid;
        if (seenF.has(idF)) dups.push('lô ' + idF + ' (' + (fi.maRung || '') + ') ở chủ ' + seenF.get(idF) + ' và ' + rest.id); seenF.set(idF, rest.id);
        kiemLo.push(f);
        forests.push(this._tachGoiKhiGhi({id: idF, owner_id: rest.id, ma_rung: String(fi.maRung || ''), ten_rung: String(fi.tenRung || ''), data: fd, hash: sha(fd)}));
      });
    });
    if (dups.length) throw Object.assign(new Error('Trùng mã nội bộ: ' + dups.slice(0, 5).join('; ') + (dups.length > 5 ? '…' : '') + '. Không ghi gì để tránh mất hồ sơ; hãy khôi phục lại với lựa chọn "Giữ cả hai" để cấp mã mới.'), {code: 'DUP_ID'});
    this._kiemQuanHe(kiemLo);
    return {owners, forests};
  }

  /* Đếm số liệu để hiển thị trước khi nhập/khôi phục */
  static counts(db) {
    const c = {owners: 0, forests: 0, nc: 0, dx: 0, pc: 0, companies: Object.keys((db && db.congTy) || {}).length};
    Object.values((db && db.rs) || {}).forEach(o => {
      c.owners++;
      Object.values(o.forests || {}).forEach(f => { c.forests++; c.nc += (f.nc || []).length; c.dx += (f.dx || []).length; c.pc += (f.pc || []).length; });
    });
    return c;
  }

  /* Lô 2 (T-11): kiểm cấu trúc/phiên bản bản sao lưu toàn bộ (LoRung.kiemSaoLuu) và chuẩn "v"; lỗi → ném lỗi tiếng Việt, chưa đụng dữ liệu.
   * Dữ liệu v1 (chưa có rừng) không nhập trực tiếp ở đây: giao diện chuyển sang v2 trước (migrateV1). File thiếu "v" mà đã có rừng được coi là v2. */
  static kiemNhap(incoming) {
    const k = LoRung.kiemSaoLuu(incoming);
    if (!k.ok) throw Object.assign(new Error(k.error), {code: 'CAU_TRUC'});
    if (k.v1) throw Object.assign(new Error('File là bản sao lưu định dạng cũ (v1): hãy khôi phục qua nút “Khôi phục toàn bộ dữ liệu” để phần mềm chuyển định dạng trước. Dữ liệu trên máy chưa bị thay đổi.'), {code: 'CAU_TRUC'});
    return incoming.v === 2 ? incoming : Object.assign({}, incoming, {v: 2});
  }

  /* Xem trước nhập bản sao lưu toàn bộ: số liệu + từng chủ/lô sẽ được THÊM, THAY hay GIỮ. Dùng cùng planImport với bước ghi (src/lorung.js). */
  previewImport(incoming, opts) {
    incoming = Store.kiemNhap(incoming);
    const cur = this.load();
    const plan = LoRung.planImport(cur, incoming, opts);
    const dup = [];
    plan.owners.forEach(o => {
      if (o.state === 'trung') dup.push({kind: 'owner', incoming: o.id, existing: o.existingId, ten: o.ten, forests: o.forests.length});
      o.forests.forEach(f => { if (f.state === 'trung') dup.push({kind: 'forest', incoming: f.id, existing: f.existing, ma: f.ma, ten: f.ten}); });
    });
    return {incoming: Store.counts(incoming), existing: Store.counts(cur), duplicates: dup, plan};
  }

  /* Nhập bản sao lưu toàn bộ. strategy: 'replace' thay toàn bộ dữ liệu | 'skip' giữ bản hiện có, chỉ thêm mới | 'overwrite' thay ĐÚNG các lô trùng, giữ lô khác của chủ | 'both' giữ cả hai.
   * Hồ sơ mâu thuẫn (ID, mã lô, chủ rừng chỉ về các bản ghi khác nhau) → dừng, không ghi. Luôn sao lưu file SQLite trước; ghi trong một giao dịch nên lỗi thì dữ liệu cũ còn nguyên. */
  applyImport(incoming, strategy, opts) {
    incoming = Store.kiemNhap(incoming);   // lô 2 (T-11): cấu trúc và phiên bản kiểm TRƯỚC khi sao lưu hay ghi
    /* phiếu #11: bản .json sao lưu toàn bộ mang LỊCH SỬ BẢN CHỤP (incoming.goiLichSu, mọi dòng chot_goi). Tách khỏi dữ liệu hồ sơ (không ghi vào meta),
     * mỗi bản chụp phải đúng dấu vân tay (hash = bam(data), JSON đọc được) mới được chép; bản hỏng bị bỏ qua và báo số lượng. */
    let lsFile = null, lsBoQua = 0;
    if (Array.isArray(incoming.goiLichSu)) {
      const V = require('./vongdoi');
      lsFile = incoming.goiLichSu.filter(g => {
        const tot = g && typeof g === 'object' && g.forest_id != null && Number.isInteger(g.phien_ban) && typeof g.data === 'string' && typeof g.hash === 'string' &&
          V.bam(g.data) === g.hash && (() => { try { const x = JSON.parse(g.data); return !!x && typeof x === 'object' && !Array.isArray(x); } catch (e) { return false; } })();
        if (!tot) lsBoQua++;
        return tot;
      });
      incoming = Object.assign({}, incoming); delete incoming.goiLichSu;
    }
    // hồ sơ đã chốt trong file phải toàn vẹn (gói, dấu vân tay, dữ liệu) với MỌI cách xử lý, kể cả thay toàn bộ: lỗi thì dừng trước khi sao lưu hay ghi
    const hong = []; Object.values(incoming.rs || {}).forEach(o => Object.values((o && o.forests) || {}).forEach(f => { const e = LoRung.loiToanVen(f); if (e) hong.push(e); }));
    if (hong.length) throw Object.assign(new Error(hong.slice(0, 3).map(e => e.moTa).join(' | ') + (hong.length > 3 ? ' (và ' + (hong.length - 3) + ' lô khác)' : '') + ' Dữ liệu trên máy chưa bị thay đổi.'), {code: 'GOI_HONG', lots: hong.map(e => e.toanVen)});
    const cur = this.load();
    let next, nhan = null;   // nhan: ID lô trong file → ID lô đích, chỉ các lô THỰC SỰ lấy từ file (để chép lịch sử bản chụp đúng lô)
    if (strategy === 'replace') {
      next = structuredClone(incoming);
      if (!('congTy' in next)) next.congTy = cur.congTy || {}; // bản sao lưu cũ chưa có danh mục công ty
      if (!LK.daChuyen(next)) LK.chuyenDoi(next);
    } else {
      if (!['skip', 'overwrite', 'both'].includes(strategy)) throw new Error('Cách xử lý không hợp lệ: ' + strategy);
      const mg = LoRung.mergeImport(cur, incoming, strategy, null, opts || {});     // ném lỗi nếu có hồ sơ mâu thuẫn, trước khi sao lưu hay ghi
      next = mg.next; nhan = new Map();
      mg.plan.owners.forEach(en => en.forests.forEach(f => {
        if (!en.existingId || f.state === 'moi') nhan.set(String(f.id), String(f.id));                  // chủ mới hoặc lô mới: giữ ID
        else if (strategy === 'overwrite' && f.state === 'trung') nhan.set(String(f.id), String(f.existing));   // ghi đè: lô trên máy nhận nội dung (và lịch sử) của lô trong file
      }));                                                                                            // giữ bản hiện có / giữ cả hai (lô nhân bản đổi mã): không chép lịch sử
      // Danh mục công ty mua hàng: gộp theo id (skip: giữ bản trên máy; overwrite/both: bản trong file thay bản trùng id; công ty mới luôn được thêm)
      next.congTy = {...(cur.congTy || {})};
      Object.entries(incoming.congTy || {}).forEach(([id, c]) => { if (!(id in next.congTy) || strategy === 'overwrite') next.congTy[id] = c; });
      Object.keys(incoming).forEach(k => { if (k !== 'rs' && k !== 'v' && k !== 'congTy' && !(k in next)) next[k] = incoming[k]; });
      /* Lô 3b (T-05): nối danh mục của tệp với danh mục máy đích theo CCCD / MST / BKS / tên vị trí rồi đổi ID trong các lô lấy từ tệp,
       * kể cả khi tệp đã qua chuyenDoi (LK.daChuyen(incoming) === true). Không để ID nội bộ ng1, xe1, vt1 của máy khác trỏ nhầm sang người/xe/vị trí của máy đích. */
      const GD = require('./goidm');
      const incHasDm = Array.isArray(incoming.dmDoiTuong) || Array.isArray(incoming.dmXe) || Array.isArray(incoming.dmViTri);
      for (const [oid, owner] of Object.entries(next.rs)) {
        for (const [fid, forest] of Object.entries(owner.forests || {})) {
          const previous = cur.rs[oid]?.forests?.[fid];
          if (previous && JSON.stringify(previous) === JSON.stringify(forest)) continue;
          const loKhoa = !!(forest && (forest.chot || forest.dung));
          if (incHasDm) {
            const goi = GD.dongGoi(incoming, forest);
            if (goi.doiTuong.length || goi.xe.length || goi.viTri.length) {
              const n = GD.noi(next, goi, {loKhoa});
              Object.assign(next, n.dm);
              const unmapped = {
                dt: new Set((goi.doiTuong || []).map(x => x.id).filter(id => !n.doi.dt[id])),
                ng: new Set((goi.doiTuong || []).flatMap(o => (o.nguoi || []).map(p => p.id)).filter(id => !n.doi.ng[id])),
                xe: new Set((goi.xe || []).map(x => x.id).filter(id => !n.doi.xe[id])),
                vt: new Set((goi.viTri || []).map(x => x.id).filter(id => !n.doi.vt[id]))
              };
              GD.doiIdLo(forest, n.doi, unmapped);
              if (n.can.length) {
                const maLo = String((forest.info && forest.info.maRung) || fid).trim();
                next.canDoiChieu = (next.canDoiChieu || []).concat(n.can.map(c => Object.assign({noi: 'Khôi phục lô ' + maLo}, c)));
                if (!loKhoa) {
                  forest.canDoiChieu = Array.isArray(forest.canDoiChieu) ? forest.canDoiChieu : [];
                  n.can.forEach(c => { if (!forest.canDoiChieu.some(x => x.loai === c.loai && x.ref === c.ref)) forest.canDoiChieu.push(c); });
                }
              }
            }
          }
          if (!loKhoa) {
            LK.chuanLo(forest);
            LK.noiDanhMuc(forest, next);
          }
        }
      }
    }
    let goiLichSu = opts && opts.goiLichSu;
    if (!goiLichSu && lsFile) goiLichSu = lsFile.filter(g => !nhan || nhan.has(String(g.forest_id))).map(g => Object.assign({}, g, {forest_id: nhan ? nhan.get(String(g.forest_id)) : String(g.forest_id)}));
    if (strategy !== 'replace' && (!goiLichSu || !goiLichSu.length) && JSON.stringify(next) === JSON.stringify(cur)) {
      return {backup: null, counts: Store.counts(cur), goiCu: 0, goiBoQua: lsBoQua};
    }
    const backup = this.snapshotFile('truoc-khoi-phuc', {keep: 20});   // giữ 20 bản gần nhất (như truoc-xoa): mỗi bản là cả cơ sở dữ liệu, không để thư mục sao lưu lớn mãi
    const kq = this.save(next, {allowBulkDelete: strategy === 'replace', boQuaKhoa: strategy === 'replace', goiLichSu});   // khôi phục THAY TOÀN BỘ là thao tác chủ động; overwrite chỉ thay lô trùng nên vẫn bị khóa chỉ đọc chặn
    return {backup, counts: Store.counts(this.load()), goiCu: kq.goiCu || 0, goiBoQua: lsBoQua};
  }

  /* phiếu #11: MỌI bản chụp chốt (mọi lô, mọi phiên bản) để ghi vào bản .json sao lưu toàn bộ, cùng dạng KhoSaoLuu.docBanSqlite trả cho bản .sqlite */
  goiTatCa() { return this._coBangGoi() ? this.db.prepare('SELECT forest_id, phien_ban, hash, at, data FROM chot_goi ORDER BY forest_id, phien_ban').all() : []; }

  /* Khôi phục MỘT lô rừng từ gói đã kiểm tra (LoRung.parsePackage). Xem trước dùng planLot, ghi dùng applyLot: cùng quy tắc. */
  previewLot(pkg) { return LoRung.planLot(this.load(), pkg); }
  applyLot(pkg, action) {
    { const e = LoRung.loiToanVen(pkg && pkg.lo); if (e) throw Object.assign(new Error(e.moTa + ' Dữ liệu trên máy chưa bị thay đổi.'), {code: 'GOI_HONG', toanVen: e.toanVen}); }   // trước khi sao lưu hay ghi
    const cur = this.load(), r = LoRung.applyLot(cur, pkg, action);
    if (!r.doi) return {backup: '', plan: r.plan, doi: false};                  // lô đã có và giữ bản hiện có: không ghi gì
    const forest = r.next.rs[r.ownerId].forests[r.forestId];
    LK.chuanLo(forest);
    LK.noiDanhMuc(forest, r.next);
    const backup = this.snapshotFile('truoc-khoi-phuc-lo', {keep: 20});
    this.save(r.next);
    return {backup, plan: r.plan, doi: true, ownerId: r.ownerId, forestId: r.forestId};
  }

  /* Quản lý và dọn dẹp hồ sơ chủ rừng trên SQLite */
  danhSachChuRong() {
    return this.db.prepare(`
      SELECT o.id, o.ma, o.ten, o.cccd, o.data,
             (SELECT COUNT(*) FROM forests f WHERE f.owner_id = o.id) AS soLo,
             o.updated_at AS updatedAt
      FROM owners o
      ORDER BY o.ten COLLATE NOCASE ASC
    `).all().map(r => {
      let dx = '';
      try { dx = JSON.parse(r.data)?.info?.danhXung || ''; } catch (_) {}
      return {id: r.id, ma: r.ma, ten: r.ten, cccd: r.cccd, danhXung: dx, soLo: r.soLo, updatedAt: r.updatedAt};
    });
  }

  docChuRong(id) {
    const row = this.db.prepare('SELECT id, data FROM owners WHERE id=?').get(id);
    if (!row) return null;
    const o = JSON.parse(row.data);
    o.forests = {};
    this.db.prepare('SELECT id, data FROM forests WHERE owner_id=?').all(id).forEach(fRow => {
      o.forests[fRow.id] = JSON.parse(fRow.data);
    });
    return o;
  }

  xoaChuRong(id) {
    this.snapshotFile('truoc-xoa', {keep: 20});
    this.db.transaction(() => {
      this.db.prepare('DELETE FROM forests WHERE owner_id=?').run(id);
      this.db.prepare('DELETE FROM owners WHERE id=?').run(id);
      if (this._coBangGoi()) {
        this.db.prepare('DELETE FROM chot_goi WHERE forest_id NOT IN (SELECT id FROM forests)').run();
      }
    })();
    return {rev: this._bump()};
  }

  donDepChuRong(ids) {
    if (!Array.isArray(ids) || !ids.length) return {rev: this.rev, deleted: 0};
    this.snapshotFile('truoc-xoa', {keep: 20});
    let deleted = 0;
    this.db.transaction(() => {
      const delF = this.db.prepare('DELETE FROM forests WHERE owner_id=?');
      const delO = this.db.prepare('DELETE FROM owners WHERE id=?');
      ids.forEach(id => {
        delF.run(id);
        deleted += delO.run(id).changes;
      });
      if (this._coBangGoi()) {
        this.db.prepare('DELETE FROM chot_goi WHERE forest_id NOT IN (SELECT id FROM forests)').run();
      }
    })();
    return {rev: this._bump(), deleted};
  }

  close() { this.db.close(); }
}

module.exports = {Store, SCHEMA_VERSION: MIGRATIONS.length, MIGRATIONS};
