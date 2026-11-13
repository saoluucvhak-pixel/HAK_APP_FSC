'use strict';
/* File Excel MẪU nhập liệu (nhân công, đội xe, phiếu cân) có định dạng và hướng dẫn từng mẫu. Thuần dữ liệu: dùng ở giao diện (nhúng khi build) và kiểm thử Node.
 * Mỗi file gồm 3 trang tính:
 *   HUONG_DAN – mục đích, các bước, mô tả TỪNG cột (bắt buộc, định dạng, ví dụ, lưu ý), quy tắc kiểm tra, lỗi thường gặp
 *   <TÊN_DỮ_LIỆU> (NHAN_CONG | DOI_XE | PHIEU_CAN) – trang cần điền: dòng 1 là tiêu đề đúng như phần mềm đọc, cột định dạng văn bản (giữ số 0 đầu CCCD),
 *     tiêu đề cột bắt buộc tô màu riêng, danh sách chọn, ô gợi ý khi chọn ô, cố định dòng tiêu đề, bộ lọc. Phần mềm chỉ đọc trang này.
 *   VI_DU – dữ liệu GIẢ để tham khảo cách điền; phần mềm không đọc trang này.
 * Tên cột trong SPECS phải trùng đúng tiêu đề mà phần mềm đọc (kiểm tra bằng tests/xlsxmau.test.js). File ghi bằng OOXML thuần qua JSZip (không phụ thuộc thư viện Excel). */
