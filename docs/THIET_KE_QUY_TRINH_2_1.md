# Thiết kế quy trình 2.1: nhập một lần ở danh mục, lô chỉ tham chiếu theo hợp đồng

Yêu cầu (15/11/2026): quy trình hiện tại rối, dễ chồng lấn số liệu và nhập liệu trùng. Thiết lập lại: **mọi thông tin gốc nhập MỘT LẦN ở danh mục**; lô, hợp đồng chỉ chọn từ danh mục và bổ sung phần riêng của hợp đồng (đơn giá, khoán, ngày công, số văn bản). Quyết định đã xác nhận: danh mục lưu **nhiều dòng theo ngày cập nhật, luôn dùng dòng mới nhất**; làm thành **bản 2.1** sau khi gộp 2.0.0.

## 1. Năm danh mục dùng chung (toàn phần mềm)

| # | Danh mục | Trường | Quy tắc dòng hiệu lực |
| --- | --- | --- | --- |
| 1 | **Chức vụ / vị trí** | Chức vụ: Tổ trưởng, Công nhân. Vị trí: Công nhân cưa, bóc vỏ, bốc xếp… (tên, số người định biên, kiêm nhiệm, nhiệm vụ) | một dòng mỗi tên; vị trí là **Định mức nhân công** hiện có (không nhập lại ở nơi khác) |
| 2 | **Lao động / nhân công** | Ngày cập nhật, **Mã công nhân = số CCCD**, họ tên, số CCCD, nơi thường trú, giới tính, ngày sinh, ngày cấp, nơi cấp, số điện thoại, **chức vụ** và **vị trí** (chọn từ danh mục 1) | nhiều dòng mỗi CCCD; **lấy dòng có ngày cập nhật mới nhất** |
| 3 | **Xe vận chuyển** | Ngày cập nhật, **biển số**, chủ xe, tên tài xế, CCCD tài xế, thường trú, ngày cấp, nơi cấp, số giấy phép lái xe, ngày hết hạn giấy phép, ngày hết hạn đăng kiểm, ngày hết hạn bảo hiểm | nhiều dòng mỗi biển số (so khớp bỏ dấu chấm, gạch, khoảng trắng); **lấy dòng mới nhất** |
| 4 | **Định mức BHLĐ** | theo **vị trí** của danh mục 1 (có hiệu lực từ ngày như hiện nay) | vị trí không nhập riêng ở đây |
| 5 | **Đối tác** | loại: người ký vận chuyển (cá nhân), doanh nghiệp ký vận chuyển (MST, đại diện, chức vụ), tổ trưởng ký nhân công…; tên, CCCD/MST, địa chỉ, điện thoại | một dòng mỗi đối tác; gộp danh mục đơn vị vận chuyển (`dmDonViVC`) hiện có |

Bản chụp: khi thêm người / xe vào hợp đồng của một lô, phần mềm **chụp lại** thông tin dòng mới nhất lúc đó (như hiện nay với xe và nhân công) nên **hồ sơ đã in không đổi** khi danh mục cập nhật sau này; có nút **"Cập nhật từ danh mục"** để làm mới có chủ ý.

## 2. Quy trình nhập liệu

1. Khai danh mục 1 → 5 (hoặc để phần mềm tự dựng từ dữ liệu 2.0 khi nâng cấp, xem mục 4).
2. **Chủ rừng → Lô.**
3. **Nhân công, theo hợp đồng** (một nơi duy nhất, tab Nhân công):
   - chọn hình thức như cũ: **giao khoán** (một hợp đồng khoán = một **đội** = bảng con; Tổ trưởng ký) hoặc **hợp đồng lao động trực tiếp** (chủ rừng ký với từng người, mỗi hợp đồng quản lý riêng);
   - **thêm nhân công từ danh mục lao động** (chọn người đã có; không có thì tạo mới ngay trong danh mục rồi chọn, không nhập hai nơi);
   - bổ sung phần riêng của hợp đồng cho từng vị trí: **đơn giá khoán** (đ/tấn, đ/ha) hoặc **đơn giá ngày công**.
