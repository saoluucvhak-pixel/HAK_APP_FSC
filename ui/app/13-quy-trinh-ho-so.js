/* ========== Quy trình hồ sơ theo đợt (src/quytrinh.js): trạng thái dữ liệu, in ấn và phát hiện dữ liệu đổi sau khi in ========== */
const QT_DATA = {du: ['ok', 'Đủ dữ liệu'], nhap: ['warn', 'Bản nháp'], thieu: ['err', 'Chưa đủ']};
const QT_IN = {chua: ['', 'Chưa in'], da: ['ok', 'Đã in, còn khớp'], doi: ['err', 'Đã in nhưng dữ liệu đã đổi: in lại']};
/* chữ ký nội dung của một mẫu: băm các file sẽ in (phần thân, chân trang, nhãn BẢN NHÁP) — đổi dữ liệu thì đổi chữ ký */
function qtSig(rec, kind) {
  const files = buildFiles(rec, kind), IA = HAKInAn2; let acc = '';
  files.forEach(f => { const o = docOpts(f, rec); acc += f.path + '\u0001' + o.footer + '\u0001' + (o.landscape ? 'L' : 'P') + '\u0001' + (f.draft ? 'N' : '') + '\u0001' + withMode('day', () => bodyXml(tidySign(f.blocks))) + '\u0002'; });
  return IA.hash(acc);
}
function qtItems(rec) {
  const g = gate(rec), ok = kindOk(g), c = draftCtx(rec), Q = HAKQuyTrinh;
  return Q.applicable(isDirect(rec.info) ? 'tructiep' : 'giaokhoan').map(f => {
    const iss = HAKBanNhap.issues(f.code, c), ready = !ok[f.kind] ? 'thieu' : iss.length ? 'nhap' : 'du';
    let sig = ''; if (ok[f.kind]) { try { sig = qtSig(rec, f.kind); } catch (e) { sig = 'loi:' + e.message; } }
    return {code: f.code, ready, sig, why: iss.map(x => x.text).join('; ')};
  });
}
function qtEval(rec, f) { const L = HAKQuyTrinh.evaluate(qtItems(rec), HAKQuyTrinh.peek(f || curForest())); return {list: L, sum: HAKQuyTrinh.summary(L)}; }
function qtPrep(rec) {
  const g = gate(rec), miss = [];
  if (!(theCompany() || {}).ten) miss.push('chưa khai Công ty mua hàng (Cài đặt → Công ty)');
  if (g.info.length) miss.push('thông tin chủ rừng, rừng còn thiếu hoặc lỗi (' + g.info.length + ' mục)');
  if (g.normErrs.length) miss.push('định mức BHLĐ chưa đủ');
  return miss;
}
function qtPanel(rec) {
  const {list, sum} = qtEval(rec), Q = HAKQuyTrinh, prep = qtPrep(rec), E2 = d2Eval(rec);
  const c2 = a => E2.list.filter(x => x.advice === a).length;
  const d2 = {nenReady: E2.list.filter(x => x.nenReady).length, nenPrinted: E2.list.filter(x => x.printed).length, deReady: c2('de') + c2('kiemtra'), cho: c2('cho'), doibocuc: c2('doibocuc'), trang: c2('trang')};
  const nx = Q.next(sum, {chuaChuanBi: prep.join('; '), coPhieuCan: (rec.pc || []).length > 0, d2});
  const stepCls = (done, cur) => done ? 'ok' : cur ? 'warn' : '';
  const d1 = sum.dot1, dd2 = sum.dot2;
  const steps = [['chuanbi', '1. Chuẩn bị', prep.length ? prep.length + ' việc còn thiếu' : 'Đủ'], ['dot1', '2. In đợt 1', d1.xong ? 'Xong' : d1.daIn + '/' + d1.total + ' đã in'], ['khaithac', '3. Khai thác, cân', (rec.pc || []).length ? (rec.pc.length + ' phiếu cân') : 'Chờ phiếu cân'],
    ['dot2', '4. In đợt 2: giấy trắng hoặc nền + in đè', dd2.xong ? 'Xong' : dd2.daIn + '/' + dd2.total + ' đã in · ' + Q.d2Text(d2)], ['xong', '5. Hoàn tất', nx.step === 'xong' ? 'Đã khớp' : 'Chưa']];
  const cur = nx.step, order = ['chuanbi', 'dot1', 'khaithac', 'dot2', 'xong'];
  const tbl = dot => '<table class="qtTbl" id="qtDot' + dot + '"><thead><tr><th>Mẫu</th><th>Dữ liệu</th>' + (dot === 2 ? '<th>Hướng in đợt 2</th>' : '') + '<th>In ấn</th><th><span class="sro">Thao tác</span></th></tr></thead><tbody>' + list.filter(x => x.form.dot === dot).map(x => {
    const dd = QT_DATA[x.ready], ii = QT_IN[x.printed], rt = dot === 2 ? Q.route(E2.list.filter(y => y.code === x.code)) : null;
    return '<tr data-qt="' + x.code + '" data-ready="' + x.ready + '" data-printed="' + x.printed + '"' + (rt ? ' data-route="' + rt.key + '"' : '') + '><td><b>BM-' + x.code + '</b> ' + esc(x.form.name) + '</td><td class="' + dd[0] + '" title="' + esc(x.why || '') + '">' + dd[1] + (x.ready === 'nhap' && x.why ? ' <span class="mut">(' + esc(x.why.slice(0, 60)) + (x.why.length > 60 ? '…' : '') + ')</span>' : '') + '</td>' +
      (rt ? '<td class="' + rt.cls + '">' + esc(rt.text) + '</td>' : '') + '<td class="' + ii[0] + '">' + ii[1] + (x.at ? ' <span class="mut">' + esc(x.at.slice(0, 10).split('-').reverse().join('/')) + '</span>' : '') + '</td><td class="d2act">' +
      (x.ready !== 'thieu' ? '<button class="btn sm ghost" data-act="qtMark" data-codes="' + x.code + '"' + (x.printed === 'da' ? ' disabled' : '') + ' title="' + (dot === 2 ? 'Bấm sau khi in xong (in đè hoặc giấy trắng)' : 'Bấm sau khi in') + '">' + (dot === 2 ? 'Đã in xong' : 'Đánh dấu đã in') + '</button>' : '') + (x.printed !== 'chua' ? ' <button class="btn sm ghost" data-act="qtUnmark" data-codes="' + x.code + '">Bỏ</button>' : '') + '</td></tr>'; }).join('') + '</tbody></table>';
  const bulk = dot => { const codes = list.filter(x => x.form.dot === dot && x.ready !== 'thieu' && x.printed !== 'da').map(x => x.code); return '<button class="btn sm" data-act="qtMark" data-codes="' + codes.join(',') + '"' + (codes.length ? '' : ' disabled') + '>' + (dot === 2 ? 'Đánh dấu cả đợt 2 đã in xong' : 'Đánh dấu cả đợt 1 đã in') + ' (' + codes.length + ' mẫu)</button>'; };
  return '<div class="card" id="qtCard"><h3 style="margin-top:0">Quy trình hồ sơ theo đợt</h3>' +
    '<div class="qtSteps">' + steps.map(([k, l, st]) => '<div class="qtStep ' + stepCls(order.indexOf(k) < order.indexOf(cur), k === cur) + '"><b>' + l + '</b><small>' + esc(st) + '</small></div>').join('') + '</div>' +
    '<div class="msg ' + (nx.step === 'xong' ? 'ok' : 'warn') + '" id="qtNext"><b>Việc nên làm tiếp:</b> ' + esc(nx.text) + '</div>' +
    '<p class="mut" style="margin:6px 0">Mỗi mẫu thuộc đúng một đợt. <b>Đợt 1</b> chỉ dùng dữ liệu có trước khi khai thác nên bản in không đổi khi sau này nhập phiếu cân, khối lượng thực tế. <b>Đợt 2</b> (BM-08, 09, 10, 14) in sau khi cân, xem hướng dẫn ở mục “In hồ sơ đợt 2” bên dưới. “Đã in” do bạn xác nhận; nếu sau đó dữ liệu đổi, mẫu hiện <b>“dữ liệu đã đổi: in lại”</b>.</p>' +
    '<div class="row" style="justify-content:space-between;align-items:center"><h4 style="margin:8px 0 4px">Đợt 1 – làm trước khi khai thác</h4>' + bulk(1) + '</div>' + tbl(1) +
    '<div class="row" style="justify-content:space-between;align-items:center"><h4 style="margin:12px 0 4px">Đợt 2 – sau khi khai thác, cân (giấy trắng hoặc nền + in đè)</h4>' + bulk(2) + '</div>' + tbl(2) + '</div>';
}
function qtMarkAct(codes, on) {
  const f = curForest(), rec = curRec(); if (!f || !rec) return; const st = HAKQuyTrinh.stateOf(f), now = new Date().toISOString(), all = qtItems(rec);
  codes.forEach(c => { if (!on) HAKQuyTrinh.unmark(st, c); else { const it = all.find(x => x.code === c); if (it && it.ready !== 'thieu') HAKQuyTrinh.mark(st, c, it.sig, now); } });
  persist();
}
/* In phiếu cân theo rừng (giống xuất hồ sơ): dùng đúng phiếu cân của rừng đang mở, bất kể phiếu đến từ file nhập ở rừng, Tra cứu Google Sheets hay cập nhật biển số */
function pcPrintCard(rec) {
  const g = HAKPhieuCan.gaps(rec.pc), n = g.total, co = theCompany();
  const head = '<div class="card" id="pcPrintCard"><h3 style="margin-top:0">In phiếu cân <span class="mut" style="font-weight:400">giấy lỗ 240 × 279 mm, công cụ PhieuCan nguyên bản</span></h3>';
  if (!HB) return head + '<p class="mut" style="margin:0">Chỉ có ở bản cài đặt trên máy tính (Windows).</p></div>';
  const miss = Object.entries(g.by).map(([k, v]) => esc(k) + ' (' + v + ' phiếu)').join('; ');
  return head + '<div class="docrow"><div><b>' + (n ? n + ' phiếu cân của rừng này' : 'Rừng này chưa có phiếu cân') + '</b><div class="mut">' + (n ? (g.full === n ? 'Phiếu nào cũng đủ thông tin để in.' : g.full + ' phiếu đủ thông tin; còn thiếu: ' + miss + '. Phiếu thiếu vẫn in được, phần thiếu để trống.') : 'Nhập file phiếu cân ở tab Vận chuyển, hoặc đưa từ Tra cứu Google Sheets sang rừng này.') +
    (n && g.full < n ? ' Bổ sung bằng <b>Tra cứu Google Sheets</b> (chọn các phiếu đã có để cập nhật) hoặc nhập lại file phiếu cân của rừng.' : '') + '</div>' +
    '<div class="mut">Tiêu đề phiếu lấy từ <b>Cài đặt → Công ty</b>' + (co && co.ten ? ': ' + esc(co.ten) : ' (chưa khai: dùng tiêu đề mặc định của công cụ)') + '. Địa chỉ rừng và khách hàng lấy theo hồ sơ rừng.</div></div>' +
    '<div class="d2btns"><button class="btn" style="white-space:nowrap" data-act="pcPrint"' + (n ? '' : ' disabled') + '>In phiếu cân</button>' + (n ? '' : '<button class="btn ghost sm" data-act="ktGo" data-go="' + esc(JSON.stringify({ftab: 'dx'})) + '">Mở tab Vận chuyển</button>') + '</div></div></div>';
}
function panelXuat(rec) {
  const g = gate(rec);
  const ex = rec.exp || {};
  const dd = destOf(rec);
  const btn = (label, kind, idx, ok) => '<button class="btn sm ghost" ' + (ok ? '' : 'disabled') + ' data-act="dl" data-kind="' + kind + '"' + (idx != null ? ' data-idx="' + idx + '"' : '') + '>' + label + '</button>';
  const hdld = hdldList(rec);
  const pay = payrollPlan(rec, ex);
  const groups = groupsDX(rec), gpc = groupsPC(rec);
  const why = [];
  if (g.info.length) why.push('Thông tin chủ rừng: ' + g.info.join('; '));
  if (g.nc.errs.length) why.push('Nhân công: ' + g.nc.errs.length + ' lỗi');
  if (g.dx.errs.length) why.push('Vận chuyển: ' + g.dx.errs.length + ' lỗi');
  if (g.normErrs.length) why.push('BHLĐ: ' + g.normErrs.join('; '));
  if (g.vc.length) why.push('Vận chuyển: ' + g.vc.join('; '));
  const params = (title, list) => '<div class="card"><h3 style="margin-top:0">' + title + ' <span class="mut" style="font-weight:400">· để trống thì in dòng chấm để điền tay</span></h3>' +
    '<div class="grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:10px">' +
    list.map(x => '<label>' + x[1] + '<input data-exp="' + x[0] + '" value="' + esc(ex[x[0]] || '') + '" placeholder="' + esc(x[2] || '') + '"></label>').join('') + '</div></div>';
  const row = (t, sub, b) => '<div class="docrow"><div><b>' + t + '</b><div class="mut">' + sub + '</div></div>' + b + '</div>';
  const S = {};
  S.hd = params('Thông số hợp đồng và nghiệm thu', [
      ['ngayKy', 'Ngày ký hợp đồng (dùng chung cho cả hợp đồng vận chuyển)', rec.info.ngayKyHopDong ? 'mặc định: ' + rec.info.ngayKyHopDong + ' (ngày ký ở Thông tin chủ rừng)' : 'dd/mm/yyyy'], ['soKT', 'Số HĐ giao khoán (nhập phần số, VD 015; hoặc số đầy đủ VD 015/2026-KT)', 'năm lấy từ Ngày ký hợp đồng'],
      ['hdPhuCap', 'HĐLĐ: phụ cấp, khoản bổ sung', 'mặc định: Không'], ['hdNangLuong', 'HĐLĐ: nâng bậc, nâng lương', 'mặc định: Không áp dụng'],
      ['uqSo', 'Giấy ủy quyền (giao khoán): số (phần số hoặc số đầy đủ)', 'năm lấy từ ngày ký hợp đồng'], ['uqNgay', 'Giấy ủy quyền (giao khoán): ngày lập', 'trống = ngày ký hợp đồng'], ['ntSo', 'Nghiệm thu, thanh lý: số biên bản (phần số hoặc số đầy đủ)', 'năm lấy từ ngày lập biên bản'], ['ntNgay', 'Nghiệm thu, thanh lý: ngày lập', 'dd/mm/yyyy'],
      ['ntDaTT', 'Nghiệm thu, thanh lý: số tiền đã thanh toán trước (đ)', 'VD: 50000000']]) +
    '<div class="card"><h3 style="margin-top:0">Số hợp đồng đầy đủ sẽ in (xem trước)</h3><div id="soPreviewHd">' + soPreviewHtml(rec, null, 'hd') + '</div></div>' +
    '<div class="card"><h3 style="margin-top:0">Hợp đồng khai thác và nghiệm thu</h3>' +
    (g.direct ? row('Hợp đồng khai thác (giao khoán)', 'Không dùng: chủ rừng ký hợp đồng lao động trực tiếp với từng người', '')
      : row('Hợp đồng khai thác gỗ keo (giao khoán tổ trưởng)', 'Bên A: chủ rừng · Bên B: tổ trưởng', btn('Tải .docx', 'gk', null, g.canGK))) +
    row('Biên bản nghiệm thu, thanh lý khai thác', g.direct ? 'Chủ rừng và đại diện tổ khai thác · theo hợp đồng lao động' : 'Chủ rừng và tổ trưởng · sản lượng chia đều × đơn giá khoán theo vai trò', btn('Tải .docx', 'nttl', null, g.canBHLD)) + '</div>' +
    (g.direct
      ? '<div class="card"><div class="row" style="justify-content:space-between"><h3 style="margin:0">Hợp đồng lao động (chủ rừng ký trực tiếp với từng người)</h3>' + btn('Tải tất cả (.zip)', 'hdld', null, g.canHDLD) + '</div>' +
        (hdld.length ? hdld.map((r, i) => row(esc(personName(r.danhXung, r.ten)), esc(r.chucDanh) + ' · ' + fmt(rateOf(rec.info, r)) + ' ' + basisOf(rec.info).short, btn('.docx', 'hdld', i, g.canHDLD))).join('') : '<p class="mut">Chưa có nhân công.</p>') + '</div>'
      : '<div class="card"><div class="row" style="justify-content:space-between"><h3 style="margin:0">Giấy ủy quyền (công nhân ủy quyền cho Tổ trưởng)</h3>' + btn('Tải .docx', 'uq', null, g.canUQ) + '</div>' +
        '<p class="mut">Một giấy cho cả tổ: ' + ucList(rec).length + ' công nhân cùng ký (danh sách kèm họ tên, ngày sinh, giới tính, nơi cư trú, chữ ký). Người ủy quyền phải từ đủ 18 tuổi' + (minorsOf(rec).length ? ' — <b style="color:var(--err)">hiện có ' + minorsOf(rec).length + ' người dưới 18 tuổi, chưa xuất được</b>' : '') + '. Mẫu do phần mềm soạn theo Bộ luật Dân sự 2015 và Điều 18 Bộ luật Lao động 2019, cần đối chiếu pháp lý.</p></div>');
  S.ld = params('Thông số bảo hộ, đào tạo, kiểm tra thiết bị', [
      ['capNgay', 'BHLĐ: ngày cấp phát', 'dd/mm/yyyy'], ['capHan', 'BHLĐ: thời hạn sử dụng', 'VD: 06 tháng'], ['capNguoi', 'BHLĐ: người cấp phát', 'mặc định: chủ rừng'],
      ['dtNgay', 'ATLĐ: ngày đào tạo', 'dd/mm/yyyy'], ['dtDiaDiem', 'ATLĐ: địa điểm', 'VD: tại rừng khai thác'], ['dtThoiLuong', 'ATLĐ: thời lượng', 'VD: 04 giờ'],
      ['dtNguoi', 'ATLĐ: người đào tạo', 'mặc định: chủ rừng'], ['dtNoiDung', 'ATLĐ: nội dung (cách nhau dấu ;)', 'trống = nội dung mặc định'],
      ['tbNgay', 'Kiểm tra thiết bị: ngày kiểm tra', 'dd/mm/yyyy'], ['tbNguoi', 'Kiểm tra thiết bị: người kiểm tra', 'trống = ký tay'], ['tbSoBinh', 'Kiểm tra thiết bị: số bình chữa cháy', 'mặc định: 2']]) +
    '<div class="card"><h3 style="margin-top:0">Bảo hộ, đào tạo, chấm công, tiền công, an toàn</h3>' +
    row('Danh sách cấp phát BHLĐ', rec.nc.length ? rec.nc.length + ' người' : 'Cần nạp nhân công', btn('Tải .docx', 'bhld', null, g.canPhat)) +
    row('Biên bản xác nhận đào tạo ATLĐ', 'Người đào tạo: chủ rừng (theo mẫu)', btn('Tải .docx', 'xn', null, g.canBHLD)) +
    row('Danh sách đội khai thác', 'Lấy từ file nhân công', btn('Tải .docx', 'dsd', null, g.canBHLD)) +
    row('Bảng chấm công', 'Tháng <input data-exp="thang" value="' + esc(ex.thang || '') + '" style="width:70px" placeholder="MM hoặc MM/yyyy"> · nhập tháng (hoặc MM/yyyy để có năm) · bảng trống để chấm tay', btn('Tải .docx', 'cc', null, g.canBHLD)) +
    '<div class="docrow"><div><b>Bảng thanh toán tiền công</b><div class="mut">Từ <input data-exp="tuNgayTT" value="' + esc(ex.tuNgayTT || '') + '" placeholder="' + esc(rec.info.tuNgay || 'dd/mm/yyyy') + '" style="width:110px"> đến <input data-exp="denNgayTT" value="' + esc(ex.denNgayTT || '') + '" placeholder="' + esc(rec.info.denNgay || 'dd/mm/yyyy') + '" style="width:110px"> · để trống thì lấy thời gian khai thác của rừng</div>' +
      '<div class="' + (pay.issues.length ? 'msg warn' : 'mut') + '" style="margin-top:4px">' + (pay.issues.length ? 'Chưa tính được tiền: ' + esc(pay.issues.join('; ')) + '. Cột tiền sẽ để trống.'
        : pay.ngc ? 'Tự tính: ' + pay.cong + ' công (từ ' + esc(pay.tu) + ' đến ' + esc(pay.den) + ', trừ Chủ nhật)' : 'Tự tính: ' + fmtTan(pay.vol.v) + (pay.basis === 'ha' ? ' ha (' : ' tấn (') + pay.vol.src + ') chia đều ' + (rec.nc.length || 0) + ' người') + '</div></div>' + btn('Tải .docx', 'tc', null, g.canBHLD) + '</div>' +
    row('Sổ theo dõi tai nạn lao động, sự cố', 'Sổ trống để ghi tại hiện trường, có xác nhận cuối đợt (in ngang)', btn('Tải .docx', 'stai', null, g.canBHLD)) +
    row('Biên bản kiểm tra, bảo dưỡng thiết bị', 'Cưa xăng, phương tiện (lấy từ tab Vận chuyển), bình chữa cháy (in ngang)', btn('Tải .docx', 'tbi', null, g.canBHLD)) + '</div>';
  S.vc = params('Thông số hợp đồng vận chuyển, khối lượng và thanh toán', [
      ['soVC', 'Số HĐ vận chuyển (nhập phần số hoặc số đầy đủ)', 'năm lấy từ Ngày ký hợp đồng'], ['vcChiPhi', 'HĐVC: chi phí khác (cầu đường, bốc xếp, thuế)', 'trống = dòng chấm'],
      ['pcSo', 'Xác nhận KL vận chuyển: số biên bản (phần số hoặc số đầy đủ)', 'năm lấy từ ngày lập biên bản'], ['pcNgay', 'Xác nhận KL, thanh toán: ngày lập', 'dd/mm/yyyy'],
      ['pcNguoiLap', 'Thanh toán vận chuyển: người lập bảng', 'trống = để ký tay'], ['pcNguong', 'Cảnh báo lệch khối lượng (%)', 'VD: 5 · trống = không kiểm tra']]) +
    '<div class="card"><h3 style="margin-top:0">Số hợp đồng đầy đủ sẽ in (xem trước)</h3><div id="soPreviewVc">' + soPreviewHtml(rec, null, 'vc') + '</div></div>' +
    (g.dx.warns.length ? '<div class="msg warn">Vận chuyển có ' + g.dx.warns.length + ' dòng cần lưu ý (giấy tờ thiếu hoặc sắp hết hạn). Xem tab Vận chuyển, không chặn xuất hồ sơ.</div>' : '') +
    '<div class="card"><div class="row" style="justify-content:space-between"><h3 style="margin:0">Hợp đồng vận chuyển (theo người ký)</h3>' + btn('Tải tất cả (.zip)', 'hdvc', null, g.canHDVC) + '</div>' +
    (groups.length ? groups.map((x, i) => row(esc(x.ten), x.vaiTro + ' ký · ' + x.xe.length + ' xe · ' + fmt(x.donGia) + ' đ/tấn', btn('.docx', 'hdvc', i, g.canHDVC))).join('') : '<p class="mut">Chưa có vận chuyển.</p>') + '</div>' +
    '<div class="card"><div class="row" style="justify-content:space-between"><h3 style="margin:0">Xác nhận khối lượng và thanh toán tiền vận chuyển</h3>' + (gpc.length ? btn('Biên bản (.zip)', 'xnvc', null, g.canPC) + btn('Bảng thanh toán (.zip)', 'ttvc', null, g.canPC) : '') + '</div>' +
    (!(rec.pc || []).length ? '<p class="mut">Chưa có phiếu cân. Nạp file phiếu cân ở tab Vận chuyển (mỗi chuyến một dòng).</p>'
      : g.pc.errs.length ? '<div class="msg err">Phiếu cân còn ' + g.pc.errs.length + ' lỗi, xem tab Vận chuyển.</div>' : '') +
    (g.pc.warns.length ? '<div class="msg warn">' + esc(g.pc.warns.join(' · ')) + '</div>' : '') +
    gpc.map((x, i) => { const py = payVC(rec, x); return row(esc(x.ten), py.n + ' chuyến · ' + fmtT(py.kg) + ' tấn · ' + fmt(py.tien) + ' đồng', '<div class="row">' + btn('Biên bản', 'xnvc', i, g.canPC) + btn('Thanh toán', 'ttvc', i, g.canPC) + '</div>'); }).join('') + '</div>';
  S.fsc = params('Thông số hồ sơ FSC và giám sát', [
      ['tdNgay', 'Thẩm định: ngày thẩm định', 'dd/mm/yyyy'], ['tdNguoi', 'Thẩm định: người thẩm định', 'trống = ký tay'],
      ['ckNhan', 'Cam kết: đơn vị nhận (Kính gửi)', buyerName(rec) ? 'mặc định: ' + buyerName(rec) + ' (Công ty mua hàng)' : 'VD: Công ty TNHH ... (hoặc khai Công ty mua hàng để tự điền)'], ['ckNgay', 'Cam kết: ngày lập', 'dd/mm/yyyy'],
      ['ktNgayTruoc', 'Kiểm tra hiện trường: ngày trước KT', 'dd/mm/yyyy'], ['ktNgaySau', 'Kiểm tra hiện trường: ngày sau KT', 'dd/mm/yyyy'], ['ktNguoi', 'Kiểm tra hiện trường: người kiểm tra', 'trống = ký tay'],
      ['fscNgay', 'Phổ biến FSC: thời gian', 'dd/mm/yyyy'], ['fscDiaDiem', 'Phổ biến FSC: địa điểm', 'VD: tại rừng khai thác'], ['fscNguoi', 'Phổ biến FSC: người phổ biến', 'trống = ký tay'], ['fscDauMoi', 'Phổ biến FSC: đầu mối nhận khiếu nại', 'tên, số điện thoại']]) +
    '<div class="card"><h3 style="margin-top:0">Hồ sơ FSC tại rừng</h3>' +
    row('Phiếu thẩm định chủ rừng và rừng', 'Checklist trước khai thác (QT-FSC-01 bước 1) · tự điền giấy tờ, tọa độ, khối lượng', btn('Tải .docx', 'tdcr', null, !g.info.length)) +
    row('Cam kết nguồn gốc gỗ rừng trồng', 'Chủ rừng cam kết · lấy giấy tờ, tọa độ, thời gian khai thác của rừng', btn('Tải .docx', 'ckng', null, !g.info.length)) +
    row('Cam kết sử dụng lao động', 'Không lao động trẻ em, cưỡng bức, phân biệt đối xử · kèm danh sách ký', btn('Tải .docx', 'cklc', null, g.canBHLD)) +
    row('Biên bản phổ biến chính sách FSC', 'Chủ rừng, tổ khai thác, bên vận chuyển cùng ký', btn('Tải .docx', 'fsc', null, g.canBHLD)) +
    row('Biên bản kiểm tra hiện trường khai thác', 'Checklist trước và sau khai thác (in ngang)', btn('Tải .docx', 'kthn', null, g.canBHLD)) +
    row('Nhật ký khai thác hằng ngày', 'Tự lập các ngày từ thời gian khai thác (bỏ Chủ nhật) · in ngang', btn('Tải .docx', 'nkkt', null, g.canBHLD)) + '</div>';
  const TABS = [['hd', '1. Hợp đồng'], ['ld', '2. Lao động, an toàn'], ['vc', '3. Vận chuyển'], ['fsc', '4. FSC, giám sát'], ['all', 'Tất cả']];
  const cur = TABS.some(t => t[0] === xtab) ? xtab : 'hd';
  const INTRO = {hd: 'Nhập số, ngày, thông số hợp đồng và nghiệm thu, rồi tải từng mẫu.', ld: 'Bảo hộ lao động, đào tạo ATLĐ, chấm công, tiền công, sổ tai nạn và kiểm tra thiết bị.',
    vc: 'Hợp đồng vận chuyển theo người ký; xác nhận khối lượng và thanh toán lấy từ phiếu cân.', fsc: 'Thẩm định, cam kết, phổ biến, kiểm tra hiện trường, nhật ký khai thác phục vụ giám sát FSC.', all: 'Hiển thị toàn bộ thông số và mẫu của cả 4 nhóm.'};
  const dl = draftList(rec).filter(x => x.issues.length);
  const draftCard = '<div class="card" id="draftCard"><h3 style="margin-top:0">Bản chính thức hay bản nháp</h3>' + (dl.length ? '<p class="mut" style="margin:0 0 6px">Các mẫu dưới đây vẫn tải được để soạn trước nhưng mang nhãn <b>BẢN NHÁP</b> (tên file, đầu tài liệu, tên gói). Bổ sung dữ liệu rồi tải lại để có bản chính thức.</p>' + dl.map(x => '<div style="margin:4px 0"><b>' + esc(x.label) + '</b>: ' + x.issues.map(i => esc(i.text) + ' <span class="mut">→ ' + esc(i.where) + '</span>').join('; ') + '</div>').join('') : '<div class="msg ok" style="margin:0">Mọi biểu mẫu có điều kiện riêng (BM-01, 04, 08, 09, 10, 11, 14, 20) đã đủ để in bản chính thức.</div>') + '</div>';
  return (stBlockText() ? '<div class="msg err" id="stGate"><b>Chưa tạo, xuất, in được hồ sơ.</b> ' + esc(stBlockText()) + ' <button class="btn sm" data-act="stGo">Quay lại mục đang chỉnh sửa</button></div>' : '') + (why.length ? '<div class="msg err">Chưa xuất được:<br>' + esc(why.join(' · ')) + '</div>' : '<div class="msg ok">Hồ sơ đủ dữ liệu để xuất.</div>') + qtPanel(rec) +
    '<div class="card"><h3 style="margin-top:0">Tải hồ sơ theo đợt</h3><p class="mut" style="margin:0 0 8px">Chưa xong khai thác thì in <b>đợt 1</b> trước; khi rừng xong, cập nhật phiếu cân và khối lượng thực tế rồi in <b>đợt 2</b> (mỗi biểu mẫu là một file Word riêng nên thay hoặc chèn vào bộ hồ sơ đã in rất dễ). Đợt 2 muốn in nền rồi in đè thì dùng mục “In hồ sơ đợt 2” ngay bên dưới.</p>' +
      '<div class="docrow"><div><b>Đợt 1 – hồ sơ làm ngay (.zip)</b><div class="mut">Tất cả trừ tiền công BM-08, xác nhận khối lượng BM-09, thanh toán vận chuyển BM-10 và nghiệm thu, thanh lý BM-14.</div></div>' + btn('Tải đợt 1', 'dau', null, (g.direct ? g.canHDLD : g.canGK) && g.canHDVC && !g.normErrs.length) + '</div>' +
      '<div class="docrow"><div><b>Đợt 2 – sau khi xong rừng (.zip)</b><div class="mut">Chỉ BM-08 bảng thanh toán tiền công, BM-09, BM-10 (cần phiếu cân hợp lệ) và BM-14 nghiệm thu, thanh lý.' + (g.canPC ? '' : ' <b>Hiện chưa đủ phiếu cân hợp lệ nên BM-09 và BM-10 chưa có trong đợt này.</b>') + '</div></div>' + btn('Tải đợt 2', 'cuoi', null, g.canBHLD) + '</div></div>' +
    d2Panel(rec) + pcPrintCard(rec) +
    '<div class="card row" style="justify-content:space-between"><div><b>Toàn bộ hồ sơ (.zip)</b><div class="mut">Gồm ' + (g.direct ? '' : 'HĐ giao khoán, ') + 'BHLĐ, các HĐLĐ, HĐVC, các mẫu FSC và các mẫu in bổ sung. <b>Hồ sơ đã đủ dữ liệu thì in một lần bằng nút này</b>; mục nào chưa đủ (phiếu cân, khối lượng thực tế, ngày lập, địa chỉ giao…) sẽ được nêu ngay sau khi tải.</div></div>' + btn('Tải toàn bộ hồ sơ', 'all', null, (g.direct ? g.canHDLD : g.canGK) && g.canHDVC && !g.normErrs.length) + '</div>' +
    draftCard +
    '<div class="tabs" style="margin-top:6px">' + TABS.map(([k, l]) => '<button class="' + (cur === k ? 'on' : '') + '" data-xtab="' + k + '">' + l + '</button>').join('') + '</div>' +
    '<p class="mut" style="margin:0 0 10px">' + INTRO[cur] + '</p>' +
    (cur === 'all' ? S.hd + S.ld + S.vc + S.fsc : S[cur]);
}

