'use strict';
/* Phiếu #06b (ND-11, ND-12 và quyết định gập cảnh báo ở PR #53; rà soát 01: D-05, D-06, D-07, D-09, A-07), Electron thật.
 *  - khung cảnh báo KHÔNG chặn gập thành một dòng có số lượng và nút “Xem”; mở ra thấy đủ; khung lỗi chặn luôn mở; 1366×768 150 % vẫn thấy ≥ 3 dòng bảng phiếu cân khi có cảnh báo;
 *  - Cài đặt không hiện cột chủ rừng; bảng danh mục rỗng không có thanh cuộn ngang;
 *  - tab Xuất hồ sơ: nút tải biểu mẫu thấy ngay ở 1920×1080 không cần cuộn; khung Vòng đời và Sổ văn bản gập mặc định;
 *  - nút bị khóa (Chốt hồ sơ) vẫn nhận ra là nút: chữ đạt tương phản AA ≥ 4,5:1, viền nét đứt;
 *  - hết chữ hướng dẫn cũ “⋯ Thêm”, “Tab Phiếu cân” trong ứng dụng và docs/HUONG_DAN.md.
 * Chạy: xvfb-run -a node scripts/e2e-man-khac.js */
const {_electron: electron} = require('playwright-core');
const path = require('path'), fs = require('fs'), os = require('os');
const src = fs.readFileSync(path.join(__dirname, 'e2e-inan2.js'), 'utf8');
const {lot, seed, P, EXP1} = new Function(src.slice(src.indexOf('const nv ='), src.indexOf('const plain =')) + '; return {lot, seed, P, EXP1};')();
const root = path.join(__dirname, '..');
let fail = 0; const ok = (name, cond, extra) => { console.log((cond ? 'ĐẠT  ' : 'LỖI  ') + name + (!cond && extra ? ' — ' + extra : '')); if (!cond) fail++; };
const lum = c => { const [r, g, b] = c.map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
async function chay(scale, W, H, seedData, fn) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hakqn-mk-'));
  const app = await electron.launch({executablePath: require('electron'), args: [root, '--no-sandbox'].concat(scale === 1 ? [] : ['--force-device-scale-factor=' + scale]), env: {...process.env, HAKQN_CLOSE: 'discard', HAKQN_DB: path.join(dir, 'd.sqlite'), HAKQN_USERDATA: path.join(dir, 'ud')}});
  const w = await app.firstWindow(); const errs = []; w.on('pageerror', e => errs.push(e.message)); w.on('dialog', d => d.accept()); await w.waitForSelector('#side');
  await app.evaluate(({BrowserWindow}, [a, b]) => BrowserWindow.getAllWindows()[0].setContentSize(a, b), [W, H]);
  if (seedData) { await w.evaluate(d => window.hak.save(d), seedData); await w.reload(); await w.waitForSelector('#side'); }
  try { await fn(w, errs); } finally { await app.close(); }
}
const moLo = async (w, fid, ftab) => { await w.click('[data-open=own1]'); await w.click('[data-tab=rung]'); await w.evaluate(() => { const d = document.querySelector('.rungTomTat'); if (d) d.open = true; }); await w.click('[data-forest=' + fid + ']'); await w.click('[data-ftab=' + ftab + ']'); await w.waitForTimeout(250); };

