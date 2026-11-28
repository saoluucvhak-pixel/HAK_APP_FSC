'use strict';
/* Xóa vị trí có sẵn (CHỦ quyết ngày 24/11/2026: “cho xóa và cảnh báo nếu đã sử dụng”), Electron thật, SQLite thật:
 *  - ba vị trí mặc định đều có nút Xóa
 *  - mặc định ĐANG dùng — “Công nhân cưa” (có sẵn trong định mức BHLĐ của phần mềm), “Tổ trưởng” (có trong định biên): bấm Xóa chỉ chuyển “Ngừng sử dụng” kèm cảnh báo nêu nơi đang dùng; dữ liệu liên quan còn nguyên
 *  - mặc định CHƯA dùng — “Công nhân khai thác” sau khi gỡ khỏi định mức BHLĐ: xóa hẳn, mở lại ứng dụng không tự mọc lại
 * Chạy: xvfb-run -a node scripts/e2e-vi-tri-xoa-mac-dinh.js */
const {_electron: electron} = require('playwright-core');
const path = require('path'), fs = require('fs'), os = require('os');
const root = path.join(__dirname, '..');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hakqn-vtxoa-'));
let fail = 0; const ok = (name, cond, extra) => { console.log((cond ? 'ĐẠT  ' : 'LỖI  ') + name + (!cond && extra ? ' — ' + extra : '')); if (!cond) fail++; };
const mo = () => electron.launch({executablePath: require('electron'), args: [root, '--no-sandbox'], env: {...process.env, HAKQN_CLOSE: 'discard', HAKQN_DB: path.join(dir, 'd.sqlite'), HAKQN_USERDATA: path.join(dir, 'ud'), HAKQN_DOWNLOAD_DIR: path.join(dir, 'out')}});
(async () => {
  let app = await mo(), w = require('./_hd30').boc(await app.firstWindow()); const errs = []; w.on('pageerror', e => errs.push(e.message)); w.on('dialog', d => d.accept()); await w.waitForSelector('#side');
  const db = () => w.evaluate(() => window.hak.loadSync().db);
  // dữ liệu (trong bộ nhớ của ứng dụng, có sẵn định mức BHLĐ mặc định): “Công nhân khai thác” gỡ khỏi định mức → chưa dùng; “Tổ trưởng” có trong định biên
  await w.evaluate(async () => { const d = window.__hak.nhapTest.db(); d.dmViTri = []; ['Công nhân cưa', 'Công nhân khai thác', 'Tổ trưởng'].forEach(x => HAKViTri.them(d.dmViTri, x)); delete d.dinhMuc['Công nhân khai thác']; (d.dinhMucBan || []).forEach(v => { if (v.dm) delete v.dm['Công nhân khai thác']; }); d.dinhBien = [{chucDanh: 'Tổ trưởng', soNguoi: 1, kiemNhiem: false, nhiemVu: 'giả lập'}]; await window.__hak.nhapTest.persistNow(); });
  await w.reload(); await w.waitForSelector('#side');
  await w.click('#navDm'); await w.click('#setTab_setvt'); await w.waitForSelector('#vtBang');
  const id = async ten => ((await db()).dmViTri.find(v => v.ten === ten) || {}).id;
  const cua = await id('Công nhân cưa'), kt = await id('Công nhân khai thác'), tt = await id('Tổ trưởng');
  ok('ba vị trí mặc định đều có nút Xóa', !!(await w.$('[data-vtxoa="' + cua + '"]')) && !!(await w.$('[data-vtxoa="' + kt + '"]')) && !!(await w.$('[data-vtxoa="' + tt + '"]')));
  await w.click('[data-vtxoa="' + kt + '"]'); await w.waitForTimeout(500);
  ok('mặc định CHƯA dùng (Công nhân khai thác): xóa hẳn khỏi danh mục', !(await db()).dmViTri.some(v => v.ten === 'Công nhân khai thác') && /Đã xóa/.test(await w.innerText('#vtMsg')));
  await w.click('[data-vtxoa="' + cua + '"]'); await w.waitForTimeout(500);
  let d = await db(); const m1 = await w.innerText('#vtMsg');
  ok('mặc định ĐANG dùng (Công nhân cưa, trong định mức BHLĐ): KHÔNG xóa hẳn, chuyển Ngừng sử dụng', (d.dmViTri.find(v => v.ten === 'Công nhân cưa') || {}).ngung === true);
  ok('cảnh báo nêu rõ đang dùng ở đâu (định mức BHLĐ) và Ngừng sử dụng', /đang được dùng/.test(m1) && /định mức BHLĐ/.test(m1) && /Ngừng sử dụng/.test(m1), m1);
  await w.click('[data-vtxoa="' + tt + '"]'); await w.waitForTimeout(500);
  d = await db(); const m2 = await w.innerText('#vtMsg');
  ok('mặc định ĐANG dùng (Tổ trưởng, trong định biên): chuyển Ngừng sử dụng, cảnh báo nêu định biên, dữ liệu định biên còn nguyên', (d.dmViTri.find(v => v.ten === 'Tổ trưởng') || {}).ngung === true && /định biên/.test(m2) && (d.dinhBien || []).some(r => r.chucDanh === 'Tổ trưởng'), m2);
  await app.close();
  // mở lại ứng dụng: vị trí đã xóa không tự mọc lại
  app = await mo(); w = require('./_hd30').boc(await app.firstWindow()); w.on('pageerror', e => errs.push(e.message)); await w.waitForSelector('#side');
  await w.click('#navDm'); await w.click('#setTab_setvt'); await w.waitForSelector('#vtBang'); await w.waitForTimeout(800);
  const d2 = await w.evaluate(() => window.hak.loadSync().db);
  ok('mở lại ứng dụng: “Công nhân khai thác” đã xóa KHÔNG tự mọc lại; hai vị trí đang dùng vẫn Ngừng sử dụng', !d2.dmViTri.some(v => v.ten === 'Công nhân khai thác') && ['Công nhân cưa', 'Tổ trưởng'].every(n => (d2.dmViTri.find(v => v.ten === n) || {}).ngung === true), JSON.stringify(d2.dmViTri.map(v => [v.ten, v.ngung])));
  ok('không có lỗi script', errs.length === 0, errs.join('; '));
  await app.close(); console.log(fail ? 'CÓ ' + fail + ' LỖI' : 'TẤT CẢ ĐẠT'); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
