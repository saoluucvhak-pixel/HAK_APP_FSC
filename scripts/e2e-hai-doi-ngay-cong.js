'use strict';
/* NGHIỆM THU hồ sơ giao khoán HAI ĐỘI tính theo NGÀY CÔNG bằng file Word xuất thực tế (Electron thật, SQLite thật). Đọc nội dung DOCX (XML), không chỉ tên file.
 * BẢNG TÍNH TAY (lập trước khi chạy app; tiền = làm tròn(đơn giá × số công), làm tròn nửa lên từng người, tổng đội = tổng từng người):
 *   Đội 1 (Tổ trưởng TRẦN MỘT 400.000): TT 12 công = 4.800.000 · LÊ CƯA 350.000 × 11,5 = 4.025.000 · PHẠM KT BA 333.333 × 10 = 3.333.330 · ĐỖ KT BỐN 333.333 × 9,5 = 3.166.663,5 → 3.166.664
 *     tổng Đội 1 = 15.324.994 (4 người, 43 công)
 *   Đội 2 (Tổ trưởng NGUYỄN HAI 400.000): TT 11 công = 4.400.000 · HỒ KT SÁU 333.333 × 9,5 = 3.166.664 · tổng Đội 2 = 7.566.664 (2 người, 20,5 công)
 *   Hai đội = 22.891.658 (6 người, 63,5 công, không người nào ở hai đội)
 * Chạy: xvfb-run -a node scripts/e2e-hai-doi-ngay-cong.js */
const {_electron: electron} = require('playwright-core');
const path = require('path'), fs = require('fs'), os = require('os');
const JSZip = require('jszip');
const src = fs.readFileSync(path.join(__dirname, 'e2e-inan2.js'), 'utf8');
const {nv, lot, seed, P} = new Function(src.slice(src.indexOf('const nv ='), src.indexOf('const plain =')) + '; return {nv, lot, seed, P};')();
const root = path.join(__dirname, '..'), dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hakqn-2dnc-')), out = path.join(dir, 'out');
let fail = 0; const ok = (name, cond, extra) => { console.log((cond ? 'ĐẠT  ' : 'LỖI  ') + name + (!cond && extra ? ' — ' + extra : '')); if (!cond) fail++; };
const txt = s => s.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&');
const rowsOf = xml => (xml.match(/<w:tr[ >][\s\S]*?<\/w:tr>/g) || []).map(tr => (tr.match(/<w:tc>[\s\S]*?<\/w:tc>/g) || []).map(tc => txt((tc.match(/<w:t[ >][^<]*<\/w:t>|<w:t>[^<]*<\/w:t>/g) || []).join(' ')).replace(/\s+/g, ' ').trim()));
const plain = xml => (xml.match(/<w:t[^>]*>([^<]*)<\/w:t>/g) || []).map(a => a.replace(/<[^>]+>/g, '')).join(' ');
const grp = n => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
const SO = s => Number(String(s).replace(/\./g, '').replace(',', '.'));
const TAY = {   // bảng tính tay: cccd → {doi, ten, vi tri, don gia, so cong (ngày: giá trị), tien}
  '049085007001': {doi: 'Đội 1', ten: 'TRẦN MỘT', rate: 400000, cong: 12, tien: 4800000}, '049085007002': {doi: 'Đội 1', ten: 'LÊ CƯA', rate: 350000, cong: 11.5, tien: 4025000},
  '049085007003': {doi: 'Đội 1', ten: 'PHẠM KT BA', rate: 333333, cong: 10, tien: 3333330}, '049085007004': {doi: 'Đội 1', ten: 'ĐỖ KT BỐN', rate: 333333, cong: 9.5, tien: 3166664},
  '049085007005': {doi: 'Đội 2', ten: 'NGUYỄN HAI', rate: 400000, cong: 11, tien: 4400000}, '049085007006': {doi: 'Đội 2', ten: 'HỒ KT SÁU', rate: 333333, cong: 9.5, tien: 3166664}};
