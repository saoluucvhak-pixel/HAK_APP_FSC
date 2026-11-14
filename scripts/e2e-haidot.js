'use strict';
/* In hồ sơ làm hai đợt (Electron thật, dữ liệu giả lập): đợt 1 làm ngay khi chưa có phiếu cân/chưa xong rừng; đợt 2 chỉ gồm các biểu mẫu thanh toán và nghiệm thu.
 * Chạy: xvfb-run -a node scripts/e2e-haidot.js */
const {_electron: electron} = require('playwright-core');
const path = require('path'), fs = require('fs'), os = require('os');
const JSZip = require('jszip');
const root = path.join(__dirname, '..');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hakqn-2dot-')), out = path.join(dir, 'out');
let fail = 0; const ok = (name, cond, extra) => { console.log((cond ? 'ĐẠT  ' : 'LỖI  ') + name + (!cond && extra ? ' — ' + extra : '')); if (!cond) fail++; };
const nv = (stt, vai, ten, cd, cccd) => ({_row: stt + 1, maRung: 'R-A', vaiTro: vai, stt: String(stt), danhXung: 'Ông', ten, ngaySinh: '01/01/1985', cccd, ngayCap: '01/01/2021', noiCap: 'CA', diaChi: 'Đà Nẵng', chucDanh: cd});
const xe = {_row: 2, maRung: 'R-A', stt: '1', chuXe: 'LÊ VĂN XE', ngaySinh: '01/01/1980', cccd: '049000000077', ngayCap: '01/01/2021', noiCap: 'CA', diaChi: 'Đà Nẵng', bienSo: '92C-12345', loaiXe: 'Xe tải', nguoiKy: 'Chủ xe', sdt: '0905123456'};
const lot = pc => ({id: 'fa', info: {hinhThucLuong: 'sanluong', moHinhKy: 'giaokhoan', donGiaTan: {'Tổ trưởng': 420000, 'Công nhân khai thác': 330000, 'Công nhân cưa': 380000}, maRung: 'R-A', tenRung: 'Lô A', diaDiem: 'Thôn A', lat: 15.6, lng: 108.1, dienTich: 2, dinhMucTanHa: 80, cuLy: 45, tuNgay: '01/10/2026', denNgay: '30/11/2026', donGia: 340000, giayTo: [], vanChuyen: {mode: 'coDinh', coDinh: 52000, bac: []}},
  nc: [nv(1, 'Tổ trưởng', 'TRẦN TỔ TRƯỞNG', 'Tổ trưởng', '049085000001'), nv(2, 'Công nhân', 'LÊ CÔNG NHÂN', 'Công nhân khai thác', '049085000002'), nv(3, 'Công nhân', 'PHẠM CƯA', 'Công nhân cưa', '049085000003')], dx: [xe], pc, exp: {}});
