'use strict';
/* Bản 3.0 — phiếu cân thuộc hợp đồng vận chuyển (Electron thật, SQLite thật):
 *  - trang chi tiết hợp đồng có “Tra cứu HoSoKeo”, “Nạp Excel”, “Thêm phiếu cân”; bảng chỉ có phiếu của hợp đồng;
 *  - nạp Excel khi đang mở hợp đồng A: phiếu vào A; BKS chuẩn hóa (“92c 123.45” = “92C-12345”); xe chỉ tự chọn khi khớp duy nhất xe của A,
 *    BKS của xe thuộc (duy nhất) hợp đồng B thì phiếu đi theo xe vào B và báo rõ; BKS không khớp đâu thì vào A, chưa chọn xe, nêu lý do;
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
  const xA = f.dx.find(r => r.chuXe === 'LÊ VĂN AN').id;
  ok('trang danh sách: phiếu cân chỉ nêu số, mở hợp đồng để làm việc', !!(await w.$('#pcDs')) && !(await w.$('#pcHd')));
  await w.click('#dsHdVcTbl tr[data-hd="' + hA + '"] button'); await w.waitForSelector('#pcHd');
  ok('trang chi tiết hợp đồng: có “Nạp Excel”, “Thêm phiếu cân” (và “Tra cứu HoSoKeo” ở bản desktop)', await w.isVisible('#pcNapExcel') && await w.isVisible('#pcThem') && await w.isVisible('#pcTraCuu'));

  // 1. nạp Excel khi mở hợp đồng A
  await w.setInputFiles('input[data-file=pc]', file('pc1.xlsx', [['P1', '05/10/2026', '92c 123.45', '12500'], ['P2', '06/10/2026', '92C-67890', '9000'], ['P3', '07/10/2026', '43A-99999', '8000']]));
  await w.waitForSelector('#pcGanBao'); const bao = await w.innerText('#pcGanBao');
  ok('bảng kết quả nạp: rừng, hợp đồng, số phiếu, ngày, KL, BKS nguồn, xe được chọn', /R-A/.test(bao) && /P1/.test(bao) && /05\/10\/2026/.test(bao) && /12,5/.test(bao) && /92C 123\.45/i.test(bao) && /92C-12345/.test(bao), bao);
  ok('BKS của xe thuộc hợp đồng khác: phiếu đi theo xe sang hợp đồng đó, báo rõ', /P2[\s\S]*theo xe[\s\S]*92C-67890[\s\S]*thuộc hợp đồng/.test(bao), bao);
  ok('BKS không có ở đâu: không tự chọn, nêu lý do', /43A-99999 không có trong hợp đồng đang mở/.test(bao), bao);
  await luu(); f = await lotDb();
  const p = s => f.pc.find(x => x.soPhieu === s);
  const xB0 = f.dx.find(r => r.chuXe === 'TRẦN BÌNH').id;
  ok('lưu: P1, P3 vào hợp đồng A (P1 có xe 92C-12345, P3 chưa có xe); P2 theo xe vào B', p('P1') && p('P1').hdvcId === hA && p('P1').xeRowId === xA && p('P3').hdvcId === hA && !p('P3').xeRowId && p('P2').hdvcId === hB && p('P2').xeRowId === xB0, JSON.stringify(f.pc.map(x => [x.soPhieu, x.hdvcId, x.xeRowId])));
  ok('BKS gốc của phiếu giữ nguyên như file', /^92C 123\.45$/i.test(p('P1').bienSo), p('P1').bienSo);
  ok('vẫn ở trang chi tiết hợp đồng A sau khi lưu', !!(await w.$('#hdDau')) && !!(await w.$('#pcHd')));

  // 2. chọn xe cho phiếu: lưu ID dòng, giữ BKS gốc
  const ix3 = f.pc.findIndex(x => x.soPhieu === 'P3');
  await w.selectOption('select[data-pcxe="' + ix3 + '"]', xA); await w.waitForTimeout(400); await luu(); f = await lotDb();
  ok('chọn xe cho P3: lưu ID dòng xe, BKS trên phiếu giữ “43A-99999”', p('P3').xeRowId === xA && p('P3').bienSo === '43A-99999' && p('P3').hdvcId === hA, JSON.stringify(p('P3')));

  // 3. chuyển P1 sang hợp đồng B: BKS 92C-12345 không có xe trong B → chưa chọn xe; ghi một lần
  const ix1 = f.pc.findIndex(x => x.soPhieu === 'P1');
  await w.selectOption('select[data-pchd="' + ix1 + '"]', hB); await w.waitForTimeout(400); await luu(); f = await lotDb();
  ok('chuyển P1 sang hợp đồng B: kiểm lại xe trong B (không có 92C-12345 → bỏ xe cũ), ghi một lần', p('P1').hdvcId === hB && !p('P1').xeRowId, JSON.stringify(p('P1')));
  ok('bảng của hợp đồng A không còn P1, P2', !/\bP[12]\b/.test(await w.innerText('#stTbl_pc')));

  // 4. nạp lại với BKS đổi: không thêm phiếu mới, mỗi phiếu một lần
  await w.setInputFiles('input[data-file=pc]', file('pc2.xlsx', [['P1', '05/10/2026', '92C-12345', '12500']])); await w.waitForTimeout(600); await luu(); f = await lotDb();
  ok('nạp lại P1 với BKS viết khác: không thêm phiếu mới (vẫn 3 phiếu), P1 giữ hợp đồng B', f.pc.length === 3 && f.pc.filter(x => x.soPhieu === 'P1').length === 1 && p('P1').hdvcId === hB, JSON.stringify(f.pc.map(x => [x.soPhieu, x.bienSo, x.hdvcId])));

  ok('không có lỗi script trên màn hình', errs.length === 0, errs.join(' | '));
  await app.close(); console.log(fail ? 'CÓ ' + fail + ' LỖI' : 'TẤT CẢ ĐẠT'); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
