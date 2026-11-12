# Hướng dẫn sử dụng HAKQN – Hồ sơ khai thác và vận chuyển gỗ keo (bản desktop)

## 1. Cài đặt
1. Chạy `HAKQN-HoSoKhaiThac-Setup-<phiên bản>.exe` → chọn thư mục cài → Cài đặt.
2. Mở từ **Start Menu → HAKQN - Hồ sơ khai thác** hoặc biểu tượng trên Desktop.
3. Không cần mạng để nhập liệu, tính toán, xuất hồ sơ. Chỉ cần mạng khi bấm **Đồng bộ ngay**.
4. Dữ liệu nằm ở `%APPDATA%\hakqn-ho-so-khai-thac\hakqn.sqlite` (menu **Tệp → Mở thư mục dữ liệu**). Cài bản mới đè lên bản cũ không mất dữ liệu; gỡ cài đặt cũng không xóa dữ liệu.
5. Bản chạy thử không cần cài (file .zip): giải nén, mở file `.exe` trong thư mục.

## 2. Chuyển dữ liệu từ bản HTML
1. Trong bản HTML cũ: bấm **Sao lưu dữ liệu (.json)**.
2. Trong HAKQN: bấm **Nhập bản sao lưu HTML cũ (.json)** → chọn file.
3. Màn hình xem trước cho biết số chủ rừng, rừng, nhân công, xe, phiếu cân trong file và trên máy, cùng danh sách bản ghi trùng (cùng mã, CCCD hoặc mã rừng).
4. Chọn cách xử lý: giữ bản trên máy / ghi đè bản trùng / giữ cả hai / thay toàn bộ → **Thực hiện**.
5. Phần mềm tự sao lưu cơ sở dữ liệu vào thư mục `backups` trước khi ghi. Lỗi giữa chừng thì dữ liệu cũ giữ nguyên.

## 3. Sao lưu và khôi phục
- **Sao lưu dữ liệu** → chọn thư mục (USB, ổ mạng…) → tạo 2 file cùng tên: `.json` (cấu trúc của bản HTML, mở được ở cả bản HTML) và `.sqlite`.
- Khôi phục trên máy khác: cài HAKQN → **Nhập bản sao lưu HTML cũ (.json)** → chọn **Thay toàn bộ** (hoặc gộp).
- Trước mỗi lần khôi phục và mỗi lần nâng cấp cấu trúc dữ liệu, phần mềm tự sao lưu vào `backups`.

## 4. Quy trình hồ sơ (giữ như bản HTML)
Chủ rừng → Rừng → Nhân công → Vận chuyển (xe, phiếu cân) → Tiến độ/checklist FSC → Xuất hồ sơ (BM-01 đến BM-19, ZIP). Xem nút **❓ Hướng dẫn** trong phần mềm.
Mới: khi nạp Excel nhân công/xe/phiếu cân, phần mềm báo số dòng hợp lệ, dòng lỗi và (khi nạp lại) số bản ghi sẽ thêm, cập nhật, giữ nguyên, bỏ — rồi mới hỏi ghi.

## 5. Tra cứu Google Sheets
### Lấy bản tra cứu
- Bấm **🔎 Tra cứu Google Sheets** trên thanh điều hướng, hoặc **Lấy dữ liệu từ Google Sheets** trong Thông tin rừng.
- **Đồng bộ ngay**: tải bảng tính (chỉ đọc) theo liên kết đã lưu. Bảng tính phải để chế độ “Ai có liên kết đều xem được”; không cần đăng nhập Google. Đổi liên kết ở mục “Liên kết Google Sheets”.
- **Nhập bản Excel**: chọn `HoSoKeo_QC.xlsx` hoặc file cùng cấu trúc khi không có mạng.
- Phần mềm kiểm tra đủ 3 tab `HoSoKeo_QC`, `HoSoRung_QC`, `ToaDoRung_QC` và các cột bắt buộc. Thiếu hoặc đổi tên thì báo rõ tab và cột, và **giữ bản tra cứu cũ**. Đồng bộ lỗi (mất mạng, bảng tính đổi quyền) cũng giữ bản cũ.
- Dòng trạng thái cho biết nguồn đang dùng, lần cập nhật thành công gần nhất, số dòng mỗi tab, tình trạng kết nối và kết quả lần thử gần nhất.

