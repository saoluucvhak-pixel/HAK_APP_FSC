'use strict';
/* TOÀN VẸN HỒ SƠ ĐÃ CHỐT (Electron thật, SQLite thật, dữ liệu giả lập ở thư mục tạm):
 *  1. lô chốt nguyên vẹn: không cảnh báo; gói trong SQLite bị cắt dở / dấu vân tay bị đổi: dải cảnh báo nêu mã lô, phiên bản chốt, lý do; lô vẫn mở được (chỉ đọc),
 *     lô khác vẫn bình thường; đóng mở lại app: hồ sơ trên SQLite vẫn nguyên trạng (không tự sửa gói, không tự mở khóa / chốt lại).
 *  2. khôi phục MỘT lô đã chốt từ gói sao lưu: nguyên vẹn, nhật ký đổi hợp lệ, gói do bản cũ tạo → khôi phục được; dấu vân tay đổi, JSON cắt, sai cấu trúc,
 *     dữ liệu khác bản chụp → dừng ở xem trước, không có nút ghi, SQLite / các lô khác / file nguồn giữ nguyên; đóng mở lại vẫn nguyên.
 * Chạy: xvfb-run -a node scripts/e2e-toanven.js */
const {_electron: electron} = require('playwright-core');
const path = require('path'), fs = require('fs'), os = require('os'), crypto = require('crypto');
const root = path.join(__dirname, '..');
const V = require(path.join(root, 'src', 'vongdoi.js')), M = require(path.join(root, 'src', 'model.js')), L = require(path.join(root, 'src', 'lorung.js'));
const src = fs.readFileSync(path.join(__dirname, 'e2e-inan2.js'), 'utf8');
const {lot, seed, PC, EXP1} = new Function(src.slice(src.indexOf('const nv ='), src.indexOf('const plain =')) + '; return {lot, seed, PC, EXP1};')();
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hakqn-toanven-')), file = path.join(dir, 'd.sqlite'), lotDir = path.join(dir, 'lo');
let fail = 0; const ok = (name, cond, extra) => { console.log((cond ? 'ĐẠT  ' : 'LỖI  ') + name + (!cond && extra ? ' — ' + extra : '')); if (!cond) fail++; };
const sha = t => crypto.createHash('sha256').update(t).digest('hex');
const sql = fn => { const Db = require('better-sqlite3'), d = new Db(file); try { return fn(d); } finally { d.close(); } };
const anh = () => sql(d => JSON.stringify({f: d.prepare('SELECT id, hash FROM forests ORDER BY id').all(), g: d.prepare('SELECT forest_id, phien_ban, hash, data FROM chot_goi ORDER BY forest_id').all()}));
const launch = async (env = {}) => {
  const app = await electron.launch({executablePath: require('electron'), args: [root, '--no-sandbox', '--proxy-server=http://127.0.0.1:9'], env: {...process.env, HAKQN_CLOSE: 'discard', HAKQN_DB: file, HAKQN_USERDATA: path.join(dir, 'ud'), HAKQN_LOT_DIR: lotDir, ...env}});
  const w = require('./_hd30').boc(await app.firstWindow()); w.errs = []; w.on('pageerror', e => w.errs.push(e.message)); w.on('dialog', d => d.accept()); await w.waitForSelector('#side'); return {app, w};
};
const openLo = async (w, fid, ftab = 'nc') => { await w.click('[data-open=own1]'); await w.click('[data-tab=rung]'); await w.click('[data-forest=' + fid + ']'); await w.click('[data-ftab=' + ftab + ']'); await w.waitForTimeout(300); };
const banner = async w => { const e = await w.$('#toanVenLoi'); return e ? {ma: await e.getAttribute('data-ma'), text: await e.innerText()} : null; };

