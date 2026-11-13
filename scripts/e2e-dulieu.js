'use strict';
/* Đổi thư mục dữ liệu an toàn, ổ dữ liệu biến mất/xuất hiện lại, độ tin cậy của sao lưu (Electron thật, cơ sở dữ liệu thử riêng trong thư mục tạm).
 * Lỗi giả lập qua biến môi trường kiểm thử: HAKQN_TEST_FAIL_STEP, HAKQN_RELOC_DELAY_MS, HAKQN_TEST_BACKUP_FAIL.
 * Chạy: xvfb-run -a node scripts/e2e-dulieu.js */
const {_electron: electron} = require('playwright-core');
const path = require('path'), fs = require('fs'), os = require('os');
const root = path.join(__dirname, '..');
const base = fs.mkdtempSync(path.join(os.tmpdir(), 'hakqn-dl-'));
let fail = 0; const ok = (name, cond, extra) => { console.log((cond ? 'ĐẠT  ' : 'LỖI  ') + name + (!cond && extra ? ' — ' + extra : '')); if (!cond) fail++; };
const mk = n => { const d = path.join(base, n); fs.mkdirSync(d, {recursive: true}); return d; };
const launch = (ud, env = {}) => electron.launch({executablePath: require('electron'), args: [root, '--no-sandbox'], env: {...process.env, HAKQN_USERDATA: ud, ...env}});
const readCfg = ud => { try { return JSON.parse(fs.readFileSync(path.join(ud, 'settings.json'), 'utf8')); } catch (e) { return {}; } };
const OWNER = {cccd: '049067005459', ngayCap: '15/08/2021', noiCap: 'CA', diaChi: 'Đà Nẵng'};
async function addOwner(w, ma, ten) {
  await w.click('text=+ Chủ rừng mới'); await w.fill('#infoForm [name="ma"]', ma); await w.fill('#infoForm [name="ten"]', ten);
  for (const [k, v] of Object.entries(OWNER)) await w.fill(`#infoForm [name="${k}"]`, v);
  await w.selectOption('#infoForm [name="danhXung"]', 'Ông'); await w.click('#infoForm button[type=submit]'); await w.waitForTimeout(1500);
}
const side = async w => (await w.innerText('#sideList').catch(() => '')) || '';
const open = async (ud, env) => { const app = await launch(ud, env), w = await app.firstWindow(); w.on('dialog', d => d.accept()); await w.waitForLoadState('domcontentloaded'); return {app, w}; };
const settingsView = async w => { await w.click('#moreMenu summary'); await w.click('#openSettingsBtn'); await w.waitForSelector('#setBox [data-set-path]'); };
const wait = (w, re, ms = 25000) => w.waitForFunction(r => new RegExp(r).test((document.querySelector('#main') || {}).innerText || ''), re.source, {timeout: ms});

