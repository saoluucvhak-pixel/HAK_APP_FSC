'use strict';
/* Phiếu #13a (quyết định 7 của CHỦ): thư mục sao lưu SQLite và JSON riêng; tự sao lưu SQLite theo chu kỳ Tắt / 2 giờ / ngày / tuần (xoay vòng theo
 * từng chu kỳ); "Sao lưu toàn bộ" ghi .sqlite và .json vào hai thư mục; kho sao lưu nhận các tên mới (2 giờ, tuần, nhập từ ngoài). */
const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('fs'), os = require('os'), path = require('path');
const S = require('../src/settings'), A = require('../src/autobackup'), B = require('../src/backup'), K = require('../src/khosaoluu');
const {Store} = require('../src/store');
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'hakqn-13a-'));
const coDuLieu = () => { const s = new Store(path.join(tmp(), 'd.sqlite')); s.save({v: 2, rs: {o1: {id: 'o1', info: {ma: 'C', ten: 'X', cccd: '049000000001'}, forests: {}}}}); return s; };

test('chuyển cài đặt cũ: backupDir cũ thành thư mục SQLite và JSON; autoKeep 0 → Tắt, còn lại → hằng ngày', () => {
  const u1 = tmp(), b = tmp(); fs.writeFileSync(S.file(u1), JSON.stringify({backupDir: b, autoKeep: 0}));
  const s1 = S.load(u1); assert.equal(s1.backupDirSql, b); assert.equal(s1.backupDirJson, b); assert.equal(s1.autoChuKy, 'tat'); assert.equal(s1.autoKeep, 0);
  const u2 = tmp(); fs.writeFileSync(S.file(u2), JSON.stringify({backupDir: b, autoKeep: 14}));
  const s2 = S.load(u2); assert.equal(s2.autoChuKy, 'ngay'); assert.equal(s2.autoKeep, 14);
});

test('đặt "Giữ: Tắt" (autoKeep 0) khi đang có chu kỳ hằng ngày: lưu thành Tắt (không âm thầm vẫn tự sao lưu)', () => {
  const u = tmp(); S.save(u, {...S.load(u), autoChuKy: 'ngay', autoKeep: 7});
  S.save(u, {...S.load(u), autoKeep: 0}); const s = S.load(u); assert.equal(s.autoChuKy, 'tat'); assert.equal(s.autoKeep, 0);
});

test('lưu rồi đọc lại hai thư mục riêng và chu kỳ; resolve trả cả hai thư mục', () => {
  const u = tmp(), sql = tmp(), js = tmp();
  S.save(u, {...S.load(u), backupDirSql: sql, backupDirJson: js, autoChuKy: 'tuan', autoKeep: 3});
  const s = S.load(u); assert.equal(s.backupDirSql, sql); assert.equal(s.backupDir, sql); assert.equal(s.backupDirJson, js); assert.equal(s.autoChuKy, 'tuan'); assert.equal(s.autoKeep, 3);
  const r = S.resolve(u); assert.equal(r.backupDirSql, sql); assert.equal(r.backupDir, sql); assert.equal(r.backupDirJson, js); assert.ok(r.customBackup && r.customBackupJson);
});

test('tự sao lưu hằng tuần: một bản mỗi tuần ISO, tuần sau tạo bản mới, xoay vòng chỉ bản hằng tuần', async () => {
  const s = coDuLieu(), dir = tmp();
  fs.writeFileSync(path.join(dir, 'tu-dong-2026-11-01.sqlite'), 'x');   // bản hằng ngày cũ: không bị xóa khi xoay vòng bản tuần
  const r1 = await A.tuDong(s, {dir, keep: 1, chuKy: 'tuan', now: () => new Date(2026, 10, 19, 9)});
  assert.ok(r1.ok && !r1.skipped); assert.equal(path.basename(r1.file), 'tu-dong-tuan-2026-W47.sqlite');
  const r2 = await A.tuDong(s, {dir, keep: 1, chuKy: 'tuan', now: () => new Date(2026, 10, 20, 9)});
  assert.ok(r2.skipped, 'cùng tuần: bỏ qua');
  const r3 = await A.tuDong(s, {dir, keep: 1, chuKy: 'tuan', now: () => new Date(2026, 10, 26, 9)});
  assert.equal(path.basename(r3.file), 'tu-dong-tuan-2026-W48.sqlite'); assert.deepEqual(r3.removed, ['tu-dong-tuan-2026-W47.sqlite']);
  assert.ok(fs.existsSync(path.join(dir, 'tu-dong-2026-11-01.sqlite')));
  s.close();
});

