let normSel = 'b';   // bản định mức đang xem/sửa ('b' = bản gốc, 'i0', 'i1'… = các bản hiệu lực từ ngày muộn hơn)
const normUsed = name => Object.values(db.rs || {}).some(o => Object.values(o.forests || {}).some(f => (f.nc || []).some(r => r.chucDanh === name)));
function panelNorm() {
  const vs = HAKDinhMuc.versions(db); if (!vs.some(v => v.id === normSel)) normSel = vs[vs.length - 1].id;
  const cur = HAKDinhMuc.byId(db, normSel), pos = chucDanhAll();
  const rows = pos.map((cd, k) => {
    const n = cur.dm[cd] || {};
    return '<tr data-pos="' + esc(cd) + '"><td><b>' + esc(cd) + '</b></td>' +
      BHLD_ITEMS.map(([key]) => '<td><input name="n_' + k + '_' + key + '" value="' + esc(n[key] || '') + '"></td>').join('') + '</tr>';
  }).join('');
  const label = v => (v.tuNgay ? 'Hiệu lực từ ' + v.tuNgay : 'Bản gốc (chưa đặt ngày hiệu lực)');
  const bhld = '<div class="card"><h3 style="margin-top:0">Định mức BHLĐ theo vị trí</h3>' +
    '<p class="mut" style="margin-top:0">Mỗi bản định mức có <b>hiệu lực từ ngày</b>. Biểu mẫu dùng bản có ngày hiệu lực lớn nhất không vượt quá ngày của biểu mẫu: danh sách cấp phát BHLĐ (BM-02) theo <b>ngày cấp phát</b> (không nhập thì theo ngày bắt đầu khai thác), hợp đồng lao động theo ngày bắt đầu hợp đồng hoặc ngày ký. Ghi số lượng kèm đơn vị, ví dụ “1 bộ”; để trống nếu vị trí không được cấp mục đó.</p>' +
    '<div class="row" style="gap:12px;align-items:flex-end;flex-wrap:wrap"><label style="min-width:260px"><span>Bản định mức</span><select id="normVer">' + vs.map(v => '<option value="' + v.id + '"' + (v.id === normSel ? ' selected' : '') + '>' + esc(label(v)) + '</option>').join('') + '</select></label>' +
    '<button class="btn ghost sm" type="button" data-act="normDelVer"' + (cur.base ? ' disabled' : '') + '>Xóa bản này</button></div>' +
    '<form id="normForm" style="margin-top:12px"><label style="max-width:320px"><span class="req">Hiệu lực từ ngày (dd/mm/yyyy)</span><input name="tuNgay" value="' + esc(cur.tuNgay) + '" placeholder="' + (cur.base ? 'để trống = áp dụng từ trước đến nay' : 'dd/mm/yyyy') + '"></label>' +
    '<div class="wrap" style="margin-top:8px"><table class="normTbl"><thead><tr><th>Vị trí</th>' + BHLD_ITEMS.map(x => '<th>' + x[1] + '</th>').join('') + '</tr></thead><tbody>' + rows + '</tbody></table></div>' +
    '<div class="row" style="margin-top:12px"><button class="btn" type="submit">Lưu bản định mức này</button></div></form>' +
    '<div class="row" style="margin-top:16px;gap:8px;flex-wrap:wrap;align-items:flex-end"><label><span>Thêm bản mới, hiệu lực từ ngày</span><input id="normNewDate" placeholder="dd/mm/yyyy" style="width:160px"></label><button class="btn ghost" type="button" data-act="normAddVer">Thêm bản mới (sao chép bản đang chọn)</button></div>' +
    '<p class="mut" style="margin-top:12px">Danh sách vị trí lấy từ <b>Định mức nhân công</b> (bên dưới): thêm, đổi tên hoặc xóa vị trí ở đó; vị trí số người 0 là vị trí ngoài định biên chuẩn (vẫn có định mức BHLĐ và đơn giá).</p></div>';
  return normKhung({bhld, keo: keoCard(), nhancong: dbCard(), tg: tgCard()});
}
/* màn Định mức chia 4 tab như màn Danh mục; cả bốn biểu mẫu nằm trong trang, mỗi lúc chỉ HIỆN một tab (ẩn bằng hidden nên chữ đang gõ dở ở tab khác không mất khi chuyển tab) */
let normTab = 'bhld';   // tab đang mở, nhớ trong phiên
const NORM_TABS = [['bhld', () => 'Định mức BHLĐ theo vị trí'], ['keo', () => 'Gỗ keo: 1 ha = ? tấn'], ['nhancong', () => 'Nhân công: 1 đội = <span data-dbtong>' + dbTongHienThi() + '</span> người'], ['tg', () => 'Thời gian khai thác: 1 ha = ? ngày']];
function normKhung(pane) {
  if (!NORM_TABS.some(x => x[0] === normTab)) normTab = 'bhld';
  return '<h2>Định mức</h2><nav class="hak-catalog-tabs" id="normTabs" aria-label="Các nhóm định mức">' + NORM_TABS.map(([k, l]) => '<button type="button" id="normTab_' + k + '" data-normtab="' + k + '"' + (normTab === k ? ' aria-current="page"' : '') + '>' + l() + '</button>').join('') + '</nav>' +
    NORM_TABS.map(([k, l]) => '<section class="normPane" id="normPane_' + k + '" data-normpane="' + k + '" aria-label="' + esc(l().replace(/<[^>]+>/g, '')) + '"' + (normTab === k ? '' : ' hidden') + '>' + pane[k] + '</section>').join('');
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
  const row = (x, n) => '<tr data-keo="' + n + '"><td><input name="k_tu" value="' + esc(x.tuNgay) + '" placeholder="dd/mm/yyyy" style="width:150px"></td><td><input name="k_tan" value="' + esc(x.tanHa == null ? '' : String(x.tanHa).replace('.', ',')) +
  '" placeholder="VD: 80" style="width:130px;text-align:right"></td><td>' + (x.tuNgay ? '<button class="btn ghost sm" type="button" data-act="keoDel">Xóa</button>' : '') + '</td></tr>';
  return '<h2 style="margin-top:24px">Định mức gỗ keo: 1 ha = ? tấn</h2><div class="card"><form id="keoForm">' +
    '<p class="mut" style="margin-top:0">Mỗi định mức có <b>hiệu lực từ ngày</b>. Rừng lấy định mức này làm <b>mặc định</b> theo ngày bắt đầu khai thác của rừng (chưa có ngày thì dùng bản mới nhất). Rừng có định mức khác thì tự điền ở Thông tin rừng.</p>' +
    '<table class="normTbl" style="min-width:0;table-layout:auto;max-width:560px"><thead><tr><th>Hiệu lực từ ngày</th><th>1 ha = … tấn</th><th></th></tr></thead><tbody>' + items.map(row).join('') + row({tuNgay: '', tanHa: null}, 'new') + '</tbody></table>' +
    '<div class="row" style="margin-top:12px"><button class="btn" type="submit">Lưu định mức gỗ keo</button><span class="mut">Dòng cuối để thêm định mức mới.</span></div></form></div>';
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
  const row = (r, n) => '<tr data-db="' + n + '"><td><input name="b_cd" value="' + esc(r.chucDanh) + '" placeholder="VD: Công nhân bóc vỏ" list="dbPosVt" style="width:190px"' + (r.chucDanh === HAKDinhBien.TO_TRUONG ? ' readonly title="Vị trí Tổ trưởng cố định: 1 người"' : '') + '></td>' +
    '<td><input name="b_so" value="' + esc(r.soNguoi == null ? '' : r.soNguoi) + '" placeholder="VD: 3" style="width:70px;text-align:right"' + (r.chucDanh === HAKDinhBien.TO_TRUONG ? ' readonly' : '') + '></td>' +
    '<td><input name="b_km" value="' + esc(r.kiemNhiem || '') + '" placeholder="(không)" style="width:170px" list="dbPos"></td>' +
    '<td><textarea name="b_nv" rows="4" placeholder="Nhiệm vụ của vị trí" style="width:100%;min-width:320px">' + esc(r.nhiemVu || '') + '</textarea></td>' +
    '<td>' + (r.chucDanh && r.chucDanh !== HAKDinhBien.TO_TRUONG ? '<button class="btn ghost sm" type="button" data-act="dbDel">Xóa</button>' : '') + '</td></tr>';
  return '<h2 style="margin-top:24px">Định mức nhân công: 1 đội = <span data-dbtong>' + tong + '</span> người</h2><div class="card">' + dbVerBar() + '<form id="dbForm">' +
    '<p class="mut" style="margin-top:0">Định biên một đội khai thác và <b>nhiệm vụ từng vị trí</b>. Người <b>kiêm nhiệm</b> là một trong số người của vị trí gốc (ví dụ Tổ trưởng kiêm bốc xếp thì tổ bốc xếp có ' + (g.rows.find(r => r.chucDanh === 'Công nhân bốc xếp') ?
    g.rows.find(r => r.chucDanh === 'Công nhân bốc xếp').soNguoi + 1 : 'thêm 1') +
    ' người gồm cả Tổ trưởng). Vị trí mới được tự thêm vào danh sách vị trí ở tab Nhân công; <b>định mức BHLĐ và đơn giá của vị trí mới cần khai</b> ở các mục tương ứng. Tab Nhân công so sánh số người thực tế với định mức này (thiếu, thừa chỉ cảnh báo).' + (g.saved ? '' :
    ' <b>Đang hiển thị định mức mặc định, bấm Lưu để dùng.</b>') + '</p>' +
    '<div class="wrap"><table class="normTbl" style="min-width:0;table-layout:auto"><thead><tr><th>Vị trí</th><th>Số người</th><th>Kiêm nhiệm</th><th>Nhiệm vụ</th><th><span class="sro">Thao tác</span></th></tr></thead><tbody>' + g.rows.map(row).join('') + row({chucDanh: '', soNguoi: null,
    kiemNhiem: '', nhiemVu: ''}, 'new') + '</tbody></table></div>' +
    '<datalist id="dbPosVt">' + dmVT().filter(v => !v.ngung).map(v => '<option value="' + esc(v.ten) + '">' + (v.nhiemVu ? esc(v.nhiemVu) : '') + '</option>').join('') + '</datalist>' +
    '<datalist id="dbPos">' + HAKDinhMuc.allPositions(db).map(x => '<option value="' + esc(x) + '">').join('') + '</datalist>' +
    '<div class="row" style="margin-top:12px;gap:8px;flex-wrap:wrap"><button class="btn" type="submit">Lưu định mức nhân công</button><button class="btn ghost" type="button" data-act="dbReset">Dùng định mức mặc định</button><span class="mut">Dòng cuối để thêm vị trí mới.</span></div></form></div>';
}
function saveDb(form) {
  const rows = [...form.querySelectorAll('tr[data-db]')].map(tr => ({chucDanh: trim(tr.querySelector('[name=b_cd]').value), soNguoi: trim(tr.querySelector('[name=b_so]').value), kiemNhiem: trim(tr.querySelector('[name=b_km]').value), nhiemVu: trim(tr.querySelector('[name=b_nv]').value)}));
  const giu = new Set(rows.filter(x => x.chucDanh).map(x => x.chucDanh.toLowerCase())), dung = viTriDangDung().filter(n => HAKDinhBien.get(db).saved || normUsed(n));
  const bo = dung.filter(n => !giu.has(n.toLowerCase()) && normUsed(n));
  if (bo.length) { note('Chưa lưu định mức nhân công: còn nhân công giữ vị trí ' + bo.map(x => '“' + x + '”').join(', ') + ' — chuyển họ sang vị trí khác trước khi xóa vị trí.', 'err'); return; }
  const r = HAKDinhBien.setVersion(db, (HAKDinhBien.versions(db).find(v => v.id === dbVer) || HAKDinhBien.versions(db).slice(-1)[0]).id, rows, HAKDinhMuc); if (!r.ok) { note('Chưa lưu định mức nhân công: ' + r.error, 'err'); return; }
  persist(); note('Đã lưu định mức nhân công: 1 đội ' + HAKDinhBien.tong(db.dinhBien) + ' người.' + (r.them.length ? ' Đã thêm vị trí vào danh sách vị trí: ' + r.them.join(', ') + '. Khai định mức BHLĐ và đơn giá cho các vị trí này.' : ''), r.them.length ? 'warn' : 'ok');
}
/* tiêu đề “1 đội = N người” tính lại NGAY khi gõ số người hoặc xóa dòng (chỉ hiển thị, không ghi dữ liệu) */
function dbTongTuForm() {
  const fm = document.getElementById('dbForm'); if (!fm) return;
  let n = 0; fm.querySelectorAll('tr[data-db]').forEach(tr => { if (tr.style.display === 'none') return; const ten = trim(tr.querySelector('[name=b_cd]').value), so = Number(trim(tr.querySelector('[name=b_so]').value).replace(',', '.')); if (ten && Number.isFinite(so) && so > 0) n += so; });
  document.querySelectorAll('[data-dbtong]').forEach(el => { el.textContent = String(n); });
}
/* chọn vị trí từ danh mục (chỉ ở sự kiện change: rời ô hoặc chọn datalist, không chạy mỗi phím gõ): tự điền Nhiệm vụ nếu ô nhiệm vụ còn trống (không ghi đè chữ đã gõ); gõ vị trí mới vẫn được */
function dbChonViTri(inp) {
  const tr = inp.closest('tr[data-db]'), nv = tr && tr.querySelector('[name=b_nv]'); if (!nv || nv.value.trim() || inp.readOnly) return;
  const vt = HAKViTri.tim(dmVT().filter(v => !v.ngung), inp.value); if (vt && vt.nhiemVu) nv.value = vt.nhiemVu;
}
document.addEventListener('input', e => { const t = e.target; if (!t || !t.name) return; if (t.name === 'b_so' || t.name === 'b_cd') dbTongTuForm(); });
document.addEventListener('change', e => { const t = e.target; if (t && t.name === 'b_cd') { dbChonViTri(t); dbTongTuForm(); } });
document.addEventListener('click', e => { if (e.target && e.target.closest && e.target.closest('[data-act=dbDel]')) setTimeout(dbTongTuForm, 0); });
/* Định mức thời gian khai thác: 1 ha = ? ngày, hiệu lực từ ngày; kèm năng suất 1 ngày = ? tấn suy ra từ định mức gỗ keo */
function tgCard() {
  const items = HAKDinhMuc.tgItems(db);
  const row = (x, n) => '<tr data-tg="' + n + '"><td><input name="t_tu" value="' + esc(x.tuNgay) + '" placeholder="dd/mm/yyyy" style="width:150px"></td><td><input name="t_ngay" value="' + esc(x.ngayHa == null ? '' : String(x.ngayHa).replace('.',
  ',')) + '" placeholder="VD: 5" style="width:130px;text-align:right"></td><td class="mut">' + (typeof x.ngayHa === 'number' ? (() => { const k = HAKDinhMuc.keoPick(db, x.tuNgay), ns = k.found ? HAKDinhMuc.nangSuat(k.item.tanHa, x.ngayHa) : null; return ns ? '1 ngày ≈ ' + String(ns).replace('.',
  ',') + ' tấn' : ''; })() : '') + '</td><td>' + (x.tuNgay ? '<button class="btn ghost sm" type="button" data-act="keoDel">Xóa</button>' : '') + '</td></tr>';
  return '<h2 style="margin-top:24px">Định mức thời gian khai thác: 1 ha = ? ngày</h2><div class="card"><form id="tgForm">' +
    '<p class="mut" style="margin-top:0">Căn cứ <b>1 ha = … ngày</b> để suy ra <b>thời gian khai thác dự kiến</b> của từng rừng (diện tích × ngày/ha, làm tròn lên) và <b>ngày kết thúc dự kiến</b> từ ngày bắt đầu (không tính Chủ nhật). Mỗi định mức có <b>hiệu lực từ ngày</b>, rừng lấy theo ngày bắt đầu khai thác (chưa có ngày thì dùng bản mới nhất). Cột cuối là <b>năng suất 1 ngày = ? tấn</b> = định mức gỗ keo (tấn/ha) ÷ ngày/ha. Rừng có định mức khác thì tự điền ở Thông tin rừng.</p>' +
    '<table class="normTbl" style="min-width:0;table-layout:auto;max-width:620px"><thead><tr><th>Hiệu lực từ ngày</th><th>1 ha = … ngày</th><th>Năng suất</th><th><span class="sro">Thao tác</span></th></tr></thead><tbody>' + items.map(row).join('') + row({tuNgay: '', ngayHa: null}, 'new') + '</tbody></table>' +
    '<div class="row" style="margin-top:12px"><button class="btn" type="submit">Lưu định mức thời gian khai thác</button><span class="mut">Dòng cuối để thêm định mức mới.</span></div></form></div>';
}
function saveTg(form) {
  const rows = [...form.querySelectorAll('tr[data-tg]')].map(tr => ({tuNgay: trim(tr.querySelector('[name=t_tu]').value), ngayHa: trim(tr.querySelector('[name=t_ngay]').value)})).filter(r => r.tuNgay || r.ngayHa);
  const r = HAKDinhMuc.tgSetAll(db, rows); if (!r.ok) { note('Chưa lưu định mức thời gian khai thác: ' + r.error, 'err'); return; }
  persist(); note('Đã lưu định mức thời gian khai thác.');
}
function saveKeo(form) {
  const rows = [...form.querySelectorAll('tr[data-keo]')].map(tr => ({tuNgay: trim(tr.querySelector('[name=k_tu]').value), tanHa: trim(tr.querySelector('[name=k_tan]').value)})).filter(r => r.tuNgay || r.tanHa);
  const r = HAKDinhMuc.keoSetAll(db, rows); if (!r.ok) { note('Chưa lưu định mức gỗ keo: ' + r.error, 'err'); return; }
  persist(); note('Đã lưu định mức gỗ keo.');
}
function saveNorm(form) {
  const dm = {};
  chucDanhAll().forEach((cd, k) => { dm[cd] = {}; BHLD_ITEMS.forEach(([key]) => { dm[cd][key] = trim(form.querySelector('[name="n_' + k + '_' + key + '"]').value); }); });
  const d = HAKDinhMuc.setDate(db, normSel, form.querySelector('[name="tuNgay"]').value);
  if (!d.ok) { note('Chưa lưu: ' + d.error, 'err'); return; }
  HAKDinhMuc.setNorm(db, normSel, dm);
  // sau khi đổi ngày, bản có thể đổi thứ tự: tìm lại theo ngày
  persist();
  note('Đã lưu định mức BHLĐ.');
}
function normAction(act, el) {
  if (act === 'normAddVer') { const r = HAKDinhMuc.addVersion(db, ($('#normNewDate') || {}).value, normSel); if (!r.ok) return note(r.error, 'err'); normSel = r.id; persist(); return note('Đã thêm bản định mức mới, sao chép từ bản trước. Sửa nội dung rồi bấm Lưu.'); }
  if (act === 'normDelVer') { const r = HAKDinhMuc.removeVersion(db, normSel); if (!r.ok) return note(r.error, 'err'); normSel = 'b'; persist(); return note('Đã xóa bản định mức.'); }
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
  const field = ([k, label, type, req]) => {
    const v = rec.info[k] ?? '';
    const lab = '<span class="' + (req ? 'req' : '') + '">' + label + '</span>';
    if (type === 'select') return '<div class="segRow" id="infoDanhXung"><b class="segNhan"><span class="' + (req ? 'req' : '') + '">' + label + '</span></b><div class="segBar" role="group" aria-label="Danh xưng">' +
      ['Ông', 'Bà'].map(o => '<label class="segOp"><input type="radio" name="' + k + '" value="' + o + '"' + (v === o || (!v && o === 'Ông') ? ' checked' : '') + '><span>' + o + '</span></label>').join('') + '</div></div>';
    if (type === 'wide') return '<label style="grid-column:1/-1">' + lab + '<input name="' + k + '" value="' + esc(v) + '"></label>';
    return '<label>' + lab + '<input name="' + k + '" value="' + esc(v) + '"' + (type === 'number' ? ' inputmode="numeric"' : '') + '></label>';
  };
  return '<div class="card"><h3 style="margin-top:0">Thông tin chủ rừng</h3>' +
    '<p class="mut" style="margin-top:0">Hồ sơ mở theo chủ rừng. Thông tin này in vào bên A của mọi hợp đồng.</p>' +
    '<form id="infoForm" class="grid">' + '<div class="infoTraCuu" id="infoTraCuu3" style="grid-column:1/-1"><div class="grid">' + INFO_FIELDS.slice(0, 4).map(field).join('') + '<label class="maCbx" style="flex-direction:row;align-items:center;gap:6px"><input type="checkbox" id="maTheoCccd"' + (!rec.info.ma || rec.info.ma === rec.info.cccd ? ' checked' : '') + '> Dùng số CCCD làm Mã chủ rừng</label></div>' +
    
    (HB ? '<div class="row" style="margin-top:8px;gap:10px;align-items:center;flex-wrap:wrap"><button class="btn" type="button" data-act="infoTraCuu" id="infoTraCuu">🔍 Tra cứu Sheets</button><span class="mut">Tìm theo số hợp đồng, CCCD, họ tên hoặc mã chủ rừng (Enter ở các ô trên); chọn hợp đồng để điền sẵn và tạo lô.</span></div>' : '') + '</div>' +
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
