'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs'), os = require('os'), path = require('path');
const {Store, SCHEMA_VERSION, MIGRATIONS} = require('../src/store');

const sample = () => ({v: 2, norm: {x: 1}, rs: {
  r1: {id: 'r1', info: {ma: 'CR-001', ten: 'NGUYỄN A', cccd: '049000000001'}, forests: {
    f1: {id: 'f1', info: {maRung: 'R-1', tenRung: 'Rừng 1'}, nc: [{ten: 'A'}], dx: [{bien: '92C-1'}], pc: [{so: '1'}, {so: '2'}], exp: {}},
    f2: {id: 'f2', info: {maRung: 'R-2', tenRung: 'Rừng 2'}, nc: [], dx: [], pc: [], exp: {}}}}}});
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'hakqn-'));

test('lưu và đọc lại đúng từng rừng, giữ CCCD dạng chuỗi có số 0 đầu', () => {
  const d = tmp(), f = path.join(d, 'a.sqlite');
  let s = new Store(f); s.save(sample()); s.close();
  s = new Store(f); const o = s.load();
  assert.deepStrictEqual(o.rs.r1.forests.f1.pc, [{so: '1'}, {so: '2'}]);
  assert.strictEqual(o.rs.r1.info.cccd, '049000000001');
  assert.strictEqual(Object.keys(o.rs.r1.forests).length, 2);
  assert.deepStrictEqual(o.norm, {x: 1});
  assert.strictEqual(s.db.pragma('user_version', {simple: true}), SCHEMA_VERSION);
});

test('chỉ ghi dòng đã đổi; xóa rừng thì xóa dòng', () => {
  const s = new Store(':memory:'); const d = sample(); assert.strictEqual(s.save(d).changed, 3);
  assert.strictEqual(s.save(d).changed, 0);
  d.rs.r1.forests.f1.pc.push({so: '3'}); assert.strictEqual(s.save(d).changed, 1);
  delete d.rs.r1.forests.f2; s.save(d); assert.strictEqual(Object.keys(s.load().rs.r1.forests).length, 1);
  delete d.rs.r1; s.save(d); assert.strictEqual(s.isEmpty(), true);
});

test('lỗi giữa chừng thì giao dịch hoàn tác, dữ liệu cũ còn nguyên', () => {
  const s = new Store(':memory:'); const d = sample(); s.save(d);
  const bad = sample(); bad.rs.r1.info.ten = 'ĐỔI'; bad.rs.r9 = {id: 'r9', info: {}, forests: {f9: {id: 'f9', info: {}, circular: null}}};
  const c = {}; c.c = c; bad.rs.r9.forests.f9.circular = c; // JSON.stringify ném lỗi
  assert.throws(() => s.save(bad));
  assert.strictEqual(s.load().rs.r1.info.ten, 'NGUYỄN A');
  assert.strictEqual(s.load().rs.r9, undefined);
});

test('xem trước nhập: đếm số liệu và báo bản ghi trùng', () => {
  const s = new Store(':memory:'); s.save(sample());
  const inc = sample(); inc.rs.r1.forests.f1.pc.push({so: '9'}); inc.rs.r2 = {id: 'r2', info: {ma: 'CR-2', ten: 'B', cccd: '049000000002'}, forests: {}};
  const p = s.previewImport(inc);
  assert.deepStrictEqual(p.incoming, {owners: 2, forests: 2, nc: 1, dx: 1, pc: 3, companies: 0});
  assert.strictEqual(p.existing.pc, 2);
  assert.ok(p.duplicates.some(x => x.kind === 'owner' && x.existing === 'r1'));
  assert.ok(p.duplicates.some(x => x.kind === 'forest' && x.ma === 'R-1'));
});

test('nhập: skip / overwrite / both / replace, luôn có bản sao lưu trước', () => {
  const d = tmp(), f = path.join(d, 'b.sqlite');
  const s = new Store(f); s.save(sample());
  const inc = sample(); inc.rs.r1.info.ten = 'MỚI'; inc.rs.r2 = {id: 'r2', info: {ma: 'CR-2', ten: 'B', cccd: '049000000002'}, forests: {}};
  let r = s.applyImport(inc, 'skip'); assert.strictEqual(s.load().rs.r1.info.ten, 'NGUYỄN A'); assert.ok(s.load().rs.r2); assert.ok(fs.existsSync(r.backup));
  s.applyImport(inc, 'overwrite'); assert.strictEqual(s.load().rs.r1.info.ten, 'MỚI');
  const before = Object.keys(s.load().rs).length; s.applyImport(inc, 'both'); assert.strictEqual(Object.keys(s.load().rs).length, before + 2);
  r = s.applyImport({v: 2, rs: {}}, 'replace'); assert.strictEqual(r.counts.owners, 0);
});

