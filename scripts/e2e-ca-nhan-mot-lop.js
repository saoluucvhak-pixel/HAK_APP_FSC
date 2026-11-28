'use strict';
/* Danh mục đối tượng — Bước 2: thể nhân là MỘT người, biểu mẫu “Thêm cá nhân” MỘT lớp (Electron thật, SQLite thật):
 *  - tạo cá nhân trong một form (họ tên, CCCD, ngày cấp, nơi cấp, hạn CCCD, ngày sinh, giới tính, địa chỉ, SĐT, GPLX, hạn GPLX, chức vụ, quyền ký, vị trí mặc định) → lưu → mở lại đúng;
 *  - dữ liệu lưu giữ cấu trúc cũ: {loai: 'thenhan', ten = họ tên, nguoi: [một người]}; danh sách ngoài hiện chip chức vụ;
 *  - không còn bảng con và nút “Thêm người” khi chỉ có một người; mở lại và lưu không đổi thì dữ liệu giữ nguyên;
 *  - dữ liệu cũ có thể nhân NHIỀU người: vẫn hiện đủ bảng con, sửa được từng người, không ai bị xóa hay gộp;
 *  - “+ Thêm doanh nghiệp” vẫn là form pháp nhân (người đại diện, MST, quyền ký).
 * Chạy: xvfb-run -a node scripts/e2e-ca-nhan-mot-lop.js */
