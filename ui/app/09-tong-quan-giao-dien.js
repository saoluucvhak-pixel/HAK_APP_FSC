/* ========== Trang tổng quan ========== */
/* Cảnh báo gom theo rừng cho màn Tổng quan: mỗi mục là danh sách rừng bị ảnh hưởng (bấm để mở rừng) */
const HOME_ALERTS = [['minors', 'err', 'Rừng có lao động dưới 18 tuổi'], ['badDate', 'err', 'Rừng có phiếu cân sai ngày (không tính vào báo cáo)'], ['xeHan', 'warn', 'Rừng có xe hết hạn hoặc sắp hết hạn giấy tờ (trong 30 ngày)'],
  ['lechTg', 'warn', 'Rừng có thời gian khai thác thực tế lệch nhiều so với dự kiến'], ['lechKl', 'warn', 'Rừng có khối lượng thực tế nhập tay lệch tổng phiếu cân (quá 1%)'], ['noCoord', 'warn', 'Rừng chưa có tọa độ'], ['noDest', 'warn', 'Rừng chưa chọn địa chỉ giao hàng'], ['noPc', '', 'Rừng chưa có phiếu cân']];
function homeData() {
  const today = parseVN(todayStr()), A = {noPc: [], lechTg: [], noCoord: [], noDest: [], xeHan: [], minors: [], badDate: [], lechKl: []}, months = {}, T = {du: 0, nc: 0, dx: 0, tt: 0};
  Object.values(db.rs).forEach(o => forestList(o).forEach(f => {
    const rec = jobView(o, f), i = rec.info, ref = {oid: o.id, fid: f.id, name: (i.tenRung || i.maRung || '(rừng chưa đặt tên)') + ' · ' + (o.info.ten || '')};
    const y = forestYield(i); if (y) T.du += y; T.nc += (rec.nc || []).length; T.dx += (rec.dx || []).length;
    const pcT = Math.round((rec.pc || []).reduce((a, p) => a + (+p.kl > 0 ? Math.round(p.kl * 1000) : 0), 0)) / 1000;   // tổng phiếu cân (làm tròn từng phiếu theo kg như biểu mẫu)
    if (typeof i.khoiLuong === 'number' && i.khoiLuong > 0) { T.tt += i.khoiLuong; if (pcT > 0 && Math.abs(i.khoiLuong - pcT) / pcT > 0.01) A.lechKl.push({oid: o.id, fid: f.id, name: (i.tenRung || i.maRung || '(rừng chưa đặt tên)') + ' · nhập tay ' + fmtTan(i.khoiLuong) + ' tấn, phiếu cân ' + fmtTan(pcT) + ' tấn'}); }
    { const L = tgLechOf(i, rec.pc, nDoiOf(i, rec.nc)); if (L && L.canhBao) A.lechTg.push({oid: o.id, fid: f.id, name: (i.tenRung || i.maRung || '(rừng chưa đặt tên)') + ' · thực tế ' + L.thucTe + ' ngày, dự kiến ' + L.duKien + ' ngày (' + (L.lech > 0 ? '+' : '') + L.lech + ')'}); }
    if (!(rec.pc || []).length) A.noPc.push(ref);
    if (!(typeof i.lat === 'number' && typeof i.lng === 'number')) A.noCoord.push(ref);
    if (!destOf(rec).text) A.noDest.push(ref);
    if ((rec.dx || []).some(d => [d.hanBH, d.hanGplx].some(v => { const t = parseVN(v); return t && today && (t - today) / 864e5 <= 30; }))) A.xeHan.push(ref);
    const refDay = parseVN(i.tuNgay) ? i.tuNgay : todayStr();
    if ((rec.nc || []).some(n => { const a = ageAt(n.ngaySinh, refDay); return a != null && a < 18; })) A.minors.push(ref);
    if ((rec.pc || []).some(p => !HAKDates.isValid(p.ngay))) A.badDate.push(ref);
    (rec.pc || []).forEach(p => { const d = HAKDates.parse(p.ngay); if (d && +p.kl > 0) { const k = d.y + '-' + pad2(d.m); months[k] = (months[k] || 0) + +p.kl; } });
  }));
  return {A, months, T};
}
function homeAlertsHtml(A) {
  const rows = HOME_ALERTS.filter(([k]) => A[k].length).map(([k, tone, label]) => '<div class="alr"><span class="pill ' + tone + '">' + A[k].length + '</span><div><b>' + esc(label) + '</b><div class="alrN">' +
    A[k].slice(0, 3).map(r => '<button class="lnk" data-dash="' + esc(r.oid + '|' + r.fid) + '">' + esc(r.name) + '</button>').join('') + (A[k].length > 3 ? '<span class="mut">… và ' + (A[k].length - 3) + ' rừng khác</span>' : '') + '</div></div></div>').join('');
  return rows || '<p class="mut">Không có cảnh báo: tọa độ, địa chỉ giao, phiếu cân, giấy tờ xe và lao động đều ổn ở mọi rừng.</p>';
}
function homeMonthsHtml(months) {
  const now = new Date(), list = []; for (let i = 5; i >= 0; i--) { const d = new Date(now.getFullYear(), now.getMonth() - i, 1); list.push([d.getFullYear() + '-' + pad2(d.getMonth() + 1), pad2(d.getMonth() + 1) + '/' + String(d.getFullYear()).slice(2)]); }
  const max = Math.max(0, ...list.map(([k]) => months[k] || 0));
  if (!max) return '<p class="mut">Chưa có phiếu cân trong 6 tháng gần đây.</p>';
  return '<div class="mbars">' + list.map(([k, l]) => '<div class="mb" title="' + esc(l) + ': ' + esc(HAKReports.fmtCell(Math.round((months[k] || 0) * 1000) / 1000, 'n3')) + ' tấn"><b>' + esc(HAKReports.fmtCell(Math.round((months[k] || 0) * 10) / 10, 'n1')) + '</b><span><i style="height:' + Math.round((months[k] || 0) / max * 100) + '%"></i></span><small>' + esc(l) + '</small></div>').join('') + '</div><p class="mut" style="margin:6px 0 0">Khối lượng phiếu cân theo tháng (tấn), 6 tháng gần nhất.</p>';
}
/* Tình trạng hệ thống: bản tra cứu và sao lưu (đọc từ tiến trình chính nên điền sau khi vẽ xong) */
function homeSysFill() {
  const box = document.getElementById('homeSys'); if (!box || !HB) return;
  Promise.all([HB.lookup.status(), HB.settings.get()]).then(([lk0, st]) => {
    if (!document.getElementById('homeSys')) return;
    const a = lk0 && lk0.active, rm = st && st.settings && st.settings.remind;
    const lkTxt = a ? 'Bản tra cứu: <b>' + esc(a.detail || a.source) + '</b>, nạp ' + esc(String(a.loadedAt || '').replace('T', ' ').slice(0, 16)) + ' (' + Object.values(a.counts || {}).reduce((x, y) => x + y, 0) + ' dòng)' : 'Chưa có bản tra cứu: bấm <b>Đồng bộ ngay</b> ở Tra cứu Google Sheets.';
    const bk = !rm ? '' : rm.days == null ? 'Chưa sao lưu toàn bộ dữ liệu lần nào.' : 'Sao lưu toàn bộ gần nhất cách đây <b>' + rm.days + ' ngày</b>' + (rm.due ? ' (đã đến hạn nhắc).' : '.');
    box.innerHTML = '<h3>Hệ thống</h3><div class="sysl"><div>' + lkTxt + '</div><div class="' + (rm && rm.due ? 'warnTxt' : '') + '">' + bk + '</div></div>' +
      '<div class="row" style="margin-top:8px;flex-wrap:wrap"><button class="btn ghost sm" data-act="lkOpen">Tra cứu Google Sheets</button><button class="btn ghost sm" data-act="rpDoiChieu"' + (a ? '' : ' disabled') + '>Báo cáo đối chiếu</button><button class="btn ghost sm" data-act="backup">Sao lưu toàn bộ</button><button class="btn ghost sm" data-act="openSettings">Cài đặt</button></div>';
  }).catch(() => {});
}
function panelHome() {
  const recs = rpRecords(''), F = HAKReports.fmtCell, n = Object.keys(db.rs).length;
  if (!n) {
    return '<div class="hero"><div><h2>Chào mừng đến với HAKQN</h2><p class="mut">Hồ sơ khai thác và vận chuyển gỗ keo theo từng rừng, chuẩn FSC.</p></div></div>' +
      '<div class="card"><h3>Bắt đầu trong 4 bước</h3><ol style="line-height:2;margin:0;padding-left:20px"><li><b>Chủ rừng</b>: tạo hồ sơ chủ rừng (hoặc lấy từ Tra cứu Google Sheets).</li><li><b>Rừng</b>: khai báo từng rừng, diện tích, tọa độ, giấy tờ pháp lý.</li><li><b>Nhân công và vận chuyển</b>: nạp file Excel nhân công, xe, phiếu cân.</li><li><b>Xuất hồ sơ</b>: kiểm tra checklist FSC rồi xuất BM-01…BM-19.</li></ol>' +
      '<div class="row" style="margin-top:14px"><button class="btn" data-act="newRs">+ Chủ rừng mới</button>' + (HB ? '<button class="btn ghost" data-act="lkOpen">Lấy dữ liệu từ Google Sheets</button>' : '') + '</div></div>';
  }
  const tot = recs.reduce((a, r) => { a.ha += typeof r.dienTich === 'number' ? r.dienTich : 0; (r.pc || []).forEach(p => { a.t += +p.kl > 0 ? Math.round(p.kl * 1000) / 1000 : 0; a.n++; }); a.pct += r.pct; return a; }, {ha: 0, t: 0, n: 0, pct: 0});
  const avg = recs.length ? Math.round(tot.pct / recs.length * 10) / 10 : 0;
  const ringCls = p => p >= 80 ? 'hi' : p >= 50 ? 'mid' : 'lo';
  const todo = recs.filter(r => r.pct < 100).sort((a, b) => a.pct - b.pct).slice(0, 8);
  const recent = [];
  recs.forEach(r => (r.pc || []).forEach(p => recent.push(Object.assign({}, p, {rung: r.maRung, chu: r.chuRung, k: HAKReports.dateKey(p.ngay)}))));
  recent.sort((a, b) => b.k - a.k).splice(8);
  const H = homeData();
  const kp = (v, l, f, acc) => '<div' + (acc ? ' class="acc"' : '') + '><b>' + esc(F(v, f)) + '</b>' + esc(l) + '</div>';
  return '<div class="hero"><div><h2>Tổng quan</h2><p class="mut">' + todayStr() + ' · dữ liệu lưu ' + (HB ? 'trong SQLite trên máy' : 'trong trình duyệt') + '</p></div>' +
    '<div class="row"><button class="btn" data-act="newRs">+ Chủ rừng mới</button><button class="btn ghost" data-act="rpOpen">Báo cáo</button>' + (HB ? '<button class="btn ghost" data-act="lkOpen">Tra cứu</button>' : '') + '</div></div>' +
    '<div class="kpi">' + kp(n, 'Chủ rừng', 'n0') + kp(recs.length, 'Số rừng', 'n0') + kp(Math.round(tot.ha * 100) / 100, 'Tổng diện tích (ha)', 'n2') + kp(Math.round(H.T.du * 10) / 10, 'Sản lượng dự kiến (tấn)', 'n1') + kp(Math.round(tot.t * 1000) / 1000, 'Khối lượng đã cân (tấn)', 'n3') + kp(Math.round(H.T.tt * 1000) / 1000, 'Khối lượng thực tế nhập tay (tấn)', 'n3') + kp(H.T.du ? Math.round(tot.t / H.T.du * 1000) / 10 : 0, 'Đã cân so với dự kiến', 'pct') + kp(tot.n, 'Số chuyến', 'n0') + kp(H.T.nc, 'Lao động', 'n0') + kp(H.T.dx, 'Số xe', 'n0') + kp(avg, 'Tiến độ hồ sơ TB', 'pct', true) + '</div>' +
    '<div class="grid2"><div class="card"><h3>Hồ sơ cần hoàn thiện</h3>' + (todo.length ? '<div class="dlist">' + todo.map(r => '<button class="drow" data-dash="' + esc(r.oid + '|' + r.fid) + '"><span><b>' + esc(r.tenRung || r.maRung || '(rừng chưa đặt tên)') + '</b> <span class="mut">· ' + esc(r.chuRung) + '</span><small>' + esc((r.thieu || []).slice(0, 2).map(x => x.label).join('; ') || '') + ((r.thieu || []).length > 2 ? ' và ' + ((r.thieu || []).length - 2) + ' mục khác' : '') + '</small></span><span class="ring ' + ringCls(r.pct) + '" style="--p:' + r.pct + '"><i>' + Math.round(r.pct) + '%</i></span></button>').join('') + '</div>' : '<p class="mut">Tất cả hồ sơ đã đạt 100%.</p>') + '</div>' +
    '<div class="card"><h3>Phiếu cân gần đây</h3>' + (recent.length ? '<div class="wrap" style="max-height:none"><table><tr><th>Ngày</th><th>Số phiếu</th><th>Biển số</th><th>Rừng</th><th style="text-align:right">Tấn</th></tr>' + recent.map(p => '<tr><td>' + esc(p.ngay) + '</td><td>' + esc(p.soPhieu) + '</td><td>' + esc(p.bienSo) + '</td><td>' + esc(p.rung) + '</td><td style="text-align:right">' + esc(F(+p.kl || 0, 'n3')) + '</td></tr>').join('') + '</table></div>' : '<p class="mut">Chưa có phiếu cân. Nạp ở tab Vận chuyển của từng rừng' + (HB ? ' hoặc lấy từ Tra cứu Google Sheets' : '') + '.</p>') + '</div></div>' +
    '<div class="grid2" style="margin-top:16px"><div class="card"><h3>Cần chú ý ở các rừng</h3>' + homeAlertsHtml(H.A) + '</div><div class="card"><h3>Sản lượng theo tháng</h3>' + homeMonthsHtml(H.months) + '</div></div>' +
    '<div class="card" id="homeSys" style="margin-top:16px"><h3>Hệ thống</h3><p class="mut">' + (HB ? 'Đang kiểm tra bản tra cứu và sao lưu…' : 'Bản chạy trong trình duyệt: dữ liệu lưu trong trình duyệt, hãy sao lưu thường xuyên.') + '</p></div>' + (setTimeout(homeSysFill, 0), '');
}

