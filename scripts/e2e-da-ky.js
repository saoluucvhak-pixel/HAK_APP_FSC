'use strict';
/* Đã ký và Sổ in (bản 2.2): chỉ ký được mẫu đã in; ký xong hiện ngày và nút Bỏ ký; Sổ in ghi thêm từng lần; dữ liệu đổi thì chữ ký hết hiệu lực (Electron thật, SQLite thật).
 * Chạy: xvfb-run -a node scripts/e2e-da-ky.js */
const {_electron: electron} = require('playwright-core');
const path = require('path'), fs = require('fs'), os = require('os');
const src = fs.readFileSync(path.join(__dirname, 'e2e-inan2.js'), 'utf8');
const {lot, seed} = new Function(src.slice(src.indexOf('const nv ='), src.indexOf('const plain =')) + '; return {lot, seed};')();
const root = path.join(__dirname, '..');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hakqn-ky-'));
let fail = 0; const ok = (name, cond, extra) => { console.log((cond ? 'ĐẠT  ' : 'LỖI  ') + name + (!cond && extra ? ' — ' + extra : '')); if (!cond) fail++; };
(async () => {
  const app = await electron.launch({executablePath: require('electron'), args: [root, '--no-sandbox'], env: {...process.env, HAKQN_CLOSE: 'discard', HAKQN_DB: path.join(dir, 'd.sqlite'), HAKQN_USERDATA: path.join(dir, 'ud'), HAKQN_DOWNLOAD_DIR: path.join(dir, 'out')}});
  const w = await app.firstWindow(); const errs = []; w.on('pageerror', e => errs.push(e.message)); w.on('dialog', d => d.accept()); await w.waitForSelector('#side');
  const A = lot('fa', 'R-A', {exp: {soKT: '015', ngayKy: '02/10/2026'}, pc: [], kl: 10});
  await w.evaluate(d => window.hak.save(d), seed([A])); await w.reload(); await w.waitForSelector('#side');
  await w.click('[data-open=own1]'); await w.click('[data-tab=rung]'); await w.click('[data-forest=fa]'); await w.click('[data-ftab=xuat]'); await w.waitForSelector('#qtCard');
  const ky = code => w.$eval('#qtCard tr[data-qt="' + code + '"] td[data-ky]', t => t.dataset.ky);
  ok('mẫu chưa in: cột Chữ ký “chưa in”, chưa có nút ký', (await ky('17')) === 'chua' && !(await w.$('#qtCard tr[data-qt="17"] [data-act=qtKy]')));
  await w.click('#qtCard tr[data-qt="17"] [data-act=qtMark]'); await w.waitForTimeout(500);
  ok('đã in: hiện nút “Đánh dấu đã ký”', !!(await w.$('#qtCard tr[data-qt="17"] [data-act=qtKy]')));
  await w.click('#qtCard tr[data-qt="17"] [data-act=qtKy]'); await w.waitForTimeout(500);
  ok('đã ký: hiện ngày và nút Bỏ ký', (await ky('17')) === 'da' && !!(await w.$('#qtCard tr[data-qt="17"] [data-act=qtHuyKy]')));
  await w.click('#qtCard tr[data-qt="17"] [data-act=qtHuyKy]'); await w.waitForTimeout(500);
  ok('bỏ ký: về trạng thái đã in chưa ký', (await ky('17')) === 'chua');
  await w.click('#qtCard tr[data-qt="17"] [data-act=qtKy]'); await w.waitForTimeout(500);
  await w.evaluate(() => { document.getElementById('soIn').open = true; });
  const t = await w.innerText('#soIn');
  ok('Sổ in ghi thêm từng lần (đã in, đã ký, bỏ ký, đã ký lại), không ghi đè', /Đã in/.test(t) && (t.match(/Đã ký/g) || []).length === 2 && /Bỏ ký/.test(t), t.slice(0, 300));
  const F = (await w.evaluate(() => window.hak.loadSync().db)).rs.own1.forests.fa;
  ok('SQLite: sổ in lưu trong lô với 4 dòng, mẫu 17 đã ký', (F.inAn.soIn || []).length === 4 && !!F.inAn.items['17'].ky, JSON.stringify((F.inAn.soIn || []).map(x => x.hanh)));
  ok('không có lỗi script trên màn hình', errs.length === 0, errs.join(' | '));
  await app.close(); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
