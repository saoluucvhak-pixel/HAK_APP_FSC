'use strict';
/* Đối tác là MỘT nguồn và dùng được khi ký (Electron thật, SQLite thật, file Word xuất thực tế): doanh nghiệp chỉ ở db.dmDoiTac (không còn danh mục đơn vị vận chuyển riêng); nút Sửa doanh nghiệp ở
 * màn Danh mục mở form sửa ngay tại đó và đổi cả tab Vận chuyển; người ký của đội xe chọn được người ký cá nhân trong Đối tác; hợp đồng vận chuyển in đúng bên B; sửa đối tác sau đó không đổi hợp
 * đồng đã in mà nhắc “danh mục đã đổi”, cập nhật có chủ ý; nâng cấp từ dữ liệu có hai danh mục. Chạy: xvfb-run -a node scripts/e2e-doitac-mot-nguon.js */
const {_electron: electron} = require('playwright-core');
const path = require('path'), fs = require('fs'), os = require('os');
const JSZip = require('jszip');
const src = fs.readFileSync(path.join(__dirname, 'e2e-inan2.js'), 'utf8');
const {xe, lot, seed, PC, EXP1, plain} = new Function(src.slice(src.indexOf('const nv ='), src.indexOf('const plain =') + src.slice(src.indexOf('const plain =')).indexOf('\n')) + '; return {xe, lot, seed, PC, EXP1, plain};')();
const root = path.join(__dirname, '..');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hakqn-dtac-')), out = path.join(dir, 'out');
let fail = 0; const ok = (name, cond, extra) => { console.log((cond ? 'ĐẠT  ' : 'LỖI  ') + name + (!cond && extra ? ' — ' + extra : '')); if (!cond) fail++; };
(async () => {
  fs.mkdirSync(out, {recursive: true});
  const env = {...process.env, HAKQN_CLOSE: 'discard', HAKQN_DB: path.join(dir, 'd.sqlite'), HAKQN_USERDATA: path.join(dir, 'ud'), HAKQN_DOWNLOAD_DIR: out};
  const app = await electron.launch({executablePath: require('electron'), args: [root, '--no-sandbox'], env});
  const w = await app.firstWindow(); const errs = []; w.on('pageerror', e => errs.push(e.message)); w.on('dialog', d => d.accept()); await w.waitForSelector('#side');
  const A = lot('fa', 'R-A', {exp: EXP1, pc: PC, kl: 29.75, dx: [xe('92C-12345', '049000000077', 'LÊ VĂN AN')]});
  A.info.vanChuyen = {mode: 'coDinh', coDinh: 50000};
  const D = seed([A]);
  // dữ liệu 2.2 có CẢ HAI danh mục (đúng như trước bản sửa): doanh nghiệp ở dmDonViVC và bản chép cũ ở dmDoiTac; người ký cá nhân chỉ ở Đối tác
  D.dmDonViVC = {dv1: {id: 'dv1', loai: 'doanhnghiep', ten: 'CÔNG TY VẬN TẢI HÒA PHÁT', mst: '0401234567', diaChi: 'Hòa Khánh, Đà Nẵng', daiDien: 'NGUYỄN VĂN ĐẠI', chucVu: 'Giám đốc', sdt: ''}};
  D.dmDoiTac = [{id: 'dn:dv1', loai: 'doanhnghiep', ten: 'CÔNG TY VẬN TẢI HÒA PHÁT (bản chép cũ)', mst: '0401234567'},
    {id: 'dt1', loai: 'nguoiKyVC', ten: 'PHẠM THỊ ĐỐI TÁC', cccd: '049000000555', ngaySinh: '02/03/1980', diaChi: 'Thăng Bình, Quảng Nam', ngayCap: '04/05/2021', noiCap: 'CA QUẢNG NAM', sdt: '0905111222', vaiTro: 'Chủ xe'}];
  const r0 = await w.evaluate(d => window.hak.save(d), D); ok('nạp dữ liệu giả lập có cả hai danh mục', r0 && r0.ok, JSON.stringify(r0));
  await w.reload(); await w.waitForSelector('#side');
  const dbx = async () => (await w.evaluate(() => window.hak.loadSync().db)), lotDb = async () => (await dbx()).rs.own1.forests.fa;
  const open = async ftab => { if (!(await w.$('[data-ftab=nc]'))) { await w.click('[data-open=own1]'); await w.click('[data-tab=rung]'); await w.click('[data-forest=fa]'); } await w.click('[data-ftab=' + ftab + ']'); await w.waitForTimeout(400); };
  // 0. SQLite đã nâng cấp v10 khi mở app: một nguồn
  let d = await dbx();   // (nâng cấp SQLite v10 khi mở: kiểm ở tests/store.test.js; đây là dữ liệu sao lưu cũ vừa nạp, giao diện gộp khi mở)
  const gop = await w.evaluate(() => window.__doiTac());
  ok('mở dữ liệu có hai danh mục: giao diện chỉ còn một nguồn (dmDoiTac), không mất dòng, doanh nghiệp lấy theo danh mục đơn vị vận chuyển', !gop.co && gop.dt.length === 2 && gop.dt.includes('dn:dv1:CÔNG TY VẬN TẢI HÒA PHÁT') && gop.dt.some(x => /^dt1:/.test(x)), JSON.stringify(gop));
  // 1. màn Danh mục → Đối tác: nút Sửa doanh nghiệp mở form sửa ngay tại màn đó
  await w.click('#navDm'); await w.click('[data-dmtab=doitac]'); await w.waitForSelector('#dvForm');
  ok('Danh mục → Đối tác: liệt kê doanh nghiệp và người ký cá nhân', /HÒA PHÁT/.test(await w.innerText('#dmBody')) && /PHẠM THỊ ĐỐI TÁC/.test(await w.innerText('#dmBody')));
  await w.click('[data-act=suaDv]'); await w.waitForTimeout(200);
  ok('bấm Sửa doanh nghiệp: form sửa mở ngay tại màn Danh mục, điền sẵn thông tin', (await w.inputValue('#dvForm [name=ten]')) === 'CÔNG TY VẬN TẢI HÒA PHÁT' && (await w.inputValue('#dvForm [name=mst]')) === '0401234567' && /Sửa đơn vị|Sửa/.test(await w.innerText('#dvForm')) && (await w.$('#dmBody #dvForm')) !== null);
  await w.fill('#dvForm [name=daiDien]', 'LÊ VĂN SỬA'); await w.click('#dvForm [type=submit]'); await w.waitForTimeout(500);
  d = await dbx(); ok('lưu: sửa đúng dòng (không thêm dòng mới), vẫn một nguồn', d.dmDoiTac.filter(x => x.loai === 'doanhnghiep').length === 1 && d.dmDoiTac.find(x => x.id === 'dn:dv1').daiDien === 'LÊ VĂN SỬA' && !('dmDonViVC' in d));
  // 2. tab Vận chuyển đọc cùng một nguồn
  await open('dx'); await w.waitForSelector('#hdvcKT');
  ok('tab Vận chuyển: danh mục doanh nghiệp là cùng bản vừa sửa', /LÊ VĂN SỬA/.test(await w.$eval('#hdvcKT', e => e.textContent)));
  await w.click('[data-act=chonHd]'); await w.waitForSelector('#hdForm');
  const selHd = async () => { if (!(await w.$('#hdForm'))) await w.click('[data-act=chonHd]'); await w.waitForSelector('#hdForm'); };
  const opts = await w.$$eval('#hdForm [name=ky] option', o => o.map(x => x.textContent));
  ok('người ký của đội xe chọn được: người trong đội, doanh nghiệp trong Đối tác, người ký cá nhân trong Đối tác', opts.some(x => /LÊ VĂN AN/.test(x)) && opts.some(x => /HÒA PHÁT/.test(x)) && opts.some(x => /PHẠM THỊ ĐỐI TÁC/.test(x)), opts.join(' | '));
  // 3. chọn người ký cá nhân từ Đối tác: chụp lại thông tin vào đội xe, hợp đồng in đúng bên B
  await w.selectOption('#hdForm [name=ky]', 'd:dt1'); await w.$eval('#hdForm', f => f.requestSubmit()); await w.waitForTimeout(400); await w.click('#loDirtyBar [data-act=stSave]').catch(() => {}); await w.waitForTimeout(500);
  let f = await lotDb(), H = f.hdvc[0];
  ok('đội xe chụp lại thông tin người ký cá nhân (ben) và trỏ đúng id đối tác', H.donViId === 'dt1' && H.ben.ten === 'PHẠM THỊ ĐỐI TÁC' && H.ben.cccd === '049000000555' && H.ben.noiCap === 'CA QUẢNG NAM', JSON.stringify([H.donViId, H.ben]));
  const xuat = async () => { for (const x of fs.readdirSync(out)) fs.unlinkSync(path.join(out, x)); await w.click('[data-ftab=xuat]'); await w.click('[data-xtab=vc]'); await w.waitForTimeout(400);
    await w.click('button[data-act=dl][data-kind=hdvc][data-idx="0"]'); let n = null; for (let i = 0; i < 100 && !n; i++) { n = fs.readdirSync(out).find(x => /\.docx$/.test(x)); if (!n) await w.waitForTimeout(150); } await w.waitForTimeout(400);
    return plain(await (await JSZip.loadAsync(fs.readFileSync(path.join(out, n)))).file('word/document.xml').async('string')); };
  let hd = await xuat();
  ok('hợp đồng vận chuyển in đúng bên B là người ký cá nhân của Đối tác (họ tên, CCCD, ngày cấp, nơi cấp, thường trú)', /PHẠM THỊ ĐỐI TÁC/i.test(hd) && /049000000555/.test(hd) && /CA QUẢNG NAM/.test(hd) && /Thăng Bình/.test(hd) && !/Mã số thuế/.test(hd), hd.slice(0, 700));
  // 4. sửa đối tác sau đó: hợp đồng đã chọn KHÔNG đổi, có nhắc “danh mục đã đổi”, cập nhật có chủ ý
  await w.click('#navDm'); await w.click('[data-dmtab=doitac]'); await w.click('[data-dmsua="dt:dt1"]'); await w.waitForSelector('#dmDtForm');
  await w.evaluate(() => { const fm = document.getElementById('dmDtForm'); fm.elements.diaChi.value = 'Địa chỉ MỚI của đối tác'; fm.requestSubmit(); }); await w.waitForTimeout(500);
  d = await dbx(); ok('Đối tác cá nhân đã được sửa trong danh mục', d.dmDoiTac.find(x => x.id === 'dt1').diaChi === 'Địa chỉ MỚI của đối tác');
  f = await lotDb(); ok('đội xe giữ nguyên thông tin lúc chọn (hợp đồng đã chọn không tự đổi)', f.hdvc[0].ben.diaChi === 'Thăng Bình, Quảng Nam');
  await open('dx'); await selHd();
  ok('tab Vận chuyển nhắc “danh mục đã đổi” và có nút cập nhật có chủ ý', /đã sửa thông tin/.test(await w.innerText('#hdForm')) && !!(await w.$('[data-act=hdCapNhatDv]')));
  hd = await xuat(); ok('hợp đồng in vẫn thông tin lúc chọn (thường trú cũ), chưa đổi theo danh mục', /Thăng Bình/.test(hd) && !/Địa chỉ MỚI/.test(hd), hd.slice(0, 500));
  await open('dx'); await selHd(); await w.click('[data-act=hdCapNhatDv]'); await w.waitForTimeout(300); await w.click('#loDirtyBar [data-act=stSave]').catch(() => {}); await w.waitForTimeout(500);
  f = await lotDb(); ok('bấm Cập nhật theo danh mục: đội xe nhận thông tin mới, hết nhắc', f.hdvc[0].ben.diaChi === 'Địa chỉ MỚI của đối tác' && !(await w.$('[data-act=hdCapNhatDv]')));
  hd = await xuat(); ok('hợp đồng in sau khi cập nhật có chủ ý: thường trú mới', /Địa chỉ MỚI của đối tác/.test(hd));
  // 5. doanh nghiệp làm người ký: bên B là doanh nghiệp, sửa doanh nghiệp sau đó cũng nhắc
  await open('dx'); await selHd(); await w.selectOption('#hdForm [name=ky]', 'd:dn:dv1'); await w.$eval('#hdForm', ff => ff.requestSubmit()); await w.waitForTimeout(400); await w.click('#loDirtyBar [data-act=stSave]').catch(() => {}); await w.waitForTimeout(500);
  f = await lotDb(); ok('chọn doanh nghiệp từ Đối tác: đội xe trỏ id đối tác và chụp thông tin doanh nghiệp', f.hdvc[0].donViId === 'dn:dv1' && f.hdvc[0].ben.mst === '0401234567' && f.hdvc[0].ben.daiDien === 'LÊ VĂN SỬA');
  hd = await xuat(); ok('hợp đồng in bên B là doanh nghiệp: MST, người đại diện', /Mã số thuế: 0401234567/.test(hd) && /LÊ VĂN SỬA/.test(hd));
  await w.click('#navDm'); await w.click('[data-dmtab=doitac]'); await w.click('[data-act=suaDv]'); await w.fill('#dvForm [name=chucVu]', 'Tổng giám đốc'); await w.click('#dvForm [type=submit]'); await w.waitForTimeout(500);
  await open('dx'); await selHd(); ok('sửa doanh nghiệp ở Danh mục: tab Vận chuyển nhắc “danh mục đã đổi”', /đã sửa thông tin/.test(await w.innerText('#hdForm')));
  ok('không có lỗi script trên màn hình', errs.length === 0, errs.join(' | '));
  await app.close(); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
