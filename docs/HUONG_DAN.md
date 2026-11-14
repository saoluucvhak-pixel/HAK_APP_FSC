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
4. Thanh trên cùng: **Tổng quan · Tra cứu Google Sheets · Báo cáo · Công ty mua hàng**, nút sáng/tối và menu **⋯ Thêm** (Hướng dẫn, Bảng màu, Sao lưu, Khôi phục, Khôi phục lô rừng). Dòng ngay dưới cho biết chủ rừng, lô đang mở và trạng thái lưu (“Đã lưu vào máy”).

## 2. Quy trình làm việc 8 bước
| Bước | Việc cần làm | Ở đâu |
| --- | --- | --- |
| 1 | Khai **Công ty mua hàng** (một lần cho cả phần mềm) | Nút Công ty mua hàng |
| 2 | Tạo **Chủ rừng** (hoặc lấy từ Tra cứu Google Sheets) | + Chủ rừng mới |
| 3 | Tạo **Lô rừng** của chủ: mã lô, địa điểm, tọa độ, diện tích, thời gian, giấy tờ | Chủ rừng → Rừng → + Rừng mới |
| 4 | Chọn hình thức hợp đồng, đơn giá, rồi **nạp Excel nhân công** | Lô → tab Nhân công |
| 5 | Chọn cách tính cước, **nạp Excel xe**, rồi **nạp Excel phiếu cân**, chọn **địa chỉ giao hàng** | Lô → tab Vận chuyển |
| 6 | Mở **Kiểm tra trước khi xuất**, xử lý các mục chặn và mục cần đối chiếu | Lô → tab Kiểm tra trước khi xuất |
| 7 | Nhập thông số biên bản, **tải biểu mẫu** (từng file hoặc ZIP) | Lô → tab Xuất hồ sơ |
| 8 | **Sao lưu** lô hoặc toàn bộ dữ liệu | Sao lưu lô rừng / ⋯ Thêm → Sao lưu |

Mỗi lô có tổ khai thác, xe, hợp đồng, giá, giấy tờ và địa chỉ giao riêng; chủ rừng chỉ giữ thông tin chung (họ tên, CCCD, địa chỉ).

## 3. Chủ rừng và lô rừng
- **Chủ rừng**: mã, họ tên, danh xưng (Ông/Bà), CCCD (12 số), ngày và nơi cấp, địa chỉ thường trú, **số điện thoại** (tùy chọn; in ở khối bên chủ rừng của hợp đồng nếu có), **số hợp đồng** và **ngày ký hợp đồng** (hai ô này tùy chọn; ngày ký phải là ngày có thật). Phần mềm **không còn hỏi ngày sinh chủ rừng** (hồ sơ cũ đã có ngày sinh vẫn giữ trong dữ liệu nhưng không in). Số hợp đồng và ngày ký in ở dòng “Căn cứ Hợp đồng số … ký ngày …” của BM-01 và BM-04 và ở BM-17; **ngày ký hợp đồng là ngày ký mặc định** của các biểu mẫu nếu ô “Ngày ký hợp đồng” ở tab Xuất hồ sơ để trống. Khi lấy chủ rừng từ **Tra cứu Google Sheets**, số hợp đồng, ngày ký và số điện thoại lấy từ cột “Mã hợp đồng”, “Ngày ký hợp đồng” và “SĐT” của tab HoSoRung_QC.
- **Lô rừng** (tab Thông tin rừng): mã lô, tên, địa điểm khai thác, tọa độ WGS84 (vĩ độ và kinh độ nhập cùng nhau), diện tích, định mức tấn/ha, khối lượng thực tế, cự ly vận chuyển, thời gian khai thác, **giấy tờ pháp lý đất/rừng**.
  - **Sản lượng dự kiến** là ô tự tính = diện tích × định mức, **tự nhảy ngay khi bạn gõ** diện tích và định mức (không cần bấm Lưu). Khối lượng khai thác thực tế để trống thì phần mềm dùng sản lượng dự kiến.
  - **Cự ly vận chuyển (km)** là quãng đường từ rừng đến nơi giao gỗ (nhà máy). Ô này chỉ cần khi tính cước **tấn/km** (tiền cước = đơn giá × cự ly); cước cố định thì bỏ trống được. **Chỉ nhập ở một chỗ này**; tab Vận chuyển chỉ hiển thị lại số km và có nút mở nhanh tab Thông tin rừng.
- **Mã lô là duy nhất trên toàn máy**, so sánh không phân biệt hoa thường và bỏ khoảng trắng đầu/cuối. Mã trùng bị từ chối và phần mềm nêu lô đang dùng mã đó.
- **Đổi mã lô**: các dòng nhân công, xe, phiếu cân mang mã cũ được **đổi theo mã mới** để dữ liệu vẫn thuộc đúng lô; dòng mang một mã khác được báo, không tự đổi.
- Thanh **Tiến độ hồ sơ · checklist FSC** ở đầu lô cho biết % hoàn thành và từng mục còn thiếu.

## 3e. Nhập, sửa, lưu nhân công, xe và phiếu cân
Luồng thống nhất cho ba cách nhập (thêm tay, nạp Excel, đưa từ Tra cứu Google Sheets): **Nhập → Xem trước và chỉnh sửa → Lưu dữ liệu vào lô → Tạo, xuất, in hồ sơ**.
1. **Nhập**: nút **+ Thêm nhân công / + Thêm xe / + Thêm phiếu cân** ở đúng tab (Nhân công, Vận chuyển); hoặc **Tải file mẫu** rồi nạp Excel; hoặc Tra cứu Google Sheets → chọn dữ liệu → đưa vào lô. Thanh phía trên bảng ghi **chủ rừng, mã lô** và **nguồn** của lượt nhập.
2. **Xem trước (Chưa lưu)**: mọi nguồn chỉ đổi **bản nháp**, không đổi dữ liệu đã lưu và không đổi lô khác. Mỗi dòng có trạng thái **Thêm mới**, **Sửa** (rê chuột để xem giá trị cũ → mới), **Sẽ xóa**, **Đã lưu**. Nạp Excel theo khóa nghiệp vụ (nhân công: CCCD hoặc họ tên; xe: biển số đã chuẩn hóa; phiếu: số phiếu); bản ghi đã lưu mà file không có vẫn được giữ; nạp lại cùng file không tính trùng. File mang mã lô khác lô đang mở báo lỗi, không tự chuyển lô.
3. **Sửa, xóa**: **Sửa** mở hộp thoại; **Bỏ dòng** chỉ bỏ dòng mới khỏi lượt nhập; **Xóa đã lưu** xóa bản ghi đã lưu khi bấm Lưu (có hỏi, có **Hoàn tác**).
4. **Phiếu cân và xe**: ô **Xe** chỉ chọn xe của lô; chưa có xe thì chọn **+ Thêm xe mới…** ngay trong phiếu (thông tin đã nhập được giữ) hoặc bấm nút **+ Thêm xe …** ở thanh nhắc biển còn thiếu. Sửa biển số xe có phiếu liên kết: hộp xác nhận liệt kê các phiếu; số chuyến, khối lượng, tiền không đổi. Xóa xe còn phiếu liên kết bị chặn (nêu số phiếu).
5. **Lưu dữ liệu vào lô**: kiểm tra lại lô đích, quan hệ xe–phiếu và lỗi dữ liệu rồi ghi một lần vào SQLite. Còn lỗi thì không ghi và nêu từng lỗi; lưu thất bại thì dữ liệu đã lưu và bản nháp đều giữ nguyên để thử lại. Phiếu trùng số với lô khác cần xác nhận đối chiếu. Chưa khai đơn giá chức danh không chặn lưu nhưng vẫn chặn xuất hồ sơ.
6. **Tạo, xuất, in hồ sơ** chỉ dùng dữ liệu đã lưu: còn bản nháp thì mọi nút tải, xuất, in (kể cả Tải toàn bộ, in đợt 2, in phiếu cân) bị khóa, nêu lý do và có nút quay lại mục đang chỉnh. Sau khi lưu, số chuyến, tổng tấn, tiền công và cước được tính lại từ dữ liệu đã lưu.
7. **Chuyển lô, đổi chủ rừng, đóng ứng dụng** khi còn bản nháp: hỏi **Lưu và tiếp tục**, **Bỏ thay đổi** hoặc **Quay lại chỉnh sửa**. Sao lưu lô rừng chỉ gồm dữ liệu đã lưu (có nhắc nếu còn bản nháp). Mọi bước hoạt động khi không có mạng.

