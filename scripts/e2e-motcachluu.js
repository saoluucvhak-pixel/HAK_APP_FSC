'use strict';
/* MỘT CÁCH LƯU CHO LÔ (như chứng từ ERP): mọi thay đổi trong lô vào bản nháp; một nút “Lưu dữ liệu vào lô”; “Bỏ thay đổi” về bản đã lưu;
 * lưu danh mục / chủ rừng không kéo theo thay đổi chưa lưu của lô; xuất hồ sơ và rời lô khi còn thay đổi: chặn / hỏi.
 * Chạy: xvfb-run -a node scripts/e2e-motcachluu.js */
const {_electron: electron} = require('playwright-core');
const path = require('path'), fs = require('fs'), os = require('os');
const src = fs.readFileSync(path.join(__dirname, 'e2e-inan2.js'), 'utf8');
const {lot, seed, PC, EXP1} = new Function(src.slice(src.indexOf('const nv ='), src.indexOf('const plain =')) + '; return {lot, seed, PC, EXP1};')();
const root = path.join(__dirname, '..');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hakqn-luu1-'));
let fail = 0; const ok = (name, cond, extra) => { console.log((cond ? 'ĐẠT  ' : 'LỖI  ') + name + (!cond && extra ? ' — ' + extra : '')); if (!cond) fail++; };
(async () => {
  const app = await electron.launch({executablePath: require('electron'), args: [root, '--no-sandbox'], env: {...process.env, HAKQN_CLOSE: 'discard', HAKQN_DB: path.join(dir, 'd.sqlite'), HAKQN_USERDATA: path.join(dir, 'ud'), HAKQN_DOWNLOAD_DIR: path.join(dir, 'out')}});
  const w = await app.firstWindow(); const errs = []; w.on('pageerror', e => errs.push(e.message)); w.on('dialog', d => d.accept()); await w.waitForSelector('#side');
  await w.evaluate(d => window.hak.save(d), seed([lot('fa', 'R-A', {exp: EXP1, pc: PC, kl: 29.75}), lot('fb', 'R-B', {exp: {}, pc: []})])); await w.reload(); await w.waitForSelector('#side');
  const db = async () => (await w.evaluate(() => window.hak.loadSync().db));
  await w.click('[data-open=own1]'); await w.click('[data-tab=rung]'); await w.click('[data-forest=fa]'); await w.click('[data-ftab=nc]'); await w.waitForTimeout(300);
  const soKT0 = (await db()).rs.own1.forests.fa.doi[0].exp.soKT;
  // 1. thay đổi tại chỗ vào bản nháp
  await w.fill('#doiKT input[data-exp=soKT]', '099'); await w.dispatchEvent('#doiKT input[data-exp=soKT]', 'change'); await w.waitForTimeout(300);
  ok('đổi số HĐ giao khoán: vào bản nháp, hiện thanh “Chưa lưu” có nút Lưu và Bỏ thay đổi; SQLite chưa đổi', !!(await w.$('#loDirtyBar [data-act=stSave]')) && !!(await w.$('#loDirtyBar [data-act=stDiscard]')) && (await db()).rs.own1.forests.fa.doi[0].exp.soKT === soKT0);
  // 2. lưu thông tin chủ rừng (bản ghi khác): không kéo theo thay đổi chưa lưu của lô
  await w.click('[data-tab=info]'); await w.waitForTimeout(200);
  await w.fill('#infoForm [name=sdt]', '0905000111'); await w.click('#infoForm button[type=submit]'); await w.waitForTimeout(500);
  let d0 = await db();
  ok('lưu Thông tin chủ rừng khi lô còn thay đổi: chủ rừng ghi ngay, số HĐ của lô CHƯA ghi', d0.rs.own1.info.sdt === '0905000111' && d0.rs.own1.forests.fa.doi[0].exp.soKT === soKT0);
  await w.click('[data-tab=rung]'); await w.click('[data-forest=fa]'); await w.waitForTimeout(300);
  ok('quay lại lô: thay đổi chưa lưu vẫn còn trong bản nháp', (await w.$('#loDirtyBar')) && await w.evaluate(() => true));
  // 3. xuất hồ sơ khi còn thay đổi: chặn, nêu cách xử lý
  await w.click('[data-ftab=xuat]'); await w.click('[data-xtab=all]'); await w.waitForTimeout(200);
  ok('xuất hồ sơ khi lô còn thay đổi chưa lưu: nút xuất khóa, thanh nêu “thông tin lô” chưa lưu', !!(await w.$('button[data-act=dl][data-kind=all][disabled]')) && /còn thay đổi chưa lưu ở thông tin lô/.test(await w.innerText('#loDirtyBar')));
  // 4. bỏ thay đổi: về bản đã lưu
  await w.click('#loDirtyBar [data-act=stDiscard]'); await w.waitForTimeout(400);
  const f = (await db()).rs.own1.forests.fa;
  await w.click('[data-ftab=nc]'); await w.waitForTimeout(200);
  ok('Bỏ thay đổi: ô về số đã lưu, hết thanh “Chưa lưu”, SQLite không đổi', (await w.inputValue('#doiKT input[data-exp=soKT]')) === (soKT0 || '') && !(await w.$('#loDirtyBar')) && f.doi[0].exp.soKT === soKT0, await w.inputValue('#doiKT input[data-exp=soKT]'));
  // 5. sửa lại, lưu danh mục (đơn vị vận chuyển) khi lô còn thay đổi: danh mục ghi, lô vẫn chưa ghi
  await w.fill('#doiKT input[data-exp=soKT]', '077'); await w.dispatchEvent('#doiKT input[data-exp=soKT]', 'change'); await w.waitForTimeout(300);
  await w.click('[data-ftab=dx]'); await w.waitForTimeout(200);
  await w.fill('#dvForm [name=ten]', 'CÔNG TY VT THỬ'); await w.click('#dvForm [type=submit]'); await w.waitForTimeout(500);
  let d = await db();
  ok('lưu danh mục khi lô còn thay đổi: danh mục đã ghi, số HĐ của lô CHƯA ghi', Object.values(d.dmDonViVC || {}).some(x => x.ten === 'CÔNG TY VT THỬ') && d.rs.own1.forests.fa.doi[0].exp.soKT === soKT0, JSON.stringify(d.rs.own1.forests.fa.doi[0].exp));
  // 6. một nút Lưu: ghi cả lô
  await w.click('#loDirtyBar [data-act=stSave]'); await w.waitForTimeout(500); d = await db();
  ok('“Lưu dữ liệu vào lô”: ghi số 077, hết thanh “Chưa lưu”', d.rs.own1.forests.fa.doi[0].exp.soKT === '077' && !(await w.$('#loDirtyBar')));
  // 7. nút Lưu của một khung = lưu cả lô (kể cả thay đổi tại chỗ trước đó)
  await w.click('[data-ftab=nc]'); await w.waitForTimeout(200);
  await w.fill('#doiKT input[data-exp=uqSo]', '55'); await w.dispatchEvent('#doiKT input[data-exp=uqSo]', 'change'); await w.waitForTimeout(200);
  await w.fill('#doiForm [name=dienTich]', '1,5'); await w.$eval('#doiForm', f => f.requestSubmit()); await w.waitForTimeout(500); d = await db();
  ok('nút “Lưu đội” lưu cả lô: diện tích đội 1,5 và số giấy ủy quyền 55 cùng được ghi', d.rs.own1.forests.fa.doi[0].dienTich === 1.5 && d.rs.own1.forests.fa.doi[0].exp.uqSo === '55', JSON.stringify(d.rs.own1.forests.fa.doi[0]));
  // 8. rời lô khi còn thay đổi: hỏi; chọn Lưu và tiếp tục
  await w.fill('#doiKT input[data-exp=ntSo]', '66'); await w.dispatchEvent('#doiKT input[data-exp=ntSo]', 'change'); await w.waitForTimeout(200);
  await w.click('[data-forest=fb]'); await w.waitForTimeout(300);
  ok('rời lô khi còn thay đổi: hỏi Lưu và tiếp tục / Bỏ thay đổi / Quay lại', !!(await w.$('#stGSave')));
  await w.click('#stGSave'); await w.waitForTimeout(600); d = await db();
  ok('chọn “Lưu và tiếp tục”: ghi số biên bản nghiệm thu 66', d.rs.own1.forests.fa.doi[0].exp.ntSo === '66');
  ok('không có lỗi JavaScript', errs.length === 0, errs.join('|'));
  await app.close(); console.log(fail ? 'CÓ ' + fail + ' LỖI' : 'TẤT CẢ ĐẠT'); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
