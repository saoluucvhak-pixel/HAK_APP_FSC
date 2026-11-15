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
  /* PHIÊN BẢN theo ngày hiệu lực (bản 2.2): db.dinhBien là BẢN GỐC (áp dụng cho lô bắt đầu trước mọi phiên bản có ngày); db.dinhBienVer = [{tuNgay, rows}] là các phiên bản có ngày.
   * Lô dùng phiên bản có hiệu lực tại ngày bắt đầu khai thác của lô (không có ngày thì dùng bản mới nhất). Chưa có phiên bản có ngày thì mọi thứ như trước (bản in lô cũ không đổi). */
  /* ngày lịch dùng CHUNG (src/dates.js): chỉ ngày có thật mới có khóa; ngày thiếu hoặc không có thật cho 0. Tải chậm để chạy được cả trình duyệt (HAKDates) lẫn Node. */
  const Dt = () => (typeof require !== 'undefined' ? require('./dates') : root.HAKDates);
  const dkey = v => Dt().key(trim(v));
  const dayOk = v => Dt().isValid(trim(v));
  function versions(db) {
    const l = Array.isArray(db && db.dinhBien) && db.dinhBien.length ? db.dinhBien : null;
    const out = [{id: 'goc', tuNgay: '', rows: clone(l || MAC_DINH), saved: !!l}];
    (Array.isArray(db && db.dinhBienVer) ? db.dinhBienVer : []).filter(v => v && dkey(v.tuNgay) && Array.isArray(v.rows)).sort((a, b) => dkey(a.tuNgay) - dkey(b.tuNgay)).forEach(v => out.push({id: trim(v.tuNgay), tuNgay: trim(v.tuNgay), rows: clone(v.rows), saved: true}));
    return out;
  }
  /* phiên bản hiệu lực tại ngày ref (ref rỗng: mới nhất) */
  /* phiên bản hiệu lực tại ngày ref. Ref TRỐNG: bản mới nhất. Ref đã nhập nhưng KHÔNG CÓ THẬT (ví dụ 31/11/2026): trả null khi có nhiều phiên bản (không âm thầm chọn bản gốc hay bản mới nhất);
   * kể cả khi chỉ có bản gốc (xác thực ngày TRƯỚC khi xét số phiên bản). */
  function pick(db, ref) {
    const vs = versions(db), t = trim(ref); if (!t) return vs[vs.length - 1]; const k = dkey(t); if (!k) return null; if (vs.length === 1) return vs[0];
    let r = vs[0]; vs.forEach(v => { if (v.tuNgay && dkey(v.tuNgay) <= k) r = v; }); return r;
  }
  /* định biên đang dùng: bản đã lưu, chưa lưu thì mặc định. saved = đã lưu thật. ref = ngày bắt đầu khai thác của lô (tùy chọn) */
  function get(db, ref) {
    const v = pick(db, ref), goc = versions(db)[0];
    if (!v) return {rows: [], saved: goc.saved || (db && db.dinhBienVer && db.dinhBienVer.length > 0), tuNgay: '', id: '', ngayLoi: 'Ngày bắt đầu khai thác “' + trim(ref) + '” không có thật (hoặc sai dd/mm/yyyy) nên chưa chọn được phiên bản định mức nhân công: sửa ngày ở Thông tin rừng'};
    return {rows: clone(v.rows), saved: goc.saved || v.id !== 'goc', tuNgay: v.tuNgay, id: v.id};
  }
  /* thêm phiên bản từ ngày tuNgay: sao chép phiên bản đang hiệu lực tại ngày đó rồi sửa sau */
  function addVersion(db, tuNgay) {
    const t = trim(tuNgay); if (!dayOk(t)) return {ok: false, error: 'Ngày hiệu lực phải đúng dd/mm/yyyy và là ngày có thật'};
    if (versions(db).some(v => v.id === t || (v.tuNgay && dkey(v.tuNgay) === dkey(t)))) return {ok: false, error: 'Đã có phiên bản hiệu lực từ ngày ' + t};
    const base = pick(db, t); if (!(Array.isArray(db.dinhBien) && db.dinhBien.length)) db.dinhBien = clone(versions(db)[0].rows);
    db.dinhBienVer = (db.dinhBienVer || []).concat([{tuNgay: t, rows: clone(base.rows)}]); return {ok: true, id: t};
  }
  /* ghi một phiên bản (id 'goc' = bản gốc) */
  function setVersion(db, id, raw, dm) {
    if (id === 'goc' || !id) return set(db, raw, dm);
    const c = check(raw); if (!c.ok) return c; const v = (db.dinhBienVer || []).find(x => trim(x.tuNgay) === id); if (!v) return {ok: false, error: 'Không có phiên bản này'};
    v.rows = c.rows; return {ok: true, them: []};
  }
  function delVersion(db, id) { if (id === 'goc') return {ok: false, error: 'Không xóa được bản gốc'}; db.dinhBienVer = (db.dinhBienVer || []).filter(x => trim(x.tuNgay) !== id); return {ok: true}; }
  /* lô bị ảnh hưởng bởi phiên bản id: lô có ngày bắt đầu từ ngày của phiên bản đến trước phiên bản kế tiếp; lô để TRỐNG ngày bắt đầu dùng bản mới nhất. Lô có ngày đã nhập nhưng không có thật
   * KHÔNG được tính vào đâu (chưa chọn được phiên bản): trả riêng ở anhHuongChiTiet. lots = [{maRung, tuNgay}] */
  function anhHuongChiTiet(db, id, lots) {
    const vs = versions(db), i = vs.findIndex(v => v.id === id), out = {lo: [], ngayLoi: []}; if (i < 0) return out;
    const lo = vs[i].tuNgay ? dkey(vs[i].tuNgay) : 0, hi = vs[i + 1] ? dkey(vs[i + 1].tuNgay) : Infinity;
    (lots || []).forEach(l => { const t = trim(l.tuNgay), k = dkey(t); if (!t) { if (i === vs.length - 1) out.lo.push(l); } else if (!k) out.ngayLoi.push(l); else if (k >= lo && k < hi) out.lo.push(l); });
    return out;
  }
  const anhHuong = (db, id, lots) => anhHuongChiTiet(db, id, lots).lo;
  const tong = rows => rows.reduce((s, r) => s + (typeof r.soNguoi === 'number' ? r.soNguoi : 0), 0);
  /* kiểm tra danh sách nhập; trả {ok, error (nêu số dòng), rows (đã chuẩn hóa)} */
  function check(raw) {
    const rows = [], seen = new Set();
    const list = (raw || []).filter(r => trim(r.chucDanh) || trim(r.soNguoi) || trim(r.nhiemVu) || trim(r.kiemNhiem));
    if (!list.length) return {ok: false, error: 'Chưa có vị trí nào trong định mức nhân công'};
    for (let i = 0; i < list.length; i++) {
      const r = list[i], at = 'Dòng ' + (i + 1) + ': ', cd = trim(r.chucDanh), n = typeof r.soNguoi === 'number' ? r.soNguoi : Number(String(r.soNguoi).replace(',', '.'));
      if (!cd) return {ok: false, error: at + 'thiếu tên vị trí'};
      const trong = r.soNguoi == null || (typeof r.soNguoi === 'string' && !trim(r.soNguoi));   // ô TRỐNG khác số 0: 0 = vị trí ngoài định biên chuẩn, do người dùng chủ động nhập
      if (trong) return {ok: false, error: at + 'chưa nhập số người của “' + cd + '” (nhập 0 nếu vị trí nằm ngoài định biên chuẩn của một đội)'};
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
  const api = {MAC_DINH, TO_TRUONG, get, versions, pick, addVersion, setVersion, delVersion, anhHuong, anhHuongChiTiet, tong, check, soSanh, lechText, set, danhMuc};
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.HAKDinhBien = api;
})(typeof self !== 'undefined' ? self : this);