**Gộp dữ liệu khi nạp Excel hoặc Google Sheets vào bản nháp** (cùng một quy tắc cho hai nguồn, áp dụng cho nhân công, xe, phiếu cân):
- **Ô nguồn trống hoặc cột vắng mặt thì giữ giá trị đang có**, không bao giờ xóa trường qua nhập file. Muốn xóa một trường được phép để trống, bấm **Sửa** và xóa trong hộp thoại rồi lưu.
- **Giá trị 0** là giá trị thật nếu trường cho phép (Cân lần 1/2, Khối lượng kg). Khối lượng tấn và tiền phải lớn hơn 0: giá trị 0 hoặc **sai định dạng** không được áp dụng, giữ giá trị cũ và báo rõ **dòng của file và cột**; chưa sửa thì chưa lưu được.
- **Giá trị bạn đã sửa tay trong bản nháp** không bị file ghi đè.
- Bảng **Chi tiết lần nạp gần nhất** hiện giá trị hiện có, giá trị mới, nguồn và kết quả từng trường (đổi, giữ vì ô nguồn trống, giữ vì sửa tay, lỗi). Bản ghi đã lưu mà file không có vẫn được giữ.
- **Phiếu cân cùng số nhưng khác ngày cân, biển số, nơi cân hoặc khối lượng** vào mục **Cần đối chiếu**: hai bản ghi hiện cạnh nhau, phiếu cũ giữ nguyên và chưa lưu được cho đến khi bạn chọn **Giữ bản hiện có**, **Cập nhật phiếu (đã xác nhận cùng chuyến)**, **Là chuyến khác** (bắt buộc nhập số phiếu mới chưa dùng) hoặc **Bỏ dòng nguồn**. Có nhiều phiếu cùng số thì chọn đúng bản cần cập nhật. Nạp lại phiếu giống hệt thì được nhận là đã có.
- **Đổi biển số từ Google Sheets**: các phiếu bạn đã chọn được coi là đúng chuyến, chỉ đổi biển số (giữ ngày, khối lượng, nơi giao, tiền, số chuyến); nhật ký đổi biển ghi sau khi lưu.
- **Lô đích được chốt lúc chọn file** (hoặc lúc bấm Điền vào rừng này): chuyển sang lô khác trong lúc đọc file thì dữ liệu vẫn vào bản nháp của lô đã chọn, màn hình giữ nguyên và có thông báo; lô bị xóa hoặc dữ liệu vừa khôi phục thì dừng, không ghi gì.

**Tiền và khối lượng**: ô tiền đọc chặt chẽ: số thật, 1250000, 1250,5, 1.250.000, 1.250.000,5, 1,250,000, kèm đ/vnđ/đồng; **từ chối** số âm, ký hiệu mũ (1e6), chữ lẫn số, dấu liền nhau và định dạng mơ hồ như 1.250 (có thể là 1.250 hoặc 1 250). Ô trống, số 0 và lỗi được phân biệt; lỗi nêu số phiếu, dòng, giá trị gốc, và khi cập nhật lỗi thì giữ giá trị đã lưu. Khối lượng một phiếu làm tròn đến kg (3 số lẻ tấn) ở mọi nơi nên Tổng quan, báo cáo và biểu mẫu cộng ra cùng một số.

## 3a. Màn hình Tổng quan
- **Chỉ số**: số chủ rừng, số rừng, tổng diện tích, **sản lượng dự kiến** (diện tích × định mức), khối lượng đã cân và **tỷ lệ đã cân so với dự kiến**, số chuyến, số lao động, số xe, tiến độ hồ sơ trung bình.
- **Hồ sơ cần hoàn thiện** và **Phiếu cân gần đây**: bấm một rừng để mở thẳng hồ sơ rừng đó.
- **Cần chú ý ở các rừng**: gom theo rừng các việc cần xử lý: lao động dưới 18 tuổi, phiếu cân sai ngày, xe hết hạn hoặc sắp hết hạn giấy tờ (trong 30 ngày), rừng chưa có tọa độ, chưa chọn địa chỉ giao hàng, chưa có phiếu cân. Bấm tên rừng để mở.
- **Sản lượng theo tháng**: khối lượng phiếu cân 6 tháng gần nhất.
- **Hệ thống**: bản tra cứu đang dùng (nguồn, thời điểm nạp, số dòng), lần sao lưu toàn bộ gần nhất (nhắc khi đến hạn), và lối tắt: Tra cứu Google Sheets, **Báo cáo đối chiếu** (dùng được khi đã có bản tra cứu), Sao lưu toàn bộ, Cài đặt.

## 3b. In phiếu cân (giấy lỗ 240 × 279 mm)
In phiếu cân **theo rừng**, giống xuất hồ sơ: vào lô → tab **Xuất hồ sơ** → thẻ **In phiếu cân** → bấm **In phiếu cân**.
- **Dùng nguyên bản công cụ PhieuCan**: file `renderer/PhieuCan.html` giữ nguyên từng byte (bố cục tính theo mm, giấy lỗ 240 × 279 mm, đường xé giữa, chỉnh lề, 2 phiếu hoặc 2 liên một trang, tải PDF). Phần mềm không vẽ lại phiếu nên bản in giống hệt công cụ gốc. Công cụ mở trong cửa sổ riêng, đã có sẵn phiếu cân của rừng; phần chọn file Excel, thông tin công ty bị ẩn vì dữ liệu đã có trong phần mềm.
- **Một nguồn dữ liệu cho mọi cách đưa phiếu cân vào rừng**: nhập file phiếu cân ở tab Vận chuyển, đưa từ **Tra cứu Google Sheets** sang rừng, hay **cập nhật biển số xe**, đều ghi cùng các trường (số phiếu, ngày và giờ cân 1/2, biển số, cân lần 1/2, khối lượng kg, khách hàng, đơn giá, thành tiền). Thẻ In phiếu cân đọc đúng các trường đó nên không cần file Excel riêng.
- **Báo phiếu còn thiếu**: thẻ cho biết bao nhiêu phiếu đủ thông tin và còn thiếu gì (ví dụ cân lần 1, giờ cân, khách hàng). Phiếu thiếu vẫn in được, phần thiếu để trống. Bổ sung bằng Tra cứu Google Sheets (chọn các phiếu đã có để cập nhật) hoặc nhập lại file phiếu cân của rừng.
- **Tiêu đề phiếu** (tên công ty, địa chỉ, điện thoại, fax, nơi lập) lấy từ **Cài đặt → Công ty**; có thêm hai ô **Fax** và **Nơi lập chứng từ** (ví dụ Đà Nẵng). Chưa khai công ty thì công cụ dùng tiêu đề mặc định; Fax trống thì không in FAX; Nơi lập trống thì giữ giá trị của công cụ. Khách hàng trống thì lấy tên chủ rừng; địa chỉ rừng lấy từ hồ sơ rừng.
- **Một file mẫu Excel đầy đủ trường cho phiếu cân**: nút “Tải file mẫu” ở tab Vận chuyển cho file có đủ cột để in phiếu cân, **cùng tên cột với file mẫu của công cụ PhieuCan**: Số phiếu, Ngày cân 1, Giờ cân 1, Ngày cân 2, Giờ cân 2, Biển số 1, Cân 1, Cân 2, KL, Nguồn gốc, Khách hàng, Địa chỉ, ĐG_AD, So_CT, Đơn giá_TC, Trạng thái, Thành tiền (thêm Khối lượng (tấn), Nơi giao, Ghi chú). Cùng một dữ liệu phục vụ **Vận chuyển** (khối lượng, tiền cước, BM-09, BM-10, báo cáo) và **in phiếu cân**. KL để trống thì tự tính = Cân 1 − Cân 2; Trạng thái khác OK (ví dụ HỦY) thì phiếu không được chọn sẵn khi in. Nạp được cả file mẫu của chính công cụ PhieuCan (tiêu đề ở dòng 4) và file mẫu phiếu cân bản cũ (tên cột cũ như “Biển kiểm soát”, “Số phiếu cân”).
- **Đưa phiếu cân từ Google Sheets**: Tra cứu mang theo đủ trường (giờ cân, cân 1/2, KL, khách hàng, địa chỉ rừng, nguồn gốc, đơn giá, thành tiền). Xe đã đổi thì sửa biển số ngay trong bảng xem trước (ô Biển số của từng phiếu, có gợi ý biển trong đội xe) rồi đưa qua; hoặc đưa qua luôn rồi cập nhật biển số sau. Hai cách cho cùng một dữ liệu.
- **Đơn giá và thành tiền** in trên phiếu lấy từ chính phiếu cân: phiếu **đưa từ Google Sheets** mang sẵn cột “Đơn giá” và “Thanh toán” (thành tiền); phiếu **nhập file** dùng cột **ĐG_AD** (hoặc Đơn giá_TC) và **Thành tiền**, đọc cả số dạng chữ như 1.250.000. Đơn giá dưới 100.000 được hiểu là đồng/kg. Thiếu thành tiền mà có đơn giá thì công cụ tự tính = khối lượng × đơn giá, làm tròn xuống nghìn đồng; thiếu đơn giá thì in 0. Bảng phiếu cân ở tab Vận chuyển hiện hai cột giá.
- Trong công cụ: chọn phiếu, chỉnh **Khổ giấy** (mặc định giấy lỗ 240 × 279 mm), cách xếp, dịch lề, rồi **Tải PDF PhieuCan** hoặc **In / Lưu PDF bằng trình duyệt**; “Lưu cài đặt trên máy này” để nhớ lề đã canh.
- Kiểm thử tự động xác nhận file công cụ không đổi (SHA-256 trong `tests/phieucan.sha256`) và PDF ra đúng 240 × 279 mm. In ra giấy thật phải bạn tự kiểm tra trên máy in của mình.

## 3c. Đổi biển số xe của phiếu cân
Hai thời điểm sửa, cùng một kết quả.

