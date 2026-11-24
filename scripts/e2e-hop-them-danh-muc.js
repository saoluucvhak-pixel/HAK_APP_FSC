'use strict';
/* Bước 3 Danh mục: sau khi lưu lô có người / xe MỚI (chưa có trong danh mục), ứng dụng mở HỘP THOẠI (không còn confirm của trình duyệt):
 *  - liệt kê rõ từng người (họ tên, CCCD, vai trò) và từng xe (biển số, chủ xe / tài xế) kèm ô tích, mặc định tích hết; có tiêu đề, aria-labelledby;
 *  - bỏ tích một người → “Thêm vào danh mục” chỉ thêm số đã tích, dòng lô nối ID người / xe vừa thêm, thông báo kết quả;
 *  - “Chỉ lưu trong lô” (và Esc) không thêm gì vào danh mục nào, dòng vẫn nằm trong lô.
 * Electron thật, SQLite thật. Chạy: xvfb-run -a node scripts/e2e-hop-them-danh-muc.js */
const {_electron: electron} = require('playwright-core');
const path = require('path'), fs = require('fs'), os = require('os');
const src = fs.readFileSync(path.join(__dirname, 'e2e-inan2.js'), 'utf8');
const {lot, seed} = new Function(src.slice(src.indexOf('const nv ='), src.indexOf('const plain =')) + '; return {lot, seed};')();
const root = path.join(__dirname, '..');
process.env.HAKQN_E2E_TAY_HOP = '1';   // bộ này tự thao tác hộp thoại: tắt bộ tự bấm của _hd30
let fail = 0; const ok = (name, cond, extra) => { console.log((cond ? 'ĐẠT  ' : 'LỖI  ') + name + (!cond && extra ? ' — ' + extra : '')); if (!cond) fail++; };
const CC1 = '049090000123', CC2 = '049090000456', BKS = '92C-777.88';

