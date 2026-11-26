let normSel = 'b';   // bản định mức đang xem/sửa ('b' = bản gốc, 'i0', 'i1'… = các bản hiệu lực từ ngày muộn hơn)
let normBhldSua = null; // vị trí đang mở modal sửa BHLĐ
let normBhldThemMo = false; // mở modal thêm vị trí mới & BHLĐ
const normUsed = name => Object.values(db.rs || {}).some(o => Object.values(o.forests || {}).some(f => (f.nc || []).some(r => r.chucDanh === name)));
function panelNorm() {
  const vs = HAKDinhMuc.versions(db); if (!vs.some(v => v.id === normSel)) normSel = vs[vs.length - 1].id;
  const cur = HAKDinhMuc.byId(db, normSel), pos = chucDanhAll();
  const label = v => (v.tuNgay ? 'Hiệu lực từ ' + v.tuNgay : 'Bản gốc (chưa đặt ngày hiệu lực)');

  const rows = pos.map((cd, k) => {
    const n = cur.dm[cd] || {};
    return '<tr data-pos="' + esc(cd) + '">' +
      '<td><b>' + esc(cd) + '</b></td>' +
      BHLD_ITEMS.map(([key]) => '<td style="text-align:center">' + (n[key] ? '<span class="pill ok" style="font-weight:600;white-space:nowrap">' + esc(n[key]) + '</span>' : '<span class="mut">—</span>') + '</td>').join('') +
      '<td style="white-space:nowrap;text-align:right"><button class="btn ghost sm" type="button" data-act="bhldSua" data-bhldsua="' + esc(cd) + '" id="bhldSua_' + k + '">Sửa</button></td>' +
      '</tr>';
  }).join('');

  // Modal Sửa BHLĐ cho vị trí
  const cdSua = normBhldSua;
  const nSua = cdSua ? (cur.dm[cdSua] || {}) : {};
  const modalSua = !cdSua ? '' :
    '<div class="dmModalBack" id="dmModal"><div class="dmModal" role="dialog" aria-modal="true" aria-label="Định mức BHLĐ: ' + esc(cdSua) + '" style="max-width:540px">' +
    '<form id="bhldForm" style="margin:0">' +
    '<h3 style="margin:0 0 6px">Định mức BHLĐ: <b>' + esc(cdSua) + '</b></h3>' +
    '<p class="mut" style="margin:0 0 12px;font-size:13px">Bản định mức: <b>' + esc(label(cur)) + '</b>. Điền số lượng kèm đơn vị (ví dụ: 1 bộ, 1 đôi, 3 đôi...). Để trống nếu vị trí không được cấp mục đó.</p>' +
    '<div class="grid">' +
    BHLD_ITEMS.map(([key, ten]) =>
      '<label><span>' + esc(ten) + '</span><input name="' + esc(key) + '" value="' + esc(nSua[key] || '') + '" placeholder="VD: ' + (key === 'qa' ? '1 bộ' : key === 'giay' ? '1 đôi' : key === 'gang' ? '3 đôi' : key === 'nut' ? '2 đôi' : '1 cái') + '" autocomplete="off"></label>'
    ).join('') +
    '</div>' +
    '<div class="row" style="gap:8px;margin-top:16px">' +
    '<button class="btn" type="submit" id="bhldLuu">💾 Lưu định mức</button>' +
    '<button class="btn ghost" type="button" data-act="bhldHuyModal" id="bhldHuy">Hủy bỏ</button>' +
    '</div></form></div></div>';

  // Modal Thêm vị trí mới & BHLĐ
  const modalThem = !normBhldThemMo ? '' :
    '<div class="dmModalBack" id="dmModal"><div class="dmModal" role="dialog" aria-modal="true" aria-label="Thêm vị trí mới và Định mức BHLĐ" style="max-width:540px">' +
    '<form id="bhldThemForm" style="margin:0">' +
    '<h3 style="margin:0 0 6px">+ Thêm vị trí mới &amp; Định mức BHLĐ</h3>' +
    '<p class="mut" style="margin:0 0 12px;font-size:13px">Bản định mức: <b>' + esc(label(cur)) + '</b>. Nhập tên vị trí mới và định mức BHLĐ cấp phát. Vị trí sẽ tự động xuất hiện ở bảng Định mức và danh sách nhân công.</p>' +
    '<label style="display:block;margin-bottom:12px"><span class="req">Tên vị trí công việc</span>' +
    '<input name="tenViTri" id="bhldNewPosName" placeholder="Ví dụ: Thợ máy, Công nhân bốc vác, Tài xế..." required autocomplete="off" autofocus style="width:100%"></label>' +
    '<div class="grid">' +
    BHLD_ITEMS.map(([key, ten]) =>
      '<label><span>' + esc(ten) + '</span><input name="' + esc(key) + '" placeholder="VD: ' + (key === 'qa' ? '1 bộ' : key === 'giay' ? '1 đôi' : key === 'gang' ? '3 đôi' : key === 'nut' ? '2 đôi' : '1 cái') + '" autocomplete="off"></label>'
    ).join('') +
    '</div>' +
    '<div class="row" style="gap:8px;margin-top:16px">' +
    '<button class="btn" type="submit" id="bhldThemLuu">💾 Lưu vị trí và định mức</button>' +
    '<button class="btn ghost" type="button" data-act="bhldThemHuy" id="bhldThemHuy">Hủy bỏ</button>' +
    '</div></form></div></div>';

  const bhld = '<div class="card"><h3 style="margin-top:0">Định mức BHLĐ theo vị trí</h3>' +
    '<p class="mut" style="margin-top:0">Mỗi bản định mức có <b>hiệu lực từ ngày</b>. Biểu mẫu dùng bản có ngày hiệu lực lớn nhất không vượt quá ngày của biểu mẫu: danh sách cấp phát BHLĐ (BM-02) theo <b>ngày cấp phát</b> (không nhập thì theo ngày bắt đầu khai thác), hợp đồng lao động theo ngày bắt đầu hợp đồng hoặc ngày ký. Bấm <b>Sửa</b> trên từng vị trí để cập nhật định mức cấp phát.</p>' +
    '<form id="normForm" style="margin-top:12px">' +
    '<div class="row" style="gap:12px;align-items:flex-end;flex-wrap:wrap;margin-bottom:12px">' +
    '<label style="min-width:240px"><span>Bản định mức</span><select id="normVer">' + vs.map(v => '<option value="' + v.id + '"' + (v.id === normSel ? ' selected' : '') + '>' + esc(label(v)) + '</option>').join('') + '</select></label>' +
    '<label style="min-width:220px"><span class="req">Hiệu lực từ ngày (dd/mm/yyyy)</span><input name="tuNgay" value="' + esc(cur.tuNgay) + '" placeholder="' + (cur.base ? 'để trống = áp dụng từ trước đến nay' : 'dd/mm/yyyy') + '"></label>' +
    '<button class="btn" type="submit" id="normDateSave" title="Lưu ngày hiệu lực của bản này">💾 Lưu ngày hiệu lực</button>' +
    '<button class="btn ghost sm" type="button" data-act="normDelVer"' + (cur.base ? ' disabled' : '') + '>Xóa bản này</button>' +
    '<button class="btn sm" type="button" data-act="bhldThemViTri" id="bhldThemViTriBtn" style="margin-left:auto">+ Thêm vị trí mới</button>' +
    '</div>' +
    '<div class="wrap" style="max-height:min(60vh,520px);margin-top:8px"><table class="normTbl" id="normTbl"><thead><tr><th style="min-width:160px">Vị trí</th>' +
    BHLD_ITEMS.map(x => '<th style="text-align:center">' + x[1] + '</th>').join('') +
    '<th style="text-align:right"><span class="sro">Thao tác</span></th></tr></thead><tbody>' + rows + '</tbody></table></div>' +
    '</form>' + modalSua + modalThem +
    '<div class="row" style="margin-top:16px;gap:8px;flex-wrap:wrap;align-items:flex-end"><label><span>Thêm bản mới, hiệu lực từ ngày</span><input id="normNewDate" placeholder="dd/mm/yyyy" style="width:160px"></label><button class="btn ghost" type="button" data-act="normAddVer" id="normAddVerBtn">+ Thêm bản mới (sao chép bản đang chọn)</button></div>' +
    '<p class="mut" style="margin-top:12px">Danh sách vị trí lấy từ <b>Định mức nhân công</b>: thêm, đổi tên hoặc xóa vị trí ở đó; vị trí số người 0 là vị trí ngoài định biên chuẩn (vẫn có định mức BHLĐ và đơn giá).</p></div>';

  return normKhung({bhld, keo: keoCard(), nhancong: dbCard(), tg: tgCard()});
}
/* màn Định mức chia 4 tab như màn Danh mục; cả bốn biểu mẫu nằm trong trang, mỗi lúc chỉ HIỆN một tab (ẩn bằng hidden nên chữ đang gõ dở ở tab khác không mất khi chuyển tab) */
let normTab = 'bhld';   // tab đang mở, nhớ trong phiên
const NORM_TABS = [['bhld', () => 'Định mức BHLĐ theo vị trí'], ['keo', () => 'Gỗ keo: 1 ha = ? tấn'], ['nhancong', () => 'Nhân công: 1 đội = <span data-dbtong>' + dbTongHienThi() + '</span> người'], ['tg', () => 'Thời gian khai thác: 1 ha = ? ngày']];
function normKhung(pane) {
  if (!NORM_TABS.some(x => x[0] === normTab)) normTab = 'bhld';
  return '<h2>Định mức</h2><nav class="hak-catalog-tabs" id="normTabs" aria-label="Các nhóm định mức">' + NORM_TABS.map(([k, l]) => '<button type="button" id="normTab_' + k + '" data-normtab="' + k + '"' + (normTab === k ? ' aria-current="page"' : '') + '>' + l() + '</button>').join('') + '</nav>' +
    NORM_TABS.map(([k, l]) => '<section class="normPane" id="normPane_' + k + '" data-normpane="' + k + '" aria-label="' + esc(l().replace(/<[^>]+>/g, '')) + '"' + (normTab === k ? '' : ' hidden') + '>' + pane[k] + '</section>').join('') + normModalHtml();
}
document.addEventListener('click', e => {
  const b = e.target && e.target.closest && e.target.closest('[data-normtab]'); if (!b) return;
  normTab = b.dataset.normtab;
  document.querySelectorAll('[data-normpane]').forEach(s => { s.hidden = s.dataset.normpane !== normTab; });
  document.querySelectorAll('[data-normtab]').forEach(x => { if (x.dataset.normtab === normTab) x.setAttribute('aria-current', 'page'); else x.removeAttribute('aria-current'); });
});
/* Định mức gỗ keo: 1 ha = ? tấn, có hiệu lực từ ngày. Rừng lấy làm mặc định theo ngày bắt đầu khai thác; rừng tự điền số khác thì dùng số riêng */
function keoCard() {
  const items = HAKDinhMuc.keoItems(db);
  const so = v => String(v == null ? '' : v).replace('.', ',');
  const row = x => '<tr data-keo="' + x.id + '"><td>' + (x.tuNgay ? esc(x.tuNgay) : '<span class="mut">(chưa ghi ngày)</span>') + '</td><td><span class="pill ok" style="font-weight:600;white-space:nowrap">' + esc(so(x.tanHa)) + ' tấn/ha</span></td>' +
    '<td style="white-space:nowrap;text-align:right"><button class="btn ghost sm" type="button" data-act="normMoSua" data-nk="keo" data-ni="' + x.id + '">Sửa</button> <button class="btn ghost sm" type="button" data-act="normXoa" data-nk="keo" data-ni="' + x.id + '">Xóa</button></td></tr>';
  return '<h2 style="margin-top:24px">Định mức gỗ keo: 1 ha = ? tấn</h2><div class="card" id="keoForm">' +
    '<p class="mut" style="margin-top:0">Mỗi định mức có <b>hiệu lực từ ngày</b>. Rừng lấy định mức này làm <b>mặc định</b> theo ngày bắt đầu khai thác của rừng (chưa có ngày thì dùng bản mới nhất). Rừng có định mức khác thì tự điền ở Thông tin rừng.</p>' +
    '<div class="row" style="margin-bottom:10px"><button class="btn" type="button" id="keoThem" data-act="normMoThem" data-nk="keo">+ Thêm định mức gỗ keo</button></div>' +
    '<div class="wrap"><table class="normTbl" id="keoBang" style="min-width:0;table-layout:auto;max-width:620px"><thead><tr><th>Hiệu lực từ ngày</th><th>Định mức</th><th style="text-align:right"><span class="sro">Thao tác</span></th></tr></thead><tbody>' +
    (items.length ? items.map(row).join('') : '<tr><td colspan="3" class="mut">Chưa có định mức gỗ keo nào.</td></tr>') + '</tbody></table></div></div>';
}
/* Định mức nhân công: định biên một đội khai thác, số người và NHIỆM VỤ từng vị trí (src/dinhbien.js) */
let dbVer = '';   // id phiên bản đang xem / sửa ('' = mới nhất)
function dbVerBar() {
  const vs = HAKDinhBien.versions(db), cur = vs.find(v => v.id === dbVer) || vs[vs.length - 1];
  const lots = []; Object.values(db.rs || {}).forEach(o => forestList(o).forEach(f => lots.push({maRung: f.info.maRung, tuNgay: (f.info || {}).tuNgay || ''})));
  const ahc = HAKDinhBien.anhHuongChiTiet(db, cur.id, lots), ah = ahc.lo;
  return '<div class="row" id="dbVerBar" style="gap:8px;flex-wrap:wrap;align-items:flex-end;margin:6px 0"><label>Phiên bản <select id="dbVerSel">' + vs.map(v => '<option value="' + esc(v.id) + '"' + (v.id === cur.id ? ' selected' : '') + '>' + (v.tuNgay ? 'Hiệu lực từ ' + esc(v.tuNgay) :
  'Bản gốc (từ trước)') + '</option>').join('') + '</select></label>' +
    '<label>Thêm phiên bản từ ngày <input id="dbVerNew" placeholder="dd/mm/yyyy" style="width:120px"></label><button class="btn ghost sm" type="button" data-act="dbVerAdd">Sao chép phiên bản này thành phiên bản mới</button>' +
    (cur.id !== 'goc' ? '<button class="btn ghost sm" type="button" data-act="dbVerDel">Xóa phiên bản này</button>' : '') + '</div>' +
    '<p class="mut" style="margin:0 0 6px">Lô dùng phiên bản có hiệu lực tại <b>ngày bắt đầu khai thác</b> của lô. Phiên bản đang xem áp dụng cho <b>' + ah.length + '</b> lô' + (ah.length ? ': ' + esc(ah.slice(0,
    8).map(l => l.maRung || '(chưa mã)').join(', ')) + (ah.length > 8 ? ' …' : '') : '') + '. Thêm phiên bản mới không đổi các lô bắt đầu trước ngày hiệu lực.' + (ahc.ngayLoi.length ? ' <b class="err">Chưa xác định được phiên bản của ' + ahc.ngayLoi.length +
    ' lô vì ngày bắt đầu khai thác không có thật: ' + esc(ahc.ngayLoi.slice(0,
    6).map(l => (l.maRung || '(chưa mã)') + ' (' + l.tuNgay + ')').join(', ')) + ' — sửa ngày ở Thông tin rừng.</b>' : '') + '</p>';
}
function dbDuLieu() {
  const vsAll = HAKDinhBien.versions(db), curV = vsAll.find(v => v.id === dbVer) || vsAll[vsAll.length - 1];
  return {rows: vsAll.length > 1 ? viTriRowsTai('', curV.rows) : viTriRows(), saved: HAKDinhBien.get(db).saved};
}
const dbTongHienThi = () => HAKDinhBien.tong(dbDuLieu().rows);
function dbCard() {
  const g = dbDuLieu(), tong = HAKDinhBien.tong(g.rows);   // hiện ĐỦ danh mục vị trí (kể cả vị trí 0 người đang được dùng)
  const tt = r => r.chucDanh === HAKDinhBien.TO_TRUONG;
  const cat = (t, n) => { t = String(t || ''); return t.length > n ? t.slice(0, n - 1) + '…' : t; };
  const row = (r, i) => '<tr data-db="' + i + '"><td><b>' + esc(r.chucDanh) + '</b></td><td style="text-align:center"><span class="pill ok" style="font-weight:600;white-space:nowrap">' + esc(r.soNguoi == null ? 0 : r.soNguoi) + ' người</span></td>' +
    '<td>' + (r.kiemNhiem ? esc(r.kiemNhiem) : '<span class="mut">—</span>') + '</td><td title="' + esc(r.nhiemVu || '') + '">' + (r.nhiemVu ? esc(cat(r.nhiemVu, 90)) : '<span class="mut">—</span>') + '</td>' +
    '<td style="white-space:nowrap;text-align:right"><button class="btn ghost sm" type="button" data-act="normMoSua" data-nk="db" data-ni="' + i + '">Sửa</button>' +
    (tt(r) ? '' : ' <button class="btn ghost sm" type="button" data-act="normXoa" data-nk="db" data-ni="' + i + '">Xóa</button>') + '</td></tr>';
  return '<h2 style="margin-top:24px">Định mức nhân công: 1 đội = <span data-dbtong>' + tong + '</span> người</h2><div class="card" id="dbForm">' + dbVerBar() +
    '<p class="mut" style="margin-top:0">Định biên một đội khai thác và <b>nhiệm vụ từng vị trí</b>. Người <b>kiêm nhiệm</b> là một trong số người của vị trí gốc (ví dụ Tổ trưởng kiêm bốc xếp thì tổ bốc xếp có ' + (g.rows.find(r => r.chucDanh === 'Công nhân bốc xếp') ?
    g.rows.find(r => r.chucDanh === 'Công nhân bốc xếp').soNguoi + 1 : 'thêm 1') +
    ' người gồm cả Tổ trưởng). Vị trí mới được tự thêm vào danh sách vị trí ở tab Nhân công; <b>định mức BHLĐ và đơn giá của vị trí mới cần khai</b> ở các mục tương ứng. Tab Nhân công so sánh số người thực tế với định mức này (thiếu, thừa chỉ cảnh báo).' + (g.saved ? '' :
    ' <b id="dbMacDinh">Đang hiển thị định mức mặc định, bấm “Dùng định mức này” để lưu.</b>') + '</p>' +
    '<div class="row" style="gap:8px;flex-wrap:wrap;margin-bottom:10px"><button class="btn" type="button" id="dbThem" data-act="normMoThem" data-nk="db">+ Thêm vị trí định biên</button>' + (g.saved ? '' : '<button class="btn ghost" type="button" id="dbLuuMd" data-act="dbLuuMd">Dùng định mức này</button>') +
    '<button class="btn ghost" type="button" data-act="dbReset">Dùng định mức mặc định</button></div>' +
    '<div class="wrap"><table class="normTbl" id="dbBang" style="min-width:0;table-layout:auto"><thead><tr><th>Vị trí</th><th style="text-align:center">Định biên</th><th>Kiêm nhiệm</th><th>Nhiệm vụ</th><th style="text-align:right"><span class="sro">Thao tác</span></th></tr></thead><tbody>' +
    g.rows.map(row).join('') + '</tbody></table></div>' +
    '<datalist id="dbPosVt">' + dmVT().filter(v => !v.ngung).map(v => '<option value="' + esc(v.ten) + '">' + (v.nhiemVu ? esc(v.nhiemVu) : '') + '</option>').join('') + '</datalist>' +
    '<datalist id="dbPos">' + HAKDinhMuc.allPositions(db).map(x => '<option value="' + esc(x) + '">').join('') + '</datalist></div>';
}
/* ghi danh sách vị trí định biên của phiên bản đang xem; trả {error} hoặc {msg, tone} (không tự hiện thông báo để hộp thoại giữ nguyên chữ đang gõ khi lỗi) */
function dbGhiDinhBien(rows) {
  const giu = new Set(rows.filter(x => x.chucDanh).map(x => x.chucDanh.toLowerCase())), dung = viTriDangDung().filter(n => HAKDinhBien.get(db).saved || normUsed(n));
  const bo = dung.filter(n => !giu.has(n.toLowerCase()) && normUsed(n));
  if (bo.length) return {error: 'Chưa lưu định mức nhân công: còn nhân công giữ vị trí ' + bo.map(x => '“' + x + '”').join(', ') + ' — chuyển họ sang vị trí khác trước khi xóa vị trí.'};
  const r = HAKDinhBien.setVersion(db, (HAKDinhBien.versions(db).find(v => v.id === dbVer) || HAKDinhBien.versions(db).slice(-1)[0]).id, rows, HAKDinhMuc); if (!r.ok) return {error: 'Chưa lưu định mức nhân công: ' + r.error};
  _cdNho = null;   // danh sách vị trí được nhớ trong cùng một nhịp: bỏ để bảng vẽ lại ngay sau khi lưu thấy vị trí mới
  persist(); return {msg: 'Đã lưu định mức nhân công: 1 đội ' + HAKDinhBien.tong(db.dinhBien) + ' người.' + (r.them.length ? ' Đã thêm vị trí vào danh sách vị trí: ' + r.them.join(', ') + '. Khai định mức BHLĐ và đơn giá cho các vị trí này.' : ''), tone: r.them.length ? 'warn' : 'ok'};
}
const dbRowsHienTai = () => dbDuLieu().rows.map(r => ({chucDanh: r.chucDanh, soNguoi: r.soNguoi, kiemNhiem: r.kiemNhiem || '', nhiemVu: r.nhiemVu || ''}));
/* Định mức thời gian khai thác: 1 ha = ? ngày, hiệu lực từ ngày; kèm năng suất 1 ngày = ? tấn suy ra từ định mức gỗ keo */
function tgCard() {
  const items = HAKDinhMuc.tgItems(db);
  const so = v => String(v == null ? '' : v).replace('.', ',');
  const row = x => '<tr data-tg="' + x.id + '"><td>' + (x.tuNgay ? esc(x.tuNgay) : '<span class="mut">(chưa ghi ngày)</span>') + '</td><td><span class="pill ok" style="font-weight:600;white-space:nowrap">' + esc(so(x.ngayHa)) + ' ngày/ha</span></td><td class="mut">' +
    (typeof x.ngayHa === 'number' ? (() => { const k = HAKDinhMuc.keoPick(db, x.tuNgay), ns = k.found ? HAKDinhMuc.nangSuat(k.item.tanHa, x.ngayHa) : null; return ns ? '1 ngày ≈ ' + String(ns).replace('.', ',') + ' tấn' : ''; })() : '') + '</td>' +
    '<td style="white-space:nowrap;text-align:right"><button class="btn ghost sm" type="button" data-act="normMoSua" data-nk="tg" data-ni="' + x.id + '">Sửa</button> <button class="btn ghost sm" type="button" data-act="normXoa" data-nk="tg" data-ni="' + x.id + '">Xóa</button></td></tr>';
  return '<h2 style="margin-top:24px">Định mức thời gian khai thác: 1 ha = ? ngày</h2><div class="card" id="tgForm">' +
    '<p class="mut" style="margin-top:0">Căn cứ <b>1 ha = … ngày</b> để suy ra <b>thời gian khai thác dự kiến</b> của từng rừng (diện tích × ngày/ha, làm tròn lên) và <b>ngày kết thúc dự kiến</b> từ ngày bắt đầu (không tính Chủ nhật). Mỗi định mức có <b>hiệu lực từ ngày</b>, rừng lấy theo ngày bắt đầu khai thác (chưa có ngày thì dùng bản mới nhất). Cột <b>Năng suất</b> là <b>1 ngày = ? tấn</b> = định mức gỗ keo (tấn/ha) ÷ ngày/ha. Rừng có định mức khác thì tự điền ở Thông tin rừng.</p>' +
    '<div class="row" style="margin-bottom:10px"><button class="btn" type="button" id="tgThem" data-act="normMoThem" data-nk="tg">+ Thêm định mức thời gian</button></div>' +
    '<div class="wrap"><table class="normTbl" id="tgBang" style="min-width:0;table-layout:auto;max-width:720px"><thead><tr><th>Hiệu lực từ ngày</th><th>Thời gian</th><th>Năng suất suy ra</th><th style="text-align:right"><span class="sro">Thao tác</span></th></tr></thead><tbody>' +
    (items.length ? items.map(row).join('') : '<tr><td colspan="4" class="mut">Chưa có định mức thời gian khai thác nào.</td></tr>') + '</tbody></table></div></div>';
}
/* hộp thoại Thêm / Sửa định mức gỗ keo, nhân công, thời gian khai thác (normMo = {k, i}; i < 0 = thêm mới) */
let normMo = null;
function normModalHtml() {
  if (!normMo) return '';
  const k = normMo.k, i = normMo.i, moi = i < 0, so = v => String(v == null ? '' : v).replace('.', ',');
  const khung = (id, tieu, than, w) => '<div class="dmModalBack" id="dmModal"><div class="dmModal" role="dialog" aria-modal="true" aria-label="' + esc(tieu) + '" style="max-width:' + (w || 480) + 'px"><form id="' + id + '" style="margin:0"><h3 style="margin:0 0 10px">' + esc(tieu) + '</h3>' +
    '<div class="msg err" id="normMoLoi" role="alert" hidden></div>' + than +
    '<div class="row" style="gap:8px;margin-top:16px"><button class="btn" type="submit" id="normMoLuu">💾 Lưu</button><button class="btn ghost" type="button" id="normMoHuy" data-act="normMoHuy">Hủy</button></div></form></div></div>';
  if (k === 'keo') { const x = moi ? {} : (HAKDinhMuc.keoItems(db).find(z => z.id === i) || {});
    return khung('keoMoForm', moi ? 'Thêm định mức gỗ keo' : 'Sửa định mức gỗ keo', '<div class="grid"><label><span class="req">Hiệu lực từ ngày</span><input name="k_tu" value="' + esc(x.tuNgay || '') + '" placeholder="dd/mm/yyyy" autocomplete="off"></label>' +
      '<label><span class="req">Định mức (tấn/ha)</span><input name="k_tan" value="' + esc(so(x.tanHa)) + '" placeholder="VD: 80" inputmode="decimal" autocomplete="off"></label></div>'); }
  if (k === 'tg') { const x = moi ? {} : (HAKDinhMuc.tgItems(db).find(z => z.id === i) || {});
    return khung('tgMoForm', moi ? 'Thêm định mức thời gian khai thác' : 'Sửa định mức thời gian khai thác', '<div class="grid"><label><span class="req">Hiệu lực từ ngày</span><input name="t_tu" value="' + esc(x.tuNgay || '') + '" placeholder="dd/mm/yyyy" autocomplete="off"></label>' +
      '<label><span class="req">Thời gian (ngày/ha)</span><input name="t_ngay" value="' + esc(so(x.ngayHa)) + '" placeholder="VD: 5" inputmode="decimal" autocomplete="off"></label></div>'); }
  const r = moi ? {chucDanh: '', soNguoi: '', kiemNhiem: '', nhiemVu: ''} : (dbRowsHienTai()[i] || {}), tt = r.chucDanh === HAKDinhBien.TO_TRUONG;
  return khung('dbMoForm', moi ? 'Thêm vị trí định biên' : 'Sửa vị trí định biên', '<div class="grid"><label><span class="req">Vị trí</span><input name="b_cd" value="' + esc(r.chucDanh) + '" placeholder="VD: Công nhân bóc vỏ" list="dbPosVt" autocomplete="off"' + (tt ? ' readonly title="Vị trí Tổ trưởng cố định: 1 người"' : '') + '></label>' +
    '<label><span class="req">Số người</span><input name="b_so" value="' + esc(r.soNguoi == null ? '' : r.soNguoi) + '" placeholder="VD: 3" inputmode="numeric" autocomplete="off"' + (tt ? ' readonly' : '') + '></label>' +
    '<label><span>Kiêm nhiệm</span><input name="b_km" value="' + esc(r.kiemNhiem || '') + '" placeholder="(không)" list="dbPos" autocomplete="off"></label></div>' +
    '<label style="display:block;margin-top:8px"><span>Nhiệm vụ</span><textarea name="b_nv" rows="4" placeholder="Nhiệm vụ của vị trí" style="width:100%">' + esc(r.nhiemVu || '') + '</textarea></label>', 600);
}
/* chọn vị trí từ danh mục: tự điền Nhiệm vụ nếu ô nhiệm vụ còn trống (không ghi đè chữ đã gõ); gõ vị trí mới vẫn được */
function dbChonViTri(inp) {
  const fm = inp.form, nv = fm && fm.elements.b_nv; if (!nv || nv.value.trim() || inp.readOnly) return;
  const vt = HAKViTri.tim(dmVT().filter(v => !v.ngung), inp.value); if (vt && vt.nhiemVu) nv.value = vt.nhiemVu;
}
document.addEventListener('change', e => { const t = e.target; if (t && t.name === 'b_cd' && t.form && t.form.id === 'dbMoForm') dbChonViTri(t); });
function normMoLoi(msg) { const el = document.getElementById('normMoLoi'); if (!el) return note(msg, 'err'); el.textContent = msg; el.hidden = false; }
function normMoDong() { normMo = null; const m = document.getElementById('dmModal'); if (m) m.remove(); }
/* lưu từ hộp thoại: lỗi hiện ngay trong hộp thoại (giữ nguyên chữ đang gõ), thành công thì đóng hộp thoại và vẽ lại bảng */
function normMoLuu(form) {
  if (!normMo) return; const k = normMo.k, i = normMo.i, v = n => trim((form.elements[n] || {}).value || '');
  const bo = m => String(m).replace(/^Dòng \d+: /, '');
  if (k === 'keo' || k === 'tg') {
    const keo = k === 'keo', lst = (keo ? db.dinhMucKeo : db.dinhMucNgay) || [], moi = {tuNgay: keo ? v('k_tu') : v('t_tu'), [keo ? 'tanHa' : 'ngayHa']: keo ? v('k_tan') : v('t_ngay')};
    const rows = lst.map(x => ({tuNgay: x.tuNgay, [keo ? 'tanHa' : 'ngayHa']: keo ? x.tanHa : x.ngayHa})); if (i < 0) rows.push(moi); else rows[i] = moi;
    const r = keo ? HAKDinhMuc.keoSetAll(db, rows) : HAKDinhMuc.tgSetAll(db, rows);
    if (!r.ok) return normMoLoi((keo ? 'Chưa lưu định mức gỗ keo: ' : 'Chưa lưu định mức thời gian khai thác: ') + bo(r.error));
    persist(); normMoDong(); render(); return note(keo ? 'Đã lưu định mức gỗ keo.' : 'Đã lưu định mức thời gian khai thác.');
  }
  const rows = dbRowsHienTai(), moi = {chucDanh: v('b_cd'), soNguoi: v('b_so'), kiemNhiem: v('b_km'), nhiemVu: v('b_nv')};
  if (i < 0) rows.push(moi); else rows[i] = moi;
  const r = dbGhiDinhBien(rows); if (r.error) return normMoLoi(r.error);
  normMoDong(); render(); note(r.msg, r.tone);
}
function normMoAction(act, el) {
  const d = el.dataset || {}, k = d.nk, i = d.ni == null ? -1 : Number(d.ni);
  if (act === 'normMoThem') { normMo = {k, i: -1}; return render(); }
  if (act === 'normMoSua') { normMo = {k, i}; return render(); }
  if (act === 'normMoHuy') { normMoDong(); return render(); }
  if (act === 'dbLuuMd') { const r = dbGhiDinhBien(dbRowsHienTai()); if (r.error) return note(r.error, 'err'); render(); return note(r.msg, r.tone); }
  if (act === 'normXoa') {
    if (k === 'db') {
      const rows = dbRowsHienTai(), r0 = rows[i]; if (!r0 || r0.chucDanh === HAKDinhBien.TO_TRUONG) return;
      if (!confirm('Xóa vị trí “' + r0.chucDanh + '” khỏi định mức nhân công?')) return;
      rows.splice(i, 1); const r = dbGhiDinhBien(rows); if (r.error) return note(r.error, 'err'); render(); return note(r.msg, r.tone);
    }
    const keo = k === 'keo', lst = (keo ? db.dinhMucKeo : db.dinhMucNgay) || [], x = lst[i]; if (!x) return;
    if (!confirm('Xóa định mức ' + (keo ? 'gỗ keo' : 'thời gian khai thác') + ' hiệu lực từ ngày ' + (x.tuNgay || '(chưa ghi ngày)') + '?')) return;
    lst.splice(i, 1); persist(); render(); return note(keo ? 'Đã xóa định mức gỗ keo.' : 'Đã xóa định mức thời gian khai thác.');
  }
}
function saveNorm(form) {
  const tuNgay = trim((form.querySelector('[name="tuNgay"]') || {}).value || '');
  const d = HAKDinhMuc.setDate(db, normSel, tuNgay);
  if (!d.ok) { note('Chưa lưu: ' + d.error, 'err'); return; }
  persist();
  render();
  note('Đã lưu ngày hiệu lực định mức BHLĐ.');
}
function saveBhldPos(form) {
  const cd = normBhldSua; if (!cd) return;
  const cur = HAKDinhMuc.byId(db, normSel);
  if (!cur.dm) cur.dm = {};
  if (!cur.dm[cd]) cur.dm[cd] = {};
  BHLD_ITEMS.forEach(([k]) => {
    const v = trim((form.elements[k] || {}).value || '');
    if (v) cur.dm[cd][k] = v;
    else delete cur.dm[cd][k];
  });
  HAKDinhMuc.setNorm(db, normSel, cur.dm);
  persist();
  normBhldSua = null;
  render();
  note('Đã lưu định mức BHLĐ cho vị trí “' + cd + '”.');
}
function saveBhldNewPos(form) {
  const cd = trim((form.elements.tenViTri || {}).value || '');
  if (!cd) { note('Chưa nhập tên vị trí', 'err'); return; }
  if (cd.length > 60) { note('Tên vị trí tối đa 60 ký tự', 'err'); return; }
  const allCd = chucDanhAll();
  const found = allCd.find(x => x.toLowerCase() === cd.toLowerCase());
  const targetCd = found || cd;
  if (!found) {
    if (!Array.isArray(db.dinhBien) || !db.dinhBien.length) {
      db.dinhBien = JSON.parse(JSON.stringify(HAKDinhBien.MAC_DINH));
    }
    db.dinhBien.push({
      chucDanh: targetCd,
      soNguoi: 0,
      kiemNhiem: '',
      nhiemVu: 'Vị trí ngoài định biên chuẩn'
    });
  }
  const cur = HAKDinhMuc.byId(db, normSel);
  if (!cur.dm) cur.dm = {};
  if (!cur.dm[targetCd]) cur.dm[targetCd] = {};
  BHLD_ITEMS.forEach(([k]) => {
    const v = trim((form.elements[k] || {}).value || '');
    if (v) cur.dm[targetCd][k] = v;
    else delete cur.dm[targetCd][k];
  });
  HAKDinhMuc.setNorm(db, normSel, cur.dm);
  persist();
  normBhldThemMo = false;
  render();
  note('Đã lưu vị trí “' + targetCd + '” và định mức BHLĐ.', 'ok');
}
function normAction(act, el) {
  if (act === 'bhldSua') { normBhldSua = el.dataset.bhldsua || el.dataset.pos; return render(); }
  if (act === 'bhldHuyModal') { normBhldSua = null; return render(); }
  if (act === 'bhldThemViTri') { normBhldThemMo = true; return render(); }
  if (act === 'bhldThemHuy') { normBhldThemMo = false; return render(); }
  if (act === 'normAddVer') {
    const r = HAKDinhMuc.addVersion(db, ($('#normNewDate') || {}).value, normSel);
    if (!r.ok) return note(r.error, 'err');
    normSel = r.id; persist(); render();
    return note('Đã thêm bản định mức mới, sao chép từ bản trước. Bấm Sửa trên từng vị trí để điều chỉnh.');
  }
  if (act === 'normDelVer') {
    const r = HAKDinhMuc.removeVersion(db, normSel);
    if (!r.ok) return note(r.error, 'err');
    normSel = 'b'; persist(); render();
    return note('Đã xóa bản định mức.');
  }
}

