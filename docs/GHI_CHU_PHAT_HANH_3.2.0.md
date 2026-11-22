# Ghi chú phát hành — HAKQN Desktop 3.2.0

> Phát hành ngày **22/11/2026** (thẻ `v3.2.0`). Bản công khai trước: **v2.2.0** (và bản nội bộ `v3.1.0`). Bộ cài: `HAKQN-HoSoKhaiThac-Setup-3.2.0.exe`, kèm `BUILD_INFO.txt` ghi commit, kích thước và SHA256.

## Thay đổi chính

- **Bố cục mới V10.4 & HAK Enterprise Design System:** Tái cấu trúc giao diện và quy trình nhập liệu theo chuẩn phân hệ mới, quy hoạch danh mục đối tượng/xe vào phân nhóm quản trị tập trung, đồng bộ thanh công cụ Action Bar và các combobox chọn đối tác, xe.
- **Bộ lọc thông minh HAK_SMART_FILTER:** Tích hợp bộ lọc tìm kiếm đa năng, hỗ trợ lọc nhanh, lọc nhiều điều kiện kết hợp cho danh mục và bảng nhập liệu.
- **Hoàn tất 28/28 E2E Test Suites:** Toàn bộ 28 bộ kịch bản kiểm thử tự động trên Electron + SQLite đạt tỷ lệ vượt qua 100% trên Windows.
- **Sửa các lỗi thực tế:**
  - Bảo lưu mảng nhân công có ID hợp lệ khi chuyển đổi mô hình ký sang trực tiếp.
  - Sửa lỗi tính khối lượng báo cáo đội khi còn phiếu cân chưa gán đội.
  - Hỗ trợ đồng thời cả số phiếu và mã liên kết nội bộ cho biến số và lương phụ cấp.
- **Tối ưu hiển thị compact:** Hiển thị trọn vẹn 3 dòng bảng ở độ phân giải compact 1366×768 với tỷ lệ zoom 150%, độ tương phản giao diện sáng/tối đạt chuẩn AA ≥ 4,5:1.
- **Cải tiến hệ thống Sao lưu và Khôi phục:**
  - Sao lưu toàn bộ dạng `.json` lưu giữ đầy đủ lịch sử bản chụp các lần chốt lô tương đương `.sqlite`.
  - Khôi phục kiểm tra cấu trúc và tính toàn vẹn dữ liệu TRƯỚC khi xem trước hoặc ghi.
  - Tách riêng thư mục sao lưu SQLite và JSON; hỗ trợ tự động sao lưu theo chu kỳ.
- **Bảo toàn bản in:** 206/206 tài liệu biểu mẫu `.docx` được bảo toàn tuyệt đối từng byte so với bản gốc.

## Cách nâng cấp

Cài đè lên bản đang dùng, không cần gỡ bỏ bản cũ. Phần mềm tự động kiểm tra và chuyển tiếp cấu trúc dữ liệu an toàn. Dữ liệu các lô đã chốt được bảo vệ nguyên vẹn 100%.

## Kiểm tra trước khi phát hành

| Tiêu chí | Kết quả nghiệm thu |
| --- | --- |
| **Kiểm thử E2E** | 28 / 28 test suites PASS (100%) trên Windows Electron + SQLite |
| **Kiểm thử đơn vị** | 653 / 653 tests PASS (0 fail, 1 skipped) |
| **Mã băm bản in** | 206 / 206 tài liệu biểu mẫu .docx giống từng byte |
| **Toàn vẹn PR #84** | Bảo lưu 100% các cột thêm mới của PR #84 |

## Bộ cài chưa ký số

Bộ cài **chưa được ký số**: Windows có thể hiện cảnh báo SmartScreen khi cài; chọn “Thông tin thêm” (More info) rồi “Vẫn chạy” (Run anyway).
