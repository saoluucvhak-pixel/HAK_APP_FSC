'use strict';
/* Tạo file Excel GIẢ LẬP cùng cấu trúc HoSoKeo_QC.xlsx (3 tab) để kiểm thử. Không chứa dữ liệu thật. */
const XLSX = require('xlsx');
const path = require('path');
const D = (y, m, d) => new Date(Date.UTC(y, m - 1, d));
const H_KEO = ['STT', 'Mã khách hàng', 'Mã hợp đồng', 'SỐ PHIẾU CHI', 'SỐ PHIẾU CÂN', 'Ngày nhập', 'SỐ XE', 'Đại Lý', 'Hàng hóa', 'Giờ cân 1', 'Giờ cân 2', 'Biển số 1', 'Cân lần 1', 'Cân lần 2', 'KL hàng (KG)', 'Khối lượng (Tấn)', 'Đơn giá', 'Thanh toán', 'Nguồn gốc', 'Người cân', 'Số thứ tự BKLS', 'Số BKLS', 'Họ và tên chủ rừng', 'ĐỊA CHỈ RỪNG', 'DoKho', 'DoAm', 'TKHQ', 'Tàu xuất', 'Ngày xuất'];
const H_RUNG = ['STT', 'Mã KH_CCCD', 'Họ và tên chủ rừng', 'Mã hợp đồng', 'Mã thanh lý hợp đồng', 'Ngày ký hợp đồng', 'Ngày thanh lý', 'Tình trạng Hợp đồng', 'Địa chỉ thường trú', 'Địa chỉ hiện tại', 'Ngày cấp', 'Nơi cấp', 'SĐT', 'ĐỊA CHỈ RỪNG', 'HECTA', 'Định mức tấn/Ha', 'Pháp lý rừng', 'Tọa độ', 'Định mức quy đổi Tấn/M3', 'Quy cách đường kính', 'Quy cách chiều dài', 'Phương án khai thác', 'Năm trồng'];
const H_TD = ['ID_RUNG', 'ID_GPS', 'Mã rừng', 'Số hợp đồng', 'Ngày ký hợp đồng', 'HoVaTenChuRung', 'SoCCCD', 'ThuongTru', 'DiaChiRungTrong', 'DienTich_m2', 'HoSoNguonGoc', 'SoGiayTo', 'NgayGiayTo', 'Latitude_Vĩ độ', 'Longtitude_Kinh độ', 'Location', 'Địa điểm tra GPS'];
const keo = (i, kh, hd, so, ngay, xe, kg, tan, gia, ten, dia) => [i, kh, hd, null, so, ngay, xe, null, 'Gỗ Tròn Keo Lai Controlled Wood', null, null, xe, kg + 4000, 4000, kg, tan, gia, Math.round(kg * gia / 1000), 'QS', null, i, '000000' + i + '/BKLS', ten, dia, null, null, null, null, null];

