'use strict';
/* Phiếu #09 — Electron thật, SQLite thật.
 *  (1) ND-08: “Thông tin chủ rừng” có ô chọn từ Danh mục đối tượng: chọn thì điền sẵn họ tên, danh xưng, CCCD, ngày cấp, nơi cấp, địa chỉ; lưu giữ BẢN CHỤP (sửa danh mục sau không đổi hồ sơ);
 *      nhập tay vẫn được; CCCD nhập tay trùng người của danh mục thì cảnh báo, không chặn lưu.
 *  (2) đội “chưa có phiếu cân nào” (phiếu đã gán hết cho đội khác): xuất BM-08 hiện hộp cảnh báo nêu tên đội; “Quay lại” không xuất; “Vẫn xuất” xuất như trước. Không đổi số in.
 *  (3) khung xem trước HoSoKeo không còn ô “Điền tổng … tấn vào Khối lượng khai thác thực tế”.
 * Chạy: xvfb-run -a node scripts/e2e-hoan-thien-nhap.js */
const {_electron: electron} = require('playwright-core');
const path = require('path'), fs = require('fs'), os = require('os');
const src = fs.readFileSync(path.join(__dirname, 'e2e-inan2.js'), 'utf8');
const {nv, lot, seed} = new Function(src.slice(src.indexOf('const nv ='), src.indexOf('const plain =')) + '; return {nv, lot, seed};')();
const root = path.join(__dirname, '..'), M = require(path.join(root, 'src', 'model.js'));
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hakqn-htn-')), out = path.join(dir, 'out');
let fail = 0; const ok = (name, cond, extra) => { console.log((cond ? 'ĐẠT  ' : 'LỖI  ') + name + (!cond && extra ? ' — ' + extra : '')); if (!cond) fail++; };
const P = (so, ngay, kl, doiId) => ({soPhieu: so, ngay, bienSo: '92C-12345', kl, maRung: 'R-A', doiId});
const dsFile = () => (fs.existsSync(out) ? fs.readdirSync(out) : []).filter(f => !f.endsWith('.part'));
(async () => {
  const app = await electron.launch({executablePath: require('electron'), args: [root, '--no-sandbox'], env: {...process.env, HAKQN_CLOSE: 'discard', HAKQN_DB: path.join(dir, 'd.sqlite'), HAKQN_USERDATA: path.join(dir, 'ud'), HAKQN_DOWNLOAD_DIR: out, ELECTRON_DISABLE_SECURITY_WARNINGS: '1'}});
  const w = await app.firstWindow(); const errs = []; w.on('pageerror', e => errs.push(e.message)); w.on('dialog', d => d.accept()); await w.waitForSelector('#side');
  // lô hai đội, hai phiếu đều gán cho Đội 1 → Đội 2 chưa có phiếu nào
  const A = M.ensureForest(lot('fa', 'R-A', {exp: {soKT: '015', ngayKy: '02/10/2026', soVC: '07', ntSo: '03', ntNgay: '20/12/2026', pcSo: '09', pcNgay: '20/12/2026'}, kl: null, pc: [P('P1', '05/10/2026', 10, 'doi1'), P('P2', '06/10/2026', 20, 'doi1')]}));
  A.doi[0].ten = 'Đội 1'; A.doi.push({id: 'doi2', ten: 'Đội 2', hinhThuc: Object.assign({}, A.doi[0].hinhThuc), exp: {}});
  A.nc.push({...nv(4, 'Tổ trưởng', 'VÕ TỔ TRƯỞNG HAI', 'Tổ trưởng', '049085000004'), maRung: 'R-A', doiId: 'doi2'});
  const d = seed([A]); d.rs.own1.forests.fa = M.ensureForest(d.rs.own1.forests.fa); d.rs.own1.forests.fa.phanBo = {cheDo: 'theoPhieu'}; d.rs.own1.forests.fa.pc.forEach(p => { p.doiId = 'doi1'; });
  d.dmDoiTuong = [{id: 'dt1', ma: 'DT0001', ten: 'TRẦN CHỦ RỪNG', loai: 'thenhan', diaChi: 'Quảng Nam', nguoi: [{id: 'ng1', hoTen: 'TRẦN CHỦ RỪNG', cccd: '049090001234', ngayCap: '01/02/2021', noiCap: 'CA Quảng Nam', diaChi: 'Duy Xuyên', gioiTinh: 'Nam', vaiTro: {nhanCong: true}}]}];
  ok('ghi dữ liệu giả lập', (await w.evaluate(x => window.hak.save(x), d)).ok); await w.reload(); await w.waitForSelector('#side');
  const dbAll = async () => await w.evaluate(() => window.hak.loadSync().db);

  // ===== (1) ND-08 =====
  await w.click('[data-open=own1]'); await w.waitForSelector('#infoForm');
  const opts = await w.$$eval('#infoDm option', o => o.map(x => x.textContent.trim()));
  ok('Thông tin chủ rừng có ô chọn từ Danh mục đối tượng (người, CCCD), có mục “nhập tay”', opts.length === 2 && /nhập tay/.test(opts[0]) && /TRẦN CHỦ RỪNG/.test(opts[1]) && /049090001234/.test(opts[1]), JSON.stringify(opts));
  await w.selectOption('#infoDm', 'ng1'); await w.waitForTimeout(200);
  const v = await w.$eval('#infoForm', f => ({xung: f.danhXung.value, ten: f.ten.value, cccd: f.cccd.value, ngayCap: f.ngayCap.value, noiCap: f.noiCap.value, diaChi: f.diaChi.value, id: f.nguoiDmId.value}));
  ok('chọn người: điền sẵn danh xưng, họ tên, CCCD, ngày cấp, nơi cấp, địa chỉ', v.xung === 'Ông' && v.ten === 'TRẦN CHỦ RỪNG' && v.cccd === '049090001234' && v.ngayCap === '01/02/2021' && v.noiCap === 'CA Quảng Nam' && v.diaChi === 'Duy Xuyên' && v.id === 'ng1', JSON.stringify(v));
  await w.click('#infoForm button[type=submit]'); await w.waitForTimeout(400);
  let D = await dbAll(), i1 = D.rs.own1.info;
  ok('lưu: hồ sơ chủ rừng giữ bản chụp và id người đã chọn', i1.ten === 'TRẦN CHỦ RỪNG' && i1.cccd === '049090001234' && i1.diaChi === 'Duy Xuyên' && i1.nguoiDmId === 'ng1', JSON.stringify(i1));
  ok('chọn đúng người trong danh mục: không có cảnh báo CCCD trùng', !(await w.$('[data-info-canh]')) || !/Danh mục đối tượng/.test(await w.innerText('#main')) , '');
  D.dmDoiTuong[0].nguoi[0].hoTen = 'TÊN ĐÃ SỬA'; D.dmDoiTuong[0].nguoi[0].diaChi = 'ĐỊA CHỈ MỚI'; D.dmDoiTuong[0].ten = 'TÊN ĐÃ SỬA';
  await w.evaluate(x => window.hak.save(x), D); await w.reload(); await w.waitForSelector('#side'); D = await dbAll();
  ok('sửa danh mục sau đó: hồ sơ chủ rừng đã lưu KHÔNG đổi (bản chụp)', D.rs.own1.info.ten === 'TRẦN CHỦ RỪNG' && D.rs.own1.info.diaChi === 'Duy Xuyên', JSON.stringify(D.rs.own1.info));
  await w.click('[data-open=own1]'); await w.waitForSelector('#infoForm'); await w.selectOption('#infoDm', ''); await w.fill('#infoForm [name=ten]', 'NGƯỜI NHẬP TAY'); await w.fill('#infoForm [name=cccd]', '049090001234'); await w.click('#infoForm button[type=submit]'); await w.waitForTimeout(400);
  const nt = await w.innerText('#main'); D = await dbAll();
  ok('nhập tay CCCD trùng người của danh mục: vẫn lưu được (không chặn) và có cảnh báo nêu người đó', D.rs.own1.info.ten === 'NGƯỜI NHẬP TAY' && D.rs.own1.info.cccd === '049090001234' && /trùng người/.test(nt) && /Danh mục đối tượng/.test(nt), nt.slice(0, 300));
  await w.fill('#infoForm [name=cccd]', '049090007777'); await w.click('#infoForm button[type=submit]'); await w.waitForTimeout(400);
  ok('nhập tay CCCD không trùng: không còn cảnh báo danh mục', !/trùng người/.test(await w.innerText('#main')));

  // ===== (2) đội chưa có phiếu =====
  await w.click('[data-open=own1]'); await w.click('[data-tab=rung]'); await w.evaluate(() => { const x = document.querySelector('.rungTomTat'); if (x) x.open = true; }); await w.click('[data-forest=fa]'); await w.click('[data-ftab=xuat]'); await w.waitForTimeout(300); await w.click('[data-xtab=all]'); await w.waitForTimeout(300);
  for (const f of dsFile()) fs.rmSync(path.join(out, f), {force: true});
  await w.click('[data-act=dl][data-kind=tc]'); await w.waitForSelector('#chuaGanXuat', {timeout: 8000}).catch(() => {});
  const h = await w.evaluate(() => ({co: !!document.getElementById('chuaGanXuat'), tieu: (document.getElementById('chuaGanTieuDe') || {}).innerText || '', nd: (document.getElementById('chuaGanNoiDung') || {}).innerText || '', bang: (document.getElementById('chuaGanBang') || {}).innerText || ''}));
  ok('xuất BM-08: hộp cảnh báo “Còn đội chưa có phiếu cân nào”, nêu tên Đội 2 và phần chia theo số người', h.co && /đội chưa có phiếu cân nào/i.test(h.tieu) && /Đội 2/.test(h.nd) && /chia theo số người/.test(h.nd) && /22,5/.test(h.nd) && /7,5/.test(h.nd), JSON.stringify(h));
  ok('bảng trong hộp: từng đội và khối lượng sẽ in; Đội 2 đánh dấu chưa có phiếu', /Đội 1/.test(h.bang) && /Đội 2/.test(h.bang) && /chưa có phiếu/.test(h.bang), h.bang);
  await w.click('#chuaGanVe'); await w.waitForTimeout(600);
  ok('“Quay lại gán phiếu”: không xuất file', dsFile().length === 0, dsFile().join(','));
  await w.click('[data-ftab=xuat]').catch(() => {}); await w.waitForTimeout(300); await w.click('[data-xtab=all]').catch(() => {}); await w.waitForTimeout(300);
  await w.click('[data-act=dl][data-kind=tc]'); await w.waitForSelector('#chuaGanXuat', {timeout: 8000}); await w.click('#chuaGanXuat');
  let f = ''; for (let k = 0; k < 80 && !f; k++) { f = dsFile().find(x => /\.(docx|zip)$/.test(x)) || ''; await w.waitForTimeout(200); }
  ok('“Vẫn xuất, chia theo số người”: xuất BM-08 như trước (không chặn)', !!f, dsFile().join(','));
  // đã có phiếu cho cả hai đội → không hỏi
  D = await dbAll(); D.rs.own1.forests.fa.pc[1].doiId = 'doi2'; await w.evaluate(x => window.hak.save(x), D); await w.reload(); await w.waitForSelector('#side');
  await w.click('[data-open=own1]'); await w.click('[data-tab=rung]'); await w.click('[data-forest=fa]'); await w.click('[data-ftab=xuat]'); await w.waitForTimeout(300); await w.click('[data-xtab=all]'); await w.waitForTimeout(300);
  for (const x of dsFile()) fs.rmSync(path.join(out, x), {force: true});
  await w.click('[data-act=dl][data-kind=tc]'); await w.waitForTimeout(1200);
  ok('mỗi đội đều có phiếu: xuất không hỏi', !(await w.$('#chuaGanXuat')));

  // ===== (3) ô “Điền tổng” =====
  const ui = fs.readFileSync(path.join(root, 'renderer', 'index.html'), 'utf8');
  ok('khung xem trước HoSoKeo không còn ô “Điền tổng … vào Khối lượng khai thác thực tế”', !/data-lkkl/.test(ui) && !/> Điền tổng /.test(ui));   // chỉ còn chú thích trong mã, không còn ô nhập
  ok('không có lỗi script trên màn hình', errs.length === 0, errs.join(' | '));
  await app.close(); console.log(fail ? 'CÓ ' + fail + ' LỖI' : 'TẤT CẢ ĐẠT'); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
