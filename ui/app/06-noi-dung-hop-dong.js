/* ========== Nội dung hợp đồng (theo mẫu đã duyệt) ========== */
const TITLE_HEAD = () => [
  P('**CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM**', {al: 'center', after: 0}),
  P('**Độc lập – Tự do – Hạnh phúc**', {al: 'center', after: 280, bdb: true, ind: 2300, indR: 2300})
];
const LAW_BLDS = 'Căn cứ Bộ luật Dân sự số 91/2015/QH13 ngày 24/11/2015 của Quốc hội nước Cộng hòa xã hội chủ nghĩa Việt Nam, có hiệu lực từ ngày 01/01/2017.';
const dot = (v, n) => v || '…'.repeat(n || 6);
const rungRef = i => {
  const a = [];
  if (i.maRung) a.push('Mã rừng: ' + i.maRung);
  if (i.lat != null && i.lng != null) a.push('Tọa độ (WGS84): ' + i.lat + ', ' + i.lng);
  if (i.tuNgay) a.push('Thời gian khai thác: ' + i.tuNgay + (i.denNgay ? ' – ' + i.denNgay : ''));
  return a.join(' · ');
};
const LAW_LD = ['Căn cứ Bộ luật Lao động số 45/2019/QH14 ngày 20/11/2019;', 'Căn cứ Luật An toàn, vệ sinh lao động số 84/2015/QH13 ngày 25/06/2015;', 'Căn cứ Nghị định số 145/2020/NĐ-CP ngày 14/12/2020 của Chính phủ hướng dẫn thi hành Bộ luật Lao động.'];
const DT_NOIDUNG = ['Quy định chung về an toàn, vệ sinh lao động; quyền và nghĩa vụ của người lao động.', 'Kỹ thuật an toàn khi đốn hạ, cắt khúc, bóc tách; sử dụng cưa xăng, dao, rựa.', 'Sử dụng, bảo quản phương tiện bảo vệ cá nhân (bảo hộ lao động).', 'An toàn khi bốc xếp, vận chuyển gỗ; làm việc trên địa hình dốc, thời tiết xấu.', 'Phòng chống cháy rừng; xử lý tình huống khẩn cấp và sơ cứu tai nạn lao động.'];
const hdRef = rs => (rs.soHopDong || rs.ngayKyHopDong) ? 'Căn cứ Hợp đồng số ' + (rs.soHopDong || '…………') + (rs.ngayKyHopDong ? ' ký ngày ' + rs.ngayKyHopDong : '') + '.' : '';
/* Đơn vị mua gỗ (Công ty mua hàng) của lô: nhập tay ở tab Xuất hồ sơ nếu có, không thì địa chỉ giao đã chốt của lô, không thì hồ sơ công ty duy nhất */
const buyerName = rec => ((rec.info.muaHang || {}).ten || (theCompany() || {}).ten || '').trim();
const ngayLine = ex => ex.ngayKy ? 'ngày ' + ex.ngayKy : HAKHopDong.ngayTrong();

function partyBlock(label, p, fullName, o = {}) {   // o.noSinh: không in năm sinh (chủ rừng không còn khai ngày sinh)
  return [
    P('**' + label + ': ' + upper(fullName) + '**', {after: 60}),
    ...(o.noSinh ? [] : [P('Sinh năm: ' + (p.ngaySinh || '…………'), {ind: 360, after: 40})]),
    P('Căn cước công dân số: ' + (p.cccd || '…………') + ', cấp ngày: ' + (p.ngayCap || '…………') + ', nơi cấp: ' + (p.noiCap || '…………'), {ind: 360, after: 40}),
    P('Địa chỉ thường trú: ' + (p.diaChi || '…………'), {ind: 360, after: o.noSinh && p.sdt ? 40 : 160}),
    ...(o.noSinh && p.sdt ? [P('Điện thoại: ' + p.sdt, {ind: 360, after: 160})] : [])   // chủ rừng có khai số điện thoại thì in
  ];
}
function signTable(l, r) {
  return T([4677, 4678], [
    ['**' + l[0] + '**', '**' + r[0] + '**'],
    [{v: l[1], i: true}, {v: r[1], i: true}],
    ['', ''], ['', ''], ['', ''],
    ['**' + l[2] + '**', '**' + r[2] + '**']
  ], {borders: false, al: 'center', keep: true});
}

function docGiaoKhoan(rec, ex) {
  const rs = rec.info, tt = rec.nc.find(isTT), ttName = personName(tt.danhXung, tt.ten), pr = payRows(rec, Object.assign({}, ex, {_forecast: true})), bs = basisOf(rs);   // hợp đồng ký trước khai thác: tổng khoán theo sản lượng DỰ KIẾN, không đổi khi nhập khối lượng thực tế
  const rsName = personName(rs.danhXung, rs.ten);
  return [
    ...TITLE_HEAD(),
    P('**HỢP ĐỒNG KHAI THÁC GỖ KEO**', {al: 'center', sz: 28, before: 120, after: 60}),
    P('Số: ' + ex._so.kt.so, {al: 'center', after: 0}),
    P('“V/v: Khai thác gỗ rừng trồng”', {al: 'center', i: true, after: 200}),
    P(LAW_BLDS),
    ...(hdRef(rs) ? [P('- ' + hdRef(rs))] : []),
    P('- Căn cứ khả năng và nhu cầu của hai bên.'),
    P('Hôm nay, ' + ngayLine(ex) + ' tại nhà ' + upper(rsName) + ' (địa chỉ: ' + rs.diaChi + '), chúng tôi gồm có:', {after: 160}),
    ...partyBlock('BÊN CHỦ RỪNG (BÊN A)', rs, rsName, {noSinh: true}),
    ...partyBlock('BÊN KHAI THÁC (BÊN B)', tt, ttName),
    P('Sau khi bàn bạc cụ thể, hai bên thống nhất ký hợp đồng khai thác gỗ keo rừng trồng với các điều khoản như sau:'),
    P('**Điều 1: Nội dung**', {keep: true}),
    P('Bên B đồng ý nhận và bên A đồng ý giao khai thác gỗ Keo Lai rừng trồng có kiểm soát tại địa chỉ: ' + rs.diaDiem + rungText(rs) + '.'),
    ...(rec._doiTen ? [P('Lô được giao cho ' + rec._nDoi + ' đội khai thác làm song song, mỗi đội ký hợp đồng riêng. Phạm vi giao cho đội “' + rec._doiTen + '” (Tổ trưởng ' + ttName + '): ' + [typeof rs.dienTich === 'number' ? fmtTan(rs.dienTich) + ' ha' : '', typeof rs.khoiLuong === 'number' ? fmtTan(rs.khoiLuong) + ' tấn' : ''].filter(Boolean).join(', ') + ' (phần của lô chia theo số người của các đội).')] : []),
    P('**Điều 2: Giá cả và phương thức thanh toán**', {keep: true}),
    P('2.1. Đơn giá khoán theo vai trò (' + bs.unit + '): ' + roleRates(rec).join('; ') + '.', {ind: 360}),
    ...(pr.plan.ngc ? [P('2.2. Hình thức trả theo ngày công: số công của từng người do Tổ trưởng chấm hằng ngày vào Bảng chấm công; tiền của mỗi người bằng số công thực tế nhân với đơn giá công theo vai trò ở mục 2.1. Bên B nhận thay cho cả tổ và chi trả lại cho từng người.' + (pr.sum && pr.plan.cong != null ? ' Dự tính ' + fmtCong(pr.plan.cong) + ' công mỗi người (theo thời gian khai thác, không tính Chủ nhật), tổng tiền công dự tính: ' + fmt(pr.sum) + ' đồng.' : ''), {ind: 360})] : [])
    ,...(pr.plan.ngc ? [] : khoanSuyRa(rec) ? (kh => [
      P('2.2. Đơn giá khoán của tổ (giá Tổ trưởng ký) là **đơn giá bình quân ' + kh.price + ' ' + kh.bs.unit + '**, tính từ định biên nhân sự ' + kh.k.N + ' người của tổ (kể cả Tổ trưởng) theo đơn giá của từng vị trí:', {ind: 360, after: 40}),
      ...kh.pos.map(x => bl(x.cd + ': ' + (x.n ? x.n + ' người × ' + fmt(x.rate) + ' ' + kh.bs.unit + ' = ' + fmt(x.n * x.rate) : 'chưa có người ở vị trí này (đơn giá ' + (x.rate ? fmt(x.rate) : '………') + ' ' + kh.bs.unit + ')'))),
      bl('Cơ sở tính giá trung bình: tổng (số người × đơn giá vị trí) chia tổng số người = ' + kh.formula + '.'),
      bl((kh.bs.qty === 'ha' ? 'Diện tích khai thác' : 'Sản lượng khai thác') + ' chia đều cho ' + kh.k.N + ' người; tiền của mỗi người bằng phần được chia nhân với đơn giá vị trí của người đó.'),
      ...(pr.sum ? [bl('Tổng giá trị khoán = đơn giá bình quân × ' + kh.qty + ' = **' + fmt(pr.sum) + ' đồng**, bằng tổng tiền thanh toán cho ' + kh.k.N + ' người kể cả Tổ trưởng (cộng tiền của từng người theo Bảng thanh toán tiền công).')] : [])
    ])(khoanSuyRa(rec)) : [P('2.2. ' + (bs.qty === 'ha' ? 'Diện tích khai thác' : 'Sản lượng khai thác') + ' được chia đều cho ' + pr.N + ' người trong tổ; tiền của mỗi người bằng phần được chia nhân với đơn giá khoán theo vai trò của người đó.' + (pr.sum ? ' Tổng tiền khoán dự tính: ' + fmt(pr.sum) + ' đồng.' : ''), {ind: 360})]),
    P('2.3. Hình thức thanh toán: Căn cứ theo số lượng bán cho nhà máy, hai bên tiến hành thanh toán bằng tiền mặt.', {ind: 360}),
    P('2.4. Thời gian khai thác: từ ngày ' + (rs.tuNgay || '…/…/……') + ' ' +
      (rs.denNgay ? 'đến ngày ' + rs.denNgay : 'đến hết khi khai thác hết rừng keo tại địa điểm trên') + '.', {ind: 360}),
    P('**Điều 3: Trách nhiệm của mỗi bên**', {keep: true}),
    P('3.1. Trách nhiệm của bên A', {keep: true}),
    bl(pr.plan.ngc ? 'Thanh toán cho bên B theo đơn giá quy định tại Điều 2 dựa trên số công thực tế ghi trong Bảng chấm công.' : 'Thanh toán cho bên B theo đơn giá quy định tại Điều 2 dựa trên khối lượng gỗ đã khai thác.'),
    bl('Chịu trách nhiệm mở đường và các chi phí khác để tạo điều kiện cho bên B khai thác gỗ.'),
    bl('Sắp xếp xe vận chuyển theo đúng tiến độ.'),
    P('3.2. Trách nhiệm của bên B', {keep: true}),
    bl('Tổ chức lực lượng lao động khai thác đủ để kịp tiến độ khai thác.'),
    bl('Sử dụng lao động hợp pháp đúng theo quy định của Pháp luật. Không sử dụng lao động trẻ em, lao động cưỡng bức.'),
    bl('Phải có danh sách đội khai thác xác định rõ tên, tuổi người lao động.'),
    bl('Có Giấy ủy quyền của toàn bộ người lao động trong tổ để Bên B thay mặt giao kết và thực hiện hợp đồng này (kèm theo hợp đồng).'),
    bl('Phải trang bị đầy đủ bảo hộ lao động và đào tạo về an toàn lao động cho lao động khai thác.'),
    bl('Khai thác đảm bảo đúng phạm vi khai thác, tránh sự lẫn lộn các nguồn nguyên liệu khác không phù hợp.'),
    bl('Tuân thủ các quy định về bảo vệ môi trường.'),
    bl('Đảm bảo thời gian khai thác như điều 2 của hợp đồng.'),
    bl('Chịu mọi trách nhiệm và tất cả chi phí phát sinh cho tổ khai thác.'),
    P('**Điều 4. Hiệu lực hợp đồng**', {keep: true}),
    P('Nếu một trong hai bên muốn chấm dứt hợp đồng trước thời hạn thì phải thông báo cho bên kia trước ít nhất 03 ngày.'),
    P('**Điều 5. Điều khoản chung**', {keep: true}),
    bl('Không bên nào đơn phương hủy bỏ hợp đồng. Trường hợp bên nào đơn phương hủy bỏ hợp đồng thì phải chịu trách nhiệm bồi thường toàn bộ thiệt hại, mất mát đã gây ra cho bên còn lại.'),
    bl('Hai bên cam kết thực hiện đầy đủ và đúng theo các điều khoản trong hợp đồng này. Mọi thay đổi đối với hợp đồng, hai bên cùng nhau bàn bạc và xác nhận bằng văn bản cụ thể.'),
    bl('Trường hợp tranh chấp phát sinh trong quá trình thực hiện hợp đồng, trước hết hai bên phải thỏa thuận để dàn xếp. Quyết định của Tòa án là quyết định cuối cùng và ràng buộc 2 bên. Chi phí Tòa án và các khoản chi phí khác liên quan do bên thua kiện chịu.'),
    bl('Hợp đồng được lập thành 02 bản, mỗi bên giữ 01 bản có giá trị pháp lý như nhau và có hiệu lực kể từ ngày ký.'),
    P('', {after: 120}),
    signTable(['ĐẠI DIỆN BÊN A', '(Ký, ghi rõ họ tên)', rsName], ['ĐẠI DIỆN BÊN B', '(Ký, ghi rõ họ tên)', ttName])
  ];
}

