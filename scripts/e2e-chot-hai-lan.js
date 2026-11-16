'use strict';
/* LÔ CHỐT NHIỀU LẦN → SAO LƯU RIÊNG LÔ → KHÔI PHỤC SANG CƠ SỞ DỮ LIỆU MỚI (Electron thật, SQLite thật, dữ liệu giả lập ở thư mục tạm, chặn mạng bằng proxy chết):
 *  1. chốt lần 1 → mở khóa có lý do (giao diện) → sửa khối lượng phiếu PA1 12,5 → 13,75 tấn → chốt lần 2; ghi giá trị, phiên bản, dấu vân tay từng lần;
 *  2. SQLite máy nguồn: bảng chot_goi giữ CẢ HAI bản chụp (phiên bản 1 và 2), JSON lô không mang gói; mở lại từng bản chụp qua goiChot;
 *  3. gói sao lưu riêng lô: CHỈ mang bản chốt hiện hành (phiên bản 2) + nhật ký vòng đời (lý do mở khóa, dấu vân tay lần 1); thông báo và màn xem trước ghi rõ phạm vi;
 *  4. khôi phục vào cơ sở dữ liệu MỚI khi mất mạng: đúng bản chốt lần 2, chỉ đọc, giữ lý do mở khóa, qua kiểm toàn vẹn, dấu vân tay không đổi; đóng mở lại vẫn vậy;
 *  5. gói thiếu bản chụp bắt buộc / sai dấu vân tay / JSON cắt dở: dừng ở xem trước, nêu mã lô, phiên bản, lý do; máy đích và file nguồn giữ nguyên.
 * Chạy: xvfb-run -a node scripts/e2e-chot-hai-lan.js */
const {_electron: electron} = require('playwright-core');
const path = require('path'), fs = require('fs'), os = require('os'), crypto = require('crypto');
const root = path.join(__dirname, '..');
const V = require(path.join(root, 'src', 'vongdoi.js')), M = require(path.join(root, 'src', 'model.js')), L = require(path.join(root, 'src', 'lorung.js'));
const src = fs.readFileSync(path.join(__dirname, 'e2e-inan2.js'), 'utf8');
const {lot, seed, PC, EXP1} = new Function(src.slice(src.indexOf('const nv ='), src.indexOf('const plain =')) + '; return {lot, seed, PC, EXP1};')();
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hakqn-chot2-')), lotDir = path.join(dir, 'lo');
const NGUON = path.join(dir, 'nguon'), DICH = path.join(dir, 'dich');
let fail = 0; const ok = (name, cond, extra) => { console.log((cond ? 'ĐẠT  ' : 'LỖI  ') + name + (!cond && extra ? ' — ' + extra : '')); if (!cond) fail++; };
const sha = t => crypto.createHash('sha256').update(t).digest('hex');
const sql = (may, fn) => { const Db = require('better-sqlite3'), d = new Db(path.join(may, 'd.sqlite')); try { return fn(d); } finally { d.close(); } };
const anh = may => sql(may, d => JSON.stringify({f: d.prepare('SELECT id, hash FROM forests ORDER BY id').all(), g: d.prepare('SELECT forest_id, phien_ban, hash, data FROM chot_goi ORDER BY forest_id, phien_ban').all()}));
const launch = async (may, env = {}) => {
  const app = await electron.launch({executablePath: require('electron'), args: [root, '--no-sandbox', '--proxy-server=http://127.0.0.1:9'], env: {...process.env, HAKQN_CLOSE: 'discard', HAKQN_DB: path.join(may, 'd.sqlite'), HAKQN_USERDATA: path.join(may, 'ud'), HAKQN_LOT_DIR: lotDir, ...env}});
  const w = await app.firstWindow(); w.errs = []; w.on('pageerror', e => w.errs.push(e.message)); w.on('dialog', d => d.accept()); await w.waitForSelector('#side'); return {app, w};
};
const loadDb = w => w.evaluate(() => window.hak.loadSync().db);
const timLo = D => { for (const [oid, o] of Object.entries(D.rs)) for (const [fid, f] of Object.entries(o.forests || {})) if (f.info && f.info.maRung === 'R-A') return {oid, fid, f}; return null; };
const openLo = async (w, oid, fid, ftab = 'nc') => { await w.click('[data-open=' + oid + ']'); await w.click('[data-tab=rung]'); await w.click('[data-forest=' + fid + ']'); await w.click('[data-ftab=' + ftab + ']'); await w.waitForTimeout(300); };
const banner = async w => { const e = await w.$('#toanVenLoi'); return e ? {ma: await e.getAttribute('data-ma'), text: await e.innerText()} : null; };
const kl1 = f => f.pc.find(p => /PA1$/.test(p.soPhieu)).kl;
const LY_DO = 'Phiếu PA1 nhập nhầm khối lượng, sửa 12,5 thành 13,75 tấn';

