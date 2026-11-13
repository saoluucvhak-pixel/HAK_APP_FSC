'use strict';
/* Sao lưu toàn bộ (JSON + SQLite) và ghi file sao lưu lô an toàn (src/backup.js), kể cả lỗi giả lập: hết dung lượng, mất kết nối giữa chừng. */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs'), os = require('os'), path = require('path');
const {Store} = require('../src/store');
const B = require('../src/backup');
const DM = require('../src/datamove');

const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'hakqn-bk-'));
const data = () => ({v: 2, rs: {o1: {id: 'o1', info: {ma: 'A', ten: 'X', cccd: '049000000001'}, forests: {f1: {id: 'f1', info: {maRung: 'R1', tenRung: 'R'}, nc: [], dx: [], pc: [], exp: {}}}}}});
const store = () => { const d = tmp(), s = new Store(path.join(d, 'a.sqlite')); s.save(data()); return s; };
const NOW = new Date(2026, 10, 13, 9, 30, 15, 123);
const files = d => fs.readdirSync(d).sort();
const ioWith = over => ({...fs, writeFileSync: fs.writeFileSync, readFileSync: fs.readFileSync, renameSync: fs.renameSync, unlinkSync: fs.unlinkSync, existsSync: fs.existsSync, ...over});

test('sao lưu thành công: cả JSON và SQLite qua kiểm tra, không còn file tạm', async () => {
  const s = store(), out = tmp();
  const r = await B.backupAll({db: s.db, data: s.load(), outDir: out, dbBytes: 1000, now: () => NOW});
  try {
    assert.strictEqual(r.ok, true, r.message); assert.ok(r.json.ok && r.sqlite.ok);
    assert.deepStrictEqual(files(out).map(f => path.extname(f)), ['.json', '.sqlite']);
    assert.strictEqual(DM.inspect(r.sqlite.file).ok, true); assert.ok(JSON.parse(fs.readFileSync(r.json.file, 'utf8')).rs.o1);
  } finally { s.close(); }
});

test('bấm hai lần liên tiếp (cùng một thời điểm): không ghi đè, lần hai có hậu tố _2', async () => {
  const s = store(), out = tmp();
  try {
    const a = await B.backupAll({db: s.db, data: s.load(), outDir: out, now: () => NOW});
    const before = fs.readFileSync(a.json.file, 'utf8');
    s.save({v: 2, rs: {}});   // dữ liệu đổi giữa hai lần bấm
    const b = await B.backupAll({db: s.db, data: s.load(), outDir: out, now: () => NOW});
    assert.ok(a.ok && b.ok); assert.notStrictEqual(a.json.file, b.json.file); assert.ok(/_2\.json$/.test(b.json.file));
    assert.strictEqual(fs.readFileSync(a.json.file, 'utf8'), before, 'bản đầu không bị ghi đè');
    assert.strictEqual(DM.inspect(a.sqlite.file).counts.owners, 1); assert.strictEqual(DM.inspect(b.sqlite.file).counts.owners, 0);
    assert.strictEqual(files(out).filter(n => /\.(json|sqlite)$/.test(n)).length, 4);
  } finally { s.close(); }
});

test('hết dung lượng khi ghi JSON: SQLite vẫn dùng được và được báo rõ; ok=false (không cập nhật mốc); không còn file tạm', async () => {
  const s = store(), out = tmp();
  try {
    const io = ioWith({writeFileSync: (f, t) => { if (/\.json\.tmp/.test(f)) { fs.writeFileSync(f, String(t).slice(0, 20)); throw Object.assign(new Error('no space'), {code: 'ENOSPC'}); } return fs.writeFileSync(f, t); }});
    const r = await B.backupAll({db: s.db, data: s.load(), outDir: out, now: () => NOW, io});
    assert.strictEqual(r.ok, false); assert.strictEqual(r.json.ok, false); assert.strictEqual(r.sqlite.ok, true);
    assert.ok(/hết dung lượng/.test(r.json.error), r.json.error); assert.ok(/File dùng được: SQLite/.test(r.message), r.message);
    assert.deepStrictEqual(files(out).map(f => path.extname(f)), ['.sqlite']);
  } finally { s.close(); }
});

