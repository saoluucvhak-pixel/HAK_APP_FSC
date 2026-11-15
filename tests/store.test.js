'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs'), os = require('os'), path = require('path');
const {Store, SCHEMA_VERSION, MIGRATIONS} = require('../src/store');

const sample = () => ({v: 2, norm: {x: 1}, rs: {
  r1: {id: 'r1', info: {ma: 'CR-001', ten: 'NGUYỄN A', cccd: '049000000001'}, forests: {
    f1: {id: 'f1', info: {maRung: 'R-1', tenRung: 'Rừng 1'}, nc: [{ten: 'A'}], dx: [{bien: '92C-1'}], pc: [{so: '1'}, {so: '2'}], exp: {}},
    f2: {id: 'f2', info: {maRung: 'R-2', tenRung: 'Rừng 2'}, nc: [], dx: [], pc: [], exp: {}}}}}});
const boNgayChup = x => JSON.parse(JSON.stringify(x, (k, v) => k === '_dmNgay' ? undefined : v));   // _dmNgay (A4, SQLite v11) là ngày chụp danh mục, không in ra biểu mẫu
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'hakqn-'));

test('lưu và đọc lại đúng từng rừng, giữ CCCD dạng chuỗi có số 0 đầu', () => {
  const d = tmp(), f = path.join(d, 'a.sqlite');
  let s = new Store(f); s.save(sample()); s.close();
  s = new Store(f); const o = s.load();
  assert.deepStrictEqual(o.rs.r1.forests.f1.pc, [{so: '1', doiId: 'doi1'}, {so: '2', doiId: 'doi1'}]);   // lô một đội: phiếu cân tự thuộc đội (cấu trúc 2.0)
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
  inc.rs.r1.forests.f1.info.tenRung = 'Rừng 1 (file)';
  s.applyImport(inc, 'overwrite'); assert.strictEqual(s.load().rs.r1.forests.f1.info.tenRung, 'Rừng 1 (file)');   // thay đúng lô trùng
  assert.strictEqual(s.load().rs.r1.info.ten, 'NGUYỄN A', 'hồ sơ chủ rừng trên máy được giữ');
  const before = Object.keys(s.load().rs.r1.forests).length; assert.throws(() => s.applyImport(inc, 'both'), /mã mới/); s.applyImport(inc, 'both', {maMoi: {f1: 'R-1-B', f2: 'R-2-B'}}); assert.strictEqual(Object.keys(s.load().rs.r1.forests).length, before + 2, 'giữ cả hai: lô trong file thêm bằng ID mới vào đúng chủ');
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
  assert.strictEqual(s.db.pragma('user_version', {simple: true}), MIGRATIONS.length);   // v2 → v3 (companies) → v4 (đội khai thác)
  assert.ok(s.db.prepare("SELECT name FROM sqlite_master WHERE name='companies'").get());
  const bk = fs.readdirSync(path.join(d, 'backups')).filter(n => n.startsWith('truoc-nang-cap-v2-len-v' + MIGRATIONS.length));
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
  assert.ok(fs.readdirSync(path.join(d, 'backups')).some(n => n.startsWith('truoc-nang-cap-v2-len-v' + MIGRATIONS.length)));   // có sao lưu trước khi nâng cấp
  const db = s.load();
  // chủ rừng giữ nguyên từng byte; lô chuyển sang cấu trúc có ĐỘI (v4) và dựng lại dạng cũ đúng y nguyên — không mất dữ liệu nào
  const M = require('../src/model'), [ownB, forB] = JSON.parse(rowsBefore);
  assert.strictEqual(JSON.stringify(s.db.prepare('SELECT id,data FROM owners ORDER BY id').all()), JSON.stringify(ownB));
  const forA = s.db.prepare('SELECT id,data FROM forests ORDER BY id').all();
  /* so từng lô trước/sau: giống từng trường, TRỪ các trường đã chuyển ở v6 (đơn giá Tổ trưởng cũ vào bảng đơn giá theo vị trí, cước bậc sang tấn/km + bacCu) — kiểm riêng bên dưới */
  const sanCu = o => { const c = JSON.parse(JSON.stringify(o)); ['donGia', 'donGiaTan', 'soDoi', 'khoiLuong', 'klHoSoCu', 'klDoi'].forEach(k => delete (c.info || {})[k]); if (c.info && c.info.vanChuyen) ['mode', 'bac', 'bacCu'].forEach(k => delete c.info.vanChuyen[k]); return c; };
  assert.deepStrictEqual(forA.map(r => [r.id, sanCu(boNgayChup(M.legacyForest(JSON.parse(r.data))))]), forB.map(r => [r.id, sanCu(JSON.parse(r.data))]));
  forB.forEach(rb => { const b = JSON.parse(rb.data), x = JSON.parse(forA.find(z => z.id === rb.id).data);   // đơn giá Tổ trưởng cũ nay nằm ở bảng đơn giá theo vị trí của đội; số cũ không còn ở thông tin rừng
    assert.ok(!('donGia' in x.info) && !('donGia' in x.doi[0].hinhThuc));
    if (b.info.donGia > 0 && (!b.info.hinhThucLuong || b.info.hinhThucLuong === 'sanluong')) assert.strictEqual(x.doi[0].hinhThuc.donGiaTan['Tổ trưởng'], (b.info.donGiaTan || {})['Tổ trưởng'] > 0 ? b.info.donGiaTan['Tổ trưởng'] : b.info.donGia); });
  forA.forEach(r => { const x = JSON.parse(r.data); assert.ok(x.doi.length >= 1 && (x.nc || []).every(n => x.doi.some(t => t.id === n.doiId)), 'lô ' + r.id + ' có đội'); });
  const F = Object.fromEntries(Object.values(db.rs.own1.forests).map(x => [x.info.maRung, x]));
  assert.strictEqual(F['R-CU1'].exp.vcDiemDen, 'Nhà máy dăm Quảng Nam, KCN Điện Nam – Điện Ngọc');   // điểm đến nhập tay còn nguyên
  assert.strictEqual(F['R-CU1'].pc[1].noiGiao, 'Kho Điện Bàn');                           // nơi giao thực tế trên phiếu còn nguyên
  assert.strictEqual(F['R-CU2'].info.vanChuyen.mode, 'tanKm');                           // v6: cước theo bậc chuyển sang tấn/km (chọn lại đơn giá), dữ liệu bậc còn ở bacCu
  assert.ok(!('bac' in F['R-CU2'].info.vanChuyen)); assert.deepStrictEqual(F['R-CU2'].info.vanChuyen.bacCu, [{den: 50, gia: 40000}, {den: 100, gia: 55000}]);
  assert.strictEqual(F['R-CU3'].pc[0].ngay, '31/02/2026'); assert.strictEqual(F['R-CU3'].pc[0].kl, 5);   // phiếu cũ sai ngày: giữ để người dùng sửa
  assert.deepStrictEqual(db.congTy, {});                                                  // chưa có công ty mua hàng
  assert.strictEqual(new Lookup(s).search('', '').total, lkBefore);                       // bản tra cứu 3 tab còn nguyên
  assert.ok(new Lookup(s).status().active);
  // nâng cấp xong ghi lại không làm đổi hồ sơ
  assert.strictEqual(s.save(db).changed, 0);                                              // ghi lại không làm đổi dòng nào
  s.close(); const again = new Store(f); assert.strictEqual(fs.readdirSync(path.join(d, 'backups')).length, 1); again.close();   // mở lại không sao lưu/nâng cấp lần nữa
});

