/* ========== In hồ sơ đợt 2: trạng thái "đủ dữ liệu" / "đã in mẫu nền" (src/inan2.js) ========== */
const D2_GO = {ngayKy: {ftab: 'xuat'}, diaChiGiao: {ftab: 'dx'}, klThucTe: {ftab: 'finfo'}, ntNgay: {ftab: 'xuat'}, pcNgay: {ftab: 'xuat'}};
/* Điều kiện CHỮ CỐ ĐỊNH của mẫu nền (phải biết khi in nền vì được in thật lên giấy): ngày ký hợp đồng và điểm đến. Các giá trị còn lại (số biên bản, ngày lập, khối lượng, tiền) để trống dành chỗ. */
const D2_NEN_NEED = {'08': [], '09': ['ngayKy', 'diaChiGiao'], '10': ['ngayKy', 'diaChiGiao'], '14': ['ngayKy']};
const withMode = (m, fn) => { const o = docMode; docMode = m; try { return fn(); } finally { docMode = o; } };
/* chữ ký bố cục của file mẫu nền: băm XML tài liệu ở chế độ nền + khổ giấy, cỡ lề, chân trang */
function d2Layout(f, rec) {
  const o = docOpts(f, rec), blocks = tidySign(f.blocks);
  const stats = {rows: 0, paras: 0, maxLine: 0};
  blocks.forEach(b => { if (b.t === 'tbl') stats.rows += b.rows.length; else if (b.t === 'p') { stats.paras++; stats.maxLine = Math.max(stats.maxLine, String(b.text || '').length); } });
  return HAKInAn2.signature({land: !!o.landscape, tight: !!o.tight, footer: o.footer, xml: withMode('trong', () => bodyXml(blocks)), stats});
}
function d2Items(rec) {
  const g = gate(rec), c = draftCtx(rec), IA = HAKInAn2, items = [];
  const miss = (code, keys) => HAKBanNhap.issues(code, c).filter(x => keys.includes(x.key)).map(x => ({text: x.text, where: x.where, go: D2_GO[x.key] || {ftab: 'xuat'}}));
  const baseNC = g.canBHLD ? [] : [{text: 'chưa đủ thông tin chủ rừng hoặc nhân công: ' + [...g.info, ...g.nc.errs].slice(0, 3).join('; ') + (g.nc.errs.length + g.info.length > 3 ? '…' : ''), where: 'Thông tin rừng / Nhân công', go: {ftab: g.info.length ? 'finfo' : 'nc'}}];
  const baseVC = g.canHDVC ? [] : [{text: 'chưa đủ thông tin chủ rừng, đội xe hoặc đơn giá vận chuyển: ' + [...g.info, ...g.dx.errs, ...g.vc].slice(0, 3).join('; '), where: 'Vận chuyển', go: {ftab: g.info.length ? 'finfo' : 'dx'}}];
  const mk = (code, gkey, label, nen, full) => items.push({key: IA.keyOf(code, gkey), code, gkey: gkey || '', label, nenMissing: nen, fullMissing: [...nen, ...full], sig: '', info: null});
  const BD = doiOf(rec), dk = d => BD.multi ? d.key : '', dl = d => BD.multi ? ' · ' + doiLabel(d) : '';
  BD.doi.forEach(d => mk('08', dk(d), FORMS_D2['08'] + dl(d), baseNC.concat(miss('08', D2_NEN_NEED['08'])), miss('08', HAKBanNhap.FORMS['08'].need.filter(k => !D2_NEN_NEED['08'].includes(k)))));
  groupsDX(rec).forEach(gr => { const n = tripsOf(rec, gr).length, k = gr.cccd || gr.ten;
    const pcMiss = !n ? [{text: 'chưa có phiếu cân hợp lệ của ' + gr.ten, where: 'Vận chuyển → Phiếu cân', go: {ftab: 'dx'}}] : g.pc && g.pc.errs.length ? [{text: 'phiếu cân còn lỗi (' + g.pc.errs.length + ')', where: 'Vận chuyển → Phiếu cân', go: {ftab: 'dx'}}] : [];
    ['09', '10'].forEach(code => mk(code, k, FORMS_D2[code] + ' · ' + d2GroupLabel(rec, gr), baseVC.concat(miss(code, D2_NEN_NEED[code])), pcMiss.concat(miss(code, HAKBanNhap.FORMS[code].need.filter(x => !D2_NEN_NEED[code].includes(x)))))); });
  BD.doi.forEach(d => mk('14', dk(d), FORMS_D2['14'] + dl(d), baseNC.concat(miss('14', D2_NEN_NEED['14'])), miss('14', HAKBanNhap.FORMS['14'].need.filter(k => !D2_NEN_NEED['14'].includes(k)))));
  items.sort((a, b) => IA.ORDER.indexOf(a.code) - IA.ORDER.indexOf(b.code));
  // chữ ký bố cục từ chính file mẫu nền sẽ in (chỉ khi dựng được mẫu)
  try {
    withMode('trong', () => dot2Files(rec, 'trong', null)).forEach(f => { const it = items.find(x => x.key === f.key); if (it) { const L = d2Layout(f, rec); it.sig = L.sig; it.info = L.info; it.file = f.path; it.land = !!f.land; } });
  } catch (e) { items.forEach(it => { if (!it.sig) it.nenMissing = it.nenMissing.concat([{text: 'không dựng được mẫu nền (' + e.message + ')', where: '', go: {ftab: 'finfo'}}]); it.fullMissing = it.fullMissing.concat(it.nenMissing.slice(-1)); }); }
  return items;
}
const FORMS_D2 = Object.fromEntries(Object.entries(HAKInAn2.FORMS).map(([k, v]) => [k, v.label]));
function d2Eval(rec, f) {
  const st = HAKInAn2.peek(f || curForest()), list = d2Items(rec).map(it => HAKInAn2.evaluate(it, st));
  return {list, plan: HAKInAn2.plan(list), absent: HAKInAn2.coverage(list), state: st};
}
const D2_PKG = {trang: ['dot2_IN_GIAY_TRANG', '', 'In đầy đủ đợt 2 – giấy trắng'], nen: ['dot2_MAU_NEN_in_truoc', '_MAU_NEN', 'Mẫu nền đợt 2'], de: ['dot2_IN_DE_phan_bo_sung', '_IN_DE', 'Phần bổ sung in đè đợt 2']};
/* Tải mẫu nền / phần in đè / bản đầy đủ giấy trắng cho các mục keys. KHÔNG đổi trạng thái đã in nền. Nền và in đè không bao giờ gắn BẢN NHÁP. */
async function exportDot2(mode, keys) {
  if (stBlockNote()) return;
  const rec = curRec(); if (!rec || !keys || !keys.length) return;
  const docM = {trang: 'day', nen: 'trong', de: 'de'}[mode], P_ = D2_PKG[mode];
  docMode = docM;
  try {
    const files = dot2Files(rec, docM, keys);
    if (!files.length) { note('Không có mẫu nào để tải.', 'warn'); return; }
    const nm = f => f.path.split('/').pop().replace(/\.docx$/, P_[1] + '.docx');
    if (files.length === 1) { download(await makeDocx(files[0].blocks, docOpts(files[0], rec)), nm(files[0])); return; }
    const z = new JSZip();
    for (const f of files) { const q = f.path.split('/'); z.file(q.length > 1 ? q[0] + '/' + nm(f) : nm(f), await makeDocx(f.blocks, docOpts(f, rec))); }
    download(await z.generateAsync({type: 'blob'}), 'HoSo_' + slug(rec.info.ten) + '_' + P_[0] + '.zip');
  } finally { docMode = 'day'; }
}
function d2Confirm(keys, legacy) {
  const f = curForest(), rec = curRec(); if (!f || !rec) return;
  const st = HAKInAn2.stateOf(f), now = new Date().toISOString(), all = d2Items(rec);
  keys.forEach(k => { const it = all.find(x => x.key === k); if (it && it.nenMissing.length === 0) (legacy ? HAKInAn2.confirmLegacy : HAKInAn2.confirm)(st, it, now); });
  persist();
}
const DOC_CODES = {'17': 'BM-17 · Phiếu thẩm định chủ rừng và rừng', '18': 'BM-18 · Nhật ký khai thác hằng ngày', '19': 'BM-19 · Biên bản phổ biến chính sách FSC', '15': 'BM-15 · Sổ theo dõi tai nạn lao động, sự cố', '16': 'BM-16 · Biên bản kiểm tra, bảo dưỡng thiết bị', '14': 'BM-14 · Biên bản nghiệm thu, thanh lý khai thác', '11': 'BM-11 · Cam kết nguồn gốc gỗ rừng trồng', '12': 'BM-12 · Cam kết sử dụng lao động', '13': 'BM-13 · Biên bản kiểm tra hiện trường khai thác', '09': 'BM-09 · Biên bản xác nhận khối lượng vận chuyển', '10': 'BM-10 · Bảng thanh toán tiền vận chuyển', '01': 'BM-01 · Hợp đồng khai thác (giao khoán)', '02': 'BM-02 · Danh sách cấp phát BHLĐ', '03': 'BM-03 · Hợp đồng lao động',
  '04': 'BM-04 · Hợp đồng vận chuyển', '05': 'BM-05 · Bảng chấm công', '06': 'BM-06 · Danh sách đội khai thác',
  '07': 'BM-07 · Biên bản đào tạo ATLĐ', '08': 'BM-08 · Bảng thanh toán tiền công', '20': 'BM-20 · Giấy ủy quyền của người lao động cho tổ trưởng'};
