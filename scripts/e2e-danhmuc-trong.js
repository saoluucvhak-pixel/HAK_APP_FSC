'use strict';
/* Lấy thông tin từ Danh mục không ghi đè bằng ô trống (Electron thật, SQLite thật): dòng danh mục thiếu tài xế không làm lô mất tài xế; thanh “mới hơn” chỉ báo trường danh mục có giá trị;
 * lô sửa sau danh mục không bị đề nghị lùi; chọn xe từ danh mục điền đủ thông tin chủ xe (người ký là chủ xe); Danh mục xe lưu và hiện trường chủ xe.
 * Chạy: xvfb-run -a node scripts/e2e-danhmuc-trong.js */
const {_electron: electron} = require('playwright-core');
const path = require('path'), fs = require('fs'), os = require('os');
const src = fs.readFileSync(path.join(__dirname, 'e2e-inan2.js'), 'utf8');
const {nv, lot, seed} = new Function(src.slice(src.indexOf('const nv ='), src.indexOf('const plain =')) + '; return {nv, lot, seed};')();
const root = path.join(__dirname, '..');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hakqn-dmtr-'));
let fail = 0; const ok = (name, cond, extra) => { console.log((cond ? 'ĐẠT  ' : 'LỖI  ') + name + (!cond && extra ? ' — ' + extra : '')); if (!cond) fail++; };
(async () => {
  const app = await electron.launch({executablePath: require('electron'), args: [root, '--no-sandbox'], env: {...process.env, HAKQN_CLOSE: 'discard', HAKQN_DB: path.join(dir, 'd.sqlite'), HAKQN_USERDATA: path.join(dir, 'ud'), HAKQN_DOWNLOAD_DIR: path.join(dir, 'out')}});
  const w = await app.firstWindow(); const errs = []; w.on('pageerror', e => errs.push(e.message)); w.on('dialog', d => d.accept()); await w.waitForSelector('#side');
  const B = lot('fb', 'R-B', {exp: {}, kl: null, pc: [], nc: [nv(1, 'Tổ trưởng', 'TỔ TRƯỞNG B', 'Tổ trưởng', '049085007009')]});
  B.nc = B.nc.map(r => ({...r, maRung: 'R-B'}));
  B.dx = B.dx.map((r, i) => ({...r, maRung: 'R-B', ...(i === 0 ? {bienSo: '92C-777.88', taiXe: 'Tư', cccdTx: '049000000009', gplx: 'GPTU', hanGplx: '01/01/2030', kdDen: '01/01/2027', hanBH: '01/01/2027', chuXe: 'Chủ cũ', _dmNgay: '01/01/2026'} : {})}));
  const D = seed([B]);
  D.dmXeVC = [{ngayCapNhat: '01/11/2026', bienSo: '92C-777.88', chuXe: '', taiXe: '', cccdTx: '', diaChiTx: '', ngayCapTx: '', noiCapTx: '', gplx: '', hanGplx: '', hanDangKiem: '01/06/2027', hanBaoHiem: '',
    loaiXe: '', cccd: '', ngaySinh: '', ngayCap: '', noiCap: '', diaChi: '', sdt: '', cavet: '', nguoiKy: ''},
  {ngayCapNhat: '01/11/2026', bienSo: '92C-555.66', chuXe: 'CHỦ XE DM', taiXe: 'TÀI XẾ DM', cccdTx: '049085008888', diaChiTx: 'Thăng Bình', ngayCapTx: '04/04/2020', noiCapTx: 'CA QN', gplx: 'GP123', hanGplx: '01/01/2030', hanDangKiem: '01/01/2027', hanBaoHiem: '01/01/2027',
    loaiXe: 'Xe ben', cccd: '049085009999', ngaySinh: '02/02/1975', ngayCap: '03/03/2021', noiCap: 'CA QN', diaChi: 'Quế Sơn', sdt: '0905123456', cavet: '05/05/2019', nguoiKy: 'Chủ xe'}];
  await w.evaluate(d => window.hak.save(d), D); await w.reload(); await w.waitForSelector('#side');
  const dbAll = async () => (await w.evaluate(() => window.hak.loadSync().db));
  const open = async ftab => { await w.click('[data-open=own1]'); await w.click('[data-tab=rung]'); await w.click('[data-forest=fb]'); await w.click('[data-ftab=' + ftab + ']'); await w.waitForTimeout(300); };
  // 1. lô có tài xế Tư, danh mục không có tài xế: thanh “mới hơn” chỉ nêu hạn đăng kiểm
  await open('dx'); const lech = await w.innerText('#dmLechdx').catch(() => '');
  ok('thanh “danh mục mới hơn” chỉ nêu trường danh mục CÓ giá trị (hạn đăng kiểm), không nêu tài xế, giấy phép trống', /mới hơn/.test(lech) && /hạn đăng kiểm/.test(lech) && !/tài xế|giấy phép|chủ xe/.test(lech), lech);
  await w.click('[data-act=dmCapNhatLo][data-kind=dx]'); await w.waitForTimeout(300); await w.click('button[data-act=stSave]'); await w.waitForTimeout(600);
  let F = (await dbAll()).rs.own1.forests.fb, x = F.dx.find(r => /777/.test(r.bienSo));
  ok('cập nhật từ danh mục: hạn đăng kiểm đổi, lô GIỮ tài xế Tư, CCCD, giấy phép, chủ xe, hạn bảo hiểm', x.kdDen === '01/06/2027' && x.taiXe === 'Tư' && x.cccdTx === '049000000009' && x.gplx === 'GPTU' && x.chuXe === 'Chủ cũ' && x.hanBH === '01/01/2027', JSON.stringify(x));
  ok('lô lưu ngày chụp danh mục (_dmNgay = 01/11/2026), hết thanh báo lệch', x._dmNgay === '01/11/2026' && !(await w.$('#dmLechdx')));
  // 2. lô sửa sau danh mục: không đề nghị lùi về số cũ
  await w.click('[data-act=stEdit][data-kind=dx][data-i="0"]').catch(() => {}); await w.waitForTimeout(300);
  const mo = await w.$('#stForm');
  if (mo) { await w.evaluate(() => { const f = document.getElementById('stForm'); f.elements.kdDen.value = '01/12/2027'; f.requestSubmit(); }); await w.waitForTimeout(400); }
  ok('sửa tay hạn đăng kiểm sau khi chụp: KHÔNG hiện đề nghị cập nhật lùi về số của danh mục', !!mo && !(await w.$('#dmLechdx')), 'mo=' + !!mo);
  await w.click('button[data-act=stSave]').catch(() => {}); await w.waitForTimeout(500);
  // 3. chọn xe từ danh mục: điền đủ thông tin chủ xe
  await w.click('[data-act=stAdd][data-kind=dx]'); await w.waitForSelector('#xeDm'); await w.selectOption('#xeDm', '92C55566'); await w.waitForTimeout(300);
  const v = await w.$eval('#stForm', f => ({bienSo: f.bienSo.value, chuXe: f.chuXe.value, cccd: f.cccd.value, ngaySinh: f.ngaySinh.value, ngayCap: f.ngayCap.value, noiCap: f.noiCap.value, diaChi: f.diaChi.value, sdt: f.sdt.value, loaiXe: f.loaiXe.value, cavet: f.cavet.value, nguoiKy: f.nguoiKy.value, taiXe: f.taiXe.value}));
  ok('chọn xe từ danh mục: điền đủ thông tin chủ xe (CCCD, ngày sinh, ngày cấp, nơi cấp, thường trú, điện thoại, loại xe, cà vẹt, người ký là chủ xe)', v.chuXe === 'CHỦ XE DM' && v.cccd === '049085009999' && v.ngaySinh === '02/02/1975' && v.ngayCap === '03/03/2021' && v.noiCap === 'CA QN' && v.diaChi === 'Quế Sơn' && v.sdt === '0905123456' && v.loaiXe === 'Xe ben' && v.cavet === '05/05/2019' && v.nguoiKy === 'Chủ xe' && v.taiXe === 'TÀI XẾ DM', JSON.stringify(v));
  await w.evaluate(() => document.getElementById('stForm').requestSubmit()); await w.waitForTimeout(400); await w.click('button[data-act=stSave]'); await w.waitForTimeout(600);
  F = (await dbAll()).rs.own1.forests.fb; x = F.dx.find(r => /555/.test(r.bienSo));
  ok('lưu: xe mới có thông tin chủ xe đủ và ngày chụp', !!x && x.cccd === '049085009999' && x.sdt === '0905123456' && x.nguoiKy === 'Chủ xe' && x._dmNgay === '01/11/2026', JSON.stringify(x));
  // 4. (3.0) form Danh mục xe cũ đã thay bằng Danh mục xe mới — kiểm ở e2e-danhmuc30
  ok('không có lỗi script trên màn hình', errs.length === 0, errs.join(' | '));
  await app.close(); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
