'use strict';
/* Bản 3.7.1 — Hộp thoại “Chọn bên nhận khoán từ Danh mục đối tượng” ở hợp đồng nhân công (Electron thật):
 *  - nút “📋 Chọn từ danh mục” mở hộp thoại: ô tìm tức thì (tên không dấu, MST, CCCD, SĐT), bộ lọc Tất cả / Cá nhân / Doanh nghiệp, danh sách sạch (không có ô nhập);
 *  - bấm “Chọn” một lần: gán vào đội, giữ tên đội đang gõ dở, lưu nháp rồi lưu lô; phím Esc đóng hộp thoại.
 * Chạy: xvfb-run -a node scripts/e2e-chon-ben-nhan-khoan.js */
const {_electron: electron} = require('playwright-core');
const path = require('path'), fs = require('fs'), os = require('os');
const src = fs.readFileSync(path.join(__dirname, 'e2e-inan2.js'), 'utf8');
const {nv, lot, seed, PC, EXP1} = new Function(src.slice(src.indexOf('const nv ='), src.indexOf('const plain =')) + '; return {nv, lot, seed, PC, EXP1};')();
const root = path.join(__dirname, '..');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hakqn-cbnk-')), out = path.join(dir, 'out'); fs.mkdirSync(out, {recursive: true});
let fail = 0; const ok = (name, cond, extra) => { console.log((cond ? 'ĐẠT  ' : 'LỖI  ') + name + (!cond && extra ? ' — ' + extra : '')); if (!cond) fail++; };

