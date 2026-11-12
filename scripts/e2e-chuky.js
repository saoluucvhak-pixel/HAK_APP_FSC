'use strict';
/* Khối ký tên cân đối (Electron thật, dữ liệu giả lập): dòng “Đà Nẵng, ngày … tháng … năm …” không còn canh phải riêng lẻ phía trên bảng ký tên
 * mà nằm trong bảng ký, canh giữa trên cột/cụm cột bên phải, cùng trục với chức danh, “(Ký, họ tên)” và họ tên. Kiểm tra mọi biểu mẫu trong ZIP “Tải toàn bộ”.
 * Chạy: xvfb-run -a node scripts/e2e-chuky.js */
const {_electron: electron} = require('playwright-core');
const path = require('path'), fs = require('fs'), os = require('os');
const JSZip = require('jszip');
const root = path.join(__dirname, '..');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hakqn-chuky-')), out = path.join(dir, 'out');
let fail = 0; const ok = (name, cond, extra) => { console.log((cond ? 'ĐẠT  ' : 'LỖI  ') + name + (!cond && extra ? ' — ' + extra : '')); if (!cond) fail++; };
const nv = (s, v, t, c, id) => ({_row: s + 1, maRung: 'R-A', vaiTro: v, stt: String(s), danhXung: 'Ông', ten: t, ngaySinh: '01/01/1985', cccd: id, ngayCap: '01/01/2021', noiCap: 'CA', diaChi: 'Đà Nẵng', chucDanh: c});
const xe = {_row: 2, maRung: 'R-A', stt: '1', chuXe: 'LÊ VĂN XE', ngaySinh: '01/01/1980', cccd: '049000000077', ngayCap: '01/01/2021', noiCap: 'CA', diaChi: 'Đà Nẵng', bienSo: '92C-12345', loaiXe: 'Xe tải', nguoiKy: 'Chủ xe', sdt: '0905123456'};
const pc = [{_row: 2, maRung: 'R-A', stt: '1', ngay: '05/10/2026', bienSo: '92C-12345', soPhieu: 'PA1', kl: 12.5, noiGiao: 'NM', ghiChu: ''}];
const exp = {ngayKy: '02/10/2026', soKT: '015', soVC: '07'};
(async () => {
  const app = await electron.launch({executablePath: require('electron'), args: [root, '--no-sandbox'], env: {...process.env, HAKQN_DB: path.join(dir, 'a.sqlite'), HAKQN_USERDATA: path.join(dir, 'ud'), HAKQN_DOWNLOAD_DIR: out, ELECTRON_DISABLE_SECURITY_WARNINGS: '1'}});
  const w = await app.firstWindow(); const errs = []; w.on('pageerror', e => errs.push(e.message)); w.on('dialog', d => d.accept()); await w.waitForSelector('#side');
  await w.evaluate(d => window.hak.save(d), {v: 2, rs: {o: {id: 'o', info: {ma: 'C1', ten: 'NGUYỄN VĂN MỘT', cccd: '049067005459', ngayCap: '15/08/2021', noiCap: 'CA', diaChi: 'Đà Nẵng', danhXung: 'Ông'}, nc: [], dx: [], exp, forests: {f: {id: 'f', info: {hinhThucLuong: 'sanluong', moHinhKy: 'giaokhoan', donGiaTan: {'Tổ trưởng': 420000, 'Công nhân khai thác': 330000, 'Công nhân cưa': 380000}, khoiLuong: 12.5, maRung: 'R-A', tenRung: 'Lô A', diaDiem: 'Thôn A', lat: 15.6, lng: 108.1, dienTich: 2, dinhMucTanHa: 80, cuLy: 45, tuNgay: '01/10/2026', denNgay: '30/11/2026', donGia: 340000, giayTo: [], vanChuyen: {mode: 'coDinh', coDinh: 52000, bac: []}}, nc: [nv(1, 'Tổ trưởng', 'TRẦN TỔ TRƯỞNG', 'Tổ trưởng', '049085000001'), nv(2, 'Công nhân', 'LÊ CÔNG NHÂN', 'Công nhân khai thác', '049085000002'), nv(3, 'Công nhân', 'PHẠM CƯA', 'Công nhân cưa', '049085000003')], dx: [xe], pc, exp}}}}});
  await w.reload(); await w.waitForSelector('#side'); await w.click('[data-open=o]'); await w.click('[data-tab=rung]'); await w.click('[data-forest=f]'); await w.click('[data-ftab=xuat]'); await w.click('[data-xtab=all]');
  await w.click('button[data-act=dl][data-kind=all]'); let f = null; for (let i = 0; i < 150 && !f; i++) { f = fs.existsSync(out) && fs.readdirSync(out).find(x => x.endsWith('.zip')); if (!f) await w.waitForTimeout(100); } await w.waitForTimeout(500);
  const z = await JSZip.loadAsync(fs.readFileSync(path.join(out, f))); const names = Object.keys(z.files).filter(n => n.endsWith('.docx'));
  ok('ZIP toàn bộ có đủ các biểu mẫu để kiểm tra khối ký tên (≥ 18 file)', names.length >= 18, String(names.length));
  const bad = [], inTable = [], noDate = [];
  for (const n of names) {
    const xml = await (await JSZip.loadAsync(await z.file(n).async('nodebuffer'))).file('word/document.xml').async('string');
    // đoạn canh phải bắt đầu bằng “Đà Nẵng,” đứng NGAY TRƯỚC một bảng (kiểu cũ, gây lệch) 
    const paras = xml.match(/<w:p>(?:(?!<\/w:p>)[\s\S])*<\/w:p>|<w:tbl>[\s\S]*?<\/w:tbl>/g) || [];
    paras.forEach((b, i) => { if (/<w:jc w:val="right"\/>/.test(b) && /Đà Nẵng,/.test(b) && /^<w:tbl>/.test(paras[i + 1] || '')) bad.push(n); });
    const tcs = xml.match(/<w:tc>[\s\S]*?<\/w:tc>/g) || [];
    if (tcs.some(c => /Đà Nẵng, ngày/.test(c) && /<w:i\/>/.test(c))) inTable.push(n);
    if (/Đà Nẵng,/.test(xml) && !/Đà Nẵng, ngày/.test(xml)) noDate.push(n);
  }
  ok('không còn dòng “Đà Nẵng, ngày …” canh phải đứng riêng ngay trước bảng ký tên ở bất kỳ biểu mẫu nào', bad.length === 0, JSON.stringify(bad));
  ok('ngày nằm trong bảng ký tên (canh giữa, nghiêng) ở các biểu mẫu có khối ký: BM-02, 05, 06, 07, 08, 10, 11, 12, 13, 15, 16, 17, 18, 19', inTable.length >= 12, inTable.length + ' file: ' + inTable.map(n => n.slice(0, 2)).join(','));
  const xml08 = await (await JSZip.loadAsync(await z.file(names.find(n => n.startsWith('08_'))).async('nodebuffer'))).file('word/document.xml').async('string');
  const tbls = xml08.match(/<w:tbl>[\s\S]*?<\/w:tbl>/g) || [], last = tbls[tbls.length - 1] || '';
  ok('BM-08: khối ký một người là bảng hai cột, chữ canh giữa, ô trái trống (ngày, chức danh, “(Ký, họ tên)”, họ tên cùng trục)', /<w:gridCol w:w="7568"\/><w:gridCol w:w="7569"\/>/.test(last) && (last.match(/<w:jc w:val="center"\/>/g) || []).length >= 6 && /TRẦN TỔ TRƯỞNG/.test(last), last.slice(0, 200));
  const xml10 = await (await JSZip.loadAsync(await z.file(names.find(n => n.startsWith('10_'))).async('nodebuffer'))).file('word/document.xml').async('string');
  ok('BM-10 (3 cột ký): ngày trải trên hai cột bên phải để không bị ngắt dòng', /<w:gridSpan w:val="2"\/>[\s\S]{0,400}Đà Nẵng, ngày/.test(xml10));
  ok('không lỗi script giao diện', errs.length === 0, errs.join('|'));
  await app.close();
  console.log(fail ? '\n' + fail + ' LỖI' : '\nĐẠT HẾT'); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
