'use strict';
/* Danh mục xe: chọn tài xế thường chạy theo xe (Electron thật, SQLite thật):
 *  - tạo người có chức vụ Tài xế → thêm xe chọn tài xế → lưu → mở lại vẫn thấy tài xế (ô chọn, cột Tài xế, lọc theo tên tài xế);
 *  - xe không gắn tài xế: bản ghi không có khóa taiXeId;
 *  - thêm xe vào lô: tên / CCCD / GPLX tài xế điền sẵn; xe có dòng cũ đã có tài xế thì KHÔNG bị ghi đè.
 * Chạy: xvfb-run -a node scripts/e2e-xe-taixe.js */
const {_electron: electron} = require('playwright-core');
const path = require('path'), fs = require('fs'), os = require('os');
const src = fs.readFileSync(path.join(__dirname, 'e2e-inan2.js'), 'utf8');
const {nv, lot, seed} = new Function(src.slice(src.indexOf('const nv ='), src.indexOf('const plain =')) + '; return {nv, lot, seed};')();
const root = path.join(__dirname, '..');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hakqn-xetx-'));
let fail = 0; const ok = (name, cond, extra) => { console.log((cond ? 'ĐẠT  ' : 'LỖI  ') + name + (!cond && extra ? ' — ' + extra : '')); if (!cond) fail++; };
(async () => {
  const app = await electron.launch({executablePath: require('electron'), args: [root, '--no-sandbox'], env: {...process.env, HAKQN_CLOSE: 'discard', HAKQN_DB: path.join(dir, 'd.sqlite'), HAKQN_USERDATA: path.join(dir, 'ud'), HAKQN_DOWNLOAD_DIR: path.join(dir, 'out')}});
  const w = require('./_hd30').boc(await app.firstWindow()); const errs = []; w.on('pageerror', e => errs.push(e.message)); w.on('dialog', d => d.accept()); await w.waitForSelector('#side');
  const B = lot('fb', 'R-B', {exp: {}, kl: null, pc: [], nc: [nv(1, 'Tổ trưởng', 'TỔ TRƯỞNG B', 'Tổ trưởng', '049085007009')]});
  B.nc = B.nc.map(r => ({...r, maRung: 'R-B'})); B.dx = B.dx.map(r => ({...r, maRung: 'R-B'}));
  const D = seed([B]);
  D.dmXeVC = [{ngayCapNhat: '01/09/2026', bienSo: '92C-777.88', chuXe: 'CHỦ CŨ', taiXe: 'TÀI XẾ CŨ', cccdTx: '049085008888', gplx: 'GP-CU', hanGplx: '01/01/2031'}];
  await w.evaluate(d => window.hak.save(d), D); await w.reload(); await w.waitForSelector('#side');
  const dbAll = () => w.evaluate(() => window.hak.loadSync().db);
  const set = (sel, o) => w.evaluate(([sel, o]) => { const f = document.querySelector(sel); Object.entries(o).forEach(([k, v]) => { const e = f.elements[k]; if (e.type === 'checkbox') e.checked = !!v; else e.value = v; }); }, [sel, o]);

  // 1. người có chức vụ Tài xế (và một người chỉ Nhân công để thử lọc)
  await w.click('#navDm'); await w.click('#setTab_setdt'); await w.waitForSelector('#dtBang');
  await w.click('#cnThem'); await w.waitForSelector('#dtForm');
  await set('#dtForm', {ten: 'NGUYỄN VĂN LÁI', diaChi: 'Quế Sơn', sdt: '0905111222', hoTen: 'NGUYỄN VĂN LÁI', cccd: '049085001234', ngayCap: '01/01/2021', noiCap: 'Cục CS QLHC', gioiTinh: 'Nam', vtTaiXe: true, gplx: 'GP-777', hanGplx: '01/01/2030'});
  await w.click('#dtLuu'); await w.waitForTimeout(400);
  await w.click('#cnThem'); await w.waitForSelector('#dtForm'); await set('#dtForm', {ten: 'TỔ CƯA TRẦN SƠN', hoTen: 'TRẦN SƠN', cccd: '049085000001', vtNhanCong: true});
  await w.click('#dtLuu'); await w.waitForTimeout(400);
  let D1 = await dbAll(), ng = ((D1.dmDoiTuong || []).find(o => o.ten === 'NGUYỄN VĂN LÁI') || {nguoi: [{}]}).nguoi[0];
  ok('có người chức vụ Tài xế trong Danh mục đối tượng', !!ng.id && ng.vaiTro && ng.vaiTro.taiXe, JSON.stringify(ng));

  // 2. thêm xe chọn tài xế
  await w.click('#setTab_setxe'); await w.waitForSelector('#xeBang'); await w.click('#xeThem'); await w.waitForSelector('#xeForm');
  const optsTx = await w.$$eval('#xeForm [name=taiXeId] option', e => e.map(x => x.textContent));
  ok('ô Tài xế chỉ liệt kê người có chức vụ Tài xế', optsTx.some(x => /NGUYỄN VĂN LÁI/.test(x)) && !optsTx.some(x => /TRẦN SƠN/.test(x)), optsTx.join('|'));
  ok('có dòng hướng dẫn: tài xế là chức vụ của người trong Danh mục đối tượng', /Tài xế là chức vụ của người trong Danh mục đối tượng/.test(await w.innerText('#xeForm')));
  await set('#xeForm', {bks: '92C-456.78', loaiXe: 'Xe tải', taiXeId: ng.id}); await w.click('#xeLuu'); await w.waitForTimeout(400);
  const xCu = (await dbAll()).dmXe.find(x => x.bks === '92C-777.88');   // xe từ danh mục cũ (đã chuyển sang Danh mục xe): sửa để gắn tài xế
  await w.click('#xeBang [data-xesua=' + xCu.id + ']'); await w.waitForSelector('#xeForm'); await set('#xeForm', {taiXeId: ng.id}); await w.click('#xeLuu'); await w.waitForTimeout(400);
  await w.click('#xeThem'); await w.waitForSelector('#xeForm'); await set('#xeForm', {bks: '92C-000.11'}); await w.click('#xeLuu'); await w.waitForTimeout(400);
  D1 = await dbAll(); const x1 = (D1.dmXe || []).find(x => x.bks === '92C-456.78'), x3 = (D1.dmXe || []).find(x => x.bks === '92C-000.11');
  ok('lưu: xe có taiXeId; xe không gắn tài xế không có khóa taiXeId', !!x1 && x1.taiXeId === ng.id && !!x3 && !('taiXeId' in x3), JSON.stringify([x1, x3]));
  const bang = await w.innerText('#xeBang');
  ok('bảng có cột Tài xế và hiện tên tài xế', /Tài xế/.test(bang) && /NGUYỄN VĂN LÁI/.test(bang), bang);
  await w.fill('[data-sfq=dm_xe]', 'văn lái'); await w.waitForTimeout(700);
  const nLoc = (await w.$$('#xeBang tbody tr[data-xe]')).length;
  ok('lọc theo tên tài xế ra đúng xe đã gắn', nLoc === 2, 'số dòng ' + nLoc);
  await w.fill('[data-sfq=dm_xe]', '');

  // 3. mở lại: ô chọn còn tài xế
  await w.reload(); await w.waitForSelector('#side'); await w.click('#navDm'); await w.click('#setTab_setxe'); await w.waitForSelector('#xeBang');
  await w.click('#xeBang [data-xesua=' + x1.id + ']'); await w.waitForSelector('#xeForm');
  ok('mở lại: ô Tài xế hiện đúng người đã chọn', await w.$eval('#xeForm [name=taiXeId]', e => e.value) === ng.id);
  await w.click('[data-act=xeHuy]'); await w.waitForTimeout(200);

  // 4. thêm xe vào lô: tài xế điền sẵn
  await w.reload(); await w.waitForSelector('#side');
  const open = async ftab => { await w.click('[data-open=own1]'); await w.click('[data-tab=rung]'); await w.click('[data-forest=fb]'); await w.click('[data-ftab=' + ftab + ']'); await w.waitForTimeout(300); };
  await open('dx'); await w.click('[data-act=stAdd][data-kind=dx]'); await w.waitForSelector('#stForm');
  await w.selectOption('#xeDm', '92C45678'); await w.waitForTimeout(300);
  const v = await w.$eval('#stForm', f => ({bienSo: f.bienSo.value, taiXe: f.taiXe.value, cccdTx: f.cccdTx.value, gplx: f.gplx.value, hanGplx: f.hanGplx.value, ngayCapTx: f.ngayCapTx.value}));
  ok('chọn xe có tài xế: điền sẵn tên, CCCD, GPLX, hạn GPLX, ngày cấp CCCD', v.taiXe === 'NGUYỄN VĂN LÁI' && v.cccdTx === '049085001234' && v.gplx === 'GP-777' && v.hanGplx === '01/01/2030' && v.ngayCapTx === '01/01/2021', JSON.stringify(v));
  await set('#stForm', {chuXe: 'CHỦ XE LÔ', cccd: '049085002222', ngayCap: '02/02/2021', noiCap: 'CA QN', diaChi: 'Thăng Bình', sdt: '0905222333'});   // chủ xe: bắt buộc ở lô, không thuộc phạm vi tài xế
  await w.click('#stForm button[type=submit]'); await w.waitForTimeout(400);
  await w.evaluate(() => document.querySelector('button[data-act=stepSave]').click()); await w.waitForTimeout(800);
  const F = (await dbAll()).rs.own1.forests, r1 = F.fb.dx.find(r => /456/.test(r.bienSo));
  ok('lưu lô: dòng xe chụp tài xế và nối taiXeId', !!r1 && r1.taiXe === 'NGUYỄN VĂN LÁI' && r1.gplx === 'GP-777' && r1.taiXeId === ng.id, JSON.stringify(r1));
  const dmSau = (await dbAll()).dmDoiTuong.find(o => o.ten === 'NGUYỄN VĂN LÁI').nguoi[0];
  ok('danh mục đối tượng không đổi sau khi lô chụp', dmSau.gplx === 'GP-777' && dmSau.hoTen === 'NGUYỄN VĂN LÁI');
  // 5. xe có dòng cũ đã có tài xế: không ghi đè
  await w.click('[data-act=stAdd][data-kind=dx]'); await w.waitForSelector('#stForm'); await w.selectOption('#xeDm', '92C77788'); await w.waitForTimeout(300);
  const v2 = await w.$eval('#stForm', f => ({taiXe: f.taiXe.value, cccdTx: f.cccdTx.value, gplx: f.gplx.value}));
  ok('xe có dòng cũ đã có tài xế: giữ tài xế cũ, không ghi đè bằng tài xế danh mục', v2.taiXe === 'TÀI XẾ CŨ' && v2.cccdTx === '049085008888' && v2.gplx === 'GP-CU', JSON.stringify(v2));
  ok('không có lỗi script trên màn hình', errs.length === 0, errs.join(' | '));
  await app.close(); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
