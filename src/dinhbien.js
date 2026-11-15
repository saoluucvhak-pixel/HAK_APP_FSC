/* Định mức nhân công (định biên một đội khai thác): mỗi vị trí có SỐ NGƯỜI và NHIỆM VỤ ghi rõ. Hàm thuần, không phụ thuộc giao diện, dùng chung ở giao diện (nhúng khi build) và kiểm thử Node.
 *
 * db.dinhBien = [{chucDanh, soNguoi, kiemNhiem, nhiemVu}] (chưa lưu thì dùng MAC_DINH):
 *   - chucDanh  : tên vị trí, trùng với chức danh nhân công (Tổ trưởng, Công nhân cưa, …)
 *   - soNguoi   : số người của vị trí trong một đội (số nguyên 1–50)
 *   - kiemNhiem : (tùy chọn) vị trí khác mà người này kiêm. Người kiêm nhiệm là MỘT trong số người của vị trí gốc, không tính thêm người.
 *   - nhiemVu   : nhiệm vụ của vị trí
 * Mặc định: 1 đội 8 người = 1 Tổ trưởng (kiêm bốc xếp) + 2 Công nhân cưa + 3 Công nhân bóc vỏ + 2 Công nhân bốc xếp; tổ bốc xếp thực tế có 3 người (2 + Tổ trưởng). */