test('tự sao lưu mỗi 2 giờ: khung 2 giờ theo giờ chẵn; làm mới trong cùng khung; khung sau tạo bản mới', async () => {
  const s = coDuLieu(), dir = tmp();
  const r1 = await A.tuDong(s, {dir, keep: 5, chuKy: '2gio', now: () => new Date(2026, 10, 19, 15, 10)});
  assert.equal(path.basename(r1.file), 'tu-dong-2026-11-19-1400.sqlite');
  assert.ok((await A.tuDong(s, {dir, keep: 5, chuKy: '2gio', now: () => new Date(2026, 10, 19, 15, 50)})).skipped);
  const r3 = await A.tuDong(s, {dir, keep: 5, chuKy: '2gio', refresh: true, now: () => new Date(2026, 10, 19, 15, 55)});
  assert.ok(r3.refreshed);
  const r4 = await A.tuDong(s, {dir, keep: 5, chuKy: '2gio', now: () => new Date(2026, 10, 19, 16, 1)});
  assert.equal(path.basename(r4.file), 'tu-dong-2026-11-19-1600.sqlite');
  assert.deepEqual(A.list(dir, '2gio').map(x => x.name), ['tu-dong-2026-11-19-1600.sqlite', 'tu-dong-2026-11-19-1400.sqlite']);
  assert.deepEqual(A.list(dir).map(x => x.name), [], 'danh sách hằng ngày không lẫn bản 2 giờ');
  s.close();
});

test('sao lưu toàn bộ ghi .sqlite vào thư mục SQLite và .json vào thư mục JSON', async () => {
  const s = coDuLieu(), sql = tmp(), js = tmp();
  const r = await B.backupAll({db: s.db, data: s.load(), outDir: sql, outDirJson: js});
  assert.ok(r.ok, r.message);
  assert.equal(path.dirname(r.sqlite.file), sql); assert.equal(path.dirname(r.json.file), js);
  assert.deepEqual(fs.readdirSync(sql).filter(n => /\.(json|sqlite)$/.test(n)).map(n => path.extname(n)), ['.sqlite']);
  assert.deepEqual(fs.readdirSync(js).map(n => path.extname(n)), ['.json']);
  s.close();
});

test('kho sao lưu nhận bản 2 giờ, hằng tuần, nhập từ ngoài; hai thư mục trùng nhau chỉ liệt kê một lần', () => {
  const d = tmp();
  for (const n of ['tu-dong-2026-11-19-1400.sqlite', 'tu-dong-tuan-2026-W47.sqlite', 'nhap-ngoai-20261120-080000.sqlite', 'HoSoKhaiThac_SaoLuu_x.json']) fs.writeFileSync(path.join(d, n), 'x');
  const r = K.lietKe([d, d]);
  assert.deepEqual(r.items.map(x => x.loai).sort(), ['nhapngoai', 'toanbo', 'tudong2gio', 'tudongtuan']);
});

test('phiếu #13b: tab Sao lưu và khôi phục có đủ 4 thao tác, khung SQLite (gộp thư mục thứ 2 + chu kỳ + số bản giữ), khung JSON và nhắc sao lưu; tab Hệ thống chỉ còn thư mục dữ liệu', () => {
  const f15 = fs.readFileSync(path.join(__dirname, '..', 'ui', 'app', '15-du-lieu-cai-dat-sao-luu-lo.js'), 'utf8');
  const f29 = fs.readFileSync(path.join(__dirname, '..', 'ui', 'app', '29-kho-sao-luu.js'), 'utf8');
  const sysPaint = f15.slice(f15.indexOf('function settingsPaint()'), f15.indexOf('function autoBackupCard('));
  assert.ok(sysPaint.includes('Thư mục dữ liệu') && !sysPaint.includes('id="dbBk2"') && !sysPaint.includes('id="setRemind"'), 'tab Hệ thống chỉ giữ Thư mục dữ liệu');
  for (const id of ['kslJson', 'restorePickBtn', 'kslLotSaveBtn', 'lotRestoreBtn', 'autoBk', 'setAutoChuKy', 'setAutoKeep', 'dbBk2', 'jsonBk', 'remindBk', 'setRemind']) {
    assert.ok(f29.includes(id), 'tab Sao lưu và khôi phục thiếu ' + id);
  }
});

