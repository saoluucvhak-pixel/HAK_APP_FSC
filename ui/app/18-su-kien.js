/* ========== Sự kiện ========== */
document.addEventListener('click', async e => {
  const t = e.target;
  const skp = t.closest('[data-skinpick]'); if (skp) { setSkin(skp.dataset.skinpick); return; }
  const muc = t.closest('[data-muc-lo]');
  if (muc) {
    mucLoDaMo.set(mucLoKey(muc.dataset.loNhom), muc.dataset.mucLo);
    render();
    document.querySelector('.mucNav [aria-current="page"]')?.focus({preventScroll: true});
    return;
  }
  const dsh = t.closest('[data-dash]'); if (dsh) { const [oid, fid] = dsh.dataset.dash.split('|'); openRs(oid); return openForest(fid); }
  const open = t.closest('[data-open]'); if (open) return openRs(open.dataset.open);
  const of = t.closest('[data-forest]'); if (of) { NAV.curDoi = null; NAV.curHd = null; return openForest(of.dataset.forest); }
  const sf = t.closest('[data-sforest]'); if (sf) return openForest(sf.dataset.sforest);
  const tb = t.closest('[data-tab]'); if (tb) { NAV.tab = tb.dataset.tab; return render(); }
  const ftb = t.closest('[data-ftab]'); if (ftb) { NAV.ftab = ftb.dataset.ftab; return render(); }
  const xtb = t.closest('[data-xtab]'); if (xtb) { NAV.xtab = xtb.dataset.xtab; return render(); }
  const el = t.closest('[data-act]'); if (!el) return;
  const act = el.dataset.act;
  if (act === 'newRs') return newRs(), render();
  if (act === 'delRs') return delRs(), render();
  if (act === 'newForest') return newForest(), render();
  if (act === 'delForest') return delForest(), render();
  if (act === 'chonDoi') { hdMoDat('nc', el.dataset.doi); return render(); }   // 3.0: mở trang chi tiết hợp đồng nhân công của đội
  if (act === 'hdQuayLai') { hdMoDat(el.dataset.kind, null); return render(); }
  if (act === 'ncTatCa') { NAV.ncTatCa = true; return render(); }
  if (act === 'ncTheoDoi') { NAV.ncTatCa = false; return render(); }
  if (act === 'chonHd') { hdMoDat('dx', el.dataset.hd); return render(); }   // 3.0: mở trang chi tiết hợp đồng vận chuyển
  if (act === 'themHd') return themHd();
  if (act === 'pcGanLoat') return pcGanLoat();
  if (act === 'xoaHd') return xoaHd();
  if (act === 'hdCapNhatDv') return hdCapNhatDv();
  if (act === 'suaDv') { const d = HAKDanhMuc.timDoiTac(db.dmDoiTac || [], el.dataset.dv), fm = document.getElementById('dvForm'); if (d && fm) { fm.outerHTML = dvForm(d); const nf = document.getElementById('dvForm'); if (nf) { nf.scrollIntoView({block: 'nearest'});
  const i0 = nf.querySelector('[name=ten]'); if (i0) i0.focus(); } } return; }
  if (act === 'themDoi') return themDoi();
  if (act === 'xoaDoi') return xoaDoi();
  if (act === 'addGiay') return addGiayRow();
  if (act === 'openSettings') { NAV.cur = null; NAV.curF = null; NAV.view = 'settings'; setg.msg = null; return render(); }
  if (act === 'dataRetry') return issueAct('retry');
  if (act === 'dataPick') return issueAct('pick');
  if (act === 'dataDefault') return issueAct('default');
  if (act === 'setData' || act === 'setDataDefault') return settingsData(act === 'setDataDefault');
  if (act === 'setBackup2' || act === 'setBackup2Off') return settingsBackup2(act === 'setBackup2Off');
  if (act === 'setBackup' || act === 'setBackupDefault') return settingsBackup(act === 'setBackupDefault');
  if (act === 'setBackupJson' || act === 'setBackupJsonDefault') return settingsBackupJson(act === 'setBackupJsonDefault');
  if (act === 'setOpenBackup') return HB.settings.openBackup();
  if (act === 'setOpenBackupJson') return HB.settings.openBackupJson();
  if (act === 'restorePick') return kslRestorePick();
  if (act === 'setOpenData') return HB.openDataFolder();
  if (act === 'napHoanTac') return nhatKyNapHoanTac(el.dataset.kind);
  if (act === 'tkOpen') return tkMo();
  if (act === 'svbDien') return svbDien();
  if (act === 'danMo') return danMo(el.dataset.kind);
  if (act === 'danHuy') return $('#impBox').classList.remove('on');
  if (act === 'danNap') return danNap();
  if (act === 'chiXemTai') return chiXemTai();
  if (act === 'inTomTat') return inTomTat();
  if (act === 'inBaoCao') return inBaoCao();
  if (act === 'inTronBoPdf') return typeof inTronBoPdfMo === 'function' ? inTronBoPdfMo(curRec()) : note('Chức năng đang khởi tạo.', 'warn');
  if (act === 'phuLucKyLai') return phuLucKyLai();
  if (act === 'hdAn') { hdDat(true); return render(); }
  if (act === 'hdHien') { hdDat(false); NAV.cur = null; NAV.curF = null; NAV.view = 'bld'; return render(); }   // 3.5.1: hướng dẫn 6 bước nằm ở Bàn làm việc
  if (act === 'hdDi') return hdDi(el.dataset.buoc);
  if (act === 'svbGiuSo') return svbGiuSo(el.dataset.hd);
  if (act === 'vclMo') { const [oid, fid, ft] = (el.dataset.vcl || '').split('|'); if (db.rs[oid]) { NAV.cur = oid; NAV.curF = fid; NAV.tab = 'rung'; NAV.ftab = ft || 'xuat'; NAV.view = 'owner'; render(); } return; }
  if (act === 'luongLay') return luongLayDonGia();
  if (act === 'loTuLoCu') return loTuLoCuTao();
  if (act === 'dmCapNhatLo') return dmCapNhatLo(el.dataset.kind);
  if (act === 'dmChonNhieu') return dmChonNhieuMo(el.dataset.kind);
  if (act === 'dmChonNhieuLuu') return dmChonNhieuLuu();
  if (act === 'dmHopThem') return dmHopXuLy(true);
  if (act === 'dmHopLo') return dmHopXuLy(false);
  if (act === 'dmPickAll') {
    document.querySelectorAll('#dlgBox [data-dmpick]:not(:disabled)').forEach(cb => { cb.checked = true; dmPickState.sel.add(+cb.dataset.dmpick); });
    const cnt = document.getElementById('dmPickCount'); if (cnt) cnt.textContent = String(dmPickState.sel.size);
    const btn = document.querySelector('#dlgBox [data-act=dmChonNhieuLuu]'); if (btn) btn.disabled = !dmPickState.sel.size;
    return;
  }
  if (act === 'openDm' || act === 'openSetDt') { NAV.cur = null; NAV.curF = null; NAV.view = 'setdt'; cd.msg = null; return render(); }
  if (act === 'openSetXe') { NAV.cur = null; NAV.curF = null; NAV.view = 'setxe'; cd.msg = null; return render(); }
  if (act === 'openSetVt') { NAV.cur = null; NAV.curF = null; NAV.view = 'setvt'; cd.vtMsg = null; return render(); }
  if (act === 'openSetNv') { NAV.cur = null; NAV.curF = null; NAV.view = 'setnv'; cd.nvMsg = null; return render(); }
  if (act === 'openSetGd') { NAV.cur = null; NAV.curF = null; NAV.view = 'setgd'; return render(); }
  if (act === 'openSetHd') { NAV.cur = null; NAV.curF = null; NAV.view = 'sethd'; return render(); }
  if (act === 'openSetCan') { NAV.cur = null; NAV.curF = null; NAV.view = 'setcan'; return render(); }
  if (act === 'openNorm') { NAV.view = 'norm'; return render(); }
  if (act === 'bhldSua' || (el.dataset && el.dataset.bhldsua)) { normBhldSua = el.dataset.bhldsua || el.dataset.pos; return render(); }
  if (act === 'bhldHuyModal') { normBhldSua = null; return render(); }
  if (/^(normMoThem|normMoSua|normMoHuy|normXoa|dbLuuMd)$/.test(act)) return normMoAction(act, el);
  if (/^norm(AddVer|DelVer|AddPos|DelPos)$/.test(act)) return normAction(act, el);
  if (/^(fillTu|fillDen|boKlCu|dmDefault|tgDefault|fillDenDk)$/.test(act)) return forestFill(act, el);
  if (/^cc(Fill|Clear|Print)$/.test(act)) { if (act === 'ccPrint' && stBlockNote()) return; return ccAct(act); }
  if (act === 'issWarn') { issWarnMo = !issWarnMo; return render(); }
  if (/^st(Add|AddXe|Edit|Del|Restore|Pend|Save|Discard|Close|Go)$/.test(act)) return stAct(act, el);
  if (act === 'pcPrint') {
    if (!curRec() || stBlockNote()) return;
    pcInLoc = {hd: el.dataset.hd || ''};
    NAV.ftab = 'inpc';
    return render();
  }
  if (act === 'dbVerAdd') { const r = HAKDinhBien.addVersion(db, (document.getElementById('dbVerNew') || {}).value); if (!r.ok) return note('Chưa thêm phiên bản: ' + r.error, 'err'); dbVer = r.id; persist();
  return note('Đã thêm phiên bản hiệu lực từ ' + r.id + ' (sao chép từ phiên bản đang hiệu lực tại ngày đó). Sửa số người, nhiệm vụ rồi Lưu.', 'ok'); }
  if (act === 'dbVerDel') { if (!confirm('Xóa phiên bản này? Các lô bắt đầu từ ngày này sẽ dùng phiên bản trước đó.')) return; HAKDinhBien.delVersion(db, dbVer); dbVer = ''; persist(); return note('Đã xóa phiên bản.', 'ok'); }
  if (act === 'dbReset' && HAKDinhBien.versions(db).length > 1) return note('Đã có nhiều phiên bản theo ngày: xóa các phiên bản có ngày trước khi dùng định mức mặc định.', 'warn');
  if (act === 'dbReset') { delete db.dinhBien; persist(); note('Đã quay về định mức nhân công mặc định (chưa lưu thành định mức riêng; bấm Lưu để dùng).', 'warn'); return render(); }
  if (act === 'delGiay') return el.closest('.giayRow').remove();
  if (act === 'pcFixDate') {   // sửa ngày phiếu cũ bị sai: chỉ nhận ngày có thật; giữ nguyên mọi dữ liệu khác của phiếu
    const f = curForest(), row = el.dataset.row, r = f && (f.pc || []).find(x => String(x._row) === String(row)), inp = document.querySelector('[data-pcfix="' + row + '"]');
    if (!r || !inp) return;
    const v = trim(inp.value);
    if (!HAKDates.isValid(v)) { note('Chưa sửa phiếu ' + (r.soPhieu || '(không số)') + ': ' + HAKDates.why(v) + '.', 'err'); return; }
    const p = HAKDates.parse(v); r.ngay = HAKDates.format(p); persistLo(); note('Đã sửa ngày cân của phiếu ' + (r.soPhieu || '(không số)') + ' thành ' + r.ngay + '.', 'ok'); return render();
  }
  if (act === 'openCty') { NAV.cur = null; NAV.curF = null; NAV.view = 'cty'; cty.edit = null; cty.msg = null; return render(); }
  if (act === 'openSetGs') { NAV.cur = null; NAV.curF = null; NAV.view = 'setgs'; setgs.msg = null; setgs.st = HB ? await HB.lookup.status() : null; return render(); }
  if (act === 'openSetBk') { NAV.cur = null; NAV.curF = null; NAV.view = 'setbk'; ksl.msg = null; return render(); }
  if (act === 'kslTai') { ksl.msg = null; ksl.kiem = {}; return render(); }
  if (act === 'kslKiem') return kslKiem(el);
  if (act === 'kslAuto') return kslAuto();
  if (act === 'kslXoa') return kslXoa(el);
  if (act === 'kslKhoiPhuc') return kslKhoiPhuc(el);
  if (act === 'kslGo') return kslGo();
  if (act === 'kslHuy') { window.__ksl = null; return $('#impBox').classList.remove('on'); }
  if (act === 'openSetFmt') { NAV.cur = null; NAV.curF = null; NAV.view = 'setfmt'; return render(); }
  if (act === 'setGsChatLuong') { setgs.cl = HB && HB.lookup.chatLuong ? await HB.lookup.chatLuong().catch(er => ({ok: false, error: (er && er.message) || String(er)})) : {ok: false, error: 'Chỉ có ở bản cài trên Windows.'}; return render(); }
  if (act === 'setGsCLCopy') { const t = setgs.cl && setgs.cl.ok ? setgs.cl.bang : ''; let ok = false; try { await navigator.clipboard.writeText(t); ok = true; } catch (er) { const pre = $('#setGsCLBang'); if (pre) { const r = document.createRange(); r.selectNodeContents(pre); const s = getSelection(); s.removeAllRanges(); s.addRange(r); try { ok = document.execCommand('copy'); } catch (e2) { ok = false; } } } pushNote(ok ? 'Đã sao chép bảng số đếm.' : 'Không sao chép được: bôi đen bảng rồi nhấn Ctrl+C.', ok ? 'ok' : 'warn'); return render(); }
  if (act === 'setGsSave') { const r = await HB.lookup.setSheet(($('#setGsLink') || {}).value.trim()); setgs.msg = r.ok ? {kind: 'ok', text: 'Đã lưu địa chỉ bảng tính.'} : {kind: 'err', text: r.error}; setgs.st = await HB.lookup.status(); return render(); }
  if (act === 'setNumStyle') { db.dinhDangSo = el.value === 'en' ? 'en' : 'vi'; persist(); return render(); }
  if (act === 'ctyAddAddr') { const c = ctyReadForm(); c.diaChiGiao.push({id: newId('a'), nhan: '', diaChi: ''}); cty.edit = c; render(); const rows = document.querySelectorAll('.ctyAddr [name=a_nhan]'); if (rows.length) rows[rows.length - 1].focus(); return; }
  if (act === 'ctyDelAddr') { el.closest('.ctyAddr').remove(); ctyShowMsg(); return; }
  if (act === 'mhOpen') { const f = curForest(), m = f && f.info.muaHang; mh.open = true; mh.addrId = m ? m.diaChiId : ''; return render(); }
  if (act === 'mhCancel') { mh.open = false; return render(); }
  if (act === 'mhConfirm') {
    const f = curForest(), snap = mhSnapshotNow(); if (!f || !snap) return;
    f.info = Object.assign({}, f.info, {muaHang: snap}); mh.open = false;
    const r = await luuLo();   // nút Xác nhận của khung = lưu cả lô; chỉ báo đã lưu khi luuLo() thành công (lô 9a, T-19)
    mh.msg = r && r.ok
      ? {kind: 'ok', text: 'Đã lưu công ty mua hàng và địa điểm vận chuyển đến cho rừng này: ' + snap.ten + ' – ' + snap.diaChi + '.'}
      : {kind: 'err', text: 'Đã chọn nhưng CHƯA lưu công ty mua hàng: ' + ((r && r.error) || 'lỗi lưu dữ liệu')};
    return render();
  }
  if (act === 'stepSave' || act === 'stepNext') {
    if (document.activeElement && /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName)) document.activeElement.blur();
    const f = curForest(), st = stCur();
    const dirty = !!(f && (loDirty.has(f.id) || (st && HAKStage.dirty(st))));
    if (f && !loKhoa(f) && (dirty || act === 'stepSave')) {
      const r = await luuLo();
      if (r && r.ok === false) return render();
    }
    if (act === 'stepNext') {
      if (el.dataset.nextMuc && el.dataset.loNhom) mucLoDaMo.set(mucLoKey(el.dataset.loNhom), el.dataset.nextMuc);
      else if (el.dataset.nextFtab) NAV.ftab = el.dataset.nextFtab;
    }
    return render();
  }
  if (act === 'guide') return document.getElementById('guideBox').classList.add('on');
  if (act === 'goHome') { NAV.cur = null; NAV.curF = null; NAV.view = 'owner'; return render(); }
  if (act === 'guideBg') return t === el && el.classList.remove('on');
  if (act === 'guideClose') return document.getElementById('guideBox').classList.remove('on');
  if (act === 'theme') {
    const dark = document.documentElement.dataset.theme === 'dark' || (!document.documentElement.dataset.theme && matchMedia('(prefers-color-scheme:dark)').matches);
    setTheme(dark ? 'light' : 'dark'); return;
  }
  if (act === 'backup') return backupAll();
  if (act === 'backupSaveAs') return backupSaveAs();
  if (act === 'ktGo') {
    const go = JSON.parse(el.dataset.go || '{}');
    if (go.view) { NAV.view = go.view; return render(); }
    if (go.tab) { NAV.tab = go.tab; return render(); }
    NAV.ftab = go.focus === 'mua' ? 'finfo' : go.ftab || 'finfo';
    if (go.focus === 'mua') mucLoDaMo.set(mucLoKey('finfo'), 'giaohang');
    if (NAV.ftab === 'finfo' && go.muc) mucLoDaMo.set(mucLoKey('finfo'), go.muc);
    if (NAV.ftab === 'dx' && go.focus === 'pc') {
      const hd = curForest()?.hdvc || [];
      hdMoDat('dx', hd.find(h => h.id === go.hdId)?.id || hdMo('dx') || hd[0]?.id || null);
      mucLoDaMo.set(mucLoKey('dx'), 'phieu');
      if (Number.isInteger(go.pcIndex)) pcTatCa = true;
    }
    render();
    const edit = Number.isInteger(go.pcIndex) && document.querySelector('#stTbl_pc [data-act=stEdit][data-i="' + go.pcIndex + '"]');
    const tgt = go.focus === 'pc' ? (edit?.closest?.('tr') || document.getElementById('stTbl_pc') || document.getElementById('pcDs')) : go.focus === 'mua' ? document.getElementById('mhDiemDen') : null;
    if (tgt?.scrollIntoView) tgt.scrollIntoView({block: 'center'});
    if (edit) edit.focus({preventScroll: true});
    return;
  }
  if (act === 'lotBackup') return lotBackup();
  if (act === 'lotRestore') return lotRestoreOpen();
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
    persistLo(); note('Đã xóa dữ liệu (chưa lưu: bấm “Lưu dữ liệu vào lô” để ghi, “Bỏ thay đổi” để hoàn lại).'); return;
  }
  if (/^chot(Lo|MoKhoa|LuuTru|BoLuuTru|Dung|MoLai)$/.test(act)) return chotAct(act);
  if (act === 'qtKy' || act === 'qtHuyKy') { qtKyAct((el.dataset.codes || '').split(',').filter(Boolean), act === 'qtKy'); return render(); }
  if (act === 'qtMark' || act === 'qtUnmark') { qtMarkAct((el.dataset.codes || '').split(',').filter(Boolean), act === 'qtMark'); return render(); }
  if ((act === 'd2dl' || act === 'd2confirm' || act === 'd2legacy' || act === 'd2undo') && stBlockNote()) return;
  if (act === 'd2dl' || act === 'd2confirm' || act === 'd2legacy' || act === 'd2undo') { const dt = el.closest('details.d2more'); if (dt) dt.open = false; }
  if (act === 'd2dl') {
    let keys = (el.dataset.keys || '').split('|').filter(Boolean); const mode = el.dataset.mode;
    try {
      if (mode === 'de') {   // nền in từ trước: bắt buộc đối chiếu trước khi in đè
        const f = curForest(), st = HAKInAn2.stateOf(f), pend = keys.filter(k => st.items[k] && st.items[k].legacy && !st.items[k].crossChecked);
        if (pend.length) {
          if (confirm('Có ' + pend.length + ' tờ nền in từ trước, chưa biết bố cục.\n\nĐối chiếu tờ nền đã in với mẫu hiện tại: khổ giấy, hướng giấy, lề, chữ cố định (tên, địa chỉ, số hợp đồng), số dòng bảng. Nếu khớp, bấm OK để in đè; nếu không, bấm Hủy rồi in lại mẫu nền hoặc in đầy đủ trên giấy trắng.\n\nBạn đã đối chiếu và thấy khớp?')) {
          pend.forEach(k => HAKInAn2.crossChecked(st, k, new Date().toISOString())); persist(); render(); }
          else keys = keys.filter(k => !pend.includes(k));
        }
      }
      if (!keys.length) { note('Không có mẫu nào để tải.', 'warn'); return; }
      await chuaGanTrong(() => exportDot2(mode, keys));
    } catch (err) { note('Lỗi khi tạo file: ' + err.message, 'err'); }
    return;
  }
  if (act === 'd2confirm') { d2Confirm((el.dataset.keys || '').split('|').filter(Boolean), false); note('Đã ghi nhận đã in mẫu nền.', 'ok'); return render(); }
  if (act === 'd2legacy') { d2Confirm((el.dataset.keys || '').split('|').filter(Boolean), true); note('Đã ghi nhận có tờ nền in từ trước; sẽ hỏi đối chiếu trước khi in đè.', 'ok'); return render(); }
  if (act === 'd2undo') { const f = curForest(), st = HAKInAn2.stateOf(f); (el.dataset.keys || '').split('|').filter(Boolean).forEach(k => HAKInAn2.unconfirm(st, k)); persist(); note('Đã bỏ xác nhận in nền.', 'ok'); return render(); }
  if (act === 'dl') {
    const idx = el.dataset.idx != null ? Number(el.dataset.idx) : null;
    try { await chuaGanTrong(() => exportKind(el.dataset.kind, idx)); }
    catch (err) { note('Lỗi khi tạo file: ' + err.message, 'err'); }
    return;
  }
});

