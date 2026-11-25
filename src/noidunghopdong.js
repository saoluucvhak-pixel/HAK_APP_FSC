'use strict';
/* Nội dung các biểu mẫu hợp đồng và biên bản (BM-01…BM-20): dựng khối văn bản từ dữ liệu lô, không chạm giao diện.
 * Tách từ ui/app/06-noi-dung-hop-dong.js: mã giữ nguyên; mọi tên dùng từ phần còn lại của giao diện (cơ sở dữ liệu đang mở, tiện ích, các module khác)
 * đi qua đối tượng ctx do giao diện cấp (getter, đọc giá trị hiện tại lúc gọi). Kiểm thử đơn vị truyền ctx giả. */
(function (root) {
  function create(ctx) {
    /* ========== Nội dung hợp đồng (theo mẫu đã duyệt) ========== */
    const TITLE_HEAD = () => [
      ctx.P('**CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM**', {al: 'center', after: 0}),
      ctx.P('**Độc lập – Tự do – Hạnh phúc**', {al: 'center', after: 280, bdb: true, ind: 2300, indR: 2300})
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
    const buyerName = rec => ((rec.info.muaHang || {}).ten || (ctx.theCompany() || {}).ten || '').trim();
    const ngayLine = ex => ex.ngayKy ? 'ngày ' + ex.ngayKy : ctx.HAKHopDong.ngayTrong();

    function partyBlock(label, p, fullName, o = {}) {   // o.noSinh: không in năm sinh (chủ rừng không còn khai ngày sinh)
      if (p && p.loai === 'doanhnghiep') return [   // bên vận chuyển là doanh nghiệp (danh mục đơn vị vận chuyển)
        ctx.P('**' + label + ': ' + ctx.upper(fullName) + '**', {after: 60}),
        ctx.P('Mã số thuế: ' + (p.mst || '…………'), {ind: 360, after: 40}),
        ctx.P('Địa chỉ trụ sở: ' + (p.diaChi || '…………'), {ind: 360, after: 40}),
        ctx.P('Người đại diện: ' + (p.daiDien || '…………') + (p.chucVu ? ' – Chức vụ: ' + p.chucVu : ''), {ind: 360, after: p.sdt ? 40 : 160}),
        ...(p.sdt ? [ctx.P('Điện thoại: ' + p.sdt, {ind: 360, after: 160})] : [])
      ];
      return [
        ctx.P('**' + label + ': ' + ctx.upper(fullName) + '**', {after: 60}),
        ...(o.noSinh ? [] : [ctx.P('Sinh năm: ' + (p.ngaySinh || '…………'), {ind: 360, after: 40})]),
        ctx.P('Căn cước công dân số: ' + (p.cccd || '…………') + ', cấp ngày: ' + (p.ngayCap || '…………') + ', nơi cấp: ' + (p.noiCap || '…………'), {ind: 360, after: 40}),
        ctx.P('Địa chỉ thường trú: ' + (p.diaChi || '…………'), {ind: 360, after: o.noSinh && p.sdt ? 40 : 160}),
        ...(o.noSinh && p.sdt ? [ctx.P('Điện thoại: ' + p.sdt, {ind: 360, after: 160})] : [])   // chủ rừng có khai số điện thoại thì in
      ];
    }
    function signTable(l, r) {
      return ctx.T([4677, 4678], [
        ['**' + l[0] + '**', '**' + r[0] + '**'],
        [{v: l[1], i: true}, {v: r[1], i: true}],
        ['', ''], ['', ''], ['', ''],
        ['**' + l[2] + '**', '**' + r[2] + '**']
      ], {borders: false, al: 'center', keep: true});
    }

    /* BÊN NHẬN KHOÁN để in (3.0): bản chụp đã chọn trong hợp đồng của đội (doi.benNhanKhoanBan). Không có (hồ sơ cũ) → null: in theo Tổ trưởng như trước.
     * Trả {p (dạng partyBlock: pháp nhân → loai 'doanhnghiep'), ten (tên in ở dòng bên B), ky (tên người ký), chucVuKy, laTT (bên nhận khoán chính là Tổ trưởng)} */
    function benKhoanIn(rec, tt) {
      const t = rec._team || (rec.doi && rec.doi.length === 1 ? rec.doi[0] : null), c = t && t.benNhanKhoanBan; if (!c || !ctx.trim(c.ten)) return null;
      if (c.loai === 'phapnhan') return {p: {loai: 'doanhnghiep', mst: c.mst, diaChi: c.diaChi, daiDien: c.daiDien, chucVu: c.chucVu, sdt: c.sdt}, ten: c.ten, ky: c.daiDien || '', chucVuKy: c.chucVu || '', phapNhan: true, laTT: false};
      const ten = ctx.personName(c.danhXung, c.ten), laTT = !!(tt && ((ctx.trim(c.cccd) && ctx.HAKModel.cccdSo(c.cccd) === ctx.HAKModel.cccdSo(tt.cccd)) || (!ctx.trim(c.cccd) && ctx.keyName(c.ten) === ctx.keyName(tt.ten))));
      return {p: {danhXung: c.danhXung, ten: c.ten, ngaySinh: c.ngaySinh, cccd: c.cccd, ngayCap: c.ngayCap, noiCap: c.noiCap, diaChi: c.diaChi, sdt: c.sdt}, ten, ky: ten, chucVuKy: c.chucVu || '', phapNhan: false, laTT};
    }
    /* khối Bên B của biểu mẫu giao khoán: bên nhận khoán (nếu đã chọn) + dòng Tổ trưởng phụ trách tổ khi khác bên nhận khoán */
    function benBGiaoKhoan(label, rec, tt, ttName) {
      const b = benKhoanIn(rec, tt); if (!b) return partyBlock(label, tt, ttName);
      return [...partyBlock(label, b.p, b.ten), ...(b.laTT ? [] : [ctx.P('Tổ trưởng tổ khai thác (phụ trách tổ, chấm công, nhận và chi trả tiền công theo Giấy ủy quyền): **' + ctx.upper(ttName) + '**', {ind: 360, after: 160})])];
    }
    /* ô ký của Bên B: người đại diện (pháp nhân) hoặc cá nhân nhận khoán; hồ sơ cũ: Tổ trưởng */
    const kyBenB = (rec, tt, ttName) => { const b = benKhoanIn(rec, tt); return b ? ['ĐẠI DIỆN BÊN B', b.chucVuKy ? b.chucVuKy + ' (Ký, ghi rõ họ tên' + (b.phapNhan ? ', đóng dấu)' : ')') : '(Ký, ghi rõ họ tên)', b.ky] : ['ĐẠI DIỆN BÊN B', '(Ký, ghi rõ họ tên)', ttName]; };

    function docGiaoKhoan(rec, ex) {
      const rs = rec.info, tt = rec.nc.find(ctx.isTT), ttName = ctx.personName(tt.danhXung, tt.ten), pr = ctx.payRows(rec, Object.assign({}, ex, {_forecast: true})), bs = ctx.basisOf(rs);   // hợp đồng ký trước khai thác: tổng khoán theo sản lượng DỰ KIẾN, không đổi khi nhập khối lượng thực tế
      const rsName = ctx.personName(rs.danhXung, rs.ten);
      return [
        ...TITLE_HEAD(),
        ctx.P('**HỢP ĐỒNG KHAI THÁC GỖ KEO**', {al: 'center', sz: 28, before: 120, after: 60}),
        ctx.P('Số: ' + ex._so.kt.so, {al: 'center', after: 0}),
        ctx.P('“V/v: Khai thác gỗ rừng trồng”', {al: 'center', i: true, after: 200}),
        ctx.P(LAW_BLDS),
        ...(hdRef(rs) ? [ctx.P('- ' + hdRef(rs))] : []),
        ctx.P('- Căn cứ khả năng và nhu cầu của hai bên.'),
        ctx.P('Hôm nay, ' + ngayLine(ex) + ' tại nhà ' + ctx.upper(rsName) + ' (địa chỉ: ' + rs.diaChi + '), chúng tôi gồm có:', {after: 160}),
        ...partyBlock('BÊN CHỦ RỪNG (BÊN A)', rs, rsName, {noSinh: true}),
        ...benBGiaoKhoan('BÊN KHAI THÁC (BÊN B)', rec, tt, ttName),
        ctx.P('Sau khi bàn bạc cụ thể, hai bên thống nhất ký hợp đồng khai thác gỗ keo rừng trồng với các điều khoản như sau:'),
        ctx.P('**Điều 1: Nội dung**', {keep: true}),
        ctx.P('Bên B đồng ý nhận và bên A đồng ý giao khai thác gỗ Keo Lai rừng trồng có kiểm soát tại địa chỉ: ' + rs.diaDiem + ctx.rungText(rs) + '.'),
        ...(rec._doiTen ? [ctx.P('Lô được giao cho ' + rec._nDoi + ' đội khai thác làm song song, mỗi đội ký hợp đồng riêng. Phạm vi giao cho đội “' + rec._doiTen + '” (Tổ trưởng ' + ttName + '): ' + [typeof rs.dienTich === 'number' ? ctx.fmtTan(rs.dienTich) + ' ha' : '', typeof rs.klHoSoCu === 'number' ? ctx.fmtTan(rs.klHoSoCu) + ' tấn' : ''].filter(Boolean).join(', ') + ' (phần của lô chia theo số người của các đội).')] : []),
        ctx.P('**Điều 2: Giá cả và phương thức thanh toán**', {keep: true}),
        ctx.P('2.1. Đơn giá khoán theo vai trò (' + bs.unit + '): ' + ctx.roleRates(rec).join('; ') + '.', {ind: 360}),
        ...(pr.plan.ngc ? [ctx.P('2.2. Hình thức trả theo ngày công: số công của từng người do Tổ trưởng chấm hằng ngày vào Bảng chấm công; tiền của mỗi người bằng số công thực tế nhân với đơn giá công theo vai trò ở mục 2.1. Bên B nhận thay cho cả tổ và chi trả lại cho từng người.' + (pr.sum && pr.plan.cong != null ? ' Dự tính ' + ctx.fmtCong(pr.plan.cong) + ' công mỗi người (theo thời gian khai thác, không tính Chủ nhật), tổng tiền công dự tính: ' + ctx.fmt(pr.sum) + ' đồng.' : ''), {ind: 360})] : [])
        ,...(pr.plan.ngc ? [] : ctx.khoanSuyRa(rec) ? (kh => [
          ctx.P('2.2. Đơn giá khoán của tổ (giá Tổ trưởng ký) là **đơn giá bình quân ' + kh.price + ' ' + kh.bs.unit + '**, tính từ định biên nhân sự ' + kh.k.N + ' người của tổ (kể cả Tổ trưởng) theo đơn giá của từng vị trí:', {ind: 360, after: 40}),
          ...kh.pos.map(x => ctx.bl(x.cd + ': ' + (x.n ? x.n + ' người × ' + ctx.fmt(x.rate) + ' ' + kh.bs.unit + ' = ' + ctx.fmt(x.n * x.rate) : 'chưa có người ở vị trí này (đơn giá ' + (x.rate ? ctx.fmt(x.rate) : '………') + ' ' + kh.bs.unit + ')'))),
          ctx.bl('Cơ sở tính giá trung bình: tổng (số người × đơn giá vị trí) chia tổng số người = ' + kh.formula + '.'),
          ctx.bl((kh.bs.qty === 'ha' ? 'Diện tích khai thác' : 'Sản lượng khai thác') + ' chia đều cho ' + kh.k.N + ' người; tiền của mỗi người bằng phần được chia nhân với đơn giá vị trí của người đó.'),
          ...(pr.sum ? [ctx.bl('Tổng giá trị khoán = đơn giá bình quân × ' + kh.qty + ' = **' + ctx.fmt(pr.sum) + ' đồng**, bằng tổng tiền thanh toán cho ' + kh.k.N + ' người kể cả Tổ trưởng (cộng tiền của từng người theo Bảng thanh toán tiền công).')] : [])
        ])(ctx.khoanSuyRa(rec)) : [ctx.P('2.2. ' + (bs.qty === 'ha' ? 'Diện tích khai thác' : 'Sản lượng khai thác') + ' được chia đều cho ' + pr.N + ' người trong tổ; tiền của mỗi người bằng phần được chia nhân với đơn giá khoán theo vai trò của người đó.' + (pr.sum ? ' Tổng tiền khoán dự tính: ' + ctx.fmt(pr.sum) + ' đồng.' : ''), {ind: 360})]),
        // căn cứ thanh toán theo ĐÚNG hình thức trả công (tấn: giữ nguyên câu cũ để hợp đồng đã in theo tấn không đổi)
        ctx.P('2.3. Hình thức thanh toán: ' + (pr.plan.ngc ? 'Căn cứ số công thực tế của từng người ghi trong Bảng chấm công' : bs.qty === 'ha' ? 'Căn cứ diện tích đã khai thác xong và được hai bên nghiệm thu' : 'Căn cứ theo số lượng bán cho nhà máy') + ', hai bên tiến hành thanh toán bằng tiền mặt.', {ind: 360}),
        ctx.P('2.4. Thời gian khai thác: từ ngày ' + (rs.tuNgay || '…/…/……') + ' ' +
          (rs.denNgay ? 'đến ngày ' + rs.denNgay : 'đến hết khi khai thác hết rừng keo tại địa điểm trên') + '.', {ind: 360}),
        ctx.P('**Điều 3: Trách nhiệm của mỗi bên**', {keep: true}),
        ctx.P('3.1. Trách nhiệm của bên A', {keep: true}),
        ctx.bl(pr.plan.ngc ? 'Thanh toán cho bên B theo đơn giá quy định tại Điều 2 dựa trên số công thực tế ghi trong Bảng chấm công.' : bs.qty === 'ha' ? 'Thanh toán cho bên B theo đơn giá quy định tại Điều 2 dựa trên diện tích đã khai thác xong được nghiệm thu.' : 'Thanh toán cho bên B theo đơn giá quy định tại Điều 2 dựa trên khối lượng gỗ đã khai thác.'),
        ctx.bl('Chịu trách nhiệm mở đường và các chi phí khác để tạo điều kiện cho bên B khai thác gỗ.'),
        ctx.bl('Sắp xếp xe vận chuyển theo đúng tiến độ.'),
        ctx.P('3.2. Trách nhiệm của bên B', {keep: true}),
        ctx.bl('Tổ chức lực lượng lao động khai thác đủ để kịp tiến độ khai thác.'),
        ctx.bl('Sử dụng lao động hợp pháp đúng theo quy định của Pháp luật. Không sử dụng lao động trẻ em, lao động cưỡng bức.'),
        ctx.bl('Phải có danh sách đội khai thác xác định rõ tên, tuổi người lao động.'),
        ctx.bl(benKhoanIn(rec, tt) && !benKhoanIn(rec, tt).laTT ? 'Có Giấy ủy quyền của toàn bộ người lao động trong tổ để Tổ trưởng ' + ttName + ' thay mặt tổ thực hiện hợp đồng này cùng Bên B (kèm theo hợp đồng).' : 'Có Giấy ủy quyền của toàn bộ người lao động trong tổ để Bên B thay mặt giao kết và thực hiện hợp đồng này (kèm theo hợp đồng).'),
        ctx.bl('Phải trang bị đầy đủ bảo hộ lao động và đào tạo về an toàn lao động cho lao động khai thác.'),
        ctx.bl('Khai thác đảm bảo đúng phạm vi khai thác, tránh sự lẫn lộn các nguồn nguyên liệu khác không phù hợp.'),
        ctx.bl('Tuân thủ các quy định về bảo vệ môi trường.'),
        ctx.bl('Đảm bảo thời gian khai thác như điều 2 của hợp đồng.'),
        ctx.bl('Chịu mọi trách nhiệm và tất cả chi phí phát sinh cho tổ khai thác.'),
        ctx.P('**Điều 4. Hiệu lực hợp đồng**', {keep: true}),
        ctx.P('Nếu một trong hai bên muốn chấm dứt hợp đồng trước thời hạn thì phải thông báo cho bên kia trước ít nhất 03 ngày.'),
        ctx.P('**Điều 5. Điều khoản chung**', {keep: true}),
        ctx.bl('Không bên nào đơn phương hủy bỏ hợp đồng. Trường hợp bên nào đơn phương hủy bỏ hợp đồng thì phải chịu trách nhiệm bồi thường toàn bộ thiệt hại, mất mát đã gây ra cho bên còn lại.'),
        ctx.bl('Hai bên cam kết thực hiện đầy đủ và đúng theo các điều khoản trong hợp đồng này. Mọi thay đổi đối với hợp đồng, hai bên cùng nhau bàn bạc và xác nhận bằng văn bản cụ thể.'),
        ctx.bl('Trường hợp tranh chấp phát sinh trong quá trình thực hiện hợp đồng, trước hết hai bên phải thỏa thuận để dàn xếp. Quyết định của Tòa án là quyết định cuối cùng và ràng buộc 2 bên. Chi phí Tòa án và các khoản chi phí khác liên quan do bên thua kiện chịu.'),
        ctx.bl('Hợp đồng được lập thành 02 bản, mỗi bên giữ 01 bản có giá trị pháp lý như nhau và có hiệu lực kể từ ngày ký.'),
        ctx.P('', {after: 120}),
        signTable(['ĐẠI DIỆN BÊN A', '(Ký, ghi rõ họ tên)', rsName], kyBenB(rec, tt, ttName))
      ];
    }

    function docBHLD(rec, ex) {
      const rs = rec.info, tt = rec.nc.find(ctx.isTT);
      const list = [tt, ...rec.nc.filter(r => !ctx.isTT(r))];
      const rows = list.map((r, i) => {
        const n = ctx.normOf(r.chucDanh, ctx.normRefCapPhat(rec, ex));
        return [String(i + 1), ctx.upper(r.ten), r.chucDanh, n.qa || '', n.giay || '', n.mu || '', n.gang || '', n.nut || '', n.kinh || '', ''];
      });
      return [
        ctx.P('**DANH SÁCH CẤP PHÁT BHLĐ CHO ĐỘI KHAI THÁC RỪNG ' + ctx.upper(ctx.personName(rs.danhXung, rs.ten)) + '**', {al: 'center', sz: 26, before: 120, after: 60}),
        ctx.P('(Địa chỉ: ' + rs.diaDiem + ')', {al: 'center', after: 60}),
        ...(rungRef(rs) ? [ctx.P(rungRef(rs), {al: 'center', i: true, sz: 22, after: 160})] : []),
        ctx.P('- Căn cứ Luật An toàn, vệ sinh lao động số 84/2015/QH13 ngày 25/06/2015 và Bộ luật Lao động số 45/2019/QH14 ngày 20/11/2019;'),
        ctx.P('- Ngày cấp phát: **' + dot(ex.capNgay, 6) + '** · Thời hạn sử dụng: **' + dot(ex.capHan, 6) + '**.' + (ctx.HAKDinhMuc.pick(ctx.db, ctx.normRefCapPhat(rec, ex)).ver.tuNgay ? ' Định mức theo bản có hiệu lực từ ngày ' + ctx.HAKDinhMuc.pick(ctx.db, ctx.normRefCapPhat(rec, ex)).ver.tuNgay + '.' : ''), {after: 160}),
        ctx.T([700, 1800, 1400, 775, 775, 775, 775, 775, 780, 800],
          [['STT', 'HỌ TÊN', 'CHỨC DANH CÔNG VIỆC', 'Quần áo', 'Giày/ủng', 'Mũ', 'Găng tay', 'Nút chống ồn', 'Kính bảo hộ', 'Ký nhận'], ...rows],
          {head: true, borders: true, alignCols: ['center', 'left', 'left', 'center', 'center', 'center', 'center', 'center', 'center', 'center']}),
        ctx.P('Người lao động đã nhận đủ phương tiện bảo vệ cá nhân theo danh sách trên, cam kết sử dụng đúng mục đích, giữ gìn và báo ngay khi hư hỏng để được thay thế.', {before: 160, after: 120}),
        ctx.P('Đà Nẵng, ' + (ex.capNgay ? 'ngày ' + ex.capNgay : ctx.HAKHopDong.ngayTrong()), {al: 'right', after: 120}),
        signTable(['NGƯỜI CẤP PHÁT', '(Ký, ghi rõ họ tên)', ex.capNguoi || ctx.personName(rs.danhXung, rs.ten)], ['ĐẠI DIỆN TỔ KHAI THÁC', '(Ký, ghi rõ họ tên)', ctx.personName(tt.danhXung, tt.ten)])
      ];
    }

    function docHDLD(rec, ex, cn) {
      const rs = rec.info, tt = rec.nc.find(ctx.isTT);
      const ttName = ctx.personName(tt.danhXung, tt.ten), cnName = ctx.personName(cn.danhXung, cn.ten);
      const ngc = rs.hinhThucLuong === 'ngaycong', direct = ctx.isDirect(rs), A = direct ? rs : tt;
      const items = ctx.BHLD_ITEMS.filter(([k]) => ctx.normOf(cn.chucDanh, ctx.normRefHDLD(rec, ex))[k]).map(x => x[2]).join(', ');
      return [
        ...TITLE_HEAD(),
        ctx.P('**HỢP ĐỒNG LAO ĐỘNG**', {al: 'center', sz: 28, before: 120, after: 60}),
        ctx.P('Số: ……/HĐLĐ/' + ctx.HAKHopDong.NAM_TRONG, {al: 'center', after: 200}),
        ...LAW_LD.map(t => ctx.P('- ' + t, {after: 60})),
        ctx.P('Đà Nẵng, ' + ngayLine(ex).replace('ngày ', 'ngày ') , {al: 'right', after: 200}),
        ctx.P('Chúng tôi, một bên là ' + (A.danhXung === 'Bà' ? 'Bà' : 'Ông') + ': **' + ctx.upper(A.ten) + '**. Quốc tịch: Việt Nam. Dân tộc: Kinh.', {after: 60}),
        ctx.P(direct ? 'Là chủ rừng, người sử dụng lao động khai thác gỗ keo tại ' + rs.diaDiem + '.'
          : 'Là tổ trưởng, người nhận khoán khai thác gỗ keo của ' + ctx.upper(ctx.personName(rs.danhXung, rs.ten)) + ' (địa chỉ: ' + rs.diaChi + ').', {after: 60}),
        ctx.P('Căn cước công dân số: ' + (A.cccd || '…') + ', cấp ngày: ' + (A.ngayCap || '…') + ', tại: ' + (A.noiCap || '…') + '.', {after: 60}),
        ctx.P('Địa chỉ: ' + (A.diaChi || '…'), {after: 160}),
        ctx.P('Và một bên là người lao động:', {after: 60}),
        ctx.P('**' + ctx.upper(cnName) + '**', {after: 60}),
        ctx.P('Sinh ngày: ' + (cn.ngaySinh || '…') + ' · Giới tính: ' + (cn.danhXung === 'Bà' ? 'Nữ' : cn.danhXung === 'Ông' ? 'Nam' : '…'), {ind: 360, after: 40}),
        ctx.P('Căn cước công dân số: ' + (cn.cccd || '…') + ', cấp ngày: ' + (cn.ngayCap || '…') + ', tại: ' + (cn.noiCap || '…') + '.', {ind: 360, after: 40}),
        ctx.P('Địa chỉ: ' + (cn.diaChi || '…'), {ind: 360, after: 160}),
        ctx.P('Thoả thuận ký kết hợp đồng lao động và cam kết làm đúng những điều khoản sau đây:'),
        ctx.P('**Điều 1: Thời hạn và công việc hợp đồng:**', {keep: true}),
        ctx.bl('Loại hợp đồng lao động: có thời hạn'),
        ctx.bl('Từ ngày ' + (rs.ngayBDLD || rs.tuNgay || '…') + ' đến ngày kết thúc công việc ' + (direct ? 'khai thác.' : 'giao khoán.')),
        ctx.bl('Địa điểm làm việc: ' + rs.diaDiem + (rungRef(rs) ? ' (' + rungRef(rs) + ')' : '')),
        ctx.bl('Chức danh chuyên môn: ' + cn.chucDanh),
        ctx.bl('Công việc phải làm: Khai thác gỗ rừng trồng.'),
        ctx.P('**Điều 2: Chế độ làm việc:**', {keep: true}),
        ctx.bl('Thời giờ làm việc: 08 giờ/ngày'),
        ctx.bl('Được cấp phát những dụng cụ BHLĐ làm việc gồm: ' + items + ' Bảo hộ lao động.'),
        ctx.P('**Điều 3: Nghĩa vụ và quyền lợi của người lao động:**', {keep: true}),
        ctx.P('1. Quyền lợi:', {keep: true}),
        ctx.bl('Phương tiện đi lại làm việc: Tự túc.'),
        ctx.bl('Mức lương chính hoặc tiền công: ' + ctx.fmt(ctx.rateOf(rs, cn)) + (ngc ? ' đồng/ngày công.' : ' đồng/tấn.')),
        ctx.bl('Hình thức trả lương: ' + (ngc ? 'Theo ngày công thực tế làm việc.' : 'Lương khoán theo sản lượng.')),
        ctx.bl('Được trả lương: ' + (ngc ? 'Theo kỳ chấm công, căn cứ bảng chấm công.' : 'Khi hoàn thành đợt khai thác, căn cứ vào phiếu cân hàng mà nhà máy cung cấp.')),
        ctx.bl('Phụ cấp lương và các khoản bổ sung khác: ' + (ex.hdPhuCap || 'Không.')),
        ctx.bl('Chế độ nâng bậc, nâng lương: ' + (ex.hdNangLuong || 'Không áp dụng; mức công được điều chỉnh khi hai bên thỏa thuận bằng phụ lục hợp đồng.')),
        ctx.bl('Chế độ nghỉ ngơi: Nghỉ ngày Chủ nhật và Lễ tết theo quy định của Luật Lao động.'),
        ctx.bl('Bảo hiểm xã hội, bảo hiểm y tế, bảo hiểm thất nghiệp: Đã bao gồm trong lương.'),
        ctx.bl('Chế độ đào tạo: Được đào tạo về An toàn lao động trong khai thác.'),
        ctx.P('2. Nghĩa vụ:', {keep: true}),
        ctx.bl('Hoàn thành những công việc đã cam kết trong hợp đồng lao động.'),
        ctx.bl('Chấp hành lệnh điều hành khai thác, nội quy kỷ luật lao động, an toàn lao động.'),
        ctx.P('**Điều 4. Nghĩa vụ và quyền hạn của người sử dụng lao động**', {keep: true}),
        ctx.P('1. Nghĩa vụ:', {keep: true}),
        ctx.bl('Bảo đảm việc làm và thực hiện đầy đủ những điều đã cam kết trong hợp đồng lao động.'),
        ctx.bl('Thanh toán đầy đủ, đúng thời hạn các chế độ và quyền lợi cho người lao động theo hợp đồng lao động.'),
        ctx.P('2. Quyền hạn:', {keep: true}),
        ...(direct ? [] : [ctx.bl('Được quyền ký hợp đồng khai thác thay mặt cho toàn thể công nhân khai thác với chủ rừng.')]),
        ctx.bl('Điều hành người lao động hoàn thành công việc theo hợp đồng (bố trí, điều chuyển, tạm ngừng việc...).'),
        ctx.bl('Tạm hoãn, chấm dứt hợp đồng lao động, kỷ luật người lao động theo quy định của pháp luật.'),
        ctx.P('**Điều 5. Điều khoản thi hành**', {keep: true}),
        ctx.bl('Những vấn đề về lao động không ghi trong hợp đồng lao động này thì áp dụng theo quy định của pháp luật lao động.'),
        ctx.bl('Việc tạm hoãn, chấm dứt hợp đồng lao động thực hiện theo quy định của pháp luật lao động; bên chấm dứt hợp đồng trước thời hạn phải báo trước cho bên kia theo quy định.'),
        ctx.bl('Hợp đồng lao động được làm thành 02 bản có giá trị ngang nhau, mỗi bên giữ một bản và có hiệu lực kể từ ngày ký. Khi hai bên ký kết phụ lục hợp đồng lao động thì nội dung của phụ lục hợp đồng lao động cũng có giá trị như các nội dung của bản hợp đồng lao động này.'),
        ctx.P('', {after: 120}),
        signTable(['NGƯỜI LAO ĐỘNG', '(Ký, ghi rõ họ tên)', cnName], ['NGƯỜI SỬ DỤNG LAO ĐỘNG', '(Ký, ghi rõ họ tên)', direct ? ctx.personName(rs.danhXung, rs.ten) : ttName])
      ];
    }

    const todayStr = () => { const d = new Date(); return ctx.pad2(d.getDate()) + '/' + ctx.pad2(d.getMonth() + 1) + '/' + d.getFullYear(); };
    const ageAt = (sinh, ref) => {
      const a = ctx.dateKey(sinh), b = ctx.dateKey(ref);
      if (!a || !b) return null;
      return Math.floor(b / 10000) - Math.floor(a / 10000) - (b % 10000 < a % 10000 ? 1 : 0);
    };
    const minorsOf = rec => rec.nc.filter(r => { const y = ageAt(r.ngaySinh, ctx.dateKey(rec.info.tuNgay) ? rec.info.tuNgay : todayStr()); return y != null && y < 18; });

    function listDays(tu, den, max) {
      const a = ctx.dateKey(tu), b = ctx.dateKey(den);
      if (!a || !b || b < a) return [];
      const mk = k => new Date(Math.floor(k / 10000), Math.floor(k % 10000 / 100) - 1, k % 100);
      const out = [];
      for (let d = mk(a), e = mk(b); d <= e && out.length < max; d.setDate(d.getDate() + 1))
        if (d.getDay() !== 0) out.push(ctx.pad2(d.getDate()) + '/' + ctx.pad2(d.getMonth() + 1) + '/' + d.getFullYear());
      return out;
    }

    function docThamDinh(rec, ex) {
      const rs = rec.info, rsName = ctx.personName(rs.danhXung, rs.ten), vol = ctx.forecastVol(rs), box = '☐ Đạt   ☐ Không đạt';   // thẩm định trước khai thác: chỉ dùng khối lượng dự kiến
      const giay = (rs.giayTo || []).map(x => (x.loai === 'Khác' && x.ten ? x.ten : x.loai) + (x.so ? ' số ' + x.so : '') + (x.ngayCap ? ', ngày cấp ' + x.ngayCap : '') + (x.coQuan ? ', ' + x.coQuan : '')).join('; ');
      const yieldMax = ctx.forestYield(rs);
      const items = [
        ['Có giấy chứng nhận quyền sử dụng đất hoặc giấy xác nhận đất, rừng hợp pháp', giay || 'Chưa khai giấy tờ trong app'],
        ['Mục đích sử dụng đất là rừng sản xuất, đất lâm nghiệp; không phải rừng phòng hộ, rừng tự nhiên, rừng đặc dụng, khu vực khoanh nuôi bảo vệ (chú ý ký hiệu viết tắt)', ''],
        ['Giấy tờ đất còn trong chu kỳ khai thác; tuổi rừng phù hợp', ''],
        ['CCCD chủ rừng còn hiệu lực (không chấp nhận CMND), họ tên khớp giấy tờ đất', 'CCCD: ' + (rs.cccd || '…………')],
        ['Đất, rừng không có tranh chấp, khiếu kiện', ''],
        ['Không chuyển đổi từ rừng tự nhiên sau ngày 31/12/2020', ''],
        ['Có tọa độ, ranh giới lô khai thác rõ ràng', rs.lat != null && rs.lng != null ? 'Tọa độ: ' + rs.lat + ', ' + rs.lng : 'Chưa có tọa độ trong app'],
        ['Khối lượng dự kiến phù hợp khả năng cung ứng theo diện tích, định mức', (rs.dienTich ? 'Diện tích ' + rs.dienTich + ' ha' : 'Diện tích …… ha') + '; ' + (yieldMax ? 'dự kiến theo định mức ' + ctx.fmtT(Math.round(yieldMax * 1000)) + ' tấn' : 'chưa có định mức') + (vol ? '; khối lượng dùng: ' + ctx.fmtT(Math.round(vol.v * 1000)) + ' tấn' : '')],
        ['Vùng cung ứng không thuộc khu vực rủi ro đáng kể theo CNRA (hoặc đã có biện pháp giảm thiểu)', ''],
        ['Đã có Cam kết nguồn gốc gỗ (BM-11) và Cam kết sử dụng lao động (BM-12)', '']
      ];
      return [
        ...TITLE_HEAD(),
        ctx.P('**PHIẾU THẨM ĐỊNH CHỦ RỪNG VÀ RỪNG TRƯỚC KHI KHAI THÁC**', {al: 'center', sz: 28, before: 120, after: 40}),
        ctx.P('Mã rừng: ' + dot(rs.maRung, 4) + ' · Ngày thẩm định: ' + dot(ex.tdNgay, 6) + ' · Người thẩm định: ' + dot(ex.tdNguoi, 8), {al: 'center', after: 160}),
        ctx.P('**A. Chủ rừng:** ' + ctx.upper(rsName) + ' · Hợp đồng số: ' + dot(rs.soHopDong, 6) + ' · ký ngày: ' + dot(rs.ngayKyHopDong, 6), {al: 'left', after: 40}),
        ctx.P('CCCD số: ' + (rs.cccd || '…………') + ', cấp ngày ' + (rs.ngayCap || '…………') + ', nơi cấp ' + (rs.noiCap || '…………') + '. Địa chỉ: ' + (rs.diaChi || '…………'), {al: 'left', ind: 360, after: 80}),
        ctx.P('**B. Rừng thẩm định:** ' + (rs.tenRung ? rs.tenRung + ' · ' : '') + 'tại ' + dot(rs.diaDiem, 8), {al: 'left', after: 40}),
        ctx.P('Thời gian dự kiến khai thác: ' + (rs.tuNgay || '…/…/……') + ' – ' + (rs.denNgay || '…/…/……') + '.', {al: 'left', ind: 360, after: 100}),
        ctx.P('**C. Nội dung thẩm định**', {al: 'left', after: 60, keep: true}),
        ctx.T([650, 4500, 1750, 2455],
          [['STT', 'NỘI DUNG THẨM ĐỊNH', 'KẾT QUẢ', 'GHI CHÚ, DỮ LIỆU TRONG APP'], ...items.map((x, i) => [String(i + 1), x[0], box, x[1]])],
          {head: true, borders: true, sz: 17, rowH: 300, pad: 10, alignCols: ['center', 'left', 'center', 'left']}),
        ctx.P('**D. Kết luận:**  ☐ Đạt   ☐ Đạt có điều kiện   ☐ Không đạt (kiến nghị tạm dừng thu mua, khai thác)', {al: 'left', before: 60, after: 30, keep: true}),
        ctx.P('Điều kiện, yêu cầu khắc phục, thời hạn: …………………………………………………………………………………………', {al: 'left', after: 40, keep: true}),
        ctx.P('Đà Nẵng, ' + (ex.tdNgay ? 'ngày ' + ex.tdNgay : ctx.HAKHopDong.ngayTrong()), {al: 'right', after: 60, keep: true}),
        signTable(['NGƯỜI THẨM ĐỊNH', '(Ký, ghi rõ họ tên)', ex.tdNguoi || ''], ['CHỦ RỪNG', '(Ký, ghi rõ họ tên)', rsName])
      ];
    }

    function docNhatKy(rec, ex) {
      const rs = rec.info, rsName = ctx.personName(rs.danhXung, rs.ten), tt = rec.nc.find(ctx.isTT), ttName = ctx.personName(tt.danhXung, tt.ten);
      const days = listDays(rs.tuNgay, rs.denNgay, 62);
      const n = days.length || 31, vol = ctx.volumeOf(rs), dot1 = ex._kind !== 'all';   // dòng đối chiếu cuối đợt do người dùng ghi tay khi kết thúc: để TRỐNG ở gói đợt 1 và khi xuất lẻ (bản in không đổi khi có số liệu đợt 2); chỉ điền khi in một lần trọn bộ (“Tải toàn bộ hồ sơ”)
      const rows = Array.from({length: n}, (_, i) => [String(i + 1), days[i] || '', '', '', '', '', '', '']);
      return [
        ctx.P('**NHẬT KÝ KHAI THÁC HẰNG NGÀY**', {al: 'center', sz: 28, before: 60, after: 40}),
        ctx.P('Rừng ' + (rs.tenRung || rs.maRung) + ' · Mã rừng: **' + dot(rs.maRung, 4) + '** · Chủ rừng: **' + ctx.upper(rsName) + '** · Tổ trưởng: ' + ttName, {al: 'center', after: 40}),
        ctx.P('Địa điểm: ' + dot(rs.diaDiem, 8) + (rs.lat != null && rs.lng != null ? ' · Tọa độ: ' + rs.lat + ', ' + rs.lng : '') + ' · Thời gian khai thác: ' + (rs.tuNgay || '…/…/……') + ' – ' + (rs.denNgay || '…/…/……'), {al: 'center', after: 100}),
        ctx.P('Hướng dẫn: tổ trưởng ghi cuối mỗi ngày làm việc (không ghi dồn); khối lượng ghi theo ước tính tại bãi hoặc theo bảng kê lâm sản; chủ rừng, người giám sát đối chiếu khi kiểm tra. Ngày Chủ nhật đã được loại khỏi bảng.', {al: 'left', i: true, sz: 20, after: 80}),
        ctx.T([650, 1500, 1300, 2300, 2000, 2400, 3000, 1987],
          [['STT', 'NGÀY', 'SỐ NGƯỜI LÀM VIỆC', 'KHU VỰC, LÔ KHAI THÁC', 'KHỐI LƯỢNG KHAI THÁC (TẤN)', 'THIẾT BỊ SỬ DỤNG', 'GHI CHÚ, SỰ CỐ', 'TỔ TRƯỞNG KÝ'], ...rows,
            [{v: '**Tổng cộng**', span: 4}, '', '', '', '']],
          {head: true, borders: true, sz: 18, rowH: 380, pad: 15, alignCols: ['center', 'center', 'center', 'left', 'center', 'left', 'left', 'center']}),
        ctx.P('**Đối chiếu cuối đợt:** khối lượng khai thác theo nhật ký: ……… tấn · khối lượng nghiệm thu: ' + (!dot1 && vol && vol.src === 'thực tế' ? ctx.fmtT(Math.round(vol.v * 1000)) : '………') + ' tấn · khối lượng vận chuyển theo phiếu cân: ' + (!dot1 && (rec.pc || []).length ? ctx.fmtT(ctx.totalKg(rec.pc)) : '………') + ' tấn.', {al: 'left', before: 100, after: 80, keep: true}),
        ctx.T([5045, 5046, 5046], [
          ['**ĐẠI DIỆN TỔ KHAI THÁC**', '**CHỦ RỪNG**', '**NGƯỜI GIÁM SÁT**'],
          [{v: '(Ký, ghi rõ họ tên)', i: true}, {v: '(Ký, ghi rõ họ tên)', i: true}, {v: '(Ký, ghi rõ họ tên)', i: true}],
          ['', '', ''], ['', '', ''], ['', '', ''],
          ['**' + ttName + '**', '**' + rsName + '**', '']
        ], {borders: false, al: 'center', keep: true})
      ];
    }

    function docPhoBienFSC(rec, ex) {
      const rs = rec.info, rsName = ctx.personName(rs.danhXung, rs.ten), tt = rec.nc.find(ctx.isTT);
      const people = [[rsName, 'Chủ rừng'], ...[tt, ...rec.nc.filter(r => !ctx.isTT(r))].map(r => [ctx.personName(r.danhXung, r.ten), r.chucDanh]), ...ctx.groupsDX(rec).map(g => [g.ten, 'Đại diện bên vận chuyển (' + g.vaiTro.toLowerCase() + ')'])];
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
        ctx.P('**BIÊN BẢN PHỔ BIẾN CHÍNH SÁCH THU MUA GỖ HỢP PHÁP THEO TIÊU CHUẨN FSC**', {al: 'center', sz: 26, before: 120, after: 80}),
        ctx.P('Mã rừng: ' + dot(rs.maRung, 4) + ' · Địa điểm: ' + dot(rs.diaDiem, 8), {al: 'center', after: 140}),
        ctx.P('- Thời gian phổ biến: **' + dot(ex.fscNgay, 6) + '** · Địa điểm: **' + dot(ex.fscDiaDiem, 8) + '**', {al: 'left', after: 40}),
        ctx.P('- Người phổ biến: **' + dot(ex.fscNguoi, 8) + '**', {al: 'left', after: 100}),
        ctx.P('Nội dung đã được phổ biến cho chủ rừng, tổ khai thác và bên vận chuyển:', {after: 60, keep: true}),
        ...nd.map((x, i) => ctx.P((i + 1) + '. ' + x, {ind: 360, after: 30, sz: 24})),
        ctx.P('Những người có tên dưới đây đã được nghe phổ biến, hiểu rõ và cam kết thực hiện:', {before: 100, after: 80, keep: true}),
        ctx.T([650, 3000, 3200, 2505],
          [['STT', 'HỌ TÊN', 'VAI TRÒ', 'KÝ XÁC NHẬN'], ...people.map((x, i) => [String(i + 1), ctx.upper(x[0]), x[1], ''])],
          {head: true, borders: true, sz: 17, rowH: 300, pad: 10, alignCols: ['center', 'left', 'left', 'left']}),
        ctx.P('Đà Nẵng, ' + (ex.fscNgay ? 'ngày ' + ex.fscNgay : ctx.HAKHopDong.ngayTrong()), {al: 'right', before: 140, after: 80, keep: true}),
        signTable(['NGƯỜI PHỔ BIẾN', '(Ký, ghi rõ họ tên)', ex.fscNguoi || ''], ['CHỦ RỪNG', '(Ký, ghi rõ họ tên)', rsName])
      ];
    }

    function sign3(rsName, ttName, nguoi) {
      return ctx.T([5045, 5046, 5046], [
        ['**NGƯỜI KIỂM TRA**', '**ĐẠI DIỆN TỔ KHAI THÁC**', '**CHỦ RỪNG**'],
        [{v: '(Ký, ghi rõ họ tên)', i: true}, {v: '(Ký, ghi rõ họ tên)', i: true}, {v: '(Ký, ghi rõ họ tên)', i: true}],
        ['', ''  , ''], ['', '', ''],
        ['**' + (nguoi || '') + '**', '**' + ttName + '**', '**' + rsName + '**']
      ], {borders: false, al: 'center', keep: true});
    }

    function docSoTaiNan(rec, ex) {
      const rs = rec.info, rsName = ctx.personName(rs.danhXung, rs.ten), tt = rec.nc.find(ctx.isTT), ttName = ctx.personName(tt.danhXung, tt.ten);
      const blank = Array.from({length: 8}, (_, i) => [String(i + 1), '', '', '', '', '', '', '']);
      return [
        ctx.P('**SỔ THEO DÕI TAI NẠN LAO ĐỘNG VÀ SỰ CỐ**', {al: 'center', sz: 28, before: 60, after: 40}),
        ctx.P('Khai thác rừng ' + (rs.tenRung || rs.maRung) + ' · Mã rừng: **' + dot(rs.maRung, 4) + '** · Chủ rừng: **' + ctx.upper(rsName) + '**', {al: 'center', after: 40}),
        ctx.P('Địa điểm: ' + dot(rs.diaDiem, 8) + ' · Thời gian khai thác: ' + (rs.tuNgay || '…/…/……') + ' – ' + (rs.denNgay || '…/…/……') + ' · Tổ trưởng: ' + ttName, {al: 'center', after: 100}),
        ctx.P('Hướng dẫn: ghi ngay khi xảy ra tai nạn lao động hoặc sự cố (cháy, đổ dầu, hư hỏng thiết bị, sạt lở...). Tổ trưởng xác nhận trong ngày; chủ rừng xác nhận khi kiểm tra. Nếu không phát sinh thì ghi xác nhận ở phần cuối.', {al: 'left', i: true, sz: 22, after: 100}),
        ctx.T([600, 1700, 2300, 1500, 3300, 2000, 2337, 1400],
          [['STT', 'NGÀY, GIỜ', 'NGƯỜI BỊ NẠN / LIÊN QUAN (HỌ TÊN, CHỨC DANH)', 'LOẠI', 'MÔ TẢ SỰ CỐ, THIỆT HẠI', 'BIỆN PHÁP XỬ LÝ, KHẮC PHỤC', 'PHÒNG NGỪA LẶP LẠI', 'TỔ TRƯỞNG KÝ'], ...blank],
          {head: true, borders: true, sz: 18, rowH: 500, pad: 20, alignCols: ['center', 'center', 'left', 'center', 'left', 'left', 'left', 'center']}),
        ctx.P('Cột LOẠI ghi: TNLĐ nhẹ / TNLĐ nặng / Sự cố môi trường / Sự cố thiết bị / Sự cố cháy.', {al: 'left', i: true, sz: 20, before: 60, after: 100}),
        ctx.P('**Xác nhận kết thúc đợt khai thác:** ☐ Không phát sinh tai nạn lao động, sự cố   ☐ Có ……… vụ (đã ghi ở bảng trên)', {al: 'left', after: 80, keep: true}),
        ctx.P('Đà Nẵng, ' + ctx.HAKHopDong.ngayTrong(), {al: 'right', after: 60, keep: true}),
        ctx.T([7568, 7569], [
          ['**ĐẠI DIỆN TỔ KHAI THÁC**', '**CHỦ RỪNG**'],
          [{v: '(Ký, ghi rõ họ tên)', i: true}, {v: '(Ký, ghi rõ họ tên)', i: true}],
          ['', ''], ['', ''], ['', ''],
          ['**' + ttName + '**', '**' + rsName + '**']
        ], {borders: false, al: 'center', keep: true})
      ];
    }

    function docKiemTraThietBi(rec, ex) {
      const rs = rec.info, rsName = ctx.personName(rs.danhXung, rs.ten), tt = rec.nc.find(ctx.isTT), ttName = ctx.personName(tt.danhXung, tt.ten);
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
        ctx.P('**BIÊN BẢN KIỂM TRA, BẢO DƯỠNG THIẾT BỊ**', {al: 'center', sz: 28, before: 60, after: 40}),
        ctx.P('Cưa xăng · Phương tiện vận chuyển · Bình chữa cháy', {al: 'center', i: true, after: 80}),
        ctx.P('- Chủ rừng: **' + ctx.upper(rsName) + '** · Mã rừng: **' + dot(rs.maRung, 4) + '** · Địa điểm: ' + dot(rs.diaDiem, 8), {al: 'left', after: 40}),
        ctx.P('- Ngày kiểm tra: **' + dot(ex.tbNgay, 6) + '** · Người kiểm tra: **' + dot(ex.tbNguoi, 8) + '**', {al: 'left', after: 100}),
        ctx.T([650, 3000, 1800, 2400, 2200, 3200, 1887],
          [['STT', 'THIẾT BỊ / BIỂN KIỂM SOÁT', 'SỐ HIỆU / MÃ', 'HẠN KIỂM ĐỊNH, BẢO HIỂM, SỬ DỤNG', 'TÌNH TRẠNG', 'NỘI DUNG KIỂM TRA, BẢO DƯỠNG', 'GHI CHÚ'], ...rows],
          {head: true, borders: true, sz: 17, rowH: 320, pad: 10, alignCols: ['center', 'left', 'center', 'left', 'center', 'left', 'left']}),
        ctx.P('**Kết luận, kiến nghị xử lý thiết bị chưa đạt:** …………………………………………………………………………………………………………', {al: 'left', before: 60, after: 20}),
        ctx.P('Đà Nẵng, ' + ctx.HAKHopDong.ngayTrong(), {al: 'right', before: 0, after: 40}),
        sign3(rsName, ttName, ex.tbNguoi)
      ];
    }

    function docNghiemThu(rec, ex) {
      const rs = rec.info, rsName = ctx.personName(rs.danhXung, rs.ten), tt = rec.nc.find(ctx.isTT), ttName = ctx.personName(tt.danhXung, tt.ten);
      const direct = ctx.isDirect(rs), vol = ctx.volumeOf(rs), kg = vol ? Math.round(vol.v * 1000) : 0;
      const pr = ctx.payRows(rec, ex), bs = ctx.basisOf(rs), tien = direct ? 0 : (pr.sum || 0);
      const daTT = ctx.toNum(ex.ntDaTT) || 0;
      const hd = direct ? 'các hợp đồng lao động đã ký giữa chủ rừng và người lao động' : 'Hợp đồng khai thác gỗ keo số ' + ex._so.kt.so;
      // lô nhiều đội: phiếu cân là của cả lô; phần của đội theo khối lượng thực tế từng đội đã nhập (nếu có, src/doi.js khoiLuong), không thì chia theo số người
      const pcAll = ctx.totalKg(rec.pc || []), klTyLe = rec._klNhap && rec._klLo > 0 && typeof rs.klHoSoCu === 'number' ? rs.klHoSoCu / rec._klLo : null;
      const pcKg = rec._share ? pcAll * (klTyLe != null ? klTyLe : rec._share) : pcAll, pcCach = rec._klChiaDeu ? 'chia đều cho hai đội' : klTyLe != null ? 'theo khối lượng thực tế từng đội' : 'chia theo số người';
      return [
        ...TITLE_HEAD(),
        ctx.P('**BIÊN BẢN NGHIỆM THU VÀ THANH LÝ KHAI THÁC**', {al: 'center', sz: 28, before: 120, after: 60}),
        ctx.P('Số: ' + ctx.V(ex._so.nt.so, 18, ctx.SO_TRANG), {al: 'center', after: 200}),
        ctx.P(LAW_BLDS),
        ctx.P('- Căn cứ ' + hd + ';'),
        ctx.P('- Căn cứ kết quả khai thác thực tế tại rừng.'),
        ctx.P('Hôm nay, ' + ctx.VP(ctx.ngayV(ex.ntNgay, ex), ctx.S_NGAY) + ' tại ' + (rs.diaDiem || '…………') + ', chúng tôi gồm có:', {after: 140}),
        ...partyBlock('BÊN CHỦ RỪNG (BÊN A)', rs, rsName, {noSinh: true}),
        ...(direct ? partyBlock('ĐẠI DIỆN TỔ KHAI THÁC (BÊN B)', tt, ttName) : benBGiaoKhoan('BÊN KHAI THÁC (BÊN B)', rec, tt, ttName)),
        ctx.P('Hai bên cùng tiến hành nghiệm thu và thanh lý với các nội dung sau:', {keep: true}),
        ctx.P('**Điều 1: Thông tin rừng đã khai thác**', {keep: true}),
        ctx.P('Địa điểm: ' + dot(rs.diaDiem, 8) + ctx.rungText(rs) + '.', {ind: 360}),
        ctx.P('Thời gian khai thác: ' + ctx.VP(ctx.tuDen(rs.tuNgay, rs.denNgay, ex), ctx.S_TUDEN) + '.', {ind: 360}),
        ctx.P('**Điều 2: Nghiệm thu khối lượng**', {keep: true}),
        ctx.P('2.1. Khối lượng khai thác được nghiệm thu: **' + ctx.V(vol ? ctx.fmtT(kg) : '………', 14) + ' tấn**' + (ex._mode === 'day' ? ctx.V(vol ? ' (' + vol.src + ')' : '', 0, '') : '') + '.', {ind: 360}),
        ...((pcKg || ex._mode !== 'day') ? [ctx.P(rec._share ? '2.2. Khối lượng đã vận chuyển về nhà máy theo phiếu cân: cả lô ' + ctx.V(pcAll ? ctx.fmtT(pcAll) : '', 14) + ' tấn (' + ctx.V(pcAll ? String((rec.pc || []).length) : '', 4) + ' chuyến), phần của đội “' + rec._doiTen + '” ' + pcCach + ' ' + ctx.V(pcKg ? ctx.fmtT(pcKg) : '', 14) + ' tấn.' : '2.2. Khối lượng đã vận chuyển về nhà máy theo phiếu cân: ' + ctx.V(pcKg ? ctx.fmtT(pcKg) : '', 14) + ' tấn (' + ctx.V(pcKg ? String((rec.pc || []).length) : '', 4) + ' chuyến).', {ind: 360})] : []),
        ctx.P(((pcKg || ex._mode !== 'day') ? '2.3' : '2.2') + '. Hiện trường đã được thu dọn; khai thác đúng ranh giới, thời gian; không phát sinh tranh chấp, tai nạn lao động hay sự cố môi trường.', {ind: 360}),
        ctx.P('**Điều 3: Thanh toán và thanh lý**', {keep: true}),
        ...(direct
          ? [ctx.P('3.1. Tiền công của người lao động được thanh toán theo hợp đồng lao động và Bảng thanh toán tiền công kèm theo.', {ind: 360})]
          : [ctx.P('3.1. Đơn giá khoán theo vai trò (' + bs.unit + '): ' + ctx.roleRates(rec).join('; ') + '. ' + (bs.qty === 'ha' ? 'Diện tích' : 'Khối lượng') + ' chia đều ' + pr.N + ' người. Thành tiền: **' + ctx.V(tien ? ctx.fmt(tien) : '………', 18) + ' đồng**' +
               (ex._mode === 'day' ? (tien ? ' (' + ctx.moneyWords(tien).replace(/\.$/, '') + ')' : '') : '') + '.', {ind: 360}),
             ...(ex._mode === 'day' ? [] : [ctx.P('Bằng chữ: ' + ctx.V(tien ? ctx.moneyWords(tien) : '', 0, '…'.repeat(64)), {ind: 360, i: true})]),
             ctx.P('3.2. Bên A đã thanh toán trước: ' + ctx.V(daTT ? ctx.fmt(daTT) : '…………………', 18) + ' đồng. Số tiền còn lại bên A thanh toán cho bên B: **' + ctx.V(tien && ex.ntDaTT ? ctx.fmt(Math.max(tien - daTT, 0)) : '…………………', 18) + ' đồng**.', {ind: 360})]),
        ctx.P('**Điều 4: Cam kết**', {keep: true}),
        ctx.P('Sau khi hai bên hoàn tất nghĩa vụ nêu trên, ' + hd + ' được thanh lý. Hai bên xác nhận không còn tranh chấp, khiếu nại nào khác về việc khai thác tại rừng nêu trên.', {ind: 360}),
        ctx.P('Biên bản được lập thành 02 bản, mỗi bên giữ 01 bản có giá trị như nhau và có hiệu lực kể từ ngày ký.', {ind: 360}),
        ctx.P('', {after: 100}),
        signTable(['ĐẠI DIỆN BÊN A', '(Ký, ghi rõ họ tên)', rsName], direct ? ['ĐẠI DIỆN BÊN B', '(Ký, ghi rõ họ tên)', ttName] : kyBenB(rec, tt, ttName))
      ];
    }

    function docCamKetNguonGoc(rec, ex) {
      const rs = rec.info, rsName = ctx.personName(rs.danhXung, rs.ten), vol = ctx.forecastVol(rs);   // “khối lượng dự kiến”: không lấy số thực tế
      return [
        ...TITLE_HEAD(),
        ctx.P('**BẢN CAM KẾT NGUỒN GỐC GỖ RỪNG TRỒNG**', {al: 'center', sz: 28, before: 120, after: 60}),
        ctx.P('Kính gửi: ' + (ex.ckNhan ? ctx.upper(ex.ckNhan) : buyerName(rec) ? ctx.upper(buyerName(rec)) : '…………………………………………'), {al: 'center', after: 200}),
        ctx.P('- Căn cứ Luật Lâm nghiệp số 16/2017/QH14 ngày 15/11/2017;'),
        ctx.P('- Căn cứ Luật Đất đai số 31/2024/QH15 ngày 18/01/2024;'),
        LAW_BLDS ? ctx.P(LAW_BLDS) : ctx.P(''),
        ctx.P('Tôi tên là:', {after: 60, before: 80}),
        ...partyBlock('CHỦ RỪNG (NGƯỜI CAM KẾT)', rs, rsName, {noSinh: true}),
        ctx.P('Là chủ sử dụng diện tích rừng trồng có thông tin như sau:', {after: 60}),
        ctx.bl('Mã rừng: ' + dot(rs.maRung, 4) + (rs.tenRung ? ' (' + rs.tenRung + ')' : '')),
        ctx.bl('Địa điểm: ' + dot(rs.diaDiem, 8)),
        ctx.bl('Tọa độ (WGS84): ' + (rs.lat != null && rs.lng != null ? rs.lat + ', ' + rs.lng : '……………………')),
        ctx.bl('Diện tích: ' + (rs.dienTich ? rs.dienTich + ' ha' : '……… ha') + ' · Khối lượng dự kiến khai thác: ' + (vol ? ctx.fmtT(Math.round(vol.v * 1000)) + ' tấn' : '……… tấn')),
        ctx.bl('Giấy tờ về đất, rừng: ' + ((rs.giayTo || []).length ? (rs.giayTo || []).map(x => (x.loai === 'Khác' && x.ten ? x.ten : x.loai) + (x.so ? ' số ' + x.so : '') + (x.ngayCap ? ', ngày cấp ' + x.ngayCap : '') + (x.coQuan ? ', ' + x.coQuan : '')).join('; ') : '……………………………………')),
        ctx.bl('Thời gian khai thác: từ ngày ' + (rs.tuNgay || '…/…/……') + ' đến ngày ' + (rs.denNgay || '…/…/……')),
        ctx.P('Tôi cam kết với các nội dung sau:', {before: 120, after: 60, keep: true}),
        ctx.P('1. Tôi là người có quyền sử dụng, quản lý và khai thác hợp pháp diện tích rừng trồng nêu trên theo giấy tờ đã cung cấp.'),
        ctx.P('2. Gỗ khai thác hoàn toàn từ rừng trồng, không có nguồn gốc từ rừng tự nhiên, rừng phòng hộ, rừng đặc dụng, khu bảo tồn hoặc khu vực có giá trị bảo tồn cao.'),
        ctx.P('3. Diện tích không có tranh chấp, khiếu kiện về quyền sử dụng đất và rừng; không được chuyển đổi từ rừng tự nhiên sau ngày 31/12/2020.'),
        ctx.P('4. Chỉ khai thác trong ranh giới, tọa độ và thời gian nêu trên; không lấn sang diện tích rừng hoặc đất của người khác.'),
        ctx.P('5. Tuân thủ quy định pháp luật về lâm nghiệp, đất đai, lao động, bảo vệ môi trường và tôn trọng quyền của cộng đồng, hộ dân liền kề.'),
        ctx.P('6. Cung cấp đầy đủ, trung thực hồ sơ, tài liệu và đồng ý để bên nhận cam kết kiểm tra, truy xuất nguồn gốc gỗ tại hiện trường.'),
        ctx.P('7. Chịu hoàn toàn trách nhiệm trước pháp luật về nội dung cam kết. Nếu sai sự thật, tôi chấp nhận bị chấm dứt thu mua và bồi thường thiệt hại phát sinh (nếu có).'),
        ctx.P('Bản cam kết được lập thành 02 bản, mỗi bên giữ 01 bản có giá trị như nhau.', {before: 60}),
        ctx.P('Đà Nẵng, ' + (ex.ckNgay ? 'ngày ' + ex.ckNgay : ctx.HAKHopDong.ngayTrong()), {al: 'right', before: 120, after: 100}),
        signTable(['NGƯỜI CAM KẾT', '(Ký, ghi rõ họ tên)', rsName], ['XÁC NHẬN CỦA THÔN / UBND XÃ (nếu có)', '(Ký, ghi rõ họ tên, đóng dấu)', ''])
      ];
    }

    function docCamKetLaoDong(rec, ex) {
      const rs = rec.info, rsName = ctx.personName(rs.danhXung, rs.ten), tt = rec.nc.find(ctx.isTT), ttName = ctx.personName(tt.danhXung, tt.ten);
      const list = [tt, ...rec.nc.filter(r => !ctx.isTT(r))];
      return [
        ...TITLE_HEAD(),
        ctx.P('**BẢN CAM KẾT SỬ DỤNG LAO ĐỘNG**', {al: 'center', sz: 28, before: 120, after: 40}),
        ctx.P('Khai thác rừng ' + (rs.tenRung || rs.maRung) + ' · Mã rừng ' + dot(rs.maRung, 4), {al: 'center', after: 40}),
        ctx.P('(' + rs.diaDiem + ')', {al: 'center', i: true, after: 200}),
        ...LAW_LD.slice(0, 2).map(t => ctx.P('- ' + t, {after: 60})),
        ctx.P('Chúng tôi gồm: **' + ctx.upper(rsName) + '** (chủ rừng) và **' + ctx.upper(ttName) + '** (tổ trưởng, đại diện tổ khai thác), cùng cam kết đối với toàn bộ người lao động tham gia khai thác rừng nêu trên như sau:', {before: 80}),
        ctx.P('1. Chỉ sử dụng người lao động từ đủ 18 tuổi trở lên; không sử dụng lao động trẻ em.'),
        ctx.P('2. Không cưỡng bức lao động; không giữ giấy tờ tùy thân, tiền công của người lao động trái quy định; người lao động được tự nguyện làm việc và tự do chấm dứt hợp đồng theo quy định pháp luật.'),
        ctx.P('3. Không phân biệt đối xử về giới tính, dân tộc, tôn giáo, nguồn gốc xuất thân trong tuyển dụng, trả công và điều kiện làm việc.'),
        ctx.P('4. Ký hợp đồng lao động bằng văn bản; trả công đúng mức, đúng hạn theo hợp đồng.'),
        ctx.P('5. Trang bị đầy đủ bảo hộ lao động và đào tạo an toàn lao động cho mọi người trước khi làm việc; báo cáo và xử lý kịp thời khi có tai nạn lao động.'),
        ctx.P('6. Tôn trọng quyền thương lượng, quyền lập và gia nhập tổ chức đại diện của người lao động theo quy định pháp luật.'),
        ctx.P('Danh sách người lao động đã được phổ biến nội dung cam kết này và tự nguyện làm việc:', {before: 80, after: 100, keep: true}),
        ctx.T([650, 2800, 2200, 1500, 2205],
          [['STT', 'HỌ TÊN', 'CHỨC DANH', 'NGÀY SINH', 'KÝ XÁC NHẬN'],
            ...list.map((r, i) => [String(i + 1), ctx.upper(r.ten), r.chucDanh, r.ngaySinh || '', ''])],
          {head: true, borders: true, sz: 20, rowH: 420, alignCols: ['center', 'left', 'left', 'center', 'left']}),
        ctx.P('Đà Nẵng, ' + (ex.ckNgay ? 'ngày ' + ex.ckNgay : ctx.HAKHopDong.ngayTrong()), {al: 'right', before: 160, after: 100}),
        signTable(['CHỦ RỪNG', '(Ký, ghi rõ họ tên)', rsName], ['ĐẠI DIỆN TỔ KHAI THÁC', '(Ký, ghi rõ họ tên)', ttName])
      ];
    }

    function docKiemTraHienTruong(rec, ex) {
      const rs = rec.info, rsName = ctx.personName(rs.danhXung, rs.ten), tt = rec.nc.find(ctx.isTT), ttName = ctx.personName(tt.danhXung, tt.ten);
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
        ctx.P('**BIÊN BẢN KIỂM TRA HIỆN TRƯỜNG KHAI THÁC**', {al: 'center', sz: 28, before: 60, after: 40}),
        ctx.P('(Kiểm tra trước khai thác và sau khai thác)', {al: 'center', i: true, after: 120}),
        ctx.P('- Chủ rừng: **' + ctx.upper(rsName) + '** · Mã rừng: **' + dot(rs.maRung, 4) + '** · Địa điểm: ' + dot(rs.diaDiem, 8), {al: 'left', after: 40}),
        ctx.P('- Tọa độ (WGS84): ' + (rs.lat != null && rs.lng != null ? rs.lat + ', ' + rs.lng : '……………………') + ' · Diện tích: ' + (rs.dienTich ? rs.dienTich + ' ha' : '……… ha') + ' · Thời gian khai thác: ' + (rs.tuNgay || '…/…/……') + ' – ' + (rs.denNgay || '…/…/……'), {al: 'left', after: 40}),
        ctx.P('- Kiểm tra trước khai thác ngày: **' + dot(ex.ktNgayTruoc, 6) + '** · Kiểm tra sau khai thác ngày: **' + dot(ex.ktNgaySau, 6) + '** · Người kiểm tra: **' + dot(ex.ktNguoi, 8) + '**', {al: 'left', after: 120}),
        ctx.T([650, 7000, 2200, 2200, 3087],
          [['STT', 'NỘI DUNG KIỂM TRA', 'TRƯỚC KHAI THÁC', 'SAU KHAI THÁC', 'GHI CHÚ'],
            ...items.map((x, i) => [String(i + 1), x, box, box, ''])],
          {head: true, borders: true, sz: 18, rowH: 330, pad: 20, alignCols: ['center', 'left', 'center', 'center', 'left']}),
        ctx.P('**Kết luận:** ………………………………………………………………………………………………………………………………………', {al: 'left', before: 80, after: 40}),
        ctx.P('Đà Nẵng, ' + ctx.HAKHopDong.ngayTrong(), {al: 'right', before: 60, after: 60}),
        ctx.T([5045, 5046, 5046], [
          ['**NGƯỜI KIỂM TRA**', '**ĐẠI DIỆN TỔ KHAI THÁC**', '**CHỦ RỪNG**'],
          [{v: '(Ký, ghi rõ họ tên)', i: true}, {v: '(Ký, ghi rõ họ tên)', i: true}, {v: '(Ký, ghi rõ họ tên)', i: true}],
          ['', '', ''], ['', '', ''], ['', '', ''],
          ['**' + (ex.ktNguoi || '') + '**', '**' + ttName + '**', '**' + rsName + '**']
        ], {borders: false, al: 'center', keep: true})
      ];
    }

    function docXNKLVC(rec, ex, g) {
      [rec, ex] = ctx.vcCtx(rec, ex, g);
      const rs = rec.info, rsName = ctx.personName(rs.danhXung, rs.ten), tr = ctx.tripsOf(rec, g), kg = ctx.totalKg(tr);
      const hdNo = ex._so.vc.so;
      const ngSame = new Set(tr.map(r => r.noiGiao || '')).size <= 1;   // cùng một nơi giao thì Bảng kê đính kèm ghi một dòng, không đặt trong khung bảng
      const noiGiao = ex.vcDiemDen || (ex._mode === 'day' ? tr.map(r => r.noiGiao).find(Boolean) : '') || '………………';   // mẫu trống và in đè: chữ cố định phải giống nhau, không lấy từ phiếu cân   // điểm đến theo hồ sơ rừng; cột “Nơi giao” từng phiếu giữ nguyên dữ liệu nguồn
      return [
        ...TITLE_HEAD(),
        ctx.P('**BIÊN BẢN XÁC NHẬN KHỐI LƯỢNG VẬN CHUYỂN**', {al: 'center', sz: 28, before: 120, after: 60}),
        ctx.P('Số: ' + ctx.V(ex._so.xn.so, 18, ctx.SO_TRANG), {al: 'center', after: 0}),
        ctx.P('(Kèm theo Hợp đồng vận chuyển số ' + hdNo + ')', {al: 'center', i: true, after: 200}),
        ctx.P(LAW_BLDS),
        ctx.P('- Căn cứ Hợp đồng vận chuyển gỗ keo số ' + hdNo + ' giữa hai bên;'),
        ctx.P('- Căn cứ các phiếu cân do nhà máy tiếp nhận cấp cho từng chuyến hàng.'),
        ctx.P('Hôm nay, ' + ctx.VP(ctx.ngayV(ex.pcNgay, ex), ctx.S_NGAY) + ', chúng tôi gồm có:', {after: 160}),
        ctx.P('**BÊN CHỦ RỪNG (BÊN A): ' + ctx.upper(rsName) + '** — CCCD số ' + (rs.cccd || '…………') + ', địa chỉ thường trú: ' + (rs.diaChi || '…………') + '.', {after: 80}),
        ctx.P('**BÊN VẬN CHUYỂN (BÊN B): ' + ctx.upper(g.ten) + '** — CCCD số ' + (g.cccd || '…………') + ', địa chỉ thường trú: ' + (g.diaChi || '…………') + '.', {after: 120}),
        ctx.P('Hai bên cùng xác nhận khối lượng gỗ keo rừng trồng đã vận chuyển từ rừng tại ' + rs.diaDiem + (rungRef(rs) ? ' (' + rungRef(rs) + ')' : '') + ' về ' + noiGiao +
          ', ' + ctx.VP(ctx.tuDen(tr.length ? tr[0].ngay : '', tr.length ? tr[tr.length - 1].ngay : '', ex), ctx.S_TUDEN) + ', căn cứ phiếu cân nhà máy (khối lượng giao tại nhà máy), cụ thể trong **Bảng kê khối lượng đính kèm**:', {after: 120}),
        ctx.P('Tổng khối lượng xác nhận: **' + ctx.V(tr.length ? ctx.fmtT(kg) : '………', 14) + ' tấn** (' + ctx.V(tr.length ? String(tr.length) : '…', 4) + ' chuyến). Khối lượng này là căn cứ để thanh toán tiền vận chuyển theo Hợp đồng nêu trên.', {before: 80}),
        ctx.P('Biên bản được lập thành 02 bản, mỗi bên giữ 01 bản có giá trị như nhau. Hai bên không có ý kiến khác về khối lượng đã xác nhận.'),
        ctx.P('', {after: 120}),
        signTable(['ĐẠI DIỆN BÊN A', '(Ký, ghi rõ họ tên)', rsName], ['ĐẠI DIỆN BÊN B', '(Ký, ghi rõ họ tên)', g.ten]),
        ...(ex._mode === 'trong' || !tr.length ? [] : [   // Bảng kê khối lượng đính kèm: trang riêng, in đầy đủ khi đã có phiếu cân (không cần in khung rồi in đè)
          {t: 'br'},
          ctx.P('**BẢNG KÊ KHỐI LƯỢNG ĐÍNH KÈM**', {al: 'center', sz: 28, before: 0, after: 60, full: true}),
          ctx.P('(Kèm theo Biên bản xác nhận khối lượng vận chuyển số ' + ex._so.xn.so + ' và Hợp đồng vận chuyển số ' + hdNo + ')', {al: 'center', i: true, after: 160, full: true}),
          ctx.P('Bên vận chuyển (Bên B): **' + ctx.upper(g.ten) + '** · Mã rừng: ' + (rs.maRung || '…') + ' · ' + (ctx.tuDen(tr.length ? tr[0].ngay : '', tr.length ? tr[tr.length - 1].ngay : '', Object.assign({}, ex, {_mode: 'day'}))) + '.', {al: 'left', after: 120, full: true}),
          ...(ngSame ? [ctx.P('Nơi giao (nhà máy): **' + (ex.vcDiemDen || (tr[0] && tr[0].noiGiao) || '………………') + '**', {al: 'left', after: 120, full: true})] : []),
          ngSame
            ? ctx.T([650, 1700, 2100, 2400, 2505],   // cùng một nơi giao: ghi một dòng phía trên, không lặp trong khung bảng
              [['STT', 'Ngày cân', 'Biển kiểm soát', 'Số phiếu cân', 'Khối lượng (tấn)'],
                ...tr.map((r, i) => [String(i + 1), r.ngay, r.bienSo, r.soPhieu, ctx.fmtT(Math.round(r.kl * 1000))]),
                [{v: '**Tổng cộng (' + tr.length + ' chuyến)**', span: 4}, '**' + ctx.fmtT(kg) + '**']],
              {head: true, borders: true, sz: 20, full: true, alignCols: ['center', 'center', 'center', 'center', 'right']})
            : ctx.T([550, 1250, 1500, 1600, 2850, 1605],
              [['STT', 'Ngày cân', 'Biển kiểm soát', 'Số phiếu cân', 'Nơi giao (nhà máy)', 'Khối lượng (tấn)'],
                ...tr.map((r, i) => [String(i + 1), r.ngay, r.bienSo, r.soPhieu, r.noiGiao || '', ctx.fmtT(Math.round(r.kl * 1000))]),
                [{v: '**Tổng cộng (' + tr.length + ' chuyến)**', span: 5}, '**' + ctx.fmtT(kg) + '**']],
              {head: true, borders: true, sz: 20, full: true, alignCols: ['center', 'center', 'center', 'center', 'left', 'right']})])
      ];
    }
    function docTTVC(rec, ex, g) {
      [rec, ex] = ctx.vcCtx(rec, ex, g);
      const rs = rec.info, rsName = ctx.personName(rs.danhXung, rs.ten), py = ctx.payVC(rec, g), tp = ctx.transportPrice(rs);
      const hdNo = ex._so.vc.so;
      const tr = ctx.tripsOf(rec, g);
      return [
        ...TITLE_HEAD(),
        ctx.P('**BẢNG THANH TOÁN TIỀN VẬN CHUYỂN**', {al: 'center', sz: 28, before: 120, after: 60}),
        ctx.P('(Kèm theo Hợp đồng vận chuyển số ' + hdNo + ' và Biên bản xác nhận khối lượng vận chuyển số ' + ctx.V(ex._so.xn.so, 16, ctx.SO_TRANG) + ')', {al: 'center', i: true, after: 200}),
        ctx.P('**Bên trả tiền (Bên A): ' + ctx.upper(rsName) + '**', {after: 40}),
        ctx.P('Địa chỉ: ' + (rs.diaChi || '…………') + ' · CCCD số: ' + (rs.cccd || '…………'), {ind: 360, after: 100}),
        ctx.P('**Bên nhận tiền (Bên B): ' + ctx.upper(g.ten) + '**', {after: 40}),
        ctx.P('Địa chỉ: ' + (g.diaChi || '…………') + ' · CCCD số: ' + (g.cccd || '…………'), {ind: 360, after: 100}),
        ctx.P('Địa điểm giao hàng (theo hồ sơ rừng): ' + dot(ex.vcDiemDen, 10) + '.', {after: 100}),
        ctx.P('Mã rừng: ' + (rs.maRung || '…') + ' · Kỳ thanh toán: ' + ctx.VP(ctx.tuDen(tr.length ? tr[0].ngay : '', tr.length ? tr[tr.length - 1].ngay : '', ex), ctx.S_TUDEN) + '.', {after: 40}),
        ctx.P('Đơn giá: **' + ctx.fmt(g.donGia) + ' đồng/tấn** (' + tp.text + '), tính theo khối lượng giao tại nhà máy theo phiếu cân.', {after: 140}),
        ctx.P('Chi tiết từng xe: xem **Bảng kê chi tiết thanh toán đính kèm**.', {after: 80}),
        ctx.P('Tổng khối lượng: **' + ctx.V(py.n ? ctx.fmtT(py.kg) : '………', 14) + ' tấn** (' + ctx.V(py.n ? String(py.n) : '…', 4) + ' chuyến).', {before: 40, after: 40}),
        ctx.P('Tổng số tiền thanh toán: **' + ctx.V(py.n ? ctx.fmt(py.tien) : '………', 16) + ' đồng**.', {before: 40, after: 40}),
        ctx.P('Bằng chữ: ' + ctx.V(ctx.moneyWords(py.tien), 0, '…'.repeat(64)), {i: true}),
        ctx.P('Các khoản thuế, phí (nếu có) được thực hiện theo quy định của pháp luật hiện hành.'),
        ctx.P('Đà Nẵng, ' + ctx.VP(ctx.ngayV(ex.pcNgay, ex), ctx.S_NGAY), {al: 'right', before: 160, after: 120}),
        ctx.T([3118, 3118, 3119], [
          ['**NGƯỜI LẬP BẢNG**', '**ĐẠI DIỆN BÊN A**', '**ĐẠI DIỆN BÊN B**'],
          [{v: '(Ký, ghi rõ họ tên)', i: true}, {v: '(Ký, ghi rõ họ tên)', i: true}, {v: '(Ký, ghi rõ họ tên)', i: true}],
          ['', '', ''], ['', '', ''], ['', '', ''],
          ['**' + (ex.pcNguoiLap || '') + '**', '**' + rsName + '**', '**' + g.ten + '**']
        ], {borders: false, al: 'center', keep: true}),
        ...(ex._mode === 'trong' || !py.n ? [] : [   // Bảng kê chi tiết thanh toán đính kèm: trang riêng, in đầy đủ khi đã có phiếu cân
          {t: 'br'},
          ctx.P('**BẢNG KÊ CHI TIẾT THANH TOÁN ĐÍNH KÈM**', {al: 'center', sz: 28, before: 0, after: 60, full: true}),
          ctx.P('(Kèm theo Bảng thanh toán tiền vận chuyển, Hợp đồng vận chuyển số ' + hdNo + ' và Biên bản xác nhận khối lượng vận chuyển số ' + ex._so.xn.so + ')', {al: 'center', i: true, after: 160, full: true}),
          ctx.P('Bên nhận tiền (Bên B): **' + ctx.upper(g.ten) + '** · Mã rừng: ' + (rs.maRung || '…') + ' · Đơn giá: ' + ctx.fmt(g.donGia) + ' đồng/tấn.', {al: 'left', after: 120, full: true}),
          ctx.T([650, 2100, 1300, 1700, 1700, 1905],
            [['STT', 'Biển kiểm soát', 'Số chuyến', 'Khối lượng (tấn)', 'Đơn giá (đồng/tấn)', 'Thành tiền (đồng)'],
              ...py.rows.map((r, i) => [String(i + 1), r.bienSo, String(r.n), ctx.fmtT(r.kg), ctx.fmt(g.donGia), ctx.fmt(r.tien)]),
              [{v: '**Tổng cộng**', span: 2}, '**' + py.n + '**', '**' + ctx.fmtT(py.kg) + '**', '', '**' + ctx.fmt(py.tien) + '**']],
            {head: true, borders: true, sz: 20, full: true, alignCols: ['center', 'center', 'center', 'right', 'right', 'right']})])
      ];
    }
    function docHDVC(rec, ex, g) {
      [rec, ex] = ctx.vcCtx(rec, ex, g);
      const rs = rec.info;
      const rsName = ctx.personName(rs.danhXung, rs.ten);
      return [
        ...TITLE_HEAD(),
        ctx.P('**HỢP ĐỒNG VẬN CHUYỂN GỖ KEO**', {al: 'center', sz: 28, before: 120, after: 60}),
        ctx.P('Số: ' + ex._so.vc.so, {al: 'center', after: 0}),
        ctx.P('“V/v: Vận chuyển gỗ rừng trồng”', {al: 'center', i: true, after: 200}),
        ctx.P(LAW_BLDS),
        ...(hdRef(rs) ? [ctx.P('- ' + hdRef(rs))] : []),
        ctx.P('- Căn cứ Luật Lâm nghiệp số 16/2017/QH14 ngày 15/11/2017;'),
        ctx.P('- Căn cứ Luật Trật tự, an toàn giao thông đường bộ số 36/2024/QH15 ngày 27/06/2024;'),
        ctx.P('- Căn cứ khả năng và nhu cầu của hai bên.'),
        ctx.P('Hôm nay, ' + ngayLine(ex) + ' tại nhà ' + ctx.upper(rsName) + ' (địa chỉ: ' + rs.diaChi + '), chúng tôi gồm có:', {after: 160}),
        ...partyBlock('BÊN CHỦ RỪNG (BÊN A)', rs, rsName, {noSinh: true}),
        ...partyBlock('BÊN VẬN CHUYỂN (BÊN B)', g, g.ten),
        ctx.P('Sau khi bàn bạc cụ thể, hai bên thống nhất ký hợp đồng vận chuyển gỗ keo rừng trồng với các điều khoản như sau:'),
        ctx.P('**Điều 1: Nội dung**', {keep: true}),
        ctx.P('Bên B đồng ý nhận và bên A đồng ý thuê vận chuyển gỗ Keo Lai rừng trồng có kiểm soát tại địa chỉ: ' + rs.diaDiem + ctx.rungText(rs) + '.'),
        ...(rungRef(rs) ? [ctx.P('- ' + rungRef(rs) + '.', {ind: 360})] : []),
        ctx.P('- Địa điểm nhận hàng: tại rừng nêu trên. Địa điểm giao hàng: ' + dot(ex.vcDiemDen, 10) + '. Cự ly vận chuyển: ' + (ctx.HAKCuLy.eff(rs).km ? String(ctx.HAKCuLy.eff(rs).km).replace('.', ',') + ' km' : '……') + '.', {ind: 360}),
        ctx.P('- Danh sách phương tiện, người điều khiển và giấy tờ kèm theo được nêu tại Phụ lục của hợp đồng này.' + (g.vaiTro === 'Tài xế' ? ' Bên B cam kết đã được chủ xe của các phương tiện nêu tại Phụ lục đồng ý cho thực hiện hợp đồng này.' : ''), {ind: 360}),
        ctx.P('**Điều 2: Giá cả và phương thức thanh toán**', {keep: true}),
        ctx.P('2.1. Giá thanh toán: ' + ctx.fmt(g.donGia) + ' đồng/tấn (' + ctx.transportPrice(rs).text + ').', {ind: 360}),
        ctx.P('2.2. Hình thức thanh toán: Căn cứ theo số lượng bán cho nhà máy, hai bên tiến hành thanh toán bằng tiền mặt/chuyển khoản.', {ind: 360}),
        ctx.P('2.3. Thời gian vận chuyển: từ ngày ' + ((rs.vanChuyen || {}).tuNgay || rs.tuNgay || '……………..') + ' đến hết khi hoàn thành công việc.', {ind: 360}),
        ctx.P('2.4. Các chi phí khác (cầu đường, bốc xếp, thuế...): ' + dot(ex.vcChiPhi, 10) + '.', {ind: 360}),
        ctx.P('**Điều 3: Trách nhiệm của mỗi bên**', {keep: true}),
        ctx.P('3.1. Trách nhiệm của bên A', {keep: true}),
        ctx.bl('Thanh toán cho bên B theo đơn giá quy định tại Điều 2 dựa trên khối lượng gỗ đã vận chuyển.'),
        ctx.bl('Lập bảng kê lâm sản theo quy định của Thông tư 84/2025/TT-BNNMT đưa người vận chuyển mang đi đường.'),
        ctx.bl('Chịu trách nhiệm mở đường và các chi phí khác để tạo điều kiện cho bên B vận chuyển gỗ.'),
        ctx.bl('Sắp xếp lao động khai thác phù hợp để kịp tiến độ theo hợp đồng.'),
        ctx.P('3.2. Trách nhiệm của bên B', {keep: true}),
        ctx.bl('Điều xe đúng quy định theo thông báo của Bên A. Chịu trách nhiệm về kỹ thuật, an toàn cho phương tiện vận chuyển, không quá khổ, quá tải và phải đảm bảo vận chuyển đúng lịch trình, không để thất thoát hàng hóa của bên A.'),
        ctx.bl('Bố trí, sắp xếp đủ xe vận chuyển gỗ phù hợp với tiến độ và thời gian khai thác.'),
        ctx.bl('Phương tiện chở hàng và người vận chuyển phải có đầy đủ giấy tờ theo quy định. Khi vận chuyển phải mang theo giấy tờ vận chuyển gồm bảng kê lâm sản theo Thông tư 84/2025/TT-BNNMT do chủ rừng tự khai báo.'),
        ctx.bl('Phương tiện phải có giấy đăng ký, giấy kiểm định, bảo hiểm trách nhiệm dân sự còn hiệu lực; người điều khiển có giấy phép lái xe phù hợp với loại xe; chấp hành quy định về trật tự, an toàn giao thông đường bộ và chịu trách nhiệm về vi phạm, tai nạn trong quá trình vận chuyển.'),
        ctx.bl('Phải kiểm soát chặt chẽ gỗ vận chuyển từ rừng về nhà máy, tránh sự lẫn lộn các nguồn nguyên liệu khác không phù hợp trong quá trình vận chuyển.'),
        ctx.bl('Sắp xếp số lượng xe phù hợp đủ để kịp tiến độ khai thác rừng.'),
        ctx.bl('Đảm bảo thời gian vận chuyển như điều 2 của hợp đồng.'),
        ctx.bl('Chịu mọi trách nhiệm và tất cả chi phí phát sinh cho các xe vận chuyển.'),
        ctx.P('**Điều 4. Hiệu lực hợp đồng**', {keep: true}),
        ctx.P('Nếu một trong hai bên muốn chấm dứt hợp đồng trước thời hạn thì phải thông báo cho bên kia trước ít nhất 03 ngày.'),
        ctx.P('**Điều 5. Điều khoản chung**', {keep: true}),
        ctx.bl('Không bên nào đơn phương hủy bỏ hợp đồng. Trường hợp bên nào đơn phương hủy bỏ hợp đồng thì phải chịu trách nhiệm bồi thường toàn bộ thiệt hại, mất mát đã gây ra cho bên còn lại.'),
        ctx.bl('Hai bên cam kết thực hiện đầy đủ và đúng theo các điều khoản trong hợp đồng này. Mọi thay đổi đối với hợp đồng, hai bên cùng nhau bàn bạc và xác nhận bằng văn bản cụ thể.'),
        ctx.bl('Trường hợp tranh chấp phát sinh trong quá trình thực hiện hợp đồng, trước hết hai bên phải thỏa thuận để dàn xếp. Quyết định của Tòa án là quyết định cuối cùng và ràng buộc 2 bên. Chi phí Tòa án và các khoản chi phí khác liên quan do bên thua kiện chịu.'),
        ctx.bl('Hợp đồng được lập thành 02 bản, mỗi bên giữ 01 bản có giá trị pháp lý như nhau và có hiệu lực kể từ ngày ký.'),
        ctx.P('', {after: 120}),
        signTable(['ĐẠI DIỆN BÊN A', '(Ký, ghi rõ họ tên)', rsName], ['ĐẠI DIỆN BÊN B', '(Ký, ghi rõ họ tên)', g.ten]),
        {t: 'br'},
        ctx.P('**PHỤ LỤC**', {al: 'center', after: 0}),
        ctx.P('**DANH SÁCH XE VẬN CHUYỂN GỖ KEO**', {al: 'center', after: 60}),
        ctx.P('Kèm theo Hợp đồng vận chuyển số ' + ex._so.vc.so + ' — Bên vận chuyển: ' + ctx.upper(g.ten), {al: 'center', after: 200}),
        ctx.T([650, 1250, 950, 1500, 1000, 1000, 1900, 1105],
          [['STT', 'Biển kiểm soát', 'Loại xe', 'Chủ xe', 'Ngày cấp đăng ký xe', 'Bảo hiểm đến hạn', 'Kiểm định (từ ngày – đến ngày)', 'SĐT'],
            ...g.xe.map((x, i) => [String(i + 1), x.bienSo, x.loaiXe || '', x.chuXe || '', x.cavet || '', x.hanBH || '',
              (x.kdTu || x.kdDen) ? (x.kdTu || '…') + ' – ' + (x.kdDen || '…') : '', x.sdt || ''])],
          {head: true, borders: true, sz: 18, alignCols: ['center', 'center', 'left', 'left', 'center', 'center', 'center', 'center']}),
        ctx.P('', {after: 120}),
        ctx.P('**DANH SÁCH TÀI XẾ**', {al: 'center', after: 60}),
        ctx.T([650, 1100, 1430, 1300, 1000, 1575, 1300, 1000],
          [['STT', 'Biển kiểm soát', 'Tên tài xế', 'CCCD', 'Ngày cấp CCCD', 'Thường trú', 'Số GPLX', 'Đến hạn GPLX'],
            ...g.xe.map((x, i) => x.taiXe
              ? [String(i + 1), x.bienSo, x.taiXe, x.cccdTx || '', x.ngayCapTx || '', x.diaChiTx || '', x.gplx || '', x.hanGplx || '']
              : [String(i + 1), x.bienSo, x.chuXe + ' (chủ xe)', x.cccd || '', x.ngayCap || '', x.diaChi || '', x.gplx || '', x.hanGplx || ''])],
          {head: true, borders: true, sz: 18, alignCols: ['center', 'center', 'left', 'center', 'center', 'left', 'center', 'center']})
      ];
    }
    return {DT_NOIDUNG, LAW_BLDS, LAW_LD, TITLE_HEAD, ageAt, benBGiaoKhoan, benKhoanIn, buyerName, docBHLD, docCamKetLaoDong, docCamKetNguonGoc, docGiaoKhoan, docHDLD, docHDVC, docKiemTraHienTruong, docKiemTraThietBi, docNghiemThu, docNhatKy, docPhoBienFSC, docSoTaiNan, docTTVC, docThamDinh, docXNKLVC, dot, hdRef, kyBenB, listDays, minorsOf, ngayLine, partyBlock, rungRef, sign3, signTable, todayStr};
  }
  const api = {create, TEN_NGOAI: ["BHLD_ITEMS","HAKCuLy","HAKDinhMuc","HAKHopDong","HAKModel","P","SO_TRANG","S_NGAY","S_TUDEN","T","V","VP","basisOf","bl","dateKey","db","fmt","fmtCong","fmtT","fmtTan","forecastVol","forestYield","groupsDX","isDirect","isTT","keyName","khoanSuyRa","moneyWords","ngayV","normOf","normRefCapPhat","normRefHDLD","pad2","payRows","payVC","personName","rateOf","roleRates","rungText","theCompany","toNum","totalKg","transportPrice","trim","tripsOf","tuDen","upper","vcCtx","volumeOf"]};
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.HAKNoiDungHopDong = api;
})(typeof self !== 'undefined' ? self : this);
