# Bảng ánh xạ cột nguồn → trường hồ sơ (đã triển khai)

Nguồn: Google Sheets (xuất .xlsx chỉ đọc) hoặc file Excel cùng cấu trúc. Nhận diện cột theo **tiêu đề** (không theo vị trí).
CCCD, mã khách hàng, mã hợp đồng, mã rừng, số phiếu cân, số giấy tờ, SĐT luôn lưu dạng văn bản; CCCD dạng số bị mất số 0 đầu được bù đủ 12 chữ số. Ngày → dd/mm/yyyy.

## Khóa ghép
| Cấp | Khóa | Ghi chú |
| --- | --- | --- |
| Chủ rừng | CCCD 12 số (bỏ hậu tố `_001`, `_002`) | `Mã khách hàng`, `Mã KH_CCCD`, `SoCCCD`; chỉ trùng tên thì không ghép |
| Rừng / hợp đồng | CCCD + mã hợp đồng | `Mã hợp đồng` (HoSoKeo_QC, HoSoRung_QC) = `Số hợp đồng` (ToaDoRung_QC). Một hợp đồng nhiều `Mã rừng` → người dùng chọn |
| Phiếu cân | `SỐ PHIẾU CÂN` | Đã có trong rừng → bỏ qua / cập nhật |

## HoSoRung_QC
| Cột nguồn | Trường đích | Quy tắc |
| --- | --- | --- |
| Họ và tên chủ rừng | Chủ rừng · Họ và tên | Bỏ hậu tố `_001` |
| Mã KH_CCCD | Chủ rừng · CCCD; Mã chủ rừng (khi tạo mới) | Chỉ điền CCCD khi đúng 12 chữ số |
| Ngày cấp, Nơi cấp | Chủ rừng · Ngày cấp, Nơi cấp CCCD | |
| Địa chỉ thường trú | Chủ rừng · Địa chỉ thường trú | Giữ riêng |
| Địa chỉ hiện tại, SĐT | Tham chiếu của rừng | Ứng dụng chưa có ô; SĐT “0” bỏ qua |
| ĐỊA CHỈ RỪNG | Rừng · Địa điểm khai thác | Khử chuỗi lặp “A, A” |
| HECTA | Rừng · Diện tích (ha) — lựa chọn 1 | So với ToaDoRung_QC |
| Định mức tấn/Ha | Rừng · Định mức (tấn/ha) | Nguồn hiện đang trống |
| Pháp lý rừng | Giấy tờ pháp lý (loại) | Chỉ dùng khi ToaDoRung_QC không có giấy tờ |
| Mã hợp đồng, Ngày ký, Ngày thanh lý, Mã thanh lý, Tình trạng, Tọa độ, Quy cách, Phương án, Năm trồng | Tham chiếu của rừng | Không dùng làm thời gian khai thác |

## ToaDoRung_QC
| Cột nguồn | Trường đích | Quy tắc |
| --- | --- | --- |
| Mã rừng | Rừng · Mã rừng | Không dùng `ID_RUNG` (lưu ở tham chiếu); kiểm tra trùng mã |
| DiaChiRungTrong | Rừng · Địa điểm | Khi HoSoRung_QC trống |
| DienTich_m2 | Rừng · Diện tích (ha) — lựa chọn 2 | ÷ 10.000, lấy một lần mỗi rừng (giá trị lặp ở mọi điểm GPS) |
| Latitude_Vĩ độ, Longtitude_Kinh độ | Rừng · Vĩ độ, Kinh độ WGS84 (điểm tâm) | Người dùng chọn điểm; nhận số thập phân, “15.605254N”, độ-phút-giây (quy đổi + gắn nhãn); ngoài khung VN (vĩ 8–24, kinh 102–110) hoặc không rõ định dạng → không dùng |
| HoSoNguonGoc, SoGiayTo, NgayGiayTo | Giấy tờ pháp lý (loại, số, ngày cấp) | “Giấy chứng nhận QSDĐ” → cùng loại; “Đơn xác nhận…” → Giấy xác nhận; khác → Khác |
| Số hợp đồng, SoCCCD, HoVaTenChuRung, ThuongTru | Ghép và đối chiếu | ThuongTru dùng khi HoSoRung_QC không có |

## HoSoKeo_QC
| Cột nguồn | Trường đích | Quy tắc |
| --- | --- | --- |
| SỐ PHIẾU CÂN | Phiếu cân · Số phiếu | Khóa chống trùng |
| Ngày nhập | Phiếu cân · Ngày cân | Đã xác nhận: Ngày nhập = ngày cân |
| Biển số 1 (= SỐ XE) | Phiếu cân · Biển kiểm soát | Dạng biển số thì dùng; tên xe → ghép biển số một lần (lưu bảng ghép) |
| Khối lượng (Tấn) | Phiếu cân · Khối lượng (tấn) | Ưu tiên; trống → KL hàng (KG) ÷ 1.000; lệch → “cần kiểm tra” |
| Đơn giá, Thanh toán | Chỉ hiển thị tham chiếu | Chưa dùng cho tiền công, cước, giá khoán |
| Tổng tấn các phiếu đã chọn | Rừng · Khối lượng khai thác thực tế | Chỉ khi người dùng chọn |
| Các cột khác | Chỉ lưu trong bản tra cứu | SỐ PHIẾU CHI (là ngày, không phải số), Hàng hóa, Giờ cân, Cân lần 1/2, Đại lý, Số BKLS… |

## Số liệu file HoSoKeo_QC.xlsx thật (đã chạy thử trên máy làm việc, không đưa vào mã nguồn)
14.636 phiếu cân, 494 dòng HoSoRung_QC, 835 điểm GPS (402 rừng). Nạp 2,6 giây; tìm kiếm khoảng 20 ms. Tọa độ: 57 điểm quy đổi được (độ-phút-giây hoặc kèm N/E), 51 điểm không dùng được (ngoài Việt Nam, Plus Code, nhiều tọa độ trong một ô, dấu chấm sai vị trí). Biển số: 10.381/14.636 phiếu đúng dạng, còn lại là tên xe cần ghép. 494/494 dòng HoSoRung_QC dựng được kết quả.

## Chờ người phụ trách xác nhận
- Viện dẫn pháp lý, nội dung FSC (BM-11 đến BM-19), định mức BHLĐ, cách xử lý thuế: giữ nguyên nghiệp vụ bản HTML.
- “Thanh toán” trong nguồn chỉ khớp công thức làm tròn của app (kg × đơn giá ÷ 1.000) ở khoảng 30% dòng: chưa dùng.
- Biển số chưa có trong danh sách xe của rừng: ghi được nhưng checklist báo lỗi (theo quy tắc hiện có).
