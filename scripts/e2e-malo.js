'use strict';
/* Mã lô duy nhất, “Giữ cả hai”, mã trùng ở dữ liệu cũ và màn hình “Kiểm tra hồ sơ trước khi xuất” (Electron thật, dữ liệu giả lập, không có mạng).
 *  1. Giữ cả hai: bắt buộc mã mới, mã trùng bị từ chối (cả ở xem trước lẫn lúc ghi), dòng xe/nhân công đổi theo mã mới; sao lưu lô mới → khôi phục đúng lô mới; lô gốc và lô khác giữ nguyên.
 *  2. Dữ liệu cũ có mã lô trùng: liệt kê đủ các lô khớp, dữ liệu giữ nguyên đến khi người dùng đổi mã; đổi mã thì dòng xe/phiếu đổi theo.
 *  3. Thiết lập dùng chung khác máy đích: nêu rõ dùng thiết lập nào và phần hồ sơ nào có thể khác.
 *  4. Kiểm tra hồ sơ trước khi xuất: mục chặn/đối chiếu kèm số phiếu, bấm mở đúng tab.
 * Chạy: xvfb-run -a node scripts/e2e-malo.js */
const {_electron: electron} = require('playwright-core');
const path = require('path'), fs = require('fs'), os = require('os'), crypto = require('crypto');
const root = path.join(__dirname, '..'), L = require(path.join(root, 'src', 'lorung.js'));
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hakqn-malo-')), lotDir = path.join(dir, 'lo');
let fail = 0; const ok = (name, cond, extra) => { console.log((cond ? 'ĐẠT  ' : 'LỖI  ') + name + (!cond && extra ? ' — ' + extra : '')); if (!cond) fail++; };
const sha = s => crypto.createHash('sha256').update(s).digest('hex'), clone = o => JSON.parse(JSON.stringify(o));

const xe = (bien, ma) => ({_row: 2, maRung: ma, stt: '1', chuXe: 'CHỦ XE ' + bien, ngaySinh: '01/01/1980', cccd: '049000000077', ngayCap: '01/01/2021', noiCap: 'CA', diaChi: 'Đà Nẵng', bienSo: bien, loaiXe: 'Xe tải', nguoiKy: 'Chủ xe', sdt: '0905123456'});
const P = (stt, ngay, bien, so, kl, ma, noi = 'KCN Điện Nam, Quảng Nam') => ({_row: stt + 1, maRung: ma, stt: String(stt), ngay, bienSo: bien, soPhieu: so, kl, noiGiao: noi, ghiChu: ''});
const MUA = {congTyId: 'c1', ten: 'CÔNG TY TNHH DĂM AN PHÁT', mst: '', diaChiId: '', diaChiNhan: 'Địa chỉ công ty', diaChi: 'KCN Điện Nam, Quảng Nam', xacNhan: '2026-10-01T00:00:00.000Z'};
const forest = (id, ma, ten, o = {}) => ({id, info: Object.assign({maRung: ma, tenRung: ten, diaDiem: 'Thôn ' + ma, lat: 15.6, lng: 108.1, dienTich: 2, dinhMucTanHa: 80, cuLy: 45, tuNgay: '01/10/2026', denNgay: '30/11/2026', donGia: 340000, giayTo: [], vanChuyen: {mode: 'coDinh', coDinh: 52000, bac: []}, muaHang: MUA}, o.info || {}),
  nc: [], dx: [xe('92C-12345', ma)], pc: o.pc || [P(1, '05/10/2026', '92C-12345', 'P1-' + ma, 10, ma)], exp: {}});
