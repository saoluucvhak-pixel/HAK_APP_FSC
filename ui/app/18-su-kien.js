/* ========== Sự kiện ========== */
document.addEventListener('click', async e => {
  const t = e.target;
  const mm = document.getElementById('moreMenu'); if (mm && mm.open && (!t.closest('#moreMenu') || t.closest('.pop button.mi'))) mm.open = false;
  const skp = t.closest('[data-skinpick]'); if (skp) { setSkin(skp.dataset.skinpick); return; }
  const dsh = t.closest('[data-dash]'); if (dsh) { const [oid, fid] = dsh.dataset.dash.split('|'); openRs(oid); return openForest(fid); }
  const open = t.closest('[data-open]'); if (open) return openRs(open.dataset.open);
  const of = t.closest('[data-forest]'); if (of) return openForest(of.dataset.forest);
  const sf = t.closest('[data-sforest]'); if (sf) return openForest(sf.dataset.sforest);
  const tb = t.closest('[data-tab]'); if (tb) { tab = tb.dataset.tab; return render(); }
  const ftb = t.closest('[data-ftab]'); if (ftb) { ftab = ftb.dataset.ftab; return render(); }
  const xtb = t.closest('[data-xtab]'); if (xtb) { xtab = xtb.dataset.xtab; return render(); }
  const el = t.closest('[data-act]'); if (!el) return;
  const act = el.dataset.act;
  if (act === 'newRs') return newRs(), render();
  if (act === 'delRs') return delRs(), render();
  if (act === 'newForest') return newForest(), render();
  if (act === 'delForest') return delForest(), render();
  if (act === 'addGiay') return addGiayRow();
  if (act === 'openSettings') { const m = document.getElementById('moreMenu'); if (m) m.open = false; cur = null; curF = null; view = 'settings'; setg.msg = null; return render(); }
  if (act === 'dataRetry') return issueAct('retry');
  if (act === 'dataPick') return issueAct('pick');
  if (act === 'dataDefault') return issueAct('default');
  if (act === 'setData' || act === 'setDataDefault') return settingsData(act === 'setDataDefault');
  if (act === 'setBackup' || act === 'setBackupDefault') return settingsBackup(act === 'setBackupDefault');
  if (act === 'setOpenBackup') return HB.settings.openBackup();
  if (act === 'setOpenData') return HB.openDataFolder();
  if (act === 'openNorm') { view = 'norm'; return render(); }
  if (/^norm(AddVer|DelVer|AddPos|DelPos)$/.test(act)) return normAction(act, el);
  if (/^(fillTu|fillDen|fillKl|dmDefault|tgDefault|fillDenDk)$/.test(act)) return forestFill(act, el);
  if (/^cc(Fill|Clear|Print)$/.test(act)) { if (act === 'ccPrint' && stBlockNote()) return; return ccAct(act); }
  if (/^st(Add|AddXe|Edit|Del|Restore|Pend|Save|Discard|Close|Go)$/.test(act)) return stAct(act, el);
  if (act === 'pcPrint') { if (stBlockNote()) return; const rec = curRec(); if (!rec) return; const co = theCompany(); if (!co || !co.ten) note('Chưa khai thông tin công ty (Cài đặt → Công ty): phiếu dùng tiêu đề mặc định của công cụ.', 'warn'); return HB.phieuCan(HAKPhieuCan.aoa(rec), HAKPhieuCan.company(co)).then(r => { if (!r || !r.ok) note('Không mở được công cụ in phiếu cân' + (r && r.error ? ': ' + r.error : ''), 'err'); }); }
  if (act === 'dbDel') { const tr = el.closest('tr'); tr.querySelectorAll('input,textarea').forEach(x => { x.value = ''; }); tr.style.display = 'none'; return; }
  if (act === 'dbReset') { delete db.dinhBien; persist(); note('Đã quay về định mức nhân công mặc định (chưa lưu thành định mức riêng; bấm Lưu để dùng).', 'warn'); return render(); }
  if (act === 'keoDel') { const tr = el.closest('tr'); tr.querySelectorAll('input').forEach(x => { x.value = ''; }); tr.style.display = 'none'; return; }
  if (act === 'delGiay') return el.closest('.giayRow').remove();
  if (act === 'pcFixDate') {   // sửa ngày phiếu cũ bị sai: chỉ nhận ngày có thật; giữ nguyên mọi dữ liệu khác của phiếu
    const f = curForest(), row = el.dataset.row, r = f && (f.pc || []).find(x => String(x._row) === String(row)), inp = document.querySelector('[data-pcfix="' + row + '"]');
    if (!r || !inp) return;
    const v = trim(inp.value);
    if (!HAKDates.isValid(v)) { note('Chưa sửa phiếu ' + (r.soPhieu || '(không số)') + ': ' + HAKDates.why(v) + '.', 'err'); return; }
    const p = HAKDates.parse(v); r.ngay = HAKDates.format(p); persist(); note('Đã sửa ngày cân của phiếu ' + (r.soPhieu || '(không số)') + ' thành ' + r.ngay + '.', 'ok'); return render();
  }
  if (act === 'openCty') { cur = null; curF = null; view = 'cty'; cty.edit = null; cty.msg = null; return render(); }
  if (act === 'openSetGs') { cur = null; curF = null; view = 'setgs'; setgs.msg = null; setgs.st = HB ? await HB.lookup.status() : null; return render(); }
  if (act === 'openSetFmt') { cur = null; curF = null; view = 'setfmt'; return render(); }
  if (act === 'setGsSave') { const r = await HB.lookup.setSheet(($('#setGsLink') || {}).value.trim()); setgs.msg = r.ok ? {kind: 'ok', text: 'Đã lưu địa chỉ bảng tính.'} : {kind: 'err', text: r.error}; setgs.st = await HB.lookup.status(); return render(); }
  if (act === 'setNumStyle') { db.dinhDangSo = el.value === 'en' ? 'en' : 'vi'; persist(); return render(); }
  if (act === 'ctyAddAddr') { const c = ctyReadForm(); c.diaChiGiao.push({id: newId('a'), nhan: '', diaChi: ''}); cty.edit = c; render(); const rows = document.querySelectorAll('.ctyAddr [name=a_nhan]'); if (rows.length) rows[rows.length - 1].focus(); return; }
  if (act === 'ctyDelAddr') { el.closest('.ctyAddr').remove(); ctyShowMsg(); return; }
  if (act === 'mhOpen') { const f = curForest(), m = f && f.info.muaHang; mh.open = true; mh.addrId = m ? m.diaChiId : ''; return render(); }
  if (act === 'mhCancel') { mh.open = false; return render(); }
  if (act === 'mhConfirm') {
    const f = curForest(), snap = mhSnapshotNow(); if (!f || !snap) return;
    f.info = Object.assign({}, f.info, {muaHang: snap}); mh.open = false; persist();
    mh.msg = {kind: 'ok', text: 'Đã lưu công ty mua hàng và địa điểm vận chuyển đến cho rừng này: ' + snap.ten + ' – ' + snap.diaChi + '.'}; return render();
  }
  if (act === 'guide') return document.getElementById('guideBox').classList.add('on');
  if (act === 'goHome') { cur = null; curF = null; view = 'owner'; return render(); }
  if (act === 'guideBg') return t === el && el.classList.remove('on');
  if (act === 'guideClose') return document.getElementById('guideBox').classList.remove('on');
  if (act === 'theme') {
    const dark = document.documentElement.dataset.theme === 'dark' || (!document.documentElement.dataset.theme && matchMedia('(prefers-color-scheme:dark)').matches);
    setTheme(dark ? 'light' : 'dark'); return;
  }
  if (act === 'backup') return backupAll();
  if (act === 'ktGo') { const go = JSON.parse(el.dataset.go || '{}'); if (go.view) { view = go.view; return render(); } if (go.tab) { tab = go.tab; return render(); } ftab = go.ftab || 'finfo'; render(); const tgt = go.focus === 'pc' ? document.querySelector('[data-pcfix], #pcTable, .wrap table') : go.focus === 'mua' ? document.getElementById('mhDiemDen') : null; if (tgt && tgt.scrollIntoView) tgt.scrollIntoView({block: 'center'}); return; }
  if (act === 'lotBackup') return lotBackup();
  if (act === 'lotRestore') { const m = document.getElementById('moreMenu'); if (m) m.open = false; return lotRestoreOpen(); }
  if (act === 'lotCancel') { window.__lot = null; return $('#impBox').classList.remove('on'); }
  if (act === 'lotGo') return lotGo();
  if (act === 'impCancel') { window.__imp = null; return $('#impBox').classList.remove('on'); }
  if (act === 'impGo') return importGo();
  if (act === 'tpl') return downloadTemplate(el.dataset.kind);
  if (act === 'clear') {
    const f = curForest(); if (!f) return;
    if (el.dataset.kind === 'nc') { f.nc = []; f.ncFile = ''; f.ncAt = ''; }
    else if (el.dataset.kind === 'pc') { f.pc = []; f.pcFile = ''; f.pcAt = ''; }
    else { f.dx = []; f.dxFile = ''; f.dxAt = ''; }
    persist(); note('Đã xóa dữ liệu.'); return;
  }
  if (act === 'qtMark' || act === 'qtUnmark') { qtMarkAct((el.dataset.codes || '').split(',').filter(Boolean), act === 'qtMark'); return render(); }
  if ((act === 'd2dl' || act === 'd2confirm' || act === 'd2legacy' || act === 'd2undo') && stBlockNote()) return;
  if (act === 'd2dl' || act === 'd2confirm' || act === 'd2legacy' || act === 'd2undo') { const dt = el.closest('details.d2more'); if (dt) dt.open = false; }
  if (act === 'd2dl') {
    let keys = (el.dataset.keys || '').split('|').filter(Boolean); const mode = el.dataset.mode;
    try {
      if (mode === 'de') {   // nền in từ trước: bắt buộc đối chiếu trước khi in đè
        const f = curForest(), st = HAKInAn2.stateOf(f), pend = keys.filter(k => st.items[k] && st.items[k].legacy && !st.items[k].crossChecked);
        if (pend.length) {
          if (confirm('Có ' + pend.length + ' tờ nền in từ trước, chưa biết bố cục.\n\nĐối chiếu tờ nền đã in với mẫu hiện tại: khổ giấy, hướng giấy, lề, chữ cố định (tên, địa chỉ, số hợp đồng), số dòng bảng. Nếu khớp, bấm OK để in đè; nếu không, bấm Hủy rồi in lại mẫu nền hoặc in đầy đủ trên giấy trắng.\n\nBạn đã đối chiếu và thấy khớp?')) { pend.forEach(k => HAKInAn2.crossChecked(st, k, new Date().toISOString())); persist(); render(); }
          else keys = keys.filter(k => !pend.includes(k));
        }
      }
      if (!keys.length) { note('Không có mẫu nào để tải.', 'warn'); return; }
      await exportDot2(mode, keys);
    } catch (err) { note('Lỗi khi tạo file: ' + err.message, 'err'); }
    return;
  }
  if (act === 'd2confirm') { d2Confirm((el.dataset.keys || '').split('|').filter(Boolean), false); note('Đã ghi nhận đã in mẫu nền.', 'ok'); return render(); }
  if (act === 'd2legacy') { d2Confirm((el.dataset.keys || '').split('|').filter(Boolean), true); note('Đã ghi nhận có tờ nền in từ trước; sẽ hỏi đối chiếu trước khi in đè.', 'ok'); return render(); }
  if (act === 'd2undo') { const f = curForest(), st = HAKInAn2.stateOf(f); (el.dataset.keys || '').split('|').filter(Boolean).forEach(k => HAKInAn2.unconfirm(st, k)); persist(); note('Đã bỏ xác nhận in nền.', 'ok'); return render(); }
  if (act === 'dl') {
    const idx = el.dataset.idx != null ? Number(el.dataset.idx) : null;
    try { await exportKind(el.dataset.kind, idx); }
    catch (err) { note('Lỗi khi tạo file: ' + err.message, 'err'); }
    return;
  }
});

