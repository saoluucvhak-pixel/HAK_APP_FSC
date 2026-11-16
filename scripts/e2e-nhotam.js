'use strict';
/* B7: kết quả kiểm tra nhớ tạm theo phiên bản dữ liệu. Không đổi dữ liệu → vẽ lại dùng lại kết quả (cùng đối tượng); sửa ô (bản nháp lô), thêm dòng bản nháp,
 * bỏ thay đổi, lưu → tính lại ngay, nội dung đúng dữ liệu mới. Chạy: xvfb-run -a node scripts/e2e-nhotam.js */
const {_electron: electron} = require('playwright-core');
const path = require('path'), fs = require('fs'), os = require('os');
const src = fs.readFileSync(path.join(__dirname, 'e2e-inan2.js'), 'utf8');
const {lot, seed, PC, EXP1} = new Function(src.slice(src.indexOf('const nv ='), src.indexOf('const plain =')) + '; return {lot, seed, PC, EXP1};')();
const root = path.join(__dirname, '..');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hakqn-nhotam-'));
let fail = 0; const ok = (name, cond, extra) => { console.log((cond ? 'ĐẠT  ' : 'LỖI  ') + name + (!cond && extra ? ' — ' + extra : '')); if (!cond) fail++; };
(async () => {
  const app = await electron.launch({executablePath: require('electron'), args: [root, '--no-sandbox'], env: {...process.env, HAKQN_CLOSE: 'discard', HAKQN_DB: path.join(dir, 'd.sqlite'), HAKQN_USERDATA: path.join(dir, 'ud')}});
  const w = require('./_hd30').boc(await app.firstWindow()); const errs = []; w.on('pageerror', e => errs.push(e.message)); w.on('dialog', d => d.accept()); await w.waitForSelector('#side');
  await w.evaluate(d => window.hak.save(d), seed([lot('fa', 'R-A', {exp: EXP1, pc: PC, kl: 29.75})])); await w.reload(); await w.waitForSelector('#side');
  await w.click('[data-open=own1]'); await w.click('[data-tab=rung]'); await w.click('[data-forest=fa]'); await w.click('[data-ftab=kt]'); await w.waitForTimeout(300);
  const lan = () => w.evaluate(() => { const a = window.__ktTest.kt(), b = window.__ktTest.kt(); window.__ktA = a; return {cung: a === b, chan: a.chan.length, ngayKy: a.items.some(x => /Ngày ký hợp đồng/.test(x.text) && /không có thật/.test(x.text))}; });
  let r = await lan();
  ok('không đổi dữ liệu: hai lần kiểm tra liên tiếp dùng lại cùng kết quả', r.cung);
  const giu = await w.evaluate(() => { const a = window.__ktA; window.__perf.ve('own1', 'fa', 'kt'); return a === window.__ktTest.kt(); });
  ok('vẽ lại màn khi dữ liệu không đổi: không tính lại', giu);
  // sửa ô ngày ký (bản nháp lô) thành ngày không có thật → kết quả tính lại ngay, có mục ngày sai
  await w.click('[data-ftab=xuat]'); await w.click('[data-xtab=hd]'); await w.fill('[data-exp=ngayKy]', '31/02/2026'); await w.dispatchEvent('[data-exp=ngayKy]', 'change'); await w.waitForTimeout(200);
  r = await w.evaluate(() => { const a = window.__ktTest.kt(); return {khac: a !== window.__ktA, ngay: a.items.some(x => /Ngày ký hợp đồng/.test(x.text) && /có thật|31\/02/.test(x.text))}; });
  ok('sửa ô (bản nháp lô): kết quả kiểm tra tính lại, nêu ngày ký không có thật', r.khac && r.ngay, JSON.stringify(r));
  // bỏ thay đổi → về bản đã lưu, hết mục ngày sai
  await w.evaluate(() => { window.__ktA = window.__ktTest.kt(); }); await w.click('#loDirtyBar [data-act=stDiscard]'); await w.waitForTimeout(300);
  r = await w.evaluate(() => { const a = window.__ktTest.kt(); return {khac: a !== window.__ktA, ngay: a.items.some(x => /31\/02/.test(x.text))}; });
  ok('bỏ thay đổi: kết quả tính lại theo bản đã lưu (không còn ngày sai)', r.khac && !r.ngay, JSON.stringify(r));
  // thêm một phiếu vào bản nháp (nạp dòng) → số phiếu trong kết quả đổi
  const v0 = await w.evaluate(() => window.__ktTest.ver());
  await w.evaluate(() => { window.__ktA = window.__ktTest.kt(); }); await w.click('[data-ftab=dx]'); await w.click('[data-act=stAdd][data-kind=pc]'); await w.waitForSelector('#stForm');
  await w.fill('#stForm input[name=soPhieu]', 'PMOI'); await w.fill('#stForm input[name=ngay]', '08/10/2026'); await w.selectOption('#stForm select[name=bienSo]', '92C-12345'); await w.fill('#stForm input[name=kl]', '5');
  await w.click('#stForm [type=submit]'); await w.waitForTimeout(300);
  r = await w.evaluate(() => ({khac: window.__ktTest.kt() !== window.__ktA, ver: window.__ktTest.ver()}));
  ok('thêm dòng vào bản nháp: phiên bản dữ liệu tăng, kết quả kiểm tra tính lại', r.khac && r.ver > v0, JSON.stringify(r));
  ok('không có lỗi JavaScript', errs.length === 0, errs.join('|'));
  await app.close(); console.log(fail ? 'CÓ ' + fail + ' LỖI' : 'TẤT CẢ ĐẠT'); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