const owner = (id, ma, ten, cccd, fl) => ({id, info: {ma, ten, ngaySinh: '06/10/1967', cccd, ngayCap: '15/08/2021', noiCap: 'CA', diaChi: 'Đà Nẵng', danhXung: 'Ông'}, nc: [], dx: [], exp: {}, forests: Object.fromEntries(fl.map(f => [f.id, f]))});
const COMPANY = {c1: {id: 'c1', ten: 'CÔNG TY TNHH DĂM AN PHÁT', mst: '', diaChi: 'KCN Điện Nam, Quảng Nam', nguoiDaiDien: '', chucVu: '', sdt: '', email: '', diaChiGiao: [], ghiChu: ''}};
const SEED = {v: 2, congTy: COMPANY, dinhMuc: {'Tổ trưởng': {qa: '1 bộ (gốc)'}}, bienAlias: {'92c12345': '92C-12345'}, rs: {
  o1: owner('o1', 'CR-1', 'CHỦ MỘT', '049067005459', [forest('fa', 'R-A', 'Lô A'), forest('fb', 'R-B', 'Lô B')]),
  o2: owner('o2', 'CR-2', 'CHỦ HAI', '049067005460', [forest('fc', 'R-C', 'Lô C')])}};

const launch = async (env, name) => {
  const app = await electron.launch({executablePath: require('electron'), args: [root, '--no-sandbox', '--proxy-server=http://127.0.0.1:9'],
    env: {...process.env, HAKQN_DB: path.join(dir, name + '.sqlite'), HAKQN_USERDATA: path.join(dir, 'ud-' + name), HAKQN_LOT_DIR: lotDir, ELECTRON_DISABLE_SECURITY_WARNINGS: '1', ...env}});
  const w = await app.firstWindow(); w.errs = []; w.on('pageerror', e => w.errs.push(e.message)); w.on('dialog', d => d.accept()); await w.waitForSelector('#side'); return {app, w};
};
const dbOf = w => w.evaluate(() => window.hak.loadSync().db);
const save = (w, d) => w.evaluate(x => window.hak.save(x), d);
const openForest = async (w, oid, fid, ftab = 'finfo') => { await w.click(`[data-open=${oid}]`); await w.click('[data-tab=rung]'); await w.click(`[data-forest=${fid}]`); await w.click(`[data-ftab=${ftab}]`); };
const byMa = (db, ma) => { for (const o of Object.values(db.rs)) for (const f of Object.values(o.forests)) if (f.info.maRung === ma) return f; return null; };

