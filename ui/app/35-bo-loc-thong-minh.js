/* ========== Bộ lọc thông minh HAK_SMART_FILTER cho các màn hình bảng ==========
 * Dùng trực tiếp HAKSmartFilter & HAKCore.sf (ui/vendor/hak-smart-filter/):
 *   - Thanh lọc nhanh + nút Bộ lọc nâng cao (chọn nhiều, khoảng ngày, lưu/mở bộ lọc mẫu presets)
 *   - Hàng chip điều kiện đang áp dụng (bấm × để gỡ từng điều kiện) + tóm tắt kết quả */
const hakSfInstances = {};
let hakSfPresetStore = null;
function hakSfPresets() {
  if (!hakSfPresetStore) {
    let st = null;
    try { st = typeof localStorage !== 'undefined' ? localStorage : null; } catch (_) {}
    hakSfPresetStore = HAKCore.sf.presets(st);
  }
  return hakSfPresetStore;
}
function hakSfGet(screenId, cfg) {
  if (!hakSfInstances[screenId]) {
    hakSfInstances[screenId] = {cfg, filter: HAKSmartFilter.createFilter(cfg)};
  } else {
    hakSfInstances[screenId].cfg = cfg;
  }
  return hakSfInstances[screenId];
}
/* bộ lọc của bảng nhập liệu gắn với MỘT lô: đổi lô / chủ rừng thì bộ lọc về mặc định (không để bộ lọc của lô trước che dữ liệu lô sau) */
const hakSfLoKey = () => (typeof NAV !== 'undefined' && NAV ? (NAV.cur || '') + '|' + (NAV.curF || '') : '');
function hakSfApply(screenId, cfg, rows, ctx) {
  const inst = hakSfGet(screenId, cfg), lo = /^lo_/.test(screenId) ? hakSfLoKey() : null;
  if (lo !== null && inst.lo !== undefined && inst.lo !== lo) inst.filter.reset();
  if (lo !== null) inst.lo = lo;
  return inst.filter.filter(rows, ctx);
}
/* bảng nhập liệu đang có điều kiện lọc không (để nói đúng “không có dòng khớp bộ lọc” thay cho “chưa có dữ liệu”) */
const hakSfDangLoc = screenId => { const inst = hakSfInstances[screenId]; return !!(inst && HAKCore.sf.activeCount(inst.filter.getState())); };
function hakSfBarHtml(screenId, total, kept, extraHtml = '') {
  const inst = hakSfInstances[screenId]; if (!inst) return '';
  const {cfg, filter} = inst, state = filter.getState(), SF = HAKCore.sf;
  const conds = SF.conditions(cfg, state), n = SF.activeCount(state);
  const quick = (cfg.quickFields || []).map(k => {
    if (k === 'q') return '<input class="hak-sf-q" data-sfq="' + esc(screenId) + '" value="' + esc(state.q) + '" placeholder="' + esc(cfg.searchPlaceholder || 'Tìm nhanh (không dấu)…') + '" style="flex:1;min-width:190px">';
    const f = (cfg.fields || []).find(x => x.key === k); if (!f) return '';
    if (f.type === 'enum') {
      const val = SF.getField(state, f);
      const opts = (typeof f.options === 'function' ? f.options() : f.options || []).map(o => typeof o === 'string' ? {value: o, label: o} : o);
      return '<select data-sfquick="' + esc(screenId) + '" data-sfkey="' + esc(f.key) + '" aria-label="' + esc(f.label) + '">' +
        '<option value="">' + esc(f.label) + ': Tất cả</option>' +
        opts.map(o => '<option value="' + esc(o.value) + '"' + (String(o.value) === String(val) ? ' selected' : '') + '>' + esc(o.label) + '</option>').join('') +
        '</select>';
    }
    if (f.type === 'bool') {
      const on = !!SF.getField(state, f);
      return '<label class="hak-sf-chk"><input type="checkbox" data-sfquickbool="' + esc(screenId) + '" data-sfkey="' + esc(f.key) + '"' + (on ? ' checked' : '') + '> ' + esc(f.label) + '</label>';
    }
    return '';
  }).join('');
  const chips = conds.length ? '<div class="hak-sf-chips">' + conds.map((c, i) =>
    '<span class="hak-sf-chip">' + esc(c.text) + '<button type="button" data-sfrm="' + esc(screenId) + '" data-sfidx="' + i + '" title="Gỡ điều kiện này">✕</button></span>').join('') +
    '<button type="button" class="btn ghost sm" data-sfreset="' + esc(screenId) + '">Xóa tất cả lọc</button></div>' : '';
  return '<div class="hak-sf-bar" data-sfbar="' + esc(screenId) + '">' +
    '<div class="row" style="gap:8px;flex-wrap:wrap;align-items:center">' + quick +
      '<button type="button" class="btn ghost sm" data-sfopen="' + esc(screenId) + '">Bộ lọc nâng cao' + (n ? ' <span class="pill">' + n + '</span>' : '') + '</button>' +
      '<span class="mut" style="margin-left:auto;font-size:12.5px">Hiển thị <b>' + kept + '</b> / ' + total + (extraHtml ? ' · ' + extraHtml : '') + '</span>' +
    '</div>' + chips + '</div>';
}
let hakSfDraft = null;
function hakSfOpenDrawer(screenId) {
  const inst = hakSfInstances[screenId]; if (!inst) return;
  const s = inst.filter.getState();
  hakSfDraft = {screenId, state: s, rawTu: HAKCore.sf.fmtVN(s.tu), rawDen: HAKCore.sf.fmtVN(s.den), err: ''};
  hakSfRenderDrawer();
}
function hakSfSyncDraftText() {
  if (!hakSfDraft) return true;
  const SF = HAKCore.sf, s = hakSfDraft.state;
  const qEl = document.getElementById('sfDrQ'); if (qEl) s.q = qEl.value;
  const tuEl = document.getElementById('sfDrTu'), denEl = document.getElementById('sfDrDen');
  if (tuEl && denEl) {
    hakSfDraft.rawTu = tuEl.value; hakSfDraft.rawDen = denEl.value;
    const a = SF.parseVN(tuEl.value), b = SF.parseVN(denEl.value);
    if (a === null || b === null) { hakSfDraft.err = 'Ngày không hợp lệ — nhập dạng dd/mm/yyyy.'; return false; }
    hakSfDraft.state = SF.setDates(s, a, b);
  }
  return true;
}
function hakSfRenderDrawer(focusInfo) {
  if (!hakSfDraft) return;
  const inst = hakSfInstances[hakSfDraft.screenId]; if (!inst) return;
  const cfg = inst.cfg, SF = HAKCore.sf, s = hakSfDraft.state;
  const adv = cfg.advancedFields || cfg.fields.map(f => f.key);
  const blocks = adv.map(key => {
    if (key === 'q') return '<label><span>Từ khóa (không dấu)</span><input id="sfDrQ" value="' + esc(s.q) + '" placeholder="' + esc(cfg.searchPlaceholder || 'Nhập từ khóa…') + '"></label>';
    if (key === 'dates') {
      return '<div class="grid" style="grid-template-columns:1fr 1fr;gap:8px">' +
        '<label><span>Từ ngày (dd/mm/yyyy)</span><input id="sfDrTu" value="' + esc(hakSfDraft.rawTu != null ? hakSfDraft.rawTu : SF.fmtVN(s.tu)) + '" placeholder="dd/mm/yyyy"></label>' +
        '<label><span>Đến ngày (dd/mm/yyyy)</span><input id="sfDrDen" value="' + esc(hakSfDraft.rawDen != null ? hakSfDraft.rawDen : SF.fmtVN(s.den)) + '" placeholder="dd/mm/yyyy"></label></div>';
    }
    const f = (cfg.fields || []).find(x => x.key === key); if (!f) return '';
    if (f.type === 'multi') {
      const opts = (typeof f.options === 'function' ? f.options() : f.options || []).map(o => typeof o === 'string' ? {value: o, label: o} : {value: String(o.value), label: o.label});
      if (f.withNone) opts.unshift({value: SF.NONE, label: '(Không có)'});
      const sel = new Set(s.sel[f.key] || []);
      return '<div><div class="row" style="justify-content:space-between;margin-bottom:4px"><b style="font-size:12.5px">' + esc(f.label) + ' (' + sel.size + '/' + opts.length + ')</b>' +
        '<span class="row" style="gap:4px"><button type="button" class="btn ghost sm" data-sfmall="' + esc(f.key) + '">Chọn hết</button><button type="button" class="btn ghost sm" data-sfmnone="' + esc(f.key) + '">Bỏ chọn</button></span></div>' +
        '<div class="hak-pick-wrap" style="max-height:150px;padding:6px 8px">' +
        (opts.length ? opts.map(o => '<label style="flex-direction:row;align-items:center;gap:6px;padding:3px 0;font-weight:400"><input type="checkbox" data-sfm="' + esc(f.key) + '" value="' + esc(o.value) + '"' + (sel.has(o.value) ? ' checked' : '') + '> ' + esc(o.label) + '</label>').join('') : '<span class="mut">Chưa có giá trị.</span>') +
        '</div></div>';
    }
    if (f.type === 'enum') {
      const val = SF.getField(s, f);
      const opts = (typeof f.options === 'function' ? f.options() : f.options || []).map(o => typeof o === 'string' ? {value: o, label: o} : o);
      return '<label><span>' + esc(f.label) + '</span><select data-sfdrfield="' + esc(f.key) + '"><option value="">Tất cả</option>' +
        opts.map(o => '<option value="' + esc(o.value) + '"' + (String(o.value) === String(val) ? ' selected' : '') + '>' + esc(o.label) + '</option>').join('') + '</select></label>';
    }
    return '<label style="flex-direction:row;align-items:center;gap:8px"><input type="checkbox" data-sfdrbool="' + esc(f.key) + '"' + (SF.getField(s, f) ? ' checked' : '') + '> ' + esc(f.label) + '</label>';
  }).join('');
  const ps = hakSfPresets(), presetNames = ps.list(hakSfDraft.screenId);
  /* kho bộ lọc đã lưu bị hỏng/khác phiên bản: không ghi đè được → báo và cho "Tạo kho mới" (hỏi xác nhận trong hộp, bản cũ được sao lưu) */
  const khoHong = ps.isCorrupt() ? (hakSfDraft.xacNhanKho ?
    '<div class="msg warn" role="alertdialog" aria-label="Xác nhận tạo kho bộ lọc mới" style="margin-bottom:8px"><b>Tạo kho bộ lọc mới?</b> Kho cũ được sao lưu nguyên văn sang khóa <code>hak.sf.presets.bak</code> (không mất dữ liệu); các bộ lọc đã lưu hiện không dùng được nữa.' +
    '<div class="row" style="gap:8px;margin-top:6px"><button type="button" class="btn ghost sm" data-sfpreset="kho-huy">Không tạo</button><button type="button" class="btn sm" data-sfpreset="kho-dongy">Tạo kho mới</button></div></div>' :
    '<div class="msg warn" id="sfKhoHong" style="margin-bottom:8px">Kho bộ lọc đã lưu bị lỗi hoặc thuộc phiên bản khác nên chưa lưu được bộ lọc mới. ' +
    '<button type="button" class="btn ghost sm" data-sfpreset="kho-moi">Tạo kho mới</button></div>') : '';
  const presetHtml = '<div style="margin-top:10px;padding-top:10px;border-top:1px solid var(--line)">' + khoHong +
    '<div class="row" style="gap:6px;flex-wrap:wrap;align-items:center">' +
      '<b style="font-size:12.5px">Bộ lọc đã lưu:</b>' +
      (presetNames.length ? '<select id="sfPresetSel" style="min-width:150px"><option value="">— chọn bộ lọc —</option>' + presetNames.map(n => '<option value="' + esc(n) + '">' + esc(n) + '</option>').join('') + '</select>' +
        '<button type="button" class="btn ghost sm" data-sfpreset="load">Áp dụng mẫu</button>' +
        '<button type="button" class="btn ghost sm" data-sfpreset="del">Xóa mẫu</button>' : '<span class="mut" style="font-size:12px">Chưa có bộ lọc đã lưu.</span>') +
    '</div>' +
    '<div class="row" style="gap:6px;margin-top:6px"><input id="sfPresetName" placeholder="Đặt tên để lưu bộ lọc hiện tại…" style="flex:1"><button type="button" class="btn ghost sm" data-sfpreset="save">Lưu bộ lọc</button></div>' +
  '</div>';
  dlgMo('<h3 style="margin-top:0">Bộ lọc thông minh — ' + esc(cfg.title || 'Danh sách') + '</h3>' +
    (hakSfDraft.err ? '<div class="msg err">' + esc(hakSfDraft.err) + '</div>' : '') +
    '<div style="display:flex;flex-direction:column;gap:10px">' + blocks + '</div>' +
    presetHtml +
    '<div class="row" style="justify-content:space-between;margin-top:12px">' +
      '<button type="button" class="btn ghost" data-sfdr="reset">Đặt lại mặc định</button>' +
      '<span class="row" style="gap:8px"><button type="button" class="btn ghost" data-act="dlgDong">Đóng</button><button type="button" class="btn" data-sfdr="apply">Áp dụng bộ lọc</button></span>' +
    '</div>');
  if (focusInfo) {
    const wraps = document.querySelectorAll('#dlgBox .hak-pick-wrap');
    if (focusInfo.scrolls) focusInfo.scrolls.forEach((sc, idx) => { if (wraps[idx]) wraps[idx].scrollTop = sc; });
    if (focusInfo.sel) { const fel = document.querySelector(focusInfo.sel); if (fel) fel.focus(); }
  }
}
/* Ô tìm nhanh: gõ liên tiếp chỉ cập nhật bộ lọc + vẽ lại bảng MỘT lần sau HAK_SF_DEBOUNCE ms (FLT-02).
 * Enter / rời ô: cập nhật trạng thái ngay (nút bấm kế tiếp thấy đúng bộ lọc) nhưng việc vẽ vẫn do hẹn giờ lo. */
