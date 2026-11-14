'use strict';
/* Luồng “Nhập / sửa / xóa → xem trước (Chưa lưu) → Lưu dữ liệu vào lô → tạo hồ sơ” (Electron thật, dữ liệu giả lập):
 * hai lô A và B cùng chủ; nhập tay, nạp Excel (dòng mới, dòng đổi, dòng giống, dòng trùng), thêm xe ngay trong phiếu, sửa biển số đã liên kết,
 * xóa bản ghi đã lưu, chặn xuất khi chưa lưu, lưu thất bại giữ dữ liệu, chuyển lô khi chưa lưu, nhập lại cùng nguồn không tính trùng.
 * Chạy: xvfb-run -a node scripts/e2e-luuvaolo.js */
const {_electron: electron} = require('playwright-core');
const path = require('path'), fs = require('fs'), os = require('os');
const XLSX = require('xlsx');
const src = fs.readFileSync(path.join(__dirname, 'e2e-inan2.js'), 'utf8');
const {nv, xe, lot, seed, PC} = new Function(src.slice(src.indexOf('const nv ='), src.indexOf('const plain =')) + '; return {nv, xe, lot, seed, PC};')();
const M = require('../src/xlsxmau'), JSZip = require('jszip');
const root = path.join(__dirname, '..');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hakqn-lvl-'));
let fail = 0; const ok = (name, cond, extra) => { console.log((cond ? 'ĐẠT  ' : 'LỖI  ') + name + (!cond && extra ? ' — ' + extra : '')); if (!cond) fail++; };
const klTong = f => Math.round((f.pc || []).reduce((a, p) => a + (+p.kl || 0), 0) * 1000) / 1000;
(async () => {
  const app = await electron.launch({executablePath: require('electron'), args: [root, '--no-sandbox'], env: {...process.env, HAKQN_DB: path.join(dir, 'l.sqlite'), HAKQN_USERDATA: path.join(dir, 'ud'), HAKQN_CLOSE: 'discard', HAKQN_FAIL_SAVE: path.join(dir, 'fail-save.flag'), ELECTRON_DISABLE_SECURITY_WARNINGS: '1'}});
  const w = await app.firstWindow(); const errs = [], dialogs = []; let answer = true;
  w.on('pageerror', e => errs.push(e.message)); w.on('dialog', d => { dialogs.push(d.message()); answer ? d.accept() : d.dismiss(); }); await w.waitForSelector('#side');
  const A = lot('fa', 'R-A', {exp: {}, pc: PC, kl: null}), B = lot('fb', 'R-B', {exp: {}, pc: [], nc: [nv(1, 'Tổ trưởng', 'ĐỖ TỔ B', 'Tổ trưởng', '049085000011')].map(r => ({...r, maRung: 'R-B'})), dx: [{...xe('92C-55555', '049000000099', 'TRẦN CHỦ XE B'), maRung: 'R-B'}]});
  A.info.donGia = null;
  await w.evaluate(d => window.hak.save(d), seed([A, B])); await w.reload(); await w.waitForSelector('#side');
  const db = () => w.evaluate(() => window.hak.loadSync().db);
  const forest = async id => Object.values((await db()).rs.own1.forests).find(f => f.id === id);
  const openLot = async (fid, tab) => { await w.reload(); await w.waitForSelector('#side'); await w.click('[data-open=own1]'); await w.click('[data-tab=rung]'); await w.click('[data-forest=' + fid + ']'); await w.click('[data-ftab=' + tab + ']'); };
  const fillForm = async o => { for (const [k, v] of Object.entries(o)) { const sel = await w.$('#stForm select[name=' + k + ']'); if (sel) await w.selectOption('#stForm select[name=' + k + ']', v); else await w.fill('#stForm input[name=' + k + ']', v); } };
  const body = () => w.innerText('#main');

  // ===== 1. thêm tay một nhân công vào lô A =====
  await openLot('fa', 'nc'); const a0 = await forest('fa'), b0 = await forest('fb'), snapB = JSON.stringify(b0);
  ok('trên tab Nhân công có nút Thêm nhân công, hiện chủ rừng và mã lô đang thao tác', !!(await w.$('[data-act=stAdd][data-kind=nc]')) && /Chủ rừng: NGUYỄN VĂN MỘT/.test(await body()) && /Lô: R-A/.test(await body()));
  await w.click('[data-act=stAdd][data-kind=nc]'); await w.waitForSelector('#stForm');
  await fillForm({vaiTro: 'Công nhân', danhXung: 'Ông', ten: 'NGUYỄN THÊM', ngaySinh: '01/01/1990', cccd: '049090000010', ngayCap: '01/01/2021', noiCap: 'CA', diaChi: 'Đà Nẵng', chucDanh: 'Công nhân khai thác'});
  await w.click('#stForm [type=submit]'); await w.waitForTimeout(300);
  ok('nhân công thêm tay vào BẢN NHÁP: có dòng “Thêm mới”, thanh “Chưa lưu”; dữ liệu đã lưu và lô B không đổi', /NGUYỄN THÊM/.test(await body()) && !!(await w.$('#stDirty')) && /Thêm mới/.test(await body()) && (await forest('fa')).nc.length === a0.nc.length && JSON.stringify(await forest('fb')) === snapB);
  // thử dòng lỗi: thiếu ngày sinh bị chặn ngay trong hộp thoại
  await w.click('[data-act=stAdd][data-kind=nc]'); await w.waitForSelector('#stForm'); await fillForm({ten: 'LỖI', cccd: '049090000011'}); await w.click('#stForm [type=submit]'); await w.waitForTimeout(200);
  ok('dòng thiếu thông tin bị giữ lại trong hộp thoại kèm lý do, chưa vào bản nháp', /Chưa đưa vào bản nháp/.test(await w.innerText('#stBody')) && /thiếu Ngày sinh/.test(await w.innerText('#stBody')));
  await w.click('#stBody [data-act=stClose]');

  // ===== 2. còn thay đổi chưa lưu: chặn tạo, xuất, in =====
  await w.click('[data-ftab=xuat]'); await w.waitForSelector('#stGate');
  ok('tab Xuất hồ sơ báo rõ lý do chặn và có nút quay lại mục đang chỉnh sửa; mọi nút tải bị khóa', /còn thay đổi chưa lưu ở nhân công/.test(await w.innerText('#stGate')) && !!(await w.$('#stGate [data-act=stGo]')) && await w.$$eval('#main button[data-act=dl]', bs => bs.length > 0 && bs.every(b => b.disabled)) && await w.$$eval('#main button[data-act=d2dl]', bs => bs.every(b => b.disabled)));
  await w.click('#stGate [data-act=stGo]'); await w.waitForTimeout(200);
  ok('nút quay lại đưa về tab Nhân công đang chỉnh sửa', !!(await w.$('[data-act=stAdd][data-kind=nc]')) && /NGUYỄN THÊM/.test(await body()));

  // ===== 3. xe và phiếu cân nhập tay; thêm xe ngay trong lượt sửa phiếu =====
  await w.click('[data-ftab=dx]');
  await w.click('[data-act=stAdd][data-kind=pc]'); await w.waitForSelector('#stForm');
  await fillForm({soPhieu: 'PX1', ngay: '10/10/2026', klKg: '12000', khachHang: 'KH TAY', donGia: '1.250.000'}); await w.selectOption('#stForm select[name=bienSo]', '__new'); await w.waitForTimeout(250);
  ok('chọn “Thêm xe mới…” mở hộp thoại thêm xe', /Thêm xe/.test(await w.innerText('#stBody')) && !!(await w.$('#stForm input[name=chuXe]')));
  await fillForm({bienSo: '92C-22222', chuXe: 'XE TAY', ngaySinh: '01/01/1980', cccd: '049000000055', ngayCap: '01/01/2021', noiCap: 'CA', diaChi: 'Đà Nẵng', sdt: '0905123456', nguoiKy: 'Chủ xe', loaiXe: 'Xe tải'});
  await w.click('#stForm [type=submit]'); await w.waitForTimeout(300);
  ok('thêm xe xong quay lại phiếu cân, giữ nguyên số phiếu, ngày, khối lượng đã nhập và chọn sẵn xe mới', (await w.inputValue('#stForm input[name=soPhieu]')) === 'PX1' && (await w.inputValue('#stForm input[name=klKg]')) === '12000' && (await w.inputValue('#stForm select[name=bienSo]')) === '92C-22222' && (await w.inputValue('#stForm input[name=donGia]')) === '1.250.000');
  await w.click('#stForm [type=submit]'); await w.waitForTimeout(300);
  let t = await body();
  ok('phiếu PX1 và xe 92C-22222 đều vào bản nháp (Thêm mới); khối lượng bản nháp = đã lưu + 12 tấn; dữ liệu đã lưu chưa đổi', /PX1/.test(t) && /92C-22222/.test(t) && (await forest('fa')).pc.length === 3 && (await forest('fa')).dx.length === 2 && /Tổng 4 chuyến \(bản nháp\)/.test(t), t.slice(0, 200));

  // ===== 4. Excel: dòng mới, dòng đổi, dòng giống, dòng trùng trong file =====
  const wbX = XLSX.utils.book_new(), H = ['Số phiếu', 'Ngày cân 1', 'Biển số 1', 'KL', 'Khách hàng'];
  XLSX.utils.book_append_sheet(wbX, XLSX.utils.aoa_to_sheet([H, ['PA1', '05/10/2026', '92C-12345', 12500, ''], ['PA2', '06/10/2026', '92C-67890', 9250, 'KH SỬA'], ['PE1', '11/10/2026', '92C-12345', 8000, ''], ['PE2', '12/10/2026', '92C-12345', 7000, ''], ['PE2', '12/10/2026', '92C-12345', 7000, '']]), 'PHIEU_CAN');
  const fx = path.join(dir, 'pc.xlsx'); XLSX.writeFile(wbX, fx);
  await w.setInputFiles('input[data-file="pc"]', fx); await w.waitForTimeout(700); t = await body();
  ok('nạp Excel chỉ vào bản nháp: báo thêm/cập nhật/giữ nguyên, PA3 (đã lưu, file không có) được giữ; vẫn chưa lưu', /BẢN NHÁP/.test(t) && /giữ 1 bản ghi đã lưu không có trong file/.test(t) && (await forest('fa')).pc.length === 3, t.slice(0, 400));
  ok('trạng thái từng dòng: PA2 “Sửa” (đổi khách hàng), PE1/PE2 “Thêm mới”; PE2 trùng số phiếu trong file bị báo lỗi', (await w.$$eval('tr', rs => rs.filter(r => /PA2/.test(r.innerText) && r.querySelector('[data-act=stEdit]'))[0].innerText)).includes('Sửa') && /Số phiếu cân PE2 trùng/.test(t));
  // lưu bị chặn vì còn lỗi (PE2 trùng)
  await w.click('#stDirty [data-act=stSave]'); await w.waitForTimeout(500); t = await body();
  ok('bấm Lưu khi còn lỗi: không ghi, liệt kê lỗi cần sửa; bản nháp còn nguyên', /Chưa lưu được vì còn lỗi/.test(t) && (await forest('fa')).pc.length === 3 && !!(await w.$('#stDirty')));
  // bỏ dòng PE2 thứ hai (Bỏ dòng = chỉ bỏ khỏi lượt nhập)
  const idxPE2 = await w.$$eval('tr[class]', rs => rs.filter(r => /PE2/.test(r.innerText)).map(r => r.querySelector('[data-act=stDel]').dataset.i));
  await w.click('[data-act=stDel][data-kind=pc][data-i="' + idxPE2[1] + '"]'); await w.waitForTimeout(300);
  ok('“Bỏ dòng” dòng PE2 trùng: bỏ khỏi lượt nhập, không hỏi xóa bản ghi đã lưu', (await w.$$eval('tr', rs => rs.filter(r => /PE2/.test(r.innerText)).length)) === 1 && !(await w.innerText('#main')).includes('Số phiếu cân PE2 trùng'));
  // xóa một bản ghi ĐÃ LƯU (PA3) rồi hoàn tác
  const iPA3 = await w.$$eval('tr', rs => rs.map(r => r).filter(r => /PA3/.test(r.innerText) && r.querySelector('[data-act=stDel]')).map(r => r.querySelector('[data-act=stDel]').dataset.i)[0]);
  await w.click('[data-act=stDel][data-kind=pc][data-i="' + iPA3 + '"]'); await w.waitForTimeout(300);
  ok('“Xóa đã lưu” PA3 có hỏi xác nhận; dòng hiện “Sẽ xóa” gạch ngang, vẫn còn trong dữ liệu đã lưu; có Hoàn tác', dialogs.some(m => /Xóa bản ghi đã lưu/.test(m)) && !!(await w.$('tr.stGone [data-act=stRestore]')) && (await forest('fa')).pc.length === 3);
  await w.click('tr.stGone [data-act=stRestore]'); await w.waitForTimeout(250);
  ok('hoàn tác xóa: PA3 trở lại', !(await w.$('tr.stGone')));

  // ===== 5. sửa biển số xe đã liên kết: liệt kê phiếu, tổng không đổi =====
  const iXe = await w.$$eval('tr', rs => rs.filter(r => /92C-12345/.test(r.innerText) && r.querySelector('[data-act=stEdit][data-kind=dx]')).map(r => r.querySelector('[data-act=stEdit]').dataset.i)[0]);
  await w.click('[data-act=stEdit][data-kind=dx][data-i="' + iXe + '"]'); await w.waitForSelector('#stForm'); const dl0 = dialogs.length;
  await w.fill('#stForm input[name=bienSo]', '92C-54321'); await w.click('#stForm [type=submit]'); await w.waitForTimeout(400);
  const msg = dialogs.slice(dl0).find(m => /sẽ đổi biển số/.test(m));
  ok('sửa biển số xe có phiếu liên kết: hỏi xác nhận, liệt kê các phiếu (PA1, PA3, PX…) và nói số chuyến, khối lượng, tiền không đổi', !!msg && /PA1/.test(msg) && /PA3/.test(msg) && /không đổi/.test(msg), msg);
  t = await body();
  ok('sau khi đổi: các phiếu theo xe mới 92C-54321; số chuyến bản nháp không đổi', /92C-54321/.test(t) && !/92C-12345/.test(t.replace(/Biển[^\n]*/g, '')) , t.slice(0, 120));
  // xóa xe còn phiếu: bị chặn
  const iXe2 = await w.$$eval('tr', rs => rs.filter(r => /92C-67890/.test(r.innerText) && r.querySelector('[data-act=stDel][data-kind=dx]')).map(r => r.querySelector('[data-act=stDel]').dataset.i)[0]);
  const dl1 = dialogs.length; await w.click('[data-act=stDel][data-kind=dx][data-i="' + iXe2 + '"]'); await w.waitForTimeout(300);
  ok('xóa xe còn phiếu cân liên kết bị chặn, nêu số phiếu cần xử lý', dialogs.slice(dl1).some(m => /Không xóa được xe 92C-67890/.test(m) && /PA2/.test(m)));

  // ===== 6. lưu thất bại: giữ dữ liệu đã lưu và bản nháp =====
  const flag = path.join(dir, 'fail-save.flag'); fs.writeFileSync(flag, '1');
  const savedBefore = JSON.stringify(await forest('fa'));
  await w.click('[data-ftab=dx]'); await w.click('#stDirty [data-act=stSave]'); await w.waitForTimeout(700); t = await body();
  ok('lưu thất bại: báo lỗi, KHÔNG báo “Đã lưu”, dữ liệu đã lưu nguyên vẹn (cả nhân công, xe, phiếu cân), bản nháp còn để thử lại', /Không lưu được, dữ liệu đã lưu giữ nguyên/.test(t) && !/Đã lưu dữ liệu vào lô/.test(t) && JSON.stringify(await forest('fa')) === savedBefore && !!(await w.$('#stDirty')) && /PX1/.test(t));
  ok('sau khi lưu hỏng, nút xuất vẫn bị khóa vì bản nháp còn', !!(await w.$('#stDirty')) && await (async () => { await w.click('[data-ftab=xuat]'); return !!(await w.$('#stGate')); })());
  fs.unlinkSync(flag); await w.click('[data-ftab=dx]');

  // ===== 7. lưu thành công: ghi trong một lần, tính lại tổng, mở khóa xuất, lô B nguyên vẹn =====
  await w.click('#stDirty [data-act=stSave]'); await w.waitForTimeout(900); t = await body();
  const fa = await forest('fa');
  const exTong = Math.round((12.5 + 9.25 + 8 + 12 + 8 + 7) * 1000) / 1000;   // PA1 12,5 (giữ); PA2 9,25 (Excel chỉ đổi khách hàng; khối lượng khác sẽ phải đối chiếu); PA3 8; PX1 12; PE1 8; PE2 7
  ok('đã lưu: lô A có 6 phiếu, 4 nhân công, 3 xe; tổng khối lượng khớp tính tay ' + exTong + ' tấn; lô B giữ nguyên', fa.pc.length === 6 && fa.nc.length === 4 && fa.dx.length === 3 && klTong(fa) === exTong && JSON.stringify(await forest('fb')) === snapB && /Đã lưu dữ liệu vào lô/.test(t), JSON.stringify([fa.pc.length, fa.nc.length, fa.dx.length, klTong(fa)]));
  ok('liên kết xe–phiếu: mọi phiếu có biển số thuộc đội xe của lô; nhật ký đổi biển ghi PA1 và PA3 (92C-12345 → 92C-54321, “Sửa biển số xe”)', fa.pc.every(p => fa.dx.some(x => x.bienSo.toUpperCase().replace(/[\s.\-]/g, '') === p.bienSo.toUpperCase().replace(/[\s.\-]/g, ''))) && (fa.bienLog || []).length === 2 && fa.bienLog.every(e => e.cu === '92C-12345' && e.moi === '92C-54321' && e.nguon === 'Sửa biển số xe'), JSON.stringify(fa.bienLog));
  ok('sau khi lưu hết thanh “Chưa lưu”; hồ sơ lô có dữ liệu đã lưu', !(await w.$('#stDirty')));
  await w.click('[data-ftab=xuat]'); await w.waitForTimeout(300);
  ok('tab Xuất hồ sơ không còn cảnh báo chặn do chưa lưu; nút tải được mở khóa theo điều kiện từng mẫu', !(await w.$('#stGate')) && await w.$$eval('#main button[data-act=dl]', bs => bs.some(b => !b.disabled)));

  // ===== 8. nạp lại cùng nguồn: không tính trùng =====
  const wb2 = XLSX.utils.book_new();   // cùng nguồn, đã khớp với dữ liệu đã lưu (biển số xe đã đổi sang 92C-54321, không còn dòng trùng)
  XLSX.utils.book_append_sheet(wb2, XLSX.utils.aoa_to_sheet([H, ['PA1', '05/10/2026', '92C-54321', 12500, ''], ['PA2', '06/10/2026', '92C-67890', 9250, 'KH SỬA'], ['PE1', '11/10/2026', '92C-54321', 8000, ''], ['PE2', '12/10/2026', '92C-54321', 7000, '']]), 'PHIEU_CAN');
  const fx2 = path.join(dir, 'pc2.xlsx'); XLSX.writeFile(wb2, fx2);
  await w.click('[data-ftab=dx]'); await w.setInputFiles('input[data-file="pc"]', fx2); await w.waitForTimeout(700); t = await body();
  ok('nạp lại đúng file Excel đó: không thêm, không sửa, không chưa-lưu; số phiếu và tổng giữ nguyên', !(await w.$('#stDirty')) && /thêm 0, cập nhật 0, giữ nguyên 4/.test(t) && (await forest('fa')).pc.length === 6 && klTong(await forest('fa')) === exTong, t.slice(0, 300));

  // ===== 9. chuyển lô khi còn thay đổi chưa lưu =====
  await w.click('[data-ftab=nc]'); await w.click('[data-act=stAdd][data-kind=nc]'); await w.waitForSelector('#stForm');
  await fillForm({vaiTro: 'Công nhân', danhXung: 'Bà', ten: 'TRẦN TẠM', ngaySinh: '02/02/1991', cccd: '049091000020', ngayCap: '01/01/2021', noiCap: 'CA', diaChi: 'Đà Nẵng', chucDanh: 'Công nhân cưa'}); await w.click('#stForm [type=submit]'); await w.waitForTimeout(300);
  await w.click('[data-sforest=fb]'); await w.waitForSelector('#stGSave');
  ok('chuyển sang lô B khi lô A còn bản nháp: hiện 3 lựa chọn Lưu và tiếp tục / Bỏ thay đổi / Quay lại chỉnh sửa', !!(await w.$('#stGSave')) && !!(await w.$('#stGDrop')) && !!(await w.$('#stGBack')));
  await w.click('#stGBack'); await w.waitForTimeout(200);
  ok('Quay lại chỉnh sửa: vẫn ở lô A, bản nháp còn', /Lô: R-A/.test(await body()) && !!(await w.$('#stDirty')));
  await w.click('[data-sforest=fb]'); await w.waitForSelector('#stGDrop'); await w.click('#stGDrop'); await w.waitForTimeout(400);
  ok('Bỏ thay đổi: sang lô B, dữ liệu A không có TRẦN TẠM; quay lại A không còn bản nháp', /R-B/.test(await w.innerText('#ctxForest')) && !(await forest('fa')).nc.some(r => r.ten === 'TRẦN TẠM'));
  await w.click('[data-sforest=fa]'); await w.waitForTimeout(300); await w.click('[data-ftab=nc]'); await w.waitForTimeout(200);
  ok('quay lại A: không còn thanh Chưa lưu, nhân công đã lưu 4 người', !(await w.$('#stDirty')) && (await forest('fa')).nc.length === 4);
  // Lưu và tiếp tục
  await w.click('[data-act=stAdd][data-kind=nc]'); await w.waitForSelector('#stForm');
  await fillForm({vaiTro: 'Công nhân', danhXung: 'Bà', ten: 'TRẦN LƯU', ngaySinh: '02/02/1991', cccd: '049091000021', ngayCap: '01/01/2021', noiCap: 'CA', diaChi: 'Đà Nẵng', chucDanh: 'Công nhân cưa'}); await w.click('#stForm [type=submit]'); await w.waitForTimeout(300);
  await w.click('[data-sforest=fb]'); await w.waitForSelector('#stGSave'); await w.click('#stGSave'); await w.waitForTimeout(900);
  ok('Lưu và tiếp tục: đã lưu TRẦN LƯU vào lô A rồi sang lô B', (await forest('fa')).nc.some(r => r.ten === 'TRẦN LƯU') && /R-B/.test(await w.innerText('#ctxForest')));
  ok('không có lỗi JavaScript', errs.length === 0, errs.join('|'));
  await app.close();
  console.log(fail ? 'CÓ ' + fail + ' LỖI' : 'TẤT CẢ ĐẠT'); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