**Cách 1 – đổi biển rồi mới đưa qua rừng (phiếu từ Google Sheets):**
1. Mở rừng cần nhận phiếu (hoặc chọn **Xem trước để tạo rừng mới**). **Tra cứu Google Sheets** → tab **HoSoKeo (phiếu cân)** → gõ số phiếu, CCCD hoặc tên chủ rừng → **Tìm** → **Chọn**.
2. Bấm **Điền vào rừng đang mở**. Bảng **Phiếu cân** hiện từng phiếu với ô **Biển số** sửa được (gợi ý biển trong đội xe của rừng).
2b. **Đổi hàng loạt**: khung **Đổi biển số hàng loạt** phía trên bảng. Chọn nhóm (**Các phiếu đang tích** hoặc **Mọi phiếu đang ghi biển X**), gõ **biển số mới** một lần, bấm **Áp dụng**; biển mới hiện ở cột Biển số của từng dòng và vẫn sửa riêng được. **Trả lại biển gốc cho nhóm này** để hoàn lại.
3. Gõ biển đúng vào ô của phiếu cần đổi (tự viết hoa, hiện nhãn *đã đổi từ …*). Phiếu ghi bằng tên xe thì dùng khung **Ghép tên xe với biển số** (lưu một lần). Xóa nội dung ô để trả lại biển gốc.
4. **Chọn mọi phiếu ghi được** (hoặc tích từng phiếu) → **Lưu vào hồ sơ**. Phiếu vào rừng mang biển đã đổi cùng đủ giờ cân, cân 1/2, khối lượng, khách hàng, địa chỉ, đơn giá, thành tiền.

**Cách 2 – đã đưa qua rồi mới đổi xe (cùng một màn hình, không có nút riêng):**
1. Khi bảng tính tra cứu đã có biển mới: mở rừng → **Tra cứu Google Sheets** → tab HoSoKeo → tìm số phiếu → **Chọn** → **Điền vào rừng đang mở**.
2. Trong bảng **Phiếu cân**, phiếu đã có trong hồ sơ mà biển khác được **tích sẵn**, dòng ghi “Biển số khác: biển cũ → biển mới”. Khung **Biển số xe khác với hồ sơ** tóm tắt các phiếu này. Sửa biển ở ô **Biển số** của dòng nếu cần, bỏ tích phiếu không muốn đổi.
3. Giữ tích **Chỉ đổi biển số** (mặc định): ngày, khối lượng, nơi giao, tiền và các trường in giữ nguyên; bỏ tích thì phiếu được cập nhật theo toàn bộ bảng tính (phiếu khác ngày, khối lượng hoặc biển sẽ vào mục **Cần đối chiếu**).
4. Bấm **Lưu vào hồ sơ**: phiếu vào **bản nháp tab Vận chuyển**; kiểm tra rồi bấm **Lưu dữ liệu vào lô**. Việc đổi được ghi lại.

**Đổi tay:** tab **Vận chuyển** → **Sửa** ở xe → đổi **Biển kiểm soát** thì mọi phiếu của xe đó đổi theo (một lượt); hoặc **Sửa** một phiếu để đổi riêng biển của phiếu đó.

Xem lại các phiếu đã đổi: **Báo cáo → Phiếu cân đã cập nhật biển số xe**. Biển mới phải có trong đội xe của rừng, nếu chưa có thì thêm xe ở tab Vận chuyển.

## 3d. Các bước in phiếu cân
1. Bảo đảm rừng đã có phiếu cân (nạp file Excel mẫu đầy đủ trường ở tab Vận chuyển, hoặc đưa từ Tra cứu Google Sheets, xem 3c). Khai **Cài đặt → Công ty** đủ tên, địa chỉ, điện thoại, Fax, Nơi lập chứng từ vì tiêu đề phiếu lấy từ đó.
2. Tab **Xuất hồ sơ** → thẻ **In phiếu cân**: xem số phiếu và còn thiếu gì (cân, giờ, khách hàng, đơn giá…). Phiếu thiếu vẫn in được, phần thiếu để trống.
3. Bấm **In phiếu cân**: cửa sổ công cụ PhieuCan mở, đã nạp sẵn phiếu của rừng; phiếu Trạng thái khác OK (ví dụ HỦY) không được chọn sẵn.
4. Chọn phiếu (ô tìm, **Chọn tất cả**, **Bỏ chọn**), xem trước đúng bố cục sẽ in.
5. Mở **Tuỳ chọn in** khi cần: **Khổ giấy** (mặc định giấy lỗ 240 × 279 mm), cách xếp (2 phiếu khác số một trang, 1 phiếu in 2 liên, 1 phiếu), dịch lề toàn phiếu hoặc riêng liên dưới theo mm, tên người cân, ghi chú. **Lưu cài đặt trên máy này** để lần sau giữ lề đã canh.
6. **In / Lưu PDF bằng trình duyệt** để in ra máy in, hoặc **Tải PDF PhieuCan** để lấy file PDF đúng khổ giấy.

Khi in: chọn đúng khổ giấy lỗ, tỉ lệ 100% (không “vừa trang”), không thêm lề; in thử một trang trước. Giá mua và thành tiền lấy từ phiếu cân (đơn giá dưới 100.000 hiểu là đồng/kg); thiếu đơn giá thì in 0.

## 4. Nhân công, hợp đồng và đơn giá
Vào lô → tab **Nhân công** → mục **Thông số hợp đồng và đơn giá**:
1. **Hình thức hợp đồng**
   - **Giao khoán**: chủ rừng ký hợp đồng khoán (BM-01) với **Tổ trưởng**; các công nhân ký **một Giấy ủy quyền (BM-20)** cho Tổ trưởng. Tính theo **tấn, ha hoặc ngày công**. Khi chọn **ngày công**, Tổ trưởng nhận thay cả tổ tổng tiền rồi chi trả lại từng người theo cột “Thực nhận” của BM-08.
   - **Trực tiếp**: chủ rừng ký hợp đồng lao động (BM-03) với **mọi nhân công**. Tính theo **tấn hoặc ngày công**.
2. **Đơn giá theo từng chức danh** (Tổ trưởng, Công nhân khai thác, Công nhân cưa): ô đơn giá hiện theo cơ sở tính đã chọn (đồng/tấn, đồng/ha, đồng/công). Thiếu đơn giá của chức danh nào thì dòng nhân công đó báo lỗi.
3. **Sản lượng chia đều**: tấn (hoặc ha, hoặc số công) chia đều cho **mọi người trong tổ, kể cả Tổ trưởng**; tiền mỗi người = phần chia × đơn giá chức danh của người đó.
4. **Ngày bắt đầu** dùng cho hợp đồng, chấm công và kiểm tra **đủ 18 tuổi**. Người dưới 18 tuổi bị cảnh báo và **không xuất được Giấy ủy quyền**.
5. **Chấm công thực tế** (chỉ khi cơ sở tính là **ngày công**, cả giao khoán lẫn trực tiếp): thẻ **Chấm công thực tế** ngay dưới thông số ở tab Nhân công. Chọn tháng, nhập số công từng ngày cho từng người (**1** đủ công, **0,5** nửa công, **0** hoặc trống là nghỉ; tối đa 3 mỗi ngày), hoặc bấm **Điền đủ công (trừ Chủ nhật)** rồi sửa các ngày nghỉ. Tổng tháng và cả đợt hiện ngay. Quy tắc: **chưa chấm công** thì BM-08 tính mọi người bằng số công theo thời gian khai thác (trừ Chủ nhật); **đã chấm công** thì BM-08 dùng tổng công của từng người (người chưa chấm là 0 công). Hợp đồng (BM-01, BM-03, BM-20) luôn dùng số công dự tính nên không đổi khi chấm công. Nút **In bảng chấm công đã nhập** tải BM-05 của tháng đang chọn có sẵn số công; BM-05 trong các gói hồ sơ vẫn là mẫu trống để chấm tay.
6. **Định mức BHLĐ** theo chức danh (nút **Định mức BHLĐ** ở cột bên trái) dùng cho sổ cấp phát.
6. Nạp danh sách người bằng file Excel mẫu (xem mục 6). Mỗi lô cần **đúng một Tổ trưởng**.

## 5. Vận chuyển: xe, phiếu cân, cước, địa chỉ giao
Vào lô → tab **Vận chuyển**. Thứ tự nên làm: chọn cách tính cước → nạp xe → nạp phiếu cân → chọn địa chỉ giao.

**Cước vận chuyển – chọn một trong hai cách**
1. **Đơn giá cố định** (đồng/tấn): một giá, không phụ thuộc cự ly.
2. **Đơn giá tấn/km** (đồng/tấn/km): đơn giá × cự ly của lô. **Nhập số km ở tab Thông tin rừng, ô “Cự ly vận chuyển (km)”** (chỉ nhập ở một chỗ; tab Vận chuyển chỉ hiện lại số km và có nút mở nhanh tab Thông tin rừng). Thiếu cự ly thì báo thiếu.
Tiền vận chuyển tính theo **tấn giao tại nhà máy** (theo phiếu cân), cho từng xe. Hồ sơ cũ còn chọn “theo bậc cự ly” (cách đã bỏ) bị báo phải chọn lại; dữ liệu các bậc vẫn được giữ.

**Đội xe**: nạp bằng Excel. Cột **Người ký HĐ vận chuyển** chọn “Chủ xe” hoặc “Tài xế”; chỉ người ký mới phải có đủ CCCD, ngày cấp, thường trú và SĐT. Giấy tờ (GPLX, bảo hiểm, kiểm định) quá hạn hoặc còn dưới 30 ngày thì **cảnh báo**, không chặn xuất.

**Phiếu cân**: nạp bằng Excel, **mỗi chuyến một dòng**. Nạp **đội xe trước**, vì phiếu cân chỉ nhận biển số có trong danh sách xe (so khớp bỏ dấu chấm, gạch, khoảng trắng). Phiếu **trùng số** vẫn được cộng vào tổng nhưng bị đánh dấu để kiểm tra.

