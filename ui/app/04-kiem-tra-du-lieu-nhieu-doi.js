/* ========== Kiểm tra dữ liệu ========== */
function infoErrors(info, selfId) {
  const e = [];
  if (!info.ma) e.push('Thiếu Mã chủ rừng');
  else if (Object.entries(db.rs).some(([id, r]) => id !== selfId && r.info.ma === info.ma)) e.push('Mã chủ rừng đã tồn tại');
  if (!info.ten) e.push('Thiếu Họ và tên chủ rừng');
  if (!['Ông', 'Bà'].includes(info.danhXung)) e.push('Chọn danh xưng Ông/Bà');
  if (trim(info.sdt) && !/^[0-9 .()+\-]{8,20}$/.test(trim(info.sdt))) e.push('Số điện thoại “' + info.sdt + '” không đúng dạng (8–20 ký tự gồm số, dấu cách, + - . ( ))');
  if (trim(info.ngayKyHopDong) && !HAKDates.isValid(info.ngayKyHopDong)) e.push('Ngày ký hợp đồng “' + info.ngayKyHopDong + '”: ' + HAKDates.why(info.ngayKyHopDong));
  if (!isCccd(info.cccd)) e.push('CCCD phải đủ 12 chữ số');
  if (!info.ngayCap) e.push('Thiếu Ngày cấp CCCD');
  if (!info.noiCap) e.push('Thiếu Nơi cấp CCCD');
  if (!info.diaChi) e.push('Thiếu Địa chỉ thường trú');
  return e;
}

function forestErrors(info, fid) {
  const e = [];
  if (!info.maRung) e.push('Thiếu Mã rừng');
  else { const why = HAKLoRung.maTrung(db, info.maRung, fid); if (why) e.push(why); }   // quy tắc mã lô duy nhất dùng chung (src/lorung.js): không phân biệt hoa thường, liệt kê đủ các lô đang dùng mã
  if (!info.diaDiem) e.push('Thiếu Địa điểm khai thác');
  if (info.lat === 'x') e.push('Vĩ độ không phải là số');
  if (info.lng === 'x') e.push('Kinh độ không phải là số');
  if (info.dienTich === 'x') e.push('Diện tích không phải là số');
  if (info.dinhMucTanHa === 'x') e.push('Định mức không phải là số');
  if (info.dinhMucNgayHa === 'x') e.push('Định mức thời gian khai thác (ngày/ha) không phải là số');
  if (info.soDoi === 'x' || (typeof info.soDoi === 'number' && (!Number.isInteger(info.soDoi) || info.soDoi < 1 || info.soDoi > 20))) e.push('Số đội khai thác phải là số nguyên từ 1 đến 20');
  if (info.cuLy === 'x') e.push('Cự ly không phải là số');
  if (info.khoiLuong === 'x') e.push('Khối lượng thực tế không phải là số');
  if (typeof info.khoiLuong === 'number' && info.khoiLuong < 0) e.push('Khối lượng thực tế không được âm');
  if ((info.lat == null) !== (info.lng == null)) e.push('Nhập đủ vĩ độ và kinh độ (WGS84)');
  if (typeof info.lat === 'number' && Math.abs(info.lat) > 90) e.push('Vĩ độ phải nằm trong khoảng -90 đến 90');
  if (typeof info.lng === 'number' && Math.abs(info.lng) > 180) e.push('Kinh độ phải nằm trong khoảng -180 đến 180');
  if (typeof info.dienTich === 'number' && info.dienTich < 0) e.push('Diện tích không được âm');
  if (typeof info.dinhMucTanHa === 'number' && info.dinhMucTanHa < 0) e.push('Định mức không được âm');
  if (typeof info.dinhMucNgayHa === 'number' && (info.dinhMucNgayHa < 0 || info.dinhMucNgayHa > 365)) e.push('Định mức thời gian khai thác (ngày/ha) phải từ 0 đến 365');
  if (typeof info.cuLy === 'number' && info.cuLy < 0) e.push('Cự ly không được âm');
  const vc = info.vanChuyen || {};
  if (vc.donGiaKm === 'x') e.push('Đơn giá vận chuyển (đ/tấn/km) không phải là số');
  if (vc.coDinh === 'x') e.push('Đơn giá vận chuyển cố định không phải là số');
  return e;
}

