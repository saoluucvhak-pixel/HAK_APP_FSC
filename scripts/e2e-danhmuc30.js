'use strict';
/* Bản 3.0 — Cài đặt → Danh mục đối tượng / Danh mục xe / Vị trí (Electron thật, SQLite thật):
 *  - Cài đặt nằm trên thanh chính; Danh mục đối tượng lọc theo chức vụ (Có quyền ký hợp đồng, Nhân công, Tài xế, Chủ xe);
 *  - thể nhân có phần Thông tin cá nhân (người) sửa qua hộp thoại; một người vừa Tài xế vừa Chủ xe; CCCD trùng bị chặn; tài xế thiếu GPLX bị chặn;
 *  - pháp nhân có quyền ký phải khai người đại diện; ngừng sử dụng / dùng lại;
 *  - Danh mục xe chọn chủ xe theo ID; nạp Excel: xem trước mới / thay đổi / lỗi, BKS đã có mà khác chủ xe hiện cả hai, sửa dòng ngay trong bảng rồi lưu;
 *  - Vị trí: đổi tên giữ mã; rời màn khi đang sửa dở hỏi Lưu / Bỏ thay đổi / Tiếp tục chỉnh sửa.
 * Chạy: xvfb-run -a node scripts/e2e-danhmuc30.js */
const {_electron: electron} = require('playwright-core');
const path = require('path'), fs = require('fs'), os = require('os');
const XLSX = require('xlsx');
const root = path.join(__dirname, '..');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hakqn-dm30-'));
let fail = 0; const ok = (name, cond, extra) => { console.log((cond ? 'ĐẠT  ' : 'LỖI  ') + name + (!cond && extra ? ' — ' + extra : '')); if (!cond) fail++; };
const xlsx = (ten, rows) => { const f = path.join(dir, ten), wb = XLSX.utils.book_new(), ws = XLSX.utils.aoa_to_sheet(rows); Object.keys(ws).filter(k => /^[A-Z]+\d+$/.test(k)).forEach(k => { ws[k].t = 's'; }); XLSX.utils.book_append_sheet(wb, ws, 'S'); XLSX.writeFile(wb, f); return f; };

