'use strict';
/* Chặn hồi quy hiệu năng lớp lưu (không phải đo chuẩn): 10.000 phiếu cân, đổi 1 phiếu chỉ ghi 1 dòng và lưu/nạp trong ngưỡng rộng.
 * Đo ngày 14/11/2026 (Linux, Electron 45): lưu đổi 1 phiếu ~17 ms, nạp ~9 ms; ngưỡng 1.500 ms chỉ bắt lỗi thuật toán (ví dụ O(n²)), không bắt dao động máy CI.
 * Đo chi tiết nhiều cỡ: ELECTRON_RUN_AS_NODE=1 npx electron scripts/perf-luu.js */
const test = require('node:test');
const assert = require('node:assert');
const {measure} = require('../scripts/perf-luu');

test('hiệu năng lưu: 10.000 phiếu cân — đổi 1 phiếu chỉ ghi 1 dòng, lưu và nạp dưới 1,5 giây', () => {
  const m = measure(50, 2, 100);
  assert.strictEqual(m.phieu, 10000);
  assert.strictEqual(m.changed, 1);
  for (const k of ['first', 'same', 'one', 'load']) assert.ok(m[k] < 1500, k + ' = ' + m[k] + ' ms');
});
