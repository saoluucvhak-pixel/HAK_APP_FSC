'use strict';
/* Phiếu #06a (ND-10; rà soát 01: D-01…D-04, D-08): mật độ màn hợp đồng ở 1366×768, phóng 150% (Electron thật, cùng cách đo với scripts/anh-man-hinh.js).
 *  - mở mục Phiếu cân của hợp đồng có 8 phiếu: thấy trọn ít nhất 3 dòng bảng ngay khi mở (không cuộn);
 *  - cột Thao tác không dính mép phải đè cột số (không position: sticky), đứng ngay sau cột Dòng; tiêu đề cột một dòng;
 *  - hai nút Sửa / Xóa đã lưu nằm cùng một hàng (không chồng nhau) ở bảng phiếu cân và bảng thành viên;
 *  - đầu hợp đồng một dòng, không lặp “Rừng … · Lô …”; không còn khối “Chủ rừng: … · Lô: …”; nhãn mục bên trái không xuống dòng;
 *  - trang không cuộn ngang.
 * Chạy: xvfb-run -a node scripts/e2e-mat-do-hop-dong.js */
const {_electron: electron} = require('playwright-core');
const path = require('path'), fs = require('fs'), os = require('os');
const src = fs.readFileSync(path.join(__dirname, 'e2e-inan2.js'), 'utf8');
const {lot, seed, P, EXP1} = new Function(src.slice(src.indexOf('const nv ='), src.indexOf('const plain =')) + '; return {lot, seed, P, EXP1};')();
const root = path.join(__dirname, '..'), dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hakqn-matdo-'));
let fail = 0; const ok = (name, cond, extra) => { console.log((cond ? 'ĐẠT  ' : 'LỖI  ') + name + (!cond && extra ? ' — ' + extra : '')); if (!cond) fail++; };

