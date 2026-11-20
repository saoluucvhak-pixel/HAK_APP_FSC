# Thay đổi chưa phát hành (sau 3.1.0)

Các mục dưới đây đã gộp vào `main` nhưng chưa có trong bản cài. Khi phát hành phiên bản kế tiếp, CEO_FSC chuyển nguyên các mục này thành mục phiên bản mới ở đầu `CHANGELOG.md` rồi xóa tệp này (`tests/phien-ban.test.js` không cho `CHANGELOG.md` có mục “Chưa phát hành” treo).

- Sao lưu toàn bộ dạng .json mang đủ lịch sử bản chụp các lần chốt lô, như bản .sqlite; khôi phục .json sang máy khác giữ được các bản chụp này (phiếu #11).
- Thư mục sao lưu SQLite và thư mục sao lưu JSON cài đặt riêng; “Sao lưu toàn bộ” ghi .sqlite vào thư mục SQLite và .json vào thư mục JSON (phiếu #13a, quyết định 7 của CHỦ). Cài đặt cũ chỉ có một thư mục sao lưu được dùng cho cả hai.
- Tự sao lưu SQLite theo chu kỳ chọn được: Tắt, mỗi 2 giờ, hằng ngày, hằng tuần; mỗi chu kỳ xoay vòng riêng số bản giữ (phiếu #13a).
- “Khôi phục toàn bộ” nhận file .json và file .sqlite ở bất kỳ đâu (USB, máy khác): file .sqlite được kiểm tra rồi chép vào kho sao lưu thành bản “Nhập từ ngoài”, file gốc không bị sửa (phiếu #13a). Phần bố cục màn Sao lưu và khôi phục làm ở phiếu #13b.