function build(variant) {
  const K = [H_KEO,
    keo(1, '049000000001', '101', '1001/2026/NK', D(2026, 1, 22), '92C-12345', 2840, 2.84, 1500000, 'NGUYỄN VĂN AN', 'Thôn Phú Cường, xã Quế Sơn Trung'),
    keo(2, '049000000001', '101', '1002/2026/NK', D(2026, 1, 23), 'XE CN NAM', 4440, 4.44, 1500000, 'NGUYỄN VĂN AN', 'Thôn Phú Cường, xã Quế Sơn Trung'),
    keo(3, '049000000001', '101', '1003/2026/NK', D(2026, 1, 24), '92C-12345', 5000, 4.9, 1500000, 'NGUYỄN VĂN AN', 'Thôn Phú Cường, xã Quế Sơn Trung'),
    keo(4, '049000000001_001', '102', '1004/2026/NK', D(2026, 2, 2), '92H-11122', 3000, 3, 1600000, 'NGUYỄN VĂN AN_001', 'Thôn Lộc Thượng'),
    keo(5, '049000000002', '201', '2001/2026/NK', D(2026, 3, 1), '92C-55555', 6000, 6, 1500000, 'TRẦN THỊ BÌNH', 'Xã Hiệp Đức'),
    keo(6, '049000000003', '101', '3001/2026/NK', D(2026, 3, 5), '92C-77777', 7000, 7, 1500000, 'NGUYỄN VĂN AN', 'Xã Việt An'),
    keo(7, null, '999', '9001/2026/NK', D(2026, 3, 6), '92C-88888', 1000, 1, 1500000, null, null),
    keo(8, 49000000004, 401, 4001, D(2026, 4, 1), '43C-12345', 2000, null, 1500000, 'LÊ VĂN ĐÔNG', 'Xã Đại Lộc')];
  const R = [H_RUNG,
    [1, '049000000001', 'NGUYỄN VĂN AN', '101', null, D(2026, 1, 10), null, 'Đang thực hiện', 'Thôn Phú Cường, xã Quế Sơn Trung, Tp Đà Nẵng', 'Tổ 3, xã Quế Sơn Trung', D(2021, 6, 25), 'Cục cảnh sát QLHC về TTXH', '0905000001', 'Thôn Phú Cường, xã Quế Sơn Trung, Thôn Phú Cường, xã Quế Sơn Trung', 2.5, null, 'Giấy chứng nhận QSDĐ, Giấy chứng nhận QSDĐ', null, null, null, null, null, null],
    [2, '049000000001', 'NGUYỄN VĂN AN_001', '102', null, D(2026, 1, 15), null, 'Đang thực hiện', 'Thôn Phú Cường, xã Quế Sơn Trung, Tp Đà Nẵng', 'Thôn Phú Cường', D(2021, 6, 25), 'Cục cảnh sát QLHC về TTXH', '0', 'Thôn Lộc Thượng', 3, null, 'Đơn xác nhận của UBND Xã/Phường', null, null, null, null, null, null],
    [3, '049000000002', 'TRẦN THỊ BÌNH', '201', null, D(2026, 2, 20), null, 'Đang thực hiện', 'Xã Hiệp Đức', 'Xã Hiệp Đức', D(2022, 1, 1), 'Cục cảnh sát QLHC về TTXH', null, 'Xã Hiệp Đức', 10, null, null, null, null, null, null, null, null],
    [4, '049000000003', 'NGUYỄN VĂN AN', '101', null, D(2026, 3, 1), null, 'Đã thanh lý', 'Xã Việt An', 'Xã Việt An', D(2020, 5, 5), 'Cục cảnh sát QLHC về TTXH', null, 'Xã Việt An', 1.2, null, 'Khác', null, null, null, null, null, null],
    [5, 49000000004, 'LÊ VĂN ĐÔNG', 401, null, D(2026, 3, 20), null, 'Đang thực hiện', 'Xã Đại Lộc', 'Xã Đại Lộc', D(2021, 1, 2), 'Cục cảnh sát QLHC về TTXH', '0912000004', 'Xã Đại Lộc', 1.5, 90, 'Giấy chứng nhận QSDĐ', null, null, null, null, null, null]];
  const T = [H_TD,
    ['HAKQN01', '20260110-001a', '20260110_001', 101, D(2026, 1, 10), 'NGUYỄN VĂN AN', '049000000001', 'Thôn Phú Cường', 'Xã Quế Sơn Trung', 25000, 'Giấy chứng nhận QSDĐ', '030QSDĐ', D(2004, 10, 26), 15.605254, 108.104989, '15.605254, 108.104989', 'Điểm 1'],
    ['HAKQN01', '20260110-001b', '20260110_001', 101, D(2026, 1, 10), 'NGUYỄN VĂN AN', '049000000001', 'Thôn Phú Cường', 'Xã Quế Sơn Trung', 25000, 'Giấy chứng nhận QSDĐ', '030QSDĐ', D(2004, 10, 26), '15.48.56.109N', '108.10.40.827E', '', 'Điểm 2 (độ-phút-giây)'],
    ['HAKQN02', '20260115-001', '20260115_001', 102, D(2026, 1, 15), 'NGUYỄN VĂN AN', '049000000001', 'Thôn Phú Cường', 'Thôn Lộc Thượng', 60000, 'Đơn xác nhận của UBND Xã/Phường', '10.01.2026/GXN', null, 15.73, 108.26, '', ''],
    ['HAKQN03', '20260220-001', '20260220_001', 201, D(2026, 2, 20), 'TRẦN THỊ BÌNH', '049000000002', 'Xã Hiệp Đức', 'Lô 1, xã Hiệp Đức', 50000, 'Giấy chứng nhận QSDĐ', '111QSDĐ', null, 15.5, 108.1, '', ''],
    ['HAKQN04', '20260220-002', '20260220_002', 201, D(2026, 2, 20), 'TRẦN THỊ BÌNH', '049000000002', 'Xã Hiệp Đức', 'Lô 2, xã Hiệp Đức', 50000, 'Giấy chứng nhận QSDĐ', '112QSDĐ', null, 15.51, 108.11, '', ''],
    ['HAKQN05', '20260301-001', '20260301_001', 101, D(2026, 3, 1), 'NGUYỄN VĂN AN', '049000000003', 'Xã Việt An', 'Xã Việt An', 12000, 'Khác', 'KH-01', null, 154712975, 108.2, '', ''],
    ['HAKQN06', '20260320-001', '20260320_001', 401, D(2026, 3, 20), 'LÊ VĂN ĐÔNG', 49000000004, 'Xã Đại Lộc', 'Xã Đại Lộc', 15000, 'Giấy chứng nhận QSDĐ', '555QSDĐ', D(2010, 1, 1), 15.8, 108.0, '', '']];
  if (variant === 'missingCol') T[0] = T[0].map(h => h === 'DienTich_m2' ? 'DienTich' : h);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(K, {cellDates: true}), 'HoSoKeo_QC');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(R, {cellDates: true}), 'HoSoRung_QC');
  if (variant !== 'missingTab') XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(T, {cellDates: true}), 'ToaDoRung_QC');
  return XLSX.write(wb, {type: 'buffer', bookType: 'xlsx', cellDates: false});
}
module.exports = {build};
if (require.main === module) {
  const fs = require('fs');
  fs.writeFileSync(path.join(__dirname, 'gia_lap_HoSoKeo_QC.xlsx'), build());
  fs.writeFileSync(path.join(__dirname, 'gia_lap_thieu_cot.xlsx'), build('missingCol'));
  fs.writeFileSync(path.join(__dirname, 'gia_lap_thieu_tab.xlsx'), build('missingTab'));
  console.log('Đã tạo 3 file giả lập');
}
