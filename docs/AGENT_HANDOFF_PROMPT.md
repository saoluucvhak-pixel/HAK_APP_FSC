# PROMPT BÀN GIAO TOÀN DIỆN CHO AGENT / MULTI-AGENT SWARM
> **Dự án**: HAK_APP_FSC (Phiên bản mục tiêu: **v3.5.1** trên nhánh `main` mới nhất GitHub)  
> **Cơ sở mã nguồn**: Nhánh `main` (`origin/main`, commit `d6dbd8f` trở lên) tại `saoluucvhak-pixel/HAK_APP_FSC`  
> **Thời điểm cập nhật**: 25/11/2026 (Đã tích hợp rà soát Control Center về **Smart Filter**, **Theme / Skins**, **Quick Modal Người ký**, và **Form Thêm xe 3 khối**)  
> **Mục tiêu**: Hướng dẫn chi tiết, chuẩn hóa nghiệp vụ và phân chia nhiệm vụ cho Agent (hoặc nhóm Agent chuyên biệt) triển khai hoàn chỉnh phiên bản **v3.5.1** trên nhánh `main`.

---

## 1. BỐI CẢNH DỰ ÁN & CÁC REPOSITORIES LIÊN QUAN

* **Repo làm việc chính (Codebase)**:
  * Thư mục: `D:\PROJECT_IT\FSC_OFFLINE` (Repo: `saoluucvhak-pixel/HAK_APP_FSC`, branch: `main`).
  * Công nghệ: Electron (desktop), Node.js, SQLite / in-memory reactive store, kiến trúc Vanilla JS modular (`ui/app/01-*.js` đến `35-*.js`), đóng gói qua `scripts/build-html.js` $\rightarrow$ `renderer/index.html`.
* **Repo kỹ năng chuẩn HAK (HAK AI Skills)**:
  * Thư mục: `D:\PROJECT_IT\LUONG_OFFLINE\HAK_LUONG_OFFLINE\HAK_AI_SKILLS`
  * Các Skill áp dụng:
    1. `master-detail-design/SKILL.md`: Chuẩn thiết kế Bảng Cha - Con, Tra cứu 1 chạm & Auto-fill.
    2. `crud-directory-standard/SKILL.md`: Chuẩn thiết kế màn hình Danh mục (Clean List vs. Modal Dialog), Segmented Controls, kèm file mẫu chạy thực tế `examples/danh_muc_chuan_hoa_reference.html`.
    3. `smart-filter/SKILL.md`: Chuẩn tích hợp Bộ lọc thông minh (`ui/vendor/hak-smart-filter/`), typeahead search và đồng bộ Export scope.
    4. `hak-design-system/`: Chuẩn biến màu CSS (`luxe.css`, `skins.css`), WCAG AA contrast $\ge 4.5:1$, Dark Mode & 1-Click theme toggle.
* **Repo giám sát chất lượng (Control Center)**:
  * Thư mục: `D:\PROJECT_IT\HAK_AI_AGENT_CONTROL_CENTER`
  * Work Order: `WO-FSC-V340-AUDIT`

---

## 2. NHỮNG NỘI DUNG ĐÃ HOÀN THÀNH (DONE)

1. **Kiểm tra chất lượng & An toàn toàn diện**:
   * Chạy Quality Gate (5/5 checks passed).
   * Quét bảo mật Security Audit (0 lỗi HIGH trong source code nghiệp vụ).
   * Phân tích kiến trúc Architecture Audit (377 modules, 0 dependency cycle).
   * Ghi nhận tiến độ vào `reports/hak-project-memory.jsonl` và `reports/hak-skill-proposals.json`.
2. **Sửa lỗi lệch chữ canh lề trái menu dọc sub-tabs (`.mucNav button`)**:
   * Đã sửa tại `ui/app/10-b-khung-man-lo.js` và `ui/app.src.html`:
     - Bỏ `justify-content: space-between` (nguyên nhân đẩy icon sang trái, hất chữ sang mép phải).
     - Đổi sang `display: flex; justify-content: flex-start; gap: 8px; text-align: left`.
     - Cố định ô icon trạng thái 16px để tất cả dòng chữ luôn thẳng hàng dọc 100%. Số đếm badge dùng `margin-left: auto`.
   * Đã build lại HTML và xác minh hiển thị chuẩn.
3. **Chuẩn hóa tiêu đề Hợp đồng nhân công**:
   * Đã sửa tại `ui/app/31-hop-dong.js`:
     - Đổi tiêu đề card `Đội / Hợp đồng (N)` $\rightarrow$ `Hợp đồng nhân công (N)`.
     - Đổi tiêu đề cột `Đội · Hợp đồng` $\rightarrow$ `Hợp đồng nhân công`.
     - Đồng bộ chuẩn ngữ nghĩa với Bước 3 `Hợp đồng vận chuyển`.
