'use strict';
/* NÂNG CẤP TỪ v2.3.0 (SQLite v14) LÊN 3.0 (v15) — Electron thật, SQLite thật. Cơ sở dữ liệu dựng bằng đúng các migration v1–v14 (cấu trúc của v2.3.0), có:
 * danh mục cũ (lao động nhiều ngày, xe kèm tài xế, đối tác doanh nghiệp + cá nhân), lô hai đội có chấm công theo CCCD và hợp đồng vận chuyển ký với doanh nghiệp,
 * một người tài xế chỉ có tên (không CCCD), một lô đã chốt. So trước / sau:
 *  - sao lưu file trước khi chuyển (truoc-nang-cap-v14-len-v15), chạy một lần, mở lại không chạy lại, không đổi dữ liệu;
 *  - Danh mục đối tượng / xe / vị trí dựng từ danh mục cũ (một CCCD = một người, gộp vai trò); doanh nghiệp → pháp nhân ký Vận chuyển;
 *  - lô đang lập: dòng có ID, chấm công chuyển sang ID dòng (giữ đủ số công), hợp đồng vận chuyển nối bên ký; phần dữ liệu gốc không đổi (bỏ ID / liên kết);
 *  - không tự nối khi không duy nhất (tài xế không CCCD) → “Cần đối chiếu”, dữ liệu gốc giữ nguyên;
 *  - lô đã chốt: không đổi một byte, vẫn nguyên vẹn, vẫn chỉ đọc.
 * Chạy: xvfb-run -a node scripts/e2e-nangcap30.js */
const {_electron: electron} = require('playwright-core');
const path = require('path'), fs = require('fs'), os = require('os');
const root = path.join(__dirname, '..');
const {Store, MIGRATIONS} = require(path.join(root, 'src', 'store.js'));
const V = require(path.join(root, 'src', 'vongdoi.js')), M = require(path.join(root, 'src', 'model.js')), CC = require(path.join(root, 'src', 'chamcong.js'));
const {bo30} = require(path.join(root, 'tests', '_bo30.js'));
const src = fs.readFileSync(path.join(__dirname, 'e2e-inan2.js'), 'utf8');
const {nv, xe, lot, seed, P} = new Function(src.slice(src.indexOf('const nv ='), src.indexOf('const plain =')) + '; return {nv, xe, lot, seed, P};')();
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hakqn-nc30-')), file = path.join(dir, 'd.sqlite'), bkDir = path.join(dir, 'backups');
let fail = 0; const ok = (name, cond, extra) => { console.log((cond ? 'ĐẠT  ' : 'LỖI  ') + name + (!cond && extra ? ' — ' + extra : '')); if (!cond) fail++; };
const doc = q => { const s = new Store(file, {migrations: MIGRATIONS}); try { return q(s); } finally { s.close(); } };

