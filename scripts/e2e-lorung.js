'use strict';
/* Sao lưu / khôi phục MỘT lô rừng và khôi phục toàn bộ với lựa chọn ghi đè (Electron thật, dữ liệu giả lập, chạy khi KHÔNG có mạng: proxy trỏ vào cổng chết).
 *  1. Một chủ có hai lô A, B (+ chủ khác có lô C): xuất riêng A, sửa A và B, khôi phục A (mặc định giữ, rồi thay đúng A): B và chủ khác giữ nguyên.
 *  2. Cùng ca qua luồng nhập bản sao lưu toàn bộ cũ với lựa chọn ghi đè.
 *  3. Chuyển A sang hồ sơ Windows mới (cơ sở dữ liệu mới): số bản ghi, tổng tấn, tiền cước (BM-10) và điểm đến (BM-04) giống bản gốc; nhập lại cùng file không đổi gì.
 *  4. Mã lô trùng dưới chủ khác, file sai định dạng/hỏng/bị sửa, bản sao lưu toàn bộ đưa nhầm vào luồng lô: báo lỗi, không ghi.
 *  5. Phiếu cũ sai ngày (31/02/2026) hiện số phiếu và lý do, sửa được ngay.
 * Chạy: xvfb-run -a node scripts/e2e-lorung.js */
const {_electron: electron} = require('playwright-core');
const path = require('path'), fs = require('fs'), os = require('os'), crypto = require('crypto');
const JSZip = require('jszip'), XLSX = require('xlsx');
const root = path.join(__dirname, '..'), L = require(path.join(root, 'src', 'lorung.js'));
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hakqn-lot-')), lotDir = path.join(dir, 'lo'), out = path.join(dir, 'out');
let fail = 0; const ok = (name, cond, extra) => { console.log((cond ? 'ĐẠT  ' : 'LỖI  ') + name + (!cond && extra ? ' — ' + extra : '')); if (!cond) fail++; };
const sha = s => crypto.createHash('sha256').update(s).digest('hex');
const clone = o => JSON.parse(JSON.stringify(o));

const xe = (bien, ma) => ({_row: 2, maRung: ma, stt: '1', chuXe: 'CHỦ XE ' + bien, ngaySinh: '01/01/1980', cccd: '049000000077', ngayCap: '01/01/2021', noiCap: 'CA', diaChi: 'Đà Nẵng', bienSo: bien, loaiXe: 'Xe tải', nguoiKy: 'Chủ xe', sdt: '0905123456'});
const P = (stt, ngay, bien, so, kl) => ({_row: stt + 1, stt: String(stt), ngay, bienSo: bien, soPhieu: so, kl, noiGiao: 'Cảng dăm Kỳ Hà', ghiChu: ''});
const forest = (id, ma, ten, pc) => ({id, info: {hinhThucLuong: 'sanluong', moHinhKy: 'giaokhoan', donGiaTan: {'Tổ trưởng': 420000, 'Công nhân khai thác': 330000, 'Công nhân cưa': 380000}, khoiLuong: 21.75, maRung: ma, tenRung: ten, diaDiem: 'Thôn ' + ma, lat: 15.6, lng: 108.1, dienTich: 2, dinhMucTanHa: 80, cuLy: 45, tuNgay: '01/10/2026', denNgay: '30/11/2026', donGia: 340000, giayTo: [], vanChuyen: {mode: 'coDinh', coDinh: 52000, bac: []},
  muaHang: {congTyId: 'cX', ten: 'CÔNG TY TNHH DĂM AN PHÁT', mst: '0401234567', diaChiId: '', diaChiNhan: 'Địa chỉ công ty', diaChi: 'KCN Điện Nam – Điện Ngọc, Quảng Nam', nguoiDaiDien: '', chucVu: '', sdt: '', xacNhan: '2026-10-01T00:00:00.000Z'}},
  nc: ma === 'R-A' ? NC_A : [], dx: [xe('92C-12345', ma), xe('92C-67890', ma)], pc, exp: {soVC: '07'}});
