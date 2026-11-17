/* ========== Chấm công thực tế (tính lương theo ngày công; src/chamcong.js) ========== */
let ccMonth = '';
function ccMonths(rec) {
  const CC = HAKChamCong, set = new Set(CC.monthsBetween(parseVN(rec.info.tuNgay), parseVN(rec.info.denNgay)));
  Object.keys(rec.cc || {}).forEach(k => set.add(k)); return [...set].sort();
}
const ccCur = rec => { const m = ccMonths(rec); return m.includes(ccMonth) ? ccMonth : m[0] || ''; };
const ccPersons = rec => ncList(rec);
function panelChamCong(rec) {
  if (rec.info.hinhThucLuong !== 'ngaycong' || !rec.nc.length) return '';
  const CC = HAKChamCong, months = ccMonths(rec), has = CC.hasAny(rec.cc);
  const head = '<div class="card" id="ccCard"><h3 style="margin-top:0">Chấm công thực tế <span class="mut" style="font-weight:400">tiền công = số công × đơn giá công</span></h3>';
  if (!months.length) return head + '<div class="msg warn">Nhập Thời gian khai thác (từ ngày, đến ngày) ở tab Thông tin rừng để chọn tháng chấm công.</div></div>';
  const k = ccCur(rec), n = CC.daysIn(k), ps = ccPersons(rec);
  const th = Array.from({length: n}, (_, i) => '<th class="' + (CC.isSunday(k, i + 1) ? 'ccSun' : '') + '">' + (i + 1) + '</th>').join('');
  const body = ps.map(r => { const pk = CC.personKey(r);
    return '<tr data-ccp="' + esc(pk) + '"><td class="ccName">' + esc(r.ten) + '</td>' + Array.from({length: n}, (_, i) => { const d = i + 1, v = CC.get(rec.cc, k, pk, d);
      return '<td class="' + (CC.isSunday(k, d) ? 'ccSun' : '') + '"><input class="ccIn" inputmode="decimal" data-cc="' + d + '" value="' + (v == null ? '' : esc(String(v).replace('.', ','))) + '" aria-label="' + esc(r.ten) + ' ngày ' + d + '"></td>'; }).join('') +
      '<td class="ccTot" data-ccm="' + esc(pk) + '">' + fmtCong(CC.monthTotal(rec.cc, k, pk)) + '</td><td class="ccTot" data-cca="' + esc(pk) + '"><b>' + fmtCong(CC.total(rec.cc, pk)) + '</b></td></tr>'; }).join('');
  return head + '<p class="mut" style="margin:0 0 8px">Nhập số công mỗi ngày: <b>1</b> = đủ công, <b>0,5</b> = nửa công, <b>0</b> hoặc để trống = nghỉ. Khi đã có số công chấm tay, <b>BM-08 dùng số công này cho từng người</b>; chưa nhập thì BM-08 tính theo thời gian khai thác (trừ Chủ nhật), mọi người bằng nhau. Hợp đồng (BM-01, BM-03) luôn dùng số công dự tính nên không đổi khi bạn chấm công.</p>' +
    '<div class="row" style="align-items:center;gap:8px;flex-wrap:wrap"><label style="margin:0">Tháng <select id="ccMonthSel">' + months.map(m => '<option value="' + m + '"' + (m === k ? ' selected' : '') + '>' + m.split('-')[1] + '/' + m.split('-')[0] + '</option>').join('') + '</select></label>' +
    '<button class="btn sm ghost" data-act="ccFill" title="Điền 1 công cho mọi người ở các ngày không phải Chủ nhật trong thời gian khai thác của tháng này">Điền đủ công (trừ Chủ nhật)</button>' +
    '<button class="btn sm ghost" data-act="ccClear">Xóa tháng này</button>' +
    '<button class="btn sm" data-act="ccPrint" title="Tải Bảng chấm công (BM-05) có số công đã nhập của tháng này">In bảng chấm công đã nhập</button></div>' +
    '<div class="msg ' + (has ? 'ok' : '') + '" id="ccNote" style="margin:8px 0">' + (has ? 'Đã có số công chấm tay: BM-08 dùng tổng công của từng người.' : 'Chưa chấm công: BM-08 dùng số công dự tính theo thời gian khai thác.') + '</div>' +
    '<div class="wrap"><table class="ccTbl"><thead><tr><th>Họ và tên</th>' + th + '<th>Tháng</th><th>Cả đợt</th></tr></thead><tbody>' + body + '</tbody></table></div></div>';
}
function ccCommit(note_) { persistLo(); const n = document.getElementById('ccNote'); if (n) { n.className = 'msg ok'; n.textContent = note_ || 'Đã có số công chấm tay: BM-08 dùng tổng công của từng người.'; } }
function ccRefreshTotals(f, k) {
  const CC = HAKChamCong; document.querySelectorAll('#ccCard tr[data-ccp]').forEach(tr => { const pk = tr.dataset.ccp; const a = tr.querySelector('[data-ccm]'), b = tr.querySelector('[data-cca]'); if (a) a.textContent = fmtCong(CC.monthTotal(f.cc, k, pk)); if (b) b.innerHTML = '<b>' + fmtCong(CC.total(f.cc, pk)) + '</b>'; });
}
function ccAct(act) {
  const f = curForest(), rec = curRec(); if (!f || !rec) return; f.cc = f.cc || {}; const CC = HAKChamCong, k = ccCur(rec); if (!k) return;
  if (act === 'ccFill') { CC.fillWork(f.cc, k, ccPersons(rec).map(CC.personKey), parseVN(rec.info.tuNgay), parseVN(rec.info.denNgay)); persistLo(); return render(); }
  if (act === 'ccClear') { CC.clearMonth(f.cc, k); persistLo(); return render(); }
  if (act === 'ccPrint') return ccExport(rec, k);
}
async function ccExport(rec, k) {
  const ex = exOf(rec, 'day'); ex._ccMonth = k; docMode = 'day';
  try {
    const B = doiOf(rec);   // lô nhiều đội: mỗi đội một bảng chấm công
    for (const d of B.doi) { const sr = subRec(rec, B, d), f = {path: '05_Bang_cham_cong_' + slug(rec.info.ten) + (B.multi ? '_' + slug(d.ten) : '') + '_' + k + '.docx', blocks: docChamCong(sr, ex), land: true}; download(await makeDocx(f.blocks, docOpts(f, sr)), f.path.split('/').pop()); }
  }
  catch (err) { note('Lỗi khi tạo file: ' + err.message, 'err'); }
}
document.addEventListener('change', e => {
  const t = e.target; if (!t || !t.closest) return;
  if (t.id === 'ccMonthSel') { ccMonth = t.value; return render(); }
  if (!t.classList || !t.classList.contains('ccIn')) return;
  const f = curForest(); if (!f) return; const CC = HAKChamCong, tr = t.closest('tr'), k = ccCur(curRec()), pk = tr.dataset.ccp, d = t.dataset.cc, v = CC.parseCell(t.value);
  if (v === undefined) { const o = CC.get(f.cc, k, pk, d); t.value = o == null ? '' : String(o).replace('.', ','); t.classList.add('ccBad'); return ccCommit('Số công mỗi ngày từ 0 đến 3 (ví dụ 1 hoặc 0,5): giá trị đã nhập không hợp lệ nên được giữ như cũ.'); }
  t.classList.remove('ccBad'); f.cc = f.cc || {}; CC.set(f.cc, k, pk, d, v); t.value = v == null ? '' : String(v).replace('.', ','); ccRefreshTotals(f, k); ccCommit();
});
/* ========== Bản nháp “Chưa lưu” của nhân công, xe, phiếu cân (src/stage.js) ========== */
/* Mọi nguồn (nhập tay, Excel, bản tra cứu) chỉ đổi BẢN NHÁP của lô đang mở. Hồ sơ lô (SQLite) chỉ đổi khi bấm “Lưu dữ liệu vào lô”; tạo, xuất, in hồ sơ chỉ dùng dữ liệu đã lưu. */
let dbEpoch = 0;   // tăng mỗi khi toàn bộ dữ liệu bị thay (khôi phục, nạp lại): lượt nhập đang chờ không còn đích hợp lệ
const stages = new Proxy({}, {set(t, k, v) { t[k] = v; doiDuLieu(); return true; }, deleteProperty(t, k) { delete t[k]; doiDuLieu(); return true; }});   // 'mã chủ rừng|mã lô' → bản nháp; thêm / bỏ bản nháp tăng phiên bản dữ liệu (B7)
const stKeyOf = (o, f) => o + '|' + f, stKey = () => stKeyOf(cur, curF);
const stCur = () => stages[stKey()] || null;
const stDirtyOf = k => (!!stages[k] && HAKStage.dirty(stages[k])) || loDirty.has(k.split('|')[1]);   // bảng nháp hoặc thay đổi khác của lô
const stDirtyList = () => [...new Set([...Object.keys(stages), ...Object.values(db.rs || {}).flatMap(o => Object.values(o.forests || {}).filter(f => loDirty.has(f.id)).map(f => stKeyOf(o.id, f.id)))])].filter(stDirtyOf);
const stDirtyCur = () => stDirtyOf(stKey());
function stGetFor(oid, fid, make) { const k = stKeyOf(oid, fid), o = db.rs[oid], f = o && o.forests && o.forests[fid]; if (!f) return null; if (!stages[k] && make) stages[k] = HAKStage.create({nc: f.nc || [], dx: f.dx || [], pc: f.pc || []}); return stages[k] || null; }
function stGet(make) { const k = stKey(); if (!stages[k] && make) { const f = curForest(); if (!f) return null; stages[k] = HAKStage.create({nc: f.nc || [], dx: f.dx || [], pc: f.pc || []}); } return stages[k] || null; }
/* hồ sơ lô với ba danh sách là bản nháp (nếu có): dùng để hiển thị và kiểm tra khi xem trước */
function stJob(rec) { const st = stCur(); if (!st) return rec; const g = ganDoi(rec.doi, st.cur.nc), v = ganVC(rec.hdvc, st.cur.dx), pc = ganPC(g.doi, st.cur.pc); return ganKhoaHoSo(Object.assign({}, rec, {nc: g.nc, doi: g.doi, dx: v.dx, hdvc: v.hdvc, pc, info: Object.assign({}, rec.info, {_klPC: klPhieu(pc)})}), rec.fid + '|nhap'); }
const ST_LABEL = {nc: 'nhân công', dx: 'xe', pc: 'phiếu cân'}, ST_CHECK = {nc: checkNC, dx: checkDX, pc: checkPC};
const ST_TAB = {nc: 'nc', dx: 'dx', pc: 'dx'};
/* Lý do chặn tạo, xuất, in hồ sơ khi lô còn thay đổi chưa lưu ('' nếu được phép) */
function stBlockText() {
  const st = stCur(), lo = loDirty.has(curF); if ((!st || !HAKStage.dirty(st)) && !lo) return '';
  const ks = st && HAKStage.dirty(st) ? HAKStage.dirtyKinds(st) : [];
  return 'Lô này còn thay đổi chưa lưu ở ' + [...(lo ? ['thông tin lô (đội, đội xe, số văn bản, chấm công…)'] : []), ...ks.map(k => ST_LABEL[k])].join(', ') + '. Bấm “Lưu dữ liệu vào lô” (hoặc “Bỏ thay đổi”) rồi mới tạo, xuất, in hồ sơ.';
}
function stBlockNote() { const t = stBlockText(); if (t) { pushNote(t, 'err'); const st = stCur(), k = st && HAKStage.dirty(st) ? HAKStage.dirtyKinds(st)[0] : null; if (k) ftab = ST_TAB[k]; render(); } return !!t; }
/* thanh “Chưa lưu” của cả lô (mọi tab của lô) */
function loBar() { const t = stBlockText(); return t ? '<div class="msg warn" id="loDirtyBar"><b>Chưa lưu</b> — ' + esc(t.replace(/ Bấm .*$/, '')) + ' <span class="row" style="display:inline-flex;gap:6px;margin-left:8px"><button class="btn sm" data-act="stSave">Lưu dữ liệu vào lô</button><button class="btn ghost sm" data-act="stDiscard">Bỏ thay đổi</button></span></div>' : ''; }
/* lưu phần thông tin lô (khi không có bảng nháp) */
async function luuLoTT(opt) {
  const f = curForest(); if (!f) return {ok: false};
  const had = loDirty.delete(f.id), r = await persistNow();
  if (!r || !r.ok) { if (had) loDirty.add(f.id); pushNote('Không lưu được: ' + ((r && r.error) || 'không rõ'), 'err'); render(); return r || {ok: false}; }
  if (had && !(opt && opt.tuKhung)) pushNote('Đã lưu dữ liệu vào lô ' + ((f.info || {}).maRung || '') + '.', 'ok');
  nhapTamGhi(); render(); return {ok: true};
}
/* Nút Lưu của từng khung trong lô = lưu cả lô (một cách lưu) */
function luuLo() { persistLo(); return stSave({tuKhung: true}); }
function stErrBox() { return stErrList && stErrList.length ? '<div class="msg err" id="stErrBox"><b>Chưa lưu được vì còn lỗi (' + stErrList.length + '):</b><ul class="issues">' + stErrList.slice(0, 30).map(e => '<li>' + esc(e) + '</li>').join('') + (stErrList.length > 30 ? '<li>… còn ' + (stErrList.length - 30) + ' lỗi</li>' : '') + '</ul></div>' : ''; }
function stBar(kind, rec) {
  const st = stCur(), o = curOwner(), c = st ? HAKStage.counts(st, kind) : null, dk = st ? HAKStage.dirtyKinds(st) : [];
  const info = '<div class="stInfo">Chủ rừng: <b>' + esc(o ? o.info.ten : '') + '</b> · Lô: <b>' + esc(rec.info.maRung || '(chưa có mã)') + '</b>' + (st && st.src[kind] ? ' · Nguồn lượt này: <b>' + esc(st.src[kind]) + '</b>' : '') + '</div>';
  const add = kind === 'pc' ? '' : '<button class="btn sm" data-act="stAdd" data-kind="' + kind + '">+ Thêm ' + ST_LABEL[kind] + '</button>';
  const sum = c ? ('Thêm mới <b>' + c.new + '</b> · Sửa <b>' + c.changed + '</b> · Xóa <b>' + c.removed + '</b> · Giữ nguyên <b>' + c.same + '</b>') : '';
  const bar = dk.length ? '<div class="msg warn stDirty" id="stDirty"><b>Chưa lưu</b> ' + (dk.length > 1 || dk[0] !== kind ? '(còn thay đổi ở ' + dk.map(k => ST_LABEL[k]).join(', ') + ') ' : '') + '— ' + (c && (c.new + c.changed + c.removed) ? sum + '. ' : '') + 'Hồ sơ chỉ dùng dữ liệu đã lưu.' +
    ' <span class="row" style="display:inline-flex;gap:6px;margin-left:8px"><button class="btn sm" data-act="stSave">Lưu dữ liệu vào lô</button><button class="btn ghost sm" data-act="stDiscard">Bỏ thay đổi</button></span></div>' : '';
  const miss = st && (kind === 'pc' || kind === 'dx') ? [...new Set(st.cur.pc.map(p => p.bienSo).filter(b => b && !st.cur.dx.some(x => HAKStage.bienKey(x.bienSo) === HAKStage.bienKey(b))))] : [];
  const missBar = miss.length ? '<div class="msg warn" id="stMissXe">Biển số có trong phiếu cân nhưng <b>chưa có trong danh sách xe của lô</b>: ' + miss.slice(0, 12).map(b => '<button class="btn ghost sm" data-act="stAddXe" data-bien="' + esc(b) + '">+ Thêm xe ' + esc(b) + '</button>').join(' ') + (miss.length > 12 ? ' … và ' + (miss.length - 12) + ' biển khác' : '') + '</div>' : '';
  return '<div class="card stBarCard">' + info + '<div class="row" style="gap:8px;flex-wrap:wrap">' + add + '</div>' + (kind === 'nc' || kind === 'dx' ? dmThanhLech(kind) : '') + missBar + bar + '</div>' + stPendBox(kind) + stReportBox(kind) + nhatKyNapBox(kind);
}
const ST_ACT = {giu: ['pill ok', 'Giữ nguyên bản hiện có'], 'giu-trong': ['pill ok', 'Giữ giá trị hiện có (ô nguồn trống)'], 'giu-tay': ['pill ok', 'Giữ giá trị bạn đã sửa tay'], doi: ['pill warn', 'Đổi sang giá trị mới'], loi: ['pill err', 'Sai định dạng: không áp dụng, báo lỗi']};
const stV = v => v == null || v === '' ? '<span class="mut">(trống)</span>' : esc(typeof v === 'number' ? String(v).replace('.', ',') : String(v));
/* chi tiết lần nạp gần nhất: từng trường được giữ, đổi hay báo lỗi, kèm nguồn */
function stReportBox(kind) {
  const st = stCur(), rp = st && st.report && st.report[kind]; if (!rp || !rp.changes.length) return '';
  const rows = rp.changes.map(ch => ch.fields.map((f, i) => '<tr>' + (i ? '<td></td>' : '<td rowspan="' + ch.fields.length + '"><b>' + esc(ch.key) + '</b><br><small class="mut">' + esc(ch.source) + '</small></td>') + '<td>' + esc(f.label) + '</td><td>' + stV(f.cu) + '</td><td>' + stV(f.moi) + '</td><td><span class="' + ST_ACT[f.act][0] + '">' + ST_ACT[f.act][1] + '</span></td></tr>').join('')).join('');
  return '<details class="card" id="stReport" open><summary><b>Chi tiết lần nạp gần nhất (' + rp.changes.length + ' bản ghi)</b> — trường nào được giữ, đổi hoặc báo lỗi</summary><div class="tw"><table><thead><tr><th>Khóa</th><th>Trường</th><th>Hiện có</th><th>Giá trị mới</th><th>Kết quả</th></tr></thead><tbody>' + rows + '</tbody></table></div></details>';
}
/* dòng nhập cùng số phiếu nhưng khác dữ liệu: hai bản ghi cạnh nhau, chờ người dùng chọn */
function stPendBox(kind) {
  const st = stCur(), ps = st ? HAKStage.pendingOf(st, kind) : []; if (!ps.length) return '';
  const o = db.rs[cur], f = o && o.forests[curF], ma = f ? f.info.maRung : '';
  const cell = (r, src) => r ? [r.soPhieu, ma, r.ngay, r.bienSo, r.noiCan, r.noiGiao, r.kl, src].map(stV) : [];
  const heads = ['Số phiếu', 'Mã lô', 'Ngày cân', 'Biển số', 'Nơi cân', 'Nơi giao', 'Khối lượng (tấn)', 'Nguồn'];
  return '<div class="card msg err" id="stPend"><b>Cần đối chiếu (' + ps.length + '):</b> cùng số phiếu nhưng khác dữ liệu. Phiếu hiện có giữ nguyên cho đến khi bạn chọn; chưa xử lý thì chưa lưu được.' + ps.map(q => {
    const cands = q.candidates.map(id => st.cur[q.kind].find(x => x._id === id)).filter(Boolean), diffF = new Set(q.diffs.map(d => d.f));
    const cols = cands.map((c, i) => ({t: 'Bản hiện có' + (cands.length > 1 ? ' ' + (i + 1) : ''), v: cell(c, c._nguon || 'đã lưu'), id: c._id})).concat([{t: 'Dòng nguồn mới', v: cell(q.incoming, q.source)}]);
    const fkey = ['soPhieu', 'maRung', 'ngay', 'bienSo', 'noiCan', 'noiGiao', 'kl', ''];
    const tbl = '<table><thead><tr><th></th>' + cols.map(c => '<th>' + c.t + '</th>').join('') + '</tr></thead><tbody>' + heads.map((h, i) => '<tr><td>' + h + '</td>' + cols.map(c => '<td' + (diffF.has(fkey[i]) ? ' style="background:#fff3cd"' : '') + '>' + c.v[i] + '</td>').join('') + '</tr>').join('') + '</tbody></table>';
    const pick = cands.length > 1 ? '<select data-pendsel="' + q.pid + '">' + cands.map((c, i) => '<option value="' + esc(c._id) + '">Bản hiện có ' + (i + 1) + '</option>').join('') + '</select> ' : '';
    return '<div class="stPendRow" data-pid="' + q.pid + '"><div class="tw">' + tbl + '</div><div class="row" style="gap:6px;flex-wrap:wrap;margin-top:6px">' + pick +
      '<button class="btn sm" data-act="stPend" data-do="keep" data-pid="' + q.pid + '">Giữ bản hiện có</button><button class="btn sm" data-act="stPend" data-do="update" data-pid="' + q.pid + '">Cập nhật phiếu (đã xác nhận cùng chuyến)</button><span class="row" style="gap:4px;display:inline-flex"><input type="text" data-pendso="' + q.pid + '" placeholder="Số phiếu mới" style="width:130px"><button class="btn ghost sm" data-act="stPend" data-do="other" data-pid="' + q.pid + '" title="Hai chuyến khác nhau phải có số phiếu riêng">Là chuyến khác</button></span><button class="btn ghost sm" data-act="stPend" data-do="drop" data-pid="' + q.pid + '">Bỏ dòng nguồn</button></div></div>';
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
  const del = s === 'new' ? '<button class="btn ghost sm" data-act="stDel" data-kind="' + kind + '" data-i="' + i + '" title="Bỏ dòng này khỏi lượt nhập (chưa lưu nên không ảnh hưởng dữ liệu đã lưu)">Bỏ dòng</button>' : '<button class="btn ghost sm" data-act="stDel" data-kind="' + kind + '" data-i="' + i + '" title="Xóa bản ghi đã lưu khỏi lô (có hiệu lực khi bấm Lưu)">Xóa đã lưu</button>';
  return '<td>' + stat + '</td><td class="stAct"><button class="btn ghost sm" data-act="stEdit" data-kind="' + kind + '" data-i="' + i + '">Sửa</button> ' + del + '</td>';
}
/* bảng dữ liệu có cột trạng thái, thao tác; dòng sẽ xóa hiện gạch ngang kèm “Hoàn tác” */
function stTable(kind, rec, heads, cells, c, align, only) {
  const st = stCur(), dm = st ? new Map(HAKStage.diff(st, kind).map(d => [d.row._id, d])) : null;
  const rows = rec[kind].map((r, i) => only && !only(r) ? '' : '<tr class="' + (c.state[r._row] === 'err' ? 'rerr' : c.state[r._row] === 'warn' ? 'rwarn' : '') + '"><td>' + r._row + '</td>' + cells(r) + stCells(kind, r, i, dm) + '</tr>');
  const gone = st ? HAKStage.diff(st, kind).filter(d => d.status === 'removed') : [];
  const gtr = gone.map(d => '<tr class="stGone"><td>' + d.row._row + '</td>' + cells(d.row) + '<td><span class="pill err">Sẽ xóa</span></td><td><button class="btn ghost sm" data-act="stRestore" data-kind="' + kind + '" data-id="' + esc(d.row._id) + '">Hoàn tác</button></td></tr>');
  return '<div class="wrap"><table id="stTbl_' + kind + '"><thead><tr><th>Dòng</th>' + heads.map(h => '<th>' + h + '</th>').join('') + '<th>Trạng thái</th><th>Thao tác</th></tr></thead><tbody>' + rows.concat(gtr).join('') + '</tbody></table></div>';
}
/* ----- hộp thoại thêm / sửa một dòng ----- */
const ST_FIELDS = {
  nc: [['vaiTro', 'Vai trò', ['Tổ trưởng', 'Công nhân']], ['stt', 'STT'], ['danhXung', 'Danh xưng', ['Ông', 'Bà']], ['ten', 'Họ và tên'], ['ngaySinh', 'Ngày sinh (dd/mm/yyyy)'], ['cccd', 'CCCD (12 số)'], ['ngayCap', 'Ngày cấp CCCD'], ['noiCap', 'Nơi cấp'], ['diaChi', 'Địa chỉ thường trú'], ['chucDanh', 'Chức danh', () => chucDanhAll()], ['doi', 'Đội (trống: vào đội đang chọn ở bảng Nhân công khai thác; ghi đúng tên đội để vào đội đó)']],
  dx: [['stt', 'STT'], ['bienSo', 'Biển kiểm soát'], ['loaiXe', 'Loại xe'], ['chuXe', 'Chủ xe'], ['ngaySinh', 'Ngày sinh chủ xe'], ['cccd', 'CCCD chủ xe'], ['ngayCap', 'Ngày cấp CCCD'], ['noiCap', 'Nơi cấp'], ['diaChi', 'Thường trú chủ xe'], ['cavet', 'Ngày cấp cà vẹt'], ['sdt', 'Số điện thoại'], ['nguoiKy', 'Người ký HĐ vận chuyển', ['Chủ xe', 'Tài xế']],
    ['taiXe', 'Tên tài xế'], ['ngaySinhTx', 'Ngày sinh tài xế'], ['cccdTx', 'CCCD tài xế'], ['ngayCapTx', 'Ngày cấp CCCD tài xế'], ['noiCapTx', 'Nơi cấp CCCD tài xế'], ['diaChiTx', 'Thường trú tài xế'], ['gplx', 'Số GPLX'], ['hanGplx', 'Ngày đến hạn GPLX'], ['hanBH', 'Ngày đến hạn bảo hiểm'], ['kdTu', 'Kiểm định từ ngày'], ['kdDen', 'Kiểm định đến ngày']],
  pc: [['soPhieu', 'Số phiếu'], ['ngay', 'Ngày cân 1 (dd/mm/yyyy)'], ['bienSo', 'Xe (biển số)', 'XE'], ['gioCan1', 'Giờ cân 1'], ['ngay2', 'Ngày cân 2 (dd/mm/yyyy; để trống = tự suy ra từ giờ cân)'], ['gioCan2', 'Giờ cân 2'], ['can1', 'Cân lần 1 (kg)'], ['can2', 'Cân lần 2 (kg)'], ['klKg', 'Khối lượng (kg)'], ['kl', 'Khối lượng (tấn)'], ['khachHang', 'Khách hàng'], ['diaChi', 'Địa chỉ rừng trên phiếu'], ['donGia', 'Đơn giá (đồng/tấn)'], ['thanhTien', 'Thành tiền (đồng)'], ['nguonGoc', 'Nguồn gốc'], ['soCT', 'Số chứng từ'], ['trangThai', 'Trạng thái (OK hoặc trống = in)'], ['noiGiao', 'Nơi giao (nhà máy)'], ['ghiChu', 'Ghi chú']]
};
const ST_NORM = {nc: normNC, dx: normDX, pc: normPC};
const stm = {kind: '', id: null, vals: {}, parent: null, errs: []};   // trạng thái hộp thoại đang mở (parent: hộp thoại phiếu cân chờ quay lại sau khi thêm xe)
const stStr = v => v == null ? '' : typeof v === 'number' ? String(v).replace('.', ',') : String(v);
function stAct(act, el) {
  const kind = el.dataset.kind, i = el.dataset.i != null ? +el.dataset.i : null;
  if (act !== 'stSave' && act !== 'stClose') pcGanBao = null;   // 3.0: khung xem trước phiếu nạp chỉ hiện ngay sau lượt nạp; thao tác khác trên bản nháp thì ẩn (bấm Lưu bị chặn vẫn giữ để xử lý)
  if (act === 'stAdd') return stOpen(kind, null);
  if (act === 'stEdit') return stOpen(kind, i);
  if (act === 'stDel') return stDelete(kind, i);
  if (act === 'stRestore') { HAKStage.restoreRow(stCur(), kind, el.dataset.id); stErrList = null; return render(); }
  if (act === 'stAddXe') { stOpen('dx', null); stm.vals.bienSo = el.dataset.bien || ''; return stRender(); }
  if (act === 'stPend') return stPendAct(el);
  if (act === 'stSave') return stSave();
  if (act === 'stDiscard') return stDiscard();
  if (act === 'stGo') { const st = stCur(), k = st ? HAKStage.dirtyKinds(st)[0] : null; if (k) { ftab = ST_TAB[k]; render(); } return; }
  if (act === 'stClose') { const parent = stm.parent; $('#stBox').classList.remove('on'); stm.parent = null; if (parent) { const st = stCur(); stOpen(parent.kind, parent.id ? st.cur[parent.kind].findIndex(r => r._id === parent.id) : null, parent.vals); } }
}
function stApplyGate() {
  if (!stDirtyCur()) return; const why = stBlockText();
  document.querySelectorAll('#main button[data-act=dl], #main button[data-act=d2dl], #main button[data-act=d2confirm], #main button[data-act=d2legacy], #main button[data-act=pcPrint], #main button[data-act=ccPrint]').forEach(b => { b.disabled = true; b.title = why; });
}
function stOpen(kind, idx, vals, parent) {
  const st = stGet(true); if (!st) return;
  const row = idx != null ? st.cur[kind][idx] : null;
  stm.kind = kind; stm.id = row ? row._id : null; stm.parent = parent || null; stm.errs = [];
  stm.vals = vals || Object.fromEntries(ST_FIELDS[kind].map(([k]) => [k, row ? stStr(row[k]) : (k === 'nguoiKy' ? 'Chủ xe' : k === 'vaiTro' ? 'Công nhân' : k === 'danhXung' ? 'Ông' : '')]));
  if (!row && !vals && kind === 'pc') stm.vals.trangThai = 'OK';
  stRender();
}
function stRender() {
  const kind = stm.kind, st = stCur(), rec = curRec(), o = curOwner(); if (!st || !rec) return;
  const plates = [...new Set(st.cur.dx.map(x => x.bienSo).filter(Boolean))];
  const fld = ([k, label, opt]) => {
    const v = stm.vals[k] == null ? '' : stm.vals[k];
    if (opt === 'XE') return '<label><span>' + esc(label) + '</span><select name="' + k + '">' + '<option value="">— chọn xe của lô —</option>' + plates.map(p => '<option value="' + esc(p) + '"' + (HAKStage.bienKey(p) === HAKStage.bienKey(v) ? ' selected' : '') + '>' + esc(p) + '</option>').join('') + (v && !plates.some(p => HAKStage.bienKey(p) === HAKStage.bienKey(v)) ? '<option value="' + esc(v) + '" selected>' + esc(v) + ' (chưa có trong lô)</option>' : '') + '<option value="__new">+ Thêm xe mới…</option></select></label>';
    if (opt) { const list = typeof opt === 'function' ? opt() : opt; return '<label><span>' + esc(label) + '</span><select name="' + k + '">' + (list.includes(v) ? '' : '<option value="">—</option>') + list.map(x => '<option' + (x === v ? ' selected' : '') + '>' + esc(x) + '</option>').join('') + '</select></label>'; }
    return '<label><span>' + esc(label) + '</span><input name="' + k + '" value="' + esc(v) + '"></label>';
  };
  const title = (stm.id ? 'Sửa ' : 'Thêm ') + ST_LABEL[kind];
  $('#stBody').innerHTML = '<div class="gh"><h2>' + title + '</h2><button class="btn ghost sm" data-act="stClose">✕ Đóng</button></div>' +
    '<p class="mut" style="margin:0 0 8px">Chủ rừng: <b>' + esc(o.info.ten) + '</b> · Lô: <b>' + esc(rec.info.maRung) + '</b>. Dòng này chỉ vào bản nháp; hồ sơ lô thay đổi khi bấm “Lưu dữ liệu vào lô”.</p>' +
    (stm.errs.length ? '<div class="msg err"><b>Chưa đưa vào bản nháp:</b><ul class="issues">' + stm.errs.map(e => '<li>' + esc(e) + '</li>').join('') + '</ul></div>' : '') +
    (kind === 'dx' && !stm.id ? (() => { const hId = hdMo('dx'), daCo = new Set(st.cur.dx.filter(r => hId && r.hdvcId === hId).map(r => HAKStage.bienKey(r.bienSo))), L = dmNguonXe().filter(x => !daCo.has(HAKStage.bienKey(x.bienSo))); /* 3.0: mỗi xe một lần trong một hợp đồng */ return L.length ? '<label style="display:block;margin-bottom:8px"><span>Chọn xe từ Danh mục xe vận chuyển (thông tin mới nhất)</span><select id="xeDm"><option value="">— nhập xe mới (tự vào Danh mục khi lưu lô) —</option>' + L.map(x => '<option value="' + esc(HAKStage.bienKey(x.bienSo)) + '">' + esc(x.bienSo + ' · ' + (x.chuXe || '')) + '</option>').join('') + '</select></label>' : ''; })() : '') +
    (kind === 'nc' && !stm.id ? (() => { const dId = (curTeam() || {}).id, daCo = new Set(st.cur.nc.filter(r => !rec.doi || rec.doi.length < 2 || r.doiId === dId).map(r => HAKModel.cccdSo(r.cccd))), L = dmNguonLd().filter(r => !daCo.has(HAKModel.cccdSo(r.cccd)));   // 3.0: không trùng trong cùng đội; người ở đội khác vẫn chọn được, có ghi chú
      const doiKhac = c => { const x = st.cur.nc.find(r => HAKModel.cccdSo(r.cccd) === c); const d = x && (rec.doi || []).find(y => y.id === x.doiId); return d ? ' — đang ở ' + (d.ten || 'đội khác') : ''; }; return L.length ? '<label style="display:block;margin-bottom:8px"><span>Chọn người từ Danh mục lao động (theo CCCD, thông tin mới nhất)</span><select id="ncDm"><option value="">— nhập người mới (tự vào Danh mục khi lưu lô) —</option>' + L.map(r => '<option value="' + esc(HAKModel.cccdSo(r.cccd)) + '">' + esc((r._nhan || r.ten) + ' · CCCD ' + HAKModel.cccdSo(r.cccd) + doiKhac(HAKModel.cccdSo(r.cccd))) + '</option>').join('') + '</select><small class="mut">Điền sẵn họ tên, ngày sinh, CCCD, ngày cấp, nơi cấp, địa chỉ; vai trò, chức danh và đội chọn cho lô này. Thông tin được chụp lại trong lô, sửa ở lô này không đổi lô khác.</small></label>' : ''; })() : '') +
    '<form id="stForm" class="grid">' + ST_FIELDS[kind].map(fld).join('') + '<div style="grid-column:1/-1" class="row"><button class="btn" type="submit">' + (stm.id ? 'Cập nhật vào bản nháp' : 'Thêm vào bản nháp') + '</button><button class="btn ghost" type="button" data-act="stClose">Hủy</button></div></form>';
  $('#stBox').classList.add('on');
}
/* DANH MỤC XE: xe đã nhập ở mọi lô, gộp theo biển số (lô có ngày bắt đầu khai thác mới nhất thắng); chọn khi thêm xe để khỏi nhập lại giấy tờ */
function xeDanhMuc() {
  const by = new Map(), dk = s => { const p = HAKDates.parse(s || ''); return p ? p.y * 10000 + p.m * 100 + p.d : 0; };
  Object.values(db.rs || {}).forEach(o => forestList(o).forEach(f => (f.dx || []).forEach(r => { const k = HAKStage.bienKey(r.bienSo); if (!k) return; const t = dk((f.info || {}).tuNgay), cur = by.get(k); if (!cur || t >= cur.t) by.set(k, {t, r}); })));
  return [...by.values()].map(x => x.r).sort((a, b) => String(a.bienSo).localeCompare(String(b.bienSo)));
}
function stRead() { const f = $('#stForm'); if (!f) return stm.vals; const fd = new FormData(f); ST_FIELDS[stm.kind].forEach(([k]) => { stm.vals[k] = (fd.get(k) ?? '').toString(); }); return stm.vals; }
function stFinishRow() {
  const kind = stm.kind, st = stCur(), rec = curRec(); if (!st || !rec) return;
  const vals = stRead(), o = Object.assign({}, vals, {maRung: rec.info.maRung}); if (o.bienSo === '__new') o.bienSo = '';
  const row = ST_NORM[kind](o); const idx = stm.id ? st.cur[kind].findIndex(r => r._id === stm.id) : -1;
  const old = idx >= 0 ? st.cur[kind][idx] : null; if (kind === 'pc') HAKPhieuCan.chuanHoaNgay2(row, old);   // ngày cân 2 trống thì suy ra từ ngày cân 1 và giờ cân
   row._row = old ? old._row : st.cur[kind].reduce((m, r) => Math.max(m, +r._row || 0), 1) + 1; if (old) row._id = old._id;
  if (kind === 'nc' && rec.doi) { const m = trim(row.doi) && rec.doi.find(d => HAKDoi.fold(d.ten) === HAKDoi.fold(row.doi)), t = curTeam(); row.doiId = m ? m.id : old && old.doiId !== undefined ? old.doiId : (t ? t.id : ''); }   // đội của người: cột Đội khớp tên đội → đội đó; sửa người cũ → giữ đội; người mới → đội đang chọn
  const list = st.cur[kind].slice(); if (idx >= 0) list[idx] = row; else list.push(row);
  const chk = ST_CHECK[kind](kind === 'nc' ? Object.assign({}, stJob(rec), ganDoi(rec.doi, list)) : Object.assign({}, stJob(rec), {[kind]: list})), mine = chk.errs.filter(m => m.startsWith('Dòng ' + row._row + ':'));
  if (mine.length) { stm.errs = mine; return stRender(); }
  if (kind === 'dx' && old && HAKStage.bienKey(old.bienSo) !== HAKStage.bienKey(row.bienSo)) {
    const lk = HAKStage.linkedPc(st, old.bienSo);
    if (lk.length && !confirm('Đổi biển số xe ' + old.bienSo + ' → ' + row.bienSo + ' sẽ đổi biển số của ' + lk.length + ' phiếu cân liên kết:\n' + lk.slice(0, 12).map(p => '• ' + p.soPhieu + ' (' + p.ngay + ', ' + fmtT(Math.round((+p.kl || 0) * 1000)) + ' tấn)').join('\n') + (lk.length > 12 ? '\n• … và ' + (lk.length - 12) + ' phiếu khác' : '') + '\n\nSố chuyến, khối lượng và tiền không đổi. Tiếp tục?')) return;
  }
  row._nguon = old && old._nguon ? old._nguon : 'Nhập tay';
  if (old && old.id && !row.id) row.id = old.id;
  if (kind === 'pc') { ['hdvcId', 'xeRowId', 'xeTay'].forEach(k => { if (old && old[k] && !row[k]) row[k] = old[k]; }); if (!old && hdMo('dx')) { const f = curForest(), c = f && phieuDich(f, st.cur.dx, hdMo('dx'), row.bienSo); if (c) { row.hdvcId = c.hdvcId; if (c.xe && c.xe.id) row.xeRowId = c.xe.id; } } }   // 3.0: phiếu thêm tay ở hợp đồng đang mở   // 3.0: ID dòng (chấm công, phiếu cân, phân bổ nối theo ID) không đổi khi sửa
  ['nguoiId', 'viTriId', 'xeId', 'taiXeId'].forEach(k => { const v = vals[k] != null ? vals[k] : old && old[k]; if (v) row[k] = v; });   // 3.0: liên kết danh mục (chọn từ danh mục; sửa tay giữ liên kết)
  { const dmN = vals._dmNgay != null ? vals._dmNgay : old && old._dmNgay; if (dmN != null && (kind === 'nc' || kind === 'dx')) row._dmNgay = dmN; }   // ngày chụp danh mục: giữ khi sửa tay, mới khi chọn từ danh mục
  if (!old && kind === 'dx') pgSauThemXe(st, row);   // 3.0: xe thêm ở hợp đồng đang mở vào đúng hợp đồng, có ID dòng; phiếu chờ xe nhận xe này
  if (old) HAKStage.updateRow(st, kind, old._id, row); else { const nid = HAKStage.addRow(st, kind, row); if (kind === 'pc' && hdMo('dx')) pcGanThem(nid); }   // 3.0: phiếu nhập tay cũng hiện ở khung xem trước (cùng quy tắc hợp đồng đích)
  st.src[kind] = st.src[kind] || 'Nhập tay';
  stErrList = null; const parent = stm.parent; stm.errs = []; $('#stBox').classList.remove('on');
  if (parent) { parent.vals.bienSo = row.bienSo; stOpen(parent.kind, parent.id ? st.cur[parent.kind].findIndex(r => r._id === parent.id) : null, parent.vals); return; }
  render();
}
function stDelete(kind, i) {
  const st = stGet(true), r = st && st.cur[kind][i]; if (!r) return;
  const base = st.base[kind].some(b => b._id === r._id);
  if (kind === 'dx') { const lk = HAKStage.linkedPc(st, r.bienSo); if (lk.length) { alert('Không xóa được xe ' + r.bienSo + ': còn ' + lk.length + ' phiếu cân liên kết.\n\n' + lk.slice(0, 15).map(p => '• ' + p.soPhieu + ' (' + p.ngay + ')').join('\n') + (lk.length > 15 ? '\n• … và ' + (lk.length - 15) + ' phiếu khác' : '') + '\n\nXử lý (sửa sang xe khác hoặc xóa) các phiếu này ở mục Phiếu cân trước.'); return; } }
  if (kind === 'nc' && base) {   // 3.0: xóa người có ngày chấm công — nêu các ngày liên quan trước khi xóa (chấm công nối theo ID dòng thành viên)
    const f = curForest(), cc = (f && f.cc) || {}, k = HAKChamCong.personKey(r), ngay = [];
    Object.keys(cc).sort().forEach(m => Object.keys((cc[m] || {})[k] || {}).sort((x, y) => x - y).forEach(d => ngay.push(d.padStart(2, '0') + '/' + m.slice(5) + '/' + m.slice(0, 4))));
    if (ngay.length && !confirm((r.ten || 'Người này') + ' có ' + ngay.length + ' ngày đã chấm công:\n' + ngay.slice(0, 20).join(', ') + (ngay.length > 20 ? ', …' : '') + '\n\nXóa người này thì các ngày công trên không còn được tính. Tiếp tục?')) return;
  }
  if (base && !confirm('Xóa bản ghi đã lưu' + (r.ten ? ' “' + r.ten + '”' : r.bienSo ? ' “' + r.bienSo + '”' : r.soPhieu ? ' “' + r.soPhieu + '”' : '') + ' khỏi lô?\nBản ghi chỉ thật sự bị xóa khi bấm “Lưu dữ liệu vào lô”; có thể “Hoàn tác” trước đó.')) return;
  HAKStage.removeRow(st, kind, r._id); stErrList = null; render();
}
/* ----- lưu bản nháp vào lô: kiểm tra lại rồi ghi trong MỘT lần lưu SQLite; lỗi thì giữ nguyên cả dữ liệu đã lưu lẫn bản nháp ----- */
/* lỗi do CẤU HÌNH chứ không phải do dòng dữ liệu (chưa khai đơn giá của chức danh): không chặn lưu, vẫn chặn xuất hồ sơ cho đến khi khai đủ */
const CONFIG_ERR = /chưa có đơn giá/;
let stSaving = false;
async function stSave(opt) {
  { const f0 = curForest(); if (f0 && loKhoa(f0)) return loKhoaNote(f0); }
  const k = stKey(), st = stages[k]; if (!st || !HAKStage.dirty(st)) { if (loDirty.has(curF)) return luuLoTT(opt); if (!(opt && opt.tuKhung)) note('Không có thay đổi nào cần lưu.', 'warn'); return {ok: true, none: true}; }
  if (stSaving) return {ok: false, error: 'đang lưu'};
  const o = db.rs[cur], f = o && o.forests && o.forests[curF]; if (!f) { note('Không lưu được: lô đích không còn tồn tại.', 'err'); return {ok: false, error: 'lô đích'}; }
  const pend = HAKStage.pendingOf(st);   // cùng quy tắc với bước xem trước: dòng cần đối chiếu chưa xử lý thì chưa lưu
  if (pend.length) { const msg = 'Chưa lưu: còn ' + pend.length + ' dòng CẦN ĐỐI CHIẾU (cùng số phiếu nhưng khác ngày, biển số, nơi cân hoặc khối lượng): ' + pend.slice(0, 10).map(q => q.key).join(', ') + (pend.length > 10 ? '…' : '') + '. Chọn giữ bản hiện có, cập nhật cùng chuyến, chuyến khác hoặc bỏ dòng nguồn. Dữ liệu đã lưu và bản nháp giữ nguyên.'; pushNote(msg, 'err'); ftab = 'dx'; render(); return {ok: false, error: 'cần đối chiếu', pend}; }
  const idc = HAKStage.idConflicts(st);   // _id nội bộ phải duy nhất trước khi ghi SQLite; xung đột thì chặn, giữ dữ liệu đã lưu và bản nháp
  if (idc.length) { const msg = 'Chưa lưu: mã nội bộ của dòng bị trùng hoặc thiếu — ' + idc.map(c => c.group + ': ' + c.rows.join(', ')).join('; ') + '. Dữ liệu đã lưu và bản nháp được giữ nguyên.'; pushNote(msg, 'err'); render(); return {ok: false, error: 'trùng _id', idc}; }
  const rec0 = jobView(o, f), g0 = ganDoi(rec0.doi, st.cur.nc), v0 = ganVC(rec0.hdvc, st.cur.dx), p0 = ganPC(g0.doi, st.cur.pc), rec = Object.assign(rec0, {nc: g0.nc, doi: g0.doi, dx: v0.dx, hdvc: v0.hdvc, pc: p0, info: Object.assign({}, rec0.info, {_klPC: klPhieu(p0)})}), errs = [];
  let errTab = null, cfgWarn = 0;
  const dkv = HAKStage.dirtyKinds(st);   // chỉ kiểm phần có thay đổi; phiếu cân luôn kiểm cùng xe (quan hệ biển số)
  [['Nhân công', checkNC, 'nc', ['nc']], ['Vận chuyển (xe)', checkDX, 'dx', ['dx']], ['Phiếu cân', checkPC, 'dx', ['pc', 'dx']]].filter(x => x[3].some(k => dkv.includes(k))).forEach(([n, fn, tb]) => { const c = fn(rec); if (c.errs.length && !errTab) errTab = tb; c.errs.filter(e => !CONFIG_ERR.test(e)).forEach(e => errs.push(n + ' — ' + e)); if (c.errs.some(e => CONFIG_ERR.test(e))) cfgWarn++; });
  if (errs.length) { stErrList = errs; pushNote('Chưa lưu: còn ' + errs.length + ' lỗi trong bản nháp. Sửa hoặc bỏ các dòng lỗi rồi lưu lại.', 'err'); ftab = errTab || ftab; render(); return {ok: false, error: 'lỗi dữ liệu', errs}; }
  // phiếu có cùng số ở lô khác: chưa đủ căn cứ xác định cùng chuyến → phải đối chiếu, không tự gộp
  const mine = new Set(st.cur.pc.map(p => String(p.soPhieu).toUpperCase())), dups = [];
  Object.values(db.rs).forEach(ow => forestList(ow).forEach(ff => { if (ow.id === cur && ff.id === curF) return; (ff.pc || []).forEach(p => { if (mine.has(String(p.soPhieu).toUpperCase())) dups.push(p.soPhieu + ' (lô ' + (ff.info.maRung || '?') + ', ' + (ow.info.ten || '') + ')'); }); }));
  if (dups.length && !opt?.confirmedDup && !confirm('Có ' + dups.length + ' số phiếu cũng đang có ở lô khác:\n' + dups.slice(0, 10).map(x => '• ' + x).join('\n') + (dups.length > 10 ? '\n• …' : '') + '\n\nHai nơi cân hoặc hai lô có thể dùng trùng số phiếu. Đối chiếu kỹ (ngày, biển số, khối lượng) rồi bấm OK để vẫn lưu vào lô này, hoặc Hủy để quay lại.')) return {ok: false, error: 'chờ đối chiếu'};
  stSaving = true; const snap = {doi: f.doi, hdvc: f.hdvc, nc: f.nc, dx: f.dx, pc: f.pc, bienLog: f.bienLog, ncFile: f.ncFile, ncAt: f.ncAt, dxFile: f.dxFile, dxAt: f.dxAt, pcFile: f.pcFile, pcAt: f.pcAt};
  try {
    const cm = HAKStage.commit(st, r => HAKPhieuCan.chuanHoaNgay2(r, null)), at = stamp(), dk = HAKStage.dirtyKinds(st);   // mọi phiếu có cột ngày cân 2 khi lưu vào hồ sơ rừng (nhập thật thì giữ, trống thì suy ra)
    f.nc = cm.lists.nc; f.dx = cm.lists.dx; f.pc = cm.lists.pc;
    if (dk.includes('nc')) { const g = ganDoi(f.doi, f.nc); if (g.doi) { f.doi = g.doi; f.nc = g.nc; } }
    if (dk.includes('dx')) { const v = ganVC(f.hdvc || null, f.dx); if (v.hdvc) { f.hdvc = v.hdvc; f.dx = v.dx; } }
    if (dk.includes('pc')) f.pc = ganPC(f.doi, f.pc);   // người mới: cùng quy tắc gán đội với bước kiểm tra (ganDoi)
    if (cm.bienLog.length) f.bienLog = (f.bienLog || []).concat(cm.bienLog);
    if (dk.includes('nc')) { f.ncAt = at; if (st.src.nc && /^Excel: /.test(st.src.nc)) f.ncFile = st.src.nc.slice(7); }
    if (dk.includes('dx')) { f.dxAt = at; if (st.src.dx && /^Excel: /.test(st.src.dx)) f.dxFile = st.src.dx.slice(7); }
    if (dk.includes('pc')) { f.pcAt = at; if (st.src.pc && /^Excel: /.test(st.src.pc)) f.pcFile = st.src.pc.slice(7); else if (st.src.pc && /Google/.test(st.src.pc) && !f.pcFile) f.pcFile = 'Tra cứu Google Sheets'; }
    f.nhatKyNap = (f.nhatKyNap || []).concat((st.nhatKy || []).map(x => ({at: x.at, kind: x.kind, nguon: x.nguon, them: x.them, capNhat: x.capNhat, giu: x.giu, loi: x.loi}))).slice(-50);   // ghi vào lô cùng lần lưu (không kèm ảnh chụp hoàn tác)
    var hadLo = loDirty.delete(f.id);   // lưu cả lô: thông tin lô cùng các bảng nháp
    const r = await persistNow(); if (!r || !r.ok) throw new Error((r && r.error) || 'không rõ');
    const nDm = dmGhiTuLo(st); delete stages[k]; nhapTamGhi(); stErrList = null; if (nDm) pushNote('Đã thêm ' + nDm + ' người / xe mới vào Danh mục.', 'ok'); pushNote('Đã lưu dữ liệu vào lô ' + (f.info.maRung || '') + ' (' + dk.map(x => ST_LABEL[x]).join(', ') + '). Có thể tạo, xuất, in hồ sơ.', 'ok'); render(); return {ok: true};
  } catch (e) {
    if (typeof hadLo !== 'undefined' && hadLo) loDirty.add(f.id);
    Object.assign(f, snap); if (!snap.bienLog) delete f.bienLog;   // giữ nguyên dữ liệu đã lưu; bản nháp còn nguyên để sửa hoặc thử lại
    pushNote('Không lưu được, dữ liệu đã lưu giữ nguyên và bản nháp vẫn còn để thử lại: ' + e.message, 'err'); render(); return {ok: false, error: e.message};
  } finally { stSaving = false; }
}
let stErrList = null;
function stDiscard(silent) { const k = stKey(); if (!stages[k] && !loDirty.has(curF)) return; if (!silent && !confirm('Bỏ toàn bộ thay đổi chưa lưu của lô này? Dữ liệu đã lưu không bị ảnh hưởng.')) return; delete stages[k]; loHoan(curF); nhapTamGhi(); stErrList = null; if (!silent) pushNote('Đã bỏ thay đổi chưa lưu.', 'warn'); render(); }
/* hỏi khi rời lô còn thay đổi chưa lưu: Lưu và tiếp tục / Bỏ thay đổi / Quay lại chỉnh sửa */
let stBypass = false;
function stGuard(proceed) {
  $('#stBody').innerHTML = '<div class="gh"><h2>Còn thay đổi chưa lưu</h2></div><p>' + esc(stBlockText().replace(/ Bấm .*$/, '')) + ' Chọn cách xử lý trước khi chuyển đi:</p><div class="row" style="gap:8px;flex-wrap:wrap"><button class="btn" id="stGSave">Lưu và tiếp tục</button><button class="btn ghost" id="stGDrop">Bỏ thay đổi</button><button class="btn ghost" id="stGBack">Quay lại chỉnh sửa</button></div>';
  $('#stBox').classList.add('on');
  $('#stGBack').onclick = () => $('#stBox').classList.remove('on');
  $('#stGDrop').onclick = () => { $('#stBox').classList.remove('on'); stDiscard(true); proceed(); };
  $('#stGSave').onclick = async () => { const r = await stSave(); $('#stBox').classList.remove('on'); if (r && r.ok) proceed(); };
}
window.__stDirty = () => stDirtyList();
window.__stSaveCurrent = () => stSave();
window.__checkDX = () => { const rec = curRec(); return rec ? checkDX(rec) : null; };
window.__rpXe = () => rpData().map(x => ({maRung: x.maRung, xe: x.dxList.map(d => ({bienSo: d.bienSo, ky: d.ky}))}));
window.__doiKT = () => { const rec = curRec(); if (!rec) return null; const B = doiOf(rec); return {loi: checkNC(rec).errs, doi: B.doi.map(d => [d.ten, d.n, d.dienTich, d.khoiLuong]), hdld: hdldList(rec).map(r => r.ten), uq: ucList(rec).map(r => r.ten), g: gate(rec)}; };   // kiểm thử đầu-cuối đọc cấu trúc đội của lô đang mở
/* Chặn rời lô khi còn bản nháp: bắt sự kiện bấm ở pha bắt (trước mọi xử lý khác) với các nút đổi lô, đổi chủ rừng, sang màn hình khác */
document.addEventListener('click', e => {
  if (stBypass || !stDirtyCur()) return; const t = e.target; if (!t.closest || t.closest('#stBox')) return;
  const nav = t.closest('[data-open],[data-sforest],[data-forest],[data-dash],[data-muc-lo],[data-act=hdQuayLai],[data-act=chonDoi],[data-act=chonHd],#navHome,[data-act=openNorm],[data-act=openSettings],[data-act=openSetBk],[data-act=newRs]'); if (!nav) return;
  if (nav.matches('[data-muc-lo][aria-current]')) return;
  if ((nav.dataset.sforest && nav.dataset.sforest === curF) || (nav.dataset.forest && nav.dataset.forest === curF)) return;   // bấm lại đúng lô đang mở
  e.preventDefault(); e.stopPropagation();
  stGuard(() => { const el = timLai(nav); stBypass = true; try { el.click(); } finally { stBypass = false; } });
}, true);

/* So sánh số người thực tế (bản đang xem, kể cả bản nháp) với định mức nhân công; liệt kê nhiệm vụ từng vị trí */
function dinhBienPanel(rec) {
  const g = {rows: viTriRowsTai((rec.info || {}).tuNgay)}, bd = doiOf(rec);
  if (g.rows.ngayLoi) return '<div class="msg err" id="dbNgayLoi"><b>Định mức nhân công:</b> ' + esc(g.rows.ngayLoi) + '.</div>';
  // lô nhiều đội: bảng vị trí so với ĐỘI ĐANG CHỌN (không phải đội đầu); cảnh báo lệch hiện cho từng đội ở dưới
  const tc = bd.multi ? (curTeam() || {}) : null, dc = bd.multi ? (bd.doi.find(d => d.id === tc.id) || bd.doi[0]) : null;
  const sc = HAKDinhBien.soSanh(g.rows, dc ? [dc.tt, ...dc.members] : rec.nc || []), lt = HAKDinhBien.lechText(sc);
  const stDoi = bd.multi ? bd.doi.map(d => { const x = HAKDinhBien.soSanh(g.rows, [d.tt, ...d.members]), t = HAKDinhBien.lechText(x); return t ? '<div class="msg warn dbLechDoi"><b>Đội “' + esc(d.ten) + '” — lệch định mức nhân công (1 đội ' + x.can + ' người, hiện có ' + x.co + '):</b> ' + esc(t) + '. Chỉ cảnh báo, không chặn.</div>' : '<div class="msg ok dbLechDoi">Đội “' + esc(d.ten) + '” đúng định mức nhân công: ' + x.co + ' người.</div>'; }).join('') : '';
  const st = bd.multi ? stDoi : !(rec.nc || []).length ? '' : lt ? '<div class="msg warn" id="dbLech"><b>Lệch định mức nhân công (1 đội ' + sc.can + ' người, hiện có ' + sc.co + '):</b> ' + esc(lt) + '. Chỉ cảnh báo, không chặn.</div>' : '<div class="msg ok" id="dbLech">Đúng định mức nhân công: ' + sc.co + ' người.</div>';
  return '<details class="card" id="dbPanel"><summary><b>Định mức nhân công và nhiệm vụ từng vị trí</b> — 1 đội ' + sc.can + ' người' + (g.saved ? '' : ' (mặc định)') + (dc ? ' · bảng so với đội “' + esc(dc.ten) + '” (đội đang chọn)' : '') + '</summary><div class="wrap"><table class="normTbl" style="min-width:0;table-layout:auto"><thead><tr><th>Vị trí</th><th>Định mức</th><th>Hiện có' + (dc ? ' (' + esc(dc.ten) + ')' : '') + '</th><th>Nhiệm vụ</th></tr></thead><tbody>' +
    sc.vt.map((v, i) => '<tr><td><b>' + esc(v.chucDanh) + '</b>' + (v.kiemNhiem ? '<br><small class="mut">kiêm ' + esc(v.kiemNhiem) + '</small>' : '') + '</td><td style="text-align:center">' + v.can + '</td><td style="text-align:center">' + (v.lech === 0 ? v.co : '<b style="color:var(--warn)">' + v.co + '</b>') + '</td><td>' + esc(g.rows[i].nhiemVu) + '</td></tr>').join('') + '</tbody></table></div></details>' + st;
}
/* Các đội của lô: mỗi Tổ trưởng một đội, mỗi đội một hợp đồng giao khoán, sản lượng chia theo số người */
function doiPanel(rec) {
  const b = doiOf(rec), tt = (rec.nc || []).filter(isTT).length;
  if (!b.multi) return tt <= 1 && (rec.nc || []).length ? '<div class="mut" id="doiInfo" style="margin:6px 0">Mỗi hợp đồng nhân công quản lý một đội. Để thêm đội, quay lại danh sách hợp đồng nhân công.</div>' : '';
  const bq = basisOf(rec.info).qty, bs = bq === 'ha' ? 'ha' : 'tan', unit = bq === 'ha' ? 'ha' : 'tấn', fmtV = v => v == null ? '—' : formatNumber(v, 3);
  return '<details class="card" id="doiPanel" open><summary><b>Nhiều đội: ' + b.doi.length + ' đội, ' + b.doi.length + ' hợp đồng giao khoán</b></summary><div class="wrap"><table class="normTbl" style="min-width:0;table-layout:auto"><thead><tr><th>Đội</th><th>Tổ trưởng</th><th>Số người</th><th>Phần sản lượng (' + unit + ')</th><th>Số hợp đồng giao khoán</th></tr></thead><tbody>' +
    b.doi.map((d, di) => '<tr><td><b>' + esc(d.ten) + '</b></td><td>' + esc(d.tt.ten) + '</td><td style="text-align:center">' + d.n + '</td><td style="text-align:right">' + fmtV(bs === 'ha' ? d.dienTich : d.khoiLuong) + '</td><td>' + esc(soDoiSo(HAKHopDong.numbers(exOf(rec, 'day')).kt, di + 1).so) + '</td></tr>').join('') +
    '</tbody></table></div><p class="mut" style="margin:8px 0 0">Sản lượng của lô chia cho các đội theo số người. Mỗi đội có <b>số hợp đồng riêng</b> (số bạn nhập thêm .1, .2… theo thứ tự đội), hợp đồng giao khoán (BM-01), giấy ủy quyền (BM-20), bảng chấm công, danh sách đội, bảng thanh toán tiền công và biên bản nghiệm thu riêng, xuất vào thư mục con theo tên đội.</p></details>';
}
/* Bảng con “Nhân công khai thác” của lô: danh sách ĐỘI KHAI THÁC (thêm đội = thêm bảng con). Mỗi đội có hình thức, cách tính, đơn giá, diện tích,
 * số văn bản và danh sách nhân công riêng; chọn một đội để sửa phần của đội đó (src/model.js). */
const hinhThucNgan = i => (isDirect(i) ? 'Trực tiếp' : 'Giao khoán') + ' · ' + basisOf(i).short;
function panelDoiVB(rec) {   // số và ngày văn bản của đội đang chọn: nằm cuối màn Nhân công (thông tin – bảng con – số văn bản)
  const f = curForest(); if (!f || !rec.doi) return '';
  const t = curTeam(f), multi = rec.doi.length > 1;
  return '<div class="card" id="doiKTVb">' +
    '<h4 style="margin:12px 0 4px">Số và ngày văn bản của ' + (multi ? 'đội “' + esc(t.ten || '') + '”' : 'đội') + ' <span class="mut" style="font-weight:400">· để trống thì in dòng chấm để điền tay</span></h4>' +
    expInputs([['soKT', 'Số HĐ giao khoán (phần số VD 015, hoặc số đầy đủ 015/2026-KT)', 'năm lấy từ ngày ký các hợp đồng của lô'],
      ['uqSo', 'Giấy ủy quyền: số', 'năm lấy từ ngày ký'], ['uqNgay', 'Giấy ủy quyền: ngày lập', 'trống = ngày ký hợp đồng'],
      ['ntSo', 'Nghiệm thu, thanh lý: số biên bản', 'năm lấy từ ngày lập biên bản'], ['ntNgay', 'Nghiệm thu, thanh lý: ngày lập', 'dd/mm/yyyy'], ['ntDaTT', 'Nghiệm thu: số tiền đã thanh toán trước (đ)', 'VD: 50000000'],
      ['tuNgayTT', 'Bảng thanh toán tiền công: từ ngày', 'trống = từ ngày khai thác'], ['denNgayTT', 'Bảng thanh toán tiền công: đến ngày', 'trống = đến ngày khai thác'],
      ['hdPhuCap', 'HĐLĐ: phụ cấp, khoản bổ sung', 'mặc định: Không'], ['hdNangLuong', 'HĐLĐ: nâng bậc, nâng lương', 'mặc định: Không áp dụng']], expLo(recDoiChon(rec))) +
'</div>';
}
function doiFormHtml(t, multi, rec) {
  const gk = rec && hdMo('nc') && !isDirect(infoTeam(rec, t));   // 3.0: hợp đồng giao khoán — bên nhận khoán từ Danh mục đối tượng
  return '<form id="doiForm" class="grid" style="margin-top:8px"><label><span>Tên đội' + (multi ? '' : ' (tùy chọn khi lô một đội)') + '</span><input name="ten" value="' + esc(t.ten || '') + '"></label>' +
    (gk ? benNhanKhoanHtml(t) + benNhanKhoanCanhBao(rec, t) : '') +
    '<label><span>Diện tích của đội (ha)</span><input name="dienTich" inputmode="decimal" value="' + esc(typeof t.dienTich === 'number' ? String(t.dienTich).replace('.', ',') : '') + '" placeholder="' + (multi ? 'trống: chia theo số người' : 'trống: cả lô') + '"></label>' +
    '<div class="row" style="grid-column:1/-1"><button class="btn sro" type="submit" tabindex="-1" aria-hidden="true">Lưu</button>' + (multi ? '<button class="btn danger sm" type="button" data-act="xoaDoi">Xóa đội này</button>' : '') + '</div></form>';
}
function panelDoiKT(rec, phan) {   // phan: 'tt' = chọn đội và thông tin đội (đầu màn); 'vb' = số và ngày văn bản của đội (cuối màn, sau bảng nhân công)
  const f = curForest(); if (!f || !rec.doi) return '';
  const t = curTeam(f), n = d => (rec.nc || []).filter(r => r.doiId === d.id).length, multi = rec.doi.length > 1, chua = (rec.nc || []).filter(r => !rec.doi.some(d => d.id === r.doiId)).length;
  const tt = d => { const x = (rec.nc || []).find(r => r.doiId === d.id && isTT(r)); return x ? x.ten : '—'; };
  const row = (d, k) => '<tr class="' + (d.id === t.id ? 'sel' : '') + '" data-act="chonDoi" data-doi="' + esc(d.id) + '" style="cursor:pointer' + (d.id === t.id ? ';background:var(--sel,#eef5ee)' : '') + '"><td><b>' + esc(d.ten || ('Đội ' + (k + 1))) + '</b>' + (d.id === t.id ? ' <span class="pill">đang chọn</span>' : '') + '</td><td>' + esc(tt(d)) + '</td><td style="text-align:center">' + n(d) + '</td><td>' + esc(hinhThucNgan(infoTeam(rec, d))) + '</td><td style="text-align:right">' + (typeof d.dienTich === 'number' ? formatNumber(d.dienTich, 3) : multi ? '<span class="mut">theo số người</span>' : '<span class="mut">cả lô</span>') + '</td></tr>';
  if (hdMo('nc')) return '<div class="card" id="doiKT"><h3 style="margin:0 0 6px">Thông tin hợp đồng</h3>' + (chua ? '<div class="msg warn" style="margin-top:6px">' + chua + ' người chưa thuộc đội nào: chọn đội ở cột Đội của bảng nhân công.</div>' : '') +   // 3.0 trang chi tiết: danh sách đội ở trang danh sách
    doiFormHtml(t, multi, rec) + '</div>';
  return '<div class="card" id="doiKT"><div class="row" style="justify-content:space-between"><h3 style="margin:0">Nhân công khai thác: ' + rec.doi.length + ' đội</h3><span class="row"><input id="doiMoiTen" placeholder="Tên đội mới, ví dụ Đội ' + (rec.doi.length + 1) + '" style="width:200px"><button class="btn ghost sm" data-act="themDoi">+ Thêm đội khai thác</button></span></div>' +
    '<div class="wrap"><table class="normTbl" style="min-width:0;table-layout:auto"><thead><tr><th>Đội</th><th>Tổ trưởng</th><th>Số người</th><th>Hình thức · cách tính</th><th>Diện tích (ha)</th></tr></thead><tbody>' + rec.doi.map(row).join('') + '</tbody></table></div>' +
    (chua ? '<div class="msg warn" style="margin-top:6px">' + chua + ' người chưa thuộc đội nào: chọn đội ở cột Đội của bảng nhân công.</div>' : '') +
    doiFormHtml(t, multi) +
    '<small class="mut">Mọi thông số của đội (hình thức, đơn giá bên dưới, diện tích, số văn bản, nhân công, chấm công) là của <b>đội đang chọn</b>. Người nhập thêm (tay hoặc Excel) không ghi cột Đội sẽ vào đội đang chọn.</small></div>';
}
/* cột Đội: lô nhiều đội (không trong bản nháp) chọn đội ngay tại dòng; còn lại hiện tên đội */
function doiCell(rec, r) {
  if (!rec.doi) return esc(r.doi || '');
  const d = rec.doi.find(x => x.id === r.doiId);
  const ix = (rec.nc || []).indexOf(r);
  if (rec.doi.length < 2 || stCur() || ix < 0) return d ? esc(d.ten || r.doi || '') : '<span class="pill err">chưa thuộc đội</span>';
  return '<select data-ncdoi="' + ix + '">' + (d ? '' : '<option value="" selected>(chưa thuộc đội)</option>') + rec.doi.map((x, k) => '<option value="' + esc(x.id) + '"' + (x.id === r.doiId ? ' selected' : '') + '>' + esc(x.ten || ('Đội ' + (k + 1))) + '</option>').join('') + '</select>';
}
function panelNC(rec) {
  if (rec.doi && !hdMoHopLe('nc', rec)) return panelDsNC(rec);   // 3.0: tab mở danh sách hợp đồng; chọn một hợp đồng mới vào trang chi tiết
  const d = rec.doi?.find(x => x.id === hdMo('nc'));
  const count = rec.nc.filter(r => !d || r.doiId === d.id).length;
  return (d ? hdDau('nc', rec, tenDoiNc(rec, d), soHdNc(rec, d)) : '') + khungMucLo('nc', [
    ['chung', 'Thông tin hợp đồng, bên nhận khoán', () => panelDoiKT(rec)],
    ['dongia', 'Hình thức và đơn giá', () => panelLuong(rec) + doiPanel(rec) + dinhBienPanel(rec)],
    ['thanhvien', 'Thành viên', () => panelThanhVien(rec), count],
    ['chamcong', 'Chấm công', () => panelChamCong(recDoiChon(rec))],
    ['vanban', 'Số và ngày văn bản', () => panelDoiVB(rec)]
  ]);
}
function panelThanhVien(rec) {
  const c = checkNC(rec), head = panelImport('nc', rec) + stBar('nc', rec) + stErrBox();
  if (!rec.nc.length && !stCur()) return head + '<div class="empty">Chưa có nhân công. Bấm “+ Thêm nhân công” để chọn từ Danh mục đối tượng.</div>';
  const t = rec.doi && rec.doi.length > 1 && !ncTatCa ? curTeam() : null, only = t ? r => r.doiId === t.id || !rec.doi.some(d => d.id === r.doiId) : null;   // lô nhiều đội: chỉ người của đội đang chọn (và người chưa thuộc đội)
  const loc = rec.doi && rec.doi.length > 1 ? '<div class="row" style="margin:6px 0">' + (t ? '<span class="mut">Đang xem nhân công của đội “' + esc(t.ten || '') + '”.</span> <button class="btn ghost sm" data-act="ncTatCa">Xem tất cả nhân công của lô</button>' : '<span class="mut">Đang xem tất cả nhân công của lô.</span> <button class="btn ghost sm" data-act="ncTheoDoi">Chỉ xem đội đang chọn</button>') + '</div>' : '';
  const hienDoi = rec.doi?.length > 1;
  return head + issuesBox(c.errs, c.warns) + loc + stTable('nc', rec, ['Vai trò', 'Danh xưng', 'Họ và tên', 'Ngày sinh', 'CCCD', 'Chức danh', ...(hienDoi ? ['Đội'] : []), 'Đơn giá'],
    r => '<td>' + esc(r.vaiTro) + '</td><td>' + esc(r.danhXung) + '</td><td>' + esc(r.ten) + '</td><td>' + esc(r.ngaySinh) + '</td><td>' + esc(r.cccd) + '</td><td>' + esc(r.chucDanh) + '</td>' + (hienDoi ? '<td>' + doiCell(rec, r) + '</td>' : '') + '<td>' + fmt(rateOf(infoRow(rec, r), r)) + '</td>', c, null, only);
}

