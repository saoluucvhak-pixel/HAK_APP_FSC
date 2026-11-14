'use strict';
/* Định mức thời gian khai thác (1 ha = ? ngày) → thời gian khai thác dự kiến của rừng và ngày kết thúc dự kiến (Electron thật, SQLite thật, dữ liệu giả lập).
 * Chạy: xvfb-run -a node scripts/e2e-tgkhai.js */
const {_electron: electron} = require('playwright-core');
const path = require('path'), fs = require('fs'), os = require('os');
const src = fs.readFileSync(path.join(__dirname, 'e2e-inan2.js'), 'utf8');
const {lot, seed} = new Function(src.slice(src.indexOf('const nv ='), src.indexOf('const plain =')) + '; return {lot, seed};')();
const root = path.join(__dirname, '..');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hakqn-tg-'));
let fail = 0; const ok = (name, cond, extra) => { console.log((cond ? 'ĐẠT  ' : 'LỖI  ') + name + (!cond && extra ? ' — ' + extra : '')); if (!cond) fail++; };
(async () => {
  const app = await electron.launch({executablePath: require('electron'), args: [root, '--no-sandbox'], env: {...process.env, HAKQN_CLOSE: 'discard', HAKQN_DB: path.join(dir, 't.sqlite'), HAKQN_USERDATA: path.join(dir, 'ud'), ELECTRON_DISABLE_SECURITY_WARNINGS: '1'}});
  const w = await app.firstWindow(); const errs = []; w.on('pageerror', e => errs.push(e.message)); w.on('dialog', d => d.accept()); await w.waitForSelector('#side');
  const A = lot('fa', 'R-A', {exp: {}, pc: []}); A.info.dienTich = 2.5; A.info.dinhMucTanHa = null; A.info.tuNgay = ''; A.info.denNgay = '';
  await w.evaluate(d => window.hak.save(d), seed([A])); await w.reload(); await w.waitForSelector('#side');
  const db = () => w.evaluate(() => window.hak.loadSync().db);
  const openInfo = async () => { await w.click('[data-open=own1]'); await w.click('[data-tab=rung]'); await w.click('[data-forest=fa]'); await w.click('[data-ftab=finfo]'); await w.waitForSelector('#forestForm'); };
  const note = () => w.innerText('#tgNote');
  // 1. chưa có định mức: nêu rõ cần gì
  await openInfo();
  ok('chưa có định mức thời gian: ghi chú nêu cần diện tích và định mức thời gian khai thác', /Chưa tính được thời gian khai thác dự kiến/.test(await note()), await note());
  // 2. màn Định mức: khai 1 ha = 5 ngày (hiệu lực từ 01/01/2025), và định mức gỗ keo 80 tấn/ha
  await w.click('#navNorm'); await w.waitForSelector('#tgForm');
  ok('màn Định mức có mục “Định mức thời gian khai thác: 1 ha = ? ngày”', /Định mức thời gian khai thác: 1 ha = \? ngày/.test(await w.innerText('#main')));
  await w.fill('#tgForm tr[data-tg=new] [name=t_tu]', '01/01/2025'); await w.fill('#tgForm tr[data-tg=new] [name=t_ngay]', '0'); await w.click('#tgForm button[type=submit]'); await w.waitForTimeout(300);
  ok('định mức 0 ngày/ha bị từ chối, nêu lý do, không ghi', /lớn hơn 0/.test(await w.innerText('#main')) && !((await db()).dinhMucNgay || []).length);
  await w.fill('#tgForm tr[data-tg=new] [name=t_tu]', '01/01/2025'); await w.fill('#tgForm tr[data-tg=new] [name=t_ngay]', '5'); await w.click('#tgForm button[type=submit]'); await w.waitForTimeout(300);
  ok('lưu 1 ha = 5 ngày (hiệu lực từ 01/01/2025) vào SQLite', JSON.stringify((await db()).dinhMucNgay) === JSON.stringify([{tuNgay: '01/01/2025', ngayHa: 5}]));
  await w.fill('#keoForm tr[data-keo=new] [name=k_tu]', '01/01/2025'); await w.fill('#keoForm tr[data-keo=new] [name=k_tan]', '80'); await w.click('#keoForm button[type=submit]'); await w.waitForTimeout(300);
  await w.click('#navNorm'); await w.waitForSelector('#tgForm');
  ok('cột năng suất: 1 ngày ≈ 16 tấn (80 tấn/ha ÷ 5 ngày/ha)', /1 ngày ≈ 16 tấn/.test(await w.innerText('#tgForm')), (await w.innerText('#tgForm')).slice(-200));
  // 3. thông tin rừng: 2,5 ha × 5 = 12,5 → 13 ngày; chưa có ngày bắt đầu
  await openInfo();
  let n = await note(); ok('thời gian khai thác dự kiến = 2,5 ha × 5 ngày/ha = 12,5 → 13 ngày (làm tròn lên), nêu không tính Chủ nhật và năng suất', /13 ngày/.test(n) && /2,5 ha × 5 ngày\/ha/.test(n) && /không tính Chủ nhật/.test(n) && /1 ngày ≈ 16 tấn/.test(n) && /Nhập từ ngày/.test(n), n);
  // 4. nhập ngày bắt đầu: hiện ngay ngày kết thúc dự kiến (01/10/2026 thứ Năm, 13 ngày khai thác bỏ Chủ nhật)
  await w.fill('#forestForm [name=tuNgay]', '01/10/2026'); await w.waitForTimeout(300); n = await note();
  // 13 ngày: 01-03/10 (3), 05-10/10 (6 →9), 12-15/10 (4 → 13) → kết thúc 15/10/2026
  ok('nhập ngày bắt đầu 01/10/2026: hiện ngay kết thúc dự kiến 15/10/2026 (13 ngày khai thác, bỏ Chủ nhật 04, 11/10)', /kết thúc dự kiến 15\/10\/2026/.test(n), n);
  await w.click('[data-act=fillDenDk]'); await w.waitForTimeout(200);
  ok('bấm “Điền ngày kết thúc dự kiến”: ô đến ngày = 15/10/2026 (chưa lưu cho đến khi bấm Lưu)', (await w.inputValue('#forestForm [name=denNgay]')) === '15/10/2026' && !(await db()).rs.own1.forests.fa.info.denNgay);
  await w.click('#forestForm button[type=submit]'); await w.waitForTimeout(400);
  ok('lưu thông tin rừng: từ ngày 01/10/2026, đến ngày 15/10/2026 trong SQLite', (await db()).rs.own1.forests.fa.info.tuNgay === '01/10/2026' && (await db()).rs.own1.forests.fa.info.denNgay === '15/10/2026');
  await openInfo(); n = await note();
  ok('mở lại: ô đến ngày trùng ngày dự kiến thì không nhắc khác biệt', /kết thúc dự kiến 15\/10\/2026/.test(n) && !/đang là/.test(n), n);
  await w.fill('#forestForm [name=denNgay]', '20/10/2026'); await w.waitForTimeout(250);
  ok('ô đến ngày nhập khác ngày dự kiến: ghi chú nêu “ô đến ngày đang là 20/10/2026”, không tự ghi đè', /ô “đến ngày” đang là 20\/10\/2026/.test(await note()) && (await w.inputValue('#forestForm [name=denNgay]')) === '20/10/2026');
  // 5. bắt đầu vào Chủ nhật: ngày khai thác đầu là thứ Hai
  await w.fill('#forestForm [name=tuNgay]', '04/10/2026'); await w.waitForTimeout(250); n = await note();
  // 04/10 là Chủ nhật: ngày 1 = 05/10; 13 ngày: 05-10 (6), 12-17 (6 →12), 19 (13) → 19/10/2026
  ok('bắt đầu Chủ nhật 04/10/2026: ngày khai thác đầu là thứ Hai 05/10, kết thúc dự kiến 19/10/2026', /kết thúc dự kiến 19\/10\/2026/.test(n), n);
  // 6. định mức riêng của rừng ưu tiên; dùng mặc định trở lại; số sai bị báo
  await w.fill('#forestForm [name=dinhMucNgayHa]', '2'); await w.waitForTimeout(250); n = await note();
  ok('rừng tự điền 2 ngày/ha: 2,5 × 2 = 5 ngày, số riêng được ưu tiên', /5 ngày/.test(n) && /2,5 ha × 2 ngày\/ha/.test(n), n);
  await w.fill('#forestForm [name=dinhMucNgayHa]', 'abc'); await w.click('#forestForm button[type=submit]'); await w.waitForTimeout(400);
  ok('định mức ngày/ha gõ chữ: bị báo lỗi, không lưu', /Định mức thời gian khai thác \(ngày\/ha\) không phải là số/.test(await w.innerText('#main')) && (await db()).rs.own1.forests.fa.info.dinhMucNgayHa == null);
  await w.fill('#forestForm [name=dinhMucNgayHa]', '2'); await w.click('#forestForm button[type=submit]'); await w.waitForTimeout(400);
  ok('lưu định mức riêng 2 ngày/ha của rừng vào SQLite', (await db()).rs.own1.forests.fa.info.dinhMucNgayHa === 2);
  await openInfo(); await w.click('[data-act=tgDefault]'); await w.waitForTimeout(200); await w.click('#forestForm button[type=submit]'); await w.waitForTimeout(400);
  ok('“Dùng mặc định”: xóa số riêng, quay về 5 ngày/ha (13 ngày)', (await db()).rs.own1.forests.fa.info.dinhMucNgayHa == null && /13 ngày/.test(await (async () => { await openInfo(); return note(); })()));
  // 7. định mức hiệu lực theo ngày bắt đầu: bản mới 4 ngày/ha từ 01/07/2026
  await w.click('#navNorm'); await w.waitForSelector('#tgForm'); await w.fill('#tgForm tr[data-tg=new] [name=t_tu]', '01/07/2026'); await w.fill('#tgForm tr[data-tg=new] [name=t_ngay]', '4'); await w.click('#tgForm button[type=submit]'); await w.waitForTimeout(300);
  await openInfo(); n = await note();
  ok('bắt đầu khai thác 04/10/2026 ≥ 01/07/2026: dùng bản 4 ngày/ha → 2,5 × 4 = 10 ngày', /10 ngày/.test(n) && /2,5 ha × 4 ngày\/ha/.test(n), n);
  await w.fill('#forestForm [name=tuNgay]', '01/03/2026'); await w.waitForTimeout(250);
  ok('đổi ngày bắt đầu về 01/03/2026 (trước 01/07/2026): quay lại bản 5 ngày/ha → 13 ngày', /13 ngày/.test(await note()));
  // 8. cảnh báo khi ngày kết thúc thực tế lệch nhiều so với dự kiến (định mức hiện hành 4 ngày/ha → 2,5 ha = 10 ngày khai thác)
  await openInfo(); await w.fill('#forestForm [name=tuNgay]', '01/10/2026'); await w.fill('#forestForm [name=denNgay]', '31/10/2026'); await w.waitForTimeout(300);
  let lech = await w.innerText('#tgLech').catch(() => '');
  ok('đến ngày 31/10/2026: hiện ngay cảnh báo nêu thực tế 27 ngày (01–31/10 bỏ 4 Chủ nhật), dự kiến 10 ngày, +17 ngày, ngưỡng 3 ngày', /Cảnh báo: Thời gian khai thác thực tế 27 ngày/.test(lech) && /DÀI hơn dự kiến 10 ngày: \+17 ngày/.test(lech) && /lệch quá 3 ngày/.test(lech), lech);
  await w.fill('#forestForm [name=denNgay]', '13/10/2026'); await w.waitForTimeout(300);
  ok('đến ngày 13/10/2026 (11 ngày, lệch +1 trong ngưỡng 3): không còn cảnh báo', !(await w.$('#tgLech')));
  await w.fill('#forestForm [name=denNgay]', '07/10/2026'); await w.waitForTimeout(300); lech = await w.innerText('#tgLech').catch(() => '');
  ok('đến ngày 07/10/2026 (6 ngày, ngắn hơn 4): cũng cảnh báo “NGẮN hơn”', /NGẮN hơn dự kiến 10 ngày: -4 ngày/.test(lech), lech);
  await w.fill('#forestForm [name=denNgay]', '31/10/2026'); await w.click('#forestForm button[type=submit]'); await w.waitForTimeout(400);
  await w.click('[data-ftab=kt]'); await w.waitForTimeout(400); const kt = await w.innerText('#main');
  ok('Kiểm tra trước khi xuất: có mục “Thời gian khai thác” (cần đối chiếu) nêu độ lệch; không chặn xuất hồ sơ', /Thời gian khai thác/.test(kt) && /thực tế 27 ngày/.test(kt) && /dự kiến 10 ngày/.test(kt));
  await w.click('#navHome'); await w.waitForSelector('#homeSys'); await w.waitForTimeout(500); const home = await w.innerText('#main');
  ok('Tổng quan: cảnh báo “Rừng có thời gian khai thác thực tế lệch nhiều so với dự kiến” nêu rừng và số ngày', /Rừng có thời gian khai thác thực tế lệch nhiều so với dự kiến/.test(home) && /thực tế 27 ngày, dự kiến 10 ngày \(\+17\)/.test(home), home.slice(0, 400));
  await openInfo(); await w.fill('#forestForm [name=denNgay]', ''); await w.click('#forestForm button[type=submit]'); await w.waitForTimeout(400);
  ok('xóa ô đến ngày, chưa có phiếu cân: không có gì để so, không cảnh báo', !(await w.$('#tgLech')));
  // chưa có ngày kết thúc nhưng đã có phiếu cân: so với ngày cân cuối cùng
  { const d0 = await db(); d0.rs.own1.forests.fa.pc = [{_row: 2, maRung: 'R-A', stt: '1', ngay: '30/10/2026', bienSo: '92C-12345', soPhieu: 'Z1', kl: 5, noiGiao: 'KCN', ghiChu: ''}, {_row: 3, maRung: 'R-A', stt: '2', ngay: '31/10/2026', bienSo: '92C-12345', soPhieu: 'Z2', kl: 5, noiGiao: 'KCN', ghiChu: ''}]; await w.evaluate(x => window.hak.save(x), d0); await w.reload(); await w.waitForSelector('#side'); }
  await openInfo(); lech = await w.innerText('#tgLech').catch(() => '');
  ok('ô đến ngày trống nhưng đã có phiếu cân (cuối cùng 31/10/2026): cảnh báo so với “ngày cân cuối cùng”', /theo ngày cân cuối cùng/.test(lech) && /thực tế 27 ngày/.test(lech), lech);
  // xóa một dòng định mức: bấm Xóa rồi Lưu mới ghi
  await w.click('#navNorm'); await w.waitForSelector('#tgForm'); await w.click('#tgForm tr[data-tg="1"] [data-act=keoDel]'); ok('bấm Xóa: dòng ẩn nhưng chưa ghi vào SQLite cho đến khi bấm Lưu', ((await db()).dinhMucNgay || []).length === 2);
  await w.click('#tgForm button[type=submit]'); await w.waitForTimeout(300); ok('Lưu sau khi Xóa: chỉ còn bản 5 ngày/ha từ 01/01/2025', JSON.stringify((await db()).dinhMucNgay) === JSON.stringify([{tuNgay: '01/01/2025', ngayHa: 5}]));
  ok('không có lỗi JavaScript', errs.length === 0, errs.join('|'));
  await app.close(); console.log(fail ? 'CÓ ' + fail + ' LỖI' : 'TẤT CẢ ĐẠT'); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