### Tìm và ghi vào hồ sơ
1. Chọn bộ lọc (Tất cả hoặc từng tab), gõ mã rừng, tên chủ rừng (có dấu hoặc không), CCCD, mã/số hợp đồng, địa chỉ rừng, số phiếu cân hoặc biển số → **Tìm**.
2. Bấm **Chọn** ở dòng cần lấy. Phần mềm ghép dữ liệu theo **CCCD + mã hợp đồng**, hiện:
   - các rừng của hợp đồng đó (một hợp đồng có thể có nhiều rừng);
   - các hợp đồng khác của cùng chủ rừng;
   - cảnh báo khi số hợp đồng trùng với CCCD khác (chỉ lấy dữ liệu đúng CCCD).
3. Chọn nơi ghi:
   - **Điền vào rừng đang mở**, hoặc
   - **Tạo rừng mới từ kết quả**: chọn chủ rừng đã có (chủ trùng CCCD xếp đầu) hoặc tạo chủ rừng mới. Mã rừng đã có thì không cho tạo mới, có nút mở rừng đó để điền.
4. Màn hình xem trước hiện chủ rừng và mã rừng đích, giá trị hiện có, giá trị đề xuất, nguồn (tab · dòng · cột):
   - Ô trống: đề xuất điền sẵn (bỏ dấu chọn nếu không muốn).
   - Ô đã có giá trị khác: phải chọn **giữ hiện có** hoặc **dùng đề xuất**.
   - Diện tích: HECTA (HoSoRung_QC) và DienTich_m2 ÷ 10.000 (ToaDoRung_QC); khác nhau thì phải chọn.
   - Tọa độ: mỗi điểm GPS một lựa chọn. Điểm độ-phút-giây được quy đổi sang độ thập phân và gắn nhãn “đã quy đổi”. Điểm ngoài Việt Nam, nhầm cột, không đọc được thì không chọn được.
   - Giấy tờ nguồn gốc: loại, số, ngày; giấy đã có thì không chọn sẵn.
   - Phiếu cân: số phiếu, ngày cân (= Ngày nhập), biển số, tấn; Đơn giá, Thanh toán chỉ để tham chiếu. Trạng thái: thêm / cập nhật / bỏ qua (đã có) / cần kiểm tra (lệch tấn–kg, thiếu ngày) / cần ghép biển.
   - **Ghép tên xe với biển số**: dòng ghi tên xe (vd “XE CN NAM”) nhập biển số một lần; lần sau tự dùng.
   - Tùy chọn điền tổng tấn của các phiếu đã chọn vào “Khối lượng khai thác thực tế”.
   - Thông tin tham chiếu (địa chỉ hiện tại, SĐT, mã/ngày/tình trạng hợp đồng, ID_RUNG…) được lưu kèm hồ sơ rừng để đối chiếu.
5. **Lưu vào hồ sơ**: ghi một lần trong một giao dịch, kèm dấu vết nguồn (tab, dòng, cột, thời điểm). Nhập lại cùng nguồn: phiếu đã có hiện “bỏ qua”, không tạo bản trùng.

## 6. Lưu ý
- Phiếu cân của hợp đồng có nhiều rừng không có mã rừng trong nguồn: phần mềm không chọn sẵn, người dùng chọn đúng phiếu của rừng.
- Biển số chưa có trong danh sách xe của rừng vẫn ghi được nhưng checklist sẽ báo lỗi như bản HTML: nạp file xe trước, hoặc bổ sung xe sau.
- Nạp lại file Excel phiếu cân sẽ thay danh sách phiếu (kể cả phiếu lấy từ tra cứu); hộp xác nhận cho biết số phiếu bị bỏ.

