/* ========== Báo cáo (Word + Excel) ========== */
const rp = {id: 'dieuhanh', from: '', to: '', owner: '', detail: false, msg: null, folded: {}, q: '', one: {}, flag: {}, presetSel: '', conds: []};
const isoToVi = v => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v || ''); return m ? m[3] + '/' + m[2] + '/' + m[1] : ''; };
const viToIso = v => { const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(v || ''); return m ? m[3] + '-' + m[2] + '-' + m[1] : ''; };
function rpRecords(ownerFilter = rp.owner) {
  const out = [];
  Object.values(db.rs).forEach(o => {
    if (ownerFilter && o.id !== ownerFilter && !(o.info && o.info.ma === ownerFilter)) return;
    forestList(o).forEach(f => {
      let pct = 0, thieu = [];
      try { const pr = progressOf(jobView(o, f)); pct = pr.pct; thieu = pr.L.filter(x => !x.ok).map(x => ({label: x.label, hint: x.hint, warn: x.warn})); }
      catch (e) { thieu = [{label: 'Không tính được tiến độ', hint: e.message}]; }
      const i = f.info || {};
      out.push({oid: o.id, fid: f.id, chuRung: o.info.ten || '(chưa đặt tên)', maChu: o.info.ma || o.id, cccd: o.info.cccd || '', maRung: i.maRung || '', tenRung: i.tenRung || '', diaDiem: i.diaDiem || '',
        dienTich: i.dienTich, dinhMuc: i.dinhMucTanHa, khoiLuongTT: i.khoiLuong, tuNgay: i.tuNgay || '', denNgay: i.denNgay || '',
        diemDen: destOf(jobView(o, f)),
        pc: (f.pc || []).map(p => ({ngay: p.ngay, bienSo: p.bienSo, soPhieu: p.soPhieu, kl: typeof p.kl === 'number' ? p.kl : 0, noiGiao: p.noiGiao, gioCan1: p.gioCan1 || '', gioCan2: p.gioCan2 || '', can1: typeof p.can1 === 'number' ? p.can1 : null, can2: typeof p.can2 === 'number' ? p.can2 : null, klKg: typeof p.klKg === 'number' ? p.klKg : null, khachHang: p.khachHang || ''})), bienLog: (f.bienLog || []).map(e => ({...e})),
        nc: (f.nc || []).length, dx: (f.dx || []).length, pct, thieu,
        ncList: (f.nc || []).map(r => ({vaiTro: r.vaiTro, stt: r.stt, danhXung: r.danhXung, ten: r.ten, chucDanh: r.chucDanh, ngaySinh: r.ngaySinh, cccd: r.cccd, diaChi: r.diaChi, ngayCap: r.ngayCap, noiCap: r.noiCap, rate: rateOf(i, r)})), donVi: basisOf(i).short,
        dxList: (f.dx || []).map(r => ({bienSo: r.bienSo, loaiXe: r.loaiXe, chuXe: r.chuXe, nguoiKy: r.nguoiKy, taiXe: r.taiXe, cccd: r.cccd, cccdTx: r.cccdTx, sdt: r.sdt, hanBH: r.hanBH, hanGplx: r.hanGplx}))});
    });
  });
  return out;
}
/* ===== Bộ lọc thông minh (HAK Smart Filter) cho mẫu báo cáo: tìm nhanh, lô rừng, điều kiện riêng từng mẫu, chip điều kiện, bộ lọc đã lưu ===== */
const RP_EXTRA = {
  laodong: {fields: [{key: 'chucDanh', label: 'Chức danh', opts: () => chucDanhAll()}, {key: 'vaiTro', label: 'Vai trò', opts: () => ['Tổ trưởng', 'Công nhân']}], flags: [['onlyMinors', 'Chỉ người dưới 18 tuổi'], ['onlyMissing', 'Chỉ hồ sơ cần bổ sung (thiếu ngày sinh, CCCD)']], hint: 'họ tên, CCCD, chức danh, địa chỉ, mã rừng, chủ rừng'},
  danhsachxe: {fields: [{key: 'nguoiKy', label: 'Người ký HĐ vận chuyển', opts: () => ['Chủ xe', 'Tài xế']}], flags: [['onlyNoPhone', 'Chỉ xe chưa có số điện thoại'], ['onlyTrips', 'Chỉ xe có chuyến trong kỳ'], ['onlyNoTrips', 'Chỉ xe chưa có chuyến trong kỳ']], hint: 'biển số, chủ xe, tài xế, SĐT, loại xe, mã rừng'},
  phieucan: {fields: [], flags: [], hint: 'số phiếu, biển số, khách hàng, nơi giao, mã rừng, chủ rừng'},
  bienso: {fields: [], flags: [], hint: 'mã rừng, chủ rừng'},
  doichieu: {fields: [], flags: [['onlyToaDo', 'Chỉ rừng thiếu tọa độ'], ['onlyPhieu', 'Chỉ phiếu cân thiếu hồ sơ rừng']], hint: 'tên chủ rừng, CCCD, mã hợp đồng, số phiếu'}
};
const rpUniq = a => [...new Set(a.filter(Boolean))].sort((x, y) => String(x).localeCompare(String(y), 'vi'));
function rpCfg() {
  const owners = Object.values(db.rs).sort((a, b) => (a.info.ten || '').localeCompare(b.info.ten || '', 'vi')), x = RP_EXTRA[rp.id] || {fields: [], flags: []};
  const rungs = rpUniq(rpRecords('').map(r => r.maRung));
  return {screenId: 'hakqn.baocao.' + rp.id, fields: [
    {key: 'owner', type: 'enum', label: 'Chủ rừng', options: owners.map(o => ({value: o.id, label: o.info.ten || '(chưa đặt tên)'}))},
    {key: 'rung', type: 'enum', label: 'Lô rừng', options: rungs.map(v => ({value: v, label: v}))},
    ...x.fields.map(f => ({key: f.key, type: 'enum', label: f.label, options: f.opts().map(v => ({value: v, label: v}))})),
    ...x.flags.map(([k, l]) => ({key: k, type: 'bool', label: l})),
    ...(rp.id === 'chacon' ? [{key: 'detail', type: 'bool', label: 'Kèm từng phiếu cân'}] : [])]};
}
function rpSf() {
  const one = {}; if (rp.owner) one.owner = rp.owner; Object.entries(rp.one).forEach(([k, v]) => { if (v) one[k] = v; });
  return HAKCore.sf.normalize({q: rp.q, tu: viToIso(rp.from), den: viToIso(rp.to), one, flag: Object.assign({}, rp.flag, rp.id === 'chacon' && rp.detail ? {detail: true} : {})}, rpCfg());
}
function rpFromSf(st) { rp.q = st.q; rp.from = isoToVi(st.tu); rp.to = isoToVi(st.den); rp.owner = st.one.owner || ''; rp.one = Object.assign({}, st.one); delete rp.one.owner; rp.flag = Object.assign({}, st.flag); if (rp.id === 'chacon') rp.detail = !!st.flag.detail; }
const rpPresets = () => HAKCore.sf.presets(lkStore);
/* Phạm vi lọc: một chuỗi duy nhất (HAK Smart Filter) dùng cho màn hình xem trước, Word và Excel */
const rpScope = () => HAKCore.sf.scopeText(rpCfg(), rpSf(), 'Tất cả chủ rừng (không lọc)');
/* Dữ liệu đã lọc: lọc theo lô rừng, chủ rừng, tìm nhanh và các điều kiện riêng của mẫu TRƯỚC khi lập báo cáo, nên tổng và KPI khớp với phần đã lọc */
function rpData() {
  const words = foldVi(rp.q).split(/\s+/).filter(Boolean), hit = (...p) => { const t = foldVi(p.join(' ')); return words.every(w => t.includes(w)); };
  const o = rp.one, fl = rp.flag, id = rp.id, active = !!(words.length || o.chucDanh || o.vaiTro || o.nguoiKy || fl.onlyMinors || fl.onlyMissing || fl.onlyNoPhone || fl.onlyTrips || fl.onlyNoTrips);
  const plate = v => String(v || '').toUpperCase().replace(/[\s.\-]/g, '');
  let recs = rpRecords(); if (o.rung) recs = recs.filter(r => r.maRung === o.rung);
  const out = [];
  recs.forEach(r => {
    const lot = hit(r.chuRung, r.maRung, r.tenRung, r.diaDiem); let x = r;
    if (id === 'laodong') {
      const ref = dateKey(r.tuNgay) ? r.tuNgay : todayStr();
      x = {...r, ncList: (r.ncList || []).filter(n => (lot || hit(n.ten, n.cccd, n.chucDanh, n.vaiTro, n.diaChi, n.danhXung)) && (!o.chucDanh || n.chucDanh === o.chucDanh) && (!o.vaiTro || (o.vaiTro === 'Tổ trưởng' ? /^tổ trưởng/i.test(n.vaiTro || '') : !/^tổ trưởng/i.test(n.vaiTro || '')))
        && (!fl.onlyMinors || (ageAt(n.ngaySinh, ref) != null && ageAt(n.ngaySinh, ref) < 18)) && (!fl.onlyMissing || !HAKDates.isValid(n.ngaySinh) || !/^\d{12}$/.test(String(n.cccd || ''))))};
      if (active && !x.ncList.length) return;
    } else if (id === 'danhsachxe') {
      const trips = k => (r.pc || []).filter(p => plate(p.bienSo) === k && HAKDates.isValid(p.ngay) && HAKDates.inRange(p.ngay, rp.from, rp.to)).length;
      x = {...r, dxList: (r.dxList || []).filter(d => (lot || hit(d.bienSo, d.chuXe, d.taiXe, d.sdt, d.loaiXe, d.cccd, d.cccdTx)) && (!o.nguoiKy || (d.nguoiKy || 'Chủ xe') === o.nguoiKy) && (!fl.onlyNoPhone || !d.sdt) && (!fl.onlyTrips || trips(plate(d.bienSo)) > 0) && (!fl.onlyNoTrips || trips(plate(d.bienSo)) === 0))};
      if (active && !x.dxList.length) return;
    } else if (words.length && !lot) {
      x = {...r, pc: (r.pc || []).filter(p => hit(p.soPhieu, p.bienSo, p.khachHang, p.noiGiao)), bienLog: (r.bienLog || []).filter(e => hit(e.soPhieu, e.cu, e.moi))};
      if (!x.pc.length && !x.bienLog.length) return;
    }
    out.push(x);
  });
  return out;
}
const rpModel = () => HAKReports.REPORTS.find(r => r.id === rp.id).build(rpData(), {from: rp.from, to: rp.to, today: todayStr(), detail: rp.detail, audit: rp.audit, q: rp.q, flag: rp.flag});
/* Báo cáo đối chiếu lấy số liệu từ bản tra cứu ở tiến trình chính: tải lại mỗi lần chọn mẫu */
function rpLoadAudit() { rp.audit = HB ? null : {ok: false, noData: true}; if (!HB) return; HB.lookup.audit().then(r => { rp.audit = r && r.ok ? r.audit : {ok: false, noData: true}; if (rp.id === 'doichieu') rpRender(); }); }
const stampStr = () => todayStr() + ' ' + pad2(new Date().getHours()) + ':' + pad2(new Date().getMinutes());
/* Thanh bộ lọc thông minh của hộp Báo cáo */
function rpFilterHtml() {
  const cfg = rpCfg(), st = rpSf(), conds = HAKCore.sf.conditions(cfg, st), names = rpPresets().list(cfg.screenId), x = RP_EXTRA[rp.id] || {fields: [], flags: [], hint: 'mã rừng, chủ rừng'};
  rp.conds = conds;
  const sel = (key, label, opts, cur) => '<label>' + esc(label) + '<br><select id="rpOne_' + key + '"><option value="">Tất cả</option>' + opts.map(v => '<option value="' + esc(v) + '"' + (cur === v ? ' selected' : '') + '>' + esc(v) + '</option>').join('') + '</select></label>';
  return '<div class="card" id="rpSf" style="margin:8px 0;padding:10px 12px"><div class="row" style="align-items:flex-end;flex-wrap:wrap;gap:8px">' +
    '<label style="flex:1;min-width:220px">Tìm nhanh<br><input id="rpQ" style="width:100%" value="' + esc(rp.q) + '" placeholder="' + esc('Gõ rồi Enter: ' + x.hint) + '"></label>' +
    sel('rung', 'Lô rừng', cfg.fields.find(f => f.key === 'rung').options.map(o => o.value), rp.one.rung) +
    x.fields.map(f => sel(f.key, f.label, f.opts(), rp.one[f.key])).join('') + '</div>' +
    (x.flags.length ? '<div class="row" style="margin-top:6px;flex-wrap:wrap;gap:14px">' + x.flags.map(([k, l]) => '<label style="flex-direction:row;align-items:center;gap:6px;color:var(--ink)"><input type="checkbox" id="rpFlag_' + k + '"' + (rp.flag[k] ? ' checked' : '') + '> ' + esc(l) + '</label>').join('') + '</div>' : '') +
    '<div class="row" style="margin-top:8px;justify-content:space-between;flex-wrap:wrap;gap:8px"><div class="row" style="flex-wrap:wrap;gap:6px">' +
    (conds.length ? conds.map((c, i) => '<span class="pill">' + esc(c.text) + ' <button class="chipx" data-rprm="' + i + '" aria-label="Bỏ điều kiện: ' + esc(c.text) + '">×</button></span>').join('') + '<button class="btn ghost sm" data-act="rpClearAll">Xóa hết</button>' : '<span class="mut">Chưa có điều kiện lọc: báo cáo gồm toàn bộ dữ liệu.</span>') + '</div>' +
    '<div class="row" style="gap:6px;flex-wrap:wrap"><select id="rpPreset" aria-label="Bộ lọc đã lưu"><option value="">Bộ lọc đã lưu…</option>' + names.map(n => '<option' + (n === rp.presetSel ? ' selected' : '') + '>' + esc(n) + '</option>').join('') + '</select>' +
    '<input id="rpPresetName" size="14" placeholder="Tên bộ lọc mới"><button class="btn ghost sm" data-act="rpPresetSave">Lưu bộ lọc</button><button class="btn ghost sm" data-act="rpPresetDel">Xóa bộ lọc đã chọn</button></div></div></div>';
}
function rpDocx(m) {
  const land = m.orient === 'landscape', W = land ? 15137 : 9355, F = HAKReports.fmtCell;
  const widths = cols => { const t = cols.reduce((a, c) => a + c.w, 0); const w = cols.map(c => Math.floor(c.w / t * W)); w[w.length - 1] += W - w.reduce((a, b) => a + b, 0); return w; };
  const B = [P('**HAK GROUP**', {al: 'left', sz: 24, after: 0}), P('Hồ sơ khai thác và vận chuyển gỗ keo · Chuẩn truy xuất nguồn gốc FSC', {al: 'left', i: true, sz: 20, after: 60, bdb: true}),
    P('**' + m.title + '**', {al: 'center', sz: 30, before: 160, after: 40}), P(m.period + ' · ' + rpScope(), {al: 'center', i: true, sz: 22, after: 40}), P((m.unit || '') + ' · Lập lúc ' + stampStr(), {al: 'center', i: true, sz: 20, after: 160})];
  if (m.kpis.length) {
    const per = land ? 5 : 3, cells = m.kpis.map(k => ['**' + F(k.value, k.f) + '**', k.label]);
    for (let i = 0; i < cells.length; i += per) {
      const row = cells.slice(i, i + per); while (row.length < per) row.push(['', '']);
      B.push(T(Array(per).fill(Math.floor(W / per)), [row.map(c => ({v: [c[0], c[1]]}))], {sz: land ? 20 : 20, al: 'center', pad: 80}), P('', {after: 60}));
    }
  }
  m.sections.forEach(s => {
    B.push(P('**' + s.heading + '**', {al: 'left', before: 140, after: 80, keep: true}));
    const rows = [s.cols.map(c => c.h), ...s.rows.map((r, ri) => r.map((v, i) => (s.levels && s.levels[ri] === 0) ? {v: '**' + F(v, s.cols[i].f) + '**'} : F(v, s.cols[i].f)))];
    if (!s.rows.length) rows.push([{v: 'Không có dữ liệu', span: s.cols.length}]);
    if (s.foot) rows.push(s.foot.map((v, i) => ({v: '**' + F(v, s.cols[i].f) + '**'})));
    B.push(T(widths(s.cols), rows, {head: true, sz: land ? 18 : 20, alignCols: s.cols.map(c => c.al || 'left')}));
  });
  if (m.notes.length) { B.push(P('**Ghi chú**', {al: 'left', before: 140, after: 60, keep: true})); m.notes.forEach(n => B.push(bl(n))); }
  B.push(P('Lập ngày ' + todayStr(), {al: 'right', i: true, before: 160, after: 80}),
    T([Math.floor(W / 2), W - Math.floor(W / 2)], [['**NGƯỜI LẬP BIỂU**', '**GIÁM ĐỐC**'], [{v: '(Ký, ghi rõ họ tên)', i: true}, {v: '(Ký, đóng dấu)', i: true}], ['', ''], ['', '']], {borders: false, al: 'center', keep: true}));
  return makeDocx(B, {landscape: land, footer: m.title.slice(0, 1) + m.title.slice(1).toLowerCase() + ' · HAK Group · Phiên bản 1.0'});
}
async function rpExport(kind) {
  const m = rpModel(), name = 'BaoCao_' + m.id + '_' + todayStr().replace(/\//g, '-');
  if (kind === 'docx') { download(await rpDocx(m), name + '.docx'); return; }
  const aoa = HAKReports.toAoa(m, {org: 'HAK GROUP', today: todayStr(), stamp: stampStr(), scope: rpScope()});
  const ws = XLSX.utils.aoa_to_sheet(aoa, {cellDates: true}), wb = XLSX.utils.book_new();
  const widest = Math.max(...m.sections.map(s => s.cols.length));
  ws['!cols'] = Array.from({length: widest}, (_, i) => ({wch: i === 0 ? 34 : 18}));
  ws['!merges'] = [0, 1, 2, 3, 4].map(r => ({s: {r, c: 0}, e: {r, c: Math.max(widest - 1, 1)}}));
  Object.keys(ws).forEach(k => { if (k[0] !== '!' && ws[k].t === 'd') ws[k].z = 'dd/mm/yyyy'; });   // ô ngày thật, hiển thị dd/mm/yyyy
  const t0 = aoa.tables && aoa.tables[0];
  if (t0 && t0.last >= t0.first) ws['!autofilter'] = {ref: XLSX.utils.encode_range({s: {r: t0.head, c: 0}, e: {r: t0.last, c: t0.cols - 1}})};   // bộ lọc tự động ở bảng chính
  if (t0 && t0.levels) { ws['!rows'] = []; t0.levels.forEach((lv, i) => { ws['!rows'][t0.first + i] = {level: lv}; }); }                       // nhóm dòng cha–con
  XLSX.utils.book_append_sheet(wb, ws, 'Bao cao'); XLSX.writeFile(wb, name + '.xlsx', {cellDates: true});
}
function rpHidden(sec, ri) {   // dòng con ẩn khi cha (cấp thấp hơn, gần nhất phía trên) đang thu gọn
  const lv = sec.levels && sec.levels[ri]; if (!lv) return false;
  for (let j = ri - 1, need = lv - 1; j >= 0 && need >= 0; j--) if (sec.levels[j] <= need) { if (rp.folded[j]) return true; need = sec.levels[j] - 1; }
  return false;
}
function rpRender() {
  const m = rpModel(), F = HAKReports.fmtCell;
  const owners = Object.values(db.rs).sort((a, b) => (a.info.ten || '').localeCompare(b.info.ten || '', 'vi'));
  const prev = m.sections.map(s => '<h4 style="margin:12px 0 4px">' + esc(s.heading) + ' <span class="mut">(' + s.rows.length + ' dòng)</span></h4><div class="wrap" style="max-height:34vh"><table><tr>' + s.cols.map(c => '<th>' + esc(c.h) + '</th>').join('') + '</tr>' +
    s.rows.slice(0, 200).map((r, ri) => { const lv = s.levels ? s.levels[ri] : null; return '<tr' + (lv != null ? ' data-rplv="' + lv + '" data-rpi="' + ri + '"' + (rpHidden(s, ri) ? ' hidden' : '') : '') + (lv === 0 ? ' style="font-weight:700"' : '') + '>' + r.map((v, i) => '<td style="text-align:' + (s.cols[i].al || 'left') + (i === 0 && lv ? ';padding-left:' + (9 + lv * 16) + 'px' : '') + '">' + (i === 0 && lv != null && lv < 2 && s.levels[ri + 1] > lv ? '<button class="chipx" data-rpfold="' + ri + '" aria-label="Thu gọn hoặc mở rộng">' + (rp.folded[ri] ? '▸' : '▾') + '</button> ' : '') + esc(F(v, s.cols[i].f)) + '</td>').join('') + '</tr>'; }).join('') +
    (s.foot ? '<tr>' + s.foot.map((v, i) => '<td style="text-align:' + (s.cols[i].al || 'left') + '"><b>' + esc(F(v, s.cols[i].f)) + '</b></td>').join('') + '</tr>' : '') + '</table></div>' +
    (s.rows.length > 200 ? '<p class="mut">Xem trước 200 dòng đầu; file xuất có đủ ' + s.rows.length + ' dòng.</p>' : '')).join('');
  $('#rpBody').innerHTML = '<div class="gh"><h2>Báo cáo</h2><button class="btn ghost sm" data-act="rpClose">✕ Đóng</button></div>' +
    '<div class="rpl">' + HAKReports.REPORTS.map(r => '<button class="rpc ' + (rp.id === r.id ? 'on' : '') + '" data-rpsel="' + r.id + '"><b>' + esc(r.name) + '</b><small>' + esc(r.desc) + '</small></button>').join('') + '</div>' +
    '<div class="row" style="align-items:flex-end;flex-wrap:wrap"><label>Từ ngày<br><input type="date" id="rpFrom" value="' + esc(viToIso(rp.from)) + '"></label><label>Đến ngày<br><input type="date" id="rpTo" value="' + esc(viToIso(rp.to)) + '"></label>' +
    '<label>Chủ rừng<br><select id="rpOwner"><option value="">Tất cả chủ rừng</option>' + owners.map(o => '<option value="' + esc(o.id) + '"' + (rp.owner === o.id ? ' selected' : '') + '>' + esc(o.info.ten || '(chưa đặt tên)') + '</option>').join('') + '</select></label>' +
    (rp.id === 'chacon' ? '<label style="flex-direction:row;align-items:center;gap:6px;color:var(--ink)"><input type="checkbox" id="rpDetail"' + (rp.detail ? ' checked' : '') + '> Kèm từng phiếu cân</label>' : '') + '<button class="btn" data-act="rpWord">Xuất Word (.docx)</button><button class="btn ghost" data-act="rpExcel">Xuất Excel (.xlsx)</button></div>' +
    rpFilterHtml() +
    '<p class="mut">Khoảng ngày áp dụng cho ngày cân của phiếu cân. Báo cáo tiến độ luôn tính tại thời điểm hiện tại.</p>' +
    (rp.msg ? '<div class="msg ' + rp.msg.kind + '">' + esc(rp.msg.text) + '</div>' : '') +
    '<h3 style="margin:10px 0 0">' + esc(m.title) + '</h3><p class="mut">' + esc(m.period + ' · ' + rpScope()) + '<br>' + esc(m.unit || '') + '</p>' +
    '<div class="kpi">' + m.kpis.map(k => '<div><b>' + esc(F(k.value, k.f)) + '</b>' + esc(k.label) + '</div>').join('') + '</div>' + prev +
    (m.notes.length ? '<div class="msg warn">' + m.notes.map(esc).join('<br>') + '</div>' : '');
}
function rpOpen() { if (!Object.keys(db.rs).length) { note('Chưa có dữ liệu để lập báo cáo. Hãy tạo chủ rừng và nạp phiếu cân trước.', 'err'); render(); return; } rp.msg = null; $('#rpBox').classList.add('on'); rpRender(); }
const rpClose = () => $('#rpBox').classList.remove('on');
function rpReadParams() {
  const g = id => { const el = document.getElementById(id); return el ? el.value : null; }; const f = g('rpFrom'), t = g('rpTo'), o = g('rpOwner'), dt = document.getElementById('rpDetail');
  if (dt) rp.detail = dt.checked; if (f !== null) rp.from = isoToVi(f); if (t !== null) rp.to = isoToVi(t); if (o !== null) rp.owner = o;
  const q = g('rpQ'); if (q !== null) rp.q = q.trim();
  document.querySelectorAll('#rpBox [id^=rpOne_]').forEach(el => { const k = el.id.slice(6); if (el.value) rp.one[k] = el.value; else delete rp.one[k]; });
  document.querySelectorAll('#rpBox [id^=rpFlag_]').forEach(el => { const k = el.id.slice(7); if (el.checked) rp.flag[k] = true; else delete rp.flag[k]; });
}
document.addEventListener('click', async e => {
  const t = e.target; if (!t.closest) return;
  if (t.closest('[data-act=rpDoiChieu]')) { rpOpen(); rp.id = 'doichieu'; rp.one = {}; rp.flag = {}; rp.q = ''; rpLoadAudit(); return rpRender(); }
  if (t.closest('[data-act=rpOpen]')) return rpOpen();
  if (!t.closest('#rpBox')) return;
  const fold = t.closest('[data-rpfold]'); if (fold) { const k = fold.dataset.rpfold; rp.folded[k] = !rp.folded[k]; return rpRender(); }
  const rm = t.closest('[data-rprm]'); if (rm) { rpReadParams(); rpFromSf(HAKCore.sf.remove(rpSf(), rp.conds[+rm.dataset.rprm])); return rpRender(); }
  const sel = t.closest('[data-rpsel]'); if (sel) { rpReadParams(); rp.id = sel.dataset.rpsel; rp.one = {}; rp.flag = {}; rp.q = ''; rp.presetSel = ''; if (rp.id === 'doichieu') rpLoadAudit(); return rpRender(); }
  const el = t.closest('[data-act]'); if (!el) return; const a = el.dataset.act;
  if (a === 'rpClose') return rpClose();
  rpReadParams();
  if (a === 'rpClearAll') { rp.q = ''; rp.from = ''; rp.to = ''; rp.owner = ''; rp.one = {}; rp.flag = {}; rp.detail = false; rp.presetSel = ''; return rpRender(); }
  if (a === 'rpPresetSave') { const nm = (document.getElementById('rpPresetName') || {}).value || ''; const cfg = rpCfg(); let r = rpPresets().save(cfg.screenId, nm, rpSf());
    if (!r.ok && r.corrupt && confirm('Kho bộ lọc đã lưu trên máy bị lỗi hoặc thuộc phiên bản khác nên chưa ghi đè.\n\nSao lưu nguyên văn bản cũ (không mất dữ liệu) rồi tạo kho mới để lưu bộ lọc này?')) { const d = rpPresets().discardCorrupt(); r = d.ok ? rpPresets().save(cfg.screenId, nm, rpSf()) : d; }
    if (r.ok) rp.presetSel = nm.trim(); rp.msg = r.ok ? {kind: 'ok', text: 'Đã lưu bộ lọc “' + nm.trim() + '”.'} : {kind: 'err', text: r.msg}; return rpRender(); }
  if (a === 'rpPresetDel') { const nm = rp.presetSel || (document.getElementById('rpPreset') || {}).value || ''; const cfg = rpCfg(); if (nm && rpPresets().remove(cfg.screenId, nm)) { rp.presetSel = ''; rp.msg = {kind: 'ok', text: 'Đã xóa bộ lọc “' + nm + '”.'}; } else rp.msg = {kind: 'err', text: 'Chọn một bộ lọc đã lưu để xóa.'}; return rpRender(); }
  if (a === 'rpWord' || a === 'rpExcel') {
    const a1 = HAKReports.dateKey(rp.from), a2 = HAKReports.dateKey(rp.to);
    if (a1 && a2 && a1 > a2) { rp.msg = {kind: 'err', text: 'Ngày bắt đầu phải trước hoặc bằng ngày kết thúc.'}; return rpRender(); }
    try { await rpExport(a === 'rpWord' ? 'docx' : 'xlsx'); rp.msg = {kind: 'ok', text: 'Đã xuất báo cáo.'}; } catch (err) { rp.msg = {kind: 'err', text: 'Không xuất được: ' + err.message}; }
    return rpRender();
  }
});
document.addEventListener('change', e => { const t = e.target; if (!t || !t.closest || !t.closest('#rpBox')) return;
  if (t.id === 'rpPreset') { rp.presetSel = t.value; if (!t.value) return rpRender(); const r = HAKCore.sf.applyPreset(rpCfg(), rpPresets().get(rpCfg().screenId, t.value)); if (!r.ok) { rp.msg = {kind: 'err', text: 'Không mở được bộ lọc đã lưu.'}; return rpRender(); } rpFromSf(r.state); rp.msg = r.dropped.length ? {kind: 'warn', text: 'Bộ lọc đã mở nhưng bỏ điều kiện không dùng được ở mẫu này: ' + r.dropped.join(', ')} : null; return rpRender(); }
  if (/^(rpFrom|rpTo|rpOwner|rpDetail|rpQ|rpOne_.+|rpFlag_.+)$/.test(t.id)) { rpReadParams(); rp.presetSel = ''; rpRender(); } });
document.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target && e.target.id === 'rpQ') { e.preventDefault(); rpReadParams(); rp.presetSel = ''; rpRender(); const q = document.getElementById('rpQ'); if (q) q.focus(); } });