const docOpts = (f, rec) => ({landscape: f.land, tight: !!(f.blocks && f.blocks.tight), draft: f.draft || null,
  footer: (DOC_CODES[(f.path.match(/^(\d\d)_/) || [])[1]] || '') + ' · Rừng ' + (rec.info.maRung || '') + ' · Phiên bản 1.0' + (f.draft ? ' · BẢN NHÁP' : '')});
function docTienCong(rec, ex) {
  const rs = rec.info, tt = rec.nc.find(isTT);
  const pr = payRows(rec, ex), plan = pr.plan, ngc = plan.ngc, ha = plan.basis === 'ha', N = pr.N, each = pr.each, sum = pr.sum, bs = basisOf(rs);
  const rows = pr.rows.map((x, i) => [String(i + 1), upper(x.r.ten), x.r.chucDanh, V((!ngc && each != null) ? fmtTan(each) : ''), x.rate ? fmt(x.rate) : '',
    V(ngc && x.cong != null ? fmtCong(x.cong) : ''), V(x.tien != null ? fmt(x.tien) : ''), V(x.tien != null ? fmt(x.tien) : ''), '']);
  if (sum > 0 || ex._mode !== 'day') rows.push(['', '**TỔNG CỘNG**', '', '', '', '', V(sum > 0 ? fmt(sum) : ''), V(sum > 0 ? fmt(sum) : ''), '']);
  const khoanNgay = ngc && !isDirect(rs);   // giao khoán trả theo ngày công: Tổ trưởng nhận thay cả tổ
  const nRow = rows.length + (khoanSuyRa(rec) || khoanNgay ? 3 : 0), dense = nRow <= 6 ? {sz: 20, rowH: 420, pad: 40, sign: 3} : nRow <= 7 ? {sz: 20, rowH: 380, pad: 30, sign: 3} : nRow <= 9 ? {sz: 20, rowH: 340, pad: 20, sign: 2} : nRow <= 13 ? {sz: 18, rowH: 300, pad: 10, sign: 2} : nRow <= 17 ? {sz: 16, rowH: 250, pad: 0, sign: 2, tight: true} : {sz: 16, rowH: 215, pad: 0, sign: 1, tight: true};
  const info = ngc
    ? ((plan.cong != null || ex._mode !== 'day') ? 'Số ngày công: ' + V(plan.cong != null ? String(plan.cong) : '', 6) + ' công (không tính Chủ nhật).' : '')
    : ((plan.vol || ex._mode !== 'day') ? (ha ? 'Diện tích khai thác: ' : 'Khối lượng khai thác: ') + V(plan.vol ? fmtTan(plan.vol.v) : '', 10) + ' ' + bs.qty + (ex._mode === 'day' ? V(plan.vol ? ' (' + plan.vol.src + ')' : '', 0, '') : '') + ', chia đều ' + N + ' người: ' + V(each != null ? fmtTan(each) : '', 10) + ' ' + bs.qty + '/người.' : '');
  const out = [
    P('**BẢNG THANH TOÁN TIỀN NHÂN CÔNG KHAI THÁC RỪNG ' + upper(personName(rs.danhXung, rs.ten)) + '**', {al: 'center', sz: 26, before: 60, after: 40}),
    P('(Địa chỉ: ' + rs.diaDiem + ')', {al: 'center', after: 60}),
    P(VP(tuDen(plan.tu, plan.den, ex).replace(/^từ/, 'Từ'), 'Từ ngày 00/00/0000 đến ngày 00/00/0000'), {al: 'center', after: info ? 40 : 160}),
    ...(info ? [P(info, {al: 'center', after: 160})] : []),
    T([640, 3360, 2000, 1400, 1600, 900, 1600, 1700, 1937],   // cột họ tên rộng để tên dài không xuống dòng
      [['STT', 'Họ và tên', 'Chức danh công việc', ngc ? 'Số lượng khai thác' : ha ? 'Diện tích chia đều (ha)' : 'Sản lượng chia đều (tấn)', 'Đơn giá (' + bs.unit + ')', {v: 'Tiền công', span: 2}, 'Thực nhận (đồng)', 'Ký nhận'],
       ['', '', '', '', '', 'Số công', 'Số tiền', '', ''], ...rows],
      {headRows: 2, borders: true, sz: dense.sz, rowH: dense.rowH, pad: dense.pad,   // nhiều người: thu nhỏ cỡ chữ và độ cao hàng để bảng và khối ký vẫn nằm trọn một trang
       alignCols: ['center', 'left', 'left', 'center', 'right', 'center', 'right', 'right', 'center']}),
    ...(!khoanSuyRa(rec) ? [] : [P('Hình thức giao khoán: đơn giá khoán của tổ ' + khoanSuyRa(rec).price + ' ' + bs.unit + ' (tổng số người × đơn giá vị trí ÷ ' + N + ' người) × ' + (ha ? 'diện tích' : 'sản lượng') + ' = tổng tiền từng người cộng lại. Tổ trưởng ' + upper(tt.ten) + ' nhận thay cho cả tổ tổng số tiền ' + V(sum > 0 ? fmt(sum) : '', 12) + ' đồng (bằng chữ: ' + V(sum > 0 ? moneyWords(sum) : '', 0, '…'.repeat(40)) + ') và chi trả lại cho từng người theo cột “Thực nhận”.', {al: 'left', sz: dense.sz, before: 80, after: 0})]),
    ...(!khoanNgay ? [] : [P('Hình thức giao khoán, trả theo ngày công: tiền của từng người = số công thực tế × đơn giá công theo chức danh. Tổ trưởng ' + upper(tt.ten) + ' nhận thay cho cả tổ tổng số tiền ' + V(sum > 0 ? fmt(sum) : '', 12) + ' đồng (bằng chữ: ' + V(sum > 0 ? moneyWords(sum) : '', 0, '…'.repeat(40)) + ') và chi trả lại cho từng người theo cột “Thực nhận”.', {al: 'left', sz: dense.sz, before: 80, after: 0})]),
    ...footerSign('Đại diện Tổ khai thác', tt.ten, dense.sign)
  ];
  if (dense.tight) out.tight = true;   // nhiều người: lề trên/dưới hẹp hơn để vẫn gọn một trang
  return out;
}
/* BM-20 Giấy ủy quyền: MỘT giấy, toàn bộ công nhân cùng ký, ủy quyền cho Tổ trưởng (hình thức giao khoán).
   Căn cứ: Bộ luật Dân sự 2015 (đại diện theo ủy quyền, hợp đồng ủy quyền) và Điều 18 Bộ luật Lao động 2019 (nhóm người lao động ủy quyền cho một người trong nhóm;
   kèm danh sách họ tên, ngày sinh, giới tính, nơi cư trú, chữ ký từng người; người được ủy quyền không được ủy quyền lại). Mẫu do phần mềm soạn, cần đối chiếu pháp lý. */
