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
  assert.deepStrictEqual(p.incoming, {owners: 2, forests: 2, nc: 1, dx: 1, pc: 3});
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
  let s = new Store(f, {migrations: [MIGRATIONS[0]]}); s.save(sample()); s.close();
  s = new Store(f);
  assert.strictEqual(s.db.pragma('user_version', {simple: true}), MIGRATIONS.length);
  assert.strictEqual(Store.counts(s.load()).pc, 2);
  assert.ok(s.db.prepare("SELECT name FROM sqlite_master WHERE name='lookup_rows'").get());
  assert.ok(fs.readdirSync(path.join(d, 'backups')).some(n => n.startsWith('truoc-nang-cap-v1-len-v' + MIGRATIONS.length)));
});
