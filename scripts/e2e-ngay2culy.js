'use strict';
/* Ngày cân 2 suy ra từ ngày cân 1 và giờ cân; cự ly vận chuyển tự tính từ tọa độ rừng đến tọa độ nơi giao (Electron thật, SQLite thật, dữ liệu giả lập).
 * Chạy: xvfb-run -a node scripts/e2e-ngay2culy.js */
const {_electron: electron} = require('playwright-core');
const path = require('path'), fs = require('fs'), os = require('os');
const XLSX = require('xlsx');
const root = path.join(__dirname, '..');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hakqn-nc-'));
let fail = 0; const ok = (name, cond, extra) => { console.log((cond ? 'ĐẠT  ' : 'LỖI  ') + name + (!cond && extra ? ' — ' + extra : '')); if (!cond) fail++; };
const xe = (bien, ma) => ({_row: 2, maRung: ma, stt: '1', chuXe: 'CHỦ XE ' + bien, ngaySinh: '01/01/1980', cccd: '049000000077', ngayCap: '01/01/2021', noiCap: 'CA', diaChi: 'Đà Nẵng', bienSo: bien, loaiXe: 'Xe tải', nguoiKy: 'Chủ xe', sdt: '0905123456'});
const P = (stt, so, ngay, g1, g2, extra) => ({_row: stt + 1, maRung: 'R-A', stt: String(stt), ngay, bienSo: '92C-12345', soPhieu: so, kl: 10, gioCan1: g1, gioCan2: g2, noiGiao: 'KCN', ghiChu: '', ...extra});
const C1 = {id: 'c1', ten: 'CÔNG TY TNHH DĂM AN PHÁT', mst: '0401234567', diaChi: 'KCN Điện Nam – Điện Ngọc, Điện Bàn, Quảng Nam', lat: null, lng: null, nguoiDaiDien: 'Nguyễn Văn A', chucVu: 'Giám đốc', sdt: '0905000001', email: 'a@example.com', diaChiGiao: [], ghiChu: ''};
const SEED = {v: 2, congTy: {c1: C1}, rs: {own1: {id: 'own1', info: {ma: 'CR-01', ten: 'NGUYỄN VĂN TEST', ngaySinh: '06/10/1967', cccd: '049067005459', ngayCap: '15/08/2021', noiCap: 'CA', diaChi: 'Đà Nẵng', danhXung: 'Ông'}, nc: [], dx: [], exp: {}, forests: {
  fa: {id: 'fa', info: {maRung: 'R-A', tenRung: 'Rừng A', diaDiem: 'Thôn A', lat: 15.5, lng: 108.0, dienTich: 2, dinhMucTanHa: 80, cuLy: null, tuNgay: '01/10/2026', denNgay: '30/11/2026', donGia: 340000, giayTo: [], vanChuyen: {mode: 'tanKm', donGiaKm: 1000, bac: []}},
    nc: [], dx: [xe('92C-12345', 'R-A')], exp: {}, pc: [
      P(1, 'N1', '05/10/2026', '08:15:00', '09:40:00'),                            // cùng ngày
      P(2, 'N2', '05/10/2026', '23:50:00', '00:20:00'),                            // qua nửa đêm: ngày cân 2 = 06/10
      P(3, 'N3', '31/12/2026', '23:00:00', '01:00:00'),                            // qua năm
      P(4, 'N4', '07/10/2026', '', ''),                                            // thiếu giờ: theo ngày cân 1
      P(5, 'N5', '08/10/2026', '08:00:00', '09:00:00', {ngay2: '09/10/2026'}),     // ngày cân 2 nhập thật (mâu thuẫn: cách hơn 24 giờ)
      P(6, 'N6', '10/10/2026', '23:50:00', '00:20:00', {ngay2: '11/10/2026'})]}}}}};   // nhập thật, đúng
