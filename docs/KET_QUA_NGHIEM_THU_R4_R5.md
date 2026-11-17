# Kết quả nghiệm thu R3, R4, R5 (bản 3.0)

Ngày: 17/11/2026. Nhánh `ccr-6204015e-uszyv8`, dựng trên main sau khi gộp PR #27.

## 1. Tóm tắt

| Mục | Kết quả |
| --- | --- |
| R3 Đối chiếu khối lượng trước khi in BM-09/10 | Đạt sau khi bổ sung. Main chỉ có thẻ đối chiếu; thiếu phần chặn in và sửa in nền (xem mục 3). |
| R4 Một luồng nhập danh mục, chọn nhân công theo ID | Đạt. Luồng nhập đã đúng; bổ sung bộ kiểm thử còn thiếu (một người ở hai đội). |
| R5 Kiểm thử, CI Windows, cài đè v2.3.0, giao diện 150% | Đạt phần chạy được ở đây. Còn một ca chưa xác minh (mục 5). |

## 2. Bộ kiểm thử đã chạy

| Bộ | Môi trường | Kết quả |
| --- | --- | --- |
| Kiểm thử đơn vị (`scripts/test.js`) | Linux, commit của PR này | 518 kiểm thử: 517 đạt, 1 bỏ qua, 0 lỗi |
| e2e Electron thật (`scripts/e2e-all.js`) | Linux, commit của PR này | **116/116 bộ đạt**, 2.265 kiểm tra đạt, 0 lỗi, 1 phần bỏ qua vì thiếu công cụ |
| Giao diện ở 100%, 125%, 150% (`scripts/anh-man-hinh.js`) | Linux, Electron, cửa sổ 1024 × 700 | 15 màn × 3 mức = 45 ảnh, không ảnh nào tràn ngang |
| CI Windows, PR #27 (commit gần nhất đã chạy) | GitHub Actions | build đạt; 114/114 bộ e2e, 2.164 kiểm tra đạt, 6 phần bỏ qua |
| CI Windows, PR này | GitHub Actions | xem trạng thái kiểm tra trên PR; kết quả build và thử bộ cài được báo riêng ở mục 4 |

## 3. Kết quả từng ca

### R3 — đối chiếu khối lượng BM-09/10 (`scripts/e2e-doichieu30.js`, 13 kiểm tra)
- Rừng 100 tấn, trong đó 10 tấn (phiếu P10, BKS nguồn 43A-99999) thuộc phạm vi mẫu nhưng chưa có xe hợp lệ.
- Màn xem trước: tổng 10 phiếu · 100 tấn; đủ điều kiện 9 phiếu · 90 tấn; cần xử lý 1 phiếu · 10 tấn, có số phiếu, BKS nguồn, khối lượng, lý do và nút "Mở phiếu".
- Khi còn phiếu cần xử lý: nút xuất bản đủ BM-09 bị khóa; in đè phần số liệu chính thức bị chặn kèm hướng xử lý (tab Xuất hồ sơ → Đối chiếu khối lượng BM-09/10 → Mở phiếu).
- Mẫu nền BM-09 đợt 2 vẫn tải được và **không có chữ "Bản nháp"**.
- Sau khi gán xe 92C-12345 cho P10 và lưu: BKS nguồn giữ 43A-99999; đối chiếu đủ 10 phiếu · 100 tấn; BM-09 bản chính thức ghi 60 + 40 = 100 tấn; in đè tải được.
- Phiếu ngày cân sai (PX, 5 tấn) tách riêng là ngoài phạm vi mẫu, không làm đổi mẫu 100 tấn.

Thay đổi trong PR này cho R3 (main trước đó thiếu):
- `src/bannhap.js`: BM-09 và BM-10 bản đủ cần điều kiện `pcDoiChieu`.
- `ui/app/08-in-ho-so-dot-2.js`: in đủ và in đè BM-09/10 bị chặn khi còn phiếu thuộc phạm vi mẫu chưa vào biên bản.
- `ui/app/08-in-ho-so-dot-2.js`: **sửa lỗi in nền** — nhóm chặn về phiếu cân làm mẫu nền BM-09/10 không tải được dù bảng "Còn thiếu để in" báo in nền được. Nay in nền không bị nhóm này chặn.