## Bộ lọc tra cứu thông minh (mới)
Trong **🔎 Tra cứu Google Sheets**:
- **Cú pháp tìm**: nhiều từ = phải có đủ (không phân biệt dấu) · `"cụm từ"` · `-từ` để loại trừ · `cccd:` `hd:` `rung:` `phieu:` `bien:` `ten:` `dc:` để tìm đúng trường. Số 12 chữ số tự nhận là CCCD; biển số gõ không dấu gạch (`92c55555`) vẫn nhận.
- **Xếp theo độ khớp**: khớp chính xác CCCD, hợp đồng, mã rừng, số phiếu, biển số xếp trước; có thể đổi sang ngày cân mới nhất, khối lượng lớn nhất, tên A→Z.
- **Bộ lọc nâng cao**: khoảng ngày cân, khoảng khối lượng (tấn), tình trạng hợp đồng, “chỉ dòng cần kiểm tra”. Số dòng theo từng tab và theo tình trạng hiển thị ngay trên nút lọc.
- **Cờ cần kiểm tra** từng dòng: thiếu khối lượng, lệch tấn–kg, thiếu ngày cân, biển số là tên xe, thiếu CCCD, CCCD không đủ 12 số, tọa độ không dùng được…
- Dòng tổng hợp: số phiếu cân và tổng tấn của kết quả đang lọc.
- Không có kết quả: gợi ý bỏ bớt từ khóa hoặc bộ lọc để có kết quả gần nhất.

## Báo cáo (mới)
Nút **📊 Báo cáo** trên thanh đầu trang. Chọn kỳ (từ ngày – đến ngày, theo ngày cân) và chủ rừng, xem trước rồi xuất **Word (.docx)** hoặc **Excel (.xlsx)**:
1. **Tổng hợp điều hành** (1 trang): số liệu theo chủ rừng và danh sách vấn đề cần xử lý.
2. **Sản lượng khai thác theo rừng**: diện tích, định mức, sản lượng dự kiến và thực tế theo phiếu cân, cảnh báo vượt định mức trên 5%.
3. **Sổ theo dõi phiếu cân – vận chuyển**: danh sách theo ngày, tổng hợp theo rừng / biển số / ngày, phát hiện trùng số phiếu.
4. **Tiến độ hồ sơ và checklist FSC**: tiến độ từng rừng, hạng mục còn thiếu.
Báo cáo tính từ dữ liệu hồ sơ trong máy (không cần mạng). Mẫu báo cáo nằm ở `ui/reports.js`, có kiểm thử trong `tests/reports.test.js`.

## Giao diện mới
- **Trang Tổng quan**: số chủ rừng, rừng, diện tích, khối lượng đã cân, tiến độ hồ sơ trung bình; danh sách hồ sơ cần hoàn thiện (bấm để mở đúng rừng) và phiếu cân gần đây. Bấm logo hoặc **Tổng quan** để quay về. Chưa có dữ liệu thì hiện hướng dẫn 4 bước.
- Thanh trên cùng: **Tổng quan · Tra cứu · Báo cáo** ở giữa; chế độ sáng/tối và menu **⋯ Thêm** (Hướng dẫn, Sao lưu, Khôi phục) bên phải.
- Ô **Lọc chủ rừng** ở danh sách bên trái (theo tên, mã, CCCD, không phân biệt dấu).
- Màu sắc, cỡ chữ, bo góc khai báo ở đầu phần `<style>` (`:root`), đổi màu thương hiệu chỉ cần sửa một chỗ. Có chế độ tối, bố cục điện thoại và định dạng khi in.

## Đăng nhập Google cho bảng tính giới hạn quyền xem (mới)
Trong **🔎 Tra cứu Google Sheets** có nút **🔑 Đăng nhập Google (chỉ đọc)**. Đăng nhập bằng tài khoản đã được chia sẻ bảng tính rồi bấm **Đồng bộ ngay**. Quyền chỉ đọc, không sửa bảng tính, không đổi quyền chia sẻ. Cần cấu hình OAuth một lần theo [docs/GOOGLE_OAUTH.md](GOOGLE_OAUTH.md); chưa cấu hình thì nút hiện thông báo và đồng bộ qua liên kết công khai vẫn dùng được. Mọi lỗi (mất mạng, hết phiên, thiếu quyền, sai tiêu đề cột) đều giữ bản tra cứu đã lưu và báo rõ nguyên nhân.