(async () => {
  [lotDir, NGUON, DICH].forEach(d => fs.mkdirSync(d, {recursive: true}));
  const bang = [];   // bảng ghi nhận từng lần chốt
  // ---------- MÁY NGUỒN ----------
  let {app, w} = await launch(NGUON);
  const A = M.ensureForest(lot('fa', 'R-A', {exp: EXP1, pc: PC.map(p => Object.assign({}, p)), kl: null}));
  await w.evaluate(d => window.hak.save(d), seed([A, lot('fc', 'R-C', {exp: {}, pc: [], kl: null})])); await w.reload(); await w.waitForSelector('#side');
  ok('đầu trang hiện phiên bản của bản cài, đúng bằng package.json', (await w.innerText('#appVer')).trim() === '· Phiên bản ' + require(path.join(root, 'package.json')).version, await w.innerText('#appVer'));
  // chốt lần 1 (đúng hàm chốt của ứng dụng, ghi qua tầng lưu)
  let D = await loadDb(w); let f = D.rs.own1.forests.fa;
  let r = V.chot(f, 'Kế toán', '2026-11-10T01:00:00.000Z', []); const c1 = {phienBan: f.chot.phienBan, hash: f.chot.hash, hashDL: f.chot.hashDL, kl: kl1(f)};
  let s = await w.evaluate(d => window.hak.save(d), D);
  ok('chốt lần 1: lưu được, phiên bản 1, PA1 = 12,5 tấn', r.ok && s && s.ok && c1.phienBan === 1 && c1.kl === 12.5, JSON.stringify(s));
  bang.push(['Chốt lần 1', c1.kl, c1.phienBan, c1.hash]);
  await w.reload(); await w.waitForSelector('#side');
  // mở khóa có lý do qua giao diện
  await openLo(w, 'own1', 'fa', 'xuat'); await w.waitForSelector('#chotBox');
  ok('sau chốt lần 1: khung Vòng đời báo nguyên vẹn, lô chỉ đọc phiên bản 1', (await w.getAttribute('#chotBox', 'data-toanven')) === 'nguyen-ven' && /phiên bản 1/.test(await w.innerText('#loKhoaBar')));
  await w.click('[data-act=chotMoKhoa]'); await w.waitForTimeout(400);
  ok('mở khóa không nhập lý do: bị từ chối, lô vẫn đã chốt', !!(await loadDb(w)).rs.own1.forests.fa.chot);
  await w.fill('#chotLyDo', LY_DO); await w.click('[data-act=chotMoKhoa]'); await w.waitForTimeout(700);
  D = await loadDb(w); f = D.rs.own1.forests.fa;
  const mk = f.nhatKy.find(x => x.hanh === 'mokhoa');
  ok('mở khóa có lý do: lô hết khóa; nhật ký ghi lý do, phiên bản 1 và dấu vân tay lần 1', !f.chot && mk && mk.lyDo === LY_DO && mk.phienBan === 1 && mk.hash === c1.hash, JSON.stringify(mk));
  ok('sau khi mở khóa: bản chụp lần 1 vẫn còn trong SQLite (bảng chot_goi)', sql(NGUON, d => d.prepare("SELECT hash FROM chot_goi WHERE forest_id='fa' AND phien_ban=1").get().hash) === c1.hash);
  // sửa giá trị nghiệp vụ: PA1 12,5 → 13,75 tấn, lưu; chốt lần 2
  f.pc.find(p => /PA1$/.test(p.soPhieu)).kl = 13.75;
  s = await w.evaluate(d => window.hak.save(d), D); ok('sửa PA1 thành 13,75 tấn sau khi mở khóa: lưu được', s && s.ok, JSON.stringify(s));
  D = await loadDb(w); f = D.rs.own1.forests.fa;
  r = V.chot(f, 'Kế toán', '2026-11-12T02:00:00.000Z', []); const c2 = {phienBan: f.chot.phienBan, hash: f.chot.hash, hashDL: f.chot.hashDL, kl: kl1(f)};
  s = await w.evaluate(d => window.hak.save(d), D);
  ok('chốt lần 2: lưu được, phiên bản 2, PA1 = 13,75 tấn, dấu vân tay khác lần 1', r.ok && s && s.ok && c2.phienBan === 2 && c2.kl === 13.75 && c2.hash !== c1.hash && c2.hashDL !== c1.hashDL, JSON.stringify(s));
  bang.push(['Mở khóa', '', 1, c1.hash + ' · lý do: ' + LY_DO]); bang.push(['Chốt lần 2', c2.kl, c2.phienBan, c2.hash]);
  await w.reload(); await w.waitForSelector('#side');
  // cách lưu trong SQLite
  const rows = sql(NGUON, d => d.prepare("SELECT phien_ban pb, hash, data FROM chot_goi WHERE forest_id='fa' ORDER BY phien_ban").all());
  const lo = sql(NGUON, d => d.prepare("SELECT data FROM forests WHERE id='fa'").get().data);
  ok('SQLite máy nguồn: chot_goi có đúng hai bản chụp (phiên bản 1, 2) với dấu vân tay đã ghi', rows.length === 2 && rows[0].pb === 1 && rows[0].hash === c1.hash && rows[1].pb === 2 && rows[1].hash === c2.hash, JSON.stringify(rows.map(x => [x.pb, x.hash])));
  ok('mỗi bản chụp tự khớp dấu vân tay của mình và mang đúng giá trị: lần 1 = 12,5; lần 2 = 13,75', V.bam(rows[0].data) === c1.hash && V.bam(rows[1].data) === c2.hash && kl1(JSON.parse(rows[0].data)) === 12.5 && kl1(JSON.parse(rows[1].data)) === 13.75);
  ok('JSON của lô trong bảng forests không mang gói (chỉ phiên bản, dấu vân tay)', lo.indexOf('"goi":') < 0 && JSON.parse(lo).chot.phienBan === 2 && JSON.parse(lo).chot.hash === c2.hash);
  const g1 = await w.evaluate(() => window.hak.goiChot('fa', 1)), g2 = await w.evaluate(() => window.hak.goiChot('fa', 2));
  ok('máy nguồn mở lại được từng bản chụp: phiên bản 1 và 2 qua kiểm gói', g1.ok && g2.ok && V.kiemGoi({hash: c1.hash, hashDL: c1.hashDL}, g1.goi.data, 'fa').ok && V.kiemGoi({hash: c2.hash, hashDL: c2.hashDL}, g2.goi.data, 'fa').ok && g1.ds.length === 2, JSON.stringify(g1.ds));
  // sao lưu riêng lô qua giao diện
  await openLo(w, 'own1', 'fa', 'finfo'); await w.click('#lotBackupBtn'); await w.waitForTimeout(800);
  const tb = await w.evaluate(() => document.body.innerText);
  const fileA = fs.readdirSync(lotDir).map(n => path.join(lotDir, n))[0], nguonTxt = fileA ? fs.readFileSync(fileA, 'utf8') : '', pkg = fileA ? JSON.parse(nguonTxt) : null;
  ok('gói sao lưu riêng lô: mang bản chốt hiện hành (phiên bản 2, dấu vân tay lần 2, PA1 = 13,75), qua kiểm toàn vẹn', !!pkg && pkg.lo.chot.phienBan === 2 && pkg.lo.chot.hash === c2.hash && V.bam(pkg.lo.chot.goi) === c2.hash && kl1(JSON.parse(pkg.lo.chot.goi)) === 13.75 && V.kiemToanVen(pkg.lo).ok);
  ok('gói KHÔNG mang bản chụp lần 1 (chỉ một gói đóng băng trong file)', !!pkg && (() => { const chuoi = []; (function di(x) { if (typeof x === 'string') chuoi.push(x); else if (x && typeof x === 'object') Object.values(x).forEach(di); })(pkg); return nguonTxt.split('"goi":').length === 2 && !chuoi.some(c => V.bam(c) === c1.hash) && chuoi.filter(c => V.bam(c) === c2.hash).length === 1; })());
  const nk = pkg ? pkg.lo.nhatKy : [];
  ok('nhật ký vòng đời đi theo gói: chốt 1 (dấu vân tay lần 1) → mở khóa (lý do, phiên bản 1) → chốt 2', nk.map(x => x.hanh).join(',') === 'chot,mokhoa,chot' && nk[0].hash === c1.hash && nk[1].lyDo === LY_DO && nk[1].hash === c1.hash && nk[2].phienBan === 2 && nk[2].hash === c2.hash, JSON.stringify(nk));
  ok('thông báo sau khi sao lưu ghi rõ phạm vi: chỉ bản chốt hiện hành (phiên bản 2), bản chụp phiên bản 1 không nằm trong gói', /Phạm vi gói: chỉ mang bản chốt hiện hành \(phiên bản 2/.test(tb) && /phiên bản 1\) không nằm trong gói/.test(tb), tb.slice(-500));
  ok('máy nguồn: không có lỗi JavaScript', w.errs.length === 0, w.errs.join('|'));
  await app.close();
  const anhNguon = anh(NGUON);

  // ---------- MÁY ĐÍCH: cơ sở dữ liệu MỚI, mất mạng ----------
  ({app, w} = await launch(DICH, {HAKQN_LOT_FILE: fileA}));
  ok('máy đích là cơ sở dữ liệu mới (chưa có chủ rừng nào), không có mạng', Object.keys((await loadDb(w)).rs || {}).length === 0 && !(await w.evaluate(() => fetch('https://docs.google.com/').then(() => true, () => false))));
  await w.click('#moreMenu summary'); await w.click('#lotRestoreBtn'); await w.waitForSelector('[data-act=lotGo]');
  const xt = await w.innerText('#impBody');
  ok('xem trước khôi phục: nêu lô R-A và phạm vi gói (bản chốt hiện hành phiên bản 2, dấu vân tay lần 2; phiên bản 1 không nằm trong gói)', /R-A/.test(xt) && !!(await w.$('#lotPhamVi')) && xt.indexOf('phiên bản 2, dấu vân tay ' + c2.hash) > 0 && /phiên bản 1\) không nằm trong gói/.test(xt), xt.slice(0, 600));
  await w.click('[data-act=lotGo]'); await w.waitForTimeout(900);
  let T = timLo(await loadDb(w));
  ok('khôi phục vào cơ sở dữ liệu mới: có lô R-A, bản chốt lần 2 (phiên bản 2, dấu vân tay giữ nguyên, PA1 = 13,75)', !!T && T.f.chot && T.f.chot.phienBan === 2 && T.f.chot.hash === c2.hash && T.f.chot.hashDL === c2.hashDL && kl1(T.f) === 13.75, T ? JSON.stringify(T.f.chot) : 'không thấy lô');
  await openLo(w, T.oid, T.fid, 'xuat'); await w.waitForSelector('#chotBox');
  ok('máy đích: lô mở ở chế độ chỉ đọc, phiên bản 2, kiểm toàn vẹn "nguyen-ven", không có cảnh báo', /phiên bản 2/.test(await w.innerText('#loKhoaBar')) && (await w.getAttribute('#chotBox', 'data-toanven')) === 'nguyen-ven' && !(await banner(w)));
  await w.click('#chotBox details summary'); const nkTxt = await w.innerText('#chotBox');
  ok('máy đích: nhật ký vòng đời hiện lần mở khóa (phiên bản 1) kèm lý do', nkTxt.indexOf(LY_DO) > 0 && /Mở khóa \(phiên bản 1\)/.test(nkTxt) && /Chốt \(phiên bản 2\)/.test(nkTxt), nkTxt.slice(-500));
  ok('máy đích: nhật ký trong dữ liệu giữ dấu vân tay lần 1 và lý do mở khóa', T.f.nhatKy.some(x => x.hanh === 'mokhoa' && x.lyDo === LY_DO && x.hash === c1.hash) && T.f.nhatKy.some(x => x.hanh === 'chot' && x.phienBan === 1 && x.hash === c1.hash));
  const gd = sql(DICH, d => d.prepare('SELECT forest_id, phien_ban pb, hash, data FROM chot_goi').all());
  ok('máy đích: chot_goi có đúng một bản chụp (phiên bản 2), từng byte giống bản chụp lần 2 ở máy nguồn', gd.length === 1 && gd[0].pb === 2 && gd[0].hash === c2.hash && gd[0].data === rows[1].data, JSON.stringify(gd.map(x => [x.forest_id, x.pb, x.hash])));
  const gv1 = await w.evaluate(fid => window.hak.goiChot(fid, 1), T.fid);
  ok('máy đích: không có bản chụp phiên bản 1 (đúng phạm vi đã ghi)', gv1.ok && !gv1.goi && gv1.ds.length === 1, JSON.stringify(gv1.ds));
  { const D2 = await loadDb(w); kl1.call(null, D2.rs[T.oid].forests[T.fid]); D2.rs[T.oid].forests[T.fid].pc[0].kl = 99; const r2 = await w.evaluate(d => window.hak.save(d), D2);
    ok('máy đích: sửa dữ liệu lô đã chốt bị từ chối (LOCKED), nêu mã lô', r2 && r2.ok === false && r2.code === 'LOCKED' && /R-A/.test(r2.error), JSON.stringify(r2)); }
  ok('máy đích: ô nhập ở tab Xuất hồ sơ bị vô hiệu', await w.$$eval('#main [data-exp]', e => e.length > 0 && e.every(x => x.disabled)));
  ok('máy đích: không có lỗi JavaScript', w.errs.length === 0, w.errs.join('|'));
  await app.close();
  const anhDich = anh(DICH);
  ({app, w} = await launch(DICH)); T = timLo(await loadDb(w)); await openLo(w, T.oid, T.fid, 'xuat'); await w.waitForSelector('#chotBox');
  ok('đóng mở lại máy đích: vẫn bản chốt lần 2, chỉ đọc, nguyên vẹn, dấu vân tay không đổi', T.f.chot.phienBan === 2 && T.f.chot.hash === c2.hash && (await w.getAttribute('#chotBox', 'data-toanven')) === 'nguyen-ven' && !!(await w.$('#loKhoaBar')) && anh(DICH) === anhDich);
  await app.close();
  ok('file nguồn và SQLite máy nguồn giữ nguyên sau khi khôi phục (cả hai bản chụp, dấu vân tay cũ)', fs.readFileSync(fileA, 'utf8') === nguonTxt && anh(NGUON) === anhNguon);

  // ---------- GÓI HỎNG vào máy đích (đang có lô R-A chốt phiên bản 2) ----------
  const goc = JSON.parse(nguonTxt); delete goc.maKiemTra;
  const loi = {
    'thiếu bản chụp bắt buộc': [x => { delete x.chot.goi; }, 'thieu-goi', /Thiếu gói đóng băng/],
    'sai dấu vân tay': [x => { x.chot.hash = 'deadbeefdeadbeef'; }, 'hash-khong-khop', /Dấu vân tay không khớp[\s\S]*deadbeefdeadbeef/],
    'JSON cắt dở': [x => { x.chot.goi = x.chot.goi.slice(0, 30); }, 'json-hong', /Gói hỏng \(JSON\)[\s\S]*cắt dở/]
  };
  for (const [ten, [sua, ma, mau]] of Object.entries(loi)) {
    const p = JSON.parse(JSON.stringify(goc)); sua(p.lo); const fl = path.join(dir, 'goi-' + ma + '.json'); fs.writeFileSync(fl, JSON.stringify(L.seal(p, sha), null, 2)); const txt = fs.readFileSync(fl, 'utf8');
    ok('gói "' + ten + '": hàm kiểm trả mã ' + ma, V.kiemToanVen(p.lo).ma === ma, V.kiemToanVen(p.lo).ma);
    ({app, w} = await launch(DICH, {HAKQN_LOT_FILE: fl}));
    await w.click('#moreMenu summary'); await w.click('#lotRestoreBtn'); await w.waitForTimeout(800);
    const t = await w.innerText('#impBody').catch(() => '');
    ok('  xem trước: dừng, hiện mã lô R-A, phiên bản chốt 2 và lý do; không có nút ghi', !!(await w.$('#lotDung')) && /R-A/.test(t) && /phiên bản chốt 2/.test(t) && mau.test(t) && !(await w.$('[data-act=lotGo]')), t.slice(0, 500));
    const ra = await w.evaluate(async q => window.hak.lotApply(JSON.parse(q), 'thay'), txt);
    ok('  gọi thẳng lệnh ghi cũng bị chặn (GOI_HONG); máy đích và file nguồn giữ nguyên', ra && !ra.ok && ra.code === 'GOI_HONG' && anh(DICH) === anhDich && fs.readFileSync(fl, 'utf8') === txt, JSON.stringify(ra).slice(0, 200));
    ok('  không có lỗi JavaScript', w.errs.length === 0, w.errs.join('|'));
    await app.close();
  }
  ({app, w} = await launch(DICH)); T = timLo(await loadDb(w)); await openLo(w, T.oid, T.fid, 'xuat'); await w.waitForSelector('#chotBox');
  ok('sau ba lần khôi phục thất bại: lô máy đích vẫn bản chốt lần 2, nguyên vẹn, dấu vân tay cũ', T.f.chot.hash === c2.hash && (await w.getAttribute('#chotBox', 'data-toanven')) === 'nguyen-ven' && anh(DICH) === anhDich);
  await app.close();
  console.log('\nBẢNG GHI NHẬN (PA1 tấn | phiên bản | dấu vân tay):'); bang.forEach(b => console.log('  ' + b.join(' | ')));
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
