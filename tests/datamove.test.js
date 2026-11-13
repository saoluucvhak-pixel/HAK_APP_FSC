'use strict';
/* Đổi thư mục dữ liệu an toàn (src/datamove.js): nguồn và đích có dữ liệu khác nhau, đích còn giao dịch trong WAL, lỗi giữa chừng,
 * đích hỏng / phiên bản mới hơn / không phải HAKQN / đang được dùng, lỗi lưu cấu hình, bị ngắt giữa chừng. Dùng cơ sở dữ liệu thử riêng trong thư mục tạm. */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs'), os = require('os'), path = require('path');
const Database = require('better-sqlite3');
const {Store, SCHEMA_VERSION} = require('../src/store');
const DM = require('../src/datamove');
const Settings = require('../src/settings');

const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'hakqn-dm-'));
const data = (tag, n = 1) => ({v: 2, rs: Object.fromEntries(Array.from({length: n}, (_, i) => [tag + i, {id: tag + i, info: {ma: tag + '-' + i, ten: 'CHỦ ' + tag + i, cccd: '04900000000' + i}, forests: {[tag + 'f' + i]: {id: tag + 'f' + i, info: {maRung: tag + '-R' + i, tenRung: 'Rừng ' + tag}, nc: [], dx: [], pc: [], exp: {}}}}]))});
const mkStore = (dir, d, name = 'hakqn.sqlite') => { fs.mkdirSync(dir, {recursive: true}); const s = new Store(path.join(dir, name)); s.save(d); return s; };
const counts = f => DM.inspect(f).counts;
const leftovers = dir => fs.readdirSync(dir).filter(n => /\.tmp-|\.thay-/.test(n));

/* Dựng hiện trường: nguồn đang mở (src), đích có dữ liệu khác (tùy chọn, có thể còn giao dịch chỉ nằm trong WAL) */
function scene(o = {}) {
  const root = tmp(), srcDir = path.join(root, 'src'), destDir = path.join(root, 'dest'), backupDir = path.join(root, 'bk');
  const src = mkStore(srcDir, data('S', 3));
  let destBefore = null;
  if (o.dest) {
    if (o.dest === 'wal') {      // đích có giao dịch đã commit còn trong WAL: sao chép file .sqlite + -wal + -shm khi kết nối còn mở, rồi đóng kết nối gốc
      const tdir = path.join(root, 'tmpd'), t = mkStore(tdir, data('D', 1));
      t.save(data('D', 4));       // commit thêm: nằm trong WAL
      assert.ok(fs.existsSync(path.join(tdir, 'hakqn.sqlite-wal')) && fs.statSync(path.join(tdir, 'hakqn.sqlite-wal')).size > 0, 'phải còn WAL');
      fs.mkdirSync(destDir, {recursive: true});
      for (const x of ['', '-wal', '-shm']) if (fs.existsSync(path.join(tdir, 'hakqn.sqlite' + x))) fs.copyFileSync(path.join(tdir, 'hakqn.sqlite' + x), path.join(destDir, 'hakqn.sqlite' + x));
      t.close();
    } else if (o.dest === 'plain') mkStore(destDir, data('D', 2)).close();
    else if (o.dest === 'corrupt') { fs.mkdirSync(destDir, {recursive: true}); fs.writeFileSync(path.join(destDir, 'hakqn.sqlite'), Buffer.from('SQLite format 3\0' + 'x'.repeat(5000), 'latin1')); }
    else if (o.dest === 'garbage') { fs.mkdirSync(destDir, {recursive: true}); fs.writeFileSync(path.join(destDir, 'hakqn.sqlite'), 'khong phai sqlite'); }
    else if (o.dest === 'newer') { const s = mkStore(destDir, data('D', 2)); s.db.pragma('user_version = ' + (SCHEMA_VERSION + 1)); s.close(); }
    else if (o.dest === 'foreign') { fs.mkdirSync(destDir, {recursive: true}); const d = new Database(path.join(destDir, 'hakqn.sqlite')); d.exec('CREATE TABLE foo(a)'); d.pragma('user_version = 1'); d.close(); }
    destBefore = {};
    for (const x of ['', '-wal', '-shm']) { const f = path.join(destDir, 'hakqn.sqlite' + x); destBefore[x] = fs.existsSync(f) ? fs.readFileSync(f) : null; }
  }
  fs.mkdirSync(destDir, {recursive: true});
  const cfg = {dataDir: ''};
  const run = (extra = {}) => DM.relocate({srcDb: src.db, srcFile: src.file, destDir, choice: o.choice, backupDir, supportedVersion: SCHEMA_VERSION,
    openNew: f => new Store(f, {backupDir: path.join(destDir, 'backups')}), commitConfig: () => { if (extra.failCommit) throw new Error('đĩa cấu hình chỉ đọc'); cfg.dataDir = destDir; }, hooks: extra.hooks, ...extra.o});
  const dest = path.join(destDir, 'hakqn.sqlite');
  return {root, srcDir, destDir, backupDir, src, destBefore, cfg, run, dest, walCounts: o.dest && o.dest !== 'corrupt' && o.dest !== 'garbage' && o.dest !== 'foreign' ? counts(dest) : null};
}
const srcCounts = s => counts(s.src.file);
const failsWith = async (p, code) => { let err; try { await p; } catch (e) { err = e; } assert.ok(err, 'phải lỗi'); if (code) assert.strictEqual(err.code, code, err.message); return err; };
/* Đích không đổi: file hỏng/không hợp lệ giữ nguyên từng byte; cơ sở dữ liệu hợp lệ giữ nguyên nội dung (việc mở độc quyền chỉ gộp WAL vào file chính, không đổi nội dung) */
const destUnchanged = (sc, logical) => {
  if (logical) { assert.deepStrictEqual(counts(sc.dest), logical); return; }
  for (const x of ['', '-wal', '-shm']) { const f = sc.dest + x, b = sc.destBefore[x]; if (b !== null) assert.ok(fs.existsSync(f) && Buffer.compare(fs.readFileSync(f), b) === 0, 'file đích đã bị đổi: ' + x); }
};