/* Hồi quy rà soát 14/11/2026: chống mất dữ liệu ở lớp lưu */
test('hồi quy: lưu đối tượng không có danh sách chủ rừng ({} / null / rs mảng) bị từ chối, không xóa gì', () => {
  const s = new Store(':memory:'); s.save(sample());
  for (const bad of [{}, null, {v: 2}, {v: 2, rs: []}, {v: 2, rs: 'x'}]) assert.throws(() => s.save(bad), /không hợp lệ/);
  assert.strictEqual(Object.keys(s.load().rs).length, 1);
  assert.strictEqual(Object.keys(s.load().rs.r1.forests).length, 2);
});

test('hồi quy: xóa từ 2 chủ rừng trở lên trong một lần lưu bị chặn; xóa 1 chủ vẫn được; allowBulkDelete cho phép', () => {
  const s = new Store(':memory:'), o = (id) => ({id, info: {ten: 'CHỦ ' + id}, forests: {}});
  s.save({v: 2, rs: {a: o('a'), b: o('b'), c: o('c')}});
  assert.throws(() => s.save({v: 2, rs: {a: o('a')}}), e => e.code === 'BULK_DELETE');
  assert.deepStrictEqual(Object.keys(s.load().rs).sort(), ['a', 'b', 'c']);
  s.save({v: 2, rs: {a: o('a'), b: o('b')}});
  assert.deepStrictEqual(Object.keys(s.load().rs).sort(), ['a', 'b']);
  s.save({v: 2, rs: {}}, {allowBulkDelete: true});
  assert.strictEqual(Object.keys(s.load().rs).length, 0);
});

