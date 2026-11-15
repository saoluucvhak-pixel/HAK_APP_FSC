/* ========== Màn Danh mục (bản 2.1; docs/THIET_KE_QUY_TRINH_2_1.md): chức vụ / vị trí, lao động, xe vận chuyển, định mức BHLĐ, đối tác ==========
 * Thông tin gốc nhập MỘT LẦN ở đây. Lao động và xe lưu NHIỀU DÒNG theo NGÀY CẬP NHẬT (db.dmLaoDong, db.dmXeVC, src/danhmuc.js); luôn dùng dòng mới nhất. */
let dmTab = 'laodong', dmQ = '', dmLs = null, dmSuaLd = null, dmSuaXe = null, dmSuaDt = null;
const DM_TABS = [['chucvu', 'Chức vụ / vị trí'], ['laodong', 'Lao động'], ['nguoi', 'Người (chung)'], ['xe', 'Xe vận chuyển'], ['bhld', 'Định mức BHLĐ'], ['doitac', 'Đối tác']];
const H_DMLD = {'Ngày cập nhật': 'ngayCapNhat', 'Số CCCD': 'cccd', 'Họ và tên': 'ten', 'Giới tính': 'gioiTinh', 'Ngày sinh': 'ngaySinh', 'Nơi thường trú': 'diaChi', 'Ngày cấp': 'ngayCap', 'Nơi cấp': 'noiCap', 'Số điện thoại': 'sdt', 'Chức vụ': 'chucVu', 'Vị trí': 'viTri'};
const H_DMXE = {'Ngày cập nhật': 'ngayCapNhat', 'Biển số xe': 'bienSo', 'Chủ xe': 'chuXe', 'Tên tài xế': 'taiXe', 'CCCD tài xế': 'cccdTx', 'Thường trú': 'diaChiTx', 'Ngày cấp': 'ngayCapTx', 'Nơi cấp': 'noiCapTx', 'Số giấy phép lái xe': 'gplx', 'Ngày hết hạn giấy phép': 'hanGplx', 'Ngày hết hạn đăng kiểm': 'hanDangKiem', 'Ngày hết hạn bảo hiểm': 'hanBaoHiem', 'Loại xe': 'loaiXe', 'CCCD chủ xe': 'cccd', 'Ngày sinh chủ xe': 'ngaySinh', 'Ngày cấp CCCD chủ xe': 'ngayCap', 'Nơi cấp CCCD chủ xe': 'noiCap', 'Thường trú chủ xe': 'diaChi', 'Điện thoại chủ xe': 'sdt', 'Ngày cấp cà vẹt': 'cavet', 'Người ký hợp đồng vận chuyển': 'nguoiKy'};
const dmNormLd = o => ({_row: o._row, ngayCapNhat: normDate(o.ngayCapNhat), cccd: normCccd(o.cccd), ten: trim(o.ten), gioiTinh: trim(o.gioiTinh), ngaySinh: normDate(o.ngaySinh), diaChi: trim(o.diaChi), ngayCap: normDate(o.ngayCap), noiCap: trim(o.noiCap), sdt: trim(o.sdt), chucVu: trim(o.chucVu), viTri: trim(o.viTri)});
const dmNormXe = o => ({_row: o._row, ngayCapNhat: normDate(o.ngayCapNhat), bienSo: trim(o.bienSo).toUpperCase(), chuXe: trim(o.chuXe), taiXe: trim(o.taiXe), cccdTx: normCccd(o.cccdTx), diaChiTx: trim(o.diaChiTx), ngayCapTx: normDate(o.ngayCapTx), noiCapTx: trim(o.noiCapTx), gplx: trim(o.gplx), hanGplx: normDate(o.hanGplx), hanDangKiem: normDate(o.hanDangKiem), hanBaoHiem: normDate(o.hanBaoHiem), loaiXe: trim(o.loaiXe), cccd: normCccd(o.cccd), ngaySinh: normDate(o.ngaySinh), ngayCap: normDate(o.ngayCap), noiCap: trim(o.noiCap), diaChi: trim(o.diaChi), sdt: trim(o.sdt), cavet: normDate(o.cavet), nguoiKy: trim(o.nguoiKy)});
const dmLd = () => db.dmLaoDong || [], dmXe = () => db.dmXeVC || [], dmDt = () => db.dmDoiTac || [];
const dmHetHan = v => { const d = parseVN(v), t = parseVN(todayStr()); return d && t && d < t; };
function dmSelect(name, list, cur, blank) {
  return '<select name="' + name + '"><option value="">' + (blank || '—') + '</option>' + list.map(x => '<option' + (x === cur ? ' selected' : '') + '>' + esc(x) + '</option>').join('') + '</select>';
}
function dmFld(name, label, v, o) { o = o || {}; return '<label><span class="' + (o.req ? 'req' : '') + '">' + label + '</span><input name="' + name + '" value="' + esc(v == null ? '' : v) + '"' + (o.ph ? ' placeholder="' + esc(o.ph) + '"' : '') + '></label>'; }
function dmLoc(rows, test) { const w = foldVi(dmQ).split(/\s+/).filter(Boolean); return !w.length ? rows : rows.filter(r => { const t = foldVi(test(r)); return w.every(x => t.includes(x)); }); }
const dmBoxLoc = ph => '<div class="row" style="margin:8px 0"><label style="flex:1;min-width:220px">Tìm nhanh<br><input id="dmQ" style="width:100%" value="' + esc(dmQ) + '" placeholder="' + esc(ph) + '"></label></div>';