(async () => {
  fs.mkdirSync(lotDir, {recursive: true});
  // ===== 1. Giữ cả hai =====
  let {app, w} = await launch({}, 'may1'); await save(w, SEED); await w.reload(); await w.waitForSelector('#side');
  const fileFull = path.join(dir, 'sao_luu_cu.json'); fs.writeFileSync(fileFull, JSON.stringify({v: 2, rs: {o1: owner('o1', 'CR-1', 'CHỦ MỘT', '049067005459', [forest('fa', 'R-A', 'Lô A (file)')])}, congTy: COMPANY}));
  await w.setInputFiles('input[data-file=restore]', fileFull); await w.waitForSelector('#impBox.on');
  await w.check('input[name=impStrat][value=both]');
  ok('giữ cả hai: hiện ô nhập mã mới cho lô trùng, có gợi ý mã chưa tồn tại', (await w.inputValue('#impMa [data-mamoi=fa]')) === 'R-A-2');
  await w.fill('#impMa [data-mamoi=fa]', ' r-b '); await w.waitForTimeout(700);
  ok('mã mới trùng lô khác trên máy: bị báo ngay ở xem trước (không phân biệt hoa thường)', /đã có ở/.test(await w.innerText('#impMa')), await w.innerText('#impMa'));
  const before = JSON.stringify(await dbOf(w));
  await w.click('[data-act=impGo]'); await w.waitForTimeout(500);
  ok('bấm thực hiện với mã trùng: không ghi, nêu lý do', JSON.stringify(await dbOf(w)) === before && /Chưa ghi/.test(await w.innerText('body')));
  await w.fill('#impMa [data-mamoi=fa]', 'R-A'); await w.waitForTimeout(700);
  ok('mã mới trùng mã cũ của chính lô: bị từ chối', /khác mã cũ/.test(await w.innerText('#impMa')));
  await w.fill('#impMa [data-mamoi=fa]', 'R-A-BAN-SAO'); await w.waitForTimeout(700);
  ok('mã hợp lệ: báo hợp lệ', /hợp lệ/.test(await w.innerText('#impMa')) && !/đã có ở/.test(await w.innerText('#impMa')));
  await w.click('[data-act=impGo]'); await w.waitForTimeout(900);
  let db = await dbOf(w); const clone2 = byMa(db, 'R-A-BAN-SAO');
  ok('lô nhân bản có ID mới và mã mới đã xác nhận; mã gốc R-A vẫn chỉ một lô', !!clone2 && clone2.id !== 'fa' && L.duplicateGroups(db).length === 0 && Object.values(db.rs.o1.forests).filter(f => f.info.maRung === 'R-A').length === 1);
  ok('dòng xe của lô nhân bản đổi theo mã mới, phiếu vẫn thuộc đúng lô', clone2.dx.every(r => r.maRung === 'R-A-BAN-SAO') && clone2.pc.length === 1 && clone2.pc[0].soPhieu === 'P1-R-A');
  ok('lô gốc A và lô B giữ nguyên', JSON.stringify(db.rs.o1.forests.fa) === JSON.stringify(SEED.rs.o1.forests.fa) && JSON.stringify(db.rs.o1.forests.fb) === JSON.stringify(SEED.rs.o1.forests.fb) && JSON.stringify(db.rs.o2) === JSON.stringify(SEED.rs.o2));
  // sao lưu lô mới → sửa → khôi phục đúng lô mới
  await openForest(w, 'o1', clone2.id); await w.click('#lotBackupBtn'); await w.waitForTimeout(600);
  const fileNew = fs.readdirSync(lotDir).find(f => /R-A-BAN-SAO/.test(f)); ok('sao lưu lô mới: file theo mã mới', !!fileNew, JSON.stringify(fs.readdirSync(lotDir)));
  const ed = await dbOf(w); ed.rs.o1.forests[clone2.id].pc.push(P(2, '09/10/2026', '92C-12345', 'SUA', 77, 'R-A-BAN-SAO')); await save(w, ed); const edited = clone(await dbOf(w));
  await app.close();
  ({app, w} = await launch({HAKQN_LOT_FILE: path.join(lotDir, fileNew)}, 'may1'));
  await w.click('#moreMenu summary'); await w.click('#lotRestoreBtn'); await w.waitForSelector('#impBox.on');
  let box = await w.innerText('#impBody');
  ok('khôi phục lô mới: xác định đúng lô đích (không mâu thuẫn ID/mã)', !/Dừng/.test(box) && /đã tồn tại/.test(box) && /R-A-BAN-SAO/.test(box), box.slice(0, 300));
  await w.check('input[name=lotAct][value=thay]'); await w.click('[data-act=lotGo]'); await w.waitForTimeout(700);
  db = await dbOf(w);
  ok('khôi phục đúng lô mới về bản sao lưu', db.rs.o1.forests[clone2.id].pc.length === 1);
  ok('lô gốc và các lô khác giữ nguyên sau khi khôi phục', JSON.stringify(db.rs.o1.forests.fa) === JSON.stringify(edited.rs.o1.forests.fa) && JSON.stringify(db.rs.o1.forests.fb) === JSON.stringify(edited.rs.o1.forests.fb) && JSON.stringify(db.rs.o2) === JSON.stringify(edited.rs.o2));
  await app.close();

  // ===== 3. Thiết lập dùng chung khác máy đích =====
  const pkgX = L.exportLot(Object.assign(clone(SEED), {}), 'o1', 'fa'); pkgX.lo.nc = [{_row: 2, maRung: 'R-A', ten: 'TỔ TRƯỞNG', chucDanh: 'Tổ trưởng'}]; pkgX.dungChung = {dinhMuc: {'Tổ trưởng': {qa: '1 bộ (gói)'}}, bienAlias: {'92c12345': '92C-99999'}}; pkgX.kiemTra.nc = 1;
  const fileX = path.join(dir, 'x.json'); fs.writeFileSync(fileX, JSON.stringify(L.seal(pkgX, sha)));
  ({app, w} = await launch({HAKQN_LOT_FILE: fileX}, 'may2')); await save(w, Object.assign(clone(SEED), {rs: {}, dinhMuc: {'Tổ trưởng': {qa: '2 bộ (máy đích)'}}, bienAlias: {'92c12345': '92C-12345'}}));
  await w.reload(); await w.waitForSelector('#side'); await w.click('#moreMenu summary'); await w.click('#lotRestoreBtn'); await w.waitForSelector('#impBox.on'); box = await w.innerText('#impBody');
  ok('thiết lập khác: nêu máy đích dùng bản của mình, giá trị hai bên và phần hồ sơ có thể khác', /giữ nguyên thiết lập của mình/.test(box) && /2 bộ \(máy đích\)/.test(box) && /1 bộ \(gói\)/.test(box) && /Bảng cấp phát BHLĐ/.test(box) && /Ghép biển số/.test(box), box.slice(0, 900));
  await w.click('[data-act=lotGo]'); await w.waitForTimeout(600); db = await dbOf(w);
  ok('sau khôi phục: thiết lập dùng chung của máy đích giữ nguyên', db.dinhMuc['Tổ trưởng'].qa === '2 bộ (máy đích)' && db.bienAlias['92c12345'] === '92C-12345');
  await app.close();

  // ===== 2. Dữ liệu cũ có mã lô trùng =====
  const DUP = clone(SEED); DUP.rs.o2.forests.fd = forest('fd', 'r-a', 'Lô D (trùng A)'); DUP.rs.o1.forests.fe = forest('fe', ' R-A', 'Lô E (trùng A)');
  ({app, w} = await launch({}, 'may3')); await save(w, DUP); await w.reload(); await w.waitForSelector('#side');
  await openForest(w, 'o1', 'fa', 'kt'); let kt = await w.innerText('#main');
  ok('mã trùng cũ: kiểm tra hồ sơ liệt kê ĐỦ ba lô khớp (cả chủ khác)', /Mã lô trùng/.test(kt) && /đang dùng cho 3 lô/.test(kt) && /Lô A/.test(kt) && /Lô D/.test(kt) && /Lô E/.test(kt) && /CHỦ HAI/.test(kt), kt.slice(0, 700));
  ok('dữ liệu giữ nguyên đến khi người dùng đổi mã', JSON.stringify((await dbOf(w)).rs) === JSON.stringify(DUP.rs));
  await w.click('#lotBackupBtn').catch(() => {}); // (nút ở đầu hồ sơ; không bắt buộc ở đây)
  await w.click('[data-ftab=finfo]'); await w.fill('#forestForm [name=maRung]', 'R-A-MOI'); await w.click('#forestForm button[type=submit]'); await w.waitForTimeout(500);
  db = await dbOf(w); const fa2 = db.rs.o1.forests.fa;
  ok('đổi mã lô A: thông báo đổi theo dòng xe, dữ liệu xe và phiếu vẫn thuộc lô A', fa2.info.maRung === 'R-A-MOI' && fa2.dx.every(r => r.maRung === 'R-A-MOI') && fa2.pc.length === 1 && /đổi theo 0 dòng nhân công, 1 xe/.test(await w.innerText('body')));
  ok('sau đổi mã, lô A không còn bị báo trùng (còn D và E trùng nhau)', L.duplicateGroups(db).length === 1 && L.duplicateGroups(db)[0].lots.length === 2);
  await w.fill('#forestForm [name=maRung]', 'R-B'); await w.click('#forestForm button[type=submit]'); await w.waitForTimeout(300);
  ok('đổi sang mã đã có ở lô khác: bị từ chối, nêu lô đang dùng', /đã có ở/.test(await w.innerText('#forestForm')) && (await dbOf(w)).rs.o1.forests.fa.info.maRung === 'R-A-MOI');
  await app.close();

  // ===== 4. Kiểm tra hồ sơ trước khi xuất =====
  const CHK = clone(SEED);
  CHK.rs.o1.forests.fa.pc = [P(1, '31/02/2026', '92C-12345', 'PX-SAI', 5, 'R-A'), P(2, '29/02/2028', '92C-12345', 'PX-NHUAN', 3, 'R-A'), P(3, '07/10/2026', '92C-12345', 'PX-TRUNG', 4, 'R-A'), P(4, '08/10/2026', '92C-12345', 'PX-TRUNG', 2, 'R-A'),
    P(5, '09/10/2026', '11A-00001', 'PX-BIEN', 1, 'R-A'), P(6, '10/10/2026', '92C-12345', 'PX-NOIGIAO', 6, 'R-A', 'Nhà máy ở Huế')];
  CHK.rs.o1.forests.fb.info.vanChuyen = {mode: 'tanDoan', donGiaKm: 1000, coDinh: 52000, bac: [{den: 50, gia: 40000}]}; delete CHK.rs.o1.forests.fb.info.muaHang;
  CHK.rs.o2.forests.fc.info.vanChuyen = {mode: 'tanKm', donGiaKm: 1000, coDinh: null, bac: []}; CHK.congTy.c1.diaChi = 'ĐỊA CHỈ MỚI TRONG HỒ SƠ CÔNG TY';
  ({app, w} = await launch({}, 'may4')); await save(w, CHK); await w.reload(); await w.waitForSelector('#side');
  await openForest(w, 'o1', 'fa', 'kt'); kt = await w.innerText('#main');
  ok('kiểm tra: phiếu 31/02/2026 chặn xuất, nêu số phiếu và lý do', /Phiếu PX-SAI/.test(kt) && /không có thật/.test(kt), kt.slice(0, 600));
  ok('kiểm tra: ngày nhuận 29/02/2028 không bị báo lỗi ngày', !/Phiếu PX-NHUAN|Dòng 3: .*PX-NHUAN/.test(kt) && !/29\/02\/2028.*không có thật/.test(kt), kt.slice(kt.indexOf('NHUAN') - 200, kt.indexOf('NHUAN') + 200));
  ok('kiểm tra: phiếu trùng số và biển số chưa ghép được nêu kèm số phiếu', /Phiếu cân trùng số/.test(kt) && /PX-TRUNG/.test(kt) && /biển số chưa ghép/.test(kt) && /PX-BIEN/.test(kt));
  ok('kiểm tra: nơi giao khác địa chỉ chốt được báo để đối chiếu, giữ nguyên nội dung phiếu', /Nơi giao trên phiếu khác địa chỉ giao đã chốt/.test(kt) && /Nhà máy ở Huế/.test(kt) && /PX-NOIGIAO/.test(kt));
  ok('kiểm tra: danh mục công ty đổi thì nêu địa chỉ cũ và mới', /Hồ sơ rừng vẫn giữ “KCN Điện Nam, Quảng Nam”/.test(kt) && /ĐỊA CHỈ MỚI TRONG HỒ SƠ CÔNG TY/.test(kt));
  await w.click('[data-act=ktGo] >> nth=0'); await w.waitForTimeout(300);
  ok('bấm “Mở để sửa”: mở đúng tab (Thông tin chủ/rừng hoặc Vận chuyển)', /Mã rừng|Thông tin chủ rừng|Phiếu cân/.test(await w.innerText('#main')));
  await openForest(w, 'o1', 'fb', 'kt'); kt = await w.innerText('#main');
  ok('hồ sơ cũ cước theo bậc cự ly: mục chặn nêu phải chọn lại, dữ liệu bậc giữ', /Cước theo bậc cự ly \(hồ sơ cũ\)/.test(kt) && /chọn lại/.test(kt) && (await dbOf(w)).rs.o1.forests.fb.info.vanChuyen.bac.length === 1);
  ok('lô chưa chọn địa chỉ giao: mục đối chiếu nêu thiếu địa chỉ', /Chưa chọn địa chỉ giao hàng đã chốt|nhập tay/.test(kt));
  await w.click('[data-ftab=dx]'); ok('mở tab Vận chuyển để sửa cước', await w.isVisible('#vcForm'));
  await openForest(w, 'o2', 'fc', 'kt'); kt = await w.innerText('#main');
  ok('cước tấn/km khi địa chỉ công ty đổi: nhắc kiểm tra lại cự ly (không tự sửa)', /Cự ly vận chuyển/.test(kt) && /không tự sửa cự ly/.test(kt));
  await w.click('[data-ftab=xuat]'); ok('tab Xuất hồ sơ có nhắc và liên kết sang màn hình kiểm tra', /Kiểm tra hồ sơ trước khi xuất/.test(await w.innerText('#main')));
  ok('không lỗi script giao diện', w.errs.length === 0, w.errs.join('|'));
  await app.close();
  console.log(fail ? '\n' + fail + ' LỖI' : '\nĐẠT HẾT'); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