4. **Xây dựng bản mô phỏng & Đóng gói 2 HAK Skills**:
   * Đã tạo 2 file mô phỏng tương tác thực tế:
     - `tra_cuu_chu_rung_cha_con_simulation.html` (Tra cứu Chủ rừng Cha - Con & Auto-fill).
     - `danh_muc_chuan_hoa_simulation.html` (Danh mục chuẩn hóa Clean List + Modal + Segmented Controls).
   * Đã đóng gói thành 2 Skill chính thức vào `D:\PROJECT_IT\LUONG_OFFLINE\HAK_LUONG_OFFLINE\HAK_AI_SKILLS\`:
     - `master-detail-design/SKILL.md`
     - `crud-directory-standard/SKILL.md` (kèm file chạy mẫu `examples/danh_muc_chuan_hoa_reference.html`).

---

## 3. NHỮNG NỘI DUNG CẦN THỰC HIỆN TIẾP (BACKLOG / TO DO)

---

### 📌 Nhiệm vụ 1: Màn hình Thông tin Chủ rừng (Tra cứu 1-Chạm Google Sheets & Tối ưu Quy trình Sâu)
* **Files liên quan**: `ui/app/10-d-dinh-muc-nhap-excel.js`, `ui/app/14-b-doi-so-doi-chieu.js`, `ui/app/17-a-tra-cuu.js`, `ui/app/17-f-hop-dong-bang.js`.
* **Kỹ năng áp dụng**: `master-detail-design/SKILL.md`.
* **File mô phỏng tham chiếu**: `thong_tin_chu_rung_chuan_hoa_simulation.html`.
* **Yêu cầu chi tiết**:
  1. **Tích hợp Cụm Tra cứu 1-Chạm từ 4 Trường Định danh**:
     - Bổ sung Cụm Tra cứu trên đầu form cho phép nhập 1 trong 4 trường: **[Số hợp đồng mua bán gỗ]** | **[Số CCCD]** | **[Họ và tên chủ rừng]** | **[Mã chủ rừng]**.
     - Bấm nút nổi bật **`[ 🔍 Tra cứu Sheets ]`** hoặc nhấn phím **`Enter`** trong bất kỳ ô nào:
       * Hệ thống kích hoạt `lkOpen()` và gán giá trị vừa nhập vào `lk.q`.
       * Mở trực tiếp Modal Dữ liệu Google Sheets (`#lkBox` / `#hdBox`) và tự động lọc đúng hợp đồng tương ứng.
  2. **Quy trình Auto-fill 100% dữ liệu vào Hồ sơ Lô**:
     - Khi chọn một dòng hợp đồng từ Google Sheets (bấm `[ 📥 Chọn hợp đồng này ]` hoặc click đúp):
       * Tự động điền 100% dữ liệu pháp lý Bên A: Mã chủ rừng, Họ và tên, Số CCCD, Ngày cấp, Nơi cấp, SĐT, Địa chỉ thường trú.
       * Tự động điền Số hợp đồng mua bán gỗ và Ngày ký hợp đồng.
       * Tự động nhận diện Danh xưng (Ông/Bà): Nếu tên có chữ "Thị" hoặc phụ nữ → Chọn `Bà`; nam giới → Chọn `Ông`.
       * Tự động tạo/liên kết luôn Lô rừng tương ứng (ví dụ: `Rừng 1 · 049171014379-R1`), không bắt người dùng phải tạo lô rừng thủ công lần 2.
  3. **Khử trùng lặp & Rối rắm trên Form nhập liệu**:
     - **Mã chủ rừng vs. CCCD**: Bổ sung checkbox `[✓] Dùng số CCCD làm Mã chủ rừng` (mặc định bật). Khi nhập CCCD, tự động đồng bộ vào Mã chủ rừng, không bắt người dùng gõ lại 2 lần cùng một dãy số 12 chữ số.
     - **Danh xưng (Ông/Bà)**: Thay thế thẻ dropdown bằng **Segmented Control [ Ông ] [ Bà ]** trực quan, thao tác 1-click.
  4. **Dọn dẹp rác trên Sidebar Chủ rừng (Sidebar Cleanup)**:
     - Khắc phục lỗi khi bấm `+ Chủ rừng mới` tự động tạo dòng rỗng `(chưa đặt tên) Mã · 0 rừng`.
     - Chỉ tạo bản ghi vào SQLite khi người dùng bấm `Lưu thông tin` hoặc chọn hợp đồng từ Google Sheets.
     - Gỡ bỏ card Google Sheets bị khóa (disabled) ở cuối form để tránh thừa thãi.

---

