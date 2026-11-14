'use strict';
/* Nâng cấp từ v1.0.0 (Electron thật): mở một BẢN SAO cơ sở dữ liệu do chính mã v1.0.0 tạo (tests/fixtures/hakqn_v1_0_0.sqlite: một chủ ba lô,
 * điểm đến nhập tay, cước cố định / theo bậc cự ly / tấn-km, phiếu cũ ngày 31/02/2026 và 29/02/2028, bản tra cứu 3 tab) bằng bản mới, khi KHÔNG có mạng.
 * Kiểm: sao lưu tự động trước khi nâng cấp, dữ liệu cũ còn đủ, địa chỉ nhập tay cũ còn hiển thị và chỉ đổi sau khi xác nhận, tra cứu offline còn nguyên.
 * Dữ liệu hoàn toàn giả lập. Chạy: xvfb-run -a node scripts/e2e-nangcap.js */
const {_electron: electron} = require('playwright-core');
const path = require('path'), fs = require('fs'), os = require('os');
const root = path.join(__dirname, '..');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hakqn-up-')), dbFile = path.join(dir, 'hakqn.sqlite');
fs.copyFileSync(path.join(root, 'tests', 'fixtures', 'hakqn_v1_0_0.sqlite'), dbFile);           // chỉ dùng bản sao
let fail = 0; const ok = (name, cond, extra) => { console.log((cond ? 'ĐẠT  ' : 'LỖI  ') + name + (!cond && extra ? ' — ' + extra : '')); if (!cond) fail++; };
const launch = async () => { const app = await electron.launch({executablePath: require('electron'), args: [root, '--no-sandbox', '--proxy-server=http://127.0.0.1:9'], env: {...process.env, HAKQN_CLOSE: 'discard', HAKQN_DB: dbFile, HAKQN_USERDATA: path.join(dir, 'ud'), ELECTRON_DISABLE_SECURITY_WARNINGS: '1'}});
  const w = await app.firstWindow(); w.errs = []; w.on('pageerror', e => w.errs.push(e.message)); w.on('dialog', d => d.accept()); await w.waitForSelector('#side'); return {app, w}; };
const dbOf = w => w.evaluate(() => window.hak.loadSync().db);
const openForest = async (w, fid, ftab) => { await w.click('[data-open=own1]'); await w.click('[data-tab=rung]'); await w.click(`[data-forest=${fid}]`); await w.click(`[data-ftab=${ftab}]`); };

