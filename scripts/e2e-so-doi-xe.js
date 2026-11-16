'use strict';
/* SỐ VĂN BẢN THEO ĐỘI XE KHÔNG ĐỔI KHI IN LẠI (Electron thật, SQLite thật, file Word xuất thật; dữ liệu giả lập ở thư mục tạm).
 * Hồi quy lỗi 2.2.0 (commit d6e46c4): hậu tố .1 / .2 tính theo vị trí đội lúc xuất nên số của đội A đổi khi đổi thứ tự hoặc xóa đội khác.
 *  1. hai đội xe A, B dùng số chung của lô: cùng in 07/2026-HĐVC (không hậu tố); Kiểm tra và Sổ văn bản nêu cả hai đội; tải file KHÔNG tự cấp số, không ghi gì;
 *  2. người dùng xác nhận cấp số (Sổ văn bản): số đầy đủ lưu theo ID đội xe; BM-04, BM-09, BM-10 của mỗi đội tham chiếu đúng hợp đồng và biên bản của CHÍNH đội đó;
 *  3. đổi thứ tự đội, xóa B, thêm C, đổi người ký A, đóng mở lại app: số của A giữ nguyên, C không nhận lại số của B;
 *  4. lô một đội xe; lô đã nhập số riêng; hai đội nhập trùng số riêng → chặn BM-04/09/10, nêu cả hai đội, không tự nối hậu tố;
 *  5. hồ sơ cũ đã in bằng số chung: “Xác nhận số trên giấy” lưu số đầy đủ cho đúng đội, chỉ sau khi bấm; lô đã chốt: chỉ đọc.
 * Chạy: xvfb-run -a node scripts/e2e-so-doi-xe.js */
const {_electron: electron} = require('playwright-core');
const path = require('path'), fs = require('fs'), os = require('os');
const JSZip = require('jszip');
const root = path.join(__dirname, '..');
const M = require(path.join(root, 'src', 'model.js')), V = require(path.join(root, 'src', 'vongdoi.js'));
const src = fs.readFileSync(path.join(__dirname, 'e2e-inan2.js'), 'utf8');
const {lot, seed, P, EXP1} = new Function(src.slice(src.indexOf('const nv ='), src.indexOf('const plain =')) + '; return {lot, seed, P, EXP1};')();
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hakqn-sdx-')), out = path.join(dir, 'out');
let fail = 0; const ok = (name, cond, extra) => { console.log((cond ? 'ĐẠT  ' : 'LỖI  ') + name + (!cond && extra ? ' — ' + extra : '')); if (!cond) fail++; };
const plain = xml => (xml.match(/<w:t[^>]*>([^<]*)<\/w:t>/g) || []).map(a => a.replace(/<[^>]+>/g, '')).join('');
const launch = async () => { const app = await electron.launch({executablePath: require('electron'), args: [root, '--no-sandbox', '--proxy-server=http://127.0.0.1:9'], env: {...process.env, HAKQN_CLOSE: 'discard', HAKQN_DB: path.join(dir, 'd.sqlite'), HAKQN_USERDATA: path.join(dir, 'ud'), HAKQN_DOWNLOAD_DIR: out}});
  const w = await app.firstWindow(); w.errs = []; w.on('pageerror', e => w.errs.push(e.message)); w.on('dialog', d => d.accept()); await w.waitForSelector('#side'); return {app, w}; };
const PCx = (t, ma) => [P(1, '05/10/2026', '92C-12345', t + '1', 12.5), P(2, '06/10/2026', '92C-67890', t + '2', 9.25), P(3, '07/10/2026', '92C-12345', t + '3', 8)].map(r => Object.assign(r, {maRung: ma}));
const dungMa = f => { ['nc', 'dx', 'pc'].forEach(k => { f[k] = (f[k] || []).map(r => Object.assign({}, r, {maRung: f.info.maRung})); }); return f; };
const mk = (id, ma) => M.ensureForest(dungMa(lot(id, ma, {exp: EXP1, pc: PCx(id.slice(-1).toUpperCase(), ma), kl: null})));

