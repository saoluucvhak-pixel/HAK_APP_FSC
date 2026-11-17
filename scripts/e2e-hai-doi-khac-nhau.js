'use strict';
/* Lô có hai đội giao khoán, quân số và số công khác nhau (Electron thật, biểu mẫu Word xuất thực tế): số hợp đồng từng đội, danh sách người BM-05, tổng tiền công BM-08 và BM-14 đối chiếu với
 * bảng tính tay; mở lại hồ sơ một đội từ bản cũ (fixture 1.4.x) để xác nhận số văn bản và định mức vẫn đọc đúng. Chạy: xvfb-run -a node scripts/e2e-hai-doi-khac-nhau.js */
const {_electron: electron} = require('playwright-core');
const path = require('path'), fs = require('fs'), os = require('os');
const JSZip = require('jszip'), Database = require('better-sqlite3');
const src = fs.readFileSync(path.join(__dirname, 'e2e-inan2.js'), 'utf8');
const {nv, lot, seed, P} = new Function(src.slice(src.indexOf('const nv ='), src.indexOf('const plain =')) + '; return {nv, lot, seed, P};')();
const root = path.join(__dirname, '..');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hakqn-2doi-'));
let fail = 0; const ok = (name, cond, extra) => { console.log((cond ? 'ĐẠT  ' : 'LỖI  ') + name + (!cond && extra ? ' — ' + extra : '')); if (!cond) fail++; };
const plain = xml => (xml.match(/<w:t[^>]*>([^<]*)<\/w:t>/g) || []).map(a => a.replace(/<[^>]+>/g, '')).join(' ');
const grp = n => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
const launch = (db, ud, out) => electron.launch({executablePath: require('electron'), args: [root, '--no-sandbox'], env: {...process.env, HAKQN_CLOSE: 'discard', HAKQN_DB: db, HAKQN_USERDATA: ud, HAKQN_DOWNLOAD_DIR: out}});
(async () => {
  const out = path.join(dir, 'out'); fs.mkdirSync(out, {recursive: true});
  let app = await launch(path.join(dir, 'd.sqlite'), path.join(dir, 'ud'), out), w = await app.firstWindow(); const errs = []; w.on('pageerror', e => errs.push(e.message)); w.on('dialog', d => d.accept()); await w.waitForSelector('#side');
  // ---- dữ liệu giả lập: Đội 1 = TT + cưa + 2 khai thác (N = 4); Đội 2 = TT + 1 khai thác (N = 2); đơn giá theo tấn ----
  const p = (i, vai, ten, cd, doi) => ({...nv(i, vai, ten, cd, '04908500' + String(7000 + i)), maRung: 'R-A', doi});
  const nc = [p(1, 'Tổ trưởng', 'TRẦN MỘT', 'Tổ trưởng', 'Đội 1'), p(2, 'Công nhân', 'LÊ CƯA', 'Công nhân cưa', 'Đội 1'), p(3, 'Công nhân', 'PHẠM KT BA', 'Công nhân khai thác', 'Đội 1'), p(4, 'Công nhân', 'ĐỖ KT BỐN', 'Công nhân khai thác', 'Đội 1'),
    p(5, 'Tổ trưởng', 'NGUYỄN HAI', 'Tổ trưởng', 'Đội 2'), p(6, 'Công nhân', 'HỒ KT SÁU', 'Công nhân khai thác', 'Đội 2')];
  const pcs = [P(1, '05/10/2026', '92C-12345', 'PA1', 12.5, 'Đội 1'), P(2, '06/10/2026', '92C-67890', 'PA2', 9.25, 'Đội 2'), P(3, '07/10/2026', '92C-12345', 'PA3', 8, 'Đội 1')];
  const A = lot('fa', 'R-A', {exp: {soKT: '015', ngayKy: '02/10/2026', ntNgay: '20/12/2026', pcNgay: '20/12/2026'}, kl: null, nc, pc: pcs.map(x => ({...x, maRung: 'R-A'}))});
  A.info.donGiaTan = {'Tổ trưởng': 420000, 'Công nhân cưa': 380000, 'Công nhân khai thác': 330000}; A.info.tuNgay = '05/10/2026'; A.info.denNgay = '';
  await w.evaluate(d => window.hak.save(d), seed([A])); await w.reload(); await w.waitForSelector('#side');
  await w.click('[data-open=own1]'); await w.click('[data-tab=rung]'); await w.click('[data-forest=fa]');
  // gán phiếu cho đội đúng như bảng tính tay
  { const D0 = await w.evaluate(() => window.hak.loadSync().db), f0 = D0.rs.own1.forests.fa, id = ten => f0.doi.find(d => d.ten === ten).id;
    f0.pc.forEach(x => { x.doiId = id(x.soPhieu === 'PA2' ? 'Đội 2' : 'Đội 1'); }); await w.evaluate(d => window.hak.save(d), D0); await w.reload(); await w.waitForSelector('#side'); await w.click('[data-open=own1]'); await w.click('[data-tab=rung]'); await w.click('[data-forest=fa]'); }   // gán phiếu cho đội như bảng tính tay
  const F0 = (await w.evaluate(() => window.hak.loadSync().db)).rs.own1.forests.fa;
  const idDoi = ten => F0.doi.find(d => d.ten === ten).id; const gan = (await w.evaluate(() => window.hak.loadSync().db)).rs.own1.forests.fa.pc.map(x => ({so: x.soPhieu, doi: x.doi, doiId: x.doiId}));
  ok('hai đội với quân số khác nhau (4 người và 2 người)', F0.doi.length === 2 && F0.nc.filter(r => r.doiId === idDoi('Đội 1')).length === 4 && F0.nc.filter(r => r.doiId === idDoi('Đội 2')).length === 2, JSON.stringify(F0.doi.map(d => d.ten)));
  ok('phiếu cân đã gán đúng đội (PA1, PA3 → Đội 1; PA2 → Đội 2)', gan.filter(x => x.doiId === idDoi('Đội 1')).length === 2 && gan.filter(x => x.doiId === idDoi('Đội 2')).length === 1, JSON.stringify(gan));
  // ---- bảng tính tay: tiền người i = làm tròn(sản lượng đội ÷ N × đơn giá vị trí i); tổng = tổng từng người ----
  const tay = (vol, rates) => rates.reduce((s, r) => s + Math.round(vol / rates.length * r), 0);
  const tong1 = tay(20.5, [420000, 380000, 330000, 330000]), tong2 = tay(9.25, [420000, 330000]);
  // ---- xuất gói toàn bộ ----
  await w.click('[data-ftab=xuat]'); await w.waitForTimeout(400); await w.click('button[data-act=dl][data-kind=all]');
  let f = null; for (let i = 0; i < 100 && !f; i++) { f = fs.readdirSync(out).find(x => x.endsWith('.zip')); await w.waitForTimeout(200); } await w.waitForTimeout(500);
  const z = await JSZip.loadAsync(fs.readFileSync(path.join(out, f))), names = Object.keys(z.files).filter(n => !z.files[n].dir);
  const text = async n => plain(await z.file(n).async('string')), pick = re => names.filter(n => re.test(n)).sort();
  const gk = pick(/01_HD_Giao_khoan[^/]*\//), cc = pick(/05_Bang_cham_cong[^/]*\//), tc = pick(/08_Bang_thanh_toan_tien_cong[^/]*\//), nt = pick(/14_BB_nghiem_thu_thanh_ly[^/]*\//);
  ok('mỗi đội một file cho BM-01, BM-05, BM-08, BM-14 (2 file mỗi loại)', gk.length === 2 && cc.length === 2 && tc.length === 2 && nt.length === 2, [gk.length, cc.length, tc.length, nt.length].join());
  const g1 = await text(gk[0]), g2 = await text(gk[1]);
  ok('số hợp đồng từng đội khác nhau: đội 1 = 015.1/2026-KT, đội 2 = 015.2/2026-KT', /015\.1\/2026-KT/.test(g1) && !/015\.2\/2026-KT/.test(g1) && /015\.2\/2026-KT/.test(g2) && !/015\.1\/2026-KT/.test(g2), g1.slice(0, 160) + ' | ' + g2.slice(0, 160));
  const c1 = await text(cc[0]), c2 = await text(cc[1]);
  ok('BM-05 đội 1 có đúng 4 người (TRẦN MỘT, LÊ CƯA, PHẠM KT BA, ĐỖ KT BỐN), không có người đội 2', ['TRẦN MỘT', 'LÊ CƯA', 'PHẠM KT BA', 'ĐỖ KT BỐN'].every(x => c1.includes(x)) && !/NGUYỄN HAI|HỒ KT SÁU/.test(c1));
  ok('BM-05 đội 2 có đúng 2 người (NGUYỄN HAI, HỒ KT SÁU), không có người đội 1', ['NGUYỄN HAI', 'HỒ KT SÁU'].every(x => c2.includes(x)) && !/TRẦN MỘT|LÊ CƯA|PHẠM KT BA|ĐỖ KT BỐN/.test(c2));
  const t1 = await text(tc[0]), t2 = await text(tc[1]), n1 = await text(nt[0]), n2 = await text(nt[1]);
  ok('tổng tiền công đội 1 theo bảng tính tay = ' + grp(tong1) + ' đồng, xuất hiện ở cả BM-08 và BM-14', t1.includes(grp(tong1)) && n1.includes(grp(tong1)), 'tay ' + grp(tong1) + ' | BM-08: ' + (t1.match(/\d{1,3}(\.\d{3})+/g) || []).join(',') + ' | BM-14: ' + (n1.match(/\d{1,3}(\.\d{3})+/g) || []).join(','));
  ok('tổng tiền công đội 2 theo bảng tính tay = ' + grp(tong2) + ' đồng, xuất hiện ở cả BM-08 và BM-14', t2.includes(grp(tong2)) && n2.includes(grp(tong2)), 'tay ' + grp(tong2) + ' | BM-08: ' + (t2.match(/\d{1,3}(\.\d{3})+/g) || []).join(',') + ' | BM-14: ' + (n2.match(/\d{1,3}(\.\d{3})+/g) || []).join(','));
  ok('BM-08 đội 1 không lẫn tổng của đội 2 và ngược lại', !t1.includes(grp(tong2)) && !t2.includes(grp(tong1)));
  ok('không có lỗi script trên màn hình', errs.length === 0, errs.join(' | '));
  await app.close();
  // ---- mở lại hồ sơ một đội từ bản cũ (bản 1.4.x): số văn bản và định mức vẫn đọc đúng ----
  const fx = path.join(root, 'tests', 'fixtures', 'hakqn_v1_4.sqlite'), cu = path.join(dir, 'cu.sqlite'); fs.copyFileSync(fx, cu);
  const raw = new Database(cu, {readonly: true}), goc = raw.prepare('SELECT data FROM forests').all().map(r => JSON.parse(r.data)).find(x => x.id === 'fa' || x.info); raw.close();
  const soGoc = (goc.exp || {}).soKT || '', pcGoc = (goc.pc || []).length;
  app = await launch(cu, path.join(dir, 'ud2'), path.join(dir, 'out2')); w = await app.firstWindow(); w.on('dialog', d => d.accept()); await w.waitForSelector('#side');
  const D = (await w.evaluate(() => window.hak.loadSync().db)); const fa = Object.values(D.rs).flatMap(o => Object.values(o.forests)).find(x => x.id === goc.id) || Object.values(Object.values(D.rs)[0].forests)[0];
  ok('hồ sơ một đội từ bản 1.4.x: mở lại được, số hợp đồng khai thác ' + (soGoc || '(trống)') + ' giữ nguyên ở đội duy nhất, phiếu cân giữ nguyên', fa.doi.length === 1 && ((fa.doi[0].exp || {}).soKT || '') === soGoc && (fa.pc || []).length === pcGoc, JSON.stringify([fa.doi.length, (fa.doi[0].exp || {}).soKT, soGoc, (fa.pc || []).length, pcGoc]));
  await w.click('[data-open=' + Object.keys(D.rs)[0] + ']'); await w.click('[data-tab=rung]'); await w.click('[data-forest=' + fa.id + ']'); await w.click('[data-ftab=nc]'); await w.waitForTimeout(500);
  ok('định mức nhân công của hồ sơ cũ: tab Nhân công đọc được (không có lỗi ngày/phiên bản), dùng đúng bản đã lưu hoặc mặc định', !(await w.$('#dbNgayLoi')) && /Hợp đồng nhân công/.test(await w.innerText('#main')) && !(D.dinhBienVer && D.dinhBienVer.length), JSON.stringify([D.dinhBien && D.dinhBien.length, D.dinhBienVer]));
  await app.close(); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
