/* ========== Mẫu in bổ sung ========== */
const SIGN_DATE = '<br>';
function footerSign(title, name, blanks = 3) {   // khối ký một người ở nửa phải trang: ngày, chức danh, ghi chú, họ tên cùng canh giữa trên một trục
  return [
    P('', {after: 60}),
    T([7568, 7569], [['', {v: 'Đà Nẵng, ' + HAKHopDong.ngayTrong(), i: true}], ['', '**' + title + '**'], ['', {v: '(Ký, họ tên)', i: true}], ...Array.from({length: blanks}, () => ['', '']), ['', '**' + upper(name) + '**']], {borders: false, al: 'center', keep: true})
  ];
}
function docChamCong(rec, ex) {
  const rs = rec.info, tt = rec.nc.find(isTT);
  const list = [tt, ...rec.nc.filter(r => !isTT(r))];
  const dayHead = Array.from({length: 31}, (_, i) => String(i + 1));
  const widths = [450, 2400, ...Array(31).fill(360), 1000];
  const CC = HAKChamCong, km = ex._ccMonth || '';   // _ccMonth chỉ có khi in bảng chấm công ĐÃ NHẬP; các gói hồ sơ luôn in mẫu trống để chấm tay
  const cell = (r, d) => { if (!km || d > CC.daysIn(km)) return ''; const v = CC.get(rec.cc, km, CC.personKey(r), d); return v == null ? '' : fmtCong(v); };
  const sumOf = r => { if (!km) return ''; const m = ((rec.cc || {})[km] || {})[CC.personKey(r)]; return m && Object.keys(m).length ? fmtCong(CC.monthTotal(rec.cc, km, CC.personKey(r))) : ''; };
  const rows = list.map((r, i) => [String(i + 1), upper(r.ten), ...Array.from({length: 31}, (_, d) => cell(r, d + 1)), sumOf(r)]);
  return [
    P('**BẢNG CHẤM CÔNG LAO ĐỘNG KHAI THÁC RỪNG ' + upper(personName(rs.danhXung, rs.ten)) + '**', {al: 'center', sz: 26, before: 60, after: 40}),
    P('(Địa chỉ: ' + rs.diaDiem + ')', {al: 'center', after: 40}),
    P('**Tháng ' + (km ? km.split('-')[1] + '/' + km.split('-')[0] : ex.thang ? (/\//.test(ex.thang) ? ex.thang : ex.thang + '/' + HAKHopDong.NAM_TRONG) : '……/' + HAKHopDong.NAM_TRONG) + '**', {al: 'center', after: 160}),
    T(widths, [['TT', 'Họ và tên', ...dayHead, 'Tổng số công'], ...rows],
      {head: true, borders: true, sz: 16, rowH: 420,
       alignCols: ['center', 'left', ...Array(31).fill('center'), 'center']}),
    ...footerSign('Đại diện Tổ khai thác', tt.ten)
  ];
}
function docDSDoi(rec, ex) {
  const rs = rec.info, tt = rec.nc.find(isTT);
  const list = [tt, ...rec.nc.filter(r => !isTT(r))];
  const rows = list.map((r, i) => [String(i + 1), upper(r.ten), r.chucDanh, r.diaChi, r.ngaySinh, r.cccd, r.ngayCap, r.noiCap, '']);
  return [
    P('**DANH SÁCH ĐỘI KHAI THÁC RỪNG ' + upper(personName(rs.danhXung, rs.ten)) + '**', {al: 'center', sz: 26, before: 60, after: 40}),
    P('(Địa chỉ: ' + rs.diaDiem + ')', {al: 'center', after: 160}),
    T([640, 2100, 1700, 2860, 1100, 1500, 1100, 3000, 1000],
      [['STT', 'HỌ TÊN', 'CHỨC DANH CÔNG VIỆC', 'ĐỊA CHỈ', 'NGÀY SINH', 'SỐ CCCD', 'NGÀY CẤP', 'NƠI CẤP', 'GHI CHÚ'], ...rows],
      {head: true, borders: true, sz: 18, rowH: 380,
       alignCols: ['center', 'left', 'left', 'left', 'center', 'center', 'center', 'left', 'left']}),
    ...nhiemVuBlocks(rec),
    ...footerSign('Đại diện Tổ khai thác', tt.ten)
  ];
}
/* Phân công nhiệm vụ theo vị trí (định mức nhân công): chỉ in khi đã lưu định mức nhân công, nên hồ sơ cũ không đổi */
function nhiemVuBlocks(rec) {
  const g = HAKDinhBien.get(db, (rec.info || {}).tuNgay); if (g.ngayLoi || !g.saved) return [];   // ngày bắt đầu sai: không chọn được phiên bản, không in phần phân công (đã báo ở Kiểm tra)
  const sc = HAKDinhBien.soSanh(g.rows, rec.nc || []);
  return [P('**PHÂN CÔNG NHIỆM VỤ THEO VỊ TRÍ**', {al: 'center', sz: 22, before: 200, after: 80, keep: true}),
    T([2600, 1200, 1200, 9900], [['VỊ TRÍ', 'ĐỊNH BIÊN', 'THỰC TẾ', 'NHIỆM VỤ'], ...sc.vt.map(v => [v.chucDanh + (v.kiemNhiem ? ' (kiêm ' + v.kiemNhiem.toLowerCase() + ')' : ''), String(v.can), String(v.co), v.nhiemVu || ''])],   // nhiệm vụ của đúng vị trí đó (không ghép theo số dòng: danh mục có vị trí 0 người)
      {head: true, borders: true, sz: 18, rowH: 380, alignCols: ['left', 'center', 'center', 'left']})];
}
function docXNDaoTao(rec, ex) {
  const rs = rec.info, tt = rec.nc.find(isTT);
  const list = [tt, ...rec.nc.filter(r => !isTT(r))];
  const rows = list.map((r, i) => [String(i + 1), upper(r.ten), r.chucDanh, r.ngaySinh, r.cccd, r.diaChi, '']);
  return [
    P('**BIÊN BẢN XÁC NHẬN ĐÀO TẠO AN TOÀN LAO ĐỘNG CHO ĐỘI KHAI THÁC RỪNG ' + upper(personName(rs.danhXung, rs.ten)) + '**', {al: 'center', sz: 26, before: 60, after: 40}),
    P('(Địa chỉ: ' + rs.diaDiem + ')', {al: 'center', after: 120}),
    ...(rungRef(rs) ? [P(rungRef(rs), {al: 'center', i: true, sz: 22, after: 120})] : []),
    P('- Căn cứ Luật An toàn, vệ sinh lao động số 84/2015/QH13 ngày 25/06/2015 và Bộ luật Lao động số 45/2019/QH14 ngày 20/11/2019.', {al: 'left', after: 60}),
    P('- Thời gian đào tạo: **' + dot(ex.dtNgay, 6) + '** · Địa điểm: **' + dot(ex.dtDiaDiem, 8) + '** · Thời lượng: **' + dot(ex.dtThoiLuong, 4) + '**.', {al: 'left', after: 60}),
    P('- Người đào tạo, huấn luyện: **' + (ex.dtNguoi || personName(rs.danhXung, rs.ten)) + '**.', {al: 'left', after: 60}),
    P('**Tài liệu đào tạo:** HƯỚNG DẪN AN TOÀN LAO ĐỘNG CHO CÔNG NHÂN TRONG KHAI THÁC', {al: 'left', after: 60}),
    P('**Nội dung đào tạo:**', {al: 'left', after: 40, keep: true}),
    ...(ex.dtNoiDung ? ex.dtNoiDung.split(';').map(x => x.trim()).filter(Boolean) : DT_NOIDUNG).map((x, i) => P((i + 1) + '. ' + x, {al: 'left', ind: 360, after: 30})),
    P('Những người có tên dưới đây đã được đào tạo, hướng dẫn đầy đủ các nội dung trên và cam kết thực hiện đúng quy định an toàn lao động:', {al: 'left', before: 100, after: 120}),
    T([640, 2400, 1900, 1200, 1700, 4160, 3000],
      [['STT', 'HỌ TÊN', 'CHỨC DANH CÔNG VIỆC', 'NGÀY SINH', 'SỐ CCCD', 'ĐỊA CHỈ', 'KÝ XÁC NHẬN'], ...rows],
      {head: true, borders: true, sz: 18, rowH: 480,
       alignCols: ['center', 'left', 'left', 'center', 'center', 'left', 'left']}),
    P('', {after: 120}),
    P('Đà Nẵng, ' + (ex.dtNgay ? 'ngày ' + ex.dtNgay : HAKHopDong.ngayTrong()), {al: 'right', after: 160}),
    T([7500, 7500], [
      ['**NGƯỜI ĐÀO TẠO**', '**ĐẠI DIỆN TỔ KHAI THÁC**'],
      ['(Ký, họ tên)', '(Ký, họ tên)'],
      ['', ''], ['', ''], ['', ''],
      ['**' + upper(ex.dtNguoi || rs.ten) + '**', '**' + upper(tt.ten) + '**']
    ], {borders: false, al: 'center', keep: true})
  ];
}

/* ========== Gom các tệp cần xuất ========== */
/* khóa người ký: chỉ lấy chữ số CCCD (viết 049… hay 49… có dấu cách vẫn là một người) */
const signerKey = c => String(c == null ? '' : c).replace(/\D/g, '');
/* cước của MỘT hợp đồng vận chuyển: cước riêng của hợp đồng (nếu có) thay cho cước chung của lô */
const vcInfo = (rec, h) => h && h.cuoc ? Object.assign({}, rec.info, {vanChuyen: Object.assign({}, rec.info.vanChuyen || {}, h.cuoc)}) : rec.info;
/* hồ sơ và số văn bản cho biểu mẫu của một hợp đồng vận chuyển (BM-04, BM-09, BM-10): cước, số HĐ, chi phí, số/ngày xác nhận khối lượng của hợp đồng; trống = của lô */
function vcCtx(rec, ex, g) {
  const h = g && g.hd; if (!h) return [rec, ex];
  const r2 = h.cuoc ? Object.assign({}, rec, {info: vcInfo(rec, h)}) : rec;
  let e = ex;
  if (Object.keys(h.exp || {}).length) { e = Object.assign({}, ex, h.exp); const n = HAKHopDong.numbers(e); e._so = Object.assign({}, ex._so, {vc: n.vc, xn: n.xn}); }
  /* Lô nhiều đội xe: mỗi đội xe là một bên vận chuyển ký hợp đồng riêng. Các đội xe cùng dùng MỘT số (để trống số riêng nên lấy số chung của lô, hoặc nhập trùng nhau) thì số hợp đồng vận chuyển
   * và số biên bản xác nhận khối lượng thêm hậu tố .1, .2… theo thứ tự đội xe (07 → 07.1, 07/2026-HĐVC → 07.1/2026-HĐVC), cùng quy tắc với đội khai thác (soDoiSo). Số để trống giữ nguyên chỗ trống. */
  const gs = rec.hdvc ? groupsDX(rec).filter(x => x.hd) : [], idx = gs.findIndex(x => x.hd.id === h.id);
  if (gs.length > 1 && idx >= 0 && e._so) {
    const gt = (x, k) => trim((x.hd.exp || {})[k] || ex[k] || ''), chung = k => !!gt(g, k) && gs.filter(x => gt(x, k) === gt(g, k)).length > 1, so = Object.assign({}, e._so);
    if (so.vc && chung('soVC')) so.vc = soDoiSo(so.vc, idx + 1);
    if (so.xn && chung('pcSo')) so.xn = soDoiSo(so.xn, idx + 1);
    e = Object.assign({}, e, {_so: so});
  }
  return [r2, e];
}
const vaiTroDV = b => (b && b.loai === 'doanhnghiep') ? 'Doanh nghiệp' : (b && b.loai === 'nguoiKyVC' && ['Chủ xe', 'Tài xế'].includes(b.vaiTro)) ? b.vaiTro : 'Đơn vị vận chuyển';   // người ký cá nhân từ Đối tác: giữ vai trò đã khai (Chủ xe, Tài xế) để lời văn hợp đồng đúng
/* khóa trạng thái in đợt 2 của BM-09 / BM-10: theo ĐỘI XE (đổi người ký không mất lịch sử in); hồ sơ cũ không có đội xe: theo người ký như trước */
const vcGKey = g => g.hd ? HAKModel.khoaInVC(g.hd) : (g.cccd || g.ten);
const vcGKeyCu = g => g.cccd || g.ten;
function groupsDX(rec) {
  if (rec.hdvc) {   // cấu trúc 2.0: mỗi hợp đồng vận chuyển một nhóm, thứ tự theo xe đầu tiên (như bản cũ gom theo người ký)
    const F = {dx: rec.dx, hdvc: rec.hdvc};
    return HAKModel.hdOrder(F).map(h => {
      const xs = HAKModel.xeOf(F, h); if (!xs.length) return null;
      const sg = HAKModel.signerOf(xs, h.key), r = sg ? sg.r : xs[0], tx = sg ? sg.tx : driverSigns(r), gia = transportPrice(vcInfo(rec, h)).gia;   // người ký của ĐỘI XE
      const base = h.donViId ? Object.assign({}, h.ben || {}, {vaiTro: vaiTroDV(h.ben)})
        : tx ? {cccd: r.cccdTx, ten: r.taiXe, ngaySinh: r.ngaySinhTx, ngayCap: r.ngayCapTx, noiCap: r.noiCapTx, diaChi: r.diaChiTx, vaiTro: 'Tài xế'}
          : {cccd: r.cccd, ten: r.chuXe, ngaySinh: r.ngaySinh, ngayCap: r.ngayCap, noiCap: r.noiCap, diaChi: r.diaChi, vaiTro: 'Chủ xe'};
      return Object.assign(base, {donGia: gia, xe: xs, hd: h});
    }).filter(Boolean);
  }
  const out = [], by = {}, price = transportPrice(rec.info).gia;
  rec.dx.forEach(r => {
    const tx = driverSigns(r), key = signerKey(tx ? r.cccdTx : r.cccd) || (tx ? r.cccdTx : r.cccd);
    if (!by[key]) {
      by[key] = tx
        ? {cccd: r.cccdTx, ten: r.taiXe, ngaySinh: r.ngaySinhTx, ngayCap: r.ngayCapTx, noiCap: r.noiCapTx, diaChi: r.diaChiTx, vaiTro: 'Tài xế', donGia: price, xe: []}
        : {cccd: r.cccd, ten: r.chuXe, ngaySinh: r.ngaySinh, ngayCap: r.ngayCap, noiCap: r.noiCap, diaChi: r.diaChi, vaiTro: 'Chủ xe', donGia: price, xe: []};
      out.push(by[key]);
    }
    by[key].xe.push(r);
  });
  return out;
}
/* Điều kiện dữ liệu cho quy tắc BẢN NHÁP (src/bannhap.js): true = đủ */
function draftCtx(rec) {
  const i = rec.info, ex = expLo(rec);
  const vol = volumeOf(i); let ngc = false; try { ngc = !!payRows(rec, ex).plan.ngc; } catch (e) { /* chưa đủ dữ liệu tính tiền công */ }
  const has = v => !!v && HAKDates.isValid(v);
  const vcm = (i.vanChuyen || {}).mode || 'tanKm';
  return {ngayKy: has(ex.ngayKy), diaChiGiao: !!destOf(rec).text, klThucTe: ngc || !!(vol && vol.src === 'thực tế'), ntNgay: has(ex.ntNgay), pcNgay: has(ex.pcNgay), nguoiMua: !!(ex.ckNhan || buyerName(rec)),
    chamCong: !ngc || HAKChamCong.hasAny(rec.cc),                                  // ngày công: bản chính thức cần chấm công thực tế
    cuLyThuc: vcm !== 'tanKm' || HAKCuLy.eff(i).nguon !== 'tự tính',
    klDoi: (() => { try { return !doiOf(rec).klLoi; } catch (e) { return true; } })()};               // tấn/km: bản chính thức cần quãng đường nhập tay, không dùng đường chim bay
}
const draftList = rec => { const c = draftCtx(rec); return Object.keys(HAKBanNhap.FORMS).map(code => ({code, label: HAKBanNhap.label(code), issues: HAKBanNhap.issues(code, c)})); };
/* Xuất lẻ và xuất theo gói dùng chung: file thiếu điều kiện chính thức của riêng mẫu đó được gắn BẢN NHÁP (tên file + nhãn đầu tài liệu + chân trang).
 * Mẫu trống / chỉ phần số (in hai bước) là mẫu thiết kế để điền sau nên không gắn nhãn. */
function buildFiles(rec, kind) {
  const files = buildFilesRaw(rec, kind);
  const c = draftCtx(rec);
  files.forEach(f => { const code = (f.path.match(/^(\d\d)_/) || [])[1], list = HAKBanNhap.issues(code, c); if (list.length) { f.draft = list; f.path = HAKBanNhap.draftPath(f.path); } });
  return files;
}
/* Thông số xuất của lô + chế độ in: dùng chung cho xuất hồ sơ và cho luồng in đợt 2 */
function exOf(rec, mode) {
  const ex = Object.assign(expLo(rec), {vcDiemDen: destOf(rec).text});   // ngày ký hợp đồng khai ở thông tin chủ rừng làm mặc định
  ex._so = HAKHopDong.numbers(ex);                                                // MỘT quy tắc số hợp đồng cho BM-01, BM-04, BM-09, BM-10, BM-14, BM-20 (src/hopdong.js)
  ex._mode = mode || 'day';
  return ex;
}
/* In đợt 2 (BM-08, BM-09, BM-10, BM-14) ở một chế độ ('day' đầy đủ | 'trong' mẫu nền | 'de' chỉ phần bổ sung) cho các mục có khóa trong keys (không truyền = tất cả).
 * Mỗi file mang key (khóa mục) để lọc và để ghi chữ ký bố cục. Phải gọi khi docMode đã đặt đúng chế độ. */
const dot2Files = (rec, mode, keys) => viNum(() => dot2Files0(rec, mode, keys));
function dot2Files0(rec, mode, keys) {
  const ex = exOf(rec, mode), s = slug(rec.info.ten), IA = HAKInAn2, files = [], used = new Set();
  const want = k => !keys || keys.includes(k), B = doiOf(rec), nXe = groupsDX(rec).length, phXe = g => nXe > 1 ? {loai: 'doiXe', ten: trim(g.ten)} : null;
  const push = f => { let q = f.path, n = 2; while (used.has(q)) q = f.path.replace(/\.docx$/, '_' + n++ + '.docx'); used.add(q); f.path = q; files.push(f); };
  B.doi.forEach((d, di) => { const sr = subRec(rec, B, d), exd = exDoi(ex, B, di), k8 = IA.keyOf('08', B.multi ? d.key : ''), k14 = IA.keyOf('14', B.multi ? d.key : '');
    if (want(k8)) push({key: k8, pham: B.multi ? {loai: 'doi', ten: trim(d.ten)} : null, path: B.multi ? '08_Bang_thanh_toan_tien_cong/' + slug(d.ten) + '.docx' : '08_Bang_thanh_toan_tien_cong_' + s + '.docx', blocks: docTienCong(sr, exd), land: true});
    if (want(k14)) push({key: k14, pham: B.multi ? {loai: 'doi', ten: trim(d.ten)} : null, path: B.multi ? '14_BB_nghiem_thu_thanh_ly/' + slug(d.ten) + '.docx' : '14_BB_nghiem_thu_thanh_ly_' + s + '.docx', blocks: docNghiemThu(sr, exd)}); });
  groupsDX(rec).forEach(g => { const k = IA.keyOf('09', vcGKey(g)); if (want(k)) push({key: k, pham: phXe(g), path: '09_XN_khoi_luong_VC/' + slug(g.ten) + '.docx', blocks: docXNKLVC(rec, ex, g)}); });
  groupsDX(rec).forEach(g => { const k = IA.keyOf('10', vcGKey(g)); if (want(k)) push({key: k, pham: phXe(g), path: '10_TT_tien_VC/' + slug(g.ten) + '.docx', blocks: docTTVC(rec, ex, g)}); });
  return bmDanhDau(rec, files);
}
const buildFilesRaw = (rec, kind) => viNum(() => buildFilesRaw0(rec, kind));
function buildFilesRaw0(rec, kind) {
  const ex = exOf(rec, 'day'); ex._kind = kind;
  const s = slug(rec.info.ten), B = doiOf(rec);
  /* Mỗi đội (mỗi Tổ trưởng) một bộ riêng. Lô một đội: một file như cũ; nhiều đội: thư mục con, mỗi đội một file tên theo đội */
  const perDoi = (dir, base, fn, o) => B.doi.forEach((d, di) => { const sr = subRec(rec, B, d); if (o && o.skip && o.skip(d)) return; files.push(Object.assign({pham: B.multi ? {loai: 'doi', ten: trim(d.ten)} : null, path: B.multi ? dir + '/' + slug(d.ten) + '.docx' : base + '_' + s + '.docx', blocks: fn(sr, exDoi(ex, B, di))}, o && o.land ? {land: true} : {})); });
  const files = [], used = new Set();
  /* Hai người ký trùng tên (khác CCCD) không được ghi đè file của nhau trong ZIP: thêm hậu tố _2, _3… */
  files.push = f => { let q = f.path, k = 2; while (used.has(q)) q = f.path.replace(/\.docx$/, '_' + k++ + '.docx'); used.add(q); f.path = q; return Array.prototype.push.call(files, f); };
  /* In làm HAI ĐỢT khi chưa xong khai thác: 'dau' = hồ sơ làm được ngay (hợp đồng, lao động, vận chuyển, FSC...), 'cuoi' = phần chỉ làm được khi xong rừng (tiền công BM-08, xác nhận khối lượng BM-09, thanh toán vận chuyển BM-10, nghiệm thu BM-14); 'all' = tất cả một lần */
  const PHAN_CUOI = ['tc', 'nttl', 'xnvc', 'ttvc'], dau = kind === 'all' || kind === 'dau';
  const dTT = d => isDirect(infoTeam(rec, d.team));   // đội ký trực tiếp: không có hợp đồng giao khoán, giấy ủy quyền (lô có thể có cả hai loại đội)
  if ((kind === 'gk' || dau) && anyGK(rec)) perDoi('01_HD_Giao_khoan', '01_HD_Giao_khoan', docGiaoKhoan, {skip: dTT});
  if ((kind === 'uq' || (dau && gate(rec).cauTruc.uq)) && anyGK(rec)) perDoi('20_Giay_uy_quyen', '20_Giay_uy_quyen', docUyQuyen, {skip: d => dTT(d) || (B.multi && !d.members.length)});
  if (kind === 'bhld' || dau) files.push({path: '02_BHLD_' + s + '.docx', blocks: docBHLD(rec, ex)});
  if (kind === 'hdld' || dau) {
    hdldList(rec).forEach((cn, i) => {
      const di = B.multi ? B.doi.findIndex(d => d.id === cn.doiId) : -1, sr = di >= 0 ? subRec(rec, B, B.doi[di]) : rec;   // người của đội ký trực tiếp: đơn giá, ngày bắt đầu theo đội của người đó
      files.push({path: '03_HDLD/' + String(i + 1).padStart(2, '0') + '_' + slug(cn.ten) + '.docx', blocks: docHDLD(sr, di >= 0 ? exDoi(ex, B, di) : ex, cn)});
    });
  }
  if (kind === 'hdvc' || dau) {
    { const gs = groupsDX(rec); gs.forEach(g => files.push({pham: gs.length > 1 ? {loai: 'doiXe', ten: trim(g.ten)} : null, path: '04_HDVC/' + slug(g.ten) + '.docx', blocks: docHDVC(rec, ex, g)})); }
  }
  const want = k => (kind === k || kind === 'all' || (kind === 'dau' && !PHAN_CUOI.includes(k)) || (kind === 'cuoi' && PHAN_CUOI.includes(k)));
  const wantPC = k => kind === k || ((kind === 'all' || kind === 'cuoi') && gate(rec).cauTruc.phieuCan);
  if (want('tdcr')) files.push({path: '17_Phieu_tham_dinh_chu_rung_' + s + '.docx', blocks: docThamDinh(rec, ex)});
  if (want('nkkt')) files.push({path: '18_Nhat_ky_khai_thac_' + s + '.docx', blocks: docNhatKy(rec, ex), land: true});
  if (want('fsc')) files.push({path: '19_BB_pho_bien_chinh_sach_FSC_' + s + '.docx', blocks: docPhoBienFSC(rec, ex)});
  if (want('stai')) files.push({path: '15_So_theo_doi_tai_nan_su_co_' + s + '.docx', blocks: docSoTaiNan(rec, ex), land: true});
  if (want('tbi')) files.push({path: '16_BB_kiem_tra_bao_duong_thiet_bi_' + s + '.docx', blocks: docKiemTraThietBi(rec, ex), land: true});
  if (want('nttl')) perDoi('14_BB_nghiem_thu_thanh_ly', '14_BB_nghiem_thu_thanh_ly', docNghiemThu);
  if (want('ckng')) files.push({path: '11_Cam_ket_nguon_goc_' + s + '.docx', blocks: docCamKetNguonGoc(rec, ex)});
  if (want('cklc')) files.push({path: '12_Cam_ket_lao_dong_' + s + '.docx', blocks: docCamKetLaoDong(rec, ex)});
  if (want('kthn')) files.push({path: '13_BB_kiem_tra_hien_truong_' + s + '.docx', blocks: docKiemTraHienTruong(rec, ex), land: true});
  const gpc = groupsPC(rec), nXeAll = groupsDX(rec).length, phPc = g => nXeAll > 1 ? {loai: 'doiXe', ten: trim(g.ten)} : null;   // phạm vi theo số ĐỘI XE của lô (không theo số nhóm có chuyến cân)
  if (wantPC('xnvc')) gpc.forEach(g => files.push({pham: phPc(g), path: '09_XN_khoi_luong_VC/' + slug(g.ten) + '.docx', blocks: docXNKLVC(rec, ex, g)}));
  if (wantPC('ttvc')) gpc.forEach(g => files.push({pham: phPc(g), path: '10_TT_tien_VC/' + slug(g.ten) + '.docx', blocks: docTTVC(rec, ex, g)}));
  if (want('cc')) perDoi('05_Bang_cham_cong', '05_Bang_cham_cong', docChamCong, {land: true});
  if (want('dsd')) perDoi('06_DS_doi_khai_thac', '06_DS_doi_khai_thac', docDSDoi, {land: true});
  if (want('xn')) perDoi('07_XN_dao_tao_ATLD', '07_XN_dao_tao_ATLD', docXNDaoTao, {land: true});
  if (want('tc')) perDoi('08_Bang_thanh_toan_tien_cong', '08_Bang_thanh_toan_tien_cong', docTienCong, {land: true});
  return bmDanhDau(rec, files);
}
