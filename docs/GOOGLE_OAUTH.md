# Đăng nhập Google để đồng bộ bảng tính giới hạn quyền xem

Bảng tính nguồn có thể để chế độ “Ai có liên kết đều xem được” (tải qua liên kết, không cần đăng nhập) hoặc **giới hạn quyền xem**. Với bảng giới hạn quyền, HAKQN dùng tài khoản Google đã được cấp quyền xem, **chỉ đọc**.

## Cách hoạt động
- Luồng OAuth 2.0 “ứng dụng máy tính” có PKCE: bấm **🔑 Đăng nhập Google (chỉ đọc)** trong màn hình Tra cứu → trình duyệt mặc định mở trang đăng nhập của Google → Google chuyển về địa chỉ `127.0.0.1` trên máy (cổng ngẫu nhiên, chỉ nhận một lần) → ứng dụng đổi mã lấy token.
- Quyền xin: `https://www.googleapis.com/auth/drive.readonly` (chỉ đọc; cần để xuất bảng tính ra .xlsx). Ứng dụng không ghi, không sửa, không đổi quyền chia sẻ.
- Mã làm mới (refresh token) chỉ lưu khi Windows mã hóa được (Electron safeStorage / DPAPI), trong `%APPDATA%\hakqn-ho-so-khai-thac\google-token.bin`. Nếu không mã hóa được thì chỉ giữ trong bộ nhớ, đóng ứng dụng là phải đăng nhập lại. Mật khẩu Google không bao giờ đi qua ứng dụng.
- **Đồng bộ ngay**: đã đăng nhập → tải qua Drive API; nếu API từ chối quyền thì thử tiếp liên kết công khai; chưa đăng nhập → tải qua liên kết công khai.
- Bản tra cứu chỉ được thay khi **cả ba vai trò** (tab `HoSoKeo`, `HoSoRung`, `ToaDoRung`, hoặc tên cũ có hậu tố `_QC`, hoặc tab khác tên được bạn xác nhận) đọc được và đủ cột bắt buộc. Mọi lỗi giữ nguyên bản đã lưu và báo nguyên nhân:

| Tình huống | Thông báo |
| --- | --- |
| Mất mạng / hết thời gian chờ | Không kết nối được …, bản tra cứu cũ vẫn được dùng |
| Phiên đăng nhập hết hạn hoặc bị thu hồi | Phiên đăng nhập Google đã hết hạn hoặc bị thu hồi, hãy đăng nhập lại (tự xóa mã đã lưu) |
| Tài khoản chưa được cấp quyền / Drive API chưa bật | Tài khoản đang đăng nhập chưa được cấp quyền xem bảng tính này |
| Sai liên kết / không có quyền | Không tìm thấy bảng tính hoặc không có quyền truy cập |
| Vượt hạn mức | Google tạm giới hạn lượt tải, thử lại sau |
| Thiếu tab hoặc đổi tên cột | Báo rõ tab và cột bị thiếu |

## Cấu hình cần bổ sung để chạy thật (chưa có trong repo)
Phải có “OAuth client ID” loại **Desktop app** do chủ dự án tạo trong Google Cloud Console (thông tin này không đưa vào mã nguồn):
1. Google Cloud Console → tạo/chọn project → **APIs & Services → Library** → bật **Google Drive API**.
2. **OAuth consent screen**: loại *Internal* nếu dùng Google Workspace của công ty (không cần Google duyệt), hoặc *External* ở chế độ Testing và thêm tài khoản được phép vào danh sách Test users. Thêm quyền `…/auth/drive.readonly`.
3. **Credentials → Create credentials → OAuth client ID → Desktop app**. Lấy `client_id` và `client_secret` (với ứng dụng máy tính, secret không được coi là bí mật tuyệt đối nhưng vẫn không nên đưa vào repo).
4. Trên máy dùng HAKQN, tạo file `%APPDATA%\hakqn-ho-so-khai-thac\google-oauth.json`:
   ```json
   {"clientId": "xxxx.apps.googleusercontent.com", "clientSecret": "xxxx"}
   ```
   hoặc đặt biến môi trường `HAKQN_GOOGLE_CLIENT_ID` và `HAKQN_GOOGLE_CLIENT_SECRET`.
5. Mở lại HAKQN → Tra cứu Google Sheets → **Đăng nhập Google** bằng tài khoản đã được chia sẻ bảng tính → **Đồng bộ ngay**.

Chưa có cấu hình này thì nút đăng nhập hiện dòng “Chưa cấu hình OAuth Google” và đồng bộ qua liên kết công khai vẫn dùng bình thường.

## Kiểm thử
- Tự động (`tests/google-auth.test.js`, 9 bài): máy chủ Google giả trên localhost kiểm tra PKCE, quyền chỉ đọc, mã hóa khi lưu, khởi động lại dùng mã đã lưu, đăng xuất xóa mã, từ chối cấp quyền, sai `state`, hết thời gian, token hết hạn giữa chừng (tự làm mới 1 lần), 403/404/429/500, bị thu hồi, mất mạng, nội dung không phải bảng tính.
- **Chưa kiểm thử với Google thật**: cần client ID thật và tài khoản được cấp quyền (xem mục trên).
