'use strict';
/* STT văn bản đã cấp không cấp lại (Electron thật, SQLite thật): cấp số cho hai đội và hai đội xe → xóa đội 01 và đội xe 01 → lưu → đóng và mở lại app → thêm đội mới / đội xe mới nhận 03.
 * Đội 02 giữ nguyên số; lịch sử STT nằm trong SQLite. Chạy: xvfb-run -a node scripts/e2e-stt-lich-su.js */
const {_electron: electron} = require('playwright-core');
const path = require('path'), fs = require('fs'), os = require('os');
const src = fs.readFileSync(path.join(__dirname, 'e2e-inan2.js'), 'utf8');
const {nv, lot, seed} = new Function(src.slice(src.indexOf('const nv ='), src.indexOf('const plain =')) + '; return {nv, lot, seed};')();
const M = require('../src/model');
const root = path.join(__dirname, '..');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hakqn-stt-'));
let fail = 0; const ok = (name, cond, extra) => { console.log((cond ? 'ĐẠT  ' : 'LỖI  ') + name + (!cond && extra ? ' — ' + extra : '')); if (!cond) fail++; };
const lotDir = path.join(dir, 'lot'); fs.mkdirSync(lotDir, {recursive: true});
const launch = (env = {}, name = 'd') => electron.launch({executablePath: require('electron'), args: [root, '--no-sandbox'], env: {...process.env, HAKQN_CLOSE: 'discard', HAKQN_DB: path.join(dir, name + '.sqlite'), HAKQN_USERDATA: path.join(dir, 'ud-' + name), HAKQN_DOWNLOAD_DIR: path.join(dir, 'out'), HAKQN_LOT_DIR: lotDir, ...env}});
(async () => {
  // dữ liệu giả lập: lô R-A có Đội 1 (trống) và Đội 2 (đủ người), Đội xe 1 (trống) và Đội xe 2 (các xe)
  let f = M.ensureForest(lot('fa', 'R-A', {exp: {ngayKy: '02/10/2026'}, kl: null, pc: [], nc: [nv(1, 'Tổ trưởng', 'TT HAI', 'Tổ trưởng', '049085009001'), nv(2, 'Công nhân', 'CN A', 'Công nhân khai thác', '049085009002')].map(r => ({...r, maRung: 'R-A'}))}));
  f.doi[0].ten = 'Đội 1'; const a = M.addTeam(f, 'Đội 2'); f = a.f; f = M.moveMembers(f, f.nc.map((r, i) => i), a.id).f || f;
  f.doi.forEach(d => { d.exp = d.exp || {}; });
  const h = M.addHd(f, 'Xe 2'); f = h.f; f.hdvc[0].ten = 'Xe 1'; f = M.moveXe(f, f.dx.map((r, i) => i), h.id).f || f;
  const idDoi1 = f.doi[0].id, idDoi2 = f.doi[1].id, idHd1 = f.hdvc[0].id;
  let app = await launch(), w = await app.firstWindow(); const errs = []; w.on('pageerror', e => errs.push(e.message)); w.on('dialog', d => d.accept()); await w.waitForSelector('#side');
  await w.evaluate(d => window.hak.save(d), seed([f])); await w.reload(); await w.waitForSelector('#side');
  const forest = async () => (await w.evaluate(() => window.hak.loadSync().db)).rs.own1.forests.fa;
  const open = async ftab => { if (!(await w.$('[data-ftab=nc]'))) { await w.click('[data-open=own1]'); await w.click('[data-tab=rung]'); await w.click('[data-forest=fa]'); } await w.click('[data-ftab=' + ftab + ']'); await w.waitForTimeout(400); };
  const save = async () => { await w.click('button[data-act=stSave]'); await w.waitForTimeout(700); };
  // 1. cấp số cho hai đội và hai đội xe
  await open('xuat'); await w.waitForSelector('#soVanBan'); await w.click('[data-act=svbDien]'); await w.waitForTimeout(500); await save();
  ok('sau khi lưu không còn thay đổi chưa lưu (không hiện hộp hỏi khi chuyển màn)', (await w.evaluate(() => window.__stDirty ? window.__stDirty().length : -1)) === 0);
  let F = await forest(); const so2 = F.doi[1].exp.soKT, soxe2 = F.hdvc[1].exp.soVC;
  ok('cấp số: đội 01 và đội 02, đội xe 01 và 02; lịch sử STT lưu theo từng nhóm', F.doi[0].stt === 1 && F.doi[1].stt === 2 && F.hdvc[0].stt === 1 && F.hdvc[1].stt === 2 && F.sttDaCap.doi.join() === '1,2' && F.sttDaCap.doiXe.join() === '1,2', JSON.stringify([F.doi.map(d => d.stt), F.hdvc.map(d => d.stt), F.sttDaCap]));
  ok('số văn bản theo quy tắc: đội 02 = 02/2026/HĐGK-RA; đội xe 02 = 02/2026/HĐVC-RA', /^02\/2026\/HĐGK-RA$/.test(so2) && /^02\/2026\/HĐVC-RA$/.test(soxe2), so2 + ' | ' + soxe2);
  // 2. xóa đội 01 và đội xe 01 → lưu
  await open('nc'); await w.click('[data-act=chonDoi][data-doi="' + idDoi1 + '"]'); await w.waitForTimeout(300); await w.click('[data-act=xoaDoi]'); await w.waitForTimeout(500);
  await open('dx'); await w.click('[data-act=chonHd][data-hd="' + idHd1 + '"]'); await w.waitForTimeout(300); await w.click('[data-act=xoaHd]'); await w.waitForTimeout(500); await save();
  F = await forest();
  ok('đã xóa đội 01 và đội xe 01; lịch sử STT vẫn giữ [1, 2]', F.doi.length === 1 && F.hdvc.length === 1 && F.sttDaCap.doi.join() === '1,2' && F.sttDaCap.doiXe.join() === '1,2', JSON.stringify([F.doi.length, F.hdvc.length, F.sttDaCap]));
  // 3. đóng và mở lại app
  await app.close(); app = await launch(); w = await app.firstWindow();   // mở lại app: màn đầu, mở lô từ danh sách w.on('pageerror', e => errs.push(e.message)); w.on('dialog', d => d.accept()); await w.waitForSelector('#side');
  F = await forest(); ok('mở lại app: lịch sử STT và số của đội 02 còn nguyên', F.sttDaCap.doi.join() === '1,2' && F.doi[0].exp.soKT === so2 && F.doi[0].stt === 2, JSON.stringify(F.sttDaCap));
  // 4. thêm đội mới và đội xe mới → nhận 03
  await open('nc'); await w.fill('#doiMoiTen', 'Đội mới'); await w.click('[data-act=themDoi]'); await w.waitForTimeout(500);
  await open('dx'); await w.fill('#hdMoiTen', 'Xe mới'); await w.click('[data-act=themHd]'); await w.waitForTimeout(500); await save();
  await open('xuat'); await w.waitForSelector('#soVanBan'); await w.evaluate(() => { document.getElementById('soVanBan').open = true; });
  const t = await w.innerText('#soVanBan');
  ok('Sổ văn bản (xem trước): đội mới đề xuất 03/2026/HĐGK-RA, đội xe mới 03/2026/HĐVC-RA; không phải 01', /03\/2026\/HĐGK-RA/.test(t) && /03\/2026\/HĐVC-RA/.test(t) && !/\b01\/2026\/HĐGK-RA/.test(t), t.slice(0, 600));
  await w.click('[data-act=svbDien]'); await w.waitForTimeout(500); await save(); F = await forest();
  const moi = F.doi.find(d => d.ten === 'Đội mới'), cu = F.doi.find(d => d.ten !== 'Đội mới'), xm = F.hdvc.find(d => d.ten === 'Xe mới');
  ok('xác nhận điền: đội mới STT 3 và số 03; đội 02 giữ nguyên số và STT', moi.stt === 3 && /^03\/2026\/HĐGK-RA$/.test(moi.exp.soKT) && cu.stt === 2 && cu.exp.soKT === so2 && xm.stt === 3 && /^03\/2026\/HĐVC-RA$/.test(xm.exp.soVC), JSON.stringify([moi.stt, moi.exp.soKT, cu.stt, cu.exp.soKT, xm.stt, xm.exp.soVC]));
  ok('lịch sử STT cập nhật [1, 2, 3] cho cả hai nhóm', F.sttDaCap.doi.join() === '1,2,3' && F.sttDaCap.doiXe.join() === '1,2,3', JSON.stringify(F.sttDaCap));
  // 5. sao lưu RIÊNG lô, khôi phục sang bản dữ liệu khác: lịch sử STT đi theo; đội mới tiếp theo nhận 04 (không cấp lại 01)
  await open('finfo'); await w.click('#lotBackupBtn'); await w.waitForTimeout(700);
  const file = fs.readdirSync(lotDir).find(x => /^HAKQN_LoRung_R-A_.*\.json$/.test(x)); ok('sao lưu riêng lô ra file', !!file, JSON.stringify(fs.readdirSync(lotDir)));
  const pkg = JSON.parse(fs.readFileSync(path.join(lotDir, file), 'utf8')); ok('file sao lưu mang lịch sử STT [1, 2, 3] của cả đội khai thác và đội xe', pkg.lo.sttDaCap && pkg.lo.sttDaCap.doi.join() === '1,2,3' && pkg.lo.sttDaCap.doiXe.join() === '1,2,3', JSON.stringify(pkg.lo.sttDaCap));
  await app.close(); app = await launch({HAKQN_LOT_FILE: path.join(lotDir, file)}, 'may2'); w = await app.firstWindow(); w.on('pageerror', e => errs.push(e.message)); w.on('dialog', d => d.accept()); await w.waitForSelector('#side');
  await w.click('#moreMenu summary'); await w.click('#lotRestoreBtn'); await w.waitForSelector('#impBox.on'); await w.click('[data-act=lotGo]'); await w.waitForTimeout(900);
  const idsR = Object.keys((await w.evaluate(() => window.hak.loadSync().db)).rs); ok('khôi phục lô vào máy khác thành công', idsR.length === 1);
  const ownR = idsR[0], lotR = async () => Object.values((await w.evaluate(() => window.hak.loadSync().db)).rs[ownR].forests)[0];
  let G = await lotR(); ok('sau khôi phục: lịch sử STT còn [1, 2, 3] cả hai nhóm, đội 02 giữ số', G.sttDaCap.doi.join() === '1,2,3' && G.sttDaCap.doiXe.join() === '1,2,3' && G.doi.some(d => d.exp.soKT === so2), JSON.stringify(G.sttDaCap));
  await w.click('[data-open=' + ownR + ']'); await w.click('[data-tab=rung]'); await w.click('[data-forest=' + G.id + ']'); await w.click('[data-ftab=nc]'); await w.fill('#doiMoiTen', 'Đội sau khôi phục'); await w.click('[data-act=themDoi]'); await w.waitForTimeout(500);
  await w.click('[data-ftab=dx]'); await w.fill('#hdMoiTen', 'Xe sau khôi phục'); await w.click('[data-act=themHd]'); await w.waitForTimeout(500); await save();
  await w.click('[data-ftab=xuat]'); await w.waitForSelector('#soVanBan'); await w.click('[data-act=svbDien]'); await w.waitForTimeout(500); await save(); G = await lotR();
  const dmK = G.doi.find(d => d.ten === 'Đội sau khôi phục'), xmK = G.hdvc.find(d => d.ten === 'Xe sau khôi phục');
  ok('sau khôi phục: đội khai thác mới nhận 04, đội xe mới nhận 04 (không cấp lại 01 hay 03)', dmK.stt === 4 && /^04\//.test(dmK.exp.soKT) && xmK.stt === 4 && /^04\//.test(xmK.exp.soVC), JSON.stringify([dmK.stt, dmK.exp.soKT, xmK.stt, xmK.exp.soVC]));
  ok('không có lỗi script trên màn hình', errs.length === 0, errs.join(' | '));
  await app.close(); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
