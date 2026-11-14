'use strict';
/* Thông tin chủ rừng: bỏ ngày sinh, thêm số hợp đồng và ngày ký hợp đồng; cự ly nhập ngay ở tab Vận chuyển khi tính tấn/km (Electron thật, dữ liệu giả lập).
 * Chạy: xvfb-run -a node scripts/e2e-hopdongso.js */
const {_electron: electron} = require('playwright-core');
const path = require('path'), fs = require('fs'), os = require('os');
const JSZip = require('jszip');
const root = path.join(__dirname, '..');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hakqn-hds-')), out = path.join(dir, 'out');
let fail = 0; const ok = (name, cond, extra) => { console.log((cond ? 'ĐẠT  ' : 'LỖI  ') + name + (!cond && extra ? ' — ' + extra : '')); if (!cond) fail++; };
const nv = (stt, vai, ten, cd, cccd) => ({_row: stt + 1, maRung: 'R-A', vaiTro: vai, stt: String(stt), danhXung: 'Ông', ten, ngaySinh: '01/01/1985', cccd, ngayCap: '01/01/2021', noiCap: 'CA', diaChi: 'Đà Nẵng', chucDanh: cd});
const SEED = {v: 2, rs: {own1: {id: 'own1', info: {ma: 'CR-01', ten: 'NGUYỄN VĂN MỘT', cccd: '049067005459', ngayCap: '15/08/2021', noiCap: 'CA', diaChi: 'Đà Nẵng', danhXung: 'Ông', ngaySinh: '06/10/1967'}, nc: [], dx: [], exp: {}, forests: {
  fa: {id: 'fa', info: {hinhThucLuong: 'sanluong', moHinhKy: 'giaokhoan', donGiaTan: {'Tổ trưởng': 420000, 'Công nhân khai thác': 330000, 'Công nhân cưa': 380000}, khoiLuong: 21.75, maRung: 'R-A', tenRung: 'Lô A', diaDiem: 'Thôn A', lat: 15.6, lng: 108.1, dienTich: 2, dinhMucTanHa: 80, cuLy: 45, tuNgay: '01/10/2026', denNgay: '30/11/2026', donGia: 340000, giayTo: [], vanChuyen: {mode: 'tanKm', donGiaKm: 1000, coDinh: null, bac: []}},
    nc: [nv(1, 'Tổ trưởng', 'TRẦN TỔ TRƯỞNG', 'Tổ trưởng', '049085000001'), nv(2, 'Công nhân', 'LÊ CÔNG NHÂN', 'Công nhân khai thác', '049085000002'), nv(3, 'Công nhân', 'PHẠM CƯA', 'Công nhân cưa', '049085000003')], dx: [], pc: [], exp: {}}}}}};