function checkNC(rec) {
  const errs = [], warns = [], state = {}, seen = {};
  let tt = 0;
  rec.nc.forEach(r => {
    const at = 'Dòng ' + r._row + ': ';
    const bad = m => { errs.push(at + m); state[r._row] = 'err'; };
    const warn = m => { warns.push(at + m); if (!state[r._row]) state[r._row] = 'warn'; };
    if (r.maRung && r.maRung !== rec.info.maRung) bad('Mã rừng "' + r.maRung + '" khác lô đang mở (' + rec.info.maRung + '): để trống ô Mã rừng hoặc sửa cho đúng lô');
    const role = /^tổ trưởng/i.test(r.vaiTro) ? 'TT' : /^công nhân/i.test(r.vaiTro) ? 'CN' : null;
    if (!role) bad('Vai trò phải là "Tổ trưởng" hoặc "Công nhân"');
    if (role === 'TT') tt++;
    if (!r.ten) bad('thiếu Họ và tên');
    if (!['Ông', 'Bà'].includes(r.danhXung)) bad('Danh xưng phải là Ông hoặc Bà');
    if (!r.ngaySinh) bad('thiếu Ngày sinh');
    else if (!parseVN(r.ngaySinh)) bad('Ngày sinh "' + r.ngaySinh + '" không có thật hoặc sai dd/mm/yyyy');
    if (!r.ngayCap) bad('thiếu Ngày cấp CCCD');
    else if (!parseVN(r.ngayCap)) bad('Ngày cấp CCCD "' + r.ngayCap + '" không có thật hoặc sai dd/mm/yyyy');
    if (!r.noiCap) bad('thiếu Nơi cấp CCCD');
    if (!r.diaChi) bad('thiếu Địa chỉ thường trú');
    if (!isCccd(r.cccd)) bad('CCCD phải đủ 12 chữ số');
    else if (seen[r.cccd]) bad('CCCD trùng dòng ' + seen[r.cccd]);
    else seen[r.cccd] = r._row;
    if (!chucDanhAll().includes(r.chucDanh)) bad('Chức danh không hợp lệ: "' + r.chucDanh + '"');
    if (role === 'TT' && r.chucDanh !== 'Tổ trưởng') bad('Tổ trưởng phải có chức danh "Tổ trưởng"');
    if (role === 'CN' && r.chucDanh === 'Tổ trưởng') bad('Công nhân không được ghi chức danh "Tổ trưởng"');
    const ngc = rec.info.hinhThucLuong === 'ngaycong';
    if (chucDanhAll().includes(r.chucDanh)) {
      const rate = rateOf(rec.info, r);
      if (!(rate > 0)) bad('chưa có đơn giá ' + basisOf(rec.info).short + ' cho "' + r.chucDanh + '" trong mục Cơ sở tính đơn giá (tab Nhân công)');
    }
  });
  if (tt < 1) errs.push('Cần ít nhất 1 tổ trưởng (hiện có ' + tt + ')');
  else if (tt > 1 && !isDirect(rec.info)) HAKDoi.build(rec.nc, isTT).errs.forEach(e => { errs.push('Dòng ' + e.row + ': ' + e.text); state[e.row] = 'err'; });   // nhiều tổ trưởng = nhiều đội, mỗi người phải thuộc đúng một đội
  return {errs, warns, state};
}

