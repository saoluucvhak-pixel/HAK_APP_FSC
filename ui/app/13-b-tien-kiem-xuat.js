/* ========== 3.5.1: Trung tâm Tiền kiểm soát 2 chặn ngay tại trang Xuất hồ sơ ==========
 * Bảng checklist lấy từ cùng bộ kiểm tra xuất hồ sơ (exportCheck): mục CHẶN XUẤT và mục CẦN ĐỐI CHIẾU của lô đang mở, mỗi dòng có nút “Đi đến sửa” mở đúng nơi sửa;
 * nút “Xuất trọn bộ hồ sơ FSC” dùng đúng gói “Toàn bộ hồ sơ (.zip)” có sẵn (cùng điều kiện cho phép xuất), nên không đổi biểu mẫu hay số liệu. */
function tienKiemXuatHtml(rec) {
  let kt; try { kt = exportCheck(rec); } catch (e) { return ''; }
  const g = gate(rec), chan = kt.chan || [], doi = kt.doi || [], ok = chan.length === 0, choXuat = g.ok('all');
  const hang = (k, m) => '<li class="' + k + '"><div><span aria-hidden="true">' + (k === 'chan' ? '⛔' : '⚠️') + '</span> <span class="pill ' + (k === 'chan' ? 'err' : 'warn') + '">' + (k === 'chan' ? 'Chặn xuất' : 'Cần đối chiếu') + '</span> ' + esc(m.text) + (m.nhom ? ' <small class="mut">· ' + esc(m.nhom) + '</small>' : '') + '</div>' +
    '<button type="button" class="btn sm' + (k === 'chan' ? '' : ' ghost') + '" data-act="ktGo" data-go="' + esc(JSON.stringify(m.go || m.noiSua || {})) + '">🛠️ Đi đến sửa</button></li>';
  const muc = chan.map(m => ['chan', m]).concat(doi.map(m => ['doi', m])), hien = muc.slice(0, 40);
  return '<div class="card" id="tienKiem" data-chan="' + chan.length + '" data-doi="' + doi.length + '"><div class="row" style="justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap"><h3 style="margin:0">Tiền kiểm soát trước khi xuất</h3>' +
    '<span class="pill ' + (ok ? 'ok' : 'err') + '">' + (ok ? '✅ Không có mục chặn xuất' : '⛔ ' + chan.length + ' mục chặn xuất') + (doi.length ? ' · ' + doi.length + ' cần đối chiếu' : '') + '</span></div>' +
    (hien.length ? '<ul class="bldHang" id="tienKiemDs">' + hien.map(([k, m]) => hang(k, m)).join('') + '</ul>' + (muc.length > hien.length ? '<p class="mut">… và ' + (muc.length - hien.length) + ' mục khác (xem tab Kiểm tra).</p>' : '') : '<div class="msg ok" style="margin-top:8px">Hồ sơ đã qua kiểm tra: có thể xuất trọn bộ.</div>') +
    '<div class="row" style="margin-top:10px;gap:8px;flex-wrap:wrap;align-items:center"><button type="button" class="btn" data-act="dl" data-kind="all" id="xuatTronBo"' + (choXuat ? '' : ' disabled title="Còn mục chặn xuất: bấm “Đi đến sửa” ở các dòng trên"') + '>📦 Xuất trọn bộ hồ sơ FSC (BM-01 → BM-20)</button>' +
    '<span class="mut">Gói .zip gồm mọi biểu mẫu đủ điều kiện; mục chưa đủ dữ liệu được nêu ngay sau khi tải.</span></div></div>';
}
{ const g0 = panelXuat; panelXuat = function (rec) { return g0(rec) + tienKiemXuatHtml(rec); }; }   // cuối trang: không đẩy nút tải biểu mẫu xuống dưới màn đầu
