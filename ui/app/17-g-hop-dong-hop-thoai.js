/* ========== Hộp thoại Cha–Con của một hợp đồng: Cha = các rừng theo thứ tự nhập; Con = Hồ sơ rừng | Tọa độ | Phiếu cân ==========
 * Dữ liệu từ lookup:buildHd(hợp đồng). Phân bổ phiếu: src/phanbophieu.js; nghi đổi số: src/doiso.js. Ghi vào hồ sơ: gsApply (17-h), dùng cùng hàm tạo chủ rừng/lô với lkApply.
 * Trạng thái chọn nằm trong gs.m (không lưu); mọi chuỗi từ Sheet đi vào HTML đều qua esc(). */
const GS_PC_PAGE = 12;
const gsSame = (a, b) => (a == null || a === '' ? '' : String(a)).trim() === (b == null || b === '' ? '' : String(b)).trim();
const gsEmpty = v => v == null || v === '';
const GS_CHUA = {'het-du-kien': 'đã hết dự kiến của các rừng', 'thieu-du-kien': 'rừng thiếu hecta/định mức nên không tự nhận phiếu', 'khong-co-rung': 'hợp đồng chưa có rừng', 'nguoi-dung-bo': 'bạn đã bỏ phân bổ', 'trung-nguon': 'trùng khóa trên Sheet', 'thieu-ngay': 'thiếu ngày cân', 'thieu-so': 'thiếu số phiếu', 'thieu-kl': 'thiếu khối lượng', 'kg-khong-hop-le': 'khối lượng không hợp lệ', 'rung-khong-ton-tai': 'rừng không tồn tại'};
const GS_PST = {new: ['Mới', 'new'], upd: ['Đổi', 'chg'], same: ['Trùng — bỏ qua', 'dup'], dsn: ['Nghi đổi số', 'chg'], doiso: ['Đổi số', 'chg'], lech: ['Lệch CCCD', 'bad'], issue: ['Cần kiểm tra', 'bad'], alias: ['Cần ghép tên xe', 'bad'], dup: ['Trùng trên Sheet', 'dup']};

/* Ghép phần HoSoRung của rừng F với phần ToaDoRung (mã rừng, tọa độ, giấy tờ) của rừng Tf (QĐ10: đổi tay mã rừng). Phân biệt theo nguồn (src.tab) của từng trường. */
function gsCompose(F, Tf) {
  const isR = x => x && x.src && x.src.tab === 'HoSoRung_QC', isT = x => x && x.src && x.src.tab === 'ToaDoRung_QC';
  const fR = F.fields.filter(isR), have = new Set(fR.map(x => x.key));
  const fT = Tf ? Tf.fields.filter(x => isT(x) && x.key !== 'maRung' && !have.has(x.key)) : [];
  const area = F.area.filter(isR).concat(Tf ? Tf.area.filter(isT) : []);
  const areaConflict = area.length === 2 && Math.abs(area[0].value - area[1].value) > 0.0001;
  const tDocs = Tf ? Tf.docs.filter(isT) : [], docs = tDocs.length ? tDocs : F.docs.filter(isR);
  const rRef = F.ref.filter(isR), tRef = Tf ? Tf.ref.filter(x => isT(x) && (x.key === 'ID_RUNG' || (!rRef.length && x.key === 'hd:Số hợp đồng'))) : [];
  return {maRung: Tf ? Tf.maRung : '', fields: fR.concat(fT), area, areaConflict, gps: Tf ? Tf.gps : [], docs, ref: rRef.concat(tRef)};
}
/* Các rừng hiệu lực theo thứ tự nhập (thứ tự trên Sheet). m.tOf[k] = rừng cung cấp phần ToaDoRung cho rừng k (-1: chưa có mã rừng); m.manual[k] = mã rừng gõ tay (không có trên ToaDoRung) */
function gsEff() {
  const m = gs.m, d = m.d, out = [];
  d.forests.forEach((F, k) => {
    const j = m.tOf[k], Tf = j >= 0 ? d.forests[j] : null, man = m.manual[k] || '';
    if (F.dong == null && !Tf && !man) return;   // khung rỗng: mã rừng của ToaDoRung đã gán cho rừng khác
    const X = gsCompose(F, Tf), code = man || X.maRung || '', tam = !!F.ghepTam && !m.conf[k] && j === k && !man;
    out.push({k, id: 'r' + k, F, Tf, X, code, tam, ok: !!code && !tam});
  });
  return out;
}
const gsEffOf = k => gsEff().find(e => e.k === k) || null;
/* Lô đích của một rừng (theo mã rừng) và bản nháp của lô */
function gsTarget(e) {
  const h = e.code ? HAKLoRung.lotsByMa(db, e.code)[0] : null;
  if (!h || !db.rs[h.owner] || !db.rs[h.owner].forests[h.forest]) return {exists: false, o: null, f: null, pc: [], dx: [], giay: [], oi: {}, fi: {}};
  const o = db.rs[h.owner], f = o.forests[h.forest], st = (f.pc || []).length ? stGetFor(o.id, f.id, true) : stages[stKeyOf(o.id, f.id)];
  return {exists: true, o, f, st, pc: st ? st.cur.pc : (f.pc || []), dx: st ? st.cur.dx : (f.dx || []), giay: f.info.giayTo || [], oi: o.info, fi: f.info};
}
/* Chủ rừng đích của hợp đồng + kiểm tra R6 (CCCD chủ rừng trong app khác CCCD hợp đồng: không ghi, không tự đổi chủ) */
function gsOwnerCheck(eff) {
  const d = gs.m.d, owners = new Map();
  eff.forEach(e => { const t = gsTarget(e); if (t.exists) owners.set(t.o.id, t.o); });
  let o = null, err = '';
  if (owners.size > 1) err = 'Các rừng của hợp đồng ' + d.hd + ' đang thuộc ' + owners.size + ' chủ rừng khác nhau trong ứng dụng (' + [...owners.values()].map(x => x.info.ten || x.info.ma).join('; ') + '): không ghi, hãy gom về một chủ rừng trước.';
  else if (owners.size === 1) o = [...owners.values()][0];
  else { const c = gsDigits(d.cccd); if (c) o = Object.values(db.rs).find(x => gsDigits(x.info.cccd) === c) || null; }
  if (o && !err && o.info.cccd && (d.cccdList || []).length && !d.cccdList.some(c => gsDigits(c) === gsDigits(o.info.cccd)))
    err = 'Chủ rừng “' + (o.info.ten || o.info.ma || '') + '” trong ứng dụng có CCCD ' + gsMask(o.info.cccd) + ' khác CCCD của hợp đồng ' + d.hd + ' (' + d.cccdList.map(gsMask).join(', ') + '): không ghi, không tự đổi chủ rừng.';
  return {o, err};
}
const gsAliasOf = raw => ((db.bienAlias || {})[foldVi(raw)]) || (gs.m.alias || {})[foldVi(raw)] || '';

