# Kết quả kiểm thử thực tế (12/11/2026)

Môi trường: Linux (máy làm việc), Electron 33.4.11 thật chạy trên màn hình ảo, SQLite 3.49 (better-sqlite3). Dữ liệu giả lập trong `tests/fixtures/` (không chứa dữ liệu thật). File HoSoKeo_QC.xlsx thật chỉ dùng để chạy thử trên máy làm việc, không đưa vào mã nguồn.

## Tóm tắt

| Bộ kiểm thử | Lệnh | Kết quả |
| --- | --- | --- |
| Lớp SQLite + bản tra cứu (đơn vị) | `npm test` | 16/16 đạt |
| Electron: lưu theo rừng, mở lại, nhập JSON cũ | `node scripts/e2e.js` | 12/12 đạt |
| Electron: Tra cứu Google Sheets, xem trước, ghi vào rừng, đồng bộ, mất mạng | `node scripts/e2e-lookup.js` | 33/33 đạt |
| Electron: xuất BM-01…BM-19 và ZIP | `node scripts/e2e-export.js` | 5/5 đạt (29 nút tải, 0 bị khóa, ZIP 24 file .docx) |
| Bản HTML (hồi quy 15 bộ cũ, Chromium) | `test_phase1..14`, `regress_p1b` | đạt (2 dòng False đã biết từ trước, đúng thiết kế) |

## Chi tiết

### Đơn vị
```
ok 1 - nạp Excel đủ 3 tab, giữ CCCD/mã hợp đồng/số phiếu dạng văn bản, ngày dd/mm/yyyy
ok 2 - thiếu cột hoặc thiếu tab: báo rõ tab/cột và GIỮ bản tra cứu cũ
ok 3 - tìm có dấu/không dấu, theo CCCD, số phiếu, biển số, mã rừng; lọc theo tab
ok 4 - ghép theo CCCD + hợp đồng: một chủ nhiều hợp đồng, trùng số hợp đồng khác CCCD, trùng tên chủ
ok 5 - hợp đồng nhiều rừng: phiếu cân không gán sẵn; diện tích lệch giữa hai nguồn
ok 6 - khối lượng: thiếu cột tấn thì lấy kg / 1000; dòng không có mã khách báo lỗi
ok 7 - tọa độ: thập phân, độ-phút-giây, có chữ bán cầu, ngoài Việt Nam, nhầm cột
ok 8 - biển số và khử chuỗi lặp
ok 9 - lưu và đọc lại đúng từng rừng, giữ CCCD dạng chuỗi có số 0 đầu
ok 10 - chỉ ghi dòng đã đổi; xóa rừng thì xóa dòng
ok 11 - lỗi giữa chừng thì giao dịch hoàn tác, dữ liệu cũ còn nguyên
ok 12 - xem trước nhập: đếm số liệu và báo bản ghi trùng
ok 13 - nhập: skip / overwrite / both / replace, luôn có bản sao lưu trước
ok 14 - nâng cấp cấu trúc: file có sẵn được sao lưu trước, dữ liệu còn nguyên
ok 15 - từ chối cơ sở dữ liệu thuộc phiên bản mới hơn
ok 16 - nâng cấp cơ sở dữ liệu bản P1 (v1) lên bản hiện tại: thêm bảng tra cứu, giữ hồ sơ
```

### Electron – P1
```
ĐẠT  cửa sổ có tiêu đề HAKQN
ĐẠT  thanh trạng thái hiển thị SQLite
ĐẠT  thanh ngữ cảnh hiện chủ rừng
ĐẠT  thanh ngữ cảnh hiện mã rừng đang mở
ĐẠT  trạng thái lưu: Đã lưu
ĐẠT  mở lại thấy chủ rừng
ĐẠT  mở lại thấy 2 rừng riêng
ĐẠT  nhân công chỉ nằm ở rừng được nạp
ĐẠT  xem trước nhập hiển thị số liệu
ĐẠT  nhập v1 thêm chủ rừng cũ, giữ chủ rừng hiện có
ĐẠT  sao lưu tự động trước khi nhập
ĐẠT  không có lỗi JavaScript
```

