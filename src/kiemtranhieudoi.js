'use strict';
/* Kiểm tra dữ liệu của lô nhiều đội: thông tin chủ rừng, rừng, nhân công, xe, giá, tiền công, định mức, nhập liệu.
 * Tách từ ui/app/04-kiem-tra-du-lieu-nhieu-doi.js: mã giữ nguyên; mọi tên dùng từ phần còn lại của giao diện (cơ sở dữ liệu đang mở, tiện ích, các module khác)
 * đi qua đối tượng ctx do giao diện cấp (getter, đọc giá trị hiện tại lúc gọi). Kiểm thử đơn vị truyền ctx giả. */
(function (root) {
  function create(ctx) {
    /* ========== Kiểm tra dữ liệu ========== */
    function infoErrors(info, selfId) {
      const e = [];
      if (!info.ma) e.push('Thiếu Mã chủ rừng');
      else if (Object.entries(ctx.db.rs).some(([id, r]) => id !== selfId && r.info.ma === info.ma)) e.push('Mã chủ rừng đã tồn tại');
      if (!info.ten) e.push('Thiếu Họ và tên chủ rừng');
      if (!['Ông', 'Bà'].includes(info.danhXung)) e.push('Chọn danh xưng Ông/Bà');
      if (ctx.trim(info.sdt) && !/^[0-9 .()+\-]{8,20}$/.test(ctx.trim(info.sdt))) e.push('Số điện thoại “' + info.sdt + '” không đúng dạng (8–20 ký tự gồm số, dấu cách, + - . ( ))');
      if (ctx.trim(info.ngayKyHopDong) && !ctx.HAKDates.isValid(info.ngayKyHopDong)) e.push('Ngày ký hợp đồng “' + info.ngayKyHopDong + '”: ' + ctx.HAKDates.why(info.ngayKyHopDong));
      if (!ctx.isCccd(info.cccd)) e.push('CCCD phải đủ 12 chữ số');
      if (!info.ngayCap) e.push('Thiếu Ngày cấp CCCD');
      if (!info.noiCap) e.push('Thiếu Nơi cấp CCCD');
      if (!info.diaChi) e.push('Thiếu Địa chỉ thường trú');
      return e;
    }

    function forestErrors(info, fid) {
      const e = [];
      if (!info.maRung) e.push('Thiếu Mã rừng');
      else { const why = ctx.HAKLoRung.maTrung(ctx.db, info.maRung, fid); if (why) e.push(why); }   // quy tắc mã lô duy nhất dùng chung (src/lorung.js): không phân biệt hoa thường, liệt kê đủ các lô đang dùng mã
      if (!info.diaDiem) e.push('Thiếu Địa điểm khai thác');
      if (info.lat === 'x') e.push('Vĩ độ không phải là số');
      if (info.lng === 'x') e.push('Kinh độ không phải là số');
      if (info.dienTich === 'x') e.push('Diện tích không phải là số');
      if (info.dinhMucTanHa === 'x') e.push('Định mức không phải là số');
      if (info.dinhMucNgayHa === 'x') e.push('Định mức thời gian khai thác (ngày/ha) không phải là số');
      if (info.cuLy === 'x') e.push('Cự ly không phải là số');
      if ((info.lat == null) !== (info.lng == null)) e.push('Nhập đủ vĩ độ và kinh độ (WGS84)');
      if (typeof info.lat === 'number' && Math.abs(info.lat) > 90) e.push('Vĩ độ phải nằm trong khoảng -90 đến 90');
      if (typeof info.lng === 'number' && Math.abs(info.lng) > 180) e.push('Kinh độ phải nằm trong khoảng -180 đến 180');
      if (typeof info.dienTich === 'number' && info.dienTich < 0) e.push('Diện tích không được âm');
      if (typeof info.dinhMucTanHa === 'number' && info.dinhMucTanHa < 0) e.push('Định mức không được âm');
      if (typeof info.dinhMucNgayHa === 'number' && (info.dinhMucNgayHa < 0 || info.dinhMucNgayHa > 365)) e.push('Định mức thời gian khai thác (ngày/ha) phải từ 0 đến 365');
      if (typeof info.cuLy === 'number' && info.cuLy < 0) e.push('Cự ly không được âm');
      const vc = info.vanChuyen || {};
      if (vc.donGiaKm === 'x') e.push('Đơn giá vận chuyển (đ/tấn/km) không phải là số');
      if (vc.coDinh === 'x') e.push('Đơn giá vận chuyển cố định không phải là số');
      return e;
    }

    function checkNC(rec) {
      const errs = [], warns = [], state = {}, seen = {};
      let tt = 0;
      rec.nc.forEach(r => {
        const at = 'Dòng ' + r._row + ': ';
        const bad = m => { errs.push(at + m); state[r._row] = 'err'; };
        const warn = m => { warns.push(at + m); if (!state[r._row]) state[r._row] = 'warn'; };
        if (r.maRung && r.maRung !== rec.info.maRung) bad('Mã rừng "' + r.maRung + '" khác lô đang mở (' + rec.info.maRung + '): để trống ô Mã rừng hoặc sửa cho đúng lô');
        const role = /^tổ trưởng/i.test(r.vaiTro) ? 'TT' : /^công nhân/i.test(r.vaiTro) ? 'CN' : null;
        if (!role) bad('Vai trò phải là "Tổ trưởng" hoặc "Công nhân"');
        if (role === 'TT') tt++;
        if (!r.ten) bad('thiếu Họ và tên');
        if (!['Ông', 'Bà'].includes(r.danhXung)) bad('Danh xưng phải là Ông hoặc Bà');
        if (!r.ngaySinh) bad('thiếu Ngày sinh');
        else if (!parseVN(r.ngaySinh)) bad('Ngày sinh "' + r.ngaySinh + '" không có thật hoặc sai dd/mm/yyyy');
        else { const ref = ctx.dateKey(rec.info.tuNgay) ? rec.info.tuNgay : ctx.todayStr(), age = ctx.ageAt(r.ngaySinh, ref);
          // khai thác gỗ là công việc nặng nhọc, nguy hiểm: người dưới 18 tuổi không được đưa vào bất kỳ hợp đồng, danh sách hay giấy ủy quyền nào (chặn mọi biểu mẫu có tên người đó)
          if (age != null && age < 18) bad((r.ten || 'Người này') + ' chưa đủ 18 tuổi tại ngày ' + (ctx.dateKey(rec.info.tuNgay) ? 'bắt đầu khai thác ' : 'hôm nay ') + ref + ' (' + age + ' tuổi): không được tham gia khai thác gỗ, bỏ khỏi danh sách nhân công'); }
        if (!r.ngayCap) bad('thiếu Ngày cấp CCCD');
        else if (!parseVN(r.ngayCap)) bad('Ngày cấp CCCD "' + r.ngayCap + '" không có thật hoặc sai dd/mm/yyyy');
        if (!r.noiCap) bad('thiếu Nơi cấp CCCD');
        if (!r.diaChi) bad('thiếu Địa chỉ thường trú');
        if (!ctx.isCccd(r.cccd)) bad('CCCD phải đủ 12 chữ số');
        else if (seen[r.cccd + '|' + (r.doiId || '')]) bad('CCCD trùng dòng ' + seen[r.cccd + '|' + (r.doiId || '')] + ' trong cùng đội');   // 3.0: một người có thể ở hai đội (hai hợp đồng); không trùng trong một đội
        else seen[r.cccd + '|' + (r.doiId || '')] = r._row;
        if (!ctx.chucDanhAll().includes(r.chucDanh)) bad('Chức danh không hợp lệ: "' + r.chucDanh + '"');
        if (role === 'TT' && r.chucDanh !== 'Tổ trưởng') bad('Tổ trưởng phải có chức danh "Tổ trưởng"');
        if (role === 'CN' && r.chucDanh === 'Tổ trưởng') bad('Công nhân không được ghi chức danh "Tổ trưởng"');
        const ngc = rec.info.hinhThucLuong === 'ngaycong';
        if (ctx.chucDanhAll().includes(r.chucDanh)) {
          const ir = infoRow(rec, r), rate = rateOf(ir, r);
          if (!(rate > 0)) bad('chưa có đơn giá ' + basisOf(ir).short + ' cho "' + r.chucDanh + '" trong mục Cơ sở tính đơn giá (tab Nhân công)');
        }
      });
      if (tt < 1) errs.push('Cần ít nhất 1 tổ trưởng (hiện có ' + tt + ')');
      else if (rec.doi) ctx.HAKModel.teamErrors({doi: rec.doi, nc: rec.nc}).forEach(e => { if (e.row != null) { errs.push('Dòng ' + e.row + ': ' + e.text); state[e.row] = 'err'; } else errs.push(e.text); });   // cấu trúc đội (bảng con của lô): mỗi người thuộc một đội, mỗi đội một Tổ trưởng
      else if (tt > 1 && !isDirect(rec.info)) ctx.HAKDoi.build(rec.nc, ctx.isTT).errs.forEach(e => { errs.push('Dòng ' + e.row + ': ' + e.text); state[e.row] = 'err'; });   // nhiều tổ trưởng = nhiều đội, mỗi người phải thuộc đúng một đội
      return {errs, warns, state};
    }

    const parseVN = v => { const p = ctx.HAKDates.parse(ctx.trim(v)); return p ? new Date(p.y, p.m - 1, p.d) : null; };
    const driverSigns = r => ctx.trim(r.nguoiKy) === 'Tài xế';
    /* người ký của xe trong cấu trúc đội xe: {tx} = xe này là nguồn thông tin người ký (chủ xe / tài xế); false = xe không ký (đội ký với doanh nghiệp hoặc người ký là người khác trong đội); null = hồ sơ cũ (mỗi xe tự ký) */
    function kyOfXe(rec, r) {
      if (!rec.hdvc) return null;
      const F = {dx: rec.dx, hdvc: rec.hdvc}, h = ctx.HAKModel.hdOf(F, r); if (!h) return null;
      if (h.donViId) return false;
      if (ctx.HAKModel.vcKey(r) === h.key) return {tx: driverSigns(r)};
      const s = ctx.HAKModel.signerOf(ctx.HAKModel.xeOf(F, h), h.key); return s && s.r === r ? {tx: s.tx} : false;
    }
    function checkDX(rec) {
      const errs = [], warns = [], state = {}, plates = {};
      const n0 = new Date(), today = new Date(n0.getFullYear(), n0.getMonth(), n0.getDate());
      rec.dx.forEach(r => {
        const at = 'Dòng ' + r._row + ': ';
        const bad = m => { errs.push(at + m); state[r._row] = 'err'; };
        if (r.maRung && r.maRung !== rec.info.maRung) bad('Mã rừng "' + r.maRung + '" khác lô đang mở (' + rec.info.maRung + '): để trống ô Mã rừng hoặc sửa cho đúng lô');
        if (ctx.trim(r.doiXe) && rec.hdvc && !rec.hdvc.some(h => ctx.hdTenKhop({dx: rec.dx, hdvc: rec.hdvc}, h, r.doiXe))) bad('Đội xe “' + ctx.trim(r.doiXe) + '” không có trong lô: thêm đội xe ở tab Vận chuyển trước, hoặc để trống ô Đội xe');
        if (!r.chuXe) bad('thiếu Chủ xe');
        if (!r.bienSo) bad('thiếu Biển kiểm soát');
        else if (plates[r.bienSo]) bad('Biển kiểm soát trùng dòng ' + plates[r.bienSo]);
        else plates[r.bienSo] = r._row;
        const nk = ctx.trim(r.nguoiKy), ky = kyOfXe(rec, r), tx = ky ? ky.tx : driverSigns(r);
        if (nk && nk !== 'Chủ xe' && nk !== 'Tài xế') bad('Người ký HĐ vận chuyển phải là "Chủ xe" hoặc "Tài xế" (đang là "' + nk + '")');
        if (ky !== false) {   // xe là nguồn người ký (hoặc hồ sơ cũ: mỗi xe tự ký); xe trong đội ký với doanh nghiệp / người khác thì không bắt thông tin người ký
        // Chỉ người ký HĐ vận chuyển bắt buộc có CCCD, ngày cấp, thường trú, SĐT; người không ký thì không cần
        if (tx && !r.taiXe) bad('người ký là tài xế nhưng thiếu Tên tài xế');
        const sg = tx ? {c: r.cccdTx, nc: r.ngayCapTx, dc: r.diaChiTx, w: 'tài xế'} : {c: r.cccd, nc: r.ngayCap, dc: r.diaChi, w: 'chủ xe'};
        if (!ctx.isCccd(sg.c)) bad(ctx.cccdMsg(sg.w + ' (người ký)', sg.c));
        if (!ctx.trim(sg.nc)) bad('thiếu Ngày cấp CCCD ' + sg.w + ' (người ký)');
        else if (!parseVN(sg.nc)) bad('Ngày cấp CCCD ' + sg.w + ' "' + sg.nc + '" không có thật hoặc sai dd/mm/yyyy');
        const sgSinh = tx ? r.ngaySinhTx : r.ngaySinh;
        if (ctx.trim(sgSinh) && !parseVN(sgSinh)) bad('Ngày sinh ' + sg.w + ' "' + sgSinh + '" không có thật hoặc sai dd/mm/yyyy');
        if (!ctx.trim(sg.dc)) bad('thiếu Thường trú ' + sg.w + ' (người ký)');
        if (!ctx.trim(r.sdt)) bad('thiếu SĐT người ký (' + sg.w + ')');
        }
        // Cảnh báo, không chặn xuất hồ sơ
        const w = [];
        const need = tx ? [['ngaySinhTx', 'ngày sinh tài xế'], ['noiCapTx', 'nơi cấp CCCD tài xế']]
          : [['ngaySinh', 'ngày sinh chủ xe'], ['noiCap', 'nơi cấp CCCD chủ xe']];
        const miss = need.filter(([k]) => !ctx.trim(r[k])).map(x => x[1]);
        if (miss.length && ky !== false) w.push('người ký còn thiếu ' + miss.join(', ') + ' (hợp đồng để trống)');
        if (r.taiXe && !r.gplx) w.push('thiếu Số GPLX');
        const exp = (k, label, must) => {
          const v = ctx.trim(r[k]);
          if (!v) { if (must) w.push('thiếu ' + label); return; }
          const d = parseVN(v);
          if (!d) w.push(label + ' "' + v + '" không đúng dd/mm/yyyy');
          else if (d < today) w.push(label + ' đã hết hạn (' + v + ')');
          else if ((d - today) / 864e5 <= 30) w.push(label + ' sắp hết hạn (' + v + ')');
        };
        if (r.taiXe) exp('hanGplx', 'ngày đến hạn GPLX', true);
        exp('hanBH', 'ngày đến hạn bảo hiểm', true);
        exp('kdDen', 'ngày hết hạn kiểm định', true);
        if (r.cavet && !parseVN(r.cavet)) w.push('ngày cấp cà vẹt "' + r.cavet + '" không có thật hoặc sai dd/mm/yyyy');
        if (r.kdTu && !parseVN(r.kdTu)) w.push('kiểm định từ ngày "' + r.kdTu + '" không đúng dd/mm/yyyy');
        if (parseVN(r.kdTu) && parseVN(r.kdDen) && parseVN(r.kdDen) < parseVN(r.kdTu)) w.push('kiểm định đến ngày trước từ ngày');
        if (w.length) { warns.push(at + w.join('; ')); if (!state[r._row]) state[r._row] = 'warn'; }
      });
      // hai người ký khác tên mà cùng số CCCD sẽ bị gộp thành MỘT hợp đồng (mỗi người ký một hợp đồng): chặn và nêu rõ các dòng
      const bySigner = {};
      rec.dx.forEach(r => { const tx = driverSigns(r), c = ctx.signerKey(tx ? r.cccdTx : r.cccd), nm = tx ? r.taiXe : r.chuXe; if (!c || !ctx.trim(nm)) return; (bySigner[c] = bySigner[c] || []).push({row: r._row, nm: ctx.trim(nm), w: tx ? 'tài xế' : 'chủ xe'}); });
      Object.entries(bySigner).forEach(([c, l]) => { const names = [...new Set(l.map(x => ctx.keyName(x.nm)))]; if (names.length > 1) { const msg = 'CCCD ' + c + ' của ' + l.map(x => x.w + ' “' + x.nm + '” (dòng ' + x.row + ')').join(' và ') + ' trùng nhau nhưng khác họ tên: hai người ký phải có CCCD riêng, nếu không chỉ ra MỘT hợp đồng. Sửa CCCD hoặc họ tên cho đúng người'; errs.push(msg); l.forEach(x => { state[x.row] = 'err'; }); } });
      return {errs, warns, state};
    }

    // Đơn giá vận chuyển (đ/tấn) của rừng. Trả về {gia, text} hoặc {loi}
    /* Đơn giá vận chuyển (chủ rừng trả bên vận chuyển): HAI cách tính.
       1. Cố định: một đơn giá đồng/tấn, không phụ thuộc cự ly.
       2. Tấn/km: đơn giá đồng/tấn/km × cự ly (km) của rừng.
       Cách “theo bậc cự ly” của bản cũ không còn dùng; hồ sơ cũ còn chọn cách đó phải chọn lại một trong hai cách trên (dữ liệu bậc cũ được giữ nguyên, không xóa). */
    function transportPrice(i) {
      const v = i.vanChuyen || {}, mode = v.mode || 'tanKm';
      if (mode === 'coDinh') return v.coDinh > 0 ? {gia: v.coDinh, text: 'cố định ' + ctx.fmt(v.coDinh) + ' đồng/tấn'} : {loi: 'thiếu đơn giá cố định vận chuyển'};
      if (mode !== 'tanKm') return {loi: 'cách tính vận chuyển “theo bậc cự ly” không còn áp dụng: chọn Cố định hoặc Tấn/km ở tab Vận chuyển'};
      const ck = ctx.HAKCuLy.eff(i);   // cự ly nhập tay được ưu tiên; không có thì tự tính từ tọa độ rừng đến tọa độ nơi giao (đường chim bay)
      if (!(ck.km > 0)) return {loi: 'thiếu cự ly vận chuyển (km): ' + ck.thieu};
      if (!(v.donGiaKm > 0)) return {loi: 'thiếu đơn giá vận chuyển (đ/tấn/km)'};
      return {gia: Math.round(v.donGiaKm * ck.km), text: ctx.fmt(v.donGiaKm) + ' đồng/tấn/km × ' + String(ck.km).replace('.', ',') + ' km' + (ck.nguon === 'tự tính' ? ' (cự ly tự tính từ tọa độ, đường chim bay)' : '')};
    }
    // Đơn giá lương của một người: đ/công nếu theo ngày công, đ/tấn nếu theo sản lượng
    function rateOf(i, r) {
      const v = (i[basisOf(i).map] || {})[r.chucDanh];
      if (v > 0) return v;
      return null;   // đơn giá Tổ trưởng hồ sơ cũ (info.donGia) đã chuyển vào bảng đơn giá theo vị trí của đội (SQLite v6)
    }
    const isDirect = i => i.moHinhKy === 'tructiep';
    /* Cơ sở tính đơn giá. Hợp đồng có 2 hình thức:
       - Giao khoán (chủ rừng ký với Tổ trưởng, công nhân ủy quyền cho Tổ trưởng): tính theo TẤN, HA hoặc NGÀY CÔNG (Tổ trưởng nhận thay cả tổ rồi chi trả từng người).
       - Trực tiếp (chủ rừng ký với tất cả nhân công): tính theo TẤN hoặc NGÀY CÔNG.
       Đơn giá theo từng vai trò (chức danh); sản lượng (tấn, ha) hoặc số công chia đều cho mọi người. */
    const BASIS = {sanluong: {map: 'donGiaTan', unit: 'đồng/tấn', short: 'đ/tấn', qty: 'tấn'}, ha: {map: 'donGiaHa', unit: 'đồng/ha', short: 'đ/ha', qty: 'ha'}, ngaycong: {map: 'donGiaNgay', unit: 'đồng/công', short: 'đ/công', qty: 'công'}};
    const basisOf = i => BASIS[i.hinhThucLuong] || BASIS.sanluong;
    const basisAllowed = (direct, b) => direct ? b !== 'ha' : true;   // giao khoán: tấn, ha hoặc ngày công; trực tiếp: tấn hoặc ngày công
    const giaErrors = i => basisAllowed(isDirect(i), i.hinhThucLuong || 'sanluong') ? []
      : ['Chủ rừng ký trực tiếp chỉ tính theo tấn hoặc ngày công (không tính theo ha): chọn lại ở tab Nhân công'];
    /* thông tin (hình thức, đơn giá) áp cho MỘT người / MỘT đội: thông tin lô + hình thức của đội người đó (cấu trúc 2.0); hồ sơ cũ không có đội thì thông tin lô */
    const teamOfRow = (rec, r) => rec.doi ? (rec.doi.find(d => d.id === (r && r.doiId)) || null) : null;
    const infoTeam = (rec, d) => d ? Object.assign({}, rec.info, d.hinhThuc || {}) : rec.info;
    const infoRow = (rec, r) => infoTeam(rec, teamOfRow(rec, r));
    const teamInfos = rec => rec.doi && rec.doi.length ? rec.doi.map(d => infoTeam(rec, d)) : [rec.info];
    const allDirect = rec => teamInfos(rec).every(isDirect), anyGK = rec => teamInfos(rec).some(i => !isDirect(i));
    const giaErrorsRec = rec => rec.doi && rec.doi.length > 1 ? rec.doi.flatMap(d => giaErrors(infoTeam(rec, d)).map(e => 'Đội ' + (d.ten ? '“' + d.ten + '”' : '') + ': ' + e)) : giaErrors(rec.info);
    const hdldList = rec => rec.nc.filter(r => isDirect(infoRow(rec, r)));   // người của đội ký TRỰC TIẾP (giao khoán: thay bằng Giấy ủy quyền BM-20)
    /* ===== Nhiều đội: mỗi Tổ trưởng là một đội, ký hợp đồng giao khoán riêng (src/doi.js) =====
     * doiOf(rec): các đội cùng phần diện tích và khối lượng của lô chia theo số người. subRec(rec, d): hồ sơ của riêng đội d (nhân công của đội, diện tích và khối lượng phần của đội),
     * dùng chung các hàm lập biểu mẫu hiện có nên mỗi đội ra một bộ BM-01, BM-20, BM-08, BM-14 riêng. Lô chỉ một đội: giữ nguyên hồ sơ, không đổi gì. */
    /* đội TƯỜNG MINH (cấu trúc 2.0): rec.doi + nhân công mang doiId. Đội không có Tổ trưởng không lập hồ sơ (như bản cũ). Diện tích đội: nhập ở đội; chưa nhập đủ thì chia theo số người */
    const doiTuongMinh = rec => {
      const teams = rec.doi.map(t => { const m = (rec.nc || []).filter(r => r.doiId === t.id), tt = m.find(ctx.isTT); return tt ? {key: ctx.HAKDoi.keyOf(tt), id: t.id, team: t, ten: t.ten, tt, members: m.filter(r => r !== tt), n: m.length, share: 1} : null; }).filter(Boolean);
      const b = {multi: teams.length > 1, doi: teams, errs: [], orphans: []}, total = teams.reduce((s, d) => s + d.n, 0) || 1;
      if (b.multi) teams.forEach(d => { d.share = d.n / total; });
      /* đội đã nhập diện tích dùng số đó; các đội còn lại chia phần diện tích còn lại của lô theo số người (không đội nào nhập: như bản cũ) */
      const nhap = teams.filter(d => typeof d.team.dienTich === 'number'), con = teams.filter(d => typeof d.team.dienTich !== 'number');
      let ha;
      if (!nhap.length) ha = ctx.HAKDoi.chia(rec.info.dienTich, teams);
      else { const du = typeof rec.info.dienTich === 'number' ? Math.round((rec.info.dienTich - nhap.reduce((s, d) => s + d.team.dienTich, 0)) * 1000) / 1000 : null, nCon = con.reduce((s, d) => s + d.n, 0) || 1;
        const chiaCon = ctx.HAKDoi.chia(du, con.map(d => ({share: d.n / nCon}))); ha = teams.map(d => typeof d.team.dienTich === 'number' ? d.team.dienTich : chiaCon[con.indexOf(d)]); }
      return {b, ha};
    };
    const doiOf = rec => { if (rec.doi) { const {b, ha} = doiTuongMinh(rec); return doiKl(rec, b, ha); }
      const b = isDirect(rec.info) ? ctx.HAKDoi.single(rec.nc, ctx.isTT) : ctx.HAKDoi.build(rec.nc, ctx.isTT), ha = ctx.HAKDoi.chia(rec.info.dienTich, b.doi); return doiKl(rec, b, ha); };
    /* khối lượng của từng đội theo PHIẾU CÂN ĐÃ GÁN ĐỘI. null = chưa gán phiếu nào (hồ sơ cũ: tính như trước); còn phiếu chưa gán hoặc đội có người mà không có phiếu → loi (bản nháp) */
    function klTheoPhieu(rec, b) {
      if (!rec.doi) return null;
      const pcs = (rec.pc || []).filter(p => typeof p.kl === 'number' && p.kl > 0), ids = new Set(b.doi.map(d => d.id)), gan = pcs.filter(p => ids.has(p.doiId));
      const ds = pcs.filter(p => !ids.has(p.doiId));   // phiếu CHƯA gán đội (phiếu #03: để cảnh báo trước khi xuất; không ảnh hưởng số in)
      if (!gan.length) return pcs.length ? {chuaGan: pcs.length, ds} : null;
      const vals = b.doi.map(d => ctx.klPhieu(pcs.filter(p => p.doiId === d.id))), thieu = pcs.length - gan.length, rong = b.doi.filter((d, i) => !vals[i]);
      const loi = thieu ? 'còn ' + thieu + '/' + pcs.length + ' phiếu cân chưa gán đội: gán ở bảng phiếu cân (tab Vận chuyển)' : rong.length ? 'đội ' + rong.map(d => '“' + (d.ten || '') + '”').join(', ') + ' chưa có phiếu cân nào' : '';
      return {vals, nguon: 'phieucan', loi, ds};
    }
    const doiKl = (rec, b, ha) => {
      const kp = b.multi ? klTheoPhieu(rec, b) : null;
      let kq = b.multi ? ctx.HAKDoi.khoiLuong(klLo(rec.info), b.doi, Object.fromEntries(b.doi.map(d => [d.key, d.team && d.team.klHoSoCu]))) : {vals: ctx.HAKDoi.chia(klLo(rec.info), b.doi), nguon: 'songuoi', loi: ''};
      const pb = b.multi && rec.doi && ctx.HAKPhanBo.cheDo(rec) === 'chiaDeu' ? ctx.HAKPhanBo.tinh(rec) : null;   // 3.0: hai đội chia đều tổng phiếu cân (kg nguyên, 1 kg lẻ cho đội đứng trước)
      if (pb && pb.tongKg > 0) kq = {vals: b.doi.map(d => { const x = pb.doi.find(y => y.id === d.id); return x ? x.tan : 0; }), nguon: 'chiadeu', loi: ''};
      else if (kp && kp.vals) kq = kp.loi ? Object.assign({}, kq, {loi: kp.loi}) : kp;   // gán đủ: khối lượng đội = phiếu cân của đội
      else if (kp && kp.chuaGan && kq.nguon !== 'nhap' && !pb) kq = Object.assign({}, kq, {chuaGan: kp.chuaGan});   // khối lượng từng đội: nhập riêng (đủ, khớp tổng) hoặc chia theo số người
      /* phiếu #03: còn phiếu chưa gán đội mà khối lượng đội đang CHIA THEO SỐ NGƯỜI (không dùng phiếu cân) → danh sách phiếu đó (rỗng nếu không rơi vào trường hợp này). Chỉ ghi nhận, KHÔNG đổi số. */
      b.phieuChuaGan = kp && kq.nguon === 'songuoi' ? (kp.ds || []) : [];
      b.klNguon = kq.nguon; b.klLoi = kq.loi; b.pcChuaGan = kq.chuaGan || 0; b.doi.forEach((d, i) => { d.dienTich = ha[i]; d.khoiLuong = kq.vals[i]; }); return b; };
    /* hồ sơ của ĐỘI ĐANG CHỌN (màn Nhân công khai thác): nhân công và hình thức của đội; lô một đội: cả lô */
    const recDoiChon = rec => {
      if (!rec.doi || rec.doi.length < 2) return rec;
      const t = ctx.curTeam(); if (!t) return rec;
      const d = rec.doi.find(x => x.id === t.id) || t;
      return Object.assign({}, rec, {nc: rec.nc.filter(r => r.doiId === d.id), info: infoTeam(rec, d), _team: d, exp: Object.keys(d.exp || {}).length ? Object.assign({}, rec.exp, d.exp) : rec.exp});
    };
    /* hồ sơ cho một người theo đội của người đó (hợp đồng lao động của đội ký trực tiếp) */
    const recOfRow = (rec, r) => { if (!rec.doi) return rec; const B = doiOf(rec); if (!B.multi) return rec; const d = B.doi.find(x => x.id === r.doiId); return d ? subRec(rec, B, d) : rec; };
    const subRec = (rec, b, d) => !b.multi ? rec : Object.assign({}, rec, b.klNguon === 'phieucan' ? {pc: (rec.pc || []).filter(p => p.doiId === d.id)} : {}, {_share: b.klNguon === 'phieucan' ? null : d.share, _klNhap: b.klNguon === 'nhap' || b.klNguon === 'chiadeu', _klChiaDeu: b.klNguon === 'chiadeu', _klLo: klLo(rec.info), _doiTen: d.ten, _nDoi: b.doi.length, nc: [d.tt, ...d.members], _team: d.team || null, exp: d.team && Object.keys(d.team.exp || {}).length ? Object.assign({}, rec.exp, d.team.exp) : rec.exp, info: Object.assign({}, rec.info, d.team ? d.team.hinhThuc : {}, d.dienTich != null ? {dienTich: d.dienTich} : {}, d.khoiLuong != null ? {klHoSoCu: d.khoiLuong} : {})});
    const ncList = rec => { const tt = rec.nc.find(ctx.isTT); return tt ? [tt, ...rec.nc.filter(r => r !== tt)] : rec.nc.slice(); };   // tổ trưởng đầu danh sách, rồi mọi người còn lại (kể cả các tổ trưởng khác)
    /* Lô nhiều đội: mỗi đội ký hợp đồng riêng nên số hợp đồng, giấy ủy quyền, biên bản nghiệm thu của mỗi đội thêm hậu tố .1, .2… ngay sau phần số (015 → 015.1, 015/2026-KT → 015.1/2026-KT).
     * Số để trống (chưa nhập) thì giữ nguyên chỗ trống để điền tay. Số hợp đồng vận chuyển và xác nhận khối lượng KHÔNG thêm hậu tố: lưu riêng theo ID đội xe (Sổ văn bản, src/sovb.js). */
    const soDoiSo = (x, k) => (x.thieuSo || !x.so) ? x : Object.assign({}, x, {so: /\//.test(x.so) ? x.so.replace('/', '.' + k + '/') : x.so + '.' + k});
    const exDoi = (ex, b, idx) => {
      if (!b.multi) return ex;
      const d = b.doi[idx], te = (d && d.team && d.team.exp) || null, e = te && Object.keys(te).length ? Object.assign({}, ex, te) : ex;
      const so = e === ex ? ex._so : ctx.HAKHopDong.numbers(e), chung = k => !d || !d.team || b.doi.filter(x => x.team && ((x.team.exp || {})[k] || '') === ((d.team.exp || {})[k] || '')).length > 1;
      return Object.assign({}, e, {_so: Object.assign({}, so, {kt: chung('soKT') ? soDoiSo(so.kt, idx + 1) : so.kt, uq: chung('uqSo') ? soDoiSo(so.uq, idx + 1) : so.uq, nt: chung('ntSo') ? soDoiSo(so.nt, idx + 1) : so.nt})});
    };
    const doiLabel = d => (d.ten ? d.ten + ' — ' : '') + d.tt.ten;
    const ucList = rec => rec.nc.filter(r => !ctx.isTT(r) && !isDirect(infoRow(rec, r)));         // người ủy quyền cho Tổ trưởng (đội giao khoán)
    // Khối lượng dùng cho bảng lương: thực tế nếu có, không thì dự kiến (diện tích × định mức)
    /* khối lượng thực tế của lô: số nhập tay (chỉ còn ở hồ sơ cũ) hoặc TỔNG PHIẾU CÂN (một nguồn); chưa có thì dự kiến */
    const klLo = i => typeof i.klHoSoCu === 'number' && i.klHoSoCu > 0 ? i.klHoSoCu : (i._klPC > 0 ? i._klPC : null);   // số khối lượng nhập tay của hồ sơ cũ (klHoSoCu) còn thì vẫn là khối lượng lô; bỏ số này thì lấy tổng phiếu cân
    const volumeOf = i => {
      if (typeof i.klHoSoCu === 'number' && i.klHoSoCu > 0) return {v: i.klHoSoCu, src: 'thực tế'};
      if (i._klPC > 0) return {v: i._klPC, src: 'thực tế'};
      const y = ctx.forestYield(i);
      return y > 0 ? {v: y, src: 'dự kiến'} : null;
    };
    /* Khối lượng DỰ KIẾN (diện tích × định mức): dùng cho các biểu mẫu đợt 1 (hợp đồng, thẩm định, cam kết…) để bản in không đổi khi sau này nhập khối lượng thực tế */
    const forecastVol = i => { const y = ctx.forestYield(i); return y > 0 ? {v: y, src: 'dự kiến'} : null; };
    const fmtCong = n => ctx.numSwap(n.toLocaleString('vi-VN', {maximumFractionDigits: 2}));
    const fmtTan = n => ctx.numSwap(n.toLocaleString('vi-VN', {maximumFractionDigits: 3}));
    const workDays = (a, b) => { let n = 0; for (const d = new Date(a); d <= b; d.setDate(d.getDate() + 1)) if (d.getDay() !== 0) n++; return n; };
    function payrollPlan(rec, ex) {
      const rs = rec.info, basis = rs.hinhThucLuong === 'ngaycong' ? 'ngaycong' : rs.hinhThucLuong === 'ha' ? 'ha' : 'sanluong', ngc = basis === 'ngaycong', issues = [];
      const tu = ctx.trim((ex || {}).tuNgayTT) || rs.tuNgay || '', den = ctx.trim((ex || {}).denNgayTT) || rs.denNgay || '';
      const a = parseVN(tu), b = parseVN(den);
      let cong = null, vol = null;
      if (ngc) {
        if (!a || !b) issues.push('thiếu hoặc sai Thời gian khai thác (từ ngày, đến ngày) của rừng');
        else if (b < a) issues.push('ngày kết thúc trước ngày bắt đầu');
        else cong = workDays(a, b);
      } else if (basis === 'ha') {
        vol = (typeof rs.dienTich === 'number' && rs.dienTich > 0) ? {v: rs.dienTich, src: 'diện tích rừng'} : null;
        if (!vol) issues.push('thiếu diện tích của rừng (ha)');
      } else {
        vol = (ex && ex._forecast) ? forecastVol(rs) : volumeOf(rs);
        if (!vol) issues.push('thiếu khối lượng (nhập khối lượng thực tế, hoặc diện tích và định mức của rừng)');
      }
      return {ngc, basis, tu, den, cong, vol, issues};
    }
    /* Bảng tiền theo từng người: sản lượng (tấn/ha) hoặc số công chia đều; đơn giá theo vai trò. Dùng chung cho BM-01, BM-08, BM-14. */
    function payRows(rec, ex) {
      const rs = rec.info, plan = payrollPlan(rec, ex), list = ncList(rec), N = list.length;
      const each = (!plan.ngc && plan.vol && N) ? plan.vol.v / N : null;
      let sum = 0;
      const actual = plan.ngc && !(ex && ex._forecast) && ctx.HAKChamCong.hasAny(rec.cc);   // đã chấm công thực tế: số công từng người; hợp đồng (đợt 1) luôn dùng số công dự tính
      const rows = list.map(r => {
        const rate = rateOf(rs, r), cong = plan.ngc ? (actual ? ctx.HAKChamCong.total(rec.cc, ctx.HAKChamCong.personKey(r)) : plan.cong) : null; let tien = null;
        if (rate) tien = plan.ngc ? (cong != null ? Math.round(rate * cong) : null) : (each != null ? Math.round(each * rate) : null);
        if (tien != null) sum += tien;
        return {r, rate, tien, cong};
      });
      const khoan = ctx.HAKKhoan.derive(list.map(r => rateOf(rs, r)), (!plan.ngc && plan.vol) ? plan.vol.v : null);   // đơn giá khoán của tổ suy ra từ định biên
      return {plan, list, N, each, rows, sum, khoan, actual};
    }
    /* Giao khoán, trường hợp 1 (Thông tin rừng KHÔNG có đơn giá Tổ trưởng): đơn giá khoán của tổ = đơn giá bình quân suy ra từ định biên nhân sự (số người từng vị trí ở sheet nhân công × đơn giá vị trí).
     * Trường hợp 2 (Thông tin rừng có đơn giá Tổ trưởng): làm như cũ. Trả null khi không áp dụng. */
    const khoanSuyRa = rec => {
      const rs = rec.info; if (isDirect(rs)) return null;
      const pr = payRows(rec, {}); if (pr.plan.ngc || !pr.khoan.ok) return null;
      const bs = basisOf(rs), pos = ctx.chucDanhAll().map(cd => { const n = rec.nc.filter(r => r.chucDanh === cd).length; return {cd, n, rate: rateOf(rs, {chucDanh: cd})}; }).filter(x => x.n > 0 || x.rate > 0);   // vị trí của danh mục đang có người hoặc đã có đơn giá
      const used = pos.filter(x => x.n > 0), k = pr.khoan;
      const formula = '(' + used.map(x => x.n + ' × ' + ctx.fmt(x.rate)).join(' + ') + ') ÷ ' + k.N + ' người = ' + ctx.HAKKhoan.fmtPrice(k.sumRates) + ' ÷ ' + k.N + ' = ' + ctx.HAKKhoan.fmtPrice(k.price) + ' ' + bs.unit;
      return {pr, k, bs, pos, used, formula, price: ctx.HAKKhoan.fmtPrice(k.price), qty: bs.qty === 'ha' ? 'diện tích' : 'sản lượng'};
    };
    /* Đơn giá khoán theo TỪNG vị trí: luôn liệt kê đủ cả ba vị trí (Tổ trưởng, Công nhân khai thác, Công nhân cưa), kể cả khi chưa có người ở vị trí đó */
    const roleRates = rec => ctx.chucDanhAll().filter(cd => rec.nc.some(r => r.chucDanh === cd) || rateOf(rec.info, {chucDanh: cd}) > 0).map(cd => { const n = rec.nc.filter(r => r.chucDanh === cd).length; const rate = rateOf(rec.info, {chucDanh: cd}); return cd + ': ' + (rate ? ctx.fmt(rate) : '………') + ' ' + basisOf(rec.info).unit + (n ? ' (' + n + ' người)' : ' (hiện chưa có người ở vị trí này)'); });
    /* Ngày tham chiếu để chọn bản định mức BHLĐ có hiệu lực: danh sách cấp phát BM-02 theo ngày cấp phát (hoặc ngày bắt đầu khai thác); hợp đồng lao động BM-03 theo ngày bắt đầu hợp đồng, ngày ký, hoặc ngày bắt đầu khai thác */
    const normRefCapPhat = (rec, ex) => { const e = ex || rec.exp || {}; return ctx.HAKDates.isValid(e.capNgay) ? e.capNgay : (rec.info.tuNgay || ''); };
    const normRefHDLD = (rec, ex) => { const e = ex || rec.exp || {}; return [rec.info.ngayBDLD, e.ngayKy, rec.info.ngayKyHopDong, rec.info.tuNgay].find(x => ctx.HAKDates.isValid(x)) || ''; };
    const normErrors = rec => { const ref = normRefCapPhat(rec), pk = ctx.HAKDinhMuc.pick(ctx.db, ref), out = [];
      if (!pk.found) return ['chưa có bản định mức BHLĐ hiệu lực tại ngày ' + ref + ' (bản sớm nhất hiệu lực từ ' + (pk.earliest.tuNgay || '…') + '): thêm bản định mức hoặc đổi ngày cấp phát'];
      [...new Set(rec.nc.map(r => r.chucDanh))].filter(cd => ctx.chucDanhAll().includes(cd) && !ctx.BHLD_ITEMS.some(([k]) => ctx.trim(((pk.ver.dm || {})[cd] || {})[k]))).forEach(cd => out.push('chưa có định mức BHLĐ cho chức danh "' + cd + '"' + (pk.ver.tuNgay ? ' (bản hiệu lực từ ' + pk.ver.tuNgay + ')' : '')));
      return out; };
    /* Định mức của một vị trí tại ngày ref (không truyền ref: bản mới nhất) */
    function normOf(chucDanh, ref) { return ctx.HAKDinhMuc.normFor(ctx.db, chucDanh, ref).norm; }
    // Thông tin pháp lý & tọa độ của rừng, ghi trong điều khoản địa điểm
    function rungText(i) {
      const parts = [];
      if (i.lat != null && i.lng != null) parts.push('tọa độ điểm tâm (WGS84): ' + i.lat + ', ' + i.lng);
      (i.giayTo || []).forEach(g => parts.push((g.loai === 'Khác' && g.ten ? g.ten : g.loai) + (g.so ? ' số ' + g.so : '') + (g.ngayCap ? ', ngày cấp ' + g.ngayCap : '') + (g.coQuan ? ', ' + g.coQuan : '')));
      return parts.length ? ' (' + parts.join('; ') + ')' : '';
    }

    /* lỗi cước vận chuyển: theo từng hợp đồng có xe (cước riêng hoặc cước chung của lô); hồ sơ cũ: cước của lô */
    function vcLoi(rec) {
      if (!rec.hdvc) { const v = transportPrice(rec.info); return v.loi ? [v.loi] : []; }
      const gs = ctx.groupsDX(rec); if (!gs.length) { const v = transportPrice(rec.info); return v.loi ? [v.loi] : []; }
      const out = []; gs.forEach(g => { const v = transportPrice(ctx.vcInfo(rec, g.hd)); if (v.loi) out.push(g.hd.cuoc ? 'Hợp đồng với ' + (g.ten || '(chưa có tên)') + ': ' + v.loi : v.loi); });
      return [...new Set(out)];
    }
    /* rà mâu thuẫn ngày, số (src/nhaplieu.js) cho lô, cho TỪNG ĐỘI (hình thức, số văn bản của đội) và TỪNG ĐỘI XE có số / cước riêng; trùng thì chỉ báo một lần */
    function nhapLieuAll(rec) {
      const out = [], seen = new Set(), base = ctx.HAKNhapLieu.kiemTra(rec), baseT = new Set(base.map(x => x.text));
      const add = (x, pre, dt) => { const t = pre ? Object.assign({}, x, {text: pre + x.text, doiTuong: dt}) : x, k = t.kind + '|' + t.text; if (!seen.has(k)) { seen.add(k); out.push(t); } };
      base.forEach(x => add(x));
      if (rec.doi && rec.doi.length > 1) { const B = doiOf(rec); if (B.multi) B.doi.forEach(d => ctx.HAKNhapLieu.kiemTra(subRec(rec, B, d)).forEach(x => { if (!baseT.has(x.text)) add(x, 'Đội “' + (d.ten || '') + '”: ', {loai: 'doi', ten: d.ten || ''}); })); }
      if (rec.hdvc) ctx.groupsDX(rec).forEach(g => { const h = g.hd; if (!h || (!h.cuoc && !Object.keys(h.exp || {}).length)) return; const [r2, e2] = ctx.vcCtx(rec, Object.assign({}, rec.exp, {_so: {}}), g);
        ctx.HAKNhapLieu.kiemTra(Object.assign({}, r2, {exp: e2})).forEach(x => { if (!baseT.has(x.text)) add(x, 'Đội xe “' + (g.ten || '') + '”: ', {loai: 'doiXe', ten: g.ten || ''}); }); });
      return out;
    }
    /* gateRaw: NGUỒN SINH MỤC KIỂM TRA (danh sách lỗi theo nhóm, không còn cờ canX riêng). exportCheck biến chúng thành mục có nhóm, biểu mẫu, đối tượng; mọi quyết định “được xuất biểu mẫu nào” đọc từ
     * HAKKiemTra.chanCho trên CÙNG danh sách đó (xem gate bên dưới). Chỉ giữ ở đây các điều kiện CẤU TRÚC (có tổ trưởng, có danh sách ủy quyền…), không phải lỗi dữ liệu. */
    function gateRaw(rec) {
      const nl = nhapLieuAll(rec);
      const info = [...infoErrors(rec.info, rec.id), ...forestErrors(rec.info, rec.fid), ...giaErrorsRec(rec), ...nl.filter(x => x.kind === 'chan').map(x => x.text)];
      const nc = checkNC(rec);
      const dx = checkDX(rec);
      const vcL = vcLoi(rec);
      const hasTT = rec.nc.some(ctx.isTT);
      const direct = allDirect(rec), normErrs = normErrors(rec);
      const pc = ctx.checkPC(rec);
      let pcTrung = []; try { pcTrung = ctx.HAKCheoLo.phieuTrung(ctx.db, rec.id, rec.fid, rec.pc || [], ctx.cheoCtx()); } catch (e) { /* không kiểm được chéo lô: không chặn */ }
      return {pc, pcTrung, info, nc, dx, direct, normErrs, vc: vcL, hasTT, nhapLieu: nl,
        cauTruc: {gk: !direct && hasTT, get uq() { const v = !direct && hasTT && ucList(rec).length > 0 && !ctx.minorsOf(rec).length; Object.defineProperty(this, 'uq', {value: v}); return v; },   // tính khi cần (danh sách lô lớn không phải tính ủy quyền, HĐLĐ cho từng lô)
          get hdld() { const v = hasTT && hdldList(rec).length > 0; Object.defineProperty(this, 'hdld', {value: v}); return v; }, nhanCong: hasTT, vanChuyen: rec.dx.length > 0, phieuCan: rec.dx.length > 0 && (rec.pc || []).length > 0}};
    }
    /* gate: gateRaw + CÁC CỜ canX SUY RA từ danh sách mục kiểm tra (exportCheck) bằng HAKKiemTra.chanCho: biểu mẫu nào còn ít nhất một đội / đội xe không bị chặn thì nút xuất còn dùng được;
     * file của đội / đội xe bị chặn được loại khỏi từng bản xuất (xem bmLoaiFile). Một nguồn duy nhất cho nút tải, mục quy trình, gói ZIP, đợt 2, in bổ sung. */
    function gate(rec) {
      const kt = ctx.exportCheck(rec), g = kt.g, c = g.cauTruc, ok = code => ctx.bmConDuoc(rec, kt, code);
      const out = Object.assign({}, g, {
        canGK: c.gk && ok('01'), canBHLD: c.nhanCong && ok('02') && ok('06'), canPhat: c.nhanCong && ok('02'), canTC: c.nhanCong && ok('08'),
        canHDLD: c.hdld && ok('03'), canUQ: c.uq && ok('20'), canHDVC: c.vanChuyen && ok('04'),
        canPC: c.phieuCan && ok('09') && ok('10'),
        bm: ok
      });
      out.ok = kind => !!ctx.kindOk(out)[kind];   // nút / mục của một biểu mẫu: còn xuất được cho ít nhất một đội (hoặc cả lô)
      return out;
    }
    /* kind của nút xuất → biểu mẫu; điều kiện cấu trúc theo loại; dùng chung cho nút tải, mục quy trình, đợt 2 */
    const KIND_BM = {gk: ['01'], uq: ['20'], hdld: ['03'], bhld: ['02'], hdvc: ['04'], cc: ['05'], dsd: ['06'], xn: ['07'], tc: ['08'], xnvc: ['09'], ttvc: ['10'], ckng: ['11'], cklc: ['12'], kthn: ['13'], nttl: ['14'], stai: ['15'], tbi: ['16'], tdcr: ['17'], nkkt: ['18'], fsc: ['19']};
    function gateKind(g, kind) {
      const c = g.cauTruc, cau = {gk: c.gk, uq: c.uq, hdld: c.hdld, hdvc: c.vanChuyen, xnvc: c.phieuCan, ttvc: c.phieuCan, tdcr: true, ckng: true}[kind];
      return (cau === undefined ? c.nhanCong : cau) && KIND_BM[kind].every(code => g.bm(code));
    }
    return {BASIS, KIND_BM, allDirect, anyGK, basisAllowed, basisOf, checkDX, checkNC, doiKl, doiLabel, doiOf, doiTuongMinh, driverSigns, exDoi, fmtCong, fmtTan, forecastVol, forestErrors, gate, gateKind, gateRaw, giaErrors, giaErrorsRec, hdldList, infoErrors, infoRow, infoTeam, isDirect, khoanSuyRa, klLo, klTheoPhieu, kyOfXe, ncList, nhapLieuAll, normErrors, normOf, normRefCapPhat, normRefHDLD, parseVN, payRows, payrollPlan, rateOf, recDoiChon, recOfRow, roleRates, rungText, soDoiSo, subRec, teamInfos, teamOfRow, transportPrice, ucList, vcLoi, volumeOf, workDays};
  }
  const api = {create, TEN_NGOAI: ["BHLD_ITEMS","HAKChamCong","HAKCheoLo","HAKCuLy","HAKDates","HAKDinhMuc","HAKDoi","HAKHopDong","HAKKhoan","HAKLoRung","HAKModel","HAKNhapLieu","HAKPhanBo","ageAt","bmConDuoc","cccdMsg","checkPC","cheoCtx","chucDanhAll","curTeam","dateKey","db","exportCheck","fmt","forestYield","groupsDX","hdTenKhop","isCccd","isTT","keyName","kindOk","klPhieu","minorsOf","numSwap","signerKey","todayStr","trim","vcCtx","vcInfo"]};
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.HAKKiemTraNhieuDoi = api;
})(typeof self !== 'undefined' ? self : this);