/* ----- Phiếu cân của hợp đồng: trạng thái từng dòng Sheet so với lô đã có (mới / đổi / trùng / nghi đổi số / lệch CCCD / lỗi / cần ghép xe) ----- */
function gsLots(eff) {
  const out = [];
  eff.forEach(e => { const t = gsTarget(e); if (t.exists) t.pc.forEach(p => out.push({p, k: e.k, lo: t.f.info.maRung || '', loId: t.f.id, oId: t.o.id})); });
  return out;
}
function gsRows() {
  const m = gs.m, d = m.d, eff = gsEff(), lots = gsLots(eff), B = HAKBks, byId = new Map(lots.map(x => [x.p._id, x]));
  const seen = new Set();
  const rows = d.phieu.map((p, idx) => {
    const kp = B.khoaPhieu({soPhieu: p.soPhieu, ngay: p.ngay}), raw = String(p.bienRaw || ''), bien = p.isPlate ? raw.toUpperCase() : gsAliasOf(raw);
    const r = {key: String(p.row), idx, p, kp, bien, st: 'new', note: '', ex: null, ung: null};
    if (p.lechCccd) { r.st = 'lech'; r.note = 'CCCD của dòng này khác CCCD hợp đồng: không phân bổ, không ghi'; }
    else if (p.issue) { r.st = 'issue'; r.note = p.issue; }
    else if (!B.soPhieu(p.soPhieu)) { r.st = 'issue'; r.note = 'Thiếu số phiếu'; }
    else if (kp && seen.has(kp)) { r.st = 'dup'; r.note = 'Trùng số phiếu + ngày với một dòng khác trên Sheet'; }
    else if (!bien) { r.st = 'alias'; r.note = 'Cần ghép tên xe “' + raw + '” với biển số'; }
    if (kp && r.st !== 'dup') seen.add(kp);
    return r;
  });
  const cand = rows.filter(r => r.st === 'new');
  if (cand.length) {
    const sheet = cand.map(r => ({idx: r.idx, so: r.p.soPhieu, ngay: r.p.ngay, bks: r.bien, kg: r.p.klKg}));
    const lo = lots.map(x => ({id: x.p._id, so: x.p.soPhieu, ngay: x.p.ngay, bks: x.p.bienSo, kg: typeof x.p.klKg === 'number' ? x.p.klKg : Math.round((x.p.kl || 0) * 1000), soCu: x.p.soCu, lo: x.lo}));
    const det = HAKDoiSo.phatHienDoiSo(sheet, lo);
    if (det.loi) m.detLoi = det.loi; else m.detLoi = '';
    (det.ketQua || []).forEach(k => {
      const r = rows[k.idx]; if (!r) return;
      if (k.tt === 'trung' || k.tt === 'trung-so-cu') {
        const x = byId.get(k.loId); r.ex = x ? x.p : null; r.exLot = x || null;
        if (k.tt === 'trung-so-cu') { r.st = 'same'; r.note = 'Đã có (số cũ của ' + (r.ex ? r.ex.soPhieu : '?') + ') — bỏ qua'; return; }
        const e0 = r.ex, p = r.p;
        const bienDoi = !!(e0 && r.bien && bienKey(e0.bienSo) !== bienKey(r.bien));
        const thieuThem = !!(e0 && ((!e0.gioCan1 && p.gioCan1) || (!e0.gioCan2 && p.gioCan2) || (e0.can1 == null && p.can1 != null) || (e0.can2 == null && p.can2 != null) || (e0.klKg == null && p.klKg != null) || (!e0.khachHang && p.khachHang) || (e0.donGia == null && p.donGia != null) || (e0.thanhTien == null && p.thanhTien != null)));
        const eq = e0 && !bienDoi && Math.abs((e0.kl || 0) - p.kl) < 1e-9;
        r.bienDoi = bienDoi;
        if (eq && !thieuThem) { r.st = 'same'; r.note = 'Đã có trong hồ sơ — bỏ qua'; }
        else { r.st = 'upd'; r.note = bienDoi ? 'Biển số khác: ' + (e0.bienSo || '(chưa có)') + ' → ' + r.bien : thieuThem ? 'Bổ sung giờ cân, cân lần 1/2, khách hàng, đơn giá… từ Sheet' : 'Đã có số phiếu này nhưng khác dữ liệu — chọn để cập nhật'; }
      } else if (k.tt === 'nghi-doi-so') {
        r.ung = k.ungVien || []; r.nhieuHon = !!k.nhieuHon; r.canhTranh = !!k.canhTranh;
        const dec = m.dsn[r.key];
        if (dec && dec.act === 'khac') { r.st = 'new'; r.note = 'Là chuyến khác (thêm mới)'; }
        else if (dec && dec.act === 'doi') { r.st = 'doiso'; r.uv = r.ung.find(u => u.id === dec.uv) || r.ung[0]; r.exLot = (r.uv && byId.get(r.uv.id)) || null; r.note = 'Đổi số ' + (r.uv ? r.uv.so : '?') + ' → ' + r.p.soPhieu + ' (giữ nguyên phiếu)'; }
        else { r.st = 'dsn'; r.note = 'Nghi đổi số: chọn “Đổi số” hoặc “Là chuyến khác”; mặc định không ghi'; }
      } else if (k.tt === 'khong-xet') { r.st = 'issue'; r.note = 'Thiếu số phiếu hoặc ngày cân'; }
      else {
        const no = B.soPhieu(r.p.soPhieu), samNo = lots.find(x => B.soPhieu(x.p.soPhieu) === no);
        if (samNo) r.note = 'Cùng số phiếu với phiếu đã có ngày ' + (samNo.p.ngay || '?') + ' nhưng khác ngày cân: hợp lệ nếu là chuyến khác';
      }
    });
  }
  rows.sort((a, b) => (HAKDates.key(a.p.ngay) || 0) - (HAKDates.key(b.p.ngay) || 0) || String(a.p.soPhieu).localeCompare(String(b.p.soPhieu), 'vi', {numeric: true}) || a.p.row - b.p.row);
  return rows;
}
/* kg đã có trong lô đích + kg các phiếu mới đang tích và phân bổ vào rừng này */
function gsUsed(e, rows) {
  const m = gs.m, t = gsTarget(e); let dadung = 0, them = 0;
  t.pc.forEach(p => { dadung += typeof p.klKg === 'number' && p.klKg > 0 ? Math.round(p.klKg) : Math.round((p.kl || 0) * 1000); });
  rows.forEach(r => { if (r.st === 'new' && m.as[r.key] === e.k && m.sp[r.key]) them += Math.round(r.p.klKg || 0); });
  return {dadung, them, tong: dadung + them};
}
/* Phân bổ phiếu mới vào rừng (hàm thuần src/phanbophieu.js). keepTay=false: xóa mọi đổi tay rồi tính lại cả hợp đồng. */
function gsAlloc(keepTay) {
  const m = gs.m, eff = gsEff(); if (!keepTay) m.tay.clear();
  const rows = gsRows(), news = rows.filter(r => r.st === 'new');
  Object.keys(m.as).forEach(k => { if (!news.some(r => r.key === k)) delete m.as[k]; });
  const rungs = eff.map(e => ({id: e.id, ha: e.ok ? e.F.hecta : null, dinhMuc: e.ok ? e.F.dinhMuc : null}));
  const daDung = eff.map(e => ({rungId: e.id, kg: gsUsed(e, []).dadung})).filter(x => x.kg > 0);
  const phieu = news.map(r => ({key: r.key, so: r.p.soPhieu, ngay: r.p.ngay, kg: r.p.klKg, row: r.p.row, rungTay: m.tay.has(r.key) ? (m.as[r.key] >= 0 ? 'r' + m.as[r.key] : '') : undefined}));
  const res = HAKPhanBoPhieu.phanBoPhieu(phieu, rungs, m.tol / 100, daDung, {});
  news.forEach(r => { m.as[r.key] = -1; }); m.chua = {};
  if (!res.ok) { m.al = null; m.msg = {kind: 'err', text: 'Không phân bổ được: ' + (res.loi === 'dung-sai' ? 'dung sai phải từ 0 đến 30 %.' : res.loi)}; return; }
  res.gan.forEach(g => { m.as[g.key] = +String(g.rungId).slice(1); });
  res.chuaPhanBo.forEach(c => { m.chua[c.key] = c.lyDo; });
  m.al = res;
}
/* “Phân bổ phiếu còn lại vào rừng N”: phiếu mới chưa có rừng vào rừng N chừng nào còn trong dự kiến + dung sai; rừng cuối (hoặc rừng chưa tính được dự kiến) nhận hết */
function gsFillOne(k) {
  const m = gs.m, eff = gsEff(), e = eff.find(x => x.k === k); if (!e) return 0;
  const rows = gsRows(), last = eff[eff.length - 1] === e, du = e.ok ? e.F.duKienKg : null, lim = du == null ? null : du + Math.floor(du * Math.round(m.tol * 10) / 1000);
  let cum = gsUsed(e, rows).tong, n = 0;
  rows.filter(r => r.st === 'new' && m.as[r.key] === -1).forEach(r => { const kg = Math.round(r.p.klKg || 0); if (last || lim == null || cum + kg <= lim) { m.as[r.key] = k; m.tay.add(r.key); cum += kg; n++; } });
  return n;
}