**Công ty mua hàng và địa chỉ giao** (tên công ty cũng tự điền vào dòng “Kính gửi” của BM-11 cam kết nguồn gốc: ưu tiên ô “Cam kết: đơn vị nhận” nếu có nhập, rồi công ty đã chốt cho lô, rồi hồ sơ Công ty mua hàng)
- Phần mềm dùng cho **một công ty**: khai **một hồ sơ** ở **Cài đặt → Công ty** (menu ngang trên cùng) (tên pháp lý và địa chỉ bắt buộc; MST, người đại diện, chức vụ, SĐT, email; có thể thêm nhiều **địa chỉ giao hàng** như kho, nhà máy).
- Ở tab Vận chuyển của từng lô: **Chọn địa chỉ giao hàng** → chọn một địa chỉ → xem bảng so sánh “hiện tại / mới” → **Xác nhận**. Địa chỉ được lưu cùng hồ sơ lô và tự điền vào “Địa điểm vận chuyển đến”; dùng ở **BM-04, BM-09, BM-10 và Sổ phiếu cân**.
- Sửa tên hoặc địa chỉ trong hồ sơ công ty **không tự đổi** các lô đã chọn: lô giữ địa chỉ đã lưu và hiện thông báo, bấm **Xem và cập nhật** để áp dụng.
- Hồ sơ cũ nhập tay điểm đến vẫn giữ nguyên; lần đầu chọn địa chỉ sẽ thấy giá trị cũ cạnh địa chỉ đề xuất.
- “Nơi giao” ghi trên từng phiếu cân là **dữ liệu nguồn, giữ nguyên**; nếu khác địa chỉ giao đã chốt thì có cảnh báo để đối chiếu.
- Đổi điểm đến **không tự sửa cự ly hay đơn giá**; với cước tấn/km, phần mềm nhắc kiểm tra lại cự ly.

## 6. File Excel mẫu và cách điền
Ở mỗi ô nạp dữ liệu (nhân công, xe, phiếu cân) có nút **Tải file mẫu (có hướng dẫn)**. Mỗi file mẫu có **3 trang tính**:

| Trang | Dùng để |
| --- | --- |
| **HUONG_DAN** | Mục đích mẫu, các bước thực hiện, **mô tả từng cột** (bắt buộc, định dạng, ví dụ, lưu ý), phần mềm kiểm tra gì, lỗi thường gặp và cách sửa |
| **NHAN_CONG / DOI_XE / PHIEU_CAN** | **Trang cần điền.** Dòng 1 là tiêu đề, điền từ dòng 2. Phần mềm chỉ đọc trang này |
| **VI_DU** | Dữ liệu giả để tham khảo cách điền; phần mềm không đọc trang này |

Trong trang dữ liệu: tiêu đề **màu đỏ sẫm = cột bắt buộc**, màu xanh = tùy chọn hoặc có điều kiện; dòng tiêu đề cố định khi cuộn và có bộ lọc; các cột có **mũi tên chọn** (Vai trò, Danh xưng, Chức danh, Người ký) chỉ nhận giá trị trong danh sách; **bấm vào một ô sẽ hiện gợi ý** cho cột đó; cột đã định dạng văn bản nên **CCCD giữ nguyên số 0 đầu**.

**Quy tắc chung khi điền**
- Không sửa, xóa, đổi tên hoặc đổi thứ tự **dòng tiêu đề**; không đổi tên trang tính dữ liệu, không thêm cột, không gộp ô, không để dòng trống giữa dữ liệu.
- Ngày nhập dạng **dd/mm/yyyy** và phải là **ngày có thật** (31/02 là sai, 29/02/2028 hợp lệ).
- **Không cần điền Mã rừng**: file mẫu không có cột này, dữ liệu luôn được nạp vào lô đang mở và mỗi bản ghi tự mang mã lô đó. File cũ còn cột “Mã rừng” vẫn nạp được: để trống thì tự lấy mã lô đang mở; điền thì phải đúng lô (để chặn nạp nhầm file của lô khác).
- Khối lượng phiếu cân tính bằng **tấn**, dùng dấu phẩy hoặc dấu chấm thập phân.
- Sau khi nạp, phần mềm báo số dòng hợp lệ, dòng lỗi (kèm số dòng) và hỏi trước khi ghi. Dữ liệu nạp từ file chỉ vào **bản nháp “Chưa lưu”** (xem mục 3e): dòng mới được thêm, dòng đã có được cập nhật, bản ghi đã lưu mà file không có vẫn được **giữ**.
- File thật chứa thông tin cá nhân (họ tên, CCCD, địa chỉ): chỉ lưu và gửi nội bộ.

**Lỗi thường gặp khi nạp**
| Thông báo | Cách sửa |
| --- | --- |
| File thiếu cột … | Dùng đúng file mẫu, không sửa dòng tiêu đề |
| Mã rừng "…" khác lô đang mở | Chỉ gặp ở file cũ còn cột Mã rừng: xóa cột đó hoặc để trống ô Mã rừng |
| CCCD phải đủ 12 chữ số | Nhập lại đủ 12 số, giữ số 0 đầu |
| Cần đúng 1 tổ trưởng | Chỉ một dòng có Vai trò “Tổ trưởng” |
| Biển … chưa có trong danh sách xe | Thêm xe vào file đội xe, nạp lại xe rồi nạp phiếu cân |
| Ngày … không có thật | Sửa ngày đúng dd/mm/yyyy (ví dụ 28/02/2026) |
| Số phiếu cân … trùng | Kiểm tra phiếu nhập hai lần |

## 7. Tra cứu Google Sheets
Nút **Tra cứu Google Sheets** (hoặc **Lấy dữ liệu từ Google Sheets** trong Thông tin rừng).

**Lấy bản tra cứu**
- **Đồng bộ ngay**: tải bảng tính theo liên kết đã lưu, chỉ đọc. Bảng tính để chế độ “Ai có liên kết đều xem được” thì không cần đăng nhập; nếu giới hạn quyền xem, bấm **Đăng nhập Google (chỉ đọc)** bằng tài khoản được chia sẻ (cách cấu hình: `docs/GOOGLE_OAUTH.md`).
- **Nhập bản Excel**: chọn file Excel có ba tab chuẩn (ví dụ `HoSoKeo_QC.xlsx` đang dùng) khi **không có mạng**. Bấm **Tải file mẫu (3 tab chuẩn)** để lấy file mẫu có sẵn tiêu đề.
- **Ba tên tab chuẩn**: `HoSoKeo` (phiếu cân, khối lượng), `HoSoRung` (chủ rừng, thông tin rừng, hợp đồng), `ToaDoRung` (mã rừng, tọa độ, diện tích, giấy tờ nguồn gốc). **File đang dùng hậu tố `_QC` (`HoSoKeo_QC`, `HoSoRung_QC`, `ToaDoRung_QC`) vẫn đọc và đồng bộ được, không cần đổi tên.** Tên không phân biệt chữ hoa/thường, dấu, khoảng trắng đầu/cuối (ví dụ `HOsokeo` = `HoSoKeo`).
- Phần mềm nhận cột theo **tiêu đề dòng 1**: được **đổi thứ tự cột** và **thêm cột**; thiếu cột bắt buộc thì báo **tên tab và tên cột** cần bổ sung (kể cả khi tên tab đúng chuẩn).
- **Chọn tab khác tên**: tab đặt tên khác hẳn nhưng đủ cột bắt buộc được **đề xuất để bạn xác nhận** (hộp “Cần xác nhận tên tab trước khi nạp”). Có nhiều tab phù hợp — kể cả khi trong bảng có cả tên mới lẫn tên `_QC` — thì bạn **chọn trong danh sách**. Phần mềm kiểm tra lại các cột bắt buộc rồi mới nạp. Bản tra cứu đang dùng **không bị thay đổi** cho đến khi cả ba vai trò đã xác định và đọc đúng; bấm *Hủy* để giữ bản cũ.
- **Ghi nhớ**: lựa chọn được nhớ theo **ID bảng tính Google** (hoặc tên file Excel), nên lần đồng bộ sau không hỏi lại. Luồng hiện tại tải bảng tính dạng XLSX nên không có mã riêng của từng tab: nếu bạn đổi tên tab sau khi đã chọn, phần mềm nhận diện lại theo cấu trúc cột và hỏi xác nhận (hoặc tự nhận nếu trả lại tên chuẩn).
- **Mỗi tab chỉ giữ một vai trò**: nếu cùng một tab bị gán cho hai vai trò (lựa chọn mới hoặc ánh xạ đã nhớ), phần mềm **không nạp**, nêu rõ “Tab “X” đang được gán cho cả “HoSoKeo” và “HoSoRung””, và cho chọn lại; bản tra cứu gần nhất và thời điểm cập nhật thành công được giữ nguyên.
- **Cột khối lượng của HoSoKeo**: chỉ cần **một trong hai** cột “KL hàng (KG)” hoặc “Khối lượng (Tấn)”. Chỉ có KG thì chia 1000 ra tấn; có cả hai mà lệch nhau thì phần mềm báo **số phiếu cân và cả hai giá trị** (đang dùng cột Tấn). Thiếu cả hai cột: báo lỗi riêng ở cấp tab; dòng không có khối lượng hợp lệ: báo riêng theo số phiếu. Tên ba tab chuẩn, hậu tố `_QC` và ánh xạ tab đặt tên khác vẫn như trước.
- Đồng bộ lỗi (mất mạng, thiếu cột, bảng yêu cầu đăng nhập…): phần mềm **giữ bản tra cứu gần nhất** cùng thời điểm cập nhật thành công và nêu lỗi. Phần mềm chỉ **đọc** Google Sheets.

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

