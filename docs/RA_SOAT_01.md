# Rà soát 01 — quy trình nhập liệu, trùng lắp, số liệu, giao diện, chất lượng mã

Phiếu: `[PHIẾU GIAO VIỆC #01]`. Người rà: STAFF_FSC. Ngày: 18/11/2026.
Mốc rà: `main` tại `13d82a3` (package.json 3.0.0, SQLite v15). Không sửa mã; chỉ thêm tệp này và ảnh trong `docs/ra-soat-01/`.

**Ký hiệu mức xác minh** (dùng ở mọi phát hiện):
- **[CHẠY]** — đã tái hiện bằng chạy thử: gọi đúng hàm lõi trong `src/` bằng Node (kịch bản ở Phụ lục), hoặc chạy app Electron (ảnh, e2e).
- **[ĐỌC]** — suy luận từ đọc mã, chưa tái hiện bằng chạy thử; có trích tệp:dòng để kiểm lại.

**Kiểm thử nền đã chạy:**

| Lệnh | Kết quả |
| --- | --- |
| `NODE_OPTIONS= node scripts/test.js` (trước khi viết báo cáo) | 548 tổng · 547 đạt · 0 lỗi · 1 bỏ qua |
| `NODE_OPTIONS= node scripts/test.js` (sau khi viết báo cáo) | như trên (PR không đổi mã) |
| `scripts/e2e-all.js e2e-nghiemthu30 e2e-hopdong30 e2e-phieu30 e2e-danhmuc30 e2e-phanbo30 e2e-mot-nguoi-hai-doi30 e2e-bennhankhoan30` | 7/7 bộ · 151 kiểm tra đạt (Linux, xvfb) |
| `scripts/anh-man-hinh.js --rong 1366 --cao 768` và `--rong 1920 --cao 1080` | 15 màn × 3 mức phóng (100/125/150 %) mỗi cỡ = 90 ảnh; công cụ đo không phát hiện tràn ngang ở ảnh nào |
| `node scripts/kiem-kich-thuoc.js` | 99 file, 70 cảnh báo (7 file > 40 KB, 63 file có dòng > 300 ký tự) |

---

## A. Quy trình nhập liệu

### A.1 Đường nhập một hồ sơ (theo `docs/QUY_TRINH_NHAP_3_0.md`, đối chiếu mã và ảnh chụp)

| # | Bước | Màn / nơi nhập | Trường và bắt buộc | Kiểm hợp lệ (nơi) | Lỗi hiển thị |
| --- | --- | --- | --- | --- | --- |
| 1 | Danh mục đối tượng | Cài đặt → Danh mục đối tượng (ảnh `1366x768-150-danh-muc-doi-tuong.jpg`) | Bắt buộc: tên đối tượng; thể nhân ≥ 1 người có họ tên; pháp nhân có quyền ký phải có người đại diện; tài xế phải có GPLX. CCCD **không bắt buộc**; nếu có thì 9 hoặc 12 số | `src/doituong.js:83-101` `kiem` | Danh sách lỗi trong hộp sửa |
| 2 | Danh mục xe | Cài đặt → Danh mục xe | Bắt buộc: BKS; ngày đúng dạng | `src/xedm.js:28-35` | Danh sách lỗi |
| 3 | Chủ rừng | Thông tin chủ rừng (`ui/app/10-d-dinh-muc-nhap-excel.js:109-133`) | Bắt buộc: mã, danh xưng, họ tên, CCCD 12 số, ngày cấp, nơi cấp, địa chỉ | `src/kiemtranhieudoi.js:8-21` `infoErrors` | Dòng lỗi trên biểu mẫu |
| 4 | Lô / rừng | Thông tin rừng (các mục bên trái) | Bắt buộc: mã rừng (duy nhất, không phân biệt hoa thường), địa điểm; số liệu số phải là số | `src/kiemtranhieudoi.js:23-40` `forestErrors`, `src/lorung.js:56` `maTrung` | Dòng lỗi |
| 5 | Hợp đồng nhân công (đội) | Rừng → Nhân công → danh sách hợp đồng → chi tiết (ảnh `1366x768-125-thanh-vien-hop-dong.jpg`) | Bên nhận khoán, hình thức, đơn giá theo vị trí, thành viên chọn từ danh mục | `kiemtranhieudoi.js:47-96` `checkNC`; giá: `giaErrors` | Bảng “Không có lỗi” / danh sách lỗi theo dòng |
| 6 | Thành viên | Hợp đồng nhân công → Thành viên | Mỗi dòng bắt buộc: vai trò, họ tên, ngày sinh (≥ 18 tuổi), CCCD 12 số, ngày cấp, nơi cấp, địa chỉ, chức danh hợp lệ; không trùng CCCD trong cùng đội | `kiemtranhieudoi.js:56-72` | Lỗi theo “Dòng N:” |
| 7 | Hợp đồng vận chuyển, xe | Rừng → Vận chuyển → hợp đồng → Xe và tài xế | Chủ xe, BKS (không trùng), người ký “Chủ xe”/“Tài xế”, giấy tờ xe | `kiemtranhieudoi.js:97-150` `checkDX` | Lỗi theo dòng |
| 8 | Phiếu cân | Hợp đồng vận chuyển → Phiếu cân: thêm tay, nạp Excel, dán từ Excel, tra cứu HoSoKeo (ảnh `1366x768-150-phieu-can-hop-dong.jpg`) | Số phiếu, ngày cân (ngày có thật), BKS khớp xe của hợp đồng, khối lượng > 0 | `src/docphieucan.js:110-142` | Lỗi theo dòng; phiếu sai hợp đồng phải xử lý ở khung xem trước |
| 9 | Phân bổ khối lượng | Rừng → Nhân công → Phân bổ (`ui/app/33-phan-bo.js`) | 1 đội: tự; 2 đội: chọn theo phiếu / chia đều; ≥ 3 đội: theo phiếu | `src/phanbo.js:20-29` | Xem trước rồi “Lưu phân bổ” |
| 10 | Đợt 1 / đợt 2, xuất | Kiểm tra trước khi xuất → Xuất hồ sơ (ảnh `1920x1080-100-xuat-ho-so.jpg`) | Mục chặn / đối chiếu theo nhóm (`src/kiemtra.js`) | `ui/app/10-a-kiem-tra-xuat.js:39-120` | Danh sách mục chặn kèm biểu mẫu bị ảnh hưởng |

