/* ========== Hộp thoại hợp đồng: sự kiện, hộp xác nhận 2 bước (QĐ4) và “Cập nhật vào hồ sơ” ==========
 * Ghi vào hồ sơ chỉ qua cùng hàm tạo chủ rừng/lô với lkApply (lkNewOwner, lkNewForest) và HAKStage.merge vào BẢN NHÁP (QĐ7): thông tin chủ rừng/rừng ghi vào hồ sơ như lkApply,
 * phiếu cân vào bản nháp của lô đích, người dùng bấm “Lưu dữ liệu vào lô”. Hợp đồng nhiều CCCD (QĐ4) chỉ được ghi sau 2 lần xác nhận. */
function gsAsk(o) {   // hộp xác nhận: o.html đã được escape bởi người gọi; trả Promise<boolean>
  const b = $('#hdAsk'), body = $('#hdAskBody');
  body.innerHTML = '<h2 id="hdAskT">' + esc(o.title) + '</h2><div class="gsAskB">' + o.html + '</div>' + (o.check ? '<label class="gsInl gsAskC"><input type="checkbox" id="hdAskChk"> ' + esc(o.check) + '</label>' : '') +
    '<div class="row gsAskF"><button type="button" class="btn ghost" data-act="gsAskNo">' + esc(o.no || 'Hủy') + '</button><button type="button" class="btn" id="hdAskYes" data-act="gsAskYes"' + (o.check ? ' disabled' : '') + '>' + esc(o.yes || 'Đồng ý') + '</button></div>';
  b.classList.add('on'); const f = body.querySelector('[data-act=gsAskNo]'); if (f) f.focus();
  return new Promise(res => { gs.ask = res; });
}
function gsAskDone(v) { const b = $('#hdAsk'); b.classList.remove('on'); $('#hdAskBody').innerHTML = ''; const r = gs.ask; gs.ask = null; if (r) r(v); const hb = $('#hdBox'); if (hb.classList.contains('on')) { const n = hb.querySelector('[data-act=gsApply]:not(:disabled), [data-act=gsClose]'); if (n) n.focus(); } }
/* QĐ4: nhiều CCCD → hai lần xác nhận rõ ràng, liệt kê các dòng Sheet liên quan */
async function gsAck() {
  const m = gs.m, d = m.d, c = d.canhBaoNang[0];
  const l1 = await gsAsk({title: 'Bước 1/2 — Mã hợp đồng thuộc nhiều CCCD', html: '<p>Mã hợp đồng <b>' + esc(d.hd) + '</b> ở HoSoRung thuộc <b>' + d.cccdList.length + ' CCCD khác nhau</b>: ' + d.cccdList.map(x => esc(gsMask(x))).join(', ') + '.</p><p>Các dòng Sheet liên quan (HoSoRung): <b>' + c.dong.map(esc).join(', ') + '</b>.</p>' +
    '<p>Có thể một CCCD bị nhập sai. Nếu cập nhật, dữ liệu sẽ ghi vào chủ rừng theo CCCD <b>' + esc(gsMask(d.cccd)) + '</b>.</p>', yes: 'Tôi đã đọc, tiếp tục', no: 'Hủy'});
  if (!l1) return;
  const l2 = await gsAsk({title: 'Bước 2/2 — Xác nhận lần cuối', html: '<p>Bạn xác nhận muốn cho phép cập nhật hợp đồng <b>' + esc(d.hd) + '</b> dù mã này thuộc nhiều CCCD (dòng ' + c.dong.map(esc).join(', ') + ')?</p><p class="mut">Sau bước này nút “Cập nhật vào hồ sơ” mới sáng. Ứng dụng vẫn chặn ghi vào chủ rừng có CCCD không nằm trong danh sách trên.</p>', check: 'Tôi hiểu rủi ro và đồng ý cập nhật', yes: 'Xác nhận, cho phép cập nhật', no: 'Hủy'});
  if (!l2) return;
  m.ack = true; m.msg = {kind: 'warn', text: 'Đã xác nhận 2 bước: được phép cập nhật hợp đồng thuộc nhiều CCCD.'}; gsRender();
}