**Hồ sơ đã đủ dữ liệu thì in một lần**: nút **Tải toàn bộ hồ sơ** (hoặc tải từng biểu mẫu) vẫn dùng bình thường, không bắt buộc làm hai đợt. Hai đợt chỉ dành cho lúc chưa xong khai thác. **Cảnh báo theo từng trường hợp**: nút tải bị khóa kèm lý do khi còn mục chặn (xem tab Kiểm tra trước khi xuất); sau khi tải, phần mềm nêu các mục chưa đủ: chưa có phiếu cân hợp lệ (BM-09 và BM-10 không có trong file), chưa nhập khối lượng thực tế (BM-08 và BM-14 tính theo sản lượng dự kiến), chưa nhập ngày lập nghiệm thu hay xác nhận khối lượng (ngày và năm trong số biên bản để trống), chưa chọn địa chỉ giao hàng (dòng điểm đến để chấm), chưa có ngày ký hợp đồng (số hợp đồng thiếu năm). Hồ sơ đủ thì báo “dữ liệu đủ, không có lưu ý”.

**Kiểm tra mâu thuẫn khi nhập liệu**: màn Kiểm tra trước khi xuất còn so các ngày nhập ở nhiều ô. Ngày không có thật hoặc khoảng ngày bị đảo (từ ngày sau đến ngày) là mục chặn; ngày ký hợp đồng ghi khác nhau ở Thông tin chủ rừng và tab Xuất hồ sơ (biểu mẫu dùng ô ở tab Xuất hồ sơ), ngày lập biên bản trước ngày ký hoặc trước khi khai thác xong, phiếu cân nằm ngoài thời gian khai thác (gộp một dòng), số hợp đồng có năm khác ngày là mục cần đối chiếu.

**In hồ sơ làm hai đợt khi chưa xong khai thác** (đã có nhân công, vận chuyển nhưng chưa có phiếu cân, chưa nghiệm thu): ở tab **Xuất hồ sơ → Tất cả** có hai nút.
- **Đợt 1 – hồ sơ làm ngay (.zip)**: tất cả biểu mẫu **trừ** BM-08 bảng thanh toán tiền công, BM-09 xác nhận khối lượng, BM-10 thanh toán tiền vận chuyển và BM-14 nghiệm thu, thanh lý. In và ký đợt này trước.
- **Đợt 2 – sau khi xong rừng (.zip)**: **chỉ** BM-08, BM-09, BM-10 và BM-14. Khi rừng xong: nạp phiếu cân ở tab Vận chuyển, nhập khối lượng khai thác thực tế ở Thông tin rừng, nhập thông số nghiệm thu rồi tải đợt 2. Chưa đủ phiếu cân hợp lệ thì đợt 2 chỉ có BM-08 và BM-14, phần mềm báo rõ thiếu BM-09, BM-10; nạp phiếu cân xong tải lại.
**In hồ sơ đợt 2 (BM-08, BM-09, BM-10, BM-14)**: mục **In hồ sơ đợt 2** ở tab **Xuất hồ sơ** gom hai cách in vào một chỗ. Ba nút việc cần làm (Cách A, Cách B bước 1, bước 2) nằm ở đầu mục, kèm một dòng tóm tắt khi cả bộ cùng tình trạng. Bảng bên dưới cho từng biểu mẫu (BM-09 và BM-10 theo **từng người vận chuyển**) biết: *đủ dữ liệu để in* hay chưa, *đã in mẫu nền* hay chưa, **nên dùng giấy nào**, và còn thiếu gì (có nút mở đúng tab để bổ sung). Mỗi dòng chỉ hiện nút hợp với tình trạng; các nút ít dùng (Tải nền, Đã in nền, Đã có nền in từ trước, Bỏ xác nhận…) nằm trong menu **Khác**. BM-09 và BM-10 của nhiều người vận chuyển được phân biệt bằng biển số xe và 4 số cuối CCCD. Hai trạng thái này độc lập và tính riêng cho từng lô.

| Tình trạng của mục | Nên dùng |
| --- | --- |
| Đủ dữ liệu, **chưa** in nền | **Giấy trắng** (in đầy đủ một lần) |
| Chưa đủ để in đầy đủ nhưng đủ dựng nền | **In mẫu nền** trước |
| **Đã in nền**, đủ dữ liệu, bố cục còn khớp | **In đè** phần bổ sung lên tờ nền đã in |
| Đã in nền, chưa đủ dữ liệu | Chờ bổ sung dữ liệu |
| Đã in nền nhưng **bố cục đã đổi** | In lại mẫu nền (rồi xác nhận lại) **hoặc** in đầy đủ trên giấy trắng |

**Cách A – in đầy đủ trên giấy trắng.** Khi cả bốn biểu mẫu đủ điều kiện chính thức (ngày ký, địa chỉ giao, ngày lập biên bản, khối lượng thực tế, phiếu cân…) và chưa mẫu nào in nền, nút chính là **In đầy đủ đợt 2 – dùng giấy trắng** (gói `…_dot2_IN_GIAY_TRANG.zip`). Mẫu nào chưa đủ thì nằm ngoài gói và được nêu rõ thiếu gì.

**Cách B – in nền trước, in đè sau.**
1. **Bước 1 – In mẫu nền đợt 2** (gói `…_dot2_MAU_NEN_in_truoc.zip`): chữ cố định in đầy đủ; số biên bản, ngày lập, khối lượng, tiền, tổng cộng **để trống chừa chỗ**. Làm được khi đã có nhân công, đội xe, **ngày ký hợp đồng** và **địa chỉ giao** (đây là chữ cố định nên phải biết trước khi in nền). BM-09 và BM-10 không in sẵn khung bảng phiếu cân; hai **Bảng kê đính kèm** luôn in đầy đủ trên giấy mới.
2. Sau khi in, bấm **Xác nhận đã in mẫu nền** (cả bộ, hoặc từng mẫu/từng nhóm ở bảng). **Tải file Word hoặc ZIP không làm đổi trạng thái**; chỉ nút xác nhận mới ghi nhận. Phần mềm lưu xác nhận cùng **chữ ký bố cục** của mẫu nền vào dữ liệu của lô, nên đóng rồi mở lại vẫn nhớ.
3. **Bước 2 – In đè phần bổ sung** (gói `…_dot2_IN_DE_phan_bo_sung.zip`): khi có số liệu, tải gói này, **nạp lại tờ mẫu nền đã in** vào máy in và in. Chỉ gồm các mục đã in nền, đủ dữ liệu và còn khớp bố cục. Nhập thêm số liệu (số biên bản, ngày lập, khối lượng, phiếu cân, tiền) **không làm mất** xác nhận.

**Nền in một phần.** Có thể xác nhận từng mẫu/nhóm: mục đã in nền cho vào gói in đè, mục chưa in nền cho vào gói giấy trắng; hai gói tách riêng và tên khác nhau, nên không lẫn tờ.

**Bố cục đổi sau khi in nền.** Chữ ký bố cục là băm của chính file nền (chữ cố định, số dòng, ngắt trang, khổ giấy, lề, chân trang, phiên bản mẫu). Thêm/bớt người lao động, đổi nhóm vận chuyển, đổi địa chỉ giao hoặc tên người ký, nâng phiên bản mẫu… làm chữ ký đổi: mục đó **bị loại khỏi gói in đè**, hiện cảnh báo nêu khác biệt (ví dụ “số dòng bảng: 10 → 12”) và đề nghị in lại nền hoặc in giấy trắng.

**Bỏ xác nhận.** Tờ nền hỏng/mất, hoặc muốn in lại trên giấy trắng: bấm **Bỏ xác nhận** ở dòng đó; mục quay về “giấy trắng”.

**Hồ sơ cũ đã in nền từ trước.** Bấm **Đã có nền in từ trước** ở dòng đó. Vì phần mềm không biết bố cục của tờ đã in, khi bấm **In đè** sẽ có hộp **bắt buộc đối chiếu** (khổ giấy, hướng giấy, lề, chữ cố định, số dòng). Chỉ sau khi bạn đồng ý, mục mới được in đè; nếu không khớp, in lại nền hoặc in giấy trắng.

**Quy tắc chung.** Mẫu nền và phần in đè **không bao giờ có chữ “BẢN NHÁP”** (nội dung, đầu/chân trang, tên file Word, tên ZIP); mọi cảnh báo chỉ hiện trên màn hình. Cách tính tiền công, cước cố định, cước tấn–km và làm tròn **không đổi**. In cả hai lần **cùng khổ A4, tỉ lệ 100% (không “Fit to page”), cùng lề, cùng máy in**, cho tờ vào đúng chiều như lần in đầu; **in thử một tờ** trước khi in cả bộ. Bố cục nền và phần in đè giống hệt nhau (đã kiểm tra tự động: cùng số đoạn, dòng bảng, số trang, vị trí dòng chữ); việc in lên giấy thật cần kiểm bằng máy in của bạn.
- Mỗi biểu mẫu là một file Word riêng, nên bộ hồ sơ đã in ở đợt 1 chỉ cần **bổ sung hoặc thay** các biểu mẫu của đợt 2. Hai đợt gộp lại đúng bằng nút “Tải toàn bộ hồ sơ”. BM-08 tính theo khối lượng thực tế đã nhập, chưa nhập thì theo sản lượng dự kiến, nên chỉ nên in BM-08 ở đợt 2.