(async () => {
  const app = await electron.launch({executablePath: require('electron'), args: [root, '--no-sandbox', '--force-device-scale-factor=1.5'], env: {...process.env, HAKQN_CLOSE: 'discard', HAKQN_DB: path.join(dir, 'd.sqlite'), HAKQN_USERDATA: path.join(dir, 'ud')}});
  const w = await app.firstWindow(); const errs = []; w.on('pageerror', e => errs.push(e.message)); w.on('dialog', d => d.accept()); await w.waitForSelector('#side');
  await app.evaluate(({BrowserWindow}) => BrowserWindow.getAllWindows()[0].setContentSize(1366, 768));
  const pc = Array.from({length: 8}, (_, i) => P(i + 1, String(5 + i).padStart(2, '0') + '/10/2026', '92C-12345', 'PA' + (i + 1), 10 + i));
  await w.evaluate(d => window.hak.save(d), seed([lot('fa', 'R-A', {exp: EXP1, pc, kl: 108}), lot('fb', 'R-B', {exp: {}, pc: []})])); await w.reload(); await w.waitForSelector('#side');
  const moHd = async k => {
    await w.click('[data-open=own1]'); await w.click('[data-tab=rung]'); await w.evaluate(() => { const d = document.querySelector('.rungTomTat'); if (d) d.open = true; });
    await w.click('[data-forest=fa]'); await w.click('[data-ftab=' + k + ']'); await w.waitForTimeout(150);
    const r = await w.$(k === 'nc' ? '#dsHdNcTbl tbody tr[data-act]' : '#dsHdVcTbl tbody tr[data-act]'); if (r) await r.click(); await w.waitForTimeout(200);
  };
  await moHd('dx'); await w.evaluate(() => window.__hak.mucLo('dx', 'phieu')); await w.waitForTimeout(300); await w.evaluate(() => window.scrollTo(0, 0));
  const m = await w.evaluate(() => {
    const t = document.getElementById('stTbl_pc'), H = window.innerHeight, rows = t ? [...t.tBodies[0].rows] : [];
    const thay = rows.filter(r => { const b = r.getBoundingClientRect(); return b.top >= 0 && b.bottom <= H; }).length;
    const th = t ? [...t.tHead.rows[0].cells] : [], last = th[th.length - 1], hTh = th.map(c => c.getBoundingClientRect().height);
    const sticky = th.concat(rows[0] ? [...rows[0].cells] : []).some(c => getComputedStyle(c).position === 'sticky' && getComputedStyle(c).right !== 'auto');
    const btn = rows[0] ? [...rows[0].querySelectorAll('.stAct .btn')].map(b => Math.round(b.getBoundingClientRect().top)) : [];
    const nav = [...document.querySelectorAll('.mucNav button')].map(b => ({t: b.innerText.trim(), h: Math.round(b.getBoundingClientRect().height)}));
    return {thay, tong: rows.length, cot2: th[1] ? th[1].innerText.trim() : '', cuoi: last ? last.innerText.trim() : '', hThMax: Math.max(...hTh), hThMin: Math.min(...hTh), sticky, btn, nav,
      dau: (document.getElementById('hdDau') || {}).innerText || '', hH3: (() => { const h = document.querySelector('#hdDau h3'); return h ? Math.round(h.getBoundingClientRect().height) : -1; })(), hDau: (() => { const h = document.getElementById('hdDau'); return h ? Math.round(h.getBoundingClientRect().height) : -1; })(), coRung: !!document.getElementById('hdDauRung'), stInfo: [...document.querySelectorAll('.stInfo')].map(e => e.innerText).join('|'),
      cuonNgang: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1};
  });
  ok('1366×768 150%: mở mục Phiếu cân của hợp đồng (8 phiếu) thấy trọn ít nhất 3 dòng bảng, không cần cuộn (thấy ' + m.thay + '/' + m.tong + ')', m.thay >= 3, 'thấy ' + m.thay + '/' + m.tong + ' dòng');
  ok('cột Thao tác đứng sau cột Dòng, không dính mép phải (không sticky) nên không đè cột số', m.cot2 === 'Thao tác' && !m.sticky && m.cuoi !== 'Thao tác', JSON.stringify([m.cot2, m.cuoi, m.sticky]));
  ok('tiêu đề cột một dòng (mọi ô tiêu đề cùng chiều cao, không xuống 2–4 dòng)', m.hThMax - m.hThMin < 2 && m.hThMax < 40, m.hThMin + '–' + m.hThMax + 'px');
  ok('các nút Sửa / Đổi số / Xóa của phiếu đã lưu cùng một hàng (không chồng nhau)', m.btn.length === 3 && Math.max(...m.btn) - Math.min(...m.btn) <= 1, JSON.stringify(m.btn));
  ok('đầu hợp đồng một dòng, không lặp tên rừng; không còn khối “Chủ rừng: … · Lô: …”', !m.coRung && !/Rừng R-A/.test(m.dau) && !/Chủ rừng:/.test(m.stInfo) && m.hH3 > 0 && m.hH3 < 32, JSON.stringify([m.dau, m.stInfo, m.hH3, m.hDau]));   // một dòng = chiều cao thật của tiêu đề (h3 là flex nên innerText luôn xuống dòng giữa các mục, không đo bằng ký tự xuống dòng)
  ok('nhãn mục bên trái không xuống dòng', m.nav.every(x => x.h <= m.nav[0].h + 1 && x.h < 44), JSON.stringify(m.nav));
  ok('trang không cuộn ngang', !m.cuonNgang);
  await moHd('nc'); await w.evaluate(() => window.__hak.mucLo('nc', 'thanhvien')); await w.waitForTimeout(300);
  const tv = await w.evaluate(() => { const r = document.querySelector('#stTbl_nc tbody tr'); return r ? [...r.querySelectorAll('.stAct [data-act="stEdit"], .stAct [data-act="stDel"]')].map(b => Math.round(b.getBoundingClientRect().top)) : []; });
  ok('bảng thành viên: Sửa / Xóa đã lưu cùng một hàng', tv.length === 2 && Math.abs(tv[0] - tv[1]) <= 1, JSON.stringify(tv));
  ok('không có lỗi script trên màn hình', errs.length === 0, errs.join(' | '));
  await app.close(); console.log(fail ? 'CÓ ' + fail + ' LỖI' : 'TẤT CẢ ĐẠT'); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
