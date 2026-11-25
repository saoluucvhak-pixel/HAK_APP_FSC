# Nhật ký thay đổi

## 3.5.1 — Kiểm soát phát hành và đối chiếu báo cáo

- Màn Danh mục: Thêm/Sửa đối tượng, xe, ngành nghề và chức vụ mở trong hộp thoại riêng (có Lưu thông tin / Hủy bỏ, Esc để hủy); Chức vụ, Ngành nghề, Quyền ký hợp đồng chọn bằng nút phân đoạn (quyền ký loại trừ nhau); bảng Ngành nghề / Chức vụ là danh sách sạch với nút Sửa, Ngừng / Xóa.
- Thông tin chủ rừng: Số hợp đồng, Họ tên, CCCD đứng đầu form kèm nút “Tra cứu Google Sheet”; chọn hợp đồng ở bảng Cha - Con rồi “Chọn hợp đồng này & Điền vào hồ sơ” để điền sẵn form (chưa lưu). Bỏ thẻ Google Sheets bị khóa ở cuối form.
- Vận chuyển: form Thêm xe chia khối Phương tiện / Chủ xe / Tài xế / Người ký (chọn chủ xe, tài xế từ Danh mục đối tượng, giấy tờ tự điền); bỏ các nút “Mở Danh mục …” gây văng màn hình, thêm hướng dẫn thêm xe ở tab “Xe và tài xế”.
- Hợp đồng vận chuyển: ô lọc nhanh và nút “+ Thêm người ký” (hộp nhỏ tại chỗ, tự chọn người vừa thêm); form Thêm xe có thẻ tóm tắt chủ xe / tài xế và nút “+ Thêm chủ xe / tài xế mới”.
- Danh sách chủ rừng (cột trái) dùng bộ lọc thông minh: tình trạng hồ sơ, tình trạng hợp đồng, số lượng rừng.
- Thanh tiêu đề: nút đổi nhanh Sáng / Tối và chọn nhanh bảng màu.
- Bàn làm việc (menu mới): sơ đồ quy trình 6 bước (Đã xong / Đang làm / Chờ xử lý / Bị khóa), các trạm công việc và hàng đợi việc cần xử lý của lô đang chọn với nút “Xử lý ngay”; khối Hướng dẫn bắt đầu được gỡ khỏi Tổng quan.
- Bảng hợp đồng Google Sheets: lọc theo khoảng tổng tấn và khoảng ngày ký (cùng chip trạng thái). Báo cáo Sổ theo dõi phiếu cân: lọc theo Đội xe và Nhà máy tiếp nhận (Word, Excel, in đều theo phần đã lọc). Các bộ chọn xe, chủ xe, tài xế có ô gõ lọc nhanh.
- Thông tin chủ rừng: bốn ô tra cứu (số hợp đồng, CCCD, họ tên, mã chủ rừng; Enter để tra cứu), ô tích “Dùng số CCCD làm Mã chủ rừng”, danh xưng chọn bằng nút và tự gợi ý theo tên (Thị → Bà, Văn → Ông); chọn hợp đồng từ Google Sheets thì tự lưu thông tin và tạo Rừng 1; chủ rừng còn trống không để lại dòng “(chưa đặt tên)”.
- Vận chuyển: nút “Tự động gán & thêm nhanh toàn bộ xe vào đội”; thẻ Đối soát sản lượng (dự kiến so với thực tế từ phiếu cân) ở mục Phiếu cân.
- Xuất hồ sơ: bảng Tiền kiểm soát (mục chặn xuất, mục cần đối chiếu, nút “Đi đến sửa”) và nút “Xuất trọn bộ hồ sơ FSC” dùng gói Toàn bộ hồ sơ có sẵn.
- Phiếu cân: thanh cảnh báo biển số chưa có trong đội xe có nút “Tự động gán & thêm nhanh toàn bộ xe vào đội” (xe có trong Danh mục được gán đủ thông tin, xe chưa có được tạo nhanh trong Danh mục xe); thẻ Đối soát sản lượng cảnh báo khi chênh lệch trên 15%. Thông tin chủ rừng: ô tích “Dùng số CCCD làm Mã chủ rừng” mặc định bật, bấm đúp dòng hợp đồng để điền. Tra cứu Google Sheets hiện huy hiệu “Ngoại tuyến - Dùng bản đệm gần nhất” khi mất mạng hoặc đồng bộ lỗi.
- Xuất hồ sơ: Nhật ký truy xuất nguồn gốc của lô (dòng thời gian từ các nhật ký đã lưu: tạo lô, nạp, đổi số phiếu, đổi biển số, in, ký, chốt lô); tải phụ lục .docx kẹp BM-18 hoặc in. Thêm xe, nhân công, phiếu cân bằng tay, từ Danh mục hoặc từ phiếu cân cũng được ghi vào nhật ký lô khi lưu.
- Thông tin rừng: thẻ Đối soát 3 nguồn diện tích đất rừng (Sổ đỏ, khảo sát / hợp đồng, đo GPS từ ToaDoRung), cảnh báo xung đột khi chênh trên 0,01 ha; hai ô diện tích mới chỉ tạo khóa dữ liệu khi có giá trị; cập nhật từ Google Sheets điền diện tích đo GPS. Form Thêm xe: nút “+ Thêm xe mới vào danh mục”.
- Gói lô rừng di động: hộp lưu lô mặc định đuôi .fscpkg (cùng nội dung niêm phong như .json); hộp mở lô nhận cả .fscpkg và .json. Form Thêm xe: mục “Chỉ định người khác…” chọn người ký của cả đội xe (có ô gõ lọc và thêm nhanh người ký).
- Tổng quan thành bảng điều hành: 4 chỉ số chính (sản lượng đã cân, diện tích quản lý, lực lượng tác nghiệp, tỷ lệ hồ sơ FSC hợp lệ), sản lượng 6 tháng, radar cảnh báo tuân thủ FSC, 5 lô khai thác tích cực nhất (30 ngày), 5 phiếu cân mới nhất và thao tác nhanh.
- Menu dọc các mục lô canh trái thẳng hàng; “Đội / Hợp đồng” đổi thành “Hợp đồng nhân công”.
- Chỉ công bố bộ cài sau khi cả ba job kiểm thử đạt và mã băm bộ cài khớp thông tin bản dựng.
- Báo cáo chất lượng Google Sheets dùng ánh xạ biển số đã lưu.
- Báo cáo mặc định từ đầu tháng đến hôm nay. Các kênh IPC yêu cầu nguồn gọi là frame chính của cửa sổ hồ sơ.

## 3.5.0 — Ngành nghề và Chức vụ, Cài đặt chia tab, an toàn bản nháp, báo cáo chất lượng Google Sheet

### Điểm mới

- **Ngành nghề và Chức vụ:** hai danh mục mới (Danh mục → "Ngành nghề và chức vụ"), thêm / đổi tên / Ngừng sử dụng được. Người chọn nhiều chức vụ, chọn "Khác" thì phải chọn ngành; doanh nghiệp được chọn cả hai ngành. Danh sách Bên nhận khoán, nhân công, bên vận chuyển, tài xế lọc theo ngành khi đã khai (dữ liệu cũ chưa khai vẫn hiện như trước).
- **Chức vụ / Vị trí thống nhất; Danh mục Vị trí chi tiết** (nhiệm vụ, ghi chú); màn **Định mức chia 4 tab**.
- **Cài đặt dùng tab ngang** cùng kiểu Danh mục: Dữ liệu · Sao lưu và khôi phục · Google Sheets · Hiển thị · Hướng dẫn · Cần đối chiếu; **Sao lưu và khôi phục chia ba tab con** (Thao tác · Thư mục và lịch · Các bản sao lưu).
- **Hộp thoại trong ứng dụng thay `confirm()`** khi lưu lô có người / xe mới: liệt kê từng dòng kèm ô tích, "Thêm vào danh mục" hoặc "Chỉ lưu trong lô".
- **Lưới an toàn bản nháp:** lần lưu đầu tiên sau khi áp dữ liệu từ Google Sheets tự sao lưu file trước ("Trước khi lưu dữ liệu từ Google Sheets", giữ 10 bản; sao lưu lỗi thì không lưu); thanh "Chưa lưu" nêu "Gồm N lô, X chủ rừng mới, Y ánh xạ biển số"; hộp khi đóng còn nháp liệt kê cụ thể.
- **Báo cáo chất lượng Google Sheet** (Cài đặt → Google Sheets): bảng số đếm, chỉ đọc, không chứa thông tin cá nhân (CCCD, tên, địa chỉ, mã hợp đồng, số phiếu, biển số, mã rừng); có test bảo mật bắt buộc.

### Sửa lỗi

- **Bản nháp:** tách lõi thuần `src/nhap.js` kèm test mô hình ngẫu nhiên; sửa 4 lỗi mà test mô hình tìm ra ở ánh xạ biển số trong nháp, khôi phục bản nháp và hoàn tác về bản đã lưu (có test đỏ trước khi sửa).
- **Thông báo:** "Đã lưu dữ liệu vào lô…" vẫn hiện cùng kết quả chọn thêm danh mục.
- **Bảo toàn bản in:** 206/206 tài liệu biểu mẫu `.docx` giống từng byte so với v3.3.0. Không đổi cấu trúc cơ sở dữ liệu (không migration); các trường mới đều tùy chọn và chỉ ghi khi có dữ liệu.

## 3.4.0 — Tài xế theo xe, làm rõ Danh mục đối tượng, sửa khối lượng phiếu và giao diện

### Điểm mới

- **Tài xế thường chạy theo xe:** Danh mục xe có ô chọn tài xế (người có vai trò Tài xế trong Danh mục đối tượng) và cột Tài xế; thêm xe vào lô thì tên, CCCD, giấy phép lái xe của tài xế được điền sẵn (không ghi đè dữ liệu đã có); gói danh mục chuyển giữa các máy mang theo tài xế. Xe chưa gắn tài xế giữ dữ liệu y hệt cũ.
- **Danh mục đối tượng rõ hơn (chỉ đổi chữ):** thống nhất tên "Danh mục đối tượng"; "Đối tác (người)" thành "Thông tin cá nhân"; ô lọc "Có quyền ký hợp đồng"; có giải thích thông tin được chụp vào lô khi chọn.

### Sửa lỗi

