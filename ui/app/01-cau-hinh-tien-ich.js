/* ========== Cấu hình ========== */
const KEY = 'hskt.v2';
const KEY_OLD = 'hskt.v1';
/* DANH MỤC VỊ TRÍ (cấu trúc 2.0, giai đoạn 2): nguồn DUY NHẤT là Định mức nhân công (src/dinhbien.js danhMuc). Chức danh nhân công, định mức BHLĐ,
 * bảng đơn giá và hợp đồng đều lấy vị trí từ đây. Vị trí đang được dùng mà chưa có trong danh mục (dữ liệu cũ) vẫn hiện, với số người 0.
 * Chưa lưu định mức nhân công: gom thêm các nguồn cũ (ba vị trí mặc định, vị trí thêm, khóa định mức BHLĐ) theo đúng thứ tự cũ để hợp đồng cũ in như trước. */
function viTriDangDung() {
  const out = [], add = n => { n = trim(n); if (n && !out.includes(n)) out.push(n); };
  if (!HAKDinhBien.get(db).saved) HAKDinhMuc.allPositions(db).forEach(add);
  Object.values(db.rs || {}).forEach(o => Object.values(o.forests || {}).forEach(f => {
    (f.nc || []).forEach(r => add(r.chucDanh));
    [f.info || {}, ...(f.doi || []).map(d => d.hinhThuc || {})].forEach(i => ['donGiaTan', 'donGiaHa', 'donGiaNgay'].forEach(m => Object.entries(i[m] || {}).forEach(([k, v]) => { if (v > 0) add(k); })));
  }));
  return out;
}
let _cdNho = null;   // gọi rất nhiều lần trong một lượt vẽ (mỗi dòng nhân công): nhớ trong một lượt, xóa ở lượt sự kiện kế tiếp
/* định mức nhân công của MỘT LÔ: phiên bản có hiệu lực tại ngày bắt đầu khai thác của lô (chưa có phiên bản có ngày thì đúng như viTriRows) */
function viTriRowsTai(ref, rowsVer) {
  const rows = viTriRows(); if (!rowsVer && HAKDinhBien.versions(db).length < 2) return rows;
  const ver = rowsVer || HAKDinhBien.get(db, ref).rows, by = new Map(ver.map(v => [v.chucDanh.toLowerCase(), v]));
  rows.forEach(r => { const v = by.get(r.chucDanh.toLowerCase()); r.soNguoi = v ? v.soNguoi : 0; if (v) { r.kiemNhiem = v.kiemNhiem; r.nhiemVu = v.nhiemVu; } });
  return rows;
}
const viTriRows = () => { if (!_cdNho) { _cdNho = HAKDinhBien.danhMuc(db, viTriDangDung()).rows; setTimeout(() => { _cdNho = null; }, 0); } return _cdNho.map(r => Object.assign({}, r)); };
const chucDanhAll = () => viTriRows().map(r => r.chucDanh);
const H_NC = {'Vai trò':'vaiTro','STT':'stt','Danh xưng':'danhXung','Họ và tên':'ten','Ngày sinh':'ngaySinh','CCCD':'cccd','Ngày cấp CCCD':'ngayCap','Nơi cấp CCCD':'noiCap','Địa chỉ thường trú':'diaChi','Chức danh':'chucDanh','Đội':'doi'};
const NC_REQ = ['Vai trò','Họ và tên','CCCD','Chức danh'];
const H_DX = {'STT':'stt','Chủ xe (bên vận chuyển)':'chuXe','Ngày sinh chủ xe':'ngaySinh','CCCD chủ xe':'cccd','Ngày cấp CCCD chủ xe':'ngayCap','Nơi cấp CCCD chủ xe':'noiCap','Thường trú chủ xe':'diaChi',
  'Biển kiểm soát':'bienSo','Ngày cấp đăng ký xe (cà vẹt)':'cavet','Loại xe':'loaiXe','Người ký HĐ vận chuyển':'nguoiKy',
  'Tên tài xế':'taiXe','Ngày sinh tài xế':'ngaySinhTx','CCCD tài xế':'cccdTx','Ngày cấp CCCD tài xế':'ngayCapTx','Nơi cấp CCCD tài xế':'noiCapTx','Thường trú tài xế':'diaChiTx',
  'Số GPLX':'gplx','Ngày đến hạn GPLX':'hanGplx','Ngày đến hạn bảo hiểm':'hanBH','Kiểm định từ ngày':'kdTu','Kiểm định đến ngày':'kdDen','SĐT':'sdt','Đội xe':'doiXe'};
