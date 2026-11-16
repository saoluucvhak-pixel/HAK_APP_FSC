'use strict';
/* Kho sao lưu (src/khosaoluu.js): liệt kê theo loại, kiểm tra bản dùng được / hỏng, khôi phục toàn bộ từ bản .sqlite qua đúng đường "thay toàn bộ"
 * (có bản sao lưu trước khi ghi, bản hỏng không ghi gì, file sao lưu gốc không bị đụng, bản cấu trúc cũ được nâng cấp trên bản chép), xóa có giới hạn;
 * tự sao lưu hằng ngày làm mới bản của hôm nay (src/autobackup.js refresh). */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs'), os = require('os'), path = require('path'), crypto = require('crypto');
const {Store, SCHEMA_VERSION} = require('../src/store');
const K = require('../src/khosaoluu');
const AB = require('../src/autobackup');
const V = require('../src/vongdoi'), M = require('../src/model');

const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'hakqn-ksl-'));
const lo = (id, ma, pc) => ({id, info: {maRung: ma, tenRung: 'Rừng ' + ma, giayTo: []}, nc: [{stt: 1, ten: 'NGƯỜI ' + ma, cccd: '049000000011', vaiTro: 'Tổ trưởng'}], dx: [], pc: pc.map((kl, i) => ({stt: i + 1, ngay: '05/01/2026', bienSo: '92C-0000' + i, soPhieu: ma + '-' + i, kl})), exp: {}});
const duLieu = extra => ({v: 2, rs: {o1: {id: 'o1', info: {ma: 'CR1', ten: 'CHỦ A', cccd: '049000000001'}, forests: Object.assign({f1: lo('f1', 'R1', [10, 11])}, extra || {})}}, congTy: {c1: {id: 'c1', ten: 'CÔNG TY X', mst: '0400000001'}}});
const md5 = f => crypto.createHash('md5').update(fs.readFileSync(f)).digest('hex');
const day = (y, m, d, h) => () => new Date(y, m - 1, d, h || 8, 0, 0);

test('liệt kê: nhận đúng từng loại theo tên file, bỏ file lạ, mới nhất trước, cộng dung lượng; thư mục trùng / không có không gây lỗi', () => {
  const d = tmp(), d2 = path.join(d, 'o-ngoai');
  const mk = (dir, n, t) => { fs.mkdirSync(dir, {recursive: true}); fs.writeFileSync(path.join(dir, n), 'x'.repeat(10)); fs.utimesSync(path.join(dir, n), t, t); };
  mk(d, 'tu-dong-2026-11-14.sqlite', 1000); mk(d, 'HoSoKhaiThac_SaoLuu_20261115-080000-000.sqlite', 2000); mk(d, 'HoSoKhaiThac_SaoLuu_20261115-080000-000.json', 2001);
  mk(d, 'truoc-nang-cap-v13-len-v14-2026-11-01T00-00-00-000Z.sqlite', 500); mk(d, 'truoc-khoi-phuc-lo-2026-11-02T00-00-00-000Z.sqlite', 600); mk(d, 'truoc-khoi-phuc-2026-11-03T00-00-00-000Z.sqlite', 700); mk(d, 'truoc-xoa-2026-11-04T00-00-00-000Z.sqlite', 800);
  mk(d, 'hakqn.sqlite', 9000); mk(d, 'ghi-chu.txt', 9000); mk(d, 'tu-dong-2026-11-14.sqlite.tmp-123', 9000); mk(d2, 'tu-dong-2026-11-13.sqlite', 900);
  const r = K.lietKe([d, d2, d, '', path.join(d, 'khong-co')]);
  assert.deepStrictEqual(r.items.map(x => x.loai), ['toanbo', 'toanbo', 'tudong', 'tudong', 'xoa', 'khoiphuc', 'khoiphuclo', 'nangcap']);
  assert.deepStrictEqual(r.items.slice(0, 2).map(x => x.dinhDang), ['json', 'sqlite']);
  assert.strictEqual(r.tong.soBan, 8); assert.strictEqual(r.tong.bytes, 80); assert.deepStrictEqual(r.loi, []);
  assert.throws(() => K.timTrongKho([d], path.join(d, 'hakqn.sqlite')), /không còn trong thư mục sao lưu/, 'file ngoài danh sách (kể cả cơ sở dữ liệu) không được thao tác');
  assert.throws(() => K.timTrongKho([d], '../../etc/passwd'), e => e.code === 'KHONG_CO');
});

