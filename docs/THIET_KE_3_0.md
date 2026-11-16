# Thiết kế 3.0 — Danh mục đối tượng, hợp đồng theo rừng, phiếu cân theo hợp đồng, phân bổ khối lượng

Nền: `main` sau v2.3.0 (SQLite v14). Phần mềm Windows vẫn chạy offline với SQLite; Google Sheets chỉ đồng bộ khi có mạng, bản đã lưu tra cứu được khi offline.

## 1. Đối chiếu với v2.3.0

| Hạng mục | v2.3.0 / main hiện tại | Hướng 3.0 |
| --- | --- | --- |
| Thanh chính | Có Cài đặt, Danh mục, Định mức; Hướng dẫn, bảng màu, sao lưu, khôi phục nằm ở “⋯ Thêm”. Ở cửa sổ 1024 px, 150%, thanh chính xuống hai dòng (“⋯ Thêm” một mình dòng dưới), chiếm ~1/5 chiều cao | Bỏ “⋯ Thêm”: các mục chuyển vào **Cài đặt** (Hướng dẫn, Giao diện, Sao lưu và khôi phục, Danh mục đối tượng, Danh mục xe) |
| Người / xe | Ba danh mục theo dòng lịch sử: `dmLaoDong` (người, CCCD), `dmXeVC` (xe kèm tài xế), `dmDoiTac` (doanh nghiệp / cá nhân ký); màn “Người (chung)” ghép ba danh mục theo CCCD | **Danh mục đối tượng** `dmDoiTuong` (pháp nhân / thể nhân, mỗi thể nhân có bảng con người — Đối tác) với vai trò Nhân công / Tài xế / Chủ xe và quyền ký; **Danh mục xe** `dmXe` (chủ xe theo ID). Ba danh mục cũ giữ nguyên trong SQLite làm bản lưu trữ, không sửa nữa; bỏ màn “Người (chung)” |
| Vị trí | Nối bằng **tên** (định biên, định mức BHLĐ, đơn giá theo vị trí, `nc.chucDanh`) | `dmViTri` [{id, ten}]; đổi tên vị trí = đổi một lần mọi bảng đang dùng tên đó (không đụng lô đã chốt / đã dừng); dòng nhân công có `viTriId` |
| Hợp đồng nhân công | `lô.doi` (đội) + `nc.doiId`; giao khoán / trực tiếp theo `hinhThuc.moHinhKy` | Giữ `doi` = **hợp đồng nhân công** (mỗi hợp đồng một đội). Thêm `benNhanKhoan` (đối tượng ký), `dinhBienDuKien`; dòng thành viên có `id`, `nguoiId`, `viTriId` |
| Hợp đồng vận chuyển | `lô.hdvc` (đội xe) + `dx.hdvcId`; người ký theo CCCD (`key`) hoặc `donViId` | Giữ `hdvc` = **hợp đồng vận chuyển**. Thêm `benKy` (đối tượng / người / đại diện); dòng xe có `id`, `xeId`, `taiXeId` |
| Phiếu cân | Thuộc lô; xe theo biển số; đội theo `pc.doiId` | Thuộc **hợp đồng vận chuyển** (`pc.hdvcId`, `pc.xeRowId`); định danh `pc.id` + khóa nghiệp vụ (số phiếu + ngày cân, không theo BKS) |
| Chấm công | `lô.cc` theo CCCD / họ tên | Theo **ID dòng thành viên** (một người ở hai đội có hai dòng) |
| Phân bổ khối lượng | Chia theo số người (`src/doi.js`) hoặc gán phiếu `pc.doiId` | `lô.phanBo.cheDo`: một đội → tất cả; hai đội → theo phiếu hoặc chia đều (1 kg dư theo thứ tự đội); ≥ 3 đội → theo phiếu |
| Dùng lại | Tra cứu Google Sheets (nhận tab theo cột, chọn tab khi nhiều tab, đổi biển trước khi đưa sang rừng), bản nháp + Lưu dữ liệu vào lô (`HAKStage`), khóa chỉ đọc, toàn vẹn hồ sơ đã chốt, kho sao lưu, in nền / in đè đợt 2 | Giữ nguyên, nối vào hợp đồng |

