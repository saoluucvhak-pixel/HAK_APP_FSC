'use strict';
/* Định mức BHLĐ có HIỆU LỰC TỪ NGÀY; danh mục VỊ TRÍ là Định mức nhân công (cấu trúc 2.0 giai đoạn 2): vị trí đang dùng tự có, thêm/xóa vị trí ở Định mức nhân công (Electron thật, dữ liệu giả lập).
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
  const app = await electron.launch({executablePath: require('electron'), args: [root, '--no-sandbox', '--user-data-dir=' + path.join(dir, 'ud')], env: {...process.env, HAKQN_CLOSE: 'discard', HAKQN_DB: path.join(dir, 'd.sqlite'), HAKQN_USERDATA: path.join(dir, 'ud'), HAKQN_DOWNLOAD_DIR: out, ELECTRON_DISABLE_SECURITY_WARNINGS: '1'}});
  const w = require('./_hd30').boc(await app.firstWindow()); const errs = []; w.on('pageerror', e => errs.push(e.message)); w.on('dialog', d => d.accept()); await w.waitForSelector('#side');
  const L = lot('fa', 'R-A', {exp: Object.assign({}, EXP0, {capNgay: '15/08/2026'}), pc: PC, kl: 30, nc: NC}); L.info.donGia = null; L.info.donGiaTan['Công nhân phụ'] = 300000;
  await w.evaluate(d => window.hak.save(d), seed([L])); await w.reload(); await w.waitForSelector('#side');
  const dongHop = async () => { if (await w.$('#dmModal')) { await w.keyboard.press('Escape'); await w.waitForTimeout(150); } };   // lỗi nhập ở hộp thoại Thêm vị trí thì hộp vẫn mở (giữ chữ đang gõ): đóng bằng Esc trước khi đi tiếp
  const openNorm = async () => { await dongHop(); await w.evaluate(() => document.querySelector('[data-act=openNorm]').click()); await w.click('#normTab_bhld'); await w.waitForSelector('#normForm'); };
  const note = () => w.evaluate(() => (document.querySelector('.msg') || {innerText: ''}).innerText);
  const getText = async kind => { clearOut(); await w.click('button[data-act=dl][data-kind=' + kind + ']'); let f = null; for (let i = 0; i < 80 && !f; i++) { f = fs.readdirSync(out).find(x => /\.docx$/.test(x)); if (!f) await w.waitForTimeout(150); } await w.waitForTimeout(200); return plain(await (await JSZip.loadAsync(fs.readFileSync(path.join(out, f)))).file('word/document.xml').async('string')); };

  // 0. nút Định mức BHLĐ ở menu ngang trên cùng, không còn ở cột trái
  ok('nút “Định mức” (không còn chữ BHLĐ) nằm ở menu ngang trên cùng, không còn ở cột trái', (await w.innerText('#navNorm')).trim() === 'Định mức' && !!(await w.$('header.top .nav [data-act=openNorm]')) && !(await w.$('aside [data-act=openNorm]')));
  // 1. màn hình định mức
  await w.click('header.top .nav [data-act=openNorm]'); await w.waitForSelector('#normForm');
  ok('mở từ menu ngang: nút được tô sáng (đang ở màn Định mức)', await w.evaluate(() => document.getElementById('navNorm').classList.contains('on')));
  await openNorm();
  ok('màn Định mức (tiêu đề “Định mức”, mục Định mức BHLĐ theo vị trí) có ô “Hiệu lực từ ngày”, nút thêm bản mới', (await w.innerText('#main h2')).trim() === 'Định mức' && !!(await w.$('#normForm input[name=tuNgay]')) && !!(await w.$('[data-act=normAddVer]')) && /Hiệu lực từ ngày/.test(await w.innerText('#normForm')));
  // 2. danh mục vị trí = Định mức nhân công
  ok('màn BHLĐ không còn ô thêm vị trí riêng; ghi rõ vị trí lấy từ Định mức nhân công', !(await w.$('#normNewPos')) && /Danh sách vị trí lấy từ Định mức nhân công/.test(await w.innerText('#main')));
  ok('vị trí đang có người giữ (“Công nhân phụ”) tự có trong bảng định mức BHLĐ và trong Định mức nhân công (số người 0)', !!(await w.$('tr[data-pos="Công nhân phụ"]')) && (await w.$$eval('#dbBang tbody tr', trs => trs.map(t => t.cells[0].innerText.trim() + ':' + (t.cells[1].innerText.match(/\d+/) || ['0'])[0]))).includes('Công nhân phụ:0'));
  const addDb = async (cd, so) => { await dongHop(); await w.click('#normTab_nhancong'); await w.click('#dbThem'); await w.fill('#dbMoForm [name=b_cd]', cd); await w.fill('#dbMoForm [name=b_so]', String(so)); await w.click('#normMoLuu'); await w.waitForTimeout(400); };
  await addDb('Công nhân lái máy', 0); await openNorm();
  ok('thêm vị trí “Công nhân lái máy” (0 người) ở Định mức nhân công: hiện ngay trong bảng định mức BHLĐ', !!(await w.$('tr[data-pos="Công nhân lái máy"]')), await note());
  await addDb('công nhân LÁI MÁY', 0);
  ok('thêm vị trí trùng tên (khác hoa/thường) ở Định mức nhân công: từ chối', /bị trùng/.test(await note()), await note());
  await openNorm();
  // 3. bản gốc: hiệu lực từ 01/01/2026 và định mức cho vị trí mới
  const setRow = async (cd, vals) => {
    await w.click('tr[data-pos="' + cd + '"] [data-act=bhldSua]');
    await w.waitForSelector('#bhldForm');
    for (const [k, v] of Object.entries(vals)) await w.fill('#bhldForm [name="' + k + '"]', v);
    await w.click('#bhldLuu');
    await w.waitForTimeout(400);
  };
  await w.fill('#normForm input[name=tuNgay]', '01/01/2026');
  await w.click('#normDateSave'); await w.waitForTimeout(300);
  await setRow('Công nhân phụ', {qa: '1 bộ', giay: '1 đôi', mu: '1 cái', gang: '2 đôi'});
  // 4. bản mới từ 01/09/2026: Tổ trưởng 2 bộ
  await w.fill('#normNewDate', '31/02/2026'); await w.click('[data-act=normAddVer]'); await w.waitForTimeout(300);
  ok('ngày hiệu lực không có thật (31/02/2026): từ chối', /dd\/mm\/yyyy|có thật/.test(await note()), await note());
  await w.fill('#normNewDate', '01/09/2026'); await w.click('[data-act=normAddVer]'); await w.waitForTimeout(400);
  ok('thêm bản hiệu lực từ 01/09/2026: có hai bản để chọn', (await w.$$eval('#normVer option', o => o.map(x => x.textContent))).some(t => /01\/09\/2026/.test(t)) && (await w.$$('#normVer option')).length === 2);
  await setRow('Tổ trưởng', {qa: '2 bộ'});
  const saved = await w.evaluate(() => window.hak.loadSync().db);
  ok('đã lưu vào cơ sở dữ liệu: ngày hiệu lực, hai bản; danh mục vị trí trong Định mức nhân công', saved.dinhMucTu === '01/01/2026' && saved.dinhMucBan.length === 1 && saved.dinhMucBan[0].tuNgay === '01/09/2026' && saved.dinhMucBan[0].dm['Tổ trưởng'].qa === '2 bộ' && saved.dinhMuc['Tổ trưởng'].qa === '1 bộ' && saved.dinhBien.some(r => r.chucDanh === 'Công nhân phụ' && r.soNguoi === 0) && saved.dinhBien.some(r => r.chucDanh === 'Công nhân lái máy'), JSON.stringify([saved.dinhMucTu, (saved.dinhMucBan || []).map(x => x.tuNgay), (saved.dinhBien || []).map(r => r.chucDanh)]));
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
  await openNorm(); await w.click('#normTab_nhancong'); { const i = await w.$$eval('#dbBang tbody tr', trs => trs.findIndex(tr => tr.cells[0].innerText.trim() === 'Công nhân phụ')); await w.click('#dbBang tr[data-db="' + i + '"] [data-act=normXoa]'); await w.waitForTimeout(400); }
  ok('xóa ở Định mức nhân công vị trí đang có nhân công giữ: không cho lưu, nêu rõ vị trí', /còn nhân công giữ vị trí “Công nhân phụ”/.test(await note()) && (await w.evaluate(() => window.hak.loadSync().db.dinhBien.some(r => r.chucDanh === 'Công nhân phụ'))), await note());
  ok('không có lỗi JavaScript', errs.length === 0, errs.join('|'));
  await app.close(); console.log(fail ? 'CÓ ' + fail + ' LỖI' : 'TẤT CẢ ĐẠT'); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