/* ========== Giao diện ========== */
let sideQ = '';
function renderSide() {
  const qf = foldVi(sideQ);
  const ids = Object.keys(db.rs).sort((a, b) => db.rs[a].info.ten.localeCompare(db.rs[b].info.ten, 'vi')).filter(id => { if (!qf) return true; const i = db.rs[id].info; return foldVi([i.ten, i.ma, i.cccd].join(' ')).includes(qf) || id === cur; });
  $('#sideList').innerHTML =
    '<button class="btn" style="width:100%;margin-bottom:10px" data-act="newRs">+ Chủ rừng mới</button>' +
    (ids.length ? ids.map(id => {
      const r = db.rs[id];
      const kids = id === cur ? forestList(r).map(f => '<button class="item sub ' + (f.id === curF ? 'on' : '') + '" data-sforest="' + f.id + '"><b>' + esc(f.info.tenRung || f.info.maRung || '(rừng chưa đặt tên)') + '</b><small>' + esc(f.info.maRung || '') + '</small></button>').join('') : '';
      return '<button class="item ' + (id === cur ? 'on' : '') + '" data-open="' + id + '"><b>' + (id === cur ? '▾ ' : '▸ ') + esc(r.info.ten || '(chưa đặt tên)') +
        '</b><small>Mã ' + esc(r.info.ma) + ' · ' + forestList(r).length + ' rừng</small></button>' + (kids ? '<div class="subs">' + kids + '</div>' : '');
    }).join('') : (sideQ ? '<p class="mut">Không có chủ rừng khớp “' + esc(sideQ) + '”.</p>' : '<p class="mut">Chưa có chủ rừng. Bấm “+ Chủ rừng mới”.</p>')) + '';
}

