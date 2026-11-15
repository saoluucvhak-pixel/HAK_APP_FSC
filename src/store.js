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
    this._bump();
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

  /* opts.keep: chỉ giữ N bản gần nhất cùng tiền tố tag (bản tự động trước khi xóa), không đụng các bản khác */
  snapshotFile(tag, opts = {}) {
    if (this.file === ':memory:') return null;
    fs.mkdirSync(this.backupDir, {recursive: true});
    const out = path.join(this.backupDir, tag + '-' + now().replace(/[:.]/g, '-') + '.sqlite');
    this.db.pragma('wal_checkpoint(TRUNCATE)');
    fs.copyFileSync(this.file, out);
    if (opts.keep > 0) {
      const re = new RegExp('^' + tag + '-\\d{4}-.*\\.sqlite$');
      const old = fs.readdirSync(this.backupDir).filter(n => re.test(n)).sort();
      old.slice(0, Math.max(0, old.length - opts.keep)).forEach(n => { try { fs.unlinkSync(path.join(this.backupDir, n)); } catch (e) { /* bỏ qua */ } });
    }
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
  /* Danh mục công ty (db.congTy) và các khóa meta: ghi theo đúng trạng thái trong `side` (như lưu toàn bộ). Gọi TRONG giao dịch. */
  _writeSide(side, t) {
    const st = this._stmts(); let changed = 0;
    const comps = Object.entries(side.congTy || {}).map(([id, c]) => { const o = {...c, id: c.id || id}, data = JSON.stringify(o); return {id: o.id, ten: String(o.ten || ''), mst: String(o.mst || ''), data, hash: sha(data)}; });
    const haveC = new Map(this.db.prepare('SELECT id, hash FROM companies').all().map(r => [r.id, r.hash]));
    comps.forEach(c => { if (haveC.get(c.id) !== c.hash) { st.upC.run({...c, t}); changed++; } });
    const keepC = new Set(comps.map(c => c.id));
    haveC.forEach((h, id) => { if (!keepC.has(id)) { st.delC.run(id); changed++; } });
    const metaKeys = Object.keys(side).filter(k => k !== 'rs' && k !== 'v' && k !== 'congTy');
    this.db.prepare("DELETE FROM meta WHERE key NOT LIKE 'lk:%' AND key NOT IN (" + (metaKeys.map(() => '?').join(',') || "''") + ')').run(...metaKeys);
    metaKeys.forEach(k => st.putMeta.run(k, JSON.stringify(side[k])));
    return changed;
  }
  _guardDelete(goneO, goneF, opts) {
    if (goneO.length >= 2 && !opts.allowBulkDelete) throw Object.assign(new Error('Lần lưu này sẽ xóa ' + goneO.length + ' hồ sơ chủ rừng cùng lúc nên đã bị chặn để tránh mất dữ liệu. Xóa từng chủ rừng, hoặc dùng Khôi phục toàn bộ nếu muốn thay toàn bộ dữ liệu.'), {code: 'BULK_DELETE'});
    if (goneO.length || goneF.length) { try { this.snapshotFile('truoc-xoa', {keep: 20}); } catch (e) { throw new Error('Không sao lưu được trước khi xóa nên chưa ghi: ' + e.message); } }
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
      if (V.viPhamKhoa(M.needsEnsure(cu) ? M.ensureForest(cu) : cu, moi)) bad.push((moi.info && moi.info.maRung) || r.id);
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
    const goneO = [...have.keys()].filter(id => !keepO.has(id)), goneF = [...haveF.keys()].filter(id => !keepF.has(id));
    this._guardDelete(goneO, goneF, opts);
    if (!opts.boQuaKhoa) this._kiemKhoa(rows.forests.filter(f => haveF.has(f.id) && haveF.get(f.id) !== f.hash + '|' + f.owner_id), goneF, goneO);
    const st = this._stmts(), t = now(); let changed = 0;
    this.db.transaction(() => {
      changed += this._writeSide(db, t);
      rows.owners.forEach(o => { if (have.get(o.id) !== o.hash) { st.upO.run({...o, t}); changed++; } });
      rows.forests.forEach(f => { if (haveF.get(f.id) !== f.hash + '|' + f.owner_id) { st.upF.run({...f, t}); changed++; } });
      goneO.forEach(id => { st.delO.run(id); changed++; });
      goneF.forEach(id => { if (haveF.has(id)) { st.delF.run(id); changed++; } });
    })();
    return {changed, at: t, rev: this._bump(), mode: 'full'};
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
    const counts = d.counts || {}, side = d.side && typeof d.side === 'object' ? d.side : {};
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
      const json = M.needsEnsure(f) ? JSON.stringify(f = M.ensureForest(f)) : v.json;   // chuẩn hóa đội như lưu toàn bộ
      const fi = f.info || {};
      return {id, owner_id: String(v.owner), ma_rung: String(fi.maRung || ''), ten_rung: String(fi.tenRung || ''), data: json, hash: sha(json)};
    });
    if (delF.some(id => id in upF) || delO.some(id => id in upO)) bad('vừa sửa vừa xóa cùng một dòng');
    this._guardDelete(delO, delF, opts);
    if (!opts.boQuaKhoa) this._kiemKhoa(rowsF, delF, delO);
    const st = this._stmts(), t = now(); let changed = 0;
    const tx = this.db.transaction(() => {
      changed += this._writeSide(side, t);
      rowsO.forEach(o => { st.upO.run({...o, t}); changed++; });
      rowsF.forEach(f => { st.upF.run({...f, t}); changed++; });
      delF.forEach(id => { changed += st.delF.run(id).changes; });
      delO.forEach(id => { changed += st.delO.run(id).changes; });
      const n = this.db.prepare('SELECT (SELECT COUNT(*) FROM owners) o, (SELECT COUNT(*) FROM forests) f').get();
      if (n.o !== counts.owners || n.f !== counts.forests) bad('sau khi ghi có ' + n.o + ' chủ / ' + n.f + ' lô, giao diện có ' + counts.owners + ' / ' + counts.forests);
    });
    try { tx(); } catch (e) { if (/FOREIGNKEY|FOREIGN KEY/i.test(String(e.code) + e.message)) bad('lô gắn với chủ rừng không có'); throw e; }   // lệch ảnh chụp → giao diện lưu toàn bộ
    return {changed, at: t, rev: this._bump(), mode: 'delta'};
  }

  /* Mã nội bộ (id) chủ rừng và lô rừng là khóa chính: trùng thì bản sau ghi đè bản trước trong SQLite → dừng và báo, không ghi gì */
  explode(db) {
    const M = require('./model');
    const owners = [], forests = [], seenO = new Map(), seenF = new Map(), dups = [];
    Object.entries(db.rs || {}).forEach(([id, o]) => {
      if (!o || typeof o !== 'object') throw new Error('Hồ sơ chủ rừng "' + id + '" không hợp lệ. Không ghi gì.');
      const {forests: fs_, ...rest} = o; rest.id = rest.id || id;
      if (seenO.has(rest.id)) dups.push('chủ rừng ' + rest.id); seenO.set(rest.id, true);
      const data = JSON.stringify(rest), info = rest.info || {};
      owners.push({id: rest.id, ma: String(info.ma || ''), ten: String(info.ten || ''), cccd: String(info.cccd || ''), data, hash: sha(data)});
      Object.entries(fs_ || {}).forEach(([fid, f0]) => {
        const f = M.needsEnsure(f0) ? M.ensureForest(f0) : f0;   // mọi lô ghi xuống đều có đội và mọi nhân công có doiId (tiến trình chính là nơi có thẩm quyền)
        const fd = JSON.stringify(f), fi = f.info || {}, idF = f.id || fid;
        if (seenF.has(idF)) dups.push('lô ' + idF + ' (' + (fi.maRung || '') + ') ở chủ ' + seenF.get(idF) + ' và ' + rest.id); seenF.set(idF, rest.id);
        forests.push({id: idF, owner_id: rest.id, ma_rung: String(fi.maRung || ''), ten_rung: String(fi.tenRung || ''), data: fd, hash: sha(fd)});
      });
    });
    if (dups.length) throw Object.assign(new Error('Trùng mã nội bộ: ' + dups.slice(0, 5).join('; ') + (dups.length > 5 ? '…' : '') + '. Không ghi gì để tránh mất hồ sơ; hãy khôi phục lại với lựa chọn "Giữ cả hai" để cấp mã mới.'), {code: 'DUP_ID'});
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
  previewImport(incoming, opts) {
    const cur = this.load();
    if (!incoming || typeof incoming.rs !== 'object') throw new Error('File không đúng định dạng sao lưu.');
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
    if (!incoming || typeof incoming.rs !== 'object') throw new Error('File không đúng định dạng sao lưu.');
    const cur = this.load();
    let next;
    if (strategy === 'replace') {
      next = incoming;
      if (!('congTy' in incoming)) next = Object.assign({}, incoming, {congTy: cur.congTy || {}});   // bản sao lưu cũ chưa có danh mục công ty: không xóa danh mục của máy
    } else {
      if (!['skip', 'overwrite', 'both'].includes(strategy)) throw new Error('Cách xử lý không hợp lệ: ' + strategy);
      next = LoRung.mergeImport(cur, incoming, strategy, null, opts || {}).next;     // ném lỗi nếu có hồ sơ mâu thuẫn, trước khi sao lưu hay ghi
      // Danh mục công ty mua hàng: gộp theo id (skip: giữ bản trên máy; overwrite/both: bản trong file thay bản trùng id; công ty mới luôn được thêm)
      next.congTy = {...(cur.congTy || {})};
      Object.entries(incoming.congTy || {}).forEach(([id, c]) => { if (!(id in next.congTy) || strategy === 'overwrite') next.congTy[id] = c; });
      Object.keys(incoming).forEach(k => { if (k !== 'rs' && k !== 'v' && k !== 'congTy' && !(k in next)) next[k] = incoming[k]; });
    }
    const backup = this.snapshotFile('truoc-khoi-phuc');
    this.save(next, {allowBulkDelete: strategy === 'replace', boQuaKhoa: strategy === 'replace'});   // khôi phục THAY TOÀN BỘ là thao tác chủ động; overwrite chỉ thay lô trùng nên vẫn bị khóa chỉ đọc chặn
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
