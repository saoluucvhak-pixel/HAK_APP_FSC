'use strict';
/* Danh mục Vị trí chi tiết (nhiệm vụ, ghi chú, xóa/ngừng) và màn Định mức 4 tab (Electron thật, SQLite thật):
 *  - Vị trí: gieo sẵn khi trống; thêm với nhiệm vụ + ghi chú; sửa tại chỗ; xóa chưa dùng thì mất, đang dùng thì chuyển Ngừng sử dụng; vị trí mặc định không có nút Xóa;
 *  - Định mức: 4 tab (một tab hiện một lúc, nhớ tab); thêm dòng nhân công chọn vị trí từ danh mục tự điền Nhiệm vụ (không ghi đè chữ đã gõ);
 *  - tiêu đề “1 đội = N người” đổi ngay khi gõ số người, không ghi dữ liệu; lưu ở tab nào chỉ ảnh hưởng tab đó.
 * Chạy: xvfb-run -a node scripts/e2e-vi-tri-dinh-muc.js */
const {_electron: electron} = require('playwright-core');
const path = require('path'), fs = require('fs'), os = require('os');
const root = path.join(__dirname, '..');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hakqn-vtdm-'));
let fail = 0; const ok = (name, cond, extra) => { console.log((cond ? 'ĐẠT  ' : 'LỖI  ') + name + (!cond && extra ? ' — ' + extra : '')); if (!cond) fail++; };
(async () => {
  const app = await electron.launch({executablePath: require('electron'), args: [root, '--no-sandbox'], env: {...process.env, HAKQN_CLOSE: 'discard', HAKQN_DB: path.join(dir, 'v.sqlite'), HAKQN_USERDATA: path.join(dir, 'ud'), HAKQN_DOWNLOAD_DIR: path.join(dir, 'out')}});
  const w = require('./_hd30').boc(await app.firstWindow()); const errs = []; w.on('pageerror', e => errs.push(e.message)); w.on('dialog', d => d.accept()); await w.waitForSelector('#side');
  const db = () => w.evaluate(() => window.hak.loadSync().db);
  const vtTen = async () => (await db()).dmViTri.map(v => v.ten);
  const moVt = async () => { await w.click('#navDm'); await w.click('#setTab_setvt'); await w.waitForSelector('#vtBang'); };

  // 1. Danh mục vị trí: gieo sẵn, thêm với nhiệm vụ + ghi chú
  await moVt(); await w.waitForTimeout(800);   // lần mở đầu gieo sẵn rồi lưu nền
  let ten = await vtTen();
  ok('danh mục trống: gieo sẵn Công nhân cưa, Công nhân lột vỏ và bốc xếp, Quản lý chung, Khác (kèm các vị trí mặc định của định biên)', ['Công nhân cưa', 'Công nhân lột vỏ và bốc xếp', 'Quản lý chung', 'Khác'].every((x, i) => ten[i] === x), JSON.stringify(ten));
  ok('bảng Vị trí có các cột Vị trí, Nhiệm vụ, Ghi chú, Đang dùng', await w.evaluate(() => [...document.querySelectorAll('#vtBang thead th')].map(t => t.textContent.trim()).slice(0, 4).join('|') === 'Vị trí|Nhiệm vụ|Ghi chú|Đang dùng'));
  await w.fill('#vtMoi', 'Thợ lái máy'); await w.fill('#vtMoiNv', 'Lái máy xúc, máy kéo gỗ'); await w.fill('#vtMoiGc', 'Có bằng lái'); await w.click('[data-act=vtThem]'); await w.waitForTimeout(400);
  let d = await db(), vt = d.dmViTri.find(v => v.ten === 'Thợ lái máy');
  ok('thêm vị trí kèm nhiệm vụ và ghi chú: lưu đúng hai khóa', !!vt && vt.nhiemVu === 'Lái máy xúc, máy kéo gỗ' && vt.ghiChu === 'Có bằng lái', JSON.stringify(vt));
  const khac = d.dmViTri.find(v => v.ten === 'Khác');
  ok('vị trí không dùng nhiệm vụ / ghi chú: JSON y hệt bản cũ (không có khóa rỗng)', JSON.stringify(khac) === JSON.stringify({id: khac.id, ten: 'Khác', ngung: false}), JSON.stringify(khac));
  await w.fill('[data-vtnv="' + khac.id + '"]', 'Việc phát sinh ngoài danh sách'); await w.click('[data-vtdoi="' + khac.id + '"]'); await w.waitForTimeout(400);
  d = await db(); ok('sửa nhiệm vụ tại chỗ rồi Lưu', d.dmViTri.find(v => v.id === khac.id).nhiemVu === 'Việc phát sinh ngoài danh sách');
  const qly = d.dmViTri.find(v => v.ten === 'Quản lý chung'); await w.click('[data-vtxoa="' + qly.id + '"]'); await w.waitForTimeout(400);
  ok('xóa vị trí chưa dùng: mất hẳn khỏi danh mục', !(await vtTen()).includes('Quản lý chung'));
  ok('vị trí mặc định (Công nhân cưa): không có nút Xóa', !(await w.$('[data-vtxoa="' + d.dmViTri.find(v => v.ten === 'Công nhân cưa').id + '"]')));

  // 2. màn Định mức: 4 tab, mặc định tab đầu, mỗi lúc một tab
  await w.click('#navNorm'); await w.waitForSelector('#normTabs');
  const tabs = await w.$$eval('#normTabs button', b => b.map(x => x.textContent.trim()));
  ok('Định mức có 4 tab mang tên từng mục', tabs.length === 4 && /BHLĐ/.test(tabs[0]) && /Gỗ keo.*tấn/.test(tabs[1]) && /Nhân công: 1 đội = \d+ người/.test(tabs[2]) && /Thời gian khai thác.*ngày/.test(tabs[3]), JSON.stringify(tabs));
  const hien = () => w.evaluate(() => [...document.querySelectorAll('[data-normpane]')].filter(s => !s.hidden).map(s => s.dataset.normpane));
  ok('mở màn: chỉ tab Định mức BHLĐ hiện', JSON.stringify(await hien()) === '["bhld"]' && await w.isVisible('#normForm') && !(await w.isVisible('#dbForm')) && !(await w.isVisible('#keoForm')) && !(await w.isVisible('#tgForm')));
  await w.click('#normTab_nhancong'); await w.waitForSelector('#dbForm');
  ok('bấm tab Nhân công: chỉ #dbForm hiện, tab được đánh dấu', JSON.stringify(await hien()) === '["nhancong"]' && await w.evaluate(() => document.getElementById('normTab_nhancong').getAttribute('aria-current') === 'page' && !document.getElementById('normTab_bhld').hasAttribute('aria-current')));

  // 3. thêm dòng nhân công chọn vị trí từ danh mục: tự điền nhiệm vụ. Tự điền chỉ chạy ở sự kiện change (rời ô hoặc chọn từ danh sách, soát độc lập P2-3: không điền ở mỗi phím gõ), nên sau mỗi lần gõ phải phát change như người dùng rời ô
  const opts = await w.$$eval('#dbPosVt option', o => o.map(x => x.value));
  ok('ô Vị trí có danh sách chọn từ danh mục vị trí (không có vị trí ngừng sử dụng)', opts.includes('Thợ lái máy') && opts.includes('Khác'), JSON.stringify(opts));
  const moi = '#dbForm tr[data-db=new]';
  await w.fill(moi + ' [name=b_cd]', 'Thợ lái máy'); await w.dispatchEvent(moi + ' [name=b_cd]', 'change'); await w.waitForTimeout(100);
  ok('chọn vị trí từ danh mục: Nhiệm vụ tự điền từ danh mục', (await w.inputValue(moi + ' [name=b_nv]')) === 'Lái máy xúc, máy kéo gỗ', await w.inputValue(moi + ' [name=b_nv]'));
  await w.fill(moi + ' [name=b_nv]', 'Tôi tự gõ nhiệm vụ'); await w.fill(moi + ' [name=b_cd]', ''); await w.fill(moi + ' [name=b_cd]', 'Thợ lái máy'); await w.dispatchEvent(moi + ' [name=b_cd]', 'change'); await w.waitForTimeout(100);
  ok('nhiệm vụ đã gõ không bị ghi đè khi chọn lại vị trí', (await w.inputValue(moi + ' [name=b_nv]')) === 'Tôi tự gõ nhiệm vụ');
  await w.fill(moi + ' [name=b_nv]', ''); await w.fill(moi + ' [name=b_cd]', 'Thợ lái máy'); await w.dispatchEvent(moi + ' [name=b_cd]', 'change'); await w.waitForTimeout(100);

  // 4. tiêu đề tổng đội đổi ngay khi gõ, chưa lưu
  const tong = () => w.evaluate(() => +(/= (\d+) người/.exec(document.querySelector('#normPane_nhancong h2').textContent) || [])[1]);
  const tab = () => w.$eval('#normTab_nhancong', b => +(/= (\d+) người/.exec(b.textContent) || [])[1]);
  const t0 = await tong(), dbTruoc = JSON.stringify((await db()).dinhBien || null);
  await w.fill(moi + ' [name=b_so]', '4');
  const t1 = await tong(); ok('gõ Số người = 4 ở dòng mới: tiêu đề tăng ngay đúng 4, chưa bấm Lưu', t1 === t0 + 4, t0 + ' -> ' + t1);
  ok('tên tab Nhân công cũng đổi theo', (await tab()) === t1);
  ok('chưa lưu: dữ liệu định biên trong CSDL không đổi', JSON.stringify((await db()).dinhBien || null) === dbTruoc);
  await w.fill(moi + ' [name=b_so]', '1'); ok('sửa lại thành 1: tiêu đề giảm theo', (await tong()) === t0 + 1);
  await w.fill(moi + ' [name=b_so]', '2'); await w.click('#dbForm button[type=submit]'); await w.waitForTimeout(600);
  d = await db(); const hang2 = (d.dinhBien || []).find(r => r.chucDanh === 'Thợ lái máy');
  ok('Lưu: dòng mới ghi đúng vị trí, số người, nhiệm vụ lấy từ danh mục', !!hang2 && hang2.soNguoi === 2 && hang2.nhiemVu === 'Lái máy xúc, máy kéo gỗ', JSON.stringify(hang2));
  ok('sau khi lưu vẫn ở tab Nhân công và tiêu đề khớp dữ liệu lưu', JSON.stringify(await hien()) === '["nhancong"]' && (await tong()) === t0 + 2);

  // 5. lưu ở tab nào chỉ ảnh hưởng tab đó
  const dinhBien0 = JSON.stringify((await db()).dinhBien), tgTruoc = JSON.stringify((await db()).dinhMucNgay || null);
  await w.click('#normTab_keo'); await w.waitForSelector('#keoForm');
  ok('tab Gỗ keo: chỉ #keoForm hiện', JSON.stringify(await hien()) === '["keo"]' && !(await w.isVisible('#dbForm')));
  await w.fill('#keoForm tr[data-keo=new] [name=k_tu]', '01/01/2026'); await w.fill('#keoForm tr[data-keo=new] [name=k_tan]', '85'); await w.click('#keoForm button[type=submit]'); await w.waitForTimeout(600);
  d = await db();
  ok('lưu định mức gỗ keo: chỉ đổi dinhMucKeo, định biên không đổi', JSON.stringify(d.dinhMucKeo) === JSON.stringify([{tuNgay: '01/01/2026', tanHa: 85}]) && JSON.stringify(d.dinhBien) === dinhBien0 && JSON.stringify(d.dinhMucNgay || null) === tgTruoc, JSON.stringify(d.dinhMucKeo));
  ok('lưu xong vẫn ở tab Gỗ keo (nhớ tab trong phiên)', JSON.stringify(await hien()) === '["keo"]');
  await w.click('#normTab_tg'); await w.waitForSelector('#tgForm'); ok('tab Thời gian khai thác: chỉ #tgForm hiện', JSON.stringify(await hien()) === '["tg"]');
  await w.click('#navHome'); await w.click('#navNorm'); await w.waitForSelector('#normTabs');
  ok('rời màn Định mức rồi quay lại: mở đúng tab đã xem lần trước', JSON.stringify(await hien()) === '["tg"]');

  // 6. xóa vị trí đang dùng (có trong định biên) => Ngừng sử dụng, không xóa hẳn
  await moVt(); vt = (await db()).dmViTri.find(v => v.ten === 'Thợ lái máy');
  await w.click('[data-vtxoa="' + vt.id + '"]'); await w.waitForTimeout(400);
  d = await db(); const sau = d.dmViTri.find(v => v.id === vt.id);
  ok('xóa vị trí đang dùng: chuyển Ngừng sử dụng, còn trong danh mục, nhiệm vụ giữ nguyên', !!sau && sau.ngung === true && sau.nhiemVu === 'Lái máy xúc, máy kéo gỗ', JSON.stringify(sau));
  ok('thông báo nêu rõ Ngừng sử dụng', /Ngừng sử dụng/.test(await w.innerText('#vtMsg')), await w.innerText('#vtMsg').catch(() => ''));
  ok('định biên vẫn còn dòng Thợ lái máy', (d.dinhBien || []).some(r => r.chucDanh === 'Thợ lái máy'));
  await w.click('[data-vtdung="' + vt.id + '"]'); await w.waitForTimeout(300); ok('Dùng lại: bỏ ngừng sử dụng', (await db()).dmViTri.find(v => v.id === vt.id).ngung === false);

  ok('không có lỗi script', errs.length === 0, errs.join('; '));
  await app.close(); console.log(fail ? 'CÓ ' + fail + ' LỖI' : 'TẤT CẢ ĐẠT'); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