function docUyQuyen(rec, ex) {
  const rs = rec.info, tt = rec.nc.find(isTT), ttName = personName(tt.danhXung, tt.ten), rsName = personName(rs.danhXung, rs.ten), cn = ucList(rec);
  const gt = r => r.danhXung === 'Bà' ? 'Nữ' : r.danhXung === 'Ông' ? 'Nam' : '…';
  const rows = cn.map((r, i) => [String(i + 1), upper(personName(r.danhXung, r.ten)), r.ngaySinh || '…', gt(r), r.cccd || '…', r.diaChi || '…', r.chucDanh || '', '']);
  return [
    ...TITLE_HEAD(),
    P('**GIẤY ỦY QUYỀN**', {al: 'center', sz: 28, before: 120, after: 60}),
    P('Số: ' + ex._so.uq.so, {al: 'center', after: 0}),
    P('(V/v: Ủy quyền giao kết và thực hiện hợp đồng khai thác gỗ keo rừng trồng)', {al: 'center', i: true, after: 200}),
    P(LAW_BLDS),
    P('- Căn cứ Bộ luật Lao động số 45/2019/QH14 ngày 20/11/2019 của Quốc hội, quy định về người giao kết hợp đồng lao động (Điều 18);'),
    P('- Căn cứ Hợp đồng khai thác gỗ keo số ' + ex._so.kt.so + ' giữa ' + upper(rsName) + ' (chủ rừng) và ' + upper(ttName) + ' (tổ trưởng).'),
    P('Hôm nay, ' + ngayLine({ngayKy: ex.uqNgay || ex.ngayKy}) + ' tại ' + (rs.diaDiem || '…………') + ', chúng tôi gồm có:', {after: 160}),
    P('**BÊN ỦY QUYỀN (BÊN A):** các người lao động có tên, ngày tháng năm sinh, giới tính, nơi cư trú và chữ ký trong **Danh sách người ủy quyền** kèm theo Giấy này (' + cn.length + ' người), là nhóm người lao động từ đủ 18 tuổi trở lên cùng làm việc khai thác gỗ keo tại ' + (rs.diaDiem || '…………') + rungText(rs) + '.', {after: 120}),
    ...partyBlock('BÊN ĐƯỢC ỦY QUYỀN (BÊN B) — TỔ TRƯỞNG', tt, ttName),
    P('Hai bên thống nhất lập Giấy ủy quyền với các nội dung sau:'),
    P('**Điều 1: Phạm vi ủy quyền**', {keep: true}),
    P('Bên A ủy quyền cho Bên B, trong phạm vi công việc khai thác gỗ keo nêu trên:', {after: 60}),
    bl('Thay mặt Bên A giao kết, thực hiện và thanh lý Hợp đồng khai thác gỗ keo với chủ rừng; tổ chức, điều hành công việc khai thác của tổ.'),
    bl('Nhận tiền thanh toán theo hợp đồng và chi trả cho từng người lao động đúng theo Bảng thanh toán tiền công (' + (rs.hinhThucLuong === 'ngaycong' ? 'số công thực tế, đơn giá công theo vai trò' : 'sản lượng chia đều, đơn giá theo vai trò') + ') có chữ ký nhận của từng người.'),
    bl('Làm việc với chủ rừng về tiến độ, khối lượng và nghiệm thu.'),
    P('Bên B không được ủy quyền lại cho người khác; không được thay đổi đơn giá, thu nhập hay quyền lợi của người lao động khi chưa có thỏa thuận bằng văn bản của người lao động đó.'),
    P('**Điều 2: Thời hạn ủy quyền**', {keep: true}),
    P('Từ ngày ' + (rs.tuNgay || '…/…/……') + ' ' + (rs.denNgay ? 'đến ngày ' + rs.denNgay : 'đến khi nghiệm thu, thanh lý và thanh toán xong hợp đồng khai thác') + ', hoặc đến khi chấm dứt ủy quyền theo thỏa thuận hoặc theo quy định của pháp luật.'),
    P('**Điều 3: Thù lao và trách nhiệm**', {keep: true}),
    ...(khoanSuyRa(rec) ? (kh => [bl('Đơn giá ký: Bên B ký hợp đồng khai thác với chủ rừng theo **đơn giá khoán bình quân của tổ ' + kh.price + ' ' + kh.bs.unit + '**, tính bằng tổng (số người × đơn giá vị trí) chia tổng số người của tổ (kể cả Bên B) = ' + kh.formula + '. Đơn giá từng vị trí: ' + kh.pos.map(x => x.cd + ' ' + (x.rate ? fmt(x.rate) : '………') + (x.n ? ' (' + x.n + ' người)' : ' (chưa có người)')).join('; ') + '. Tổng giá trị khoán bằng tổng tiền thanh toán cho ' + kh.k.N + ' người; Bên B chi trả cho từng người đúng đơn giá vị trí của người đó.')])(khoanSuyRa(rec)) : []),
    bl('Thù lao ủy quyền: ' + (ex.uqThuLao || 'Không có thù lao riêng; Bên B hưởng tiền theo vai trò của mình trong Bảng thanh toán tiền công.')),
    bl('Bên B chịu trách nhiệm thực hiện đúng phạm vi ủy quyền, thanh toán đầy đủ, đúng hạn cho từng người lao động và báo cáo khi Bên A yêu cầu.'),
    bl('Bên A xác nhận đủ 18 tuổi, tự nguyện ủy quyền, đã đọc và đồng ý nội dung hợp đồng khai thác; Bên A có quyền yêu cầu Bên B báo cáo và có quyền chấm dứt ủy quyền, thông báo cho Bên B và chủ rừng.'),
    P('**Điều 4: Điều khoản chung**', {keep: true}),
    bl('Giấy ủy quyền có hiệu lực kể từ ngày ký, được lập thành các bản có giá trị như nhau: Bên B giữ 01 bản, chủ rừng giữ 01 bản; mỗi người lao động có quyền được cấp bản sao.'),
    bl('Mọi tranh chấp được giải quyết bằng thương lượng; nếu không thỏa thuận được thì đưa ra cơ quan có thẩm quyền theo quy định của pháp luật.'),
    P('', {after: 100}),
    signTable(['BÊN ĐƯỢC ỦY QUYỀN (TỔ TRƯỞNG)', '(Ký, ghi rõ họ tên)', ttName], ['CHỦ RỪNG (xác nhận đã nhận Giấy ủy quyền)', '(Ký, ghi rõ họ tên)', rsName]),
    {t: 'br'},
    P('**DANH SÁCH NGƯỜI LAO ĐỘNG ỦY QUYỀN**', {al: 'center', sz: 26, before: 60, after: 40}),
    P('(Kèm theo Giấy ủy quyền số ' + ex._so.uq.so + ' · Mỗi người tự ký tên)', {al: 'center', i: true, after: 120}),
    T([480, 1700, 1000, 620, 1300, 1850, 1055, 1350],
      [['STT', 'Họ và tên', 'Ngày sinh', 'Giới tính', 'Số CCCD', 'Nơi cư trú', 'Chức danh', 'Chữ ký'], ...rows],
      {head: true, borders: true, sz: 17, rowH: 760, alignCols: ['center', 'left', 'center', 'center', 'center', 'left', 'left', 'center']})
  ];
}
/* Cảnh báo theo từng trường hợp sau khi tải: mục nào CHƯA đủ dữ liệu thì biểu mẫu tương ứng thiếu hoặc còn chấm; hồ sơ đủ thì không có cảnh báo */
function exportNotes(rec, g, kind) {
  const n = [], i = rec.info, ex = Object.assign({}, rec.exp || {}); if (!ex.ngayKy && i.ngayKyHopDong) ex.ngayKy = i.ngayKyHopDong;
  const tail = kind === 'all' || kind === 'cuoi', head = kind === 'all' || kind === 'dau', vol = volumeOf(i);
  if (tail) {
    if (!g.canPC) n.push('BM-09 (xác nhận khối lượng) và BM-10 (thanh toán vận chuyển) KHÔNG có trong file vì chưa đủ phiếu cân hợp lệ (nạp phiếu cân ở tab Vận chuyển, xem mục “Phiếu cân” ở tab Kiểm tra trước khi xuất).');
    if (!vol) n.push('BM-08 và BM-14 chưa có khối lượng khai thác: nhập diện tích, định mức hoặc khối lượng thực tế ở Thông tin rừng.');
    else if (vol.src === 'dự kiến') n.push('BM-08 và BM-14 đang tính theo SẢN LƯỢNG DỰ KIẾN (' + fmtTan(vol.v) + ' tấn) vì chưa nhập khối lượng khai thác thực tế; nếu khai thác xong thì nhập khối lượng thực tế rồi tải lại.');
    if (!ex.ntNgay) n.push('BM-14: chưa nhập ngày lập biên bản nghiệm thu (ô “Nghiệm thu, thanh lý: ngày lập”), ngày và năm trong số biên bản để trống.');
    if (g.canPC && !ex.pcNgay) n.push('BM-09, BM-10: chưa nhập ngày lập biên bản xác nhận khối lượng, ngày và năm trong số biên bản để trống.');
  }
  if (head && !ex.ckNhan && !buyerName(rec)) n.push('BM-11 (cam kết nguồn gốc): dòng “Kính gửi” để chấm vì chưa khai Công ty mua hàng (Cài đặt → Công ty) và chưa nhập “đơn vị nhận”.');
  if (head && !destOf(rec).text) n.push('BM-04, BM-09, BM-10: chưa chọn địa chỉ giao hàng nên dòng điểm đến để chấm (tab Vận chuyển → Chọn địa chỉ giao hàng).');
  if (head) { const cb = HAKHopDong.canBoSung(ex).filter(c => /BM-01|BM-04/.test(c.label)); if (cb.length) n.push('Số hợp đồng chưa có năm (' + cb.map(c => c.label.replace(/ \(.*\)/, '')).join('; ') + '): nhập “Ngày ký hợp đồng”.'); }
  return n;
}
/* Điều kiện đủ dữ liệu để xuất từng mẫu (dùng chung cho nút tải và bảng Quy trình hồ sơ) */
const kindOk = g => ({gk: g.canGK, bhld: g.canPhat, hdld: g.canHDLD, uq: g.canUQ, hdvc: g.canHDVC, nttl: g.canBHLD, tdcr: !g.info.length, nkkt: g.canBHLD, fsc: g.canBHLD, stai: g.canBHLD, tbi: g.canBHLD, ckng: !g.info.length, cklc: g.canBHLD, kthn: g.canBHLD, xnvc: g.canPC, ttvc: g.canPC, cc: g.canBHLD, dsd: g.canBHLD, xn: g.canBHLD, tc: g.canBHLD, all: (g.direct ? g.canHDLD : g.canGK) && g.canHDVC && !g.normErrs.length, dau: (g.direct ? g.canHDLD : g.canGK) && g.canHDVC && !g.normErrs.length, cuoi: g.canBHLD});
/* Tải toàn bộ / Đợt 2 khi đã có tờ nền đợt 2 in sẵn: hỏi dùng phần in đè hay in lại đầy đủ trên giấy trắng, và tách gói để không nạp nhầm giấy */
const ALLQ_TXT = {de: 'Đủ dữ liệu: in đè phần bổ sung', kiemtra: 'Nền in từ trước: đối chiếu rồi in đè', cho: 'Chờ đủ dữ liệu để in đè', doibocuc: 'Bố cục đã đổi: phải in lại', trang: 'Chưa in nền', nen: 'Chưa in nền', thieu: 'Chưa đủ dữ liệu'};
function exportAllAsk(kind, printed, E) {
  const list = E.list, canDe = list.filter(x => x.printed && (x.advice === 'de' || x.advice === 'kiemtra')), full = list.filter(x => !canDe.includes(x) && x.fullReady);
  $('#stBody').innerHTML = '<div class="gh"><h2>Có tờ nền đợt 2 đã in</h2><button class="btn ghost sm" data-act="stClose">✕ Đóng</button></div>' +
    '<p class="mut" style="margin:0 0 8px">Các mẫu dưới đây đã được xác nhận in nền. Chọn cách xuất để dùng đúng loại giấy; hai loại giấy được tách thành hai gói riêng, có tên khác nhau.</p>' +
    '<div class="wrap"><table><thead><tr><th>Biểu mẫu / bộ vận chuyển</th><th>Đã in nền</th><th>Tình trạng</th><th>Sẽ xuất</th></tr></thead><tbody>' + list.map(x => '<tr data-allq="' + esc(x.key) + '"><td><b>' + esc(x.label) + '</b></td><td>' + (x.printed ? 'Đã in' : '—') + '</td><td>' + esc(ALLQ_TXT[x.advice] || '') + '</td><td>' + (canDe.includes(x) ? 'Phần in đè' : full.includes(x) ? 'Đầy đủ, giấy trắng' : '<span class="mut">chưa xuất được</span>') + '</td></tr>').join('') + '</tbody></table></div>' +
    '<div class="row" style="gap:8px;flex-wrap:wrap;margin-top:12px"><button class="btn" id="allqDe"' + (canDe.length ? '' : ' disabled') + '>Theo tờ đã in: in đè ' + canDe.length + ' mẫu' + (full.length ? ', giấy trắng ' + full.length + ' mẫu' : '') + (kind === 'all' ? ' (kèm hồ sơ đợt 1)' : '') + '</button>' +
    '<button class="btn ghost" id="allqFull">In lại đầy đủ đợt 2 trên giấy trắng</button><button class="btn ghost" id="allqCancel">Hủy</button></div>';
  $('#stBox').classList.add('on');
  $('#allqCancel').onclick = () => $('#stBox').classList.remove('on');
  $('#allqFull').onclick = async () => { $('#stBox').classList.remove('on'); await exportKind(kind, null, {full: true}); };
  $('#allqDe').onclick = async () => {
    if (list.some(x => x.advice === 'kiemtra') && !confirm('Có mẫu nền in từ trước khi có chức năng này: chưa biết bố cục tờ nền. Đã đối chiếu tờ nền với mẫu hiện tại (khổ giấy, hướng, lề, chữ cố định, số dòng) chưa?')) return;
    $('#stBox').classList.remove('on');
    if (kind === 'all') await exportKind('dau', null, {full: true});
    if (canDe.length) await exportDot2('de', canDe.map(x => x.key));
    if (full.length) await exportDot2('trang', full.map(x => x.key));
  };
}
async function exportKind(kind, idx, opt) {
  const rec = curRec();
  if (!rec) return;
  if (stBlockNote()) return;
  if ((kind === 'all' || kind === 'cuoi') && !(opt && opt.full)) { const E = d2Eval(rec), pr = E.list.filter(x => x.printed); if (pr.length) return exportAllAsk(kind, pr, E); }
  const g = gate(rec);
  const ok = kindOk(g)[kind];
  if (!ok) { note('Hồ sơ còn lỗi hoặc thiếu dữ liệu, chưa xuất. Xem tab Xuất hồ sơ.', 'err'); return; }
  docMode = 'day';
  try {
    const files = buildFiles(rec, kind);
    const pick = idx != null ? files.filter((f, i) => i === idx) : files;
    if (pick.length === 1) {
      const f = pick[0];
      download(await makeDocx(f.blocks, docOpts(f, rec)), f.path.split('/').pop());
      if (f.draft) note('Đã tải BẢN NHÁP (tên file và đầu tài liệu có nhãn “BẢN NHÁP”): ' + f.draft.map(x => x.text + ' → ' + x.where).join('; ') + '. Bổ sung rồi tải lại để có bản chính thức.', 'warn');
      return;
    }
    const z = new JSZip();
    for (const f of pick) z.file(f.path, await makeDocx(f.blocks, docOpts(f, rec)));
    const blob = await z.generateAsync({type: 'blob'});
    download(blob, 'HoSo_' + slug(rec.info.ten) + '_' + ({dau: 'dot1_truoc_khi_xong_rung', cuoi: 'dot2_sau_khi_xong_rung'}[kind] || kind) + (pick.some(f => f.draft) ? '_BAN_NHAP' : '') + '.zip');
    if (['all', 'dau', 'cuoi'].includes(kind)) { const nt = exportNotes(rec, g, kind); const dr = pick.filter(f => f.draft); if (dr.length) nt.unshift('Các biểu mẫu mang nhãn BẢN NHÁP (tên file, đầu tài liệu và tên gói): ' + dr.map(f => (HAKBanNhap.label((f.path.match(/(?:^|\/)(\d\d)_/) || [])[1]) || f.path).replace(/ .*/, '') + ' (' + f.draft.map(x => x.text).join('; ') + ')').join(' · ') + '.'); if (nt.length) note('Đã tải file nhưng còn ' + nt.length + ' lưu ý:\n• ' + nt.join('\n• '), 'warn'); else note('Đã tải file: dữ liệu đủ, không có lưu ý.', 'ok'); }
  } finally { docMode = 'day'; }
}