const {_electron: electron} = require('playwright-core');
const path = require('path'), fs = require('fs'), os = require('os');
const src = fs.readFileSync(path.join(__dirname, 'e2e-inan2.js'), 'utf8');
const {nv, lot, seed} = new Function(src.slice(src.indexOf('const nv ='), src.indexOf('const plain =')) + '; return {nv, lot, seed};')();
const root = path.join(__dirname, '..');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hakqn-canhan-'));
let fail = 0; const ok = (name, cond, extra) => { console.log((cond ? 'ĐẠT  ' : 'LỖI  ') + name + (!cond && extra ? ' — ' + extra : '')); if (!cond) fail++; };
(async () => {
  const app = await electron.launch({executablePath: require('electron'), args: [root, '--no-sandbox'], env: {...process.env, HAKQN_CLOSE: 'discard', HAKQN_DB: path.join(dir, 'd.sqlite'), HAKQN_USERDATA: path.join(dir, 'ud'), HAKQN_DOWNLOAD_DIR: path.join(dir, 'dl')}});
  const w = require('./_hd30').boc(await app.firstWindow()); const errs = []; w.on('pageerror', e => errs.push(e.message)); w.on('dialog', d => d.accept()); await w.waitForSelector('#side');
  const B = lot('fb', 'R-B', {exp: {}, kl: null, pc: [], nc: [nv(1, 'Tổ trưởng', 'TỔ TRƯỞNG B', 'Tổ trưởng', '049085007009')]});
  const D = seed([B]);
  const p = (id, hoTen, cccd, o) => Object.assign({id, hoTen, cccd, ngayCap: '01/01/2021', noiCap: 'Cục CS QLHC', hanCccd: '', diaChi: 'Quế Sơn', gioiTinh: 'Nam', ngaySinh: '01/01/1985', sdt: '', gplx: '', hanGplx: '', viTriId: '', chucDanhKy: '', vaiTro: {nhanCong: true, taiXe: false, chuXe: false}, kyHD: {vanChuyen: false, nhanCong: false}, ngung: false}, o || {});
  const CU = {id: 'dtcu', ma: 'DT9001', ten: 'TỔ CƯA CŨ HAI NGƯỜI', loai: 'thenhan', mst: '', diaChi: 'Tiên Phước', sdt: '0905000009', kyHD: {vanChuyen: false, nhanCong: false}, daiDien: '', chucVuDaiDien: '', ngung: false, ngayCapNhat: '01/09/2026', nguonCu: '',
    nguoi: [p('ngcu1', 'NGUYỄN VĂN AN', '049085000011'), p('ngcu2', 'TRẦN THỊ BÌNH', '049085000012', {gioiTinh: 'Nữ', vaiTro: {nhanCong: true, taiXe: false, chuXe: true}})]};
  D.dmDoiTuong = [CU];
  await w.evaluate(d => window.hak.save(d), D); await w.reload(); await w.waitForSelector('#side');
  const dbAll = () => w.evaluate(() => window.hak.loadSync().db);
  const set = (sel, o) => w.evaluate(([sel, o]) => { const f = document.querySelector(sel); Object.entries(o).forEach(([k, v]) => { const e = f.elements[k]; if (e.type === 'checkbox') e.checked = !!v; else e.value = v; }); }, [sel, o]);
  const val = (k) => w.$eval('#dtForm [name=' + k + ']', e => e.type === 'checkbox' ? e.checked : e.value);
  await w.click('#navDm'); await w.click('#setTab_setdt'); await w.waitForSelector('#dtBang');

  // 1. tạo cá nhân MỘT form
  ok('có hai nút riêng “+ Thêm cá nhân” và “+ Thêm doanh nghiệp”', await w.isVisible('#cnThem') && await w.isVisible('#dnThem') && /Thêm cá nhân/.test(await w.innerText('#cnThem')) && /Thêm doanh nghiệp/.test(await w.innerText('#dnThem')));
  await w.click('#cnThem'); await w.waitForSelector('#dtForm');
  await w.evaluate(() => document.getElementById('dmModal').remove());   // như khi nhảy sang màn khác từ Tìm kiếm chung: form không còn trên màn hình nhưng hồ sơ đang mở vẫn còn trong bộ nhớ
  await w.click('#navHome'); await w.waitForTimeout(300);
  const hop = await w.evaluate(() => { const b = document.getElementById('stBox'); return !!b && b.classList.contains('on') && /Còn thay đổi chưa lưu/.test(b.innerText); });
  ok('mở form cá nhân mới, chưa gõ gì, rời màn hình khi form không còn trên màn hình: không báo giả "còn thay đổi chưa lưu"', !hop, String(hop));
  if (hop) await w.evaluate(() => document.getElementById('stBox').classList.remove('on'));
  await w.click('#navDm'); await w.waitForSelector('#dtForm'); await w.click('#dtHuy'); await w.waitForSelector('#dtBang');   // 3.5.1: bản đang nhập còn trong bộ nhớ nên hộp thoại hiện lại khi mở Danh mục
  await w.click('#cnThem'); await w.waitForSelector('#dtForm');
  const cot = ['hoTen', 'cccd', 'ngayCap', 'noiCap', 'hanCccd', 'ngaySinh', 'gioiTinh', 'diaChi', 'sdt', 'gplx', 'hanGplx', 'viTriId', 'vtNhanCong', 'vtTaiXe', 'vtChuXe', 'kyVC', 'kyNC'];
  const co = await w.$eval('#dtForm', (f, ks) => ks.filter(k => !f.elements[k]), cot);
  ok('form cá nhân có đủ các ô trong MỘT form (họ tên, CCCD, ngày cấp, nơi cấp, hạn CCCD, ngày sinh, giới tính, địa chỉ, SĐT, GPLX, hạn GPLX, chức vụ, quyền ký, vị trí)', co.length === 0, 'thiếu: ' + co.join(','));
  ok('khi chưa có hoặc chỉ có một người: không có bảng con #dtNguoiTbl và nút “+ Thêm người”', !(await w.$('#dtNguoiTbl')) && !(await w.$('#ngThem')));
  const vtId = await w.$eval('#dtForm [name=viTriId]', e => (([...e.options].find(o => o.value) || {}).value) || '');
  await set('#dtForm', {hoTen: 'LÊ VĂN MỘT', cccd: '049085000077', ngayCap: '01/01/2021', noiCap: 'Cục CS QLHC', hanCccd: '01/01/2036', ngaySinh: '02/03/1985', gioiTinh: 'Nam', diaChi: 'Quế Sơn', sdt: '0905111222', gplx: 'GP-777', hanGplx: '01/01/2030', viTriId: vtId, vtNhanCong: true, vtTaiXe: true, vtChuXe: true, kyVC: true});
  await w.click('#dtLuu'); await w.waitForTimeout(500);
  let X = await dbAll(), o1 = (X.dmDoiTuong || []).find(o => o.ten === 'LÊ VĂN MỘT');
  ok('lưu: cấu trúc cũ giữ nguyên — loại thể nhân, tên đối tượng = họ tên, đúng MỘT người có ID', !!o1 && o1.loai === 'thenhan' && o1.ten === 'LÊ VĂN MỘT' && /^DT\d{4}$/.test(o1.ma) && o1.nguoi.length === 1 && !!o1.nguoi[0].id && o1.nguoi[0].hoTen === 'LÊ VĂN MỘT', JSON.stringify(o1));
  const n1 = (o1 || {nguoi: [{}]}).nguoi[0];
  ok('lưu: mọi thông tin cá nhân vào đúng người (CCCD giữ số 0 đầu, ngày cấp, nơi cấp, hạn CCCD, ngày sinh, giới tính, GPLX, hạn GPLX, vị trí)', n1.cccd === '049085000077' && n1.ngayCap === '01/01/2021' && n1.noiCap === 'Cục CS QLHC' && n1.hanCccd === '01/01/2036' && n1.ngaySinh === '02/03/1985' && n1.gioiTinh === 'Nam' && n1.gplx === 'GP-777' && n1.hanGplx === '01/01/2030' && n1.viTriId === vtId, JSON.stringify(n1));
  ok('lưu: địa chỉ, SĐT ở người và ở đối tượng; chức vụ Nhân công + Tài xế + Chủ xe; ký Vận chuyển (không ký Nhân công)', n1.diaChi === 'Quế Sơn' && n1.sdt === '0905111222' && o1.diaChi === 'Quế Sơn' && o1.sdt === '0905111222' && n1.vaiTro.nhanCong && n1.vaiTro.taiXe && n1.vaiTro.chuXe && n1.kyHD.vanChuyen && !n1.kyHD.nhanCong, JSON.stringify([o1.diaChi, o1.sdt, n1.vaiTro, n1.kyHD]));
  const hang = await w.$eval('#dtBang tr[data-dt="' + o1.id + '"]', r => ({chip: [...r.querySelectorAll('.pill[data-vai]')].map(x => x.textContent.trim()), text: r.textContent}));
  ok('danh sách ngoài: dòng của cá nhân hiện chip chức vụ Nhân công, Tài xế, Chủ xe', ['Nhân công', 'Tài xế', 'Chủ xe'].every(t => hang.chip.includes(t)), JSON.stringify(hang.chip));

  // 2. mở lại đúng; lưu không đổi thì dữ liệu giữ nguyên
  await w.click('[data-dtsua="' + o1.id + '"]'); await w.waitForSelector('#dtForm');
  const hien = {}; for (const k of ['hoTen', 'cccd', 'ngayCap', 'noiCap', 'hanCccd', 'ngaySinh', 'gioiTinh', 'diaChi', 'sdt', 'gplx', 'hanGplx', 'viTriId', 'vtNhanCong', 'vtTaiXe', 'vtChuXe', 'kyVC', 'kyNC']) hien[k] = await val(k);
  ok('mở lại: form hiện đúng mọi giá trị đã lưu', hien.hoTen === 'LÊ VĂN MỘT' && hien.cccd === '049085000077' && hien.ngayCap === '01/01/2021' && hien.noiCap === 'Cục CS QLHC' && hien.hanCccd === '01/01/2036' && hien.ngaySinh === '02/03/1985' && hien.gioiTinh === 'Nam' && hien.diaChi === 'Quế Sơn' && hien.sdt === '0905111222' && hien.gplx === 'GP-777' && hien.hanGplx === '01/01/2030' && hien.viTriId === vtId && hien.vtNhanCong && hien.vtTaiXe && hien.vtChuXe && hien.kyVC && !hien.kyNC, JSON.stringify(hien));
  ok('mở lại: vẫn một lớp (không bảng con, không “+ Thêm người”)', !(await w.$('#dtNguoiTbl')) && !(await w.$('#ngThem')));
  await w.click('#dtLuu'); await w.waitForTimeout(500);
  X = await dbAll(); const o1b = (X.dmDoiTuong || []).find(o => o.id === o1.id);
  const bo = o => { const c = JSON.parse(JSON.stringify(o)); delete c.ngayCapNhat; return JSON.stringify(c); };
  ok('mở rồi lưu không đổi gì: dữ liệu đối tượng và người giữ nguyên từng khóa', bo(o1b) === bo(o1), bo(o1b) + ' ≠ ' + bo(o1));
  // sửa họ tên: tên đối tượng đồng bộ theo
  await w.click('[data-dtsua="' + o1.id + '"]'); await w.waitForSelector('#dtForm'); await set('#dtForm', {hoTen: 'LÊ VĂN MỘT SỬA'}); await w.click('#dtLuu'); await w.waitForTimeout(500);
  X = await dbAll(); const o1c = (X.dmDoiTuong || []).find(o => o.id === o1.id);
  ok('sửa họ tên: tên đối tượng đồng bộ = họ tên mới, vẫn một người, ID người và mã không đổi', o1c.ten === 'LÊ VĂN MỘT SỬA' && o1c.nguoi.length === 1 && o1c.nguoi[0].hoTen === 'LÊ VĂN MỘT SỬA' && o1c.nguoi[0].id === n1.id && o1c.ma === o1.ma, JSON.stringify(o1c));

  // 3. lỗi kiểm giữ nguyên thông điệp
  await w.click('#cnThem'); await w.waitForSelector('#dtForm'); await set('#dtForm', {hoTen: 'NGƯỜI TRÙNG', cccd: '049085000077', vtNhanCong: true}); await w.click('#dtLuu'); await w.waitForTimeout(300);
  ok('CCCD trùng người khác: báo “đã có ở hồ sơ”, không lưu', await w.isVisible('#dtForm') && /CCCD 049085000077 đã có ở hồ sơ/.test(await w.innerText('#dtLoi')), await w.innerText('#dtLoi').catch(() => ''));
  await set('#dtForm', {cccd: '', vtTaiXe: true}); await w.click('#dtLuu'); await w.waitForTimeout(300);
  ok('tài xế thiếu GPLX: báo “tài xế phải có số giấy phép lái xe”', await w.isVisible('#dtForm') && /tài xế phải có số giấy phép lái xe/.test(await w.innerText('#dtLoi')), await w.innerText('#dtLoi').catch(() => ''));
  await w.click('#dtHuy'); await w.waitForTimeout(200);

  // 4. dữ liệu cũ nhiều người: hiện đủ, sửa được, không ai bị xóa hay gộp
  await w.click('[data-dtsua="dtcu"]'); await w.waitForSelector('#dtForm');
  const bang = await w.innerText('#dtNguoiTbl').catch(() => '');
  ok('đối tượng cũ có 2 người: vẫn hiện bảng con với đủ cả hai và nút “+ Thêm người”', /NGUYỄN VĂN AN/.test(bang) && /TRẦN THỊ BÌNH/.test(bang) && await w.isVisible('#ngThem'), bang);
  await w.click('[data-ngsua="1"]'); await w.waitForSelector('#ngForm'); await set('#ngForm', {sdt: '0905999888'}); await w.click('#ngLuu'); await w.waitForTimeout(200);
  await w.click('#dtLuu'); await w.waitForTimeout(500);
  X = await dbAll(); const cu2 = (X.dmDoiTuong || []).find(o => o.id === 'dtcu');
  ok('lưu đối tượng cũ: còn đủ 2 người, người 2 đổi SĐT, người 1 và các khóa khác giữ nguyên', cu2.nguoi.length === 2 && cu2.nguoi[0].id === 'ngcu1' && cu2.nguoi[1].id === 'ngcu2' && cu2.nguoi[1].sdt === '0905999888' && cu2.nguoi[0].sdt === '' && cu2.nguoi[1].vaiTro.chuXe && cu2.ten === 'TỔ CƯA CŨ HAI NGƯỜI' && cu2.nguoi[0].hoTen === 'NGUYỄN VĂN AN', JSON.stringify(cu2));
  const dong = await w.innerText('#dtBang tr[data-dt="dtcu"]');
  ok('danh sách ngoài: đối tượng nhiều người hiện cả hai người kèm chip chức vụ', /NGUYỄN VĂN AN/.test(dong) && /TRẦN THỊ BÌNH/.test(dong) && /Chủ xe/.test(dong), dong);

  // 5. doanh nghiệp: vẫn form pháp nhân
  await w.click('#dnThem'); await w.waitForSelector('#dtForm');
  ok('“+ Thêm doanh nghiệp”: form pháp nhân (người đại diện, ký hợp đồng), không có ô họ tên cá nhân', !!(await w.$('#dtForm [name=daiDien]')) && !!(await w.$('#dtForm [name=kyHD]')) && !(await w.$('#dtForm [name=hoTen]')) && !(await w.$('#dtNguoiTbl')));
  await set('#dtForm', {ten: 'CÔNG TY TNHH MỘT LỚP', mst: '0401234567', diaChi: 'Đà Nẵng', kyHD: 'vc', daiDien: 'NGUYỄN VĂN B', chucVuDaiDien: 'Giám đốc'}); await w.click('#dtLuu'); await w.waitForTimeout(500);
  X = await dbAll(); const pn = (X.dmDoiTuong || []).find(o => o.ten === 'CÔNG TY TNHH MỘT LỚP');
  ok('lưu doanh nghiệp: loại pháp nhân, MST, người đại diện, ký Vận chuyển', !!pn && pn.loai === 'phapnhan' && pn.mst === '0401234567' && pn.daiDien === 'NGUYỄN VĂN B' && pn.kyHD.vanChuyen && !pn.kyHD.nhanCong, JSON.stringify(pn));

  // 6. mở lại sau khi tải lại ứng dụng
  await w.reload(); await w.waitForSelector('#side'); await w.click('#navDm'); await w.click('#setTab_setdt'); await w.waitForSelector('#dtBang');
  await w.click('[data-dtsua="' + o1.id + '"]'); await w.waitForSelector('#dtForm');
  ok('tải lại ứng dụng rồi mở cá nhân: vẫn đúng họ tên, CCCD, GPLX và chức vụ', (await val('hoTen')) === 'LÊ VĂN MỘT SỬA' && (await val('cccd')) === '049085000077' && (await val('gplx')) === 'GP-777' && (await val('vtTaiXe')) === true);
  ok('không có lỗi script trên màn hình', errs.length === 0, errs.join(' | '));
  await app.close(); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