(function (root) {
  const trim = s => String(s == null ? '' : s).replace(/\s+/g, ' ').trim();
  const TO_TRUONG = 'Tổ trưởng';
  const MAC_DINH = [
    {chucDanh: TO_TRUONG, soNguoi: 1, kiemNhiem: 'Công nhân bốc xếp', nhiemVu: 'Điều hành cả đội và phân công từng tổ theo kế hoạch ngày; ký hợp đồng giao khoán với chủ rừng; chấm công, giám sát an toàn lao động và chất lượng gỗ; làm việc với chủ xe và bên mua; kiêm bốc xếp khi xe vào.'},
    {chucDanh: 'Công nhân cưa', soNguoi: 2, kiemNhiem: '', nhiemVu: 'Hạ toàn bộ cây ở khu vực đất bằng và dọc theo tuyến đường mở sẵn để lấy mặt bằng rộng rãi; cắt khúc theo quy cách.'},
    {chucDanh: 'Công nhân bóc vỏ', soNguoi: 3, kiemNhiem: '', nhiemVu: 'Bóc vỏ và xếp gỗ gọn dọc theo lối xe tải vào.'},
    {chucDanh: 'Công nhân bốc xếp', soNguoi: 2, kiemNhiem: '', nhiemVu: 'Bốc đầy chuyến xe tải (khoảng 15–20 tấn), xuất bán ngay để thu hồi vốn xoay vòng; xếp gỗ đúng tải trọng và gọn trên xe.'}
  ];
  const clone = x => JSON.parse(JSON.stringify(x));
  /* định biên đang dùng: bản đã lưu, chưa lưu thì mặc định. saved = đã lưu thật */
  function get(db) {
    const l = Array.isArray(db && db.dinhBien) && db.dinhBien.length ? db.dinhBien : null;
    return {rows: clone(l || MAC_DINH), saved: !!l};
  }
  const tong = rows => rows.reduce((s, r) => s + (typeof r.soNguoi === 'number' ? r.soNguoi : 0), 0);
  /* kiểm tra danh sách nhập; trả {ok, error (nêu số dòng), rows (đã chuẩn hóa)} */
  function check(raw) {
    const rows = [], seen = new Set();
    const list = (raw || []).filter(r => trim(r.chucDanh) || trim(r.soNguoi) || trim(r.nhiemVu) || trim(r.kiemNhiem));
    if (!list.length) return {ok: false, error: 'Chưa có vị trí nào trong định mức nhân công'};
    for (let i = 0; i < list.length; i++) {
      const r = list[i], at = 'Dòng ' + (i + 1) + ': ', cd = trim(r.chucDanh), n = typeof r.soNguoi === 'number' ? r.soNguoi : Number(String(r.soNguoi).replace(',', '.'));
      if (!cd) return {ok: false, error: at + 'thiếu tên vị trí'};
      if (cd.length > 60) return {ok: false, error: at + 'tên vị trí tối đa 60 ký tự'};
      if (seen.has(cd.toLowerCase())) return {ok: false, error: at + 'vị trí “' + cd + '” bị trùng'}; seen.add(cd.toLowerCase());
      if (!isFinite(n) || !Number.isInteger(n) || n < 0 || n > 50) return {ok: false, error: at + 'số người của “' + cd + '” phải là số nguyên từ 0 đến 50 (0 = vị trí ngoài định biên chuẩn của một đội)'};
      const km = trim(r.kiemNhiem); if (km && km.toLowerCase() === cd.toLowerCase()) return {ok: false, error: at + '“' + cd + '” không thể kiêm chính vị trí của mình'};
      const nv = trim(r.nhiemVu); if (!nv && n > 0) return {ok: false, error: at + 'chưa ghi nhiệm vụ của “' + cd + '”'};
      if (nv.length > 600) return {ok: false, error: at + 'nhiệm vụ của “' + cd + '” tối đa 600 ký tự'};
      rows.push({chucDanh: cd, soNguoi: n, kiemNhiem: km, nhiemVu: nv});
    }
    const tt = rows.filter(r => r.chucDanh.toLowerCase() === TO_TRUONG.toLowerCase());
    if (tt.length !== 1 || tt[0].soNguoi !== 1) return {ok: false, error: 'Định mức phải có đúng một vị trí “' + TO_TRUONG + '” và chỉ 1 người (mỗi đội có đúng 1 tổ trưởng; định mức này tính cho MỘT đội)'};
    const bad = rows.find(r => r.kiemNhiem && !rows.some(x => x.chucDanh.toLowerCase() === r.kiemNhiem.toLowerCase()));
    if (bad) return {ok: false, error: '“' + bad.chucDanh + '” kiêm “' + bad.kiemNhiem + '” nhưng vị trí này không có trong định mức'};
    return {ok: true, rows};
  }
  /* so sánh nhân công thực tế với định biên: mỗi vị trí CÓ trong định biên chuẩn (số người > 0) {chucDanh, can, co, lech (co − can)};
   * ngoai = người có chức danh không nằm trong định biên chuẩn (vị trí 0 người hoặc chưa có trong danh mục; chuan0 = true nếu là vị trí 0 người của danh mục); tổng cần và có */
  function soSanh(rows, nc) {
    const dem = {}; (nc || []).forEach(r => { const k = trim(r.chucDanh).toLowerCase(); dem[k] = (dem[k] || 0) + 1; });
    const zero = new Set(rows.filter(r => !(r.soNguoi > 0)).map(r => r.chucDanh.toLowerCase()));
    rows = rows.filter(r => r.soNguoi > 0);
    const vt = rows.map(r => ({chucDanh: r.chucDanh, can: r.soNguoi, co: dem[r.chucDanh.toLowerCase()] || 0, lech: (dem[r.chucDanh.toLowerCase()] || 0) - r.soNguoi, kiemNhiem: r.kiemNhiem, nhiemVu: r.nhiemVu}));
    const known = new Set(rows.map(r => r.chucDanh.toLowerCase()));
    const ngoai = Object.keys(dem).filter(k => k && !known.has(k)).map(k => ({chucDanh: (nc.find(r => trim(r.chucDanh).toLowerCase() === k) || {}).chucDanh, co: dem[k], chuan0: zero.has(k)}));
    return {vt, ngoai, can: tong(rows), co: (nc || []).length, lech: vt.filter(v => v.lech !== 0)};
  }
  /* câu nêu chênh lệch (rỗng nếu đúng định biên) */
  function lechText(sc) {
    const p = [];
    sc.vt.forEach(v => { if (v.lech < 0) p.push('thiếu ' + (-v.lech) + ' ' + v.chucDanh); else if (v.lech > 0) p.push('thừa ' + v.lech + ' ' + v.chucDanh); });
    sc.ngoai.forEach(x => p.push(x.co + ' người giữ vị trí “' + x.chucDanh + '” ' + (x.chuan0 ? 'ngoài định biên chuẩn (số người 0)' : 'không có trong định mức')));
    return p.join('; ');
  }
  /* ghi vào db, tự thêm các vị trí chưa có vào danh sách chức danh (db.chucDanhThem) để chọn được ở Nhân công, Định mức BHLĐ, đơn giá. dm = HAKDinhMuc */
  function set(db, raw, dm) {
    const c = check(raw); if (!c.ok) return c;
    // danh mục vị trí là chính định mức nhân công (danhMuc): vị trí mới chỉ cần ghi ở đây, không còn thêm riêng vào danh sách chức danh
    const them = c.rows.map(r => r.chucDanh).filter(cd => !(dm && dm.allPositions(db).some(x => x.toLowerCase() === cd.toLowerCase())));
    db.dinhBien = c.rows; return {ok: true, them};
  }
  /* DANH MỤC VỊ TRÍ — nguồn duy nhất cho chức danh nhân công, định mức BHLĐ và đơn giá khoán (cấu trúc 2.0, giai đoạn 2).
   * Đã lưu định mức nhân công: đúng các dòng đã lưu (theo thứ tự) + vị trí `ten` còn đang được dùng mà chưa có (số người 0).
   * Chưa lưu: Tổ trưởng, các vị trí mặc định cũ (`ten` truyền vào giữ thứ tự cũ: Công nhân khai thác, Công nhân cưa…), rồi các vị trí còn lại của định biên mặc định;
   * vị trí ngoài định biên mặc định có số người 0. Trả {rows, saved} (rows dạng của định biên: chucDanh, soNguoi, kiemNhiem, nhiemVu). */
  function danhMuc(db, ten) {
    const g = get(db), rows = [], seen = new Set();
    const add = r => { const k = trim(r.chucDanh).toLowerCase(); if (!k || seen.has(k)) return; seen.add(k); rows.push({chucDanh: trim(r.chucDanh), soNguoi: typeof r.soNguoi === 'number' ? r.soNguoi : 0, kiemNhiem: r.kiemNhiem || '', nhiemVu: r.nhiemVu || ''}); };
    const def = name => MAC_DINH.find(x => x.chucDanh.toLowerCase() === trim(name).toLowerCase()) || {chucDanh: name, soNguoi: 0};
    if (g.saved) { g.rows.forEach(add); (ten || []).forEach(t => add({chucDanh: t})); }
    else { add(def(TO_TRUONG)); (ten || []).forEach(t => add(def(t))); MAC_DINH.forEach(add); }
    return {rows, saved: g.saved};
  }
  const api = {MAC_DINH, TO_TRUONG, get, tong, check, soSanh, lechText, set, danhMuc};
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.HAKDinhBien = api;
})(typeof self !== 'undefined' ? self : this);
