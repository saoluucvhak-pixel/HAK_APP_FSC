'use strict';
/* Gỡ phần BỔ SUNG của bản 3.0 khỏi dữ liệu để so “dữ liệu không đổi” với mốc trước 3.0 (src/lienket.js):
 * danh mục mới (dmDoiTuong, dmXe, dmViTri, canDoiChieu), ID dòng (nc 'tv…', dx 'xr…', pc 'pc…'), liên kết (nguoiId, viTriId, xeId, taiXeId, pc.hdvcId, pc.xeRowId,
 * hdvc.benKy, doi.benNhanKhoan, lô.canDoiChieu) và khóa chấm công theo ID thành viên (đổi lại về CCCD / họ tên). Không sửa đầu vào. */
const pk = r => String((r && (r.cccd || r.ten)) || '').trim();
function boLo(f) {
  if (!f || typeof f !== 'object') return f;
  const ids = new Map((f.nc || []).filter(r => r && r.id).map(r => [r.id, pk(r)]));
  if (f.cc && typeof f.cc === 'object') Object.values(f.cc).forEach(m => { if (!m || typeof m !== 'object') return; Object.keys(m).forEach(k => { if (ids.has(k)) { const c = ids.get(k); if (!(c in m)) m[c] = m[k]; delete m[k]; } }); });
  (f.nc || []).forEach(r => { if (!r) return; if (/^tv\d+$/.test(r.id || '')) delete r.id; delete r.nguoiId; delete r.viTriId; });
  (f.dx || []).forEach(r => { if (!r) return; if (/^xr\d+$/.test(r.id || '')) delete r.id; delete r.xeId; delete r.taiXeId; });
  (f.pc || []).forEach(r => { if (!r) return; if (/^pc\d+$/.test(r.id || '')) delete r.id; delete r.hdvcId; delete r.xeRowId; delete r.xeTay; });
  (f.hdvc || []).forEach(h => { if (h) delete h.benKy; }); (f.doi || []).forEach(d => { if (d) delete d.benNhanKhoan; });
  delete f.canDoiChieu;
  return f;
}
function bo30(x) {
  if (x == null) return x;
  const o = JSON.parse(JSON.stringify(x));
  const laLo = v => v && typeof v === 'object' && !Array.isArray(v) && ('nc' in v || 'dx' in v || 'pc' in v || 'doi' in v);
  if (laLo(o)) return boLo(o);
  if (o.rs && typeof o.rs === 'object') { ['dmDoiTuong', 'dmXe', 'dmViTri', 'canDoiChieu'].forEach(k => delete o[k]); Object.values(o.rs).forEach(ow => Object.values((ow && ow.forests) || {}).forEach(boLo)); return o; }
  if (o.forests && typeof o.forests === 'object') { Object.values(o.forests).forEach(boLo); return o; }
  if (Object.values(o).every(laLo)) { Object.values(o).forEach(boLo); return o; }   // {id: lô}
  if (Object.values(o).some(v => v && typeof v === 'object' && v.forests)) { Object.values(o).forEach(ow => Object.values((ow && ow.forests) || {}).forEach(boLo)); return o; }   // rs
  return o;
}
module.exports = {bo30, boLo};
