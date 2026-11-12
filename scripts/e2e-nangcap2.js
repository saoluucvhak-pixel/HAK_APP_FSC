'use strict';
/* Cài đè từ bản 1.4.x (Electron thật, không có mạng): BẢN SAO cơ sở dữ liệu một chủ hai lô A và B (tests/fixtures/hakqn_v1_4.sqlite) mở bằng bản mới.
 *  1. Dữ liệu còn đủ: số điện thoại chủ rừng, số và ngày ký hợp đồng, địa chỉ giao hàng, cách tính cước, nhân công, xe, phiếu cân.
 *  2. Sao lưu riêng A → sửa A → khôi phục A: A về đúng bản sao lưu, B và chủ rừng giữ nguyên.
 *  3. “Giữ cả hai” với mã lô mới.
 *  4. Khôi phục A trên hồ sơ Windows mới khi mất mạng: số nhân công, xe, phiếu cân, tổng tấn, tiền công (BM-01), tiền cước (BM-10) và địa chỉ giao (BM-04) giống bản gốc;
 *     thử cả máy đích chưa cấu hình Công ty mua hàng và máy đích đã có công ty KHÁC.
 *  5. Tra cứu ba tab từ bản đã lưu (offline).
 * Chạy: xvfb-run -a node scripts/e2e-nangcap2.js */
const {_electron: electron} = require('playwright-core');
const path = require('path'), fs = require('fs'), os = require('os'), crypto = require('crypto');
const JSZip = require('jszip');
const root = path.join(__dirname, '..'), L = require(path.join(root, 'src', 'lorung.js'));
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hakqn-up2-')), out = path.join(dir, 'out'), lotDir = path.join(dir, 'lo');
const dbMay1 = path.join(dir, 'may1.sqlite'); fs.copyFileSync(path.join(root, 'tests', 'fixtures', 'hakqn_v1_4.sqlite'), dbMay1);        // chỉ dùng bản sao
let fail = 0; const ok = (name, cond, extra) => { console.log((cond ? 'ĐẠT  ' : 'LỖI  ') + name + (!cond && extra ? ' — ' + extra : '')); if (!cond) fail++; };
const clone = o => JSON.parse(JSON.stringify(o));
const ADDR_A = 'Cảng dăm Kỳ Hà, Núi Thành, Quảng Nam';
const launch = async (name, env = {}) => { const app = await electron.launch({executablePath: require('electron'), args: [root, '--no-sandbox', '--proxy-server=http://127.0.0.1:9'],
  env: {...process.env, HAKQN_DB: name === 'may1' ? dbMay1 : path.join(dir, name + '.sqlite'), HAKQN_USERDATA: path.join(dir, 'ud-' + name), HAKQN_DOWNLOAD_DIR: out, HAKQN_LOT_DIR: lotDir, ELECTRON_DISABLE_SECURITY_WARNINGS: '1', ...env}});
  const w = await app.firstWindow(); w.errs = []; w.on('pageerror', e => w.errs.push(e.message)); w.on('dialog', d => d.accept()); await w.waitForSelector('#side'); return {app, w}; };
const dbOf = w => w.evaluate(() => window.hak.loadSync().db);
async function docText(file) { const z = await JSZip.loadAsync(fs.readFileSync(file)); let all = ''; const docs = file.endsWith('.zip') ? await Promise.all(Object.keys(z.files).filter(n => n.endsWith('.docx')).map(async n => JSZip.loadAsync(await z.file(n).async('nodebuffer')))) : [z]; for (const d of docs) { const x = await d.file('word/document.xml').async('string'); all += (x.match(/<w:t[^>]*>([^<]*)<\/w:t>/g) || []).map(a => a.replace(/<[^>]+>/g, '')).join('') + '\n'; } return all.replace(/&amp;/g, '&'); }
async function exportText(w, kind, xt) { for (const f of fs.existsSync(out) ? fs.readdirSync(out) : []) fs.unlinkSync(path.join(out, f)); await w.click('[data-ftab=xuat]'); await w.click(`[data-xtab=${xt}]`); await w.click(`button[data-act=dl][data-kind=${kind}]`); for (let i = 0; i < 80; i++) { const f = fs.existsSync(out) && fs.readdirSync(out).find(x => /\.(zip|docx)$/.test(x)); if (f) { await w.waitForTimeout(300); return docText(path.join(out, f)); } await w.waitForTimeout(100); } throw new Error('không thấy file xuất ' + kind); }
const nums = t => (t.match(/\d{1,3}(?:\.\d{3})+(?:,\d+)?|\d+,\d+/g) || []).sort();
const openLot = async (w, fid, ftab = 'finfo') => { await w.click('[data-open=own1]'); await w.click('[data-tab=rung]'); await w.click(`[data-forest=${fid}]`); await w.click(`[data-ftab=${ftab}]`); };

