# Thiết kế lại dữ liệu theo bảng mẹ – bảng con (bản 2.0)

Trạng thái: **đã duyệt (15/11/2026)**; giai đoạn 1 đã làm (`src/model.js`, xem mục 12). Áp dụng skill `hak-parent-child-data-model` và `quan-ly-bang-me-bang-con`.
Quyết định đã chốt với người phụ trách (15/11/2026): hình thức và cách tính **theo từng đội**; phiếu cân có **cột Đội** (lô một đội tự gán) và **gán đội hàng loạt theo bộ lọc**; **đơn vị vận chuyển và xe là danh mục dùng chung**; **cước theo từng hợp đồng vận chuyển**.

## 1. Vấn đề của cấu trúc hiện tại (1.4.x)

Một lô rừng là một khối phẳng: `info` chứa lẫn thông tin rừng, hình thức khoán, đơn giá theo vị trí, cước, cự ly, khối lượng từng đội; `nc` (nhân công) có cột `doi` tự do; `dx` (xe) gồm luôn thông tin người ký; `exp` chứa chung mọi số và ngày văn bản. Vì vậy:

- **Đội** không phải bản ghi: suy ra từ Tổ trưởng + cột Đội; khối lượng, diện tích của đội là số chia theo số người.
- **Hợp đồng vận chuyển** không phải bản ghi: suy ra bằng cách gom xe theo CCCD người ký; cước chung cả lô; số và ngày hợp đồng vận chuyển dùng chung ngày ký với hợp đồng khai thác.
- **Vị trí** có ba nguồn lệch nhau: ba chức danh cố định, chức danh thêm, vị trí của định mức nhân công.
- Mỗi quy tắc mới phải vá ở nhiều nơi (bản 1.4.36–1.4.37 là ví dụ).

## 2. Cây bảng mới

```
DANH MỤC (dùng chung mọi lô)
├─ DM_VITRI            Vị trí (định mức nhân công)            ← nguồn DUY NHẤT của vị trí
│  └─ DM_BHLD          Định mức BHLĐ theo vị trí, có hiệu lực từ ngày (giữ cơ chế phiên bản hiện có)
├─ DM_DONVI_VC         Đơn vị vận chuyển (bên ký hợp đồng: chủ xe hoặc tài xế, hoặc doanh nghiệp)
│  └─ DM_XE            Xe của đơn vị (biển số, chủ xe, tài xế, giấy tờ, hạn kiểm định/bảo hiểm/GPLX)
├─ DM_CONGTY           Công ty mua hàng (như hiện nay)
└─ ĐỊNH MỨC GỖ KEO, THỜI GIAN KHAI THÁC (như hiện nay)

CHỦ RỪNG
└─ LÔ RỪNG (Thông tin rừng: mã, địa điểm, tọa độ, diện tích, định mức, thời gian, giấy tờ, công ty mua + địa chỉ giao)
   ├─ ĐỘI khai thác  ("Nhân công khai thác")
   │  │   tên đội, Tổ trưởng, hình thức (giao khoán | trực tiếp), cách tính (tấn | ha | ngày công),
   │  │   đơn giá theo từng vị trí của DM_VITRI, diện tích giao, số và ngày ký hợp đồng,
   │  │   số và ngày giấy ủy quyền, nghiệm thu, kỳ thanh toán
   │  ├─ NHÂN CÔNG của đội (nhập tay hoặc nạp Excel; vị trí chọn từ DM_VITRI)
   │  └─ CHẤM CÔNG của đội (khi cách tính là ngày công)
   ├─ HỢP ĐỒNG VẬN CHUYỂN  ("Vận chuyển")
   │  │   đơn vị (chọn từ DM_DONVI_VC, chụp lại thông tin lúc ký), số và ngày ký,
   │  │   cước (cố định đ/tấn | đ/tấn/km × cự ly), cự ly, ngày bắt đầu, chi phí khác,
   │  │   số và ngày biên bản xác nhận khối lượng / thanh toán
   │  └─ XE tham gia hợp đồng (chọn từ DM_XE của đơn vị, hoặc nạp Excel; chụp lại giấy tờ lúc ký)
   └─ KHỐI LƯỢNG THỰC HIỆN = PHIẾU CÂN
          số phiếu, ngày, giờ, biển số → xe → hợp đồng vận chuyển, ĐỘI, cân 1/2, khối lượng, nơi giao, khách hàng
          nguồn: Google Sheets, nạp Excel, nhập tay; gán đội hàng loạt theo bộ lọc
```

