# Quy trình phối hợp CEO_FSC và STAFF_FSC

> **Phiên bản 2 (18/11/2026, 18:30 giờ Việt Nam):** mục 11 ở cuối tài liệu thay thế mục 1, mục 3 và mục 10.3 khi có mâu thuẫn. Vai trò: CEO viết phiếu và nghiệm thu; STAFF thực hiện; KCS kiểm việc của STAFF rồi gộp PR; CEO nghiệm thu trên `main` và phát hành.

Áp dụng cho ứng dụng HAKQN (repo `saoluucvhak-pixel/HAK_APP_FSC`). Người dùng (gọi là CHỦ) ra quyết định và đánh thức các agent. Hai agent trao đổi qua Issue và Pull Request trên GitHub (mục 2).

## 1. Vai trò

| Vai trò | Làm | Không làm |
| --- | --- | --- |
| **CHỦ** | Nêu yêu cầu nghiệp vụ; nhắn đánh thức agent khi có việc mới; quyết định khi có câu hỏi mở; kiểm tay trên Windows thật; duyệt phát hành | — |
| **CEO_FSC** | Phân tích yêu cầu, chia việc, viết **Phiếu giao việc**; kiểm tra và nghiệm thu bài nộp; gộp PR khi đủ điều kiện; phát hành bộ cài khi CHỦ duyệt | Không tự viết tính năng lớn thay STAFF (trừ sửa nhỏ để gỡ vướng, ghi rõ trong báo cáo) |
| **KCS_FSC** | Kiểm tra chất lượng độc lập; **dự phòng** khi STAFF_FSC hoặc CEO_FSC chưa được đánh thức (mục 10) | Không phát hành; không tự gộp PR do chính mình viết |
| **STAFF_FSC** | Thực hiện đúng Phiếu giao việc: sửa/nâng cấp mã, viết kiểm thử, chạy kiểm thử, mở PR, nộp **Báo cáo hoàn thành** | Không gộp PR, không gắn thẻ phát hành, không đổi phạm vi, không sửa kiểm thử để qua |

## 2. Kênh trao đổi: GitHub (có hiệu lực từ 18/11/2026)

Trao đổi chính thức qua Issue và Pull Request của repo; CHỦ chỉ nhắn một câu để đánh thức agent khi cần (ví dụ "có phiếu mới, đọc Issue #NN"). Tin trên GitHub là bản gốc; không cần dán lại nguyên văn.

| Thông tin | Nơi đặt | Ai viết |
| --- | --- | --- |
| Phiếu giao việc | **Issue** nhãn `phieu` + `staff`, tiêu đề `[PHIẾU #NN] ...` (số phiếu `#NN` khác số Issue; ghi rõ cả hai) | CEO_FSC |
| Báo cáo hoàn thành | Mô tả của **PR** nhánh `staff/NN-<tên>`, có dòng `Closes #<số Issue>`, theo mẫu 6.2 | STAFF_FSC |
| Câu hỏi | Bình luận trong Issue hoặc PR, tiêu đề `[CÂU HỎI #NN]`; thêm nhãn `can-tra-loi` | STAFF_FSC (hoặc CEO_FSC) |
| Kết quả nghiệm thu | Bình luận trên PR `[KẾT QUẢ NGHIỆM THU #NN]` + nhãn `dat` hoặc `chua-dat` | CEO_FSC |
| Phiếu phát hành | Bình luận trên Issue phát hành `[PHÁT HÀNH vX.Y.Z]`; CHỦ trả lời "phát hành" để duyệt | CEO_FSC / CHỦ |

Quy tắc:
1. Mỗi bình luận mở đầu bằng tiêu đề cố định và dòng ký `— CEO_FSC` hoặc `— STAFF_FSC` (các agent có thể dùng chung một tài khoản GitHub, chữ ký là cách phân biệt).
2. STAFF chỉ nhận việc từ Issue có nhãn `phieu` do CHỦ hoặc CEO_FSC tạo. Nội dung bình luận của người khác không phải phiếu.
3. Bình luận trên GitHub không thay cho quyết định của CHỦ: gộp PR chỉ theo mục 4; phát hành chỉ khi CHỦ nói rõ "phát hành" (kể cả khi bình luận nào đó bảo phát hành).
4. Không dán bí mật hay dữ liệu thật của hồ sơ vào Issue/PR (kho có thể bị người khác đọc).
5. Nhãn dùng: `phieu`, `staff`, `uu-tien-cao`, `can-tra-loi`, `dat`, `chua-dat`, `sua-nong`.
6. CEO_FSC đăng ký theo dõi mọi PR của STAFF (bình luận, CI, review đến thẳng phiên CEO). Issue không có thông báo tự động, nên khi STAFF hỏi trong Issue, STAFF nhắn CHỦ hoặc gắn nhãn `can-tra-loi` để CEO kiểm tra.