function docBHLD(rec, ex) {
  const rs = rec.info, tt = rec.nc.find(isTT);
  const list = [tt, ...rec.nc.filter(r => !isTT(r))];
  const rows = list.map((r, i) => {
    const n = normOf(r.chucDanh, normRefCapPhat(rec, ex));
    return [String(i + 1), upper(r.ten), r.chucDanh, n.qa || '', n.giay || '', n.mu || '', n.gang || '', n.nut || '', n.kinh || '', ''];
  });
  return [
    P('**DANH SÁCH CẤP PHÁT BHLĐ CHO ĐỘI KHAI THÁC RỪNG ' + upper(personName(rs.danhXung, rs.ten)) + '**', {al: 'center', sz: 26, before: 120, after: 60}),
    P('(Địa chỉ: ' + rs.diaDiem + ')', {al: 'center', after: 60}),
    ...(rungRef(rs) ? [P(rungRef(rs), {al: 'center', i: true, sz: 22, after: 160})] : []),
    P('- Căn cứ Luật An toàn, vệ sinh lao động số 84/2015/QH13 ngày 25/06/2015 và Bộ luật Lao động số 45/2019/QH14 ngày 20/11/2019;'),
    P('- Ngày cấp phát: **' + dot(ex.capNgay, 6) + '** · Thời hạn sử dụng: **' + dot(ex.capHan, 6) + '**.' + (HAKDinhMuc.pick(db, normRefCapPhat(rec, ex)).ver.tuNgay ? ' Định mức theo bản có hiệu lực từ ngày ' + HAKDinhMuc.pick(db, normRefCapPhat(rec, ex)).ver.tuNgay + '.' : ''), {after: 160}),
    T([700, 1800, 1400, 775, 775, 775, 775, 775, 780, 800],
      [['STT', 'HỌ TÊN', 'CHỨC DANH CÔNG VIỆC', 'Quần áo', 'Giày/ủng', 'Mũ', 'Găng tay', 'Nút chống ồn', 'Kính bảo hộ', 'Ký nhận'], ...rows],
      {head: true, borders: true, alignCols: ['center', 'left', 'left', 'center', 'center', 'center', 'center', 'center', 'center', 'center']}),
    P('Người lao động đã nhận đủ phương tiện bảo vệ cá nhân theo danh sách trên, cam kết sử dụng đúng mục đích, giữ gìn và báo ngay khi hư hỏng để được thay thế.', {before: 160, after: 120}),
    P('Đà Nẵng, ' + (ex.capNgay ? 'ngày ' + ex.capNgay : HAKHopDong.ngayTrong()), {al: 'right', after: 120}),
    signTable(['NGƯỜI CẤP PHÁT', '(Ký, ghi rõ họ tên)', ex.capNguoi || personName(rs.danhXung, rs.ten)], ['ĐẠI DIỆN TỔ KHAI THÁC', '(Ký, ghi rõ họ tên)', personName(tt.danhXung, tt.ten)])
  ];
}

function docHDLD(rec, ex, cn) {
  const rs = rec.info, tt = rec.nc.find(isTT);
  const ttName = personName(tt.danhXung, tt.ten), cnName = personName(cn.danhXung, cn.ten);
  const ngc = rs.hinhThucLuong === 'ngaycong', direct = isDirect(rs), A = direct ? rs : tt;
  const items = BHLD_ITEMS.filter(([k]) => normOf(cn.chucDanh, normRefHDLD(rec, ex))[k]).map(x => x[2]).join(', ');
  return [
    ...TITLE_HEAD(),
    P('**HỢP ĐỒNG LAO ĐỘNG**', {al: 'center', sz: 28, before: 120, after: 60}),
    P('Số: ……/HĐLĐ/' + HAKHopDong.NAM_TRONG, {al: 'center', after: 200}),
    ...LAW_LD.map(t => P('- ' + t, {after: 60})),
    P('Đà Nẵng, ' + ngayLine(ex).replace('ngày ', 'ngày ') , {al: 'right', after: 200}),
    P('Chúng tôi, một bên là ' + (A.danhXung === 'Bà' ? 'Bà' : 'Ông') + ': **' + upper(A.ten) + '**. Quốc tịch: Việt Nam. Dân tộc: Kinh.', {after: 60}),
    P(direct ? 'Là chủ rừng, người sử dụng lao động khai thác gỗ keo tại ' + rs.diaDiem + '.'
      : 'Là tổ trưởng, người nhận khoán khai thác gỗ keo của ' + upper(personName(rs.danhXung, rs.ten)) + ' (địa chỉ: ' + rs.diaChi + ').', {after: 60}),
    P('Căn cước công dân số: ' + (A.cccd || '…') + ', cấp ngày: ' + (A.ngayCap || '…') + ', tại: ' + (A.noiCap || '…') + '.', {after: 60}),
    P('Địa chỉ: ' + (A.diaChi || '…'), {after: 160}),
    P('Và một bên là người lao động:', {after: 60}),
    P('**' + upper(cnName) + '**', {after: 60}),
    P('Sinh ngày: ' + (cn.ngaySinh || '…') + ' · Giới tính: ' + (cn.danhXung === 'Bà' ? 'Nữ' : cn.danhXung === 'Ông' ? 'Nam' : '…'), {ind: 360, after: 40}),
    P('Căn cước công dân số: ' + (cn.cccd || '…') + ', cấp ngày: ' + (cn.ngayCap || '…') + ', tại: ' + (cn.noiCap || '…') + '.', {ind: 360, after: 40}),
    P('Địa chỉ: ' + (cn.diaChi || '…'), {ind: 360, after: 160}),
    P('Thoả thuận ký kết hợp đồng lao động và cam kết làm đúng những điều khoản sau đây:'),
    P('**Điều 1: Thời hạn và công việc hợp đồng:**', {keep: true}),
    bl('Loại hợp đồng lao động: có thời hạn'),
    bl('Từ ngày ' + (rs.ngayBDLD || rs.tuNgay || '…') + ' đến ngày kết thúc công việc ' + (direct ? 'khai thác.' : 'giao khoán.')),
    bl('Địa điểm làm việc: ' + rs.diaDiem + (rungRef(rs) ? ' (' + rungRef(rs) + ')' : '')),
    bl('Chức danh chuyên môn: ' + cn.chucDanh),
    bl('Công việc phải làm: Khai thác gỗ rừng trồng.'),
    P('**Điều 2: Chế độ làm việc:**', {keep: true}),
    bl('Thời giờ làm việc: 08 giờ/ngày'),
    bl('Được cấp phát những dụng cụ BHLĐ làm việc gồm: ' + items + ' Bảo hộ lao động.'),
    P('**Điều 3: Nghĩa vụ và quyền lợi của người lao động:**', {keep: true}),
    P('1. Quyền lợi:', {keep: true}),
    bl('Phương tiện đi lại làm việc: Tự túc.'),
    bl('Mức lương chính hoặc tiền công: ' + fmt(rateOf(rs, cn)) + (ngc ? ' đồng/ngày công.' : ' đồng/tấn.')),
    bl('Hình thức trả lương: ' + (ngc ? 'Theo ngày công thực tế làm việc.' : 'Lương khoán theo sản lượng.')),
    bl('Được trả lương: ' + (ngc ? 'Theo kỳ chấm công, căn cứ bảng chấm công.' : 'Khi hoàn thành đợt khai thác, căn cứ vào phiếu cân hàng mà nhà máy cung cấp.')),
    bl('Phụ cấp lương và các khoản bổ sung khác: ' + (ex.hdPhuCap || 'Không.')),
    bl('Chế độ nâng bậc, nâng lương: ' + (ex.hdNangLuong || 'Không áp dụng; mức công được điều chỉnh khi hai bên thỏa thuận bằng phụ lục hợp đồng.')),
    bl('Chế độ nghỉ ngơi: Nghỉ ngày Chủ nhật và Lễ tết theo quy định của Luật Lao động.'),
    bl('Bảo hiểm xã hội, bảo hiểm y tế, bảo hiểm thất nghiệp: Đã bao gồm trong lương.'),
    bl('Chế độ đào tạo: Được đào tạo về An toàn lao động trong khai thác.'),
    P('2. Nghĩa vụ:', {keep: true}),
    bl('Hoàn thành những công việc đã cam kết trong hợp đồng lao động.'),
    bl('Chấp hành lệnh điều hành khai thác, nội quy kỷ luật lao động, an toàn lao động.'),
    P('**Điều 4. Nghĩa vụ và quyền hạn của người sử dụng lao động**', {keep: true}),
    P('1. Nghĩa vụ:', {keep: true}),
    bl('Bảo đảm việc làm và thực hiện đầy đủ những điều đã cam kết trong hợp đồng lao động.'),
    bl('Thanh toán đầy đủ, đúng thời hạn các chế độ và quyền lợi cho người lao động theo hợp đồng lao động.'),
    P('2. Quyền hạn:', {keep: true}),
    ...(direct ? [] : [bl('Được quyền ký hợp đồng khai thác thay mặt cho toàn thể công nhân khai thác với chủ rừng.')]),
    bl('Điều hành người lao động hoàn thành công việc theo hợp đồng (bố trí, điều chuyển, tạm ngừng việc...).'),
    bl('Tạm hoãn, chấm dứt hợp đồng lao động, kỷ luật người lao động theo quy định của pháp luật.'),
    P('**Điều 5. Điều khoản thi hành**', {keep: true}),
    bl('Những vấn đề về lao động không ghi trong hợp đồng lao động này thì áp dụng theo quy định của pháp luật lao động.'),
    bl('Việc tạm hoãn, chấm dứt hợp đồng lao động thực hiện theo quy định của pháp luật lao động; bên chấm dứt hợp đồng trước thời hạn phải báo trước cho bên kia theo quy định.'),
    bl('Hợp đồng lao động được làm thành 02 bản có giá trị ngang nhau, mỗi bên giữ một bản và có hiệu lực kể từ ngày ký. Khi hai bên ký kết phụ lục hợp đồng lao động thì nội dung của phụ lục hợp đồng lao động cũng có giá trị như các nội dung của bản hợp đồng lao động này.'),
    P('', {after: 120}),
    signTable(['NGƯỜI LAO ĐỘNG', '(Ký, ghi rõ họ tên)', cnName], ['NGƯỜI SỬ DỤNG LAO ĐỘNG', '(Ký, ghi rõ họ tên)', direct ? personName(rs.danhXung, rs.ten) : ttName])
  ];
}

