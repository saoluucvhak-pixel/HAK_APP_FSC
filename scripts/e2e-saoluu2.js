'use strict';
/* Thư mục sao lưu thứ hai (bản 2.2): chọn thư mục, bản tự sao lưu hằng ngày được chép sang, tắt thì thôi (Electron thật, SQLite thật).
 * Chạy: xvfb-run -a node scripts/e2e-saoluu2.js */
const {_electron: electron} = require('playwright-core');
const path = require('path'), fs = require('fs'), os = require('os');
const root = path.join(__dirname, '..');
const base = fs.mkdtempSync(path.join(os.tmpdir(), 'hakqn-bk2-')), ud = path.join(base, 'ud'), usb = path.join(base, 'USB', 'hak');
fs.mkdirSync(usb, {recursive: true});
let fail = 0; const ok = (name, cond, extra) => { console.log((cond ? 'ĐẠT  ' : 'LỖI  ') + name + (!cond && extra ? ' — ' + extra : '')); if (!cond) fail++; };
const launch = () => electron.launch({executablePath: require('electron'), args: [root, '--no-sandbox'], env: {...process.env, HAKQN_USERDATA: ud, HAKQN_PICK_DIR: usb}});
const lst = d => { try { return fs.readdirSync(d).filter(n => /^tu-dong-.*\.sqlite$/.test(n)); } catch (e) { return []; } };
(async () => {
  let app = await launch(), w = require('./_hd30').boc(await app.firstWindow()); w.on('dialog', d => d.accept()); await w.waitForSelector('#side');
  await w.click('text=+ Chủ rừng mới'); await w.fill('#infoForm [name="ma"]', 'BK-1'); await w.fill('#infoForm [name="ten"]', 'CHỦ SAO LƯU');
  for (const [k, v] of Object.entries({cccd: '049067005459', ngayCap: '15/08/2021', noiCap: 'CA', diaChi: 'Đà Nẵng'})) await w.fill(`#infoForm [name="${k}"]`, v);
  await w.selectOption('#infoForm [name="danhXung"]', 'Ông'); await w.click('#infoForm button[type=submit]'); await w.waitForTimeout(1500);
  await w.click('#navSet'); await w.waitForSelector('#dbBk2');
  ok('Cài đặt có khung “Thư mục sao lưu thứ hai”, chưa chọn', /Chưa chọn/.test(await w.innerText('#dbBk2')));
  await w.click('[data-act=setBackup2]'); await w.waitForFunction(() => /Đang dùng/.test(document.getElementById('dbBk2').innerText), null, {timeout: 20000});
  ok('chọn thư mục: hiện đường dẫn đang dùng', (await w.innerText('#dbBk2')).includes(usb));
  await w.waitForTimeout(2500);
  ok('bản tự sao lưu hằng ngày được chép sang thư mục thứ hai', lst(usb).length === 1, JSON.stringify(fs.readdirSync(usb)));
  const bk1 = lst(path.join(ud, 'backups'));
  ok('thư mục chính vẫn còn bản tự sao lưu', bk1.length === 1 && bk1[0] === lst(usb)[0], JSON.stringify(bk1));
  await w.click('[data-act=setBackup2Off]'); await w.waitForTimeout(500);
  ok('tắt: không còn dùng thư mục thứ hai', /Chưa chọn/.test(await w.innerText('#dbBk2')) && !JSON.parse(fs.readFileSync(path.join(ud, 'settings.json'), 'utf8')).backupDir2);
  await app.close(); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