function renderMsgs() {
  const parts = [];
  if (!storeOk) parts.push(HB ? '<div class="msg err">Lần ghi gần nhất vào cơ sở dữ liệu trên máy bị lỗi. Dữ liệu đã lưu trước đó vẫn còn nguyên; hãy thử lưu lại và sao lưu toàn bộ dữ liệu.</div>' : '<div class="msg err">Trình duyệt không lưu được dữ liệu (có thể đã đầy hoặc bị chặn). Hãy bấm “Sao lưu dữ liệu (.json)” thường xuyên.</div>');
  notes.forEach(n => parts.push('<div class="msg ' + n.kind + '">' + esc(n.text) + '</div>'));
  notes = [];
  return parts.join('');
}

function renderMain() {
  if (view === 'norm') { $('#main').innerHTML = renderMsgs() + panelNorm(); return; }
  if (view === 'cty') { $('#main').innerHTML = renderMsgs() + settingsFrame('cty', panelCty()); return; }
  if (view === 'settings') { $('#main').innerHTML = renderMsgs() + settingsFrame('settings', panelSettings()); settingsLoad(); return; }
  if (view === 'setgs') { $('#main').innerHTML = renderMsgs() + settingsFrame('setgs', panelSetGs()); return; }
  if (view === 'setfmt') { $('#main').innerHTML = renderMsgs() + settingsFrame('setfmt', panelSetFmt()); return; }
  const own = curOwner();
  if (!own) {
    $('#main').innerHTML = renderMsgs() + panelHome();
    return;
  }
  const tabs = [['info', 'Thông tin chủ rừng'], ['rung', 'Rừng (' + forestList(own).length + ')']];
  $('#main').innerHTML = renderMsgs() +
    '<div class="row" style="justify-content:space-between"><div><h2>' + esc(own.info.ten || '(chưa đặt tên)') + '</h2><div class="mut">Mã ' + esc(own.info.ma) + '</div></div>' +
    '<button class="btn danger sm" data-act="delRs">Xóa chủ rừng</button></div>' +
    '<div class="tabs">' + tabs.map(([k, l]) => '<button class="' + (tab === k ? 'on' : '') + '" data-tab="' + k + '">' + l + '</button>').join('') + '</div>' +
    (tab === 'info' ? panelInfo(own) : panelRung(own));
}

