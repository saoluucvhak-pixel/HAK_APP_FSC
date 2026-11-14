'use strict';
/* Số hợp đồng và năm trong biểu mẫu (Electron thật, dữ liệu giả lập): BM-01, BM-14, BM-20 (và BM-04) dùng chung một quy tắc.
 *  - hồ sơ năm 2026 và 2027: năm lấy từ ngày ký của chính hợp đồng, không còn ghi cứng 2026
 *  - thiếu ngày ký: để trống năm, xem trước nêu trường cần bổ sung
 *  - số đã có hậu tố: giữ nguyên
 *  - ba biểu mẫu tham chiếu cùng MỘT số hợp đồng khai thác; xem trước khớp file xuất
 * Nếu máy có LibreOffice thì chuyển thử BM-01, BM-04, BM-14, BM-20 sang PDF để kiểm tra mở được và đọc nội dung (không thay cho Microsoft Word).
 * Chạy: xvfb-run -a node scripts/e2e-sohd.js */
const {_electron: electron} = require('playwright-core');
const path = require('path'), fs = require('fs'), os = require('os'), cp = require('child_process');
const JSZip = require('jszip');
const root = path.join(__dirname, '..');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hakqn-sohd-')), out = path.join(dir, 'out');
let fail = 0; const ok = (name, cond, extra) => { console.log((cond ? 'ĐẠT  ' : 'LỖI  ') + name + (!cond && extra ? ' — ' + extra : '')); if (!cond) fail++; };
const nv = (stt, vai, ten, cd, cccd) => ({_row: stt + 1, maRung: 'R-A', vaiTro: vai, stt: String(stt), danhXung: 'Ông', ten, ngaySinh: '01/01/1985', cccd, ngayCap: '01/01/2021', noiCap: 'CA', diaChi: 'Đà Nẵng', chucDanh: cd});
const xe = {_row: 2, maRung: 'R-A', stt: '1', chuXe: 'LÊ VĂN XE', ngaySinh: '01/01/1980', cccd: '049000000077', ngayCap: '01/01/2021', noiCap: 'CA', diaChi: 'Đà Nẵng', bienSo: '92C-12345', loaiXe: 'Xe tải', nguoiKy: 'Chủ xe', sdt: '0905123456'};
const SEED = {v: 2, rs: {own1: {id: 'own1', info: {ma: 'CR-01', ten: 'NGUYỄN VĂN MỘT', cccd: '049067005459', ngayCap: '15/08/2021', noiCap: 'CA', diaChi: 'Đà Nẵng', danhXung: 'Ông'}, nc: [], dx: [], exp: {}, forests: {
  fa: {id: 'fa', info: {hinhThucLuong: 'sanluong', moHinhKy: 'giaokhoan', donGiaTan: {'Tổ trưởng': 420000, 'Công nhân khai thác': 330000, 'Công nhân cưa': 380000}, khoiLuong: 21.75, maRung: 'R-A', tenRung: 'Lô A', diaDiem: 'Thôn A', lat: 15.6, lng: 108.1, dienTich: 2, dinhMucTanHa: 80, cuLy: 45, tuNgay: '', denNgay: '', donGia: 340000, giayTo: [], vanChuyen: {mode: 'coDinh', coDinh: 52000, bac: []}},
    nc: [nv(1, 'Tổ trưởng', 'TRẦN TỔ TRƯỞNG', 'Tổ trưởng', '049085000001'), nv(2, 'Công nhân', 'LÊ CÔNG NHÂN', 'Công nhân khai thác', '049085000002'), nv(3, 'Công nhân', 'PHẠM CƯA', 'Công nhân cưa', '049085000003')], dx: [xe], pc: [], exp: {}}}}}};
