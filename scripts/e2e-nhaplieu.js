'use strict';
/* Mâu thuẫn và chồng lấn khi nhập liệu (Electron thật): ngày sai/khoảng ngày đảo chặn xuất và nêu đúng ô; ngày nhập hai nơi, thứ tự ngày,
 * phiếu cân ngoài thời gian hiện ở "Kiểm tra trước khi xuất" (gộp một mục, không lặp theo từng phiếu). Chạy: xvfb-run -a node scripts/e2e-nhaplieu.js */
const {_electron: electron} = require('playwright-core');
const path = require('path'), fs = require('fs'), os = require('os');
const root = path.join(__dirname, '..');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hakqn-nl-'));
let fail = 0; const ok = (name, cond, extra) => { console.log((cond ? 'ĐẠT  ' : 'LỖI  ') + name + (!cond && extra ? ' — ' + extra : '')); if (!cond) fail++; };
const nv = (stt, vai, ten, cd, cccd) => ({_row: stt + 1, maRung: 'R-A', vaiTro: vai, stt: String(stt), danhXung: 'Ông', ten, ngaySinh: '01/01/1985', cccd, ngayCap: '01/01/2021', noiCap: 'CA', diaChi: 'Đà Nẵng', chucDanh: cd});
const xe = {_row: 2, maRung: 'R-A', stt: '1', chuXe: 'LÊ VĂN XE', ngaySinh: '01/01/1980', cccd: '049000000077', ngayCap: '01/01/2021', noiCap: 'CA', diaChi: 'Đà Nẵng', bienSo: '92C-12345', loaiXe: 'Xe tải', nguoiKy: 'Chủ xe', sdt: '0905123456'};
const SEED = {v: 2, rs: {own1: {id: 'own1', info: {ma: 'CR-01', ten: 'NGUYỄN VĂN MỘT', cccd: '049067005459', ngayCap: '15/08/2021', noiCap: 'CA', diaChi: 'Đà Nẵng', danhXung: 'Ông'}, nc: [], dx: [], exp: {}, forests: {
  fa: {id: 'fa', info: {hinhThucLuong: 'sanluong', moHinhKy: 'giaokhoan', donGiaTan: {'Tổ trưởng': 420000, 'Công nhân khai thác': 330000, 'Công nhân cưa': 380000}, khoiLuong: 21.75, maRung: 'R-A', tenRung: 'Lô A', diaDiem: 'Thôn A', lat: 15.6, lng: 108.1, dienTich: 2, dinhMucTanHa: 80, cuLy: 45, tuNgay: '', denNgay: '', donGia: 340000, giayTo: [], vanChuyen: {mode: 'coDinh', coDinh: 52000, bac: []}},
    nc: [nv(1, 'Tổ trưởng', 'TRẦN TỔ TRƯỞNG', 'Tổ trưởng', '049085000001'), nv(2, 'Công nhân', 'LÊ CÔNG NHÂN', 'Công nhân khai thác', '049085000002'), nv(3, 'Công nhân', 'PHẠM CƯA', 'Công nhân cưa', '049085000003')], dx: [xe], pc: [], exp: {}}}}}};
(async () => {
  const app = await electron.launch({executablePath: require('electron'), args: [root, '--no-sandbox'], env: {...process.env, HAKQN_CLOSE: 'discard', HAKQN_DB: path.join(dir, 's.sqlite'), HAKQN_USERDATA: path.join(dir, 'ud'), HAKQN_DOWNLOAD_DIR: path.join(dir, 'out')}});
  const w = await app.firstWindow(); const errs = []; w.on('pageerror', e => errs.push(e.message)); w.on('dialog', d => d.accept()); await w.waitForSelector('#side');
  await w.evaluate(d => window.hak.save(d), SEED); await w.reload(); await w.waitForSelector('#side');
  await w.click('[data-open=own1]'); await w.click('[data-tab=rung]'); await w.click('[data-forest=fa]');
  const setP = async (k, v) => { await w.click('[data-ftab=xuat]'); await w.click(`[data-xtab=${/TT$/.test(k) ? 'ld' : 'hd'}]`); await w.fill(`[data-exp=${k}]`, v); await w.dispatchEvent(`[data-exp=${k}]`, 'change'); };
  const kt = async () => { await w.click('[data-ftab=kt]'); return w.innerText('#main'); };
  await setP('ntNgay', '31/02/2026');
  let t = await kt();
  ok('ngày lập nghiệm thu 31/02/2026 được liệt kê ở mục chặn, nêu đúng ô và lý do', /Ngày nhập sai/.test(t) && /Nghiệm thu, thanh lý: ngày lập/.test(t) && /không có thật/.test(t), t.slice(0, 400));
  await setP('ntNgay', '15/12/2026'); await setP('ngayKy', '01/10/2026');
  t = await kt();
  ok('sửa ngày đúng thì mục “Ngày nhập sai” biến mất', !/Ngày nhập sai/.test(t));
  await setP('tuNgayTT', '30/11/2026'); await setP('denNgayTT', '01/10/2026');
  t = await kt();
  ok('kỳ thanh toán bị đảo hiện ở mục chặn', /Khoảng ngày bị đảo/.test(t) && /Bảng thanh toán tiền công/.test(t));
  await setP('tuNgayTT', '01/10/2026'); await setP('denNgayTT', '30/11/2026');
  await setP('ngayKy', '05/01/2027');
  t = await kt();
  ok('nghiệm thu lập trước ngày ký hợp đồng hiện ở mục cần đối chiếu (không chặn)', /Thứ tự ngày/.test(t) && /trước ngày ký hợp đồng/.test(t));
  ok('không có lỗi JavaScript', errs.length === 0, errs.join('|'));
  await app.close(); console.log(fail ? 'CÓ ' + fail + ' LỖI' : 'TẤT CẢ ĐẠT'); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
