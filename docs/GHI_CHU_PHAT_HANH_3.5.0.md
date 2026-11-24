# Ghi chú phát hành — HAKQN Desktop 3.5.0

> Phát hành ngày **24/11/2026** (thẻ `v3.5.0`). Bản công khai trước: **v2.2.0** (và các bản nội bộ `v3.1.0`, `v3.2.0`, `v3.3.0`, `v3.4.0`). Bộ cài: `HAKQN-HoSoKhaiThac-Setup-3.5.0.exe`, kèm `BUILD_INFO.txt` (mã commit và mã băm bộ cài).

## Thay đổi chính

- **Ngành nghề và Chức vụ:** hai danh mục mới có thêm / đổi tên / Ngừng sử dụng; người chọn nhiều chức vụ ("Khác" bắt buộc chọn ngành), doanh nghiệp chọn cả hai ngành; các danh sách chọn Bên nhận khoán, nhân công, bên vận chuyển, tài xế lọc theo ngành khi đã khai. Dữ liệu cũ chưa khai giữ nguyên, không bắt nhập lại.
- **Chức vụ / Vị trí thống nhất**, Danh mục Vị trí chi tiết (nhiệm vụ, ghi chú), màn Định mức chia 4 tab.
- **Cài đặt chia tab ngang;** Sao lưu và khôi phục chia ba tab con. Chỉ đổi cách trình bày, không đổi chức năng.
- **Hộp thoại trong ứng dụng** thay hộp xác nhận của trình duyệt khi lô có người / xe mới.
- **An toàn bản nháp:** sao lưu tự động trước lần lưu đầu sau khi áp dữ liệu từ Google Sheets; thanh "Chưa lưu" và hộp khi đóng nêu cụ thể phần chưa lưu; sửa 4 lỗi của cơ chế nháp.
- **Báo cáo chất lượng Google Sheet:** bảng số đếm không chứa thông tin cá nhân, để đối chiếu dữ liệu thật mà không lộ thông tin.
- **Bảo toàn bản in:** 206/206 tài liệu `.docx` giống từng byte so với v3.3.0.

## Cách nâng cấp

Cài đè lên bản đang dùng, không cần gỡ bỏ bản cũ. Không có thay đổi cấu trúc cơ sở dữ liệu (không migration): dữ liệu lô cũ không bị đổi; các trường mới là tùy chọn. Nên **sao lưu toàn bộ** trước khi cài.

## Kiểm tra trước khi phát hành

| Tiêu chí | Kết quả |
| --- | --- |
| Kiểm thử đơn vị | 895 ca: 893 đạt, 0 lỗi, 2 bỏ qua |
| Kiểm thử e2e (Electron, 1024×768) | 143 / 143 bộ đạt, 2734 kiểm tra, 0 lỗi (bộ nâng cấp từ v1.4.33 chạy với mã nguồn v1.4.33) |
| Mã băm bản in | 206 / 206 tài liệu giống từng byte so với v3.3.0 |
| CI Windows (dựng bộ cài, cài mới, cài đè từ các bản cũ) | xem kết quả của PR phát hành 3.5.0 |

## Lưu ý khi dùng

- **Chưa thử trên dữ liệu Google Sheets thật.** Làm theo `docs/KIEM_TAY_BAN_NHAP_DU_LIEU_THAT.md` trên bản sao dữ liệu trước khi dùng cho việc thật; gửi lại bảng số đếm của báo cáo chất lượng nếu thấy khác thường.
- Chưa kiểm tay ở màn hình 150% trên Windows thật và chưa kiểm bằng bàn phím / trình đọc màn hình cho các hộp thoại mới.
- "Nghi đổi số" và "cặp trùng khóa" trong báo cáo chất lượng là định nghĩa gần đúng để thăm dò.
- Tài xế gắn ở Danh mục xe và hạn chế của v3.3.0 (Google Sheets) như ghi chú phát hành 3.4.0 và 3.3.0.

## Bộ cài chưa ký số

Bộ cài **chưa được ký số**: Windows có thể hiện cảnh báo SmartScreen khi cài; chọn “Thông tin thêm” (More info) rồi “Vẫn chạy” (Run anyway).
