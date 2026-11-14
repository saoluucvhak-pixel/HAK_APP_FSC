/* ========== Tra cứu Google Sheets (chỉ bản desktop) ========== */
const LK_TABS = [['', 'Tất cả'], ['HoSoKeo_QC', 'HoSoKeo (phiếu cân)'], ['HoSoRung_QC', 'HoSoRung (chủ rừng, hợp đồng)'], ['ToaDoRung_QC', 'ToaDoRung (tọa độ, giấy tờ)']];
const lk = {view: 'search', tab: '', q: '', f: {from: '', to: '', minTan: '', maxTan: '', status: '', onlyIssues: false, sort: 'relevance'}, adv: false, layout: 'flat', gsel: '', presetSel: '', dt: 'rung', det: {}, conds: [], res: null, st: null, busy: '', msg: null, cand: null, fi: 0, mode: '', owner: '', sel: null};
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
  if (r.pending) { lk.pend = {pending: r.pending, conflicts: r.conflicts || [], sheets: r.sheets, choice: Object.fromEntries(Object.entries(r.pending).map(([k, v]) => [k, v.proposed]))}; lk.msg = {kind: 'warn', text: 'Có tab cần bạn xác nhận hoặc chọn (xem bên dưới). Chưa thay đổi bản tra cứu.'}; return lkRender(); }
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
        p.candidates.map(c => '<label style="flex-direction:row;gap:8px;color:var(--ink)"><input type="radio" name="lkPend_' + esc(role) + '" data-act="lkPendPick" data-role="' + esc(role) + '" data-tab="' + esc(c) + '"' + (P.choice[role] === c ? ' checked' : '') + '> <span>Dùng tab “' + esc(c) + '” làm “' + esc(TL(role)) + '”</span></label>').join('') +
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
/* ----- Bộ lọc thông minh (HAK Smart Filter): trạng thái chuẩn, chip điều kiện, bộ lọc đã lưu ----- */
const LK_SF = {screenId: 'hakqn.tracuu', fields: [
  {key: 'tab', type: 'enum', label: 'Tab', options: LK_TABS.filter(x => x[0]).map(([value, label]) => ({value, label}))},
  {key: 'status', type: 'enum', label: 'Tình trạng hợp đồng'},
  {key: 'minTan', type: 'enum', label: 'Khối lượng từ (tấn)'},
  {key: 'maxTan', type: 'enum', label: 'Khối lượng đến (tấn)'},
  {key: 'sort', type: 'enum', label: 'Sắp xếp', options: LK_SORTS.map(([value, label]) => ({value, label}))},
  {key: 'onlyIssues', type: 'bool', label: 'Chỉ dòng cần kiểm tra'}]};
