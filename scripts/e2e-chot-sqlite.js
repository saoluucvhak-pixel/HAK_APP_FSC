'use strict';
/* KHÔI PHỤC TOÀN BỘ LỊCH SỬ CHỐT TỪ BẢN SAO LƯU TOÀN BỘ SQLite (Electron thật, SQLite thật, dữ liệu giả lập ở thư mục tạm, chặn mạng bằng proxy chết):
 *  1. máy nguồn: chốt lần 1 → mở khóa có lý do → sửa PA1 12,5 → 13,75 tấn → chốt lần 2; ghi phiên bản, dấu vân tay, giá trị của từng bản chụp;
 *  2. “Sao lưu toàn bộ” bằng app → file .sqlite; chép CHÍNH file đó vào thư mục dữ liệu của một môi trường riêng rồi chọn thư mục đó trong Cài đặt (dùng dữ liệu có sẵn), mở khi mất mạng;
 *  3. máy đích: cả HAI bản chụp có mặt, từng byte giống máy nguồn, đúng phiên bản và dấu vân tay; lô mở đúng bản hiện hành (lần 2), chỉ đọc, nguyên vẹn, nhật ký còn lý do mở khóa;
 *  4. bản chụp cũ bị hỏng trong bản sao (JSON cắt dở): báo mã lô, phiên bản, lý do; lô vẫn mở đúng bản hiện hành; file sao lưu và máy nguồn giữ nguyên.
 * Chạy: xvfb-run -a node scripts/e2e-chot-sqlite.js */
const {_electron: electron} = require('playwright-core');
const path = require('path'), fs = require('fs'), os = require('os'), crypto = require('crypto');
const root = path.join(__dirname, '..');
const V = require(path.join(root, 'src', 'vongdoi.js')), M = require(path.join(root, 'src', 'model.js'));
const src = fs.readFileSync(path.join(__dirname, 'e2e-inan2.js'), 'utf8');
const {lot, seed, PC, EXP1} = new Function(src.slice(src.indexOf('const nv ='), src.indexOf('const plain =')) + '; return {lot, seed, PC, EXP1};')();
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hakqn-chotsql-')), bk = path.join(dir, 'saoluu');
let fail = 0; const ok = (name, cond, extra) => { console.log((cond ? 'ĐẠT  ' : 'LỖI  ') + name + (!cond && extra ? ' — ' + extra : '')); if (!cond) fail++; };
const sha = f => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const rowsOf = file => { const Db = require('better-sqlite3'), d = new Db(file, {readonly: true}); try { return d.prepare("SELECT phien_ban pb, hash, data FROM chot_goi WHERE forest_id='fa' ORDER BY phien_ban").all(); } finally { d.close(); } };
const launch = async (ud, env = {}) => { const app = await electron.launch({executablePath: require('electron'), args: [root, '--no-sandbox', '--proxy-server=http://127.0.0.1:9'], env: {...process.env, HAKQN_CLOSE: 'discard', HAKQN_USERDATA: path.join(dir, ud), ...env}});
  const w = require('./_hd30').boc(await app.firstWindow()); w.errs = []; w.on('pageerror', e => w.errs.push(e.message)); w.on('dialog', d => d.accept()); await w.waitForSelector('#side'); return {app, w}; };
const loadDb = w => w.evaluate(() => window.hak.loadSync().db);
const openLo = async w => { await w.click('[data-open=own1]'); await w.click('[data-tab=rung]'); await w.click('[data-forest=fa]'); await w.click('[data-ftab=xuat]'); await w.waitForSelector('#chotBox'); await w.waitForTimeout(300); };
const kl1 = f => f.pc.find(p => /PA1$/.test(p.soPhieu)).kl;
const LY_DO = 'Phiếu PA1 nhập nhầm khối lượng, sửa 12,5 thành 13,75 tấn';

