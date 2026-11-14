'use strict';
/* BẢN NHÁP / bản chính thức theo điều kiện riêng từng biểu mẫu (Electron thật): xuất lẻ và xuất theo gói dùng chung một quy tắc.
 * Thiếu điều kiện: gắn nhãn BẢN NHÁP ở tên file, đầu tài liệu, chân trang và tên gói; đủ điều kiện: bản chính thức không nhãn; mẫu trống/chỉ phần số không gắn nhãn.
 * Chạy: xvfb-run -a node scripts/e2e-bannhap.js */
const {_electron: electron} = require('playwright-core');
const path = require('path'), fs = require('fs'), os = require('os');
const JSZip = require('jszip');
const root = path.join(__dirname, '..');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hakqn-bn-')), out = path.join(dir, 'out');
let fail = 0; const ok = (name, cond, extra) => { console.log((cond ? 'ĐẠT  ' : 'LỖI  ') + name + (!cond && extra ? ' — ' + extra : '')); if (!cond) fail++; };
const nv = (stt, vai, ten, cd, cccd) => ({_row: stt + 1, maRung: 'R-A', vaiTro: vai, stt: String(stt), danhXung: 'Ông', ten, ngaySinh: '01/01/1985', cccd, ngayCap: '01/01/2021', noiCap: 'CA', diaChi: 'Đà Nẵng', chucDanh: cd});
const xe = {_row: 2, maRung: 'R-A', stt: '1', chuXe: 'LÊ VĂN XE', ngaySinh: '01/01/1980', cccd: '049000000077', ngayCap: '01/01/2021', noiCap: 'CA', diaChi: 'Đà Nẵng', bienSo: '92C-12345', loaiXe: 'Xe tải', nguoiKy: 'Chủ xe', sdt: '0905123456'};
const SEED = {v: 2, rs: {own1: {id: 'own1', info: {ma: 'CR-01', ten: 'NGUYỄN VĂN MỘT', cccd: '049067005459', ngayCap: '15/08/2021', noiCap: 'CA', diaChi: 'Đà Nẵng', danhXung: 'Ông'}, nc: [], dx: [], exp: {}, forests: {
  fa: {id: 'fa', info: {hinhThucLuong: 'sanluong', moHinhKy: 'giaokhoan', donGiaTan: {'Tổ trưởng': 420000, 'Công nhân khai thác': 330000, 'Công nhân cưa': 380000}, khoiLuong: 21.75, maRung: 'R-A', tenRung: 'Lô A', diaDiem: 'Thôn A', lat: 15.6, lng: 108.1, dienTich: 2, dinhMucTanHa: 80, cuLy: 45, tuNgay: '', denNgay: '', donGia: 340000, giayTo: [], vanChuyen: {mode: 'coDinh', coDinh: 52000, bac: []}},
    nc: [nv(1, 'Tổ trưởng', 'TRẦN TỔ TRƯỞNG', 'Tổ trưởng', '049085000001'), nv(2, 'Công nhân', 'LÊ CÔNG NHÂN', 'Công nhân khai thác', '049085000002'), nv(3, 'Công nhân', 'PHẠM CƯA', 'Công nhân cưa', '049085000003')], dx: [xe], pc: [], exp: {}}}}}};
