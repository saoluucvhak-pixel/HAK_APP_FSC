'use strict';
/* Cấu trúc 2.0 giai đoạn 3: “Nhân công khai thác” là bảng con của lô; mỗi ĐỘI có hình thức, cách tính, đơn giá, diện tích, số văn bản và nhân công riêng.
 * Kịch bản: lô một đội giao khoán → thêm đội 2 → đội 2 ký TRỰC TIẾP theo ngày công → thêm Tổ trưởng cho đội 2 qua bản nháp, chuyển một người sang đội 2 ở cột Đội
 * → hồ sơ: hợp đồng giao khoán + ủy quyền chỉ cho đội 1, hợp đồng lao động chỉ cho người đội 2; số văn bản mỗi đội riêng; mở lại app vẫn giữ (Electron thật, SQLite thật).
 * Chạy: xvfb-run -a node scripts/e2e-doikt.js */
const {_electron: electron} = require('playwright-core');
const path = require('path'), fs = require('fs'), os = require('os');
const JSZip = require('jszip');
const src = fs.readFileSync(path.join(__dirname, 'e2e-inan2.js'), 'utf8');
const {nv, lot, seed} = new Function(src.slice(src.indexOf('const nv ='), src.indexOf('const plain =')) + '; return {nv, lot, seed};')();
const {saveStage} = require('./lib-stage');
const root = path.join(__dirname, '..');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hakqn-doikt-')), out = path.join(dir, 'out');
let fail = 0; const ok = (name, cond, extra) => { console.log((cond ? 'ĐẠT  ' : 'LỖI  ') + name + (!cond && extra ? ' — ' + extra : '')); if (!cond) fail++; };
(async () => {
  fs.mkdirSync(out, {recursive: true});
  const env = {...process.env, HAKQN_CLOSE: 'discard', HAKQN_DB: path.join(dir, 'd.sqlite'), HAKQN_USERDATA: path.join(dir, 'ud'), HAKQN_DOWNLOAD_DIR: out};
  let app = await electron.launch({executablePath: require('electron'), args: [root, '--no-sandbox'], env});
  let w = require('./_hd30').boc(await app.firstWindow()); const errs = [];
  const hook = () => { w.on('pageerror', e => errs.push(e.message)); w.on('dialog', d => d.accept()); };
  hook(); await w.waitForSelector('#side');
  const p = (i, vai, ten, cd) => ({...nv(i, vai, ten, cd, '04908500' + String(3000 + i)), maRung: 'R-A'});
  const A = lot('fa', 'R-A', {exp: {soKT: '021', uqSo: '021-UQ', ngayKy: '02/10/2026'}, pc: [], kl: 12, nc: [p(1, 'Tổ trưởng', 'TRẦN MỘT', 'Tổ trưởng'), p(2, 'Công nhân', 'LÊ HAI', 'Công nhân khai thác'), p(3, 'Công nhân', 'PHẠM BA', 'Công nhân khai thác')]});
  A.info.dienTich = 3;
  await w.evaluate(d => window.hak.save(d), seed([A])); await w.reload(); await w.waitForSelector('#side');
  const dbNow = async () => (await w.evaluate(() => window.hak.loadSync().db)).rs.own1.forests.fa;
  const open = async () => { await w.click('[data-open=own1]'); await w.click('[data-tab=rung]'); await w.click('[data-forest=fa]'); await w.click('[data-ftab=nc]'); await w.waitForTimeout(300); };
  await open();
  let t = (await (async () => { if (await w.$('#hdQuayLai')) await w.click('#hdQuayLai'); return w.innerText('#dsHdNc'); })());   // 3.0: danh sách hợp đồng nhân công của rừng
  ok('tab Nhân công: danh sách 1 hợp đồng (đội) với Tổ trưởng, 3 người, hình thức giao khoán', /(của rừng: 1|(Đội \/ Hợp đồng|Hợp đồng nhân công) \(1\))/.test(t) && /TRẦN MỘT/.test(t) && /\b3\b/.test(t) && /Giao khoán/.test(t), t);
  let f = await dbNow();
  ok('SQLite: lô có 1 đội, mọi nhân công mang doiId của đội; hình thức và số HĐ nằm ở đội, không còn ở lô', f.doi.length === 1 && f.nc.every(r => r.doiId === f.doi[0].id) && f.doi[0].hinhThuc.moHinhKy === 'giaokhoan' && f.doi[0].exp.soKT === '021' && !('moHinhKy' in f.info) && !('soKT' in f.exp), JSON.stringify({doi: f.doi, info: f.info, exp: f.exp}));

  // thêm đội 2
  await w.fill('#doiMoiTen', 'Đội Hai'); await w.click('[data-act=themDoi]'); await w.waitForTimeout(400);
  ok('thêm đội vào BẢN NHÁP của lô: hiện thanh “Chưa lưu”, SQLite chưa đổi', !!(await w.$('#loDirtyBar')) && (await dbNow()).doi.length === 1);
  await w.click('#loDirtyBar [data-act=stSave]'); await w.waitForTimeout(400); 
  const dauMoi = await w.innerText('.hak-detail-pane .hak-pane-head, #hdDauTen').catch(() => ''); t = (await (async () => { if (await w.$('#hdQuayLai')) await w.click('#hdQuayLai'); return w.innerText('#dsHdNc'); })()); f = await dbNow();
  ok('thêm đội: 2 đội, đội đầu tự đặt tên “Đội 1”, mở ngay đội mới và chép hình thức của đội 1', /(của rừng: 2|(Đội \/ Hợp đồng|Hợp đồng nhân công) \(2\))/.test(t) && f.doi.length === 2 && f.doi[0].ten === 'Đội 1' && f.doi[1].ten === 'Đội Hai' && f.doi[1].hinhThuc.moHinhKy === 'giaokhoan' && /Đội Hai/.test(dauMoi), dauMoi + ' | ' + t);
  await w.click('#dsHdNcTbl tr[data-doi="doi2"]'); await w.waitForTimeout(200);   // tiếp tục ở hợp đồng của đội mới
  // đội 2: trực tiếp, ngày công
  await w.selectOption('#luongForm select[name=moHinhKy]', 'tructiep'); await w.selectOption('#luongForm select[name=hinhThucLuong]', 'ngaycong');
  await w.evaluate(() => document.querySelectorAll('#luongForm details').forEach(d => { d.open = true; }));   // vị trí chưa có người nằm trong mục gập
  await w.fill('#luongForm input[name=dn_0]', '500000'); await w.fill('#luongForm input[name=dn_1]', '350000');
  await w.$eval('#luongForm', f => f.requestSubmit()); await w.waitForTimeout(300); f = await dbNow();
  ok('lưu thông số khi đội 2 đang chọn: chỉ đội 2 đổi sang trực tiếp, ngày công; đội 1 vẫn giao khoán', f.doi[1].hinhThuc.moHinhKy === 'tructiep' && f.doi[1].hinhThuc.hinhThucLuong === 'ngaycong' && f.doi[0].hinhThuc.moHinhKy === 'giaokhoan' && f.doi[0].hinhThuc.hinhThucLuong !== 'ngaycong', JSON.stringify(f.doi.map(d => d.hinhThuc)));
  ok('tiêu đề thông số ghi rõ đội đang chọn', /đội “Đội Hai”/.test(await w.innerText('#luongForm >> xpath=..')));
  // diện tích đội
  await w.fill('#doiForm input[name=dienTich]', '1,2'); await w.$eval('#doiForm', f => f.requestSubmit()); await w.waitForTimeout(300); f = await dbNow();
  ok('lưu diện tích của đội 2: 1,2 ha', f.doi[1].dienTich === 1.2, JSON.stringify(f.doi[1]));
  // Tổ trưởng cho đội 2 qua bản nháp (không ghi cột Đội → vào đội đang chọn)
  await w.click('[data-act=stAdd][data-kind=nc]'); await w.waitForSelector('#stForm');
  const set = async (k, v) => { const sel = await w.$('#stForm select[name=' + k + ']'); if (sel) await w.selectOption('#stForm select[name=' + k + ']', v); else if (await w.$('#stForm input[type=radio][name=' + k + ']')) await w.check('#stForm input[type=radio][name=' + k + '][value="' + v + '"]'); else await w.fill('#stForm input[name=' + k + ']', v); };
  for (const [k, v] of Object.entries({vaiTro: 'Tổ trưởng', danhXung: 'Ông', ten: 'NGUYỄN BỐN', ngaySinh: '01/01/1984', cccd: '049085003004', ngayCap: '01/01/2021', noiCap: 'Cục CS QLHC về TTXH', diaChi: 'Quảng Nam', chucDanh: 'Tổ trưởng'})) await set(k, v);
  await w.click('#stForm [type=submit]'); await w.waitForTimeout(300);
  const r = await saveStage(w); f = await dbNow();
  const bon = f.nc.find(x => x.ten === 'NGUYỄN BỐN');
  ok('Tổ trưởng mới nhập tay (không ghi cột Đội) vào ĐỘI ĐANG CHỌN (đội 2); người cũ giữ đội 1', r && r.ok && bon && bon.doiId === f.doi[1].id && f.nc.filter(x => x.doiId === f.doi[0].id).length === 3, JSON.stringify(r) + ' ' + JSON.stringify(f.nc.map(x => x.ten + ':' + x.doiId)));
  // chuyển PHẠM BA sang đội 2 ở cột Đội
  const ix = f.nc.findIndex(x => x.ten === 'PHẠM BA');
  ok('lô nhiều đội: bảng nhân công chỉ hiện người của đội đang chọn (đội 2: NGUYỄN BỐN), PHẠM BA của đội 1 không hiện', !(await w.$('select[data-ncdoi="' + ix + '"]')) && /NGUYỄN BỐN/.test(await w.innerText('#main')));
  await w.click('[data-act=ncTatCa]'); await w.waitForTimeout(200);
  await w.selectOption('select[data-ncdoi="' + ix + '"]', f.doi[1].id); await w.waitForTimeout(400); await w.click('#loDirtyBar [data-act=stSave]'); await w.waitForTimeout(400); f = await dbNow();
  ok('chọn đội ở cột Đội: PHẠM BA chuyển sang đội 2 (doiId); không còn chữ ở cột Đội của dòng đã có đội (v6)', f.nc[ix].doiId === f.doi[1].id && !('doi' in f.nc[ix]), JSON.stringify(f.nc[ix]));
  // sửa người vừa chuyển đội trong bản nháp: không bị đưa về đội cũ
  await w.click('[data-act=stEdit][data-kind=nc][data-i="' + ix + '"]'); await w.waitForSelector('#stForm');
  await w.fill('#stForm input[name=diaChi]', 'Quảng Nam (sửa)'); await w.click('#stForm [type=submit]'); await w.waitForTimeout(300);
  await saveStage(w); f = await dbNow();
  ok('sửa PHẠM BA sau khi chuyển đội: vẫn ở đội 2', f.nc[ix].doiId === f.doi[1].id && f.nc[ix].diaChi === 'Quảng Nam (sửa)', JSON.stringify(f.nc[ix]));
  // chấm công theo đội đang chọn: đội 2 tính ngày công (đội 1 theo tấn)
  await w.click('[data-act=chonDoi][data-doi=doi2]'); await w.waitForTimeout(300);
  const cc2 = await w.$$eval('#ccCard tr[data-ccp] .ccName', els => els.map(e => e.textContent));
  await w.click('[data-act=chonDoi][data-doi=doi1]'); await w.waitForTimeout(300);
  ok('chấm công: chọn đội 2 (ngày công) hiện bảng chấm công của đúng 2 người đội 2; chọn đội 1 (theo tấn) không có bảng', JSON.stringify(cc2.sort()) === JSON.stringify(['NGUYỄN BỐN', 'PHẠM BA']) && !(await w.$('#ccCard')), JSON.stringify(cc2));
  await w.click('[data-act=chonDoi][data-doi=doi2]'); await w.waitForTimeout(200);
  const ch = await w.evaluate(() => window.__hak.doiKT());
  ok('không còn lỗi nhân công; 2 đội 2 người mỗi đội; đội 2 nhập 1,2 ha thì đội 1 nhận phần còn lại 1,8 ha của lô 3 ha', !ch.loi.length && ch.doi.length === 2 && ch.doi[0][1] === 2 && ch.doi[1][1] === 2 && ch.doi[1][2] === 1.2 && ch.doi[0][2] === 1.8, JSON.stringify(ch));
  ok('hợp đồng lao động chỉ cho người đội trực tiếp (NGUYỄN BỐN, PHẠM BA); ủy quyền chỉ người đội giao khoán (LÊ HAI)', JSON.stringify(ch.hdld.sort()) === JSON.stringify(['NGUYỄN BỐN', 'PHẠM BA']) && JSON.stringify(ch.uq) === JSON.stringify(['LÊ HAI']), JSON.stringify(ch));
  ok('lô có cả hai loại đội: vẫn được lập hợp đồng giao khoán, ủy quyền và hợp đồng lao động', ch.g.canGK && ch.g.canUQ && ch.g.canHDLD, JSON.stringify(ch.g));
  // số văn bản: nhập số HĐ giao khoán khi đội 1 đang chọn thì ghi vào đội 1
  await w.click('[data-act=chonDoi][data-doi=doi1]'); await w.waitForTimeout(200);
  ok('số văn bản của đội nằm ở màn đội (tab Nhân công), tab Xuất không còn ô số HĐ giao khoán', !!(await w.$('#doiKTVb input[data-exp=soKT]')));
  await w.fill('#doiKTVb input[data-exp=soKT]', '031'); await w.dispatchEvent('#doiKTVb input[data-exp=soKT]', 'change'); await w.waitForTimeout(300); await w.click('#loDirtyBar [data-act=stSave]'); await w.waitForTimeout(400); 
  f = await dbNow();
  ok('số hợp đồng giao khoán nhập ở màn đội ghi vào đội đang chọn (đội 1)', f.doi[0].exp.soKT === '031' && !('soKT' in f.exp), JSON.stringify({doi: f.doi.map(d => d.exp), exp: f.exp}));
  await w.click('[data-ftab=xuat]'); await w.waitForTimeout(300);
  ok('tab Xuất hồ sơ không còn ô nhập số của đội, có nút sang màn đội', !(await w.$('#main input[data-exp=soKT]')) && /Sửa ở màn đội/.test(await w.innerText('#main')));
  // xuất toàn bộ hồ sơ
  for (const x of fs.readdirSync(out)) fs.unlinkSync(path.join(out, x));
  await w.click('[data-xtab=all]'); await w.waitForTimeout(300);
  const b = await w.$('button[data-act=dl][data-kind=all]:not([disabled])');
  let names = [];
  if (b) { await b.click(); let z = null; for (let i = 0; i < 100 && !z; i++) { z = fs.readdirSync(out).find(n => /\.zip$/.test(n)); if (!z) await w.waitForTimeout(150); } await w.waitForTimeout(300); if (z) names = Object.keys((await JSZip.loadAsync(fs.readFileSync(path.join(out, z)))).files); }
  const gk = names.filter(n => /^01_HD_Giao_khoan/.test(n) && /\.docx$/.test(n)), uq = names.filter(n => /^20_Giay_uy_quyen/.test(n) && /\.docx$/.test(n)), ld = names.filter(n => /^03_HDLD\//.test(n) && /\.docx$/.test(n));
  ok('ZIP: 1 hợp đồng giao khoán (đội 1), 1 giấy ủy quyền (đội 1), 2 hợp đồng lao động (đội 2)', gk.length === 1 && /Doi_1|doi_1/i.test(gk[0]) && uq.length === 1 && ld.length === 2 && ld.some(n => /NGUYEN_BON/i.test(n)) && ld.some(n => /PHAM_BA/i.test(n)), JSON.stringify(names));
  // xóa đội còn người: chặn
  await w.click('[data-ftab=nc]'); await w.click('[data-act=chonDoi][data-doi=doi2]'); await w.waitForTimeout(200); await w.click('[data-act=xoaDoi]'); await w.waitForTimeout(300);
  ok('xóa đội còn nhân công bị chặn, nêu số người', /Chưa xóa đội: .*còn 2 nhân công/.test(await w.innerText('body')) && (await dbNow()).doi.length === 2);
  // mở lại app: giữ nguyên
  await app.close();
  app = await electron.launch({executablePath: require('electron'), args: [root, '--no-sandbox'], env}); w = require('./_hd30').boc(await app.firstWindow()); hook(); await w.waitForSelector('#side');
  await open(); t = (await (async () => { if (await w.$('#hdQuayLai')) await w.click('#hdQuayLai'); return w.innerText('#dsHdNc'); })()); f = await dbNow();
  ok('mở lại app: 2 đội, hình thức, diện tích, nhân công từng đội giữ nguyên', /(của rừng: 2|(Đội \/ Hợp đồng|Hợp đồng nhân công) \(2\))/.test(t) && f.doi[1].hinhThuc.moHinhKy === 'tructiep' && f.doi[1].dienTich === 1.2 && f.nc.filter(x => x.doiId === 'doi2').length === 2, t);
  ok('không có lỗi JavaScript', errs.length === 0, errs.join('|'));
  await app.close(); console.log(fail ? 'CÓ ' + fail + ' LỖI' : 'TẤT CẢ ĐẠT'); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