Bộ lọc tra cứu: dấu ngoặc kép lẻ, `hd: 101` (có khoảng trắng), CCCD gõ có dấu cách hoặc mất số 0 đầu đều được nhận; ngày hoặc khối lượng sai định dạng được báo rõ thay vì bỏ qua âm thầm.

Báo cáo: **phiếu cân trùng số vẫn được cộng vào tổng** (phần mềm không tự xóa phiếu), nhưng cả hai dòng trùng được đánh dấu “Trùng số phiếu”, có chỉ tiêu “Phiếu trùng số” và ghi chú nêu số phiếu, số tấn đang tính. Đây là quy tắc đã được người phụ trách xác nhận: người dùng tự xác minh rồi sửa hoặc xóa phiếu nhập trùng ở tab Vận chuyển.

## Tra cứu dạng cha–con, chip điều kiện, bộ lọc đã lưu (mới)
Trong **🔎 Tra cứu Google Sheets**:
- **Hiển thị**: chọn **☰ Bảng phẳng** (mỗi dòng một bản ghi) hoặc **⛓ Cha–con**. Ở dạng cha–con, bên trái là danh sách cha (một hợp đồng = CCCD + mã hợp đồng, kèm số rừng, số phiếu, tổng tấn, số dòng cần kiểm tra); bên phải là toàn bộ hợp đồng đang chọn với các tab **Rừng**, **Phiếu cân**, **Hợp đồng khác**, **Cảnh báo**. Nút **Chọn để ghi vào hồ sơ →** mở màn hình xem trước và ghi như cũ.
- **Chip điều kiện**: mỗi điều kiện đang lọc hiện thành một chip, bấm × để gỡ; dòng “Phạm vi lọc” là một chuỗi duy nhất mô tả toàn bộ điều kiện. **Xóa hết** gỡ cả từ khóa.
- **Bộ lọc đã lưu**: nhập tên rồi bấm **Lưu bộ lọc**; chọn trong danh sách để mở lại; **Xóa bộ lọc đã chọn** để bỏ. Bộ lọc lưu trên máy này, không chứa dữ liệu hồ sơ.
Bộ lọc dùng lõi HAK Smart Filter (`ui/vendor/hak-smart-filter`), giao diện dùng token và bố cục master–detail của HAK Enterprise Design System (chủ đề luxe, sáng/tối).

## Báo cáo cha–con và chuẩn báo cáo (mới)
- Báo cáo thứ 5 **Bảng cha–con: chủ rừng – rừng – phiếu cân**: chủ rừng là tổng các rừng, rừng là tổng các phiếu cân trong kỳ; hộp **Kèm từng phiếu cân** thêm cấp phiếu; màn hình xem trước có nút thu gọn/mở rộng; Excel có nhóm dòng theo cấp.
- Theo chuẩn HAK Accounting & Reporting Standard: số căn phải, ngày căn giữa, văn bản căn trái; có **đơn vị tính** và **thời điểm lập**; Excel dùng ô số và ô ngày thật, có bộ lọc tự động ở bảng chính, chuỗi bắt đầu bằng `=`, `+`, `-`, `@` được vô hiệu để không thành công thức. Khối lượng tính theo tấn với 3 chữ số thập phân (phiếu cân ghi kg); các cột còn lại theo chuẩn.
- Chưa có: cố định hàng tiêu đề, vùng in và tiêu đề lặp trong Excel (thư viện Excel đang dùng không hỗ trợ); xuất PDF. Word đã lặp tiêu đề bảng và có số trang.

