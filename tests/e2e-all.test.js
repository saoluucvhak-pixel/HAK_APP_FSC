'use strict';
const test = require('node:test');
const assert = require('node:assert');
const R = require('../scripts/e2e-all');

test('bộ chạy e2e: phân loại đạt / không đạt / lỗi chạy / quá giờ từ dòng ĐẠT–LỖI và mã thoát', () => {
  const ok = R.summarize('e2e-x', 'ĐẠT  a\nĐẠT  b\nTẤT CẢ ĐẠT\n', 0, 1234, false);
  assert.deepStrictEqual([ok.status, ok.ok, ok.pass, ok.fail, ok.seconds], ['đạt', true, 2, 0, 1.2]);
  const bad = R.summarize('e2e-x', 'ĐẠT  a\nLỖI  b — chi tiết\n1 MỤC LỖI\n', 1, 10, false);
  assert.deepStrictEqual([bad.status, bad.ok, bad.pass, bad.fail, bad.failed[0]], ['không đạt', false, 1, 1, 'b — chi tiết']);
  assert.ok(bad.tail.length > 0);
  assert.strictEqual(R.summarize('e2e-x', 'Error: boom', 2, 10, false).status, 'lỗi chạy');
  assert.strictEqual(R.summarize('e2e-x', 'ĐẠT  a', null, 10, true).status, 'quá giờ');
  assert.strictEqual(R.summarize('e2e-x', 'LỖI  a', 0, 10, false).ok, false, 'có dòng LỖI thì không đạt dù mã thoát 0');
});

test('bộ chạy e2e: mọi scripts/e2e-*.js đều được khai báo, không trùng; package.json dùng bộ chạy chung', () => {
  assert.deepStrictEqual(R.unknownSuites(), []);
  assert.strictEqual(new Set(R.SUITES).size, R.SUITES.length);
  assert.strictEqual(require('../package.json').scripts['test:e2e'], 'node scripts/e2e-all.js');
  const o = R.parseArgs(['lorung', 'scripts/e2e-malo.js', '--bail', '--timeout', '30']);
  assert.deepStrictEqual([o.names, o.bail, o.timeout], [['lorung', 'e2e-malo'], true, 30]);
});
