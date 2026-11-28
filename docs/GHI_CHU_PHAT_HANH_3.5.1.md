# Ghi chú phát hành — HAKQN Desktop 3.5.1

Bản công khai trước là v3.5.0. Tên bộ cài dự kiến là `HAKQN-HoSoKhaiThac-Setup-3.5.1.exe`.

- Báo cáo chất lượng Google Sheets dùng ánh xạ tên xe đã lưu khi đếm phiếu nghi đổi số. Bản báo cáo chỉ xuất số đếm.
- Báo cáo mặc định từ đầu tháng đến ngày hiện tại. Nhập hoặc xóa khoảng ngày trực tiếp. Cài đặt hiển thị điều khiển định dạng số và ngày của báo cáo. Excel giữ ô số và hiển thị dấu phân cách theo cài đặt Excel.
- Các kênh IPC xác thực frame chính của cửa sổ hồ sơ.
- Workflow chỉ công bố sau khi cả ba job đạt và mã SHA-256 của bộ cài khớp với thông tin bản dựng.

Khi nâng cấp trực tiếp từ v3.5.0, sao lưu cơ sở dữ liệu trước khi cài đè. Phiên bản này giữ schema SQLite của v3.5.0.
