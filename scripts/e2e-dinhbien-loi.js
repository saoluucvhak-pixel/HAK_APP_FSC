'use strict';
/* Định mức nhân công (Electron thật, SQLite thật): ô “Số người” trống khác số 0 (bản gốc và phiên bản có ngày); chọn phiên bản bằng ngày lịch hợp lệ (30/11, 01/12, 31/11, ngày trống);
 * ngày sai (31/11/2026) được báo rõ, giữ nguyên giá trị gốc, không âm thầm áp dụng bản nào. Chạy: xvfb-run -a node scripts/e2e-dinhbien-loi.js */
const {_electron: electron} = require('playwright-core');
const path = require('path'), fs = require('fs'), os = require('os');
const src = fs.readFileSync(path.join(__dirname, 'e2e-inan2.js'), 'utf8');
const {nv, lot, seed} = new Function(src.slice(src.indexOf('const nv ='), src.indexOf('const plain =')) + '; return {nv, lot, seed};')();
const B = require('../src/dinhbien'), DM = require('../src/dinhmuc');
const root = path.join(__dirname, '..');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hakqn-dbl-'));
let fail = 0; const ok = (name, cond, extra) => { console.log((cond ? 'ĐẠT  ' : 'LỖI  ') + name + (!cond && extra ? ' — ' + extra : '')); if (!cond) fail++; };
(async () => {
  const app = await electron.launch({executablePath: require('electron'), args: [root, '--no-sandbox'], env: {...process.env, HAKQN_CLOSE: 'discard', HAKQN_DB: path.join(dir, 'd.sqlite'), HAKQN_USERDATA: path.join(dir, 'ud'), HAKQN_DOWNLOAD_DIR: path.join(dir, 'out')}});
  const w = await app.firstWindow(); const errs = []; w.on('pageerror', e => errs.push(e.message)); w.on('dialog', d => d.accept()); await w.waitForSelector('#side');
  const mk = (id, ma, tu) => { const l = lot(id, ma, {exp: {}, kl: null, pc: []}); l.info.tuNgay = tu; l.info.denNgay = ''; l.nc = l.nc.map(r => ({...r, maRung: ma})); l.dx = l.dx.map(r => ({...r, maRung: ma})); return l; };
  const D = seed([mk('fa', 'R-A', '30/11/2026'), mk('fb', 'R-B', '01/12/2026'), mk('fc', 'R-C', '31/11/2026'), mk('fd', 'R-D', '')]);
  const db0 = {}; B.set(db0, B.get({}).rows, DM); const a = B.addVersion(db0, '01/12/2026'); B.setVersion(db0, a.id, B.get(db0, '01/12/2026').rows.map(r => r.chucDanh === 'Công nhân cưa' ? {...r, soNguoi: 5} : r), DM);
  D.dinhBien = db0.dinhBien; D.dinhBienVer = db0.dinhBienVer;
  await w.evaluate(d => window.hak.save(d), D); await w.reload(); await w.waitForSelector('#side');
  const DB = async () => (await w.evaluate(() => window.hak.loadSync().db));
  // ---- 3. ô Số người trống khác số 0 ----
  await w.click('#navNorm'); await w.waitForSelector('#dbForm');
  const them = async (cd, so, nv) => { await w.evaluate(([c, s, n]) => { const trs = [...document.querySelectorAll('#dbForm tr[data-db]')], tr = trs[trs.length - 1]; tr.querySelector('[name=b_cd]').value = c; tr.querySelector('[name=b_so]').value = s; tr.querySelector('[name=b_nv]').value = n; document.getElementById('dbForm').requestSubmit(); }, [cd, so, nv]); await w.waitForTimeout(500); };
  const truoc = JSON.stringify((await DB()).dinhBienVer);
  await w.selectOption('#dbVerSel', '01/12/2026'); await w.waitForTimeout(300);
  await them('Vị trí thử trống', '', ''); let t = await w.innerText('#main');
  ok('phiên bản có ngày: ô Số người để trống bị từ chối, báo số dòng và tên vị trí', /Dòng \d+/.test(t) && /Vị trí thử trống/.test(t) && /chưa nhập số người/.test(t), t.slice(0, 300));
  ok('định mức đã lưu không đổi sau lần lưu bị từ chối', JSON.stringify((await DB()).dinhBienVer) === truoc);
  await them('Vị trí thử khoảng trắng', '   ', ''); t = await w.innerText('#main'); ok('khoảng trắng cũng bị từ chối (không thành 0)', /chưa nhập số người/.test(t));
  await them('Vị trí ngoài định biên', '0', ''); const v1 = (await DB()).dinhBienVer[0].rows.find(r => r.chucDanh === 'Vị trí ngoài định biên');
  ok('nhập 0 chủ động: lưu được vào phiên bản, soNguoi = 0', !!v1 && v1.soNguoi === 0, JSON.stringify(v1));
  await w.selectOption('#dbVerSel', 'goc'); await w.waitForTimeout(300); const gocTruoc = JSON.stringify((await DB()).dinhBien);
  await them('Vị trí gốc trống', '', ''); t = await w.innerText('#main'); ok('bản gốc: ô trống bị từ chối, bản gốc đã lưu không đổi', /chưa nhập số người/.test(t) && JSON.stringify((await DB()).dinhBien) === gocTruoc);
  await them('Vị trí gốc 0', '0', ''); ok('bản gốc: nhập 0 chủ động được lưu', ((await DB()).dinhBien.find(r => r.chucDanh === 'Vị trí gốc 0') || {}).soNguoi === 0);
  // ---- 4. chọn phiên bản bằng ngày lịch hợp lệ ----
  await w.click('#navNorm'); await w.waitForSelector('#dbVerBar'); await w.selectOption('#dbVerSel', '01/12/2026'); await w.waitForTimeout(300); t = await w.innerText('#dbVerBar'.replace('Bar', 'Bar')) + await w.innerText('#main');
  ok('màn Định mức: phiên bản 01/12/2026 áp cho R-B và R-D (ngày trống = bản mới nhất); R-C (31/11/2026) nêu riêng là chưa xác định được', /R-B/.test(t) && /R-D/.test(t) && /Chưa xác định được phiên bản của 1 lô/.test(t) && /R-C \(31\/11\/2026\)/.test(t), t.slice(0, 700));
  const open = async (fid, ftab) => { await w.click('[data-open=own1]').catch(() => {}); await w.click('[data-tab=rung]'); await w.click('[data-forest=' + fid + ']'); await w.click('[data-ftab=' + ftab + ']'); await w.waitForTimeout(400); };
  await open('fa', 'nc'); const ta = await w.innerText('#main'); await open('fb', 'nc'); const tb = await w.innerText('#main');
  const dem = x => (x.match(/1 đội (\d+) người/) || [])[1];
  ok('lô 30/11/2026 dùng bản gốc; lô 01/12/2026 (đúng ngày hiệu lực) dùng phiên bản mới (số người khác nhau)', !!dem(ta) && !!dem(tb) && dem(ta) !== dem(tb), dem(ta) + ' vs ' + dem(tb));
  await open('fc', 'nc'); ok('lô 31/11/2026: Nhân công báo rõ ngày không có thật nên chưa chọn được phiên bản (không so với bản nào)', !!(await w.$('#dbNgayLoi')) && /31\/11\/2026/.test(await w.innerText('#dbNgayLoi')) && !/1 đội \d+ người/.test(await w.innerText('#main')));
  await w.click('[data-ftab=kt]'); await w.waitForTimeout(400); const kt = await w.innerText('#main');
  ok('Kiểm tra: mục chặn “Định mức nhân công: ngày bắt đầu sai” nêu ngày 31/11/2026', /ngày bắt đầu sai|ngày bắt đầu khai thác “31\/11\/2026”/.test(kt), kt.slice(0, 500));
  const Z = await DB(); ok('giá trị ngày gốc 31/11/2026 được giữ nguyên, định mức không bị ghi lại', Z.rs.own1.forests.fc.info.tuNgay === '31/11/2026');
  // ---- số dương, số âm, số lẻ, vượt giới hạn: bản gốc lẫn bản có ngày hiệu lực; sau lần lưu lỗi, mở lại app thì dữ liệu đã lưu giữ nguyên ----
  await w.click('#navNorm'); await w.waitForSelector('#dbForm');
  await w.selectOption('#dbVerSel', '01/12/2026'); await w.waitForTimeout(300);
  const v0 = JSON.stringify((await DB()).dinhBienVer), g0 = JSON.stringify((await DB()).dinhBien);
  for (const [so, re, mo] of [['-1', /từ 0 đến 50|số nguyên/, 'âm'], ['1,5', /số nguyên/, 'lẻ'], ['51', /từ 0 đến 50|vượt/, 'vượt giới hạn'], ['abc', /số nguyên|từ 0 đến 50/, 'chữ']]) {
    await them('Vị trí thử ' + mo, so, 'Cưa xăng'); const tt = await w.innerText('#main');
    ok('phiên bản có ngày: số ' + mo + ' (' + so + ') bị từ chối, nêu rõ lý do', re.test(tt) && JSON.stringify((await DB()).dinhBienVer) === v0, tt.slice(0, 250));
  }
  await them('Vị trí thử dương', '2', 'Cưa xăng phụ'); const vd = (await DB()).dinhBienVer.find(v => v.tuNgay === '01/12/2026').rows.find(r => r.chucDanh === 'Vị trí thử dương');
  ok('phiên bản có ngày: số dương 2 kèm nhiệm vụ được lưu (soNguoi = 2)', !!vd && vd.soNguoi === 2, JSON.stringify(vd));
  await w.selectOption('#dbVerSel', 'goc'); await w.waitForTimeout(300);
  await them('Vị trí gốc dương', '3', 'Đẩy cây'); ok('bản gốc: số dương 3 kèm nhiệm vụ được lưu', ((await DB()).dinhBien.find(r => r.chucDanh === 'Vị trí gốc dương') || {}).soNguoi === 3);
  await them('Vị trí gốc trống 2', '', ''); await them('Vị trí gốc âm', '-2', 'Đẩy cây');
  const daLuu = JSON.stringify(await DB());
  await app.close();
  const app2 = await electron.launch({executablePath: require('electron'), args: [root, '--no-sandbox'], env: {...process.env, HAKQN_CLOSE: 'discard', HAKQN_DB: path.join(dir, 'd.sqlite'), HAKQN_USERDATA: path.join(dir, 'ud'), HAKQN_DOWNLOAD_DIR: path.join(dir, 'out')}});
  const w2 = await app2.firstWindow(); await w2.waitForSelector('#side'); const sau = await w2.evaluate(() => window.hak.loadSync().db);
  ok('mở lại app sau các lần lưu lỗi: định mức đã lưu giữ nguyên (dòng trống và số âm không vào dữ liệu)', JSON.stringify(sau) === daLuu && !sau.dinhBien.some(r => /trống 2|gốc âm/.test(r.chucDanh)), 'khác');
  ok('mở lại app: các dòng hợp lệ (0, 2, 3) còn đủ', sau.dinhBien.some(r => r.chucDanh === 'Vị trí gốc 0' && r.soNguoi === 0) && sau.dinhBien.some(r => r.soNguoi === 3 && r.chucDanh === 'Vị trí gốc dương') && sau.dinhBienVer.find(v => v.tuNgay === '01/12/2026').rows.some(r => r.soNguoi === 2), JSON.stringify([sau.dinhBien.filter(r => /Vị trí/.test(r.chucDanh)), sau.dinhBienVer.map(v => v.rows.filter(r => /Vị trí/.test(r.chucDanh)))]));
  await app2.close();
  ok('không có lỗi script trên màn hình', errs.length === 0, errs.join(' | '));
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
