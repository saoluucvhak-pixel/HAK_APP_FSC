'use strict';
/* Bản 3.0 — tab Nhân công / Vận chuyển của rừng mở DANH SÁCH hợp đồng; chọn một hợp đồng → trang chi tiết (Electron thật, SQLite thật):
 *  - danh sách: mỗi đội một hợp đồng nhân công, mỗi đội xe một hợp đồng vận chuyển; mở bằng chuột hoặc bàn phím (Enter);
 *  - trang chi tiết: tên rừng, số hợp đồng, “Quay lại danh sách”; bảng xe chỉ có xe của hợp đồng đang mở;
 *  - lưu xong vẫn ở đúng mục; mở lại rừng nhớ hợp đồng và mục đã mở;
 *  - người ký hợp đồng vận chuyển chọn từ Danh mục đối tượng (người có quyền ký Vận chuyển, hiện cả tên đối tượng và tên người);
 *  - từ hợp đồng mở Danh mục đối tượng rồi “Quay lại” đúng hợp đồng;
 *  - hợp đồng giao khoán: bên nhận khoán chọn từ đối tượng có quyền ký Nhân công.
 * Chạy: xvfb-run -a node scripts/e2e-hopdong30.js */
const {_electron: electron} = require('playwright-core');
const path = require('path'), fs = require('fs'), os = require('os');
const src = fs.readFileSync(path.join(__dirname, 'e2e-inan2.js'), 'utf8');
const {xe, lot, seed, PC, EXP1} = new Function(src.slice(src.indexOf('const nv ='), src.indexOf('const plain =')) + '; return {xe, lot, seed, PC, EXP1};')();
const root = path.join(__dirname, '..');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hakqn-hd30-'));
let fail = 0; const ok = (name, cond, extra) => { console.log((cond ? 'ĐẠT  ' : 'LỖI  ') + name + (!cond && extra ? ' — ' + extra : '')); if (!cond) fail++; };