const TONG = {'Đội 1': 15324994, 'Đội 2': 7566664}, TONG_ALL = 22891658;
const NGAY = {   // chấm công tháng 10/2026: cccd → {ngày: công}; Chủ nhật 4, 11, 18 không làm
  '049085007001': {5: 1, 6: 1, 7: 1, 8: 1, 9: 1, 10: 1, 12: 1, 13: 1, 14: 1, 15: 1, 16: 1, 17: 1}, '049085007002': {5: 1, 6: 1, 7: 1, 8: 1, 9: 1, 10: 1, 12: 1, 13: 1, 14: 1, 15: 1, 16: 1, 17: 0.5},
  '049085007003': {5: 1, 6: 1, 7: 1, 8: 1, 9: 1, 10: 1, 12: 1, 13: 1, 14: 1, 15: 1}, '049085007004': {5: 1, 6: 1, 7: 1, 8: 1, 9: 1, 10: 1, 12: 1, 13: 1, 14: 1, 15: 0.5},
  '049085007005': {5: 1, 6: 1, 7: 1, 8: 1, 9: 1, 10: 1, 12: 1, 13: 1, 14: 1, 15: 1, 16: 1}, '049085007006': {5: 1, 6: 1, 7: 1, 8: 1, 9: 1, 10: 1, 12: 1, 13: 1, 14: 1, 17: 0.5}};
