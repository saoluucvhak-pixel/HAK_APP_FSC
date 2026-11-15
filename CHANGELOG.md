# Nhật ký thay đổi

## Chưa phát hành — sửa năm mục (nền: main 2.2 + bốn lỗi ở mục trên)

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

## Chưa phát hành — sửa bốn lỗi (mốc tái hiện 2d2b3e2)

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