/* ----- Lựa chọn mặc định ----- */
function gsInitSel(k) {
  const m = gs.m, e = gsEffOf(k); if (!e) return;
  const T = gsTarget(e), X = e.X, s = {on: [true, true, true], f: {}, area: 'skip', gps: 'skip', docs: {}, ref: true};
  X.fields.forEach(x => { if (x.key !== 'maRung') s.f[x.key] = gsEmpty(T.fi[x.key]); });
  if (X.area.length) { if (!X.areaConflict && gsEmpty(T.fi.dienTich)) s.area = 0; }
  const ok = X.gps.map((g, i) => g.ok ? i : -1).filter(i => i >= 0);
  if (ok.length === 1 && gsEmpty(T.fi.lat)) s.gps = ok[0];
  X.docs.forEach((dd, i) => { s.docs[i] = !T.giay.some(g => g.loai === dd.loai && (gsSame(g.so, dd.so) || !dd.so)); });
  m.sel[k] = s;
}
function gsInitOwner() {
  const m = gs.m, oc = gsOwnerCheck(gsEff()), oi = oc.o ? oc.o.info : {}; m.own = {};
  m.d.owner.fields.forEach(x => { m.own[x.key] = gsEmpty(oi[x.key]); });
}
function gsDefaults() {   // “Chọn phần mới”: chỉ mục mới, trường trống, điểm tọa độ duy nhất; không tích lệch CCCD, nghi đổi số, trường đã có giá trị khác
  const m = gs.m; m.sel = []; gsInitOwner(); gsEff().forEach(e => gsInitSel(e.k));
  gsRows().forEach(r => { m.sp[r.key] = r.st === 'new' || (r.st === 'upd' && !!r.bienDoi); });
}
function gsNewState(d) {
  const m = {d, tab: 'ho', rg: 0, showSame: false, tol: 5, tay: new Set(), as: {}, sp: {}, sel: [], own: {}, tOf: d.forests.map((_, i) => i), manual: {}, conf: {}, dsn: {}, alias: {}, pcF: 'all', pcQ: '', page: 0, sum: null, ack: false, msg: null, busy: false, chua: {}, al: null, detLoi: ''};
  gs.m = m; const f0 = gsEff()[0]; m.rg = f0 ? f0.k : 0;
  gsAlloc(false); gsDefaults(); return m;
}
function gsSetCode(k, val) {
  const m = gs.m, v = String(val || '').trim(), codes = m.d.forests.map((F, j) => ({j, code: F.maRung})).filter(x => x.code), hit = codes.find(x => x.code.toUpperCase() === v.toUpperCase());
  const cur = m.tOf[k];
  if (!v) { m.tOf[k] = -1; delete m.manual[k]; }
  else if (hit) { const h = m.tOf.findIndex(x => x === hit.j); m.tOf[k] = hit.j; if (h >= 0 && h !== k) m.tOf[h] = cur; delete m.manual[k]; }
  else { m.tOf[k] = -1; m.manual[k] = v.slice(0, 64); }
  m.conf[k] = true; gsEff().forEach(e => gsInitSel(e.k)); gsAlloc(true);
}

