# Ghi chú phát hành — HAKQN Desktop 2.3.0 (BẢN NHÁP CHỜ DUYỆT)

> Trạng thái: **chưa phát hành**. Chưa gắn thẻ, chưa tạo Release. Bản công khai gần nhất: **v2.2.0**. Bộ cài của bản này: `HAKQN-HoSoKhaiThac-Setup-2.3.0.exe` (artifact CI, kèm `BUILD_INFO.txt`).

## Có gì mới so với v2.2.0
- **Dán từ Excel:** chép vùng ô (gồm dòng tiêu đề) trong Excel rồi dán thẳng vào phần mềm cho nhân công, xe, phiếu cân.
- **Mục lục gói in:** mỗi gói hồ sơ tải về có tờ `00_Muc_luc.docx`.
- **Phụ lục in lại, ký lại:** bảng theo dõi các biểu mẫu đã in hoặc ký từ lần thứ hai.
- **Gói Chỉ xem:** một trang tóm tắt mở bằng trình duyệt kèm biểu mẫu, để gửi người chỉ cần xem; không sửa được, không nhập lại được.
- **In trong app:** in tóm tắt hồ sơ và báo cáo thẳng ra máy in. Biểu mẫu Word vẫn in bằng Word.
- **Hướng dẫn bắt đầu:** 6 bước trên màn Tổng quan cho người mới dùng.
- **Mở phần mềm và lưu nhanh hơn** khi có nhiều lô và nhiều phiếu cân (số đo ở CHANGELOG).
- **Kho sao lưu** (Cài đặt → Sao lưu và khôi phục): xem mọi bản sao lưu trên máy, kiểm tra từng bản, **khôi phục ngay trong phần mềm** từ bản tự động hằng ngày hoặc bản “Trước khi…”, xóa bản cũ.
- **Tự sao lưu chứa việc làm trong ngày:** bản của hôm nay được làm mới khi đóng phần mềm và mỗi 2 giờ nếu dữ liệu đã đổi.
- **Ctrl+S** lưu lô đang mở.
- **Bỏ menu ⋯ Thêm:** sao lưu / khôi phục, bảng màu, hướng dẫn nằm trong Cài đặt; thanh trên cùng gọn trên một dòng.
- **Nhân công và xe chọn từ Danh mục:** mỗi hợp đồng nhân công là một đội, mỗi hợp đồng vận chuyển có danh sách xe và phiếu cân riêng; nạp Excel người và xe làm ở Danh mục; phiếu cân có nút tra cứu Google Sheets (HoSoKeo).

Không đổi cấu trúc dữ liệu (SQLite v14) và nội dung biểu mẫu. Cài đè lên v2.2.0 không cần chuyển dữ liệu.

## Giới hạn
- In trong app chỉ in trang tóm tắt và báo cáo; biểu mẫu Word (BM-01…BM-20) vẫn mở bằng Word để in.
- Dán từ Excel cần dòng tiêu đề đúng tên cột của file mẫu.
- Khôi phục từ kho sao lưu thay toàn bộ hồ sơ trên máy (không gộp từng lô); muốn gộp thì dùng bản `.json`. Bản tra cứu Google Sheets không nằm trong phần khôi phục.
- Bản “Trước khi khôi phục”, “Trước khi khôi phục lô” chỉ giữ 20 bản gần nhất mỗi loại.
- Tab Nhân công và Vận chuyển không còn nạp Excel theo lô: nạp ở Danh mục rồi chọn vào hợp đồng.
- Phiếu cân thuộc hợp đồng vận chuyển theo biển số xe của phiếu.
- Bộ cài chưa ký số.

## Đã kiểm và chưa kiểm
| Việc | Cách kiểm |
| --- | --- |
| Kiểm thử đơn vị, đầu-cuối, quét mã, build và cài thử, cài đè | Tự động (CI) |
| Lệnh in | Tự động bằng cách ghi PDF; **chưa in ra máy in thật** |
| Kho sao lưu, tự sao lưu khi đóng, Ctrl+S | Tự động (Electron + SQLite thật trên Linux); **chưa kiểm bằng bộ cài trên Windows** và chưa kiểm với ổ ngoài rút ra giữa chừng khi đang làm mới bản tự sao lưu |
| Dán trực tiếp từ Microsoft Excel thật | **Chưa kiểm** (kiểm bằng chuỗi ký tự cùng định dạng Excel đưa vào bộ nhớ tạm) |
