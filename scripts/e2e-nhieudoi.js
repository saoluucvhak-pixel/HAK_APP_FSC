'use strict';
/* Nhiều đội: mỗi Tổ trưởng là một đội, ký hợp đồng giao khoán riêng như mỗi người vận chuyển một hợp đồng (Electron thật, SQLite thật).
 * Chạy: xvfb-run -a node scripts/e2e-nhieudoi.js */
const {_electron: electron} = require('playwright-core');
const path = require('path'), fs = require('fs'), os = require('os');
const src = fs.readFileSync(path.join(__dirname, 'e2e-inan2.js'), 'utf8');
const {nv, lot, seed} = new Function(src.slice(src.indexOf('const nv ='), src.indexOf('const plain =')) + '; return {nv, lot, seed};')();
const root = path.join(__dirname, '..');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hakqn-doi-'));
let fail = 0; const ok = (name, cond, extra) => { console.log((cond ? 'ĐẠT  ' : 'LỖI  ') + name + (!cond && extra ? ' — ' + extra : '')); if (!cond) fail++; };
(async () => {
  const app = await electron.launch({executablePath: require('electron'), args: [root, '--no-sandbox'], env: {...process.env, HAKQN_CLOSE: 'discard', HAKQN_DB: path.join(dir, 'd.sqlite'), HAKQN_USERDATA: path.join(dir, 'ud'), HAKQN_DOWNLOAD_DIR: path.join(dir, 'out')}});
  const w = await app.firstWindow(); const errs = []; w.on('pageerror', e => errs.push(e.message)); w.on('dialog', d => d.accept()); await w.waitForSelector('#side');
  const p = (i, vai, ten, cd, doi) => ({...nv(i, vai, ten, cd, '04908500' + String(2000 + i)), maRung: 'R-A', doi: doi || ''});
  const two = [p(1, 'Tổ trưởng', 'TRẦN ĐỘI MỘT', 'Tổ trưởng', 'Đội 1'), p(2, 'Công nhân', 'LÊ A', 'Công nhân khai thác', 'Đội 1'), p(3, 'Công nhân', 'LÊ B', 'Công nhân khai thác', 'Đội 1'),
    p(4, 'Tổ trưởng', 'NGUYỄN ĐỘI HAI', 'Tổ trưởng', 'Đội 2'), p(5, 'Công nhân', 'PHẠM C', 'Công nhân khai thác', 'Đội 2')];
  const A = lot('fa', 'R-A', {exp: {soKT: '015', ngayKy: '02/10/2026'}, pc: [], nc: two, kl: 10}), B = lot('fb', 'R-B', {exp: {soKT: '016', ngayKy: '02/10/2026'}, pc: [], kl: 10});
  A.info.dienTich = 2; A.info.dinhMucNgayHa = 5; A.info.tuNgay = '05/10/2026'; A.info.denNgay = '';
  B.nc = B.nc.map(r => ({...r, maRung: 'R-B'})); B.dx = B.dx.map(r => ({...r, maRung: 'R-B'}));
  await w.evaluate(d => window.hak.save(d), seed([A, B])); await w.reload(); await w.waitForSelector('#side');
  const open = async fid => { await w.click('[data-open=own1]'); await w.click('[data-tab=rung]'); await w.click('[data-forest=' + fid + ']'); await w.click('[data-ftab=nc]'); await w.waitForTimeout(300); };
  // 1. tab Nhân công: 2 đội
  await open('fa'); const t = await w.innerText('#doiPanel');
  ok('tab Nhân công: bảng “2 đội, 2 hợp đồng giao khoán” với tên đội, tổ trưởng, số người (3 và 2)', /2 đội, 2 hợp đồng/.test(t) && /Đội 1/.test(t) && /TRẦN ĐỘI MỘT/.test(t) && /Đội 2/.test(t) && /NGUYỄN ĐỘI HAI/.test(t));
  ok('sản lượng 10 tấn chia theo số người: 6 tấn và 4 tấn', /\b6\b/.test(t) && /\b4\b/.test(t), t);
  // 1b. định mức thời gian là của MỘT đội: 2 ha × 5 ngày/ha = 10 ngày, 2 đội song song = 5 ngày
  await w.click('[data-ftab=finfo]'); await w.waitForTimeout(300); const tg = await w.innerText('#tgNote');
  ok('thời gian dự kiến chia cho 2 đội: 5 ngày, ghi rõ “÷ 2 đội làm song song”', /dự kiến: 5 ngày/.test(tg) && /÷ 2 đội làm song song/.test(tg), tg);
  ok('Thông tin rừng có ô “Số đội khai thác”, để trống thì gợi ý theo nhân công (2)', /theo nhân công: 2/.test(await w.getAttribute('[name=soDoi]', 'placeholder')));
  await w.fill('[name=soDoi]', '1'); await w.waitForTimeout(300); const tg1 = await w.innerText('#tgNote'), sn = await w.innerText('#soDoiNote');
  ok('khai 1 đội: thời gian dự kiến 10 ngày (không chia), nhắc tab Nhân công có 2 Tổ trưởng', /dự kiến: 10 ngày/.test(tg1) && !/song song/.test(tg1) && /đang có 2 Tổ trưởng/.test(sn), tg1 + ' | ' + sn);
  await w.fill('[name=soDoi]', '2'); await w.waitForTimeout(300); const tg2 = await w.innerText('#tgNote');
  ok('khai 2 đội: 5 ngày, ghi “÷ 2 đội làm song song”', /dự kiến: 5 ngày/.test(tg2) && /÷ 2 đội làm song song/.test(tg2), tg2);
  await w.fill('[name=soDoi]', '0'); await w.click('#forestForm button[type=submit]'); await w.waitForTimeout(300);
  ok('số đội 0 bị từ chối, nêu rõ 1 đến 20', /Số đội khai thác phải là số nguyên từ 1 đến 20/.test(await w.innerText('#main')));
  await w.fill('[name=soDoi]', '2'); await w.click('#forestForm button[type=submit]'); await w.waitForTimeout(400);
  ok('lưu số đội 2 vào SQLite', (await w.evaluate(() => window.hak.loadSync().db)).rs.own1.forests.fa.info.soDoi === 2);
  await w.click('[data-ftab=nc]'); await w.waitForTimeout(200);
  // 2. hồ sơ: mỗi đội một hợp đồng giao khoán riêng (xuất ZIP thật)
  const out = path.join(dir, 'out'); fs.mkdirSync(out, {recursive: true}); const JSZip = require('jszip');
  const plain = xml => (xml.match(/<w:t[^>]*>([^<]*)<\/w:t>/g) || []).map(a => a.replace(/<[^>]+>/g, '')).join('');
  const zipOf = async () => { for (const f of fs.readdirSync(out)) fs.unlinkSync(path.join(out, f)); await w.click('[data-ftab=xuat]'); await w.waitForTimeout(300); await w.click('button[data-act=dl][data-kind=all]'); let f = null; for (let i = 0; i < 100 && !f; i++) { f = fs.readdirSync(out).find(x => x.endsWith('.zip')); await w.waitForTimeout(200); } await w.waitForTimeout(500); return JSZip.loadAsync(fs.readFileSync(path.join(out, f))); };
  let z = await zipOf(); const names = Object.keys(z.files).filter(n => !z.files[n].dir);
  const txt = async n => plain(await z.file(n).async('string'));
  const gk = names.filter(n => /01_HD_Giao_khoan[^/]*\//.test(n)), uq = names.filter(n => /20_Giay_uy_quyen[^/]*\//.test(n));
  ok('2 hợp đồng giao khoán, mỗi đội một file', gk.length === 2, names.join(', '));
  const t1 = gk.length ? await txt(gk[0]) : '', t2 = gk.length > 1 ? await txt(gk[1]) : '';
  ok('hợp đồng đội 1 chỉ có Tổ trưởng đội 1; hợp đồng đội 2 chỉ có Tổ trưởng đội 2', /TRẦN ĐỘI MỘT/.test(t1) && !/NGUYỄN ĐỘI HAI/.test(t1) && /NGUYỄN ĐỘI HAI/.test(t2) && !/TRẦN ĐỘI MỘT/.test(t2));
  ok('2 giấy ủy quyền, mỗi đội một', uq.length === 2, names.join(', '));
  ['05_Bang_cham_cong', '06_DS_doi_khai_thac', '07_XN_dao_tao_ATLD', '08_Bang_thanh_toan_tien_cong', '14_BB_nghiem_thu_thanh_ly'].forEach(d => ok(d + ': mỗi đội một file', names.filter(n => new RegExp(d + '[^/]*/').test(n)).length === 2, names.join(', ')));
  // 3. lỗi: thiếu tên đội / đội mồ côi (lô C)
  const C = lot('fc', 'R-C', {exp: {}, pc: [], kl: 10, nc: [p(1, 'Tổ trưởng', 'TT MỘT', 'Tổ trưởng', 'Đội 1'), p(2, 'Tổ trưởng', 'TT HAI', 'Tổ trưởng', ''), p(3, 'Công nhân', 'CN LẠC', 'Công nhân khai thác', 'Đội 9')].map(r => ({...r, maRung: 'R-C'}))});
  const D2 = seed([A, B, C]); await w.evaluate(d => window.hak.save(d), D2); await w.reload(); await w.waitForSelector('#side');
  await open('fc'); const e = await w.innerText('#main');
  ok('thiếu tên đội của Tổ trưởng và công nhân vào đội không có Tổ trưởng: báo lỗi rõ', /chưa ghi tên đội/.test(e) && /không có Tổ trưởng/.test(e), e.slice(0, 600));
  // 4. lô một tổ trưởng không đổi
  await open('fb'); z = await zipOf(); const nb = Object.keys(z.files).filter(n => !z.files[n].dir);
  ok('lô 1 Tổ trưởng: vẫn 1 hợp đồng giao khoán như cũ, không có thư mục theo đội', nb.filter(x => /01_HD_Giao_khoan_[^/]*\.docx$/.test(x)).length === 1 && !nb.some(x => /01_HD_Giao_khoan[^/]*\//.test(x)), nb.join(', '));
  ok('không có lỗi script trên màn hình', errs.length === 0, errs.join(' | '));
  await app.close(); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