Đường nhập trên đã được đi hết tự động bằng 7 bộ e2e của bản 3.0 nêu ở đầu (đạt 151/151). Tôi **không** tự bấm tay từng bước; ảnh chụp lấy từ `scripts/anh-man-hinh.js`.

### A.2 Phát hiện

| Mã | Phát hiện | Xác minh | Dẫn chứng |
| --- | --- | --- | --- |
| A-01 | **Hai chủ rừng cùng CCCD** (khác mã) lưu được, không cảnh báo. Chủ rừng chỉ chặn trùng **mã** | [CHẠY] | `infoErrors` trả `[]` cho CR-02 cùng CCCD với CR-01 (Phụ lục, kịch bản A). `kiemtranhieudoi.js:11` chỉ so `info.ma` |
| A-02 | **Mã chủ rừng so nguyên văn**: “cr-01” và “CR-01 ” không bị báo trùng “CR-01”. Mã lô thì không phân biệt hoa thường → hai quy tắc khác nhau cho cùng loại “mã” | [CHẠY] | `kiemtranhieudoi.js:11` (`r.info.ma === info.ma`); so với `lorung.js:46` (`maKey` viết hoa) |
| A-03 | **CCCD: 9 hay 12 số?** Danh mục đối tượng nhận CMND 9 số; chủ rừng và thành viên trong lô chỉ nhận 12 số → người lưu được ở danh mục nhưng chọn vào đội thì bị chặn | [CHẠY] | `doituong.js:95` (`/^(\d{9}|\d{12})$/`) vs `kiemtranhieudoi.js:16,69` (`isCccd` 12 số) |
| A-04 | **Danh mục không đòi đủ thông tin mà lô đòi**: người chỉ có họ tên + CCCD lưu được ở danh mục; chọn vào đội thì mới báo thiếu ngày sinh, ngày cấp, nơi cấp, địa chỉ → người dùng phải quay lại danh mục sửa (bước dễ sai, vòng đi lại) | [CHẠY] cho danh mục; [ĐỌC] cho lô | `doituong.js:83-101`; `kiemtranhieudoi.js:58-68` |
| A-05 | **Chủ rừng nhập tay, không chọn từ Danh mục đối tượng** → cùng một người (vừa chủ rừng vừa chủ xe / nhân công) phải gõ họ tên, CCCD, ngày cấp, nơi cấp, địa chỉ ở hai nơi | [ĐỌC] | `ui/app/10-d-dinh-muc-nhap-excel.js:109-133` (biểu mẫu `infoForm`) không tham chiếu `dmDoiTuong` / `HAKDoiTuong` (grep: 0 lần) |
| A-06 | **Lưu lô ghi người / xe mới vào danh mục CŨ** (`dmLaoDong`, `dmXeVC`), trong khi thiết kế 3.0 coi hai danh mục này là bản lưu trữ “không sửa nữa”; thông báo “Đã thêm N người / xe mới vào Danh mục” nhưng màn Danh mục đối tượng / Danh mục xe không có họ | [ĐỌC] | `ui/app/11-d-luu-ban-nhap.js:40` gọi `dmGhiTuLo`; `ui/app/20-nhap-tu-danh-muc.js:43-55` ghi `db.dmLaoDong`, `db.dmXeVC`; `docs/THIET_KE_3_0.md` mục 1, dòng “Người / xe” |
| A-07 | **Chữ hướng dẫn cũ còn nhắc menu “⋯ Thêm”** (đã bỏ ở 3.0) và “Tab Phiếu cân” (3.0 không còn tab này; phiếu nằm trong hợp đồng vận chuyển) | [CHẠY] (ảnh) | Ảnh `1366x768-100-tong-quan.jpg`; `ui/app/28-tien-ich.js:123`, `ui/app/09-tong-quan-giao-dien.js:53`, `ui/app/18-su-kien.js:333`, `src/tienich.js:101`, `docs/HUONG_DAN.md:27` (9 lần “⋯ Thêm”) |
| A-08 | **Nạp Excel nhân công khớp người theo CCCD trong cả lô**: muốn đưa một người đã ở đội khác vào đội này thì không nạp được, phải chọn tay (giới hạn đã ghi ở ghi chú 3.0) — dễ làm sai khi lô nhiều đội | [ĐỌC] | `docs/GHI_CHU_PHAT_HANH_3.0.0.md` mục Giới hạn |
| A-09 | **Thông báo khó hiểu**: nút “Xóa đã lưu” (ảnh thành viên) không nói rõ xóa dòng khỏi hợp đồng hay xóa dữ liệu đã lưu; nhóm “Kiểm tra trước khi xuất (13 đối chiếu)” không nói là không chặn | [CHẠY] (ảnh) | Ảnh `1366x768-125-thanh-vien-hop-dong.jpg`, `1920x1080-100-xuat-ho-so.jpg` |

---

## B. Trùng lắp dữ liệu

### B.1 Khóa nhận diện và tầng chặn