### 📌 Nhiệm vụ 2: Màn hình Danh mục Đối tượng & Chức vụ/Ngành nghề
* **Files liên quan**: `ui/app/30-cai-dat-danh-muc.js`.
* **Kỹ năng áp dụng**: `crud-directory-standard/SKILL.md`.
* **Yêu cầu chi tiết**:
  1. **Tách biệt Bảng danh sách và Modal Thêm/Sửa**:
     - Màn hình chính chỉ hiển thị Bảng danh sách sạch sẽ + thanh tìm kiếm + nút `[+ Thêm đối tượng mới]`.
     - **Tuyệt đối không chèn form đè lên giữa trang**. Khi bấm `+ Thêm` hoặc `[Sửa]`, mở **Modal Dialog riêng biệt** có đầy đủ 2 nút: `[💾 Lưu thông tin]` và `[Hủy bỏ]`.
  2. **Gộp Chức vụ & Ngành nghề bằng Segmented Controls**:
     - Loại bỏ việc chọn dropdown rời rạc. Sử dụng các nút bấm chọn trạng thái trực quan (**Segmented Buttons**):
       - Chức vụ: `[Nhân công]` `[Tổ trưởng]` `[Tài xế]` `[Chủ xe]`
       - Ngành nghề: `[Khai thác gỗ keo]` `[Vận chuyển]`
       - Quyền ký hợp đồng: `[Không]` `[Nhân công]` `[Vận chuyển]`
  3. **Bảng Ngành nghề & Chức vụ (`panelSetNv`)**:
     - Xóa bỏ việc gắn trực tiếp ô `<input>` vào từng dòng bảng (inline editing). Chuyển sang bảng danh sách chuẩn với các nút `[Sửa]` và `[Ngừng/Xóa]`.

---

### 📌 Nhiệm vụ 3: Luồng Đội xe & Chuẩn hóa Form Thêm xe (Xử lý dứt điểm 2 hình ảnh thực tế)
* **Files liên quan**: `ui/app/11-b-ban-nhap.js`, `ui/app/11-c-hop-thoai-dong.js`, `ui/app/12-c-hop-dong-vc.js`.
* **Yêu cầu chi tiết**:

#### A. Tại Tab "Hợp đồng & cước" của Đội xe (Hình 1):
  1. **Xóa dòng text gây gián đoạn**:
     - Xóa bỏ dòng: *"Chưa có người ký? Mở Danh mục đối tượng (khai quyền ký Vận chuyển; bản đang nhập được giữ để quay lại)"*. Việc bắt người dùng chuyển sang màn hình khác làm đứt gãy hoàn toàn luồng nhập liệu lô.
  2. **Thêm tính năng Quick Modal `[+ Thêm người ký]` ngay tại chỗ**:
     - Cạnh dropdown Người ký, thêm nút `+ Thêm người ký`.
     - Bấm nút $\rightarrow$ Mở Popup nhỏ tại chỗ (nhập: Họ tên, CCCD, SĐT, Địa chỉ). Bấm Lưu $\rightarrow$ Hệ thống tự động ghi vào Danh mục Đối tượng (kèm quyền ký Vận chuyển) và **tự động chọn ngay vào ô Người ký của Đội xe** mà không rời khỏi màn hình.
  3. **Tích hợp Typeahead / Smart Dropdown**:
     - Cho phép gõ tìm kiếm nhanh đối tượng có quyền ký hoặc pháp nhân, không để dropdown bị rỗng khi đội xe mới chưa có xe.

#### B. Tại Modal "Thêm xe vào lô / đội" (Hình 2):
  1. **Xóa bỏ hoàn toàn Form phẳng 22 ô nhồi nhét**:
     - Hiện tại form `ST_FIELDS.dx` đang trộn lẫn cả Chủ xe + Tài xế + CCCD Tài xế + Giấy tờ xe vào một mớ hỗn độn 22 ô.
  2. **Cấu trúc lại Form Thêm xe thành 3 khối mạch lạc (Chuẩn phân định Phương tiện vs Con người)**:
     - **Khối 1: Thông tin Phương tiện (Xe)**:
       - Dropdown chọn từ Danh mục Xe (có Typeahead gõ biển số hoặc tên chủ xe để tự động điền: *Loại xe, Biển số, Chủ xe, Cà vẹt, Hạn đăng kiểm, Hạn BH*).
       - Nút `[+ Thêm xe mới vào danh mục]`: Nếu xe chưa có trong danh mục, mở form nhỏ chỉ nhập đúng thông tin xe chuẩn.
     - **Khối 2: Thông tin Tài xế điều khiển (Con người)**:
       - Dropdown chọn Tài xế từ Danh mục Đối tượng (chỉ lọc những người có vai trò Tài xế).
       - Khi chọn tài xế: Tự động kéo và hiển thị thẻ tóm tắt (*Họ tên, CCCD, Ngày cấp, Nơi cấp, SĐT, Số GPLX, Hạn GPLX*), không bắt người dùng gõ tay lại 10 trường của tài xế.
       - Nút `[+ Thêm tài xế mới]`: Nếu tài xế chưa có, mở form nhỏ tạo đối tượng chuẩn.
     - **Khối 3: Người đại diện ký Hợp đồng vận chuyển**:
       - Segmented Control 1-click: `(o) Chủ xe` | `( ) Tài xế` | `( ) Chỉ định người khác...`
  3. **Gỡ bỏ các nút điều hướng thừa gây văng màn hình**:
     - Xóa nút `Mở Danh mục đối tượng (Excel)` ở thanh công cụ bảng thành viên (`ui/app/11-b-ban-nhap.js` dòng 57).

