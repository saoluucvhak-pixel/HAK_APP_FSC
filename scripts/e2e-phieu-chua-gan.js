'use strict';
/* Phiếu #03 (ND-01, kịch bản C-02) — Electron thật, SQLite thật, biểu mẫu Word xuất thật.
 * Lô hai đội (3 người + 1 người), hai phiếu cân 10 t và 20 t CHƯA gán đội, phân bổ “theo phiếu”:
 *  - màn Phân bổ và danh sách hợp đồng nêu “30 t chưa gán đội; khi in sẽ chia theo số người” thay cho “0 t / —” im lặng;
 *  - xuất BM-08 (nút lẻ), BM-14, gói “Đợt 2”, gói Chỉ xem: hộp cảnh báo nêu 2 phiếu, 30 tấn, tên từng phiếu, phần mỗi đội sẽ in; hai nút;
 *  - “Quay lại gán phiếu”: không xuất, mở nơi gán phiếu theo đội; “Vẫn xuất, chia theo số người”: xuất đúng số như trước (22,5 / 7,5 t);
 *  - lựa chọn chỉ cho lần xuất đó: bấm xuất lần nữa thì hỏi lại; một gói chứa cả BM-08 và BM-14 chỉ hỏi MỘT lần;
 *  - gán đủ phiếu → xuất không hỏi, khối lượng đội theo phiếu (10 / 20 t); không chặn xuất ở bất kỳ bước nào.
 * Chạy: xvfb-run -a node scripts/e2e-phieu-chua-gan.js   (SHOTS=<thư mục> để lưu ảnh 1366×768 và 1920×1080) */