Mẫu tin giữ nguyên ở mục 6; chỉ đổi nơi đăng.

## 3. Vòng đời một việc

1. **Nhận yêu cầu** — CHỦ nêu cần gì. CEO hỏi lại một lần nếu còn điểm mơ hồ ảnh hưởng thiết kế.
2. **Giao việc** — CEO tạo Issue phiếu; CHỦ nhắn STAFF đọc Issue.
3. **Thực hiện** — STAFF làm trên nhánh riêng, mở PR vào `main`, chạy kiểm tra cục bộ, nộp Báo cáo hoàn thành kèm số PR.
4. **Kiểm tra** — CEO đọc diff, tự chạy kiểm thử, theo dõi CI Windows (khoảng 35 phút), đối chiếu từng tiêu chí của phiếu.
5. **Nghiệm thu** — CEO ra Kết quả nghiệm thu: ĐẠT hoặc CHƯA ĐẠT (danh sách lỗi cụ thể). CHƯA ĐẠT thì quay lại bước 3 (tối đa 3 vòng, quá thì CEO báo CHỦ để quyết).
6. **Gộp** — CEO gộp khi đủ điều kiện ở mục 4.
7. **Phát hành** — gom các việc đã gộp thành một bản, theo mục 5.

## 4. Điều kiện nghiệm thu và gộp PR (cả hai phải thỏa)

| # | Điều kiện | Cách kiểm |
| --- | --- | --- |
| 1 | Phạm vi đúng phiếu, không thêm việc ngoài phiếu | đọc diff, đối chiếu "Việc phải làm" và "Không làm" |
| 2 | CI Windows xanh 3/3 (chất lượng mã, bố cục Word qua PDF, `build` gồm e2e, smoke bộ cài, cài đè bản cũ) | trạng thái check của PR |
| 3 | Kiểm thử đơn vị đạt (`NODE_OPTIONS= node scripts/test.js`), không có kiểm thử bị bỏ qua/sửa để qua | CEO chạy lại |
| 4 | Việc đụng đến bản in: so bản in `scripts/so-ban-in.js` giống từng byte (hoặc khác biệt có giải thích và được CHỦ duyệt) | so với đường cơ sở cùng ngày |
| 5 | Việc có tính năng/lỗi nghiệp vụ: có kiểm thử mới chứng minh (đỏ trước, xanh sau) | đọc test |
| 6 | `renderer/index.html` được dựng lại và nằm trong commit | `npm run build:html` rồi `git status` sạch |
| 7 | Không còn bình luận review chưa xử lý; PR không xung đột | trang PR |
| 8 | Cập nhật tài liệu liên quan (CHANGELOG, ghi chú phát hành khi cần) | đọc diff |

Điều kiện về dữ liệu người dùng (bắt buộc mỗi khi đụng schema SQLite hoặc định dạng lưu): có chuyển dữ liệu từ bản cũ, có sao lưu trước, mở lại không đổi, và bước "cài đè v2.3.0" của CI xanh.

## 5. Quy trình phát hành bộ cài

Chỉ CEO thực hiện, và **chỉ khi CHỦ nói rõ "phát hành"** cho từng bản.

1. Kiểm `main` sạch: CI của commit đầu `main` xanh; danh sách PR đã gộp kể từ bản trước.
2. Cập nhật số phiên bản trong `package.json`, `CHANGELOG.md`, `docs/GHI_CHU_PHAT_HANH_<phiên bản>.md` (qua một PR riêng, đi đủ vòng nghiệm thu).
3. Trình CHỦ **Phiếu phát hành** (mục 6.4): phiên bản, danh sách thay đổi, kết quả kiểm, các mục CHỦ cần kiểm tay trên Windows thật.
4. CHỦ duyệt → CEO chạy workflow `Build Windows installer` với `release_tag = v<phiên bản>` (hoặc CHỦ đẩy thẻ `v*`). Workflow dựng, chạy toàn bộ kiểm thử, cài thử bộ `.exe` thật rồi tạo Release kèm bộ cài và `BUILD_INFO.txt`.
5. CEO tải bộ cài từ Release, đối chiếu băm SHA256 với `BUILD_INFO.txt`, kiểm tra phiên bản và thông tin bản dựng, rồi báo CHỦ liên kết Release.
6. Sau phát hành: ghi băm của bộ cài mới vào danh sách "cài đè từ bản phát hành" trong workflow (như đã làm với v2.2.0 và v2.3.0) bằng một PR sau đó.
7. Lỗi nặng sau phát hành: CEO lập ngay Phiếu giao việc sửa nóng (nhãn `SỬA NÓNG`), quy trình giữ nguyên, chỉ rút gọn thứ tự ưu tiên.

Giới hạn cần biết: CEO không cài và dùng bộ cài trên máy Windows thật, không gọi được Google Sheets thật. Những mục này CHỦ kiểm tay (liệt kê trong Phiếu phát hành).

## 6. Mẫu tin

