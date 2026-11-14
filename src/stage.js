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
    const st = {seq: 0, base: {}, cur: {}, src: {}, pending: [], report: {}}, seen = new Set(), todo = [];
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
  /* ===== Quy tắc gộp chung cho Excel và Google Sheets (nhân công, xe, phiếu cân) =====
   * - Ô nguồn trống hoặc cột vắng mặt: GIỮ giá trị hiện có. Không bao giờ xóa trường qua nhập file; muốn xóa thì sửa tay (hộp thoại Sửa).
   * - Giá trị 0 là giá trị thật nếu trường cho phép (cân lần 1/2, kg); trường bắt buộc > 0 (tấn) hoặc tiền thì 0 là sai.
   * - Giá trị sai định dạng: KHÔNG áp dụng, giữ giá trị hiện có và báo lỗi theo dòng, cột (vào giaLoi của dòng; chặn lưu cho đến khi sửa).
   * - Trường người dùng đã sửa tay trong bản nháp (_tay) không bị file ghi đè.
   * - Phiếu cân cùng số phiếu nhưng khác ngày, biển số, nơi cân hoặc khối lượng: “Cần đối chiếu” (st.pending), chưa áp dụng gì. */
  const isBlank = v => v === '' || v == null || (typeof v === 'string' && !v.trim()) || (Array.isArray(v) && !v.length);
  const LABEL = {
    pc: {ngay: 'Ngày cân', ngay2: 'Ngày cân 2', gioCan1: 'Giờ cân 1', gioCan2: 'Giờ cân 2', bienSo: 'Biển số', soPhieu: 'Số phiếu', can1: 'Cân lần 1 (kg)', can2: 'Cân lần 2 (kg)', klKg: 'Khối lượng (kg)', kl: 'Khối lượng (tấn)', khachHang: 'Khách hàng', diaChi: 'Địa chỉ rừng', nguonGoc: 'Nguồn gốc', soCT: 'Số chứng từ', trangThai: 'Trạng thái', donGia: 'Đơn giá', thanhTien: 'Thành tiền', noiGiao: 'Nơi giao', noiCan: 'Nơi cân', ghiChu: 'Ghi chú', maRung: 'Mã rừng', stt: 'STT'},
    dx: {bienSo: 'Biển số', chuXe: 'Chủ xe', ngaySinh: 'Ngày sinh', cccd: 'CCCD', ngayCap: 'Ngày cấp', noiCap: 'Nơi cấp', diaChi: 'Địa chỉ', loaiXe: 'Loại xe', nguoiKy: 'Người ký', taiXe: 'Tài xế', sdt: 'Điện thoại', maRung: 'Mã rừng', stt: 'STT'},
    nc: {ten: 'Họ tên', vaiTro: 'Vai trò', danhXung: 'Danh xưng', ngaySinh: 'Ngày sinh', cccd: 'CCCD', ngayCap: 'Ngày cấp', noiCap: 'Nơi cấp', diaChi: 'Địa chỉ', chucDanh: 'Chức danh', maRung: 'Mã rừng', stt: 'STT'}
  };
  const labelOf = (kind, f) => (LABEL[kind] && LABEL[kind][f]) || f;
  /* giá trị không hợp lệ theo quy tắc của trường: 'x' là dấu bộ đọc đặt cho số sai; khối lượng tấn phải > 0; cân/kg không âm */
  function invalid(kind, f, v) {
    if (kind === 'pc' && v === 'x' && (f === 'kl' || f === 'can1' || f === 'can2' || f === 'klKg')) return true;   // 'x' là dấu bộ đọc đặt cho số sai (chỉ các trường số)
    if (kind === 'pc') { if (f === 'kl') return typeof v === 'number' && !(v > 0); if (f === 'can1' || f === 'can2' || f === 'klKg') return typeof v === 'number' && v < 0; }
    return false;
  }
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  const SKIP = {_id: 1, _row: 1, _srcRow: 1, _tay: 1, _ngay2Suy: 1};
  /* trường nhận diện chuyến cân: khác nhau ở một trong các trường này (bên nhập có giá trị) nghĩa là chưa chắc cùng một chuyến */
  const IDENT = [['ngay', 'Ngày cân'], ['bienSo', 'Biển số'], ['noiCan', 'Nơi cân'], ['kl', 'Khối lượng (tấn)']];
  const identEq = (f, a, b) => f === 'bienSo' ? bienKey(a) === bienKey(b) : f === 'noiCan' ? fold(a) === fold(b) : f === 'kl' ? Math.round((+a || 0) * 1000) === Math.round((+b || 0) * 1000) : String(a == null ? '' : a).trim() === String(b == null ? '' : b).trim();
  const identDiffs = (old, inc) => IDENT.filter(([f]) => !isBlank(inc[f]) && !invalid('pc', f, inc[f]) && !isBlank(old[f]) && !identEq(f, old[f], inc[f])).map(([f, label]) => ({f, label, cu: old[f], moi: inc[f]}));
  /* áp dụng dòng nhập lên dòng đang có theo quy tắc trên; trả về danh sách thay đổi từng trường */
  function applyInto(kind, old, inc, opt) {
    const next = clone(old), fields = [], errs = [], tay = old._tay || [];
    // ngày cân 2 do phần mềm suy ra từ nguồn (opt.suy) không được ghi đè ngày cân 2 NHẬP THẬT đã có (khác số suy ra của chính phiếu cũ)
    const khongGhiNgay2 = kind === 'pc' && opt.suy && opt.suyFn && !isBlank(old.ngay2) && old.ngay2 !== opt.suyFn(old.ngay, old.gioCan1, old.gioCan2);
    Object.keys(inc).forEach(f => {
      if (SKIP[f] || f === 'giaLoi') return;
      if (khongGhiNgay2 && f === 'ngay2') return;
      const v = inc[f];
      if (f[0] === '_') { if (!isBlank(v)) next[f] = clone(v); return; }
      if (invalid(kind, f, v)) { errs.push({f, label: labelOf(kind, f), v}); fields.push({f, label: labelOf(kind, f), cu: old[f], moi: v === 'x' ? '(không hợp lệ)' : v, act: 'loi'}); return; }
      if (isBlank(v)) { if (!isBlank(old[f])) fields.push({f, label: labelOf(kind, f), cu: old[f], moi: '', act: 'giu-trong'}); return; }
      if (same(old[f], v)) return;
      if (tay.includes(f)) { fields.push({f, label: labelOf(kind, f), cu: old[f], moi: v, act: 'giu-tay'}); return; }
      next[f] = clone(v); fields.push({f, label: labelOf(kind, f), cu: old[f], moi: v, act: 'doi'});
    });
    const src = inc._srcRow != null ? inc._srcRow : inc._row;
    const msgs = (inc.giaLoi || []).concat(errs.map(e => labelOf(kind, e.f) + ' không hợp lệ (' + (typeof e.v === 'number' ? e.v : 'sai định dạng') + '): giữ giá trị đang có')).map(m => (opt.source && src != null ? 'Dòng ' + src + ' của file: ' : '') + m);
    if (msgs.length) next.giaLoi = msgs; else if (old.giaLoi && old.giaLoi.length) next.giaLoi = [];
    return {next, fields};
  }
  function merge(st, kind, rows, opt) {
    opt = opt || {}; const list = st.cur[kind], key = KEY[kind], rep = {add: 0, upd: 0, same: 0, kept: 0, ids: [], dupInFile: [], changes: [], pending: 0, errors: 0};
    const seenInFile = new Map(), touched = new Set(); st.pending = st.pending || [];
    rows.forEach(r0 => {
      const r = clone(r0), k = key(r), suy = !!r._ngay2Suy; delete r._ngay2Suy; if (opt.source) r._nguon = opt.source;
      if (k) { if (seenInFile.has(k)) rep.dupInFile.push(k); seenInFile.set(k, (seenInFile.get(k) || 0) + 1); }
      const dup2 = k && seenInFile.get(k) > 1;
      const matches = k && !dup2 ? list.filter(x => key(x) === k) : [];
      const addNew = () => { r._id = newId(st); r._srcRow = r._row; r._row = nextRow(list); list.push(r); rep.add++; rep.ids.push(r._id); };
      if (!matches.length) return addNew();
      let target = null;
      if (kind === 'pc' && !opt.sameTrip) {
        const equal = matches.filter(m => !identDiffs(m, r).length);
        if (equal.length) target = equal[0];
        else {   // chưa đủ căn cứ là cùng chuyến: để chờ đối chiếu, không đổi gì
          const diffs = identDiffs(matches[0], r), sig0 = sig(r);
          if (!st.pending.some(p => p.kind === kind && p.key === k && p.sig === sig0)) st.pending.push({pid: 'q' + (++st.seq) + '_' + st.pending.length, kind, key: k, source: opt.source || '', incoming: r, sig: sig0, suy, candidates: matches.map(m => m._id), diffs});
          rep.pending++; return;
        }
      } else target = matches.find(m => !identDiffs(m, r).length) || matches[0];
      touched.add(target._id);
      const {next, fields} = applyInto(kind, target, r, Object.assign({}, opt, {suy, suyFn: opt.suyNgay2}));
      // trường tạo nên khóa chỉ khác cách viết (hoa/thường, dấu chấm, số 0 đầu) thì giữ cách viết đã lưu: không coi là thay đổi
      const kf = kind === 'pc' ? 'soPhieu' : kind === 'dx' ? 'bienSo' : (cccd(r.cccd) ? 'cccd' : 'ten'); if (target[kf] !== undefined && target[kf] !== '') next[kf] = target[kf];
      if (kind === 'pc' && bienKey(target.bienSo) !== bienKey(next.bienSo) && next.bienSo) next._plateSrc = opt.plateSource || opt.source || 'Nhập';
      next._id = target._id; if (target._row != null) next._row = target._row;
      const errCount = fields.filter(f => f.act === 'loi').length; rep.errors += errCount;
      if (fields.length) rep.changes.push({id: target._id, key: k, source: opt.source || '', fields});
      if (sig(next) === sig(target)) { rep.same++; return; }
      list[list.findIndex(x => x._id === target._id)] = next; rep.upd++; rep.ids.push(next._id);
    });
    rep.kept = list.filter(x => !touched.has(x._id) && !rep.ids.includes(x._id) && st.base[kind].some(b => b._id === x._id)).length;
    st.src[kind] = opt.source || st.src[kind]; if (opt.suyNgay2) st.suyNgay2 = opt.suyNgay2;
    st.report = st.report || {}; st.report[kind] = rep;
    return rep;
  }
  /* các dòng nhập đang chờ đối chiếu */
  const pendingOf = (st, kind) => (st.pending || []).filter(p => !kind || p.kind === kind);
  /* xử lý một dòng chờ đối chiếu: keep (giữ bản hiện có), drop (bỏ dòng nguồn), update (cùng chuyến → cập nhật, opt.targetId nếu nhiều ứng viên), other (chuyến khác: bắt buộc số phiếu mới chưa dùng) */
  function resolve(st, pid, action, opt) {
    opt = opt || {}; const i = (st.pending || []).findIndex(p => p.pid === pid); if (i < 0) return {ok: false, error: 'Không còn dòng chờ đối chiếu này.'};
    const p = st.pending[i], list = st.cur[p.kind];
    if (action === 'keep' || action === 'drop') { st.pending.splice(i, 1); return {ok: true}; }
    if (action === 'update') {
      const cands = p.candidates.filter(id => list.some(x => x._id === id)); const tid = opt.targetId || (cands.length === 1 ? cands[0] : null);
      if (!tid || !cands.includes(tid)) return {ok: false, error: cands.length > 1 ? 'Có nhiều bản ghi cùng số phiếu: chọn bản cần cập nhật.' : 'Bản ghi cần cập nhật không còn.'};
      const old = list.find(x => x._id === tid), {next} = applyInto(p.kind, old, p.incoming, {source: p.source, suy: p.suy, suyFn: st.suyNgay2}); next._id = tid; next._row = old._row;
      if (p.kind === 'pc' && bienKey(old.bienSo) !== bienKey(next.bienSo) && next.bienSo) next._plateSrc = p.source || 'Nhập';
      list[list.findIndex(x => x._id === tid)] = next; st.pending.splice(i, 1); return {ok: true, id: tid};
    }
    if (action === 'other') {
      const so = String(opt.soPhieu == null ? '' : opt.soPhieu).trim(); if (!so) return {ok: false, error: 'Chuyến khác phải có số phiếu riêng: nhập số phiếu mới.'};
      if (list.some(x => KEY.pc(x) === so.toUpperCase()) || (st.pending || []).some(q => q !== p && q.kind === p.kind && q.key === so.toUpperCase())) return {ok: false, error: 'Số phiếu ' + so + ' đã có trong lô.'};
      const r = clone(p.incoming); r.soPhieu = so; r._id = newId(st); r._srcRow = r._row; r._row = nextRow(list); list.push(r); st.pending.splice(i, 1); return {ok: true, id: r._id};
    }
    return {ok: false, error: 'Lựa chọn không hợp lệ.'};
  }
  function addRow(st, kind, row) { const r = clone(row); r._id = newId(st); r._row = nextRow(st.cur[kind]); st.cur[kind].push(r); return r._id; }
  function updateRow(st, kind, id, row) {
    const i = st.cur[kind].findIndex(x => x._id === id); if (i < 0) return {ok: false, error: 'Không tìm thấy dòng.'};
    const old = st.cur[kind][i], next = Object.assign({}, clone(row), {_id: id}); if (old._row != null && next._row == null) next._row = old._row;
    const tay = new Set(old._tay || []); Object.keys(next).forEach(f => { if (f[0] !== '_' && f !== 'giaLoi' && !same(old[f], next[f])) tay.add(f); }); if (tay.size) next._tay = [...tay];   // trường sửa tay: nhập file sau đó không ghi đè
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
  const dirty = (st, kind) => !st ? false : (kind ? KINDS.filter(k => k === kind) : KINDS).some(k => { const c = counts(st, k); return c.new + c.changed + c.removed > 0 || pendingOf(st, k).length > 0; });
  const dirtyKinds = st => st ? KINDS.filter(k => dirty(st, k)) : [];
  /* danh sách để ghi vào lô + nhật ký đổi biển số (phiếu đã lưu mà biển số đổi so với bản đã lưu) */
  function commit(st, fixPc) {
    const out = {}, bienLog = [], at = new Date().toISOString(), baseById = new Map(st.base.pc.map(r => [r._id, r]));
    KINDS.forEach(k => { out[k] = st.cur[k].map(r => { const c = clone(r); if (k === 'pc' && fixPc) fixPc(c); delete c._plateSrc; delete c._renamedFrom; delete c._nguon; delete c._tay; return c; }); });
    st.cur.pc.forEach(r => { const b = baseById.get(r._id); if (b && bienKey(b.bienSo) !== bienKey(r.bienSo)) bienLog.push({soPhieu: r.soPhieu, ngay: r.ngay, kl: typeof r.kl === 'number' ? r.kl : 0, cu: b.bienSo || '', moi: r.bienSo, at, nguon: r._plateSrc || 'Sửa tay'}); });
    return {lists: out, bienLog};
  }
  const api = {KEY, KINDS, create, merge, addRow, updateRow, removeRow, restoreRow, linkedPc, diff, counts, dirty, dirtyKinds, commit, sig, bienKey, idConflicts, pendingOf, resolve, isBlank, labelOf};
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.HAKStage = api;
})(typeof window !== 'undefined' ? window : globalThis);