const parseVN = v => { const p = HAKDates.parse(trim(v)); return p ? new Date(p.y, p.m - 1, p.d) : null; };
const driverSigns = r => trim(r.nguoiKy) === 'Tài xế';
function checkDX(rec) {
  const errs = [], warns = [], state = {}, plates = {};
  const n0 = new Date(), today = new Date(n0.getFullYear(), n0.getMonth(), n0.getDate());
  rec.dx.forEach(r => {
    const at = 'Dòng ' + r._row + ': ';
    const bad = m => { errs.push(at + m); state[r._row] = 'err'; };
    if (r.maRung && r.maRung !== rec.info.maRung) bad('Mã rừng "' + r.maRung + '" khác lô đang mở (' + rec.info.maRung + '): để trống ô Mã rừng hoặc sửa cho đúng lô');
    if (!r.chuXe) bad('thiếu Chủ xe');
    if (!r.bienSo) bad('thiếu Biển kiểm soát');
    else if (plates[r.bienSo]) bad('Biển kiểm soát trùng dòng ' + plates[r.bienSo]);
    else plates[r.bienSo] = r._row;
    const nk = trim(r.nguoiKy), tx = driverSigns(r);
    if (nk && nk !== 'Chủ xe' && nk !== 'Tài xế') bad('Người ký HĐ vận chuyển phải là "Chủ xe" hoặc "Tài xế" (đang là "' + nk + '")');
    // Chỉ người ký HĐ vận chuyển bắt buộc có CCCD, ngày cấp, thường trú, SĐT; người không ký thì không cần
    if (tx && !r.taiXe) bad('người ký là tài xế nhưng thiếu Tên tài xế');
    const sg = tx ? {c: r.cccdTx, nc: r.ngayCapTx, dc: r.diaChiTx, w: 'tài xế'} : {c: r.cccd, nc: r.ngayCap, dc: r.diaChi, w: 'chủ xe'};
    if (!isCccd(sg.c)) bad(cccdMsg(sg.w + ' (người ký)', sg.c));
    if (!trim(sg.nc)) bad('thiếu Ngày cấp CCCD ' + sg.w + ' (người ký)');
    else if (!parseVN(sg.nc)) bad('Ngày cấp CCCD ' + sg.w + ' "' + sg.nc + '" không có thật hoặc sai dd/mm/yyyy');
    const sgSinh = tx ? r.ngaySinhTx : r.ngaySinh;
    if (trim(sgSinh) && !parseVN(sgSinh)) bad('Ngày sinh ' + sg.w + ' "' + sgSinh + '" không có thật hoặc sai dd/mm/yyyy');
    if (!trim(sg.dc)) bad('thiếu Thường trú ' + sg.w + ' (người ký)');
    if (!trim(r.sdt)) bad('thiếu SĐT người ký (' + sg.w + ')');
    // Cảnh báo, không chặn xuất hồ sơ
    const w = [];
    const need = tx ? [['ngaySinhTx', 'ngày sinh tài xế'], ['noiCapTx', 'nơi cấp CCCD tài xế']]
      : [['ngaySinh', 'ngày sinh chủ xe'], ['noiCap', 'nơi cấp CCCD chủ xe']];
    const miss = need.filter(([k]) => !trim(r[k])).map(x => x[1]);
    if (miss.length) w.push('người ký còn thiếu ' + miss.join(', ') + ' (hợp đồng để trống)');
    if (r.taiXe && !r.gplx) w.push('thiếu Số GPLX');
    const exp = (k, label, must) => {
      const v = trim(r[k]);
      if (!v) { if (must) w.push('thiếu ' + label); return; }
      const d = parseVN(v);
      if (!d) w.push(label + ' "' + v + '" không đúng dd/mm/yyyy');
      else if (d < today) w.push(label + ' đã hết hạn (' + v + ')');
      else if ((d - today) / 864e5 <= 30) w.push(label + ' sắp hết hạn (' + v + ')');
    };
    if (r.taiXe) exp('hanGplx', 'ngày đến hạn GPLX', true);
    exp('hanBH', 'ngày đến hạn bảo hiểm', true);
    exp('kdDen', 'ngày hết hạn kiểm định', true);
    if (r.cavet && !parseVN(r.cavet)) w.push('ngày cấp cà vẹt "' + r.cavet + '" không có thật hoặc sai dd/mm/yyyy');
    if (r.kdTu && !parseVN(r.kdTu)) w.push('kiểm định từ ngày "' + r.kdTu + '" không đúng dd/mm/yyyy');
    if (parseVN(r.kdTu) && parseVN(r.kdDen) && parseVN(r.kdDen) < parseVN(r.kdTu)) w.push('kiểm định đến ngày trước từ ngày');
    if (w.length) { warns.push(at + w.join('; ')); if (!state[r._row]) state[r._row] = 'warn'; }
  });
  // hai người ký khác tên mà cùng số CCCD sẽ bị gộp thành MỘT hợp đồng (mỗi người ký một hợp đồng): chặn và nêu rõ các dòng
  const bySigner = {};
  rec.dx.forEach(r => { const tx = driverSigns(r), c = signerKey(tx ? r.cccdTx : r.cccd), nm = tx ? r.taiXe : r.chuXe; if (!c || !trim(nm)) return; (bySigner[c] = bySigner[c] || []).push({row: r._row, nm: trim(nm), w: tx ? 'tài xế' : 'chủ xe'}); });
  Object.entries(bySigner).forEach(([c, l]) => { const names = [...new Set(l.map(x => keyName(x.nm)))]; if (names.length > 1) { const msg = 'CCCD ' + c + ' của ' + l.map(x => x.w + ' “' + x.nm + '” (dòng ' + x.row + ')').join(' và ') + ' trùng nhau nhưng khác họ tên: hai người ký phải có CCCD riêng, nếu không chỉ ra MỘT hợp đồng. Sửa CCCD hoặc họ tên cho đúng người'; errs.push(msg); l.forEach(x => { state[x.row] = 'err'; }); } });
  return {errs, warns, state};
}

