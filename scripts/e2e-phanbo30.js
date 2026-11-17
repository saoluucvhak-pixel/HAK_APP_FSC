'use strict';
/* Bản 3.0 — phân bổ khối lượng nhân công (Electron thật, SQLite thật):
 *  - một đội nhận toàn bộ; hai đội: “Chọn phiếu theo đội” (60/40) hoặc “Chia đều” (tổng lẻ 1 kg: kg lẻ cho đội đứng trước);
 *  - xem trước tổng, phần mỗi đội, phần chưa phân bổ; “Lưu phân bổ” mới áp dụng; danh sách hợp đồng dùng cùng kết quả;
 *  - lô đã chốt: chỉ xem kết quả lúc chốt.
 * Chạy: xvfb-run -a node scripts/e2e-phanbo30.js */
const {_electron: electron} = require('playwright-core');
const path = require('path'), fs = require('fs'), os = require('os');
const src = fs.readFileSync(path.join(__dirname, 'e2e-inan2.js'), 'utf8');
const {xe, lot, seed} = new Function(src.slice(src.indexOf('const nv ='), src.indexOf('const plain =')) + '; return {xe, lot, seed};')();
const root = path.join(__dirname, '..');
const V = require(path.join(root, 'src', 'vongdoi.js')), M = require(path.join(root, 'src', 'model.js'));
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hakqn-pb30-'));
let fail = 0; const ok = (name, cond, extra) => { console.log((cond ? 'ĐẠT  ' : 'LỖI  ') + name + (!cond && extra ? ' — ' + extra : '')); if (!cond) fail++; };
const P = (so, ngay, kl) => ({soPhieu: so, ngay, bienSo: '92C-12345', kl, maRung: 'R-A'});

