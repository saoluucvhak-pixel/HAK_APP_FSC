'use strict';
/* HỢP ĐỒNG (cha) → NGƯỜI / XE / PHIẾU CÂN (con), chọn từ Danh mục (ui/app/30). Electron thật + SQLite thật, dữ liệu giả lập, không dùng mạng:
 *  - Danh mục: tải file mẫu Excel lao động / xe, nạp file đó vào danh mục;
 *  - tab Nhân công: không còn nút nạp Excel / dán Excel theo lô; chọn nhiều người từ Danh mục vào ĐỘI đang chọn (vai trò, vị trí hợp lệ ngay), đội thứ hai có người riêng,
 *    số người của đội = số người đã chọn;
 *  - tab Vận chuyển: phải có hợp đồng vận chuyển trước; chọn xe từ Danh mục vào HỢP ĐỒNG đang chọn; bảng xe và phiếu cân lọc theo hợp đồng;
 *  - phiếu cân là bảng con của hợp đồng (theo biển số xe), phiếu biển lạ được nêu “chưa khớp xe”; có nút Tra cứu Google Sheets (HoSoKeo);
 *  - dữ liệu lưu đúng quan hệ: nc.doiId, dx.hdvcId.
 * Chạy: xvfb-run -a node scripts/e2e-hop-dong-con.js */
