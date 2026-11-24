'use strict';
/* Lọc theo ngành nghề + cột chức vụ chi tiết (Electron thật, SQLite thật; dữ liệu giả lập, CCCD 0490000000xx):
 *  - bảng Danh mục đối tượng hiện chức vụ chi tiết và ngành ĐÃ KHAI RÕ (người cũ chưa khai: không hiện thêm gì)
 *  - Bên nhận khoán (Khai thác), bên vận chuyển (Vận chuyển), tài xế (Vận chuyển), nhân công (Khai thác): lọc theo ngành đã khai;
 *    người / doanh nghiệp chưa khai ngành (dữ liệu cũ) VẪN hiện như trước; doanh nghiệp chọn cả hai ngành hiện ở cả hai danh sách
 * Chạy: xvfb-run -a node scripts/e2e-loc-nganh.js */
const {_electron: electron} = require('playwright-core');
const path = require('path'), fs = require('fs'), os = require('os');
const root = path.join(__dirname, '..');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hakqn-locng-'));
let fail = 0; const ok = (name, cond, extra) => { console.log((cond ? 'ĐẠT  ' : 'LỖI  ') + name + (!cond && extra ? ' — ' + extra : '')); if (!cond) fail++; };
(async () => {
  const app = await electron.launch({executablePath: require('electron'), args: [root, '--no-sandbox'], env: {...process.env, HAKQN_CLOSE: 'discard', HAKQN_DB: path.join(dir, 'd.sqlite'), HAKQN_USERDATA: path.join(dir, 'ud'), HAKQN_DOWNLOAD_DIR: path.join(dir, 'out')}});
  const w = require('./_hd30').boc(await app.firstWindow()); const errs = []; w.on('pageerror', e => errs.push(e.message)); w.on('dialog', d => d.accept()); await w.waitForSelector('#side');
  // dữ liệu giả lập: 4 doanh nghiệp + 6 cá nhân
  const loi = await w.evaluate(() => {
    const db = window.hak.loadSync().db; let dm = db.dmDoiTuong || [], errs = [];
    const them = x => { const r = HAKDoiTuong.luu(dm, x, '24/11/2026'); if (!r.ok) errs.push(x.ten + ': ' + r.errs.join('; ')); else dm = r.dm; };
    const pn = (ten, ky, nganh, mst) => ({ten, loai: 'phapnhan', mst, diaChi: 'Quảng Nam', daiDien: 'Người đại diện giả lập', kyHD: ky, nganh});
    them(pn('Công ty KT giả lập', {nhanCong: true, vanChuyen: true}, ['khaiThac'], '0400000001')); them(pn('Công ty VC giả lập', {nhanCong: true, vanChuyen: true}, ['vanChuyen'], '0400000002'));   // cùng có hai quyền ký, chỉ khác ngành → bộ lọc ngành phải tách
    them(pn('Công ty cả hai giả lập', {nhanCong: true, vanChuyen: true}, ['khaiThac', 'vanChuyen'], '0400000003')); them(pn('Công ty cũ giả lập', {nhanCong: true, vanChuyen: true}, undefined, '0400000004'));
    const cn = (ten, cccd, vai, cv, ng, ky) => ({ten, loai: 'thenhan', nguoi: [{hoTen: ten, cccd, ngayCap: '01/01/2021', noiCap: 'Cục CS', hanCccd: '01/01/2036', gplx: vai.taiXe ? 'GP-GL-' + cccd.slice(-2) : '', hanGplx: vai.taiXe ? '01/01/2030' : '', vaiTro: vai, kyHD: ky || {}, chucVu: cv, nganh: ng}]});
    them(cn('Tài xế VC giả lập', '049000000001', {taiXe: true}, ['cvTaiXe'])); them(cn('Tài xế KT giả lập', '049000000002', {taiXe: true}, ['cvKhac'], ['khaiThac']));
    them(cn('Tài xế cũ giả lập', '049000000003', {taiXe: true}));   // dữ liệu cũ: chưa khai chức vụ / ngành
    them(cn('Công nhân KT giả lập', '049000000004', {nhanCong: true}, ['cvCongNhan'], undefined, {nhanCong: true}));
    them(cn('Chủ xe VC giả lập', '049000000005', {nhanCong: true}, ['cvChuXe'], undefined, {nhanCong: true, vanChuyen: true}));   // khai Chủ xe (Vận chuyển) → không là nhân công khai thác
    them(cn('Người cũ giả lập', '049000000006', {nhanCong: true}, undefined, undefined, {nhanCong: true}));   // dữ liệu cũ
    db.dmDoiTuong = dm; window.hak.save(db); return errs;
  });
  ok('tạo dữ liệu giả lập (4 doanh nghiệp, 6 cá nhân) hợp lệ', loi.length === 0, loi.join(' | '));
  await w.reload(); await w.waitForSelector('#side');
  // 1. bảng danh mục: chức vụ chi tiết + ngành
  await w.click('#navDm'); await w.click('#setTab_setdt'); await w.waitForSelector('#dtBang');
  const hang = async ten => w.evaluate(t => { const r = [...document.querySelectorAll('#dtBang tr[data-dt]')].find(x => x.textContent.includes(t)); return r ? {cv: [...r.querySelectorAll('[data-cv]')].map(e => e.textContent), ng: [...r.querySelectorAll('[data-ng]')].map(e => e.textContent)} : null; }, ten);
  const a = await hang('Tài xế KT giả lập'), b = await hang('Tài xế cũ giả lập'), c = await hang('Công ty cả hai giả lập'), d = await hang('Công ty cũ giả lập');
  ok('bảng đối tượng: người đã khai hiện chức vụ chi tiết (Khác) và ngành (Khai thác gỗ keo)', !!a && a.cv.join() === 'Khác' && a.ng.join() === 'Khai thác gỗ keo', JSON.stringify(a));
  ok('bảng đối tượng: người dữ liệu cũ chưa khai KHÔNG hiện chức vụ chi tiết / ngành mới', !!b && b.cv.length === 0 && b.ng.length === 0, JSON.stringify(b));
  ok('bảng đối tượng: doanh nghiệp chọn cả hai ngành hiện cả hai; doanh nghiệp cũ không hiện ngành', !!c && c.ng.join() === 'Khai thác gỗ keo,Vận chuyển' && !!d && d.ng.length === 0, JSON.stringify([c, d]));
  // 2. các danh sách chọn
  const ds = await w.evaluate(() => {
    const ten = h => [...h.matchAll(/<option[^>]*>([^<]*)<\/option>/g)].map(m => m[1]);
    return {nk: ten(window.__hak.locNganh.benNhanKhoan()).join(' | '), vc: window.__hak.locNganh.benVanChuyen().map(x => x.ten + ' ' + (x.doiTuongTen || '')).join(' | '), tx: ten(window.__hak.locNganh.taiXe()).join(' | '), nc: window.__hak.locNganh.nhanCong().map(x => x.ten).join(' | ')};
  });
  const co = (s, t) => s.includes(t);
  ok('Bên nhận khoán (Khai thác): có KT, cả hai, cũ; KHÔNG có Công ty VC (dù có quyền ký Nhân công)', co(ds.nk, 'Công ty KT giả lập') && co(ds.nk, 'Công ty cả hai giả lập') && co(ds.nk, 'Công ty cũ giả lập') && !co(ds.nk, 'Công ty VC giả lập'), ds.nk);
  ok('Bên vận chuyển (Vận chuyển): có VC, cả hai, cũ; KHÔNG có Công ty KT (dù có quyền ký Vận chuyển)', co(ds.vc, 'Công ty VC giả lập') && co(ds.vc, 'Công ty cả hai giả lập') && co(ds.vc, 'Công ty cũ giả lập') && !co(ds.vc, 'Công ty KT giả lập'), ds.vc);
  ok('Tài xế (Vận chuyển): có Tài xế VC và Tài xế cũ chưa khai; KHÔNG có Tài xế KT (khai ngành Khai thác)', co(ds.tx, 'Tài xế VC giả lập') && co(ds.tx, 'Tài xế cũ giả lập') && !co(ds.tx, 'Tài xế KT giả lập'), ds.tx);
  ok('Nhân công (Khai thác): có Công nhân KT và Người cũ chưa khai; KHÔNG có Chủ xe VC (khai Vận chuyển)', co(ds.nc, 'Công nhân KT giả lập') && co(ds.nc, 'Người cũ giả lập') && !co(ds.nc, 'Chủ xe VC giả lập'), ds.nc);
  ok('không có lỗi script', errs.length === 0, errs.join('; '));
  await app.close(); console.log(fail ? 'CÓ ' + fail + ' LỖI' : 'TẤT CẢ ĐẠT'); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