document.addEventListener('submit', e => {
  if (e.target.id === 'infoForm') { e.preventDefault(); saveInfo(e.target); }
  if (e.target.id === 'forestForm') { e.preventDefault(); saveForest(e.target); }
  if (e.target.id === 'luongForm') { e.preventDefault(); saveLuong(e.target); }
  if (e.target.id === 'stForm') { e.preventDefault(); stFinishRow(); }
  if (e.target.id === 'vcForm') { e.preventDefault(); saveVc(e.target); }
  if (e.target.id === 'giayForm') { e.preventDefault(); saveGiay(e.target); }
  if (e.target.id === 'normForm') { e.preventDefault(); saveNorm(e.target); }
  if (e.target.id === 'keoForm') { e.preventDefault(); saveKeo(e.target); }
  if (e.target.id === 'tgForm') { e.preventDefault(); saveTg(e.target); }
  if (e.target.id === 'dbForm') { e.preventDefault(); saveDb(e.target); }
});

document.addEventListener('change', e => {
  const t = e.target;
  if (t.name === 'bienSo' && t.form && t.form.id === 'stForm' && t.value === '__new') { stRead(); stOpen('dx', null, null, {kind: stm.kind, id: stm.id, vals: Object.assign({}, stm.vals, {bienSo: ''})}); return; }   // thêm xe ngay trong lượt sửa phiếu: giữ nguyên các ô đã nhập
  if (t.name === 'vcMode' && t.form && t.form.id === 'vcForm') {
    t.form.querySelectorAll('[data-vcgrp]').forEach(g => { g.style.display = g.dataset.vcgrp === t.value ? '' : 'none'; });
    return;
  }
  if ((t.name === 'hinhThucLuong' || t.name === 'moHinhKy') && t.form && t.form.id === 'luongForm') {
    const f = t.form.elements, direct = f.moHinhKy.value === 'tructiep';
    if (t.name === 'moHinhKy') { let cur = f.hinhThucLuong.value; if (!basisAllowed(direct, cur)) cur = 'sanluong'; f.hinhThucLuong.innerHTML = luongOptions(direct, cur); }
    t.form.querySelectorAll('[data-grp]').forEach(g => { g.style.display = g.dataset.grp === f.hinhThucLuong.value ? '' : 'none'; });
    return;
  }
  if (t.dataset.file === 'restore') { if (t.files[0]) restoreAll(t.files[0]); t.value = ''; return; }
  if (t.dataset.file && t.files[0]) {
    const f = t.files[0];
    if (!curForest()) return note('Chọn rừng trước khi nạp file.', 'err');
    importFile(t.dataset.file, f).then(render);
    t.value = '';
    return;
  }
  const f = curForest();
  if (t.dataset.exp && f) {
    f.exp = f.exp || {};
    f.exp[t.dataset.exp] = trim(t.value);
    persist();
  }
});

