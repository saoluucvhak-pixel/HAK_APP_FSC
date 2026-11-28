/* BK-02: dọn tệp tạm mồ côi dạng .tmp-<pid>-<thời gian> (do datamove.js tạo) cũ hơn 1 ngày. */
const test = require('node:test'), assert = require('node:assert');
const fs = require('fs'), os = require('os'), path = require('path');
const AB = require('../src/autobackup');

test('cleanStaleTmp xóa tệp tạm 2 cụm số cũ, giữ tệp .sqlite và tệp tạm mới', () => {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'hakqn-ab2-'));
  const cu = ['a.sqlite.tmp-123-1700000000000', 'a.sqlite.tmp-123-1700000000000-wal', 'a.sqlite.tmp-123'];
  const giu = ['a.sqlite', 'moi.sqlite.tmp-9-1700000000001'];
  [...cu, ...giu].forEach(n => fs.writeFileSync(path.join(d, n), 'x'));
  const old = new Date(Date.now() - 3 * 86400000);
  [...cu, 'a.sqlite'].forEach(n => fs.utimesSync(path.join(d, n), old, old));
  assert.strictEqual(AB.cleanStaleTmp(d), 3);
  assert.deepStrictEqual(fs.readdirSync(d).sort(), giu.slice().sort());
});
