'use strict';
/* Nhận diện bản ghi trùng khi khôi phục, và gói sao lưu MỘT LÔ RỪNG. Thuần dữ liệu (không DOM/Electron/SQLite): dùng ở giao diện (nhúng khi build), tiến trình chính và kiểm thử Node.
 *
 * MỘT quy tắc xác định trùng dùng chung cho bước xem trước và bước ghi (plan*):
 *   - Chủ rừng trùng khi cùng ID nội bộ, cùng CCCD hoặc cùng mã chủ rừng. Nếu ba tiêu chí chỉ về các hồ sơ KHÁC NHAU trên máy → mâu thuẫn.
 *   - Lô trùng khi cùng ID nội bộ hoặc cùng mã lô (info.maRung). Mã lô so sánh sau khi bỏ khoảng trắng đầu/cuối và không phân biệt hoa thường (maKey). Hai tiêu chí chỉ về hai lô khác nhau, hoặc một mã lô khớp NHIỀU lô trên máy (dữ liệu cũ trùng mã) → mâu thuẫn, liệt kê đủ các lô khớp.
 *   - Mã lô là khóa duy nhất của một lô: tạo lô, đổi mã, nhập lô và “Giữ cả hai” đều kiểm tra bằng maTrung. Đổi mã lô thì các dòng nhân công/xe/phiếu cân mang mã cũ được đổi theo (renameLot).
 *   - Lô trùng nhưng nằm dưới chủ khác chủ mà file ghi, hoặc chủ không khớp hồ sơ nào mà mã lô đã có trên máy → mâu thuẫn.
 *   Có mâu thuẫn thì DỪNG, không ghi gì, và liệt kê hồ sơ cần đối chiếu.
 *
 * Gói lô (JSON): {loai:'HAKQN_LO_RUNG', dinhDang:1, xuatLuc, phanMem, maLo, tenLo, chuRung:{...hồ sơ chủ rừng, không có lô nào khác},
 *   lo:{...đủ dữ liệu một lô, kèm info.muaHang (công ty và địa chỉ giao đã chốt)}, dungChung:{dinhMuc, bienAlias (chỉ phần lô cần)}, kiemTra:{nc,dx,pc,tongTan}, maKiemTra}
 * Không chứa: lô của chủ khác hoặc lô khác, bản tra cứu Google Sheets, thông tin đăng nhập, danh mục công ty. */
