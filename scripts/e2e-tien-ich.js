'use strict';
/* TIỆN ÍCH BẢN 2.3 (Electron thật, SQLite thật, dữ liệu giả lập ở thư mục tạm): hướng dẫn lần đầu, dán từ Excel, mục lục gói in, gói Chỉ xem, in trong app (ghi PDF khi kiểm thử),
 * phụ lục in lại / ký lại. Chạy: xvfb-run -a node scripts/e2e-tien-ich.js */
const {_electron: electron} = require('playwright-core');
const path = require('path'), fs = require('fs'), os = require('os');
const JSZip = require('jszip');
const root = path.join(__dirname, '..');
const M = require(path.join(root, 'src', 'model.js')), Q = require(path.join(root, 'src', 'quytrinh.js'));
const src = fs.readFileSync(path.join(__dirname, 'e2e-inan2.js'), 'utf8');
const {lot, seed, EXP1} = new Function(src.slice(src.indexOf('const nv ='), src.indexOf('const plain =')) + '; return {lot, seed, EXP1};')();
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hakqn-ti-')), out = path.join(dir, 'out'), inDir = path.join(dir, 'in');
let fail = 0; const ok = (name, cond, extra) => { console.log((cond ? 'ĐẠT  ' : 'LỖI  ') + name + (!cond && extra ? ' — ' + extra : '')); if (!cond) fail++; };
const plain = xml => (xml.match(/<w:t[^>]*>([^<]*)<\/w:t>/g) || []).map(a => a.replace(/<[^>]+>/g, '')).join('|');
const launch = async () => { const app = await electron.launch({executablePath: require('electron'), args: [root, '--no-sandbox', '--proxy-server=http://127.0.0.1:9'], env: {...process.env, HAKQN_CLOSE: 'discard', HAKQN_DB: path.join(dir, 'd.sqlite'), HAKQN_USERDATA: path.join(dir, 'ud'), HAKQN_DOWNLOAD_DIR: out, HAKQN_PRINT_DIR: inDir}});
  const w = await app.firstWindow(); w.errs = []; w.on('pageerror', e => w.errs.push(e.message)); w.on('dialog', d => d.accept()); await w.waitForSelector('#side'); return {app, w}; };