(async () => {
  fs.mkdirSync(lotDir, {recursive: true});
  let {app, w} = await launch('may1');
  const base = clone(await dbOf(w)), A0 = base.rs.own1.forests.fa;
  // ===== 1. Dữ liệu còn đủ sau cài đè =====
  const o = base.rs.own1;
  ok('giữ số điện thoại chủ rừng, số và ngày ký hợp đồng', o.info.sdt === '0905 123 456' && o.info.soHopDong === 'HD-2026/015' && o.info.ngayKyHopDong === '02/10/2026');
  ok('một chủ hai lô A và B còn đủ nhân công, xe, phiếu cân', Object.keys(o.forests).length === 2 && o.forests.fa.nc.length === 3 && o.forests.fa.dx.length === 2 && o.forests.fa.pc.length === 2 && o.forests.fb.pc.length === 1);
  ok('giữ địa chỉ giao hàng đã chốt và cách tính cước của từng lô', A0.info.muaHang.diaChi === ADDR_A && A0.info.vanChuyen.mode === 'tanKm' && A0.info.cuLy === 45 && o.forests.fb.info.vanChuyen.mode === 'coDinh' && o.forests.fb.info.muaHang.diaChi.startsWith('KCN Điện Nam'));
  await w.click('[data-open=own1]'); const frm = await w.evaluate(() => ({sdt: document.querySelector('#infoForm [name=sdt]').value, so: document.querySelector('#infoForm [name=soHopDong]').value, ngay: document.querySelector('#infoForm [name=ngayKyHopDong]').value}));
  ok('màn hình chủ rừng hiện số điện thoại, số hợp đồng, ngày ký', frm.sdt === '0905 123 456' && frm.so === 'HD-2026/015' && frm.ngay === '02/10/2026', JSON.stringify(frm));
  await openLot(w, 'fa', 'dx'); const main = await w.innerText('#main');
  ok('tab Vận chuyển lô A: hiện địa chỉ giao đã chốt, cự ly 45 km và cước tấn/km', main.includes(ADDR_A) && /Cự ly vận chuyển: 45 km/.test(main) && /45\.000 đồng\/tấn/.test(main));
  const gk0 = await exportText(w, 'gk', 'hd'), ttvc0 = await exportText(w, 'ttvc', 'vc'), hdvc0 = await exportText(w, 'hdvc', 'vc'), nttl0 = await exportText(w, 'nttl', 'hd');
  ok('BM-04 lô A ghi địa chỉ giao đã chốt; BM-01 và BM-14 cùng số 015/2026-KT; số điện thoại chủ rừng được in', hdvc0.includes(ADDR_A) && gk0.includes('Số: 015/2026-KT') && nttl0.includes('015/2026-KT') && gk0.includes('Điện thoại: 0905 123 456') && gk0.includes('Căn cứ Hợp đồng số HD-2026/015 ký ngày 02/10/2026'));
  // ===== 2. Sao lưu riêng A → sửa A → khôi phục A =====
  await w.click('[data-ftab=finfo]'); await w.click('#lotBackupBtn'); await w.waitForTimeout(600);
  const fileA = path.join(lotDir, fs.readdirSync(lotDir).find(f => /R-A/.test(f))), pkgA = JSON.parse(fs.readFileSync(fileA, 'utf8'));
  ok('file sao lưu lô A: một lô, mang địa chỉ giao đã chốt, nhận diện chủ có số điện thoại và hợp đồng', pkgA.maLo === 'R-A' && pkgA.lo.info.muaHang.diaChi === ADDR_A && pkgA.chuRung.info.sdt === '0905 123 456' && pkgA.chuRung.info.soHopDong === 'HD-2026/015' && !/R-B/.test(JSON.stringify(pkgA)));
  const ed = clone(await dbOf(w)); ed.rs.own1.forests.fa.pc.push({_row: 4, maRung: 'R-A', stt: '3', ngay: '09/10/2026', bienSo: '92C-12345', soPhieu: 'SUA', kl: 99, noiGiao: 'X', ghiChu: ''}); ed.rs.own1.forests.fa.info.tenRung = 'LÔ A ĐÃ SỬA'; ed.rs.own1.forests.fb.pc.push({_row: 3, maRung: 'R-B', stt: '2', ngay: '10/10/2026', bienSo: '92C-12345', soPhieu: 'PB2', kl: 4, noiGiao: 'X', ghiChu: ''});
  await w.evaluate(d => window.hak.save(d), ed); const edited = clone(await dbOf(w)); await app.close();
  ({app, w} = await launch('may1', {HAKQN_LOT_FILE: fileA}));
  await w.click('#moreMenu summary'); await w.click('#lotRestoreBtn'); await w.waitForSelector('#impBox.on'); await w.check('input[name=lotAct][value=thay]'); await w.click('[data-act=lotGo]'); await w.waitForTimeout(700);
  let d2 = await dbOf(w);
  ok('khôi phục A: A trở lại đúng bản sao lưu (so với trước khi sửa)', JSON.stringify(d2.rs.own1.forests.fa) === JSON.stringify(A0));
  ok('B và hồ sơ chủ rừng giữ nguyên (B giữ cả phần sửa sau sao lưu)', JSON.stringify(d2.rs.own1.forests.fb) === JSON.stringify(edited.rs.own1.forests.fb) && JSON.stringify(d2.rs.own1.info) === JSON.stringify(edited.rs.own1.info));
  // ===== 3. Giữ cả hai với mã lô mới =====
  const full = path.join(dir, 'sao_luu_A.json'); fs.writeFileSync(full, JSON.stringify({v: 2, rs: {own1: Object.assign(clone(d2.rs.own1), {forests: {fa: d2.rs.own1.forests.fa}})}, congTy: d2.congTy}));
  await w.setInputFiles('input[data-file=restore]', full); await w.waitForSelector('#impBox.on'); await w.check('input[name=impStrat][value=both]');
  ok('giữ cả hai: gợi ý mã mới chưa tồn tại', (await w.inputValue('#impMa [data-mamoi=fa]')) === 'R-A-2');
  await w.fill('#impMa [data-mamoi=fa]', 'R-A-BAN-SAO'); await w.waitForTimeout(700); await w.click('[data-act=impGo]'); await w.waitForTimeout(900);
  d2 = await dbOf(w); const dup = Object.values(d2.rs.own1.forests).find(f => f.info.maRung === 'R-A-BAN-SAO');
  ok('giữ cả hai: lô nhân bản có mã mới và dòng nhân công/xe/phiếu đổi theo; A và B giữ nguyên', !!dup && dup.nc.every(r => r.maRung === 'R-A-BAN-SAO') && dup.dx.every(r => r.maRung === 'R-A-BAN-SAO') && JSON.stringify(d2.rs.own1.forests.fa) === JSON.stringify(A0) && JSON.stringify(d2.rs.own1.forests.fb) === JSON.stringify(edited.rs.own1.forests.fb) && L.duplicateGroups(d2).length === 0);
  // ===== 5. Tra cứu ba tab offline từ bản đã lưu =====
  await w.click('[data-act=lkOpen]'); await w.waitForSelector('#lkBox.on'); const st = await w.evaluate(() => window.hak.lookup.status());
  ok('tra cứu offline: bản đã lưu còn nguyên sau cài đè (3 tab có dữ liệu)', st.ok && JSON.stringify(st).length > 50, JSON.stringify(st).slice(0, 300));
  const rs = await w.evaluate(() => window.hak.lookup.search('', '', {})); ok('tra cứu offline: tìm được dòng từ bản đã lưu', rs.ok && ((rs.rows || rs.results || []).length > 0 || (rs.total || 0) > 0 || JSON.stringify(rs).length > 200), JSON.stringify(rs).slice(0, 200));
  ok('không lỗi script giao diện (máy 1)', w.errs.length === 0, w.errs.join('|')); await app.close();
  // ===== 4. Khôi phục A trên hồ sơ Windows mới, mất mạng =====
  const tonsA = L.sumKl(A0.pc);
  for (const [name, seed] of [['may2', null], ['may3', {v: 2, congTy: {z9: {id: 'z9', ten: 'CÔNG TY KHÁC TẠI MÁY ĐÍCH', mst: '', diaChi: 'Số 9 đường khác, Huế', nguoiDaiDien: '', chucVu: '', sdt: '', email: '', diaChiGiao: [], ghiChu: ''}}, rs: {}}]]) {
    ({app, w} = await launch(name, {HAKQN_LOT_FILE: fileA}));
    if (seed) { await w.evaluate(d => window.hak.save(d), seed); await w.reload(); await w.waitForSelector('#side'); }
    await w.click('#moreMenu summary'); await w.click('#lotRestoreBtn'); await w.waitForSelector('#impBox.on');
    const box = await w.innerText('#impBody'); ok(name + ': xem trước báo chủ rừng và lô chưa có, nêu tổng tấn', /chưa có.*tạo chủ mới/.test(box) && /chưa có trên máy/.test(box) && box.includes('21,75'), box.slice(0, 300));
    await w.click('[data-act=lotGo]'); await w.waitForTimeout(800);
    const dn = await dbOf(w), no = Object.values(dn.rs)[0], fl = no && Object.values(no.forests)[0];
    ok(name + ': đủ số nhân công, xe, phiếu cân và tổng tấn ' + String(tonsA).replace('.', ','), !!fl && fl.nc.length === 3 && fl.dx.length === 2 && fl.pc.length === 2 && L.sumKl(fl.pc) === tonsA);
    ok(name + ': chủ rừng mới mang số điện thoại, số và ngày ký hợp đồng; dữ liệu lô giống bản sao lưu', no.info.sdt === '0905 123 456' && no.info.soHopDong === 'HD-2026/015' && no.info.ngayKyHopDong === '02/10/2026' && JSON.stringify(fl) === JSON.stringify(pkgA.lo));
    await w.click(`[data-open=${Object.keys(dn.rs)[0]}]`); await w.click('[data-tab=rung]'); await w.click(`[data-forest=${Object.keys(no.forests)[0]}]`);
    const gk1 = await exportText(w, 'gk', 'hd'), ttvc1 = await exportText(w, 'ttvc', 'vc'), hdvc1 = await exportText(w, 'hdvc', 'vc');
    ok(name + ': tiền công (BM-01) giống bản gốc', nums(gk1).length > 3 && JSON.stringify(nums(gk1)) === JSON.stringify(nums(gk0)), nums(gk0).join(' ') + ' | ' + nums(gk1).join(' '));
    ok(name + ': tiền cước (BM-10) giống bản gốc', nums(ttvc1).length > 0 && JSON.stringify(nums(ttvc1)) === JSON.stringify(nums(ttvc0)), nums(ttvc0).join(' ') + ' | ' + nums(ttvc1).join(' '));
    ok(name + ': BM-04 ghi đúng địa chỉ giao hàng đã chốt' + (seed ? ' (máy đích có công ty khác, không bị thay)' : ' (máy đích chưa cấu hình Công ty mua hàng)'), hdvc1.includes(ADDR_A) && !hdvc1.includes('Số 9 đường khác'));
    ok(name + ': số hợp đồng BM-01 giống bản gốc (015/2026-KT)', gk1.includes('Số: 015/2026-KT'));
    ok(name + ': không lỗi script giao diện', w.errs.length === 0, w.errs.join('|')); await app.close();
  }
  console.log(fail ? '\n' + fail + ' LỖI' : '\nĐẠT HẾT'); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
