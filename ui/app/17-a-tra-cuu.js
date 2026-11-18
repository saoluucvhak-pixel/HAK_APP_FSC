/* ========== Tra cứu Google Sheets (chỉ bản desktop) ========== */
const LK_TABS = [['', 'Tất cả'], ['HoSoKeo_QC', 'HoSoKeo (phiếu cân)'], ['HoSoRung_QC', 'HoSoRung (chủ rừng, hợp đồng)'], ['ToaDoRung_QC', 'ToaDoRung (tọa độ, giấy tờ)']];
const lk = {view: 'search', tab: '', q: '', f: {from: '', to: '', minTan: '', maxTan: '', status: '', onlyIssues: false, sort: 'relevance'}, adv: false, layout: 'flat', gsel: '', presetSel: '', dt: 'rung', det: {}, conds: [], res: null, st: null, busy: '', msg: null, cand: null, fi: 0, mode: '',
owner: '', sel: null};
const foldVi = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase().trim();
/* Tên hiển thị của vai trò dữ liệu: bộ tên chuẩn HoSoKeo/HoSoRung/ToaDoRung (mã vai trò bên trong giữ hậu tố _QC để tương thích dữ liệu đã lưu) */
const TL = t => ({HoSoKeo_QC: 'HoSoKeo', HoSoRung_QC: 'HoSoRung', ToaDoRung_QC: 'ToaDoRung'}[t] || t);
const srcTxt = s => s ? esc(TL(s.tab)) + ' · dòng ' + s.row + ' · cột “' + esc(s.col) + '”' : '';
const fmtDT = iso => { if (!iso) return ''; const d = new Date(iso); return pad2(d.getHours()) + ':' + pad2(d.getMinutes()) + ' ' + pad2(d.getDate()) + '/' + pad2(d.getMonth() + 1) + '/' + d.getFullYear(); };
const numTxt = v => typeof v === 'number' ? formatNumber(v, 6) : esc(v ?? '');

async function lkOpen() {
  if (!HB) return;
  lk.view = 'search'; lk.msg = null; $('#lkBox').classList.add('on');
  lk.st = await HB.lookup.status(); lk.g = await HB.google.status().catch(() => null);
  if (lk.st.active && lk.res == null) await lkSearch();
  lkRender();
}
const lkClose = () => $('#lkBox').classList.remove('on');
async function lkSearch() {
  const r = await HB.lookup.search(lk.q, lk.tab, Object.assign({}, lk.f, lk.layout === 'tree' ? {group: 'contract'} : {}));
  lk.res = r.ok ? r : {rows: [], total: 0, facets: {tab: {}, status: {}, issues: 0}, stats: {}, relax: []}; if (!r.ok) lk.msg = {kind: 'err', text: r.error};
  if (lk.layout === 'tree') { const G = lk.res.groups || []; lk.gsel = (G.find(g => g.key === lk.gsel) || G[0] || {}).key || ''; await lkLoadDetail(); }
}
async function lkLoad(kind) {
  lk.busy = kind === 'sync' ? 'Đang đồng bộ Google Sheets…' : 'Đang đọc file Excel…'; lk.msg = null; lkRender();
  const r = kind === 'sync' ? await HB.lookup.sync() : await HB.lookup.importExcel();
  lk.busy = '';
  if (r.canceled) return lkRender();
  lk.st = r.status || await HB.lookup.status(); lk.det = {};
  if (r.pending) { lk.pend = {pending: r.pending, conflicts: r.conflicts || [], sheets: r.sheets, choice: Object.fromEntries(Object.entries(r.pending).map(([k, v]) => [k, v.proposed]))}; lk.msg = {kind: 'warn', text: 'Có tab cần bạn xác nhận hoặc chọn (xem bên dưới). Chưa thay đổi bản tra cứu.'};
  return lkRender(); }
  lk.pend = null;
  if (r.ok) { lk.msg = {kind: 'ok', text: 'Đã cập nhật bản tra cứu: ' + Object.entries(r.counts).map(([k, v]) => TL(k) + ' ' + fmt(v) + ' dòng').join(', ') + '.'}; await lkSearch(); }
  else lk.msg = {kind: 'err', text: 'Chưa cập nhật bản tra cứu, vẫn dùng bản đã lưu. ' + (r.errors || []).join('; ')};
  lkRender();
}

