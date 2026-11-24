# Kiểm tay bản nháp với dữ liệu Google Sheets thật

Tài liệu cho **chủ ứng dụng** tự làm, trên **bản sao** dữ liệu. Người hỗ trợ kỹ thuật (agent) không xem được dữ liệu thật và không cần xin: chỉ cần các **con số đếm** ở bước 2 và ảnh chụp màn hình các bước lỗi.

> Quy tắc an toàn: **không dùng thư mục dữ liệu đang chạy.** Mọi bước dưới đây làm trên thư mục dữ liệu riêng.

## 1. Tạo bản sao để thử
1. Mở ứng dụng thật → **Cài đặt → Sao lưu và khôi phục → Thao tác → Sao lưu toàn bộ**. Ghi nhớ nơi lưu file `.sqlite`.
2. Đóng ứng dụng. Mở lại, vào **Cài đặt → Dữ liệu**, **đổi thư mục dữ liệu** sang một thư mục trống mới (ví dụ `D:\HAK_THU`).
3. **Cài đặt → Sao lưu và khôi phục → Khôi phục toàn bộ**, chọn file `.sqlite` ở bước 1.
4. Kiểm tra tiêu đề đang trỏ vào thư mục thử. Từ đây mọi thao tác chỉ ảnh hưởng bản sao. Xong việc, đổi thư mục dữ liệu về chỗ cũ.

## 2. Đọc Google Sheet thật và lấy số đếm
1. Mở **Dữ liệu Google Sheets**, đồng bộ (chỉ đọc).
2. Vào **Cài đặt → Google Sheets → Báo cáo chất lượng dữ liệu Google Sheets → Tạo báo cáo chất lượng**.
3. Bấm **Sao chép bảng** (hoặc chụp màn hình) và gửi lại. Bảng chỉ có số đếm: số hợp đồng theo trạng thái Đủ / Cần xem / Lỗi, hợp đồng nhiều CCCD, số rừng, rừng thiếu mã, rừng ghép tạm, số phiếu, phiếu ngày không đọc được, phiếu thiếu biển số, phiếu nghi đổi số, cặp trùng khóa, số dòng mỗi tab, thời gian tổng hợp. **Không có** CCCD, họ tên, địa chỉ, số hợp đồng, số phiếu, biển số, mã rừng.
   - **"Số phiếu nghi đổi số"** dùng đúng quy tắc của màn cập nhật vào hồ sơ: phiếu trên Sheet không khớp số phiếu và ngày nào nhưng trùng ngày, biển số và khối lượng (lệch tối đa 1 kg) với một phiếu **đã có trong lô** của ứng dụng. Vì vậy trên bản sao chưa có lô nào của các rừng này thì số này là 0; muốn thấy số có ý nghĩa, hãy chạy báo cáo trên bản sao đã có sẵn các lô của dữ liệu thật.

## 3. Các ca bắt buộc (làm trên bản sao)
Với mỗi ca: mở hợp đồng, bấm **Cập nhật vào hồ sơ**, **kiểm bản nháp** (thanh “Chưa lưu” nêu số lô, chủ rừng mới, ánh xạ biển số), rồi bấm **Lưu dữ liệu vào lô** ở từng lô.
1. Hợp đồng **một rừng**.
2. Hợp đồng **nhiều rừng**.
3. Mã hợp đồng **nhiều CCCD** (hộp xác nhận hai bước).
4. Phiếu **nghi đổi số**.
5. Hợp đồng **thiếu mã rừng** (gõ tay mã rừng).
6. **Xe chưa có trong danh sách** (ô “Thêm xe vào lô”).
7. **Chủ rừng đã có** và **chủ rừng mới**.

Mong đợi: lần lưu đầu sau khi áp dữ liệu từ Sheets tự tạo bản sao lưu “Trước khi lưu dữ liệu từ Google Sheets” (xem ở **Cài đặt → Sao lưu và khôi phục → Các bản sao lưu**). Nếu lưu lỗi vì không sao lưu được thì dữ liệu **không** bị ghi và bản nháp còn nguyên.

## 4. Ca đóng giữa chừng (quan trọng nhất)
Áp một hợp đồng (để có bản nháp), rồi:
- **(a) Lưu và đóng**: mở lại, mọi lô đã lưu đủ, không có chủ rừng hoặc lô trùng.
- **(b) Bỏ thay đổi và đóng**: mở lại, lô mới và chủ rừng mới biến mất, dữ liệu đã lưu trước đó **nguyên vẹn**.
- **(c) Tắt tiến trình đột ngột** (Quản lý tác vụ → Kết thúc tác vụ): mở lại, bản nháp được khôi phục **đúng**, không có chủ rừng hoặc lô trùng, dữ liệu đã lưu trước đó nguyên.
- Khi hộp “Còn thay đổi chưa lưu” hiện ra, kiểm tra hộp **liệt kê cụ thể** tên lô, lô mới, số phiếu mới, chủ rừng mới và ba nút Lưu và đóng / Bỏ thay đổi và đóng / Quay lại chỉnh sửa.

## 5. Quy mô
- Hợp đồng nhiều trăm phiếu thao tác được (cuộn, lọc, áp vào hồ sơ không treo).
- Bảng toàn bộ hợp đồng mở trong khoảng 2 giây.
- Màn hình **150%** (Windows → Cài đặt → Hiển thị): các hộp thoại, thanh trạng thái, bảng không bị cắt.

## 6. Cách báo lỗi
Gửi: (1) ảnh chụp màn hình, (2) các bước đã làm, (3) bảng số đếm ở mục 2. **Không gửi** CCCD, họ tên, địa chỉ hay số hợp đồng thật.