| Đối tượng | Khóa đang dùng | Chặn ở giao diện | Chặn ở lõi `src/` | Chặn ở SQLite | Ghi chú |
| --- | --- | --- | --- | --- | --- |
| Người (danh mục) | CCCD (chỉ chữ số); mã đối tượng; không có CCCD thì **không có khóa** | hộp sửa hiện lỗi | `doituong.js:83-101` | không (bảng `danh_muc`: mỗi dòng một bản ghi JSON, khóa chính `(kind, ord)`) | CCCD có khoảng trắng/dấu chấm vẫn nhận đúng (B-03) |
| Pháp nhân | MST; mã; không có MST thì **không có khóa** | như trên | `doituong.js:86-88` | không | B-02 |
| Xe (danh mục) | BKS chuẩn hóa (`bks.khoa`: viết hoa, bỏ khoảng trắng, chấm, gạch) | hộp sửa | `xedm.js:18,31` | không | B-04 đối chứng |
| Xe trong lô | BKS **nguyên văn** | kiểm tra lô | `kiemtranhieudoi.js:107` | không | B-05 |
| Thành viên trong đội | CCCD + đội | kiểm tra lô | `kiemtranhieudoi.js:69-71` | không | một người ở hai đội là hợp lệ |
| Phiếu cân | trong lô khi nạp Excel: `soPhieu.toUpperCase()`; giữa các lô: `khoaPhieu` = số phiếu bỏ khoảng trắng + ngày lịch | kiểm tra file nạp | `docphieucan.js:136`; `cheolo.js:29-50`; `bks.js:13` | không | B-06, B-07 |
| Hợp đồng (đội / đội xe) | ID nội bộ; số văn bản | — | `sovb.js` (trùng số) | không | không chặn hai hợp đồng cùng bên ký trong một lô |
| Lô | mã rừng viết hoa (`maKey`) | Thông tin rừng | `lorung.js:46,56` | không | B-08 |
| Số văn bản | chuỗi số viết hoa | Kiểm tra (đối chiếu, không chặn) | `sovb.js:86` `trung` | không | B-09 |
| Mã chủ rừng | chuỗi nguyên văn | Thông tin chủ rừng | `kiemtranhieudoi.js:11` | không | A-02 |

Không có ràng buộc UNIQUE nào ở SQLite cho các khóa nghiệp vụ trên; chống trùng hoàn toàn dựa vào giao diện và lõi. Tầng lưu có kiểm quan hệ (`src/quanhe.js`, mã `QUAN_HE`) nhưng không kiểm trùng. [ĐỌC]

### B.2 Ca lọt (mỗi ca có kịch bản tái hiện ở Phụ lục, kịch bản B)

| Mã | Ca lọt | Xác minh | Bước tái hiện (rút gọn) |
| --- | --- | --- | --- |
| B-01 | Hai **thể nhân cùng họ tên**, chưa khai CCCD → hai hồ sơ (DT0001, DT0002), không cảnh báo | [CHẠY] | `DoiTuong.luu` lần lượt “NGUYỄN VĂN AN” và “Nguyễn Văn An”, không CCCD |
| B-02 | Hai **pháp nhân cùng tên** (khác hoa thường), chưa có MST → hai hồ sơ | [CHẠY] | `DoiTuong.luu` “CÔNG TY TNHH VẬN TẢI AN PHÁT” rồi “Công ty TNHH Vận tải An Phát” |
| B-05 | **Xe trùng BKS khác cách viết trong cùng lô** (“92C-12345” và “92C12345”) không bị báo; chỉ chuỗi giống hệt mới bị báo | [CHẠY] | `checkDX` với ba dòng 92C-12345 / 92C12345 / 92C-12345 → chỉ “Dòng 4: Biển kiểm soát trùng dòng 2” |
| B-06 | **Phiếu cân: hai khóa khác nhau.** Nạp Excel coi “PA 1” và “PA1” cùng ngày là hai phiếu (không báo trùng), nhưng coi “PA1” ngày 05/10 và “PA1” ngày 06/10 là trùng (báo lỗi) — ngược với khóa nghiệp vụ `khoaPhieu` (số phiếu + ngày) dùng giữa các lô | [CHẠY] cho hai khóa; [ĐỌC] cho đường nạp | `bks.khoaPhieu` vs `docphieucan.js:136` |
| B-07 | **Hàm chặn thêm phiếu đã có (`HAKBks.phieuDaCo`) không được gọi ở đâu** → thêm tay một phiếu đã có trong rừng (cùng số + ngày, ở hợp đồng khác) không bị chặn khi thêm; chỉ bị phát hiện nếu nạp cùng file | [CHẠY] (grep) / [ĐỌC] cho đường thêm tay | `grep -rn phieuDaCo src ui/app` → chỉ `src/bks.js` |
| B-08 | **Mã lô**: “R-01” và “r-01” bị nhận là trùng (đúng), nhưng “R 01” thì không | [CHẠY] | `LoRung.duplicateGroups` |
| B-09 | **Số văn bản**: “015/2026-kt” nhận là trùng “015/2026-KT” (đúng), “015 /2026-KT” thì không | [CHẠY] | `SoVB.trung` |
| B-10 | **Khôi phục gói lô có thể nhân không CCCD**: mỗi lần khôi phục thêm một đối tượng mới (khôi phục cùng gói hai lần → 2 đối tượng “TRẦN VĂN BA”) | [CHẠY] | `GoiDM.noi` hai lần với cùng gói (`goidm.js:56` chỉ nối thể nhân theo CCCD) |
| B-11 | **Danh mục cũ nhận thêm người / xe khi lưu lô** (A-06) — một người có thể vừa ở `dmDoiTuong` vừa được thêm mới vào `dmLaoDong` | [ĐỌC] | `ui/app/20-nhap-tu-danh-muc.js:43-55` |
| — | Đối chứng (không lọt): CCCD viết “049 067.005 459” bị chặn trùng đúng (B-03); BKS “92C-123.45” / “92c12345” ở Danh mục xe bị chặn đúng (B-04); phiếu “1/11/2026” và “01/11/2026” giữa hai lô bị phát hiện (đã có e2e `e2e-cheo-lo-ngay`) | [CHẠY] | |

Chưa rà được bằng chạy thử: nhập trùng qua **Tra cứu Google Sheets** (không có Sheets thật; e2e dùng dữ liệu giả lập) và **hợp nhất toàn bộ dữ liệu** (`applyImport` chế độ “Giữ cả hai”). Hai đường này cần một phiếu rà riêng.

---

## C. Xử lý số liệu