---

### 📌 Nhiệm vụ 4: Nâng cấp Bộ lọc thông minh (Smart Filter) theo rà soát Control Center
* **Files liên quan**: `ui/app/35-bo-loc-thong-minh.js`, `ui/app/10-a-man-hinh-chinh.js`, `ui/app/17-f-hop-dong-bang.js`, `ui/app/16-bao-cao.js`, `ui/app/25-tong-hop.js`.
* **Kỹ năng áp dụng**: `smart-filter/SKILL.md`.
* **Yêu cầu chi tiết**:
  1. **Tích hợp Smart Filter cho Sidebar Danh sách Chủ rừng (Cột trái)**:
     - Thay thế ô tìm kiếm thô `String.includes` bằng instance `screenId: 'sidebar_chu_rung'`.
     - Cho phép lọc đa tiêu chí:
       - Tình trạng hồ sơ: *Đủ điều kiện / Cần đối chiếu / Bị chặn xuất (Gate block)*.
       - Tình trạng hợp đồng: *Đã ký HĐ / Chưa ký HĐ*.
       - Số lượng rừng: *Nhiều rừng ($\ge 2$) / Lô đơn (1 rừng)*.
  2. **Smart Typeahead trong các Bộ chọn (Xe, Tài xế, Người ký)**:
     - Tích hợp bộ lọc gõ tìm kiếm tức thì theo Biển số, CCCD, Tên tài xế, Đội xe thay cho thẻ `<select>` mặc định của HTML.
  3. **Chuẩn hóa Smart Filter cho Bảng Google Sheets (`17-f-hop-dong-bang.js`)**:
     - Đưa vào `screenId: 'gs_hop_dong'` với các chip lọc nhanh: Trạng thái (Hợp lệ / Lỗi / Cần cập nhật), Lọc theo khoảng khối lượng (tổng tấn min - max), Lọc theo ngày ký.
  4. **Báo cáo & Tổng hợp (BM-01 đến BM-20) & Đồng bộ Export Scope**:
     - Bổ sung bộ lọc linh hoạt theo: Khoảng ngày cân, theo Đội xe, theo Nhà máy tiếp nhận gỗ, theo Chủ rừng.
     - **Đồng bộ Export Scope**: Khi bấm In ấn hoặc Xuất Excel, hệ thống áp dụng đúng snapshot kết quả đang lọc, không xuất tràn lan toàn bộ dữ liệu.

---

### 📌 Nhiệm vụ 5: Nâng cấp Theme & Giao diện (Theme & Skins) theo rà soát Control Center
* **Files liên quan**: `ui/app.src.html`, `ui/skins.css`, `ui/vendor/hak-design-system/luxe.css`.
* **Kỹ năng áp dụng**: HAK Design System, WCAG AA contrast.
* **Yêu cầu chi tiết**:
  1. **Chuẩn hóa triệt để biến màu Dark Mode trong tất cả Modal mới**:
     - Toàn bộ Modal mới (*Tra cứu Chủ rừng Cha - Con, Modal Thêm/Sửa Đối tượng, Modal Thêm Xe 3 khối, Quick Modal Người ký*) phải dùng 100% biến CSS Variables:
       - Nền hộp thoại / thẻ: `var(--card, #fff)`
       - Màu chữ chính: `var(--ink, #1f2937)`
       - Màu chữ phụ: `var(--mut, #6b7280)`
       - Ô nhập liệu: `background: var(--field, #f9fafb); border: 1px solid var(--line, #e5e7eb)`
     - Xóa bỏ hoàn toàn các mã màu cứng (`#fff`, viền vàng nhạt `#faedd0`, bóng đổ cứng) để khi chuyển sang Dark mode giao diện dịu mắt, hòa nhập tự nhiên.
  2. **Nút chuyển nhanh Sáng / Tối (1-Click Theme Toggle) trên Header**:
     - Bổ sung nút chuyển đổi chế độ **Sáng (Light) / Tối (Dark)** và menu chọn nhanh **Skin** (`Luxe`, `Classic`, `Champagne`) ngay trên thanh tiêu đề trên cùng (`header.top`).
     - Người dùng văn phòng / kế toán có thể đổi giao diện ngay trong 1 click mà không phải mở menu Cài đặt.
  3. **Đồng bộ Segmented Controls theo Skin đang chọn**:
     - Các nút bấm trạng thái nhanh (*Chủ xe / Tài xế, Ngành nghề, Chức vụ, Quyền ký*) sử dụng biến `--brand`, `--brandSoft`, `--onBrand` của Skin hiện tại, đảm bảo tính thẩm mỹ đồng bộ cao cấp.

