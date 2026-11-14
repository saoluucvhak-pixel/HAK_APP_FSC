'use strict';
/* Định mức BHLĐ có HIỆU LỰC TỪ NGÀY và thêm VỊ TRÍ mới (Electron thật, dữ liệu giả lập).
 * Chạy: xvfb-run -a node scripts/e2e-dinhmuc.js */
const {_electron: electron} = require('playwright-core');
const path = require('path'), fs = require('fs'), os = require('os');
const JSZip = require('jszip');
const root = path.join(__dirname, '..');
const src = fs.readFileSync(path.join(__dirname, 'e2e-inan2.js'), 'utf8');
const {nv, lot, seed, PC, EXP0} = new Function(src.slice(src.indexOf('const nv ='), src.indexOf('const plain =')) + '; return {nv, lot, seed, PC, EXP0};')();
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hakqn-dm-')), out = path.join(dir, 'out');
let fail = 0; const ok = (name, cond, extra) => { console.log((cond ? 'ĐẠT  ' : 'LỖI  ') + name + (!cond && extra ? ' — ' + extra : '')); if (!cond) fail++; };
const plain = xml => (xml.match(/<w:t[^>]*>([^<]*)<\/w:t>/g) || []).map(a => a.replace(/<[^>]+>/g, '')).join('');
const NC = [nv(1, 'Tổ trưởng', 'TRẦN VĂN TỔ', 'Tổ trưởng', '049085000001'), nv(2, 'Công nhân', 'LÊ VĂN NHÂN', 'Công nhân khai thác', '049085000002'), nv(3, 'Công nhân', 'PHẠM VĂN PHỤ', 'Công nhân phụ', '049085000003')];
const clearOut = () => { fs.mkdirSync(out, {recursive: true}); for (const f of fs.readdirSync(out)) fs.unlinkSync(path.join(out, f)); };
(async () => {
  const app = await electron.launch({executablePath: require('electron'), args: [root, '--no-sandbox'], env: {...process.env, HAKQN_CLOSE: 'discard', HAKQN_DB: path.join(dir, 'd.sqlite'), HAKQN_USERDATA: path.join(dir, 'ud'), HAKQN_DOWNLOAD_DIR: out, ELECTRON_DISABLE_SECURITY_WARNINGS: '1'}});
  const w = await app.firstWindow(); const errs = []; w.on('pageerror', e => errs.push(e.message)); w.on('dialog', d => d.accept()); await w.waitForSelector('#side');
  const L = lot('fa', 'R-A', {exp: Object.assign({}, EXP0, {capNgay: '15/08/2026'}), pc: PC, kl: 30, nc: NC}); L.info.donGia = null; L.info.donGiaTan['Công nhân phụ'] = 300000;
  await w.evaluate(d => window.hak.save(d), seed([L])); await w.reload(); await w.waitForSelector('#side');
  const openNorm = async () => { await w.evaluate(() => document.querySelector('[data-act=openNorm]').click()); await w.waitForSelector('#normForm'); };
  const note = () => w.evaluate(() => (document.querySelector('.msg') || {innerText: ''}).innerText);
  const getText = async kind => { clearOut(); await w.click('button[data-act=dl][data-kind=' + kind + ']'); let f = null; for (let i = 0; i < 80 && !f; i++) { f = fs.readdirSync(out).find(x => /\.docx$/.test(x)); if (!f) await w.waitForTimeout(150); } await w.waitForTimeout(200); return plain(await (await JSZip.loadAsync(fs.readFileSync(path.join(out, f)))).file('word/document.xml').async('string')); };

  // 0. nút Định mức BHLĐ ở menu ngang trên cùng, không còn ở cột trái
  ok('Định mức BHLĐ nằm ở menu ngang trên cùng, không còn ở cột trái', !!(await w.$('header.top .nav [data-act=openNorm]')) && !(await w.$('aside [data-act=openNorm]')));
  // 1. màn hình định mức
  await w.click('header.top .nav [data-act=openNorm]'); await w.waitForSelector('#normForm');
  ok('mở từ menu ngang: nút được tô sáng (đang ở màn Định mức BHLĐ)', await w.evaluate(() => document.getElementById('navNorm').classList.contains('on')));
  await openNorm();
  ok('màn Định mức BHLĐ có ô “Hiệu lực từ ngày”, nút thêm bản mới và thêm vị trí mới', !!(await w.$('#normForm input[name=tuNgay]')) && !!(await w.$('[data-act=normAddVer]')) && !!(await w.$('[data-act=normAddPos]')) && /Hiệu lực từ ngày/.test(await w.innerText('#normForm')));
  // 2. thêm vị trí mới
  await w.fill('#normNewPos', 'Công nhân phụ'); await w.click('[data-act=normAddPos]'); await w.waitForSelector('tr[data-pos="Công nhân phụ"]');
  ok('thêm vị trí “Công nhân phụ”: hiện thêm một dòng trong bảng định mức', !!(await w.$('tr[data-pos="Công nhân phụ"]')));
  await w.fill('#normNewPos', 'công nhân PHỤ'); await w.click('[data-act=normAddPos]'); await w.waitForTimeout(300);
  ok('thêm vị trí trùng tên (khác hoa/thường): từ chối', /đã có/.test(await note()), await note());
  // 3. bản gốc: hiệu lực từ 01/01/2026 và định mức cho vị trí mới
  const setRow = async (cd, vals) => { for (const [k, v] of Object.entries(vals)) await w.fill('tr[data-pos="' + cd + '"] input[name$="_' + k + '"]', v); };
  await w.fill('#normForm input[name=tuNgay]', '01/01/2026'); await setRow('Công nhân phụ', {qa: '1 bộ', giay: '1 đôi', mu: '1 cái', gang: '2 đôi'});
  await w.click('#normForm button[type=submit]'); await w.waitForTimeout(400);
  // 4. bản mới từ 01/09/2026: Tổ trưởng 2 bộ
  await w.fill('#normNewDate', '31/02/2026'); await w.click('[data-act=normAddVer]'); await w.waitForTimeout(300);
  ok('ngày hiệu lực không có thật (31/02/2026): từ chối', /dd\/mm\/yyyy|có thật/.test(await note()), await note());
  await w.fill('#normNewDate', '01/09/2026'); await w.click('[data-act=normAddVer]'); await w.waitForTimeout(400);
  ok('thêm bản hiệu lực từ 01/09/2026: có hai bản để chọn', (await w.$$eval('#normVer option', o => o.map(x => x.textContent))).some(t => /01\/09\/2026/.test(t)) && (await w.$$('#normVer option')).length === 2);
  await setRow('Tổ trưởng', {qa: '2 bộ'}); await w.click('#normForm button[type=submit]'); await w.waitForTimeout(600);
  const saved = await w.evaluate(() => window.hak.loadSync().db);
  ok('đã lưu vào cơ sở dữ liệu: ngày hiệu lực, hai bản, vị trí thêm', saved.dinhMucTu === '01/01/2026' && saved.dinhMucBan.length === 1 && saved.dinhMucBan[0].tuNgay === '01/09/2026' && saved.dinhMucBan[0].dm['Tổ trưởng'].qa === '2 bộ' && saved.dinhMuc['Tổ trưởng'].qa === '1 bộ' && saved.chucDanhThem.includes('Công nhân phụ'), JSON.stringify([saved.dinhMucTu, (saved.dinhMucBan || []).map(x => x.tuNgay), saved.chucDanhThem]));
  // 5. BM-02 theo ngày cấp phát
  const toXuat = async capNgay => {
    const d = JSON.parse(JSON.stringify(await w.evaluate(() => window.hak.loadSync().db))); d.rs.own1.forests.fa.exp.capNgay = capNgay;
    await w.waitForTimeout(700); await w.evaluate(x => window.hak.save(x), d); await w.reload(); await w.waitForSelector('#side');
    await w.click('[data-open=own1]'); await w.click('[data-tab=rung]'); await w.click('[data-forest=fa]'); await w.click('[data-ftab=xuat]'); await w.click('[data-xtab=ld]');
  };
  await toXuat('15/08/2026'); let t = await getText('bhld');
  ok('BM-02 ngày cấp phát 15/08/2026: dùng bản hiệu lực từ 01/01/2026 (Tổ trưởng 1 bộ), ghi rõ bản áp dụng', /TRẦN VĂN TỔTổ trưởng1 bộ/.test(t) && /hiệu lực từ ngày 01\/01\/2026/.test(t), t.slice(0, 500));
  await toXuat('15/09/2026'); t = await getText('bhld');
  ok('BM-02 ngày cấp phát 15/09/2026: dùng bản hiệu lực từ 01/09/2026 (Tổ trưởng 2 bộ)', /TRẦN VĂN TỔTổ trưởng2 bộ/.test(t) && /hiệu lực từ ngày 01\/09\/2026/.test(t));
  ok('BM-02 có dòng vị trí mới “Công nhân phụ” với định mức của vị trí đó', /PHẠM VĂN PHỤCông nhân phụ1 bộ1 đôi1 cái2 đôi/.test(t), t.slice(0, 600));
  // 6. giao khoán: vị trí mới có người nằm trong đơn giá và định biên
  await w.click('[data-xtab=hd]'); const gk = await getText('gk');
  ok('BM-01: vị trí mới có người nằm trong đơn giá từng vị trí và công thức bình quân (420.000 + 330.000 + 300.000) ÷ 3', /Công nhân phụ: 1 người × 300\.000/.test(gk) && /\(1 × 420\.000 \+ 1 × 330\.000 \+ 1 × 300\.000\) ÷ 3 người = 1\.050\.000 ÷ 3 = 350\.000/.test(gk), gk.slice(gk.indexOf('2.2.'), gk.indexOf('2.2.') + 500));
  // 7. ngày cấp phát trước mọi bản: chặn
  await toXuat('31/12/2025'); const b = await w.$('button[data-act=dl][data-kind=bhld]');
  ok('ngày cấp phát trước mọi bản định mức: chặn xuất và nêu rõ chưa có bản hiệu lực', !!b && await b.isDisabled() && /chưa có bản định mức BHLĐ hiệu lực tại ngày 31\/12\/2025/.test(await w.innerText('#main')), (await w.innerText('#main')).slice(0, 300));
  // 8. không xóa vị trí đang có người giữ; Excel mẫu có vị trí mới
  await openNorm(); await w.click('[data-act=normDelPos][data-name="Công nhân phụ"]'); await w.waitForTimeout(300);
  ok('vị trí đang có nhân công giữ: không cho xóa', /Còn nhân công đang giữ/.test(await note()), await note());
  ok('không có lỗi JavaScript', errs.length === 0, errs.join('|'));
  await app.close(); console.log(fail ? 'CÓ ' + fail + ' LỖI' : 'TẤT CẢ ĐẠT'); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
