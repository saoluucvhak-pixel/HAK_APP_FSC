# HỆ THỐNG QUẢN LÝ HỒ SƠ KHAI THÁC & VẬN CHUYỂN GỖ KEO (FSC_OFFLINE)
## PROMPT NHIỆM VỤ: CHUẨN HÓA TOÀN BỘ GIAO DIỆN SANG DẠNG "BẢNG DANH SÁCH SẠCH + MODAL DIALOG" (CLEAN LIST + MODAL)

---

### I. BỐI CẢNH VÀ MỤC TIÊU DỰ ÁN
Dự án là ứng dụng Desktop xây dựng trên **Electron + Vanilla JavaScript (ES6 Modules)**, cơ sở dữ liệu **SQLite**, đóng gói bằng **electron-builder**.
- Toàn bộ giao diện HTML được sinh tự động từ các file module trong thư mục `ui/app/` thông qua lệnh `node scripts/build-html.js` -> xuất ra `renderer/index.html`.
- **Mục tiêu**: Chuẩn hóa toàn bộ các màn hình còn mang phong cách cũ (bảng tràn lan ô `<input>` trực tiếp, ô gõ ở đáy bảng, dropdown chọn đối tượng thô sơ) sang chuẩn thiết kế hiện đại thống nhất:
  1. **Bảng danh sách sạch sẽ (Clean List):** Hàng hiển thị dữ liệu dạng text, badge pill (`<span class="pill">`), không có ô `<input>` trực tiếp trên từng cell.
  2. **Hộp thoại Modal (Modal Dialog):** Thêm mới và Sửa dữ liệu bằng popup modal chuyên dụng, có phím `Escape` đóng modal, nút `[Lưu]` và `[Hủy]`.
  3. **Màn hình chọn từ danh mục (Modal Picker):** Chọn đối tượng từ danh mục bằng Popup Modal chuyên nghiệp (có thanh tìm kiếm tức thì, bộ lọc dropdown loại đối tượng, danh sách chọn 1 chạm).

---

### II. CÁC TÀI LIỆU VÀ FILE NGUỒN LIÊN QUAN
1. **Kiến trúc và các màn hình liên quan:**
   - Định mức (BHLĐ, Gỗ keo, Định biên nhân công, Thời gian khai thác): `ui/app/10-d-dinh-muc-nhap-excel.js`
   - Danh mục Ngành nghề & Chức vụ, Vị trí công việc: `ui/app/30-cai-dat-danh-muc.js`
   - Hợp đồng nhân công & Bên nhận khoán: `ui/app/31-hop-dong.js`, `ui/app/11-d-luu-ban-nhap.js`
   - Màn hình mẫu Modal Picker đã chuẩn hóa (tham khảo để làm theo): `ui/app/12-g-chon-xe-nhanh.js`, `ui/app/12-f-them-nguoi-nhanh.js`
   - Bắt sự kiện bàn phím & nút bấm: `ui/app/18-su-kien.js`
   - Build HTML: `scripts/build-html.js`
   - Bộ kiểm thử tự động: `scripts/test.js`, `scripts/e2e-dinhmuc.js`, `scripts/e2e-keo.js`, `scripts/e2e-tgkhai.js`, `scripts/e2e-dinhbien.js`, `scripts/e2e-vi-tri-dinh-muc.js`.

2. **Commit mẫu tham khảo đã làm thành công:**
   - Commit `3338804`: Chuẩn hóa Định mức BHLĐ theo vị trí sang Clean List + Modal.
   - Commit `ca5321f`: Chuẩn hóa Danh mục Vị trí công việc sang Clean List + Modal.
   - Commit `f5c8cb2`: Modal Picker Chọn xe và Chọn nhân công có bộ lọc Dropdown.

---

### III. CHI TIẾT 3 NHIỆM VỤ CẦN THỰC HIỆN