---

### 📌 Nhiệm vụ 6: Tái cấu trúc Màn hình Tổng quan Chuyên nghiệp & Phân hệ "Bàn làm việc" (Executive Dashboard & Operations Hub)
* **Files liên quan**: `ui/app.src.html`, `ui/app/09-tong-quan-giao-dien.js`, `ui/app/10-a-man-hinh-chinh.js`, tạo mới module `ui/app/10-e-ban-lam-viec.js`.
* **Files mô phỏng tham chiếu**: `man_tong_quan_chuyen_nghiep_simulation.html` và `ban_lam_viec_erp_simulation.html`.
* **Yêu cầu chi tiết**:
  1. **Thiết kế lại Màn hình Tổng quan thành Executive Dashboard Đẳng cấp**:
     - Gỡ bỏ hoàn toàn khung hướng dẫn tĩnh cũ ("Hướng dẫn bắt đầu · xong 3/6 bước") để trả lại không gian cho các chỉ số điều hành.
     - **4 Thẻ Hero KPI Chỉ số Then chốt**:
       * *Sản lượng gỗ đã cân*: ví dụ `1.842,50 tấn` (Đạt 92.4% kế hoạch 1.994 tấn, có thanh tiến độ).
       * *Diện tích rừng quản lý*: `185,60 ha` (phân bổ qua 56 lô, 42 chủ rừng).
       * *Lực lượng tác nghiệp*: `64 nhân công (8 đội) · 24 xe vận chuyển đang chạy`.
       * *Tỷ lệ hồ sơ FSC hợp lệ*: `88.5%` (48/56 lô sẵn sàng xuất hồ sơ, 8 lô chờ hậu kiểm).
     - **Biểu đồ Sản lượng 6 tháng gần nhất**: Trực quan hóa khối lượng gỗ cân theo từng tháng.
     - **Khối Giám sát Tác nghiệp Thực địa Thời gian thực**:
       * Bảng 5 Lô rừng đang khai thác tích cực nhất (Chủ rừng, Mã lô, Diện tích, Khối lượng đã cân, Trạng thái).
       * Bảng 5 Phiếu cân trạm mới nhất (Giờ cân, Biển số xe, Lô rừng, Số tấn, Trạng thái Khớp).
     - **Radar Cảnh báo Rủi ro & Hậu kiểm FSC**: Cảnh báo xe sắp hết hạn đăng kiểm trong 7 ngày, lô chưa đủ nhân công, hợp đồng thiếu chữ ký.
     - **Bệ phóng Tác nghiệp 1-Chạm (Quick Launchpad)**: Lối tắt tạo nhanh chủ rừng mới, tra cứu Google Sheets, nạp phiếu cân trạm, xuất báo cáo BM-16/17, và Callout mở Bàn làm việc ERP.
  2. **Thêm Menu "Bàn làm việc" trên thanh điều hướng chính (`nav`)**:
     - Cấu trúc thanh menu mới: `[ 📊 Tổng quan ]`  `[ 💼 Bàn làm việc (3/6) ]`  `[ 📁 Danh mục ]`  `[ 📑 Báo cáo ]`  `[ ⚙️ Định mức ]`  `[ 🔧 Cài đặt ]`.
     - Có badge hiển thị tiến độ bước công việc đang xử lý (ví dụ: `3/6`).
  3. **Thiết kế Sơ đồ Quy trình Luân chuyển Nghiệp vụ (ERP Process Subway Flowchart)** trong `ui/app/10-e-ban-lam-viec.js`:
     - Thể hiện trực quan đường ray quy trình 6 bước khép kín:
       * **Bước 1**: Hồ sơ Chủ rừng & Pháp lý (Tra cứu Google Sheets, CCCD, HĐ Nguyên tắc).
       * **Bước 2**: Lập Lô rừng & Khai thác (Mã lô, Diện tích 4.2 ha, Thời gian).
       * **Bước 3**: Đội khai thác & Nhân công (HĐ Nhân công, Tổ trưởng, Công nhân, Định mức).
       * **Bước 4**: Đội xe & Vận chuyển (HĐ Vận chuyển, Gán xe, Chọn tài xế, Cước tấn/km).
       * **Bước 5**: Phiếu cân & Đối soát (14 phiếu cân, Khối lượng 185t, Khớp nhà máy).
       * **Bước 6**: Hậu kiểm 2 chặn & Xuất bộ hồ sơ FSC (BM-01 đến BM-20).
     - Mỗi bước là một node tương tác: Hiển thị icon, nhãn, trạng thái (*Đã duyệt / Đang làm / Chờ xử lý / Bị khóa*). Click vào node nào sẽ cuộn và làm nổi bật (highlight) trạm công việc của bước đó.
  4. **Tích hợp Hàng đợi Công việc (Action Queue / To-Do Worklist)**:
     - Cột bên phải hiển thị danh sách các việc tồn đọng cần giải quyết ngay hôm nay theo hồ sơ lô rừng đang chọn kèm nút hành động 1-chạm `[Xử lý ngay]`.

