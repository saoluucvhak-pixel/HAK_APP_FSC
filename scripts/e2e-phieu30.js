'use strict';
/* Bản 3.0 — phiếu cân thuộc hợp đồng vận chuyển (Electron thật, SQLite thật):
 *  - trang chi tiết hợp đồng có “Tra cứu HoSoKeo”, “Nạp Excel”, “Thêm phiếu cân”; bảng chỉ có phiếu của hợp đồng;
 *  - nạp Excel khi đang mở hợp đồng A: phiếu vào A; BKS chuẩn hóa (“92c 123.45” = “92C-12345”); xe chỉ tự chọn khi khớp duy nhất xe của A,
 *    BKS chỉ có ở hợp đồng B: “Xe này thuộc hợp đồng số 02”, phiếu ở lại xem trước (chưa lưu được) tới khi người dùng chọn xe, thêm xe vào A hoặc chủ động đổi đích sang B;
 *    bảng kết quả nạp có rừng, hợp đồng, số phiếu, ngày, KL, BKS nguồn, xe được chọn;
 *  - đổi xe của phiếu: lưu ID dòng xe, giữ BKS gốc; chuyển phiếu sang hợp đồng B: chọn lại xe trong B, lưu một lần;
 *  - nạp lại file có phiếu đổi BKS: không thêm phiếu mới; mỗi phiếu tính một lần.
 * Chạy: xvfb-run -a node scripts/e2e-phieu30.js */
const {_electron: electron} = require('playwright-core');
const path = require('path'), fs = require('fs'), os = require('os');
const XLSX = require('xlsx');
const src = fs.readFileSync(path.join(__dirname, 'e2e-inan2.js'), 'utf8');
const {xe, lot, seed} = new Function(src.slice(src.indexOf('const nv ='), src.indexOf('const plain =')) + '; return {xe, lot, seed};')();
const root = path.join(__dirname, '..');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hakqn-pc30-'));
let fail = 0; const ok = (name, cond, extra) => { console.log((cond ? 'ĐẠT  ' : 'LỖI  ') + name + (!cond && extra ? ' — ' + extra : '')); if (!cond) fail++; };
const HAKkhoa = v => String(v || '').toUpperCase().replace(/[\s.\-]/g, '');
const file = (ten, rows) => { const f = path.join(dir, ten), wb = XLSX.utils.book_new(), ws = XLSX.utils.aoa_to_sheet([['Số phiếu', 'Ngày cân 1', 'Biển số 1', 'KL'], ...rows]); Object.keys(ws).filter(k => /^[A-Z]+\d+$/.test(k)).forEach(k => { ws[k].t = 's'; }); XLSX.utils.book_append_sheet(wb, ws, 'PHIEU_CAN'); XLSX.writeFile(wb, f); return f; };

