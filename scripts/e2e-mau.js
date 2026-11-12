'use strict';
/* File Excel mẫu (nhân công, đội xe, phiếu cân) tải từ phần mềm: định dạng, hướng dẫn từng cột và nạp lại được (Electron thật, dữ liệu giả lập).
 * Tải mẫu bằng nút “Tải file mẫu (có hướng dẫn)” → kiểm tra file → chép dòng ví dụ sang trang dữ liệu → nạp vào phần mềm → bản ghi vào đúng lô.
 * Chạy: xvfb-run -a node scripts/e2e-mau.js */
const {_electron: electron} = require('playwright-core');
const path = require('path'), fs = require('fs'), os = require('os');
const XLSX = require('xlsx'), JSZip = require('jszip');
const root = path.join(__dirname, '..');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hakqn-mau-')), out = path.join(dir, 'out');
let fail = 0; const ok = (name, cond, extra) => { console.log((cond ? 'ĐẠT  ' : 'LỖI  ') + name + (!cond && extra ? ' — ' + extra : '')); if (!cond) fail++; };
const SEED = {v: 2, rs: {own1: {id: 'own1', info: {ma: 'CR-001', ten: 'NGUYỄN VĂN MẪU', ngaySinh: '06/10/1967', cccd: '049067005459', ngayCap: '15/08/2021', noiCap: 'CA', diaChi: 'Đà Nẵng', danhXung: 'Ông'}, nc: [], dx: [], exp: {},
  forests: {f1: {id: 'f1', info: {maRung: 'CR-001-R1', tenRung: 'Lô mẫu', diaDiem: 'Thôn 1', lat: 15.6, lng: 108.1, dienTich: 2, dinhMucTanHa: 80, cuLy: 45, tuNgay: '01/10/2026', denNgay: '30/11/2026', donGia: 340000, giayTo: []}, nc: [], dx: [], pc: [], exp: {}}}}}};
const KINDS = [['nc', 'HAK_Mau_NhanCong.xlsx', 'NHAN_CONG', 3, '[data-ftab=nc]'], ['dx', 'HAK_Mau_DoiXe.xlsx', 'DOI_XE', 2, '[data-ftab=dx]'], ['pc', 'HAK_Mau_PhieuCan.xlsx', 'PHIEU_CAN', 3, '[data-ftab=dx]']];

(async () => {
  const app = await electron.launch({executablePath: require('electron'), args: [root, '--no-sandbox'], env: {...process.env, HAKQN_DB: path.join(dir, 'm.sqlite'), HAKQN_USERDATA: path.join(dir, 'ud'), HAKQN_DOWNLOAD_DIR: out, ELECTRON_DISABLE_SECURITY_WARNINGS: '1'}});
  const w = await app.firstWindow(); const errs = []; w.on('pageerror', e => errs.push(e.message)); w.on('dialog', d => d.accept()); await w.waitForSelector('#side');
  await w.evaluate(db => window.hak.save(db), SEED); await w.reload(); await w.waitForSelector('#side');
  const dbOf = () => w.evaluate(() => window.hak.loadSync().db.rs.own1.forests.f1);
  await w.click('[data-open=own1]'); await w.click('[data-tab=rung]'); await w.click('[data-forest=f1]');
  for (const [kind, fileName, sheet, nExpect, tabSel] of KINDS) {
    await w.click(tabSel); fs.mkdirSync(out, {recursive: true}); for (const f of fs.readdirSync(out)) fs.unlinkSync(path.join(out, f));
    await w.click(`button[data-act=tpl][data-kind=${kind}]`);
    let got = null; for (let i = 0; i < 60 && !got; i++) { got = fs.readdirSync(out).find(f => f === fileName); if (!got) await w.waitForTimeout(150); }
    ok('mẫu ' + kind + ': tải về đúng tên ' + fileName, !!got, JSON.stringify(fs.readdirSync(out)));
    await w.waitForTimeout(300);
    const file = path.join(out, fileName), bytes = fs.readFileSync(file), wb = XLSX.read(bytes, {type: 'buffer'});
    ok('mẫu ' + kind + ': 3 trang tính HUONG_DAN, ' + sheet + ', VI_DU', JSON.stringify(wb.SheetNames) === JSON.stringify(['HUONG_DAN', sheet, 'VI_DU']), JSON.stringify(wb.SheetNames));
    const z = await JSZip.loadAsync(bytes), st = await z.file('xl/worksheets/sheet2.xml').async('string');
    ok('mẫu ' + kind + ': cố định dòng tiêu đề, có bộ lọc, danh sách chọn và ô gợi ý', /state="frozen"/.test(st) && /<autoFilter/.test(st) && /showInputMessage="1"/.test(st));
    const guide = XLSX.utils.sheet_to_json(wb.Sheets.HUONG_DAN, {header: 1, defval: ''}).map(r => r.join(' ')).join('\n');
    ok('mẫu ' + kind + ': trang HUONG_DAN có mục đích, các bước, mô tả cột, quy tắc, lỗi thường gặp', ['Mẫu này dùng để làm gì', 'Các bước thực hiện', 'Mô tả từng cột', 'Phần mềm kiểm tra những gì', 'Lỗi thường gặp'].every(t => guide.includes(t)));
    // chép dòng ví dụ sang trang dữ liệu rồi nạp vào phần mềm
    const ex = XLSX.utils.sheet_to_json(wb.Sheets.VI_DU, {header: 1, defval: ''}).slice(1);          // [tiêu đề, ...ví dụ]
    wb.Sheets[sheet] = XLSX.utils.aoa_to_sheet(ex); const filled = path.join(dir, 'dien_' + fileName); XLSX.writeFile(wb, filled);
    await w.setInputFiles(`input[data-file="${kind}"]`, filled); await w.waitForTimeout(900);
    const f = await dbOf(), n = f[kind].length;
    ok('mẫu ' + kind + ': nạp dòng ví dụ thành công (' + nExpect + ' dòng) vào đúng lô', n === nExpect, 'có ' + n + ' dòng; ' + (await w.innerText('#main')).slice(0, 200));
    ok('mẫu ' + kind + ': không báo thiếu cột hay sai tiêu đề', !/File thiếu cột/.test(await w.innerText('body')));
    if (kind === 'nc') ok('nhân công mẫu: CCCD giữ số 0 đầu, đúng một tổ trưởng', f.nc.every(r => /^049\d{9}$/.test(r.cccd)) && f.nc.filter(r => r.vaiTro === 'Tổ trưởng').length === 1, JSON.stringify(f.nc.map(r => r.cccd)));
    if (kind === 'pc') ok('phiếu cân mẫu: ngày nhuận 29/02/2028 được nhận, khối lượng dạng 25,4 đọc đúng', f.pc.some(r => r.ngay === '29/02/2028') && f.pc[0].kl === 25.4, JSON.stringify(f.pc.map(r => [r.ngay, r.kl])));
  }
  ok('không lỗi script giao diện', errs.length === 0, errs.join('|'));
  await app.close();
  console.log(fail ? '\n' + fail + ' LỖI' : '\nĐẠT HẾT'); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
