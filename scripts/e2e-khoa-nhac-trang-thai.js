'use strict';
/* F3 — dòng cảnh báo “Lô chỉ đọc” ở thanh trạng thái không bị lần lưu thành công kế tiếp xóa mất (Electron thật, SQLite thật; dữ liệu giả lập):
 *  - sửa thẳng lô đã chốt rồi persist(): thanh trạng thái báo “Lô chỉ đọc”
 *  - lưu lại ngay sau đó (như khi ánh xạ biển số vừa chốt phải xuống đĩa): thanh vẫn nêu “Lô chỉ đọc: thay đổi vừa rồi đã được bỏ”
 *  - sau vài giây, lần lưu bình thường: chỉ còn “Đã lưu vào máy”, không nhắc thừa
 * Chạy: xvfb-run -a node scripts/e2e-khoa-nhac-trang-thai.js */
const {_electron: electron} = require('playwright-core');
const path = require('path'), fs = require('fs'), os = require('os');
const src = fs.readFileSync(path.join(__dirname, 'e2e-inan2.js'), 'utf8');
const {lot, seed, P} = new Function(src.slice(src.indexOf('const nv ='), src.indexOf('const plain =')) + '; return {lot, seed, P};')();
const V = require('../src/vongdoi');
const root = path.join(__dirname, '..');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hakqn-khoanhac-'));
let fail = 0; const ok = (name, cond, extra) => { console.log((cond ? 'ĐẠT  ' : 'LỖI  ') + name + (!cond && extra ? ' — ' + extra : '')); if (!cond) fail++; };
(async () => {
  const app = await electron.launch({executablePath: require('electron'), args: [root, '--no-sandbox'], env: {...process.env, HAKQN_CLOSE: 'discard', HAKQN_DB: path.join(dir, 'd.sqlite'), HAKQN_USERDATA: path.join(dir, 'ud'), HAKQN_DOWNLOAD_DIR: path.join(dir, 'out')}});
  const w = require('./_hd30').boc(await app.firstWindow()); const errs = []; w.on('pageerror', e => errs.push(e.message)); w.on('dialog', d => d.accept()); await w.waitForSelector('#side');
  const A = lot('fa', 'R-A', {exp: {soKT: '015', ngayKy: '02/10/2026'}, pc: [P(1, '05/10/2026', '92C-12345', 'PA1', 12.5)], kl: null});
  V.chot(A, 'Người lập', '2026-11-15T01:00:00.000Z', []);
  await w.evaluate(d => window.hak.save(d), seed([A])); await w.reload(); await w.waitForSelector('#side');
  const tt = () => w.evaluate(() => (document.getElementById('saveSt') || {}).textContent || '');
  // 1. sửa thẳng lô khóa rồi persist()
  await w.click('[data-open=own1]'); await w.click('[data-tab=rung]'); await w.click('[data-forest=fa]'); await w.waitForTimeout(400);
  await w.evaluate(() => { const f = window.__hak.khoaTest.lo(); f.info.diaDiem = 'TRÁI PHÉP'; window.__hak.khoaTest.persist(); });
  await w.waitForTimeout(900);
  ok('sửa thẳng lô đã chốt: thanh trạng thái báo “Lô chỉ đọc”', /Lô chỉ đọc/.test(await tt()), await tt());
  // 2. lưu lại ngay (lô đã được trả về bản đã lưu): cảnh báo vẫn còn, kèm giờ lưu
  await w.evaluate(() => window.__hak.khoaTest.persist()); await w.waitForTimeout(900);
  const t2 = await tt();
  ok('lưu lại ngay sau đó: thanh vẫn nêu “Lô chỉ đọc: thay đổi vừa rồi đã được bỏ” cùng “Đã lưu vào máy”', /Đã lưu vào máy lúc/.test(t2) && /Lô chỉ đọc: thay đổi vừa rồi đã được bỏ/.test(t2), t2);
  // 3. sau vài giây: lưu bình thường, không nhắc thừa
  await w.waitForTimeout(8500); await w.evaluate(() => window.__hak.khoaTest.persist()); await w.waitForTimeout(900);
  const t3 = await tt();
  ok('sau vài giây, lưu bình thường: chỉ còn “Đã lưu vào máy”, không nhắc thừa', /Đã lưu vào máy lúc/.test(t3) && !/Lô chỉ đọc/.test(t3), t3);
  ok('không có lỗi script', errs.length === 0, errs.join('; '));
  await app.close(); console.log(fail ? 'CÓ ' + fail + ' LỖI' : 'TẤT CẢ ĐẠT'); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
