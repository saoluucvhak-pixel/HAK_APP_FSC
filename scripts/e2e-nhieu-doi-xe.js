'use strict';
/* LÔ NHIỀU ĐỘI XE (bốn đội xe, không giới hạn một hay hai): số văn bản theo từng đội xe và in đợt 2 (Electron thật, SQLite thật, file Word xuất thật; dữ liệu giả lập ở thư mục tạm).
 *  1. bốn đội xe cùng dùng số chung của lô: mục đối chiếu nêu ĐỦ bốn đội; mọi đội in cùng số, không hậu tố;
 *  2. hai trong bốn đội nhập trùng số riêng: chỉ BM-04/09/10 của HAI đội đó bị chặn (nêu cả hai), hai đội còn lại vẫn xuất;
 *  3. cấp số theo Sổ văn bản: bốn đội bốn số khác nhau, lưu theo ID; đảo thứ tự bốn đội: số từng đội không đổi;
 *  4. in đợt 2 với số riêng: in nền bốn đội (BM-09, BM-10) → xác nhận → bổ sung phiếu cân → đóng mở app → in đè: tờ nền, phần in đè của mỗi đội mang đúng số của chính đội đó.
 * Chạy: xvfb-run -a node scripts/e2e-nhieu-doi-xe.js */
const {_electron: electron} = require('playwright-core');
const path = require('path'), fs = require('fs'), os = require('os');
const JSZip = require('jszip');
const root = path.join(__dirname, '..');
const M = require(path.join(root, 'src', 'model.js'));
const src = fs.readFileSync(path.join(__dirname, 'e2e-inan2.js'), 'utf8');
const {lot, seed, P, EXP0, EXP1} = new Function(src.slice(src.indexOf('const nv ='), src.indexOf('const plain =')) + '; return {lot, seed, P, EXP0, EXP1};')();
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hakqn-ndx-')), out = path.join(dir, 'out');
let fail = 0; const ok = (name, cond, extra) => { console.log((cond ? 'ĐẠT  ' : 'LỖI  ') + name + (!cond && extra ? ' — ' + extra : '')); if (!cond) fail++; };
const plain = xml => (xml.match(/<w:t[^>]*>([^<]*)<\/w:t>/g) || []).map(a => a.replace(/<[^>]+>/g, '')).join('');
const launch = async () => { const app = await electron.launch({executablePath: require('electron'), args: [root, '--no-sandbox', '--proxy-server=http://127.0.0.1:9'], env: {...process.env, HAKQN_CLOSE: 'discard', HAKQN_DB: path.join(dir, 'd.sqlite'), HAKQN_USERDATA: path.join(dir, 'ud'), HAKQN_DOWNLOAD_DIR: out}});
  const w = await app.firstWindow(); w.errs = []; w.on('pageerror', e => w.errs.push(e.message)); w.on('dialog', d => d.accept()); await w.waitForSelector('#side'); return {app, w}; };
const BIEN = ['92C-10001', '92C-10002', '92C-10003', '92C-10004'];
/* lô có bốn xe của bốn chủ xe khác nhau → bốn đội xe */
function mk(id, ma, exp, coPhieu) {
  const f = lot(id, ma, {exp, pc: [], kl: null}), m = f.dx[0];
  f.dx = BIEN.map((b, i) => Object.assign({}, m, {_row: i + 2, bienSo: b, chuXe: 'CHỦ XE SỐ ' + (i + 1), cccd: '04900000100' + (i + 1), taiXe: 'TÀI XẾ ' + (i + 1), cccdTx: '04900000200' + (i + 1), nguoiKy: 'Chủ xe', maRung: ma}));
  f.nc = f.nc.map(r => Object.assign({}, r, {maRung: ma}));
  if (coPhieu) f.pc = phieu(ma, id.slice(-1).toUpperCase());
  return M.ensureForest(f);
}
const phieu = (ma, t) => BIEN.map((b, i) => Object.assign(P(i + 1, '0' + (5 + i) + '/10/2026', b, t + (i + 1), 10 + i), {maRung: ma}));