test('nâng cấp cấu trúc: file có sẵn được sao lưu trước, dữ liệu còn nguyên', () => {
  const d = tmp(), f = path.join(d, 'c.sqlite');
  let s = new Store(f); s.save(sample()); s.close();
  const v2 = db => db.exec("ALTER TABLE forests ADD COLUMN ghi_chu TEXT NOT NULL DEFAULT ''");
  s = new Store(f, {migrations: [...MIGRATIONS, v2]});
  const N = MIGRATIONS.length;
  assert.strictEqual(s.db.pragma('user_version', {simple: true}), N + 1);
  assert.strictEqual(Store.counts(s.load()).pc, 2);
  const bk = fs.readdirSync(path.join(d, 'backups')); assert.ok(bk.some(n => n.startsWith('truoc-nang-cap-v' + N + '-len-v' + (N + 1))));
  s.save(sample()); assert.strictEqual(Store.counts(s.load()).forests, 2);
});

test('từ chối cơ sở dữ liệu thuộc phiên bản mới hơn', () => {
  const d = tmp(), f = path.join(d, 'd.sqlite'); const s = new Store(f); s.db.pragma('user_version = 99'); s.close();
  assert.throws(() => new Store(f), /phiên bản mới hơn/);
});

test('nâng cấp cơ sở dữ liệu bản P1 (v1) lên bản hiện tại: thêm bảng tra cứu, giữ hồ sơ', () => {
  const d = tmp(), f = path.join(d, 'p1.sqlite');
  let s = new Store(f, {migrations: [MIGRATIONS[0]]});
  // bản cũ chỉ có cấu trúc v1: ghi hồ sơ bằng SQL trực tiếp (save của bản mới cần bảng companies)
  const ex = s.explode(sample()); ex.owners.forEach(o => s.db.prepare('INSERT INTO owners(id,ma,ten,cccd,data,hash,updated_at) VALUES(?,?,?,?,?,?,?)').run(o.id, o.ma, o.ten, o.cccd, o.data, o.hash, 't'));
  ex.forests.forEach(x => s.db.prepare('INSERT INTO forests(id,owner_id,ma_rung,ten_rung,data,hash,updated_at) VALUES(?,?,?,?,?,?,?)').run(x.id, x.owner_id, x.ma_rung, x.ten_rung, x.data, x.hash, 't')); s.close();
  s = new Store(f);
  assert.strictEqual(s.db.pragma('user_version', {simple: true}), MIGRATIONS.length);
  assert.strictEqual(Store.counts(s.load()).pc, 2);
  assert.ok(s.db.prepare("SELECT name FROM sqlite_master WHERE name='lookup_rows'").get());
  assert.ok(fs.readdirSync(path.join(d, 'backups')).some(n => n.startsWith('truoc-nang-cap-v1-len-v' + MIGRATIONS.length)));
});

test('hồi quy: nhập thất bại giữa chừng (replace/overwrite) giữ nguyên hồ sơ từng rừng và có bản sao lưu', () => {
  const d = tmp(), f = path.join(d, 'a.sqlite'); const s = new Store(f); s.save(sample());
  const before = JSON.stringify(s.load());
  for (const strategy of ['replace', 'overwrite']) {
    const bad = sample(); bad.rs.r1.forests.f1.pc.push({so: 3n});          // BigInt không ghi được: lỗi xảy ra khi đang lưu
    assert.throws(() => s.applyImport(bad, strategy), /BigInt|serialize/i);
    assert.strictEqual(JSON.stringify(s.load()), before, 'dữ liệu cũ phải còn nguyên sau lần nhập lỗi: ' + strategy);
  }
  assert.ok(fs.readdirSync(path.join(d, 'backups')).some(n => /truoc-khoi-phuc/.test(n)));
  assert.strictEqual(Object.keys(s.load().rs.r1.forests).length, 2); assert.strictEqual(s.load().rs.r1.forests.f1.pc.length, 2);
});

