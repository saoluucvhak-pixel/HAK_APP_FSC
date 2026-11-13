'use strict';
/* Cài đặt có Google Sheets (địa chỉ bảng tính), Công ty, Hiển thị số; menu ngang có Cài đặt, không còn Công ty mua hàng (Electron thật).
 * Chạy: xvfb-run -a node scripts/e2e-caidat2.js */
const {_electron: electron} = require('playwright-core');
const path = require('path'), fs = require('fs'), os = require('os');
const JSZip = require('jszip');
const src = fs.readFileSync(path.join(__dirname, 'e2e-inan2.js'), 'utf8');
const {lot, seed, PC} = new Function(src.slice(src.indexOf('const nv ='), src.indexOf('const plain =')) + '; return {lot, seed, PC};')();
const root = path.join(__dirname, '..');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hakqn-cd2-'));
let fail = 0; const ok = (name, cond, extra) => { console.log((cond ? 'ĐẠT  ' : 'LỖI  ') + name + (!cond && extra ? ' — ' + extra : '')); if (!cond) fail++; };
(async () => {
  const app = await electron.launch({executablePath: require('electron'), args: [root, '--no-sandbox'], env: {...process.env, HAKQN_DOWNLOAD_DIR: path.join(dir, 'out'), HAKQN_DB: path.join(dir, 'c.sqlite'), HAKQN_USERDATA: path.join(dir, 'ud'), ELECTRON_DISABLE_SECURITY_WARNINGS: '1'}});
  const w = await app.firstWindow(); const errs = []; w.on('pageerror', e => errs.push(e.message)); w.on('dialog', d => d.accept()); await w.waitForSelector('#side');
  await w.evaluate(d => window.hak.save(d), seed([lot('fa', 'R-A', {exp: {}, pc: PC, kl: 30})])); await w.reload(); await w.waitForSelector('#side');
  // 1. menu ngang
  ok('menu ngang có “Cài đặt”, không còn “Công ty mua hàng”', !!(await w.$('header.top .nav #navSet')) && !(await w.$('header.top .nav [data-act=openCty]')) && !/Công ty mua hàng/.test(await w.innerText('header.top .nav')));
  await w.click('#navSet'); await w.waitForSelector('#setBox');
  ok('Cài đặt có các mục: Hệ thống, Google Sheets, Công ty, Hiển thị số', (await w.$$eval('.tabs button', b => b.map(x => x.textContent))).join('|') === 'Hệ thống|Google Sheets|Công ty|Hiển thị số');
  // 2. Google Sheets: địa chỉ nằm trong Cài đặt
  await w.click('#setTab_setgs'); await w.waitForSelector('#setGsLink');
  const url = 'https://docs.google.com/spreadsheets/d/ABCDEFG1234567890/edit?usp=sharing';
  await w.fill('#setGsLink', url); await w.click('[data-act=setGsSave]'); await w.waitForSelector('#setGsMsg');
  ok('lưu địa chỉ Google Sheets trong Cài đặt', /Đã lưu/.test(await w.innerText('#setGsMsg')) && (await w.evaluate(() => window.hak.lookup.status())).sheetUrl === url);
  await w.fill('#setGsLink', 'khong-phai-lien-ket'); await w.click('[data-act=setGsSave]'); await w.waitForSelector('#setGsMsg.err');
  ok('liên kết sai: báo lỗi, giữ địa chỉ cũ', (await w.evaluate(() => window.hak.lookup.status())).sheetUrl === url);
  // 3. Tra cứu không còn ô nhập địa chỉ, có nút sang Cài đặt
  await w.evaluate(() => document.querySelector('header [data-act=lkOpen]') && document.querySelector('header [data-act=lkOpen]').click()); await w.waitForSelector('#lkBox.on');
  ok('màn Tra cứu không còn ô nhập địa chỉ bảng tính; ghi địa chỉ đang dùng và nút “Đổi trong Cài đặt”', !(await w.$('#lkLink')) && /Địa chỉ bảng tính/.test(await w.innerText('#lkBody')) && !!(await w.$('[data-act=lkToSettings]')));
  await w.click('[data-act=lkToSettings]'); await w.waitForSelector('#setGsLink');
  ok('“Đổi trong Cài đặt” mở đúng mục Google Sheets và đóng hộp Tra cứu', (await w.inputValue('#setGsLink')) === url && !(await w.$('#lkBox.on')));
  // 4. Công ty trong Cài đặt
  await w.click('#setTab_cty'); await w.waitForSelector('#ctyForm');
  ok('thông tin công ty nằm trong Cài đặt (mục Công ty)', !!(await w.$('#ctyForm')) && (await w.$$eval('#main .tabs button.on', b => b.map(x => x.textContent))).includes('Công ty'), (await w.$$eval('.tabs button.on', b => b.map(x => x.textContent))).join('/'));
  // 5. Hiển thị số
  await w.click('#setTab_setfmt'); await w.waitForSelector('[name=numStyle]');
  ok('mục Hiển thị số: nêu ngày luôn dd/mm/yyyy và hai kiểu số', /dd\/mm\/yyyy/.test(await w.innerText('#main')) && (await w.$$('[name=numStyle]')).length === 2);
  await w.click('[name=numStyle][value=en]'); await w.waitForTimeout(400);
  ok('chọn kiểu quốc tế: lưu vào cơ sở dữ liệu', (await w.evaluate(() => window.hak.loadSync().db.dinhDangSo)) === 'en');
  await w.click('[data-open=own1]').catch(() => {}); await w.evaluate(() => document.querySelector('[data-act=goHome]').click()); await w.waitForTimeout(300);
  await w.click('[data-open=own1]'); await w.click('[data-tab=rung]'); await w.click('[data-forest=fa]'); await w.click('[data-ftab=dx]'); await w.waitForTimeout(300);
  const dxText = await w.innerText('#main');
  ok('kiểu quốc tế: số trên màn hình hiện dạng 1,234.5 (có khối lượng phiếu cân)', /\d,\d{3}|\d\.\d/.test(dxText) && /9\.25|12\.5/.test(dxText), dxText.slice(0, 300));
  await w.click('[data-ftab=xuat]'); await w.click('[data-xtab=ld]');
  const out = path.join(dir, 'out'); fs.mkdirSync(out, {recursive: true}); for (const f of fs.readdirSync(out)) fs.unlinkSync(path.join(out, f));
  await w.click('button[data-act=dl][data-kind=tc]'); let f = null; for (let i = 0; i < 80 && !f; i++) { f = fs.readdirSync(out).find(x => /\.docx$/.test(x)); if (!f) await w.waitForTimeout(150); } await w.waitForTimeout(200);
  const txt = ((await (await JSZip.loadAsync(fs.readFileSync(path.join(out, f)))).file('word/document.xml').async('string')).match(/<w:t[^>]*>([^<]*)<\/w:t>/g) || []).map(a => a.replace(/<[^>]+>/g, '')).join(' ');
  ok('kiểu quốc tế chỉ áp dụng trên màn hình: biểu mẫu Word (BM-08) vẫn in số kiểu Việt Nam (4.200.000)', /\d{1,3}(\.\d{3}){2}/.test(txt) && !/\d{1,3}(,\d{3}){2}/.test(txt), txt.slice(0, 300));
  ok('không có lỗi JavaScript', errs.length === 0, errs.join('|'));
  await w.evaluate(() => document.querySelector('#navSet').click()); await w.click('#setTab_setfmt'); await w.click('[name=numStyle][value=vi]'); await w.waitForTimeout(300);
  ok('đổi lại kiểu Việt Nam', (await w.evaluate(() => window.hak.loadSync().db.dinhDangSo)) === 'vi');
  await app.close(); console.log(fail ? 'CÓ ' + fail + ' LỖI' : 'TẤT CẢ ĐẠT'); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