4. **Vận chuyển, theo hợp đồng vận chuyển** (tab Vận chuyển): mỗi hợp đồng có đối tác ký (danh mục 5), cước, số văn bản; **thêm xe và tài xế từ danh mục xe** vào hợp đồng.
5. **Thực hiện khai thác**: phiếu cân nhập như phương án hiện nay (Excel / Google Sheets), gắn đội và hợp đồng vận chuyển qua biển số.
6. Kiểm tra trước khi xuất → xuất hồ sơ → báo cáo.

## 3. Chống chồng lấn, nhập trùng

- Mỗi thông tin gốc (người, xe, đối tác, vị trí) có **một nơi sửa**: danh mục. Sửa ở danh mục = thêm dòng mới có ngày cập nhật; không có ô nhập lại ở lô.
- Khóa cố định: người = CCCD 12 số, xe = biển số chuẩn hóa. Trùng khóa cùng ngày cập nhật thì ghi đè dòng đó; khác ngày thì thêm dòng (giữ lịch sử).
- Lô chỉ giữ: tham chiếu (CCCD / biển số), bản chụp, và phần riêng của hợp đồng (đơn giá, khoán, ngày công, số văn bản, ngày).
- Nhập Excel nhân công / xe nạp vào **danh mục** (có ngày cập nhật), rồi tự thêm vào hợp đồng đang chọn như hiện nay.

## 4. Chuyển dữ liệu từ 2.0.0 (một chiều, có sao lưu file)

- Danh mục lao động: dựng từ nhân công của mọi lô (một dòng mỗi CCCD, ngày cập nhật = ngày bắt đầu khai thác của lô, thiếu thì ngày nâng cấp; lô mới hơn thắng).
- Danh mục xe: dựng từ xe của mọi lô (như danh mục xe tính từ dữ liệu hiện nay).
- Danh mục đối tác: dựng từ `dmDonViVC` và người ký (chủ xe / tài xế) của các hợp đồng vận chuyển.
- Chức vụ: Tổ trưởng, Công nhân; vị trí: danh mục vị trí hiện có.
- Hợp đồng / đội / đội xe của lô giữ nguyên; **bản in không đổi** (so bản in trước/sau bằng `scripts/so-ban-in.js`).

## 5. Các giai đoạn

| GĐ | Nội dung | Kết quả kiểm được |
| --- | --- | --- |
| A | Mô hình danh mục: `src/danhmuc.js` (hàm thuần: dòng hiệu lực mới nhất, thêm dòng theo ngày, tìm theo CCCD / biển số, chức vụ / vị trí); SQLite v7 dựng danh mục từ dữ liệu 2.0 | unit test; chuyển dữ liệu; bản in không đổi |
| B | Màn **Danh mục** (năm tab, thêm / sửa theo ngày, nạp Excel, lịch sử từng dòng) | e2e |
| C | Nhập theo hợp đồng: thêm nhân công và xe từ danh mục; bổ sung khoán / ngày công; "Cập nhật từ danh mục"; bỏ các đường nhập trùng | e2e, bản in không đổi |
| D | BHLĐ theo vị trí danh mục; kiểm tra và báo cáo đọc danh mục; tài liệu, CHANGELOG, bản 2.1.0, CI | e2e toàn bộ, CI |

## 6. Tình trạng (bản 2.1.0)
A, B, C xong (mô hình + SQLite v7, màn Danh mục, chọn / chụp / cập nhật từ danh mục, người và xe mới tự vào danh mục). D: tài liệu, CHANGELOG, version 2.1.0. Chưa làm: màn khai khoán / ngày công theo vị trí cho từng hợp đồng, dựng sẵn đối tác cá nhân khi nâng cấp, bước CI nâng cấp từ bản dựng 2.0.0.