| Đại lượng | Công thức | Nơi tính | Nơi tính lặp (công thức khác) |
| --- | --- | --- | --- |
| Khối lượng một phiếu (tấn) | Nạp Excel làm tròn đến kg khi đọc | `docphieucan.js:79-81` | Tra cứu HoSoKeo **giữ nguyên** cột “Khối lượng (Tấn)” (`lookup.js:673`), ghi thẳng vào lô (`ui/app/17-e-ghi-vao-ho-so.js:38`) |
| Tổng phiếu cân của lô | (a) làm tròn **tổng**: `round(Σkl, 3)` | `lorung.js:141` `sumKl`, `tonghop.js:12`, `ui/app/17-b…:40`, `17-d…:96` | (b) làm tròn **từng phiếu**: `Σ round(kl·1000)/1000` ở `dinhmuc.js:102` `tongPhieuTan`, `phanbo.js:11`, `docphieucan.js:95`, `ui/app/09-tong-quan-giao-dien.js:10` |
| Khối lượng mỗi đội | chế độ phân bổ (`phanbo.tinh`) | `phanbo.js:20-29`, dùng ở màn Phân bổ và danh sách hợp đồng (`ui/app/31-hop-dong.js:34`) | biểu mẫu dùng `doiOf` → `doiKl` (`kiemtranhieudoi.js:217-223`): chỉ lấy `phanbo` khi chế độ “chia đều”; còn lại theo phiếu đã gán (`klTheoPhieu`), hoặc **chia theo số người** (`doi.js` `khoiLuong`) |
| Diện tích đội | đội nhập riêng, phần còn lại chia theo số người | `kiemtranhieudoi.js:199-204` | — |
| Tiền công | đơn giá vị trí × sản lượng / số công, làm tròn từng người | `kiemtranhieudoi.js` `payRows` | in ở `noidunghopdong.js` (BM-08, BM-14) dùng cùng `payRows` [ĐỌC] |

| Mã | Phát hiện | Xác minh | Dẫn chứng |
| --- | --- | --- | --- |
| C-01 | **Hai công thức tổng khối lượng ra hai số** khi có phiếu chưa làm tròn đến kg (phiếu lấy từ HoSoKeo): 12,3455 + 12,3455 + 0,0004 tấn → `lorung.sumKl` = **24,691**; `dinhmuc.tongPhieuTan` = `phanbo.tinh` = **24,692**. Gói sao lưu lô / tổng hợp đối tượng hiện 24,691, màn tổng quan / phân bổ / BM hiện 24,692 | [CHẠY] | Phụ lục, kịch bản C (C-01) |
| C-02 | **Phân bổ “theo phiếu”, phiếu chưa gán đội**: màn Phân bổ và danh sách hợp đồng hiện mỗi đội **0 t** (30 t chưa gán), còn biểu mẫu BM-08/BM-14 (qua `doiOf`) lặng lẽ **chia theo số người**: Đội 1 22,5 t, Đội 2 7,5 t. Mục “Phiếu cân chưa gán đội” chỉ ở mức **đối chiếu**, không chặn xuất | [CHẠY] cho hai số; [ĐỌC] cho mức đối chiếu | Kịch bản C (C-02); `ui/app/10-a-kiem-tra-xuat.js:99` thêm mục với `'doi'` |
| C-03 | Phiếu từ HoSoKeo có `kl` dạng số lẻ quá kg (tấn 4 chữ số lẻ) được lưu nguyên → nguồn gốc của C-01 | [ĐỌC] | `lookup.js:673`, `17-e-ghi-vao-ho-so.js:38` (không làm tròn) |
| C-04 | Hàm chuẩn hóa BKS viết lại ở **11 nơi** (`stage.js:10`, `docphieucan.js:92`, `cheolo.js:11`, `vieccanlam.js:10`, `lookup.js:217`, `timkiem.js:8` (khác: chữ thường, bỏ dấu), `tonghop.js:6`, `giayto.js:9`, `danhmuc.js:15`, `ui/app/16-bao-cao.js:84`, `bks.js:9`) và một nơi **không** chuẩn hóa (`kiemtranhieudoi.js:107`, xem B-05) | [CHẠY] (grep) | `grep -rn "const plate\|bienKey = " src ui/app` |

Không thấy khác biệt giữa bản in và màn hình ở tiền công trong các e2e đã chạy; chưa đối chiếu tay số tiền với bảng tính ở lượt rà này.

---

## D. Giao diện và bố cục

Ảnh chụp tự động 15 màn × 100/125/150 % ở 1366×768 và 1920×1080 (90 ảnh, lưu ngoài repo); chọn 5 ảnh đại diện vào `docs/ra-soat-01/`. Công cụ đo không phát hiện thanh cuộn ngang của trang ở ảnh nào. Các phát hiện dưới đây đọc từ ảnh. **Chưa kiểm:** thứ tự phím Tab, tỷ lệ tương phản đo bằng công cụ (chỉ nhận xét bằng mắt).

