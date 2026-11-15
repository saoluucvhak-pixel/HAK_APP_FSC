'use strict';
/* NGHIỆM THU IN ĐỢT 2 (BM-08, BM-09, BM-10, BM-14) bằng dữ liệu ĐÃ LƯU trong SQLite (Electron thật, file Word xuất thật). Một chủ rừng, hai lô, mỗi lô hai đội xe (bộ vận chuyển).
 *  Ca 1 — lô R-A: đủ dữ liệu ngay từ đầu, chưa in nền → app đề nghị in đầy đủ trên giấy trắng; xuất cả bộ một lần.
 *  Ca 2 — lô R-B: in nền cả bốn mẫu → xác nhận đã in → đóng mở app → bổ sung số liệu → đóng mở app → app đề nghị IN ĐÈ đúng mẫu, đúng bộ vận chuyển;
 *         Bảng kê đính kèm BM-09 in đầy đủ trên trang riêng (giấy mới), tờ nền BM-09 không có trang bảng kê.
 *  Mọi file: không có chữ “BẢN NHÁP” (tên file, thân, đầu trang, chân trang). Có LibreOffice: đổi sang PDF, chồng ảnh tờ nền + phần in đè (lưu PNG để xem),
 *  đo chữ in đè nằm đúng dòng của tờ nền. File xuất và ảnh chồng lưu ở thư mục --out (mặc định reports/nghiemthu-dot2).
 * Chạy: xvfb-run -a node scripts/e2e-nghiemthu-dot2.js [--out <thư mục>] */
const {_electron: electron} = require('playwright-core');
const path = require('path'), fs = require('fs'), os = require('os'), cp = require('child_process');
const JSZip = require('jszip');
const root = path.join(__dirname, '..');
const src = fs.readFileSync(path.join(__dirname, 'e2e-inan2.js'), 'utf8');
const {lot, seed, P, EXP0, EXP1} = new Function(src.slice(src.indexOf('const nv ='), src.indexOf('const plain =')) + '; return {lot, seed, P, EXP0, EXP1};')();
const arg = k => { const i = process.argv.indexOf(k); return i < 0 ? null : process.argv[i + 1]; };
const OUT = path.resolve(arg('--out') || path.join(root, 'reports', 'nghiemthu-dot2'));
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hakqn-nt2-')), dl = path.join(dir, 'dl'), dbFile = path.join(dir, 'nt.sqlite');
let fail = 0; const kq = []; const ok = (name, cond, extra) => { console.log((cond ? 'ĐẠT  ' : 'LỖI  ') + name + (!cond && extra ? ' — ' + extra : '')); kq.push({name, ok: !!cond}); if (!cond) fail++; };
const plain = xml => (xml.match(/<w:t[^>]*>([^<]*)<\/w:t>/g) || []).map(a => a.replace(/<[^>]+>/g, '')).join('');
// phiếu cân: xe 92C-12345 (đội xe hd1) và 92C-67890 (đội xe hd2); số phiếu riêng từng lô (kiểm tra chéo lô không báo trùng)
const PCx = t => [P(1, '05/10/2026', '92C-12345', t + '1', 12.5), P(2, '06/10/2026', '92C-67890', t + '2', 9.25), P(3, '07/10/2026', '92C-12345', t + '3', 8)];
const sof = ['soffice', 'libreoffice'].find(c => { try { cp.execSync('command -v ' + c, {stdio: 'ignore'}); return true; } catch (e) { return false; } });

