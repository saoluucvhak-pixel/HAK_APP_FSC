# HAKQN – Hồ sơ khai thác và vận chuyển gỗ keo (bản desktop)

Electron + SQLite. Giao diện và nghiệp vụ lấy từ bản HTML (`ui/app.src.html` – cùng nguồn với bản HTML, chạy được ở cả hai chế độ). Dữ liệu lưu trong SQLite ở thư mục dữ liệu người dùng Windows (`%APPDATA%\hakqn-ho-so-khai-thac\hakqn.sqlite`).

- Hướng dẫn: [docs/HUONG_DAN.md](docs/HUONG_DAN.md)
- Đăng nhập Google (bảng tính giới hạn quyền): [docs/GOOGLE_OAUTH.md](docs/GOOGLE_OAUTH.md)
- Bảng ánh xạ cột: [docs/BANG_ANH_XA.md](docs/BANG_ANH_XA.md)
- Kết quả kiểm thử, mục chờ xác nhận: [docs/KET_QUA_KIEM_THU.md](docs/KET_QUA_KIEM_THU.md)

## Chức năng
- Hồ sơ theo chủ rừng → rừng (nhân công, xe, phiếu cân, hợp đồng, đơn giá, giấy tờ), checklist FSC, xuất BM-01…BM-20 và ZIP (BM-20 Giấy ủy quyền cho hình thức giao khoán) — giữ nghiệp vụ bản HTML, cập nhật quy tắc hợp đồng và đơn giá theo từng hình thức.
- Lưu SQLite theo từng rừng, mỗi lần lưu là một giao dịch; quản lý phiên bản cấu trúc (`PRAGMA user_version`), tự sao lưu trước khi nâng cấp/khôi phục.
- Khôi phục toàn bộ dữ liệu (.json) (cũng nhận bản sao lưu từ bản HTML cũ) có xem trước số liệu và bản trùng; sao lưu ra thư mục tự chọn (.json + .sqlite).
- Nạp Excel nhân công/xe/phiếu cân: báo dòng hợp lệ/lỗi và thêm/cập nhật/giữ nguyên/bỏ trước khi ghi. **File Excel mẫu** có 3 trang (HUONG_DAN giải thích từng cột, trang dữ liệu có định dạng/danh sách chọn/gợi ý, VI_DU) do `src/xlsxmau.js` tạo.
- **Mã lô duy nhất**, khôi phục toàn bộ chỉ thay đúng lô trùng (`src/lorung.js`), “Giữ cả hai” có mã mới xác nhận; **sao lưu / khôi phục một lô rừng** (gói JSON có mã kiểm tra, dùng được khi mất mạng); tab **Kiểm tra trước khi xuất**; hồ sơ **Công ty mua hàng** và địa chỉ giao theo lô.
- Menu **Tra cứu Google Sheets**: ba tab chuẩn **HoSoKeo, HoSoRung, ToaDoRung** (tên cũ `_QC` vẫn dùng được; tab tên khác được đề xuất để xác nhận hoặc chọn, ghi nhớ theo ID bảng tính; có file mẫu 3 tab). Đồng bộ chỉ đọc hoặc nhập bản Excel, lưu bản tra cứu trên máy, tìm có dấu/không dấu, xem trước và ghi vào rừng đang mở hoặc rừng mới, dấu vết nguồn, chống trùng.

- Bộ lọc tra cứu thông minh: cú pháp `trường:giá trị`, loại trừ, xếp theo độ khớp, lọc ngày/khối lượng/tình trạng, cờ cần kiểm tra, gợi ý nới lỏng.
- Menu **Báo cáo**: 4 mẫu (điều hành, sản lượng theo rừng, sổ phiếu cân, tiến độ FSC) xuất Word và Excel.

- Tra cứu dạng **cha–con** (master–detail: hợp đồng → rừng → phiếu cân), chip điều kiện và bộ lọc đã lưu (HAK Smart Filter); giao diện theo HAK Enterprise Design System với 4 bảng màu (luxe navy, classic xanh ngọc, neutral, champagne) × sáng/tối; báo cáo cha–con và định dạng theo HAK Accounting & Reporting Standard.
- CI: kiểm thử, đóng gói, cài thử bộ `.exe` và quét chất lượng mã bằng `hak_code_quality_test` (cấu hình `.hakquality.json`).

## Mã nguồn
| Đường dẫn | Nội dung |
| --- | --- |
| `src/main.js` | Tiến trình chính Electron: cửa sổ, menu, IPC, đồng bộ Google Sheets, tải file |
| `src/preload.js` | Cầu nối an toàn `window.hak` cho giao diện |
| `src/lorung.js` | Nhận diện trùng khi khôi phục, mã lô duy nhất, gói sao lưu một lô |
| `src/muahang.js`, `src/dates.js` | Công ty mua hàng và địa chỉ giao; quy tắc ngày lịch dùng chung |
| `src/xlsxmau.js` | File Excel mẫu nhập liệu có hướng dẫn từng cột |
| `src/store.js` | Lớp SQLite hồ sơ: lưu/đọc, nâng cấp cấu trúc, nhập/khôi phục, sao lưu |
| `src/bannhap.js` | Điều kiện bản chính thức riêng từng biểu mẫu; nhãn BẢN NHÁP cho xuất lẻ và theo gói |
| `src/lookup.js` | Bản tra cứu: đọc/kiểm tra 3 tab, tìm kiếm, ghép CCCD + hợp đồng, tọa độ, biển số |
| `ui/app.src.html` | Giao diện + nghiệp vụ (từ bản HTML) |
| `src/google-auth.js` | Đăng nhập Google OAuth (PKCE, chỉ đọc), tải .xlsx qua Drive API |
| `ui/vendor/` | Bản sao nguyên văn các thư viện HAK dùng chung (design system, smart filter, chuẩn báo cáo), ghi nguồn và commit trong `ui/vendor/README.md` |
| `ui/skins.css` | Hai bảng màu bổ sung (neutral, champagne) dùng cùng token với luxe; classic = token gốc của design system |
| `ui/reports.js` | Mô hình dữ liệu các mẫu báo cáo (dùng chung Word, Excel, kiểm thử) |
| `tests/` | Kiểm thử đơn vị, dữ liệu giả lập (`fixtures/make-lookup.js`) |
| `scripts/` | Ghép HTML, chạy kiểm thử, kiểm thử Electron đầu-cuối |

## Lệnh
```
npm ci              # cài thư viện (better-sqlite3 13 có sẵn bản build N-API cho Windows/Linux/macOS, không cần biên dịch lại)
npm run build:html  # ghép ui/app.src.html + thư viện thành renderer/index.html
npm test            # kiểm thử đơn vị (Node của Electron)
npm run test:e2e    # kiểm thử Electron thật (Linux: xvfb-run npm run test:e2e)
npm start           # chạy thử
npm run dist        # tạo bộ cài .exe (chạy trên Windows hoặc GitHub Actions)
```

## Bộ cài .exe
GitHub → Actions → **Build Windows installer** → Run workflow → tải `HAKQN-HoSoKhaiThac-Setup-1.0.0.exe` trong Artifacts. Bộ cài cho chọn thư mục, tạo lối mở Start Menu + Desktop, không xóa dữ liệu khi gỡ.

## Thêm phiên bản cấu trúc dữ liệu
Thêm một hàm vào cuối `MIGRATIONS` trong `src/store.js` (không sửa hàm đã phát hành). Khi mở cơ sở dữ liệu cũ, phần mềm sao lưu file vào `backups/` rồi chạy nâng cấp trong một giao dịch.
