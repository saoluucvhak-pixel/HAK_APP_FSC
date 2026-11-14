/* Bản nháp (“Chưa lưu”) của nhân công, xe và phiếu cân trong MỘT lô rừng.
 * Mọi nguồn (nhập tay, Excel, bản tra cứu Google Sheets) chỉ thay đổi BẢN NHÁP; hồ sơ lô chỉ đổi khi người dùng bấm “Lưu dữ liệu vào lô”.
 *  - create(saved): bản nháp = bản sao danh sách đã lưu, mỗi dòng có _id ổn định để so sánh.
 *  - merge(...): gộp dòng nhập theo khóa nghiệp vụ (nhân công: CCCD hoặc họ tên; xe: biển số đã chuẩn hóa; phiếu: số phiếu). Dòng đã lưu mà file không có thì GIỮ NGUYÊN.
 *  - diff(...): trạng thái từng dòng so với bản đã lưu: new | changed | same | removed.
 *  - đổi biển số xe cập nhật các phiếu cân liên kết và không đổi số chuyến, khối lượng, tiền; xóa xe còn phiếu liên kết bị chặn và liệt kê các phiếu.
 *  - commit(...): danh sách mới + nhật ký đổi biển để ghi vào lô trong một giao dịch.
 * Hàm thuần, không đụng giao diện hay cơ sở dữ liệu. */