async function docText(file) { const z = await JSZip.loadAsync(fs.readFileSync(file)); let all = ''; const docs = file.endsWith('.zip') ? await Promise.all(Object.keys(z.files).filter(n => n.endsWith('.docx')).map(async n => JSZip.loadAsync(await z.file(n).async('nodebuffer')))) : [z]; for (const d of docs) { const x = await d.file('word/document.xml').async('string'); all += (x.match(/<w:t[^>]*>([^<]*)<\/w:t>/g) || []).map(a => a.replace(/<[^>]+>/g, '')).join('') + '\n'; } return all.replace(/&amp;/g, '&'); }
(async () => {
  const app = await electron.launch({executablePath: require('electron'), args: [root, '--no-sandbox'], env: {...process.env, HAKQN_CLOSE: 'discard', HAKQN_DB: path.join(dir, 's.sqlite'), HAKQN_USERDATA: path.join(dir, 'ud'), HAKQN_DOWNLOAD_DIR: out, ELECTRON_DISABLE_SECURITY_WARNINGS: '1'}});
  const w = await app.firstWindow(); const errs = []; w.on('pageerror', e => errs.push(e.message)); w.on('dialog', d => d.accept()); await w.waitForSelector('#side');
  await w.evaluate(d => window.hak.save(d), SEED); await w.reload(); await w.waitForSelector('#side');
  await w.click('[data-open=own1]'); await w.click('[data-tab=rung]'); await w.click('[data-forest=fa]'); await w.click('[data-ftab=xuat]');
  const setP = async (k, v) => { await w.fill(`[data-exp=${k}]`, v); await w.dispatchEvent(`[data-exp=${k}]`, 'change'); };
  const exportOf = async (kind, xt) => { await w.click(`[data-xtab=${xt}]`); for (const f of fs.existsSync(out) ? fs.readdirSync(out) : []) fs.unlinkSync(path.join(out, f)); await w.click(`button[data-act=dl][data-kind=${kind}]`); let f = null; for (let i = 0; i < 80 && !f; i++) { f = fs.existsSync(out) && fs.readdirSync(out).find(x => /\.(zip|docx)$/.test(x)); if (!f) await w.waitForTimeout(100); } await w.waitForTimeout(300); const p = path.join(out, f), t = await docText(p); fs.copyFileSync(p, path.join(dir, kind + '_' + Date.now() + path.extname(p))); return t; };
  const three = async () => ({gk: await exportOf('gk', 'hd'), nttl: await exportOf('nttl', 'hd'), uq: await exportOf('uq', 'hd')});
  const prev = () => w.innerText('#soPreviewHd');

  await w.click('[data-xtab=hd]');
  // ===== hồ sơ năm 2026 =====
  await setP('soKT', '015'); await setP('ngayKy', '05/01/2026'); await setP('uqSo', '02'); await setP('ntSo', '03'); await setP('ntNgay', '15/06/2026');
  ok('xem trước (2026): số đầy đủ 015/2026-KT, 02/2026-UQ, 03/2026-NTTL', /015\/2026-KT/.test(await prev()) && /02\/2026-UQ/.test(await prev()) && /03\/2026-NTTL/.test(await prev()), await prev());
  let t = await three();
  ok('2026: BM-01 (Số: 015/2026-KT), BM-14 và BM-20 cùng tham chiếu 015/2026-KT', t.gk.includes('Số: 015/2026-KT') && t.nttl.includes('015/2026-KT') && t.uq.includes('số 015/2026-KT'), JSON.stringify([t.gk.slice(0, 300)]));
  ok('2026: BM-20 có số riêng 02/2026-UQ; BM-14 có số riêng 03/2026-NTTL', t.uq.includes('Số: 02/2026-UQ') && t.nttl.includes('Số: 03/2026-NTTL'));
  // ===== hồ sơ năm 2027 =====
  await setP('ngayKy', '10/02/2027'); await setP('uqSo', '02'); await setP('ntNgay', '15/06/2027');
  ok('xem trước (2027): 015/2027-KT', /015\/2027-KT/.test(await prev()) && /03\/2027-NTTL/.test(await prev()), await prev());
  t = await three();
  ok('2027: BM-01, BM-14, BM-20 cùng 015/2027-KT và không còn ghi cứng 2026', [t.gk, t.nttl, t.uq].every(x => x.includes('015/2027-KT')) && ![t.gk, t.nttl, t.uq].some(x => /2026/.test(x)), [t.gk, t.nttl, t.uq].map(x => (x.match(/.{20}2026.{20}/) || [''])[0]).join(' | '));
  ok('2027: BM-20 02/2027-UQ, BM-14 03/2027-NTTL', t.uq.includes('02/2027-UQ') && t.nttl.includes('03/2027-NTTL'));
  // ===== số đã có hậu tố: giữ nguyên =====
  await setP('soKT', '015/2025-KT');
  ok('xem trước: số đã đầy đủ được giữ nguyên', /015\/2025-KT/.test(await prev()) && /giữ nguyên/.test(await prev()));
  t = await three();
  ok('số đã có hậu tố 015/2025-KT giữ nguyên ở cả BM-01, BM-14, BM-20 (không ghép năm 2027)', [t.gk, t.nttl, t.uq].every(x => x.includes('015/2025-KT')) && ![t.gk, t.nttl, t.uq].some(x => x.includes('015/2027-KT')));
  // ===== thiếu ngày ký =====
  await setP('soKT', '015'); await setP('ngayKy', ''); await setP('uqNgay', ''); await setP('ntNgay', ''); await setP('ntSo', '03');
  const pv = await prev();
  ok('thiếu ngày ký: xem trước để trống năm và nêu trường cần bổ sung', /015\/……-KT/.test(pv) && /chưa có năm/i.test(pv) && /Ngày ký hợp đồng/.test(pv), pv);
  t = await three();
  ok('thiếu ngày ký: BM-01, BM-14, BM-20 in 015/……-KT (không tự điền năm), cùng một số', [t.gk, t.nttl, t.uq].every(x => x.includes('015/……-KT')) && ![t.gk, t.nttl, t.uq].some(x => /\/20\d\d-(KT|UQ|NTTL)/.test(x)));
  ok('dòng ngày để trống không ghi sẵn năm: “ngày ….. tháng ….. năm …….”', t.gk.includes('năm …….') || t.nttl.includes('năm …….') || t.uq.includes('năm …….'));
  // ngày ký không có thật
  await setP('ngayKy', '31/02/2027'); ok('ngày ký không có thật (31/02/2027): xem trước vẫn báo chưa có năm', /chưa có năm/i.test(await prev()));
  // ===== BM-04 =====
  await setP('ngayKy', '10/02/2027'); await w.click('[data-xtab=vc]'); await setP('soVC', '07'); await w.waitForTimeout(100);
  ok('xem trước hợp đồng vận chuyển: 07/2027-HĐVC', /07\/2027-HĐVC/.test(await w.innerText('#soPreviewVc')), await w.innerText('#soPreviewVc'));
  const vc = await exportOf('hdvc', 'vc'); ok('BM-04: Số: 07/2027-HĐVC và không còn 2026 cố định', vc.includes('Số: 07/2027-HĐVC') && !/2026/.test(vc));
  // ===== chuyển thử sang PDF bằng LibreOffice (nếu có) =====
  const soffice = ['soffice', 'libreoffice'].find(c => { try { cp.execSync('command -v ' + c, {stdio: 'ignore'}); return true; } catch (e) { return false; } });
  if (soffice) {
    const pdfDir = path.join(dir, 'pdf'); fs.mkdirSync(pdfDir);
    await w.click('[data-xtab=hd]'); await setP('soKT', '015'); await setP('ngayKy', '10/02/2027'); await setP('ntNgay', '15/06/2027');
    for (const [kind, xt, mark] of [['gk', 'hd', 'HỢP ĐỒNG KHAI THÁC'], ['nttl', 'hd', 'NGHIỆM THU'], ['uq', 'hd', 'GIẤY ỦY QUYỀN'], ['hdvc', 'vc', 'HỢP ĐỒNG VẬN CHUYỂN']]) {
      await exportOf(kind, xt); const f = path.join(out, fs.readdirSync(out).find(x => /\.(zip|docx)$/.test(x)));
      let docx = f; if (f.endsWith('.zip')) { const z = await JSZip.loadAsync(fs.readFileSync(f)); const n = Object.keys(z.files).find(k => k.endsWith('.docx')); docx = path.join(pdfDir, kind + '.docx'); fs.writeFileSync(docx, await z.file(n).async('nodebuffer')); } else { docx = path.join(pdfDir, kind + '.docx'); fs.copyFileSync(f, docx); }
      cp.execFileSync(soffice, ['--headless', '--convert-to', 'pdf', '--outdir', pdfDir, docx], {timeout: 120000, stdio: 'ignore'});
      const pdf = path.join(pdfDir, kind + '.pdf'); let txt = ''; try { txt = cp.execFileSync('pdftotext', ['-layout', pdf, '-'], {encoding: 'utf8'}); } catch (e) { txt = '(không có pdftotext)'; }
      ok('LibreOffice mở và dựng PDF cho ' + kind + ': có tiêu đề và số hợp đồng 2027', fs.existsSync(pdf) && fs.statSync(pdf).size > 5000 && (txt.startsWith('(không') || (txt.toUpperCase().includes(mark) && /2027/.test(txt) && !/2026/.test(txt))), txt.slice(0, 200));
    }
  } else console.log('BỎ QUA  không có LibreOffice để dựng thử PDF');
  ok('không lỗi script giao diện', errs.length === 0, errs.join('|'));
  await app.close();
  console.log(fail ? '\n' + fail + ' LỖI' : '\nĐẠT HẾT'); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
