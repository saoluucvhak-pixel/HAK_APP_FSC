/* ========== 3.7.0: Trung tâm Tiền kiểm soát 2 chặn ngay tại trang Xuất hồ sơ ==========
 * Bảng checklist lấy từ cùng bộ kiểm tra xuất hồ sơ (exportCheck): mục CHẶN XUẤT và mục CẦN ĐỐI CHIẾU của lô đang mở, mỗi dòng có nút “Đi đến sửa” mở đúng nơi sửa;
 * nút “Xuất trọn bộ hồ sơ FSC” dùng đúng gói “Toàn bộ hồ sơ (.zip)” có sẵn; nút “In bìa & mục lục hồ sơ (A4)” in trang bìa và bảng danh mục biểu mẫu;
 * tích hợp nút Niêm phong / Mở khóa hồ sơ lô rừng trực tiếp tại trung tâm tiền kiểm. */
function tienKiemXuatHtml(rec) {
  let kt; try { kt = exportCheck(rec); } catch (e) { return ''; }
  const f = curForest();
  const g = gate(rec), chan = kt.chan || [], doi = kt.doi || [], ok = chan.length === 0, choXuat = g.ok('all');
  const daChot = f && !!f.chot, daDung = f && !!f.dung;
  const hang = (k, m) => '<li class="' + k + '"><div><span aria-hidden="true">' + (k === 'chan' ? '⛔' : '⚠️') + '</span> <span class="pill ' + (k === 'chan' ? 'err' : 'warn') + '">' + (k === 'chan' ? 'Chặn xuất' : 'Cần đối chiếu') + '</span> ' + esc(m.text) + (m.nhom ? ' <small class="mut">· ' + esc(m.nhom) + '</small>' : '') + '</div>' +
    '<button type="button" class="btn sm' + (k === 'chan' ? '' : ' ghost') + '" data-act="ktGo" data-go="' + esc(JSON.stringify(m.go || m.noiSua || {})) + '">🛠️ Đi đến sửa</button></li>';
  const muc = chan.map(m => ['chan', m]).concat(doi.map(m => ['doi', m])), hien = muc.slice(0, 40);
  const pillStatus = daChot ? '<span class="pill ok" style="font-size:13px">🔒 ĐÃ NIÊM PHONG HỒ SƠ</span>'
    : daDung ? '<span class="pill warn" style="font-size:13px">⏹️ LÔ ĐÃ DỪNG</span>'
    : (ok ? '<span class="pill ok">✅ Không có mục chặn xuất</span>' : '<span class="pill err">⛔ ' + chan.length + ' mục chặn xuất</span>') + (doi.length ? ' · ' + doi.length + ' cần đối chiếu' : '');

  const nutNiemPhong = daDung ? '' : daChot
    ? '<button type="button" class="btn ghost sm" data-act="chotMoKhoa" title="Nhập lý do ở khung Vòng đời lô phía trên">🔓 Mở khóa niêm phong</button>'
    : '<button type="button" class="btn ghost sm" data-act="chotLo"' + (ok ? '' : ' disabled title="Còn mục chặn xuất: xử lý trước khi niêm phong"') + '>🔒 Niêm phong chốt lô</button>';

  return '<div class="card" id="tienKiem" data-chan="' + chan.length + '" data-doi="' + doi.length + '"><div class="row" style="justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap"><h3 style="margin:0">Tiền kiểm soát trước khi xuất</h3>' +
    pillStatus + '</div>' +
    (hien.length ? '<ul class="bldHang" id="tienKiemDs">' + hien.map(([k, m]) => hang(k, m)).join('') + '</ul>' + (muc.length > hien.length ? '<p class="mut">… và ' + (muc.length - hien.length) + ' mục khác (xem tab Kiểm tra).</p>' : '') : '<div class="msg ok" style="margin-top:8px">Hồ sơ đã qua kiểm tra: có thể xuất trọn bộ.</div>') +
    '<div class="row" style="margin-top:10px;gap:8px;flex-wrap:wrap;align-items:center">' +
      '<button type="button" class="btn" data-act="dl" data-kind="all" id="xuatTronBo"' + (choXuat ? '' : ' disabled title="Còn mục chặn xuất: bấm “Đi đến sửa” ở các dòng trên"') + '>📦 Xuất trọn bộ hồ sơ FSC (.zip)</button>' +
      '<button type="button" class="btn ghost" data-act="inTronBoPdf" id="inTronBoPdfBtn"' + (choXuat ? '' : ' disabled title="Còn mục chặn xuất: bấm “Đi đến sửa” ở các dòng trên"') + '>🖨️ In bìa & mục lục hồ sơ (A4)</button>' +
      nutNiemPhong +
      '<span class="mut" style="width:100%">Gói .zip chứa các biểu mẫu Word; bìa & mục lục in khổ A4 để đóng tập hồ sơ.</span>' +
    '</div></div>';
}
{ const g0 = panelXuat; panelXuat = function (rec) { return g0(rec) + tienKiemXuatHtml(rec); }; }   // cuối trang: không đẩy nút tải biểu mẫu xuống dưới màn đầu