(async () => {
  // 1. dữ liệu v2.3.0
  const p = (i, vai, ten, cd, doi) => ({...nv(i, vai, ten, cd, '04908500' + String(7000 + i)), maRung: 'R-A', doi});
  const A = M.ensureForest(lot('fa', 'R-A', {exp: {soKT: '015', ngayKy: '02/10/2026'}, kl: null,
    nc: [p(1, 'Tổ trưởng', 'TRẦN MỘT', 'Tổ trưởng', 'Đội 1'), p(2, 'Công nhân', 'LÊ CƯA', 'Công nhân cưa', 'Đội 1'), p(5, 'Tổ trưởng', 'NGUYỄN HAI', 'Tổ trưởng', 'Đội 2'), p(6, 'Công nhân', 'HỒ SÁU', 'Công nhân khai thác', 'Đội 2')],
    pc: [P(1, '05/10/2026', '92C-12345', 'PA1', 12.5, 'Đội 1')].map(x => ({...x, maRung: 'R-A'})), dx: [xe('92C-12345', '049000000077', 'LÊ VĂN AN'), Object.assign(xe('92C-67890', '049000000078', 'TRẦN BÌNH'), {taiXe: 'TÀI XẾ KHÔNG CCCD', cccdTx: ''})]}));
  A.cc = {'2026-10': {'049085007001': {'5': 1, '6': 1}, '049085007002': {'5': 0.5}, '049085007005': {'7': 1}}};
  const hdB = A.dx.find(r => r.bienSo === '92C-67890').hdvcId;
  A.hdvc.find(h => h.id === hdB).donViId = 'dn:dv1'; A.hdvc.find(h => h.id === hdB).ben = {id: 'dn:dv1', loai: 'doanhnghiep', ten: 'CÔNG TY VT A', mst: '0401234567'};
  const B = M.ensureForest(lot('fb', 'R-B', {exp: {}, kl: 10, nc: [{...p(11, 'Tổ trưởng', 'ĐẶNG BA', 'Tổ trưởng', ''), maRung: 'R-B'}], pc: []}));
  V.chot(B, 'Kế toán', '2026-11-01T00:00:00.000Z', []);
  const D = seed([A, B]);
  D.dmLaoDong = [{ngayCapNhat: '01/09/2026', cccd: '049085007001', ten: 'TRẦN MỘT', diaChi: 'Quế Sơn', viTri: 'Tổ trưởng'}, {ngayCapNhat: '01/10/2026', cccd: '049085007001', ten: 'TRẦN MỘT', diaChi: 'Đại Lộc', viTri: 'Tổ trưởng'},
    {ngayCapNhat: '01/10/2026', cccd: '049000000077', ten: 'LÊ VĂN AN', diaChi: 'Đà Nẵng', viTri: 'Công nhân cưa'}];
  D.dmXeVC = [{ngayCapNhat: '01/10/2026', bienSo: '92C-12345', chuXe: 'LÊ VĂN AN', cccd: '049000000077', taiXe: 'LÊ VĂN AN', cccdTx: '049000000077', gplx: 'G1'}, {ngayCapNhat: '01/10/2026', bienSo: '92C-67890', chuXe: 'TRẦN BÌNH', cccd: '049000000078', taiXe: 'TÀI XẾ KHÔNG CCCD'}];
  D.dmDoiTac = [{id: 'dn:dv1', loai: 'doanhnghiep', ten: 'CÔNG TY VT A', mst: '0401234567', daiDien: 'NGUYỄN ĐẠI', chucVu: 'Giám đốc'}];
  { const s14 = new Store(file, {migrations: MIGRATIONS.slice(0, 14)}); s14.save(D); s14.close(); }
  const truoc = (() => { const s14 = new Store(file, {migrations: MIGRATIONS.slice(0, 14)}); try { return {db: s14.load(), lo: s14.db.prepare('SELECT id, data FROM forests ORDER BY id').all()}; } finally { s14.close(); } })();
  const ver0 = (() => { const Db = require('better-sqlite3'), d = new Db(file); try { return d.pragma('user_version', {simple: true}); } finally { d.close(); } })();
  ok('dữ liệu thử ở cấu trúc v14 (v2.3.0)', ver0 === 14, 'v' + ver0);

  // 2. mở bằng bản 3.0
  const launch = async () => { const app = await electron.launch({executablePath: require('electron'), args: [root, '--no-sandbox'], env: {...process.env, HAKQN_CLOSE: 'discard', HAKQN_DB: file, HAKQN_USERDATA: path.join(dir, 'ud')}});
    const w = await app.firstWindow(); w.errs = []; w.on('pageerror', e => w.errs.push(e.message)); w.on('dialog', d => d.accept()); await w.waitForSelector('#side'); return {app, w}; };
  let {app, w} = await launch();
  const bk = fs.existsSync(bkDir) ? fs.readdirSync(bkDir).filter(n => n.startsWith('truoc-nang-cap-v14-len-v' + MIGRATIONS.length + '-')) : [];
  ok('sao lưu file trước khi chuyển đổi (truoc-nang-cap-v14-len-v' + MIGRATIONS.length + ')', bk.length === 1, JSON.stringify(fs.existsSync(bkDir) ? fs.readdirSync(bkDir) : []));
  const db = await w.evaluate(() => window.hak.loadSync().db), fa = db.rs.own1.forests.fa, fb = db.rs.own1.forests.fb;
  const ng = (db.dmDoiTuong || []).flatMap(o => (o.nguoi || []).map(x => ({o, x})));
  ok('Danh mục đối tượng: một CCCD một người, gộp vai trò (LÊ VĂN AN: Nhân công + Tài xế + Chủ xe), thông tin dòng mới nhất', ng.filter(a => a.x.cccd === '049000000077').length === 1 && (a => a && a.x.vaiTro.nhanCong && a.x.vaiTro.taiXe && a.x.vaiTro.chuXe)(ng.find(a => a.x.cccd === '049000000077')) && (ng.find(a => a.x.cccd === '049085007001') || {x: {}}).x.diaChi === 'Đại Lộc', JSON.stringify(ng.map(a => [a.x.cccd, a.x.vaiTro, a.x.diaChi])));
  const pn = (db.dmDoiTuong || []).find(o => o.loai === 'phapnhan');
  ok('doanh nghiệp cũ → pháp nhân ký Vận chuyển (đại diện, chức vụ), giữ id cũ để nối', !!pn && pn.mst === '0401234567' && pn.kyHD.vanChuyen && pn.daiDien === 'NGUYỄN ĐẠI' && pn.nguonCu === 'dn:dv1', JSON.stringify(pn));
  ok('Danh mục xe: 2 xe theo BKS, chủ xe theo ID; Vị trí có mã ổn định', (db.dmXe || []).length === 2 && (db.dmXe.find(x => /12345/.test(x.bks)) || {}).chuXeId && (db.dmViTri || []).every(v => /^vt\d+$/.test(v.id)), JSON.stringify(db.dmXe));
  ok('tài xế không có CCCD: không tự tạo, ghi “Cần đối chiếu”', JSON.stringify(db.canDoiChieu || []).includes('TÀI XẾ KHÔNG CCCD') || JSON.stringify(fa.canDoiChieu || []).includes('TÀI XẾ KHÔNG CCCD'), JSON.stringify([db.canDoiChieu, fa.canDoiChieu]));
  const tv = c => (fa.nc.find(r => r.cccd === c) || {}).id;
  ok('lô đang lập: mọi dòng có ID; chấm công chuyển sang ID dòng, giữ đủ số công', fa.nc.every(r => /^tv\d+$/.test(r.id)) && fa.dx.every(r => /^xr\d+$/.test(r.id)) && fa.pc.every(r => /^pc\d+$/.test(r.id)) &&
    CC.total(fa.cc, tv('049085007001')) === 2 && CC.total(fa.cc, tv('049085007002')) === 0.5 && CC.total(fa.cc, tv('049085007005')) === 1 && !fa.cc['2026-10']['049085007001'], JSON.stringify(fa.cc));
  ok('hợp đồng vận chuyển ký với doanh nghiệp: nối bên ký tới pháp nhân; phiếu cân nối hợp đồng và xe', (fa.hdvc.find(h => h.id === hdB).benKy || {}).doiTuongId === (pn || {}).id && fa.pc[0].hdvcId && fa.pc[0].xeRowId, JSON.stringify(fa.hdvc));
  const goc = M.ensureForest(JSON.parse(truoc.lo.find(r => r.id === 'fa').data));
  const boCC = f => { const x = bo30(JSON.parse(JSON.stringify(f))); delete x.cc; delete x.canDoiChieu; return x; };
  ok('lô đang lập: phần dữ liệu gốc không đổi (bỏ ID dòng, liên kết, chấm công đã chuyển khóa)', JSON.stringify(boCC(fa)) === JSON.stringify(boCC(goc)));
  const fbGoc = truoc.lo.find(r => r.id === 'fb').data;
  ok('lô đã chốt: không đổi một byte, dấu vân tay khớp, vẫn chỉ đọc', doc(s => s.db.prepare("SELECT data FROM forests WHERE id = 'fb'").get().data) === fbGoc && V.bamDuLieu(fb) === fb.chot.hashDL);
  await w.click('[data-open=own1]'); await w.click('[data-tab=rung]'); await w.click('[data-forest=fb]'); await w.click('[data-ftab=nc]'); await w.waitForTimeout(300);
  ok('lô đã chốt mở ra chỉ đọc, không báo khác bản đã chốt', !!(await w.$('#loKhoaBar')) && !/khác bản đã chốt/.test(await w.innerText('#loKhoaBar')));
  ok('màn mới mở được: danh sách hợp đồng của lô đang lập', await (async () => { await w.click('[data-forest=fa]'); await w.click('[data-ftab=nc]'); await w.waitForTimeout(200); return !!(await w.$('#dsHdNcTbl')); })());
  ok('không có lỗi JavaScript', w.errs.length === 0, w.errs.join('|'));
  await app.close();
  const kq = doc(s => ({ver: s.db.pragma('user_version', {simple: true}), data: s.db.prepare('SELECT id, hash FROM forests ORDER BY id').all(), dm: s.db.prepare('SELECT kind, ord, hash FROM danh_muc ORDER BY kind, ord').all()}));
  ok('SQLite ở cấu trúc mới nhất (v' + MIGRATIONS.length + ')', kq.ver === MIGRATIONS.length, 'v' + kq.ver);

  // 3. mở lại: không chuyển đổi lại, không đổi dữ liệu
  ({app, w} = await launch()); await app.close();
  const bk2 = fs.readdirSync(bkDir).filter(n => /^truoc-nang-cap/.test(n));
  const kq2 = doc(s => ({data: s.db.prepare('SELECT id, hash FROM forests ORDER BY id').all(), dm: s.db.prepare('SELECT kind, ord, hash FROM danh_muc ORDER BY kind, ord').all()}));
  ok('mở lại lần hai: không sao lưu nâng cấp lần nữa, dữ liệu lô và danh mục giữ nguyên', bk2.length === 1 && JSON.stringify(kq2) === JSON.stringify({data: kq.data, dm: kq.dm}), JSON.stringify(bk2));
  console.log(fail ? 'CÓ ' + fail + ' LỖI' : 'TẤT CẢ ĐẠT'); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
