'use strict';
/* Kiểm thử đầu-cuối bằng Electron thật (cần màn hình ảo trên Linux: xvfb-run node scripts/e2e.js) */
const {_electron: electron} = require('playwright');
const path = require('path'), fs = require('fs'), os = require('os');
const root = path.join(__dirname, '..');
const FIX = process.env.FIXTURES || path.join(root, 'tests', 'fixtures');
const dbFile = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'hakqn-e2e-')), 'e2e.sqlite');
let fail = 0; const ok = (name, cond) => { console.log((cond ? 'ĐẠT  ' : 'LỖI  ') + name); if (!cond) fail++; };
const launch = () => electron.launch({executablePath: require('electron'), args: [root, '--no-sandbox'], env: {...process.env, HAKQN_DB: dbFile, ELECTRON_DISABLE_SECURITY_WARNINGS: '1'}});

(async () => {
  let app = await launch(), win = await app.firstWindow(); const errs = []; win.on('pageerror', e => errs.push(e.message)); win.on('dialog', d => d.accept());
  await win.waitForSelector('#side');
  ok('cửa sổ có tiêu đề HAKQN', (await win.title()).includes('HAKQN') || (await app.evaluate(({BrowserWindow}) => BrowserWindow.getAllWindows()[0].getTitle())).includes('HAKQN'));
  ok('thanh trạng thái hiển thị SQLite', (await win.innerText('#saveSt')).includes('SQLite'));
  // Tạo chủ rừng + 2 rừng
  await win.click('text=+ Chủ rừng mới');
  const owner = {ma: 'CR-001', ten: 'NGUYỄN PHƯỚC TÁM', ngaySinh: '06/10/1967', cccd: '049067005459', ngayCap: '15/08/2021', noiCap: 'CA', diaChi: 'Đà Nẵng'};
  for (const [k, v] of Object.entries(owner)) await win.fill(`#infoForm [name="${k}"]`, v);
  await win.selectOption('#infoForm [name="danhXung"]', 'Ông'); await win.click('#infoForm button[type=submit]');
  for (const dia of ['Thôn Hòa Phú', 'Thôn Phước Xuân']) {
    await win.click('[data-tab=rung]'); await win.click('text=+ Rừng mới');
    await win.fill('#forestForm [name=diaDiem]', dia); await win.fill('#forestForm [name=donGia]', '340000'); await win.click('#forestForm button[type=submit]');
  }
  ok('thanh ngữ cảnh hiện chủ rừng', (await win.innerText('#ctxOwner')).includes('NGUYỄN PHƯỚC TÁM'));
  ok('thanh ngữ cảnh hiện mã rừng đang mở', /CR-001-R2/.test(await win.innerText('#ctxForest')));
  if (fs.existsSync(path.join(FIX, 'test_nhancong.xlsx'))) {
    await win.click('[data-ftab=nc]'); await win.setInputFiles('input[data-file="nc"]', path.join(FIX, 'test_nhancong.xlsx')); await win.waitForTimeout(600);
  }
  await win.waitForFunction(() => document.getElementById('saveSt').textContent.includes('Đã lưu'), null, {timeout: 5000}).catch(() => {});
  ok('trạng thái lưu: Đã lưu', (await win.innerText('#saveSt')).includes('Đã lưu'));
  await app.close();

  // Mở lại: hồ sơ phải còn đủ từng rừng
  app = await launch(); win = await app.firstWindow(); win.on('pageerror', e => errs.push(e.message)); await win.waitForSelector('#side');
  ok('mở lại thấy chủ rừng', (await win.innerText('#side')).includes('NGUYỄN PHƯỚC TÁM') && (await win.innerText('#side')).includes('2 rừng'));
  await win.click('[data-open]'); await win.click('[data-tab=rung]');
  const items = await win.$$eval('[data-forest]', els => els.map(e => e.innerText));
  ok('mở lại thấy 2 rừng riêng', items.length === 2 && items[0].includes('Thôn Hòa Phú') && items[1].includes('Thôn Phước Xuân'));
  if (fs.existsSync(path.join(FIX, 'test_nhancong.xlsx'))) ok('nhân công chỉ nằm ở rừng được nạp', /4 người/.test(items[1]) && /0 người/.test(items[0]) || /4 người/.test(items[0]) && /0 người/.test(items[1]));

  // Nhập bản sao lưu JSON cũ (v1) qua hộp thoại xem trước
  const v1 = {rs: {old1: {id: 'old1', info: {ma: 'CR-OLD', ten: 'TRẦN CŨ', cccd: '049000000009', danhXung: 'Ông', ngaySinh: '', ngayCap: '', noiCap: '', diaChi: '', diaDiem: 'X', tuNgay: '', denNgay: '', donGia: 1},
    nc: [{ten: 'A', maRung: 'x'}], dx: [], exp: {}}}};
  const jf = path.join(path.dirname(dbFile), 'v1.json'); fs.writeFileSync(jf, JSON.stringify(v1));
  await win.setInputFiles('input[data-file="restore"]', jf);
  await win.waitForSelector('#impBox.on');
  const txt = await win.innerText('#impBody');
  ok('xem trước nhập hiển thị số liệu', /Chủ rừng/.test(txt) && /Phiếu cân/.test(txt));
  await win.click('[data-act=impGo]'); await win.waitForTimeout(800);
  ok('nhập v1 thêm chủ rừng cũ, giữ chủ rừng hiện có', (await win.innerText('#side')).includes('TRẦN CŨ') && (await win.innerText('#side')).includes('NGUYỄN PHƯỚC TÁM'));
  ok('sao lưu tự động trước khi nhập', fs.existsSync(path.join(path.dirname(dbFile), 'backups')) && fs.readdirSync(path.join(path.dirname(dbFile), 'backups')).some(n => n.startsWith('truoc-khoi-phuc')));
  ok('không có lỗi JavaScript', errs.length === 0);
  if (errs.length) console.log(errs);
  await app.close();
  console.log(fail ? 'CÓ ' + fail + ' LỖI' : 'TẤT CẢ ĐẠT'); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
