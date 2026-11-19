# Ghi chú phát hành — HAKQN Desktop 3.1.0

> Phát hành ngày **19/11/2026** (thẻ `v3.1.0`). Bản công khai trước: **v2.2.0**. Bộ cài: `HAKQN-HoSoKhaiThac-Setup-3.1.0.exe`, kèm `BUILD_INFO.txt` ghi commit, kích thước và SHA256. Bản 3.0.0 chưa từng được phát hành; mọi thay đổi của 3.0.0 nằm trong bản này.

## Thay đổi chính
- **Danh mục là nguồn người và xe.** Danh mục đối tượng (pháp nhân, thể nhân với các vai trò Nhân công, Tài xế, Chủ xe; quyền ký hợp đồng riêng), Danh mục xe và Vị trí đặt trong Cài đặt. Lưu lô không còn ghi vào danh mục lao động hay xe cũ: người hoặc xe mới của lô được hỏi rồi thêm vào danh mục.
- **Hợp đồng theo danh sách.** Tab Nhân công và Vận chuyển mở danh sách hợp đồng; chọn một hợp đồng để vào trang chi tiết. Rời màn còn thay đổi chưa lưu thì phần mềm hỏi Lưu, Bỏ thay đổi hoặc Tiếp tục chỉnh sửa. Màn hợp đồng gọn hơn, khung cảnh báo không chặn gập thành một dòng có nút “Xem”.
- **Phiếu cân thuộc hợp đồng vận chuyển.** Tra cứu HoSoKeo, Nạp Excel, Thêm phiếu cân. Một khóa duy nhất cho phiếu cân (số phiếu bỏ khoảng trắng, viết hoa, cộng ngày cân): “PA 1” và “PA1” cùng ngày là một phiếu và bị chặn; cùng số khác ngày chỉ cảnh báo.
- **Số liệu khối lượng thống nhất.** Tổng phiếu cân tính một cách duy nhất (làm tròn từng phiếu đến kg rồi cộng) ở mọi nơi; khối lượng thực tế của lô lấy tự động từ phiếu cân (khung HoSoKeo không còn ô “Điền tổng”). Phân bổ khối lượng nhân công có xem trước rồi mới lưu.
- **Cảnh báo khi xuất BM-08, BM-14** còn phiếu cân chưa gán đội hoặc đội chưa có phiếu nào: nêu tên đội, vẫn xuất được, số in không đổi.
- **CCCD 9 hoặc 12 chữ số ở mọi nơi** (CMND 9 số và CCCD 12 số đều hợp lệ). CMND 9 số và CCCD 12 số có số 0 đứng đầu không còn bị gộp nhầm thành một người khi nạp nhân công.
- **Chủ rừng chọn từ Danh mục đối tượng:** chọn thì điền sẵn họ tên, danh xưng, CCCD, ngày cấp, nơi cấp, địa chỉ; hồ sơ giữ bản chụp. Nhập tay vẫn được; CCCD nhập tay trùng người trong danh mục thì cảnh báo, không chặn.
- **Giao diện:** đầu lô gọn hai hàng, phím Tab và Esc trong hộp thoại, tương phản màu đạt 4,5:1, nhãn “Nhập Excel”, bảng phiếu cân dùng cả bề rộng ở khung hẹp, tab Xuất hồ sơ gọn (Vòng đời và Sổ văn bản gập mặc định), chữ hướng dẫn cũ “⋯ Thêm” đã sửa thành “Cài đặt → Sao lưu và khôi phục → Sao lưu toàn bộ”.

## Cách nâng cấp
Cài đè lên bản đang dùng, không cần gỡ. Lần mở đầu tiên phần mềm **tự sao lưu** file dữ liệu (tên có `truoc-nang-cap`) rồi chuyển cấu trúc SQLite v14 → v15 một chiều: dựng Danh mục đối tượng, xe và vị trí từ các danh mục cũ (mỗi CCCD một người), gắn ID cho dòng nhân công, xe, phiếu. Chỗ nào không xác định được duy nhất thì không tự nối mà đưa vào Cài đặt → **Cần đối chiếu**, dữ liệu gốc vẫn giữ. Hồ sơ đã chốt giữ nguyên từng byte. Biểu mẫu in ra không đổi so với 2.3.0: so bản in 206/206 tài liệu giống từng byte. Nên sao lưu toàn bộ dữ liệu trước khi cài (Cài đặt → Sao lưu và khôi phục → Sao lưu toàn bộ).

## Kiểm tra trước khi phát hành
Theo quyết định của CHỦ (19/11/2026), bước kiểm tay trên Windows thật được thay bằng kiểm tự động sâu do CEO thực hiện:

| Việc | Kết quả |
| --- | --- |
| Tra cứu HoSoKeo với **Google Sheets thật** | Đạt. Đồng bộ đủ 14.904 dòng HoSoKeo, 507 HoSoRung, 858 ToaDoRung trong khoảng 2 giây. Tìm theo CCCD, tên không dấu, biển số, số phiếu, mã hợp đồng: 100 % truy vấn ra kết quả. Dựng hồ sơ cho cả 507 hợp đồng: 14.849 phiếu, 0 lỗi, 0 phiếu trùng. Chạy giao diện thật (Electron): đồng bộ, tìm, ghép tên xe với biển số, thêm xe, lưu 8/8 phiếu vào lô; nhập lại cùng hợp đồng không tạo phiếu trùng; không có lỗi JavaScript |
| Giao diện ở mức phóng 100 / 125 / 150 % (1366×768) | Đạt. Tổng quan, Cài đặt, Danh mục đối tượng, Danh mục xe không tràn ngang. Màn lô và phiếu cân trong hợp đồng ở 150 % (ảnh `docs/anh-phieu-10/`): đầu lô hai hàng, bảng phiếu cân cuộn ngang trong khung |
| CI Windows trên commit phát hành | Kiểm thử đơn vị, e2e 125 bộ, smoke bộ cài, cài đè từ 1.4.38, 2.0.0 và v2.2.0 (đối chiếu SHA256 bộ cài cũ); bố cục Word qua PDF (LibreOffice) |
| Bản in | 206/206 tài liệu giống từng byte so với trước đợt sửa (khác duy nhất ở mục lục do ghi thời điểm tạo) |

## Bộ cài chưa ký số
Bộ cài **chưa được ký số**: Windows có thể hiện cảnh báo SmartScreen khi cài; chọn “Thông tin thêm” rồi “Vẫn chạy”.

## Rủi ro đã biết
- Khóa gộp nhân công không còn đệm số 0 đứng đầu: lô rất cũ có CCCD lưu thiếu số 0 (10–11 chữ số) có thể không khớp với cùng người nhập lại đủ 12 số. Khả năng thấp vì bước lưu đã chặn 10–11 chữ số.
- Bên nhận khoán là **pháp nhân**: biểu mẫu giao khoán vẫn in theo Tổ trưởng của đội. Bên nhận khoán là người thì người đó nên là Tổ trưởng; phần mềm có nhắc khi chưa phải.
- Nạp Excel nhân công khớp người theo CCCD trong cả lô; muốn đưa người đang ở đội khác vào thêm đội này thì chọn từ danh mục.
- Phiếu của hợp đồng chưa có xe nào không có trong bản xác nhận khối lượng (BM-09/10) cho tới khi hợp đồng có xe.
- Chưa có: khôi phục và chuyển dữ liệu giữa các máy với kiểm mâu thuẫn CCCD (phiếu #12), tổ chức lại sao lưu và khôi phục (phiếu #13); các phiếu này thuộc bản sau.
