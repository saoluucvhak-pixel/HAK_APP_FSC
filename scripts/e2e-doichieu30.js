'use strict';
/* Bản 3.0 — ĐỐI CHIẾU KHỐI LƯỢNG trước khi in BM-09, BM-10 (Electron thật, biểu mẫu Word xuất thực tế):
 *  rừng 100 tấn đã lưu: 90 tấn có xe hợp lệ, 10 tấn (phiếu P10) thuộc hợp đồng nhưng BKS không khớp xe nào; cuối bài thêm 1 phiếu ngày cân sai (ngoài phạm vi);
 *  - màn xem trước: tổng đã lưu, đã vào mẫu 90 tấn, cần xử lý 10 tấn (số phiếu, BKS nguồn, KL, lý do, nút “Mở dòng”), ngoài phạm vi tách riêng;
 *  - bản đủ BM-09 và in đè / in đủ đợt 2 bị chặn kèm hướng xử lý; mẫu nền vẫn tải được, không có chữ “Bản nháp”;
 *  - “Mở dòng” mở đúng hợp đồng và dòng phiếu; gán xe, lưu → đối chiếu đủ 100 tấn, BM-09 bản chính thức ghi 100 tấn, in đè được.
 * Chạy: xvfb-run -a node scripts/e2e-doichieu30.js */
const {_electron: electron} = require('playwright-core');
const path = require('path'), fs = require('fs'), os = require('os');
const JSZip = require('jszip');
const src = fs.readFileSync(path.join(__dirname, 'e2e-inan2.js'), 'utf8');
const {xe, lot, seed, EXP1} = new Function(src.slice(src.indexOf('const nv ='), src.indexOf('const plain =')) + '; return {xe, lot, seed, EXP1};')();
const root = path.join(__dirname, '..');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hakqn-dc30-')), out = path.join(dir, 'out'); fs.mkdirSync(out, {recursive: true});
let fail = 0; const ok = (name, cond, extra) => { console.log((cond ? 'ĐẠT  ' : 'LỖI  ') + name + (!cond && extra ? ' — ' + extra : '')); if (!cond) fail++; };
const plain = xml => (xml.match(/<w:t[^>]*>([^<]*)<\/w:t>/g) || []).map(a => a.replace(/<[^>]+>/g, '')).join('');
const P = (so, ngay, bks, kl) => ({soPhieu: so, ngay, bienSo: bks, kl, klKg: Math.round(kl * 1000), maRung: 'R-A', khachHang: 'NHÀ MÁY', noiGiao: 'KCN'});