async function gsApply() {
  const m = gs.m; if (!m || m.busy) return; const d = m.d;
  const fail = text => { m.msg = {kind: 'err', text}; gsRender(); };
  if (d.canhBaoNang.length && !m.ack) return fail('Mã hợp đồng thuộc nhiều CCCD: hoàn tất xác nhận 2 bước trước khi cập nhật.');
  const eff = gsEff(), rows = gsRows(), oc = gsOwnerCheck(eff);
  if (oc.err) return fail('Chưa ghi: ' + oc.err + ' Hồ sơ giữ nguyên.');
  const wr = [], skip = [];
  eff.forEach((e, i) => {
    const s = m.sel[e.k]; if (!s) return;
    const c = gsCount(e, rows), T = gsTarget(e), refNew = s.on[0] && s.ref && (d.owner.ref.length + e.X.ref.length) > 0 && JSON.stringify((T.f && T.f.ref && T.f.ref.fields) || []) !== JSON.stringify(d.owner.ref.concat(e.X.ref));
    if (c.f + c.g + c.p + c.d + (refNew ? 1 : 0) === 0) return;
    if (!e.code) return skip.push('Rừng ' + (i + 1) + ': chưa có mã rừng (chọn ở ô Mã rừng), chưa ghi.');
    if (e.tam) return skip.push('Rừng ' + (i + 1) + ' ' + e.code + ': ghép tạm chưa xác nhận, chưa ghi.');
    wr.push({e, i, s, T});
  });
  const ownerSel = Object.keys(m.own).some(k => m.own[k] && !gsSame(oc.o ? oc.o.info[k] : '', (d.owner.fields.find(x => x.key === k) || {}).value));
  if (!wr.length && !ownerSel) return fail('Chưa chọn mục nào để cập nhật' + (skip.length ? ': ' + skip.join(' ') : '. Bấm “Chọn phần mới” hoặc tích các ô cần ghi.'));
  const locked = wr.filter(x => x.T.exists && loKhoa(x.T.f));
  if (locked.length) return fail('Chưa ghi: lô ' + locked.map(x => x.T.f.info.maRung).join(', ') + ' đã ' + (locked[0].T.f.dung ? 'dừng' : 'chốt') + ' (chỉ đọc). Mở khóa (nhập lý do) hoặc mở lại lô trước khi cập nhật. Hồ sơ giữ nguyên, không ghi phần nào của hợp đồng này.');
  const creates = []; if (!oc.o) creates.push('chủ rừng mới “' + ((d.owner.fields.find(x => x.key === 'ten') || {}).value || '') + '” (CCCD ' + gsMask(d.cccd) + ')'); wr.filter(x => !x.T.exists).forEach(x => creates.push('lô mới ' + x.e.code));
  if (creates.length) {
    const ok = await gsAsk({title: 'Tạo mới trong hồ sơ?', html: '<p>Chưa có trong hồ sơ, sẽ tạo mới:</p><ul>' + creates.map(c => '<li>' + esc(c) + '</li>').join('') + '</ul>', yes: 'Đồng ý tạo', no: 'Không tạo, giữ nguyên'});
    if (!ok) return fail('Đã hủy: không tạo gì, hồ sơ giữ nguyên.');
  }
  m.busy = true; gsRender();
  const at = new Date().toISOString(), set = lk.st && lk.st.active ? lk.st.active.loadedAt : '';
  const mark = (obj, key, src) => { obj.src = obj.src || {}; obj.src[key] = {...src, at, set}; };
  const snapshot = JSON.stringify(db), newStages = [], lines = [], touched = [], hdRaw = ((d.owner.fields.find(x => x.key === 'soHopDong') || {}).value) || d.hd;
  let nPhieu = 0;
  try {
    let o = oc.o;
    if (!o) { const cf = d.owner.fields.find(x => x.key === 'cccd') || d.owner.fields[0] || {}; o = lkNewOwner(d.cccd || d.hd, cf.src || {tab: 'HoSoRung_QC', row: 0, col: 'Mã KH_CCCD'}, mark); }
    let ownerCh = 0;
    d.owner.fields.forEach(x => { if (m.own[x.key] && !gsSame(o.info[x.key], x.value)) { o.info[x.key] = x.value; mark(o, x.key, x.src); ownerCh++; } });
    if (ownerCh) lines.push('Chủ rừng ' + (o.info.ten || '') + ': ' + ownerCh + ' trường.');
    for (const w of wr) {
      const {e, i, s} = w; let f = w.T.exists ? w.T.f : null, ch = 0, created = false;
      if (!f) { f = lkNewForest(o, at); f.info.maRung = e.code; created = true; ch++; }
      const X = e.X, line = {f: 0, g: 0, dd: 0, add: 0, upd: 0, same: 0, pend: 0, so: 0};
      if (s.on[0]) {
        X.fields.forEach(x => { if (x.key !== 'maRung' && s.f[x.key] && !gsSame(f.info[x.key], x.value)) { f.info[x.key] = x.value; mark(f, x.key, x.src); ch++; line.f++; } });
        if (typeof s.area === 'number' && X.area[s.area] && !gsSame(f.info.dienTich, X.area[s.area].value)) { f.info.dienTich = X.area[s.area].value; mark(f, 'dienTich', X.area[s.area].src); ch++; line.f++; }
        X.docs.forEach((dd, j) => { if (s.docs[j]) { f.info.giayTo = f.info.giayTo || []; f.info.giayTo.push({loai: dd.loai, ten: dd.ten, so: dd.so, ngayCap: dd.ngayCap, coQuan: '', hanDen: '', _src: {...dd.src, at, set}}); ch++; line.dd++; } });
        const refs = d.owner.ref.concat(X.ref);
        if (s.ref && refs.length && JSON.stringify((f.ref && f.ref.fields) || []) !== JSON.stringify(refs)) { f.ref = {at, set, hd: d.hd, cccd: d.cccd, fields: refs}; ch++; }
      }
      if (s.on[1] && typeof s.gps === 'number') { const g = X.gps[s.gps]; if (g && g.ok && !(f.info.lat === g.lat && f.info.lng === g.lng)) { f.info.lat = g.lat; f.info.lng = g.lng; mark(f, 'latlng', {tab: 'ToaDoRung_QC', row: g.row, col: 'Latitude_Vĩ độ / Longtitude_Kinh độ' + (g.converted ? ' (đã quy đổi từ ' + g.raw + ')' : ''), gps: g.id}); ch++; line.g++; } }
      const wrows = s.on[2] ? gsWriteRows(rows, e) : [];
      if (wrows.length) {
        const k0 = stKeyOf(o.id, f.id); if (!stages[k0]) { stages[k0] = HAKStage.create({nc: f.nc || [], dx: f.dx || [], pc: f.pc || []}); newStages.push(k0); }
        const st = stages[k0];
        for (const r of wrows.filter(x => x.st === 'doiso')) {   // nghi đổi số đã chọn “Đổi số”: giữ nguyên phiếu, chỉ đổi số hiện hành + nhật ký
          const meta = {lyDo: 'Google Sheets đổi số, dòng ' + r.p.row, nguon: {loai: 'sheet', tab: 'HoSoKeo', row: r.p.row, set}, at};
          const ctx = {loKhoa: loKhoa(f), phieuLoKhac: db.rs ? Object.values(db.rs).flatMap(oo => Object.values(oo.forests || {}).filter(ff => ff.id !== f.id).flatMap(ff => (ff.pc || []).map(p => ({lo: ff.info.maRung, p})))) : [], xacNhanLoKhac: false};
          let res = HAKStage.doiSoPhieu(st, r.exLot.p._id, r.p.soPhieu, meta, ctx);
          if (!res.ok && res.ma === 'CAN_XAC_NHAN') { const yes = await gsAsk({title: 'Số phiếu cũng có ở lô khác', html: '<ul>' + (res.canhBao || []).map(x => '<li>' + esc(x) + '</li>').join('') + '</ul><p>Vẫn đổi số ' + esc(r.uv.so) + ' → ' + esc(r.p.soPhieu) + '?</p>', yes: 'Vẫn đổi số', no: 'Không đổi'}); if (yes) res = HAKStage.doiSoPhieu(st, r.exLot.p._id, r.p.soPhieu, meta, Object.assign(ctx, {xacNhanLoKhac: true})); else { line.pend++; continue; } }
          if (!res.ok) throw new Error('Đổi số ' + r.uv.so + ' → ' + r.p.soPhieu + ': ' + res.error);
          line.so++; ch++;
        }
        const chosen = wrows.filter(x => x.st === 'new' || x.st === 'upd');
        const mk = p => Object.assign(HAKPhieuCan.chuanHoaNgay2(normPC({maRung: f.info.maRung, ngay: p.p.ngay, bienSo: p.bien, soPhieu: p.p.soPhieu, kl: p.p.kl, noiGiao: '', gioCan1: p.p.gioCan1, gioCan2: p.p.gioCan2, can1: p.p.can1, can2: p.p.can2, klKg: p.p.klKg, khachHang: p.p.khachHang, diaChi: p.p.diaChi, nguonGoc: p.p.nguonGoc, donGia: p.p.donGia, thanhTien: p.p.thanhTien})),
          {_ngay2Suy: true, _src: {tab: 'HoSoKeo_QC', row: p.p.row, at, set, hd: d.hd, pb: eff.length === 1 ? 'mot-rung' : m.tay.has(p.key) ? 'tay' : 'tu-dong'}});
        const plateRows = chosen.filter(x => x.st === 'upd' && x.bienDoi).map(x => { const r = mk(x); return {soPhieu: r.soPhieu, bienSo: r.bienSo, _src: r._src}; }), restRows = chosen.filter(x => !(x.st === 'upd' && x.bienDoi)).map(mk);
        const rep = HAKStage.merge(st, 'pc', restRows, {source: 'Google Sheets', plateSource: 'Google Sheets', suyNgay2: HAKPhieuCan.suyNgay2});
        if (NAV.curF === f.id) ganPhieuHopDong(st, rep.ids, f);
        if (plateRows.length) { const pr = HAKStage.merge(st, 'pc', plateRows, {source: 'Google Sheets (đổi biển số)', plateSource: 'Google Sheets', sameTrip: true}); rep.upd += pr.upd; rep.same += pr.same; rep.pending += pr.pending; }
        line.add = rep.add; line.upd = rep.upd; line.same = rep.same; line.pend += rep.pending; nPhieu += rep.add + rep.upd; ch += rep.add + rep.upd;
      }
      if (ch && (created || !f.info.nguon || f.info.nguon.hd !== hdRaw || f.info.nguon.maRung !== e.code || ch > 0)) f.info.nguon = {hd: hdRaw, maRung: e.code, at};
      touched.push(f.id);
      lines.push('Rừng ' + (i + 1) + ' (' + e.code + ')' + (created ? ' — lô mới' : '') + ': ' + line.f + ' trường · ' + line.g + ' điểm · ' + line.dd + ' giấy tờ · phiếu thêm ' + line.add + ', đổi ' + line.upd + ', giữ nguyên ' + line.same + (line.so ? ', đổi số ' + line.so : '') + (line.pend ? ', CẦN ĐỐI CHIẾU ' + line.pend : '') + '.');
    }
    const un = rows.filter(r => r.st === 'new' && m.as[r.key] === -1 && m.sp[r.key]).length;
    if (un) lines.push('Bỏ qua ' + un + ' phiếu mới chưa phân bổ vào rừng nào (không ghi).');
    const bo = rows.filter(r => r.st === 'same' || r.st === 'dup' || r.st === 'lech' || r.st === 'issue' || r.st === 'dsn' || r.st === 'alias').length;
    if (bo) lines.push('Bỏ qua ' + bo + ' phiếu trùng, lệch CCCD, lỗi, nghi đổi số chưa chọn hoặc cần ghép xe.');
    skip.forEach(s => lines.push(s));
    if (m.alias && Object.keys(m.alias).length) db.bienAlias = Object.assign(db.bienAlias || {}, m.alias);
    const hadLo = touched.filter(id => loDirty.delete(id));
    const r = await persistNow();
    if (!r.ok) { hadLo.forEach(id => loDirty.add(id)); throw new Error('lưu vào cơ sở dữ liệu thất bại: ' + r.error); }
    nhapTamGhi();
    m.sum = lines.length ? lines : ['Không có thay đổi nào cần ghi (đã có đủ trong hồ sơ).']; m.msg = null; m.busy = false;
    note('Đã cập nhật hợp đồng ' + esc(d.hd) + ' vào hồ sơ' + (nPhieu ? ': ' + nPhieu + ' phiếu cân vào BẢN NHÁP — bấm “Lưu dữ liệu vào lô” ở từng lô (chưa lưu thì chưa dùng để tạo hồ sơ).' : '.'), nPhieu ? 'warn' : undefined);
    gsAlloc(true); gsDefaults(); gsRender();
  } catch (er) {
    db = withDefaults(JSON.parse(snapshot));   // trả lại đúng trạng thái trước khi ghi
    if (HB) { const back = HB.loadSync(); if (back && back.ok) db = withDefaults(back.db); }
    newStages.forEach(k => { delete stages[k]; });
    m.busy = false; m.msg = {kind: 'err', text: 'Không lưu, hồ sơ giữ nguyên: ' + er.message}; gsRender();
  }
}