- **Khối lượng phiếu cân:** chuỗi nhiều dấu phẩy như `1,250,000` không còn bị đọc thành 1,25 tấn (nay tính 0 kg, không đoán); `1.250,5` đọc đúng 1250,5 tấn; `1,250` vẫn là 1,25 tấn như cũ.
- **Mã dòng đã xóa:** ID dòng nhân công/xe đã xóa được lưu bền (`idDaCap`), phiên sau không cấp lại; lô chưa xóa dòng nào giữ dữ liệu y hệt cũ.
- **Sao lưu:** dọn thêm tệp tạm mồ côi dạng `.tmp-<pid>-<thời gian>` trong thư mục sao lưu.
- **Giao diện:** biến `--sel` cho hàng được chọn (sáng/tối); chữ phụ đạt tương phản AA; bảng nhân công và xe gọn như bảng phiếu cân (dòng thấp hơn gần một nửa ở khung nhỏ); 5 hộp thoại có nhãn truy cập (`aria-labelledby`).
- **Bảo toàn bản in:** 206/206 tài liệu biểu mẫu `.docx` giống từng byte so với v3.3.0.

## 3.3.0 — Dữ liệu Google Sheets theo hợp đồng, phân bổ phiếu cân vào rừng, đổi số phiếu, bản nháp đầy đủ

### Điểm mới

- **Màn "Dữ liệu Google Sheets" (đổi tên từ "Tra cứu"):** màn đầu là bảng toàn bộ hợp đồng (mã, chủ rừng, CCCD che giữa, ngày ký, số rừng, số phiếu, tổng tấn, trạng thái Đủ/Cần xem/Lỗi dữ liệu), tìm không dấu, lọc, phân trang. Mở một hợp đồng ra hộp thoại Cha–Con: danh sách rừng theo thứ tự nhập, ba thẻ Hồ sơ rừng, Tọa độ, Phiếu cân; chân hộp thoại cố định; khung hẹp xếp Cha trên Con.
- **Phân bổ phiếu cân vào rừng:** hợp đồng nhiều rừng phân bổ theo ngày cân, rừng nhập trước nhận đến hết sản lượng dự kiến (+ dung sai 5 %), rừng cuối nhận phần dư; có nút Phân bổ tự động, Phân bổ phiếu còn lại vào rừng N, Xóa phân bổ; cảnh báo "Vượt dự kiến"; phiếu chưa phân bổ không được ghi.
- **Ghép mã rừng:** ghép dòng hồ sơ rừng với mã rừng theo diện tích, địa chỉ, thứ tự; ghép tạm có cờ "cần xác nhận" và ô Mã rừng để đổi tay.
- **Nghi đổi số phiếu:** phát hiện phiếu Sheet nghi là phiếu đã có nhưng đổi số; người dùng chọn "Đổi số (giữ nguyên phiếu)" hoặc "Là chuyến khác"; mặc định không ghi; không cộng đôi khối lượng, tải lại không thêm lại. Thao tác "Đổi số phiếu" riêng ở bảng phiếu cân bắt buộc lý do, chặn trùng số và ngày, ghi nhật ký (`soLog`), giữ số cũ (`soCu`).
- **Mã hợp đồng nhiều CCCD:** cảnh báo nặng và xác nhận hai bước trước khi cập nhật.
- **Màn chủ rừng:** nút "Mở dữ liệu Google Sheets" và "Đối chiếu với Google Sheets" (họ tên, CCCD, ngày ký; số rừng và tổng tấn khi lô đã lưu mã hợp đồng); chênh lệch chỉ cảnh báo, không chặn lưu.
- **"Cập nhật vào hồ sơ" ghi vào bản nháp:** toàn bộ (chủ rừng, lô, rừng, tọa độ, giấy tờ, phiếu cân) vào bản nháp; chỉ lưu khi bấm "Lưu dữ liệu vào lô". Biển số chưa có trong danh sách xe của lô được liệt kê kèm ô "Thêm xe vào lô" (mặc định tích). "Lưu và đóng" lưu mọi lô nháp; bản nháp được khôi phục sau khi mở lại ứng dụng.
- **Nhận Sheet cũ:** mỗi tab chỉ cần cột đặc trưng bắt buộc; Sheet cũ đủ cột đọc như v3.2.0.
- **Tốc độ tra cứu:** chỉ mục theo mã hợp đồng và bỏ sắp xếp trong SQL; 2000 hợp đồng tổng hợp trong khoảng 0,25 giây (trước đó khoảng 2,1 giây).
- **Bảo mật:** mọi giá trị từ Sheet qua `esc()`; CCCD che giữa ở bảng và tiêu đề; `limit` truy vấn bị chặn; `npm audit --omit=dev` không có lỗ hổng.
- **Bảo toàn bản in:** 206/206 tài liệu biểu mẫu `.docx` giống từng byte so với v3.2.0.

## 3.2.0 — Bố cục mới V10.4, bộ lọc thông minh HAK_SMART_FILTER, hoàn tất 28/28 E2E suites và cải tiến sao lưu/khôi phục

### Điểm mới

- **Bố cục mới V10.4 & HAK Enterprise Design System:** Tái cấu trúc quy trình nhập liệu theo chuẩn phân hệ, phân nhóm Danh mục (`#navDm`), chuẩn hóa điều hướng combobox đối tác/xe và thanh thao tác Action Bar.
- **Bộ lọc thông minh HAK_SMART_FILTER:** Tích hợp bộ lọc tìm kiếm nâng cao cho danh mục đối tượng, xe và bảng nhập liệu.
- **Hoàn tất 28/28 E2E Test Suites:** 100% các bộ kịch bản kiểm thử tự động trên Electron + SQLite vượt qua thành công trên môi trường Windows.
- **Sửa các lỗi thực tế:** Bảo lưu mảng nhân công có ID hợp lệ khi chuyển đổi mô hình ký trực tiếp; sửa tính khối lượng báo cáo đội khi còn phiếu chưa gán đội; hỗ trợ song song cả số phiếu và mã liên kết cho biến số và lương phụ cấp.
- **Tối ưu hiển thị compact:** Tinh chỉnh khoảng cách đệm trên màn hình 1366×768 tỷ lệ zoom 150%, đảm bảo hiển thị đủ 3 dòng và độ tương phản đạt chuẩn AA ≥ 4,5:1.
- **Cải tiến sao lưu và khôi phục:**
  - Sao lưu toàn bộ dạng `.json` mang đủ lịch sử bản chụp các lần chốt lô như `.sqlite`; khôi phục giữ nguyên bản chụp.
  - Chủ rừng cùng ID nội bộ mà CCCD khác hẳn khi khôi phục sẽ dừng lại để đối chiếu, không tự gộp.
  - Thư mục sao lưu SQLite và JSON cài đặt riêng; tự động sao lưu SQLite theo chu kỳ (2 giờ, hằng ngày, hằng tuần).
  - Khôi phục kiểm tra cấu trúc và phiên bản TRƯỚC khi xem trước hay ghi.
- **Bảo toàn bản in:** 206/206 tài liệu biểu mẫu `.docx` giống từng byte so với bản gốc.

## 3.1.0 — Danh mục đối tượng và xe, hợp đồng theo danh sách, phiếu cân trong hợp đồng, phân bổ khối lượng, quy trình nhập chặt hơn

### Điểm mới