(async () => {
  const app = await electron.launch({executablePath: require('electron'), args: [root, '--no-sandbox'], env: {...process.env, HAKQN_CLOSE: 'discard', HAKQN_DB: path.join(dir, 'd.sqlite'), HAKQN_USERDATA: path.join(dir, 'ud'), HAKQN_DOWNLOAD_DIR: out}});
  const w = await app.firstWindow(); const errs = []; w.on('pageerror', e => errs.push(e.message)); w.on('dialog', d => d.accept()); await w.waitForSelector('#side');
  const pc = []; for (let i = 1; i <= 9; i++) pc.push(P('P' + i, String(i + 4).padStart(2, '0') + '/10/2026', i % 2 ? '92C-12345' : '92C-67890', 10));
  pc.push(P('P10', '15/10/2026', '43A-99999', 10));
  const A = lot('fa', 'R-A', {exp: EXP1, kl: null, pc, dx: [xe('92C-12345', '049000000077', 'LÊ VĂN AN'), Object.assign(xe('92C-67890', '049000000078', 'TRẦN BÌNH'), {nguoiKy: 'Chủ xe'})]});
  A.info.vanChuyen = {mode: 'coDinh', coDinh: 50000};
  await w.evaluate(d => window.hak.save(d), seed([A])); await w.reload(); await w.waitForSelector('#side');
  const lotDb = async () => (await w.evaluate(() => window.hak.loadSync().db)).rs.own1.forests.fa;
  { const d = await w.evaluate(() => window.hak.loadSync().db), f = d.rs.own1.forests.fa, h = f.dx.find(r => r.bienSo === '92C-12345').hdvcId;   // P10 thuộc hợp đồng của xe 92C-12345 nhưng BKS không khớp xe nào
    f.hdvc.forEach(x => { x.exp = {soVC: x.id === h ? '07' : '08', pcSo: x.id === h ? '09' : '11'}; }); f.pc.find(p => p.soPhieu === 'P10').hdvcId = h; delete f.pc.find(p => p.soPhieu === 'P10').xeRowId;
    await w.evaluate(x => window.hak.save(x), d); await w.reload(); await w.waitForSelector('#side'); }
  const moXuat = async () => { await w.click('[data-open=own1]'); await w.click('[data-tab=rung]'); await w.click('[data-forest=fa]'); await w.click('[data-ftab=xuat]'); await w.click('[data-xtab=vc]').catch(() => {}); await w.waitForTimeout(300); };
  const tai = async kind => { for (const x of fs.readdirSync(out)) fs.unlinkSync(path.join(out, x)); const b = await w.$('button[data-act=dl][data-kind=' + kind + ']:not([disabled])'); if (!b) return null; await b.click();
    let f = null; for (let i = 0; i < 100 && !f; i++) { f = fs.readdirSync(out).find(n => /\.(zip|docx)$/.test(n)); await w.waitForTimeout(150); } await w.waitForTimeout(300); if (!f) return null;
    if (/\.docx$/.test(f)) return {ten: [f], text: plain(await (await JSZip.loadAsync(fs.readFileSync(path.join(out, f)))).file('word/document.xml').async('string'))};
    const z = await JSZip.loadAsync(fs.readFileSync(path.join(out, f))), ns = Object.keys(z.files).filter(n => /\.docx$/.test(n)); let t = ''; for (const n of ns) t += plain(await (await JSZip.loadAsync(await z.file(n).async('nodebuffer'))).file('word/document.xml').async('string')) + ' || ';
    return {ten: ns, text: t}; };
  await moXuat(); await w.waitForSelector('#doiChieuPcVC'); { const el = await w.$('#doiChieuPcVC'); if (el) await el.screenshot({path: path.join(process.env.HAKQN_ANH || dir, 'doi-chieu-bm09-truoc.png')}).catch(() => {}); }
  const so = async id => (await w.innerText(id)).trim();
  ok('xem trước: tổng 10 phiếu, 100 tấn đã lưu của rừng', /^10 phiếu · 100[.,]000 kg/.test(await so('#pcVCTong')), await so('#pcVCTong'));
  ok('đã vào mẫu: 9 phiếu, 90 tấn', /^9 phiếu · 90[.,]000 kg/.test(await so('#pcVCDu')), await so('#pcVCDu'));
  ok('cần xử lý: 1 phiếu, 10 tấn (P10, BKS nguồn 43A-99999, lý do chưa ghép xe trong hợp đồng, nút Mở phiếu)', /^1 phiếu · 10[.,]000 kg/.test(await so('#pcVCThieu')) && /P10\s+43A-99999\s+10[.,]000\s+Chưa ghép xe trong hợp đồng/.test(await w.innerText('#doiChieuPcVC tbody')) && !!(await w.$('#doiChieuPcVC tbody [data-act=ktGo]')), await w.innerText('#doiChieuPcVC'));
  const bz = await w.$('button[data-act=dl][data-kind=xnvc]');
  ok('BM-09 bản đủ khi còn phiếu cần xử lý: nút “Biên bản” bị khóa (không in số liệu thiếu 10 tấn); bảng đối chiếu chỉ rõ phiếu cần xử lý', !!bz && await bz.isDisabled() && /Chưa ghép xe trong hợp đồng/.test(await w.innerText('#doiChieuPcVC')), bz ? 'nút còn bật' : 'không có nút');
  let r;
  // đợt 2: in đè bị chặn, in nền được và không có chữ Bản nháp
  await w.click('[data-xtab=all]').catch(() => {}); await w.waitForTimeout(300);
  const d2 = await w.$$eval('button[data-act=d2dl]', b => b.map(x => x.dataset.mode + ':' + (x.dataset.keys || ''))).catch(() => []);
  const k09 = (d2.find(x => /^nen:09:hd:/.test(x)) || '').slice(4), SEL = m => 'button[data-act=' + (m === 'ok' ? 'd2confirm' : 'd2dl') + ']' + (m === 'ok' ? '' : '[data-mode=' + m + ']') + '[data-keys="' + k09 + '"]';
  const nenBtn = k09 && await w.$(SEL('nen'));
  let nenOk = false, nenText = '';
  if (nenBtn) { for (const x of fs.readdirSync(out)) fs.unlinkSync(path.join(out, x)); await w.$eval(SEL('nen'), b => b.click()); let f = null; for (let i = 0; i < 100 && !f; i++) { f = fs.readdirSync(out).find(n => /\.(zip|docx)$/.test(n)); await w.waitForTimeout(150); } await w.waitForTimeout(300);
    if (f) { nenOk = true; if (/\.docx$/.test(f)) nenText = plain(await (await JSZip.loadAsync(fs.readFileSync(path.join(out, f)))).file('word/document.xml').async('string')); else { const z = await JSZip.loadAsync(fs.readFileSync(path.join(out, f))); for (const n of Object.keys(z.files).filter(n => /\.docx$/.test(n))) nenText += plain(await (await JSZip.loadAsync(await z.file(n).async('nodebuffer'))).file('word/document.xml').async('string')); } } }
  ok('mẫu nền BM-09 đợt 2 vẫn tải được (in nền theo trạng thái đã lưu) và không có chữ “Bản nháp”', nenOk && !/BẢN NHÁP|Bản nháp/i.test(nenText), nenOk ? nenText.slice(0, 200) : 'không tải được mẫu nền — ' + d2.join(' | '));
  if (k09 && await w.$(SEL('ok'))) { await w.$eval(SEL('ok'), b => b.click()); await w.waitForTimeout(500); }   // đã in nền
  const deBtn = k09 && await w.$(SEL('de'));
  if (deBtn) { for (const x of fs.readdirSync(out)) fs.unlinkSync(path.join(out, x)); await w.$eval(SEL('de'), b => b.click()); await w.waitForTimeout(800); }
  const hang = await w.$$eval('#d2Table tr', (t, k) => (t.find(r => r.querySelector('[data-keys="' + k + '"]') || (r.dataset && r.dataset.key === k)) || {innerText: ''}).innerText, k09).catch(() => '');
  ok('đợt 2: in đè phần số liệu chính thức của BM-09 bị chặn khi còn phiếu cần xử lý, nêu cách xử lý', !fs.readdirSync(out).some(n => /_IN_DE/.test(n)) && (deBtn ? /Chưa in phần in đè BM-09\/10[\s\S]*Mở phiếu/.test(await w.innerText('body')) : /phiếu cân thuộc phạm vi mẫu chưa vào biên bản/.test(hang)), (deBtn ? 'có nút' : 'không nút') + ' | ' + hang);
  // mở dòng, gán xe, lưu
  await moXuat(); await w.click('#doiChieuPcVC tbody tr:has-text("P10") [data-act=ktGo]'); await w.waitForTimeout(500);
  const f0 = await lotDb(), ix = f0.pc.findIndex(p => p.soPhieu === 'P10'), xe1 = f0.dx.find(x => x.bienSo === '92C-12345').id;
  ok('“Mở phiếu”: mở tab Vận chuyển ở hợp đồng số 07, dòng phiếu P10 được chọn', /07/.test(await w.innerText('#hdDau')) && await w.evaluate(i => document.activeElement.matches('#stTbl_pc [data-act=stEdit][data-i="' + i + '"]'), ix));
  await w.selectOption('#stTbl_pc select[data-pcxe="' + ix + '"]', xe1); await w.waitForTimeout(300);
  if (await w.$('#loDirtyBar [data-act=stSave]')) { await w.click('#loDirtyBar [data-act=stSave]'); await w.waitForTimeout(600); }
  ok('gán xe 92C-12345 cho P10 và lưu: BKS nguồn giữ 43A-99999', (await lotDb()).pc.find(p => p.soPhieu === 'P10').xeRowId === xe1 && (await lotDb()).pc.find(p => p.soPhieu === 'P10').bienSo === '43A-99999');
  await moXuat(); await w.waitForSelector('#doiChieuPcVC');
  ok('sau khi xử lý: đã vào mẫu 10 phiếu, 100 tấn; không còn phiếu cần xử lý', /^10 phiếu · 100[.,]000 kg/.test(await so('#pcVCDu')) && /^0 phiếu/.test(await so('#pcVCThieu')), [await so('#pcVCDu'), await so('#pcVCThieu')].join());
  r = await tai('xnvc');
  ok('BM-09 bản chính thức (không BẢN NHÁP), tổng hai biên bản 60 + 40 = 100 tấn', !!r && !r.ten.some(n => /BAN_NHAP/.test(n)) && !/BẢN NHÁP/.test(r.text) && /60,000 tấn/.test(r.text) && /40,000 tấn/.test(r.text), r ? r.ten.join(',') : '');
  { const el = await w.$('#doiChieuPcVC'); if (el) await el.screenshot({path: path.join(process.env.HAKQN_ANH || dir, 'doi-chieu-bm09-sau.png')}).catch(() => {}); }
  const deSau = k09 && await w.$(SEL('de'));
  if (deSau) { for (const x of fs.readdirSync(out)) fs.unlinkSync(path.join(out, x)); await w.$eval(SEL('de'), b => b.click()); let f = null; for (let i = 0; i < 100 && !f; i++) { f = fs.readdirSync(out).find(n => /\.(zip|docx)$/.test(n)); await w.waitForTimeout(150); } }
  ok('đã đối chiếu đủ: in đè BM-09 tải được', !!deSau && fs.readdirSync(out).some(n => /_IN_DE/.test(n)), fs.readdirSync(out).join(','));
  // phiếu ngoài phạm vi theo nghiệp vụ (ngày cân sai): tách riêng, không tính vào mẫu, không có nút xử lý
  { const d = await w.evaluate(() => window.hak.loadSync().db); d.rs.own1.forests.fa.pc.push(P('PX', '31/02/2026', '92C-12345', 5)); await w.evaluate(x => window.hak.save(x), d); await w.reload(); await w.waitForSelector('#side'); }
  await moXuat(); await w.waitForSelector('#doiChieuPcVC');
  ok('ngoài phạm vi theo nghiệp vụ tách riêng (PX ngày cân sai, 5 tấn): không tính vào mẫu; mẫu vẫn 100 tấn, không còn phiếu cần xử lý', /^1 phiếu · 5[.,]000 kg/.test(await so('#pcVCNgoai')) && /^10 phiếu · 100[.,]000 kg/.test(await so('#pcVCDu')) && /^0 phiếu/.test(await so('#pcVCThieu')) && /PX[\s\S]*Ngày cân không hợp lệ/.test(await w.innerText('#doiChieuPcVC tbody')), await w.innerText('#doiChieuPcVC'));
  ok('không có lỗi script trên màn hình', errs.length === 0, errs.join(' | '));
  await app.close(); console.log(fail ? 'CÓ ' + fail + ' LỖI' : 'TẤT CẢ ĐẠT'); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
