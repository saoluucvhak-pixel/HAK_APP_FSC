# Ghi chú phát hành — HAKQN Desktop 2.2.0

> Số phiên bản 2.2.0 đã được người phụ trách duyệt ngày 16/11/2026. **Chưa phát hành:** chờ nghiệm thu bản sửa số văn bản đội xe; chưa có thẻ và Release `v2.2.0`.
> Bản công khai gần nhất: **v1.4.33**. Bộ cài của bản này: `HAKQN-HoSoKhaiThac-Setup-2.2.0.exe` (artifact của CI, kèm `BUILD_INFO.txt` ghi commit, kích thước và SHA-256).

## Vì sao là 2.2.0
- Mã nguồn đã đi qua 2.0.0 (cấu trúc Lô → Đội khai thác, Đội xe, Phiếu cân) và 2.1.0 (Danh mục dùng chung) nhưng hai bản đó **chưa từng phát hành công khai**.
- Sau 2.1.0 có thêm: vòng đời lô và chốt hồ sơ, khóa chỉ đọc, toàn vẹn hồ sơ đã chốt, đối tác một nguồn, sửa lỗi A1–A4, hiệu năng B5–B7 (SQLite cấu trúc v14). Đây là thay đổi tính năng trên nền 2.x nên tăng số giữa: 2.1.0 → **2.2.0**.
- Cài đè lên v1.4.33 là nâng cấp (2.2.0 > 1.4.33). Dữ liệu chuyển **một chiều**: sau khi mở bằng 2.2.0, không mở lại được bằng 1.4.x; phần mềm tự sao lưu file dữ liệu trước khi chuyển (`truoc-nang-cap-v…`).

## Trước khi cài
1. Trên bản đang dùng: **⋯ Thêm → Sao lưu toàn bộ dữ liệu**, chép file sao lưu ra ngoài máy.
2. Đóng ứng dụng, chạy `HAKQN-HoSoKhaiThac-Setup-2.2.0.exe`, cài vào đúng thư mục cũ. Bộ cài chưa ký số: Windows có thể hiện SmartScreen, chọn *More info → Run anyway*.
3. Mở ứng dụng: đầu trang hiện “· Phiên bản 2.2.0”. Kiểm tra số chủ rừng, số lô, một hồ sơ cũ, số văn bản đã cấp.

## Thay đổi người dùng cần biết (so với v1.4.33)
- **Lô → Đội khai thác, Đội xe, Phiếu cân** (2.0.0): khối lượng chỉ lấy từ phiếu cân; mỗi đội một hợp đồng và bộ hồ sơ riêng; một nút “Lưu dữ liệu vào lô”.
- **Danh mục dùng chung** (2.1.0): lao động theo CCCD, xe theo biển số, chức vụ / vị trí, định mức BHLĐ, đối tác; lô chọn từ danh mục và chụp lại.
- **Chốt hồ sơ và vòng đời lô**: lô đã chốt là chỉ đọc; mở khóa phải nhập lý do, ghi nhật ký; chốt lại là phiên bản kế tiếp. Mỗi lần chốt lưu một bản chụp kèm dấu vân tay.
- **Toàn vẹn hồ sơ đã chốt**: gói hỏng, sai dấu vân tay hoặc dữ liệu khác bản chụp được báo rõ (mã lô, phiên bản chốt, lý do); khôi phục từ gói như vậy dừng ở bước xem trước, không ghi.
- **Sao lưu riêng lô đã chốt nhiều lần**: gói chỉ mang **bản chốt hiện hành**; bản chụp các lần chốt trước ở lại máy đã chốt (có trong Sao lưu toàn bộ dạng SQLite); nhật ký vòng đời (lý do mở khóa, dấu vân tay từng lần) đi theo gói. Phạm vi này được ghi ở thông báo sau khi sao lưu và ở màn xem trước khi khôi phục.
- **In hồ sơ đợt 2 (BM-08, 09, 10, 14)**: in đầy đủ trên giấy trắng, hoặc in nền trước rồi in đè số liệu; bảng kê BM-09 in trên giấy mới; không còn chữ “BẢN NHÁP” ở bản in chính thức.
- **Số văn bản theo đội xe**: mỗi đội xe có số hợp đồng vận chuyển và số biên bản xác nhận khối lượng riêng, lưu theo đội xe, không đổi khi in lại. Lô nhiều đội xe đang dùng số chung: mở Sổ văn bản để cấp số riêng hoặc xác nhận số trên giấy. Hai đội trùng số riêng thì BM-04, 09, 10 của hai đội bị chặn cho tới khi sửa.
- **Lịch sử bản chụp**: khung Vòng đời lô liệt kê các bản chụp của từng lần chốt; bản chụp cũ đi theo Sao lưu toàn bộ (.sqlite).
- **Số văn bản**: số đã cấp không bị cấp lại sau khi xóa đội; phiếu cân trùng giữa các lô được phát hiện dù ngày ghi `1/11` hay `01/11`; định mức theo ngày hiệu lực báo lỗi khi ngày bắt đầu không có thật.
- Chi tiết từng mục: `CHANGELOG.md` (các phần 2.2.0, 2.1.0, 2.0.0).

## Giới hạn đã biết
- Máy nhận gói sao lưu riêng lô không mở lại được nội dung các bản chốt **trước** bản hiện hành (chỉ đối chiếu được dấu vân tay qua nhật ký).
- Đội đã xóa trước bản có lịch sử số văn bản (cấu trúc v9) không có lịch sử: số của đội đó có thể bị cấp lại nếu không còn ở văn bản nào.
- Bộ cài chưa ký số.

## Đã kiểm và chưa kiểm
| Việc | Cách kiểm |
| --- | --- |
| Kiểm thử đơn vị, kiểm thử đầu-cuối (Electron + SQLite thật), quét mã, `npm audit` | Tự động (máy phát triển và CI) |
| Đóng gói, cài bộ `.exe`, mở, ghi, đóng, mở lại; cài đè lên **bộ cài thật v1.4.33**, v1.4.0, v1.0.0, bản dựng 1.4.38 và 2.0.0; phiên bản hiển thị sau khi cài đè | Tự động trên máy Windows của CI, bằng bộ cài thật |
| Bố cục biểu mẫu Word: đọc XML của file `.docx`, đổi PDF bằng LibreOffice, chồng ảnh tờ nền và phần in đè | Tự động (CI Ubuntu) |
| Mở file bằng **Microsoft Word thật**, **in ra giấy** (tờ nền rồi in đè trên máy in thật), cài tay trên máy người dùng | **Chưa kiểm — cần người làm** trước khi phát hành |

## Việc người duyệt cần làm
1. Số phiên bản 2.2.0: đã duyệt.
2. Tải artifact `HAKQN-Setup-<commit>` của lượt CI trên đúng commit dự kiến phát hành; đối chiếu `commit=` và `sha256=` trong `BUILD_INFO.txt` với file `.exe`.
3. In thử BM-08, 09, 10, 14 qua Word trên máy in thật: in tờ nền, cho lại giấy vào khay, in đè; kiểm chữ in đè nằm đúng dòng.
4. Khi đạt: tạo thẻ `v2.2.0` trên đúng commit đó (workflow sẽ dựng lại và tạo Release kèm bộ cài).
