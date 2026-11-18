'use strict';
/* NGHIỆM THU BẢN 3.0 (mục 9 của yêu cầu) — Electron thật, SQLite thật, biểu mẫu Word xuất thực tế:
 *  1. một người ở HAI đội (hai hợp đồng nhân công): chọn từ Danh mục đối tượng, đội thứ hai ghi chú “đang ở Đội 1”, hai dòng thành viên, không báo trùng CCCD;
 *  2. lô có 2 hợp đồng vận chuyển + đội giao khoán + đội ký với cá nhân: gói xuất có HĐ giao khoán của đội 1, HĐLĐ của đội 2, 2 HĐ vận chuyển;
 *  3. đổi tên vị trí rồi in lại lô ĐÃ CHỐT: lô chốt giữ tên cũ (dữ liệu và bản in không đổi), lô đang lập nhận tên mới.
 * (Người vừa Tài xế vừa Chủ xe: e2e-danhmuc30; Excel / HoSoKeo đổi BKS: e2e-phieu30, e2e-bienso; 100 tấn chia 60/40 và 50/50 lẻ kg: e2e-phanbo30;
 *  nâng cấp từ v2.3.0: e2e-nangcap30.)
 * Chạy: xvfb-run -a node scripts/e2e-nghiemthu30.js */
const {_electron: electron} = require('playwright-core');
const path = require('path'), fs = require('fs'), os = require('os');
const JSZip = require('jszip');
const src = fs.readFileSync(path.join(__dirname, 'e2e-inan2.js'), 'utf8');
const {nv, xe, lot, seed, P} = new Function(src.slice(src.indexOf('const nv ='), src.indexOf('const plain =')) + '; return {nv, xe, lot, seed, P};')();
const root = path.join(__dirname, '..');
const V = require(path.join(root, 'src', 'vongdoi.js')), M = require(path.join(root, 'src', 'model.js'));
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hakqn-nt30-')), out = path.join(dir, 'out'); fs.mkdirSync(out, {recursive: true});
let fail = 0; const ok = (name, cond, extra) => { console.log((cond ? 'ĐẠT  ' : 'LỖI  ') + name + (!cond && extra ? ' — ' + extra : '')); if (!cond) fail++; };
const plain = xml => (xml.match(/<w:t[^>]*>([^<]*)<\/w:t>/g) || []).map(a => a.replace(/<[^>]+>/g, '')).join(' ');