const {_electron: electron} = require('playwright-core');
const path = require('path'), fs = require('fs'), os = require('os');
const JSZip = require('jszip');
const src = fs.readFileSync(path.join(__dirname, 'e2e-inan2.js'), 'utf8');
const {nv, xe, lot, seed} = new Function(src.slice(src.indexOf('const nv ='), src.indexOf('const plain =')) + '; return {nv, xe, lot, seed};')();
const root = path.join(__dirname, '..');
const M = require(path.join(root, 'src', 'model.js'));
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hakqn-cg-')), out = path.join(dir, 'out'), shots = process.env.SHOTS || '';
let fail = 0; const ok = (name, cond, extra) => { console.log((cond ? 'ĐẠT  ' : 'LỖI  ') + name + (!cond && extra ? ' — ' + extra : '')); if (!cond) fail++; };
const plain = xml => (xml.match(/<w:t[^>]*>([^<]*)<\/w:t>/g) || []).map(a => a.replace(/<[^>]+>/g, '')).join('');
const P = (so, ngay, kl) => ({soPhieu: so, ngay, bienSo: '92C-12345', kl, maRung: 'R-A'});
const dsFile = () => (fs.existsSync(out) ? fs.readdirSync(out) : []).filter(f => !f.endsWith('.part'));
const don = () => { for (const f of dsFile()) fs.rmSync(path.join(out, f), {force: true}); };   // dọn thư mục tải về (thư mục tạm của bài kiểm thử) trước mỗi lần xuất để đếm file chính xác
const cho = async (w, re, lan = 60) => { for (let i = 0; i < lan && !dsFile().some(f => re.test(f)); i++) await w.waitForTimeout(150); await w.waitForTimeout(250); return dsFile().find(f => re.test(f)) || ''; };
const theoDoi = vz => { const o = {}; for (const [n, t] of Object.entries(vz)) { const m = /^(\d\d)_.*\/(Doi_\d)\.docx$/.exec(n); if (m) o[m[1] + ':' + m[2]] = t; } return o; };
async function docxVan(file) {   // văn bản của mọi .docx trong file (zip hoặc docx lẻ)
  const buf = fs.readFileSync(path.join(out, file)), z = await JSZip.loadAsync(buf), o = {};
  if (/\.docx$/i.test(file)) { o[file] = plain(await z.file('word/document.xml').async('string')); return o; }
  for (const n of Object.keys(z.files).filter(n => n.endsWith('.docx'))) o[n] = plain(await (await JSZip.loadAsync(await z.file(n).async('nodebuffer'))).file('word/document.xml').async('string'));
  return o;
}
(async () => {
  const app = await electron.launch({executablePath: require('electron'), args: [root, '--no-sandbox'], env: {...process.env, HAKQN_CLOSE: 'discard', HAKQN_DB: path.join(dir, 'd.sqlite'), HAKQN_USERDATA: path.join(dir, 'ud'), HAKQN_DOWNLOAD_DIR: out, ELECTRON_DISABLE_SECURITY_WARNINGS: '1'}});
  const w = await app.firstWindow(); const errs = [], native = []; w.on('pageerror', e => errs.push(e.message)); w.on('dialog', d => { native.push(d.message()); d.accept(); }); await w.waitForSelector('#side');
  // lô hai đội: Đội 1 = 3 người, Đội 2 = 1 người (tỷ lệ 3:1 → 30 t chia 22,5 / 7,5); hai phiếu chưa gán đội
  const A = M.ensureForest(lot('fa', 'R-A', {exp: {soKT: '015', ngayKy: '02/10/2026', soVC: '07', ntSo: '03', ntNgay: '20/12/2026', pcSo: '09', pcNgay: '20/12/2026'}, kl: null, pc: [P('P1', '05/10/2026', 10), P('P2', '06/10/2026', 20)]}));
  A.doi[0].ten = 'Đội 1'; A.doi.push({id: 'doi2', ten: 'Đội 2', hinhThuc: Object.assign({}, A.doi[0].hinhThuc), exp: {}});
  A.nc.push({...nv(4, 'Tổ trưởng', 'VÕ TỔ TRƯỞNG HAI', 'Tổ trưởng', '049085000004'), maRung: 'R-A', doiId: 'doi2'});
  A.pc.forEach(p => { p.doiId = ''; });   // ensureForest gán phiếu cho đội duy nhất khi lô còn một đội: đặt lại “chưa gán” sau khi có hai đội
  const d = seed([A]); d.rs.own1.forests.fa = M.ensureForest(d.rs.own1.forests.fa); d.rs.own1.forests.fa.phanBo = {cheDo: 'theoPhieu'};
  ok('ghi lô giả lập (hai đội, hai phiếu chưa gán)', (await w.evaluate(x => window.hak.save(x), d)).ok);
  await w.reload(); await w.waitForSelector('#side');
  const lotDb = async () => (await w.evaluate(() => window.hak.loadSync().db)).rs.own1.forests.fa;
  const f0 = await lotDb();
  ok('dữ liệu đúng kịch bản C-02: hai đội, 3 + 1 người, 2 phiếu chưa gán', f0.doi.length === 2 && f0.nc.filter(r => r.doiId === f0.doi[0].id).length === 3 && f0.nc.filter(r => r.doiId === 'doi2').length === 1 && f0.pc.every(p => !p.doiId), JSON.stringify([f0.doi.map(x => x.id), f0.pc.map(p => p.doiId)]));
  const moNc = async () => { await w.click('[data-open=own1]'); await w.click('[data-tab=rung]'); await w.click('[data-forest=fa]'); await w.click('[data-ftab=nc]'); await w.waitForSelector('#pbBox'); };
  const moXuat = async () => { await w.click('[data-ftab=xuat]'); await w.waitForTimeout(250); await w.click('[data-xtab=all]'); await w.waitForTimeout(250); };   // “Tất cả”: có nút lẻ của mọi biểu mẫu
  const anh = async ten => { if (!shots) return; fs.mkdirSync(shots, {recursive: true}); for (const [W, H] of [[1366, 768], [1920, 1080]]) { await app.evaluate(({BrowserWindow}, s) => BrowserWindow.getAllWindows()[0].setContentSize(s[0], s[1]), [W, H]); await w.waitForTimeout(350); await w.screenshot({path: path.join(shots, ten + '-' + W + 'x' + H + '.png')}); } await app.evaluate(({BrowserWindow}) => BrowserWindow.getAllWindows()[0].setContentSize(1366, 768)); };

  // ----- 1. màn Phân bổ và danh sách hợp đồng -----
  await moNc();
  const pbT = await w.innerText('#pbChuaGanXuat').catch(() => '');
  ok('màn Phân bổ: dòng giải thích “30 t (2 phiếu) chưa gán đội; khi in … chia theo số người” kèm phần từng đội', /30 t \(2 phiếu\) chưa gán đội/.test(pbT) && /chia theo số người/.test(pbT) && /Đội 1 22,5 t/.test(pbT) && /Đội 2 7,5 t/.test(pbT), pbT);
  ok('màn Phân bổ vẫn giữ dòng “Chưa phân bổ” (đối chiếu), không chặn gì', /30,000/.test(await w.innerText('#pbChua')));
  const ds = await w.innerText('#dsHdNcTbl');
  ok('danh sách hợp đồng: cột khối lượng ghi “chưa gán phiếu” thay cho “—” im lặng', (ds.match(/chưa gán phiếu/g) || []).length === 2, ds);
  await w.evaluate(() => document.getElementById('pbBox').scrollIntoView({block: 'start'})); await anh('c02-man-phan-bo');

  // ----- 2. xuất BM-08: cảnh báo lần 1, hai nút -----
  await moXuat();
  const nut08 = '[data-act=dl][data-kind=tc]';
  ok('nút BM-08 xuất được (không bị chặn)', !!(await w.$(nut08)) && !(await w.isDisabled(nut08)));
  await w.click(nut08); await w.waitForSelector('#chuaGanNoiDung');
  const nd = (await w.innerText('#chuaGanNoiDung')).replace(/\s+/g, ' '), bang = (await w.innerText('#chuaGanBang')).replace(/\s+/g, ' ');
  ok('hộp cảnh báo nêu số phiếu và tổng tấn chưa gán (2 phiếu, 30 tấn)', /2 phiếu cân, tổng 30,000 tấn, chưa gán đội/.test(nd), nd);
  ok('hộp cảnh báo nói rõ “nếu tiếp tục, khối lượng chia theo số người của đội” kèm 22,5 / 7,5 tấn', /Nếu tiếp tục, khối lượng chia theo số người của đội/.test(nd) && /Đội 1 22,500 tấn/.test(nd) && /Đội 2 7,500 tấn/.test(nd), nd);
  ok('hộp cảnh báo liệt kê tên từng phiếu (P1, P2) kèm ngày, biển số, tấn', /P1 05\/10\/2026 92C-12345 10,000 tấn/.test(bang) && /P2 06\/10\/2026 92C-12345 20,000 tấn/.test(bang), bang);
  ok('đúng hai nút: “Quay lại gán phiếu” và “Vẫn xuất, chia theo số người”; nút an toàn được chọn sẵn', (await w.innerText('#chuaGanVe')) === 'Quay lại gán phiếu' && (await w.innerText('#chuaGanXuat')) === 'Vẫn xuất, chia theo số người' && await w.evaluate(() => document.activeElement && document.activeElement.id === 'chuaGanVe'));
  ok('chưa có file nào được tải khi còn đang hỏi; không dùng hộp thoại gốc của trình duyệt', dsFile().length === 0 && native.length === 0, JSON.stringify([dsFile(), native]));
  await anh('c02-hop-canh-bao');

  // ----- 3. “Quay lại gán phiếu” -----
  await w.click('#chuaGanVe'); await w.waitForTimeout(400);
  ok('“Quay lại gán phiếu”: không xuất file, đóng hộp, mở danh sách hợp đồng nhân công có bảng chọn phiếu theo đội', dsFile().length === 0 && !(await w.isVisible('#chuaGanNoiDung')) && await w.isVisible('#pbPhieuTbl'), JSON.stringify(dsFile()));
  ok('dữ liệu lô không đổi sau khi quay lại (phiếu vẫn chưa gán)', (await lotDb()).pc.every(p => !p.doiId));

  // ----- 4. Esc = quay lại (không xuất) -----
  await moXuat(); await w.click(nut08); await w.waitForSelector('#chuaGanNoiDung'); await w.keyboard.press('Escape'); await w.waitForTimeout(300);
  ok('Esc đóng hộp, không xuất, không đổi màn', dsFile().length === 0 && !(await w.isVisible('#chuaGanNoiDung')));

  // ----- 5. “Vẫn xuất, chia theo số người”: số in KHÔNG đổi, chỉ cho lần này -----
  await w.click(nut08); await w.waitForSelector('#chuaGanNoiDung'); await w.click('#chuaGanXuat');
  const f08 = await cho(w, /_tc\.zip$/i);
  ok('“Vẫn xuất”: tải được BM-08 (lô hai đội: gói .zip mỗi đội một file)', !!f08, JSON.stringify(dsFile()));
  const z08 = f08 ? theoDoi(await docxVan(f08)) : {};
  ok('BM-08 xuất đúng như trước: Đội 1 chia 22,5 tấn, Đội 2 chia 7,5 tấn (theo số người)', /22,5/.test(z08['08:Doi_1'] || '') && /7,5/.test(z08['08:Doi_2'] || ''), JSON.stringify(Object.keys(z08)));
  don();
  await w.click(nut08); await w.waitForSelector('#chuaGanNoiDung');
  ok('lựa chọn chỉ cho lần xuất đó: bấm xuất lần nữa thì hỏi lại (chưa tải file nào)', dsFile().length === 0);
  await w.click('#chuaGanVe'); await w.waitForTimeout(300);

  // ----- 6. BM-14, gói đợt 2: một lần hỏi cho cả gói -----
  await moXuat(); native.length = 0;
  ok('có nút tải BM-14 và gói đợt 2', !!(await w.$('[data-act=dl][data-kind=nttl]')) && !!(await w.$('[data-act=dl][data-kind=cuoi]')));
  don();
  await w.click('[data-act=dl][data-kind=nttl]'); await w.waitForSelector('#chuaGanNoiDung'); await w.click('#chuaGanXuat');
  const f14 = await cho(w, /_nttl\.zip$/i);
  ok('BM-14: có cảnh báo; chọn “Vẫn xuất” thì tải được file', !!f14, JSON.stringify(dsFile()));
  const z14 = f14 ? theoDoi(await docxVan(f14)) : {};
  ok('BM-14 xuất đúng như trước: Đội 1 22,5 tấn, Đội 2 7,5 tấn', /22,5/.test(z14['14:Doi_1'] || '') && /7,5/.test(z14['14:Doi_2'] || ''), JSON.stringify(Object.keys(z14)));
  don();
  await w.click('[data-act=dl][data-kind=cuoi]'); await w.waitForSelector('#chuaGanNoiDung'); await w.click('#chuaGanXuat');
  const fc = await cho(w, /dot2.*\.zip$/i);
  ok('gói “Đợt 2” (chứa BM-08 và BM-14): hỏi đúng MỘT lần rồi tải gói, không hiện hộp lần hai', !!fc && !(await w.isVisible('#chuaGanNoiDung')), JSON.stringify(dsFile()));
  const vz = fc ? theoDoi(await docxVan(fc)) : {};
  ok('trong gói đợt 2: BM-08 và BM-14 của từng đội mang 22,5 và 7,5 tấn như bản lẻ', ['08', '14'].every(k => /22,5/.test(vz[k + ':Doi_1'] || '') && /7,5/.test(vz[k + ':Doi_2'] || '')), JSON.stringify(Object.keys(vz)));

  // ----- 7. gói Chỉ xem -----
  const cx = await w.$('[data-act=chiXem], [data-act=chiXemTai], #chiXemBtn');
  if (cx) {
    don(); await cx.click(); await w.waitForTimeout(600);
    ok('gói Chỉ xem (có BM-08, BM-14): cũng cảnh báo trước khi tải, chưa tải file nào', await w.isVisible('#chuaGanNoiDung') && dsFile().length === 0);
    await w.click('#chuaGanXuat'); const fx = await cho(w, /CHI_XEM\.zip$/i); ok('gói Chỉ xem: chọn “Vẫn xuất” thì tải được', !!fx, JSON.stringify(dsFile()));
  }

  // ----- 8. gán đủ phiếu: xuất không hỏi, khối lượng đội theo phiếu -----
  await moNc();
  const ct = await w.$$eval('#pbPhieuTbl select[data-pcdoi]', s => s.length);
  ok('bảng “Chọn phiếu theo đội” có 2 phiếu để gán', ct === 2, String(ct));
  for (const [i, id] of [[0, f0.doi[0].id], [1, 'doi2']]) { await w.selectOption('#pbPhieuTbl select[data-pcdoi="' + i + '"]', id); await w.waitForTimeout(300); if (await w.$('#loDirtyBar [data-act=stSave]')) { await w.click('#loDirtyBar [data-act=stSave]'); await w.waitForTimeout(500); } }
  const f1 = await lotDb();
  ok('gán phiếu: P1 → Đội 1, P2 → Đội 2 (lưu vào lô)', f1.pc[0].doiId === f0.doi[0].id && f1.pc[1].doiId === 'doi2', JSON.stringify(f1.pc.map(p => p.doiId)));
  ok('hết dòng cảnh báo ở màn Phân bổ; danh sách hợp đồng 10 / 20 tấn', !(await w.$('#pbChuaGanXuat')) && /(10,000 tấn|10,000 t)/.test(await w.innerText('#dsHdNcTbl')) && /(20,000 tấn|20,000 t)/.test(await w.innerText('#dsHdNcTbl')));
  await moXuat(); don();
  await w.click(nut08); const f08b = await cho(w, /_tc\.zip$/i);
  ok('gán đủ: xuất BM-08 không hỏi, tải được file ngay', !(await w.isVisible('#chuaGanNoiDung')) && !!f08b, JSON.stringify(dsFile()));
  const z08b = f08b ? theoDoi(await docxVan(f08b)) : {};
  ok('khối lượng đội theo phiếu cân đã gán: Đội 1 “Khối lượng khai thác: 10 tấn”, Đội 2 “20 tấn” (không còn chia theo số người)', /Khối lượng khai thác: 10 tấn/.test(z08b['08:Doi_1'] || '') && /Khối lượng khai thác: 20 tấn/.test(z08b['08:Doi_2'] || ''), JSON.stringify(Object.keys(z08b)));

  ok('không có lỗi script, không dùng hộp thoại gốc để cảnh báo', errs.length === 0 && native.every(m => !/chưa gán/.test(m)), errs.join(' | ') + ' ' + native.join(' | '));
  await app.close(); console.log(fail ? 'CÓ ' + fail + ' LỖI' : 'TẤT CẢ ĐẠT'); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
