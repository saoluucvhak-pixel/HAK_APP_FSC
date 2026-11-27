/* ========== 3.5.1: Thẻ đối soát sản lượng — dự kiến (diện tích × định mức) so với thực tế từ phiếu cân ==========
 * Chỉ đọc: dự kiến = HAKDinhMuc.sanLuongDuKien, thực tế = HAKDinhMuc.tongPhieuTan (cùng định nghĩa với kiểm tra chéo lô). Không ghi gì vào hồ sơ. */
function doiSoatSanLuongHtml(rec) {
  if (!rec || !rec.info) return '';
  const dk = forestYield(rec.info), tt = klPhieu(rec.pc || []), n = (rec.pc || []).length;
  const tan = v => formatNumber(v, 3), pct = dk ? Math.round(tt / dk * 1000) / 10 : null;
  const den = HAKDates.parse(rec.info.denNgay || ''), hom = HAKDates.parse(todayStr()), xongKy = !!(den && hom && den.key < hom.key);
  const lech = dk && n ? Math.round(Math.abs(tt - dk) / dk * 1000) / 10 : null, batThuong = lech != null && lech > 15 && (tt > dk || xongKy);   // vượt dự kiến, hoặc hết kỳ khai thác mà thiếu hụt, quá 15%
  const [nhan, cls] = pct == null ? ['Chưa có dự kiến', ''] : pct > 100 ? ['Vượt dự kiến ' + tan(tt - dk) + ' tấn', 'err'] : pct >= 90 ? ['Gần đủ dự kiến', 'warn'] : ['Còn thiếu ' + tan(dk - tt) + ' tấn', 'ok'];

  // 3.7.5: Dự báo tiến độ & Ngày hoàn thành (Burn-up completion forecast)
  let duBaoHtml = '';
  const validPc = (rec.pc || []).filter(p => HAKDates.isValid(p.ngay) && typeof p.kl === 'number' && p.kl > 0);
  const dateKeys = [...new Set(validPc.map(p => HAKDates.dateKey(p.ngay)))].sort((a, b) => a - b);
  const soNgayCan = dateKeys.length;

  if (dk && tt > 0 && soNgayCan > 0) {
    const tocDoTB = tt / soNgayCan;
    const conLai = Math.max(0, dk - tt);
    if (tt >= dk) {
      duBaoHtml = '<div class="msg ok" style="margin-top:10px">🎉 <b>Đã hoàn thành sản lượng kế hoạch:</b> Thực tế cân <b>' + tan(tt) + ' tấn</b> (đạt ' + pct + '% kế hoạch ' + tan(dk) + ' tấn).</div>';
    } else if (tocDoTB > 0) {
      const ngayCanThem = Math.ceil(conLai / tocDoTB);
      const lastKey = dateKeys[dateKeys.length - 1];
      const ly = Math.floor(lastKey / 10000), lm = Math.floor((lastKey % 10000) / 100) - 1, ld = lastKey % 100;
      const dEnd = new Date(ly, lm, ld);
      let dem = 0;
      while (dem < ngayCanThem) {
        dEnd.setDate(dEnd.getDate() + 1);
        if (dEnd.getDay() !== 0) dem++; // Bỏ qua Chủ nhật
      }
      const dEndStr = pad2(dEnd.getDate()) + '/' + pad2(dEnd.getMonth() + 1) + '/' + dEnd.getFullYear();

      let hdMsg = '';
      if (den && den.y) {
        const dContract = new Date(den.y, den.m - 1, den.d);
        const diffNgay = Math.round((dContract - dEnd) / 864e5);
        if (diffNgay >= 0) {
          hdMsg = '<span class="pill ok" style="font-weight:600">⚡ Dự kiến về đích trước hạn ' + diffNgay + ' ngày</span>';
        } else {
          hdMsg = '<span class="pill err" style="font-weight:600">⚠️ Nguy cơ trễ hạn ' + Math.abs(diffNgay) + ' ngày (HĐ kết thúc: ' + esc(rec.info.denNgay) + ')</span>';
        }
      }

      duBaoHtml = '<div style="margin-top:10px;padding:12px;background:var(--bg2,#f7f9fa);border-radius:6px;border:1px solid var(--border,#e1e4e8)">' +
        '<div class="row" style="align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;margin-bottom:8px">' +
        '<div><b style="font-size:13.5px">📈 Dự báo tiến độ &amp; Ngày hoàn thành thu hoạch</b>' +
        '<span class="mut" style="font-size:12px;margin-left:8px">(Dựa trên ' + soNgayCan + ' ngày cân thực tế, trừ Chủ nhật)</span></div>' +
        (hdMsg || '') + '</div>' +
        '<div class="kpi" style="margin:0;grid-template-columns:repeat(auto-fit,minmax(120px,1fr))">' +
        '<div><b>' + formatNumber(Math.round(tocDoTB * 10) / 10, 1) + '</b>Tốc độ TB (tấn/ngày)</div>' +
        '<div><b>' + tan(conLai) + '</b>Khối lượng còn lại (tấn)</div>' +
        '<div><b>~' + ngayCanThem + ' ngày</b>Thời gian cần thêm</div>' +
        '<div><b>' + dEndStr + '</b>Dự kiến hoàn thành</div>' +
        '</div></div>';
    }
  }

  return '<div class="card" id="doiSoatSL"><div class="row" style="justify-content:space-between;align-items:center;gap:8px"><h3 style="margin:0">Đối soát sản lượng</h3><span class="pill ' + cls + '">' + esc(nhan) + '</span></div>' +
    '<div class="kpi" style="margin-top:8px"><div><b>' + (dk ? tan(dk) : '—') + '</b>Dự kiến (tấn)</div><div><b>' + tan(tt) + '</b>Thực tế từ trạm cân (tấn)</div><div><b>' + n + '</b>Phiếu cân</div><div><b>' + (pct == null ? '—' : pct + '%') + '</b>Đã cân so với dự kiến</div></div>' +
    (batThuong ? '<div class="msg warn" id="doiSoatLech" style="margin-top:8px"><b>Chênh lệch bất thường ' + lech + '%</b> so với sản lượng dự kiến (ngưỡng 15%): ' + (tt > dk ? 'khối lượng cân vượt dự kiến, kiểm tra phiếu trùng, diện tích hoặc định mức.' : 'đã hết thời gian khai thác nhưng khối lượng cân còn thiếu, kiểm tra phiếu cân chưa nạp.') + '</div>' : '') +
    (dk ? '<div class="gsMeter" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + Math.min(100, pct) + '" aria-label="Đã cân ' + pct + '% so với dự kiến"><i class="' + (pct > 100 ? 'over' : pct >= 90 ? 'near' : '') + '" style="width:' + Math.min(100, pct) + '%"></i></div>' : '<p class="mut" style="margin:6px 0 0">Nhập diện tích và định mức của rừng để có sản lượng dự kiến.</p>') + duBaoHtml + '</div>';
}
{ const g = panelPhieuCan; panelPhieuCan = function (rec) { return g(rec) + doiSoatSanLuongHtml(rec); }; }   // sau bảng phiếu cân: bảng vẫn thấy ngay ở màn đầu