**Giao khoán: đơn giá khoán của tổ.** Nếu **Thông tin rừng không có đơn giá Tổ trưởng**, phần mềm suy ra đơn giá khoán của tổ từ định biên nhân sự: tổng (số người từng vị trí ở sheet nhân công × đơn giá vị trí) ÷ tổng số người. Hợp đồng khoán (BM-01) ghi rõ cơ sở tính giá trung bình, chi tiết giá từng vị trí và **tổng giá trị khoán = tổng thanh toán cho tất cả mọi người, kể cả Tổ trưởng**; Giấy ủy quyền (BM-20) ghi đơn giá ký tương ứng; BM-08 ghi đơn giá khoán và tổng. Nếu **có nhập “Đơn giá giao khoán Tổ trưởng (đồng/tấn)” ở Thông tin rừng** thì làm như cũ (không có phần suy ra). Ô này **tùy chọn**: để trống thì app tự suy từ định biên.

**Định mức BHLĐ có hiệu lực từ ngày, và thêm vị trí mới.** Nút **Định mức BHLĐ** ở menu ngang trên cùng (cạnh Công ty mua hàng) mở màn hình định mức theo vị trí (chức danh).
- **Hiệu lực từ ngày**: mỗi bản định mức có ngày hiệu lực. Bản gốc (dữ liệu cũ) để trống ngày thì áp dụng từ trước đến nay; nên điền ngày cho rõ. **Thêm bản mới** (ô “Thêm bản mới, hiệu lực từ ngày”) sao chép bản đang chọn để sửa tiếp; ngày phải có thật (dd/mm/yyyy) và không trùng bản khác. Chọn bản ở ô “Bản định mức”, sửa rồi **Lưu bản định mức này**; bản không phải gốc có thể xóa.
- **Biểu mẫu dùng bản nào**: bản có ngày hiệu lực lớn nhất không vượt quá ngày của biểu mẫu. Danh sách cấp phát BHLĐ (BM-02) theo **ngày cấp phát** (không nhập thì theo ngày bắt đầu khai thác của rừng) và ghi rõ “Định mức theo bản có hiệu lực từ ngày …”; hợp đồng lao động theo ngày bắt đầu hợp đồng, ngày ký hoặc ngày bắt đầu khai thác. Ngày cấp phát **trước mọi bản** thì chặn xuất BM-02 và báo chưa có bản định mức hiệu lực.
- **Thêm vị trí mới** (ô “Thêm vị trí mới”, ví dụ “Công nhân phụ”): vị trí hiện thêm một dòng trong mọi bản định mức, thêm ô đơn giá ở tab Nhân công (mục Thông số hợp đồng và đơn giá), được chọn trong cột **Chức danh** khi nạp nhân công và có trong file Excel mẫu nhân công tải sau đó. Vị trí có người giữ trong giao khoán nằm trong chi tiết đơn giá và công thức đơn giá bình quân. Chỉ **Tổ trưởng** có vai trò riêng; tên vị trí mới không được bắt đầu bằng “Tổ trưởng”. Xóa vị trí chỉ khi chưa còn nhân công nào giữ.

**Số hợp đồng và năm trên biểu mẫu** (BM-01, BM-04, BM-09, BM-10, BM-14, BM-20): số in có dạng `<phần số>/<năm>-<hậu tố>`, ví dụ `015/2027-KT`.
- Nhập số **đầy đủ** (có dấu “/” hoặc đã có hậu tố, ví dụ `015/2025-KT`): phần mềm **giữ nguyên**.
- Chỉ nhập **phần số** (`015`): phần mềm ghép **năm lấy từ ngày ký của chính hợp đồng đó** và hậu tố. Hợp đồng khai thác (BM-01, BM-14, BM-20) và hợp đồng vận chuyển (BM-04) theo **Ngày ký hợp đồng**; Giấy ủy quyền theo ngày lập giấy (trống thì theo ngày ký hợp đồng); biên bản nghiệm thu, thanh lý và biên bản xác nhận khối lượng theo ngày lập biên bản.
- **Thiếu hoặc sai ngày ký**: năm để trống (`015/……-KT`), không tự điền năm cố định; khung “Số hợp đồng đầy đủ sẽ in (xem trước)” ở tab Xuất hồ sơ nêu rõ cần bổ sung ngày nào. Các dòng ngày để trống in “ngày ….. tháng ….. năm …….”.
- BM-01, BM-14 và BM-20 của cùng hồ sơ giao khoán luôn tham chiếu **cùng một số** hợp đồng khai thác.

**Nút Báo cáo**: chọn kỳ (từ ngày – đến ngày theo **ngày cân**) và chủ rừng, xem trước rồi xuất **Word** hoặc **Excel**. Chín mẫu: tổng hợp điều hành, sản lượng theo rừng, **sổ theo dõi phiếu cân** (có cột điểm đến theo hồ sơ và đối chiếu nơi giao), tiến độ FSC, bảng cha–con chủ rừng – rừng – phiếu cân. Số liệu giữa xem trước, Word và Excel giống nhau. **Phiếu có ngày không có thật bị loại khỏi tổng của kỳ** và được liệt kê ở mục riêng kèm lý do. Phiếu trùng số vẫn được cộng vào tổng nhưng đánh dấu “Trùng số phiếu”.

**Báo cáo đối chiếu bản tra cứu** (mẫu “Đối chiếu bản tra cứu: tọa độ, hồ sơ rừng, phiếu cân”): đọc bản Google Sheets/Excel đang dùng ở Tra cứu và đối chiếu ba tab HoSoRung, ToaDoRung, HoSoKeo theo **CCCD và mã hợp đồng**. Liệt kê: **I.** rừng ở HoSoRung thiếu dòng tọa độ ở ToaDoRung hoặc tọa độ không dùng được (ghi lý do, dòng nguồn); **II.** phiếu cân ở HoSoKeo thiếu hồ sơ rừng ở HoSoRung (gộp theo chủ rừng và hợp đồng: số phiếu, khối lượng, từ ngày – đến ngày, ví dụ số phiếu, gợi ý nếu cùng CCCD có hợp đồng khác); **III.** dòng tọa độ thiếu hồ sơ rừng; **IV.** rừng chưa có phiếu cân. Có tìm nhanh (tên, CCCD, hợp đồng, số phiếu), lọc “chỉ rừng thiếu tọa độ” và “chỉ phiếu cân thiếu hồ sơ rừng”, xuất Word và Excel. Chưa có bản tra cứu thì báo rõ. Cần sửa thì sửa trên bảng tính gốc rồi **Đồng bộ ngay** lại.

## 10. Sao lưu và khôi phục
Phần mềm **tự sao lưu file cơ sở dữ liệu** vào thư mục `backups` trước mỗi lần nâng cấp cấu trúc và mỗi lần khôi phục; mọi thao tác ghi nằm trong một giao dịch, lỗi giữa chừng thì dữ liệu cũ giữ nguyên.

**Sao lưu toàn bộ**: **⋯ Thêm → Sao lưu toàn bộ dữ liệu (.json)** → chọn thư mục → tạo 2 file cùng tên `.json` và `.sqlite`.

**Khôi phục toàn bộ**: **⋯ Thêm → Khôi phục toàn bộ dữ liệu (.json)** (cũng dùng để nhập bản sao lưu từ bản HTML cũ). Màn hình xem trước cho biết số liệu trong file và trên máy, và với từng chủ/lô: **THÊM** (chưa có), **TRÙNG** (đã có), **GIỮ** (có trên máy, không có trong file). Chọn cách xử lý:
- **Giữ bản trên máy, chỉ thêm mới**.
- **Ghi đè lô trùng**: chỉ thay **đúng các lô trùng**, giữ lô khác của chủ và chủ khác; hồ sơ chủ rừng của máy được giữ.
- **Giữ cả hai**: lô trùng được thêm thành lô **mới** và bạn **xác nhận mã mới** cho từng lô (gợi ý sẵn, ví dụ `R1-2`; mã bị từ chối nếu trùng lô đã có, lô khác trong file hoặc mã cũ).
- **Thay toàn bộ dữ liệu**: xóa dữ liệu hiện có và thay bằng file; hộp xác nhận nêu rõ số chủ và lô sẽ mất.

Nếu ID nội bộ, mã lô và chủ rừng chỉ về các hồ sơ **khác nhau** thì phần mềm **dừng**, không ghi gì và liệt kê hồ sơ cần đối chiếu.

**Sao lưu một lô rừng** (dùng khi chuyển lô sang máy khác, hoặc lưu riêng một lô): mở lô → **Sao lưu lô rừng** → chọn nơi lưu bằng hộp thoại Windows. File `HAKQN_LoRung_<MaLo>_<Ngày>.json` chứa đúng **một** lô: thông tin, giấy tờ, nhân công, xe, phiếu cân, hợp đồng, đơn giá, thông số biểu mẫu, dấu vết nhập, **địa chỉ giao hàng đã chốt** (để BM-04 vẫn đúng sau khi chuyển máy), nhận diện chủ rừng và các thiết lập dùng chung lô cần. File **không** chứa lô khác, chủ khác, bản tra cứu Google Sheets hay thông tin đăng nhập.

**Khôi phục một lô rừng**: **⋯ Thêm → Khôi phục lô rừng…** → chọn file. Màn hình xem trước nêu chủ rừng và mã lô đích, thời điểm sao lưu, số nhân công, xe, phiếu cân, tổng tấn:
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

