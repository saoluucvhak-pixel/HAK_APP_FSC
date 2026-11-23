# ĐẶC TẢ: "DỮ LIỆU GOOGLE SHEETS" THEO MÃ HỢP ĐỒNG (G1)

- Người lập: `hak-spec-analyst` · Ngày: 22/11/2026 · Căn cứ: `PROMPT_V2_NANG_CAP_TRA_CUU_THEO_HOP_DONG.md` (S1–S8, T1–T26, PR-1…PR-4), `MO_PHONG_V3.html`, mã tại `/tmp/up` (= main sau PR #84).
- Phạm vi: chỉ đặc tả. Không sửa mã ứng dụng, không sửa test. Mọi dữ liệu ở mục 3 là GIẢ LẬP (CCCD dãy giả `0490000000xx`, tên "Giả Lập", mã hợp đồng `HD-GL-…`).
- Quy ước: **Đạt** = điều kiện kiểm tra được bằng test tự động hoặc quan sát có số đo; **Không đạt** = điều ngược lại. Ô ghi **[CHỜ CHỦ]** phụ thuộc câu hỏi mở ở mục 4: chưa được tự quyết, test tương ứng chưa viết cho đến khi có trả lời.

---

## 1. BẢNG YÊU CẦU R1…R64

### 1.1 Khóa hợp đồng và kiểm tra chéo (S1)

| Mã | Nguồn | Yêu cầu | Tiêu chí đạt / không đạt |
|----|-------|---------|--------------------------|
| R1 | S1 | Mã hợp đồng chuẩn hóa: bỏ khoảng trắng đầu/cuối, gộp khoảng trắng giữa, so không phân biệt hoa/thường. | Đạt: `HD-GL-0006`, ` hd-gl-0006 `, `Hd-Gl-0006` cho cùng một hợp đồng, cả ba tab gom về một mục. Không đạt: tách thành ≥ 2 hợp đồng. |
| R2 | S1, PR-2 | `build` lấy dữ liệu theo mã hợp đồng; kênh cũ `lookup:build(cccd, hd)` và `candidates(tab,row)` vẫn chạy. | Đạt: gọi chữ ký mới `build(hd)` trả đủ rừng/tọa độ/phiếu; gọi chữ ký cũ không ném lỗi và trả cùng nội dung với hợp đồng không bị lỗi dữ liệu. Không đạt: một trong hai ném lỗi hoặc khác nội dung. |
| R3 | S1 | Mã hợp đồng ở HoSoRung có ≥ 2 dòng với CCCD khác nhau → trạng thái **LỖI DỮ LIỆU**, liệt kê số dòng Sheet, không cập nhật. | Đạt: với `HD-GL-0003` danh sách ghi "Lỗi dữ liệu", modal nêu "dòng 4 và 5", mọi nút/ô tích ghi bị khóa, sau khi bấm cố ghi thì `db` không đổi (so sánh JSON trước/sau). Không đạt: có bất kỳ thay đổi nào ở hồ sơ, hoặc thông báo không nêu số dòng. |
| R4 | S1 | ≥ 2 dòng HoSoRung cùng mã hợp đồng và cùng CCCD → dùng dòng đầu, có cảnh báo (giữ hành vi cũ). | Đạt: giá trị lấy từ dòng nhỏ nhất, cảnh báo nêu số dòng đã dùng. Không đạt: lấy dòng sau hoặc không cảnh báo. |
| R5 | S1 | CCCD ở HoSoKeo/ToaDoRung khác CCCD ở HoSoRung của cùng hợp đồng → cảnh báo vàng kèm số dòng; dòng lệch mặc định KHÔNG tích. So sánh sau chuẩn hóa (bỏ hậu tố `_n`, bù số 0 đầu theo `NL.cccdTuSo`). | Đạt: `HD-GL-0004` dòng phiếu `GL4-0003` và dòng tọa độ lệch hiện cảnh báo + trạng thái "Lệch CCCD", ô tích tắt; ô vẫn tích tay được (không chặn cứng). Hai CCCD chỉ khác hậu tố `_1`, hoặc chỉ khác số 0 đầu do định dạng số, KHÔNG báo lệch. Không đạt: tích sẵn dòng lệch, hoặc báo lệch giả. |
| R6 | S1 | CCCD chủ rừng ĐÃ CÓ trong app ≠ CCCD hợp đồng trên Sheet → chặn ghi vào chủ rừng đó, nêu lý do, không tự đổi chủ. | Đạt: bấm Cập nhật → thông báo đỏ nêu hai CCCD (che giữa), `db.rs[..]` không đổi. Phạm vi chặn (chỉ phần chủ rừng hay cả rừng/phiếu của chủ đó) xem Q9. **[CHỜ CHỦ về phạm vi]** |
| R7 | S1 | Một tab không có CCCD → chỉ ghi chú "thiếu CCCD để đối chiếu". | Đạt: không cảnh báo lệch, có ghi chú, vẫn ghi được. Không đạt: coi là lệch hoặc chặn. |
| R8 | S1, S2 | Cột "chỉ để kiểm tra" (Mã KH_CCCD, Họ và tên chủ rừng, SoCCCD, HoVaTenChuRung, Mã khách hàng, ĐỊA CHỈ RỪNG ở HoSoKeo) không làm điều kiện nhận tab; khác nhau giữa các tab không chặn. Việc có GHI họ tên/CCCD vào chủ rừng mới hay không: Q2. | Đạt (phần chắc chắn): thiếu các cột này vẫn nhận tab (T6). **[CHỜ CHỦ cho phần ghi]** |

### 1.2 Cột ưu tiên và nhận tab (S2)

| Mã | Nguồn | Yêu cầu | Tiêu chí đạt / không đạt |
|----|-------|---------|--------------------------|
| R9 | S2 | Cột bắt buộc đúng bảng S2. HoSoRung: Mã hợp đồng. ToaDoRung: Số hợp đồng (Mã hợp đồng), Mã rừng, Latitude, Longitude. HoSoKeo: Mã hợp đồng, SỐ PHIẾU CÂN, Ngày nhập, một trong (KL hàng (KG), Khối lượng (Tấn)). Thiếu → lỗi nêu **tên tab + tên cột**. | Đạt: bỏ cột `Ngày nhập` khỏi HoSoKeo → lỗi chứa đúng chuỗi `HoSoKeo` và `Ngày nhập`, bản tra cứu cũ giữ nguyên. Không đạt: lỗi chung chung hoặc thiếu tên tab/cột. Tên cột tọa độ thật là `Latitude_Vĩ độ` / `Longtitude_Kinh độ` (có lỗi chính tả "Longtitude"): xem Q11. |
| R10 | S2 | Thiếu cột ưu tiên → ghi chú "không có cột X nên bỏ qua", không lỗi. | Đạt: bỏ cột `HECTA` → tải thành công, ghi chú nêu cột, trường dự kiến báo "thiếu hecta". Không đạt: tải lỗi. |
| R11 | S2 | Tương thích ngược: Sheet cũ (tab `_QC`, đủ cột cũ) vẫn đọc đúng. | Đạt: kết quả `build` của bộ dữ liệu cũ (mục 3.7) trùng tệp chuẩn ghi từ v3.2.0, từng trường. Ngoại lệ phải nêu rõ: xem Q4. |
| R12 | S2 | Nhận tab theo tên (chuẩn, `_QC`, khác hoa/thường/dấu/gạch) và theo cột; bỏ bước hỏi vai trò khi mỗi vai trò có đúng MỘT tab hợp lệ; chỉ hỏi khi mơ hồ thật. | Đạt: tab tên khác hẳn nhưng chỉ một tab hợp lệ cho vai trò → nhận luôn, `pending` rỗng, có ghi chú. Hai tab cùng hợp lệ cho một vai trò → còn hỏi. Không đạt: còn hỏi khi không mơ hồ, hoặc tự chọn khi mơ hồ. |
| R13 | S2 | Một tab không giữ hai vai trò (hành vi sẵn có) vẫn đúng với bộ cột bắt buộc mới (rất ngắn). | Đạt: tab chỉ có cột `Mã hợp đồng` + `Ngày nhập` + `SỐ PHIẾU CÂN` + KL không bị nhận làm HoSoRung. Không đạt: một tab được nhận cho cả HoSoKeo lẫn HoSoRung. Liên quan Q3. |
| R14 | S2 | Mẫu Excel (`buildTemplate`) và HUONG_DAN trong mẫu phản ánh nhóm bắt buộc / ưu tiên / chỉ kiểm tra. | Đạt: ba tab chuẩn đều mở được, trang HUONG_DAN liệt kê 3 nhóm cột cho từng tab. Không đạt: còn ghi "cột bắt buộc" cũ. |

### 1.3 Màn "Dữ liệu Google Sheets" (S3, S6, S4)

| Mã | Nguồn | Yêu cầu | Tiêu chí đạt / không đạt |
|----|-------|---------|--------------------------|
| R15 | S3.1 | Đổi tên trang thành "Dữ liệu Google Sheets" (menu, tiêu đề, breadcrumb, thông báo, tài liệu); id nội bộ giữ nguyên hoặc ánh xạ có test. | Đạt: tìm chuỗi `Tra cứu` trong `ui/app.src.html`, `ui/app/17-*`, `docs/` chỉ còn ở lịch sử CHANGELOG; bộ lọc đã lưu trước nâng cấp vẫn nạp được. Không đạt: còn chuỗi cũ ở giao diện, hoặc bộ lọc đã lưu mất. |
| R16 | S6.1 | Màn đầu = bảng TOÀN BỘ hợp đồng (cả màn, không ngăn chi tiết): mã hợp đồng, chủ rừng, CCCD, ngày ký, số rừng, số phiếu, tổng tấn, trạng thái; tìm không dấu; lọc trạng thái; phân trang; bấm dòng hoặc Enter để mở. | Đạt: bộ dữ liệu mục 3 hiện đủ mọi `HD-GL-…`; số dòng bằng số mã hợp đồng khác nhau (sau chuẩn hóa) trên cả ba tab; gõ `gia lap tam` ra đúng hợp đồng của "Vũ Thị Giả Tám"; Enter trên dòng đang focus mở modal. Không đạt: thiếu hợp đồng chỉ có ở một tab, hoặc tìm có dấu/không dấu cho kết quả khác nhau. |
| R17 | S6.1, S3.2 | Trạng thái hợp đồng tính theo quy tắc xác định (mâu thuẫn nhãn S3 và S6: Q8). | Đạt: mỗi hợp đồng mục 3 có đúng một trạng thái theo bảng 3.8. **[CHỜ CHỦ về bộ nhãn]** |
| R18 | S6.2 | Bấm hợp đồng → MODAL: `role="dialog"`, `aria-modal="true"`, có tên truy cập, Esc đóng, trả focus về đúng dòng đã bấm, giữ focus trong modal (Tab/Shift+Tab). | Đạt: kiểm bằng e2e: sau Esc, `document.activeElement` là dòng đã bấm; Tab 30 lần không rời modal. Không đạt: focus rơi ra ngoài hoặc về `body`. |
| R19 | S6.2 | Cha (cột trái): danh sách rừng theo thứ tự nhập; mỗi rừng có huy hiệu số thay đổi đang chọn và thanh đã dùng/dự kiến. | Đạt: sửa tích ở rừng 1 → huy hiệu rừng 1 đổi ngay, rừng 2 không đổi; thanh có `aria-valuenow/max`. Không đạt: huy hiệu lệch với số thực sẽ ghi. |
| R20 | S6.2 | Con: ba thẻ **Hồ sơ rừng, Tọa độ, Phiếu cân** của rừng đang chọn; đóng/mở modal hay đổi thẻ không mất lựa chọn. | Đạt: xem R31. Không đạt: lựa chọn bị đặt lại. |
| R21 | S3.3, S5 | Thẻ Hồ sơ rừng: bảng *Trong hồ sơ ↔ Trên Sheet* từng trường, ô tích riêng; trường đã sửa tay hoặc khác giá trị mặc định KHÔNG tích sẵn; có nút Hiện/Ẩn các trường giống nhau (mặc định ẩn). | Đạt: trường `_tay` (sửa tay) có Sheet khác → ô không tích; trường trống ở hồ sơ, có ở Sheet → tích sẵn; trường giống → ẩn, đếm "N trường giống nhau". Không đạt: tích sẵn trường sửa tay. |
| R22 | S3.3 | Thẻ Tọa độ: danh sách điểm có tích; thiếu/ngoài miền lat-lng (lat 8–24, lng 102–110) hoặc nghi nhầm cột → cảnh báo, không tích sẵn. | Đạt: điểm đảo cột (`108.2`, `15.6`) hiện "có thể nhầm cột vĩ độ/kinh độ", ô tắt; điểm dạng độ-phút-giây hợp lệ được đổi và ghi nhãn "đã quy đổi". |
| R23 | S3.3, S5 | Thẻ Phiếu cân thuộc HỢP ĐỒNG (không thuộc từng rừng): trạng thái *mới / đổi / trùng / nghi đổi số / lệch CCCD* (và các trạng thái sẵn có *lỗi khối lượng/ngày*, *cần ghép tên xe*: Q13); tích sẵn chỉ "mới"; lọc theo trạng thái; phân trang; giữ các bộ lọc/cảnh báo hiện có. | Đạt: `GL4-0003` (lệch CCCD) không tích; phiếu "trùng" có ô tích khóa; lọc "Mới" chỉ còn phiếu mới; trang 2 của 300 phiếu hiển thị trong ≤ 200 ms. |
| R24 | S3.3, S5 | Mỗi khối có "Chọn tất cả / Bỏ chọn" và công tắc "Cập nhật khối này"; nút "Chọn phần mới cho cả hợp đồng" và "Bỏ chọn tất cả". | Đạt: công tắc tắt → khối đó bị bỏ qua dù còn ô tích; "Chọn phần mới" chỉ tích mục *mới* và trường trống, không tích *lệch CCCD*, *nghi đổi số*, trường sửa tay. |
| R25 | S3.4 | Đích ghi: ánh xạ `Mã rừng` ↔ lô theo `info.maRung`; chưa có lô → đề xuất "tạo lô mới" (có xác nhận) qua đường tạo lô sẵn có (mã rừng chưa bị lô khác dùng). | Đạt: rừng `R-GL02-02` chưa có lô → hiện hộp xác nhận; đồng ý → lô mới có `info.maRung = R-GL02-02`; từ chối → không tạo gì. Mã rừng đã dùng ở chủ rừng khác → báo lỗi, không ghi. |
| R26 | S3.5, S6.3 | "Cập nhật vào hồ sơ" ghi qua `lkApply` (cùng kiểm tra trùng, khóa hồ sơ, dedupe phiếu); không có đường ghi mới; sau ghi hiện tóm tắt *đã thêm / đã đổi / bỏ qua* từng khối từng rừng. | Đạt: tìm trong mã chỉ có MỘT nơi ghi `db.rs`; tóm tắt số liệu khớp `diff` thực của bản nháp. Không đạt: có đường ghi song song. |
| R27 | S3.5 | Ghi vào bản nháp lô (stage) như hiện nay; chỉ thành dữ liệu lô khi "Lưu dữ liệu vào lô"; thông báo nói rõ điều này (Q12). | Đạt: sau Cập nhật, `stage.dirty` đúng; `f.pc` chưa đổi đến khi lưu. |
| R28 | S3.6 | Trạng thái trống/lỗi bằng tiếng Việt, không nuốt lỗi: chưa có Sheet; Sheet rỗng; hợp đồng không tìm thấy; không có mạng; tải lỗi (giữ bản cũ). | Đạt: mỗi tình huống có một thông báo riêng, có chữ "đồng bộ lúc …" khi có bản cũ; dữ liệu cũ nguyên vẹn (T11). |
| R29 | S3.7 | Giữ tìm kiếm không dấu và bộ lọc thông minh hiện có (`parseQuery`: `cccd:`, `hd:`, `phieu:`, `bien:`, `-từ`, "cụm"); bàn phím Tab/Enter/Esc; nhãn truy cập; dùng được ở 1024 px. | Đạt: các truy vấn cũ cho cùng tập hợp đồng/hàng như trước (hồi quy so với v3.2.0); không cần cuộn ngang ở 1024×768. |
| R30 | S6.2 | Chân modal cố định: tóm tắt số lượng đã chọn theo từng rừng; nút *Chọn phần mới*, *Đóng*, *Cập nhật vào hồ sơ* luôn nhìn thấy dù hợp đồng 300 phiếu, ở 1024×768. | Đạt: ở 300 phiếu, bounding box nút nằm trong khung nhìn khi cuộn thẻ Phiếu cân xuống cuối. |
| R31 | S5 | Trạng thái chọn theo từng rừng giữ nguyên khi chuyển rừng/thẻ; mở lại hợp đồng trong cùng phiên không giữ lựa chọn cũ nếu dữ liệu Sheet đã tải mới (quy tắc: Q14). | Đạt: chọn A ở rừng 1, sang rừng 2, quay lại → A vẫn chọn. |
| R32 | S1, T8, T9 | Idempotent và không ghi đè trường đã sửa tay (mặc định đã chốt). | Đạt: cập nhật hai lần liên tiếp → lần 2 báo "đã thêm 0" cho phiếu/tọa độ, tổng tấn và số điểm không đổi; trường `_tay` không bị ghi nếu không tích, và nếu tích thì ghi nhận có chủ ý. |
| R33 | S3.5, T10 | Lô bị khóa/chốt/dừng (`loKhoa`) → chặn ghi, thông báo đúng, không ghi phần nào của lô đó. | Đạt: không còn dữ liệu nào đổi (kể cả chủ rừng) khi lô đích khóa; thông báo nêu mã rừng và lý do. |
| R34 | S4 | Khi ghi, lưu `info.nguon = {hd, maRung, at}` cho lô; không thêm CCCD nếu không cần; dữ liệu cũ không có `nguon` mở bình thường. | Đạt: lô sau cập nhật có `info.nguon` đúng 3 khóa; lô tạo trước nâng cấp mở không lỗi. |
| R35 | S4 | `f.ref{hd,cccd}` giữ nguyên khi tích "Lưu phần tham chiếu"; nội dung `ref` sau khi thu hẹp cột (Q5). | Đạt: bật/tắt ô → có/không có `f.ref`, khóa `hd`, `cccd` còn nguyên. |
| R36 | S3.3 | Ánh xạ hợp đồng ↔ chủ rừng trong app xác định được (theo `info.soHopDong`, `info.nguon.hd`, `f.ref.hd`, CCCD) và nêu rõ khi tìm thấy ≥ 2 chủ rừng. | Đạt: **[CHỜ CHỦ: Q7]** — chưa viết tiêu chí số đo. |

### 1.4 Phân bổ phiếu cân vào rừng (S5)

| Mã | Nguồn | Yêu cầu | Tiêu chí đạt / không đạt |
|----|-------|---------|--------------------------|
| R37 | S5 (đầu) | Hàm thuần `phanBoPhieu(phieu[], rungs[], dungSai)` trong `src/`, có unit test, KHÔNG đổi đầu vào, KHÔNG phụ thuộc DOM/DB. Tên tệp: `src/phanbo.js` đã tồn tại (phân bổ nhân công, `HAKPhanBo`), phải dùng tên khác (Q1). | Đạt: gọi hai lần cùng đầu vào cho cùng đầu ra (so `deepEqual`); đầu vào bị đóng băng (`Object.freeze` sâu) không ném lỗi. |
| R38 | S5.1 | Phiếu theo mã hợp đồng; phiếu *trùng* không phân bổ lại, giữ lô hiện có. | Đạt: phiếu `GL2-0001` đã ở lô rừng 1 → kết quả không có bản ghi phân bổ mới cho nó. |
| R39 | S5.2 | Hợp đồng 1 rừng → mọi phiếu (trừ trùng/lệch CCCD) vào rừng đó; ô "Vào rừng" khóa. | Đạt: `HD-GL-0001` ba phiếu cùng vào `R-GL01-01`, `<select>` có `disabled`. (Rừng thiếu hecta: Q6.) |
| R40 | S5.3 | Nhiều rừng: xếp phiếu theo ngày cân tăng, rồi số phiếu; rừng hiện tại nhận phiếu chừng nào `tích lũy + phiếu ≤ dự kiến × (1+dung sai)`; vượt thì sang rừng sau, tích lũy về 0; rừng cuối nhận phần dư. Thứ tự rừng = thứ tự nhập (lô đã có theo thứ tự tạo; chưa có lô theo thứ tự `Mã rừng` trên Sheet). | Đạt: bộ `HD-GL-0002` ra đúng bảng 3.2: phiếu 1–3 vào rừng 1 (61,60 t), phiếu 4–9 vào rừng 2 (124,00 t). Dữ liệu Sheet xáo trộn thứ tự dòng cho cùng kết quả. |
| R41 | S5.3 | Rừng cuối vượt dự kiến → cảnh báo đỏ "Vượt dự kiến X tấn", không chặn. Mốc tính X: Q10. | Đạt: `HD-GL-0002` rừng 2 hiện cảnh báo đỏ; vẫn bấm Cập nhật được. **[CHỜ CHỦ về mốc X]** |
| R42 | S5.4 | Sản lượng dự kiến = hecta × định mức tấn/ha (HoSoRung; thiếu thì dùng định mức mặc định/hiệu lực theo ngày của app). Thiếu hecta hoặc định mức → báo rõ, rừng đó không tự nhận phiếu, vẫn phân bổ tay được. Nguồn hecta TỪNG RỪNG khi `HECTA` là của cả hợp đồng: Q5b. | Đạt: `HD-GL-0008` rừng thiếu hecta không có phiếu tự phân bổ, thông báo nêu rừng và thiếu gì; chọn tay → ghi được. **[CHỜ CHỦ cho nguồn hecta mỗi rừng]** |
| R43 | S5.5 | Dung sai mặc định 5 %, chỉnh 0–30 %; một phiếu không bao giờ bị chia đôi. | Đạt: nhập 31 hoặc −1 → bị chặn/kẹp và báo; mọi phiếu ra đúng một mã rừng hoặc "chưa phân bổ". |
| R44 | S5.6 | Phiếu lệch CCCD không phân bổ, không tích sẵn. | Đạt: `GL4-0003` ở trạng thái "chưa phân bổ" và tắt, kể cả khi bấm Phân bổ tự động. |
| R45 | S5.7 | Phiếu đã lưu trong lô cộng vào "đã dùng" của rừng khi tính phần còn lại. | Đạt: biến thể 3.2b: lô có sẵn 23,5 t → phiếu 3 vẫn vào rừng 1 (64,60 ≤ 64,8375); lô có sẵn 24,5 t → phiếu 3 sang rừng 2. |
| R46 | S5 | Nút: *Phân bổ tự động* (tính lại cả hợp đồng), *Phân bổ phiếu còn lại vào rừng N*, *Xóa phân bổ*, ô "Vào rừng" từng phiếu (ghi đè tay, có "Chưa phân bổ"). | Đạt: sau đổi tay phiếu 2 → rừng 2 rồi bấm Phân bổ tự động, kết quả trở lại bảng 3.2 (ghi đè tay bị tính lại, có hỏi xác nhận nếu mất đổi tay: Q15). |
| R47 | S5 | Phiếu "chưa phân bổ" KHÔNG được ghi; hiện cảnh báo số lượng. | Đạt: ở hợp đồng 2 rừng chưa bấm phân bổ, "Cập nhật" không thêm phiếu nào và nêu số phiếu bị bỏ. |
| R48 | S5 | Thanh đo từng rừng: đã dùng/dự kiến: xanh dưới 90 %, vàng từ 90 % đến hết dự kiến, đỏ khi vượt dự kiến; có chữ, không chỉ màu. | Đạt: ba mức hiện đúng ở dữ liệu 3.2 và 3.7; có văn bản thay thế (`aria-label`). Ngưỡng đỏ là dự kiến hay dự kiến + dung sai: Q10. |

### 1.5 Nhập thủ công chủ rừng ↔ Sheets (S7)

| Mã | Nguồn | Yêu cầu | Tiêu chí đạt / không đạt |
|----|-------|---------|--------------------------|
| R49 | S7 | Hai nút ở màn Thêm/Sửa chủ rừng chỉ sáng khi đã có CCCD hợp lệ (9 hoặc 12 số) VÀ số hợp đồng; thiếu → khóa kèm lý do hiển thị (không chỉ tooltip). | Đạt: bốn tổ hợp (thiếu CCCD / thiếu hợp đồng / thiếu cả hai / đủ) cho đúng 3 trạng thái khóa và 1 sáng; `aria-disabled` và dòng lý do. CCCD sai định dạng được coi là "chưa đủ" hay vẫn sáng: Q16. |
| R50 | S7.1 | "Mở dữ liệu Google Sheets": chuyển sang màn S6, tự tìm theo mã hợp đồng (chuẩn hóa R1) và mở modal; không có → báo "không tìm thấy", KHÔNG mở modal trống; hợp đồng lỗi dữ liệu → mở modal ở chế độ khóa ghi. | Đạt: `hd-gl-0002 ` (thừa khoảng trắng, chữ thường) mở modal của `HD-GL-0002`; `HD-KHONG-CO` ra thông báo, không có `role=dialog` nào. |
| R51 | S7.2 | "Đối chiếu": không ghi gì; bảng *Mục / Đã nhập / Trên Sheet / Kết luận* cho: họ tên (không dấu), CCCD, ngày ký, số rừng, tổng tấn phiếu cân; ≥ 1 lệch → cảnh báo vàng "N chênh lệch" và tô nền dòng lệch; khớp → thông báo xanh. | Đạt: nhập sai ngày ký và tên → "2 chênh lệch", đúng 2 dòng được tô; sau khi bấm `JSON.stringify(db)` không đổi. Họ tên chỉ khác dấu/hoa thường KHÔNG tính lệch. |
| R52 | S7.2 | Hợp đồng không có trên Sheet → lỗi đỏ có "đã đồng bộ lúc …"; hợp đồng lỗi dữ liệu → nêu lỗi, không so tiếp; cuối bảng có nút "Mở hợp đồng … để xem và cập nhật". | Đạt: đủ ba nhánh (không có / lỗi / có), mỗi nhánh một thông báo riêng. Chưa có Sheet nào được tải: nhánh thứ tư, Q17. |
| R53 | S7 | "Đối chiếu" cũng có ở hồ sơ rừng đã lưu: so số rừng, tổng tấn, số phiếu, từng trường rừng. Nguồn "số rừng/tổng tấn trong hồ sơ" của chủ rừng nhập tay: Q7. | Đạt: **[CHỜ CHỦ: Q7]** cho phần số rừng và tổng tấn; các trường rừng so theo `info` của lô. |
| R54 | S7.2 | Đối chiếu là cảnh báo, không chặn lưu. | Đạt: dù có 5 chênh lệch, nút Lưu chủ rừng vẫn thao tác và lưu được. |

### 1.6 Đổi số phiếu cân (S8)

| Mã | Nguồn | Yêu cầu | Tiêu chí đạt / không đạt |
|----|-------|---------|--------------------------|
| R55 | S8 | Hàm thuần `phatHienDoiSo(phieuSheet[], phieuLo[])`: phiếu Sheet không khớp khóa (số + ngày) nhưng cùng ngày + cùng BKS chuẩn hóa (`HAKBks.khoa`) + khối lượng lệch ≤ 1 kg với một phiếu của lô → "Nghi đổi số", mặc định không ghi. Một phiếu của lô đã được khớp khóa bởi phiếu Sheet khác không được coi là ứng viên (Q18). | Đạt: bảng 3.5: cặp A, B được đánh dấu; cặp C (lệch 2 kg) là "mới"; cặp D (0402) là "mới", không bị nhận nhầm. Hàm thuần như R37. |
| R56 | S8 | Phiếu nghi hiển thị cặp (số cũ → số Sheet) và hai nút: "Đổi số … → … (giữ nguyên phiếu)" (giữ `_id`, lô, khối lượng; thêm `soCu[]`, nguồn, thời điểm vào nhật ký lô) và "Là chuyến khác (thêm mới)" (đưa vào phân bổ S5). | Đạt: sau "Đổi số", `_id` không đổi, số phiếu hiện hành là số mới, `soCu` chứa số cũ, tổng tấn lô không đổi. Sau "Là chuyến khác", tổng tấn tăng đúng một phiếu và phiếu đi qua R40. Không đạt: tổng tấn cộng đôi. |
| R57 | S8 | Thao tác "Đổi số phiếu" riêng ở bảng phiếu cân (thay cho sửa ô tự do): bắt nhập lý do; kiểm khóa số+ngày không trùng trong lô; cảnh báo trùng với lô khác; chặn khi lô đã chốt/khóa; ghi nhật ký. | Đạt: lý do trống → không cho đổi; số mới trùng `(số, ngày)` trong lô → chặn; trùng ở lô khác → cảnh báo nhưng cho đổi; lô chốt → chặn; mỗi lần đổi thêm một mục nhật ký (số cũ, số mới, lý do, thời điểm). Ô Số phiếu không còn sửa trực tiếp được (Q19). |
| R58 | S8 | Lần tải Sheet sau nhận ra `soCu`: phiếu mang số cũ trên Sheet được coi là đã có (không thêm lại), có ghi chú. | Đạt: bộ 3.5 "lần tải 2" → dòng `GL5-0101` hiện "đã có (số cũ của GL5-0102)", không tích, tổng tấn không đổi. |
| R59 | S8 | Báo cáo/sổ phiếu cân hiển thị số hiện hành; tra cứu theo số cũ vẫn ra phiếu. Phạm vi "tra cứu" (tìm trong app hay tìm trong dữ liệu Sheet): Q20. | Đạt: sổ in có số mới; gõ số cũ vào ô tìm kiếm ra đúng phiếu. **[CHỜ CHỦ về phạm vi]** |

### 1.7 Yêu cầu chung (quy tắc cứng, an toàn, hiệu năng)

| Mã | Nguồn | Yêu cầu | Tiêu chí đạt / không đạt |
|----|-------|---------|--------------------------|
| R60 | Quy tắc 6, T13 | Không đổi công thức nghiệp vụ; `scripts/so-ban-in.js` phải 206/206 giống nhau; e2e lookup hiện có không có suite đỏ mới. | Đạt: chạy `node scripts/so-ban-in.js` trả 206/206; so với `main` suite đỏ sẵn có giống hệt. |
| R61 | Quy tắc 7 | Sau sửa `ui/app/*.js`: `env -u NODE_OPTIONS npm run build:html` và cam kết `renderer/index.html`. | Đạt: dựng lại không sinh khác biệt (`git diff --exit-code renderer/index.html`). |
| R62 | PR-1…4 | Kênh IPC mới/đổi: whitelist ở `preload.js`, kiểm kiểu tham số ở `main.js`, có test; URL Sheet chỉ `https`; mọi chuỗi từ Sheet đi vào HTML đều qua `esc()`. | Đạt: kênh ngoài whitelist bị từ chối; tham số sai kiểu (`hd` là số, mảng, chuỗi > 200 ký tự) trả lỗi; giá trị `<img onerror=…>` ở ô tên/địa chỉ hiển thị dạng chữ. |
| R63 | S6 | Hiệu năng danh sách toàn bộ hợp đồng: mức chấp nhận đề xuất (CHỦ xác nhận con số, Q21): 2.000 hợp đồng / 20.000 phiếu → mở màn ≤ 1,5 s, lọc/tìm ≤ 300 ms, mở modal hợp đồng 300 phiếu ≤ 500 ms; chỉ nạp một lần truy vấn tổng hợp, không gọi `build` từng hợp đồng. | Đạt: đo bằng bộ dữ liệu sinh ngẫu nhiên giả lập trên máy chuẩn của CI. Không đạt: vượt ngưỡng. |
| R64 | Quy tắc 2 | Không dữ liệu thật hoặc bí mật trong mã, test, tài liệu, PR, log, ảnh chụp. CCCD ở log/thông báo lỗi nên che giữa. | Đạt: quét `diff` không có chuỗi 9 hoặc 12 chữ số ngoài dãy giả `0490000000xx`/`049000000099`; thông báo ví dụ dùng CCCD đã che (`049…011`). |

Tổng số yêu cầu: **64** (R1–R64).

---

## 2. MA TRẬN CA KIỂM THỬ

### 2.1 T1–T26 (của prompt) → yêu cầu

Cột "Dữ liệu": mã hợp đồng ở mục 3. "Mức": U = unit (hàm thuần), I = tích hợp (Lookup + SQLite thật, không giao diện), E = e2e giao diện.

| T | Nội dung (rút gọn) | Yêu cầu | Dữ liệu | Mức | Ghi chú đo được / thiếu sót của đề bài |
|---|--------------------|---------|---------|-----|---------------------------------------|
| T1 | 1 hợp đồng – 1 rừng – 3 phiếu → đủ ba khối | R2, R16, R20–R23, R26, R34, R39 | HD-GL-0001 | I+E | Kỳ vọng: 3 điểm tọa độ, 3 phiếu, tổng 61,600 t, mọi phiếu vào `R-GL01-01`. |
| T2 | Hợp đồng 2 rừng: rừng 1 đủ ba khối, rừng 2 chỉ tọa độ, không lẫn | R19–R21, R25, R26, R31 | HD-GL-0002 | I+E | "Rừng 2 chỉ tọa độ" ⇒ phiếu rừng 2 phải "chưa chọn", không bị kéo sang rừng 1. Cần kiểm cả hai chiều (lô 1 không nhận tọa độ rừng 2 và ngược lại). |
| T3 | Mã hợp đồng trùng hai CCCD → LỖI DỮ LIỆU, không ghi | R3 | HD-GL-0003 | I+E | Thêm: danh sách vẫn hiện hợp đồng (trạng thái lỗi), không biến mất (E3). |
| T4 | CCCD HoSoKeo lệch HoSoRung → cảnh báo, không tích sẵn | R5, R23 | HD-GL-0004 | I+E | Đề bài chỉ nêu HoSoKeo; bổ sung nhánh ToaDoRung (R5 nêu cả hai tab). |
| T5 | CCCD chủ rừng trong app ≠ Sheet → chặn ghi chủ rừng | R6 | HD-GL-0001 + chủ rừng app CCCD `049000000099` | I | Phạm vi chặn: Q9. |
| T6 | Thiếu cột trùng vẫn nhận; thiếu cột bắt buộc → lỗi đúng tên cột | R8, R9, R10 | HD-GL-0001 biến thể 3.9 | I | Lặp cho từng tab (3 tab × 1 cột bắt buộc + 1 cột chỉ-kiểm-tra). |
| T7 | Sheet cũ đủ cột → giống đầu ra v3.2.0 | R11 | HD-GL-0006 (bộ cũ 3.7) | I (golden) | Cần tệp chuẩn ghi bằng chạy v3.2.0 trước khi sửa mã. Mâu thuẫn với S1/S2: Q4, Q5. |
| T8 | Cập nhật hai lần → không nhân đôi | R32, R26 | HD-GL-0001, 0002 | I+E | Đo: số phiếu, số điểm tọa độ, `giayTo`, tổng tấn sau lần 1 = sau lần 2. |
| T9 | Trường sửa tay không bị ghi đè khi không tích | R21, R32 | HD-GL-0001 (lô có `_tay` ở `diaDiem`) | I | Thêm ca "tích tay → ghi đè, bỏ khỏi `_tay`?" (Q22). |
| T10 | Lô bị khóa → chặn ghi | R33 | HD-GL-0001 (lô đã chốt) | I+E | Kiểm cả chế độ `fill` (đích đã chọn) và `new`. |
| T11 | Sheet rỗng / mất mạng / hợp đồng không có → thông báo rõ, dữ liệu cũ nguyên | R28, R50, R52 | (không) | I+E | Bốn nhánh: chưa có Sheet, tab rỗng, offline, hợp đồng không tồn tại. |
| T12 | 1024×768: ngăn chi tiết không che nút, bàn phím đủ | R18, R29, R30 | HD-GL-0002 | E | "Ngăn chi tiết" lỗi thời sau S6: đề nghị chuyển thành "modal ở 1024×768 không che nút, Tab/Enter/Esc đủ". Q8b. |
| T13 | Hồi quy: e2e lookup hiện có, so-ban-in 206/206 | R60, R61 | (bộ có sẵn) | E | |
| T14 | Phân bổ 2 rừng: 9 phiếu, rừng 1 dự kiến 61,75 t, dung sai 5 % | R40, R41, R45, R48 | HD-GL-0002 | U+E | Đề bài viết "phiếu vào rừng 1 đến hết" và rừng 2 vượt: kết quả bảng 3.2; X = 71,75 t (so dự kiến) hoặc 69,14 t (so ngưỡng dung sai): Q10. |
| T15 | 1 rừng → mọi phiếu vào đó, ô chọn khóa | R39 | HD-GL-0001 | U+E | |
| T16 | Phiếu trùng không phân bổ lại; phiếu trong lô tính vào "đã dùng" | R38, R45 | HD-GL-0002 + lô có sẵn (3.2b) | U | Hai biến thể 23,5 t và 24,5 t. |
| T17 | Thiếu hecta/định mức → báo, không tự phân bổ; tay vẫn ghi | R42 | HD-GL-0008 | U+E | Thêm: thiếu định mức riêng, thiếu hecta riêng, và rừng cuối thiếu hecta (E11). |
| T18 | Đổi tay phiếu sang rừng khác rồi Phân bổ tự động → tính lại; "chưa phân bổ" không ghi | R46, R47 | HD-GL-0002 | U+E | Q15 (có hỏi xác nhận khi mất đổi tay). |
| T19 | Dung sai 0 % và 30 %: ranh giới (vừa đúng bằng dự kiến vẫn vào) | R40, R43 | HD-GL-0007, HD-GL-0002 | U | HD-GL-0007: tích lũy 40,000 = dự kiến 40,000 ở dung sai 0 % → phiếu thứ hai vào rừng 1. Thêm sai số dấu phẩy động (E9). |
| T20 | 300 phiếu: phân trang/lọc, nút cập nhật cố định ở 1024×768 | R23, R30, R63 | sinh theo quy tắc 3.10 | E | |
| T21 | Màn đầu toàn bộ hợp đồng; modal Cha–Con; Esc trả focus; ≤ 820 px Cha trên Con | R16, R18, R19, R20 | tất cả | E | Thêm kiểm chiều cao Cha ≤ 150 px ở 820 px. |
| T22 | Thêm chủ rừng: thiếu CCCD hoặc hợp đồng → hai nút khóa kèm lý do; đủ → sáng | R49 | (không) | E | Q16 về CCCD sai định dạng. |
| T23 | Đối chiếu: khớp xanh; lệch tên/CCCD/ngày/số rừng/tổng tấn → đúng N, không ghi; không có / lỗi → báo đúng | R51, R52, R54 | HD-GL-0002, 0003 | I+E | Q7 cho nguồn số rừng và tổng tấn. |
| T24 | "Mở dữ liệu Google Sheets" → tự tìm đúng hợp đồng, mở modal | R50 | HD-GL-0002 | E | |
| T25 | Nghi đổi số; "Đổi số theo Sheet" giữ `_id` + nhật ký; "Là chuyến khác" thêm; tổng tấn không cộng đôi | R55, R56 | HD-GL-0005 | U+I+E | |
| T26 | Đổi số thủ công: trùng bị chặn; lô chốt bị chặn; nhật ký; tải sau không thêm lại số cũ | R57, R58, R59 | HD-GL-0005 lần 2 | I+E | |

### 2.2 Ca biên bổ sung (đề bài còn thiếu)

| Mã | Ca | Yêu cầu | Dữ liệu | Kết quả kỳ vọng |
|----|----|---------|---------|-----------------|
| E1 | Mã hợp đồng khác hoa/thường/khoảng trắng giữa ba tab | R1, R16 | HD-GL-0006 (cũ) | Một hợp đồng duy nhất, đủ ba tab. |
| E2 | Mã hợp đồng trống ở một dòng | R1, R9 | HoSoKeo dòng trống mã | Dòng bị bỏ qua có thống kê "N dòng không có mã hợp đồng", không làm hỏng cả bản. |
| E3 | Hợp đồng lỗi dữ liệu vẫn xuất hiện trong danh sách và vẫn tìm được | R3, R16 | HD-GL-0003 | Trạng thái "Lỗi dữ liệu", không ẩn. |
| E4 | Hợp đồng chỉ có ở HoSoKeo (không HoSoRung) | R16, R17, R26 | HD-GL-0009 | Có trong danh sách, thiếu chủ rừng/ngày ký; ghi hay không: Q23. |
| E5 | Hợp đồng chỉ có ở ToaDoRung | R16, R17 | (biến thể) | Như E4. |
| E6 | Cùng hợp đồng 2 dòng HoSoRung cùng CCCD | R4 | biến thể HD-GL-0001 | Dùng dòng nhỏ hơn + cảnh báo. |
| E7 | CCCD 9 số (CMND) ở HoSoRung và 12 số ở HoSoKeo của cùng người | R5 | biến thể HD-GL-0004 | Q24: lệch hay không (hai định danh khác nhau về số học). |
| E8 | CCCD mất số 0 đầu do ô số (`49000000011`) | R5 | biến thể | Bù số 0 theo `cccdTuSo`, không báo lệch. |
| E9 | Dự kiến × (1+dung sai) tính bằng số thực: 40,000 và tích lũy 20,000+20,000 | R40 | HD-GL-0007 | Vào rừng 1 (dùng dung sai 1e-9 hoặc làm tròn kg). |
| E10 | Một phiếu lớn hơn cả ngưỡng của rừng giữa (rừng trống) | R40 | HD-GL-0007 biến thể (phiếu 70 t) | Bỏ qua rừng đó hay nhận phiếu: Q10b. |
| E11 | Rừng cuối thiếu hecta; hợp đồng 1 rừng thiếu hecta | R39, R42 | HD-GL-0008 | Mâu thuẫn R39 ↔ R42: Q6. |
| E12 | Hai phiếu cùng ngày, cùng số phiếu khác nhau về số cuối ("GL2-0010" và "GL2-0002") | R40 | HD-GL-0002 biến thể | Sắp theo số phiếu: chữ hay số tự nhiên: Q10c. |
| E13 | Nghi đổi số: phiếu của lô đã được khớp khóa bởi phiếu Sheet khác | R55 | HD-GL-0005 (0401/0402) | 0402 = mới, không phải nghi. |
| E14 | Nghi đổi số: cùng ngày, cùng BKS, hai phiếu khớp ≥ 2 ứng viên | R55 | biến thể | Không chọn ngẫu nhiên: đánh dấu "nhiều ứng viên", mặc định không ghi, người dùng chọn (Q18). |
| E15 | Nghi đổi số khi BKS Sheet là tên xe (không phải biển) hoặc trống | R55 | biến thể | Không phát hiện, giữ "mới" + ghi chú (Q13). |
| E16 | Khối lượng lệch đúng 1 kg và 2 kg (và KG có phần thập phân) | R55 | HD-GL-0005 | 1 kg → nghi; 2 kg → không. Làm tròn theo kg như `klKg`. |
| E17 | Đổi số xong, Sheet đổi theo sang số mới | R58 | HD-GL-0005 lần 3 | Khớp khóa số mới → "trùng", `soCu` giữ nguyên. |
| E18 | Đổi số xong, rồi có phiếu thật dùng lại số cũ cùng ngày | R57, R58 | biến thể | Không bị nuốt: cảnh báo "trùng số cũ", cho người dùng chọn (Q25). |
| E19 | Đổi số cho phiếu đã được in/đưa vào báo cáo đã xuất | R57 | (E2E) | Cảnh báo "số liệu đã in": Q26. |
| E20 | Cập nhật khi chủ rừng chưa có trong app (tạo mới) | R6, R26, R36 | HD-GL-0002 | Tạo chủ rừng + 2 lô; tên/CCCD lấy từ đâu: Q2. |
| E21 | Mã rừng Sheet trùng `info.maRung` của lô thuộc chủ rừng khác | R25 | biến thể | Chặn, báo lỗi, không ghi. |
| E22 | Hợp đồng không có tọa độ (rừng "chưa có mã") | R19, R25 | HD-GL-0009 hoặc biến thể | Một rừng "chưa có mã", mã tự sinh theo quy tắc cũ (`CCCD-R1`) cần được xem lại khi khóa là hợp đồng. |
| E23 | Phiếu có Ngày nhập không có thật (31/02/2026) hoặc khối lượng ≤ 0 | R23 | biến thể | Trạng thái "lỗi", không tích, không phân bổ. |
| E24 | Tab tên khác hẳn, chỉ một tab đủ cột cho từng vai trò | R12 | (biến thể tab) | Nhận luôn, có ghi chú. |
| E25 | Hai tab cùng đủ cột HoSoRung (R13, Q3) | R12, R13 | (biến thể tab) | Hỏi người dùng. |
| E26 | Chuỗi độc hại trong ô (`<script>`, `=HYPERLINK(...)`, 5.000 ký tự) | R62 | biến thể | Hiển thị dạng chữ, không thực thi, cắt gọn. |
| E27 | Sheet tải lại giữa lúc modal đang mở | R31 | (E2E) | Q14: giữ lựa chọn nếu khóa còn khớp, ngược lại báo "dữ liệu đã đổi". |
| E28 | Chủ rừng có 2 hợp đồng, một lỗi dữ liệu | R3, R36 | (biến thể) | Hợp đồng còn lại vẫn ghi được. |
| E29 | Đối chiếu khi chủ rừng nhập tay có CCCD sai định dạng | R49, R51 | biến thể | Q16. |
| E30 | Đồng bộ chạy xong khi người dùng đang ở modal hợp đồng đã không còn tồn tại | R28, R31 | (E2E) | Thông báo, đóng modal an toàn, không ghi. |

---

## 3. BỘ DỮ LIỆU MẪU GIẢ LẬP

Mọi giá trị là giả. Dòng Sheet đếm từ 1 là dòng tiêu đề (dữ liệu bắt đầu ở dòng 2). "(trống)" là ô để trống. Các cột không liệt kê (ví dụ Đơn giá, Thanh toán, Địa chỉ hiện tại) để trống hoặc điền "x" khi cần đủ cột bắt buộc của bộ cũ. Ngày dạng `dd/mm/yyyy`.

### 3.1 Tab HoSoRung (cấu trúc mới, tên tab `HoSoRung`)

Cột: `Mã KH_CCCD | Họ và tên chủ rừng | Mã hợp đồng | Ngày ký hợp đồng | ĐỊA CHỈ RỪNG | HECTA | Định mức tấn/Ha | Pháp lý rừng | SĐT`

| Dòng | Mã KH_CCCD | Họ và tên chủ rừng | Mã hợp đồng | Ngày ký | ĐỊA CHỈ RỪNG | HECTA | Định mức | Pháp lý rừng | SĐT |
|------|-----------|-------------------|-------------|---------|--------------|-------|----------|--------------|-----|
| 2 | 049000000011 | Nguyễn Văn Giả Một | HD-GL-0001 | 05/10/2026 | Xã Giả Lập A, huyện Thử Nghiệm | 0,80 | 95 | Giấy xác nhận UBND xã | 0900000001 |
| 3 | 049000000022 | Trần Thị Giả Hai | HD-GL-0002 | 12/10/2026 | Xã Giả Lập B, huyện Thử Nghiệm | 1,20 | 95 | Giấy chứng nhận QSDĐ | 0900000002 |
| 4 | 049000000033 | Lê Văn Giả Ba | HD-GL-0003 | 15/10/2026 | Xã Giả Lập C | 0,90 | 95 | Giấy xác nhận UBND xã | 0900000003 |
| 5 | 049000000034 | Lê Văn Giả Bốn | HD-GL-0003 | 15/10/2026 | Xã Giả Lập C | 0,90 | 95 | Giấy xác nhận UBND xã | 0900000004 |
| 6 | 049000000044 | Phạm Thị Giả Tư | HD-GL-0004 | 18/10/2026 | Xã Giả Lập D | 1,00 | 95 | Giấy xác nhận UBND xã | 0900000005 |
| 7 | 049000000055 | Hoàng Văn Giả Năm | HD-GL-0005 | 20/10/2026 | Xã Giả Lập E | 1,10 | 95 | Giấy chứng nhận QSDĐ | 0900000006 |
| 8 | 049000000077 | Đỗ Văn Giả Bảy | HD-GL-0007 | 25/10/2026 | Xã Giả Lập G | 0,70 | 100 | Giấy xác nhận UBND xã | 0900000007 |
| 9 | 049000000088 | Vũ Thị Giả Tám | HD-GL-0008 | 28/10/2026 | Xã Giả Lập H | (trống) | 95 | Giấy xác nhận UBND xã | 0900000008 |

Ghi chú: `HD-GL-0002` có `HECTA` = 1,20 là cộng của cả hai rừng (0,65 + 0,55), đúng như cảnh báo sẵn có "HECTA là của cả hợp đồng". Hợp đồng `HD-GL-0003` trùng mã với hai CCCD (dòng 4, 5). `HD-GL-0009` cố ý KHÔNG có dòng HoSoRung.

### 3.2 Tab ToaDoRung (cấu trúc mới, tên tab `ToaDoRung`)

Cột: `Mã rừng | Số hợp đồng | SoCCCD | HoVaTenChuRung | DienTich_m2 | HoSoNguonGoc | SoGiayTo | Latitude_Vĩ độ | Longtitude_Kinh độ | ID_GPS`

| Dòng | Mã rừng | Số hợp đồng | SoCCCD | HoVaTenChuRung | DienTich_m2 | Nguồn gốc | Số giấy tờ | Latitude | Longitude | ID_GPS |
|------|---------|-------------|--------|----------------|-------------|-----------|-----------|----------|-----------|--------|
| 2 | R-GL01-01 | HD-GL-0001 | 049000000011 | Nguyễn Văn Giả Một | 8000 | Giấy xác nhận | XN-0001 | 15.600001 | 108.100001 | GL01-A |
| 3 | R-GL01-01 | HD-GL-0001 | 049000000011 | Nguyễn Văn Giả Một | 8000 | Giấy xác nhận | XN-0001 | 15.600101 | 108.100201 | GL01-B |
| 4 | R-GL01-01 | HD-GL-0001 | 049000000011 | Nguyễn Văn Giả Một | 8000 | Giấy xác nhận | XN-0001 | 15.600201 | 108.100101 | GL01-C |
| 5 | R-GL02-01 | HD-GL-0002 | 049000000022 | Trần Thị Giả Hai | 6500 | Giấy chứng nhận QSDĐ | CN-0002 | 15.610001 | 108.110001 | GL02-A |
| 6 | R-GL02-01 | HD-GL-0002 | 049000000022 | Trần Thị Giả Hai | 6500 | Giấy chứng nhận QSDĐ | CN-0002 | 15.610101 | 108.110101 | GL02-B |
| 7 | R-GL02-02 | HD-GL-0002 | 049000000022 | Trần Thị Giả Hai | 5500 | Giấy chứng nhận QSDĐ | CN-0003 | 15.620001 | 108.120001 | GL02-C |
| 8 | R-GL02-02 | HD-GL-0002 | 049000000022 | Trần Thị Giả Hai | 5500 | Giấy chứng nhận QSDĐ | CN-0003 | 108.120101 | 15.620101 | GL02-D (đảo cột: nghi nhầm vĩ/kinh độ) |
| 9 | R-GL02-02 | HD-GL-0002 | 049000000022 | Trần Thị Giả Hai | 5500 | Giấy chứng nhận QSDĐ | CN-0003 | 15.36.00.100N | 108.07.12.500E | GL02-E (độ-phút-giây hợp lệ) |
| 10 | R-GL03-01 | HD-GL-0003 | 049000000033 | Lê Văn Giả Ba | 9000 | Giấy xác nhận | XN-0004 | 15.630001 | 108.130001 | GL03-A |
| 11 | R-GL04-01 | HD-GL-0004 | 049000000045 | Phạm Thị Giả Tư | 10000 | Giấy xác nhận | XN-0005 | 15.640001 | 108.140001 | GL04-A (CCCD lệch: 045 thay vì 044) |
| 12 | R-GL04-01 | HD-GL-0004 | 049000000044 | Phạm Thị Giả Tư | 10000 | Giấy xác nhận | XN-0005 | 15.640101 | 108.140101 | GL04-B |
| 13 | R-GL05-01 | HD-GL-0005 | 049000000055 | Hoàng Văn Giả Năm | 11000 | Giấy chứng nhận QSDĐ | CN-0006 | 15.650001 | 108.150001 | GL05-A |
| 14 | R-GL07-01 | HD-GL-0007 | 049000000077 | Đỗ Văn Giả Bảy | 4000 | Giấy xác nhận | XN-0007 | 15.670001 | 108.170001 | GL07-A |
| 15 | R-GL07-02 | HD-GL-0007 | 049000000077 | Đỗ Văn Giả Bảy | 3000 | Giấy xác nhận | XN-0007 | 15.670101 | 108.170101 | GL07-B |
| 16 | R-GL08-01 | HD-GL-0008 | 049000000088 | Vũ Thị Giả Tám | (trống) | Giấy xác nhận | XN-0008 | 15.680001 | 108.180001 | GL08-A |
| 17 | R-GL08-02 | HD-GL-0008 | 049000000088 | Vũ Thị Giả Tám | (trống) | Giấy xác nhận | XN-0008 | 15.680101 | 108.180101 | GL08-B |

### 3.3 Tab HoSoKeo (cấu trúc mới, tên tab `HoSoKeo`)

Cột: `Mã khách hàng | Mã hợp đồng | SỐ PHIẾU CÂN | Ngày nhập | Biển số 1 | KL hàng (KG) | Họ và tên chủ rừng`

(Dòng của `HD-GL-0002` cố ý đặt LẪN thứ tự ngày để kiểm tra R40.)

| Dòng | Mã khách hàng | Mã hợp đồng | SỐ PHIẾU CÂN | Ngày nhập | Biển số 1 | KL (KG) | Họ và tên chủ rừng |
|------|---------------|-------------|--------------|-----------|-----------|---------|--------------------|
| 2 | 049000000011 | HD-GL-0001 | GL1-0001 | 06/11/2026 | 43C-100.01 | 20500 | Nguyễn Văn Giả Một |
| 3 | 049000000011 | HD-GL-0001 | GL1-0002 | 06/11/2026 | 43C-100.01 | 19980 | Nguyễn Văn Giả Một |
| 4 | 049000000011 | HD-GL-0001 | GL1-0003 | 07/11/2026 | 43C-100.02 | 21120 | Nguyễn Văn Giả Một |
| 5 | 049000000022 | HD-GL-0002 | GL2-0004 | 07/11/2026 | 43C-200.01 | 21200 | Trần Thị Giả Hai |
| 6 | 049000000022 | HD-GL-0002 | GL2-0001 | 06/11/2026 | 43C-200.01 | 20500 | Trần Thị Giả Hai |
| 7 | 049000000022 | HD-GL-0002 | GL2-0009 | 10/11/2026 | 43C-200.02 | 20000 | Trần Thị Giả Hai |
| 8 | 049000000022 | HD-GL-0002 | GL2-0002 | 06/11/2026 | 43C-200.02 | 20000 | Trần Thị Giả Hai |
| 9 | 049000000022 | HD-GL-0002 | GL2-0006 | 08/11/2026 | 43C-200.02 | 20400 | Trần Thị Giả Hai |
| 10 | 049000000022 | HD-GL-0002 | GL2-0003 | 07/11/2026 | 43C-200.03 | 21100 | Trần Thị Giả Hai |
| 11 | 049000000022 | HD-GL-0002 | GL2-0008 | 09/11/2026 | 43C-200.03 | 21000 | Trần Thị Giả Hai |
| 12 | 049000000022 | HD-GL-0002 | GL2-0005 | 08/11/2026 | 43C-200.01 | 20800 | Trần Thị Giả Hai |
| 13 | 049000000022 | HD-GL-0002 | GL2-0007 | 09/11/2026 | 43C-200.01 | 20600 | Trần Thị Giả Hai |
| 14 | 049000000033 | HD-GL-0003 | GL3-0001 | 16/11/2026 | 43C-300.01 | 20000 | Lê Văn Giả Ba |
| 15 | 049000000044 | HD-GL-0004 | GL4-0001 | 12/11/2026 | 43C-400.01 | 20000 | Phạm Thị Giả Tư |
| 16 | 049000000044 | HD-GL-0004 | GL4-0002 | 13/11/2026 | 43C-400.01 | 19800 | Phạm Thị Giả Tư |
| 17 | **049000000099** | HD-GL-0004 | GL4-0003 | 14/11/2026 | 43C-400.02 | 21000 | Phạm Thị Giả Tư (CCCD lệch) |
| 18 | 049000000055 | HD-GL-0005 | GL5-0102 | 12/11/2026 | 43C50005 | 21300 | Hoàng Văn Giả Năm |
| 19 | 049000000055 | HD-GL-0005 | GL5-0202 | 13/11/2026 | 43C-500.06 | 20501 | Hoàng Văn Giả Năm |
| 20 | 049000000055 | HD-GL-0005 | GL5-0302 | 14/11/2026 | 43C-500.07 | 20502 | Hoàng Văn Giả Năm |
| 21 | 049000000055 | HD-GL-0005 | GL5-0401 | 15/11/2026 | 43C-500.08 | 20000 | Hoàng Văn Giả Năm |
| 22 | 049000000055 | HD-GL-0005 | GL5-0402 | 15/11/2026 | 43C-500.08 | 20000 | Hoàng Văn Giả Năm |
| 23 | 049000000077 | HD-GL-0007 | GL7-0001 | 08/11/2026 | 43C-700.01 | 20000 | Đỗ Văn Giả Bảy |
| 24 | 049000000077 | HD-GL-0007 | GL7-0002 | 08/11/2026 | 43C-700.01 | 20000 | Đỗ Văn Giả Bảy |
| 25 | 049000000077 | HD-GL-0007 | GL7-0003 | 09/11/2026 | 43C-700.02 | 15000 | Đỗ Văn Giả Bảy |
| 26 | 049000000088 | HD-GL-0008 | GL8-0001 | 10/11/2026 | 43C-800.01 | 20000 | Vũ Thị Giả Tám |
| 27 | 049000000088 | HD-GL-0008 | GL8-0002 | 11/11/2026 | 43C-800.01 | 20000 | Vũ Thị Giả Tám |
| 28 | 049000000099 | HD-GL-0009 | GL9-0001 | 17/11/2026 | 43C-900.01 | 18000 | Chủ Giả Chín (không có HoSoRung) |

### 3.4 Kịch bản và kết quả kỳ vọng từng hợp đồng

| Hợp đồng | Mục đích | Kỳ vọng (trạng thái, số rừng, số phiếu, tổng tấn) |
|----------|----------|--------------------------------------------------|
| HD-GL-0001 | 1 hợp đồng – 1 rừng (T1, T15) | Đủ · 1 rừng · 3 phiếu · **61,600 t** · dự kiến 0,80 × 95 = 76,00 t (thanh xanh 81 %) |
| HD-GL-0002 | 2 rừng, vượt dự kiến (T2, T14) | Đủ nhưng có cảnh báo đỏ · 2 rừng · 9 phiếu · **185,600 t** (xem 3.5) |
| HD-GL-0003 | Mã trùng 2 CCCD (T3) | **Lỗi dữ liệu** (dòng 4 và 5) · khóa ghi · vẫn nằm trong danh sách |
| HD-GL-0004 | Phiếu lệch CCCD (T4) | Cần xem / Lệch CCCD · 1 rừng · 3 phiếu (1 lệch, không tích) · tọa độ dòng 11 lệch, không tích · 2 phiếu hợp lệ = 39,800 t |
| HD-GL-0005 | Nghi đổi số (T25, T26) | xem 3.6 |
| HD-GL-0007 | Biên dung sai (T19) | 2 rừng; dự kiến R1 = 0,40 × 100 = **40,00 t**, R2 = 0,30 × 100 = **30,00 t**; dung sai 0 %: GL7-0001 + 0002 = 40,000 t → rừng 1 (vừa đúng dự kiến), GL7-0003 (15 t) → rừng 2 |
| HD-GL-0008 | Thiếu hecta (T17) | HECTA trống, DienTich_m2 trống ⇒ dự kiến không tính được; hai rừng không tự nhận phiếu; 2 phiếu "chưa phân bổ" |
| HD-GL-0009 | Chỉ có ở HoSoKeo (E4) | Có trong danh sách, thiếu chủ rừng/ngày ký; Q23 |
| HD-GL-0006 | Cấu trúc cũ (T7) | xem 3.7 |

### 3.5 Phân bổ chi tiết `HD-GL-0002` (dung sai 5 %, hồ sơ chưa có lô)

Dự kiến: rừng 1 = 0,65 × 95 = **61,75 t** (ngưỡng 64,8375); rừng 2 = 0,55 × 95 = **52,25 t** (ngưỡng 54,8625). Hecta từng rừng suy từ `DienTich_m2` ÷ 10.000 (Q5b).

| Thứ tự | Phiếu | Ngày | KL (t) | Tích lũy trong rừng | Rừng |
|--------|-------|------|--------|---------------------|------|
| 1 | GL2-0001 | 06/11 | 20,500 | 20,500 | 1 |
| 2 | GL2-0002 | 06/11 | 20,000 | 40,500 | 1 |
| 3 | GL2-0003 | 07/11 | 21,100 | 61,600 | 1 |
| 4 | GL2-0004 | 07/11 | 21,200 | 82,800 > 64,8375 → sang rừng 2 | 2 (21,200) |
| 5 | GL2-0005 | 08/11 | 20,800 | 42,000 | 2 |
| 6 | GL2-0006 | 08/11 | 20,400 | 62,400 (rừng cuối nhận phần dư) | 2 |
| 7 | GL2-0007 | 09/11 | 20,600 | 83,000 | 2 |
| 8 | GL2-0008 | 09/11 | 21,000 | 104,000 | 2 |
| 9 | GL2-0009 | 10/11 | 20,000 | 124,000 | 2 |

Kết quả: rừng 1 = **61,600 t** (99,8 % dự kiến, thanh vàng); rừng 2 = **124,000 t**, vượt dự kiến **71,750 t** (vượt ngưỡng dung sai 69,1375 t): cảnh báo đỏ. Tổng 185,600 t. Kết quả giống nhau ở dung sai 0 % và 30 % (đã tính thử). Biến thể:

- **3.2a**: lô `R-GL02-01` đã có `GL2-0001` (20,500 t, trùng Sheet) và `GL2-X001` (3,000 t, ngày 05/11, không có trên Sheet). Đã dùng = 23,500. Phiếu trùng không phân bổ lại; GL2-0002 → 43,500; GL2-0003 → 64,600 ≤ 64,8375 ⇒ vào rừng 1; GL2-0004 sang rừng 2.
- **3.2b**: như 3.2a nhưng `GL2-X001` = 4,000 t. Đã dùng = 24,500; GL2-0002 → 44,500; GL2-0003 → 65,600 > 64,8375 ⇒ **sang rừng 2**.

### 3.6 `HD-GL-0005`: nghi đổi số

Trạng thái lô trong hồ sơ TRƯỚC khi cập nhật (chủ rừng "Hoàng Văn Giả Năm", lô `R-GL05-01`):

| Số phiếu (hồ sơ) | Ngày | BKS | KL (t) |
|------------------|------|-----|--------|
| GL5-0101 | 12/11/2026 | 43C-500.05 | 21,300 |
| GL5-0201 | 13/11/2026 | 43C-500.06 | 20,500 |
| GL5-0301 | 14/11/2026 | 43C-500.07 | 20,500 |
| GL5-0401 | 15/11/2026 | 43C-500.08 | 20,000 |

Đối chiếu với HoSoKeo dòng 18–22:

| Phiếu Sheet | So với hồ sơ | Kỳ vọng |
|-------------|--------------|---------|
| GL5-0102 (BKS `43C50005`, 21.300 kg) | cùng ngày, BKS chuẩn hóa trùng `43C50005`, lệch 0 kg với GL5-0101 | **Nghi đổi số** (GL5-0101 → GL5-0102), không ghi mặc định |
| GL5-0202 (20.501 kg) | cùng ngày, BKS, lệch 1 kg với GL5-0201 | **Nghi đổi số** (biên ≤ 1 kg) |
| GL5-0302 (20.502 kg) | lệch 2 kg với GL5-0301 | **Mới** (vượt 1 kg) |
| GL5-0401 | khớp khóa (số + ngày) | **Trùng**, không phân bổ |
| GL5-0402 (cùng ngày, BKS, 20.000 kg) | ứng viên duy nhất GL5-0401 đã được GL5-0401 trên Sheet khớp khóa | **Mới** (E13), không phải nghi |

Sau khi bấm "Đổi số GL5-0101 → GL5-0102": lô có GL5-0102 (`_id` cũ, `soCu=[GL5-0101]`), tổng tấn lô không đổi. **Lần tải 2** (Sheet chưa sửa, vẫn còn dòng cũ): thêm vào HoSoKeo dòng `GL5-0101 | 12/11/2026 | 43C-500.05 | 21300` ⇒ kỳ vọng "đã có (số cũ của GL5-0102)", không tích, không cộng đôi. **Lần tải 3** (E17): dòng GL5-0102 duy nhất ⇒ "trùng".

### 3.7 `HD-GL-0006`: Sheet cấu trúc CŨ (tên tab `_QC`, đủ cột như v3.2.0)

Ba tab tên `HoSoKeo_QC`, `HoSoRung_QC`, `ToaDoRung_QC`, mỗi tab đủ các cột bắt buộc cũ (HoSoKeo: Mã khách hàng, Mã hợp đồng, SỐ PHIẾU CÂN, Ngày nhập, SỐ XE, Biển số 1, KL hàng (KG) hoặc Khối lượng (Tấn), Đơn giá, Thanh toán, Họ và tên chủ rừng, ĐỊA CHỈ RỪNG; HoSoRung 13 cột; ToaDoRung 12 cột). Các cột ngoài bảng dưới điền `x giả lập` (văn bản), cột số điền 1.

| Tab | Dòng | Giá trị chính |
|-----|------|---------------|
| HoSoRung_QC | 2 | Mã KH_CCCD `049000000066` · Họ tên `Bùi Thị Giả Sáu` · Mã hợp đồng `HD-GL-0006` · Ngày ký `30/10/2026` · HECTA 0,50 · Định mức 95 |
| ToaDoRung_QC | 2 | Mã rừng `R-GL06-01` · Số hợp đồng ` hd-gl-0006 ` (chữ thường, khoảng trắng thừa; E1) · SoCCCD `049000000066` · DienTich_m2 5000 · Lat `15.690001` · Lng `108.190001` |
| HoSoKeo_QC | 2 | Mã KH `049000000066` · Mã hợp đồng `HD-GL-0006` · SỐ PHIẾU CÂN `GL6-0001` · Ngày nhập `18/11/2026` · Biển số 1 `43C-600.01` · KL 20000 kg |
| HoSoKeo_QC | 3 | Mã KH `049000000066` · Mã hợp đồng `Hd-Gl-0006` · SỐ PHIẾU CÂN `GL6-0002` · Ngày nhập `19/11/2026` · Biển số 1 `43C-600.01` · KL 21000 kg |

Kỳ vọng: 1 hợp đồng, 1 rừng, 2 phiếu, 41,000 t. Đầu ra `build` được ghi làm tệp chuẩn từ v3.2.0 TRƯỚC KHI sửa mã (T7). Quy tắc chuẩn hóa R1 có thể làm kết quả khác v3.2.0 cho dòng ToaDoRung ` hd-gl-0006 ` (v3.2.0 sẽ không nối được): đây là điểm khác biệt có chủ ý, phải tách thành ca riêng, không làm vỡ T7.

### 3.8 Trạng thái hợp đồng kỳ vọng (theo đề xuất, chờ Q8)

| Hợp đồng | Trạng thái đề xuất | Lý do |
|----------|--------------------|-------|
| HD-GL-0001 | Đủ | đủ ba tab, không lệch |
| HD-GL-0002 | Cần xem | rừng 2 vượt dự kiến, có điểm tọa độ nghi đảo cột |
| HD-GL-0003 | Lỗi dữ liệu | trùng 2 CCCD |
| HD-GL-0004 | Cần xem (Lệch CCCD) | phiếu và tọa độ lệch CCCD |
| HD-GL-0005 | Cần xem | 2 phiếu nghi đổi số |
| HD-GL-0006 | Đủ | |
| HD-GL-0007 | Đủ | |
| HD-GL-0008 | Cần xem | thiếu hecta, phiếu chưa phân bổ |
| HD-GL-0009 | Cần xem (Thiếu tab) | không có HoSoRung |

### 3.9 Biến thể cấu trúc (không cần bảng riêng)

- **V6a** (T6, thiếu cột trùng): ToaDoRung bỏ cột `HoVaTenChuRung`, `SoCCCD`, `ThuongTru`; HoSoKeo bỏ `Mã khách hàng`, `Họ và tên chủ rừng`, `ĐỊA CHỈ RỪNG`; HoSoRung bỏ `Họ và tên chủ rừng`. Kỳ vọng: nhận cả ba tab, ghi chú liệt kê cột không có, kiểm tra CCCD thành "thiếu CCCD để đối chiếu" (R7).
- **V6b** (T6, thiếu cột bắt buộc): lần lượt bỏ `Mã hợp đồng` (HoSoRung), `Mã rừng` (ToaDoRung), `SỐ PHIẾU CÂN` (HoSoKeo), cả hai cột khối lượng (HoSoKeo). Kỳ vọng: lỗi nêu đúng tab + cột, bản cũ giữ nguyên.
- **V12** (R12): đổi tên tab thành `Du lieu rung`, `Toa do`, `Phieu can` (đủ cột): nhận theo cột, có ghi chú.

### 3.10 Quy tắc sinh 300 phiếu (T20, R63)

Hợp đồng `HD-GL-0300`, CCCD `049000000300`, 3 rừng (0,90 / 0,80 / 0,70 ha × 95). Phiếu `GL300-0001…0300`, ngày = 01/11/2026 + ⌊(i−1)/10⌋ ngày, BKS xoay vòng 5 biển `43C-300.01…05`, khối lượng = 19.000 + ((i × 37) mod 2.500) kg. Dùng bộ sinh trong test, không lưu dữ liệu sinh vào kho mã nguồn.

---

## 4. CÂU HỎI MỞ VÀ MÂU THUẪN (nêu thẳng, chưa tự quyết)

Xếp theo mức ảnh hưởng. Mỗi mục: **mâu thuẫn/lỗ hổng · mã nguồn chứng minh · hệ quả nếu không trả lời**.

**Q1. Tên tệp `src/phanbo.js` đã bị chiếm.** Tệp này là phân bổ khối lượng NHÂN CÔNG theo đội (`HAKPhanBo`, tham chiếu trong ít nhất `ui/app/*` và in ấn). PR-3b định tạo `src/phanbo.js` "(mới)". Đề nghị tên khác (ví dụ `src/phanbophieu.js`); cần CHỦ/queen xác nhận để tránh ghi đè.

**Q2. S2 đưa "Họ và tên" và "CCCD" vào nhóm "chỉ để kiểm tra", nhưng luồng "tạo chủ rừng mới từ Sheet" hiện ghi chính hai trường này** (`ownerOf` → `lkApply` nhánh `lk.mode==='new'`: `info.ten`, `info.cccd`, `info.ma = c.cccd`). Nếu chỉ kiểm tra: chủ rừng mới tạo ra thiếu tên và CCCD? Hay "ưu tiên" thực chất gồm hai trường này? Cần quyết định trước khi viết R8, T6, E20.

**Q3. Cột bắt buộc của HoSoRung chỉ còn "Mã hợp đồng" ⇒ không nhận diện được vai trò theo cột.** Cột `Mã hợp đồng` cũng có ở HoSoKeo; tab HoSoKeo sẽ "đủ cột" của HoSoRung (R13, E25). Cần một dấu hiệu nhận diện bổ sung (ví dụ tab phải có thêm ít nhất một cột đặc trưng như `HECTA`, `Ngày ký hợp đồng` hoặc `Định mức tấn/Ha`) và quy tắc cho ToaDoRung (tên cột hợp đồng là `Số hợp đồng`, không phải `Mã hợp đồng`: chấp nhận cả hai?).

**Q4. Tương thích ngược T7 ↔ khóa mới (S1).** Mã hiện lọc theo CCCD + hợp đồng và chỉ CẢNH BÁO `sameHdOther` khi một hợp đồng thuộc nhiều CCCD, vẫn cho ghi đúng CCCD. S1 đổi thành LỖI DỮ LIỆU và khóa ghi. Với Sheet cũ nào đã có tình huống này (kể cả chỉ trùng giữa HoSoKeo và HoSoRung), kết quả không thể "y như trước". Chủ cần xác nhận: T7 chỉ áp dụng cho Sheet không có mã trùng; trường hợp trùng là thay đổi có chủ ý.

**Q5. "Chỉ lấy cột ưu tiên" ↔ T7 "đầu ra giống v3.2.0".** `forestOf` hiện đưa vào `f.ref` nhiều cột không có trong bảng S2 (Tình trạng Hợp đồng, Ngày thanh lý, Mã thanh lý hợp đồng, Định mức quy đổi Tấn/M3, Quy cách đường kính/chiều dài, Phương án khai thác, Năm trồng, Tọa độ HoSoRung, ID_RUNG). Bảng S2 không liệt kê chúng: bỏ hay giữ? Bỏ thì T7 và R35 phải đổi kỳ vọng. Cột `Tình trạng Hợp đồng` còn dùng cho bộ lọc hiện có (R29).
  - **Q5b.** `HECTA` ở HoSoRung là của CẢ hợp đồng (mã đã cảnh báo thế), nhưng S5.4 tính dự kiến TỪNG rừng = hecta × định mức. Nguồn hecta từng rừng: `DienTich_m2 ÷ 10.000` của ToaDoRung (đề xuất dùng trong dữ liệu mẫu), hay diện tích đã nhập ở lô của app (`info.dienTich`), hay chia đều? Mô phỏng V3 giả định mỗi rừng có sẵn hecta riêng.

**Q6. Mâu thuẫn trong S5: "rừng cuối nhận phần dư" (S5.3) ↔ "thiếu hecta/định mức thì rừng đó KHÔNG tự nhận phiếu" (S5.4); và "hợp đồng 1 rừng: mọi phiếu vào rừng đó" (S5.2).** Nếu rừng duy nhất hoặc rừng cuối thiếu hecta thì phiếu vào hay không? Nếu rừng giữa thiếu hecta thì bị bỏ qua hay chặn cả chuỗi?

**Q7. Đối chiếu ở màn chủ rừng nhập thủ công (S7): "số rừng" và "tổng tấn" lấy từ đâu?** Màn Thêm chủ rừng hiện không có hai ô đó; lô chỉ lưu hợp đồng nếu đã ghi từ Sheet (`info.nguon`, `f.ref`), còn nhập thủ công thì lô không gắn mã hợp đồng. Mô phỏng V3 có thêm ô "số rừng/tấn" giả. Cần quyết định: (a) thêm hai ô nhập; (b) tính từ các lô của chủ rừng có `soHopDong` trùng; (c) bỏ hai mục. Liên quan R36 (cách tìm chủ rừng trong app từ mã hợp đồng, nhất là khi một chủ rừng có nhiều hợp đồng hoặc ≥ 2 chủ rừng cùng ghi một số hợp đồng).

**Q8. Bộ nhãn trạng thái hợp đồng mâu thuẫn.** S3.2: *Đủ / Thiếu tab / Lỗi dữ liệu / Lệch CCCD*. S6.1: *Đủ / Cần xem / Lỗi dữ liệu*. Mô phỏng V3 dùng *Đủ / Cần xem / Lỗi dữ liệu / Lệch CCCD*. Đề nghị chốt: "Cần xem" là nhãn gộp hay chỉ còn ba nhãn kèm lý do chi tiết?
  - **Q8b.** S3 mô tả "ngăn chi tiết", S6 thay bằng modal: T12 cần viết lại cho modal; xác nhận S6 thay thế hoàn toàn S3.2–S3.3.

**Q9. Phạm vi "chặn ghi chủ rừng" (R6, T5).** Chỉ chặn phần thông tin chủ rừng, hay chặn cả rừng/tọa độ/phiếu của chủ đó? Hiện lô gắn với chủ rừng, nên ghi lô cho chủ sai là hậu quả nặng: đề nghị chặn tất cả; cần xác nhận.

**Q10. Mốc "Vượt dự kiến X tấn" và thanh đo.** X = (dự kiến thực) hay (dự kiến × (1+dung sai))? Thanh đỏ khi vượt dự kiến hay khi vượt ngưỡng dung sai? Dữ liệu 3.5 cho hai số khác nhau (71,75 vs 69,14).
  - **Q10b.** Phiếu lớn hơn cả ngưỡng của rừng trống (đứng giữa chuỗi): bỏ qua rừng đó (mô phỏng V3: vòng `while` bỏ qua) hay nhận phiếu vì rừng đang trống? S5.3 chưa nói.
  - **Q10c.** "Rồi số phiếu": thứ tự chữ hay số tự nhiên (`GL2-0010` đứng trước hay sau `GL2-0002`)? Ngày cân không có giờ; có dùng `Giờ cân 1` làm tiêu chí thứ ba không?

**Q11. Tên cột tọa độ.** S2 ghi "Latitude, Longitude"; Sheet thật dùng `Latitude_Vĩ độ` và `Longtitude_Kinh độ` (chính tả "Longtitude"). Chấp nhận cả hai cách viết (có/không dấu, đúng/sai chính tả)?

**Q12. "Cập nhật vào hồ sơ" có ghi hẳn không?** Mã hiện chỉ ghi vào BẢN NHÁP của lô (`stage`) rồi người dùng bấm "Lưu dữ liệu vào lô". Nhiều chỗ trong prompt ("ghi", "đã thêm") dễ hiểu là ghi hẳn. Xác nhận giữ nguyên hành vi bản nháp, và S8 `soCu`/nhật ký ghi ở thời điểm nào (nháp hay khi lưu).

**Q13. Trạng thái phiếu đang có trong mã mà S3/S8 chưa nhắc:** `issue` (lỗi khối lượng/ngày), `alias` (tên xe chưa ghép biển), phiếu "cùng số khác ngày", phiếu cần "chỉ đổi biển số". Giữ hết? Khi bảng S2 cho phép thiếu cột `Biển số 1`/`SỐ XE` thì mọi phiếu thành `alias`: ghi được phiếu không BKS không?

**Q14. Mở lại modal sau khi đồng bộ lại Sheet:** giữ lựa chọn cũ nếu khóa còn khớp, hay đặt lại? (E27)

**Q15. Phân bổ tự động sau khi người dùng đã đổi tay:** ghi đè tay có cần xác nhận không? (T18)

**Q16. Điều kiện "đủ CCCD" để sáng nút (S7):** chỉ cần không rỗng, hay phải đúng 9/12 số? Người nhập CCCD sai định dạng có được bấm "Đối chiếu" để thấy chênh lệch?

**Q17. Đối chiếu/Mở khi chưa tải Sheet nào hoặc đang offline:** nút khóa hay báo lỗi sau khi bấm?

**Q18. Nghi đổi số có nhiều ứng viên, hoặc ứng viên đã được phiếu Sheet khác khớp khóa.** Đề xuất: loại ứng viên đã được khớp khóa; nhiều ứng viên còn lại → "nhiều ứng viên", không tự chọn. Nguy cơ sai khác: một xe chở 2 chuyến/ngày với khối lượng gần nhau (lệch ≤ 1 kg) có thể bị nghi nhầm, vì vậy mặc định không ghi là bắt buộc.

**Q19. Ô Số phiếu tự do hiện cho sửa (`stage.updateRow`).** S8 nói "thay cho sửa ô tự do": ô đó chuyển thành chỉ đọc ở mọi màn (cả bảng phiếu cân ở màn Lô và nhập Excel)? Phiếu đã nhập tay từ đầu cho phép đổi lúc chưa lưu lần nào không?

**Q20. "Tra cứu theo số cũ vẫn ra phiếu":** ô tìm kiếm nào (tìm trong hồ sơ ở `src/timkiem.js`, tìm trong dữ liệu Sheet, hay cả hai)? Có làm `soCu` tham gia chỉ mục tìm kiếm không?

**Q21. Mức hiệu năng và quy mô thực tế** của màn "toàn bộ hợp đồng" (số hợp đồng, số phiếu tối đa). R63 là con số ĐỀ XUẤT.

**Q22. Tích tay một trường đã sửa tay:** ghi đè rồi bỏ khỏi `_tay`, hay giữ `_tay`?

**Q23. Hợp đồng chỉ có ở HoSoKeo hoặc chỉ có ở ToaDoRung (E4, E5):** vẫn cập nhật được phần có? Hiện `audit()` đã liệt kê hai loại này riêng (`phieuThieuHoSoRung`, `toaDoThieuHoSoRung`); trang mới có thay thế `audit` không, hay giữ nguyên báo cáo rà soát? (Spec không nói số phận chức năng "Rà soát", chế độ "Điền vào rừng này" từ hồ sơ rừng (`lk.mode==='fill'`, `lk.tgt`) và cách xem từng dòng theo tab của màn Tra cứu hiện có.)

**Q24. CMND 9 số và CCCD 12 số của cùng một người** có coi là lệch (R5)? Mã hiện chấp nhận cả hai định dạng nhưng không đối chiếu giữa chúng.

**Q25. Số cũ bị tái sử dụng cùng ngày (E18)** sau khi đã đổi số: cảnh báo hay coi là "đã có"?

**Q26. Đổi số phiếu đã vào báo cáo/hồ sơ đã in:** có cảnh báo/ghi chú (E19)? `scripts/so-ban-in.js` 206/206 chỉ kiểm tra không đổi số liệu in, không bao quát thao tác này.

**Q27 (kỹ thuật, dành cho `hak-data-architect`).** (a) Chỉ mục `idx_lr_hd` và `k_hd` hiện lưu mã hợp đồng chưa chuẩn hóa hoa/thường (`clean` chỉ gọn khoảng trắng): chuẩn hóa cần tính lại `k_hd` khi nạp, và bản tra cứu đã lưu trước nâng cấp phải được đồng bộ lại (hoặc có migration). (b) Mã rừng tự sinh `'<ma>-R<n>'` dựa vào `o.info.ma` (= CCCD) khi hợp đồng không có tọa độ: khóa mới là hợp đồng nên quy tắc này cần xem lại (E22). (c) `Mã rừng` có duy nhất toàn hệ thống (`findForestByMa`)? Hai hợp đồng khác nhau trùng mã rừng (E21).

---

Hết bản đặc tả. Số yêu cầu: 64 (R1–R64); ca kiểm thử: T1–T26 + E1–E30; câu hỏi mở: Q1–Q27 (kèm các nhánh 5b, 8b, 10b, 10c).

---

## Phụ lục QĐ — Quyết định của CHỦ sau G1 (22/11/2026) — **các quyết định này thắng mọi câu chữ cũ ở trên**

| # | Quyết định | Hệ quả cho đặc tả |
|---|-----------|-------------------|
| QĐ1 | **`HECTA` ở HoSoRung là của TỪNG RỪNG.** Một hợp đồng có thể có nhiều dòng HoSoRung (mỗi dòng một rừng). **Mã rừng và tọa độ lấy từ ToaDoRung** (gán mã rừng theo tọa độ bên ToaDoRung). | Sản lượng dự kiến của rừng = `HECTA` của dòng HoSoRung đó × định mức tấn/ha. "Nhiều dòng HoSoRung cùng hợp đồng + cùng CCCD" **không còn là cảnh báo trùng**: là nhiều rừng. Cần quy tắc ghép dòng HoSoRung ↔ mã rừng ToaDoRung (xem mặc định MĐ1). Câu hỏi Q5b/Q6 của hai agent được giải quyết. |
| QĐ2 | "Vượt dự kiến X tấn" tính so với **dự kiến thuần** (hecta × tấn/ha), không cộng dung sai. | Dung sai chỉ quyết định phiếu có sang rừng sau hay không. |
| QĐ3 | Hợp đồng **1 rừng** thiếu hecta hoặc định mức: **vẫn gán mọi phiếu vào rừng đó**, chỉ ghi chú "không tính được dự kiến". | Hợp đồng nhiều rừng thiếu hecta/định mức của một rừng: rừng đó không tự nhận phiếu (chỉ phân bổ tay). |
| QĐ4 | Mã hợp đồng thuộc **nhiều CCCD**: **không chặn cứng**; **phải xác nhận 2 lần** mới cho cập nhật (CHỦ xác nhận cách hiểu này, 22/11/2026). | Thay "LỖI DỮ LIỆU, không cho cập nhật" bằng "CẢNH BÁO NẶNG": hiện các dòng (số dòng Sheet), nút Cập nhật chỉ mở sau 2 lần xác nhận rõ ràng (hộp thoại 2 bước). Là thay đổi hành vi so với v3.2.0 (trước chỉ cảnh báo, 1 lần). |
| QĐ5 | Nhận tab theo cột: mỗi tab giữ **một cột đặc trưng bắt buộc** (HoSoRung: `HECTA`; ToaDoRung: `Mã rừng` + vĩ/kinh độ; HoSoKeo: `SỐ PHIẾU CÂN`) để không nhầm vai trò. | Đề xuất của STAFF_FSC được duyệt. |
| QĐ6 | Đối chiếu ở màn chủ rừng nhập tay: so họ tên, CCCD, ngày ký ngay khi nhập; số rừng và tổng tấn so khi lô đã lưu mã hợp đồng. | Đề xuất được duyệt. |
| QĐ7 | "Cập nhật vào hồ sơ" chỉ ghi vào **bản nháp**; người dùng bấm "Lưu dữ liệu vào lô" như hiện nay. | Đề xuất được duyệt. |
| QĐ8 | Thứ tự "nhập trước" của rừng: thêm trường thời điểm tạo cho rừng **mới**, không điền ngược cho rừng cũ. | Rừng cũ không có thời điểm: dùng thứ tự hiện có làm mặc định, có cảnh báo khi hợp đồng nhiều rừng cũ. |
| QĐ9 | Nghi đổi số phiếu: loại các phiếu đã khớp khóa trước khi so. | Đề xuất được duyệt. |

**QĐ10 — CHỦ ĐÃ DUYỆT MĐ1 (22/11/2026, sau G1):** dòng HoSoRung không có cột mã rừng thì khi thêm vào hồ sơ app **tự gán mã rừng theo tọa độ bên ToaDoRung** (mã rừng và tọa độ lấy từ ToaDoRung đã gán), theo đúng thứ tự ưu tiên 1→2→3 dưới đây. Nội dung bên dưới là quyết định chính thức, không còn là mặc định chờ duyệt.

**Quy tắc MĐ1 (đã duyệt):** vì HoSoRung không có cột mã rừng, ghép dòng HoSoRung ↔ mã rừng ToaDoRung theo thứ tự ưu tiên: (1) diện tích HoSoRung (`HECTA`) khớp `DienTich_m2 ÷ 10.000` của mã rừng trong dung sai 0,5 %; (2) địa chỉ rừng (`ĐỊA CHỈ RỪNG` ↔ `DiaChiRungTrong`, so không dấu); (3) cùng thứ tự xuất hiện trong Sheet. Phương pháp (2) và (3) được đánh dấu "ghép tạm — cần xác nhận"; giao diện cho đổi tay bằng ô chọn **Mã rừng** ở từng rừng. Không ghép được → rừng hiện "chưa có mã rừng", không tự nhận phiếu.