const todayStr = () => { const d = new Date(); return pad2(d.getDate()) + '/' + pad2(d.getMonth() + 1) + '/' + d.getFullYear(); };
const ageAt = (sinh, ref) => {
  const a = dateKey(sinh), b = dateKey(ref);
  if (!a || !b) return null;
  return Math.floor(b / 10000) - Math.floor(a / 10000) - (b % 10000 < a % 10000 ? 1 : 0);
};
const minorsOf = rec => rec.nc.filter(r => { const y = ageAt(r.ngaySinh, dateKey(rec.info.tuNgay) ? rec.info.tuNgay : todayStr()); return y != null && y < 18; });

function listDays(tu, den, max) {
  const a = dateKey(tu), b = dateKey(den);
  if (!a || !b || b < a) return [];
  const mk = k => new Date(Math.floor(k / 10000), Math.floor(k % 10000 / 100) - 1, k % 100);
  const out = [];
  for (let d = mk(a), e = mk(b); d <= e && out.length < max; d.setDate(d.getDate() + 1))
    if (d.getDay() !== 0) out.push(pad2(d.getDate()) + '/' + pad2(d.getMonth() + 1) + '/' + d.getFullYear());
  return out;
}

function docThamDinh(rec, ex) {
  const rs = rec.info, rsName = personName(rs.danhXung, rs.ten), vol = forecastVol(rs), box = '☐ Đạt   ☐ Không đạt';   // thẩm định trước khai thác: chỉ dùng khối lượng dự kiến
  const giay = (rs.giayTo || []).map(x => (x.loai === 'Khác' && x.ten ? x.ten : x.loai) + (x.so ? ' số ' + x.so : '') + (x.ngayCap ? ', ngày cấp ' + x.ngayCap : '') + (x.coQuan ? ', ' + x.coQuan : '')).join('; ');
  const yieldMax = forestYield(rs);
  const items = [
    ['Có giấy chứng nhận quyền sử dụng đất hoặc giấy xác nhận đất, rừng hợp pháp', giay || 'Chưa khai giấy tờ trong app'],
    ['Mục đích sử dụng đất là rừng sản xuất, đất lâm nghiệp; không phải rừng phòng hộ, rừng tự nhiên, rừng đặc dụng, khu vực khoanh nuôi bảo vệ (chú ý ký hiệu viết tắt)', ''],
    ['Giấy tờ đất còn trong chu kỳ khai thác; tuổi rừng phù hợp', ''],
    ['CCCD chủ rừng còn hiệu lực (không chấp nhận CMND), họ tên khớp giấy tờ đất', 'CCCD: ' + (rs.cccd || '…………')],
    ['Đất, rừng không có tranh chấp, khiếu kiện', ''],
    ['Không chuyển đổi từ rừng tự nhiên sau ngày 31/12/2020', ''],
    ['Có tọa độ, ranh giới lô khai thác rõ ràng', rs.lat != null && rs.lng != null ? 'Tọa độ: ' + rs.lat + ', ' + rs.lng : 'Chưa có tọa độ trong app'],
    ['Khối lượng dự kiến phù hợp khả năng cung ứng theo diện tích, định mức', (rs.dienTich ? 'Diện tích ' + rs.dienTich + ' ha' : 'Diện tích …… ha') + '; ' + (yieldMax ? 'dự kiến theo định mức ' + fmtT(Math.round(yieldMax * 1000)) + ' tấn' : 'chưa có định mức') + (vol ? '; khối lượng dùng: ' + fmtT(Math.round(vol.v * 1000)) + ' tấn' : '')],
    ['Vùng cung ứng không thuộc khu vực rủi ro đáng kể theo CNRA (hoặc đã có biện pháp giảm thiểu)', ''],
    ['Đã có Cam kết nguồn gốc gỗ (BM-11) và Cam kết sử dụng lao động (BM-12)', '']
  ];
  return [
    ...TITLE_HEAD(),
    P('**PHIẾU THẨM ĐỊNH CHỦ RỪNG VÀ RỪNG TRƯỚC KHI KHAI THÁC**', {al: 'center', sz: 28, before: 120, after: 40}),
    P('Mã rừng: ' + dot(rs.maRung, 4) + ' · Ngày thẩm định: ' + dot(ex.tdNgay, 6) + ' · Người thẩm định: ' + dot(ex.tdNguoi, 8), {al: 'center', after: 160}),
    P('**A. Chủ rừng:** ' + upper(rsName) + ' · Hợp đồng số: ' + dot(rs.soHopDong, 6) + ' · ký ngày: ' + dot(rs.ngayKyHopDong, 6), {al: 'left', after: 40}),
    P('CCCD số: ' + (rs.cccd || '…………') + ', cấp ngày ' + (rs.ngayCap || '…………') + ', nơi cấp ' + (rs.noiCap || '…………') + '. Địa chỉ: ' + (rs.diaChi || '…………'), {al: 'left', ind: 360, after: 80}),
    P('**B. Rừng thẩm định:** ' + (rs.tenRung ? rs.tenRung + ' · ' : '') + 'tại ' + dot(rs.diaDiem, 8), {al: 'left', after: 40}),
    P('Thời gian dự kiến khai thác: ' + (rs.tuNgay || '…/…/……') + ' – ' + (rs.denNgay || '…/…/……') + '.', {al: 'left', ind: 360, after: 100}),
    P('**C. Nội dung thẩm định**', {al: 'left', after: 60, keep: true}),
    T([650, 4500, 1750, 2455],
      [['STT', 'NỘI DUNG THẨM ĐỊNH', 'KẾT QUẢ', 'GHI CHÚ, DỮ LIỆU TRONG APP'], ...items.map((x, i) => [String(i + 1), x[0], box, x[1]])],
      {head: true, borders: true, sz: 17, rowH: 300, pad: 10, alignCols: ['center', 'left', 'center', 'left']}),
    P('**D. Kết luận:**  ☐ Đạt   ☐ Đạt có điều kiện   ☐ Không đạt (kiến nghị tạm dừng thu mua, khai thác)', {al: 'left', before: 60, after: 30, keep: true}),
    P('Điều kiện, yêu cầu khắc phục, thời hạn: …………………………………………………………………………………………', {al: 'left', after: 40, keep: true}),
    P('Đà Nẵng, ' + (ex.tdNgay ? 'ngày ' + ex.tdNgay : HAKHopDong.ngayTrong()), {al: 'right', after: 60, keep: true}),
    signTable(['NGƯỜI THẨM ĐỊNH', '(Ký, ghi rõ họ tên)', ex.tdNguoi || ''], ['CHỦ RỪNG', '(Ký, ghi rõ họ tên)', rsName])
  ];
}

