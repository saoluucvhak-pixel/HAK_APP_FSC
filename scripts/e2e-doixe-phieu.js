'use strict';
/* Phiếu cân → xe → đội xe: đội xe (chỉ xem, dưới biển số) ở bảng phiếu cân, lọc theo đội xe trong khung gán đội hàng loạt (Electron thật, SQLite thật).
 * Chạy: xvfb-run -a node scripts/e2e-doixe-phieu.js */
const {_electron: electron} = require('playwright-core');
const path = require('path'), fs = require('fs'), os = require('os');
const src = fs.readFileSync(path.join(__dirname, 'e2e-inan2.js'), 'utf8');
const {nv, xe, lot, seed} = new Function(src.slice(src.indexOf('const nv ='), src.indexOf('const plain =')) + '; return {nv, xe, lot, seed};')();
const root = path.join(__dirname, '..');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hakqn-dxpc-'));
let fail = 0; const ok = (name, cond, extra) => { console.log((cond ? 'ĐẠT  ' : 'LỖI  ') + name + (!cond && extra ? ' — ' + extra : '')); if (!cond) fail++; };
(async () => {
  const app = await electron.launch({executablePath: require('electron'), args: [root, '--no-sandbox'], env: {...process.env, HAKQN_CLOSE: 'discard', HAKQN_DB: path.join(dir, 'd.sqlite'), HAKQN_USERDATA: path.join(dir, 'ud'), HAKQN_DOWNLOAD_DIR: path.join(dir, 'out')}});
  const w = require('./_hd30').boc(await app.firstWindow()); const errs = []; w.on('pageerror', e => errs.push(e.message)); w.on('dialog', d => d.accept()); await w.waitForSelector('#side');
  const p = (i, vai, ten, cd, doi) => ({...nv(i, vai, ten, cd, '04908500' + String(5000 + i)), doi});
  const P = (i, ngay, bien, so, kl) => ({_row: i + 1, maRung: 'R-A', stt: String(i), ngay, bienSo: bien, soPhieu: so, kl, noiGiao: 'KCN Điện Nam, Quảng Nam'});
  const nc = [p(1, 'Tổ trưởng', 'TRẦN MỘT', 'Tổ trưởng', 'Đội 1'), p(2, 'Công nhân', 'LÊ A', 'Công nhân khai thác', 'Đội 1'), p(3, 'Tổ trưởng', 'NGUYỄN HAI', 'Tổ trưởng', 'Đội 2'), p(4, 'Công nhân', 'PHẠM B', 'Công nhân khai thác', 'Đội 2')];
  const dx2 = [xe('92C-12345', '049000000077', 'LÊ VĂN MỘT'), xe('92C-67890', '049000000078', 'TRẦN VĂN HAI')];
  const pc = [P(1, '05/10/2026', '92C-12345', 'PA1', 12.5), P(2, '06/10/2026', '92C-67890', 'PA2', 9.25), P(3, '07/10/2026', '92C-12345', 'PA3', 8), P(4, '08/10/2026', '92C-67890', 'PA4', 6)];
  const A = lot('fa', 'R-A', {exp: {soKT: '015', ngayKy: '02/10/2026'}, kl: null, nc, dx: dx2, pc});
  const B = lot('fb', 'R-B', {exp: {}, kl: null, pc: [{...P(1, '05/10/2026', '92C-12345', 'PB1', 5), maRung: 'R-B'}]}); B.nc = B.nc.map(r => ({...r, maRung: 'R-B'})); B.dx = [{...xe('92C-12345', '049000000077', 'LÊ VĂN MỘT'), maRung: 'R-B'}];
  await w.evaluate(d => window.hak.save(d), seed([A, B])); await w.reload(); await w.waitForSelector('#side');
  const db = async () => (await w.evaluate(() => window.hak.loadSync().db)).rs.own1.forests;
  const open = async (id, ftab) => { await w.click('[data-open=own1]'); await w.click('[data-tab=rung]'); await w.click('[data-forest=' + id + ']'); await w.click('[data-ftab=' + ftab + ']'); await w.waitForTimeout(300); };
  // 1. lô hai đội xe: bảng phiếu cân có cột Đội xe với người ký của đội xe
  await open('fa', 'dx'); await w.click('[data-act=pcTatCa]'); await w.waitForTimeout(200);   // 3.0: trang chi tiết hợp đồng chỉ có phiếu của hợp đồng — xem mọi phiếu của rừng
  const PCT = '#stTbl_pc'; const th = await w.$$eval(PCT + ' thead th', l => l.map(x => x.textContent.trim()));   // phiếu #06: tiêu đề cột ngắn (“Số phiếu”), chọn bảng theo id
  ok('bảng phiếu cân hiện đội xe dưới biển số của từng phiếu (lô có hai đội xe), không thêm cột mới làm tràn bảng', /Đội xe: /.test(await w.innerText(PCT)) && !th.includes('Đội xe'), th.join('|'));
  const rows = await w.$$eval(PCT + ' tbody tr', trs => trs.map(tr => tr.innerText.replace(/\s+/g, ' ')));
  const r1 = rows.find(r => /PA1/.test(r)) || '', r2 = rows.find(r => /PA2/.test(r)) || '';
  ok('mỗi phiếu hiện đội xe của xe chạy phiếu đó: PA1 → LÊ VĂN MỘT, PA2 → TRẦN VĂN HAI', /LÊ VĂN MỘT/.test(r1) && /TRẦN VĂN HAI/.test(r2) && !/TRẦN VĂN HAI/.test(r1), r1 + ' || ' + r2);
  ok('cột Đội xe chỉ xem: không có ô chọn trong cột này (chỉ ô Đội khai thác và, bản 3.0, Xe của hợp đồng, Hợp đồng)', (await w.$$eval(PCT + ' tbody tr:first-child select', s => s.map(x => Object.keys(x.dataset)[0]).sort().join())) === 'pcdoi,pchd,pcxe');
  // 2. lọc theo đội xe trong khung gán đội hàng loạt
  const opts = await w.$$eval('#pgXe option', o => o.map(x => x.textContent.trim()));
  ok('khung gán hàng loạt có ô lọc Đội xe: (tất cả), hai người ký', opts.length === 3 && /LÊ VĂN MỘT/.test(opts.join('|')) && /TRẦN VĂN HAI/.test(opts.join('|')), opts.join('|'));
  const idMot = await w.$eval('#pgXe', s => [...s.options].find(o => /LÊ VĂN MỘT/.test(o.textContent)).value);
  await w.selectOption('#pgXe', idMot); await w.selectOption('#pgDoi', 'doi1'); await w.click('[data-act=pcGanLoat]'); await w.waitForTimeout(400); await w.click('#loDirtyBar [data-act=stSave]'); await w.waitForTimeout(400);
  const F = await db();
  ok('lọc đội xe “LÊ VĂN MỘT” → gán Đội 1: chỉ PA1, PA3 (xe 92C-12345); PA2, PA4 chưa gán', JSON.stringify(F.fa.pc.map(x => x.soPhieu + ':' + x.doiId)) === JSON.stringify(['PA1:doi1', 'PA2:', 'PA3:doi1', 'PA4:']), JSON.stringify(F.fa.pc.map(x => x.soPhieu + ':' + x.doiId)));
  // 3. lô một đội xe: không hiện cột Đội xe
  await open('fb', 'dx'); const thB = await w.$$eval(PCT + ' thead th', l => l.map(x => x.textContent.trim()));
  ok('lô một đội xe: không hiện đội xe ở bảng phiếu cân (giữ nguyên bảng cũ)', !/Đội xe: /.test(await w.innerText(PCT)) && !thB.includes('Đội xe'), thB.join('|'));
  ok('không có lỗi script trên màn hình', errs.length === 0, errs.join(' | '));
  await app.close(); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
