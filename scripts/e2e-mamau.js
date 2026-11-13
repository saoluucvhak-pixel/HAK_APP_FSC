'use strict';
/* Cột “Mã rừng” không còn bắt buộc (Electron thật): file mẫu không có cột này mà vẫn nạp vào lô đang mở; file cũ có cột để trống / khớp / lệch. Chạy: xvfb-run -a node scripts/e2e-mamau.js */
const {_electron: electron} = require('playwright-core');
const path = require('path'), fs = require('fs'), os = require('os');
const XLSX = require('xlsx'), JSZip = require('jszip');
const root = path.join(__dirname, '..');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hakqn-mau-')), out = path.join(dir, 'out');
let fail = 0; const ok = (name, cond, extra) => { console.log((cond ? 'ĐẠT  ' : 'LỖI  ') + name + (!cond && extra ? ' — ' + extra : '')); if (!cond) fail++; };
const SEED = {v: 2, rs: {own1: {id: 'own1', info: {ma: 'CR-001', ten: 'NGUYỄN VĂN MẪU', ngaySinh: '06/10/1967', cccd: '049067005459', ngayCap: '15/08/2021', noiCap: 'CA', diaChi: 'Đà Nẵng', danhXung: 'Ông'}, nc: [], dx: [], exp: {},
  forests: {f1: {id: 'f1', info: {maRung: 'CR-001-R1', tenRung: 'Lô mẫu', diaDiem: 'Thôn 1', lat: 15.6, lng: 108.1, dienTich: 2, dinhMucTanHa: 80, cuLy: 45, tuNgay: '01/10/2026', denNgay: '30/11/2026', donGia: 340000, giayTo: []}, nc: [], dx: [], pc: [], exp: {}}}}}};
const KINDS = [['nc', 'HAK_Mau_NhanCong.xlsx', 'NHAN_CONG', 3, '[data-ftab=nc]'], ['dx', 'HAK_Mau_DoiXe.xlsx', 'DOI_XE', 2, '[data-ftab=dx]'], ['pc', 'HAK_Mau_PhieuCan.xlsx', 'PHIEU_CAN', 3, '[data-ftab=dx]']];
const MAU = require('../src/xlsxmau');
const build = (kind, mode) => {   // mode: 'khong' (như mẫu mới) | 'trong' | 'khop' | 'lech' — tạo file từ dòng ví dụ của mẫu
  const sp = MAU.SPECS[kind], cols = sp.cols.map(c => c.n), rows = sp.example.map(r => r.slice());
  let aoa = [cols, ...rows];
  if (mode !== 'khong') aoa = aoa.map((r, i) => [i === 0 ? 'Mã rừng' : mode === 'trong' ? '' : mode === 'khop' ? 'CR-001-R1' : 'LO-KHAC-99', ...r]);
  const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(aoa), sp.sheet);
  const f = path.join(dir, kind + '_' + mode + '.xlsx'); XLSX.writeFile(wb, f); return f;
};
(async () => {
  const app = await electron.launch({executablePath: require('electron'), args: [root, '--no-sandbox'], env: {...process.env, HAKQN_DB: path.join(dir, 'm.sqlite'), HAKQN_USERDATA: path.join(dir, 'ud')}});
  const w = await app.firstWindow(); const errs = []; w.on('pageerror', e => errs.push(e.message)); w.on('dialog', d => d.accept()); await w.waitForSelector('#side');
  await w.evaluate(db => window.hak.save(db), SEED); await w.reload(); await w.waitForSelector('#side');
  const forest = () => w.evaluate(() => window.hak.loadSync().db.rs.own1.forests.f1);
  await w.click('[data-open=own1]'); await w.click('[data-tab=rung]'); await w.click('[data-forest=f1]');
  ok('mẫu tải về không có cột Mã rừng và không bắt buộc', ['nc', 'dx', 'pc'].every(k => !MAU.SPECS[k].cols.some(c => c.n === 'Mã rừng')));
  for (const [kind, , sheet, nExpect, tabSel] of KINDS) {
    await w.click(tabSel);
    for (const [mode, label] of [['khong', 'file mẫu mới (không có cột Mã rừng)'], ['trong', 'file cũ, cột Mã rừng để trống'], ['khop', 'file cũ, Mã rừng khớp lô đang mở']]) {
      await w.setInputFiles(`input[data-file="${kind}"]`, build(kind, mode)); await w.waitForTimeout(900);
      const f = await forest(), rows = f[kind];
      ok(kind + ' — ' + label + ': nạp ' + nExpect + ' dòng vào lô đang mở, không báo thiếu cột/mã', rows.length === nExpect && !/File thiếu cột|thiếu Mã rừng/.test(await w.innerText('body')), 'có ' + rows.length + ' dòng; ' + (await w.innerText('#main')).slice(0, 160));
      ok(kind + ' — ' + label + ': mọi bản ghi mang mã lô đang mở (CR-001-R1)', rows.every(r => r.maRung === 'CR-001-R1'), JSON.stringify(rows.map(r => r.maRung)));
      ok(kind + ' — ' + label + ': không có lỗi về mã rừng ở màn Kiểm tra', !/khác lô đang mở/.test(await w.innerText('#main')));
    }
    await w.setInputFiles(`input[data-file="${kind}"]`, build(kind, 'lech')); await w.waitForTimeout(900);
    const t = await w.innerText('#main'), f = await forest();
    ok(kind + ' — file cũ có Mã rừng lệch lô: báo lỗi nêu rõ cách xử lý (để trống ô hoặc sửa cho đúng)', /khác lô đang mở/.test(t) && /để trống ô Mã rừng hoặc sửa cho đúng lô/.test(t), t.slice(0, 300));
    await w.setInputFiles(`input[data-file="${kind}"]`, build(kind, 'khong')); await w.waitForTimeout(900);   // trả về dữ liệu sạch cho các mẫu sau
  }
  ok('không có lỗi JavaScript', errs.length === 0, errs.join('|'));
  await app.close(); console.log(fail ? 'CÓ ' + fail + ' LỖI' : 'TẤT CẢ ĐẠT'); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