test('lỗi khi sao lưu SQLite (mất kết nối giữa chừng): JSON dùng được; file tạm SQLite và phần phụ bị dọn', async () => {
  const s = store(), out = tmp();
  try {
    const r = await B.backupAll({db: s.db, data: s.load(), outDir: out, now: () => NOW, hooks: {afterSqliteCopy: f => { fs.writeFileSync(f + '-wal', 'x'); throw Object.assign(new Error('mất kết nối'), {code: 'EIO'}); }}});
    assert.strictEqual(r.ok, false); assert.strictEqual(r.json.ok, true); assert.strictEqual(r.sqlite.ok, false);
    assert.ok(/mất kết nối ổ/.test(r.sqlite.error), r.sqlite.error); assert.ok(/File dùng được: JSON/.test(r.message));
    assert.deepStrictEqual(files(out).map(f => path.extname(f)), ['.json']);
  } finally { s.close(); }
});

test('ghi dở JSON rồi mất kết nối: file tạm bị xóa, không để lại file JSON hỏng', async () => {
  const s = store(), out = tmp();
  try {
    const io = ioWith({renameSync: (a, b) => { if (/\.json/.test(b)) throw Object.assign(new Error('đĩa bị rút'), {code: 'EIO'}); return fs.renameSync(a, b); }});
    const r = await B.backupAll({db: s.db, data: s.load(), outDir: out, now: () => NOW, io});
    assert.strictEqual(r.json.ok, false); assert.strictEqual(r.ok, false);
    assert.ok(!files(out).some(f => /\.json/.test(f)), files(out).join(','));
  } finally { s.close(); }
});

test('thiếu dung lượng trước khi ghi: dừng sớm, không ghi file nào', async () => {
  const s = store(), out = tmp();
  try {
    const r = await B.backupAll({db: s.db, data: s.load(), outDir: out, dbBytes: 50 * 1048576, now: () => NOW, hooks: {freeBytes: 10 * 1048576}});
    assert.strictEqual(r.ok, false); assert.ok(/không đủ chỗ trống/.test(r.message)); assert.deepStrictEqual(files(out), []);
  } finally { s.close(); }
});

test('thư mục sao lưu không tồn tại: báo lỗi rõ, không ghi gì', async () => {
  const s = store();
  try { const r = await B.backupAll({db: s.db, data: s.load(), outDir: path.join(tmp(), 'khong-co'), now: () => NOW}); assert.strictEqual(r.ok, false); assert.ok(/không dùng được/.test(r.message)); }
  finally { s.close(); }
});

test('ghi file sao lưu lô: qua tên tạm, đọc lại kiểm tra; tên tự chọn không ghi đè bản có sẵn', () => {
  const out = tmp(), f = path.join(out, 'HAKQN_LoRung_R1.json');
  const a = B.saveLotFile({file: f, text: '{"a":1}', unique: true}), b = B.saveLotFile({file: f, text: '{"a":2}', unique: true});
  assert.notStrictEqual(a, b); assert.strictEqual(fs.readFileSync(a, 'utf8'), '{"a":1}'); assert.ok(/_2\.json$/.test(b));
  assert.throws(() => B.saveLotFile({file: path.join(out, 'x.json'), text: '{}', verify: () => { throw new Error('gói lô sai mã kiểm tra'); }}), /gói lô sai/);
  assert.ok(!files(out).some(n => /x\.json/.test(n)), 'không để lại file hỏng hoặc file tạm');
  assert.throws(() => B.saveLotFile({file: path.join(out, 'y.json'), text: '{}', io: ioWith({renameSync: () => { throw Object.assign(new Error('x'), {code: 'ENOSPC'}); }})}), /hết dung lượng/);
  assert.ok(!files(out).some(n => /y\.json/.test(n)));
});
