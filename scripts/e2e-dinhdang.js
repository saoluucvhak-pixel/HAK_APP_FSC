'use strict';
/* Rà soát định dạng và các màn hình (Electron thật, dữ liệu giả lập): đi qua mọi màn hình và tab, kiểm
 *  - không có chữ lỗi lập trình (NaN, undefined, null, [object Object], Invalid Date)
 *  - ngày dd/mm/yyyy (không có ngày ISO yyyy-mm-dd), giờ HH:MM:SS, số kiểu Việt Nam (không có số lẻ dài do làm tròn nhị phân)
 *  - không tràn ngang (thanh cuộn ngang của cả trang) ở 1366 px và 1024 px
 *  - không có lỗi JavaScript
 * Ảnh chụp từng màn lưu ở thư mục SHOTS (nếu đặt). Chạy: xvfb-run -a node scripts/e2e-dinhdang.js */
const {_electron: electron} = require('playwright-core');
const path = require('path'), fs = require('fs'), os = require('os');
const src = fs.readFileSync(path.join(__dirname, 'e2e-inan2.js'), 'utf8');
const {lot, seed, EXP1, PC} = new Function(src.slice(src.indexOf('const nv ='), src.indexOf('const plain =')) + '; return {lot, seed, EXP1, PC};')();
const root = path.join(__dirname, '..');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hakqn-dd-'));
let fail = 0; const ok = (name, cond, extra) => { console.log((cond ? 'ĐẠT  ' : 'LỖI  ') + name + (!cond && extra ? ' — ' + extra : '')); if (!cond) fail++; };
const BAD = [[/\bNaN\b/, 'NaN'], [/\bundefined\b/, 'undefined'], [/\bnull\b/, 'null'], [/\[object /, '[object …]'], [/Invalid Date/, 'Invalid Date'], [/\b20\d\d-\d\d-\d\d\b/, 'ngày ISO yyyy-mm-dd'], [/\d\.\d{6,}/, 'số lẻ dài (làm tròn nhị phân)'], [/\b\d{1,2}:\d{1}\b(?!\d)/, 'giờ thiếu số 0']];
(async () => {
  const app = await electron.launch({executablePath: require('electron'), args: [root, '--no-sandbox'], env: {...process.env, HAKQN_CLOSE: 'discard', HAKQN_DB: path.join(dir, 'd.sqlite'), HAKQN_USERDATA: path.join(dir, 'ud'), HAKQN_SHEET_URL: 'http://127.0.0.1:9/none.xlsx', ELECTRON_DISABLE_SECURITY_WARNINGS: '1'}});
  const w = await app.firstWindow(); const errs = []; w.on('pageerror', e => errs.push(e.message)); w.on('dialog', d => d.accept()); await w.waitForSelector('#side');
  const A = lot('fa', 'R-A', {exp: {...EXP1}, pc: PC.map((p, i) => ({...p, gioCan1: '08:1' + i + ':00', gioCan2: '09:4' + i + ':00', can1: 6840 + i, can2: 4000, klKg: p.kl * 1000, khachHang: 'NGUYỄN VĂN AN', donGia: 1250000, thanhTien: Math.round(p.kl * 1250000)})), kl: 29.75});
  A.info.muaHang = {...A.info.muaHang, lat: 15.5, lng: 108.4}; A.info.cuLy = null;
  const B = lot('fb', 'R-B', {exp: {}, pc: []}); B.info.lat = null; B.info.lng = null;
  const data = seed([A, B]); data.congTy = {c1: {id: 'c1', ten: 'CÔNG TY TNHH DĂM AN PHÁT', mst: '0401234567', diaChi: 'KCN Điện Nam', lat: 15.5, lng: 108.2, nguoiDaiDien: 'Nguyễn Văn A', chucVu: 'Giám đốc', sdt: '0905000001', diaChiGiao: [], ghiChu: ''}};
  await w.evaluate(d => window.hak.save(d), data); await w.reload(); await w.waitForSelector('#side');
  const shots = process.env.SHOTS; if (shots) fs.mkdirSync(shots, {recursive: true});
  const seen = []; let n = 0;
  const check = async (name, selector) => {
    await w.waitForTimeout(350); const text = await w.innerText(selector || 'body'); seen.push(name);
    const hits = BAD.map(([re, label]) => { const m = re.exec(text); return m ? label + ' “' + text.slice(Math.max(0, m.index - 25), m.index + 35).replace(/\s+/g, ' ') + '”' : ''; }).filter(Boolean);
    ok('[' + name + '] không có chữ lỗi hoặc sai định dạng', hits.length === 0, hits.join(' ‖ '));
    for (const width of [1366, 1024]) {
      await w.setViewportSize({width, height: 900}); await w.waitForTimeout(150);
      const over = await w.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      ok('[' + name + '] không tràn ngang ở ' + width + ' px', over <= 2, 'tràn ' + over + ' px');
    }
    await w.setViewportSize({width: 1366, height: 900}); await w.waitForTimeout(100);
    const cut = await w.evaluate(() => [...document.querySelectorAll('#main [data-act=stEdit], #main [data-act=stDel]')].filter(b => b.getBoundingClientRect().right > window.innerWidth + 1).length);
    ok('[' + name + '] nút Sửa, Xóa của bảng dữ liệu nằm trong tầm nhìn ở 1366 px (không phải cuộn ngang mới thấy)', cut === 0, cut + ' nút bị đẩy ra ngoài');
    if (shots) { await w.screenshot({path: path.join(shots, String(++n).padStart(2, '0') + '_' + name.replace(/[^a-z0-9]+/gi, '_') + '.png'), fullPage: true}); }
  };
  await w.setViewportSize({width: 1366, height: 900});
  await w.click('#navHome'); await check('Tổng quan');
  await w.click('[data-open=own1]'); await check('Chủ rừng');
  await w.click('[data-tab=rung]'); await check('Các rừng');
  await w.click('[data-forest=fa]');
  for (const [k, label] of [['finfo', 'Thông tin rừng'], ['nc', 'Nhân công'], ['dx', 'Vận chuyển và phiếu cân']]) { await w.click('[data-ftab=' + k + ']'); await check(label + ' (R-A)'); if (k === 'finfo') ok('ô số thập phân ở Thông tin rừng hiện kiểu Việt Nam (dấu phẩy): khối lượng 29,75; tọa độ giữ dấu chấm', (await w.inputValue('#forestForm [name=khoiLuong]')) === '29,75' && (await w.inputValue('#forestForm [name=lat]')) === '15.6'); }
  await w.click('[data-ftab=xuat]');
  for (const x of await w.$$eval('[data-xtab]', b => b.map(e => e.dataset.xtab))) { await w.click('[data-xtab=' + x + ']'); await check('Xuất hồ sơ · ' + x); }
  await w.click('[data-forest=fb]'); for (const k of ['finfo', 'nc', 'dx', 'xuat']) { await w.click('[data-ftab=' + k + ']'); await check('Rừng trống R-B · ' + k); }
  await w.click('#navHome'); await w.click('[data-act=rpOpen]'); await w.waitForSelector('.rpl'); await check('Báo cáo');
  for (const k of await w.$$eval('[data-rpsel]', b => b.map(e => e.dataset.rpsel))) { await w.$eval('[data-rpsel=' + k + ']', b => b.click()); await check('Báo cáo · ' + k); }
  await w.click('[data-act=rpClose]'); await w.waitForTimeout(300);
  await w.click('header [data-act=lkOpen]', {timeout: 5000}).catch(() => {}); if (await w.$('#lkBox.on')) { await check('Tra cứu Google Sheets', '#lkBox'); await w.click('[data-act=lkClose]'); }
  await w.click('[data-act=openNorm]').catch(() => {}); await check('Định mức');
  await w.click('#navSet'); await check('Cài đặt');
  for (const id of await w.$$eval('[id^=setTab_]', b => b.map(e => e.id))) { await w.click('#' + id); await check('Cài đặt · ' + id.replace('setTab_', '')); }
  ok('đã rà ' + seen.length + ' màn hình', seen.length >= 25, seen.join(', '));
  ok('không có lỗi JavaScript', errs.length === 0, errs.join('|'));
  await app.close(); console.log(fail ? 'CÓ ' + fail + ' LỖI' : 'TẤT CẢ ĐẠT'); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
