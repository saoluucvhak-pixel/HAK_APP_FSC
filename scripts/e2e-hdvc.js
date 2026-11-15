'use strict';
/* Cấu trúc 2.0 giai đoạn 4: “Hợp đồng vận chuyển” là bảng con của lô, xe là bảng con của hợp đồng.
 * Kịch bản: lô có 2 người ký (2 hợp đồng như bản cũ) → thêm doanh nghiệp vào danh mục → hợp đồng với doanh nghiệp → chuyển một xe vào → cước và số riêng
 * → ZIP: HĐ doanh nghiệp in MST, người đại diện, cước riêng, số riêng; HĐ cá nhân giữ cước chung → lô khác thêm xe chọn từ danh mục xe → mở lại app giữ nguyên.
 * Chạy: xvfb-run -a node scripts/e2e-hdvc.js */
const {_electron: electron} = require('playwright-core');
const path = require('path'), fs = require('fs'), os = require('os');
const JSZip = require('jszip');
const src = fs.readFileSync(path.join(__dirname, 'e2e-inan2.js'), 'utf8');
const {xe, lot, seed, PC, EXP1, plain} = new Function(src.slice(src.indexOf('const nv ='), src.indexOf('const plain =') + src.slice(src.indexOf('const plain =')).indexOf('\n')) + '; return {xe, lot, seed, PC, EXP1, plain};')();
const root = path.join(__dirname, '..');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hakqn-hdvc-')), out = path.join(dir, 'out');
let fail = 0; const ok = (name, cond, extra) => { console.log((cond ? 'ĐẠT  ' : 'LỖI  ') + name + (!cond && extra ? ' — ' + extra : '')); if (!cond) fail++; };
(async () => {
  fs.mkdirSync(out, {recursive: true});
  const env = {...process.env, HAKQN_CLOSE: 'discard', HAKQN_DB: path.join(dir, 'd.sqlite'), HAKQN_USERDATA: path.join(dir, 'ud'), HAKQN_DOWNLOAD_DIR: out};
  let app = await electron.launch({executablePath: require('electron'), args: [root, '--no-sandbox'], env});
  let w = await app.firstWindow(); const errs = [];
  const hook = () => { w.on('pageerror', e => errs.push(e.message)); w.on('dialog', d => d.accept()); }; hook(); await w.waitForSelector('#side');
  const A = lot('fa', 'R-A', {exp: EXP1, pc: PC, kl: 29.75, dx: [xe('92C-12345', '049000000077', 'LÊ VĂN AN'), xe('92C-67890', '049000000078', 'TRẦN BÌNH')]});
  A.info.vanChuyen = {mode: 'coDinh', coDinh: 50000};
  const B = lot('fb', 'R-B', {exp: {}, pc: [], kl: 10, dx: []}); B.nc = B.nc.map(r => ({...r, maRung: 'R-B'})); B.info.tuNgay = '01/09/2026';
  await w.evaluate(d => window.hak.save(d), seed([A, B])); await w.reload(); await w.waitForSelector('#side');
  const lotDb = async id => (await w.evaluate(() => window.hak.loadSync().db)).rs.own1.forests[id];
  const open = async id => { await w.click('[data-open=own1]'); await w.click('[data-tab=rung]'); await w.click('[data-forest=' + id + ']'); await w.click('[data-ftab=dx]'); await w.waitForTimeout(300); };
  await open('fa');
  let t = await w.innerText('#hdvcKT'), f = await lotDb('fa');
  ok('tab Vận chuyển có bảng con “Hợp đồng vận chuyển: 2 hợp đồng” (mỗi người ký một hợp đồng như bản cũ)', /2 hợp đồng/.test(t) && /LÊ VĂN AN/.test(t) && /TRẦN BÌNH/.test(t), t);
  ok('SQLite: lô có 2 hợp đồng vận chuyển, mỗi xe mang hdvcId; cước để trống = cước chung', f.hdvc.length === 2 && f.dx.every(r => f.hdvc.some(h => h.id === r.hdvcId)) && f.hdvc.every(h => h.cuoc === null), JSON.stringify(f.hdvc));
  // danh mục: thêm doanh nghiệp
  await w.fill('#dvForm [name=ten]', 'CÔNG TY TNHH VẬN TẢI HÒA PHÁT'); await w.fill('#dvForm [name=mst]', '123');
  await w.click('#dvForm [type=submit]'); await w.waitForTimeout(200);
  ok('mã số thuế sai: không lưu, nêu rõ', /mã số thuế gồm 10 chữ số/.test(await w.innerText('#dvForm')));
  await w.fill('#dvForm [name=mst]', '0401234567'); await w.fill('#dvForm [name=diaChi]', 'Hòa Khánh, Đà Nẵng'); await w.fill('#dvForm [name=daiDien]', 'NGUYỄN VĂN ĐẠI'); await w.fill('#dvForm [name=chucVu]', 'Giám đốc');
  await w.click('#dvForm [type=submit]'); await w.waitForTimeout(400);
  const dm = (await w.evaluate(() => window.hak.loadSync().db)).dmDonViVC || {};
  ok('lưu doanh nghiệp vào danh mục dùng chung (db.dmDonViVC)', Object.values(dm).length === 1 && Object.values(dm)[0].mst === '0401234567', JSON.stringify(dm));
  // hợp đồng với doanh nghiệp
  await w.selectOption('#hdDvSel', Object.keys(dm)[0]); await w.click('[data-act=themHdDv]'); await w.waitForTimeout(300);
  t = await w.innerText('#hdvcKT'); f = await lotDb('fa');
  ok('thêm hợp đồng với doanh nghiệp: 3 hợp đồng, thông tin đơn vị chụp lại trong hợp đồng', /3 hợp đồng/.test(t) && f.hdvc.some(h => h.donViId && h.ben.mst === '0401234567'), t);
  const ix = f.dx.findIndex(r => r.chuXe === 'TRẦN BÌNH'), hdDn = f.hdvc.find(h => h.donViId).id;
  await w.selectOption('select[data-xehd="' + ix + '"]', hdDn); await w.waitForTimeout(400); f = await lotDb('fa');
  ok('chọn hợp đồng ở cột “Hợp đồng”: xe của TRẦN BÌNH sang hợp đồng doanh nghiệp; hợp đồng cá nhân trống tự bỏ (còn 2)', f.dx[ix].hdvcId === hdDn && f.hdvc.length === 2, JSON.stringify(f.hdvc.map(h => h.id + ':' + h.key)));
  // cước, số riêng của hợp đồng doanh nghiệp
  if (!(await w.$('#hdForm'))) await w.click('[data-act=chonHd][data-hd=' + hdDn + ']'); await w.waitForSelector('#hdForm');
  await w.check('#hdForm [name=rieng]'); await w.selectOption('#hdForm [name=vcMode]', 'coDinh'); await w.fill('#hdForm [name=vcCoDinh]', '');
  await w.click('#hdForm [type=submit]'); await w.waitForTimeout(200);
  ok('cước riêng thiếu đơn giá: không lưu, nêu rõ', /chưa nhập đơn giá cố định/.test(await w.innerText('#hdForm')));
  await w.fill('#hdForm [name=vcCoDinh]', '60000'); await w.fill('#hdForm [name=soVC]', '88'); await w.click('#hdForm [type=submit]'); await w.waitForTimeout(400);
  f = await lotDb('fa'); const H = f.hdvc.find(h => h.id === hdDn);
  ok('lưu cước riêng 60.000 đ/tấn và số HĐ 88 cho hợp đồng doanh nghiệp; cước chung của lô không đổi', H.cuoc && H.cuoc.coDinh === 60000 && H.exp.soVC === '88' && f.info.vanChuyen.coDinh === 50000, JSON.stringify(H));
  ok('bảng hợp đồng: cước riêng 60.000, hợp đồng cá nhân vẫn cước chung 50.000', /60\.000 đ\/tấn\s*riêng/.test(await w.innerText('#hdvcKT')) && /50\.000 đ\/tấn\s*\(cước chung\)/.test(await w.innerText('#hdvcKT')), await w.innerText('#hdvcKT'));
  // xuất ZIP
  for (const x of fs.readdirSync(out)) fs.unlinkSync(path.join(out, x));
  await w.click('[data-ftab=xuat]'); await w.click('[data-xtab=all]'); await w.waitForTimeout(400);
  const b = await w.$('button[data-act=dl][data-kind=all]:not([disabled])'); let z = null;
  if (b) { await b.click(); let n = null; for (let i = 0; i < 100 && !n; i++) { n = fs.readdirSync(out).find(x => /\.zip$/.test(x)); if (!n) await w.waitForTimeout(150); } await w.waitForTimeout(300); if (n) z = await JSZip.loadAsync(fs.readFileSync(path.join(out, n))); }
  const hd = z ? Object.keys(z.files).filter(n => /^04_HDVC\/.*\.docx$/.test(n)) : [];
  const txt = async n => plain(await (await JSZip.loadAsync(await z.file(n).async('nodebuffer'))).file('word/document.xml').async('string'));
  const dnF = hd.find(n => /HOA_PHAT|Hoa_Phat/i.test(n)), anF = hd.find(n => /AN/.test(n) && n !== dnF);
  ok('ZIP: 2 hợp đồng vận chuyển (LÊ VĂN AN, doanh nghiệp)', hd.length === 2 && !!dnF && !!anF, JSON.stringify(hd));
  if (dnF && anF) {
    const dn = await txt(dnF), an = await txt(anF);
    ok('HĐ doanh nghiệp: in MST, địa chỉ trụ sở, người đại diện, chức vụ; cước riêng 60.000; số riêng 88/2026-HĐVC', /Mã số thuế: 0401234567/.test(dn) && /Địa chỉ trụ sở: Hòa Khánh/.test(dn) && /Người đại diện: NGUYỄN VĂN ĐẠI – Chức vụ: Giám đốc/.test(dn) && /60\.000 đồng\/tấn/.test(dn) && /Số: 88\/2026-HĐVC/.test(dn), dn.slice(0, 900));
    ok('HĐ cá nhân: cước chung 50.000, số chung 07/2026-HĐVC', /50\.000 đồng\/tấn/.test(an) && /Số: 07\/2026-HĐVC/.test(an) && !/Mã số thuế/.test(an), an.slice(0, 600));
  }
  const xn = z ? Object.keys(z.files).filter(n => /^(09|10)_.*\.docx$/.test(n)) : [];
  ok('xác nhận khối lượng và thanh toán vận chuyển theo hợp đồng có chuyến (2 + 2)', xn.length === 4, JSON.stringify(xn));
  // lô khác: thêm xe chọn từ danh mục xe
  await open('fb'); await w.click('[data-act=stAdd][data-kind=dx]'); await w.waitForSelector('#xeDm');
  await w.selectOption('#xeDm', '92C12345'); await w.waitForTimeout(300);
  ok('thêm xe ở lô khác: chọn xe đã có trong danh mục điền sẵn chủ xe, CCCD, giấy tờ', (await w.inputValue('#stForm [name=chuXe]')) === 'LÊ VĂN AN' && (await w.inputValue('#stForm [name=cccd]')) === '049000000077' && (await w.inputValue('#stForm [name=bienSo]')) === '92C-12345');
  await w.click('[data-act=stClose]').catch(() => {});
  // mở lại
  await app.close();
  app = await electron.launch({executablePath: require('electron'), args: [root, '--no-sandbox'], env}); w = await app.firstWindow(); hook(); await w.waitForSelector('#side');
  await open('fa'); f = await lotDb('fa');
  ok('mở lại app: hợp đồng doanh nghiệp, xe trong hợp đồng, cước và số riêng giữ nguyên', f.hdvc.length === 2 && f.dx[ix].hdvcId === hdDn && f.hdvc.find(h => h.id === hdDn).cuoc.coDinh === 60000 && /2 hợp đồng/.test(await w.innerText('#hdvcKT')));
  ok('không có lỗi JavaScript', errs.length === 0, errs.join('|'));
  await app.close(); console.log(fail ? 'CÓ ' + fail + ' LỖI' : 'TẤT CẢ ĐẠT'); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