test('hồi quy: khôi phục "replace" vẫn thay được toàn bộ dữ liệu nhiều chủ rừng', () => {
  const d = tmp(), s = new Store(path.join(d, 'r.sqlite')), o = (id) => ({id, info: {ten: id}, forests: {}});
  s.save({v: 2, rs: {a: o('a'), b: o('b'), c: o('c')}});
  s.applyImport({v: 2, rs: {z: o('z')}}, 'replace');
  assert.deepStrictEqual(Object.keys(s.load().rs), ['z']);
});

test('hồi quy: lần lưu có xóa chủ/lô rừng tự sao lưu file trước, chỉ giữ 20 bản gần nhất', () => {
  const d = tmp(), bk = path.join(d, 'bk'), s = new Store(path.join(d, 'x.sqlite'), {backupDir: bk});
  s.save(sample());
  const snaps = () => (fs.existsSync(bk) ? fs.readdirSync(bk) : []).filter(n => n.startsWith('truoc-xoa-'));
  const one = sample(); delete one.rs.r1.forests.f2; s.save(one);
  assert.strictEqual(snaps().length, 1);
  const back = new Store(path.join(bk, snaps()[0])); assert.strictEqual(Object.keys(back.load().rs.r1.forests).length, 2); back.close();
  for (let i = 0; i < 25; i++) { s.save(sample()); s.save(one); }
  assert.strictEqual(snaps().length, 20);
  fs.writeFileSync(path.join(bk, 'truoc-khoi-phuc-2026.sqlite'), 'x');   // bản sao lưu loại khác không bị xóa
  s.save(sample()); s.save(one);
  assert.ok(fs.existsSync(path.join(bk, 'truoc-khoi-phuc-2026.sqlite')));
});

test('hồi quy: hai chủ rừng có lô trùng mã nội bộ → báo lỗi DUP_ID, không ghi đè mất lô', () => {
  const s = new Store(':memory:'), F = (ma) => ({id: 'f1', info: {maRung: ma}, nc: [], dx: [], pc: []});
  s.save({v: 2, rs: {A: {id: 'A', info: {ten: 'A'}, forests: {f1: F('R1')}}}});
  assert.throws(() => s.save({v: 2, rs: {A: {id: 'A', info: {ten: 'A'}, forests: {f1: F('R1')}}, B: {id: 'B', info: {ten: 'B'}, forests: {f1: F('R2')}}}}), e => e.code === 'DUP_ID' && /f1/.test(e.message));
  const o = s.load(); assert.strictEqual(o.rs.A.forests.f1.info.maRung, 'R1'); assert.ok(!o.rs.B);
});