(async () => {
  const app = await electron.launch({executablePath: require('electron'), args: [root, '--no-sandbox'], env: {...process.env, HAKQN_CLOSE: 'discard', HAKQN_DB: path.join(dir, 'd.sqlite'), HAKQN_USERDATA: path.join(dir, 'ud'), HAKQN_DOWNLOAD_DIR: path.join(dir, 'out')}});
  const w = await app.firstWindow(); const errs = []; w.on('pageerror', e => errs.push(e.message)); w.on('dialog', d => d.accept()); await w.waitForSelector('#side');
  const A = lot('fa', 'R-A', {exp: {}, pc: [], kl: null, dx: [xe('92C-12345', '049000000077', 'LÊ VĂN AN'), xe('92C-67890', '049000000078', 'TRẦN BÌNH')]});
  A.info.vanChuyen = {mode: 'coDinh', coDinh: 50000};
  await w.evaluate(d => window.hak.save(d), seed([A])); await w.reload(); await w.waitForSelector('#side');
  const lotDb = async () => (await w.evaluate(() => window.hak.loadSync().db)).rs.own1.forests.fa;
  const luu = async () => { if (await w.$('button[data-act=stSave]')) { await w.click('button[data-act=stSave]'); await w.waitForTimeout(600); } };
  await w.click('[data-open=own1]'); await w.click('[data-tab=rung]'); await w.click('[data-forest=fa]'); await w.click('[data-ftab=dx]'); await w.waitForTimeout(200);
  let f = await lotDb(); const hA = f.dx.find(r => r.chuXe === 'LÊ VĂN AN').hdvcId, hB = f.dx.find(r => r.chuXe === 'TRẦN BÌNH').hdvcId;
  const xA = f.dx.find(r => r.chuXe === 'LÊ VĂN AN').id, xB = f.dx.find(r => r.chuXe === 'TRẦN BÌNH').id;
  { const d = await w.evaluate(() => window.hak.loadSync().db), g = d.rs.own1.forests.fa;   // số hợp đồng: A = 01, B = 02
    g.hdvc.find(h => h.id === hA).exp = {soVC: '01'}; g.hdvc.find(h => h.id === hB).exp = {soVC: '02'}; await w.evaluate(x => window.hak.save(x), d); await w.reload(); await w.waitForSelector('#side');
    await w.click('[data-open=own1]'); await w.click('[data-tab=rung]'); await w.click('[data-forest=fa]'); await w.click('[data-ftab=dx]'); await w.waitForTimeout(200); }
  ok('trang danh sách: phiếu cân chỉ nêu số, mở hợp đồng để làm việc', (!!(await w.$('#pcDs')) || !!(await w.$('#dsHdVcTbl'))) && !(await w.$('#pcHd')));
  await w.click('#dsHdVcTbl tr[data-hd="' + hA + '"]');
  await w.click('.mucNav [data-muc-lo=phieu]');
  await w.waitForSelector('#pcHd');
  ok('mục Phiếu cân có một nút chọn Excel, một nút thêm và nút tra cứu HoSoKeo', await w.locator('label:has(input[data-file=pc])').count() === 1 &&
    await w.locator('[data-act=stAdd][data-kind=pc]').count() === 1 && await w.isVisible('#pcTraCuu'));

  // 1. nạp Excel khi đang mở HĐ A (số 01): P2 có BKS chỉ ở HĐ B (số 02)
  await w.setInputFiles('input[data-file=pc]', file('pc1.xlsx', [['P1', '05/10/2026', '92c 123.45', '12500'], ['P2', '06/10/2026', '92C-67890', '9000'], ['P3', '07/10/2026', '43A-99999', '8000']]));
  await w.waitForSelector('#pcGanBao'); let bao = await w.innerText('#pcGanBao');
  ok('xem trước: tên rừng, hợp đồng đích số 01, số phiếu, ngày, KL, BKS nguồn, xe được chọn', /R-A/.test(await w.innerText('#pgRung')) && /số 01/.test(await w.innerText('#pgDich')) && /P1/.test(bao) && /05\/10\/2026/.test(bao) && /12,5/.test(bao) && /92C 123\.45/i.test(bao) && /92C-12345/.test(bao), bao);
  { const gb = await w.$('#pcGanBao'); if (gb) await gb.screenshot({path: path.join(process.env.HAKQN_ANH || dir, 'doi-chieu-bks.png')}).catch(() => {}); }   /* ảnh nghiệm thu: bản xem trước phiếu, BKS chỉ có ở hợp đồng khác */
  ok('BKS chỉ có ở HĐ B: báo “Xe này thuộc hợp đồng số 02”, phiếu vẫn ở đích A, có 3 cách xử lý', /Xe này thuộc hợp đồng số 02/.test(bao) && !!(await w.$('select[data-pgxe]')) && !!(await w.$('[data-act=pgThemXe]')) && !!(await w.$('[data-act=pgDoiHd]')) && /1 phiếu cần xử lý/.test(bao), bao);
  ok('BKS không có ở đâu: không tự chọn, nêu lý do', /43A-99999 không có trong hợp đồng đang mở/.test(bao), bao);
  await luu(); f = await lotDb();
  ok('chưa xử lý mà bấm lưu: không ghi gì, báo lỗi “Xe này thuộc hợp đồng…”, phiếu còn trong xem trước', f.pc.length === 0 && /Xe này thuộc hợp đồng/.test(await w.innerText('#main')) && !!(await w.$('#pcGanBao')), JSON.stringify(f.pc));
  await w.click('[data-act=pgDoiHd]'); await w.waitForTimeout(300);
  ok('chủ động đổi đích P2 sang HĐ 02: chọn xe 92C-67890 của HĐ 02, hết cảnh báo', /P2[^\n]*số 02/.test(await w.innerText('#pcGanTbl')) && !/cần xử lý/.test(await w.innerText('#pcGanBao')), await w.innerText('#pcGanTbl'));
  await luu(); f = await lotDb();
  const p = s => f.pc.find(x => x.soPhieu === s);
  ok('lưu: P1, P3 vào HĐ A (P1 có xe 92C-12345, P3 chưa có xe); P2 chỉ vào HĐ B sau khi người dùng chọn, xe của B', p('P1') && p('P1').hdvcId === hA && p('P1').xeRowId === xA && p('P3').hdvcId === hA && !p('P3').xeRowId && p('P2').hdvcId === hB && p('P2').xeRowId === xB, JSON.stringify(f.pc.map(x => [x.soPhieu, x.hdvcId, x.xeRowId])));
  ok('BKS gốc của phiếu giữ nguyên như file', /^92C 123\.45$/i.test(p('P1').bienSo), p('P1').bienSo);
  ok('vẫn ở trang chi tiết hợp đồng A sau khi lưu', !!(await w.$('#hdDau')) && /số 01/.test(await w.innerText('#hdDauSo')));

  // 2. bổ sung xe vào hợp đồng đích: P4 ghi BKS 92C-67890 (xe của HĐ B) nhưng thực tế xe 92C-55555 chở cho HĐ A — thêm xe vào A ngay trong xem trước
  await w.setInputFiles('input[data-file=pc]', file('pc2.xlsx', [['P4', '08/10/2026', '92C-67890', '7000']])); await w.waitForSelector('[data-act=pgThemXe]');
  await w.click('[data-act=pgThemXe]'); await w.waitForSelector('#stForm [name=bienSo]');
  await w.evaluate(() => { const f = document.getElementById('stForm'), v = {bienSo: '92C-555.55', chuXe: 'XE BỔ SUNG', ngaySinh: '01/01/1980', cccd: '049000000055', ngayCap: '01/01/2021', noiCap: 'CA', diaChi: 'Đà Nẵng', sdt: '0905123456', loaiXe: 'Xe tải'}; Object.entries(v).forEach(([k, x]) => { if (f.elements[k]) f.elements[k].value = x; }); });
  await w.click('#stForm [type=submit]'); await w.waitForTimeout(300);
  ok('xe vừa thêm gán ngay cho P4 trong xem trước (hết cảnh báo)', /92C-555\.55/.test(await w.innerText('#pcGanTbl')) && !/cần xử lý/.test(await w.innerText('#pcGanBao')), await w.innerText('#pcGanBao').catch(() => ''));
  await luu(); f = await lotDb();
  const xA2 = f.dx.find(r => /55555/.test(HAKkhoa(r.bienSo)));
  ok('lưu: xe 92C-555.55 thuộc HĐ A; P4 ở A gắn xe đó, BKS nguồn 92C-67890 giữ nguyên; HĐ B giữ xe của B', !!xA2 && xA2.hdvcId === hA && p('P4').hdvcId === hA && p('P4').xeRowId === xA2.id && p('P4').bienSo === '92C-67890' && f.dx.some(r => r.id === xB && r.hdvcId === hB), JSON.stringify([p('P4'), f.dx.map(r => [r.bienSo, r.hdvcId, r.id])]));

  // 3. chọn xe cho phiếu: lưu ID dòng, giữ BKS gốc
  const ix3 = f.pc.findIndex(x => x.soPhieu === 'P3');
  await w.click('[data-ftab=xuat]');
  ok('BM-09/10: thấy đủ 36.500 kg, 28.500 kg đủ liên kết và 8.000 kg cần ghép xe',
    /36\.500/.test(await w.innerText('#pcVCTong')) && /28\.500/.test(await w.innerText('#pcVCDu')) &&
    /8\.000/.test(await w.innerText('#pcVCThieu')) && /P3.*43A-99999.*Chưa ghép xe/.test((await w.innerText('#doiChieuPcVC tbody')).replace(/\s+/g, ' ')),
    await w.innerText('#doiChieuPcVC'));
  await w.click('#doiChieuPcVC [data-act=ktGo]');
  ok('Mở phiếu: tới đúng dòng P3 trong bảng phiếu cân',
    await w.evaluate(i => document.activeElement.matches('#stTbl_pc [data-act=stEdit][data-i="' + i + '"]'), ix3));
  if (await w.isVisible('[data-act=pcTheoHd]')) await w.click('[data-act=pcTheoHd]');
  await w.selectOption('select[data-pcxe="' + ix3 + '"]', xA); await w.waitForTimeout(400); await luu(); f = await lotDb();
  ok('chọn xe cho P3: lưu ID dòng xe, BKS trên phiếu giữ “43A-99999”', p('P3').xeRowId === xA && p('P3').xeTay === true && p('P3').bienSo === '43A-99999' && p('P3').hdvcId === hA, JSON.stringify(p('P3')));
  await w.click('[data-ftab=xuat]');
  ok('BM-09/10: sau khi ghép xe, đủ 36.500 kg; không còn phiếu cần xử lý',
    /36\.500/.test(await w.innerText('#pcVCDu')) && /^0 phiếu/.test(await w.innerText('#pcVCThieu')));
  await w.click('[data-ftab=dx]');

  // 4. chuyển P1 (đã lưu) sang HĐ B: hộp xác nhận hợp đồng cũ, mới, xe, cước; lưu ngay một giao dịch
  const P1 = JSON.parse(JSON.stringify(p('P1'))), ix1 = f.pc.findIndex(x => x.soPhieu === 'P1');
  await w.selectOption('select[data-pchd="' + ix1 + '"]', hB); await w.waitForSelector('#pcChuyenTbl');
  const hop = await w.innerText('#pcChuyenTbl');
  ok('hộp xác nhận: hợp đồng cũ số 01, mới số 02, xe cũ / xe mới, cước áp dụng', /số 01/.test(hop) && /số 02/.test(hop) && /92C-12345/.test(hop) && /50\.000 đ\/tấn/.test(hop), hop);
  await w.click('#pcChuyenOk'); await w.waitForTimeout(300);
  ok('chưa chọn xe của hợp đồng mới (BKS 92C-12345 không có trong HĐ 02): không chuyển, báo chọn xe', /Chọn một xe thuộc hợp đồng mới/.test(await w.innerText('#pcChuyenLoi')) && (await lotDb()).pc.find(x => x.soPhieu === 'P1').hdvcId === hA);
  await w.selectOption('#pcChuyenForm [name=xe]', xB); await w.click('#pcChuyenOk'); await w.waitForTimeout(700); f = await lotDb();
  ok('xác nhận: P1 sang HĐ B với xe của B, lưu ngay; định danh, BKS nguồn, khối lượng, đội phân bổ giữ nguyên', p('P1').hdvcId === hB && p('P1').xeRowId === xB && p('P1').id === P1.id && p('P1').bienSo === P1.bienSo && p('P1').kl === P1.kl && (p('P1').doiId || '') === (P1.doiId || '') && !(await w.$('#pcChuyenTbl')), JSON.stringify([P1, p('P1')]));
  ok('bảng của hợp đồng A không còn P1, P2', !/\bP[12]\b/.test(await w.innerText('#stTbl_pc')));

  // 5. nạp lại cùng phiếu với BKS đổi: nhận ra bản ghi đã có, không thêm phiếu mới
  await w.setInputFiles('input[data-file=pc]', file('pc3.xlsx', [['P1', '05/10/2026', '92C-12345', '12500']])); await w.waitForTimeout(600); await luu(); f = await lotDb();
  ok('nạp lại P1 với BKS viết khác: không thêm phiếu mới (vẫn 4 phiếu), P1 giữ HĐ B và xe đã chọn', f.pc.length === 4 && f.pc.filter(x => x.soPhieu === 'P1').length === 1 && p('P1').hdvcId === hB && p('P1').xeRowId === xB, JSON.stringify(f.pc.map(x => [x.soPhieu, x.bienSo, x.hdvcId, x.xeRowId])));

  const d = await w.evaluate(() => window.hak.loadSync().db);
  const lo = d.rs.own1.forests.fa;
  lo.pc.push({soPhieu: 'PX', ngay: '31/02/2026', bienSo: '92C-12345', kl: 5, hdvcId: hA, xeRowId: xA});
  const saved = await w.evaluate(value => window.hak.save(value), d);
  if (!saved.ok) throw new Error('Không nạp được phiếu cũ ngày sai để kiểm tra: ' + saved.error);
  await w.reload(); await w.waitForSelector('#side');
  await w.click('[data-open=own1]'); await w.click('[data-tab=rung]'); await w.click('[data-forest=fa]'); await w.click('[data-ftab=xuat]');
  const ngoai = w.locator('#doiChieuPcVC tbody tr').filter({hasText: 'PX'});
  ok('BM-09/10: 5.000 kg ngày cân sai tách khỏi khối lượng đủ liên kết và danh sách thiếu xe',
    /41\.500/.test(await w.innerText('#pcVCTong')) && /36\.500/.test(await w.innerText('#pcVCDu')) &&
    /^0 phiếu/.test(await w.innerText('#pcVCThieu')) && /5\.000/.test(await w.innerText('#pcVCNgoai')) &&
    /Ngày cân không hợp lệ/.test(await ngoai.innerText()), await w.innerText('#doiChieuPcVC'));

  ok('không có lỗi script trên màn hình', errs.length === 0, errs.join(' | '));
  await app.close(); console.log(fail ? 'CÓ ' + fail + ' LỖI' : 'TẤT CẢ ĐẠT'); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
