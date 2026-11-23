'use strict';
/* Thống nhất thuật ngữ (Electron thật, SQLite thật): “Vai trò” → “Chức vụ”, cột “Chức danh” của dòng nhân công → “Vị trí”.
 *  - bảng nhân công của lô và hộp thoại thêm nhân công: nhãn “Chức vụ” và “Vị trí”, không còn “Vai trò”, “Chức danh”;
 *  - màn Danh mục đối tượng (ô tích, cột bảng): nhãn “Chức vụ”, không còn “Vai trò”;
 *  - bên nhận khoán không phải Tổ trưởng: KHÔNG hiện cảnh báo vàng “chưa là Tổ trưởng”, chỉ dòng trung tính nêu tên và nhắc Tổ trưởng vẫn đứng tên;
 *  - tên trường lưu không đổi (vaiTro, chucDanh).
 * Chạy: xvfb-run -a node scripts/e2e-chuc-vu-vi-tri.js */
const {_electron: electron} = require('playwright-core');
const path = require('path'), fs = require('fs'), os = require('os');
const src = fs.readFileSync(path.join(__dirname, 'e2e-inan2.js'), 'utf8');
const {nv, lot, seed} = new Function(src.slice(src.indexOf('const nv ='), src.indexOf('const plain =')) + '; return {nv, lot, seed};')();
const root = path.join(__dirname, '..');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hakqn-cvvt-'));
let fail = 0; const ok = (name, cond, extra) => { console.log((cond ? 'ĐẠT  ' : 'LỖI  ') + name + (!cond && extra ? ' — ' + extra : '')); if (!cond) fail++; };
(async () => {
  const app = await electron.launch({executablePath: require('electron'), args: [root, '--no-sandbox'], env: {...process.env, HAKQN_CLOSE: 'discard', HAKQN_DB: path.join(dir, 'd.sqlite'), HAKQN_USERDATA: path.join(dir, 'ud'), HAKQN_DOWNLOAD_DIR: path.join(dir, 'out')}});
  const w = require('./_hd30').boc(await app.firstWindow()); const errs = []; w.on('pageerror', e => errs.push(e.message)); w.on('dialog', d => d.accept()); await w.waitForSelector('#side');
  const B = lot('fb', 'R-B', {exp: {}, kl: null, pc: [], nc: [nv(1, 'Tổ trưởng', 'TỔ TRƯỞNG B', 'Tổ trưởng', '049085007009'), nv(2, 'Công nhân', 'CÔNG NHÂN C', 'Công nhân khai thác', '049085007010')]});
  B.nc = B.nc.map(r => ({...r, maRung: 'R-B'})); B.dx = B.dx.map(r => ({...r, maRung: 'R-B'}));
  await w.evaluate(d => window.hak.save(d), seed([B])); await w.reload(); await w.waitForSelector('#side');
  const text = sel => w.$eval(sel, e => e.textContent);
  const lotDb = async () => (await w.evaluate(() => window.hak.loadSync().db)).rs.own1.forests.fb;
  const moLo = async ftab => { await w.click('[data-open=own1]'); await w.click('[data-tab=rung]'); await w.click('[data-forest=fb]'); await w.click('[data-ftab=' + ftab + ']'); await w.waitForTimeout(300); };

  // 1. bảng nhân công của lô và hộp thoại thêm
  await moLo('nc');
  const th = await w.$$eval('#stTbl_nc thead th', e => e.map(x => x.textContent.trim()));
  ok('cột bảng nhân công của lô: “Chức vụ” và “Vị trí”', th.includes('Chức vụ') && th.includes('Vị trí'), th.join('|'));
  ok('cột bảng nhân công của lô: không còn “Vai trò”, “Chức danh”', !th.includes('Vai trò') && !th.includes('Chức danh'), th.join('|'));
  const dong = await w.$$eval('#stTbl_nc tbody tr', r => r.map(x => x.textContent));
  ok('dữ liệu hiển thị giữ nguyên (Tổ trưởng / Công nhân khai thác)', dong.some(t => /Tổ trưởng.*TỔ TRƯỞNG B/.test(t)) && dong.some(t => /Công nhân.*CÔNG NHÂN C.*Công nhân khai thác/.test(t)), dong.join(' | '));
  await w.click('[data-act=stAdd][data-kind=nc]'); await w.waitForSelector('#stForm');
  const nhan = await w.$$eval('#stForm label', e => e.map(x => x.textContent.trim()));
  ok('hộp thoại thêm nhân công: nhãn “Chức vụ” và “Vị trí”, không còn “Vai trò”, “Chức danh”', nhan.some(t => /^Chức vụ/.test(t)) && nhan.some(t => /^Vị trí/.test(t)) && !nhan.some(t => /^Vai trò/.test(t)) && !nhan.some(t => /^Chức danh/.test(t)), nhan.join('|'));
  ok('tên trường lưu không đổi: ô vaiTro và chucDanh vẫn là name của form', await w.$eval('#stForm', f => !!f.elements.vaiTro && !!f.elements.chucDanh));

  // 2. màn Danh mục đối tượng
  await w.reload(); await w.waitForSelector('#side');
  await w.click('#navDm'); await w.click('#setTab_setdt'); await w.waitForSelector('#dtBang');
  await w.click('#cnThem'); await w.waitForSelector('#dtForm');
  const form = await text('#dtForm');
  ok('form cá nhân: nhãn “Chức vụ:” cạnh các ô Nhân công, Tài xế, Chủ xe; không còn “Vai trò”', /Chức vụ:/.test(form) && !/Vai trò/.test(form), form.slice(0, 300));
  ok('form cá nhân: ô tích giữ tên trường cũ (vtNhanCong, vtTaiXe, vtChuXe)', await w.$eval('#dtForm', f => !!f.elements.vtNhanCong && !!f.elements.vtTaiXe && !!f.elements.vtChuXe));

  // 3. bên nhận khoán không phải Tổ trưởng: không cảnh báo vàng
  await w.evaluate(() => { const f = document.getElementById('dtForm'); f.elements.ten.value = 'TỔ KHAI THÁC TRẦN SƠN'; f.elements.hoTen.value = 'TRẦN SƠN'; f.elements.cccd.value = '049085000123'; f.elements.vtNhanCong.checked = true; f.elements.kyNC.checked = true; });
  await w.click('#dtLuu'); await w.waitForTimeout(400);
  const bangDm = await text('#dtWrap');
  ok('bảng Danh mục đối tượng: cột “Người · chức vụ”, không còn “vai trò”', /chức vụ/i.test(bangDm) && !/vai trò/i.test(bangDm), bangDm.slice(0, 200));
  await moLo('nc'); await w.waitForTimeout(200);
  if (!(await w.$('#hdDau'))) { await w.click('#dsHdNcTbl tbody tr[data-act]'); await w.waitForTimeout(200); }
  await w.click('.mucNav [data-muc-lo=chung]');
  const nk = await w.$$eval('#doiForm [name=benNK] option', o => o.map(x => x.value + '=' + x.textContent));
  const chon = nk.find(t => /TRẦN SƠN/.test(t));
  ok('Danh mục có người ký Nhân công để chọn làm bên nhận khoán (khác Tổ trưởng B)', !!chon, nk.join(' | '));
  await w.selectOption('#doiForm [name=benNK]', chon.split('=')[0]); await w.press('#doiForm [name=ten]', 'Enter'); await w.waitForTimeout(400);
  if (await w.$('#loDirtyBar [data-act=stSave]')) { await w.click('#loDirtyBar [data-act=stSave]'); await w.waitForTimeout(500); }
  const dNK = (await lotDb()).doi.find(d => d.benNhanKhoan);
  ok('lưu bên nhận khoán là người không phải Tổ trưởng của đội', !!dNK && /^ng/.test(dNK.benNhanKhoan.nguoiId), JSON.stringify((await lotDb()).doi));
  ok('không có cảnh báo vàng “chưa là Tổ trưởng” (không #benNKLech, không .msg.warn nói về Tổ trưởng)', !(await w.$('#benNKLech')) && !(await w.$$eval('.msg.warn', e => e.some(x => /chưa là Tổ trưởng/.test(x.textContent)))));
  const dong1 = await text('#benNKIn');
  ok('dòng trung tính (class mut) nêu tên bên nhận khoán và nhắc Tổ trưởng vẫn đứng tên', /TRẦN SƠN/.test(dong1) && /Tổ trưởng vẫn đứng tên ở các mục của đội \(danh sách, ủy quyền, chấm công\)/.test(dong1) && await w.$eval('#benNKIn', e => e.classList.contains('mut') && !e.classList.contains('warn')), dong1);
  ok('không có lỗi script trên màn hình', errs.length === 0, errs.join(' | '));
  await app.close(); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