test('hồi quy: chuyển lô sang chủ rừng khác mà nội dung lô không đổi — lưu toàn bộ vẫn cập nhật chủ của lô, mở lại không quay về chủ cũ', () => {
  const d = tmp(), f = path.join(d, 'mv.sqlite'), lot = {id: 'fx', info: {maRung: 'RX'}, nc: [], dx: [], pc: [{soPhieu: 'P1', kl: 10}]};
  let s = new Store(f);
  s.save({v: 2, rs: {a: {id: 'a', info: {ten: 'A'}, forests: {fx: lot}}, b: {id: 'b', info: {ten: 'B'}, forests: {}}}});
  const r = s.save({v: 2, rs: {a: {id: 'a', info: {ten: 'A'}, forests: {}}, b: {id: 'b', info: {ten: 'B'}, forests: {fx: lot}}}});
  assert.strictEqual(r.changed, 1);
  s.close(); s = new Store(f); const o = s.load();
  assert.deepStrictEqual([Object.keys(o.rs.a.forests), Object.keys(o.rs.b.forests)], [[], ['fx']]);
  s.close();
});

test('khóa chỉ đọc ở tầng lưu: lô đã chốt hoặc dừng không nhận thay đổi dữ liệu (save và saveDelta, mã LOCKED), thao tác vòng đời vẫn ghi được', () => {
  const V = require('../src/vongdoi'), D = require('../src/delta');
  const s = new Store(':memory:'), d = sample(); s.save(d);
  let db = s.load(); const f = db.rs.r1.forests.f1;
  // chốt (thao tác vòng đời) ghi được
  assert.ok(V.chot(f, 'KT', '2026-11-01T00:00:00Z', []).ok); s.save(db);
  assert.ok(s.load().rs.r1.forests.f1.chot, 'chốt được ghi');
  // sửa dữ liệu lô đã chốt: save bị từ chối, SQLite không đổi
  db = s.load(); db.rs.r1.forests.f1.exp = {soKT: '99'};
  assert.throws(() => s.save(db), e => e.code === 'LOCKED' && /R-1/.test(e.message));
  assert.deepStrictEqual(s.load().rs.r1.forests.f1.exp, {}, 'không ghi gì');
  // lô khác (không khóa) vẫn lưu được; lô khóa không đổi thì không bị chặn
  db = s.load(); db.rs.r1.forests.f2.exp = {soKT: '7'}; s.save(db); assert.strictEqual(s.load().rs.r1.forests.f2.exp.soKT, '7');
  // saveDelta cũng chặn
  db = s.load(); const snap0 = D.snapshot(db); db.rs.r1.forests.f1.nc = [{ten: 'SỬA'}]; db.rs.r1.forests.f1.exp = {x: 1};
  const dl = D.diff(snap0, D.snapshot(db)); dl.rev = s.rev; dl.side = D.side(db); dl.counts = D.snapshot(db).counts;
  assert.throws(() => s.saveDelta(dl), e => e.code === 'LOCKED');
  // mở khóa (có lý do) = thao tác vòng đời: được ghi; sau đó sửa được
  db = s.load(); assert.ok(V.moKhoa(db.rs.r1.forests.f1, 'sửa số phiếu', 'KT', '2026-11-02T00:00:00Z').ok); s.save(db);
  db = s.load(); assert.ok(!db.rs.r1.forests.f1.chot && db.rs.r1.forests.f1.nhatKy.length === 2);
  db.rs.r1.forests.f1.exp = {soKT: '99'}; s.save(db); assert.strictEqual(s.load().rs.r1.forests.f1.exp.soKT, '99');
  // dừng lô: chỉ đọc; mở lại lô mới sửa được
  db = s.load(); assert.ok(V.dung(db.rs.r1.forests.f1, 'ngừng', '01/11/2026', 'KT', '2026-11-03T00:00:00Z').ok); s.save(db);
  db = s.load(); db.rs.r1.forests.f1.info.diaDiem = 'X'; assert.throws(() => s.save(db), e => e.code === 'LOCKED');
  db = s.load(); assert.ok(V.moLai(db.rs.r1.forests.f1, 'tiếp tục', 'KT', '2026-11-04T00:00:00Z').ok); s.save(db);
  // chỉ khác thứ tự khóa: không tính là thay đổi
  db = s.load(); V.chot(db.rs.r1.forests.f1, 'KT', '2026-11-05T00:00:00Z', []); s.save(db);
  db = s.load(); const g = db.rs.r1.forests.f1, re = {}; Object.keys(g).reverse().forEach(k => { re[k] = g[k]; }); db.rs.r1.forests.f1 = re; s.save(db);
  // khôi phục lô (applyLot overwrite) lên lô đang khóa bị chặn
  assert.throws(() => { const c = s.load(); c.rs.r1.forests.f1.info.diaDiem = 'KHÁC'; s.save(c); }, e => e.code === 'LOCKED');
});
test('khóa chỉ đọc: viPhamKhoa chỉ tính thay đổi ngoài khóa vòng đời, lô chưa khóa không bao giờ vi phạm', () => {
  const V = require('../src/vongdoi'), a = {id: 'x', info: {a: 1}, chot: {at: 1}, nhatKy: []};
  assert.strictEqual(V.viPhamKhoa(a, Object.assign({}, a, {nhatKy: [{hanh: 'luutru'}], luuTru: {at: 2}})), false);
  assert.strictEqual(V.viPhamKhoa(a, Object.assign({}, a, {info: {a: 2}})), true);
  assert.strictEqual(V.viPhamKhoa(a, {id: 'x', info: {a: 1}}), false, 'mở khóa (bỏ chot) không đổi dữ liệu');
  assert.strictEqual(V.viPhamKhoa({id: 'x', info: {a: 1}}, {id: 'x', info: {a: 2}}), false, 'lô chưa khóa');
  assert.strictEqual(V.viPhamKhoa({id: 'x', dung: {at: 1}, info: {a: 1}}, {id: 'x', dung: {at: 1}, info: {a: 2}}), true, 'lô đã dừng');
});