const INFO_FIELDS = [   // 3.5.1: bốn ô định danh (số hợp đồng · CCCD · họ tên · mã chủ rừng) đứng đầu form, kèm nút “Tra cứu Sheets”
  ['soHopDong', 'Số hợp đồng mua bán gỗ (căn cứ in trong các hợp đồng)', 'text', false],
  ['cccd', 'CCCD', 'text', true],
  ['ten', 'Họ và tên', 'text', true],
  ['ma', 'Mã chủ rừng', 'text', true],
  ['danhXung', 'Danh xưng', 'select', true],
  ['ngayKyHopDong', 'Ngày ký hợp đồng mua bán gỗ (dd/mm/yyyy; mặc định ngày ký các hợp đồng của lô)', 'text', false],
  ['ngayCap', 'Ngày cấp CCCD', 'text', true],
  ['noiCap', 'Nơi cấp CCCD', 'text', true],
  ['sdt', 'Số điện thoại', 'text', false],
  ['diaChi', 'Địa chỉ thường trú', 'wide', true]
];
/* phiếu #09 (ND-08): ô chọn chủ rừng từ Danh mục đối tượng (điền sẵn; hồ sơ giữ bản chụp, sửa danh mục sau không đổi hồ sơ này). Không có ô tên: không đi vào dữ liệu lưu. */
function infoChonDm(info) {
  const L = HAKDoiTuong.nguoiChonChuRung(db.dmDoiTuong || []); if (!L.length) return '<input type="hidden" name="nguoiDmId" value="' + esc((info || {}).nguoiDmId || '') + '">';
  return '<input type="hidden" name="nguoiDmId" value="' + esc((info || {}).nguoiDmId || '') + '"><label style="grid-column:1/-1"><span>Chọn từ Danh mục đối tượng (điền sẵn họ tên, danh xưng, CCCD, ngày cấp, nơi cấp, địa chỉ)</span><select id="infoDm"><option value="">— nhập tay —</option>' +
    L.map(x => '<option value="' + esc(x.id) + '"' + ((info || {}).nguoiDmId === x.id ? ' selected' : '') + '>' + esc(x.nhan) + '</option>').join('') + '</select><small class="mut">Hồ sơ chủ rừng giữ bản chụp: sửa danh mục sau không làm đổi hồ sơ đã lưu. Vẫn nhập tay được.</small></label>';
}
/* cảnh báo (không chặn): CCCD nhập tay trùng một người trong Danh mục đối tượng */
function infoDmCanh(info) {
  const m = info && info.cccd ? HAKDoiTuong.trungDanhMuc(db.dmDoiTuong || [], info.cccd, info.nguoiDmId) : null;
  return m ? 'CCCD ' + info.cccd + ' trùng người “' + HAKDoiTuong.nhanNguoi(m.dt, m.ng) + '” trong Danh mục đối tượng: chọn người đó ở ô “Chọn từ Danh mục đối tượng” để điền sẵn, hoặc bỏ qua nếu là hai người khác nhau' : '';
}
function panelInfo(rec) {
  const errs = rec.id ? infoErrors(rec.info, rec.id) : [];
  const isMaTheoCccd = !rec.info.ma || rec.info.ma === rec.info.cccd;
  const field = ([k, label, type, req]) => {
    const v = rec.info[k] ?? '';
    const lab = '<span class="' + (req ? 'req' : '') + '">' + label + '</span>';
    const ro = '';   // ô Mã luôn gõ được: gõ vào ô Mã thì tự bỏ tích “Dùng số CCCD làm Mã chủ rừng” (ô bị khóa chỉ đọc làm hỏng nhập tay và các e2e nhập mã)
    if (type === 'select') return '<div class="segRow" id="infoDanhXung"><b class="segNhan"><span class="' + (req ? 'req' : '') + '">' + label + '</span></b><div class="segBar" role="group" aria-label="Danh xưng">' +
      ['Ông', 'Bà'].map(o => '<label class="segOp"><input type="radio" name="' + k + '" value="' + o + '"' + (v === o || (!v && o === 'Ông') ? ' checked' : '') + '><span>' + o + '</span></label>').join('') + '</div></div>';
    if (type === 'wide') return '<label style="grid-column:1/-1">' + lab + '<input name="' + k + '" value="' + esc(v) + '"' + ro + '></label>';
    return '<label>' + lab + '<input name="' + k + '" value="' + esc(v) + '"' + (type === 'number' ? ' inputmode="numeric"' : '') + ro + '></label>';
  };
  return '<div class="card"><h3 style="margin-top:0">Thông tin chủ rừng</h3>' +
    '<p class="mut" style="margin-top:0">Hồ sơ mở theo chủ rừng. Thông tin này in vào bên A của mọi hợp đồng.</p>' +
    '<form id="infoForm" class="grid">' + '<div class="infoTraCuu" id="infoTraCuu3" style="grid-column:1/-1"><div class="grid">' + INFO_FIELDS.slice(0, 3).map(field).join('') + '<div class="maCell">' + field(INFO_FIELDS[3]) + '<label class="maCbx" style="flex-direction:row;align-items:center;gap:6px;margin-top:4px"><input type="checkbox" id="maTheoCccd"' + (!rec.info.ma || rec.info.ma === rec.info.cccd ? ' checked' : '') + '> Dùng số CCCD làm Mã chủ rừng</label></div></div>' +
    '</div>' + (HB ? '<div class="row" id="infoTraCuuNut" style="grid-column:1/-1;gap:10px;align-items:center;flex-wrap:wrap"><button class="btn" type="button" data-act="infoTraCuu" id="infoTraCuu">🔍 Tra cứu Sheets</button><span class="mut">Tìm theo số hợp đồng, CCCD, họ tên hoặc mã chủ rừng (Enter ở các ô trên); chọn hợp đồng để điền sẵn và tạo lô.</span></div>' : '') +
    infoChonDm(rec.info) + INFO_FIELDS.slice(4).map(field).join('') +
    '<div style="grid-column:1/-1" class="row"><button class="btn" type="submit">Lưu thông tin</button></div></form></div>' +
    (rec.info && errs.length && rec.id ? '<div class="msg warn">Còn thiếu: ' + esc(errs.join('; ')) + '</div>' : '') +
    (rec.id && infoDmCanh(rec.info) ? '<div class="msg warn" data-info-canh>' + esc(infoDmCanh(rec.info)) + '</div>' : '') +
    (rec.id ? infoWarns(rec.info, rec.id).map(w => '<div class="msg warn" data-info-canh>' + esc(w) + '</div>').join('') : '');   // phiếu #05: cảnh báo, không chặn
}

