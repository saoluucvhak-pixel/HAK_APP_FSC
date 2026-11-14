'use strict';
/* Giao diện Electron thật theo HAK Enterprise Design System: Tra cứu, Báo cáo, Khôi phục lô, Cài đặt hệ thống, Xuất hồ sơ ở 1366×768 và 1920×1080,
 * Luxe sáng và tối, với tên chủ rừng/địa chỉ/công ty rất dài. Kiểm tra: không tràn ngang, bảng cuộn được trong khung, thao tác bàn phím Tab/Enter/Esc,
 * không lỗi JavaScript. Ảnh chụp ở SHOTS (mặc định thư mục tạm). Chạy: xvfb-run -a node scripts/e2e-manhinh.js */
const {_electron: electron} = require('playwright-core');
const path = require('path'), fs = require('fs'), os = require('os');
const {build} = require('../tests/fixtures/make-lookup');
const root = path.join(__dirname, '..');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'hakqn-mh-')), shots = process.env.SHOTS || path.join(tmp, 'shots'), lotDir = path.join(tmp, 'lo');
fs.mkdirSync(shots, {recursive: true}); fs.mkdirSync(lotDir, {recursive: true});
let fail = 0; const ok = (name, cond, extra) => { console.log((cond ? 'ĐẠT  ' : 'LỖI  ') + name + (!cond && extra ? ' — ' + extra : '')); if (!cond) fail++; };
const LONG = 'NGUYỄN THỊ PHƯƠNG LIÊN HOÀNG ĐÌNH CHIẾN THẮNG TRẦN NGUYỄN HOÀNG ANH TỔ TRƯỞNG';
const ADDR = 'Thôn Phú Cường Đông, xã Quế Sơn Trung, huyện Quế Sơn, thành phố Đà Nẵng, tỉnh Quảng Nam (địa chỉ rất dài để thử cắt chữ)';
const nv = (i, vai, ten, cd, id) => ({_row: i + 1, maRung: 'CR-0001-R1', vaiTro: vai, stt: String(i), danhXung: i % 2 ? 'Ông' : 'Bà', ten, ngaySinh: '01/01/1985', cccd: id, ngayCap: '01/01/2021', noiCap: 'Cục Cảnh sát QLHC về TTXH', diaChi: ADDR, chucDanh: cd, vaiTro2: ''});
const nc = Array.from({length: 8}, (_, i) => nv(i + 1, i ? 'Công nhân' : 'Tổ trưởng', LONG.slice(0, 20 + i * 7), i ? (i % 2 ? 'Công nhân khai thác' : 'Công nhân cưa') : 'Tổ trưởng', '04908500001' + i));
const xe = {_row: 2, maRung: 'CR-0001-R1', stt: '1', chuXe: LONG, ngaySinh: '01/01/1980', cccd: '049000000077', ngayCap: '01/01/2021', noiCap: 'CA', diaChi: ADDR, bienSo: '92C-123.45', ngayCapDK: '05/03/2020', loaiXe: 'Xe tải thùng', nguoiKy: 'Chủ xe', sdt: '0905123456'};
const pc = Array.from({length: 14}, (_, i) => ({_row: i + 2, maRung: 'CR-0001-R1', stt: String(i + 1), ngay: '0' + (1 + i % 9) + '/10/2026', bienSo: '92C-123.45', soPhieu: 'PC' + (1000 + i), kl: 20.25 + i, noiGiao: 'Nhà máy chế biến dăm gỗ'}));
const SEED = {v: 2, congTy: {c1: {id: 'c1', ten: 'CÔNG TY TNHH CHẾ BIẾN GỖ VÀ XUẤT KHẨU DĂM GỖ AN PHÁT QUẢNG NAM ' + 'DÀI', mst: '0401234567', diaChi: ADDR, diaChiGiao: []}}, rs: {own1: {id: 'own1', info: {ma: 'CR-01', ten: LONG, cccd: '049067005459', ngayCap: '15/08/2021', noiCap: 'Cục Cảnh sát QLHC về TTXH', diaChi: ADDR, danhXung: 'Ông', soHopDong: 'HD-2026/015', ngayKyHopDong: '02/10/2026'}, nc: [], dx: [], exp: {}, forests: {
  fa: {id: 'fa', info: {hinhThucLuong: 'sanluong', moHinhKy: 'giaokhoan', donGiaTan: {'Tổ trưởng': 420000, 'Công nhân khai thác': 330000, 'Công nhân cưa': 380000}, khoiLuong: 280, maRung: 'CR-0001-R1', tenRung: 'Lô mẫu ' + LONG.slice(0, 30), diaDiem: ADDR, lat: 15.6, lng: 108.1, dienTich: 14, dinhMucTanHa: 80, cuLy: 45, tuNgay: '01/10/2026', denNgay: '30/11/2026', donGia: 340000, giayTo: [], muaHang: {congTyId: 'c1', diaChiId: 'main', ten: 'CÔNG TY TNHH CHẾ BIẾN GỖ VÀ XUẤT KHẨU DĂM GỖ AN PHÁT QUẢNG NAM DÀI', diaChi: ADDR}, vanChuyen: {mode: 'coDinh', coDinh: 52000, bac: []}}, nc, dx: [xe], pc, exp: {}}}}}};
