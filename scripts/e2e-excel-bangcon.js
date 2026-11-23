'use strict';
/* Nhập Excel theo bảng con: file nhân công, xe, phiếu cân vào đúng ĐỘI / ĐỘI XE bằng cột tùy chọn Đội, Đội xe, Đội; tên lạ báo lỗi dòng; file cũ không có cột mới nạp y như trước (Electron thật, SQLite thật).
 * Chạy: xvfb-run -a node scripts/e2e-excel-bangcon.js */
const {_electron: electron} = require('playwright-core');
const {xacNhanHopDongPhieu} = require('./lib-stage');
const path = require('path'), fs = require('fs'), os = require('os');
const XLSX = require('xlsx');
const src = fs.readFileSync(path.join(__dirname, 'e2e-inan2.js'), 'utf8');
const {nv, xe, lot, seed} = new Function(src.slice(src.indexOf('const nv ='), src.indexOf('const plain =')) + '; return {nv, xe, lot, seed};')();
const root = path.join(__dirname, '..');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hakqn-xlsxbc-'));
let fail = 0; const ok = (name, cond, extra) => { console.log((cond ? 'ĐẠT  ' : 'LỖI  ') + name + (!cond && extra ? ' — ' + extra : '')); if (!cond) fail++; };
const book = (sheet, rows, name) => { const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), sheet); const f = path.join(dir, name); XLSX.writeFile(wb, f); return f; };
(async () => {
  const app = await electron.launch({executablePath: require('electron'), args: [root, '--no-sandbox'], env: {...process.env, HAKQN_TEST_LEGACY_IMPORT: '1', HAKQN_CLOSE: 'discard', HAKQN_DB: path.join(dir, 'd.sqlite'), HAKQN_USERDATA: path.join(dir, 'ud'), HAKQN_DOWNLOAD_DIR: path.join(dir, 'out')}});
  const w = require('./_hd30').boc(await app.firstWindow()); const errs = []; w.on('pageerror', e => errs.push(e.message)); w.on('dialog', d => d.accept()); await w.waitForSelector('#side');
  const p = (i, vai, ten, cd, doi) => ({...nv(i, vai, ten, cd, '04908500' + String(6000 + i)), doi});
  const nc = [p(1, 'Tổ trưởng', 'TRẦN MỘT', 'Tổ trưởng', 'Đội 1'), p(2, 'Công nhân', 'LÊ A', 'Công nhân khai thác', 'Đội 1'), p(3, 'Tổ trưởng', 'NGUYỄN HAI', 'Tổ trưởng', 'Đội 2'), p(4, 'Công nhân', 'PHẠM B', 'Công nhân khai thác', 'Đội 2')];
  const A = lot('fa', 'R-A', {exp: {soKT: '015', ngayKy: '02/10/2026'}, kl: null, nc, dx: [xe('92C-12345', '049000000077', 'LÊ VĂN MỘT'), xe('92C-67890', '049000000078', 'TRẦN VĂN HAI')], pc: []});
  const B = lot('fb', 'R-B', {exp: {}, kl: null, pc: []}); B.nc = B.nc.map(r => ({...r, maRung: 'R-B'})); B.dx = [{...xe('92C-12345', '049000000077', 'LÊ VĂN MỘT'), maRung: 'R-B'}];
  await w.evaluate(d => window.hak.save(d), seed([A, B])); await w.reload(); await w.waitForSelector('#side');
  const db = async () => (await w.evaluate(() => window.hak.loadSync().db)).rs.own1.forests;
  const open = async (id, ftab) => { await w.click('[data-open=own1]'); await w.click('[data-tab=rung]'); await w.click('[data-forest=' + id + ']'); await w.click('[data-ftab=' + ftab + ']'); await w.waitForTimeout(300); };
  const save = async () => { await w.click('button[data-act=stSave]'); await w.waitForTimeout(500); };
  const person = (stt, ten, cccd, doi) => { const o = {'Chức vụ': 'Công nhân', 'STT': stt, 'Danh xưng': 'Ông', 'Họ và tên': ten, 'Ngày sinh': '01/01/1990', 'CCCD': cccd, 'Ngày cấp CCCD': '01/01/2021', 'Nơi cấp CCCD': 'CA', 'Địa chỉ thường trú': 'Đà Nẵng', 'Vị trí': 'Công nhân khai thác'}; if (doi !== undefined) o['Đội'] = doi; return o; };
  const car = (bien, chu, cccd, doiXe) => { const o = {'STT': 1, 'Chủ xe (bên vận chuyển)': chu, 'Ngày sinh chủ xe': '01/01/1980', 'CCCD chủ xe': cccd, 'Ngày cấp CCCD chủ xe': '01/01/2021', 'Nơi cấp CCCD chủ xe': 'CA', 'Thường trú chủ xe': 'Đà Nẵng', 'Biển kiểm soát': bien, 'Loại xe': 'Xe tải', 'Người ký HĐ vận chuyển': 'Chủ xe', 'Ngày đến hạn bảo hiểm': '31/12/2027', 'Kiểm định đến ngày': '31/12/2027', 'SĐT': '0905123456'}; if (doiXe !== undefined) o['Đội xe'] = doiXe; return o; };
  const phieu = (so, ngay, bien, kl, doi) => { const o = {'Số phiếu': so, 'Ngày cân 1': ngay, 'Biển số 1': bien, 'KL': kl}; if (doi !== undefined) o['Đội'] = doi; return o; };
  // 1. nhân công: cột Đội khớp tên đội → vào đội đó; tên lạ → lỗi dòng, không lưu được
  await open('fa', 'nc');
  await w.setInputFiles('input[data-file="nc"]', book('NHAN_CONG', [person(5, 'ĐỖ NĂM', '049085006005', 'Đội 2'), person(6, 'HỒ SÁU', '049085006006', 'Đội 9')], 'nc1.xlsx')); await w.waitForTimeout(800);
  let t = await w.innerText('#main');
  ok('file nhân công: tên đội lạ “Đội 9” báo lỗi dòng nêu rõ người và tên đội', /Đội “Đội 9” của “HỒ SÁU” không có Tổ trưởng/.test(t), t.slice(0, 500));
  await w.setInputFiles('input[data-file="nc"]', book('NHAN_CONG', [person(5, 'ĐỖ NĂM', '049085006005', 'Đội 2'), person(6, 'HỒ SÁU', '049085006006', 'Đội 1')], 'nc2.xlsx')); await w.waitForTimeout(800);
  if (process.env.DBG) console.log('NC2>>', (await w.innerText('#main')).slice(0, 900).replace(/\n/g, ' | '));
  await save(); let F = await db(), d2 = F.fa.doi.find(d => d.ten === 'Đội 2').id, d1 = F.fa.doi.find(d => d.ten === 'Đội 1').id;
  ok('ghi tên đội khác thì người vào đúng đội đó: ĐỖ NĂM → Đội 2, HỒ SÁU → Đội 1', (F.fa.nc.find(r => r.ten === 'ĐỖ NĂM') || {}).doiId === d2 && (F.fa.nc.find(r => r.ten === 'HỒ SÁU') || {}).doiId === d1, JSON.stringify(F.fa.nc.map(r => r.ten + ':' + r.doiId)));
  await w.click('[data-act=chonDoi][data-doi="' + d2 + '"]'); await w.waitForTimeout(300);
  await w.setInputFiles('input[data-file="nc"]', book('NHAN_CONG', [person(8, 'MAI TÁM', '049085006008')], 'nc4.xlsx')); await w.waitForTimeout(800); await save(); F = await db();
  ok('lô nhiều đội: file nhân công KHÔNG có cột Đội vào ĐỘI ĐANG CHỌN (Đội 2)', (F.fa.nc.find(r => r.ten === 'MAI TÁM') || {}).doiId === d2, JSON.stringify(F.fa.nc.map(r => r.ten + ':' + r.doiId)));
  // nạp lại đúng file đã lưu (có cột Đội): các dòng phải là “giữ nguyên”, không bị coi là sửa vì chữ ở cột Đội đã bỏ sau khi có đội (v6)
  await w.setInputFiles('input[data-file="nc"]', book('NHAN_CONG', [person(5, 'ĐỖ NĂM', '049085006005', 'Đội 2'), person(6, 'HỒ SÁU', '049085006006', 'Đội 1')], 'nc2.xlsx')); await w.waitForTimeout(800);
  { const t2 = await w.innerText('#main'); ok('nạp lại file nhân công đã lưu (có cột Đội): thêm 0, cập nhật 0, giữ nguyên 2', /thêm 0, cập nhật 0, giữ nguyên 2/.test(t2), t2.slice(0, 300)); }
  if (await w.$('button[data-act=stDiscard]')) { await w.click('button[data-act=stDiscard]'); await w.waitForTimeout(300); }
  // 2. xe: cột Đội xe khớp tên người ký của đội xe → xe vào đội xe đó; tên lạ → lỗi dòng
  await open('fa', 'dx');
  await w.setInputFiles('input[data-file="dx"]', book('DOI_XE', [car('92C-11111', 'PHẠM XE BA', '049000000079', 'LÊ VĂN MỘT'), car('92C-22222', 'BÙI XE BỐN', '049000000080', 'KHÔNG CÓ')], 'dx1.xlsx')); await w.waitForTimeout(800);
  t = await w.innerText('#main');
  ok('file xe: tên đội xe lạ báo lỗi dòng, nêu tên và cách xử lý', /Đội xe “KHÔNG CÓ” không có trong lô/.test(t), t.slice(0, 500));
  await w.click('button[data-act=stDiscard]'); await w.waitForTimeout(400);
  await w.setInputFiles('input[data-file="dx"]', book('DOI_XE', [car('92C-11111', 'PHẠM XE BA', '049000000079', 'LÊ VĂN MỘT'), car('92C-33333', 'ĐẶNG XE NĂM', '049000000081')], 'dx2.xlsx')); await w.waitForTimeout(800);
  await save(); F = await db(); const hdMot = F.fa.dx.find(x => x.bienSo === '92C-12345').hdvcId, x3 = F.fa.dx.find(x => x.bienSo === '92C-11111'), x5 = F.fa.dx.find(x => x.bienSo === '92C-33333');
  ok('xe ghi Đội xe “LÊ VĂN MỘT” vào đúng đội xe đó (cùng hợp đồng với xe 92C-12345)', x3 && x3.hdvcId === hdMot, JSON.stringify(F.fa.dx.map(x => x.bienSo + ':' + x.hdvcId)));
  ok('xe không ghi Đội xe: (3.0) nạp ở trang chi tiết hợp đồng → vào hợp đồng đang mở (của LÊ VĂN MỘT)', x5 && x5.hdvcId === hdMot, JSON.stringify(x5));
  // 3. phiếu cân: cột Đội
  await w.setInputFiles('input[data-file="pc"]', book('PHIEU_CAN', [phieu('PX1', '05/10/2026', '92C-12345', 12500, 'Đội 2'), phieu('PX2', '06/10/2026', '92C-12345', 9000, 'Đội 9')], 'pc1.xlsx')); await w.waitForTimeout(800);
  t = await w.innerText('#main');
  ok('file phiếu cân: tên đội lạ báo lỗi dòng', /Đội “Đội 9” không có trong lô/.test(t), t.slice(0, 500));
  await w.click('button[data-act=stDiscard]'); await w.waitForTimeout(400);
  await w.setInputFiles('input[data-file="pc"]', book('PHIEU_CAN', [phieu('PX1', '05/10/2026', '92C-12345', 12500, 'Đội 2'), phieu('PX2', '06/10/2026', '92C-12345', 9000), phieu('PX3', '07/10/2026', '92C-67890', 6000, 'Đội 1')], 'pc2.xlsx')); await w.waitForTimeout(800);
  await xacNhanHopDongPhieu(w); await save(); F = await db(); const pcs = Object.fromEntries(F.fa.pc.map(x => [x.soPhieu, x.doiId]));
  ok('phiếu ghi tên đội vào đúng đội; phiếu để trống cột Đội chưa gán (lô nhiều đội)', pcs.PX1 === d2 && pcs.PX3 === d1 && pcs.PX2 === '', JSON.stringify(pcs));
  // 4. lô một đội, file cũ không có cột mới: nạp y như trước, phiếu tự thuộc đội duy nhất
  await open('fb', 'dx');
  await w.setInputFiles('input[data-file="pc"]', book('PHIEU_CAN', [phieu('PB1', '05/10/2026', '92C-12345', 5000)], 'pc3.xlsx')); await w.waitForTimeout(800); await save(); F = await db();
  ok('lô một đội: file phiếu cân không có cột Đội nạp như trước, phiếu tự thuộc đội duy nhất', F.fb.pc.length === 1 && F.fb.pc[0].doiId === F.fb.doi[0].id, JSON.stringify(F.fb.pc));
  await open('fb', 'nc');
  await w.setInputFiles('input[data-file="nc"]', book('NHAN_CONG', [person(7, 'VÕ BẢY', '049085006007')], 'nc3.xlsx')); await w.waitForTimeout(800); await save(); F = await db();
  ok('lô một đội: file nhân công không có cột Đội nạp như trước, người vào đội duy nhất', (F.fb.nc.find(r => r.ten === 'VÕ BẢY') || {}).doiId === F.fb.doi[0].id);
  ok('không có lỗi script trên màn hình', errs.length === 0, errs.join(' | '));
  await app.close(); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