test('khóa chỉ đọc: xóa lô hoặc chủ rừng có lô đang chốt bị chặn (LOCKED); khôi phục thay toàn bộ vẫn được', () => {
  const V = require('../src/vongdoi'), s = new Store(':memory:'); s.save(sample());
  let db = s.load(); V.chot(db.rs.r1.forests.f1, 'KT', '2026-11-01T00:00:00Z', []); s.save(db);
  db = s.load(); delete db.rs.r1.forests.f1; assert.throws(() => s.save(db), e => e.code === 'LOCKED');
  db = s.load(); delete db.rs.r1; assert.throws(() => s.save(db), e => e.code === 'LOCKED');
  db = s.load(); delete db.rs.r1.forests.f2; s.save(db); assert.ok(!('f2' in s.load().rs.r1.forests), 'lô không khóa xóa được');
  const t = sample(); assert.doesNotThrow(() => s.applyImport(t, 'replace'));
  assert.ok(!s.load().rs.r1.forests.f1.chot);
});

test('v10: đối tác một nguồn — dữ liệu 2.2 có cả danh mục đơn vị vận chuyển lẫn đối tác được gộp, không mất dòng, đội xe vẫn trỏ đúng, bản chụp bên B và lô không đổi', () => {
  const DM = require('../src/danhmuc'), d = fs.mkdtempSync(path.join(os.tmpdir(), 'hakqn-v10-')), file = path.join(d, 'x.sqlite');
  const f = {id: 'f', info: {maRung: 'R-1', tenRung: 'R'}, nc: [], dx: [{bienSo: '92C-1', hdvcId: 'h1', cccd: '049000000001', chuXe: 'AN'}], hdvc: [{id: 'h1', ten: 'Đội xe 1', key: '', donViId: 'dv1', ben: {id: 'dv1', loai: 'doanhnghiep', ten: 'CTY VẬN TẢI CŨ', mst: '0400111222'}, cuoc: null, exp: {}}], exp: {}};
  const s9 = new Store(file, {migrations: MIGRATIONS.slice(0, 9)}); s9.save({v: 2, dmDonViVC: {dv1: {id: 'dv1', loai: 'doanhnghiep', ten: 'CTY VẬN TẢI SỬA', mst: '0400111222', daiDien: 'ÔNG A'}, dv2: {id: 'dv2', loai: 'doanhnghiep', ten: 'CTY HAI'}},
    dmDoiTac: [{id: 'dn:dv1', loai: 'doanhnghiep', ten: 'CTY VẬN TẢI CŨ (bản chép lúc v8)', mst: '0400111222'}, {id: 'ct:049000000001', loai: 'nguoiKyVC', ten: 'AN', cccd: '049000000001'}],
    rs: {o: {id: 'o', info: {ten: 'CHỦ', ma: 'C', cccd: '049067005459'}, forests: {f}}}}); const truoc = JSON.stringify(s9.load().rs); s9.close();
  assert.ok(MIGRATIONS.length >= 10);
  const s10 = new Store(file), db = s10.load();
  assert.ok(!('dmDonViVC' in db), 'dmDonViVC không còn: doanh nghiệp chỉ ở một nơi');
  assert.deepStrictEqual(db.dmDoiTac.map(x => x.id).sort(), ['ct:049000000001', 'dn:dv1', 'dn:dv2'], 'không mất dòng nào, không thêm trùng');
  const dv1 = db.dmDoiTac.find(x => x.id === 'dn:dv1'); assert.strictEqual(dv1.ten, 'CTY VẬN TẢI SỬA', 'doanh nghiệp lấy theo nơi từng cho sửa (danh mục đơn vị vận chuyển)'); assert.strictEqual(dv1.daiDien, 'ÔNG A');
  assert.strictEqual(JSON.stringify(boNgayChup(s10.load().rs)), truoc, 'không đổi lô nào (ngoài ngày chụp danh mục của v11)');
  const h = db.rs.o.forests.f.hdvc[0]; assert.strictEqual(DM.timDoiTac(db.dmDoiTac, h.donViId).id, 'dn:dv1', 'đội xe vẫn trỏ đúng đối tác'); assert.strictEqual(DM.doiTacKey(h), 'dn:dv1'); assert.strictEqual(h.ben.ten, 'CTY VẬN TẢI CŨ', 'bản chụp bên B giữ nguyên (bản in không đổi)');
  s10.close();
  const s = new Store(file); assert.strictEqual(s.load().dmDoiTac.length, 3, 'mở lại không gộp thêm'); s.close();
});
test('hopNhatDoiTac: thêm doanh nghiệp mới, cập nhật dòng cùng mã, giữ cá nhân, không sửa đầu vào, idempotent', () => {
  const DM = require('../src/danhmuc'), dv = {dv1: {id: 'dv1', ten: 'A', mst: '1'}, dv2: {id: 'dv2', ten: 'B'}, dv3: {id: 'dv3', ten: ''}}, dt = [{id: 'ct:1', loai: 'nguoiKyVC', ten: 'X', cccd: '1'}, {id: 'dn:dv1', loai: 'doanhnghiep', ten: 'A cũ'}];
  const t = JSON.stringify([dv, dt]), r = DM.hopNhatDoiTac(dv, dt);
  assert.strictEqual(JSON.stringify([dv, dt]), t); assert.deepStrictEqual([r.gop, r.them, r.lech, r.list.length], [2, 1, 1, 3]);
  assert.strictEqual(DM.hopNhatDoiTac({}, dt).list.length, 2); assert.deepStrictEqual(DM.hopNhatDoiTac(dv, r.list).list, r.list);
  assert.strictEqual(DM.chuanDoiTacId('dv7'), 'dn:dv7'); assert.strictEqual(DM.chuanDoiTacId('dn:dv7'), 'dn:dv7'); assert.strictEqual(DM.chuanDoiTacId('ct:0490'), 'ct:0490'); assert.strictEqual(DM.chuanDoiTacId(''), '');
  assert.strictEqual(DM.doiTacKey({donViId: 'dv9'}), 'dn:dv9'); assert.strictEqual(DM.doiTacKey({donViId: 'ct:1'}), 'ct:1'); assert.strictEqual(DM.doiTacKey({key: '0490 00000001'}), 'ct:049000000001');
});

