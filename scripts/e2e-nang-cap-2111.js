'use strict';
/* Nâng cấp theo rà soát 21/11/2026 (chỉ đạo trực tiếp của CHỦ) — Electron thật, cửa sổ 1366×768:
 *  A1  bộ lọc bảng nhập liệu: lọc hết dòng thì nói “Không có dòng nào khớp bộ lọc” (không mời nhập lại); đổi sang lô khác thì bộ lọc về mặc định;
 *  A2  “+ Chọn từ Danh mục xe” ở một hợp đồng: xe đã thuộc đội xe khác của cùng lô hiện nhưng không chọn được (“Chọn tất cả” cũng bỏ qua);
 *  A5  lưu lô: chỉ hỏi trùng với lô khác cho phiếu MỚI / vừa đổi số, ngày; so theo số phiếu + ngày cân (không hỏi lại phiếu đã lưu);
 *  B1  danh sách hợp đồng vận chuyển không hiện mã HTML thô;  B2  trang phiếu cân không lặp tiêu đề “Phiếu cân của hợp đồng”;
 *  B3  đường dẫn dùng đúng tên đội như danh sách đội;  B4  tab mục Phiếu cân ghi tấn 3 số lẻ như dòng Tổng;
 *  A7  khung hẹp (≤ 1100 px): khung danh sách (<aside>) không che nút của khung chi tiết;
 *  C   bảng phiếu cân: Số phiếu → Ngày cân 1/2 → BKS trên phiếu → Xe · hợp đồng → các cột kg liền nhau → KL (tấn); không còn tiêu đề “Cân lần 1” cho cột ngày.
 * Chạy: xvfb-run -a node scripts/e2e-nang-cap-2111.js */