### Electron – Tra cứu Google Sheets
```
ĐẠT  menu Tra cứu Google Sheets hiện trên thanh điều hướng
ĐẠT  chưa có bản tra cứu thì báo rõ
ĐẠT  nhập Excel: hiện nguồn file + số dòng từng tab
ĐẠT  Excel thiếu cột: báo tab + cột, vẫn dùng bản cũ
ĐẠT  tìm không dấu theo tên trong tab HoSoRung_QC: 3 dòng
ĐẠT  tìm số phiếu cân trong Tất cả
ĐẠT  kết quả có cảnh báo trùng số hợp đồng khác CCCD
ĐẠT  liệt kê hợp đồng khác của cùng chủ
ĐẠT  xem trước: có tab · dòng · cột nguồn
ĐẠT  xem trước: điểm GPS độ-phút-giây được quy đổi và gắn nhãn
ĐẠT  xem trước: cần ghép tên xe với biển số
ĐẠT  xem trước: phiếu lệch tấn/kg cần kiểm tra
ĐẠT  đã tạo chủ rừng mới từ kết quả
ĐẠT  thanh ngữ cảnh: mã rừng 20260110_001
ĐẠT  diện tích 2,5 ha; tọa độ chỉ điền khi người dùng chọn
ĐẠT  khối lượng thực tế = tổng 2 phiếu đã chọn (2,84 + 4,44 = 7,28)
ĐẠT  2 phiếu cân ghi vào rừng, biển ghép từ tên xe
ĐẠT  nhập lại: phiếu đã có hiện "bỏ qua", trường giống nhau hiện "giống nhau"
ĐẠT  nhập lại không tạo phiếu trùng
ĐẠT  ô đã có giá trị khác: chưa chọn thì không cho lưu
ĐẠT  chọn giữ hiện có: giá trị người dùng nhập được giữ
ĐẠT  hợp đồng có 2 rừng: hiện 2 phương án để chọn
ĐẠT  hợp đồng nhiều rừng: phiếu cân không chọn sẵn
ĐẠT  chủ rừng khác CCCD: mặc định tạo chủ rừng mới
ĐẠT  diện tích khác nhau giữa hai nguồn: bắt buộc chọn
ĐẠT  chọn diện tích từ ToaDoRung (50.000 m² = 5 ha) và tọa độ điểm đã chọn
ĐẠT  mã rừng đã có: không cho tạo mới, gợi ý mở rừng đó
ĐẠT  đồng bộ Google Sheets thành công
ĐẠT  đồng bộ lỗi: báo lỗi, vẫn tra cứu bản đã lưu
ĐẠT  không có lỗi JavaScript
ĐẠT  mở lại: hồ sơ 2 chủ rừng còn nguyên
ĐẠT  mở lại khi mất kết nối: vẫn tra cứu được bản đã lưu
ĐẠT  không có lỗi JavaScript sau khi mở lại
```

### Electron – Xuất hồ sơ
```
Nút tải: 29, đã bấm 29, bị khóa: không
File: 25 (20 .docx, 5 .zip)
ĐẠT  mọi file .docx mở được, có nội dung tiếng Việt
ĐẠT  xuất đủ BM-01 đến BM-19
ĐẠT  gói ZIP toàn bộ hồ sơ mở được (24 file .docx)
ĐẠT  không có lỗi JavaScript
```

### Kiểm tra trên dữ liệu thật (HoSoKeo_QC.xlsx, chạy trên máy làm việc)
- Nạp đủ 3 tab: 14.636 / 494 / 835 dòng trong 2,6 giây; tìm “nguyen van kiet” 18 dòng trong 20 ms.
- 494/494 dòng HoSoRung_QC dựng được kết quả; 1 hợp đồng có nhiều rừng.
- Tọa độ: 57 điểm quy đổi được, 51 điểm không dùng được (báo lý do), còn lại số thập phân hợp lệ.
- Biển số: 10.381/14.636 đúng dạng; còn lại cần ghép tên xe → biển số.

## Đã xác minh / chưa xác minh
| Hạng mục | Trạng thái |
| --- | --- |
| Lưu SQLite, giao dịch, hoàn tác khi lỗi, nâng cấp cấu trúc v1 → v2 có sao lưu | Đã xác minh (đơn vị + Electron) |
| Mở lại sau khi đóng, hồ sơ đúng từng rừng | Đã xác minh (Electron, Linux) |
| Tra cứu offline, đồng bộ lỗi giữ bản cũ, Excel sai cột giữ bản cũ | Đã xác minh (máy chủ giả lập) |
| Đồng bộ với Google Sheets thật | **Chưa**: máy làm việc không truy cập được docs.google.com; cần thử trên máy Windows có mạng |
| Biểu mẫu Word | Đã mở bằng LibreOffice (tiếng Việt, bảng, chữ ký); **chưa mở bằng Microsoft Word** (môi trường không có Word) |
| Bộ cài .exe NSIS, Start Menu | **Chưa chạy trên Windows**: máy làm việc thiếu Wine; bộ cài được build bằng GitHub Actions (windows-latest). Bản .zip chạy thử (có SQLite cho Windows) đã build được |
| Cài từ .exe rồi mở khi ngắt mạng trên Windows | **Chưa**, cần làm trên máy Windows theo danh sách dưới |

## Danh sách kiểm thử trên Windows (người phụ trách làm sau khi có bộ cài)
1. Cài từ .exe, mở từ Start Menu, ngắt mạng, tạo 1 chủ rừng 2 rừng, đóng, mở lại.
2. Tra cứu → Đồng bộ ngay (có mạng) → ngắt mạng → tra cứu lại → Đồng bộ ngay (báo lỗi, vẫn tra cứu được).
3. Nhập bản Excel HoSoKeo_QC.xlsx; thử 1 file đổi tên cột (phải báo lỗi, giữ bản cũ).
4. Nhập JSON từ bản HTML cũ; Sao lưu ra USB; Khôi phục trên máy khác.
5. Xuất BM-01…BM-19 và ZIP, mở bằng Microsoft Word: tiếng Việt, bảng, ngắt trang, chữ ký.
