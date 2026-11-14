'use strict';
/* Phiếu cân in bằng NGUYÊN BẢN công cụ PhieuCan: dòng “Giờ cân vào / Giờ cân ra” in NGÀY + GIỜ như bản gốc; ngày cân 2 lấy theo ngày cân 2 nhập thật,
 * hoặc suy ra từ ngày cân 1 và giờ cân (cân qua nửa đêm thì sang ngày hôm sau). Chạy: xvfb-run -a node scripts/e2e-pcgio.js */
const {_electron: electron} = require('playwright-core');
const path = require('path'), fs = require('fs'), os = require('os');
const src = fs.readFileSync(path.join(__dirname, 'e2e-inan2.js'), 'utf8');
const {lot, seed} = new Function(src.slice(src.indexOf('const nv ='), src.indexOf('const plain =')) + '; return {lot, seed};')();
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hakqn-pp-'));
const P = (stt, so, ngay, g1, g2, extra) => ({_row: stt + 1, maRung: 'R-A', stt: String(stt), ngay, gioCan1: g1, gioCan2: g2, bienSo: '92C-12345', soPhieu: so, can1: 40400, can2: 15000, klKg: 25400, kl: 25.4, khachHang: 'NGUYỄN VĂN AN', donGia: 1250000, thanhTien: 31750000, noiGiao: 'KCN', ghiChu: '', ...extra});
(async () => {
  const app = await electron.launch({executablePath: require('electron'), args: [path.join(__dirname, '..'), '--no-sandbox'], env: {...process.env, HAKQN_CLOSE: 'discard', HAKQN_DB: path.join(dir, 'p.sqlite'), HAKQN_USERDATA: path.join(dir, 'ud')}});
  const w = await app.firstWindow(); w.on('dialog', d => d.accept()); await w.waitForSelector('#side');
  const L = lot('fa', 'R-A', {exp: {}, pc: [P(1, 'Q1', '05/10/2026', '08:15:00', '09:40:00'), P(2, 'Q2', '05/10/2026', '23:50:00', '00:20:00'), P(3, 'Q3', '07/10/2026', '', ''), P(4, 'Q4', '10/10/2026', '23:50:00', '00:20:00', {ngay2: '11/10/2026'})]});
  const D = seed([L]); D.congTy = {c1: {id: 'c1', ten: 'CÔNG TY MẪU', mst: '', diaChi: 'KCN', nguoiDaiDien: '', chucVu: '', sdt: '', fax: '', noiLap: 'Điện Bàn', email: '', diaChiGiao: [], ghiChu: ''}};
  await w.evaluate(d => window.hak.save(d), D); await w.reload(); await w.waitForSelector('#side');
  await w.click('[data-open=own1]'); await w.click('[data-tab=rung]'); await w.click('[data-forest=fa]'); await w.click('[data-ftab=xuat]');
  const [pw] = await Promise.all([app.waitForEvent('window'), w.$eval('#pcPrintCard [data-act=pcPrint]', b => b.click())]); await pw.waitForLoadState('domcontentloaded');
  await pw.waitForFunction(() => document.querySelectorAll('#tb tr.row').length === 4, null, {timeout: 15000});
  const txt = await pw.$eval('#render', r => r.innerText);
  const lines = (await pw.$$eval('#render .sheet', sh => sh.map(x => [...x.querySelectorAll('div,p')].map(e => e.textContent.replace(/\s+/g, ' ').trim()).filter(t => /^(Số phiếu|Giờ cân vào|Giờ cân ra|Trọng lượng xe)/.test(t) && t.length < 120)))).flat();
  let fail = 0; const ok = (name, cond, extra) => { console.log((cond ? 'ĐẠT  ' : 'LỖI  ') + name + (!cond && extra ? ' — ' + extra : '')); if (!cond) fail++; };
  const has = re => lines.some(l => re.test(l));
  ok('Q1 cùng ngày: Giờ cân vào 05/10/2026 08:15:00, Giờ cân ra 05/10/2026 09:40:00 (có ngày, đúng mẫu gốc; khối lượng 40.400 kg và 15.000 kg)', has(/40\.400kgGiờ cân vào: 05\/10\/2026 08:15:00/) && has(/15\.000kgGiờ cân ra: 05\/10\/2026 09:40:00/), lines.join(' | '));
  ok('Q2 qua nửa đêm (23:50 → 00:20): Giờ cân ra mang ngày hôm sau 06/10/2026 00:20:00', has(/Giờ cân vào: 05\/10\/2026 23:50:00/) && has(/Giờ cân ra: 06\/10\/2026 00:20:00/), lines.join(' | '));
  ok('Q3 thiếu giờ: chỉ in ngày (ngày cân 1 cho cả hai dòng), không in giờ trống lạ', has(/Giờ cân vào: 07\/10\/2026$/) && has(/Giờ cân ra: 07\/10\/2026$/), lines.join(' | '));
  ok('Q4 có ngày cân 2 nhập thật 11/10/2026: in đúng ngày đã nhập', has(/Giờ cân vào: 10\/10\/2026 23:50:00/) && has(/Giờ cân ra: 11\/10\/2026 00:20:00/), lines.join(' | '));
  const cuc = await pw.$$eval('#render .sheet', sh => sh.map(x => /Giờ cân vào[^]*Giờ cân ra/.test(x.textContent)).every(Boolean));
  ok('mọi tờ đều có đủ hai dòng Giờ cân vào và Giờ cân ra (bố cục công cụ gốc không đổi)', cuc);
  await app.close(); console.log(fail ? 'CÓ ' + fail + ' LỖI' : 'TẤT CẢ ĐẠT'); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
