/* ----- lưu bản nháp vào lô: kiểm tra lại rồi ghi trong MỘT lần lưu SQLite; lỗi thì giữ nguyên cả dữ liệu đã lưu lẫn bản nháp ----- */
/* lỗi do CẤU HÌNH chứ không phải do dòng dữ liệu (chưa khai đơn giá của vị trí): không chặn lưu, vẫn chặn xuất hồ sơ cho đến khi khai đủ */
const CONFIG_ERR = /chưa có đơn giá/;
let stSaving = false;
async function stSave(opt) {
  const key = stKey(), epoch = dbEpoch;
  if (stSaving) return {ok: false, error: 'đang lưu'};
  const result = await stSaveDraft(opt);
  if (epoch !== dbEpoch) return result;
  const details = result?.errs?.length ? result.errs.slice(0, 3).join(' • ') : result?.error;
  const text = result?.ok ? '' : 'Chưa lưu được. ' + (result?.code === 'BULK_DELETE'
    ? 'Lần ghi bị chặn để bảo vệ hồ sơ chủ rừng. Bản nháp vẫn còn.'
    : (details || 'Ứng dụng chưa trả về lý do.') + (result?.errs?.length ? ' Sửa các dòng được báo rồi bấm Lưu lại.' : ''));
  loSaveIssue = text ? {key, epoch, text, field: result?.field, bulk: result?.code === 'BULK_DELETE'} : null;
  if (key === stKey()) {
    const el = document.getElementById('loSaveIssue');
    if (el) {
      el.innerHTML = loSaveHelpHtml();
      el.hidden = !text;
      if (text && !opt?.tuKhung) el.focus();
    }
  }
  return result;
}
async function stSaveDraft(opt) {
  { const f0 = curForest(); if (f0 && loKhoa(f0)) return loKhoaNote(f0); }
  const k = stKey(), st = stages[k]; if (!st || !HAKStage.dirty(st)) { if (loDirty.has(NAV.curF)) return luuLoTT(opt); if (!(opt && opt.tuKhung)) note('Không có thay đổi nào cần lưu.', 'warn'); return {ok: true, none: true}; }
  if (stSaving) return {ok: false, error: 'đang lưu'};
  const o = db.rs[NAV.cur], f = o && o.forests && o.forests[NAV.curF]; if (!f) { note('Không lưu được: lô đích không còn tồn tại.', 'err'); return {ok: false, error: 'lô đích'}; }
  const pend = HAKStage.pendingOf(st);   // cùng quy tắc với bước xem trước: dòng cần đối chiếu chưa xử lý thì chưa lưu
  if (pend.length) return {
    ok: false,
    error: 'Còn ' + pend.length + ' dòng phiếu cân cần đối chiếu. Giữ bản hiện có nếu phiếu đang lưu đúng, cập nhật nếu xác nhận cùng chuyến, chọn chuyến khác nếu là hai chuyến, hoặc bỏ qua dòng nguồn nếu nhập nhầm. Xử lý xong rồi lưu lại.',
    field: {tab: 'dx', muc: 'phieu', label: 'Vận chuyển → Phiếu cân', pending: true}
  };
  const idc = HAKStage.idConflicts(st);   // _id nội bộ phải duy nhất trước khi ghi SQLite; xung đột thì chặn, giữ dữ liệu đã lưu và bản nháp
  if (idc.length) { const msg = 'Chưa lưu: mã nội bộ của dòng bị trùng hoặc thiếu — ' + idc.map(c => c.group + ': ' + c.rows.join(', ')).join('; ') + '. Dữ liệu đã lưu và bản nháp được giữ nguyên.'; pushNote(msg, 'err'); render(); return {ok: false, error: msg, idc}; }
  const rec0 = jobView(o, f), g0 = ganDoi(rec0.doi, st.cur.nc), v0 = ganVC(rec0.hdvc, st.cur.dx), p0 = ganPC(g0.doi, st.cur.pc), rec = Object.assign(rec0, {nc: g0.nc, doi: g0.doi, dx: v0.dx, hdvc: v0.hdvc, pc: p0, info: Object.assign({}, rec0.info, {_klPC: klPhieu(p0)})}), errs = [];
  let field = null;
  const dkv = HAKStage.dirtyKinds(st);
  const checks = [
    ['nc', 'thanhvien', 'Nhân công → Thành viên', checkNC, ['nc']],
    ['dx', 'xe', 'Vận chuyển → Xe và tài xế', checkDX, ['dx']],
    ['dx', 'phieu', 'Vận chuyển → Phiếu cân', checkPC, ['pc', 'dx']]
  ];
  for (const [tab, muc, label, check, kinds] of checks) {
    if (!kinds.some(k => dkv.includes(k))) continue;
    const errors = check(rec).errs;
    const invalid = errors.filter(e => !CONFIG_ERR.test(e));
    if (invalid.length && !field) field = {tab, muc, label};
    invalid.forEach(e => errs.push(label + ' — ' + e));
  }
  if (errs.length) {
    stErrList = errs;
    return {ok: false, error: 'lỗi dữ liệu', errs, field};
  }
  // phiếu có cùng số ở lô khác: chưa đủ căn cứ xác định cùng chuyến → phải đối chiếu, không tự gộp
  /* chỉ hỏi cho phiếu MỚI hoặc vừa ĐỔI số phiếu / ngày cân trong lần lưu này (phiếu đã lưu từ trước thì đã đối chiếu rồi, không hỏi lại mỗi lần bấm Lưu);
   * so cùng khóa với trong lô: số phiếu + ngày cân (HAKBks.khoaPhieu). Cùng số mà khác ngày là hai chuyến khác nhau, không hỏi. Phiếu thiếu ngày thì so theo số phiếu. */
  const khoaSo = p => HAKBks.khoaPhieu(p) || HAKBks.soPhieu(p.soPhieu);
  const mine = new Set(HAKStage.diff(st, 'pc').filter(d => d.status === 'new' || (d.status === 'changed' && d.old && khoaSo(d.old) !== khoaSo(d.row))).map(d => khoaSo(d.row)).filter(Boolean)), dups = [];
  if (mine.size) Object.values(db.rs).forEach(ow => forestList(ow).forEach(ff => { if (ow.id === NAV.cur && ff.id === NAV.curF) return; (ff.pc || []).forEach(p => { const k = khoaSo(p); if (mine.has(k) || (!HAKBks.khoaPhieu(p) && [...mine].some(m => m.split('|')[0] === k))) dups.push(p.soPhieu + (p.ngay ? ' ngày ' + p.ngay : '') + ' (lô ' + (ff.info.maRung || '?') + ', ' + (ow.info.ten || '') + ')'); }); }));
  if (dups.length && !opt?.confirmedDup && !confirm('Có ' + dups.length + ' phiếu cân cùng số phiếu và ngày cân đang có ở lô khác:\n' + dups.slice(0,
  10).map(x => '• ' + x).join('\n') + (dups.length > 10 ? '\n• …' : '') + '\n\nHai nơi cân hoặc hai lô có thể dùng trùng số phiếu. Đối chiếu kỹ (ngày, biển số, khối lượng) rồi bấm OK để vẫn lưu vào lô này, hoặc Hủy để quay lại.')) return {ok: false, error: 'chờ đối chiếu'};
  stSaving = true; const sNhap = nhapChup(), chuU = chuChot(o.id); const snap = {doi: f.doi, hdvc: f.hdvc, nc: f.nc, dx: f.dx, pc: f.pc, bienLog: f.bienLog, soLog: f.soLog, ncFile: f.ncFile, ncAt: f.ncAt, dxFile: f.dxFile, dxAt: f.dxAt, pcFile: f.pcFile, pcAt: f.pcAt, nhatKyNap: f.nhatKyNap};
  try {
    const cm = HAKStage.commit(st, r => HAKPhieuCan.chuanHoaNgay2(r, null)), at = stamp(), dk = HAKStage.dirtyKinds(st);   // mọi phiếu có cột ngày cân 2 khi lưu vào hồ sơ rừng (nhập thật thì giữ, trống thì suy ra)
    const oldNcIds = (f.nc || []).map(r => r && r.id).filter(Boolean), oldDxIds = (f.dx || []).map(r => r && r.id).filter(Boolean);
    f.nc = cm.lists.nc; f.dx = cm.lists.dx; f.pc = cm.lists.pc;
    HAKLienKet.chuanLo(f, {daXoaNc: oldNcIds, daXoaDx: oldDxIds});   // lô 4 (T-12): gán ID dòng mới không trùng dòng vừa xóa và dọn khóa cc / xeRowId mồ côi
    if (dk.includes('nc')) { const g = ganDoi(f.doi, f.nc); if (g.doi) { f.doi = g.doi; f.nc = g.nc; } }
    if (dk.includes('dx')) { const v = ganVC(f.hdvc || null, f.dx); if (v.hdvc) { f.hdvc = v.hdvc; f.dx = v.dx; } }
    if (dk.includes('pc')) f.pc = ganPC(f.doi, f.pc);   // người mới: cùng quy tắc gán đội với bước kiểm tra (ganDoi)
    if (cm.bienLog.length) f.bienLog = (f.bienLog || []).concat(cm.bienLog);
    /* nhật ký đổi số phiếu: nằm NGOÀI nhatKy (nằm trong dấu vân tay), chỉ tạo khi có bản ghi thật; loại trùng theo pid + soCu + at */
    if ((cm.soLog || []).length) { const kk = e => e.pid + '|' + e.soCu + '|' + e.at, daCo = new Set((f.soLog || []).map(kk)); f.soLog = (f.soLog || []).concat(cm.soLog.filter(e => !daCo.has(kk(e)))); }
    if (dk.includes('nc')) { f.ncAt = at; if (st.src.nc && /^Excel: /.test(st.src.nc)) f.ncFile = st.src.nc.slice(7); }
    if (dk.includes('dx')) { f.dxAt = at; if (st.src.dx && /^Excel: /.test(st.src.dx)) f.dxFile = st.src.dx.slice(7); }
    if (dk.includes('pc')) { f.pcAt = at; if (st.src.pc && /^Excel: /.test(st.src.pc)) f.pcFile = st.src.pc.slice(7); else if (st.src.pc && /Google/.test(st.src.pc) && !f.pcFile) f.pcFile = 'Tra cứu Google Sheets'; }
    f.nhatKyNap = (f.nhatKyNap || []).concat((st.nhatKy || []).map(x => ({at: x.at, kind: x.kind, nguon: x.nguon, them: x.them, capNhat: x.capNhat, giu: x.giu, loi: x.loi}))).concat((st.sk || []).map(x => ({at: new Date().toISOString(), kind: x.kind, nguon: x.nguon, them: x.them, capNhat: 0, giu: 0, loi: 0}))).slice(-200);
    var hadLo = loDirty.delete(f.id);   // lưu cả lô: thông tin lô cùng các bảng nháp
    const r = await persistNow(); if (!r || !r.ok) throw Object.assign(new Error(r?.error || 'không rõ'), {code: r?.code});
    const nDm = dmGhiTuLo(st); delete stages[k]; nhapTamGhi(); stErrList = null; if (nDm) pushNote(nDm[0], nDm[1]);
    if (typeof notifyWorkDone === 'function') notifyWorkDone((f.pc || []).length || 5);
    pushNote('Đã lưu dữ liệu vào lô ' + (f.info.maRung || '') + ' (' + dk.map(x => ST_LABEL[x]).join(', ') + ')' + (chuU.chot ? ', kèm thông tin chủ rừng đang ở bản nháp (kể cả phần đến từ lô khác của chủ rừng này)' : '') + '. Có thể tạo, xuất, in hồ sơ.', 'ok'); if (typeof dmHopCho !== 'undefined' && dmHopCho) dmHopCho.daLuu = notes[notes.length - 1].text; render(); return {ok: true};
  } catch (e) {
    if (typeof hadLo !== 'undefined' && hadLo) loDirty.add(f.id);
    nhapKhoiPhuc(sNhap);
    Object.assign(f, snap); if (!snap.bienLog) delete f.bienLog; if (!snap.soLog) delete f.soLog; if (!snap.nhatKyNap) delete f.nhatKyNap;   // giữ nguyên dữ liệu đã lưu; bản nháp còn nguyên để sửa hoặc thử lại
    render(); return {ok: false, error: e.message, code: e.code};
  } finally { stSaving = false; }
}
let stErrList = null;
function stDiscard(silent) { const k = stKey(), cn0 = chuNhap.get(NAV.cur); if (!stages[k] && !loDirty.has(NAV.curF)) return; if (!silent && !confirm('Bỏ toàn bộ thay đổi chưa lưu của lô này? Dữ liệu đã lưu không bị ảnh hưởng.')) return; delete stages[k]; loHoan(NAV.curF); if (NAV.cur && !db.rs[NAV.cur]) { NAV.cur = null; NAV.curF = null; NAV.view = 'owner'; } else if (NAV.curF && !curForest()) NAV.curF = null;   // lô / chủ rừng tạo từ bản nháp (Google Sheets) bị bỏ hẳn: rời khỏi màn của chúng
nhapTamGhi(); stErrList = null; if (loSaveIssue?.key === k) loSaveIssue = null;
if (!silent) pushNote('Đã bỏ thay đổi chưa lưu.' + (cn0 && !chuNhap.has(NAV.cur || '') && !cn0.moi ? ' Lô nháp cuối của chủ rừng đã được bỏ nên thông tin chủ rừng đang nháp (từ Google Sheets) cũng được hoàn lại.' : ''), 'warn'); render(); }
/* hỏi khi rời lô còn thay đổi chưa lưu: Lưu và tiếp tục / Bỏ thay đổi / Quay lại chỉnh sửa */
let stBypass = false;
function stGuard(proceed) {
  $('#stBody').innerHTML = '<div class="gh"><h2>Còn thay đổi chưa lưu</h2></div><p>' + esc(stBlockText().replace(/ Bấm .*$/, '')) + ' Chọn cách xử lý trước khi chuyển đi:</p><div class="row" style="gap:8px;flex-wrap:wrap"><button class="btn" id="stGSave">Lưu và tiếp tục</button><button class="btn ghost" id="stGDrop">Bỏ thay đổi</button><button class="btn ghost" id="stGBack">Quay lại chỉnh sửa</button></div>';
  $('#stBox').classList.add('on'); $('#stGSave').focus();   // phiếu #10: tiêu điểm vào hộp; Esc = Quay lại chỉnh sửa (17-e)
  $('#stGBack').onclick = () => $('#stBox').classList.remove('on');
  $('#stGDrop').onclick = () => { $('#stBox').classList.remove('on'); stDiscard(true); proceed(); };
  $('#stGSave').onclick = async () => { const r = await stSave(); $('#stBox').classList.remove('on'); if (r && r.ok) proceed(); };
}
window.__stDirty = () => stDirtyList();
window.__stSaveCurrent = () => stSave();
/* Lưu và đóng (main.js): lưu MỌI lô còn nháp (không chỉ lô đang mở); lô nào lưu không được thì dừng, trả ok:false để cửa sổ KHÔNG đóng và bản tạm không bị xóa */
async function stSaveAll() {
  const keys = stDirtyList(), truoc = {cur: NAV.cur, curF: NAV.curF}; let dat = null, loi = false;
  try {
    for (const k of keys) {
      const [oid, fid] = k.split('|'); if (!db.rs[oid] || !db.rs[oid].forests[fid]) continue;
      NAV.cur = oid; NAV.curF = fid; dat = {cur: oid, curF: fid};
      const r = await stSave({tuKhung: true});
      if (!r || r.ok === false) { loi = true; NAV.tab = 'rung'; NAV.view = 'owner'; render(); return {ok: false, error: (r && r.error) || 'lô ' + ((db.rs[oid].forests[fid].info || {}).maRung || fid) + ' chưa lưu được'}; }
    }
    return {ok: true, none: !keys.length};
  } finally {
    // lỗi: ở lại lô lỗi để người dùng thấy; thành công: về chỗ cũ, trừ khi người dùng đã tự chuyển trang trong lúc lưu
    if (!loi && (!dat || (NAV.cur === dat.cur && NAV.curF === dat.curF))) { if (db.rs[truoc.cur]) { NAV.cur = truoc.cur; NAV.curF = truoc.curF; } else { NAV.cur = null; NAV.curF = null; } }
    render();
  }
}
window.__stSaveAll = stSaveAll;
CONG_KT.checkDX = () => { const rec = curRec(); return rec ? checkDX(rec) : null; };
CONG_KT.rpXe = () => rpData().map(x => ({maRung: x.maRung, xe: x.dxList.map(d => ({bienSo: d.bienSo, ky: d.ky}))}));
CONG_KT.doiKT = () => { const rec = curRec(); if (!rec) return null; const B = doiOf(rec); return {loi: checkNC(rec).errs, doi: B.doi.map(d => [d.ten, d.n, d.dienTich, d.khoiLuong]), hdld: hdldList(rec).map(r => r.ten), uq: ucList(rec).map(r => r.ten), g: gate(rec)}; };   // kiểm thử đầu-cuối đọc cấu trúc đội của lô đang mở
/* Chặn rời lô khi còn bản nháp: bắt sự kiện bấm ở pha bắt (trước mọi xử lý khác) với các nút đổi lô, đổi chủ rừng, sang màn hình khác */
document.addEventListener('click', e => {
  if (stBypass || !stDirtyCur()) return; const t = e.target; if (!t.closest || t.closest('#stBox')) return;
  const nav = t.closest('[data-open],[data-sforest],[data-forest],[data-dash],[data-muc-lo],[data-act=hdQuayLai],[data-act=chonDoi],[data-act=chonHd],#navHome,[data-act=openDm],[data-act=openNorm],[data-act=openBld],[data-act=openSettings],[data-act=openSetBk],[data-act=newRs]'); if (!nav) return;
  if (nav.matches('[data-muc-lo][aria-current]')) return;
  if ((nav.dataset.sforest && nav.dataset.sforest === NAV.curF) || (nav.dataset.forest && nav.dataset.forest === NAV.curF)) return;   // bấm lại đúng lô đang mở
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
  const stDoi = bd.multi ? bd.doi.map(d => { const x = HAKDinhBien.soSanh(g.rows, [d.tt, ...d.members]), t = HAKDinhBien.lechText(x);
  return t ? '<div class="msg warn dbLechDoi"><b>Đội “' + esc(d.ten) + '” — lệch định mức nhân công (1 đội ' + x.can + ' người, hiện có ' + x.co + '):</b> ' + esc(t) + '. Chỉ cảnh báo, không chặn.</div>' : '<div class="msg ok dbLechDoi">Đội “' + esc(d.ten) + '” đúng định mức nhân công: ' + x.co + ' người.</div>';
  }).join('') : '';
  const st = bd.multi ? stDoi : !(rec.nc || []).length ? '' : lt ? '<div class="msg warn" id="dbLech"><b>Lệch định mức nhân công (1 đội ' + sc.can + ' người, hiện có ' + sc.co + '):</b> ' + esc(lt) + '. Chỉ cảnh báo, không chặn.</div>' : '<div class="msg ok" id="dbLech">Đúng định mức nhân công: ' +
  sc.co + ' người.</div>';
  return '<details class="card" id="dbPanel"><summary><b>Định mức nhân công và nhiệm vụ từng vị trí</b> — 1 đội ' + sc.can + ' người' + (g.saved ? '' : ' (mặc định)') + (dc ? ' · bảng so với đội “' + esc(dc.ten) + '” (đội đang chọn)' : '') +
  '</summary><div class="wrap"><table class="normTbl" style="min-width:0;table-layout:auto"><thead><tr><th>Vị trí</th><th>Định mức</th><th>Hiện có' + (dc ? ' (' + esc(dc.ten) + ')' : '') + '</th><th>Nhiệm vụ</th></tr></thead><tbody>' +
    sc.vt.map((v, i) => '<tr><td><b>' + esc(v.chucDanh) + '</b>' + (v.kiemNhiem ? '<br><small class="mut">kiêm ' + esc(v.kiemNhiem) + '</small>' : '') + '</td><td style="text-align:center">' + v.can + '</td><td style="text-align:center">' + (v.lech === 0 ? v.co : '<b style="color:var(--warn)">' +
    v.co + '</b>') + '</td><td>' + esc(g.rows[i].nhiemVu) + '</td></tr>').join('') + '</tbody></table></div></details>' + st;
}
/* Các đội của lô: mỗi Tổ trưởng một đội, mỗi đội một hợp đồng giao khoán, sản lượng chia theo số người */
function doiPanel(rec) {
  const b = doiOf(rec), tt = (rec.nc || []).filter(isTT).length;
  if (!b.multi) return tt <= 1 && (rec.nc || []).length ? '<div class="mut" id="doiInfo" style="margin:6px 0">Mỗi hợp đồng nhân công quản lý một đội. Để thêm đội, quay lại danh sách hợp đồng nhân công.</div>' : '';
  const bq = basisOf(rec.info).qty, bs = bq === 'ha' ? 'ha' : 'tan', unit = bq === 'ha' ? 'ha' : 'tấn', fmtV = v => v == null ? '—' : formatNumber(v, 3);
  return '<details class="card" id="doiPanel" open><summary><b>Nhiều đội: ' + b.doi.length + ' đội, ' + b.doi.length +
  ' hợp đồng giao khoán</b></summary><div class="wrap"><table class="normTbl" style="min-width:0;table-layout:auto"><thead><tr><th>Đội</th><th>Tổ trưởng</th><th>Số người</th><th>Phần sản lượng (' + unit + ')</th><th>Số hợp đồng giao khoán</th></tr></thead><tbody>' +
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
  const row = (d,
  k) => '<tr class="' + (d.id === t.id ? 'sel' : '') + '" data-act="chonDoi" data-doi="' + esc(d.id) + '" style="cursor:pointer"><td><b>' + esc(d.ten || ('Đội ' + (k + 1))) + '</b>' + (d.id === t.id ?
  ' <span class="pill">đang chọn</span>' : '') + '</td><td>' + esc(tt(d)) + '</td><td style="text-align:center">' + n(d) + '</td><td>' + esc(hinhThucNgan(infoTeam(rec,
  d))) + '</td><td style="text-align:right">' + (typeof d.dienTich === 'number' ? formatNumber(d.dienTich, 3) : multi ? '<span class="mut">theo số người</span>' : '<span class="mut">cả lô</span>') + '</td></tr>';
  if (hdMo('nc')) return '<div class="card" id="doiKT"><h3 class="sro">Thông tin hợp đồng</h3>' + (chua ? '<div class="msg warn" style="margin-top:6px">' + chua + ' người chưa thuộc đội nào: chọn đội ở cột Đội của bảng nhân công.</div>' : '') +   // 3.0 trang chi tiết: danh sách đội ở trang danh sách
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
  if (rec.doi && rec.doi.length && !hdMoHopLe('nc', rec)) hdMoDat('nc', rec.doi[0].id);
  const d = rec.doi?.find(x => x.id === hdMo('nc'));
  const teamNc = rec.nc.filter(r => !d || r.doiId === d.id);
  const count = teamNc.length;
  const infoD = d ? infoTeam(rec, d) : {};
  const hasCc = d ? Object.values(rec.cc || {}).some(m => teamNc.some(r => m && m[HAKChamCong.personKey(r)] && Object.keys(m[HAKChamCong.personKey(r)]).length)) : false;
  const detail = khungMucLo('nc', [
    ['chung', 'Thông tin HĐ', () => panelDoiKT(rec), null, !!(d && (d.ten || d.benNhanKhoan))],
    ['dongia', 'Hình thức & đơn giá', () => panelLuong(rec) + doiPanel(rec) + dinhBienPanel(rec), null, !!(infoD && infoD.cachTinh)],
    ['thanhvien', 'Thành viên', () => panelThanhVien(rec), count, count > 0],
    ['chamcong', 'Chấm công', () => panelChamCong(recDoiChon(rec)), null, hasCc],
    ['vanban', 'Số văn bản', () => panelDoiVB(rec), null, !!(d && d.exp && (d.exp.soKT || d.exp.ngayKT))]
  ], 'chung', {inspector: true});
  if (!rec.doi) return detail;
  return '<div class="hak-master-detail">' +
    '<aside class="hak-master-pane">' + panelDsNC(rec, {master: true, selId: d ? d.id : ''}) + '</aside>' +
    '<section class="hak-detail-pane">' +
      '<div class="hak-pane-head" id="hdDau">' +
        (d ? '<button class="btn ghost sm" data-act="hdQuayLai" data-kind="nc" id="hdQuayLai" style="margin-right:8px">← Quay lại danh sách</button>' : '') +
        '<div class="hdDauTen"><h3>' + (d ? 'Chi tiết: <span id="hdDauTen">' + esc(tenDoiNc(rec, d)) + '</span>' + (soHdNc(rec, d) ? ' · <span id="hdDauSo">số ' + esc(soHdNc(rec, d)) + '</span>' : '') : 'Chi tiết hợp đồng nhân công') + '</h3></div>' +
      '</div>' +
      detail +
    '</section></div>';
}
function panelThanhVien(rec) {
  const c = checkNC(rec), t = rec.doi && rec.doi.length > 1 && !NAV.ncTatCa ? curTeam() : null, baseOnly = t ? r => r.doiId === t.id || !rec.doi.some(d => d.id === r.doiId) : null;
  const baseNc = baseOnly ? (rec.nc || []).filter(baseOnly) : (rec.nc || []);
  const SF = HAKCore.sf, cdOpts = [...new Set(baseNc.map(r => trim(r.chucDanh)).filter(Boolean))].sort();
  const sfCfg = {
    screenId: 'lo_nhan_cong', title: 'Thành viên đội khai thác',
    searchPlaceholder: 'Tìm họ tên, CCCD, vị trí…',
    quickFields: ['q', 'coLoi'],
    advancedFields: ['q', 'chucDanh', 'coLoi'],
    matchQ: (r, q) => SF.hay([r.ten, r.cccd, r.chucDanh, r.vaiTro]).includes(q),
    fields: [
      {key: 'chucDanh', label: 'Vị trí', type: 'multi', withNone: true, options: cdOpts, match: (r, vals) => SF.inSet(vals, r.chucDanh)},
      {key: 'coLoi', label: 'Chỉ dòng có lỗi / cảnh báo', type: 'bool', match: r => c.state[r._row] === 'err' || c.state[r._row] === 'warn'}
    ]
  };
  const sfRes = hakSfApply('lo_nhan_cong', sfCfg, baseNc), sfSet = new Set(sfRes.rows);
  const only = r => (!baseOnly || baseOnly(r)) && sfSet.has(r);
  const head = panelImport('nc', rec) + stBar('nc', rec) + (baseNc.length ? hakSfBarHtml('lo_nhan_cong', sfRes.total, sfRes.kept) : '') + stErrBox();
  const loc = rec.doi && rec.doi.length > 1 ? '<div class="row" style="margin:6px 0">' + (t ? '<span class="mut">Đang xem nhân công của đội “' + esc(t.ten || '') + '”.</span> <button class="btn ghost sm" data-act="ncTatCa">Xem tất cả nhân công của lô</button>' :
  '<span class="mut">Đang xem tất cả nhân công của lô.</span> <button class="btn ghost sm" data-act="ncTheoDoi">Chỉ xem đội đang chọn</button>') + '</div>' : '';
  const hienDoi = rec.doi?.length > 1;
  return head + issuesBox(c.errs, c.warns) + loc + stTable('nc', rec, ['Chức vụ', 'Danh xưng', 'Họ và tên', 'Ngày sinh', 'CCCD', 'Vị trí', ...(hienDoi ? ['Đội'] : []), 'Đơn giá'],
    r => '<td>' + esc(r.vaiTro) + '</td><td>' + esc(r.danhXung) + '</td><td>' + esc(r.ten) + '</td><td>' + esc(r.ngaySinh) + '</td><td>' + esc(r.cccd) + '</td><td>' + esc(r.chucDanh) + '</td>' + (hienDoi ? '<td>' + doiCell(rec, r) + '</td>' : '') + '<td>' + fmt(rateOf(infoRow(rec, r), r)) + '</td>',
    c, null, only);
}
/* 3.5.1: ghi nhận (trong bản nháp) việc thêm nhân công / xe / phiếu cân ngoài đường nạp file; lưu vào nhật ký của lô cùng lần bấm “Lưu dữ liệu vào lô” */
function skGhi(st, kind, nguon, them) { if (!st || !them) return; (st.sk = st.sk || []).push({kind, nguon, them}); }