const {_electron: electron} = require('playwright-core');
const path = require('path'), fs = require('fs'), os = require('os');
const src = fs.readFileSync(path.join(__dirname, 'e2e-inan2.js'), 'utf8');
const {lot, seed, PC, EXP1, P} = new Function(src.slice(src.indexOf('const nv ='), src.indexOf('const plain =')) + '; return {lot, seed, PC, EXP1, P};')();
const root = path.join(__dirname, '..');
let fail = 0; const ok = (name, cond, extra) => { console.log((cond ? 'ĐẠT  ' : 'LỖI  ') + name + (!cond && extra ? ' — ' + extra : '')); if (!cond) fail++; };
(async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hakqn-nc2111-'));
  const app = await electron.launch({executablePath: require('electron'), args: [root, '--no-sandbox'], env: {...process.env, HAKQN_CLOSE: 'discard', HAKQN_DB: path.join(dir, 'd.sqlite'), HAKQN_USERDATA: path.join(dir, 'ud')}});
  const w = await app.firstWindow(); const errs = [], hoi = []; w.on('pageerror', e => errs.push(e.message)); w.on('dialog', d => { hoi.push(d.message()); d.accept(); });
  await w.waitForSelector('#side');
  await app.evaluate(({BrowserWindow}) => BrowserWindow.getAllWindows()[0].setContentSize(1366, 768));
  /* lô B có phiếu PA1 cùng số, cùng ngày với lô A (đã lưu từ trước) và phiếu ZZ9 ngày 09/10/2026 xe 92C-99999 (phiếu giống hệt cả biển số thì hộp thêm phiếu đã chặn từ trước; ở đây khác biển số nên phải hỏi khi lưu) */
  const pcB = PC.map(p => Object.assign({}, p, {soPhieu: 'B' + p.soPhieu, maRung: 'R-B'})).concat([Object.assign({}, PC[0], {maRung: 'R-B', bienSo: '92C-99999'}), P(9, '09/10/2026', '92C-99999', 'ZZ9', 5)].map(p => Object.assign({}, p, {maRung: 'R-B'})));
  await w.evaluate(d => window.hak.save(d), seed([lot('fa', 'R-A', {exp: EXP1, pc: PC, kl: 29.75}), lot('fb', 'R-B', {exp: EXP1, pc: pcB, kl: 29.75})])); await w.reload(); await w.waitForSelector('#side');
  const moLo = async (fid, tab) => { await w.click('[data-open=own1]').catch(() => {}); await w.click('[data-tab=rung]'); await w.evaluate(() => { const d = document.querySelector('.rungTomTat'); if (d) d.open = true; });
    await w.click('[data-forest=' + fid + ']'); await w.click('[data-ftab=' + tab + ']'); await w.waitForTimeout(250); };
  const moHd = async (tab, muc, i) => { const r = await w.$$(tab === 'dx' ? '#dsHdVcTbl tbody tr[data-act]' : '#dsHdNcTbl tbody tr[data-act]'); if (r[i || 0]) await r[i || 0].click(); await w.waitForTimeout(200);
    if (muc) await w.evaluate(([k, id]) => window.__hak.mucLo && window.__hak.mucLo(k, id), [tab, muc]); await w.waitForTimeout(250); };

  // B1, B2, B4, C — trang phiếu cân của hợp đồng (lô A)
  await moLo('fa', 'dx');
  ok('B1: danh sách hợp đồng vận chuyển không hiện mã HTML thô (“<span”)', !/<span|class=/.test(await w.innerText('#main')), (await w.innerText('#main')).match(/.{0,40}<span.{0,40}/) || '');
  await moHd('dx', 'phieu'); await w.waitForSelector('#stTbl_pc');
  const th = await w.$$eval('#stTbl_pc thead th', l => l.map(x => x.textContent.trim()));
  const iSo = th.indexOf('Số phiếu'), iN1 = th.indexOf('Ngày cân 1'), iN2 = th.indexOf('Ngày cân 2'), iB = th.indexOf('BKS trên phiếu'), iX = th.indexOf('Xe · hợp đồng'), iK1 = th.indexOf('Cân 1 (kg)'), iK2 = th.indexOf('Cân 2 (kg)'), iKg = th.indexOf('KL (kg)'), iT = th.indexOf('KL (tấn)');
  ok('C: thứ tự cột Số phiếu → Ngày cân 1 → Ngày cân 2 → BKS trên phiếu → Xe · hợp đồng → Cân 1 (kg) → Cân 2 (kg) → KL (kg) → KL (tấn), liền nhau', iSo === 2 && [iSo, iN1, iN2, iB, iX, iK1, iK2, iKg, iT].every((v, k, a) => !k || v === a[k - 1] + 1), th.join(' | '));
  ok('C: không còn cột ngày mang tên “Cân lần 1/2” (dễ nhầm với cột kg)', !th.includes('Cân lần 1') && !th.includes('Cân lần 2'), th.join(' | '));
  const dong = await w.$$eval('#stTbl_pc tbody tr', l => l.map(r => [...r.cells].map(c => c.innerText.trim())));
  const pa1 = dong.find(r => r[2] === 'PA1');
  ok('C: dòng PA1 đúng cột (số phiếu, ngày 05/10/2026, KL tấn 12,500)', !!pa1 && /05\/10\/2026/.test(pa1[3]) && pa1[10] === '12,500', JSON.stringify(pa1));
  const tieuDe = await w.$$eval('#main h3, #main h4', l => l.filter(e => e.offsetParent && e.getBoundingClientRect().width > 2 && !e.classList.contains('sro')).map(e => e.textContent.trim()));
  ok('B2: không còn tiêu đề nhìn thấy “Phiếu cân của hợp đồng” (đã có ở tab mục Phiếu cân)', !tieuDe.some(t => /^Phiếu cân của hợp đồng/.test(t)) && !!(await w.$('#pcHd h3')), tieuDe.join(' | '));
  const badge = await w.$eval('.mucNav [aria-current]', e => e.innerText.replace(/\s+/g, ' ').trim()).catch(() => '');
  ok('B4: tab mục Phiếu cân ghi tấn 3 số lẻ (như dòng Tổng)', /\d+ · \d+,\d{3} t/.test(badge), badge);

  // A1 — bộ lọc che hết dòng; đổi lô thì bộ lọc về mặc định
  await w.fill('.hak-sf-q[data-sfq=lo_phieu_can]', 'khongcophieunay'); await w.waitForTimeout(300);
  const trong = await w.$eval('#stTbl_pc tbody', b => b.innerText).catch(() => '');
  ok('A1: lọc hết dòng → “Không có dòng nào khớp bộ lọc”, nêu lô đã có dữ liệu, có nút Xóa tất cả lọc; KHÔNG mời “+ Thêm phiếu cân mới”',
    /Không có dòng nào khớp bộ lọc/.test(trong) && /đã có dữ liệu/.test(trong) && !/Chưa có dữ liệu/.test(trong) && !!(await w.$('#stTbl_pc [data-sfreset=lo_phieu_can]')), trong);
  await moLo('fb', 'dx'); await moHd('dx', 'phieu'); await w.waitForTimeout(250);
  const qB = await w.$eval('.hak-sf-q[data-sfq=lo_phieu_can]', e => e.value).catch(() => null), nB = await w.$$eval('#stTbl_pc tbody tr', l => l.filter(r => !r.querySelector('[data-bang-trong]')).length);
  ok('A1: sang lô khác, bộ lọc về mặc định (ô tìm trống) và bảng hiện phiếu của lô đó', qB === '' && nB > 0, JSON.stringify({qB, nB}));

  // B3 — tên đội ở đường dẫn = tên ở danh sách đội
  await moLo('fa', 'nc'); await moHd('nc', 'thanhvien');
  const crumb = await w.innerText('#loCrumb').catch(() => ''), tenDs = await w.$eval('#dsHdNcTbl tbody tr[data-act] b', e => e.textContent.trim()).catch(() => '');
  ok('B3: đường dẫn dùng đúng tên đội của danh sách đội (' + tenDs + ')', !!tenDs && crumb.includes(tenDs), crumb + ' || ' + tenDs);

  // A2 — chọn xe từ danh mục ở hợp đồng 1: xe của đội xe khác cùng lô không chọn được
  await moLo('fa', 'dx'); await moHd('dx', 'xe', 0);
  await w.click('[data-act=dmChonNhieu][data-kind=dx]'); await w.waitForSelector('#dlgBox [data-act=dmChonNhieuLuu]');
  const khac = await w.$$eval('#dlgBox tr', l => l.filter(r => r.querySelector('[data-xe-khac]')).map(r => ({t: r.innerText.replace(/\s+/g, ' ').trim(), dis: r.querySelector('[data-dmpick]').disabled})));
  await w.click('#dlgBox [data-act=dmPickAll]'); await w.waitForTimeout(150);
  const chonKhac = await w.$$eval('#dlgBox tr', l => l.filter(r => r.querySelector('[data-xe-khac]') && r.querySelector('[data-dmpick]').checked).length);
  ok('A2: xe đã thuộc đội xe khác của lô hiện nhãn “đã ở …” và không chọn được; “Chọn tất cả đang hiện” bỏ qua xe đó', khac.length >= 1 && khac.every(x => x.dis) && chonKhac === 0, JSON.stringify(khac));
  await w.click('#dlgBox [data-act=dlgDong]').catch(() => {}); await w.waitForTimeout(150);

  // A5 — kiểm trùng với lô khác khi lưu
  const themPhieu = async (so, ngay, kl) => {
    await moLo('fa', 'dx'); await moHd('dx', 'phieu'); await w.click('[data-act=stAdd][data-kind=pc]'); await w.waitForSelector('#stForm');
    await w.fill('#stForm [name=soPhieu]', so); await w.fill('#stForm [name=ngay]', ngay); await w.fill('#stForm [name=kl]', String(kl));
    const b = await w.$('#stForm [name=bienSo]'); if (b && (await b.evaluate(e => e.tagName)) === 'SELECT') { const v = await b.evaluate(e => [...e.options].map(o => o.value).find(x => x && x !== '__new')); if (v) await b.selectOption(v); } else if (b) await b.fill('92C-12345');
    await w.$eval('#stForm', f => f.requestSubmit()); await w.waitForTimeout(300);
    const loiHop = await w.$eval('#stBox', e => e.classList.contains('on') ? ((e.querySelector('.msg.err') || {}).innerText || 'hộp còn mở') : '').catch(() => '');
    if (loiHop) { console.log('HỘP THÊM PHIẾU: ' + loiHop); return 'hộp thêm phiếu báo lỗi'; }
    hoi.length = 0; if (!(await w.$('button[data-act=stSave]'))) return 'không có nút Lưu dữ liệu vào lô: ' + loiHop; await w.click('button[data-act=stSave] >> nth=0'); await w.waitForTimeout(600); return loiHop;
  };
  const l1 = await themPhieu('ZZ9', '09/10/2026', 6);
  ok('A5: phiếu mới ZZ9 cùng số và ngày (khác biển số) với lô R-B → hỏi đối chiếu, nêu ZZ9 ở lô R-B', hoi.some(m => /ZZ9/.test(m) && /R-B/.test(m)), l1 + ' || ' + hoi.join(' || '));
  ok('A5: không hỏi lại PA1 đã lưu từ trước ở cả hai lô', !hoi.some(m => /PA1/.test(m)), hoi.join(' || '));
  const l2 = await themPhieu('ZZ8', '10/10/2026', 7);
  ok('A5: lưu phiếu mới ZZ8 (không có ở lô khác) → không hỏi lại ZZ9 / PA1 đã lưu', !hoi.some(m => /lô khác/.test(m)), l2 + ' || ' + hoi.join(' || '));
  const daLuu = await w.evaluate(() => (window.hak.loadSync().db.rs.own1.forests.fa.pc || []).map(p => p.soPhieu));
  ok('A5: ZZ9 và ZZ8 đã lưu vào lô R-A', daLuu.includes('ZZ9') && daLuu.includes('ZZ8'), JSON.stringify(daLuu));

  // A7 — cửa sổ nhỏ nhất (1024×700): khung danh sách (<aside>, dính ở đỉnh) không được che nút của khung chi tiết khi cuộn (lỗi gốc làm hỏng 4 bộ e2e trên CI Windows; PR #85 đã đổi bố cục khung hẹp thành hai khung cạnh nhau)
  await app.evaluate(({BrowserWindow}) => BrowserWindow.getAllWindows()[0].setContentSize(1024, 700)); await w.waitForTimeout(300);
  await moLo('fa', 'nc'); await moHd('nc', 'thanhvien');
  const che = await w.evaluate(() => { const m = document.querySelector('.hak-master-pane'), d = document.querySelector('.hak-detail-pane'); if (!m || !d) return {thieu: true};
    const nut = [...d.querySelectorAll('button')].pop(); nut.scrollIntoView({block: 'start'}); const b = nut.getBoundingClientRect(), tren = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2);
    return {pos: getComputedStyle(m).position, nut: nut.textContent.trim().slice(0, 30), biChe: !!(tren && tren.closest('.hak-master-pane')), trungNut: tren === nut || nut.contains(tren)}; });
  ok('A7: cửa sổ 1024×700 (nhỏ nhất của ứng dụng): khung danh sách không che nút của khung chi tiết khi cuộn', !che.biChe && che.trungNut, JSON.stringify(che));
  ok('không có lỗi script', !errs.length, errs.join(' | '));
  await app.close();
  console.log(fail ? 'CÓ ' + fail + ' LỖI' : 'TẤT CẢ ĐẠT'); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
