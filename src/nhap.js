/* BẢN NHÁP — LÕI THUẦN (PR D, bước 1): quyết định "ghi gì xuống đĩa" và "hoàn gì khi bỏ / khi lưu lỗi" của cơ chế nháp (v3.3.0, QĐ7).
 * Trước đây nằm trong ui/app/02-luu-tru-trang-thai.js và đọc biến toàn cục; nay nhận trạng thái TƯỜNG MINH nên test được bằng hàm thật:
 *   st = {loDirty: Set<id lô>, loMoi: Set<id lô>, chuNhap: Map<id chủ rừng, {moi}>, aliasNhap: Map<khóa, {had, old, lots:Set}>, snap}
 *   snap = HAKDelta.snapshot(...) của bản ĐÃ LƯU gần nhất ({owners: Map id→json, forests: Map id→{owner, json}}), hoặc null.
 * st.canGhi (tùy chọn): hàm đặt true khi một ánh xạ biển số vừa được CHỐT mà không có lần ghi kèm theo; người gọi phải persist() rồi xóa cờ.
 * Các hàm KHÔNG đọc biến toàn cục. Hàm có chữ "sửa" bên dưới sửa trực tiếp db và các sổ trong st (giữ đúng hành vi cũ); dbGhi không sửa gì.
 * Bất biến (docs/BAN_GIAO_BO_SUNG_PR_D_AN_TOAN_BAN_NHAP.md mục 3): I1 ghi xuống đĩa = bản đã lưu + phần đã bấm lưu; I2 bỏ thay đổi về đúng bản đã lưu;
 * I4 dữ liệu đã lưu không bao giờ bị dbGhi bỏ ra; I5 lưu lỗi chỉ hoàn phần đã bỏ, không xóa mục mới. */
