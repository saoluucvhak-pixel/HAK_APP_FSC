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
  }
];

const sha = s => crypto.createHash('sha1').update(s).digest('hex');
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
  }

  migrate(existed) {
    const cur = this.db.pragma('user_version', {simple: true});
    if (cur > this.target) throw new Error('Cơ sở dữ liệu thuộc phiên bản mới hơn ứng dụng (v' + cur + '). Hãy cài bản ứng dụng mới hơn.');
    if (cur === this.target) return;
    // Có dữ liệu cũ thì sao lưu trước khi nâng cấp cấu trúc
    if (existed && cur > 0) this.snapshotFile('truoc-nang-cap-v' + cur + '-len-v' + this.target);
    const run = this.db.transaction(() => {
      for (let v = cur; v < this.target; v++) { this.migrations[v](this.db); this.db.pragma('user_version = ' + (v + 1)); }
    });
    run();
  }

  snapshotFile(tag) {
    if (this.file === ':memory:') return null;
    fs.mkdirSync(this.backupDir, {recursive: true});
    const out = path.join(this.backupDir, tag + '-' + now().replace(/[:.]/g, '-') + '.sqlite');
    this.db.pragma('wal_checkpoint(TRUNCATE)');
    fs.copyFileSync(this.file, out);
    return out;
  }

  /* Đọc toàn bộ dữ liệu thành đối tượng db của giao diện */
  load() {
    const out = {v: 2, rs: {}};
    this.db.prepare('SELECT key, value FROM meta').all().forEach(r => { if (!r.key.startsWith('lk:')) out[r.key] = JSON.parse(r.value); }); // 'lk:' = dữ liệu của bản tra cứu, không thuộc hồ sơ
    out.congTy = {};
    this.db.prepare('SELECT id, data FROM companies').all().forEach(r => { out.congTy[r.id] = JSON.parse(r.data); });
    this.db.prepare('SELECT id, data FROM owners').all().forEach(r => { const o = JSON.parse(r.data); o.forests = {}; out.rs[r.id] = o; });
    this.db.prepare('SELECT id, owner_id, data FROM forests').all().forEach(r => { if (out.rs[r.owner_id]) out.rs[r.owner_id].forests[r.id] = JSON.parse(r.data); });
    return out;
  }

  isEmpty() { return this.db.prepare('SELECT COUNT(*) c FROM owners').get().c === 0; }

  /* Ghi đối tượng db của giao diện: chỉ ghi các dòng đã đổi, trong một giao dịch. Lỗi thì không đổi gì. */
  save(db) {
    const rows = this.explode(db);
    const have = new Map(this.db.prepare('SELECT id, hash FROM owners').all().map(r => [r.id, r.hash]));
    const haveF = new Map(this.db.prepare('SELECT id, hash FROM forests').all().map(r => [r.id, r.hash]));
    const upO = this.db.prepare(`INSERT INTO owners(id,ma,ten,cccd,data,hash,updated_at) VALUES(@id,@ma,@ten,@cccd,@data,@hash,@t)
      ON CONFLICT(id) DO UPDATE SET ma=@ma,ten=@ten,cccd=@cccd,data=@data,hash=@hash,updated_at=@t`);
    const upF = this.db.prepare(`INSERT INTO forests(id,owner_id,ma_rung,ten_rung,data,hash,updated_at) VALUES(@id,@owner_id,@ma_rung,@ten_rung,@data,@hash,@t)
      ON CONFLICT(id) DO UPDATE SET owner_id=@owner_id,ma_rung=@ma_rung,ten_rung=@ten_rung,data=@data,hash=@hash,updated_at=@t`);
    const comps = Object.entries(db.congTy || {}).map(([id, c]) => { const o = {...c, id: c.id || id}, data = JSON.stringify(o); return {id: o.id, ten: String(o.ten || ''), mst: String(o.mst || ''), data, hash: sha(data)}; });
    const haveC = new Map(this.db.prepare('SELECT id, hash FROM companies').all().map(r => [r.id, r.hash]));
    const upC = this.db.prepare(`INSERT INTO companies(id,ten,mst,data,hash,updated_at) VALUES(@id,@ten,@mst,@data,@hash,@t)
      ON CONFLICT(id) DO UPDATE SET ten=@ten,mst=@mst,data=@data,hash=@hash,updated_at=@t`);
    const t = now(); let changed = 0;
    this.db.transaction(() => {
      comps.forEach(c => { if (haveC.get(c.id) !== c.hash) { upC.run({...c, t}); changed++; } });
      const keepC = new Set(comps.map(c => c.id));
      haveC.forEach((h, id) => { if (!keepC.has(id)) { this.db.prepare('DELETE FROM companies WHERE id=?').run(id); changed++; } });
      rows.owners.forEach(o => { if (have.get(o.id) !== o.hash) { upO.run({...o, t}); changed++; } });
      rows.forests.forEach(f => { if (haveF.get(f.id) !== f.hash) { upF.run({...f, t}); changed++; } });
      const keepO = new Set(rows.owners.map(o => o.id)), keepF = new Set(rows.forests.map(f => f.id));
      have.forEach((h, id) => { if (!keepO.has(id)) { this.db.prepare('DELETE FROM owners WHERE id=?').run(id); changed++; } });
      haveF.forEach((h, id) => { if (!keepF.has(id)) { this.db.prepare('DELETE FROM forests WHERE id=?').run(id); changed++; } });
      const metaKeys = Object.keys(db).filter(k => k !== 'rs' && k !== 'v' && k !== 'congTy');
      this.db.prepare("DELETE FROM meta WHERE key NOT LIKE 'lk:%' AND key NOT IN (" + (metaKeys.map(() => '?').join(',') || "''") + ')').run(...metaKeys);
      metaKeys.forEach(k => this.db.prepare('INSERT INTO meta(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').run(k, JSON.stringify(db[k])));
    })();
    return {changed, at: t};
  }

  explode(db) {
    const owners = [], forests = [];
    Object.entries(db.rs || {}).forEach(([id, o]) => {
      const {forests: fs_, ...rest} = o; rest.id = rest.id || id;
      const data = JSON.stringify(rest), info = rest.info || {};
      owners.push({id: rest.id, ma: String(info.ma || ''), ten: String(info.ten || ''), cccd: String(info.cccd || ''), data, hash: sha(data)});
      Object.entries(fs_ || {}).forEach(([fid, f]) => {
        const fd = JSON.stringify(f), fi = f.info || {};
        forests.push({id: f.id || fid, owner_id: rest.id, ma_rung: String(fi.maRung || ''), ten_rung: String(fi.tenRung || ''), data: fd, hash: sha(fd)});
      });
    });
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

  /* Xem trước nhập bản sao lưu toàn bộ: số liệu + từng chủ/lô sẽ được THÊM, THAY hay GIỮ. Dùng cùng planImport với bước ghi (src/lorung.js). */
  previewImport(incoming) {
    const cur = this.load();
    if (!incoming || typeof incoming.rs !== 'object') throw new Error('File không đúng định dạng sao lưu.');
    const plan = LoRung.planImport(cur, incoming);
    const dup = [];
    plan.owners.forEach(o => {
      if (o.state === 'trung') dup.push({kind: 'owner', incoming: o.id, existing: o.existingId, ten: o.ten, forests: o.forests.length});
      o.forests.forEach(f => { if (f.state === 'trung') dup.push({kind: 'forest', incoming: f.id, existing: f.existing, ma: f.ma, ten: f.ten}); });
    });
    return {incoming: Store.counts(incoming), existing: Store.counts(cur), duplicates: dup, plan};
  }

  /* Nhập bản sao lưu toàn bộ. strategy: 'replace' thay toàn bộ dữ liệu | 'skip' giữ bản hiện có, chỉ thêm mới | 'overwrite' thay ĐÚNG các lô trùng, giữ lô khác của chủ | 'both' giữ cả hai.
   * Hồ sơ mâu thuẫn (ID, mã lô, chủ rừng chỉ về các bản ghi khác nhau) → dừng, không ghi. Luôn sao lưu file SQLite trước; ghi trong một giao dịch nên lỗi thì dữ liệu cũ còn nguyên. */
  applyImport(incoming, strategy) {
    if (!incoming || typeof incoming.rs !== 'object') throw new Error('File không đúng định dạng sao lưu.');
    const cur = this.load();
    let next;
    if (strategy === 'replace') {
      next = incoming;
      if (!('congTy' in incoming)) next = Object.assign({}, incoming, {congTy: cur.congTy || {}});   // bản sao lưu cũ chưa có danh mục công ty: không xóa danh mục của máy
    } else {
      if (!['skip', 'overwrite', 'both'].includes(strategy)) throw new Error('Cách xử lý không hợp lệ: ' + strategy);
      next = LoRung.mergeImport(cur, incoming, strategy).next;     // ném lỗi nếu có hồ sơ mâu thuẫn, trước khi sao lưu hay ghi
      // Danh mục công ty mua hàng: gộp theo id (skip: giữ bản trên máy; overwrite/both: bản trong file thay bản trùng id; công ty mới luôn được thêm)
      next.congTy = {...(cur.congTy || {})};
      Object.entries(incoming.congTy || {}).forEach(([id, c]) => { if (!(id in next.congTy) || strategy === 'overwrite') next.congTy[id] = c; });
      Object.keys(incoming).forEach(k => { if (k !== 'rs' && k !== 'v' && k !== 'congTy' && !(k in next)) next[k] = incoming[k]; });
    }
    const backup = this.snapshotFile('truoc-khoi-phuc');
    this.save(next);
    return {backup, counts: Store.counts(this.load())};
  }

  /* Khôi phục MỘT lô rừng từ gói đã kiểm tra (LoRung.parsePackage). Xem trước dùng planLot, ghi dùng applyLot: cùng quy tắc. */
  previewLot(pkg) { return LoRung.planLot(this.load(), pkg); }
  applyLot(pkg, action) {
    const cur = this.load(), r = LoRung.applyLot(cur, pkg, action);
    if (!r.doi) return {backup: '', plan: r.plan, doi: false};                  // lô đã có và giữ bản hiện có: không ghi gì
    const backup = this.snapshotFile('truoc-khoi-phuc-lo');
    this.save(r.next);
    return {backup, plan: r.plan, doi: true, ownerId: r.ownerId, forestId: r.forestId};
  }

  close() { this.db.close(); }
}

module.exports = {Store, SCHEMA_VERSION: MIGRATIONS.length, MIGRATIONS};
