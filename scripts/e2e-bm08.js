'use strict';
/* BM-08 (bảng thanh toán tiền công) luôn gọn một trang khi nhiều người (Electron thật + LibreOffice nếu có). Chạy: xvfb-run -a node scripts/e2e-bm08.js */
const {_electron: electron} = require('playwright-core');
const path = require('path'), fs = require('fs'), os = require('os');
const root = path.join(__dirname, '..');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hakqn-b8-')), out = path.join(dir, 'out'), cp = require('child_process');
let fail = 0; const ok = (name, cond, extra) => { console.log((cond ? 'ĐẠT  ' : 'LỖI  ') + name + (!cond && extra ? ' — ' + extra : '')); if (!cond) fail++; };
const nv = (stt, vai, ten, cd, cccd) => ({_row: stt + 1, maRung: 'R-A', vaiTro: vai, stt: String(stt), danhXung: 'Ông', ten, ngaySinh: '01/01/1985', cccd, ngayCap: '01/01/2021', noiCap: 'CA', diaChi: 'Đà Nẵng', chucDanh: cd});
const xe = {_row: 2, maRung: 'R-A', stt: '1', chuXe: 'LÊ VĂN XE', ngaySinh: '01/01/1980', cccd: '049000000077', ngayCap: '01/01/2021', noiCap: 'CA', diaChi: 'Đà Nẵng', bienSo: '92C-12345', loaiXe: 'Xe tải', nguoiKy: 'Chủ xe', sdt: '0905123456'};
const SEED = {v: 2, rs: {own1: {id: 'own1', info: {ma: 'CR-01', ten: 'NGUYỄN VĂN MỘT', cccd: '049067005459', ngayCap: '15/08/2021', noiCap: 'CA', diaChi: 'Đà Nẵng', danhXung: 'Ông'}, nc: [], dx: [], exp: {}, forests: {
  fa: {id: 'fa', info: {hinhThucLuong: 'sanluong', moHinhKy: 'giaokhoan', donGiaTan: {'Tổ trưởng': 420000, 'Công nhân khai thác': 330000, 'Công nhân cưa': 380000}, khoiLuong: 21.75, maRung: 'R-A', tenRung: 'Lô A', diaDiem: 'Thôn A', lat: 15.6, lng: 108.1, dienTich: 2, dinhMucTanHa: 80, cuLy: 45, tuNgay: '', denNgay: '', donGia: 340000, giayTo: [], vanChuyen: {mode: 'coDinh', coDinh: 52000, bac: []}},
    nc: [nv(1, 'Tổ trưởng', 'TRẦN TỔ TRƯỞNG', 'Tổ trưởng', '049085000001'), nv(2, 'Công nhân', 'LÊ CÔNG NHÂN', 'Công nhân khai thác', '049085000002'), nv(3, 'Công nhân', 'PHẠM CƯA', 'Công nhân cưa', '049085000003')], dx: [xe], pc: [], exp: {}}}}}};
const many = n => Array.from({length: n}, (_, i) => nv(i + 1, i ? 'Công nhân' : 'Tổ trưởng', (i ? 'LÊ THỊ CÔNG NHÂN KHAI THÁC SỐ ' : 'TRẦN NGUYỄN HOÀNG ANH TỔ TRƯỞNG ') + (i + 1), i ? 'Công nhân khai thác' : 'Tổ trưởng', '0490850' + String(10000 + i)));
const soffice = ['soffice', 'libreoffice'].find(c => { try { cp.execSync('command -v ' + c, {stdio: 'ignore'}); return true; } catch (e) { return false; } });
(async () => {
  const app = await electron.launch({executablePath: require('electron'), args: [root, '--no-sandbox'], env: {...process.env, HAKQN_DB: path.join(dir, 's.sqlite'), HAKQN_USERDATA: path.join(dir, 'ud'), HAKQN_DOWNLOAD_DIR: out}});
  const w = await app.firstWindow(); const errs = []; w.on('pageerror', e => errs.push(e.message)); w.on('dialog', d => d.accept()); await w.waitForSelector('#side');
  for (const n of [3, 5, 6, 7, 8, 9, 10, 12, 13, 14, 16, 17, 18, 20]) {
    const seed = JSON.parse(JSON.stringify(SEED)); seed.rs.own1.forests.fa.nc = many(n);
    await w.evaluate(d => window.hak.save(d), seed); await w.reload(); await w.waitForSelector('#side');
    await w.click('[data-open=own1]'); await w.click('[data-tab=rung]'); await w.click('[data-forest=fa]'); await w.click('[data-ftab=xuat]'); await w.click('[data-xtab=ld]');
    for (const f of fs.existsSync(out) ? fs.readdirSync(out) : []) fs.unlinkSync(path.join(out, f));
    await w.click('button[data-act=dl][data-kind=tc]'); let f = null; for (let i = 0; i < 100 && !f; i++) { f = fs.existsSync(out) && fs.readdirSync(out).find(x => x.endsWith('.docx')); if (!f) await w.waitForTimeout(100); }
    ok(n + ' người: tải được BM-08', !!f);
    if (f && soffice) { cp.execFileSync(soffice, ['--headless', '--convert-to', 'pdf', '--outdir', dir, path.join(out, f)], {stdio: 'ignore'}); const pdf = path.join(dir, f.replace(/\.docx$/, '.pdf')); const pages = +/Pages:\s+(\d+)/.exec(cp.execFileSync('pdfinfo', [pdf], {encoding: 'utf8'}))[1];
      ok(n + ' người: BM-08 nằm gọn một trang (bảng và khối ký)', pages === 1, pages + ' trang'); }
  }
  if (!soffice) console.log('BỎ QUA  không có LibreOffice để đếm trang');
  ok('không có lỗi JavaScript', errs.length === 0, errs.join('|'));
  await app.close(); console.log(fail ? 'CÓ ' + fail + ' LỖI' : 'TẤT CẢ ĐẠT'); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