(async () => {
  fs.mkdirSync(out, {recursive: true});
  let {app, w} = await launch();
  const lo = async () => (await w.evaluate(() => window.hak.loadSync().db)).rs.own1.forests.fa;
  const cho = async re => { let f = null; for (let i = 0; i < 150 && !f; i++) { f = fs.readdirSync(out).find(x => re.test(x)); if (!f) await w.waitForTimeout(150); } return f ? path.join(out, f) : null; };
  const don = () => { for (const f of fs.readdirSync(out)) fs.unlinkSync(path.join(out, f)); };
  const open = async ftab => { await w.click('[data-open=own1]'); await w.click('[data-tab=rung]'); await w.click('[data-forest=fa]'); await w.click('[data-ftab=' + ftab + ']'); await w.waitForTimeout(400); };

  // ---------- 6. hướng dẫn lần đầu ----------
  await w.waitForSelector('#huongDan');
  ok('máy chưa có dữ liệu: màn đầu hiện Hướng dẫn bắt đầu, 0/6 bước, bước làm tiếp là “Tạo chủ rừng” có nút + Chủ rừng mới', (await w.getAttribute('#huongDan', 'data-xong')) === '0' && (await w.getAttribute('#huongDan', 'data-tiep')) === 'chu' && !!(await w.$('#huongDan [data-act=newRs]')) && (await w.$$('#huongDan li')).length === 6);
  await w.click('#huongDan [data-act=hdAn]'); await w.waitForTimeout(200);
  ok('Ẩn hướng dẫn: bảng biến mất', !(await w.$('#huongDan')));
  await w.reload(); await w.waitForSelector('#side'); await w.waitForTimeout(300);
  ok('mở lại trang: vẫn ẩn (ghi nhớ lựa chọn)', !(await w.$('#huongDan')));
  await w.click('#navSet'); await w.click('#setTab_sethelp'); await w.click('#hdHienBtn'); await w.waitForSelector('#huongDan');
  ok('⋯ Thêm → Hướng dẫn bắt đầu: hiện lại', !!(await w.$('#huongDan')));
  const A = M.ensureForest(lot('fa', 'R-A', {exp: EXP1, pc: [], kl: null}));
  await w.evaluate(d => window.hak.save(d), seed([A])); await w.reload(); await w.waitForSelector('#huongDan');
  ok('đã có chủ rừng, lô, nhân công, xe: 4/6 bước xong, bước làm tiếp là “Nhập phiếu cân”', (await w.getAttribute('#huongDan', 'data-xong')) === '4' && (await w.getAttribute('#huongDan', 'data-tiep')) === 'pc' && (await w.$$('#huongDan li[data-xong="1"]')).length === 4);
  await w.click('#huongDan [data-act=hdDi]'); await w.waitForSelector('[data-act=danMo][data-kind=pc]');
  ok('nút “Mở nơi làm bước này” đưa tới đúng lô, đúng tab có khung nạp phiếu cân', !!(await w.$('[data-act=danMo][data-kind=pc]')));

  // ---------- 1. dán từ Excel ----------
  const truoc = JSON.stringify(await lo());
  await w.click('[data-act=danMo][data-kind=pc]'); await w.waitForSelector('#danText');
  await w.fill('#danText', 'P1\t05/10/2026\t92C-12345\t12500');
  ok('dán thiếu dòng tiêu đề: báo thiếu cột, nêu tên cột', /thiếu dòng tiêu đề hoặc thiếu cột/.test(await w.innerText('#danMsg')) && /Số phiếu/.test(await w.innerText('#danMsg')));
  await w.click('[data-act=danNap]'); await w.waitForTimeout(400);
  ok('bấm Nạp khi vùng dán sai: không nạp, dữ liệu lô giữ nguyên', JSON.stringify(await lo()) === truoc && (await w.evaluate(() => window.__stDirty().length)) === 0);
  await w.fill('#danText', 'Số phiếu\tNgày cân 1\tBiển số 1\tKhối lượng (tấn)\tGhi chú\r\nPA1\t05/10/2026\t92C-12345\t12,5\t"ghi chú\ncó xuống dòng"\r\nPA2\t06/10/2026\t92C-67890\t9,25\t\r\nPA3\t07/10/2026\t92C-12345\t8\t\r\n');
  ok('dán đúng (có tiêu đề, số kiểu Việt Nam 12,5): đọc được 3 dòng dữ liệu', /Đọc được 3 dòng dữ liệu, 5 cột/.test(await w.innerText('#danMsg')), await w.innerText('#danMsg'));
  await w.click('[data-act=danNap]'); await w.waitForTimeout(1200);
  await w.click('button[data-act=stSave]').catch(() => {}); await w.waitForTimeout(900);
  let F = await lo();
  ok('nạp dữ liệu đã dán và lưu: lô có 3 phiếu cân PA1, PA2, PA3; khối lượng 12,5 + 9,25 + 8 = 29,75 tấn; ngày và biển số đúng', F.pc.length === 3 && F.pc.map(p => p.soPhieu).join() === 'PA1,PA2,PA3' && Math.abs(F.pc.reduce((a, p) => a + p.kl, 0) - 29.75) < 1e-9 && F.pc[0].ngay === '05/10/2026' && F.pc[1].bienSo === '92C-67890', JSON.stringify(F.pc.map(p => [p.soPhieu, p.ngay, p.bienSo, p.kl])));
  ok('nguồn dữ liệu ghi là “Dán từ Excel”', /Dán từ Excel/.test(F.pcFile || ''), F.pcFile);
  await w.reload(); await w.waitForSelector('#side');
  ok('sau khi có phiếu cân: hướng dẫn còn một bước (xuất hồ sơ)', (await w.getAttribute('#huongDan', 'data-xong')) === '5' && (await w.getAttribute('#huongDan', 'data-tiep')) === 'xuat');

  // ---------- 2. mục lục trong gói in ----------
  await open('xuat'); don(); await w.click('[data-xtab=all]').catch(() => {}); await w.click('button[data-act=dl][data-kind=all]');
  let zf = await cho(/\.zip$/), z = await JSZip.loadAsync(fs.readFileSync(zf)), names = Object.keys(z.files).filter(n => !z.files[n].dir);
  const ml = plain(await (await JSZip.loadAsync(await z.file('00_Muc_luc.docx').async('nodebuffer'))).file('word/document.xml').async('string'));
  const khac = names.filter(n => n !== '00_Muc_luc.docx');
  ok('gói “Toàn bộ hồ sơ” có tờ 00_Muc_luc.docx đứng đầu', names.includes('00_Muc_luc.docx') && names.slice().sort()[0] === '00_Muc_luc.docx', names.join(', '));
  ok('mục lục liệt kê ĐỦ mọi file trong gói theo thứ tự, có mã mẫu, tên biểu mẫu và số bản', /MỤC LỤC HỒ SƠ/.test(ml) && khac.every(n => ml.includes(n)) && ml.includes(khac.length + ' biểu mẫu') && /BM-01\|/.test(ml) && /Hợp đồng/.test(ml) && /Số bản/.test(ml), ml.slice(0, 400));

  // ---------- 4. gói Chỉ xem ----------
  don(); await w.click('[data-act=chiXemTai]'); zf = await cho(/_CHI_XEM\.zip$/); z = await JSZip.loadAsync(fs.readFileSync(zf)); names = Object.keys(z.files).filter(n => !z.files[n].dir);
  const html = await z.file('XEM_HO_SO.html').async('string');
  ok('gói Chỉ xem: có XEM_HO_SO.html, thư mục Bieu_mau với các biểu mẫu và mục lục', names.includes('XEM_HO_SO.html') && names.includes('Bieu_mau/00_Muc_luc.docx') && names.filter(n => /^Bieu_mau\/\d\d_/.test(n)).length === khac.length + 1, names.join(', '));
  ok('trang Chỉ xem: ghi rõ “BẢN CHỈ XEM”, mã lô, chủ rừng, 3 phiếu cân, tổng 29,75 tấn; không có script, không tải tài nguyên ngoài', /BẢN CHỈ XEM/.test(html) && html.includes('R-A') && html.includes('NGUYỄN VĂN MỘT') && html.includes('PA1') && html.includes('PA3') && html.includes('29,75') && !/<script/i.test(html) && !/https?:\/\//.test(html));
  ok('gói Chỉ xem không phải gói sao lưu lô: không có file .json nào để nhập lại', !names.some(n => /\.json$/.test(n)));
  ok('tạo gói Chỉ xem không ghi gì vào lô', JSON.stringify(await lo()) === JSON.stringify(F));

  // ---------- 5. in trong app ----------
  await w.click('[data-act=inTomTat]'); let pdf = null; for (let i = 0; i < 100 && !pdf; i++) { pdf = fs.existsSync(inDir) && fs.readdirSync(inDir).find(x => /^Tom_tat_ho_so_.*\.pdf$/.test(x)); if (!pdf) await w.waitForTimeout(150); }
  ok('In tóm tắt hồ sơ: tiến trình chính dựng bản in (kiểm thử: ghi PDF) — file PDF hợp lệ, có nội dung', !!pdf && fs.readFileSync(path.join(inDir, pdf)).slice(0, 5).toString() === '%PDF-' && fs.statSync(path.join(inDir, pdf)).size > 5000, String(pdf));
  await w.click('header [data-act=rpOpen]').catch(() => w.click('[data-act=rpOpen]')); await w.waitForSelector('#inBaoCaoBtn'); await w.click('#inBaoCaoBtn');
  let pdf2 = null; for (let i = 0; i < 100 && !pdf2; i++) { pdf2 = fs.readdirSync(inDir).find(x => /^Bao_cao_.*\.pdf$/.test(x)); if (!pdf2) await w.waitForTimeout(150); }
  ok('In báo cáo: có file PDF của báo cáo đang xem', !!pdf2 && fs.readFileSync(path.join(inDir, pdf2)).slice(0, 5).toString() === '%PDF-', String(pdf2));
  { const tam = path.join(dir, 'ud', 'in-tam'), con = () => (fs.existsSync(tam) ? fs.readdirSync(tam) : []); for (let i = 0; i < 40 && con().length; i++) await w.waitForTimeout(150);   // lệnh in trả kết quả sau khi dọn; chờ tối đa 6 giây
    ok('file tạm của bản in đã được dọn sau khi in xong', con().length === 0, con().join(', ')); }
  await w.click('[data-act=rpClose]').catch(() => {});

  // ---------- 3. phụ lục in lại, ký lại ----------
  await open('xuat');
  ok('chưa in lại, ký lại mẫu nào: nút Phụ lục bị vô hiệu', await w.isDisabled('[data-act=phuLucKyLai]'));
  const db = await w.evaluate(() => window.hak.loadSync().db), f = db.rs.own1.forests.fa, st = Q.stateOf(f);
  Q.mark(st, '01', 's1', '2026-11-01T02:00:00.000Z'); Q.ky(st, '01', 's1', '2026-11-02T02:00:00.000Z'); Q.mark(st, '01', 's2', '2026-11-05T02:00:00.000Z'); Q.ky(st, '01', 's2', '2026-11-06T02:00:00.000Z');
  await w.evaluate(d => window.hak.save(d), db); await w.reload(); await w.waitForSelector('#side'); await open('xuat');
  ok('sau khi in và ký lại BM-01: nút Phụ lục bật, ghi “1 mẫu”', !(await w.isDisabled('[data-act=phuLucKyLai]')) && /1 mẫu/.test(await w.innerText('[data-act=phuLucKyLai]')));
  don(); await w.click('[data-act=phuLucKyLai]'); const pl = await cho(/^Phu_luc_in_lai_ky_lai_.*\.docx$/);
  const plt = pl ? plain(await (await JSZip.loadAsync(fs.readFileSync(pl))).file('word/document.xml').async('string')) : '';
  ok('phụ lục in lại, ký lại: nêu BM-01, hai lần in, hai lần ký, lý do “in lại: dữ liệu đã đổi” và “ký lại lần 2”', /PHỤ LỤC THEO DÕI IN LẠI, KÝ LẠI/.test(plt) && /BM-01/.test(plt) && /in lại: dữ liệu đã đổi/.test(plt) && /ký lại lần 2/.test(plt) && /in lần đầu/.test(plt), plt.slice(0, 500));
  ok('không có lỗi JavaScript', w.errs.length === 0, w.errs.join('|'));
  await app.close(); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
