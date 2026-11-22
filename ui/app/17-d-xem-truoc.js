/* ----- Bước 3: xem trước ----- */
function lkTarget() {
  if (lk.mode === 'fill') {   // lô đích là lô đã chọn lúc bấm “Điền vào rừng này”, không đổi theo lô đang mở
    const t = lk.tgt || {o: NAV.cur, f: NAV.curF, epoch: dbEpoch}, o = db.rs[t.o], f = o && o.forests && o.forests[t.f], st = f ? stages[stKeyOf(t.o, t.f)] : null;
    if (!f || t.epoch !== dbEpoch) return {o: null, f: null, gone: true, oi: {}, fi: {}, pc: [], dx: [], giay: []};
    return {o, f, oi: o.info, fi: f.info, pc: st ? st.cur.pc : (f.pc || []), dx: st ? st.cur.dx : (f.dx || []), giay: f.info.giayTo || []};
  }
  const o = lk.owner !== 'new' ? db.rs[lk.owner] : null;
  return {o, f: null, oi: o ? o.info : {}, fi: {}, pc: [], dx: [], giay: []};
}
const same = (a, b) => (a == null || a === '' ? '' : String(a)).trim() === (b == null || b === '' ? '' : String(b)).trim();
const isEmpty = v => v == null || v === '';
function lkInitSel() {
  const c = lk.cand, F = c.forests[lk.fi], T = lkTarget(), s = {owner: {}, forest: {}, area: null, gps: null, docs: {}, phieu: {}, ref: true, plateOnly: true};
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
const lkOwnStr = (o, k) => (o && typeof o === 'object' && Object.hasOwn(o, k) && typeof o[k] === 'string') ? o[k] : '';   // khóa 'constructor', 'toString'… không được coi là đã ghép
function lkAliasOf(raw) { const k = foldVi(raw); return lkOwnStr(db.bienAlias, k) || lkOwnStr(lk.alias, k); }
/* Đổi biển số hàng loạt ngay lúc tra cứu: chọn nhóm phiếu (đang tích, hoặc cùng một biển trên bảng) rồi gõ biển mới một lần; vẫn chỉ vào bản nháp */
function lkBulkHtml(P, chosen) {
  const groups = {}; P.filter(p => p.st !== 'issue').forEach(p => { const k = p.bien || ('(tên xe) ' + p.bienRaw); groups[k] = (groups[k] || 0) + 1; });
  return '<div class="card" id="lkBulk"><b>Đổi biển số hàng loạt</b><div class="mut">Chọn nhóm phiếu, gõ biển đúng một lần, bấm Áp dụng. Biển mới hiện ở cột Biển số của từng dòng; vẫn có thể sửa riêng từng dòng. Chỉ đổi trong lần tra cứu này, chưa ghi vào hồ sơ.</div>' +
    '<div class="row" style="gap:6px;flex-wrap:wrap;margin-top:6px"><select id="lkBulkSrc"><option value="*">Các phiếu đang tích (' + chosen.length + ')</option><option value="#F"' + (lk.pcFilter ? ' selected' : '') + '>Các phiếu đang lọc (' + lkPcFiltered(P).filter(p => p.st !== 'issue').length +
    ')</option>' + Object.entries(groups).map(([k,
    n]) => '<option value="' + esc(k) + '">Mọi phiếu đang ghi ' + esc(k) + ' (' + n + ')</option>').join('') + '</select>' +
    ' → <input id="lkBulkNew" list="lkPlates2" size="12" placeholder="Biển số mới" aria-label="Biển số mới"> <button class="btn sm" data-act="lkBulk">Áp dụng</button> <button class="btn ghost sm" data-act="lkBulkUndo">Trả lại biển gốc cho nhóm này</button></div></div>';
}
/* Lọc bảng phiếu cân để tích: nhiều từ khóa cách nhau bằng dấu phẩy (OR); khớp số phiếu, ngày, biển số (bỏ dấu chấm, gạch), tên xe, khách hàng */
function lkPcFiltered(P) {   // khớp cả biển gốc (không chỉ biển vừa đổi) để dòng không biến mất khi vừa đổi biển
  const terms = String(lk.pcFilter || '').split(/[,;\n]+/).map(t => t.trim()).filter(Boolean);
  if (!terms.length) return P;
  return P.filter(p => { const text = foldVi([p.soPhieu, p.ngay, p.bien, p.bienGoc, p.bienRaw, p.khachHang, p.note].join(' ')), plates = [p.bien, p.bienGoc, p.bienRaw, p.exBien].map(bienKey).join(' ');
  return terms.some(t => text.includes(foldVi(t)) || (bienKey(t).length >= 3 && plates.includes(bienKey(t)))); });
}
function lkFilterHtml(P, Pf) {
  return '<div class="card" id="lkFilter"><b>Lọc phiếu để tích</b><div class="mut">Gõ một hoặc nhiều biển số, số phiếu, ngày hoặc tên khách (cách nhau dấu phẩy), bấm Enter hoặc Lọc. Phiếu bị ẩn vẫn giữ trạng thái tích.</div>' +
    '<div class="row" style="gap:6px;flex-wrap:wrap;margin-top:6px"><input id="lkPcFilter" size="40" value="' + esc(lk.pcFilter || '') +
    '" placeholder="vd: 92C-12345, 92C-67890" aria-label="Lọc phiếu cân"> <button class="btn sm" data-act="lkPcFilter">Lọc</button> <button class="btn ghost sm" data-act="lkPcFilterTick">Tích các phiếu đang lọc</button> <button class="btn ghost sm" data-act="lkPcFilterUntick">Bỏ tích các phiếu đang lọc</button> <button class="btn ghost sm" data-act="lkPcFilterClear">Xóa lọc</button> <span class="mut">Đang hiện ' +
    Pf.length + '/' + P.length + ' phiếu</span></div></div>';
}
const lkPhieuKey = p => HAKBks.khoaPhieu(p) || (HAKBks.soPhieu(p && p.soPhieu) + '|' + String((p && p.ngay) || '') + '|' + String((p && p.row) || ''));
function lkBulkTargets() {
  const src = ($('#lkBulkSrc') || {}).value || '*', filt = new Set(lkPcFiltered(lkPhieuRows()).map(p => p._lkKey));
  return lkPhieuRows().filter(p => p.st !== 'issue' && (src === '*' ? (lk.sel.phieu[p._lkKey] ?? lk.sel.phieu[p.soPhieu]) : src === '#F' ? filt.has(p._lkKey) : (p.bien || ('(tên xe) ' + p.bienRaw)) === src));
}
function lkPhieuRows() {
  const F = lk.cand.forests[lk.fi], T = lkTarget(), byKp = {}, byNo = {}, keys = new Set(T.dx.map(x => bienKey(x.bienSo)));
  T.pc.forEach(p => { const kp = HAKBks.khoaPhieu(p); if (kp) byKp[kp] = p; byNo[HAKBks.soPhieu(p.soPhieu)] = p; });   // cùng cách chuẩn hóa số phiếu như HAKBks.khoaPhieu (“PA 1” = “PA1”)
  return F.phieu.map(p => {
    const _lkKey = lkPhieuKey(p);
    const ov = (((lk.plateOv || {})[_lkKey] ?? (lk.plateOv || {})[p.soPhieu.toUpperCase()]) || '').trim().toUpperCase(), bienGoc = p.isPlate ? p.bienRaw.toUpperCase() : lkAliasOf(p.bienRaw);
    const bien = ov || bienGoc;   // xe đã đổi: sửa biển số ngay trong bảng này rồi mới đưa qua rừng
    const kp = HAKBks.khoaPhieu(p), exKp = kp ? byKp[kp] : null, exNo = byNo[HAKBks.soPhieu(p.soPhieu)], ex = exKp || exNo;
    let st = 'new', note = '';
    if (p.issue) { st = 'issue'; note = p.issue; }
    else if (!bien) { st = 'alias'; note = 'Cần ghép tên xe “' + p.bienRaw + '” với biển số'; }
    else if (exKp && exKp.ngay === p.ngay && bienKey(exKp.bienSo) === bienKey(bien) && Math.abs((exKp.kl || 0) - p.kl) < 1e-9) { st = 'same'; note = 'Đã có trong hồ sơ — bỏ qua'; }
    else if (!exKp && exNo && HAKBks.khoaPhieu(exNo) !== kp) { st = 'new'; note = 'Cùng số phiếu với phiếu đã có ngày ' + (exNo.ngay || '?') + ' nhưng khác ngày cân (' + p.ngay + '): hợp lệ nếu là chuyến khác — sau khi đưa vào lô, bước “Cần đối chiếu” cho chọn “Là chuyến khác”'; }
    else if (exKp) { st = 'upd'; note = 'Đã có số phiếu này nhưng khác dữ liệu — chọn để cập nhật'; }
    const warn = [!p.assignable ? 'hợp đồng có nhiều rừng' : '', bien && !keys.has(bienKey(bien)) ? 'biển chưa có trong danh sách xe của rừng' : '', (p.giaLoi || []).length ? 'giá không đọc được, giữ giá trị đã lưu: ' + p.giaLoi.join('; ') : ''].filter(Boolean).join('; ');
    const thieuThem = !!(exKp && !p.issue && ((!exKp.gioCan1 && p.gioCan1) || (!exKp.gioCan2 && p.gioCan2) || (exKp.can1 == null && p.can1 != null) || (exKp.can2 == null && p.can2 != null) || (exKp.klKg == null && p.klKg != null) || (!exKp.khachHang && p.khachHang) || (exKp.donGia == null && p.donGia != null) ||
    (exKp.thanhTien == null && p.thanhTien != null)));
    if (st === 'same' && thieuThem) { st = 'upd'; note = 'Bổ sung giờ cân, cân lần 1, cân lần 2, khối lượng kg, khách hàng, đơn giá, thành tiền từ bảng tính'; }
    const bienDoi = !!(exKp && bien && !p.issue && bienKey(exKp.bienSo) !== bienKey(bien));
    if (bienDoi && st === 'upd') note = 'Biển số khác: ' + (exKp.bienSo || '(chưa có)') + ' → ' + bien + (exKp.ngay === p.ngay && Math.abs((exKp.kl || 0) - p.kl) < 1e-9 ? ' (chỉ khác biển số)' : '');
    return {...p, _lkKey, bien, bienGoc, bienSua: !!ov && ov !== bienGoc, st, note, warn, ex: !!exKp, exBien: exKp ? exKp.bienSo : '', bienDoi};
  });
}
function lkPhieuDefaults() {
  lk.sel.phieu = {};
  lkPhieuRows().forEach(p => {
    const on = (p.st === 'new' && p.assignable && !/danh sách xe/.test(p.warn)) || (p.st === 'upd' && p.bienDoi);
    lk.sel.phieu[p._lkKey] = on;
    if (!(p.soPhieu in lk.sel.phieu)) lk.sel.phieu[p.soPhieu] = on;
  });   // phiếu đã có mà bảng tính có biển khác: tích sẵn để đổi biển
}
function lkChosenPhieu() { return lkPhieuRows().filter(p => (lk.sel.phieu[p._lkKey] ?? lk.sel.phieu[p.soPhieu]) && (p.st === 'new' || p.st === 'upd')); }

function lkPreviewHtml() {
  const c = lk.cand, F = c.forests[lk.fi], T = lkTarget(), s = lk.sel;
  const tgt = lk.mode === 'fill' ? (T.gone ? '<b class="err">lô đích không còn tồn tại</b>' : esc(T.o.info.ten) + ' · lô ' + esc(T.fi.maRung)) : (T.o ? esc(T.o.info.ten) + ' (chủ rừng đã có)' : 'chủ rừng mới “' + esc((c.owner.fields.find(x => x.key === 'ten') || {}).value || '') + '”') +
  ' · rừng mới ' + esc(F.maRung || '(sinh mã tự động)');
  const choice = (grp, x, curV) => {
    const v = s[grp][x.key];
    if (v === 'same') return '<td colspan="2"><span class="pill ok">giống nhau</span></td>';
    if (isEmpty(curV)) return '<td><label style="flex-direction:row"><input type="checkbox" data-lksel="' + grp + '|' + esc(x.key) + '"' + (v === 'new' ? ' checked' : '') + '> điền</label></td><td></td>';
    return '<td><label style="flex-direction:row"><input type="radio" name="lk_' + grp + '_' + esc(x.key) + '" data-lkrad="' + grp + '|' + esc(x.key) + '|keep"' + (v === 'keep' ? ' checked' : '') + '> giữ hiện có</label></td>' +
      '<td><label style="flex-direction:row"><input type="radio" name="lk_' + grp + '_' + esc(x.key) + '" data-lkrad="' + grp + '|' + esc(x.key) + '|new"' + (v === 'new' ? ' checked' : '') + '> dùng đề xuất</label>' + (v == null ? ' <span class="pill err">cần chọn</span>' : '') + '</td>';
  };
  const rows = (grp, list, curObj) => list.map(x => '<tr><td>' + esc(x.label) + '</td><td>' + esc(curObj[x.key] ?? '') + '</td><td><b>' + numTxt(x.value) + '</b></td><td class="mut">' + srcTxt(x.src) + '</td>' + choice(grp, x, curObj[x.key]) + '</tr>').join('');
  const head = '<tr><th>Trường</th><th>Giá trị hiện có</th><th>Giá trị đề xuất</th><th>Nguồn (tab · dòng · cột)</th><th colspan="2">Chọn</th></tr>';
  const P = lkPhieuRows(), Pf = lkPcFiltered(P), chosen = lkChosenPhieu(), tan = HAKDinhMuc.tongPhieuTan(chosen);
  const names = [...new Set(P.filter(p => !p.isPlate && p.bienRaw).map(p => p.bienRaw))];
  const plates = [...new Set(T.dx.map(x => x.bienSo).filter(Boolean))];
  return '<button class="btn ghost sm" data-act="lkBackCand">← Chọn lại kết quả</button>' +
    '<h3>Xem trước — ghi vào: ' + tgt + '</h3><p class="mut">Mặc định chỉ điền ô đang trống. Ô đã có dữ liệu khác phải chọn rõ giữ hay thay trước khi lưu. Bỏ chọn trường nào thì trường đó không đổi.</p>' +
    '<h3>Thông tin chủ rừng</h3><div class="wrap"><table>' + head + rows('owner', c.owner.fields, T.oi) + '</table></div>' +
    '<h3>Thông tin rừng</h3><div class="wrap"><table>' + head + rows('forest', F.fields, T.fi) +
    (F.area.length ? '<tr><td>Diện tích (ha)</td><td>' + esc(T.fi.dienTich ?? '') + '</td><td colspan="2">' + F.area.map((a, i) => '<label style="flex-direction:row;color:var(--ink)"><input type="radio" name="lkArea" data-lkarea="' + i + '"' + (s.area === i ? ' checked' : '') + '> <b>' +
    esc(a.label) + '</b> <span class="mut">— ' + srcTxt(a.src) + '</span></label>').join('') +
      (!isEmpty(T.fi.dienTich) ? '<label style="flex-direction:row;color:var(--ink)"><input type="radio" name="lkArea" data-lkarea="keep"' + (s.area === 'keep' ? ' checked' : '') + '> giữ giá trị hiện có</label>' : '') +
      '<label style="flex-direction:row;color:var(--ink)"><input type="radio" name="lkArea" data-lkarea="skip"' + (s.area === 'skip' ? ' checked' : '') + '> không điền</label></td><td colspan="2">' + (F.areaConflict ? '<span class="pill err">hai nguồn khác nhau</span>' : '') + (s.area == null ?
      ' <span class="pill err">cần chọn</span>' : '') + '</td></tr>' : '') +
    (F.gps.length ? '<tr><td>Tọa độ điểm tâm (WGS84)</td><td>' + esc(isEmpty(T.fi.lat) ? '' : T.fi.lat + ', ' + T.fi.lng) + '</td><td colspan="4">' + F.gps.map((g, i) => '<label style="flex-direction:row;color:var(--ink)"><input type="radio" name="lkGps" data-lkgps="' + i + '"' + (s.gps === i ?
    ' checked' : '') + (g.ok ? '' : ' disabled') + '> ' +
      (g.ok ? '<b>' + g.lat + ', ' + g.lng + '</b>' + (g.converted ? ' <span class="pill">đã quy đổi từ “' + esc(g.raw) + '”</span>' : '') : '<span style="color:var(--err)">' + esc(g.raw) + ' — không dùng được: ' + esc(g.reason) + '</span>') +
      ' <span class="mut">— ' + esc(g.id) + (g.noi ? ' · ' + esc(g.noi) : '') + ' · ToaDoRung dòng ' + g.row + '</span></label>').join('') +
      (!isEmpty(T.fi.lat) ? '<label style="flex-direction:row;color:var(--ink)"><input type="radio" name="lkGps" data-lkgps="keep"' + (s.gps === 'keep' ? ' checked' : '') + '> giữ tọa độ hiện có</label>' : '') +
      '<label style="flex-direction:row;color:var(--ink)"><input type="radio" name="lkGps" data-lkgps="skip"' + (s.gps === 'skip' || s.gps == null ? ' checked' : '') + '> không điền tọa độ</label></td></tr>' : '') +
    '</table></div>' +
    (F.docs.length ? '<h3>Giấy tờ nguồn gốc</h3><div class="wrap"><table><tr><th></th><th>Loại</th><th>Tên</th><th>Số</th><th>Ngày</th><th>Nguồn</th></tr>' + F.docs.map((d, i) => '<tr><td><input type="checkbox" data-lkdoc="' + i + '"' + (s.docs[i] ? ' checked' : '') + '></td><td>' + esc(d.loai) +
    '</td><td>' + esc(d.ten) + '</td><td>' + esc(d.so) + '</td><td>' + esc(d.ngayCap) + '</td><td class="mut">' + srcTxt(d.src) + (s.docs[i] ? '' : ' · đã có trong hồ sơ') + '</td></tr>').join('') + '</table></div>' : '') +
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
    Pf.map(p => '<tr class="' + (p.st === 'issue' || p.st === 'alias' ? 'rerr' : p.warn ? 'rwarn' : '') + '"><td><input type="checkbox" data-lkpc="' + esc(p.soPhieu) + '" data-lkkey="' + esc(p._lkKey) + '"' + ((s.phieu[p._lkKey] ?? s.phieu[p.soPhieu]) && (p.st === 'new' || p.st === 'upd') ? ' checked' : '') + (p.st === 'new' || p.st === 'upd' ? '' :
    ' disabled') + '></td><td>' + esc(p.soPhieu) + '</td><td>' + esc(p.ngay) + '</td><td>' + esc(p.gioCan1 || '') + '</td><td>' + esc(p.gioCan2 || '') + '</td><td>' + (p.st === 'issue' ? esc(p.bien || p.bienRaw) : '<input class="lkOv" list="lkPlates2" size="11" data-lkov="' + esc(p.soPhieu) + '" data-lkkey="' + esc(p._lkKey) +
    '" value="' + esc(p.bien || '') + '" placeholder="' + esc(p.bienRaw) + '" title="Đổi biển số xe của phiếu này trước khi đưa qua rừng" aria-label="Biển số phiếu ' + esc(p.soPhieu) + '">') + (p.bienSua ? ' <span class="pill">đã đổi từ ' + esc(p.bienGoc || p.bienRaw) + '</span>' : (p.bien &&
    !p.isPlate ? ' <span class="mut">(từ “' + esc(p.bienRaw) + '”)</span>' : '')) + '</td><td style="text-align:right">' + numTxt(p.can1) + '</td><td style="text-align:right">' + numTxt(p.can2) + '</td><td style="text-align:right">' + numTxt(p.klKg) + '</td><td style="text-align:right">' +
    numTxt(p.kl) + '</td><td>' + esc(p.khachHang || '') + '</td><td style="text-align:right">' + numTxt(p.donGia) + '</td><td style="text-align:right">' + numTxt(p.thanhToan) + '</td><td>' +
      ({new: 'thêm', upd: 'cập nhật', same: 'bỏ qua', issue: 'cần kiểm tra', alias: 'cần ghép biển'}[p.st]) + (p.note ? ' — ' + esc(p.note) : '') + (p.warn ? '<br><span style="color:var(--warn)">' + esc(p.warn) + '</span>' : '') + '</td><td class="mut">HoSoKeo_QC · dòng ' + p.row +
      '</td></tr>').join('') + '</table></div>' +
    '<p class="mut">Đơn giá và Thanh toán chỉ để tham chiếu, chưa dùng cho tiền công, cước vận chuyển hay giá khoán.</p>' +
    /* phiếu #09: bỏ ô “Điền tổng … tấn vào Khối lượng khai thác thực tế”: khối lượng thực tế của lô LẤY TỰ ĐỘNG từ tổng phiếu cân (HAKDinhMuc.tongPhieuTan), không có ô nhập để điền */
    (c.owner.ref.length + F.ref.length ? '<h3>Thông tin tham chiếu (chưa có ô tương ứng trong hồ sơ)</h3><div class="wrap"><table><tr><th>Trường</th><th>Giá trị</th><th>Nguồn</th></tr>' + c.owner.ref.concat(F.ref).map(x => '<tr><td>' + esc(x.label) + '</td><td>' + numTxt(x.value) +
    '</td><td class="mut">' + srcTxt(x.src) + '</td></tr>').join('') + '</table></div>' +
      '<label style="flex-direction:row;color:var(--ink)"><input type="checkbox" data-lkref' + (s.ref ? ' checked' : '') + '> Lưu phần tham chiếu này vào hồ sơ rừng để đối chiếu</label>' : '') +
    '<div class="row" style="justify-content:flex-end;margin-top:12px"><button class="btn ghost" data-act="lkBackCand">Quay lại</button><button class="btn" data-act="lkApply">Ghi vào lô (phiếu cân vào bản nháp)</button></div>';
}

function lkRender() {
  const body = lk.view === 'search' ? lkStatusHtml() + lkSearchHtml() : lk.view === 'cand' ? lkStatusHtml() + lkCandHtml() : lkPreviewHtml();
  $('#lkBody').innerHTML = '<div class="gh"><div><div class="mut gsCrumb">Trang chủ › Dữ liệu Google Sheets' + (lk.view === 'search' ? '' : ' › ' + (lk.view === 'cand' ? 'Chọn rừng' : 'Xem trước')) + '</div><h2>Dữ liệu Google Sheets</h2></div><button class="btn ghost sm" data-act="lkClose">✕ Đóng</button></div>' + (lk.view === 'preview' && lk.msg ? '<div class="msg ' + lk.msg.kind + '">' + esc(lk.msg.text) + '</div>' : '') + body;
}

