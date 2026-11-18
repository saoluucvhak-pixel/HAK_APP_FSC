[PHIẾU GIAO VIỆC #01] Rà soát toàn diện trước khi sửa (chỉ rà soát, chưa sửa mã)
Loại: tài liệu / rà soát        Mức ưu tiên: cao

1. Bối cảnh
CHỦ yêu cầu: hoàn thiện và nâng cấp mã; kiểm tra quy trình và sửa lỗi quy trình nhập liệu, xử lý số liệu; tránh trùng lắp nhập liệu và số liệu; thiết kế giao diện và bố cục các màn cho chuyên nghiệp; mã phải được nghiệm thu rồi phát hành bộ cài. Phạm vi rộng nên bước đầu CHƯA sửa mã: STAFF rà soát có bằng chứng để CEO chia các phiếu sửa nhỏ, đúng trọng tâm.
Trạng thái nền: nhánh `main` ở phiên bản 3.0.0 (chưa phát hành; bản công khai gần nhất v2.3.0). Mã đã tách module (ui/app/NN-*.js, src/*.js). Kiểm thử đơn vị: 548 (547 đạt, 1 bỏ qua). e2e: 116 bộ.

2. Việc phải làm (nộp một tệp báo cáo duy nhất: docs/RA_SOAT_01.md)
A. Quy trình nhập liệu: đi hết đường nhập của một hồ sơ từ đầu đến cuối (chủ rừng, lô, rừng, hợp đồng nhân công/vận chuyển, đội, xe, phiếu cân, đợt 1/2, xuất hồ sơ). Với mỗi bước ghi: màn nào, trường nào, có bắt buộc không, kiểm tra hợp lệ thế nào, lỗi hiển thị ra sao. Liệt kê chỗ: nhập trùng cùng một thông tin ở hai nơi; trường có thể nhập tay trong khi có sẵn từ nguồn khác; bước dễ làm sai; thông báo lỗi khó hiểu.
B. Trùng lắp dữ liệu: tìm mọi chỗ có thể sinh bản ghi trùng (người, xe/BKS, phiếu cân, hợp đồng, lô, số văn bản, mã rừng). Với từng đối tượng ghi: khóa nhận diện đang dùng, chặn trùng ở tầng nào (giao diện, lõi src, SQLite), tình huống nào lọt (nhập Excel, khôi phục sao lưu, hợp nhất dữ liệu, sửa BKS, đổi tên). Mỗi ca lọt: ghi bước tái hiện cụ thể.
C. Xử lý số liệu: kiểm các phép tính khối lượng, làm tròn, phân bổ, định mức, đơn giá, tổng hợp báo cáo. Ghi: công thức, nơi tính (file, hàm), nơi tính lặp lại ở chỗ khác, ca có thể ra số khác nhau giữa các màn/bản in. Tìm hai nơi cùng tính một đại lượng bằng hai công thức.
D. Giao diện và bố cục: mở từng màn chính ở độ phân giải 1366x768, 1920x1080 và hệ số phóng 100/125/150%. Chụp ảnh (scripts/anh-man-hinh.js hoặc tương đương), ghi: tràn/cắt chữ, thanh cuộn ngang, nút lệch, màu tương phản kém, khoảng cách và căn lề không đều, nhãn không nhất quán, tiêu đề màn thiếu, cỡ chữ, thứ tự Tab. Xếp mức: nặng (không dùng được) / vừa / nhẹ.
E. Chất lượng mã: file hơn 40 KB hoặc dòng hơn 300 ký tự (chạy node scripts/kiem-kich-thuoc.js), mã trùng lặp giữa các module, hàm quá dài, biến toàn cục còn lại, kiểm thử còn yếu hoặc bị bỏ qua.
F. Đề xuất: danh sách việc sửa, mỗi việc có: mã (ví dụ ND-01), mô tả một câu, vị trí, mức nghiêm trọng (nặng/vừa/nhẹ), công sức (nửa ngày / 1 ngày / nhiều ngày), rủi ro, cách kiểm chứng.

3. Không làm
- Không sửa mã ứng dụng, kiểm thử, kịch bản CI, dữ liệu mẫu. Chỉ thêm tệp báo cáo (và ảnh trong docs/ra-soat-01/).
- Không đổi lược đồ SQLite, không đổi bản in.
- Không nêu lỗi mà không có bước tái hiện hoặc dẫn chứng (tệp:dòng, ảnh, kết quả lệnh).

4. Tiêu chí đạt
- Đủ sáu phần A–F, mỗi phát hiện có dẫn chứng kiểm lại được.
- Phần F xếp theo ưu tiên, nêu rõ việc nào nên gộp, việc nào độc lập nhau (để chia phiếu song song).
- Phân biệt "đã xác minh bằng chạy thử" và "suy luận từ đọc mã".
- PR chỉ gồm tệp báo cáo và ảnh; CI xanh 3/3.

5. Gợi ý kỹ thuật
- Đọc: docs/THIET_KE_3_0.md, docs/QUY_TRINH_NHAP_3_0.md, docs/QUY_TRINH_HO_SO.md, docs/GHI_CHU_PHAT_HANH_3.0.0.md, docs/KET_QUA_NGHIEM_THU_R4_R5.md.
- Lõi dữ liệu: src/store.js (SQLite v15), src/vongdoi.js (kiểm toàn vẹn), src/bannhap.js (bản nháp), src/kiemtranhieudoi.js (kiểm nhiều đội).
- Công cụ: node scripts/test.js; xvfb-run -a node scripts/e2e-all.js <bộ>; scripts/anh-man-hinh.js; scripts/so-ban-in.js.
- Chạy Electron trên Linux cần xvfb-run -a và NODE_OPTIONS= (rỗng).

6. Kiểm thử bắt buộc
- Chạy node scripts/test.js trước và sau; kết quả phải như nền (548 tổng, 547 đạt).
- Với mỗi ca trùng lắp ở phần B nên viết sẵn bước tái hiện dạng kịch bản (nằm trong báo cáo, chưa đưa vào kiểm thử).

7. Nhánh và PR
Nhánh staff/01-ra-soat, PR vào main, tiêu đề "Rà soát 01: quy trình nhập liệu, trùng lắp, số liệu, giao diện, chất lượng mã".

8. Hạn nộp
Trong một lượt làm việc. Nếu quá lớn, nộp theo phần: [A+B] trước, [C+D] sau, [E+F] cuối, mỗi lần một Báo cáo hoàn thành.
