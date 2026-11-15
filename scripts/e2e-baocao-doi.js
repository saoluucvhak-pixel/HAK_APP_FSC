'use strict';
/* Báo cáo theo đội: Sản lượng theo đội khai thác, Vận chuyển theo đội xe, Danh sách lao động có cột Đội (Electron thật, SQLite thật).
 * Chạy: xvfb-run -a node scripts/e2e-baocao-doi.js */
const {_electron: electron} = require('playwright-core');
const path = require('path'), fs = require('fs'), os = require('os');
const src = fs.readFileSync(path.join(__dirname, 'e2e-inan2.js'), 'utf8');
const {nv, xe, lot, seed} = new Function(src.slice(src.indexOf('const nv ='), src.indexOf('const plain =')) + '; return {nv, xe, lot, seed};')();
const root = path.join(__dirname, '..');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hakqn-bcdoi-'));
let fail = 0; const ok = (name, cond, extra) => { console.log((cond ? 'ĐẠT  ' : 'LỖI  ') + name + (!cond && extra ? ' — ' + extra : '')); if (!cond) fail++; };
(async () => {
  const app = await electron.launch({executablePath: require('electron'), args: [root, '--no-sandbox'], env: {...process.env, HAKQN_CLOSE: 'discard', HAKQN_DB: path.join(dir, 'd.sqlite'), HAKQN_USERDATA: path.join(dir, 'ud'), HAKQN_DOWNLOAD_DIR: path.join(dir, 'out')}});
  const w = await app.firstWindow(); const errs = []; w.on('pageerror', e => errs.push(e.message)); w.on('dialog', d => d.accept()); await w.waitForSelector('#side');
  const p = (i, vai, ten, cd, doi) => ({...nv(i, vai, ten, cd, '04908500' + String(8000 + i)), doi});
  const P = (i, ngay, bien, so, kl, doi) => ({_row: i + 1, maRung: 'R-A', stt: String(i), ngay, bienSo: bien, soPhieu: so, kl, noiGiao: 'KCN Điện Nam, Quảng Nam', doi});
  const nc = [p(1, 'Tổ trưởng', 'TRẦN MỘT', 'Tổ trưởng', 'Đội 1'), p(2, 'Công nhân', 'LÊ A', 'Công nhân khai thác', 'Đội 1'), p(3, 'Tổ trưởng', 'NGUYỄN HAI', 'Tổ trưởng', 'Đội 2'), p(4, 'Công nhân', 'PHẠM B', 'Công nhân khai thác', 'Đội 2')];
  const A = lot('fa', 'R-A', {exp: {soKT: '015', ngayKy: '02/10/2026'}, kl: null, nc, dx: [xe('92C-12345', '049000000077', 'LÊ VĂN MỘT'), xe('92C-67890', '049000000078', 'TRẦN VĂN HAI')],
    pc: [P(1, '05/10/2026', '92C-12345', 'PA1', 12.5, 'Đội 1'), P(2, '06/10/2026', '92C-67890', 'PA2', 9.25, 'Đội 2'), P(3, '07/10/2026', '92C-12345', 'PA3', 8, 'Đội 1'), P(4, '08/10/2026', '92C-67890', 'PA4', 6, '')]});
  await w.evaluate(d => window.hak.save(d), seed([A])); await w.reload(); await w.waitForSelector('#side');
  await w.click('[data-act=rpOpen]'); await w.waitForSelector('#rpBody');
  ok('hộp Báo cáo có hai mẫu mới: Sản lượng theo đội khai thác và Vận chuyển theo đội xe', !!(await w.$('[data-rpsel=sanluongdoi]')) && !!(await w.$('[data-rpsel=vanchuyendoi]')));
  await w.click('[data-rpsel=sanluongdoi]'); await w.waitForTimeout(400); let t = await w.innerText('#rpBody');
  ok('sản lượng theo đội: Đội 1 = 2 phiếu, 20,5 tấn; Đội 2 = 1 phiếu, 9,25 tấn', /Đội 1[\s\S]*TRẦN MỘT[\s\S]*20,5/.test(t) && /Đội 2[\s\S]*NGUYỄN HAI[\s\S]*9,25/.test(t), t.slice(0, 900));
  ok('có đơn giá bình quân đ/tấn và thành tiền của đội; phiếu chưa gán đội (PA4: 6 tấn) liệt kê ở mục II', /Đơn giá \(đ\/tấn\)/.test(t) && /Thành tiền/.test(t) && /Phiếu cân chưa gán đội/.test(t) && /\b6\b/.test(t));
  await w.click('[data-rpsel=vanchuyendoi]'); await w.waitForTimeout(400); t = await w.innerText('#rpBody');
  ok('vận chuyển theo đội xe: người ký LÊ VĂN MỘT 2 chuyến 20,5 tấn; TRẦN VĂN HAI 2 chuyến 15,25 tấn', /LÊ VĂN MỘT[\s\S]*20,5/.test(t) && /TRẦN VĂN HAI[\s\S]*15,25/.test(t), t.slice(0, 900));
  await w.click('[data-rpsel=laodong]'); await w.waitForTimeout(400); t = await w.innerText('#rpBody');
  if (process.env.DBG) console.log('LD>>', t.slice(t.indexOf('II. Danh sách lao động'), t.indexOf('II. Danh sách lao động') + 700).replace(/\n/g, ' | '));
  ok('danh sách lao động có cột Đội: từng người ghi đội của mình', /Đơn vị giá\tĐội/.test(t) && /Tổ trưởng\t[^\n]*\tĐội 1/.test(t) && /Công nhân khai thác\t[^\n]*\tĐội 2/.test(t));
  ok('không có lỗi script trên màn hình', errs.length === 0, errs.join(' | '));
  await app.close(); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