const lkStore = {getItem: k => { try { return localStorage.getItem(k); } catch (e) { return null; } }, setItem: (k, v) => localStorage.setItem(k, v)};
const lkPresets = () => HAKCore.sf.presets(lkStore);
function lkSf() {
  const f = lk.f, one = {};
  if (lk.tab) one.tab = lk.tab; if (f.status) one.status = f.status; if (f.minTan !== '') one.minTan = f.minTan; if (f.maxTan !== '') one.maxTan = f.maxTan; if (f.sort && f.sort !== 'relevance') one.sort = f.sort;
  return HAKCore.sf.normalize({q: lk.q, tu: f.from, den: f.to, one, flag: {onlyIssues: f.onlyIssues}}, LK_SF);
}
function lkFromSf(st) {
  lk.q = st.q; lk.tab = st.one.tab || '';
  lk.f = {from: st.tu || '', to: st.den || '', minTan: st.one.minTan || '', maxTan: st.one.maxTan || '', status: st.one.status || '', onlyIssues: !!st.flag.onlyIssues, sort: st.one.sort || 'relevance'};
}
function lkBarHtml() {
  const core = HAKCore.sf, st = lkSf(), conds = core.conditions(LK_SF, st), names = lkPresets().list(LK_SF.screenId);
  lk.conds = conds;
  return '<div class="row" style="margin:6px 0;justify-content:space-between"><div class="row"><b>Hiển thị:</b>' +
    [['flat', 'Bảng phẳng'], ['tree', 'Cha–con (hợp đồng → rừng → phiếu cân)']].map(([k, l]) => '<button class="btn sm ' + (lk.layout === k ? '' : 'ghost') + '" data-lklayout="' + k + '">' + l + '</button>').join('') + '</div>' +
    '<div class="row"><select id="lkPreset" aria-label="Bộ lọc đã lưu"><option value="">Bộ lọc đã lưu…</option>' + names.map(n => '<option' + (n === lk.presetSel ? ' selected' : '') + '>' + esc(n) + '</option>').join('') + '</select>' +
    '<input id="lkPresetName" size="14" placeholder="Tên bộ lọc mới"><button class="btn ghost sm" data-act="lkPresetSave">Lưu bộ lọc</button><button class="btn ghost sm" data-act="lkPresetDel">Xóa bộ lọc đã chọn</button></div></div>' +
    (conds.length ? '<div class="row" style="margin:4px 0">' + conds.map((c, i) => '<span class="pill">' + esc(c.text) + ' <button class="chipx" data-lkrm="' + i + '" aria-label="Bỏ điều kiện: ' + esc(c.text) + '">×</button></span>').join('') +
      '<button class="btn ghost sm" data-act="lkClearAll">Xóa hết</button></div>' : '') +
    '<p class="mut" style="margin:2px 0" id="lkScope">Phạm vi lọc: ' + esc(core.scopeText(LK_SF, st)) + '</p>';
}
async function lkLoadDetail() {
  const g = ((lk.res || {}).groups || []).find(x => x.key === lk.gsel); if (!g || !g.cccd || !g.hd || lk.det[g.key]) return;
  lk.det[g.key] = await HB.lookup.build(g.cccd, g.hd);
}
function lkTreeDetailHtml(g) {
  if (!g) return '<p class="mut" style="padding:14px">Chưa có dòng nào. Hãy đổi từ khóa hoặc bộ lọc.</p>';
  const d = lk.det[g.key], pickBtn = g.pick ? '<button class="btn" data-lkpick="' + esc(g.pick.tab) + '|' + g.pick.row + '">Chọn để ghi vào hồ sơ →</button>' : '';
  if (!d || !d.ok) return '<div style="padding:14px"><h3 style="margin:0">' + esc(g.ten || '(không rõ chủ rừng)') + '</h3><p class="mut">' + (g.cccd && g.hd ? esc((d && d.error) || 'Đang tải chi tiết…') : 'Dòng này thiếu CCCD hoặc mã hợp đồng nên không ghép được các hồ sơ liên quan.') + '</p>' + (g.cccd && g.hd ? '' : pickBtn) + '</div>';
  const F = d.forests || [], P = F.flatMap(f => f.phieu.map(p => ({...p, rung: f.maRung}))), tan = Math.round(P.reduce((a, p) => a + (p.kl || 0), 0) * 1000) / 1000;
  const ha = F.reduce((a, f) => a + ((f.area && f.area[0] && f.area[0].value) || 0), 0), own = Object.fromEntries((d.owner.fields || []).map(x => [x.key, x.value]));
  const warns = [...(d.warns || []), ...F.flatMap(f => (f.warns || []).map(w => (f.maRung ? f.maRung + ': ' : '') + w))];
  const dt = lk.dt, tabs = [['rung', 'Rừng (' + F.length + ')'], ['phieu', 'Phiếu cân (' + P.length + ')'], ['khac', 'Hợp đồng khác (' + (d.others || []).length + ')'], ['cb', 'Cảnh báo (' + warns.length + ')']];
  let body = '';
  if (dt === 'rung') body = '<div class="wrap"><table><tr><th>Mã rừng</th><th>Địa điểm</th><th style="text-align:right">Diện tích</th><th>Điểm GPS</th><th>Giấy tờ</th></tr>' + F.map(f => '<tr><td>' + esc(f.maRung || '(chưa có mã)') + '</td><td>' + esc(((f.fields || []).find(x => x.key === 'diaDiem') || {}).value || '') + '</td><td style="text-align:right">' +
    (f.areaConflict ? '<span class="pill err" title="hai nguồn khác nhau">' + f.area.map(a => esc(a.label)).join(' / ') + '</span>' : esc(f.area[0] ? f.area[0].label : '')) + '</td><td>' + f.gps.filter(x => x.ok).length + '/' + f.gps.length + ' dùng được</td><td>' + f.docs.length + '</td></tr>').join('') + '</table></div>';
  else if (dt === 'phieu') body = '<div class="wrap"><table><tr><th>Số phiếu</th><th>Ngày</th><th>Biển số</th><th>Rừng</th><th style="text-align:right">Tấn</th><th>Kiểm tra</th></tr>' + P.map(p => '<tr><td>' + esc(p.soPhieu) + '</td><td>' + esc(p.ngay) + '</td><td>' + esc(p.bienRaw) + '</td><td>' + esc(p.rung) + '</td><td style="text-align:right">' + numTxt(p.kl) + '</td><td>' +
    (p.issue ? '<span class="pill err">' + esc(p.issue) + '</span>' : p.isPlate ? '' : '<span class="pill err">Biển số là tên xe</span>') + '</td></tr>').join('') + '<tr><td colspan="4"><b>Cộng</b></td><td style="text-align:right"><b>' + numTxt(tan) + '</b></td><td></td></tr></table></div>';
  else if (dt === 'khac') body = (d.others || []).length ? '<div class="wrap"><table><tr><th>Hợp đồng</th><th>Địa chỉ rừng</th><th style="text-align:right">Ha</th><th>Tình trạng</th><th></th></tr>' + d.others.map(o => '<tr><td>' + esc(o.hd) + '</td><td>' + esc(o.diaChi) + '</td><td style="text-align:right">' + numTxt(o.hecta) + '</td><td>' + esc(o.tinhTrang) + '</td><td><button class="btn ghost sm" data-lkhd="' + esc(o.hd) + '">Xem</button></td></tr>').join('') + '</table></div>' : '<p class="mut">Chủ rừng này không có hợp đồng khác trong bản tra cứu.</p>';
  else body = warns.length ? '<ul class="issues">' + warns.map(w => '<li>' + esc(w) + '</li>').join('') + '</ul>' : '<p class="mut">Không có cảnh báo.</p>';
  return '<div style="padding:12px 14px"><div class="row" style="justify-content:space-between;align-items:flex-start"><div><h3 style="margin:0">' + esc(own.ten || g.ten) + '</h3><div class="mut">CCCD ' + esc(own.cccd || g.cccd) + ' · Hợp đồng ' + esc(g.hd) + (g.tinhTrang ? ' · ' + esc(g.tinhTrang) : '') + '</div></div>' + pickBtn + '</div>' +
    '<div class="kpi" style="margin:10px 0"><div><b>' + F.length + '</b>Rừng</div><div><b>' + P.length + '</b>Phiếu cân</div><div><b>' + numTxt(tan) + '</b>Tổng tấn</div><div><b>' + numTxt(Math.round(ha * 100) / 100) + '</b>Diện tích (ha)</div></div>' +
    '<div class="hak-detail-tabs">' + tabs.map(([k, l]) => '<button class="btn sm ' + (dt === k ? '' : 'ghost') + '" data-lkdt="' + k + '">' + l + '</button>').join('') + '</div><div style="margin-top:8px">' + body + '</div></div>';
}
function lkTreeHtml(r) {
  const G = r.groups || [], sel = G.find(g => g.key === lk.gsel);
  return '<p class="mut" style="margin:2px 0 6px">Cột bên trái đếm các dòng khớp từ khóa và bộ lọc; khung bên phải hiện toàn bộ hợp đồng đó (mọi rừng, mọi phiếu cân).</p><div class="hak-ui" style="background:none"><div class="hak-master-detail"><section class="hak-panel hak-table-region" style="max-height:52vh"><table><tr><th>Chủ rừng</th><th>CCCD</th><th>Hợp đồng</th><th>Tình trạng</th><th style="text-align:right">Rừng</th><th style="text-align:right">Phiếu</th><th style="text-align:right">Tấn</th><th>Kiểm tra</th></tr>' +
    G.map(g => '<tr class="lkg' + (g.key === lk.gsel ? ' on' : '') + '" data-lkgrp="' + esc(g.key) + '" tabindex="0"><td>' + esc(g.ten) + '</td><td>' + esc(g.cccd) + '</td><td>' + esc(g.hd) + '</td><td>' + esc(g.tinhTrang) + '</td><td style="text-align:right">' + g.rungs.length + '</td><td style="text-align:right">' + g.phieu + '</td><td style="text-align:right">' + numTxt(g.tan) + '</td><td>' +
      (g.flags ? '<span class="pill err">' + g.flags + ' dòng</span>' : '') + '</td></tr>').join('') + '</table></section><section class="hak-panel" id="lkDetail">' + lkTreeDetailHtml(sel) + '</section></div>';
}
const lkAdvCount = () => ['from', 'to', 'minTan', 'maxTan', 'status'].filter(k => lk.f[k]).length + (lk.f.onlyIssues ? 1 : 0);
function lkReadFilters() {
  const g = id => { const el = document.getElementById(id); return el ? el.value : null; };
  const f = lk.f, v = {from: g('lkFrom'), to: g('lkTo'), minTan: g('lkMin'), maxTan: g('lkMax'), status: g('lkStatus'), sort: g('lkSort')};
  Object.keys(v).forEach(k => { if (v[k] !== null) f[k] = v[k]; });
  const c = document.getElementById('lkIssues'); if (c) f.onlyIssues = c.checked;
}
function lkSearchHtml() {
  const r = lk.res || {rows: [], total: 0}, fc = r.facets || {tab: {}, status: {}, issues: 0}, st = r.stats || {};
  const cell = x => {
    if (x.tab === 'HoSoKeo_QC') return 'Phiếu <b>' + esc(x.phieu) + '</b> · ' + esc(x.ngay) + ' · ' + esc(x.bien) + ' · ' + numTxt(x.tan) + ' tấn';
    if (x.tab === 'HoSoRung_QC') return 'Diện tích ' + numTxt(x.hecta) + ' ha' + (x.tinhTrang ? ' · ' + esc(x.tinhTrang) : '');
    return 'Điểm GPS ' + esc(x.gps);
  };
  const cnt = k => k === '' ? Object.values(fc.tab || {}).reduce((a, b) => a + b, 0) : (fc.tab || {})[k] || 0;
  const statuses = Object.entries(fc.status || {}).sort((a, b) => b[1] - a[1]);
  const n = lkAdvCount();
  const tabs = '<div class="tabs" style="margin-top:0">' + LK_TABS.map(([k, l]) => '<button class="' + (lk.tab === k ? 'on' : '') + '" data-lktab="' + k + '">' + l + ' <span class="pill">' + fmt(cnt(k)) + '</span></button>').join('') + '</div>';
  const adv = '<details id="lkAdv" ' + (lk.adv || n ? 'open' : '') + ' style="margin:6px 0"><summary class="mut">Bộ lọc nâng cao' + (n ? ' (đang dùng ' + n + ')' : '') + ' · sắp xếp</summary>' +
    '<div class="row" style="margin-top:6px;align-items:flex-end;flex-wrap:wrap">' +
    '<label>Ngày cân từ<br><input type="date" id="lkFrom" value="' + esc(lk.f.from) + '"></label>' +
    '<label>đến<br><input type="date" id="lkTo" value="' + esc(lk.f.to) + '"></label>' +
    '<label>Khối lượng từ (tấn)<br><input id="lkMin" size="6" inputmode="decimal" value="' + esc(lk.f.minTan) + '"></label>' +
    '<label>đến (tấn)<br><input id="lkMax" size="6" inputmode="decimal" value="' + esc(lk.f.maxTan) + '"></label>' +
    '<label>Tình trạng hợp đồng<br><select id="lkStatus"><option value="">Tất cả</option>' + (lk.f.status && !statuses.some(([k]) => k === lk.f.status) ? '<option selected>' + esc(lk.f.status) + '</option>' : '') + statuses.map(([k, c]) => '<option value="' + esc(k) + '"' + (lk.f.status === k ? ' selected' : '') + '>' + esc(k) + ' (' + c + ')</option>').join('') + '</select></label>' +
    '<label>Sắp xếp<br><select id="lkSort">' + LK_SORTS.map(([k, l]) => '<option value="' + k + '"' + (lk.f.sort === k ? ' selected' : '') + '>' + l + '</option>').join('') + '</select></label>' +
    '<label style="display:flex;gap:4px;align-items:center"><input type="checkbox" id="lkIssues"' + (lk.f.onlyIssues ? ' checked' : '') + '> Chỉ dòng cần kiểm tra' + (fc.issues ? ' <span class="pill err">' + fmt(fc.issues) + '</span>' : '') + '</label>' +
    '<button class="btn sm" data-act="lkFind">Áp dụng</button><button class="btn ghost sm" data-act="lkClear">Xóa bộ lọc</button></div>' +
    '<p class="mut" style="margin:4px 0 0">Khoảng ngày và khối lượng chỉ áp dụng cho phiếu cân (HoSoKeo).</p></details>';
  const relax = r.total === 0 && r.relax && r.relax.length ? '<div class="msg warn">Không có kết quả. Thử: ' + r.relax.map((x, i) => x.clearFilters ? '<button class="btn ghost sm" data-act="lkClear">bỏ bộ lọc (' + fmt(x.total) + ' dòng)</button>' : '<button class="btn ghost sm" data-lkrelax="' + i + '">bỏ “' + esc(x.drop) + '” (' + fmt(x.total) + ' dòng)</button>').join(' ') + '</div>' : '';
  const sum = lk.layout === 'tree' ? fmt(r.groupTotal || 0) + ' hợp đồng / chủ rừng (từ ' + fmt(r.total) + ' dòng). Bấm một dòng để xem rừng và phiếu cân ở khung bên phải.' : r.total > r.rows.length ? 'Hiển thị ' + fmt(r.rows.length) + ' / ' + fmt(r.total) + ' dòng — gõ thêm từ khóa hoặc dùng bộ lọc để thu hẹp.' : fmt(r.total) + ' dòng.';
  const tot = st.phieu ? ' · <b>' + fmt(st.phieu) + '</b> phiếu cân, tổng <b>' + numTxt(st.tan) + '</b> tấn' : '';
  return tabs +
    '<div class="row"><input id="lkQ" style="flex:1" placeholder="Mã rừng, tên chủ rừng (có dấu hoặc không), CCCD, mã/số hợp đồng, địa chỉ rừng, số phiếu cân, biển số" value="' + esc(lk.q) + '"><button class="btn" data-act="lkFind">Tìm</button></div>' +
    '<p class="mut" style="margin:4px 0">' + esc(LK_HINT) + '</p>' + lkBarHtml() + adv +
    (statuses.length && lk.tab !== 'HoSoKeo_QC' && lk.tab !== 'ToaDoRung_QC' ? '<div class="row" style="margin:4px 0">' + statuses.map(([k, c]) => '<button class="btn ' + (lk.f.status === k ? '' : 'ghost') + ' sm" data-lkstatus="' + esc(k) + '">' + esc(k) + ' · ' + c + '</button>').join('') + '</div>' : '') +
    (r.warns || []).map(w => '<div class="msg warn">' + esc(w) + '</div>').join('') + relax + '<p class="mut">' + sum + tot + '</p>' +
    (lk.layout === 'tree' ? lkTreeHtml(r) : '<div class="wrap" style="max-height:48vh"><table><tr><th>Tab</th><th>Dòng</th><th>Chủ rừng</th><th>CCCD</th><th>Hợp đồng</th><th>Mã rừng</th><th>Địa chỉ rừng</th><th>Chi tiết</th><th>Kiểm tra</th><th></th></tr>' +
    r.rows.map(x => '<tr><td>' + esc(TL(x.tab)) + '</td><td>' + x.row + '</td><td>' + esc(x.ten) + '</td><td>' + esc(x.cccd) + '</td><td>' + esc(x.hd) + '</td><td>' + esc(x.maRung) + '</td><td>' + esc(x.diaChi) + '</td><td>' + cell(x) + '</td>' +
      '<td>' + (x.flags || []).map(f => '<span class="pill err" style="margin:1px">' + esc(f) + '</span>').join('') + '</td>' +
      '<td><button class="btn sm" data-lkpick="' + esc(x.tab) + '|' + x.row + '">Chọn</button></td></tr>').join('') + '</table></div>');
}