async function docsOf(file) {
  const buf = fs.readFileSync(file), one = async (b) => { const d = await JSZip.loadAsync(b), names = Object.keys(d.files); const txt = async re => (await Promise.all(names.filter(n => re.test(n)).map(n => d.file(n).async('string')))).join('');
    return {buf: b, xml: await d.file('word/document.xml').async('string'), hf: await txt(/^word\/(header|footer)\d*\.xml$/)}; };
  if (!/\.zip$/.test(file)) return {[path.basename(file)]: await one(buf)};
  const z = await JSZip.loadAsync(buf), o = {};
  for (const n of Object.keys(z.files).filter(n => n.endsWith('.docx'))) o[n] = await one(await z.file(n).async('nodebuffer'));
  return o;
}
const khongNhap = (name, docs) => !/BAN_NHAP|BẢN NHÁP/i.test(name) && Object.entries(docs).every(([n, x]) => !/BAN_NHAP|BẢN NHÁP/i.test(n) && !/BẢN NHÁP/.test(plain(x.xml)) && !/BẢN NHÁP/.test(plain(x.hf)));
const boCua = (docs, code, bien) => Object.entries(docs).filter(([n, x]) => new RegExp('(^|/)' + code + '_').test(n) && plain(x.xml).includes(bien));
function luu(tag, name, docs) {
  const d = path.join(OUT, tag); fs.mkdirSync(d, {recursive: true}); const res = {};
  for (const [n, x] of Object.entries(docs)) { const f = path.join(d, n.replace(/[\\/]+/g, '__')); fs.writeFileSync(f, x.buf); res[n] = f; }
  return res;
}
const pdfOf = f => { const o = path.dirname(f); cp.execFileSync(sof, ['--headless', '--convert-to', 'pdf', '--outdir', o, f], {timeout: 180000, stdio: 'ignore'}); return f.replace(/\.docx$/, '.pdf'); };
const goc = n => n.replace(/_(MAU_NEN|IN_DE)(?=\.docx$)/, '');   // tên file nền / in đè chỉ khác hậu tố
const soTrang = f => +((cp.execFileSync('pdfinfo', [f], {encoding: 'utf8'}).match(/Pages:\s+(\d+)/) || [])[1] || 0);

