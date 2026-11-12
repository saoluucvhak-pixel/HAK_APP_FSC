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
| 6 | Báo cáo: phiếu trùng số bị cộng vào tổng nhưng không được nêu rõ | Hai rừng cùng số phiếu `P2` | **Giữ nguyên cách tính** (không tự xóa phiếu, chưa có quy tắc nghiệp vụ) nhưng đánh dấu cả hai dòng “Trùng số phiếu”, thêm chỉ tiêu “Phiếu trùng số” và ghi chú nêu số phiếu, số tấn đang tính | `sổ phiếu cân…` (đơn vị) và `e2e-reports` |
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

**Quy tắc phiếu trùng số:** vẫn tính vào tổng (hệ thống không tự xóa phiếu; chưa xác định được nghiệp vụ), được đánh dấu và nêu rõ cách tính trong báo cáo. Cần người phụ trách xác nhận nên loại hay giữ.

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