function renderCtx() {
  const o = curOwner(), f = curForest();
  const nh = document.getElementById('navHome'); if (nh) nh.classList.toggle('on', !o && view !== 'norm' && !['settings', 'setgs', 'setfmt', 'cty'].includes(view));
  const ns = document.getElementById('navSet'); if (ns) ns.classList.toggle('on', ['settings', 'setgs', 'setfmt', 'cty'].includes(view));
  const nn = document.getElementById('navNorm'); if (nn) nn.classList.toggle('on', view === 'norm');
  $('#ctxOwner').innerHTML = 'Chủ rừng: <b>' + esc(o ? (o.info.ten || '(chưa đặt tên)') : 'chưa mở') + '</b>';
  $('#ctxForest').innerHTML = 'Rừng: <b>' + esc(f ? ((f.info.maRung || '(chưa có mã)') + (f.info.tenRung ? ' · ' + f.info.tenRung : '')) : 'chưa mở') + '</b>';
  if (!saveSt.text) showSave(HB ? (storeOk ? 'Dữ liệu lưu trong SQLite trên máy' : 'Chưa đọc được cơ sở dữ liệu') : 'Dữ liệu lưu trong trình duyệt', !storeOk);
  else showSave(saveSt.text, saveSt.err);
}
function render() {
  if (dataIssueUi) return renderIssue();
  numStyle = (db && db.dinhDangSo === 'en') ? 'en' : 'vi';
  renderSide();
  renderMain();
  renderCtx();
  stApplyGate();
}