/* ----- Bước 2: chọn kết quả và nơi ghi ----- */
async function lkPick(tab, row) {
  const c = await HB.lookup.candidates(tab, +row);
  if (!c.ok) { lk.msg = {kind: 'err', text: c.error}; return lkRender(); }
  lkSetCand(c);
}
async function lkContract(hd) {
  const c = await HB.lookup.build(lk.cand.cccd, hd);
  if (!c.ok) { lk.msg = {kind: 'err', text: c.error}; return lkRender(); }
  lkSetCand(c);
}
function lkSetCand(c) {
  lk.cand = c; lk.fi = 0; lk.view = 'cand'; lk.msg = null;
  const same = Object.values(db.rs).filter(o => o.info.cccd && o.info.cccd === c.cccd);
  lk.owner = same.length ? same[0].id : 'new';   // không trùng CCCD thì mặc định tạo chủ rừng mới, tránh ghi nhầm chủ
  lkRender();
}
const findForestByMa = ma => { const h = HAKLoRung.lotsByMa(db, ma)[0]; return h ? {o: db.rs[h.owner], f: db.rs[h.owner].forests[h.forest]} : null; };

function lkCandHtml() {
  const c = lk.cand, own = Object.fromEntries(c.owner.fields.map(x => [x.key, x.value])), F = c.forests[lk.fi];
  const openF = curForest(), openO = curOwner(), dupMa = F.maRung ? findForestByMa(F.maRung) : null;
  const owners = Object.values(db.rs).sort((a, b) => (b.info.cccd === c.cccd) - (a.info.cccd === c.cccd) || String(a.info.ten).localeCompare(b.info.ten, 'vi'));
  return '<button class="btn ghost sm" data-act="lkBack">← Kết quả tìm</button>' +
    '<h3>Chủ rừng: ' + esc(own.ten || '') + ' · CCCD ' + esc(c.cccd) + ' · Hợp đồng ' + esc(c.hd) + '</h3>' +
    c.warns.map(w => '<div class="msg warn">' + esc(w) + '</div>').join('') +
    (c.others.length ? '<p>Chủ rừng này còn hợp đồng khác: ' + c.others.map(o => '<button class="btn ghost sm" data-lkhd="' + esc(o.hd) + '">HĐ ' + esc(o.hd) + ' · ' + esc(o.diaChi) + ' · ' + numTxt(o.hecta) + ' ha' + (o.tinhTrang ? ' · ' + esc(o.tinhTrang) : '') + '</button>').join(' ') + '</p>' : '') +
    '<p><b>Chọn rừng (' + c.forests.length + '):</b></p>' +
    c.forests.map((f, i) => '<label style="flex-direction:row;gap:8px;color:var(--ink)"><input type="radio" name="lkF" value="' + i + '"' + (i === lk.fi ? ' checked' : '') + '> <span><b>' + esc(f.maRung || '(không có dòng trong ToaDoRung_QC)') + '</b> · ' +
      esc((f.fields.find(x => x.key === 'diaDiem') || {}).value || '') + ' · ' + f.gps.length + ' điểm GPS · ' + f.phieu.length + ' phiếu cân</span></label>').join('') +
    F.warns.map(w => '<div class="msg warn">' + esc(w) + '</div>').join('') +
    '<div class="card" style="margin-top:10px"><h3 style="margin-top:0">Ghi vào đâu?</h3>' +
    '<div class="row" style="align-items:flex-start;gap:20px">' +
    '<div style="flex:1;min-width:260px"><b>Điền vào rừng đang mở</b><br>' + (openF ? esc(openO.info.ten) + ' · ' + esc(openF.info.maRung) + ' (' + esc(openF.info.tenRung || '') + ')' +
      (dupMa && dupMa.f.id !== openF.id ? '<div class="msg warn">Mã rừng ' + esc(F.maRung) + ' đang thuộc rừng khác (' + esc(dupMa.o.info.ten) + ' · ' + esc(dupMa.f.info.tenRung || '') + ').</div>' : '') +
      '<br><button class="btn" style="margin-top:6px" data-act="lkModeFill">Điền vào rừng đang mở</button>' : '<span class="mut">Chưa mở rừng nào.</span>') +
      (dupMa && (!openF || dupMa.f.id !== openF.id) ? '<br><button class="btn ghost sm" style="margin-top:6px" data-act="lkOpenDup">Mở rừng ' + esc(F.maRung) + ' đã có để điền</button>' : '') + '</div>' +
    '<div style="flex:1;min-width:260px"><b>Tạo rừng mới từ kết quả</b><br><label><span>Chủ rừng</span><select id="lkOwner">' +
      '<option value="new"' + (lk.owner === 'new' ? ' selected' : '') + '>+ Tạo chủ rừng mới từ kết quả</option>' +
      owners.map(o => '<option value="' + o.id + '"' + (lk.owner === o.id ? ' selected' : '') + '>' + esc(o.info.ten || '(chưa đặt tên)') + ' · ' + esc(o.info.cccd || '') + (o.info.cccd === c.cccd ? ' (trùng CCCD)' : '') + '</option>').join('') + '</select></label>' +
      (dupMa ? '<div class="msg err">Không tạo mới được: mã rừng ' + esc(F.maRung) + ' đã có. Hãy mở rừng đó để điền.</div>' : '<button class="btn" style="margin-top:6px" data-act="lkModeNew">Xem trước để tạo rừng mới</button>') + '</div></div></div>';
}

