'use strict';
/* Hai hình thức hợp đồng và cơ sở tính đơn giá (Electron thật, dữ liệu giả lập):
 *  1. Giao khoán: chủ rừng ký với Tổ trưởng, công nhân ký MỘT Giấy ủy quyền (BM-20) cho Tổ trưởng; tính theo tấn hoặc ha; không còn BM-03 riêng từng người.
 *  2. Trực tiếp: chủ rừng ký hợp đồng lao động (BM-03) với tất cả nhân công; tính theo tấn hoặc ngày công.
 *  Đơn giá theo từng vai trò; sản lượng (tấn, ha) hoặc số công chia đều cho mọi người. Kiểm tra số liệu trong BM-01, BM-08, BM-14, BM-20. */
const {_electron: electron} = require('playwright-core');
const path = require('path'), fs = require('fs'), os = require('os');
const JSZip = require('jszip'), XLSX = require('xlsx');
const root = path.join(__dirname, '..'), FIX = path.join(root, 'tests', 'fixtures');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hakqn-hd-')), out = path.join(dir, 'out');
let fail = 0; const ok = (name, cond, extra) => { console.log((cond ? 'ĐẠT  ' : 'LỖI  ') + name + (!cond && extra ? ' — ' + extra : '')); if (!cond) fail++; };
const fmt = n => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
const OWNER = {ma: 'CR-001', ten: 'NGUYỄN PHƯỚC TÁM', soHopDong: 'HD-001', ngayKyHopDong: '01/10/2026', cccd: '049067005459', ngayCap: '15/08/2021', noiCap: 'CA', diaChi: 'Đà Nẵng'};

// Danh sách nhân công của file thử: lấy chức danh và họ tên để tính số tiền kỳ vọng
const wsNC = XLSX.readFile(path.join(FIX, 'test_nhancong.xlsx')); const aoa = XLSX.utils.sheet_to_json(wsNC.Sheets[wsNC.SheetNames[0]], {header: 1});
const head = aoa[0], ci = n => head.indexOf(n);
const PEOPLE = aoa.slice(1).map(r => ({ten: r[ci('Họ và tên')], vaiTro: r[ci('Vai trò')], chucDanh: r[ci('Chức danh')]}));
const N = PEOPLE.length, WORKERS = PEOPLE.filter(p => p.vaiTro !== 'Tổ trưởng'), TT = PEOPLE.find(p => p.vaiTro === 'Tổ trưởng');
const ROLES = ['Tổ trưởng', 'Công nhân khai thác', 'Công nhân cưa'];
const total = (qty, price) => PEOPLE.reduce((s, p) => s + Math.round(qty / N * price[ROLES.indexOf(p.chucDanh)]), 0);

async function docText(file) { const z = await JSZip.loadAsync(fs.readFileSync(file)); const xml = await z.file('word/document.xml').async('string'); return (xml.match(/<w:t[^>]*>([^<]*)<\/w:t>/g) || []).map(x => x.replace(/<[^>]+>/g, '')).join('').replace(/&amp;/g, '&'); }
async function docTables(file) { const z = await JSZip.loadAsync(fs.readFileSync(file)); const xml = await z.file('word/document.xml').async('string'); return (xml.match(/<w:tbl>[\s\S]*?<\/w:tbl>/g) || []).map(t => (t.match(/<w:tr[ >][\s\S]*?<\/w:tr>/g) || []).length); }

