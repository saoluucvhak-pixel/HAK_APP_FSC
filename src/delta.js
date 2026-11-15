/* Lưu theo phần thay đổi (delta) giữa giao diện và SQLite.
 * Giao diện giữ trạng thái đầy đủ `db`; trước đây mỗi lần lưu gửi TOÀN BỘ db qua IPC và tiến trình chính tuần tự hóa + băm lại mọi dòng.
 * Nay giao diện giữ ẢNH CHỤP chuỗi JSON từng chủ rừng / lô rừng của lần lưu thành công gần nhất (ứng với phiên bản `rev` của cơ sở dữ liệu)
 * và chỉ gửi các dòng thêm / sửa / xóa. Chuỗi JSON tạo GIỐNG HỆT Store.explode (src/store.js) nên mã băm hai cách lưu khớp nhau.
 *  - snapshot(db): {owners: Map id→json, forests: Map id→{owner, json}, dup: bool, counts}
 *  - diff(prev, next): {upO: {id: json}, upF: {id: {owner, json}}, delO: [id], delF: [id]}
 *  - side(db): phần ngoài hồ sơ (danh mục công ty, các khóa meta) — nhỏ, luôn gửi đủ như lưu toàn bộ.
 * Ảnh chụp chỉ hợp lệ khi `rev` còn khớp; mọi chỗ ghi khác (khôi phục, khôi phục lô, đổi thư mục dữ liệu) đổi `rev` → giao diện tự lưu toàn bộ. */
(function (root) {
  'use strict';
  const ownerJson = (id, o) => { const {forests: _f, ...rest} = o; rest.id = rest.id || id; return [rest.id, JSON.stringify(rest)]; };
  const forestJson = (fid, f) => [f.id || fid, JSON.stringify(f)];

  function snapshot(db) {
    const owners = new Map(), forests = new Map(); let dup = false;
    Object.entries((db && db.rs) || {}).forEach(([id, o]) => {
      if (!o || typeof o !== 'object') { dup = true; return; }   // dữ liệu lạ: để lưu toàn bộ xử lý và báo lỗi
      const [oid, oj] = ownerJson(id, o);
      if (owners.has(oid)) dup = true;
      owners.set(oid, oj);
      Object.entries(o.forests || {}).forEach(([fid, f]) => {
        const [id2, fj] = forestJson(fid, f);
        if (forests.has(id2)) dup = true;                          // trùng mã nội bộ lô: lưu toàn bộ sẽ báo DUP_ID, không ghi gì
        forests.set(id2, {owner: oid, json: fj});
      });
    });
    return {owners, forests, dup, counts: {owners: owners.size, forests: forests.size}};
  }

  function diff(prev, next) {
    const upO = {}, upF = {}, delO = [], delF = [];
    next.owners.forEach((j, id) => { if (prev.owners.get(id) !== j) upO[id] = j; });
    next.forests.forEach((v, id) => { const p = prev.forests.get(id); if (!p || p.json !== v.json || p.owner !== v.owner) upF[id] = {owner: v.owner, json: v.json}; });
    prev.owners.forEach((j, id) => { if (!next.owners.has(id)) delO.push(id); });
    prev.forests.forEach((v, id) => { if (!next.forests.has(id)) delF.push(id); });
    return {upO, upF, delO, delF};
  }

  const side = db => { const out = {}; Object.keys(db || {}).forEach(k => { if (k !== 'rs' && k !== 'v') out[k] = db[k]; }); return out; };
  const size = d => Object.keys(d.upO).length + Object.keys(d.upF).length + d.delO.length + d.delF.length;

  const api = {snapshot, diff, side, size, ownerJson, forestJson};
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.HAKDelta = api;
})(typeof window !== 'undefined' ? window : globalThis);