#### NHIỆM VỤ 1: CHUẨN HÓA 3 TAB ĐỊNH MỨC CÒN LẠI SANG "BẢNG SẠCH + MODAL" (`ui/app/10-d-dinh-muc-nhap-excel.js`)
Hiện tại Tab 1 (BHLĐ) đã được chuẩn hóa. Bạn cần chuẩn hóa 3 tab còn lại:

1. **Tab 2: Định mức gỗ keo (`keoCard()`)**
   - **Hiện trạng cũ:** Bảng có ô `<input name="k_tu">` và `<input name="k_tan">` trên từng hàng, dòng cuối để gõ thêm.
   - **Nâng cấp:**
     - Bảng danh sách sạch: Cột "Hiệu lực từ ngày" (hiển thị ngày hoặc "Bản gốc / mặc định"), Cột "Định mức" (hiển thị pill `<span class="pill ok">80 tấn/ha</span>`), Cột thao tác gồm nút `[Sửa]` (`data-act="keoSua"`) và nút `[Xóa]` (nếu không phải bản mặc định).
     - Phía trên bảng có nút `+ Thêm định mức gỗ keo` (`data-act="keoThem"`).
     - Modal Dialog nhập/sửa: Gồm ô `Hiệu lực từ ngày` (`dd/mm/yyyy`) và `Định mức (tấn/ha)`. Nút `[💾 Lưu định mức]` và `[Hủy]`. Hỗ trợ phím Escape để đóng.

2. **Tab 3: Định mức nhân công - Định biên (`dbCard()`)**
   - **Hiện trạng cũ:** Bảng có ô `<input name="b_cd">`, `<input name="b_so">`, `<input name="b_km">`, `<textarea name="b_nv">` trực tiếp trên từng hàng.
   - **Nâng cấp:**
     - Bảng danh sách sạch: Cột "Vị trí" (in đậm, badge nếu là Tổ trưởng), Cột "Định biên" (pill `<span class="pill">N người</span>`), Cột "Kiêm nhiệm", Cột "Nhiệm vụ" (tóm tắt nội dung gọn gàng), Cột thao tác có nút `[Sửa]` (`data-act="dbSua"`), `[Xóa]`.
     - Phía trên bảng có nút `+ Thêm vị trí định biên` (`data-act="dbThem"`).
     - Modal Dialog nhập/sửa: Vị trí (chọn từ datalist hoặc gõ mới), Số người, Kiêm nhiệm, Nhiệm vụ (textarea).
     - **Quan trọng:** Phải bảo toàn chức năng tính tổng số người tự động của đội (`1 đội = N người`) trên thanh tiêu đề khi lưu hoặc sửa.

3. **Tab 4: Thời gian khai thác (`tgCard()`)**
   - **Hiện trạng cũ:** Bảng có ô `<input name="t_tu">` và `<input name="t_ngay">` trên từng hàng.
   - **Nâng cấp:**
     - Bảng danh sách sạch: Cột "Hiệu lực từ ngày", Cột "Thời gian" (pill `<span class="pill ok">5 ngày/ha</span>`), Cột "Năng suất suy ra" (`1 ngày ≈ ... tấn`), Cột thao tác có nút `[Sửa]` (`data-act="tgSua"`), `[Xóa]`.
     - Phía trên bảng có nút `+ Thêm định mức thời gian` (`data-act="tgThem"`).
     - Modal Dialog nhập/sửa: Hiệu lực từ ngày (`dd/mm/yyyy`) và Số ngày/ha.

---