- Thông tin rừng và chi tiết hợp đồng có danh sách mục bên trái. Thông tin giao hàng và cước chung thuộc cấp rừng. Cài đặt dùng danh sách dọc.
- Thêm màn xem trước phiếu cân trong ứng dụng, lấy phiếu đã lưu và lọc theo hợp đồng, biển kiểm soát, khoảng ngày. File công cụ in gốc được giữ nguyên.
- Khi khôi phục dữ liệu cũ, nhân công và xe chưa nối được với danh mục xuất hiện trong Cần đối chiếu.
- Hai câu hướng dẫn ở Cài đặt → Hệ thống (thẻ “Thư mục sao lưu” và “Nhắc sao lưu”) không còn nhắc menu “⋯ Thêm” đã bỏ từ 3.0: nay ghi Cài đặt → Sao lưu và khôi phục → Sao lưu toàn bộ (phiếu #15). Có kiểm thử tự động chặn chữ hướng dẫn cũ (“⋯ Thêm”, “Tab Phiếu cân”) ngoài chú thích.
- CCCD 9 hoặc 12 chữ số ở mọi nơi (phiếu #14, quyết định CHỦ): CMND 9 số và CCCD 12 số (kể cả “000049067005”) không còn cùng khóa khi nạp nhân công vào bản nháp (trước đây gộp nhầm hai người, đổi tên người cũ); danh mục lao động / xe cũ, tra cứu Google Sheets (cờ, nhận dạng truy vấn), báo cáo thiếu thông tin nhận CMND 9 số; ô số Excel mất số 0 đầu được bù đúng (8 số → 9 số, 10–11 số → 12 số). Một quy tắc duy nhất ở `src/nhaplieu.js`; không đổi dữ liệu đã lưu, không đổi bản in.
- Phiếu cân dùng một khóa duy nhất (số phiếu bỏ khoảng trắng và viết hoa, cộng ngày cân) khi nạp Excel, dán, thêm tay và nạp từ HoSoKeo. “PA 1” và “PA1” cùng ngày là một phiếu và bị chặn, thông báo nêu dòng và hợp đồng đã có phiếu. Cùng số phiếu nhưng khác ngày là hợp lệ, chỉ cảnh báo; ở bước Cần đối chiếu, “Là chuyến khác” giữ được số phiếu khi ngày khác.
- Thông tin chủ rừng có ô chọn từ Danh mục đối tượng (phiếu #09): chọn thì điền sẵn họ tên, danh xưng, CCCD, ngày cấp, nơi cấp, địa chỉ; hồ sơ giữ bản chụp (sửa danh mục sau không đổi hồ sơ đã lưu), vẫn nhập tay được; CCCD nhập tay trùng người trong danh mục thì cảnh báo, không chặn.
- Xuất BM-08, BM-14 khi có đội chưa có phiếu cân nào (phiếu đã gán hết cho đội khác): hộp cảnh báo như phiếu chưa gán đội, nêu tên đội; vẫn xuất được, số in không đổi.
- Khung xem trước HoSoKeo bỏ ô “Điền tổng … tấn vào Khối lượng khai thác thực tế”: khối lượng thực tế của lô lấy tự động từ tổng phiếu cân, ô này không có nơi để điền.
- **Cảnh báo khi xuất BM-08 / BM-14 còn phiếu cân chưa gán đội (phiếu #03, ND-01, C-02).** Ở chế độ phân bổ “theo phiếu”, phiếu chưa gán đội không được tính cho đội nào, nhưng BM-08 và BM-14 vẫn chia khối lượng theo số người của đội, trong khi màn Phân bổ chỉ ghi “chưa phân bổ” (hai nơi hai kết quả, không ai báo). Theo quyết định của CHỦ (18/11/2026) **không chặn xuất**: các nút xuất BM-08, BM-14, gói “Đợt 2”, “Toàn bộ hồ sơ”, đường in đợt 2 và gói Chỉ xem hiện hộp cảnh báo nêu số phiếu, tổng tấn, tên từng phiếu và phần mỗi đội sẽ in. “Quay lại gán phiếu” không xuất và mở bảng gán phiếu theo đội; “Vẫn xuất, chia theo số người” xuất đúng như trước (số in không đổi: 206/206 tài liệu và 38/38 tài liệu BM-08, BM-14 của ca C-02 giống từng byte). Lựa chọn chỉ áp dụng cho lần xuất đó, một gói chứa cả BM-08 và BM-14 chỉ hỏi một lần. Lô đã chốt hoặc đã dừng (chỉ đọc) không hỏi. Màn Phân bổ và danh sách hợp đồng nêu “x t (n phiếu) chưa gán đội; khi in … chia theo số người” thay cho “0 t” / “—” im lặng. Mục “Phiếu cân chưa gán đội” ở Kiểm tra trước khi xuất giữ mức đối chiếu. Lõi: `HAKPhanBo.chuaGanXuat` (`src/phanbo.js`), `b.phieuChuaGan` ở `doiOf`; kiểm thử: `tests/phieu-chua-gan.test.js`, `scripts/e2e-phieu-chua-gan.js`. Công cụ `scripts/so-ban-in.js` chọn “Vẫn xuất” khi hộp hiện để vẫn so được bản in với bản cũ.

- Số liệu khối lượng thống nhất (phiếu #02): tổng phiếu cân tính một cách duy nhất (làm tròn từng phiếu đến kg rồi cộng) ở Tổng quan, tổng hợp, phân bổ, đọc phiếu cân và bộ lọc HoSoKeo; khối lượng phiếu ghi từ HoSoKeo làm tròn đến kg (dữ liệu cũ không bị đổi). Mọi so sánh biển số xe dùng một quy tắc chuẩn hóa; báo trùng biển số theo biển đã chuẩn hóa.
- Danh mục là nguồn người và xe (phiếu #05): lưu lô không còn ghi vào danh mục lao động / xe cũ; người hoặc xe mới của lô được hỏi rồi thêm vào Danh mục đối tượng / Danh mục xe và dòng lô nối theo ID. Chủ rừng, thành viên, người ký nhập CCCD 9 hoặc 12 số; mã chủ rừng so không phân biệt hoa thường; cảnh báo (không chặn) khi CCCD chủ rừng trùng chủ rừng khác, khi thể nhân / pháp nhân trùng tên mà chưa có CCCD / MST, và khi Nhân công, Tài xế thiếu ngày sinh, ngày cấp, nơi cấp, địa chỉ. Khôi phục gói lô nối thể nhân không CCCD theo họ tên và ngày sinh; không xác định duy nhất thì đưa vào Cần đối chiếu, không nhân đôi.
- Đầu lô gọn (phiếu #10): tab chủ rừng, đường dẫn, “Danh sách rừng · Tiến độ”, Sao lưu và + Rừng mới nằm trong một khối đầu lô hai hàng; nút Xóa rừng chuyển xuống cuối khung Thông tin rừng. Ở khung hẹp (đến 1100 px) cột mục lên thành thanh ngang, bảng phiếu cân được cả bề rộng.
- Phím Tab và Esc trong hộp thoại (phiếu #10): Tab / Shift+Tab giữ trong hộp trên cùng; Esc ở hộp “Lưu / Bỏ / Quay lại” là Quay lại; tiêu điểm đầu vào nút Lưu. Nhãn “Chọn file Excel” đổi thành “Nhập Excel” như Danh mục.
- Tương phản màu (phiếu #10): màu lỗi ở bảng màu có skin đạt 4,5:1 (nền sáng); nhãn trung tính ở chế độ tối không đè màu nhãn đạt / cảnh báo / lỗi.

Cấu trúc SQLite v15 (chuyển một chiều, tự sao lưu file trước khi chuyển). Biểu mẫu in ra không đổi so với 2.3.0 (so bản in: 206/206 tài liệu giống từng byte).

### Bố cục
- Cài đặt nằm trên thanh chính; Hướng dẫn, Giao diện, Sao lưu và khôi phục chuyển vào Cài đặt (bỏ menu “⋯ Thêm”, thanh chính một dòng ở 1024 px / 150 %).
- Tab Nhân công / Vận chuyển mở **danh sách hợp đồng**; chọn (chuột hoặc Enter) → trang chi tiết có tên rừng, số hợp đồng, “Quay lại danh sách”; lưu xong ở lại đúng hợp đồng.
- Rời màn còn thay đổi: Lưu / Bỏ thay đổi / Tiếp tục chỉnh sửa. Mở danh mục từ hợp đồng rồi “Quay lại” đúng chỗ, giữ bản đang nhập.
- Màn hợp đồng gọn hơn (phiếu #06): đầu hợp đồng một dòng, một thanh công cụ (Thêm / Chọn file / Dán / Tải mẫu / Tra cứu HoSoKeo / In), tiêu đề cột một dòng, cột Thao tác không đè cột số, hai nút Sửa / Xóa đã lưu nằm ngang; ở 1366×768 phóng 150 % thấy được ít nhất 3 dòng phiếu cân khi mở.
- Khung cảnh báo không chặn của các bảng nhân công, xe, phiếu cân gập thành một dòng có số lượng và nút “Xem” (không mất cảnh báo nào); khung lỗi chặn luôn mở.
- Cài đặt không còn cột chủ rừng bên trái; bảng danh mục rỗng không có thanh cuộn ngang. Tab Xuất hồ sơ: khung Vòng đời và Sổ văn bản gập mặc định (Vòng đời tự mở khi lô đã chốt, dừng hoặc lưu trữ). Nút đang bị khóa (như Chốt hồ sơ) có viền nét đứt, chữ đạt tương phản AA. Chữ hướng dẫn cũ (“⋯ Thêm”, “Tab Phiếu cân”) đã sửa trong ứng dụng và `docs/HUONG_DAN.md`.

### Danh mục
- **Danh mục đối tượng:** pháp nhân (đại diện, chức danh) / thể nhân (bảng Đối tác: họ tên, CCCD, ngày cấp, nơi cấp, hạn CCCD, thường trú, giới tính, SĐT, GPLX và hạn, vị trí mặc định, chức danh ký); vai trò Nhân công / Tài xế / Chủ xe; quyền ký Vận chuyển / Nhân công riêng; lọc theo vai trò, tìm, ngừng sử dụng; Excel xem trước (mới / trùng / thay đổi / lỗi); CCCD trùng, MST, GPLX được kiểm; số lưu dạng văn bản.
- **Danh mục xe:** BKS chuẩn hóa không trùng, chủ xe theo ID; Excel xem trước, sửa dòng tại chỗ, BKS đã có khác chủ xe hiện cả hai.
- **Vị trí:** mã ổn định; đổi tên cập nhật định biên, định mức BHLĐ, đơn giá, dòng nhân công của lô đang lập. Có lô đã chốt dùng tên cũ thì định biên / định mức BHLĐ giữ mục tên cũ (thêm bản tên mới) để in lại lô chốt đúng.

### Hợp đồng, phiếu cân, phân bổ
- Người ký HĐVC từ đối tượng có quyền ký Vận chuyển (`hdvc.benKy`); bên nhận khoán từ quyền ký Nhân công (`doi.benNhanKhoan`); thành viên từ vai trò Nhân công (một người được ở hai đội, ghi chú đội khác); xe từ Danh mục xe, mỗi xe một lần trong một hợp đồng. Dòng lô nối `nguoiId`, `viTriId`, `xeId`; ID dòng giữ khi sửa. Xóa người có chấm công: liệt kê ngày công trước.
- Phiếu cân trong HĐVC: Tra cứu HoSoKeo / Nạp Excel / Thêm phiếu cân; phiếu mới vào hợp đồng đang mở, xe chỉ tự chọn khi BKS khớp duy nhất (khớp duy nhất xe của hợp đồng khác thì theo xe đó); bảng kết quả nạp (rừng, hợp đồng, số phiếu, ngày, KL, BKS nguồn, xe); đổi xe lưu ID dòng giữ BKS gốc; chuyển hợp đồng chọn lại xe. In BM-09/10 theo hợp đồng của phiếu.
- Phân bổ khối lượng: một đội nhận toàn bộ; hai đội chọn phiếu theo đội hoặc chia đều (kg nguyên, 1 kg lẻ cho đội đứng trước); từ ba đội theo phiếu; xem trước, “Lưu phân bổ”; lô chốt dùng kết quả lúc chốt.

### Lưu, chuyển dữ liệu, sao lưu
- Kiểm quan hệ ở tầng SQLite trong một giao dịch (mã `QUAN_HE`: đội, hợp đồng, xe, phiếu, ID dòng trùng) — sai thì không ghi gì.
- v15: dựng danh mục mới từ danh mục cũ (mỗi CCCD một người, gộp vai trò; doanh nghiệp → pháp nhân), gán ID dòng, chuyển chấm công sang ID dòng khi duy nhất, nối hợp đồng / phiếu; không xác định duy nhất → **Cần đối chiếu**, dữ liệu gốc giữ; lô đã chốt không đổi.
- Gói lô mang danh mục lô dùng; khôi phục trên máy danh mục khác nối theo CCCD / MST / BKS / tên vị trí (người cùng CCCD khác tên → Cần đối chiếu).

### Kiểm thử
- Mới: `e2e-danhmuc30`, `e2e-hopdong30`, `e2e-phieu30`, `e2e-phanbo30`, `e2e-nghiemthu30`, `e2e-nangcap30`; unit `danhmuc3`, `chuyendoi30`, `quanhe`, `goidm`. Bỏ `e2e-danhmuc`, `e2e-nguoi-chung`, `e2e-doitac-mot-nguon` (màn cũ đã thay). Các e2e viết trước 3.0 chạy qua lớp `scripts/_hd30.js` (tự mở hợp đồng khi bấm tab).

## 2.3.0 — Dán từ Excel, mục lục gói in, phụ lục in lại / ký lại, gói Chỉ xem, in trong app, hướng dẫn lần đầu

Sáu tính năng còn lại của kế hoạch 2.2 (đợt 1–3). Không đổi cấu trúc SQLite (vẫn v14), không đổi cách tính và nội dung các biểu mẫu BM-01…BM-20.

### Sửa lỗi sau rà soát PR #17–#21
| # | Lỗi (trước) | Sửa (sau) |
| --- | --- | --- |
| 1 | PR #21 đổi hẳn cách chia khối lượng / diện tích cho các đội sang “phần dư lớn nhất”: lô nhiều đội đổi số so với bản đã in (10 tấn chia 3 đội: 3,333 / 3,333 / 3,334 thành 3,334 / 3,333 / 3,333), mẫu đã in hoặc đã ký chuyển “dữ liệu đổi”, lô đã chốt in lại ra số khác giấy đã ký | `src/doi.js` `chia`: giữ cách chia từ trước (làm tròn từng đội, đội cuối nhận phần còn lại) nên **số của mọi lô giữ nguyên như bản đã in**; chỉ khi cách đó cho một đội số âm (lượng rất nhỏ: 0,002 tấn chia 4 đội ra -0,001) mới chia lại theo phần dư lớn nhất. Test: 3.000 bộ lượng / số đội ngẫu nhiên — tổng khớp đến 0,001, không âm, bằng cách cũ khi cách cũ không âm |
| 4 | Lệnh khôi phục `import:preview` / `import:apply` chuyển nguyên tùy chọn từ giao diện xuống tiến trình chính: khi gộp phần “lịch sử bản chụp” của PR #20 (`goiLichSu`), giao diện chèn được bản chụp tùy ý vào bảng `chot_goi` mà không qua kiểm tra | Tùy chọn từ giao diện đi qua `LoRung.optsKhoiPhuc`: chỉ giữ cách xử lý (`strategy`) và mã lô mới (`maMoi`); mọi tùy chọn nội bộ bị bỏ |

### Tính năng mới
1. **Dán từ Excel** (tab Nhân công, Vận chuyển, khung phiếu cân): nút “Dán từ Excel” mở hộp dán; chép vùng ô trong Excel / Google Sheets **gồm dòng tiêu đề** rồi Ctrl+V. Dữ liệu đi qua đúng đường nạp file (cùng kiểm tra, cùng bảng so sánh thêm / cập nhật / bỏ, cùng bản nháp và nút Lưu). Số ghi kiểu Việt Nam (`12,5`, `1.234,5`) thành số; CCCD, điện thoại, số có 0 đứng đầu, ngày giữ nguyên. Thiếu tiêu đề hoặc thiếu cột bắt buộc thì báo tên cột và không nạp.
2. **Mục lục gói in:** gói “Toàn bộ hồ sơ”, đợt 1, đợt 2 có thêm `00_Muc_luc.docx` đứng đầu: STT, mã mẫu, tên biểu mẫu, lập cho ai (đội / đội xe), số bản, tên file.
3. **Phụ lục in lại, ký lại:** Sổ in ghi “ký lại lần N” từ lần ký thứ hai; nút “Phụ lục in lại, ký lại” (tab Xuất hồ sơ) tải bảng theo dõi các mẫu đã in hoặc ký từ lần thứ hai, kèm thời điểm và lý do.
4. **Gói Chỉ xem:** “Tải gói Chỉ xem (.zip)” gồm `XEM_HO_SO.html` (một trang tóm tắt tự đủ, không script, mở bằng trình duyệt bất kỳ: chủ rừng, lô, đội, đội xe và số văn bản, nhân công, xe, phiếu cân, chốt hồ sơ, nhật ký vòng đời) và thư mục `Bieu_mau` (các biểu mẫu xuất được + mục lục). Gói không có file sao lưu nên không nhập lại được vào phần mềm.
5. **In trong app:** “In tóm tắt hồ sơ” (tab Xuất hồ sơ) và “In báo cáo” (màn Báo cáo) mở hộp thoại in của Windows. Bản in dựng trong cửa sổ ẩn không chạy script. Biểu mẫu Word vẫn in bằng Word như cũ.
6. **Hướng dẫn lần đầu:** màn Tổng quan hiện “Hướng dẫn bắt đầu” gồm 6 bước, tự đánh dấu bước đã xong theo dữ liệu, có nút mở đúng nơi làm bước kế tiếp; ẩn được và mở lại ở ⋯ Thêm → Hướng dẫn bắt đầu.

### Kiểm thử
- `tests/tienich.test.js` (7 ca), `scripts/e2e-tien-ich.js` (25 kiểm tra, Electron + SQLite thật; lệnh in được kiểm bằng cách ghi PDF).

## 2.3.0 (phần) — hiệu năng mở app và lưu, kho sao lưu, tự sao lưu khi đóng, Ctrl+S

Rà soát hiệu năng, quy trình nhập liệu và sao lưu trên bộ dữ liệu lớn. Không đổi cấu trúc SQLite (vẫn v14), không đổi cách tính và nội dung biểu mẫu, không đổi chữ ký nội dung của mẫu đã in.

### Hiệu năng
Đo bằng `scripts/perf-dulieu.js` (Electron thật, SQLite thật): 50 lô × 2.000 phiếu cân, danh mục 4.500 dòng lao động và 900 dòng xe, 10 lô đã chốt, file SQLite ~33 MB. Cùng một máy, trước và sau; số đo ở `reports/perf/truoc-C.json`, `reports/perf/sau-C.json`. Mỗi chỉ số đo một lượt (thời gian vẽ là số nhỏ nhất của 3 lần); các lượt đo lặp lại dao động khoảng ±30 %.

| Chỉ số | Trước | Sau |
| --- | --- | --- |
| Mở app đến khi hiện Tổng quan | 8.061 ms | 3.234 ms |
| Lưu lần đầu khi sửa một ô (lưu toàn bộ) | 2.410 ms | 1.631 ms |
| Lưu lần sau khi sửa một ô (theo phần thay đổi) | 1.087 ms | 711 ms |
| Lưu một dòng danh mục | 282 ms | 187 ms |
| Vẽ tab Xuất hồ sơ (tất cả) | 175 ms | 56 ms |

| # | Nguyên nhân (trước) | Sửa (sau) |
| --- | --- | --- |
| C1 | Màn Tổng quan, Báo cáo, Việc cần làm tính **chữ ký nội dung** của mọi biểu mẫu cho **mọi lô** (dựng và băm cả file Word sẽ in), dù chữ ký chỉ dùng để so với mẫu đã xác nhận in: ~6 trong 8 giây mở app | Chữ ký tính **khi cần đọc** và nhớ theo phiên bản dữ liệu (`ui/app/13`, `src/quytrinh.js` `evaluate`): mẫu chưa in không dựng file; mẫu đã in vẫn so đúng chữ ký như cũ. Kết quả trạng thái in / ký không đổi |
| C2 | Mỗi lần sửa một ô, chỉ mục kiểm tra chéo lô phân tích lại ngày giờ của **mọi phiếu cân ở mọi lô** | Khóa phiếu, biển số chuẩn hóa, khoảng giờ cân nhớ theo từng phiếu, kèm các trường nguồn và so lại mỗi lần dùng (`src/cheolo.js`): phiếu không đổi thì không phân tích lại |
| C3 | Mỗi lần lưu, từng lô đã chốt / dừng được giải mã và chuẩn hóa toàn bộ để kiểm khóa chỉ đọc | Lô giống hệt bản đã lưu (so chuỗi JSON) được bỏ qua ngay (`ui/app/02` `loKhoaViPham`); lô có khác vẫn kiểm đầy đủ |
| C4 | Mở app: mọi dòng nhân công / xe đều tra danh mục để gán ngày chụp, kể cả dòng đã có ngày chụp | Chỉ tra danh mục cho dòng chưa có ngày chụp (`src/danhmuc.js` `ganNgayChup`) |

### Sao lưu và lưu trữ
1. **Kho sao lưu** (Cài đặt → **Sao lưu và khôi phục**; cũng mở từ nhãn “Tự sao lưu: …” ở thanh ngữ cảnh và ⋯ Thêm): liệt kê mọi bản sao lưu trong thư mục sao lưu và thư mục thứ hai theo loại (tự động hằng ngày, sao lưu toàn bộ, trước khi nâng cấp / khôi phục / khôi phục lô / xóa), thời điểm, dung lượng, tổng dung lượng, lọc theo loại; **kiểm tra** từng bản (toàn vẹn, phiên bản cấu trúc, số chủ rừng / lô); **xóa** bản cũ. Chỉ thao tác trên file đang có trong danh sách; file tên khác và cơ sở dữ liệu đang dùng không bao giờ bị đụng (`src/khosaoluu.js`).
2. **Khôi phục từ bản `.sqlite` ngay trong app** (trước đây phải đóng phần mềm và chép file bằng tay): xem trước số liệu trên máy và trong bản sao lưu → thay toàn bộ. Đi qua đúng đường “Khôi phục toàn bộ → Thay toàn bộ” (`Store.applyImport`): kiểm toàn vẹn hồ sơ đã chốt, sao lưu dữ liệu hiện tại (`truoc-khoi-phuc-…`), ghi trong một giao dịch; bản hỏng dừng trước khi sao lưu hay ghi. Bản cấu trúc cũ được nâng cấp trên bản chép tạm, file sao lưu gốc không đổi. Bản chụp của các lần chốt trước trong bản sao lưu được chép theo. Hoàn tác bằng cách khôi phục lại từ bản “Trước khi khôi phục”.
3. **Tự sao lưu chứa việc làm trong ngày:** trước đây bản của hôm nay chỉ tạo lúc mở lần đầu trong ngày (tức dữ liệu của hôm trước) và phiên làm việc để máy qua đêm không có bản mới. Nay khi **đóng phần mềm** và **mỗi 2 giờ**, nếu dữ liệu đã đổi thì bản của hôm nay được làm mới: ghi file tạm, kiểm tra, rồi thay bằng một lần đổi tên (lỗi thì bản cũ còn nguyên); thư mục sao lưu thứ hai thay theo. Không đổi gì thì không ghi lại. Nút **Tự sao lưu ngay** ở kho.
4. **Giới hạn dung lượng:** bản tự tạo `truoc-khoi-phuc-…` và `truoc-khoi-phuc-lo-…` giữ 20 bản gần nhất mỗi loại (như `truoc-xoa-…`). Trước đây không giới hạn, mỗi bản là cả cơ sở dữ liệu.
5. **Nhãn trạng thái sao lưu** ở thanh ngữ cảnh: “Tự sao lưu: hôm nay / hôm qua / N ngày trước / tắt”, đổi màu cảnh báo khi đến hạn nhắc sao lưu toàn bộ.

### Dễ dùng
- **Ctrl+S** lưu lô đang mở (như nút “Lưu dữ liệu vào lô”); ô đang gõ được ghi nhận trước khi lưu.
- **Menu ⋯ Thêm bị cắt chữ** khi thanh điều hướng xuống dòng (cửa sổ rộng 1366 trở xuống, là cỡ mặc định): bảng chọn tràn ra ngoài mép trái. Nay tự canh trái khi tràn và không vượt quá cửa sổ.

### Sửa lỗi
| # | Lỗi (trước) | Sửa (sau) |
| --- | --- | --- |
| D1 | Lô đang có thay đổi chưa lưu, rồi khôi phục chính lô đó (hoặc khôi phục toàn bộ): dấu “chưa lưu” và bản đã lưu cũ còn lại, nên lần lưu kế tiếp có thể ghi lại bản **trước khi khôi phục** của lô | Sau mọi lần thay dữ liệu từ ngoài (khôi phục toàn bộ, khôi phục lô, khôi phục từ kho), bản nháp, dấu “chưa lưu” và bản đã lưu được đặt lại theo đúng dữ liệu vừa nạp (`dbThayToanBo`, `ui/app/29`) |

### Kiểm thử
- `tests/khosaoluu.test.js` (9 ca): liệt kê theo loại, kiểm tra bản tốt / hỏng / cắt dở, khôi phục và hoàn tác, bản hỏng không ghi gì, lô đã chốt hai lần còn nguyên vẹn sau khôi phục, bản v1.0.0, xóa có giới hạn, làm mới bản tự sao lưu, giữ 20 bản.
- `scripts/e2e-kho-sao-luu.js` (34 kiểm tra, Electron + SQLite thật): đóng app làm mới bản hôm nay, màn kho, khôi phục từ bản tốt và bản hỏng, hoàn tác, xóa, đường dẫn ngoài danh sách bị từ chối, Tự sao lưu ngay, Ctrl+S, menu ⋯ Thêm ở cửa sổ hẹp.

### Chưa làm (đề xuất)
- Lần lưu đầu tiên sau khi mở app vẫn là lưu toàn bộ (hành vi có chủ ý, có kiểm thử `e2e-luudelta`); với bộ dữ liệu đo ở trên mất khoảng 1,6 giây, một lần mỗi phiên.
- Mở app vẫn nạp toàn bộ hồ sơ vào bộ nhớ; với hàng trăm lô nên chuyển sang nạp theo lô khi mở.

## 2.2.0 — Bản ổn định sau v1.4.33

Bản 2.2.0 gồm phần này và bốn phần “2.2.0 (phần)” bên dưới, cùng các bản 2.1.0 và 2.0.0 (chưa từng phát hành công khai; bản công khai gần nhất là v1.4.33).

### Thay đổi
- **Phiên bản hiện ở đầu trang** (“· Phiên bản 2.2.0” cạnh tên ứng dụng), lấy từ chính bản cài; kiểm tra khói của bộ cài (kể cả sau khi cài đè lên v1.4.33) so số này với `package.json`.
- **Phạm vi gói sao lưu riêng lô đối với lô đã chốt nhiều lần** được ghi rõ ở thông báo sau khi sao lưu, màn xem trước khi khôi phục và hướng dẫn: gói chỉ mang **bản chốt hiện hành** (một bản chụp, phiên bản và dấu vân tay giữ nguyên); bản chụp các lần chốt trước ở lại máy đã chốt (bảng `chot_goi`, có trong Sao lưu toàn bộ dạng SQLite); nhật ký vòng đời (lần chốt, lý do mở khóa, dấu vân tay từng lần) đi theo gói. Hành vi sao lưu, khôi phục không đổi.

### Sửa lỗi
- **Đóng ứng dụng và chọn “Bỏ thay đổi và đóng” mà lần mở sau vẫn hỏi khôi phục bản nháp** (lộ ra ở CI Windows, lượt 141): sau khi bản nháp tạm được xóa lúc đóng, bộ hẹn giờ tự lưu 1 giây của giao diện có thể ghi lại nó trước khi cửa sổ kịp đóng, và lần xóa có thể chưa kịp ghi xuống đĩa. Nay việc tự lưu tạm dừng hẳn khi đang đóng có chủ ý, và ứng dụng ép ghi bộ nhớ trình duyệt xuống đĩa trước khi đóng. Hồi quy: `scripts/e2e-nhap-tam.js`.

- **Số văn bản theo đội xe cố định theo từng đội (sửa lỗi của mốc `d6e46c4`):** ở mốc đó, khi hai đội xe cùng dùng một số, hậu tố `.1`, `.2` được tính theo **vị trí đội lúc xuất**, nên số của một đội đổi khi đổi thứ tự đội, thêm hoặc xóa đội khác (A: `07.1` → `07.2` → `07`). Nay **không còn hậu tố theo vị trí**: số in ra là số riêng **lưu theo ID đội xe**, để trống thì là số chung của lô.
  - **Cấp số:** Sổ văn bản (tab Xuất hồ sơ) → “Điền … ô số còn trống theo quy tắc” lưu số đầy đủ `STT/NĂM/HĐVC-MÃLÔ` và `STT/NĂM/XNKL-MÃLÔ` cho từng đội xe; STT đã cấp không cấp lại cho đội khác kể cả khi đội bị xóa. Xem trước và tải file không cấp số, không ghi gì.
  - **Hồ sơ cũ đã in bằng số chung:** Sổ văn bản hiện số đang in của từng đội xe và nút **“Xác nhận số trên giấy”** (lưu số đầy đủ đó thành số riêng của đúng đội); chỉ ghi sau khi bấm và “Lưu dữ liệu vào lô”. Lô đã chốt vẫn chỉ đọc (mở khóa có lý do nếu cần sửa).
  - **Trùng số:** các đội xe cùng in số chung của lô → mục đối chiếu “Số văn bản đội xe dùng chung” nêu đủ các đội (không chặn). Hai đội có **số riêng trùng nhau** → mục chặn “Số văn bản đội xe trùng” nêu cả hai đội, chặn BM-04, BM-09, BM-10 của các đội đó cho tới khi người dùng sửa; phần mềm không tự nối hậu tố vào số đã lưu.
  - BM-04 dùng số hợp đồng của đội xe; BM-09, BM-10 tham chiếu hợp đồng và biên bản của cùng đội; cùng một nguồn số ở xem trước, xuất lẻ, ZIP, in đầy đủ và in đè. Hồi quy: `tests/sovb-doixe.test.js`, `scripts/e2e-so-doi-xe.js` (31 kiểm tra), `scripts/e2e-nhieu-doi-xe.js` (17 kiểm tra, lô bốn đội xe: không giới hạn số đội; in nền rồi in đè với số riêng từng đội), `scripts/e2e-nghiemthu-dot2.js`.
- **Lịch sử bản chụp các lần chốt:** khung Vòng đời lô liệt kê mọi bản chụp còn lưu trên máy (phiên bản, dấu vân tay, thời điểm), kiểm riêng từng bản; bản chụp cũ hỏng được báo kèm mã lô, phiên bản, lý do và không ảnh hưởng bản hiện hành. Bản chụp cũ đi theo **Sao lưu toàn bộ (.sqlite)**; gói sao lưu riêng lô chỉ mang bản hiện hành (ghi rõ ở cả hai nơi). Hồi quy: `scripts/e2e-chot-sqlite.js` (19 kiểm tra).
- **Chế độ kiểm thử:** file tải về được ghi ở thư mục tạm rồi đổi tên khi xong, để bộ kiểm thử không đọc phải file đang ghi dở (CI Windows lượt 142, `e2e-haidot`). Không ảnh hưởng bản cài.

### Kiểm thử
- `scripts/e2e-chot-hai-lan.js` (42 kiểm tra, Electron + SQLite thật, chặn mạng): chốt lần 1 → mở khóa có lý do → sửa PA1 12,5 → 13,75 tấn → chốt lần 2; hai bản chụp trong SQLite; gói chỉ mang bản lần 2; khôi phục vào cơ sở dữ liệu mới (chỉ đọc, nguyên vẹn, giữ lý do mở khóa, dấu vân tay không đổi); gói thiếu bản chụp, sai dấu vân tay, JSON cắt dở dừng ở xem trước (nêu mã lô, phiên bản, lý do), máy đích và file nguồn giữ nguyên.
- `scripts/e2e-nghiemthu-dot2.js` bổ sung: tiền công (BM-08, BM-14) và cước (BM-10) đối chiếu bảng tính tay; số biên bản, ngày; tờ nền và tờ in đè cùng khổ giấy, chiều giấy, lề, đầu/chân trang; in đè chỉ hiện nội dung bổ sung.
- `tests/phien-ban.test.js`: `package.json`, `package-lock.json`, tên bộ cài, CHANGELOG và ghi chú phát hành cùng một số phiên bản, lớn hơn bản công khai gần nhất.

## 2.2.0 (phần) — toàn vẹn hồ sơ đã chốt và nghiệm thu in đợt 2 (mốc tái hiện cce3907)

### Sửa lỗi
| # | Lỗi (trước) | Sửa (sau) |
| --- | --- | --- |
| T1 | Chốt lô rồi đổi riêng `f.chot.hash`: `nguyenVen()` vẫn trả `true` (dấu vân tay của gói không được kiểm) | `src/vongdoi.js` kiểm **riêng hai điều kiện**: (1) gói lưu lúc chốt đúng cấu trúc và dấu vân tay tính từ **chính chuỗi gói** khớp `chot.hash`; (2) dữ liệu nghiệp vụ hiện tại khớp bản chụp. Đổi `chot.hash` → “Dấu vân tay không khớp” |
| T2 | `f.chot.goi = "{"` (JSON cắt dở): `nguyenVen()` ném `SyntaxError`, màn hình lô hỏng | Không bao giờ ném lỗi: “Gói hỏng (JSON)”; lô vẫn mở được ở chế độ chỉ đọc, các lô khác không ảnh hưởng |

Kết quả kiểm (`kiemToanVen`): `nguyen-ven`, `chua-chot`, `thieu-goi`, `thieu-hash`, `json-hong`, `sai-cau-truc`, `hash-khong-khop`, `du-lieu-khac`; `nguyenVen()` vẫn là boolean cho nơi cũ. Dữ liệu so bằng chuỗi chuẩn (khóa sắp thứ tự) sau khi chuẩn hóa cấu trúc đội, bỏ các khóa vòng đời (`chot`, `luuTru`, `dung`, `nhatKy`): gói do bản cũ tạo (lô chưa có đội, nhật ký trong gói) không bị báo nhầm; ghi nhật ký, lưu trữ sau khi chốt vẫn là nguyên vẹn.

### Thay đổi hành vi người dùng cần biết
- **Lô đã chốt có gói bất thường:** dải đỏ nêu mã lô, phiên bản chốt và lý do; lô vẫn mở chỉ đọc để đối chiếu. Phần mềm **không** tự mở khóa, tự chốt lại hay tính dấu vân tay mới cho gói cũ (`hashDL` chỉ ghi khi gói qua kiểm). Mở khóa vẫn bắt buộc lý do và ghi nhật ký.
- **Khôi phục một lô / khôi phục toàn bộ:** lô đã chốt trong file có gói hỏng, dấu vân tay sai, sai cấu trúc hoặc dữ liệu khác bản chụp → dừng ở bước xem trước (không có nút ghi; khôi phục toàn bộ khóa mọi cách xử lý, kể cả thay toàn bộ); tiến trình chính cũng từ chối (mã `GOI_HONG`) trước khi sao lưu hay ghi. Hồ sơ trên máy, các lô khác và file nguồn giữ nguyên; chọn bản sao lưu khác để đối chiếu.
- **Sao lưu một lô có gói hỏng:** vẫn ghi file (để đối chiếu) nhưng báo rõ file đó sẽ không khôi phục được.

### Kiểm thử
- `tests/toanven.test.js` (12 ca, gồm hồi quy T1, T2 và khôi phục thất bại); `scripts/e2e-toanven.js` (Electron + SQLite thật: hỏng gói ngay trong SQLite, đóng mở lại, sáu loại gói sao lưu, gói bản cũ, khôi phục toàn bộ).
- `scripts/e2e-nghiemthu-dot2.js`: nghiệm thu in đợt 2 (BM-08, 09, 10, 14) bằng dữ liệu đã lưu — ca in cả bộ trên giấy trắng; ca in nền → xác nhận → đóng mở → bổ sung → đóng mở → in đè đúng mẫu, đúng đội xe; bảng kê BM-09 trang riêng; không có “BẢN NHÁP”; đổi PDF bằng LibreOffice và chồng ảnh nền + in đè (CI tải lên artifact).

## 2.2.0 (phần) — sửa lỗi A1–A4 và hiệu năng B5–B7 (nền: nhánh sửa năm mục)

### Sửa lỗi
| # | Lỗi (trước) | Sửa (sau) |
| --- | --- | --- |
| A1 | Lô nhiều đội: bảng so định mức nhân công so định biên với **cả lô**, nên đội nào cũng bị báo lệch hoặc lệch bị che | So với **từng đội**: bảng định biên ở tab Nhân công so với đội đang chọn (ghi rõ tên đội), tab Kiểm tra báo “Số người của đội “X” khác định mức” theo đội; lô một đội giữ như cũ (`scripts/e2e-dinhbien-doi.js`) |
| A2 | Kiểm tra chéo lô tính sản lượng dự kiến và tổng phiếu cân bằng công thức riêng (bỏ qua định mức keo mặc định, làm tròn khác màn hình) | Dùng chung `HAKDinhMuc.sanLuongDuKien`, `dinhMucLo`, `tongPhieuTan` (`src/dinhmuc.js`) cho màn hình và `src/cheolo.js`: cùng định mức (kể cả mặc định), cùng cách làm tròn |
| A3 | Trạng thái in đợt 2 của BM-09 / BM-10 lưu theo CCCD (hoặc tên) người ký: đổi người ký của đội xe (ví dụ sang doanh nghiệp) làm mất lịch sử “đã in” | Khóa theo **đội xe** (`09:hd:<id đội xe>`). SQLite **v12** đổi khóa cũ sang khóa mới (lô đã chốt / đã dừng giữ nguyên, giao diện vẫn đọc khóa cũ); bản sao lưu cũ nạp vào cũng đổi (`withDefaults`) (`scripts/e2e-inkhoa-doixe.js`) |
| A4 | Dòng nhân công / xe nhập trước khi có ngày chụp danh mục (`_dmNgay`) bị coi là chụp từ rất lâu: gặp danh mục khác là đề nghị “cập nhật” lùi về số cũ, kể cả khi lô đã sửa tay sau đó | SQLite **v11** gán ngày chụp cho dòng cũ = ngày cập nhật của dòng danh mục hiện hành (không có thì ngày nâng cấp); chỉ dòng chưa có ngày chụp, không đụng lô đã chốt / dừng; bản sao lưu cũ nạp vào cũng gán (`scripts/e2e-ngaychup.js`) |

### Hiệu năng
Đo bằng `scripts/perf-dulieu.js` (Electron thật, SQLite thật): 50 lô × 2.000 phiếu cân, mỗi lô 30 nhân công và 15 xe, danh mục 1.500 người và 300 xe × 3 dòng lịch sử, 10 lô đã chốt; file SQLite ~35 MB. Số đo lưu ở `reports/perf/` (`truoc-B.json`, `sau-B7.json`, `sau-B6.json`, `sau-B5.json`). Thời gian vẽ là số nhỏ nhất của 3 lần, máy CI 4 nhân; các lần đo lặp lại dao động khoảng ±30 %.

| Chỉ số | Trước | Sau B7 | Sau B6 | Sau B5 |
| --- | --- | --- | --- | --- |
| Vẽ tab Thông tin rừng (mở lô) | 1.141 ms | 10 ms | 9 ms | 10 ms |
| Vẽ tab Nhân công | 1.169 ms | 23 ms | 27 ms | 32 ms |
| Vẽ tab Vận chuyển | 1.207 ms | 154 ms | 216 ms | 271 ms |
| Vẽ tab Kiểm tra | 1.032 ms | 8 ms | 10 ms | 11 ms |
| Vẽ tab Xuất hồ sơ (tất cả) | 1.899 ms | 249 ms | 254 ms | 253 ms |
| Phần ngoài hồ sơ gửi kèm mỗi lần lưu | 1.267.208 byte | 1.267.208 byte | **19 byte** | 19 byte |
| Sửa một dòng danh mục rồi lưu | (gửi cả danh mục) | — | 325 byte, 369 ms | 325 byte, 423 ms |
| Tổng JSON các lô đọc lên giao diện | 33,2 MB | 33,2 MB | 33,2 MB | **26,8 MB** |
| Lô lớn nhất (lô đã chốt) | 1,18 MB | 1,18 MB | 1,18 MB | **0,54 MB** |

- **B7 — nhớ tạm theo phiên bản dữ liệu.** `dataVer` (ui/app/02) tăng ở mọi đường đổi dữ liệu (`persist`, `persistLo`, `persistNow`, `loVeBanDaLuu`, mọi thao tác bản nháp `HAKStage`, thêm / bỏ bản nháp). Kết quả kiểm tra (`exportCheck`), `gateRaw`, tiến độ từng lô ở danh sách bên trái, chỉ mục chéo lô, phiếu cân sắp theo ngày, hạn giấy tờ xe nhớ theo (khóa hồ sơ, `dataVer`, db): vẽ lại khi dữ liệu không đổi thì không tính lại. Trước đây danh sách lô tính lại kiểm tra của **cả 50 lô** mỗi lần vẽ. `tests/datacver.test.js` quét mã: hàm giao diện nào sửa lô / db mà không tăng phiên bản thì test hỏng (ngoại lệ ghi lý do); `scripts/e2e-nhotam.js` kiểm nhớ tạm trúng / tính lại đúng lúc.
- **B6 — danh mục ra bảng SQLite riêng.** SQLite **v13** chuyển `dmLaoDong`, `dmXeVC`, `dmDoiTac` từ bảng meta (một chuỗi JSON lớn) sang bảng `danh_muc` (mỗi mục một dòng, có băm) và `danh_muc_bang`; đọc lên vẫn là mảng như trước, danh mục rỗng vẫn là `[]`. Lưu toàn bộ chỉ ghi dòng có băm khác; lưu theo phần thay đổi gửi `sideD` (chỉ dòng danh mục, khóa meta, công ty đã đổi), sai dạng thì báo `MISMATCH` và giao diện lưu toàn bộ (`tests/danhmuc-bang.test.js`).
- **B5 — gói đóng băng ra bảng riêng.** SQLite **v14** chuyển `chot.goi` (bản chụp cả lô lúc chốt) sang bảng `chot_goi` (một dòng mỗi lô × phiên bản chốt, giữ cả các phiên bản cũ). JSON lô chỉ còn `chot = {at, nguoi, phienBan, hash, hashDL}`; `hashDL` là dấu vân tay phần dữ liệu nên kiểm “còn nguyên” (`nguyenVen`) không cần nạp gói. Đọc gói qua IPC `db:goiChot`; sao lưu toàn bộ và sao lưu một lô vẫn mang gói như trước; khóa chỉ đọc (`LOCKED`) giữ nguyên (`tests/chotgoi.test.js`, `scripts/e2e-chot-ho-so.js`).

### Nâng cấp dữ liệu
- v11–v14 chạy sau khi sao lưu file (`backups/truoc-nang-cap-v…-len-v14-….sqlite`), một chiều, chạy lại không đổi; bản sao lưu JSON cũ nạp vào được xử lý như migration (`withDefaults`). `scripts/e2e-nangcap-v14.js` dựng dữ liệu ở cấu trúc v8 (main 2.2) rồi mở bằng bản mới; CI chạy bài này ở job Ubuntu.
- Bản in giống từng byte với mốc cce3907: `scripts/so-ban-in.js` cho 198/198 tài liệu giống, 0 khác.

### Giới hạn
- Thời gian **lưu** chưa giảm nhiều (lần lưu đầu sau khi mở app ~2,4–3,7 s, các lần sau ~1,2–2,0 s ở dữ liệu đo): phần lớn là giao diện tuần tự hóa cả 50 lô để so ảnh chụp, việc này nằm ngoài B5–B7.
- Tab Vận chuyển dao động 150–270 ms, tab Xuất 250–420 ms giữa các lần đo trên máy CI; mục tiêu < 300 ms đạt ở số nhỏ nhất của 3 lần nhưng có lần vượt.
- Bản chạy trong trình duyệt (không có Electron) vẫn giữ gói trong lô (lưu vào bộ nhớ trình duyệt như trước).

## 2.2.0 (phần) — sửa năm mục (nền: main 2.2 + bốn lỗi ở mục trên)

### Sửa lỗi
| # | Lỗi (trước) | Sửa (sau) |
| --- | --- | --- |
| 1 | `loTuLoCu` chép luôn `chot`, `luuTru`, `dung`, `nhatKy`, `ref`… của lô nguồn: lô mới tạo từ lô đã chốt bị khóa chỉ đọc ngay, mang gói đóng băng và nhật ký của lô cũ | Chỉ chép **khung lô** theo danh sách trắng (`info` đã lọc, đội, nhân công, đội xe, xe); không bao giờ mang vòng đời, nhật ký, trạng thái in/ký, tham chiếu tra cứu, lịch sử STT, tệp nhập; STT của đội, đội xe cũng không chép |
| 2 | `chupXe`, `chupLaoDong` gán thẳng giá trị danh mục, dòng danh mục thiếu trường làm lô mất dữ liệu (xe có tài xế “Tư” mà danh mục không có tài xế → lô mất tài xế); “mới hơn” báo cả khi danh mục trống; lô sửa sau danh mục vẫn bị đề nghị lùi về số cũ | Chỉ chép trường danh mục **có giá trị**; so lệch chỉ nêu trường danh mục có giá trị và khác lô; mỗi dòng lô lưu **ngày chụp** (`_dmNgay`), chỉ đề nghị cập nhật khi danh mục **mới hơn** lần chụp; thêm thông tin chủ xe cho danh mục xe (CCCD, ngày sinh, ngày cấp, nơi cấp, thường trú, SĐT, loại xe, cà vẹt, người ký) ở form, nhập Excel, chọn từ danh mục |
| 3 | Khóa chỉ đọc chỉ là `fieldset` ở ba tab: sửa được ô tab Xuất hồ sơ vào bản nháp rồi kẹt “Chưa lưu”; áp bản tra cứu Google Sheets ghi thẳng vào lô đã chốt; tầng lưu không biết lô bị khóa | `kiemKhoa(f)` ở mọi đường ghi (cửa chặn sự kiện, `persistLo`, `saveOnce`, tra cứu, nạp Excel, ghi nhận in/ký…); ô nhập và nút ghi bị vô hiệu (tải và in vẫn được); `saveOnce` và `Store.save`/`saveDelta` từ chối thay đổi dữ liệu (kể cả xóa lô) của lô đang chốt/dừng với mã **LOCKED**, trừ khóa vòng đời (`chot`, `luuTru`, `dung`, `nhatKy`) |
| 4 | Mục chặn từ kiểm tra chéo lô và nhiều mục chặn khác chỉ hiện ở màn Kiểm tra; nút tải, gói ZIP, đợt 2 tính riêng bằng `gate()` nên biểu mẫu “bị chặn” vẫn tải được; `bieuMauBiChan` không ai dùng | Nút tải, mục quy trình, gói ZIP, đợt 2 quyết định bằng `HAKKiemTra.chanCho` trên **cùng danh sách** của `exportCheck` (kèm phạm vi đội / đội xe); `gate()` chỉ còn sinh lỗi và điều kiện cấu trúc; mã nhóm cố định trong `src/kiemtra.js` (`NHOM`), test quét mã nguồn buộc mọi nhóm có khai biểu mẫu |
| 5 | Doanh nghiệp ở hai nơi (`dmDonViVC` và `dmDoiTac` chép lúc v8) nên sửa một nơi thì nơi kia lệch; người ký cá nhân của Đối tác không chọn được cho đội xe; nút Sửa doanh nghiệp | Migration **v10** gộp `dmDonViVC` vào `dmDoiTac` (một nguồn); đội xe chọn được người trong đội, người ký cá nhân và doanh nghiệp của Đối tác (chụp lại vào `ben`); sửa đối tác sau đó báo “danh mục đã đổi” và cập nhật có chủ ý; nút Sửa ở Danh mục mở form ngay tại màn đó |

### Thay đổi hành vi người dùng cần biết
- **Lô đã chốt hoặc đã dừng:** ô tab Xuất hồ sơ bị khóa; mọi thao tác ghi (kể cả tra cứu Google Sheets, nạp Excel, xóa lô, khôi phục lô trùng) báo “lô chỉ đọc”. Mở khóa (nhập lý do) hoặc mở lại lô trước khi sửa.
- **Chặn xuất theo từng đội:** lỗi riêng của một đội khai thác chỉ chặn biểu mẫu của đội đó (BM-01, 05, 06, 07, 08, 14, 20); lỗi riêng của một đội xe chỉ chặn biểu mẫu của đội xe đó (BM-04, 09, 10). Biểu mẫu một file cho cả lô (ví dụ BM-02) bị chặn bởi lỗi của bất kỳ đội nào. Gói ZIP bỏ các file bị chặn và nói rõ file nào bị bỏ.
- **Thay đổi mức chặn so với trước (ghi rõ):** lỗi “Hình thức, đơn giá” nay chỉ chặn BM-01, 03, 08, 14, 20 (trước chặn mọi biểu mẫu); lỗi định mức BHLĐ chỉ chặn BM-02 (trước chặn cả gói); mục “Mã lô trùng (dữ liệu cũ)” nay chặn xuất ở mọi nút (trước chỉ hiện ở màn Kiểm tra). Bản in của lô không có mục chặn **giống từng byte** so với main: `scripts/so-ban-in.js` (198 tài liệu của 9 lô thử, số phiếu riêng từng lô) cho 198/198 giống, 0 khác. Lưu ý: nếu hai lô có phiếu cân giống hệt nhau thì BM-08, 09, 10, 14 của chúng nay thật sự bị chặn (trước đây chỉ hiện ở màn Kiểm tra).
- **Danh mục xe** có thêm thông tin chủ xe; dòng danh mục cũ thiếu các trường này vẫn đọc được.
- **Đối tác:** doanh nghiệp vận chuyển nay nằm ở một danh mục (Danh mục → Đối tác); tab Vận chuyển đọc và sửa cùng nơi đó.

### Giới hạn
- Dòng lô nhập trước bản này chưa có ngày chụp danh mục: coi là chụp từ rất lâu, nên gặp danh mục có ngày mới hơn và khác vẫn được đề nghị cập nhật một lần.
- Khôi phục **thay toàn bộ** dữ liệu (nhập bản sao lưu) là thao tác chủ động nên không bị khóa chỉ đọc chặn; khôi phục từng lô đè lên lô đang chốt thì bị chặn.

## 2.2.0 (phần) — sửa bốn lỗi (mốc tái hiện 2d2b3e2)

| # | Lỗi (trước) | Sửa (sau) |
| --- | --- | --- |
| 1 | `src/sovb.js`: xóa đội 01 rồi thêm đội mới thì cấp lại STT 01, dù đã có lịch sử | Lịch sử STT đã cấp lưu theo lô và theo nhóm (`sttDaCap.doi`, `sttDaCap.doiXe`); xóa đội vẫn giữ; đội mới nhận 03. Xem trước và xác nhận điền dùng cùng hàm `capStt`; chỉ điền ô số trống, giữ STT, số nhập tay và số đã in. SQLite **v9** khởi tạo lịch sử từ STT đang lưu và số văn bản dạng `NN/NĂM/…`, không đánh lại số cũ |
| 2 | `src/cheolo.js`: phiếu P1 cùng biển số, cùng ngày nhưng ghi `1/11/2026` và `01/11/2026` không bị phát hiện trùng | Khóa đối chiếu dùng tiện ích ngày lịch chung (`src/dates.js`), số phiếu và biển số chuẩn hóa; ngày thiếu hoặc không có thật không được dùng để kết luận trùng (lỗi ngày vẫn báo ở kiểm tra phiếu cân). Phiếu trùng chặn BM-08, 09, 10, 14 ở xuất riêng, xuất theo gói và in bổ sung đợt 2; không tự xóa hay chuyển phiếu |
| 3 | `src/dinhbien.js`: ô Số người trống hoặc khoảng trắng bị đổi thành 0 | Ô trống bị từ chối kèm số dòng và tên vị trí, giữ nguyên định mức đã lưu (bản gốc và phiên bản có ngày); số 0 do người dùng chủ động nhập vẫn hợp lệ |
| 4 | `src/dinhbien.js`: ngày bắt đầu `31/11/2026` vẫn chọn được bản gốc | Dùng ngày lịch chung. Ngày trống: bản mới nhất; ngày hợp lệ: đúng phiên bản (kể cả đúng ngày hiệu lực); ngày sai khi có nhiều phiên bản: báo rõ ở tab Nhân công, Kiểm tra (chặn BM-06) và màn Định mức, không chọn bản nào, không đổi giá trị ngày gốc |

**Giới hạn khi nâng cấp (v9):** đội khai thác hoặc đội xe đã bị xóa **trước** bản này không có lịch sử; nếu số văn bản của đội đó không còn ở văn bản nào thì STT đó có thể bị cấp lại. Phần mềm không tự đánh lại số cũ và cảnh báo số trùng trong lô và giữa các lô (mục “Số văn bản trùng” ở tab Kiểm tra).

## 2.1.0 — Danh mục dùng chung: nhập một lần, lô chỉ chọn và chụp lại

Quy trình mới nhằm hết nhập trùng và chồng lấn số liệu (thiết kế: `docs/THIET_KE_QUY_TRINH_2_1.md`). Dữ liệu 2.0.0 được nâng cấp tự động (SQLite v7, có sao lưu file `truoc-nang-cap-v6-len-v7`; **không đụng tới dữ liệu rừng**, chỉ dựng thêm danh mục).

### Thay đổi hành vi người dùng cần biết
1. **Màn "Danh mục"** (nút trên thanh menu) có 5 tab: **Chức vụ / vị trí**, **Lao động**, **Xe vận chuyển**, **Định mức BHLĐ**, **Đối tác**.
2. **Danh mục lao động** theo **Mã công nhân = số CCCD**: ngày cập nhật, họ tên, giới tính, ngày sinh, nơi thường trú, ngày cấp, nơi cấp, số điện thoại, chức vụ (Tổ trưởng / Công nhân), vị trí. **Danh mục xe vận chuyển** theo **biển số** (bỏ dấu chấm, gạch, khoảng trắng khi so khớp): chủ xe, tài xế, CCCD, thường trú, ngày cấp, nơi cấp, số GPLX, hạn GPLX, hạn đăng kiểm, hạn bảo hiểm (quá hạn hiện đỏ).
3. **Nhiều dòng theo ngày cập nhật, luôn dùng dòng mới nhất.** Cập nhật = thêm một dòng có ngày mới; cùng khóa và cùng ngày thì thay dòng đó; có lịch sử từng người / xe và xóa được dòng cũ. Nạp được Excel (cột đúng tên như màn hình), dòng lỗi không nạp và được báo rõ.
4. **Chọn từ danh mục khi nhập hợp đồng.** Thêm nhân công / xe vào lô: chọn người / xe từ danh mục (điền sẵn thông tin, chức vụ → vai trò, vị trí → chức danh). Lô **chụp lại** thông tin lúc thêm nên hồ sơ đã in không đổi khi danh mục đổi sau này.
5. **Không nhập hai nơi:** người / xe mới nhập ngay ở lô tự được thêm vào danh mục khi bấm "Lưu dữ liệu vào lô" (người đã có thì không thêm dòng trùng).
6. **"Cập nhật từ danh mục":** khi danh mục có thông tin mới hơn bản chụp trong lô, tab Nhân công / Vận chuyển báo rõ trường nào khác và có nút làm mới **có chủ ý** (chỉ đổi bản nháp; lô đổi khi bấm Lưu dữ liệu vào lô).
7. **Đối tác:** người ký vận chuyển (cá nhân, chống trùng CCCD), doanh nghiệp ký vận chuyển (danh mục đơn vị vận chuyển có sẵn), tổ trưởng ký nhân công (lấy từ danh mục lao động có chức vụ Tổ trưởng).
8. **Định mức BHLĐ** dùng vị trí của danh mục (không nhập vị trí riêng); tab báo vị trí nào chưa khai định mức.

### Việc còn lại (cập nhật)
- Đã làm ở bản 2.2: bảng đơn giá theo vị trí của từng đội (tab Nhân công); danh mục Đối tác dựng sẵn khi nâng cấp (SQLite v8: doanh nghiệp và người ký cá nhân của đội xe); bước CI nâng cấp từ bản dựng 2.0.0.
- Còn lại từ 2.0.0: `db.chucDanhThem` (xem mục dưới).

## 2.0.0 — Cấu trúc bảng mẹ – bảng con (Lô → Đội khai thác, Đội xe, Phiếu cân)

Bản nâng cấp lớn. Dữ liệu 1.4.x được chuyển **một chiều** khi mở bản này lần đầu; phần mềm **sao lưu file dữ liệu trước khi nâng cấp** (`truoc-nang-cap-vN-len-v6…`). Khuyến nghị tự sao lưu thêm (⋯ Thêm → Sao lưu toàn bộ dữ liệu) trước khi cài.

### Thay đổi hành vi người dùng cần biết
1. **Khối lượng thực hiện chỉ lấy từ phiếu cân.** Khối lượng lô = tổng phiếu cân; khối lượng đội = tổng phiếu cân đã gán cho đội. Ô nhập tay "khối lượng thực tế" không còn. Lô cũ đã có số nhập tay: số này chuyển thành **"khối lượng hồ sơ cũ"** chỉ hiển thị ở Thông tin rừng và **vẫn được dùng làm khối lượng lô** (nên bản in không đổi) cho đến khi bấm **Bỏ số hồ sơ cũ, lấy theo phiếu cân**.
2. **Một cách lưu cho lô.** Sửa ô ở bất kỳ khung nào của lô (Thông tin rừng, thông số lương, vận chuyển, giấy tờ, đội, đội xe) đều vào **bản nháp** và hiện thanh **"Chưa lưu"**; chỉ nút **"Lưu dữ liệu vào lô"** (hoặc Enter trong ô) ghi vào SQLite. Các khung không còn nút "Lưu …" riêng. Xuất, in và rời lô khi còn thay đổi chưa lưu sẽ bị khóa hoặc hỏi.
3. **Ký theo đội và đội xe.** Mỗi lô có một hoặc nhiều **đội khai thác** (mỗi Tổ trưởng một đội, mỗi đội một hợp đồng giao khoán, một bộ hồ sơ BM-01/05/06/07/08/14/20 và số văn bản riêng: số hợp đồng thêm hậu tố .1, .2…) và một hoặc nhiều **đội xe** (mỗi đội xe một hợp đồng vận chuyển; người ký là chủ xe / tài xế hoặc doanh nghiệp trong danh mục đơn vị vận chuyển; BM-09, BM-10 theo đội xe).
4. **Phiếu cân gắn đội** (lô một đội tự gán; nhiều đội gán từng dòng hoặc hàng loạt theo bộ lọc, có lọc theo đội xe). Bảng phiếu cân hiện **đội xe** của xe chạy phiếu.
5. **Hạn giấy tờ xe tính theo ngày từng phiếu cân.** Phiếu chạy khi kiểm định, bảo hiểm hoặc GPLX đã hết hạn **chặn BM-09 và BM-10 của đội xe đó** (nêu số phiếu, ngày, giấy tờ). Màn xe vẫn cảnh báo "sắp hết hạn" theo hôm nay.
6. **Nhập Excel theo bảng con.** File nhân công vào đội đang chọn (cột **Đội** tùy chọn); file xe có cột tùy chọn **Đội xe**; file phiếu cân có cột tùy chọn **Đội**. Tên đội lạ báo lỗi dòng. File cũ không có cột mới nạp y như trước.
7. **Danh mục người lao động dùng chung** (theo CCCD): thêm nhân công chọn người đã có ở lô khác; mỗi lô vẫn chụp lại thông tin.
8. **Báo cáo mới:** Sản lượng theo đội khai thác, Vận chuyển theo đội xe; báo cáo Danh sách lao động có cột Đội.
9. **Một bộ kiểm tra cho mỗi lô** (`src/kiemtra.js`): mỗi mục ghi mức (chặn / cần đối chiếu), nhóm, đối tượng (lô / đội / đội xe / dòng), biểu mẫu bị chặn và nơi sửa. Màn Kiểm tra trước khi xuất và bước Chuẩn bị của quy trình hồ sơ đọc từ đó.
10. **Breadcrumb** Chủ rừng › Lô › màn › Đội / Đội xe ở đầu lô.
11. **Bố cục thống nhất** cho màn đội khai thác (tab Nhân công) và đội xe (tab Vận chuyển): chọn đối tượng và thông tin đối tượng → bảng con (nhân công / xe) → **số và ngày văn bản** → thanh Lưu dữ liệu vào lô.

### Trường cũ được bỏ (SQLite v6, có sao lưu file; chuyển một chiều)
| Trường cũ | Chuyển thành |
| --- | --- |
| `info.soDoi` | bỏ (số đội luôn lấy từ danh sách đội) |
| `info.khoiLuong` (nhập tay) | `info.klHoSoCu`, chỉ hiển thị, có nút Bỏ; còn số này thì vẫn là khối lượng lô |
| `info.klDoi` (khối lượng từng đội nhập tay) | `doi[].klHoSoCu` của đội có Tổ trưởng đó |
| `info.donGia` (đơn giá Tổ trưởng hồ sơ cũ) | bảng đơn giá theo vị trí của đội (`donGiaTan['Tổ trưởng']`) khi tính theo tấn và bảng chưa có giá này |
| `vanChuyen.mode = 'tanDoan'` (cước bậc cự ly) | `tanKm`; dữ liệu bậc giữ ở `vanChuyen.bacCu` |
| chữ ở cột Đội của nhân công / phiếu cân, cột Đội xe của xe | bỏ khi dòng đã có đội; dòng chưa thuộc đội giữ chữ để báo lỗi |

`db.chucDanhThem` **chưa bỏ** (xem "Việc còn lại").

### Bản in của lô cũ
So `word/document.xml` của mọi tài liệu trong gói "Toàn bộ hồ sơ" trước và sau v6 (`scripts/so-ban-in.js`, 8 bộ lô thử: giao khoán tấn / ha, trực tiếp, hai đội, hai đội có khối lượng từng đội nhập tay, lô còn đơn giá Tổ trưởng cũ, lô không có trường cũ): **lô không có trường cũ và lô trực tiếp giống từng byte.** Khác duy nhất, có chủ đích: lô còn **đơn giá Tổ trưởng hồ sơ cũ** — **BM-01 điều 2.2, BM-08 (đoạn "Hình thức giao khoán"), BM-20 (dòng "Đơn giá ký")** chuyển sang cách trình bày đơn giá khoán bình quân suy ra từ định biên (như lô mới); **số tiền không đổi**.

### Việc còn lại
- Chuyển các hàm quy tắc kiểm tra (`checkNC`, `checkDX`, `checkPC`, `gate`…) khỏi giao diện thành hàm thuần trong `src/kiemtra.js` (hiện `src/kiemtra.js` định nghĩa dạng mục chung, biểu mẫu bị chặn, tóm tắt; các quy tắc vẫn chạy ở giao diện và được gom qua `exportCheck`).
- `db.chucDanhThem` (danh sách vị trí thêm cũ): chưa chuyển vào định mức nhân công vì chuyển sẽ làm BM-06 in thêm phần "Phân công nhiệm vụ" ở lô chưa lưu định mức nhân công.
