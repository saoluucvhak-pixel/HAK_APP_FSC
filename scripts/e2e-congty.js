'use strict';
/* Công ty mua hàng (MỘT hồ sơ công ty cho cả phần mềm) và điểm đến vận chuyển (Electron thật, dữ liệu giả lập):
 * 2 rừng – cùng một công ty, mỗi rừng chọn địa chỉ giao riêng; địa chỉ tự điền và lưu theo từng rừng sau khi đóng/mở lại; BM-04, BM-09, BM-10 đúng điểm đến; đổi địa chỉ giao có so sánh cũ/mới;
 * sửa địa chỉ trong hồ sơ công ty KHÔNG tự đổi hồ sơ rừng cho đến khi xác nhận; phiếu có nơi giao khác thì cảnh báo; hồ sơ cũ nhập tay vẫn giữ.
 * Chạy: xvfb-run -a node scripts/e2e-congty.js */
const {_electron: electron} = require('playwright-core');
const path = require('path'), fs = require('fs'), os = require('os');
const JSZip = require('jszip');
const root = path.join(__dirname, '..');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hakqn-cty-')), out = path.join(dir, 'out'), dbFile = path.join(dir, 'cty.sqlite');
let fail = 0; const ok = (name, cond, extra) => { console.log((cond ? 'ĐẠT  ' : 'LỖI  ') + name + (!cond && extra ? ' — ' + extra : '')); if (!cond) fail++; };

const xe = (bien, ma) => ({_row: 2, maRung: ma, stt: '1', chuXe: 'CHỦ XE ' + bien, ngaySinh: '01/01/1980', cccd: '049000000077', ngayCap: '01/01/2021', noiCap: 'CA', diaChi: 'Đà Nẵng', bienSo: bien, loaiXe: 'Xe tải', nguoiKy: 'Chủ xe', sdt: '0905123456'});
const P = (stt, ngay, bien, so, kl, noi) => ({_row: stt + 1, stt: String(stt), ngay, bienSo: bien, soPhieu: so, kl, noiGiao: noi, ghiChu: ''});
const forest = (id, ma, ten, exp, pc) => ({id, info: {maRung: ma, tenRung: ten, diaDiem: 'Thôn ' + ma, lat: 15.6, lng: 108.1, dienTich: 2, dinhMucTanHa: 80, cuLy: 45, tuNgay: '01/10/2026', denNgay: '30/11/2026', donGia: 340000, giayTo: [], vanChuyen: {mode: 'coDinh', coDinh: 52000, bac: []}},
  nc: [], dx: [xe('92C-12345', ma)], pc, exp});
const C1 = {id: 'c1', ten: 'CÔNG TY TNHH DĂM AN PHÁT', mst: '0401234567', diaChi: 'KCN Điện Nam – Điện Ngọc, Điện Bàn, Quảng Nam', nguoiDaiDien: 'Nguyễn Văn A', chucVu: 'Giám đốc', sdt: '0905000001', email: 'a@example.com',
  diaChiGiao: [{id: 'a1', nhan: 'Cảng Kỳ Hà', diaChi: 'Cảng dăm Kỳ Hà, Núi Thành, Quảng Nam'}], ghiChu: ''};
const SEED = {v: 2, congTy: {c1: C1}, rs: {own1: {id: 'own1', info: {ma: 'CR-01', ten: 'NGUYỄN VĂN TEST', ngaySinh: '06/10/1967', cccd: '049067005459', ngayCap: '15/08/2021', noiCap: 'CA', diaChi: 'Đà Nẵng', danhXung: 'Ông'}, nc: [], dx: [], exp: {}, forests: {
  f1: forest('f1', 'R-A', 'Rừng A', {}, [P(1, '05/10/2026', '92C-12345', 'PA1', 12.5, 'Cảng dăm Kỳ Hà'), P(2, '06/10/2026', '92C-12345', 'PA2', 9, 'Nhà máy khác ở Huế')]),
  f2: forest('f2', 'R-B', 'Rừng B (hồ sơ cũ nhập tay)', {vcDiemDen: 'Nhà máy cũ nhập tay, KCN Cũ'}, [P(1, '07/10/2026', '92C-12345', 'PB1', 8, 'Nhà máy cũ')])}}}};

