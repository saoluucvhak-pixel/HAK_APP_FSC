/* ========== 3.7.0: Bản đồ trực quan vị trí và sơ đồ minh họa lô rừng (Mini GIS) ==========
 * Hiển thị vị trí tọa độ GPS tâm lô, sơ đồ minh họa bán kính, la bàn hướng Bắc,
 * thước tỷ lệ và nút chép liên kết Google Maps để xem ảnh vệ tinh trên trình duyệt. */

function miniGisHtml(i) {
  const lat = typeof i.lat === 'number' ? i.lat : parseFloat(i.lat);
  const lng = typeof i.lng === 'number' ? i.lng : parseFloat(i.lng);
  const coToaDo = !isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0;
  const coDt = typeof i.dienTich === 'number' && i.dienTich > 0 ? i.dienTich : (typeof i.dienTichGps === 'number' && i.dienTichGps > 0 ? i.dienTichGps : null);
  const dtM2 = coDt ? Math.round(coDt * 10000) : null;
  const banKinhM = coDt ? Math.round(Math.sqrt(dtM2 / Math.PI)) : null;
  const chuViM = banKinhM ? Math.round(2 * Math.PI * banKinhM) : null;

  // Bán kính dùng để vẽ hình minh họa (nếu chưa có diện tích thì lấy danh nghĩa 100m)
  const bkVe = banKinhM || 100;
  const pts = [
    [0, -bkVe * 0.95],
    [bkVe * 0.9, -bkVe * 0.6],
    [bkVe * 1.1, bkVe * 0.5],
    [bkVe * 0.2, bkVe * 1.05],
    [-bkVe * 0.85, bkVe * 0.7],
    [-bkVe * 1.05, -bkVe * 0.4]
  ];
  const scale = 80 / (bkVe * 1.2 || 1);
  const svgPts = pts.map(([x, y]) => Math.round(150 + x * scale) + ',' + Math.round(110 + y * scale)).join(' ');
  const googleMapsUrl = coToaDo ? 'https://www.google.com/maps?q=' + lat + ',' + lng + '&t=k' : '';

  return '<div class="card miniGisCard" id="miniGisBox" style="margin-top:12px;border:1px solid var(--line);border-radius:8px;padding:12px">' +
    '<div class="row" style="justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">' +
      '<div><b style="font-size:14px">🗺️ Sơ đồ minh họa vị trí lô rừng (Mini GIS)</b>' +
      '<div class="mut" style="font-size:12px">Sơ đồ minh họa vị trí theo tọa độ WGS84 (không phải ranh giới đo đạc thực địa)</div></div>' +
      (coToaDo ? '<button type="button" class="btn sm ghost" data-act="gisCopy" data-url="' + esc(googleMapsUrl) + '">📋 Chép liên kết Google Maps</button>' : '<span class="pill warn">Chưa có tọa độ tâm</span>') +
    '</div>' +
    '<div style="display:grid;grid-template-columns:minmax(280px,1fr) minmax(220px,260px);gap:12px;margin-top:10px;align-items:center">' +
      '<div style="background:var(--paper);border:1px solid var(--line);border-radius:6px;position:relative;overflow:hidden;text-align:center">' +
        (coToaDo ? '<svg viewBox="0 0 300 220" style="width:100%;max-height:220px;display:block">' +
          '<!-- Lưới tọa độ ngầm -->' +
          '<defs>' +
            '<pattern id="gisGrid" width="20" height="20" patternUnits="userSpaceOnUse"><path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(0,0,0,0.05)" stroke-width="1"/></pattern>' +
          '</defs>' +
          '<rect width="300" height="220" fill="url(#gisGrid)"/>' +
          '<!-- Vòng bán kính danh nghĩa -->' +
          '<circle cx="150" cy="110" r="' + Math.round(bkVe * scale) + '" fill="none" stroke="#2e7d32" stroke-width="1" stroke-dasharray="3,3" opacity="0.4"/>' +
          '<!-- Đa giác mô phỏng vùng rừng -->' +
          '<polygon points="' + svgPts + '" fill="#4caf50" fill-opacity="0.25" stroke="#2e7d32" stroke-width="2"/>' +
          '<!-- Tâm định vị GPS -->' +
          '<circle cx="150" cy="110" r="5" fill="#d32f2f"/><circle cx="150" cy="110" r="10" fill="none" stroke="#d32f2f" stroke-width="1.5" opacity="0.6"/>' +
          '<text x="150" y="128" font-size="10" font-weight="bold" fill="#d32f2f" text-anchor="middle">TÂM LÔ GPS</text>' +
          '<!-- La bàn hướng Bắc -->' +
          '<g transform="translate(275, 25)">' +
            '<circle cx="0" cy="0" r="14" fill="#fff" stroke="#ccc" stroke-width="1"/>' +
            '<path d="M 0 -11 L 4 0 L 0 -3 L -4 0 Z" fill="#d32f2f"/>' +
            '<path d="M 0 11 L 4 0 L 0 3 L -4 0 Z" fill="#666"/>' +
            '<text x="0" y="-13" font-size="8" font-weight="bold" fill="#d32f2f" text-anchor="middle">N</text>' +
          '</g>' +
          '<!-- Thước tỷ lệ -->' +
          '<g transform="translate(15, 205)">' +
            '<line x1="0" y1="0" x2="50" y2="0" stroke="#333" stroke-width="2"/>' +
            '<line x1="0" y1="-3" x2="0" y2="3" stroke="#333" stroke-width="1.5"/>' +
            '<line x1="50" y1="-3" x2="50" y2="3" stroke="#333" stroke-width="1.5"/>' +
            '<text x="25" y="-4" font-size="9" fill="#333" text-anchor="middle">' + Math.round(50 / scale) + ' m</text>' +
          '</g>' +
        '</svg>' : '<div style="padding:40px 10px;color:var(--muted)">Nhập tọa độ <b>Vĩ độ (Lat)</b> và <b>Kinh độ (Lng)</b> để hiển thị sơ đồ vị trí lô rừng.</div>') +
      '</div>' +
      '<div style="font-size:12px;line-height:1.7">' +
        '<div><b>Tọa độ tâm WGS84:</b><br>' + (coToaDo ? '<code>' + lat.toFixed(5) + ', ' + lng.toFixed(5) + '</code>' : '<i>Chưa có</i>') + '</div>' +
        '<div style="margin-top:6px"><b>Diện tích khai báo:</b> ' + (coDt ? formatNumber(coDt, 2) + ' ha (' + fmt(dtM2) + ' m²)' : '—') + '</div>' +
        '<div><b>Bán kính ước tính:</b> ' + (banKinhM ? '~' + banKinhM + ' m' : '—') + '</div>' +
        '<div><b>Chu vi ước tính:</b> ' + (chuViM ? '~' + chuViM + ' m' : '—') + '</div>' +
        (i.cuLy ? '<div><b>Cự ly vận chuyển:</b> ' + i.cuLy + ' km</div>' : '') +
      '</div>' +
    '</div>' +
  '</div>';
}

document.addEventListener('click', e => {
  const el = e.target && e.target.closest && e.target.closest('[data-act=gisCopy]');
  if (!el || !el.dataset.url) return;
  const url = el.dataset.url;
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(url).then(() => {
      note('Đã chép liên kết Google Maps: dán vào trình duyệt để xem ảnh vệ tinh.', 'ok');
    }).catch(() => {
      note('Không chép được, liên kết: ' + url, 'warn');
    });
  } else {
    note('Liên kết Google Maps: ' + url, 'ok');
  }
});
