'use strict';
/* Màn Danh mục (bản 2.1): lao động và xe theo ngày cập nhật, lấy dòng mới nhất, lịch sử, tìm kiếm, nạp Excel, đối tác (Electron thật, SQLite thật).
 * Chạy: xvfb-run -a node scripts/e2e-danhmuc.js */
const {_electron: electron} = require('playwright-core');
const path = require('path'), fs = require('fs'), os = require('os');
const root = path.join(__dirname, '..');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hakqn-dm-'));
let fail = 0; const ok = (name, cond, extra) => { console.log((cond ? 'ĐẠT  ' : 'LỖI  ') + name + (!cond && extra ? ' — ' + extra : '')); if (!cond) fail++; };
(async () => {
  const app = await electron.launch({executablePath: require('electron'), args: [root, '--no-sandbox'], env: {...process.env, HAKQN_CLOSE: 'discard', HAKQN_DB: path.join(dir, 'd.sqlite'), HAKQN_USERDATA: path.join(dir, 'ud'), HAKQN_DOWNLOAD_DIR: path.join(dir, 'out')}});
  const w = await app.firstWindow(); const errs = []; w.on('pageerror', e => errs.push(e.message)); w.on('dialog', d => d.accept()); await w.waitForSelector('#side');
  const tab = async k => { await w.click('[data-dmtab=' + k + ']'); await w.waitForTimeout(150); };
  const gui = async (form, vals) => { await w.evaluate(([f, v]) => { const fm = document.getElementById(f); for (const k in v) fm.elements[k].value = v[k]; fm.requestSubmit(); }, [form, vals]); await w.waitForTimeout(250); };
  await w.click('#navDm'); await w.waitForSelector('#dmTabs');
  ok('nút Danh mục mở màn có 5 tab', (await w.$$('#dmTabs button')).length === 5);
  // chức vụ / vị trí
  await tab('chucvu'); const cv = await w.innerText('#dmBody');
  ok('tab Chức vụ/vị trí: Tổ trưởng, Công nhân và bảng vị trí', /Tổ trưởng/.test(cv) && /Công nhân/.test(cv) && (await w.$$('#dmViTriTbl tbody tr')).length > 0);
  // lao động
  await tab('laodong');
  await gui('dmLdForm', {ngayCapNhat: '01/09/2026', cccd: '049085001234', ten: 'NGUYỄN VĂN A', diaChi: 'Quế Sơn', chucVu: 'Công nhân'});
  ok('thêm lao động: 1 dòng', (await w.$$('#dmLdTbl tbody tr')).length === 1 && /NGUYỄN VĂN A/.test(await w.innerText('#dmLdTbl')));
  await gui('dmLdForm', {ngayCapNhat: '01/10/2026', cccd: '049085001234', ten: 'NGUYỄN VĂN A', diaChi: 'Đại Lộc', chucVu: 'Tổ trưởng'});
  let t = await w.innerText('#dmLdTbl');
  ok('cập nhật ngày mới hơn: vẫn 1 dòng hiệu lực, hiện thông tin mới', (await w.$$('#dmLdTbl tbody tr')).length === 1 && /Đại Lộc/.test(t) && !/Quế Sơn/.test(t) && /Tổ trưởng/.test(t), t);
  await gui('dmLdForm', {ngayCapNhat: '01/08/2026', cccd: '049085001234', ten: 'NGUYỄN VĂN A', diaChi: 'Cũ hơn', chucVu: 'Công nhân'});
  ok('thêm dòng ngày cũ hơn: dòng hiệu lực không đổi', /Đại Lộc/.test(await w.innerText('#dmLdTbl')));
  await w.click('[data-dmls^="ld:049085001234"]'); const ls = await w.innerText('#dmLs');
  ok('lịch sử đủ 3 dòng, dòng mới nhất “đang dùng”', /Quế Sơn/.test(ls) && /Cũ hơn/.test(ls) && /đang dùng/.test(ls));
  await gui('dmLdForm', {ngayCapNhat: '31/02/2026', cccd: '049085009999', ten: 'B', chucVu: 'Công nhân'});
  ok('ngày không có thật hoặc CCCD sai: báo lỗi, không lưu', /Chưa lưu/.test(await w.innerText('#dmBody')) && (await w.$$('#dmLdTbl tbody tr')).length === 1);
  await gui('dmLdForm', {ngayCapNhat: '01/10/2026', cccd: '123', ten: 'C', chucVu: 'Công nhân'});
  ok('CCCD không đủ 12 số: báo lỗi', /12/.test(await w.innerText('#dmBody')) && (await w.$$('#dmLdTbl tbody tr')).length === 1);
  await gui('dmLdForm', {ngayCapNhat: '05/10/2026', cccd: '049085005678', ten: 'LÊ THỊ B', gioiTinh: 'Nữ', chucVu: 'Công nhân'});
  await w.fill('#dmQ', 'lê thị'); await w.dispatchEvent('#dmQ', 'change'); await w.waitForTimeout(200);
  ok('tìm nhanh bỏ dấu: còn 1 dòng', (await w.$$('#dmLdTbl tbody tr')).length === 1 && /LÊ THỊ B/.test(await w.innerText('#dmLdTbl')));
  await w.fill('#dmQ', ''); await w.dispatchEvent('#dmQ', 'change'); await w.waitForTimeout(200);
  // xe
  await tab('xe');
  await gui('dmXeForm', {ngayCapNhat: '01/09/2026', bienSo: '92c-123.45', chuXe: 'CHỦ XE 1', taiXe: 'TÀI XẾ 1', cccdTx: '049085007777', hanDangKiem: '01/01/2026'});
  await gui('dmXeForm', {ngayCapNhat: '01/10/2026', bienSo: '92C12345', chuXe: 'CHỦ XE 1', taiXe: 'TÀI XẾ 2', cccdTx: '049085007778', hanDangKiem: '01/01/2027'});
  t = await w.innerText('#dmXeTbl');
  ok('biển số viết khác dấu: nhận cùng một xe, dùng dòng mới nhất (tài xế 2)', (await w.$$('#dmXeTbl tbody tr')).length === 1 && /TÀI XẾ 2/.test(t) && !/TÀI XẾ 1/.test(t), t);
  await w.click('[data-dmls^="xe:"]'); ok('lịch sử xe 2 dòng', (await w.$$('#dmLs tbody tr')).length === 2);
  await w.click('[data-dmxoa^="xe:"] >> nth=1'); await w.waitForTimeout(200);
  ok('xóa dòng cũ: còn 1 dòng, xe vẫn còn', (await w.$$('#dmXeTbl tbody tr')).length === 1 && /TÀI XẾ 2/.test(await w.innerText('#dmXeTbl')));
  // đối tác
  await tab('doitac');
  await gui('dmDtForm', {ten: 'TRẦN NGƯỜI KÝ', cccd: '049085001111', diaChi: 'Quảng Nam'});
  ok('thêm người ký vận chuyển', /TRẦN NGƯỜI KÝ/.test(await w.innerText('#dmDtTbl')));
  await gui('dmDtForm', {ten: 'TRÙNG', cccd: '049085001111'});
  ok('trùng CCCD đối tác: báo lỗi', /đã có/.test(await w.innerText('#dmBody')) && (await w.$$('#dmDtTbl tbody tr')).length === 1);
  ok('tổ trưởng ký nhân công lấy từ danh mục lao động', /NGUYỄN VĂN A/.test(await w.innerText('#dmBody')));
  await tab('bhld'); ok('tab BHLĐ liệt kê vị trí', (await w.$$('#dmBhldTbl tbody tr')).length > 0);
  // lưu thật xuống SQLite
  await w.reload(); await w.waitForSelector('#side'); await w.click('#navDm'); await tab('laodong');
  ok('khởi động lại: danh mục còn nguyên (SQLite)', (await w.$$('#dmLdTbl tbody tr')).length === 2);
  await tab('xe'); ok('xe còn nguyên sau khởi động lại', (await w.$$('#dmXeTbl tbody tr')).length === 1);
  ok('không có lỗi script trên màn hình', errs.length === 0, errs.join(' | '));
  await app.close(); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
