'use strict';
/* Luồng "In hồ sơ đợt 2" (Electron thật, dữ liệu giả lập): BM-08, BM-09, BM-10, BM-14 với hai cách in.
 *  A. đủ dữ liệu, chưa in nền → in đầy đủ một lần trên giấy trắng
 *  B. in mẫu nền → xác nhận → (đóng, mở lại) → thêm dữ liệu → in đè; BM-09/BM-10 nhiều người vận chuyển theo từng nhóm
 *  + nền in một phần, đổi bố cục, thiếu dữ liệu, bỏ xác nhận, nền in từ trước, tách theo lô, không có “BẢN NHÁP”
 * Chạy: xvfb-run -a node scripts/e2e-inan2.js */
const {_electron: electron} = require('playwright-core');
const path = require('path'), fs = require('fs'), os = require('os');
const JSZip = require('jszip');
const root = path.join(__dirname, '..');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hakqn-inan2-')), out = path.join(dir, 'out'), dbFile = path.join(dir, 'i.sqlite');
let fail = 0; const ok = (name, cond, extra) => { console.log((cond ? 'ĐẠT  ' : 'LỖI  ') + name + (!cond && extra ? ' — ' + extra : '')); if (!cond) fail++; };
const nv = (stt, vai, ten, cd, cccd) => ({_row: stt + 1, maRung: 'R-A', vaiTro: vai, stt: String(stt), danhXung: 'Ông', ten, ngaySinh: '01/01/1985', cccd, ngayCap: '01/01/2021', noiCap: 'CA', diaChi: 'Đà Nẵng', chucDanh: cd});
const xe = (bien, cccd, ten) => ({_row: 2, maRung: 'R-A', stt: '1', chuXe: ten || 'LÊ VĂN XE', ngaySinh: '01/01/1980', cccd, ngayCap: '01/01/2021', noiCap: 'CA', diaChi: 'Đà Nẵng', bienSo: bien, loaiXe: 'Xe tải', nguoiKy: 'Chủ xe', sdt: '0905123456'});
const P = (stt, ngay, bien, so, kl) => ({_row: stt + 1, maRung: 'R-A', stt: String(stt), ngay, bienSo: bien, soPhieu: so, kl, noiGiao: 'KCN Điện Nam, Quảng Nam', ghiChu: ''});
const NC3 = [nv(1, 'Tổ trưởng', 'TRẦN TỔ TRƯỞNG', 'Tổ trưởng', '049085000001'), nv(2, 'Công nhân', 'LÊ CÔNG NHÂN', 'Công nhân khai thác', '049085000002'), nv(3, 'Công nhân', 'PHẠM CƯA', 'Công nhân cưa', '049085000003')];
const lot = (id, ma, o) => ({id, info: {hinhThucLuong: 'sanluong', moHinhKy: 'giaokhoan', donGiaTan: {'Tổ trưởng': 420000, 'Công nhân khai thác': 330000, 'Công nhân cưa': 380000}, khoiLuong: o.kl || null, maRung: ma, tenRung: 'Lô ' + ma, diaDiem: 'Thôn A', lat: 15.6, lng: 108.1, dienTich: 2, dinhMucTanHa: 80, cuLy: 45, tuNgay: '01/10/2026', denNgay: '30/11/2026', donGia: 340000, giayTo: [], vanChuyen: {mode: 'coDinh', coDinh: 52000, bac: []},
  muaHang: o.noDest ? {congTyId: 'c1', ten: 'CÔNG TY TNHH DĂM AN PHÁT', mst: '', diaChiId: '', diaChiNhan: '', diaChi: '', xacNhan: ''} : {congTyId: 'c1', ten: 'CÔNG TY TNHH DĂM AN PHÁT', mst: '', diaChiId: '', diaChiNhan: '', diaChi: o.diaChi || 'KCN Điện Nam, Quảng Nam', xacNhan: '2026-10-01T00:00:00.000Z'}},
  nc: o.nc || NC3, dx: o.dx || [xe('92C-12345', '049000000077'), xe('92C-67890', '049000000078')], pc: o.pc || [], exp: o.exp || {}, inDot2: o.inDot2});