(async () => {
  const app = await electron.launch({executablePath: require('electron'), args: [root, '--no-sandbox'], env: {...process.env, HAKQN_CLOSE: 'discard', HAKQN_DB: path.join(dir, 'd.sqlite'), HAKQN_USERDATA: path.join(dir, 'ud'), HAKQN_DOWNLOAD_DIR: out}});
  const w = await app.firstWindow(); const errs = []; w.on('pageerror', e => errs.push(e.message)); w.on('dialog', d => d.accept()); await w.waitForSelector('#side');
  const p = (i, vai, ten, cd, ma) => ({...nv(i, vai, ten, cd, '04908500' + String(7000 + i)), maRung: ma});
  const EXP = Object.assign({}, EXP1, {ntNgay: '20/12/2026', pcNgay: '20/12/2026'});
  const A = lot('fa', 'R-A', {exp: EXP, pc: PC, kl: 29.75, nc: [p(1, 'Tổ trưởng', 'TRẦN TỔ TRƯỞNG', 'Tổ trưởng', 'R-A'), p(2, 'Công nhân', 'LÊ CÔNG NHÂN', 'Công nhân khai thác', 'R-A')]});
  const B = lot('fb', 'R-B', {exp: Object.assign({}, EXP, {soKT: '016', ntSo: '04', soVC: '08', pcSo: '10'}), pc: PC.map(x => ({...x, maRung: 'R-B', soPhieu: x.soPhieu + 'B'})), kl: 29.75, nc: [p(3, 'Tổ trưởng', 'PHẠM TỔ CŨ', 'Tổ trưởng', 'R-B'), p(4, 'Công nhân', 'VÕ CÔNG NHÂN', 'Công nhân khai thác', 'R-B')]});
  const D = seed([A, B]);
  D.dmDoiTuong = [{id: 'dt1', ma: 'DT0001', ten: 'CÔNG TY TNHH LÂM NGHIỆP XANH', loai: 'phapnhan', mst: '0401111222', diaChi: '12 Lê Lợi, Tam Kỳ', sdt: '0235111222', kyHD: {nhanCong: true}, daiDien: 'NGUYỄN ĐẠI DIỆN', chucVuDaiDien: 'Giám đốc', nguoi: []},
    {id: 'dt2', ma: 'DT0002', ten: 'LÊ VĂN BA', loai: 'thenhan', sdt: '0905111222', diaChi: 'Quế Sơn', kyHD: {}, nguoi: [{id: 'ng2', hoTen: 'LÊ VĂN BA', cccd: '049085000077', sdt: '0905111222', kyHD: {nhanCong: true}, vaiTro: {nhanCong: true}}]},
    {id: 'dt3', ma: 'DT0003', ten: 'CÔNG TY KHÔNG KÝ NHÂN CÔNG', loai: 'phapnhan', mst: '0402222333', kyHD: {vanChuyen: true}, daiDien: 'AI ĐÓ', nguoi: []}];
  await w.evaluate(d => window.hak.save(d), D); await w.reload(); await w.waitForSelector('#side');
  const lotDb = async id => (await w.evaluate(() => window.hak.loadSync().db)).rs.own1.forests[id];
  const moRung = async (id, tab) => { await w.click('[data-open=own1]'); await w.click('[data-tab=rung]'); await w.click('[data-forest=' + id + ']'); await w.click('[data-ftab=' + tab + ']'); await w.waitForTimeout(200); };
  const moDoi = async () => { await w.click('[data-open=own1]'); await w.click('[data-tab=rung]'); await w.click('[data-forest=fa]'); await w.click('[data-ftab=nc]'); await w.waitForTimeout(200); if (!(await w.$('#doiForm'))) { await w.click('#dsHdNcTbl tbody tr[data-act]'); await w.waitForTimeout(200); } await w.waitForSelector('#doiForm'); };
  const hang = () => w.$$eval('#bnkBang tbody tr[data-bnk]', r => r.length);
  await moDoi();
  ok('form Đội khai thác có nút “📋 Chọn từ danh mục” bên cạnh nút thêm mới', !!(await w.$('#bnkMoBtn')) && /Chọn từ danh mục/.test(await w.innerText('#bnkMoBtn')));
  await w.fill('#doiForm [name=ten]', 'Đội thử chọn');   // gõ dở tên đội rồi bấm nút: lần bấm không được mất
  await w.click('#bnkMoBtn'); await w.waitForSelector('#bnkBang');
  ok('hộp thoại mở: chỉ hiện đối tượng có quyền ký Nhân công (2 đối tượng; công ty chỉ ký vận chuyển bị loại)', (await hang()) === 2, String(await hang()));
  ok('danh sách sạch: không có ô nhập trong bảng', !(await w.$('#bnkBang input')) && !(await w.$('#bnkBang select')));
  await w.selectOption('#bnkLoai', 'thenhan'); ok('lọc Cá nhân: 1 người (Lê Văn Ba)', (await hang()) === 1 && /LÊ VĂN BA/.test(await w.innerText('#bnkBang')));
  await w.selectOption('#bnkLoai', 'phapnhan'); ok('lọc Doanh nghiệp: 1 công ty', (await hang()) === 1 && /LÂM NGHIỆP XANH/.test(await w.innerText('#bnkBang')));
  await w.selectOption('#bnkLoai', ''); await w.fill('#bnkQ', '0401111'); ok('tìm theo MST', (await hang()) === 1 && /XANH/.test(await w.innerText('#bnkBang')));
  await w.fill('#bnkQ', '049085000077'); ok('tìm theo CCCD', (await hang()) === 1 && /LÊ VĂN BA/.test(await w.innerText('#bnkBang')));
  await w.fill('#bnkQ', '0905111222'); ok('tìm theo số điện thoại', (await hang()) === 1);
  await w.fill('#bnkQ', 'le van ba'); ok('tìm theo tên không dấu, không phân biệt hoa thường', (await hang()) === 1);
  await w.fill('#bnkQ', 'zzzz'); ok('không khớp: báo không có đối tượng nào khớp', (await hang()) === 0 && /Không có đối tượng nào khớp/.test(await w.innerText('#bnkBang')));
  await w.keyboard.press('Escape'); await w.waitForTimeout(200); ok('Esc đóng hộp thoại, không đổi bên nhận khoán', !(await w.$('#dlgBox.on')) && (await w.inputValue('#doiForm [name=benNK]')) === '');
  await w.click('#bnkMoBtn'); await w.waitForSelector('#bnkBang'); await w.fill('#bnkQ', 'xanh'); await w.click('#bnkBang tr[data-bnk="dt:dt1"] [data-act=bnkChon]'); await w.waitForTimeout(400);
  ok('bấm “Chọn” một lần: hộp thoại đóng, ô Bên nhận khoán là công ty vừa chọn, tên đội đang gõ dở vẫn còn', !(await w.$('#dlgBox.on')) && (await w.inputValue('#doiForm [name=benNK]')) === 'dt:dt1' && (await w.inputValue('#doiForm [name=ten]')) === 'Đội thử chọn');
  ok('dòng “Bản in” nêu công ty vừa chọn', /CÔNG TY TNHH LÂM NGHIỆP XANH/.test(await w.innerText('#benNKIn')));
  if (await w.$('#loDirtyBar [data-act=stSave]')) { await w.click('#loDirtyBar [data-act=stSave]'); await w.waitForTimeout(600); }
  const d0 = (await w.evaluate(() => window.hak.loadSync().db)).rs.own1.forests.fa.doi[0];
  ok('lưu lô: bên nhận khoán lưu theo ID kèm bản chụp thông tin (MST, người đại diện)', d0.benNhanKhoan.doiTuongId === 'dt1' && d0.benNhanKhoanBan && d0.benNhanKhoanBan.mst === '0401111222' && d0.benNhanKhoanBan.daiDien === 'NGUYỄN ĐẠI DIỆN' && d0.ten === 'Đội thử chọn', JSON.stringify(d0));
  await w.click('#bnkMoBtn'); await w.waitForSelector('#bnkBang'); ok('mở lại: dòng đang chọn có nhãn “Đang chọn”', /Đang chọn/.test(await w.innerText('#bnkBang tr[data-bnk="dt:dt1"]')));
  await w.click('#bnkBang tr[data-bnk="ng:ng2"] [data-act=bnkChon]'); await w.waitForTimeout(400);
  ok('chọn người thể nhân: ô Bên nhận khoán đổi sang người đó', (await w.inputValue('#doiForm [name=benNK]')) === 'ng:ng2');
  ok('không có lỗi script trên màn hình', errs.length === 0, errs.join(' | '));
  await app.close(); console.log(fail ? 'CÓ ' + fail + ' LỖI' : 'TẤT CẢ ĐẠT'); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