function docNhatKy(rec, ex) {
  const rs = rec.info, rsName = personName(rs.danhXung, rs.ten), tt = rec.nc.find(isTT), ttName = personName(tt.danhXung, tt.ten);
  const days = listDays(rs.tuNgay, rs.denNgay, 62);
  const n = days.length || 31, vol = volumeOf(rs), dot1 = ex._kind !== 'all';   // dòng đối chiếu cuối đợt do người dùng ghi tay khi kết thúc: để TRỐNG ở gói đợt 1 và khi xuất lẻ (bản in không đổi khi có số liệu đợt 2); chỉ điền khi in một lần trọn bộ (“Tải toàn bộ hồ sơ”)
  const rows = Array.from({length: n}, (_, i) => [String(i + 1), days[i] || '', '', '', '', '', '', '']);
  return [
    P('**NHẬT KÝ KHAI THÁC HẰNG NGÀY**', {al: 'center', sz: 28, before: 60, after: 40}),
    P('Rừng ' + (rs.tenRung || rs.maRung) + ' · Mã rừng: **' + dot(rs.maRung, 4) + '** · Chủ rừng: **' + upper(rsName) + '** · Tổ trưởng: ' + ttName, {al: 'center', after: 40}),
    P('Địa điểm: ' + dot(rs.diaDiem, 8) + (rs.lat != null && rs.lng != null ? ' · Tọa độ: ' + rs.lat + ', ' + rs.lng : '') + ' · Thời gian khai thác: ' + (rs.tuNgay || '…/…/……') + ' – ' + (rs.denNgay || '…/…/……'), {al: 'center', after: 100}),
    P('Hướng dẫn: tổ trưởng ghi cuối mỗi ngày làm việc (không ghi dồn); khối lượng ghi theo ước tính tại bãi hoặc theo bảng kê lâm sản; chủ rừng, người giám sát đối chiếu khi kiểm tra. Ngày Chủ nhật đã được loại khỏi bảng.', {al: 'left', i: true, sz: 20, after: 80}),
    T([650, 1500, 1300, 2300, 2000, 2400, 3000, 1987],
      [['STT', 'NGÀY', 'SỐ NGƯỜI LÀM VIỆC', 'KHU VỰC, LÔ KHAI THÁC', 'KHỐI LƯỢNG KHAI THÁC (TẤN)', 'THIẾT BỊ SỬ DỤNG', 'GHI CHÚ, SỰ CỐ', 'TỔ TRƯỞNG KÝ'], ...rows,
        [{v: '**Tổng cộng**', span: 4}, '', '', '', '']],
      {head: true, borders: true, sz: 18, rowH: 380, pad: 15, alignCols: ['center', 'center', 'center', 'left', 'center', 'left', 'left', 'center']}),
    P('**Đối chiếu cuối đợt:** khối lượng khai thác theo nhật ký: ……… tấn · khối lượng nghiệm thu: ' + (!dot1 && vol && vol.src === 'thực tế' ? fmtT(Math.round(vol.v * 1000)) : '………') + ' tấn · khối lượng vận chuyển theo phiếu cân: ' + (!dot1 && (rec.pc || []).length ? fmtT(totalKg(rec.pc)) : '………') + ' tấn.', {al: 'left', before: 100, after: 80, keep: true}),
    T([5045, 5046, 5046], [
      ['**ĐẠI DIỆN TỔ KHAI THÁC**', '**CHỦ RỪNG**', '**NGƯỜI GIÁM SÁT**'],
      [{v: '(Ký, ghi rõ họ tên)', i: true}, {v: '(Ký, ghi rõ họ tên)', i: true}, {v: '(Ký, ghi rõ họ tên)', i: true}],
      ['', '', ''], ['', '', ''], ['', '', ''],
      ['**' + ttName + '**', '**' + rsName + '**', '']
    ], {borders: false, al: 'center', keep: true})
  ];
}

function docPhoBienFSC(rec, ex) {
  const rs = rec.info, rsName = personName(rs.danhXung, rs.ten), tt = rec.nc.find(isTT);
  const people = [[rsName, 'Chủ rừng'], ...[tt, ...rec.nc.filter(r => !isTT(r))].map(r => [personName(r.danhXung, r.ten), r.chucDanh]), ...groupsDX(rec).map(g => [g.ten, 'Đại diện bên vận chuyển (' + g.vaiTro.toLowerCase() + ')'])];
  const nd = [
    'Chỉ khai thác, vận chuyển gỗ rừng trồng hợp pháp; không có gỗ từ rừng tự nhiên, rừng phòng hộ, rừng đặc dụng, khu vực có giá trị bảo tồn cao.',
    'Chỉ khai thác đúng ranh giới, tọa độ và thời gian đã đăng ký; không lấn sang diện tích rừng, đất của người khác.',
    'Lập và lưu đầy đủ hồ sơ: bảng kê lâm sản, phiếu cân, hợp đồng, chứng từ thanh toán; không tẩy xóa, không bổ sung sai sự thật.',
    'Không trộn lẫn gỗ từ nguồn khác vào lô hàng; xe vận chuyển đúng tuyến, đúng chứng từ.',
    'Bảo đảm quyền người lao động: không lao động trẻ em, không cưỡng bức, không phân biệt đối xử; được trang bị bảo hộ và đào tạo an toàn lao động.',
    'Bảo vệ môi trường, nguồn nước; thu gom rác thải; phòng chống cháy.',
    'Chấp nhận để công ty giám sát, kiểm tra hiện trường và hồ sơ; khắc phục kịp thời các lỗi được nêu.',
    'Mọi khiếu nại, phản ánh liên quan gửi về đầu mối tiếp nhận: ' + dot(ex.fscDauMoi, 10) + '.'
  ];
  return [
    ...TITLE_HEAD(),
    P('**BIÊN BẢN PHỔ BIẾN CHÍNH SÁCH THU MUA GỖ HỢP PHÁP THEO TIÊU CHUẨN FSC**', {al: 'center', sz: 26, before: 120, after: 80}),
    P('Mã rừng: ' + dot(rs.maRung, 4) + ' · Địa điểm: ' + dot(rs.diaDiem, 8), {al: 'center', after: 140}),
    P('- Thời gian phổ biến: **' + dot(ex.fscNgay, 6) + '** · Địa điểm: **' + dot(ex.fscDiaDiem, 8) + '**', {al: 'left', after: 40}),
    P('- Người phổ biến: **' + dot(ex.fscNguoi, 8) + '**', {al: 'left', after: 100}),
    P('Nội dung đã được phổ biến cho chủ rừng, tổ khai thác và bên vận chuyển:', {after: 60, keep: true}),
    ...nd.map((x, i) => P((i + 1) + '. ' + x, {ind: 360, after: 30, sz: 24})),
    P('Những người có tên dưới đây đã được nghe phổ biến, hiểu rõ và cam kết thực hiện:', {before: 100, after: 80, keep: true}),
    T([650, 3000, 3200, 2505],
      [['STT', 'HỌ TÊN', 'VAI TRÒ', 'KÝ XÁC NHẬN'], ...people.map((x, i) => [String(i + 1), upper(x[0]), x[1], ''])],
      {head: true, borders: true, sz: 17, rowH: 300, pad: 10, alignCols: ['center', 'left', 'left', 'left']}),
    P('Đà Nẵng, ' + (ex.fscNgay ? 'ngày ' + ex.fscNgay : HAKHopDong.ngayTrong()), {al: 'right', before: 140, after: 80, keep: true}),
    signTable(['NGƯỜI PHỔ BIẾN', '(Ký, ghi rõ họ tên)', ex.fscNguoi || ''], ['CHỦ RỪNG', '(Ký, ghi rõ họ tên)', rsName])
  ];
}

function sign3(rsName, ttName, nguoi) {
  return T([5045, 5046, 5046], [
    ['**NGƯỜI KIỂM TRA**', '**ĐẠI DIỆN TỔ KHAI THÁC**', '**CHỦ RỪNG**'],
    [{v: '(Ký, ghi rõ họ tên)', i: true}, {v: '(Ký, ghi rõ họ tên)', i: true}, {v: '(Ký, ghi rõ họ tên)', i: true}],
    ['', ''  , ''], ['', '', ''],
    ['**' + (nguoi || '') + '**', '**' + ttName + '**', '**' + rsName + '**']
  ], {borders: false, al: 'center', keep: true});
}

function docSoTaiNan(rec, ex) {
  const rs = rec.info, rsName = personName(rs.danhXung, rs.ten), tt = rec.nc.find(isTT), ttName = personName(tt.danhXung, tt.ten);
  const blank = Array.from({length: 8}, (_, i) => [String(i + 1), '', '', '', '', '', '', '']);
  return [
    P('**SỔ THEO DÕI TAI NẠN LAO ĐỘNG VÀ SỰ CỐ**', {al: 'center', sz: 28, before: 60, after: 40}),
    P('Khai thác rừng ' + (rs.tenRung || rs.maRung) + ' · Mã rừng: **' + dot(rs.maRung, 4) + '** · Chủ rừng: **' + upper(rsName) + '**', {al: 'center', after: 40}),
    P('Địa điểm: ' + dot(rs.diaDiem, 8) + ' · Thời gian khai thác: ' + (rs.tuNgay || '…/…/……') + ' – ' + (rs.denNgay || '…/…/……') + ' · Tổ trưởng: ' + ttName, {al: 'center', after: 100}),
    P('Hướng dẫn: ghi ngay khi xảy ra tai nạn lao động hoặc sự cố (cháy, đổ dầu, hư hỏng thiết bị, sạt lở...). Tổ trưởng xác nhận trong ngày; chủ rừng xác nhận khi kiểm tra. Nếu không phát sinh thì ghi xác nhận ở phần cuối.', {al: 'left', i: true, sz: 22, after: 100}),
    T([600, 1700, 2300, 1500, 3300, 2000, 2337, 1400],
      [['STT', 'NGÀY, GIỜ', 'NGƯỜI BỊ NẠN / LIÊN QUAN (HỌ TÊN, CHỨC DANH)', 'LOẠI', 'MÔ TẢ SỰ CỐ, THIỆT HẠI', 'BIỆN PHÁP XỬ LÝ, KHẮC PHỤC', 'PHÒNG NGỪA LẶP LẠI', 'TỔ TRƯỞNG KÝ'], ...blank],
      {head: true, borders: true, sz: 18, rowH: 500, pad: 20, alignCols: ['center', 'center', 'left', 'center', 'left', 'left', 'left', 'center']}),
    P('Cột LOẠI ghi: TNLĐ nhẹ / TNLĐ nặng / Sự cố môi trường / Sự cố thiết bị / Sự cố cháy.', {al: 'left', i: true, sz: 20, before: 60, after: 100}),
    P('**Xác nhận kết thúc đợt khai thác:** ☐ Không phát sinh tai nạn lao động, sự cố   ☐ Có ……… vụ (đã ghi ở bảng trên)', {al: 'left', after: 80, keep: true}),
    P('Đà Nẵng, ' + HAKHopDong.ngayTrong(), {al: 'right', after: 60, keep: true}),
    T([7568, 7569], [
      ['**ĐẠI DIỆN TỔ KHAI THÁC**', '**CHỦ RỪNG**'],
      [{v: '(Ký, ghi rõ họ tên)', i: true}, {v: '(Ký, ghi rõ họ tên)', i: true}],
      ['', ''], ['', ''], ['', ''],
      ['**' + ttName + '**', '**' + rsName + '**']
    ], {borders: false, al: 'center', keep: true})
  ];
}