test('v11 (A4): dòng nhân công / xe cũ chưa có ngày chụp danh mục được gán ngày cập nhật của dòng danh mục hiện hành (không có thì ngày nâng cấp); chạy lại không đổi; dòng đã có giữ nguyên', () => {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'hakqn-v11-')), file = path.join(d, 'x.sqlite');
  const f = {id: 'f', info: {maRung: 'R-1', tenRung: 'R'}, exp: {},
    nc: [{_row: 2, ten: 'AN', cccd: '049000000001'}, {_row: 3, ten: 'BÌNH', cccd: '049000000002'}, {_row: 4, ten: 'CŨ', cccd: '049000000003', _dmNgay: '01/02/2026'}],
    dx: [{_row: 2, bienSo: '92C-1', chuXe: 'X'}, {_row: 3, bienSo: '92C-9', chuXe: 'Y'}]};
  const s10 = new Store(file, {migrations: MIGRATIONS.slice(0, 10)});
  s10.save({v: 2, dmLaoDong: [{ngayCapNhat: '05/03/2026', cccd: '049000000001', ten: 'AN'}, {ngayCapNhat: '', cccd: '049000000003', ten: 'CŨ'}], dmXeVC: [{ngayCapNhat: '07/03/2026', bienSo: '92C1', chuXe: 'X'}],
    rs: {o: {id: 'o', info: {ten: 'CHỦ', ma: 'C', cccd: '049067005459'}, forests: {f}}}}); s10.close();
  const s = new Store(file), lo = s.load().rs.o.forests.f, d0 = new Date(), hom = String(d0.getDate()).padStart(2, '0') + '/' + String(d0.getMonth() + 1).padStart(2, '0') + '/' + d0.getFullYear();
  assert.deepStrictEqual(lo.nc.map(r => r._dmNgay), ['05/03/2026', hom, '01/02/2026'], 'khớp danh mục: ngày của dòng danh mục; không khớp: ngày nâng cấp; đã có: giữ');
  assert.deepStrictEqual(lo.dx.map(r => r._dmNgay), ['07/03/2026', hom], 'biển số khớp bỏ dấu chấm, gạch');
  const DM = require('../src/danhmuc'), c = JSON.parse(JSON.stringify(lo));
  assert.strictEqual(DM.ganNgayChup(c, [], [], '01/01/2030'), 0, 'chạy lại không đổi');
  const khoa = {id: 'k', chot: {at: 'x'}, nc: [{cccd: '049000000001', ten: 'AN'}]}, dung = {id: 'd', dung: {at: 'x'}, dx: [{bienSo: '92C-1'}]};
  assert.deepStrictEqual([DM.ganNgayChup(khoa, [], [], '01/01/2030'), '_dmNgay' in khoa.nc[0], DM.ganNgayChup(dung, [], [], '01/01/2030'), '_dmNgay' in dung.dx[0]], [0, false, 0, false], 'lô đã chốt / đã dừng: không đổi (giữ dấu vân tay, không vướng khóa)');
  assert.deepStrictEqual(DM.lechLaoDong(Object.assign({}, lo.nc[0], {ten: 'AN SỬA TAY'}), {ngayCapNhat: '05/03/2026', cccd: '049000000001', ten: 'AN'}), [], 'sửa tay trong lô, danh mục không mới hơn lần chụp: không đề nghị lùi về số cũ');
  assert.deepStrictEqual(DM.lechLaoDong(lo.nc[0], {ngayCapNhat: '10/03/2026', cccd: '049000000001', ten: 'AN MỚI'}), ['họ tên'], 'danh mục có dòng mới hơn: đề nghị đúng trường');
  s.close();
});