/* MỘT cách lưu cho lô: sửa một ô ở khung nào thì thay đổi vào BẢN NHÁP của lô (hiện thanh “Chưa lưu”); khung không còn nút Lưu riêng. Enter trong ô hoặc nút “Lưu dữ liệu vào lô” mới ghi SQLite. */
document.addEventListener('keydown', e => {
  const nav = e.target.closest?.('.mucNav');
  if (nav && ['ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
    const buttons = [...nav.querySelectorAll('button')];
    const step = ['ArrowDown', 'ArrowRight'].includes(e.key) ? 1 : -1;
    e.preventDefault();
    buttons[(buttons.indexOf(e.target) + step + buttons.length) % buttons.length]?.focus();
  }
  if (e.key !== 'Escape' || e.defaultPrevented || !nav) return;
  const back = document.getElementById('hdQuayLai');
  if (back) { e.preventDefault(); back.click(); }
});
const KHUNG_LO = {forestForm: 'saveForest', luongForm: 'saveLuong', vcForm: 'saveVc', giayForm: 'saveGiay', doiForm: 'saveDoi', hdForm: 'saveHd', hdVbForm: 'saveHdVb'};
document.addEventListener('change', e => {
  const t = e.target, fm = t && t.form; if (!fm || !KHUNG_LO[fm.id] || t.id === 'xeDm' || t.id === 'ncDm' || t.id === 'xeChuDm' || t.id === 'xeTxDm') return;
  const fn = {saveForest, saveLuong, saveVc, saveGiay, saveDoi, saveHd, saveHdVb}[KHUNG_LO[fm.id]]; if (!fn) return;
  const f = curForest(), truoc = f ? JSON.stringify(f) : '';
  nhapKhung = {can: false};
  try { fn(fm, true); } finally { const can = nhapKhung.can; nhapKhung = null; if (can && f && JSON.stringify(f) !== truoc) persistLo(f); }
});
document.addEventListener('change', e => {
  const input = e.target;
  if (input.form?.id !== 'pcInLoc') return;
  pcInLoc = Object.fromEntries(new FormData(input.form));
  if (input.name === 'hd') pcInLoc.xe = '';
  render();
});
document.addEventListener('submit', e => {
  if (e.target.id === 'infoForm') { e.preventDefault(); saveInfo(e.target); }
  if (e.target.id === 'forestForm') { e.preventDefault(); saveForest(e.target); }
  if (e.target.id === 'luongForm') { e.preventDefault(); saveLuong(e.target); }
  if (e.target.id === 'doiForm') { e.preventDefault(); saveDoi(e.target); }
  if (e.target.id === 'hdForm') { e.preventDefault(); saveHd(e.target); }
  if (e.target.id === 'hdVbForm') { e.preventDefault(); saveHdVb(e.target); }
  if (e.target.id === 'dvForm') { e.preventDefault(); saveDv(e.target); }
  if (e.target.id === 'stForm') { e.preventDefault(); stFinishRow(); }
  if (e.target.id === 'vcForm') { e.preventDefault(); saveVc(e.target); }
  if (e.target.id === 'giayForm') { e.preventDefault(); saveGiay(e.target); }
  if (e.target.id === 'normForm') { e.preventDefault(); saveNorm(e.target); }
  if (e.target.id === 'bhldForm') { e.preventDefault(); saveBhldPos(e.target); }
  if (/^(keo|tg|db)MoForm$/.test(e.target.id)) { e.preventDefault(); normMoLuu(e.target); }
});

document.addEventListener('change', e => {
  const t = e.target;
  if (t.id === 'normVer') { normSel = t.value; normBhldSua = null; return render(); }
  if (t.dataset && t.dataset.pcdoi) { const f = curForest(); if (!f) return; const r = HAKModel.assignPc(f, [Number(t.dataset.pcdoi)], t.value); if (r.error) return note(r.error, 'err'); f.pc = r.f.pc; persistLo(); render(); return; }
  if (t.dataset && t.dataset.xehd) { const f = curForest(); if (!f) return; const r = HAKModel.moveXe(f, [Number(t.dataset.xehd)], t.value); if (r.error) return note(r.error, 'err'); Object.assign(f, {hdvc: r.f.hdvc, dx: r.f.dx}); persistLo(); render(); return; }
  if (t.id === 'dbVerSel') { dbVer = t.value; return render(); }
  if (t.id === 'infoDm') {   // phiếu #09 (ND-08): chọn chủ rừng từ Danh mục đối tượng → điền sẵn các ô (chưa lưu; bấm “Lưu thông tin”)
    const fm = t.form, c = t.value ? HAKDoiTuong.chupChuRung(db.dmDoiTuong || [], t.value) : null; if (!fm) return;
    if (c) ['danhXung', 'ten', 'cccd', 'ngayCap', 'noiCap', 'diaChi', 'sdt'].forEach(k => { const el = fm.elements[k]; if (el && (c[k] || k !== 'sdt')) el.value = c[k]; });
    if (fm.elements.nguoiDmId) fm.elements.nguoiDmId.value = c ? c.nguoiDmId : '';
    return;
  }
  if (t.id === 'ncDm' && t.value) { const x = dmNguonLd().find(z => HAKModel.cccdSo(z.cccd) === t.value); if (x) { stRead(); dmDienNguoi(x); stRender(); } return; }
  if (t.id === 'xeChuDm' && t.value) { stRead(); dxDienChu(t.value); stRender(); return; }
  if (t.id === 'xeTxDm' && t.value) { stRead(); dxDienTx(t.value); stm.vals.taiXeId = t.value; stRender(); return; }
  if (t.id === 'xeDm' && t.value) { const x = dmNguonXe().find(z => HAKStage.bienKey(z.bienSo) === t.value); if (x) { stRead(); dmDienXe(x); stRender(); } return; }
  if (t.dataset && t.dataset.ncdoi) { const f = curForest(); if (!f) return; const i = Number(t.dataset.ncdoi); if (!(f.nc || [])[i]) return; const r = HAKModel.moveMembers(f, [i], t.value); if (r.error) return note(r.error, 'err'); f.nc = r.f.nc; persistLo(); render(); return; }
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
    const k = t.dataset.exp, dt = HAKModel.DOI_EXP.includes(k) ? curTeam(f) : null, cu = dt ? ((dt.exp || {})[k] ?? '') : (f.exp[k] ?? '');
    if (String(cu) === trim(t.value)) return;   // không đổi (ví dụ ô mất tiêu điểm sau khi đã lưu): không đánh dấu chưa lưu
    const rest = ghiDoi(f, {[t.dataset.exp]: trim(t.value)}, 'exp');   // số văn bản của đội (HĐ giao khoán, ủy quyền, nghiệm thu, kỳ thanh toán) ghi vào đội
    Object.assign(f.exp, rest);
    persistLo(f);
  }
});