test('sao chép sang thư mục trống: khớp nội dung, không để lại file tạm, nguồn nguyên vẹn, cấu hình đổi sau cùng', async () => {
  const sc = scene(); const before = srcCounts(sc);
  const r = await sc.run();
  try {
    assert.strictEqual(r.choice, 'copy'); assert.deepStrictEqual(counts(sc.dest), before); assert.deepStrictEqual(srcCounts(sc), before);
    assert.strictEqual(sc.cfg.dataDir, sc.destDir); assert.deepStrictEqual(leftovers(sc.destDir), []);
    assert.strictEqual(Object.keys(r.newStore.load().rs).length, 3);
  } finally { r.newStore.close(); sc.src.close(); }
});

test('ghi đè: bản dự phòng nhất quán của đích gồm cả giao dịch còn trong WAL; mở được; đích mang dữ liệu nguồn', async () => {
  const sc = scene({dest: 'wal', choice: 'overwrite'});
  const walCounts = counts(sc.dest);   // đọc cả WAL
  assert.strictEqual(walCounts.owners, 4);
  const srcBefore = srcCounts(sc);
  const r = await sc.run();
  try {
    assert.ok(r.backupFile && DM.inspect(r.backupFile).ok);
    assert.deepStrictEqual(counts(r.backupFile), walCounts, 'bản dự phòng phải chứa cả dữ liệu từ WAL');
    assert.strictEqual(counts(r.backupFile).owners, 4);
    assert.deepStrictEqual(counts(sc.dest), srcBefore); assert.strictEqual(sc.cfg.dataDir, sc.destDir);
    assert.deepStrictEqual(leftovers(sc.destDir), []); assert.deepStrictEqual(r.replacedKept, []);
  } finally { r.newStore.close(); sc.src.close(); }
});

test('lỗi sao chép giữa chừng (sau khi ghi file tạm): đích y nguyên từng byte, không còn file tạm, cấu hình không đổi, bản dự phòng đã kiểm tra được giữ', async () => {
  const sc = scene({dest: 'wal', choice: 'overwrite'});
  try {
    await failsWith(sc.run({hooks: {step: n => { if (n === 'after-tmp') throw Object.assign(new Error('ổ bị rút giữa chừng'), {code: 'EIO'}); }}}));
    destUnchanged(sc, sc.walCounts); assert.deepStrictEqual(leftovers(sc.destDir), []); assert.strictEqual(sc.cfg.dataDir, '');
    assert.strictEqual(counts(sc.dest).owners, 4);
    const bk = fs.readdirSync(sc.backupDir).filter(n => /^truoc-ghi-de-/.test(n)); assert.strictEqual(bk.length, 1); assert.ok(DM.inspect(path.join(sc.backupDir, bk[0])).ok);
  } finally { sc.src.close(); }
});

