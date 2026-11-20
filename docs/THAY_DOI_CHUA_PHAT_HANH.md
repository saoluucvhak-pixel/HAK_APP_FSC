# Thay đổi chưa phát hành (sau 3.1.0)

Các mục dưới đây đã gộp vào `main` nhưng chưa có trong bản cài. Khi phát hành phiên bản kế tiếp, CEO_FSC chuyển nguyên các mục này thành mục phiên bản mới ở đầu `CHANGELOG.md` rồi xóa tệp này (`tests/phien-ban.test.js` không cho `CHANGELOG.md` có mục “Chưa phát hành” treo).

- Khôi phục bản sao lưu toàn bộ .json kiểm cấu trúc và phiên bản TRƯỚC khi xem trước hay ghi (lô 2 đợt sửa lỗi 3.1, T-11): lô hoặc chủ rừng sai dạng, danh sách nhân công/xe/phiếu cân sai dạng bị từ chối bằng tiếng Việt, nêu chủ rừng/lô bị lỗi; dữ liệu trên máy không đổi và không sinh bản “Trước khi khôi phục”. File thuộc phiên bản định dạng mới hơn bị từ chối (trước đây bị chuyển như dữ liệu cũ v1 và mất rừng). File thiếu số phiên bản mà đã có rừng giữ đủ rừng và danh mục công ty. File JSON hỏng báo “bị hỏng hoặc bị cắt dở”, không còn thông báo kỹ thuật tiếng Anh. Khi file có hồ sơ mâu thuẫn, màn xem trước không còn chọn sẵn “Thay toàn bộ dữ liệu”.
- Hiển thị số không nguyên trên màn hình theo kiểu Việt Nam: 1234,5 hiện “1.234,5” (trước đây “1.234.5”), 12,5 hiện “12,5” (T-04). Số tiền bằng chữ làm tròn đến đồng, không còn chữ “undefined” khi số tiền có phần lẻ.