/* ----- Sự kiện ----- */
document.addEventListener('click', async e => {
  const t = e.target; if (!t.closest) return;
  if (t.closest('#hdAsk')) { const a = t.closest('[data-act]'); if (a && a.dataset.act === 'gsAskYes') gsAskDone(true); else if (a && a.dataset.act === 'gsAskNo') gsAskDone(false); return; }
  if (!t.closest('#hdBox') || !gs.m) return;
  const m = gs.m, rg = t.closest('[data-gsrg]'); if (rg) { m.rg = +rg.dataset.gsrg; m.page = 0; return gsRender(); }
  const tb = t.closest('[data-gstab]'); if (tb) { m.tab = tb.dataset.gstab; return gsRender(); }
  const el = t.closest('[data-act]'); if (!el) return; const a = el.dataset.act;
  if (a === 'gsClose') return gsClose();
  if (a === 'gsSame') { m.showSame = !m.showSame; return gsRender(); }
  if (a === 'gsConf') { m.conf[+el.dataset.k] = true; gsInitSel(+el.dataset.k); gsAlloc(true); return gsRender(); }
  if (a === 'gsAck') return gsAck();
  if (a === 'gsAll') { gsDefaults(); m.msg = {kind: 'ok', text: 'Đã chọn phần mới: mục mới và trường trống. Không tích lệch CCCD, nghi đổi số hay trường đã có giá trị khác.'}; return gsRender(); }
  if (a === 'gsAuto') {
    if (m.tay.size) { const ok = await gsAsk({title: 'Phân bổ tự động', html: '<p>Phân bổ tự động sẽ tính lại cả hợp đồng và <b>bỏ ' + m.tay.size + ' lựa chọn phân bổ bằng tay</b>. Tiếp tục?</p>', yes: 'Tính lại', no: 'Giữ lựa chọn tay'}); if (!ok) return; }
    gsAlloc(false); gsRows().forEach(r => { if (r.st === 'new') m.sp[r.key] = true; }); m.msg = {kind: 'ok', text: 'Đã phân bổ tự động theo ngày cân và sản lượng dự kiến.'}; return gsRender();
  }
  if (a === 'gsFill') { const n = gsFillOne(+el.dataset.k); m.msg = {kind: n ? 'ok' : 'warn', text: n ? 'Đã phân bổ ' + n + ' phiếu còn lại vào rừng này.' : 'Không có phiếu nào còn lại để phân bổ.'}; return gsRender(); }
  if (a === 'gsClear') { gsRows().forEach(r => { if (r.st === 'new') { m.as[r.key] = -1; m.tay.add(r.key); } }); m.msg = {kind: 'warn', text: 'Đã xóa phân bổ: phiếu mới chưa vào rừng nào sẽ không được ghi.'}; return gsRender(); }
  if (a === 'gsPcPage') { m.page += +el.dataset.d; return gsRender(); }
  if (a === 'gsDsn') {
    const key = el.dataset.key, v = el.dataset.v, r = gsRows().find(x => x.key === key);
    if (!v) delete m.dsn[key]; else if (v === 'khac') { m.dsn[key] = {act: 'khac'}; m.sp[key] = true; } else if (r && r.ung && r.ung.length) { m.dsn[key] = {act: 'doi', uv: (m.uvPick || {})[key] || r.ung[0].id}; m.sp[key] = true; }
    gsAlloc(true); return gsRender();
  }
  if (a === 'gsApply') return gsApply();
});
document.addEventListener('change', e => {
  const t = e.target; if (!t.closest) return;
  if (t.id === 'hdAskChk') { const y = $('#hdAskYes'); if (y) y.disabled = !t.checked; return; }
  if (!t.closest('#hdBox') || !gs.m) return;
  const m = gs.m, ds = t.dataset, s = m.sel[m.rg];
  if (ds.gsf) { const [g, k] = ds.gsf.split('|'); if (g === 'own') m.own[k] = t.checked; else if (s) s.f[k] = t.checked; return gsRender(); }
  if (ds.gson != null && s) { s.on[+ds.gson] = t.checked; return gsRender(); }
  if (ds.gsdoc != null && s) { s.docs[ds.gsdoc] = t.checked; return gsRender(); }
  if ('gsref' in ds && s) { s.ref = t.checked; return gsRender(); }
  if (ds.gsgps != null && s) { s.gps = /^\d+$/.test(ds.gsgps) ? +ds.gsgps : 'skip'; return gsRender(); }
  if ('gsarea' in ds && s) { s.area = /^\d+$/.test(t.value) ? +t.value : 'skip'; return gsRender(); }
  if (ds.gssp != null) { m.sp[ds.gssp] = t.checked; return gsRender(); }
  if (ds.gsas != null) { m.as[ds.gsas] = +t.value; m.tay.add(ds.gsas); if (+t.value >= 0) m.sp[ds.gsas] = true; return gsRender(); }
  if ('gstol' in ds) { let v = parseFloat(String(t.value).replace(',', '.')); let msg = null; if (!isFinite(v)) { v = 5; msg = 'Dung sai không hợp lệ: dùng 5 %.'; } if (v < 0 || v > 30) { v = Math.min(30, Math.max(0, v)); msg = 'Dung sai chỉ từ 0 đến 30 %: đã đặt ' + v + ' %.'; } m.tol = v; gsAlloc(true); m.msg = msg ? {kind: 'warn', text: msg} : null; return gsRender(); }
  if ('gspcf' in ds) { m.pcF = t.value; m.page = 0; return gsRender(); }
  if ('gspcq' in ds) { m.pcQ = t.value; m.page = 0; return gsRender(); }
  if (ds.gscode != null) { gsSetCode(+ds.gscode, t.value); m.msg = {kind: 'ok', text: 'Đã đổi mã rừng: lựa chọn của rừng này được đặt lại theo dữ liệu mới.'}; return gsRender(); }
  if (ds.gsalias != null) { const v = t.value.trim().toUpperCase(); m.alias = m.alias || {}; if (v) m.alias[ds.gsalias] = v; else delete m.alias[ds.gsalias]; gsAlloc(true); gsRows().forEach(r => { if (r.st === 'new' && !(r.key in m.sp)) m.sp[r.key] = true; }); return gsRender(); }
  if (ds.gsuv != null) { const [key, id] = ds.gsuv.split('|'); m.uvPick = m.uvPick || {}; m.uvPick[key] = id; }
});
document.addEventListener('keydown', e => {
  if (e.key !== 'Enter' || !e.target.dataset || !gs.m) return;
  if (e.target.matches && e.target.matches('#hdBox [data-gspcq]')) { e.preventDefault(); gs.m.pcQ = e.target.value; gs.m.page = 0; gsRender(); }
});

/* Điểm vào dùng chung cho màn chủ rừng (14-b-doi-so-doi-chieu.js gọi window.moDuLieuSheets({maHd})) */
window.moDuLieuSheets = function (o) { return lkMoHopDong(o && o.maHd); };