---

### 📌 Nhiệm vụ 7: Chuẩn hóa Luồng Phiếu cân & Đối soát Sản lượng Thông minh
* **Files liên quan**: `ui/app/11-b-ban-nhap.js`, `ui/app/11-c-hop-thoai-dong.js`, `ui/app/32-phieu-hop-dong.js`.
* **Yêu cầu chi tiết**:
  1. **Tự động gán & Bổ sung hàng loạt Xe từ Phiếu cân (1-Click Batch Assign)**:
     - Thay thế thanh cảnh báo nút nhỏ lắt nhắt (`+ Thêm xe 29C-123.45`, `+ Thêm xe 43C-678.90`...) bằng nút hành động nổi bật: **`[ ⚡ Tự động gán & thêm nhanh toàn bộ xe vào đội ]`**.
     - Hệ thống tự động quét danh sách biển số trong phiếu cân:
       * Xe đã có trong Danh mục Xe $\rightarrow$ Tự động gán vào Đội xe của lô.
       * Xe chưa có trong Danh mục Xe $\rightarrow$ Tự động tạo bản ghi xe nhanh vào Danh mục để hoàn thiện hồ sơ sau.
  2. **Thẻ Đối soát Sản lượng Khai thác Thời gian thực (Real-time Yield Reconciliation)**:
     - Hiển thị bảng đối soát tự động: Khối lượng dự kiến theo hecta trên Hợp đồng vs Tổng khối lượng thực nhận từ trạm cân (tấn).
     - Tự động tính toán tỷ lệ % hoàn thành và cảnh báo nếu có sự chênh lệch bất thường (> 15%).

---

### 📌 Nhiệm vụ 8: Trung tâm Tiền kiểm soát 2 Chặn & Xuất Hồ sơ Trọn gói (Pre-flight Inspection)
* **Files liên quan**: `ui/app/10-c-xuat-ho-so.js`, `ui/app/13-kiem-tra.js`.
* **Yêu cầu chi tiết**:
  1. **Bảng Checklist Tiền kiểm soát (Pre-flight Checklist) tích hợp**:
     - Tích hợp trực tiếp bảng kiểm soát logic ngay tại trang Xuất hồ sơ thay vì bắt người dùng chuyển qua lại tab Kiểm tra.
     - Hiển thị rõ từng tiêu chí: *Chủ rừng hợp lệ, Hợp đồng nhân công đủ điều kiện, Đội xe đủ giấy tờ, Phiếu cân khớp khối lượng*.
     - Mỗi cảnh báo/lỗi chặn đều có nút **`[ 🛠️ Đi đến sửa ]`** (Jump to Fix) đưa người dùng đến thẳng đúng ô/dòng bị thiếu.
  2. **Xuất Trọn bộ Hồ sơ 1-Chạm (1-Click Full Bundle Export)**:
     - Bổ sung nút **`[ 📦 Xuất trọn bộ hồ sơ FSC (BM-01 → BM-20) ]`**: Tự động kết xuất đồng loạt toàn bộ các biểu mẫu đã kiểm tra đạt thành 1 file ZIP hoặc 1 tài liệu gộp có mục lục trang chuẩn Word/PDF.

---

### 📌 Nhiệm vụ 9: Cơ chế Sao lưu An toàn Dữ liệu & Phím tắt Tác nghiệp ERP
* **Files liên quan**: `main.js`, `ui/app/01-cau-hinh-tien-ich.js`, `ui/app/18-su-kien.js`.
* **Yêu cầu chi tiết**:
  1. **Sao lưu Tự động Xoay vòng (Auto Rotating Snapshots)**:
     - Sau mỗi lần bấm "Lưu dữ liệu vào lô", hệ thống tự động lưu 1 bản snapshot `.bak` trong thư mục `backups/` (lưu giữ 10 phiên bản gần nhất), tránh mất mát dữ liệu khi mất điện hoặc máy tính gặp sự cố.
  2. **Gói Hồ sơ Lô Rừng Di động (.fscpkg)**:
     - Cho phép xuất riêng 1 lô rừng ra file gói nén để chuyển giao giữa các nhân viên/kế toán mà không phải chép đè toàn bộ tệp SQLite của máy.
  3. **Hệ thống Phím tắt Tiện ích (ERP Productivity Shortcuts)**:
     - `Ctrl + S`: Lưu bản nháp / Lưu dữ liệu lô.
     - `Ctrl + K`: Mở thanh tìm kiếm toàn cục.
     - `Enter`: Kích hoạt Tra cứu Google Sheets khi đang ở các ô định danh.
     - `Esc`: Đóng nhanh các hộp thoại Modal.