(function (root) {
  const bienKey = v => String(v || '').toUpperCase().replace(/[\s.\-]/g, '');
  const fold = v => String(v == null ? '' : v).trim().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd').toLowerCase().replace(/\s+/g, ' ');
  const cccd = v => { const d = String(v == null ? '' : v).replace(/\D/g, ''); return d && d.length < 12 ? d.padStart(12, '0') : d; };
  const KEY = {
    nc: r => cccd(r.cccd) || fold(r.ten),
    dx: r => bienKey(r.bienSo),
    pc: r => String(r.soPhieu == null ? '' : r.soPhieu).trim().toUpperCase()
  };
  const KINDS = ['nc', 'dx', 'pc'];
  const sig = r => JSON.stringify(Object.keys(r).filter(k => k[0] !== '_').sort().map(k => [k, r[k]]));
  const clone = x => JSON.parse(JSON.stringify(x));
  /* _id nội bộ: duy nhất trong TOÀN BỘ lô (nhân công, xe, phiếu cân; bản đã lưu lẫn bản nháp, kể cả dòng chờ xóa có thể hoàn tác).
   * Chuẩn hóa dữ liệu cũ khi tạo bản nháp: giữ _id hợp lệ đầu tiên, dòng thiếu hoặc trùng _id được cấp _id mới; không đổi nội dung, thứ tự hay liên kết xe–phiếu. */
  const usedIds = st => { const u = new Set(); KINDS.forEach(k => { (st.base[k] || []).forEach(r => r._id && u.add(r._id)); (st.cur[k] || []).forEach(r => r._id && u.add(r._id)); }); return u; };
  function newId(st) { const u = usedIds(st); let id; do { id = 'n' + (++st.seq); } while (u.has(id)); return id; }
  function create(saved) {
    const st = {seq: 0, base: {}, cur: {}, src: {}}, seen = new Set(), todo = [];
    KINDS.forEach(k => { st.base[k] = (saved && saved[k] || []).map(r => { const c = clone(r); if (typeof c._id === 'string' && c._id && !seen.has(c._id)) seen.add(c._id); else todo.push(c); return c; }); });
    st.cur = {}; KINDS.forEach(k => { st.base[k].forEach(r => { if (todo.includes(r)) delete r._id; }); });
    KINDS.forEach(k => { st.cur[k] = clone(st.base[k]); st.src[k] = ''; });   // tạm: để newId thấy các _id đang dùng
    KINDS.forEach(k => st.base[k].forEach((r, i) => { if (!r._id) { r._id = newId(st); st.cur[k][i]._id = r._id; } }));
    return st;
  }
  /* kiểm tra trước khi ghi: _id thiếu hoặc trùng trong danh sách sẽ ghi (nháp). Trả về nhóm và các dòng bị ảnh hưởng. */
  const GROUP = {nc: 'nhân công', dx: 'xe', pc: 'phiếu cân'};
  function idConflicts(st) {
    const at = new Map(), out = [];
    KINDS.forEach(k => st.cur[k].forEach((r, i) => { const id = r._id; if (!id) { out.push({kind: k, group: GROUP[k], id: '', rows: [rowLabel(k, r, i)]}); return; } if (!at.has(id)) at.set(id, []); at.get(id).push({k, r, i}); }));
    at.forEach((l, id) => { if (l.length > 1) { const g = [...new Set(l.map(x => GROUP[x.k]))]; out.push({kind: l[0].k, group: g.join(' / '), id, rows: l.map(x => (g.length > 1 ? GROUP[x.k] + ' ' : '') + rowLabel(x.k, x.r, x.i))}); } });
    return out;
  }
  const rowLabel = (k, r, i) => 'dòng ' + (r._row || i + 1) + ' (' + (k === 'pc' ? 'phiếu ' + (r.soPhieu || '?') : k === 'dx' ? 'xe ' + (r.bienSo || '?') : (r.ten || r.cccd || '?')) + ')';
  /* số dòng hiển thị: dòng mới nhận số lớn hơn mọi dòng hiện có (thông báo lỗi “Dòng n” không nhầm giữa các nguồn); số dòng của file nhập được giữ ở _srcRow */
  const nextRow = list => list.reduce((m, r) => Math.max(m, +r._row || 0), 1) + 1;
  /* gộp các dòng nhập (đã chuẩn hóa) vào bản nháp. opt.keepBlank: ô trống của dòng nhập không xóa giá trị đang có (dùng cho bản tra cứu). opt.source: nhãn nguồn. */
  function merge(st, kind, rows, opt) {
    opt = opt || {}; const list = st.cur[kind], key = KEY[kind], rep = {add: 0, upd: 0, same: 0, kept: 0, ids: [], dupInFile: []};
    const seenInFile = new Map(), touched = new Set();
    rows.forEach(r0 => {
      const r = clone(r0), k = key(r); if (opt.source) r._nguon = opt.source;
      if (k) { if (seenInFile.has(k)) rep.dupInFile.push(k); seenInFile.set(k, (seenInFile.get(k) || 0) + 1); }
      const i = k && !(seenInFile.get(k) > 1) ? list.findIndex(x => key(x) === k) : -1;
      if (i < 0) { r._id = newId(st); r._srcRow = r._row; r._row = nextRow(list); list.push(r); rep.add++; rep.ids.push(r._id); return; }
      const old = list[i]; touched.add(old._id);
      const next = opt.keepBlank ? Object.assign({}, old, Object.fromEntries(Object.entries(r).filter(([f, v]) => f[0] === '_' ? f !== '_id' && f !== '_row' : !(v === '' || v === null || v === undefined)))) : Object.assign({}, r, {_row: old._row != null ? old._row : r._row});
      next._id = old._id;
      // trường tạo nên khóa chỉ khác cách viết (hoa/thường, dấu chấm, số 0 đầu) thì giữ cách viết đã lưu: không coi là thay đổi
      const kf = kind === 'pc' ? 'soPhieu' : kind === 'dx' ? 'bienSo' : (cccd(r.cccd) ? 'cccd' : 'ten'); if (old[kf] !== undefined && old[kf] !== '') next[kf] = old[kf];
      if (kind === 'pc' && bienKey(old.bienSo) !== bienKey(next.bienSo) && next.bienSo) next._plateSrc = opt.plateSource || opt.source || 'Nhập';
      if (sig(next) === sig(old)) { rep.same++; return; }
      list[i] = next; rep.upd++; rep.ids.push(next._id);
    });
    rep.kept = list.filter(x => !touched.has(x._id) && !rep.ids.includes(x._id) && st.base[kind].some(b => b._id === x._id)).length;
    st.src[kind] = opt.source || st.src[kind];
    return rep;
  }
  function addRow(st, kind, row) { const r = clone(row); r._id = newId(st); r._row = nextRow(st.cur[kind]); st.cur[kind].push(r); return r._id; }
  function updateRow(st, kind, id, row) {
    const i = st.cur[kind].findIndex(x => x._id === id); if (i < 0) return {ok: false, error: 'Không tìm thấy dòng.'};
    const old = st.cur[kind][i], next = Object.assign({}, clone(row), {_id: id}); if (old._row != null && next._row == null) next._row = old._row;
    if (kind === 'dx' && bienKey(old.bienSo) !== bienKey(next.bienSo)) {   // đổi biển số xe: các phiếu cân liên kết đổi theo, số chuyến và khối lượng không đổi
      const linked = linkedPc(st, old.bienSo); linked.forEach(p => { p.bienSo = next.bienSo; p._plateSrc = 'Sửa biển số xe'; });
      next._renamedFrom = old._renamedFrom || old.bienSo; st.cur.dx[i] = next; return {ok: true, linked: linked.map(p => p.soPhieu)};
    }
    if (kind === 'pc' && bienKey(old.bienSo) !== bienKey(next.bienSo)) next._plateSrc = 'Sửa tay';
    st.cur[kind][i] = next; return {ok: true, linked: []};
  }
  /* các phiếu cân (bản nháp) đang dùng biển số này */
  function linkedPc(st, bienSo) { const k = bienKey(bienSo); return k ? st.cur.pc.filter(p => bienKey(p.bienSo) === k) : []; }
  /* gỡ một dòng khỏi bản nháp. Xe còn phiếu liên kết thì chặn và liệt kê phiếu: phải xử lý phiếu trước. */
  function removeRow(st, kind, id) {
    const i = st.cur[kind].findIndex(x => x._id === id); if (i < 0) return {ok: false, error: 'Không tìm thấy dòng.', linked: []};
    if (kind === 'dx') { const l = linkedPc(st, st.cur.dx[i].bienSo); if (l.length) return {ok: false, error: 'Xe ' + st.cur.dx[i].bienSo + ' còn ' + l.length + ' phiếu cân liên kết: xử lý các phiếu này trước.', linked: l.map(p => p.soPhieu)}; }
    st.cur[kind].splice(i, 1); return {ok: true, linked: []};
  }
  /* hoàn tác một dòng đã bị gỡ (chỉ với dòng đã lưu) */
  function restoreRow(st, kind, id) { const b = st.base[kind].find(x => x._id === id); if (!b || st.cur[kind].some(x => x._id === id)) return false; st.cur[kind].push(clone(b)); return true; }
  function diff(st, kind) {
    const baseById = new Map(st.base[kind].map(r => [r._id, r])), rows = st.cur[kind].map(r => { const b = baseById.get(r._id); return {row: r, status: !b ? 'new' : sig(b) === sig(r) ? 'same' : 'changed', old: b || null}; });
    const curIds = new Set(st.cur[kind].map(r => r._id)); st.base[kind].filter(b => !curIds.has(b._id)).forEach(b => rows.push({row: b, status: 'removed', old: b}));
    return rows;
  }
  const counts = (st, kind) => diff(st, kind).reduce((a, d) => { a[d.status]++; return a; }, {new: 0, changed: 0, same: 0, removed: 0});
  const dirty = (st, kind) => !st ? false : (kind ? KINDS.filter(k => k === kind) : KINDS).some(k => { const c = counts(st, k); return c.new + c.changed + c.removed > 0; });
  const dirtyKinds = st => st ? KINDS.filter(k => dirty(st, k)) : [];
  /* danh sách để ghi vào lô + nhật ký đổi biển số (phiếu đã lưu mà biển số đổi so với bản đã lưu) */
  function commit(st) {
    const out = {}, bienLog = [], at = new Date().toISOString(), baseById = new Map(st.base.pc.map(r => [r._id, r]));
    KINDS.forEach(k => { out[k] = st.cur[k].map(r => { const c = clone(r); delete c._plateSrc; delete c._renamedFrom; delete c._nguon; return c; }); });
    st.cur.pc.forEach(r => { const b = baseById.get(r._id); if (b && bienKey(b.bienSo) !== bienKey(r.bienSo)) bienLog.push({soPhieu: r.soPhieu, ngay: r.ngay, kl: typeof r.kl === 'number' ? r.kl : 0, cu: b.bienSo || '', moi: r.bienSo, at, nguon: r._plateSrc || 'Sửa tay'}); });
    return {lists: out, bienLog};
  }
  const api = {KEY, KINDS, create, merge, addRow, updateRow, removeRow, restoreRow, linkedPc, diff, counts, dirty, dirtyKinds, commit, sig, bienKey, idConflicts};
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.HAKStage = api;
})(typeof window !== 'undefined' ? window : globalThis);
