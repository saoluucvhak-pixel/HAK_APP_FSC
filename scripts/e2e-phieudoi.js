'use strict';
/* Cấu trúc 2.0: KHỐI LƯỢNG THỰC HIỆN = PHIẾU CÂN (một nguồn); phiếu cân gắn ĐỘI, gán hàng loạt theo bộ lọc; khối lượng đội = tổng phiếu cân của đội.
 * Chạy: xvfb-run -a node scripts/e2e-phieudoi.js */
const {_electron: electron} = require('playwright-core');
const path = require('path'), fs = require('fs'), os = require('os');
const JSZip = require('jszip');
const src = fs.readFileSync(path.join(__dirname, 'e2e-inan2.js'), 'utf8');
const {nv, lot, seed, plain} = new Function(src.slice(src.indexOf('const nv ='), src.indexOf('const plain =') + src.slice(src.indexOf('const plain =')).indexOf('\n')) + '; return {nv, lot, seed, plain};')();
const root = path.join(__dirname, '..');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hakqn-pcdoi-')), out = path.join(dir, 'out');
let fail = 0; const ok = (name, cond, extra) => { console.log((cond ? 'ĐẠT  ' : 'LỖI  ') + name + (!cond && extra ? ' — ' + extra : '')); if (!cond) fail++; };
(async () => {
  fs.mkdirSync(out, {recursive: true});
  const app = await electron.launch({executablePath: require('electron'), args: [root, '--no-sandbox'], env: {...process.env, HAKQN_CLOSE: 'discard', HAKQN_DB: path.join(dir, 'd.sqlite'), HAKQN_USERDATA: path.join(dir, 'ud'), HAKQN_DOWNLOAD_DIR: out}});
  const w = require('./_hd30').boc(await app.firstWindow()); const errs = []; w.on('pageerror', e => errs.push(e.message)); w.on('dialog', d => d.accept()); await w.waitForSelector('#side');
  const p = (i, vai, ten, cd, doi) => ({...nv(i, vai, ten, cd, '04908500' + String(4000 + i)), doi});
  const P = (i, ngay, bien, so, kl) => ({_row: i + 1, maRung: 'R-A', stt: String(i), ngay, bienSo: bien, soPhieu: so, kl, noiGiao: 'KCN Điện Nam, Quảng Nam'});
  const A = lot('fa', 'R-A', {exp: {soKT: '015', ngayKy: '02/10/2026', ntNgay: '20/12/2026'}, kl: null,
    nc: [p(1, 'Tổ trưởng', 'TRẦN MỘT', 'Tổ trưởng', 'Đội 1'), p(2, 'Công nhân', 'LÊ A', 'Công nhân khai thác', 'Đội 1'), p(3, 'Tổ trưởng', 'NGUYỄN HAI', 'Tổ trưởng', 'Đội 2'), p(4, 'Công nhân', 'PHẠM B', 'Công nhân khai thác', 'Đội 2')],
    pc: [P(1, '05/10/2026', '92C-12345', 'PA1', 12.5), P(2, '06/10/2026', '92C-67890', 'PA2', 9.25), P(3, '07/10/2026', '92C-12345', 'PA3', 8), P(4, '08/10/2026', '92C-67890', 'PA4', 6)]});
  A.info.khoiLuong = null;
  const B = lot('fb', 'R-B', {exp: {}, kl: null, pc: [{...P(1, '05/10/2026', '92C-12345', 'PB1', 5), maRung: 'R-B'}]}); B.nc = B.nc.map(r => ({...r, maRung: 'R-B'})); B.dx = B.dx.map(r => ({...r, maRung: 'R-B'}));
  await w.evaluate(d => window.hak.save(d), seed([A, B])); await w.reload(); await w.waitForSelector('#side');
  const db = async () => (await w.evaluate(() => window.hak.loadSync().db)).rs.own1.forests;
  const open = async (id, ftab) => { await w.click('[data-open=own1]'); await w.click('[data-tab=rung]'); await w.click('[data-forest=' + id + ']'); await w.click('[data-ftab=' + ftab + ']'); await w.waitForTimeout(300); };
  let F = await db();
  ok('lô một đội: phiếu cân tự thuộc đội đó; lô hai đội: phiếu cũ chưa gán', F.fb.pc.every(x => x.doiId === F.fb.doi[0].id) && F.fa.pc.every(x => x.doiId === ''), JSON.stringify(F.fa.pc.map(x => x.doiId)));
  await open('fa', 'finfo');
  ok('Thông tin rừng: không còn ô nhập khối lượng thực tế; hiện tổng phiếu cân 35,75 tấn (4 phiếu)', !(await w.$('#forestForm [name=khoiLuong]')) && /35,75 tấn/.test(await w.innerText('#klPC')) && /4 phiếu cân/.test(await w.innerText('#klPC')), await w.innerText('#klPC').catch(() => ''));
  await w.click('[data-ftab=kt]'); await w.waitForTimeout(300);
  ok('Kiểm tra trước khi xuất: báo 4 phiếu cân chưa gán đội (khối lượng đội đang chia theo số người)', /4 phiếu cân chưa gán đội/.test(await w.innerText('#main')));
  await w.click('[data-ftab=dx]'); await w.waitForTimeout(300);
  ok('bảng phiếu cân có cột Đội và khung gán đội; chưa gán: 4 phiếu', !!(await w.$('#pcGan')) && /chưa gán: 4 phiếu/.test(await w.innerText('#pcGan')));
  // gán hàng loạt theo bộ lọc
  await w.fill('#pgBien', '12345'); await w.selectOption('#pgDoi', 'doi1'); await w.click('[data-act=pcGanLoat]'); await w.waitForTimeout(400);
  ok('gán đội vào BẢN NHÁP: SQLite chưa đổi đến khi bấm “Lưu dữ liệu vào lô”', (await db()).fa.pc.every(x => x.doiId === '') && !!(await w.$('#loDirtyBar')));
  await w.click('#loDirtyBar [data-act=stSave]'); await w.waitForTimeout(400); 
  F = await db();
  ok('lọc biển số 12345 → gán Đội 1: PA1, PA3', JSON.stringify(F.fa.pc.map(x => x.soPhieu + ':' + x.doiId)) === JSON.stringify(['PA1:doi1', 'PA2:', 'PA3:doi1', 'PA4:']), JSON.stringify(F.fa.pc.map(x => x.doiId)));
  await w.fill('#pgBien', ''); await w.selectOption('#pgDoi', 'doi2'); await w.click('[data-act=pcGanLoat]'); await w.waitForTimeout(400); await w.click('#loDirtyBar [data-act=stSave]'); await w.waitForTimeout(400); 
  F = await db();
  ok('lọc “chỉ phiếu chưa gán” → gán Đội 2: PA2, PA4; phiếu đã gán giữ nguyên', JSON.stringify(F.fa.pc.map(x => x.doiId)) === JSON.stringify(['doi1', 'doi2', 'doi1', 'doi2']));
  let k = await w.evaluate(() => window.__doiKT());
  ok('khối lượng từng đội = tổng phiếu cân của đội: Đội 1 20,5 tấn, Đội 2 15,25 tấn', k.doi[0][3] === 20.5 && k.doi[1][3] === 15.25, JSON.stringify(k.doi));
  // sửa một phiếu ở cột Đội
  const ix = F.fa.pc.findIndex(x => x.soPhieu === 'PA4');
  await w.selectOption('select[data-pcdoi="' + ix + '"]', 'doi1'); await w.waitForTimeout(400); await w.click('#loDirtyBar [data-act=stSave]'); await w.waitForTimeout(400); 
  k = await w.evaluate(() => window.__doiKT());
  ok('chọn đội tại dòng: PA4 sang Đội 1 → Đội 1 26,5 tấn, Đội 2 9,25 tấn', (await db()).fa.pc[ix].doiId === 'doi1' && k.doi[0][3] === 26.5 && k.doi[1][3] === 9.25, JSON.stringify(k.doi));
  await w.click('[data-ftab=kt]'); await w.waitForTimeout(300);
  ok('gán đủ: hết cảnh báo phiếu cân chưa gán', !/phiếu cân chưa gán đội/.test(await w.innerText('#main')));
  // BM-14 của từng đội theo phiếu cân của đội
  for (const x of fs.readdirSync(out)) fs.unlinkSync(path.join(out, x));
  await w.click('[data-ftab=xuat]'); await w.click('[data-xtab=all]'); await w.waitForTimeout(300);
  const b = await w.$('button[data-act=dl][data-kind=all]:not([disabled])'); let z = null;
  if (b) { await b.click(); let n = null; for (let i = 0; i < 100 && !n; i++) { n = fs.readdirSync(out).find(x => /\.zip$/.test(x)); if (!n) await w.waitForTimeout(150); } await w.waitForTimeout(300); if (n) z = await JSZip.loadAsync(fs.readFileSync(path.join(out, n))); }
  const nt = z ? Object.keys(z.files).filter(n => /^14_BB_nghiem_thu_thanh_ly\/.*\.docx$/.test(n)).sort() : [];
  const txt = async n => plain(await (await JSZip.loadAsync(await z.file(n).async('nodebuffer'))).file('word/document.xml').async('string'));
  const t1 = nt[0] ? await txt(nt.find(n => /Doi_1/i.test(n)) || nt[0]) : '', t2 = nt[1] ? await txt(nt.find(n => /Doi_2/i.test(n)) || nt[1]) : '';
  ok('BM-14 mỗi đội ghi khối lượng theo phiếu cân của chính đội (26,5 tấn · 3 chuyến; 9,25 tấn · 1 chuyến)', nt.length === 2 && /theo phiếu cân: 26,500 tấn \(3 chuyến/.test(t1) && /theo phiếu cân: 9,250 tấn \(1 chuyến/.test(t2), t1.slice(t1.indexOf('2.2.'), t1.indexOf('2.2.') + 160) + ' | ' + t2.slice(t2.indexOf('2.2.'), t2.indexOf('2.2.') + 160));
  ok('không có lỗi JavaScript', errs.length === 0, errs.join('|'));
  await app.close(); console.log(fail ? 'CÓ ' + fail + ' LỖI' : 'TẤT CẢ ĐẠT'); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
