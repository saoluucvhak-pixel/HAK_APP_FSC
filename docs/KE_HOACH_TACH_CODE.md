# Kế hoạch tách code (đã thực hiện xong Bước 1–4)

Ngày lập: 17/11/2026, sau khi gộp PR #27 vào main (9667ec7). Cập nhật 18/11/2026 sau khi gộp PR #38.

**Tình trạng:** Bước 1 (PR #29, #30, #31), Bước 2 (PR #32, #33), Bước 3 (PR #34, #35, #36, #37) và Bước 4 (PR #38) đã gộp vào main. Các mục dưới đây giữ nguyên nội dung kế hoạch; tên file đã đổi được ghi theo tên hiện tại. Số liệu ở mục 2 là lúc lập kế hoạch (trước khi tách).

## 1. Kết luận ngắn

- **Không tách để chạy nhanh hơn.** Ứng dụng Electron đọc file từ máy; 2,3 MB nạp trong vài chục mili giây. Không đưa bundler hay lazy-load vào.
- **Tách để bảo trì và kiểm thử.** Mục tiêu: sửa một phần giao diện không làm hỏng hàng chục kịch bản e2e, và kiểm được logic bằng kiểm thử đơn vị thay vì chạy cả Electron.

## 2. Số liệu hiện tại (đo trên main)

| Hạng mục | Số liệu |
| --- | --- |
| Module giao diện `ui/app/*.js` | 31 file, 471 hàm cấp cao, 55 biến toàn cục (`let`/`var`) dùng chung một phạm vi |
| `renderer/index.html` (sinh ra) | 2,3 MB, một khối script, một hàm bao |
| Module lớn nhất | 06 nội dung hợp đồng 72 KB; 17 tra cứu Google Sheets 68 KB; 10 kiểm tra trước khi xuất 68 KB; 11 chấm công, bản nháp 60 KB |
| Dòng dài nhất | 1.385 ký tự (module 17); nhiều module có dòng 600–970 ký tự |
| Module lõi thuần `src/*.js` | 6.888 dòng, đã có kiểm thử đơn vị (60 file test) |
| Kiểm thử e2e | 114 bộ, chạy khoảng 26 phút trên Linux, khoảng 33 phút trên CI Windows |

Phát hiện quan trọng: các module `03-doc-excel-phieu-can`, `04-kiem-tra-du-lieu-nhieu-doi`, `06-noi-dung-hop-dong` **không chạm DOM** (0 lần dùng `document.`, `$(`, `innerHTML`). Đây là logic thuần đang nằm lẫn trong phần giao diện, nên chuyển ra `src/` được với rủi ro thấp.

## 3. Vì sao đáng làm (bằng chứng từ đợt vừa rồi)

- PR #25 tách màn nhập thành mục. Một lượt đó làm hỏng khoảng 50 bộ e2e vì kịch bản bám vào cấu trúc màn hình; sửa mất cả ngày.
- Để kiểm thử một phần, phải thêm móc `window.__mucLo`, `window.__hdMo`, `__stSaveCurrent`… vào mã ứng dụng.
- Biến toàn cục dùng chung (`ftab`, `curHd`, `mucLoDaMo`, `pcTatCa`…) khiến một thay đổi ở màn này ảnh hưởng màn khác mà không có chỗ nào khai báo phụ thuộc.

## 4. Nguyên tắc

1. **Không đổi hành vi.** Mỗi bước chỉ di chuyển mã; bản in BM-xx phải giống từng byte (đã có `scripts/so-ban-in.js`).
2. **Mỗi bước một PR nhỏ**, CI xanh mới sang bước sau.
3. **Giữ nguyên cách build** (`scripts/build-html.js`, ghép module theo tên file). Không thêm bundler.
4. **Không gộp với việc thêm tính năng.**

## 5. Các bước

### Bước 0 — Chuẩn bị (nửa ngày)
- Chụp "đường cơ sở": bản in của bộ mẫu (`so-ban-in.js`), kết quả `npm test`, kết quả 114 bộ e2e.
- Thêm vào CI một bước kiểm cỡ file và độ dài dòng ở mức cảnh báo (không chặn), để theo dõi tiến độ.

### Bước 1 — Chuyển logic thuần ra `src/` (rủi ro thấp, giá trị cao)
Ứng viên theo thứ tự:
1. `ui/app/04-kiem-tra-du-lieu-nhieu-doi.js` → `src/kiemtranhieudoi.js` (37 KB, không chạm DOM); kiểm thử `tests/kiemtranhieudoi.test.js`.
2. `ui/app/06-noi-dung-hop-dong.js` → `src/noidunghopdong.js` (72 KB, không chạm DOM; kiểm bằng so bản in); kiểm thử `tests/noidunghopdong.test.js`.
3. `ui/app/03-doc-excel-phieu-can.js` → `src/docphieucan.js` (đọc Excel, không chạm DOM); kiểm thử `tests/docphieucan.test.js`.
- Cách làm: mỗi module `src/` xuất `create(ctx)` nhận dữ liệu và hàm qua tham số thay vì đọc biến toàn cục; file `ui/app/NN-*.js` còn lại là phần nối (adaptor) dựng `ctx` rồi lấy các tên cần dùng; nhúng bằng cơ chế `/*@@SRC:ten@@*/` đang có. Mỗi bài kiểm thử kiểm danh sách `TEN_NGOAI` khớp với tên dùng trong `ctx` và trong adaptor.
- Kết quả: kiểm thử đơn vị được từng phần, giảm dần phụ thuộc vào e2e.

### Bước 2 — Giảm biến toàn cục
- Đã gom biến điều hướng thành đối tượng `NAV` (`ui/app/02-luu-tru-trang-thai.js`: `cur`, `curF`, `tab`, `xtab`, `ftab`, `view`, `curDoi`, `curHd`, `ncTatCa`) — PR #32. Bản đề xuất ban đầu là `dieuHuong`, `banNhap`, `chonLoc`; thực tế chỉ gom nhóm điều hướng.
- Đổi từng nhóm một, mỗi nhóm một PR. Đã thay các móc `window.__*` ở mã ứng dụng bằng một cổng kiểm thử duy nhất `window.__hak` (sổ đăng ký `CONG_KT` ở module 02, mở ở `ui/app/35-cong-kiem-thu.js`; chỉ có khi chạy không đóng gói với cờ `--hakqn-test-hooks`) — PR #33. Giữ các cầu `window.__stDirty`, `__stSaveCurrent`, `__nhapTamXoa` vì `src/main.js` dùng ở bản thật.

### Bước 3 — Chia 4 module giao diện lớn nhất
- `10-kiem-tra-truoc-khi-xuat` → `10-a-kiem-tra-xuat`, `10-b-khung-man-lo`, `10-c-o-thong-tin-rung`, `10-d-dinh-muc-nhap-excel` (PR #34).
- `11-cham-cong-ban-nhap` → `11-a-cham-cong`, `11-b-ban-nhap`, `11-c-hop-thoai-dong`, `11-d-luu-ban-nhap` (PR #35).
- `17-tra-cuu-google-sheets` → `17-a-tra-cuu`, `17-b-bo-loc-thong-minh`, `17-c-chon-ket-qua`, `17-d-xem-truoc`, `17-e-ghi-vao-ho-so` (PR #36).
- `12-cong-ty-mua-hang` → `12-a-cong-ty`, `12-b-dia-chi-giao`, `12-c-hop-dong-vc`, `12-d-trang-van-chuyen`, `12-e-loi-so-dot-2` (PR #37).
- Quy ước tên: `NN-<chữ cái>-ten.js` trong `ui/app/` (thứ tự chữ cái chính là thứ tự ghép). Chỉ chia theo ranh giới dòng, không đổi nội dung: `renderer/index.html` giống hệt từng byte. Các bài kiểm thử đọc mã module nay dùng `tests/_ui.js` (`tepUi`, `docUi`) để đọc mọi phần của một module.

### Bước 4 — Định dạng và kiểm soát
- Đã ngắt dòng dài trong `ui/app` bằng công cụ phân tích cú pháp (PR #38): số dòng trên 300 ký tự giảm từ 451 xuống 327; phần còn lại chủ yếu là chuỗi/mẫu HTML dán sẵn không ngắt an toàn được. Kiểm bằng so bản in (206/206 tài liệu giống từng byte) và e2e đầy đủ trên CI Windows.
- Đã đặt cảnh báo trong CI (`scripts/kiem-kich-thuoc.js`, job `quality`): file trên 40 KB hoặc dòng trên 300 ký tự trong `src` và `ui/app`; chỉ cảnh báo, không chặn.

## 6. Kiểm chứng sau mỗi bước

1. `NODE_OPTIONS= npm test` đạt hết.
2. `node scripts/so-ban-in.js`: bản in giống từng byte so với đường cơ sở.
3. Toàn bộ 114 bộ e2e đạt trên Linux, rồi CI Windows xanh mới gộp.
4. `renderer/index.html` được dựng lại và nằm trong commit (bài kiểm tra build-html đã bảo đảm).

## 7. Rủi ro và cách giảm

| Rủi ro | Cách giảm |
| --- | --- |
| Thứ tự ghép module làm hàm chưa được định nghĩa khi dùng | Giữ tiền tố `NN-`; thêm kiểm thử đọc nguồn xác nhận thứ tự phụ thuộc |
| Đổi biến toàn cục làm hỏng e2e hàng loạt | Đổi từng nhóm, mỗi nhóm một PR; có cổng `window.__hak` cố định cho kiểm thử |
| CSP theo mã băm script | Không đổi; `build-html.js` đã dựng lại mã băm mỗi lần build |
| Xung đột với việc đang làm (R4, R5) | Làm R4, R5 trước hoặc làm sau Bước 1; không làm Bước 3 song song |

## 8. Ước lượng

| Bước | Công sức | Rủi ro |
| --- | --- | --- |
| 0 | 0,5 ngày | Thấp |
| 1 | 2–3 ngày | Thấp |
| 2 | 3–4 ngày | Trung bình |
| 3 | 3–4 ngày | Trung bình |
| 4 | 1 ngày | Thấp |

Khuyến nghị: làm Bước 0 và Bước 1 trước, rồi đánh giá lại có cần Bước 2–4 không.

## 9. Quyết định cần chốt

1. Có làm R4 (một luồng nhập danh mục) và R5 (cài đè v2.3.0, nghiệm thu) trước khi tách code không?
2. Có chấp nhận cổng kiểm thử duy nhất `window.__hak` trong mã ứng dụng không?
