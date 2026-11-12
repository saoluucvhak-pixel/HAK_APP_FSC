'use strict';
/* Đơn giá vận chuyển: duy trì đúng HAI cách tính (Electron thật, dữ liệu giả lập):
 *  1. Cố định: một đơn giá đồng/tấn, không phụ thuộc cự ly.
 *  2. Tấn/km: đơn giá đồng/tấn/km × cự ly của rừng.
 * Kiểm tra số liệu trong hợp đồng vận chuyển (BM-04) và bảng thanh toán tiền vận chuyển (BM-10), kiểm tra dữ liệu nhập, và hồ sơ cũ còn chọn “theo bậc cự ly”. */
const {_electron: electron} = require('playwright-core');
const path = require('path'), fs = require('fs'), os = require('os');
const JSZip = require('jszip'), XLSX = require('xlsx');
const root = path.join(__dirname, '..'), FIX = path.join(root, 'tests', 'fixtures');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hakqn-vc-')), out = path.join(dir, 'out');
let fail = 0; const ok = (name, cond, extra) => { console.log((cond ? 'ĐẠT  ' : 'LỖI  ') + name + (!cond && extra ? ' — ' + extra : '')); if (!cond) fail++; };
const fmt = n => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
const OWNER = {ma: 'CR-001', ten: 'NGUYỄN PHƯỚC TÁM', ngaySinh: '06/10/1967', cccd: '049067005459', ngayCap: '15/08/2021', noiCap: 'CA', diaChi: 'Đà Nẵng'};

// Khối lượng (kg) theo biển số từ file phiếu cân thử, để tính tiền vận chuyển kỳ vọng độc lập với ứng dụng
const pcSheet = XLSX.readFile(path.join(FIX, 'test_phieucan.xlsx')); const pcRows = XLSX.utils.sheet_to_json(pcSheet.Sheets[pcSheet.SheetNames[0]], {header: 1});
const H = pcRows[0], bi = H.indexOf('Biển kiểm soát'), ki = H.indexOf('Khối lượng (tấn)');
const KG = {}; pcRows.slice(1).forEach(r => { KG[r[bi]] = (KG[r[bi]] || 0) + Math.round(parseFloat(String(r[ki]).replace(',', '.')) * 1000); });
const tienOf = price => Object.values(KG).map(kg => Math.round(kg * price / 1000));

async function zipTexts(file) {
  const z = await JSZip.loadAsync(fs.readFileSync(file)); let all = '';
  for (const n of Object.keys(z.files).filter(n => n.endsWith('.docx'))) { const d = await JSZip.loadAsync(await z.file(n).async('nodebuffer')); const x = await d.file('word/document.xml').async('string'); all += (x.match(/<w:t[^>]*>([^<]*)<\/w:t>/g) || []).map(t => t.replace(/<[^>]+>/g, '')).join('') + '\n'; }
  return all;
}

