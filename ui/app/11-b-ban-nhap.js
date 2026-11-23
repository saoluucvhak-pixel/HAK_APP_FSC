/* ========== Bản nháp “Chưa lưu” của nhân công, xe, phiếu cân (src/stage.js) ========== */
/* Mọi nguồn (nhập tay, Excel, bản tra cứu) chỉ đổi BẢN NHÁP của lô đang mở. Hồ sơ lô (SQLite) chỉ đổi khi bấm “Lưu dữ liệu vào lô”; tạo, xuất, in hồ sơ chỉ dùng dữ liệu đã lưu. */
let dbEpoch = 0;   // tăng mỗi khi toàn bộ dữ liệu bị thay (khôi phục, nạp lại): lượt nhập đang chờ không còn đích hợp lệ
const stages = new Proxy({}, {set(t, k, v) { t[k] = v; doiDuLieu(); return true; }, deleteProperty(t, k) { delete t[k]; doiDuLieu(); return true; }});   // 'mã chủ rừng|mã lô' → bản nháp; thêm / bỏ bản nháp tăng phiên bản dữ liệu (B7)
const stKeyOf = (o, f) => o + '|' + f, stKey = () => stKeyOf(NAV.cur, NAV.curF);
const stCur = () => stages[stKey()] || null;
const stDirtyOf = k => (!!stages[k] && HAKStage.dirty(stages[k])) || loDirty.has(k.split('|')[1]);   // bảng nháp hoặc thay đổi khác của lô
const stDirtyList = () => [...new Set([...Object.keys(stages), ...Object.values(db.rs || {}).flatMap(o => Object.values(o.forests || {}).filter(f => loDirty.has(f.id)).map(f => stKeyOf(o.id, f.id)))])].filter(stDirtyOf);
const stDirtyCur = () => stDirtyOf(stKey());
function stGetFor(oid, fid, make) { const k = stKeyOf(oid, fid), o = db.rs[oid], f = o && o.forests && o.forests[fid]; if (!f) return null; if (!stages[k] && make) stages[k] = HAKStage.create({nc: f.nc || [], dx: f.dx || [], pc: f.pc || []}); return stages[k] || null; }
function stGet(make) { const k = stKey(); if (!stages[k] && make) { const f = curForest(); if (!f) return null; stages[k] = HAKStage.create({nc: f.nc || [], dx: f.dx || [], pc: f.pc || []}); } return stages[k] || null; }
/* hồ sơ lô với ba danh sách là bản nháp (nếu có): dùng để hiển thị và kiểm tra khi xem trước */
function stJob(rec) { const st = stCur(); if (!st) return rec; const g = ganDoi(rec.doi, st.cur.nc), v = ganVC(rec.hdvc, st.cur.dx), pc = ganPC(g.doi, st.cur.pc);
return ganKhoaHoSo(Object.assign({}, rec, {nc: g.nc, doi: g.doi, dx: v.dx, hdvc: v.hdvc, pc, info: Object.assign({}, rec.info, {_klPC: klPhieu(pc)})}), rec.fid + '|nhap'); }
const ST_LABEL = {nc: 'nhân công', dx: 'xe', pc: 'phiếu cân'}, ST_CHECK = {nc: checkNC, dx: checkDX, pc: checkPC};
const ST_TAB = {nc: 'nc', dx: 'dx', pc: 'dx'};
/* Lý do chặn tạo, xuất, in hồ sơ khi lô còn thay đổi chưa lưu ('' nếu được phép) */
function stBlockText() {
  const st = stCur(), lo = loDirty.has(NAV.curF); if ((!st || !HAKStage.dirty(st)) && !lo) return '';
  const ks = st && HAKStage.dirty(st) ? HAKStage.dirtyKinds(st) : [];
  return 'Lô này còn thay đổi chưa lưu ở ' + [...(lo ? ['thông tin lô (đội, đội xe, số văn bản, chấm công…)'] : []), ...ks.map(k => ST_LABEL[k])].join(', ') + '. Bấm “Lưu dữ liệu vào lô” (hoặc “Bỏ thay đổi”) rồi mới tạo, xuất, in hồ sơ.';
}
function stBlockNote() { const t = stBlockText(); if (t) { pushNote(t, 'err'); const st = stCur(), k = st && HAKStage.dirty(st) ? HAKStage.dirtyKinds(st)[0] : null; if (k) NAV.ftab = ST_TAB[k]; render(); } return !!t; }
/* thanh “Chưa lưu” của cả lô (mọi tab của lô) */
function loBar() { const t = stBlockText(); return t ? '<div class="msg warn" id="loDirtyBar"><b>Chưa lưu</b> — ' + esc(t.replace(/ Bấm .*$/,
'')) + ' <span class="row" style="display:inline-flex;gap:6px;margin-left:8px"><button class="btn sm" data-act="stSave">Lưu dữ liệu vào lô</button><button class="btn ghost sm" data-act="stDiscard">Bỏ thay đổi</button></span></div>' : ''; }
/* lưu phần thông tin lô (khi không có bảng nháp) */
async function luuLoTT(opt) {
  const f = curForest(); if (!f) return {ok: false};
  const sNhap = nhapChup(), o0 = curOwner(); if (o0) chuChot(o0.id);
  const had = loDirty.delete(f.id), r = await persistNow();
  if (!r || !r.ok) { if (had) loDirty.add(f.id); nhapKhoiPhuc(sNhap); pushNote('Không lưu được: ' + ((r && r.error) || 'không rõ'), 'err'); render(); return r || {ok: false}; }
  if (had && !(opt && opt.tuKhung)) pushNote('Đã lưu dữ liệu vào lô ' + ((f.info || {}).maRung || '') + '.', 'ok');
  nhapTamGhi(); render(); return {ok: true};
}
/* Nút Lưu của từng khung trong lô = lưu cả lô (một cách lưu) */
function luuLo() { persistLo(); return stSave({tuKhung: true}); }
function stErrBox() { return stErrList && stErrList.length ? '<div class="msg err" id="stErrBox"><b>Chưa lưu được vì còn lỗi (' + stErrList.length + '):</b><ul class="issues">' + stErrList.slice(0,
30).map(e => '<li>' + esc(e) + '</li>').join('') + (stErrList.length > 30 ? '<li>… còn ' + (stErrList.length - 30) + ' lỗi</li>' : '') + '</ul></div>' : ''; }
function stBar(kind, rec) {
  const st = stCur(), o = curOwner(), c = st ? HAKStage.counts(st, kind) : null, dk = st ? HAKStage.dirtyKinds(st) : [];
  /* phiếu #06 (D-03): chủ rừng / lô đã có ở thanh ngữ cảnh và đường dẫn — chỉ ghi nguồn của lượt nhập đang làm */
  const info = st && st.src[kind] ? '<span class="stInfo mut">Nguồn lượt này: <b>' + esc(st.src[kind]) + '</b></span>' : '';
  /* nhân công / xe: tách bạch Chọn từ Danh mục (nhiều dòng) và Nhập mới */
  const add = kind === 'pc' ? '' :
    '<button class="btn sm" data-act="dmChonNhieu" data-kind="' + kind + '">+ Chọn từ Danh mục' + (kind === 'dx' ? ' xe' : '') + '</button>' +
    '<button class="btn ghost sm" data-act="stAdd" data-kind="' + kind + '">+ Thêm ' + ST_LABEL[kind] + ' mới</button>' +
    (window.hak?.testLegacyImport ? '' : '<button class="btn ghost sm" data-act="' + (kind === 'nc' ? 'openSetDt' : 'openSetXe') + '" data-quaylai="' + kind + '">Mở ' + (kind === 'nc' ? 'Danh mục đối tượng' : 'Danh mục xe') + ' (Excel)</button>');
  const sum = c ? ('Thêm mới <b>' + c.new + '</b> · Sửa <b>' + c.changed + '</b> · Xóa <b>' + c.removed + '</b> · Giữ nguyên <b>' + c.same + '</b>') : '';
  const bar = dk.length ? '<div class="msg warn stDirty" id="stDirty"><b>Chưa lưu</b> ' + (dk.length > 1 || dk[0] !== kind ? '(còn thay đổi ở ' + dk.map(k => ST_LABEL[k]).join(', ') + ') ' : '') + '— ' + (c && (c.new + c.changed + c.removed) ? sum + '. ' : '') + 'Hồ sơ chỉ dùng dữ liệu đã lưu.' +
    ' <span class="row" style="display:inline-flex;gap:6px;margin-left:8px"><button class="btn sm" data-act="stSave">Lưu dữ liệu vào lô</button><button class="btn ghost sm" data-act="stDiscard">Bỏ thay đổi</button></span></div>' : '';
  const miss = st && (kind === 'pc' || kind === 'dx') ? [...new Set(st.cur.pc.map(p => p.bienSo).filter(b => b && !st.cur.dx.some(x => HAKStage.bienKey(x.bienSo) === HAKStage.bienKey(b))))] : [];
  const missBar = miss.length ? '<div class="msg warn" id="stMissXe">Biển số có trong phiếu cân nhưng <b>chưa có trong danh sách xe của lô</b>: ' + miss.slice(0, 12).map(b => '<button class="btn ghost sm" data-act="stAddXe" data-bien="' + esc(b) + '">+ Thêm xe ' + esc(b) + '</button>').join(' ') +
  (miss.length > 12 ? ' … và ' + (miss.length - 12) + ' biển khác' : '') + '</div>' : '';
  const lech = kind === 'nc' || kind === 'dx' ? dmThanhLech(kind) : '', thanh = add || info ? '<div class="row stToolbar">' + add + info + '</div>' : '';
  return (thanh || lech || missBar || bar ? '<div class="card stBarCard">' + thanh + lech + missBar + bar + '</div>' : '') + stPendBox(kind) + stReportBox(kind) + nhatKyNapBox(kind);
}
const ST_ACT = {giu: ['pill ok', 'Giữ nguyên bản hiện có'], 'giu-trong': ['pill ok', 'Giữ giá trị hiện có (ô nguồn trống)'], 'giu-tay': ['pill ok', 'Giữ giá trị bạn đã sửa tay'], doi: ['pill warn', 'Đổi sang giá trị mới'], loi: ['pill err', 'Sai định dạng: không áp dụng, báo lỗi']};
const stV = v => v == null || v === '' ? '<span class="mut">(trống)</span>' : esc(typeof v === 'number' ? String(v).replace('.', ',') : String(v));
/* chi tiết lần nạp gần nhất: từng trường được giữ, đổi hay báo lỗi, kèm nguồn */
function stReportBox(kind) {
  const st = stCur(), rp = st && st.report && st.report[kind]; if (!rp || !rp.changes.length) return '';
  const rows = rp.changes.map(ch => ch.fields.map((f, i) => '<tr>' + (i ? '<td></td>' : '<td rowspan="' + ch.fields.length + '"><b>' + esc(ch.key) + '</b><br><small class="mut">' + esc(ch.source) + '</small></td>') + '<td>' + esc(f.label) + '</td><td>' + stV(f.cu) + '</td><td>' + stV(f.moi) +
  '</td><td><span class="' + ST_ACT[f.act][0] + '">' + ST_ACT[f.act][1] + '</span></td></tr>').join('')).join('');
  return '<details class="card" id="stReport" open><summary><b>Chi tiết lần nạp gần nhất (' + rp.changes.length +
  ' bản ghi)</b> — trường nào được giữ, đổi hoặc báo lỗi</summary><div class="tw"><table><thead><tr><th>Khóa</th><th>Trường</th><th>Hiện có</th><th>Giá trị mới</th><th>Kết quả</th></tr></thead><tbody>' + rows + '</tbody></table></div></details>';
}
/* dòng nhập cùng số phiếu nhưng khác dữ liệu: hai bản ghi cạnh nhau, chờ người dùng chọn */
function stPendBox(kind) {
  const st = stCur(), ps = st ? HAKStage.pendingOf(st, kind) : []; if (!ps.length) return '';
  const o = db.rs[NAV.cur], f = o && o.forests[NAV.curF], ma = f ? f.info.maRung : '';
  const cell = (r, src) => r ? [r.soPhieu, ma, r.ngay, r.bienSo, r.noiCan, r.noiGiao, r.kl, src].map(stV) : [];
  const heads = ['Số phiếu', 'Mã lô', 'Ngày cân', 'Biển số', 'Nơi cân', 'Nơi giao', 'Khối lượng (tấn)', 'Nguồn'];
  return '<div class="card msg err" id="stPend"><b>Cần đối chiếu (' + ps.length + '):</b> cùng số phiếu nhưng khác dữ liệu. Phiếu hiện có giữ nguyên cho đến khi bạn chọn; chưa xử lý thì chưa lưu được.' + ps.map(q => {
    const cands = q.candidates.map(id => st.cur[q.kind].find(x => x._id === id)).filter(Boolean), diffF = new Set(q.diffs.map(d => d.f));
    const cols = cands.map((c, i) => ({t: 'Bản hiện có' + (cands.length > 1 ? ' ' + (i + 1) : ''), v: cell(c, c._nguon || 'đã lưu'), id: c._id})).concat([{t: 'Dòng nguồn mới', v: cell(q.incoming, q.source)}]);
    const fkey = ['soPhieu', 'maRung', 'ngay', 'bienSo', 'noiCan', 'noiGiao', 'kl', ''];
    const tbl = '<table><thead><tr><th></th>' + cols.map(c => '<th>' + c.t + '</th>').join('') + '</tr></thead><tbody>' + heads.map((h, i) => '<tr><td>' + h + '</td>' + cols.map(c => '<td' + (diffF.has(fkey[i]) ? ' style="background:var(--warnBg);color:var(--warnFg)"' : '') + '>' + c.v[i] + '</td>').join('') +
    '</tr>').join('') + '</tbody></table>';
    const pick = cands.length > 1 ? '<select data-pendsel="' + q.pid + '">' + cands.map((c, i) => '<option value="' + esc(c._id) + '">Bản hiện có ' + (i + 1) + '</option>').join('') + '</select> ' : '';
    return '<div class="stPendRow" data-pid="' + q.pid + '"><div class="tw">' + tbl + '</div><div class="row" style="gap:6px;flex-wrap:wrap;margin-top:6px">' + pick +
      '<button class="btn sm" data-act="stPend" data-do="keep" data-pid="' + q.pid + '">Giữ bản hiện có</button><button class="btn sm" data-act="stPend" data-do="update" data-pid="' + q.pid +
      '">Cập nhật phiếu (đã xác nhận cùng chuyến)</button><span class="row" style="gap:4px;display:inline-flex"><input type="text" data-pendso="' + q.pid + '" placeholder="Số phiếu (trống = giữ số này)" style="width:190px"><button class="btn ghost sm" data-act="stPend" data-do="other" data-pid="' + q.pid +
      '" title="Cùng số phiếu nhưng khác ngày cân là hợp lệ: để trống ô số phiếu để giữ số này. Cùng số và cùng ngày thì phải nhập số phiếu riêng">Là chuyến khác</button></span><button class="btn ghost sm" data-act="stPend" data-do="drop" data-pid="' + q.pid + '">Bỏ dòng nguồn</button></div></div>';
  }).join('') + '</div>';
}
function stPendAct(el) {
  const st = stCur(); if (!st) return; const pid = el.dataset.pid, d = el.dataset.do, sel = document.querySelector('[data-pendsel="' + pid + '"]'); let opt = {};
  if (d === 'update' && sel) opt.targetId = sel.value;
  if (d === 'other') { const inp = document.querySelector('[data-pendso="' + pid + '"]'); opt.soPhieu = inp ? inp.value : ''; }   // Electron không hỗ trợ prompt(): nhập ngay trên dòng
  const r = HAKStage.resolve(st, pid, d, opt); if (!r.ok) { pushNote(r.error, 'err'); return render(); }
  stErrList = null; pushNote({keep: 'Giữ nguyên bản hiện có; dòng nguồn không được áp dụng.', drop: 'Đã bỏ dòng nguồn.', update: 'Đã cập nhật phiếu theo dòng nguồn (cùng chuyến).', other: 'Đã thêm dòng nguồn thành chuyến riêng với số phiếu mới.'}[d], 'ok'); render();
}
const ST_STATUS = {new: ['ok', 'Thêm mới'], changed: ['warn', 'Sửa'], same: ['', ''], removed: ['err', 'Sẽ xóa']};
/* ô trạng thái + thao tác của một dòng; diffMap: id → {status, old} */
function stCells(kind, r, i, dm) {
  const d = dm && r._id ? dm.get(r._id) : null, s = d ? d.status : 'same', L = ST_STATUS[s];
  let tip = ''; if (s === 'changed' && d.old) tip = Object.keys(r).filter(k => k[0] !== '_' && JSON.stringify(r[k]) !== JSON.stringify(d.old[k])).map(k => k + ': ' + (d.old[k] == null || d.old[k] === '' ? '(trống)' : d.old[k]) + ' → ' + (r[k] == null || r[k] === '' ? '(trống)' : r[k])).join('\n');
  const stat = (L[1] ? '<span class="pill ' + L[0] + '" title="' + esc(tip) + '">' + L[1] + '</span>' : '<span class="mut">Đã lưu</span>') + (r._nguon ? '<br><small class="mut">' + esc(r._nguon) + '</small>' : '');
  const del = s === 'new' ? '<button class="btn ghost sm" data-act="stDel" data-kind="' + kind + '" data-i="' + i + '" title="Bỏ dòng này khỏi lượt nhập (chưa lưu nên không ảnh hưởng dữ liệu đã lưu)">Bỏ dòng</button>' : '<button class="btn ghost sm" data-act="stDel" data-kind="' + kind +
  '" data-i="' + i + '" title="Xóa bản ghi đã lưu khỏi lô (có hiệu lực khi bấm Lưu)">Xóa đã lưu</button>';
  return {stat: '<td>' + stat + '</td>', act: '<td class="stAct"><button class="btn ghost sm" data-act="stEdit" data-kind="' + kind + '" data-i="' + i + '">Sửa</button> ' + (kind === 'pc' && s !== 'new' ? '<button class="btn ghost sm" data-act="pcDoiSo" data-i="' + i + '" title="Đổi số phiếu của chuyến đã lưu: bắt lý do, ghi nhật ký, giữ nguyên khối lượng">Đổi số</button> ' : '') + del + '</td>'};
}
/* bảng có dữ liệu nhưng không dòng nào hiện (bộ lọc, hoặc chỉ xem đội / hợp đồng đang mở): nói rõ, KHÔNG mời nhập lại (tránh nhập trùng) */
const ST_SF = {nc: 'lo_nhan_cong', dx: 'lo_xe', pc: 'lo_phieu_can'};
function stTrongDoLoc(kind, n) {
  const loc = typeof hakSfDangLoc === 'function' && hakSfDangLoc(ST_SF[kind]);
  return '<b>Không có dòng nào khớp ' + (loc ? 'bộ lọc' : 'phạm vi đang xem') + '.</b> Lô đang có ' + n + ' ' + ST_LABEL[kind] + ' (đã có dữ liệu, không cần nhập lại).' +
    (loc ? ' <button type="button" class="btn ghost sm" data-sfreset="' + ST_SF[kind] + '">Xóa tất cả lọc</button>' : '');
}
/* bảng dữ liệu có cột trạng thái, thao tác; dòng sẽ xóa hiện gạch ngang kèm “Hoàn tác” */
function stTable(kind, rec, heads, cells, c, align, only) {
  const st = stCur(), dm = st ? new Map(HAKStage.diff(st, kind).map(d => [d.row._id, d])) : null;
  const rows = rec[kind].map((r, i) => only && !only(r) ? '' : '<tr class="' + (c.state[r._row] === 'err' ? 'rerr' : c.state[r._row] === 'warn' ? 'rwarn' : '') + '">' + (x => '<td>' + r._row + '</td>' + x.act + cells(r) + x.stat)(stCells(kind, r, i, dm)) + '</tr>');
  const gone = st ? HAKStage.diff(st, kind).filter(d => d.status === 'removed') : [];
  const gtr = gone.map(d => '<tr class="stGone"><td>' + d.row._row + '</td><td class="stAct"><button class="btn ghost sm" data-act="stRestore" data-kind="' + kind + '" data-id="' + esc(d.row._id) + '">Hoàn tác</button></td>' + cells(d.row) + '<td><span class="pill err">Sẽ xóa</span></td></tr>');
  return '<div class="wrap"><table id="stTbl_' + kind + '"><thead><tr><th>Dòng</th><th>Thao tác</th>' + heads.map(h => '<th>' + h + '</th>').join('') + '<th>Trạng thái</th></tr></thead><tbody>' +
    (rows.concat(gtr).filter(Boolean).length ? rows.concat(gtr).join('') : '<tr><td colspan="' + (heads.length + 3) + '" class="mut" data-bang-trong="' + (rec[kind].length ? 'loc' : 'rong') + '">' + (rec[kind].length ? stTrongDoLoc(kind, rec[kind].length) :
      'Chưa có dữ liệu. Bấm <b>+ Chọn từ Danh mục</b> hoặc <b>+ Thêm ' + ST_LABEL[kind] + ' mới</b> ở thanh công cụ phía trên.') + '</td></tr>') +
    '</tbody></table></div>';
}
