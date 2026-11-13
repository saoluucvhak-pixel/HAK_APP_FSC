/* Bản chính thức hay BẢN NHÁP: mỗi biểu mẫu có điều kiện riêng. Thiếu điều kiện thì vẫn xuất được để soạn trước nhưng gắn nhãn “BẢN NHÁP”
 * trong tài liệu, tên file và tên gói; đủ điều kiện thì xuất bản chính thức. Hàm thuần (không đọc giao diện) để dùng chung cho xuất lẻ, xuất theo gói,
 * màn hình “Xuất hồ sơ” và kiểm thử. Mẫu trống / chỉ phần số (in hai bước) là mẫu thiết kế để điền sau, không thuộc quy tắc này. */
(function (root) {
  /* điều kiện dữ liệu → câu báo thiếu và nơi bổ sung */
  const NEED = {
    ngayKy: {text: 'chưa có ngày ký hợp đồng (số hợp đồng thiếu năm)', where: 'Thông tin chủ rừng → Ngày ký hợp đồng (hoặc tab Xuất hồ sơ → Ngày ký hợp đồng)'},
    diaChiGiao: {text: 'chưa chọn địa chỉ giao hàng đã chốt (điểm đến để chấm)', where: 'tab Vận chuyển → Chọn địa chỉ giao hàng'},
    klThucTe: {text: 'chưa nhập khối lượng khai thác thực tế (đang tính theo sản lượng dự kiến)', where: 'Thông tin rừng → Khối lượng thực tế (tấn)'},
    ntNgay: {text: 'chưa nhập ngày lập biên bản nghiệm thu', where: 'tab Xuất hồ sơ → Nghiệm thu, thanh lý: ngày lập'},
    pcNgay: {text: 'chưa nhập ngày lập biên bản xác nhận khối lượng', where: 'tab Xuất hồ sơ → Xác nhận khối lượng, thanh toán: ngày lập'},
    nguoiMua: {text: 'chưa khai đơn vị nhận (Công ty mua hàng) nên dòng “Kính gửi” để chấm', where: 'Cài đặt → Công ty, hoặc tab Xuất hồ sơ → đơn vị nhận'}
  };
  /* điều kiện chính thức của từng biểu mẫu (mã hai chữ số của BM-xx); mẫu không liệt kê không có điều kiện riêng */
  const FORMS = {
    '01': {label: 'BM-01 Hợp đồng giao khoán', need: ['ngayKy']},
    '04': {label: 'BM-04 Hợp đồng vận chuyển', need: ['ngayKy', 'diaChiGiao']},
    '08': {label: 'BM-08 Bảng thanh toán tiền công', need: ['klThucTe']},
    '09': {label: 'BM-09 Xác nhận khối lượng vận chuyển', need: ['ngayKy', 'diaChiGiao', 'pcNgay']},
    '10': {label: 'BM-10 Thanh toán tiền vận chuyển', need: ['ngayKy', 'diaChiGiao', 'pcNgay']},
    '11': {label: 'BM-11 Cam kết nguồn gốc', need: ['nguoiMua']},
    '14': {label: 'BM-14 Nghiệm thu, thanh lý khai thác', need: ['ngayKy', 'klThucTe', 'ntNgay']},
    '20': {label: 'BM-20 Giấy ủy quyền', need: ['ngayKy']}
  };
  /* ctx: các cờ true khi đủ điều kiện: {ngayKy, diaChiGiao, klThucTe, ntNgay, pcNgay, nguoiMua}. Trả danh sách thiếu [{key, text, where}] */
  function issues(code, ctx) {
    const f = FORMS[code]; if (!f) return [];
    return f.need.filter(k => !ctx[k]).map(k => ({key: k, text: NEED[k].text, where: NEED[k].where}));
  }
  const label = code => (FORMS[code] && FORMS[code].label) || ('BM-' + code);
  /* dòng nhãn đầu tài liệu */
  const banner = list => 'BẢN NHÁP – chưa đủ dữ liệu để in chính thức: ' + list.map(x => x.text).join('; ') + '.';
  /* tên file: BM-xx_… → BM-xx_BAN_NHAP_…; file trong thư mục: thư_mục/BAN_NHAP_tên */
  function draftPath(p) {
    if (/(^|\/|\d\d_)BAN_NHAP_/.test(p)) return p;
    const slash = p.lastIndexOf('/');
    if (slash >= 0) return p.slice(0, slash + 1) + 'BAN_NHAP_' + p.slice(slash + 1);
    const m = /^(\d\d_)(.*)$/.exec(p);
    return m ? m[1] + 'BAN_NHAP_' + m[2] : 'BAN_NHAP_' + p;
  }
  const api = {NEED, FORMS, issues, label, banner, draftPath};
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.HAKBanNhap = api;
})(typeof self !== 'undefined' ? self : this);
