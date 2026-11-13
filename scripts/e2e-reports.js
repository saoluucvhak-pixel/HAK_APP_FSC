'use strict';
/* Kiểm thử 4 báo cáo bằng Electron thật: xuất Word + Excel từ giao diện rồi đối chiếu số dòng, số chuyến, tổng tấn, khoảng ngày,
 * tiến độ giữa màn hình xem trước, Word và Excel. Dữ liệu giả lập. Chạy: xvfb-run -a node scripts/e2e-reports.js (Linux) hoặc node scripts/e2e-reports.js (Windows). */
const {_electron: electron} = require('playwright-core');
const path = require('path'), fs = require('fs'), os = require('os');
const JSZip = require('jszip'), XLSX = require('xlsx');
const root = path.join(__dirname, '..');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'hakqn-rp-')), out = path.join(tmp, 'out'), dbFile = path.join(tmp, 'rp.sqlite');
let fail = 0; const ok = (name, cond, extra) => { console.log((cond ? 'ĐẠT  ' : 'LỖI  ') + name + (!cond && extra ? ' — ' + extra : '')); if (!cond) fail++; };

const forest = (id, ma, ten, dt, dm, pc) => ({id, info: {maRung: ma, tenRung: ten, diaDiem: 'Thôn ' + ma, lat: 15.5, lng: 108.1, dienTich: dt, dinhMucTanHa: dm, cuLy: null, tuNgay: '01/01/2026', denNgay: '28/02/2026', donGia: 340000, giayTo: []}, nc: [], dx: [], pc, exp: {}});
const P = (stt, ngay, bien, so, kl) => ({stt, ngay, bienSo: bien, soPhieu: so, kl, noiGiao: 'Nhà máy'});
const owner = (id, ma, ten, forests) => ({id, info: {ma, ten, ngaySinh: '01/01/1970', cccd: '04900000000' + ma.slice(-1), ngayCap: '01/01/2021', noiCap: 'CA', diaChi: 'Đà Nẵng', danhXung: 'Ông'}, forests: Object.fromEntries(forests.map(f => [f.id, f])), nc: [], dx: [], exp: {}});
const SEED = {v: 2, rs: {
  o1: owner('o1', 'K1', 'NGUYỄN VĂN AN', [
    forest('f1', 'R1', 'Rừng 1', 2, 10, [P(1, '05/01/2026', '92C-11111', 'P1', 12.5), P(2, '20/02/2026', '92C-22222', 'P2', 9.25), P(3, '10/03/2026', '92C-11111', 'P3', 1)]),
    forest('f2', 'R2', 'Rừng 2', 1.5, 12, [P(1, '15/02/2026', '92C-33333', 'P2', 4), P(2, '28/02/2026', '92C-33333', 'P4', 6)])]),
  o2: owner('o2', 'K2', 'TRẦN THỊ BÌNH', [forest('f3', 'R3', 'Rừng 3', 1, 10, [])])}};
// Kỳ 01/01/2026–28/02/2026: phiếu trong kỳ P1, P2 (R1), P2 (R2, trùng số), P4 = 4 chuyến, 31,75 tấn; P3 ngoài kỳ bị loại
const EXPECT = {trips: 4, tons: 31.75, dupExtra: 1, dupTons: 4};
const num = t => { const s = String(t).trim(); if (!/^-?\d{1,3}(\.\d{3})*(,\d+)?%?$|^-?\d+(,\d+)?%?$/.test(s)) return null; return Number(s.replace('%', '').replace(/\./g, '').replace(',', '.')); };