| Mã | Mức | Phát hiện | Ảnh |
| --- | --- | --- | --- |
| D-01 | nặng | **1366×768, 150 %: bảng phiếu cân không thấy dòng nào khi mở màn** — phần đầu (thanh chính, thanh ngữ cảnh, tab chủ rừng, tiêu đề lô, đường dẫn, tab lô, khung hợp đồng, khung nạp file, khung “Chủ rừng…”, “Không có lỗi”) chiếm hết chiều cao; tiêu đề bảng xuống 4 dòng (“Cân lần 2 (kg)”) | `1366x768-150-phieu-can-hop-dong.jpg` |
| D-02 | nặng | **Cột “Thao tác” dính bên phải đè lên cột “Khối lượng (tấn)”** (chữ bị cắt) khi bảng hẹp | như trên |
| D-03 | vừa | **Thông tin ngữ cảnh lặp 4 lần** trên cùng màn: thanh ngữ cảnh (“Chủ rừng… Rừng R-A · Lô R-A”), đường dẫn, dòng “Rừng R-A · Lô R-A” trong khung hợp đồng, khung “Chủ rừng: … · Lô: …”; “R-A · Lô R-A” lặp mã khi tên lô trùng mã | `1366x768-150-phieu-can-hop-dong.jpg`, `1366x768-125-thanh-vien-hop-dong.jpg` |
| D-04 | vừa | **Mật độ bảng thấp**: dòng thành viên cao gấp đôi vì hai nút “Sửa / Xóa đã lưu” chồng nhau; ở 1366×768 125 % chỉ thấy 1,5 dòng | `1366x768-125-thanh-vien-hop-dong.jpg` |
| D-05 | vừa | **Màn Cài đặt vẫn hiện cột trái “Lọc chủ rừng / + Chủ rừng mới / danh sách chủ rừng”**, không liên quan, chiếm ~20 % chiều rộng | `1366x768-150-danh-muc-doi-tuong.jpg` |
| D-06 | nhẹ | **Bảng danh mục rỗng vẫn có thanh cuộn ngang** (bảng có bề rộng tối thiểu lớn hơn khung) | như trên |
| D-07 | vừa | **Tab Xuất hồ sơ: nút tải biểu mẫu nằm dưới màn đầu tiên** ở 1920×1080; phần trên là khung Vòng đời (ô “Lý do”, “Ngày dừng” luôn hiện), Sổ văn bản | `1920x1080-100-xuat-ho-so.jpg` |
| D-08 | nhẹ | Nhãn mục bên trái xuống dòng (“Thông tin hợp đồng, bên ký và cước”, “Phiếu cân” + huy hiệu “2 · 20,5 tấn” xuống 2 dòng) ở 150 % | `1366x768-150-phieu-can-hop-dong.jpg` |
| D-09 | nhẹ | Nút “Chốt hồ sơ” khi bị khóa màu xám nhạt trên nền nhạt, khó nhận ra là nút | `1920x1080-100-xuat-ho-so.jpg` |
| D-10 | nhẹ | Chữ hướng dẫn cũ (“⋯ Thêm”, “Tab Phiếu cân”) — xem A-07 | `1366x768-100-tong-quan.jpg` |
| D-11 | nhẹ | Khoảng trống lớn: cột trái kết thúc ở ~1/3 chiều cao, phần dưới trống; ở 1920 vùng nội dung giới hạn ~1350 px, chừa trống bên phải | các ảnh |

---

## E. Chất lượng mã

| Mã | Phát hiện | Dẫn chứng |
| --- | --- | --- |
| E-01 | **7 file > 40 KB**: `src/noidunghopdong.js` 77 KB, `src/main.js` 71 KB, `src/lookup.js` 57 KB, `src/store.js` 50 KB, `src/kiemtranhieudoi.js` 40 KB, `src/xlsxmau.js` 40 KB, `ui/app/30-cai-dat-danh-muc.js` 40 KB | `node scripts/kiem-kich-thuoc.js` |
| E-02 | **63 file có dòng > 300 ký tự**; dài nhất 698 (`ui/app/05-docx-che-do-in.js`), 531 (`28-tien-ich.js`), 530 (`15-du-lieu…`) | như trên |
| E-03 | **Hàm dài** (không tính hàm bao `create`/IIFE): `registerIpc` 291 dòng (`src/main.js:152`), `relocate` 108 dòng (`src/datamove.js:102`), `panelXuat` 101 dòng (`ui/app/13-quy-trinh-ho-so.js:137`), `exportCheckTinh` 81 dòng (`ui/app/10-a-kiem-tra-xuat.js:39`), `docHDVC` 71 dòng, `smokeRelocate` 69 dòng, `forestOf` 67 dòng, `lkApply` 65 dòng | Phân tích cú pháp bằng acorn (Phụ lục, kịch bản E) |
| E-04 | **Mã trùng giữa module**: hàm chuẩn hóa BKS ở 11 nơi (C-04); hàm `fold` (bỏ dấu) ở 10 file; hàm “chỉ giữ chữ số” (`so`/`digits`) ở 8 file trong `src/` | `grep -rln "const fold = " src ui/app` |
| E-05 | **Mã chết**: `HAKBks.phieuDaCo` không được gọi (B-07); `dmGhiTuLo` ghi vào danh mục đã ngừng (A-06); `ui/app/17-e-ghi-vao-ho-so.js:47` có nhánh `if (false && …)` | grep |
| E-06 | **Biến toàn cục còn lại ở `ui/app`**: 49 khai báo `let`/`var` cấp cao, nhiều nhất `31-hop-dong.js` (9), `32-phieu-hop-dong.js` (4) | `grep -c "^let \|^var " ui/app/*.js` |
| E-07 | **Kiểm thử bỏ qua**: 1 ca (`tests/datamove.test.js:195`, NO_PERMISSION) bỏ qua khi chạy bằng root và trên Windows → không chạy ở đâu trong CI hiện tại (CI Windows bỏ qua; job Linux không chạy kiểm thử đơn vị) | log `scripts/test.js` dòng `# SKIP` |
| E-08 | **Kiểm thử thiếu cho các ca B/C**: không có kiểm thử nào cho B-01, B-02, B-05, B-06, B-10, C-01, C-02 (các kịch bản Phụ lục đều “tái hiện” trên `main`) | Phụ lục |

---

## F. Đề xuất

Thứ tự theo ưu tiên. Cột “Gộp” chỉ việc nên làm chung một phiếu; việc khác cột “Gộp” có thể chia phiếu song song (khác vùng mã).