const seed = pc => ({v: 2, rs: {own1: {id: 'own1', info: {ma: 'CR-01', ten: 'NGUYỄN VĂN MỘT', cccd: '049067005459', ngayCap: '15/08/2021', noiCap: 'CA', diaChi: 'Đà Nẵng', danhXung: 'Ông'}, nc: [], dx: [], exp: {}, forests: {fa: lot(pc)}}}});
const PC = [{_row: 2, maRung: 'R-A', stt: '1', ngay: '05/10/2026', bienSo: '92C-12345', soPhieu: 'PA1', kl: 12.5, noiGiao: 'NM', ghiChu: ''}];
(async () => {
  const app = await electron.launch({executablePath: require('electron'), args: [root, '--no-sandbox'], env: {...process.env, HAKQN_CLOSE: 'discard', HAKQN_DB: path.join(dir, 'h.sqlite'), HAKQN_USERDATA: path.join(dir, 'ud'), HAKQN_DOWNLOAD_DIR: out, ELECTRON_DISABLE_SECURITY_WARNINGS: '1'}});
  const w = await app.firstWindow(); const errs = []; w.on('pageerror', e => errs.push(e.message)); w.on('dialog', d => d.accept()); await w.waitForSelector('#side');
  await w.evaluate(d => window.hak.save(d), seed([])); await w.reload(); await w.waitForSelector('#side');
  await w.click('[data-open=own1]'); await w.click('[data-tab=rung]'); await w.click('[data-forest=fa]'); await w.click('[data-ftab=xuat]'); await w.click('[data-xtab=all]');
  const names = async kind => { for (const f of fs.existsSync(out) ? fs.readdirSync(out) : []) fs.unlinkSync(path.join(out, f)); await w.click(`button[data-act=dl][data-kind=${kind}]`); let f = null; for (let i = 0; i < 80 && !f; i++) { f = fs.existsSync(out) && fs.readdirSync(out).find(x => /\.(zip|docx)$/.test(x)); if (!f) await w.waitForTimeout(100); } await w.waitForTimeout(300); const z = await JSZip.loadAsync(fs.readFileSync(path.join(out, f))); return {file: f, list: Object.keys(z.files).filter(n => n.endsWith('.docx')).map(n => n.replace(/^(\d\d)_[^/]*\//, '$1_/'))}; };
  const has = (list, pre) => list.some(n => n.startsWith(pre));   // BM-04, BM-09, BM-10 nằm trong thư mục con: 04_/, 09_/, 10_/
  ok('màn hình có hai nút đợt 1 và đợt 2', !!(await w.$('button[data-kind=dau]')) && !!(await w.$('button[data-kind=cuoi]')));
  ok('chưa có phiếu cân: màn hình báo BM-09 và BM-10 chưa có trong đợt 2', /chưa đủ phiếu cân hợp lệ/.test(await w.innerText('#main')));
  const d1 = await names('dau');
  ok('đợt 1 (chưa có phiếu cân): tên file ZIP rõ đợt', /dot1_truoc_khi_xong_rung/.test(d1.file), d1.file);
  ok('đợt 1 có hợp đồng khoán BM-01, BHLĐ BM-02, hợp đồng vận chuyển BM-04, thẩm định BM-17', ['01_', '02_', '04_/', '17_'].every(p => has(d1.list, p)), JSON.stringify(d1.list));
  ok('đợt 1 KHÔNG có BM-08 tiền công, BM-09, BM-10, BM-14 nghiệm thu', !['08_', '09_/', '10_/', '14_'].some(p => has(d1.list, p)), JSON.stringify(d1.list));
  const d2 = await names('cuoi');
  ok('đợt 2 (chưa có phiếu cân): chỉ BM-08 và BM-14; chưa có BM-09, BM-10; có thông báo nêu rõ', has(d2.list, '08_') && has(d2.list, '14_') && !has(d2.list, '09_/') && !has(d2.list, '10_/') && d2.list.length === 2 && /KHÔNG có trong file vì chưa đủ phiếu cân/.test(await w.innerText('body')), JSON.stringify(d2.list));
  ok('đợt 2 không chứa biểu mẫu của đợt 1', !['01_', '02_', '04_/', '17_'].some(p => has(d2.list, p)));
  // sau khi xong rừng: có phiếu cân
  await w.evaluate(d => window.hak.save(d), seed(PC)); await w.reload(); await w.waitForSelector('#side');
  await w.click('[data-open=own1]'); await w.click('[data-tab=rung]'); await w.click('[data-forest=fa]'); await w.click('[data-ftab=xuat]'); await w.click('[data-xtab=all]');
  ok('đã có phiếu cân: không còn cảnh báo thiếu BM-09, BM-10', !/chưa đủ phiếu cân hợp lệ/.test(await w.innerText('#main')));
  const d2b = await names('cuoi');
  ok('đợt 2 (đã có phiếu cân): đủ BM-08, BM-09, BM-10, BM-14 và chỉ bốn biểu mẫu này', ['08_', '09_/', '10_/', '14_'].every(p => has(d2b.list, p)) && !['01_', '02_', '04_/', '17_'].some(p => has(d2b.list, p)), JSON.stringify(d2b.list));
  const dAll = await names('all');
  ok('“Tải toàn bộ” vẫn gồm cả hai đợt', ['01_', '04_/', '08_', '09_/', '10_/', '14_'].every(p => has(dAll.list, p)), JSON.stringify(dAll.list));
  ok('đợt 1 và đợt 2 gộp lại bằng đúng “Tải toàn bộ” (cùng tập biểu mẫu)', JSON.stringify([...(await names('dau')).list, ...(await names('cuoi')).list].sort()) === JSON.stringify(dAll.list.slice().sort()));
  // ===== cảnh báo theo từng trường hợp khi tải toàn bộ =====
  const noteAfter = async kind => { await w.click(`button[data-act=dl][data-kind=${kind}]`); await w.waitForTimeout(900); return (await w.innerText('#main')); };
  const FULL = Object.assign(seed(PC), {}); FULL.rs.own1.forests.fa.info.khoiLuong = 29.75; FULL.rs.own1.forests.fa.info.muaHang = {congTyId: 'c1', ten: 'CÔNG TY TNHH DĂM AN PHÁT', mst: '', diaChiId: '', diaChiNhan: '', diaChi: 'KCN Điện Nam, Quảng Nam', xacNhan: '2026-10-01T00:00:00.000Z'}; FULL.rs.own1.forests.fa.exp = {ngayKy: '02/10/2026', soKT: '015', soVC: '07', ntNgay: '20/12/2026', pcNgay: '20/12/2026', ntSo: '03', pcSo: '09'};
  await w.evaluate(d => window.hak.save(d), seed([])); await w.reload(); await w.waitForSelector('#side'); await w.click('[data-open=own1]'); await w.click('[data-tab=rung]'); await w.click('[data-forest=fa]'); await w.click('[data-ftab=xuat]'); await w.click('[data-xtab=all]');
  let m = await noteAfter('all');
  ok('tải toàn bộ khi chưa có phiếu cân: cảnh báo BM-09 và BM-10 không có trong file', /KHÔNG có trong file vì chưa đủ phiếu cân/.test(m), m.slice(0, 400));
  ok('tải toàn bộ khi chưa nhập khối lượng thực tế: cảnh báo BM-08, BM-14 tính theo sản lượng dự kiến', /SẢN LƯỢNG DỰ KIẾN/.test(m));
  ok('cảnh báo thiếu ngày lập nghiệm thu, thiếu địa chỉ giao và thiếu năm của số hợp đồng', /ngày lập biên bản nghiệm thu/.test(m) && /chưa chọn địa chỉ giao hàng/.test(m) && /Số hợp đồng chưa có năm/.test(m));
  await w.evaluate(d => window.hak.save(d), FULL); await w.reload(); await w.waitForSelector('#side'); await w.click('[data-open=own1]'); await w.click('[data-tab=rung]'); await w.click('[data-forest=fa]'); await w.click('[data-ftab=xuat]'); await w.click('[data-xtab=all]');
  m = await noteAfter('all');
  ok('hồ sơ ĐỦ dữ liệu: tải toàn bộ một lần, không còn cảnh báo thiếu', /dữ liệu đủ, không có lưu ý/.test(m) && !/KHÔNG có trong file|SẢN LƯỢNG DỰ KIẾN|chưa chọn địa chỉ|chưa có năm/.test(m), m.slice(0, 500));
  const full = await names('all');
  ok('hồ sơ đủ: file toàn bộ có đủ BM-01, BM-04, BM-08, BM-09, BM-10, BM-14 trong một lần tải', ['01_', '04_/', '08_', '09_/', '10_/', '14_'].every(p => has(full.list, p)), JSON.stringify(full.list));
  ok('không lỗi script giao diện', errs.length === 0, errs.join('|'));
  await app.close();
  console.log(fail ? '\n' + fail + ' LỖI' : '\nĐẠT HẾT'); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