(async () => {
  fs.mkdirSync(out, {recursive: true});
  let {app, w} = await launch();
  const dbNow = () => w.evaluate(() => window.hak.loadSync().db), lo = async id => (await dbNow()).rs.own1.forests[id];
  const saveDb = async d => { const r = await w.evaluate(x => window.hak.save(x), d); await w.reload(); await w.waitForSelector('#side'); return r; };
  const open = async (fid, ftab) => { await w.click('[data-open=own1]'); await w.click('[data-tab=rung]'); await w.click('[data-forest=' + fid + ']'); await w.click('[data-ftab=' + ftab + ']'); await w.waitForTimeout(400); };
  /* tải gói “Toàn bộ” của lô đang mở: {tên file: chữ trong file} */
  const taiGoi = async () => { for (const f of fs.readdirSync(out)) fs.unlinkSync(path.join(out, f)); await w.click('[data-xtab=all]').catch(() => {}); await w.click('button[data-act=dl][data-kind=all]'); let f = null; for (let i = 0; i < 150 && !f; i++) { f = fs.readdirSync(out).find(x => /\.zip$/.test(x)); if (!f) await w.waitForTimeout(150); }
    const z = await JSZip.loadAsync(fs.readFileSync(path.join(out, f))), o = {}; for (const n of Object.keys(z.files).filter(n => n.endsWith('.docx'))) { const d = await JSZip.loadAsync(await z.file(n).async('nodebuffer')); o[n] = plain(await d.file('word/document.xml').async('string')); } return o; };
  const cua = (docs, code, bien) => { const e = Object.entries(docs).filter(([n, t]) => new RegExp('(^|/)' + code + '_').test(n) && t.includes(bien)); return e.length === 1 ? e[0][1] : ''; };
  const A = '92C-12345', B = '92C-67890';

  // ---------- dữ liệu: fa (hai đội xe, số chung), fb (một đội xe), fc (hai đội xe có số riêng), fd (hồ sơ cũ, số chung), fe (đã chốt) ----------
  const fa = mk('fa', 'R-A'), fb = mk('fb', 'R-B'), fc = mk('fc', 'R-C'), fd = mk('fd', 'R-D'), fe = mk('fe', 'R-E');
  fb.dx = fb.dx.filter(r => r.bienSo === A); fb.pc = fb.pc.filter(r => r.bienSo === A); Object.assign(fb, M.ensureForest(Object.assign({}, fb, {hdvc: undefined})));
  const idA = fa.hdvc[0].id, idB = fa.hdvc[1].id;
  fc.hdvc[0].exp = {soVC: '11/2026-HĐVC', pcSo: '21/2026-XNKL'}; fc.hdvc[1].exp = {soVC: '12/2026-HĐVC', pcSo: '22/2026-XNKL'};
  V.chot(fe, 'Kế toán', '2026-11-10T01:00:00.000Z', []);
  ok('lưu dữ liệu thử (năm lô)', (await saveDb(seed([fa, fb, fc, fd, fe]))).ok);
  ok('lô R-A có đúng hai đội xe, lô R-B một đội xe', (await lo('fa')).hdvc.length === 2 && (await lo('fb')).hdvc.length === 1, JSON.stringify([(await lo('fa')).hdvc.map(h => h.id), (await lo('fb')).hdvc.map(h => h.id)]));

  // ---------- 1. số chung: cùng in 07/2026-HĐVC, không hậu tố; tải file không ghi gì ----------
  const truocTai = JSON.stringify(await lo('fa'));
  await open('fa', 'xuat'); let D = await taiGoi();
  ok('hai đội xe dùng số chung: BM-04, BM-09, BM-10 của cả hai đội in 07/2026-HĐVC và 09/2026-XNKL, không có hậu tố theo vị trí', [A, B].every(b => ['04', '09', '10'].every(c => cua(D, c, b).includes('07/2026-HĐVC') && !/0[79]\.\d\/2026/.test(cua(D, c, b)))) && [A, B].every(b => cua(D, '09', b).includes('Số: 09/2026-XNKL')), Object.keys(D).join(', '));
  ok('xem trước và tải file không tự cấp số, không ghi thay đổi vào lô', JSON.stringify(await lo('fa')) === truocTai && (await w.evaluate(() => window.__stDirty().length)) === 0);
  await w.waitForSelector('#soDoiXe');
  let sdx = await w.innerText('#soDoiXe');
  ok('Sổ văn bản nêu cả hai đội xe đang cùng in số chung của lô, nguồn “số chung của lô”', !!(await w.$('#soDoiXeTrung')) && /cùng in số 07\/2026-HĐVC/.test(sdx.replace(/\s+/g, ' ')) && (await w.$$('#soDoiXe tr[data-nguon=chung]')).length === 4, sdx.slice(0, 400));
  await w.click('[data-ftab=kt]'); await w.waitForTimeout(300);
  ok('màn Kiểm tra: mục “Số văn bản đội xe dùng chung” nêu hai đội (đối chiếu, không chặn)', /Số văn bản đội xe dùng chung/.test(await w.innerText('#main')));

  // ---------- 2. xác nhận cấp số: lưu số đầy đủ theo ID đội xe ----------
  await w.click('[data-ftab=xuat]'); await w.waitForSelector('#soVanBan'); await w.click('[data-act=svbDien]'); await w.waitForTimeout(400);
  ok('cấp số mới nằm ở bản nháp: SQLite chưa đổi trước khi bấm Lưu', JSON.stringify(await lo('fa')) === truocTai);
  await w.click('button[data-act=stSave]'); await w.waitForTimeout(800);
  let F = await lo('fa'); const hA = () => F.hdvc.find(h => h.id === idA), hB = () => F.hdvc.find(h => h.id === idB);
  const soA = {vc: hA().exp.soVC, xn: hA().exp.pcSo}, soB = {vc: hB().exp.soVC, xn: hB().exp.pcSo};
  ok('sau khi xác nhận và lưu: mỗi đội xe có số đầy đủ lưu theo ID (A: 01/2026/HĐVC-RA, 01/2026/XNKL-RA; B: 02/…), lịch sử STT [1, 2]', soA.vc === '01/2026/HĐVC-RA' && soA.xn === '01/2026/XNKL-RA' && soB.vc === '02/2026/HĐVC-RA' && soB.xn === '02/2026/XNKL-RA' && F.sttDaCap.doiXe.join() === '1,2', JSON.stringify([soA, soB, F.sttDaCap]));
  await open('fa', 'xuat'); D = await taiGoi();
  const nhatQuan = (docs, bien, so, khac) => cua(docs, '04', bien).includes('Số: ' + so.vc) && cua(docs, '09', bien).includes('Số: ' + so.xn) && cua(docs, '09', bien).includes(so.vc) && cua(docs, '10', bien).includes(so.vc) && cua(docs, '10', bien).includes(so.xn) && ['04', '09', '10'].every(c => !cua(docs, c, bien).includes(khac.vc) && !cua(docs, c, bien).includes(khac.xn) && !cua(docs, c, bien).includes('07/2026-HĐVC'));
  ok('BM-04 dùng số hợp đồng của đội; BM-09 và BM-10 tham chiếu đúng hợp đồng và biên bản xác nhận của CÙNG đội (A và B không lẫn số của nhau)', nhatQuan(D, A, soA, soB) && nhatQuan(D, B, soB, soA), cua(D, '10', A).slice(0, 300));
  ok('không còn cảnh báo dùng chung số', !(await w.$('#soDoiXeTrung')));
  const anhA = () => ['04', '09', '10'].map(c => (cua(D, c, A).match(/\d+(?:\.\d+)?\/2026[\/-][A-ZĐ-]+(?:-RA)?/g) || []).join('|')).join(' # '), soTrenGiayA = anhA();

  // ---------- 3. đổi thứ tự đội, xóa B, thêm C, đổi người ký A, đóng mở lại ----------
  let db = await dbNow(); F = db.rs.own1.forests.fa; F.dx.reverse(); F.hdvc.reverse();
  ok('đổi thứ tự đội xe (B đứng trước A): lưu được', (await saveDb(db)).ok && (await lo('fa')).hdvc[0].id === idB);
  await open('fa', 'xuat'); D = await taiGoi();
  ok('sau khi đổi thứ tự: số trên BM-04, BM-09, BM-10 của A giữ nguyên, B giữ nguyên', anhA() === soTrenGiayA && nhatQuan(D, A, soA, soB) && nhatQuan(D, B, soB, soA), anhA() + ' ≠ ' + soTrenGiayA);
  db = await dbNow(); F = db.rs.own1.forests.fa;
  F.dx = F.dx.filter(r => r.bienSo !== B); F.pc = F.pc.filter(r => r.bienSo !== B); F.hdvc = F.hdvc.filter(h => h.id !== idB);   // xóa đội xe B cùng xe và phiếu của B
  ok('xóa đội xe B: lưu được, lịch sử STT vẫn [1, 2]', (await saveDb(db)).ok && (await lo('fa')).sttDaCap.doiXe.join() === '1,2');
  await open('fa', 'xuat'); D = await taiGoi();
  ok('chỉ còn đội A: số của A vẫn giữ nguyên (không trở về số chung 07, không đổi hậu tố)', anhA() === soTrenGiayA && cua(D, '04', A).includes('Số: ' + soA.vc), anhA());
  db = await dbNow(); F = db.rs.own1.forests.fa;
  { const h = M.addHd(F, 'Đội xe C'); F = h.f; const xeC = Object.assign({}, F.dx[0], {_row: 9, bienSo: '92C-55555', chuXe: 'TRẦN VĂN C', cccd: '049000000555', taiXe: 'TÀI XẾ C'}); F.dx.push(xeC); F = M.moveXe(F, [F.dx.length - 1], h.id).f || F;
    F.pc.push(Object.assign(P(4, '08/10/2026', '92C-55555', 'A4', 5), {maRung: 'R-A'})); db.rs.own1.forests.fa = F; }
  ok('thêm đội xe C (xe 92C-55555): lưu được', (await saveDb(db)).ok && (await lo('fa')).hdvc.length === 2);
  await open('fa', 'xuat'); await w.click('[data-act=svbDien]'); await w.waitForTimeout(400); await w.click('button[data-act=stSave]'); await w.waitForTimeout(800);
  F = await lo('fa'); const hC = F.hdvc.find(h => h.id !== idA);
  ok('cấp số cho C: C nhận 03 (không nhận lại 02 của B đã xóa); số của A không đổi', hC.exp.soVC === '03/2026/HĐVC-RA' && hC.exp.pcSo === '03/2026/XNKL-RA' && F.hdvc.find(h => h.id === idA).exp.soVC === soA.vc && F.sttDaCap.doiXe.join() === '1,2,3', JSON.stringify([hC.exp, F.sttDaCap]));
  db = await dbNow(); F = db.rs.own1.forests.fa; F.dx.filter(r => r.bienSo === A).forEach(r => { r.nguoiKy = 'Tài xế'; });   // đổi người ký của đội A: chủ xe → tài xế
  ok('đổi người ký của đội A: lưu được', (await saveDb(db)).ok);
  await app.close(); ({app, w} = await launch());
  await open('fa', 'xuat'); D = await taiGoi(); F = await lo('fa');
  ok('đổi người ký A và đóng mở lại app: số lưu của A giữ nguyên, BM-04 / BM-09 / BM-10 của A vẫn tham chiếu nhất quán; C dùng 03', F.hdvc.find(h => h.id === idA).exp.soVC === soA.vc && F.hdvc.find(h => h.id === idA).exp.pcSo === soA.xn && anhA() === soTrenGiayA && nhatQuan(D, A, soA, {vc: '03/2026/HĐVC-RA', xn: '03/2026/XNKL-RA'}) && nhatQuan(D, '92C-55555', {vc: '03/2026/HĐVC-RA', xn: '03/2026/XNKL-RA'}, soA), anhA());

  // ---------- 4. lô một đội xe; lô có số riêng; số riêng trùng ----------
  await open('fb', 'xuat'); D = await taiGoi();
  ok('lô một đội xe: in số chung của lô 07/2026-HĐVC, không có bảng cảnh báo số theo đội xe', cua(D, '04', A).includes('Số: 07/2026-HĐVC') && cua(D, '09', A).includes('Số: 09/2026-XNKL') && !(await w.$('#soDoiXeTrung')));
  await open('fc', 'xuat'); D = await taiGoi();
  ok('lô đã nhập số riêng: giữ đúng số người dùng nhập cho từng đội (11 và 12; 21 và 22), không cảnh báo', nhatQuan(D, A, {vc: '11/2026-HĐVC', xn: '21/2026-XNKL'}, {vc: '12/2026-HĐVC', xn: '22/2026-XNKL'}) && nhatQuan(D, B, {vc: '12/2026-HĐVC', xn: '22/2026-XNKL'}, {vc: '11/2026-HĐVC', xn: '21/2026-XNKL'}) && !(await w.$('#soDoiXeTrung')));
  db = await dbNow(); db.rs.own1.forests.fc.hdvc[1].exp.soVC = '11/2026-HĐVC'; ok('hai đội nhập trùng số riêng 11/2026-HĐVC: lưu được (dữ liệu của người dùng)', (await saveDb(db)).ok);
  const fcTruoc = JSON.stringify(await lo('fc'));
  await open('fc', 'kt'); const kt = await w.innerText('#main');
  ok('số riêng trùng: màn Kiểm tra CHẶN, nêu số và CẢ HAI đội xe', /Số văn bản đội xe trùng/.test(kt) && /cùng lưu số “11\/2026-HĐVC”/.test(kt) && (kt.match(/Các đội xe “[^”]+”, “[^”]+” cùng lưu số/g) || []).length >= 1, kt.slice(0, 600));
  await w.click('[data-ftab=xuat]'); await w.waitForTimeout(300);
  const tat = async kind => w.$$eval('button[data-act=dl][data-kind=' + kind + ']', bs => bs.map(b => b.disabled));
  ok('số riêng trùng: nút tải cả gói bị khóa (không còn hợp đồng vận chuyển nào xuất được); BM-01 (hợp đồng giao khoán) vẫn tải được', (await tat('all')).length > 0 && (await tat('all')).every(Boolean) && (await tat('gk')).some(x => !x), JSON.stringify([await tat('all'), await tat('gk')]));
  { const d2 = await w.evaluate(() => window.__d2Missing()), m = d2.filter(x => x.code === '09' || x.code === '10');
    ok('số riêng trùng: in đợt 2 cũng chặn BM-09, BM-10 của cả hai đội xe (cùng một nguồn quyết định chặn)', m.length === 4 && m.every(x => x.full.some(t => /cùng lưu số/.test(t))), JSON.stringify(m.map(x => [x.code, x.full])).slice(0, 400)); }
  ok('phần mềm không tự nối hậu tố hay đổi số đã lưu để gỡ trùng', JSON.stringify(await lo('fc')) === fcTruoc && (await w.$$('#soDoiXe .pill.err')).length >= 2);

  // ---------- 5. hồ sơ cũ đã in bằng số chung: xác nhận số trên giấy; lô đã chốt ----------
  const fdTruoc = JSON.stringify(await lo('fd')), idD1 = (await lo('fd')).hdvc[0].id, idD2 = (await lo('fd')).hdvc[1].id;
  await open('fd', 'xuat'); await w.waitForSelector('#soDoiXe');
  ok('hồ sơ cũ: Sổ văn bản hiện số đang in của từng đội xe (07/2026-HĐVC, 09/2026-XNKL) và nút “Xác nhận số trên giấy”; chưa bấm thì dữ liệu chưa đổi', /07\/2026-HĐVC/.test(await w.innerText('#soDoiXe')) && (await w.$$('#soDoiXe [data-act=svbGiuSo]')).length === 2 && JSON.stringify(await lo('fd')) === fdTruoc);
  await w.click('#soDoiXe [data-act=svbGiuSo][data-hd="' + idD1 + '"]'); await w.waitForTimeout(400);
  ok('bấm xác nhận: mới ghi vào bản nháp, SQLite chỉ đổi sau khi bấm Lưu', JSON.stringify(await lo('fd')) === fdTruoc);
  await w.click('button[data-act=stSave]'); await w.waitForTimeout(800); F = await lo('fd');
  ok('sau khi lưu: đội đã xác nhận có số đầy đủ trên giấy (07/2026-HĐVC, 09/2026-XNKL) lưu theo ID; đội kia chưa đổi', JSON.stringify(F.hdvc.find(h => h.id === idD1).exp) === JSON.stringify({soVC: '07/2026-HĐVC', pcSo: '09/2026-XNKL'}) && !Object.keys(F.hdvc.find(h => h.id === idD2).exp || {}).length, JSON.stringify(F.hdvc.map(h => h.exp)));
  db = await dbNow(); db.rs.own1.forests.fd.exp.soVC = '55'; await saveDb(db); await open('fd', 'xuat'); D = await taiGoi();
  ok('đổi số chung của lô sau đó: đội đã xác nhận vẫn in 07/2026-HĐVC, đội chưa xác nhận theo số chung mới 55/2026-HĐVC', cua(D, '04', A).includes('Số: 07/2026-HĐVC') && cua(D, '04', B).includes('Số: 55/2026-HĐVC'), cua(D, '04', B).slice(0, 200));
  const feTruoc = JSON.stringify(await lo('fe')), idE1 = (await lo('fe')).hdvc[0].id;
  await open('fe', 'xuat'); await w.waitForSelector('#soDoiXe');
  await w.evaluate(id => { const b = document.querySelector('#soDoiXe [data-act=svbGiuSo][data-hd="' + id + '"]'); if (b) { b.disabled = false; b.click(); } }, idE1); await w.waitForTimeout(400);
  await w.evaluate(() => { const b = document.querySelector('[data-act=svbDien]'); if (b) { b.disabled = false; b.click(); } }); await w.waitForTimeout(400);
  ok('lô đã chốt: xác nhận số / cấp số bị chặn (chỉ đọc), dữ liệu và dấu vân tay không đổi; hồ sơ vẫn hiện số đang in', JSON.stringify(await lo('fe')) === feTruoc && /07\/2026-HĐVC/.test(await w.innerText('#soDoiXe')) && !!(await w.$('#loKhoaBar')));
  ok('không có lỗi JavaScript', w.errs.length === 0, w.errs.join('|'));
  await app.close(); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
