# Nhật ký thay đổi

## 2.2.0 — Bản ổn định sau v1.4.33 (dự kiến phát hành; số phiên bản chờ người phụ trách duyệt, chưa gắn thẻ)

Bản 2.2.0 gồm phần này và bốn phần “2.2.0 (phần)” bên dưới, cùng các bản 2.1.0 và 2.0.0 (chưa từng phát hành công khai; bản công khai gần nhất là v1.4.33).

### Thay đổi
- **Phiên bản hiện ở đầu trang** (“· Phiên bản 2.2.0” cạnh tên ứng dụng), lấy từ chính bản cài; kiểm tra khói của bộ cài (kể cả sau khi cài đè lên v1.4.33) so số này với `package.json`.
- **Phạm vi gói sao lưu riêng lô đối với lô đã chốt nhiều lần** được ghi rõ ở thông báo sau khi sao lưu, màn xem trước khi khôi phục và hướng dẫn: gói chỉ mang **bản chốt hiện hành** (một bản chụp, phiên bản và dấu vân tay giữ nguyên); bản chụp các lần chốt trước ở lại máy đã chốt (bảng `chot_goi`, có trong Sao lưu toàn bộ dạng SQLite); nhật ký vòng đời (lần chốt, lý do mở khóa, dấu vân tay từng lần) đi theo gói. Hành vi sao lưu, khôi phục không đổi.

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

### Việc còn lại
- Chưa có màn riêng khai **đơn giá khoán / ngày công theo vị trí** cho từng hợp đồng: vẫn dùng khung đơn giá ở tab Nhân công.
- Đối tác cá nhân chưa được dựng sẵn khi nâng cấp (danh sách bắt đầu trống, người ký xe cũ vẫn nằm trong dữ liệu lô).
- Bước CI nâng cấp từ bản dựng 2.0.0 chưa thêm; chuyển SQLite v7 đã có unit test.
- Còn lại từ 2.0.0: hàm quy tắc kiểm tra thuần trong `src/`, `db.chucDanhThem` (xem mục dưới).

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