| Mã | Mô tả | Vị trí | Mức | Công sức | Rủi ro | Cách kiểm chứng | Gộp |
| --- | --- | --- | --- | --- | --- | --- | --- |
| ND-01 | Khối lượng đội ở biểu mẫu phải lấy đúng kết quả `HAKPhanBo.tinh` như màn Phân bổ; còn phiếu chưa gán ở chế độ “theo phiếu” thì **chặn** BM-08/14 (không chia theo số người âm thầm) | `kiemtranhieudoi.js:217-223`, `10-a-kiem-tra-xuat.js:99` | nặng | 1 ngày | đổi bản in lô nhiều đội chưa gán phiếu (cần CHỦ duyệt); lô đã chốt phải giữ nguyên | test C-02 đỏ→xanh; `so-ban-in.js` trên bộ mẫu | — |
| ND-02 | Một hàm tổng khối lượng duy nhất (làm tròn từng phiếu đến kg) cho mọi nơi; làm tròn `kl` đến kg khi ghi phiếu từ HoSoKeo | `lorung.js:141`, `tonghop.js:12`, `17-b`, `17-d`, `lookup.js:673`, `17-e:38` | nặng | nửa ngày | lô đã có phiếu lẻ quá kg: số tổng đổi 1 kg ở vài màn | test C-01; so bản in | ND-03 |
| ND-03 | Dùng `HAKBks.khoa` ở mọi nơi so BKS (bỏ 10 bản sao), gồm kiểm trùng xe trong lô | 11 file ở C-04; `kiemtranhieudoi.js:107` | vừa | 1 ngày | `timkiem.js` đang so chữ thường bỏ dấu — giữ hành vi tìm kiếm | test B-05; grep còn 1 định nghĩa | ND-02 |
| ND-04 | Một khóa phiếu cân (`HAKBks.khoaPhieu`) cho nạp Excel, thêm tay, HoSoKeo; gọi `phieuDaCo` khi thêm phiếu để báo phiếu đã có ở hợp đồng nào | `docphieucan.js:136`, màn thêm phiếu (`ui/app/32-phieu-hop-dong.js`) | nặng | 1 ngày | file Excel cũ có cùng số phiếu khác ngày hết bị báo lỗi (đúng ý nghiệp vụ, cần CHỦ xác nhận) | test B-06, B-07; e2e `e2e-phieu30` | — |
| ND-05 | Bỏ ghi vào `dmLaoDong`/`dmXeVC` khi lưu lô; người / xe mới nhập trong lô thì đề nghị thêm vào Danh mục đối tượng / Danh mục xe (có xác nhận) | `11-d-luu-ban-nhap.js:40`, `20-nhap-tu-danh-muc.js:43-55` | nặng | 1 ngày | trước khi sửa cần một e2e tái hiện A-06 (hiện mới [ĐỌC]) | e2e mới: lưu lô có người mới → `dmDoiTuong` có người, `dmLaoDong` không đổi | — |
| ND-06 | Cảnh báo (không chặn) khi thêm thể nhân / pháp nhân trùng tên chưa có CCCD/MST; khôi phục gói lô nối thể nhân không CCCD theo họ tên + ngày sinh (khớp duy nhất), không thì đưa vào Cần đối chiếu thay vì tạo mới | `doituong.js:83-101`, `goidm.js:56-64` | vừa | 1 ngày | trùng tên thật (hai người khác nhau) → chỉ cảnh báo | test B-01, B-02, B-10 | — |
| ND-07 | Thống nhất quy tắc mã / CCCD: mã chủ rừng so không phân biệt hoa thường, bỏ khoảng trắng; cảnh báo CCCD chủ rừng trùng chủ rừng khác; một quy tắc CCCD (12 số) hoặc ghi rõ CMND 9 số không dùng được cho lô | `kiemtranhieudoi.js:8-21`, `doituong.js:95` | vừa | nửa ngày | dữ liệu cũ có mã chủ rừng chỉ khác hoa thường → hiện lỗi; cần CHỦ chọn quy tắc CCCD | test A-01, A-02, A-03 | ND-08 |
| ND-08 | Chủ rừng chọn được từ Danh mục đối tượng (điền sẵn), vẫn giữ bản chụp trong hồ sơ | `10-d-dinh-muc-nhap-excel.js:109-133` | vừa | nhiều ngày | thêm vai trò “Chủ rừng” vào danh mục; không đổi schema nếu chỉ điền sẵn | e2e mới | ND-07 |
| ND-09 | Danh mục đối tượng báo trước (mức cảnh báo) thông tin mà lô bắt buộc khi người có vai trò Nhân công / Tài xế (ngày sinh, ngày cấp, nơi cấp, địa chỉ) | `doituong.js:83-101` | vừa | nửa ngày | chỉ cảnh báo, không chặn lưu danh mục | test A-04 | — |
| ND-10 | Màn hợp đồng: bỏ các khối ngữ cảnh lặp, gom “Nạp / Dán / Thêm” vào một thanh công cụ, cột Thao tác không đè cột số, tiêu đề cột ngắn; mục tiêu: 1366×768 150 % thấy ít nhất 3 dòng bảng | `ui/app/31-hop-dong.js`, `32-phieu-hop-dong.js`, CSS `ui/app.src.html` | nặng | nhiều ngày | nhiều e2e bám cấu trúc màn; cần ảnh trước/sau | `anh-man-hinh.js` + đếm dòng thấy được; e2e 3.0 | ND-11 |
| ND-11 | Màn Cài đặt ẩn cột chủ rừng; bảng rỗng không có thanh cuộn ngang; tab Xuất hồ sơ đưa nút tải lên đầu, khung Vòng đời / Sổ văn bản gập mặc định | `15-du-lieu…`, `30-cai-dat-danh-muc.js`, `13-quy-trinh-ho-so.js` | vừa | 1 ngày | e2e bám thứ tự khối | ảnh trước/sau | ND-10 |
| ND-12 | Sửa chữ hướng dẫn cũ (“⋯ Thêm”, “Tab Phiếu cân”) trong ứng dụng và `docs/HUONG_DAN.md` | 5 vị trí ở A-07 | nhẹ | nửa ngày | không | grep “⋯ Thêm” chỉ còn trong chú thích lịch sử | — |
| ND-13 | Chạy kiểm thử đơn vị trên một job Linux không phải root để ca NO_PERMISSION thực sự chạy | `.github/workflows/build-windows.yml` | nhẹ | nửa ngày | thêm thời gian CI ~1 phút | CI hiện ca đó “đạt” thay vì “bỏ qua” | — |
| ND-14 | Chia `src/main.js` (`registerIpc` 291 dòng) theo nhóm IPC; ngắt các dòng > 300 ký tự còn lại | `src/main.js`, 63 file | nhẹ | nhiều ngày | dễ trộn với tính năng — làm riêng, sau các việc trên | `kiem-kich-thuoc.js` giảm cảnh báo; e2e đủ | — |