async function chay(cach) {   // cach: 'bo1' (bỏ tích người 2 rồi Thêm), 'lo' (nút Chỉ lưu trong lô), 'esc' (nhấn Esc)
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hakqn-hopdm-'));
  const app = await electron.launch({executablePath: require('electron'), args: [root, '--no-sandbox'], env: {...process.env, HAKQN_CLOSE: 'discard', HAKQN_DB: path.join(dir, 'd.sqlite'), HAKQN_USERDATA: path.join(dir, 'ud'), HAKQN_DOWNLOAD_DIR: path.join(dir, 'out')}});
  const w = require('./_hd30').boc(await app.firstWindow()); const errs = [], hoi = []; w.on('pageerror', e => errs.push(e.message));
  w.on('dialog', d => { hoi.push(d.message()); d.accept(); });
  await w.waitForSelector('#side');
  await w.evaluate(d => window.hak.save(d), seed([lot('fa', 'R-A', {exp: {}, pc: [], kl: null})])); await w.reload(); await w.waitForSelector('#side');
  const db0 = await w.evaluate(() => window.hak.loadSync().db), dt0 = (db0.dmDoiTuong || []).length, xe0 = (db0.dmXe || []).length;
  await w.click('[data-open=own1]'); await w.click('[data-tab=rung]'); await w.click('[data-forest=fa]'); await w.click('[data-ftab=nc]'); await w.waitForTimeout(300);
  const them = async (ten, cccd) => {
    await w.click('[data-act=stAdd][data-kind=nc]'); await w.waitForSelector('#stForm [name=ten]');
    await w.selectOption('#stForm [name=vaiTro]', 'Công nhân'); await w.selectOption('#stForm [name=danhXung]', 'Ông');
    for (const [k, v] of [['ten', ten], ['ngaySinh', '02/03/1990'], ['cccd', cccd], ['ngayCap', '01/01/2022'], ['noiCap', 'Cục CS QLHC'], ['diaChi', 'Quế Sơn, Quảng Nam']]) await w.fill('#stForm [name=' + k + ']', v);
    await w.selectOption('#stForm [name=chucDanh]', 'Công nhân khai thác').catch(() => {});
    await w.click('#stForm [type=submit]'); await w.waitForTimeout(300);
  };
  await them('NGUYỄN VĂN MỘT', CC1); await them('TRẦN VĂN HAI', CC2);
  await w.click('[data-ftab=dx]'); await w.waitForTimeout(300); await w.click('[data-act=stAdd][data-kind=dx]'); await w.waitForSelector('#stForm [name=bienSo]');
  const dat = async (k, v) => { const sel = await w.$('#stForm select[name=' + k + ']'); if (sel) await w.selectOption('#stForm select[name=' + k + ']', v); else await w.fill('#stForm input[name=' + k + ']', v); };
  for (const [k, v] of Object.entries({bienSo: BKS, chuXe: 'LÊ VĂN CHỦ', ngaySinh: '05/05/1980', cccd: '049080001111', ngayCap: '01/01/2022', noiCap: 'Cục CS QLHC', diaChi: 'Thăng Bình, Quảng Nam', sdt: '0905123456', nguoiKy: 'Chủ xe', loaiXe: 'Xe tải', taiXe: 'PHẠM VĂN LÁI'})) await dat(k, v);
  await w.click('#stForm [type=submit]'); await w.waitForTimeout(300);
  const loiForm = await w.evaluate(() => (document.querySelector('#stBox.on #stForm') ? document.getElementById('stBody').innerText.slice(0, 300) : ''));
  if (loiForm) throw new Error('Biểu mẫu xe không lưu được: ' + loiForm);
  await w.click('button[data-act=stSave]'); await w.waitForSelector('#dmHopDlg', {timeout: 5000}).catch(() => {});
  const hop = await w.evaluate(() => {
    const d = document.getElementById('dmHopDlg'), b = document.getElementById('dlgBox'); if (!d) return null;
    const lb = b.getAttribute('aria-labelledby'), tit = lb && document.getElementById(lb);
    return {on: b.classList.contains('on'), text: d.innerText, o: [...d.querySelectorAll('[data-dmhop]')].map(c => [c.dataset.dmhop, c.checked]), tieuDe: tit ? tit.textContent : '', role: b.getAttribute('role'), modal: b.getAttribute('aria-modal'),
      focus: (document.activeElement && document.activeElement.dataset.act) || '', hasLo: !!d.querySelector('[data-act=dmHopLo]'), hasThem: !!d.querySelector('[data-act=dmHopThem]')};
  });
  let sau = null;
  if (hop) {
    if (cach === 'bo1') { await w.uncheck('#dmHopDlg [data-dmhop=n1]'); await w.waitForTimeout(100); sau = await w.evaluate(() => (document.getElementById('dmHopDem') || {}).textContent); await w.click('#dmHopDlg [data-act=dmHopThem]'); }
    else if (cach === 'lo') await w.click('#dmHopDlg [data-act=dmHopLo]');
    else await w.keyboard.press('Escape');
    await w.waitForTimeout(900);
  }
  const dong = await w.evaluate(() => !document.getElementById('dmHopDlg') && !document.getElementById('dlgBox').classList.contains('on'));
  const tb = await w.evaluate(() => (document.getElementById('app') || document.body).innerText);
  const db = await w.evaluate(() => window.hak.loadSync().db), f = db.rs.own1.forests.fa;
  const tim = c => (db.dmDoiTuong || []).find(o => (o.nguoi || []).some(p => p.cccd === c)), r1 = (f.nc || []).find(x => x.cccd === CC1), r2 = (f.nc || []).find(x => x.cccd === CC2), x1 = (f.dx || []).find(x => /777/.test(x.bienSo || ''));
  const dmXe = db.dmXe || [];
  await app.close();
  return {hop, sau, dong, tb, dt: (db.dmDoiTuong || []).length - dt0, xe: dmXe.length - xe0, t1: tim(CC1), t2: tim(CC2), r1, r2, x1, dmXe, hoi, errs, loiForm};
}

