'use strict';
/* Bất biến của quy trình theo đợt (Electron thật): các biểu mẫu ĐỢT 1 chỉ phụ thuộc dữ liệu đợt 1 (chủ rừng, rừng, nhân công, đội xe, đơn giá, ngày ký, địa chỉ giao).
 * Nếu thêm phiếu cân, khối lượng thực tế, ngày lập biên bản nghiệm thu / xác nhận khối lượng, số tiền đã thanh toán (dữ liệu ĐỢT 2) thì mọi file đợt 1 phải GIỐNG HỆT.
 * Nếu không, bản đã in ở đợt 1 sẽ khác bản in lại sau này (trôi phiên bản). Chạy: xvfb-run -a node scripts/e2e-batbien.js */
const {_electron: electron} = require('playwright-core');
const path = require('path'), fs = require('fs'), os = require('os');
const JSZip = require('jszip');
const src = fs.readFileSync(path.join(__dirname, 'e2e-inan2.js'), 'utf8');
const {lot, seed, PC, EXP0, EXP1} = new Function(src.slice(src.indexOf('const nv ='), src.indexOf('const plain =')) + '; return {lot, seed, PC, EXP0, EXP1};')();
const root = path.join(__dirname, '..');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hakqn-bb-')), out = path.join(dir, 'out');
let fail = 0; const ok = (name, cond, extra) => { console.log((cond ? 'ĐẠT  ' : 'LỖI  ') + name + (!cond && extra ? ' — ' + extra : '')); if (!cond) fail++; };
const clearOut = () => { fs.mkdirSync(out, {recursive: true}); for (const f of fs.readdirSync(out)) fs.unlinkSync(path.join(out, f)); };
const plain = xml => (xml.match(/<w:t[^>]*>([^<]*)<\/w:t>/g) || []).map(a => a.replace(/<[^>]+>/g, '')).join('');
(async () => {
  const app = await electron.launch({executablePath: require('electron'), args: [root, '--no-sandbox'], env: {...process.env, HAKQN_DB: path.join(dir, 'b.sqlite'), HAKQN_USERDATA: path.join(dir, 'ud'), HAKQN_DOWNLOAD_DIR: out, ELECTRON_DISABLE_SECURITY_WARNINGS: '1'}});
  const w = await app.firstWindow(); const errs = []; w.on('pageerror', e => errs.push(e.message)); w.on('dialog', d => d.accept()); await w.waitForSelector('#side');
  const pack = async (L, kind) => {
    await w.evaluate(d => window.hak.save(d), seed([L])); await w.reload(); await w.waitForSelector('#side');
    await w.click('[data-open=own1]'); await w.click('[data-tab=rung]'); await w.click('[data-forest=fa]'); await w.click('[data-ftab=xuat]'); await w.click('[data-xtab=all]');
    clearOut(); await w.click('button[data-act=dl][data-kind=' + kind + ']'); let f = null; for (let i = 0; i < 100 && !f; i++) { f = fs.readdirSync(out).find(x => /\.zip$/.test(x)); if (!f) await w.waitForTimeout(150); } await w.waitForTimeout(400);
    const z = await JSZip.loadAsync(fs.readFileSync(path.join(out, fs.readdirSync(out).find(x => /\.zip$/.test(x))))), docs = {};
    for (const n of Object.keys(z.files).filter(n => n.endsWith('.docx'))) { const d = await JSZip.loadAsync(await z.file(n).async('nodebuffer')); docs[n] = plain(await d.file('word/document.xml').async('string')) + '||' + plain(await d.file('word/footer1.xml').async('string')); }
    return docs;
  };
  // dữ liệu đợt 1 giống hệt; chỉ khác dữ liệu đợt 2
  const mk = late => { const L = lot('fa', 'R-A', {exp: late ? {...EXP1, pcSo: '09', ntSo: '03'} : {...EXP0}, pc: late ? PC : [], kl: late ? 29.75 : null}); L.info.donGia = null; return L; };
  const A = await pack(mk(false), 'dau'), B = await pack(mk(true), 'dau');
  const names = Object.keys(A).sort();
  ok('gói đợt 1 có đủ các mẫu (cả hai lần cùng tập file)', names.length >= 12 && JSON.stringify(names) === JSON.stringify(Object.keys(B).sort()), names.length + ' vs ' + Object.keys(B).length);
  const diff = names.filter(n => A[n] !== B[n]);
  ok('BẤT BIẾN: mọi file đợt 1 giống hệt nhau dù đợt 2 chưa có hay đã có dữ liệu (phiếu cân, khối lượng thực tế, ngày lập, tiền)', diff.length === 0, 'file đổi theo dữ liệu đợt 2: ' + diff.join(', '));
  for (const n of diff) { const a = A[n], b = B[n]; let i = 0; while (i < a.length && a[i] === b[i]) i++; console.log('   · ' + n + ' khác tại: …' + a.slice(Math.max(0, i - 40), i + 70) + '  ⟷  …' + b.slice(Math.max(0, i - 40), i + 70)); }
  ok('không có lỗi JavaScript', errs.length === 0, errs.join('|'));
  await app.close(); console.log(fail ? 'CÓ ' + fail + ' LỖI' : 'TẤT CẢ ĐẠT'); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