(async () => {
  fs.mkdirSync(out, {recursive: true});
  let {app, w} = await launch();
  const dbNow = () => w.evaluate(() => window.hak.loadSync().db), lo = async id => (await dbNow()).rs.own1.forests[id];
  const saveDb = async d => { const r = await w.evaluate(x => window.hak.save(x), d); await w.reload(); await w.waitForSelector('#side'); return r; };
  const open = async (fid, ftab) => { await w.click('[data-open=own1]'); await w.click('[data-tab=rung]'); await w.click('[data-forest=' + fid + ']'); await w.click('[data-ftab=' + ftab + ']'); await w.waitForTimeout(400); };
  const docZip = async () => { let f = null; for (let i = 0; i < 150 && !f; i++) { f = fs.readdirSync(out).find(x => /\.zip$/.test(x)); if (!f) await w.waitForTimeout(150); }
    const z = await JSZip.loadAsync(fs.readFileSync(path.join(out, f))), o = {}; for (const n of Object.keys(z.files).filter(n => n.endsWith('.docx'))) { const d = await JSZip.loadAsync(await z.file(n).async('nodebuffer')); o[n] = plain(await d.file('word/document.xml').async('string')); } return o; };
  const don = () => { for (const f of fs.readdirSync(out)) fs.unlinkSync(path.join(out, f)); };
  const taiGoi = async () => { don(); await w.click('[data-xtab=all]').catch(() => {}); await w.click('button[data-act=dl][data-kind=all]'); return docZip(); };
  const taiD2 = async mode => { don(); await w.click('[data-xtab=all]').catch(() => {}); await w.waitForSelector('#d2Table'); await w.evaluate(() => document.querySelectorAll('details.d2more').forEach(d => { d.open = true; })); await w.click('#d2Card .docrow [data-act=d2dl][data-mode=' + mode + ']'); return docZip(); };
  const cua = (docs, code, dau) => { const e = Object.entries(docs).filter(([n, t]) => new RegExp('(^|/)' + code + '_').test(n) && t.includes(dau)); return e.length === 1 ? e[0][1] : ''; };
  const CHU = i => 'CHỦ XE SỐ ' + (i + 1);

  ok('lưu dữ liệu thử: lô R-G (bốn đội xe, đủ dữ liệu) và lô R-H (bốn đội xe, chưa có phiếu cân)', (await saveDb(seed([mk('fg', 'R-G', EXP1, true), mk('fh', 'R-H', EXP0, false)]))).ok);
  let F = await lo('fg'); const ids = F.hdvc.map(h => h.id);
  ok('lô R-G có đúng bốn đội xe', ids.length === 4, JSON.stringify(ids));

  // ---------- 1. bốn đội dùng số chung ----------
  await open('fg', 'xuat'); let D = await taiGoi();
  ok('bốn đội xe dùng số chung: mỗi đội có BM-04, BM-09, BM-10 riêng, đều in 07/2026-HĐVC, không hậu tố', BIEN.every((b, i) => ['04', '09', '10'].every(c => cua(D, c, CHU(i)).includes('07/2026-HĐVC') && !/0[79]\.\d\/2026/.test(cua(D, c, CHU(i))))), Object.keys(D).join(', '));
  await w.waitForSelector('#soDoiXeTrung'); const tr = (await w.innerText('#soDoiXeTrung')).replace(/\s+/g, ' ');
  ok('Sổ văn bản nêu ĐỦ bốn đội xe đang cùng in số chung (không chỉ hai đội)', ((tr.match(/Các đội xe ((?:“[^”]+”(?:, )?)+) cùng in số 07\/2026-HĐVC/) || [])[1] || '').split('“').length - 1 === 4, tr.slice(0, 400));

  // ---------- 2. hai trong bốn đội trùng số riêng ----------
  let db = await dbNow(); F = db.rs.own1.forests.fg;
  F.hdvc[0].exp = {soVC: '31/2026-HĐVC', pcSo: '41/2026-XNKL'}; F.hdvc[1].exp = {soVC: '31/2026-HĐVC', pcSo: '42/2026-XNKL'}; F.hdvc[2].exp = {soVC: '33/2026-HĐVC', pcSo: '43/2026-XNKL'}; F.hdvc[3].exp = {soVC: '34/2026-HĐVC', pcSo: '44/2026-XNKL'};
  ok('đội 1 và đội 2 nhập trùng số riêng 31/2026-HĐVC; đội 3, 4 có số riêng khác: lưu được', (await saveDb(db)).ok);
  await open('fg', 'kt'); const kt = await w.innerText('#main');
  ok('màn Kiểm tra chặn và nêu đúng HAI đội trùng số (không nêu đội 3, đội 4)', /Số văn bản đội xe trùng/.test(kt) && /cùng lưu số “31\/2026-HĐVC”/.test(kt) && !/33\/2026-HĐVC|34\/2026-HĐVC/.test(kt), kt.slice(0, 500));
  await w.click('[data-ftab=xuat]'); await w.waitForTimeout(300); D = await taiGoi();
  ok('chỉ BM-04, BM-09, BM-10 của hai đội trùng số bị chặn; đội 3 và đội 4 vẫn xuất đúng số riêng của mình', [0, 1].every(i => ['04', '09', '10'].every(c => !cua(D, c, CHU(i)))) && [2, 3].every(i => cua(D, '04', CHU(i)).includes('Số: 3' + (i + 1) + '/2026-HĐVC') && cua(D, '09', CHU(i)).includes('Số: 4' + (i + 1) + '/2026-XNKL') && cua(D, '10', CHU(i)).includes('3' + (i + 1) + '/2026-HĐVC') && cua(D, '10', CHU(i)).includes('4' + (i + 1) + '/2026-XNKL')), Object.keys(D).join(', '));
  db = await dbNow(); db.rs.own1.forests.fg.hdvc[1].exp.soVC = '32/2026-HĐVC'; await saveDb(db); await open('fg', 'xuat'); D = await taiGoi();
  ok('sửa số riêng của đội 2 thành 32: hết chặn, cả bốn đội xuất đủ BM-04, BM-09, BM-10 với bốn số khác nhau', [0, 1, 2, 3].every(i => cua(D, '04', CHU(i)).includes('Số: 3' + (i + 1) + '/2026-HĐVC')) && !(await w.$('#soDoiXeTrung')));
  db = await dbNow(); F = db.rs.own1.forests.fg; F.hdvc.reverse(); F.dx.reverse(); await saveDb(db); await open('fg', 'xuat'); const D2 = await taiGoi();
  ok('đảo thứ tự bốn đội xe: số trên BM-04, BM-09, BM-10 của từng đội không đổi', [0, 1, 2, 3].every(i => ['04', '09', '10'].every(c => cua(D2, c, CHU(i)) === cua(D, c, CHU(i)) && cua(D2, c, CHU(i)).length > 100)));

  // ---------- 3 và 4. lô R-H: cấp số cho bốn đội, in nền → xác nhận → bổ sung → mở lại → in đè ----------
  await open('fh', 'xuat'); await w.waitForSelector('#soVanBan'); await w.click('[data-act=svbDien]'); await w.waitForTimeout(400); await w.click('button[data-act=stSave]'); await w.waitForTimeout(800);
  F = await lo('fh'); const so = F.hdvc.map(h => ({id: h.id, vc: h.exp.soVC, xn: h.exp.pcSo}));
  ok('cấp số cho bốn đội xe của lô R-H: bốn số hợp đồng và bốn số biên bản khác nhau (01 đến 04), lịch sử STT [1, 2, 3, 4]', new Set(so.map(x => x.vc)).size === 4 && new Set(so.map(x => x.xn)).size === 4 && so.every((x, i) => x.vc === '0' + (i + 1) + '/2026/HĐVC-RH' && x.xn === '0' + (i + 1) + '/2026/XNKL-RH') && F.sttDaCap.doiXe.join() === '1,2,3,4', JSON.stringify([so, F.sttDaCap]));
  const soCua = i => { const h = F.hdvc.find(x => F.dx.some(r => r.chuXe === CHU(i) && (r.hdId === x.id || r.hd === x.id))) || F.hdvc[i]; return {vc: h.exp.soVC, xn: h.exp.pcSo}; };
  await open('fh', 'xuat'); const N = await taiD2('nen');
  ok('in nền: mỗi đội xe một tờ nền BM-09 và BM-10 (tám file) mang đúng số hợp đồng vận chuyển của CHÍNH đội đó, không lẫn số đội khác', [0, 1, 2, 3].every(i => ['09', '10'].every(c => { const t = cua(N, c, CHU(i)); return t.includes(soCua(i).vc) && [0, 1, 2, 3].filter(j => j !== i).every(j => !t.includes(soCua(j).vc)); })) && Object.keys(N).filter(n => /(^|\/)(09|10)_/.test(n)).length === 8, Object.keys(N).join(', '));
  await w.click('#d2Card button[data-act=d2confirm][data-keys*="|"]'); await w.waitForFunction(() => document.querySelectorAll('#d2Table tr[data-adv=cho]').length === 10); await w.waitForTimeout(800);
  ok('xác nhận đã in nền cả bộ: mười mục (BM-08, BM-14 và BM-09, BM-10 của bốn đội xe) chờ dữ liệu', (await w.$$('#d2Table tr[data-adv=cho]')).length === 10);
  await app.close(); ({app, w} = await launch());
  db = await dbNow(); F = db.rs.own1.forests.fh; Object.assign(F, {exp: Object.assign({}, F.exp, EXP1), pc: phieu('R-H', 'H')}); F = M.ensureForest(F); db.rs.own1.forests.fh = F;
  ok('bổ sung phiếu cân và ngày lập cho lô R-H: lưu được', (await saveDb(db)).ok);
  await app.close(); ({app, w} = await launch());
  await open('fh', 'xuat'); await w.click('[data-xtab=all]').catch(() => {}); await w.waitForSelector('#d2Table');
  const adv = await w.evaluate(() => Object.fromEntries([...document.querySelectorAll('#d2Table tr[data-d2]')].map(r => [r.dataset.d2, r.dataset.adv])));
  ok('đóng mở lại sau khi bổ sung: app đề nghị IN ĐÈ đủ mười mục, đúng từng đội xe', Object.keys(adv).length === 10 && Object.values(adv).every(v => v === 'de') && so.every(x => adv['09:hd:' + x.id] === 'de' && adv['10:hd:' + x.id] === 'de'), JSON.stringify(adv));
  const DE = await taiD2('de'); F = await lo('fh');
  ok('in đè: phần của mỗi đội xe mang đúng số hợp đồng và số biên bản của CHÍNH đội đó, khớp tờ nền; phiếu cân đúng xe của đội; không có “BẢN NHÁP”', [0, 1, 2, 3].every(i => { const s9 = cua(DE, '09', CHU(i)), s10 = cua(DE, '10', CHU(i)), v = soCua(i); return s9.includes('Số: ' + v.xn) && s9.includes(v.vc) && s10.includes(v.vc) && s10.includes(v.xn) && s9.includes(BIEN[i]) && s9.includes('H' + (i + 1)) && [0, 1, 2, 3].filter(j => j !== i).every(j => !s9.includes(soCua(j).vc) && !s9.includes(soCua(j).xn) && !s9.includes(BIEN[j]) && !s10.includes(soCua(j).vc)) && cua(N, '09', CHU(i)).includes(v.vc); }) && Object.entries(DE).every(([n, t]) => !/BAN_NHAP|BẢN NHÁP/i.test(n + t)), Object.keys(DE).join(', '));
  ok('số đã cấp không đổi sau cả quy trình in nền, xác nhận, bổ sung, mở lại', JSON.stringify(F.hdvc.map(h => ({id: h.id, vc: h.exp.soVC, xn: h.exp.pcSo}))) === JSON.stringify(so));
  ok('không có lỗi JavaScript', w.errs.length === 0, w.errs.join('|'));
  await app.close(); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