// Đơn giá vận chuyển (đ/tấn) của rừng. Trả về {gia, text} hoặc {loi}
/* Đơn giá vận chuyển (chủ rừng trả bên vận chuyển): HAI cách tính.
   1. Cố định: một đơn giá đồng/tấn, không phụ thuộc cự ly.
   2. Tấn/km: đơn giá đồng/tấn/km × cự ly (km) của rừng.
   Cách “theo bậc cự ly” của bản cũ không còn dùng; hồ sơ cũ còn chọn cách đó phải chọn lại một trong hai cách trên (dữ liệu bậc cũ được giữ nguyên, không xóa). */
function transportPrice(i) {
  const v = i.vanChuyen || {}, mode = v.mode || 'tanKm';
  if (mode === 'coDinh') return v.coDinh > 0 ? {gia: v.coDinh, text: 'cố định ' + fmt(v.coDinh) + ' đồng/tấn'} : {loi: 'thiếu đơn giá cố định vận chuyển'};
  if (mode !== 'tanKm') return {loi: 'cách tính vận chuyển “theo bậc cự ly” không còn áp dụng: chọn Cố định hoặc Tấn/km ở tab Vận chuyển'};
  const ck = HAKCuLy.eff(i);   // cự ly nhập tay được ưu tiên; không có thì tự tính từ tọa độ rừng đến tọa độ nơi giao (đường chim bay)
  if (!(ck.km > 0)) return {loi: 'thiếu cự ly vận chuyển (km): ' + ck.thieu};
  if (!(v.donGiaKm > 0)) return {loi: 'thiếu đơn giá vận chuyển (đ/tấn/km)'};
  return {gia: Math.round(v.donGiaKm * ck.km), text: fmt(v.donGiaKm) + ' đồng/tấn/km × ' + String(ck.km).replace('.', ',') + ' km' + (ck.nguon === 'tự tính' ? ' (cự ly tự tính từ tọa độ, đường chim bay)' : '')};
}
// Đơn giá lương của một người: đ/công nếu theo ngày công, đ/tấn nếu theo sản lượng
function rateOf(i, r) {
  const v = (i[basisOf(i).map] || {})[r.chucDanh];
  if (v > 0) return v;
  // hồ sơ cũ: giá của Tổ trưởng chỉ nhập ở Thông tin rừng (info.donGia, đ/tấn)
  return (basisOf(i) === BASIS.sanluong && r.chucDanh === 'Tổ trưởng' && i.donGia > 0) ? i.donGia : null;
}
const isDirect = i => i.moHinhKy === 'tructiep';
/* Cơ sở tính đơn giá. Hợp đồng có 2 hình thức:
   - Giao khoán (chủ rừng ký với Tổ trưởng, công nhân ủy quyền cho Tổ trưởng): tính theo TẤN, HA hoặc NGÀY CÔNG (Tổ trưởng nhận thay cả tổ rồi chi trả từng người).
   - Trực tiếp (chủ rừng ký với tất cả nhân công): tính theo TẤN hoặc NGÀY CÔNG.
   Đơn giá theo từng vai trò (chức danh); sản lượng (tấn, ha) hoặc số công chia đều cho mọi người. */