/* ----- Bước 3: xem trước ----- */
function lkTarget() {
  if (lk.mode === 'fill') {   // lô đích là lô đã chọn lúc bấm “Điền vào rừng này”, không đổi theo lô đang mở
    const t = lk.tgt || {o: cur, f: curF, epoch: dbEpoch}, o = db.rs[t.o], f = o && o.forests && o.forests[t.f], st = f ? stages[stKeyOf(t.o, t.f)] : null;
    if (!f || t.epoch !== dbEpoch) return {o: null, f: null, gone: true, oi: {}, fi: {}, pc: [], dx: [], giay: []};
    return {o, f, oi: o.info, fi: f.info, pc: st ? st.cur.pc : (f.pc || []), dx: st ? st.cur.dx : (f.dx || []), giay: f.info.giayTo || []};
  }
  const o = lk.owner !== 'new' ? db.rs[lk.owner] : null;
  return {o, f: null, oi: o ? o.info : {}, fi: {}, pc: [], dx: [], giay: []};
}
const same = (a, b) => (a == null || a === '' ? '' : String(a)).trim() === (b == null || b === '' ? '' : String(b)).trim();
const isEmpty = v => v == null || v === '';
function lkInitSel() {
  const c = lk.cand, F = c.forests[lk.fi], T = lkTarget(), s = {owner: {}, forest: {}, area: null, gps: null, docs: {}, phieu: {}, kl: false, ref: true, plateOnly: true};
  const def = (cur, val) => isEmpty(cur) ? 'new' : same(cur, val) ? 'same' : null;
  c.owner.fields.forEach(x => { s.owner[x.key] = def(T.oi[x.key], x.value); });
  F.fields.forEach(x => { s.forest[x.key] = def(T.fi[x.key], x.value); });
  if (F.area.length) {
    const vals = F.area.map(a => a.value);
    if (!isEmpty(T.fi.dienTich) && vals.some(v => Math.abs(v - T.fi.dienTich) < 1e-6)) s.area = 'keep';
    else if (!F.areaConflict && isEmpty(T.fi.dienTich)) s.area = 0;
  }
  const okPts = F.gps.map((g, i) => g.ok ? i : -1).filter(i => i >= 0);
  if (!isEmpty(T.fi.lat) && F.gps.some(g => g.ok && Math.abs(g.lat - T.fi.lat) < 1e-7 && Math.abs(g.lng - T.fi.lng) < 1e-7)) s.gps = 'keep';
  else if (okPts.length === 1 && isEmpty(T.fi.lat)) s.gps = okPts[0];
  F.docs.forEach((d, i) => { s.docs[i] = !T.giay.some(g => g.loai === d.loai && (same(g.so, d.so) || !d.so)); });
  lk.sel = s; lk.pcFilter = ''; lkPhieuDefaults();
}
function lkAliasOf(raw) { return ((db.bienAlias || {})[foldVi(raw)]) || (lk.alias || {})[foldVi(raw)] || ''; }
/* Đổi biển số hàng loạt ngay lúc tra cứu: chọn nhóm phiếu (đang tích, hoặc cùng một biển trên bảng) rồi gõ biển mới một lần; vẫn chỉ vào bản nháp */
function lkBulkHtml(P, chosen) {
  const groups = {}; P.filter(p => p.st !== 'issue').forEach(p => { const k = p.bien || ('(tên xe) ' + p.bienRaw); groups[k] = (groups[k] || 0) + 1; });
  return '<div class="card" id="lkBulk"><b>Đổi biển số hàng loạt</b><div class="mut">Chọn nhóm phiếu, gõ biển đúng một lần, bấm Áp dụng. Biển mới hiện ở cột Biển số của từng dòng; vẫn có thể sửa riêng từng dòng. Chỉ đổi trong lần tra cứu này, chưa ghi vào hồ sơ.</div>' +
    '<div class="row" style="gap:6px;flex-wrap:wrap;margin-top:6px"><select id="lkBulkSrc"><option value="*">Các phiếu đang tích (' + chosen.length + ')</option><option value="#F"' + (lk.pcFilter ? ' selected' : '') + '>Các phiếu đang lọc (' + lkPcFiltered(P).filter(p => p.st !== 'issue').length + ')</option>' + Object.entries(groups).map(([k, n]) => '<option value="' + esc(k) + '">Mọi phiếu đang ghi ' + esc(k) + ' (' + n + ')</option>').join('') + '</select>' +
    ' → <input id="lkBulkNew" list="lkPlates2" size="12" placeholder="Biển số mới" aria-label="Biển số mới"> <button class="btn sm" data-act="lkBulk">Áp dụng</button> <button class="btn ghost sm" data-act="lkBulkUndo">Trả lại biển gốc cho nhóm này</button></div></div>';
}
/* Lọc bảng phiếu cân để tích: nhiều từ khóa cách nhau bằng dấu phẩy (OR); khớp số phiếu, ngày, biển số (bỏ dấu chấm, gạch), tên xe, khách hàng */
function lkPcFiltered(P) {   // khớp cả biển gốc (không chỉ biển vừa đổi) để dòng không biến mất khi vừa đổi biển
  const terms = String(lk.pcFilter || '').split(/[,;\n]+/).map(t => t.trim()).filter(Boolean);
  if (!terms.length) return P;
  return P.filter(p => { const text = foldVi([p.soPhieu, p.ngay, p.bien, p.bienGoc, p.bienRaw, p.khachHang, p.note].join(' ')), plates = [p.bien, p.bienGoc, p.bienRaw, p.exBien].map(bienKey).join(' '); return terms.some(t => text.includes(foldVi(t)) || (bienKey(t).length >= 3 && plates.includes(bienKey(t)))); });
}
function lkFilterHtml(P, Pf) {
  return '<div class="card" id="lkFilter"><b>Lọc phiếu để tích</b><div class="mut">Gõ một hoặc nhiều biển số, số phiếu, ngày hoặc tên khách (cách nhau dấu phẩy), bấm Enter hoặc Lọc. Phiếu bị ẩn vẫn giữ trạng thái tích.</div>' +
    '<div class="row" style="gap:6px;flex-wrap:wrap;margin-top:6px"><input id="lkPcFilter" size="40" value="' + esc(lk.pcFilter || '') + '" placeholder="vd: 92C-12345, 92C-67890" aria-label="Lọc phiếu cân"> <button class="btn sm" data-act="lkPcFilter">Lọc</button> <button class="btn ghost sm" data-act="lkPcFilterTick">Tích các phiếu đang lọc</button> <button class="btn ghost sm" data-act="lkPcFilterUntick">Bỏ tích các phiếu đang lọc</button> <button class="btn ghost sm" data-act="lkPcFilterClear">Xóa lọc</button> <span class="mut">Đang hiện ' + Pf.length + '/' + P.length + ' phiếu</span></div></div>';
}
function lkBulkTargets() {
  const src = ($('#lkBulkSrc') || {}).value || '*', filt = new Set(lkPcFiltered(lkPhieuRows()).map(p => p.soPhieu));
  return lkPhieuRows().filter(p => p.st !== 'issue' && (src === '*' ? lk.sel.phieu[p.soPhieu] : src === '#F' ? filt.has(p.soPhieu) : (p.bien || ('(tên xe) ' + p.bienRaw)) === src));
}
function lkPhieuRows() {
  const F = lk.cand.forests[lk.fi], T = lkTarget(), byNo = {}, keys = new Set(T.dx.map(x => bienKey(x.bienSo)));
  T.pc.forEach(p => { byNo[String(p.soPhieu).toUpperCase()] = p; });
  return F.phieu.map(p => {
    const ov = ((lk.plateOv || {})[p.soPhieu.toUpperCase()] || '').trim().toUpperCase(), bienGoc = p.isPlate ? p.bienRaw.toUpperCase() : lkAliasOf(p.bienRaw);
    const bien = ov || bienGoc;   // xe đã đổi: sửa biển số ngay trong bảng này rồi mới đưa qua rừng
    const ex = byNo[p.soPhieu.toUpperCase()];
    let st = 'new', note = '';
    if (p.issue) { st = 'issue'; note = p.issue; }
    else if (!bien) { st = 'alias'; note = 'Cần ghép tên xe “' + p.bienRaw + '” với biển số'; }
    else if (ex && ex.ngay === p.ngay && bienKey(ex.bienSo) === bienKey(bien) && Math.abs((ex.kl || 0) - p.kl) < 1e-9) { st = 'same'; note = 'Đã có trong hồ sơ — bỏ qua'; }
    else if (ex) { st = 'upd'; note = 'Đã có số phiếu này nhưng khác dữ liệu — chọn để cập nhật'; }
    const warn = [!p.assignable ? 'hợp đồng có nhiều rừng' : '', bien && !keys.has(bienKey(bien)) ? 'biển chưa có trong danh sách xe của rừng' : '', (p.giaLoi || []).length ? 'giá không đọc được, giữ giá trị đã lưu: ' + p.giaLoi.join('; ') : ''].filter(Boolean).join('; ');
    const thieuThem = !!(ex && !p.issue && ((!ex.gioCan1 && p.gioCan1) || (!ex.gioCan2 && p.gioCan2) || (ex.can1 == null && p.can1 != null) || (ex.can2 == null && p.can2 != null) || (ex.klKg == null && p.klKg != null) || (!ex.khachHang && p.khachHang) || (ex.donGia == null && p.donGia != null) || (ex.thanhTien == null && p.thanhTien != null)));
    if (st === 'same' && thieuThem) { st = 'upd'; note = 'Bổ sung giờ cân, cân lần 1, cân lần 2, khối lượng kg, khách hàng, đơn giá, thành tiền từ bảng tính'; }
    const bienDoi = !!(ex && bien && !p.issue && bienKey(ex.bienSo) !== bienKey(bien));
    if (bienDoi && st === 'upd') note = 'Biển số khác: ' + (ex.bienSo || '(chưa có)') + ' → ' + bien + (ex.ngay === p.ngay && Math.abs((ex.kl || 0) - p.kl) < 1e-9 ? ' (chỉ khác biển số)' : '');
    return {...p, bien, bienGoc, bienSua: !!ov && ov !== bienGoc, st, note, warn, ex: !!ex, exBien: ex ? ex.bienSo : '', bienDoi};
  });
}
function lkPhieuDefaults() {
  lk.sel.phieu = {};
  lkPhieuRows().forEach(p => { lk.sel.phieu[p.soPhieu] = (p.st === 'new' && p.assignable && !/danh sách xe/.test(p.warn)) || (p.st === 'upd' && p.bienDoi); });   // phiếu đã có mà bảng tính có biển khác: tích sẵn để đổi biển
}
function lkChosenPhieu() { return lkPhieuRows().filter(p => lk.sel.phieu[p.soPhieu] && (p.st === 'new' || p.st === 'upd')); }

