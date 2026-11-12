'use strict';
/* Kiểm thử xuất biểu mẫu Word BM-01..BM-19 và ZIP trong Electron thật (xvfb-run node scripts/e2e-export.js) */
const {_electron: electron} = require('playwright-core');
const path = require('path'), fs = require('fs'), os = require('os');
const JSZip = require('jszip');
const root = path.join(__dirname, '..'), FIX = path.join(root, 'tests', 'fixtures');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hakqn-ex-')), out = process.env.OUT || path.join(dir, 'out');
let fail = 0; const ok = (n, c) => { console.log((c ? 'ĐẠT  ' : 'LỖI  ') + n); if (!c) fail++; };
(async () => {
  const app = await electron.launch({executablePath: require('electron'), args: [root, '--no-sandbox'], env: {...process.env, HAKQN_DB: path.join(dir, 'ex.sqlite'), HAKQN_DOWNLOAD_DIR: out}});
  const w = await app.firstWindow(); const errs = []; w.on('pageerror', e => errs.push(e.message)); w.on('dialog', d => d.accept());
  await w.waitForSelector('#side');
  await w.click('text=+ Chủ rừng mới');
  for (const [k, v] of Object.entries({ma: 'CR-001', ten: 'NGUYỄN PHƯỚC TÁM', soHopDong: 'HD-001', ngayKyHopDong: '01/10/2026', cccd: '049067005459', ngayCap: '15/08/2021', noiCap: 'CA', diaChi: 'Đà Nẵng'})) await w.fill(`#infoForm [name="${k}"]`, v);
  await w.selectOption('#infoForm [name="danhXung"]', 'Ông'); await w.click('#infoForm button[type=submit]');
  await w.click('[data-tab=rung]'); await w.click('text=+ Rừng mới');
  await w.fill('#forestForm [name=diaDiem]', 'Thôn Hòa Phú, Xã Xuân Phú, Tp Đà Nẵng'); await w.fill('#forestForm [name=cuLy]', '45');
  await w.fill('#forestForm [name=lat]', '15.9'); await w.fill('#forestForm [name=lng]', '108.1'); await w.fill('#forestForm [name=dienTich]', '2,5'); await w.fill('#forestForm [name=dinhMucTanHa]', '80');
  await w.fill('#forestForm [name=tuNgay]', '01/10/2026'); await w.fill('#forestForm [name=denNgay]', '30/11/2026');
  await w.click('#forestForm button[type=submit]');
  await w.click('[data-ftab=dx]'); await w.fill('#vcForm [name=vcKm]', '1000'); await w.click('#vcForm button[type=submit]');
  await w.click('[data-ftab=nc]'); await w.fill('#luongForm [name=dt_0]', '340000'); await w.fill('#luongForm [name=dt_1]', '200000'); await w.fill('#luongForm [name=dt_2]', '250000'); await w.click('#luongForm button[type=submit]'); await w.waitForTimeout(150);
  await w.setInputFiles('input[data-file="nc"]', path.join(FIX, 'test_nhancong.xlsx')); await w.waitForTimeout(400);
  await w.click('[data-ftab=dx]'); await w.setInputFiles('input[data-file="dx"]', path.join(FIX, 'test_doixe.xlsx')); await w.waitForTimeout(400);
  await w.setInputFiles('input[data-file="pc"]', path.join(FIX, 'test_phieucan.xlsx')); await w.waitForTimeout(400);
  await w.click('[data-ftab=xuat]'); await w.click('[data-xtab=all]');
  for (const [k, v] of [['soKT', '07'], ['soVC', '09'], ['ngayKy', '01/10/2026']]) { if (await w.$(`[data-exp=${k}]`)) { await w.fill(`[data-exp=${k}]`, v); await w.dispatchEvent(`[data-exp=${k}]`, 'change'); } }
  const btns = await w.$$('button[data-act=dl]'); let done = 0; const disabled = [];
  for (const b of btns) {
    const kind = await b.getAttribute('data-kind');
    if (await b.isDisabled()) { disabled.push(kind); continue; }
    const before = fs.existsSync(out) ? fs.readdirSync(out).length : 0;
    await b.click();
    for (let i = 0; i < 50 && (fs.existsSync(out) ? fs.readdirSync(out).length : 0) <= before; i++) await w.waitForTimeout(100);
    done++;
  }
  await w.waitForTimeout(800);
  const files = fs.readdirSync(out);
  const docx = files.filter(f => f.endsWith('.docx')), zips = files.filter(f => f.endsWith('.zip'));
  console.log('Nút tải: ' + btns.length + ', đã bấm ' + done + ', bị khóa: ' + (disabled.join(', ') || 'không'));
  console.log('File: ' + files.length + ' (' + docx.length + ' .docx, ' + zips.length + ' .zip)');
  // Kiểm tra từng .docx mở được và có mã biểu mẫu ở chân trang
  const codes = new Set(); let bad = 0;
  for (const f of docx) {
    try { const z = await JSZip.loadAsync(fs.readFileSync(path.join(out, f))); const doc = await z.file('word/document.xml').async('string');
      const foot = Object.keys(z.files).filter(n => /word\/footer\d*\.xml/.test(n)); let ft = ''; for (const n of foot) ft += await z.file(n).async('string');
      (ft + doc).replace(/BM-(\d\d)/g, (m, d) => codes.add('BM-' + d)); if (!/Tiếng|CỘNG HÒA|Bên|BIÊN BẢN|HỢP ĐỒNG|BẢNG|SỔ|DANH SÁCH|PHIẾU|NHẬT KÝ|CAM KẾT|SỔ/.test(doc)) bad++; }
    catch (e) { bad++; }
  }
  // Gói ZIP toàn bộ hồ sơ: kiểm tra mã biểu mẫu của từng file bên trong (các nút tải lẻ cùng tên người có thể ghi đè nhau trong thư mục kiểm thử)
  const allZip = zips.find(f => /_all\.zip$/.test(f));
  if (allZip) {
    const z = await JSZip.loadAsync(fs.readFileSync(path.join(out, allZip)));
    for (const n of Object.keys(z.files).filter(n => n.endsWith('.docx'))) {
      const dz = await JSZip.loadAsync(await z.file(n).async('nodebuffer'));
      let t = ''; for (const m of Object.keys(dz.files).filter(m => /word\/(document|footer\d*)\.xml/.test(m))) t += await dz.file(m).async('string');
      t.replace(/BM-(\d\d)/g, (m, d) => codes.add('BM-' + d));
    }
  }
  // Hồ sơ này là hình thức GIAO KHOÁN: không có BM-03 (hợp đồng lao động từng người, chỉ dùng khi chủ rừng ký trực tiếp) mà có BM-20 (Giấy ủy quyền).
  // BM-03 ở hình thức trực tiếp được kiểm tra riêng trong scripts/e2e-hopdong.js.
  const want = [...Array.from({length: 19}, (_, i) => 'BM-' + String(i + 1).padStart(2, '0')).filter(c => c !== 'BM-03'), 'BM-20'];
  const miss = want.filter(c => !codes.has(c));
  ok('mọi file .docx mở được, có nội dung tiếng Việt', bad === 0 && docx.length > 0);
  ok('xuất đủ BM-01 đến BM-20 (giao khoán: có BM-20 Giấy ủy quyền, không có BM-03)' + (miss.length ? ' (thiếu ' + miss.join(', ') + ')' : ''), miss.length === 0);
  if (allZip) { const z = await JSZip.loadAsync(fs.readFileSync(path.join(out, allZip))); ok('gói ZIP toàn bộ hồ sơ mở được (' + Object.keys(z.files).filter(n => n.endsWith('.docx')).length + ' file .docx)', Object.keys(z.files).some(n => n.endsWith('.docx'))); }
  else ok('có gói ZIP toàn bộ hồ sơ', false);
  ok('không có lỗi JavaScript', errs.length === 0); if (errs.length) console.log(errs);
  await app.close();
  console.log('Thư mục kết quả: ' + out);
  console.log(fail ? 'CÓ ' + fail + ' LỖI' : 'TẤT CẢ ĐẠT'); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
