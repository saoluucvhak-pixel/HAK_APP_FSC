'use strict';
/* NÂNG CẤP ĐÈ từ v1.4.33 (mã nguồn đúng thẻ v1.4.33) lên bản hiện tại trên CÙNG một file SQLite: tạo hồ sơ một đội bằng bản cũ, xuất gói hồ sơ, đóng; mở bằng bản mới (tự sao lưu và nâng cấp cấu trúc);
 * đối chiếu chức danh, đơn giá, định mức BHLĐ, số hợp đồng và NỘI DUNG từng file Word xuất trước và sau. Ghi chú: chạy Electron từ mã nguồn trên Linux, KHÔNG phải bộ cài NSIS Windows.
 *   HAKQN_ROOT_CU=/đường/dẫn/v1.4.33 xvfb-run -a node scripts/e2e-cai-de.js */
const {_electron: electron} = require('playwright-core');
const path = require('path'), fs = require('fs'), os = require('os'), crypto = require('crypto');
const JSZip = require('jszip');
const src = fs.readFileSync(path.join(__dirname, 'e2e-inan2.js'), 'utf8');
const {lot, seed, PC, EXP1} = new Function(src.slice(src.indexOf('const nv ='), src.indexOf('const plain =') + src.slice(src.indexOf('const plain =')).indexOf('\n')) + '; return {lot, seed, PC, EXP1};')();
const rootMoi = path.join(__dirname, '..'), rootCu = process.env.HAKQN_ROOT_CU;
if (!rootCu || !fs.existsSync(path.join(rootCu, 'package.json'))) { console.log('BỎ QUA  cần HAKQN_ROOT_CU trỏ tới mã nguồn v1.4.33 (git worktree add <thư mục> v1.4.33)'); process.exit(0); }
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hakqn-cd-')), out = path.join(dir, 'out'), dbFile = path.join(dir, 'd.sqlite');
let fail = 0; const ok = (name, cond, extra) => { console.log((cond ? 'ĐẠT  ' : 'LỖI  ') + name + (!cond && extra ? ' — ' + extra : '')); if (!cond) fail++; };
const sha = s => crypto.createHash('sha256').update(s).digest('hex').slice(0, 16);
const launch = root => electron.launch({executablePath: require(path.join(root, 'node_modules', 'electron')), args: [root, '--no-sandbox'], env: {...process.env, HAKQN_CLOSE: 'discard', HAKQN_DB: dbFile, HAKQN_USERDATA: path.join(dir, 'ud'), HAKQN_DOWNLOAD_DIR: out}});
const gom = async w => {   // mở lô, xuất gói toàn bộ, trả {tên file: xml}
  await w.waitForSelector('#side'); await w.click('[data-open=own1]'); await w.click('[data-tab=rung]'); await w.click('[data-forest=fa]'); await w.click('[data-ftab=xuat]'); await w.waitForTimeout(500);
  for (const f of fs.readdirSync(out)) fs.unlinkSync(path.join(out, f));
  await w.click('button[data-act=dl][data-kind=all]:not([disabled])'); let f = null; for (let i = 0; i < 150 && !f; i++) { f = fs.readdirSync(out).find(x => x.endsWith('.zip')); await w.waitForTimeout(200); } await w.waitForTimeout(500);
  const z = await JSZip.loadAsync(fs.readFileSync(path.join(out, f))), o = {};
  for (const n of Object.keys(z.files).filter(n => /\.docx$/.test(n))) o[n] = await (await JSZip.loadAsync(await z.file(n).async('nodebuffer'))).file('word/document.xml').async('string');
  return o;
};
const tomTat = db => { const f = db.rs.own1.forests.fa, i = f.info; return {chucDanh: f.nc.map(r => r.ten + '|' + r.chucDanh + '|' + r.vaiTro), donGiaTan: i.donGiaTan, hinhThucLuong: i.hinhThucLuong, dinhMucBHLD: JSON.stringify(db.dinhMuc), soKT: (f.exp || {}).soKT, soVC: (f.exp || {}).soVC, soPhieu: f.pc.map(p => p.soPhieu + '|' + p.kl).join(','), xe: f.dx.map(x => x.bienSo).join(',')}; };
(async () => {
  fs.mkdirSync(out, {recursive: true});
  // ---- bản CŨ v1.4.33 ----
  let app = await launch(rootCu), w = require('./_hd30').boc(await app.firstWindow()); const errs = []; w.on('pageerror', e => errs.push(e.message)); w.on('dialog', d => d.accept()); await w.waitForSelector('#side');
  const ver0 = await app.evaluate(({app}) => app.getVersion()); ok('bản cũ đang chạy là v1.4.33', ver0 === '1.4.33', ver0);
  const A = lot('fa', 'R-A', {exp: EXP1, pc: PC, kl: 29.75}); A.info.donGiaTan = {'Tổ trưởng': 420000, 'Công nhân cưa': 380000, 'Công nhân khai thác': 330000};
  const D = seed([A]); const sv = await w.evaluate(d => window.hak.save(d), D); ok('bản cũ ghi hồ sơ một đội vào SQLite', sv && sv.ok, JSON.stringify(sv));
  await w.reload(); const cu = await gom(w), dbCu = await w.evaluate(() => window.hak.loadSync().db), tCu = tomTat(dbCu);
  ok('bản cũ xuất được gói hồ sơ (≥ 10 file Word)', Object.keys(cu).length >= 10, Object.keys(cu).join(', '));
  await app.close();
  const kichThuoc0 = fs.statSync(dbFile).size;
  // ---- bản MỚI mở đúng file đó ----
  app = await launch(rootMoi); w = require('./_hd30').boc(await app.firstWindow()); w.on('pageerror', e => errs.push(e.message)); w.on('dialog', d => d.accept());
  const ver1 = await app.evaluate(({app}) => app.getVersion()); ok('bản mới đang chạy (không phải 1.4.33): ' + ver1, ver1 !== '1.4.33', ver1);
  const moi = await gom(w), dbMoi = await w.evaluate(() => window.hak.loadSync().db), tMoi = tomTat(dbMoi);
  const bk = fs.existsSync(path.join(dir, 'backups')) ? fs.readdirSync(path.join(dir, 'backups')) : [], bk2 = fs.existsSync(path.join(dir, 'ud')) ? fs.readdirSync(path.join(dir, 'ud')) : [];
  ok('có tệp sao lưu trước khi nâng cấp (truoc-nang-cap-*)', [...bk, ...bk2, ...fs.readdirSync(dir)].some(x => /truoc-nang-cap/.test(x)) || (function find(d) { try { return fs.readdirSync(d, {withFileTypes: true}).some(e => /truoc-nang-cap/.test(e.name) || (e.isDirectory() && find(path.join(d, e.name)))); } catch (e) { return false; } })(dir), 'không thấy trong ' + dir);
  ok('chức danh, vai trò, họ tên từng người giữ nguyên', JSON.stringify(tCu.chucDanh) === JSON.stringify(tMoi.chucDanh), JSON.stringify([tCu.chucDanh, tMoi.chucDanh]));
  ok('đơn giá (đồng/tấn theo vị trí) và hình thức giữ nguyên', JSON.stringify(tCu.donGiaTan) === JSON.stringify(tMoi.donGiaTan) || JSON.stringify(dbMoi.rs.own1.forests.fa.doi[0].hinhThuc.donGiaTan) === JSON.stringify(tCu.donGiaTan), JSON.stringify([tCu.donGiaTan, tMoi.donGiaTan, dbMoi.rs.own1.forests.fa.doi[0].hinhThuc]));
  ok('định mức BHLĐ giữ nguyên', tCu.dinhMucBHLD === tMoi.dinhMucBHLD);
  ok('số hợp đồng (số khai thác, số vận chuyển), phiếu cân, xe giữ nguyên', tCu.soPhieu === tMoi.soPhieu && tCu.xe === tMoi.xe && (tCu.soKT || '') === ((dbMoi.rs.own1.forests.fa.doi[0].exp || {}).soKT || tMoi.soKT || '') , JSON.stringify([tCu, tMoi.soKT, dbMoi.rs.own1.forests.fa.doi[0].exp]));
  const ten = Object.keys(cu).sort(), tenM = Object.keys(moi).sort();
  ok('gói xuất của bản mới có đủ các file như bản cũ (không mất biểu mẫu)', ten.every(n => tenM.includes(n)), JSON.stringify(ten.filter(n => !tenM.includes(n))));
  // BM-14 đổi đúng một đoạn: sau tiêu đề Điều 1 bỏ mã lô, giữ phần còn lại của XML.
  const bm14 = ten.find(n => n.startsWith('14_BB_nghiem_thu_thanh_ly_'));
  const boMaRung = xml => xml.replace(
    /(Thông tin rừng đã khai thác(?:(?!<\/w:p>).)*<\/w:p>\s*<w:p(?:\s[^>]*)?>(?:(?!<\/w:p>).)*?)Mã rừng: R-A\. (?=Địa điểm:)/s,
    '$1'
  );
  const bm14Cu = bm14 && cu[bm14], bm14Moi = bm14Cu && boMaRung(bm14Cu);
  ok('BM-14: chỉ bỏ mã rừng trong đoạn ngay sau tiêu đề Điều 1', !!bm14Moi && bm14Moi !== bm14Cu && bm14Moi === moi[bm14]);
  const khac = ten.filter(n => moi[n] !== undefined && sha(n === bm14 ? bm14Moi : cu[n]) !== sha(moi[n]));
  const tien = x => new Set((x.replace(/<[^>]+>/g, ' ').match(/\b\d{1,3}(?:\.\d{3})+(?:,\d+)?\b|\b\d+,\d+\b/g) || []));
  // Bỏ “Mã rừng” khỏi mọi mẫu in (yêu cầu 28/11/2026): file chỉ được khác ở chỗ mã rừng và dấu phân cách đi kèm; số tiền, số công, số hợp đồng vẫn phải còn nguyên (kiểm ở `mat` bên dưới)
  const chiBoMaRung = n => { const t = x => x.replace(/<[^>]+>/g, '').replace(/Mã rừng:?\s*R-A/g, '').replace(/Rừng:?\s*(?:R-A|…+)/g, '').replace(/R-A/g, '').replace(/[\s·.,:;…]+/g, ''); return t(cu[n]) === t(moi[n]); };
  const mat = khac.filter(n => [...tien(cu[n])].some(v => !tien(moi[n]).has(v)));
  ok('NỘI DUNG file Word: ' + (ten.length - khac.length) + '/' + ten.length + ' file khớp sau khi đối chiếu riêng BM-14; ' + khac.length + ' file khác (' + khac.join(', ') + ') chỉ BỔ SUNG diễn giải đơn giá khoán bình quân từ định biên (tính năng 2.0) hoặc chỉ bỏ mã rừng: mọi số tiền, số công, số hợp đồng của bản cũ còn nguyên trong bản mới', mat.length === 0 && khac.every(n => /^(01_|08_|20_)/.test(n) || chiBoMaRung(n)), JSON.stringify({khac, matSo: mat}));
  if (process.env.DIFF) khac.forEach(n => { const t = x => x.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' '); const a = t(cu[n]).split(/(?<=[.;:])\s/), b = t(moi[n]).split(/(?<=[.;:])\s/); console.log('## ' + n); a.filter(x => !b.includes(x)).forEach(x => console.log('  CŨ : ' + x.slice(0, 260))); b.filter(x => !a.includes(x)).forEach(x => console.log('  MỚI: ' + x.slice(0, 260))); });
  ok('không có lỗi script trên màn hình', errs.length === 0, errs.join(' | '));
  await app.close(); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