(async () => {
  const app = await electron.launch({executablePath: require('electron'), args: [root, '--no-sandbox'], env: {...process.env, HAKQN_CLOSE: 'discard', HAKQN_DB: path.join(tmp, 'mh.sqlite'), HAKQN_USERDATA: path.join(tmp, 'ud'), HAKQN_LOT_DIR: lotDir, HAKQN_DOWNLOAD_DIR: path.join(tmp, 'dl'), ELECTRON_DISABLE_SECURITY_WARNINGS: '1'}});
  const w = await app.firstWindow(); const errs = []; w.on('pageerror', e => errs.push(e.message)); w.on('dialog', d => d.accept()); await w.waitForSelector('#side');
  await w.evaluate(db => window.hak.save(db), SEED); await w.reload(); await w.waitForSelector('#side');
  const size = async (W, H) => { await app.evaluate(({BrowserWindow}, [a, b]) => BrowserWindow.getAllWindows()[0].setContentSize(a, b), [W, H]); await w.waitForTimeout(250); };
  const setTheme = async t => { const cur = await w.evaluate(() => document.documentElement.dataset.theme || 'light'); if (cur !== t) { await w.click('#themeBtn'); await w.waitForTimeout(350); } };
  const over = () => w.evaluate(() => ({page: document.documentElement.scrollWidth - innerWidth, boxes: [...document.querySelectorAll('.card, .box, #lkBox.on .wrap, .modal.on, .dlg')].filter(e => e.scrollWidth - e.clientWidth > 1 && getComputedStyle(e).overflowX === 'visible').length}));
  const shot = (name, W, th) => w.screenshot({path: path.join(shots, `${name}_${th}_${W}.png`)});
  await w.click('[data-open=own1]'); await w.click('[data-tab=rung]'); await w.click('[data-forest=fa]');
  // lấy sẵn file sao lưu lô cho màn Khôi phục lô
  await w.click('#lotBackupBtn'); await w.waitForTimeout(800);
  const lotFile = fs.readdirSync(lotDir).find(f => /\.json$/.test(f)); ok('có file sao lưu lô để thử màn Khôi phục lô', !!lotFile);
  await app.evaluate((_, p) => { process.env.HAKQN_LOT_FILE = p; }, path.join(lotDir, lotFile || 'x.json'));
  // nạp bản tra cứu giả lập (tên chuẩn)
  const lkFile = path.join(tmp, 'tc.xlsx'); fs.writeFileSync(lkFile, build());
  await app.evaluate(({dialog}, p) => { dialog.showOpenDialog = async () => ({canceled: false, filePaths: [p]}); }, lkFile);
  await w.click('header [data-act=lkOpen]'); await w.waitForSelector('#lkBox.on'); await w.click('[data-act=lkExcel]'); await w.waitForFunction(() => /Đã cập nhật bản tra cứu/.test(document.getElementById('lkBody').innerText));
  // bàn phím trong Tra cứu: Tab di chuyển, Enter tìm, Esc đóng
  await w.focus('#lkQ'); await w.keyboard.type('nguyen van an'); await w.keyboard.press('Enter'); await w.waitForTimeout(500);
  ok('Tra cứu: Enter trong ô tìm chạy tìm kiếm (có kết quả)', (await w.$$('[data-lkpick], [data-lkgrp], [data-lkhd]')).length > 0);
  ok('Tra cứu: sau khi tìm bằng Enter, tiêu điểm vẫn ở ô tìm (không mất vì vẽ lại)', await w.evaluate(() => document.activeElement && document.activeElement.id === 'lkQ'));
  await w.keyboard.press('Tab');
  ok('Tra cứu: Tab chuyển tiêu điểm sang điều khiển kế tiếp trong hộp', await w.evaluate(() => { const a = document.activeElement; return !!a && a !== document.body && a.id !== 'lkQ' && !!a.closest('#lkBox'); }));
  await w.keyboard.press('Escape'); await w.waitForTimeout(250);
  const lkClosedByEsc = !(await w.isVisible('#lkBox.on').catch(() => false));
  ok('Tra cứu: Esc đóng hộp', lkClosedByEsc);
  if (!lkClosedByEsc) await w.click('[data-act=lkClose]');

  for (const [W, H] of [[1366, 768], [1920, 1080]]) {
    await size(W, H);
    for (const th of ['light', 'dark']) {
      await setTheme(th); const tag = `${th}/${W}x${H}`;
      // Tra cứu
      await w.click('header [data-act=lkOpen]'); await w.waitForSelector('#lkBox.on'); await w.waitForTimeout(200);
      await w.fill('#lkQ', ''); await w.fill('#lkQ', 'nguyen'); await w.keyboard.press('Enter'); await w.waitForTimeout(500);
      let o = await over(); ok(`${tag}: Tra cứu không tràn ngang`, o.page <= 0 && o.boxes === 0, JSON.stringify(o)); await shot('tracuu', W, th);
      await w.click('[data-act=lkClose]');
      // Báo cáo
      await w.click('header [data-act=rpOpen]'); await w.waitForTimeout(300);
      o = await over(); ok(`${tag}: Báo cáo không tràn ngang`, o.page <= 0 && o.boxes === 0, JSON.stringify(o)); await shot('baocao', W, th);
      await w.keyboard.press('Escape'); await w.waitForTimeout(150);
      ok(`${tag}: Báo cáo — Esc đóng hộp`, await w.evaluate(() => !document.getElementById('rpBox').classList.contains('on')));
      // Khôi phục lô
      await w.click('[data-open=own1]'); await w.click('[data-tab=rung]'); await w.click('[data-forest=fa]');
      await w.click('#moreMenu summary'); await w.click('#lotRestoreBtn'); await w.waitForTimeout(700);
      o = await over(); ok(`${tag}: Khôi phục lô không tràn ngang`, o.page <= 0 && o.boxes === 0, JSON.stringify(o)); await shot('khoiphuclo', W, th);
      await w.keyboard.press('Escape'); await w.waitForTimeout(250);
      ok(`${tag}: Khôi phục lô — Esc hủy và đóng hộp thoại (không ghi gì)`, await w.evaluate(() => !document.getElementById('impBox').classList.contains('on')));
      // Cài đặt hệ thống
      await w.click('#moreMenu summary'); await w.click('#openSettingsBtn'); await w.waitForSelector('#setBox [data-set-path]');
      o = await over(); ok(`${tag}: Cài đặt không tràn ngang`, o.page <= 0 && o.boxes === 0, JSON.stringify(o)); await shot('caidat', W, th);
      // Xuất hồ sơ (tên dài, nhiều phiếu)
      await w.click('[data-open=own1]'); await w.click('[data-tab=rung]'); await w.click('[data-forest=fa]'); await w.click('[data-ftab=xuat]'); await w.waitForTimeout(300);
      for (const xt of ['hd', 'all']) { await w.click(`[data-xtab=${xt}]`); await w.waitForTimeout(200); o = await over(); ok(`${tag}: Xuất hồ sơ (${xt}) không tràn ngang`, o.page <= 0 && o.boxes === 0, JSON.stringify(o)); if (xt === 'all') await shot('xuathoso', W, th); }
      // bảng cha–con và cuộn bảng: tab vận chuyển với 14 phiếu
      await w.click('[data-ftab=dx]'); await w.waitForTimeout(250);
      o = await over(); ok(`${tag}: Vận chuyển và bảng phiếu cân không tràn ngang`, o.page <= 0 && o.boxes === 0, JSON.stringify(o)); await shot('vanchuyen', W, th);
    }
  }
  ok('không có lỗi JavaScript', errs.length === 0, errs.join('|'));
  console.log('Ảnh chụp: ' + shots);
  await app.close(); console.log(fail ? 'CÓ ' + fail + ' LỖI' : 'TẤT CẢ ĐẠT'); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