test('kiểm tra: bản .sqlite và .json dùng được kèm số liệu; bản hỏng, cắt dở, sai định dạng báo rõ và không bị sửa', async () => {
  const d = tmp(), s = new Store(path.join(d, 'a.sqlite')); s.save(duLieu({f2: lo('f2', 'R2', [5])}));
  const r = await AB.daily(s, {dir: d, now: day(2026, 11, 14)}); s.close();
  const kt = K.kiemTra(r.file, SCHEMA_VERSION);
  assert.ok(kt.ok, kt.error); assert.strictEqual(kt.counts.owners, 1); assert.strictEqual(kt.counts.forests, 2); assert.strictEqual(kt.version, SCHEMA_VERSION);
  const j = path.join(d, 'HoSoKhaiThac_SaoLuu_1.json'); fs.writeFileSync(j, JSON.stringify(duLieu()));
  const kj = K.kiemTra(j); assert.ok(kj.ok); assert.deepStrictEqual([kj.counts.owners, kj.counts.forests, kj.counts.nc, kj.counts.pc], [1, 1, 1, 2]);
  const cat = path.join(d, 'HoSoKhaiThac_SaoLuu_2.json'); fs.writeFileSync(cat, JSON.stringify(duLieu()).slice(0, 40));
  assert.match(K.kiemTra(cat).error, /hỏng hoặc bị cắt dở/);
  const sai = path.join(d, 'HoSoKhaiThac_SaoLuu_3.json'); fs.writeFileSync(sai, '{"a":1}'); assert.match(K.kiemTra(sai).error, /không đúng định dạng/);
  const hong = path.join(d, 'tu-dong-2026-11-13.sqlite'), buf = fs.readFileSync(r.file); buf.fill(0x5a, 4096, 4096 + 2048); fs.writeFileSync(hong, buf);
  const truoc = md5(hong), kh = K.kiemTra(hong, SCHEMA_VERSION);
  assert.strictEqual(kh.ok, false); assert.ok(kh.error); assert.strictEqual(md5(hong), truoc, 'kiểm tra không sửa file');
  const rac = path.join(d, 'tu-dong-2026-11-12.sqlite'); fs.writeFileSync(rac, 'khong phai sqlite'); assert.strictEqual(K.kiemTra(rac, SCHEMA_VERSION).ok, false);
});

