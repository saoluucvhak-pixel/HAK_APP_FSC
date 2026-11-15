'use strict';
/* Lưu theo phần thay đổi (src/delta.js, Store.saveDelta) trên Electron thật, SQLite thật, dữ liệu giả lập:
 * lần lưu đầu sau khi mở là lưu toàn bộ; các lần sau chỉ gửi phần đổi; dữ liệu đọc lại đúng (cả sau khi đóng/mở);
 * ghi từ nơi khác (khôi phục toàn bộ) làm ảnh chụp cũ hết hiệu lực → tự lưu toàn bộ, không mất thay đổi; đo thời gian lưu với 20.000 phiếu.
 * Chạy: xvfb-run -a node scripts/e2e-luudelta.js */
const {_electron: electron} = require('playwright-core');
const path = require('path'), fs = require('fs'), os = require('os');
const {sample} = require('./perf-luu');
const root = path.join(__dirname, '..');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hakqn-ld-'));
let fail = 0; const ok = (name, cond, extra) => { console.log((cond ? 'ĐẠT  ' : 'LỖI  ') + name + (!cond && extra ? ' — ' + extra : '')); if (!cond) fail++; };
const launch = () => electron.launch({executablePath: require('electron'), args: [root, '--no-sandbox'], env: {...process.env, HAKQN_DB: path.join(dir, 'd.sqlite'), HAKQN_USERDATA: path.join(dir, 'ud'), HAKQN_CLOSE: 'discard', ELECTRON_DISABLE_SECURITY_WARNINGS: '1'}});
(async () => {
  const errs = [];
  let app = await launch(), w = await app.firstWindow(); w.on('pageerror', e => errs.push(e.message)); w.on('dialog', d => d.accept()); await w.waitForSelector('#side');
  const big = sample(50, 4, 100);                                         // 20.000 phiếu cân
  ok('nạp dữ liệu giả lập 50 chủ × 4 lô × 100 phiếu', (await w.evaluate(d => window.hak.save(d), big)).ok);
  await w.reload(); await w.waitForSelector('#side');
  const stats = () => w.evaluate(() => ({...window.__saveStats}));
  const db = () => w.evaluate(() => window.hak.loadSync().db);
  const waitSaved = async n => { for (let i = 0; i < 100; i++) { const s = await stats(); if (s.delta + s.full >= n) return s; await w.waitForTimeout(100); } return stats(); };
  const addOwner = async (ma, ten) => {
    await w.click('text=+ Chủ rừng mới'); await w.fill('#infoForm [name="ma"]', ma); await w.fill('#infoForm [name="ten"]', ten);
    for (const [k, v] of Object.entries({cccd: '049067005' + ma.slice(-3), ngayCap: '15/08/2021', noiCap: 'CA', diaChi: 'Đà Nẵng'})) await w.fill(`#infoForm [name="${k}"]`, v);
    await w.selectOption('#infoForm [name="danhXung"]', 'Ông'); await w.click('#infoForm button[type=submit]');
  };
  // 1. lần lưu đầu sau khi mở: toàn bộ (chưa có ảnh chụp)
  await addOwner('CR-901', 'NGUYỄN LƯU MỘT'); let s = await waitSaved(1);
  ok('lần lưu đầu sau khi mở ứng dụng: lưu toàn bộ (chưa có ảnh chụp)', s.full === 1 && s.delta === 0 && s.last === 'full', JSON.stringify(s));
  // 2. các lần sau: chỉ gửi phần thay đổi
  await addOwner('CR-902', 'NGUYỄN LƯU HAI'); s = await waitSaved(2);
  ok('lần lưu tiếp theo: chỉ gửi phần thay đổi (delta)', s.delta === 1 && s.full === 1 && s.last === 'delta', JSON.stringify(s));
  let d = await db(), names = Object.values(d.rs).map(o => o.info.ten);
  ok('dữ liệu trong SQLite có đủ 2 chủ mới và 50 chủ cũ, 20.000 phiếu còn nguyên', names.includes('NGUYỄN LƯU MỘT') && names.includes('NGUYỄN LƯU HAI') && Object.keys(d.rs).length === 52 &&
    Object.values(d.rs).reduce((a, o) => a + Object.values(o.forests).reduce((b, f) => b + f.pc.length, 0), 0) === 20000);
  // 3. xóa một chủ rừng qua giao diện: delta có xóa, có bản sao lưu trước khi xóa
  await w.click('text=NGUYỄN LƯU HAI'); await w.waitForSelector('[data-act=delRs]'); await w.click('[data-act=delRs]'); s = await waitSaved(3);
  d = await db();
  ok('xóa chủ rừng qua giao diện: lưu theo phần thay đổi, chủ đó không còn trong SQLite', s.delta === 2 && !Object.values(d.rs).some(o => o.info.ten === 'NGUYỄN LƯU HAI') && Object.keys(d.rs).length === 51, JSON.stringify(s));
  // 4. ghi từ nơi khác: Khôi phục toàn bộ qua giao diện (tiến trình chính ghi rồi trả dữ liệu mới) → ảnh chụp cũ hết hiệu lực
  const backup = {v: 2, rs: {ext1: {id: 'ext1', info: {ma: 'CR-EXT', ten: 'CHỦ TỪ BẢN SAO LƯU', cccd: '049000000555', danhXung: 'Ông'}, forests: {}}}};
  const jf = path.join(dir, 'saoluu.json'); fs.writeFileSync(jf, JSON.stringify(backup));
  await w.setInputFiles('input[data-file="restore"]', jf); await w.waitForSelector('#impBox.on'); await w.click('[data-act=impGo]'); await w.waitForTimeout(800);
  ok('khôi phục qua giao diện (ghi từ tiến trình chính) thành công', (await w.innerText('#side')).includes('CHỦ TỪ BẢN SAO LƯU'));
  await addOwner('CR-903', 'NGUYỄN LƯU BA'); s = await waitSaved(4);
  ok('sau khi ghi từ nơi khác: lưu theo phần thay đổi bị từ chối (STALE) và tự lưu toàn bộ', s.fallback === 1 && s.full === 2 && s.last === 'full', JSON.stringify(s));
  d = await db(); names = Object.values(d.rs).map(o => o.info.ten);
  ok('không mất thay đổi: có chủ mới (CR-903) và chủ từ bản sao lưu', names.includes('NGUYỄN LƯU BA') && names.includes('CHỦ TỪ BẢN SAO LƯU'), names.slice(-4).join(','));
  // 5. đo: lưu toàn bộ vs lưu theo phần thay đổi với 20.000 phiếu (gửi trực tiếp như giao diện)
  const t = await w.evaluate(async () => {
    const cur = window.hak.loadSync(), D = cur.db, ms = async f => { const a = performance.now(); const r = await f(); return [Math.round(performance.now() - a), r]; };
    const [full, rf] = await ms(() => window.hak.save(D));
    let snap = HAKDelta.snapshot(D); const k = Object.keys(D.rs)[3], fk = Object.keys(D.rs[k].forests)[0]; D.rs[k].forests[fk].pc[0].kl = 42;
    const [delta, rd] = await ms(async () => { const s2 = HAKDelta.snapshot(D), dd = HAKDelta.diff(snap, s2); dd.rev = rf.rev; dd.side = HAKDelta.side(D); dd.counts = s2.counts; return window.hak.saveDelta(dd); });
    return {full, delta, ok: rf.ok && rd.ok && rd.mode === 'delta' && rd.changed === 1, kl: window.hak.loadSync().db.rs[k].forests[fk].pc[0].kl};
  });
  console.log('   20.000 phiếu: lưu toàn bộ ' + t.full + ' ms, lưu theo phần thay đổi (đổi 1 phiếu) ' + t.delta + ' ms');
  ok('20.000 phiếu: lưu theo phần thay đổi chỉ ghi 1 dòng, đúng giá trị, nhanh hơn lưu toàn bộ', t.ok && t.kl === 42 && t.delta < t.full, JSON.stringify(t));
  await app.close();
  // 6. đóng và mở lại: dữ liệu còn đúng; lần lưu đầu của phiên mới là lưu toàn bộ
  app = await launch(); w = await app.firstWindow(); w.on('pageerror', e => errs.push(e.message)); w.on('dialog', x => x.accept()); await w.waitForSelector('#side');
  d = await db(); names = Object.values(d.rs).map(o => o.info.ten);
  ok('mở lại: dữ liệu đúng (chủ mới, chủ từ bản sao lưu, không có chủ đã xóa)', names.includes('NGUYỄN LƯU MỘT') && names.includes('NGUYỄN LƯU BA') && names.includes('CHỦ TỪ BẢN SAO LƯU') && !names.includes('NGUYỄN LƯU HAI'));
  await app.close();
  ok('không có lỗi JavaScript', errs.length === 0, errs.join(' | '));
  console.log(fail ? fail + ' MỤC LỖI' : 'TẤT CẢ ĐẠT');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
