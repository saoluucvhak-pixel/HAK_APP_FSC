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
