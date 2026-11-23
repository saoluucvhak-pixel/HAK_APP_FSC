# Ghi chú phát hành — HAKQN Desktop 3.4.0

> Phát hành ngày **23/11/2026** (thẻ `v3.4.0`). Bản công khai trước: **v2.2.0** (và các bản nội bộ `v3.1.0`, `v3.2.0`, `v3.3.0`). Bộ cài: `HAKQN-HoSoKhaiThac-Setup-3.4.0.exe`, kèm `BUILD_INFO.txt` ghi commit, kích thước.

## Thay đổi chính

- **Tài xế thường chạy theo xe:** chọn tài xế ngay ở Danh mục xe; thêm xe vào lô thì thông tin tài xế (tên, CCCD, giấy phép lái xe) được điền sẵn, không ghi đè dữ liệu đã có; gói danh mục mang theo tài xế khi chuyển máy.
- **Danh mục đối tượng rõ hơn:** thống nhất tên gọi, "Thông tin cá nhân", bộ lọc "Có quyền ký hợp đồng", giải thích thông tin được chụp vào lô. Chỉ đổi chữ, không đổi dữ liệu.
- **Khối lượng phiếu cân:** chuỗi nhiều dấu phẩy (`1,250,000`) không còn bị đọc sai thành 1,25 tấn.
- **ID dòng đã xóa không bị cấp lại** ở phiên sau; dọn tệp tạm sao lưu mồ côi.
- **Giao diện:** màu hàng được chọn ở chế độ sáng/tối, độ tương phản chữ phụ, bảng nhân công và xe gọn hơn, nhãn truy cập cho hộp thoại.
- **Bảo toàn bản in:** 206/206 tài liệu `.docx` giống từng byte so với v3.3.0.

## Cách nâng cấp

Cài đè lên bản đang dùng, không cần gỡ bỏ bản cũ. Không có thay đổi cấu trúc cơ sở dữ liệu (không migration): dữ liệu lô cũ không bị đổi. Dữ liệu các lô đã chốt được bảo vệ nguyên vẹn. Nên sao lưu trước khi cài như mọi lần nâng cấp.

## Kiểm tra trước khi phát hành

| Tiêu chí | Kết quả |
| --- | --- |
| Kiểm thử đơn vị | 812 / 814 đạt (0 lỗi, 2 bỏ qua) |
| Kiểm thử e2e (Electron, 1024×768) | 135 / 135 bộ đạt, 0 kiểm tra lỗi (bộ nâng cấp từ v1.4.33 chạy với mã nguồn v1.4.33) |
| Mã băm bản in | 206 / 206 tài liệu giống từng byte so với v3.3.0 |
| CI Windows (dựng bộ cài, cài mới, cài đè từ các bản cũ) | xem kết quả PR #87 |

## Lưu ý khi dùng

- Tài xế gắn ở Danh mục xe chỉ có hiệu lực khi thêm xe vào lô; không tự cập nhật các lô đã lập (thông tin được chụp lại trong lô).
- Mô hình ký trực tiếp vẫn cần ít nhất một Tổ trưởng như trước; chưa thay đổi trong bản này.
- Hạn chế đã biết của v3.3.0 (Google Sheets) vẫn như ghi chú phát hành 3.3.0.

## Bộ cài chưa ký số

Bộ cài **chưa được ký số**: Windows có thể hiện cảnh báo SmartScreen khi cài; chọn “Thông tin thêm” (More info) rồi “Vẫn chạy” (Run anyway).