const {_electron: electron} = require('playwright-core');
const path = require('path'), fs = require('fs'), os = require('os');
const root = path.join(__dirname, '..');
const base = fs.mkdtempSync(path.join(os.tmpdir(), 'hakqn-hdc-')), ud = path.join(base, 'ud'), dl = path.join(base, 'tai-ve');
let fail = 0; const ok = (name, cond, extra) => { console.log((cond ? 'ĐẠT  ' : 'LỖI  ') + name + (!cond && extra ? ' — ' + extra : '')); if (!cond) fail++; };
const settle = async (w, cond, ms = 8000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await cond()) return true; await w.waitForTimeout(150); } return cond(); };
const ld = ['NGUYỄN VĂN AN', 'TRẦN THỊ BÌNH', 'LÊ VĂN CƯỜNG', 'PHẠM VĂN DŨNG', 'HỒ THỊ EM', 'VÕ VĂN GIANG'].map((ten, i) => ({ngayCapNhat: '01/01/2026', cccd: '04908500000' + i, ten, gioiTinh: i === 1 || i === 4 ? 'Nữ' : 'Nam', ngaySinh: '0' + (i + 1) + '/02/1985', diaChi: 'Thôn ' + (i + 1) + ', xã Quế Sơn, Đà Nẵng', ngayCap: '01/01/2021', noiCap: 'Cục CS QLHC', sdt: '', chucVu: i === 0 || i === 5 ? 'Tổ trưởng' : 'Công nhân', viTri: ''}));
const xe = ['92C-11111', '92C-22222', '92H-33333', '43C-44444'].map((b, i) => ({ngayCapNhat: '01/01/2026', bienSo: b, chuXe: 'CHỦ XE ' + (i + 1), taiXe: 'TÀI XẾ ' + (i + 1), cccdTx: '04908000001' + i, diaChiTx: 'Đà Nẵng', ngayCapTx: '01/01/2021', noiCapTx: 'CA', gplx: '4900' + i, hanGplx: '01/01/2030', hanDangKiem: '01/01/2030', hanBaoHiem: '01/01/2030', loaiXe: 'Xe tải', cccd: '04907000001' + i, ngaySinh: '01/01/1980', ngayCap: '01/01/2021', noiCap: 'CA', diaChi: 'Đà Nẵng', sdt: '0905000' + i, nguoiKy: 'Chủ xe'}));
const seed = {v: 2, rs: {own1: {id: 'own1', info: {ma: 'CR-01', ten: 'NGUYỄN VĂN HIỂN', cccd: '049069018510', danhXung: 'Ông', ngayCap: '15/08/2021', noiCap: 'CA', diaChi: 'Đà Nẵng'}, forests: {fa: {id: 'fa', info: {maRung: 'HDC-R1', tenRung: 'Rừng 1', diaDiem: 'Thôn A', dienTich: 5, tuNgay: '01/10/2026', denNgay: '30/10/2026', giayTo: []}, nc: [], dx: [], pc: [], exp: {}}}}}, dmLaoDong: ld, dmXeVC: xe};
(async () => {
  const errs = [];
  const app = await electron.launch({executablePath: require('electron'), args: [root, '--no-sandbox'], env: {...process.env, HAKQN_USERDATA: ud, HAKQN_CLOSE: 'discard', HAKQN_DOWNLOAD_DIR: dl, ELECTRON_DISABLE_SECURITY_WARNINGS: '1'}});
  const w = await app.firstWindow(); w.on('pageerror', e => errs.push(e.message)); w.on('dialog', d => d.accept()); await w.waitForSelector('#side');
  ok('ghi hồ sơ và danh mục giả lập', (await w.evaluate(d => window.hak.save(d), seed)).ok);
  await w.reload(); await w.waitForSelector('#side');
  const lo = () => w.evaluate(() => window.hak.loadSync().db.rs.own1.forests.fa);
  const luu = () => w.evaluate(async () => { const r = await window.__stSaveCurrent(); return {ok: !!(r && r.ok), errs: (r && r.errs) || [], error: r && r.error}; });

  // ----- Danh mục: file mẫu Excel và nạp vào danh mục -----
  await w.click('#navDm'); await w.click('[data-dmtab=xe]'); await w.waitForSelector('#dmMau_xe');
  await w.click('#dmMau_xe'); const fXe = path.join(dl, 'HAK_Mau_DanhMuc_Xe.xlsx');
  ok('Danh mục xe: tải được file mẫu Excel', await settle(w, async () => fs.existsSync(fXe)));
  await w.setInputFiles('input[data-dmfile=xe]', fXe);
  ok('Danh mục xe: nạp file mẫu thêm xe ví dụ vào danh mục', await settle(w, async () => (await w.evaluate(() => (window.hak.loadSync().db.dmXeVC || []).length)) === 5), String(await w.evaluate(() => (window.hak.loadSync().db.dmXeVC || []).length)));
  await w.click('[data-dmtab=laodong]'); await w.waitForSelector('#dmMau_ld'); await w.click('#dmMau_ld');
  ok('Danh mục lao động: tải được file mẫu Excel', await settle(w, async () => fs.existsSync(path.join(dl, 'HAK_Mau_DanhMuc_LaoDong.xlsx'))));

  // ----- tab Nhân công: hợp đồng (đội) → nhân công chọn từ danh mục -----
  await w.click('#side [data-open=own1]'); await w.click('[data-tab=rung]'); await w.click('[data-forest=fa]'); await w.click('[data-ftab=nc]'); await w.waitForSelector('#doiKT');
  ok('tab Nhân công: không còn nút nạp Excel, tải mẫu, dán Excel theo lô', !(await w.$('#main [data-act=tpl][data-kind=nc]')) && !(await w.$('#main [data-act=danMo][data-kind=nc]')) && !(await w.isVisible('#main input[data-file=nc]')) && !/Chọn file Excel/.test(await w.innerText('#main')));
  ok('tab Nhân công: tiêu đề hợp đồng nhân công và bảng con của đội', /Hợp đồng nhân công: 1 hợp đồng/.test(await w.innerText('#doiKT')) && /Nhân công của đội/.test(await w.innerText('#ncCon')));
  await w.click('#dmChon_nc'); await w.waitForSelector('#dmcTbl');
  ok('hộp chọn: liệt kê đủ 6 người của danh mục, nút thêm chưa bật', (await w.$$('#dmcTbl [data-dmc]')).length === 6 && await w.isDisabled('#dmcXong'));
  await w.fill('#dmcQ', 'van'); await w.waitForTimeout(150);
  ok('hộp chọn: tìm không dấu “van” còn 4 người có chữ VĂN (bỏ dấu, không phân biệt hoa thường)', (await w.$$('#dmcTbl [data-dmc]')).length === 4, String((await w.$$('#dmcTbl [data-dmc]')).length));
  await w.fill('#dmcQ', ''); await w.waitForTimeout(150);
  for (const c of ['049085000000', '049085000001', '049085000002']) await w.check('[data-dmc="' + c + '"]');
  ok('hộp chọn: nút ghi đúng số người đã chọn', /Thêm 3 người vào đội/.test(await w.innerText('#dmcXong')));
  await w.click('#dmcXong'); await w.waitForSelector('#stDirty');
  let r = await luu(); ok('lưu đội 1 không lỗi (vai trò, vị trí hợp lệ ngay khi chọn)', r.ok, JSON.stringify(r));
  let f = await lo();
  ok('đội 1: 3 người, đúng một Tổ trưởng (theo chức vụ ở danh mục), vị trí hợp lệ, có ngày chụp danh mục', f.nc.length === 3 && f.nc.filter(x => x.vaiTro === 'Tổ trưởng').length === 1 && f.nc.find(x => x.vaiTro === 'Tổ trưởng').ten === 'NGUYỄN VĂN AN' && f.nc.every(x => x.doiId === f.doi[0].id && x.chucDanh && x._dmNgay === '01/01/2026'), JSON.stringify(f.nc.map(x => [x.ten, x.vaiTro, x.chucDanh, x.doiId, x._nguon, x._dmNgay])));
  await w.fill('#doiMoiTen', 'Đội 2'); await w.click('[data-act=themDoi]'); await w.waitForTimeout(300);
  await w.click('#dmChon_nc'); await w.waitForSelector('#dmcTbl');
  ok('hộp chọn cho đội 2: chỉ còn 3 người chưa có trong lô', (await w.$$('#dmcTbl [data-dmc]')).length === 3);
  await w.click('#dmcAll'); await w.click('#dmcXong'); await w.waitForSelector('#stDirty');
  r = await luu(); ok('lưu đội 2 không lỗi', r.ok, JSON.stringify(r));
  f = await lo(); const d2 = f.doi.find(d => d.ten === 'Đội 2');
  ok('đội 2: 3 người riêng, một Tổ trưởng; số người mỗi đội = số người đã chọn', !!d2 && f.nc.filter(x => x.doiId === d2.id).length === 3 && f.nc.filter(x => x.doiId === d2.id && x.vaiTro === 'Tổ trưởng').length === 1 && f.nc.filter(x => x.doiId === f.doi[0].id).length === 3, JSON.stringify(f.nc.map(x => [x.ten, x.vaiTro, x.doiId])));
  const bang = (await w.innerText('#doiKT')).replace(/\s+/g, ' ');
  ok('bảng hợp đồng nhân công hiện 2 hợp đồng, mỗi đội 3 người', /Hợp đồng nhân công: 2 hợp đồng/.test(bang) && /NGUYỄN VĂN AN 3 /.test(bang) && /VÕ VĂN GIANG 3 /.test(bang), bang);

  // ----- tab Vận chuyển: hợp đồng vận chuyển → xe chọn từ danh mục → phiếu cân -----
  await w.click('[data-ftab=dx]'); await w.waitForSelector('#hdvcKT');
  ok('tab Vận chuyển: không còn nút nạp Excel / dán Excel xe theo lô', !(await w.$('#main [data-act=tpl][data-kind=dx]')) && !(await w.$('#main [data-act=danMo][data-kind=dx]')) && !(await w.isVisible('#main input[data-file=dx]')));
  await w.click('#dmChon_dx'); await w.waitForTimeout(300);
  ok('chưa có hợp đồng vận chuyển: không mở hộp chọn xe, nhắc thêm hợp đồng trước', !(await w.isVisible('#dmcTbl')) && /Chưa có hợp đồng vận chuyển/.test(await w.innerText('#main')));
  await w.fill('#hdMoiTen', 'Đội xe Quế Sơn'); await w.click('[data-act=themHd]'); await w.waitForTimeout(300);
  await w.click('#dmChon_dx'); await w.waitForSelector('#dmcTbl'); await w.check('[data-dmc="92C11111"]'); await w.check('[data-dmc="92C22222"]'); await w.click('#dmcXong'); await w.waitForSelector('#stDirty');
  r = await luu(); ok('lưu xe của hợp đồng 1 không lỗi', r.ok, JSON.stringify(r));
  await w.fill('#hdMoiTen', 'Đội xe Hòa Vang'); await w.click('[data-act=themHd]'); await w.waitForTimeout(300);
  await w.click('#dmChon_dx'); await w.waitForSelector('#dmcTbl'); await w.check('[data-dmc="92H33333"]'); await w.click('#dmcXong'); await w.waitForSelector('#stDirty');
  r = await luu(); ok('lưu xe của hợp đồng 2 không lỗi', r.ok, JSON.stringify(r));
  f = await lo(); const h1 = f.hdvc.find(h => h.ten === 'Đội xe Quế Sơn'), h2 = f.hdvc.find(h => h.ten === 'Đội xe Hòa Vang');
  ok('xe là bảng con của hợp đồng: 2 xe thuộc hợp đồng 1, 1 xe thuộc hợp đồng 2, không sinh hợp đồng thừa', f.hdvc.length === 2 && !!h1 && !!h2 && f.dx.filter(x => x.hdvcId === h1.id).map(x => x.bienSo).join() === '92C-11111,92C-22222' && f.dx.filter(x => x.hdvcId === h2.id).map(x => x.bienSo).join() === '92H-33333', JSON.stringify([f.hdvc.map(h => h.ten), f.dx.map(x => [x.bienSo, x.hdvcId])]));
  ok('có nút Tra cứu Google Sheets (HoSoKeo) ở phần phiếu cân', await w.isVisible('#lkPhieuCanBtn'));
  const themPc = async (so, b, kl) => { await w.click('[data-act=stAdd][data-kind=pc]'); await w.waitForSelector('#stForm'); await w.fill('#stForm input[name=soPhieu]', so); await w.fill('#stForm input[name=ngay]', '05/10/2026'); await w.fill('#stForm input[name=kl]', kl); await w.selectOption('#stForm select[name=bienSo]', b); await w.click('#stForm [type=submit]'); await w.waitForTimeout(250); };
  await themPc('P1', '92C-11111', '10,5'); await themPc('P2', '92C-22222', '11,2'); await themPc('P3', '92H-33333', '9,8');
  r = await luu(); ok('lưu 3 phiếu cân không lỗi', r.ok, JSON.stringify(r));
  const hang = async () => (await w.$$eval('#main table tbody tr', trs => trs.map(t => t.innerText.replace(/\s+/g, ' ')))).filter(t => /P[1-9] /.test(t));
  await w.click('#hdvcKT tr[data-hd="' + h1.id + '"]'); await w.waitForTimeout(250);
  let dc = (await w.innerText('#pcDoiChieu')).replace(/\s+/g, ' ');
  ok('chọn hợp đồng 1: phiếu cân của hợp đồng 1 (2 phiếu, 21,700 tấn, 2 / 2 xe), kèm tổng cả lô', /Hợp đồng này: 2 phiếu, 21,700 tấn, trên 2 \/ 2 xe/.test(dc) && /cả lô: 3 phiếu, 31,500 tấn/.test(dc) && /mọi phiếu đều khớp xe/.test(dc), dc);
  ok('bảng phiếu cân chỉ hiện phiếu của hợp đồng 1', (await hang()).length === 2 && (await hang()).every(t => /92C-/.test(t)), (await hang()).join(' | '));
  ok('bảng xe chỉ hiện xe của hợp đồng 1', /Xe của hợp đồng “Đội xe Quế Sơn”/.test(await w.innerText('#dxCon')) && !/92H-33333 Xe tải/.test((await w.innerText('#main')).replace(/\s+/g, ' ').split('Phiếu cân của hợp đồng')[0].split('Xe của hợp đồng')[1] || ''));
  await w.click('#hdvcKT tr[data-hd="' + h2.id + '"]'); await w.waitForTimeout(250);
  dc = (await w.innerText('#pcDoiChieu')).replace(/\s+/g, ' ');
  ok('chọn hợp đồng 2: 1 phiếu, 9,800 tấn', /Hợp đồng này: 1 phiếu, 9,800 tấn, trên 1 \/ 1 xe/.test(dc) && (await hang()).length === 1, dc);
  const hdBang = (await w.innerText('#hdvcKT')).replace(/\s+/g, ' ');
  ok('bảng hợp đồng vận chuyển hiện số xe và số phiếu cân của từng hợp đồng', /Hợp đồng vận chuyển: 2 hợp đồng/.test(hdBang) && /Đội xe Quế Sơn CHỦ XE 1 \(Chủ xe\) 2 2 /.test(hdBang) && /Đội xe Hòa Vang.*CHỦ XE 3 \(Chủ xe\) 1 1 /.test(hdBang), hdBang);
  await w.click('[data-act=pcTatCa]'); await w.waitForTimeout(200);
  ok('“Xem tất cả phiếu cân của lô” hiện đủ 3 phiếu', (await hang()).length === 3);

  // phiếu có biển số lạ (đến từ dữ liệu cũ / nguồn ngoài): nêu “chưa khớp xe”, thêm xe đó từ danh mục vào hợp đồng đang chọn thì hết
  await w.evaluate(async () => { const d = window.hak.loadSync().db, fa = d.rs.own1.forests.fa; fa.pc.push(Object.assign({}, fa.pc[0], {_id: 'la1', _row: 99, soPhieu: 'P9', bienSo: '43C-44444', kl: 12.1})); await window.hak.save(d); });
  await w.reload(); await w.waitForSelector('#side'); await w.click('#side [data-open=own1]'); await w.click('[data-tab=rung]'); await w.click('[data-forest=fa]'); await w.click('[data-ftab=dx]'); await w.waitForSelector('#pcDoiChieu');
  ok('phiếu biển số chưa thuộc xe nào của lô: báo số phiếu chưa khớp và đánh dấu tại dòng', /1 phiếu có biển số chưa thuộc xe nào của lô/.test(await w.innerText('#pcChuaKhop')) && /chưa khớp xe/.test((await hang()).find(t => /P9 /.test(t)) || ''), await w.innerText('#pcDoiChieu'));
  await w.click('#dmChon_dx'); await w.waitForSelector('#dmcTbl'); await w.fill('#dmcQ', '43C'); await w.waitForTimeout(150); await w.check('[data-dmc="43C44444"]'); await w.click('#dmcXong'); await w.waitForSelector('#stDirty');
  r = await luu(); ok('thêm xe 43C-44444 từ danh mục vào hợp đồng đang chọn rồi lưu', r.ok, JSON.stringify(r));
  ok('sau khi thêm xe: mọi phiếu đều khớp xe của lô', /mọi phiếu đều khớp xe/.test(await w.innerText('#pcDoiChieu')) && !(await w.$('#pcChuaKhop')), await w.innerText('#pcDoiChieu'));
  await app.close();
  ok('không có lỗi JavaScript', errs.length === 0, errs.join(' | '));
  console.log(fail ? fail + ' MỤC LỖI' : 'TẤT CẢ ĐẠT');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