function checklistRung(job) {
  const g = gate(job), ex = job.exp || {}, i = job.info, pay = payrollPlan(job, ex);
  const L = [];
  const add = (ok, label, hint, warn) => L.push({ok, label, hint: ok ? '' : hint, warn: !ok && !!warn});
  add(!g.info.length, 'Thông tin rừng đầy đủ', g.info.join('; '));
  add(i.lat != null && i.lng != null, 'Tọa độ lô khai thác (FSC)', 'Chưa nhập tọa độ');
  add((i.giayTo || []).length > 0, 'Giấy tờ pháp lý đất/rừng', 'Chưa khai giấy tờ');
  add(!!(i.tuNgay && i.denNgay), 'Thời gian khai thác', 'Thiếu từ ngày/đến ngày');
  add(job.nc.length > 0 && !g.nc.errs.length, 'Nhân công hợp lệ', job.nc.length ? g.nc.errs.length + ' lỗi' : 'Chưa nạp file nhân công');
  add(!pay.issues.length, 'Hình thức, đơn giá lương', pay.issues.join('; '), true);
  add(job.nc.length > 0 && !g.normErrs.length, 'Định mức BHLĐ theo chức danh', g.normErrs.join('; ') || 'Chưa có nhân công');
  add(!job.nc.length || !minorsOf(job).length, 'Người lao động đủ 18 tuổi', 'Có ' + minorsOf(job).length + ' người dưới 18 tuổi: ' + minorsOf(job).map(r => r.ten).join(', '));
  add(job.dx.length > 0 && !g.dx.errs.length, 'Vận chuyển hợp lệ', job.dx.length ? g.dx.errs.length + ' lỗi' : 'Chưa nạp file vận chuyển');
  add(job.dx.length > 0 && !g.dx.warns.length, 'Giấy tờ xe, GPLX còn hạn', job.dx.length ? g.dx.warns.length + ' dòng cần lưu ý' : 'Chưa có vận chuyển', true);
  add(!g.vc.length, 'Giá vận chuyển', g.vc.join('; '));
  { const dd0 = destOf(job); add(!!dd0.text, 'Công ty mua hàng và điểm đến vận chuyển', dd0.src === 'thucong' ? 'Đang dùng điểm đến nhập tay cũ — chọn công ty mua hàng (tab Vận chuyển)' : 'Chưa chọn (tab Vận chuyển)', true); }
  add((job.pc || []).length > 0 && !g.pc.errs.length, 'Phiếu cân vận chuyển hợp lệ', (job.pc || []).length ? g.pc.errs.length + ' lỗi' : 'Chưa nạp phiếu cân (tab Vận chuyển)', true);
  add(!!ex.capNgay, 'Biên bản BHLĐ có ngày cấp', 'Nhập ở tab Xuất hồ sơ', true);
  add(!!ex.dtNgay, 'Biên bản ATLĐ có ngày đào tạo', 'Nhập ở tab Xuất hồ sơ', true);
  return L;
}
const progressOf = job => { const L = checklistRung(job); return {L, pct: Math.round(100 * L.filter(x => x.ok).length / L.length)}; };
function panelTienDo(job) {
  const {L, pct} = progressOf(job);
  return '<div class="card"><div class="row" style="justify-content:space-between"><h3 style="margin:0">Tiến độ hồ sơ rừng · checklist FSC</h3><b>' + pct + '%</b></div>' +
    '<div class="prog"><i style="width:' + pct + '%"></i></div><div class="chk">' +
    L.map(x => '<div class="' + (x.ok ? '' : x.warn ? 'wn' : 'no') + '"><b>' + (x.ok ? '' : x.warn ? '!' : '✕') + '</b><span>' + esc(x.label) + (x.hint ? '<small>' + esc(x.hint) + '</small>' : '') + '</span></div>').join('') + '</div></div>';
}