const launch = () => electron.launch({executablePath: require('electron'), args: [root, '--no-sandbox'], env: {...process.env, HAKQN_CLOSE: 'discard', HAKQN_DB: path.join(dir, 'd.sqlite'), HAKQN_USERDATA: path.join(dir, 'ud'), HAKQN_DOWNLOAD_DIR: out}});
(async () => {
  fs.mkdirSync(out, {recursive: true});
  let app = await launch(), w = require('./_hd30').boc(await app.firstWindow()); const errs = []; w.on('pageerror', e => errs.push(e.message)); w.on('dialog', d => d.accept()); await w.waitForSelector('#side');
  const p = (i, vai, ten, cd, doi) => ({...nv(i, vai, ten, cd, '04908500' + String(7000 + i)), maRung: 'R-A', doi});
  const nc = [p(1, 'Tổ trưởng', 'TRẦN MỘT', 'Tổ trưởng', 'Đội 1'), p(2, 'Công nhân', 'LÊ CƯA', 'Công nhân cưa', 'Đội 1'), p(3, 'Công nhân', 'PHẠM KT BA', 'Công nhân khai thác', 'Đội 1'), p(4, 'Công nhân', 'ĐỖ KT BỐN', 'Công nhân khai thác', 'Đội 1'),
    p(5, 'Tổ trưởng', 'NGUYỄN HAI', 'Tổ trưởng', 'Đội 2'), p(6, 'Công nhân', 'HỒ KT SÁU', 'Công nhân khai thác', 'Đội 2')];
  const pcs = [P(1, '05/10/2026', '92C-12345', 'PA1', 12.5, 'Đội 1'), P(2, '06/10/2026', '92C-67890', 'PA2', 9.25, 'Đội 2')];
  const A = lot('fa', 'R-A', {exp: {soKT: '015', ngayKy: '02/10/2026', ntNgay: '20/12/2026', pcNgay: '20/12/2026'}, kl: null, nc, pc: pcs.map(x => ({...x, maRung: 'R-A'}))});
  Object.assign(A.info, {hinhThucLuong: 'ngaycong', donGiaNgay: {'Tổ trưởng': 400000, 'Công nhân cưa': 350000, 'Công nhân khai thác': 333333}, tuNgay: '05/10/2026', denNgay: '20/10/2026'});
  A.cc = {'2026-10': NGAY};
  await w.evaluate(d => window.hak.save(d), seed([A])); await w.reload(); await w.waitForSelector('#side');
  { const D0 = await w.evaluate(() => window.hak.loadSync().db), f0 = D0.rs.own1.forests.fa, id = ten => f0.doi.find(d => d.ten === ten).id; f0.pc.forEach(x => { x.doiId = id(x.soPhieu === 'PA2' ? 'Đội 2' : 'Đội 1'); }); await w.evaluate(d => window.hak.save(d), D0); }
  const luu = async () => { await w.reload(); await w.waitForSelector('#side'); await w.click('[data-open=own1]'); await w.click('[data-tab=rung]'); await w.click('[data-forest=fa]'); };
  await luu();
  const F0 = (await w.evaluate(() => window.hak.loadSync().db)).rs.own1.forests.fa;
    ok('lô giao khoán hai đội, tính theo ngày công; quân số 4 và 2 người; không người nào ở hai đội', F0.doi.length === 2 && F0.doi.every(d => ((d.hinhThuc || {}).hinhThucLuong || F0.info.hinhThucLuong) === 'ngaycong') && F0.nc.length === 6 && new Set(F0.nc.map(r => r.cccd)).size === 6 && F0.nc.filter(r => r.doiId === F0.doi[0].id).length + F0.nc.filter(r => r.doiId === F0.doi[1].id).length === 6);
  const clear = () => { for (const f of fs.readdirSync(out)) fs.unlinkSync(path.join(out, f)); };
  const waitFiles = async (n, ext) => { let l = []; for (let i = 0; i < 120; i++) { l = fs.readdirSync(out).filter(x => x.endsWith(ext)); if (l.length >= n) break; await w.waitForTimeout(200); } await w.waitForTimeout(400); return l; };
  const docs = async () => {   // xuất gói toàn bộ + bảng chấm công đã nhập (BM-05) → {tên: xml}
    clear(); await w.click('[data-ftab=xuat]'); await w.waitForTimeout(400); await w.click('button[data-act=dl][data-kind=all]');
    const z = (await waitFiles(1, '.zip'))[0], zip = await JSZip.loadAsync(fs.readFileSync(path.join(out, z))), o = {};
    for (const n of Object.keys(zip.files).filter(n => /\.docx$/.test(n))) o[n] = await (await JSZip.loadAsync(await zip.file(n).async('nodebuffer'))).file('word/document.xml').async('string');
    clear(); await w.click('[data-ftab=nc]'); await w.waitForTimeout(500); await w.click('[data-act=ccPrint]'); const cc = await waitFiles(2, '.docx');
    for (const n of cc) o['CC/' + n] = await (await JSZip.loadAsync(fs.readFileSync(path.join(out, n)))).file('word/document.xml').async('string');
    return o;
  };
  const kiem = (tenLan, o) => {
    const names = Object.keys(o);
    const gk = names.filter(n => /^01_HD_Giao_khoan\//.test(n)), bm08 = names.filter(n => /^08_/.test(n)), bm14 = names.filter(n => /^14_/.test(n)), bm05 = names.filter(n => /^CC\//.test(n));
    const doiOfFile = n => (/Doi_1|_Doi_1/i.test(n) ? 'Đội 1' : /Doi_2|_Doi_2/i.test(n) ? 'Đội 2' : '?');
    ok(tenLan + ': đủ 2 file mỗi biểu mẫu BM-01, BM-08, BM-14 và 2 file BM-05 (một đội một file)', gk.length === 2 && bm08.length === 2 && bm14.length === 2 && bm05.length === 2, names.join(', '));
    // BM-01: số hợp đồng riêng từng đội
    const so1 = plain(o[gk.find(n => /Doi_1/i.test(n))]), so2 = plain(o[gk.find(n => /Doi_2/i.test(n))]);
    ok(tenLan + ': BM-01 số hợp đồng riêng từng đội (015.1/2026-KT và 015.2/2026-KT), không lẫn', /015\.1\/2026-KT/.test(so1) && !/015\.2\/2026-KT/.test(so1) && /015\.2\/2026-KT/.test(so2) && !/015\.1\/2026-KT/.test(so2), so1.slice(0, 300));
    // BM-05 (chấm công đã nhập): đúng người và số công của từng đội
    const bm05d = {}; bm05.forEach(n => { const d = /Doi[_ ]?1|doi-1|Đội_1|_Doi_1/i.test(n) ? 'Đội 1' : 'Đội 2'; bm05d[d] = o[n]; });
    const tong05 = {};
    ['Đội 1', 'Đội 2'].forEach(d => {
      const rows = rowsOf(bm05d[d]).filter(r => r.length > 30 && /^\d+$/.test(r[0])), ten = rows.map(r => r[1]), exp = Object.values(TAY).filter(x => x.doi === d).map(x => x.ten);
      ok(tenLan + ': BM-05 ' + d + ' có đúng ' + exp.length + ' người của đội, không người của đội kia', JSON.stringify(ten.slice().sort()) === JSON.stringify(exp.slice().sort()), JSON.stringify(ten));
      rows.forEach(r => { const t = Object.values(TAY).find(x => x.ten === r[1]), cong = SO(r[r.length - 1]); tong05[r[1]] = cong; });
      ok(tenLan + ': BM-05 ' + d + ' số công từng người khớp bảng tính tay', rows.every(r => { const t = Object.values(TAY).find(x => x.ten === r[1]); return t && SO(r[r.length - 1]) === t.cong; }), JSON.stringify(rows.map(r => [r[1], r[r.length - 1]])));
    });
    // BM-08: từng dòng và tổng đội
    const tong08 = {};
    bm08.forEach(n => {
      const d = doiOfFile(n), rows = rowsOf(o[n]);
      const dong = {}; rows.filter(r => r.length >= 7).forEach(r => { const t = Object.values(TAY).find(x => r.some(c => c.toUpperCase() === x.ten)); if (t) dong[t.ten] = r; });
      const dung = Object.values(TAY).filter(x => x.doi === d);
      ok(tenLan + ': BM-08 ' + d + ' có đúng ' + dung.length + ' dòng người của đội', Object.keys(dong).length === dung.length && dung.every(x => dong[x.ten]), JSON.stringify(Object.keys(dong)));
      dung.forEach(x => { const r = dong[x.ten] || [], nums = r.map(c => SO(c)).filter(v => !isNaN(v)); ok(tenLan + ': BM-08 ' + d + ' · ' + x.ten + ': đơn giá ' + grp(x.rate) + ', số công ' + x.cong + ', thành tiền ' + grp(x.tien), nums.includes(x.rate) && nums.includes(x.cong) && nums.includes(x.tien), JSON.stringify(r)); });
      const t = plain(o[n]); ok(tenLan + ': BM-08 ' + d + ' tổng đội ' + grp(TONG[d]) + ' (khớp tổng từng dòng)', t.includes(grp(TONG[d])), t.slice(-400)); tong08[d] = TONG[d];
    });
    // BM-14: khoản tiền công khớp BM-08
    bm14.forEach(n => { const d = doiOfFile(n), t = plain(o[n]); ok(tenLan + ': BM-14 ' + d + ' khoản tiền công ' + grp(TONG[d]) + ' khớp BM-08; không có tổng đội kia', t.includes(grp(TONG[d])) && !t.includes(grp(TONG[d === 'Đội 1' ? 'Đội 2' : 'Đội 1'])), t.slice(0, 600));
      ok(tenLan + ': BM-14 ' + d + ' nêu số hợp đồng đúng của đội', t.includes('015.' + (d === 'Đội 1' ? 1 : 2) + '/2026-KT') && !t.includes('015.' + (d === 'Đội 1' ? 2 : 1) + '/2026-KT'), t.slice(0, 300)); });
    ok(tenLan + ': tổng hai đội = ' + grp(TONG_ALL) + ' (= ' + grp(TONG['Đội 1']) + ' + ' + grp(TONG['Đội 2']) + '), không cộng trùng người hoặc số công (63,5 công, 6 người)', TONG['Đội 1'] + TONG['Đội 2'] === TONG_ALL && Object.values(TAY).reduce((s, x) => s + x.tien, 0) === TONG_ALL && Object.values(TAY).reduce((s, x) => s + x.cong, 0) === 63.5);
    return o;
  };
  const o1 = kiem('lần 1', await docs());
  if (process.env.DUMP) { Object.entries(o1).filter(([n]) => /^(08|14)_|^CC\//.test(n)).slice(0, 6).forEach(([n, x]) => console.log('## ' + n + '\n' + JSON.stringify(rowsOf(x).slice(0, 12)) + '\n' + plain(x).slice(0, 1500))); }
  // đóng và mở lại app, xuất lại: số liệu giữ nguyên
  await app.close(); app = await launch(); w = require('./_hd30').boc(await app.firstWindow()); w.on('pageerror', e => errs.push(e.message)); w.on('dialog', d => d.accept()); await w.waitForSelector('#side');
  await w.click('[data-open=own1]'); await w.click('[data-tab=rung]'); await w.click('[data-forest=fa]');
  const o2 = kiem('sau khi đóng mở lại app', await docs());
  const so = (a, b) => Object.keys(a).filter(n => !/^CC\//.test(n)).every(n => a[n] === b[n]);
  ok('xuất lại sau khi mở lại: nội dung BM-01, 08, 14 giống từng byte lần trước', ['01_HD_Giao_khoan', '08_', '14_'].every(k => Object.keys(o1).filter(n => n.startsWith(k)).every(n => o1[n] === o2[n])));
  ok('không có lỗi script trên màn hình', errs.length === 0, errs.join(' | '));
  await app.close(); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