Ba cấp sâu nhất: Lô → Đội → Nhân công; Lô → Hợp đồng VC → Xe. Không thêm cấp thứ tư.

## 3. Khóa và quan hệ

| Bảng | Khóa | Khóa nghiệp vụ (UNIQUE) | Cha | Xóa cha |
| --- | --- | --- | --- | --- |
| DM_VITRI | `id` | tên vị trí (không phân biệt hoa thường) | — | chặn nếu còn nhân công / đơn giá / định mức dùng |
| DM_BHLD | (vị trí, ngày hiệu lực) | như khóa | DM_VITRI | kéo theo |
| DM_DONVI_VC | `id` | CCCD (cá nhân) hoặc MST (doanh nghiệp) | — | chặn nếu còn hợp đồng |
| DM_XE | `id` | biển số đã chuẩn hóa | DM_DONVI_VC | chặn nếu còn trong hợp đồng |
| Đội | `id` | tên đội trong lô; một Tổ trưởng chỉ ở một đội | Lô | chặn nếu còn phiếu cân gắn đội |
| Nhân công | `_id` (như hiện nay) | CCCD trong lô (một người một đội) | Đội | kéo theo |
| Hợp đồng VC | `id` | (lô, đơn vị); số hợp đồng | Lô | chặn nếu còn phiếu cân |
| Xe tham gia | (hợp đồng, xe) | biển số trong lô (một xe một hợp đồng) | Hợp đồng VC | chặn nếu còn phiếu cân |
| Phiếu cân | `_id` | số phiếu trong lô | Lô; tham chiếu Đội và Xe | — |

Không dùng số thứ tự hiển thị làm khóa. Mọi thao tác tạo cha kèm nhiều con (ví dụ nạp Excel nhân công cho đội) ghi trong **một** lần lưu (đã có giao dịch SQLite và lưu theo phần thay đổi).

## 4. Quy tắc nghiệp vụ dời về đúng chỗ

| Quy tắc | Hiện nay | Mới |
| --- | --- | --- |
| Danh sách vị trí | 3 chức danh cố định + chức danh thêm + định biên | chỉ DM_VITRI; vị trí ngoài định biên chuẩn có số người 0 |
| Định mức BHLĐ | theo chức danh | theo DM_VITRI (giữ phiên bản theo ngày) |
| Hình thức, cách tính, đơn giá | một bộ cho cả lô | mỗi đội một bộ |
| Khối lượng của đội | tổng lô chia theo số người, hoặc nhập tay (1.4.37) | **tổng phiếu cân của đội**; lô một đội: tổng phiếu cân của lô |
| Diện tích của đội (cách tính theo ha) | chia theo số người | nhập ở đội; tổng các đội phải bằng diện tích lô |
| Hợp đồng vận chuyển | gom xe theo người ký | bản ghi riêng, có số, ngày ký, cước, cự ly |
| Cước | chung lô | theo hợp đồng |
| Giấy tờ xe | nhập ở từng lô | danh mục xe; hạn kiểm định/bảo hiểm so với **ngày phiếu cân** của xe đó |
| Số và ngày văn bản | chung `exp` | hợp đồng khai thác, ủy quyền, nghiệm thu: ở đội; hợp đồng VC, xác nhận khối lượng, thanh toán VC: ở hợp đồng VC; các mẫu FSC, thẩm định, đào tạo: ở lô |

Thông tin bên ký và xe trong hợp đồng vận chuyển được **chụp lại lúc ký** (như cách đang làm với Công ty mua hàng): sửa danh mục sau đó không làm đổi hợp đồng đã in, chỉ báo “danh mục đã đổi” và cho chọn cập nhật.