test('khôi phục từ bản .sqlite: thay toàn bộ đúng nội dung bản sao lưu, có bản sao lưu trước khi ghi, file gốc không đổi, không để -wal/-shm cạnh bản sao lưu', async () => {
  const d = tmp(), bk = path.join(d, 'backups'), s = new Store(path.join(d, 'a.sqlite'));
  s.save(duLieu());
  const r = await AB.daily(s, {dir: bk, now: day(2026, 11, 14)});
  const sau = duLieu({f2: lo('f2', 'R2', [7])}); sau.rs.o1.forests.f1.pc[0].kl = 99; sau.rs.o2 = {id: 'o2', info: {ma: 'CR2', ten: 'CHỦ B', cccd: '049000000002'}, forests: {}}; delete sau.congTy.c1;
  s.save(sau, {allowBulkDelete: true});
  const goc = md5(r.file), xem = K.xemTruoc(s, r.file, SCHEMA_VERSION);
  assert.deepStrictEqual([xem.trongBan.owners, xem.trongBan.forests, xem.trongBan.pc, xem.trongBan.companies], [1, 1, 2, 1]);
  assert.deepStrictEqual([xem.trenMay.owners, xem.trenMay.forests, xem.trenMay.pc, xem.trenMay.companies], [2, 2, 3, 0]);
  assert.strictEqual(s.load().rs.o1.forests.f1.pc[0].kl, 99, 'xem trước không ghi gì');
  const rev = s.rev, kq = K.khoiPhuc(s, r.file, SCHEMA_VERSION);
  assert.deepStrictEqual([kq.counts.owners, kq.counts.forests, kq.counts.pc, kq.counts.companies], [1, 1, 2, 1]);
  const db = s.load();
  assert.deepStrictEqual(Object.keys(db.rs), ['o1']); assert.deepStrictEqual(Object.keys(db.rs.o1.forests), ['f1']); assert.strictEqual(db.rs.o1.forests.f1.pc[0].kl, 10); assert.strictEqual(db.congTy.c1.ten, 'CÔNG TY X');
  assert.notStrictEqual(s.rev, rev, 'phiên bản dữ liệu đổi: giao diện lưu toàn bộ ở lần lưu kế');
  assert.ok(/truoc-khoi-phuc-\d{4}/.test(path.basename(kq.backup)) && fs.existsSync(kq.backup));
  const cu = new Store(kq.backup); assert.strictEqual(cu.load().rs.o1.forests.f1.pc[0].kl, 99, 'bản trước khi khôi phục giữ dữ liệu vừa bị thay: hoàn tác được'); cu.close();
  assert.strictEqual(md5(r.file), goc, 'file sao lưu gốc không bị đụng');
  assert.deepStrictEqual(fs.readdirSync(bk).filter(n => /-(wal|shm)$/.test(n)), []);
  // hoàn tác: khôi phục lại từ bản "trước khi khôi phục"
  K.khoiPhuc(s, kq.backup, SCHEMA_VERSION); assert.strictEqual(s.load().rs.o1.forests.f1.pc[0].kl, 99); assert.ok(s.load().rs.o2);
  s.close();
});

test('khôi phục: bản hỏng, bản không phải HAKQN, chính cơ sở dữ liệu đang dùng đều bị từ chối TRƯỚC khi sao lưu hay ghi', async () => {
  const d = tmp(), bk = path.join(d, 'backups'), s = new Store(path.join(d, 'a.sqlite')); s.save(duLieu());
  const r = await AB.daily(s, {dir: bk, now: day(2026, 11, 14)});
  const hong = path.join(bk, 'tu-dong-2026-11-13.sqlite'), buf = fs.readFileSync(r.file); buf.fill(0x5a, 4096, 4096 + 2048); fs.writeFileSync(hong, buf);
  const truoc = JSON.stringify(s.load()), n = fs.readdirSync(bk).length;
  assert.throws(() => K.khoiPhuc(s, hong, SCHEMA_VERSION), e => e.code === 'BAN_HONG' && /chưa bị thay đổi/.test(e.message));
  assert.throws(() => K.xemTruoc(s, hong, SCHEMA_VERSION), e => e.code === 'BAN_HONG');
  assert.throws(() => K.khoiPhuc(s, s.file, SCHEMA_VERSION), /đang dùng/);
  assert.strictEqual(JSON.stringify(s.load()), truoc); assert.strictEqual(fs.readdirSync(bk).length, n, 'không tạo bản sao lưu nào khi từ chối');
  s.close();
});