## Bảng màu (mới)
Menu **⋯ Thêm → Bảng màu** có 4 bảng màu, mỗi bảng có chế độ sáng và tối (nút 🌙/☀ ở thanh trên). Lựa chọn được ghi nhớ trên máy và không ảnh hưởng dữ liệu hồ sơ:
- **Luxe** — navy, champagne, nền ngà (mặc định).
- **Classic** — xanh ngọc (teal).
- **Neutral** — xám xanh doanh nghiệp.
- **Champagne** — vàng ấm.
Luxe và Classic lấy nguyên từ HAK Enterprise Design System. Neutral và Champagne do HAKQN tự định nghĩa vì design system chỉ mô tả bằng chữ, chưa có giá trị màu (`ui/skins.css`); cả bốn đều được kiểm tra độ tương phản chữ WCAG AA.

## Hai hình thức hợp đồng và cơ sở tính đơn giá (mới)
Ở **tab Nhân công → Thông số hợp đồng và đơn giá**:
1. **Giao khoán**: chủ rừng ký hợp đồng giao khoán (BM-01) với **Tổ trưởng**; **công nhân ký một Giấy ủy quyền (BM-20)** cho Tổ trưởng (một giấy cho cả tổ, kèm danh sách họ tên, ngày sinh, giới tính, CCCD, nơi cư trú, chữ ký từng người). Không còn hợp đồng lao động (BM-03) riêng từng công nhân. Cơ sở tính: **theo tấn hoặc theo ha**.
2. **Trực tiếp**: chủ rừng ký hợp đồng lao động (BM-03) với **tất cả nhân công**. Cơ sở tính: **theo tấn hoặc theo ngày công**.
- **Đơn giá theo từng vai trò** (Tổ trưởng, Công nhân khai thác, Công nhân cưa); ô đơn giá hiện theo cơ sở tính đã chọn (đ/tấn, đ/ha, đ/công). Vai trò nào đang có người mà chưa có đơn giá thì báo lỗi ở checklist.
- **Sản lượng chia đều**: tấn (hoặc ha, hoặc số công) chia đều cho mọi người trong tổ, kể cả Tổ trưởng; tiền của mỗi người = phần chia × đơn giá vai trò. Tổng tiền khoán ở BM-01, bảng thanh toán tiền công BM-08 và biên bản nghiệm thu BM-14 đều tính theo cách này.
- Giao khoán không chọn được “ngày công”, trực tiếp không chọn được “ha”; đổi hình thức hợp đồng thì ô chọn tự đổi về “theo tấn” nếu lựa chọn cũ không hợp lệ. Hồ sơ cũ đang ở tổ hợp không hợp lệ (ví dụ giao khoán + ngày công) bị checklist báo cần chọn lại.
- **Giấy ủy quyền chỉ xuất được khi mọi công nhân từ đủ 18 tuổi** (Điều 18 Bộ luật Lao động 2019: nhóm người lao động từ đủ 18 tuổi ủy quyền cho một người trong nhóm; người được ủy quyền không được ủy quyền lại). Mẫu do phần mềm soạn, **cần người có chuyên môn pháp lý duyệt**: căn cứ được tra qua các trang tư vấn pháp luật, chưa đối chiếu văn bản gốc; Điều 18 áp dụng cho công việc theo mùa vụ hoặc có thời hạn dưới 12 tháng, phần mềm không tự kiểm tra điều kiện này.
- **Thay đổi so với trước**: tiền khoán giao cho cả tổ không còn là “một đơn giá chung × toàn bộ khối lượng” mà là tổng theo từng vai trò; ô “Đơn giá khoán” ở Thông tin rừng đã bỏ (xem mục trên). Hồ sơ cũ chỉ có đơn giá ở Thông tin rừng: ô Tổ trưởng (đ/tấn) tự điền giá cũ.

## Đơn giá vận chuyển: hai cách tính (đã chốt)
Ở **tab Vận chuyển → Thông số hợp đồng vận chuyển**, chủ rừng trả bên vận chuyển theo **một trong hai** cách:
1. **Đơn giá cố định** (đồng/tấn): một giá, không phụ thuộc cự ly.
2. **Đơn giá tấn/km** (đồng/tấn/km): đơn giá × cự ly của rừng (nhập ở tab Thông tin rừng); thiếu cự ly thì báo thiếu.
Chỉ hiện ô đơn giá của cách đang chọn. Tiền vận chuyển tính theo tấn giao tại nhà máy (theo phiếu cân) cho từng xe. **Cách “theo bậc cự ly” của bản cũ đã bỏ**: hồ sơ cũ còn chọn cách đó bị báo cần chọn lại ở checklist và chưa xuất được hợp đồng vận chuyển cho đến khi chọn lại; dữ liệu các bậc cũ được giữ nguyên trong hồ sơ, không bị xóa.