(function (root) {
  const A = 'Có', N = 'Nên có', K = 'Không';
  const SPECS = {
    nc: {
      sheet: 'NHAN_CONG', file: 'HAK_Mau_NhanCong.xlsx', title: 'MẪU NHẬP NHÂN CÔNG', tab: 'tab Nhân công',
      purpose: 'Dữ liệu luôn được nạp vào lô rừng đang mở, nên file này KHÔNG có cột Mã rừng. ' + 'Danh sách người lao động của MỘT lô rừng (một dòng = một người). Từ đây phần mềm lập hợp đồng khai thác, Giấy ủy quyền, hợp đồng lao động, bảng chấm công, sổ cấp phát BHLĐ và bảng thanh toán tiền công.',
      steps: ['Mở lô rừng cần nhập trong phần mềm, vào tab “Nhân công” và chọn cách ký, cách trả lương, đơn giá theo chức danh TRƯỚC (thiếu đơn giá thì phần mềm báo lỗi).',
        'Mở trang tính NHAN_CONG của file này. Điền từ dòng 2, mỗi người một dòng; KHÔNG sửa, xóa, đổi tên hay đổi thứ tự dòng tiêu đề (dòng 1).',
        'Cột có tiêu đề màu đỏ sẫm là cột bắt buộc. Cột có mũi tên chọn (Vai trò, Danh xưng, Chức danh) chỉ chọn trong danh sách.',
        'Lưu file ở định dạng .xlsx (giữ nguyên tên trang tính). Không cần xóa hai trang HUONG_DAN và VI_DU.',
        'Trong phần mềm: tab “Nhân công” → “Nạp file Excel” → chọn file. Phần mềm báo số dòng hợp lệ, dòng lỗi (kèm số dòng) và hỏi trước khi ghi.',
        'Có dòng lỗi: sửa trong Excel theo thông báo rồi nạp lại. Nạp lại file sẽ thay toàn bộ danh sách nhân công của lô (phần mềm cho biết số bản ghi thêm, cập nhật, bỏ).'],
      cols: [
        {n: 'Vai trò', req: A, fmt: 'Chọn: Tổ trưởng | Công nhân', ex: 'Tổ trưởng', note: 'Mỗi lô cần ĐÚNG 1 tổ trưởng; những người còn lại là “Công nhân”.', list: ['Tổ trưởng', 'Công nhân']},
        {n: 'STT', req: K, fmt: 'Số', ex: '1', note: 'Số thứ tự, có thể bỏ trống.'},
        {n: 'Danh xưng', req: A, fmt: 'Chọn: Ông | Bà', ex: 'Ông', note: 'Dùng trong hợp đồng và biểu mẫu (Ông/Bà ...).', list: ['Ông', 'Bà']},
        {n: 'Họ và tên', req: A, fmt: 'Văn bản, viết đúng như CCCD', ex: 'TRẦN VĂN TỔ', note: 'Họ tên đầy đủ có dấu.'},
        {n: 'Ngày sinh', req: A, fmt: 'dd/mm/yyyy', ex: '15/03/1985', note: 'Ngày phải có thật (31/02 là sai). Người lao động phải đủ 18 tuổi tại ngày bắt đầu hợp đồng, dưới 18 tuổi thì không xuất được Giấy ủy quyền.'},
        {n: 'CCCD', req: A, fmt: 'Đúng 12 chữ số (văn bản)', ex: '049085000001', note: 'Cột đã định dạng văn bản để giữ số 0 ở đầu. Không trùng giữa các dòng. Nhập thiếu số 0 đầu sẽ báo “phải đủ 12 chữ số”.'},
        {n: 'Ngày cấp CCCD', req: A, fmt: 'dd/mm/yyyy', ex: '01/01/2021', note: 'Ngày có thật.'},
        {n: 'Nơi cấp CCCD', req: A, fmt: 'Văn bản', ex: 'Cục Cảnh sát QLHC về TTXH', note: 'Nơi cấp ghi trên căn cước.'},
        {n: 'Địa chỉ thường trú', req: A, fmt: 'Văn bản', ex: 'Thôn 2, xã Quế Sơn Trung, TP Đà Nẵng', note: 'Địa chỉ thường trú ghi trên căn cước.'},
        {n: 'Chức danh', req: A, fmt: 'Chọn: Tổ trưởng | Công nhân khai thác | Công nhân cưa', ex: 'Tổ trưởng', note: 'Quyết định đơn giá và định mức BHLĐ. Vai trò “Tổ trưởng” phải có chức danh “Tổ trưởng”; công nhân không được ghi chức danh “Tổ trưởng”.', list: ['Tổ trưởng', 'Công nhân khai thác', 'Công nhân cưa']}],
      rules: ['Mỗi lô có đúng 1 tổ trưởng.', 'CCCD đủ 12 chữ số và không trùng giữa các dòng.', 'Ngày sinh, ngày cấp là ngày có thật (kiểm tra theo lịch, có tính năm nhuận: 29/02/2028 hợp lệ, 29/02/2026 sai).',
        'Phải có đơn giá cho từng chức danh trong mục “Cơ sở tính đơn giá” của tab Nhân công; thiếu thì báo lỗi.', 'Người dưới 18 tuổi bị chặn xuất Giấy ủy quyền (BM-20).'],
      errors: [['File thiếu cột: ...', 'Dùng đúng file mẫu; không sửa, xóa hay đổi tên các ô tiêu đề ở dòng 1.'], ['Mã rừng "…" khác lô đang mở', 'Chỉ gặp ở file cũ còn cột Mã rừng: xóa cột đó hoặc để trống ô Mã rừng (mẫu mới không cần cột này; dữ liệu luôn nạp vào lô đang mở).'],
        ['CCCD phải đủ 12 chữ số', 'Nhập lại đủ 12 số; giữ số 0 đầu (cột đã là văn bản, không đổi sang số).'], ['CCCD trùng dòng n', 'Hai người không dùng chung CCCD: sửa CCCD ở một trong hai dòng.'],
        ['Cần đúng 1 tổ trưởng', 'Chỉ một dòng có Vai trò “Tổ trưởng”.'], ['Chức danh không hợp lệ', 'Chọn chức danh trong danh sách của ô.'], ['Ngày sinh "…" không có thật hoặc sai dd/mm/yyyy', 'Nhập lại dạng dd/mm/yyyy với ngày có thật.'],
        ['chưa có đơn giá … cho "…"', 'Vào tab Nhân công, mục Cơ sở tính đơn giá, nhập đơn giá cho chức danh đó rồi nạp lại.']],
      example: [['Tổ trưởng', '1', 'Ông', 'TRẦN VĂN TỔ', '15/03/1985', '049085000001', '01/01/2021', 'Cục Cảnh sát QLHC về TTXH', 'Thôn 2, xã Quế Sơn Trung, TP Đà Nẵng', 'Tổ trưởng'],
        ['Công nhân', '2', 'Ông', 'LÊ VĂN KHAI', '20/07/1990', '049090000002', '15/06/2022', 'Cục Cảnh sát QLHC về TTXH', 'Thôn 2, xã Quế Sơn Trung, TP Đà Nẵng', 'Công nhân khai thác'],
        ['Công nhân', '3', 'Bà', 'NGUYỄN THỊ CƯA', '02/11/1992', '049092000003', '10/05/2022', 'Cục Cảnh sát QLHC về TTXH', 'Thôn 3, xã Quế Sơn Trung, TP Đà Nẵng', 'Công nhân cưa']]
    },
    dx: {
      sheet: 'DOI_XE', file: 'HAK_Mau_DoiXe.xlsx', title: 'MẪU NHẬP ĐỘI XE VẬN CHUYỂN', tab: 'tab Vận chuyển',
      purpose: 'Dữ liệu luôn được nạp vào lô rừng đang mở, nên file này KHÔNG có cột Mã rừng. ' + 'Danh sách xe vận chuyển gỗ của MỘT lô rừng (một dòng = một xe). Từ đây phần mềm lập hợp đồng vận chuyển (BM-04), nhóm xe theo người ký, kiểm tra biển số khi nhập phiếu cân và cảnh báo giấy tờ xe sắp hết hạn.',
      steps: ['Mở lô rừng, vào tab “Vận chuyển”, chọn cách tính giá vận chuyển (cố định hoặc tấn/km).',
        'Mở trang tính DOI_XE. Điền từ dòng 2, mỗi xe một dòng; KHÔNG sửa dòng tiêu đề (dòng 1). Cột tiêu đề đỏ sẫm là cột bắt buộc.',
        'Chọn người ký hợp đồng ở cột “Người ký HĐ vận chuyển”: “Chủ xe” hoặc “Tài xế”. Chỉ người ký mới phải có đủ CCCD, ngày cấp, thường trú và SĐT; người không ký thì có thể để trống các cột này.',
        'Lưu file .xlsx. Trong phần mềm: tab “Vận chuyển” → mục Đội xe → “Nạp file Excel”.',
        'Nạp đội xe TRƯỚC khi nạp phiếu cân: phiếu cân chỉ nhận biển số có trong danh sách xe.',
        'Sửa dòng báo lỗi (kèm số dòng) rồi nạp lại. Giấy tờ sắp hết hạn chỉ cảnh báo, không chặn xuất.'],
      cols: [
        {n: 'STT', req: K, fmt: 'Số', ex: '1', note: 'Số thứ tự, có thể bỏ trống.'},
        {n: 'Chủ xe (bên vận chuyển)', req: A, fmt: 'Văn bản', ex: 'LÊ VĂN XE', note: 'Họ tên chủ sở hữu xe (bên B của hợp đồng vận chuyển khi chủ xe ký).'},
        {n: 'Ngày sinh chủ xe', req: N, fmt: 'dd/mm/yyyy', ex: '10/10/1980', note: 'Thiếu thì hợp đồng để trống phần này và có cảnh báo (nếu chủ xe là người ký).'},
        {n: 'CCCD chủ xe', req: 'Nếu chủ xe ký', fmt: '12 chữ số (văn bản)', ex: '049080000011', note: 'Bắt buộc khi người ký là Chủ xe.'},
        {n: 'Ngày cấp CCCD chủ xe', req: 'Nếu chủ xe ký', fmt: 'dd/mm/yyyy', ex: '01/01/2021', note: 'Bắt buộc khi người ký là Chủ xe.'},
        {n: 'Nơi cấp CCCD chủ xe', req: N, fmt: 'Văn bản', ex: 'Cục Cảnh sát QLHC về TTXH', note: 'Nên có.'},
        {n: 'Thường trú chủ xe', req: 'Nếu chủ xe ký', fmt: 'Văn bản', ex: 'Thôn 5, xã Quế Sơn, TP Đà Nẵng', note: 'Bắt buộc khi người ký là Chủ xe.'},
        {n: 'Biển kiểm soát', req: A, fmt: 'Văn bản; không trùng', ex: '92C-123.45', note: 'Phần mềm tự đổi thành chữ hoa và so khớp bỏ dấu chấm, gạch, khoảng trắng (92C-123.45 = 92C12345). Mỗi biển chỉ một dòng.'},
        {n: 'Ngày cấp đăng ký xe (cà vẹt)', req: K, fmt: 'dd/mm/yyyy', ex: '05/03/2020', note: 'Có thì phải là ngày có thật.'},
        {n: 'Loại xe', req: K, fmt: 'Văn bản', ex: 'Xe tải thùng', note: 'Ghi tự do.'},
        {n: 'Người ký HĐ vận chuyển', req: A, fmt: 'Chọn: Chủ xe | Tài xế', ex: 'Chủ xe', note: 'Cũng nhận tên người (trùng tên chủ xe hoặc tên tài xế). Tài xế ký thì hợp đồng có câu cam kết của chủ xe.', list: ['Chủ xe', 'Tài xế']},
        {n: 'Tên tài xế', req: 'Nếu tài xế ký', fmt: 'Văn bản', ex: '', note: 'Để trống khi chủ xe tự lái và ký.'},
        {n: 'Ngày sinh tài xế', req: N, fmt: 'dd/mm/yyyy', ex: '', note: 'Nên có khi tài xế ký.'},
        {n: 'CCCD tài xế', req: 'Nếu tài xế ký', fmt: '12 chữ số (văn bản)', ex: '', note: 'Bắt buộc khi người ký là Tài xế.'},
        {n: 'Ngày cấp CCCD tài xế', req: 'Nếu tài xế ký', fmt: 'dd/mm/yyyy', ex: '', note: 'Bắt buộc khi người ký là Tài xế.'},
        {n: 'Nơi cấp CCCD tài xế', req: N, fmt: 'Văn bản', ex: '', note: 'Nên có khi tài xế ký.'},
        {n: 'Thường trú tài xế', req: 'Nếu tài xế ký', fmt: 'Văn bản', ex: '', note: 'Bắt buộc khi người ký là Tài xế.'},
        {n: 'Số GPLX', req: 'Nếu có tài xế', fmt: 'Văn bản', ex: '', note: 'Có tên tài xế mà thiếu GPLX thì cảnh báo.'},
        {n: 'Ngày đến hạn GPLX', req: 'Nếu có tài xế', fmt: 'dd/mm/yyyy', ex: '', note: 'Quá hạn hoặc còn dưới 30 ngày thì cảnh báo.'},
        {n: 'Ngày đến hạn bảo hiểm', req: N, fmt: 'dd/mm/yyyy', ex: '30/06/2027', note: 'Quá hạn hoặc còn dưới 30 ngày thì cảnh báo.'},
        {n: 'Kiểm định từ ngày', req: K, fmt: 'dd/mm/yyyy', ex: '01/07/2026', note: 'Có thì phải là ngày có thật.'},
        {n: 'Kiểm định đến ngày', req: N, fmt: 'dd/mm/yyyy', ex: '01/07/2027', note: 'Quá hạn hoặc còn dưới 30 ngày thì cảnh báo.'},
        {n: 'SĐT', req: A, fmt: 'Văn bản (số điện thoại)', ex: '0905123456', note: 'Số điện thoại của NGƯỜI KÝ hợp đồng; thiếu thì báo lỗi.'}],
      rules: ['Mỗi biển kiểm soát chỉ một dòng.', 'Người ký chỉ nhận “Chủ xe” hoặc “Tài xế”. Người ký phải có CCCD 12 số, ngày cấp có thật, thường trú và SĐT.',
        'Người ký là Tài xế thì phải có tên tài xế và thông tin CCCD của tài xế.', 'Ngày giấy tờ (GPLX, bảo hiểm, kiểm định) quá hạn hoặc còn dưới 30 ngày: cảnh báo, không chặn.'],
      errors: [['Biển kiểm soát trùng dòng n', 'Mỗi xe chỉ khai một lần; xóa dòng trùng.'], ['người ký là tài xế nhưng thiếu Tên tài xế', 'Điền Tên tài xế hoặc đổi người ký thành “Chủ xe”.'],
        ['CCCD … (người ký) phải đủ 12 chữ số', 'Sửa CCCD của người đang là người ký (chủ xe hoặc tài xế).'], ['thiếu SĐT người ký', 'Điền cột SĐT.'],
        ['Người ký HĐ vận chuyển phải là "Chủ xe" hoặc "Tài xế"', 'Chọn trong danh sách của ô.'], ['… đã hết hạn / sắp hết hạn (cảnh báo)', 'Cập nhật ngày mới hoặc bỏ qua nếu đã gia hạn ngoài file.']],
      example: [['1', 'LÊ VĂN XE', '10/10/1980', '049080000011', '01/01/2021', 'Cục Cảnh sát QLHC về TTXH', 'Thôn 5, xã Quế Sơn, TP Đà Nẵng', '92C-123.45', '05/03/2020', 'Xe tải thùng', 'Chủ xe', '', '', '', '', '', '', '', '', '30/06/2027', '01/07/2026', '01/07/2027', '0905123456'],
        ['2', 'CÔNG TY VẬN TẢI MẪU', '', '', '', '', 'Số 1 đường mẫu, TP Đà Nẵng', '92C-678.90', '12/08/2021', 'Xe tải thùng', 'Tài xế', 'PHẠM VĂN LÁI', '03/04/1988', '049088000022', '05/05/2021', 'Cục Cảnh sát QLHC về TTXH', 'Thôn 1, xã Quế Sơn, TP Đà Nẵng', 'B2-0123456', '20/09/2028', '30/06/2027', '15/07/2026', '15/07/2027', '0905987654']]
    },
    pc: {
      sheet: 'PHIEU_CAN', file: 'HAK_Mau_PhieuCan.xlsx', title: 'MẪU NHẬP PHIẾU CÂN VẬN CHUYỂN', tab: 'tab Vận chuyển',
      purpose: 'Dữ liệu luôn được nạp vào lô rừng đang mở, nên file này KHÔNG có cột Mã rừng. ' + 'Phiếu cân của nhà máy cho từng chuyến xe của MỘT lô rừng (một dòng = một chuyến). Từ đây phần mềm tính khối lượng giao, tiền vận chuyển từng xe (BM-09, BM-10), sổ phiếu cân và các báo cáo.',
      steps: ['Nạp đội xe của lô TRƯỚC (mẫu DOI_XE): phiếu cân chỉ nhận biển số có trong danh sách xe.',
        'Mở trang tính PHIEU_CAN. Điền từ dòng 2, mỗi chuyến một dòng; KHÔNG sửa dòng tiêu đề (dòng 1). Cột tiêu đề đỏ sẫm là cột bắt buộc.',
        'Ngày cân nhập dạng dd/mm/yyyy và phải là ngày có thật. Khối lượng tính bằng TẤN (ví dụ 25,4 hoặc 25.4).',
        'Lưu file .xlsx. Trong phần mềm: tab “Vận chuyển” → mục Phiếu cân → “Nạp file Excel”.',
        'Phiếu có ngày không có thật (ví dụ 31/02/2026) làm cả file bị từ chối kèm số phiếu và lý do: sửa ngày rồi nạp lại.',
        'Nạp lại file sẽ thay danh sách phiếu cân của lô (kể cả phiếu lấy từ tra cứu); hộp xác nhận cho biết số phiếu bị bỏ.'],
      cols: [
        {n: 'STT', req: K, fmt: 'Số', ex: '1', note: 'Số thứ tự, có thể bỏ trống.'},
        {n: 'Ngày cân', req: A, fmt: 'dd/mm/yyyy', ex: '05/10/2026', note: 'Ngày có thật (31/02/2026 và 29/02/2026 là sai; 29/02/2028 hợp lệ). Phiếu sai ngày không được nhập và không được tính vào tổng của kỳ báo cáo.'},
        {n: 'Biển kiểm soát', req: A, fmt: 'Văn bản', ex: '92C-123.45', note: 'Phải có trong danh sách xe của lô. So khớp bỏ dấu chấm, gạch, khoảng trắng và không phân biệt hoa thường.'},
        {n: 'Số phiếu cân', req: A, fmt: 'Văn bản hoặc số; không trùng', ex: 'PC001', note: 'Mỗi phiếu một số. Số phiếu trùng bị báo lỗi (bản ghi cũ đã lưu trùng số vẫn được tính vào tổng nhưng có đánh dấu).'},
        {n: 'Khối lượng (tấn)', req: A, fmt: 'Số lớn hơn 0', ex: '25,4', note: 'Tính bằng tấn, dùng dấu phẩy hoặc dấu chấm thập phân. Khối lượng giao tại nhà máy là căn cứ tính tiền vận chuyển.'},
        {n: 'Nơi giao (nhà máy)', req: K, fmt: 'Văn bản', ex: 'Nhà máy dăm A', note: 'Ghi đúng như trên phiếu của nhà máy; phần mềm giữ nguyên và chỉ cảnh báo nếu khác địa chỉ giao hàng đã chốt của lô.'},
        {n: 'Ghi chú', req: K, fmt: 'Văn bản', ex: '', note: 'Ghi chú tùy ý.'}],
      rules: ['Biển số có trong danh sách xe (tab Vận chuyển).', 'Ngày cân là ngày có thật theo lịch (có tính năm nhuận).', 'Số phiếu cân không trùng; khối lượng là số lớn hơn 0.',
        'Cảnh báo (không chặn) khi tổng phiếu cân lệch khối lượng khai thác quá ngưỡng đã đặt ở tab Xuất hồ sơ.'],
      errors: [['Biển … chưa có trong danh sách xe', 'Thêm xe vào file đội xe, nạp lại đội xe rồi nạp phiếu cân.'], ['Ngày … không có thật / thiếu ngày cân', 'Sửa ngày đúng dd/mm/yyyy với ngày có thật (ví dụ 28/02/2026) rồi nạp lại.'],
        ['Số phiếu cân … trùng với dòng n', 'Kiểm tra phiếu nhập hai lần; xóa hoặc sửa số phiếu.'], ['Khối lượng không hợp lệ / thiếu khối lượng', 'Nhập số tấn lớn hơn 0 (25,4).'],
        ['Mã rừng "…" khác lô đang mở', 'Chỉ gặp ở file cũ còn cột Mã rừng: xóa cột đó hoặc để trống ô Mã rừng.'], ['File thiếu cột: ...', 'Dùng đúng file mẫu, không sửa dòng tiêu đề.']],
      example: [['1', '05/10/2026', '92C-123.45', 'PC001', '25,4', 'Nhà máy dăm A', ''], ['2', '06/10/2026', '92C-678.90', 'PC002', '24,6', 'Nhà máy dăm A', ''], ['3', '29/02/2028', '92C-123.45', 'PC003', '26,1', 'Nhà máy dăm A', 'Ví dụ ngày nhuận hợp lệ']]
    }
  };

  const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const colL = i => { let s = ''; for (let n = i + 1; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + (n - 1) % 26) + s; return s; };
  // Chỉ số kiểu ô (styles.xml bên dưới)
  const S = {def: 0, title: 1, sub: 2, sec: 3, head: 4, body: 5, mid: 6, reqMark: 7, dHeadReq: 8, dHeadOpt: 9, text: 10, note: 11, ex: 12, legReq: 13, legOpt: 14, step: 15};
  const STYLES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<fonts count="8">
<font><sz val="11"/><color rgb="FF0F172A"/><name val="Calibri"/><family val="2"/></font>
<font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/><family val="2"/></font>
<font><b/><sz val="16"/><color rgb="FFFFFFFF"/><name val="Calibri"/><family val="2"/></font>
<font><b/><sz val="12"/><color rgb="FF134E4A"/><name val="Calibri"/><family val="2"/></font>
<font><i/><sz val="10"/><color rgb="FF475569"/><name val="Calibri"/><family val="2"/></font>
<font><b/><sz val="11"/><color rgb="FFB91C1C"/><name val="Calibri"/><family val="2"/></font>
<font><b/><sz val="11"/><color rgb="FF0F172A"/><name val="Calibri"/><family val="2"/></font>
<font><sz val="10"/><color rgb="FF0F172A"/><name val="Calibri"/><family val="2"/></font>
</fonts>
<fills count="7">
<fill><patternFill patternType="none"/></fill>
<fill><patternFill patternType="gray125"/></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FF0F766E"/><bgColor indexed="64"/></patternFill></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FFCCFBF1"/><bgColor indexed="64"/></patternFill></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FFB91C1C"/><bgColor indexed="64"/></patternFill></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FFFEF9C3"/><bgColor indexed="64"/></patternFill></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FFF1F5F9"/><bgColor indexed="64"/></patternFill></fill>
</fills>
<borders count="2">
<border><left/><right/><top/><bottom/><diagonal/></border>
<border><left style="thin"><color rgb="FFCBD5E1"/></left><right style="thin"><color rgb="FFCBD5E1"/></right><top style="thin"><color rgb="FFCBD5E1"/></top><bottom style="thin"><color rgb="FFCBD5E1"/></bottom><diagonal/></border>
</borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="16">
<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
<xf numFmtId="0" fontId="2" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment horizontal="left" vertical="center" wrapText="1" indent="1"/></xf>
<xf numFmtId="0" fontId="4" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment horizontal="left" vertical="center" wrapText="1"/></xf>
<xf numFmtId="0" fontId="3" fillId="3" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment horizontal="left" vertical="center" indent="1"/></xf>
<xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
<xf numFmtId="0" fontId="7" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1"><alignment horizontal="left" vertical="top" wrapText="1"/></xf>
<xf numFmtId="0" fontId="7" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="top" wrapText="1"/></xf>
<xf numFmtId="0" fontId="5" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="top" wrapText="1"/></xf>
<xf numFmtId="49" fontId="1" fillId="4" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
<xf numFmtId="49" fontId="1" fillId="2" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
<xf numFmtId="49" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>
<xf numFmtId="0" fontId="7" fillId="5" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="left" vertical="top" wrapText="1"/></xf>
<xf numFmtId="49" fontId="4" fillId="6" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="left" vertical="top" wrapText="1"/></xf>
<xf numFmtId="0" fontId="1" fillId="4" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
<xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
<xf numFmtId="0" fontId="6" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1"><alignment horizontal="left" vertical="top" wrapText="1"/></xf>
</cellXfs>
<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`;

  /* Trang tính dựng từ danh sách hàng: row = {h: chiều cao, cells: [{c, v, s, t}]} ; merges, cols, validations... */
  function sheetXml(o) {
    const rows = o.rows.map((r, i) => {
      const cells = (r.cells || []).map(c => {
        const ref = colL(c.c) + (i + 1), st = ' s="' + (c.s || 0) + '"';
        if (c.v == null || c.v === '') return '<c r="' + ref + '"' + st + '/>';
        if (typeof c.v === 'number') return '<c r="' + ref + '"' + st + '><v>' + c.v + '</v></c>';
        return '<c r="' + ref + '"' + st + ' t="inlineStr"><is><t xml:space="preserve">' + esc(c.v) + '</t></is></c>';
      }).join('');
      return '<row r="' + (i + 1) + '"' + (r.h ? ' ht="' + r.h + '" customHeight="1"' : '') + '>' + cells + '</row>';
    }).join('');
    const colsXml = '<cols>' + o.cols.map((c, i) => '<col min="' + (i + 1) + '" max="' + (i + 1) + '" width="' + c.w + '" customWidth="1"' + (c.s != null ? ' style="' + c.s + '"' : '') + '/>').join('') + '</cols>';
    const lastCol = colL(Math.max(0, o.cols.length - 1));
    const view = '<sheetViews><sheetView workbookViewId="0"' + (o.active ? ' tabSelected="1"' : '') + ' showGridLines="' + (o.grid ? 1 : 0) + '">' + (o.freeze ? '<pane ySplit="' + o.freeze + '" topLeftCell="A' + (o.freeze + 1) + '" activePane="bottomLeft" state="frozen"/><selection pane="bottomLeft" activeCell="A' + (o.freeze + 1) + '" sqref="A' + (o.freeze + 1) + '"/>' : '') + '</sheetView></sheetViews>';
    const af = o.filter ? '<autoFilter ref="' + o.filter + '"/>' : '';
    const mc = (o.merges || []).length ? '<mergeCells count="' + o.merges.length + '">' + o.merges.map(m => '<mergeCell ref="' + m + '"/>').join('') + '</mergeCells>' : '';
    const dv = (o.validations || []).length ? '<dataValidations count="' + o.validations.length + '">' + o.validations.join('') + '</dataValidations>' : '';
    const pg = '<pageMargins left="0.5" right="0.5" top="0.6" bottom="0.6" header="0.3" footer="0.3"/><pageSetup paperSize="9" orientation="' + (o.landscape ? 'landscape' : 'portrait') + '" fitToHeight="0"/>';
    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetPr><pageSetUpPr fitToPage="1"/></sheetPr><dimension ref="A1:' + lastCol + o.rows.length + '"/>' + view + '<sheetFormatPr defaultRowHeight="15"/>' + colsXml + '<sheetData>' + rows + '</sheetData>' + af + mc + dv + pg + '</worksheet>';
  }
  const dvPrompt = (ref, title, prompt, list) => '<dataValidation' + (list ? ' type="list" allowBlank="1" showErrorMessage="1" errorTitle="Giá trị không hợp lệ" error="Chọn một giá trị trong danh sách."' : ' allowBlank="1"') + ' showInputMessage="1" promptTitle="' + esc(String(title).slice(0, 32)) + '" prompt="' + esc(String(prompt).slice(0, 250)) + '" sqref="' + ref + '">' + (list ? '<formula1>"' + esc(list.join(',')) + '"</formula1>' : '') + '</dataValidation>';

  function guideSheet(spec, meta) {
    const W = [6, 30, 16, 28, 26, 64], rows = [], merges = [], n = W.length - 1;
    const add = (cells, h) => { rows.push({h, cells}); return rows.length; };
    const mergeRow = (text, st, h) => { const r = add([{c: 0, v: text, s: st}].concat(Array.from({length: n}, (_, i) => ({c: i + 1, s: st}))), h); merges.push('A' + r + ':' + colL(n) + r); return r; };
    mergeRow(spec.title + ' – HAKQN Desktop', S.title, 36);
    mergeRow('Phần mềm HAKQN Desktop · Hồ sơ khai thác và vận chuyển gỗ keo (chuẩn truy xuất nguồn gốc FSC) · Mẫu ' + (meta.version ? 'phiên bản ' + meta.version : 'nhập liệu') + '. Dữ liệu trong trang VI_DU là dữ liệu giả.', S.sub, 30);
    add([]);
    mergeRow('1. Mẫu này dùng để làm gì', S.sec, 22); mergeRow(spec.purpose, S.note, 52); add([]);
    mergeRow('2. Các bước thực hiện', S.sec, 22);
    spec.steps.forEach((t, i) => { const r = add([{c: 0, v: i + 1, s: S.mid}, {c: 1, v: t, s: S.body}].concat(Array.from({length: n - 1}, (_, k) => ({c: k + 2, s: S.body}))), Math.max(30, Math.ceil(t.length / 120) * 16 + 8)); merges.push('B' + r + ':' + colL(n) + r); });
    add([]);
    mergeRow('3. Mô tả từng cột (đúng thứ tự trong trang ' + spec.sheet + ')', S.sec, 22);
    add([{c: 0, v: 'Cột', s: S.head}, {c: 1, v: 'Tên cột (đúng như tiêu đề, không sửa)', s: S.head}, {c: 2, v: 'Bắt buộc', s: S.head}, {c: 3, v: 'Định dạng', s: S.head}, {c: 4, v: 'Ví dụ', s: S.head}, {c: 5, v: 'Giải thích và lưu ý', s: S.head}], 32);
    spec.cols.forEach((c, i) => add([{c: 0, v: colL(i), s: S.mid}, {c: 1, v: c.n, s: S.step}, {c: 2, v: c.req, s: c.req === A ? S.reqMark : S.mid}, {c: 3, v: c.fmt, s: S.body}, {c: 4, v: c.ex, s: S.body}, {c: 5, v: c.note, s: S.body}], Math.max(30, Math.ceil(c.note.length / 62) * 15 + 6)));
    const lg = add([{c: 0, v: '', s: S.def}, {c: 1, v: 'Tiêu đề màu đỏ sẫm = bắt buộc', s: S.legReq}, {c: 2, v: 'Tiêu đề màu xanh = tùy chọn / có điều kiện', s: S.legOpt}], 34); void lg;
    add([]);
    mergeRow('4. Phần mềm kiểm tra những gì', S.sec, 22);
    spec.rules.forEach((t, i) => { const r = add([{c: 0, v: i + 1, s: S.mid}, {c: 1, v: t, s: S.body}].concat(Array.from({length: n - 1}, (_, k) => ({c: k + 2, s: S.body}))), Math.max(24, Math.ceil(t.length / 120) * 16 + 8)); merges.push('B' + r + ':' + colL(n) + r); });
    add([]);
    mergeRow('5. Lỗi thường gặp và cách sửa', S.sec, 22);
    add([{c: 0, v: 'STT', s: S.head}, {c: 1, v: 'Thông báo của phần mềm', s: S.head}, {c: 2, s: S.head}, {c: 3, s: S.head}, {c: 4, v: 'Cách sửa', s: S.head}, {c: 5, s: S.head}], 26); merges.push('B' + rows.length + ':D' + rows.length, 'E' + rows.length + ':F' + rows.length);
    spec.errors.forEach((e, i) => { const r = add([{c: 0, v: i + 1, s: S.mid}, {c: 1, v: e[0], s: S.body}, {c: 2, s: S.body}, {c: 3, s: S.body}, {c: 4, v: e[1], s: S.body}, {c: 5, s: S.body}], Math.max(30, Math.ceil(e[1].length / 80) * 16 + 8)); merges.push('B' + r + ':D' + r, 'E' + r + ':F' + r); });
    add([]);
    mergeRow('6. Lưu ý', S.sec, 22);
    ['File thật chứa thông tin cá nhân (họ tên, CCCD, địa chỉ): chỉ lưu và gửi trong nội bộ, không đăng công khai.', 'Không đổi tên trang tính ' + spec.sheet + ', không thêm cột, không gộp ô, không để dòng trống ở giữa dữ liệu.', 'Dùng đúng mẫu của bản phần mềm đang cài: tải lại mẫu từ nút “Tải file mẫu” khi cập nhật phần mềm.'].forEach((t, i) => { const r = add([{c: 0, v: i + 1, s: S.mid}, {c: 1, v: t, s: S.body}].concat(Array.from({length: n - 1}, (_, k) => ({c: k + 2, s: S.body}))), 28); merges.push('B' + r + ':' + colL(n) + r); });
    return sheetXml({rows, cols: W.map(w => ({w})), merges, active: true, landscape: true});
  }
  function dataSheet(spec) {
    const cols = spec.cols, nCol = cols.length, last = colL(nCol - 1), head = cols.map((c, i) => ({c: i, v: c.n, s: c.req === A ? S.dHeadReq : S.dHeadOpt}));
    const widths = cols.map(c => Math.min(34, Math.max(13, c.n.length + 4, c.ex ? String(c.ex).length + 3 : 0)));
    const vals = cols.map((c, i) => dvPrompt(colL(i) + '2:' + colL(i) + '1000', c.n + (c.req === A ? ' (bắt buộc)' : ''), c.fmt + '. ' + c.note, c.list || null));
    return sheetXml({rows: [{h: 38, cells: head}], cols: widths.map(w => ({w, s: S.text})), freeze: 1, filter: 'A1:' + last + '1', validations: vals, grid: true, landscape: true});
  }
  function exampleSheet(spec) {
    const cols = spec.cols, n = cols.length, rows = [], merges = [];
    rows.push({h: 28, cells: [{c: 0, v: 'DỮ LIỆU GIẢ ĐỂ THAM KHẢO CÁCH ĐIỀN – phần mềm KHÔNG đọc trang này. Sao chép dòng cần dùng sang trang ' + spec.sheet + ' rồi sửa cho đúng.', s: S.note}].concat(Array.from({length: n - 1}, (_, i) => ({c: i + 1, s: S.note})))}); merges.push('A1:' + colL(n - 1) + '1');
    rows.push({h: 38, cells: cols.map((c, i) => ({c: i, v: c.n, s: c.req === A ? S.dHeadReq : S.dHeadOpt}))});
    spec.example.forEach(r => rows.push({h: 30, cells: r.map((v, i) => ({c: i, v, s: S.ex}))}));
    return sheetXml({rows, cols: cols.map(c => ({w: Math.min(34, Math.max(13, c.n.length + 4, c.ex ? String(c.ex).length + 3 : 0))})), merges, freeze: 2, grid: true, landscape: true});
  }

  async function build(kind, JSZip, meta) {
    let spec = SPECS[kind]; if (!spec) throw new Error('Không có mẫu cho: ' + kind);
    meta = meta || {};
    // danh sách vị trí (chức danh) của phần mềm, kể cả vị trí người dùng thêm: ghi vào cột Chức danh và danh sách chọn
    if (kind === 'nc' && Array.isArray(meta.chucDanh) && meta.chucDanh.length) spec = Object.assign({}, spec, {cols: spec.cols.map(c => c.n === 'Chức danh' ? Object.assign({}, c, {fmt: 'Chọn: ' + meta.chucDanh.join(' | '), list: meta.chucDanh.slice()}) : c)});
    const z = new JSZip(), names = ['HUONG_DAN', spec.sheet, 'VI_DU'];
    z.file('[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
      names.map((_, i) => '<Override PartName="/xl/worksheets/sheet' + (i + 1) + '.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>').join('') +
      '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>');
    z.file('_rels/.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>');
    z.file('xl/workbook.xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><bookViews><workbookView activeTab="0"/></bookViews><sheets>' +
      names.map((n, i) => '<sheet name="' + n + '" sheetId="' + (i + 1) + '" r:id="rId' + (i + 1) + '"/>').join('') + '</sheets><definedNames><definedName name="_xlnm._FilterDatabase" localSheetId="1" hidden="1">' + spec.sheet + '!$A$1:$' + colL(spec.cols.length - 1) + '$1</definedName></definedNames></workbook>');
    z.file('xl/_rels/workbook.xml.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      names.map((_, i) => '<Relationship Id="rId' + (i + 1) + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet' + (i + 1) + '.xml"/>').join('') + '<Relationship Id="rId' + (names.length + 1) + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>');
    z.file('xl/styles.xml', STYLES);
    z.file('xl/worksheets/sheet1.xml', guideSheet(spec, meta));
    z.file('xl/worksheets/sheet2.xml', dataSheet(spec));
    z.file('xl/worksheets/sheet3.xml', exampleSheet(spec));
    return z.generateAsync({type: 'uint8array', compression: 'DEFLATE'});
  }

  const api = {SPECS, KINDS: ['nc', 'dx', 'pc'], build, colL};
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.HAKXlsxMau = api;
})(typeof self !== 'undefined' ? self : this);
