'use strict';
/* Tạo lô từ lô cũ (bản 2.2): chép đội, nhân công, xe, đơn giá, cước; không chép phiếu cân, số/ngày văn bản; người, xe theo danh mục mới nhất (Electron thật, SQLite thật).
 * Chạy: xvfb-run -a node scripts/e2e-lo-tu-lo-cu.js */
const {_electron: electron} = require('playwright-core');
const path = require('path'), fs = require('fs'), os = require('os');
const src = fs.readFileSync(path.join(__dirname, 'e2e-inan2.js'), 'utf8');
const {nv, lot, seed, P} = new Function(src.slice(src.indexOf('const nv ='), src.indexOf('const plain =')) + '; return {nv, lot, seed, P};')();
const root = path.join(__dirname, '..');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hakqn-ltlc-'));
let fail = 0; const ok = (name, cond, extra) => { console.log((cond ? 'ĐẠT  ' : 'LỖI  ') + name + (!cond && extra ? ' — ' + extra : '')); if (!cond) fail++; };
(async () => {
  const app = await electron.launch({executablePath: require('electron'), args: [root, '--no-sandbox'], env: {...process.env, HAKQN_CLOSE: 'discard', HAKQN_DB: path.join(dir, 'd.sqlite'), HAKQN_USERDATA: path.join(dir, 'ud'), HAKQN_DOWNLOAD_DIR: path.join(dir, 'out')}});
  const w = await app.firstWindow(); const errs = []; w.on('pageerror', e => errs.push(e.message)); w.on('dialog', d => d.accept()); await w.waitForSelector('#side');
  const A = lot('fa', 'R-A', {exp: {soKT: '015', ngayKy: '02/10/2026'}, kl: null, pc: [P(1, '05/10/2026', '92C-12345', 'PA1', 12.5)], nc: [nv(1, 'Tổ trưởng', 'TT CŨ', 'Tổ trưởng', '049085007001'), nv(2, 'Công nhân', 'CN CŨ', 'Công nhân khai thác', '049085007002')]});
  const D = seed([A]);
  D.dmLaoDong = [{ngayCapNhat: '01/11/2026', cccd: '049085007002', ten: 'CN CŨ', diaChi: 'ĐỊA CHỈ MỚI NHẤT', chucVu: 'Công nhân', viTri: 'Công nhân khai thác'}];
  await w.evaluate(d => window.hak.save(d), D); await w.reload(); await w.waitForSelector('#side');
  await w.click('[data-open=own1]'); await w.click('[data-tab=rung]'); await w.waitForSelector('#loTuLoCu');
  await w.evaluate(() => { document.getElementById('loTuLoCu').open = true; }); await w.click('[data-act=loTuLoCu]'); await w.waitForTimeout(800);
  const F = (await w.evaluate(() => window.hak.loadSync().db)).rs.own1.forests, ids = Object.keys(F), nb = F[ids.find(k => k !== 'fa')];
  ok('tạo thêm một lô mới (2 lô)', ids.length === 2 && !!nb);
  ok('lô mới có mã khác, chưa có thời gian khai thác, chưa có phiếu cân', nb.info.maRung !== 'R-A' && !nb.info.tuNgay && (nb.pc || []).length === 0, JSON.stringify(nb.info.maRung));
  ok('chép nhân công (2 người) và xe (2 xe), đúng đội', (nb.nc || []).length === 2 && (nb.dx || []).length === 2 && nb.nc.every(r => r.maRung === nb.info.maRung));
  ok('người trong danh mục lấy thông tin mới nhất, người ngoài danh mục giữ nguyên', nb.nc.find(r => r.cccd === '049085007002').diaChi === 'ĐỊA CHỈ MỚI NHẤT' && nb.nc.find(r => r.cccd === '049085007001').ten === 'TT CŨ');
  ok('không chép số và ngày văn bản của đội và lô', JSON.stringify(nb.exp || {}) === '{}' && (nb.doi || []).every(d => JSON.stringify(d.exp || {}) === '{}'));
  ok('lô nguồn không đổi (còn phiếu cân, số văn bản)', F.fa.pc.length === 1 && F.fa.doi[0].exp.soKT === '015');
  ok('đơn giá của đội được chép', (nb.doi[0].hinhThuc.donGiaTan || {})['Tổ trưởng'] === 420000, JSON.stringify(nb.doi[0].hinhThuc));
  ok('không có lỗi script trên màn hình', errs.length === 0, errs.join(' | '));
  await app.close(); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