(async () => {
  const app = await electron.launch({executablePath: require('electron'), args: [root, '--no-sandbox'], env: {...process.env, HAKQN_CLOSE: 'discard', HAKQN_DB: path.join(dir, 'd.sqlite'), HAKQN_USERDATA: path.join(dir, 'ud'), HAKQN_DOWNLOAD_DIR: path.join(dir, 'out')}});
  const w = require('./_hd30').boc(await app.firstWindow()); const errs = []; w.on('pageerror', e => errs.push(e.message)); w.on('dialog', d => d.accept()); await w.waitForSelector('#side');
  const dbAll = () => w.evaluate(() => window.hak.loadSync().db);
  const set = (sel, o) => w.evaluate(([sel, o]) => { const f = document.querySelector(sel); Object.entries(o).forEach(([k, v]) => { const e = f.elements[k]; if (e.type === 'checkbox') e.checked = !!v; else e.value = v; }); }, [sel, o]);

  // 1. Cài đặt & Danh mục tách riêng trên thanh chính
  ok('Cài đặt và Danh mục nằm trên thanh chính, không còn menu “⋯ Thêm”', await w.isVisible('#navSet') && await w.isVisible('#navDm') && !(await w.$('#moreMenu')));
  await w.click('#navSet'); await w.waitForSelector('#setTab_setbk');
  const setTabs = await w.$$eval('[id^=setTab_]', e => e.map(x => x.id.slice(7)));
  ok('Cài đặt có Giao diện, Hướng dẫn, Sao lưu và khôi phục', ['setgd', 'sethd', 'setbk'].every(k => setTabs.includes(k)), setTabs.join());
  await w.click('#navDm'); await w.click('#setTab_setdt'); await w.waitForSelector('#dtBang');
  const dmTabs = await w.$$eval('[id^=setTab_]', e => e.map(x => x.id.slice(7)));
  ok('Danh mục có Đối tượng, Xe vận chuyển, Vị trí, Công ty mua hàng', ['setdt', 'setxe', 'setvt', 'cty'].every(k => dmTabs.includes(k)), dmTabs.join());

  // 2. thể nhân, một người vừa Tài xế vừa Chủ xe
  await w.click('#cnThem'); await w.waitForSelector('#dtForm');   // giao diện mới: cá nhân MỘT form (không còn bước thêm người vào bảng con)
  ok('form cá nhân một lớp: không có bảng con #dtNguoiTbl và nút “Thêm người”', !(await w.$('#dtNguoiTbl')) && !(await w.$('#ngThem')));
  await set('#dtForm', {ten: 'HỘ KINH DOANH LÊ VĂN XE', diaChi: 'Quế Sơn', sdt: '0905111222', hoTen: 'LÊ VĂN XE', cccd: '049085000077', ngayCap: '01/01/2021', noiCap: 'Cục CS QLHC', gioiTinh: 'Nam', vtTaiXe: true, vtChuXe: true, kyVC: true});
  await w.click('#dtLuu'); await w.waitForTimeout(200);
  ok('tài xế thiếu GPLX: báo lỗi trong form, chưa lưu', await w.isVisible('#dtForm') && /giấy phép|GPLX/i.test(await w.innerText('#dtLoi')), await w.innerText('#dtLoi').catch(() => ''));
  await set('#dtForm', {gplx: 'GP-777', hanGplx: '01/01/2030'}); await w.click('#dtLuu'); await w.waitForTimeout(500);
  const ngT = await w.innerText('#dtBang'); ok('lưu cá nhân: danh sách hiện người với chức vụ Tài xế, Chủ xe', !(await w.isVisible('#dtForm')) && /LÊ VĂN XE/.test(ngT) && /Tài xế/.test(ngT) && /Chủ xe/.test(ngT), ngT);
  let D = await dbAll(), o1 = (D.dmDoiTuong || []).find(o => o.ten === 'HỘ KINH DOANH LÊ VĂN XE');
  ok('lưu vào SQLite: thể nhân có mã tự cấp, người có ID, chức vụ Tài xế + Chủ xe, ký Vận chuyển', !!o1 && /^DT\d{4}$/.test(o1.ma) && o1.loai === 'thenhan' && o1.nguoi.length === 1 && !!o1.nguoi[0].id && o1.nguoi[0].vaiTro.taiXe && o1.nguoi[0].vaiTro.chuXe && o1.nguoi[0].kyHD.vanChuyen, JSON.stringify(o1));
  ok('CCCD lưu dạng văn bản, giữ số 0 đầu', !!o1 && o1.nguoi[0].cccd === '049085000077');
  const loc = async k => { await w.selectOption('[data-sfquick="dm_doi_tuong"][data-sfkey=nhom]', k === 'tatca' ? '' : k); await w.waitForTimeout(200); return w.innerText('#dtBang'); };
  ok('lọc Tài xế và lọc Chủ xe đều thấy người này; lọc Nhân công thì không', /LÊ VĂN XE/.test(await loc('taixe')) && /LÊ VĂN XE/.test(await loc('chuxe')) && !/LÊ VĂN XE/.test(await loc('nhancong')));
  ok('lọc Có quyền ký hợp đồng thấy đối tượng có người ký Vận chuyển', /LÊ VĂN XE/.test(await loc('doitac')));
  await loc('tatca');

  // 3. CCCD trùng ở đối tượng khác bị chặn
  await w.click('#cnThem'); await w.waitForSelector('#dtForm');
  await set('#dtForm', {ten: 'TỔ CƯA TRẦN SƠN', hoTen: 'TRẦN SƠN', cccd: '049085000077', vtNhanCong: true}); await w.click('#dtLuu'); await w.waitForTimeout(200);
  ok('CCCD đã có ở đối tượng khác: báo trùng, không lưu', await w.isVisible('#dtForm') && /trùng|đã có/i.test(await w.innerText('#dtLoi')), await w.innerText('#dtLoi').catch(() => ''));
  await set('#dtForm', {cccd: '049085000001'}); await w.click('#dtLuu'); await w.waitForTimeout(400);

  // 4. pháp nhân có quyền ký phải khai người đại diện
  await w.click('#dnThem'); await w.waitForSelector('#dtForm');
  await set('#dtForm', {ten: 'CÔNG TY TNHH VẬN TẢI A', mst: '0401234567', diaChi: 'Đà Nẵng', kyHD: 'vc'}); await w.click('#dtLuu'); await w.waitForTimeout(300);
  ok('pháp nhân ký Vận chuyển thiếu người đại diện: báo lỗi, giữ nguyên dữ liệu đang nhập', await w.isVisible('#dtLoi') && /đại diện/.test(await w.innerText('#dtLoi')) && (await w.inputValue('#dtForm [name=mst]')) === '0401234567');
  await set('#dtForm', {daiDien: 'NGUYỄN VĂN B', chucVuDaiDien: 'Giám đốc'}); await w.click('#dtLuu'); await w.waitForTimeout(400);
  D = await dbAll(); const pn = (D.dmDoiTuong || []).find(o => o.loai === 'phapnhan');
  ok('pháp nhân lưu được: địa chỉ trụ sở, người đại diện, chức danh, ký Vận chuyển', !!pn && pn.diaChi === 'Đà Nẵng' && pn.daiDien === 'NGUYỄN VĂN B' && pn.chucVuDaiDien === 'Giám đốc' && pn.kyHD.vanChuyen && !pn.kyHD.nhanCong, JSON.stringify(pn));

  // 5. ngừng sử dụng / dùng lại
  await w.click('[data-dtngung="' + pn.id + '"]'); await w.waitForTimeout(300);
  ok('ngừng sử dụng: đối tượng ẩn khỏi “Tất cả”, hiện ở “Ngừng sử dụng”', !/VẬN TẢI A/.test(await w.innerText('#dtBang')) && /VẬN TẢI A/.test(await loc('ngung')));
  await w.click('[data-dtngung="' + pn.id + '"]'); await w.waitForTimeout(300); await loc('tatca');
  ok('dùng lại: đối tượng trở lại danh sách', /VẬN TẢI A/.test(await w.innerText('#dtBang')));
  await w.fill('[data-sfq=dm_doi_tuong]', '0401234567'); await w.waitForTimeout(500);
  ok('tìm theo MST', /VẬN TẢI A/.test(await w.innerText('#dtBang')) && !/LÊ VĂN XE/.test(await w.innerText('#dtBang')));
  await w.fill('[data-sfq=dm_doi_tuong]', ''); await w.waitForTimeout(400);

  // 6. Danh mục xe: chủ xe theo ID
  await w.click('#setTab_setxe'); await w.waitForSelector('#xeBang'); await w.click('#xeThem'); await w.waitForSelector('#xeForm');
  const chu = await w.$$eval('#xeForm [name=chuXeId] option', e => e.map(x => x.textContent));
  ok('ô Chủ xe hiện người có chức vụ Chủ xe kèm tên đối tượng; không hiện người chỉ là Nhân công', chu.some(t => /LÊ VĂN XE/.test(t)) && chu.some(t => /VẬN TẢI A/.test(t)) && !chu.some(t => /TRẦN SƠN/.test(t)), chu.join('|'));
  const ngId = o1.nguoi[0].id, chuVal = await w.$$eval('#xeForm [name=chuXeId] option', e => (e.find(x => /LÊ VĂN XE/.test(x.textContent)) || {}).value);
  await set('#xeForm', {bks: '92c 123.45', hanKiemDinh: '31/12/2027', hanBaoHiem: '30/06/2027', loaiXe: 'Xe tải', chuXeId: chuVal}); await w.click('#xeLuu'); await w.waitForTimeout(400);
  D = await dbAll(); const xe1 = (D.dmXe || [])[0];
  ok('lưu xe: chủ xe lưu theo ID (không theo tên), BKS chuẩn hóa', !!xe1 && xe1.chuXeId === chuVal && String(chuVal).includes(ngId) && /92C/.test(xe1.bks), JSON.stringify(xe1));
  await w.click('#xeThem'); await set('#xeForm', {bks: '92C-123.45'}); await w.click('#xeLuu'); await w.waitForTimeout(300);
  ok('BKS đã có (khác cách viết) bị chặn', await w.isVisible('#xeLoi') && (await dbAll()).dmXe.length === 1, await w.innerText('#xeLoi').catch(() => ''));
  await w.click('[data-act=xeHuy]'); await w.waitForTimeout(200);

  // 7. nạp Excel xe: mới, thay đổi khác chủ xe, lỗi; sửa dòng ngay trong bảng
  const f = xlsx('xe.xlsx', [['Ngày cập nhật', 'Số BKS', 'Ngày hết hạn kiểm định', 'Ngày hết hạn bảo hiểm', 'Loại xe', 'Chủ xe', 'CCCD / MST chủ xe'],
    ['01/11/2026', '92C-123.45', '31/12/2028', '30/06/2028', 'Xe tải', 'CÔNG TY TNHH VẬN TẢI A', '0401234567'],
    ['01/11/2026', '92C-999.99', '31/12/2027', '30/06/2027', 'Xe ben', 'LÊ VĂN XE', '049085000077'],
    ['01/11/2026', '', '31/02/2027', '', '', '', '']]);
  await w.setInputFiles('input[data-xefile]', f); await w.waitForSelector('#xeXemTbl');
  const tt = await w.$$eval('#xeXemTbl tr[data-tt]', e => e.map(x => x.dataset.tt));
  ok('xem trước Excel: 1 thay đổi, 1 mới, 1 lỗi', tt.join() === 'doi,moi,loi', tt.join());
  const xem = await w.innerText('#xeXemTbl');
  ok('BKS đã có mà khác chủ xe: hiện cả chủ xe đang có và chủ xe trong file', /Khác chủ xe/.test(xem) && /đang có:[^\n]*LÊ VĂN XE/.test(xem) && /trong file:[^\n]*CÔNG TY TNHH VẬN TẢI A/.test(xem), xem.slice(0, 600));
  ok('chưa lưu gì khi đang xem trước', (await dbAll()).dmXe.length === 1);
  await w.fill('[data-xex="2"][data-k=bks]', '92C-555.55'); await w.dispatchEvent('[data-xex="2"][data-k=bks]', 'change');
  await w.fill('[data-xex="2"][data-k=hanKiemDinh]', '28/02/2027'); await w.dispatchEvent('[data-xex="2"][data-k=hanKiemDinh]', 'change'); await w.waitForTimeout(300);
  ok('sửa dòng lỗi ngay trong bảng: kiểm lại thành “mới”', (await w.$$eval('#xeXemTbl tr[data-tt]', e => e.map(x => x.dataset.tt))).join() === 'doi,moi,moi');
  await w.uncheck('[data-xechon="0"]'); await w.click('#xeExcelLuu'); await w.waitForTimeout(500);
  D = await dbAll();
  ok('lưu: chỉ dòng được chọn (2 xe mới), xe bỏ chọn giữ chủ xe cũ', D.dmXe.length === 3 && D.dmXe.find(x => x.id === xe1.id).chuXeId === chuVal && D.dmXe.some(x => /555/.test(x.bks)) && D.dmXe.some(x => /999/.test(x.bks)), JSON.stringify(D.dmXe));

  // 8. vị trí: đổi tên giữ mã
  await w.click('#setTab_setvt'); await w.waitForSelector('#vtBang');
  D = await dbAll(); const vt = (D.dmViTri || [])[0];
  ok('Vị trí có sẵn danh sách với mã ổn định', !!vt && /^vt/.test(vt.id), JSON.stringify(D.dmViTri));
  await w.fill('[data-vtten="' + vt.id + '"]', vt.ten + ' (đổi)'); await w.click('[data-vtdoi="' + vt.id + '"]'); await w.waitForTimeout(400);
  D = await dbAll(); ok('đổi tên vị trí: cùng mã, tên mới', (D.dmViTri.find(v => v.id === vt.id) || {}).ten === vt.ten + ' (đổi)');

  // 9. rời màn khi đang sửa dở
  await w.click('#setTab_setdt'); await w.click('[data-dtsua="' + o1.id + '"]'); await w.waitForSelector('#dtForm'); await w.fill('#dtForm [name=sdt]', '0905999888');
  await w.click('#setTab_setxe'); await w.waitForTimeout(200);
  ok('rời màn khi đang sửa: hỏi Lưu / Bỏ thay đổi / Tiếp tục chỉnh sửa', await w.isVisible('#roiLuu') && await w.isVisible('#roiBo') && await w.isVisible('#roiTiep'));
  await w.click('#roiTiep'); await w.waitForTimeout(200);
  ok('Tiếp tục chỉnh sửa: ở lại, giữ dữ liệu đang nhập', await w.isVisible('#dtForm') && (await w.inputValue('#dtForm [name=sdt]')) === '0905999888');
  await w.click('#setTab_setxe'); await w.click('#roiLuu'); await w.waitForTimeout(500);
  D = await dbAll(); ok('Lưu: ghi thay đổi rồi mới rời màn', (D.dmDoiTuong.find(o => o.id === o1.id) || {}).sdt === '0905999888' && await w.isVisible('#xeBang'));

  // 10. đọc lại sau khởi động lại
  ok('không có lỗi script trên màn hình', errs.length === 0, errs.join(' | '));
  await app.close();
  const {Store} = require(path.join(root, 'src', 'store.js')), s = new Store(path.join(dir, 'd.sqlite')); const L = s.load(); s.close();
  ok('SQLite đọc lại đủ: 3 đối tượng, 3 xe', (L.dmDoiTuong || []).length === 3 && (L.dmXe || []).length === 3, JSON.stringify([(L.dmDoiTuong || []).length, (L.dmXe || []).length]));
  console.log(fail ? 'CÓ ' + fail + ' LỖI' : 'TẤT CẢ ĐẠT'); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