## Công ty mua hàng và điểm đến vận chuyển
- Phần mềm dùng cho **một công ty**, nên chỉ có **một hồ sơ Công ty mua hàng**: nút **🏢 Công ty mua hàng** ở thanh trên (tên pháp lý, MST, địa chỉ, người đại diện, chức vụ, SĐT, email). **Tên pháp lý và địa chỉ bắt buộc**; MST sai dạng chỉ cảnh báo. Công ty có thể có nhiều **địa chỉ giao hàng** (kho, nhà máy…).
- Ở **tab Vận chuyển** của từng rừng: bấm **Chọn địa chỉ giao hàng**, chọn một địa chỉ của công ty, xem bảng so sánh “hiện tại / mới” rồi **Xác nhận**. Địa chỉ được lưu cùng hồ sơ rừng và tự điền vào “Địa điểm vận chuyển đến”; dùng ở BM-04, BM-09, BM-10 và Sổ phiếu cân.
- Sửa địa chỉ/tên trong hồ sơ công ty **không tự đổi** hồ sơ rừng: rừng giữ địa chỉ đã lưu và hiện thông báo; bấm **Xem và cập nhật** để áp dụng.
- Hồ sơ cũ nhập tay điểm đến vẫn giữ nguyên; lần đầu chọn địa chỉ sẽ thấy giá trị cũ cạnh địa chỉ đề xuất. Đổi điểm đến **không tự sửa cự ly hay đơn giá**; với cước tấn/km phần mềm nhắc kiểm tra lại cự ly.
- “Nơi giao” ghi trên từng phiếu cân là dữ liệu nguồn, được giữ nguyên; khác điểm đến theo hồ sơ thì có cảnh báo (và cột “Đối chiếu nơi giao” trong Sổ phiếu cân).
- Rừng chưa chọn địa chỉ giao: checklist báo thiếu và biểu mẫu cần điểm đến in dòng chấm.

## Ngày cân không có thật (bản 1.1.0)
Ngày được kiểm theo lịch thật (31/02/2026 và 29/02/2026 không có thật; 29/02/2028 có thật). Nhập phiếu sai ngày bị chặn kèm số phiếu và lý do; phiếu cũ sai ngày được giữ, hiện lý do, có ô sửa ngay, và **không tính vào tổng của kỳ báo cáo** (nêu trong mục riêng của báo cáo, giống nhau ở xem trước, Word và Excel).

## Sao lưu và khôi phục theo lô rừng (bản 1.2.0)
- **Sao lưu lô rừng**: mở lô, bấm **⬇ Sao lưu lô rừng** ở đầu hồ sơ lô, chọn nơi lưu bằng hộp thoại Windows. File `HAKQN_LoRung_<MaLo>_<Ngày>.json` chứa đúng MỘT lô: thông tin, giấy tờ, nhân công, xe, phiếu cân, đơn giá, cấu hình biểu mẫu, dấu vết nhập, công ty mua hàng và địa chỉ giao đã chốt, cùng nhận diện chủ rừng và các thiết lập dùng chung lô cần (định mức BHLĐ, biển số quy đổi). Không có lô khác, chủ khác, bản tra cứu Google Sheets hay thông tin đăng nhập. Làm việc hoàn toàn trên máy, không cần mạng.
- **Khôi phục lô rừng**: menu **⋯ Thêm → ⬆ Khôi phục lô rừng…**. Màn hình xem trước nêu tên chủ, mã lô, số nhân công/xe/phiếu cân, thời điểm sao lưu và kết quả đối chiếu với máy. Chủ đã có thì lô được thêm vào đúng chủ đó; chưa có thì tạo chủ mới. Lô đã tồn tại: mặc định **giữ bản hiện có**; chọn **thay** thì chỉ thay đúng lô đó. Thiết lập dùng chung của máy được giữ, chỉ bổ sung mục máy chưa có (xem trước có liệt kê khác biệt).
- File hỏng, bị sửa, sai phiên bản, thiếu mã lô hoặc không xác định được lô đích: báo lỗi và không ghi gì. Gói lô chỉ đi qua “Khôi phục lô rừng”; bản sao lưu toàn bộ chỉ đi qua “Khôi phục (.json)”.
- **Khôi phục toàn bộ (.json)** đã sửa: **Ghi đè** chỉ thay đúng lô trùng đã xác nhận, giữ lô khác của chủ và chủ khác; hồ sơ chủ rừng của máy được giữ. Xem trước ghi rõ lô nào THÊM, TRÙNG hay GIỮ. Nhận diện trùng (ID, mã lô, chủ rừng) dùng chung cho xem trước và ghi; nếu các tiêu chí chỉ về hồ sơ khác nhau thì dừng và liệt kê để đối chiếu. **Thay toàn bộ dữ liệu** vẫn có, kèm hộp xác nhận nêu rõ phạm vi. Mọi thao tác ghi tự sao lưu SQLite trước và nằm trong một giao dịch.