const DX_REQ = ['Chủ xe (bên vận chuyển)','Biển kiểm soát','Người ký HĐ vận chuyển'];
const H_PC = {'STT':'stt','Số phiếu':'soPhieu','Ngày cân 1':'ngay','Giờ cân 1':'gioCan1','Ngày cân 2':'ngay2','Giờ cân 2':'gioCan2','Biển số 1':'bienSo','Cân 1':'can1','Cân 2':'can2','KL':'klKg','Khối lượng (tấn)':'kl','Nguồn gốc':'nguonGoc','Khách hàng':'khachHang','Địa chỉ':'diaChi','ĐG_AD':'donGia','So_CT':'soCT','Đơn giá_TC':'donGiaTC','Trạng thái':'trangThai','Thành tiền':'thanhTien','Nơi giao (nhà máy)':'noiGiao','Ghi chú':'ghiChu','Đội':'doi'};
/* Tên cột cũ của file mẫu phiếu cân (trước khi thống nhất với bộ cột in phiếu cân): vẫn nạp được */
const PC_ALIAS = {'Số phiếu cân':'soPhieu','Ngày cân':'ngay','Biển kiểm soát':'bienSo','Cân lần 1 (kg)':'can1','Cân lần 2 (kg)':'can2','Khối lượng (kg)':'klKg','Đơn giá (đồng/tấn)':'donGia','Thành tiền (đồng)':'thanhTien','Địa chỉ rừng':'diaChi'};
const PC_REQ = ['Số phiếu','Ngày cân 1','Biển số 1'];   // khối lượng: một trong KL (kg), tấn hoặc Cân 1 và Cân 2 (kiểm ở từng dòng)
/* Cột “Mã rừng” KHÔNG còn trong file mẫu và không bắt buộc: dữ liệu luôn nạp vào lô đang mở. File cũ vẫn có thể có cột này (nếu điền thì phải khớp lô, dùng để chặn nạp nhầm file của lô khác; để trống thì tự lấy mã lô đang mở). */
const H_LEGACY = {'Mã rừng': 'maRung'};
const PC_HEAD = Object.keys(H_PC);
const NC_HEAD = Object.keys(H_NC);
const DX_HEAD = Object.keys(H_DX);
// Định mức BHLĐ (tạm thời) theo chức danh, sửa được trong app ở mục "Định mức"
const BHLD_ITEMS = [['qa', 'Quần áo', 'quần áo'], ['giay', 'Giày/ủng', 'giày'], ['mu', 'Mũ', 'mũ'], ['gang', 'Găng tay', 'găng tay'], ['nut', 'Nút chống ồn', 'nút chống ồn'], ['kinh', 'Kính bảo hộ', 'kính bảo hộ']];
function dinhMucMacDinh() {
  const base = {qa: '1 bộ', giay: '1 đôi', mu: '1 cái', gang: '3 đôi', nut: '', kinh: ''};
  return {'Tổ trưởng': {...base}, 'Công nhân khai thác': {...base}, 'Công nhân cưa': {...base, nut: '2 đôi', kinh: '3 cái'}};
}
function withDefaults(o) { if (!o.dinhMuc) o.dinhMuc = dinhMucMacDinh(); if (!o.congTy) o.congTy = {}; return o; }

/* ========== Tiện ích ========== */
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const trim = v => (v == null ? '' : String(v)).replace(/\s+/g, ' ').trim();
/* Chuẩn định dạng số theo HAK_ACCOUNTING_REPORT_STANDARD (formatNumber, formatVND): vi-VN, nghìn dùng dấu chấm, thập phân dùng dấu phẩy */
const _nf = {};
function formatNumber(v, maxD = 2, minD = 0) {
  if (v === null || v === undefined || v === '') return '';
  if (typeof v !== 'number' || !isFinite(v) || Math.abs(v) >= 9007199254740992) return String(v);
  const k = minD + ':' + maxD;
  return (_nf[k] || (_nf[k] = new Intl.NumberFormat('vi-VN', {useGrouping: true, minimumFractionDigits: minD, maximumFractionDigits: maxD}))).format(v);
}
const formatVND = v => formatNumber(v, 0);
/* Kiểu hiển thị số theo Cài đặt → Hiển thị số: 'vi' = 1.234.567,5 (mặc định) | 'en' = 1,234,567.5. Chỉ áp dụng trên màn hình; biểu mẫu Word luôn dùng kiểu Việt Nam (viNum). Ngày luôn là dd/mm/yyyy. */
let numStyle = 'vi';
const numSwap = t => (numStyle === 'en' ? String(t).replace(/[.,]/g, c => (c === '.' ? ',' : '.')) : t);
const viNum = fn => { const o = numStyle; numStyle = 'vi'; try { return fn(); } finally { numStyle = o; } };
const fmtRaw = n => (n == null || n === '' ? '' : typeof n === 'number' && Number.isInteger(n) ? formatVND(n) : String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.'));
const fmt = n => numSwap(fmtRaw(n));
const toNum = v => {
  if (typeof v === 'number') return isFinite(v) ? Math.round(v) : null;
  const s = trim(v).replace(/[.,\s]/g, '');
  if (!s) return null;
  const n = parseInt(s, 10);
  return isNaN(n) ? null : n;
};
const pad2 = n => String(n).padStart(2, '0');
const normDate = v => {
  if (typeof v === 'number') {
    const p = XLSX.SSF.parse_date_code(v);
    if (p) return pad2(p.d) + '/' + pad2(p.m) + '/' + p.y;
  }
  return trim(v);
};
const normCccd = v => (typeof v === 'number' ? String(Math.round(v)).padStart(12, '0') : trim(v).replace(/[\s.\-'’`]/g, ''));
const normNK = v => {
  const t = trim(v).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').toLowerCase();
  if (!t) return '';
  if (/^tai\s*xe/.test(t)) return 'Tài xế';
  if (/^chu\s*xe/.test(t)) return 'Chủ xe';
  return trim(v);
};
const cccdMsg = (who, v) => 'CCCD ' + who + ' phải đủ 12 chữ số (đang là "' + v + '", ' + String(v || '').length + ' ký tự)';
const isCccd = s => /^\d{12}$/.test(s || '');
const isTT = r => /^tổ trưởng/i.test(r.vaiTro || '');
const slug = s => trim(s).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').replace(/[^A-Za-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'x';
const upper = s => trim(s).toUpperCase();
const personName = (danh, ten) => trim((danh ? danh + ' ' : '') + ten);

function download(blob, name) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
}