(async () => {
  const app = await electron.launch({executablePath: require('electron'), args: [root, '--no-sandbox'], env: {...process.env, HAKQN_CLOSE: 'discard', HAKQN_DB: path.join(dir, 'd.sqlite'), HAKQN_USERDATA: path.join(dir, 'ud'), HAKQN_DOWNLOAD_DIR: out}});
  const w = await app.firstWindow(); const errs = []; w.on('pageerror', e => errs.push(e.message)); w.on('dialog', d => d.accept()); await w.waitForSelector('#side');
  // ---- dữ liệu giả lập ----
  const p = (i, vai, ten, cd, doi, ma) => ({...nv(i, vai, ten, cd, '04908500' + String(7000 + i)), maRung: ma || 'R-A', doi});
  const nc = [p(1, 'Tổ trưởng', 'TRẦN MỘT', 'Tổ trưởng', 'Đội 1'), p(2, 'Công nhân', 'LÊ CƯA', 'Công nhân cưa', 'Đội 1'), p(5, 'Tổ trưởng', 'NGUYỄN HAI', 'Tổ trưởng', 'Đội 2'), p(6, 'Công nhân', 'HỒ KT SÁU', 'Công nhân khai thác', 'Đội 2')];
  const pcs = [P(1, '05/10/2026', '92C-12345', 'PA1', 12.5, 'Đội 1'), P(2, '06/10/2026', '92C-67890', 'PA2', 9.25, 'Đội 2')].map(x => ({...x, maRung: 'R-A'}));
  const A = lot('fa', 'R-A', {exp: {soKT: '015', ngayKy: '02/10/2026', soVC: '07', ntNgay: '20/12/2026', pcNgay: '20/12/2026'}, kl: null, nc, pc: pcs, dx: [xe('92C-12345', '049000000077', 'LÊ VĂN AN'), xe('92C-67890', '049000000078', 'TRẦN BÌNH')]});
  A.info.donGiaTan = {'Tổ trưởng': 420000, 'Công nhân cưa': 380000, 'Công nhân khai thác': 330000}; A.info.tuNgay = '05/10/2026';
  const B = M.ensureForest(lot('fb', 'R-B', {exp: {soKT: '016', ngayKy: '02/10/2026'}, kl: 10, nc: [p(11, 'Tổ trưởng', 'ĐẶNG BA', 'Tổ trưởng', '', 'R-B'), p(12, 'Công nhân', 'VÕ CƯA', 'Công nhân cưa', '', 'R-B')], pc: []}));
  B.info.donGiaTan = {'Tổ trưởng': 400000, 'Công nhân cưa': 360000}; V.chot(B, 'Kế toán', '2026-11-01T00:00:00.000Z', []);
  const D = seed([A, B]);
  D.dmViTri = [{id: 'vt1', ten: 'Tổ trưởng'}, {id: 'vt2', ten: 'Công nhân cưa'}, {id: 'vt3', ten: 'Công nhân khai thác'}];
  D.dmDoiTuong = [{id: 'dt1', ma: 'DT0001', ten: 'PHAN HAI ĐỘI', loai: 'thenhan', diaChi: 'Quế Sơn', kyHD: {}, nguoi: [{id: 'ng1', hoTen: 'PHAN HAI ĐỘI', cccd: '049085009001', ngaySinh: '01/01/1985', ngayCap: '01/01/2021', noiCap: 'Cục CS QLHC', diaChi: 'Quế Sơn, Quảng Nam', gioiTinh: 'Nam', viTriId: 'vt3', vaiTro: {nhanCong: true}, kyHD: {}}]}];
  await w.evaluate(d => window.hak.save(d), D); await w.reload(); await w.waitForSelector('#side');
  { const d0 = await w.evaluate(() => window.hak.loadSync().db), f0 = d0.rs.own1.forests.fa;   // đội 2 ký với từng cá nhân; phiếu theo đội
    f0.doi[1].hinhThuc = Object.assign({}, f0.doi[1].hinhThuc, {moHinhKy: 'tructiep', hinhThucLuong: 'sanluong'}); f0.pc.forEach(x => { x.doiId = x.soPhieu === 'PA2' ? f0.doi[1].id : f0.doi[0].id; });
    await w.evaluate(d => window.hak.save(d), d0); await w.reload(); await w.waitForSelector('#side'); }
  const lotDb = async id => (await w.evaluate(() => window.hak.loadSync().db)).rs.own1.forests[id];
  const moRung = async (id, tab) => { await w.click('[data-open=own1]'); await w.click('[data-tab=rung]'); await w.click('[data-forest=' + id + ']'); await w.click('[data-ftab=' + tab + ']'); await w.waitForTimeout(200); };
  const luu = async () => { const b = await w.$('button[data-act=stSave]'); if (b) { await b.click(); await w.waitForTimeout(600); } };
  let f = await lotDb('fa'); const d1 = f.doi[0].id, d2 = f.doi[1].id;

  // ---- 1. một người ở hai đội ----
  const themTuDanhMuc = async doiId => {
    await moRung('fa', 'nc'); await w.evaluate(id => window.__hak.hdMo('nc', id), doiId); await w.waitForSelector('#hdDau'); /* mở thẳng trang hợp đồng của đội: tab nhớ hợp đồng đang mở */ await w.evaluate(() => window.__hak.mucLo('nc', 'thanhvien'));   // 3.0: nhân công ở mục Thành viên
    await w.click('[data-act=stAdd][data-kind=nc]'); await w.waitForSelector('#ncDm');
    const nhan = await w.$eval('#ncDm', s => [...s.options].map(o => o.textContent).find(t => /PHAN HAI ĐỘI/.test(t)) || '');
    await w.selectOption('#ncDm', '049085009001'); await w.waitForTimeout(250);
    await w.click('#stForm button[type=submit]'); await w.waitForTimeout(300); await luu(); return nhan;
  };
  const nhan1 = await themTuDanhMuc(d1), nhan2 = await themTuDanhMuc(d2);
  f = await lotDb('fa'); const hai = f.nc.filter(r => r.cccd === '049085009001');
  ok('chọn từ Danh mục đối tượng (người có vai trò Nhân công) vào đội 1', /PHAN HAI ĐỘI/.test(nhan1) && !/đang ở/.test(nhan1), nhan1);
  ok('đội 2: ô chọn vẫn có người này, ghi chú “đang ở Đội 1”', /đang ở Đội 1/.test(nhan2), nhan2);
  ok('lưu: hai dòng thành viên (hai đội), ID dòng khác nhau, cùng nối người của danh mục', hai.length === 2 && new Set(hai.map(r => r.doiId)).size === 2 && hai[0].id !== hai[1].id && hai.every(r => r.nguoiId === 'ng1'), JSON.stringify(hai.map(r => [r.doiId, r.id, r.nguoiId])));
  ok('không báo trùng CCCD giữa hai đội', !/CCCD trùng/.test(await w.innerText('#main')));

  // ---- 2. 2 HĐVC + giao khoán + ký với cá nhân: gói xuất ----
  for (const x of fs.readdirSync(out)) fs.unlinkSync(path.join(out, x));
  await moRung('fa', 'xuat'); await w.click('[data-xtab=all]').catch(() => {}); await w.waitForTimeout(300);
  await w.click('button[data-act=dl][data-kind=all]');
  let zf = null; for (let i = 0; i < 120 && !zf; i++) { zf = fs.readdirSync(out).find(x => x.endsWith('.zip')); await w.waitForTimeout(200); } await w.waitForTimeout(400);
  const z = zf ? await JSZip.loadAsync(fs.readFileSync(path.join(out, zf))) : null, names = z ? Object.keys(z.files).filter(n => !z.files[n].dir) : [];
  const pick = re => names.filter(n => re.test(n)).sort();
  const gk = pick(/^01_HD_Giao_khoan[^/]*\/.*\.docx$/), ld = pick(/^03_HDLD\/.*\.docx$/), vc = pick(/^04_HDVC\/.*\.docx$/);
  ok('gói xuất: HĐ giao khoán của đội 1 (1 file), HĐLĐ của đội 2 (3 người: Tổ trưởng, công nhân, người ở hai đội), 2 HĐ vận chuyển', gk.length === 1 && ld.length === 3 && vc.length === 2, JSON.stringify({gk, ld, vc}));
  if (gk.length) { const t = plain(await (await JSZip.loadAsync(await z.file(gk[0]).async('nodebuffer'))).file('word/document.xml').async('string'));
    ok('HĐ giao khoán đội 1 ký với Tổ trưởng đội 1, số 015.1; HĐLĐ đội 2 có người ở hai đội', /TRẦN MỘT/.test(t) && /015\.1\/2026-KT/.test(t) && !/NGUYỄN HAI/.test(t) && ld.some(n => /PHAN/i.test(n)), t.slice(0, 200) + ' | ' + ld.join(',')); }

  // ---- 3. đổi tên vị trí rồi in lại lô đã chốt ----
  const fb0 = await lotDb('fb');
  const dmCu = (await w.evaluate(() => window.hak.loadSync().db)).dinhMuc || {};
  await moRung('fa', 'nc'); if (await w.$('#loDirtyBar [data-act=stSave]')) { await w.click('#loDirtyBar [data-act=stSave]'); await w.waitForTimeout(600); }   // lô không còn thay đổi chưa lưu
  await w.click('#navSet'); await w.click('#setTab_setvt'); await w.waitForSelector('#vtBang');
  await w.fill('[data-vtten="vt2"]', 'Thợ cưa'); await w.click('[data-vtdoi="vt2"]'); await w.waitForTimeout(600);
  const fa1 = await lotDb('fa'), fb1 = await lotDb('fb');
  ok('đổi tên vị trí: lô đang lập nhận tên mới (dòng nhân công, đơn giá)', fa1.nc.some(r => r.chucDanh === 'Thợ cưa') && !fa1.nc.some(r => r.chucDanh === 'Công nhân cưa') && 'Thợ cưa' in ((fa1.doi[0].hinhThuc || {}).donGiaTan || {}), JSON.stringify(fa1.doi[0].hinhThuc));
  const dmMoi = (await w.evaluate(() => window.hak.loadSync().db)).dinhMuc || {};
  ok('định mức BHLĐ dùng chung: giữ mục “Công nhân cưa” cho lô đã chốt, thêm “Thợ cưa” cho lô mới', !('Công nhân cưa' in dmCu) || ('Công nhân cưa' in dmMoi && 'Thợ cưa' in dmMoi), JSON.stringify(Object.keys(dmMoi)));
  ok('lô đã chốt: dữ liệu giữ nguyên (tên cũ “Công nhân cưa”, dấu vân tay không đổi)', JSON.stringify(fb1) === JSON.stringify(fb0) && fb1.nc.some(r => r.chucDanh === 'Công nhân cưa') && V.bamDuLieu(fb1) === fb1.chot.hashDL);
  for (const x of fs.readdirSync(out)) fs.unlinkSync(path.join(out, x));
  await moRung('fb', 'xuat'); await w.click('[data-xtab=all]').catch(() => {}); await w.waitForTimeout(300);
  const nut = await w.$('button[data-act=dl][data-kind=cuoi]:not([disabled])'); let zb = null;   // gói cuối kỳ: hợp đồng, nghiệm thu, thanh toán
  if (nut) { await nut.click(); for (let i = 0; i < 120 && !zb; i++) { zb = fs.readdirSync(out).find(x => x.endsWith('.zip')); await w.waitForTimeout(200); } await w.waitForTimeout(400); }
  const tb = zb ? await (async () => { const zz = await JSZip.loadAsync(fs.readFileSync(path.join(out, zb))); let s = ''; for (const n of Object.keys(zz.files).filter(n => /\.docx$/.test(n))) s += plain(await (await JSZip.loadAsync(await zz.file(n).async('nodebuffer'))).file('word/document.xml').async('string')) + ' '; return s; })() : '';
  ok('in lại lô đã chốt sau khi đổi tên vị trí: bản in vẫn ghi “Công nhân cưa”, không có “Thợ cưa”', /Công nhân cưa/.test(tb) && !/Thợ cưa/.test(tb), zb ? tb.slice(0, 200) : 'không xuất được');

  ok('không có lỗi script trên màn hình', errs.length === 0, errs.join(' | '));
  await app.close(); console.log(fail ? 'CÓ ' + fail + ' LỖI' : 'TẤT CẢ ĐẠT'); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