function lkGoogleHtml() {
  const g = lk.g; if (!g) return '';
  return '<div class="row" style="margin-top:8px"><span class="mut">Bảng tính giới hạn quyền xem:</span> ' + (g.signedIn
    ? '<span class="pill ok">Đã đăng nhập Google' + (g.email ? ': ' + esc(g.email) : '') + (g.persistent ? '' : ' (chỉ trong phiên này)') + '</span><button class="btn ghost sm" data-act="lkGLogout">Đăng xuất</button>'
    : (g.configured ? '<button class="btn ghost sm" data-act="lkGLogin"' + (lk.busy ? ' disabled' : '') + '>Đăng nhập Google (chỉ đọc)</button>' : '<span class="pill">Chưa cấu hình OAuth Google — xem docs/GOOGLE_OAUTH.md</span>')) + '</div>';
}
/* Tab khác tên chuẩn hoặc có nhiều tab phù hợp: người dùng xác nhận/chọn từng vai trò; app kiểm tra lại cấu trúc trước khi ghi nhận ánh xạ */
const LK_ROLE_DESC = {HoSoKeo_QC: 'phiếu cân và khối lượng', HoSoRung_QC: 'chủ rừng, thông tin rừng, hợp đồng', ToaDoRung_QC: 'mã rừng, tọa độ, diện tích, giấy tờ nguồn gốc'};
function lkPendHtml() {
  const P = lk.pend; if (!P) return '';
  return '<div class="card" id="lkPend" style="margin:8px 0;border-color:var(--warn,#a16207)"><b>Cần xác nhận tên tab trước khi nạp</b>' +
    (P.conflicts && P.conflicts.length ? '<div class="msg err" id="lkConflict">' + P.conflicts.map(esc).join('<br>') + '</div>' : '') +
    '<p class="mut" style="margin:4px 0">Bản tra cứu đang dùng chưa bị thay đổi. Chọn tab cho từng vai trò; phần mềm sẽ kiểm tra lại các cột bắt buộc rồi mới nạp và ghi nhớ lựa chọn cho bảng tính này. Tab trong file: ' + (P.sheets || []).map(x => '“' + esc(x) + '”').join(', ') + '.</p>' +
    Object.keys(P.pending).map(role => { const p = P.pending[role];
      return '<div style="margin:8px 0"><b>' + esc(TL(role)) + '</b> <span class="mut">(' + esc(LK_ROLE_DESC[role] || '') + ')</span><div class="mut">' + (p.kind === 'confirm' ? 'Đề xuất: ' : 'Chọn một: ') + esc(p.why || '') + '.</div>' +
        p.candidates.map(c => '<label style="flex-direction:row;gap:8px;color:var(--ink)"><input type="radio" name="lkPend_' + esc(role) + '" data-act="lkPendPick" data-role="' + esc(role) + '" data-tab="' + esc(c) + '"' + (P.choice[role] === c ? ' checked' : '') + '> <span>Dùng tab “' + esc(c) +
        '” làm “' + esc(TL(role)) + '”</span></label>').join('') +
        (p.invalid || []).map(x => '<div class="mut">Tab “' + esc(x.tab) + '” cùng tên vai trò này nhưng thiếu cột: ' + x.missing.map(m => /^một trong/.test(m) ? esc(m) : '“' + esc(m) + '”').join(', ') + '.</div>').join('') + '</div>'; }).join('') +
    '<div class="row"><button class="btn sm" data-act="lkConfirmTabs">Xác nhận và nạp</button><button class="btn ghost sm" data-act="lkCancelTabs">Hủy, giữ bản cũ</button></div></div>';
}
function lkStatusHtml() {
  const st = lk.st || {}, a = st.active, l = st.last;
  const online = navigator.onLine;
  return '<div class="card" style="margin-bottom:10px"><div class="row" style="justify-content:space-between">' +
    '<div><b>Bản tra cứu đang dùng:</b> ' + (a ? (a.source === 'google' ? 'Google Sheets' : 'File Excel “' + esc(a.detail) + '”') + ' · cập nhật thành công lúc <b>' + fmtDT(a.loadedAt) + '</b> · ' + Object.entries(a.counts).map(([k, v]) => esc(TL(k)) + ': ' + fmt(v)).join(' · ') : '<span class="pill err">chưa có — bấm Đồng bộ ngay hoặc Nhập bản Excel</span>') +
    '<br><span class="mut">Kết nối: ' + (online ? 'có mạng' : 'đang ngoại tuyến (vẫn tra cứu được bản đã lưu)') +
    (l ? ' · Lần cập nhật gần nhất (' + fmtDT(l.at) + '): ' + (l.ok ? 'thành công' + ((l.notes || []).length ? ' <span style="color:var(--warn,#a16207)">· ' + l.notes.map(esc).join('; ') + '</span>' : '') : '<span style="color:var(--err)">lỗi — ' + esc(l.error) + '</span>') : '') + '</span></div>' +
    '<div class="row"><button class="btn sm" data-act="lkSync"' + (lk.busy ? ' disabled' : '') + '>⟳ Đồng bộ ngay</button><button class="btn ghost sm" data-act="lkExcel"' + (lk.busy ? ' disabled' : '') + '>Nhập bản Excel</button><button class="btn ghost sm" data-act="lkTemplate">Tải file mẫu (3 tab chuẩn)</button></div></div>' +
    lkGoogleHtml() + '<div class="mut" style="margin-top:6px">Địa chỉ bảng tính: <code>' + esc((st.sheetUrl || 'chưa có').slice(0, 80)) + '</code> · <button type="button" class="linkbtn" data-act="lkToSettings">Đổi trong Cài đặt</button></div>' +
    lkPendHtml() + (lk.busy ? '<div class="msg warn">' + esc(lk.busy) + '</div>' : '') + (lk.msg ? '<div class="msg ' + lk.msg.kind + '">' + esc(lk.msg.text) + '</div>' : '') + '</div>';
}

const LK_SORTS = [['relevance', 'Độ khớp'], ['ngay', 'Ngày cân mới nhất'], ['tan', 'Khối lượng lớn nhất'], ['ten', 'Tên chủ rừng A→Z']];
const LK_HINT = 'Cú pháp: nhiều từ = phải có đủ · "cụm từ" · -từ loại trừ · cccd: hd: rung: phieu: bien: ten: dc: · số 12 chữ số tự nhận là CCCD, biển số tự nhận là biển số.';
