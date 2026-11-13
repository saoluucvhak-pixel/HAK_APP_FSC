# Quy trình tạo và in hồ sơ theo đợt

Tài liệu mô tả quy trình đã được rà soát và hệ thống hóa trong bản 1.4.28, các quy tắc bất biến và cách kiểm chứng.

## 1. Năm bước của một lô rừng

| Bước | Việc | Điều kiện hoàn tất |
| --- | --- | --- |
| 1. Chuẩn bị | Khai Công ty mua hàng (Cài đặt → Công ty), định mức BHLĐ có hiệu lực (Định mức BHLĐ), định mức gỗ keo (tùy chọn), thông tin chủ rừng và rừng, hợp đồng | Không còn mục thiếu hoặc lỗi |
| 2. In đợt 1 | Hợp đồng, lao động, vận chuyển, FSC (16 mẫu; 15 mẫu với giao khoán) | Mọi mẫu đủ dữ liệu, đã in, còn khớp |
| 3. Khai thác, cân | Nạp phiếu cân (tra cứu hoặc Excel), nhập khối lượng thực tế, ngày lập biên bản | Có phiếu cân |
| 4. In đợt 2 | BM-08, BM-09, BM-10, BM-14: giấy trắng một lần, hoặc in nền (khi chưa có phiếu cân) rồi in đè (khi đủ dữ liệu); xem mục 2b | Mọi mẫu đã in xong, còn khớp |
| 5. Hoàn tất | Kiểm tra trước khi xuất, báo cáo | Tất cả khớp dữ liệu hiện tại |

Bảng **Quy trình hồ sơ theo đợt** ở tab Xuất hồ sơ hiện năm bước này, việc nên làm tiếp (một câu theo đúng thứ tự), và từng mẫu với hai trạng thái độc lập.

## 2. Hai trạng thái của mỗi mẫu

- **Dữ liệu**: *Đủ* (in chính thức được), *Bản nháp* (xuất được nhưng thiếu điều kiện của riêng mẫu, nhãn “BẢN NHÁP”), *Chưa đủ* (chưa xuất được). Điều kiện từng mẫu: `src/bannhap.js` và `gate()`.
- **In ấn**: *Chưa in*, *Đã in, còn khớp*, *Đã in nhưng dữ liệu đã đổi: in lại*. “Đã in” do người dùng xác nhận (có “Đánh dấu cả đợt … đã in”). Phần mềm ghi **chữ ký nội dung** của mẫu (băm file sẽ in: thân tài liệu, chân trang, khổ giấy, nhãn BẢN NHÁP). Dữ liệu đổi sau đó → chữ ký đổi → hiện “in lại”. Trạng thái lưu trong dữ liệu của từng lô (`inAn`), nên đóng và mở lại vẫn nhớ.

Riêng đợt 2 có thêm hướng in (mục “In hồ sơ đợt 2”): **giấy trắng** một lần, hoặc **mẫu nền** rồi **in đè** (trạng thái “đã in mẫu nền” và chữ ký bố cục: `src/inan2.js`).

## 2b. Đợt 2: hai hướng in và vị trí của “in đè” trong quy trình

Bốn mẫu đợt 2 (BM-08, BM-09, BM-10, BM-14) in theo một trong hai hướng, và bảng Quy trình hiện hướng nào đang áp dụng ở cột **“Hướng in đợt 2”**:

- **Hướng A, giấy trắng**: khi đủ dữ liệu và chưa in nền, in đầy đủ một lần (gói `…_dot2_IN_GIAY_TRANG`).
- **Hướng B, nền rồi in đè**: in **mẫu nền** trước (gói `…_dot2_MAU_NEN_in_truoc`: chữ cố định, số biên bản, ngày lập, khối lượng, tiền để trống), bấm **Xác nhận đã in mẫu nền**; khi có số liệu thì nạp lại tờ nền đã in và in **phần bổ sung** (gói `…_dot2_IN_DE_phan_bo_sung`). Riêng BM-09, BM-10: bảng kê đính kèm luôn in đầy đủ trên giấy mới.

Trạng thái của mỗi mục (BM-08, BM-14 theo lô; BM-09, BM-10 theo từng người vận chuyển) và việc cần làm:

| Hướng in (cột trong bảng) | Ý nghĩa | Việc cần làm |
| --- | --- | --- |
| Chưa đủ dữ liệu để dựng cả mẫu nền | Thiếu nhân công, đội xe, ngày ký hoặc địa chỉ giao | Bổ sung (có nút mở đúng tab) |
| In mẫu nền trước | Đủ dựng nền, chưa đủ để in đầy đủ | In nền, xác nhận |
| Đủ dữ liệu, chưa in nền: in giấy trắng | Có thể in đầy đủ một lần | In giấy trắng |
| Nền đã in, chờ bổ sung dữ liệu | Đã xác nhận nền, chưa đủ phiếu cân, khối lượng thực tế, ngày lập | Nhập dữ liệu |
| Nền đã in, đủ dữ liệu: in đè | Bố cục còn khớp tờ nền | Nạp tờ nền, in đè |
| Bố cục đã đổi sau khi in nền | Thêm người lao động, đổi địa chỉ, tên… làm bố cục khác tờ nền | In lại nền (xác nhận lại) hoặc in giấy trắng |
| Từng nhóm khác nhau | Nhiều người vận chuyển ở các trạng thái khác nhau | Xem từng nhóm ở mục “In hồ sơ đợt 2” |