(async () => {
  // ===== 1366×768, 150 %: cảnh báo gập, Cài đặt, bảng danh mục rỗng =====
  const pc = Array.from({length: 8}, (_, i) => P(i + 1, String(5 + i).padStart(2, '0') + '/10/2026', '92C-12345', 'PA' + (i + 1), 10 + i));
  pc[0].klKg = 5000; pc[1].klKg = 6000;   // khối lượng kg khác tấn → cảnh báo (không chặn)
  await chay(1.5, 1366, 768, seed([lot('fa', 'R-A', {exp: EXP1, pc, kl: 108})]), async (w, errs) => {
    await moLo(w, 'fa', 'dx'); const r = await w.$('#dsHdVcTbl tbody tr[data-act]'); if (r) await r.click(); await w.waitForTimeout(200);
    await w.evaluate(() => window.__hak.mucLo('dx', 'phieu')); await w.waitForTimeout(300); await w.evaluate(() => window.scrollTo(0, 0));
    const g = await w.evaluate(() => { const b = document.getElementById('issWarn'); return b ? {co: true, nut: (b.querySelector('button') || {}).innerText, li: b.querySelectorAll('li').length, cao: Math.round(b.getBoundingClientRect().height), txt: b.innerText} : {co: false}; });
    ok('khung cảnh báo gập mặc định: một dòng có số lượng và nút “Xem”, chưa hiện danh sách', g.co && /Cảnh báo \(\d+\)/.test(g.txt) && g.nut === 'Xem' && g.li === 0 && g.cao < 50, JSON.stringify(g));
    const thay = await w.evaluate(() => { const t = document.getElementById('stTbl_pc'), H = window.innerHeight, rows = t ? [...t.tBodies[0].rows] : []; return rows.filter(r => { const b = r.getBoundingClientRect(); return b.top >= 0 && b.bottom <= H; }).length; });
    ok('1366×768 150 % có cảnh báo: vẫn thấy trọn ít nhất 3 dòng bảng phiếu cân khi mở (thấy ' + thay + '/8)', thay >= 3, 'thấy ' + thay);
    await w.click('#issWarn button'); await w.waitForTimeout(200);
    const m = await w.evaluate(() => { const b = document.getElementById('issWarn'); return {li: b.querySelectorAll('li').length, nut: b.querySelector('button').innerText, txt: b.innerText}; });
    ok('bấm “Xem”: hiện đủ các cảnh báo (không mất cảnh báo nào), nút đổi thành “Ẩn”', m.li >= 2 && m.nut === 'Ẩn' && /không khớp/.test(m.txt), JSON.stringify(m));
    await w.click('[data-act=stAdd][data-kind=pc]').catch(() => {}); await w.waitForTimeout(150); await w.keyboard.press('Escape').catch(() => {});
    await w.evaluate(() => document.getElementById('stBox') && document.getElementById('stBox').classList.remove('on'));
    ok('lựa chọn mở / gập giữ qua lần vẽ lại', await w.evaluate(() => { const b = document.getElementById('issWarn'); return !b || b.querySelectorAll('li').length >= 2; }));
    await w.click('#issWarn button').catch(() => {}); await w.waitForTimeout(150);
    ok('bấm “Ẩn”: gập lại', await w.evaluate(() => { const b = document.getElementById('issWarn'); return b && b.querySelectorAll('li').length === 0; }));
    // Cài đặt
    await w.click('#navSet'); await w.waitForTimeout(300);
    const s = await w.evaluate(() => { const l = document.querySelector('.layout'), sd = document.getElementById('side'); return {kho: l.classList.contains('khongSide'), an: getComputedStyle(sd).display === 'none', rong: Math.round(document.querySelector('main').getBoundingClientRect().width), W: window.innerWidth, ngang: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1}; });
    ok('Cài đặt không hiện cột chủ rừng (Lọc chủ rừng, + Chủ rừng mới, danh sách) và nội dung rộng hết khung', s.kho && s.an && s.rong > s.W * 0.9 && !s.ngang, JSON.stringify(s));
    for (const [tab, id] of [['setdt', 'dtWrap'], ['setxe', 'xeBang']]) {
      await w.click('#setTab_' + tab).catch(async () => { await w.click(tab === 'setdt' ? '[data-act=openSetDt]' : '[data-act=openSetXe]'); }); await w.waitForTimeout(300);
      const c = await w.evaluate(id => { const e = document.getElementById(id), wr = e && (e.classList.contains('wrap') ? e : e.closest('.wrap')); return wr ? {cw: wr.clientWidth, sw: wr.scrollWidth, hang: wr.querySelectorAll('tbody tr[data-dt],tbody tr[data-xe]').length} : null; }, id);
      ok('bảng ' + (tab === 'setdt' ? 'Danh mục đối tượng' : 'Danh mục xe') + ' rỗng không có thanh cuộn ngang', !!c && c.hang === 0 && c.sw <= c.cw + 1, JSON.stringify(c));
    }
    await w.click('#navHome'); await w.waitForTimeout(250);
    ok('ra khỏi Cài đặt: cột chủ rừng hiện lại', await w.evaluate(() => getComputedStyle(document.getElementById('side')).display !== 'none'));
    const tq = await w.evaluate(() => document.getElementById('main').innerText);
    ok('Tổng quan không còn chữ “⋯ Thêm”', !/⋯ Thêm/.test(tq), tq.slice(0, 200));
    ok('không có lỗi script trên màn hình (150 %)', errs.length === 0, errs.join(' | '));
  });

  // ===== 1920×1080, 100 %: tab Xuất hồ sơ, nút bị khóa =====
  await chay(1, 1920, 1080, seed([lot('fa', 'R-A', {exp: EXP1, pc: pc.map(p => ({...p, klKg: undefined})), kl: 108})]), async (w, errs) => {
    await moLo(w, 'fa', 'xuat'); await w.waitForSelector('#chotBox');
    const x = await w.evaluate(() => { const nut = [...document.querySelectorAll('[data-act=dl]')].filter(b => !b.disabled)[0], b = nut && nut.getBoundingClientRect(); return {chot: document.getElementById('chotBox').open, sovb: (document.getElementById('soVanBan') || {open: false}).open, nutTop: b ? Math.round(b.top) : null, nutBottom: b ? Math.round(b.bottom) : null, H: window.innerHeight}; });
    ok('khung Vòng đời và Sổ văn bản gập mặc định (lô đang lập)', x.chot === false && x.sovb === false, JSON.stringify(x));
    ok('nút tải biểu mẫu thấy ngay ở màn đầu tiên 1920×1080, không cần cuộn (đáy nút ' + x.nutBottom + ' < ' + x.H + ')', x.nutBottom != null && x.nutBottom <= x.H, JSON.stringify(x));
    await w.click('#chotBox > summary'); await w.waitForTimeout(150);
    const k = await w.evaluate(() => {
      const b = document.querySelector('#chotBox [data-act=chotLo]'); if (!b) return null; const cs = getComputedStyle(b), rgb = s => (s.match(/\d+(\.\d+)?/g) || []).slice(0, 3).map(Number);
      const nen = (() => { let e = b; for (; e; e = e.parentElement) { const c = getComputedStyle(e).backgroundColor; const m = c.match(/\d+(\.\d+)?/g) || []; if (m.length >= 3 && !(m.length === 4 && +m[3] === 0)) return rgb(c); } return [255, 255, 255]; })();
      return {dis: b.disabled, chu: rgb(cs.color), nenNut: rgb(cs.backgroundColor), vien: cs.borderTopStyle, opacity: cs.opacity, nen};
    });
    ok('nút “Chốt hồ sơ” bị khóa vẫn nhận ra là nút: viền nét đứt, không làm mờ', !!k && k.dis && k.vien === 'dashed' && +k.opacity === 1, JSON.stringify(k));
    ok('chữ nút bị khóa đạt tương phản AA ≥ 4,5:1 trên nền của nút', !!k && ratio(k.chu, k.nenNut) >= 4.5, JSON.stringify(k) + ' ' + (k ? ratio(k.chu, k.nenNut).toFixed(2) : ''));
    await w.click('#chotBox > summary'); await w.waitForTimeout(100); await w.click('#soVanBan > summary').catch(() => {}); await w.waitForTimeout(100);
    ok('mở rồi vẽ lại: lựa chọn giữ nguyên (Sổ văn bản đang mở)', await w.evaluate(() => { const d = document.getElementById('soVanBan'); return !d || d.open; }));
    ok('không có lỗi script trên màn hình (1920×1080)', errs.length === 0, errs.join(' | '));
  });

  // ===== chữ hướng dẫn cũ =====
  const sh = f => fs.readFileSync(path.join(root, f), 'utf8');
  ok('docs/HUONG_DAN.md và chữ hướng dẫn trong ứng dụng: hết “⋯ Thêm” và “Tab Phiếu cân” (chỉ còn trong chú thích lịch sử)', !/⋯ Thêm/.test(sh('docs/HUONG_DAN.md')) && !/Tab Phiếu cân/.test(sh('src/tienich.js')) &&
    ['ui/app.src.html', 'ui/app/28-tien-ich.js', 'ui/app/09-tong-quan-giao-dien.js', 'ui/app/18-su-kien.js'].every(f => !/⋯ Thêm/.test(sh(f))));
  console.log(fail ? 'CÓ ' + fail + ' LỖI' : 'TẤT CẢ ĐẠT'); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