const HAK_SF_DEBOUNCE = 250;
const hakSfTimers = {};
function hakSfQSync(sid) { // đẩy giá trị ô tìm vào trạng thái bộ lọc (không vẽ)
  const inst = hakSfInstances[sid], q = document.querySelector('[data-sfq="' + sid + '"]'); if (!inst || !q) return false;
  const cur = inst.filter.getState(); if (cur.q === q.value) return false;
  inst.filter.setState(HAKCore.sf.normalize(Object.assign({}, cur, {q: q.value}), inst.cfg));
  return true;
}
function hakSfQFlush(sid) { // vẽ ngay nếu đang chờ
  if (hakSfTimers[sid] == null) return;
  clearTimeout(hakSfTimers[sid]); delete hakSfTimers[sid];
  const q = document.querySelector('[data-sfq="' + sid + '"]'), had = q && document.activeElement === q, pos = had ? q.selectionStart : null;
  hakSfQSync(sid);
  render();
  const el = document.querySelector('[data-sfq="' + sid + '"]');
  if (el && had) { el.focus(); if (pos != null) el.setSelectionRange(pos, pos); }
}
function hakSfQCancel(sid) { if (hakSfTimers[sid] != null) { clearTimeout(hakSfTimers[sid]); delete hakSfTimers[sid]; } }
document.addEventListener('input', e => {
  const q = e.target && e.target.closest && e.target.closest('[data-sfq]');
  if (!q) return;
  const sid = q.dataset.sfq; if (!hakSfInstances[sid]) return;
  hakSfQCancel(sid);
  hakSfTimers[sid] = setTimeout(() => hakSfQFlush(sid), HAK_SF_DEBOUNCE);
});
document.addEventListener('keydown', e => {
  const q = e.key === 'Enter' && e.target && e.target.closest && e.target.closest('[data-sfq]');
  if (q) hakSfQFlush(q.dataset.sfq);
});
document.addEventListener('focusout', e => {
  const q = e.target && e.target.closest && e.target.closest('[data-sfq]');
  if (q && hakSfTimers[q.dataset.sfq] != null) hakSfQSync(q.dataset.sfq);
});
document.addEventListener('change', e => {
  const t = e.target; if (!t) return;
  const qk = t.closest && t.closest('[data-sfquick]');
  if (qk) {
    const sid = qk.dataset.sfquick, key = qk.dataset.sfkey, inst = hakSfInstances[sid]; if (!inst) return;
    inst.filter.setField(key, qk.value);
    render();
    const el = document.querySelector('[data-sfquick="' + sid + '"][data-sfkey="' + key + '"]'); if (el) el.focus();
    return;
  }
  const qb = t.closest && t.closest('[data-sfquickbool]');
  if (qb) {
    const sid = qb.dataset.sfquickbool, key = qb.dataset.sfkey, inst = hakSfInstances[sid]; if (!inst) return;
    inst.filter.setField(key, qb.checked);
    render();
    const el = document.querySelector('[data-sfquickbool="' + sid + '"][data-sfkey="' + key + '"]'); if (el) el.focus();
    return;
  }
  if (hakSfDraft && t.closest('#dlgBox')) {
    const s = hakSfDraft.state;
    if (t.dataset.sfm) {
      hakSfSyncDraftText();
      const scrolls = [...document.querySelectorAll('#dlgBox .hak-pick-wrap')].map(w => w.scrollTop);
      const key = t.dataset.sfm, val = t.value, list = new Set(s.sel[key] || []);
      if (t.checked) list.add(val); else list.delete(val);
      if (list.size) s.sel[key] = [...list]; else delete s.sel[key];
      hakSfRenderDrawer({scrolls, sel: '#dlgBox [data-sfm="' + key.replace(/"/g, '\\"') + '"][value="' + val.replace(/"/g, '\\"') + '"]'});
    } else if (t.dataset.sfdrfield) {
      if (t.value) s.one[t.dataset.sfdrfield] = t.value; else delete s.one[t.dataset.sfdrfield];
    } else if (t.dataset.sfdrbool) {
      if (t.checked) s.flag[t.dataset.sfdrbool] = true; else delete s.flag[t.dataset.sfdrbool];
    }
  }
});
document.addEventListener('click', e => {
  const t = e.target; if (!t || !t.closest) return;
  const op = t.closest('[data-sfopen]'); if (op) return hakSfOpenDrawer(op.dataset.sfopen);
  const rm = t.closest('[data-sfrm]');
  if (rm) {
    const inst = hakSfInstances[rm.dataset.sfrm]; if (!inst) return;
    hakSfQCancel(rm.dataset.sfrm);
    const conds = HAKCore.sf.conditions(inst.cfg, inst.filter.getState()), c = conds[+rm.dataset.sfidx];
    if (c) { inst.filter.setState(HAKCore.sf.remove(inst.filter.getState(), c)); render(); }
    return;
  }
  const rs = t.closest('[data-sfreset]');
  if (rs) { hakSfQCancel(rs.dataset.sfreset); const inst = hakSfInstances[rs.dataset.sfreset]; if (inst) { inst.filter.reset(); render(); } return; }
  if (!hakSfDraft || !t.closest('#dlgBox')) return;
  const inst = hakSfInstances[hakSfDraft.screenId]; if (!inst) return;
  const SF = HAKCore.sf;
  const syncText = () => hakSfSyncDraftText();
  const mall = t.closest('[data-sfmall]');
  if (mall) {
    syncText();
    const f = (inst.cfg.fields || []).find(x => x.key === mall.dataset.sfmall);
    if (f) {
      const opts = (typeof f.options === 'function' ? f.options() : f.options || []).map(o => typeof o === 'string' ? o : String(o.value));
      if (f.withNone) opts.unshift(SF.NONE);
      hakSfDraft.state.sel[f.key] = opts;
    }
    hakSfRenderDrawer();
    return;
  }
  const mnone = t.closest('[data-sfmnone]');
  if (mnone) { syncText(); delete hakSfDraft.state.sel[mnone.dataset.sfmnone]; hakSfRenderDrawer(); return; }
  const dr = t.closest('[data-sfdr]');
  if (dr) {
    if (dr.dataset.sfdr === 'reset') { inst.filter.reset(); hakSfDraft = null; dlgDong(); render(); return; }
    if (!syncText()) { hakSfRenderDrawer(); return; }
    const prob = SF.dateProblem(hakSfDraft.state);
    if (prob) { hakSfDraft.err = prob; hakSfRenderDrawer(); return; }
    inst.filter.setState(hakSfDraft.state); hakSfDraft = null; dlgDong(); render(); return;
  }
  const pr = t.closest('[data-sfpreset]');
  if (pr) {
    const ps = hakSfPresets(), act = pr.dataset.sfpreset;
    if (act === 'kho-moi') { syncText(); hakSfDraft.xacNhanKho = true; hakSfRenderDrawer(); return; }
    if (act === 'kho-huy') { syncText(); hakSfDraft.xacNhanKho = false; hakSfRenderDrawer(); return; }
    if (act === 'kho-dongy') {
      syncText(); const r = ps.discardCorrupt(); hakSfDraft.xacNhanKho = false;
      hakSfDraft.err = r.ok ? '' : (r.msg || 'Không tạo được kho mới.'); hakSfRenderDrawer(); return;
    }
    if (act === 'save') {
      if (!syncText()) { hakSfRenderDrawer(); return; }
      const name = (document.getElementById('sfPresetName') || {}).value;
      const r = ps.save(hakSfDraft.screenId, name, hakSfDraft.state);
      hakSfDraft.err = r.ok ? '' : (r.msg || 'Không lưu được bộ lọc.');
      hakSfRenderDrawer();
    } else if (act === 'load') {
      const name = (document.getElementById('sfPresetSel') || {}).value;
      const p = name ? ps.get(hakSfDraft.screenId, name) : null;
      if (p) { const ap = SF.applyPreset(inst.cfg, p); hakSfDraft.state = ap.state; hakSfDraft.err = ''; hakSfRenderDrawer(); }
    } else if (act === 'del') {
      const name = (document.getElementById('sfPresetSel') || {}).value;
      if (name) { ps.remove(hakSfDraft.screenId, name); hakSfRenderDrawer(); }
    }
  }
});
