'use strict';
/* Phiếu cân trùng giữa hai lô khi ngày viết khác nhau (“1/11/2026” và “01/11/2026”): phát hiện qua giao diện, chặn BM-08, 09, 10, 14 ở xuất riêng và xuất theo gói; ngày không có thật không dùng làm căn cứ (Electron thật, SQLite thật).
 * Chạy: xvfb-run -a node scripts/e2e-cheo-lo-ngay.js */
const {_electron: electron} = require('playwright-core');
const path = require('path'), fs = require('fs'), os = require('os');
const JSZip = require('jszip');
const src = fs.readFileSync(path.join(__dirname, 'e2e-inan2.js'), 'utf8');
const {lot, seed, P} = new Function(src.slice(src.indexOf('const nv ='), src.indexOf('const plain =')) + '; return {lot, seed, P};')();
const root = path.join(__dirname, '..');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hakqn-cln-'));
let fail = 0; const ok = (name, cond, extra) => { console.log((cond ? 'ĐẠT  ' : 'LỖI  ') + name + (!cond && extra ? ' — ' + extra : '')); if (!cond) fail++; };
(async () => {
  const out = path.join(dir, 'out'); fs.mkdirSync(out, {recursive: true});
  const app = await electron.launch({executablePath: require('electron'), args: [root, '--no-sandbox'], env: {...process.env, HAKQN_CLOSE: 'discard', HAKQN_DB: path.join(dir, 'd.sqlite'), HAKQN_USERDATA: path.join(dir, 'ud'), HAKQN_DOWNLOAD_DIR: out}});
  const w = await app.firstWindow(); const errs = []; w.on('pageerror', e => errs.push(e.message)); w.on('dialog', d => d.accept()); await w.waitForSelector('#side');
  const mk = (id, ma, ngay, so, extra, bien) => { const l = lot(id, ma, {exp: {soKT: extra || '015', ngayKy: '02/10/2026', soVC: '07', ntSo: '03', pcSo: '09', pcNgay: '20/12/2026', ntNgay: '20/12/2026'}, kl: null, pc: [P(1, ngay, bien || '92C-12345', so || 'P1', 12.5)]}); l.nc = l.nc.map(r => ({...r, maRung: ma})); l.dx = l.dx.map(r => ({...r, maRung: ma})); l.pc = l.pc.map(r => ({...r, maRung: ma, ngay, bienSo: bien || '92C-12345', soPhieu: so || 'P1'})); return l; };
  const A = mk('fa', 'R-A', '1/11/2026', 'P1', '015'), B = mk('fb', 'R-B', '01/11/2026', 'P1', '016'), C = mk('fc', 'R-C', '03/11/2026', 'P7', '017');
  await w.evaluate(d => window.hak.save(d), seed([A, B, C, mk('fd', 'R-D', '02/11/2026', 'P1', '018'), mk('fe', 'R-E', '01/11/2026', 'P1', '019', '92C-67890')])); await w.reload(); await w.waitForSelector('#side');
  const open = async fid => { await w.click('[data-open=own1]').catch(() => {}); await w.click('[data-tab=rung]'); await w.click('[data-forest=' + fid + ']'); await w.waitForTimeout(300); };
  const zipNames2 = async kind => { for (const f of fs.readdirSync(out)) fs.unlinkSync(path.join(out, f)); await w.click('button[data-act=dl][data-kind=' + kind + ']'); let f = null; for (let i = 0; i < 100 && !f; i++) { f = fs.readdirSync(out).find(x => x.endsWith('.zip')); await w.waitForTimeout(200); } await w.waitForTimeout(500); const z = await JSZip.loadAsync(fs.readFileSync(path.join(out, f))); return Object.keys(z.files).filter(n => !z.files[n].dir); };
  const zipNames = async () => { for (const f of fs.readdirSync(out)) fs.unlinkSync(path.join(out, f)); await w.click('[data-ftab=xuat]'); await w.waitForTimeout(300); await w.click('button[data-act=dl][data-kind=all]'); let f = null; for (let i = 0; i < 100 && !f; i++) { f = fs.readdirSync(out).find(x => x.endsWith('.zip')); await w.waitForTimeout(200); } await w.waitForTimeout(500); const z = await JSZip.loadAsync(fs.readFileSync(path.join(out, f))); return Object.keys(z.files).filter(n => !z.files[n].dir); };
  // 1. lô B: phiếu P1 ngày 01/11/2026 trùng phiếu P1 ngày 1/11/2026 của lô A
  await open('fb'); await w.click('[data-ftab=kt]'); await w.waitForTimeout(500); const kt = await w.innerText('#main');
  ok('Kiểm tra: báo phiếu P1 giống hệt phiếu ở lô R-A (ngày viết khác nhau vẫn trùng), nêu số phiếu và mã lô', /Phiếu P1/.test(kt) && /giống hệt/.test(kt) && /lô R-A/.test(kt), kt.slice(0, 500));
  ok('mục chặn ghi rõ các biểu mẫu bị chặn gồm BM-08, 09, 10, 14', /chặn BM-08, 09, 10, 14|BM-08[^\n]*BM-14|chặn BM-0?8/.test(kt) || /chặn BM-09, BM-10/.test(kt), kt.slice(0, 600));
  // 2. xuất riêng
  await w.click('[data-ftab=xuat]'); await w.waitForTimeout(400);
  const dis = async kind => (await w.$$eval('button[data-act=dl][data-kind=' + kind + ']', bs => bs.map(b => b.disabled)));
  const d = {tc: await dis('tc'), xnvc: await dis('xnvc'), ttvc: await dis('ttvc'), nttl: await dis('nttl')};
  ok('xuất riêng: mọi nút BM-08, BM-09, BM-10, BM-14 của lô B (nếu có) đều bị khóa; nút BM-14 hiện và bị khóa', Object.values(d).every(a => a.every(Boolean)) && d.nttl.length > 0, JSON.stringify(d));
  const d2 = (await w.evaluate(() => window.__d2Missing())).filter(x => ['08', '14'].includes(x.code)).map(x => x.code + ': ' + x.full.join(' | '));
  ok('in bổ sung đợt 2 (bản đầy đủ): BM-08 và BM-14 của lô B bị chặn vì phiếu giống hệt lô khác', d2.length >= 2 && d2.every(x => /phiếu cân giống hệt/.test(x)), d2.join(' || '));
  // 3. theo gói
  let names = await zipNames();
  ok('xuất theo gói “Toàn bộ hồ sơ”: không có BM-08, 09, 10, 14 của lô B', !names.some(n => /(08_Bang_thanh_toan|09_XN_khoi_luong|10_TT_tien_VC|14_BB_nghiem_thu)/.test(n)), names.join(', '));
  ok('đợt 1 vẫn xuất bình thường (hợp đồng giao khoán, vận chuyển)', names.some(n => /01_HD_Giao_khoan/.test(n)) && names.some(n => /04_HD_van_chuyen/i.test(n) || /04_/.test(n)), names.join(', '));
  await open('fa'); await w.click('[data-ftab=kt]'); await w.waitForTimeout(500); { const ka = await w.innerText('#main'); ok('lô A (ngày ghi 1/11/2026) cũng báo trùng với lô R-B, nêu số phiếu P1', /Phiếu P1/.test(ka) && /lô R-B/.test(ka), ka.slice(0, 300)); }
  // 3b. xuất lẻ BM-09, BM-10 (từng đội xe) ở tab Vận chuyển của hồ sơ: bị khóa; hợp đồng vận chuyển BM-04 vẫn xuất; gói đợt 2 không có BM-08, 09, 10, 14
  await open('fb'); await w.click('[data-ftab=xuat]'); await w.click('[data-xtab=vc]'); await w.waitForTimeout(400);
  const dv = async k => (await w.$$eval('button[data-act=dl][data-kind=' + k + ']', bs => bs.map(b => b.disabled)));
  const xv = await dv('xnvc'), tv = await dv('ttvc'), hv = await dv('hdvc');
  ok('xuất lẻ BM-09 và BM-10 (tải tất cả và từng đội xe): mọi nút bị khóa; BM-04 vẫn xuất được', xv.length > 0 && tv.length > 0 && xv.every(Boolean) && tv.every(Boolean) && hv.some(x => !x), JSON.stringify([xv, tv, hv]));
  await w.click('[data-xtab=all]').catch(() => {}); await w.waitForTimeout(300); const cu = await dis('cuoi');
  if (cu.length && !cu[0]) { names = await zipNames2('cuoi'); ok('gói đợt 2: không có BM-08, 09, 10, 14', !names.some(n => /^(08|09|10|14)_/.test(n)), names.join(', ')); } else ok('gói đợt 2: nút bị khóa (không còn mẫu nào xuất được)', cu.length > 0 && cu[0], JSON.stringify(cu));
  // đối chứng: hai phiếu KHÁC NGÀY (lô D, 02/11/2026) và KHÁC BIỂN SỐ (lô E) so với lô A (P1, 1/11/2026, 92C-12345): không bị coi là trùng
  for (const [id, ma] of [['fd', 'R-D'], ['fe', 'R-E']]) {
    await open(id); await w.click('[data-ftab=kt]'); await w.waitForTimeout(500); const kk = await w.innerText('#main');
    ok('đối chứng ' + ma + ': không báo phiếu giống hệt lô khác', !/giống hệt/.test(kk), kk.slice(0, 300));
    names = await zipNames(); ok('đối chứng ' + ma + ': BM-08, 09, 10, 14 vẫn xuất trong gói toàn bộ', ['08_Bang_thanh_toan', '09_XN_khoi_luong', '10_TT_tien_VC', '14_BB_nghiem_thu'].every(k => names.some(n => n.includes(k))), names.join(', '));
  }
  // 4. lô C không trùng: đủ BM-08, 09, 10, 14
  await open('fc'); names = await zipNames();
  ok('lô C (phiếu P7 không trùng): đủ BM-08, 09, 10, 14', ['08_Bang_thanh_toan', '09_XN_khoi_luong', '10_TT_tien_VC', '14_BB_nghiem_thu'].every(k => names.some(n => n.includes(k))), names.join(', '));
  // 5. không xóa, không chuyển phiếu
  const F = (await w.evaluate(() => window.hak.loadSync().db)).rs.own1.forests;
  ok('phần mềm không tự xóa hay chuyển phiếu: lô A, B vẫn giữ nguyên phiếu P1 với ngày gốc', F.fa.pc.length === 1 && F.fa.pc[0].ngay === '1/11/2026' && F.fb.pc.length === 1 && F.fb.pc[0].ngay === '01/11/2026');
  // 6. ngày không có thật: không kết luận trùng, báo lỗi ngày
  const D = await w.evaluate(() => window.hak.loadSync().db); D.rs.own1.forests.fa.pc[0].ngay = '31/11/2026'; D.rs.own1.forests.fb.pc[0].ngay = '31/11/2026';
  await w.evaluate(d => window.hak.save(d), D); await w.reload(); await w.waitForSelector('#side'); await open('fb'); await w.click('[data-ftab=kt]'); await w.waitForTimeout(500);
  const kt2 = await w.innerText('#main');
  ok('ngày 31/11/2026 không có thật ở cả hai lô: báo lỗi ngày (không có thật), không kết luận phiếu trùng', /không có thật|ngày/i.test(kt2) && !/giống hệt phiếu đã có ở lô/.test(kt2), kt2.slice(0, 500));
  ok('không có lỗi script trên màn hình', errs.length === 0, errs.join(' | '));
  await app.close(); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
