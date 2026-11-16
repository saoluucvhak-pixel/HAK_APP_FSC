'use strict';
/* Thứ tự in (bản 2.2): tab Xuất hồ sơ liệt kê mẫu theo đúng trình tự; ủy quyền sau hợp đồng bị chặn (Electron thật, SQLite thật).
 * Chạy: xvfb-run -a node scripts/e2e-thutu-in.js */
const {_electron: electron} = require('playwright-core');
const path = require('path'), fs = require('fs'), os = require('os');
const src = fs.readFileSync(path.join(__dirname, 'e2e-inan2.js'), 'utf8');
const {nv, lot, seed} = new Function(src.slice(src.indexOf('const nv ='), src.indexOf('const plain =')) + '; return {nv, lot, seed};')();
const root = path.join(__dirname, '..');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hakqn-ttin-'));
let fail = 0; const ok = (name, cond, extra) => { console.log((cond ? 'ĐẠT  ' : 'LỖI  ') + name + (!cond && extra ? ' — ' + extra : '')); if (!cond) fail++; };
(async () => {
  const app = await electron.launch({executablePath: require('electron'), args: [root, '--no-sandbox'], env: {...process.env, HAKQN_CLOSE: 'discard', HAKQN_DB: path.join(dir, 'd.sqlite'), HAKQN_USERDATA: path.join(dir, 'ud'), HAKQN_DOWNLOAD_DIR: path.join(dir, 'out')}});
  const w = require('./_hd30').boc(await app.firstWindow()); const errs = []; w.on('pageerror', e => errs.push(e.message)); w.on('dialog', d => d.accept()); await w.waitForSelector('#side');
  const p = (i, vai, ten, cd, doi) => ({...nv(i, vai, ten, cd, '04908500' + String(3000 + i)), maRung: 'R-A', doi});
  const two = [p(1, 'Tổ trưởng', 'TT MỘT', 'Tổ trưởng', 'Đội 1'), p(2, 'Công nhân', 'CN A', 'Công nhân khai thác', 'Đội 1'), p(3, 'Tổ trưởng', 'TT HAI', 'Tổ trưởng', 'Đội 2'), p(4, 'Công nhân', 'CN B', 'Công nhân khai thác', 'Đội 2')];
  const A = lot('fa', 'R-A', {exp: {soKT: '015', ngayKy: '02/10/2026', uqNgay: '05/10/2026'}, pc: [], nc: two, kl: 10});
  await w.evaluate(d => window.hak.save(d), seed([A])); await w.reload(); await w.waitForSelector('#side');
  await w.click('[data-open=own1]'); await w.click('[data-tab=rung]'); await w.click('[data-forest=fa]'); await w.click('[data-ftab=xuat]'); await w.waitForSelector('#thuTuIn');
  await w.evaluate(() => { document.getElementById('thuTuIn').open = true; });
  const rows = await w.$$eval('#thuTuIn tbody tr', r => r.map(x => x.innerText.replace(/\s+/g, ' ').trim()));
  ok('thứ tự in có đủ bản ghi (2 đội: nhiều hơn 20), STT bắt đầu từ 1', rows.length > 20 && /^1 /.test(rows[0]), rows.length + ' dòng');
  ok('đợt 1 mở đầu bằng BM-17 (nhóm Lô)', /BM-17/.test(rows[0]), rows[0]);
  const i1 = rows.findIndex(x => /BM-20.*Đội 1/.test(x)), i2 = rows.findIndex(x => /BM-01.*Đội 1/.test(x)), i3 = rows.findIndex(x => /BM-20.*Đội 2/.test(x));
  ok('đội 1: ủy quyền (BM-20) trước hợp đồng (BM-01); đội 1 xong mới đến đội 2', i1 >= 0 && i1 < i2 && i2 < i3, [i1, i2, i3].join(','));
  const j08 = rows.findIndex(x => /BM-08/.test(x)), j09 = rows.findIndex(x => /BM-09/.test(x));
  ok('đợt 2: đội khai thác (BM-08) trước đội xe (BM-09)', j08 >= 0 && j08 < j09, [j08, j09].join(','));
  // ủy quyền sau ngày ký hợp đồng bị chặn
  await w.click('[data-ftab=kt]'); await w.waitForTimeout(400);
  ok('ngày ủy quyền 05/10/2026 sau ngày ký hợp đồng 02/10/2026: báo mục chặn “Ủy quyền sau hợp đồng”', /Ủy quyền sau hợp đồng|ủy quyền.*sau ngày ký hợp đồng/i.test(await w.innerText('#main')), (await w.innerText('#main')).slice(0, 300));
  ok('không có lỗi script trên màn hình', errs.length === 0, errs.join(' | '));
  await app.close(); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