(async () => {
  const app = await electron.launch({executablePath: require('electron'), args: [root, '--no-sandbox'], env: {...process.env, HAKQN_CLOSE: 'discard', HAKQN_DB: path.join(dir, 'd.sqlite'), HAKQN_USERDATA: path.join(dir, 'ud'), HAKQN_DOWNLOAD_DIR: path.join(dir, 'out')}});
  const w = await app.firstWindow(); const errs = []; w.on('pageerror', e => errs.push(e.message)); w.on('dialog', d => d.accept()); await w.waitForSelector('#side');
  const A = lot('fa', 'R-A', {exp: {}, kl: null, dx: [xe('92C-12345', '049000000077', 'LÊ VĂN AN')], pc: [P('P1', '05/10/2026', 60), P('P2', '06/10/2026', 40.001)]});
  const B = M.ensureForest(lot('fb', 'R-B', {exp: {}, kl: null, dx: [xe('92C-12345', '049000000077', 'LÊ VĂN AN')], pc: [{...P('Q1', '05/10/2026', 30.001), maRung: 'R-B'}]}));
  B.nc = B.nc.map(r => ({...r, maRung: 'R-B'})); B.doi.push({id: 'doiB2', ten: 'Đội B2', hinhThuc: Object.assign({}, B.doi[0].hinhThuc), exp: {}}); B.doi[0].ten = 'Đội B1'; B.phanBo = {cheDo: 'chiaDeu'};
  V.chot(B, 'Kế toán', '2026-11-01T00:00:00.000Z', []);
  await w.evaluate(d => window.hak.save(d), seed([A, B])); await w.reload(); await w.waitForSelector('#side');
  const lotDb = async id => (await w.evaluate(() => window.hak.loadSync().db)).rs.own1.forests[id];
  const pb = () => w.$$eval('#pbTbl tbody tr', t => t.map(r => r.innerText.replace(/\s+/g, ' ').trim()));
  const moRung = async id => { await w.click('[data-open=own1]'); await w.click('[data-tab=rung]'); await w.click('[data-forest=' + id + ']'); await w.click('[data-ftab=nc]'); await w.waitForTimeout(200); };
  await moRung('fa');

  // 1. một đội: nhận toàn bộ
  ok('một đội: “Một đội nhận toàn bộ” 100,001 tấn', /Một đội nhận toàn bộ/.test(await w.innerText('#pbBox')) && /100,001/.test((await pb()).join('|')), (await pb()).join('|'));
  // 2. thêm đội thứ hai: chọn phiếu theo đội
  await w.fill('#doiMoiTen', 'Đội Hai'); await w.click('[data-act=themDoi]'); await w.waitForTimeout(300);
  if (await w.$('#loDirtyBar [data-act=stSave]')) { await w.click('#loDirtyBar [data-act=stSave]'); await w.waitForTimeout(500); }
  await w.click('#hdQuayLai'); await w.waitForSelector('#pbBox');
  ok('hai đội, mặc định “Chọn phiếu theo đội”; có bảng chọn phiếu cho từng đội', /Chọn phiếu theo đội/.test(await w.innerText('#pbBox')) && (await w.$$('#pbPhieuTbl select[data-pcdoi]')).length === 2, await w.innerText('#pbBox'));
  let f = await lotDb('fa'); const d1 = f.doi[0].id, d2 = f.doi[1].id;
  await w.selectOption('#pbPhieuTbl select[data-pcdoi="0"]', d1); await w.waitForTimeout(300);
  if (await w.$('#loDirtyBar [data-act=stSave]')) { await w.click('#loDirtyBar [data-act=stSave]'); await w.waitForTimeout(500); }
  await w.selectOption('#pbPhieuTbl select[data-pcdoi="1"]', d2); await w.waitForTimeout(300);
  if (await w.$('#loDirtyBar [data-act=stSave]')) { await w.click('#loDirtyBar [data-act=stSave]'); await w.waitForTimeout(500); }
  let r = await pb();
  ok('chọn phiếu theo đội: 60 tấn / 40,001 tấn, không còn phần chưa phân bổ', /60,000/.test(r[0]) && /40,001/.test(r[1]) && !(await w.$('#pbChua')), r.join('|'));
  const dsKl = await w.innerText('#dsHdNcTbl');
  ok('danh sách hợp đồng dùng cùng kết quả (60 / 40,001 tấn)', /60,000 tấn/.test(dsKl) && /40,001 tấn/.test(dsKl), dsKl);
  // 3. chia đều: xem trước rồi mới lưu
  await w.check('input[name=pbCheDo][value=chiaDeu]'); await w.waitForTimeout(200); r = await pb();
  ok('xem trước “Chia đều”: 50,001 / 50,000 tấn (1 kg lẻ cho đội đứng trước), chưa lưu', /50,001/.test(r[0]) && /50,000/.test(r[1]) && await w.isVisible('#pbChuaLuu') && !(await lotDb('fa')).phanBo, r.join('|'));
  await w.click('#pbLuu'); await w.waitForTimeout(600); f = await lotDb('fa');
  ok('“Lưu phân bổ”: lô ghi cách chia đều; danh sách hợp đồng 50,001 / 50,000 tấn', f.phanBo && f.phanBo.cheDo === 'chiaDeu' && /50,001 tấn/.test(await w.innerText('#dsHdNcTbl')) && /50,000 tấn/.test(await w.innerText('#dsHdNcTbl')), JSON.stringify(f.phanBo));
  ok('phiếu cân không bị nhân đôi: mỗi phiếu tính một lần (tổng 100,001 tấn)', /100,001/.test(await w.innerText('#pbTong')));
  // 4. lô đã chốt: kết quả lúc chốt, chỉ xem
  await moRung('fb'); await w.waitForSelector('#pbBox');
  r = await pb();
  ok('lô đã chốt: hiện kết quả lúc chốt (chia đều 15,001 / 15,000), không có nút lưu', /lô đã chốt/.test(await w.innerText('#pbBox')) && /15,001/.test(r[0]) && /15,000/.test(r[1]) && !(await w.$('#pbLuu')), r.join('|'));

  ok('không có lỗi script trên màn hình', errs.length === 0, errs.join(' | '));
  await app.close(); console.log(fail ? 'CÓ ' + fail + ' LỖI' : 'TẤT CẢ ĐẠT'); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
