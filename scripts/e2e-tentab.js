'use strict';
/* Tên tab chuẩn HoSoKeo/HoSoRung/ToaDoRung (Electron thật, Google Sheets giả lập bằng máy chủ cục bộ, Excel giả lập): nhận tên mới, _QC, khác hoa/thường;
 * tab tên lạ → đề xuất và chờ xác nhận; có cả tên mới lẫn _QC → chọn; chưa xác nhận thì giữ nguyên bản cũ; nhớ ánh xạ; file mẫu 3 tab chuẩn.
 * Chạy: xvfb-run -a node scripts/e2e-tentab.js */
const {_electron: electron} = require('playwright-core');
const path = require('path'), fs = require('fs'), os = require('os'), http = require('http');
const XLSX = require('xlsx');
const {build} = require('../tests/fixtures/make-lookup');
const root = path.join(__dirname, '..');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hakqn-tt-')), dbFile = path.join(dir, 'tt.sqlite'), out = path.join(dir, 'out');
let fail = 0; const ok = (n, c, x) => { console.log((c ? 'ĐẠT  ' : 'LỖI  ') + n + (!c && x ? ' — ' + x : '')); if (!c) fail++; };
let body = build();
const srv = http.createServer((q, r) => { r.writeHead(200, {'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}); r.end(body); });
const wf = (name, v) => { const f = path.join(dir, name); fs.writeFileSync(f, build(v)); return f; };
(async () => {
  await new Promise(r => srv.listen(0, '127.0.0.1', r));
  const url = 'http://127.0.0.1:' + srv.address().port + '/export.xlsx';
  const app = await electron.launch({executablePath: require('electron'), args: [root, '--no-sandbox'], env: {...process.env, HAKQN_CLOSE: 'discard', HAKQN_DB: dbFile, HAKQN_SHEET_URL: url, HAKQN_DOWNLOAD_DIR: out}});
  const w = await app.firstWindow(); const errs = []; w.on('pageerror', e => errs.push(e.message)); w.on('dialog', d => d.accept());
  const pick = p => app.evaluate(({dialog}, p) => { dialog.showOpenDialog = async () => ({canceled: false, filePaths: [p]}); }, p);
  const txt = () => w.innerText('#lkBody'), status = () => w.evaluate(() => window.hak.lookup.status());
  const done = re => w.waitForFunction(r => new RegExp(r).test(document.getElementById('lkBody').innerText), re.source, {timeout: 20000});
  await w.waitForSelector('#side'); await w.click('header [data-act=lkOpen]'); await w.waitForSelector('#lkBox.on');

  // 1. đồng bộ bộ tên chuẩn mới
  await w.click('[data-act=lkSync]'); await done(/Đã cập nhật bản tra cứu/);
  ok('đồng bộ với bộ tên chuẩn HoSoKeo/HoSoRung/ToaDoRung: nạp được, hiển thị tên chuẩn', /HoSoKeo: 8/.test(await txt()) && /HoSoRung: 5/.test(await txt()) && /ToaDoRung: 7/.test(await txt()) && !(await w.$('#lkPend')));
  // 2. file đang dùng hậu tố _QC và khác hoa/thường
  await pick(wf('cu_qc.xlsx', 'legacy')); await w.click('[data-act=lkExcel]'); await done(/Đã cập nhật bản tra cứu/);
  ok('file _QC đang dùng: nhập được, không cần đổi tên', /cu_qc\.xlsx/.test(await txt()) && !(await w.$('#lkPend')));
  await pick(wf('hoa_thuong.xlsx', 'names:HOsokeo |hosorung|  ToaDoRung_qc')); await w.click('[data-act=lkExcel]'); await done(/Đã cập nhật bản tra cứu/);
  ok('tên khác hoa/thường, có khoảng trắng: nhận tự động', /hoa_thuong\.xlsx/.test(await txt()) && !(await w.$('#lkPend')));
  const goodNow = (await status()).active.detail;

  // 3. tên tab lạ: đề xuất, chưa xác nhận thì không đổi gì; hủy giữ bản cũ
  await pick(wf('ten_la.xlsx', 'names:Sheet1|Sheet2|Sheet3')); await w.click('[data-act=lkExcel]'); await w.waitForSelector('#lkPend');
  const pend = await w.innerText('#lkPend');
  ok('tab tên lạ: hiện đề xuất từng vai trò để xác nhận (không tự nạp)', /HoSoKeo/.test(pend) && /Sheet1/.test(pend) && /HoSoRung/.test(pend) && /Sheet2/.test(pend) && /ToaDoRung/.test(pend) && /Sheet3/.test(pend), pend.slice(0, 300));
  ok('chưa xác nhận: bản tra cứu đang dùng không đổi', (await status()).active.detail === goodNow);
  await w.click('[data-act=lkCancelTabs]'); await w.waitForFunction(() => !document.getElementById('lkPend'));
  ok('hủy: giữ bản cũ và báo rõ', (await status()).active.detail === goodNow && /Đã hủy, vẫn dùng bản tra cứu đã lưu/.test(await txt()));
  // chọn sai tab (thiếu cột) → từ chối, vẫn chờ chọn lại
  await pick(wf('ten_la.xlsx', 'names:Sheet1|Sheet2|Sheet3')); await w.click('[data-act=lkExcel]'); await w.waitForSelector('#lkPend');
  const bad = await w.evaluate(() => window.hak.lookup.confirmTabs({HoSoKeo_QC: 'Sheet2', HoSoRung_QC: 'Sheet1', ToaDoRung_QC: 'Sheet3'}));
  ok('chọn tab thiếu cột: từ chối, nêu tên tab và cột; bản cũ giữ nguyên', !bad.ok && /Tab “Sheet2” \(chọn làm “HoSoKeo”\) thiếu cột/.test((bad.errors || []).join(' ')) && (await status()).active.detail === goodNow);
  await w.click('[data-act=lkConfirmTabs]'); await done(/Đã nạp và ghi nhớ tab đã chọn/);
  ok('xác nhận đề xuất: nạp được, hiển thị tên chuẩn', /ten_la\.xlsx/.test(await txt()) && /HoSoKeo 8 dòng/.test(await txt()) && !(await w.$('#lkPend')));
  await pick(wf('ten_la.xlsx', 'names:Sheet1|Sheet2|Sheet3')); await w.click('[data-act=lkExcel]'); await done(/Đã cập nhật bản tra cứu/);
  ok('nhập lại cùng file: đã nhớ ánh xạ, không hỏi lại', !(await w.$('#lkPend')));

  // 3b. một tab gán cho hai vai trò: chặn, nêu tên tab và hai vai trò, giữ bản cũ; chọn lại được
  const keepAt = (await status()).active.loadedAt;
  await pick(wf('x_la.xlsx', 'names:A1|A2|A3')); await w.click('[data-act=lkExcel]'); await w.waitForSelector('#lkPend');
  const dup2 = await w.evaluate(() => window.hak.lookup.confirmTabs({HoSoKeo_QC: 'A1', HoSoRung_QC: 'A1', ToaDoRung_QC: 'A3'}));
  ok('gán A1 cho hai vai trò: không nạp, nêu tab và hai vai trò', !dup2.ok && /Tab “A1” đang được gán cho cả “HoSoKeo” và “HoSoRung”/.test((dup2.conflicts || []).join(' ')));
  ok('giữ bản tra cứu gần nhất và thời điểm nạp thành công', (await status()).active.detail && (await status()).active.loadedAt >= keepAt);
  const fixR = await w.evaluate(() => window.hak.lookup.confirmTabs({HoSoKeo_QC: 'A1', HoSoRung_QC: 'A2', ToaDoRung_QC: 'A3'}));
  ok('chọn lại đúng: nạp được', fixR.ok);
  // HoSoKeo chỉ có cột KG, chỉ có cột Tấn, thiếu cả hai
  await pick(wf('chi_kg.xlsx', 'kgOnly')); await w.click('[data-act=lkExcel]'); await done(/Đã cập nhật bản tra cứu/);
  ok('chỉ có cột “KL hàng (KG)”: nạp được', /chi_kg\.xlsx/.test(await txt()));
  await pick(wf('chi_tan.xlsx', 'tanOnly')); await w.click('[data-act=lkExcel]'); await done(/Đã cập nhật bản tra cứu/);
  ok('chỉ có cột “Khối lượng (Tấn)”: nạp được', /chi_tan\.xlsx/.test(await txt()));
  await pick(wf('khong_kl.xlsx', 'noWeight')); await w.click('[data-act=lkExcel]'); await done(/Chưa cập nhật bản tra cứu/);
  ok('thiếu cả hai cột khối lượng: báo lỗi riêng, giữ bản cũ', /một trong hai cột “KL hàng \(KG\)” hoặc “Khối lượng \(Tấn\)”/.test(await txt()) && /chi_tan\.xlsx/.test(await txt()));

  // 4. có đồng thời tên mới và _QC (qua Google giả lập): danh sách chọn
  // bảng tính Google khác (ID khác, chưa có ánh xạ đã nhớ); dữ liệu vẫn lấy từ máy chủ giả lập
  await w.evaluate(() => window.hak.lookup.setSheet('https://docs.google.com/spreadsheets/d/BANGTINHKHAC123/edit?usp=sharing'));
  body = build('both'); await w.click('[data-act=lkSync]'); await w.waitForSelector('#lkPend');
  const both = await w.innerText('#lkPend');
  ok('có cả tên mới lẫn _QC: hiển thị danh sách chọn cho từng vai trò', /Dùng tab “HoSoKeo_QC”/.test(both) && /Dùng tab “HoSoKeo” /.test(both) && (await w.$$('#lkPend input[type=radio]')).length === 6, both.slice(0, 200));
  await w.click('#lkPend input[data-role=HoSoKeo_QC][data-tab=HoSoKeo_QC]'); await w.click('[data-act=lkConfirmTabs]'); await done(/Đã nạp và ghi nhớ tab đã chọn/);
  const last = (await status()).last; ok('đã chọn tab _QC cho phiếu cân, tên chuẩn cho hai vai trò còn lại', last.ok && last.picks.HoSoKeo_QC === 'HoSoKeo_QC' && last.picks.HoSoRung_QC === 'HoSoRung');
  await w.click('[data-act=lkSync]'); await done(/Đã cập nhật bản tra cứu/);
  ok('đồng bộ lại cùng bảng tính: theo lựa chọn đã nhớ, không hỏi lại', !(await w.$('#lkPend')));

  // 5. đồng bộ lỗi: giữ bản gần nhất và thời điểm thành công
  const at = (await status()).active.loadedAt; body = build('missingCol'); await w.click('[data-act=lkSync]'); await done(/Chưa cập nhật bản tra cứu/);
  ok('tab đủ tên nhưng thiếu cột: báo tên tab và cột; giữ bản gần nhất cùng thời điểm thành công', /Tab “ToaDoRung”.*DienTich_m2/.test(await txt()) && (await status()).active.loadedAt === at);
  body = build();

  // 6. file mẫu tra cứu 3 tab chuẩn
  fs.mkdirSync(out, {recursive: true}); await w.click('[data-act=lkTemplate]');
  let f = null; for (let i = 0; i < 50 && !f; i++) { f = fs.readdirSync(out).find(x => x === 'HAK_Mau_TraCuu.xlsx'); if (!f) await w.waitForTimeout(150); }
  ok('tải file mẫu tra cứu', !!f);
  if (f) { const wb = XLSX.read(fs.readFileSync(path.join(out, f)), {type: 'buffer'}); ok('file mẫu có trang HUONG_DAN và đúng ba tab chuẩn HoSoKeo, HoSoRung, ToaDoRung', JSON.stringify(wb.SheetNames) === JSON.stringify(['HUONG_DAN', 'HoSoKeo', 'HoSoRung', 'ToaDoRung'])); }
  ok('không có lỗi JavaScript', errs.length === 0, errs.join('|'));
  await app.close(); srv.close(); console.log(fail ? 'CÓ ' + fail + ' LỖI' : 'TẤT CẢ ĐẠT'); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