const FULL = JSON.parse(JSON.stringify(SEED));
const own = FULL.rs.own1; own.info.ngayKyHopDong = '01/10/2026'; own.info.soHopDong = 'HD-01';
Object.assign(own.forests.fa.info, {muaHang: {congTyId: 'c1', diaChiId: 'main', ten: 'CÔNG TY MUA THỬ', diaChi: 'KCN Thử, Đà Nẵng'}});
Object.assign(own.forests.fa.exp || (own.forests.fa.exp = {}), {ntNgay: '05/12/2026', pcNgay: '05/12/2026', ckNhan: 'CÔNG TY MUA THỬ'});
async function zipInfo(file) { const z = await JSZip.loadAsync(fs.readFileSync(file)); const items = {}; for (const n of Object.keys(z.files).filter(n => n.endsWith('.docx'))) { const dz = await JSZip.loadAsync(await z.file(n).async('nodebuffer')); items[n] = (await dz.file('word/document.xml').async('string')) + (dz.file('word/footer1.xml') ? await dz.file('word/footer1.xml').async('string') : ''); } return items; }
const hasBanner = x => /BẢN NHÁP – chưa đủ dữ liệu/.test(x);
(async () => {
  const app = await electron.launch({executablePath: require('electron'), args: [root, '--no-sandbox'], env: {...process.env, HAKQN_CLOSE: 'discard', HAKQN_DB: path.join(dir, 'b.sqlite'), HAKQN_USERDATA: path.join(dir, 'ud'), HAKQN_DOWNLOAD_DIR: out}});
  const w = await app.firstWindow(); const errs = []; w.on('pageerror', e => errs.push(e.message)); w.on('dialog', d => d.accept()); await w.waitForSelector('#side');
  const load = async seed => { await w.evaluate(d => window.hak.save(d), seed); await w.reload(); await w.waitForSelector('#side'); await w.click('[data-open=own1]'); await w.click('[data-tab=rung]'); await w.click('[data-forest=fa]'); await w.click('[data-ftab=xuat]'); };
  const grab = async (kind, xt) => { await w.click(`[data-xtab=${xt}]`); fs.mkdirSync(out, {recursive: true}); for (const f of fs.readdirSync(out)) fs.unlinkSync(path.join(out, f)); await w.click(`button[data-act=dl][data-kind=${kind}]`); let f = null; for (let i = 0; i < 80 && !f; i++) { f = fs.readdirSync(out).find(x => /\.(zip|docx)$/.test(x)); if (!f) await w.waitForTimeout(150); } await w.waitForTimeout(300); return f; };

  // 1. thiếu dữ liệu: bảng điều kiện từng mẫu + gói “tất cả” có nhãn
  await load(SEED); await w.click('[data-xtab=all]');
  const card = await w.innerText('#draftCard');
  ok('màn Xuất hồ sơ nêu mẫu nào thiếu gì và bổ sung ở đâu', /BM-14/.test(card) && /ngày lập biên bản nghiệm thu/.test(card) && /Xuất hồ sơ → Nghiệm thu, thanh lý: ngày lập/.test(card) && /BM-01/.test(card), card.slice(0, 300));
  let f = await grab('all', 'all');
  ok('gói “tải toàn bộ” thiếu dữ liệu: tên gói có BAN_NHAP', /_all_BAN_NHAP\.zip$/.test(f), f);
  let items = await zipInfo(path.join(out, f)), names = Object.keys(items);
  const has = c => names.filter(n => new RegExp('^' + c + '_').test(n));
  ok('BM-01, BM-04, BM-11, BM-14 (thiếu ngày ký / địa chỉ giao / đơn vị nhận / ngày nghiệm thu): tên file và đầu tài liệu có BẢN NHÁP, chân trang ghi BẢN NHÁP', ['01', '04', '11', '14'].every(c => has(c).length && has(c).every(n => /BAN_NHAP/.test(n) && hasBanner(items[n]) && /· BẢN NHÁP/.test(items[n]))), JSON.stringify(names));
  ok('BM-02, BM-07, BM-18 (không có điều kiện riêng): bản chính thức, không nhãn', ['02', '07', '18'].every(c => has(c).length && has(c).every(n => !/BAN_NHAP/.test(n) && !/BẢN NHÁP/.test(items[n]))));
  // 2. xuất lẻ dùng cùng quy tắc
  f = await grab('nttl', 'hd');
  ok('xuất lẻ BM-14 thiếu ngày nghiệm thu: tên file có BAN_NHAP, đầu tài liệu có nhãn', /BAN_NHAP/.test(f) && hasBanner((await zipInfo2(path.join(out, f)))), f);
  // 3. đủ dữ liệu: bản chính thức
  await load(FULL); await w.click('[data-xtab=all]');
  ok('đủ dữ liệu: bảng điều kiện báo mọi mẫu đã đủ', /đã đủ để in bản chính thức/.test(await w.innerText('#draftCard')));
  f = await grab('all', 'all'); items = await zipInfo(path.join(out, f)); names = Object.keys(items);
  ok('gói đủ dữ liệu: tên gói và mọi file không có nhãn BẢN NHÁP', !/BAN_NHAP/.test(f) && names.every(n => !/BAN_NHAP/.test(n) && !/BẢN NHÁP/.test(items[n])), f + ' ' + names.filter(n => /BAN_NHAP/.test(n)));
  f = await grab('nttl', 'hd');
  ok('xuất lẻ BM-14 đủ dữ liệu: bản chính thức', !/BAN_NHAP/.test(f) && !/BẢN NHÁP/.test(await zipInfo2(path.join(out, f))), f);
  // 4. mẫu trống / chỉ phần số: không gắn nhãn dù thiếu dữ liệu
  await load(SEED); await w.click('[data-xtab=all]');
  { /* gói nền đợt 2: không gắn nhãn BẢN NHÁP dù biểu mẫu chính thức thiếu dữ liệu (mẫu nền thiết kế để điền sau) */
    fs.mkdirSync(out, {recursive: true}); for (const x of fs.readdirSync(out)) fs.unlinkSync(path.join(out, x));
    const b = await w.$('#d2Card .docrow [data-act=d2dl][data-mode=nen]'); ok('đợt 2: có nút mẫu nền', !!b);
    if (b && !(await b.isDisabled())) { await b.click(); let g = null; for (let i = 0; i < 80 && !g; i++) { g = fs.readdirSync(out).find(x => /\.(zip|docx)$/.test(x)); if (!g) await w.waitForTimeout(150); } await w.waitForTimeout(300); g = fs.readdirSync(out).find(x => /\.(zip|docx)$/.test(x)); items = await zipInfo(path.join(out, g));
      ok('gói mẫu nền đợt 2: không gắn nhãn BẢN NHÁP (mẫu thiết kế để điền sau)', !/BAN_NHAP/.test(g) && Object.keys(items).every(n => !/BAN_NHAP/.test(n) && !/BẢN NHÁP/.test(items[n])), g); }
  }
  ok('không có lỗi JavaScript', errs.length === 0, errs.join('|'));
  await app.close(); console.log(fail ? 'CÓ ' + fail + ' LỖI' : 'TẤT CẢ ĐẠT'); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
async function zipInfo2(file) { const dz = await JSZip.loadAsync(fs.readFileSync(file)); return (await dz.file('word/document.xml').async('string')) + (dz.file('word/footer1.xml') ? await dz.file('word/footer1.xml').async('string') : ''); }