/* ----- Mở / đóng ----- */
function gsOpen(d, opener) {
  gs.opener = opener || document.activeElement; gsNewState(d);
  const b = $('#hdBox'); b.classList.add('on'); gsRender(); const f = b.querySelector('[data-act=gsClose]'); if (f) f.focus();
}
function gsClose() {
  const b = $('#hdBox'); if (!b.classList.contains('on')) return;
  b.classList.remove('on'); $('#hdBody').innerHTML = '';
  const m = gs.m; gs.m = null;
  gsRefreshList();
  let o = gs.opener; gs.opener = null;
  if (!o || !o.isConnected) { const key = m && gsKey(m.d.hd); o = key ? [...document.querySelectorAll('[data-gsrow]')].find(x => x.dataset.gsrow === key) : null; }
  if (o && o.focus) o.focus();
}

/* ----- Vẽ ----- */
const gsNum = v => numTxt(v);
function gsMeter(e, rows) {
  const u = gsUsed(e, rows), du = e.F.duKienKg, p = du ? Math.min(100, Math.round(u.tong / du * 100)) : 0, cls = du && u.tong > du ? 'over' : p >= 90 ? 'near' : '';
  const txt = du ? gsTan(u.tong) + ' / ' + gsTan(du) + ' t dự kiến' + (u.tong > du ? ' · vượt ' + gsTan(u.tong - du) + ' t' : '') : gsTan(u.tong) + ' t · chưa tính được dự kiến';
  return '<div class="gsMeter" role="progressbar" aria-valuemin="0" aria-valuemax="' + (du ? Math.round(du / 10) / 100 : 0) + '" aria-valuenow="' + Math.round(u.tong / 10) / 100 + '" aria-label="' + esc('Đã dùng ' + gsTan(u.tong) + ' tấn' + (du ? ' trên dự kiến ' + gsTan(du) + ' tấn' : ', chưa có dự kiến')) + '"><i class="' + cls + '" style="width:' + p + '%"></i></div>' +
    '<span class="gsMeterTxt' + (cls === 'over' ? ' over' : '') + '">' + esc(txt) + '</span>';
}
function gsCount(e, rows) {
  const m = gs.m, s = m.sel[e.k]; if (!s) return {f: 0, g: 0, p: 0, d: 0};
  const T = gsTarget(e); let f = 0, g = 0, dd = 0;
  if (s.on[0]) { e.X.fields.forEach(x => { if (x.key !== 'maRung' && s.f[x.key] && !gsSame(T.fi[x.key], x.value)) f++; }); if (typeof s.area === 'number') f++; e.X.docs.forEach((_, i) => { if (s.docs[i]) dd++; }); }
  if (s.on[1] && typeof s.gps === 'number') g++;
  const p = s.on[2] ? gsWriteRows(rows, e).length : 0;
  return {f, g, p, d: dd};
}
/* phiếu sẽ ghi vào rừng e: mới (đã phân bổ vào e, đã tích), đổi (thuộc lô của e, đã tích) */
function gsWriteRows(rows, e) {
  const m = gs.m;
  return rows.filter(r => m.sp[r.key] && ((r.st === 'new' && m.as[r.key] === e.k) || ((r.st === 'upd' || r.st === 'doiso') && r.exLot && r.exLot.k === e.k)));
}
function gsChaHtml(eff, rows) {
  const m = gs.m;
  if (!eff.length) return '<div class="gsMaster" id="gsMaster"><h3>Rừng của hợp đồng</h3><p class="mut">Hợp đồng chưa có dòng HoSoRung hay ToaDoRung nên chưa có rừng để ghi.</p></div>';
  return '<div class="gsMaster" id="gsMaster"><h3>Rừng của hợp đồng (' + eff.length + ') — thứ tự nhập</h3>' + eff.map((e, i) => {
    const c = gsCount(e, rows), n = c.f + c.g + c.p + c.d, t = gsTarget(e), ten = ((e.X.fields.find(x => x.key === 'diaDiem') || {}).value) || '';
    return '<button type="button" class="gsRc' + (e.k === m.rg ? ' on' : '') + '" data-gsrg="' + e.k + '" aria-current="' + (e.k === m.rg) + '"><b>Rừng ' + (i + 1) + ': ' + esc(e.code || 'chưa có mã rừng') + '<span class="gsBdg" title="Số thay đổi sẽ ghi" aria-label="' + n + ' thay đổi sẽ ghi">' + n + '</span></b>' +
      '<span class="gsS">' + esc(ten) + '</span>' + (e.tam ? '<span class="pill warn">ghép tạm — cần xác nhận</span>' : '') + (!e.code ? '<span class="pill err">chưa có mã rừng</span>' : '') +
      '<span class="gsS">' + (t.exists ? 'Lô đã có: ' + esc(t.f.info.tenRung || t.f.info.maRung) : e.code ? 'Chưa có lô — sẽ tạo lô mới' : '') + '</span>' + gsMeter(e, rows) + '</button>';
  }).join('') + '</div>';
}
function gsFieldTable(fields, cur, grp, sel, skipKey) {
  const m = gs.m; let same = 0;
  const rows = fields.filter(x => x.key !== skipKey).map(x => {
    const cv = cur[x.key], eq = gsSame(cv, x.value); if (eq) same++;
    if (eq && !m.showSame) return '';
    const st = eq ? '<span class="gsSame">Giống nhau</span>' : gsEmpty(cv) ? '<span class="tg new">Điền vào ô trống</span>' : '<span class="tg chg">Khác — chọn nếu muốn đổi</span>';
    return '<tr class="' + (!eq && !gsEmpty(cv) ? 'diff' : '') + '"><td><input type="checkbox" data-gsf="' + grp + '|' + esc(x.key) + '" aria-label="Cập nhật ' + esc(x.label) + '"' + (sel[x.key] && !eq ? ' checked' : '') + (eq ? ' disabled' : '') + '></td><td>' + esc(x.label) + '</td><td>' + (gsEmpty(cv) ? '<span class="gsSame">(trống)</span>' : esc(cv)) + '</td><td><b>' + gsNum(x.value) + '</b></td><td>' + st + '</td></tr>';
  }).join('');
  return {same, html: '<div class="wrap gsTblW"><table><thead><tr><th></th><th>Trường</th><th>Trong hồ sơ</th><th>Trên Sheet</th><th>Kết luận</th></tr></thead><tbody>' + (rows || '<tr><td colspan="5" class="mut">Không có trường nào khác nhau.</td></tr>') + '</tbody></table></div>'};
}
function gsTabHo(e) {
  const m = gs.m, d = m.d, s = m.sel[e.k], T = gsTarget(e), oc = gsOwnerCheck(gsEff()), oi = oc.o ? oc.o.info : {};
  const ow = gsFieldTable(d.owner.fields, oi, 'own', m.own), fo = gsFieldTable(e.X.fields, T.fi, 'fo', s.f, 'maRung');
  const codes = [...new Set(d.forests.map(F => F.maRung).filter(Boolean))];
  const du = e.F.duKienKg, hint = e.F.hecta != null && e.F.dinhMuc != null ? 'Dự kiến = ' + numTxt(e.F.hecta) + ' ha × ' + numTxt(e.F.dinhMuc) + ' tấn/ha = <b>' + gsTan(du) + ' t</b>' : '<span class="tgWarn">Không tính được dự kiến (thiếu hecta hoặc định mức)</span>';
  const how = e.F.ghep ? ({hecta: 'hecta', 'dia-chi': 'địa chỉ rừng', 'thu-tu': 'thứ tự xuất hiện'}[e.F.ghep] || e.F.ghep) : '';
  const area = e.X.area.length ? '<div class="gsArea"><label>Diện tích (ha) — trong hồ sơ: ' + (gsEmpty(T.fi.dienTich) ? '(trống)' : esc(T.fi.dienTich)) + '<select data-gsarea aria-label="Giá trị diện tích">' + e.X.area.map((a, i) => '<option value="' + i + '"' + (s.area === i ? ' selected' : '') + '>' + esc(a.label) + '</option>').join('') +
    '<option value="skip"' + (s.area === 'skip' ? ' selected' : '') + '>Không điền</option></select></label>' + (e.X.areaConflict ? '<span class="pill err">hai nguồn khác nhau — chọn giá trị đúng</span>' : '') + '</div>' : '';
  const docs = e.X.docs.length ? '<h4>Giấy tờ nguồn gốc</h4><div class="wrap gsTblW"><table><thead><tr><th></th><th>Loại</th><th>Tên</th><th>Số</th><th>Ngày</th><th>Nguồn</th></tr></thead><tbody>' + e.X.docs.map((dd, i) => '<tr><td><input type="checkbox" data-gsdoc="' + i + '" aria-label="Thêm giấy tờ ' + esc(dd.so || dd.loai) + '"' + (s.docs[i] ? ' checked' : '') + '></td><td>' + esc(dd.loai) + '</td><td>' + esc(dd.ten) + '</td><td>' + esc(dd.so) + '</td><td>' + esc(dd.ngayCap) + '</td><td class="mut">' + srcTxt(dd.src) + (s.docs[i] ? '' : ' · đã có trong hồ sơ') + '</td></tr>').join('') + '</tbody></table></div>' : '';
  const ref = d.owner.ref.length + e.X.ref.length ? '<label class="gsInl"><input type="checkbox" data-gsref' + (s.ref ? ' checked' : '') + '> Lưu phần tham chiếu (hợp đồng, ID_RUNG…) vào hồ sơ rừng để đối chiếu</label>' : '';
  return '<div class="gsBlk"><div class="gsBh"><b>Hồ sơ rừng ' + esc(e.code || '') + '</b><label class="gsInl"><input type="checkbox" data-gson="0"' + (s.on[0] ? ' checked' : '') + '> Cập nhật khối này</label></div>' +
    '<div class="gsMa"><label>Mã rừng <input data-gscode="' + e.k + '" list="gsCodes" value="' + esc(e.code) + '" size="18" placeholder="chưa có mã rừng" aria-label="Mã rừng của rừng này (ghép với ToaDoRung)"></label><datalist id="gsCodes">' + codes.map(c => '<option value="' + esc(c) + '">').join('') + '</datalist>' +
      (e.F.dong != null ? '<span class="mut">HoSoRung dòng ' + e.F.dong + '</span>' : '<span class="mut">Chỉ có ở ToaDoRung</span>') + (e.tam ? '<span class="pill warn">ghép tạm' + (how ? ' theo ' + esc(how) : '') + ' — cần xác nhận</span> <button type="button" class="btn sm" data-act="gsConf" data-k="' + e.k + '">Xác nhận ghép</button>' : '') +
      (!e.code ? '<span class="pill err">chưa có mã rừng — rừng này chưa nhận phiếu và chưa ghi được</span>' : '') + '</div>' +
    '<div class="gsHid">' + hint + ' · Vào lô: <b>' + (T.exists ? esc(T.f.info.tenRung || T.f.info.maRung) : e.code ? 'tạo lô mới ' + esc(e.code) : '—') + '</b> · ' + fo.same + ' trường giống nhau ' + (m.showSame ? 'đang hiện' : 'đang ẩn') + ' <button type="button" class="linkbtn" data-act="gsSame">' + (m.showSame ? 'Ẩn' : 'Hiện') + '</button></div>' +
    '<div' + (s.on[0] ? '' : ' class="gsOff"') + '><h4>Chủ rừng (chung cho hợp đồng)' + (oc.o ? ': ' + esc(oc.o.info.ten || '') : ' — chưa có trong ứng dụng, sẽ tạo mới') + '</h4>' + ow.html + '<h4>Thông tin rừng</h4>' + fo.html + area + docs + ref + '</div></div>';
}
function gsTabGps(e) {
  const m = gs.m, s = m.sel[e.k], T = gsTarget(e), G = e.X.gps;
  const has = !gsEmpty(T.fi.lat);
  return '<div class="gsBlk"><div class="gsBh"><b>Tọa độ rừng ' + esc(e.code || '') + '</b><label class="gsInl"><input type="checkbox" data-gson="1"' + (s.on[1] ? ' checked' : '') + '> Cập nhật khối này</label></div>' +
    '<p class="mut gsPad">Hồ sơ rừng lưu một điểm tọa độ (điểm tâm). Chọn một điểm dùng được; điểm có cảnh báo (ngoài miền, nghi nhầm cột, không đọc được) bị khóa.' + (has ? ' Hiện có: ' + esc(T.fi.lat + ', ' + T.fi.lng) + '.' : '') + '</p>' +
    '<div class="wrap gsTblW' + (s.on[1] ? '' : ' gsOff') + '"><table><thead><tr><th></th><th>Điểm</th><th class="num">Vĩ độ</th><th class="num">Kinh độ</th><th>Kiểm tra</th></tr></thead><tbody>' +
    (G.length ? G.map((g, i) => '<tr><td><input type="radio" name="gsGps" data-gsgps="' + i + '" aria-label="Chọn điểm ' + esc(g.id) + '"' + (s.gps === i ? ' checked' : '') + (g.ok ? '' : ' disabled') + '></td><td>' + esc(g.id) + (g.noi ? ' <span class="mut">' + esc(g.noi) + '</span>' : '') + '</td><td class="num">' + (g.ok ? esc(g.lat) : esc(g.raw)) + '</td><td class="num">' + (g.ok ? esc(g.lng) : '') + '</td><td>' +
      (g.ok ? '<span class="tg new">Dùng được</span>' + (g.converted ? ' <span class="pill">đã quy đổi từ “' + esc(g.raw) + '”</span>' : '') : '<span class="tg bad">' + esc(g.reason || 'Không dùng được') + '</span>') + ' <span class="mut">ToaDoRung dòng ' + g.row + '</span></td></tr>').join('') : '<tr><td colspan="5" class="mut">Rừng chưa có điểm tọa độ trong ToaDoRung.</td></tr>') + '</tbody></table></div>' +
    '<label class="gsInl gsPad"><input type="radio" name="gsGps" data-gsgps="skip"' + (s.gps === 'skip' ? ' checked' : '') + '> Không điền tọa độ' + (has ? ' (giữ tọa độ hiện có)' : '') + '</label></div>';
}
function gsPcFiltered(rows) {
  const m = gs.m, q = foldVi(m.pcQ), f = m.pcF;
  return rows.filter(r => (f === 'all' || (f === 'unassigned' ? r.st === 'new' && m.as[r.key] === -1 : f === r.st)) && (!q || foldVi([r.p.soPhieu, r.p.ngay, r.p.bienRaw, r.bien].join(' ')).includes(q) || (bienKey(m.pcQ).length >= 3 && bienKey(r.bien).includes(bienKey(m.pcQ)))));
}
function gsDsnHtml(rows) {
  const L = rows.filter(r => r.st === 'dsn' || r.st === 'doiso' || (r.ung && r.st === 'new'));
  if (!L.length) return '';
  const m = gs.m;
  return L.map(r => {
    if (r.st === 'dsn') {
      const opts = r.ung.map(u => '<label class="gsInl"><input type="radio" name="gsUv' + esc(r.key) + '" data-gsuv="' + esc(r.key) + '|' + esc(u.id) + '"' + (r.ung[0] === u ? ' checked' : '') + '> ' + esc(u.so) + ' (lô ' + esc(u.lo) + ', ' + gsTan(u.kg) + ' t, lệch ' + (u.dKg > 0 ? '+' : '') + u.dKg + ' kg)</label>').join('');
      return '<div class="gsSus" role="group" aria-label="Nghi đổi số phiếu ' + esc(r.p.soPhieu) + '"><b>Nghi đổi số phiếu:</b> trên Sheet là <code>' + esc(r.p.soPhieu) + '</code> (dòng ' + r.p.row + ', ' + esc(r.p.ngay) + ', BKS ' + esc(r.bien) + ', ' + gsNum(r.p.kl) + ' t); hồ sơ đã có ' +
        (r.ung.length === 1 ? '<code>' + esc(r.ung[0].so) + '</code>' : 'các phiếu cùng ngày, cùng biển số, lệch ≤ 1 kg:') + ' — cùng ngày, cùng BKS, khối lượng lệch ≤ 1 kg.' + (r.canhTranh ? ' <span class="pill warn">nhiều dòng Sheet cùng nghi một phiếu</span>' : '') + (r.nhieuHon ? ' <span class="pill warn">còn nhiều ứng viên hơn danh sách</span>' : '') +
        (r.ung.length > 1 ? '<div>' + opts + '</div>' : '') + '<div class="row gsAct"><button type="button" class="btn sm" data-act="gsDsn" data-key="' + esc(r.key) + '" data-v="doi">Đổi số ' + esc(r.ung[0].so) + ' → ' + esc(r.p.soPhieu) + ' (giữ nguyên phiếu)</button><button type="button" class="btn sm ghost" data-act="gsDsn" data-key="' + esc(r.key) + '" data-v="khac">Là chuyến khác (thêm mới)</button><span class="mut">Mặc định: không ghi cho đến khi chọn.</span></div></div>';
    }
    return '<div class="gsSus done"><b>' + (r.st === 'doiso' ? 'Đã chọn đổi số:' : 'Đã chọn là chuyến khác:') + '</b> ' + esc(r.p.soPhieu) + (r.uv ? ' (trước: ' + esc(r.uv.so) + ')' : '') + ' <button type="button" class="linkbtn" data-act="gsDsn" data-key="' + esc(r.key) + '" data-v="">Chọn lại</button></div>';
  }).join('');
}
function gsTabPc(e, eff, rows) {
  const m = gs.m, s = m.sel[e.k], multi = eff.length > 1, tan = rows.filter(r => r.st === 'new' && m.as[r.key] === -1 && m.sp[r.key]).length;
  const F = gsPcFiltered(rows), pages = Math.max(1, Math.ceil(F.length / GS_PC_PAGE)); if (m.page >= pages) m.page = pages - 1; if (m.page < 0) m.page = 0;
  const unas = rows.filter(r => r.st === 'new' && m.as[r.key] === -1).length;
  const selRung = r => r.st !== 'new' ? '<span class="gsSame">' + (r.st === 'same' ? 'giữ lô hiện có' : r.st === 'upd' ? 'lô hiện có' : r.st === 'dsn' ? 'chờ quyết định' : r.st === 'doiso' ? 'giữ lô hiện có' : r.st === 'lech' ? 'không phân bổ' : '—') + '</span>' :
    '<select data-gsas="' + esc(r.key) + '" aria-label="Vào rừng — phiếu ' + esc(r.p.soPhieu) + '"' + (multi ? '' : ' disabled') + '><option value="-1"' + (m.as[r.key] === -1 ? ' selected' : '') + '>Chưa phân bổ</option>' + eff.map((x, i) => '<option value="' + x.k + '"' + (m.as[r.key] === x.k ? ' selected' : '') + '>Rừng ' + (i + 1) + ': ' + esc(x.code || 'chưa có mã') + '</option>').join('') + '</select>';
  const warnList = [];
  eff.forEach((x, i) => { const u = gsUsed(x, rows), du = x.F.duKienKg; if (du != null && u.tong > du) warnList.push('<div class="msg err gsMsg"><b>Rừng ' + (i + 1) + ' ' + esc(x.code) + ': Vượt dự kiến ' + gsTan(u.tong - du) + ' tấn</b> (so với dự kiến ' + gsTan(du) + ' t, chưa cộng dung sai). Vẫn cập nhật được.</div>'); else if (x.ok && du == null && multi) warnList.push('<div class="msg warn gsMsg">Rừng ' + (i + 1) + ' ' + esc(x.code) + ': không tính được dự kiến (thiếu hecta/định mức), không tự nhận phiếu; vẫn phân bổ tay được.</div>'); });
  return '<div class="gsBlk"><div class="gsBh"><b>Phiếu cân của hợp đồng (HoSoKeo)</b><label class="gsInl"><input type="checkbox" data-gson="2"' + (s.on[2] ? ' checked' : '') + '> Cập nhật phiếu cân vào rừng này</label></div>' +
    '<div class="gsRule">' + (multi ? '<b>Phân bổ:</b> theo ngày cân; rừng nhập trước nhận đến hết sản lượng dự kiến (+ dung sai), phần còn lại sang rừng sau; rừng cuối nhận phần dư.' : '<b>Hợp đồng 1 rừng:</b> mọi phiếu mặc định vào rừng này.') + '</div>' + gsDsnHtml(rows) +
    '<div class="gsTools row">' + (multi ? '<button type="button" class="btn sm" data-act="gsAuto">Phân bổ tự động</button><button type="button" class="btn sm ghost" data-act="gsFill" data-k="' + e.k + '">Phân bổ phiếu còn lại vào rừng ' + (eff.indexOf(e) + 1) + '</button><button type="button" class="btn sm ghost" data-act="gsClear">Xóa phân bổ</button><label class="gsInl">Dung sai <input type="number" min="0" max="30" step="1" data-gstol value="' + m.tol + '" style="width:62px" aria-label="Dung sai phần trăm (0 đến 30)"> %</label>' : '') +
    '<span class="gsGrow"></span><label class="gsInl">Lọc <select data-gspcf aria-label="Lọc phiếu theo trạng thái">' + [['all', 'Tất cả'], ['new', 'Mới'], ['upd', 'Đổi'], ['same', 'Trùng'], ['dsn', 'Nghi đổi số'], ['lech', 'Lệch CCCD'], ['issue', 'Cần kiểm tra'], ['alias', 'Cần ghép xe'], ['unassigned', 'Chưa phân bổ']].map(([v, l]) => '<option value="' + v + '"' + (m.pcF === v ? ' selected' : '') + '>' + l + '</option>').join('') + '</select></label>' +
    '<input type="search" data-gspcq value="' + esc(m.pcQ) + '" placeholder="Số phiếu, ngày, biển số" aria-label="Tìm phiếu cân" size="18"></div>' +
    (m.detLoi ? '<div class="msg warn gsMsg">Quá nhiều phiếu để dò nghi đổi số (tối đa 5000): bỏ qua bước dò.</div>' : '') +
    (unas ? '<div class="msg warn gsMsg" id="gsUnas">Còn <b>' + unas + '</b> phiếu mới chưa phân bổ vào rừng nào — chưa được ghi' + (tan ? '' : '') + '.</div>' : '') + warnList.join('') +
    '<div class="wrap gsTblW' + (s.on[2] ? '' : ' gsOff') + '"><table><thead><tr><th></th><th>Số phiếu</th><th>Ngày cân</th><th>BKS</th><th class="num">KL (tấn)</th><th>Trạng thái</th><th>Vào rừng</th></tr></thead><tbody>' +
    (F.length ? F.slice(m.page * GS_PC_PAGE, m.page * GS_PC_PAGE + GS_PC_PAGE).map(r => { const st = GS_PST[r.st], lock = !(r.st === 'new' || r.st === 'upd');
      return '<tr class="' + (r.st === 'same' || r.st === 'dup' ? 'gsDim' : '') + '"><td><input type="checkbox" data-gssp="' + esc(r.key) + '" aria-label="Chọn phiếu ' + esc(r.p.soPhieu) + '"' + (m.sp[r.key] && !lock ? ' checked' : '') + (lock ? ' disabled' : '') + '></td><td>' + esc(r.p.soPhieu) + '</td><td>' + esc(r.p.ngay) + '</td><td>' + (r.st === 'alias' ? '<input data-gsalias="' + esc(foldVi(r.p.bienRaw)) + '" list="gsPlates" size="11" placeholder="Biển số cho “' + esc(r.p.bienRaw) + '”" aria-label="Biển số cho tên xe ' + esc(r.p.bienRaw) + '">' : esc(r.bien || r.p.bienRaw)) +
        '</td><td class="num">' + gsNum(r.p.kl) + '</td><td><span class="tg ' + st[1] + '">' + st[0] + '</span>' + (r.note && r.st !== 'new' && r.st !== 'dsn' ? ' <span class="gsSame">' + esc(r.note) + '</span>' : r.note && r.st === 'new' ? ' <span class="gsSame">' + esc(r.note) + '</span>' : '') + (r.st === 'new' && m.as[r.key] === -1 && m.chua[r.key] ? ' <span class="gsSame">(chưa phân bổ: ' + esc(GS_CHUA[m.chua[r.key]] || m.chua[r.key]) + ')</span>' : '') + '</td><td>' + selRung(r) + '</td></tr>'; }).join('') : '<tr><td colspan="7" class="mut">Không có phiếu nào khớp bộ lọc.</td></tr>') + '</tbody></table></div>' +
    '<datalist id="gsPlates">' + [...new Set(eff.flatMap(x => gsTarget(x).dx.map(v => v.bienSo)).filter(Boolean))].map(v => '<option value="' + esc(v) + '">').join('') + '</datalist>' +
    '<div class="row gsPg"><span>' + F.length + ' phiếu · trang ' + (m.page + 1) + '/' + pages + '</span><button type="button" class="btn sm ghost" data-act="gsPcPage" data-d="-1"' + (m.page ? '' : ' disabled') + ' aria-label="Trang phiếu trước">‹</button><button type="button" class="btn sm ghost" data-act="gsPcPage" data-d="1"' + (m.page < pages - 1 ? '' : ' disabled') + ' aria-label="Trang phiếu sau">›</button></div></div>';
}
function gsRender() {
  const m = gs.m; if (!m) return;
  const body = document.getElementById('hdBody');
  const a = document.activeElement; let fk = null;
  if (a && body.contains(a)) { fk = ['data-gscode', 'data-gstol', 'data-gspcq', 'data-gsalias', 'data-gsas', 'data-gssp', 'data-gspcf'].map(n => a.hasAttribute(n) ? [n, a.getAttribute(n)] : null).find(Boolean) || (a.dataset.act ? ['data-act', a.dataset.act, a.dataset.k, a.dataset.d] : a.dataset.gsrg ? ['data-gsrg', a.dataset.gsrg] : a.dataset.gstab ? ['data-gstab', a.dataset.gstab] : a.id ? ['id', a.id] : null); }
  const sc = body.querySelector('.gsDtB'), scT = sc ? sc.scrollTop : 0, scM = (body.querySelector('.gsMb') || {}).scrollTop || 0;
  const d = m.d, eff = gsEff(), rows = gsRows(), e = eff.find(x => x.k === m.rg) || eff[0] || null; if (e) m.rg = e.k;
  const own = Object.fromEntries((d.owner.fields || []).map(x => [x.key, x.value])), sm = gsSummary(d), st = GS_ST[sm.status];
  const alerts = (d.canhBaoNang.length ? '<div class="msg err gsMsg" id="gsHeavy"><b>Cảnh báo nặng: mã hợp đồng ' + esc(d.hd) + ' thuộc ' + d.cccdList.length + ' CCCD khác nhau</b> (' + d.cccdList.map(c => esc(gsMask(c))).join(', ') + ') ở HoSoRung dòng ' + d.canhBaoNang[0].dong.map(esc).join(', ') + '.' +
    (m.ack ? ' <span class="pill ok">Đã xác nhận 2 bước — được phép cập nhật</span>' : ' Chưa thể cập nhật cho đến khi bạn xác nhận 2 lần. <button type="button" class="btn sm" data-act="gsAck">Xác nhận cảnh báo (2 bước)…</button>') + '</div>' : '') +
    (d.warns.filter(w => !/cảnh báo nặng/.test(w)).map(w => '<div class="msg warn gsMsg">' + esc(w) + '</div>').join('')) + (d.notes.length ? '<details class="gsNotes"><summary class="mut">Ghi chú dữ liệu (' + d.notes.length + ')</summary><ul class="issues">' + d.notes.map(n => '<li>' + esc(n) + '</li>').join('') + '</ul></details>' : '') + (m.msg ? '<div class="msg ' + m.msg.kind + ' gsMsg" role="status">' + esc(m.msg.text) + '</div>' : '') +
    (m.sum ? '<div class="msg ok gsMsg" id="gsSum" role="status"><b>Đã cập nhật vào hồ sơ (bản nháp):</b><br>' + m.sum.map(esc).join('<br>') + '<br>Phiếu cân đã vào BẢN NHÁP: bấm “Lưu dữ liệu vào lô” ở từng lô để chính thức lưu.</div>' : '');
  const tabs = [['ho', 'Hồ sơ rừng'], ['gps', 'Tọa độ' + (e ? ' (' + e.X.gps.length + ')' : '')], ['pc', 'Phiếu cân (' + d.phieu.length + ')']];
  const con = e ? '<div class="gsDt"><div class="gsTabs" role="tablist" aria-label="Nội dung của rừng">' + tabs.map(([k, l]) => '<button type="button" role="tab" class="gsTab' + (m.tab === k ? ' on' : '') + '" aria-selected="' + (m.tab === k) + '" data-gstab="' + k + '">' + l + '</button>').join('') + '</div><div class="gsDtB" role="tabpanel">' + alerts + (m.tab === 'ho' ? gsTabHo(e) : m.tab === 'gps' ? gsTabGps(e) : gsTabPc(e, eff, rows)) + '</div></div>' :
    '<div class="gsDt"><div class="gsDtB">' + alerts + '<p class="mut">Không có dữ liệu rừng để cập nhật.</p></div></div>';
  const tot = eff.map((x, i) => { const c = gsCount(x, rows); return 'R' + (i + 1) + ': ' + c.f + ' trường · ' + c.g + ' điểm · ' + c.p + ' phiếu'; }).join(' | ');
  const blocked = d.canhBaoNang.length && !m.ack;
  body.innerHTML = '<div class="gsHead"><div><h2 id="hdTitle">' + esc(d.hd) + ' · ' + esc(own.ten || '(chưa rõ chủ rừng)') + '</h2><div class="mut">CCCD ' + esc(d.cccd || '—') + ' · ký ' + esc(own.ngayKyHopDong || '—') + ' · ' + eff.length + ' rừng · ' + d.phieu.length + ' phiếu cân</div></div><div class="row"><span class="pill ' + st[1] + '">' + st[0] + '</span><button type="button" class="btn ghost sm" data-act="gsClose">Đóng ✕</button></div></div>' +
    '<div class="gsMb">' + gsChaHtml(eff, rows) + con + '</div>' +
    '<div class="gsFoot"><span class="mut gsTot" id="gsTot">' + esc(tot || 'Chưa chọn gì') + '</span><span class="row"><button type="button" class="btn ghost" data-act="gsAll">Chọn phần mới</button><button type="button" class="btn ghost" data-act="gsClose">Đóng</button><button type="button" class="btn" data-act="gsApply"' + (blocked || m.busy || !eff.length ? ' disabled' : '') + (blocked ? ' title="Cần xác nhận cảnh báo nhiều CCCD (2 bước) trước"' : '') + '>Cập nhật vào hồ sơ</button></span></div>';
  const nsc = body.querySelector('.gsDtB'); if (nsc) nsc.scrollTop = scT; const nmb = body.querySelector('.gsMb'); if (nmb) nmb.scrollTop = scM;
  if (fk) { let n = null; if (fk[0] === 'id') n = document.getElementById(fk[1]); else if (fk[0] === 'data-act') n = [...body.querySelectorAll('[data-act]')].find(x => x.dataset.act === fk[1] && x.dataset.k === fk[2] && x.dataset.d === fk[3]); else n = [...body.querySelectorAll('[' + fk[0] + ']')].find(x => x.getAttribute(fk[0]) === fk[1]);
    if (n && n.focus) n.focus(); }
}
