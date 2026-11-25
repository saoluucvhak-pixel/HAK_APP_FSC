/* ========== 3.5.1: Thẻ đối soát sản lượng — dự kiến (diện tích × định mức) so với thực tế từ phiếu cân ==========
 * Chỉ đọc: dự kiến = HAKDinhMuc.sanLuongDuKien, thực tế = HAKDinhMuc.tongPhieuTan (cùng định nghĩa với kiểm tra chéo lô). Không ghi gì vào hồ sơ. */
function doiSoatSanLuongHtml(rec) {
  if (!rec || !rec.info) return '';
  const dk = forestYield(rec.info), tt = klPhieu(rec.pc || []), n = (rec.pc || []).length;
  const tan = v => formatNumber(v, 3), pct = dk ? Math.round(tt / dk * 1000) / 10 : null;
  const [nhan, cls] = pct == null ? ['Chưa có dự kiến', ''] : pct > 100 ? ['Vượt dự kiến ' + tan(tt - dk) + ' tấn', 'err'] : pct >= 90 ? ['Gần đủ dự kiến', 'warn'] : ['Còn thiếu ' + tan(dk - tt) + ' tấn', 'ok'];
  return '<div class="card" id="doiSoatSL"><div class="row" style="justify-content:space-between;align-items:center;gap:8px"><h3 style="margin:0">Đối soát sản lượng</h3><span class="pill ' + cls + '">' + esc(nhan) + '</span></div>' +
    '<div class="kpi" style="margin-top:8px"><div><b>' + (dk ? tan(dk) : '—') + '</b>Dự kiến (tấn)</div><div><b>' + tan(tt) + '</b>Thực tế từ trạm cân (tấn)</div><div><b>' + n + '</b>Phiếu cân</div><div><b>' + (pct == null ? '—' : pct + '%') + '</b>Đã cân so với dự kiến</div></div>' +
    (dk ? '<div class="gsMeter" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + Math.min(100, pct) + '" aria-label="Đã cân ' + pct + '% so với dự kiến"><i class="' + (pct > 100 ? 'over' : pct >= 90 ? 'near' : '') + '" style="width:' + Math.min(100, pct) + '%"></i></div>' : '<p class="mut" style="margin:6px 0 0">Nhập diện tích và định mức của rừng để có sản lượng dự kiến.</p>') + '</div>';
}
{ const g = panelPhieuCan; panelPhieuCan = function (rec) { return doiSoatSanLuongHtml(rec) + g(rec); }; }