test('khôi phục: lô đã chốt còn chỉ đọc và nguyên vẹn; bản chụp của lần chốt trước được chép thêm', async () => {
  const d = tmp(), bk = path.join(d, 'backups'), s = new Store(path.join(d, 'a.sqlite'));
  const db = duLieu(); db.rs.o1.forests.f1 = M.ensureForest(db.rs.o1.forests.f1);
  V.chot(db.rs.o1.forests.f1, 'Lần 1', '2026-11-10T01:00:00.000Z', []); s.save(db);
  let f = s.load().rs.o1.forests.f1; V.moKhoa(f, 'sửa khối lượng', '2026-11-11T01:00:00.000Z'); const d2 = s.load(); d2.rs.o1.forests.f1 = f; s.save(d2);
  f = s.load().rs.o1.forests.f1; f.pc[0].kl = 12.5; V.chot(f, 'Lần 2', '2026-11-12T01:00:00.000Z', []); const d3 = s.load(); d3.rs.o1.forests.f1 = f; s.save(d3);
  assert.deepStrictEqual(s.dsGoi('f1').map(g => g.phienBan), [1, 2]);
  const r = await AB.daily(s, {dir: bk, now: day(2026, 11, 14)}); s.close();
  const s2 = new Store(path.join(d, 'may-moi.sqlite'), {backupDir: path.join(d, 'bk2')}); s2.save({v: 2, rs: {}});
  const kq = K.khoiPhuc(s2, r.file, SCHEMA_VERSION), f2 = s2.load().rs.o1.forests.f1;
  assert.ok(V.chiDoc(f2)); assert.strictEqual(f2.chot.phienBan, 2); assert.strictEqual(f2.pc[0].kl, 12.5);
  assert.strictEqual(V.kiemToanVen(f2, null, s2.kiemGoi('f1')).ma, 'nguyen-ven');
  assert.deepStrictEqual(s2.dsGoi('f1').map(g => g.phienBan), [1, 2]); assert.strictEqual(kq.goiCu, 1);
  assert.ok(s2.lichSuGoi('f1').every(g => g.ok), 'mọi bản chụp sau khôi phục qua kiểm tra');
  s2.close();
});

test('khôi phục từ bản cấu trúc cũ (v1.0.0): nâng cấp trên bản chép, file sao lưu gốc giữ nguyên cấu trúc cũ', () => {
  const d = tmp(), bk = path.join(d, 'backups'); fs.mkdirSync(bk);
  const cu = path.join(bk, 'truoc-nang-cap-v2-len-v14-2026-01-01T00-00-00-000Z.sqlite'); fs.copyFileSync(path.join(__dirname, 'fixtures', 'hakqn_v1_0_0.sqlite'), cu);
  const goc = md5(cu), s = new Store(path.join(d, 'a.sqlite'), {backupDir: bk}); s.save(duLieu());
  const kt = K.kiemTra(cu, SCHEMA_VERSION); assert.ok(kt.ok, kt.error); assert.ok(kt.version < SCHEMA_VERSION);
  K.khoiPhuc(s, cu, SCHEMA_VERSION);
  const own = s.load().rs.own1; assert.ok(own && own.info.ten === 'CHỦ RỪNG CŨ'); assert.strictEqual(Object.keys(own.forests).length, 3);
  assert.ok(Object.values(own.forests).every(f => Array.isArray(f.doi) && f.doi.length), 'lô đã ở cấu trúc hiện hành (có đội)');
  assert.strictEqual(md5(cu), goc); assert.ok(!fs.readdirSync(bk).some(n => /^truoc-nang-cap-v2-len-v\d+-2026-1[01]/.test(n) && n !== path.basename(cu)), 'không sinh bản "trước nâng cấp" thừa trong kho');
  s.close();
});

test('xóa: chỉ file đang có trong kho, không bao giờ xóa cơ sở dữ liệu đang dùng hay file ngoài danh sách', async () => {
  const d = tmp(), s = new Store(path.join(d, 'hakqn.sqlite'), {backupDir: d}); s.save(duLieu());
  const r = await AB.daily(s, {dir: d, now: day(2026, 11, 14)});
  fs.writeFileSync(path.join(d, 'ghi-chu.txt'), 'x');
  assert.throws(() => K.xoa([d], s.file, s.file), e => e.code === 'KHONG_CO'); assert.throws(() => K.xoa([d], path.join(d, 'ghi-chu.txt'), s.file), e => e.code === 'KHONG_CO');
  const x = K.xoa([d], r.file, s.file); assert.strictEqual(x.name, 'tu-dong-2026-11-14.sqlite'); assert.ok(!fs.existsSync(r.file));
  assert.ok(fs.existsSync(s.file) && fs.existsSync(path.join(d, 'ghi-chu.txt'))); assert.strictEqual(s.load().rs.o1.info.ten, 'CHỦ A');
  s.close();
});

