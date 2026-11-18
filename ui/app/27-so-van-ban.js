/* ========== Sổ văn bản của lô (bản 2.2, mục 2.3 và 12.4; src/sovb.js) ==========
 * Bảng mọi văn bản của lô: đối tượng, mẫu, số đang lưu, số theo quy tắc `STT/NĂM/LOẠI-MÃLÔ`. “Điền số còn trống theo quy tắc” chỉ điền ô TRỐNG (không ghi đè số đã có, lô cũ giữ số cũ),
 * ghi vào bản nháp của lô (lưu bằng “Lưu dữ liệu vào lô”). Số trùng với lô khác báo ở tab Kiểm tra. */
function soVanBanBox(rec) {
  const f = curForest(); if (!f) return '';
  const ds = HAKSoVB.deXuat(f), trong = ds.filter(x => x.deXuat).length, tr = new Set(HAKSoVB.trung(db, curOwner() ? curOwner().id : '', f.id).map(x => x.so.toUpperCase()));
  if (!ds.length) return '';
  return '<details class="card" id="soVanBan" style="margin-bottom:10px"' + (trong ? ' open' : '') + '><summary><b>Sổ văn bản của lô</b> <span class="mut">(' + ds.length + ' ô số; ' + trong + ' ô còn trống; quy tắc STT/NĂM/LOẠI-MÃLÔ)</span></summary>' +
    '<div class="wrap"><table class="normTbl" style="min-width:0;table-layout:auto;margin:6px 0"><thead><tr><th>Đối tượng</th><th>STT</th><th>Văn bản</th><th>Số đang lưu</th><th>Số theo quy tắc</th></tr></thead><tbody>' +
    ds.map(x => '<tr><td>' + esc(x.cap === 'doi' ? 'Đội khai thác' : 'Đội xe') + ' “' + esc(x.ten) + '”</td><td style="text-align:center">' + String(x.stt).padStart(2, '0') + '</td><td>BM-' + x.ma + ' ' + esc(x.mau) + '</td><td' + (x.hienCo && tr.has(x.hienCo.toUpperCase()) ? ' class="err"' : '') +
    '>' + (x.hienCo ? esc(x.hienCo) + (tr.has(x.hienCo.toUpperCase()) ? ' <span class="pill err">trùng lô khác</span>' : '') : '<span class="mut">(trống)</span>') + '</td><td>' + (x.deXuat ? esc(x.deXuat) : '<span class="mut">giữ số đang lưu</span>') + '</td></tr>').join('') + '</tbody></table></div>' +
    soDoiXeBox(f) +
    '<p class="mut" style="margin:4px 0">STT đã cấp không bao giờ cấp lại, kể cả khi đội bị xóa (lịch sử lưu theo lô và theo nhóm đội khai thác / đội xe). Lô lập trước bản này chỉ có lịch sử từ STT đang lưu và các số văn bản đã có: đội đã xóa từ trước có thể bị cấp lại số, nên app cảnh báo số trùng.</p>' +
    '<div class="row" style="gap:8px;align-items:center"><button class="btn sm" data-act="svbDien"' + (trong ? '' : ' disabled') + '>Điền ' + trong + ' ô số còn trống theo quy tắc</button><span class="mut">Không ghi đè số đã có; sau khi điền bấm “Lưu dữ liệu vào lô”.</span></div></details>';
}
/* Số văn bản theo ĐỘI XE: số đang in của từng đội xe và nguồn (số riêng lưu theo đội xe / số chung của lô). Đội đang dùng số chung: “Xác nhận số trên giấy” lưu số đầy đủ đó thành số riêng của đội
 * (hồ sơ cũ đã in); đội chưa in thì dùng “Điền … ô số còn trống theo quy tắc” để cấp số mới. Chỉ ghi vào bản nháp khi người dùng bấm; xem trước và tải file không cấp số. */