test('hồi quy: nhập JSON cũ (v1) rồi sao lưu .sqlite mở lại được, hồ sơ từng rừng còn nguyên', async () => {
  const d = tmp(), f = path.join(d, 'a.sqlite'); const s = new Store(f); s.save(sample());
  const bak = path.join(d, 'sao-luu.sqlite'); await s.db.backup(bak); s.close();
  const r = new Store(bak); const o = r.load();
  assert.strictEqual(o.rs.r1.forests.f1.pc.length, 2); assert.strictEqual(o.rs.r1.info.cccd, '049000000001'); r.close();
});

test('danh mục công ty mua hàng: lưu, đọc lại, xóa, và nhập/khôi phục gộp theo id', () => {
  const d = tmp(), f = path.join(d, 'c.sqlite'); const s = new Store(f);
  const db = sample(); db.congTy = {c1: {id: 'c1', ten: 'CÔNG TY A', mst: '0123456789', diaChi: 'KCN A', diaChiGiao: [{id: 'a1', nhan: 'Kho 2', diaChi: 'KCN B'}]}, c2: {id: 'c2', ten: 'CÔNG TY B', mst: '', diaChi: 'KCN C', diaChiGiao: []}};
  assert.strictEqual(s.save(db).changed, 5);                                  // 3 dòng hồ sơ + 2 công ty
  assert.strictEqual(s.save(db).changed, 0);                                  // không đổi thì không ghi
  assert.strictEqual(s.db.prepare("SELECT COUNT(*) c FROM meta WHERE key='congTy'").get().c, 0);   // công ty ở bảng riêng, không lẫn vào meta
  const r = s.load(); assert.deepStrictEqual(Object.keys(r.congTy).sort(), ['c1', 'c2']); assert.strictEqual(r.congTy.c1.diaChiGiao[0].diaChi, 'KCN B');
  db.congTy.c1.diaChi = 'KCN A mới'; assert.strictEqual(s.save(db).changed, 1); assert.strictEqual(s.load().congTy.c1.diaChi, 'KCN A mới');
  delete db.congTy.c2; s.save(db); assert.deepStrictEqual(Object.keys(s.load().congTy), ['c1']);
  // nhập file có công ty mới + trùng id
  const inc = sample(); inc.congTy = {c1: {id: 'c1', ten: 'CÔNG TY A (file)', diaChi: 'cũ trong file', diaChiGiao: []}, c3: {id: 'c3', ten: 'CÔNG TY C', diaChi: 'KCN D', diaChiGiao: []}};
  s.applyImport(inc, 'skip'); let c = s.load().congTy; assert.strictEqual(c.c1.diaChi, 'KCN A mới'); assert.ok(c.c3);          // skip: giữ bản trên máy, thêm công ty mới
  s.applyImport(inc, 'overwrite'); assert.strictEqual(s.load().congTy.c1.ten, 'CÔNG TY A (file)');                           // overwrite: bản trong file thay bản trùng id
  s.applyImport({v: 2, rs: {}, congTy: {c9: {id: 'c9', ten: 'X', diaChi: 'Y', diaChiGiao: []}}}, 'replace'); assert.deepStrictEqual(Object.keys(s.load().congTy), ['c9']);   // replace: thay toàn bộ
  assert.strictEqual(Store.counts({rs: {}, congTy: {a: {}, b: {}}}).companies, 2);
});

test('nâng cấp v2 → v3 (bản 1.0.0 → 1.1.0): thêm bảng companies, có sao lưu, mọi hồ sơ và bản tra cứu giữ nguyên', () => {
  const d = tmp(), f = path.join(d, 'v2.sqlite');
  let s = new Store(f, {migrations: MIGRATIONS.slice(0, 2)});                    // cấu trúc của bản 1.0.0 (user_version = 2)
  const ex = s.explode(sample()); ex.owners.forEach(o => s.db.prepare('INSERT INTO owners(id,ma,ten,cccd,data,hash,updated_at) VALUES(?,?,?,?,?,?,?)').run(o.id, o.ma, o.ten, o.cccd, o.data, o.hash, 't'));
  ex.forests.forEach(x => s.db.prepare('INSERT INTO forests(id,owner_id,ma_rung,ten_rung,data,hash,updated_at) VALUES(?,?,?,?,?,?,?)').run(x.id, x.owner_id, x.ma_rung, x.ten_rung, x.data, x.hash, 't'));
  s.db.prepare("INSERT INTO meta(key,value) VALUES('norm','{\"x\":1}')").run(); s.close();
  assert.strictEqual(new Store(f, {migrations: MIGRATIONS.slice(0, 2)}).db.pragma('user_version', {simple: true}), 2);
  s = new Store(f);
  assert.strictEqual(s.db.pragma('user_version', {simple: true}), 3);
  assert.ok(s.db.prepare("SELECT name FROM sqlite_master WHERE name='companies'").get());
  const bk = fs.readdirSync(path.join(d, 'backups')).filter(n => n.startsWith('truoc-nang-cap-v2-len-v3'));
  assert.strictEqual(bk.length, 1);
  const old = new Store(path.join(d, 'backups', bk[0]), {migrations: MIGRATIONS.slice(0, 2)});   // bản sao lưu vẫn là cấu trúc cũ, đọc được
  assert.strictEqual(old.db.pragma('user_version', {simple: true}), 2); assert.strictEqual(old.db.prepare('SELECT COUNT(*) c FROM forests').get().c, 2);
  const r = s.load(); assert.strictEqual(r.rs.r1.forests.f1.pc.length, 2); assert.deepStrictEqual(r.norm, {x: 1}); assert.deepStrictEqual(r.congTy, {});
});