## Cài đặt: Hệ thống, Google Sheets, Công ty, Hiển thị số
Nút **Cài đặt** ở menu ngang trên cùng gồm bốn mục:
- **Hệ thống**: thư mục dữ liệu, thư mục sao lưu, nhắc sao lưu.
- **Google Sheets**: **địa chỉ bảng tính** dùng cho màn Tra cứu (chỉ đọc). Màn Tra cứu không còn ô nhập địa chỉ; chỉ ghi địa chỉ đang dùng và nút “Đổi trong Cài đặt”.
- **Công ty**: thông tin **Công ty mua hàng** (một hồ sơ cho cả phần mềm, các địa chỉ giao hàng). Nút Công ty mua hàng không còn ở menu ngang.
- **Hiển thị số**: chọn kiểu Việt Nam (1.234.567,5) hoặc kiểu quốc tế (1,234,567.5) cho số **trên màn hình**. **Ngày luôn là dd/mm/yyyy.** Biểu mẫu Word và file in luôn dùng số kiểu Việt Nam.

## Định mức gỗ keo (1 ha = ? tấn) và nút điền nhanh ở Thông tin rừng
- **Định mức gỗ keo**: ở màn **Định mức BHLĐ**, mục “Định mức gỗ keo: 1 ha = ? tấn”, mỗi dòng có **hiệu lực từ ngày**. Dòng cuối để thêm định mức mới; ngày phải có thật và không trùng.
- **Mặc định cho rừng**: rừng lấy định mức có hiệu lực theo **ngày bắt đầu khai thác** của rừng (chưa có ngày thì dùng bản mới nhất). Ô “Định mức (tấn/ha)” ở Thông tin rừng để trống là dùng mặc định (gợi ý ngay trong ô); **tự điền số** thì rừng dùng số riêng; nút **Dùng mặc định** xóa số riêng. Sản lượng dự kiến tự tính theo định mức đang dùng.
- **Từ ngày / đến ngày**: nút **Lấy ngày cân nhỏ nhất** và **Lấy ngày cân lớn nhất** (từ phiếu cân của rừng) điền vào ô; vẫn tự điền hoặc sửa được.
- **Khối lượng thực tế**: nút **Lấy tổng từ phiếu cân** điền tổng khối lượng phiếu cân; vẫn tự điền số. Các nút chỉ điền vào ô, bấm **Lưu thông tin rừng** để ghi nhận.

## Cập nhật biển số xe từ bảng tính tra cứu, và báo cáo theo lô
- **Cập nhật biển số xe**: khi mở bảng tra cứu và chọn **Điền vào rừng đang mở**, nếu phiếu cân đã có trong hồ sơ nhưng bảng tính có **biển số khác**, màn hình xem trước hiện khung **“Biển số xe khác với hồ sơ”** (số phiếu, biển cũ → biển mới) và phiếu đó được **tích sẵn** trong bảng; giữ ô **Chỉ đổi biển số** rồi bấm **Lưu vào hồ sơ**. Cách này chỉ đổi biển số, **giữ nguyên** ngày cân, khối lượng, nơi giao. Cách khác: chọn phiếu (trạng thái “cập nhật”) rồi **Lưu vào hồ sơ** để cập nhật cả phiếu; biển số đổi cũng được ghi lại.
- **Thông tin cân lấy từ bảng tính**: khi ghi phiếu cân từ tra cứu, ngoài số phiếu, ngày cân, biển số và khối lượng, phần mềm lấy thêm **giờ cân 1, giờ cân 2, cân lần 1 (kg), cân lần 2 (kg), khối lượng (kg), khối lượng (tấn) và khách hàng** (tên khách hàng ở cột “Họ và tên chủ rừng”, mã ở cột “Mã khách hàng”). Màn xem trước và danh sách phiếu cân ở tab Vận chuyển hiện đủ các cột này. Chỉ có cột tấn thì kg = tấn × 1000; chỉ có cột kg thì tấn = kg ÷ 1000. **Phiếu cân đã có trong hồ sơ nhưng thiếu các thông tin này** hiện trạng thái “cập nhật” với ghi chú “Bổ sung giờ cân, cân lần 1, cân lần 2…”: chọn rồi Lưu vào hồ sơ để bổ sung. Cột giờ cân trong bảng tính có thể là ô giờ hoặc chữ.
- **Sổ theo dõi phiếu cân và file Excel mẫu phiếu cân** có thêm các cột **Giờ cân 1, Giờ cân 2, Cân lần 1 (kg), Cân lần 2 (kg), Khối lượng (kg), Khối lượng (tấn), Khách hàng**. File Excel mẫu: các cột mới là tùy chọn; file cũ không có các cột này vẫn nạp được. Giờ cân nhập dạng ô giờ hoặc chữ (08:15). Chỉ điền kg thì tấn = kg ÷ 1000; kg và tấn lệch nhau, hoặc kg khác chênh lệch hai lần cân quá 1 kg, thì có cảnh báo (không chặn nạp). Báo cáo Sổ theo dõi phiếu cân (Word, Excel) có đủ các cột, kể cả tổng kg và tổng tấn.
- **Nhật ký đổi biển số** lưu trong lô rừng: số phiếu, biển cũ, biển mới, thời điểm, nguồn (Google Sheets). Phiếu đổi nhiều lần giữ đủ các dòng.
- **Báo cáo “Phiếu cân đã cập nhật biển số xe”** (nút Báo cáo): theo **từng lô rừng**, có bảng tổng hợp theo lô (số phiếu cân, số phiếu đã cập nhật biển, tỷ lệ, khối lượng) và bảng chi tiết (số phiếu, ngày cân, biển cũ, biển mới, thời điểm cập nhật). Lọc theo kỳ (ngày cân), xuất Word hoặc Excel.

## Báo cáo danh sách lao động và danh sách xe
Hai mẫu trong nút **Báo cáo**, xuất **Word** hoặc **Excel**:
- **Danh sách lao động theo lô**: tổng hợp từng lô (số lao động, tổ trưởng, công nhân khai thác, công nhân cưa, vị trí khác, số người dưới 18 tuổi) và danh sách chi tiết (họ tên, vai trò, chức danh, ngày sinh, tuổi, CCCD, địa chỉ, ngày và nơi cấp CCCD, đơn giá theo cơ sở tính của lô). Tuổi tính tại ngày bắt đầu khai thác của lô (không có thì ngày lập báo cáo). Có ghi chú dưới 18 tuổi, lô chưa có tổ trưởng, và mục “Hồ sơ lao động cần bổ sung” khi thiếu ngày sinh hoặc CCCD không đủ 12 số.
- **Danh sách xe vận chuyển theo lô**: tổng hợp từng lô (số xe, số chuyến, khối lượng) và danh sách xe (biển số, loại xe, chủ xe, người ký hợp đồng vận chuyển, tên tài xế, CCCD người ký, SĐT, hạn bảo hiểm, hạn GPLX, số chuyến và khối lượng theo phiếu cân; lọc kỳ theo ngày cân). Biển số có trong phiếu cân nhưng chưa có trong danh sách xe được liệt kê ở mục III.

**Bộ lọc thông minh cho mẫu báo cáo.** Trong nút **Báo cáo**, mọi mẫu có thanh lọc: **Tìm nhanh** (gõ rồi Enter; không phân biệt dấu và hoa thường, nhiều từ = phải có đủ), **Lô rừng**, **Chủ rừng**, khoảng ngày cân, và điều kiện riêng của từng mẫu:
- **Danh sách lao động**: chức danh, vai trò, chỉ người dưới 18 tuổi, chỉ hồ sơ cần bổ sung (thiếu ngày sinh hoặc CCCD).
- **Danh sách xe**: người ký hợp đồng vận chuyển, chỉ xe chưa có số điện thoại, chỉ xe có chuyến hoặc chưa có chuyến trong kỳ.
- **Sổ phiếu cân**: tìm theo số phiếu, biển số, khách hàng, nơi giao.
Mỗi điều kiện hiện thành **chip** (bấm × để bỏ, “Xóa hết” để bỏ tất cả). Có thể **lưu bộ lọc** theo tên cho từng mẫu và mở lại sau. Bộ lọc áp dụng **trước khi lập báo cáo** nên KPI, tổng cộng, file Word và Excel đều khớp phần đã lọc; dòng “phạm vi lọc” dưới tiêu đề ghi rõ các điều kiện đã dùng.

## Quy trình hồ sơ theo đợt
Tab **Xuất hồ sơ** có bảng **Quy trình hồ sơ theo đợt** ở đầu: năm bước (Chuẩn bị, In đợt 1, Khai thác và cân, In đợt 2, Hoàn tất), một dòng **Việc nên làm tiếp**, và danh sách mẫu của đợt 1 và đợt 2 với trạng thái **Dữ liệu** (Đủ, Bản nháp, Chưa đủ) và **In ấn** (Chưa in, Đã in còn khớp, Đã in nhưng dữ liệu đã đổi). Bấm **Đánh dấu đã in** sau khi in (từng mẫu hoặc cả đợt); nếu sau đó dữ liệu của mẫu đổi, mẫu hiện **“in lại”**. Đợt 1 chỉ dùng dữ liệu có trước khi khai thác nên bản in đợt 1 **không đổi** khi nhập phiếu cân hoặc khối lượng thực tế. Với đợt 2, cột **Hướng in đợt 2** cho biết mỗi mẫu đang ở bước nào của hai hướng in: **giấy trắng** hoặc **in nền rồi in đè**; “Việc nên làm tiếp” nêu rõ bước in nền, chờ dữ liệu, in đè hay in lại khi bố cục đổi, và bấm **Đã in xong** sau khi in xong. Đầy đủ quy tắc và kết quả rà soát: `docs/QUY_TRINH_HO_SO.md`.

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