const owner = (id, ma, ten, cccd, fs_) => ({id, info: {ma, ten, ngaySinh: '06/10/1967', cccd, ngayCap: '15/08/2021', noiCap: 'CA', diaChi: 'Đà Nẵng', danhXung: 'Ông'}, nc: [], dx: [], exp: {}, forests: Object.fromEntries(fs_.map(f => [f.id, f]))});
const nv = (stt, vai, ten, cd, cccd) => ({_row: stt + 1, maRung: 'R-A', vaiTro: vai, stt: String(stt), danhXung: 'Ông', ten, ngaySinh: '01/01/1985', cccd, ngayCap: '01/01/2021', noiCap: 'CA', diaChi: 'Đà Nẵng', chucDanh: cd});
const NC_A = [nv(1, 'Tổ trưởng', 'TRẦN TỔ TRƯỞNG', 'Tổ trưởng', '049085000001'), nv(2, 'Công nhân', 'LÊ CÔNG NHÂN', 'Công nhân khai thác', '049085000002'), nv(3, 'Công nhân', 'PHẠM CƯA', 'Công nhân cưa', '049085000003')];
const SEED = {v: 2, congTy: {}, rs: {
  own1: owner('own1', 'CR-01', 'NGUYỄN VĂN MỘT', '049067005459', [forest('fa', 'R-A', 'Lô A', [P(1, '05/10/2026', '92C-12345', 'PA1', 12.5), P(2, '06/10/2026', '92C-67890', 'PA2', 9.25)]), forest('fb', 'R-B', 'Lô B', [P(1, '07/10/2026', '92C-12345', 'PB1', 8)])]),
  own2: owner('own2', 'CR-02', 'TRẦN THỊ HAI', '049067005460', [forest('fc', 'R-C', 'Lô C (phiếu cũ sai ngày)', [P(1, '31/02/2026', '92C-12345', 'PC-SAI', 5), P(2, '08/10/2026', '92C-12345', 'PC2', 3)])])}};

const launch = async (env, name) => {
  const app = await electron.launch({executablePath: require('electron'), args: [root, '--no-sandbox', '--proxy-server=http://127.0.0.1:9'],
    env: {...process.env, HAKQN_DB: path.join(dir, name + '.sqlite'), HAKQN_USERDATA: path.join(dir, 'ud-' + name), HAKQN_DOWNLOAD_DIR: out, HAKQN_LOT_DIR: lotDir, ELECTRON_DISABLE_SECURITY_WARNINGS: '1', ...env}});
  const w = await app.firstWindow(); w.errs = []; w.on('pageerror', e => w.errs.push(e.message)); w.on('dialog', d => d.accept()); await w.waitForSelector('#side'); return {app, w};
};
const dbOf = w => w.evaluate(() => window.hak.loadSync().db);
async function docText(file) {
  const z = await JSZip.loadAsync(fs.readFileSync(file)); let all = '';
  const docs = file.endsWith('.zip') ? await Promise.all(Object.keys(z.files).filter(n => n.endsWith('.docx')).map(async n => JSZip.loadAsync(await z.file(n).async('nodebuffer')))) : [z];
  for (const d of docs) { const x = await d.file('word/document.xml').async('string'); all += (x.match(/<w:t[^>]*>([^<]*)<\/w:t>/g) || []).map(a => a.replace(/<[^>]+>/g, '')).join('') + '\n'; }
  return all.replace(/&amp;/g, '&');
}
async function exportText(w, kind) {
  for (const f of fs.existsSync(out) ? fs.readdirSync(out) : []) fs.unlinkSync(path.join(out, f));
  await w.click('[data-ftab=xuat]'); await w.click('[data-xtab=all]'); await w.click(`button[data-act=dl][data-kind=${kind}]`);
  for (let i = 0; i < 80; i++) { const f = fs.existsSync(out) && fs.readdirSync(out).find(x => /\.(zip|docx)$/.test(x)); if (f) { await w.waitForTimeout(300); return docText(path.join(out, f)); } await w.waitForTimeout(100); }
  throw new Error('không thấy file xuất ' + kind);
}
const nums = t => (t.match(/\d{1,3}(?:\.\d{3})+(?:,\d+)?|\d+,\d+/g) || []).sort();
const openForest = async (w, oid, fid, ftab = 'finfo') => { await w.click(`[data-open=${oid}]`); await w.click('[data-tab=rung]'); await w.click(`[data-forest=${fid}]`); await w.click(`[data-ftab=${ftab}]`); };
const restoreMenu = async w => { await w.click('#moreMenu summary'); await w.click('#lotRestoreBtn'); await w.waitForSelector('#impBox.on'); };
const lotFiles = () => (fs.existsSync(lotDir) ? fs.readdirSync(lotDir) : []);