(async () => {
  fs.mkdirSync(lotDir, {recursive: true});
  const mk = (id, ma) => { const f = M.ensureForest(lot(id, ma, {exp: EXP1, pc: PC.map(p => Object.assign({}, p, {soPhieu: ma + '-' + p.soPhieu})), kl: 29.75})); V.chot(f, 'Kế toán', '2026-11-10T01:00:00.000Z', []); return f; };
  const D = seed([mk('fa', 'R-A'), mk('fb', 'R-B'), mk('fd', 'R-D'), lot('fc', 'R-C', {exp: {}, pc: [], kl: null})]);
  let {app, w} = await launch();
  await w.evaluate(d => window.hak.save(d), D); await w.reload(); await w.waitForSelector('#side');
  await openLo(w, 'fa');
  ok('lô chốt nguyên vẹn: chỉ đọc, không có cảnh báo toàn vẹn', !!(await w.$('#loKhoaBar')) && !(await banner(w)));
  await w.click('[data-ftab=xuat]'); await w.waitForSelector('#chotBox');
  ok('khung Vòng đời lô: trạng thái toàn vẹn "nguyen-ven"', (await w.getAttribute('#chotBox', 'data-toanven')) === 'nguyen-ven');
  // sao lưu riêng lô A (gói hợp lệ) để dùng cho phần khôi phục
  await openLo(w, 'fa', 'finfo'); await w.click('#lotBackupBtn'); await w.waitForTimeout(700);
  const fileA = fs.readdirSync(lotDir).map(n => path.join(lotDir, n))[0];
  ok('sao lưu riêng lô A đã chốt: file có gói đóng băng và dấu vân tay', !!fileA && (() => { const p = JSON.parse(fs.readFileSync(fileA, 'utf8')); return typeof p.lo.chot.goi === 'string' && V.kiemToanVen(p.lo).ok; })());
  await app.close();

  // 1. làm hỏng gói ngay trong SQLite (bản sao riêng của ca thử): B cắt dở JSON, D đổi dấu vân tay
  sql(d => { d.prepare("UPDATE chot_goi SET data = substr(data, 1, 40) WHERE forest_id='fb'").run(); d.prepare("UPDATE forests SET data = json_set(data, '$.chot.hash', 'deadbeefdeadbeef') WHERE id='fd'").run(); });
  const anh1 = anh();
  ({app, w} = await launch());
  await openLo(w, 'fb');
  let b = await banner(w);
  ok('gói bị cắt dở: cảnh báo "Gói hỏng (JSON)", nêu mã lô R-B và phiên bản chốt 1', b && b.ma === 'json-hong' && /R-B/.test(b.text) && /phiên bản chốt 1/.test(b.text), JSON.stringify(b));
  ok('lô có gói hỏng vẫn mở được ở chế độ chỉ đọc để đối chiếu', !!(await w.$('#loKhoaBar')) && !!(await w.$('#loKhoaFs')));
  await openLo(w, 'fd'); b = await banner(w);
  ok('dấu vân tay bị đổi: cảnh báo "Dấu vân tay không khớp", nêu mã lô R-D, lý do có dấu vân tay ghi lúc chốt', b && b.ma === 'hash-khong-khop' && /R-D/.test(b.text) && /deadbeefdeadbeef/.test(b.text), JSON.stringify(b));
  await openLo(w, 'fa'); ok('lô khác trong danh sách vẫn bình thường (nguyên vẹn)', !(await banner(w)) && !!(await w.$('#loKhoaBar')));
  await openLo(w, 'fc'); ok('lô chưa chốt mở và sửa được như thường', !(await w.$('#loKhoaBar')));
  ok('không có lỗi JavaScript khi danh sách có lô gói hỏng', w.errs.length === 0, w.errs.join('|'));
  await app.close();
  ok('đóng mở lại app: SQLite nguyên trạng (không tự sửa gói, không tự mở khóa, không tính lại dấu vân tay)', anh() === anh1);
  ({app, w} = await launch()); await openLo(w, 'fb'); b = await banner(w);
  ok('mở lại lần nữa: vẫn báo đúng lỗi của lô B, lô B vẫn đã chốt', b && b.ma === 'json-hong' && /Đã chốt/.test(await w.innerText('#loKhoaBar')));
  await app.close();

  // 2. khôi phục MỘT lô đã chốt từ gói sao lưu (gói được niêm phong lại sau khi sửa: mô phỏng gói hỏng từ nguồn, qua được kiểm tra niêm phong file)
  const goc = JSON.parse(fs.readFileSync(fileA, 'utf8')); delete goc.maKiemTra;
  const viet = (ten, sua) => { const p = JSON.parse(JSON.stringify(goc)); sua(p.lo); const f = path.join(dir, 'goi-' + ten + '.json'); fs.writeFileSync(f, JSON.stringify(L.seal(p, sha), null, 2)); return f; };
  const loi = {
    'dấu vân tay bị đổi': x => { x.chot.hash = 'deadbeefdeadbeef'; },
    'JSON bị cắt': x => { x.chot.goi = x.chot.goi.slice(0, 30); },
    'JSON sai cấu trúc': x => { x.chot.goi = '{"x":1}'; x.chot.hash = V.bam(x.chot.goi); delete x.chot.hashDL; },
    'dữ liệu khác bản chụp': x => { x.nc[0].diaChi = 'ĐỊA CHỈ SỬA SAU KHI CHỐT'; }
  };
  for (const [ten, sua] of Object.entries(loi)) {
    const f = viet(ten.replace(/\s+/g, '_'), sua), nguon = fs.readFileSync(f, 'utf8'), truoc = anh();
    ({app, w} = await launch({HAKQN_LOT_FILE: f}));
    await w.click('#navSet'); await w.click('#setTab_setbk'); await w.click('#lotRestoreBtn'); await w.waitForTimeout(700);
    const t = await w.innerText('#impBody').catch(() => '');
    ok('khôi phục gói "' + ten + '": dừng ở xem trước, nêu lô R-A, không có nút ghi', /không toàn vẹn/.test(t) && /R-A/.test(t) && !(await w.$('[data-act=lotGo]')) && !!(await w.$('#lotDung')), t.slice(0, 300));
    const r = await w.evaluate(async p => window.hak.lotApply(JSON.parse(p), 'thay'), nguon);   // kể cả gọi thẳng lệnh ghi cũng bị chặn ở tiến trình chính
    ok('  ghi thẳng cũng bị chặn (GOI_HONG); SQLite, các lô khác và file nguồn giữ nguyên', r && !r.ok && r.code === 'GOI_HONG' && anh() === truoc && fs.readFileSync(f, 'utf8') === nguon, JSON.stringify(r).slice(0, 200));
    ok('  không có lỗi JavaScript', w.errs.length === 0, w.errs.join('|'));
    await app.close();
  }
  // gói hợp lệ: nhật ký đổi sau khi chốt; gói do bản cũ tạo (lô chưa có đội, chưa có hashDL)
  const fNk = viet('nhat_ky', x => { V.luuTru(x, '2026-11-12T00:00:00.000Z'); x.nhatKy.push({at: '2026-11-12T01:00:00.000Z', hanh: 'ghichu', lyDo: 'đối chiếu', nguoi: 'KT'}); });
  ({app, w} = await launch({HAKQN_LOT_FILE: fNk}));
  // lô A trên máy đang chốt (chỉ đọc): thay bằng bản trong file phải mở khóa có lý do trước (quy tắc khóa giữ nguyên)
  await openLo(w, 'fa', 'xuat'); await w.waitForSelector('#chotBox'); await w.fill('#chotLyDo', 'Khôi phục bản sao lưu để đối chiếu'); await w.click('[data-act=chotMoKhoa]'); await w.waitForTimeout(700);
  ok('mở khóa lô A có lý do, ghi nhật ký', await w.evaluate(() => { const f = window.hak.loadSync().db.rs.own1.forests.fa; return !f.chot && f.nhatKy.some(x => x.hanh === 'mokhoa' && /đối chiếu/.test(x.lyDo)); }));
  await w.click('#navSet'); await w.click('#setTab_setbk'); await w.click('#lotRestoreBtn'); await w.waitForSelector('[data-act=lotGo]');
  await w.check('input[name=lotAct][value=thay]'); await w.click('[data-act=lotGo]'); await w.waitForTimeout(700);
  await openLo(w, 'fa'); const fa2 = await w.evaluate(() => window.hak.loadSync().db.rs.own1.forests.fa);
  ok('gói có nhật ký / lưu trữ đổi sau khi chốt: khôi phục được, lô nguyên vẹn, chỉ đọc, phiên bản chốt 1, có lưu trữ', !(await banner(w)) && !!(await w.$('#loKhoaBar')) && /phiên bản 1/.test(await w.innerText('#loKhoaBar')) && !!fa2.luuTru && fa2.chot.phienBan === 1, JSON.stringify(fa2.chot));
  await app.close();
  const cu = lot('fe', 'R-E', {exp: EXP1, pc: PC.map(p => Object.assign({}, p, {soPhieu: 'E-' + p.soPhieu})), kl: 29.75}); delete cu.doi; V.chot(cu, 'Kế toán', '2026-06-01T00:00:00.000Z', []); delete cu.chot.hashDL;
  const pkgCu = L.exportLot({rs: {own2: {id: 'own2', info: {ma: 'CR-02', ten: 'TRẦN HAI', cccd: '049067000222'}, forests: {fe: cu}}}}, 'own2', 'fe', {now: '2026-06-02T00:00:00.000Z', version: '2.2.0'});
  const fCu = path.join(dir, 'goi-ban-cu.json'); fs.writeFileSync(fCu, JSON.stringify(L.seal(pkgCu, sha), null, 2));
  ({app, w} = await launch({HAKQN_LOT_FILE: fCu}));
  await w.click('#navSet'); await w.click('#setTab_setbk'); await w.click('#lotRestoreBtn'); await w.waitForTimeout(700);
  ok('gói do bản cũ tạo (lô chưa có đội, chưa có dấu vân tay phần dữ liệu): xem trước không báo lỗi toàn vẹn', !!(await w.$('[data-act=lotGo]')) && !(await w.$('#lotDung')), (await w.innerText('#impBody')).slice(0, 300));
  await w.click('[data-act=lotGo]'); await w.waitForTimeout(700);
  const fe = (await w.evaluate(() => window.hak.loadSync().db)).rs;
  const owE = Object.keys(fe).find(k => fe[k].forests && fe[k].forests.fe);
  await w.click('[data-open=' + owE + ']'); await w.click('[data-tab=rung]'); await w.click('[data-forest=fe]'); await w.click('[data-ftab=nc]'); await w.waitForTimeout(300);
  ok('lô từ gói bản cũ: chỉ đọc, phiên bản chốt 1, nguyên vẹn (không báo nhầm do khác định dạng)', !!(await w.$('#loKhoaBar')) && /phiên bản 1/.test(await w.innerText('#loKhoaBar')) && !(await banner(w)), await w.innerText('#loKhoaBar'));
  ok('không có lỗi JavaScript', w.errs.length === 0, w.errs.join('|'));
  await app.close();
  // khôi phục TOÀN BỘ từ bản sao lưu có một lô đã chốt mang gói hỏng: dừng ở xem trước, mọi cách xử lý (kể cả thay toàn bộ) bị khóa
  {
    ({app, w} = await launch()); const full = await w.evaluate(() => window.hak.loadSync().db);
    const g = JSON.parse(fs.readFileSync(fileA, 'utf8')).lo; g.chot.goi = g.chot.goi.slice(0, 50); full.rs.own1.forests.fa = g;
    const fFull = path.join(dir, 'sao_luu_toan_bo_hong.json'); fs.writeFileSync(fFull, JSON.stringify(full)); const truoc = anh();
    await w.click('#navSet'); await w.click('#setTab_setbk'); await w.setInputFiles('input[data-file=restore]', fFull); await w.waitForSelector('#impBox.on'); await w.waitForTimeout(300);
    const t = await w.innerText('#impBody');
    ok('khôi phục toàn bộ có lô chốt gói hỏng: báo ở xem trước, không có nút Thực hiện, mọi cách xử lý bị khóa', !!(await w.$('#impToanVen')) && /R-A/.test(t) && !(await w.$('[data-act=impGo]')) && (await w.$$('input[name=impStrat]:not([disabled])')).length === 0, t.slice(0, 300));
    const r = await w.evaluate(async d => window.hak.importApply(d, 'replace', {}), full);
    ok('  ghi thẳng (thay toàn bộ) cũng bị chặn (GOI_HONG), SQLite giữ nguyên', r && !r.ok && r.code === 'GOI_HONG' && anh() === truoc, JSON.stringify(r).slice(0, 200));
    ok('  không có lỗi JavaScript', w.errs.length === 0, w.errs.join('|'));
    await app.close();
  }
  const anhCuoi = anh(); ({app, w} = await launch()); await app.close();
  ok('đóng mở lại sau các ca khôi phục: SQLite không đổi', anh() === anhCuoi);
  console.log(fail ? 'CÓ ' + fail + ' LỖI' : 'TẤT CẢ ĐẠT'); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