**Gợi ý chia phiếu song song:** (1) ND-01; (2) ND-02 + ND-03; (3) ND-04; (4) ND-05; (5) ND-06; (6) ND-07 (+ ND-08 sau); (7) ND-10 + ND-11 (giao diện, nên làm sau các phiếu số liệu để tránh xung đột e2e); (8) ND-12, ND-13 nhỏ, độc lập.

**Cần CHỦ quyết trước khi giao:** quy tắc CCCD 9 số (ND-07); số phiếu cân trùng khác ngày có hợp lệ không (ND-04); có chấp nhận bản in lô nhiều đội đổi khi bỏ chia theo số người (ND-01).

---

## Phụ lục — kịch bản tái hiện

Chạy bằng Node trên mã của `main` (không cần Electron). Đặt mỗi đoạn vào một tệp ngoài repo, chạy `node <tệp> <đường dẫn repo>`. Dòng in ra bắt đầu bằng `TÁI HIỆN` là ca lọt / khác biệt đã tái hiện.

### Kịch bản A
```js
const R = process.argv[2], req = m => require(R + '/src/' + m);
const K = req('kiemtranhieudoi.js'), Dates = req('dates.js'), DT = req('doituong.js'), L = req('lorung.js');
const out = (id, ok, msg) => console.log((ok ? 'TÁI HIỆN ' : 'KHÔNG     ') + id + ' — ' + msg);
const ctx = db => ({db, trim: s => String(s == null ? '' : s).trim(), HAKDates: Dates, isCccd: s => /^\d{12}$/.test(String(s || '').trim()), numSwap: s => s, HAKLoRung: L});
const chu = (ma, cccd) => ({ma, ten: 'NGUYỄN VĂN AN', danhXung: 'Ông', cccd, ngayCap: '01/01/2021', noiCap: 'CA', diaChi: 'Đà Nẵng'});
{ const db = {rs: {o1: {info: chu('CR-01', '049067005459')}}}; const e = K.create(ctx(db)).infoErrors(chu('CR-02', '049067005459'), 'o2');
  out('A-01', e.length === 0, 'chủ rừng CR-02 cùng CCCD với CR-01: ' + JSON.stringify(e)); }
{ const db = {rs: {o1: {info: chu('CR-01', '049067005459')}}}; const api = K.create(ctx(db));
  const e1 = api.infoErrors(chu('cr-01', '049067005460'), 'o2'), e2 = api.infoErrors(chu('CR-01 ', '049067005461'), 'o3');
  out('A-02', !e1.some(x => /tồn tại/.test(x)) && !e2.some(x => /tồn tại/.test(x)), 'mã "cr-01", "CR-01 " không bị báo trùng "CR-01"'); }
{ const r = DT.luu([], {ten: 'LÊ VĂN B', nguoi: [{hoTen: 'LÊ VĂN B', cccd: '201234567', vaiTro: {nhanCong: true}}]}, ''); const e = K.create(ctx({rs: {}})).infoErrors(chu('CR-09', '201234567'), 'o9');
  out('A-03', r.ok && e.includes('CCCD phải đủ 12 chữ số'), 'danh mục nhận CMND 9 số, chủ rừng thì không'); }
{ const r = DT.luu([], {ten: 'PHẠM C', nguoi: [{hoTen: 'PHẠM C', cccd: '049000000123', vaiTro: {nhanCong: true}}]}, '');
  out('A-04', r.ok, 'danh mục lưu người chỉ có họ tên + CCCD'); }
```
Kết quả trên `13d82a3`: A-01, A-02, A-03, A-04 đều `TÁI HIỆN`.