const SKINS = [
  ['luxe', 'Luxe — navy, champagne, ngà (mặc định)', ['#1d3a63', '#b8903f', '#f5f2ec']],
  ['classic', 'Classic — xanh ngọc (teal)', ['#0e7c86', '#0f2740', '#f3f6fa']],
  ['neutral', 'Neutral — xám xanh doanh nghiệp', ['#35475a', '#a8812f', '#f3f5f7']],
  ['champagne', 'Champagne — vàng ấm', ['#85601a', '#2b2411', '#faf6ec']],
  ['ocean', 'Ocean — xanh dương hiện đại (Executive Blue)', ['#1e40af', '#2563eb', '#f8fafc']]];
function setSkin(k) {
  if (!SKINS.some(x => x[0] === k)) k = 'luxe';
  document.documentElement.dataset.skin = k;
  try { localStorage.setItem('hskt.skin', k); } catch (e) {}
  const sq = document.getElementById('skinQuick'); if (sq) sq.value = k;
  const box = document.getElementById('skinPick');
  if (box) box.innerHTML = '<b>Bảng màu</b>' + SKINS.map(([id, label, c]) => '<button class="skinbtn' + (id === k ? ' on' : '') + '" data-skinpick="' + id + '" aria-pressed="' + (id === k) + '"><span class="sw">' + c.map(x => '<i style="background:' + x + '"></i>').join('') + '</span>' +
  esc(label) + '</button>').join('');
}
let savedSkin = null;
try { savedSkin = localStorage.getItem('hskt.skin'); } catch (e) {}
setSkin(savedSkin);
function setTheme(t) {
  document.documentElement.dataset.theme = t;
  try { localStorage.setItem('hskt.theme', t); } catch (e) {}
  ['themeBtn', 'themeBtn2'].forEach(id => { const b = document.getElementById(id); if (b) b.textContent = id === 'themeBtn' ? (t === 'dark' ? '☀ Sáng' : '🌙 Tối') : (t === 'dark' ? 'Chế độ sáng' : 'Chế độ tối'); });
}
let savedTheme = null;
try { savedTheme = localStorage.getItem('hskt.theme'); } catch (e) {}
if (savedTheme === 'dark' || savedTheme === 'light') setTheme(savedTheme);
else if (matchMedia('(prefers-color-scheme:dark)').matches) setTheme('dark');
document.addEventListener('change', e => { if (e.target && e.target.id === 'skinQuick') setSkin(e.target.value); });
document.addEventListener('change', e => { if (e.target && e.target.id === 'normVer') { normSel = e.target.value; render(); } });
document.addEventListener('input', e => {
  const t = e.target;
  if (!e.isComposing && t.dataset?.groupNumber !== undefined) {
    const raw = t.value, pos = t.selectionStart, separator = numStyle === 'en' ? ',' : '.';
    // Bỏ dấu nhóm do ứng dụng chèn khi chỉnh tiếp giá trị đã định dạng.
    const tracked = t.dataset.groupedValue;
    const regroup = tracked !== undefined && tracked.includes(separator) && !e.inputType?.includes('Paste');
    const source = regroup ? raw.split(separator).join('') : raw;
    const value = HAKSo.groupInput(source, numStyle, t.dataset.groupNumber === 'integer');
    if (raw !== value) {
      let remaining = raw.slice(0, pos).split(separator).join('').length, caret = 0;
      while (remaining && caret < value.length) if (value[caret++] !== separator) remaining--;
      t.value = value;
      t.setSelectionRange(caret, caret);
    }
    if (regroup || raw !== value) t.dataset.groupedValue = value;
  }
  if (t.dataset && t.dataset.mamoi !== undefined) { impMaCheck(); return; }
  if (t.dataset && t.dataset.exp && curForest()) {   // xem trước số hợp đồng cập nhật ngay khi gõ
    const rec = curRec(), exo = Object.assign({}, rec.exp, rec.doi && rec.doi.length > 1 ? (curTeam() || {}).exp : {}, {[t.dataset.exp]: trim(t.value)});
    const a = document.getElementById('soPreviewHd'), b = document.getElementById('soPreviewVc');
    if (a) a.innerHTML = soPreviewHtml(rec, exo, 'hd'); if (b) b.innerHTML = soPreviewHtml(rec, exo, 'vc');
  }
  if (t.form && t.form.id === 'forestForm' && ['dienTich', 'dinhMucNgayHa', 'tuNgay', 'denNgay', 'dinhMucTanHa', 'soDoi'].includes(t.name)) {
    { const sn = document.getElementById('soDoiNote'); if (sn) sn.innerHTML = soDoiNote(readForest(t.form), (curForest() || {}).nc); }   // thời gian khai thác dự kiến và ngày kết thúc hiện ngay khi gõ
    const nt = document.getElementById('tgNote'); if (nt) nt.innerHTML = tgDuKienHtml(readForest(t.form), (curForest() || {}).pc, nDoiOf(readForest(t.form), (curForest() || {}).nc));
  }
  if (t.form && t.form.id === 'forestForm' && (t.name === 'dienTich' || t.name === 'dinhMucTanHa')) {   // sản lượng dự kiến tự nhảy ngay khi gõ, không cần bấm Lưu
    const dt = readInputNumber(t.form.elements.dienTich.value); let dm = readInputNumber(t.form.elements.dinhMucTanHa.value), out = document.getElementById('slDuKien');
    if (dm == null) { const k = HAKDinhMuc.keoPick(db, readInputDate(t.form.elements.tuNgay.value)); dm = k.found ? k.item.tanHa : null; }   // để trống: định mức mặc định
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
document.getElementById('sideSf').addEventListener('change', e => { const t = e.target; if (t && t.dataset && t.dataset.sbsf) { sideSfSet(t.dataset.sbsf, t.value); renderSide(); } });
document.getElementById('sideSfXoa').addEventListener('click', () => { sideQ = ''; document.getElementById('sideQ').value = ''; sideSfState().reset(); renderSide(); });
if (pendingNotice) { NAV.view = 'settings'; setg.msg = [pendingNotice, 'ok']; pendingNotice = null; }
if (HB) HB.settings.get().then(r => { const m = r.ok && r.settings.remind;
if (m && m.due && Object.keys(db.rs || {}).length) note((m.days == null ? 'Chưa sao lưu toàn bộ dữ liệu lần nào' : 'Đã ' + m.days + ' ngày chưa sao lưu toàn bộ dữ liệu') + '. Nên sao lưu: Cài đặt → Sao lưu và khôi phục → Sao lưu toàn bộ dữ liệu (đổi mức nhắc ở Cài đặt hệ thống).', 'warn'); }).catch(() => {});
render();
/* hộp “Thêm vào danh mục để dùng lại?” (sau khi lưu lô có người / xe mới): Esc = Chỉ lưu trong lô (chạy trước bộ xử lý Esc chung của #dlgBox) */
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && normMo) { e.preventDefault(); normMoDong(); return render(); }
  if (e.key === 'Escape' && normBhldSua) { e.preventDefault(); normBhldSua = null; return render(); }
  if (e.key !== 'Escape' || !document.querySelector('#dlgBox.on #dmHopDlg')) return;
  e.preventDefault(); e.stopImmediatePropagation(); dmHopXuLy(false);
}, true);

document.addEventListener('change', e => {
  if (e.target.dataset?.act !== 'setReportDateStyle') return;
  db.dinhDangNgayBaoCao = e.target.value === 'iso' ? 'iso' : 'vi';
  persist();
  render();
});
