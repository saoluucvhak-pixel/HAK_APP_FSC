'use strict';
/* A3: trạng thái in đợt 2 của BM-09 / BM-10 theo ĐỘI XE. Lô có tờ nền BM-09 đã in từ trước (khóa cũ theo CCCD người ký):
 * mở bằng bản mới vẫn là "đã in"; đổi người ký của đội xe (sang doanh nghiệp trong Đối tác) vẫn còn "đã in", khóa trong SQLite là hd:<id đội xe>.
 * Chạy: xvfb-run -a node scripts/e2e-inkhoa-doixe.js */
const {_electron: electron} = require('playwright-core');
const path = require('path'), fs = require('fs'), os = require('os');
const src = fs.readFileSync(path.join(__dirname, 'e2e-inan2.js'), 'utf8');
const {lot, seed, PC, EXP1} = new Function(src.slice(src.indexOf('const nv ='), src.indexOf('const plain =')) + '; return {lot, seed, PC, EXP1};')();
const root = path.join(__dirname, '..');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hakqn-inkhoa-'));
let fail = 0; const ok = (name, cond, extra) => { console.log((cond ? 'ĐẠT  ' : 'LỖI  ') + name + (!cond && extra ? ' — ' + extra : '')); if (!cond) fail++; };
(async () => {
  const app = await electron.launch({executablePath: require('electron'), args: [root, '--no-sandbox'], env: {...process.env, HAKQN_CLOSE: 'discard', HAKQN_DB: path.join(dir, 'd.sqlite'), HAKQN_USERDATA: path.join(dir, 'ud')}});
  const w = require('./_hd30').boc(await app.firstWindow()); const errs = []; w.on('pageerror', e => errs.push(e.message)); w.on('dialog', d => d.accept()); await w.waitForSelector('#side');
  const A = lot('fa', 'R-A', {exp: EXP1, pc: PC, kl: 29.75});
  A.inDot2 = {v: 1, items: {'09:049000000077': {at: '2026-11-01T00:00:00.000Z', sig: '', info: null, legacy: true, crossChecked: false}}};   // tờ nền BM-09 in từ bản cũ, khóa theo CCCD người ký
  const D = seed([A]); D.dmDoiTac = [{id: 'dn:dv1', loai: 'doanhnghiep', ten: 'CÔNG TY VẬN TẢI A', mst: '0401234567', diaChi: 'Đà Nẵng', daiDien: 'ÔNG B', chucVu: 'Giám đốc'}];
  await w.evaluate(d => window.hak.save(d), D); await w.reload(); await w.waitForSelector('#side');
  const open = async ftab => { await w.click('[data-open=own1]'); await w.click('[data-tab=rung]'); await w.click('[data-forest=fa]'); await w.click('[data-ftab=' + ftab + ']'); await w.waitForTimeout(300); };
  const rows = async () => { await open('xuat'); await w.click('[data-xtab=all]'); await w.waitForSelector('#d2Table'); return w.evaluate(() => [...document.querySelectorAll('#d2Table tr[data-d2]')].map(tr => [tr.dataset.d2, tr.dataset.adv])); };
  const lo0 = (await w.evaluate(() => window.hak.loadSync().db)).rs.own1.forests.fa, hd = lo0.dx.find(r => r.bienSo === '92C-12345').hdvcId;
  let r = await rows(); const r09 = r.find(x => x[0] === '09:hd:' + hd);
  ok('mở bằng bản mới: tờ nền BM-09 in từ trước vẫn là "đã in" (khóa theo đội xe ' + hd + ')', !!r09 && ['kiemtra', 'cho', 'de', 'doibocuc'].includes(r09[1]), JSON.stringify(r));
  // đổi người ký của đội xe sang doanh nghiệp trong Đối tác, lưu
  await open('dx'); await w.click('[data-act=chonHd][data-hd=' + hd + ']'); await w.waitForSelector('#hdForm');
  await w.selectOption('#hdForm [name=ky]', 'd:dn:dv1'); await w.waitForTimeout(300);
  await w.evaluate(() => window.__stSaveCurrent()); await w.waitForTimeout(600);
  const lo1 = (await w.evaluate(() => window.hak.loadSync().db)).rs.own1.forests.fa, h1 = lo1.hdvc.find(h => h.id === hd);
  ok('đổi người ký của đội xe sang doanh nghiệp (đã lưu)', h1 && h1.donViId === 'dn:dv1', JSON.stringify(h1));
  r = await rows(); const r09b = r.find(x => x[0] === '09:hd:' + hd);
  ok('sau khi đổi người ký: BM-09 của đội xe vẫn "đã in" (không mất lịch sử in)', !!r09b && ['kiemtra', 'cho', 'de', 'doibocuc'].includes(r09b[1]), JSON.stringify(r));
  ok('SQLite: trạng thái in lưu theo khóa đội xe, không còn khóa theo CCCD', Object.keys(lo1.inDot2.items).includes('09:hd:' + hd) && !Object.keys(lo1.inDot2.items).includes('09:049000000077'), JSON.stringify(Object.keys(lo1.inDot2.items)));
  ok('không có lỗi JavaScript', errs.length === 0, errs.join('|'));
  await app.close(); console.log(fail ? 'CÓ ' + fail + ' LỖI' : 'TẤT CẢ ĐẠT'); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
