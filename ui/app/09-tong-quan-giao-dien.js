/* ========== Trang tổng quan ========== */
/* Cảnh báo gom theo rừng cho màn Tổng quan: mỗi mục là danh sách rừng bị ảnh hưởng (bấm để mở rừng) */
const HOME_ALERTS = [['minors', 'err', 'Rừng có lao động dưới 18 tuổi'], ['badDate', 'err', 'Rừng có phiếu cân sai ngày (không tính vào báo cáo)'], ['xeHan', 'warn', 'Rừng có xe hết hạn hoặc sắp hết hạn giấy tờ (trong 30 ngày)'],
  ['lechTg', 'warn', 'Rừng có thời gian khai thác thực tế lệch nhiều so với dự kiến'], ['lechKl', 'warn', 'Rừng có khối lượng thực tế nhập tay lệch tổng phiếu cân (quá 1%)'], ['noCoord', 'warn', 'Rừng chưa có tọa độ'], ['noDest', 'warn', 'Rừng chưa chọn địa chỉ giao hàng'], ['noPc', '', 'Rừng chưa có phiếu cân']];
function homeData() {
  const today = parseVN(todayStr()), A = {noPc: [], lechTg: [], noCoord: [], noDest: [], xeHan: [], minors: [], badDate: [], lechKl: []}, months = {}, T = {du: 0, nc: 0, dx: 0, tt: 0};
  Object.values(db.rs).forEach(o => forestList(o).forEach(f => {
    const rec = jobView(o, f), i = rec.info, ref = {oid: o.id, fid: f.id, name: (i.tenRung || i.maRung || '(rừng chưa đặt tên)') + ' · ' + (o.info.ten || '')};
    const y = forestYield(i); if (y) T.du += y;
    T.nc += new Set((rec.nc || []).map((r, idx) => r && (r.nguoiId || trim(r.cccd) || trim(r.ten) || idx))).size;
    T.dx += new Set((rec.dx || []).map((r, idx) => r && (r.xeId || HAKBks.khoa(r.bienSo) || idx))).size;
    const pcT = HAKDinhMuc.tongPhieuTan(rec.pc);   // tổng phiếu cân (một định nghĩa: làm tròn từng phiếu theo kg như biểu mẫu)
    if (typeof i.klHoSoCu === 'number' && i.klHoSoCu > 0) { T.tt += i.klHoSoCu;
    if (pcT > 0 && Math.abs(i.klHoSoCu - pcT) / pcT > 0.01) A.lechKl.push({oid: o.id, fid: f.id, name: (i.tenRung || i.maRung || '(rừng chưa đặt tên)') + ' · nhập tay ' + fmtTan(i.klHoSoCu) + ' tấn, phiếu cân ' + fmtTan(pcT) + ' tấn'}); }
    { const L = tgLechOf(i, rec.pc, nDoiOf(i, rec.nc)); if (L && L.canhBao) A.lechTg.push({oid: o.id, fid: f.id, name: (i.tenRung || i.maRung || '(rừng chưa đặt tên)') + ' · thực tế ' + L.thucTe + ' ngày, dự kiến ' + L.duKien + ' ngày (' + (L.lech > 0 ? '+' : '') + L.lech + ')'}); }
    if (!(rec.pc || []).length) A.noPc.push(ref);
    if (!(typeof i.lat === 'number' && typeof i.lng === 'number')) A.noCoord.push(ref);
    if (!destOf(rec).text) A.noDest.push(ref);
    if ((rec.dx || []).some(d => [d.hanBH, d.hanGplx].some(v => { const t = parseVN(v); return t && today && (t - today) / 864e5 <= 30; }))) A.xeHan.push(ref);
    const refDay = parseVN(i.tuNgay) ? i.tuNgay : todayStr();
    if ((rec.nc || []).some(n => { const a = ageAt(n.ngaySinh, refDay); return a != null && a < 18; })) A.minors.push(ref);
    if ((rec.pc || []).some(p => !HAKDates.isValid(p.ngay))) A.badDate.push(ref);
    (rec.pc || []).forEach(p => { const d = HAKDates.parse(p.ngay), kg = HAKDinhMuc.kgPhieu(p); if (d && kg > 0) { const k = d.y + '-' + pad2(d.m); months[k] = (Math.round((months[k] || 0) * 1000) + kg) / 1000; } });
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
  return '<div class="mbars">' + list.map(([k, l]) => '<div class="mb" title="' + esc(l) + ': ' + esc(HAKReports.fmtCell(Math.round((months[k] || 0) * 1000) / 1000, 'n3')) + ' tấn"><b>' + esc(HAKReports.fmtCell(Math.round((months[k] || 0) * 10) / 10, 'n1')) + '</b><span><i style="height:' +
  Math.round((months[k] || 0) / max * 100) + '%"></i></span><small>' + esc(l) + '</small></div>').join('') + '</div><p class="mut" style="margin:6px 0 0">Khối lượng phiếu cân theo tháng (tấn), 6 tháng gần nhất.</p>';
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
      '<div class="row" style="margin-top:8px;flex-wrap:wrap"><button class="btn ghost sm" data-act="lkOpen">Dữ liệu Google Sheets</button><button class="btn ghost sm" data-act="rpDoiChieu"' + (a ? '' : ' disabled') + '>Báo cáo đối chiếu</button><button class="btn ghost sm" data-act="backup">Sao lưu toàn bộ</button><button class="btn ghost sm" data-act="openSettings">Cài đặt</button></div>';
  }).catch(() => {});
}
function panelHome() {
  const recs = rpRecords(''), F = HAKReports.fmtCell, n = Object.keys(db.rs).length;
  if (!n) {
    return '<div class="hero"><div><h2>Chào mừng đến với HAKQN</h2><p class="mut">Hồ sơ khai thác và vận chuyển gỗ keo theo từng rừng, chuẩn FSC.</p></div></div>' +
      '<div class="card"><p class="mut" style="margin:0 0 10px">Chưa có chủ rừng nào. Mở <b>Bàn làm việc</b> để xem sơ đồ 6 bước, hoặc bấm “+ Chủ rừng mới”.</p><button class="btn ghost sm" data-act="openBld">Mở Bàn làm việc</button></div>' +
      '<div class="card"><div class="row"><button class="btn" data-act="newRs">+ Chủ rừng mới</button>' + (HB ? '<button class="btn ghost" data-act="lkOpen">Lấy dữ liệu từ Google Sheets</button>' : '') + '</div></div>';
  }
  const tot = recs.reduce((a, r) => { a.ha += typeof r.dienTich === 'number' ? r.dienTich : 0; (r.pc || []).forEach(p => { const kg = HAKDinhMuc.kgPhieu(p); if (HAKDates.isValid(p.ngay) && kg > 0) { a.t = (Math.round(a.t * 1000) + kg) / 1000; a.n++; } }); a.pct += r.pct; return a; }, {ha: 0, t: 0, n: 0, pct: 0});
  const avg = recs.length ? Math.round(tot.pct / recs.length * 10) / 10 : 0;
  const ringCls = p => p >= 80 ? 'hi' : p >= 50 ? 'mid' : 'lo';
  const todo = recs.filter(r => r.pct < 100).sort((a, b) => a.pct - b.pct).slice(0, 8);
  const recent = [];
  recs.forEach(r => (r.pc || []).forEach(p => recent.push(Object.assign({}, p, {rung: r.maRung, chu: r.chuRung, k: HAKReports.dateKey(p.ngay)}))));
  recent.sort((a, b) => b.k - a.k).splice(8);
  const H = homeData();
  /* 3.5.1: Tổng quan dạng bảng điều hành — 4 chỉ số chính, sản lượng 6 tháng, radar tuân thủ FSC, lô đang khai thác tích cực, phiếu cân mới nhất, thao tác nhanh. Khối Hướng dẫn nằm ở Bàn làm việc. */
  const fmtT3 = v => HAKReports.fmtCell(Math.round(v * 1000) / 1000, 'n3'), fmtHa = v => HAKReports.fmtCell(Math.round(v * 100) / 100, 'n2');
  let chanLo = 0, tongLo = 0; const loChan = [];
  recs.forEach(r => { tongLo++; try { const o = db.rs[r.oid], f = o && forestList(o).find(x => x.id === r.fid), kt = f ? exportCheck(jobView(o, f)) : null; if (kt && kt.chan.length) { chanLo++; loChan.push({r, n: kt.chan.length}); } } catch (e) { /* không kiểm được lô này: không tính chặn */ } });
  const hopLe = tongLo ? Math.round((tongLo - chanLo) / tongLo * 1000) / 10 : 0, danCan = H.T.du ? Math.round(tot.t / H.T.du * 1000) / 10 : null;
  const hom = HAKReports.dateKey(todayStr()), mocKy = (() => { const d = new Date(); d.setDate(d.getDate() - 30); return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate(); })();
  const tichCuc = recs.map(r => ({r, t30: (r.pc || []).reduce((a, p) => { const k = HAKReports.dateKey(p.ngay); return a + (k >= mocKy && k <= hom ? (+p.kl || 0) : 0); }, 0), tong: (r.pc || []).reduce((a, p) => a + (+p.kl || 0), 0)}))
    .sort((a, b) => b.t30 - a.t30 || b.tong - a.tong).slice(0, 5);
  const hk = (ic, nhan, so, don, phu, cls) => '<div class="heroKpi ' + (cls || '') + '"><span class="hkIc" aria-hidden="true">' + ic + '</span><div><small>' + esc(nhan) + '</small><b>' + esc(so) + (don ? ' <em>' + esc(don) + '</em>' : '') + '</b><span class="mut">' + esc(phu) + '</span></div></div>';
  const pl = (ic, t, act, ex) => '<button type="button" class="padBtn" data-act="' + act + '"' + (ex || '') + '><span aria-hidden="true">' + ic + '</span>' + esc(t) + '</button>';
  return '<div class="hero"><div><h2>📊 Tổng quan điều hành</h2><p class="mut">' + todayStr() + ' · dữ liệu lưu ' + (HB ? 'trong SQLite trên máy' : 'trong trình duyệt') + '</p></div>' +
    '<div class="row"><button class="btn" data-act="newRs">+ Chủ rừng mới</button><button class="btn ghost" data-act="rpOpen">Báo cáo</button>' + (HB ? '<button class="btn ghost" data-act="lkOpen">Dữ liệu Google Sheets</button>' : '') + '</div></div>' +
    '<div class="heroKpis" id="heroKpis">' +
      hk('🪵', 'Sản lượng gỗ đã cân', fmtT3(tot.t), 'tấn', tot.n + ' chuyến' + (danCan != null ? ' · ' + String(danCan).replace('.', ',') + '% so với dự kiến' : ''), 'k1') +
      hk('🌲', 'Diện tích rừng quản lý', fmtHa(tot.ha), 'ha', recs.length + ' lô · ' + n + ' chủ rừng', 'k2') +
      hk('👷', 'Lực lượng tác nghiệp', H.T.nc + ' nhân công · ' + H.T.dx + ' xe', '', 'theo hồ sơ các lô đã lưu', 'k3') +
      hk('✅', 'Tỷ lệ hồ sơ FSC hợp lệ', String(hopLe).replace('.', ','), '%', (tongLo - chanLo) + '/' + tongLo + ' lô không có mục chặn xuất · tiến độ TB ' + String(avg).replace('.', ',') + '%', 'k4') + '</div>' +
    viecCanLamBox(recs) +
    '<div class="grid2"><div class="card" id="homeThang"><h3>Sản lượng 6 tháng gần nhất</h3>' + homeMonthsHtml(H.months) + '</div>' +
    '<div class="card" id="homeRadar"><h3>Radar cảnh báo tuân thủ FSC</h3>' + (chanLo ? '<div class="alr"><span class="pill err">' + chanLo + '</span><div><b>Lô còn mục chặn xuất</b><div class="alrN">' + loChan.slice(0, 3).map(x => '<button class="lnk" data-dash="' + esc(x.r.oid + '|' + x.r.fid) + '">' + esc((x.r.tenRung || x.r.maRung || '(rừng chưa đặt tên)') + ' · ' + x.n + ' mục') + '</button>').join('') + (loChan.length > 3 ? '<span class="mut">… và ' + (loChan.length - 3) + ' lô khác</span>' : '') + '</div></div></div>' : '') + homeAlertsHtml(H.A) + '</div></div>' +
    '<div class="grid2" style="margin-top:16px"><div class="card" id="homeTichCuc"><h3>5 lô đang khai thác tích cực nhất <small class="mut">(30 ngày qua)</small></h3>' + (tichCuc.some(x => x.tong > 0) ? '<div class="wrap" style="max-height:none"><table><tr><th>Lô rừng</th><th>Chủ rừng</th><th style="text-align:right">30 ngày (tấn)</th><th style="text-align:right">Tổng (tấn)</th></tr>' + tichCuc.map(x => '<tr class="clickRow" data-dash="' + esc(x.r.oid + '|' + x.r.fid) + '" tabindex="0"><td><b>' + esc(x.r.tenRung || x.r.maRung || '(rừng chưa đặt tên)') + '</b> <span class="mut">' + esc(x.r.maRung) + '</span></td><td>' + esc(x.r.chuRung) + '</td><td style="text-align:right">' + esc(fmtT3(x.t30)) + '</td><td style="text-align:right">' + esc(fmtT3(x.tong)) + '</td></tr>').join('') + '</table></div>' : '<p class="mut">Chưa có phiếu cân. Nạp ở tab Vận chuyển của từng rừng' + (HB ? ' hoặc lấy từ Dữ liệu Google Sheets' : '') + '.</p>') + '</div>' +
    '<div class="card" id="homePhieuMoi"><h3>5 phiếu cân mới nhất</h3>' + (recent.length ? '<div class="wrap" style="max-height:none"><table><tr><th>Ngày</th><th>Số phiếu</th><th>Biển số</th><th>Rừng</th><th style="text-align:right">Tấn</th></tr>' + recent.slice(0, 5).map(p => '<tr><td>' + esc(p.ngay) + '</td><td>' + esc(p.soPhieu) + '</td><td>' + esc(p.bienSo) + '</td><td>' + esc(p.rung) + '</td><td style="text-align:right">' + esc(F(+p.kl || 0, 'n3')) + '</td></tr>').join('') + '</table></div>' : '<p class="mut">Chưa có phiếu cân.</p>') + '</div></div>' +
    '<div class="card" id="homePad" style="margin-top:16px"><h3>Thao tác nhanh</h3><div class="padGrid">' + pl('➕', 'Chủ rừng mới', 'newRs') + pl('💼', 'Bàn làm việc', 'openBld') + pl('📁', 'Danh mục', 'openDm') + pl('📑', 'Báo cáo', 'rpOpen') + pl('⚙️', 'Định mức', 'openNorm') + (HB ? pl('📡', 'Dữ liệu Google Sheets', 'lkOpen') : '') + '</div></div>' +
    '<div class="card" id="homeSys" style="margin-top:16px"><h3>Hệ thống</h3><p class="mut">' + (HB ? 'Đang kiểm tra bản tra cứu và sao lưu…' : 'Bản chạy trong trình duyệt: dữ liệu lưu trong trình duyệt, hãy sao lưu thường xuyên.') + '</p></div>' + (setTimeout(homeSysFill, 0), '');
}

/* ========== Giao diện ========== */
let sideQ = '';
/* 3.5.1: Smart Filter cho danh sách chủ rừng (screenId 'sidebar_chu_rung'): chữ tìm + tình trạng hồ sơ + tình trạng hợp đồng + số rừng; cùng bộ máy lọc (HAKSmartFilter) với các màn bảng */
const sideSfCfg = () => ({
  screenId: 'sidebar_chu_rung', title: 'Chủ rừng', searchPlaceholder: 'Lọc chủ rừng…', quickFields: ['q', 'tinhTrang', 'hopDong', 'soRung'], advancedFields: ['q', 'tinhTrang', 'hopDong', 'soRung'],
  matchQ: (o, q) => { const h = foldVi([o.info.ten, o.info.ma, o.info.cccd, o.info.soHopDong].join(' ')); return q.split(/\s+/).filter(Boolean).every(w => h.includes(foldVi(w))); },
  fields: [
    {key: 'tinhTrang', label: 'Tình trạng hồ sơ', type: 'enum', options: [{value: 'du', label: 'Đủ điều kiện'}, {value: 'doi', label: 'Cần đối chiếu'}, {value: 'chan', label: 'Bị chặn xuất'}], match: (o, v) => sideTinhTrang(o) === v},
    {key: 'hopDong', label: 'Tình trạng hợp đồng', type: 'enum', options: [{value: 'ky', label: 'Đã ký HĐ'}, {value: 'chua', label: 'Chưa ký HĐ'}], match: (o, v) => (trim(o.info.soHopDong) ? 'ky' : 'chua') === v},
    {key: 'soRung', label: 'Số lượng rừng', type: 'enum', options: [{value: 'nhieu', label: 'Nhiều rừng (từ 2)'}, {value: 'don', label: 'Lô đơn (1 rừng)'}], match: (o, v) => (forestList(o).length >= 2 ? 'nhieu' : 'don') === v}
  ]
});
/* tình trạng hồ sơ của chủ rừng: có lô bị chặn xuất → chan; còn mục cần đối chiếu hoặc chưa có rừng → doi; còn lại → du (chỉ tính khi đang lọc theo tình trạng) */
function sideTinhTrang(o) {
  const fs = forestList(o); if (!fs.length) return 'doi'; let doi = false;
  for (const f of fs) { let kt; try { kt = exportCheck(jobView(o, f)); } catch (e) { continue; } if (kt.chan.length) return 'chan'; if (kt.doi.length) doi = true; }
  return doi ? 'doi' : 'du';
}
let sideSfInst = null;   // tạo riêng (09 chạy trước 35 nên chưa dùng được hakSfGet)
function sideSfState() { return sideSfInst || (sideSfInst = HAKSmartFilter.createFilter(sideSfCfg())); }
function sideSfSet(k, v) {
  const f = sideSfState(), st = f.getState(), one = Object.assign({}, st.one); if (v) one[k] = v; else delete one[k];
  f.setState(HAKCore.sf.normalize(Object.assign({}, st, {one}), sideSfCfg()));
}
function renderSide() {
  /* 3.5.1: chủ rừng còn trống hoàn toàn (bấm “+ Chủ rừng mới” rồi bỏ đi, chưa nhập gì, chưa có lô) không để lại dòng “(chưa đặt tên)” ở cột trái: dọn khi không còn là chủ rừng đang mở */
  { const rong = Object.keys(db.rs).filter(id => id !== NAV.cur && !forestList(db.rs[id]).length && !trim(db.rs[id].info.ten) && !trim(db.rs[id].info.cccd) && !trim(db.rs[id].info.ma) && !(typeof chuNhap !== 'undefined' && chuNhap.has(id)));
    if (rong.length) { rong.forEach(id => { delete db.rs[id]; }); try { persist(); } catch (e) { /* chưa sẵn sàng lưu: lần vẽ sau sẽ dọn tiếp */ } } }
  const f = sideSfState(), st0 = f.getState(); if (st0.q !== sideQ) f.setState(HAKCore.sf.normalize(Object.assign({}, st0, {q: sideQ}), sideSfCfg()));
  const st = f.getState(), dang = HAKCore.sf.activeCount(st) > 0;
  document.querySelectorAll('#sideSf [data-sbsf]').forEach(sel => { sel.value = (st.one || {})[sel.dataset.sbsf] || ''; });
  const xoa = document.getElementById('sideSfXoa'); if (xoa) xoa.hidden = !dang;
  const kept = new Set(sideSfState().filter(Object.values(db.rs)).rows);   // hàng lọc chính là đối tượng chủ rừng trong db.rs
  const ids = Object.keys(db.rs).sort((a, b) => db.rs[a].info.ten.localeCompare(db.rs[b].info.ten, 'vi')).filter(id => kept.has(db.rs[id]) || id === NAV.cur);
  $('#sideList').innerHTML =
    '<button class="btn" style="width:100%;margin-bottom:10px" data-act="newRs">+ Chủ rừng mới</button>' +
    (ids.length ? ids.map(id => {
      const r = db.rs[id];
      const kids = id === NAV.cur ? forestList(r).map(f => '<button class="item sub ' + (f.id === NAV.curF ? 'on' : '') + '" data-sforest="' + f.id + '"><b>' + esc(f.info.tenRung || f.info.maRung || '(rừng chưa đặt tên)') + '</b><small>' + esc(f.info.maRung || '') + '</small></button>').join('') : '';
      return '<button class="item ' + (id === NAV.cur ? 'on' : '') + '" data-open="' + id + '"><b>' + (id === NAV.cur ? '▾ ' : '▸ ') + esc(r.info.ten || '(chưa đặt tên)') +
        '</b><small>Mã ' + esc(r.info.ma) + ' · ' + forestList(r).length + ' rừng</small></button>' + (kids ? '<div class="subs">' + kids + '</div>' : '');
    }).join('') : (dang ? '<p class="mut">Không có chủ rừng khớp bộ lọc.</p>' : '<p class="mut">Chưa có chủ rừng. Bấm “+ Chủ rừng mới”.</p>')) + '';
}

function renderMsgs() {
  const parts = [];
  if (!storeOk) parts.push(HB ? '<div class="msg err">Lần ghi gần nhất vào cơ sở dữ liệu trên máy bị lỗi. Dữ liệu đã lưu trước đó vẫn còn nguyên; hãy thử lưu lại và sao lưu toàn bộ dữ liệu.</div>' : '<div class="msg err">Trình duyệt không lưu được dữ liệu (có thể đã đầy hoặc bị chặn). Hãy bấm “Sao lưu dữ liệu (.json)” thường xuyên.</div>');
  notes.forEach(n => parts.push('<div class="msg ' + n.kind + '">' + esc(n.text) + '</div>'));
  notes = [];
  return parts.join('');
}

function renderMain() {
  if (NAV.view === 'dm') NAV.view = 'setdt';
  const DM30 = {setdt: panelSetDt, setxe: panelSetXe, setvt: panelSetVt, setnv: panelSetNv, cty: panelCty};
  if (DM30[NAV.view]) { $('#main').innerHTML = renderMsgs() + danhMucFrame(NAV.view, DM30[NAV.view]()); return; }
  const P30 = {setgd: panelSetGd, sethd: panelSetHd, setcan: panelSetCan};
  if (P30[NAV.view]) { $('#main').innerHTML = renderMsgs() + settingsFrame(NAV.view, P30[NAV.view]()); return; }
  if (NAV.view === 'bld') { $('#main').innerHTML = renderMsgs() + panelBanLamViec(); return; }
  if (NAV.view === 'norm') { $('#main').innerHTML = renderMsgs() + panelNorm(); return; }
  if (NAV.view === 'settings') { $('#main').innerHTML = renderMsgs() + settingsFrame('settings', panelSettings()); settingsLoad(); return; }
  if (NAV.view === 'setbk') { $('#main').innerHTML = renderMsgs() + settingsFrame('setbk', panelKhoSaoLuu()); kslLoad(); return; }
  if (NAV.view === 'setgs') { $('#main').innerHTML = renderMsgs() + settingsFrame('setgs', panelSetGs()); return; }
  if (NAV.view === 'setfmt') { $('#main').innerHTML = renderMsgs() + settingsFrame('setfmt', panelSetFmt()); return; }
  const own = curOwner();
  if (!own) {
    $('#main').innerHTML = renderMsgs() + panelHome();
    return;
  }
  const tabs = [['info', 'Thông tin chủ rừng'], ['rung', 'Rừng (' + forestList(own).length + ')']];
  const chuTabs = ds => ds.map(([k, l]) => '<button class="' + (NAV.tab === k ? 'on' : '') + '" data-tab="' + k + '">' + l + '</button>').join('');
  const trongRung = NAV.tab === 'rung' && !!curForest();
  $('#main').innerHTML = renderMsgs() +
    (trongRung ? '' : '<div class="row" style="justify-content:space-between"><div><h2>' + esc(own.info.ten || '(chưa đặt tên)') + '</h2><div class="mut">Mã ' + esc(own.info.ma) + '</div></div>' +
    '<button class="btn danger sm" data-act="delRs">Xóa chủ rừng</button></div>') +
    (trongRung ? '' : '<div class="tabs">' + chuTabs(tabs) + '</div>') +   // phiếu #10: đang mở lô thì tab chủ rừng nằm trong hàng đầu lô (panelRung)
    (NAV.tab === 'info' ? panelInfo(own) : panelRung(own, trongRung ? chuTabs(tabs) : ''));
}

function checklistRung(job) {
  const g = gateRaw(job), ex = job.exp || {}, i = job.info, pay = payrollPlan(job, ex);
  const L = [];
  const add = (ok, label, hint, warn) => L.push({ok, label, hint: ok ? '' : hint, warn: !ok && !!warn});
  add(!g.info.length, 'Thông tin rừng đầy đủ', g.info.join('; '));
  add(i.lat != null && i.lng != null, 'Tọa độ lô khai thác (FSC)', 'Chưa nhập tọa độ');
  add((i.giayTo || []).length > 0, 'Giấy tờ pháp lý đất/rừng', 'Chưa khai giấy tờ');
  add(!!(i.tuNgay && i.denNgay), 'Thời gian khai thác', 'Thiếu từ ngày/đến ngày');
  add(job.nc.length > 0 && !g.nc.errs.length, 'Nhân công hợp lệ', job.nc.length ? g.nc.errs.length + ' lỗi' : 'Chưa nạp file nhân công');
  add(!pay.issues.length, 'Hình thức, đơn giá lương', pay.issues.join('; '), true);
  add(job.nc.length > 0 && !g.normErrs.length, 'Định mức BHLĐ theo vị trí', g.normErrs.join('; ') || 'Chưa có nhân công');
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
const progressOf = job => nhoTam('tienDo', job, () => { const L = checklistRung(job); return {L, pct: Math.round(100 * L.filter(x => x.ok).length / L.length)}; });   // nhớ tạm theo phiên bản dữ liệu (B7)
function panelTienDo(job) {
  const {L, pct} = progressOf(job);
  return '<div class="card"><div class="row" style="justify-content:space-between"><h3 style="margin:0">Tiến độ hồ sơ rừng · checklist FSC</h3><b>' + pct + '%</b></div>' +
    '<div class="prog"><i style="width:' + pct + '%"></i></div><div class="chk">' +
    L.map(x => '<div class="' + (x.ok ? '' : x.warn ? 'wn' : 'no') + '"><b>' + (x.ok ? '' : x.warn ? '!' : '✕') + '</b><span>' + esc(x.label) + (x.hint ? '<small>' + esc(x.hint) + '</small>' : '') + '</span></div>').join('') + '</div></div>';
}

