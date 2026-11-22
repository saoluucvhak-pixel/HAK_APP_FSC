'use strict';
/* Kiểm thử đầu-cuối màn Chủ rừng: Mở / Đối chiếu với Google Sheets (QĐ6, chỉ đọc, không chặn lưu) và thao tác Đổi số phiếu riêng
 * (bắt lý do, chặn trùng số + ngày, cảnh báo lô khác cần xác nhận, chặn lô đã chốt, khóa ô Số phiếu dòng đã lưu, nhật ký soLog ngoài nhatKy sau khi lưu).
 * Dữ liệu giả lập: bộ Excel tests/fixtures/make-lookup (CCCD 0490000000xx, không dữ liệu thật).
 * Chạy: xvfb-run -a node scripts/e2e-chu-rung-doi-chieu.js */
const {_electron: electron} = require('playwright-core');
const {build} = require('../tests/fixtures/make-lookup');
const path = require('path'), fs = require('fs'), os = require('os');
const root = path.join(__dirname, '..');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hakqn-chu-dc-')), dbFile = path.join(dir, 'd.sqlite');
let fail = 0; const ok = (n, c, x) => { console.log((c ? 'ĐẠT  ' : 'LỖI  ') + n + (!c && x ? ' — ' + x : '')); if (!c) fail++; };

const pc = (so, ngay, bien, kl) => ({soPhieu: so, ngay, bienSo: bien, kl, klKg: Math.round(kl * 1000), noiGiao: 'KCN giả lập'});
const lot = (id, ma, o) => ({id, info: Object.assign({maRung: ma, tenRung: 'Lô ' + ma, diaDiem: 'Thôn giả lập', dienTich: 2.5, lat: 15.6, lng: 108.1, tuNgay: '01/01/2026', denNgay: '30/06/2026'}, o.info || {}), nc: [], dx: [], pc: o.pc || [], chot: o.chot});
const seed = {v: 2, rs: {own1: {id: 'own1', info: {ma: 'CR-01', ten: 'Nguyễn Văn An giả lập', cccd: '049000000001', ngayCap: '15/08/2021', noiCap: 'CA giả lập', diaChi: 'Đà Nẵng', danhXung: 'Ông', soHopDong: '101', ngayKyHopDong: '01/01/2026'}, nc: [], dx: [], exp: {},
  forests: {
    fa: lot('fa', 'R-A', {info: {nguon: {hd: '101', maRung: 'R-A', at: '2026-02-01T00:00:00.000Z'}}, pc: [pc('1001/2026/NK', '22/01/2026', '92C-12345', 2.84), pc('1002/2026/NK', '23/01/2026', '92C-12345', 4.44)]}),
    fb: lot('fb', 'R-B', {pc: [pc('7777/2026/NK', '05/02/2026', '92C-77777', 3)]}),
    fc: lot('fc', 'R-C', {pc: [pc('8888/2026/NK', '06/02/2026', '92C-88888', 2)], chot: {phienBan: 1, at: '2026-03-01T00:00:00.000Z', lyDo: 'giả lập'}})}}}};

