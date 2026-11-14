'use strict';
/* Tự sao lưu xoay vòng hằng ngày khi mở ứng dụng (Electron thật, SQLite thật, dữ liệu giả lập): mở lần đầu chưa có hồ sơ → không sao lưu;
 * có hồ sơ rồi mở lại → có đúng một bản tu-dong-<hôm nay>.sqlite đọc lại được; mở lại cùng ngày không tạo thêm; giữ N bản (bản cũ hơn bị xóa,
 * bản sao lưu loại khác giữ nguyên); Cài đặt hệ thống hiện bản gần nhất; chọn "Tắt" thì không sao lưu nữa.
 * Chạy: xvfb-run -a node scripts/e2e-tusaoluu.js */
const {_electron: electron} = require('playwright-core');
const path = require('path'), fs = require('fs'), os = require('os');
const root = path.join(__dirname, '..');
const {Store} = require('../src/store');
const AB = require('../src/autobackup');
const base = fs.mkdtempSync(path.join(os.tmpdir(), 'hakqn-tsl-')), ud = path.join(base, 'ud'), bk = path.join(ud, 'backups');
let fail = 0; const ok = (name, cond, extra) => { console.log((cond ? 'ĐẠT  ' : 'LỖI  ') + name + (!cond && extra ? ' — ' + extra : '')); if (!cond) fail++; };
const launch = () => electron.launch({executablePath: require('electron'), args: [root, '--no-sandbox'], env: {...process.env, HAKQN_USERDATA: ud, HAKQN_CLOSE: 'discard', ELECTRON_DISABLE_SECURITY_WARNINGS: '1'}});
const autos = () => (fs.existsSync(bk) ? fs.readdirSync(bk) : []).filter(n => /^tu-dong-\d{4}-\d{2}-\d{2}\.sqlite$/.test(n)).sort();
const today = 'tu-dong-' + AB.dayOf(new Date()) + '.sqlite';
const settle = async (w, cond, ms = 8000) => { const t = Date.now(); while (Date.now() - t < ms) { if (cond()) return true; await w.waitForTimeout(150); } return cond(); };
(async () => {
  const errs = [];
  let app = await launch(), w = await app.firstWindow(); w.on('pageerror', e => errs.push(e.message)); w.on('dialog', d => d.accept()); await w.waitForSelector('#side');
  await w.waitForTimeout(800);
  ok('lần đầu, chưa có hồ sơ: không tạo bản tự sao lưu', autos().length === 0, autos().join(','));
  const seed = {v: 2, rs: {own1: {id: 'own1', info: {ma: 'CR-TSL', ten: 'NGUYỄN TỰ SAO LƯU', cccd: '049000000077'}, forests: {fa: {id: 'fa', info: {maRung: 'R-TSL', tenRung: 'Rừng TSL', giayTo: []}, nc: [], dx: [], pc: [{_id: 'p1', stt: 1, ngay: '05/01/2026', bienSo: '92C-11111', soPhieu: 'TSL-1', kl: 12.5}], exp: {}}}}}};
  ok('ghi hồ sơ giả lập', (await w.evaluate(d => window.hak.save(d), seed)).ok);
  await app.close();

  // bản tự động của các ngày trước (7 bản) + một bản sao lưu loại khác
  fs.mkdirSync(bk, {recursive: true});
  for (let i = 1; i <= 8; i++) fs.writeFileSync(path.join(bk, 'tu-dong-2020-01-0' + i + '.sqlite'), 'cu');
  fs.writeFileSync(path.join(bk, 'truoc-khoi-phuc-2020-01-01T00-00-00-000Z.sqlite'), 'khac');
  app = await launch(); w = await app.firstWindow(); w.on('pageerror', e => errs.push(e.message)); w.on('dialog', d => d.accept()); await w.waitForSelector('#side');
  await settle(w, () => autos().includes(today));
  ok('mở lại khi có hồ sơ: có bản tự sao lưu của hôm nay', autos().includes(today), autos().join(','));
  const s = new Store(path.join(bk, today)), db = s.load(); s.close();
  ok('bản tự sao lưu đọc lại đủ hồ sơ và phiếu cân', !!db.rs.own1 && db.rs.own1.forests.fa.pc[0].soPhieu === 'TSL-1');
  ok('bản tự sao lưu là một file độc lập (không kèm -wal/-shm, không file tạm)', !fs.readdirSync(bk).some(n => /^tu-dong-.*(-wal|-shm|\.tmp-)/.test(n)), fs.readdirSync(bk).join(','));
  await settle(w, () => autos().length === 7);
  ok('xoay vòng: chỉ giữ 7 bản tự động gần nhất (mặc định)', autos().length === 7 && autos()[6] === today && !autos().includes('tu-dong-2020-01-01.sqlite'), autos().join(','));
  ok('bản sao lưu loại khác không bị xóa', fs.existsSync(path.join(bk, 'truoc-khoi-phuc-2020-01-01T00-00-00-000Z.sqlite')));
  await w.click('#moreMenu summary'); await w.click('#openSettingsBtn'); await w.waitForSelector('#autoBk');
  const card = await w.innerText('#autoBk');
  ok('Cài đặt hệ thống: hiện thẻ Tự sao lưu hằng ngày, bản gần nhất và số bản', /Tự sao lưu hằng ngày/.test(card) && /Bản gần nhất/.test(card) && /7 bản/.test(card), card);
  await w.selectOption('#setAutoKeep', '3'); await w.waitForSelector('#setMsg');
  const st = await w.evaluate(() => window.hak.settings.get());
  ok('đổi số bản giữ: lưu cài đặt, xóa bớt còn 3 bản', st.settings.auto.keep === 3 && await settle(w, () => autos().length === 3), JSON.stringify(st.settings.auto) + ' ' + autos().join(','));
  await w.selectOption('#setAutoKeep', '0'); await w.waitForSelector('#setMsg');
  ok('chọn Tắt: báo đã tắt', /Đã tắt tự sao lưu/.test(await w.innerText('#setMsg')));
  await app.close();

  fs.unlinkSync(path.join(bk, today));
  app = await launch(); w = await app.firstWindow(); w.on('pageerror', e => errs.push(e.message)); await w.waitForSelector('#side'); await w.waitForTimeout(1200);
  ok('đã tắt: mở lại không tạo bản tự sao lưu', !autos().includes(today), autos().join(','));
  const st2 = await w.evaluate(() => window.hak.settings.get());
  ok('cài đặt Tắt được nhớ qua lần mở lại', st2.settings.auto.keep === 0);
  await app.close();
  ok('không có lỗi JavaScript', errs.length === 0, errs.join(' | '));
  console.log(fail ? fail + ' MỤC LỖI' : 'TẤT CẢ ĐẠT');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
