'use strict';
/* NÂNG CẤP DỮ LIỆU v8 (main 2.2) → v14 (Electron thật, SQLite thật). Cơ sở dữ liệu dựng bằng đúng các migration v1–v8 rồi mở bằng bản mới:
 *  - v9–v14 chạy SAU khi sao lưu file (truoc-nang-cap-v8-len-v14), một chiều, mở lại lần hai không chạy lại và không đổi dữ liệu;
 *  - v11 (A4): dòng nhân công / xe cũ có ngày chụp danh mục; v12 (A3): trạng thái in BM-09 theo đội xe;
 *  - v13 (B6): danh mục ra bảng danh_muc, đọc lại đủ; v14 (B5): gói đóng băng ra bảng chot_goi, lô chốt còn nguyên, vẫn chỉ đọc.
 * Chạy: xvfb-run -a node scripts/e2e-nangcap-v14.js */
const {_electron: electron} = require('playwright-core');
const path = require('path'), fs = require('fs'), os = require('os');
const root = path.join(__dirname, '..');
const {Store, MIGRATIONS} = require(path.join(root, 'src', 'store.js'));
const V = require(path.join(root, 'src', 'vongdoi.js')), M = require(path.join(root, 'src', 'model.js'));
const src = fs.readFileSync(path.join(__dirname, 'e2e-inan2.js'), 'utf8');
const {lot, seed, PC, EXP1} = new Function(src.slice(src.indexOf('const nv ='), src.indexOf('const plain =')) + '; return {lot, seed, PC, EXP1};')();
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hakqn-nc14-')), file = path.join(dir, 'd.sqlite'), bkDir = path.join(dir, 'backups');
let fail = 0; const ok = (name, cond, extra) => { console.log((cond ? 'ĐẠT  ' : 'LỖI  ') + name + (!cond && extra ? ' — ' + extra : '')); if (!cond) fail++; };
const doc = (q, ...a) => { const s = new Store(file, {migrations: MIGRATIONS}); try { return q(s, ...a); } finally { s.close(); } };   // đọc sau khi app đã đóng (đã ở v14: không nâng cấp gì)

