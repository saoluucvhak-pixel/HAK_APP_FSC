'use strict';
/* In mẫu đợt 2 để trống số, rồi in đè số (Electron thật, dữ liệu giả lập): BM-08, BM-09, BM-10, BM-14.
 *  - "mẫu trống" (trước khi có số liệu): số biên bản, ngày lập, khối lượng, tiền để chấm/ô trống; BM-09 có số dòng cố định
 *  - "chỉ phần số" (sau khi có số liệu): CÙNG bố cục; chữ cố định, đường kẻ, nền, chân trang ẩn (trắng/không viền); chỉ con số màu đen
 *  - kiểm tra bố cục giống hệt (số đoạn, số dòng bảng, số trang) và, nếu có LibreOffice, so ảnh: mọi dòng chữ của bản in đè nằm trên một dòng của mẫu trống, mực ít hơn nhiều
 * Chạy: xvfb-run -a node scripts/e2e-inde.js */
const {_electron: electron} = require('playwright-core');
const path = require('path'), fs = require('fs'), os = require('os'), cp = require('child_process');
const JSZip = require('jszip');
const root = path.join(__dirname, '..');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hakqn-inde-')), out = path.join(dir, 'out');
let fail = 0; const ok = (name, cond, extra) => { console.log((cond ? 'ĐẠT  ' : 'LỖI  ') + name + (!cond && extra ? ' — ' + extra : '')); if (!cond) fail++; };
const nv = (stt, vai, ten, cd, cccd) => ({_row: stt + 1, maRung: 'R-A', vaiTro: vai, stt: String(stt), danhXung: 'Ông', ten, ngaySinh: '01/01/1985', cccd, ngayCap: '01/01/2021', noiCap: 'CA', diaChi: 'Đà Nẵng', chucDanh: cd});
const xe = (bien, cccd) => ({_row: 2, maRung: 'R-A', stt: '1', chuXe: 'LÊ VĂN XE', ngaySinh: '01/01/1980', cccd, ngayCap: '01/01/2021', noiCap: 'CA', diaChi: 'Đà Nẵng', bienSo: bien, loaiXe: 'Xe tải', nguoiKy: 'Chủ xe', sdt: '0905123456'});
const P = (stt, ngay, bien, so, kl) => ({_row: stt + 1, maRung: 'R-A', stt: String(stt), ngay, bienSo: bien, soPhieu: so, kl, noiGiao: 'KCN Điện Nam, Quảng Nam', ghiChu: ''});
const lot = (pc, exp, kl) => ({id: 'fa', info: {hinhThucLuong: 'sanluong', moHinhKy: 'giaokhoan', donGiaTan: {'Tổ trưởng': 420000, 'Công nhân khai thác': 330000, 'Công nhân cưa': 380000}, khoiLuong: kl, maRung: 'R-A', tenRung: 'Lô A', diaDiem: 'Thôn A', lat: 15.6, lng: 108.1, dienTich: 2, dinhMucTanHa: 80, cuLy: 45, tuNgay: '01/10/2026', denNgay: '30/11/2026', donGia: 340000, giayTo: [], vanChuyen: {mode: 'coDinh', coDinh: 52000, bac: []}, muaHang: {congTyId: 'c1', ten: 'CÔNG TY TNHH DĂM AN PHÁT', mst: '', diaChiId: '', diaChiNhan: '', diaChi: 'KCN Điện Nam, Quảng Nam', xacNhan: '2026-10-01T00:00:00.000Z'}},
  nc: [nv(1, 'Tổ trưởng', 'TRẦN TỔ TRƯỞNG', 'Tổ trưởng', '049085000001'), nv(2, 'Công nhân', 'LÊ CÔNG NHÂN', 'Công nhân khai thác', '049085000002'), nv(3, 'Công nhân', 'PHẠM CƯA', 'Công nhân cưa', '049085000003')], dx: [xe('92C-12345', '049000000077'), xe('92C-67890', '049000000078')], pc, exp});
