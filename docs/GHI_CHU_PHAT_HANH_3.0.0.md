# Ghi chú phát hành — HAKQN Desktop 3.0.0 (BẢN NHÁP CHỜ DUYỆT)

> Trạng thái: **chưa phát hành**. Chưa gắn thẻ, chưa tạo Release. Bản công khai gần nhất: **v2.2.0**. Bộ cài của bản này: `HAKQN-HoSoKhaiThac-Setup-3.0.0.exe` (artifact CI, kèm `BUILD_INFO.txt`).

## Có gì mới so với v2.3.0
- **Màn nhập theo từng mục.** Trong Thông tin rừng hoặc chi tiết hợp đồng, chọn mục ở danh sách bên trái. Xe, thành viên, phiếu cân và số văn bản có màn riêng. Công ty và cước chung nằm trong Thông tin rừng.
- **In phiếu cân trong cửa sổ chính.** Mở từ Xuất hồ sơ hoặc mục Phiếu cân của hợp đồng, lọc phạm vi và chọn phiếu đã lưu để in.
- **Cài đặt nằm trên thanh chính.** Hướng dẫn, Giao diện, Sao lưu và khôi phục chuyển vào Cài đặt; không còn menu “⋯ Thêm”.
- **Danh mục đối tượng** (Cài đặt): pháp nhân (công ty, ký qua người đại diện) hoặc thể nhân (bảng Đối tác gồm các người). Một người có thể vừa là Nhân công, Tài xế, Chủ xe. Quyền ký hợp đồng (Vận chuyển / Nhân công / cả hai) khai riêng. Lọc theo vai trò, tìm kiếm, ngừng sử dụng, nhập Excel có xem trước.
- **Danh mục xe** (Cài đặt): BKS, hạn kiểm định, hạn bảo hiểm, loại xe, chủ xe. Nhập Excel: chọn file → xem trước → sửa hoặc bỏ dòng → lưu. BKS đã có mà khác chủ xe thì hiện cả hai.
- **Vị trí** (Cài đặt): đổi tên một lần, mọi bảng đang dùng cập nhật theo. Hồ sơ đã chốt giữ tên cũ và vẫn in lại đúng.
- **Hợp đồng theo danh sách:** tab Nhân công và Vận chuyển của mỗi rừng mở danh sách hợp đồng. Chọn một hợp đồng để vào trang chi tiết có tên rừng, số hợp đồng và nút “Quay lại danh sách”. Lưu xong vẫn ở đúng hợp đồng. Rời màn khi còn thay đổi chưa lưu thì phần mềm hỏi: Lưu, Bỏ thay đổi hoặc Tiếp tục chỉnh sửa.
- **Người ký và thành viên chọn từ danh mục.** Người ký hợp đồng vận chuyển là đối tượng có quyền ký Vận chuyển. Bên nhận khoán là đối tượng có quyền ký Nhân công. Thành viên đội là người có vai trò Nhân công. Một người được ở hai đội. Thiếu ai thì mở danh mục từ hợp đồng, thêm vào, rồi “Quay lại” đúng chỗ đang làm.
- **Phiếu cân thuộc hợp đồng vận chuyển:** trong hợp đồng có các nút “Tra cứu HoSoKeo”, “Nạp Excel” và “Thêm phiếu cân”. Phần mềm chỉ tự chọn xe khi BKS khớp đúng một xe; trường hợp khác thì báo lý do và cho biết xe đang ở đâu. Đổi xe vẫn giữ BKS gốc của phiếu. Có thể chuyển phiếu sang hợp đồng khác.
- **Phân bổ khối lượng nhân công:** đội duy nhất nhận toàn bộ khối lượng. Lô hai đội chọn “Chọn phiếu theo đội” hoặc “Chia đều”. Lô từ ba đội trở lên thì chia theo phiếu. Phần mềm cho xem trước rồi mới “Lưu phân bổ”, và cùng một kết quả dùng cho tổng hợp, biểu mẫu và tiền khoán.
- **Sao lưu lô mang theo danh mục lô dùng.** Khi khôi phục trên máy có danh mục khác, phần mềm tự nối theo CCCD, MST, BKS và tên vị trí.

**Chuyển dữ liệu (SQLite v14 → v15):** lần mở đầu tiên phần mềm tự sao lưu file. Sau đó nó dựng Danh mục đối tượng, xe và vị trí từ các danh mục cũ, mỗi CCCD thành một người. Dòng nhân công, xe và phiếu được gắn ID; chấm công chuyển sang theo ID dòng. Những chỗ không xác định được duy nhất thì không tự nối mà đưa vào Cài đặt → **Cần đối chiếu**, dữ liệu gốc vẫn giữ. Hồ sơ đã chốt giữ nguyên từng byte. Biểu mẫu in ra giống bản 2.3.0: 206/206 tài liệu thử giống từng byte.

## Giới hạn
- Bên nhận khoán là **pháp nhân**: biểu mẫu giao khoán vẫn in theo Tổ trưởng của đội. Bên nhận khoán là người thì người đó nên là Tổ trưởng; phần mềm có nhắc khi chưa phải.
- Nạp Excel nhân công khớp người theo CCCD trong cả lô. Muốn đưa một người đang ở đội khác vào thêm đội này thì chọn từ danh mục (ô chọn người), đừng nạp Excel.
- Phiếu của hợp đồng chưa có xe nào không có trong bản xác nhận khối lượng (BM-09/10) cho tới khi hợp đồng có xe.
- Bộ cài chưa ký số.

## Đã kiểm và chưa kiểm
| Việc | Cách kiểm |
| --- | --- |
| Kiểm thử đơn vị, đầu-cuối (Electron + SQLite thật), so bản in với 2.3.0 | Tự động trên Linux |
| Nâng cấp từ dữ liệu v2.3.0 (v14), so trước / sau, mở lại lần hai | Tự động (`e2e-nangcap30`) |
| Ảnh màn hình ở 1024 px, phóng 100 / 125 / 150 % | Tự động (`scripts/anh-man-hinh.js`): không tràn ngang |
| Bộ cài Windows, cài đè lên 2.3.0 | CI Windows; **chưa kiểm bằng tay trên máy Windows thật** |
| Tra cứu HoSoKeo với Google Sheets thật | **Chưa kiểm** (kiểm bằng dữ liệu giả lập) |
