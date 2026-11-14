# Bảng số liệu tính tay dùng để đối soát (bản 1.4.31)

Các con số dưới đây được cộng **bằng tay, độc lập với phần mềm**, rồi so với kết quả phần mềm trong `scripts/e2e-doisoat.js`, `scripts/e2e-taitoanbo.js`, `scripts/e2e-luuvaolo.js` và `tests/stage.test.js`. Đơn vị: khối lượng tấn; tiền đồng. **Quy tắc làm tròn**: khối lượng mỗi phiếu làm tròn đến kg (3 số lẻ tấn) trước khi cộng; tiền mỗi người làm tròn đến đồng, tổng là tổng các khoản đã làm tròn.

## 1. Khối lượng: hai lô cùng chủ, phiếu trong và ngoài kỳ, số lẻ nhiều chữ số
| Lô | Phiếu | Ngày | Biển số | Khối lượng gốc (tấn) | Làm tròn kg (tấn) | Trong kỳ 10/2026 |
|---|---|---|---|---|---|---|
| A | A1 | 05/10/2026 | 92C-12345 | 12,5 | 12,500 | có |
| A | A2 | 06/10/2026 | 92C-67890 | 9,25 | 9,250 | có |
| A | A3 | 07/10/2026 | 92C-12345 | 8 | 8,000 | có |
| A | A4 | 08/10/2026 | 92C-12345 | 3,33333 | 3,333 | có |
| A | A5 | 09/10/2026 | 92C-67890 | 3,33333 | 3,333 | có |
| A | A6 | 05/09/2026 | 92C-12345 | 10 | 10,000 | không |
| B | B1 | 04/10/2026 | 92C-55555 | 15,32 | 15,320 | có |
| B | B2 | 05/10/2026 | 92C-55555 | 7,005 | 7,005 | có |
| B | B3 | 06/09/2026 | 92C-55555 | 3,333 | 3,333 | không |

| Chỉ tiêu | Công thức | Kết quả |
|---|---|---|
| Lô A, tất cả | 12,500 + 9,250 + 8,000 + 3,333 + 3,333 + 10,000 | **46,416** |
| Lô B, tất cả | 15,320 + 7,005 + 3,333 | **25,658** |
| Cộng hai lô, tất cả (Tổng quan; báo cáo cha–con không lọc kỳ) | 46,416 + 25,658 | **72,074**, 9 chuyến |
| Lô A, kỳ 10/2026 | 12,500 + 9,250 + 8,000 + 3,333 + 3,333 | **36,416**, 5 chuyến |
| Lô B, kỳ 10/2026 | 15,320 + 7,005 | **22,325**, 2 chuyến |
| Cộng hai lô, kỳ 10/2026 (cha–con, Sổ phiếu cân) | 36,416 + 22,325 | **58,741**, 7 chuyến |
| Sản lượng dự kiến | 2 lô × (2 ha × 80 tấn/ha) | **320**; tỷ lệ đã cân = 72,074 ÷ 320 = **22,5%** |
| Khối lượng thực tế nhập tay lô A | nhập tay | 40; lệch phiếu cân (46,416) quá 1% nên Tổng quan **cảnh báo** |

*Trước khi thống nhất làm tròn, báo cáo cộng số gốc: 12,5 + 9,25 + 8 + 3,33333 + 3,33333 + 10 = 46,41666 → hiển thị 46,417 trong khi biểu mẫu cộng theo kg ra 46,416 (lệch 1 kg).*

## 2. Tiền công (giao khoán theo tấn): 29,75 tấn chia đều 3 người (tổ trưởng và 2 công nhân)
Mỗi người: 29,75 ÷ 3 = 9,916667 tấn.
| Vai trò | Đơn giá (đồng/tấn) | Thành tiền = làm tròn(9,916667 × đơn giá) |
|---|---|---|
| Tổ trưởng | 420.000 | 4.165.000 |
| Công nhân khai thác | 330.000 | 3.272.500 |
| Công nhân cưa | 380.000 | 3.768.333 |
| **Tổng** | | **11.205.833** (BM-08 và BM-14 cùng một tổng) |

## 3. Bản nháp và lưu (tests/stage.test.js, scripts/e2e-luuvaolo.js)
| Bước | Kết quả mong đợi |
|---|---|
| Lô A đã lưu: 3 phiếu (12,5 + 9,25 + 8 = 29,75 tấn), 3 nhân công, 2 xe | nền để so |
| Thêm tay 1 nhân công, 1 xe (92C-22222), 1 phiếu PX1 12 tấn; nạp Excel: PA1 (giữ nguyên 12,5), PA2 đổi 9,25 → 9, PE1 8, PE2 7 (dòng trùng trong file bị báo lỗi, bỏ) | bản nháp: 6 phiếu; **chưa lưu**: dữ liệu đã lưu vẫn 3 phiếu, lô B nguyên |
| Sau khi **Lưu dữ liệu vào lô** | lô A: 6 phiếu, 4 nhân công, 3 xe; tổng = 12,5 + 9 + 8 + 12 + 8 + 7 = **56,5 tấn** |
| Đổi biển số xe 92C-12345 → 92C-54321 (phiếu liên kết đổi theo) | số chuyến và tổng **không đổi**; nhật ký đổi biển ghi PA1, PA3 (2 dòng) |
| Nạp lại đúng file Excel đã khớp | 0 thêm, 0 cập nhật, 4 giữ nguyên; vẫn 6 phiếu, 56,5 tấn (**không tính trùng**) |

## 4. Đợt 2 (scripts/e2e-taitoanbo.js)
Khi đã xác nhận in nền đủ 6 mục (BM-08, BM-14, 2 bộ BM-09, 2 bộ BM-10): “Tải toàn bộ” hiện danh sách; chọn in đè cho ra 2 gói riêng (hồ sơ đợt 1; phần in đè đợt 2 gồm 6 file hậu tố `_IN_DE`, không có chữ BẢN NHÁP); chọn in lại đầy đủ cho ra 1 gói giấy trắng; Hủy không tải gì.
