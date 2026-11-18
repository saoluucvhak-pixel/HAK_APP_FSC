'use strict';
/* Phiếu #10 mục 2 (thứ tự phím Tab) — Electron thật. Ở màn Thông tin chủ rừng, Thông tin rừng, hợp đồng nhân công, hợp đồng vận chuyển và hộp “Lưu / Bỏ / Quay lại”:
 *  - bấm Tab đi theo thứ tự đọc của biểu mẫu (trên xuống dưới, trái sang phải trong một hàng);
 *  - không vào phần tử ẩn (khối gập đang đóng, phần tử bị che);
 *  - phần tử đang được chọn có vòng tiêu điểm nhìn thấy được (outline hoặc box-shadow khác “none”);
 *  - hộp thoại: Tab không ra ngoài hộp; Esc đóng hộp.
 * Chạy: xvfb-run -a node scripts/e2e-thu-tu-tab.js   (IN=1: in chuỗi Tab để soát) */
const {_electron: electron} = require('playwright-core');
const path = require('path'), fs = require('fs'), os = require('os');
const src = fs.readFileSync(path.join(__dirname, 'e2e-inan2.js'), 'utf8');
const {lot, seed, PC, EXP1} = new Function(src.slice(src.indexOf('const nv ='), src.indexOf('const plain =')) + '; return {lot, seed, PC, EXP1};')();
const root = path.join(__dirname, '..'), dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hakqn-tab-'));
let fail = 0; const ok = (name, cond, extra) => { console.log((cond ? 'ĐẠT  ' : 'LỖI  ') + name + (!cond && extra ? ' — ' + extra : '')); if (!cond) fail++; };
/* bấm Tab n lần bắt đầu từ phần tử đầu tiên của vùng sel; trả chuỗi {ten, x, y, an, vong, trong} */
async function chuoiTab(w, sel, n) {
  await w.evaluate(s => { const r = document.querySelector(s); const f = r && r.querySelector('input:not([type=hidden]), select, textarea, button, [tabindex]:not([tabindex="-1"])'); if (f) f.focus(); }, sel);
  const ds = [];
  for (let i = 0; i < n; i++) {
    ds.push(await w.evaluate(s => { const e = document.activeElement, o = (e.closest && e.closest('.grid > *')) || e, r = o.getBoundingClientRect(), cs = getComputedStyle(e), vung = document.querySelector(s);   // vị trí theo ô lưới chứa phần tử (nút phụ dưới ô nhập thuộc cùng ô)
      return {ten: (e.name || e.id || e.dataset.act || e.tagName) + '', x: Math.round(r.left), y: Math.round(r.top), h: Math.round(r.height), an: !e.offsetParent || cs.visibility === 'hidden' || e.getBoundingClientRect().width === 0,
        vong: (cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0) || cs.boxShadow !== 'none', trong: !!(vung && vung.contains(e))}; }, sel));
    await w.keyboard.press('Tab');
  }
  return ds;
}
/* thứ tự đọc: y không giảm quá nửa chiều cao (cùng hàng), cùng hàng thì x tăng */
const theoThuTuDoc = ds => ds.every((p, i) => { if (!i) return true; const q = ds[i - 1]; if (p.x === q.x && p.y === q.y) return true; const cungHang = Math.abs(p.y - q.y) < 24; return cungHang ? p.x > q.x - 2 : p.y > q.y; });   // cùng ô: được; cùng hàng (lệch < 24 px): trái sang phải
const nguoc = ds => ds.map((p, i) => i && !theoThuTuDoc([ds[i - 1], p]) ? ds[i - 1].ten + '→' + p.ten : '').filter(Boolean);
(async () => {
  const app = await electron.launch({executablePath: require('electron'), args: [root, '--no-sandbox'], env: {...process.env, HAKQN_CLOSE: 'discard', HAKQN_DB: path.join(dir, 'd.sqlite'), HAKQN_USERDATA: path.join(dir, 'ud')}});
  const w = await app.firstWindow(); const errs = []; w.on('pageerror', e => errs.push(e.message)); w.on('dialog', d => d.accept()); await w.waitForSelector('#side');
  await app.evaluate(({BrowserWindow}) => BrowserWindow.getAllWindows()[0].setContentSize(1366, 768));
  await w.evaluate(d => window.hak.save(d), seed([lot('fa', 'R-A', {exp: EXP1, pc: PC, kl: 29.75}), lot('fb', 'R-B', {exp: {}, pc: []})])); await w.reload(); await w.waitForSelector('#side');
  const man = async (ten, sel, n) => {
    const ds = await chuoiTab(w, sel, n), trong = ds.filter(p => p.trong);
    if (process.env.IN) console.log(ten, JSON.stringify(ds.map(p => [p.ten, p.x, p.y, p.an ? 'ẨN' : '', p.vong ? '' : 'KHÔNG-VÒNG'])));
    ok(ten + ': Tab theo thứ tự đọc (' + trong.length + ' ô)', theoThuTuDoc(trong), nguoc(trong).join(', '));
    ok(ten + ': không vào phần tử ẩn', !ds.some(p => p.an), ds.filter(p => p.an).map(p => p.ten).join(','));
    ok(ten + ': có vòng tiêu điểm nhìn thấy được', trong.every(p => p.vong), trong.filter(p => !p.vong).map(p => p.ten).join(','));
  };
  await w.click('[data-open=own1]'); await w.click('[data-tab=info]'); await w.waitForSelector('#infoForm');
  await man('Thông tin chủ rừng', '#infoForm', 12);
  await w.click('[data-tab=rung]'); await w.click('[data-forest=fa]'); await w.click('[data-ftab=finfo]'); await w.waitForTimeout(300);
  await man('Thông tin rừng', '.mucNoiDung', 10);
  await w.click('[data-ftab=nc]'); await w.waitForTimeout(200); const r1 = await w.$('#dsHdNcTbl tbody tr[data-act]'); if (r1) await r1.click(); await w.waitForTimeout(300);
  await man('Hợp đồng nhân công', '.mucNoiDung', 10);
  await w.click('[data-ftab=dx]'); await w.waitForTimeout(200); const r2 = await w.$('#dsHdVcTbl tbody tr[data-act]'); if (r2) await r2.click(); await w.waitForTimeout(300);
  await man('Hợp đồng vận chuyển', '.mucNoiDung', 10);
  // hộp Lưu / Bỏ / Quay lại: tạo thay đổi chưa lưu ở lô A rồi chuyển sang lô B
  await w.click('[data-ftab=nc]'); await w.waitForTimeout(200); { const r = await w.$('#dsHdNcTbl tbody tr[data-act]'); if (r) await r.click(); } await w.evaluate(() => window.__hak.mucLo('nc', 'thanhvien')); await w.waitForTimeout(300); await w.click('[data-act=stAdd][data-kind=nc]'); await w.waitForSelector('#stForm [name=ten]');
  await w.selectOption('#stForm [name=vaiTro]', 'Công nhân'); await w.selectOption('#stForm [name=danhXung]', 'Bà');
  for (const [k, v] of [['ten', 'NGƯỜI TẠM'], ['ngaySinh', '02/02/1991'], ['cccd', '049091000020'], ['ngayCap', '01/01/2021'], ['noiCap', 'CA'], ['diaChi', 'Đà Nẵng']]) await w.fill('#stForm [name=' + k + ']', v);
  await w.selectOption('#stForm [name=chucDanh]', 'Công nhân cưa').catch(() => {});
  await w.click('#stForm [type=submit]'); await w.waitForTimeout(300);
  await w.click('[data-sforest=fb]').catch(() => {}); await w.waitForSelector('#stGSave', {timeout: 4000}).catch(() => {});
  if (await w.$('#stGSave')) {
    const ds = []; await w.focus('#stGSave'); for (let i = 0; i < 6; i++) { ds.push(await w.evaluate(() => { const e = document.activeElement, b = document.getElementById('stBox'); return {ten: e.id || e.tagName, trong: !!(b && b.contains(e))}; })); await w.keyboard.press('Tab'); }
    if (process.env.IN) console.log('hộp', JSON.stringify(ds));
    ok('hộp Lưu / Bỏ / Quay lại: Tab không ra ngoài hộp', ds.every(p => p.trong), JSON.stringify(ds));
    await w.keyboard.press('Escape'); await w.waitForTimeout(300);
    ok('hộp Lưu / Bỏ / Quay lại: Esc đóng hộp (giữ bản nháp, ở lại lô đang làm)', !(await w.isVisible('#stGSave')) && !!(await w.$('#stDirty')));
  } else ok('mở được hộp Lưu / Bỏ / Quay lại', false);
  ok('không có lỗi script', errs.length === 0, errs.join(' | '));
  await app.close(); console.log(fail ? 'CÓ ' + fail + ' LỖI' : 'TẤT CẢ ĐẠT'); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
