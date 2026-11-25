/* ========== 3.5.1: Thẻ đối soát sản lượng — dự kiến (diện tích × định mức) so với thực tế từ phiếu cân ==========
 * Chỉ đọc: dự kiến = HAKDinhMuc.sanLuongDuKien, thực tế = HAKDinhMuc.tongPhieuTan (cùng định nghĩa với kiểm tra chéo lô). Không ghi gì vào hồ sơ. */
function doiSoatSanLuongHtml(rec) {
  if (!rec || !rec.info) return '';
  const dk = forestYield(rec.info), tt = klPhieu(rec.pc || []), n = (rec.pc || []).length;
  const tan = v => formatNumber(v, 3), pct = dk ? Math.round(tt / dk * 1000) / 10 : null;
  const den = HAKDates.parse(rec.info.denNgay || ''), hom = HAKDates.parse(todayStr()), xongKy = !!(den && hom && den.key < hom.key);
  const lech = dk && n ? Math.round(Math.abs(tt - dk) / dk * 1000) / 10 : null, batThuong = lech != null && lech > 15 && (tt > dk || xongKy);   // vượt dự kiến, hoặc hết kỳ khai thác mà thiếu hụt, quá 15%
  const [nhan, cls] = pct == null ? ['Chưa có dự kiến', ''] : pct > 100 ? ['Vượt dự kiến ' + tan(tt - dk) + ' tấn', 'err'] : pct >= 90 ? ['Gần đủ dự kiến', 'warn'] : ['Còn thiếu ' + tan(dk - tt) + ' tấn', 'ok'];
  return '<div class="card" id="doiSoatSL"><div class="row" style="justify-content:space-between;align-items:center;gap:8px"><h3 style="margin:0">Đối soát sản lượng</h3><span class="pill ' + cls + '">' + esc(nhan) + '</span></div>' +
    '<div class="kpi" style="margin-top:8px"><div><b>' + (dk ? tan(dk) : '—') + '</b>Dự kiến (tấn)</div><div><b>' + tan(tt) + '</b>Thực tế từ trạm cân (tấn)</div><div><b>' + n + '</b>Phiếu cân</div><div><b>' + (pct == null ? '—' : pct + '%') + '</b>Đã cân so với dự kiến</div></div>' +
    (batThuong ? '<div class="msg warn" id="doiSoatLech" style="margin-top:8px"><b>Chênh lệch bất thường ' + lech + '%</b> so với sản lượng dự kiến (ngưỡng 15%): ' + (tt > dk ? 'khối lượng cân vượt dự kiến, kiểm tra phiếu trùng, diện tích hoặc định mức.' : 'đã hết thời gian khai thác nhưng khối lượng cân còn thiếu, kiểm tra phiếu cân chưa nạp.') + '</div>' : '') +
    (dk ? '<div class="gsMeter" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + Math.min(100, pct) + '" aria-label="Đã cân ' + pct + '% so với dự kiến"><i class="' + (pct > 100 ? 'over' : pct >= 90 ? 'near' : '') + '" style="width:' + Math.min(100, pct) + '%"></i></div>' : '<p class="mut" style="margin:6px 0 0">Nhập diện tích và định mức của rừng để có sản lượng dự kiến.</p>') + '</div>';
}
{ const g = panelPhieuCan; panelPhieuCan = function (rec) { return doiSoatSanLuongHtml(rec) + g(rec); }; }