(async () => {
  fs.mkdirSync(lotDir, {recursive: true});
  // ===== 1. Xuất riêng lô A =====
  let {app, w} = await launch({}, 'may1');
  const sv = await w.evaluate(db => window.hak.save(db), SEED); ok('ghi dữ liệu thử vào SQLite', sv && sv.ok, JSON.stringify(sv));
  await w.reload(); await w.waitForSelector('#side');
  await openForest(w, 'own1', 'fa', 'xuat');
  const ttvc0 = await exportText(w, 'ttvc'), hdvc0 = await exportText(w, 'hdvc'), gk0 = await exportText(w, 'gk');
  ok('lô A có hợp đồng khoán (tiền công) xuất được và có số tiền', nums(gk0).length > 3 && /TRẦN TỔ TRƯỞNG/.test(gk0), gk0.slice(0, 200));
  await w.click('[data-ftab=finfo]'); await w.click('#lotBackupBtn'); await w.waitForTimeout(600);
  const fileA = lotFiles().find(f => /^HAKQN_LoRung_R-A_\d{4}-\d{2}-\d{2}\.json$/.test(f));
  ok('sao lưu lô: tên file HAKQN_LoRung_<MaLo>_<Ngay>.json', !!fileA, JSON.stringify(lotFiles()));
  const fullA = path.join(lotDir, fileA), txtA = fs.readFileSync(fullA, 'utf8'), pkgA = JSON.parse(txtA);
  ok('file chứa đúng một lô: loại gói, phiên bản định dạng, thời điểm xuất, mã lô, nhận diện chủ', pkgA.loai === 'HAKQN_LO_RUNG' && pkgA.dinhDang === 1 && !!pkgA.xuatLuc && pkgA.maLo === 'R-A' && pkgA.chuRung.info.cccd === '049067005459' && !pkgA.chuRung.forests);
  ok('file không lẫn lô khác, chủ khác, tra cứu hay đăng nhập', !/R-B|R-C|TRẦN THỊ HAI|049067005460|lookup|token|refresh/i.test(txtA));
  ok('file mang theo công ty và địa chỉ giao đã chốt', pkgA.lo.info.muaHang.diaChi === 'KCN Điện Nam – Điện Ngọc, Quảng Nam');
  ok('kiểm tra bản ghi: 2 xe, 2 phiếu cân, 21,75 tấn', pkgA.kiemTra.dx === 2 && pkgA.kiemTra.pc === 2 && pkgA.kiemTra.tongTan === 21.75, JSON.stringify(pkgA.kiemTra));
  ok('mã kiểm tra khớp nội dung', L.parsePackage(txtA, sha).ok);

  // ===== sửa A và B (giả lập làm việc tiếp), rồi khôi phục A =====
  const edited = await dbOf(w); edited.rs.own1.forests.fa.pc.push(P(3, '09/10/2026', '92C-12345', 'PA3-SUA', 99)); edited.rs.own1.forests.fa.info.tenRung = 'LÔ A ĐÃ SỬA'; edited.rs.own1.forests.fb.pc.push(P(2, '10/10/2026', '92C-12345', 'PB2-MOI', 4));
  await w.evaluate(d => window.hak.save(d), edited); const editedDb = await dbOf(w);
  await app.close();
  ({app, w} = await launch({HAKQN_LOT_FILE: fullA}, 'may1'));
  await restoreMenu(w); let box = await w.innerText('#impBody');
  ok('xem trước khôi phục: tên chủ, mã lô, thời điểm sao lưu, trạng thái đối chiếu', /NGUYỄN VĂN MỘT/.test(box) && /R-A/.test(box) && /Thời điểm sao lưu/.test(box) && /đã tồn tại/.test(box), box.slice(0, 400));
  const rowsOf = await w.$$eval('#impBody table tr', trs => trs.map(t => [...t.children].map(c => c.innerText.trim())));
  const rowVals = l => (rowsOf.find(r => r[0] === l) || []).slice(1);
  ok('lô đang có: bảng trước/sau nhân công, xe, phiếu cân, tổng tấn', JSON.stringify(rowVals('Xe')) === '["2","2"]' && JSON.stringify(rowVals('Phiếu cân').map(x => x.replace(/\s*thay đổi/, ''))) === '["3","2"]' && /thay đổi/.test(rowVals('Tổng khối lượng (tấn)')[1] || ''), JSON.stringify(rowsOf));
  ok('xem trước nêu cách tính cước và địa chỉ giao đã chốt', /Cước cố định 52000/.test(box) && /KCN Điện Nam/.test(box), box.slice(0, 600));
  ok('xem trước: lô khác của chủ được ghi là giữ nguyên (R-B)', /giữ nguyên: R-B/.test(box), box);
  ok('mặc định giữ bản hiện có', await w.isChecked('input[name=lotAct][value=giu]'));
  await w.click('[data-act=lotGo]'); await w.waitForTimeout(400);
  ok('giữ bản hiện có: dữ liệu không đổi', JSON.stringify(await dbOf(w)) === JSON.stringify(editedDb));
  await restoreMenu(w); await w.check('input[name=lotAct][value=thay]'); await w.click('[data-act=lotGo]'); await w.waitForTimeout(600);
  let d2 = await dbOf(w);
  ok('thay đúng lô A: A trở lại đúng bản sao lưu', JSON.stringify(d2.rs.own1.forests.fa) === JSON.stringify(pkgA.lo));
  ok('lô B của cùng chủ giữ nguyên (kể cả phần sửa sau sao lưu)', JSON.stringify(d2.rs.own1.forests.fb) === JSON.stringify(editedDb.rs.own1.forests.fb) && d2.rs.own1.forests.fb.pc.length === 2);
  ok('hồ sơ chủ khác giữ nguyên', JSON.stringify(d2.rs.own2) === JSON.stringify(editedDb.rs.own2));
  ok('có bản sao lưu SQLite tự động trước khi ghi', fs.existsSync(path.join(dir, 'backups')) && fs.readdirSync(path.join(dir, 'backups')).some(f => f.startsWith('truoc-khoi-phuc-lo')));

  // ===== 2. Luồng nhập bản sao lưu toàn bộ cũ + ghi đè =====
  await w.evaluate(d => window.hak.save(d), editedDb); await w.reload(); await w.waitForSelector('#side');
  const justA = {v: 2, rs: {own1: Object.assign(clone(SEED.rs.own1), {forests: {fa: SEED.rs.own1.forests.fa}})}, congTy: {}};
  const fileFull = path.join(dir, 'sao_luu_cu_chi_co_A.json'); fs.writeFileSync(fileFull, JSON.stringify(justA));
  await w.setInputFiles('input[data-file=restore]', fileFull); await w.waitForSelector('#impBox.on');
  box = await w.innerText('#impBody');
  ok('xem trước toàn bộ: nêu lô A TRÙNG và lô B được GIỮ', /TRÙNG/.test(box) && /GIỮ/.test(box) && /R-B/.test(box), box.slice(0, 600));
  await w.check('input[name=impStrat][value=overwrite]'); await w.click('[data-act=impGo]'); await w.waitForTimeout(700);
  d2 = await dbOf(w);
  ok('ghi đè từ bản sao lưu chỉ có A: A về bản cũ', JSON.stringify(d2.rs.own1.forests.fa) === JSON.stringify(SEED.rs.own1.forests.fa));
  ok('B không bị xóa và còn bản đã sửa; chủ khác giữ nguyên', JSON.stringify(d2.rs.own1.forests.fb) === JSON.stringify(editedDb.rs.own1.forests.fb) && JSON.stringify(d2.rs.own2) === JSON.stringify(editedDb.rs.own2));
  // bản sao lưu toàn bộ + "Thay toàn bộ" phải nêu rõ phạm vi
  let said = ''; w.removeAllListeners('dialog'); w.on('dialog', async dlg => { said = dlg.message(); await dlg.dismiss(); });
  await w.setInputFiles('input[data-file=restore]', fileFull); await w.waitForSelector('#impBox.on'); await w.check('input[name=impStrat][value=replace]'); await w.click('[data-act=impGo]'); await w.waitForTimeout(300);
  ok('“Thay toàn bộ” hỏi xác nhận nêu rõ phạm vi, hủy thì không đổi gì', /THAY TOÀN BỘ/.test(said) && /MẤT/.test(said) && JSON.stringify((await dbOf(w)).rs.own2) === JSON.stringify(editedDb.rs.own2), said.slice(0, 200));
  w.removeAllListeners('dialog'); w.on('dialog', dlg => dlg.accept()); await w.click('[data-act=impCancel]');
  await app.close();

  // ===== 3. Chuyển A sang hồ sơ Windows mới, khi mất mạng =====
  ({app, w} = await launch({HAKQN_LOT_FILE: fullA}, 'may2'));
  ok('máy mới: chưa có dữ liệu', Object.keys((await dbOf(w)).rs).length === 0);
  await restoreMenu(w); box = await w.innerText('#impBody');
  ok('máy mới: báo chủ chưa có, lô chưa có', /chưa có.*tạo chủ mới/.test(box) && /chưa có trên máy/.test(box), box.slice(0, 500));
  await w.click('[data-act=lotGo]'); await w.waitForTimeout(700);
  let dn = await dbOf(w); const o9 = Object.values(dn.rs)[0], f9 = o9 && Object.values(o9.forests)[0];
  ok('máy mới: tạo chủ và lô, đủ bản ghi', !!f9 && o9.info.cccd === '049067005459' && f9.nc.length === 3 && f9.dx.length === 2 && f9.pc.length === 2);
  ok('máy mới: dữ liệu lô giống hệt bản sao lưu', JSON.stringify(f9) === JSON.stringify(pkgA.lo));
  ok('máy mới: tổng tấn khớp (21,75)', L.sumKl(f9.pc) === 21.75);
  ok('máy mới: không lẫn dữ liệu lô khác', Object.keys(dn.rs).length === 1 && Object.keys(o9.forests).length === 1);
  await openForest(w, Object.keys(dn.rs)[0], Object.keys(o9.forests)[0], 'xuat');
  const ttvc1 = await exportText(w, 'ttvc'), hdvc1 = await exportText(w, 'hdvc'), gk1 = await exportText(w, 'gk');
  ok('máy mới: tiền công (BM-01) giống bản gốc', JSON.stringify(nums(gk1)) === JSON.stringify(nums(gk0)), nums(gk0).join(' ') + ' | ' + nums(gk1).join(' '));
  ok('máy mới: tiền cước BM-10 giống bản gốc', nums(ttvc1).length > 0 && JSON.stringify(nums(ttvc1)) === JSON.stringify(nums(ttvc0)), nums(ttvc0).join(' ') + ' | ' + nums(ttvc1).join(' '));
  ok('máy mới: BM-04 vẫn ghi đúng điểm đến đã chốt dù danh mục công ty trống', hdvc1.includes('KCN Điện Nam – Điện Ngọc, Quảng Nam') && hdvc0.includes('KCN Điện Nam – Điện Ngọc, Quảng Nam'));
  await restoreMenu(w); box = await w.innerText('#impBody');
  ok('nhập lại cùng file: báo lô đã tồn tại, mặc định giữ', /đã tồn tại/.test(box) && (await w.isChecked('input[name=lotAct][value=giu]')));
  const snap = JSON.stringify(await dbOf(w)); await w.click('[data-act=lotGo]'); await w.waitForTimeout(400);
  ok('nhập lại cùng file: không đổi gì, không nhân đôi', JSON.stringify(await dbOf(w)) === snap && Object.keys((await dbOf(w)).rs).length === 1);
  ok('không lỗi script giao diện', w.errs.length === 0, w.errs.join('|'));
  await app.close();

  // ===== 4. Mâu thuẫn và file lỗi (máy 1 còn A, B, C) =====
  const mk = (name, mut) => { const p = clone(pkgA); mut(p); delete p.maKiemTra; const sealed = L.seal(p, sha), f = path.join(dir, name); fs.writeFileSync(f, JSON.stringify(sealed)); return f; };
  const cases = [
    ['mã lô trùng dưới chủ khác', mk('c1.json', p => { p.chuRung = clone(SEED.rs.own2); delete p.chuRung.forests; }), /Dừng/, /TRẦN THỊ HAI|MỘT|chủ/],
    ['chủ mới mà mã lô đã có trên máy', mk('c2.json', p => { p.chuRung = {id: 'ownZ', info: {ma: 'CR-99', ten: 'NGƯỜI LẠ', cccd: '049000000999'}}; }), /Dừng/, /NGƯỜI LẠ/],
    ['file không phải JSON', (() => { const f = path.join(dir, 'c3.json'); fs.writeFileSync(f, '{"loai": "HAKQN_LO_RUNG", "lo": '); return f; })(), /Không khôi phục được/, /JSON/],
    ['file bị sửa (mã kiểm tra sai)', (() => { const f = path.join(dir, 'c4.json'), p = clone(L.seal(clone(pkgA), sha)); p.lo.pc[0].kl = 1234; fs.writeFileSync(f, JSON.stringify(p)); return f; })(), /Không khôi phục được/, /hỏng|sửa/],
    ['sai phiên bản định dạng', mk('c5.json', p => { p.dinhDang = 7; }), /Không khôi phục được/, /mới hơn/],
    ['không xác định được lô (thiếu mã lô)', mk('c6.json', p => { p.lo.info.maRung = ''; }), /Không khôi phục được/, /mã lô/],
    ['bản sao lưu toàn bộ đưa nhầm vào luồng lô', fileFull, /Không khôi phục được/, /TOÀN BỘ/]];
  ({app, w} = await launch({}, 'may1')); const before = JSON.stringify(await dbOf(w)); await app.close();
  for (const [name, file, re1, re2] of cases) {
    ({app, w} = await launch({HAKQN_LOT_FILE: file}, 'may1'));
    await w.click('#moreMenu summary'); await w.click('#lotRestoreBtn'); await w.waitForTimeout(700);
    const shown = (await w.innerText('body'));
    ok('lỗi “' + name + '”: báo rõ và không có nút ghi', re1.test(shown) && re2.test(shown) && !(await w.$('[data-act=lotGo]')), shown.slice(0, 300));
    ok('lỗi “' + name + '”: dữ liệu không đổi', JSON.stringify(await dbOf(w)) === before);
    await app.close();
  }
  // bản sao lưu LÔ đưa nhầm vào luồng khôi phục toàn bộ
  ({app, w} = await launch({}, 'may1')); await w.setInputFiles('input[data-file=restore]', fullA); await w.waitForTimeout(500);
  ok('gói lô đưa nhầm vào “Khôi phục (.json)” bị từ chối và chỉ sang luồng lô', /MỘT lô rừng/.test(await w.innerText('body')) && !(await w.$('#impBox.on')));

  // ===== 5. Phiếu cũ sai ngày: giữ phiếu, nêu số phiếu và lý do, sửa được =====
  await openForest(w, 'own2', 'fc', 'dx'); const pt = await w.innerText('#main');
  ok('phiếu cũ sai ngày: giữ lại, nêu số phiếu và lý do', /PC-SAI/.test(pt) && /không có thật/.test(pt), pt.slice(pt.indexOf('PC-SAI') - 50, pt.indexOf('PC-SAI') + 250));
  await w.fill('[data-pcfix]', '29/02/2026'); await w.click('[data-act=pcFixDate]'); await w.waitForTimeout(300);
  ok('sửa sang 29/02/2026 (không có thật) bị từ chối', /Chưa sửa phiếu PC-SAI/.test(await w.innerText('body')) && (await dbOf(w)).rs.own2.forests.fc.pc[0].ngay === '31/02/2026');
  await w.fill('[data-pcfix]', '29/02/2028'); await w.click('[data-act=pcFixDate]'); await w.waitForTimeout(400);
  ok('sửa sang 29/02/2028 (có thật) được nhận', (await dbOf(w)).rs.own2.forests.fc.pc[0].ngay === '29/02/2028');
  // nhập Excel phiếu cân: 31/02/2026 bị chặn cả file (nêu số phiếu và lý do); 29/02/2028 được nhận
  const mkXlsx = (name, ngay) => { const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['Mã rừng', 'STT', 'Ngày cân', 'Biển kiểm soát', 'Số phiếu cân', 'Khối lượng (tấn)', 'Nơi giao (nhà máy)', 'Ghi chú'], ['R-A', 1, ngay, '92C-123.45', 'PX-NGAY', 6, 'Cảng dăm Kỳ Hà', '']]), 'PHIEU_CAN'); const f = path.join(dir, name); XLSX.writeFile(wb, f); return f; };
  await openForest(w, 'own1', 'fa', 'dx'); const nBefore = (await dbOf(w)).rs.own1.forests.fa.pc.length; let alertMsg = '';
  w.removeAllListeners('dialog'); w.on('dialog', async dlg => { alertMsg = dlg.message(); await dlg.accept(); });
  await w.setInputFiles('input[data-file="pc"]', mkXlsx('pc_sai.xlsx', '31/02/2026')); await w.waitForTimeout(700);
  ok('nhập Excel có ngày 31/02/2026: bị chặn, nêu số phiếu và lý do', /PX-NGAY/.test(alertMsg) && /không có thật/.test(alertMsg) && (await dbOf(w)).rs.own1.forests.fa.pc.length === nBefore, alertMsg.slice(0, 250));
  alertMsg = ''; await w.setInputFiles('input[data-file="pc"]', mkXlsx('pc_dung.xlsx', '29/02/2028')); await w.waitForTimeout(700);
  ok('nhập Excel có ngày 29/02/2028: được nhận', (await dbOf(w)).rs.own1.forests.fa.pc.some(x => x.soPhieu === 'PX-NGAY' && x.ngay === '29/02/2028'), alertMsg.slice(0, 250));
  ok('không lỗi script giao diện', w.errs.length === 0, w.errs.join('|'));
  await app.close();
  console.log(fail ? '\n' + fail + ' LỖI' : '\nĐẠT HẾT'); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
