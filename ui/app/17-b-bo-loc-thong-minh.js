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
  if (!d || !d.ok) return '<div style="padding:14px"><h3 style="margin:0">' + esc(g.ten || '(không rõ chủ rừng)') + '</h3><p class="mut">' + (g.cccd && g.hd ? esc((d && d.error) || 'Đang tải chi tiết…') : 'Dòng này thiếu CCCD hoặc mã hợp đồng nên không ghép được các hồ sơ liên quan.') + '</p>' +
  (g.cccd && g.hd ? '' : pickBtn) + '</div>';
  const F = d.forests || [], P = F.flatMap(f => f.phieu.map(p => ({...p, rung: f.maRung}))), tan = Math.round(P.reduce((a, p) => a + (p.kl || 0), 0) * 1000) / 1000;
  const ha = F.reduce((a, f) => a + ((f.area && f.area[0] && f.area[0].value) || 0), 0), own = Object.fromEntries((d.owner.fields || []).map(x => [x.key, x.value]));
  const warns = [...(d.warns || []), ...F.flatMap(f => (f.warns || []).map(w => (f.maRung ? f.maRung + ': ' : '') + w))];
  const dt = lk.dt, tabs = [['rung', 'Rừng (' + F.length + ')'], ['phieu', 'Phiếu cân (' + P.length + ')'], ['khac', 'Hợp đồng khác (' + (d.others || []).length + ')'], ['cb', 'Cảnh báo (' + warns.length + ')']];
  let body = '';
  if (dt === 'rung') body = '<div class="wrap"><table><tr><th>Mã rừng</th><th>Địa điểm</th><th style="text-align:right">Diện tích</th><th>Điểm GPS</th><th>Giấy tờ</th></tr>' + F.map(f => '<tr><td>' + esc(f.maRung || '(chưa có mã)') + '</td><td>' + esc(((f.fields ||
  []).find(x => x.key === 'diaDiem') || {}).value || '') + '</td><td style="text-align:right">' +
    (f.areaConflict ? '<span class="pill err" title="hai nguồn khác nhau">' + f.area.map(a => esc(a.label)).join(' / ') + '</span>' : esc(f.area[0] ? f.area[0].label : '')) + '</td><td>' + f.gps.filter(x => x.ok).length + '/' + f.gps.length + ' dùng được</td><td>' + f.docs.length +
    '</td></tr>').join('') + '</table></div>';
  else if (dt === 'phieu') body = '<div class="wrap"><table><tr><th>Số phiếu</th><th>Ngày</th><th>Biển số</th><th>Rừng</th><th style="text-align:right">Tấn</th><th>Kiểm tra</th></tr>' + P.map(p => '<tr><td>' + esc(p.soPhieu) + '</td><td>' + esc(p.ngay) + '</td><td>' + esc(p.bienRaw) + '</td><td>' +
  esc(p.rung) + '</td><td style="text-align:right">' + numTxt(p.kl) + '</td><td>' +
    (p.issue ? '<span class="pill err">' + esc(p.issue) + '</span>' : p.isPlate ? '' : '<span class="pill err">Biển số là tên xe</span>') + '</td></tr>').join('') + '<tr><td colspan="4"><b>Cộng</b></td><td style="text-align:right"><b>' + numTxt(tan) + '</b></td><td></td></tr></table></div>';
  else if (dt === 'khac') body = (d.others || []).length ? '<div class="wrap"><table><tr><th>Hợp đồng</th><th>Địa chỉ rừng</th><th style="text-align:right">Ha</th><th>Tình trạng</th><th></th></tr>' + d.others.map(o => '<tr><td>' + esc(o.hd) + '</td><td>' + esc(o.diaChi) +
  '</td><td style="text-align:right">' + numTxt(o.hecta) + '</td><td>' + esc(o.tinhTrang) + '</td><td><button class="btn ghost sm" data-lkhd="' + esc(o.hd) + '">Xem</button></td></tr>').join('') + '</table></div>' : '<p class="mut">Chủ rừng này không có hợp đồng khác trong bản tra cứu.</p>';
  else body = warns.length ? '<ul class="issues">' + warns.map(w => '<li>' + esc(w) + '</li>').join('') + '</ul>' : '<p class="mut">Không có cảnh báo.</p>';
  return '<div style="padding:12px 14px"><div class="row" style="justify-content:space-between;align-items:flex-start"><div><h3 style="margin:0">' + esc(own.ten || g.ten) + '</h3><div class="mut">CCCD ' + esc(own.cccd || g.cccd) + ' · Hợp đồng ' + esc(g.hd) + (g.tinhTrang ? ' · ' +
  esc(g.tinhTrang) : '') + '</div></div>' + pickBtn + '</div>' +
    '<div class="kpi" style="margin:10px 0"><div><b>' + F.length + '</b>Rừng</div><div><b>' + P.length + '</b>Phiếu cân</div><div><b>' + numTxt(tan) + '</b>Tổng tấn</div><div><b>' + numTxt(Math.round(ha * 100) / 100) + '</b>Diện tích (ha)</div></div>' +
    '<div class="hak-detail-tabs">' + tabs.map(([k, l]) => '<button class="btn sm ' + (dt === k ? '' : 'ghost') + '" data-lkdt="' + k + '">' + l + '</button>').join('') + '</div><div style="margin-top:8px">' + body + '</div></div>';
}
function lkTreeHtml(r) {
  const G = r.groups || [], sel = G.find(g => g.key === lk.gsel);
  return '<p class="mut" style="margin:2px 0 6px">Cột bên trái đếm các dòng khớp từ khóa và bộ lọc; khung bên phải hiện toàn bộ hợp đồng đó (mọi rừng, mọi phiếu cân).</p><div class="hak-ui" style="background:none"><div class="hak-master-detail"><section class="hak-panel hak-table-region" style="max-height:52vh"><table><tr><th>Chủ rừng</th><th>CCCD</th><th>Hợp đồng</th><th>Tình trạng</th><th style="text-align:right">Rừng</th><th style="text-align:right">Phiếu</th><th style="text-align:right">Tấn</th><th>Kiểm tra</th></tr>' +
    G.map(g => '<tr class="lkg' + (g.key === lk.gsel ? ' on' : '') + '" data-lkgrp="' + esc(g.key) + '" tabindex="0"><td>' + esc(g.ten) + '</td><td>' + esc(g.cccd) + '</td><td>' + esc(g.hd) + '</td><td>' + esc(g.tinhTrang) + '</td><td style="text-align:right">' + g.rungs.length +
    '</td><td style="text-align:right">' + g.phieu + '</td><td style="text-align:right">' + numTxt(g.tan) + '</td><td>' +
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
    '<label>Tình trạng hợp đồng<br><select id="lkStatus"><option value="">Tất cả</option>' + (lk.f.status && !statuses.some(([k]) => k === lk.f.status) ? '<option selected>' + esc(lk.f.status) + '</option>' : '') + statuses.map(([k, c]) => '<option value="' + esc(k) + '"' + (lk.f.status === k ?
    ' selected' : '') + '>' + esc(k) + ' (' + c + ')</option>').join('') + '</select></label>' +
    '<label>Sắp xếp<br><select id="lkSort">' + LK_SORTS.map(([k, l]) => '<option value="' + k + '"' + (lk.f.sort === k ? ' selected' : '') + '>' + l + '</option>').join('') + '</select></label>' +
    '<label style="display:flex;gap:4px;align-items:center"><input type="checkbox" id="lkIssues"' + (lk.f.onlyIssues ? ' checked' : '') + '> Chỉ dòng cần kiểm tra' + (fc.issues ? ' <span class="pill err">' + fmt(fc.issues) + '</span>' : '') + '</label>' +
    '<button class="btn sm" data-act="lkFind">Áp dụng</button><button class="btn ghost sm" data-act="lkClear">Xóa bộ lọc</button></div>' +
    '<p class="mut" style="margin:4px 0 0">Khoảng ngày và khối lượng chỉ áp dụng cho phiếu cân (HoSoKeo).</p></details>';
  const relax = r.total === 0 && r.relax && r.relax.length ? '<div class="msg warn">Không có kết quả. Thử: ' + r.relax.map((x, i) => x.clearFilters ? '<button class="btn ghost sm" data-act="lkClear">bỏ bộ lọc (' + fmt(x.total) + ' dòng)</button>' : '<button class="btn ghost sm" data-lkrelax="' + i +
  '">bỏ “' + esc(x.drop) + '” (' + fmt(x.total) + ' dòng)</button>').join(' ') + '</div>' : '';
  const sum = lk.layout === 'tree' ? fmt(r.groupTotal || 0) + ' hợp đồng / chủ rừng (từ ' + fmt(r.total) + ' dòng). Bấm một dòng để xem rừng và phiếu cân ở khung bên phải.' : r.total > r.rows.length ? 'Hiển thị ' + fmt(r.rows.length) + ' / ' + fmt(r.total) +
  ' dòng — gõ thêm từ khóa hoặc dùng bộ lọc để thu hẹp.' : fmt(r.total) + ' dòng.';
  const tot = st.phieu ? ' · <b>' + fmt(st.phieu) + '</b> phiếu cân, tổng <b>' + numTxt(st.tan) + '</b> tấn' : '';
  return tabs +
    '<div class="row"><input id="lkQ" style="flex:1" placeholder="Mã rừng, tên chủ rừng (có dấu hoặc không), CCCD, mã/số hợp đồng, địa chỉ rừng, số phiếu cân, biển số" value="' + esc(lk.q) + '"><button class="btn" data-act="lkFind">Tìm</button></div>' +
    '<p class="mut" style="margin:4px 0">' + esc(LK_HINT) + '</p>' + lkBarHtml() + adv +
    (statuses.length && lk.tab !== 'HoSoKeo_QC' && lk.tab !== 'ToaDoRung_QC' ? '<div class="row" style="margin:4px 0">' + statuses.map(([k, c]) => '<button class="btn ' + (lk.f.status === k ? '' : 'ghost') + ' sm" data-lkstatus="' + esc(k) + '">' + esc(k) + ' · ' + c + '</button>').join('') +
    '</div>' : '') +
    (r.warns || []).map(w => '<div class="msg warn">' + esc(w) + '</div>').join('') + relax + '<p class="mut">' + sum + tot + '</p>' +
    (lk.layout === 'tree' ? lkTreeHtml(r) : '<div class="wrap" style="max-height:48vh"><table><tr><th>Tab</th><th>Dòng</th><th>Chủ rừng</th><th>CCCD</th><th>Hợp đồng</th><th>Mã rừng</th><th>Địa chỉ rừng</th><th>Chi tiết</th><th>Kiểm tra</th><th></th></tr>' +
    r.rows.map(x => '<tr><td>' + esc(TL(x.tab)) + '</td><td>' + x.row + '</td><td>' + esc(x.ten) + '</td><td>' + esc(x.cccd) + '</td><td>' + esc(x.hd) + '</td><td>' + esc(x.maRung) + '</td><td>' + esc(x.diaChi) + '</td><td>' + cell(x) + '</td>' +
      '<td>' + (x.flags || []).map(f => '<span class="pill err" style="margin:1px">' + esc(f) + '</span>').join('') + '</td>' +
      '<td><button class="btn sm" data-lkpick="' + esc(x.tab) + '|' + x.row + '">Chọn</button></td></tr>').join('') + '</table></div>');
}

