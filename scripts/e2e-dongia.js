'use strict';
/* Đơn giá khoán chủ rừng → Tổ trưởng chỉ nhập MỘT chỗ (tab Nhân công), không nhập ở Thông tin rừng.
 * Kiểm tra (Electron thật, dữ liệu giả lập): bỏ ô khỏi Thông tin rừng, lưu rừng không bị chặn, checklist nhắc đúng chỗ nhập,
 * ô ở tab Nhân công ẩn/hiện đúng theo mô hình ký và hình thức lương, lưu và nhớ sau khi mở lại, hồ sơ cũ (chỉ có đơn giá ở rừng) không mất. */
const {_electron: electron} = require('playwright-core');
const path = require('path'), fs = require('fs'), os = require('os');
const root = path.join(__dirname, '..');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hakqn-dg-'));
let fail = 0; const ok = (name, cond, extra) => { console.log((cond ? 'ĐẠT  ' : 'LỖI  ') + name + (!cond && extra ? ' — ' + extra : '')); if (!cond) fail++; };
const OWNER = {ma: 'CR-001', ten: 'NGUYỄN PHƯỚC TÁM', ngaySinh: '06/10/1967', cccd: '049067005459', ngayCap: '15/08/2021', noiCap: 'CA', diaChi: 'Đà Nẵng'};

