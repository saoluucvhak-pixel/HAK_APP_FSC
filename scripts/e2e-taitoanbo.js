'use strict';
/* “Tải toàn bộ” khi đã có tờ nền đợt 2 in sẵn (Electron thật): hiện danh sách mẫu và bộ vận chuyển, cho chọn in đè hay in lại đầy đủ trên giấy trắng; hai loại giấy tách gói, tên khác nhau;
 * mẫu nền và phần in đè không có chữ BẢN NHÁP; chưa in nền thì tải toàn bộ như bình thường (không hỏi).
 * Chạy: xvfb-run -a node scripts/e2e-taitoanbo.js */
const {_electron: electron} = require('playwright-core');
const path = require('path'), fs = require('fs'), os = require('os');
const JSZip = require('jszip');
const src = fs.readFileSync(path.join(__dirname, 'e2e-inan2.js'), 'utf8');
const {lot, seed, PC, EXP1} = new Function(src.slice(src.indexOf('const nv ='), src.indexOf('const plain =')) + '; return {lot, seed, PC, EXP1};')();
const root = path.join(__dirname, '..');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hakqn-ttb-')), out = path.join(dir, 'out');
let fail = 0; const ok = (name, cond, extra) => { console.log((cond ? 'ĐẠT  ' : 'LỖI  ') + name + (!cond && extra ? ' — ' + extra : '')); if (!cond) fail++; };
const plain = xml => (xml.match(/<w:t[^>]*>([^<]*)<\/w:t>/g) || []).map(a => a.replace(/<[^>]+>/g, '')).join('');
const clean = () => { fs.mkdirSync(out, {recursive: true}); for (const f of fs.readdirSync(out)) fs.unlinkSync(path.join(out, f)); };
const files = () => fs.existsSync(out) ? fs.readdirSync(out).filter(f => /\.zip$/.test(f)).sort() : [];
const names = async f => Object.keys((await JSZip.loadAsync(fs.readFileSync(path.join(out, f)))).files).filter(n => n.endsWith('.docx'));
(async () => {
  const app = await electron.launch({executablePath: require('electron'), args: [root, '--no-sandbox'], env: {...process.env, HAKQN_CLOSE: 'discard', HAKQN_DB: path.join(dir, 't.sqlite'), HAKQN_USERDATA: path.join(dir, 'ud'), HAKQN_DOWNLOAD_DIR: out, ELECTRON_DISABLE_SECURITY_WARNINGS: '1'}});
  const w = await app.firstWindow(); const errs = []; w.on('pageerror', e => errs.push(e.message)); w.on('dialog', d => d.accept()); await w.waitForSelector('#side');
  const L = lot('fa', 'R-A', {exp: {...EXP1}, pc: PC, kl: 29.75}); L.info.donGia = 340000;
  await w.evaluate(d => window.hak.save(d), seed([L])); await w.reload(); await w.waitForSelector('#side');
  const open = async () => { await w.reload(); await w.waitForSelector('#side'); await w.click('[data-open=own1]'); await w.click('[data-tab=rung]'); await w.click('[data-forest=fa]'); await w.click('[data-ftab=xuat]'); await w.click('[data-xtab=all]'); await w.waitForSelector('#d2Table'); };
  const waitFiles = async n => { for (let i = 0; i < 160 && files().length < n; i++) await w.waitForTimeout(150); await w.waitForTimeout(500); };
  await open();

  // 1. chưa in nền: tải toàn bộ như bình thường, không hỏi
  clean(); await w.$eval('button[data-act=dl][data-kind=all]', b => b.click()); await waitFiles(1);
  ok('chưa in nền: “Tải toàn bộ” tải ngay, không hỏi', files().length === 1 && !(await w.$('#allqDe')) && /_all\.zip$/.test(files()[0]), files().join(','));

  // 2. đã xác nhận in nền: hiện danh sách và lựa chọn
  await w.click('#d2Card button[data-act=d2confirm][data-keys*="|"]'); await w.waitForFunction(() => document.querySelectorAll('#d2Table tr[data-adv=de]').length >= 4);
  clean(); await w.$eval('button[data-act=dl][data-kind=all]', b => b.click()); await w.waitForSelector('#allqDe');
  const rowsTxt = await w.innerText('#stBody');
  ok('đã in nền: hộp chọn liệt kê BM-08, BM-14 và từng bộ vận chuyển BM-09, BM-10 (2 người vận chuyển), mỗi mẫu “Phần in đè”; chưa tải gì', (await w.$$('#stBody tr[data-allq]')).length === 6 && /Bảng thanh toán tiền công/.test(rowsTxt) && /Nghiệm thu/.test(rowsTxt) && (rowsTxt.match(/Phần in đè/g) || []).length === 6 && files().length === 0, rowsTxt.slice(0, 500));
  // 3. chọn in đè: hai gói tách riêng
  await w.click('#allqDe'); await waitFiles(2); const fs2 = files();
  const dau = fs2.find(f => /dot1/.test(f)), de = fs2.find(f => /IN_DE/.test(f));
  ok('chọn “theo tờ đã in”: ra 2 gói riêng — hồ sơ đợt 1 và phần in đè đợt 2 — tên khác nhau', fs2.length === 2 && !!dau && !!de, fs2.join(', '));
  const deNames = await names(de), dauNames = await names(dau);
  ok('gói in đè có đủ 6 file (BM-08, BM-14, 2 bộ BM-09, 2 bộ BM-10), tên có hậu tố _IN_DE; gói đợt 1 không chứa BM-08/09/10/14', deNames.length === 6 && deNames.every(n => /_IN_DE\.docx$/.test(n)) && !dauNames.some(n => /^(08|09|10|14)_/.test(n)), JSON.stringify([deNames, dauNames.filter(n => /^(08|09|10|14)_/.test(n))]));
  let bad = false; for (const n of deNames) { const z = await JSZip.loadAsync(await (await JSZip.loadAsync(fs.readFileSync(path.join(out, de)))).file(n).async('nodebuffer')); for (const part of ['word/document.xml', 'word/footer1.xml']) { const f = z.file(part); if (f && /BẢN NHÁP/.test(plain(await f.async('string')))) bad = true; } }
  ok('phần in đè sạch chữ BẢN NHÁP (thân, chân trang) và tên file không có BAN_NHAP', !bad && !/BAN_NHAP/.test(fs2.join(',')));
  // 4. chọn in lại đầy đủ: một gói giấy trắng
  clean(); await w.$eval('button[data-act=dl][data-kind=all]', b => b.click()); await w.waitForSelector('#allqFull'); await w.click('#allqFull'); await waitFiles(1);
  ok('chọn “In lại đầy đủ trên giấy trắng”: tải gói toàn bộ đầy đủ (như bình thường), không có hậu tố in đè', files().length === 1 && /_all\.zip$/.test(files()[0]) && !(await names(files()[0])).some(n => /_IN_DE|MAU_NEN/.test(n)), files().join(','));
  // 4b. đối soát tiền công: BM-08 và BM-14 cùng một tổng, khớp bảng tính tay (khối lượng 29,75 t chia đều 3 người; mỗi người làm tròn đồng)
  const zf = await JSZip.loadAsync(fs.readFileSync(path.join(out, files()[0]))), txt = async re => { const n = Object.keys(zf.files).find(x => re.test(x)); return n ? plain(await (await JSZip.loadAsync(await zf.file(n).async('nodebuffer'))).file('word/document.xml').async('string')) : ''; };
  const each = 29.75 / 3, T = [420000, 330000, 380000].map(r => Math.round(each * r)), tot = T.reduce((a, b) => a + b, 0), vn = n => n.toLocaleString('vi-VN');
  const t08 = await txt(/^08_/), t14 = await txt(/^14_/);
  ok('tiền công khớp bảng tay: ' + T.map(vn).join(' + ') + ' = ' + vn(tot) + ' đồng; BM-08 có từng khoản và tổng, BM-14 nêu cùng tổng', T.every(v => t08.includes(vn(v))) && t08.includes(vn(tot)) && t14.includes(vn(tot)), vn(tot) + ' | ' + t08.slice(0, 200) + ' | ' + t14.slice(0, 200));
  // 5. Hủy: không tải gì
  clean(); await w.$eval('button[data-act=dl][data-kind=all]', b => b.click()); await w.waitForSelector('#allqCancel'); await w.click('#allqCancel'); await w.waitForTimeout(400);
  ok('Hủy: không tải gì', files().length === 0);
  // 6. đợt 2 riêng (cuoi) cũng hỏi; chọn in đè chỉ ra phần in đè
  clean(); await w.$eval('button[data-act=dl][data-kind=cuoi]', b => b.click()); await w.waitForSelector('#allqDe'); await w.click('#allqDe'); await waitFiles(1);
  ok('“Tải đợt 2” khi đã in nền: chọn in đè chỉ ra gói in đè (không kèm hồ sơ đợt 1)', files().length === 1 && /IN_DE/.test(files()[0]), files().join(','));
  ok('không có lỗi JavaScript', errs.length === 0, errs.join('|'));
  await app.close(); console.log(fail ? 'CÓ ' + fail + ' LỖI' : 'TẤT CẢ ĐẠT'); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