## Mã lô duy nhất, “Giữ cả hai”, kiểm tra trước khi xuất (bản 1.3.0)
- **Mã lô là khóa duy nhất** (so sánh không phân biệt hoa thường, bỏ khoảng trắng đầu/cuối). Tạo lô, đổi mã, nhập sao lưu và “Giữ cả hai” đều dùng cùng một quy tắc kiểm tra.
- **Giữ cả hai** khi khôi phục toàn bộ: mỗi lô trùng được thêm thành lô MỚI và bạn phải **xác nhận mã mới** (phần mềm gợi ý sẵn, ví dụ `R1-2`). Mã mới bị từ chối nếu trùng lô đã có, trùng lô khác trong file hoặc trùng chính mã cũ; lỗi hiện ngay khi gõ và được kiểm lại lúc ghi. Nhân công, xe, phiếu cân của lô nhân bản đổi theo mã mới.
- **Đổi mã lô** ở tab Thông tin rừng: các dòng nhân công/xe/phiếu cân mang mã cũ đổi theo; dòng mang mã khác được báo, không tự đổi.
- **Dữ liệu cũ đã có mã trùng**: màn hình “Kiểm tra trước khi xuất” liệt kê đủ các lô đang dùng chung mã (kèm chủ, số nhân công/xe/phiếu cân); dữ liệu giữ nguyên đến khi bạn đổi mã. Khôi phục lô/“Ghi đè” dừng cho đến khi hết trùng.
- **Khôi phục lô rừng**: xem trước có bảng **trước / sau** (nhân công, xe, phiếu cân, tổng tấn, giấy tờ, cách tính cước, địa chỉ giao đã chốt). Định mức BHLĐ hoặc ánh xạ biển số khác máy đích thì nêu rõ máy đích dùng thiết lập của mình, giá trị hai bên và phần hồ sơ có thể khác (bảng cấp phát BHLĐ, hợp đồng lao động, ghép biển số). Gói bị cắt, sai loại/phiên bản, số bản ghi hoặc tổng tấn không khớp phần kiểm tra, hoặc mã kiểm tra sai: báo lỗi trước khi ghi.
- **Kiểm tra trước khi xuất** (tab mới của lô, và nhắc ở tab Xuất hồ sơ): gom mục **chặn xuất** và **cần đối chiếu** từ checklist FSC và quy tắc kiểm tra hiện có, kèm số phiếu/tên trường, bấm “Mở để sửa” để tới đúng tab: phiếu cân thiếu/sai ngày, trùng số, biển số chưa ghép, chênh lệch sản lượng, cước theo bậc cự ly của hồ sơ cũ, thiếu địa chỉ giao đã chốt, địa chỉ công ty đã đổi (xem cũ/mới), “Nơi giao” trên phiếu khác địa chỉ chốt, nhắc kiểm tra cự ly khi tính tấn/km.
