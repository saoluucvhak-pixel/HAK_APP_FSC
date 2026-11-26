# HAKQN Desktop 3.7.2

Bộ cài Windows x64: `HAKQN-HoSoKhaiThac-Setup-3.7.2.exe`. Bản công khai trước là v3.7.1.

- Tự động dọn sạch các dòng chủ rừng trống hoàn toàn (0 lô rừng, chưa nhập thông tin) trong SQLite mà không kích hoạt chặn xóa hàng loạt (`BULK_DELETE`), chấm dứt lỗi kẹt lưu khi trên máy có từ 2 chủ rừng tạo dở trở lên.
- Bổ sung nút “Lưu bản sao lưu ra tệp / USB…” tại màn Sao lưu và khôi phục để chọn trực tiếp thư mục hoặc USB xuất tệp `.sqlite` / `.json` qua hộp thoại Windows.
- Bấm “Sao lưu lô rừng” khi lô còn thay đổi chưa lưu sẽ hỗ trợ lưu dữ liệu vào lô trước rồi xuất ngay bản mới nhất; báo rõ nguyên nhân nếu dữ liệu gói chưa hợp lệ.
- Khôi phục tệp `.sqlite` từ bên ngoài luôn hiện ngay hộp thoại xem trước kể cả khi đang bật bộ lọc trong Kho sao lưu.

Bộ cài chưa ký số. Windows SmartScreen có thể hiện cảnh báo. Tệp `BUILD_INFO.txt` đi kèm ghi commit nguồn và SHA-256 của bộ cài.
