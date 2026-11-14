'use strict';
/* Bảng “Quy trình hồ sơ theo đợt” (Electron thật): trạng thái dữ liệu từng mẫu, đánh dấu đã in lưu bền, phát hiện dữ liệu đổi sau khi in,
 * và bất biến: nhập dữ liệu đợt 2 (phiếu cân, khối lượng thực tế, ngày lập) KHÔNG làm đợt 1 thành “dữ liệu đã đổi”.
 * Chạy: xvfb-run -a node scripts/e2e-quytrinh.js */
const {_electron: electron} = require('playwright-core');
const path = require('path'), fs = require('fs'), os = require('os');
const src = fs.readFileSync(path.join(__dirname, 'e2e-inan2.js'), 'utf8');
const {nv, lot, seed, PC, EXP0, EXP1} = new Function(src.slice(src.indexOf('const nv ='), src.indexOf('const plain =')) + '; return {nv, lot, seed, PC, EXP0, EXP1};')();
const root = path.join(__dirname, '..');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hakqn-qt-'));
let fail = 0; const ok = (name, cond, extra) => { console.log((cond ? 'ĐẠT  ' : 'LỖI  ') + name + (!cond && extra ? ' — ' + extra : '')); if (!cond) fail++; };
(async () => {
  let app = await electron.launch({executablePath: require('electron'), args: [root, '--no-sandbox'], env: {...process.env, HAKQN_CLOSE: 'discard', HAKQN_DB: path.join(dir, 'q.sqlite'), HAKQN_USERDATA: path.join(dir, 'ud'), ELECTRON_DISABLE_SECURITY_WARNINGS: '1'}});
  let w = await app.firstWindow(); const errs = []; const hook = () => { w.on('pageerror', e => errs.push(e.message)); w.on('dialog', d => d.accept()); }; hook(); await w.waitForSelector('#side');
  const mk = (o = {}) => { const L = lot('fa', 'R-A', {exp: o.exp || {...EXP0}, pc: o.pc || [], kl: o.kl == null ? null : o.kl, nc: o.nc}); L.info.donGia = null; return L; };
  const open = async () => { await w.reload(); await w.waitForSelector('#side'); await w.click('[data-open=own1]'); await w.click('[data-tab=rung]'); await w.click('[data-forest=fa]'); await w.click('[data-ftab=xuat]'); await w.waitForSelector('#qtCard'); };
  const row = code => w.$eval('#qtCard tr[data-qt="' + code + '"]', r => ({ready: r.dataset.ready, printed: r.dataset.printed}));
  const rows = async () => w.$$eval('#qtCard tr[data-qt]', rs => Object.fromEntries(rs.map(r => [r.dataset.qt, r.dataset.printed + '/' + r.dataset.ready])));
  const waitSave = () => w.waitForTimeout(700);
  const route = code => w.$eval('#qtCard tr[data-qt="' + code + '"]', r => r.dataset.route);
  const routes = async () => Object.fromEntries(await Promise.all(['08', '09', '10', '14'].map(async c => [c, await route(c)])));
  const CT = {c1: {id: 'c1', ten: 'CÔNG TY TNHH DĂM AN PHÁT', diaChi: 'KCN Điện Nam, Quảng Nam', diaChiGiao: [{id: 'g1', ten: 'Nhà máy', diaChi: 'KCN Điện Nam, Quảng Nam'}]}};
  const setDb = async d => { await waitSave(); d.congTy = d.congTy && Object.keys(d.congTy).length ? d.congTy : CT; await w.evaluate(x => window.hak.save(x), d); };

  // 1. chỉ có dữ liệu đợt 1
  await setDb(seed([mk()])); await open();
  ok('bảng Quy trình có 5 bước, việc nên làm tiếp và hai đợt', (await w.$$('#qtCard .qtStep')).length === 5 && !!(await w.$('#qtNext')) && !!(await w.$('#qtDot1')) && !!(await w.$('#qtDot2')));
  const r0 = await rows();
  ok('giao khoán: đợt 1 có BM-01, BM-20, không có BM-03; đợt 2 có BM-08, 09, 10, 14', 'qt' && r0['01'] && r0['20'] && !r0['03'] && r0['08'] && r0['09'] && r0['10'] && r0['14'], JSON.stringify(Object.keys(r0)));
  ok('đợt 2 chưa có phiếu cân: BM-09 và BM-10 “chưa đủ”, BM-14 chỉ là bản nháp (thiếu ngày lập, khối lượng thực tế)', (await row('09')).ready === 'thieu' && (await row('10')).ready === 'thieu' && (await row('14')).ready === 'nhap', JSON.stringify([await row('09'), await row('14')]));
  ok('mọi mẫu chưa in', Object.values(r0).every(v => v.startsWith('chua/')));
  // 2. đánh dấu cả đợt 1 đã in
  const bulk1 = (await w.$$('#qtCard [data-act=qtMark]')).length; ok('có nút đánh dấu', bulk1 > 0);
  await w.evaluate(() => { const b = [...document.querySelectorAll('#qtCard [data-act=qtMark]')].find(x => (x.dataset.codes || '').includes(',') && /đợt 1/.test(x.textContent)); b.click(); }); await w.waitForTimeout(500);
  let r1 = await rows(); const d1 = ['01', '20', '02', '04', '05', '06', '07', '11', '12', '13', '15', '16', '17', '18', '19'];
  ok('đánh dấu cả đợt 1: mọi mẫu đợt 1 “đã in”', d1.every(c => r1[c] && r1[c].startsWith('da/')), JSON.stringify(r1));
  ok('việc nên làm tiếp: đợt 1 đã in xong, chờ khai thác và cân', /Đợt 1 đã in xong/.test(await w.innerText('#qtNext')), await w.innerText('#qtNext'));
  await waitSave(); await app.close(); app = await electron.launch({executablePath: require('electron'), args: [root, '--no-sandbox'], env: {...process.env, HAKQN_CLOSE: 'discard', HAKQN_DB: path.join(dir, 'q.sqlite'), HAKQN_USERDATA: path.join(dir, 'ud'), ELECTRON_DISABLE_SECURITY_WARNINGS: '1'}}); w = await app.firstWindow(); hook(); await w.waitForSelector('#side');
  await open(); r1 = await rows(); ok('đóng và mở lại ứng dụng: trạng thái “đã in” vẫn còn', d1.every(c => r1[c].startsWith('da/')));
  // 2b. IN ĐÈ trong quy trình: hướng in đợt 2 của từng mẫu, in nền → xác nhận → chờ dữ liệu
  let rt = await routes(); ok('đợt 2 chưa có phiếu cân: cột “Hướng in đợt 2” của cả bốn mẫu là “in mẫu nền trước”', Object.values(rt).every(v => v === 'nen'), JSON.stringify(rt));
  ok('việc nên làm tiếp: gợi ý in sẵn mẫu nền đợt 2 và nhớ xác nhận', /in sẵn mẫu nền đợt 2/.test(await w.innerText('#qtNext')) && /Xác nhận đã in mẫu nền/.test(await w.innerText('#qtNext')), await w.innerText('#qtNext'));
  ok('bước 4 ghi rõ “giấy trắng hoặc nền + in đè”', /giấy trắng hoặc nền \+ in đè/.test(await w.innerText('#qtCard .qtSteps')));
  await w.click('#d2Card button[data-act=d2confirm][data-keys*="|"]'); await w.waitForTimeout(600); rt = await routes();
  ok('sau khi xác nhận đã in nền: hướng in chuyển sang “nền đã in, chờ dữ liệu”', Object.values(rt).every(v => v === 'cho'), JSON.stringify(rt));
  ok('việc nên làm tiếp: đã in nền, chờ khai thác và cân, sẽ in đè', /Đã in nền \d+ mục/.test(await w.innerText('#qtNext')) && /in đè/.test(await w.innerText('#qtNext')), await w.innerText('#qtNext'));
  // 3. dữ liệu ĐỢT 2 thay đổi: đợt 1 vẫn khớp (bất biến)
  const cur = JSON.parse(JSON.stringify(await w.evaluate(() => window.hak.loadSync().db))); const f = cur.rs.own1.forests.fa;
  f.pc = PC; f.info.khoiLuong = 29.75; f.exp = {...f.exp, ...EXP1};
  await setDb(cur); await open(); r1 = await rows();
  ok('BẤT BIẾN trên màn hình: nhập phiếu cân, khối lượng thực tế, ngày lập → mọi mẫu đợt 1 VẪN “đã in, còn khớp”', d1.every(c => r1[c].startsWith('da/')), JSON.stringify(r1));
  rt = await routes(); ok('có đủ dữ liệu sau khi đã in nền: hướng in của cả bốn mẫu là “nền đã in, đủ dữ liệu: in đè”', Object.values(rt).every(v => v === 'de'), JSON.stringify(rt));
  ok('việc nên làm tiếp: “In đè đợt 2: nạp lại tờ mẫu nền đã in”', /In đè đợt 2: nạp lại tờ mẫu nền đã in/.test(await w.innerText('#qtNext')), await w.innerText('#qtNext'));
  ok('đợt 2 nay đủ dữ liệu (BM-08, 09, 10, 14 “du”) và chưa in', ['08', '09', '10', '14'].every(c => r1[c] === 'chua/du'), JSON.stringify(r1));
  // 4. dữ liệu ĐỢT 1 đổi: chỉ các mẫu liên quan hiện “dữ liệu đã đổi”
  const cur2 = JSON.parse(JSON.stringify(await w.evaluate(() => window.hak.loadSync().db))); cur2.rs.own1.forests.fa.nc.push({...nv(4, 'Công nhân', 'NGÔ THÊM MỚI', 'Công nhân cưa', '049085000004'), maRung: 'R-A'});
  await setDb(cur2); await open(); r1 = await rows();
  const doi = Object.keys(r1).filter(c => r1[c].startsWith('doi/')), giu = ['04', '19'].filter(c => !r1[c].startsWith('da/'));
  ok('thêm một người lao động: các mẫu có danh sách nhân công (BM-02, 05, 06, 07, 01…) hiện “dữ liệu đã đổi”', ['02', '05', '06'].every(c => doi.includes(c)), JSON.stringify(r1));
  ok('mẫu không phụ thuộc nhân công (BM-04 hợp đồng vận chuyển) vẫn “đã in, còn khớp”', r1['04'].startsWith('da/'), JSON.stringify(r1['04']));
  ok('việc nên làm tiếp: nêu mẫu đợt 1 đã đổi cần in lại', /đã in nhưng dữ liệu đã đổi/.test(await w.innerText('#qtNext')), await w.innerText('#qtNext'));
  // in lại → khớp
  await w.evaluate(() => { const b = [...document.querySelectorAll('#qtCard [data-act=qtMark]')].find(x => (x.dataset.codes || '').includes(',') && /đợt 1/.test(x.textContent)); b.click(); }); await w.waitForTimeout(500);
  rt = await routes(); ok('thêm người lao động sau khi in nền: BM-08 và BM-14 (có bảng theo người lao động) báo “bố cục đã đổi”, không in đè; BM-09, BM-10 (vận chuyển) vẫn in đè được', rt['08'] === 'doibocuc' && rt['14'] === 'doibocuc' && rt['09'] === 'de' && rt['10'] === 'de', JSON.stringify(rt));
  ok('việc nên làm tiếp nêu mục đã đổi bố cục: in lại nền hoặc giấy trắng', /đổi bố cục/.test(await w.innerText('#qtNext')) || /đã in nhưng dữ liệu đã đổi/.test(await w.innerText('#qtNext')));
  r1 = await rows(); ok('in lại và đánh dấu: các mẫu đã đổi trở về “đã in, còn khớp”', d1.every(c => r1[c].startsWith('da/')), JSON.stringify(r1));
  // 5. đợt 2 xong → hoàn tất; bỏ xác nhận
  await w.evaluate(() => { const b = [...document.querySelectorAll('#qtCard [data-act=qtMark]')].find(x => (x.dataset.codes || '').includes(',') && /đợt 2/.test(x.textContent)); b.click(); }); await w.waitForTimeout(500);
  ok('đánh dấu cả đợt 2: việc tiếp theo “Hồ sơ đã in xong cả hai đợt”', /Hồ sơ đã in xong cả hai đợt/.test(await w.innerText('#qtNext')), await w.innerText('#qtNext'));
  await w.click('#qtCard tr[data-qt="14"] [data-act=qtUnmark]'); await w.waitForTimeout(400); ok('bỏ xác nhận BM-14: về “chưa in”', (await row('14')).printed === 'chua');
  ok('không có lỗi JavaScript', errs.length === 0, errs.join('|'));
  await app.close(); console.log(fail ? 'CÓ ' + fail + ' LỖI' : 'TẤT CẢ ĐẠT'); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