(async () => {
  const app = await electron.launch({executablePath: require('electron'), args: [root, '--no-sandbox'], env: {...process.env, HAKQN_CLOSE: 'discard', HAKQN_DB: path.join(dir, 'n.sqlite'), HAKQN_USERDATA: path.join(dir, 'ud'), ELECTRON_DISABLE_SECURITY_WARNINGS: '1'}});
  const w = await app.firstWindow(); const errs = []; w.on('pageerror', e => errs.push(e.message)); w.on('dialog', d => d.accept()); await w.waitForSelector('#side');
  await w.evaluate(d => window.hak.save(d), SEED); await w.reload(); await w.waitForSelector('#side');
  const db = () => w.evaluate(() => window.hak.loadSync().db);
  const saveStageNow = async () => { await w.evaluate(async () => (window.__stDirty && window.__stDirty().length) ? await window.__stSaveCurrent() : null); await w.waitForTimeout(500); };
  const open = async tab => { await w.click('[data-open=own1]'); await w.click('[data-tab=rung]'); await w.click('[data-forest=fa]'); await w.click('[data-ftab=' + tab + ']'); await w.waitForTimeout(300); };
  const row = so => w.evaluate(s => { const r = [...document.querySelectorAll('#main tr')].find(x => new RegExp('(^|\\s)' + s + '(\\s|$)').test(x.innerText) && x.querySelector('[data-act=stEdit]')); return r ? r.innerText.replace(/\s+/g, ' ') : ''; }, so);

  // ===== 1. ngày cân 2 =====
  await open('dx');
  const hdr = await w.$$eval('#main table thead th', t => t.map(x => x.innerText.trim()));
  ok('bảng phiếu cân có hai cột “Cân lần 1 (ngày, giờ)” và “Cân lần 2 (ngày, giờ)”, đủ ngày cân 2', hdr.includes('Cân lần 1 (ngày, giờ)') && hdr.includes('Cân lần 2 (ngày, giờ)'), hdr.join('|'));
  ok('N1 cùng ngày: ngày cân 2 = 05/10/2026, ghi “suy ra”', /05\/10\/2026 08:15:00 05\/10\/2026 suy ra 09:40:00/.test(await row('N1')), await row('N1'));
  ok('N2 qua nửa đêm (23:50 → 00:20): ngày cân 2 = 06/10/2026 suy ra', /05\/10\/2026 23:50:00 06\/10\/2026 suy ra 00:20:00/.test(await row('N2')), await row('N2'));
  ok('N3 qua năm (31/12 23:00 → 01:00): ngày cân 2 = 01/01/2027 suy ra', /31\/12\/2026 23:00:00 01\/01\/2027 suy ra 01:00:00/.test(await row('N3')), await row('N3'));
  ok('N4 thiếu giờ cân: ngày cân 2 theo ngày cân 1, ghi rõ lý do', /07\/10\/2026 07\/10\/2026 theo ngày cân 1/.test(await row('N4')), await row('N4'));
  ok('N6 có ngày cân 2 nhập thật 11/10/2026: hiện nguyên, không ghi “suy ra”', /10\/10\/2026 23:50:00 11\/10\/2026 00:20:00/.test(await row('N6')) && !/suy ra/.test(await row('N6')), await row('N6'));
  const t = await w.innerText('#main');
  ok('N5 ngày cân 2 nhập thật mâu thuẫn giờ cân (cách hơn 24 giờ): có cảnh báo nêu số phiếu', /Phiếu N5: ngày cân 2 là ngày hôm sau nhưng giờ cân 2 \(09:00:00\) không sớm hơn giờ cân 1 \(08:00:00\)/.test(t), t.slice(0, 200));
  ok('phiếu suy ra (N1–N4, N6) không bị cảnh báo ngày cân 2', !/Phiếu N[1234]: .*ngày cân 2/.test(t) && !/Phiếu N6: .*ngày cân 2/.test(t));
  // sửa phiếu: có ô Ngày cân 2; nhập ngày cân 2 sai định dạng bị báo
  const iN1 = await w.$$eval('#main tr', trs => trs.findIndex(r => /\bN1\b/.test(r.innerText) && r.querySelector('[data-act=stEdit]'))); const trs = await w.$$('#main tr');
  await (await trs[iN1].$('[data-act=stEdit]')).click(); await w.waitForSelector('#stForm');
  ok('hộp thoại Sửa phiếu cân có ô Ngày cân 2 (để trống = tự suy ra)', !!(await w.$('#stForm [name=ngay2]')) && /tự suy ra/.test(await w.innerText('#stForm')));
  await w.fill('#stForm [name=ngay2]', '31/02/2026'); await w.click('#stForm [type=submit]'); await w.waitForTimeout(300);
  ok('ngày cân 2 không có thật (31/02/2026): bị chặn ngay trong hộp thoại, nêu lý do', /ngày cân 2/i.test(await w.innerText('#stForm')) && (await w.$('#stForm')) !== null, (await w.innerText('#stForm')).slice(-300));
  await w.fill('#stForm [name=ngay2]', '06/10/2026'); await w.click('#stForm [type=submit]'); await w.waitForTimeout(300);
  ok('nhập ngày cân 2 thật: hiện đúng và có cảnh báo cách hơn 1 ngày nếu cần (ở đây 06/10 sau 05/10 và giờ 08:15 → 09:40: cách hơn 24 giờ)', /Phiếu N1: ngày cân 2 là ngày hôm sau/.test(await w.innerText('#main')));
  await w.click('[data-act=stDiscard]');
  // Excel không có cột Ngày cân 2: ngày cân 2 được suy ra khi hiển thị
  const wb = XLSX.utils.book_new(), ws = XLSX.utils.aoa_to_sheet([['Số phiếu', 'Ngày cân 1', 'Giờ cân 1', 'Giờ cân 2', 'Biển số 1', 'KL'], ['X1', '20/10/2026', '23:40:00', '00:10:00', '92C-12345', 5000]]); XLSX.utils.book_append_sheet(wb, ws, 'PHIEU_CAN');
  const fx = path.join(dir, 'x.xlsx'); XLSX.writeFile(wb, fx); await w.setInputFiles('input[data-file="pc"]', fx); await w.waitForTimeout(900);
  ok('nạp Excel không có cột Ngày cân 2: phiếu X1 có ngày cân 2 = 21/10/2026 ngay trong bản nháp (cột ngày cân 2 như file Excel)', /20\/10\/2026 23:40:00 21\/10\/2026 00:10:00/.test(await w.evaluate(() => [...document.querySelectorAll('#main tr')].filter(r => /X1/.test(r.innerText)).map(r => r.innerText.replace(/\s+/g, ' ')).join('|'))));
  await saveStageNow();
  const x1 = (await db()).rs.own1.forests.fa.pc.find(p => p.soPhieu === 'X1');
  ok('lưu vào hồ sơ rừng: phiếu X1 có cột ngày cân 2 = 21/10/2026 (lưu trong SQLite, không thêm trường phụ nào); phiếu cũ chưa có ngày cân 2 cũng được ghi khi lưu', !!x1 && x1.ngay2 === '21/10/2026' && !('ngay2Nguon' in x1) && !('_ngay2Suy' in x1) && (await db()).rs.own1.forests.fa.pc.find(p => p.soPhieu === 'N2').ngay2 === '06/10/2026', JSON.stringify(x1));
  ok('ngày cân 2 nhập thật (N6 = 11/10/2026) giữ nguyên sau khi lưu', (await db()).rs.own1.forests.fa.pc.find(p => p.soPhieu === 'N6').ngay2 === '11/10/2026');

  // ===== 2. cự ly tự tính =====
  await w.click('#navSet'); await w.click('#setTab_cty'); await w.waitForSelector('#ctyForm');
  await w.fill('#ctyForm [name=toaDo]', 'abc'); await w.click('#ctyForm button[type=submit]'); await w.waitForTimeout(300);
  ok('tọa độ trụ sở gõ sai dạng: báo lỗi, không lưu', /Tọa độ trụ sở “abc” sai dạng/.test(await w.innerText('#ctyMsg')) && (await db()).congTy.c1.lat == null);
  await w.fill('#ctyForm [name=toaDo]', '30, 108'); await w.click('#ctyForm button[type=submit]'); await w.waitForTimeout(300);
  ok('tọa độ ngoài Việt Nam (30, 108): vẫn lưu được nhưng có cảnh báo kiểm tra đảo vĩ độ/kinh độ', /ngoài Việt Nam/.test(await w.innerText('#main')) && (await db()).congTy.c1.lat === 30);
  await w.click('#setTab_cty'); await w.waitForSelector('#ctyForm');
  await w.click('[data-act=ctyAddAddr]'); await w.fill('#ctyAddrs .ctyAddr:last-child [name=a_nhan]', 'Cảng Kỳ Hà'); await w.fill('#ctyAddrs .ctyAddr:last-child [name=a_dia]', 'Cảng dăm Kỳ Hà, Núi Thành, Quảng Nam'); await w.fill('#ctyAddrs .ctyAddr:last-child [name=a_toado]', '15,5 ; 108,4');
  await w.fill('#ctyForm [name=toaDo]', '15.5, 108.2'); await w.click('#ctyForm button[type=submit]'); await w.waitForTimeout(400);
  let d = await db(); const a1 = d.congTy.c1.diaChiGiao[0];
  ok('lưu tọa độ trụ sở (15.5, 108.2) và địa chỉ giao Kỳ Hà (15,5 ; 108,4 → 15.5, 108.4)', d.congTy.c1.lat === 15.5 && d.congTy.c1.lng === 108.2 && a1.lat === 15.5 && a1.lng === 108.4, JSON.stringify([d.congTy.c1.lat, d.congTy.c1.lng, a1]));
  // rừng: chưa chọn nơi giao → chưa có cự ly
  await open('finfo'); let note = await w.innerText('#cuLyNote');
  ok('rừng chưa chọn nơi giao: ghi chú cự ly nêu thiếu tọa độ nơi giao; cước tấn/km chưa tính được', /Chưa có cự ly/.test(note) && /tọa độ nơi giao/.test(note), note);
  await w.click('[data-ftab=dx]'); await w.click('[data-act=mhOpen]'); await w.selectOption('#mhAddr', a1.id); await w.click('[data-act=mhConfirm]'); await w.waitForTimeout(400);
  const km = Math.round(((a, b, c, e) => { const R = 6371.0088, r = x => x * Math.PI / 180, dl = r(c - a), dg = r(e - b), h = Math.sin(dl / 2) ** 2 + Math.cos(r(a)) * Math.cos(r(c)) * Math.sin(dg / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(h)); })(15.5, 108.0, 15.5, 108.4) * 10) / 10, kmTxt = String(km).replace('.', ',');
  const vcText = await w.innerText('#main');
  ok('chọn nơi giao Kỳ Hà: cự ly tự tính ' + kmTxt + ' km (tay tính haversine); tab Vận chuyển ghi “tự tính, đường chim bay”', new RegExp('Cự ly vận chuyển: ' + kmTxt + ' km \\(tự tính, đường chim bay\\)').test(vcText), vcText.slice(vcText.indexOf('Cự ly'), vcText.indexOf('Cự ly') + 160));
  await open('finfo'); note = await w.innerText('#cuLyNote');
  ok('Thông tin rừng: ghi chú “Đang dùng cự ly tự tính ' + kmTxt + ' km”, nhắc đường chim bay và cách nhập số thực tế; ô cự ly trống có gợi ý', new RegExp('tự tính ' + kmTxt + ' km').test(note) && /đường chim bay/.test(note) && (await w.getAttribute('#forestForm [name=cuLy]', 'placeholder')).includes('tự tính ' + kmTxt) && (await w.inputValue('#forestForm [name=cuLy]')) === '', note);
  // cước tấn/km dùng cự ly tự tính: thành tiền theo bảng tay
  const cuoc = Math.round(1000 * km);
  await w.click('[data-ftab=dx]'); const dxText = await w.innerText('#main');
  ok('cước tấn/km: 1.000 đồng/tấn/km × ' + kmTxt + ' km = ' + cuoc.toLocaleString('vi-VN') + ' đồng/tấn (cự ly tự tính được dùng để tính)', dxText.replace(/\./g, '').includes(String(cuoc)) || dxText.includes(cuoc.toLocaleString('vi-VN')), dxText.slice(dxText.indexOf('tấn/km') - 100, dxText.indexOf('tấn/km') + 200));
  // nhập tay ưu tiên
  await open('finfo'); await w.fill('#forestForm [name=cuLy]', '60'); await w.click('#forestForm button[type=submit]'); await w.waitForTimeout(400); await open('finfo');
  note = await w.innerText('#cuLyNote');
  ok('nhập tay 60 km: ưu tiên số nhập tay, vẫn nêu số tự tính để so sánh, lưu vào hồ sơ', /nhập tay 60 km/.test(note) && new RegExp('Tự tính từ tọa độ: ' + kmTxt + ' km').test(note) && (await db()).rs.own1.forests.fa.info.cuLy === 60, note);
  await w.click('[data-ftab=dx]'); ok('tab Vận chuyển: cự ly 60 km (nhập tay), cước = 1.000 × 60 = 60.000', /Cự ly vận chuyển: 60 km \(nhập tay\)/.test(await w.innerText('#main')) && /60\.000 đồng\/tấn/.test(await w.innerText('#main')));
  // xóa số nhập tay: trở về tự tính
  await open('finfo'); await w.fill('#forestForm [name=cuLy]', ''); await w.click('#forestForm button[type=submit]'); await w.waitForTimeout(400); await open('finfo');
  ok('xóa ô cự ly: quay về tự tính ' + kmTxt + ' km, hồ sơ lưu cự ly trống', new RegExp('tự tính ' + kmTxt + ' km').test(await w.innerText('#cuLyNote')) && (await db()).rs.own1.forests.fa.info.cuLy == null);
  // đổi tọa độ rừng: cự ly tự cập nhật
  await w.fill('#forestForm [name=lat]', '15.5'); await w.fill('#forestForm [name=lng]', '108.1'); await w.click('#forestForm button[type=submit]'); await w.waitForTimeout(400); await open('finfo');
  const n2 = await w.innerText('#cuLyNote'); const m2 = /tự tính ([\d,]+) km/.exec(n2);
  ok('cự ly mới ≈ ' + (Math.round(km * 3 / 4 * 10) / 10) + ' km (0,3 độ kinh độ so với 0,4)', !!m2 && Math.abs(parseFloat(m2[1].replace(',', '.')) - km * 3 / 4) < 0.3, n2);
  // đóng và mở lại: dữ liệu và tọa độ còn
  await new Promise(r => setTimeout(r, 600));
  ok('tọa độ nơi giao nằm trong bản chụp công ty của rừng (lưu trong SQLite)', (await db()).rs.own1.forests.fa.info.muaHang.lat === 15.5 && (await db()).rs.own1.forests.fa.info.muaHang.lng === 108.4);
  ok('không có lỗi JavaScript', errs.length === 0, errs.join('|'));
  await app.close(); console.log(fail ? 'CÓ ' + fail + ' LỖI' : 'TẤT CẢ ĐẠT'); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
