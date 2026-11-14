'use strict';
/* Màn hình Tổng quan (Electron thật): chỉ số sản lượng, cảnh báo gom theo rừng (bấm mở đúng rừng), sản lượng theo tháng, tình trạng hệ thống.
 * Chạy: xvfb-run -a node scripts/e2e-tongquan.js */
const {_electron: electron} = require('playwright-core');
const path = require('path'), fs = require('fs'), os = require('os');
const {build} = require('../tests/fixtures/make-lookup');
const src = fs.readFileSync(path.join(__dirname, 'e2e-inan2.js'), 'utf8');
const {nv, xe, lot, seed, PC} = new Function(src.slice(src.indexOf('const nv ='), src.indexOf('const plain =')) + '; return {nv, xe, lot, seed, PC};')();
const root = path.join(__dirname, '..');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hakqn-tq-'));
let fail = 0; const ok = (name, cond, extra) => { console.log((cond ? 'ĐẠT  ' : 'LỖI  ') + name + (!cond && extra ? ' — ' + extra : '')); if (!cond) fail++; };
const pad = n => (n < 10 ? '0' : '') + n;
const daysFromNow = n => { const d = new Date(Date.now() + n * 864e5); return pad(d.getDate()) + '/' + pad(d.getMonth() + 1) + '/' + d.getFullYear(); };
const thisMonth = day => { const d = new Date(); return pad(day) + '/' + pad(d.getMonth() + 1) + '/' + d.getFullYear(); };
(async () => {
  const app = await electron.launch({executablePath: require('electron'), args: [root, '--no-sandbox'], env: {...process.env, HAKQN_CLOSE: 'discard', HAKQN_DB: path.join(dir, 't.sqlite'), HAKQN_USERDATA: path.join(dir, 'ud'), HAKQN_SHEET_URL: 'http://127.0.0.1:9/none.xlsx', ELECTRON_DISABLE_SECURITY_WARNINGS: '1'}});
  const w = await app.firstWindow(); const errs = []; w.on('pageerror', e => errs.push(e.message)); w.on('dialog', d => d.accept()); await w.waitForSelector('#side');
  // rừng A: đủ phiếu cân trong tháng này, xe có giấy tờ sắp hết hạn, có lao động dưới 18 tuổi; rừng B: chưa có phiếu cân, chưa có tọa độ
  const A = lot('fa', 'R-A', {exp: {}, pc: PC.map((p, i) => ({...p, ngay: thisMonth(5 + i)})), kl: 30});
  A.dx[0].hanBH = daysFromNow(10); A.nc[1].ngaySinh = '01/06/2012';
  const B = lot('fb', 'R-B', {exp: {}, pc: [], dx: [{...xe('92C-55555', '049000000099', 'TRẦN CHỦ XE B'), maRung: 'R-B'}]}); B.info.lat = null; B.info.lng = null;
  await w.evaluate(d => window.hak.save(d), seed([A, B])); await w.reload(); await w.waitForSelector('#side');
  await w.click('#navHome').catch(() => {}); await w.waitForSelector('#homeSys'); await w.waitForTimeout(700);
  const kpi = await w.$$eval('.kpi > div', d => d.map(x => x.innerText.replace(/\s+/g, ' ').trim()));
  ok('chỉ số: có sản lượng dự kiến, đã cân so với dự kiến, lao động, số xe cùng các chỉ số cũ', ['Chủ rừng', 'Số rừng', 'Tổng diện tích', 'Sản lượng dự kiến', 'Khối lượng đã cân', 'Đã cân so với dự kiến', 'Số chuyến', 'Lao động', 'Số xe', 'Tiến độ hồ sơ'].every(l => kpi.some(k => k.includes(l))), JSON.stringify(kpi));
  ok('chỉ số: 2 rừng, 6 lao động (3 + 3), 3 xe (2 + 1), 3 chuyến', /^1 Chủ rừng/.test(kpi[0]) && /^2 Số rừng/.test(kpi[1]) && kpi.some(k => /^6 Lao động/.test(k)) && kpi.some(k => /^3 Số xe/.test(k)) && kpi.some(k => /^3 Số chuyến/.test(k)), JSON.stringify(kpi));
  const al = await w.innerText('#main');
  ok('cảnh báo: có lao động dưới 18 tuổi ở R-A; xe sắp hết hạn giấy tờ ở R-A; R-B chưa có tọa độ và chưa có phiếu cân', /Rừng có lao động dưới 18 tuổi/.test(al) && /Rừng có xe hết hạn hoặc sắp hết hạn giấy tờ/.test(al) && /Rừng chưa có tọa độ/.test(al) && /Rừng chưa có phiếu cân/.test(al), al.slice(0, 900));
  ok('cảnh báo ghi tên rừng bị ảnh hưởng', (await w.$$eval('.alr .lnk', b => b.map(x => x.textContent))).some(t => /R-B/.test(t)) && (await w.$$eval('.alr .lnk', b => b.map(x => x.textContent))).some(t => /R-A/.test(t)));
  ok('biểu đồ theo tháng: có 6 cột; tháng này có khối lượng', (await w.$$eval('.mb', m => m.length)) === 6 && (await w.$$eval('.mb', m => m[5].innerText)).match(/\d/) !== null && !/Chưa có phiếu cân trong 6 tháng/.test(al));
  ok('hệ thống: chưa có bản tra cứu thì nói rõ; hiện tình trạng sao lưu; có lối tắt Tra cứu, Cài đặt', /Chưa có bản tra cứu/.test(await w.innerText('#homeSys')) && /sao lưu/i.test(await w.innerText('#homeSys')) && !!(await w.$('#homeSys [data-act=lkOpen]')) && !!(await w.$('#homeSys [data-act=openSettings]')) && (await w.isDisabled('#homeSys [data-act=rpDoiChieu]')));
  if (process.env.SHOTS) { await w.setViewportSize({width: 1440, height: 900}); await w.waitForTimeout(300); await w.screenshot({path: path.join(process.env.SHOTS, 'tong_quan.png'), fullPage: true}); }
  // bấm tên rừng trong cảnh báo: mở đúng rừng
  await w.$$eval('.alr .lnk', b => b.find(x => /R-B/.test(x.textContent)).click()); await w.waitForTimeout(500);
  ok('bấm rừng R-B trong cảnh báo: mở hồ sơ rừng R-B', /R-B/.test(await w.innerText('#ctxForest')));
  // có bản tra cứu: hệ thống hiện thông tin bản tra cứu và nút báo cáo đối chiếu dùng được
  const f = path.join(dir, 'goc.xlsx'); fs.writeFileSync(f, build());
  ok('nạp bảng tính tra cứu giả lập', (await w.evaluate(p => window.hak.lookup.importExcel(p), f)).ok);
  await w.click('#navHome'); await w.waitForSelector('#homeSys'); await w.waitForTimeout(700);
  const sys = await w.innerText('#homeSys');
  ok('hệ thống hiện bản tra cứu đã nạp (nguồn, thời điểm, số dòng); nút Báo cáo đối chiếu dùng được', /Bản tra cứu:/.test(sys) && /20 dòng/.test(sys) && !(await w.isDisabled('#homeSys [data-act=rpDoiChieu]')), sys);
  await w.click('#homeSys [data-act=rpDoiChieu]'); await w.waitForSelector('.rpl'); await w.waitForTimeout(700);
  ok('bấm Báo cáo đối chiếu: mở thẳng mẫu Đối chiếu bản tra cứu có số liệu', /ĐỐI CHIẾU BẢN TRA CỨU/.test(await w.innerText('#rpBox')) && /049000000003/.test(await w.innerText('#rpBody')));
  ok('không có lỗi JavaScript', errs.length === 0, errs.join('|'));
  await app.close(); console.log(fail ? 'CÓ ' + fail + ' LỖI' : 'TẤT CẢ ĐẠT'); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