function lkPreviewHtml() {
  const c = lk.cand, F = c.forests[lk.fi], T = lkTarget(), s = lk.sel;
  const tgt = lk.mode === 'fill' ? (T.gone ? '<b class="err">lô đích không còn tồn tại</b>' : esc(T.o.info.ten) + ' · lô ' + esc(T.fi.maRung)) : (T.o ? esc(T.o.info.ten) + ' (chủ rừng đã có)' : 'chủ rừng mới “' + esc((c.owner.fields.find(x => x.key === 'ten') || {}).value || '') + '”') + ' · rừng mới ' + esc(F.maRung || '(sinh mã tự động)');
  const choice = (grp, x, curV) => {
    const v = s[grp][x.key];
    if (v === 'same') return '<td colspan="2"><span class="pill ok">giống nhau</span></td>';
    if (isEmpty(curV)) return '<td><label style="flex-direction:row"><input type="checkbox" data-lksel="' + grp + '|' + esc(x.key) + '"' + (v === 'new' ? ' checked' : '') + '> điền</label></td><td></td>';
    return '<td><label style="flex-direction:row"><input type="radio" name="lk_' + grp + '_' + esc(x.key) + '" data-lkrad="' + grp + '|' + esc(x.key) + '|keep"' + (v === 'keep' ? ' checked' : '') + '> giữ hiện có</label></td>' +
      '<td><label style="flex-direction:row"><input type="radio" name="lk_' + grp + '_' + esc(x.key) + '" data-lkrad="' + grp + '|' + esc(x.key) + '|new"' + (v === 'new' ? ' checked' : '') + '> dùng đề xuất</label>' + (v == null ? ' <span class="pill err">cần chọn</span>' : '') + '</td>';
  };
  const rows = (grp, list, curObj) => list.map(x => '<tr><td>' + esc(x.label) + '</td><td>' + esc(curObj[x.key] ?? '') + '</td><td><b>' + numTxt(x.value) + '</b></td><td class="mut">' + srcTxt(x.src) + '</td>' + choice(grp, x, curObj[x.key]) + '</tr>').join('');
  const head = '<tr><th>Trường</th><th>Giá trị hiện có</th><th>Giá trị đề xuất</th><th>Nguồn (tab · dòng · cột)</th><th colspan="2">Chọn</th></tr>';
  const P = lkPhieuRows(), Pf = lkPcFiltered(P), chosen = lkChosenPhieu(), tan = Math.round(chosen.reduce((a, p) => a + p.kl, 0) * 1000) / 1000;
  const names = [...new Set(P.filter(p => !p.isPlate && p.bienRaw).map(p => p.bienRaw))];
  const plates = [...new Set(T.dx.map(x => x.bienSo).filter(Boolean))];
  return '<button class="btn ghost sm" data-act="lkBackCand">← Chọn lại kết quả</button>' +
    '<h3>Xem trước — ghi vào: ' + tgt + '</h3><p class="mut">Mặc định chỉ điền ô đang trống. Ô đã có dữ liệu khác phải chọn rõ giữ hay thay trước khi lưu. Bỏ chọn trường nào thì trường đó không đổi.</p>' +
    '<h3>Thông tin chủ rừng</h3><div class="wrap"><table>' + head + rows('owner', c.owner.fields, T.oi) + '</table></div>' +
    '<h3>Thông tin rừng</h3><div class="wrap"><table>' + head + rows('forest', F.fields, T.fi) +
    (F.area.length ? '<tr><td>Diện tích (ha)</td><td>' + esc(T.fi.dienTich ?? '') + '</td><td colspan="2">' + F.area.map((a, i) => '<label style="flex-direction:row;color:var(--ink)"><input type="radio" name="lkArea" data-lkarea="' + i + '"' + (s.area === i ? ' checked' : '') + '> <b>' + esc(a.label) + '</b> <span class="mut">— ' + srcTxt(a.src) + '</span></label>').join('') +
      (!isEmpty(T.fi.dienTich) ? '<label style="flex-direction:row;color:var(--ink)"><input type="radio" name="lkArea" data-lkarea="keep"' + (s.area === 'keep' ? ' checked' : '') + '> giữ giá trị hiện có</label>' : '') +
      '<label style="flex-direction:row;color:var(--ink)"><input type="radio" name="lkArea" data-lkarea="skip"' + (s.area === 'skip' ? ' checked' : '') + '> không điền</label></td><td colspan="2">' + (F.areaConflict ? '<span class="pill err">hai nguồn khác nhau</span>' : '') + (s.area == null ? ' <span class="pill err">cần chọn</span>' : '') + '</td></tr>' : '') +
    (F.gps.length ? '<tr><td>Tọa độ điểm tâm (WGS84)</td><td>' + esc(isEmpty(T.fi.lat) ? '' : T.fi.lat + ', ' + T.fi.lng) + '</td><td colspan="4">' + F.gps.map((g, i) => '<label style="flex-direction:row;color:var(--ink)"><input type="radio" name="lkGps" data-lkgps="' + i + '"' + (s.gps === i ? ' checked' : '') + (g.ok ? '' : ' disabled') + '> ' +
      (g.ok ? '<b>' + g.lat + ', ' + g.lng + '</b>' + (g.converted ? ' <span class="pill">đã quy đổi từ “' + esc(g.raw) + '”</span>' : '') : '<span style="color:var(--err)">' + esc(g.raw) + ' — không dùng được: ' + esc(g.reason) + '</span>') +
      ' <span class="mut">— ' + esc(g.id) + (g.noi ? ' · ' + esc(g.noi) : '') + ' · ToaDoRung dòng ' + g.row + '</span></label>').join('') +
      (!isEmpty(T.fi.lat) ? '<label style="flex-direction:row;color:var(--ink)"><input type="radio" name="lkGps" data-lkgps="keep"' + (s.gps === 'keep' ? ' checked' : '') + '> giữ tọa độ hiện có</label>' : '') +
      '<label style="flex-direction:row;color:var(--ink)"><input type="radio" name="lkGps" data-lkgps="skip"' + (s.gps === 'skip' || s.gps == null ? ' checked' : '') + '> không điền tọa độ</label></td></tr>' : '') +
    '</table></div>' +
    (F.docs.length ? '<h3>Giấy tờ nguồn gốc</h3><div class="wrap"><table><tr><th></th><th>Loại</th><th>Tên</th><th>Số</th><th>Ngày</th><th>Nguồn</th></tr>' + F.docs.map((d, i) => '<tr><td><input type="checkbox" data-lkdoc="' + i + '"' + (s.docs[i] ? ' checked' : '') + '></td><td>' + esc(d.loai) + '</td><td>' + esc(d.ten) + '</td><td>' + esc(d.so) + '</td><td>' + esc(d.ngayCap) + '</td><td class="mut">' + srcTxt(d.src) + (s.docs[i] ? '' : ' · đã có trong hồ sơ') + '</td></tr>').join('') + '</table></div>' : '') +
    '<h3>Phiếu cân (' + P.length + ') — đã chọn ' + chosen.length + ' phiếu, ' + formatNumber(tan, 3) + ' tấn</h3>' +
    (names.length ? '<div class="card"><b>Ghép tên xe với biển số (lưu một lần, lần sau tự dùng)</b><datalist id="lkPlates">' + plates.map(p => '<option value="' + esc(p) + '">').join('') + '</datalist>' +
      names.map(n => '<div class="row" style="margin-top:4px"><span style="min-width:180px">' + esc(n) + '</span> → <input list="lkPlates" data-lkalias="' + esc(foldVi(n)) + '" value="' + esc(lkAliasOf(n)) + '" placeholder="Biển số, vd 92C-123.45"></div>').join('') + '</div>' : '') +
    (P.some(p => p.bienDoi) ? '<div class="card" id="lkBienDoi"><b>Biển số xe khác với hồ sơ: ' + P.filter(p => p.bienDoi).length + ' phiếu cân</b><div class="mut">Các phiếu này đã có trong hồ sơ nhưng bảng tính có biển số mới; đã tích sẵn trong bảng bên dưới (đổi biển trong ô Biển số của từng dòng nếu cần, bỏ tích phiếu không đổi). Bấm “Lưu vào hồ sơ” để đưa vào bản nháp tab Vận chuyển; việc đổi được ghi lại ở Báo cáo “Phiếu cân đã cập nhật biển số xe” sau khi lưu.</div>' +
      P.filter(p => p.bienDoi).map(p => '<div style="margin:2px 0"><b>' + esc(p.soPhieu) + '</b> · ' + esc(p.ngay) + ' · ' + esc(p.exBien || '(chưa có)') + ' → <b>' + esc(p.bien) + '</b></div>').join('') +
      '<label style="flex-direction:row;color:var(--ink);margin-top:6px"><input type="checkbox" data-lkplonly' + (s.plateOnly ? ' checked' : '') + '> Chỉ đổi biển số, giữ nguyên ngày, khối lượng, nơi giao, đơn giá, thành tiền và các trường khác của phiếu đã có</label></div>' : '') +
    lkFilterHtml(P, Pf) + lkBulkHtml(P, chosen) +
    '<div class="row" style="margin:6px 0"><button class="btn ghost sm" data-act="lkPcAll">Chọn mọi phiếu ghi được</button><button class="btn ghost sm" data-act="lkPcNone">Bỏ chọn tất cả</button></div>' +
    '<datalist id="lkPlates2">' + plates.map(x => '<option value="' + esc(x) + '">').join('') + '</datalist>' + 
    '<div class="wrap" style="max-height:40vh"><table><tr><th></th><th>Số phiếu</th><th>Ngày cân</th><th>Giờ cân 1</th><th>Giờ cân 2</th><th>Biển số</th><th style="text-align:right">Cân lần 1 (kg)</th><th style="text-align:right">Cân lần 2 (kg)</th><th style="text-align:right">Khối lượng (kg)</th><th style="text-align:right">Khối lượng (tấn)</th><th>Khách hàng</th><th style="text-align:right">Đơn giá (tham chiếu)</th><th style="text-align:right">Thanh toán (tham chiếu)</th><th>Trạng thái</th><th>Nguồn</th></tr>' +
    Pf.map(p => '<tr class="' + (p.st === 'issue' || p.st === 'alias' ? 'rerr' : p.warn ? 'rwarn' : '') + '"><td><input type="checkbox" data-lkpc="' + esc(p.soPhieu) + '"' + (s.phieu[p.soPhieu] && (p.st === 'new' || p.st === 'upd') ? ' checked' : '') + (p.st === 'new' || p.st === 'upd' ? '' : ' disabled') + '></td><td>' + esc(p.soPhieu) + '</td><td>' + esc(p.ngay) + '</td><td>' + esc(p.gioCan1 || '') + '</td><td>' + esc(p.gioCan2 || '') + '</td><td>' + (p.st === 'issue' ? esc(p.bien || p.bienRaw) : '<input class="lkOv" list="lkPlates2" size="11" data-lkov="' + esc(p.soPhieu) + '" value="' + esc(p.bien || '') + '" placeholder="' + esc(p.bienRaw) + '" title="Đổi biển số xe của phiếu này trước khi đưa qua rừng" aria-label="Biển số phiếu ' + esc(p.soPhieu) + '">') + (p.bienSua ? ' <span class="pill">đã đổi từ ' + esc(p.bienGoc || p.bienRaw) + '</span>' : (p.bien && !p.isPlate ? ' <span class="mut">(từ “' + esc(p.bienRaw) + '”)</span>' : '')) + '</td><td style="text-align:right">' + numTxt(p.can1) + '</td><td style="text-align:right">' + numTxt(p.can2) + '</td><td style="text-align:right">' + numTxt(p.klKg) + '</td><td style="text-align:right">' + numTxt(p.kl) + '</td><td>' + esc(p.khachHang || '') + '</td><td style="text-align:right">' + numTxt(p.donGia) + '</td><td style="text-align:right">' + numTxt(p.thanhToan) + '</td><td>' +
      ({new: 'thêm', upd: 'cập nhật', same: 'bỏ qua', issue: 'cần kiểm tra', alias: 'cần ghép biển'}[p.st]) + (p.note ? ' — ' + esc(p.note) : '') + (p.warn ? '<br><span style="color:var(--warn)">' + esc(p.warn) + '</span>' : '') + '</td><td class="mut">HoSoKeo_QC · dòng ' + p.row + '</td></tr>').join('') + '</table></div>' +
    '<p class="mut">Đơn giá và Thanh toán chỉ để tham chiếu, chưa dùng cho tiền công, cước vận chuyển hay giá khoán.</p>' +
    '<label style="flex-direction:row;color:var(--ink)"><input type="checkbox" data-lkkl' + (s.kl ? ' checked' : '') + '> Điền tổng ' + formatNumber(tan, 3) + ' tấn của các phiếu đã chọn vào “Khối lượng khai thác thực tế” (hiện có: ' + esc(T.fi.khoiLuong ?? 'trống') + ')</label>' +
    (c.owner.ref.length + F.ref.length ? '<h3>Thông tin tham chiếu (chưa có ô tương ứng trong hồ sơ)</h3><div class="wrap"><table><tr><th>Trường</th><th>Giá trị</th><th>Nguồn</th></tr>' + c.owner.ref.concat(F.ref).map(x => '<tr><td>' + esc(x.label) + '</td><td>' + numTxt(x.value) + '</td><td class="mut">' + srcTxt(x.src) + '</td></tr>').join('') + '</table></div>' +
      '<label style="flex-direction:row;color:var(--ink)"><input type="checkbox" data-lkref' + (s.ref ? ' checked' : '') + '> Lưu phần tham chiếu này vào hồ sơ rừng để đối chiếu</label>' : '') +
    '<div class="row" style="justify-content:flex-end;margin-top:12px"><button class="btn ghost" data-act="lkBackCand">Quay lại</button><button class="btn" data-act="lkApply">Lưu vào hồ sơ</button></div>';
}