(async () => {
  // 1. dữ liệu bản 2.2 (v8): danh mục ở meta, lô đã chốt mang gói trong JSON, trạng thái in BM-09 theo CCCD người ký, dòng chưa có ngày chụp
  const A = M.ensureForest(lot('fa', 'R-A', {exp: EXP1, pc: PC, kl: 29.75})); V.chot(A, 'Kế toán', '2026-10-20T01:00:00.000Z', []); delete A.chot.hashDL;
  const B = lot('fb', 'R-B', {exp: EXP1, pc: PC, kl: 29.75}); B.inDot2 = {v: 1, items: {'09:049000000077': {at: '2026-11-01T00:00:00.000Z', sig: '', info: null, legacy: true, crossChecked: false}}};
  const D = seed([A, B]);
  D.dmLaoDong = [{ngayCapNhat: '01/09/2026', cccd: '049085000002', ten: 'LÊ CÔNG NHÂN', diaChi: 'Đà Nẵng'}, {ngayCapNhat: '01/10/2026', cccd: '049085000003', ten: 'PHẠM CƯA', diaChi: 'Đà Nẵng'}];
  D.dmXeVC = [{ngayCapNhat: '01/09/2026', bienSo: '92C-12345', chuXe: 'LÊ VĂN XE'}];
  D.dmDoiTac = [{id: 'dn:dv1', loai: 'doanhnghiep', ten: 'CÔNG TY VẬN TẢI A', mst: '0401234567'}];
  { const s8 = new Store(file, {migrations: MIGRATIONS.slice(0, 8)}); s8.save(D); s8.close(); }
  const goiCu = JSON.parse(JSON.stringify(D.rs.own1.forests.fa.chot.goi));
  const ver0 = (() => { const Db = require('better-sqlite3'), d = new Db(file); try { return d.pragma('user_version', {simple: true}); } finally { d.close(); } })();
  ok('dữ liệu thử dựng ở cấu trúc v8 (main 2.2)', ver0 === 8, 'v' + ver0);

  // 2. mở bằng bản mới
  const launch = async () => { const app = await electron.launch({executablePath: require('electron'), args: [root, '--no-sandbox'], env: {...process.env, HAKQN_CLOSE: 'discard', HAKQN_DB: file, HAKQN_USERDATA: path.join(dir, 'ud')}});
    const w = await app.firstWindow(); w.errs = []; w.on('pageerror', e => w.errs.push(e.message)); w.on('dialog', d => d.accept()); await w.waitForSelector('#side'); return {app, w}; };
  let {app, w} = await launch();
  const bk1 = fs.existsSync(bkDir) ? fs.readdirSync(bkDir).filter(n => /^truoc-nang-cap-v8-len-v14/.test(n)) : [];
  ok('sao lưu file trước khi nâng cấp (truoc-nang-cap-v8-len-v14)', bk1.length === 1, JSON.stringify(fs.existsSync(bkDir) ? fs.readdirSync(bkDir) : []));
  const db = await w.evaluate(() => window.hak.loadSync().db);
  ok('danh mục đọc lại đủ (lao động 2, xe 1, đối tác 1)', (db.dmLaoDong || []).length === 2 && (db.dmXeVC || []).length === 1 && (db.dmDoiTac || []).length === 1, JSON.stringify([db.dmLaoDong, db.dmXeVC, db.dmDoiTac]).slice(0, 300));
  const fa = db.rs.own1.forests.fa, fb = db.rs.own1.forests.fb;
  ok('lô đã chốt đọc lên không mang gói, có dấu vân tay phần dữ liệu; còn nguyên', fa.chot && fa.chot.goi === undefined && fa.chot.hashDL === V.bamDuLieu(goiCu) && V.kiemToanVen(fa, null, await w.evaluate(() => window.hak.kiemGoiSync('fa'))).ma === 'nguyen-ven', JSON.stringify(fa.chot));
  const g = await w.evaluate(() => window.hak.goiChot('fa'));
  ok('gói đóng băng đọc được qua IPC, đúng như trước nâng cấp', g.ok && g.goi && g.goi.data === goiCu && g.goi.phienBan === 1);
  const hd = (fb.dx.find(r => r.bienSo === '92C-12345') || {}).hdvcId;
  ok('v12: trạng thái in BM-09 của lô B theo đội xe', !!hd && Object.keys(fb.inDot2.items).join() === '09:hd:' + hd, JSON.stringify(Object.keys(fb.inDot2.items)));
  ok('v11: dòng nhân công có trong danh mục được gán ngày chụp = ngày cập nhật danh mục', (fb.nc.find(r => r.cccd === '049085000002') || {})._dmNgay === '01/09/2026' && (fb.nc.find(r => r.cccd === '049085000003') || {})._dmNgay === '01/10/2026', JSON.stringify(fb.nc.map(r => r._dmNgay)));
  ok('v11, v12 không đụng lô đã chốt (dấu vân tay phần dữ liệu không đổi)', V.bamDuLieu(fa) === fa.chot.hashDL);
  // lô chốt vẫn chỉ đọc ở màn hình
  await w.click('[data-open=own1]'); await w.click('[data-tab=rung]'); await w.click('[data-forest=fa]'); await w.click('[data-ftab=nc]'); await w.waitForTimeout(300);
  ok('lô đã chốt vẫn chỉ đọc sau nâng cấp, không báo khác bản đã chốt', !!(await w.$('#loKhoaBar')) && !/khác bản đã chốt/.test(await w.innerText('#loKhoaBar')));
  // một lần lưu sau nâng cấp (đổi danh mục): ghi theo dòng
  const r = await w.evaluate(async () => { const d = window.hak.loadSync().db; d.dmLaoDong.push({ngayCapNhat: '01/11/2026', cccd: '049085000009', ten: 'NGƯỜI MỚI', diaChi: 'Huế'}); return window.hak.save(d); });
  ok('lưu sau nâng cấp: thêm một dòng danh mục', r && r.ok, JSON.stringify(r));
  ok('không có lỗi JavaScript', w.errs.length === 0, w.errs.join('|'));
  await app.close();

  // 3. SQLite sau nâng cấp
  const kq = doc(s => ({
    ver: s.db.pragma('user_version', {simple: true}),
    meta: s.db.prepare("SELECT key FROM meta WHERE key IN ('dmLaoDong','dmXeVC','dmDoiTac','dmDonViVC')").all().map(x => x.key),
    dm: s.db.prepare('SELECT kind, COUNT(*) n FROM danh_muc GROUP BY kind ORDER BY kind').all().map(x => x.kind + ':' + x.n).join(),
    goi: s.db.prepare('SELECT forest_id, phien_ban FROM chot_goi').all().map(x => x.forest_id + ':' + x.phien_ban).join(),
    loCoGoi: s.db.prepare("SELECT COUNT(*) n FROM forests WHERE data LIKE '%\"goi\":%'").get().n,
    data: s.db.prepare('SELECT id, hash FROM forests ORDER BY id').all(), dmRows: s.db.prepare('SELECT kind, ord, hash FROM danh_muc ORDER BY kind, ord').all()
  }));
  ok('SQLite ở v14', kq.ver === 14, 'v' + kq.ver);
  ok('v13: danh mục không còn ở meta, ở bảng danh_muc theo dòng (đã có dòng thêm sau nâng cấp)', kq.meta.length === 0 && kq.dm === 'dmDoiTac:1,dmLaoDong:3,dmXeVC:1', JSON.stringify(kq));
  ok('v14: gói ở bảng chot_goi, không lô nào còn gói trong JSON', kq.goi === 'fa:1' && kq.loCoGoi === 0, JSON.stringify(kq));

  // 4. mở lại lần hai: không nâng cấp lại, không đổi dữ liệu
  ({app, w} = await launch()); await app.close();
  const bk2 = fs.readdirSync(bkDir).filter(n => /^truoc-nang-cap/.test(n));
  const kq2 = doc(s => ({data: s.db.prepare('SELECT id, hash FROM forests ORDER BY id').all(), dmRows: s.db.prepare('SELECT kind, ord, hash FROM danh_muc ORDER BY kind, ord').all()}));
  ok('mở lại lần hai: không sao lưu nâng cấp lần nữa, dữ liệu lô và danh mục giữ nguyên', bk2.length === 1 && JSON.stringify(kq2.data) === JSON.stringify(kq.data) && JSON.stringify(kq2.dmRows) === JSON.stringify(kq.dmRows), JSON.stringify(bk2));
  console.log(fail ? 'CÓ ' + fail + ' LỖI' : 'TẤT CẢ ĐẠT'); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