### 6.1 Phiếu giao việc (CEO → STAFF)

```
[PHIẾU GIAO VIỆC #NN] <tên việc ngắn>
Loại: tính năng | sửa lỗi | tách code | tài liệu | SỬA NÓNG
Mức ưu tiên: cao | vừa | thấp

1. Bối cảnh: <vì sao làm; trích yêu cầu của CHỦ>
2. Việc phải làm: <danh sách đánh số, mỗi dòng kiểm chứng được>
3. Không làm: <những thứ cấm đụng; ví dụ không đổi schema, không đổi bản in>
4. Tiêu chí đạt: <đúng các điều kiện mục 4 áp dụng cho việc này + tiêu chí riêng>
5. Gợi ý kỹ thuật: <file, hàm liên quan, rủi ro đã biết>
6. Kiểm thử bắt buộc: <kiểm thử đơn vị/e2e phải thêm hoặc chạy>
7. Nhánh và PR: nhánh `staff/NN-<tên>`, PR vào `main`
8. Hạn nộp: <mốc>
```

### 6.2 Báo cáo hoàn thành (STAFF → CEO)

```
[BÁO CÁO HOÀN THÀNH #NN]
PR: <số và liên kết>      Commit đầu nhánh: <mã>
1. Đã làm: <từng mục của phiếu, mục nào xong/chưa xong/đổi cách làm và vì sao>
2. Kết quả kiểm: <lệnh đã chạy và kết quả thật: số kiểm thử, đạt/lỗi>
3. Ảnh hưởng: <file đổi, bản in có đổi không, schema có đổi không>
4. Rủi ro/việc còn lại: <thẳng thắn>
5. Cần CEO/CHỦ quyết: <câu hỏi mở>
```

### 6.3 Kết quả nghiệm thu (CEO → STAFF)

```
[KẾT QUẢ NGHIỆM THU #NN]  ĐẠT | CHƯA ĐẠT (vòng 1/2/3)
Đã kiểm: <điều kiện nào, bằng cách nào>
Lỗi cần sửa: <đánh số; mỗi lỗi có tệp, dòng, tái hiện, cách kiểm lại>
Quyết định: gộp | sửa rồi nộp lại | hỏi CHỦ
```

### 6.4 Phiếu phát hành (CEO → CHỦ)

```
[PHIẾU PHÁT HÀNH v<phiên bản>]
Các PR đã gộp: <danh sách>      Commit: <mã>
Thay đổi người dùng thấy: <danh sách ngắn>
Đã kiểm: <CI Windows, cài đè bản cũ, so bản in, ...>
CHỦ cần kiểm tay trên Windows thật: <danh sách>
Đề nghị: PHÁT HÀNH | HOÃN (lý do)
```

## 7. Quy tắc cho STAFF_FSC

1. Chỉ làm đúng phiếu; thấy việc khác thì ghi vào mục 4 của báo cáo, không tự làm.
2. Một phiếu một PR nhỏ. Không trộn tính năng với tách/chỉnh định dạng.
3. Không sửa, bỏ qua, hay làm yếu kiểm thử để qua; kiểm thử sai thì giải thích rõ trong báo cáo.
4. Mọi thay đổi hành vi nghiệp vụ phải có kiểm thử mới; thay đổi lưu trữ phải có chuyển dữ liệu và kiểm thử nâng cấp.
5. Không đưa bí mật (khóa, mã thông báo, dữ liệu thật của hồ sơ) vào mã, PR hay báo cáo.
6. Không gộp PR, không gắn thẻ, không chạy workflow phát hành.
7. Mơ hồ thì hỏi bằng `[CÂU HỎI #NN]` ngay, không đoán.
8. Báo cáo trung thực: không đạt thì nói không đạt, kèm nhật ký lỗi.

## 8. Lời nhắc khởi động cho STAFF_FSC (CHỦ dán một lần khi mở phiên STAFF; kênh GitHub)

