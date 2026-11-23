'use strict';
/* UI-03 (V10.4): bảng gọn cho bảng thành viên (#stTbl_nc) và bảng xe (#stTbl_dx), cùng quy tắc với bảng phiếu cân (#stTbl_pc).
 * Electron thật, khung 910×512 px CSS (= 1366×768 phóng 150 %), lô có 8 thành viên + 8 xe + 8 phiếu cân:
 *  - đo số dòng thấy TRỌN trong khung nhìn của từng bảng (trước khi gọn: ≤ 2 dòng; sau: ≥ 4 dòng);
 *  - tiêu đề cột dính đầu khung bảng (sticky), nút Sửa / Xóa vẫn cùng một hàng và bấm được (không bị che);
 *  - trang không cuộn ngang; không lỗi script.
 * Chạy: xvfb-run -a node scripts/e2e-bang-gon.js    (SHOT=<thư mục>: lưu ảnh chụp từng bảng; IN=1: chỉ in số đo) */
const {_electron: electron} = require('playwright-core');
const path = require('path'), fs = require('fs'), os = require('os');
const src = fs.readFileSync(path.join(__dirname, 'e2e-inan2.js'), 'utf8');
const {lot, seed, P, EXP1} = new Function(src.slice(src.indexOf('const nv ='), src.indexOf('const plain =')) + '; return {lot, seed, P, EXP1};')();
const root = path.join(__dirname, '..'), dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hakqn-banggon-'));
let fail = 0; const ok = (name, cond, extra) => { console.log((cond ? 'ĐẠT  ' : 'LỖI  ') + name + (!cond && extra ? ' — ' + extra : '')); if (!cond) fail++; };
const nv = (stt, vai, ten, cd, cccd) => ({_row: stt + 1, maRung: 'R-A', vaiTro: vai, stt: String(stt), danhXung: 'Ông', ten, ngaySinh: '01/01/1985', cccd, ngayCap: '01/01/2021', noiCap: 'CA', diaChi: 'Đà Nẵng', chucDanh: cd});
const xe = (i) => ({_row: i + 1, maRung: 'R-A', stt: String(i), chuXe: 'LÊ VĂN XE', ngaySinh: '01/01/1980', cccd: '049000000077', ngayCap: '01/01/2021', noiCap: 'CA', diaChi: 'Đà Nẵng', bienSo: '92C-' + (10000 + i), loaiXe: 'Xe tải', nguoiKy: 'Chủ xe', sdt: '0905123456'});