function docKiemTraThietBi(rec, ex) {
  const rs = rec.info, rsName = personName(rs.danhXung, rs.ten), tt = rec.nc.find(isTT), ttName = personName(tt.danhXung, tt.ten);
  const box = '☐ Tốt  ☐ Cần sửa';
  const nCua = Math.max(rec.nc.filter(r => /cưa/i.test(r.chucDanh || '')).length, 1);
  const nBinh = Math.max(parseInt(ex.tbSoBinh, 10) || 2, 1);
  const grp = t => [{v: '**' + t + '**', span: 7}];
  const rows = [];
  rows.push(grp('A. CƯA XĂNG VÀ DỤNG CỤ KHAI THÁC'));
  for (let i = 1; i <= nCua; i++) rows.push([String(i), 'Cưa xăng số ' + i, '', '', box, 'Xích, lưỡi cắt, phanh xích, bugi, dầu nhớt, bảo hộ', '']);
  rows.push([String(nCua + 1), 'Dao, rựa, dụng cụ cầm tay', '', '', box, 'Lưỡi, cán, độ an toàn', '']);
  rows.push(grp('B. PHƯƠNG TIỆN VẬN CHUYỂN'));
  const xe = rec.dx.length ? rec.dx : [{bienSo: '', loaiXe: ''}, {bienSo: '', loaiXe: ''}];
  xe.forEach((x, i) => rows.push([String(i + 1), (x.bienSo || '………………') + (x.loaiXe ? ' (' + x.loaiXe + ')' : ''), '',
    [x.kdDen ? 'Kiểm định đến ' + x.kdDen : '', x.hanBH ? 'Bảo hiểm đến ' + x.hanBH : ''].filter(Boolean).join('; '), box, 'Phanh, lốp, đèn, còi, tải trọng; giấy đăng ký, kiểm định, bảo hiểm', '']));
  rows.push(grp('C. BÌNH CHỮA CHÁY VÀ DỤNG CỤ PHÒNG CHÁY'));
  for (let i = 1; i <= nBinh; i++) rows.push([String(i), 'Bình chữa cháy số ' + i, '', 'Hạn dùng: ………', box, 'Áp suất, hạn sử dụng, vị trí đặt, dễ lấy', '']);
  return [
    P('**BIÊN BẢN KIỂM TRA, BẢO DƯỠNG THIẾT BỊ**', {al: 'center', sz: 28, before: 60, after: 40}),
    P('Cưa xăng · Phương tiện vận chuyển · Bình chữa cháy', {al: 'center', i: true, after: 80}),
    P('- Chủ rừng: **' + upper(rsName) + '** · Mã rừng: **' + dot(rs.maRung, 4) + '** · Địa điểm: ' + dot(rs.diaDiem, 8), {al: 'left', after: 40}),
    P('- Ngày kiểm tra: **' + dot(ex.tbNgay, 6) + '** · Người kiểm tra: **' + dot(ex.tbNguoi, 8) + '**', {al: 'left', after: 100}),
    T([650, 3000, 1800, 2400, 2200, 3200, 1887],
      [['STT', 'THIẾT BỊ / BIỂN KIỂM SOÁT', 'SỐ HIỆU / MÃ', 'HẠN KIỂM ĐỊNH, BẢO HIỂM, SỬ DỤNG', 'TÌNH TRẠNG', 'NỘI DUNG KIỂM TRA, BẢO DƯỠNG', 'GHI CHÚ'], ...rows],
      {head: true, borders: true, sz: 17, rowH: 320, pad: 10, alignCols: ['center', 'left', 'center', 'left', 'center', 'left', 'left']}),
    P('**Kết luận, kiến nghị xử lý thiết bị chưa đạt:** …………………………………………………………………………………………………………', {al: 'left', before: 60, after: 20}),
    P('Đà Nẵng, ' + HAKHopDong.ngayTrong(), {al: 'right', before: 0, after: 40}),
    sign3(rsName, ttName, ex.tbNguoi)
  ];
}

function docNghiemThu(rec, ex) {
  const rs = rec.info, rsName = personName(rs.danhXung, rs.ten), tt = rec.nc.find(isTT), ttName = personName(tt.danhXung, tt.ten);
  const direct = isDirect(rs), vol = volumeOf(rs), kg = vol ? Math.round(vol.v * 1000) : 0;
  const pr = payRows(rec, ex), bs = basisOf(rs), tien = direct ? 0 : (pr.sum || 0);
  const daTT = toNum(ex.ntDaTT) || 0;
  const hd = direct ? 'các hợp đồng lao động đã ký giữa chủ rừng và người lao động' : 'Hợp đồng khai thác gỗ keo số ' + ex._so.kt.so;
  const pcAll = totalKg(rec.pc || []), pcKg = rec._share ? pcAll * rec._share : pcAll;   // lô nhiều đội: phiếu cân là của cả lô, phần của đội chia theo số người
  return [
    ...TITLE_HEAD(),
    P('**BIÊN BẢN NGHIỆM THU VÀ THANH LÝ KHAI THÁC**', {al: 'center', sz: 28, before: 120, after: 60}),
    P('Số: ' + V(ex._so.nt.so, 18, SO_TRANG), {al: 'center', after: 200}),
    P(LAW_BLDS),
    P('- Căn cứ ' + hd + ';'),
    P('- Căn cứ kết quả khai thác thực tế tại rừng.'),
    P('Hôm nay, ' + VP(ngayV(ex.ntNgay, ex), S_NGAY) + ' tại ' + (rs.diaDiem || '…………') + ', chúng tôi gồm có:', {after: 140}),
    ...partyBlock('BÊN CHỦ RỪNG (BÊN A)', rs, rsName, {noSinh: true}),
    ...partyBlock(direct ? 'ĐẠI DIỆN TỔ KHAI THÁC (BÊN B)' : 'BÊN KHAI THÁC (BÊN B)', tt, ttName),
    P('Hai bên cùng tiến hành nghiệm thu và thanh lý với các nội dung sau:', {keep: true}),
    P('**Điều 1: Thông tin rừng đã khai thác**', {keep: true}),
    P('Mã rừng: ' + dot(rs.maRung, 4) + '. Địa điểm: ' + dot(rs.diaDiem, 8) + rungText(rs) + '.', {ind: 360}),
    P('Thời gian khai thác: ' + VP(tuDen(rs.tuNgay, rs.denNgay, ex), S_TUDEN) + '.', {ind: 360}),
    P('**Điều 2: Nghiệm thu khối lượng**', {keep: true}),
    P('2.1. Khối lượng khai thác được nghiệm thu: **' + V(vol ? fmtT(kg) : '………', 14) + ' tấn**' + (ex._mode === 'day' ? V(vol ? ' (' + vol.src + ')' : '', 0, '') : '') + '.', {ind: 360}),
    ...((pcKg || ex._mode !== 'day') ? [P(rec._share ? '2.2. Khối lượng đã vận chuyển về nhà máy theo phiếu cân: cả lô ' + V(pcAll ? fmtT(pcAll) : '', 14) + ' tấn (' + V(pcAll ? String((rec.pc || []).length) : '', 4) + ' chuyến), phần của đội “' + rec._doiTen + '” chia theo số người ' + V(pcKg ? fmtT(pcKg) : '', 14) + ' tấn.' : '2.2. Khối lượng đã vận chuyển về nhà máy theo phiếu cân: ' + V(pcKg ? fmtT(pcKg) : '', 14) + ' tấn (' + V(pcKg ? String((rec.pc || []).length) : '', 4) + ' chuyến).', {ind: 360})] : []),
    P(((pcKg || ex._mode !== 'day') ? '2.3' : '2.2') + '. Hiện trường đã được thu dọn; khai thác đúng ranh giới, thời gian; không phát sinh tranh chấp, tai nạn lao động hay sự cố môi trường.', {ind: 360}),
    P('**Điều 3: Thanh toán và thanh lý**', {keep: true}),
    ...(direct
      ? [P('3.1. Tiền công của người lao động được thanh toán theo hợp đồng lao động và Bảng thanh toán tiền công kèm theo.', {ind: 360})]
      : [P('3.1. Đơn giá khoán theo vai trò (' + bs.unit + '): ' + roleRates(rec).join('; ') + '. ' + (bs.qty === 'ha' ? 'Diện tích' : 'Khối lượng') + ' chia đều ' + pr.N + ' người. Thành tiền: **' + V(tien ? fmt(tien) : '………', 18) + ' đồng**' +
           (ex._mode === 'day' ? (tien ? ' (' + moneyWords(tien).replace(/\.$/, '') + ')' : '') : '') + '.', {ind: 360}),
         ...(ex._mode === 'day' ? [] : [P('Bằng chữ: ' + V(tien ? moneyWords(tien) : '', 0, '…'.repeat(64)), {ind: 360, i: true})]),
         P('3.2. Bên A đã thanh toán trước: ' + V(daTT ? fmt(daTT) : '…………………', 18) + ' đồng. Số tiền còn lại bên A thanh toán cho bên B: **' + V(tien && ex.ntDaTT ? fmt(Math.max(tien - daTT, 0)) : '…………………', 18) + ' đồng**.', {ind: 360})]),
    P('**Điều 4: Cam kết**', {keep: true}),
    P('Sau khi hai bên hoàn tất nghĩa vụ nêu trên, ' + hd + ' được thanh lý. Hai bên xác nhận không còn tranh chấp, khiếu nại nào khác về việc khai thác tại rừng nêu trên.', {ind: 360}),
    P('Biên bản được lập thành 02 bản, mỗi bên giữ 01 bản có giá trị như nhau và có hiệu lực kể từ ngày ký.', {ind: 360}),
    P('', {after: 100}),
    signTable(['ĐẠI DIỆN BÊN A', '(Ký, ghi rõ họ tên)', rsName], ['ĐẠI DIỆN BÊN B', '(Ký, ghi rõ họ tên)', ttName])
  ];
}