function soDoiXeBox(f) {
  if (!(f.hdvc || []).length) return '';
  const ds = HAKSoVB.soDoiXe(f), tr = HAKSoVB.trungDoiXe(f), trung = x => tr.some(g => g.truong === x.truong && g.doi.some(d => d.id === x.id)), ids = [...new Set(ds.map(x => x.id))];
  if (ids.length < 2 && !tr.length) return '';
  const NG = {rieng: 'số riêng của đội xe', chung: 'số chung của lô', trong: 'chưa có số'};
  return '<div id="soDoiXe" style="margin:8px 0"><b>Số văn bản theo đội xe</b> <span class="mut">(số in ra lấy từ số riêng lưu theo đội xe; để trống thì lấy số chung của lô; không đổi theo thứ tự đội)</span>' +
    (tr.length ? '<div class="msg ' + (tr.some(g => g.loai === 'rieng') ? 'err' : 'warn') + '" id="soDoiXeTrung">' + tr.map(g => 'Các đội xe ' + g.doi.map(d => '“' + esc(d.ten) + '”').join(', ') + ' cùng in số <b>' + esc(g.so) + '</b> (' + esc(g.mau) + ')' + (g.loai === 'rieng' ?
    ': số riêng bị trùng, sửa ở tab Vận chuyển trước khi xuất.' : ': xác nhận số trên giấy cho đội đã in, hoặc cấp số riêng cho đội chưa có số.')).join('<br>') + '</div>' : '') +
    '<div class="wrap"><table class="normTbl" style="min-width:0;table-layout:auto;margin:6px 0"><thead><tr><th>Đội xe</th><th>Văn bản</th><th>Số đang in</th><th>Nguồn</th><th></th></tr></thead><tbody>' +
    ds.map(x => '<tr data-sdx="' + esc(x.id) + '" data-truong="' + x.truong + '" data-nguon="' + x.nguon + '"><td>“' + esc(x.ten) + '”</td><td>BM-' + x.ma + ' ' + esc(x.mau) + '</td><td' + (trung(x) ? ' class="err"' : '') + '><b>' + (x.in ? esc(x.in) : '<span class="mut">(trống)</span>') + '</b>' +
    (trung(x) ? ' <span class="pill err">trùng đội xe khác</span>' : '') + '</td><td>' + NG[x.nguon] + '</td><td>' +
      (x.nguon === 'chung' && x.truong === 'soVC' ? '<button class="btn sm ghost" data-act="svbGiuSo" data-hd="' + esc(x.id) + '" title="Lưu số đang in (hợp đồng vận chuyển và biên bản xác nhận khối lượng) thành số riêng của đội xe này">Xác nhận số trên giấy</button>' : '') +
      '</td></tr>').join('') + '</tbody></table></div></div>';
}
function svbGiuSo(hdId) {
  const f = curForest(); if (!f) return; if (loKhoa(f)) return loKhoaNote(f);
  const n = HAKSoVB.giuSoDangIn(f, hdId); if (!n) return note('Đội xe này đã có số riêng.', 'warn');
  persistLo(f); note('Đã lưu ' + n + ' số đang in thành số riêng của đội xe vào bản nháp. Bấm “Lưu dữ liệu vào lô”.', 'ok'); render();
}
function svbDien() {
  const f = curForest(); if (!f) return; if (loKhoa(f)) return loKhoaNote(f);
  const n = HAKSoVB.dien(f); if (!n) return note('Không có ô số nào còn trống.', 'warn');
  persistLo(f); note('Đã điền ' + n + ' ô số theo quy tắc vào bản nháp. Kiểm tra rồi bấm “Lưu dữ liệu vào lô”.', 'ok'); render();
}
/* Đo hiệu năng (scripts/perf-dulieu.js): thời gian vẽ một màn của một lô và kích thước phần “ngoài hồ sơ” (side) gửi kèm mỗi lần lưu theo phần thay đổi. Chỉ đọc. */
CONG_KT.perf = {
  luuMotDongDanhMuc: async () => { db.dmLaoDong[5] = Object.assign({}, db.dmLaoDong[5], {diaChi: 'ĐỊA CHỈ ĐO ' + Date.now()}); doiDuLieu(); const a = performance.now(); const r = await storeSave();
  return {ok: !!(r && r.ok), ms: Math.round(performance.now() - a), cach: window.__saveStats.last, sideBytes: window.__saveStats.sideBytes}; },
  ve: (oid, fid, t, x) => { NAV.cur = oid; NAV.curF = fid; NAV.view = 'owner'; NAV.tab = 'rung'; NAV.ftab = t; if (x) NAV.xtab = x; const a = performance.now(); render(); return Math.round(performance.now() - a); },
  dungLuong: () => { const W = dbGhi(), s = JSON.stringify(HAKDelta.side(W)); let lo = 0, lonNhat = 0; Object.values(W.rs || {}).forEach(o => Object.values(o.forests || {}).forEach(f => { const n = JSON.stringify(f).length; lo += n; if (n > lonNhat) lonNhat = n; }));
  return {side: s.length, tongLo: lo, loLonNhat: lonNhat}; }
};