(async () => {
  fs.rmSync(OUT, {recursive: true, force: true}); fs.mkdirSync(OUT, {recursive: true});
  const launch = async () => { const app = await electron.launch({executablePath: require('electron'), args: [root, '--no-sandbox', '--proxy-server=http://127.0.0.1:9'], env: {...process.env, HAKQN_CLOSE: 'discard', HAKQN_DB: dbFile, HAKQN_USERDATA: path.join(dir, 'ud'), HAKQN_DOWNLOAD_DIR: dl, ELECTRON_DISABLE_SECURITY_WARNINGS: '1'}});
    const w = await app.firstWindow(); w.errs = []; w.on('pageerror', e => w.errs.push(e.message)); w.on('dialog', d => d.accept()); await w.waitForSelector('#side'); return {app, w}; };
  let {app, w} = await launch();
  const open = async fid => { await w.click('[data-open=own1]'); await w.click('[data-tab=rung]'); await w.click('[data-forest=' + fid + ']'); await w.click('[data-ftab=xuat]'); await w.click('[data-xtab=all]'); await w.waitForSelector('#d2Table'); await w.waitForTimeout(200); };
  const adv = () => w.evaluate(() => Object.fromEntries([...document.querySelectorAll('#d2Table tr[data-d2]')].map(r => [r.dataset.d2, r.dataset.adv])));
  const grab = async sel => {
    fs.rmSync(dl, {recursive: true, force: true}); fs.mkdirSync(dl, {recursive: true});
    await w.evaluate(() => document.querySelectorAll('details.d2more').forEach(d => { d.open = true; })); await w.click(sel);
    let f = null; for (let i = 0; i < 150 && !f; i++) { f = fs.readdirSync(dl).find(x => /\.(zip|docx)$/.test(x) && !x.endsWith('.part')); if (!f) await w.waitForTimeout(150); }
    await w.waitForTimeout(300); return {name: f, docs: await docsOf(path.join(dl, f))};
  };
  const saveDb = async d => { await w.waitForTimeout(700); const r = await w.evaluate(x => window.hak.save(x), d); await w.reload(); await w.waitForSelector('#side'); return r; };
  const ALL6 = ['08', '14', '09:hd:hd1', '09:hd:hd2', '10:hd:hd1', '10:hd:hd2'];

  // dữ liệu: lô A đủ dữ liệu; lô B mới có thông tin để in nền (chưa phiếu cân, chưa ngày lập)
  const dungMa = f => { ['nc', 'dx', 'pc'].forEach(k => { f[k] = (f[k] || []).map(r => Object.assign({}, r, {maRung: f.info.maRung})); }); return f; };   // các dòng mẫu ghi mã rừng R-A: gán đúng mã của từng lô
  const A = dungMa(lot('fa', 'R-A', {exp: EXP1, pc: PCx('A'), kl: 29.75})), B = dungMa(lot('fb', 'R-B', {exp: EXP0}));
  ok('lưu dữ liệu thử vào SQLite (hai lô, mỗi lô hai đội xe)', (await saveDb(seed([A, B]))).ok);

  // ===== CA 1: đủ dữ liệu, chưa in nền → in cả bộ một lần trên giấy trắng =====
  await open('fa'); let a = await adv();
  ok('ca 1: cả sáu mục (BM-08, BM-14, BM-09 và BM-10 của từng đội xe) đề nghị “in đầy đủ trên giấy trắng”', ALL6.every(k => a[k] === 'trang') && Object.keys(a).length === 6, JSON.stringify(a));
  const T = await grab('#d2Card .docrow [data-act=d2dl][data-mode=trang]');
  ok('ca 1: gói giấy trắng có đủ bốn biểu mẫu, BM-09 / BM-10 mỗi đội xe một file', ['08', '14'].every(c => Object.keys(T.docs).some(n => new RegExp('(^|/)' + c + '_').test(n))) && boCua(T.docs, '09', '92C-12345').length === 1 && boCua(T.docs, '09', '92C-67890').length === 1 && boCua(T.docs, '10', '92C-12345').length === 1 && boCua(T.docs, '10', '92C-67890').length === 1, T.name + ' ' + JSON.stringify(Object.keys(T.docs)));
  ok('ca 1: không có chữ “BẢN NHÁP” (tên file, thân, đầu trang, chân trang)', khongNhap(T.name, T.docs));
  { const [[, x1]] = boCua(T.docs, '09', '92C-12345'), t1 = plain(x1.xml), [[, x2]] = boCua(T.docs, '09', '92C-67890'), t2 = plain(x2.xml);
    ok('ca 1: BM-09 của đội xe 92C-12345 chỉ có phiếu của xe đó (A1, A3), của đội xe 92C-67890 chỉ có A2', /A1/.test(t1) && /A3/.test(t1) && !/A2/.test(t1) && /A2/.test(t2) && !/A1|A3/.test(t2));
    ok('ca 1: giấy trắng in đủ số liệu (số biên bản, ngày lập, tổng khối lượng 29,750)', Object.values(T.docs).some(x => /20\/12\/2026/.test(plain(x.xml))) && Object.values(T.docs).some(x => /29,75/.test(plain(x.xml)))); }
  const fT = luu('ca1-giay-trang', T.name, T.docs);
  await open('fa'); a = await adv(); ok('ca 1: tải gói không làm đổi trạng thái (chỉ nút xác nhận mới ghi nhận đã in)', ALL6.every(k => a[k] === 'trang'));

  // ===== CA 2: in nền → xác nhận → đóng mở → bổ sung → đóng mở → in đè =====
  await open('fb'); a = await adv();
  ok('ca 2: lô B đủ dữ liệu để in nền cả bốn mẫu, chưa đủ để in đầy đủ', ALL6.every(k => a[k] === 'nen'), JSON.stringify(a));
  const N = await grab('#d2Card .docrow [data-act=d2dl][data-mode=nen]');
  ok('ca 2: gói mẫu nền đủ sáu file, không “BẢN NHÁP”', /MAU_NEN/.test(N.name) && Object.keys(N.docs).length === 6 && khongNhap(N.name, N.docs), N.name);
  ok('ca 2: tờ nền BM-09 không có trang Bảng kê (bảng kê in riêng trên giấy mới khi có số liệu)', Object.entries(N.docs).filter(([n]) => /(^|\/)09_/.test(n)).every(([, x]) => !/BẢNG KÊ KHỐI LƯỢNG ĐÍNH KÈM/.test(plain(x.xml))));
  const fN = luu('ca2-1-mau-nen', N.name, N.docs);
  await w.click('#d2Card button[data-act=d2confirm][data-keys*="|"]'); await w.waitForFunction(() => document.querySelectorAll('#d2Table tr[data-adv=cho]').length === 6); await w.waitForTimeout(800);
  ok('ca 2: xác nhận đã in nền cả bộ: sáu mục “đã in nền, chờ dữ liệu”', Object.values(await adv()).every(v => v === 'cho'));
  ok('ca 2: không có lỗi JavaScript (trước khi đóng app)', w.errs.length === 0, w.errs.join('|'));
  await app.close(); ({app, w} = await launch());
  await open('fb'); a = await adv(); ok('ca 2: đóng mở lại: vẫn nhớ đã in nền sáu mục (trạng thái lưu trong SQLite theo đội xe)', ALL6.every(k => a[k] === 'cho'), JSON.stringify(a));
  // bổ sung số liệu cho lô B (phiếu cân, ngày lập, số tiền…), giữ nguyên trạng thái in đã lưu và lô A
  const cur = await w.evaluate(() => window.hak.loadSync().db), fb = cur.rs.own1.forests.fb;
  Object.assign(fb, {exp: Object.assign({}, fb.exp, EXP1), pc: PCx('B').map(r => Object.assign(r, {maRung: 'R-B'})), info: Object.assign({}, fb.info, {khoiLuong: 29.75})});
  ok('ca 2: lưu số liệu bổ sung', (await saveDb(cur)).ok);
  await app.close(); ({app, w} = await launch());
  await open('fb'); a = await adv();
  ok('ca 2: đóng mở lại sau khi bổ sung: app đề nghị IN ĐÈ đúng sáu mục (đúng mẫu, đúng từng đội xe)', ALL6.every(k => a[k] === 'de'), JSON.stringify(a));
  const D = await grab('#d2Card .docrow [data-act=d2dl][data-mode=de]');
  ok('ca 2: gói in đè đủ sáu file, cùng tập file với tờ nền, không “BẢN NHÁP”', /IN_DE/.test(D.name) && JSON.stringify(Object.keys(D.docs).map(goc).sort()) === JSON.stringify(Object.keys(N.docs).map(goc).sort()) && khongNhap(D.name, D.docs), D.name);
  { const g = (c, b) => (boCua(D.docs, c, b)[0] || [])[1], t = x => (x ? plain(x.xml) : '');
    ok('ca 2: in đè BM-09 / BM-10 đúng bộ vận chuyển: đội xe 92C-12345 có B1, B3; đội xe 92C-67890 chỉ có B2', /B1/.test(t(g('09', '92C-12345'))) && /B3/.test(t(g('09', '92C-12345'))) && !/B2/.test(t(g('09', '92C-12345'))) && /B2/.test(t(g('09', '92C-67890'))) && !/B1|B3/.test(t(g('09', '92C-67890'))) && !/92C-12345/.test(t(g('10', '92C-67890'))) && !/92C-67890/.test(t(g('10', '92C-12345'))));
    ok('ca 2: BM-09 in đè có trang Bảng kê khối lượng đính kèm, bắt đầu ở trang mới (ngắt trang trước bảng kê)', ['92C-12345', '92C-67890'].every(b => { const x = g('09', b).xml, i = x.indexOf('BẢNG KÊ KHỐI LƯỢNG ĐÍNH KÈM'); return i > 0 && /w:type="page"|<w:sectPr/.test(x.slice(Math.max(0, x.lastIndexOf('<w:p ', i) - 4000), i)); })); }
  const fD = luu('ca2-2-in-de', D.name, D.docs);
  await open('fa'); a = await adv(); ok('lô A không bị ảnh hưởng bởi ca 2 (vẫn đề nghị giấy trắng)', ALL6.every(k => a[k] === 'trang'));
  ok('không có lỗi JavaScript', w.errs.length === 0, w.errs.join('|'));
  await app.close();

  // ===== Đối chiếu bằng PDF (LibreOffice): số trang, chồng ảnh tờ nền + phần in đè =====
  if (!sof) console.log('BỎ QUA  không có LibreOffice: chưa đổi PDF, chưa chồng ảnh');
  else {
    const py = path.join(dir, 'chong.py');
    fs.writeFileSync(py, [
      'import sys, json, subprocess, os', 'from PIL import Image', 'import numpy as np',
      'nen, de, png = sys.argv[1], sys.argv[2], sys.argv[3]',
      'def p1(pdf, tag):', '    pre = os.path.join(os.path.dirname(png), os.path.basename(pdf)[:-4] + "-" + tag)',
      '    subprocess.run(["pdftoppm", "-r", "80", "-f", "1", "-l", "1", "-png", "-singlefile", pdf, pre], check=True)', '    return np.array(Image.open(pre + ".png").convert("L"))',
      'A, B = p1(nen, "nen"), p1(de, "de")', 'h, w = min(A.shape[0], B.shape[0]), min(A.shape[1], B.shape[1]); A, B = A[:h, :w], B[:h, :w]', 'a, b, nhat = A < 150, B < 150, A < 235',
      'img = np.full((h, w, 3), 255, np.uint8); img[a] = (150, 150, 150); img[b] = (220, 0, 0); img[a & b] = (90, 0, 0)',
      'Image.fromarray(img).save(png)',
      'ra = nhat.any(axis=1); rows = [i for i in range(h) if b[i].any()]',
      'lines_ok = all(ra[max(0, i - 3):i + 4].any() for i in rows)',
      'print(json.dumps({"ink_nen": int(a.sum()), "ink_de": int(b.sum()), "ty_le": round(float(b.sum()) / max(1, int(a.sum())), 3), "dong_khop": lines_ok, "chong": round(float((a & b).sum()) / max(1, int(b.sum())), 3)}))'
    ].join('\n'));
    const deTheoGoc = Object.fromEntries(Object.keys(fD).map(n => [goc(n), fD[n]]));
    for (const n of Object.keys(fN)) {
      const pn = pdfOf(fN[n]), pd = pdfOf(deTheoGoc[goc(n)]), png = path.join(OUT, 'chong-anh', n.replace(/[\\/]+/g, '__').replace(/\.docx$/, '.png')); fs.mkdirSync(path.dirname(png), {recursive: true});
      const r = JSON.parse(cp.execFileSync('python3', [py, pn, pd, png], {encoding: 'utf8'})), tn = soTrang(pn), td = soTrang(pd), la09 = /(^|\/)09_/.test(n), la10 = /(^|\/)10_/.test(n);
      ok('PDF ' + n + ': phần in đè trang 1 không chạm chữ đã in trên tờ nền (chồng < 2%), mực in đè < 25% tờ nền' + (r.dong_khop ? '' : ' — có dòng in vào khoảng giữ chỗ trống của tờ nền') + ' (ảnh chồng: ' + path.relative(root, png) + ')', r.chong < 0.02 && r.ty_le < 0.25, JSON.stringify(r));
      ok('PDF ' + n + ': số trang ' + (la09 || la10 ? 'in đè = tờ nền + trang bảng kê đính kèm (giấy mới)' : 'in đè = tờ nền'), la09 || la10 ? td >= tn + 1 : td === tn, tn + ' / ' + td);
      if (la09) { const tx = cp.execFileSync('pdftotext', ['-f', String(tn + 1), '-l', String(td), pd, '-'], {encoding: 'utf8'}); ok('PDF ' + n + ': trang bảng kê (in trên giấy mới) có tiêu đề và đủ phiếu của đội xe', /BẢNG KÊ/.test(tx) && /B\d/.test(tx), tx.slice(0, 200)); }
    }
    for (const n of Object.keys(fT)) { const p = pdfOf(fT[n]), tx = cp.execFileSync('pdftotext', [p, '-'], {encoding: 'utf8'}); ok('PDF giấy trắng ' + n + ': mở được, có nội dung, không “BẢN NHÁP”', soTrang(p) >= 1 && tx.length > 200 && !/BẢN NHÁP/.test(tx)); }
  }
  fs.writeFileSync(path.join(OUT, 'ket-qua.json'), JSON.stringify({luc: new Date().toISOString(), libreoffice: !!sof, kq}, null, 1));
  console.log('File Word, PDF và ảnh chồng: ' + OUT);
  console.log(fail ? 'CÓ ' + fail + ' LỖI' : 'TẤT CẢ ĐẠT'); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