const SKINS = [
  ['luxe', 'Luxe — navy, champagne, ngà (mặc định)', ['#1d3a63', '#b8903f', '#f5f2ec']],
  ['classic', 'Classic — xanh ngọc (teal)', ['#0e7c86', '#0f2740', '#f3f6fa']],
  ['neutral', 'Neutral — xám xanh doanh nghiệp', ['#35475a', '#a8812f', '#f3f5f7']],
  ['champagne', 'Champagne — vàng ấm', ['#85601a', '#2b2411', '#faf6ec']]];
function setSkin(k) {
  if (!SKINS.some(x => x[0] === k)) k = 'luxe';
  document.documentElement.dataset.skin = k;
  try { localStorage.setItem('hskt.skin', k); } catch (e) {}
  const box = document.getElementById('skinPick');
  if (box) box.innerHTML = '<b>Bảng màu</b>' + SKINS.map(([id, label, c]) => '<button class="skinbtn' + (id === k ? ' on' : '') + '" data-skinpick="' + id + '" aria-pressed="' + (id === k) + '"><span class="sw">' + c.map(x => '<i style="background:' + x + '"></i>').join('') + '</span>' + esc(label) + '</button>').join('');
}
let savedSkin = null;
try { savedSkin = localStorage.getItem('hskt.skin'); } catch (e) {}
setSkin(savedSkin);
function setTheme(t) {
  document.documentElement.dataset.theme = t;
  try { localStorage.setItem('hskt.theme', t); } catch (e) {}
  const b = document.getElementById('themeBtn');
  if (b) b.textContent = t === 'dark' ? 'Chế độ sáng' : 'Chế độ tối';
}
let savedTheme = null;
try { savedTheme = localStorage.getItem('hskt.theme'); } catch (e) {}
if (savedTheme === 'dark' || savedTheme === 'light') setTheme(savedTheme);
else if (matchMedia('(prefers-color-scheme:dark)').matches) setTheme('dark');
document.addEventListener('change', e => { if (e.target && e.target.id === 'normVer') { normSel = e.target.value; render(); } });
document.addEventListener('input', e => {
  const t = e.target;
  if (t.dataset && t.dataset.mamoi !== undefined) { impMaCheck(); return; }
  if (t.dataset && t.dataset.exp && curForest()) {   // xem trước số hợp đồng cập nhật ngay khi gõ
    const rec = curRec(), exo = Object.assign({}, rec.exp, {[t.dataset.exp]: trim(t.value)});
    const a = document.getElementById('soPreviewHd'), b = document.getElementById('soPreviewVc');
    if (a) a.innerHTML = soPreviewHtml(rec, exo, 'hd'); if (b) b.innerHTML = soPreviewHtml(rec, exo, 'vc');
  }
  if (t.form && t.form.id === 'forestForm' && ['dienTich', 'dinhMucNgayHa', 'tuNgay', 'denNgay', 'dinhMucTanHa', 'soDoi'].includes(t.name)) {
    { const sn = document.getElementById('soDoiNote'); if (sn) sn.innerHTML = soDoiNote(readForest(t.form), (curForest() || {}).nc); }   // thời gian khai thác dự kiến và ngày kết thúc hiện ngay khi gõ
    const nt = document.getElementById('tgNote'); if (nt) nt.innerHTML = tgDuKienHtml(readForest(t.form), (curForest() || {}).pc, nDoiOf(readForest(t.form), (curForest() || {}).nc));
  }
  if (t.form && t.form.id === 'forestForm' && (t.name === 'dienTich' || t.name === 'dinhMucTanHa')) {   // sản lượng dự kiến tự nhảy ngay khi gõ, không cần bấm Lưu
    const dt = toDec(t.form.elements.dienTich.value); let dm = toDec(t.form.elements.dinhMucTanHa.value), out = document.getElementById('slDuKien');
    if (dm == null) { const k = HAKDinhMuc.keoPick(db, trim(t.form.elements.tuNgay.value)); dm = k.found ? k.item.tanHa : null; }   // để trống: định mức mặc định
    if (out) out.value = (typeof dt === 'number' && typeof dm === 'number') ? fmt(Math.round(dt * dm)) + ' tấn' : (dt === 'x' || dm === 'x') ? 'Diện tích hoặc định mức không phải là số' : '';
    return;
  }
  if (t.closest && t.closest('#ctyForm')) ctyShowMsg();
});
document.addEventListener('submit', e => { if (e.target.id === 'ctyForm') { e.preventDefault(); ctySave(); } });
document.addEventListener('change', e => {
  const t = e.target;
  if (t.id === 'mhAddr') { mh.addrId = t.value === '@main' ? '' : t.value; return render(); }
});
document.getElementById('sideQ').addEventListener('input', e => { sideQ = e.target.value; renderSide(); });
if (pendingNotice) { view = 'settings'; setg.msg = [pendingNotice, 'ok']; pendingNotice = null; }
if (HB) HB.settings.get().then(r => { const m = r.ok && r.settings.remind; if (m && m.due && Object.keys(db.rs || {}).length) note((m.days == null ? 'Chưa sao lưu toàn bộ dữ liệu lần nào' : 'Đã ' + m.days + ' ngày chưa sao lưu toàn bộ dữ liệu') + '. Nên sao lưu: ⋯ Thêm → Sao lưu toàn bộ dữ liệu (đổi mức nhắc ở Cài đặt hệ thống).', 'warn'); }).catch(() => {});
render();
