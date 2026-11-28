# Đề bài: Rà soát nâng cấp, sửa chữa toàn diện hệ thống HAK FSC_OFFLINE (sau mốc V3.3.0)

## Bối cảnh
- Kho: `saoluucvhak-pixel/HAK_APP_FSC`, ứng dụng desktop Electron + better-sqlite3 (HAKQN Desktop, quản lý hồ sơ khai thác và vận chuyển gỗ keo).
- **Mốc phiên bản hiện tại trên `main`:** **v3.3.0** (commit `6eb81ade3557ea8dbb8da70babab2bea9d7793ee`, ngày 23/11/2026, sau khi gộp PR #86).
  - Bản v3.3.0 đã bổ sung phân hệ "Dữ liệu Google Sheets theo hợp đồng", modal Cha–Con, phân bổ phiếu cân vào rừng, phát hiện và xử lý Đổi số phiếu, cảnh báo hợp đồng nhiều CCCD, lưu nháp Google Sheets đa lô.
  - Kết quả kiểm định v3.3.0: 791 / 793 bài kiểm thử đơn vị đạt (0 lỗi, 2 bỏ qua); 132 / 132 bộ e2e đạt ở độ phân giải 1024×768; 206 / 206 tài liệu bản in `.docx` khớp từng byte.
- Qua đợt rà soát mã nguồn toàn diện sau khi cập nhật v3.3.0, phát hiện một số điểm nợ kỹ thuật, lỗi tiềm ẩn và cơ hội tối ưu hóa thuộc 4 phân hệ: Thiết kế UI/UX (chuẩn V10.4), Xử lý dữ liệu & Tính toàn vẹn, Hệ thống bộ lọc thông minh, Cơ chế sao lưu & khôi phục an toàn.
- **Lưu ý đã xác nhận:** Bố cục sticky của Master Pane ở màn hình hẹp **đã được xử lý hoàn tất** từ trước (tại `ui/app.src.html:257` đặt `aside.hak-master-pane{position:static}` ở $\le 1100$ px và dòng 196 đặt `.gsMaster{position:static}` ở $\le 820$ px cho modal Cha–Con), không cần làm lại.

## Phạm vi & Phân nhánh
- **Nhánh làm việc mới từ `main` mới nhất (v3.3.0 `6eb81ad`):** `fix/fsc-v330-refinements` (hoặc `feature/v330-nang-cap-he-thong`).
- **Tạo một PR riêng vào `main`**, tuyệt đối **không** commit hay merge thẳng vào `main`.
- **Bảo tồn tính năng PR #84 & PR #86:**
  - Giữ nguyên các cột "Ngày cân 1/2" và "Số phiếu" ở đầu bảng phiếu cân (`#stTbl_pc`).
  - Giữ nguyên vẹn cơ chế phân bổ phiếu cân (`src/phanbophieu.js`), đổi số phiếu (`src/doiso.js`) và phân hệ Google Sheets (`ui/app/17-f-*.js`, `17-g-*.js`, `17-h-*.js`).

---

## Danh mục 21 hạng mục cần sửa & nâng cấp trên nền tảng v3.3.0

### 1. Thiết kế & Giao diện (UI/UX - HAK Enterprise Design System V10.4)
| Mã | Tệp liên quan | Hiện tượng / Lỗi phát hiện | Cách sửa chi tiết |
| :---: | :--- | :--- | :--- |
| **UI-01** | `ui/app/11-d-luu-ban-nhap.js`, `ui/app/12-c-hop-dong-vc.js`, `ui/vendor/hak-design-system/luxe.css` | Khai báo inline `background: var(--sel, #eef5ee)`. Biến `--sel` chưa có trong CSS, fallback về `#eef5ee`. Ở Dark Mode chữ sáng trên nền này có tương phản chỉ **1.14:1** (không đọc được). | Định nghĩa chính thức `--sel` trong `luxe.css`: Light mode dùng `--sel: var(--accSoft, #eef5ee)`, Dark mode dùng `--sel: var(--hover, #1e3550)`. Bỏ inline hardcoded. |
| **UI-02** | `ui/app.src.html` | `.rungTomTat` và `#loCrumb` dùng `color: var(--mut)` (`#6b7a8c`), tương phản trên nền trắng là $4.42:1$ (dưới chuẩn WCAG AA $4.5:1$). | Đổi sang dùng token chuẩn `color: var(--mut-aa)` (`#6b655a`, tương phản $5.8:1$). |
| **UI-03** | `ui/app.src.html`, `ui/app/11-b-ban-nhap.js` | Quy tắc compact padding `3px 6px` và `max-height: 55vh` mới chỉ ưu ái cho bảng phiếu cân `#stTbl_pc`. Bảng nhân công `#stTbl_nc` và xe `#stTbl_dx` vẫn dùng padding `8px 9px`, ở 1366×768 150% chỉ thấy 1-2 dòng. | Mở rộng selector compact trong `@media (max-width: 1100px)` áp dụng đồng bộ `padding: 3px 6px` cho cả `#stTbl_nc th, td` và `#stTbl_dx th, td`. |
| **UI-04** | `ui/app.src.html`, `ui/app/17-g-hop-dong-hop-thoai.js` | Các hộp thoại modal (`#stBox`, `#dlgBox`, `#impBox`, `#lkBox`, `#rpBox`, `#guideBox`, `#hdModal`) có `role="dialog"` nhưng thiếu `aria-labelledby`. | Bổ sung `aria-labelledby="stBoxTitle"`, `aria-labelledby="hdModalTitle"`, v.v. trỏ khớp ID vào thẻ `<h2>` bên trong header modal. |
| **UI-05** | `ui/app/17-e-ghi-vao-ho-so.js` | Bộ lọc focus trap dùng `x.offsetParent`. Trong DOM chuẩn, phần tử nằm trong chuỗi `position: fixed` có thể trả về `offsetParent === null` làm tê liệt bẫy phím Tab. | Đổi sang dùng `x.checkVisibility ? x.checkVisibility() : (x.offsetWidth > 0)` và lưu/trả lại focus cho phần tử kích hoạt khi đóng modal. |
| **UI-06** | 5 tệp giao diện | Phân mảnh các listener bắt phím Esc riêng lẻ, thiếu ngăn xếp modal tập trung; phím tắt Ctrl+S bị chặn khi mở modal nhưng không kích hoạt lưu form của modal đó. | Tạo `ModalStackManager` tập trung; khi mở modal, Ctrl+S sẽ kích hoạt submit/lưu biểu mẫu của chính modal đang active. |
| **UI-07** | `ui/app/12-d-trang-van-chuyen.js`, `ui/app/31-hop-dong.js` | Khung Master ở $\le 1100$ px đã xếp trên Detail (`max-height: 130px`), nhưng khi người dùng cần tập trung làm việc với bảng 12 cột, việc thêm nút thu gọn (Toggle) sẽ giải phóng hoàn toàn không gian dọc và ngang. | Bổ sung nút thu gọn / mở rộng (Collapse/Expand toggle) Master Pane để tối ưu không gian khi làm việc chuyên sâu với bảng Detail. |

*(Ghi chú: Mục UI-08 về chống sticky đè chuột ở modal Cha–Con và Master Pane đã có sẵn tại `ui/app.src.html:196` và `257`, không cần làm lại).*

### 2. Xử lý Dữ liệu & Tính toàn vẹn (Data Integrity Engine)
| Mã | Tệp liên quan | Hiện tượng / Lỗi phát hiện | Cách sửa chi tiết |
| :---: | :--- | :--- | :--- |
| **DATA-01** | `src/docphieucan.js`, `src/noidunghopdong.js` | Hàm `moneyWords` bỏ qua các nhóm 3 chữ số bằng 0 (`if (parts[k])`), làm mất tên lớp đơn vị ("triệu", "nghìn") trong các số tiền đặc thù như `1.000.050.000` đ hay `1.000.005` đ. | Bổ sung logic giữ tên lớp đơn vị khi có nhóm lớn hơn phía trước. **LƯU Ý:** Các số tiền tròn như `9.000.000` đ, `1.500.000` đ phải giữ nguyên văn cách đọc để không làm đổi 206/206 bản in! |
| **DATA-02** | `src/money.js`, `src/so.js`, `src/docphieucan.js` | Số âm không (`-0`) dạng number lọt qua điều kiện `v < 0` (vì `-0 < 0` là `false`), trong khi chuỗi `"-0"` bị chặn. | Chuẩn hóa đầu hàm: `if (Object.is(v, -0) || v === 0) v = 0;`. Tại `normPC` kiểm tra `isFinite(kl) && kl > 0`. |
| **DATA-03** | `src/dinhmuc.js`, `src/so.js` | Lệnh `.replace(',', '.')` thiếu cờ toàn cục `/g`. Chuỗi có nhiều phân cách nghìn kiểu quốc tế `1,250,000` bị parse thành `1.25` tấn (giảm 1000 lần khối lượng). | Đổi thành `.replace(/,/g, '.')` hoặc tái sử dụng bộ chuẩn hóa tập trung `HAKSo.toDec`. |
| **DATA-04** | `src/lookup.js`, `src/doituong.js` | Chưa có hàm `mstTuSo` tương tự `cccdTuSo`. Mã số thuế bắt đầu bằng số 0 (Hà Nội 01..., TP.HCM 03...) bị Excel ép thành số 9 chữ số sẽ bị báo lỗi. | Viết hàm `mstTuSo(n)`: nếu là chuỗi số 9 chữ số thì tự động bù `'0' + n` thành 10 chữ số hợp lệ. |
| **DATA-05** | `src/lienket.js`, `src/model.js`, `src/store.js` | Mảng ID nhân công/xe đã xóa (`daXoaNc`, `daXoaDx`) không được lưu bền vững vào CSDL của lô. Ở phiên làm việc sau, ID của dòng đã xóa (`tv2`, `xr2`) bị cấp lại cho người mới. | Lưu bền vững mảng `f.idDaCap = { nc: [...], dx: [...] }` tương tự `f.sttDaCap`, đảm bảo ID dòng không bao giờ bị tái cấp. |
| **DATA-06** | `src/model.js` | Kiểm tra đội (`teamErrors`) luôn đòi hỏi phải có "Tổ trưởng" ngay cả khi mô hình ký là trực tiếp `tructiep` (chủ rừng ký HĐLĐ trực tiếp với từng cá nhân). | Sửa điều kiện: `if (!direct && m.length && !tts.length) errs.push({text: lb + ' chưa có Tổ trưởng'});`. |

### 3. Hệ thống Bộ lọc thông minh (HAK_SMART_FILTER Integration)
| Mã | Tệp liên quan | Hiện tượng / Lỗi phát hiện | Cách sửa chi tiết |
| :---: | :--- | :--- | :--- |
| **FLT-01** | `ui/app/30-cai-dat-danh-muc.js` | Tồn tại song song ô lọc cũ (`#dtNhom`, `#dtQ`, `#xeQ`) và thanh Smart Filter mới. Dữ liệu bị lọc 2 lần lồng nhau, số đếm thống kê bị sai lệch. | Gỡ bỏ hoàn toàn bộ lọc cũ `#dtNhom`, `#dtQ`, `#xeQ`; chuyển `nhom` vào `quickFields` của Smart Filter. |
| **FLT-02** | `ui/app/35-bo-loc-thong-minh.js` | Sự kiện `input` trên ô tìm kiếm nhanh `[data-sfq]` kích hoạt re-render toàn bộ bảng ngay lập tức trên từng phím bấm, gây giật lag khi dữ liệu lớn. | Cài đặt Debounce 250ms cho sự kiện input và memoize danh sách options (`bksOpts`, `noiOpts`). |
| **FLT-03** | `ui/app/35-bo-loc-thong-minh.js` | Khi kho preset bị hỏng (corrupt), hàm `save()` trả về lỗi nhưng Drawer không có nút bấm gọi `discardCorrupt()` khiến người dùng bị khóa chết tính năng lưu preset. | Bổ sung hộp thoại xác nhận gọi `discardCorrupt()` sao lưu kho cũ sang `"hak.sf.presets.bak"` và tạo kho mới an toàn. |
| **FLT-04** | `ui/app/30-cai-dat-danh-muc.js`, `ui/app/33-phan-bo.js` | Màn hình Danh mục Vị trí (`panelSetVt`) và Bảng Phân bổ khối lượng (`panelPhanBo`) hoàn toàn chưa có bộ lọc. | Tích hợp `HAK_SMART_FILTER` cho Danh mục Vị trí và Bảng Phân bổ khối lượng. |
| **FLT-05** | `ui/vendor/hak-smart-filter/core/smart-filter.js` | Hàm `matchQ` chỉ so khớp chuỗi liền kề `includes(q)`. Gõ từ khóa ghép (ví dụ "xe an") không tìm thấy nếu 2 từ nằm ở 2 cột khác nhau. | Tách chuỗi `q.split(/\s+/)`, yêu cầu tất cả các từ khóa con đều phải xuất hiện trong dòng dữ liệu (phép toán AND logic). |

### 4. Hệ thống Sao lưu & Khôi phục (Backup & Restore Engine)
| Mã | Tệp liên quan | Hiện tượng / Lỗi phát hiện | Cách sửa chi tiết |
| :---: | :--- | :--- | :--- |
| **BK-01** | `src/backup.js`, `src/khosaoluu.js` | Thao tác "Sao lưu toàn bộ thủ công" chỉ ghi vào 2 thư mục nội bộ, chưa tự động chép sang thư mục thứ 2 (`backupDir2` - USB/ổ cứng ngoài). | Mở rộng `backupAll`: nếu có `backupDir2`, tự động sao chép cả `.sqlite` và `.json` sang thư mục thứ 2 qua file tạm atomic. |
| **BK-02** | `src/autobackup.js` | Regex dọn file tạm mồ côi `cleanStaleTmp` chỉ nhận diện 1 cụm số PID (`.tmp-<pid>`), bỏ sót file tạm từ `datamove.js` có 2 cụm số (`.tmp-<pid>-<time>`). | Sửa regex thành `/\.tmp-\d+(-\d+)?(-wal|-shm|-journal)?$/` để dọn sạch 100% file tạm mồ côi. |
| **BK-03** | `src/backup.js`, `src/khosaoluu.js` | File sao lưu JSON mang đầy đủ lịch sử đóng băng chốt lô (`goiLichSu`) ghi raw không nén, tốn nhiều dung lượng đĩa khi dữ liệu lớn. | Tích hợp module chuẩn `zlib` của Node.js để hỗ trợ tùy chọn nén `.json.gz` (tiết kiệm 75% - 85% dung lượng đĩa). |
| **BK-04** | `src/settings.js`, `ui/app/15-du-lieu-cai-dat-sao-luu-lo.js` | Kiểm tra dung lượng đĩa bị động khi chuẩn bị ghi file; người dùng không biết ổ đĩa sắp đầy trước khi bị lỗi. | Kiểm tra dung lượng đĩa khi mở app; hiển thị cảnh báo sớm màu vàng nếu ổ đĩa còn dưới 500MB trống. |

---

## Cách làm, theo từng chuyên đề (TDD)
1. **Phương pháp TDD (Test-Driven Development):**
   - Với các lỗi logic nghiệp vụ (`DATA-01` đến `DATA-06`, `FLT-05`, `BK-02`): Viết bài test đơn vị mới (đỏ trước), sau đó sửa mã nguồn để bài test chuyển sang xanh.
2. **Quy trình biên dịch bắt buộc (`build:html`):**
   - Bất kỳ khi nào sửa đổi `ui/app/*.js` hoặc `ui/app.src.html`, **BẮT BUỘC** phải chạy `node scripts/build-html.js` để cập nhật `renderer/index.html`.
3. **Kiểm tra chéo bản in sau mỗi lần sửa lõi:**
   - Khi chỉnh sửa `docphieucan.js`, `so.js`, `dinhmuc.js`, `noidunghopdong.js`, lập tức chạy công cụ so bản in để bảo đảm không làm đổi bất kỳ ký tự nào trong 206 tài liệu `.docx`.
4. **Môi trường chạy kiểm thử:**
   - Kiểm thử e2e chạy ở độ phân giải **1024×768** giống môi trường CI chuẩn: không chạy việc nặng song song để tránh timeout giả.

---

## Giới hạn cứng (Strict Invariants)
- **Không sửa kiểm thử để cho qua:** Không xóa, không vô hiệu hóa, không nới lỏng ngưỡng assertion để ép test xanh.
- **Không đổi lược đồ CSDL SQLite:** Giữ nguyên phiên bản cấu trúc hiện tại (không migration).
- **Bảo toàn 100% mã băm biểu mẫu in ấn:** `node scripts/so-ban-in.js --so a.json b.json` bắt buộc phải đạt `Tài liệu: 206 · giống từng byte: 206 · khác: 0`.
- **Tuyệt đối không commit/merge trực tiếp vào `main`:** Mọi thay đổi thực hiện trên nhánh riêng và gửi PR.
- Toàn bộ tài liệu, commit message và trao đổi phải viết bằng **tiếng Việt**, mốc thời gian ghi theo **giờ Việt Nam (UTC+7)**.

---

## Lệnh chạy kiểm định toàn diện

```powershell
# 1. Biên dịch lại giao diện HTML
node scripts/build-html.js

# 2. Chạy toàn bộ kiểm thử đơn vị (Node của Electron)
node scripts/test.js

# 3. Chạy kiểm tra so khớp bản in (206 tài liệu)
node scripts/so-ban-in.js --root . --out b.json
node scripts/so-ban-in.js --so a.json b.json

# 4. Chạy toàn bộ 132 bộ e2e kiểm thử tự động
node scripts/e2e-all.js --no-skip
```

---

## Tiêu chí đạt & Nghiệm thu bàn giao
- **Kiểm thử đơn vị:** 791+ tests PASS (0 fail, 2 skipped).
- **Kiểm thử e2e:** 132 / 132 test suites PASS (100% ở 1024×768).
- **Bản in:** 206 / 206 tài liệu giống từng byte so với bản gốc v3.3.0.
- **PR trên GitHub:**
  - Tiêu đề: `fix: hoàn thiện giao diện V10.4, tối ưu smart filter, xử lý dữ liệu và sao lưu an toàn (sau v3.3.0)`
  - Nội dung PR: Bảng phân loại chi tiết 21 hạng mục đã sửa, bằng chứng kiểm thử đơn vị, kết quả 132 bộ e2e và so bản in 206/206.