## 5. Chuyển dữ liệu từ 1.4.x

Chạy một lần khi mở bằng bản 2.0, sau khi sao lưu file (cơ chế `truoc-nang-cap-*` hiện có), trong một giao dịch. Quy tắc:

1. **Vị trí**: gom mọi chức danh đang dùng (ba mặc định, chức danh thêm, định biên, định mức BHLĐ, đơn giá) thành DM_VITRI; vị trí không có trong định biên có số người 0.
2. **Đội**: lô có 0–1 Tổ trưởng → một đội gồm mọi người; nhiều Tổ trưởng → mỗi Tổ trưởng một đội theo cột Đội (đúng như `src/doi.js` đang làm). Mỗi đội nhận hình thức, cách tính, đơn giá của lô; số và ngày hợp đồng khai thác, ủy quyền, nghiệm thu của lô (lô nhiều đội: hậu tố .1, .2 như hiện nay).
3. **Phiếu cân**: lô một đội → gán đội đó. Lô nhiều đội → chưa gán đội (phiếu cũ không có thông tin đội); BM-08/BM-14 của từng đội là bản nháp cho đến khi gán đội (có công cụ gán hàng loạt). Riêng lô đã nhập khối lượng từng đội (1.4.37) hoặc chưa gán: giữ cách tính cũ để bản in cũ không đổi cho đến khi người dùng gán.
4. **Đơn vị vận chuyển và xe**: mỗi người ký (CCCD) → một đơn vị trong danh mục (gộp giữa các lô theo CCCD); mỗi biển số → một xe (gộp theo biển số). Cùng biển số mà giấy tờ khác nhau giữa các lô: danh mục giữ bản của lô có ngày khai thác mới nhất, hợp đồng của từng lô giữ **bản chụp** đúng dữ liệu cũ của lô đó.
5. **Hợp đồng vận chuyển**: mỗi (lô, người ký) → một hợp đồng; cước, cự ly, ngày bắt đầu của lô; số và ngày như hiện in.
6. **Khối lượng thực tế nhập tay** cũ: giữ ở lô như trường của bản cũ để bản in cũ không đổi; giao diện mới lấy khối lượng từ phiếu cân và báo nếu khác.

## 6. Biểu mẫu: không viết lại

Các hàm dựng BM-01…BM-20 hiện nhận một “hồ sơ” dạng cũ (`rec.info`, `rec.nc`, `rec.dx`, `rec.pc`, `rec.exp`). Thêm **lớp chuyển đổi** `src/model.js`:

- `toRec(lot, {doi})`: dựng hồ sơ dạng cũ cho một đội (nhân công của đội, hình thức và đơn giá của đội, phiếu cân của đội, số văn bản của đội);
- `toRec(lot, {hdvc})`: hồ sơ cho một hợp đồng vận chuyển (xe và cước của hợp đồng, phiếu cân của các xe đó).

**Tiêu chí nghiệm thu quan trọng nhất:** với mọi lô cũ trong dữ liệu thử (fixture 1.0.0, 1.4.x và dữ liệu của 59 bộ e2e), xuất **toàn bộ hồ sơ trước và sau khi chuyển dữ liệu phải giống từng byte**. Chỉ khi người dùng dùng chức năng mới (gán đội cho phiếu cân, cước khác nhau giữa hợp đồng…) thì bản in mới khác.

## 7. Giao diện

Điều hướng đào sâu, mỗi cấp có đường dẫn quay lại (breadcrumb), tiêu đề, các tab con suy ra từ cấu hình bảng (không viết tay từng màn):