### Kịch bản B
```js
const R = process.argv[2], req = m => require(R + '/src/' + m);
const DT = req('doituong.js'), XE = req('xedm.js'), BKS = req('bks.js'), K = req('kiemtranhieudoi.js'), Dates = req('dates.js'), SV = req('sovb.js'), L = req('lorung.js'), G = req('goidm.js');
const out = (id, ok, msg) => console.log((ok ? 'TÁI HIỆN ' : 'KHÔNG     ') + id + ' — ' + msg);
// B-01
{ let dm = DT.luu([], {ten: 'NGUYỄN VĂN AN', loai: 'thenhan', nguoi: [{hoTen: 'NGUYỄN VĂN AN', vaiTro: {nhanCong: true}}]}, '').dm;
  const b = DT.luu(dm, {ten: 'Nguyễn Văn An', loai: 'thenhan', nguoi: [{hoTen: 'Nguyễn Văn An', vaiTro: {nhanCong: true}}]}, '');
  out('B-01', b.ok && b.dm.length === 2, 'hai thể nhân cùng họ tên, không CCCD'); }
// B-02
{ let dm = DT.luu([], {ten: 'CÔNG TY TNHH VẬN TẢI AN PHÁT', loai: 'phapnhan'}, '').dm; const b = DT.luu(dm, {ten: 'Công ty TNHH Vận tải An Phát', loai: 'phapnhan'}, '');
  out('B-02', b.ok && b.dm.length === 2, 'hai pháp nhân cùng tên, không MST'); }
// B-03 (đối chứng)
{ let dm = DT.luu([], {ten: 'A', nguoi: [{hoTen: 'A', cccd: '049067005459'}]}, '').dm; const b = DT.luu(dm, {ten: 'B', nguoi: [{hoTen: 'B', cccd: '049 067.005 459'}]}, '');
  out('B-03', !b.ok, 'đối chứng: CCCD có khoảng trắng / dấu chấm vẫn bị chặn'); }
// B-04 (đối chứng)
{ let dm = XE.luu([], {bks: '92C-123.45'}, []).dm; const b = XE.luu(dm, {bks: '92c12345'}, []); out('B-04', !b.ok, 'đối chứng: Danh mục xe chặn BKS khác cách viết'); }
// B-05
{ const api = K.create({db: {rs: {}}, trim: s => String(s == null ? '' : s).trim(), HAKDates: Dates, isCccd: s => /^\d{12}$/.test(s), numSwap: s => s, hdTenKhop: () => true,
    signerKey: r => r.cccd, keyName: s => s, todayStr: () => '18/11/2026', dateKey: s => Dates.parse(s) ? Dates.parse(s).key : 0});
  const x = (row, b) => ({_row: row, chuXe: 'CHỦ ' + row, bienSo: b, nguoiKy: 'Chủ xe', cccd: '04900000000' + row, ngaySinh: '01/01/1980', ngayCap: '01/01/2021', noiCap: 'CA', diaChi: 'x', cavet: 'x', kdDen: '01/01/2030', hanBH: '01/01/2030'});
  const t = api.checkDX({info: {maRung: 'R-A'}, dx: [x(2, '92C-12345'), x(3, '92C12345'), x(4, '92C-12345')], hdvc: null}).errs.filter(e => /trùng/.test(e));
  out('B-05', t.length === 1 && /Dòng 4/.test(t[0]), 'checkDX chỉ báo dòng 4: ' + JSON.stringify(t)); }
// B-06
{ const a = {soPhieu: 'PA 1', ngay: '05/10/2026'}, b = {soPhieu: 'PA1', ngay: '05/10/2026'}, c = {soPhieu: 'PA1', ngay: '06/10/2026'};
  out('B-06', BKS.khoaPhieu(a) === BKS.khoaPhieu(b) && BKS.khoaPhieu(b) !== BKS.khoaPhieu(c), 'khoaPhieu khác khóa nạp Excel (docphieucan.js:136: soPhieu.toUpperCase())'); }
// B-07: grep -rn phieuDaCo src ui/app | grep -v src/bks.js → 0 dòng
// B-08
{ const db = {rs: {o1: {id: 'o1', info: {ten: 'A'}, forests: {f1: {id: 'f1', info: {maRung: 'R-01'}}, f2: {id: 'f2', info: {maRung: 'R 01'}}, f3: {id: 'f3', info: {maRung: 'r-01'}}}}}};
  const g = L.duplicateGroups(db); out('B-08', g.length === 1 && g[0].lots.length === 2, '"R 01" không bị nhận là trùng "R-01"'); }
// B-09
{ const lo = (id, so) => ({id, info: {maRung: id}, doi: [{id: 'd' + id, exp: {soKT: so}}], hdvc: []});
  const db = {rs: {o: {id: 'o', forests: {fa: lo('fa', '015/2026-KT'), fb: lo('fb', '015 /2026-KT'), fc: lo('fc', '015/2026-kt')}}}};
  out('B-09', SV.trung(db, 'o', 'fa').length === 1, '"015 /2026-KT" không bị nhận là trùng'); }
// B-10
{ const tn = {id: 'dt7', ma: 'DT0007', ten: 'TRẦN VĂN BA', loai: 'thenhan', nguoi: [{id: 'ng9', hoTen: 'TRẦN VĂN BA', vaiTro: {taiXe: true}}]};
  const r1 = G.noi({dmDoiTuong: [], dmXe: [], dmViTri: []}, {doiTuong: [tn]}), r2 = G.noi(r1.dm, {doiTuong: [tn]});
  out('B-10', r2.dm.dmDoiTuong.length === 2, 'khôi phục cùng gói hai lần → 2 đối tượng'); }
```
Kết quả trên `13d82a3`: B-01, B-02, B-05, B-06, B-08, B-09, B-10 `TÁI HIỆN`; B-03, B-04 (đối chứng) chặn đúng; B-07: 0 nơi gọi.

### Kịch bản C
```js
const R = process.argv[2], req = m => require(R + '/src/' + m);
const L = req('lorung.js'), DM = req('dinhmuc.js'), PB = req('phanbo.js'), K = req('kiemtranhieudoi.js'), Dates = req('dates.js'), Doi = req('doi.js');
// C-01
const pc = [{kl: 12.3455}, {kl: 12.3455}, {kl: 0.0004}];
console.log('C-01', L.sumKl(pc), DM.tongPhieuTan(pc), PB.tinh({doi: [], pc}).tong);          // 24.691 24.692 24.692
// C-02
const nv = (i, doiId, vai) => ({_row: i, ten: 'NGƯỜI ' + i, vaiTro: vai, doiId, cccd: '0490000000' + (10 + i)});
const rec = {info: {_klPC: 30, dienTich: 2}, doi: [{id: 'd1', ten: 'Đội 1'}, {id: 'd2', ten: 'Đội 2'}], phanBo: {cheDo: 'theoPhieu'},
  nc: [nv(1, 'd1', 'Tổ trưởng'), nv(2, 'd1', 'Công nhân'), nv(3, 'd1', 'Công nhân'), nv(4, 'd2', 'Tổ trưởng')], pc: [{kl: 10}, {kl: 20}]};
const api = K.create({db: {rs: {}}, trim: s => String(s == null ? '' : s).trim(), HAKDates: Dates, HAKDoi: Doi, HAKPhanBo: PB, isTT: r => /^tổ trưởng/i.test(r.vaiTro || ''), klPhieu: DM.tongPhieuTan, isCccd: () => true, numSwap: s => s});
console.log('C-02 phanbo', PB.tinh(rec).doi.map(d => d.tan), 'doiOf', api.doiOf(rec).doi.map(d => d.khoiLuong), api.doiOf(rec).klNguon);   // [0,0] vs [22.5,7.5] songuoi
```

### Kịch bản E (hàm dài)
Phân tích cú pháp `src/*.js` và `ui/app/*.js` bằng `acorn@8.14.0` + `acorn-walk@8.3.4` (cài ngoài repo), liệt kê hàm có tên theo độ dài thân hàm, bỏ hàm bao `create` / IIFE của module.