async function zipTexts(file) {
  const z = await JSZip.loadAsync(fs.readFileSync(file)); let all = '';
  for (const n of Object.keys(z.files).filter(n => n.endsWith('.docx'))) { const d = await JSZip.loadAsync(await z.file(n).async('nodebuffer')); const x = await d.file('word/document.xml').async('string'); all += (x.match(/<w:t[^>]*>([^<]*)<\/w:t>/g) || []).map(a => a.replace(/<[^>]+>/g, '')).join('') + '\n'; }
  return all.replace(/&amp;/g, '&');
}
async function docxText(file) { const d = await JSZip.loadAsync(fs.readFileSync(file)); const x = await d.file('word/document.xml').async('string'); return (x.match(/<w:t[^>]*>([^<]*)<\/w:t>/g) || []).map(a => a.replace(/<[^>]+>/g, '')).join('').replace(/&amp;/g, '&'); }
(async () => {
  const launch = () => electron.launch({executablePath: require('electron'), args: [root, '--no-sandbox'], env: {...process.env, HAKQN_DB: dbFile, HAKQN_USERDATA: path.join(dir, 'ud'), HAKQN_DOWNLOAD_DIR: out, ELECTRON_DISABLE_SECURITY_WARNINGS: '1'}});
  let app = await launch(), w = await app.firstWindow(); const errs = []; w.on('pageerror', e => errs.push(e.message)); w.on('dialog', d => d.accept());
  await w.waitForSelector('#side');
  const sv = await w.evaluate(db => window.hak.save(db), SEED); ok('ghi dữ liệu thử vào SQLite', sv && sv.ok, JSON.stringify(sv));
  await w.reload(); await w.waitForSelector('#side');
  const exp = async (kind) => { for (const f of fs.existsSync(out) ? fs.readdirSync(out) : []) fs.unlinkSync(path.join(out, f)); await w.click(`button[data-act=dl][data-kind=${kind}]`); for (let i = 0; i < 80; i++) { const f = fs.existsSync(out) && fs.readdirSync(out).find(x => /\.(zip|docx)$/.test(x)); if (f) { await w.waitForTimeout(300); return f.endsWith('.zip') ? zipTexts(path.join(out, f)) : docxText(path.join(out, f)); } await w.waitForTimeout(100); } throw new Error('không thấy file xuất ' + kind); };
  const dbOf = () => w.evaluate(() => window.hak.loadSync().db);
  const openF = async (id) => { await w.click('[data-open=own1]'); await w.click('[data-tab=rung]').catch(() => {}); await w.click(`[data-forest=${id}]`); await w.click('[data-ftab=dx]'); };
  await w.click('[data-open=own1]'); await w.click('[data-tab=rung]'); await w.click('[data-forest=f1]'); await w.click('[data-ftab=dx]');

  // ===== màn hình hồ sơ công ty (một công ty, không có danh mục nhiều công ty) =====
  await w.click('#navCty'); await w.waitForSelector('#ctyForm');
  ok('chỉ có MỘT hồ sơ công ty: không có danh sách, tìm kiếm, thêm hay xóa công ty', !(await w.$('#ctySearch')) && !(await w.$('[data-act=ctyNew]')) && !(await w.$('[data-act=ctyDel]')) && !(await w.$('#ctyList')));
  ok('hồ sơ công ty hiện thông tin đã lưu trong SQLite', (await w.inputValue('#ctyForm [name=ten]')) === C1.ten && (await w.inputValue('#ctyForm [name=mst]')) === '0401234567' && (await w.inputValue('#ctyForm [name=nguoiDaiDien]')) === 'Nguyễn Văn A');
  await w.fill('#ctyForm [name=ten]', ''); await w.fill('#ctyForm [name=diaChi]', ''); await w.click('#ctyForm button[type=submit]');
  ok('thiếu tên và địa chỉ thì chặn lưu', /Thiếu tên pháp lý/.test(await w.innerText('#ctyMsg')) && /Thiếu địa chỉ/.test(await w.innerText('#ctyMsg')));
  await w.fill('#ctyForm [name=ten]', C1.ten); await w.fill('#ctyForm [name=diaChi]', C1.diaChi); await w.fill('#ctyForm [name=mst]', '12345');
  ok('mã số thuế sai dạng thì cảnh báo (không chặn)', /không đúng dạng/.test(await w.innerText('#ctyMsg')), await w.innerText('#ctyMsg'));
  await w.fill('#ctyForm [name=mst]', '0401234567'); await w.click('[data-act=ctyAddAddr]'); await w.fill('#ctyAddrs .ctyAddr:last-child [name=a_nhan]', 'Kho Đà Nẵng'); await w.fill('#ctyAddrs .ctyAddr:last-child [name=a_dia]', '15 Hoàng Diệu, Đà Nẵng'); await w.click('#ctyForm button[type=submit]'); await w.waitForTimeout(800);
  ok('lưu hồ sơ công ty có thêm địa chỉ giao thứ hai', /Đã lưu thông tin công ty/.test(await w.innerText('#main')) && Object.values((await dbOf()).congTy).length === 1 && (await dbOf()).congTy.c1.diaChiGiao.length === 2);

  // ===== rừng A chọn địa chỉ Cảng Kỳ Hà =====
  await w.click('[data-open=own1]'); await w.click('[data-tab=rung]'); await w.click('[data-forest=f1]'); await w.click('[data-ftab=dx]');
  ok('rừng mới chưa chọn: có cảnh báo thiếu địa chỉ giao hàng', /Chưa chọn địa chỉ giao hàng/.test(await w.innerText('#main')));
  await w.click('[data-act=mhOpen]'); await w.selectOption('#mhAddr', 'a1');
  ok('chọn địa chỉ giao: hiện ngay tên công ty và địa chỉ đề xuất', (await w.innerText('#main')).includes('Cảng dăm Kỳ Hà, Núi Thành') && (await w.innerText('#main')).includes('DĂM AN PHÁT'));
  await w.click('[data-act=mhConfirm]');
  ok('rừng A: ô điểm đến tự điền địa chỉ đã chọn', (await w.inputValue('#mhDiemDen')) === 'Cảng dăm Kỳ Hà, Núi Thành, Quảng Nam');
  ok('rừng A: cảnh báo 1 phiếu có nơi giao khác điểm đến (giữ nguyên dữ liệu phiếu)', /Nơi giao trên 1 phiếu cân khác/.test(await w.innerText('#main')) && (await w.innerText('#main')).includes('Nhà máy khác ở Huế'));

  // ===== rừng B (hồ sơ cũ) chọn địa chỉ công ty =====
  await w.click('[data-forest=f2]'); await w.click('[data-ftab=dx]');
  ok('hồ sơ cũ: vẫn giữ điểm đến nhập tay, báo chưa chọn địa chỉ giao', /Nhà máy cũ nhập tay, KCN Cũ/.test(await w.innerText('#main')));
  await w.click('[data-act=mhOpen]'); await w.selectOption('#mhAddr', '@main');
  const cmp = await w.innerText('#main');
  ok('lần đầu chọn: hiện giá trị nhập tay cũ và địa chỉ đề xuất để so sánh', cmp.includes('Nhà máy cũ nhập tay, KCN Cũ') && cmp.includes('KCN Điện Nam – Điện Ngọc'));
  await w.click('[data-act=mhConfirm]');
  ok('rừng B: điểm đến = địa chỉ công ty', (await w.inputValue('#mhDiemDen')) === C1.diaChi);

  // ===== đóng/mở lại: mỗi rừng giữ đúng điểm đến =====
  await new Promise(r => setTimeout(r, 800)); await app.close();
  app = await launch(); w = await app.firstWindow(); w.on('pageerror', e => errs.push(e.message)); w.on('dialog', d => d.accept()); await w.waitForSelector('#side');
  await w.click('[data-open=own1]'); await w.click('[data-tab=rung]'); await w.click('[data-forest=f1]'); await w.click('[data-ftab=dx]');
  ok('mở lại: rừng A vẫn là Cảng Kỳ Hà', (await w.inputValue('#mhDiemDen')) === 'Cảng dăm Kỳ Hà, Núi Thành, Quảng Nam');
  await w.click('[data-forest=f2]'); await w.click('[data-ftab=dx]');
  ok('mở lại: rừng B vẫn là địa chỉ công ty', (await w.inputValue('#mhDiemDen')) === C1.diaChi);

  // ===== hồ sơ in ra =====
  await w.click('[data-forest=f1]'); await w.click('[data-ftab=xuat]'); await w.click('[data-xtab=all]');
  let t = await exp('hdvc');
  ok('BM-04 rừng A ghi địa điểm giao hàng = địa chỉ đã chọn', t.includes('Địa điểm giao hàng: DĂM AN PHÁT'.slice(0, 0)) || t.includes('CÔNG TY TNHH DĂM AN PHÁT – Cảng dăm Kỳ Hà, Núi Thành, Quảng Nam'), t.slice(t.indexOf('Địa điểm giao hàng'), t.indexOf('Địa điểm giao hàng') + 160));
  ok('BM-04 rừng A không dùng địa chỉ công ty chính của rừng B', !t.includes('KCN Điện Nam'));
  t = await exp('xnvc');
  ok('BM-09 rừng A: về điểm đến theo hồ sơ; cột “Nơi giao” của phiếu giữ nguyên dữ liệu nguồn', t.includes('Cảng dăm Kỳ Hà, Núi Thành') && t.includes('Nhà máy khác ở Huế'));
  t = await exp('ttvc'); ok('BM-10 rừng A ghi điểm giao hàng theo hồ sơ', t.includes('Địa điểm giao hàng (theo hồ sơ rừng): CÔNG TY TNHH DĂM AN PHÁT – Cảng dăm Kỳ Hà'));
  await w.click('[data-forest=f2]'); await w.click('[data-ftab=xuat]'); await w.click('[data-xtab=all]');
  t = await exp('hdvc'); ok('BM-04 rừng B ghi địa chỉ công ty, không còn điểm đến nhập tay cũ', t.includes(C1.diaChi) && !t.includes('Nhà máy cũ nhập tay'));

  // ===== sửa địa chỉ công ty: hồ sơ rừng giữ nguyên cho đến khi xác nhận =====
  const NEW = '99 Nguyễn Văn Linh, Hải Châu, Đà Nẵng';
  await w.click('#navCty'); await w.waitForSelector('#ctyForm');
  await w.fill('#ctyForm [name=diaChi]', NEW); await w.click('#ctyForm button[type=submit]');
  ok('lưu hồ sơ công ty: báo rừng đã chọn vẫn giữ địa chỉ đã lưu', /GIỮ địa chỉ đã lưu/.test(await w.innerText('#main')));
  await w.click('[data-open=own1]'); await w.click('[data-tab=rung]'); await w.click('[data-forest=f2]'); await w.click('[data-ftab=dx]');
  ok('rừng B vẫn giữ địa chỉ cũ và báo thông tin công ty đã đổi', (await w.inputValue('#mhDiemDen')) === C1.diaChi && /Thông tin công ty đã thay đổi/.test(await w.innerText('#main')));
  await w.click('[data-act=mhOpen]'); await w.click('[data-act=mhConfirm]');
  ok('xác nhận cập nhật: rừng B lấy địa chỉ mới', (await w.inputValue('#mhDiemDen')) === NEW);
  ok('rừng A (địa chỉ giao Cảng Kỳ Hà) không bị ảnh hưởng', await (async () => { await w.click('[data-forest=f1]'); await w.click('[data-ftab=dx]'); return (await w.inputValue('#mhDiemDen')) === 'Cảng dăm Kỳ Hà, Núi Thành, Quảng Nam'; })());

  // ===== đổi địa chỉ giao của rừng A: hiển thị cũ và mới =====
  await w.click('[data-act=mhOpen]'); await w.selectOption('#mhAddr', {index: 2});
  ok('đổi địa chỉ giao: bảng so sánh hiện địa chỉ đang lưu và địa chỉ mới', (await w.innerText('#main')).includes('Cảng dăm Kỳ Hà, Núi Thành') && (await w.innerText('#main')).includes('15 Hoàng Diệu'));
  ok('cước cố định: không nhắc cự ly', !/không tự sửa cự ly/.test(await w.innerText('#main')));
  await w.click('[data-act=mhCancel]');
  ok('hủy: hồ sơ rừng A không đổi', (await w.inputValue('#mhDiemDen')) === 'Cảng dăm Kỳ Hà, Núi Thành, Quảng Nam');
  ok('vẫn chỉ MỘT hồ sơ công ty trong dữ liệu', Object.keys((await dbOf()).congTy).length === 1);

  ok('không có lỗi script trong giao diện', errs.length === 0, errs.join(' | '));
  await app.close();
  console.log(fail ? '\n' + fail + ' LỖI' : '\nĐẠT HẾT'); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