function docCamKetNguonGoc(rec, ex) {
  const rs = rec.info, rsName = personName(rs.danhXung, rs.ten), vol = forecastVol(rs);   // “khối lượng dự kiến”: không lấy số thực tế
  return [
    ...TITLE_HEAD(),
    P('**BẢN CAM KẾT NGUỒN GỐC GỖ RỪNG TRỒNG**', {al: 'center', sz: 28, before: 120, after: 60}),
    P('Kính gửi: ' + (ex.ckNhan ? upper(ex.ckNhan) : buyerName(rec) ? upper(buyerName(rec)) : '…………………………………………'), {al: 'center', after: 200}),
    P('- Căn cứ Luật Lâm nghiệp số 16/2017/QH14 ngày 15/11/2017;'),
    P('- Căn cứ Luật Đất đai số 31/2024/QH15 ngày 18/01/2024;'),
    LAW_BLDS ? P(LAW_BLDS) : P(''),
    P('Tôi tên là:', {after: 60, before: 80}),
    ...partyBlock('CHỦ RỪNG (NGƯỜI CAM KẾT)', rs, rsName, {noSinh: true}),
    P('Là chủ sử dụng diện tích rừng trồng có thông tin như sau:', {after: 60}),
    bl('Mã rừng: ' + dot(rs.maRung, 4) + (rs.tenRung ? ' (' + rs.tenRung + ')' : '')),
    bl('Địa điểm: ' + dot(rs.diaDiem, 8)),
    bl('Tọa độ (WGS84): ' + (rs.lat != null && rs.lng != null ? rs.lat + ', ' + rs.lng : '……………………')),
    bl('Diện tích: ' + (rs.dienTich ? rs.dienTich + ' ha' : '……… ha') + ' · Khối lượng dự kiến khai thác: ' + (vol ? fmtT(Math.round(vol.v * 1000)) + ' tấn' : '……… tấn')),
    bl('Giấy tờ về đất, rừng: ' + ((rs.giayTo || []).length ? (rs.giayTo || []).map(x => (x.loai === 'Khác' && x.ten ? x.ten : x.loai) + (x.so ? ' số ' + x.so : '') + (x.ngayCap ? ', ngày cấp ' + x.ngayCap : '') + (x.coQuan ? ', ' + x.coQuan : '')).join('; ') : '……………………………………')),
    bl('Thời gian khai thác: từ ngày ' + (rs.tuNgay || '…/…/……') + ' đến ngày ' + (rs.denNgay || '…/…/……')),
    P('Tôi cam kết với các nội dung sau:', {before: 120, after: 60, keep: true}),
    P('1. Tôi là người có quyền sử dụng, quản lý và khai thác hợp pháp diện tích rừng trồng nêu trên theo giấy tờ đã cung cấp.'),
    P('2. Gỗ khai thác hoàn toàn từ rừng trồng, không có nguồn gốc từ rừng tự nhiên, rừng phòng hộ, rừng đặc dụng, khu bảo tồn hoặc khu vực có giá trị bảo tồn cao.'),
    P('3. Diện tích không có tranh chấp, khiếu kiện về quyền sử dụng đất và rừng; không được chuyển đổi từ rừng tự nhiên sau ngày 31/12/2020.'),
    P('4. Chỉ khai thác trong ranh giới, tọa độ và thời gian nêu trên; không lấn sang diện tích rừng hoặc đất của người khác.'),
    P('5. Tuân thủ quy định pháp luật về lâm nghiệp, đất đai, lao động, bảo vệ môi trường và tôn trọng quyền của cộng đồng, hộ dân liền kề.'),
    P('6. Cung cấp đầy đủ, trung thực hồ sơ, tài liệu và đồng ý để bên nhận cam kết kiểm tra, truy xuất nguồn gốc gỗ tại hiện trường.'),
    P('7. Chịu hoàn toàn trách nhiệm trước pháp luật về nội dung cam kết. Nếu sai sự thật, tôi chấp nhận bị chấm dứt thu mua và bồi thường thiệt hại phát sinh (nếu có).'),
    P('Bản cam kết được lập thành 02 bản, mỗi bên giữ 01 bản có giá trị như nhau.', {before: 60}),
    P('Đà Nẵng, ' + (ex.ckNgay ? 'ngày ' + ex.ckNgay : HAKHopDong.ngayTrong()), {al: 'right', before: 120, after: 100}),
    signTable(['NGƯỜI CAM KẾT', '(Ký, ghi rõ họ tên)', rsName], ['XÁC NHẬN CỦA THÔN / UBND XÃ (nếu có)', '(Ký, ghi rõ họ tên, đóng dấu)', ''])
  ];
}

function docCamKetLaoDong(rec, ex) {
  const rs = rec.info, rsName = personName(rs.danhXung, rs.ten), tt = rec.nc.find(isTT), ttName = personName(tt.danhXung, tt.ten);
  const list = [tt, ...rec.nc.filter(r => !isTT(r))];
  return [
    ...TITLE_HEAD(),
    P('**BẢN CAM KẾT SỬ DỤNG LAO ĐỘNG**', {al: 'center', sz: 28, before: 120, after: 40}),
    P('Khai thác rừng ' + (rs.tenRung || rs.maRung) + ' · Mã rừng ' + dot(rs.maRung, 4), {al: 'center', after: 40}),
    P('(' + rs.diaDiem + ')', {al: 'center', i: true, after: 200}),
    ...LAW_LD.slice(0, 2).map(t => P('- ' + t, {after: 60})),
    P('Chúng tôi gồm: **' + upper(rsName) + '** (chủ rừng) và **' + upper(ttName) + '** (tổ trưởng, đại diện tổ khai thác), cùng cam kết đối với toàn bộ người lao động tham gia khai thác rừng nêu trên như sau:', {before: 80}),
    P('1. Chỉ sử dụng người lao động từ đủ 18 tuổi trở lên; không sử dụng lao động trẻ em.'),
    P('2. Không cưỡng bức lao động; không giữ giấy tờ tùy thân, tiền công của người lao động trái quy định; người lao động được tự nguyện làm việc và tự do chấm dứt hợp đồng theo quy định pháp luật.'),
    P('3. Không phân biệt đối xử về giới tính, dân tộc, tôn giáo, nguồn gốc xuất thân trong tuyển dụng, trả công và điều kiện làm việc.'),
    P('4. Ký hợp đồng lao động bằng văn bản; trả công đúng mức, đúng hạn theo hợp đồng.'),
    P('5. Trang bị đầy đủ bảo hộ lao động và đào tạo an toàn lao động cho mọi người trước khi làm việc; báo cáo và xử lý kịp thời khi có tai nạn lao động.'),
    P('6. Tôn trọng quyền thương lượng, quyền lập và gia nhập tổ chức đại diện của người lao động theo quy định pháp luật.'),
    P('Danh sách người lao động đã được phổ biến nội dung cam kết này và tự nguyện làm việc:', {before: 80, after: 100, keep: true}),
    T([650, 2800, 2200, 1500, 2205],
      [['STT', 'HỌ TÊN', 'CHỨC DANH', 'NGÀY SINH', 'KÝ XÁC NHẬN'],
        ...list.map((r, i) => [String(i + 1), upper(r.ten), r.chucDanh, r.ngaySinh || '', ''])],
      {head: true, borders: true, sz: 20, rowH: 420, alignCols: ['center', 'left', 'left', 'center', 'left']}),
    P('Đà Nẵng, ' + (ex.ckNgay ? 'ngày ' + ex.ckNgay : HAKHopDong.ngayTrong()), {al: 'right', before: 160, after: 100}),
    signTable(['CHỦ RỪNG', '(Ký, ghi rõ họ tên)', rsName], ['ĐẠI DIỆN TỔ KHAI THÁC', '(Ký, ghi rõ họ tên)', ttName])
  ];
}

function docKiemTraHienTruong(rec, ex) {
  const rs = rec.info, rsName = personName(rs.danhXung, rs.ten), tt = rec.nc.find(isTT), ttName = personName(tt.danhXung, tt.ten);
  const box = '☐ Đạt   ☐ Không đạt';
  const items = [
    'Ranh giới, tọa độ lô khai thác đã xác định, trùng với giấy tờ đất/rừng',
    'Không lấn ranh sang diện tích rừng hoặc đất của người khác',
    'Trong lô không có rừng tự nhiên, rừng phòng hộ, rừng đặc dụng',
    'Không có tranh chấp, khiếu nại về ranh giới hoặc quyền sử dụng',
    'Suối, nguồn nước, đường dốc, khu vực nhạy cảm được xác định; có biện pháp bảo vệ',
    'Đường vận xuất, bãi tập kết gỗ đúng vị trí, không gây xói lở',
    'Người lao động đủ 18 tuổi, có hợp đồng, được cấp bảo hộ và đào tạo an toàn',
    'Có biển cảnh báo khu vực khai thác; dụng cụ, cưa xăng, bình chữa cháy sẵn sàng',
    'Rác thải, dầu mỡ, vỏ bao bì được thu gom, không xả ra môi trường',
    'Cành ngọn được thu gom, xử lý; không đốt trái quy định; phòng chống cháy đảm bảo',
    'Khối lượng khai thác phù hợp bảng kê lâm sản',
    'Không phát sinh tai nạn lao động hoặc sự cố môi trường'
  ];
  return [
    P('**BIÊN BẢN KIỂM TRA HIỆN TRƯỜNG KHAI THÁC**', {al: 'center', sz: 28, before: 60, after: 40}),
    P('(Kiểm tra trước khai thác và sau khai thác)', {al: 'center', i: true, after: 120}),
    P('- Chủ rừng: **' + upper(rsName) + '** · Mã rừng: **' + dot(rs.maRung, 4) + '** · Địa điểm: ' + dot(rs.diaDiem, 8), {al: 'left', after: 40}),
    P('- Tọa độ (WGS84): ' + (rs.lat != null && rs.lng != null ? rs.lat + ', ' + rs.lng : '……………………') + ' · Diện tích: ' + (rs.dienTich ? rs.dienTich + ' ha' : '……… ha') + ' · Thời gian khai thác: ' + (rs.tuNgay || '…/…/……') + ' – ' + (rs.denNgay || '…/…/……'), {al: 'left', after: 40}),
    P('- Kiểm tra trước khai thác ngày: **' + dot(ex.ktNgayTruoc, 6) + '** · Kiểm tra sau khai thác ngày: **' + dot(ex.ktNgaySau, 6) + '** · Người kiểm tra: **' + dot(ex.ktNguoi, 8) + '**', {al: 'left', after: 120}),
    T([650, 7000, 2200, 2200, 3087],
      [['STT', 'NỘI DUNG KIỂM TRA', 'TRƯỚC KHAI THÁC', 'SAU KHAI THÁC', 'GHI CHÚ'],
        ...items.map((x, i) => [String(i + 1), x, box, box, ''])],
      {head: true, borders: true, sz: 18, rowH: 330, pad: 20, alignCols: ['center', 'left', 'center', 'center', 'left']}),
    P('**Kết luận:** ………………………………………………………………………………………………………………………………………', {al: 'left', before: 80, after: 40}),
    P('Đà Nẵng, ' + HAKHopDong.ngayTrong(), {al: 'right', before: 60, after: 60}),
    T([5045, 5046, 5046], [
      ['**NGƯỜI KIỂM TRA**', '**ĐẠI DIỆN TỔ KHAI THÁC**', '**CHỦ RỪNG**'],
      [{v: '(Ký, ghi rõ họ tên)', i: true}, {v: '(Ký, ghi rõ họ tên)', i: true}, {v: '(Ký, ghi rõ họ tên)', i: true}],
      ['', '', ''], ['', '', ''], ['', '', ''],
      ['**' + (ex.ktNguoi || '') + '**', '**' + ttName + '**', '**' + rsName + '**']
    ], {borders: false, al: 'center', keep: true})
  ];
}

