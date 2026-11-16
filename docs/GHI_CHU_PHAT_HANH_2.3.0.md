# Ghi chú phát hành — HAKQN Desktop 2.3.0 (BẢN NHÁP CHỜ DUYỆT)

> Trạng thái: **chưa phát hành**. Chưa gắn thẻ, chưa tạo Release. Bản công khai gần nhất: **v2.2.0**. Bộ cài của bản này: `HAKQN-HoSoKhaiThac-Setup-2.3.0.exe` (artifact CI, kèm `BUILD_INFO.txt`).

## Có gì mới so với v2.2.0
- **Dán từ Excel:** chép vùng ô (gồm dòng tiêu đề) trong Excel rồi dán thẳng vào phần mềm cho nhân công, xe, phiếu cân.
- **Mục lục gói in:** mỗi gói hồ sơ tải về có tờ `00_Muc_luc.docx`.
- **Phụ lục in lại, ký lại:** bảng theo dõi các biểu mẫu đã in hoặc ký từ lần thứ hai.
- **Gói Chỉ xem:** một trang tóm tắt mở bằng trình duyệt kèm biểu mẫu, để gửi người chỉ cần xem; không sửa được, không nhập lại được.
- **In trong app:** in tóm tắt hồ sơ và báo cáo thẳng ra máy in. Biểu mẫu Word vẫn in bằng Word.
- **Hướng dẫn bắt đầu:** 6 bước trên màn Tổng quan cho người mới dùng.

Không đổi cấu trúc dữ liệu (SQLite v14) và nội dung biểu mẫu. Cài đè lên v2.2.0 không cần chuyển dữ liệu.

## Giới hạn
- In trong app chỉ in trang tóm tắt và báo cáo; biểu mẫu Word (BM-01…BM-20) vẫn mở bằng Word để in.
- Dán từ Excel cần dòng tiêu đề đúng tên cột của file mẫu.
- Bộ cài chưa ký số.

## Đã kiểm và chưa kiểm
| Việc | Cách kiểm |
| --- | --- |
| Kiểm thử đơn vị, đầu-cuối, quét mã, build và cài thử, cài đè | Tự động (CI) |
| Lệnh in | Tự động bằng cách ghi PDF; **chưa in ra máy in thật** |
| Dán trực tiếp từ Microsoft Excel thật | **Chưa kiểm** (kiểm bằng chuỗi ký tự cùng định dạng Excel đưa vào bộ nhớ tạm) |