### R4 — một luồng nhập danh mục (đã có trên main) và một người ở hai đội
- Nhập Excel nhân công và xe chỉ ở Cài đặt → Danh mục đối tượng, Danh mục xe. Trong hợp đồng chỉ còn nút dẫn sang đó; phiếu cân vẫn nhập tại hợp đồng vận chuyển. Đường nạp cũ chỉ còn khi đặt biến môi trường kiểm thử và bị xóa trong bản cài.
- Nhập lại Excel đối chiếu theo CCCD (mã, MST hoặc CCCD), người dùng xem trước và xác nhận trước khi lưu; CCCD đã có mà họ tên khác thì không tự ghi đè.
- Bộ mới `scripts/e2e-mot-nguoi-hai-doi30.js` (34 kiểm tra), bảng tính tay trong đầu file:
  - Một người (CCCD 049085007003) có hai dòng thành viên ở hai đội, ID dòng khác nhau, vị trí khác nhau (Công nhân khai thác ở Đội 1, Công nhân cưa ở Đội 2), chấm công lưu theo ID dòng.
  - Đội 1: 2 người, 22 công, 8.133.330 đồng. Đội 2: 2 người, 19,5 công, 7.375.000 đồng. Tổng hai đội 15.508.330 đồng.
  - BM-05 (số công từng người), BM-08 (đơn giá, công, thành tiền, tổng đội) và BM-14 (khoản tiền công) khớp từng đội, không lẫn đội kia; không báo trùng CCCD giữa hai đội; số liệu giống từng byte sau khi đóng và mở lại ứng dụng.

### R5 — cài đặt và nâng cấp (CI Windows, PR #27)
- Cài đè lên bộ cài thật v2.3.0: dữ liệu chủ rừng, lô và lô đã chốt còn nguyên; sau cài đè chạy đúng phiên bản 3.0.0; lô đã chốt vẫn chỉ đọc, đúng phiên bản chốt, nguyên vẹn; cấu trúc dữ liệu đã nâng; có bản sao lưu `truoc-nang-cap-v14-len-v15`.
- Cài đè lên v2.2.0, v1.0.0, v1.4.0, v1.4.33 và các bản dựng 1.4.38, 2.0.0 cũng đạt.

### R5 — giao diện ở 150%
Ảnh trong thư mục `docs/nghiem-thu-r4-r5/`; số đo tràn ngang ở `ket-qua-hien-thi-100-125-150.json`.
- Danh mục đối tượng, Danh mục xe, hợp đồng nhân công (mục Thành viên và Chấm công), hợp đồng vận chuyển (mục Xe và Phiếu cân), Thông tin rừng, Công ty địa chỉ giao và cước, tab Xuất hồ sơ: không tràn ngang ở 100%, 125%, 150%.

## 4. Kết quả build Windows và thử bộ cài (báo riêng)
- Trên PR #27 (cùng mã ứng dụng trừ thay đổi R3 ở mục 3): bước build, cài bộ `.exe`, mở, ghi, đóng, mở lại và các bước cài đè đều đạt.
- Với PR này: xem các kiểm tra của PR. Phần chạy chính thức là CI Windows; kết quả Linux ở trên không thay thế nó.

## 5. Ca chưa xác minh
1. **Tra cứu HoSoKeo từ Google Sheets thật.** Bảng `HoSoKeo_QC` (khoảng 920 KB) có trong Drive của chủ tài khoản nhưng môi trường chạy kiểm thử chặn mạng ra Google, và tải toàn bộ về sẽ đưa dữ liệu thật vào phiên làm việc nên không thực hiện. Tra cứu mới được kiểm bằng dữ liệu mẫu trong repo (đọc ba nhóm HoSoKeo, HoSoRung, ToaDoRung; nhận diện tab theo cột; ánh xạ đã nhớ; offline). **Cần thử trên máy Windows có đăng nhập Google** trước khi phát hành.
2. **Giao diện 150% trên Windows thật.** Ảnh chụp bằng Electron trên Linux với hệ số phóng 1,5; chưa mở thủ công trên màn hình Windows đặt 150%.
3. **PR #23 đã đóng.** Kết quả từng ca nằm trong PR này thay vì cập nhật PR #23.

## 6. Ảnh
| Ảnh | Nội dung |
| --- | --- |
| `doi-chieu-bks.png` | Xem trước phiếu nạp: BKS chỉ có ở hợp đồng khác — "Xe này thuộc hợp đồng số 02", ba cách xử lý |
| `doi-chieu-bm09-truoc.png` | Đối chiếu BM-09/10: 100 tấn, 90 tấn đã vào mẫu, 10 tấn cần xử lý |
| `doi-chieu-bm09-sau.png` | Sau khi gán xe và lưu: đủ 100 tấn |
| `danhMuc-150.png`, `danhMucXe-150.png` | Danh mục đối tượng và xe, có nút Nhập Excel, ở 150% |
| `hdNCThanhVien-150.png` | Hợp đồng nhân công, mục Thành viên, ở 150% |
| `hdDXPhieuCan-150.png` | Hợp đồng vận chuyển, mục Phiếu cân (Tra cứu HoSoKeo, Chọn file Excel, Thêm phiếu cân) ở 150% |
| `rungXuat-150.png` | Tab Xuất hồ sơ ở 150% |