async function docText(file) { const z = await JSZip.loadAsync(fs.readFileSync(file)); let all = ''; const docs = file.endsWith('.zip') ? await Promise.all(Object.keys(z.files).filter(n => n.endsWith('.docx')).map(async n => JSZip.loadAsync(await z.file(n).async('nodebuffer')))) : [z]; for (const d of docs) { const x = await d.file('word/document.xml').async('string'); all += (x.match(/<w:t[^>]*>([^<]*)<\/w:t>/g) || []).map(a => a.replace(/<[^>]+>/g, '')).join('') + '\n'; } return all.replace(/&amp;/g, '&'); }
(async () => {
  const app = await electron.launch({executablePath: require('electron'), args: [root, '--no-sandbox'], env: {...process.env, HAKQN_CLOSE: 'discard', HAKQN_DB: path.join(dir, 'h.sqlite'), HAKQN_USERDATA: path.join(dir, 'ud'), HAKQN_DOWNLOAD_DIR: out, ELECTRON_DISABLE_SECURITY_WARNINGS: '1'}});
  const w = await app.firstWindow(); const errs = []; w.on('pageerror', e => errs.push(e.message)); w.on('dialog', d => d.accept()); await w.waitForSelector('#side');
  await w.evaluate(d => window.hak.save(d), SEED); await w.reload(); await w.waitForSelector('#side');
  const dbOf = () => w.evaluate(() => window.hak.loadSync().db.rs.own1);
  await w.click('[data-open=own1]');
  ok('thông tin chủ rừng: không còn ô Ngày sinh', !(await w.$('#infoForm [name=ngaySinh]')) && !/Ngày sinh/.test(await w.innerText('#infoForm')));
  ok('thông tin chủ rừng: có ô Số hợp đồng và Ngày ký hợp đồng', !!(await w.$('#infoForm [name=soHopDong]')) && !!(await w.$('#infoForm [name=ngayKyHopDong]')));
  ok('thông tin chủ rừng: có ô Số điện thoại', !!(await w.$('#infoForm [name=sdt]')));
  await w.fill('#infoForm [name=sdt]', 'abc'); await w.click('#infoForm button[type=submit]'); await w.waitForTimeout(300);
  ok('số điện thoại sai dạng bị từ chối, nêu lý do', /Số điện thoại/.test(await w.innerText('#infoForm')), await w.innerText('#infoForm'));
  await w.fill('#infoForm [name=sdt]', '0905 123 456');
  await w.fill('#infoForm [name=soHopDong]', 'HD-2026/015'); await w.fill('#infoForm [name=ngayKyHopDong]', '31/02/2026'); await w.click('#infoForm button[type=submit]'); await w.waitForTimeout(300);
  ok('ngày ký hợp đồng không có thật (31/02/2026) bị từ chối, nêu lý do', /Ngày ký hợp đồng/.test(await w.innerText('#infoForm')) && !(await dbOf()).info.soHopDong, await w.innerText('#infoForm'));
  await w.fill('#infoForm [name=ngayKyHopDong]', '02/10/2026'); await w.click('#infoForm button[type=submit]'); await w.waitForTimeout(600);
  const o = await dbOf(); ok('lưu số hợp đồng và ngày ký; chủ rừng không cần ngày sinh để hợp lệ', o.info.soHopDong === 'HD-2026/015' && o.info.ngayKyHopDong === '02/10/2026' && o.info.sdt === '0905 123 456');
  ok('hồ sơ cũ: ngày sinh đã lưu không bị xóa khỏi dữ liệu', o.info.ngaySinh === '06/10/1967');
  // chủ rừng mới: lưu được mà không có ngày sinh
  await w.click('text=+ Chủ rừng mới'); await w.fill('#infoForm [name=ma]', 'CR-02'); await w.selectOption('#infoForm [name=danhXung]', 'Bà'); await w.fill('#infoForm [name=ten]', 'TRẦN THỊ HAI'); await w.fill('#infoForm [name=cccd]', '049067005460'); await w.fill('#infoForm [name=ngayCap]', '01/01/2021'); await w.fill('#infoForm [name=noiCap]', 'CA'); await w.fill('#infoForm [name=diaChi]', 'Đà Nẵng'); await w.click('#infoForm button[type=submit]'); await w.waitForTimeout(500);
  ok('chủ rừng mới lưu được khi không có ngày sinh, số hợp đồng và ngày ký (tùy chọn)', !/Chưa lưu/.test(await w.innerText('#infoForm')) && Object.keys((await w.evaluate(() => window.hak.loadSync().db.rs))).length === 2);
  // biểu mẫu
  await w.click('[data-open=own1]'); await w.click('[data-tab=rung]'); await w.click('[data-forest=fa]'); await w.click('[data-ftab=xuat]'); await w.click('[data-xtab=all]');
  for (const f of fs.existsSync(out) ? fs.readdirSync(out) : []) fs.unlinkSync(path.join(out, f));
  await w.click('button[data-act=dl][data-kind=gk]'); let file = null; for (let i = 0; i < 80 && !file; i++) { file = fs.existsSync(out) && fs.readdirSync(out).find(x => /\.(zip|docx)$/.test(x)); if (!file) await w.waitForTimeout(100); } await w.waitForTimeout(300);
  const t = await docText(path.join(out, file));
  ok('BM-01: ghi “Căn cứ Hợp đồng số HD-2026/015 ký ngày 02/10/2026”', t.includes('Căn cứ Hợp đồng số HD-2026/015 ký ngày 02/10/2026'), t.slice(0, 600));
  ok('BM-01: khối bên chủ rừng in số điện thoại', t.includes('Điện thoại: 0905 123 456'));
  ok('BM-01: ngày ký mặc định lấy từ ngày ký hợp đồng của chủ rừng', t.includes('ngày 02/10/2026'));
  ok('BM-01: bên A (chủ rừng) không còn dòng “Sinh năm”', !/BÊN CHỦ RỪNG \(BÊN A\)[^\n]{0,80}Sinh năm/.test(t) && !t.includes('06/10/1967'));
  // sản lượng dự kiến tự nhảy ngay khi gõ diện tích và định mức (chưa cần bấm Lưu)
  await w.click('[data-ftab=finfo]'); await w.fill('#forestForm [name=dienTich]', '13.0076'); await w.fill('#forestForm [name=dinhMucTanHa]', '120');
  ok('sản lượng dự kiến tự tính ngay khi gõ: 13.0076 ha × 120 = 1.561 tấn', (await w.inputValue('#slDuKien')) === '1.561 tấn', await w.inputValue('#slDuKien'));
  await w.fill('#forestForm [name=dienTich]', '2'); await w.fill('#forestForm [name=dinhMucTanHa]', '80'); await w.click('#forestForm button[type=submit]'); await w.waitForTimeout(400);
  // cự ly ngay ở tab Vận chuyển
  await w.click('[data-ftab=dx]');
  ok('tab Vận chuyển (tấn/km): KHÔNG có ô nhập cự ly thứ hai, chỉ hiện lại số km đang có (nhập ở Thông tin rừng)', !(await w.$('#vcForm [name=vcCuLy]')) && /Cự ly vận chuyển: 45 km/.test(await w.innerText('#vcForm')), await w.innerText('#vcForm'));
  await w.click('#vcForm [data-act=ktGo]'); ok('nút trong tab Vận chuyển mở tab Thông tin rừng có ô cự ly', await w.isVisible('#forestForm [name=cuLy]'));
  await w.fill('#forestForm [name=cuLy]', '60'); await w.click('#forestForm button[type=submit]'); await w.waitForTimeout(500);
  await w.click('[data-ftab=dx]'); ok('đổi cự ly ở Thông tin rừng: tab Vận chuyển tính lại 60.000 đồng/tấn', /60\.000 đồng\/tấn \(1\.000 đồng\/tấn\/km × 60 km\)/.test(await w.innerText('#vcForm')) && /Cự ly vận chuyển: 60 km/.test(await w.innerText('#vcForm')) && (await dbOf()).forests.fa.info.cuLy === 60, (await w.innerText('#vcForm')).slice(-220));
  await w.click('[data-ftab=dx]'); await w.selectOption('#vcForm [name=vcMode]', 'coDinh');
  ok('cước cố định: dòng cự ly ở tab Vận chuyển ẩn (không cần)', !(await w.isVisible('#vcForm [data-vcgrp=tanKm]')));
  ok('không lỗi script giao diện', errs.length === 0, errs.join('|'));
  await app.close();
  console.log(fail ? '\n' + fail + ' LỖI' : '\nĐẠT HẾT'); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