(function (root) {
  const KIND = 'HAKQN_LO_RUNG', FORMAT = 1;
  const t = v => (v == null ? '' : String(v)).trim();
  const clone = o => JSON.parse(JSON.stringify(o));
  const defNewId = p => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const ownerName = o => (o && o.info && (o.info.ten || o.info.ma)) || '(chưa đặt tên)';
  const forestsOf = o => Object.entries((o && o.forests) || {}).map(([k, f]) => Object.assign({}, f, {id: f.id || k}));
  const forestLabel = f => ((f.info && f.info.maRung) || '(chưa có mã lô)') + (f.info && f.info.tenRung ? ' – ' + f.info.tenRung : '');

  /* ---------- nhận diện ---------- */
  function matchOwner(cur, id, info) {
    info = info || {};
    const rs = (cur && cur.rs) || {}, found = {};
    if (id && rs[id]) found.id = id;
    const cccd = t(info.cccd), ma = t(info.ma);
    Object.entries(rs).forEach(([k, o]) => {
      const oi = (o && o.info) || {};
      if (cccd && t(oi.cccd) === cccd && !found.cccd) found.cccd = k;
      if (ma && t(oi.ma) === ma && !found.ma) found.ma = k;
    });
    const ids = [...new Set(Object.values(found))];
    if (ids.length > 1) return {hit: null, conflict: 'Chủ rừng “' + (info.ten || info.ma || id) + '” khớp nhiều hồ sơ khác nhau trên máy: ' +
      Object.entries(found).map(([k, v]) => ({id: 'theo ID', cccd: 'theo CCCD', ma: 'theo mã chủ rừng'}[k]) + ' → ' + ownerName(rs[v])).join('; ')};
    return {hit: ids[0] || null, conflict: ''};
  }
  const maKey = v => t(v).toUpperCase();
  const where = (cur, ok, fid) => { const o = cur.rs[ok], f = o && o.forests && o.forests[fid]; return {owner: ok, forest: fid, chu: ownerName(o), lo: f ? forestLabel(f) : fid}; };
  /* Các lô đang dùng mã này (trừ lô exceptId): [{owner, forest, chu, lo}] */
  function lotsByMa(cur, ma, exceptId) {
    const key = maKey(ma), out = [];
    if (!key) return out;
    Object.entries((cur && cur.rs) || {}).forEach(([ok, o]) => forestsOf(o).forEach(f => { if (f.id !== exceptId && maKey(f.info && f.info.maRung) === key) out.push(where(cur, ok, f.id)); }));
    return out;
  }
  /* QUY TẮC DUY NHẤT kiểm tra mã lô: trả lý do nếu mã không dùng được, '' nếu dùng được. taken: tập mã (đã chuẩn hóa maKey) sẽ bị chiếm bởi lô khác sắp ghi. */
  function maTrung(cur, ma, exceptId, taken) {
    if (!maKey(ma)) return 'Chưa có mã lô';
    const hit = lotsByMa(cur, ma, exceptId);
    if (hit.length) return 'Mã lô “' + t(ma) + '” đã có ở: ' + hit.map(h => h.lo + ' (chủ ' + h.chu + ')').join('; ');
    if (taken && taken.has(maKey(ma))) return 'Mã lô “' + t(ma) + '” bị trùng với lô khác sẽ được ghi cùng lúc';
    return '';
  }
  function goiYMa(cur, ma, taken) {
    const base = t(ma) || 'LO'; let k = 2, c = base + '-' + k;
    while (maTrung(cur, c, null, taken)) c = base + '-' + (++k);
    return c;
  }
  /* Dữ liệu cũ có mã lô trùng: [{ma, lots:[{owner, forest, chu, lo, nc, dx, pc, kl}]}] đầy đủ các lô khớp */
  function duplicateGroups(db) {
    const g = {};
    Object.entries((db && db.rs) || {}).forEach(([ok, o]) => forestsOf(o).forEach(f => { const k = maKey(f.info && f.info.maRung); if (k) (g[k] = g[k] || {ma: t(f.info.maRung), lots: []}).lots.push(Object.assign(where(db, ok, f.id), {ten: t(f.info.tenRung), nc: (f.nc || []).length, dx: (f.dx || []).length, pc: (f.pc || []).length, kl: sumKl(f.pc)})); }));
    return Object.values(g).filter(x => x.lots.length > 1);
  }
  /* Đổi mã lô: các dòng nhân công/xe/phiếu cân mang mã cũ đổi theo, để dữ liệu vẫn thuộc đúng lô. khac: dòng mang một mã KHÁC (không tự đổi). */
  function renameLot(forest, newMa) {
    const f = clone(forest), old = t(f.info && f.info.maRung), doi = {nc: 0, dx: 0, pc: 0}, khac = [];
    f.info = Object.assign({}, f.info, {maRung: t(newMa)});
    ['nc', 'dx', 'pc'].forEach(k => (f[k] || []).forEach(r => {
      if (!r || !t(r.maRung)) return;
      if (old && maKey(r.maRung) === maKey(old)) { r.maRung = t(newMa); doi[k]++; } else if (maKey(r.maRung) !== maKey(newMa)) khac.push({loai: k, dong: r._row, ma: t(r.maRung)});
    }));
    return {forest: f, doi, khac};
  }
  function matchForest(cur, fid, ma) {
    const rs = (cur && cur.rs) || {}; let byId = null;
    Object.entries(rs).forEach(([ok, o]) => forestsOf(o).forEach(f => { if (fid && f.id === fid && !byId) byId = {owner: ok, forest: f.id}; }));
    const hits = lotsByMa(cur, ma);
    if (hits.length > 1) return {hit: null, cacLo: hits, conflict: 'Mã lô “' + t(ma) + '” đang trùng ở ' + hits.length + ' lô trên máy (dữ liệu cũ), cần đối chiếu và đổi mã trước: ' + hits.map(h => h.lo + ' (chủ ' + h.chu + ')').join('; ')};
    const byMa = hits[0] || null;
    if (byId && byMa && (byId.forest !== byMa.forest || byId.owner !== byMa.owner)) return {hit: null, cacLo: [where(cur, byId.owner, byId.forest), byMa], conflict: 'ID nội bộ và mã lô “' + t(ma) + '” chỉ về hai lô khác nhau trên máy (' + where(cur, byId.owner, byId.forest).lo + ' và ' + byMa.lo + ')'};
    return {hit: byId || (byMa && {owner: byMa.owner, forest: byMa.forest}), conflict: ''};
  }
  const sameLoc = (a, b) => a && b && a.owner === b.owner && a.forest === b.forest;

  /* ---------- khôi phục bản sao lưu toàn bộ: xem trước và ghi dùng chung planImport ---------- */
  /* opts: {strategy, maMoi:{<ID lô trong file>: mã mới}}. Với strategy 'both', mỗi lô trùng được nhân bản PHẢI có mã mới đã xác nhận, kiểm tra bằng maTrung (cả lô đã có lẫn các lô khác trong file). */
  function planImport(cur, incoming, opts) {
    opts = opts || {};
    const conflicts = [], owners = [], seenMa = {};
    Object.entries((incoming && incoming.rs) || {}).forEach(([key, o]) => {
      const oid = (o && o.id) || key, mo = matchOwner(cur, oid, o && o.info);
      if (mo.conflict) conflicts.push({loai: 'chu', ten: ownerName(o), moTa: mo.conflict});
      const entry = {id: key, ten: ownerName(o), ma: t(o && o.info && o.info.ma), state: mo.hit ? 'trung' : 'moi', existingId: mo.hit, forests: [], giu: []};
      const matchedForests = new Set();
      forestsOf(o).forEach(f => {
        const ma = t(f.info && f.info.maRung);
        if (ma) { if (seenMa[ma]) conflicts.push({loai: 'lo', ten: forestLabel(f), moTa: 'Mã lô “' + ma + '” xuất hiện hơn một lần trong file'}); seenMa[ma] = true; }
        const mf = matchForest(cur, f.id, ma);
        let moTa = mf.conflict;
        if (!moTa && mf.hit) {
          if (!mo.hit) moTa = 'Lô “' + forestLabel(f) + '” đã có trên máy dưới chủ “' + ownerName(cur.rs[mf.hit.owner]) + '”, nhưng chủ “' + ownerName(o) + '” trong file không khớp hồ sơ nào';
          else if (mf.hit.owner !== mo.hit) moTa = 'Lô “' + forestLabel(f) + '” đã có trên máy dưới chủ “' + ownerName(cur.rs[mf.hit.owner]) + '”, trong file thuộc chủ “' + ownerName(o) + '” (khớp chủ “' + ownerName(cur.rs[mo.hit]) + '”)';
        }
        if (moTa) conflicts.push({loai: 'lo', ten: forestLabel(f), moTa, cacLo: mf.cacLo || null});
        const ex = !moTa && mf.hit ? cur.rs[mf.hit.owner].forests[mf.hit.forest] : null;
        if (ex) matchedForests.add(ex.id || mf.hit.forest);
        entry.forests.push({id: f.id, ma, ten: t(f.info && f.info.tenRung), state: ex ? 'trung' : 'moi', existing: mf.hit ? mf.hit.forest : null, loi: moTa || '',
          nc: (f.nc || []).length, dx: (f.dx || []).length, pc: (f.pc || []).length, kl: sumKl(f.pc)});
      });
      if (mo.hit) forestsOf(cur.rs[mo.hit]).forEach(f => { if (!matchedForests.has(f.id)) entry.giu.push({id: f.id, ma: t(f.info && f.info.maRung), ten: t(f.info && f.info.tenRung)}); });
      owners.push(entry);
    });
    // Giữ cả hai: mỗi lô trùng cần mã mới đã xác nhận; kiểm tra cùng quy tắc ở xem trước và lúc ghi
    const nhanBan = [];
    if (opts.strategy === 'both' && !conflicts.length) {
      const taken = new Set();
      owners.forEach(o => o.forests.forEach(f => { if (f.state === 'moi' && f.ma) taken.add(maKey(f.ma)); }));
      owners.forEach(o => o.forests.forEach(f => {
        if (f.state !== 'trung') return;
        const chon = t((opts.maMoi || {})[f.id]);
        f.maGoiY = goiYMa(cur, f.ma, taken); f.maMoi = chon;
        f.maLoi = chon ? (maKey(chon) === maKey(f.ma) ? 'Mã mới phải khác mã cũ “' + f.ma + '”' : maTrung(cur, chon, null, taken)) : 'Cần xác nhận mã mới cho lô nhân bản (gợi ý: ' + f.maGoiY + ')';
        if (!f.maLoi) taken.add(maKey(chon));
        nhanBan.push(f);
      }));
    }
    const maLoi = nhanBan.filter(f => f.maLoi);
    return {ok: !conflicts.length && !maLoi.length, conflicts, owners, nhanBan: nhanBan.length, maLoi: maLoi.map(f => ({id: f.id, ma: f.ma, moTa: f.maLoi}))};
  }
  function sumKl(pc) { return Math.round((pc || []).reduce((s, p) => s + (typeof p.kl === 'number' && isFinite(p.kl) ? p.kl : 0), 0) * 1000) / 1000; }

  /* Gộp theo chiến lược skip | overwrite | both (không dùng cho 'replace'). Mâu thuẫn → ném lỗi, không đổi gì. */
  function mergeImport(cur, incoming, strategy, newId, opts) {
    newId = newId || defNewId;
    const plan = planImport(cur, incoming, {strategy, maMoi: opts && opts.maMoi});
    if (plan.conflicts.length) { const e = new Error('Có ' + plan.conflicts.length + ' hồ sơ mâu thuẫn, cần đối chiếu trước khi khôi phục: ' + plan.conflicts.slice(0, 5).map(c => c.moTa).join(' | ')); e.conflicts = plan.conflicts; throw e; }
    if (plan.maLoi.length) { const e = new Error('Giữ cả hai cần mã mới hợp lệ cho lô nhân bản: ' + plan.maLoi.slice(0, 5).map(m => m.ma + ' → ' + m.moTa).join(' | ')); e.maLoi = plan.maLoi; throw e; }
    const next = clone(cur); next.rs = next.rs || {};
    plan.owners.forEach(en => {
      const o = incoming.rs[en.id];
      if (!en.existingId) { next.rs[en.id] = Object.assign(clone(o), {id: (o && o.id) || en.id}); return; }       // chủ mới (kèm các lô của chủ đó)
      const tgt = next.rs[en.existingId]; tgt.forests = tgt.forests || {};
      forestsOf(o).forEach(f => {
        const pf = en.forests.find(x => x.id === f.id);
        if (pf.state === 'moi') { tgt.forests[f.id] = clone(f); return; }
        if (strategy === 'skip') return;
        if (strategy === 'overwrite') { tgt.forests[pf.existing] = Object.assign(clone(f), {id: pf.existing}); return; }
        const nid = newId('f'), rn = renameLot(f, (opts.maMoi || {})[f.id]);                                       // both: giữ cả hai, bản trong file lấy ID mới VÀ mã mới đã xác nhận (dòng nhân công/xe/phiếu đổi theo)
        tgt.forests[nid] = Object.assign(rn.forest, {id: nid});
      });
    });
    return {next, plan};
  }

  /* ---------- gói sao lưu một lô ---------- */
  function sharedFor(db, forest) {
    const dm = (db && db.dinhMuc) || {}, out = {dinhMuc: {}, bienAlias: {}};
    new Set((forest.nc || []).map(r => t(r.chucDanh)).filter(Boolean)).forEach(cd => { if (dm[cd]) out.dinhMuc[cd] = clone(dm[cd]); });
    const plates = new Set([...(forest.dx || []), ...(forest.pc || [])].map(r => t(r.bienSo)).filter(Boolean));
    Object.entries((db && db.bienAlias) || {}).forEach(([k, v]) => { if (plates.has(t(v))) out.bienAlias[k] = v; });
    return out;
  }
  function exportLot(db, ownerId, forestId, opts) {
    opts = opts || {};
    const o = db && db.rs && db.rs[ownerId], f = o && o.forests && o.forests[forestId];
    if (!o || !f) throw new Error('Không tìm thấy lô rừng cần sao lưu.');
    const lo = clone(f); lo.id = lo.id || forestId;
    const chu = clone(o); delete chu.forests; chu.id = chu.id || ownerId;
    return {loai: KIND, dinhDang: FORMAT, xuatLuc: opts.now || new Date().toISOString(), phanMem: opts.version || '', maLo: t(lo.info && lo.info.maRung), tenLo: t(lo.info && lo.info.tenRung),
      chuRung: chu, lo, dungChung: sharedFor(db, lo), kiemTra: {nc: (lo.nc || []).length, dx: (lo.dx || []).length, pc: (lo.pc || []).length, tongTan: sumKl(lo.pc)}};
  }
  const body = pkg => JSON.stringify({loai: pkg.loai, dinhDang: pkg.dinhDang, xuatLuc: pkg.xuatLuc, maLo: pkg.maLo, chuRung: pkg.chuRung, lo: pkg.lo, dungChung: pkg.dungChung, kiemTra: pkg.kiemTra});
  /* hash: (chuỗi) → chuỗi hex (SHA-256 do tiến trình chính cung cấp) */
  const seal = (pkg, hash) => Object.assign({}, pkg, {maKiemTra: hash(body(pkg))});
  const fileName = (pkg, day) => 'HAKQN_LoRung_' + (t(pkg.maLo).replace(/[\\/:*?"<>|\s]+/g, '_') || 'KhongMa') + '_' + (day || new Date().toISOString().slice(0, 10)) + '.json';

  /* Đọc và kiểm tra gói. Trả {ok, pkg} hoặc {ok:false, error}. Không ghi gì. */
  function parsePackage(input, hash) {
    let o = input;
    if (typeof input === 'string') { try { o = JSON.parse(input); } catch (e) { return {ok: false, error: 'File không phải JSON hợp lệ (có thể bị hỏng hoặc cắt dở).'}; } }
    if (!o || typeof o !== 'object' || Array.isArray(o)) return {ok: false, error: 'File không đúng định dạng gói sao lưu lô rừng.'};
    if (o.loai !== KIND) return {ok: false, error: o.rs && typeof o.rs === 'object' ? 'Đây là bản sao lưu TOÀN BỘ dữ liệu, không phải gói lô rừng. Dùng “Khôi phục (.json)” trong menu Dữ liệu.' : 'File không phải gói sao lưu lô rừng của HAKQN.'};
    if (typeof o.dinhDang !== 'number' || o.dinhDang !== FORMAT) return {ok: false, error: o.dinhDang > FORMAT ? 'Gói lô rừng do phiên bản phần mềm mới hơn tạo (định dạng ' + o.dinhDang + '). Hãy cập nhật HAKQN rồi thử lại.' : 'Sai phiên bản định dạng gói lô rừng (' + o.dinhDang + ').'};
    if (!o.lo || typeof o.lo !== 'object' || Array.isArray(o.lo) || o.lo.forests || !o.lo.info) return {ok: false, error: 'Gói không chứa đúng một lô rừng.'};
    if (!o.chuRung || typeof o.chuRung !== 'object' || !o.chuRung.info) return {ok: false, error: 'Gói thiếu thông tin nhận diện chủ rừng, không xác định được chủ để khôi phục.'};
    if (!t(o.lo.info.maRung)) return {ok: false, error: 'Gói không có mã lô, không xác định được lô đích.'};
    if (hash) { if (!o.maKiemTra || o.maKiemTra !== hash(body(o))) return {ok: false, error: 'Gói lô rừng bị hỏng hoặc đã bị sửa (mã kiểm tra không khớp).'}; }
    for (const k of ['nc', 'dx', 'pc']) {
      const rows = o.lo[k] == null ? [] : o.lo[k];
      if (!Array.isArray(rows) || rows.some(r => !r || typeof r !== 'object' || Array.isArray(r))) return {ok: false, error: 'Dữ liệu ' + ({nc: 'nhân công', dx: 'xe', pc: 'phiếu cân'}[k]) + ' trong gói bị hỏng (không đúng cấu trúc).'};
    }
    if ((o.lo.pc || []).some(p => p.kl != null && p.kl !== '' && (typeof p.kl !== 'number' || !isFinite(p.kl)))) return {ok: false, error: 'Khối lượng phiếu cân trong gói không phải số, dữ liệu bị hỏng.'};
    if (typeof o.lo.info !== 'object' || Array.isArray(o.lo.info) || (o.lo.exp != null && (typeof o.lo.exp !== 'object' || Array.isArray(o.lo.exp)))) return {ok: false, error: 'Thông tin lô trong gói bị hỏng.'};
    if (o.kiemTra && (o.kiemTra.nc !== (o.lo.nc || []).length || o.kiemTra.dx !== (o.lo.dx || []).length || o.kiemTra.pc !== (o.lo.pc || []).length || o.kiemTra.tongTan !== sumKl(o.lo.pc))) return {ok: false, error: 'Số bản ghi hoặc tổng tấn trong gói không khớp phần kiểm tra: gói bị hỏng hoặc bị sửa.'};
    return {ok: true, pkg: o};
  }

  const vcText = i => { const v = (i && i.vanChuyen) || {}; return v.mode === 'coDinh' ? 'Cước cố định ' + (v.coDinh != null ? v.coDinh : '?') + ' đ/tấn' : v.mode === 'tanKm' ? 'Cước tấn/km ' + (v.donGiaKm != null ? v.donGiaKm : '?') + ' đ/tấn/km, cự ly ' + (i.cuLy != null ? i.cuLy : '?') + ' km' : v.mode === 'tanDoan' ? 'Cước theo bậc cự ly (cách cũ, cần chọn lại)' : 'Chưa chọn cách tính cước'; };
  /* Số liệu một lô để xem trước/đối chiếu trước–sau */
  function lotFigures(f) {
    const i = (f && f.info) || {}, dd = i.muaHang && t(i.muaHang.diaChi) ? t(i.muaHang.ten) + ' – ' + t(i.muaHang.diaChi) : (t(f && f.exp && f.exp.vcDiemDen) ? t(f.exp.vcDiemDen) + ' (nhập tay)' : '');
    return {nc: ((f && f.nc) || []).length, dx: ((f && f.dx) || []).length, pc: ((f && f.pc) || []).length, kl: sumKl(f && f.pc), diemDen: dd, cuoc: vcText(i), donGia: i.donGia != null ? i.donGia : null, giayTo: ((i.giayTo) || []).length};
  }
  /* Xem trước khôi phục lô: cùng quy tắc nhận diện với planImport */
  function planLot(cur, pkg) {
    const o = pkg.chuRung, f = pkg.lo, conflicts = [];
    const mo = matchOwner(cur, o.id, o.info); if (mo.conflict) conflicts.push({loai: 'chu', ten: ownerName(o), moTa: mo.conflict});
    const mf = matchForest(cur, f.id, f.info.maRung); if (mf.conflict) conflicts.push({loai: 'lo', ten: forestLabel(f), moTa: mf.conflict, cacLo: mf.cacLo || null});
    if (!mf.conflict && mf.hit) {
      if (!mo.hit) conflicts.push({loai: 'lo', ten: forestLabel(f), moTa: 'Lô “' + forestLabel(f) + '” đã có trên máy dưới chủ “' + ownerName(cur.rs[mf.hit.owner]) + '”, nhưng chủ “' + ownerName(o) + '” trong gói không khớp hồ sơ nào'});
      else if (mf.hit.owner !== mo.hit) conflicts.push({loai: 'lo', ten: forestLabel(f), moTa: 'Lô “' + forestLabel(f) + '” đã có trên máy dưới chủ “' + ownerName(cur.rs[mf.hit.owner]) + '”, trong gói thuộc chủ “' + ownerName(o) + '” (khớp chủ “' + ownerName(cur.rs[mo.hit]) + '”)'});
    }
    const exists = !conflicts.length && !!mf.hit, ex = exists ? cur.rs[mf.hit.owner].forests[mf.hit.forest] : null;
    const dm = (cur && cur.dinhMuc) || {}, al = (cur && cur.bienAlias) || {}, sh = pkg.dungChung || {}, khac = [], them = [];
    const js = v => JSON.stringify(v);
    Object.entries(sh.dinhMuc || {}).forEach(([k, v]) => {
      if (!(k in dm)) them.push({loai: 'dinhMuc', khoa: k, goi: v, may: null, text: 'Định mức BHLĐ “' + k + '”: máy đích chưa có, sẽ thêm từ gói', anhHuong: 'Bảng cấp phát BHLĐ và hợp đồng lao động của chức danh này'});
      else if (js(dm[k]) !== js(v)) khac.push({loai: 'dinhMuc', khoa: k, goi: v, may: dm[k], text: 'Định mức BHLĐ “' + k + '” khác bản của máy đích: DÙNG BẢN CỦA MÁY ĐÍCH (' + js(dm[k]) + '), gói ghi ' + js(v), anhHuong: 'Bảng cấp phát BHLĐ và hợp đồng lao động của chức danh “' + k + '” có thể khác bản gốc'});
    });
    Object.entries(sh.bienAlias || {}).forEach(([k, v]) => {
      if (!(k in al)) them.push({loai: 'bienAlias', khoa: k, goi: v, may: null, text: 'Ánh xạ biển số “' + k + '” → ' + v + ': máy đích chưa có, sẽ thêm từ gói', anhHuong: 'Ghép biển số khi nhận phiếu cân từ tra cứu'});
      else if (al[k] !== v) khac.push({loai: 'bienAlias', khoa: k, goi: v, may: al[k], text: 'Ánh xạ biển số “' + k + '” khác máy đích: DÙNG BẢN CỦA MÁY ĐÍCH (→ ' + al[k] + '), gói ghi → ' + v, anhHuong: 'Ghép biển số khi nhận phiếu cân từ tra cứu có thể ra biển khác bản gốc; phiếu cân đã lưu trong lô không đổi'});
    });
    const cty = f.info && f.info.muaHang;
    const ghiChu = []; if (cty && cty.congTyId && !((cur.congTy || {})[cty.congTyId])) ghiChu.push('Công ty mua hàng “' + cty.ten + '” chưa có trong danh mục của máy: tên và địa chỉ giao đã chốt vẫn được mang theo, BM-04 xuất đúng.');
    return {ok: !conflicts.length, conflicts, maLo: t(f.info.maRung), tenLo: t(f.info.tenRung), xuatLuc: pkg.xuatLuc,
      chu: {state: mo.hit ? 'co' : 'moi', existingId: mo.hit, ten: ownerName(o), ma: t(o.info.ma)},
      lo: {state: exists ? 'trung' : 'moi', existingId: exists ? mf.hit.forest : null, existingOwner: exists ? mf.hit.owner : null},
      incoming: lotFigures(f),
      existing: ex ? lotFigures(ex) : null,
      giuTrongChu: mo.hit ? forestsOf(cur.rs[mo.hit]).filter(x => !ex || x.id !== ex.id).map(x => ({id: x.id, ma: t(x.info && x.info.maRung), ten: t(x.info && x.info.tenRung)})) : [],
      dungChung: {khac, them}, ghiChu};
  }

  /* Ghi gói vào bản sao dữ liệu: action 'giu' (mặc định, không đổi lô đã có) hoặc 'thay' (chỉ thay đúng lô đó). Mâu thuẫn → ném lỗi. */
  function applyLot(cur, pkg, action, newId) {
    newId = newId || defNewId;
    const plan = planLot(cur, pkg);
    if (!plan.ok) { const e = new Error('Không xác định được lô đích, cần đối chiếu: ' + plan.conflicts.map(c => c.moTa).join(' | ')); e.conflicts = plan.conflicts; throw e; }
    if (plan.lo.state === 'trung' && action !== 'thay') return {next: cur, plan, doi: false};
    const next = clone(cur); next.rs = next.rs || {};
    let oid = plan.chu.existingId;
    if (!oid) { oid = pkg.chuRung.id && !next.rs[pkg.chuRung.id] ? pkg.chuRung.id : newId('r'); next.rs[oid] = Object.assign(clone(pkg.chuRung), {id: oid, forests: {}}); }
    const owner = next.rs[oid]; owner.forests = owner.forests || {};
    const fid = plan.lo.existingId || pkg.lo.id;
    owner.forests[fid] = Object.assign(clone(pkg.lo), {id: fid});
    const sh = pkg.dungChung || {};
    // Thiết lập dùng chung: giữ của máy đích, chỉ BỔ SUNG mục máy chưa có. Không tạo khóa rỗng (khóa dinhMuc có mặt sẽ chặn định mức mặc định của máy).
    Object.entries(sh.dinhMuc || {}).forEach(([k, v]) => { if (!next.dinhMuc || !(k in next.dinhMuc)) { next.dinhMuc = next.dinhMuc || {}; next.dinhMuc[k] = clone(v); } });
    Object.entries(sh.bienAlias || {}).forEach(([k, v]) => { if (!next.bienAlias || !(k in next.bienAlias)) { next.bienAlias = next.bienAlias || {}; next.bienAlias[k] = v; } });
    return {next, plan, doi: true, ownerId: oid, forestId: fid};
  }

  const api = {KIND, FORMAT, maKey, lotsByMa, maTrung, goiYMa, duplicateGroups, renameLot, matchOwner, matchForest, planImport, mergeImport, exportLot, seal, body, fileName, parsePackage, planLot, applyLot, sumKl};
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.HAKLoRung = api;
})(typeof self !== 'undefined' ? self : this);
