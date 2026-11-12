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

### Đơn giá khoán chỉ nhập một chỗ (commit `9da9fd7`, [run 16](https://github.com/saoluucvhak-pixel/HAK_APP_FSC/actions/runs/43157915260): Windows CI đạt)
- Windows CI: `npm ci`, build, unit, trọn bộ e2e Electron (gồm e2e đơn giá), đóng gói, cài thật `.exe`, kiểm tra khói 2 pha và quét chất lượng mã đều đạt. Artifact `HAKQN-Setup-9da9fd7cc6647678c3d348a8dd90a7a6c3de4e5e` (86.747.618 byte, digest zip `sha256:6a8c8b10…284ce8`).
- Lỗi người dùng báo: Thông tin rừng bắt nhập “Đơn giá khoán” (không nhập thì không lưu được rừng) trong khi cùng khái niệm đã có ở tab Nhân công (đơn giá Tổ trưởng). Hai ô dùng loại trừ nhau theo mô hình ký nên được gộp thành một ô ở tab Nhân công; giá được đọc qua `khoanPrice()` (ưu tiên tab Nhân công, hồ sơ cũ dùng giá cũ ở `info.donGia`) nên nội dung hợp đồng giao khoán, nghiệm thu và thành tiền không đổi. Đã so lại: các nơi đọc `rs.donGia` đều đổi sang `khoanPrice(rs)`.
- `scripts/e2e-dongia.js` (Electron thật): 15 kiểm tra đạt: bỏ ô khỏi Thông tin rừng; lưu rừng không bị chặn; checklist nhắc đúng chỗ; ô Tổ trưởng ẩn/hiện đúng theo mô hình ký và hình thức lương; lưu vào SQLite và nhớ sau khi mở lại; hồ sơ cũ chỉ có đơn giá ở rừng không báo thiếu và tự điền giá cũ.
- Sửa các e2e cũ (`e2e`, `e2e-lookup`, `e2e-export`) không điền đơn giá ở Thông tin rừng; `e2e-export` nhập giá ở tab Nhân công và vẫn xuất đủ BM-01…BM-19 và ZIP (29 nút, 25 file, 0 nút bị khóa). `e2e-skins` nay dùng thư mục dữ liệu riêng để không phụ thuộc lần chạy trước.
- `npm test` 63/63 đạt; `npm run test:e2e` đạt cả 8 bộ trên Linux.
- Chưa kiểm tra: so số liệu xuất ra với bản HTML gốc bằng dữ liệu thật; mở bằng Word.