---

### 📌 Nhiệm vụ 10: Quản lý Truy xuất Nguồn gốc FSC & Đối soát Diện tích Đa nguồn (Traceability & Offline Resilience)
* **Files liên quan**: `ui/app/15-du-lieu-cai-dat-sao-luu-lo.js`, `ui/app/17-b-bo-loc-thong-minh.js`, `ui/app/17-c-tra-cuu-chi-tiet.js`.
* **Yêu cầu chi tiết**:
  1. **Thẻ Đối soát 3 Nguồn Diện tích Đất Rừng (Triple Area Verification)**:
     - Tích hợp bảng đối chiếu trực quan 3 nguồn dữ liệu: *Diện tích theo Giấy chứng nhận quyền sử dụng đất (Sổ đỏ) vs Diện tích thực tế khảo sát vs Diện tích đo đạc từ điểm tọa độ GPS*.
     - Tự động phát hiện và cảnh báo độ lệch nếu có xung đột diện tích (`areaConflict`), đảm bảo hồ sơ không bị từ chối trong các kỳ đánh giá chứng chỉ FSC.
  2. **Dòng thời gian Nhật ký Truy xuất Nguồn gốc (Audit Trail Timeline)**:
     - Xây dựng giao diện Dòng thời gian (Timeline) hiển thị đầy đủ lịch sử tác động trên lô rừng: *Thời điểm nạp phiếu cân, lịch sử đổi số phiếu, gán xe/công nhân, thời điểm đóng gói và in ấn*.
     - Có thể xuất in kẹp vào tập hồ sơ pháp lý BM-18 (Nhật ký khai thác & lưu trữ FSC).
  3. **Cơ chế Ngoại tuyến Dự phòng Thông minh (Smart Offline Cache Fallback)**:
     - Khi mất kết nối internet hoặc API Google Sheets bị nghẽn: Hệ thống tự động chuyển sang đọc từ Bộ nhớ đệm cục bộ (Local Snapshot Cache) của phiên đồng bộ gần nhất.
     - Hiển thị huy hiệu trạng thái: `[ 📶 Ngoại tuyến - Dùng bản đệm gần nhất ]`, bảo đảm người dùng tại hiện trường rừng/văn phòng luôn làm việc liên tục 100%, không bao giờ bị gián đoạn.

---

## 4. PHÂN CHIA NHIỆM VỤ CHO MULTI-AGENT SWARM (NẾU DÙNG ĐỘI AGENT)

```
                       ┌──────────────────────────────────────────────┐
                       │           COORDINATOR / TECH LEAD            │
                       │    (Giám sát mục tiêu v3.5.1 trên main)      │
                       └──────────────────────┬───────────────────────┘
                                              │
         ┌──────────────────┬─────────────────┼──────────────────┬──────────────────┐
         │                  │                 │                  │                  │
         ▼                  ▼                 ▼                  ▼                  ▼
┌─────────────────┐┌─────────────────┐┌─────────────────┐┌─────────────────┐┌─────────────────┐
│     AGENT 1     ││     AGENT 2     ││     AGENT 3     ││     AGENT 4     ││     AGENT 5     │
│   Frontend UX   ││  Vehicle & Flow ││  Master-Detail  ││  Smart Filter   ││  Theme & Skins  │
│   & Directory   ││   Specialist    ││   & Auto-fill   ││   & Reporting   ││   Design System │
└────────┬────────┘└────────┬────────┘└────────┬────────┘└────────┬────────┘└────────┬────────┘
         │                  │                 │                  │                  │
         └──────────────────┴─────────────────┼──────────────────┴──────────────────┘
                                              ▼
                               ┌─────────────────────────────┐
                               │           AGENT 6           │
                               │      QA, Build & Gate       │
                               │  (Build index.html & Test)  │
                               └─────────────────────────────┘
```

* **Agent 1: Frontend UX, Directory & ERP Workbench Specialist**
  - **Phụ trách**: Nhiệm vụ 2 (Danh mục đối tượng trong `ui/app/30-cai-dat-danh-muc.js`) & Nhiệm vụ 6 (Phân hệ Bàn làm việc ERP trong `ui/app/10-e-ban-lam-viec.js`).
  - **Skill**: `crud-directory-standard/SKILL.md` (tham chiếu `danh_muc_chuan_hoa_simulation.html` và `ban_lam_viec_erp_simulation.html`).
  - **Đầu ra**: Tách biệt Bảng danh sách và Modal Thêm/Sửa, Segmented Controls chức vụ/ngành nghề; Menu "Bàn làm việc" tách khỏi Tổng quan, sơ đồ quy trình trực quan và hàng đợi công việc.