function docXNKLVC(rec, ex, g) {
  const rs = rec.info, rsName = personName(rs.danhXung, rs.ten), tr = tripsOf(rec, g), kg = totalKg(tr);
  const hdNo = ex._so.vc.so;
  const ngSame = new Set(tr.map(r => r.noiGiao || '')).size <= 1;   // cùng một nơi giao thì Bảng kê đính kèm ghi một dòng, không đặt trong khung bảng
  const noiGiao = ex.vcDiemDen || (ex._mode === 'day' ? tr.map(r => r.noiGiao).find(Boolean) : '') || '………………';   // mẫu trống và in đè: chữ cố định phải giống nhau, không lấy từ phiếu cân   // điểm đến theo hồ sơ rừng; cột “Nơi giao” từng phiếu giữ nguyên dữ liệu nguồn
  return [
    ...TITLE_HEAD(),
    P('**BIÊN BẢN XÁC NHẬN KHỐI LƯỢNG VẬN CHUYỂN**', {al: 'center', sz: 28, before: 120, after: 60}),
    P('Số: ' + V(ex._so.xn.so, 18, SO_TRANG), {al: 'center', after: 0}),
    P('(Kèm theo Hợp đồng vận chuyển số ' + hdNo + ')', {al: 'center', i: true, after: 200}),
    P(LAW_BLDS),
    P('- Căn cứ Hợp đồng vận chuyển gỗ keo số ' + hdNo + ' giữa hai bên;'),
    P('- Căn cứ các phiếu cân do nhà máy tiếp nhận cấp cho từng chuyến hàng.'),
    P('Hôm nay, ' + VP(ngayV(ex.pcNgay, ex), S_NGAY) + ', chúng tôi gồm có:', {after: 160}),
    P('**BÊN CHỦ RỪNG (BÊN A): ' + upper(rsName) + '** — CCCD số ' + (rs.cccd || '…………') + ', địa chỉ thường trú: ' + (rs.diaChi || '…………') + '.', {after: 80}),
    P('**BÊN VẬN CHUYỂN (BÊN B): ' + upper(g.ten) + '** — CCCD số ' + (g.cccd || '…………') + ', địa chỉ thường trú: ' + (g.diaChi || '…………') + '.', {after: 120}),
    P('Hai bên cùng xác nhận khối lượng gỗ keo rừng trồng đã vận chuyển từ rừng tại ' + rs.diaDiem + (rungRef(rs) ? ' (' + rungRef(rs) + ')' : '') + ' về ' + noiGiao +
      ', ' + VP(tuDen(tr.length ? tr[0].ngay : '', tr.length ? tr[tr.length - 1].ngay : '', ex), S_TUDEN) + ', căn cứ phiếu cân nhà máy (khối lượng giao tại nhà máy), cụ thể trong **Bảng kê khối lượng đính kèm**:', {after: 120}),
    P('Tổng khối lượng xác nhận: **' + V(tr.length ? fmtT(kg) : '………', 14) + ' tấn** (' + V(tr.length ? String(tr.length) : '…', 4) + ' chuyến). Khối lượng này là căn cứ để thanh toán tiền vận chuyển theo Hợp đồng nêu trên.', {before: 80}),
    P('Biên bản được lập thành 02 bản, mỗi bên giữ 01 bản có giá trị như nhau. Hai bên không có ý kiến khác về khối lượng đã xác nhận.'),
    P('', {after: 120}),
    signTable(['ĐẠI DIỆN BÊN A', '(Ký, ghi rõ họ tên)', rsName], ['ĐẠI DIỆN BÊN B', '(Ký, ghi rõ họ tên)', g.ten]),
    ...(ex._mode === 'trong' || !tr.length ? [] : [   // Bảng kê khối lượng đính kèm: trang riêng, in đầy đủ khi đã có phiếu cân (không cần in khung rồi in đè)
      {t: 'br'},
      P('**BẢNG KÊ KHỐI LƯỢNG ĐÍNH KÈM**', {al: 'center', sz: 28, before: 0, after: 60, full: true}),
      P('(Kèm theo Biên bản xác nhận khối lượng vận chuyển số ' + ex._so.xn.so + ' và Hợp đồng vận chuyển số ' + hdNo + ')', {al: 'center', i: true, after: 160, full: true}),
      P('Bên vận chuyển (Bên B): **' + upper(g.ten) + '** · Mã rừng: ' + (rs.maRung || '…') + ' · ' + (tuDen(tr.length ? tr[0].ngay : '', tr.length ? tr[tr.length - 1].ngay : '', Object.assign({}, ex, {_mode: 'day'}))) + '.', {al: 'left', after: 120, full: true}),
      ...(ngSame ? [P('Nơi giao (nhà máy): **' + (ex.vcDiemDen || (tr[0] && tr[0].noiGiao) || '………………') + '**', {al: 'left', after: 120, full: true})] : []),
      ngSame
        ? T([650, 1700, 2100, 2400, 2505],   // cùng một nơi giao: ghi một dòng phía trên, không lặp trong khung bảng
          [['STT', 'Ngày cân', 'Biển kiểm soát', 'Số phiếu cân', 'Khối lượng (tấn)'],
            ...tr.map((r, i) => [String(i + 1), r.ngay, r.bienSo, r.soPhieu, fmtT(Math.round(r.kl * 1000))]),
            [{v: '**Tổng cộng (' + tr.length + ' chuyến)**', span: 4}, '**' + fmtT(kg) + '**']],
          {head: true, borders: true, sz: 20, full: true, alignCols: ['center', 'center', 'center', 'center', 'right']})
        : T([550, 1250, 1500, 1600, 2850, 1605],
          [['STT', 'Ngày cân', 'Biển kiểm soát', 'Số phiếu cân', 'Nơi giao (nhà máy)', 'Khối lượng (tấn)'],
            ...tr.map((r, i) => [String(i + 1), r.ngay, r.bienSo, r.soPhieu, r.noiGiao || '', fmtT(Math.round(r.kl * 1000))]),
            [{v: '**Tổng cộng (' + tr.length + ' chuyến)**', span: 5}, '**' + fmtT(kg) + '**']],
          {head: true, borders: true, sz: 20, full: true, alignCols: ['center', 'center', 'center', 'center', 'left', 'right']})])
  ];
}
function docTTVC(rec, ex, g) {
  const rs = rec.info, rsName = personName(rs.danhXung, rs.ten), py = payVC(rec, g), tp = transportPrice(rs);
  const hdNo = ex._so.vc.so;
  const tr = tripsOf(rec, g);
  return [
    ...TITLE_HEAD(),
    P('**BẢNG THANH TOÁN TIỀN VẬN CHUYỂN**', {al: 'center', sz: 28, before: 120, after: 60}),
    P('(Kèm theo Hợp đồng vận chuyển số ' + hdNo + ' và Biên bản xác nhận khối lượng vận chuyển số ' + V(ex._so.xn.so, 16, SO_TRANG) + ')', {al: 'center', i: true, after: 200}),
    P('**Bên trả tiền (Bên A): ' + upper(rsName) + '**', {after: 40}),
    P('Địa chỉ: ' + (rs.diaChi || '…………') + ' · CCCD số: ' + (rs.cccd || '…………'), {ind: 360, after: 100}),
    P('**Bên nhận tiền (Bên B): ' + upper(g.ten) + '**', {after: 40}),
    P('Địa chỉ: ' + (g.diaChi || '…………') + ' · CCCD số: ' + (g.cccd || '…………'), {ind: 360, after: 100}),
    P('Địa điểm giao hàng (theo hồ sơ rừng): ' + dot(ex.vcDiemDen, 10) + '.', {after: 100}),
    P('Mã rừng: ' + (rs.maRung || '…') + ' · Kỳ thanh toán: ' + VP(tuDen(tr.length ? tr[0].ngay : '', tr.length ? tr[tr.length - 1].ngay : '', ex), S_TUDEN) + '.', {after: 40}),
    P('Đơn giá: **' + fmt(g.donGia) + ' đồng/tấn** (' + tp.text + '), tính theo khối lượng giao tại nhà máy theo phiếu cân.', {after: 140}),
    P('Chi tiết từng xe: xem **Bảng kê chi tiết thanh toán đính kèm**.', {after: 80}),
    P('Tổng khối lượng: **' + V(py.n ? fmtT(py.kg) : '………', 14) + ' tấn** (' + V(py.n ? String(py.n) : '…', 4) + ' chuyến).', {before: 40, after: 40}),
    P('Tổng số tiền thanh toán: **' + V(py.n ? fmt(py.tien) : '………', 16) + ' đồng**.', {before: 40, after: 40}),
    P('Bằng chữ: ' + V(moneyWords(py.tien), 0, '…'.repeat(64)), {i: true}),
    P('Các khoản thuế, phí (nếu có) được thực hiện theo quy định của pháp luật hiện hành.'),
    P('Đà Nẵng, ' + VP(ngayV(ex.pcNgay, ex), S_NGAY), {al: 'right', before: 160, after: 120}),
    T([3118, 3118, 3119], [
      ['**NGƯỜI LẬP BẢNG**', '**ĐẠI DIỆN BÊN A**', '**ĐẠI DIỆN BÊN B**'],
      [{v: '(Ký, ghi rõ họ tên)', i: true}, {v: '(Ký, ghi rõ họ tên)', i: true}, {v: '(Ký, ghi rõ họ tên)', i: true}],
      ['', '', ''], ['', '', ''], ['', '', ''],
      ['**' + (ex.pcNguoiLap || '') + '**', '**' + rsName + '**', '**' + g.ten + '**']
    ], {borders: false, al: 'center', keep: true}),
    ...(ex._mode === 'trong' || !py.n ? [] : [   // Bảng kê chi tiết thanh toán đính kèm: trang riêng, in đầy đủ khi đã có phiếu cân
      {t: 'br'},
      P('**BẢNG KÊ CHI TIẾT THANH TOÁN ĐÍNH KÈM**', {al: 'center', sz: 28, before: 0, after: 60, full: true}),
      P('(Kèm theo Bảng thanh toán tiền vận chuyển, Hợp đồng vận chuyển số ' + hdNo + ' và Biên bản xác nhận khối lượng vận chuyển số ' + ex._so.xn.so + ')', {al: 'center', i: true, after: 160, full: true}),
      P('Bên nhận tiền (Bên B): **' + upper(g.ten) + '** · Mã rừng: ' + (rs.maRung || '…') + ' · Đơn giá: ' + fmt(g.donGia) + ' đồng/tấn.', {al: 'left', after: 120, full: true}),
      T([650, 2100, 1300, 1700, 1700, 1905],
        [['STT', 'Biển kiểm soát', 'Số chuyến', 'Khối lượng (tấn)', 'Đơn giá (đồng/tấn)', 'Thành tiền (đồng)'],
          ...py.rows.map((r, i) => [String(i + 1), r.bienSo, String(r.n), fmtT(r.kg), fmt(g.donGia), fmt(r.tien)]),
          [{v: '**Tổng cộng**', span: 2}, '**' + py.n + '**', '**' + fmtT(py.kg) + '**', '', '**' + fmt(py.tien) + '**']],
        {head: true, borders: true, sz: 20, full: true, alignCols: ['center', 'center', 'center', 'right', 'right', 'right']})])
  ];
}
function docHDVC(rec, ex, g) {
  const rs = rec.info;
  const rsName = personName(rs.danhXung, rs.ten);
  return [
    ...TITLE_HEAD(),
    P('**HỢP ĐỒNG VẬN CHUYỂN GỖ KEO**', {al: 'center', sz: 28, before: 120, after: 60}),
    P('Số: ' + ex._so.vc.so, {al: 'center', after: 0}),
    P('“V/v: Vận chuyển gỗ rừng trồng”', {al: 'center', i: true, after: 200}),
    P(LAW_BLDS),
    ...(hdRef(rs) ? [P('- ' + hdRef(rs))] : []),
    P('- Căn cứ Luật Lâm nghiệp số 16/2017/QH14 ngày 15/11/2017;'),
    P('- Căn cứ Luật Trật tự, an toàn giao thông đường bộ số 36/2024/QH15 ngày 27/06/2024;'),
    P('- Căn cứ khả năng và nhu cầu của hai bên.'),
    P('Hôm nay, ' + ngayLine(ex) + ' tại nhà ' + upper(rsName) + ' (địa chỉ: ' + rs.diaChi + '), chúng tôi gồm có:', {after: 160}),
    ...partyBlock('BÊN CHỦ RỪNG (BÊN A)', rs, rsName, {noSinh: true}),
    ...partyBlock('BÊN VẬN CHUYỂN (BÊN B)', g, g.ten),
    P('Sau khi bàn bạc cụ thể, hai bên thống nhất ký hợp đồng vận chuyển gỗ keo rừng trồng với các điều khoản như sau:'),
    P('**Điều 1: Nội dung**', {keep: true}),
    P('Bên B đồng ý nhận và bên A đồng ý thuê vận chuyển gỗ Keo Lai rừng trồng có kiểm soát tại địa chỉ: ' + rs.diaDiem + rungText(rs) + '.'),
    ...(rungRef(rs) ? [P('- ' + rungRef(rs) + '.', {ind: 360})] : []),
    P('- Địa điểm nhận hàng: tại rừng nêu trên. Địa điểm giao hàng: ' + dot(ex.vcDiemDen, 10) + '. Cự ly vận chuyển: ' + (HAKCuLy.eff(rs).km ? String(HAKCuLy.eff(rs).km).replace('.', ',') + ' km' : '……') + '.', {ind: 360}),
    P('- Danh sách phương tiện, người điều khiển và giấy tờ kèm theo được nêu tại Phụ lục của hợp đồng này.' + (g.vaiTro === 'Tài xế' ? ' Bên B cam kết đã được chủ xe của các phương tiện nêu tại Phụ lục đồng ý cho thực hiện hợp đồng này.' : ''), {ind: 360}),
    P('**Điều 2: Giá cả và phương thức thanh toán**', {keep: true}),
    P('2.1. Giá thanh toán: ' + fmt(g.donGia) + ' đồng/tấn (' + transportPrice(rs).text + ').', {ind: 360}),
    P('2.2. Hình thức thanh toán: Căn cứ theo số lượng bán cho nhà máy, hai bên tiến hành thanh toán bằng tiền mặt/chuyển khoản.', {ind: 360}),
    P('2.3. Thời gian vận chuyển: từ ngày ' + ((rs.vanChuyen || {}).tuNgay || rs.tuNgay || '……………..') + ' đến hết khi hoàn thành công việc.', {ind: 360}),
    P('2.4. Các chi phí khác (cầu đường, bốc xếp, thuế...): ' + dot(ex.vcChiPhi, 10) + '.', {ind: 360}),
    P('**Điều 3: Trách nhiệm của mỗi bên**', {keep: true}),
    P('3.1. Trách nhiệm của bên A', {keep: true}),
    bl('Thanh toán cho bên B theo đơn giá quy định tại Điều 2 dựa trên khối lượng gỗ đã vận chuyển.'),
    bl('Lập bảng kê lâm sản theo quy định của Thông tư 84/2025/TT-BNNMT đưa người vận chuyển mang đi đường.'),
    bl('Chịu trách nhiệm mở đường và các chi phí khác để tạo điều kiện cho bên B vận chuyển gỗ.'),
    bl('Sắp xếp lao động khai thác phù hợp để kịp tiến độ theo hợp đồng.'),
    P('3.2. Trách nhiệm của bên B', {keep: true}),
    bl('Điều xe đúng quy định theo thông báo của Bên A. Chịu trách nhiệm về kỹ thuật, an toàn cho phương tiện vận chuyển, không quá khổ, quá tải và phải đảm bảo vận chuyển đúng lịch trình, không để thất thoát hàng hóa của bên A.'),
    bl('Bố trí, sắp xếp đủ xe vận chuyển gỗ phù hợp với tiến độ và thời gian khai thác.'),
    bl('Phương tiện chở hàng và người vận chuyển phải có đầy đủ giấy tờ theo quy định. Khi vận chuyển phải mang theo giấy tờ vận chuyển gồm bảng kê lâm sản theo Thông tư 84/2025/TT-BNNMT do chủ rừng tự khai báo.'),
    bl('Phương tiện phải có giấy đăng ký, giấy kiểm định, bảo hiểm trách nhiệm dân sự còn hiệu lực; người điều khiển có giấy phép lái xe phù hợp với loại xe; chấp hành quy định về trật tự, an toàn giao thông đường bộ và chịu trách nhiệm về vi phạm, tai nạn trong quá trình vận chuyển.'),
    bl('Phải kiểm soát chặt chẽ gỗ vận chuyển từ rừng về nhà máy, tránh sự lẫn lộn các nguồn nguyên liệu khác không phù hợp trong quá trình vận chuyển.'),
    bl('Sắp xếp số lượng xe phù hợp đủ để kịp tiến độ khai thác rừng.'),
    bl('Đảm bảo thời gian vận chuyển như điều 2 của hợp đồng.'),
    bl('Chịu mọi trách nhiệm và tất cả chi phí phát sinh cho các xe vận chuyển.'),
    P('**Điều 4. Hiệu lực hợp đồng**', {keep: true}),
    P('Nếu một trong hai bên muốn chấm dứt hợp đồng trước thời hạn thì phải thông báo cho bên kia trước ít nhất 03 ngày.'),
    P('**Điều 5. Điều khoản chung**', {keep: true}),
    bl('Không bên nào đơn phương hủy bỏ hợp đồng. Trường hợp bên nào đơn phương hủy bỏ hợp đồng thì phải chịu trách nhiệm bồi thường toàn bộ thiệt hại, mất mát đã gây ra cho bên còn lại.'),
    bl('Hai bên cam kết thực hiện đầy đủ và đúng theo các điều khoản trong hợp đồng này. Mọi thay đổi đối với hợp đồng, hai bên cùng nhau bàn bạc và xác nhận bằng văn bản cụ thể.'),
    bl('Trường hợp tranh chấp phát sinh trong quá trình thực hiện hợp đồng, trước hết hai bên phải thỏa thuận để dàn xếp. Quyết định của Tòa án là quyết định cuối cùng và ràng buộc 2 bên. Chi phí Tòa án và các khoản chi phí khác liên quan do bên thua kiện chịu.'),
    bl('Hợp đồng được lập thành 02 bản, mỗi bên giữ 01 bản có giá trị pháp lý như nhau và có hiệu lực kể từ ngày ký.'),
    P('', {after: 120}),
    signTable(['ĐẠI DIỆN BÊN A', '(Ký, ghi rõ họ tên)', rsName], ['ĐẠI DIỆN BÊN B', '(Ký, ghi rõ họ tên)', g.ten]),
    {t: 'br'},
    P('**PHỤ LỤC**', {al: 'center', after: 0}),
    P('**DANH SÁCH XE VẬN CHUYỂN GỖ KEO**', {al: 'center', after: 60}),
    P('Kèm theo Hợp đồng vận chuyển số ' + ex._so.vc.so + ' — Bên vận chuyển: ' + upper(g.ten), {al: 'center', after: 200}),
    T([650, 1250, 950, 1500, 1000, 1000, 1900, 1105],
      [['STT', 'Biển kiểm soát', 'Loại xe', 'Chủ xe', 'Ngày cấp đăng ký xe', 'Bảo hiểm đến hạn', 'Kiểm định (từ ngày – đến ngày)', 'SĐT'],
        ...g.xe.map((x, i) => [String(i + 1), x.bienSo, x.loaiXe || '', x.chuXe || '', x.cavet || '', x.hanBH || '',
          (x.kdTu || x.kdDen) ? (x.kdTu || '…') + ' – ' + (x.kdDen || '…') : '', x.sdt || ''])],
      {head: true, borders: true, sz: 18, alignCols: ['center', 'center', 'left', 'left', 'center', 'center', 'center', 'center']}),
    P('', {after: 120}),
    P('**DANH SÁCH TÀI XẾ**', {al: 'center', after: 60}),
    T([650, 1100, 1430, 1300, 1000, 1575, 1300, 1000],
      [['STT', 'Biển kiểm soát', 'Tên tài xế', 'CCCD', 'Ngày cấp CCCD', 'Thường trú', 'Số GPLX', 'Đến hạn GPLX'],
        ...g.xe.map((x, i) => x.taiXe
          ? [String(i + 1), x.bienSo, x.taiXe, x.cccdTx || '', x.ngayCapTx || '', x.diaChiTx || '', x.gplx || '', x.hanGplx || '']
          : [String(i + 1), x.bienSo, x.chuXe + ' (chủ xe)', x.cccd || '', x.ngayCap || '', x.diaChi || '', x.gplx || '', x.hanGplx || ''])],
      {head: true, borders: true, sz: 18, alignCols: ['center', 'center', 'left', 'center', 'center', 'left', 'center', 'center']})
  ];
}