test('nâng cấp từ cơ sở dữ liệu v1.0.0 THẬT (tests/fixtures/hakqn_v1_0_0.sqlite) trên bản sao: giữ nguyên hồ sơ cũ, điểm đến nhập tay, cước theo bậc, phiếu cũ sai ngày, bản tra cứu', () => {
  const {Lookup} = require('../src/lookup');
  const d = tmp(), f = path.join(d, 'copy.sqlite'); fs.copyFileSync(path.join(__dirname, 'fixtures', 'hakqn_v1_0_0.sqlite'), f);
  const Database = require('better-sqlite3'), raw = new Database(f, {readonly: true});   // mốc: đọc thẳng các dòng dữ liệu trước khi nâng cấp
  const rowsBefore = JSON.stringify([raw.prepare('SELECT id,data FROM owners ORDER BY id').all(), raw.prepare('SELECT id,data FROM forests ORDER BY id').all()]);
  const lkBefore = raw.prepare('SELECT COUNT(*) c FROM lookup_rows').get().c, userVersion = raw.pragma('user_version', {simple: true}); raw.close();
  assert.strictEqual(userVersion, 2); assert.ok(lkBefore > 0);
  const s = new Store(f);                                                                 // mở bằng bản mới: tự nâng cấp
  assert.strictEqual(s.db.pragma('user_version', {simple: true}), MIGRATIONS.length);
  assert.ok(fs.readdirSync(path.join(d, 'backups')).some(n => n.startsWith('truoc-nang-cap-v2-len-v3')));   // có sao lưu trước khi nâng cấp
  const db = s.load();
  assert.strictEqual(JSON.stringify([s.db.prepare('SELECT id,data FROM owners ORDER BY id').all(), s.db.prepare('SELECT id,data FROM forests ORDER BY id').all()]), rowsBefore);   // MỌI hồ sơ giữ nguyên từng byte
  const F = Object.fromEntries(Object.values(db.rs.own1.forests).map(x => [x.info.maRung, x]));
  assert.strictEqual(F['R-CU1'].exp.vcDiemDen, 'Nhà máy dăm Quảng Nam, KCN Điện Nam – Điện Ngọc');   // điểm đến nhập tay còn nguyên
  assert.strictEqual(F['R-CU1'].pc[1].noiGiao, 'Kho Điện Bàn');                           // nơi giao thực tế trên phiếu còn nguyên
  assert.strictEqual(F['R-CU2'].info.vanChuyen.mode, 'tanDoan');                          // cước theo bậc: dữ liệu gốc còn
  assert.deepStrictEqual(F['R-CU2'].info.vanChuyen.bac, [{den: 50, gia: 40000}, {den: 100, gia: 55000}]);
  assert.strictEqual(F['R-CU3'].pc[0].ngay, '31/02/2026'); assert.strictEqual(F['R-CU3'].pc[0].kl, 5);   // phiếu cũ sai ngày: giữ để người dùng sửa
  assert.deepStrictEqual(db.congTy, {});                                                  // chưa có công ty mua hàng
  assert.strictEqual(new Lookup(s).search('', '').total, lkBefore);                       // bản tra cứu 3 tab còn nguyên
  assert.ok(new Lookup(s).status().active);
  // nâng cấp xong ghi lại không làm đổi hồ sơ
  assert.strictEqual(s.save(db).changed, 0);                                              // ghi lại không làm đổi dòng nào
  s.close(); const again = new Store(f); assert.strictEqual(fs.readdirSync(path.join(d, 'backups')).length, 1); again.close();   // mở lại không sao lưu/nâng cấp lần nữa
});