test('lỗi sau khi đã thay file đích / sau khi mở / khi lưu cấu hình: hoàn tác, đích cũ (kể cả WAL) trở lại, cấu hình không đổi', async () => {
  for (const mode of ['after-replace', 'after-open', 'commit-fail', 'commit-hook']) {
    const sc = scene({dest: 'wal', choice: 'overwrite'});
    try {
      const o = mode === 'commit-fail' ? {failCommit: true} : {hooks: {step: n => { if (n === mode || (mode === 'commit-hook' && n === 'commit')) throw new Error('lỗi giả lập ' + n); }}};
      const e = await failsWith(sc.run(o));
      assert.ok(e.rolledBack !== false, mode);
      assert.strictEqual(sc.cfg.dataDir, '', mode); assert.deepStrictEqual(leftovers(sc.destDir), [], mode);
      assert.strictEqual(counts(sc.dest).owners, 4, mode + ': dữ liệu đích phải còn đủ (kể cả phần từ WAL)');
      assert.strictEqual(counts(sc.dest).forests, 4, mode);
      assert.strictEqual(DM.inspect(sc.dest).ok, true, mode);
      assert.strictEqual(srcCounts(sc).owners, 3, mode);
    } finally { sc.src.close(); }
  }
});

test('sao chép vào thư mục trống mà lỗi lưu cấu hình: không để lại file mới ở đích', async () => {
  const sc = scene();
  try { await failsWith(sc.run({failCommit: true}), 'CONFIG_FAILED'); assert.ok(!fs.existsSync(sc.dest)); assert.deepStrictEqual(leftovers(sc.destDir), []); assert.strictEqual(sc.cfg.dataDir, ''); }
  finally { sc.src.close(); }
});

test('bị ngắt đột ngột (app đóng) sau khi đổi tên file đích: cấu hình vẫn là vị trí cũ, lần sau tự khôi phục file đích', async () => {
  const sc = scene({dest: 'wal', choice: 'overwrite'});
  try {
    await failsWith(sc.run({hooks: {step: n => { if (n === 'after-replace-old') throw Object.assign(new Error('app bị đóng'), {simulateCrash: true}); }}}));
    assert.strictEqual(sc.cfg.dataDir, ''); assert.ok(!fs.existsSync(sc.dest), 'file đích đang ở tên tạm');
    assert.ok(leftovers(sc.destDir).some(n => /\.thay-/.test(n)));
    const done = DM.recoverInterrupted(sc.destDir); assert.ok(done.length >= 1);
    assert.strictEqual(counts(sc.dest).owners, 4); assert.ok(!leftovers(sc.destDir).some(n => /\.thay-/.test(n)));
  } finally { sc.src.close(); }
});

test('đích hỏng hoặc không phải SQLite: “dùng có sẵn” bị từ chối; “ghi đè” cũng từ chối vì không tạo được bản dự phòng đọc được; file đích giữ nguyên byte', async () => {
  for (const kind of ['corrupt', 'garbage']) {
    for (const choice of ['use', 'overwrite']) {
      const sc = scene({dest: kind, choice});
      try {
        const e = await failsWith(sc.run());
        assert.ok(/NOT_SQLITE|CORRUPT|DEST_UNUSABLE|IO/.test(e.code), kind + '/' + choice + ': ' + e.code);
        destUnchanged(sc); assert.strictEqual(sc.cfg.dataDir, ''); assert.deepStrictEqual(leftovers(sc.destDir), []);
      } finally { sc.src.close(); }
    }
  }
});

test('đích thuộc phiên bản mới hơn: không cho dùng; ghi đè được nhưng có bản dự phòng đọc được của bản mới', async () => {
  let sc = scene({dest: 'newer', choice: 'use'});
  try { await failsWith(sc.run(), 'NEWER_VERSION'); destUnchanged(sc, sc.walCounts); assert.strictEqual(sc.cfg.dataDir, ''); } finally { sc.src.close(); }
  sc = scene({dest: 'newer', choice: 'overwrite'});
  const r = await sc.run();
  try {
    assert.strictEqual(DM.inspect(r.backupFile).version, SCHEMA_VERSION + 1); assert.strictEqual(counts(r.backupFile).owners, 2);
    assert.strictEqual(counts(sc.dest).owners, 3);
  } finally { r.newStore.close(); sc.src.close(); }
});

test('đích là SQLite không phải HAKQN: từ chối cả “dùng” lẫn “ghi đè”', async () => {
  for (const choice of ['use', 'overwrite']) {
    const sc = scene({dest: 'foreign', choice});
    try { await failsWith(sc.run(), 'NOT_HAKQN'); destUnchanged(sc); assert.strictEqual(sc.cfg.dataDir, ''); } finally { sc.src.close(); }
  }
});