function lkRender() {
  const body = lk.view === 'search' ? lkStatusHtml() + lkSearchHtml() : lk.view === 'cand' ? lkStatusHtml() + lkCandHtml() : lkPreviewHtml();
  $('#lkBody').innerHTML = '<div class="gh"><h2>Tra cứu Google Sheets</h2><button class="btn ghost sm" data-act="lkClose">✕ Đóng</button></div>' + (lk.view === 'preview' && lk.msg ? '<div class="msg ' + lk.msg.kind + '">' + esc(lk.msg.text) + '</div>' : '') + body;
}

/* ----- Ghi vào hồ sơ: kiểm tra đủ lựa chọn, áp dụng một lần, lưu trong một giao dịch ----- */
async function lkApply() {
  const c = lk.cand, F = c.forests[lk.fi], s = lk.sel, errs = [];
  Object.entries(s.owner).forEach(([k, v]) => { if (v == null) errs.push('Chủ rừng: chọn giữ hay thay “' + c.owner.fields.find(x => x.key === k).label + '”'); });
  Object.entries(s.forest).forEach(([k, v]) => { if (v == null) errs.push('Rừng: chọn giữ hay thay “' + F.fields.find(x => x.key === k).label + '”'); });
  if (F.area.length && s.area == null) errs.push('Chọn giá trị diện tích');
  if (errs.length) { lk.msg = {kind: 'err', text: 'Chưa lưu: ' + errs.join('; ')}; return lkRender(); }
  const T = lkTarget(), at = new Date().toISOString(), set = lk.st && lk.st.active ? lk.st.active.loadedAt : '';
  if (lk.mode === 'fill' && T.gone) { lk.msg = {kind: 'err', text: 'Chưa ghi: lô đích không còn tồn tại (đã xóa hoặc dữ liệu vừa được khôi phục). Hồ sơ giữ nguyên.'}; return lkRender(); }
  const mark = (obj, key, src) => { obj.src = obj.src || {}; obj.src[key] = {...src, at, set}; };
  const snapshot = JSON.stringify(db); const lkNewStages = []; let lkRep = null;
  try {
    let o = T.o, f = T.f;
    if (lk.mode === 'new') {
      const fv = F.fields.find(x => x.key === 'maRung');
      if (fv && findForestByMa(fv.value)) throw new Error('Mã rừng ' + fv.value + ' đã có');
      if (!o) {
        const id = newId('rs');
        o = db.rs[id] = {id, info: {ma: c.cccd, danhXung: 'Ông', ten: '', ngaySinh: '', cccd: '', ngayCap: '', noiCap: '', diaChi: ''}, forests: {}};
        mark(o, 'ma', (c.owner.fields.find(x => x.key === 'cccd') || c.owner.fields[0] || {}).src || {tab: 'HoSoRung_QC', row: 0, col: 'Mã KH_CCCD'});
      }
      const fid = newId('f'), n = forestList(o).length + 1;
      f = o.forests[fid] = {id: fid, info: {maRung: '', tenRung: 'Rừng ' + n, diaDiem: '', lat: null, lng: null, dienTich: null, dinhMucTanHa: null, dinhMucNgayHa: null, cuLy: null, tuNgay: '', denNgay: '', donGia: null, giayTo: []},
        nc: [], dx: [], pc: [], exp: {}, ncFile: '', ncAt: '', dxFile: '', dxAt: ''};
      if (!fv) { let k = n, code = (o.info.ma || 'CR') + '-R' + k; while (findForestByMa(code)) code = (o.info.ma || 'CR') + '-R' + (++k); f.info.maRung = code; }
    }
    c.owner.fields.forEach(x => { if (s.owner[x.key] === 'new') { o.info[x.key] = x.value; mark(o, x.key, x.src); } });
    F.fields.forEach(x => { if (s.forest[x.key] === 'new') { f.info[x.key] = x.value; mark(f, x.key, x.src); } });
    if (typeof s.area === 'number') { f.info.dienTich = F.area[s.area].value; mark(f, 'dienTich', F.area[s.area].src); }
    if (typeof s.gps === 'number') { const g = F.gps[s.gps]; f.info.lat = g.lat; f.info.lng = g.lng; mark(f, 'latlng', {tab: 'ToaDoRung_QC', row: g.row, col: 'Latitude_Vĩ độ / Longtitude_Kinh độ' + (g.converted ? ' (đã quy đổi từ ' + g.raw + ')' : ''), gps: g.id}); }
    F.docs.forEach((d, i) => { if (s.docs[i]) { f.info.giayTo = f.info.giayTo || []; f.info.giayTo.push({loai: d.loai, ten: d.ten, so: d.so, ngayCap: d.ngayCap, coQuan: '', hanDen: '', _src: {...d.src, at, set}}); } });
    const chosen = lkChosenPhieu();
    if (chosen.length) {   // phiếu cân đi vào BẢN NHÁP của lô; chỉ thành dữ liệu của lô sau khi bấm “Lưu dữ liệu vào lô”
      const k0 = stKeyOf(o.id, f.id); if (!stages[k0]) { stages[k0] = HAKStage.create({nc: f.nc || [], dx: f.dx || [], pc: f.pc || []}); lkNewStages.push(k0); }
      const rows = chosen.map(p => Object.assign(HAKPhieuCan.chuanHoaNgay2(normPC({maRung: f.info.maRung, ngay: p.ngay, bienSo: p.bien, soPhieu: p.soPhieu, kl: p.kl, noiGiao: '', gioCan1: p.gioCan1, gioCan2: p.gioCan2, can1: p.can1, can2: p.can2, klKg: p.klKg, khachHang: p.khachHang, diaChi: p.diaChi, nguonGoc: p.nguonGoc, donGia: p.donGia, thanhTien: p.thanhTien})), {_ngay2Suy: true, _src: {tab: 'HoSoKeo_QC', row: p.row, at, set}}));
      // phiếu đã có mà bảng tính có biển khác, chọn “chỉ đổi biển số”: người dùng đã chọn đúng phiếu → coi là cùng chuyến, chỉ đổi biển số
      const isPlate = (p, i) => s.plateOnly && p.bienDoi;
      const plateRows = rows.filter((r, i) => isPlate(chosen[i], i)).map(r => ({soPhieu: r.soPhieu, bienSo: r.bienSo, _src: r._src})), restRows = rows.filter((r, i) => !isPlate(chosen[i], i));
      lkRep = HAKStage.merge(stages[k0], 'pc', restRows, {source: 'Google Sheets', plateSource: 'Google Sheets', suyNgay2: HAKPhieuCan.suyNgay2});
      if (plateRows.length) { const pr = HAKStage.merge(stages[k0], 'pc', plateRows, {source: 'Google Sheets (đổi biển số)', plateSource: 'Google Sheets', sameTrip: true}); lkRep.upd += pr.upd; lkRep.same += pr.same; lkRep.pending += pr.pending; }
    }
    if (s.kl) { f.info.khoiLuong = Math.round(chosen.reduce((a, p) => a + p.kl, 0) * 1000) / 1000; mark(f, 'khoiLuong', {tab: 'HoSoKeo_QC', row: 0, col: 'Tổng Khối lượng (Tấn) của ' + chosen.length + ' phiếu đã chọn'}); }
    if (lk.alias) { db.bienAlias = Object.assign(db.bienAlias || {}, lk.alias); }
    if (s.ref && (c.owner.ref.length || F.ref.length)) f.ref = {at, set, hd: c.hd, cccd: c.cccd, fields: c.owner.ref.concat(F.ref)};
    const r = await persistNow();
    if (!r.ok) throw new Error('lưu vào cơ sở dữ liệu thất bại: ' + r.error);
    cur = o.id; curF = f.id; tab = 'rung'; ftab = 'finfo'; view = 'owner';
    lkClose(); lk.view = 'search';
    if (chosen.length) ftab = 'dx';
    note('Đã ghi thông tin tra cứu vào ' + esc(o.info.ten) + ' · rừng ' + f.info.maRung + '.' + (chosen.length ? ' ' + chosen.length + ' phiếu cân đã đưa vào BẢN NHÁP (thêm ' + lkRep.add + ', cập nhật ' + lkRep.upd + ', giữ nguyên ' + lkRep.same + (lkRep.pending ? ', CẦN ĐỐI CHIẾU ' + lkRep.pending : '') + '): xem trước ở tab Vận chuyển rồi bấm “Lưu dữ liệu vào lô” (chưa lưu thì chưa dùng để tạo hồ sơ).' : ''), chosen.length ? 'warn' : undefined);
  } catch (e) {
    db = withDefaults(JSON.parse(snapshot));   // trả lại đúng trạng thái trước khi ghi
    if (HB) { const back = HB.loadSync(); if (back && back.ok) db = withDefaults(back.db); }
    lkNewStages.forEach(k => { if (lk.mode === 'new' || !db.rs[k.split('|')[0]]) delete stages[k]; });   // lô vừa tạo bị hoàn lại thì bản nháp của nó không còn đích
    lk.msg = {kind: 'err', text: 'Không lưu, hồ sơ giữ nguyên: ' + e.message}; lkRender();
  }
}
async function persistNow() {
  if (!HB) { persist(); return {ok: storeOk}; }
  if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
  showSave('… Đang lưu');
  const r = await HB.save(db);
  if (r && r.ok) { storeOk = true; showSave('Đã lưu vào máy lúc ' + hhmm()); } else { storeOk = false; showSave('Lỗi lưu: ' + ((r && r.error) || ''), true); }
  return r || {ok: false, error: 'không rõ'};
}