## 2. Nguyên tắc dữ liệu

1. **Lô giữ bản chụp**: dòng nhân công, xe, phiếu cân trong lô vẫn mang đủ thông tin dùng để in (họ tên, CCCD, BKS…). Danh mục chỉ là nguồn chọn; liên kết bằng ID (`nguoiId`, `xeId`, `viTriId`…). Nhờ vậy mọi biểu mẫu hiện có in **giống từng byte** sau chuyển đổi, và lô đã chốt in lại đúng dữ liệu lúc chốt.
2. **Chỉ tự liên kết khi khớp duy nhất**; còn lại giữ nguyên dữ liệu gốc và ghi vào **Cần đối chiếu** (`lô.canDoiChieu`, `db.canDoiChieu`) kèm lý do.
3. **Chuyển đổi một chiều, sau sao lưu, chạy lại không đổi** (SQLite v15 và `withDefaults` cho bản sao lưu JSON cũ). Lô đã chốt / đã dừng **không bị sửa** (giữ dấu vân tay của gói đã chốt); giao diện tự suy liên kết khi đọc.
4. **Mã định danh là văn bản**: CCCD, MST, mã đối tượng, số phiếu, BKS luôn lưu dạng chuỗi (giữ số 0 đầu).

## 3. Mô hình

```
db.dmDoiTuong = [{id, ma, ten, loai: 'phapnhan'|'thenhan', mst, diaChi, sdt,
                  kyHD: {vanChuyen, nhanCong}, daiDien, chucVuDaiDien, ngung, ngayCapNhat,
                  nguoi: [{id, hoTen, cccd, ngayCap, noiCap, hanCccd, diaChi, gioiTinh, ngaySinh, sdt,
                           gplx, hanGplx, viTriId, chucDanhKy, vaiTro: {nhanCong, taiXe, chuXe}, kyHD: {vanChuyen, nhanCong}, ngung}]}]
db.dmViTri    = [{id, ten, ngung}]
db.dmXe       = [{id, bks, ngayCapNhat, hanKiemDinh, hanBaoHiem, loaiXe, chuXeId, ngung}]     // chuXeId = id người (vai trò Chủ xe) hoặc id pháp nhân
lô.doi[]      += {benNhanKhoan: {doiTuongId, nguoiId}, dinhBienDuKien}
lô.nc[]       += {id, nguoiId, viTriId}                    // vaiTro = chức vụ trong đội, chucDanh = tên vị trí (bản chụp)
lô.hdvc[]     += {benKy: {doiTuongId, nguoiId}}
lô.dx[]       += {id, xeId, taiXeId}
lô.pc[]       += {id, hdvcId, xeRowId, bksNguon}
lô.cc         : khóa người = id dòng thành viên (dữ liệu cũ theo CCCD / họ tên chỉ chuyển khi xác định duy nhất)
lô.phanBo     = {cheDo: 'theoPhieu' | 'chiaDeu', luuLuc}
lô.canDoiChieu = [{loai, ref, lyDo, goc}]
```

## 4. Giai đoạn

| # | Nội dung | Kiểm thử |
| --- | --- | --- |
| P1 | Lõi thuần: `src/doituong.js`, `src/vitri.js`, `src/xedm.js`, `src/bks.js`, `src/phanbo.js` | test đơn vị |
| P2 | Liên kết trong lô, chuyển đổi v15, Cần đối chiếu | test chuyển đổi, so bản in giống từng byte |
| P3 | Kiểm quan hệ ở tầng lưu (mã `QUAN_HE`) | test Store |
| P4 | Cài đặt trên thanh chính; Danh mục đối tượng; Danh mục xe (nhập Excel có xem trước) | e2e |
| P5 | Danh sách hợp đồng → trang chi tiết (Nhân công, Vận chuyển) | e2e, ảnh cửa sổ hẹp |
| P6 | Phiếu cân trong hợp đồng vận chuyển | e2e |
| P7 | Phân bổ khối lượng | test + e2e |
| P8 | In, sao lưu lô, khôi phục | e2e |
| P9 | Nghiệm thu, ảnh, PR | — |