(async () => {
  const launch = () => electron.launch({executablePath: require('electron'), args: [root, '--no-sandbox'], env: {...process.env, HAKQN_DB: path.join(dir, 'vc.sqlite'), HAKQN_USERDATA: path.join(dir, 'ud'), HAKQN_DOWNLOAD_DIR: out, ELECTRON_DISABLE_SECURITY_WARNINGS: '1'}});
  let app = await launch(), w = await app.firstWindow(); const errs = []; w.on('pageerror', e => errs.push(e.message)); w.on('dialog', d => d.accept());
  await w.waitForSelector('#side');
  const clear = () => { for (const f of fs.existsSync(out) ? fs.readdirSync(out) : []) fs.unlinkSync(path.join(out, f)); };
  const exp = async (kind, ext) => { clear(); await w.click(`button[data-act=dl][data-kind=${kind}]`); for (let i = 0; i < 80; i++) { const f = fs.existsSync(out) && fs.readdirSync(out).find(x => x.endsWith(ext)); if (f) { await w.waitForTimeout(300); return path.join(out, f); } await w.waitForTimeout(100); } throw new Error('không có file ' + ext + ' cho ' + kind); };
  const saveVc = async () => { await w.click('#vcForm button[type=submit]'); await w.waitForTimeout(250); };
  const status = () => w.innerText('#vcForm');
  const chk = () => w.innerText('.chk');

  // --- Dựng hồ sơ: rừng cự ly 45 km, nhân công, xe, phiếu cân
  await w.click('text=+ Chủ rừng mới');
  for (const [k, v] of Object.entries(OWNER)) await w.fill(`#infoForm [name="${k}"]`, v);
  await w.selectOption('#infoForm [name="danhXung"]', 'Ông'); await w.click('#infoForm button[type=submit]');
  await w.click('[data-tab=rung]'); await w.click('text=+ Rừng mới');
  await w.fill('#forestForm [name=diaDiem]', 'Thôn Hòa Phú'); await w.fill('#forestForm [name=cuLy]', '45'); await w.fill('#forestForm [name=lat]', '15.9'); await w.fill('#forestForm [name=lng]', '108.1');
  await w.fill('#forestForm [name=dienTich]', '2,5'); await w.fill('#forestForm [name=dinhMucTanHa]', '80'); await w.fill('#forestForm [name=tuNgay]', '01/10/2026'); await w.fill('#forestForm [name=denNgay]', '30/11/2026'); await w.click('#forestForm button[type=submit]');
  await w.click('[data-ftab=nc]'); await w.setInputFiles('input[data-file="nc"]', path.join(FIX, 'test_nhancong.xlsx')); await w.waitForTimeout(400);
  for (const [k, v] of [[0, 340000], [1, 200000], [2, 250000]]) await w.fill(`#luongForm [name=dt_${k}]`, String(v));
  await w.click('#luongForm button[type=submit]'); await w.waitForTimeout(200);
  await w.click('[data-ftab=dx]'); await w.setInputFiles('input[data-file="dx"]', path.join(FIX, 'test_doixe.xlsx')); await w.waitForTimeout(400);
  await w.setInputFiles('input[data-file="pc"]', path.join(FIX, 'test_phieucan.xlsx')); await w.waitForTimeout(400);

  // ===== chỉ còn hai cách tính =====
  const opts = () => w.$$eval('#vcForm [name=vcMode] option', o => o.map(x => x.value));
  ok('chỉ còn hai cách tính: đơn giá cố định và đơn giá tấn/km (không còn “theo bậc cự ly”)', JSON.stringify(await opts()) === '["coDinh","tanKm"]', JSON.stringify(await opts()));
  ok('không còn khối nhập bậc cự ly', (await w.$$('#bacList')).length === 0 && !/Thêm bậc|Bậc cự ly/.test(await status()));

  // ===== 2. Tấn/km: 1.000 đồng/tấn/km × 45 km = 45.000 đồng/tấn =====
  await w.selectOption('#vcForm [name=vcMode]', 'tanKm');
  ok('chọn tấn/km: chỉ hiện ô đơn giá tấn/km, ẩn ô đơn giá cố định', await w.isVisible('#vcForm [name=vcKm]') && !(await w.isVisible('#vcForm [name=vcCoDinh]')));
  await w.fill('#vcForm [name=vcKm]', '1000'); await saveVc();
  ok('tấn/km: hiển thị đơn giá hiện tại 45.000 đồng/tấn = 1.000 đồng/tấn/km × 45 km', /45\.000 đồng\/tấn \(1\.000 đồng\/tấn\/km × 45 km\)/.test(await status()), (await status()).slice(-260));
  await w.click('[data-ftab=xuat]'); await w.click('[data-xtab=all]');
  let t = await zipTexts(await exp('hdvc', '.zip'));
  ok('BM-04 hợp đồng vận chuyển theo tấn/km: ghi 1.000 đồng/tấn/km × 45 km = 45.000 đồng/tấn', t.includes('1.000 đồng/tấn/km × 45 km') && t.includes('45.000'), t.slice(t.indexOf('Giá thanh toán'), t.indexOf('Giá thanh toán') + 200));
  t = await zipTexts(await exp('ttvc', '.zip'));
  ok('BM-10 thanh toán vận chuyển theo tấn/km: tiền từng xe = khối lượng × 45.000 (' + tienOf(45000).map(fmt).join(', ') + ')', tienOf(45000).every(v => t.includes(fmt(v))), t.slice(0, 500));

  // ===== 1. Cố định: 52.000 đồng/tấn, không phụ thuộc cự ly =====
  await w.click('[data-ftab=dx]'); await w.selectOption('#vcForm [name=vcMode]', 'coDinh');
  ok('chọn cố định: chỉ hiện ô đơn giá cố định, ẩn ô tấn/km', await w.isVisible('#vcForm [name=vcCoDinh]') && !(await w.isVisible('#vcForm [name=vcKm]')));
  await w.fill('#vcForm [name=vcCoDinh]', '52000'); await saveVc();
  ok('cố định: đơn giá hiện tại 52.000 đồng/tấn (cố định)', /52\.000 đồng\/tấn \(cố định 52\.000 đồng\/tấn\)/.test(await status()), (await status()).slice(-200));
  await w.click('[data-ftab=xuat]'); await w.click('[data-xtab=all]');
  t = await zipTexts(await exp('hdvc', '.zip'));
  ok('BM-04 theo đơn giá cố định: ghi cố định 52.000 đồng/tấn, không có “đồng/tấn/km”', t.includes('cố định 52.000 đồng/tấn') && !t.includes('đồng/tấn/km'));
  t = await zipTexts(await exp('ttvc', '.zip'));
  ok('BM-10 theo đơn giá cố định: tiền từng xe = khối lượng × 52.000 (' + tienOf(52000).map(fmt).join(', ') + ')', tienOf(52000).every(v => t.includes(fmt(v))), t.slice(0, 500));
  // cố định không cần cự ly; tấn/km thì cần
  await w.click('[data-ftab=finfo]'); await w.fill('#forestForm [name=cuLy]', ''); await w.click('#forestForm button[type=submit]'); await w.waitForTimeout(200);
  ok('đơn giá cố định không cần cự ly: checklist không báo lỗi giá vận chuyển khi bỏ trống cự ly', !/thiếu cự ly vận chuyển/.test(await chk()), (await chk()).slice(0, 300));
  await w.click('[data-ftab=dx]'); await w.selectOption('#vcForm [name=vcMode]', 'tanKm'); await saveVc();
  ok('tấn/km thì cần cự ly: bỏ trống cự ly thì báo “thiếu cự ly vận chuyển”', /thiếu cự ly vận chuyển/.test(await status()), (await status()).slice(-200));
  await w.click('[data-ftab=finfo]'); await w.fill('#forestForm [name=cuLy]', '45'); await w.click('#forestForm button[type=submit]'); await w.waitForTimeout(150);

  // ===== kiểm tra dữ liệu nhập =====
  await w.click('[data-ftab=dx]'); await w.selectOption('#vcForm [name=vcMode]', 'coDinh'); await w.fill('#vcForm [name=vcCoDinh]', 'abc'); await saveVc();
  ok('đơn giá cố định không phải số: báo lỗi và không lưu', /Chưa lưu: .*cố định không phải là số/.test(await status()));
  await w.fill('#vcForm [name=vcCoDinh]', ''); await saveVc();
  ok('chọn cố định mà chưa nhập giá: báo thiếu đơn giá cố định', /thiếu đơn giá cố định vận chuyển/.test(await status()));
  await w.selectOption('#vcForm [name=vcMode]', 'tanKm'); await w.fill('#vcForm [name=vcKm]', ''); await saveVc();
  ok('chọn tấn/km mà chưa nhập giá: báo thiếu đơn giá tấn/km', /thiếu đơn giá vận chuyển \(đ\/tấn\/km\)/.test(await status()));
  await w.fill('#vcForm [name=vcKm]', '1000'); await saveVc();
  ok('không có lỗi JavaScript', errs.length === 0, errs.join('; '));
  await app.close();

  // ===== hồ sơ cũ còn chọn “theo bậc cự ly” =====
  app = await launch(); w = await app.firstWindow(); w.on('pageerror', e => errs.push(e.message)); await w.waitForSelector('#side');
  const saved = await w.evaluate(() => window.hak.loadSync().db);
  const o = Object.values(saved.rs)[0], f = Object.values(o.forests)[0]; f.info.vanChuyen = {mode: 'tanDoan', donGiaKm: 1000, coDinh: 52000, bac: [{den: 50, gia: 40000}]};
  await w.evaluate(d => window.hak.save(d), saved); await w.reload(); await w.waitForSelector('#side');
  await w.click('[data-open]'); await w.click('[data-sforest] >> nth=0');
  ok('hồ sơ cũ theo bậc cự ly: checklist báo cách tính không còn áp dụng', /không còn áp dụng/.test(await chk()), (await chk()).slice(0, 400));
  await w.click('[data-ftab=dx]');
  ok('hồ sơ cũ: ô chọn hiển thị rõ lựa chọn không còn áp dụng cùng hai lựa chọn đúng', JSON.stringify(await opts()) === '["coDinh","tanKm","tanDoan"]' && /không còn áp dụng/.test(await w.$eval('#vcForm [name=vcMode]', e => e.selectedOptions[0].textContent)));
  await w.click('[data-ftab=xuat]'); await w.click('[data-xtab=all]');
  ok('hồ sơ cũ: chưa xuất được hợp đồng vận chuyển cho đến khi chọn lại', await w.isDisabled('button[data-act=dl][data-kind=hdvc]'));
  await w.click('[data-ftab=dx]'); await w.selectOption('#vcForm [name=vcMode]', 'tanKm'); await saveVc();
  ok('chọn lại tấn/km: tính được 45.000 đồng/tấn', /45\.000 đồng\/tấn/.test(await status()));
  const after = await w.evaluate(() => window.hak.loadSync().db); const vc = Object.values(Object.values(after.rs)[0].forests)[0].info.vanChuyen;
  ok('dữ liệu bậc cũ được giữ nguyên, không bị xóa khi lưu', vc.mode === 'tanKm' && Array.isArray(vc.bac) && vc.bac[0].den === 50 && vc.bac[0].gia === 40000, JSON.stringify(vc));
  ok('không có lỗi JavaScript sau khi mở lại', errs.length === 0, errs.join('; '));
  await app.close();
  console.log(fail ? 'CÓ ' + fail + ' LỖI' : 'TẤT CẢ ĐẠT'); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
