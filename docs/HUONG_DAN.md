# Hướng dẫn sử dụng HAKQN Desktop – Hồ sơ khai thác và vận chuyển gỗ keo

Tài liệu dành cho người nhập liệu và người lập hồ sơ. Phần mềm chạy trên Windows, lưu dữ liệu ngay trên máy (SQLite), **không cần mạng** để nhập liệu, kiểm tra, xuất hồ sơ, sao lưu và khôi phục. Chỉ cần mạng khi đồng bộ bảng tính Google.

**Mục lục**
1. [Cài đặt và mở phần mềm](#1-cài-đặt-và-mở-phần-mềm)
2. [Quy trình làm việc 8 bước](#2-quy-trình-làm-việc-8-bước)
3. [Chủ rừng và lô rừng](#3-chủ-rừng-và-lô-rừng)
4. [Nhân công, hợp đồng và đơn giá](#4-nhân-công-hợp-đồng-và-đơn-giá)
5. [Vận chuyển: xe, phiếu cân, cước, địa chỉ giao](#5-vận-chuyển-xe-phiếu-cân-cước-địa-chỉ-giao)
6. [File Excel mẫu và cách điền](#6-file-excel-mẫu-và-cách-điền)
7. [Tra cứu Google Sheets](#7-tra-cứu-google-sheets)
8. [Kiểm tra hồ sơ trước khi xuất](#8-kiểm-tra-hồ-sơ-trước-khi-xuất)
9. [Xuất hồ sơ và báo cáo](#9-xuất-hồ-sơ-và-báo-cáo)
10. [Sao lưu và khôi phục](#10-sao-lưu-và-khôi-phục)
11. [Nâng cấp phần mềm](#11-nâng-cấp-phần-mềm)
12. [Quy tắc dữ liệu cần nhớ](#12-quy-tắc-dữ-liệu-cần-nhớ)
13. [Xử lý sự cố](#13-xử-lý-sự-cố)
14. [Lưu ý trước khi dùng chính thức](#14-lưu-ý-trước-khi-dùng-chính-thức)

---

## 1. Cài đặt và mở phần mềm
1. Chạy `HAKQN-HoSoKhaiThac-Setup-<phiên bản>.exe`, chọn thư mục cài rồi bấm Cài đặt. Bộ cài chưa ký số nên Windows có thể hiện cảnh báo SmartScreen: chọn **More info → Run anyway**.
2. Mở từ **Start Menu → HAKQN - Hồ sơ khai thác** hoặc biểu tượng trên Desktop.
3. Dữ liệu nằm ở `%APPDATA%\hakqn-ho-so-khai-thac\hakqn.sqlite` (menu **Tệp → Mở thư mục dữ liệu**). Cài bản mới đè lên bản cũ **không mất dữ liệu**; gỡ cài đặt cũng không xóa dữ liệu.
4. Thanh trên cùng: **Tổng quan · Tra cứu Google Sheets · Báo cáo · Công ty mua hàng**, nút sáng/tối và menu **⋯ Thêm** (Hướng dẫn, Bảng màu, Sao lưu, Khôi phục, Khôi phục lô rừng). Dòng ngay dưới cho biết chủ rừng, lô đang mở và trạng thái lưu (“✔ Đã lưu vào máy”).

## 2. Quy trình làm việc 8 bước
| Bước | Việc cần làm | Ở đâu |
| --- | --- | --- |
| 1 | Khai **Công ty mua hàng** (một lần cho cả phần mềm) | Nút 🏢 Công ty mua hàng |
| 2 | Tạo **Chủ rừng** (hoặc lấy từ Tra cứu Google Sheets) | + Chủ rừng mới |
| 3 | Tạo **Lô rừng** của chủ: mã lô, địa điểm, tọa độ, diện tích, thời gian, giấy tờ | Chủ rừng → Rừng → + Rừng mới |
| 4 | Chọn hình thức hợp đồng, đơn giá, rồi **nạp Excel nhân công** | Lô → tab Nhân công |
| 5 | Chọn cách tính cước, **nạp Excel xe**, rồi **nạp Excel phiếu cân**, chọn **địa chỉ giao hàng** | Lô → tab Vận chuyển |
| 6 | Mở **Kiểm tra trước khi xuất**, xử lý các mục chặn và mục cần đối chiếu | Lô → tab Kiểm tra trước khi xuất |
| 7 | Nhập thông số biên bản, **tải biểu mẫu** (từng file hoặc ZIP) | Lô → tab Xuất hồ sơ |
| 8 | **Sao lưu** lô hoặc toàn bộ dữ liệu | ⬇ Sao lưu lô rừng / ⋯ Thêm → Sao lưu |

Mỗi lô có tổ khai thác, xe, hợp đồng, giá, giấy tờ và địa chỉ giao riêng; chủ rừng chỉ giữ thông tin chung (họ tên, CCCD, địa chỉ).

## 3. Chủ rừng và lô rừng
- **Chủ rừng**: mã, họ tên, danh xưng (Ông/Bà), CCCD (12 số), ngày và nơi cấp, địa chỉ thường trú, **số điện thoại** (tùy chọn; in ở khối bên chủ rừng của hợp đồng nếu có), **số hợp đồng** và **ngày ký hợp đồng** (hai ô này tùy chọn; ngày ký phải là ngày có thật). Phần mềm **không còn hỏi ngày sinh chủ rừng** (hồ sơ cũ đã có ngày sinh vẫn giữ trong dữ liệu nhưng không in). Số hợp đồng và ngày ký in ở dòng “Căn cứ Hợp đồng số … ký ngày …” của BM-01 và BM-04 và ở BM-17; **ngày ký hợp đồng là ngày ký mặc định** của các biểu mẫu nếu ô “Ngày ký hợp đồng” ở tab Xuất hồ sơ để trống. Khi lấy chủ rừng từ **Tra cứu Google Sheets**, số hợp đồng, ngày ký và số điện thoại lấy từ cột “Mã hợp đồng”, “Ngày ký hợp đồng” và “SĐT” của tab HoSoRung_QC.
- **Lô rừng** (tab Thông tin rừng): mã lô, tên, địa điểm khai thác, tọa độ WGS84 (vĩ độ và kinh độ nhập cùng nhau), diện tích, định mức tấn/ha, khối lượng thực tế, cự ly vận chuyển, thời gian khai thác, **giấy tờ pháp lý đất/rừng**.
  - **Sản lượng dự kiến** là ô tự tính = diện tích × định mức, **tự nhảy ngay khi bạn gõ** diện tích và định mức (không cần bấm Lưu). Khối lượng khai thác thực tế để trống thì phần mềm dùng sản lượng dự kiến.
  - **Cự ly vận chuyển (km)** là quãng đường từ rừng đến nơi giao gỗ (nhà máy). Ô này chỉ cần khi tính cước **tấn/km** (tiền cước = đơn giá × cự ly); cước cố định thì bỏ trống được. **Chỉ nhập ở một chỗ này**; tab Vận chuyển chỉ hiển thị lại số km và có nút mở nhanh tab Thông tin rừng.
- **Mã lô là duy nhất trên toàn máy**, so sánh không phân biệt hoa thường và bỏ khoảng trắng đầu/cuối. Mã trùng bị từ chối và phần mềm nêu lô đang dùng mã đó.
- **Đổi mã lô**: các dòng nhân công, xe, phiếu cân mang mã cũ được **đổi theo mã mới** để dữ liệu vẫn thuộc đúng lô; dòng mang một mã khác được báo, không tự đổi.
- Thanh **Tiến độ hồ sơ · checklist FSC** ở đầu lô cho biết % hoàn thành và từng mục còn thiếu.

## 4. Nhân công, hợp đồng và đơn giá
Vào lô → tab **Nhân công** → mục **Thông số hợp đồng và đơn giá**:
1. **Hình thức hợp đồng**
   - **Giao khoán**: chủ rừng ký hợp đồng khoán (BM-01) với **Tổ trưởng**; các công nhân ký **một Giấy ủy quyền (BM-20)** cho Tổ trưởng. Tính theo **tấn hoặc ha**.
   - **Trực tiếp**: chủ rừng ký hợp đồng lao động (BM-03) với **mọi nhân công**. Tính theo **tấn hoặc ngày công**.
2. **Đơn giá theo từng chức danh** (Tổ trưởng, Công nhân khai thác, Công nhân cưa): ô đơn giá hiện theo cơ sở tính đã chọn (đồng/tấn, đồng/ha, đồng/công). Thiếu đơn giá của chức danh nào thì dòng nhân công đó báo lỗi.
3. **Sản lượng chia đều**: tấn (hoặc ha, hoặc số công) chia đều cho **mọi người trong tổ, kể cả Tổ trưởng**; tiền mỗi người = phần chia × đơn giá chức danh của người đó.
4. **Ngày bắt đầu** dùng cho hợp đồng, chấm công và kiểm tra **đủ 18 tuổi**. Người dưới 18 tuổi bị cảnh báo và **không xuất được Giấy ủy quyền**.
5. **Định mức BHLĐ** theo chức danh (nút **⚙ Định mức BHLĐ** ở cột bên trái) dùng cho sổ cấp phát.
6. Nạp danh sách người bằng file Excel mẫu (xem mục 6). Mỗi lô cần **đúng một Tổ trưởng**.

## 5. Vận chuyển: xe, phiếu cân, cước, địa chỉ giao
Vào lô → tab **Vận chuyển**. Thứ tự nên làm: chọn cách tính cước → nạp xe → nạp phiếu cân → chọn địa chỉ giao.

**Cước vận chuyển – chọn một trong hai cách**
1. **Đơn giá cố định** (đồng/tấn): một giá, không phụ thuộc cự ly.
2. **Đơn giá tấn/km** (đồng/tấn/km): đơn giá × cự ly của lô. **Nhập số km ở tab Thông tin rừng, ô “Cự ly vận chuyển (km)”** (chỉ nhập ở một chỗ; tab Vận chuyển chỉ hiện lại số km và có nút mở nhanh tab Thông tin rừng). Thiếu cự ly thì báo thiếu.
Tiền vận chuyển tính theo **tấn giao tại nhà máy** (theo phiếu cân), cho từng xe. Hồ sơ cũ còn chọn “theo bậc cự ly” (cách đã bỏ) bị báo phải chọn lại; dữ liệu các bậc vẫn được giữ.

**Đội xe**: nạp bằng Excel. Cột **Người ký HĐ vận chuyển** chọn “Chủ xe” hoặc “Tài xế”; chỉ người ký mới phải có đủ CCCD, ngày cấp, thường trú và SĐT. Giấy tờ (GPLX, bảo hiểm, kiểm định) quá hạn hoặc còn dưới 30 ngày thì **cảnh báo**, không chặn xuất.

**Phiếu cân**: nạp bằng Excel, **mỗi chuyến một dòng**. Nạp **đội xe trước**, vì phiếu cân chỉ nhận biển số có trong danh sách xe (so khớp bỏ dấu chấm, gạch, khoảng trắng). Phiếu **trùng số** vẫn được cộng vào tổng nhưng bị đánh dấu để kiểm tra.

**Công ty mua hàng và địa chỉ giao**
- Phần mềm dùng cho **một công ty**: khai **một hồ sơ** ở nút **🏢 Công ty mua hàng** (tên pháp lý và địa chỉ bắt buộc; MST, người đại diện, chức vụ, SĐT, email; có thể thêm nhiều **địa chỉ giao hàng** như kho, nhà máy).
- Ở tab Vận chuyển của từng lô: **Chọn địa chỉ giao hàng** → chọn một địa chỉ → xem bảng so sánh “hiện tại / mới” → **Xác nhận**. Địa chỉ được lưu cùng hồ sơ lô và tự điền vào “Địa điểm vận chuyển đến”; dùng ở **BM-04, BM-09, BM-10 và Sổ phiếu cân**.
- Sửa tên hoặc địa chỉ trong hồ sơ công ty **không tự đổi** các lô đã chọn: lô giữ địa chỉ đã lưu và hiện thông báo, bấm **Xem và cập nhật** để áp dụng.
- Hồ sơ cũ nhập tay điểm đến vẫn giữ nguyên; lần đầu chọn địa chỉ sẽ thấy giá trị cũ cạnh địa chỉ đề xuất.
- “Nơi giao” ghi trên từng phiếu cân là **dữ liệu nguồn, giữ nguyên**; nếu khác địa chỉ giao đã chốt thì có cảnh báo để đối chiếu.
- Đổi điểm đến **không tự sửa cự ly hay đơn giá**; với cước tấn/km, phần mềm nhắc kiểm tra lại cự ly.

## 6. File Excel mẫu và cách điền
Ở mỗi ô nạp dữ liệu (nhân công, xe, phiếu cân) có nút **⬇ Tải file mẫu (có hướng dẫn)**. Mỗi file mẫu có **3 trang tính**:

| Trang | Dùng để |
| --- | --- |
| **HUONG_DAN** | Mục đích mẫu, các bước thực hiện, **mô tả từng cột** (bắt buộc, định dạng, ví dụ, lưu ý), phần mềm kiểm tra gì, lỗi thường gặp và cách sửa |
| **NHAN_CONG / DOI_XE / PHIEU_CAN** | **Trang cần điền.** Dòng 1 là tiêu đề, điền từ dòng 2. Phần mềm chỉ đọc trang này |
| **VI_DU** | Dữ liệu giả để tham khảo cách điền; phần mềm không đọc trang này |

Trong trang dữ liệu: tiêu đề **màu đỏ sẫm = cột bắt buộc**, màu xanh = tùy chọn hoặc có điều kiện; dòng tiêu đề cố định khi cuộn và có bộ lọc; các cột có **mũi tên chọn** (Vai trò, Danh xưng, Chức danh, Người ký) chỉ nhận giá trị trong danh sách; **bấm vào một ô sẽ hiện gợi ý** cho cột đó; cột đã định dạng văn bản nên **CCCD giữ nguyên số 0 đầu**.

**Quy tắc chung khi điền**
- Không sửa, xóa, đổi tên hoặc đổi thứ tự **dòng tiêu đề**; không đổi tên trang tính dữ liệu, không thêm cột, không gộp ô, không để dòng trống giữa dữ liệu.
- Ngày nhập dạng **dd/mm/yyyy** và phải là **ngày có thật** (31/02 là sai, 29/02/2028 hợp lệ).
- Mã rừng ở mọi dòng phải **đúng mã lô đang mở**.
- Khối lượng phiếu cân tính bằng **tấn**, dùng dấu phẩy hoặc dấu chấm thập phân.
- Sau khi nạp, phần mềm báo số dòng hợp lệ, dòng lỗi (kèm số dòng) và hỏi trước khi ghi. **Nạp lại file sẽ thay toàn bộ danh sách** của lô; phần mềm cho biết số bản ghi thêm, cập nhật, giữ, bỏ.
- File thật chứa thông tin cá nhân (họ tên, CCCD, địa chỉ): chỉ lưu và gửi nội bộ.

**Lỗi thường gặp khi nạp**
| Thông báo | Cách sửa |
| --- | --- |
| File thiếu cột … | Dùng đúng file mẫu, không sửa dòng tiêu đề |
| Mã rừng "…" khác rừng đang mở | Sửa cột Mã rừng đúng với lô đang mở |
| CCCD phải đủ 12 chữ số | Nhập lại đủ 12 số, giữ số 0 đầu |
| Cần đúng 1 tổ trưởng | Chỉ một dòng có Vai trò “Tổ trưởng” |
| Biển … chưa có trong danh sách xe | Thêm xe vào file đội xe, nạp lại xe rồi nạp phiếu cân |
| Ngày … không có thật | Sửa ngày đúng dd/mm/yyyy (ví dụ 28/02/2026) |
| Số phiếu cân … trùng | Kiểm tra phiếu nhập hai lần |

## 7. Tra cứu Google Sheets
Nút **🔎 Tra cứu Google Sheets** (hoặc **Lấy dữ liệu từ Google Sheets** trong Thông tin rừng).

**Lấy bản tra cứu**
- **Đồng bộ ngay**: tải bảng tính theo liên kết đã lưu, chỉ đọc. Bảng tính để chế độ “Ai có liên kết đều xem được” thì không cần đăng nhập; nếu giới hạn quyền xem, bấm **🔑 Đăng nhập Google (chỉ đọc)** bằng tài khoản được chia sẻ (cách cấu hình: `docs/GOOGLE_OAUTH.md`).
- **Nhập bản Excel**: chọn `HoSoKeo_QC.xlsx` hoặc file cùng cấu trúc khi **không có mạng**.
- Phần mềm kiểm tra đủ 3 tab `HoSoKeo_QC`, `HoSoRung_QC`, `ToaDoRung_QC` và các cột bắt buộc. **Tên tab được so khoan dung**: khác chữ hoa/thường, dấu, khoảng trắng hay gạch vẫn nhận; tab tên khác hẳn (ví dụ bảng tính sao chép, đặt lại tên) vẫn nhận **nếu có đủ các cột bắt buộc** của tab đó, và phần mềm ghi chú tab nào được nhận là tab nào. Thiếu thật sự thì báo rõ tab thiếu, **liệt kê các tab file đang có** và **giữ bản tra cứu cũ**. Bản tra cứu lưu trên máy nên **tra cứu offline** vẫn dùng được.

**Tìm và ghi vào hồ sơ**
1. Gõ mã rừng, tên chủ rừng (có dấu hoặc không), CCCD, mã hợp đồng, địa chỉ, số phiếu cân hoặc biển số → **Tìm**. Cú pháp nâng cao: nhiều từ = phải có đủ; `"cụm từ"`; `-từ` để loại trừ; `cccd:` `hd:` `rung:` `phieu:` `bien:` `ten:` `dc:` để tìm đúng trường.
2. Bấm **Chọn** ở dòng cần lấy. Phần mềm ghép theo **CCCD + mã hợp đồng**, hiện các rừng của hợp đồng và cảnh báo khi số hợp đồng trùng với CCCD khác.
3. Chọn **Điền vào rừng đang mở** hoặc **Tạo rừng mới từ kết quả** (mã rừng đã có thì không tạo mới).
4. Màn hình xem trước hiện giá trị hiện có, giá trị đề xuất và nguồn (tab · dòng · cột). Ô trống được đề xuất điền sẵn; ô đã có giá trị khác phải chọn **giữ** hay **dùng đề xuất**; diện tích hai nguồn khác nhau phải chọn một; tọa độ độ-phút-giây được quy đổi và gắn nhãn.
5. Phiếu cân: **ngày cân phải có thật** (phiếu sai ngày bị loại và nêu lý do); phiếu ghi tên xe thay vì biển số thì nhập biển số một lần ở “Ghép tên xe với biển số”; phiếu đã có thì bỏ qua, không tạo bản trùng.
6. **Lưu vào hồ sơ**: ghi một lần trong một giao dịch, kèm dấu vết nguồn.

**Bộ lọc thông minh**: xếp theo độ khớp, lọc theo ngày cân, khối lượng, tình trạng hợp đồng, “chỉ dòng cần kiểm tra”; chip điều kiện bấm × để gỡ; lưu và mở lại bộ lọc; xem dạng **bảng phẳng** hoặc **cha–con** (hợp đồng → rừng → phiếu cân).

## 8. Kiểm tra hồ sơ trước khi xuất
Mỗi lô có tab **Kiểm tra trước khi xuất** (tên tab cho biết số mục chặn, hoặc “đạt”). Màn hình gom hai nhóm:
- **Chặn xuất**: thông tin chủ rừng/lô thiếu hoặc sai, nhân công lỗi, đội xe lỗi, thiếu đơn giá, cước theo bậc của hồ sơ cũ, **phiếu cân thiếu hoặc sai ngày**, **phiếu trùng số**, **biển số chưa ghép với xe**, **mã lô trùng** (dữ liệu cũ).
- **Cần đối chiếu**: chênh lệch sản lượng so với ngưỡng, giấy tờ xe sắp hết hạn, **chưa chọn địa chỉ giao hàng**, địa chỉ công ty đã đổi (hiện địa chỉ cũ và mới), “Nơi giao” trên phiếu khác địa chỉ đã chốt, nhắc kiểm tra cự ly khi tính tấn/km, các mục checklist FSC còn thiếu.

Mỗi mục kèm **số phiếu hoặc tên trường** liên quan và nút **Mở để sửa** đưa bạn đến đúng tab. Tab Xuất hồ sơ cũng có dòng nhắc và liên kết sang màn hình này. Mã lô trùng ở dữ liệu cũ được **liệt kê đủ các lô khớp** (kèm chủ, số nhân công, xe, phiếu cân); dữ liệu **giữ nguyên** đến khi bạn đổi mã.

## 9. Xuất hồ sơ và báo cáo
**Tab Xuất hồ sơ** chia 4 nhóm và “Tất cả”. Ô thông số để trống thì Word in dòng chấm để điền tay. Thiếu dữ liệu bắt buộc thì nút tải bị khóa và hiện lý do.

| Nhóm | Biểu mẫu |
| --- | --- |
| 1. Hợp đồng | BM-01 hợp đồng khai thác (giao khoán), BM-20 Giấy ủy quyền (giao khoán), BM-03 hợp đồng lao động (trực tiếp), BM-14 nghiệm thu – thanh lý |
| 2. Lao động, an toàn | BM-02 BHLĐ, BM-05 chấm công, BM-06 danh sách tổ, BM-07 ATLĐ, BM-08 tiền công, BM-15 sổ tai nạn, BM-16 kiểm tra thiết bị |
| 3. Vận chuyển | BM-04 hợp đồng vận chuyển, BM-09 xác nhận khối lượng, BM-10 thanh toán tiền vận chuyển |
| 4. FSC, giám sát | BM-11 cam kết nguồn gốc, BM-12 cam kết lao động, BM-13 kiểm tra hiện trường, BM-17 thẩm định, BM-18 nhật ký khai thác, BM-19 phổ biến chính sách FSC |

Tải từng file `.docx` hoặc cả nhóm (`.zip`).

**In hồ sơ làm hai đợt khi chưa xong khai thác** (đã có nhân công, vận chuyển nhưng chưa có phiếu cân, chưa nghiệm thu): ở tab **Xuất hồ sơ → Tất cả** có hai nút.
- **Đợt 1 – hồ sơ làm ngay (.zip)**: tất cả biểu mẫu **trừ** BM-08 bảng thanh toán tiền công, BM-09 xác nhận khối lượng, BM-10 thanh toán tiền vận chuyển và BM-14 nghiệm thu, thanh lý. In và ký đợt này trước.
- **Đợt 2 – sau khi xong rừng (.zip)**: **chỉ** BM-08, BM-09, BM-10 và BM-14. Khi rừng xong: nạp phiếu cân ở tab Vận chuyển, nhập khối lượng khai thác thực tế ở Thông tin rừng, nhập thông số nghiệm thu rồi tải đợt 2. Chưa đủ phiếu cân hợp lệ thì đợt 2 chỉ có BM-08 và BM-14, phần mềm báo rõ thiếu BM-09, BM-10; nạp phiếu cân xong tải lại.
**In mẫu đợt 2 để trống số, rồi in đè số lên mẫu đã in** (khi cần in sẵn cả BM-08, BM-09, BM-10, BM-14 trước khi có số liệu): ở tab **Xuất hồ sơ → Tất cả**, khung “In mẫu đợt 2 để trống số, rồi in đè số sau”.
1. **Bước 1 – Mẫu trống**: tải và in. Số biên bản, ngày lập, khối lượng, tiền để **chấm** hoặc **ô trống**; BM-09 có số dòng chuyến cố định (ô “Số dòng chuyến của BM-09”, mặc định 12); BM-10 có một dòng cho mỗi xe trong đội xe (biển số in sẵn). Làm được ngay khi đã có nhân công và đội xe, không cần phiếu cân.
2. **Bước 2 – Chỉ phần số để in đè**: khi có số liệu (phiếu cân, khối lượng thực tế, ngày lập, số tiền đã thanh toán), tải bản này và in lên **đúng tờ mẫu đã in**. Chữ cố định, đường kẻ, nền và chân trang được ẩn (không tốn mực), chỉ các con số hiện ra đúng chỗ trên mẫu: số biên bản, ngày, khối lượng, số chuyến, thành tiền, tổng cộng, bằng chữ.
3. Để số khớp vị trí: in cả hai bản **cùng khổ A4, tỉ lệ 100% (không “Fit to page”), cùng lề, cùng máy in**, cho tờ vào đúng chiều như lần in đầu; in thử một tờ nháp trước. Dùng **cùng một giá trị “Số dòng chuyến”** cho cả hai lần; nếu một xe có nhiều chuyến hơn số dòng này, phần mềm cảnh báo, hãy tăng số dòng rồi in lại mẫu trống.
4. Hai bản có bố cục giống hệt nhau (đã kiểm tra: cùng số đoạn, dòng bảng, số trang và vị trí các dòng chữ). Hai nhóm xe trùng tên người ký vẫn ra hai file riêng.
- Mỗi biểu mẫu là một file Word riêng, nên bộ hồ sơ đã in ở đợt 1 chỉ cần **bổ sung hoặc thay** các biểu mẫu của đợt 2. Hai đợt gộp lại đúng bằng nút “Tải toàn bộ hồ sơ”. BM-08 tính theo khối lượng thực tế đã nhập, chưa nhập thì theo sản lượng dự kiến, nên chỉ nên in BM-08 ở đợt 2.


**Số hợp đồng và năm trên biểu mẫu** (BM-01, BM-04, BM-09, BM-10, BM-14, BM-20): số in có dạng `<phần số>/<năm>-<hậu tố>`, ví dụ `015/2027-KT`.
- Nhập số **đầy đủ** (có dấu “/” hoặc đã có hậu tố, ví dụ `015/2025-KT`): phần mềm **giữ nguyên**.
- Chỉ nhập **phần số** (`015`): phần mềm ghép **năm lấy từ ngày ký của chính hợp đồng đó** và hậu tố. Hợp đồng khai thác (BM-01, BM-14, BM-20) và hợp đồng vận chuyển (BM-04) theo **Ngày ký hợp đồng**; Giấy ủy quyền theo ngày lập giấy (trống thì theo ngày ký hợp đồng); biên bản nghiệm thu, thanh lý và biên bản xác nhận khối lượng theo ngày lập biên bản.
- **Thiếu hoặc sai ngày ký**: năm để trống (`015/……-KT`), không tự điền năm cố định; khung “Số hợp đồng đầy đủ sẽ in (xem trước)” ở tab Xuất hồ sơ nêu rõ cần bổ sung ngày nào. Các dòng ngày để trống in “ngày ….. tháng ….. năm …….”.
- BM-01, BM-14 và BM-20 của cùng hồ sơ giao khoán luôn tham chiếu **cùng một số** hợp đồng khai thác.

**Nút 📊 Báo cáo**: chọn kỳ (từ ngày – đến ngày theo **ngày cân**) và chủ rừng, xem trước rồi xuất **Word** hoặc **Excel**. Năm mẫu: tổng hợp điều hành, sản lượng theo rừng, **sổ theo dõi phiếu cân** (có cột điểm đến theo hồ sơ và đối chiếu nơi giao), tiến độ FSC, bảng cha–con chủ rừng – rừng – phiếu cân. Số liệu giữa xem trước, Word và Excel giống nhau. **Phiếu có ngày không có thật bị loại khỏi tổng của kỳ** và được liệt kê ở mục riêng kèm lý do. Phiếu trùng số vẫn được cộng vào tổng nhưng đánh dấu “Trùng số phiếu”.

## 10. Sao lưu và khôi phục
Phần mềm **tự sao lưu file cơ sở dữ liệu** vào thư mục `backups` trước mỗi lần nâng cấp cấu trúc và mỗi lần khôi phục; mọi thao tác ghi nằm trong một giao dịch, lỗi giữa chừng thì dữ liệu cũ giữ nguyên.

**Sao lưu toàn bộ**: **⋯ Thêm → Sao lưu toàn bộ dữ liệu (.json)** → chọn thư mục → tạo 2 file cùng tên `.json` và `.sqlite`.

**Khôi phục toàn bộ**: **⋯ Thêm → Khôi phục toàn bộ dữ liệu (.json)** (cũng dùng để nhập bản sao lưu từ bản HTML cũ). Màn hình xem trước cho biết số liệu trong file và trên máy, và với từng chủ/lô: **THÊM** (chưa có), **TRÙNG** (đã có), **GIỮ** (có trên máy, không có trong file). Chọn cách xử lý:
- **Giữ bản trên máy, chỉ thêm mới**.
- **Ghi đè lô trùng**: chỉ thay **đúng các lô trùng**, giữ lô khác của chủ và chủ khác; hồ sơ chủ rừng của máy được giữ.
- **Giữ cả hai**: lô trùng được thêm thành lô **mới** và bạn **xác nhận mã mới** cho từng lô (gợi ý sẵn, ví dụ `R1-2`; mã bị từ chối nếu trùng lô đã có, lô khác trong file hoặc mã cũ).
- **Thay toàn bộ dữ liệu**: xóa dữ liệu hiện có và thay bằng file; hộp xác nhận nêu rõ số chủ và lô sẽ mất.

Nếu ID nội bộ, mã lô và chủ rừng chỉ về các hồ sơ **khác nhau** thì phần mềm **dừng**, không ghi gì và liệt kê hồ sơ cần đối chiếu.

**Sao lưu một lô rừng** (dùng khi chuyển lô sang máy khác, hoặc lưu riêng một lô): mở lô → **⬇ Sao lưu lô rừng** → chọn nơi lưu bằng hộp thoại Windows. File `HAKQN_LoRung_<MaLo>_<Ngày>.json` chứa đúng **một** lô: thông tin, giấy tờ, nhân công, xe, phiếu cân, hợp đồng, đơn giá, thông số biểu mẫu, dấu vết nhập, **địa chỉ giao hàng đã chốt** (để BM-04 vẫn đúng sau khi chuyển máy), nhận diện chủ rừng và các thiết lập dùng chung lô cần. File **không** chứa lô khác, chủ khác, bản tra cứu Google Sheets hay thông tin đăng nhập.

**Khôi phục một lô rừng**: **⋯ Thêm → ⬆ Khôi phục lô rừng…** → chọn file. Màn hình xem trước nêu chủ rừng và mã lô đích, thời điểm sao lưu, số nhân công, xe, phiếu cân, tổng tấn:
- Chủ đã có thì lô được **thêm vào đúng chủ đó**; chưa có thì **tạo chủ mới**.
- Lô đã tồn tại: mặc định **giữ bản hiện có**; chọn **thay** thì chỉ thay đúng lô đó, kèm bảng **trước / sau** (nhân công, xe, phiếu cân, tổng tấn, giấy tờ, cách tính cước, địa chỉ giao).
- Định mức BHLĐ hoặc ánh xạ biển số khác máy đích: **máy đích giữ thiết lập của mình**; màn hình nêu giá trị hai bên và phần hồ sơ có thể khác. Mục máy chưa có sẽ được bổ sung.
- File hỏng, bị cắt, sai loại hay phiên bản, số bản ghi hoặc tổng tấn không khớp phần kiểm tra, hoặc không xác định được lô đích: **báo lỗi, không ghi gì**. Gói lô chỉ đi qua “Khôi phục lô rừng”; bản sao lưu toàn bộ chỉ đi qua “Khôi phục toàn bộ dữ liệu (.json)”.

## 11. Nâng cấp phần mềm
- Cài bản mới **đè lên** bản cũ. Lần mở đầu phần mềm tự sao lưu file dữ liệu vào `backups` (tên `truoc-nang-cap-v…`) rồi nâng cấp cấu trúc; chủ rừng, lô, nhân công, xe, phiếu cân, bản tra cứu giữ nguyên.
- Hồ sơ cũ nhập tay “Địa điểm vận chuyển đến” vẫn hiển thị và **chỉ đổi khi bạn chọn địa chỉ công ty và xác nhận**.
- Hồ sơ cũ dùng cước “theo bậc cự ly”: dữ liệu bậc giữ nguyên nhưng lô đó phải **chọn lại cách tính cước** mới xuất được hợp đồng vận chuyển.
- Phiếu cân cũ sai ngày (ví dụ 31/02/2026): phiếu được giữ, có ô sửa ngay trong bảng phiếu cân; trong lúc chưa sửa, phiếu bị loại khỏi tổng kỳ báo cáo.

## 12. Quy tắc dữ liệu cần nhớ
| Nội dung | Quy tắc |
| --- | --- |
| Ngày | dd/mm/yyyy, **ngày có thật theo lịch**, có tính năm nhuận: 31/02/2026 và 29/02/2026 sai, 29/02/2028 đúng |
| Mã lô | Duy nhất trên máy, không phân biệt hoa thường; đổi mã thì dòng nhân công/xe/phiếu cân đổi theo |
| CCCD | Đúng 12 chữ số, giữ số 0 đầu; không trùng giữa các nhân công |
| Biển số | So khớp bỏ dấu chấm, gạch, khoảng trắng và không phân biệt hoa thường |
| Phiếu cân trùng số | Vẫn tính vào tổng, nhưng đánh dấu để kiểm tra (quy tắc đã được xác nhận) |
| Phiếu cân sai ngày | Không nhập được; phiếu cũ đã lưu được giữ, loại khỏi tổng kỳ |
| Điểm đến vận chuyển | Địa chỉ giao hàng đã xác nhận theo từng lô; “Nơi giao” trên phiếu giữ nguyên dữ liệu nguồn |
| Cước | Chỉ hai cách: cố định (đồng/tấn) hoặc tấn/km; tính theo tấn giao tại nhà máy |
| Tiền công | Tổng theo từng chức danh (phần chia đều × đơn giá chức danh), gồm cả Tổ trưởng |

## 13. Xử lý sự cố
| Hiện tượng | Cách xử lý |
| --- | --- |
| Nút tải biểu mẫu bị khóa | Mở tab **Kiểm tra trước khi xuất**, xử lý các mục chặn |
| Báo thiếu đơn giá | Nhập đơn giá cho từng chức danh ở tab Nhân công (kể cả Tổ trưởng) |
| Phiếu cân báo biển không có trong xe | Thêm xe vào file đội xe, nạp lại xe rồi nạp phiếu cân |
| Phiếu cân báo sai ngày | Sửa ngay trong bảng phiếu cân (ô “Sửa ngày”) hoặc sửa file Excel rồi nạp lại |
| Đổi mã lô bị từ chối | Mã đã có ở lô khác; thông báo nêu lô đang dùng mã đó |
| Khôi phục báo mâu thuẫn | ID, mã lô và chủ rừng chỉ về các hồ sơ khác nhau: đối chiếu các lô được liệt kê, đổi mã lô thừa rồi khôi phục lại |
| Khôi phục lô báo “mã kiểm tra không khớp” | File bị sửa hoặc hỏng: lấy lại file sao lưu gốc |
| Đồng bộ Google lỗi | Mất mạng hoặc bảng tính không còn quyền xem: bản tra cứu cũ được giữ; dùng **Nhập bản Excel** |
| Word hiện dòng chấm | Ô thông số hoặc địa chỉ giao đang trống: điền ở màn hình hoặc điền tay |
| Nghi ngờ mất dữ liệu | Mở thư mục `backups` (cạnh file `hakqn.sqlite`) hoặc khôi phục từ file sao lưu gần nhất |

## 14. Lưu ý trước khi dùng chính thức
- **BM-20 Giấy ủy quyền** soạn theo Bộ luật Dân sự 2015 và Điều 18 Bộ luật Lao động 2019 (căn cứ tra qua các trang tư vấn pháp luật, chưa đối chiếu văn bản gốc): **cần người có chuyên môn pháp lý duyệt** trước khi dùng.
- Biểu mẫu mới kiểm tra hiển thị bằng LibreOffice, **chưa thử trên Microsoft Word thật**: nên in thử một bộ.
- Nội dung biểu mẫu FSC (BM-11 đến BM-19) do phần mềm soạn, cần đối chiếu với yêu cầu của tổ chức chứng nhận.
- Định mức BHLĐ là giá trị tạm; viện dẫn “Thông tư 84/2025/TT-BNNMT” giữ từ mẫu đã duyệt, chưa xác minh. BM-10 chưa tính khấu trừ thuế.
- Cách tính tiền khoán theo từng chức danh (chia đều) cần người phụ trách xác nhận.