test('tự sao lưu làm mới bản của hôm nay (refresh): chứa dữ liệu mới, không để file tạm, lỗi thì bản cũ còn nguyên; thư mục thứ hai thay theo', async () => {
  const d = tmp(), bk = path.join(d, 'bk'), bk2 = path.join(d, 'bk2'), s = new Store(path.join(d, 'a.sqlite')); s.save(duLieu());
  const r1 = await AB.daily(s, {dir: bk, now: day(2026, 11, 14, 8)}); assert.ok(r1.ok && !r1.skipped && !r1.refreshed);
  assert.ok(AB.copyTo(r1.file, bk2, 7).ok);
  const db = s.load(); db.rs.o1.forests.f1.pc[0].kl = 77; s.save(db);
  const r2 = await AB.daily(s, {dir: bk, now: day(2026, 11, 14, 17)}); assert.ok(r2.skipped && r2.reason === 'today', 'không refresh: giữ hành vi cũ');
  let b = new Store(r1.file); assert.strictEqual(b.load().rs.o1.forests.f1.pc[0].kl, 10); b.close();
  const r3 = await AB.daily(s, {dir: bk, now: day(2026, 11, 14, 17), refresh: true}); assert.ok(r3.ok && r3.refreshed && r3.file === r1.file, JSON.stringify(r3));
  b = new Store(r3.file); assert.strictEqual(b.load().rs.o1.forests.f1.pc[0].kl, 77); b.close();
  assert.deepStrictEqual(fs.readdirSync(bk).filter(n => !/^tu-dong-2026-11-14\.sqlite$/.test(n) && !/-(wal|shm)$/.test(n)), []);
  assert.ok(AB.copyTo(r3.file, bk2, 7).ok); b = new Store(path.join(bk2, 'tu-dong-2026-11-14.sqlite')); assert.strictEqual(b.load().rs.o1.forests.f1.pc[0].kl, 10, 'không overwrite: giữ bản đã chép'); b.close();
  assert.ok(AB.copyTo(r3.file, bk2, 7, {overwrite: true}).ok); b = new Store(path.join(bk2, 'tu-dong-2026-11-14.sqlite')); assert.strictEqual(b.load().rs.o1.forests.f1.pc[0].kl, 77); b.close();
  // lỗi giữa chừng (cơ sở dữ liệu đã đóng): bản của hôm nay còn nguyên
  const truoc = md5(r3.file); s.close();
  const r4 = await AB.daily(s, {dir: bk, now: day(2026, 11, 14, 18), refresh: true}); assert.strictEqual(r4.ok, false); assert.strictEqual(md5(r3.file), truoc);
});

test('bản tự tạo trước khi khôi phục chỉ giữ 20 bản gần nhất, không đụng loại khác', () => {
  const d = tmp(), bk = path.join(d, 'backups'), s = new Store(path.join(d, 'a.sqlite')); s.save(duLieu()); fs.mkdirSync(bk, {recursive: true});
  for (let i = 0; i < 25; i++) fs.writeFileSync(path.join(bk, 'truoc-khoi-phuc-2020-01-' + String(i + 1).padStart(2, '0') + 'T00-00-00-000Z.sqlite'), 'x');
  ['truoc-khoi-phuc-lo-2020-01-01T00-00-00-000Z.sqlite', 'truoc-nang-cap-v1-len-v2-2020-01-01T00-00-00-000Z.sqlite', 'tu-dong-2020-01-01.sqlite'].forEach(n => fs.writeFileSync(path.join(bk, n), 'x'));
  s.applyImport(duLieu(), 'replace');
  const ns = fs.readdirSync(bk), kp = ns.filter(n => /^truoc-khoi-phuc-\d{4}/.test(n)).sort();
  assert.strictEqual(kp.length, 20); assert.ok(kp[kp.length - 1] > 'truoc-khoi-phuc-2021', 'bản mới nhất còn'); assert.ok(!kp.includes('truoc-khoi-phuc-2020-01-01T00-00-00-000Z.sqlite'));
  assert.ok(['truoc-khoi-phuc-lo-2020-01-01T00-00-00-000Z.sqlite', 'truoc-nang-cap-v1-len-v2-2020-01-01T00-00-00-000Z.sqlite', 'tu-dong-2020-01-01.sqlite'].every(n => ns.includes(n)));
  s.close();
});