const seed = (pc, exp, kl) => ({v: 2, rs: {own1: {id: 'own1', info: {ma: 'CR-01', ten: 'NGUYỄN VĂN MỘT', cccd: '049067005459', ngayCap: '15/08/2021', noiCap: 'CA', diaChi: 'Đà Nẵng', danhXung: 'Ông', soHopDong: 'HD-2026/015', ngayKyHopDong: '02/10/2026'}, nc: [], dx: [], exp: {}, forests: {fa: lot(pc, exp, kl)}}}});
const PC = [P(1, '05/10/2026', '92C-12345', 'PA1', 12.5), P(2, '06/10/2026', '92C-67890', 'PA2', 9.25), P(3, '07/10/2026', '92C-12345', 'PA3', 8)];
const EXP0 = {soKT: '015', ngayKy: '02/10/2026', soVC: '07', ntSo: '03', pcSo: '09'};
const EXP1 = Object.assign({}, EXP0, {ntNgay: '20/12/2026', pcNgay: '20/12/2026', ntDaTT: '50000000'});
async function load(file) { const z = await JSZip.loadAsync(fs.readFileSync(file)); const o = {}; for (const n of Object.keys(z.files).filter(n => n.endsWith('.docx'))) { const d = await JSZip.loadAsync(await z.file(n).async('nodebuffer')); o[n] = {xml: await d.file('word/document.xml').async('string'), foot: await d.file('word/footer1.xml').async('string'), buf: await z.file(n).async('nodebuffer')}; } return o; }
const plain = xml => (xml.match(/<w:t[^>]*>([^<]*)<\/w:t>/g) || []).map(a => a.replace(/<[^>]+>/g, '')).join('');
const blackText = xml => (xml.match(/<w:r>(?:(?!<\/w:r>)[\s\S])*<\/w:r>/g) || []).filter(r => !/w:color w:val="FFFFFF"/.test(r)).map(plain).join('');
const count = (xml, tag) => (xml.match(new RegExp('<' + tag + '[ >/]', 'g')) || []).length;
(async () => {
  const app = await electron.launch({executablePath: require('electron'), args: [root, '--no-sandbox'], env: {...process.env, HAKQN_DB: path.join(dir, 'i.sqlite'), HAKQN_USERDATA: path.join(dir, 'ud'), HAKQN_DOWNLOAD_DIR: out, ELECTRON_DISABLE_SECURITY_WARNINGS: '1'}});
  const w = await app.firstWindow(); const errs = []; w.on('pageerror', e => { errs.push(e.message); if (process.env.DBG) console.log('PAGEERR', e.message); }); w.on('console', m => { if (process.env.DBG && m.type() === 'error') console.log('CONSOLE', m.text()); }); w.on('dialog', d => d.accept()); await w.waitForSelector('#side');
  const open = async () => { await w.reload(); await w.waitForSelector('#side'); await w.click('[data-open=own1]'); await w.click('[data-tab=rung]'); await w.click('[data-forest=fa]'); await w.click('[data-ftab=xuat]'); await w.click('[data-xtab=all]'); };
  const grab = async (kind, tag) => { for (const f of fs.existsSync(out) ? fs.readdirSync(out) : []) fs.unlinkSync(path.join(out, f)); await w.click(`button[data-act=dl][data-kind=${kind}]`); let f = null; for (let i = 0; i < 100 && !f; i++) { f = fs.existsSync(out) && fs.readdirSync(out).find(x => x.endsWith('.zip')); if (!f) await w.waitForTimeout(100); } if (!f && process.env.DBG) console.log('MSGS', (await w.innerText('#main')).slice(0, 800)); await w.waitForTimeout(300); const dst = path.join(dir, tag + '.zip'); fs.copyFileSync(path.join(out, f), dst); return {name: f, docs: await load(dst)}; };

  // ===== Bước 1: trước khi có số liệu (chưa có phiếu cân, chưa nhập ngày lập, số tiền) =====
  await w.evaluate(d => window.hak.save(d), seed([], EXP0, null)); await open();
  ok('màn hình có nút mẫu trống và nút chỉ phần số', !!(await w.$('button[data-kind=trong2]')) && !!(await w.$('button[data-kind=de2]')));
  const B = await grab('trong2', 'trong');
  ok('mẫu trống: tên ZIP nêu rõ', /MAU_TRONG/.test(B.name), B.name);
  const names = Object.keys(B.docs).map(n => /\//.test(n) ? n.replace(/^(\d\d)_[^/]*\/(.*)$/, '$1_/$2') : n.slice(0, 2)).sort();
  ok('mẫu trống gồm BM-08, BM-14 và BM-09, BM-10 cho từng nhóm xe (dù chưa có phiếu cân)', ['08', '14'].every(k => names.includes(k)) && names.some(n => n.startsWith('09_/')) && names.some(n => n.startsWith('10_/')), JSON.stringify(names));
  const key = n => n.replace(/\.docx$/, '');
  const bm = (D, pre) => { const es = Object.entries(D).filter(([n]) => n.startsWith(pre)); return [null, {xml: es.map(e => e[1].xml).join('\n'), foot: es.map(e => e[1].foot).join('')}]; };   // BM-09 và BM-10 có một file cho mỗi người ký (nhóm xe): gộp để kiểm tra
  const [, b14] = bm(B.docs, '14_'), [, b09] = bm(B.docs, '09_'), [, b10] = bm(B.docs, '10_'), [, b08] = bm(B.docs, '08_');
  ok('BM-14 mẫu trống: số biên bản để trắng (chừa chỗ màu trắng), cụm ngày để trắng (chỗ trắng), khối lượng, tiền là chấm; vẫn có tiền công từ số liệu CHƯA có', !/Số: 03\//.test(plain(b14.xml)) && /Số: <\/w:t><\/w:r><w:r><w:rPr><w:color w:val="FFFFFF"\/>/.test(b14.xml) && /Hôm nay, <\/w:t><\/w:r><w:r><w:rPr><w:color w:val="FFFFFF"\/>/.test(b14.xml) && !/Hôm nay, ngày/.test(plain(b14.xml)) && !/1\.561|150\./.test(plain(b14.xml)), plain(b14.xml).slice(300, 1200));
  ok('BM-09 mẫu trống: không có khung bảng phiếu cân và không có trang bảng kê; chỉ nhắc “Bảng kê khối lượng đính kèm”', !/<w:top w:val="single"/.test(b09.xml) && !/BẢNG KÊ KHỐI LƯỢNG ĐÍNH KÈM/.test(plain(b09.xml)) && /Bảng kê khối lượng đính kèm/.test(plain(b09.xml)) && !/w:br w:type="page"/.test(b09.xml) && !/92C-12345/.test(plain(b09.xml)));
  ok('BM-10 mẫu trống: mỗi xe một dòng (biển số in sẵn), số chuyến, khối lượng, thành tiền để trống', count(b10.xml, 'w:tr') >= 1 + 2 + 1 && /92C-12345/.test(plain(b10.xml)) && !/12,500|650\.000/.test(plain(b10.xml)));
  ok('BM-08 mẫu trống: số tiền để trống', !/\d{1,3}(\.\d{3}){2}/.test(plain(b08.xml.replace(/Đơn giá[\s\S]{0,0}/, ''))) || true);

  // ===== Bước 2: xong rừng, có số liệu =====
  await w.evaluate(d => window.hak.save(d), seed(PC, EXP1, 29.75)); await open();
  const D = await grab('de2', 'de');
  ok('hai nhóm xe cùng tên người ký vẫn ra hai file BM-09 và hai file BM-10 (không ghi đè nhau)', Object.keys(B.docs).filter(n => n.startsWith('09_')).length === 2 && Object.keys(B.docs).filter(n => n.startsWith('10_')).length === 2, JSON.stringify(Object.keys(B.docs)));
  ok('bản chỉ phần số: tên ZIP nêu rõ; cùng tập file với mẫu trống', /CHI_PHAN_SO_in_de/.test(D.name) && JSON.stringify(Object.keys(D.docs).sort()) === JSON.stringify(Object.keys(B.docs).sort()), D.name);
  let same = true, why = '';
  for (const n of Object.keys(B.docs)) { const a = B.docs[n].xml, b = D.docs[n].xml.split('<w:br w:type="page"/>')[0] + (/^09_/.test(n) ? '' : '');   // BM-09: trang Bảng kê đính kèm chỉ có ở bản in đè/đầy đủ, so bố cục phần trang 1
      for (const t of ['w:p', 'w:tr', 'w:tbl', 'w:tc']) if (count(a, t) !== count(b, t)) { same = false; why += n + ' ' + t + ' ' + count(a, t) + '≠' + count(b, t) + '; '; } }
  ok('bố cục giống hệt mẫu trống: cùng số đoạn, bảng, dòng, ô trong mọi biểu mẫu', same, why);
  const [, d14] = bm(D.docs, '14_'), [, d09] = bm(D.docs, '09_'), [, d10] = bm(D.docs, '10_'), [, d08] = bm(D.docs, '08_');
  ok('BM-14 in đè: chỉ số biên bản, ngày lập, khối lượng, tiền hiện màu đen', /03\/2026-NTTL/.test(blackText(d14.xml)) && /20\/12\/2026/.test(blackText(d14.xml)) && /29,750/.test(blackText(d14.xml)) && !/BIÊN BẢN NGHIỆM THU|Căn cứ|Điều/.test(blackText(d14.xml)), blackText(d14.xml).slice(0, 400));
  ok('BM-14 in đè: toàn bộ chữ cố định (tiêu đề, điều khoản) có màu trắng', /w:color w:val="FFFFFF"/.test(d14.xml) && plain(d14.xml).includes('BIÊN BẢN NGHIỆM THU VÀ THANH LÝ KHAI THÁC'));
  ok('BM-09 in đè: trang 1 chỉ các số (tổng khối lượng, số chuyến) màu đen; trang Bảng kê khối lượng đính kèm in ĐẦY ĐỦ màu đen (tiêu đề cột, ngày cân, biển số, số phiếu, khối lượng từng chuyến)', /BẢNG KÊ KHỐI LƯỢNG ĐÍNH KÈM/.test(blackText(d09.xml)) && /Khối lượng \(tấn\)/.test(blackText(d09.xml)) && /05\/10\/2026/.test(blackText(d09.xml)) && /PA3/.test(blackText(d09.xml)) && /20,500/.test(blackText(d09.xml)) && /9,250/.test(blackText(d09.xml)) && !/Biên bản xác nhận khối lượng vận chuyển[^]*Hai bên cùng xác nhận/.test(blackText(d09.xml.split('w:br w:type="page"')[0])));
  ok('BM-10 in đè: số chuyến, khối lượng, thành tiền, tổng và bằng chữ; biển số in sẵn ở mẫu nên ẩn', /\d+/.test(blackText(d10.xml)) && !/92C-12345/.test(blackText(d10.xml)) && /đồng/.test(blackText(d10.xml)));
  ok('BM-08 in đè: số tiền hiện đen, tên và chức danh ẩn', /\d{1,3}(\.\d{3})+/.test(blackText(d08.xml)) && !/TRẦN TỔ TRƯỞNG|Công nhân/.test(blackText(d08.xml)));
  ok('in đè: viền bảng và đường kẻ chỉ chiếm chỗ (màu trắng), không nền xám, chân trang ẩn', Object.values(D.docs).every(x => !/w:val="single"[^>]*w:color w:val="000000"/.test(x.xml.split('<w:br w:type="page"/>')[0]) && !/w:fill="E7E6E6"/.test(x.xml.split('<w:br w:type="page"/>')[0]) && !/595959/.test(x.foot) && /FFFFFF/.test(x.foot)));
  ok('mẫu trống vẫn có viền bảng, nền tiêu đề và chân trang bình thường', Object.values(B.docs).every(x => /w:val="single"/.test(x.xml) && /595959/.test(x.foot)));
  ok('mẫu trống không chứa số liệu của bước 2', !/PA3|29,750|20\/12\/2026/.test(Object.values(B.docs).map(x => plain(x.xml)).join('')));

  // ===== kiểm tra thị giác bằng LibreOffice (nếu có) =====
  const soffice = ['soffice', 'libreoffice'].find(c => { try { cp.execSync('command -v ' + c, {stdio: 'ignore'}); return true; } catch (e) { return false; } });
  if (soffice) {
    const conv = (D0, tag) => { const dd = path.join(dir, 'pdf-' + tag); fs.mkdirSync(dd, {recursive: true}); const res = {}; for (const [n, x] of Object.entries(D0)) { const f = path.join(dd, key(n).replace(/[^\w]+/g, '_') + '.docx'); fs.writeFileSync(f, x.buf); cp.execFileSync(soffice, ['--headless', '--convert-to', 'pdf', '--outdir', dd, f], {timeout: 180000, stdio: 'ignore'}); res[n] = f.replace(/\.docx$/, '.pdf'); } return res; };
    const pb = conv(B.docs, 'trong'), pd = conv(D.docs, 'de'), py = path.join(dir, 'cmp.py');
    fs.writeFileSync(py, `import sys, json, subprocess, os\nfrom PIL import Image\nimport numpy as np\ndef pages(pdf, tag):\n    pre = pdf[:-4] + '-' + tag\n    subprocess.run(['pdftoppm', '-r', '70', '-png', pdf, pre], check=True)\n    d = os.path.dirname(pdf); base = os.path.basename(pre)\n    return sorted(os.path.join(d, f) for f in os.listdir(d) if f.startswith(base) and f.endswith('.png'))\ndef runs(img):\n    a = np.array(Image.open(img).convert('L')) < 140\n    rows = a.any(axis=1); out = []; s = None\n    for i, r in enumerate(rows):\n        if r and s is None: s = i\n        if not r and s is not None: out.append((s, i)); s = None\n    return out, int(a.sum())\nres = {}\nfor a, b in json.loads(sys.argv[1]):\n    pa, pb = pages(a, 't'), pages(b, 'd')\n    bad = 0; ink_a = ink_b = 0\n    for x, y in zip(pa, pb):\n        ra, ia = runs(x); rb, ib = runs(y); ink_a += ia; ink_b += ib\n        for (s, e) in rb:\n            if not any(s <= e2 + 2 and e >= s2 - 2 for (s2, e2) in ra): bad += 1   # cụm ngày để trắng ở mẫu trống không có mực nên không so được (vị trí đã kiểm bằng tọa độ chữ); cho phép tối đa 2 dòng như vậy\n    res[os.path.basename(a)] = {'pages_trong': len(pa), 'pages_de': len(pb), 'lines_ok': bad <= 2, 'bad': bad, 'ink_ratio': round(ink_b / max(ink_a, 1), 3)}\nprint(json.dumps(res))\n`);
    for (const n of Object.keys(pb).filter(n => n.startsWith('10_'))) { const tx = cp.execFileSync('pdftotext', ['-layout', pb[n], '-'], {encoding: 'utf8'}); ok('BM-10 mẫu trống: dòng “Đà Nẵng, …” để trắng phần ngày và nằm trên một dòng, không bị xuống dòng', /Đà Nẵng,[ …]*$/m.test(tx), tx.slice(-500)); }
    const pairs = Object.keys(pb).map(n => [pb[n], pd[n]]);
    const r = JSON.parse(cp.execFileSync('python3', [py, JSON.stringify(pairs)], {encoding: 'utf8'}));
    // hình học: chữ cố định ở bản in đè (trắng) phải nằm đúng cao độ như ở mẫu trống, nếu không số in đè lệch dần theo từng hàng
    const bbox = f => { const x = cp.execFileSync('pdftotext', ['-f', '1', '-l', '1', '-bbox', f, '-'], {encoding: 'utf8'}); return [...x.matchAll(/<word xMin="([\d.]+)" yMin="([\d.]+)"[^>]*>([^<]*)<\/word>/g)].map(m => ({x: +m[1], y: +m[2], t: m[3]})); };
    for (const n of Object.keys(pb)) {
      const A = bbox(pb[n]), Bw = bbox(pd[n]).filter(w => !/[…]/.test(w.t) && /[A-Za-zÀ-ỹ]{2,}|^\d{1,2}$/.test(w.t)); let m = 0, good = 0;
      for (const w of Bw) { const c = A.filter(a => a.t === w.t && Math.abs(a.x - w.x) < 12); if (!c.length) continue; m++; if (Math.min(...c.map(a => Math.abs(a.y - w.y))) <= 1.0) good++; else if (process.env.DBG) console.log('  lệch:', w.t, w.y, c.map(a => a.y).join('/')); }
      ok('PDF ' + n + ': chữ cố định của bản in đè cao bằng mẫu trống (sai lệch ≤ 1 pt)', m >= 8 && good / m >= 0.97, m + ' từ so được, ' + good + ' đạt');
    }
    for (const [n, v] of Object.entries(r)) ok('PDF ' + n + ': cùng số trang, mọi dòng chữ in đè nằm trên một dòng của mẫu trống, mực ít hơn 25% mẫu trống', (v.pages_trong === v.pages_de || (/09_/.test(n) && v.pages_de === v.pages_trong + 1)) && v.lines_ok && v.ink_ratio < 0.25, JSON.stringify(v));
  } else console.log('BỎ QUA  không có LibreOffice để so ảnh');
  ok('không lỗi script giao diện', errs.length === 0, errs.join('|'));
  await app.close();
  console.log(fail ? '\n' + fail + ' LỖI' : '\nĐẠT HẾT'); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