(async () => {
  const launch = () => electron.launch({executablePath: require('electron'), args: [root, '--no-sandbox'], env: {...process.env, HAKQN_DB: path.join(dir, 'hd.sqlite'), HAKQN_USERDATA: path.join(dir, 'ud'), HAKQN_DOWNLOAD_DIR: out, ELECTRON_DISABLE_SECURITY_WARNINGS: '1'}});
  let app = await launch(), w = await app.firstWindow(); const errs = []; w.on('pageerror', e => errs.push(e.message)); w.on('dialog', d => d.accept());
  await w.waitForSelector('#side');
  const clear = () => { for (const f of fs.existsSync(out) ? fs.readdirSync(out) : []) fs.unlinkSync(path.join(out, f)); };
  const exp = async (kind, ext) => { clear(); await w.click(`button[data-act=dl][data-kind=${kind}]`); for (let i = 0; i < 80; i++) { const f = fs.existsSync(out) && fs.readdirSync(out).find(x => x.endsWith(ext)); if (f) { await w.waitForTimeout(300); return path.join(out, f); } await w.waitForTimeout(100); } throw new Error('không có file ' + ext + ' cho ' + kind); };
  const save = async () => { await w.click('#luongForm button[type=submit]'); await w.waitForTimeout(250); };
  const opts = () => w.$$eval('#luongForm [name=hinhThucLuong] option', o => o.map(x => x.value));
  const price = async (pre, v) => { for (let k = 0; k < 3; k++) await w.fill(`#luongForm [name=${pre}${k}]`, String(v[k])); };

  // --- Dựng hồ sơ: chủ rừng, rừng 2,5 ha × 80 tấn/ha = 200 tấn, nhân công từ file
  await w.click('text=+ Chủ rừng mới');
  for (const [k, v] of Object.entries(OWNER)) await w.fill(`#infoForm [name="${k}"]`, v);
  await w.selectOption('#infoForm [name="danhXung"]', 'Ông'); await w.click('#infoForm button[type=submit]');
  await w.click('[data-tab=rung]'); await w.click('text=+ Rừng mới');
  await w.fill('#forestForm [name=diaDiem]', 'Thôn Hòa Phú, Xã Xuân Phú, Tp Đà Nẵng'); await w.fill('#forestForm [name=cuLy]', '45');
  await w.fill('#forestForm [name=lat]', '15.9'); await w.fill('#forestForm [name=lng]', '108.1'); await w.fill('#forestForm [name=dienTich]', '2,5'); await w.fill('#forestForm [name=dinhMucTanHa]', '80');
  await w.fill('#forestForm [name=tuNgay]', '01/10/2026'); await w.fill('#forestForm [name=denNgay]', '30/11/2026'); await w.click('#forestForm button[type=submit]');
  await w.click('[data-ftab=nc]'); await w.setInputFiles('input[data-file="nc"]', path.join(FIX, 'test_nhancong.xlsx')); await w.waitForTimeout(500);
  await w.click('[data-ftab=dx]'); await w.fill('#vcForm [name=vcKm]', '1000'); await w.click('#vcForm button[type=submit]');   // vận chuyển: để gói “tải tất cả” đủ điều kiện
  await w.setInputFiles('input[data-file="dx"]', path.join(FIX, 'test_doixe.xlsx')); await w.waitForTimeout(400);
  await w.setInputFiles('input[data-file="pc"]', path.join(FIX, 'test_phieucan.xlsx')); await w.waitForTimeout(400);
  await w.click('[data-ftab=nc]');

  // ===== GIAO KHOÁN =====
  ok('giao khoán là hình thức mặc định; cơ sở tính chỉ có tấn và ha (không có ngày công)', JSON.stringify(await opts()) === '["sanluong","ha"]', JSON.stringify(await opts()));
  const TAN = [340000, 200000, 250000], HA = [8000000, 6000000, 7000000];
  await price('dt_', TAN); await save();
  await w.click('[data-ftab=xuat]'); await w.click('[data-xtab=all]');

  // theo tấn: 200 tấn chia đều 4 người = 50 tấn/người
  let f = await exp('gk', '.docx'), t = await docText(f);
  ok('BM-01 giao khoán theo tấn: đơn giá từng vai trò (đồng/tấn) và sản lượng chia đều ' + N + ' người', /Đơn giá khoán theo vai trò \(đồng\/tấn\)/.test(t) && TAN.every(v => t.includes(fmt(v))) && new RegExp('chia đều cho ' + N + ' người').test(t), t.slice(t.indexOf('Điều 2'), t.indexOf('Điều 2') + 400));
  ok('BM-01: tổng tiền khoán dự tính = Σ (50 tấn × đơn giá vai trò) = ' + fmt(total(200, TAN)) + ' đồng', t.includes(fmt(total(200, TAN)) + ' đồng'));
  ok('BM-01: nêu việc có Giấy ủy quyền của tất cả người lao động trong tổ', /Giấy ủy quyền của toàn bộ người lao động/.test(t));
  f = await exp('tc', '.docx'); t = await docText(f);
  ok('BM-08 theo tấn: mỗi người 50 tấn × đơn giá vai trò; tổng cộng khớp (Tổ trưởng cũng có dòng tiền)', t.includes('Sản lượng chia đều (tấn)') && t.includes('Đơn giá (đồng/tấn)') && t.includes('TỔNG CỘNG') && t.includes(fmt(total(200, TAN))) && t.includes(TT.ten.toUpperCase()), t.slice(0, 500));
  ok('BM-08: có đủ ' + N + ' người và không còn ghi chú “Tổ trưởng nhận tiền theo hợp đồng giao khoán, không tính trong bảng này”', PEOPLE.every(p => t.includes(p.ten.toUpperCase())) && !/không tính trong bảng này/.test(t));
  f = await exp('nttl', '.docx'); t = await docText(f);
  ok('BM-14 giao khoán: đơn giá theo vai trò, chia đều và thành tiền = tổng theo vai trò', /Đơn giá khoán theo vai trò \(đồng\/tấn\)/.test(t) && t.includes('Thành tiền: ' + fmt(total(200, TAN)) + ' đồng'), t.slice(t.indexOf('Điều 3'), t.indexOf('Điều 3') + 400));

  // theo ha: 2,5 ha chia đều 4 người = 0,625 ha/người
  await w.click('[data-ftab=nc]'); await w.selectOption('#luongForm [name=hinhThucLuong]', 'ha'); await price('ha_', HA); await save(); await w.click('[data-ftab=xuat]'); await w.click('[data-xtab=all]');
  f = await exp('gk', '.docx'); t = await docText(f);
  ok('BM-01 giao khoán theo ha: đơn giá từng vai trò (đồng/ha), diện tích chia đều, tổng = ' + fmt(total(2.5, HA)), /Đơn giá khoán theo vai trò \(đồng\/ha\)/.test(t) && HA.every(v => t.includes(fmt(v))) && /Diện tích khai thác chia đều cho 4 người/.test(t) && /đơn giá bình quân 6\.750\.000 đồng\/ha/.test(t) && t.includes(fmt(total(2.5, HA)) + ' đồng'), t.slice(t.indexOf('Điều 2'), t.indexOf('Điều 2') + 500));
  f = await exp('tc', '.docx'); t = await docText(f);
  ok('BM-08 theo ha: cột diện tích chia đều (ha) 0,625; đơn giá đồng/ha; tổng khớp', t.includes('Diện tích chia đều (ha)') && t.includes('Đơn giá (đồng/ha)') && t.includes('0,625') && t.includes(fmt(total(2.5, HA))), t.slice(0, 400));
  f = await exp('nttl', '.docx'); t = await docText(f);
  ok('BM-14 giao khoán theo ha: thành tiền theo diện tích × đơn giá vai trò', t.includes('(đồng/ha)') && t.includes('Thành tiền: ' + fmt(total(2.5, HA)) + ' đồng'));

  // BM-20 Giấy ủy quyền: một giấy cho cả tổ
  f = await exp('uq', '.docx'); t = await docText(f); const tb = await docTables(f);
  if (process.env.SHOTS) fs.copyFileSync(f, path.join(process.env.SHOTS, 'BM-20.docx'));   // để xem bản Word khi cần
  ok('BM-20: có Giấy ủy quyền, căn cứ Bộ luật Dân sự và Điều 18 Bộ luật Lao động, Tổ trưởng là bên được ủy quyền', /GIẤY ỦY QUYỀN/.test(t) && /Bộ luật Dân sự/.test(t) && /Điều 18/.test(t) && /BÊN ĐƯỢC ỦY QUYỀN/.test(t) && t.includes(TT.ten.toUpperCase()));
  ok('BM-20: một danh sách ' + WORKERS.length + ' công nhân (họ tên, ngày sinh, giới tính, CCCD, nơi cư trú, chữ ký), không có Tổ trưởng trong danh sách', tb[tb.length - 1] === WORKERS.length + 1 && WORKERS.every(p => t.includes(p.ten.toUpperCase())) && /Giới tính/.test(t) && /Chữ ký/.test(t) && (t.match(new RegExp(TT.ten.toUpperCase(), 'g')) || []).length <= 3, JSON.stringify(tb));
  ok('BM-20: ghi rõ Bên B không được ủy quyền lại và phạm vi nhận/chi trả tiền theo bảng thanh toán', /không được ủy quyền lại/.test(t) && /Bảng thanh toán tiền công/.test(t));
  // Gói “tất cả”: giao khoán có BM-20 và KHÔNG có BM-03 riêng từng người
  f = await exp('all', '.zip'); let z = await JSZip.loadAsync(fs.readFileSync(f)); let names = Object.keys(z.files);
  ok('gói tất cả (giao khoán): có Giấy ủy quyền, không có thư mục 03_HDLD (hợp đồng lao động từng người)', names.some(n => /^20_Giay_uy_quyen/.test(n)) && !names.some(n => /^03_HDLD\//.test(n)), names.join(', '));

  // Giao khoán không cho chọn ngày công; đổi sang trực tiếp thì ha bị đổi về tấn
  await w.click('[data-ftab=nc]');
  await w.selectOption('#luongForm [name=moHinhKy]', 'tructiep');
  ok('đổi sang trực tiếp khi đang chọn “theo ha”: tự đổi về “theo tấn”; cơ sở tính còn tấn và ngày công', await w.inputValue('#luongForm [name=hinhThucLuong]') === 'sanluong' && JSON.stringify(await opts()) === '["sanluong","ngaycong"]', JSON.stringify(await opts()));

  // ===== TRỰC TIẾP =====
  await w.selectOption('#luongForm [name=hinhThucLuong]', 'ngaycong');
  const NG = [400000, 300000, 320000]; await price('dn_', NG); await save();
  await w.click('[data-ftab=xuat]'); await w.click('[data-xtab=all]');
  f = await exp('tc', '.docx'); t = await docText(f);
  ok('trực tiếp theo ngày công: BM-08 có số công, đơn giá đồng/công theo vai trò, không có cột diện tích', t.includes('Đơn giá (đồng/công)') && NG.every(v => t.includes(fmt(v))) && !t.includes('Diện tích chia đều'), t.slice(0, 400));
  f = await exp('all', '.zip'); z = await JSZip.loadAsync(fs.readFileSync(f)); names = Object.keys(z.files);
  ok('gói tất cả (trực tiếp): ' + N + ' hợp đồng lao động (BM-03) của tất cả nhân công, không có Giấy ủy quyền', names.filter(n => /^03_HDLD\/.+\.docx$/.test(n)).length === N && !names.some(n => /^20_Giay_uy_quyen/.test(n)), names.join(', '));
  await w.click('[data-ftab=nc]'); await w.selectOption('#luongForm [name=hinhThucLuong]', 'sanluong'); await price('dt_', TAN); await save();
  await w.click('[data-ftab=xuat]'); await w.click('[data-xtab=all]'); f = await exp('tc', '.docx'); t = await docText(f);
  ok('trực tiếp theo tấn: 50 tấn/người × đơn giá vai trò, tổng khớp', t.includes('Sản lượng chia đều (tấn)') && t.includes(fmt(total(200, TAN))));
  ok('không có lỗi JavaScript', errs.length === 0, errs.join('; '));
  await app.close();

  // ===== Hồ sơ cũ/không hợp lệ: giao khoán mà đang chọn ngày công; người dưới 18 tuổi không được ủy quyền =====
  app = await launch(); w = await app.firstWindow(); w.on('pageerror', e => errs.push(e.message)); await w.waitForSelector('#side');
  const person = (vt, cd, ten, ns) => ({maRung: 'R-X', vaiTro: vt, stt: 1, danhXung: 'Ông', ten, ngaySinh: ns, cccd: '049' + String(Math.abs(ten.length * 7919)).padStart(9, '0'), ngayCap: '15/08/2021', noiCap: 'CA', diaChi: 'Đà Nẵng', chucDanh: cd});
  const info = (extra) => ({maRung: 'R-X', tenRung: 'Rừng X', diaDiem: 'Thôn X', lat: null, lng: null, dienTich: 2, dinhMucTanHa: 10, cuLy: null, tuNgay: '01/10/2026', denNgay: '30/11/2026', giayTo: [], donGiaTan: {'Tổ trưởng': 1, 'Công nhân khai thác': 1, 'Công nhân cưa': 1}, ...extra});
  const mk = (id, ten, extra, nc) => ({id, info: {...OWNER, ten, danhXung: 'Ông'}, nc: [], dx: [], exp: {}, forests: {['f' + id]: {id: 'f' + id, info: info(extra), nc, dx: [], pc: [], exp: {}}}});
  const db = {v: 2, rs: {
    a: {...mk('a', 'CHỦ CŨ', {moHinhKy: 'giaokhoan', hinhThucLuong: 'ngaycong', donGiaNgay: {'Tổ trưởng': 1, 'Công nhân khai thác': 1, 'Công nhân cưa': 1}}, [person('Tổ trưởng', 'Tổ trưởng', 'AAA TT', '01/01/1980'), person('Công nhân', 'Công nhân khai thác', 'BBB CN', '01/01/1985')]), info: {...OWNER, ma: 'CR-A', cccd: '049000000011', ten: 'CHỦ CŨ', danhXung: 'Ông'}},
    b: {...mk('b', 'CHỦ TRẺ', {maRung: 'R-Y', moHinhKy: 'giaokhoan', hinhThucLuong: 'sanluong'}, [person('Tổ trưởng', 'Tổ trưởng', 'CCC TT', '01/01/1980'), person('Công nhân', 'Công nhân khai thác', 'DDD CN', '01/01/2012')]), info: {...OWNER, ma: 'CR-B', cccd: '049000000022', ten: 'CHỦ TRẺ', danhXung: 'Ông'}}}};
  await w.evaluate(d => window.hak.save(d), db); await w.reload(); await w.waitForSelector('#side');
  const openForest = async name => { await w.click('#sideQ'); await w.fill('#sideQ', name); await w.click('[data-open]:has-text("' + name + '")'); await w.click('[data-sforest] >> nth=0'); };
  await openForest('CHỦ CŨ');
  const chk = () => w.innerText('.chk');
  ok('hồ sơ cũ giao khoán + ngày công: checklist báo “Giao khoán chỉ tính theo tấn hoặc ha”', /Giao khoán chỉ tính theo tấn hoặc ha/.test(await chk()), (await chk()).slice(0, 300));
  await w.click('[data-ftab=nc]');
  ok('hồ sơ cũ: ô chọn hiển thị rõ lựa chọn không hợp lệ và các lựa chọn đúng', (await w.$$eval('#luongForm [name=hinhThucLuong] option', o => o.map(x => x.textContent))).some(x => /không áp dụng/.test(x)) && JSON.stringify(await opts()) === '["sanluong","ha","ngaycong"]', JSON.stringify(await opts()));
  await openForest('CHỦ TRẺ'); await w.click('[data-ftab=xuat]'); await w.click('[data-xtab=all]');
  ok('có người dưới 18 tuổi: Giấy ủy quyền không xuất được và nói rõ lý do', await w.isDisabled('button[data-act=dl][data-kind=uq]') && /dưới 18 tuổi/.test(await w.innerText('#main')));
  ok('không có lỗi JavaScript sau khi mở lại', errs.length === 0, errs.join('; '));
  await app.close();
  console.log(fail ? 'CÓ ' + fail + ' LỖI' : 'TẤT CẢ ĐẠT'); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
