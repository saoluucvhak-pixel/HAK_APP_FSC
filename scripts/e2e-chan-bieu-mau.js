'use strict';
/* Một nguồn quyết định chặn biểu mẫu (Electron thật, SQLite thật, file Word xuất thực tế): lỗi riêng của Đội 2 chỉ chặn biểu mẫu của Đội 2 (BM-01, 08, 14…), không chặn Đội 1;
 * nút tải, gói ZIP, đợt 2 (in bổ sung) cùng đọc danh sách mục chặn của màn Kiểm tra; biểu mẫu không liên quan (BM-04) vẫn xuất; sửa lỗi thì mở lại.
 * Chạy: xvfb-run -a node scripts/e2e-chan-bieu-mau.js */
const {_electron: electron} = require('playwright-core');
const path = require('path'), fs = require('fs'), os = require('os');
const JSZip = require('jszip');
const src = fs.readFileSync(path.join(__dirname, 'e2e-inan2.js'), 'utf8');
const {nv, lot, seed, P} = new Function(src.slice(src.indexOf('const nv ='), src.indexOf('const plain =')) + '; return {nv, lot, seed, P};')();
const root = path.join(__dirname, '..');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hakqn-cbm-'));
let fail = 0; const ok = (name, cond, extra) => { console.log((cond ? 'ĐẠT  ' : 'LỖI  ') + name + (!cond && extra ? ' — ' + extra : '')); if (!cond) fail++; };
(async () => {
  const out = path.join(dir, 'out'); fs.mkdirSync(out, {recursive: true});
  const app = await electron.launch({executablePath: require('electron'), args: [root, '--no-sandbox'], env: {...process.env, HAKQN_CLOSE: 'discard', HAKQN_DB: path.join(dir, 'd.sqlite'), HAKQN_USERDATA: path.join(dir, 'ud'), HAKQN_DOWNLOAD_DIR: out}});
  const w = require('./_hd30').boc(await app.firstWindow()); const errs = []; w.on('pageerror', e => errs.push(e.message)); w.on('dialog', d => d.accept()); await w.waitForSelector('#side');
  const p = (i, vai, ten, cd, doi) => ({...nv(i, vai, ten, cd, '04908500' + String(7000 + i)), maRung: 'R-A', doi});
  const nc = [p(1, 'Tổ trưởng', 'TRẦN MỘT', 'Tổ trưởng', 'Đội 1'), p(2, 'Công nhân', 'LÊ CƯA', 'Công nhân cưa', 'Đội 1'), p(3, 'Công nhân', 'PHẠM KT BA', 'Công nhân khai thác', 'Đội 1'),
    p(5, 'Tổ trưởng', 'NGUYỄN HAI', 'Tổ trưởng', 'Đội 2'), p(6, 'Công nhân', 'HỒ KT SÁU', 'Công nhân khai thác', 'Đội 2')];
  const pcs = [P(1, '05/10/2026', '92C-12345', 'PA1', 12.5, 'Đội 1'), P(2, '06/10/2026', '92C-12345', 'PA2', 9.25, 'Đội 2')];
  const A = lot('fa', 'R-A', {exp: {soKT: '015', ngayKy: '02/10/2026', ntNgay: '20/12/2026', pcNgay: '20/12/2026', soVC: '07', ntSo: '03', pcSo: '09'}, kl: null, nc, pc: pcs.map(x => ({...x, maRung: 'R-A'}))});
  A.info.donGiaTan = {'Tổ trưởng': 420000, 'Công nhân cưa': 380000, 'Công nhân khai thác': 330000}; A.info.tuNgay = '05/10/2026'; A.info.denNgay = '';
  await w.evaluate(d => window.hak.save(d), seed([A])); await w.reload(); await w.waitForSelector('#side');
  const loadF = async () => (await w.evaluate(() => window.hak.loadSync().db)).rs.own1.forests.fa;
  // gán phiếu cho đội; Đội 2 có ngày nghiệm thu 31/11/2026 không có thật (lỗi RIÊNG của Đội 2)
  { const D0 = await w.evaluate(() => window.hak.loadSync().db), f0 = D0.rs.own1.forests.fa, id = ten => f0.doi.find(d => d.ten === ten).id;
    f0.pc.forEach(x => { x.doiId = id(x.soPhieu === 'PA2' ? 'Đội 2' : 'Đội 1'); });
    f0.doi.find(d => d.ten === 'Đội 2').exp = {...(f0.doi.find(d => d.ten === 'Đội 2').exp || {}), ntNgay: '31/11/2026'};
    const r0 = await w.evaluate(d => window.hak.save(d), D0); ok('lưu dữ liệu giả lập (Đội 2 có lỗi riêng)', r0 && r0.ok, JSON.stringify(r0)); await w.reload(); await w.waitForSelector('#side'); }
  const open = async ftab => { if (!(await w.$('[data-ftab=nc]'))) { await w.click('[data-open=own1]'); await w.click('[data-tab=rung]'); await w.click('[data-forest=fa]'); } await w.click('[data-ftab=' + ftab + ']'); await w.waitForTimeout(500); };
  const zipNames = async kind => { for (const f of fs.readdirSync(out)) fs.unlinkSync(path.join(out, f)); await w.click('button[data-act=dl][data-kind=' + kind + ']'); let f = null; for (let i = 0; i < 100 && !f; i++) { f = fs.readdirSync(out).find(x => x.endsWith('.zip') || x.endsWith('.docx')); await w.waitForTimeout(200); } await w.waitForTimeout(500);
    if (f.endsWith('.docx')) return [f]; const z = await JSZip.loadAsync(fs.readFileSync(path.join(out, f))); return Object.keys(z.files).filter(n => !z.files[n].dir); };
  // 1. màn Kiểm tra: mục chặn của Đội 2 kèm biểu mẫu bị chặn
  await open('kt'); const kt = await w.innerText('#main');
  ok('Kiểm tra: có mục chặn riêng của Đội 2 (ngày nhập sai)', /Ngày nhập sai/.test(kt) && /Đội “Đội 2”/.test(kt), kt.slice(0, 400));
  // 2. tab Xuất hồ sơ: nút theo biểu mẫu
  await open('xuat');
  const dis = async kind => (await w.$$eval('button[data-act=dl][data-kind=' + kind + ']', bs => bs.map(b => b.disabled)));
  ok('BM-01 (hợp đồng giao khoán) còn xuất được vì Đội 1 không bị chặn', (await dis('gk')).length > 0 && (await dis('gk')).some(x => !x));
  ok('nút tải đợt 2 (BM-08, 14, …) còn dùng được vì Đội 1 không bị chặn', (await dis('cuoi')).some(x => !x));
  // 3. file thực tế: gói đợt 1 và nút BM-08 chỉ có Đội 1
  let names = await zipNames('all');
  const bm = k => names.filter(n => n.startsWith(k));
  ok('gói “Toàn bộ”: BM-01 và BM-08, BM-14 chỉ của Đội 1 (không có file của Đội 2)', bm('01_HD_Giao_khoan').length === 1 && /Doi_1/i.test(bm('01_HD_Giao_khoan')[0]) && bm('08_').every(n => /Doi_1/i.test(n)) && bm('14_').every(n => /Doi_1/i.test(n)) && !names.some(n => /Doi_2/i.test(n) && /^(01|08|14|20)_/.test(n)), names.join(', '));
  ok('gói “Toàn bộ”: BM-04 hợp đồng vận chuyển vẫn có; BM-02 (một file cho cả lô, gồm người của Đội 2) không có vì lỗi của Đội 2', names.some(n => /^04_/.test(n)) && !names.some(n => /^02_/.test(n)), names.join(', '));
  names = await zipNames('cuoi'); ok('gói đợt 2: BM-08 và BM-14 chỉ của Đội 1 (BM-09, BM-10 của đội xe vẫn có)', names.filter(n => /^(08|14)_/.test(n)).length === 2 && names.filter(n => /^(08|14)_/.test(n)).every(n => /Doi_1/i.test(n)) && names.some(n => /^09_/.test(n)) && names.some(n => /^10_/.test(n)), names.join(', '));
  // 4. đợt 2 (in bổ sung): BM-08, BM-14 của Đội 2 báo thiếu vì mục chặn; của Đội 1 thì không
  const d2 = await w.evaluate(() => window.__d2Missing());
  const m08 = d2.filter(x => x.code === '08'), m14 = d2.filter(x => x.code === '14');
  ok('đợt 2: có đúng hai mục BM-08 (Đội 1, Đội 2) và hai mục BM-14', m08.length === 2 && m14.length === 2, JSON.stringify(d2.map(x => x.code)));
  const mark = x => x.full.some(t => /31\/11\/2026|không có thật/.test(t));
  ok('đợt 2: chỉ một trong hai mục BM-08 và một trong hai mục BM-14 bị chặn vì lỗi của Đội 2', m08.filter(mark).length === 1 && m14.filter(mark).length === 1, JSON.stringify(m08));
  // 5. sửa lỗi của Đội 2 → mọi biểu mẫu của Đội 2 mở lại
  { const D1 = await w.evaluate(() => window.hak.loadSync().db), f1 = D1.rs.own1.forests.fa; f1.doi.find(d => d.ten === 'Đội 2').exp.ntNgay = '20/12/2026'; await w.evaluate(d => window.hak.save(d), D1); await w.reload(); await w.waitForSelector('#side'); }
  await open('xuat'); names = await zipNames('all');
  ok('sau khi sửa lỗi Đội 2: gói “Toàn bộ” có đủ BM-01 và BM-02 của cả hai đội', bm('01_HD_Giao_khoan').length === 2 && names.some(n => /^02_/.test(n)), names.join(', '));
  names = await zipNames('cuoi'); ok('sau khi sửa: gói đợt 2 có BM-08 và BM-14 của cả hai đội', names.filter(n => /^08_/.test(n)).length === 2 && names.filter(n => /^14_/.test(n)).length === 2, names.join(', '));
  // 6. dữ liệu không bị sửa bởi việc chặn xuất
  const F = await loadF(); ok('không xóa, không sửa dữ liệu của lô: vẫn 2 đội, 5 người, 2 phiếu cân', F.doi.length === 2 && F.nc.length === 5 && F.pc.length === 2);
  ok('không có lỗi script trên màn hình', errs.length === 0, errs.join(' | '));
  await app.close(); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