(async () => {
  const launch = db => electron.launch({executablePath: require('electron'), args: [root, '--no-sandbox'], env: {...process.env, HAKQN_DB: db, ELECTRON_DISABLE_SECURITY_WARNINGS: '1'}});
  let app = await launch(path.join(dir, 'a.sqlite')), w = await app.firstWindow(); const errs = []; w.on('pageerror', e => errs.push(e.message)); w.on('dialog', d => d.accept());
  await w.waitForSelector('#side');
  await w.click('text=+ Chủ rừng mới');
  for (const [k, v] of Object.entries(OWNER)) await w.fill(`#infoForm [name="${k}"]`, v);
  await w.selectOption('#infoForm [name="danhXung"]', 'Ông'); await w.click('#infoForm button[type=submit]');
  await w.click('[data-tab=rung]'); await w.click('text=+ Rừng mới');
  const chk = () => w.innerText('.chk');

  ok('Thông tin rừng không còn ô “Đơn giá khoán”', (await w.$$('#forestForm [name=donGia]')).length === 0 && !/Đơn giá khoán/.test(await w.innerText('#forestForm')));
  await w.fill('#forestForm [name=diaDiem]', 'Thôn Hòa Phú'); await w.click('#forestForm button[type=submit]'); await w.waitForTimeout(200);
  ok('lưu thông tin rừng không bị chặn vì thiếu đơn giá', !/Chưa lưu/.test(await w.innerText('#main')) && /Đã lưu thông tin rừng/.test(await w.innerText('#main')));
  ok('checklist nhắc nhập đơn giá khoán ở tab Nhân công (giao khoán, chưa nhập)', /Đơn giá khoán chủ rừng giao cho Tổ trưởng.*tab Nhân công/.test(await chk()), (await chk()).slice(0, 300));

  await w.click('[data-ftab=nc]');
  const form = '#luongForm';
  ok('tab Nhân công có đúng một ô đơn giá Tổ trưởng, không lặp ở nhóm đ/tấn', (await w.$$(form + ' [name=ttTan]')).length === 1 && (await w.$$(form + ' [name=dt_0]')).length === 0 && (await w.$$(form + ' [name=dt_1]')).length === 1);
  ok('giao khoán: ô hiện, nhãn nói rõ là đơn giá khoán chủ rừng giao cho Tổ trưởng', await w.isVisible(form + ' [name=ttTan]') && /giao cho Tổ trưởng/.test(await w.innerText(form + ' [data-ttlabel]')));
  await w.fill(form + ' [name=ttTan]', '340000'); await w.click(form + ' button[type=submit]'); await w.waitForTimeout(200);
  await w.click('[data-ftab=finfo]');
  ok('nhập ở tab Nhân công thì checklist không còn báo thiếu đơn giá khoán', !/Đơn giá khoán/.test(await chk()), (await chk()).slice(0, 300));
  const saved = await w.evaluate(() => window.hak.loadSync().db);
  const info = Object.values(Object.values(saved.rs)[0].forests)[0].info;
  ok('lưu vào SQLite: giá Tổ trưởng 340.000 và bản sao donGia khớp (hồ sơ/bản cũ vẫn đọc đúng)', info.donGiaTan['Tổ trưởng'] === 340000 && info.donGia === 340000, JSON.stringify([info.donGiaTan, info.donGia]));

  // Ẩn/hiện theo mô hình ký và hình thức lương
  await w.click('[data-ftab=nc]');
  await w.selectOption(form + ' [name=moHinhKy]', 'tructiep');
  ok('chủ rừng ký trực tiếp + khoán tấn: ô vẫn hiện, nhãn đổi thành đơn giá Tổ trưởng', await w.isVisible(form + ' [name=ttTan]') && /ký hợp đồng lao động trực tiếp/.test(await w.innerText(form + ' [data-ttlabel]')));
  await w.selectOption(form + ' [name=hinhThucLuong]', 'ngaycong');
  ok('chủ rừng ký trực tiếp + theo ngày công: ô đơn giá đ/tấn của Tổ trưởng ẩn (dùng đơn giá ngày công)', !(await w.isVisible(form + ' [name=ttTan]')) && await w.isVisible(form + ' [name=dn_0]'));
  await w.selectOption(form + ' [name=moHinhKy]', 'giaokhoan');
  ok('giao khoán + theo ngày công: ô đơn giá khoán Tổ trưởng vẫn hiện (hợp đồng giao khoán luôn tính đ/tấn)', await w.isVisible(form + ' [name=ttTan]'));
  await w.selectOption(form + ' [name=hinhThucLuong]', 'sanluong'); await w.click(form + ' button[type=submit]'); await w.waitForTimeout(200);
  ok('không có lỗi JavaScript', errs.length === 0, errs.join('; '));
  await app.close();

  // Mở lại: nhớ giá; và hồ sơ CŨ (chỉ có đơn giá ở Thông tin rừng) vẫn hợp lệ, không mất
  app = await launch(path.join(dir, 'a.sqlite')); w = await app.firstWindow(); w.on('pageerror', e => errs.push(e.message)); await w.waitForSelector('#side');
  await w.click('[data-open]'); await w.click('[data-sforest] >> nth=0'); await w.click('[data-ftab=nc]');
  ok('mở lại: ô Tổ trưởng còn 340.000', await w.inputValue(form + ' [name=ttTan]') === '340000');
  const legacy = {v: 2, rs: {old: {id: 'old', info: {...OWNER, danhXung: 'Ông'}, nc: [], dx: [], exp: {}, forests: {fo: {id: 'fo', info: {maRung: 'R-OLD', tenRung: 'Rừng cũ', diaDiem: 'Thôn Cũ', lat: null, lng: null, dienTich: 2, dinhMucTanHa: 10, cuLy: null, tuNgay: '', denNgay: '', donGia: 300000, giayTo: []}, nc: [], dx: [], pc: [], exp: {}}}}}};
  await w.evaluate(db => window.hak.save(db), legacy); await w.reload(); await w.waitForSelector('#side');
  await w.click('[data-open]'); await w.click('[data-sforest] >> nth=0');
  ok('hồ sơ cũ (đơn giá chỉ có ở Thông tin rừng): checklist không báo thiếu đơn giá', !/Đơn giá khoán/.test(await chk()), (await chk()).slice(0, 300));
  await w.click('[data-ftab=nc]');
  ok('hồ sơ cũ: ô Tổ trưởng tự điền 300.000 từ giá cũ, không mất dữ liệu', await w.inputValue(form + ' [name=ttTan]') === '300000');
  ok('không có lỗi JavaScript sau khi mở lại', errs.length === 0, errs.join('; '));
  await app.close();
  console.log(fail ? 'CÓ ' + fail + ' LỖI' : 'TẤT CẢ ĐẠT'); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
