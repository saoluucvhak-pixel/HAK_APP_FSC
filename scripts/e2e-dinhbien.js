'use strict';
/* Định mức nhân công (định biên một đội 8 người, nhiệm vụ từng vị trí): màn Định mức, so sánh ở tab Nhân công, Kiểm tra trước khi xuất, BM-06 (Electron thật, SQLite thật).
 * Chạy: xvfb-run -a node scripts/e2e-dinhbien.js */
const {_electron: electron} = require('playwright-core');
const path = require('path'), fs = require('fs'), os = require('os');
const JSZip = require('jszip');
const src = fs.readFileSync(path.join(__dirname, 'e2e-inan2.js'), 'utf8');
const {nv, lot, seed} = new Function(src.slice(src.indexOf('const nv ='), src.indexOf('const plain =')) + '; return {nv, lot, seed};')();
const root = path.join(__dirname, '..');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hakqn-db-')), out = path.join(dir, 'out'); fs.mkdirSync(out);
let fail = 0; const ok = (name, cond, extra) => { console.log((cond ? 'ĐẠT  ' : 'LỖI  ') + name + (!cond && extra ? ' — ' + extra : '')); if (!cond) fail++; };
const plain = xml => (xml.match(/<w:t[^>]*>([^<]*)<\/w:t>/g) || []).map(a => a.replace(/<[^>]+>/g, '')).join('');
(async () => {
  const app = await electron.launch({executablePath: require('electron'), args: [root, '--no-sandbox'], env: {...process.env, HAKQN_CLOSE: 'discard', HAKQN_DB: path.join(dir, 'd.sqlite'), HAKQN_USERDATA: path.join(dir, 'ud'), HAKQN_DOWNLOAD_DIR: out, ELECTRON_DISABLE_SECURITY_WARNINGS: '1'}});
  const w = await app.firstWindow(); const errs = []; w.on('pageerror', e => errs.push(e.message)); w.on('dialog', d => d.accept()); await w.waitForSelector('#side');
  // rừng A: đủ 8 người đúng định biên; rừng B: nhân công mặc định cũ (tổ trưởng, công nhân khai thác, công nhân cưa)
  const eight = [['Tổ trưởng', 'Tổ trưởng'], ['Công nhân', 'Công nhân cưa'], ['Công nhân', 'Công nhân cưa'], ['Công nhân', 'Công nhân bóc vỏ'], ['Công nhân', 'Công nhân bóc vỏ'], ['Công nhân', 'Công nhân bóc vỏ'], ['Công nhân', 'Công nhân bốc xếp'], ['Công nhân', 'Công nhân bốc xếp']]
    .map(([vai, cd], i) => ({...nv(i + 1, vai, 'NGƯỜI SỐ ' + (i + 1), cd, '04908500' + String(1000 + i)), maRung: 'R-A'}));
  const A = lot('fa', 'R-A', {exp: {}, pc: [], nc: eight}), B = lot('fb', 'R-B', {exp: {}, pc: []}); B.nc = B.nc.map(r => ({...r, maRung: 'R-B'})); B.dx = B.dx.map(r => ({...r, maRung: 'R-B'}));
  A.info.donGiaTan = {...A.info.donGiaTan, 'Công nhân bóc vỏ': 330000, 'Công nhân bốc xếp': 350000};   // đơn giá của vị trí mới do người dùng khai ở tab Nhân công
  const D = seed([A, B]);
  await w.evaluate(d => window.hak.save(d), D); await w.reload(); await w.waitForSelector('#side');
  const db = () => w.evaluate(() => window.hak.loadSync().db);
  const openNc = async fid => { await w.click('[data-open=own1]'); await w.click('[data-tab=rung]'); await w.click('[data-forest=' + fid + ']'); await w.click('[data-ftab=nc]'); await w.waitForTimeout(300); };
  // 1. màn Định mức: mặc định 8 người, nhiệm vụ rõ từng vị trí
  await w.click('#navNorm'); await w.waitForSelector('#dbForm'); let t = await w.innerText('#dbForm');
  ok('màn Định mức có mục “Định mức nhân công: 1 đội = 8 người”, nói rõ đang là mặc định chưa lưu', /Đang hiển thị định mức mặc định, bấm Lưu/.test(t) && /Định mức nhân công: 1 đội = 8 người/.test(await w.innerText('#main')));
  const vals = await w.$$eval('#dbForm tr[data-db]', trs => trs.map(tr => [tr.querySelector('[name=b_cd]').value, tr.querySelector('[name=b_so]').value, tr.querySelector('[name=b_km]').value, tr.querySelector('[name=b_nv]').value]));
  ok('4 vị trí mặc định: Tổ trưởng 1 (kiêm bốc xếp), Công nhân cưa 2, bóc vỏ 3, bốc xếp 2; mỗi vị trí có nhiệm vụ', vals.slice(0, 4).map(v => v[0] + ':' + v[1]).join('|') === 'Tổ trưởng:1|Công nhân cưa:2|Công nhân bóc vỏ:3|Công nhân bốc xếp:2' && vals[0][2] === 'Công nhân bốc xếp' && vals.slice(0, 4).every(v => v[3].length > 20) && /Hạ toàn bộ cây/.test(vals[1][3]) && /Bóc vỏ và xếp gỗ/.test(vals[2][3]) && /15–20 tấn/.test(vals[3][3]), JSON.stringify(vals));
  ok('ô Tổ trưởng cố định (chỉ đọc): không đổi được tên và số người', (await w.getAttribute('#dbForm tr[data-db="0"] [name=b_so]', 'readonly')) !== null);
  // 2. kiểm tra đầu vào
  await w.fill('#dbForm tr[data-db="1"] [name=b_so]', '0'); await w.click('#dbForm button[type=submit]'); await w.waitForTimeout(300);
  ok('số người 0: bị từ chối, nêu dòng và lý do, không ghi', /Dòng 2: số người .* từ 1 đến 50/.test(await w.innerText('#main')) && !(await db()).dinhBien);
  await w.fill('#dbForm tr[data-db="1"] [name=b_so]', '2'); await w.fill('#dbForm tr[data-db="2"] [name=b_nv]', ''); await w.click('#dbForm button[type=submit]'); await w.waitForTimeout(300);
  ok('thiếu nhiệm vụ: bị từ chối, nêu tên vị trí', /chưa ghi nhiệm vụ của “Công nhân bóc vỏ”/.test(await w.innerText('#main')) && !(await db()).dinhBien);
  // 3. lưu: vị trí mới tự vào danh sách chức danh
  await w.click('#navNorm'); await w.waitForSelector('#dbForm'); await w.click('#dbForm button[type=submit]'); await w.waitForTimeout(400); let d = await db();
  ok('lưu định mức mặc định: 4 vị trí vào SQLite; “Công nhân bóc vỏ”, “Công nhân bốc xếp” tự thêm vào danh sách chức danh; có nhắc khai BHLĐ và đơn giá', d.dinhBien.length === 4 && JSON.stringify(d.chucDanhThem) === JSON.stringify(['Công nhân bóc vỏ', 'Công nhân bốc xếp']) && /Khai định mức BHLĐ và đơn giá/.test(await w.innerText('body')), JSON.stringify([d.dinhBien && d.dinhBien.length, d.chucDanhThem]));
  // vị trí mới chưa có định mức BHLĐ: bổ sung để xuất được hồ sơ (người dùng khai ở màn Định mức BHLĐ)
  { const d1 = await db(), ct = {qa: '1 bộ'}; d1.dinhMuc = {...(d1.dinhMuc || {}), 'Tổ trưởng': ct, 'Công nhân khai thác': ct, 'Công nhân cưa': ct, 'Công nhân bóc vỏ': ct, 'Công nhân bốc xếp': ct}; await w.evaluate(x => window.hak.save(x), d1); await w.reload(); await w.waitForSelector('#side'); }
  await w.click('#navNorm'); await w.waitForSelector('#dbForm'); ok('mở lại: không còn dòng “đang hiển thị mặc định”', !/Đang hiển thị định mức mặc định/.test(await w.innerText('#dbForm')));
  // 4. tab Nhân công: so sánh với định mức
  await openNc('fa'); ok('rừng A đủ 8 người đúng định mức: báo “Đúng định mức nhân công: 8 người”, không cảnh báo', /Đúng định mức nhân công: 8 người/.test(await w.innerText('#dbLech')));
  await w.click('#dbPanel summary'); const panel = await w.innerText('#dbPanel');
  ok('bảng nhiệm vụ từng vị trí: tên vị trí, định mức, hiện có, nhiệm vụ, Tổ trưởng ghi rõ kiêm bốc xếp', ['Tổ trưởng', 'Công nhân cưa', 'Công nhân bóc vỏ', 'Công nhân bốc xếp'].every(x => panel.includes(x)) && /kiêm Công nhân bốc xếp/.test(panel) && /Hạ toàn bộ cây/.test(panel) && /Bóc vỏ và xếp gỗ/.test(panel), panel.slice(0, 300));
  await openNc('fb'); const lech = await w.innerText('#dbLech');
  ok('rừng B (3 người, vị trí cũ): cảnh báo thiếu 1 cưa, 3 bóc vỏ, 2 bốc xếp và nêu người giữ vị trí không có trong định mức; chỉ cảnh báo', /Lệch định mức nhân công \(1 đội 8 người, hiện có 3\)/.test(lech) && /thiếu 1 Công nhân cưa/.test(lech) && /thiếu 3 Công nhân bóc vỏ/.test(lech) && /thiếu 2 Công nhân bốc xếp/.test(lech) && /“Công nhân khai thác” không có trong định mức/.test(lech) && /Chỉ cảnh báo, không chặn/.test(lech), lech);
  await w.click('[data-ftab=kt]'); await w.waitForTimeout(400); const kt = await w.innerText('#main');
  ok('Kiểm tra trước khi xuất, rừng B: có mục “Định mức nhân công” (cần đối chiếu)', /Định mức nhân công/.test(kt) && /thiếu 3 Công nhân bóc vỏ/.test(kt));
  await openNc('fa'); await w.click('[data-ftab=kt]'); await w.waitForTimeout(400);
  ok('Kiểm tra trước khi xuất, rừng A đủ người: không có mục “Định mức nhân công”', !/Số người khác định mức/.test(await w.innerText('#main')));
  // 5. BM-06 có phần phân công nhiệm vụ
  await w.click('[data-ftab=xuat]'); await w.click('[data-xtab=ld]'); await w.waitForTimeout(300);
  if (process.env.DBG) console.log('GATE>>', (await w.innerText('#main')).slice(0, 700).replace(/\n/g, ' | '), await w.$eval('button[data-act=dl][data-kind=dsd]', b => b.disabled));
  for (const f of fs.readdirSync(out)) fs.unlinkSync(path.join(out, f));
  await w.$eval('button[data-act=dl][data-kind=dsd]', b => b.click()); let f = null; for (let i = 0; i < 100 && !f; i++) { f = fs.readdirSync(out).find(x => x.endsWith('.docx')); await w.waitForTimeout(150); } await w.waitForTimeout(400);
  const xml = await (await JSZip.loadAsync(fs.readFileSync(path.join(out, f)))).file('word/document.xml').async('string'), txt = plain(xml);
  ok('BM-06 Danh sách đội khai thác có thêm “PHÂN CÔNG NHIỆM VỤ THEO VỊ TRÍ”: định biên, thực tế, nhiệm vụ từng vị trí', /PHÂN CÔNG NHIỆM VỤ THEO VỊ TRÍ/.test(txt) && /Tổ trưởng \(kiêm công nhân bốc xếp\)/.test(txt) && /Hạ toàn bộ cây ở khu vực đất bằng/.test(txt) && /Bóc vỏ và xếp gỗ gọn/.test(txt) && /15–20 tấn/.test(txt), txt.slice(-600));
  // 6. dùng mặc định: xóa định mức riêng
  await w.click('#navNorm'); await w.waitForSelector('#dbForm'); await w.click('[data-act=dbReset]'); await w.waitForTimeout(400);
  ok('“Dùng định mức mặc định”: xóa bản đã lưu, màn hình lại ghi “mặc định”', !(await db()).dinhBien && /Đang hiển thị định mức mặc định/.test(await w.innerText('#dbForm')));
  ok('không có lỗi JavaScript', errs.length === 0, errs.join('|'));
  await app.close(); console.log(fail ? 'CÓ ' + fail + ' LỖI' : 'TẤT CẢ ĐẠT'); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
