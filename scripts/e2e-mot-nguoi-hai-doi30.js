'use strict';
/* 3.0 · R4: MỘT NGƯỜI Ở HAI ĐỘI, vị trí và ngày công khác nhau — tổng người, ngày công, tiền công đúng ở TỪNG đội (Electron thật, SQLite thật).
 * Đọc nội dung DOCX xuất thực tế (BM-05 chấm công, BM-08, BM-14).
 * BẢNG TÍNH TAY (lập trước khi chạy; tiền = đơn giá × số công; hình thức tính theo ngày công):
 *   Đội 1: TRẦN MỘT (Tổ trưởng 400.000) 12 công = 4.800.000 · DÙNG CHUNG (Công nhân khai thác 333.333) 10 công = 3.333.330
 *          tổng Đội 1 = 8.133.330 (2 người, 22 công)
 *   Đội 2: NGUYỄN HAI (Tổ trưởng 400.000) 11 công = 4.400.000 · DÙNG CHUNG (Công nhân cưa 350.000) 8,5 công = 2.975.000
 *          tổng Đội 2 = 7.375.000 (2 người, 19,5 công)
 *   Hai đội = 15.508.330 (4 dòng thành viên, 3 người thật — DÙNG CHUNG (CCCD 049085007003) có hai dòng, chấm công riêng từng dòng, không cộng trùng)
 * Chạy: xvfb-run -a node scripts/e2e-mot-nguoi-hai-doi30.js */
const {_electron: electron} = require('playwright-core');
const path = require('path'), fs = require('fs'), os = require('os');
const JSZip = require('jszip');
const CC = require('../src/chamcong');
const src = fs.readFileSync(path.join(__dirname, 'e2e-inan2.js'), 'utf8');
const {nv, lot, seed, P} = new Function(src.slice(src.indexOf('const nv ='), src.indexOf('const plain =')) + '; return {nv, lot, seed, P};')();
const root = path.join(__dirname, '..'), dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hakqn-1n2d-')), out = path.join(dir, 'out');
let fail = 0; const ok = (name, cond, extra) => { console.log((cond ? 'ĐẠT  ' : 'LỖI  ') + name + (!cond && extra ? ' — ' + extra : '')); if (!cond) fail++; };
const txt = s => s.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&');
const rowsOf = xml => (xml.match(/<w:tr[ >][\s\S]*?<\/w:tr>/g) || []).map(tr => (tr.match(/<w:tc>[\s\S]*?<\/w:tc>/g) || []).map(tc => txt((tc.match(/<w:t[ >][^<]*<\/w:t>|<w:t>[^<]*<\/w:t>/g) || []).join(' ')).replace(/\s+/g, ' ').trim()));
const plain = xml => (xml.match(/<w:t[^>]*>([^<]*)<\/w:t>/g) || []).map(a => a.replace(/<[^>]+>/g, '')).join(' ');
const grp = n => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
const SO = s => Number(String(s).replace(/\./g, '').replace(',', '.'));
const CHUNG = '049085007003';   // CCCD của người ở hai đội
const TAY = {   // đội → danh sách {ten, cccd, rate, cong, tien}
  'Đội 1': [{ten: 'TRẦN MỘT', rate: 400000, cong: 12, tien: 4800000}, {ten: 'DÙNG CHUNG', rate: 333333, cong: 10, tien: 3333330}],
  'Đội 2': [{ten: 'NGUYỄN HAI', rate: 400000, cong: 11, tien: 4400000}, {ten: 'DÙNG CHUNG', rate: 350000, cong: 8.5, tien: 2975000}]};
