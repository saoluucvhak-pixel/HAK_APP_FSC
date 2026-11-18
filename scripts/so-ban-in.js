'use strict';
/* So BẢN IN giữa hai bản mã nguồn: chạy một bộ lô thử (giao khoán tấn / ha, trực tiếp, nhiều đội, hồ sơ cũ còn đơn giá Tổ trưởng + khối lượng nhập tay + khối lượng từng đội, đội xe doanh nghiệp),
 * xuất gói “Toàn bộ hồ sơ” của từng lô và ghi băm word/document.xml của MỌI tài liệu .docx.
 *   node scripts/so-ban-in.js --root <thư mục mã nguồn> --out <file.json>      (ghi băm)
 *   node scripts/so-ban-in.js --so <a.json> <b.json>                            (so hai lần chạy, liệt kê tài liệu khác nhau)
 * Dùng: xvfb-run -a node scripts/so-ban-in.js --root /đường/dẫn --out /tmp/a.json */
const fs = require('fs'), path = require('path'), os = require('os'), crypto = require('crypto');
const arg = k => { const i = process.argv.indexOf(k); return i < 0 ? null : process.argv[i + 1]; };
if (process.argv.includes('--so')) {
  const i = process.argv.indexOf('--so'), A = JSON.parse(fs.readFileSync(process.argv[i + 1], 'utf8')), B = JSON.parse(fs.readFileSync(process.argv[i + 2], 'utf8'));
  const keys = [...new Set([...Object.keys(A), ...Object.keys(B)])].sort(); let same = 0; const diff = [];
  keys.forEach(k => { if (A[k] === B[k]) same++; else diff.push(k + (A[k] == null ? '  (chỉ có ở bản sau)' : B[k] == null ? '  (chỉ có ở bản trước)' : '  (nội dung khác)')); });
  console.log('Tài liệu: ' + keys.length + ' · giống từng byte: ' + same + ' · khác: ' + diff.length); diff.forEach(d => console.log('  KHÁC ' + d)); process.exit(diff.length ? 1 : 0);
}
const {_electron: electron} = require('playwright-core');
const JSZip = require('jszip');
const root = path.resolve(arg('--root') || path.join(__dirname, '..')), out = arg('--out');
const src = fs.readFileSync(path.join(__dirname, 'e2e-inan2.js'), 'utf8');   // dữ liệu thử dùng chung với e2e (cùng một nguồn cho cả hai bản)
const H = new Function(src.slice(src.indexOf('const nv ='), src.indexOf('const plain =') + src.slice(src.indexOf('const plain =')).indexOf('\n')) + '; return {nv, xe, P, lot, seed, PC, EXP0, EXP1};')();
const {nv, xe, lot, seed, PC, EXP1} = H;
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hakqn-sbi-')), dl = path.join(dir, 'out'); fs.mkdirSync(dl);
const clone = x => JSON.parse(JSON.stringify(x));
(async () => {
  const p = (i, vai, ten, cd, doi) => ({...nv(i, vai, ten, cd, '04908500' + String(9000 + i)), doi});
  const L = {};
  L.tan = lot('f1', 'R-1', {exp: EXP1, pc: PC, kl: 40});
  L.ha = lot('f2', 'R-2', {exp: EXP1, pc: PC, kl: null}); L.ha.info.hinhThucLuong = 'ha'; L.ha.info.donGiaHa = {'Tổ trưởng': 9000000, 'Công nhân khai thác': 7000000, 'Công nhân cưa': 8000000}; L.ha.info.dienTich = 2;
  L.truc = lot('f3', 'R-3', {exp: EXP1, pc: PC, kl: 40}); L.truc.info.moHinhKy = 'tructiep';
  L.hai = lot('f4', 'R-4', {exp: EXP1, pc: PC, kl: 30, nc: [p(1, 'Tổ trưởng', 'TRẦN MỘT', 'Tổ trưởng', 'Đội 1'), p(2, 'Công nhân', 'LÊ A', 'Công nhân khai thác', 'Đội 1'), p(3, 'Tổ trưởng', 'NGUYỄN HAI', 'Tổ trưởng', 'Đội 2'), p(4, 'Công nhân', 'PHẠM B', 'Công nhân khai thác', 'Đội 2')]});
  L.haiKl = clone(L.hai); L.haiKl.id = 'f5'; L.haiKl.info.maRung = 'R-5'; L.haiKl.info.klDoi = {'049085009001': 20, '049085009003': 10};   // khối lượng từng đội nhập tay của hồ sơ cũ
  L.cu = lot('f6', 'R-6', {exp: EXP1, pc: PC, kl: 40}); delete L.cu.info.donGiaTan['Tổ trưởng']; L.cu.info.donGia = 340000; L.cu.info.soDoi = 1;   // đơn giá Tổ trưởng hồ sơ cũ
  L.moi = lot('f7', 'R-7', {exp: EXP1, pc: PC, kl: null}); delete L.moi.info.donGia; L.moi.info.khoiLuong = null;   // lô không có trường cũ nào: bản in phải giống từng byte
  L.moi2 = clone(L.hai); L.moi2.id = 'f8'; L.moi2.info.maRung = 'R-8'; delete L.moi2.info.donGia;
  const names = Object.keys(L); names.forEach(k => { L[k] = clone(L[k]); });   // nhân công, xe, phiếu cân của e2e dùng chung một mảng: tách riêng từng lô
  names.forEach(k => { L[k].nc.forEach(r => { r.maRung = L[k].info.maRung; }); L[k].dx.forEach(r => { r.maRung = L[k].info.maRung; }); (L[k].pc || []).forEach(r => { r.maRung = L[k].info.maRung; r.soPhieu = k + '-' + r.soPhieu; }); });   // số phiếu riêng từng lô: các lô thử không được có phiếu giống hệt nhau (kiểm tra chéo lô chặn BM-08, 09, 10, 14)
  const data = seed(names.map(k => L[k]));
  data.dmDoiTac = data.dmDoiTac || [];
  const app = await electron.launch({executablePath: require(path.join(root, 'node_modules', 'electron')), args: [root, '--no-sandbox'], env: {...process.env, HAKQN_CLOSE: 'discard', HAKQN_DB: path.join(dir, 'd.sqlite'), HAKQN_USERDATA: path.join(dir, 'ud'), HAKQN_DOWNLOAD_DIR: dl}});
  const w = require('./_hd30').boc(await app.firstWindow()); w.on('dialog', d => d.accept()); await w.waitForSelector('#side');
  await w.evaluate(d => window.hak.save(d), data); await w.reload(); await w.waitForSelector('#side');
  const res = {};
  for (const k of names) {
    await w.click('[data-open=own1]'); await w.click('[data-tab=rung]'); await w.click('[data-forest=' + L[k].id + ']'); await w.click('[data-ftab=xuat]'); await w.waitForTimeout(400);
    for (const f of fs.readdirSync(dl)) fs.unlinkSync(path.join(dl, f));
    if (process.env.DBG) console.log('GATE>>', k, (await w.innerText('#main')).replace(/\n/g, ' ').slice(0, 700));
    await w.click('button[data-act=dl][data-kind=all]', {timeout: 8000}).catch(() => {});
    /* phiếu #03: lô nhiều đội còn phiếu chưa gán đội hiện hộp cảnh báo; “Vẫn xuất, chia theo số người” xuất đúng như trước (số in không đổi) nên bản in vẫn so được với bản cũ (bản cũ không có hộp: vòng chờ hết hạn, không làm gì) */
    for (let i = 0; i < 10; i++) { if (await w.evaluate(() => !!document.getElementById('chuaGanXuat'))) { await w.evaluate(() => document.getElementById('chuaGanXuat').click()); break; } await w.waitForTimeout(150); }
    let f = null; for (let i = 0; i < 120 && !f; i++) { f = fs.readdirSync(dl).find(x => x.endsWith('.zip')); await w.waitForTimeout(200); } await w.waitForTimeout(600);
    if (!f) { res[k + '/(không xuất được gói)'] = 'x'; continue; }
    const z = await JSZip.loadAsync(fs.readFileSync(path.join(dl, f)));
    for (const n of Object.keys(z.files).filter(n => n.endsWith('.docx')).sort()) {
      const d = await JSZip.loadAsync(await z.file(n).async('nodebuffer')), xml = await d.file('word/document.xml').async('string');
      res[k + '/' + n.replace(/_(R-\d)/g, '_$1')] = crypto.createHash('sha1').update(xml).digest('hex');
      if (arg('--giu')) { const q = path.join(arg('--giu'), k + '__' + n.replace(/[\\/]/g, '__') + '.txt'); fs.mkdirSync(path.dirname(q), {recursive: true}); fs.writeFileSync(q, (xml.match(/<w:t[^>]*>([^<]*)<\/w:t>/g) || []).map(t => t.replace(/<[^>]+>/g, '')).join('\n')); }   // --giu <thư mục>: giữ thêm văn bản từng tài liệu để xem chỗ khác
    }
  }
  await app.close(); fs.writeFileSync(out, JSON.stringify(res, null, 1)); console.log('Đã ghi ' + Object.keys(res).length + ' tài liệu vào ' + out);
})().catch(e => { console.error(e); process.exit(1); });
