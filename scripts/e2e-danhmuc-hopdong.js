'use strict';
/* Nhập theo hợp đồng từ Danh mục (bản 2.1, GĐ C): chọn người / xe từ danh mục, bản chụp trong lô, nút “Cập nhật từ danh mục”, người mới tự vào danh mục (Electron thật, SQLite thật).
 * Chạy: xvfb-run -a node scripts/e2e-danhmuc-hopdong.js */
const {_electron: electron} = require('playwright-core');
const path = require('path'), fs = require('fs'), os = require('os');
const src = fs.readFileSync(path.join(__dirname, 'e2e-inan2.js'), 'utf8');
const {nv, lot, seed} = new Function(src.slice(src.indexOf('const nv ='), src.indexOf('const plain =')) + '; return {nv, lot, seed};')();
const root = path.join(__dirname, '..');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hakqn-dmhd-'));
let fail = 0; const ok = (name, cond, extra) => { console.log((cond ? 'ĐẠT  ' : 'LỖI  ') + name + (!cond && extra ? ' — ' + extra : '')); if (!cond) fail++; };
(async () => {
  const app = await electron.launch({executablePath: require('electron'), args: [root, '--no-sandbox'], env: {...process.env, HAKQN_CLOSE: 'discard', HAKQN_DB: path.join(dir, 'd.sqlite'), HAKQN_USERDATA: path.join(dir, 'ud'), HAKQN_DOWNLOAD_DIR: path.join(dir, 'out')}});
  const w = require('./_hd30').boc(await app.firstWindow()); const errs = []; w.on('pageerror', e => errs.push(e.message)); w.on('dialog', d => d.accept()); await w.waitForSelector('#side');
  const B = lot('fb', 'R-B', {exp: {}, kl: null, pc: [], nc: [nv(1, 'Tổ trưởng', 'TỔ TRƯỞNG B', 'Tổ trưởng', '049085007009')]});
  B.nc = B.nc.map(r => ({...r, maRung: 'R-B'})); B.dx = B.dx.map(r => ({...r, maRung: 'R-B'}));
  const D = seed([B]);
  D.dmLaoDong = [{ngayCapNhat: '01/09/2026', cccd: '049085007002', ten: 'LÊ THỢ CƯA', gioiTinh: 'Nam', ngaySinh: '02/02/1990', diaChi: 'Quế Sơn', ngayCap: '03/03/2021', noiCap: 'CA QN', sdt: '0905000111', chucVu: 'Công nhân', viTri: 'Công nhân khai thác'}];
  D.dmXeVC = [{ngayCapNhat: '01/09/2026', bienSo: '92C-555.66', chuXe: 'CHỦ XE DM', taiXe: 'TÀI XẾ DM', cccdTx: '049085008888', diaChiTx: 'Thăng Bình', ngayCapTx: '04/04/2020', noiCapTx: 'CA QN', gplx: 'GP123', hanGplx: '01/01/2030', hanDangKiem: '01/01/2027', hanBaoHiem: '01/01/2027'}];
  await w.evaluate(d => window.hak.save(d), D); await w.reload(); await w.waitForSelector('#side');
  const forests = async () => (await w.evaluate(() => window.hak.loadSync().db)).rs.own1.forests;
  const dbAll = async () => (await w.evaluate(() => window.hak.loadSync().db));
  const open = async ftab => { await w.click('[data-open=own1]'); await w.click('[data-tab=rung]'); await w.click('[data-forest=fb]'); await w.click('[data-ftab=' + ftab + ']'); await w.waitForTimeout(300); };
  // 1. nhân công: chọn từ danh mục
  await open('nc'); await w.click('[data-act=stAdd][data-kind=nc]'); await w.waitForSelector('#stForm');
  const opts = await w.$$eval('#ncDm option', o => o.map(x => x.textContent.trim()));
  ok('ô chọn người lấy từ Danh mục lao động', opts.some(x => /LÊ THỢ CƯA/.test(x)) && !opts.some(x => /TỔ TRƯỞNG B/.test(x)), opts.join('|'));
  await w.selectOption('#ncDm', '049085007002'); await w.waitForTimeout(300);
  const v = await w.$eval('#stForm', f => ({ten: f.ten.value, cccd: f.cccd.value, diaChi: f.diaChi.value, noiCap: f.noiCap.value, vaiTro: f.vaiTro.value, chucDanh: f.chucDanh.value, danhXung: f.danhXung.value}));
  ok('chọn người: điền sẵn thông tin, chức vụ → vai trò, vị trí → chức danh, giới tính → danh xưng', v.ten === 'LÊ THỢ CƯA' && v.diaChi === 'Quế Sơn' && v.noiCap === 'CA QN' && v.vaiTro === 'Công nhân' && v.chucDanh === 'Công nhân khai thác' && v.danhXung === 'Ông', JSON.stringify(v));
  await w.click('#stForm button[type=submit]'); await w.waitForTimeout(400); await w.click('button[data-act=stSave]'); await w.waitForTimeout(500);
  let F = await forests(); let p = F.fb.nc.find(r => r.cccd === '049085007002');
  ok('lưu: người được chụp vào lô', !!p && p.diaChi === 'Quế Sơn' && p.chucDanh === 'Công nhân khai thác', JSON.stringify(p));
  // 2. danh mục đổi → lô báo lệch, cập nhật có chủ ý
  // 3.0: màn Danh mục lao động cũ đã thay bằng Danh mục đối tượng; danh mục lao động cũ (nguồn ô chọn ở lô) nhận dòng mới hơn trực tiếp
  await w.evaluate(() => { const d = window.hak.loadSync().db, c = d.dmLaoDong.filter(r => r.cccd === '049085007002').slice(-1)[0]; d.dmLaoDong.push(Object.assign({}, c, {ngayCapNhat: '01/11/2026', diaChi: 'Đại Lộc'})); return window.hak.save(d); });
  await w.reload(); await w.waitForSelector('#side');
  await open('nc'); const lech = await w.innerText('#dmLechnc').catch(() => '');
  ok('danh mục đổi thường trú: tab Nhân công báo “mới hơn bản chụp”', /mới hơn/.test(lech) && /LÊ THỢ CƯA/.test(lech) && /thường trú/.test(lech), lech);
  F = await forests(); ok('lô chưa tự đổi (bản chụp giữ nguyên, hồ sơ đã in không đổi)', F.fb.nc.find(r => r.cccd === '049085007002').diaChi === 'Quế Sơn');
  await w.click('[data-act=dmCapNhatLo][data-kind=nc]'); await w.waitForTimeout(300);
  F = await forests(); ok('bấm Cập nhật chỉ đổi bản nháp: SQLite chưa đổi, hiện thanh Chưa lưu', F.fb.nc.find(r => r.cccd === '049085007002').diaChi === 'Quế Sơn' && !!(await w.$('#stDirty')));
  await w.click('button[data-act=stSave]'); await w.waitForTimeout(500); F = await forests();
  ok('lưu: lô nhận thường trú mới, các trường khác (vai trò, chức danh) giữ nguyên', F.fb.nc.find(r => r.cccd === '049085007002').diaChi === 'Đại Lộc' && F.fb.nc.find(r => r.cccd === '049085007002').chucDanh === 'Công nhân khai thác');
  ok('hết thanh báo lệch', !(await w.$('#dmLechnc')));
  // 3. người mới nhập tại lô tự vào danh mục
  await w.click('[data-act=stAdd][data-kind=nc]'); await w.waitForSelector('#stForm');
  await w.evaluate(() => { const f = document.getElementById('stForm'); const set = (k, v) => { f.elements[k].value = v; }; set('ten', 'PHẠM NGƯỜI MỚI'); set('cccd', '049085007003'); set('ngaySinh', '05/05/1991'); set('ngayCap', '06/06/2021'); set('noiCap', 'CA QN'); set('diaChi', 'Duy Xuyên'); set('vaiTro', 'Công nhân'); set('chucDanh', 'Công nhân khai thác'); });
  await w.click('#stForm button[type=submit]'); await w.waitForTimeout(400); await w.click('button[data-act=stSave]'); await w.waitForTimeout(600);
  let D2 = await dbAll(), m = (D2.dmLaoDong || []).filter(r => r.cccd === '049085007003');
  ok('người mới nhập ở lô tự vào Danh mục lao động (1 dòng), không phải nhập hai nơi', m.length === 1 && m[0].ten === 'PHẠM NGƯỜI MỚI' && m[0].diaChi === 'Duy Xuyên', JSON.stringify(m));
  ok('người đã có trong danh mục không bị thêm dòng trùng', (D2.dmLaoDong || []).filter(r => r.cccd === '049085007002').length === 2);
  // 4. xe
  await w.click('[data-ftab=dx]'); await w.waitForTimeout(300); await w.click('[data-act=stAdd][data-kind=dx]'); await w.waitForSelector('#stForm');
  const ox = await w.$$eval('#xeDm option', o => o.map(x => x.textContent.trim()));
  ok('ô chọn xe lấy từ Danh mục xe vận chuyển', ox.some(x => /92C-555\.66/.test(x)), ox.join('|'));
  await w.selectOption('#xeDm', '92C55566'); await w.waitForTimeout(300);
  const vx = await w.$eval('#stForm', f => ({bienSo: f.bienSo.value, taiXe: f.taiXe.value, cccdTx: f.cccdTx.value, gplx: f.gplx.value, hanGplx: f.hanGplx.value, kdDen: f.kdDen.value, hanBH: f.hanBH.value}));
  ok('chọn xe: điền biển số, tài xế, CCCD, GPLX, hạn giấy phép, đăng kiểm, bảo hiểm', vx.bienSo === '92C-555.66' && vx.taiXe === 'TÀI XẾ DM' && vx.cccdTx === '049085008888' && vx.gplx === 'GP123' && vx.hanGplx === '01/01/2030' && vx.kdDen === '01/01/2027' && vx.hanBH === '01/01/2027', JSON.stringify(vx));
  ok('không có lỗi script trên màn hình', errs.length === 0, errs.join(' | '));
  await app.close(); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
