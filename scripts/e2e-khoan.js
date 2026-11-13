'use strict';
/* Giao khoán: đơn giá khoán của tổ suy ra từ định biên nhân sự (Electron thật, dữ liệu giả lập).
 *  1. Thông tin rừng KHÔNG có đơn giá Tổ trưởng: BM-01 ghi cơ sở tính giá trung bình + chi tiết từng vị trí + tổng giá trị khoán = tổng thanh toán; BM-20 ghi đơn giá ký; BM-08 ghi đơn giá khoán và tổng.
 *  2. Thông tin rừng CÓ đơn giá Tổ trưởng: làm như cũ (không có phần suy ra).
 * Chạy: xvfb-run -a node scripts/e2e-khoan.js   (KHOAN_OUT=thư_mục để giữ các file Word) */
const {_electron: electron} = require('playwright-core');
const path = require('path'), fs = require('fs'), os = require('os');
const JSZip = require('jszip');
const root = path.join(__dirname, '..');
const src = fs.readFileSync(path.join(__dirname, 'e2e-inan2.js'), 'utf8');
const {nv, lot, seed, PC, EXP1} = new Function(src.slice(src.indexOf('const nv ='), src.indexOf('const plain =')) + '; return {nv, lot, seed, PC, EXP1};')();   // dữ liệu thử dùng chung với e2e-inan2
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hakqn-khoan-')), out = path.join(dir, 'out');
let fail = 0; const ok = (name, cond, extra) => { console.log((cond ? 'ĐẠT  ' : 'LỖI  ') + name + (!cond && extra ? ' — ' + extra : '')); if (!cond) fail++; };
const plain = xml => (xml.match(/<w:t[^>]*>([^<]*)<\/w:t>/g) || []).map(a => a.replace(/<[^>]+>/g, '')).join('');
const NC = [nv(1, 'Tổ trưởng', 'TRẦN VĂN TỔ', 'Tổ trưởng', '049085000001'), nv(2, 'Công nhân', 'LÊ VĂN NHÂN', 'Công nhân khai thác', '049085000002'), nv(3, 'Công nhân', 'PHẠM VĂN BÌNH', 'Công nhân khai thác', '049085000003'), nv(4, 'Công nhân', 'NGÔ VĂN CƯA', 'Công nhân cưa', '049085000004')];
(async () => {
  const app = await electron.launch({executablePath: require('electron'), args: [root, '--no-sandbox'], env: {...process.env, HAKQN_DB: path.join(dir, 'k.sqlite'), HAKQN_USERDATA: path.join(dir, 'ud'), HAKQN_DOWNLOAD_DIR: out, ELECTRON_DISABLE_SECURITY_WARNINGS: '1'}});
  const w = await app.firstWindow(); const errs = []; w.on('pageerror', e => errs.push(e.message)); w.on('dialog', d => d.accept()); await w.waitForSelector('#side');
  const get = async (xt, kind) => { fs.mkdirSync(out, {recursive: true}); for (const f of fs.readdirSync(out)) fs.unlinkSync(path.join(out, f)); await w.click('[data-xtab=' + xt + ']'); await w.click(`button[data-act=dl][data-kind=${kind}]`); let f = null; for (let i = 0; i < 80 && !f; i++) { f = fs.readdirSync(out).find(x => /\.docx$/.test(x)); if (!f) await w.waitForTimeout(150); } await w.waitForTimeout(200);
    const file = path.join(out, f); if (process.env.KHOAN_OUT && cur === 'suyra') { fs.mkdirSync(process.env.KHOAN_OUT, {recursive: true}); fs.copyFileSync(file, path.join(process.env.KHOAN_OUT, f)); }
    return plain(await (await JSZip.loadAsync(fs.readFileSync(file))).file('word/document.xml').async('string')); };
  let cur = '';
  const run = async (donGiaTT, tag) => {
    cur = tag;
    const L = lot('fa', 'R-A', {exp: EXP1, pc: PC, kl: 40, nc: NC}); L.info.donGia = null;
    await w.evaluate(d => window.hak.save(d), seed([L])); await w.reload(); await w.waitForSelector('#side');
    await w.click('[data-open=own1]'); await w.click('[data-tab=rung]'); await w.click('[data-forest=fa]'); await w.click('[data-ftab=xuat]');
    await w.click('[data-ftab=finfo]'); const fld = await w.$('#forestForm input[name=donGia]'); ok('Thông tin rừng có ô “Đơn giá giao khoán Tổ trưởng”' + (donGiaTT ? ' (nhập ' + donGiaTT + ')' : ' (để trống)'), !!fld);
    if (donGiaTT) { await fld.fill(String(donGiaTT)); await w.click('#forestForm button[type=submit]'); await w.waitForTimeout(400); }
    await w.click('[data-ftab=xuat]');
    return {gk: await get('hd', 'gk'), uq: await get('hd', 'uq'), tc: await get('ld', 'tc')};
  };
  // ===== 1. không có đơn giá Tổ trưởng ở Thông tin rừng =====
  let d = await run(null, 'suyra');
  ok('BM-01: đơn giá khoán của tổ là đơn giá bình quân 365.000 đồng/tấn, tính từ định biên 4 người', /đơn giá bình quân 365\.000 đồng\/tấn/.test(d.gk) && /định biên nhân sự 4 người/.test(d.gk), d.gk.slice(d.gk.indexOf('2.2.'), d.gk.indexOf('2.2.') + 300));
  ok('BM-01: chi tiết giá từng vị trí (số người × đơn giá) kể cả vị trí chưa có người', /Tổ trưởng: 1 người × 420\.000 đồng\/tấn = 420\.000/.test(d.gk) && /Công nhân khai thác: 2 người × 330\.000 đồng\/tấn = 660\.000/.test(d.gk) && /Công nhân cưa: 1 người × 380\.000 đồng\/tấn = 380\.000/.test(d.gk));
  ok('BM-01: ghi rõ cơ sở tính giá trung bình (công thức)', /\(1 × 420\.000 \+ 2 × 330\.000 \+ 1 × 380\.000\) ÷ 4 người = 1\.460\.000 ÷ 4 = 365\.000 đồng\/tấn/.test(d.gk));
  ok('BM-01 (ký trước khai thác): tổng giá trị khoán theo sản lượng DỰ KIẾN 160 tấn = 365.000 × 160 = 58.400.000, bằng tổng tiền 4 người (4 × 160 ÷ 4 tấn mỗi người)', /Tổng giá trị khoán = đơn giá bình quân × sản lượng = 58\.400\.000 đồng, bằng tổng tiền thanh toán cho 4 người kể cả Tổ trưởng/.test(d.gk) && 365000 * 160 === 58400000 && 40 * (420000 + 330000 * 2 + 380000) === 58400000, d.gk.slice(d.gk.indexOf('Tổng giá trị khoán'), d.gk.indexOf('Tổng giá trị khoán') + 160));
  ok('BM-20 ủy quyền: ghi rõ đơn giá ký (bình quân, công thức, giá từng vị trí, tổng bằng tổng thanh toán)', /Đơn giá ký: Bên B ký hợp đồng khai thác với chủ rừng theo đơn giá khoán bình quân của tổ 365\.000 đồng\/tấn/.test(d.uq) && /Tổ trưởng 420\.000 \(1 người\); Công nhân khai thác 330\.000 \(2 người\); Công nhân cưa 380\.000 \(1 người\)/.test(d.uq) && /Tổng giá trị khoán bằng tổng tiền thanh toán cho 4 người/.test(d.uq));
  ok('BM-08: ghi đơn giá khoán của tổ, tổng tiền 14.600.000 (gồm Tổ trưởng) và Tổ trưởng nhận thay cả tổ', /đơn giá khoán của tổ 365\.000 đồng\/tấn/.test(d.tc) && /14\.600\.000/.test(d.tc) && /nhận thay cho cả tổ/.test(d.tc));
  ok('BM-08: tiền từng người đúng (4.200.000; 3.300.000 ×2; 3.800.000)', /4\.200\.000/.test(d.tc) && (d.tc.match(/3\.300\.000/g) || []).length >= 2 && /3\.800\.000/.test(d.tc));
  // ===== 2. có đơn giá Tổ trưởng ở Thông tin rừng: như cũ =====
  d = await run(340000, 'cu');
  ok('đã lưu đơn giá vào lô: ' + JSON.stringify(await w.evaluate(() => window.hak.loadSync().db.rs.own1.forests.fa.info.donGia)), (await w.evaluate(() => window.hak.loadSync().db.rs.own1.forests.fa.info.donGia)) === 340000);
  ok('có đơn giá Tổ trưởng ở Thông tin rừng: BM-01 làm như cũ (không có đơn giá bình quân, không có công thức)', !/đơn giá bình quân|Cơ sở tính giá trung bình/.test(d.gk) && /Tổng tiền khoán dự tính/.test(d.gk));
  ok('có đơn giá Tổ trưởng ở Thông tin rừng: BM-20 và BM-08 như cũ (không có phần suy ra đơn giá ký)', !/Đơn giá ký:/.test(d.uq) && !/đơn giá khoán của tổ/.test(d.tc));
  ok('không có lỗi JavaScript', errs.length === 0, errs.join('|'));
  await app.close(); console.log(fail ? 'CÓ ' + fail + ' LỖI' : 'TẤT CẢ ĐẠT'); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