const BASIS = {sanluong: {map: 'donGiaTan', unit: 'đồng/tấn', short: 'đ/tấn', qty: 'tấn'}, ha: {map: 'donGiaHa', unit: 'đồng/ha', short: 'đ/ha', qty: 'ha'}, ngaycong: {map: 'donGiaNgay', unit: 'đồng/công', short: 'đ/công', qty: 'công'}};
const basisOf = i => BASIS[i.hinhThucLuong] || BASIS.sanluong;
const basisAllowed = (direct, b) => direct ? b !== 'ha' : true;   // giao khoán: tấn, ha hoặc ngày công; trực tiếp: tấn hoặc ngày công
const giaErrors = i => basisAllowed(isDirect(i), i.hinhThucLuong || 'sanluong') ? []
  : ['Chủ rừng ký trực tiếp chỉ tính theo tấn hoặc ngày công (không tính theo ha): chọn lại ở tab Nhân công'];
const hdldList = rec => isDirect(rec.info) ? rec.nc : [];   // giao khoán: thay bằng một Giấy ủy quyền (BM-20)
/* ===== Nhiều đội: mỗi Tổ trưởng là một đội, ký hợp đồng giao khoán riêng (src/doi.js) =====
 * doiOf(rec): các đội cùng phần diện tích và khối lượng của lô chia theo số người. subRec(rec, d): hồ sơ của riêng đội d (nhân công của đội, diện tích và khối lượng phần của đội),
 * dùng chung các hàm lập biểu mẫu hiện có nên mỗi đội ra một bộ BM-01, BM-20, BM-08, BM-14 riêng. Lô chỉ một đội: giữ nguyên hồ sơ, không đổi gì. */
const doiOf = rec => { const b = isDirect(rec.info) ? HAKDoi.single(rec.nc, isTT) : HAKDoi.build(rec.nc, isTT), ha = HAKDoi.chia(rec.info.dienTich, b.doi), kl = HAKDoi.chia(rec.info.khoiLuong, b.doi); b.doi.forEach((d, i) => { d.dienTich = ha[i]; d.khoiLuong = kl[i]; }); return b; };
const subRec = (rec, b, d) => !b.multi ? rec : Object.assign({}, rec, {_share: d.share, _doiTen: d.ten, _nDoi: b.doi.length, nc: [d.tt, ...d.members], info: Object.assign({}, rec.info, d.dienTich != null ? {dienTich: d.dienTich} : {}, d.khoiLuong != null ? {khoiLuong: d.khoiLuong} : {})});
const ncList = rec => { const tt = rec.nc.find(isTT); return tt ? [tt, ...rec.nc.filter(r => r !== tt)] : rec.nc.slice(); };   // tổ trưởng đầu danh sách, rồi mọi người còn lại (kể cả các tổ trưởng khác)
/* Lô nhiều đội: mỗi đội ký hợp đồng riêng nên số hợp đồng, giấy ủy quyền, biên bản nghiệm thu của mỗi đội thêm hậu tố .1, .2… ngay sau phần số (015 → 015.1, 015/2026-KT → 015.1/2026-KT).
 * Số để trống (chưa nhập) thì giữ nguyên chỗ trống để điền tay. Số xác nhận khối lượng và hợp đồng vận chuyển là của cả lô nên không đổi. */