document.addEventListener('click', async e => {
  const t = e.target; if (!t.closest || !t.closest('#lkBox,[data-act=lkOpen]')) return;
  const tb = t.closest('[data-lktab]'); if (tb) { lk.tab = tb.dataset.lktab; lk.q = ($('#lkQ') || {}).value ?? lk.q; lkReadFilters(); await lkSearch(); return lkRender(); }
  const lyo = t.closest('[data-lklayout]'); if (lyo) { lkReadFilters(); lk.q = ($('#lkQ') || {}).value ?? lk.q; lk.layout = lyo.dataset.lklayout; await lkSearch(); return lkRender(); }
  const rmv = t.closest('[data-lkrm]'); if (rmv) { lkFromSf(HAKCore.sf.remove(lkSf(), lk.conds[+rmv.dataset.lkrm])); await lkSearch(); return lkRender(); }
  const grp = t.closest('[data-lkgrp]'); if (grp) { lk.gsel = grp.dataset.lkgrp; lk.dt = 'rung'; lkRender(); await lkLoadDetail(); return lkRender(); }
  const dtb = t.closest('[data-lkdt]'); if (dtb) { lk.dt = dtb.dataset.lkdt; return lkRender(); }
  const rl = t.closest('[data-lkrelax]'); if (rl) { lk.q = lk.res.relax[+rl.dataset.lkrelax].q; await lkSearch(); return lkRender(); }
  const stb = t.closest('[data-lkstatus]'); if (stb) { lkReadFilters(); lk.f.status = lk.f.status === stb.dataset.lkstatus ? '' : stb.dataset.lkstatus; await lkSearch(); return lkRender(); }
  const pk = t.closest('[data-lkpick]'); if (pk) { const [tabN, row] = pk.dataset.lkpick.split('|'); return lkPick(tabN, row); }
  const hd = t.closest('[data-lkhd]'); if (hd) return lkContract(hd.dataset.lkhd);
  const el = t.closest('[data-act]'); if (!el) return;
  const a = el.dataset.act;
  if (a === 'lkOpen') return lkOpen();
  if (a === 'lkClose') return lkClose();
  if (a === 'lkPresetSave') { lkReadFilters(); lk.q = ($('#lkQ') || {}).value ?? lk.q; const nm = ($('#lkPresetName') || {}).value || ''; let r = lkPresets().save(LK_SF.screenId, nm, lkSf());
    if (!r.ok && r.corrupt && confirm('Kho bộ lọc đã lưu trên máy bị lỗi hoặc thuộc phiên bản khác nên chưa ghi đè.\n\nSao lưu nguyên văn bản cũ (không mất dữ liệu) rồi tạo kho mới để lưu bộ lọc này?')) { const d = lkPresets().discardCorrupt(); r = d.ok ? lkPresets().save(LK_SF.screenId, nm, lkSf()) : d; }
    lk.msg = r.ok ? {kind: 'ok', text: 'Đã lưu bộ lọc “' + nm.trim() + '”.'} : {kind: 'err', text: r.msg}; return lkRender(); }
  if (a === 'lkPresetDel') { const nm = lk.presetSel || ($('#lkPreset') || {}).value || ''; if (nm && lkPresets().remove(LK_SF.screenId, nm)) { lk.presetSel = ''; lk.msg = {kind: 'ok', text: 'Đã xóa bộ lọc “' + nm + '”.'}; } else lk.msg = {kind: 'err', text: 'Chọn một bộ lọc đã lưu để xóa.'}; return lkRender(); }
  if (a === 'lkGLogin') { lk.busy = 'Đang chờ đăng nhập Google trong trình duyệt…'; lk.msg = null; lkRender(); const r = await HB.google.login(); lk.busy = ''; lk.g = r.status; lk.msg = r.ok ? {kind: 'ok', text: 'Đã đăng nhập Google (quyền chỉ đọc). Bấm “Đồng bộ ngay” để tải bảng tính.'} : {kind: 'err', text: r.error}; return lkRender(); }
  if (a === 'lkGLogout') { const r = await HB.google.logout(); lk.g = r.status; lk.msg = {kind: 'ok', text: 'Đã đăng xuất Google.'}; return lkRender(); }
  if (a === 'lkFind') { lk.q = $('#lkQ').value; lkReadFilters(); lk.adv = !!($('#lkAdv') || {}).open; await lkSearch(); return lkRender(); }
  if (a === 'lkClearAll') { lk.q = ''; lk.tab = ''; lk.f = {from: '', to: '', minTan: '', maxTan: '', status: '', onlyIssues: false, sort: 'relevance'}; await lkSearch(); return lkRender(); }
  if (a === 'lkClear') { lk.f = {from: '', to: '', minTan: '', maxTan: '', status: '', onlyIssues: false, sort: 'relevance'}; lk.q = ($('#lkQ') || {}).value ?? lk.q; await lkSearch(); return lkRender(); }
  if (a === 'lkTemplate') { const r = await HB.lookup.template(); if (!r.ok) { lk.msg = {kind: 'err', text: 'Không tạo được file mẫu: ' + r.error}; return lkRender(); } download(new Blob([r.bytes], {type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}), r.file); lk.msg = {kind: 'ok', text: 'Đã tạo file mẫu ' + r.file + ' (3 tab HoSoKeo, HoSoRung, ToaDoRung và trang HUONG_DAN).'}; return lkRender(); }
  if (a === 'lkPendPick') { if (lk.pend) lk.pend.choice[el.dataset.role] = el.dataset.tab; return; }
  if (a === 'lkCancelTabs') { await HB.lookup.cancelTabs(); lk.pend = null; lk.msg = {kind: 'warn', text: 'Đã hủy, vẫn dùng bản tra cứu đã lưu.'}; return lkRender(); }
  if (a === 'lkConfirmTabs') {
    if (!lk.pend) return;
    lk.busy = 'Đang kiểm tra tab và nạp…'; lkRender();
    const r = await HB.lookup.confirmTabs(lk.pend.choice); lk.busy = '';
    lk.st = r.status || await HB.lookup.status(); lk.det = {};
    if (r.pending) { lk.pend = {pending: r.pending, conflicts: r.conflicts || [], sheets: r.sheets, choice: Object.fromEntries(Object.entries(r.pending).map(([k, v]) => [k, v.proposed]))}; lk.msg = {kind: 'err', text: 'Chưa nạp, vẫn dùng bản đã lưu. ' + (r.conflicts || []).join(' ')}; return lkRender(); }
    if (r.ok) { lk.pend = null; lk.msg = {kind: 'ok', text: 'Đã nạp và ghi nhớ tab đã chọn cho bảng tính này. ' + Object.entries(r.counts).map(([k, v]) => TL(k) + ' ' + fmt(v) + ' dòng').join(', ') + '.'}; await lkSearch(); }
    else lk.msg = {kind: 'err', text: 'Chưa nạp, vẫn dùng bản đã lưu. ' + (r.errors || []).join('; ')};
    return lkRender();
  }
  if (a === 'lkSync') return lkLoad('sync');
  if (a === 'lkExcel') return lkLoad('excel');
  if (a === 'lkToSettings') { lkClose(); cur = null; curF = null; view = 'setgs'; setgs.msg = null; setgs.st = await HB.lookup.status(); return render(); }
  if (a === 'lkBack') { lk.view = 'search'; lk.msg = null; return lkRender(); }
  if (a === 'lkBackCand') { lk.view = 'cand'; lk.msg = null; return lkRender(); }
  if (a === 'lkModeFill') { lk.mode = 'fill'; lk.tgt = {o: cur, f: curF, epoch: dbEpoch}; lk.alias = {}; lk.plateOv = {}; lkInitSel(); lk.view = 'preview'; lk.msg = null; return lkRender(); }
  if (a === 'lkModeNew') { lk.owner = $('#lkOwner').value; lk.mode = 'new'; lk.alias = {}; lk.plateOv = {}; lkInitSel(); lk.view = 'preview'; lk.msg = null; return lkRender(); }
  if (a === 'lkOpenDup') { const d = findForestByMa(lk.cand.forests[lk.fi].maRung); cur = d.o.id; curF = d.f.id; tab = 'rung'; view = 'owner'; render(); lk.mode = 'fill'; lk.tgt = {o: cur, f: curF, epoch: dbEpoch}; lk.alias = {}; lk.plateOv = {}; lkInitSel(); lk.view = 'preview'; return lkRender(); }
  if (a === 'lkPcAll') { lkPhieuRows().forEach(p => { lk.sel.phieu[p.soPhieu] = p.st === 'new' || p.st === 'upd'; }); return lkRender(); }
  if (a === 'lkPcFilter') { lk.pcFilter = (($('#lkPcFilter') || {}).value || '').trim(); return lkRender(); }
  if (a === 'lkPcFilterClear') { lk.pcFilter = ''; return lkRender(); }
  if (a === 'lkPcFilterTick' || a === 'lkPcFilterUntick') { lk.pcFilter = (($('#lkPcFilter') || {}).value || '').trim(); const on = a === 'lkPcFilterTick'; lkPcFiltered(lkPhieuRows()).forEach(p => { if (p.st === 'new' || p.st === 'upd') lk.sel.phieu[p.soPhieu] = on; }); return lkRender(); }
  if (a === 'lkBulk') {
    const nw = (($('#lkBulkNew') || {}).value || '').trim().toUpperCase(), T = lkBulkTargets();
    if (!nw) { lk.msg = {kind: 'err', text: 'Gõ biển số mới trước khi áp dụng.'}; return lkRender(); }
    if (!T.length) { lk.msg = {kind: 'warn', text: 'Nhóm đã chọn không có phiếu nào (tích phiếu trước, hoặc chọn nhóm theo biển).'}; return lkRender(); }
    lk.plateOv = lk.plateOv || {}; T.forEach(p => { lk.plateOv[p.soPhieu.toUpperCase()] = nw; }); lkPhieuDefaultsKeep();
    lk.msg = {kind: 'ok', text: 'Đã đổi biển ' + T.length + ' phiếu thành ' + nw + ' (chưa ghi vào hồ sơ). Kiểm tra cột Biển số rồi bấm “Lưu vào hồ sơ”.'}; return lkRender();
  }
  if (a === 'lkBulkUndo') { const T = lkBulkTargets(); lk.plateOv = lk.plateOv || {}; T.forEach(p => { delete lk.plateOv[p.soPhieu.toUpperCase()]; }); lkPhieuDefaultsKeep(); lk.msg = {kind: 'ok', text: 'Đã trả lại biển gốc cho ' + T.length + ' phiếu.'}; return lkRender(); }
  if (a === 'lkPcNone') { Object.keys(lk.sel.phieu).forEach(k => { lk.sel.phieu[k] = false; }); return lkRender(); }
  if (a === 'lkApply') return lkApply();
});
document.addEventListener('change', e => {
  const t = e.target; if (!t.closest || !t.closest('#lkBox')) return;
  if (t.name === 'lkF') { lk.fi = +t.value; return lkRender(); }
  if (t.id === 'lkOwner') { lk.owner = t.value; return; }
  if (t.id === 'lkPreset') { lk.presetSel = t.value; if (!t.value) return; const r = HAKCore.sf.applyPreset(LK_SF, lkPresets().get(LK_SF.screenId, t.value)); if (!r.ok) { lk.msg = {kind: 'err', text: 'Không mở được bộ lọc đã lưu.'}; return lkRender(); } lkFromSf(r.state); lk.msg = r.dropped.length ? {kind: 'warn', text: 'Bộ lọc đã mở nhưng bỏ điều kiện không dùng được ở màn hình này: ' + r.dropped.join(', ')} : null; lkSearch().then(lkRender); return; }
  const sel = t.dataset; const s = lk.sel;
  if (sel.lksel) { const [g, k] = sel.lksel.split('|'); s[g][k] = t.checked ? 'new' : 'skip'; return; }
  if (sel.lkrad) { const [g, k, v] = sel.lkrad.split('|'); s[g][k] = v; return lkRender(); }
  if (sel.lkarea != null) { s.area = /^\d+$/.test(sel.lkarea) ? +sel.lkarea : sel.lkarea; return lkRender(); }
  if (sel.lkgps != null) { s.gps = /^\d+$/.test(sel.lkgps) ? +sel.lkgps : sel.lkgps; return; }
  if (sel.lkdoc != null) { s.docs[sel.lkdoc] = t.checked; return; }
  if (sel.lkpc != null) { s.phieu[sel.lkpc] = t.checked; return lkRender(); }
  if ('lkkl' in sel) { s.kl = t.checked; return; }
  if ('lkplonly' in sel) { s.plateOnly = t.checked; return lkRender(); }
  if ('lkref' in sel) { s.ref = t.checked; return; }
  if (sel.lkov != null) { lk.plateOv = lk.plateOv || {}; const v = t.value.trim().toUpperCase(), k = sel.lkov.toUpperCase(); if (v) lk.plateOv[k] = v; else delete lk.plateOv[k]; lkPhieuDefaultsKeep(); return lkRender(); }
  if (sel.lkalias != null) { lk.alias = lk.alias || {}; const v = t.value.trim().toUpperCase(); if (v) lk.alias[sel.lkalias] = v; else delete lk.alias[sel.lkalias]; lkPhieuDefaultsKeep(); return lkRender(); }
});
function lkPhieuDefaultsKeep() { lkPhieuRows().forEach(p => { if (!(p.soPhieu in lk.sel.phieu) || (p.st === 'new' && p.assignable && !/danh sách xe/.test(p.warn) && lk.sel.phieu[p.soPhieu] === false && p.bien)) lk.sel.phieu[p.soPhieu] = p.st === 'new' && p.assignable && !/danh sách xe/.test(p.warn); }); }
document.addEventListener('keydown', async e => {
  if (e.key === 'Enter' && e.target.id === 'lkPcFilter') { e.preventDefault(); lk.pcFilter = e.target.value.trim(); lkRender(); const n = document.getElementById('lkPcFilter'); if (n) { n.focus(); try { const L = n.value.length; n.setSelectionRange(L, L); } catch (er) { /* ô không có vùng chọn */ } } return; }
  if (e.key === 'Enter' && /^lk(Q|From|To|Min|Max)$/.test(e.target.id)) {
    const id = e.target.id; lk.q = ($('#lkQ') || e.target).value; lkReadFilters(); await lkSearch(); lkRender();
    const n = document.getElementById(id); if (n) { n.focus(); try { const L = n.value.length; n.setSelectionRange(L, L); } catch (er) { /* ô ngày không có vùng chọn */ } }   // vẽ lại không làm mất tiêu điểm bàn phím
    return;
  }
  if (e.key === 'Escape' && !e.defaultPrevented) {   // Esc đóng hộp thoại trên cùng (hộp nhập/khôi phục → báo cáo → tra cứu → hướng dẫn); hộp nhập/khôi phục = Hủy, không ghi gì
    const open = id => { const b = document.getElementById(id); return b && b.classList.contains('on') ? b : null; };
    if (open('impBox')) { window.__imp = null; $('#impBox').classList.remove('on'); e.preventDefault(); return; }
    if (open('rpBox')) { rpClose(); e.preventDefault(); return; }
    if (open('lkBox')) { lkClose(); e.preventDefault(); return; }
    if (open('guideBox')) { document.getElementById('guideBox').classList.remove('on'); e.preventDefault(); return; }
    const mm = document.getElementById('moreMenu'); if (mm && mm.open) { mm.open = false; e.preventDefault(); }
  }
});
window.addEventListener('online', () => { if ($('#lkBox').classList.contains('on') && lk.view !== 'preview') lkRender(); });
window.addEventListener('offline', () => { if ($('#lkBox').classList.contains('on') && lk.view !== 'preview') lkRender(); });