(async () => {
  const app = await electron.launch({executablePath: require('electron'), args: [root, '--no-sandbox'], env: {...process.env, HAKQN_CLOSE: 'discard', HAKQN_DB: path.join(dir, 'd.sqlite'), HAKQN_USERDATA: path.join(dir, 'ud'), HAKQN_DOWNLOAD_DIR: path.join(dir, 'out')}});
  const w = await app.firstWindow(); const errs = []; w.on('pageerror', e => errs.push(e.message)); w.on('dialog', d => d.accept()); await w.waitForSelector('#side');
  const A = lot('fa', 'R-A', {exp: EXP1, pc: PC, kl: 29.75, dx: [xe('92C-12345', '049000000077', 'LÊ VĂN AN'), xe('92C-67890', '049000000078', 'TRẦN BÌNH')]});
  await w.evaluate(d => window.hak.save(d), seed([A])); await w.reload(); await w.waitForSelector('#side');
  const lotDb = async () => (await w.evaluate(() => window.hak.loadSync().db)).rs.own1.forests.fa;
  const moRung = async () => { if (!(await w.$eval('#side', e => getComputedStyle(e).display !== 'none').catch(() => true))) await w.click('#navHome'); await w.click('[data-open=own1]'); await w.click('[data-tab=rung]'); await w.click('[data-forest=fa]'); };
  const muc = id => w.click('.mucNav [data-muc-lo=' + id + ']');
  await moRung();
  for (const width of [1366, 1024, 910]) {
    await w.setViewportSize({width, height: 768});
    const size = await w.evaluate(() => {
      const top = document.querySelector('header.top');
      const nav = [...top.querySelectorAll('button')].filter(b => b.getClientRects().length);
      return {page: document.documentElement.scrollWidth, first: top.clientHeight, rows: new Set(nav.map(b => Math.round(b.getBoundingClientRect().top + b.getBoundingClientRect().height / 2))).size};
    });
    ok('bố cục ở ' + width + ' px: không cuộn ngang trang và thanh chính một dòng', size.page <= width && size.first <= 70 && size.rows <= 2, JSON.stringify(size));
  }
  await w.setViewportSize({width: 1366, height: 768});
  for (const [id, selector] of [['toado', '#forestForm [name=lat]'], ['dinhmuc', '#slDuKien'], ['giay', '#giayForm'], ['giaohang', '#vcForm']]) {
    await muc(id);
    ok('Thông tin rừng: mở riêng mục ' + id, await w.isVisible(selector) && await w.locator('.mucNoiDung').count() === 1);
  }

  // 1. Nhân công: danh sách → chi tiết
  await w.click('[data-ftab=nc]'); await w.waitForTimeout(200);
  ok('tab Nhân công mở danh sách hợp đồng (chưa vào chi tiết)', !!(await w.$('#dsHdNcTbl')) && (await w.$$('#dsHdNcTbl tbody tr[data-act]')).length === 1);
  await w.fill('#doiMoiTen', 'Đội Hai'); await w.click('[data-act=themDoi]'); await w.waitForTimeout(300);
  ok('thêm hợp đồng (đội): mở ngay trang chi tiết của đội mới, có tên rừng và nút quay lại', /Đội Hai/.test(await w.innerText('#hdDauTen')) && /R-A/.test(await w.innerText('#loCrumb')) && await w.isVisible('#hdQuayLai'));
  await w.click('#hdQuayLai'); await w.waitForTimeout(200);
  await w.click('#stGSave');
  const dsNc = await w.innerText('#dsHdNcTbl');
  ok('quay lại danh sách: 2 hợp đồng nhân công, có hình thức và số người', (await w.$$('#dsHdNcTbl tbody tr[data-act]')).length === 2 && /Giao khoán|Ký với cá nhân/.test(dsNc) && /Đội Hai/.test(dsNc), dsNc);
  await w.focus('#dsHdNcTbl tbody tr[data-act]'); await w.keyboard.press('Enter'); await w.waitForTimeout(200);
  ok('bàn phím: Enter trên dòng danh sách mở hợp đồng', !!(await w.$('#hdDau')) && !!(await w.$('#dsHdNcTbl')));
  const ten1 = await w.innerText('#hdDauTen');
  await muc('thanhvien');
  ok('hợp đồng nhân công: nhập Excel ở Danh mục đối tượng', !await w.locator('input[data-file=nc], [data-act=danMo][data-kind=nc]').count() &&
    await w.getByRole('button', {name: /(Nhập Excel tại Danh mục đối tượng|Mở Danh mục đối tượng \(Excel\))/}).isVisible());
  ok('trang chi tiết nhân công: một bảng chính (nhân công), không còn bảng danh sách đội', !(await w.$('#doiKT .normTbl')) && (await w.$$('#main table')).length >= 1);
  await muc('chung');
  await w.fill('#doiForm [name=dienTich]', '1,5'); await w.press('#doiForm [name=dienTich]', 'Enter'); await w.waitForTimeout(300);
  if (await w.$('#loDirtyBar [data-act=stSave]')) { await w.click('#loDirtyBar [data-act=stSave]'); await w.waitForTimeout(500); }
  ok('lưu xong vẫn ở đúng hợp đồng đang mở', !!(await w.$('#hdDau')) && (await w.innerText('#hdDauTen')) === ten1, await w.innerText('#hdDauTen').catch(() => ''));

  // 2. Vận chuyển: danh sách → chi tiết, bảng xe theo hợp đồng
  await w.click('[data-ftab=dx]'); await w.waitForTimeout(200);
  const f = await lotDb();
  ok('tab Vận chuyển mở danh sách: 2 hợp đồng (mỗi người ký một hợp đồng), trang danh sách chỉ có bảng hợp đồng', (await w.$$('#dsHdVcTbl tbody tr[data-act]')).length === 2 && !(await w.$('#vcForm')));
  const h2 = f.hdvc.find(h => f.dx.some(r => r.hdvcId === h.id && r.chuXe === 'TRẦN BÌNH'));
  await w.click('#dsHdVcTbl tr[data-hd="' + h2.id + '"]'); await w.waitForTimeout(200);
  await muc('xe');
  const bienSo = await w.$$eval('#stTbl_dx tbody tr', t => t.map(x => x.innerText).join('|'));
  const napXe = await w.getByRole('button', {name: /(Nhập Excel tại Danh mục xe|Mở Danh mục xe \(Excel\))/}).isVisible();
  await muc('phieu');
  ok('hợp đồng vận chuyển: nhập Excel xe ở Danh mục xe; nạp phiếu cân vẫn tại hợp đồng',
    !await w.locator('input[data-file=dx], [data-act=danMo][data-kind=dx]').count() &&
    napXe && await w.isVisible('label:has(input[data-file=pc])') && !(await w.$('#stTbl_dx')));
  ok('chi tiết hợp đồng vận chuyển: bảng xe chỉ có xe của hợp đồng (92C-67890), không có xe của hợp đồng khác', /92C-67890/.test(bienSo) && !/92C-12345/.test(bienSo), bienSo.slice(0, 300));
  ok('chi tiết hợp đồng vận chuyển: tên rừng, đội xe, số hợp đồng', /R-A/.test(await w.innerText('#loCrumb')) && !!(await w.innerText('#hdDauSo')));
  await w.click('[data-ftab=nc]'); await w.waitForTimeout(200);
  ok('chuyển tab rồi quay lại: Nhân công vẫn mở đúng hợp đồng đã mở', (await w.innerText('#hdDauTen').catch(() => '')) === ten1);
  await w.click('[data-tab=info]'); await w.click('[data-tab=rung]'); await w.click('[data-ftab=dx]');
  ok('mở lại rừng: khôi phục hợp đồng và mục Phiếu cân', !!(await w.$('#hdDau')) && await w.isVisible('#pcHd'));

  // 3. người ký từ Danh mục đối tượng; mở danh mục từ hợp đồng rồi quay lại
  await muc('vanban');
  await w.fill('#hdVbForm [name=soVC]', '017');
  await w.press('#hdVbForm [name=soVC]', 'Enter');
  await w.waitForFunction(() => window.hak.loadSync().db.rs.own1.forests.fa.hdvc.some(h => h.exp?.soVC === '017'));
  await muc('chung'); await w.waitForSelector('#hdForm');
  await w.click('#hdForm [data-act=openSetDt][data-quaylai]'); await w.waitForSelector('#veLaiBar');
  ok('mở Danh mục đối tượng từ hợp đồng: có thanh “Quay lại”, không hỏi lưu / bỏ', await w.isVisible('#veLaiBtn') && !(await w.isVisible('#roiLuu').catch(() => false)));
  await w.click('#cnThem'); await w.waitForSelector('#dtForm'); await w.fill('#dtForm [name=ten]', 'HỘ KINH DOANH VẬN TẢI CHÍN');
  await w.evaluate(() => { const f = document.getElementById('dtForm'); f.elements.hoTen.value = 'PHẠM VĂN CHÍN'; f.elements.cccd.value = '049085000099'; f.elements.vtChuXe.checked = true; f.elements.kyVC.checked = true; });
  await w.click('#dtLuu'); await w.waitForTimeout(400);
  await w.click('#veLaiBtn'); await w.waitForSelector('#hdDau');
  ok('“Quay lại”: về đúng hợp đồng vận chuyển đang mở', !!(await w.$('#hdForm')) && /R-A/.test(await w.innerText('#loCrumb')));
  const ky = await w.$$eval('#hdForm [name=ky] option', o => o.map(x => x.textContent));
  ok('ô Người ký có người của Danh mục đối tượng (quyền ký Vận chuyển), hiện cả tên đối tượng và tên người', ky.some(t => /HỘ KINH DOANH VẬN TẢI CHÍN — PHẠM VĂN CHÍN/.test(t)), ky.join(' | '));
  await w.selectOption('#hdForm [name=ky]', 'd:ct:049085000099'); await w.$eval('#hdForm', x => x.requestSubmit()); await w.waitForTimeout(500);
  if (await w.$('#loDirtyBar [data-act=stSave]')) { await w.click('#loDirtyBar [data-act=stSave]'); await w.waitForTimeout(500); }
  const H = (await lotDb()).hdvc.find(h => h.id === h2.id);
  ok('lưu người ký: hợp đồng chụp thông tin người ký (CCCD, đối tượng), in theo bản chụp', !!H && H.donViId === 'ct:049085000099' && H.ben && H.ben.cccd === '049085000099' && H.ben.doiTuongTen === 'HỘ KINH DOANH VẬN TẢI CHÍN', JSON.stringify(H));
  ok('số hợp đồng lưu ở mục văn bản và giữ nguyên khi sửa người ký', H?.exp?.soVC === '017');
  ok('lưu xong vẫn ở hợp đồng đang mở', !!(await w.$('#hdDau')));

  // 4. hợp đồng nhân công giao khoán: bên nhận khoán chọn từ Danh mục đối tượng (quyền ký Nhân công), lưu theo ID
  await (async () => { if (await w.$('#navDm')) await w.click('#navDm'); else await w.click('#navSet'); })(); await w.click('#setTab_setdt'); await w.click('#cnThem'); await w.waitForSelector('#dtForm'); await w.fill('#dtForm [name=ten]', 'TỔ KHAI THÁC TRẦN SƠN');
  await w.evaluate(() => { const f = document.getElementById('dtForm'); f.elements.hoTen.value = 'TRẦN SƠN'; f.elements.cccd.value = '049085000123'; f.elements.vtNhanCong.checked = true; f.elements.kyNC.checked = true; });
  await w.click('#dtLuu'); await w.waitForTimeout(400);
  await moRung(); await w.click('[data-ftab=nc]'); await w.waitForTimeout(200);
  if (!(await w.$('#hdDau'))) { await w.click('#dsHdNcTbl tbody tr[data-act]'); await w.waitForTimeout(200); }
  await muc('chung');
  const nk = await w.$$eval('#doiForm [name=benNK] option', o => o.map(x => x.value + '=' + x.textContent));
  ok('ô Bên nhận khoán có người có quyền ký Nhân công của Danh mục đối tượng', nk.some(t => /^ng:.*TỔ KHAI THÁC TRẦN SƠN — TRẦN SƠN/.test(t)) && !nk.some(t => /PHẠM VĂN CHÍN/.test(t)), nk.join(' | '));
  await w.selectOption('#doiForm [name=benNK]', nk.find(t => /TRẦN SƠN/.test(t)).split('=')[0]); await w.press('#doiForm [name=ten]', 'Enter'); await w.waitForTimeout(400);
  if (await w.$('#loDirtyBar [data-act=stSave]')) { await w.click('#loDirtyBar [data-act=stSave]'); await w.waitForTimeout(500); }
  const dNK = (await lotDb()).doi.find(d => d.benNhanKhoan);
  ok('lưu: đội nhận liên kết bên nhận khoán theo ID (đối tượng, người)', !!dNK && /^dt/.test(dNK.benNhanKhoan.doiTuongId) && /^ng/.test(dNK.benNhanKhoan.nguoiId), JSON.stringify((await lotDb()).doi));
  ok('bản in dùng bên nhận khoán đã chọn (bản chụp), Tổ trưởng vẫn ở các mục của đội', /TRẦN SƠN/.test(await w.innerText('#benNKIn')) && /Tổ trưởng vẫn đứng tên/.test(await w.innerText('#benNKIn')) && !!(await lotDb()).doi.find(d => d.benNhanKhoanBan && d.benNhanKhoanBan.cccd === '049085000123'));
  await w.click('#hdQuayLai'); ok('danh sách hợp đồng nhân công hiện bên nhận khoán', /TRẦN SƠN/.test(await w.innerText('#dsHdNcTbl')));

  if (process.env.SHOTS) {
    fs.mkdirSync(process.env.SHOTS, {recursive: true});
    for (const width of [1366, 1024]) {
      await w.setViewportSize({width, height: 768});
      for (const theme of ['light', 'dark']) {
        await w.click('#navSet');
        await w.click('#setTab_setfmt'); await w.click('#setTab_setgd');
        if (await w.evaluate(() => document.documentElement.dataset.theme) !== theme) await w.click('#themeBtn2');
        const shot = name => w.screenshot({path: path.join(process.env.SHOTS, width + '-' + theme + '-' + name + '.png')});
        await shot('cai-dat');
        await moRung();
        await muc('chung'); await shot('thong-tin-rung');
        await w.click('[data-ftab=nc]');
        await w.locator('#dsHdNcTbl tr[data-act]').first().click();
        await muc('thanhvien'); await shot('thanh-vien');
        await w.click('#hdQuayLai');
        await w.click('[data-ftab=dx]');
        await muc('phieu'); await shot('phieu-can');
      }
    }
  }
  ok('không có lỗi script trên màn hình', errs.length === 0, errs.join(' | '));
  await app.close(); console.log(fail ? 'CÓ ' + fail + ' LỖI' : 'TẤT CẢ ĐẠT'); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
