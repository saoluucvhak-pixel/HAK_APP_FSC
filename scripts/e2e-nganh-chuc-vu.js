'use strict';
/* Ngành nghề và Chức vụ (PR B, Electron thật, SQLite thật; dữ liệu giả lập):
 *  - tab Danh mục “Ngành nghề và chức vụ”: gieo sẵn 2 ngành + 5 chức vụ; thêm / trùng tên / đổi tên; xóa chưa dùng mất, đang dùng → Ngừng sử dụng; mục gieo sẵn không xóa
 *  - form cá nhân: chọn chức vụ Tổ trưởng → vai trò cũ Nhân công tự bật; chọn “Khác” mà chưa chọn ngành → chặn; chọn ngành rồi lưu được; dữ liệu cũ (không chọn gì) JSON không có khóa mới
 *  - doanh nghiệp: chọn cả hai ngành, lưu vào đối tượng
 * Chạy: xvfb-run -a node scripts/e2e-nganh-chuc-vu.js */
const {_electron: electron} = require('playwright-core');
const path = require('path'), fs = require('fs'), os = require('os');
const root = path.join(__dirname, '..');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hakqn-nganh-'));
let fail = 0; const ok = (name, cond, extra) => { console.log((cond ? 'ĐẠT  ' : 'LỖI  ') + name + (!cond && extra ? ' — ' + extra : '')); if (!cond) fail++; };
(async () => {
  const app = await electron.launch({executablePath: require('electron'), args: [root, '--no-sandbox'], env: {...process.env, HAKQN_CLOSE: 'discard', HAKQN_DB: path.join(dir, 'v.sqlite'), HAKQN_USERDATA: path.join(dir, 'ud'), HAKQN_DOWNLOAD_DIR: path.join(dir, 'out')}});
  const w = require('./_hd30').boc(await app.firstWindow()); const errs = []; w.on('pageerror', e => errs.push(e.message)); w.on('dialog', d => d.accept()); await w.waitForSelector('#side');
  const db = () => w.evaluate(() => window.hak.loadSync().db);

  // 1. tab danh mục
  await w.click('#navDm'); await w.click('#setTab_setnv'); await w.waitForSelector('#nvNganh');
  const ng0 = await w.$$eval('#nvNganh [data-nvten-txt]', e => e.map(x => x.textContent.trim())), cv0 = await w.$$eval('#nvChucVu [data-nvten-txt]', e => e.map(x => x.textContent.trim()));
  ok('gieo sẵn 2 ngành: Khai thác gỗ keo, Vận chuyển', JSON.stringify(ng0) === JSON.stringify(['Khai thác gỗ keo', 'Vận chuyển']), JSON.stringify(ng0));
  ok('gieo sẵn 5 chức vụ: Chủ xe, Tổ trưởng, Công nhân, Tài xế, Khác', JSON.stringify(cv0) === JSON.stringify(['Chủ xe', 'Tổ trưởng', 'Công nhân', 'Tài xế', 'Khác']), JSON.stringify(cv0));
  await w.click('#nvThemNg'); await w.fill('#nvThemTen', 'Chế biến'); await w.click('#nvThemLuu'); await w.waitForTimeout(400);
  await w.click('#nvThemNg'); await w.fill('#nvThemTen', 'vận chuyển'); await w.click('#nvThemLuu'); await w.waitForTimeout(200);
  ok('thêm trùng tên (không phân biệt hoa/dấu) bị chặn', /Đã có ngành nghề/.test(await w.innerText('#nvThemLoi')));
  await w.keyboard.press('Escape'); await w.waitForTimeout(200); ok('Esc đóng hộp thoại Thêm ngành nghề', !(await w.$('#dmModal')));
  let d = await db(); const che = (d.dmNganh || []).find(n => n.ten === 'Chế biến');
  ok('thêm ngành mới lưu vào dữ liệu', !!che && d.dmNganh.length === 3, JSON.stringify(d.dmNganh));
  await w.click('#nvThemCv'); await w.fill('#nvThemTen', 'Thợ máy'); await w.selectOption('#nvThemNganh', che.id); await w.click('#nvThemLuu'); await w.waitForTimeout(400);
  d = await db(); const tm = d.dmChucVu.find(c => c.ten === 'Thợ máy');
  ok('thêm chức vụ kèm ngành mặc định', !!tm && tm.nganh === che.id, JSON.stringify(tm));
  await w.click('[data-act=nvXoa][data-nv="dmChucVu|' + tm.id + '"]'); await w.waitForTimeout(400);
  ok('xóa chức vụ chưa dùng: mất hẳn', !(await db()).dmChucVu.some(c => c.id === tm.id));
  ok('chức vụ gieo sẵn: xóa bị từ chối', await (async () => { await w.click('[data-act=nvXoa][data-nv="dmChucVu|cvKhac"]'); await w.waitForTimeout(300); return /gieo sẵn/.test(await w.innerText('#nvMsg')) && (await db()).dmChucVu.some(c => c.id === 'cvKhac'); })());

  // 2. form cá nhân
  await w.click('#setTab_setdt'); await w.waitForSelector('#dtBang'); await w.click('#cnThem'); await w.waitForSelector('#dtForm');
  ok('form cá nhân có hàng Chức vụ chi tiết và Ngành nghề', !!(await w.$('#cvChiTiet')) && !!(await w.$('#nganhNguoi')) && !!(await w.$('#dtForm [name=cv_cvToTruong]')));
  await w.fill('#dtForm [name=hoTen]', 'Người một giả lập'); await w.fill('#dtForm [name=cccd]', '049000000011'); await w.fill('#dtForm [name=ngayCap]', '01/01/2021'); await w.fill('#dtForm [name=noiCap]', 'Cục CS'); await w.fill('#dtForm [name=hanCccd]', '01/01/2036');
  await w.check('#dtForm [name=cv_cvKhac]'); await w.click('#dtLuu'); await w.waitForTimeout(400);
  ok('chọn “Khác” mà chưa chọn ngành: chặn lưu, báo rõ', /phải chọn ngành/.test(await w.innerText('#dtLoi')) && !(await db()).dmDoiTuong.some(o => o.ten === 'Người một giả lập'));
  await w.check('#dtForm [name=ng_vanChuyen]'); await w.check('#dtForm [name=cv_cvToTruong]'); await w.click('#dtLuu'); await w.waitForTimeout(500);
  d = await db(); const p1 = ((d.dmDoiTuong.find(o => o.ten === 'Người một giả lập') || {}).nguoi || [])[0] || {};
  ok('lưu người: chucVu = [Khác, Tổ trưởng], nganh = [Vận chuyển]', JSON.stringify([...(p1.chucVu || [])].sort()) === JSON.stringify(['cvKhac', 'cvToTruong']) && JSON.stringify(p1.nganh) === '["vanChuyen"]', JSON.stringify(p1));
  ok('Tổ trưởng (vai trò Nhân công) tự bật vai trò cũ Nhân công', !!(p1.vaiTro && p1.vaiTro.nhanCong), JSON.stringify(p1.vaiTro));
  // người không chọn chức vụ chi tiết: JSON không có khóa mới
  await w.click('#cnThem'); await w.waitForSelector('#dtForm');
  await w.fill('#dtForm [name=hoTen]', 'Người hai giả lập'); await w.fill('#dtForm [name=cccd]', '049000000022'); await w.fill('#dtForm [name=ngayCap]', '01/01/2021'); await w.fill('#dtForm [name=noiCap]', 'Cục CS'); await w.fill('#dtForm [name=hanCccd]', '01/01/2036');
  await w.fill('#dtForm [name=gplx]', 'GP-GIA-01'); await w.fill('#dtForm [name=hanGplx]', '01/01/2030'); await w.check('#dtForm [name=vtTaiXe]'); await w.click('#dtLuu'); await w.waitForTimeout(500);
  d = await db(); const p2 = ((d.dmDoiTuong.find(o => o.ten === 'Người hai giả lập') || {}).nguoi || [])[0] || {};
  ok('không chọn chức vụ chi tiết: người KHÔNG có khóa chucVu/nganh (JSON như bản cũ)', !('chucVu' in p2) && !('nganh' in p2) && p2.vaiTro && p2.vaiTro.taiXe, JSON.stringify(p2));
  // đang dùng → Ngừng sử dụng
  await w.click('#setTab_setnv'); await w.waitForSelector('#nvChucVu'); await w.click('#nvThemCv'); await w.fill('#nvThemTen', 'Giám sát'); await w.selectOption('#nvThemNganh', che.id); await w.click('#nvThemLuu'); await w.waitForTimeout(300);
  await w.click('[data-act=nvXoa][data-nv="dmNganh|' + che.id + '"]'); await w.waitForTimeout(300);
  d = await db(); ok('ngành đang là mặc định của chức vụ: xóa → Ngừng sử dụng, không mất', (d.dmNganh.find(n => n.id === che.id) || {}).ngung === true);

  // 3. doanh nghiệp: chọn cả hai ngành
  await w.click('#setTab_setdt'); await w.waitForSelector('#dtBang'); await w.click('#dnThem'); await w.waitForSelector('#dtForm');
  await w.fill('#dtForm [name=ten]', 'Công ty giả lập TNHH'); await w.fill('#dtForm [name=mst]', '0400000011'); await w.fill('#dtForm [name=diaChi]', 'Quảng Nam');
  ok('doanh nghiệp có hàng Ngành nghề của doanh nghiệp', !!(await w.$('#nganhPn')));
  await w.check('#dtForm [name=ngpn_khaiThac]'); await w.check('#dtForm [name=ngpn_vanChuyen]'); await w.click('#dtLuu'); await w.waitForTimeout(500);
  d = await db(); const dn = d.dmDoiTuong.find(o => o.ten === 'Công ty giả lập TNHH');
  ok('doanh nghiệp lưu cả hai ngành', !!dn && JSON.stringify([...(dn.nganh || [])].sort()) === '["khaiThac","vanChuyen"]', JSON.stringify(dn));

  ok('không có lỗi script', errs.length === 0, errs.join('; '));
  await app.close(); console.log(fail ? 'CÓ ' + fail + ' LỖI' : 'TẤT CẢ ĐẠT'); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
