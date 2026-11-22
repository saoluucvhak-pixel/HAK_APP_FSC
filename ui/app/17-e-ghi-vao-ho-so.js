/* ----- Ghi vào hồ sơ: kiểm tra đủ lựa chọn, áp dụng một lần, lưu trong một giao dịch ----- */
/* Tạo chủ rừng / lô mới: MỘT nơi duy nhất ghi db.rs mới, dùng chung cho lkApply (từng rừng) và hộp thoại hợp đồng (gsApply). Lô mới có thời điểm tạo `taoLuc` (QĐ8: thứ tự nhập của rừng mới; không điền ngược cho lô cũ). */
function lkNewOwner(ma, src, mark) {
  const id = newId('rs'), o = db.rs[id] = {id, info: {ma, danhXung: 'Ông', ten: '', ngaySinh: '', cccd: '', ngayCap: '', noiCap: '', diaChi: ''}, forests: {}};
  mark(o, 'ma', src); return o;
}
function lkNewForest(o, at) {
  const fid = newId('f'), n = forestList(o).length + 1;
  return o.forests[fid] = {id: fid, info: {maRung: '', tenRung: 'Rừng ' + n, diaDiem: '', lat: null, lng: null, dienTich: null, dinhMucTanHa: null, dinhMucNgayHa: null, cuLy: null, tuNgay: '', denNgay: '', donGia: null, giayTo: []},
    nc: [], dx: [], pc: [], exp: {}, ncFile: '', ncAt: '', dxFile: '', dxAt: '', taoLuc: at};
}
async function lkApply() {
  const c = lk.cand, F = c.forests[lk.fi], s = lk.sel, errs = [];
  { const T0 = lk.mode === 'fill' ? lkTarget() : null;
  if (T0 && T0.f && loKhoa(T0.f)) { lk.msg = {kind: 'err', text: 'Chưa ghi: lô ' + ((T0.f.info || {}).maRung || '') + ' đã ' + (T0.f.dung ? 'dừng' : 'chốt') + ' (chỉ đọc). Mở khóa (nhập lý do) hoặc mở lại lô ở tab Xuất hồ sơ trước khi áp bản tra cứu. Hồ sơ giữ nguyên.'}; return lkRender(); } }
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
      if (!o) o = lkNewOwner(c.cccd, (c.owner.fields.find(x => x.key === 'cccd') || c.owner.fields[0] || {}).src || {tab: 'HoSoRung_QC', row: 0, col: 'Mã KH_CCCD'}, mark);
      f = lkNewForest(o, at); const n = forestList(o).length;
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
      const rows = chosen.map(p => Object.assign(HAKPhieuCan.chuanHoaNgay2(normPC({
      maRung: f.info.maRung, ngay: p.ngay, bienSo: p.bien, soPhieu: p.soPhieu, kl: p.kl, noiGiao: '', gioCan1: p.gioCan1, gioCan2: p.gioCan2, can1: p.can1, can2: p.can2, klKg: p.klKg, khachHang: p.khachHang, diaChi: p.diaChi, nguonGoc: p.nguonGoc, donGia: p.donGia, thanhTien: p.thanhTien})), {
      _ngay2Suy: true, _src: {tab: 'HoSoKeo_QC', row: p.row, at, set}}));
      // phiếu đã có mà bảng tính có biển khác, chọn “chỉ đổi biển số”: người dùng đã chọn đúng phiếu → coi là cùng chuyến, chỉ đổi biển số
      const isPlate = (p, i) => s.plateOnly && p.bienDoi;
      const plateRows = rows.filter((r, i) => isPlate(chosen[i], i)).map(r => ({soPhieu: r.soPhieu, bienSo: r.bienSo, _src: r._src})), restRows = rows.filter((r, i) => !isPlate(chosen[i], i));
      lkRep = HAKStage.merge(stages[k0], 'pc', restRows, {source: 'Google Sheets', plateSource: 'Google Sheets', suyNgay2: HAKPhieuCan.suyNgay2});
      if (NAV.curF === f.id) ganPhieuHopDong(stages[k0], lkRep.ids, f);   // 3.0: phiếu mới vào hợp đồng vận chuyển đang mở
      if (plateRows.length) { const pr = HAKStage.merge(stages[k0], 'pc', plateRows, {source: 'Google Sheets (đổi biển số)', plateSource: 'Google Sheets', sameTrip: true}); lkRep.upd += pr.upd; lkRep.same += pr.same; lkRep.pending += pr.pending; }
    }
    if (lk.alias) { db.bienAlias = Object.assign(db.bienAlias || {}, lk.alias); }
    if (s.ref && (c.owner.ref.length || F.ref.length)) f.ref = {at, set, hd: c.hd, cccd: c.cccd, fields: c.owner.ref.concat(F.ref)};
    const hadLo = loDirty.delete(f.id);   // áp bản tra cứu vào lô = lưu lô đó (kể cả thay đổi chưa lưu trước đó)
    const r = await persistNow();
    if (!r.ok) { if (hadLo) loDirty.add(f.id); throw new Error('lưu vào cơ sở dữ liệu thất bại: ' + r.error); } nhapTamGhi();
    const veHd = NAV.curF === f.id && NAV.ftab === 'dx' && hdMo('dx');   // 3.0: tra cứu từ hợp đồng vận chuyển: lưu xong ở lại đúng hợp đồng
    NAV.cur = o.id; NAV.curF = f.id; NAV.tab = 'rung'; NAV.ftab = veHd ? 'dx' : 'finfo'; NAV.view = 'owner';
    lkClose(); lk.view = 'search';
    if (chosen.length) NAV.ftab = 'dx';
    note('Đã ghi thông tin tra cứu vào ' + esc(o.info.ten) + ' · rừng ' + f.info.maRung + '.' + (chosen.length ? ' ' + chosen.length + ' phiếu cân đã đưa vào BẢN NHÁP (thêm ' + lkRep.add + ', cập nhật ' + lkRep.upd + ', giữ nguyên ' + lkRep.same + (lkRep.pending ? ', CẦN ĐỐI CHIẾU ' +
    lkRep.pending : '') + '): xem trước ở tab Vận chuyển rồi bấm “Lưu dữ liệu vào lô” (chưa lưu thì chưa dùng để tạo hồ sơ).' : ''),
    chosen.length ? 'warn' : undefined);
  } catch (e) {
    db = withDefaults(JSON.parse(snapshot));   // trả lại đúng trạng thái trước khi ghi
    if (HB) { const back = HB.loadSync(); if (back && back.ok) db = withDefaults(back.db); }
    lkNewStages.forEach(k => { delete stages[k]; });   // hoàn lại bản nháp phiếu cân mới tạo khi lưu thất bại (lô 9a, T-20)
    lk.msg = {kind: 'err', text: 'Không lưu, hồ sơ giữ nguyên: ' + e.message}; lkRender();
  }
}
async function persistNow() {
  doiDuLieu();
  if (!HB) { persist(); return {ok: storeOk}; }
  if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
  showSave('… Đang lưu');
  const r = await storeSave();
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
    if (!r.ok && r.corrupt && confirm('Kho bộ lọc đã lưu trên máy bị lỗi hoặc thuộc phiên bản khác nên chưa ghi đè.\n\nSao lưu nguyên văn bản cũ (không mất dữ liệu) rồi tạo kho mới để lưu bộ lọc này?')) { const d = lkPresets().discardCorrupt();
    r = d.ok ? lkPresets().save(LK_SF.screenId, nm, lkSf()) : d; }
    lk.msg = r.ok ? {kind: 'ok', text: 'Đã lưu bộ lọc “' + nm.trim() + '”.'} : {kind: 'err', text: r.msg}; return lkRender(); }
  if (a === 'lkPresetDel') { const nm = lk.presetSel || ($('#lkPreset') || {}).value || ''; if (nm && lkPresets().remove(LK_SF.screenId, nm)) { lk.presetSel = ''; lk.msg = {kind: 'ok', text: 'Đã xóa bộ lọc “' + nm + '”.'}; } else lk.msg = {kind: 'err', text: 'Chọn một bộ lọc đã lưu để xóa.'};
  return lkRender(); }
  if (a === 'lkGLogin') { lk.busy = 'Đang chờ đăng nhập Google trong trình duyệt…'; lk.msg = null; lkRender(); const r = await HB.google.login(); lk.busy = ''; lk.g = r.status;
  lk.msg = r.ok ? {kind: 'ok', text: 'Đã đăng nhập Google (quyền chỉ đọc). Bấm “Đồng bộ ngay” để tải bảng tính.'} : {kind: 'err', text: r.error}; return lkRender(); }
  if (a === 'lkGLogout') { const r = await HB.google.logout(); lk.g = r.status; lk.msg = {kind: 'ok', text: 'Đã đăng xuất Google.'}; return lkRender(); }
  if (a === 'lkFind') { lk.q = $('#lkQ').value; lkReadFilters(); lk.adv = !!($('#lkAdv') || {}).open; await lkSearch(); return lkRender(); }
  if (a === 'lkClearAll') { lk.q = ''; lk.tab = ''; lk.f = {from: '', to: '', minTan: '', maxTan: '', status: '', onlyIssues: false, sort: 'relevance'}; await lkSearch(); return lkRender(); }
  if (a === 'lkClear') { lk.f = {from: '', to: '', minTan: '', maxTan: '', status: '', onlyIssues: false, sort: 'relevance'}; lk.q = ($('#lkQ') || {}).value ?? lk.q; await lkSearch(); return lkRender(); }
  if (a === 'lkTemplate') { const r = await HB.lookup.template(); if (!r.ok) { lk.msg = {kind: 'err', text: 'Không tạo được file mẫu: ' + r.error}; return lkRender(); } download(new Blob([r.bytes], {type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}), r.file);
  lk.msg = {kind: 'ok', text: 'Đã tạo file mẫu ' + r.file + ' (3 tab HoSoKeo, HoSoRung, ToaDoRung và trang HUONG_DAN).'}; return lkRender(); }
  if (a === 'lkPendPick') { if (lk.pend) lk.pend.choice[el.dataset.role] = el.dataset.tab; return; }
  if (a === 'lkCancelTabs') { await HB.lookup.cancelTabs(); lk.pend = null; lk.msg = {kind: 'warn', text: 'Đã hủy, vẫn dùng bản tra cứu đã lưu.'}; return lkRender(); }
  if (a === 'lkConfirmTabs') {
    if (!lk.pend) return;
    lk.busy = 'Đang kiểm tra tab và nạp…'; lkRender();
    const r = await HB.lookup.confirmTabs(lk.pend.choice); lk.busy = '';
    lk.st = r.status || await HB.lookup.status(); lk.det = {};
    if (r.pending) { lk.pend = {pending: r.pending, conflicts: r.conflicts || [], sheets: r.sheets, choice: Object.fromEntries(Object.entries(r.pending).map(([k, v]) => [k, v.proposed]))}; lk.msg = {kind: 'err', text: 'Chưa nạp, vẫn dùng bản đã lưu. ' + (r.conflicts || []).join(' ')};
    return lkRender(); }
    if (r.ok) { lk.pend = null; lk.msg = {kind: 'ok', text: 'Đã nạp và ghi nhớ tab đã chọn cho bảng tính này. ' + Object.entries(r.counts).map(([k, v]) => TL(k) + ' ' + fmt(v) + ' dòng').join(', ') + '.'}; await lkSearch(); }
    else lk.msg = {kind: 'err', text: 'Chưa nạp, vẫn dùng bản đã lưu. ' + (r.errors || []).join('; ')};
    return lkRender();
  }
  if (a === 'lkSync') return lkLoad('sync');
  if (a === 'lkExcel') return lkLoad('excel');
  if (a === 'lkToSettings') { lkClose(); NAV.cur = null; NAV.curF = null; NAV.view = 'setgs'; setgs.msg = null; setgs.st = await HB.lookup.status(); return render(); }
  if (a === 'lkBack') { lk.view = 'search'; lk.msg = null; return lkRender(); }
  if (a === 'lkBackCand') { lk.view = 'cand'; lk.msg = null; return lkRender(); }
  if (a === 'lkModeFill') { lk.mode = 'fill'; lk.tgt = {o: NAV.cur, f: NAV.curF, epoch: dbEpoch}; lk.alias = {}; lk.plateOv = {}; lkInitSel(); lk.view = 'preview'; lk.msg = null; return lkRender(); }
  if (a === 'lkModeNew') { lk.owner = $('#lkOwner').value; lk.mode = 'new'; lk.alias = {}; lk.plateOv = {}; lkInitSel(); lk.view = 'preview'; lk.msg = null; return lkRender(); }
  if (a === 'lkOpenDup') { const d = findForestByMa(lk.cand.forests[lk.fi].maRung); NAV.cur = d.o.id; NAV.curF = d.f.id; NAV.tab = 'rung'; NAV.view = 'owner'; render(); lk.mode = 'fill'; lk.tgt = {o: NAV.cur, f: NAV.curF, epoch: dbEpoch}; lk.alias = {}; lk.plateOv = {}; lkInitSel();
  lk.view = 'preview'; return lkRender(); }
  if (a === 'lkPcAll') { lkPhieuRows().forEach(p => { const on = p.st === 'new' || p.st === 'upd'; lk.sel.phieu[p._lkKey] = on; lk.sel.phieu[p.soPhieu] = on; }); return lkRender(); }
  if (a === 'lkPcFilter') { lk.pcFilter = (($('#lkPcFilter') || {}).value || '').trim(); return lkRender(); }
  if (a === 'lkPcFilterClear') { lk.pcFilter = ''; return lkRender(); }
  if (a === 'lkPcFilterTick' || a === 'lkPcFilterUntick') { lk.pcFilter = (($('#lkPcFilter') || {}).value || '').trim(); const on = a === 'lkPcFilterTick'; lkPcFiltered(lkPhieuRows()).forEach(p => { if (p.st === 'new' || p.st === 'upd') { lk.sel.phieu[p._lkKey] = on; lk.sel.phieu[p.soPhieu] = on; } }); return lkRender(); }
  if (a === 'lkBulk') {
    const nw = (($('#lkBulkNew') || {}).value || '').trim().toUpperCase(), T = lkBulkTargets();
    if (!nw) { lk.msg = {kind: 'err', text: 'Gõ biển số mới trước khi áp dụng.'}; return lkRender(); }
    if (!T.length) { lk.msg = {kind: 'warn', text: 'Nhóm đã chọn không có phiếu nào (tích phiếu trước, hoặc chọn nhóm theo biển).'}; return lkRender(); }
    lk.plateOv = lk.plateOv || {}; T.forEach(p => { lk.plateOv[p._lkKey] = nw; lk.plateOv[p.soPhieu.toUpperCase()] = nw; }); lkPhieuDefaultsKeep();
    lk.msg = {kind: 'ok', text: 'Đã đổi biển ' + T.length + ' phiếu thành ' + nw + ' (chưa ghi vào hồ sơ). Kiểm tra cột Biển số rồi bấm “Ghi vào lô (phiếu cân vào bản nháp)”.'}; return lkRender();
  }
  if (a === 'lkBulkUndo') { const T = lkBulkTargets(); lk.plateOv = lk.plateOv || {}; T.forEach(p => { delete lk.plateOv[p._lkKey]; delete lk.plateOv[p.soPhieu.toUpperCase()]; }); lkPhieuDefaultsKeep(); lk.msg = {kind: 'ok', text: 'Đã trả lại biển gốc cho ' + T.length + ' phiếu.'}; return lkRender(); }
  if (a === 'lkPcNone') { Object.keys(lk.sel.phieu).forEach(k => { lk.sel.phieu[k] = false; }); return lkRender(); }
  if (a === 'lkApply') return lkApply();
});
document.addEventListener('change', e => {
  const t = e.target; if (!t.closest || !t.closest('#lkBox')) return;
  if (t.name === 'lkF') { lk.fi = +t.value; return lkRender(); }
  if (t.id === 'lkOwner') { lk.owner = t.value; return; }
  if (t.id === 'lkPreset') { lk.presetSel = t.value; if (!t.value) return; const r = HAKCore.sf.applyPreset(LK_SF, lkPresets().get(LK_SF.screenId, t.value)); if (!r.ok) { lk.msg = {kind: 'err', text: 'Không mở được bộ lọc đã lưu.'}; return lkRender(); } lkFromSf(r.state);
  lk.msg = r.dropped.length ? {kind: 'warn', text: 'Bộ lọc đã mở nhưng bỏ điều kiện không dùng được ở màn hình này: ' + r.dropped.join(', ')} : null; lkSearch().then(lkRender); return; }
  const sel = t.dataset; const s = lk.sel;
  if (sel.lksel) { const [g, k] = sel.lksel.split('|'); s[g][k] = t.checked ? 'new' : 'skip'; return; }
  if (sel.lkrad) { const [g, k, v] = sel.lkrad.split('|'); s[g][k] = v; return lkRender(); }
  if (sel.lkarea != null) { s.area = /^\d+$/.test(sel.lkarea) ? +sel.lkarea : sel.lkarea; return lkRender(); }
  if (sel.lkgps != null) { s.gps = /^\d+$/.test(sel.lkgps) ? +sel.lkgps : sel.lkgps; return; }
  if (sel.lkdoc != null) { s.docs[sel.lkdoc] = t.checked; return; }
  if (sel.lkpc != null) { s.phieu[sel.lkpc] = t.checked; if (t.dataset.lkkey) s.phieu[t.dataset.lkkey] = t.checked; return lkRender(); }
  if ('lkplonly' in sel) { s.plateOnly = t.checked; return lkRender(); }
  if ('lkref' in sel) { s.ref = t.checked; return; }
  if (sel.lkov != null) { lk.plateOv = lk.plateOv || {}; const v = t.value.trim().toUpperCase(), k = sel.lkov.toUpperCase(), k2 = (t.dataset.lkkey || '').toUpperCase(); if (v) { lk.plateOv[k] = v; if (k2) lk.plateOv[k2] = v; } else { delete lk.plateOv[k]; if (k2) delete lk.plateOv[k2]; } lkPhieuDefaultsKeep(); return lkRender(); }
  if (sel.lkalias != null) { lk.alias = lk.alias || {}; const v = t.value.trim().toUpperCase(); if (v) lk.alias[sel.lkalias] = v; else delete lk.alias[sel.lkalias]; lkPhieuDefaultsKeep(); return lkRender(); }
});
function lkPhieuDefaultsKeep() { lkPhieuRows().forEach(p => { if (!(p._lkKey in lk.sel.phieu) || (p.st === 'new' && p.assignable && !/danh sách xe/.test(p.warn) && lk.sel.phieu[p._lkKey] === false && p.bien)) lk.sel.phieu[p._lkKey] = p.st === 'new' && p.assignable && !/danh sách xe/.test(p.warn);
}); }
document.addEventListener('keydown', async e => {
  if (e.key === 'Enter' && e.target.id === 'lkPcFilter') { e.preventDefault(); lk.pcFilter = e.target.value.trim(); lkRender(); const n = document.getElementById('lkPcFilter'); if (n) { n.focus(); try { const L = n.value.length; n.setSelectionRange(L, L);
  } catch (er) { /* ô không có vùng chọn */ } } return; }
  if (e.key === 'Enter' && /^lk(Q|From|To|Min|Max)$/.test(e.target.id)) {
    const id = e.target.id; lk.q = ($('#lkQ') || e.target).value; lkReadFilters(); await lkSearch(); lkRender();
    const n = document.getElementById(id); if (n) { n.focus(); try { const L = n.value.length; n.setSelectionRange(L, L); } catch (er) { /* ô ngày không có vùng chọn */ } }   // vẽ lại không làm mất tiêu điểm bàn phím
    return;
  }
  /* phiếu #10 & lô 9c (T-23): hộp thoại đang mở giữ tiêu điểm bên trong — Tab / Shift+Tab đi vòng trong hộp, không ra trang bên dưới */
  if (e.key === 'Tab') {
    const hop = ['guideBox', 'lkBox', 'rpBox', 'impBox', 'stBox', 'dlgBox', 'hdBox', 'hdAsk', 'tkBox', 'thBox'].map(id => document.getElementById(id)).filter(b => b && (b.classList.contains('on') || b.id === 'tkBox' || b.id === 'thBox')).pop();
    if (hop) {
      const ds = [...hop.querySelectorAll('button, input:not([type=hidden]), select, textarea, a[href], [tabindex]:not([tabindex="-1"])')].filter(x => !x.disabled && x.offsetParent);
      if (ds.length) { const i = ds.indexOf(document.activeElement), j = i < 0 ? 0 : (i + (e.shiftKey ? -1 : 1) + ds.length) % ds.length; if (i < 0 || (e.shiftKey ? i === 0 : i === ds.length - 1)) { ds[j].focus(); e.preventDefault(); return; } }
    }
  }
  if (e.key === 'Escape' && !e.defaultPrevented) {   // Esc đóng hộp thoại trên cùng (hộp nhập/khôi phục → báo cáo → tra cứu → hướng dẫn); hộp nhập/khôi phục = Hủy, không ghi gì
    const open = id => { const b = document.getElementById(id); return b && b.classList.contains('on') ? b : null; };
    { const sb = open('stBox'), nut = sb && (sb.querySelector('#stGBack') || sb.querySelector('[data-act=stClose]')); if (nut) { nut.click(); e.preventDefault(); return; } }   // phiếu #10: hộp Lưu / Bỏ / Quay lại → Quay lại; hộp có nút Đóng → Đóng
    { const ak = open('hdAsk'); if (ak) { const no = ak.querySelector('[data-act=gsAskNo]'); if (no) no.click(); e.preventDefault(); return; } if (open('hdBox')) { gsClose(); e.preventDefault(); return; } }   // hộp xác nhận trên cùng → hộp thoại hợp đồng
    if (open('impBox')) { window.__imp = null; $('#impBox').classList.remove('on'); e.preventDefault(); return; }
    if (open('rpBox')) { rpClose(); e.preventDefault(); return; }
    if (open('lkBox')) { lkClose(); e.preventDefault(); return; }
    if (open('guideBox')) { document.getElementById('guideBox').classList.remove('on'); e.preventDefault(); return; }
  }
});
window.addEventListener('online', () => { if ($('#lkBox').classList.contains('on') && lk.view !== 'preview') lkRender(); });
window.addEventListener('offline', () => { if ($('#lkBox').classList.contains('on') && lk.view !== 'preview') lkRender(); });