#### NHIỆM VỤ 2: XÂY DỰNG MODAL POPUP "CHỌN BÊN NHẬN KHOÁN TỪ DANH MỤC ĐỐI TƯỢNG" (`ui/app/31-hop-dong.js` & `ui/app/11-d-luu-ban-nhap.js`)
- **Hiện trạng cũ:** Ô Bên nhận khoán trong Hợp đồng nhân công chỉ dùng `<select>` dropdown đơn giản.
- **Nâng cấp (Chuẩn hóa như màn Chọn xe từ danh mục):**
  - Cung cấp nút bấm nổi bật **`[📋 Chọn từ danh mục]`** (`data-act="openChonBenNKModal"`).
  - Modal Popup hiển thị chuyên nghiệp:
    1. **Thanh tìm kiếm tức thì:** Tìm theo Tên, CCCD, MST, Số điện thoại.
    2. **Bộ lọc Dropdown:** *Tất cả*, *Cá nhân (thể nhân)*, *Doanh nghiệp (pháp nhân)*.
    3. **Bảng danh sách đối tượng hợp lệ:** Hiển thị Tên đối tượng, Loại (Cá nhân/Doanh nghiệp), CCCD/MST, Số điện thoại, Địa chỉ, Quyền ký.
    4. **Thao tác 1 chạm:** Mỗi dòng có nút `[Chọn]` đưa ngay đối tượng vào hợp đồng của đội, tự động gọi `persistLo()` và `render()`.
    5. Vẫn giữ nút `+ Thêm bên nhận khoán mới` (Quick Modal) nếu danh mục chưa có.

---

#### NHIỆM VỤ 3: CHUẨN HÓA THÊM MỚI NGÀNH NGHỀ & CHỨC VỤ SANG MODAL (`ui/app/30-cai-dat-danh-muc.js`)
- **Hiện trạng cũ:** Bảng Ngành nghề và Bảng Chức vụ đã có nút `[Sửa]` mở modal, nhưng ở đáy bảng vẫn còn các ô input gõ thô rời rạc (`#nvMoiNg`, `#nvMoiCv`, `#nvMoiCvNg`).
- **Nâng cấp:**
  - Bỏ hoàn toàn các ô input ở đáy bảng.
  - Thay bằng nút `+ Thêm ngành nghề` và `+ Thêm chức vụ`.
  - Khi bấm, mở Modal nhập liệu sạch sẽ, bấm `[Lưu]` hoặc `[Hủy]`, hỗ trợ phím `Escape`.

---

### IV. NGUYÊN TẮC KỸ THUẬT VÀ QUY TRÌNH KIỂM THỬ BẮT BUỘC

1. **Nguyên tắc môi trường Windows:**
   - Khi chạy lệnh Git, Node test hoặc build trên Windows, nếu gặp sandbox block hoặc EPERM hãy chạy với `BypassSandbox: true`.
   - Với Playwright E2E tests: Luôn truyền `--user-data-dir` với thư mục tạm riêng biệt để tránh đụng độ Electron singleton lock.

2. **Quy trình build & verify:**
   - Bước 1: Sau khi chỉnh sửa code trong `ui/app/`, bắt buộc chạy:
     ```bash
     node scripts/build-html.js
     ```
     Đảm bảo file `renderer/index.html` được cập nhật thành công (khoảng 60 modules).
   - Bước 2: Chạy kiểm thử Unit test:
     ```bash
     node scripts/test.js
     ```
   - Bước 3: Chạy và cập nhật các kịch bản Playwright E2E:
     ```bash
     node scripts/e2e-dinhmuc.js
     node scripts/e2e-keo.js
     node scripts/e2e-tgkhai.js
     node scripts/e2e-dinhbien.js
     node scripts/e2e-vi-tri-dinh-muc.js
     ```
     *(Lưu ý: Nếu kịch bản E2E cũ tương tác vào ô input trực tiếp trên bảng, hãy cập nhật kịch bản E2E tương tác qua nút bấm `[Sửa]` / Modal tương ứng để 100% test pass ĐẠT).*

3. **Đóng gói phát hành:**
   - Commit Git với thông điệp rõ ràng tiếng Việt.
   - Build gói cài đặt Windows:
     ```bash
     npm run dist
     ```
   - Đảm bảo file `.exe` cài đặt được tạo trong thư mục `dist/` đầy đủ.

---
*Hãy hoàn thành toàn bộ 3 nhiệm vụ trên theo đúng phong cách thiết kế Clean List + Modal Dialog của dự án.*