(function (root) {
  'use strict';
  const parse = j => JSON.parse(j);

  /* tạo trạng thái trống (dùng cho test và cho lớp nối) */
  const tao = snap => ({loDirty: new Set(), loMoi: new Set(), chuNhap: new Map(), aliasNhap: new Map(), snap: snap || null});

  /* còn bản nháp nào không (nếu không: ghi nguyên db) */
  const conNhap = st => !!(st.loDirty.size || st.chuNhap.size || st.aliasNhap.size || st.loMoi.size);

  /* nội dung sẽ ghi: lô còn thay đổi chưa lưu giữ bản đã lưu (lô mới chưa lưu thì bỏ ra ngoài); chủ rừng mới chưa lưu bỏ ra ngoài;
   * ánh xạ biển số chưa lưu về bản đã lưu. Không sửa db. */
  function dbGhi(db, st) {
    const snap = st.snap;
    if (!conNhap(st) || !snap) return db;
    const out = Object.assign({}, db, {rs: {}});
    Object.entries(db.rs || {}).forEach(([oid, o]) => {
      if (!o || typeof o !== 'object') { out.rs[oid] = o; return; }
      const fs = {}; let giu = 0;
      Object.entries(o.forests || {}).forEach(([fid, f]) => {
        const id = f && f.id || fid, dirty = st.loDirty.has(id);
        if (dirty && st.loMoi.has(id) && !snap.forests.has(id)) return;
        const b = dirty && snap.forests.get(id); fs[fid] = b ? parse(b.json) : f; giu++;
      });
      const cn = st.chuNhap.get(oid);
      if (cn && cn.moi && !giu && !snap.owners.has(oid)) return;
      let oo = o; if (cn && !cn.moi && snap.owners.has(oid)) oo = parse(snap.owners.get(oid));
      out.rs[oid] = Object.assign({}, oo, {forests: fs});
    });
    if (st.aliasNhap.size) {
      const ba = Object.assign({}, db.bienAlias || {});
      st.aliasNhap.forEach((v, k) => { if ([...v.lots].some(id => st.loDirty.has(id))) { if (v.had) ba[k] = v.old; else delete ba[k]; } });
      out.bienAlias = ba;
    }
    return out;
  }

  /* chủ rừng / lô / ánh xạ nháp: lô nào cũng đã lưu hoặc bỏ thì dọn sổ (chốt) — gọi sau mỗi lần lưu thành công. Sửa st. */
  function chot(db, st) {
    const dirtyOf = o => Object.values((o && o.forests) || {}).some(f => st.loDirty.has(f.id));
    st.chuNhap.forEach((cn, oid) => { if (!dirtyOf(db.rs[oid])) st.chuNhap.delete(oid); });
    st.aliasNhap.forEach((v, k) => {
      const daLuu = [...v.lots].filter(id => !st.loDirty.has(id));
      if (daLuu.length) { v.coLuu = true; daLuu.forEach(id => v.lots.delete(id)); }   // lô liên quan đã lưu: ghi nhớ bằng coLuu (bỏ các lô còn lại không được hoàn ánh xạ, kể cả sau đóng đột ngột) và thôi giữ trong sổ: sổ chỉ giữ các lô còn nháp
      if (!v.lots.size) st.aliasNhap.delete(k);
    });
    [...st.loMoi].forEach(id => { if (!st.loDirty.has(id)) st.loMoi.delete(id); });
  }

  /* lưu một lô thì chốt luôn thông tin chủ rừng đang sửa nháp của lô đó (trả về hàm hoàn lại nếu lưu lỗi). Sửa st. */
  function chuChot(st, oid) {
    const cn = st.chuNhap.get(oid); if (!cn || cn.moi) return () => {};
    st.chuNhap.delete(oid);
    const un = () => { if (!st.chuNhap.has(oid)) st.chuNhap.set(oid, cn); }; un.chot = true; return un;
  }

  /* chụp cả ba sổ để lưu lỗi không làm mất dấu "chưa lưu" */
  const chup = st => ({
    m: new Set(st.loMoi),
    c: new Map([...st.chuNhap].map(([k, v]) => [k, Object.assign({}, v)])),
    a: new Map([...st.aliasNhap].map(([k, v]) => [k, Object.assign({}, v, {lots: new Set(v.lots)})]))
  });

  /* chỉ HOÀN LẠI phần lần lưu này đã bỏ (thêm lại khóa có trong bản chụp mà nay không còn); KHÔNG xóa khóa mới do thao tác khác tạo ra trong lúc chờ. Sửa st. */
  function khoiPhuc(st, x) {
    x.m.forEach(i => st.loMoi.add(i));
    x.c.forEach((v, k) => { if (!st.chuNhap.has(k)) st.chuNhap.set(k, v); });
    x.a.forEach((v, k) => { const e = st.aliasNhap.get(k); if (e) v.lots.forEach(id => e.lots.add(id)); else st.aliasNhap.set(k, v); });
  }

  /* ánh xạ biển số nháp gắn với lô fid: lô bị bỏ / xóa mà không còn lô bẩn nào thì hoàn lại ánh xạ (sửa db.bienAlias và st) */
  function aliasHoan(db, st, fid) {
    st.aliasNhap.forEach((v, k) => {
      v.lots.delete(fid);
      if ([...v.lots].some(id => st.loDirty.has(id))) return;   // còn lô nháp liên quan: giữ sổ
      if (v.coLuu) { st.aliasNhap.delete(k); st.canGhi = true; return; }   // (canGhi: ánh xạ vừa được chốt, người gọi phải persist để xuống đĩa) đã có lô liên quan ĐƯỢC LƯU: ánh xạ đi cùng lô đã lưu (giữ giá trị mới, chốt sổ); không phụ thuộc thứ tự lưu / bỏ / đóng đột ngột
      db.bienAlias = db.bienAlias || {};                        // mọi lô liên quan đều bị bỏ: hoàn về giá trị cũ
      if (v.had) db.bienAlias[k] = v.old; else delete db.bienAlias[k];
      st.aliasNhap.delete(k);
    });
  }

  /* bỏ thay đổi chưa lưu của một lô: về đúng bản đã lưu; lô mới chưa từng lưu thì bỏ hẳn (cùng chủ rừng mới nếu không còn lô nào). Sửa db và st; trả true nếu đã đổi db. */
  function veBanDaLuu(db, st, fid) {
    const snap = st.snap;
    st.loDirty.delete(fid);
    const b = snap && snap.forests.get(fid); let oid = null, ok = false;
    Object.entries(db.rs || {}).forEach(([id, o]) => { const k = Object.keys((o && o.forests) || {}).find(x => (o.forests[x].id || x) === fid); if (k) oid = id; });
    if (!b) {
      if (st.loMoi.has(fid) && oid) { const o = db.rs[oid], k = Object.keys(o.forests).find(x => (o.forests[x].id || x) === fid); delete o.forests[k]; ok = true; }
      st.loMoi.delete(fid);
    } else if (oid) {
      const o = db.rs[oid], k = Object.keys(o.forests).find(x => (o.forests[x].id || x) === fid), f = o.forests[k], v = parse(b.json);
      Object.keys(f).forEach(x => { delete f[x]; }); Object.assign(f, v); ok = true;
    }
    if (oid && db.rs[oid]) {   // chủ rừng và ánh xạ biển số nháp: không còn lô nháp nào thì hoàn lại (chủ rừng mới → bỏ; thông tin sửa nháp → về bản đã lưu)
      const o = db.rs[oid], cn = st.chuNhap.get(oid);
      if (cn && !Object.values(o.forests || {}).some(f => st.loDirty.has(f.id))) {
        if (cn.moi && !Object.keys(o.forests || {}).length && !(snap && snap.owners.has(oid))) delete db.rs[oid];   // sổ còn ghi 'mới' nhưng chủ rừng đã xuống đĩa cùng một lô đã lưu: không xóa
        else if (!cn.moi && snap && snap.owners.has(oid)) { const ov = parse(snap.owners.get(oid)); Object.keys(o).forEach(x => { if (x !== 'forests') delete o[x]; }); Object.assign(o, ov); }
        st.chuNhap.delete(oid);
      }
    }
    aliasHoan(db, st, fid);
    return ok;
  }

  /* ===== TỰ LƯU TẠM (đóng đột ngột): chụp các lô nháp, chủ rừng nháp, ánh xạ nháp thành đối tượng JSON thuần; phục hồi vào db + sổ sau khi mở lại ===== */
  /* ks: danh sách khóa 'oid|fid' của các lô có thay đổi chưa lưu (giao diện lấy từ stDirtyList). Không sửa gì. */
  function tamChup(db, st, ks) {
    const lots = {}, chu = {}, moi = [], alias = {};
    (ks || []).forEach(k => {
      const [oid, fid] = k.split('|'), f = db.rs && db.rs[oid] && db.rs[oid].forests && db.rs[oid].forests[fid]; if (!f) return;
      if (st.loDirty.has(fid)) {
        lots[k] = f; if (st.loMoi.has(fid)) moi.push(fid);
        if (st.chuNhap.has(oid) && !chu[oid]) { const {forests: _f, ...o} = db.rs[oid]; chu[oid] = {moi: !!st.chuNhap.get(oid).moi, o}; }
      }
    });
    st.aliasNhap.forEach((v, key) => { if (db.bienAlias && key in db.bienAlias) alias[key] = Object.assign({v: db.bienAlias[key], had: v.had, old: v.old, lots: [...v.lots]}, v.coLuu ? {coLuu: true} : {}); });
    return {lots, moi, chu, alias};
  }
  /* phục hồi MỘT lô nháp (k = 'oid|fid', f = nội dung lô, c = chu[oid], moiSet = Set id lô tạo từ nháp) */
  function tamPhucHoiLo(db, st, k, f, c, moiSet) {
    const [oid, fid] = k.split('|');
    if (!db.rs[oid]) { const {id, ...o} = c.o; db.rs[oid] = Object.assign({}, o, {id: oid, forests: {}}); st.chuNhap.set(oid, {moi: true}); }
    else if (c && !c.moi) { Object.assign(db.rs[oid], c.o, {forests: db.rs[oid].forests}); st.chuNhap.set(oid, {moi: false}); }
    db.rs[oid].forests[fid] = f; st.loDirty.add(fid); if (moiSet.has(fid)) st.loMoi.add(fid);
  }
  /* phục hồi các ánh xạ nháp (gọi SAU khi mọi lô đã phục hồi): chỉ giữ các lô liên quan còn nháp */
  function tamPhucHoiAlias(db, st, alias) {
    Object.entries(alias || {}).forEach(([key, v]) => {
      if (!v || typeof v.v !== 'string') return;
      db.bienAlias = db.bienAlias || {}; db.bienAlias[key] = v.v;
      const lots = new Set((v.lots || []).filter(id => st.loDirty.has(id)));
      if (!lots.size) { if (v.coLuu) { st.canGhi = true; return; } if (v.had) db.bienAlias[key] = v.old; else delete db.bienAlias[key]; return; }   // không còn lô nháp: đã có lô được lưu thì giữ giá trị mới, không thì hoàn
      st.aliasNhap.set(key, Object.assign({had: !!v.had, old: v.old, lots}, v.coLuu ? {coLuu: true} : {}));
    });
  }

  const api = {tao, conNhap, dbGhi, chot, chuChot, chup, khoiPhuc, aliasHoan, veBanDaLuu, tamChup, tamPhucHoiLo, tamPhucHoiAlias};
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.HAKNhap = api;
})(typeof self !== 'undefined' ? self : this);