test('đích đang được tiến trình khác dùng: ghi đè dừng và báo rõ, không đổi gì', async () => {
  const sc = scene({dest: 'plain', choice: 'overwrite'});
  const other = new Store(sc.dest);   // một "tiến trình khác" đang mở cơ sở dữ liệu đích
  other.save(data('D', 2));
  try {
    const e = await failsWith(sc.run(), 'IN_USE');
    assert.ok(/đang được .*sử dụng/.test(e.message)); assert.strictEqual(counts(sc.dest).owners, 2);
    assert.strictEqual(sc.cfg.dataDir, ''); assert.deepStrictEqual(leftovers(sc.destDir), []);
    assert.ok(!fs.existsSync(sc.backupDir) || fs.readdirSync(sc.backupDir).length === 0, 'không tạo bản dự phòng khi chưa thể thay');
  } finally { other.close(); sc.src.close(); }
});

test('“dùng dữ liệu có sẵn”: chuyển sang đích, không sao chép, nội dung đích giữ nguyên', async () => {
  const sc = scene({dest: 'wal', choice: 'use'});
  const r = await sc.run();
  try {
    assert.strictEqual(r.choice, 'use'); assert.strictEqual(r.newStore.load() && Object.keys(r.newStore.load().rs).length, 4);
    assert.strictEqual(sc.cfg.dataDir, sc.destDir); assert.strictEqual(srcCounts(sc).owners, 3);
  } finally { r.newStore.close(); sc.src.close(); }
});

test('đích đã có dữ liệu mà chưa chọn: yêu cầu chọn (NEED_CHOICE), không đổi gì', async () => {
  const sc = scene({dest: 'plain'});
  try { await failsWith(sc.run(), 'NEED_CHOICE'); destUnchanged(sc, sc.walCounts); assert.strictEqual(sc.cfg.dataDir, ''); } finally { sc.src.close(); }
});

test('ổ biến mất rồi xuất hiện lại: khởi động không tự dùng bản mặc định, giữ cấu hình; có lại thì dùng bình thường', () => {
  const root = tmp(), userDir = path.join(root, 'ud'), drive = path.join(root, 'ODIA'); fs.mkdirSync(userDir, {recursive: true});
  const s = mkStore(drive, data('M', 2)); s.close();
  Settings.save(userDir, {dataDir: drive, backupDir: ''});
  assert.strictEqual(Settings.checkConfigured(userDir).state, 'ok');
  const gone = drive + '.moved'; fs.renameSync(drive, gone);                       // ổ bị rút
  let c = Settings.checkConfigured(userDir);
  assert.strictEqual(c.state, 'unavailable'); assert.strictEqual(c.code, 'DIR_MISSING'); assert.strictEqual(c.path, path.join(drive, 'hakqn.sqlite')); assert.ok(c.reason.includes(drive));
  assert.strictEqual(Settings.load(userDir).dataDir, drive, 'cấu hình cũ được giữ');
  assert.ok(!fs.existsSync(path.join(userDir, 'hakqn.sqlite')), 'không tạo cơ sở dữ liệu mặc định');
  fs.mkdirSync(drive);                                                              // ổ có lại nhưng chưa có file
  c = Settings.checkConfigured(userDir); assert.strictEqual(c.code, 'FILE_MISSING'); assert.ok(c.reason.includes('hakqn.sqlite'));
  fs.rmdirSync(drive); fs.renameSync(gone, drive);                                  // ổ có lại đầy đủ
  assert.strictEqual(Settings.checkConfigured(userDir).state, 'ok'); assert.strictEqual(counts(path.join(drive, 'hakqn.sqlite')).owners, 2);
});

test('không có quyền truy cập thư mục dữ liệu: báo NO_PERMISSION (bỏ qua trên Windows vì chmod không chặn được, và khi chạy bằng root)', { skip: process.platform === 'win32' || (process.getuid && process.getuid() === 0) }, () => {
  const root = tmp(), userDir = path.join(root, 'ud'), d = path.join(root, 'x'); fs.mkdirSync(userDir); const s = mkStore(d, data('P')); s.close(); Settings.save(userDir, {dataDir: d, backupDir: ''});
  fs.chmodSync(d, 0o000);
  try { assert.strictEqual(Settings.checkConfigured(userDir).code, 'NO_PERMISSION'); } finally { fs.chmodSync(d, 0o755); }
});

test('khởi động lần đầu (chưa cấu hình, chưa có file) là bình thường; HAKQN_DB khóa vị trí', () => {
  const userDir = tmp(); assert.strictEqual(Settings.checkConfigured(userDir).state, 'ok');
  Settings.save(userDir, {dataDir: '/khong/co/thu/muc', backupDir: ''});
  assert.strictEqual(Settings.checkConfigured(userDir, {HAKQN_DB: '/x/y.sqlite'}).state, 'ok');
  assert.strictEqual(Settings.checkConfigured(userDir).state, 'unavailable');
});
