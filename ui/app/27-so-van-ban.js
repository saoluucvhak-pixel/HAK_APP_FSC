/* ========== Sổ văn bản của lô (bản 2.2, mục 2.3 và 12.4; src/sovb.js) ==========
 * Bảng mọi văn bản của lô: đối tượng, mẫu, số đang lưu, số theo quy tắc `STT/NĂM/LOẠI-MÃLÔ`. “Điền số còn trống theo quy tắc” chỉ điền ô TRỐNG (không ghi đè số đã có, lô cũ giữ số cũ),
 * ghi vào bản nháp của lô (lưu bằng “Lưu dữ liệu vào lô”). Số trùng với lô khác báo ở tab Kiểm tra. */
function soVanBanBox(rec) {
  const f = curForest(); if (!f) return '';
  const ds = HAKSoVB.deXuat(f), trong = ds.filter(x => x.deXuat).length, tr = new Set(HAKSoVB.trung(db, curOwner() ? curOwner().id : '', f.id).map(x => x.so.toUpperCase()));
  if (!ds.length) return '';
  return '<details class="card" id="soVanBan" style="margin-bottom:10px"' + (trong ? ' open' : '') + '><summary><b>Sổ văn bản của lô</b> <span class="mut">(' + ds.length + ' ô số; ' + trong + ' ô còn trống; quy tắc STT/NĂM/LOẠI-MÃLÔ)</span></summary>' +
    '<div class="wrap"><table class="normTbl" style="min-width:0;table-layout:auto;margin:6px 0"><thead><tr><th>Đối tượng</th><th>STT</th><th>Văn bản</th><th>Số đang lưu</th><th>Số theo quy tắc</th></tr></thead><tbody>' +
    ds.map(x => '<tr><td>' + esc(x.cap === 'doi' ? 'Đội khai thác' : 'Đội xe') + ' “' + esc(x.ten) + '”</td><td style="text-align:center">' + String(x.stt).padStart(2, '0') + '</td><td>BM-' + x.ma + ' ' + esc(x.mau) + '</td><td' + (x.hienCo && tr.has(x.hienCo.toUpperCase()) ? ' class="err"' : '') + '>' + (x.hienCo ? esc(x.hienCo) + (tr.has(x.hienCo.toUpperCase()) ? ' <span class="pill err">trùng lô khác</span>' : '') : '<span class="mut">(trống)</span>') + '</td><td>' + (x.deXuat ? esc(x.deXuat) : '<span class="mut">giữ số đang lưu</span>') + '</td></tr>').join('') + '</tbody></table></div>' +
    '<p class="mut" style="margin:4px 0">STT đã cấp không bao giờ cấp lại, kể cả khi đội bị xóa (lịch sử lưu theo lô và theo nhóm đội khai thác / đội xe). Lô lập trước bản này chỉ có lịch sử từ STT đang lưu và các số văn bản đã có: đội đã xóa từ trước có thể bị cấp lại số, nên app cảnh báo số trùng.</p>' +
    '<div class="row" style="gap:8px;align-items:center"><button class="btn sm" data-act="svbDien"' + (trong ? '' : ' disabled') + '>Điền ' + trong + ' ô số còn trống theo quy tắc</button><span class="mut">Không ghi đè số đã có; sau khi điền bấm “Lưu dữ liệu vào lô”.</span></div></details>';
}
function svbDien() {
  const f = curForest(); if (!f) return; if (loKhoa(f)) return loKhoaNote(f);
  const n = HAKSoVB.dien(f); if (!n) return note('Không có ô số nào còn trống.', 'warn');
  persistLo(f); note('Đã điền ' + n + ' ô số theo quy tắc vào bản nháp. Kiểm tra rồi bấm “Lưu dữ liệu vào lô”.', 'ok'); render();
}