(async () => {
  const a = await chay('bo1');
  ok('lưu lô: hộp thoại trong ứng dụng hiện ra (không dùng confirm của trình duyệt)', !!a.hop && a.hop.on && !a.hoi.some(m => /Danh mục đối tượng/.test(m)), JSON.stringify([!!a.hop, a.hoi]));
  const h = a.hop || {text: '', o: []};
  ok('hộp liệt kê đúng 2 người (họ tên, CCCD, vai trò Nhân công) và 1 xe (biển số, chủ xe / tài xế)', /NGUYỄN VĂN MỘT/.test(h.text) && /TRẦN VĂN HAI/.test(h.text) && h.text.includes(CC1) && h.text.includes(CC2) && /Nhân công/.test(h.text) && /92C-777\.88/.test(h.text) && /LÊ VĂN CHỦ/.test(h.text) && /PHẠM VĂN LÁI/.test(h.text) && h.o.length === 3, JSON.stringify(h.text));
  ok('mặc định tích hết cả 3 dòng', h.o.length === 3 && h.o.every(x => x[1]), JSON.stringify(h.o));
  ok('hộp có tiêu đề, role dialog, aria-modal, aria-labelledby trỏ đúng tiêu đề; tiêu điểm vào nút “Thêm vào danh mục”', /Thêm vào danh mục/.test(h.tieuDe) && h.role === 'dialog' && h.modal === 'true' && h.focus === 'dmHopThem' && h.hasLo && h.hasThem, JSON.stringify([h.tieuDe, h.role, h.modal, h.focus]));
  ok('bỏ tích một người: bộ đếm trên nút còn 2', a.sau === '2', String(a.sau));
  ok('“Thêm vào danh mục”: hộp đóng; danh mục có đúng số đã tích (1 người, 1 xe); người bỏ tích KHÔNG được thêm', a.dong && a.dt === 1 && a.xe === 1 && !!a.t1 && !a.t2, JSON.stringify([a.dong, a.dt, a.xe, !!a.t1, !!a.t2]));
  ok('người được thêm: thể nhân, vai trò Nhân công, dòng lô nối ID người; người bỏ tích vẫn ở lô, không nối ID', !!a.t1 && a.t1.loai === 'thenhan' && a.t1.nguoi[0].vaiTro.nhanCong && !!a.r1 && a.r1.nguoiId === a.t1.nguoi[0].id && !!a.r2 && !a.r2.nguoiId, JSON.stringify([a.r1 && a.r1.nguoiId, a.r2 && a.r2.nguoiId]));
  ok('xe được thêm: dòng xe nối ID xe của Danh mục xe', !!a.x1 && a.dmXe.some(x => x.id === a.x1.xeId && /777/.test(x.bks || '')), JSON.stringify(a.x1 && a.x1.xeId));
  ok('thông báo kết quả: “Đã thêm 1 người vào Danh mục đối tượng, 1 xe vào Danh mục xe.”', /Đã thêm 1 người vào Danh mục đối tượng, 1 xe vào Danh mục xe\./.test(a.tb), a.tb.slice(0, 400));
  for (const cach of ['lo', 'esc']) {
    const b = await chay(cach);
    ok('[' + cach + '] hộp hiện ra rồi đóng', !!b.hop && b.dong, JSON.stringify([!!b.hop, b.dong]));
    ok('[' + cach + '] chỉ lưu trong lô: không thêm gì vào Danh mục đối tượng / Danh mục xe, dòng vẫn nằm trong lô, không nối ID', b.dt === 0 && b.xe === 0 && !b.t1 && !b.t2 && !!b.r1 && !!b.r2 && !!b.x1 && !b.r1.nguoiId && !b.r2.nguoiId && !b.x1.xeId, JSON.stringify([b.dt, b.xe, !!b.r1, !!b.r2, !!b.x1]));
    ok('[' + cach + '] thông báo “Chưa thêm … vào danh mục (chỉ lưu trong lô).”', /Chưa thêm 2 người chưa có trong Danh mục đối tượng và 1 xe chưa có trong Danh mục xe vào danh mục \(chỉ lưu trong lô\)\./.test(b.tb), b.tb.slice(0, 400));
    ok('[' + cach + '] không có lỗi script trên màn hình', b.errs.length === 0, b.errs.join(' | '));
  }
  ok('không có lỗi script trên màn hình (nhánh Thêm)', a.errs.length === 0, a.errs.join(' | '));
  console.log(fail ? 'CÓ ' + fail + ' LỖI' : 'TẤT CẢ ĐẠT'); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