(async () => {
  /* ===== 1. Ổ dữ liệu biến mất rồi xuất hiện lại ===== */
  const udA = mk('udA'), driveA = mk('ODIA');
  let {app, w} = await open(udA, {HAKQN_PICK_DIR: driveA});
  await w.waitForSelector('#side'); await addOwner(w, 'MAC-DINH', 'CHỦ BẢN MẶC ĐỊNH CŨ');          // dữ liệu ở vị trí mặc định (sẽ thành "bản cũ")
  await app.close();
  ({app, w} = await open(udA, {HAKQN_PICK_DIR: driveA})); await w.waitForSelector('#side');
  await settingsView(w); await w.click('[data-act=setData]'); await wait(w, /Đã chuyển dữ liệu/);
  await w.waitForSelector('#side'); await addOwner(w, 'TREN-O', 'CHỦ CHỈ CÓ TRÊN Ổ'); await app.close();   // từ đây dữ liệu trên ổ khác với bản mặc định cũ
  ok('đã chuyển dữ liệu sang ổ ngoài; cấu hình lưu đường dẫn ổ', readCfg(udA).dataDir === driveA && fs.existsSync(path.join(driveA, 'hakqn.sqlite')));
  const defFile = path.join(udA, 'hakqn.sqlite'), defStat = () => { const s = fs.statSync(defFile); return s.size + ':' + s.mtimeMs; };
  const defBefore = defStat();
  fs.renameSync(driveA, driveA + '.rut');                                                      // rút ổ
  ({app, w} = await open(udA)); await w.waitForSelector('#dataIssue', {timeout: 20000});
  const t1 = await w.innerText('#dataIssue');
  ok('ổ biến mất: hiện đúng đường dẫn và nguyên nhân, không mở bản mặc định', t1.includes(path.join(driveA, 'hakqn.sqlite')) && /Thư mục dữ liệu không còn|Không tìm thấy/.test(t1) && !(await w.isVisible('#sideList')), t1.slice(0, 300));
  ok('không ghi gì vào bản mặc định cũ; cấu hình cũ được giữ', defStat() === defBefore && readCfg(udA).dataDir === driveA);
  await w.click('#dataRetryBtn'); await w.waitForSelector('#issueMsg');
  ok('thử lại khi ổ vẫn chưa có: vẫn báo lỗi, không đổi gì', /chưa mở|Không tìm thấy|không còn/i.test(await w.innerText('#dataIssue')) && readCfg(udA).dataDir === driveA && defStat() === defBefore);
  fs.renameSync(driveA + '.rut', driveA);                                                       // ổ xuất hiện lại
  await w.click('#dataRetryBtn').catch(() => {}); await w.waitForSelector('#sideList', {timeout: 25000});
  ok('ổ có lại: thử lại mở được, thấy dữ liệu trên ổ (có chủ rừng chỉ có trên ổ)', /CHỦ CHỈ CÓ TRÊN Ổ/.test(await side(w)));
  await app.close();

  /* ===== 2. File thiếu trong thư mục còn tồn tại; chọn cơ sở dữ liệu khác; dùng vị trí mặc định (có xác nhận) ===== */
  fs.renameSync(path.join(driveA, 'hakqn.sqlite'), path.join(driveA, 'hakqn.sqlite.cat'));
  ({app, w} = await open(udA)); await w.waitForSelector('#dataIssue', {timeout: 20000});
  ok('thư mục còn nhưng thiếu hakqn.sqlite: báo đúng nguyên nhân', /không thấy file hakqn\.sqlite/i.test(await w.innerText('#dataIssue')));
  await app.close();
  const emptyDir = mk('trong');
  ({app, w} = await open(udA, {HAKQN_PICK_DIR: emptyDir})); await w.waitForSelector('#dataIssue');
  await w.click('#dataPickBtn'); await w.waitForSelector('#issueMsg');
  ok('chọn thư mục không có cơ sở dữ liệu: bị từ chối, cấu hình cũ giữ nguyên', /không có file hakqn\.sqlite/.test(await w.innerText('#issueMsg')) && readCfg(udA).dataDir === driveA);
  await app.close();
  fs.renameSync(path.join(driveA, 'hakqn.sqlite.cat'), path.join(driveA, 'hakqn.sqlite'));
  fs.renameSync(driveA, driveA + '.rut2');
  ({app, w} = await open(udA, {HAKQN_PICK_DIR: driveA + '.rut2'})); await w.waitForSelector('#dataIssue');
  await w.click('#dataPickBtn'); await w.waitForSelector('#sideList', {timeout: 25000});
  ok('chọn cơ sở dữ liệu khác (thư mục hợp lệ): mở được và nhớ đường dẫn mới', /CHỦ CHỈ CÓ TRÊN Ổ/.test(await side(w)) && readCfg(udA).dataDir === driveA + '.rut2');
  await app.close();
  fs.renameSync(driveA + '.rut2', driveA); const cfgKeep = readCfg(udA); cfgKeep.dataDir = driveA + '.khongco'; fs.writeFileSync(path.join(udA, 'settings.json'), JSON.stringify(cfgKeep));
  ({app, w} = await open(udA, {HAKQN_CONFIRM_DEFAULT: '1'})); await w.waitForSelector('#dataIssue', {timeout: 20000});
  await w.click('#dataDefaultBtn'); await w.waitForSelector('#sideList', {timeout: 25000});
  ok('xác nhận dùng vị trí mặc định: mở bản mặc định (không có chủ rừng chỉ có trên ổ) và lưu cấu hình trống', /BẢN MẶC ĐỊNH CŨ/.test(await side(w)) && !/CHỦ CHỈ CÓ TRÊN Ổ/.test(await side(w)) && (readCfg(udA).dataDir || '') === '');
  await app.close();

  /* ===== 3. Đổi thư mục: đích có dữ liệu khác; lỗi giả lập ở từng bước; ghi đè thành công ===== */
  const udX = mk('udX'), dd = mk('DICH');
  ({app, w} = await open(udX, {HAKQN_PICK_DIR: dd})); await w.waitForSelector('#side'); await addOwner(w, 'DICH-1', 'CHỦ CỦA ĐÍCH');
  await settingsView(w); await w.click('[data-act=setData]'); await wait(w, /Đã chuyển dữ liệu/); await app.close();
  const destSize = fs.statSync(path.join(dd, 'hakqn.sqlite')).size;
  const udY = mk('udY'), bk = mk('saoluuY');
  ({app, w} = await open(udY, {HAKQN_PICK_DIR: bk})); await w.waitForSelector('#side'); await addOwner(w, 'NGUON-1', 'CHỦ CỦA NGUỒN');
  await settingsView(w); await w.click('[data-act=setBackup]'); await w.waitForSelector('#setMsg'); await app.close();
  for (const stepName of ['after-tmp', 'after-replace', 'after-open', 'commit']) {
    ({app, w} = await open(udY, {HAKQN_PICK_DIR: dd, HAKQN_PICK_CHOICE: 'overwrite', HAKQN_TEST_FAIL_STEP: stepName}));
    await w.waitForSelector('#side'); await settingsView(w);
    await w.click('[data-act=setData]'); await w.waitForSelector('#setMsg'); await wait(w, /Không đổi được thư mục dữ liệu/);
    const tt = await w.innerText('#main');
    ok('lỗi giả lập ở bước ' + stepName + ': báo lỗi, đã hoàn tác, vẫn dùng vị trí cũ', /Đã hoàn tác/.test(tt) && tt.includes(path.join(udY, 'hakqn.sqlite')), tt.slice(0, 300));
    ok('  … cấu hình không đổi và vẫn thấy dữ liệu nguồn', !readCfg(udY).dataDir && /CHỦ CỦA NGUỒN/.test(await side(w)));
    await app.close();
    const leftovers = fs.readdirSync(dd).filter(n => /\.tmp-|\.thay-/.test(n));
    ok('  … thư mục đích không còn file tạm; dữ liệu đích giữ nguyên', leftovers.length === 0 && fs.existsSync(path.join(dd, 'hakqn.sqlite')) && fs.statSync(path.join(dd, 'hakqn.sqlite')).size > 0, leftovers.join(','));
  }
  const bkFiles = fs.readdirSync(bk).filter(n => /^truoc-ghi-de-.*\.sqlite$/.test(n));
  ok('bản dự phòng nhất quán của đích đã được tạo ở thư mục sao lưu (và không bị mất khi các bước sau lỗi)', bkFiles.length >= 1, fs.readdirSync(bk).join(','));
  // đích vẫn mở được và vẫn là dữ liệu của đích
  const udZ = mk('udZ'); fs.writeFileSync(path.join(udZ, 'settings.json'), JSON.stringify({dataDir: dd, backupDir: '', lastBackup: '', remindDays: 7}));
  ({app, w} = await open(udZ)); await w.waitForSelector('#side');
  ok('sau các ca lỗi, đích vẫn mở được và còn dữ liệu của đích', /CHỦ CỦA ĐÍCH/.test(await side(w)) && !/CHỦ CỦA NGUỒN/.test(await side(w))); await app.close();
  ({app, w} = await open(udY, {HAKQN_PICK_DIR: dd, HAKQN_PICK_CHOICE: 'overwrite'})); await w.waitForSelector('#side'); await settingsView(w);
  await w.click('[data-act=setData]'); await wait(w, /Đã chuyển dữ liệu/); await w.waitForSelector('#side');
  const okMsg = await w.innerText('#main');
  ok('ghi đè thành công: nêu vị trí mới, bản cũ và bản dự phòng; thấy dữ liệu nguồn ở đích', /Bản dự phòng của dữ liệu đã có ở đích/.test(okMsg) && /CHỦ CỦA NGUỒN/.test(await side(w)) && readCfg(udY).dataDir === dd);
  await app.close();

  /* ===== 4. Thao tác lưu phát sinh trong lúc đổi thư mục không bị mất ===== */
  const udW = mk('udW'), dd2 = mk('DICH2');
  ({app, w} = await open(udW, {HAKQN_PICK_DIR: dd2, HAKQN_RELOC_DELAY_MS: '2500'})); await w.waitForSelector('#side'); await addOwner(w, 'TRUOC', 'CHỦ TRƯỚC KHI ĐỔI');
  const res = await w.evaluate(async () => {
    const cur = window.hak.loadSync().db;
    const p1 = window.hak.settings.setData(false);
    await new Promise(r => setTimeout(r, 600));                                                // đang ở giữa thao tác đổi thư mục
    cur.rs.TRONGLUC = {id: 'TRONGLUC', info: {ma: 'TRONG', ten: 'CHỦ LƯU TRONG LÚC ĐỔI', cccd: '049067005400', ngayCap: '15/08/2021', noiCap: 'CA', diaChi: 'Đà Nẵng', danhXung: 'Ông'}, nc: [], dx: [], exp: {}, forests: {}};
    const p2 = window.hak.save(cur);
    return [await p1.then(r => r.ok, () => 'x'), await p2.then(r => r.ok, () => 'x')];
  }).catch(() => ['reload', 'reload']);
  await w.waitForTimeout(2500); await w.waitForSelector('#sideList', {timeout: 25000});
  const s4 = await side(w);
  ok('đổi thư mục xong; lưu phát sinh giữa chừng được giữ và nằm ở cơ sở dữ liệu mới', readCfg(udW).dataDir === dd2 && /CHỦ LƯU TRONG LÚC ĐỔI/.test(s4) && /CHỦ TRƯỚC KHI ĐỔI/.test(s4), JSON.stringify(res) + ' ' + s4.slice(0, 200));
  await app.close();
  const udW2 = mk('udW2'); fs.writeFileSync(path.join(udW2, 'settings.json'), JSON.stringify({dataDir: dd2, backupDir: '', lastBackup: '', remindDays: 7}));
  ({app, w} = await open(udW2)); await w.waitForSelector('#side');
  ok('mở lại trực tiếp từ thư mục mới: có cả hai chủ rừng (đã ghi vào đĩa)', /CHỦ LƯU TRONG LÚC ĐỔI/.test(await side(w)) && /CHỦ TRƯỚC KHI ĐỔI/.test(await side(w))); await app.close();

  /* ===== 5. Sao lưu toàn bộ: bấm hai lần, lỗi một file, hết dung lượng ===== */
  const udB = mk('udB'), bkB = mk('saoluuB');
  ({app, w} = await open(udB, {HAKQN_PICK_DIR: bkB})); await w.waitForSelector('#side'); await addOwner(w, 'SL', 'CHỦ SAO LƯU');
  await settingsView(w); await w.click('[data-act=setBackup]'); await w.waitForSelector('#setMsg');
  const both = await w.evaluate(() => Promise.all([window.hak.backupTo(), window.hak.backupTo()]));
  ok('bấm hai lần cùng lúc: một lần chạy, lần kia bị từ chối “đang sao lưu”', both.filter(r => r.ok).length === 1 && both.some(r => !r.ok && /Đang sao lưu/.test(r.error)), JSON.stringify(both).slice(0, 300));
  const r2 = await w.evaluate(() => window.hak.backupTo()), r3 = await w.evaluate(() => window.hak.backupTo());
  const names = fs.readdirSync(bkB).filter(n => /\.json$/.test(n));
  ok('các lần sao lưu liên tiếp không ghi đè nhau (mỗi lần một cặp file riêng)', r2.ok && r3.ok && names.length === 3 && new Set(names).size === 3, names.join(','));
  const last1 = readCfg(udB).lastBackup; ok('ghi nhận mốc sao lưu gần nhất', !!last1);
  await app.close();
  const counts = () => fs.readdirSync(bkB).filter(n => /\.(json|sqlite)$/.test(n)).length;
  for (const [mode, expectFiles, re] of [['sqlite', 1, /SQLite/], ['json', 1, /JSON/], ['enospc', 1, /hết dung lượng/], ['space', 0, /không đủ chỗ trống/]]) {
    const before = counts();
    ({app, w} = await open(udB, {HAKQN_TEST_BACKUP_FAIL: mode})); await w.waitForSelector('#side');
    const r = await w.evaluate(() => window.hak.backupTo());
    const added = counts() - before, tmps = fs.readdirSync(bkB).filter(n => /\.tmp-/.test(n));
    ok('sao lưu lỗi (' + mode + '): báo rõ, ok=false, không để file tạm', r.ok === false && re.test(r.error || r.message || '') && tmps.length === 0, JSON.stringify(r).slice(0, 300));
    ok('  … số file mới đúng (' + expectFiles + ') và mốc sao lưu gần nhất giữ nguyên', added === expectFiles && readCfg(udB).lastBackup === last1, 'thêm ' + added + ', mốc ' + readCfg(udB).lastBackup);
    await app.close();
  }
  console.log(fail ? 'CÓ ' + fail + ' LỖI' : 'TẤT CẢ ĐẠT'); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