- **Lô rừng** → tab *Thông tin rừng* · *Nhân công khai thác* (danh sách đội) · *Vận chuyển* (danh sách hợp đồng) · *Khối lượng thực hiện* (phiếu cân) · *Kiểm tra* · *Xuất hồ sơ*.
- **Đội** → *Thông tin đội* (hình thức, cách tính, đơn giá theo vị trí, số hợp đồng) · *Nhân công* (bảng, nhập tay / nạp Excel) · *Chấm công*.
- **Hợp đồng VC** → *Thông tin hợp đồng* (đơn vị, cước, cự ly, số, ngày) · *Xe* (chọn từ danh mục / nạp Excel).
- **Danh mục** (Cài đặt): *Vị trí & định mức nhân công* · *Định mức BHLĐ* · *Đơn vị vận chuyển & xe* · *Công ty mua hàng* · *Định mức gỗ keo*.
- **Phiếu cân**: cột Đội; lọc theo ngày, xe, hợp đồng, chưa gán đội → **Gán đội cho các phiếu đang lọc**.

Cấu hình bảng khai báo một chỗ (`label`, `parent`, `fields`, `columns`, `drill`), một bộ hàm vẽ bảng / form / lưu dùng chung. Repo HAK-Enterprise-Design-System hiện **chưa có** component master–detail mà skill nhắc tới (`components/master-detail.js`); sẽ dựng trong ứng dụng, sau đó có thể tách sang Design System.

## 8. Nạp Excel theo bảng

Mỗi bảng con một file mẫu, ghép với cha bằng **khóa nghiệp vụ**, không dùng ID nội bộ: nhân công ghép đội bằng tên đội (lô một đội bỏ trống); xe ghép hợp đồng bằng CCCD/MST đơn vị; phiếu cân ghép xe bằng biển số, ghép đội bằng tên đội. Xem trước thêm / sửa / giữ / lỗi như hiện nay (bản nháp “Chưa lưu”).

## 9. Kiểm thử

- Đơn vị: chuyển dữ liệu (0, 1, nhiều Tổ trưởng; người ký trùng CCCD khác lô; cùng biển số khác giấy tờ; dữ liệu 1.0.0), chạy lại không nhân đôi, khóa trùng, xóa bị chặn, tổng phiếu cân theo đội = tổng lô.
- **Bất biến bản in**: toàn bộ hồ sơ trước/sau chuyển dữ liệu giống từng byte cho mọi fixture và dữ liệu e2e.
- E2E: thêm đội / nhân công / hợp đồng VC / xe / phiếu cân qua giao diện; nạp Excel từng cấp; gán đội hàng loạt; hai đội khác hình thức trong một lô; hai hợp đồng khác cước; sửa danh mục xe sau khi ký (báo đổi, không đổi bản in); nâng cấp từ bộ cài thật 1.4.33.

## 10. Giai đoạn

| Giai đoạn | Nội dung | Kết quả kiểm được |
| --- | --- | --- |
| 1 | `src/model.js`: cấu trúc mới, chuyển dữ liệu, lớp chuyển đổi `toRec`; chưa đổi giao diện | bất biến bản in trên mọi fixture |
| 2 | Danh mục vị trí thống nhất; định mức BHLĐ, đơn giá theo DM_VITRI | màn Danh mục; e2e định mức |
| 3 | Đội khai thác + nhân công + chấm công (giao diện mẹ–con, nạp Excel theo đội) | e2e đội, hai hình thức trong một lô |
| 4 | Danh mục đơn vị VC + xe; hợp đồng VC + xe tham gia; cước theo hợp đồng | e2e hợp đồng VC, bản chụp khi ký |
| 5 | Phiếu cân có cột Đội, gán hàng loạt; khối lượng đội từ phiếu cân; hạn giấy tờ theo ngày phiếu cân | e2e khối lượng, BM-08/09/10/14 |
| 6 | Bỏ các ô và quy tắc cũ đã thay thế; tài liệu, hướng dẫn, bản phát hành 2.0 | trọn bộ e2e + nâng cấp bộ cài thật |

Mỗi giai đoạn một commit (hoặc vài commit) có kiểm thử chạy thật trước khi đẩy.

## 11. Điểm đã xác nhận (15/11/2026)

