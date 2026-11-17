'use strict';
/* Kho sao lưu (Cài đặt → Sao lưu và khôi phục), Electron thật + SQLite thật, dữ liệu giả lập, không dùng mạng:
 *  - đóng ứng dụng sau khi dữ liệu đổi: bản tự sao lưu của hôm nay được làm mới (chứa việc vừa làm); không đổi thì không ghi lại;
 *  - màn kho: liệt kê theo loại, tổng dung lượng, lọc, kiểm tra từng bản (bản hỏng báo rõ), nhãn trạng thái ở thanh ngữ cảnh;
 *  - khôi phục từ bản .sqlite: xem trước số liệu → thay toàn bộ → giao diện và SQLite đúng bản sao lưu, có bản "Trước khi khôi phục", hoàn tác được; bản hỏng không ghi gì;
 *  - xóa bản sao lưu; “Tự sao lưu ngay”; Ctrl+S lưu lô đang mở; menu ⋯ Thêm không bị cắt khi cửa sổ hẹp;
 *  - D1: khôi phục một lô đang có thay đổi chưa lưu rồi lưu ở nơi khác không ghi lại bản trước khi khôi phục.
 * Chạy: xvfb-run -a node scripts/e2e-kho-sao-luu.js */
const {_electron: electron} = require('playwright-core');
const path = require('path'), fs = require('fs'), os = require('os');
const root = path.join(__dirname, '..');
const {Store} = require('../src/store');
const AB = require('../src/autobackup');
const base = fs.mkdtempSync(path.join(os.tmpdir(), 'hakqn-ksl-')), ud = path.join(base, 'ud'), bk = path.join(ud, 'backups'), dbFile = path.join(ud, 'hakqn.sqlite');
let fail = 0; const ok = (name, cond, extra) => { console.log((cond ? 'ĐẠT  ' : 'LỖI  ') + name + (!cond && extra ? ' — ' + extra : '')); if (!cond) fail++; };
const errs = [];
const launch = async extra => { const app = await electron.launch({executablePath: require('electron'), args: [root, '--no-sandbox'], env: {...process.env, HAKQN_USERDATA: ud, HAKQN_CLOSE: 'save', ELECTRON_DISABLE_SECURITY_WARNINGS: '1', ...(extra || {})}}); const w = require('./_hd30').boc(await app.firstWindow()); w.on('pageerror', e => errs.push(e.message)); w.on('dialog', d => d.accept()); await w.waitForSelector('#side'); return {app, w}; };
const today = 'tu-dong-' + AB.dayOf(new Date()) + '.sqlite', todayFile = path.join(bk, today);
const klTrong = f => { const s = new Store(f, {backupDir: path.join(base, 'tam')}); try { const d = s.load(); return {kl: d.rs.own1.forests.fa.pc[0].kl, lo: Object.keys(d.rs.own1.forests).length, chu: Object.keys(d.rs).length}; } finally { s.close(); } };
const lo = (id, ma, kl) => ({id, info: {maRung: ma, tenRung: 'Rừng ' + ma, diaDiem: 'Thôn A', dienTich: 2, giayTo: []}, nc: [], dx: [], pc: [{_id: 'p1', stt: 1, ngay: '05/01/2026', bienSo: '92C-00001', soPhieu: ma + '-1', kl}], exp: {}});
const seed = kl => ({v: 2, rs: {own1: {id: 'own1', info: {ma: 'CR-KSL', ten: 'NGUYỄN KHO SAO LƯU', cccd: '049000000077'}, forests: {fa: lo('fa', 'R-KSL', kl)}}}});
const settle = async (w, cond, ms = 10000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await cond()) return true; await w.waitForTimeout(150); } return cond(); };
const moKho = async w => { await w.click('#navSet'); await w.click('#setTab_setbk'); await w.waitForSelector('#kslTinhTrang'); };
(async () => {
  let {app, w} = await launch();
  ok('ghi hồ sơ giả lập (khối lượng 10)', (await w.evaluate(d => window.hak.save(d), seed(10))).ok);
  await app.close();
  ok('đóng sau khi dữ liệu đổi: có bản tự sao lưu của hôm nay chứa dữ liệu vừa ghi', fs.existsSync(todayFile) && klTrong(todayFile).kl === 10, fs.existsSync(bk) ? fs.readdirSync(bk).join(',') : 'không có thư mục');
  const m1 = fs.statSync(todayFile).mtimeMs;

  ({app, w} = await launch()); await w.waitForTimeout(600); await app.close();
  ok('mở rồi đóng, không đổi gì: bản của hôm nay không bị ghi lại', fs.statSync(todayFile).mtimeMs === m1);

  ({app, w} = await launch());
  ok('sửa khối lượng thành 20 rồi lưu', (await w.evaluate(d => window.hak.save(d), seed(20))).ok);
  await app.close();
  ok('đóng sau khi sửa: bản của hôm nay được LÀM MỚI (khối lượng 20), không còn file tạm', klTrong(todayFile).kl === 20 && !fs.readdirSync(bk).some(n => /\.tmp-|-(wal|shm)$/.test(n)), fs.readdirSync(bk).join(','));

  // bản của các ngày trước: một bản tốt (khối lượng 10, hai lô) và một bản hỏng
  { const s = new Store(path.join(base, 'cu.sqlite'), {backupDir: path.join(base, 'tam')}); const d = seed(10); d.rs.own1.forests.fb = lo('fb', 'R-CU', 3); s.save(d); const r = await AB.daily(s, {dir: bk, now: () => new Date(2026, 0, 5, 8)}); s.close(); if (!r.ok) throw new Error(r.error); }
  { const b = fs.readFileSync(path.join(bk, 'tu-dong-2026-01-05.sqlite')); b.fill(0x5a, 4096, 4096 + 2048); fs.writeFileSync(path.join(bk, 'tu-dong-2026-01-04.sqlite'), b); }
  fs.writeFileSync(path.join(bk, 'ghi-chu-cua-toi.txt'), 'không phải bản sao lưu');

  ({app, w} = await launch());
  await settle(w, async () => !(await w.evaluate(() => document.getElementById('bkChip').hidden)));
  ok('thanh ngữ cảnh: nhãn trạng thái tự sao lưu', /Tự sao lưu: hôm nay/.test(await w.innerText('#bkChip')), await w.innerText('#bkChip'));
  await w.click('#bkChip'); await w.waitForSelector('#kslBang');
  ok('bấm nhãn mở tab Sao lưu và khôi phục', await w.evaluate(() => document.getElementById('setTab_setbk').hasAttribute('aria-current')));
  const rows = async () => w.$$eval('#kslBang tr[data-ksl-loai]', trs => trs.map(t => t.innerText.replace(/\s+/g, ' ')));
  let rs = await rows();
  ok('liệt kê 3 bản tự động, không liệt kê file lạ', rs.length === 3 && rs.every(t => /Tự động hằng ngày/.test(t)) && !rs.some(t => /ghi-chu/.test(t)), rs.join(' | '));
  ok('tổng số bản và dung lượng', /^3 bản · \d/.test(await w.innerText('#kslTong')), await w.innerText('#kslTong'));
  const iOf = async name => (await w.$$eval('#kslBang tr[data-ksl-loai]', (trs, n) => trs.findIndex(t => t.innerText.includes(n)), name));
  const hang = async name => (await w.$$('#kslBang tr[data-ksl-loai]'))[await iOf(name)];
  await (await (await hang('2026-01-05')).$('[data-act=kslKiem]')).click();
  await settle(w, async () => /dùng được/.test(await (await hang('2026-01-05')).innerText()));
  ok('kiểm tra bản tốt: dùng được, 1 chủ rừng, 2 lô', /dùng được/.test(await (await hang('2026-01-05')).innerText()) && /1 chủ rừng, 2 lô/.test(await (await hang('2026-01-05')).innerText()), await (await hang('2026-01-05')).innerText());
  await (await (await hang('2026-01-04')).$('[data-act=kslKiem]')).click();
  await settle(w, async () => /không dùng được/.test(await (await hang('2026-01-04')).innerText()));
  ok('kiểm tra bản hỏng: báo không dùng được kèm lý do', /không dùng được/.test(await (await hang('2026-01-04')).innerText()));

  // khôi phục từ bản hỏng: dừng, không ghi
  await (await (await hang('2026-01-04')).$('[data-act=kslKhoiPhuc]')).click(); await w.waitForSelector('#kslMsg');
  ok('khôi phục từ bản hỏng: dừng trước khi ghi, nêu dữ liệu chưa bị thay đổi', /Không khôi phục được/.test(await w.innerText('#kslMsg')) && /chưa bị thay đổi/.test(await w.innerText('#kslMsg')) && !fs.readdirSync(bk).some(n => n.startsWith('truoc-khoi-phuc')), await w.innerText('#kslMsg'));
  ok('dữ liệu trên máy còn nguyên sau khi bị từ chối', (await w.evaluate(() => window.hak.loadSync().db.rs.own1.forests.fa.pc[0].kl)) === 20);

  // khôi phục từ bản tốt: xem trước → thay toàn bộ
  await w.waitForSelector('#kslBang'); await (await (await hang('2026-01-05')).$('[data-act=kslKhoiPhuc]')).click(); await w.waitForSelector('#kslXem');
  const xem = (await w.innerText('#kslXem')).replace(/\s+/g, ' ');
  ok('xem trước: số liệu trên máy và trong bản sao lưu (1 lô → 2 lô, đánh dấu khác)', /Lô rừng 1 2 khác/.test(xem) && /Phiếu cân 1 2 khác/.test(xem), xem);
  ok('xem trước chưa ghi gì', (await w.evaluate(() => window.hak.loadSync().db.rs.own1.forests.fa.pc[0].kl)) === 20);
  await w.click('#kslGoBtn'); await w.waitForSelector('#kslMsg');
  const msg = await w.innerText('#kslMsg');
  ok('khôi phục xong: báo số liệu và bản sao lưu trước khi ghi', /Đã khôi phục từ tu-dong-2026-01-05\.sqlite: 1 chủ rừng, 2 lô/.test(msg) && /truoc-khoi-phuc-/.test(msg), msg);
  const sau = await w.evaluate(() => { const d = window.hak.loadSync().db; return {kl: d.rs.own1.forests.fa.pc[0].kl, lo: Object.keys(d.rs.own1.forests).length}; });
  ok('SQLite đúng bản sao lưu (khối lượng 10, hai lô)', sau.kl === 10 && sau.lo === 2, JSON.stringify(sau));
  ok('danh sách bên trái hiện 2 rừng', /2 rừng/.test(await w.innerText('#side')), await w.innerText('#side'));
  await w.waitForSelector('#kslBang'); rs = await rows();
  ok('kho có thêm bản “Trước khi khôi phục”', rs.some(t => /Trước khi khôi phục/.test(t) && /truoc-khoi-phuc-/.test(t)), rs.join(' | '));
  const truocKp = fs.readdirSync(bk).find(n => n.startsWith('truoc-khoi-phuc-'));
  ok('bản “Trước khi khôi phục” giữ dữ liệu vừa bị thay (khối lượng 20, một lô)', !!truocKp && klTrong(path.join(bk, truocKp)).kl === 20 && klTrong(path.join(bk, truocKp)).lo === 1);
  // lần lưu kế tiếp sau khôi phục không ghi lại dữ liệu cũ
  const luu = await w.evaluate(async () => { const d = window.hak.loadSync().db; d.rs.own1.info.sdt = '0905000111'; const r = await window.hak.save(d); const e = window.hak.loadSync().db; return {ok: r.ok, lo: Object.keys(e.rs.own1.forests).length, kl: e.rs.own1.forests.fa.pc[0].kl}; });
  ok('lưu tiếp sau khôi phục: dữ liệu đã khôi phục giữ nguyên', luu.ok && luu.lo === 2 && luu.kl === 10, JSON.stringify(luu));

  // hoàn tác bằng chính bản “Trước khi khôi phục”
  await w.click('[data-act=kslTai]'); await w.waitForSelector('#kslBang');
  await (await (await hang(truocKp)).$('[data-act=kslKhoiPhuc]')).click(); await w.waitForSelector('#kslGoBtn'); await w.click('#kslGoBtn');
  await settle(w, async () => (await w.evaluate(() => window.hak.loadSync().db.rs.own1.forests.fa.pc[0].kl)) === 20);
  const ht = await w.evaluate(() => { const d = window.hak.loadSync().db; return {kl: d.rs.own1.forests.fa.pc[0].kl, lo: Object.keys(d.rs.own1.forests).length}; });
  ok('hoàn tác: khôi phục lại từ bản “Trước khi khôi phục” (khối lượng 20, một lô)', ht.kl === 20 && ht.lo === 1, JSON.stringify(ht));

  // lọc theo loại, xóa bản hỏng
  await w.waitForSelector('#kslLoc'); await w.selectOption('#kslLoc', 'tudong'); rs = await rows();
  ok('lọc theo loại: chỉ còn bản tự động', rs.length === 3 && rs.every(t => /Tự động hằng ngày/.test(t)), rs.join(' | '));
  await (await (await hang('2026-01-04')).$('[data-act=kslXoa]')).click(); await w.waitForSelector('#kslMsg');
  ok('xóa bản hỏng: file không còn, các file khác và file lạ giữ nguyên', !fs.existsSync(path.join(bk, 'tu-dong-2026-01-04.sqlite')) && fs.existsSync(path.join(bk, 'tu-dong-2026-01-05.sqlite')) && fs.existsSync(path.join(bk, 'ghi-chu-cua-toi.txt')) && fs.existsSync(dbFile) && /Đã xóa tu-dong-2026-01-04/.test(await w.innerText('#kslMsg')));
  const ngoai = await w.evaluate(async f => ({a: await window.hak.saoLuu.remove(f.db), b: await window.hak.saoLuu.remove(f.txt), c: await window.hak.saoLuu.restore(f.txt), d: await window.hak.saoLuu.readJson(f.db)}), {db: dbFile, txt: path.join(bk, 'ghi-chu-cua-toi.txt')});
  ok('đường dẫn ngoài danh sách (cơ sở dữ liệu đang dùng, file lạ): mọi thao tác bị từ chối', [ngoai.a, ngoai.b, ngoai.c, ngoai.d].every(r => r.ok === false) && fs.existsSync(dbFile) && fs.existsSync(path.join(bk, 'ghi-chu-cua-toi.txt')), JSON.stringify(ngoai));

  // “Tự sao lưu ngay”: dữ liệu đã đổi (khôi phục) → làm mới bản hôm nay
  await w.waitForSelector('#kslChuaVao');
  ok('báo có thay đổi chưa vào bản tự sao lưu hôm nay', true);
  await w.click('#kslAutoBtn'); await w.waitForSelector('#kslMsg');
  ok('Tự sao lưu ngay: bản hôm nay chứa dữ liệu hiện tại, hết báo “chưa vào bản hôm nay”', /Đã tự sao lưu và kiểm tra/.test(await w.innerText('#kslMsg')) && klTrong(todayFile).kl === 20 && klTrong(todayFile).lo === 1 && !(await w.$('#kslChuaVao')), await w.innerText('#kslMsg'));

  // Ctrl+S lưu lô đang mở
  await w.click('#side [data-open=own1]'); await w.click('[data-tab=rung]'); await w.click('[data-forest=fa]'); await w.waitForSelector('[data-ftab=finfo]');
  await w.keyboard.press('Control+s'); await w.waitForTimeout(200);
  ok('Ctrl+S khi không có gì chưa lưu: chỉ báo, không lỗi', /Không có thay đổi chưa lưu/.test(await w.innerText('#saveSt')), await w.innerText('#saveSt'));
  await w.fill('#forestForm input[name=tenRung]', 'Rừng đổi tên bằng Ctrl+S'); await w.keyboard.press('Control+s');
  ok('Ctrl+S khi đang gõ: ghi nhận ô đang nhập và lưu lô vào SQLite', await settle(w, async () => (await w.evaluate(() => window.hak.loadSync().db.rs.own1.forests.fa.info.tenRung)) === 'Rừng đổi tên bằng Ctrl+S'), await w.evaluate(() => window.hak.loadSync().db.rs.own1.forests.fa.info.tenRung));
  ok('sau Ctrl+S không còn thay đổi chưa lưu', (await w.evaluate(() => window.__stDirty().length)) === 0);

  // 3.0: không còn menu “⋯ Thêm”; ở cửa sổ hẹp thanh chính nằm một dòng, Sao lưu và khôi phục ở Cài đặt
  await app.evaluate(({BrowserWindow}) => BrowserWindow.getAllWindows()[0].setContentSize(1100, 720)); await w.waitForTimeout(300);
  const hd = await w.evaluate(() => { const h = document.querySelector('header.top').getBoundingClientRect(), b = [...document.querySelectorAll('.nav .nb')].filter(x => !x.hidden).map(x => Math.round(x.getBoundingClientRect().top)); return {h: Math.round(h.height), dong: new Set(b).size, w: window.innerWidth}; });
  ok('thanh chính một dòng ở cửa sổ hẹp (không còn “⋯ Thêm”)', hd.dong === 1 && !(await w.$('#moreMenu')), JSON.stringify(hd));
  await w.click('#navSet'); ok('Cài đặt có tab Sao lưu và khôi phục', await w.isVisible('#setTab_setbk'));
  await app.close();

  /* D1: lô đang có thay đổi CHƯA LƯU rồi khôi phục chính lô đó từ gói sao lưu lô → lần lưu kế tiếp (ở nơi khác) không được ghi lại bản trước khi khôi phục.
   * Gói mang tên “Rừng A”; sau đó lô được lưu thành “Rừng B”; rồi sửa dở thành “Rừng C” (chưa lưu) và khôi phục gói (thay lô). */
  const lotDir = path.join(base, 'goi-lo'); fs.mkdirSync(lotDir);
  const moLo = async w => { await w.click('#side [data-open=own1]'); await w.click('[data-tab=rung]'); await w.click('[data-forest=fa]'); await w.waitForSelector('#forestForm'); };
  const tenDb = w => w.evaluate(() => window.hak.loadSync().db.rs.own1.forests.fa.info.tenRung);
  ({app, w} = await launch({HAKQN_LOT_DIR: lotDir}));
  await moLo(w); await w.fill('#forestForm input[name=tenRung]', 'Rừng A'); await w.keyboard.press('Control+s'); await settle(w, async () => (await tenDb(w)) === 'Rừng A');
  await w.click('#lotBackupBtn'); await settle(w, async () => fs.readdirSync(lotDir).length === 1);
  const goi = path.join(lotDir, fs.readdirSync(lotDir)[0]);
  await w.fill('#forestForm input[name=tenRung]', 'Rừng B'); await w.keyboard.press('Control+s'); await settle(w, async () => (await tenDb(w)) === 'Rừng B');
  await app.close();
  ({app, w} = await launch({HAKQN_LOT_FILE: goi}));
  await moLo(w); await w.fill('#forestForm input[name=tenRung]', 'Rừng C'); await w.keyboard.press('Tab');
  ok('D1: lô có thay đổi chưa lưu (Rừng C), SQLite còn Rừng B', (await w.evaluate(() => window.__stDirty().length)) === 1 && (await tenDb(w)) === 'Rừng B');
  // 3.0: khôi phục lô ở Cài đặt → rời lô còn thay đổi chưa lưu thì app hỏi (Lưu / Bỏ thay đổi / Quay lại); chọn Bỏ thay đổi rồi khôi phục
  await w.click('#navSet'); await w.waitForSelector('#stGDrop'); await w.click('#stGDrop'); await w.click('#setTab_setbk'); await w.click('#lotRestoreBtn'); await w.waitForSelector('input[name=lotAct][value=thay]'); await w.check('input[name=lotAct][value=thay]'); await w.click('[data-act=lotGo]');
  await settle(w, async () => (await tenDb(w)) === 'Rừng A');
  ok('D1: khôi phục lô (thay) ghi bản trong gói (Rừng A), không còn dấu chưa lưu', (await tenDb(w)) === 'Rừng A' && (await w.evaluate(() => window.__stDirty().length)) === 0, await tenDb(w));
  const s0 = await w.evaluate(() => window.__saveStats.delta + window.__saveStats.full);
  await w.click('#navSet'); await w.click('#setTab_setfmt'); await w.check('input[name=numStyle][value=en]');
  await settle(w, async () => (await w.evaluate(() => window.__saveStats.delta + window.__saveStats.full)) > s0);
  ok('D1: lần lưu kế tiếp ở nơi khác (Hiển thị số) đã ghi và lô vẫn là bản vừa khôi phục (Rừng A)', (await w.evaluate(() => window.hak.loadSync().db.dinhDangSo)) === 'en' && (await tenDb(w)) === 'Rừng A', await tenDb(w));
  await app.close();
  ok('không có lỗi JavaScript', errs.length === 0, errs.join(' | '));
  console.log(fail ? fail + ' MỤC LỖI' : 'TẤT CẢ ĐẠT');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