const soDoiSo = (x, k) => (x.thieuSo || !x.so) ? x : Object.assign({}, x, {so: /\//.test(x.so) ? x.so.replace('/', '.' + k + '/') : x.so + '.' + k});
const exDoi = (ex, b, idx) => !b.multi ? ex : Object.assign({}, ex, {_so: Object.assign({}, ex._so, {kt: soDoiSo(ex._so.kt, idx + 1), uq: soDoiSo(ex._so.uq, idx + 1), nt: soDoiSo(ex._so.nt, idx + 1)})});
const doiLabel = d => (d.ten ? d.ten + ' — ' : '') + d.tt.ten;
const ucList = rec => rec.nc.filter(r => !isTT(r));         // người ủy quyền cho Tổ trưởng (hình thức giao khoán)
// Khối lượng dùng cho bảng lương: thực tế nếu có, không thì dự kiến (diện tích × định mức)
const volumeOf = i => {
  if (typeof i.khoiLuong === 'number' && i.khoiLuong > 0) return {v: i.khoiLuong, src: 'thực tế'};
  const y = forestYield(i);
  return y > 0 ? {v: y, src: 'dự kiến'} : null;
};
/* Khối lượng DỰ KIẾN (diện tích × định mức): dùng cho các biểu mẫu đợt 1 (hợp đồng, thẩm định, cam kết…) để bản in không đổi khi sau này nhập khối lượng thực tế */
const forecastVol = i => { const y = forestYield(i); return y > 0 ? {v: y, src: 'dự kiến'} : null; };
const fmtCong = n => numSwap(n.toLocaleString('vi-VN', {maximumFractionDigits: 2}));
const fmtTan = n => numSwap(n.toLocaleString('vi-VN', {maximumFractionDigits: 3}));
const workDays = (a, b) => { let n = 0; for (const d = new Date(a); d <= b; d.setDate(d.getDate() + 1)) if (d.getDay() !== 0) n++; return n; };
function payrollPlan(rec, ex) {
  const rs = rec.info, basis = rs.hinhThucLuong === 'ngaycong' ? 'ngaycong' : rs.hinhThucLuong === 'ha' ? 'ha' : 'sanluong', ngc = basis === 'ngaycong', issues = [];
  const tu = trim((ex || {}).tuNgayTT) || rs.tuNgay || '', den = trim((ex || {}).denNgayTT) || rs.denNgay || '';
  const a = parseVN(tu), b = parseVN(den);
  let cong = null, vol = null;
  if (ngc) {
    if (!a || !b) issues.push('thiếu hoặc sai Thời gian khai thác (từ ngày, đến ngày) của rừng');
    else if (b < a) issues.push('ngày kết thúc trước ngày bắt đầu');
    else cong = workDays(a, b);
  } else if (basis === 'ha') {
    vol = (typeof rs.dienTich === 'number' && rs.dienTich > 0) ? {v: rs.dienTich, src: 'diện tích rừng'} : null;
    if (!vol) issues.push('thiếu diện tích của rừng (ha)');
  } else {
    vol = (ex && ex._forecast) ? forecastVol(rs) : volumeOf(rs);
    if (!vol) issues.push('thiếu khối lượng (nhập khối lượng thực tế, hoặc diện tích và định mức của rừng)');
  }
  return {ngc, basis, tu, den, cong, vol, issues};
}
/* Bảng tiền theo từng người: sản lượng (tấn/ha) hoặc số công chia đều; đơn giá theo vai trò. Dùng chung cho BM-01, BM-08, BM-14. */
function payRows(rec, ex) {
  const rs = rec.info, plan = payrollPlan(rec, ex), list = ncList(rec), N = list.length;
  const each = (!plan.ngc && plan.vol && N) ? plan.vol.v / N : null;
  let sum = 0;
  const actual = plan.ngc && !(ex && ex._forecast) && HAKChamCong.hasAny(rec.cc);   // đã chấm công thực tế: số công từng người; hợp đồng (đợt 1) luôn dùng số công dự tính
  const rows = list.map(r => {
    const rate = rateOf(rs, r), cong = plan.ngc ? (actual ? HAKChamCong.total(rec.cc, HAKChamCong.personKey(r)) : plan.cong) : null; let tien = null;
    if (rate) tien = plan.ngc ? (cong != null ? Math.round(rate * cong) : null) : (each != null ? Math.round(each * rate) : null);
    if (tien != null) sum += tien;
    return {r, rate, tien, cong};
  });
  const khoan = HAKKhoan.derive(list.map(r => rateOf(rs, r)), (!plan.ngc && plan.vol) ? plan.vol.v : null);   // đơn giá khoán của tổ suy ra từ định biên
  return {plan, list, N, each, rows, sum, khoan, actual};
}
/* Giao khoán, trường hợp 1 (Thông tin rừng KHÔNG có đơn giá Tổ trưởng): đơn giá khoán của tổ = đơn giá bình quân suy ra từ định biên nhân sự (số người từng vị trí ở sheet nhân công × đơn giá vị trí).
 * Trường hợp 2 (Thông tin rừng có đơn giá Tổ trưởng): làm như cũ. Trả null khi không áp dụng. */
const khoanSuyRa = rec => {
  const rs = rec.info; if (isDirect(rs) || rs.donGia > 0) return null;
  const pr = payRows(rec, {}); if (pr.plan.ngc || !pr.khoan.ok) return null;
  const bs = basisOf(rs), pos = chucDanhAll().map(cd => { const n = rec.nc.filter(r => r.chucDanh === cd).length; return {cd, n, rate: rateOf(rs, {chucDanh: cd})}; }).filter(x => CHUCDANH.includes(x.cd) || x.n > 0);
  const used = pos.filter(x => x.n > 0), k = pr.khoan;
  const formula = '(' + used.map(x => x.n + ' × ' + fmt(x.rate)).join(' + ') + ') ÷ ' + k.N + ' người = ' + HAKKhoan.fmtPrice(k.sumRates) + ' ÷ ' + k.N + ' = ' + HAKKhoan.fmtPrice(k.price) + ' ' + bs.unit;
  return {pr, k, bs, pos, used, formula, price: HAKKhoan.fmtPrice(k.price), qty: bs.qty === 'ha' ? 'diện tích' : 'sản lượng'};
};
/* Đơn giá khoán theo TỪNG vị trí: luôn liệt kê đủ cả ba vị trí (Tổ trưởng, Công nhân khai thác, Công nhân cưa), kể cả khi chưa có người ở vị trí đó */
const roleRates = rec => chucDanhAll().filter(cd => CHUCDANH.includes(cd) || rec.nc.some(r => r.chucDanh === cd)).map(cd => { const n = rec.nc.filter(r => r.chucDanh === cd).length; const rate = rateOf(rec.info, {chucDanh: cd}); return cd + ': ' + (rate ? fmt(rate) : '………') + ' ' + basisOf(rec.info).unit + (n ? ' (' + n + ' người)' : ' (hiện chưa có người ở vị trí này)'); });
/* Ngày tham chiếu để chọn bản định mức BHLĐ có hiệu lực: danh sách cấp phát BM-02 theo ngày cấp phát (hoặc ngày bắt đầu khai thác); hợp đồng lao động BM-03 theo ngày bắt đầu hợp đồng, ngày ký, hoặc ngày bắt đầu khai thác */
const normRefCapPhat = (rec, ex) => { const e = ex || rec.exp || {}; return HAKDates.isValid(e.capNgay) ? e.capNgay : (rec.info.tuNgay || ''); };
const normRefHDLD = (rec, ex) => { const e = ex || rec.exp || {}; return [rec.info.ngayBDLD, e.ngayKy, rec.info.ngayKyHopDong, rec.info.tuNgay].find(x => HAKDates.isValid(x)) || ''; };
const normErrors = rec => { const ref = normRefCapPhat(rec), pk = HAKDinhMuc.pick(db, ref), out = [];
  if (!pk.found) return ['chưa có bản định mức BHLĐ hiệu lực tại ngày ' + ref + ' (bản sớm nhất hiệu lực từ ' + (pk.earliest.tuNgay || '…') + '): thêm bản định mức hoặc đổi ngày cấp phát'];
  [...new Set(rec.nc.map(r => r.chucDanh))].filter(cd => chucDanhAll().includes(cd) && !BHLD_ITEMS.some(([k]) => trim(((pk.ver.dm || {})[cd] || {})[k]))).forEach(cd => out.push('chưa có định mức BHLĐ cho chức danh "' + cd + '"' + (pk.ver.tuNgay ? ' (bản hiệu lực từ ' + pk.ver.tuNgay + ')' : '')));
  return out; };
/* Định mức của một vị trí tại ngày ref (không truyền ref: bản mới nhất) */
function normOf(chucDanh, ref) { return HAKDinhMuc.normFor(db, chucDanh, ref).norm; }
// Thông tin pháp lý & tọa độ của rừng, ghi trong điều khoản địa điểm
function rungText(i) {
  const parts = [];
  if (i.lat != null && i.lng != null) parts.push('tọa độ điểm tâm (WGS84): ' + i.lat + ', ' + i.lng);
  (i.giayTo || []).forEach(g => parts.push((g.loai === 'Khác' && g.ten ? g.ten : g.loai) + (g.so ? ' số ' + g.so : '') + (g.ngayCap ? ', ngày cấp ' + g.ngayCap : '') + (g.coQuan ? ', ' + g.coQuan : '')));
  return parts.length ? ' (' + parts.join('; ') + ')' : '';
}

function gate(rec) {
  const info = [...infoErrors(rec.info, rec.id), ...forestErrors(rec.info, rec.fid), ...giaErrors(rec.info), ...HAKNhapLieu.kiemTra(rec).filter(x => x.kind === 'chan').map(x => x.text)];   // ngày sai/khoảng ngày đảo cũng chặn xuất: biểu mẫu sẽ in ra sai
  const nc = checkNC(rec);
  const dx = checkDX(rec);
  const vc = transportPrice(rec.info);
  const hasTT = rec.nc.some(isTT);
  const direct = isDirect(rec.info), normErrs = normErrors(rec);
  const pc = checkPC(rec);
  return {
    pc, info, nc, dx, direct, normErrs, vc: vc.loi ? [vc.loi] : [],
    canGK: !direct && !info.length && !nc.errs.length && hasTT,
    canBHLD: !info.length && !nc.errs.length && hasTT,
    canPhat: !info.length && !nc.errs.length && hasTT && !normErrs.length,
    canHDLD: !info.length && !nc.errs.length && hasTT && hdldList(rec).length > 0,
    canUQ: !direct && !info.length && !nc.errs.length && hasTT && ucList(rec).length > 0 && !minorsOf(rec).length,   // người ủy quyền phải từ đủ 18 tuổi (Điều 18 BLLĐ 2019)
    canHDVC: !info.length && !dx.errs.length && rec.dx.length > 0 && !vc.loi,
    canPC: !info.length && !dx.errs.length && rec.dx.length > 0 && !vc.loi && (rec.pc || []).length > 0 && !pc.errs.length
  };
}

