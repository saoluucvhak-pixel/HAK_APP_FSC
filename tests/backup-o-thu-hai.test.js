'use strict';
/* BK-01: "Sao lưu toàn bộ" thủ công cũng chép sang thư mục thứ hai (backupDir2: USB/ổ ngoài) như tự sao lưu; lỗi ổ thứ hai không làm hỏng thao tác chính. */
const test = require('node:test'), assert = require('node:assert');
const fs = require('fs'), os = require('os'), path = require('path');
const {Store} = require('../src/store');
const B = require('../src/backup');
const DM = require('../src/datamove');

const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'hakqn-bk2-'));
const NOW = new Date(2026, 10, 13, 9, 30, 15, 123);
const store = () => { const s = new Store(path.join(tmp(), 'a.sqlite')); s.save({v: 2, rs: {o1: {id: 'o1', info: {ma: 'A', ten: 'X', cccd: '049000000001'}, forests: {}}}}); return s; };

test('có thư mục thứ hai: chép cả .json và .sqlite, sao y bản chính, không còn tệp tạm', async () => {
  const s = store(), out = tmp(), out2 = path.join(tmp(), 'usb');
  try {
    const r = await B.backupAll({db: s.db, data: s.load(), outDir: out, outDir2: out2, now: () => NOW});
    assert.ok(r.ok, r.message); assert.ok(r.copy2.ok && !r.copy2.skipped, JSON.stringify(r.copy2));
    const names = fs.readdirSync(out2).sort();
    assert.deepStrictEqual(names, fs.readdirSync(out).sort());
    assert.ok(names.every(n => !/\.tmp-/.test(n)));
    assert.strictEqual(fs.readFileSync(path.join(out2, path.basename(r.json.file)), 'utf8'), fs.readFileSync(r.json.file, 'utf8'));
    assert.ok(DM.inspect(path.join(out2, path.basename(r.sqlite.file))).ok);
    assert.ok(/thư mục thứ hai/.test(r.message));
  } finally { s.close(); }
});
test('không có thư mục thứ hai: như cũ (copy2.skipped), không tạo gì thêm', async () => {
  const s = store(), out = tmp();
  try {
    const r = await B.backupAll({db: s.db, data: s.load(), outDir: out, now: () => NOW});
    assert.ok(r.ok); assert.strictEqual(r.copy2.skipped, true); assert.ok(!/thứ hai/.test(r.message));
  } finally { s.close(); }
});
test('ổ thứ hai lỗi (đường dẫn là một tệp): thao tác chính vẫn ok, copy2.ok=false kèm lý do, bản chính còn nguyên', async () => {
  const s = store(), out = tmp(), bad = path.join(tmp(), 'la-mot-tep'); fs.writeFileSync(bad, 'x');
  try {
    const r = await B.backupAll({db: s.db, data: s.load(), outDir: out, outDir2: bad, now: () => NOW});
    assert.strictEqual(r.ok, true, r.message); assert.strictEqual(r.copy2.ok, false); assert.ok(r.copy2.error);
    assert.ok(/CẢNH BÁO/.test(r.message)); assert.ok(fs.existsSync(r.json.file) && fs.existsSync(r.sqlite.file));
  } finally { s.close(); }
});
test('ổ thứ hai ghi lỗi giữa chừng: dọn tệp tạm, không ghi đè bản đã có, chính vẫn ok', async () => {
  const s = store(), out = tmp(), out2 = tmp();
  const io = {...fs, renameSync: (a, b) => { if (b.startsWith(out2) && b.endsWith('.sqlite')) throw Object.assign(new Error('giả lập'), {code: 'EIO'}); return fs.renameSync(a, b); }};
  try {
    const r = await B.backupAll({db: s.db, data: s.load(), outDir: out, outDir2: out2, now: () => NOW, io});
    assert.strictEqual(r.ok, true, r.message); assert.strictEqual(r.copy2.ok, false);
    const left = fs.readdirSync(out2); assert.ok(left.some(n => n.endsWith('.json'))); assert.ok(!left.some(n => /\.tmp-|\.sqlite/.test(n)), left.join());
  } finally { s.close(); }
});
