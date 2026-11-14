/* Cự ly vận chuyển: mặc định TỰ TÍNH từ tọa độ rừng khai thác đến tọa độ nơi giao hàng (công ty mua hàng); người dùng có thể ghi cự ly thủ công và số đó luôn được ưu tiên.
 * Cự ly tự tính là KHOẢNG CÁCH ĐƯỜNG CHIM BAY (công thức haversine, làm tròn 0,1 km), KHÔNG phải quãng đường xe chạy: ở những nơi đường vòng thì quãng đường thực tế dài hơn.
 * Hàm thuần, không phụ thuộc giao diện, dùng chung ở giao diện (nhúng khi build) và kiểm thử Node. */
(function (root) {
  const R_KM = 6371.0088;
  const rad = d => d * Math.PI / 180;
  const num = v => (typeof v === 'number' && isFinite(v)) ? v : null;
  /* khoảng cách đường chim bay giữa hai điểm WGS84, km */
  function haversine(lat1, lng1, lat2, lng2) {
    const dLat = rad(lat2 - lat1), dLng = rad(lng2 - lng1), a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLng / 2) ** 2;
    return 2 * R_KM * Math.asin(Math.min(1, Math.sqrt(a)));
  }
  /* “15.912345, 108.123456” (dán từ Google Maps) hoặc “15,912345; 108,123456” / “15,912345 108,123456” (dấu phẩy thập phân). Sai dạng thì null. */
  function parseToaDo(text) {
    const s = String(text == null ? '' : text).trim(); if (!s) return null;
    let m = /^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/.exec(s) || /^(-?\d+(?:,\d+)?)\s*[;\s]\s*(-?\d+(?:,\d+)?)$/.exec(s);
    if (!m) return null;
    const lat = parseFloat(m[1].replace(',', '.')), lng = parseFloat(m[2].replace(',', '.'));
    return why(lat, lng) ? null : {lat, lng};
  }
  /* lỗi của một cặp tọa độ ('' nếu hợp lệ về miền giá trị) */
  function why(lat, lng) {
    if (num(lat) == null || num(lng) == null) return 'thiếu vĩ độ hoặc kinh độ';
    if (lat < -90 || lat > 90) return 'vĩ độ phải từ -90 đến 90';
    if (lng < -180 || lng > 180) return 'kinh độ phải từ -180 đến 180';
    return '';
  }
  /* ngoài lãnh thổ Việt Nam (khoảng gần đúng): chỉ cảnh báo, hay nhầm vĩ độ với kinh độ */
  const inVN = (lat, lng) => lat >= 8 && lat <= 24 && lng >= 102 && lng <= 110;
  const fmtToaDo = (lat, lng) => num(lat) != null && num(lng) != null ? lat + ', ' + lng : '';
  /* điểm rừng và điểm giao của hồ sơ rừng: info.lat/lng và bản chụp công ty info.muaHang.lat/lng */
  function points(info) {
    const i = info || {}, m = i.muaHang || {};
    return {from: num(i.lat) != null && num(i.lng) != null ? {lat: i.lat, lng: i.lng} : null, to: num(m.lat) != null && num(m.lng) != null ? {lat: m.lat, lng: m.lng} : null};
  }
  /* cự ly tự tính (km, làm tròn 0,1) hoặc null nếu thiếu tọa độ */
  function auto(info) {
    const p = points(info); if (!p.from || !p.to || why(p.from.lat, p.from.lng) || why(p.to.lat, p.to.lng)) return null;
    const km = Math.round(haversine(p.from.lat, p.from.lng, p.to.lat, p.to.lng) * 10) / 10;
    return km > 0 ? km : null;
  }
  /* cự ly hiệu lực: nhập tay (>0) được ưu tiên; không có thì tự tính. nguon: 'nhập tay' | 'tự tính' | ''. thieu: lý do chưa có (khi nguon === '') */
  function eff(info) {
    const i = info || {}, a = auto(i);
    if (typeof i.cuLy === 'number' && i.cuLy > 0) return {km: i.cuLy, nguon: 'nhập tay', auto: a, thieu: ''};
    if (a != null) return {km: a, nguon: 'tự tính', auto: a, thieu: ''};
    const p = points(i), miss = [!p.from ? 'tọa độ rừng (Thông tin rừng → Vĩ độ, Kinh độ)' : '', !p.to ? 'tọa độ nơi giao (Cài đặt → Công ty mua hàng, chọn địa chỉ giao ở tab Vận chuyển)' : ''].filter(Boolean);
    return {km: null, nguon: '', auto: null, thieu: miss.length ? 'chưa có ' + miss.join(' và ') + ', hoặc nhập cự ly thủ công' : 'hai điểm trùng nhau: nhập cự ly thủ công'};
  }
  const api = {haversine, parseToaDo, why, inVN, fmtToaDo, points, auto, eff};
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.HAKCuLy = api;
})(typeof window !== 'undefined' ? window : globalThis);
