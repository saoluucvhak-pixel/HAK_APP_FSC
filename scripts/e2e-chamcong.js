'use strict';
/* Giao khoán trả theo ngày công + chấm công thực tế (Electron thật): giao khoán chọn được “theo ngày công”, BM-01/BM-08/BM-20 nói đúng cách trả,
 * thẻ Chấm công (điền đủ, sửa ô, ô sai giữ nguyên, tổng tháng và cả đợt, lưu lại sau khi mở lại), BM-08 dùng công từng người,
 * hợp đồng (đợt 1) và BM-05 mẫu trống KHÔNG đổi khi chấm công, in BM-05 đã nhập. Chạy: xvfb-run -a node scripts/e2e-chamcong.js */
const {_electron: electron} = require('playwright-core');
const path = require('path'), fs = require('fs'), os = require('os');
const JSZip = require('jszip');
const src = fs.readFileSync(path.join(__dirname, 'e2e-inan2.js'), 'utf8');
const {lot, seed, PC, EXP1} = new Function(src.slice(src.indexOf('const nv ='), src.indexOf('const plain =')) + '; return {lot, seed, PC, EXP1};')();
const root = path.join(__dirname, '..');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hakqn-cc-')), out = path.join(dir, 'out');
let fail = 0; const ok = (name, cond, extra) => { console.log((cond ? 'ĐẠT  ' : 'LỖI  ') + name + (!cond && extra ? ' — ' + extra : '')); if (!cond) fail++; };
const clean = () => { fs.mkdirSync(out, {recursive: true}); for (const f of fs.readdirSync(out)) fs.unlinkSync(path.join(out, f)); };
const plain = xml => (xml.match(/<w:t[^>]*>([^<]*)<\/w:t>/g) || []).map(a => a.replace(/<[^>]+>/g, '')).join('');
const readOut = async () => { const f = fs.readdirSync(out).find(x => /\.(docx|zip)$/.test(x)); const buf = fs.readFileSync(path.join(out, f)); const one = async b => plain(await (await JSZip.loadAsync(b)).file('word/document.xml').async('string')); if (f.endsWith('.docx')) return {name: f, text: await one(buf), docs: {[f]: await one(buf)}}; const z = await JSZip.loadAsync(buf), docs = {}; for (const n of Object.keys(z.files).filter(n => n.endsWith('.docx'))) docs[n] = await one(await z.file(n).async('nodebuffer')); return {name: f, text: Object.values(docs).join(' '), docs}; };
const fmt = n => n.toLocaleString('vi-VN');
const RATE = {'Tổ trưởng': 400000, 'Công nhân khai thác': 300000, 'Công nhân cưa': 320000};
(async () => {
  const app = await electron.launch({executablePath: require('electron'), args: [root, '--no-sandbox'], env: {...process.env, HAKQN_DB: path.join(dir, 'c.sqlite'), HAKQN_USERDATA: path.join(dir, 'ud'), HAKQN_DOWNLOAD_DIR: out, ELECTRON_DISABLE_SECURITY_WARNINGS: '1'}});
  const w = await app.firstWindow(); const errs = []; w.on('pageerror', e => errs.push(e.message)); w.on('dialog', d => d.accept()); await w.waitForSelector('#side');
  const mk = extra => { const L = lot('fa', 'R-A', {exp: {...EXP1}, pc: PC, kl: 29.75}); Object.assign(L.info, {hinhThucLuong: 'ngaycong', moHinhKy: 'giaokhoan', donGiaNgay: RATE, tuNgay: '05/10/2026', denNgay: '11/10/2026', donGia: null}, extra || {}); return L; };
  const openF = async tab => { await w.reload(); await w.waitForSelector('#side'); await w.click('[data-open=own1]'); await w.click('[data-tab=rung]'); await w.click('[data-forest=fa]'); await w.click('[data-ftab=' + tab + ']'); if (tab === 'xuat') await w.click('[data-xtab=all]'); };
  const dl = async kind => { clean(); await w.$eval('button[data-act=dl][data-kind=' + kind + ']', b => b.click()); let f = null; for (let i = 0; i < 100 && !f; i++) { f = fs.readdirSync(out).find(x => /\.(docx|zip)$/.test(x)); if (!f) await w.waitForTimeout(150); } await w.waitForTimeout(300); return readOut(); };
  const setDb = async d => { await w.waitForTimeout(700); await w.evaluate(x => window.hak.save(x), d); };
  const congCells = () => w.$$eval('#ccCard tr[data-ccp]', rs => rs.map(r => ({vals: [...r.querySelectorAll('.ccIn')].map(i => i.value), m: r.querySelector('[data-ccm]').textContent.trim(), a: r.querySelector('[data-cca]').textContent.trim()})));

  await setDb(seed([mk()])); await openF('nc');
  ok('giao khoán chọn được “trả theo ngày công”; checklist không còn báo lỗi hình thức', (await w.$$eval('#luongForm [name=hinhThucLuong] option', o => o.map(x => x.value))).includes('ngaycong') && !/Giao khoán chỉ tính theo tấn hoặc ha/.test(await w.innerText('#main')) && (await w.inputValue('#luongForm [name=hinhThucLuong]')) === 'ngaycong');
  ok('có thẻ Chấm công thực tế với 3 người, 31 ô ngày tháng 10/2026, chưa có số công', !!(await w.$('#ccCard')) && (await congCells()).length === 3 && (await congCells())[0].vals.length === 31 && (await congCells()).every(r => r.a === '0') && /Chưa chấm công/.test(await w.innerText('#ccNote')));

  // ===== trước khi chấm công =====
  await openF('xuat');
  const gk0 = await dl('gk'), uq0 = await dl('uq'), tc0 = await dl('tc'), cc0 = await dl('cc');
  ok('BM-01 giao khoán trả theo ngày công: có mục trả theo ngày công, đơn giá đồng/công, dự tính 6 công; không còn câu “sản lượng chia đều”', /Hình thức trả theo ngày công/.test(gk0.text) && /đồng\/công/.test(gk0.text) && /Dự tính 6 công/.test(gk0.text) && !/Sản lượng khai thác được chia đều/.test(gk0.text) && /số công thực tế ghi trong Bảng chấm công/.test(gk0.text), gk0.text.slice(gk0.text.indexOf('Điều 2'), gk0.text.indexOf('Điều 2') + 500));
  ok('BM-20 Giấy ủy quyền nói chi trả theo số công thực tế', /số công thực tế, đơn giá công theo vai trò/.test(uq0.text));
  const tot0 = 6 * 400000 + 6 * 300000 + 6 * 320000;
  ok('BM-08 chưa chấm công: mọi người 6 công (theo thời gian khai thác, trừ Chủ nhật), tiền = 6 × đơn giá, tổng ' + fmt(tot0), [6 * 400000, 6 * 300000, 6 * 320000, tot0].every(v => tc0.text.includes(fmt(v))), tc0.text.slice(0, 700));
  ok('BM-08 giao khoán trả theo ngày công: có đoạn Tổ trưởng nhận thay cả tổ và chi trả từng người', /Hình thức giao khoán, trả theo ngày công/.test(tc0.text) && /nhận thay cho cả tổ tổng số tiền/.test(tc0.text) && tc0.text.includes(fmt(tot0)));

  // ===== chấm công =====
  await openF('nc');
  await w.$eval('[data-act=ccFill]', b => b.click()); await w.waitForTimeout(400);
  let cells = await congCells();
  ok('“Điền đủ công”: mỗi người 6 công (5 đến 10/10), Chủ nhật 11/10 để trống; tổng tháng và cả đợt = 6', cells.every(r => r.vals.filter(v => v === '1').length === 6 && r.vals[10] === '' && r.vals[4] === '1' && r.vals[9] === '1' && r.m === '6' && r.a === '6'), JSON.stringify(cells[0]));
  ok('đã chấm công: ghi chú đổi sang “Đã có số công chấm tay”', /Đã có số công chấm tay/.test(await w.innerText('#ccNote')));
  // sửa ô: TT ngày 5 = 0,5; công nhân ngày 6 = 0; cưa ngày 7 = 1,5
  const setCell = async (pk, d, v) => { await w.fill('#ccCard tr[data-ccp="' + pk + '"] input[data-cc="' + d + '"]', v); await w.press('#ccCard tr[data-ccp="' + pk + '"] input[data-cc="' + d + '"]', 'Tab'); await w.waitForTimeout(150); };
  await setCell('049085000001', 5, '0,5'); await setCell('049085000002', 6, '0'); await setCell('049085000003', 7, '1,5');
  cells = await congCells();
  ok('sửa ô: TT 5,5 công; công nhân 5 công (ô 0 giữ là 0); thợ cưa 6,5 công; tổng tháng và cả đợt cập nhật ngay không cần tải lại', cells[0].m === '5,5' && cells[0].a === '5,5' && cells[1].m === '5' && cells[1].vals[5] === '0' && cells[2].m === '6,5', JSON.stringify(cells.map(r => [r.m, r.a])));
  await setCell('049085000001', 8, 'abc');
  cells = await congCells();
  ok('ô nhập sai (“abc”): giữ nguyên giá trị cũ, báo lỗi, không đổi tổng', cells[0].vals[7] === '1' && cells[0].m === '5,5' && /từ 0 đến 3/.test(await w.innerText('#ccNote')), JSON.stringify(cells[0]));
  await setCell('049085000001', 9, '4'); cells = await congCells();
  ok('số công quá 3 trong một ngày bị từ chối', cells[0].vals[8] === '1' && cells[0].m === '5,5');
  await w.waitForTimeout(800);

  // ===== sau khi chấm công =====
  await openF('nc');
  cells = await congCells(); ok('mở lại phần mềm: số công đã chấm vẫn còn (lưu cùng dữ liệu rừng)', cells[0].m === '5,5' && cells[1].m === '5' && cells[2].m === '6,5');
  await openF('xuat');
  const tc1 = await dl('tc'), gk1 = await dl('gk'), uq1 = await dl('uq'), cc1 = await dl('cc');
  const t1 = Math.round(5.5 * 400000), t2 = 5 * 300000, t3 = Math.round(6.5 * 320000), tot1 = t1 + t2 + t3;
  ok('BM-08 sau khi chấm công: tiền theo công từng người (5,5 / 5 / 6,5 công), tổng ' + fmt(tot1), [t1, t2, t3, tot1].every(v => tc1.text.includes(fmt(v))) && /5,5/.test(tc1.text) && /6,5/.test(tc1.text), tc1.text.slice(0, 700));
  ok('BẤT BIẾN: hợp đồng BM-01 và BM-20 (đợt 1) giống hệt trước và sau khi chấm công', gk1.text === gk0.text && uq1.text === uq0.text);
  ok('BẤT BIẾN: BM-05 trong gói hồ sơ vẫn là mẫu trống để chấm tay (không in số công đã nhập)', cc1.text === cc0.text && !/5,5/.test(cc1.text));
  await openF('nc');
  clean(); await w.$eval('[data-act=ccPrint]', b => b.click()); let f = null; for (let i = 0; i < 100 && !f; i++) { f = fs.readdirSync(out).find(x => /\.docx$/.test(x)); if (!f) await w.waitForTimeout(150); } await w.waitForTimeout(300);
  const pr = await readOut();
  ok('In bảng chấm công đã nhập: BM-05 tháng 10/2026 có tên, số công 0,5 và 1,5, tổng tháng 5,5 / 5 / 6,5', /Tháng 10\/2026/.test(pr.text) && /TRẦN TỔ TRƯỞNG/.test(pr.text) && /0,5/.test(pr.text) && /1,5/.test(pr.text) && /5,5/.test(pr.text) && /6,5/.test(pr.text), pr.text.slice(0, 500));

  // ===== nền / in đè của BM-08 =====
  await openF('xuat');
  clean(); await w.$eval('#d2Table tr[data-d2="08"] [data-act=d2dl][data-mode=nen]', b => b.click()); f = null; for (let i = 0; i < 100 && !f; i++) { f = fs.readdirSync(out).find(x => /\.docx$/.test(x)); if (!f) await w.waitForTimeout(150); } await w.waitForTimeout(300);
  const nen = await readOut();
  ok('BM-08 mẫu nền (giao khoán trả theo ngày công): có đoạn Tổ trưởng nhận thay cả tổ nhưng KHÔNG in số công, số tiền (chỉ điền ở bản in đè)', /Hình thức giao khoán, trả theo ngày công/.test(nen.text) && !nen.text.includes(fmt(tot1)) && !nen.text.includes(fmt(t1)), nen.text.slice(0, 600));

  // ===== trực tiếp dùng chung số công =====
  const D = mk({moHinhKy: 'tructiep'}); D.cc = JSON.parse(JSON.stringify((await w.evaluate(() => window.hak.loadSync().db)).rs.own1.forests.fa.cc));
  await setDb(seed([D])); await openF('xuat');
  const tcD = await dl('tc');
  ok('ký trực tiếp theo ngày công dùng cùng số công chấm tay; không có đoạn giao khoán', [t1, t2, t3, tot1].every(v => tcD.text.includes(fmt(v))) && !/Hình thức giao khoán, trả theo ngày công/.test(tcD.text));
  ok('không có lỗi JavaScript', errs.length === 0, errs.join('|'));
  await app.close(); console.log(fail ? 'CÓ ' + fail + ' LỖI' : 'TẤT CẢ ĐẠT'); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