const seed = (lots, own) => ({v: 2, rs: {own1: Object.assign({id: 'own1', info: {ma: 'CR-01', ten: 'NGUYỄN VĂN MỘT', cccd: '049067005459', ngayCap: '15/08/2021', noiCap: 'CA', diaChi: 'Đà Nẵng', danhXung: 'Ông', soHopDong: 'HD-2026/015', ngayKyHopDong: '02/10/2026'}, nc: [], dx: [], exp: {}, forests: Object.fromEntries(lots.map(l => [l.id, l]))}, own || {})}});
const PC = [P(1, '05/10/2026', '92C-12345', 'PA1', 12.5), P(2, '06/10/2026', '92C-67890', 'PA2', 9.25), P(3, '07/10/2026', '92C-12345', 'PA3', 8)];
const EXP0 = {soKT: '015', ngayKy: '02/10/2026', soVC: '07', ntSo: '03', pcSo: '09'};
const EXP1 = Object.assign({}, EXP0, {ntNgay: '20/12/2026', pcNgay: '20/12/2026', ntDaTT: '50000000'});
const plain = xml => (xml.match(/<w:t[^>]*>([^<]*)<\/w:t>/g) || []).map(a => a.replace(/<[^>]+>/g, '')).join('');
async function readZip(file) { const z = await JSZip.loadAsync(fs.readFileSync(file)); const o = {}; for (const n of Object.keys(z.files).filter(n => n.endsWith('.docx'))) { const d = await JSZip.loadAsync(await z.file(n).async('nodebuffer')); o[n] = {xml: await d.file('word/document.xml').async('string'), foot: await d.file('word/footer1.xml').async('string')}; } return o; }
const app0 = () => electron.launch({executablePath: require('electron'), args: [root, '--no-sandbox'], env: {...process.env, HAKQN_CLOSE: 'discard', HAKQN_DB: dbFile, HAKQN_USERDATA: path.join(dir, 'ud'), HAKQN_DOWNLOAD_DIR: out, ELECTRON_DISABLE_SECURITY_WARNINGS: '1'}});
(async () => {
  let app = await app0(), w = await app.firstWindow(); const errs = [];
  const hook = () => { w.on('pageerror', e => errs.push(e.message)); w.on('dialog', d => { dialogs.push(d.message()); d.accept(); }); };
  const dialogs = []; hook(); await w.waitForSelector('#side');
  const open = async (fid = 'fa') => { await w.reload(); await w.waitForSelector('#side'); await w.click('[data-open=own1]'); await w.click('[data-tab=rung]'); await w.click('[data-forest=' + fid + ']'); await w.click('[data-ftab=xuat]'); await w.click('[data-xtab=all]'); await w.waitForSelector('#d2Table'); };
  const setDb = async d => { await w.waitForTimeout(700); return w.evaluate(x => window.hak.save(x), d); };   // đợi lần tự lưu của trang xong để không ghi đè dữ liệu thử
  const adv = async () => w.evaluate(() => Object.fromEntries([...document.querySelectorAll('#d2Table tr[data-d2]')].map(r => [r.dataset.d2, r.dataset.adv])));
  const menus = () => w.evaluate(() => document.querySelectorAll('details.d2more').forEach(d => { d.open = true; }));   // menu “Khác” chứa các nút ít dùng
  const rc = async sel => { await menus(); await w.$eval(sel, b => b.click()); };   // nút trong menu nằm xa trong trang cuộn: bấm trực tiếp
  const clean = () => { for (const f of fs.existsSync(out) ? fs.readdirSync(out) : []) fs.unlinkSync(path.join(out, f)); };
  const grab = async sel => { clean(); await menus(); await w.click(sel); let f = null; for (let i = 0; i < 100 && !f; i++) { f = fs.existsSync(out) && fs.readdirSync(out).find(x => /\.(zip|docx)$/.test(x) && !x.endsWith('.part')); if (!f) await w.waitForTimeout(150); } await w.waitForTimeout(200); f = fs.readdirSync(out).find(x => /\.(zip|docx)$/.test(x)); const full = path.join(out, f); const docs = /\.zip$/.test(f) ? await readZip(full) : null; return {name: f, docs}; };
  const noDraft = r => !/BAN_NHAP/.test(r.name) && (!r.docs || Object.keys(r.docs).every(n => !/BAN_NHAP/.test(n) && !/BẢN NHÁP/.test(plain(r.docs[n].xml)) && !/BẢN NHÁP/.test(plain(r.docs[n].foot))));
  const K77 = '09:049000000077', K78 = '09:049000000078', J77 = '10:049000000077', J78 = '10:049000000078';
  const btnOn = async sel => { const b = await w.$(sel); return !!b && !(await b.isDisabled()); };

  // ===== 1. Cả hai cách chưa dùng được vì thiếu dữ liệu =====
  await setDb(seed([lot('fa', 'R-A', {exp: {}, noDest: true, nc: []})]));
  await open();
  let a = await adv();
  ok('chưa có nhân công, chưa chọn địa chỉ giao: không mục nào đủ để in nền; nêu rõ còn thiếu và nút mở đúng tab', Object.values(a).every(v => v === 'thieu') && !!(await w.$('#d2Table [data-act=ktGo]')) && /nhân công|chưa chọn địa chỉ giao/.test(await w.innerText('#d2Table')), JSON.stringify(a));
  ok('các nút tải bị khóa khi chưa đủ dữ liệu', !(await btnOn('#d2Card .docrow [data-act=d2dl][data-mode=nen]')) && !(await btnOn('#d2Card .docrow [data-act=d2dl][data-mode=trang]')) && !(await btnOn('#d2Card .docrow [data-act=d2dl][data-mode=de]')));

  // ===== 2. Chưa có phiếu cân, chưa nhập ngày lập: đủ để in NỀN; chưa đủ để in đầy đủ =====
  await setDb(seed([lot('fa', 'R-A', {exp: EXP0})]));
  await open(); a = await adv();
  ok('đủ dữ liệu dựng nền cho cả bốn mẫu (BM-09 và BM-10 theo từng người vận chuyển), chưa đủ để in đầy đủ', a['08'] === 'nen' && a['14'] === 'nen' && a[K77] === 'nen' && a[K78] === 'nen' && a[J77] === 'nen' && a[J78] === 'nen', JSON.stringify(a));
  ok('nút chính là “In mẫu nền đợt 2”; in đầy đủ giấy trắng chưa dùng được', (await btnOn('#d2Card .docrow [data-act=d2dl][data-mode=nen]')) && !(await btnOn('#d2Card .docrow [data-act=d2dl][data-mode=trang]')) && !(await btnOn('#d2Card .docrow [data-act=d2dl][data-mode=de]')));
  const N1 = await grab('#d2Card .docrow [data-act=d2dl][data-mode=nen]'); 
  ok('gói nền: tên ZIP nêu rõ là MẪU NỀN, đủ bốn biểu mẫu và từng nhóm xe, không có “BẢN NHÁP” (tên file, nội dung, chân trang)', /MAU_NEN_in_truoc\.zip$/.test(N1.name) && noDraft(N1) && Object.keys(N1.docs).length === 6, N1.name + ' ' + JSON.stringify(Object.keys(N1.docs)));
  await open(); a = await adv();
  ok('chỉ tải file nền: trạng thái KHÔNG đổi (chưa xác nhận đã in)', Object.values(a).every(v => v === 'nen') && !/Đã in \d/.test(await w.innerText('#d2Table')));
  const nBefore = await grab('[data-act=d2dl][data-mode=nen][data-keys="08"]');
  ok('tải riêng một mẫu nền: file Word đơn, tên có _MAU_NEN, không BẢN NHÁP', /^08_.*_MAU_NEN\.docx$/.test(nBefore.name) && !/BAN_NHAP/.test(nBefore.name));

  // ===== 3. Xác nhận đã in nền → đóng ứng dụng, mở lại, thêm đủ dữ liệu → đề nghị in đè cho cả bốn =====
  await w.click('#d2Card button[data-act=d2confirm][data-keys*="|"]');
  await w.waitForFunction(() => document.querySelectorAll('#d2Table tr[data-adv=cho]').length === 6);
  a = await adv(); ok('xác nhận cả bộ: sáu mục (BM-08, BM-14, BM-09/BM-10 mỗi nhóm) “đã in nền, chờ dữ liệu”', Object.values(a).every(v => v === 'cho'), JSON.stringify(a));
  await w.waitForTimeout(600);
  await app.close(); app = await app0(); w = await app.firstWindow(); hook(); await w.waitForSelector('#side');
  await open(); a = await adv();
  ok('đóng rồi mở lại ứng dụng: vẫn nhớ đã in nền cho cả sáu mục', Object.values(a).every(v => v === 'cho'), JSON.stringify(a));
  // thêm số liệu: phiếu cân, ngày lập biên bản, khối lượng thực tế… (chỉ lấp ô trống, không đổi bố cục)
  const L2 = JSON.parse(JSON.stringify(seed([lot('fa', 'R-A', {exp: EXP1, pc: PC, kl: 29.75})])));
  const cur = await w.evaluate(() => window.hak.loadSync().db);
  const st = cur && cur.rs && cur.rs.own1 && cur.rs.own1.forests.fa.inDot2; L2.rs.own1.forests.fa.inDot2 = st;
  ok('trạng thái đã in nền được lưu trong cơ sở dữ liệu của lô', !!st && Object.keys(st.items).length === 6, JSON.stringify(st).slice(0, 200));
  await setDb(L2); await open(); a = await adv();
  ok('sau khi bổ sung số liệu: cả bốn mẫu (mọi nhóm xe) đề nghị IN ĐÈ, chữ ký bố cục vẫn khớp', Object.values(a).every(v => v === 'de'), JSON.stringify(a));
  ok('nút chính là “In đè phần bổ sung”', await btnOn('#d2Card .docrow [data-act=d2dl][data-mode=de]'));
  const D1 = await grab('#d2Card .docrow [data-act=d2dl][data-mode=de]');
  ok('gói in đè: tên ZIP nêu rõ, đủ sáu file, không BẢN NHÁP; BM-09 có trang Bảng kê đính kèm in đầy đủ', /IN_DE_phan_bo_sung\.zip$/.test(D1.name) && Object.keys(D1.docs).length === 6 && noDraft(D1) && Object.entries(D1.docs).filter(([n]) => /^09_/.test(n)).every(([, x]) => /BẢNG KÊ KHỐI LƯỢNG ĐÍNH KÈM/.test(plain(x.xml))), D1.name);
  await open(); a = await adv(); ok('tải gói in đè không làm đổi trạng thái', Object.values(a).every(v => v === 'de'));

  // ===== 4. Bỏ xác nhận (tờ nền hỏng/mất) → in đầy đủ trên giấy trắng cho riêng mẫu đó =====
  await rc('#d2Table tr[data-d2="14"] [data-act=d2undo]'); await w.waitForFunction(() => document.querySelector('#d2Table tr[data-d2="14"]').dataset.adv === 'trang');
  a = await adv(); ok('bỏ xác nhận BM-14: quay về “in đầy đủ giấy trắng”, các mẫu khác vẫn in đè', a['14'] === 'trang' && a['08'] === 'de' && a[K77] === 'de', JSON.stringify(a));
  const T1 = await grab('[data-act=d2dl][data-mode=trang][data-keys="14"]');
  ok('tải riêng BM-14 giấy trắng: đủ nội dung, không BẢN NHÁP', /^14_/.test(T1.name) && !/BAN_NHAP/.test(T1.name));
  await rc('#d2Table tr[data-d2="14"] [data-act=d2confirm]'); await w.waitForFunction(() => document.querySelector('#d2Table tr[data-d2="14"]').dataset.adv === 'de');

  // ===== 5. Đổi bố cục sau khi in nền: thêm một người lao động và đổi địa chỉ giao =====
  await w.waitForTimeout(700); const cur2 = await w.evaluate(() => window.hak.loadSync().db); const L3 = JSON.parse(JSON.stringify(cur2));
  L3.rs.own1.forests.fa.nc.push(nv(4, 'Công nhân', 'NGÔ THÊM MỚI', 'Công nhân cưa', '049085000004'));
  await setDb(L3); await open(); a = await adv();
  ok('thêm một người lao động: BM-08 báo ĐỔI BỐ CỤC (không cho in đè), các mẫu vận chuyển/BM-14 vẫn in đè được', a['08'] === 'doibocuc' && a[K77] === 'de' && a['14'] !== 'doibocuc' || a['08'] === 'doibocuc', JSON.stringify(a));
  ok('cảnh báo nêu rõ phải in lại nền hoặc in giấy trắng', /Bố cục mẫu đã khác lúc in nền/.test(await w.innerText('#d2Table')) && !!(await w.$('#d2Dirty')));
  ok('gói in đè KHÔNG chứa mục đã đổi bố cục', await (async () => { const r = await grab('#d2Card .docrow [data-act=d2dl][data-mode=de]'); return !Object.keys(r.docs).some(n => /^08_/.test(n)); })());
  ok('mục đổi bố cục có thể in đầy đủ trên giấy trắng', await btnOn('#d2Table tr[data-d2="08"] [data-act=d2dl][data-mode=trang]'));
  const L4 = JSON.parse(JSON.stringify(cur2)); L4.rs.own1.forests.fa.info.muaHang.diaChi = 'Khu công nghiệp Điện Nam – Điện Ngọc, thị xã Điện Bàn, tỉnh Quảng Nam (kho số 3, đường số 7 nối dài)';
  await setDb(L4); await open(); a = await adv();
  ok('đổi địa chỉ giao (chữ cố định/độ dài dòng): BM-09 và BM-10 báo đổi bố cục', a[K77] === 'doibocuc' && a[K78] === 'doibocuc' && a[J77] === 'doibocuc', JSON.stringify(a));
  // thêm số vào ô trống không làm mất xác nhận
  const L5 = JSON.parse(JSON.stringify(cur2)); L5.rs.own1.forests.fa.exp.pcSo = '10'; L5.rs.own1.forests.fa.exp.ntNgay = '21/12/2026'; L5.rs.own1.forests.fa.exp.pcNgay = '21/12/2026';
  await setDb(L5); await open(); a = await adv();
  ok('đổi số biên bản/ngày lập (ô trống dành sẵn): xác nhận đã in nền được giữ nguyên', Object.values(a).every(v => v === 'de'), JSON.stringify(a));

  // ===== 6. In nền một phần; thiếu dữ liệu =====
  const L6 = seed([lot('fa', 'R-A', {exp: EXP0, inDot2: {v: 1, items: {}}})]);
  await setDb(L6); await open();
  await rc('#d2Table tr[data-d2="08"] [data-act=d2confirm]'); await rc('#d2Table tr[data-d2="' + K77 + '"] [data-act=d2confirm]');
  await w.waitForFunction(() => document.querySelector('#d2Table tr[data-d2="08"]').dataset.adv === 'cho');
  a = await adv(); ok('nền in một phần: mẫu/nhóm đã in là “chờ dữ liệu”, mẫu/nhóm còn lại vẫn là “nền”', a['08'] === 'cho' && a[K77] === 'cho' && a[K78] === 'nen' && a['14'] === 'nen' && a[J77] === 'nen', JSON.stringify(a));
  await w.waitForTimeout(700); const L7 = JSON.parse(JSON.stringify(await w.evaluate(() => window.hak.loadSync().db))); Object.assign(L7.rs.own1.forests.fa, {pc: PC, exp: EXP1}); L7.rs.own1.forests.fa.info.khoiLuong = 29.75;
  await setDb(L7); await open(); a = await adv();
  ok('có đủ dữ liệu, nền in một phần: chỉ 08 và BM-09 (nhóm 77) in đè; các mục chưa in nền dùng giấy trắng', a['08'] === 'de' && a[K77] === 'de' && a[K78] === 'trang' && a['14'] === 'trang' && a[J77] === 'trang' && a[J78] === 'trang', JSON.stringify(a));
  const D2 = await grab('#d2Card .docrow [data-act=d2dl][data-mode=de]'), T2 = await grab('#d2Card .docrow [data-act=d2dl][data-mode=trang]');
  ok('hai gói tách riêng: in đè (2 mục đã in nền) và giấy trắng (4 mục chưa in nền), tên khác nhau', /IN_DE/.test(D2.name) && Object.keys(D2.docs).length === 2 && /IN_GIAY_TRANG/.test(T2.name) && Object.keys(T2.docs).length === 4 && noDraft(D2) && noDraft(T2), D2.name + ' ' + T2.name + ' ' + Object.keys(D2.docs).length + '/' + Object.keys(T2.docs).length);

  // ===== 7. Có đủ dữ liệu ngay từ đầu, chưa in nền: nút chính in đầy đủ giấy trắng =====
  await setDb(seed([lot('fa', 'R-A', {exp: EXP1, pc: PC, kl: 29.75})])); await open(); a = await adv();
  ok('đủ dữ liệu, chưa in nền: cả sáu mục “giấy trắng”', Object.values(a).every(v => v === 'trang'), JSON.stringify(a));
  const T3 = await grab('#d2Card .docrow [data-act=d2dl][data-mode=trang]');
  ok('nút “In đầy đủ đợt 2 – dùng giấy trắng”: ZIP gồm đủ bốn biểu mẫu (BM-09, BM-10 mỗi người vận chuyển một file), đầy đủ số liệu, không BẢN NHÁP', /IN_GIAY_TRANG\.zip$/.test(T3.name) && Object.keys(T3.docs).length === 6 && noDraft(T3) && Object.entries(T3.docs).every(([n, x]) => /\d/.test(plain(x.xml))) && Object.entries(T3.docs).filter(([n]) => /^09_/.test(n)).every(([, x]) => /BẢNG KÊ KHỐI LƯỢNG ĐÍNH KÈM/.test(plain(x.xml))), T3.name);
  ok('bản giấy trắng có số biên bản, ngày lập và số tiền (không để trống)', Object.entries(T3.docs).some(([n, x]) => /09\/2026|Số: 09/.test(plain(x.xml)) || /20\/12\/2026/.test(plain(x.xml))));

  // ===== 8. Nền in từ trước (hồ sơ cũ): bắt buộc đối chiếu =====
  await open(); dialogs.length = 0; 
  await rc('#d2Table tr[data-d2="08"] [data-act=d2legacy]'); await w.waitForFunction(() => document.querySelector('#d2Table tr[data-d2="08"]').dataset.adv === 'kiemtra');
  ok('“đã có tờ nền in từ trước”: chưa biết bố cục → yêu cầu đối chiếu', (await adv())['08'] === 'kiemtra' && /Chưa biết bố cục/.test(await w.innerText('#d2Table')));
  await rc('#d2Table tr[data-d2="08"] [data-act=d2dl][data-mode=de]'); await w.waitForTimeout(800);
  ok('in đè nền cũ: hiện hộp hỏi đối chiếu trước khi tải; sau khi đồng ý mục chuyển sang in đè', dialogs.some(d => /tờ nền in từ trước/.test(d)) && (await adv())['08'] === 'de', dialogs.join('|').slice(0, 120));

  // ===== 9. Tách theo lô =====
  await setDb(seed([lot('fa', 'R-A', {exp: EXP0}), lot('fb', 'R-B', {exp: EXP0, nc: NC3.map(r => ({...r, maRung: 'R-B'})), dx: [{...xe('92C-12345', '049000000077'), maRung: 'R-B'}]})]));
  await open('fa'); await w.click('#d2Card button[data-act=d2confirm][data-keys*="|"]'); await w.waitForFunction(() => document.querySelectorAll('#d2Table tr[data-adv=cho]').length === 6);
  await w.click('[data-tab=rung]'); await w.click('[data-forest=fb]'); await w.click('[data-ftab=xuat]'); await w.click('[data-xtab=all]'); await w.waitForSelector('#d2Table'); a = await adv();
  ok('lô khác không bị ảnh hưởng: mọi mục lô B vẫn “chưa in nền”', Object.keys(a).length === 4 && Object.values(a).every(v => v === 'nen'), JSON.stringify(a));
  ok('không có lỗi JavaScript', errs.length === 0, errs.join('|'));
  await app.close(); console.log(fail ? 'CÓ ' + fail + ' LỖI' : 'TẤT CẢ ĐẠT'); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