(async () => {
  const app = await electron.launch({executablePath: require('electron'), args: [root, '--no-sandbox'], env: {...process.env, HAKQN_CLOSE: 'discard', HAKQN_DB: dbFile, HAKQN_USERDATA: path.join(dir, 'ud'), HAKQN_SHEET_URL: 'http://127.0.0.1:9/none.xlsx'}});
  const w = require('./_hd30').boc(await app.firstWindow()); const errs = []; w.on('pageerror', e => errs.push(e.message)); w.on('dialog', d => d.accept());
  await app.evaluate(({BrowserWindow}) => { BrowserWindow.getAllWindows()[0].setContentSize(1024, 768); }); await w.waitForSelector('#side');
  await w.evaluate(x => window.hak.save(x), seed); await w.reload(); await w.waitForSelector('#side');
  const db = () => w.evaluate(() => window.hak.loadSync().db);
  const xlsx = path.join(dir, 'gia_lap.xlsx'); fs.writeFileSync(xlsx, build());
  const modalOff = async () => !(await w.$('#hdBox.on')) && !(await w.$('#lkBox.on'));

  /* ===== Màn chủ rừng: chưa có bản Sheet ===== */
  await w.click('[data-open=own1]'); await w.waitForSelector('#dcChu');
  ok('khung "Dữ liệu Google Sheets" có hai nút Mở và Đối chiếu', !!(await w.$('#dcChu [data-act=dsMo]')) && !!(await w.$('#dcChu [data-act=dsDoiChieu]')) && /Mở dữ liệu Google Sheets/.test(await w.innerText('#dcChu')) && /Đối chiếu với Google Sheets/.test(await w.innerText('#dcChu')));
  await w.click('#dcChu [data-act=dsDoiChieu]'); await w.waitForSelector('#dcLoi');
  ok('chưa tải Sheet: Đối chiếu báo lỗi, không ghi', /Chưa có bản tra cứu/.test(await w.innerText('#dcLoi')));
  await w.click('#dcChu [data-act=dsMo]'); await w.waitForTimeout(600);
  ok('chưa tải Sheet: nút Mở không mở khung/modal trống', await modalOff());
  ok('nhập Excel giả lập', (await w.evaluate(p => window.hak.lookup.importExcel(p), xlsx)).ok);

  /* ===== Đối chiếu (QĐ6): chỉ đọc ===== */
  const d0 = JSON.stringify(await db());
  await w.click('#dcChu [data-act=dsDoiChieu]'); await w.waitForSelector('#dcTong');
  const t1 = await w.innerText('#dcChu .dcKetQua'), n1 = (await w.$$('#dcChu .dcLech')).length;
  ok('Đối chiếu: cảnh báo vàng "N chênh lệch" (ngày ký 01/01 ≠ 10/01 của Sheet)', /\d+ chênh lệch/.test(t1) && !!(await w.$('#dcTong.warn')) && n1 >= 1 && /Ngày ký hợp đồng/.test(t1), t1.replace(/\s+/g, ' ').slice(0, 300));
  ok('Đối chiếu so họ tên (không phân biệt dấu/hoa thường), CCCD, ngày ký; số rừng + tổng tấn vì lô đã lưu mã hợp đồng', /Họ tên/.test(t1) && /CCCD/.test(t1) && /Ngày ký hợp đồng/.test(t1) && /Số rừng/.test(t1) && /Tổng tấn phiếu cân/.test(t1), t1.replace(/\s+/g, ' ').slice(0, 400));
  ok('Đối chiếu KHÔNG ghi gì vào hồ sơ', JSON.stringify(await db()) === d0);
  await w.fill('#infoForm [name=ten]', 'NGUYỄN VĂN AN'); await w.fill('#infoForm [name=ngayKyHopDong]', '10/01/2026');
  await w.click('#dcChu [data-act=dsDoiChieu]'); await w.waitForTimeout(700);
  const n2 = (await w.$$('#dcChu .dcLech')).length;
  ok('sửa tên (khác chữ hoa/dấu) và ngày ký đúng thì bớt chênh lệch', n2 < n1, n1 + ' → ' + n2);
  ok('chênh lệch KHÔNG chặn lưu: nút Lưu thông tin chủ rừng vẫn bấm được', await w.$eval('#infoForm [type=submit]', b => !b.disabled).catch(() => true));
  await w.fill('#infoForm [name=cccd]', '123'); await w.waitForTimeout(150);
  ok('CCCD sai: hai nút khóa (aria-disabled) kèm lý do', await w.$eval('#dcChu [data-act=dsMo]', b => b.disabled && b.getAttribute('aria-disabled') === 'true') && await w.$eval('#dcChu [data-act=dsDoiChieu]', b => b.disabled) && /CCCD/.test(await w.innerText('#dcChu .dcLyDo')));
  await w.fill('#infoForm [name=cccd]', '049000000001');
  ok('CCCD hợp lệ trở lại: nút mở khóa', await w.$eval('#dcChu [data-act=dsMo]', b => !b.disabled));
  await w.fill('#infoForm [name=soHopDong]', 'HD-KHONG-CO');
  await w.click('#dcChu [data-act=dsMo]'); await w.waitForTimeout(700);
  ok('hợp đồng không có trên Sheet: Mở không mở khung/modal trống, có báo lỗi', await modalOff() && /HD-KHONG-CO|Không có dòng nào/.test(await w.innerText('#toast, .toast, #notes, body')));
  await w.click('#dcChu [data-act=dsDoiChieu]'); await w.waitForSelector('#dcLoi');
  ok('hợp đồng không có: Đối chiếu báo lỗi rõ', /HD-KHONG-CO/.test(await w.innerText('#dcLoi')));
  await w.fill('#infoForm [name=soHopDong]', '101');
  await w.click('#dcChu [data-act=dsMo]'); await w.waitForSelector('#hdBox.on', {timeout: 8000});
  ok('hợp đồng có: Mở mở màn Dữ liệu Google Sheets và modal ĐÚNG hợp đồng (tiêu đề nêu 101 và chủ rừng)', /^101\b/.test(await w.innerText('#hdTitle')) && /NGUYỄN VĂN AN/.test(await w.innerText('#hdTitle')) && !!(await w.$('#lkBox.on')), await w.innerText('#hdTitle'));
  ok('tiêu điểm nằm trong modal', await w.evaluate(() => document.getElementById('hdBox').contains(document.activeElement)));
  await w.keyboard.press('Escape'); await w.waitForTimeout(200);
  ok('Esc đóng modal hợp đồng', !(await w.$('#hdBox.on')));
  await w.keyboard.press('Escape'); await w.waitForTimeout(150);
  ok('modal đóng xong, màn chủ rừng còn nguyên (không ghi gì)', !!(await w.$('#dcChu')) && JSON.stringify(await db()) === d0);

  /* ===== Hồ sơ rừng đã lưu: Đối chiếu ===== */
  await w.click('[data-tab=rung]'); await w.click('[data-forest=fa]'); await w.waitForSelector('#dcRung');
  await w.click('#dcRung [data-act=dsDoiChieu]'); await w.waitForSelector('#dcRung #dcTong');
  const tr = await w.innerText('#dcRung .dcKetQua');
  ok('hồ sơ rừng đã lưu: có Đối chiếu số rừng, tổng tấn, số phiếu của hợp đồng', /Số rừng của hợp đồng/.test(tr) && /Tổng tấn phiếu cân/.test(tr) && /Số phiếu cân/.test(tr), tr.replace(/\s+/g, ' ').slice(0, 300));
  ok('hồ sơ rừng: nút "Mở hợp đồng … để xem và cập nhật" mở modal', await (async () => { await w.click('#dcRung [data-act=dsMoHd]'); try { await w.waitForSelector('#hdBox.on', {timeout: 8000}); await w.keyboard.press('Escape'); await w.waitForTimeout(200); return true; } catch (e) { return false; } })());
  ok('Đối chiếu ở hồ sơ rừng không ghi gì', JSON.stringify(await db()) === d0);

  /* ===== Đổi số phiếu riêng ===== */
  const toPc = async fid => { await w.click('[data-tab=rung]'); await w.click('[data-forest=' + fid + ']'); await w.click('[data-ftab=dx]'); await w.waitForTimeout(400);
    const hd = await w.$('#dsHdVcTbl tbody tr[data-act=chonHd]'); if (hd) { const id = await hd.getAttribute('data-hd'); await w.evaluate(id => window.__hak.hdMo('dx', id), id); await w.waitForTimeout(300); }
    await w.click('.mucNav [data-muc-lo]:has-text("Phiếu cân")'); await w.waitForTimeout(400); };
  await toPc('fa');
  const nut = '#stTbl_pc [data-act=pcDoiSo]'; await w.waitForSelector(nut);
  ok('nút Đổi số có ở từng dòng phiếu đã lưu (2 phiếu)', (await w.$$(nut)).length === 2);
  await w.click(nut + ' >> nth=0'); await w.waitForSelector('#dsForm');
  ok('hộp Đổi số: số hiện tại và ngày/khối lượng chỉ đọc; ô số mới + lý do bắt buộc', await w.$eval('#dsForm input[readonly]', () => true) && !!(await w.$('#dsSoMoi')) && !!(await w.$('#dsLyDo')));
  await w.fill('#dsSoMoi', '1001/2026/NK-B'); await w.fill('#dsLyDo', 'ab'); await w.click('#dsOk'); await w.waitForTimeout(200);
  ok('thiếu lý do (dưới 3 ký tự): chặn', /ít nhất 3/.test(await w.innerText('#dsLoi')));
  await w.fill('#dsSoMoi', '1002/2026/NK'); await w.fill('#dsLyDo', 'Trạm cân in lại'); await w.click('#dsOk'); await w.waitForTimeout(200);
  if (await w.$('#dsForm')) { const loi = await w.innerText('#dsLoi').catch(() => ''); ok('trùng số phiếu với phiếu khác trong lô: chặn hoặc cảnh báo', /đã có trong lô/.test(loi) || !!(await w.$('#dsCanhBao')), loi); await w.fill('#dsSoMoi', '1001/2026/NK-B'); }
  else { ok('(đổi số 1002 đã đi qua)', false, 'hộp đóng ngoài dự kiến'); }
  await w.fill('#dsLyDo', 'Trạm cân in lại'); await w.click('#dsOk'); await w.waitForTimeout(400);
  ok('đổi số thành công, hộp đóng', !(await w.$('#stBox.on')));
  const tb = await w.innerText('#stTbl_pc');
  ok('bảng hiện số mới và chú thích "trước đây: số cũ"', /1001\/2026\/NK-B/.test(tb) && /trước đây: 1001\/2026\/NK/.test(tb), tb.replace(/\s+/g, ' ').slice(0, 300));
  ok('chưa bấm Lưu: dữ liệu đã lưu chưa đổi (đổi số ở bản nháp)', (await db()).rs.own1.forests.fa.pc[0].soPhieu === '1001/2026/NK');
  // cảnh báo số có ở lô khác
  await w.click(nut + ' >> nth=1'); await w.waitForSelector('#dsForm');
  await w.fill('#dsSoMoi', '7777/2026/NK'); await w.fill('#dsLyDo', 'Nhập nhầm số'); await w.click('#dsOk'); await w.waitForTimeout(300);
  ok('số phiếu cũng có ở lô khác: hiện cảnh báo cần xác nhận (chưa đổi)', !!(await w.$('#dsCanhBao')) && /R-B/.test(await w.innerText('#dsCanhBao')) && !!(await w.$('#dsXn')), await w.innerText('#dsForm').catch(() => ''));
  await w.click('#dsOk'); await w.waitForTimeout(300);
  ok('chưa tích xác nhận mà bấm Đổi số: vẫn chặn', !!(await w.$('#dsForm')) && !!(await w.$('#dsCanhBao')));
  await w.check('#dsXn'); await w.click('#dsOk'); await w.waitForTimeout(400);
  ok('tích xác nhận rồi đổi số: thành công', !(await w.$('#stBox.on')) && /7777\/2026\/NK/.test(await w.innerText('#stTbl_pc')));
  // khóa ô Số phiếu ở dòng đã lưu
  await w.click('#stTbl_pc [data-act=stEdit] >> nth=0'); await w.waitForSelector('#stForm');
  ok('ô Số phiếu của dòng đã lưu chỉ đọc (phải dùng Đổi số có lý do)', await w.$eval('#stForm [name=soPhieu]', i => i.readOnly));
  ok('biểu mẫu Sửa phiếu có nút Đổi số có lý do', !!(await w.$('#stForm [data-act=pcDoiSoForm]')));
  await w.fill('#stForm [name=ghiChu]', 'x'); await w.click('#stForm button[type=submit]'); await w.waitForTimeout(300);
  await w.evaluate(() => window.__stSaveCurrent()); await w.waitForTimeout(700);
  const F = (await db()).rs.own1.forests.fa;
  ok('đã lưu: soCu giữ qua sửa ô khác', !!(F.pc[0].soCu && F.pc[0].soCu.length === 1 && F.pc[0].soCu[0].so === '1001/2026/NK'), JSON.stringify(F.pc[0].soCu));
  ok('đã lưu: f.soLog có 2 mục (đổi 1001 → 1001-B và 1002 → 7777), khối lượng giữ nguyên, nằm NGOÀI nhatKy', Array.isArray(F.soLog) && F.soLog.length === 2 && F.soLog[0].soCu === '1001/2026/NK' && F.soLog[0].soMoi === '1001/2026/NK-B' && F.soLog[0].kl === 2.84 && !JSON.stringify(F.nhatKy || []).includes('soCu'), JSON.stringify(F.soLog));
  ok('đổi số không đổi tổng khối lượng của lô (7,28 tấn)', Math.abs(F.pc.reduce((t, p) => t + p.kl, 0) - 7.28) < 1e-9);
  // lô đã chốt
  await toPc('fc');
  const lockBtn = await w.$(nut);
  if (lockBtn) { await lockBtn.click().catch(() => {}); await w.waitForTimeout(300); }
  ok('lô đã chốt: không mở được hộp Đổi số (chỉ đọc)', !(await w.$('#dsForm')));
  ok('lô đã chốt: dữ liệu giữ nguyên', (await db()).rs.own1.forests.fc.pc[0].soPhieu === '8888/2026/NK');
  ok('không có lỗi JavaScript', errs.length === 0, errs.join(' | '));
  await app.close();
  console.log(fail ? 'CÓ ' + fail + ' LỖI' : 'TẤT CẢ ĐẠT'); process.exit(fail ? 1 : 0);
})().catch(e => { console.error('NGOẠI LỆ', e); process.exit(2); });