async function exportTo(w, sel, ext) { // Electron lưu thẳng vào HAKQN_DOWNLOAD_DIR: chờ file xuất hiện
  for (const f of fs.existsSync(out) ? fs.readdirSync(out) : []) fs.unlinkSync(path.join(out, f));
  await w.click(sel);
  for (let i = 0; i < 80; i++) { const f = fs.existsSync(out) && fs.readdirSync(out).find(x => x.endsWith(ext)); if (f) { await w.waitForTimeout(300); return path.join(out, f); } await w.waitForTimeout(100); }
  throw new Error('Không thấy file ' + ext + ' sau khi bấm ' + sel);
}
async function wordTables(file) {
  const z = await JSZip.loadAsync(fs.readFileSync(file)); const xml = await z.file('word/document.xml').async('string');
  const txt = s => (s.match(/<w:t[^>]*>([^<]*)<\/w:t>/g) || []).map(x => x.replace(/<[^>]+>/g, '')).join('').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
  return (xml.match(/<w:tbl>[\s\S]*?<\/w:tbl>/g) || []).map(t => (t.match(/<w:tr[ >][\s\S]*?<\/w:tr>/g) || []).map(r => (r.match(/<w:tc>[\s\S]*?<\/w:tc>/g) || []).map(txt)));
}