/* ----- Lao động ----- */
function dmTabLaoDong() {
  const e = dmSuaLd || {}, tay = HAKDanhMuc.laoDongHieuLuc(dmLd());
  const rows = dmLoc(tay, r => [r.ten, r.cccd, r.diaChi, r.sdt, r.chucVu, r.viTri].join(' '));
  const form = '<form id="dmLdForm" class="grid" style="margin-top:6px"><h4 style="grid-column:1/-1;margin:0">' + (dmSuaLd ? 'Cập nhật thông tin lao động (thêm dòng mới theo ngày cập nhật)' : 'Thêm lao động') + '</h4>' +
    dmFld('ngayCapNhat', 'Ngày cập nhật (dd/mm/yyyy)', e.ngayCapNhat || todayStr(), {req: true}) + dmFld('cccd', 'Số CCCD (mã công nhân)', e.cccd, {req: true}) + dmFld('ten', 'Họ và tên', e.ten, {req: true}) +
    '<label><span>Giới tính</span>' + dmSelect('gioiTinh', ['Nam', 'Nữ'], e.gioiTinh) + '</label>' + dmFld('ngaySinh', 'Ngày sinh', e.ngaySinh) + dmFld('diaChi', 'Nơi thường trú', e.diaChi) + dmFld('ngayCap', 'Ngày cấp CCCD', e.ngayCap) + dmFld('noiCap', 'Nơi cấp CCCD', e.noiCap) + dmFld('sdt', 'Số điện thoại', e.sdt) + '<label><span>Vai trò khi ký</span>' + dmSelect('vaiTro', ['Chủ xe', 'Tài xế'], e.vaiTro || '', '— không nêu —') + '</label>' +
    '<label><span>Chức vụ</span>' + dmSelect('chucVu', HAKDanhMuc.CHUC_VU, e.chucVu) + '</label><label><span>Vị trí (danh mục vị trí)</span>' + dmSelect('viTri', chucDanhAll(), e.viTri) + '</label>' +
    '<div class="row" style="grid-column:1/-1"><button class="btn" type="submit">' + (dmSuaLd ? 'Lưu dòng cập nhật' : 'Thêm vào danh mục') + '</button>' + (dmSuaLd ? '<button class="btn ghost" type="button" data-dmhuy="ld">Hủy</button>' : '') + '</div></form>';
  const ls = dmLs && dmLs.loai === 'ld' ? HAKDanhMuc.lichSuLaoDong(dmLd(), dmLs.key) : null;
  return '<p class="mut" style="margin:0">Mỗi người một <b>mã công nhân = số CCCD</b>. Cập nhật thông tin là thêm một dòng có <b>ngày cập nhật</b> mới; phần mềm luôn dùng dòng có ngày mới nhất. Lô chụp lại thông tin lúc thêm người vào hợp đồng nên hồ sơ đã in không đổi.</p>' + form +
    '<div class="row" style="margin-top:8px;gap:8px;flex-wrap:wrap"><label class="btn ghost sm" style="cursor:pointer">Nạp file Excel<input type="file" accept=".xlsx,.xls" data-dmfile="ld" style="display:none"></label><span class="mut">Cột: ' + Object.keys(H_DMLD).join(', ') + '. Trang tính LAO_DONG hoặc trang đầu.</span></div>' +
    dmBoxLoc('họ tên, CCCD, thường trú, vị trí') +
    '<div class="wrap"><table class="normTbl" id="dmLdTbl" style="min-width:0;table-layout:auto"><thead><tr><th>Ngày cập nhật</th><th>Mã (CCCD)</th><th>Họ và tên</th><th>Giới tính</th><th>Ngày sinh</th><th>Nơi thường trú</th><th>Ngày cấp</th><th>Nơi cấp</th><th>SĐT</th><th>Chức vụ</th><th>Vị trí</th><th></th></tr></thead><tbody>' +
    (rows.length ? rows.map(r => '<tr><td>' + esc(r.ngayCapNhat) + '</td><td>' + esc(r.cccd) + '</td><td><b>' + esc(r.ten) + '</b></td><td>' + esc(r.gioiTinh) + '</td><td>' + esc(r.ngaySinh) + '</td><td>' + esc(r.diaChi) + '</td><td>' + esc(r.ngayCap) + '</td><td>' + esc(r.noiCap) + '</td><td>' + esc(r.sdt) + '</td><td>' + esc(r.chucVu) + '</td><td>' + esc(r.viTri) + '</td><td style="white-space:nowrap"><button class="btn ghost sm" data-dmsua="ld:' + esc(r.cccd) + '">Cập nhật</button> <button class="btn ghost sm" data-dmls="ld:' + esc(r.cccd) + '">Lịch sử (' + HAKDanhMuc.lichSuLaoDong(dmLd(), r.cccd).length + ')</button></td></tr>').join('') : '<tr><td colspan="12" class="mut">Chưa có lao động trong danh mục.</td></tr>') + '</tbody></table></div>' +
    (ls ? '<div class="card" id="dmLs" style="margin-top:8px"><h4 style="margin:0 0 6px">Lịch sử của ' + esc(dmLs.key) + ' (mới nhất trước)</h4><table class="normTbl" style="min-width:0;table-layout:auto"><thead><tr><th>Ngày cập nhật</th><th>Họ và tên</th><th>Thường trú</th><th>SĐT</th><th>Chức vụ</th><th>Vị trí</th><th></th></tr></thead><tbody>' + ls.map((r, i) => '<tr><td>' + esc(r.ngayCapNhat) + (i === 0 ? ' <span class="pill ok">đang dùng</span>' : '') + '</td><td>' + esc(r.ten) + '</td><td>' + esc(r.diaChi) + '</td><td>' + esc(r.sdt) + '</td><td>' + esc(r.chucVu) + '</td><td>' + esc(r.viTri) + '</td><td>' + (ls.length > 1 ? '<button class="btn danger sm" data-dmxoa="ld:' + esc(r.cccd) + '|' + esc(r.ngayCapNhat) + '">Xóa dòng</button>' : '') + '</td></tr>').join('') + '</tbody></table></div>' : '');
}
/* ----- Xe ----- */
function dmTabXe() {
  const e = dmSuaXe || {}, tay = HAKDanhMuc.xeHieuLuc(dmXe());
  const rows = dmLoc(tay, r => [r.bienSo, r.chuXe, r.taiXe, r.cccdTx, r.gplx].join(' '));
  const form = '<form id="dmXeForm" class="grid" style="margin-top:6px"><h4 style="grid-column:1/-1;margin:0">' + (dmSuaXe ? 'Cập nhật xe (thêm dòng mới theo ngày cập nhật)' : 'Thêm xe') + '</h4>' +
    dmFld('ngayCapNhat', 'Ngày cập nhật (dd/mm/yyyy)', e.ngayCapNhat || todayStr(), {req: true}) + dmFld('bienSo', 'Biển số xe', e.bienSo, {req: true}) + dmFld('chuXe', 'Chủ xe', e.chuXe) + dmFld('taiXe', 'Tên tài xế', e.taiXe) + dmFld('cccdTx', 'CCCD tài xế', e.cccdTx) +
    dmFld('diaChiTx', 'Thường trú', e.diaChiTx) + dmFld('ngayCapTx', 'Ngày cấp', e.ngayCapTx) + dmFld('noiCapTx', 'Nơi cấp', e.noiCapTx) + dmFld('gplx', 'Số giấy phép lái xe', e.gplx) + dmFld('hanGplx', 'Ngày hết hạn giấy phép', e.hanGplx) + dmFld('hanDangKiem', 'Ngày hết hạn đăng kiểm', e.hanDangKiem) + dmFld('hanBaoHiem', 'Ngày hết hạn bảo hiểm', e.hanBaoHiem) +
    '<h4 style="grid-column:1/-1;margin:6px 0 0">Chủ xe (người ký hợp đồng vận chuyển khi chủ xe là người ký)</h4>' + dmFld('loaiXe', 'Loại xe', e.loaiXe) + dmFld('cccd', 'CCCD chủ xe', e.cccd) + dmFld('ngaySinh', 'Ngày sinh chủ xe', e.ngaySinh) + dmFld('ngayCap', 'Ngày cấp CCCD chủ xe', e.ngayCap) + dmFld('noiCap', 'Nơi cấp CCCD chủ xe', e.noiCap) + dmFld('diaChi', 'Thường trú chủ xe', e.diaChi) + dmFld('sdt', 'Điện thoại chủ xe', e.sdt) + dmFld('cavet', 'Ngày cấp cà vẹt', e.cavet) + '<label><span>Người ký hợp đồng vận chuyển</span>' + dmSelect('nguoiKy', ['Chủ xe', 'Tài xế'], e.nguoiKy || '', '— theo lô —') + '</label>' +
    '<div class="row" style="grid-column:1/-1"><button class="btn" type="submit">' + (dmSuaXe ? 'Lưu dòng cập nhật' : 'Thêm vào danh mục') + '</button>' + (dmSuaXe ? '<button class="btn ghost" type="button" data-dmhuy="xe">Hủy</button>' : '') + '</div></form>';
  const ls = dmLs && dmLs.loai === 'xe' ? HAKDanhMuc.lichSuXe(dmXe(), dmLs.key) : null, hh = v => dmHetHan(v) ? '<span class="pill err">' + esc(v) + '</span>' : esc(v);
  return '<p class="mut" style="margin:0">Mỗi xe một <b>biển số</b> (so khớp bỏ dấu chấm, gạch, khoảng trắng). Cập nhật là thêm một dòng có <b>ngày cập nhật</b> mới; luôn dùng dòng mới nhất. Hạn giấy tờ quá hạn hiện màu đỏ.</p>' + form +
    '<div class="row" style="margin-top:8px;gap:8px;flex-wrap:wrap"><label class="btn ghost sm" style="cursor:pointer">Nạp file Excel<input type="file" accept=".xlsx,.xls" data-dmfile="xe" style="display:none"></label><span class="mut">Cột: ' + Object.keys(H_DMXE).join(', ') + '. Trang tính XE hoặc trang đầu.</span></div>' +
    dmBoxLoc('biển số, chủ xe, tài xế, CCCD, giấy phép') +
    '<div class="wrap"><table class="normTbl" id="dmXeTbl" style="min-width:0;table-layout:auto"><thead><tr><th>Ngày cập nhật</th><th>Biển số</th><th>Chủ xe</th><th>Tài xế</th><th>CCCD tài xế</th><th>Thường trú</th><th>Ngày cấp</th><th>Nơi cấp</th><th>Số GPLX</th><th>Hạn GPLX</th><th>Hạn đăng kiểm</th><th>Hạn bảo hiểm</th><th>Loại xe</th><th>CCCD chủ xe</th><th>Người ký HĐ</th><th></th></tr></thead><tbody>' +
    (rows.length ? rows.map(r => '<tr><td>' + esc(r.ngayCapNhat) + '</td><td><b>' + esc(r.bienSo) + '</b></td><td>' + esc(r.chuXe) + '</td><td>' + esc(r.taiXe) + '</td><td>' + esc(r.cccdTx) + '</td><td>' + esc(r.diaChiTx) + '</td><td>' + esc(r.ngayCapTx) + '</td><td>' + esc(r.noiCapTx) + '</td><td>' + esc(r.gplx) + '</td><td>' + hh(r.hanGplx) + '</td><td>' + hh(r.hanDangKiem) + '</td><td>' + hh(r.hanBaoHiem) + '</td><td>' + esc(r.loaiXe || '') + '</td><td>' + esc(r.cccd || '') + '</td><td>' + esc(r.nguoiKy || '') + '</td><td style="white-space:nowrap"><button class="btn ghost sm" data-dmsua="xe:' + esc(r.bienSo) + '">Cập nhật</button> <button class="btn ghost sm" data-dmls="xe:' + esc(r.bienSo) + '">Lịch sử (' + HAKDanhMuc.lichSuXe(dmXe(), r.bienSo).length + ')</button></td></tr>').join('') : '<tr><td colspan="16" class="mut">Chưa có xe trong danh mục.</td></tr>') + '</tbody></table></div>' +
    (ls ? '<div class="card" id="dmLs" style="margin-top:8px"><h4 style="margin:0 0 6px">Lịch sử của xe ' + esc(dmLs.key) + ' (mới nhất trước)</h4><table class="normTbl" style="min-width:0;table-layout:auto"><thead><tr><th>Ngày cập nhật</th><th>Chủ xe</th><th>Tài xế</th><th>Hạn GPLX</th><th>Hạn đăng kiểm</th><th>Hạn bảo hiểm</th><th></th></tr></thead><tbody>' + ls.map((r, i) => '<tr><td>' + esc(r.ngayCapNhat) + (i === 0 ? ' <span class="pill ok">đang dùng</span>' : '') + '</td><td>' + esc(r.chuXe) + '</td><td>' + esc(r.taiXe) + '</td><td>' + esc(r.hanGplx) + '</td><td>' + esc(r.hanDangKiem) + '</td><td>' + esc(r.hanBaoHiem) + '</td><td>' + (ls.length > 1 ? '<button class="btn danger sm" data-dmxoa="xe:' + esc(r.bienSo) + '|' + esc(r.ngayCapNhat) + '">Xóa dòng</button>' : '') + '</td></tr>').join('') + '</tbody></table></div>' : '');
}
/* ----- Chức vụ / vị trí, định mức BHLĐ ----- */
function dmTabChucVu() {
  const g = HAKDinhBien.get(db), rows = viTriRows();
  return '<p class="mut" style="margin:0">Hai danh sách dùng để chọn cho lao động. <b>Chức vụ</b> là vai trò trong hợp đồng. <b>Vị trí</b> là danh mục vị trí của <b>Định mức nhân công</b> (thêm, đổi tên, xóa vị trí ở đó, một nơi duy nhất).</p>' +
    '<h4 style="margin:10px 0 4px">Chức vụ</h4><ul style="margin:0 0 8px">' + HAKDanhMuc.CHUC_VU.map(c => '<li>' + esc(c) + '</li>').join('') + '</ul>' +
    '<h4 style="margin:10px 0 4px">Vị trí (' + rows.length + ')</h4><div class="wrap"><table class="normTbl" id="dmViTriTbl" style="min-width:0;table-layout:auto"><thead><tr><th>Vị trí</th><th>Số người định biên</th><th>Nhiệm vụ</th></tr></thead><tbody>' +
    rows.map(r => '<tr><td><b>' + esc(r.chucDanh) + '</b></td><td style="text-align:center">' + esc(r.soNguoi == null ? '' : r.soNguoi) + '</td><td>' + esc(r.nhiemVu || '') + '</td></tr>').join('') + '</tbody></table></div>' +
    '<div class="row" style="margin-top:8px"><button class="btn" data-act="openNorm">Sửa vị trí ở Định mức nhân công</button></div>' + (g.saved ? '' : '<p class="mut">Đang hiển thị định mức mặc định; bấm Lưu ở Định mức nhân công để dùng riêng.</p>');
}
function dmTabBhld() {
  const vi = chucDanhAll(), vs = HAKDinhMuc.versions(db), cur = vs[vs.length - 1];
  return '<p class="mut" style="margin:0">Định mức bảo hộ lao động theo <b>vị trí</b> của danh mục (không nhập vị trí riêng ở đây). Có hiệu lực từ ngày; bản mới nhất: ' + esc(cur.tuNgay || 'bản gốc') + '.</p>' +
    '<div class="wrap" style="margin-top:6px"><table class="normTbl" id="dmBhldTbl" style="min-width:0;table-layout:auto"><thead><tr><th>Vị trí</th><th>Đã có định mức BHLĐ</th></tr></thead><tbody>' +
    vi.map(cd => { const n = (cur.dm || {})[cd]; const co = n && Object.values(n).some(v => String(v || '').trim()); return '<tr><td><b>' + esc(cd) + '</b></td><td>' + (co ? '<span class="pill ok">có</span>' : '<span class="pill warn">chưa khai</span>') + '</td></tr>'; }).join('') + '</tbody></table></div>' +
    '<div class="row" style="margin-top:8px"><button class="btn" data-act="openNorm">Mở Định mức BHLĐ</button></div>';
}
/* ----- Đối tác ----- */
function dmTabDoiTac() {
  const e = dmSuaDt || {}, ct = dmDt().filter(x => x.loai !== 'doanhnghiep').sort((a, b) => String(a.ten).localeCompare(String(b.ten), 'vi')), dn = dmVC(), tt = HAKDanhMuc.laoDongHieuLuc(dmLd()).filter(r => r.chucVu === 'Tổ trưởng');
  const form = '<form id="dmDtForm" class="grid" style="margin-top:6px"><input type="hidden" name="dtId" value="' + esc(e.id || '') + '"><h4 style="grid-column:1/-1;margin:0">' + (e.id ? 'Sửa người ký vận chuyển' : 'Thêm người ký vận chuyển (cá nhân)') + '</h4>' +
    dmFld('ten', 'Họ và tên', e.ten, {req: true}) + dmFld('cccd', 'Số CCCD', e.cccd, {req: true}) + dmFld('ngaySinh', 'Ngày sinh', e.ngaySinh) + dmFld('diaChi', 'Nơi thường trú', e.diaChi) + dmFld('ngayCap', 'Ngày cấp CCCD', e.ngayCap) + dmFld('noiCap', 'Nơi cấp CCCD', e.noiCap) + dmFld('sdt', 'Số điện thoại', e.sdt) +
    '<div class="row" style="grid-column:1/-1"><button class="btn" type="submit">' + (e.id ? 'Lưu' : 'Thêm vào danh mục') + '</button>' + (e.id ? '<button class="btn ghost" type="button" data-dmhuy="dt">Hủy</button>' : '') + '</div></form>';
  return '<p class="mut" style="margin:0">Đối tác ký hợp đồng: <b>người ký vận chuyển</b> (cá nhân), <b>doanh nghiệp ký vận chuyển</b>, <b>tổ trưởng ký nhân công</b> (lấy từ danh mục lao động có chức vụ Tổ trưởng).</p>' +
    '<h4 style="margin:10px 0 4px">Người ký vận chuyển (' + ct.length + ')</h4>' + form +
    '<div class="wrap"><table class="normTbl" id="dmDtTbl" style="min-width:0;table-layout:auto"><thead><tr><th>Họ và tên</th><th>CCCD</th><th>Thường trú</th><th>Ngày cấp</th><th>Nơi cấp</th><th>SĐT</th><th></th></tr></thead><tbody>' +
    (ct.length ? ct.map(r => '<tr><td><b>' + esc(r.ten) + '</b></td><td>' + esc(r.cccd) + '</td><td>' + esc(r.diaChi) + '</td><td>' + esc(r.ngayCap) + '</td><td>' + esc(r.noiCap) + '</td><td>' + esc(r.sdt) + '</td><td style="white-space:nowrap"><button class="btn ghost sm" data-dmsua="dt:' + esc(r.id) + '">Sửa</button> <button class="btn danger sm" data-dmxoa="dt:' + esc(r.id) + '">Xóa</button></td></tr>').join('') : '<tr><td colspan="7" class="mut">Chưa có người ký vận chuyển trong danh mục.</td></tr>') + '</tbody></table></div>' +
    '<h4 style="margin:14px 0 4px">Doanh nghiệp ký vận chuyển (' + dn.length + ')</h4>' +
    (dn.length ? '<ul style="margin:0 0 6px">' + dn.map(d => '<li>' + esc(d.ten) + (d.mst ? ' · MST ' + esc(d.mst) : '') + (d.daiDien ? ' · đại diện ' + esc(d.daiDien) : '') + ' <button class="btn ghost sm" data-act="suaDv" data-dv="' + esc(d.id) + '">Sửa</button></li>').join('') + '</ul>' : '') + dvForm() +
    '<h4 style="margin:14px 0 4px">Tổ trưởng ký nhân công (' + tt.length + ', từ danh mục lao động)</h4>' +
    (tt.length ? '<ul style="margin:0">' + tt.map(r => '<li>' + esc(r.ten) + ' · CCCD ' + esc(r.cccd) + '</li>').join('') + '</ul>' : '<p class="mut">Chưa có lao động chức vụ Tổ trưởng.</p>');
}
function panelDanhMuc() {
  const body = {chucvu: dmTabChucVu, laodong: dmTabLaoDong, nguoi: dmTabNguoi, xe: dmTabXe, bhld: dmTabBhld, doitac: dmTabDoiTac}[dmTab]();
  return '<h2>Danh mục</h2><div class="tabs" id="dmTabs">' + DM_TABS.map(([k, l]) => '<button class="' + (dmTab === k ? 'on' : '') + '" data-dmtab="' + k + '">' + l + '</button>').join('') + '</div><div class="card" id="dmBody">' + body + '</div>';
}
/* ----- thao tác ----- */
function dmFormObj(form) { const fd = new FormData(form), o = {}; for (const [k, v] of fd.entries()) o[k] = trim(v); return o; }
function dmLuuLd(form) {
  const k = HAKDanhMuc.kiemLaoDong(dmFormObj(form), chucDanhAll());
  if (!k.ok) return formMsg(form, 'Chưa lưu: ' + k.errs.join('; '));
  const r = HAKDanhMuc.themLaoDong(dmLd(), k.row); db.dmLaoDong = r.list; dmSuaLd = null; persist();
  note((r.them ? 'Đã thêm dòng cập nhật ngày ' : 'Đã thay dòng cùng ngày ') + k.row.ngayCapNhat + ' cho ' + k.row.ten + ' (CCCD ' + k.row.cccd + ').');
}
function dmLuuXe(form) {
  const k = HAKDanhMuc.kiemXe(dmFormObj(form));
  if (!k.ok) return formMsg(form, 'Chưa lưu: ' + k.errs.join('; '));
  const r = HAKDanhMuc.themXe(dmXe(), k.row); db.dmXeVC = r.list; dmSuaXe = null; persist();
  note((r.them ? 'Đã thêm dòng cập nhật ngày ' : 'Đã thay dòng cùng ngày ') + k.row.ngayCapNhat + ' cho xe ' + k.row.bienSo + '.');
}
function dmLuuDt(form) {
  const o = dmFormObj(form), cccd = HAKDanhMuc.cccdSo(o.cccd), e = []; o.id = o.dtId;
  if (!o.ten) e.push('thiếu họ tên'); if (cccd.length !== 12) e.push('CCCD phải đủ 12 chữ số');
  ['ngaySinh', 'ngayCap'].forEach(k => { if (o[k] && !parseVN(o[k])) e.push((k === 'ngaySinh' ? 'ngày sinh' : 'ngày cấp CCCD') + ' không có thật'); });
  if (dmDt().some(x => x.id !== o.id && HAKDanhMuc.cccdSo(x.cccd) === cccd)) e.push('CCCD đã có trong danh mục đối tác');
  if (e.length) return formMsg(form, 'Chưa lưu: ' + e.join('; '));
  const list = dmDt().slice(); let id = o.id; if (!id) { let n = list.length + 1; while (list.some(x => x.id === 'dt' + n)) n++; id = 'dt' + n; }
  const row = {id, loai: 'nguoiKyVC', ten: o.ten, cccd, ngaySinh: o.ngaySinh, diaChi: o.diaChi, ngayCap: o.ngayCap, noiCap: o.noiCap, sdt: o.sdt, vaiTro: ['Chủ xe', 'Tài xế'].includes(o.vaiTro) ? o.vaiTro : ''}, i = list.findIndex(x => x.id === id);
  if (i >= 0) list[i] = row; else list.push(row);
  db.dmDoiTac = list; dmSuaDt = null; persist(); note('Đã lưu người ký vận chuyển ' + o.ten + '.');
}
async function dmNap(kind, file) {
  try {
    const ld = kind === 'ld', r = await parseSheet(file, ld ? 'LAO_DONG' : 'XE', ld ? H_DMLD : H_DMXE, ld ? ['Số CCCD', 'Họ và tên'] : ['Biển số xe'], ld ? dmNormLd : dmNormXe);
    let list = ld ? dmLd() : dmXe(), them = 0, thay = 0; const loi = [];
    r.rows.forEach(x => {
      if (!trim(x.ngayCapNhat)) x.ngayCapNhat = todayStr();   // file không có ngày cập nhật: lấy ngày nạp
      const k = ld ? HAKDanhMuc.kiemLaoDong(x, chucDanhAll()) : HAKDanhMuc.kiemXe(x);
      if (!k.ok) { loi.push('Dòng ' + x._row + ': ' + k.errs.join('; ')); return; }
      const t = ld ? HAKDanhMuc.themLaoDong(list, k.row) : HAKDanhMuc.themXe(list, k.row); list = t.list; if (t.them) them++; else thay++;
    });
    if (ld) db.dmLaoDong = list; else db.dmXeVC = list; if (them || thay) persist();
    note('Đã nạp ' + file.name + ' vào danh mục ' + (ld ? 'lao động' : 'xe') + ': thêm ' + them + ' dòng, thay ' + thay + ' dòng cùng ngày' + (loi.length ? ', ' + loi.length + ' dòng lỗi không nạp (' + loi.slice(0, 5).join(' | ') + (loi.length > 5 ? ' …' : '') + ')' : '') + '.', loi.length ? 'warn' : 'ok');
  } catch (e) { note('Không nạp được file: ' + e.message, 'err'); }
}
document.addEventListener('click', e => {
  const t = e.target; if (!t.closest) return;
  const tab = t.closest('[data-dmtab]'); if (tab) { dmTab = tab.dataset.dmtab; dmLs = null; return render(); }
  const sua = t.closest('[data-dmsua]');
  if (sua) { const [loai, key] = sua.dataset.dmsua.split(/:(.*)/s);
    if (loai === 'ld') { const m = HAKDanhMuc.layLaoDong(dmLd(), key); dmSuaLd = m ? Object.assign({}, m.row, {ngayCapNhat: todayStr()}) : null; }
    if (loai === 'xe') { const m = HAKDanhMuc.layXe(dmXe(), key); dmSuaXe = m ? Object.assign({}, m.row, {ngayCapNhat: todayStr()}) : null; }
    if (loai === 'dt') dmSuaDt = dmDt().find(x => x.id === key) || null;
    return render(); }
  const huy = t.closest('[data-dmhuy]'); if (huy) { dmSuaLd = dmSuaXe = dmSuaDt = null; return render(); }
  const ls = t.closest('[data-dmls]'); if (ls) { const [loai, key] = ls.dataset.dmls.split(/:(.*)/s); dmLs = dmLs && dmLs.loai === loai && dmLs.key === key ? null : {loai, key}; return render(); }
  const xoa = t.closest('[data-dmxoa]');
  if (xoa) { const [loai, rest] = xoa.dataset.dmxoa.split(/:(.*)/s);
    if (loai === 'dt') { if (!confirm('Xóa người ký này khỏi danh mục đối tác?')) return; db.dmDoiTac = dmDt().filter(x => x.id !== rest); persist(); return render(); }
    const [key, ngay] = rest.split('|'); if (!confirm('Xóa dòng cập nhật ngày ' + ngay + '? Hồ sơ lô đã chụp thông tin không bị đổi.')) return;
    if (loai === 'ld') db.dmLaoDong = dmLd().filter(r => !(HAKDanhMuc.cccdSo(r.cccd) === HAKDanhMuc.cccdSo(key) && trim(r.ngayCapNhat) === ngay));
    else db.dmXeVC = dmXe().filter(r => !(HAKDanhMuc.bienKey(r.bienSo) === HAKDanhMuc.bienKey(key) && trim(r.ngayCapNhat) === ngay));
    persist(); return render(); }
});
document.addEventListener('submit', e => {
  const id = e.target && e.target.id;
  if (id === 'dmLdForm') { e.preventDefault(); dmLuuLd(e.target); }
  if (id === 'dmXeForm') { e.preventDefault(); dmLuuXe(e.target); }
  if (id === 'dmDtForm') { e.preventDefault(); dmLuuDt(e.target); }
});
document.addEventListener('change', e => {
  const t = e.target; if (!t) return;
  if (t.id === 'dmQ') { dmQ = trim(t.value); return render(); }
  if (t.dataset && t.dataset.dmfile && t.files && t.files[0]) { const f = t.files[0]; t.value = ''; dmNap(t.dataset.dmfile, f).then(() => render()); }
});
window.__doiTac = () => ({co: 'dmDonViVC' in db, dt: (db.dmDoiTac || []).map(x => x.id + ':' + x.ten)});   // chỉ cho kiểm thử đầu-cuối
