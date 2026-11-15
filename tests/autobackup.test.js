'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs'), os = require('os'), path = require('path');
const Database = require('better-sqlite3');
const {Store} = require('../src/store');
const AB = require('../src/autobackup');

const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'hakqn-ab-'));
const withData = f => { const s = new Store(f); s.save({v: 2, rs: {o1: {id: 'o1', info: {ten: 'CHỦ A', cccd: '049000000001'}, forests: {f1: {id: 'f1', info: {maRung: 'R1'}, nc: [], dx: [], pc: [{soPhieu: 'P1', kl: 10}]}}}}}); return s; };
const day = (y, m, d) => () => new Date(y, m - 1, d, 8, 0, 0);
const names = dir => fs.readdirSync(dir).filter(n => !n.startsWith('.')).sort();

test('tự sao lưu: mỗi ngày một bản, đọc lại đủ dữ liệu (kể cả giao dịch còn trong WAL), không để file tạm', async () => {
  const d = tmp(), bk = path.join(d, 'bk'), s = withData(path.join(d, 'a.sqlite'));
  const r = await AB.daily(s, {dir: bk, now: day(2026, 11, 14)});
  assert.ok(r.ok && !r.skipped, JSON.stringify(r));
  assert.strictEqual(path.basename(r.file), 'tu-dong-2026-11-14.sqlite');
  const back = new Store(r.file); assert.strictEqual(back.load().rs.o1.forests.f1.pc[0].soPhieu, 'P1'); back.close();
  const r2 = await AB.daily(s, {dir: bk, now: day(2026, 11, 14)});
  assert.ok(r2.ok && r2.skipped && r2.reason === 'today');
  assert.deepStrictEqual(names(bk), ['tu-dong-2026-11-14.sqlite']);
  s.close();
});

test('tự sao lưu: xoay vòng chỉ giữ N bản gần nhất, không xóa bản sao lưu loại khác', async () => {
  const d = tmp(), bk = path.join(d, 'bk'), s = withData(path.join(d, 'a.sqlite'));
  fs.mkdirSync(bk); ['truoc-nang-cap-v2-len-v3-x.sqlite', 'hakqn-sao-luu-2026.json', 'tu-dong-ghi-chu.txt'].forEach(n => fs.writeFileSync(path.join(bk, n), 'x'));
  for (let i = 1; i <= 10; i++) await AB.daily(s, {dir: bk, keep: 3, now: day(2026, 11, i)});
  assert.deepStrictEqual(AB.list(bk).map(b => b.day), ['2026-11-10', '2026-11-09', '2026-11-08']);
  for (const n of ['truoc-nang-cap-v2-len-v3-x.sqlite', 'hakqn-sao-luu-2026.json', 'tu-dong-ghi-chu.txt']) assert.ok(fs.existsSync(path.join(bk, n)), n);
  s.close();
});

test('tự sao lưu: bỏ qua cơ sở dữ liệu trống và bộ nhớ; lỗi ghi không ném, không để file dở', async () => {
  const d = tmp(), bk = path.join(d, 'bk');
  const e = new Store(path.join(d, 'trong.sqlite'));
  assert.strictEqual((await AB.daily(e, {dir: bk, now: day(2026, 1, 1)})).reason, 'empty'); e.close();
  assert.strictEqual((await AB.daily(new Store(':memory:'), {dir: bk})).reason, 'memory');
  const s = withData(path.join(d, 'a.sqlite'));
  fs.writeFileSync(path.join(d, 'la-file'), 'x');                      // "thư mục" sao lưu thực ra là một file: không tạo được
  const r = await AB.daily(s, {dir: path.join(d, 'la-file'), now: day(2026, 1, 2)});
  assert.ok(!r.ok && r.error);
  assert.deepStrictEqual(fs.readdirSync(d).filter(n => /\.tmp-/.test(n)), []);
  s.close();
});

test('tự sao lưu: ngày theo giờ máy (không theo UTC)', () => {
  assert.strictEqual(AB.dayOf(new Date(2026, 0, 1, 0, 30)), '2026-01-01');
  assert.strictEqual(AB.dayOf(new Date(2026, 11, 31, 23, 59)), '2026-12-31');
});