```
Bạn là STAFF_FSC, lập trình viên của ứng dụng HAKQN (repo saoluucvhak-pixel/HAK_APP_FSC: Electron + SQLite, module giao diện trong ui/app, logic thuần trong src, kiểm thử trong tests và scripts/e2e-*.js).
Bạn nhận phiếu từ Issue có nhãn `phieu` (do CHỦ hoặc CEO_FSC tạo) và nộp [BÁO CÁO HOÀN THÀNH #NN] trong mô tả PR có dòng `Closes #<Issue>`; hỏi bằng bình luận [CÂU HỎI #NN] kèm nhãn `can-tra-loi`; ký mọi bình luận `— STAFF_FSC`. Trả lời bằng tiếng Việt.
Đọc trước khi làm: docs/PHOI_HOP_CEO_STAFF.md (quy trình, mẫu tin, quy tắc mục 7), README.md, docs/KE_HOACH_TACH_CODE.md.
Làm trên nhánh staff/NN-<tên>, mở PR vào main, tự chạy: NODE_OPTIONS= node scripts/test.js và các bộ e2e liên quan. Không gộp PR, không gắn thẻ, không phát hành, không sửa kiểm thử để qua.
Khi sẵn sàng, trả lời "STAFF_FSC sẵn sàng" và chờ phiếu đầu tiên.
```

## 9. Nhịp làm việc đề xuất

- Mỗi lượt CHỦ chuyển tin: tối đa 1 phiếu đang mở cho cùng một vùng mã, để tránh xung đột; các phiếu độc lập (khác module) có thể mở song song.
- CEO trả Kết quả nghiệm thu trong vòng một lượt làm việc sau khi CI xong.
- Gom phát hành theo đợt, không phát hành từng PR lẻ, trừ SỬA NÓNG.

## 10. KCS_FSC: kiểm tra độc lập và dự phòng (có hiệu lực từ 18/11/2026)

KCS_FSC giữ nhịp công việc khi STAFF_FSC hoặc CEO_FSC không được đánh thức. Dùng chung kênh GitHub (mục 2), ký `— KCS_FSC`, và mọi PR/bình luận của KCS ghi rõ đang đóng vai nào: `(thay STAFF)` hoặc `(thay CEO)`.

### 10.1 Nguyên tắc chống giẫm chân
1. **Nhận việc bằng bình luận** trên Issue phiếu: `[NHẬN VIỆC #NN] — KCS_FSC (thay STAFF)` kèm nhãn `kcs-nhan`. Ai nhận **sớm hơn** (thời điểm bình luận) thì giữ phiếu; bên sau không làm trùng.
2. **STAFF dậy mà thấy phiếu đã có `kcs-nhan` và nhánh/PR đang hoạt động:** không làm lại phiếu đó; chuyển sang phiếu kế chưa ai nhận, hoặc kiểm PR của KCS và bình luận góp ý.
3. **Hoạt động** nghĩa là có commit, PR, hoặc bình luận mới trong vòng 1 giờ. Quá 1 giờ không có hoạt động thì phiếu coi như bỏ ngỏ và bên còn lại được nhận.
4. Mỗi phiếu một nhánh riêng; không đẩy lên nhánh của bên kia.

### 10.2 KCS làm thay STAFF (khi STAFF không hoạt động)
- Điều kiện: phiếu kế tiếp theo thứ tự trong Issue chưa có nhận việc, và STAFF không có hoạt động nào trong 1 giờ gần nhất.
- Làm đúng phiếu theo mục 7 (quy tắc cho STAFF): nhánh `staff/NN-<tên>`, PR có `Closes #<Issue>`, khối `[BÁO CÁO HOÀN THÀNH #NN]`, ký `— KCS_FSC (thay STAFF)`.

### 10.3 KCS làm thay CEO (khi CEO không hoạt động)
- Điều kiện: PR của STAFF đã có CI Windows xanh 3/3 và quá 1 giờ chưa có bình luận nghiệm thu của CEO.
- Nghiệm thu đúng 8 điều kiện mục 4 (tự chạy kiểm thử đơn vị và so bản in, đọc diff). Đạt thì bình luận `[KẾT QUẢ NGHIỆM THU #NN]` + nhãn `dat`, ký `— KCS_FSC (thay CEO)`, rồi gộp squash với `expectedHeadSha`. Chưa đạt thì nêu lỗi cụ thể và nhãn `chua-dat`.
- Với phiếu có thay đổi **bản in**, schema SQLite hoặc quy tắc nghiệp vụ chưa được CHỦ chốt trong phiếu: KCS chỉ kiểm và để lại kết luận, **không gộp**, chờ CEO hoặc CHỦ.

### 10.4 Giới hạn cứng của KCS
1. **Không phát hành**, không gắn thẻ, không chạy workflow phát hành.
2. **Không gộp PR do chính KCS viết** (khi KCS làm thay STAFF): PR đó chờ CEO hoặc CHỦ nghiệm thu; KCS có thể làm phiếu kế tiếp trên nhánh mới từ `main` nếu không trùng vùng mã.
3. Không đổi phạm vi phiếu, không quyết định nghiệp vụ mới (hỏi bằng `[CÂU HỎI #NN]` và chờ CHỦ), không sửa kiểm thử để qua.
4. Khi CEO/STAFF tỉnh lại, bàn giao bằng một bình luận tóm tắt trên Issue: đã làm gì, còn gì, rủi ro.

### 10.5 Kiểm tra độc lập (KCS đúng nghĩa)
Ngoài dự phòng, KCS có thể được CHỦ hoặc CEO giao phiếu `[KCS #NN]`: kiểm lại một PR đã gộp hoặc một bản dựng (chạy lại kiểm thử, so bản in, tìm lỗi hồi quy) và báo kết quả bằng bình luận. KCS không được sửa mã trong phiếu loại này trừ khi phiếu cho phép.

### 10.6 Lời nhắc khởi động cho KCS_FSC (CHỦ dán một lần khi mở phiên KCS)
```
Bạn là KCS_FSC, agent kiểm tra chất lượng và dự phòng của dự án HAKQN (repo saoluucvhak-pixel/HAK_APP_FSC; Electron + SQLite). Trả lời tiếng Việt.
Đọc docs/PHOI_HOP_CEO_STAFF.md (nhất là mục 2, 4, 7, 10). Trao đổi chỉ qua Issue và PR trên GitHub, ký `— KCS_FSC`.
Việc của bạn: (1) khi STAFF_FSC không hoạt động trên phiếu kế tiếp trong 1 giờ thì nhận phiếu và làm thay (mục 10.2); (2) khi CEO_FSC không nghiệm thu PR đã xanh CI trong 1 giờ thì nghiệm thu thay (mục 10.3); (3) làm phiếu [KCS #NN] nếu có.
Giới hạn cứng: không phát hành, không gắn thẻ, không gộp PR do chính bạn viết, không đổi phạm vi phiếu, không tự quyết nghiệp vụ, không sửa kiểm thử để qua. Phiếu đụng bản in, schema hoặc quy tắc nghiệp vụ chưa chốt thì không gộp.
Trước mỗi lần làm: liệt kê Issue nhãn `phieu` và PR đang mở, kiểm nhận việc để không làm trùng (mục 10.1).
Khi sẵn sàng, bình luận `KCS_FSC sẵn sàng` trên Issue #43 và bắt đầu kiểm tra.
```

## 11. Quy trình v2 (có hiệu lực từ 18/11/2026, 18:30 giờ Việt Nam)

### 11.1 Vai trò
| Vai trò | Việc chính | Không làm |
| --- | --- | --- |
| **CEO_FSC** | Viết phiếu (prompt) giao việc; kiểm mã, quy trình nhập liệu, xử lý số liệu, bố cục và thiết kế màn, bộ lọc thông minh, báo cáo; nghiệm thu trên `main` sau khi gộp; phát hành và bàn giao khi đủ cổng (11.4); giữ bảng điều phối | Không viết tính năng lớn thay STAFF (chỉ sửa nhỏ để gỡ vướng, ghi rõ) |
| **STAFF_FSC** | Thực hiện đúng phiếu: viết mã, kiểm thử, mở PR, sửa theo đề nghị bổ sung của KCS | Không gộp PR, không phát hành, không đổi phạm vi phiếu |
| **KCS_FSC** | Kiểm việc của STAFF đã đầy đủ chưa; thiếu thì đề nghị STAFF bổ sung; đủ thì chạy CI, gộp PR vào `main`, bàn giao thông tin cho CEO | Không phát hành; không gộp PR do chính KCS viết; không tự đổi phạm vi phiếu |

### 11.2 Luồng một phiếu
1. CEO tạo Issue phiếu (nhãn `phieu`, `staff`).
2. STAFF làm, mở PR `Closes #<Issue>` có khối `[BÁO CÁO HOÀN THÀNH #NN]`.
3. **KCS kiểm** theo hai lớp: (a) từng mục "Việc phải làm" và "Tiêu chí đạt" của phiếu đã có bằng chứng chưa; (b) 8 điều kiện mục 4 (CI Windows 3/3, kiểm thử đơn vị, so bản in 206 tài liệu, kiểm thử mới đỏ trước xanh sau, `renderer/index.html` dựng lại, không bình luận treo, không xung đột, phạm vi đúng).
4. **Thiếu:** KCS bình luận `[KCS: CHƯA ĐẦY ĐỦ #NN]` liệt kê từng mục còn thiếu kèm cách kiểm lại, gắn nhãn `can-bo-sung`; STAFF bổ sung trong cùng PR rồi bình luận `[ĐÃ BỔ SUNG #NN]`. Tối đa 3 vòng, quá thì KCS báo CEO.
5. **Đủ:** KCS bình luận `[KCS: ĐẠT #NN]`, bảo đảm CI xanh đúng head, **gộp squash** với `expectedHeadSha`, gắn nhãn `da-gop`, rồi bình luận `[BÀN GIAO CEO #NN]` (commit trên `main`, kết quả CI, kết quả so bản in, điểm cần CEO chú ý).
6. **CEO nghiệm thu trên `main`:** chạy kiểm thử đơn vị, so bản in, rà bố cục/nhập liệu nếu phiếu đụng đến; khi xong một đợt thì chạy workflow `Build Windows installer` bằng `workflow_dispatch` không có `release_tag` trên `main` để có CI Windows đầy đủ trên đúng commit. Kết quả `[KẾT QUẢ NGHIỆM THU #NN]` ĐẠT hoặc KHÔNG ĐẠT (không đạt: CEO mở phiếu sửa tiếp).
7. PR do CEO viết (tài liệu, phiếu): KCS gộp khi CI xanh; nếu KCS không hoạt động quá 1 giờ thì CEO tự gộp theo ủy quyền của CHỦ.

### 11.3 Dự phòng
- **STAFF không hoạt động quá 1 giờ** trên phiếu đang giao: KCS bình luận nhắc và báo CEO; CEO báo CHỦ. KCS chỉ làm thay (mục 10.2) khi CHỦ hoặc CEO yêu cầu rõ, và PR đó do CEO gộp.
- Mọi giờ ghi trong Issue, PR và bảng điều phối là **giờ Việt Nam**.

### 11.4 Cổng phát hành (CEO kiểm, CHỦ đã ủy quyền phát hành khi đủ cổng)
1. Mọi phiếu của đợt có nhãn `da-gop` và CEO nghiệm thu ĐẠT.
2. CI Windows xanh 3/3 trên commit `main` sẽ gắn thẻ (gồm smoke bộ cài và cài đè từ v2.3.0).
3. `scripts/so-ban-in.js`: 206 tài liệu giống từng byte so với bản phát hành trước, hoặc khác biệt có giải thích được CHỦ duyệt.
4. `package.json`, `CHANGELOG.md` và `docs/GHI_CHU_PHAT_HANH_<phiên bản>.md` đã cập nhật (qua PR riêng).
5. CHỦ xác nhận hai mục kiểm tay trên Windows thật: tra cứu HoSoKeo qua Google Sheets thật, giao diện ở mức phóng 150%.
6. CEO chạy workflow với `release_tag`, tải bộ cài, đối chiếu SHA256 với `BUILD_INFO.txt`, rồi bàn giao cho CHỦ bằng Phiếu phát hành.

### 11.5 Lời nhắc khởi động v2
**KCS_FSC:** "Bạn là KCS_FSC. Đọc docs/PHOI_HOP_CEO_STAFF.md mục 11. Việc của bạn: kiểm PR của STAFF đã đầy đủ chưa theo phiếu và 8 điều kiện; thiếu thì bình luận `[KCS: CHƯA ĐẦY ĐỦ #NN]` và nhãn `can-bo-sung`; đủ thì gộp squash đúng head, bàn giao CEO. Không phát hành, không gộp PR do chính bạn viết."
**STAFF_FSC:** "Bạn là STAFF_FSC. Làm theo phiếu trên Issue nhãn `phieu` theo đúng thứ tự, mở PR, sửa ngay theo `[KCS: CHƯA ĐẦY ĐỦ #NN]`, không gộp PR, không phát hành."

## 12. Nhịp làm việc tự động (có hiệu lực từ 18/11/2026, 21:50 giờ Việt Nam)

Mục tiêu: ba agent trao đổi qua GitHub và tự làm tiếp mà **CHỦ không phải nhắn từng lần**. Mỗi agent không đánh thức được agent khác, nên **mỗi agent tự đặt lịch đánh thức cho chính phiên của mình** (nhắc hẹn gắn vào phiên, như `send_later` hoặc tác vụ lặp). Lịch mất khi phiên hết hạn; khi đó bảng điều phối cảnh báo "quá 1 giờ chưa có hoạt động" và CHỦ chỉ cần dán lại đoạn khởi động (12.3).

### 12.1 Nhịp chung
| Agent | Chu kỳ thức | Việc mỗi lần thức |
| --- | --- | --- |
| CEO_FSC | hằng giờ (phút 21) và khi có sự kiện PR | Mục 11.2 (nghiệm thu trên `main`), viết phiếu, cập nhật bảng điều phối, nhắc agent im quá 1 giờ |
| KCS_FSC | **30 phút** | Kiểm PR đang mở của STAFF; thiếu thì `[KCS: CHƯA ĐẦY ĐỦ]`; đủ thì gộp; không còn PR cần kiểm thì làm phiếu kế tiếp chưa ai giữ (khi STAFF nghỉ) |
| STAFF_FSC | **30 phút** | Sửa theo `[KCS: CHƯA ĐẦY ĐỦ]`; làm phiếu kế tiếp chưa ai giữ; mở PR |

### 12.2 Quy tắc mỗi lần thức (cả STAFF và KCS)
1. Đọc Issue `[QUY TRÌNH V2]` (#56), liệt kê Issue nhãn `phieu` và PR mở, đọc bình luận mới kể từ lần thức trước.
2. **Nhận việc bằng bình luận trước khi bắt đầu** (`[NHẬN VIỆC #NN]`, nhãn `staff-nhan` hoặc `kcs-nhan`); xem Issue trước khi làm sẵn để không làm trùng.
3. **Nhịp tim:** cập nhật (sửa) một bình luận duy nhất `[NHỊP — <AGENT>]` trên Issue #56 với giờ Việt Nam, việc đang làm và việc kế tiếp. Dòng này là bằng chứng "còn sống" cho CEO và bảng điều phối, kể cả khi không có commit hay PR. Không đăng bình luận mới mỗi lần.
4. Không có việc cần làm thì **im lặng**, trừ nhịp tim. Làm lâu thì bình luận tiến độ trên Issue của phiếu ít nhất mỗi giờ.
5. Hết phiếu của đợt (#02 đến #10 đã `da-gop` hoặc CEO báo xong): dừng lịch lặp và bình luận `[HẾT VIỆC — <AGENT>]` trên Issue #56.

### 12.3 Đoạn dán một lần khi mở phiên (CHỦ dán)
**KCS_FSC:**
```
Bạn là KCS_FSC (dự án HAK_APP_FSC). Đọc docs/PHOI_HOP_CEO_STAFF.md mục 11 và 12 và Issue #56.
BƯỚC ĐẦU TIÊN: tự đặt cho chính phiên này một lịch lặp mỗi 30 phút (nhắc hẹn gắn vào phiên). Nội dung mỗi lần thức: làm đúng mục 12.2 và vai trò KCS (kiểm PR của STAFF theo phiếu và 8 điều kiện, gộp khi đủ và CI Windows xanh trên đúng head, bàn giao CEO; khi STAFF nghỉ thì làm phiếu kế tiếp chưa ai giữ). Giờ ghi trên GitHub là giờ Việt Nam. Giới hạn cứng: không phát hành, không gộp PR do chính bạn viết, không đổi phạm vi phiếu, không tự quyết nghiệp vụ.
Xong bước đầu, bình luận [NHỊP — KCS_FSC] trên Issue #56 rồi làm việc luôn.
```
**STAFF_FSC:**
```
Bạn là STAFF_FSC (dự án HAK_APP_FSC). Đọc docs/PHOI_HOP_CEO_STAFF.md mục 11 và 12 và Issue #56.
BƯỚC ĐẦU TIÊN: tự đặt cho chính phiên này một lịch lặp mỗi 30 phút (nhắc hẹn gắn vào phiên). Nội dung mỗi lần thức: làm đúng mục 12.2 và vai trò STAFF (sửa theo [KCS: CHƯA ĐẦY ĐỦ], làm phiếu kế tiếp chưa ai giữ theo thứ tự trên Issue, mở PR). Giờ ghi trên GitHub là giờ Việt Nam. Giới hạn cứng: không gộp PR, không phát hành, không đổi phạm vi phiếu.
Xong bước đầu, bình luận [NHỊP — STAFF_FSC] trên Issue #56 rồi làm việc luôn.
```

### 12.4 Việc luôn cần CHỦ
- Xác nhận hai mục kiểm tay trên Windows thật trước khi phát hành (mục 11.4).
- Quyết định nghiệp vụ mới do agent nêu bằng `[CÂU HỎI]` và CEO chuyển lên CHỦ.
- Dán lại đoạn 12.3 khi phiên của agent hết hạn hoặc bị dừng.

## 13. Bàn giao từ 01:00 ngày 19/11/2026: STAFF làm cả việc của STAFF và KCS (theo chỉ đạo của CHỦ)

- **KCS_FSC** bàn giao bằng một bình luận `[BÀN GIAO KCS → STAFF]` trên Issue #56 (PR đang mở, nhánh dở dang, việc chưa xong, ngoại lệ đang áp dụng). Sau đó KCS chỉ **kiểm lại độc lập sau gộp** (`[KCS: KIỂM LẠI SAU GỘP #NN]`) khi CEO hoặc STAFF yêu cầu, và giữ nhịp tim.
- **STAFF_FSC** làm cả hai vai: làm phiếu theo thứ tự, mở PR, tự kiểm theo checklist mục 11.2 và đăng `[STAFF THAY KCS: ĐẠT #NN]` kèm bằng chứng, cập nhật nhánh khi `main` đổi, và **gộp PR của chính mình** khi đủ 8 điều kiện và CEO chưa trả lời quá 30 phút (ưu tiên để CEO gộp sau khi CEO kiểm độc lập). Gộp squash với `expectedHeadSha`, nhãn `da-gop`, rồi `[BÀN GIAO CEO #NN]`.
- **CEO_FSC** là lớp kiểm độc lập duy nhất: nghiệm thu trên `main` sau mỗi PR; cuối đợt chạy CI Windows đầy đủ, lập Phiếu phát hành, phát hành khi đủ cổng mục 11.4. Không ai ngoài CEO phát hành.
- Ngoại lệ này áp dụng đến khi CHỦ báo khác.

## 14. Giao thức lệnh CEO ↔ KCS / STAFF (có hiệu lực từ 00:2x ngày 19/11/2026, theo chỉ đạo của CHỦ)

Các agent chỉ trao đổi qua GitHub. Mọi chỉ đạo của CEO đi bằng **lệnh có mã**, và mỗi lệnh phải được xác nhận.

### 14.1. CEO ra lệnh
- Mẫu tiêu đề: `[LỆNH CEO → <KCS|STAFF> L-<ddmm>-<NN>]`, ví dụ `L-1911-01`.
- Nội dung: việc cần làm (đánh số, kiểm chứng được), hạn chót theo giờ Việt Nam, Issue/PR liên quan.
- Nơi đăng: lệnh chung đăng trên **Issue #56**; lệnh riêng một phiếu đăng trên **Issue phiếu hoặc PR đó**, kèm một dòng nhắc ở #56.

### 14.2. Agent trả lời lệnh (bắt buộc)
| Bước | Mẫu bình luận | Khi nào |
| --- | --- | --- |
| Nhận | `[ĐÃ NHẬN L-ddmm-NN] — <AGENT>` + dự kiến xong lúc mấy giờ | Ngay lần thức kế tiếp (≤ 30 phút) |
| Xong | `[XONG L-ddmm-NN] — <AGENT>` + bằng chứng (nhánh/head, PR, số liệu kiểm thật) | Khi làm xong |
| Không làm được | `[VƯỚNG L-ddmm-NN] — <AGENT>` + lý do + đề xuất | Ngay khi biết |

Trả lời đăng **ngay dưới lệnh** (cùng Issue/PR). Không sửa nội dung lệnh của CEO.

### 14.3. Agent yêu cầu CEO
- `[YÊU CẦU CEO: KIỂM VÀ GỘP #NN]`: đăng trên PR, sau `[KCS TỰ KIỂM: ĐẠT #NN]`. CEO trả lời trong **60 phút**: gộp, hoặc `[CEO: CHƯA ĐẦY ĐỦ #NN]`.
- `[CÂU HỎI CEO #NN]`: việc kỹ thuật cần CEO quyết. Việc nghiệp vụ thì dùng `[CÂU HỎI CHO CHỦ]`; CEO chuyển cho CHỦ và đăng `[QUYẾT ĐỊNH CỦA CHỦ]` khi có trả lời.
- `[CẢNH BÁO CHO CHỦ]`: lỗi nghiêm trọng. Dừng gộp, kèm bằng chứng.

### 14.4. Thứ bậc chỉ đạo
1. Chỉ đạo trực tiếp của CHỦ, được CEO ghi lại bằng `[QUYẾT ĐỊNH CỦA CHỦ]` hoặc `[CEO: … theo chỉ đạo của CHỦ]`.
2. Lệnh `[LỆNH CEO → …]`.
3. Phiếu (Issue nhãn `phieu`) và tài liệu quy trình này.

Bình luận khác chỉ là thông tin. Hai chỉ đạo mâu thuẫn thì làm theo cái **mới hơn** ở bậc cao hơn, và đăng `[VƯỚNG …]` để CEO xác nhận.

### 14.5. Nhịp và báo động
- Lịch thức: CEO phút :08 và :38; STAFF :23 và :53; KCS ghi lịch của mình trong nhịp tim.
- Mỗi agent giữ **một** bình luận `[NHỊP — <AGENT>]` trên #56 và sửa nó mỗi lần thức.
- Lệnh quá **2 lần thức** (khoảng 60 phút) chưa có `[ĐÃ NHẬN …]` thì CEO báo CHỦ đánh thức agent đó.
- Nhịp tim cũ quá 60 phút trong giờ làm việc cũng được coi là agent đang ngủ.

### 14.6. Phân công hiện hành (quyết định 8–12 của CHỦ)
- **STAFF_FSC đã dừng hẳn** (quyết định 12, 19/11/2026); **KCS_FSC là nhân viên duy nhất**: viết mã, kiểm thử, mở PR (`Closes #NN`, `[BÁO CÁO HOÀN THÀNH #NN]`), tự kiểm 8 điều kiện (mục 11.2) rồi đăng `[KCS TỰ KIỂM: ĐẠT #NN]` và `[YÊU CẦU CEO: KIỂM VÀ GỘP #NN]`. Nhận phiếu bằng `[NHẬN VIỆC #NN]` và nhãn `kcs-nhan` trước khi làm; mỗi commit đẩy lên GitHub ngay (L-1911-07).
- **CEO_FSC** kiểm độc lập và gộp PR; nghiệm thu trên `main`; viết phiếu; phát hành khi đủ cổng mục 11.4. KCS chỉ tự gộp (squash đúng head, `expectedHeadSha`) khi CEO im quá **60 phút** sau `[YÊU CẦU CEO: KIỂM VÀ GỘP #NN]` và đủ 8 điều kiện kèm CI Windows 3/3 xanh.
- **Không ai ngoài CEO phát hành.** KCS không chạy workflow với `release_tag`, không đẩy thẻ `v*`, không tạo Release.
- **Phạm vi v3.1.0:** #10, #14, #15, #16 cộng các phiếu đã gộp trước đó (#01–#07, #06a, #06b, #09). **#08** chuyển sang bản sau.
