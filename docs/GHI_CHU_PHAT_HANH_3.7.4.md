# HAKQN Desktop 3.7.4

Bộ cài Windows x64 `HAKQN-HoSoKhaiThac-Setup-3.7.4.exe` dùng để nâng cấp các bản v3.7.1, v3.7.2 và v3.7.3.

- Lỗi thư mục sao lưu của một lô nhận dữ liệu Google Sheets giữ bản nháp ở lô đó. Người dùng có thể đổi thư mục SQLite, thử lưu lại hoặc giữ bản nháp để chuyển sang lô khác.
- Sao lưu toàn bộ kiểm tra và ghi JSON, SQLite riêng. Thông báo chỉ rõ tệp dùng được và thư mục cần xử lý, kể cả thư mục dự phòng thứ hai.
- Khôi phục riêng dùng ID lô đích trên máy. Các bản nháp ngoài phạm vi khôi phục được giữ lại. Lịch sử chốt chỉ được nhập cho các lô đã khôi phục.
- Sao lưu trước khi xóa hồ sơ vẫn được dùng để bảo vệ dữ liệu. Nếu bản dự phòng gặp lỗi, người dùng có thể sửa thư mục và thực hiện lại thao tác xóa.

Tệp `BUILD_INFO.txt` đi kèm ghi commit nguồn và SHA-256 của bộ cài. Bộ cài chưa ký số nên Windows SmartScreen có thể hiện cảnh báo.
