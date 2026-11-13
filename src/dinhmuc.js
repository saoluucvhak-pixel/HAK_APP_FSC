/* Định mức BHLĐ theo vị trí (chức danh) có HIỆU LỰC TỪ NGÀY, và danh sách vị trí có thể thêm. Hàm thuần, thao tác trên đối tượng db.
 *  - db.dinhMuc / db.dinhMucTu: bản gốc (dữ liệu cũ giữ nguyên); db.dinhMucTu = ngày hiệu lực dd/mm/yyyy ('' = áp dụng từ trước đến nay).
 *  - db.dinhMucBan: [{tuNgay, dm: {vị trí: {qa, giay, mu, gang, nut, kinh}}}] các bản có hiệu lực từ ngày muộn hơn.
 *  - db.chucDanhThem: các vị trí người dùng thêm (ngoài ba vị trí mặc định).
 * Một biểu mẫu dùng bản có ngày hiệu lực lớn nhất không vượt quá ngày tham chiếu của biểu mẫu (ngày cấp phát BHLĐ, ngày hợp đồng lao động…). */
(function (root) {
  const D = (typeof require !== 'undefined') ? require('./dates') : root.HAKDates;
  const BASE = ['Tổ trưởng', 'Công nhân khai thác', 'Công nhân cưa'];
  const trim = s => String(s == null ? '' : s).replace(/\s+/g, ' ').trim();
  const keyOf = t => (t ? D.key(t) : 0);

  /* các vị trí: ba mặc định + vị trí thêm + khóa có trong các bản định mức (để lô khôi phục từ máy khác vẫn nhận đủ vị trí) */
  function allPositions(db) {
    const out = [];
    const add = n => { n = trim(n); if (n && !out.includes(n)) out.push(n); };
    BASE.forEach(add); (db.chucDanhThem || []).forEach(add);
    Object.keys(db.dinhMuc || {}).forEach(add); (db.dinhMucBan || []).forEach(v => Object.keys(v.dm || {}).forEach(add));
    return out;
  }
  /* các bản, sắp theo ngày hiệu lực tăng dần. id: 'b' (bản gốc) hoặc 'i<chỉ số trong dinhMucBan>' */
  function versions(db) {
    const list = [{id: 'b', base: true, tuNgay: trim(db.dinhMucTu), key: keyOf(trim(db.dinhMucTu)), dm: db.dinhMuc || {}}];
    (db.dinhMucBan || []).forEach((v, i) => list.push({id: 'i' + i, base: false, tuNgay: trim(v.tuNgay), key: keyOf(trim(v.tuNgay)), dm: v.dm || {}}));
    return list.map((v, n) => ({v, n})).sort((a, b) => a.v.key - b.v.key || a.n - b.n).map(x => x.v);
  }
  const byId = (db, id) => versions(db).find(v => v.id === id) || null;
  /* bản có hiệu lực tại ngày ref (dd/mm/yyyy). Không có ngày hợp lệ → bản mới nhất. Trả {ver, found, noDate, earliest} */
  function pick(db, ref) {
    const vs = versions(db), rk = keyOf(trim(ref));
    if (!rk) return {ver: vs[vs.length - 1], found: true, noDate: true, earliest: vs[0]};
    let ver = null; vs.forEach(v => { if (v.key <= rk) ver = v; });
    return {ver, found: !!ver, noDate: false, earliest: vs[0]};
  }
  /* định mức của một vị trí tại ngày ref */
  function normFor(db, cd, ref) { const p = pick(db, ref); return {norm: (p.ver && p.ver.dm[cd]) || {}, pick: p}; }

  /* ---- thao tác ---- */
  function addVersion(db, tuNgay, fromId) {
    tuNgay = trim(tuNgay); const p = D.parse(tuNgay);
    if (!p) return {ok: false, error: 'Ngày hiệu lực phải đúng dd/mm/yyyy và có thật trên lịch'};
    const norm = D.format(p);
    if (versions(db).some(v => v.key === p.key)) return {ok: false, error: 'Đã có bản định mức hiệu lực từ ngày ' + norm};
    const src = byId(db, fromId) || versions(db)[versions(db).length - 1];
    db.dinhMucBan = (db.dinhMucBan || []).concat([{tuNgay: norm, dm: JSON.parse(JSON.stringify(src.dm || {}))}]);
    return {ok: true, id: 'i' + (db.dinhMucBan.length - 1)};
  }
  function setDate(db, id, tuNgay) {
    tuNgay = trim(tuNgay); const v = byId(db, id); if (!v) return {ok: false, error: 'Không có bản định mức này'};
    if (!tuNgay) { if (!v.base) return {ok: false, error: 'Bản định mức phải có ngày hiệu lực'}; db.dinhMucTu = ''; return {ok: true}; }
    const p = D.parse(tuNgay); if (!p) return {ok: false, error: 'Ngày hiệu lực phải đúng dd/mm/yyyy và có thật trên lịch'};
    if (versions(db).some(x => x.id !== id && x.key === p.key)) return {ok: false, error: 'Đã có bản định mức hiệu lực từ ngày ' + D.format(p)};
    if (v.base) db.dinhMucTu = D.format(p); else db.dinhMucBan[+id.slice(1)].tuNgay = D.format(p);
    return {ok: true};
  }
  function setNorm(db, id, dm) {   // dm: {vị trí: {khoá: giá trị}}
    const v = byId(db, id); if (!v) return {ok: false, error: 'Không có bản định mức này'};
    if (v.base) db.dinhMuc = dm; else db.dinhMucBan[+id.slice(1)].dm = dm;
    return {ok: true};
  }
  function removeVersion(db, id) {
    const v = byId(db, id); if (!v) return {ok: false, error: 'Không có bản định mức này'};
    if (v.base) return {ok: false, error: 'Không xóa được bản gốc'};
    db.dinhMucBan = db.dinhMucBan.filter((_, i) => i !== +id.slice(1)); return {ok: true};
  }
  function addPosition(db, name) {
    name = trim(name); if (!name) return {ok: false, error: 'Nhập tên vị trí'};
    if (name.length > 60) return {ok: false, error: 'Tên vị trí tối đa 60 ký tự'};
    if (allPositions(db).some(x => x.toLowerCase() === name.toLowerCase())) return {ok: false, error: 'Vị trí “' + name + '” đã có'};
    if (/^tổ trưởng/i.test(name)) return {ok: false, error: 'Tên vị trí không được bắt đầu bằng “Tổ trưởng” (đã có vị trí Tổ trưởng)'};
    db.chucDanhThem = (db.chucDanhThem || []).concat([name]); return {ok: true, name};
  }
  /* xóa vị trí thêm (không xóa ba vị trí mặc định); inUse(name) = true nếu còn người đang giữ vị trí đó */
  function removePosition(db, name, inUse) {
    if (BASE.includes(name)) return {ok: false, error: 'Không xóa được vị trí mặc định'};
    if (inUse && inUse(name)) return {ok: false, error: 'Còn nhân công đang giữ vị trí “' + name + '”, chuyển họ sang vị trí khác trước'};
    db.chucDanhThem = (db.chucDanhThem || []).filter(x => x !== name);
    if (db.dinhMuc) delete db.dinhMuc[name]; (db.dinhMucBan || []).forEach(v => { if (v.dm) delete v.dm[name]; });
    return {ok: true};
  }

  /* ===== Định mức gỗ keo: 1 ha = ? tấn, có hiệu lực từ ngày (db.dinhMucKeo = [{tuNgay, tanHa}]) =====
   * Rừng lấy định mức này làm MẶC ĐỊNH khi chưa tự điền định mức của riêng rừng. */
  const keoItems = db => (db.dinhMucKeo || []).map((x, i) => ({id: i, tuNgay: trim(x.tuNgay), key: keyOf(trim(x.tuNgay)), tanHa: x.tanHa})).sort((a, b) => a.key - b.key || a.id - b.id);
  /* ref (dd/mm/yyyy) không hợp lệ hoặc trống → bản mới nhất. Trả {item, found, noDate} */
  function keoPick(db, ref) {
    const list = keoItems(db), rk = keyOf(trim(ref));
    if (!list.length) return {item: null, found: false, noDate: !rk};
    if (!rk) return {item: list[list.length - 1], found: true, noDate: true};
    let it = null; list.forEach(x => { if (x.key <= rk) it = x; });
    return {item: it, found: !!it, noDate: false, earliest: list[0]};
  }
  function keoCheck(tuNgay, tanHa) {
    const p = D.parse(trim(tuNgay)); if (!p) return {error: 'Ngày hiệu lực phải đúng dd/mm/yyyy và có thật trên lịch'};
    const n = typeof tanHa === 'number' ? tanHa : Number(String(tanHa).replace(',', '.'));
    if (!isFinite(n) || n <= 0) return {error: 'Định mức (tấn/ha) phải là số lớn hơn 0'};
    if (n > 1000) return {error: 'Định mức (tấn/ha) quá lớn (tối đa 1000)'};
    return {p, n};
  }
  function keoAdd(db, tuNgay, tanHa) {
    const c = keoCheck(tuNgay, tanHa); if (c.error) return {ok: false, error: c.error};
    if (keoItems(db).some(x => x.key === c.p.key)) return {ok: false, error: 'Đã có định mức gỗ keo hiệu lực từ ngày ' + D.format(c.p)};
    db.dinhMucKeo = (db.dinhMucKeo || []).concat([{tuNgay: D.format(c.p), tanHa: c.n}]); return {ok: true};
  }
  /* thay toàn bộ danh sách (từ biểu mẫu): rows = [{tuNgay, tanHa}] ; báo lỗi theo dòng, không ghi nếu có lỗi */
  function keoSetAll(db, rows) {
    const out = [], seen = new Set();
    for (let i = 0; i < rows.length; i++) {
      const c = keoCheck(rows[i].tuNgay, rows[i].tanHa); if (c.error) return {ok: false, error: 'Dòng ' + (i + 1) + ': ' + c.error};
      if (seen.has(c.p.key)) return {ok: false, error: 'Dòng ' + (i + 1) + ': trùng ngày hiệu lực ' + D.format(c.p)}; seen.add(c.p.key);
      out.push({tuNgay: D.format(c.p), tanHa: c.n});
    }
    db.dinhMucKeo = out; return {ok: true};
  }
  const api = {keoItems, keoPick, keoAdd, keoSetAll, BASE, allPositions, versions, byId, pick, normFor, addVersion, setDate, setNorm, removeVersion, addPosition, removePosition};
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.HAKDinhMuc = api;
})(typeof self !== 'undefined' ? self : this);