(async () => {
  let {app, w} = await launch();
  const info = await w.evaluate(() => { const r = window.hak.loadSync(); return {schema: r.schema, version: r.version}; });
  const bk = path.join(dir, 'backups'), backups = fs.existsSync(bk) ? fs.readdirSync(bk) : [];
  ok('nâng cấp cấu trúc có sao lưu tự động trước khi đổi', backups.some(f => /^truoc-nang-cap-v2-len-v\d+-.*\.sqlite$/.test(f)), JSON.stringify(backups));
  ok('phiên bản ứng dụng mới', /^1\.[2-9]/.test(info.version), info.version);
  let db = await dbOf(w); const o = db.rs.own1, F = o.forests;
  ok('một chủ ba lô còn đủ', Object.keys(db.rs).length === 1 && o.info.ten === 'CHỦ RỪNG CŨ' && Object.keys(F).length === 3);
  ok('số bản ghi cũ còn đủ (xe 2+2+2, phiếu 2+1+3)', ['f1', 'f2', 'f3'].map(k => F[k].dx.length).join() === '2,2,2' && ['f1', 'f2', 'f3'].map(k => F[k].pc.length).join() === '2,1,3');
  ok('điểm đến nhập tay cũ còn nguyên, chưa có bản chụp công ty', F.f1.exp.vcDiemDen === 'Nhà máy dăm Quảng Nam, KCN Điện Nam – Điện Ngọc' && !F.f1.info.muaHang && F.f2.exp.vcDiemDen === 'Cảng dăm Kỳ Hà');
  ok('dữ liệu bậc cự ly cũ giữ nguyên', F.f2.info.vanChuyen.mode === 'tanDoan' && F.f2.info.vanChuyen.bac.length === 2);
  const lk = await w.evaluate(() => window.hak.lookup.status()); ok('bản tra cứu ba tab lưu offline còn nguyên sau nâng cấp', lk.ok && (lk.counts ? Object.values(lk.counts).every(n => n > 0) : JSON.stringify(lk).length > 20), JSON.stringify(lk).slice(0, 300));

  // địa chỉ cũ còn hiển thị; chỉ đổi sau khi xác nhận
  await openForest(w, 'f1', 'dx'); let main = await w.innerText('#main');
  ok('lô R-CU1: địa chỉ nhập tay cũ còn hiển thị, báo chưa chọn địa chỉ công ty', /Nhà máy dăm Quảng Nam, KCN Điện Nam – Điện Ngọc/.test(main) && /nhập tay/.test(main), main.slice(main.indexOf('Địa chỉ giao hàng'), main.indexOf('Địa chỉ giao hàng') + 400));
  await w.click('#navSet'); await w.click('#setTab_cty'); await w.waitForSelector('#ctyForm');
  await w.fill('#ctyForm [name=ten]', 'CÔNG TY TNHH DĂM AN PHÁT'); await w.fill('#ctyForm [name=diaChi]', 'KCN Điện Nam – Điện Ngọc, Điện Bàn, Quảng Nam'); await w.click('#ctyForm button[type=submit]'); await w.waitForTimeout(700);
  await openForest(w, 'f1', 'dx'); await w.click('[data-act=mhOpen]'); main = await w.innerText('#main');
  ok('chọn địa chỉ giao: hiện giá trị nhập tay cũ cạnh địa chỉ đề xuất', /Giá trị nhập tay cũ/.test(main) && /Nhà máy dăm Quảng Nam/.test(main) && /KCN Điện Nam – Điện Ngọc, Điện Bàn/.test(main));
  ok('chưa xác nhận: dữ liệu lô chưa đổi', !(await dbOf(w)).rs.own1.forests.f1.info.muaHang);
  await w.click('[data-act=mhCancel]'); ok('hủy: vẫn giữ địa chỉ nhập tay cũ', !(await dbOf(w)).rs.own1.forests.f1.info.muaHang && /Nhà máy dăm Quảng Nam/.test(await w.innerText('#main')));
  await w.click('[data-act=mhOpen]'); await w.click('[data-act=mhConfirm]'); await w.waitForTimeout(600);
  db = await dbOf(w); ok('sau khi xác nhận: lô R-CU1 lưu địa chỉ công ty; giá trị nhập tay cũ vẫn được giữ trong dữ liệu', db.rs.own1.forests.f1.info.muaHang.diaChi.startsWith('KCN Điện Nam') && db.rs.own1.forests.f1.exp.vcDiemDen === 'Nhà máy dăm Quảng Nam, KCN Điện Nam – Điện Ngọc');
  ok('lô R-CU2 không bị ảnh hưởng', !db.rs.own1.forests.f2.info.muaHang && db.rs.own1.forests.f2.exp.vcDiemDen === 'Cảng dăm Kỳ Hà');

  // lô cước theo bậc và phiếu sai ngày
  await openForest(w, 'f2', 'kt'); main = await w.innerText('#main');
  ok('lô R-CU2 (cước theo bậc): kiểm tra nêu phải chọn lại cước, dữ liệu bậc không mất', /Cước theo bậc cự ly \(hồ sơ cũ\)/.test(main) && (await dbOf(w)).rs.own1.forests.f2.info.vanChuyen.bac.length === 2);
  await openForest(w, 'f3', 'kt'); main = await w.innerText('#main');
  ok('lô R-CU3: phiếu 31/02/2026 được giữ, nêu số phiếu và lý do; 29/02/2028 không bị báo lỗi ngày', /PC-C1/.test(main) && /không có thật/.test(main) && !/Phiếu PC-C2: /.test(main), main.slice(0, 500));
  ok('không lỗi script giao diện', w.errs.length === 0, w.errs.join('|'));
  await app.close();
  // mở lại: dữ liệu mới lưu ổn định, không sao lưu nâng cấp lần hai
  ({app, w} = await launch()); db = await dbOf(w);
  ok('đóng/mở lại: địa chỉ đã xác nhận còn, dữ liệu cũ còn', db.rs.own1.forests.f1.info.muaHang && db.rs.own1.forests.f3.pc.length === 3);
  ok('mở lại không tạo thêm bản sao lưu nâng cấp', fs.readdirSync(bk).filter(f => f.startsWith('truoc-nang-cap')).length === backups.filter(f => f.startsWith('truoc-nang-cap')).length);
  await app.close();
  console.log(fail ? '\n' + fail + ' LỖI' : '\nĐẠT HẾT'); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
