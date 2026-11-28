# Ghi chú phát hành — HAKQN Desktop 3.7.0

Bản công khai trước là v3.6.0. Tên bộ cài dự kiến là `HAKQN-HoSoKhaiThac-Setup-3.7.0.exe`.

## Nội dung nâng cấp và hoàn thiện phiên bản 3.7.0

1. **Khóa ô Mã chủ rừng khi dùng CCCD**:
   - Ô nhập mã chủ rừng tự động gắn thuộc tính `readonly` ngay khi tích chọn "Dùng số CCCD làm Mã chủ rừng", loại bỏ khả năng nhập đè hoặc sai lệch mã định danh chủ rừng.

2. **Bàn làm việc bước 5 chuyển thẳng tab Phiếu cân**:
   - Khi bấm chuyển bước hoặc xử lý bước 5 trên sơ đồ quy trình Bàn làm việc, giao diện mở thẳng vào tab con Phiếu cân để người dùng cập nhật ngay dữ liệu cân.

3. **Kiểm soát chéo lô nâng cao phục vụ kiểm toán FSC**:
   - Bổ sung quy tắc phát hiện xe có phiếu cân xuất hiện cùng ngày ở hai lô khai thác khác nhau khi thiếu thông tin giờ cân (`Chéo lô: xe cùng ngày ở hai lô`).
   - Duy trì đầy đủ các quy tắc kiểm soát hiện hữu: xe trùng giờ cân và người làm việc đồng thời ở hai lô khác nhau.

4. **Nút Niêm phong / Mở khóa hồ sơ ngay tại Tiền kiểm soát**:
   - Tích hợp nút thao tác trực tiếp "Niêm phong chốt lô" và "Mở khóa niêm phong" vào thẻ Tiền kiểm soát xuất hồ sơ, tự động ẩn khi lô đang tạm dừng.

5. **In bìa hồ sơ & mục lục 20 biểu mẫu FSC khổ A4**:
   - Bổ sung chức năng in trang bìa hồ sơ khai thác FSC và mục lục trọn bộ 20 biểu mẫu (BM-01 đến BM-20) theo chuẩn A4, hiển thị nơi lập theo thông tin đơn vị và ngày lập hồ sơ.

6. **Sơ đồ minh họa vị trí lô rừng (Mini GIS) & liên kết vệ tinh**:
   - Hiển thị trực quan sơ đồ tọa độ lô rừng bằng vector SVG với tâm tọa độ GPS, la bàn hướng Bắc và thước tỷ lệ.
   - Bổ sung nút chép liên kết Google Maps vệ tinh vào clipboard an toàn trong môi trường Electron.

7. **Thêm nhanh Bên nhận khoán tại chỗ & Typeahead**:
   - Xóa bỏ nút văng màn hình "Mở Danh mục đối tượng", bổ sung nút "+ Thêm bên nhận khoán mới" mở Quick Modal tại chỗ (nhập Họ tên, CCCD, SĐT, Địa chỉ, tự động cấp quyền ký Nhân công và chọn ngay vào hợp đồng) cùng ô gõ tìm kiếm nhanh.

8. **Bộ lọc Dropdown cho modal Chọn từ Danh mục**:
   - Bổ sung bộ lọc Dropdown theo Loại xe, Tình trạng tài xế (chọn xe) và Vị trí chức vụ, Tình trạng CCCD, Giới tính (chọn nhân công), lọc kết hợp tức thì và đồng bộ nút chọn tất cả theo kết quả lọc.

9. **Bảng màu Ocean (Executive Blue)**:
   - Bổ sung bảng màu Ocean xanh dương hiện đại đạt chuẩn tương phản WCAG AA (≥ 4.5:1) cho cả chế độ Sáng và Tối, chọn nhanh tại thanh tiêu đề trên cùng hoặc Cài đặt.

10. **Bảo toàn dữ liệu & nghiệp vụ**:
   - Giữ nguyên toàn bộ công thức kế toán, nội dung 20 biểu mẫu BM-01 đến BM-20, và giữ nguyên cấu trúc schema SQLite v3.5.1.
