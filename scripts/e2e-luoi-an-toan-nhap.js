'use strict';
/* PR D bước 2 — lưới an toàn bản nháp (Electron thật, SQLite thật; dữ liệu giả lập):
 *  1. thanh “Chưa lưu” nêu cụ thể “Gồm 1 lô …” khi lô có nháp; hộp thoại khi đóng nhận được danh sách cụ thể (window.__stTomTat)
 *  2. sau khi áp dữ liệu từ Google Sheets (cờ theo từng lô), lần lưu ĐẦU TIÊN sao lưu file trước (backups/truoc-cap-nhat-sheets-*.sqlite),
 *     lần lưu thứ hai KHÔNG sao lưu thêm; bản sao lưu mở được và chưa có dòng mới (là bản TRƯỚC khi lưu)
 *  3. khi không sao lưu được (thư mục sao lưu bị chặn) → KHÔNG lưu, báo rõ, bản nháp còn nguyên
 * Chạy: xvfb-run -a node scripts/e2e-luoi-an-toan-nhap.js */
const {_electron: electron} = require('playwright-core');
const path = require('path'), fs = require('fs'), os = require('os');
const src = fs.readFileSync(path.join(__dirname, 'e2e-inan2.js'), 'utf8');
const {lot, seed} = new Function(src.slice(src.indexOf('const nv ='), src.indexOf('const plain =')) + '; return {lot, seed};')();
const root = path.join(__dirname, '..');
let fail = 0; const ok = (name, cond, extra) => { console.log((cond ? 'ĐẠT  ' : 'LỖI  ') + name + (!cond && extra ? ' — ' + extra : '')); if (!cond) fail++; };
(async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hakqn-luoi-')), bk = path.join(dir, 'backups');
  const app = await electron.launch({executablePath: require('electron'), args: [root, '--no-sandbox'], env: {...process.env, HAKQN_CLOSE: 'discard', HAKQN_DB: path.join(dir, 'd.sqlite'), HAKQN_USERDATA: path.join(dir, 'ud'), HAKQN_DOWNLOAD_DIR: path.join(dir, 'out')}});
  const w = require('./_hd30').boc(await app.firstWindow()); const errs = []; w.on('pageerror', e => errs.push(e.message)); w.on('dialog', d => d.accept()); await w.waitForSelector('#side');
  const a = lot('fa', 'R-A', {exp: {}, pc: [], kl: null}), b = lot('fb', 'R-B', {exp: {}, pc: [], kl: null});
  b.nc = b.nc.map(row => ({...row, maRung: 'R-B'}));
  await w.evaluate(d => window.hak.save(d), seed([a, b])); await w.reload(); await w.waitForSelector('#side');
  const sheetsBk = () => fs.existsSync(bk) ? fs.readdirSync(bk).filter(n => /^truoc-cap-nhat-sheets-.*\.sqlite$/.test(n)) : [];
  const them = async (ten, cccd) => {
    await w.click('[data-act=stAdd][data-kind=nc]'); await w.waitForSelector('#stForm [name=ten]');
    await w.selectOption('#stForm [name=vaiTro]', 'Công nhân'); await w.selectOption('#stForm [name=danhXung]', 'Ông');
    for (const [k, v] of [['ten', ten], ['ngaySinh', '02/03/1990'], ['cccd', cccd], ['ngayCap', '01/01/2022'], ['noiCap', 'Cục CS QLHC'], ['diaChi', 'Quế Sơn, Quảng Nam']]) await w.fill('#stForm [name=' + k + ']', v);
    await w.selectOption('#stForm [name=chucDanh]', 'Công nhân khai thác').catch(() => {});
    await w.click('#stForm [type=submit]'); await w.waitForTimeout(300);
  };
  await w.click('[data-open=own1]'); await w.click('[data-tab=rung]'); await w.click('[data-forest=fa]'); await w.click('[data-ftab=nc]'); await w.waitForTimeout(300);

  const nLuu = async () => ((await w.evaluate(() => window.hak.loadSync().db)).rs.own1.forests.fa.nc || []).length, n0 = await nLuu();
  // 1. nháp → thanh “Chưa lưu” có phần Gồm …, hàm tóm tắt cho hộp thoại đóng
  await them('NGUYỄN VĂN MỘT giả lập', '049000000011');
  const bar = await w.evaluate(() => (document.getElementById('loTomTat') || {}).textContent || '');
  ok('thanh Chưa lưu nêu cụ thể: “(Gồm 1 lô)”', /Gồm 1 lô/.test(bar), bar);
  const tt = await w.evaluate(() => window.__stTomTat());
  ok('hộp thoại khi đóng nhận được tóm tắt cụ thể (tên lô R-A)', !!tt && tt.dong === 'Chưa lưu: 1 lô' && tt.chiTiet.some(x => /^Lô R-A/.test(x)), JSON.stringify(tt));

  // 2. cờ “vừa áp dữ liệu từ Sheets” → lần lưu đầu sao lưu trước, lần hai thì không
  ok('chưa có bản sao lưu truoc-cap-nhat-sheets', sheetsBk().length === 0);
  await w.evaluate(() => window.__hak.nhapTest.datSaoLuuSheets(true));
  await w.click('button[data-act=stSave]'); await w.waitForTimeout(1200);
  const b1 = sheetsBk();
  ok('lần lưu đầu sau khi áp từ Sheets: có đúng 1 bản sao lưu truoc-cap-nhat-sheets', b1.length === 1, JSON.stringify(b1));
  ok('lô đã lưu dòng mới (bản sao lưu là bản TRƯỚC khi lưu)', (await nLuu()) === n0 + 1);
  let boDoc = null; try { const D = require('better-sqlite3'); const d = new D(path.join(bk, b1[0]), {readonly: true}); boDoc = d.prepare('select count(*) c from forests').get().c; d.close(); } catch (e) { boDoc = 'lỗi ' + e.message; }
  ok('bản sao lưu mở được (SQLite hợp lệ) và có lô', boDoc === 2, String(boDoc));
  await them('TRẦN VĂN HAI giả lập', '049000000022'); await w.click('button[data-act=stSave]'); await w.waitForTimeout(1200);
  ok('lần lưu thứ hai (không áp thêm từ Sheets): KHÔNG sao lưu thêm', sheetsBk().length === 1);

  // 3. không sao lưu được → không lưu, nháp còn nguyên
  await w.evaluate(() => window.__hak.nhapTest.datSaoLuuSheets(true));
  await them('LÊ VĂN BA giả lập', '049000000033');
  fs.rmSync(bk, {recursive: true, force: true}); fs.writeFileSync(bk, 'chặn: tệp trùng tên thư mục sao lưu');   // thư mục sao lưu không tạo được
  await w.click('button[data-act=stSave]'); await w.waitForTimeout(1200);
  const t3 = await w.evaluate(() => document.body.innerText);
  ok('sao lưu lỗi: báo rõ “Không sao lưu được trước khi lưu dữ liệu từ Google Sheets”', /sao lưu được trước khi lưu dữ liệu từ Google Sheets/.test(t3), t3.slice(0, 200));
  ok('sao lưu lỗi: dữ liệu KHÔNG ghi (vẫn n0+2 dòng đã lưu), bản nháp còn (thanh Chưa lưu)', (await nLuu()) === n0 + 2 && !!(await w.$('#loDirtyBar')));
  ok('lỗi sao lưu có nút đổi thư mục và thử lại', !!(await w.$('#loSaveIssue [data-act=saveHelpBackupDir]')) && !!(await w.$('#loSaveIssue [data-act=stRetrySave]')));
  const nav = async fid => { await w.click('[data-forest=' + fid + ']'); if (await w.isVisible('#stGKeep')) await w.click('#stGKeep'); await w.click('[data-ftab=nc]'); };
  await nav('fb');
  const nB = async () => (await w.evaluate(() => window.hak.loadSync().db.rs.own1.forests.fb.nc.length));
  const nB0 = await nB();
  await them('PHẠM VĂN BỐN giả lập', '049000000044');
  const drafts = await w.evaluate(() => window.__stDirty());
  const both = await w.evaluate(() => window.__stSaveAll());
  ok('lưu các lô: lô B vẫn ghi được, lô A vẫn giữ nháp khi thư mục sao lưu lỗi', !both.ok && both.issues.length === 1 && (await nB()) === nB0 + 1 && (await nLuu()) === n0 + 2, JSON.stringify({drafts, both, nB0, nB: await nB(), nA: await nLuu()}));
  fs.unlinkSync(bk); fs.mkdirSync(bk, {recursive: true});
  await w.click('button[data-act=stSave]'); await w.waitForTimeout(1200);
  ok('sửa được thư mục rồi lưu lại: có bản sao lưu và dòng được ghi', sheetsBk().length === 1 && (await nLuu()) === n0 + 3);

  ok('không có lỗi script', errs.length === 0, errs.join('; '));
  await app.close(); console.log(fail ? 'CÓ ' + fail + ' LỖI' : 'TẤT CẢ ĐẠT'); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