Luồng điển hình: `in nền → xác nhận → chờ dữ liệu → in đè → Đã in xong`; hoặc `đủ dữ liệu → giấy trắng → Đã in xong`. Sau khi in xong (in đè hoặc giấy trắng), bấm **Đã in xong** ở dòng của mẫu: phần mềm ghi chữ ký nội dung đầy đủ và về sau cảnh báo nếu dữ liệu đổi. **Tải file không đổi trạng thái**; chỉ nút xác nhận mới ghi nhận.

Việc nên làm tiếp (dòng nổi bật trên bảng) theo đúng thứ tự: in sẵn nền (khi chưa có phiếu cân) → chờ khai thác và cân → in đè (nạp lại tờ nền) → nếu bố cục đổi thì in lại nền hoặc giấy trắng → đánh dấu đã in xong.

In lên giấy thật: cùng khổ A4, tỉ lệ 100% (không “Fit to page”), cùng lề, cùng máy in, cho tờ vào đúng chiều như lần in nền; **in thử một tờ** trước khi in cả bộ.

## 3. Quy tắc bất biến

1. **Đợt 1 độc lập đợt 2.** Mọi file đợt 1 giống hệt nhau dù đợt 2 chưa hay đã có dữ liệu (phiếu cân, khối lượng thực tế, ngày lập, tiền thanh toán). Bản đã in ở đợt 1 vì thế không lệch bản in lại sau này. Kiểm thử: `scripts/e2e-batbien.js`.
2. **Nền và in đè cùng bố cục.** Mẫu nền và phần in đè trùng số đoạn, dòng bảng, ô và vị trí chữ; không có “BẢN NHÁP”. Kiểm thử: `scripts/e2e-inde.js`, `scripts/e2e-inan2.js`.
3. **Một nguồn số.** Cùng một số liệu (tiền công, khối lượng, tổng khoán) chỉ có một công thức; các mẫu đợt 2 khớp nhau (BM-08 = BM-14, BM-09 = tổng phiếu cân, BM-10 = khối lượng × đơn giá).
4. **Hợp đồng ký trước khai thác dùng số dự kiến.** BM-01 tính tổng khoán theo sản lượng dự kiến (diện tích × định mức), không đổi khi nhập khối lượng thực tế. BM-08 và BM-14 dùng khối lượng thực tế.

## 4. Kết quả rà soát (bản 1.4.28)

Chạy bất biến 1 trên dữ liệu thử phát hiện **bốn mẫu đợt 1 đọc dữ liệu đợt 2**, đã sửa:

| Mẫu | Lỗi | Sửa |
| --- | --- | --- |
| BM-01 Hợp đồng giao khoán | Tổng giá trị khoán đổi khi nhập khối lượng thực tế (ví dụ 60.266.667 → 11.205.833) | Dùng sản lượng dự kiến |
| BM-11 Cam kết nguồn gốc | Dòng “Khối lượng dự kiến” hiện số thực tế | Luôn dùng số dự kiến |
| BM-17 Thẩm định chủ rừng và rừng | “Khối lượng dùng” đổi theo số thực tế | Chỉ dùng số dự kiến |
| BM-18 Nhật ký khai thác | “Khối lượng nghiệm thu” lấy số dự kiến; tổng phiếu cân đổi theo dữ liệu | Dòng đối chiếu cuối đợt để trống (ghi tay khi kết thúc); chỉ điền khi “Tải toàn bộ hồ sơ” |

Kiểm tra chéo trên dữ liệu đầy đủ: BM-08 = BM-14 = BM-01 về tổng tiền công; BM-09 từng nhóm khớp phiếu cân (20,5 + 9,25 = 29,75 tấn); BM-10 = khối lượng × 52.000 (1.066.000 + 481.000 = 1.547.000). Không phát hiện lệch.

## 5. Hạn chế

- “Đã in” do người dùng xác nhận; phần mềm không biết tờ giấy đã thật sự ra máy in.
- Chữ ký nội dung nhạy với mọi thay đổi chữ, kể cả sửa tên hoặc địa chỉ: các mẫu liên quan hiện “in lại” (chủ ý, vì bản in cũ không còn đúng).
- In lên giấy thật (đặc biệt in đè đợt 2) cần in thử một tờ; kiểm tra tự động chỉ so bố cục trên Word và PDF.