(async () => {
  const app = await electron.launch({executablePath: require('electron'), args: [root, '--no-sandbox'], env: {...process.env, HAKQN_CLOSE: 'discard', HAKQN_DB: path.join(dir, 'd.sqlite'), HAKQN_USERDATA: path.join(dir, 'ud')}});
  const w = await app.firstWindow(); const errs = []; w.on('pageerror', e => errs.push(e.message)); w.on('dialog', d => d.accept()); await w.waitForSelector('#side');
  await app.evaluate(({BrowserWindow}) => { const bw = BrowserWindow.getAllWindows()[0]; bw.setMinimumSize(100, 100); bw.setContentSize(910, 512); });   // bỏ cỡ tối thiểu của cửa sổ để đo đúng khung 910×512 px CSS
  const ncs = Array.from({length: 8}, (_, i) => nv(i + 1, i ? 'Công nhân' : 'Tổ trưởng', 'THÀNH VIÊN ' + (i + 1), i ? 'Công nhân khai thác' : 'Tổ trưởng', '04908500' + String(1000 + i)));
  const dxs = Array.from({length: 8}, (_, i) => xe(i + 1));
  const pc = Array.from({length: 8}, (_, i) => P(i + 1, String(5 + i).padStart(2, '0') + '/10/2026', '92C-10001', 'PA' + (i + 1), 10 + i));
  await w.evaluate(d => window.hak.save(d), seed([lot('fa', 'R-A', {exp: EXP1, pc, nc: ncs, dx: dxs, kl: 108}), lot('fb', 'R-B', {exp: {}, pc: []})])); await w.reload(); await w.waitForSelector('#side');
  const mo = async (k, muc, tbl) => {
    await w.click('[data-open=own1]'); await w.click('[data-tab=rung]'); await w.evaluate(() => { const d = document.querySelector('.rungTomTat'); if (d) d.open = true; });
    await w.click('[data-forest=fa]'); await w.click('[data-ftab=' + k + ']'); await w.waitForTimeout(150);
    const r = await w.$(k === 'nc' ? '#dsHdNcTbl tbody tr[data-act]' : '#dsHdVcTbl tbody tr[data-act]'); if (r) await r.click(); await w.waitForTimeout(200);
    await w.evaluate(([a, b]) => window.__hak.mucLo(a, b), [k, muc]); await w.waitForSelector(tbl); await w.waitForTimeout(300); await w.evaluate(() => window.scrollTo(0, 0));
  };
  const do1 = (tbl) => w.evaluate(id => {
    const t = document.querySelector(id), H = innerHeight, wr = t.closest('.wrap'), rows = [...t.tBodies[0].rows];
    const thay0 = rows.filter(r => { const b = r.getBoundingClientRect(); return b.top >= 0 && b.bottom <= H; }).length;   // số dòng thấy trọn khi vừa mở (chưa cuộn trang)
    /* cuộn trang để khung bảng nằm ngay dưới các thanh dính (thanh trên cùng, thanh ngữ cảnh): đó là điều người dùng thấy sau khi cuộn tới bảng */
    const dinh = [document.querySelector('header.top'), document.getElementById('ctxBar')].filter(Boolean).reduce((m, e) => Math.max(m, e.getBoundingClientRect().bottom), 0);
    scrollBy(0, wr.getBoundingClientRect().top - dinh - 2); const rw = wr.getBoundingClientRect();
    const top = Math.max(dinh, rw.top + t.tHead.getBoundingClientRect().height), bot = Math.min(H, rw.bottom);
    const thay = rows.filter(r => { const b = r.getBoundingClientRect(); return b.top >= top - 1 && b.bottom <= bot + 1; }).length;
    const th = t.tHead.rows[0].cells[0], cs = getComputedStyle(th), td = getComputedStyle(rows[0].cells[0]);
    const btn = [...rows[0].querySelectorAll('.stAct .btn')].map(b => Math.round(b.getBoundingClientRect().top));
    const b0 = rows[0].querySelector('.stAct .btn'), rb = b0.getBoundingClientRect(), hit = document.elementFromPoint(rb.left + rb.width / 2, rb.top + rb.height / 2);
    return {thay0, rowH: Math.round(rows[0].getBoundingClientRect().height), vw: innerWidth, vh: H, thay, tong: rows.length, sticky: cs.position === 'sticky', padTd: td.padding, fontTd: td.fontSize, btn, bamDuoc: !!hit && (hit === b0 || b0.contains(hit)), wrapH: Math.round(rw.height), dinh: Math.round(dinh), cuonNgang: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1};
  }, tbl);
  const luu = async (ten) => { if (process.env.SHOT) { fs.mkdirSync(process.env.SHOT, {recursive: true}); await w.screenshot({path: path.join(process.env.SHOT, ten + '.png')}); } };
  const kq = {};
  await mo('nc', 'thanhvien', '#stTbl_nc'); kq.nc = await do1('#stTbl_nc'); await luu('nc');
  await mo('dx', 'xe', '#stTbl_dx'); kq.dx = await do1('#stTbl_dx'); await luu('dx');
  await mo('dx', 'phieu', '#stTbl_pc'); kq.pc = await do1('#stTbl_pc'); await luu('pc');
  if (process.env.IN) { console.log(JSON.stringify(kq)); await app.close(); process.exit(0); }
  for (const [k, ten] of [['nc', 'thành viên'], ['dx', 'xe'], ['pc', 'phiếu cân']]) {
    const m = kq[k];
    ok('1366×768 phóng 150% = 910×512 CSS (' + m.vw + '×' + m.vh + ' px CSS): bảng ' + ten + ' thấy trọn ≥ 5 dòng (thấy ' + m.thay + '/' + m.tong + ' sau khi cuộn tới bảng)', m.thay >= 5, JSON.stringify(m));
    k === 'pc' || ok('bảng ' + ten + ': chiều cao dòng ≤ 42 px (' + m.rowH + ' px)', m.rowH <= 42, JSON.stringify(m));
    ok('bảng ' + ten + ': tiêu đề cột dính đầu khung (sticky); nút Sửa / Xóa cùng một hàng và bấm được', m.sticky && m.btn.length >= 2 && Math.max(...m.btn) - Math.min(...m.btn) <= 1 && m.bamDuoc, JSON.stringify(m));
    ok('bảng ' + ten + ': trang không cuộn ngang', !m.cuonNgang);
  }
  ok('không có lỗi script trên màn hình', errs.length === 0, errs.join(' | '));
  await app.close(); console.log(fail ? 'CÓ ' + fail + ' LỖI' : 'TẤT CẢ ĐẠT'); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