(async () => {
  fs.mkdirSync(bk, {recursive: true});
  // ---------- MÁY NGUỒN ----------
  let {app, w} = await launch('nguon', {HAKQN_PICK_DIR: bk});
  await w.evaluate(d => window.hak.save(d), seed([M.ensureForest(lot('fa', 'R-A', {exp: EXP1, pc: PC.map(p => Object.assign({}, p)), kl: null})), lot('fc', 'R-C', {exp: {}, pc: [], kl: null})]));
  let D = await loadDb(w), f = D.rs.own1.forests.fa;
  V.chot(f, 'Kế toán', '2026-11-10T01:00:00.000Z', []); const c1 = {pb: f.chot.phienBan, hash: f.chot.hash, kl: kl1(f)}; let r = await w.evaluate(d => window.hak.save(d), D);
  D = await loadDb(w); f = D.rs.own1.forests.fa; V.moKhoa(f, LY_DO, 'Kế toán', '2026-11-11T01:00:00.000Z'); r = r.ok && await w.evaluate(d => window.hak.save(d), D);
  D = await loadDb(w); f = D.rs.own1.forests.fa; f.pc.find(p => /PA1$/.test(p.soPhieu)).kl = 13.75; r = r.ok && await w.evaluate(d => window.hak.save(d), D);
  D = await loadDb(w); f = D.rs.own1.forests.fa; V.chot(f, 'Kế toán', '2026-11-12T02:00:00.000Z', []); const c2 = {pb: f.chot.phienBan, hash: f.chot.hash, kl: kl1(f)}; r = r.ok && await w.evaluate(d => window.hak.save(d), D);
  ok('máy nguồn: chốt lần 1 (phiên bản 1, PA1 = 12,5) → mở khóa có lý do → sửa → chốt lần 2 (phiên bản 2, PA1 = 13,75), dấu vân tay khác nhau', r && r.ok && c1.pb === 1 && c2.pb === 2 && c1.kl === 12.5 && c2.kl === 13.75 && c1.hash !== c2.hash, JSON.stringify([r, c1, c2]));
  const sb = await w.evaluate(() => window.hak.settings.setBackup()); const b = await w.evaluate(() => window.hak.backupTo());
  ok('“Sao lưu toàn bộ” bằng app: ghi đủ file .json và .sqlite vào thư mục sao lưu', sb.ok && b.ok && fs.existsSync(b.sqlFile) && fs.existsSync(b.jsonFile), JSON.stringify([sb.ok, b]).slice(0, 300));
  await w.reload(); await w.waitForSelector('#side'); await openLo(w);
  ok('máy nguồn: khung Vòng đời liệt kê hai bản chụp (phiên bản 1 và 2 hiện hành), đều nguyên vẹn', (await w.getAttribute('#lichSuGoi', 'data-co')) === '2' && (await w.getAttribute('#lichSuGoi', 'data-hong')) === '0' && (await w.$$('#lichSuGoi li[data-ok="1"]')).length === 2 && /hiện hành/.test(await w.innerText('#lichSuGoi li[data-pb="2"]')));
  await app.close();
  const nguonDb = path.join(dir, 'nguon', 'hakqn.sqlite'), rN = rowsOf(nguonDb), rS = rowsOf(b.sqlFile), shaSaoLuu = sha(b.sqlFile);
  ok('file sao lưu .sqlite mang CẢ HAI bản chụp, từng byte giống máy nguồn; mỗi bản khớp dấu vân tay và giá trị của mình (12,5 và 13,75)', rS.length === 2 && JSON.stringify(rS) === JSON.stringify(rN) && rS[0].pb === 1 && rS[0].hash === c1.hash && V.bam(rS[0].data) === c1.hash && kl1(JSON.parse(rS[0].data)) === 12.5 && rS[1].pb === 2 && rS[1].hash === c2.hash && V.bam(rS[1].data) === c2.hash && kl1(JSON.parse(rS[1].data)) === 13.75);
  { const j = JSON.parse(fs.readFileSync(b.jsonFile, 'utf8')).rs.own1.forests.fa; ok('file sao lưu .json chỉ mang bản chốt hiện hành (phiên bản 2) và nhật ký — lịch sử bản chụp nằm ở file .sqlite', j.chot.phienBan === 2 && V.bam(j.chot.goi) === c2.hash && j.nhatKy.some(x => x.hanh === 'mokhoa' && x.lyDo === LY_DO)); }

  // ---------- MÁY ĐÍCH: môi trường riêng, khôi phục CHÍNH file .sqlite đó, mất mạng ----------
  const dd = path.join(dir, 'dich-dulieu'); fs.mkdirSync(dd); fs.copyFileSync(b.sqlFile, path.join(dd, 'hakqn.sqlite'));
  ({app, w} = await launch('dich', {HAKQN_PICK_DIR: dd, HAKQN_PICK_CHOICE: 'use'}));
  ok('máy đích ban đầu trống, không có mạng', Object.keys((await loadDb(w)).rs || {}).length === 0 && !(await w.evaluate(() => fetch('https://docs.google.com/').then(() => true, () => false))));
  const sd = await w.evaluate(() => window.hak.settings.setData()); await w.waitForTimeout(1500); await w.waitForSelector('#side', {state: 'attached'});   // phiếu #06b (D-05): ở màn Cài đặt cột chủ rừng được ẩn
  ok('chọn thư mục chứa bản sao lưu làm thư mục dữ liệu (dùng dữ liệu có sẵn): thành công', sd && sd.ok, JSON.stringify(sd).slice(0, 300));
  await app.close(); ({app, w} = await launch('dich'));
  let T = (await loadDb(w)).rs.own1.forests.fa;
  ok('máy đích: lô mở đúng bản chốt hiện hành (phiên bản 2, dấu vân tay lần 2, PA1 = 13,75)', !!T.chot && T.chot.phienBan === 2 && T.chot.hash === c2.hash && kl1(T) === 13.75, JSON.stringify(T.chot));
  ok('máy đích: nhật ký còn lần chốt 1 (dấu vân tay lần 1), lý do mở khóa, lần chốt 2', T.nhatKy.map(x => x.hanh).join(',') === 'chot,mokhoa,chot' && T.nhatKy[0].hash === c1.hash && T.nhatKy[1].lyDo === LY_DO && T.nhatKy[1].hash === c1.hash && T.nhatKy[2].hash === c2.hash);
  await openLo(w);
  ok('máy đích: lô chỉ đọc, kiểm toàn vẹn “nguyen-ven”, không có cảnh báo', /phiên bản 2/.test(await w.innerText('#loKhoaBar')) && (await w.getAttribute('#chotBox', 'data-toanven')) === 'nguyen-ven' && !(await w.$('#toanVenLoi')));
  const g1 = await w.evaluate(() => window.hak.goiChot('fa', 1)), g2 = await w.evaluate(() => window.hak.goiChot('fa', 2));
  ok('máy đích: mở lại được TỪNG bản chụp; nội dung, phiên bản và dấu vân tay khớp máy nguồn (lần 1: 12,5; lần 2: 13,75)', g1.ok && g2.ok && g1.goi.data === rN[0].data && g1.goi.hash === c1.hash && g1.goi.phienBan === 1 && g2.goi.data === rN[1].data && g2.goi.hash === c2.hash && g2.goi.phienBan === 2 && V.kiemGoi({hash: c1.hash}, g1.goi.data, 'fa').ok && V.kiemGoi({hash: c2.hash}, g2.goi.data, 'fa').ok && kl1(JSON.parse(g1.goi.data)) === 12.5 && kl1(JSON.parse(g2.goi.data)) === 13.75);
  ok('máy đích: khung Vòng đời liệt kê hai bản chụp, đều nguyên vẹn, có dấu vân tay của từng lần', (await w.getAttribute('#lichSuGoi', 'data-co')) === '2' && (await w.getAttribute('#lichSuGoi', 'data-hong')) === '0' && (await w.innerText('#lichSuGoi')).includes(c1.hash) && (await w.innerText('#lichSuGoi')).includes(c2.hash));
  { const D2 = await loadDb(w); D2.rs.own1.forests.fa.pc[0].kl = 99; const r2 = await w.evaluate(d => window.hak.save(d), D2); ok('máy đích: sửa lô đã chốt bị từ chối (LOCKED)', r2 && r2.ok === false && r2.code === 'LOCKED', JSON.stringify(r2)); }
  ok('máy đích: không có lỗi JavaScript', w.errs.length === 0, w.errs.join('|'));
  await app.close();
  ok('file sao lưu và SQLite máy nguồn giữ nguyên sau khi khôi phục', sha(b.sqlFile) === shaSaoLuu && JSON.stringify(rowsOf(nguonDb)) === JSON.stringify(rN));

  // ---------- BẢN CHỤP CŨ BỊ HỎNG trong một bản sao khác của file sao lưu ----------
  const dh = path.join(dir, 'hong-dulieu'); fs.mkdirSync(dh); fs.copyFileSync(b.sqlFile, path.join(dh, 'hakqn.sqlite'));
  { const Db = require('better-sqlite3'), d = new Db(path.join(dh, 'hakqn.sqlite')); d.prepare("UPDATE chot_goi SET data = substr(data, 1, 40) WHERE forest_id='fa' AND phien_ban=1").run(); d.close(); }
  const shaHong = sha(path.join(dh, 'hakqn.sqlite'));
  ({app, w} = await launch('hong', {HAKQN_DB: path.join(dh, 'hakqn.sqlite')})); await openLo(w);
  const loi = await w.innerText('#lichSuGoiLoi').catch(() => '');
  ok('bản chụp lần 1 bị cắt dở: báo mã lô R-A, phiên bản chốt 1 và lý do (JSON hỏng)', /R-A/.test(loi) && /phiên bản chốt 1/.test(loi) && /Gói hỏng \(JSON\)/.test(loi) && (await w.getAttribute('#lichSuGoi', 'data-hong')) === '1', loi);
  ok('bản hiện hành không bị ảnh hưởng: lô vẫn mở đúng bản chốt lần 2, chỉ đọc, nguyên vẹn', (await w.getAttribute('#chotBox', 'data-toanven')) === 'nguyen-ven' && /phiên bản 2/.test(await w.innerText('#loKhoaBar')) && !(await w.$('#toanVenLoi')));
  ok('không có lỗi JavaScript khi có bản chụp hỏng', w.errs.length === 0, w.errs.join('|'));
  await app.close();
  { const rH = rowsOf(path.join(dh, 'hakqn.sqlite')); ok('phần mềm không tự sửa bản chụp hỏng, không đổi dấu vân tay; file sao lưu gốc vẫn nguyên', rH[0].data.length === 40 && rH[0].hash === c1.hash && rH[1].data === rN[1].data && sha(b.sqlFile) === shaSaoLuu); }
  console.log('\nBẢNG GHI NHẬN (PA1 tấn | phiên bản | dấu vân tay):\n  Chốt lần 1 | ' + c1.kl + ' | ' + c1.pb + ' | ' + c1.hash + '\n  Chốt lần 2 | ' + c2.kl + ' | ' + c2.pb + ' | ' + c2.hash);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