## Cài đặt hệ thống: thư mục dữ liệu và thư mục sao lưu
Mở **⋯ Thêm → Cài đặt hệ thống**.
- **Thư mục dữ liệu**: nơi lưu cơ sở dữ liệu (`hakqn.sqlite`). Bấm *Chọn thư mục…* để đổi: phần mềm sao chép toàn bộ dữ liệu sang thư mục mới rồi dùng từ đó; **bản cũ không bị xóa** (xóa tay khi chắc chắn không cần). Nếu thư mục mới đã có dữ liệu HAKQN, phần mềm hỏi: dùng dữ liệu có sẵn đó, ghi đè bằng dữ liệu đang dùng (bản có sẵn được lưu lại trước), hoặc hủy. *Về mặc định* đưa dữ liệu về thư mục của ứng dụng.
- **Thư mục sao lưu**: bản sao lưu tự động trước khi nâng cấp dữ liệu, **Sao lưu toàn bộ dữ liệu** (lưu thẳng vào đây, không hỏi lại) và thư mục gợi ý khi sao lưu lô rừng. Nên chọn ổ khác hoặc USB.
- Thư mục phải có sẵn và ghi được, nếu không phần mềm báo lỗi và giữ cài đặt cũ. Nếu thư mục đã chọn bị xóa hoặc ổ không còn, phần mềm dùng vị trí mặc định và nêu rõ trong màn Cài đặt.
- Không nên đặt dữ liệu trên ổ mạng hoặc thư mục đang đồng bộ đám mây (OneDrive, Google Drive): cơ sở dữ liệu có thể hỏng.

**BM-09 và Bảng kê khối lượng đính kèm**: trang 1 chỉ có nội dung biên bản (số biên bản, ngày, tổng khối lượng, chữ ký) và nhắc “cụ thể trong Bảng kê khối lượng đính kèm”; mẫu trống (in nháp) chỉ có trang 1. Bản “chỉ phần số” và bản đầy đủ có thêm trang 2 là Bảng kê khối lượng (STT, ngày cân, biển kiểm soát, số phiếu cân, nơi giao, khối lượng từng chuyến), in đầy đủ bằng mực đen trên giấy mới, không cần in khung rồi in đè. Nhờ vậy không còn giới hạn số dòng chuyến.

**Mẫu trống để trắng hoàn toàn**: ở bản “Mẫu trống” mọi chỗ chờ số (số biên bản, ngày, khối lượng, số tiền, bằng chữ) đều để **trắng**, không in dãy chấm; bản “chỉ phần số” in số đúng chỗ đó. **BM-10 (Bảng thanh toán tiền vận chuyển)** giống BM-09: bảng chi tiết từng xe tách thành trang riêng “Bảng kê chi tiết thanh toán đính kèm”, in đầy đủ khi đã có phiếu cân; mẫu trống chỉ có trang 1.


## Đổi thư mục dữ liệu an toàn, ổ dữ liệu không truy cập được, sao lưu đáng tin cậy
**Đổi thư mục dữ liệu** (⋯ Thêm → Cài đặt hệ thống). Phần mềm làm theo thứ tự và chỉ chuyển khi mọi bước đã qua kiểm tra:
1. Tạo bản sao dữ liệu đang dùng thành **file tạm** ở thư mục đích, kiểm tra toàn vẹn, phiên bản cấu trúc và số bản ghi từng bảng.
2. Mở thử cơ sở dữ liệu mới và đọc thử; **chỉ sau đó mới lưu đường dẫn mới**. Lỗi ở bất kỳ bước nào: hoàn tác, vẫn làm việc ở vị trí cũ, dữ liệu cũ không bị đổi.
3. Thư mục đích đã có dữ liệu: hộp thoại nêu số chủ rừng, số lô, ngày sửa của cả hai bên và cho chọn **Dùng dữ liệu có sẵn**, **Ghi đè bằng dữ liệu đang dùng** hoặc **Hủy**. *Dùng dữ liệu có sẵn* kiểm tra đúng cơ sở dữ liệu HAKQN, không hỏng, phiên bản cấu trúc được hỗ trợ. *Ghi đè* trước hết tạo **bản dự phòng nhất quán của đích** (gồm cả giao dịch đã commit còn trong nhật ký WAL) vào thư mục sao lưu và **kiểm tra mở được** rồi mới thay; đích đang được chương trình khác dùng thì dừng và báo; đích hỏng hoặc không phải HAKQN thì không ghi đè.
4. Dung lượng được tính theo thao tác thực tế (bản sao ở đích; với ghi đè còn bản dự phòng, kiểm tra riêng nếu thư mục sao lưu ở ổ khác).
5. Thao tác lưu phát sinh trong lúc đổi được giữ lại và chạy trên cơ sở dữ liệu mới sau khi chuyển. Nếu phần mềm bị đóng giữa chừng, đường dẫn vẫn là vị trí cũ; lần đổi sau tự khôi phục file đích bị đổi tên dở. Bản cũ không bị xóa.

**Ổ hoặc thư mục dữ liệu không truy cập được khi mở phần mềm**: phần mềm kiểm tra cả thư mục và file `hakqn.sqlite` ở đường dẫn đã cấu hình. Nếu thiếu thư mục, thiếu file, mất kết nối ổ hoặc không có quyền, màn hình hiện **đúng đường dẫn và nguyên nhân** và **không mở bản mặc định** (tránh ghi nhầm vào một bản cũ hoặc trống). Bạn chọn: **Thử lại** (sau khi cắm lại ổ), **Chọn cơ sở dữ liệu khác…** (thư mục có `hakqn.sqlite` hợp lệ) hoặc **Dùng vị trí mặc định…** (có hộp thoại xác nhận nêu bản mặc định đang có gì). Cấu hình cũ được giữ nguyên cho đến khi bạn chọn đổi. Màn Cài đặt hệ thống luôn hiện **cơ sở dữ liệu đang dùng** (đường dẫn, dung lượng, ngày sửa, phiên bản cấu trúc).

**Sao lưu toàn bộ** ghi hai file (JSON và SQLite) qua tên tạm, đọc lại kiểm tra (JSON hợp lệ; SQLite toàn vẹn, khớp số bản ghi), rồi mới đổi tên. Mốc “sao lưu toàn bộ gần nhất” chỉ cập nhật khi **cả hai file** thành công. Lỗi một file: thông báo nêu file nào dùng được, file tạm được dọn, mốc cũ giữ nguyên. Bấm liên tiếp không ghi đè nhau (tên có mili giây, trùng thì thêm _2, _3…) và bấm khi đang sao lưu thì bị từ chối. Thiếu dung lượng được kiểm tra trước khi ghi. Sao lưu lô rừng cũng ghi qua file tạm và đọc lại kiểm tra gói lô.


## Bản chính thức và BẢN NHÁP khi xuất hồ sơ
Mỗi biểu mẫu có **điều kiện in chính thức riêng**. Thiếu điều kiện thì phần mềm **vẫn cho tải để soạn trước** nhưng gắn nhãn **BẢN NHÁP**: dòng đỏ ở đầu tài liệu, chữ “BẢN NHÁP” ở chân trang, tên file có `BAN_NHAP` (ví dụ `14_BAN_NHAP_BB_nghiem_thu_…docx`) và tên gói ZIP có hậu tố `_BAN_NHAP`. Cùng một quy tắc cho **tải lẻ từng mẫu** và **tải theo gói** (Tất cả, Đợt 1, Đợt 2). Tab **Xuất hồ sơ** có khung “Bản chính thức hay bản nháp” nêu mẫu nào thiếu gì và bổ sung ở đâu.

| Mẫu | Điều kiện bản chính thức | Bổ sung ở |
| --- | --- | --- |
| BM-01 Hợp đồng giao khoán, BM-20 Giấy ủy quyền | Có ngày ký hợp đồng (số hợp đồng đủ năm) | Thông tin chủ rừng → Ngày ký hợp đồng |
| BM-04 Hợp đồng vận chuyển | Ngày ký + địa chỉ giao hàng đã chốt | Tab Vận chuyển → Chọn địa chỉ giao hàng |
| BM-08 Bảng thanh toán tiền công | Khối lượng khai thác **thực tế** (không phải sản lượng dự kiến); tính theo ngày công thì không cần | Thông tin rừng → Khối lượng thực tế |
| BM-09, BM-10 | Ngày ký + địa chỉ giao hàng + ngày lập biên bản xác nhận khối lượng (và phải có phiếu cân hợp lệ mới có file) | Tab Xuất hồ sơ → Xác nhận khối lượng, thanh toán: ngày lập |
| BM-11 Cam kết nguồn gốc | Đơn vị nhận (Công ty mua hàng) | Nút Công ty mua hàng |
| BM-14 Nghiệm thu, thanh lý | Ngày ký + khối lượng thực tế + ngày lập biên bản nghiệm thu | Tab Xuất hồ sơ → Nghiệm thu, thanh lý: ngày lập |

Các mẫu còn lại không có điều kiện riêng nên luôn là bản chính thức (khi dữ liệu cơ bản đã đủ để xuất). **Mẫu trống / chỉ phần số** (in hai bước) là mẫu thiết kế để điền sau nên không gắn nhãn. Khi đã bổ sung đủ, tải lại để có bản chính thức.