const TONG = {'Đội 1': 8133330, 'Đội 2': 7375000}, TONG_ALL = 15508330;
// chấm công tháng 10/2026 (Chủ nhật 4, 11, 18, 25 không làm). Khóa = tên dòng; đổi sang ID dòng thành viên sau khi app nạp dữ liệu
const NGAY = {
  'Đội 1|TRẦN MỘT': {5: 1, 6: 1, 7: 1, 8: 1, 9: 1, 10: 1, 12: 1, 13: 1, 14: 1, 15: 1, 16: 1, 17: 1},
  'Đội 1|DÙNG CHUNG': {5: 1, 6: 1, 7: 1, 8: 1, 9: 1, 10: 1, 12: 1, 13: 1, 14: 1, 15: 1},
  'Đội 2|NGUYỄN HAI': {19: 1, 20: 1, 21: 1, 22: 1, 23: 1, 24: 1, 26: 1, 27: 1, 28: 1, 29: 1, 30: 1},
  'Đội 2|DÙNG CHUNG': {19: 1, 20: 1, 21: 1, 22: 1, 23: 1, 24: 1, 26: 1, 27: 1, 28: 0.5}};
const launch = () => electron.launch({executablePath: require('electron'), args: [root, '--no-sandbox'], env: {...process.env, HAKQN_CLOSE: 'discard', HAKQN_DB: path.join(dir, 'd.sqlite'), HAKQN_USERDATA: path.join(dir, 'ud'), HAKQN_DOWNLOAD_DIR: out}});
(async () => {
  fs.mkdirSync(out, {recursive: true});
  let app = await launch(), w = require('./_hd30').boc(await app.firstWindow()); const errs = []; w.on('pageerror', e => errs.push(e.message)); w.on('dialog', d => d.accept()); await w.waitForSelector('#side');
  const p = (i, vai, ten, cd, doi, cccd) => ({...nv(i, vai, ten, cd, cccd || '04908500' + String(7000 + i)), maRung: 'R-A', doi});
  const nc = [p(1, 'Tổ trưởng', 'TRẦN MỘT', 'Tổ trưởng', 'Đội 1'), p(3, 'Công nhân', 'DÙNG CHUNG', 'Công nhân khai thác', 'Đội 1', CHUNG),
    p(5, 'Tổ trưởng', 'NGUYỄN HAI', 'Tổ trưởng', 'Đội 2'), p(7, 'Công nhân', 'DÙNG CHUNG', 'Công nhân cưa', 'Đội 2', CHUNG)];
  const pcs = [P(1, '05/10/2026', '92C-12345', 'PA1', 12.5, 'Đội 1'), P(2, '19/10/2026', '92C-67890', 'PA2', 9.25, 'Đội 2')];
  const A = lot('fa', 'R-A', {exp: {soKT: '015', ngayKy: '02/10/2026', ntNgay: '31/12/2026', pcNgay: '31/12/2026'}, kl: null, nc, pc: pcs.map(x => ({...x, maRung: 'R-A'}))});
  Object.assign(A.info, {hinhThucLuong: 'ngaycong', donGiaNgay: {'Tổ trưởng': 400000, 'Công nhân cưa': 350000, 'Công nhân khai thác': 333333}, tuNgay: '05/10/2026', denNgay: '30/10/2026'});
  await w.evaluate(d => window.hak.save(d), seed([A])); await w.reload(); await w.waitForSelector('#side');
  // sau khi app nạp: gán phiếu theo đội và chấm công THEO ID DÒNG THÀNH VIÊN (một người ở hai đội có hai dòng, chấm riêng)
  { const D0 = await w.evaluate(() => window.hak.loadSync().db), f0 = D0.rs.own1.forests.fa, idDoi = ten => f0.doi.find(d => d.ten === ten).id;
    f0.pc.forEach(x => { x.doiId = idDoi(x.soPhieu === 'PA2' ? 'Đội 2' : 'Đội 1'); });
    const ten2doi = id => (f0.doi.find(d => d.id === id) || {}).ten;
    f0.cc = {'2026-10': {}}; f0.nc.forEach(r => { const k = ten2doi(r.doiId) + '|' + r.ten; if (NGAY[k]) f0.cc['2026-10'][r.id] = NGAY[k]; });
    await w.evaluate(d => window.hak.save(d), D0); }
  const F0 = (await w.evaluate(() => window.hak.loadSync().db)).rs.own1.forests.fa;
  const hai = F0.nc.filter(r => r.cccd === CHUNG);
  ok('một người (CCCD ' + CHUNG + ') có hai dòng thành viên ở hai đội khác nhau, ID dòng khác nhau, vị trí khác nhau', hai.length === 2 && new Set(hai.map(r => r.doiId)).size === 2 && hai[0].id && hai[1].id && hai[0].id !== hai[1].id && new Set(hai.map(r => r.chucDanh)).size === 2, JSON.stringify(hai.map(r => [r.id, r.doiId, r.chucDanh])));
  ok('4 dòng thành viên, 3 người thật; mỗi đội 2 dòng', F0.nc.length === 4 && new Set(F0.nc.map(r => r.cccd)).size === 3 && F0.doi.every(d => F0.nc.filter(r => r.doiId === d.id).length === 2));
  ok('chấm công lưu theo ID dòng (không theo CCCD): người ở hai đội có hai chuỗi ngày riêng', hai.every(r => F0.cc['2026-10'][r.id]) && CC.total(F0.cc, hai[0].id) !== CC.total(F0.cc, hai[1].id), JSON.stringify(hai.map(r => CC.total(F0.cc, r.id))));
  const cong = d => F0.nc.filter(r => r.doiId === F0.doi.find(x => x.ten === d).id).reduce((s, r) => s + CC.total(F0.cc, r.id), 0);
  ok('tổng ngày công từng đội theo dữ liệu: Đội 1 = 22, Đội 2 = 19,5 (không cộng trùng người ở hai đội)', cong('Đội 1') === 22 && cong('Đội 2') === 19.5, cong('Đội 1') + ' | ' + cong('Đội 2'));
  await w.reload(); await w.waitForSelector('#side'); await w.click('[data-open=own1]'); await w.click('[data-tab=rung]'); await w.click('[data-forest=fa]');
  const loi = await w.evaluate(() => window.__doiKT && window.__doiKT());
  ok('kiểm tra dữ liệu: không báo trùng CCCD giữa hai đội; quân số mỗi đội 2 người', !!loi && !(loi.loi || []).some(e => /trùng/i.test(e)) && loi.doi.every(d => d[1] === 2), JSON.stringify(loi && [loi.loi, loi.doi]));
  const clear = () => { for (const f of fs.readdirSync(out)) fs.unlinkSync(path.join(out, f)); };
  const waitFiles = async (n, ext) => { let l = []; for (let i = 0; i < 120; i++) { l = fs.readdirSync(out).filter(x => x.endsWith(ext)); if (l.length >= n) break; await w.waitForTimeout(200); } await w.waitForTimeout(400); return l; };
  const docs = async () => {
    clear(); await w.click('[data-ftab=xuat]'); await w.waitForTimeout(400); await w.click('button[data-act=dl][data-kind=all]');
    const z = (await waitFiles(1, '.zip'))[0], zip = await JSZip.loadAsync(fs.readFileSync(path.join(out, z))), o = {};
    for (const n of Object.keys(zip.files).filter(n => /\.docx$/.test(n))) o[n] = await (await JSZip.loadAsync(await zip.file(n).async('nodebuffer'))).file('word/document.xml').async('string');
    clear(); await w.click('[data-ftab=nc]'); await w.waitForTimeout(500); await w.click('[data-act=ccPrint]'); const cc = await waitFiles(2, '.docx');
    for (const n of cc) o['CC/' + n] = await (await JSZip.loadAsync(fs.readFileSync(path.join(out, n)))).file('word/document.xml').async('string');
    return o;
  };
  const kiem = (tenLan, o) => {
    const names = Object.keys(o), doiOf = n => (/Doi[_ ]?1|Đội_1/i.test(n) ? 'Đội 1' : /Doi[_ ]?2|Đội_2/i.test(n) ? 'Đội 2' : '?');
    const bm08 = names.filter(n => /^08_/.test(n)), bm14 = names.filter(n => /^14_/.test(n)), bm05 = names.filter(n => /^CC\//.test(n));
    ok(tenLan + ': đủ 2 file mỗi biểu mẫu BM-08, BM-14 và 2 file BM-05 (một đội một file)', bm08.length === 2 && bm14.length === 2 && bm05.length === 2, names.join(', '));
    ['Đội 1', 'Đội 2'].forEach(d => {
      const f05 = bm05.find(n => doiOf(n) === d); if (!f05) return ok(tenLan + ': có BM-05 ' + d, false, bm05.join(', '));
      const rows = rowsOf(o[f05]).filter(r => r.length > 30 && /^\d+$/.test(r[0])), exp = TAY[d];
      ok(tenLan + ': BM-05 ' + d + ' có đúng ' + exp.length + ' người; DÙNG CHUNG xuất hiện một lần trong đội', JSON.stringify(rows.map(r => r[1]).sort()) === JSON.stringify(exp.map(x => x.ten).sort()), JSON.stringify(rows.map(r => r[1])));
      ok(tenLan + ': BM-05 ' + d + ' số công từng người đúng của ĐỘI NÀY (' + exp.map(x => x.ten + ' ' + x.cong).join(', ') + ')', exp.every(x => { const r = rows.find(y => y[1] === x.ten); return r && SO(r[r.length - 1]) === x.cong; }), JSON.stringify(rows.map(r => [r[1], r[r.length - 1]])));
    });
    bm08.forEach(n => {
      const d = doiOf(n), rows = rowsOf(o[n]), exp = TAY[d] || [];
      exp.forEach(x => { const r = rows.find(y => y.length >= 7 && y.some(c => c.toUpperCase() === x.ten)) || [], nums = r.map(c => SO(c)).filter(v => !isNaN(v));
        ok(tenLan + ': BM-08 ' + d + ' · ' + x.ten + ': đơn giá ' + grp(x.rate) + ', công ' + x.cong + ', tiền ' + grp(x.tien), nums.includes(x.rate) && nums.includes(x.cong) && nums.includes(x.tien), JSON.stringify(r)); });
      const t = plain(o[n]), kia = TONG[d === 'Đội 1' ? 'Đội 2' : 'Đội 1'];
      ok(tenLan + ': BM-08 ' + d + ' tổng đội ' + grp(TONG[d]) + ', không lẫn tổng đội kia ' + grp(kia), t.includes(grp(TONG[d])) && !t.includes(grp(kia)), t.slice(-300));
    });
    bm14.forEach(n => { const d = doiOf(n), t = plain(o[n]), kia = TONG[d === 'Đội 1' ? 'Đội 2' : 'Đội 1'];
      ok(tenLan + ': BM-14 ' + d + ' khoản tiền công ' + grp(TONG[d]) + ' khớp BM-08, không lẫn tổng đội kia', t.includes(grp(TONG[d])) && !t.includes(grp(kia)), t.slice(0, 400)); });
    ok(tenLan + ': tổng hai đội = ' + grp(TONG_ALL) + ' (= tổng từng đội; người ở hai đội tính hai lần theo hai dòng khác vị trí, không nhân đôi công)', TONG['Đội 1'] + TONG['Đội 2'] === TONG_ALL && Object.values(TAY).flat().reduce((s, x) => s + x.tien, 0) === TONG_ALL && Object.values(TAY).flat().reduce((s, x) => s + x.cong, 0) === 41.5);
    return o;
  };
  const o1 = kiem('lần 1', await docs());
  // đóng và mở lại app, xuất lại: số liệu giữ nguyên
  await app.close(); app = await launch(); w = require('./_hd30').boc(await app.firstWindow()); w.on('pageerror', e => errs.push(e.message)); w.on('dialog', d => d.accept()); await w.waitForSelector('#side');
  await w.click('[data-open=own1]'); await w.click('[data-tab=rung]'); await w.click('[data-forest=fa]');
  const o2 = kiem('sau khi đóng mở lại app', await docs());
  ok('xuất lại sau khi mở lại: nội dung BM-08 và BM-14 giống từng byte lần trước', ['08_', '14_'].every(k => Object.keys(o1).filter(n => n.startsWith(k)).every(n => o1[n] === o2[n])));
  ok('không có lỗi script trên màn hình', errs.length === 0, errs.join(' | '));
  await app.close();
  console.log(fail ? 'CÓ ' + fail + ' LỖI' : 'TẤT CẢ ĐẠT'); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