(async () => {
  const launch = () => electron.launch({executablePath: require('electron'), args: [root, '--no-sandbox'], env: {...process.env, HAKQN_DB: dbFile, HAKQN_DOWNLOAD_DIR: out, ELECTRON_DISABLE_SECURITY_WARNINGS: '1'}});
  const app = await launch(); let w = await app.firstWindow(); const errs = []; w.on('pageerror', e => errs.push(e.message)); w.on('dialog', d => d.accept());
  await w.waitForSelector('#side');
  const saved = await w.evaluate(db => window.hak.save(db), SEED); ok('ghi dữ liệu thử vào SQLite', saved && saved.ok, JSON.stringify(saved));
  await w.reload(); await w.waitForSelector('#side'); await w.click('header [data-act=rpOpen]'); await w.waitForSelector('#rpBox.on');
  await w.fill('#rpFrom', '2026-01-01'); await w.dispatchEvent('#rpFrom', 'change'); await w.fill('#rpTo', '2026-02-28'); await w.dispatchEvent('#rpTo', 'change');

  for (const id of ['dieuhanh', 'sanluong', 'phieucan', 'chacon', 'tiendo']) {
    await w.click('[data-rpsel=' + id + ']');
    if (id === 'chacon') { await w.check('#rpDetail'); await w.waitForTimeout(150); }
    const title = await w.textContent('#rpBody h3');
    const kpis = await w.$$eval('#rpBody .kpi > div', els => els.map(e => [e.querySelector('b').textContent, e.textContent.slice(e.querySelector('b').textContent.length)]));
    const tables = await w.$$eval('#rpBody table', ts => ts.map(t => Array.from(t.rows).map(r => Array.from(r.cells).map(c => c.textContent.trim().replace(/^[▾▸]\s+/, '')))));
    // Word
    const wt = await wordTables(await exportTo(w, '[data-act=rpWord]', '.docx'));
    const nK = Math.ceil(kpis.length / (id === 'dieuhanh' ? 3 : 5));
    const wkpi = wt.slice(0, nK).flatMap(t => t[0].map(c => c)); const wsec = wt.slice(nK, nK + tables.length);
    ok(id + ' · Word: ' + wt.length + ' bảng, đủ ' + tables.length + ' bảng dữ liệu + ' + nK + ' bảng chỉ số', wsec.length === tables.length);
    ok(id + ' · Word: các chỉ số khớp màn hình xem trước', kpis.every(([v, l]) => wkpi.some(c => c.startsWith(v) && c.includes(l.trim()))), JSON.stringify([kpis, wkpi]));
    ok(id + ' · Word: từng bảng khớp xem trước (số dòng và nội dung ô)', tables.every((t, i) => wsec[i] && wsec[i].length === t.length && t.every((r, j) => r.length === wsec[i][j].length || (r.length === 1 && wsec[i][j].length === 1)
      && true) && t.every((r, j) => r.every((c, k) => (wsec[i][j][k] || '') === c))), tables.map((t, i) => t.length + '/' + (wsec[i] || []).length).join(' '));
    // Excel
    const wb = XLSX.readFile(await exportTo(w, '[data-act=rpExcel]', '.xlsx')); const aoa = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], {header: 1, defval: ''});
    let cursor = 0, secOk = true, numOk = true, rowsOk = true, why = '';
    for (const t of tables) {
      const headIdx = aoa.findIndex((r, i) => i >= cursor && r.length >= t[0].length && t[0].every((h, k) => r[k] === h)); if (headIdx < 0) { secOk = false; why += 'không thấy tiêu đề ' + t[0][1] + '; '; continue; }
      const body = t.slice(1); const xr = aoa.slice(headIdx + 1, headIdx + 1 + body.length);
      if (!(xr.length === body.length)) rowsOk = false;
      body.forEach((r, j) => r.forEach((c, k) => { const n = num(c); const x = (xr[j] || [])[k]; if (n !== null && c !== '' && /^\d/.test(c) && k > 0) { if (typeof x !== 'number' || Math.abs(x - (c.endsWith('%') ? n : n)) > 0.0006) { numOk = false; why += 'ô ' + (j + 1) + ',' + (k + 1) + ' ' + c + '≠' + x + '; '; } } }));
      cursor = headIdx + 1 + body.length;
    }
    ok(id + ' · Excel: có đủ các bảng và số dòng khớp', secOk && rowsOk, why);
    ok(id + ' · Excel: đơn vị tính và thời điểm lập ở đầu bảng', /Đơn vị tính/.test(String(aoa[3][0])) && /^Lập lúc \d{2}\/\d{2}\/\d{4} \d{2}:\d{2}/.test(String(aoa[4][0])));
    ok(id + ' · Excel: cột số là số thật (tính tổng được) và đúng giá trị xem trước', numOk, why);

    if (id === 'chacon') {
      const rows = tables[0].slice(1, -1), lv = await w.$$eval('#rpBody tr[data-rplv]', t => t.map(r => +r.dataset.rplv));
      ok('cha–con: 2 chủ rừng, 3 rừng, 4 phiếu trong kỳ (kèm phiếu)', lv.filter(x => x === 0).length === 2 && lv.filter(x => x === 1).length === 3 && lv.filter(x => x === 2).length === 4, JSON.stringify(lv));
      const sum = l => Math.round(rows.filter((r, i) => lv[i] === l).reduce((a, r) => a + (num(r[6]) || 0), 0) * 1000) / 1000;
      ok('cha–con: tổng cha = tổng rừng = tổng phiếu = 31,75 tấn', sum(0) === 31.75 && sum(1) === 31.75 && sum(2) === 31.75, [sum(0), sum(1), sum(2)].join('/'));
      ok('cha–con: dòng cha NGUYỄN VĂN AN có 4 chuyến, 31,750 tấn', rows[0][0] === 'NGUYỄN VĂN AN' && rows[0][5] === '4' && rows[0][6] === '31,750', JSON.stringify(rows[0]));
      const hi = aoa.findIndex(r => String(r[0]).startsWith('Chủ rừng / Rừng / Phiếu cân'));
      const xr = aoa.slice(hi + 1, hi + 1 + rows.length);
      ok('cha–con: Excel có đủ dòng, cột số là số thật và tổng cấp 2 = 31,75', xr.length === rows.length && xr.filter((r, i) => lv[i] === 2).reduce((a, r) => a + r[6], 0) === 31.75);
      // thu gọn / mở rộng ở màn hình xem trước (Word và Excel luôn đủ dòng)
      await w.click('[data-rpfold="0"]'); const hidden = await w.$$eval('#rpBody tr[data-rplv][hidden]', t => t.length);
      ok('cha–con: bấm thu gọn chủ rừng đầu thì ẩn 2 rừng và 4 phiếu con', hidden === 6, String(hidden));
      await w.click('[data-rpfold="0"]');
      const xf = await exportTo(w, '[data-act=rpExcel]', '.xlsx'), ws = XLSX.readFile(xf, {cellDates: true}).Sheets['Bao cao'];
      const sheetXml = await (await JSZip.loadAsync(fs.readFileSync(xf))).file('xl/worksheets/sheet1.xml').async('string');
      ok('cha–con: Excel có bộ lọc tự động và nhóm dòng theo cấp (outlineLevel 1 và 2)', !!ws['!autofilter'] && /<autoFilter /.test(sheetXml) && /outlineLevel="1"/.test(sheetXml) && /outlineLevel="2"/.test(sheetXml));
    }
    if (id === 'phieucan') {
      const k = Object.fromEntries(kpis.map(([v, l]) => [l.trim(), v]));
      ok('sổ phiếu cân: ' + EXPECT.trips + ' chuyến trong kỳ (loại phiếu P3 ngoài kỳ)', k['Số phiếu cân'] === String(EXPECT.trips), JSON.stringify(k));
      ok('sổ phiếu cân: tổng 31,750 tấn', k['Tổng khối lượng (tấn)'] === '31,750', JSON.stringify(k));
      const hi = aoa.findIndex(r => r[1] === 'Ngày cân' && r[4] === 'Số phiếu cân'); const body = aoa.slice(hi + 1, hi + 1 + EXPECT.trips);
      const sum = body.reduce((s, r) => s + r[11], 0); ok('sổ phiếu cân: SUM cột khối lượng trong Excel = 31,75', Math.abs(sum - EXPECT.tons) < 1e-9, String(sum) + ' hi=' + hi + ' ' + JSON.stringify(body[0]));
      ok('sổ phiếu cân: phiếu trùng số P2 được đánh dấu ở cả hai dòng, không bị xóa', body.filter(r => r[13] === 'Trùng số phiếu').length === 2 && body.filter(r => r[4] === 'P2').length === 2);
      ok('sổ phiếu cân: KPI và ghi chú nêu rõ cách tính phiếu trùng', k['Phiếu trùng số (đã tính vào tổng)'] === '1' && (await w.textContent('#rpBody .msg.warn')).includes('vẫn được cộng vào tổng'));
    }
    if (id === 'sanluong') {
      const body = tables[0].slice(1, -1);
      ok('sản lượng: R1 thực tế 21,750 (P1+P2), R2 thực tế 10,000; ngoài kỳ không tính', body[0][7] === '21,750' && body[1][7] === '10,000', JSON.stringify(body.map(r => r[7])));
      ok('sản lượng: số chuyến theo từng rừng 2 và 2', body[0][9] === '2' && body[1][9] === '2');
    }
    if (id === 'tiendo') {
      const rows = tables[0].slice(1, -1); const pct = rows.map(r => num(r[8]));
      ok('tiến độ: xếp thấp → cao, trung bình khớp dòng cuối', pct.every((v, i) => i === 0 || v >= pct[i - 1]) && num(tables[0][tables[0].length - 1][8]) === Math.round(pct.reduce((a, b) => a + b, 0) / pct.length * 10) / 10, JSON.stringify(pct));
    }
  }
  // Kỳ sai (từ > đến): báo lỗi và không xuất file
  await w.fill('#rpFrom', '2026-03-01'); await w.dispatchEvent('#rpFrom', 'change'); await w.fill('#rpTo', '2026-01-01'); await w.dispatchEvent('#rpTo', 'change');
  for (const f of fs.readdirSync(out)) fs.unlinkSync(path.join(out, f));
  await w.click('[data-act=rpWord]'); await w.waitForTimeout(400);
  ok('kỳ sai (từ > đến): báo lỗi, không xuất file', (await w.textContent('#rpBody .msg')).includes('Ngày bắt đầu phải trước') && fs.readdirSync(out).length === 0);
  ok('không có lỗi JavaScript', errs.length === 0, errs.join('; '));
  await app.close();
  console.log(fail ? 'CÓ ' + fail + ' LỖI' : 'TẤT CẢ ĐẠT'); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
