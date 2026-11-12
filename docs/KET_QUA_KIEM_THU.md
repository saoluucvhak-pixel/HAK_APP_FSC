# Kết quả kiểm thử bản nâng cấp HAKQN Desktop 1.0.0

**Commit đã kiểm thử và đóng gói:** `23a59869859ef301aa9b7b2ffb4268cf42c474bf` (nhánh `claude/magical-dijkstra-xhn2k9`, PR #1 vào `main`).
**Lượt build Windows:** [run 6 (số 43142043143)](https://github.com/saoluucvhak-pixel/HAK_APP_FSC/actions/runs/43142043143) — đạt.
**Artifact:** `HAKQN-Setup-23a59869859ef301aa9b7b2ffb4268cf42c474bf` (86.734.319 byte, digest zip `sha256:aa94ffd5…608ef0c`), gồm bộ cài `HAKQN-HoSoKhaiThac-Setup-1.0.0.exe` (86.737.703 byte, SHA-256 `523F6043…C928B1D`), `BUILD_INFO.txt` (ghi mã commit) và hai file kết quả kiểm tra khói.
Các commit sau đó chỉ sửa tài liệu; mã chương trình không đổi so với commit trên (workflow tự dựng lại cho commit mới, artifact có tên theo mã commit đó).

Điểm xuất phát: HEAD của PR #1 là `aae962a` (đã gồm bộ lọc, báo cáo và giao diện mới; mới hơn `34c3fba` nêu trong yêu cầu). Giữ `--publish never` trong script `dist` (commit `5d63f18`).

## 1. Tóm tắt

| Hạng mục | Môi trường | Kết quả |
| --- | --- | --- |
| `npm ci`, `npm run build:html` | Linux (máy làm việc) và Windows (CI) | đạt |
| `npm test` (kiểm thử đơn vị) | Linux (Electron 33 làm Node) | **38/38 đạt** |
| `npm run test:e2e` (Electron thật) | Linux (màn hình ảo) | **5 bộ đạt**: lưu/nhập JSON 12/12; tra cứu 33/33; tra cứu offline và ghi vào hồ sơ 16/16; xuất BM-01…BM-19 và ZIP 4/4 (29 nút, 25 file, 0 nút bị khóa); báo cáo 31/31 |
| `npm test` + `npm run test:e2e` | Windows (GitHub Actions, windows-latest) | các bước đạt (không lưu được số bài từng bộ ở bản log đã đọc) |
| Đóng gói `.exe`, kiểm tra có file | Windows (CI) | đạt (workflow báo lỗi nếu thiếu `*Setup*.exe` hoặc dưới 50 MB) |
| **Cài thật bộ `.exe` (silent) và kiểm tra khói** | Windows (CI) | đạt: cài xong, có lối tắt Start Menu “HAKQN - Hồ sơ khai thác”; pha `create` ghi 1 chủ rừng 2 rừng; đóng; pha `verify` mở lại thấy đủ hồ sơ và hiện trên giao diện; bản đã cài có bộ lọc mới (`search` có `facets`, ô lọc chủ rừng), menu Báo cáo (4 mẫu), menu Tra cứu |
| Đồng bộ Google Sheets thật | — | **chưa chạy được** (xem mục 3) |
| Mở bằng Microsoft Word thật | — | **chưa chạy được** (xem mục 6) |

Số bài e2e trên Windows và trên Linux dùng cùng mã; bản Linux có số liệu chi tiết ở trên.

## 2. Lỗi đã tái hiện và sửa

| # | Lỗi | Cách tái hiện | Sửa | Kiểm thử hồi quy |
| --- | --- | --- | --- | --- |
| 1 | `package.json` thiếu thư viện `playwright` mà các script e2e dùng: `npm ci` sạch (như CI) không chạy được `npm run test:e2e` | Build CI #3: bước e2e hỏng sau 1 giây | Khai báo `playwright-core` và đổi các script sang dùng nó | Build CI #6 chạy e2e đạt |
| 2 | Lỗi workflow: cú pháp PowerShell `$ph:` bị hiểu là tên phạm vi biến, làm hỏng bước cài và kiểm tra khói | Build CI #5 | Dùng `${ph}` | Build CI #6 |
| 3 | Bộ lọc: dấu ngoặc kép lẻ làm tìm không ra; `hd: 101` (có khoảng trắng sau dấu hai chấm) không nhận; token chỉ gồm dấu `-` loại trừ nhầm hàng loạt dòng | Truy vấn `"abc`, `hd: 101`, `-` | Chuẩn hóa truy vấn trong `src/lookup.js` | `hồi quy bộ lọc: truy vấn sai định dạng…` |
| 4 | CCCD gõ có dấu cách (`0490 0000 0002`) hoặc mất số 0 đầu (`49000000002`) không khớp | Tìm hai dạng trên | Ghép lại thành 12 số, bù số 0 | cùng bài trên |
| 5 | Ngày/khối lượng sai định dạng bị bỏ qua âm thầm; khoảng ngày ngược (từ > đến) trả 0 dòng không giải thích | `from='abc'`, `from>to`, `minTan='x'` | Trả `warns` và hiển thị cảnh báo trên giao diện | `hồi quy bộ lọc: kết hợp nhiều bộ lọc, báo cảnh báo…` |
| 6 | Báo cáo: phiếu trùng số bị cộng vào tổng nhưng không được nêu rõ | Hai rừng cùng số phiếu `P2` | **Giữ nguyên cách tính** (không tự xóa phiếu; quy tắc này đã được người phụ trách xác nhận giữ nguyên, 12/11/2026) nhưng đánh dấu cả hai dòng “Trùng số phiếu”, thêm chỉ tiêu “Phiếu trùng số” và ghi chú nêu số phiếu, số tấn đang tính | `sổ phiếu cân…` (đơn vị) và `e2e-reports` |
| 7 | Tài liệu cũ ghi xuất biểu mẫu “5/5”, thực tế có 4 kiểm tra | Đếm lại | Cập nhật số liệu | — |

Chưa phát hiện lỗi trong luồng nhập JSON, sao lưu, khôi phục, nâng cấp SQLite: các bài đã có (`nhập: skip/overwrite/both/replace`, `nâng cấp cấu trúc`, `bản P1 → hiện tại`) đạt; thêm 2 bài hồi quy: nhập thất bại giữa chừng (`replace`, `overwrite`) giữ nguyên hồ sơ từng rừng và có bản sao lưu trước; sao lưu `.sqlite` mở lại được.

## 3. Đồng bộ Google Sheets và tra cứu offline

- **Bảng thật** (`1QD_VeaUgR0_…`): tải qua liên kết công khai từ máy làm việc trả **HTTP 401** (yêu cầu đăng nhập). Không đổi quyền chia sẻ để kiểm thử. Vì vậy chưa kiểm tra được ba tab thật và chưa có file `HoSoKeo_QC.xlsx` thật để đối chiếu tiêu đề cột. Tiêu đề cột đang kiểm tra theo bảng ánh xạ (`docs/BANG_ANH_XA.md`) và file giả lập cùng cấu trúc.
- **Đăng nhập Google chỉ đọc**: đã bổ sung (`src/google-auth.js`, OAuth 2.0 PKCE, quyền `drive.readonly`, mã làm mới lưu mã hóa bằng DPAPI khi có). Kiểm thử bằng máy chủ Google giả trên localhost, 9 bài: PKCE, quyền chỉ đọc, mã hóa khi lưu, khởi động lại dùng mã đã lưu, đăng xuất xóa mã, từ chối cấp quyền, sai `state`, hết thời gian, token hết hạn giữa chừng (làm mới 1 lần), 403/404/hạn mức/500, bị thu hồi, mất mạng, nội dung không phải bảng tính; và nạp đủ 3 tab vào bản tra cứu. **Chưa chạy với Google thật**: cần “OAuth client ID” loại Desktop app do chủ dự án tạo, xem `docs/GOOGLE_OAUTH.md`.
- Chỉ thay bản tra cứu khi đủ 3 tab và đủ cột bắt buộc; thiếu tab/cột, tải về không phải bảng tính, mất mạng, hết phiên, thiếu quyền đều giữ bản cũ và báo nguyên nhân (đã kiểm thử đơn vị và e2e). Đóng và mở lại app (đồng bộ trỏ vào cổng đóng) vẫn tra cứu offline được.
- **Bộ lọc**: theo tab, tên có dấu/không dấu, CCCD (kể cả số 0 đầu), mã hợp đồng, số phiếu, biển số, khoảng ngày, khoảng khối lượng, kết hợp nhiều bộ lọc, xóa bộ lọc, truy vấn sai định dạng (14 dạng) — đạt. Tốc độ 15.000 dòng: 55–75 ms.
- **Ghi vào hồ sơ** (e2e): tạo rừng mới từ kết quả; điền vào rừng đang mở; hợp đồng nhiều rừng hiện lựa chọn; diện tích hai nguồn khác nhau buộc chọn; nhiều điểm GPS; m² → ha; kg → tấn khi cột tấn trống (2.000 kg = 2 tấn); phiếu lệch tấn/kg hoặc thiếu ngày không chọn được; biển chưa ghép hoặc chưa có trong danh sách xe không chọn sẵn; chỉ trường và phiếu đã chọn được ghi; nhập lại cùng nguồn không sinh phiếu trùng; dòng thiếu CCCD báo rõ.

## 4. Bốn báo cáo (Word + Excel)

`scripts/e2e-reports.js` (Electron, dữ liệu giả lập: 2 rừng cùng chủ, phiếu trong và ngoài kỳ, phiếu trùng số, rừng thiếu hồ sơ), 31 kiểm tra đạt: số bảng, số dòng, nội dung từng ô và các chỉ tiêu khớp nhau giữa màn hình xem trước, Word và Excel; cột số trong Excel là số thật (tổng cột = 31,75 tấn); kỳ 01/01–28/02/2026 loại phiếu ngoài kỳ (4 chuyến, 31,75 tấn); kỳ sai (từ > đến) báo lỗi và không xuất file.

**Quy tắc phiếu trùng số (đã xác nhận giữ nguyên, 12/11/2026):** vẫn tính vào tổng, hệ thống không tự xóa hay gộp phiếu; cả hai dòng được đánh dấu “Trùng số phiếu” và báo cáo nêu rõ số phiếu, số tấn đang tính. Người dùng tự kiểm tra rồi sửa hoặc xóa phiếu nhập trùng ở tab Vận chuyển. Quy tắc này chưa dựa trên đặc điểm số phiếu của nhà máy (số có duy nhất không, có lặp theo năm không); nếu có thông tin đó thì có thể chặt hơn.

## 5. Biểu mẫu BM-01…BM-19, ZIP, tiền công, cước

- Xuất đủ BM-01…BM-19 và ZIP 24 file `.docx` trong Electron (4/4).
- Các hàm tính tiền công, cước vận chuyển, làm tròn và dựng biểu mẫu (`payrollPlan`, `payVC`, `buildFiles`, `docHDLD`, `docXNKLVC`, `checkPC`, `fmtT`) được so từng hàm với bản HTML gốc: **giống hệt**. Chưa chạy so sánh số liệu xuất ra từ hai bản bằng dữ liệu thật.

## 6. Việc chưa chạy được và bước xác minh còn lại

| Việc | Nguyên nhân | Bước xác minh |
| --- | --- | --- |
| Cài trên máy Windows thật của người dùng, mở từ Start Menu, ngắt mạng thật | Môi trường làm việc là Linux; việc cài chạy trên runner Windows của GitHub (có lối tắt Start Menu, nhưng không mở qua lối tắt; luôn có mạng) | Tải artifact, cài, mở từ Start Menu, tắt mạng, tạo chủ rừng 2 rừng, đóng và mở lại; thử Báo cáo và Tra cứu |
| Nâng cấp từ bản cài cũ | Chưa có bộ cài cũ tương ứng | Cài bản cũ, nhập dữ liệu thử, cài đè bản mới; kiểm tra hồ sơ còn nguyên (đã có kiểm thử nâng cấp cơ sở dữ liệu v1 → hiện tại ở mức đơn vị) |
| Đồng bộ Google Sheets thật, ba tab thật, đối chiếu `HoSoKeo_QC.xlsx` | Bảng yêu cầu đăng nhập; chưa có OAuth client ID và file thật | Cấu hình theo `docs/GOOGLE_OAUTH.md`, đăng nhập bằng tài khoản được cấp quyền, “Đồng bộ ngay”; nhập thử `HoSoKeo_QC.xlsx` bằng “Nhập bản Excel” |
| Mở bằng Microsoft Word thật (tiếng Việt, bảng, ngắt trang, chữ ký) | Không có Word; chỉ dựng bằng LibreOffice (báo cáo 1–2 trang, không trang trắng) | In thử và mở bộ BM và 4 báo cáo trên Word |
| Tài liệu không có số bài e2e từng bộ trên Windows | Log đã đọc chỉ ghi các bước đạt | Mở log của [run 6](https://github.com/saoluucvhak-pixel/HAK_APP_FSC/actions/runs/43142043143) bước “Kiểm thử đầu-cuối (Electron)” |

Dữ liệu dùng trong test và artifact là dữ liệu giả lập; không có dữ liệu thật hay thông tin xác thực trong repo, bộ cài hay log.

## 7. Đợt bổ sung: dùng các repository HAK dùng chung (chưa phát hành, nhánh `claude/magical-dijkstra-xhn2k9`)

Nguồn đã đọc và áp dụng (bản sao nguyên văn trong `ui/vendor/`, ghi commit nguồn): HAK-Enterprise-Design-System `69ac08a`, HAK_SMART_FILTER `5181681`, HAK_ACCOUNTING_REPORT_STANDARD `a5833a9`; công cụ quét `hak_code_quality_test` `b78d9b2` (chạy trong CI, không đưa vào ứng dụng); `hak_ai_skills` chỉ được sao chép, chưa dùng.

| Hạng mục | Kết quả (Linux, máy làm việc) |
| --- | --- |
| `npm test` | **54/54 đạt** (thêm: kiểm thử gốc của Smart Filter và tương phản WCAG AA của token luxe chạy lại trên bản sao; cha–con ở backend; báo cáo theo chuẩn kế toán) |
| `npm run test:e2e` (Electron thật) | **đạt cả 5 bộ**: lưu/nhập JSON; tra cứu 33; tra cứu offline, ghi vào hồ sơ, **cha–con và Smart Filter 26**; xuất BM và ZIP; **báo cáo 47** (thêm báo cáo cha–con, đơn vị tính, thời điểm lập, nhóm dòng, bộ lọc tự động) |
| Quét `hak_code_quality_test` | 25 file, 0 lỗi, 2 cảnh báo file dài (`ui/app.src.html`, `package-lock.json`); mã JavaScript trong HTML đã được đọc cú pháp |
| Windows CI (PR #3, commit `334ea82`, [run 13](https://github.com/saoluucvhak-pixel/HAK_APP_FSC/actions/runs/43154598098)) | **đạt**: `npm ci`, build, unit, trọn bộ e2e Electron, đóng gói, cài thật `.exe` và kiểm tra khói 2 pha (5 báo cáo, bộ lọc, hai rừng còn nguyên sau khi đóng và mở lại); job quét chất lượng mã đạt. Artifact `HAKQN-Setup-334ea821aad1c22002f286c8f341588335a7c0f1` (86.745.504 byte). Lượt trước (commit `445b59c`) hỏng ở kiểm tra khói do điều kiện cũ đòi đúng 4 báo cáo, đã sửa |

Đã kiểm tra: cha–con (chủ rừng = tổng rừng = tổng phiếu; hợp đồng trùng số khác CCCD không lẫn; chọn dòng đổi khung chi tiết; kết hợp bộ lọc; “Chọn để ghi vào hồ sơ” mở đúng màn hình ghi); chip điều kiện và dòng phạm vi lọc cùng một chuỗi; lưu, mở, xóa bộ lọc đã lưu; Excel ô số/ngày thật, chống chèn công thức, bộ lọc tự động, outlineLevel; định dạng số khớp `formatNumber` của chuẩn trên 11 giá trị × 3 mức chữ số thập phân.

Tràn ngang: đã đo ở 1366×768 và 1920×1080, sáng và tối, 5 màn hình (tổng quan, mở rừng, tra cứu bảng phẳng, tra cứu cha–con, báo cáo cha–con): 20 tổ hợp đều không tràn trang và không tràn khung hộp thoại; ảnh chụp mới xem bằng mắt một số tổ hợp, chưa chụp từ Electron cho đủ 8 kết hợp màu/chế độ của design system (ứng dụng mới dùng chủ đề luxe). Chưa kiểm tra / giới hạn: Excel chưa cố định hàng tiêu đề và vùng in (thư viện Excel hiện dùng không hỗ trợ); chưa có PDF; chưa thử trên Microsoft Word và máy Windows thật. Khối lượng tấn hiển thị 3 chữ số thập phân (cấu hình theo cột, nằm trong khoảng 0–6 của chuẩn) vì phiếu cân ghi kg.

### Bảng màu (commit `fb7e455`, [run 14](https://github.com/saoluucvhak-pixel/HAK_APP_FSC/actions/runs/43155177790): Windows CI đạt)
- Windows CI: `npm ci`, build, unit, trọn bộ e2e Electron (gồm e2e bảng màu), đóng gói, cài thật `.exe`, kiểm tra khói 2 pha và quét chất lượng mã đều đạt. Artifact `HAKQN-Setup-fb7e45501816fc97bb883c3af0cfbf8b149e3095` (86.746.930 byte, digest zip `sha256:37a0dd5f…25248c220`).
- `tests/skins.test.js`: 4 bảng màu × sáng/tối, chữ đạt AA ≥ 4,5:1 (mô phỏng đúng thứ tự chồng lớp CSS; test này đã bắt được lỗi chữ phụ chế độ tối của neutral và champagne, đã sửa).
- `scripts/e2e-skins.js` (Electron thật): 72 kiểm tra đạt: áp dụng đúng 4 bảng màu × sáng/tối × 1366×768 và 1920×1080; 4 màu thanh trên cùng, 4 màu nền, 4 màu nút chính khác nhau; không tràn ngang ở tổng quan, hồ sơ rừng, báo cáo cha–con; nhớ lựa chọn sau khi mở lại; không đổi dữ liệu hồ sơ. Đã xem ảnh chụp tổng quan của cả 8 tổ hợp.
- Giới hạn: **neutral và champagne là giá trị tự định nghĩa**, chưa được design system xác nhận. “Classic” được hiểu là chủ đề xanh ngọc (teal) theo tài liệu design system; nếu cần một bảng màu xanh ngọc/ngọc lục bảo khác thì cần thêm giá trị màu.

### Hai hình thức hợp đồng, cơ sở tính đơn giá và Giấy ủy quyền BM-20 (commit `b1e2163`, [run 18](https://github.com/saoluucvhak-pixel/HAK_APP_FSC/actions/runs/43160776847): Windows CI đạt; bộ cài mới nhất xem mục vận chuyển bên dưới)
Quy tắc nghiệp vụ do người phụ trách nêu: (1) **Giao khoán**: ký với Tổ trưởng, có giấy ủy quyền của nhân công cho Tổ trưởng; tính theo tấn hoặc ha; đơn giá khoán từng vai trò; sản lượng chia đều. (2) **Trực tiếp**: chủ rừng ký với tất cả nhân công; tính theo tấn hoặc ngày công; sản lượng chia đều, đơn giá theo vai trò. Người phụ trách chốt thêm: **một Giấy ủy quyền do tất cả công nhân ký**, thay hợp đồng lao động riêng từng người ở giao khoán; mẫu soạn theo quy định pháp luật.
- Thay đổi: cơ sở tính `ha` (giao khoán) và `ngày công` (trực tiếp) tách theo hình thức; đơn giá từng vai trò cho cả tấn, ha, ngày công (`donGiaTan`, `donGiaHa`, `donGiaNgay`); `payRows()` dùng chung cho BM-01, BM-08, BM-14; BM-01 liệt kê đơn giá theo vai trò và cách chia đều; BM-08 gồm cả Tổ trưởng; BM-14 thành tiền = tổng theo vai trò; BM-03 chỉ còn ở hình thức trực tiếp; **BM-20 Giấy ủy quyền** mới (một giấy, danh sách công nhân ký, căn cứ Bộ luật Dân sự 2015 và Điều 18 Bộ luật Lao động 2019); đã bỏ ô “Đơn giá khoán” ở Thông tin rừng.
- **Số tiền thay đổi so với trước**: tiền khoán giao cho cả tổ trước đây là một đơn giá chung × toàn bộ khối lượng; nay là tổng (phần chia đều × đơn giá vai trò). Hồ sơ cũ chỉ có đơn giá ở Thông tin rừng: ô Tổ trưởng (đ/tấn) tự điền giá cũ, nhưng tổng tiền khoán vẫn tính theo cách mới.
- `scripts/e2e-hopdong.js` (Electron thật): **23 kiểm tra đạt**: giao khoán chỉ có tấn và ha; BM-01, BM-08, BM-14 theo tấn (200 tấn / 4 người = 50 tấn/người) và theo ha (2,5 ha / 4 người = 0,625 ha/người) khớp số tiền kỳ vọng tính độc lập; BM-20 có căn cứ, một danh sách đúng số công nhân (không có Tổ trưởng) và không cho ủy quyền lại; gói “tất cả” giao khoán có BM-20 và không có BM-03; trực tiếp theo ngày công và theo tấn, có đủ BM-03 cho mọi nhân công và không có BM-20; đổi hình thức thì cơ sở tính hợp lệ; hồ sơ cũ giao khoán + ngày công bị báo lỗi; người dưới 18 tuổi thì không xuất được Giấy ủy quyền.
- Cập nhật `e2e-export`: giao khoán nay có BM-20 thay BM-03 (26 nút, 22 file). `npm test` 63/63, 9 bộ e2e đạt trên Linux. Đã xem ảnh bản Word BM-20 (3 trang, dựng bằng LibreOffice).
- **Pháp lý chưa được xác minh bởi người có chuyên môn**: căn cứ Điều 18 Bộ luật Lao động 2019 (nhóm người lao động từ đủ 18 tuổi ủy quyền cho một người trong nhóm; kèm danh sách họ tên, ngày sinh, giới tính, nơi cư trú, chữ ký; không được ủy quyền lại) và các điều về đại diện, hợp đồng ủy quyền của Bộ luật Dân sự 2015 được tra qua các trang tư vấn pháp luật, **chưa đối chiếu văn bản gốc**. Điều 18 áp dụng cho công việc theo mùa vụ hoặc có thời hạn dưới 12 tháng; phần mềm không tự kiểm tra điều kiện này. Mẫu cần luật sư hoặc người phụ trách duyệt trước khi dùng chính thức.
- Chưa kiểm tra: mở bằng Word; so số liệu xuất ra với bản HTML gốc bằng dữ liệu thật; công chứng/chứng thực Giấy ủy quyền (phần mềm không yêu cầu).

### Đơn giá vận chuyển: hai cách tính cố định và tấn/km (Windows CI: [run 19](https://github.com/saoluucvhak-pixel/HAK_APP_FSC/actions/runs/43161528692), commit `12304d0`): `npm ci`, build, unit, trọn bộ e2e Electron (gồm e2e hợp đồng và vận chuyển), đóng gói, cài thật `.exe`, kiểm tra khói 2 pha và quét chất lượng mã đều đạt. Artifact `HAKQN-Setup-12304d0b3204db1bb4137bc1af4bf28c003eaced` (86.749.295 byte, digest zip `sha256:1b1aa825…5dc02c`).)
- Yêu cầu của người phụ trách: duy trì 2 đơn giá vận chuyển: (1) cố định, (2) tấn/km. Trước đây còn cách thứ 3 “tấn theo bậc cự ly”; đã gỡ khỏi giao diện, cách tính và kiểm tra dữ liệu. Hồ sơ cũ còn chọn cách đó bị báo cần chọn lại (không tự đổi số tiền), dữ liệu bậc cũ giữ nguyên.
- `scripts/e2e-vanchuyen.js` (Electron thật): **22 kiểm tra đạt**: ô chọn chỉ còn 2 cách; chỉ hiện ô giá của cách đang chọn; tấn/km 1.000 × 45 km = 45.000 đồng/tấn và cố định 52.000 đồng/tấn thể hiện đúng ở hợp đồng vận chuyển (BM-04); tiền từng xe ở BM-10 khớp khối lượng theo phiếu cân (tính độc lập từ file thử) × đơn giá; cố định không cần cự ly, tấn/km thì cần; báo lỗi khi nhập không phải số hoặc chưa nhập giá; hồ sơ cũ theo bậc: bị báo, không xuất được, chọn lại thì tính được và dữ liệu bậc cũ không mất.
- `npm test` 63/63; 10 bộ e2e đạt trên Linux. Chưa kiểm tra: so số liệu với bản HTML gốc bằng dữ liệu thật; mở bằng Word.


## 8. Bản 1.1.0: công ty mua hàng, điểm đến vận chuyển, sửa lỗi ngày (nhánh `claude/magical-dijkstra-xhn2k9`)
Đã chạy trong môi trường Linux (Electron thật dưới xvfb): `npm test` 78 bài đạt; `scripts/e2e-congty.js` đạt (2 rừng/2 công ty, đóng–mở lại, BM-04/09/10, đổi công ty, sửa danh mục giữ bản chụp, nơi giao khác, hồ sơ cũ nhập tay); các e2e cũ chạy lại. Nâng cấp SQLite v2→v3 có sao lưu, kiểm bằng CSDL v1.0.0 thật (`tests/fixtures/hakqn_v1_0_0.sqlite`): hồ sơ cũ (điểm đến nhập tay, cước “theo bậc”, phiếu 31/02/2026) giữ nguyên dữ liệu; rừng R-CU2 (cước theo bậc) phải chọn lại cước.
**Chưa kiểm:** mở BM-04/BM-20 bằng Microsoft Word thật; cài đè lên bản 1.0.0 đã cài trên máy Windows thật; đồng bộ Google Sheets thật (cần tài khoản được cấp quyền). Kết quả CI Windows xem ở PR.

## 9. Bản 1.2.0: sửa ghi đè khi khôi phục, sao lưu/khôi phục theo lô rừng
Lỗi gốc (đối chiếu với `acf1490`): `applyImport` + `overwrite` gán `next.rs[hit] = {...o}` nên thay CẢ hồ sơ chủ; file chỉ có lô A thì lô B của chủ bị xóa khi lưu. Đã tái hiện bằng `tests/lorung.test.js` (ghi đè chỉ giữ lô A) rồi sửa: nhận diện trùng dùng chung `src/lorung.js` (`planImport`) cho xem trước và ghi.
Đã chạy trên Linux (Electron thật dưới xvfb, proxy trỏ cổng chết nên mọi thao tác chạy khi không có mạng): `npm test` 91/91; toàn bộ `npm run test:e2e` đạt, gồm `scripts/e2e-lorung.js`:
- xuất riêng A, sửa A và B, khôi phục A (mặc định giữ; thay đúng A): A về đúng bản sao lưu, B và chủ khác giữ nguyên, có sao lưu SQLite tự động;
- cùng ca qua nhập bản sao lưu toàn bộ cũ với “Ghi đè”; “Thay toàn bộ” hỏi xác nhận nêu rõ phạm vi;
- chuyển A sang cơ sở dữ liệu mới: số bản ghi, tổng tấn 21,75, số tiền BM-10 và điểm đến BM-04 giống bản gốc; nhập lại cùng file không đổi gì;
- mã lô trùng dưới chủ khác, chủ lạ mà mã lô đã có, file không phải JSON/bị sửa/sai phiên bản/thiếu mã lô, bản sao lưu toàn bộ đưa nhầm vào luồng lô (và ngược lại): báo lỗi, dữ liệu không đổi;
- lỗi giữa giao dịch (trigger SQLite giả lập lỗi): hoàn tác toàn bộ (unit test);
- ngày: nhập Excel 31/02/2026 bị chặn kèm số phiếu và lý do, 29/02/2028 được nhận; phiếu cũ sai ngày có ô sửa (29/02/2026 bị từ chối, 29/02/2028 nhận). Sửa kèm: thông báo “Chưa sửa phiếu…” trước đây bị mất do render hai lần.
**Chưa kiểm:** hộp thoại lưu/mở file thật của Windows (e2e dùng biến môi trường thay hộp thoại); chuyển lô sang một tài khoản Windows/máy thật khác; mở BM-04/BM-20 bằng Microsoft Word; Google Sheets thật. Kết quả CI Windows của commit này xem ở PR.

## 10. Chỉnh theo yêu cầu: phần mềm dùng cho MỘT công ty
Bỏ danh mục nhiều công ty (danh sách, tìm kiếm, thêm/xóa, tạo nhanh, chọn công ty theo rừng). Còn **một hồ sơ Công ty mua hàng** và mỗi rừng chỉ chọn **địa chỉ giao** của công ty đó; bản chụp địa chỉ theo rừng, kiểm tra thay đổi, BM-04/09/10 và Sổ phiếu cân giữ nguyên cách hoạt động. Lưu trữ vẫn dùng bảng `companies` (một dòng), nên không cần đổi cấu trúc SQLite và dữ liệu ở bản 1.1/1.2 vẫn mở được (nếu có nhiều dòng thì dùng dòng đầu theo tên). `scripts/e2e-congty.js` viết lại cho mô hình này (đạt).

## 11. Bản 1.3.0: mã lô duy nhất, “Giữ cả hai”, hoàn thiện khôi phục lô, kiểm tra trước khi xuất
Lỗi tái hiện ở `acf1490`/`057242c`: “Giữ cả hai” tạo ID mới nhưng giữ mã lô; sao lưu lô nhân bản rồi khôi phục trên cùng máy thì ID và mã chỉ về hai lô khác nhau. Đã sửa bằng quy tắc mã lô duy nhất (`maTrung`, `src/lorung.js`) dùng chung ở xem trước, lúc ghi, form lô, tạo lô và nhập sao lưu; mã mới do người dùng xác nhận, nhân công/xe/phiếu cân đổi theo mã.
Đã chạy trên Linux (Electron thật dưới xvfb, proxy trỏ cổng chết = không có mạng): `npm test` 95/95; toàn bộ `npm run test:e2e` đạt, gồm `e2e-malo` (giữ cả hai → mã mới → sao lưu lô mới → khôi phục đúng lô mới; mã trùng bị từ chối ở xem trước và lúc ghi; mã trùng dữ liệu cũ liệt kê đủ và giữ nguyên đến khi đổi mã; thiết lập dùng chung khác máy đích; màn hình kiểm tra trước khi xuất), `e2e-lorung` (thêm so sánh tiền công BM-01, cước BM-10, BM-04, tổng tấn khi chuyển lô sang hồ sơ mới) và `e2e-nangcap` (mở BẢN SAO cơ sở dữ liệu do mã v1.0.0 tạo: sao lưu trước nâng cấp, dữ liệu cũ đủ, địa chỉ nhập tay còn hiển thị và chỉ đổi sau xác nhận, tra cứu ba tab còn nguyên).
CI Windows có thêm bước **nâng cấp từ bộ cài thật v1.0.0**: tải bộ cài từ Release v1.0.0 (kiểm mã băm công bố), cài, mở bản 1.0.0 để nó tạo cơ sở dữ liệu, đặt dữ liệu giả lập do mã v1.0.0 tạo, cài đè bản mới, chạy `HAKQN_SMOKE_PHASE=upgrade` kiểm tra dữ liệu (xem kết quả ở PR). Giới hạn: bản 1.0.0 không có chế độ chạy tự động nên dữ liệu thử được đặt vào hồ sơ người dùng bằng file cơ sở dữ liệu của v1.0.0, không nhập qua giao diện v1.0.0.
**Chưa kiểm:** hộp thoại lưu/mở file thật của Windows; chuyển lô sang một máy/tài khoản Windows khác thật; đồng bộ Google Sheets thật (không có tài khoản/OAuth được cấp quyền trong môi trường này); mở BM-04 và BM-20 bằng Microsoft Word (không có Word).

## 12. Bản 1.4.0: file Excel mẫu chuyên nghiệp có hướng dẫn, viết lại hướng dẫn sử dụng
- **File mẫu** (nhân công, đội xe, phiếu cân) do `src/xlsxmau.js` tạo bằng OOXML thuần: 3 trang tính `HUONG_DAN` (mục đích, các bước, mô tả từng cột gồm bắt buộc/định dạng/ví dụ/lưu ý, quy tắc kiểm tra, lỗi thường gặp), trang dữ liệu (tiêu đề đúng như phần mềm đọc, tô màu cột bắt buộc, cố định dòng tiêu đề, bộ lọc, danh sách chọn, ô gợi ý theo cột, cột văn bản giữ số 0 đầu CCCD) và `VI_DU` (dữ liệu giả, không bị đọc). Trang dữ liệu để trống nên không lẫn dòng ví dụ khi nạp.
- **Kiểm thử:** `tests/xlsxmau.test.js` (tên và thứ tự cột trùng đúng `H_NC/H_DX/H_PC` trong ứng dụng, cột bắt buộc khớp bộ nạp, XML đúng cú pháp, định dạng, danh sách chọn); mở thử bằng openpyxl và LibreOffice (chuyển PDF, xem hình); `scripts/e2e-mau.js` tải mẫu bằng nút trong ứng dụng, chép dòng ví dụ sang trang dữ liệu và nạp lại thành công cho cả ba mẫu (CCCD giữ số 0 đầu, 29/02/2028 được nhận, khối lượng “25,4” đọc đúng).
- **Chưa kiểm:** mở file mẫu bằng Microsoft Excel thật (đã kiểm bằng LibreOffice và openpyxl); phần hộp gợi ý/danh sách chọn hiển thị đúng trong Excel cần xác nhận khi dùng thử.
- **Hướng dẫn sử dụng** viết lại hoàn toàn (`docs/HUONG_DAN.md` và hộp **❓ Hướng dẫn** trong phần mềm) theo quy trình làm việc: cài đặt, 8 bước, chủ rừng và lô (mã lô duy nhất), nhân công và hợp đồng, vận chuyển và địa chỉ giao, file mẫu, tra cứu Google Sheets, kiểm tra trước khi xuất, xuất hồ sơ và báo cáo, sao lưu/khôi phục (toàn bộ và theo lô), nâng cấp, quy tắc dữ liệu, xử lý sự cố, lưu ý trước khi dùng chính thức.
- **CI bản 1.3.0 ([run 24](https://github.com/saoluucvhak-pixel/HAK_APP_FSC/actions/runs/43177085503)) KHÔNG đạt:** kiểm thử đơn vị, toàn bộ e2e trên Windows (gồm `e2e-malo`, `e2e-nangcap`, `e2e-lorung`) và đóng gói đều đạt; bước “Cài bộ .exe và kiểm tra khói” lỗi ngay khi chạy bộ cài (mã thoát -1073741819, 0xC0000005, 3 giây), nên các bước sau (kể cả bước nâng cấp từ bộ cài thật v1.0.0) bị bỏ qua. Cùng bước này đã đạt ở run 22 và 23; xem kết quả bản 1.4.0 ở PR.

## 13. Bản 1.4.1: cự ly nhập ngay ở tab Vận chuyển; số hợp đồng, ngày ký hợp đồng của chủ rừng
- **Cự ly tấn/km:** chỉ nhập ở **một chỗ**: tab Thông tin rừng, ô “Cự ly vận chuyển (km)”. Tab Vận chuyển chỉ hiện lại số km (khi chọn tấn/km) kèm nút mở nhanh tab Thông tin rừng (đã gỡ ô nhập thứ hai theo yêu cầu).
- **Chủ rừng:** bỏ ô ngày sinh (hồ sơ cũ vẫn giữ giá trị đã lưu, không còn in; các biểu mẫu có khối thông tin chủ rừng (bên A, người cam kết) không còn dòng “Sinh năm”); thêm **Số hợp đồng** và **Ngày ký hợp đồng** (tùy chọn, ngày phải có thật). Ngày ký là ngày ký mặc định của biểu mẫu khi ô “Ngày ký hợp đồng” ở tab Xuất hồ sơ để trống; in dòng “Căn cứ Hợp đồng số … ký ngày …” ở BM-01, BM-04 và ở BM-17. Tra cứu Google Sheets điền hai trường này từ “Mã hợp đồng” và “Ngày ký hợp đồng” của tab HoSoRung_QC.
- **Kiểm thử:** `scripts/e2e-hopdongso.js` (form chủ rừng, ngày 31/02/2026 bị từ chối, nội dung BM-01, ô cự ly ở tab Vận chuyển) đạt; cập nhật các e2e cũ dùng form chủ rừng; `npm test` 104/104; toàn bộ `npm run test:e2e` đạt.
- **Giả định cần xác nhận:** số hợp đồng và ngày ký đặt ở cấp **chủ rừng** (thay vị trí ngày sinh); nếu cần theo từng lô (một chủ có nhiều hợp đồng) thì chuyển sang thông tin lô.

## 14. Bản 1.4.5: số hợp đồng và năm trong biểu mẫu; kiểm thử cài đè 1.4.x; chẩn đoán CI
- **Lỗi biểu mẫu đã sửa:** số hợp đồng và dòng ngày ghi cứng “2026” (`/2026-KT`, `/2026-UQ`, `/2026-NTTL`, `/2026-HĐVC`, `/2026-XNKL`, `/HĐLĐ/2026`, “năm 2026”, “…/…/2026”, “Tháng …/2026”). Quy tắc dùng chung nằm ở `src/hopdong.js` và áp dụng cho BM-01, BM-04, BM-09, BM-10, BM-14, BM-20 (xem hướng dẫn mục 9): số đầy đủ giữ nguyên; chỉ nhập phần số thì năm lấy từ ngày ký của chính hợp đồng; thiếu ngày thì để trống năm và nêu trường cần bổ sung. Tab Xuất hồ sơ có khung xem trước số đầy đủ (cập nhật khi gõ) và thêm ô “Giấy ủy quyền: ngày lập” (trước đây mã đã dùng ngày này nhưng chưa có ô nhập).
- **Kiểm thử:** `tests/hopdong.test.js` (năm 2026, 2027, thiếu ngày, ngày không có thật, số đã có hậu tố, ba biểu mẫu cùng số); `scripts/e2e-sohd.js` xuất BM-01, BM-14, BM-20, BM-04 thật và đối chiếu số in với xem trước; chuyển thử BM-01, BM-04, BM-14, BM-20 sang PDF bằng LibreOffice (không phải Microsoft Word).
- **Cài đè từ 1.4.x:** `tests/fixtures/hakqn_v1_4.sqlite` (một chủ hai lô A và B: điện thoại, số và ngày ký hợp đồng, địa chỉ giao, cước tấn/km và cố định, nhân công, xe, phiếu cân, bản tra cứu) do `scripts/make-v14-fixture.js` ghi bằng lớp lưu trữ của mã hiện tại (cấu trúc v3 không đổi từ 1.2.0, nên bản 1.4.0 mở được; các trường điện thoại và số hợp đồng chỉ được thử “giữ nguyên qua cài đè”). `scripts/e2e-nangcap2.js`: dữ liệu còn đủ, sao lưu A → sửa A → khôi phục A (B và chủ giữ nguyên), “Giữ cả hai” có mã mới, khôi phục A trên hồ sơ mới khi mất mạng (nhân công, xe, phiếu cân, tổng tấn, tiền công BM-01, tiền cước BM-10, địa chỉ giao BM-04) cho máy đích chưa có Công ty mua hàng và máy đích có công ty khác, tra cứu offline từ bản đã lưu.
- **CI Windows:** thêm bước nâng cấp từ bộ cài THẬT v1.4.0 (tải từ Release, kiểm mã băm, cài, mở để tạo dữ liệu, đặt dữ liệu thử, cài đè bản mới, `HAKQN_SMOKE_PHASE=upgrade14`).
- **Lỗi cài đặt ngắt quãng ở CI:** [run 24](https://github.com/saoluucvhak-pixel/HAK_APP_FSC/actions/runs/43177085503) (bản 1.3.0) và [run 31](https://github.com/saoluucvhak-pixel/HAK_APP_FSC/actions/runs/43184893670) (bản 1.4.4, commit `5c422e9`) cùng lỗi ngay khi chạy bộ cài (mã thoát -1073741819 = 0xC0000005, khoảng 3 giây), trong khi các run 22, 23, 25, 26, 32 đạt và [run 32](https://github.com/saoluucvhak-pixel/HAK_APP_FSC/actions/runs/43185371743) dựng cùng commit `5c422e9` với run 31 vẫn đạt. Nghĩa là cùng mã nguồn có lần đạt, có lần lỗi; log cũ chỉ có mã thoát nên **chưa xác định được nguyên nhân** (nghi lỗi ngắt quãng của máy chạy hoặc bộ cài NSIS, chưa chứng minh). Theo yêu cầu, chỉ thêm chẩn đoán, không sửa bộ cài hay che lỗi bằng chạy lại: bước cài ghi `diag/install-<tag>.txt` (mã thoát, mã thoát dạng hex, phiên bản, commit, kích thước, SHA-256, thời gian, nội dung thư mục cài); khi một bước thất bại, thu thập nhật ký sự cố Windows, thông tin máy, tiến trình, thư mục tạm của bộ cài, bản ghi sự cố và tải lên artifact `install-diagnostics-<sha>-run<id>`.

## 15. Bản 1.4.7: in hồ sơ làm hai đợt
- **Nhu cầu:** đã có nhân công, vận chuyển nhưng chờ xong rừng mới có phiếu cân và nghiệm thu; muốn in toàn bộ hồ sơ trước rồi bổ sung phần thanh toán, nghiệm thu khối lượng sau.
- **Thêm** ở tab Xuất hồ sơ → Tất cả: **Đợt 1** (mọi biểu mẫu trừ BM-08, BM-09, BM-10, BM-14) và **Đợt 2** (chỉ BM-08, BM-09, BM-10, BM-14; BM-09 và BM-10 chỉ có khi đủ phiếu cân hợp lệ, nếu thiếu thì báo rõ). “Tải toàn bộ” giữ nguyên.
- **Kiểm thử:** `scripts/e2e-haidot.js` (chưa có phiếu cân: đợt 1 không chứa biểu mẫu đợt 2, đợt 2 chỉ BM-08 và BM-14 kèm thông báo; có phiếu cân: đợt 2 đủ bốn biểu mẫu; đợt 1 cộng đợt 2 bằng đúng tập của “Tải toàn bộ”).