* **Agent 2: Vehicle & Personnel Flow Specialist**
  - **Phụ trách**: Nhiệm vụ 3 (`ui/app/11-b-*.js`, `11-c-*.js`, `12-c-*.js`).
  - **Skill**: Chuẩn tách biệt Phương tiện vs Con người (`src/xedm.js`, `src/doituong.js`).
  - **Đầu ra**: Form Thêm xe 3 khối (Xe - Tài xế - Người ký), Quick Modal Người ký tại Đội xe, xóa nút văng màn hình.

* **Agent 3: Master-Detail, Lookup & Traceability Specialist**
  - **Phụ trách**: Nhiệm vụ 1 (Thông tin Chủ rừng, Tra cứu Google Sheets trong `ui/app/10-d-*.js`, `17-*.js`) & Nhiệm vụ 10 (Truy xuất nguồn gốc FSC & Đối soát Diện tích trong `ui/app/15-*.js`, `17-b-*.js`).
  - **Skill**: `master-detail-design/SKILL.md` (tham chiếu `tra_cuu_chu_rung_cha_con_simulation.html` và `thong_tin_chu_rung_chuan_hoa_simulation.html`).
  - **Đầu ra**: Cụm tìm kiếm định danh ở đầu form, Modal Tra cứu Cha - Con Google Sheets, Auto-fill, thẻ đối soát diện tích 3 nguồn và Audit Trail timeline.

* **Agent 4: Smart Filter & Reporting Specialist**
  - **Phụ trách**: Nhiệm vụ 4 (`ui/app/35-bo-loc-thong-minh.js`, `10-a-*.js`, `16-*.js`, `25-*.js`).
  - **Skill**: `smart-filter/SKILL.md`.
  - **Đầu ra**: Smart Filter cho Sidebar chủ rừng, Smart Typeahead cho bộ chọn, đồng bộ Export Scope khi in/xuất.

* **Agent 5: Theme & Design System Specialist**
  - **Phụ trách**: Nhiệm vụ 5 (`ui/app.src.html`, `ui/skins.css`, `ui/vendor/hak-design-system/`).
  - **Skill**: HAK Design System, WCAG AA contrast.
  - **Đầu ra**: Chuẩn hóa CSS Variables Dark Mode trong các Modal, nút 1-Click Theme Toggle trên Header, Segmented Buttons đồng bộ Skin.

* **Agent 6: Build, QA & Quality Gate Auditor**
  - **Phụ trách**: Đóng gói và kiểm thử chất lượng toàn hệ thống.
  - **Quy trình bắt buộc**:
    1. Chạy đóng gói: `node scripts/build-html.js` $\rightarrow$ sinh ra `renderer/index.html`.
    2. Chạy unit tests: `node --test tests/cai-dat-tab-ngang.test.js tests/contrast.test.js tests/dinhbien.test.js tests/doi.test.js tests/hopdong.test.js`.
    3. Chạy kiểm tra tương phản Skin: `node --test tests/skins.test.js`.
    4. Chạy Control Center Quality Gate: `node scripts/run-control-center-audit.mjs`.

---

## 5. CÁC QUY TẮC BẮT BUỘC (MANDATORY CONSTRAINTS)

1. **Quy tắc CSP (Content Security Policy) - Tuyệt đối tuân thủ**:
   - File `renderer/index.html` được sinh tự động bởi `scripts/build-html.js` từ `ui/app.src.html` và các file `ui/app/*.js`.
   - **Tuyệt đối không dùng sự kiện inline (`onclick="..."`, `onchange="..."`)** trong HTML template, vì CSP sẽ chặn. Mọi tương tác phải thông qua `data-act="..."` hoặc event listener.
2. **Quy tắc Bảo toàn Nghiệp vụ Kế toán & Hồ sơ FSC**:
   - Dữ liệu lưu xuống DB và các biểu mẫu xuất in (BM-01 đến BM-20) phải giữ nguyên công thức tính toán và số liệu kế toán chính xác.
3. **Quy tắc Canh lề chữ (Left-align)**:
   - Mọi nhãn văn bản tiếng Việt trong menu/tabs luôn canh lề trái (`justify-content: flex-start; text-align: left`).
4. **Quy tắc Dark Mode & Contrast (WCAG AA)**:
   - Tỷ lệ tương phản chữ trên nền phải đạt $\ge 4.5:1$. Mọi modal mới phải hỗ trợ hoàn hảo cả 2 chế độ Sáng và Tối.
5. **Cơ sở nhánh Git**:
   - Tất cả các chỉnh sửa được thực hiện trực tiếp trên cơ sở nhánh `main` mới nhất GitHub (`origin/main`, commit `d6dbd8f`) hướng tới phiên bản phát hành **v3.5.1**.