function panelImport(kind, rec, heading = '', congCu = '') {
  if (kind !== 'pc' && !window.hak?.testLegacyImport) return '';   // phiếu #06: nút “Nhập Excel tại Danh mục …” nằm trong thanh công cụ của bảng (stBar), cạnh nút Thêm
  const M = {nc: {name: 'NHAN_CONG', at: 'ncAt', file: 'ncFile', arr: 'nc', title: 'Nạp file nhân công'},
    dx: {name: 'DOI_XE', at: 'dxAt', file: 'dxFile', arr: 'dx', title: 'Nạp file vận chuyển'},
    pc: {name: 'PHIEU_CAN', at: 'pcAt', file: 'pcFile', arr: 'pc', title: 'Nạp file phiếu cân (mỗi chuyến một dòng)'}}[kind];
  const name = M.name, at = rec[M.at], file = rec[M.file], count = (rec[M.arr] || []).length;
  /* phiếu #06 (D-01): MỘT thanh công cụ — Thêm / Nhập Excel / Dán / Tải file mẫu (+ công cụ của hợp đồng), tình trạng nạp ghi gọn ở cuối thanh */
  const tinhTrang = 'Sheet ' + name + ' · ' + (count ? 'đã nạp ' + count + ' dòng' + (file ? ' từ ' + esc(file) : '') + (at ? ' lúc ' + esc(at) : '') : 'chưa có dữ liệu');
  const tt = '<span class="mut napTinhTrang">' + tinhTrang + '</span>', dau = heading ? heading.replace(/<\/div>$/, tt + '</div>') : '<div class="row pcHdDau"><h3 style="margin:0">' + M.title + '</h3>' + tt + '</div>';   // tình trạng nạp ở cuối dòng tiêu đề
  return '<div class="card napCard">' + dau + '<div class="row importActions napThanh">' +
    (kind === 'pc' ? '<button class="btn sm" data-act="stAdd" data-kind="pc">+ Thêm phiếu cân</button>' : '') +
    '<label class="btn sm" style="cursor:pointer" title="Chọn file Excel (.xlsx, .xls) để nạp">Nhập Excel<input type="file" accept=".xlsx,.xls" data-file="' + kind + '" hidden></label><button class="btn ghost sm" data-act="danMo" data-kind="' + kind + '" title="Chép vùng ô trong Excel (gồm dòng tiêu đề) rồi dán vào phần mềm">Dán từ Excel</button>' +
    '<button class="btn ghost sm" data-act="tpl" data-kind="' + kind + '" title="File mẫu có trang HUONG_DAN giải thích từng cột, danh sách chọn và ví dụ">Tải file mẫu</button>' + congCu + '</div>' + (count && (kind !== 'pc' || !hdMo('dx')) ? '<p><button class="btn danger sm" data-act="clear" data-kind="' + kind + '">Xóa dữ liệu của lô</button></p>' : '') + '</div>';
}

/* kiểm thử B7: kết quả kiểm tra của lô đang mở (bản nháp nếu có) và phiên bản dữ liệu hiện tại */
CONG_KT.ktTest = {kt: () => { const r = curRec(); return r ? exportCheck(stJob(r)) : null; }, ver: () => dataVer};
