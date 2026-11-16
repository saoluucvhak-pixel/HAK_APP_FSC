'use strict';
/* Hồi quy sau rà soát PR #17–#21:
 *  1. src/doi.js chia: giữ nguyên số đã in của lô nhiều đội (cách chia từ trước), chỉ chia lại theo phần dư lớn nhất khi cách cũ cho một đội số âm.
 *  4. src/lorung.js optsKhoiPhuc: tùy chọn khôi phục từ giao diện chỉ gồm cách xử lý và mã lô mới; tùy chọn nội bộ (lịch sử bản chụp…) bị bỏ. */
const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('fs'), path = require('path');
const D = require('../src/doi'), L = require('../src/lorung');
const doiBang = (n, share) => Array.from({length: n}, () => ({share: share == null ? 1 / n : share}));
const tong = a => Math.round(a.reduce((s, v) => s + v * 1000, 0));

test('chia: số của lô nhiều đội giữ nguyên như trước (không đổi số trên mẫu đã in, đã ký, đã chốt)', () => {
  assert.deepStrictEqual(D.chia(10, doiBang(3)), [3.333, 3.333, 3.334], 'đội cuối nhận phần còn lại như trước');
  assert.deepStrictEqual(D.chia(0.003, [{share: 0.5}, {share: 0.25}, {share: 0.25}]), [0.002, 0.001, 0]);
  assert.deepStrictEqual(D.chia(29.75, [{share: 3 / 7}, {share: 4 / 7}]), [12.75, 17]);
  assert.deepStrictEqual(D.chia(100, doiBang(7)), D.chiaCu(100, doiBang(7)));
});

test('chia: cách cũ ra số âm (lượng rất nhỏ) thì chia theo phần dư lớn nhất: không đội nào âm, tổng khớp', () => {
  assert.deepStrictEqual(D.chiaCu(0.002, doiBang(4)), [0.001, 0.001, 0.001, -0.001], 'tái hiện lỗi của cách cũ');
  assert.deepStrictEqual(D.chia(0.002, doiBang(4)), [0.001, 0.001, 0, 0]);
  assert.deepStrictEqual(D.chia(0.001, doiBang(3)), [0, 0, 0.001], 'cách cũ không âm thì giữ nguyên (đội cuối nhận phần còn lại)');
});

test('chia: với mọi lượng và số đội — tổng khớp đến 0,001, không âm, và bằng cách cũ khi cách cũ không âm', () => {
  let seed = 7; const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
  for (let i = 0; i < 3000; i++) {
    const n = 1 + Math.floor(rnd() * 6), w = Array.from({length: n}, () => 1 + Math.floor(rnd() * 9)), sw = w.reduce((a, b) => a + b, 0);
    const doi = w.map(x => ({share: x / sw})), vol = Math.round((rnd() < 0.3 ? rnd() * 0.01 : rnd() * 500) * 1000) / 1000;
    const kq = D.chia(vol, doi);
    if (!(vol > 0)) { assert.ok(kq.every(v => v === null)); continue; }
    assert.equal(tong(kq), Math.round(vol * 1000), JSON.stringify({vol, w, kq}));
    assert.ok(kq.every(v => v >= 0), JSON.stringify({vol, w, kq}));
    const cu = D.chiaCu(vol, doi); if (cu.every(v => v >= 0)) assert.deepStrictEqual(kq, cu, JSON.stringify({vol, w}));
  }
});

test('chia: lượng hoặc tỷ lệ không hợp lệ trả null cho mọi đội', () => {
  assert.deepStrictEqual(D.chia(null, doiBang(2)), [null, null]);
  assert.deepStrictEqual(D.chia(0, doiBang(2)), [null, null]);
  assert.deepStrictEqual(D.chia(5, [{share: NaN}, {share: 1}]), [null, null]);
  assert.deepStrictEqual(D.chia(5, []), []);
});

test('optsKhoiPhuc: chỉ giữ cách xử lý và mã lô mới; bỏ lịch sử bản chụp và mọi khóa khác do giao diện gửi', () => {
  const goi = [{forest_id: 'f1', phien_ban: 9, hash: 'x', at: 't', data: '{}'}];
  assert.deepStrictEqual(L.optsKhoiPhuc({strategy: 'both', maMoi: {f1: 'R-1B', f2: 7}, goiLichSu: goi, boQuaKhoa: true, allowBulkDelete: true}), {strategy: 'both', maMoi: {f1: 'R-1B'}});
  assert.deepStrictEqual(L.optsKhoiPhuc(undefined), {});
  assert.deepStrictEqual(L.optsKhoiPhuc({maMoi: ['x']}), {});
  assert.deepStrictEqual(L.optsKhoiPhuc('both'), {});
});

test('tiến trình chính: import:preview và import:apply chỉ nhận tùy chọn qua optsKhoiPhuc', () => {
  const m = fs.readFileSync(path.join(__dirname, '..', 'src', 'main.js'), 'utf8');
  assert.match(m, /ipcMain\.handle\('import:preview', afterReloc\(\(e, db, opts\) => wrap\(\(\) => store\.previewImport\(db, optsKhoiPhuc\(opts\)\)\)\(\)\)\);/);
  assert.match(m, /ipcMain\.handle\('import:apply', afterReloc\(\(e, db, strategy, opts\) => wrap\(\(\) => \(\{\.\.\.store\.applyImport\(db, strategy, optsKhoiPhuc\(opts\)\)/);
});