1. Đơn vị vận chuyển có thể là **doanh nghiệp** (MST, người đại diện) ngoài cá nhân chủ xe / tài xế.
2. Mỗi xe thuộc **một** hợp đồng vận chuyển trong một lô; cùng một xe có thể chạy cho **nhiều lô** (danh mục xe dùng chung).
3. Diện tích giao cho từng đội nhập ở đội, tổng các đội bằng diện tích lô; lô **một đội thì mặc định cả lô**.
4. Lô mới bỏ ô khối lượng thực tế nhập tay, **chỉ lấy từ phiếu cân**; lô cũ giữ trường cũ để bản in cũ không đổi.
5. Phiếu cân có cột Đội; lô một đội tự gán, không cần chọn; có **gán đội hàng loạt theo bộ lọc**.

## 12. Giai đoạn 1 — đã làm

`src/model.js` (hàm thuần, dùng chung giao diện và kiểm thử):
- `migrateDb(db)`: mỗi lô sang cấu trúc 2 (`doi`, `hdvc`, phiếu cân gán đội khi lô một đội); danh mục `dmViTri`, `dmDonViVC`, `dmXe` (gộp giữa các lô; trùng thì lô có ngày bắt đầu mới nhất thắng); chạy lại không đổi gì.
- `legacyDb(db2)` / `legacyForest(lô)`: dựng lại đúng dạng 1.4.x (thứ tự nhân công, xe; chấm công; số văn bản) để biểu mẫu hiện có đọc y nguyên.
- Chưa đổi giao diện và cách lưu: dữ liệu vẫn lưu dạng 1.4.x cho đến giai đoạn 3.

Kiểm thử: `tests/model.test.js` (cơ sở dữ liệu thật 1.0.0 và 1.4.x, dữ liệu e2e dùng chung, nhiều đội, nhiều người ký, gộp danh mục, vị trí, lô thiếu khóa); tự kiểm `HAKQN_CHECK_MODEL` chạy `legacyDb(migrateDb(db)) = db` sau **mọi lần lưu** của cả bộ e2e.

## 13. Giai đoạn 2 — danh mục vị trí thống nhất (đã làm)

- **Nguồn duy nhất**: bảng Định mức nhân công (`db.dinhBien`, `HAKDinhBien.danhMuc`). Chức danh nhân công, định mức BHLĐ, bảng đơn giá theo vị trí và hợp đồng đều lấy vị trí từ đây (`chucDanhAll` → `viTriRows`).
- **Số người 0** = vị trí ngoài định biên chuẩn của một đội: vẫn chọn được, có định mức BHLĐ và đơn giá; không tính vào “1 đội = N người”; nhiệm vụ không bắt buộc; so sánh định biên báo người giữ vị trí này là “ngoài định biên chuẩn”.
- **Chưa lưu định mức nhân công**: danh mục = Tổ trưởng + các vị trí cũ theo đúng thứ tự cũ (ba vị trí mặc định, vị trí thêm, khóa định mức BHLĐ) + định biên mặc định; không ghi gì vào dữ liệu cho đến khi người dùng bấm Lưu.
- **Đã lưu**: đúng các dòng đã lưu + vị trí còn được nhân công / đơn giá dùng mà chưa có (0 người).
- Màn Định mức BHLĐ **bỏ** ô thêm vị trí và nút xóa vị trí; thêm / đổi tên / xóa vị trí ở Định mức nhân công; xóa vị trí còn nhân công giữ thì không cho lưu.
- **Hợp đồng** (BM-01, BM-14, BM-20, BM-08) liệt kê vị trí đang có người hoặc đã có đơn giá (trước: luôn liệt kê ba vị trí mặc định cũ).
- Sửa kèm: BM-06 “Phân công nhiệm vụ theo vị trí” ghép nhiệm vụ theo **tên vị trí** (trước ghép theo số dòng — sẽ lệch khi danh mục có vị trí 0 người).

**So bản in với `main`** (4 bộ dữ liệu: giao khoán theo tấn, theo ha, trực tiếp, có vị trí thêm; 89 tài liệu Word): 87 giống từng byte; 2 khác (BM-01, BM-14 của lô có vị trí mặc định cũ không người và không đơn giá: không còn in dòng “……… (hiện chưa có người)” của vị trí đó) — đúng quy tắc mới.
