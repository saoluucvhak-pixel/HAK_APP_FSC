# Ghi chú phát hành — HAKQN Desktop 3.6.0

Bản công khai trước là v3.5.1. Tên bộ cài dự kiến là `HAKQN-HoSoKhaiThac-Setup-3.6.0.exe`.

- Màn Danh mục: Thêm/Sửa đối tượng, xe, ngành nghề và chức vụ mở trong hộp thoại riêng (có Lưu thông tin / Hủy bỏ, Esc để hủy); Chức vụ, Ngành nghề, Quyền ký hợp đồng chọn bằng nút phân đoạn (quyền ký loại trừ nhau); bảng Ngành nghề / Chức vụ là danh sách sạch với nút Sửa, Ngừng / Xóa.
- Thông tin chủ rừng: Số hợp đồng, Họ tên, CCCD đứng đầu form kèm nút “Tra cứu Google Sheet”; chọn hợp đồng ở bảng Cha - Con rồi “Chọn hợp đồng này & Điền vào hồ sơ” để điền sẵn form (chưa lưu). Bỏ thẻ Google Sheets bị khóa ở cuối form.
- Vận chuyển: form Thêm xe chia khối Phương tiện / Chủ xe / Tài xế / Người ký (chọn chủ xe, tài xế từ Danh mục đối tượng, giấy tờ tự điền); bỏ các nút “Mở Danh mục …” gây văng màn hình, thêm hướng dẫn thêm xe ở tab “Xe và tài xế”.
- Hợp đồng vận chuyển: ô lọc nhanh và nút “+ Thêm người ký” (hộp nhỏ tại chỗ, tự chọn người vừa thêm); form Thêm xe có thẻ tóm tắt chủ xe / tài xế và nút “+ Thêm chủ xe / tài xế mới”.
- Danh sách chủ rừng (cột trái) dùng bộ lọc thông minh: tình trạng hồ sơ, tình trạng hợp đồng, số lượng rừng.
- Thanh tiêu đề: nút đổi nhanh Sáng / Tối và chọn nhanh bảng màu.
- Bàn làm việc (menu mới): sơ đồ quy trình 6 bước (Đã xong / Đang làm / Chờ xử lý / Bị khóa), các trạm công việc và hàng đợi việc cần xử lý của lô đang chọn với nút “Xử lý ngay”; khối Hướng dẫn bắt đầu được gỡ khỏi Tổng quan.
- Bảng hợp đồng Google Sheets: lọc theo khoảng tổng tấn và khoảng ngày ký (cùng chip trạng thái). Báo cáo Sổ theo dõi phiếu cân: lọc theo Đội xe và Nhà máy tiếp nhận (Word, Excel, in đều theo phần đã lọc). Các bộ chọn xe, chủ xe, tài xế có ô gõ lọc nhanh.
- Thông tin chủ rừng: bốn ô tra cứu (số hợp đồng, CCCD, họ tên, mã chủ rừng; Enter để tra cứu), ô tích “Dùng số CCCD làm Mã chủ rừng”, danh xưng chọn bằng nút và tự gợi ý theo tên (Thị → Bà, Văn → Ông); chọn hợp đồng từ Google Sheets thì tự lưu thông tin và tạo Rừng 1; chủ rừng còn trống không để lại dòng “(chưa đặt tên)”.
- Vận chuyển: nút “Tự động gán & thêm nhanh toàn bộ xe vào đội”; thẻ Đối soát sản lượng (dự kiến so với thực tế từ phiếu cân) ở mục Phiếu cân.
- Xuất hồ sơ: bảng Tiền kiểm soát (mục chặn xuất, mục cần đối chiếu, nút “Đi đến sửa”) và nút “Xuất trọn bộ hồ sơ FSC” dùng gói Toàn bộ hồ sơ có sẵn.
- Phiếu cân: thanh cảnh báo biển số chưa có trong đội xe có nút “Tự động gán & thêm nhanh toàn bộ xe vào đội” (xe có trong Danh mục được gán đủ thông tin, xe chưa có được tạo nhanh trong Danh mục xe); thẻ Đối soát sản lượng cảnh báo khi chênh lệch trên 15%. Thông tin chủ rừng: ô tích “Dùng số CCCD làm Mã chủ rừng” mặc định bật, bấm đúp dòng hợp đồng để điền. Tra cứu Google Sheets hiện huy hiệu “Ngoại tuyến - Dùng bản đệm gần nhất” khi mất mạng hoặc đồng bộ lỗi.
- Xuất hồ sơ: Nhật ký truy xuất nguồn gốc của lô (dòng thời gian từ các nhật ký đã lưu: tạo lô, nạp, đổi số phiếu, đổi biển số, in, ký, chốt lô); tải phụ lục .docx kẹp BM-18 hoặc in. Thêm xe, nhân công, phiếu cân bằng tay, từ Danh mục hoặc từ phiếu cân cũng được ghi vào nhật ký lô khi lưu.
- Thông tin rừng: thẻ Đối soát 3 nguồn diện tích đất rừng (Sổ đỏ, khảo sát / hợp đồng, đo GPS từ ToaDoRung), cảnh báo xung đột khi chênh trên 0,01 ha; hai ô diện tích mới chỉ tạo khóa dữ liệu khi có giá trị; cập nhật từ Google Sheets điền diện tích đo GPS. Form Thêm xe: nút “+ Thêm xe mới vào danh mục”.
- Gói lô rừng di động: hộp lưu lô mặc định đuôi .fscpkg (cùng nội dung niêm phong như .json); hộp mở lô nhận cả .fscpkg và .json. Form Thêm xe: mục “Chỉ định người khác…” chọn người ký của cả đội xe (có ô gõ lọc và thêm nhanh người ký).
- Tổng quan thành bảng điều hành: 4 chỉ số chính (sản lượng đã cân, diện tích quản lý, lực lượng tác nghiệp, tỷ lệ hồ sơ FSC hợp lệ), sản lượng 6 tháng, radar cảnh báo tuân thủ FSC, 5 lô khai thác tích cực nhất (30 ngày), 5 phiếu cân mới nhất và thao tác nhanh.
- Menu dọc các mục lô canh trái thẳng hàng; “Đội / Hợp đồng” đổi thành “Hợp đồng nhân công”.

Giao diện được tổ chức lại; công thức tính, số liệu kế toán và nội dung biểu mẫu BM-01 đến BM-20 không đổi. Hai trường diện tích mới (Sổ đỏ, đo GPS) chỉ xuất hiện trong dữ liệu khi được nhập. Khi nâng cấp trực tiếp từ v3.5.1, sao lưu cơ sở dữ liệu trước khi cài đè. Phiên bản này giữ schema SQLite của v3.5.1.
