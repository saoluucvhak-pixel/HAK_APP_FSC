# Ghi chú phát hành — HAKQN Desktop 3.3.0

> Phát hành ngày **23/11/2026** (thẻ `v3.3.0`). Bản công khai trước: **v2.2.0** (và các bản nội bộ `v3.1.0`, `v3.2.0`). Bộ cài: `HAKQN-HoSoKhaiThac-Setup-3.3.0.exe`, kèm `BUILD_INFO.txt` ghi commit, kích thước.

## Thay đổi chính

- **Màn "Dữ liệu Google Sheets" theo hợp đồng:** bảng toàn bộ hợp đồng, hộp thoại Cha–Con (rừng, hồ sơ rừng, tọa độ, phiếu cân), tìm không dấu, lọc, phân trang.
- **Phân bổ phiếu cân vào rừng** (hợp đồng nhiều rừng) theo ngày cân và sản lượng dự kiến, có cảnh báo vượt dự kiến.
- **Đổi số phiếu:** phát hiện "nghi đổi số" khi tải Sheet, thao tác Đổi số phiếu riêng có lý do và nhật ký.
- **Mã hợp đồng nhiều CCCD:** cảnh báo nặng, xác nhận hai bước.
- **Màn chủ rừng:** Mở dữ liệu Google Sheets, Đối chiếu với Google Sheets (chỉ cảnh báo, không chặn lưu).
- **Cập nhật vào hồ sơ ghi vào bản nháp**, chỉ lưu khi bấm "Lưu dữ liệu vào lô"; thêm xe vào lô theo ô tích; "Lưu và đóng" lưu mọi lô nháp; khôi phục bản nháp sau khi mở lại.
- **Nhanh hơn:** tra cứu theo mã hợp đồng nhanh gấp khoảng 8 lần ở 2000 hợp đồng.
- **Bảo toàn bản in:** 206/206 tài liệu `.docx` giống từng byte so với v3.2.0.

## Cách nâng cấp

Cài đè lên bản đang dùng, không cần gỡ bỏ bản cũ. Không có thay đổi cấu trúc cơ sở dữ liệu (không migration): dữ liệu lô cũ không bị đổi. Dữ liệu các lô đã chốt được bảo vệ nguyên vẹn. Nên sao lưu trước khi cài như mọi lần nâng cấp.

## Kiểm tra trước khi phát hành

| Tiêu chí | Kết quả |
| --- | --- |
| Kiểm thử đơn vị | 791 / 793 đạt (0 lỗi, 2 bỏ qua) |
| Kiểm thử e2e (Electron, 1024×768) | 132 / 132 bộ đạt, 2567 kiểm tra, 0 lỗi |
| Mã băm bản in | 206 / 206 tài liệu giống từng byte so với v3.2.0 |
| `npm audit --omit=dev` | 0 lỗ hổng |
| CI Windows (dựng bộ cài, cài mới, cài đè từ các bản cũ) | xem kết quả PR trước khi gộp |

## Lưu ý khi dùng

- Hợp đồng chỉ có `HoSoRung` và `HoSoKeo` (không có `ToaDoRung`) cần nhập tay Mã rừng trước khi cập nhật.
- Hồ sơ rừng chỉ lưu một điểm tọa độ; thẻ Tọa độ chọn một điểm làm tâm.
- Xe không có trong danh mục chỉ thêm biển số; cần khai chủ xe và người ký ở tab Vận chuyển trước khi lưu lô.
- Đối chiếu với Google Sheets ở màn chủ rừng chạy khi bấm nút.

## Bộ cài chưa ký số

Bộ cài **chưa được ký số**: Windows có thể hiện cảnh báo SmartScreen khi cài; chọn “Thông tin thêm” (More info) rồi “Vẫn chạy” (Run anyway).
