/* ========== 3.5.1: Nhật ký truy xuất nguồn gốc của lô (dòng thời gian) — kẹp vào hồ sơ cùng BM-18 ==========
 * Nguồn: src/nhatkytruyxuat.js gom các nhật ký đã lưu trong lô (nạp, đổi số, đổi biển số, in / ký, vòng đời). Chỉ đọc; không đổi BM-18 (Nhật ký khai thác hằng ngày) mà tạo PHỤ LỤC riêng:
 * tải .docx hoặc in. Thêm xe / nhân công / phiếu cân bằng tay, từ Danh mục hoặc từ phiếu cân được ghi vào nhật ký lô khi bấm “Lưu dữ liệu vào lô”. */
function nkTenBm(ma) { try { const b = HAKBieuMau.byMa(String(ma).replace(/^BM-?/i, '')); return b ? 'BM-' + b.ma + ' · ' + b.ten : ma; } catch (e) { return ma; } }
const nkGio = at => { const t = Date.parse(at); return isFinite(t) ? new Date(t).toLocaleString('vi-VN') : '(không rõ thời điểm)'; };
function nkSuKien(f) { return HAKNhatKyTX.build(f, {tenBM: nkTenBm}); }
function nhatKyTruyXuatHtml() {
  const f = curForest(); if (!f) return '';
  const ev = nkSuKien(f);
  return '<details class="card" id="nhatKyTX" data-n="' + ev.length + '"><summary><b>Nhật ký truy xuất nguồn gốc của lô</b> <span class="mut">· ' + ev.length + ' sự kiện (nạp dữ liệu, đổi số phiếu, gán xe, in, ký, chốt lô)</span></summary>' +
    '<div class="row" style="margin-top:8px;gap:8px;flex-wrap:wrap"><button type="button" class="btn sm" data-act="nkDocx" id="nkDocx"' + (ev.length ? '' : ' disabled') + '>⬇ Tải phụ lục (.docx) kẹp BM-18</button>' + (HB ? '<button type="button" class="btn ghost sm" data-act="nkIn" id="nkIn"' + (ev.length ? '' : ' disabled') + '>In nhật ký</button>' : '') + '</div>' +
    (ev.length ? '<ol class="nkDong" id="nkDong">' + ev.map(e => '<li data-loai="' + esc(e.loai) + '"><div class="nkGio">' + esc(nkGio(e.at)) + ' · <b>' + esc(HAKNhatKyTX.LOAI[e.loai] || e.loai) + '</b>' + (e.nguoi ? ' · ' + esc(e.nguoi) : '') + '</div><div>' + esc(e.text) + '</div></li>').join('') + '</ol>'
      : '<p class="mut" style="margin:8px 0 0">Lô chưa có sự kiện nào được ghi. Sự kiện được ghi từ khi lô được lưu bằng bản này.</p>') + '</details>';
}
{ const g0 = panelXuat; panelXuat = function (rec) { return g0(rec) + nhatKyTruyXuatHtml(); }; }
async function nkDocx() {
  const f = curForest(), rec = curRec(); if (!f || !rec) return;
  const ev = nkSuKien(f), i = rec.info || {};
  const blocks = [P('**HAK GROUP**', {al: 'left', sz: 24, after: 0}), P('Phụ lục BM-18 · Nhật ký truy xuất nguồn gốc FSC', {al: 'left', i: true, sz: 20, after: 60, bdb: true}),
    P('**NHẬT KÝ TRUY XUẤT NGUỒN GỐC LÔ RỪNG**', {al: 'center', sz: 30, before: 160, after: 40}),
    P('Chủ rừng: ' + (curOwner().info.ten || '') + ' · Lô: ' + (i.maRung || '') + (i.tenRung ? ' · ' + i.tenRung : '') + (i.diaDiem ? ' · ' + i.diaDiem : ''), {al: 'center', i: true, sz: 22, after: 40}),
    P('Lập lúc ' + new Date().toLocaleString('vi-VN') + ' · ' + ev.length + ' sự kiện', {al: 'center', i: true, sz: 20, after: 120}),
    T([700, 2300, 2400, 9737], [['STT', 'Thời điểm', 'Loại sự kiện', 'Nội dung'], ...ev.map((e, k) => [String(k + 1), nkGio(e.at), (HAKNhatKyTX.LOAI[e.loai] || e.loai) + (e.nguoi ? ' (' + e.nguoi + ')' : ''), e.text])], {head: true, sz: 18}),
    P('Nhật ký được tổng hợp tự động từ dữ liệu đã lưu của lô; không thay thế BM-18 (Nhật ký khai thác hằng ngày).', {al: 'left', i: true, sz: 18, before: 140})];
  download(await makeDocx(blocks, {landscape: true, footer: 'Phụ lục BM-18 · Nhật ký truy xuất · Rừng ' + (i.maRung || '') + ' · HAK Group'}), 'Phu_luc_BM-18_Nhat_ky_truy_xuat_' + slug(i.maRung || 'lo') + '.docx');
}
function nkIn() {
  const f = curForest(), rec = curRec(); if (!f || !rec) return; const ev = nkSuKien(f), i = rec.info || {};
  const h = '<h2 style="text-align:center">NHẬT KÝ TRUY XUẤT NGUỒN GỐC LÔ RỪNG</h2><p style="text-align:center">Chủ rừng: ' + esc(curOwner().info.ten || '') + ' · Lô: ' + esc(i.maRung || '') + '</p><table border="1" cellspacing="0" cellpadding="4" style="width:100%;border-collapse:collapse;font-size:12px"><tr><th>STT</th><th>Thời điểm</th><th>Loại</th><th>Nội dung</th></tr>' +
    ev.map((e, k) => '<tr><td>' + (k + 1) + '</td><td>' + esc(nkGio(e.at)) + '</td><td>' + esc(HAKNhatKyTX.LOAI[e.loai] || e.loai) + '</td><td>' + esc(e.text) + '</td></tr>').join('') + '</table>';
  return inHtml(h, 'Nhat_ky_truy_xuat_' + slug(i.maRung || ''));
}
document.addEventListener('click', e => { const b = e.target && e.target.closest && e.target.closest('[data-act=nkDocx],[data-act=nkIn]'); if (!b) return; e.preventDefault(); if (b.dataset.act === 'nkDocx') nkDocx(); else nkIn(); });
