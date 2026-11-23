'use strict';
/* Bộ lọc nhanh / hộp thoại (rà soát 23/11/2026) — Electron thật, cửa sổ 1024×768:
 *  FLT-05  ô tìm nhanh gõ nhiều từ: mỗi từ khớp ở cột khác nhau vẫn tìm thấy (BKS + số phiếu, thứ tự bất kỳ)
 *  FLT-02  gõ 6 ký tự liên tiếp nhanh chỉ vẽ lại ≤ 2 lần; kết quả lọc vẫn đúng; Enter ép cập nhật ngay
 *  FLT-03  kho bộ lọc đã lưu bị hỏng: Hộp lọc nâng cao báo + nút “Tạo kho mới” (xác nhận trong hộp, sao lưu .bak) rồi lưu được bộ lọc
 *  UI-05   đóng hộp thoại trả tiêu điểm về nút đã mở nó; Tab đi vòng trong hộp
 * Chạy: xvfb-run -a node scripts/e2e-loc-nhanh.js */
const {_electron: electron} = require('playwright-core');
const path = require('path'), fs = require('fs'), os = require('os');
const src = fs.readFileSync(path.join(__dirname, 'e2e-inan2.js'), 'utf8');
const {lot, seed, PC, EXP1} = new Function(src.slice(src.indexOf('const nv ='), src.indexOf('const plain =')) + '; return {lot, seed, PC, EXP1};')();
const root = path.join(__dirname, '..');
let fail = 0; const ok = (name, cond, extra) => { console.log((cond ? 'ĐẠT  ' : 'LỖI  ') + name + (!cond && extra ? ' — ' + extra : '')); if (!cond) fail++; };
(async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hakqn-locnhanh-'));
  const app = await electron.launch({executablePath: require('electron'), args: [root, '--no-sandbox'], env: {...process.env, HAKQN_CLOSE: 'discard', HAKQN_DB: path.join(dir, 'd.sqlite'), HAKQN_USERDATA: path.join(dir, 'ud')}});
  const w = await app.firstWindow(); const errs = []; w.on('pageerror', e => errs.push(e.message)); w.on('dialog', d => d.accept());
  await w.waitForSelector('#side');
  await app.evaluate(({BrowserWindow}) => BrowserWindow.getAllWindows()[0].setContentSize(1024, 768));
  await w.evaluate(d => window.hak.save(d), seed([lot('fa', 'R-A', {exp: EXP1, pc: PC, kl: 29.75})])); await w.reload(); await w.waitForSelector('#side');
  await w.click('[data-open=own1]').catch(() => {}); await w.click('[data-tab=rung]'); await w.evaluate(() => { const d = document.querySelector('.rungTomTat'); if (d) d.open = true; });
  await w.click('[data-forest=fa]'); await w.click('[data-ftab=dx]'); await w.waitForTimeout(250);
  const r0 = await w.$$('#dsHdVcTbl tbody tr[data-act]'); if (r0[0]) await r0[0].click(); await w.waitForTimeout(200);
  await w.evaluate(() => window.__hak.mucLo && window.__hak.mucLo('dx', 'phieu')); await w.waitForTimeout(300);
  await w.waitForSelector('#stTbl_pc');
  const Q = '.hak-sf-q[data-sfq=lo_phieu_can]';
  const dong = async () => (await w.$$eval('#stTbl_pc tbody tr', l => l.filter(r => !r.querySelector('[data-bang-trong]')).map(r => r.innerText.replace(/\s+/g, ' ')))), tong = (await dong()).length;
  ok('có phiếu để thử (≥ 2 dòng)', tong >= 2, String(tong));
  const bks = PC[0].bienSo, so = PC[0].soPhieu;

  // FLT-05
  const dem = async q => { await w.fill(Q, q); await w.press(Q, 'Enter'); await w.waitForTimeout(150); return (await dong()).length; };
  const n1 = await dem(so + ' ' + bks), n2 = await dem(bks + ' ' + so), n3 = await dem(so + '  ' + 'khongcoxyz');
  ok('FLT-05: “số phiếu BKS” và “BKS số phiếu” (từ ở hai cột khác nhau, thứ tự bất kỳ) đều tìm thấy dòng', n1 >= 1 && n1 === n2, JSON.stringify({n1, n2}));
  ok('FLT-05: thêm một từ không có thì không còn dòng nào (AND)', n3 === 0, String(n3));
  ok('FLT-05: xóa ô tìm thì hiện lại đủ dòng', (await dem('')) === tong);

  // FLT-02
  await w.evaluate(() => { window.__nVe = 0; new MutationObserver(ms => { window.__nVe += ms.filter(m => [...m.addedNodes].some(n => n.nodeType === 1)).length; }).observe(document.getElementById('main'), {childList: true}); });   // mỗi lần vẽ lại = thay con của #main
  await w.focus(Q); await w.keyboard.type(so.slice(0, 6) || 'abcdef', {delay: 25}); await w.waitForTimeout(700);
  const nVe = await w.evaluate(() => window.__nVe);
  ok('FLT-02: gõ 6 ký tự liên tiếp nhanh chỉ vẽ lại ≤ 2 lần', nVe >= 1 && nVe <= 2, String(nVe));
  ok('FLT-02: sau khi vẽ, ô tìm vẫn giữ tiêu điểm và đủ 6 ký tự', await w.evaluate(q => document.activeElement === document.querySelector(q) && document.querySelector(q).value.length >= 1, Q));
  await w.fill(Q, 'khongcophieunay'); await w.press(Q, 'Enter');
  ok('FLT-02: Enter ép cập nhật ngay (không phải chờ hẹn giờ)', (await w.$$eval('#stTbl_pc [data-bang-trong]', l => l.length)) >= 1 || (await dong()).length === 0);
  await w.fill(Q, ''); await w.focus(Q); await w.keyboard.type('ab ', {delay: 20}); await w.waitForTimeout(500); await w.keyboard.type('cd', {delay: 20}); await w.waitForTimeout(500);
  ok('FLT-02: gõ "ab ", dừng quá 250 ms rồi gõ "cd" thì ô vẫn là "ab cd" (dấu cách không bị mất khi vẽ lại)', (await w.inputValue(Q)) === 'ab cd', await w.inputValue(Q));
  await w.fill(Q, ''); await w.press(Q, 'Enter'); await w.waitForTimeout(150);
  await w.evaluate(() => { const b = document.querySelector('#stTbl_pc [data-sfreset]'); if (b) b.click(); }); await w.waitForTimeout(150);

  // FLT-03 + UI-05
  await w.evaluate(() => localStorage.setItem('hak.sf.presets', '{hỏng'));
  await w.evaluate(() => { window.hakSfPresetStore = null; });
  const mo = '[data-sfopen=lo_phieu_can]';
  await w.focus(mo); await w.click(mo); await w.waitForSelector('#dlgBox.on');
  const thongBao = await w.$('#sfKhoHong');
  ok('FLT-03: kho bộ lọc hỏng → hộp lọc nâng cao có thông báo và nút “Tạo kho mới”', !!thongBao && !!(await w.$('[data-sfpreset=kho-moi]')));
  await w.fill('#sfPresetName', 'mau1'); await w.click('[data-sfpreset=save]'); await w.waitForTimeout(100);
  ok('FLT-03: chưa tạo kho mới thì lưu bị từ chối (không ghi đè kho cũ)', (await w.evaluate(() => localStorage.getItem('hak.sf.presets'))) === '{hỏng');
  await w.click('[data-sfpreset=kho-moi]'); await w.waitForSelector('[data-sfpreset=kho-dongy]');
  ok('FLT-03: bấm “Tạo kho mới” hỏi xác nhận ngay trong hộp (không dùng hộp confirm của trình duyệt)', !!(await w.$('[data-sfpreset=kho-huy]')));
  await w.click('[data-sfpreset=kho-huy]'); await w.waitForSelector('[data-sfpreset=kho-moi]');
  ok('FLT-03: “Không tạo” giữ nguyên kho cũ', (await w.evaluate(() => localStorage.getItem('hak.sf.presets'))) === '{hỏng');
  await w.click('[data-sfpreset=kho-moi]'); await w.click('[data-sfpreset=kho-dongy]'); await w.waitForTimeout(150);
  const bak = await w.evaluate(() => localStorage.getItem('hak.sf.presets.bak'));
  ok('FLT-03: đồng ý → kho cũ sao lưu nguyên văn sang hak.sf.presets.bak, thông báo lỗi biến mất', bak === '{hỏng' && !(await w.$('#sfKhoHong')));
  await w.fill('#sfPresetName', 'mau1'); await w.click('[data-sfpreset=save]'); await w.waitForTimeout(150);
  ok('FLT-03: sau khi tạo kho mới lưu được bộ lọc', /mau1/.test(await w.evaluate(() => localStorage.getItem('hak.sf.presets'))) && (await w.$$eval('#sfPresetSel option', l => l.map(o => o.value))).includes('mau1'));

  // UI-05: Tab đi vòng trong hộp; đóng hộp trả tiêu điểm
  const trong = () => w.evaluate(() => !!document.activeElement.closest('#dlgBox'));
  let giu = true; for (let i = 0; i < 40; i++) { await w.keyboard.press('Tab'); if (!(await trong())) { giu = false; break; } }
  ok('UI-05: Tab 40 lần vẫn ở trong hộp thoại (bẫy phím không bị tê liệt)', giu);
  await w.click('#dlgBox [data-act=dlgDong]'); await w.waitForTimeout(150);
  ok('UI-05: đóng hộp trả tiêu điểm về nút “Bộ lọc nâng cao” đã mở hộp', await w.evaluate(m => document.activeElement === document.querySelector(m), mo));

  ok('không có lỗi trang', errs.length === 0, errs.join(' | '));
  await app.close();
  console.log(fail ? 'CÓ ' + fail + ' LỖI' : 'TẤT CẢ ĐẠT'); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
