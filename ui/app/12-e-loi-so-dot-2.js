function issuesBox(errs, warns) {
  let h = '';
  if (errs.length) h += '<div class="msg err"><b>Lỗi (' + errs.length + ') — kiểm tra thông báo rồi sửa dòng tương ứng:</b><ul class="issues">' + errs.slice(0, 40).map(e => '<li>' + esc(e) + '</li>').join('') + (errs.length > 40 ? '<li>… còn ' + (errs.length - 40) + ' lỗi</li>' : '') + '</ul></div>';
  else h += '<div class="msg ok">Không có lỗi.</div>';
  if (warns.length) h += '<div class="msg warn"><b>Cảnh báo (' + warns.length + '):</b><ul class="issues">' + warns.slice(0, 20).map(e => '<li>' + esc(e) + '</li>').join('') + '</ul></div>';
  return h;
}

/* Xem trước SỐ ĐẦY ĐỦ sẽ in trên biểu mẫu (cùng quy tắc với lúc xuất: src/hopdong.js) và nhắc việc cần bổ sung để có năm */
function soPreviewHtml(rec, exo, which) {
  const ex = expLo(rec, exo);
  const n = HAKHopDong.numbers(ex), direct = isDirect(rec.info), cbs = HAKHopDong.canBoSung(ex);
  const line = (label, x, forms) => '<tr><td>' + label + '</td><td><b>' + esc(x.so) + '</b></td><td class="mut">' + forms + (x.giuNguyen ? ' · số đã đầy đủ, giữ nguyên' : x.nam ? ' · năm ' + x.nam + ' lấy từ ngày ' + esc(x.ngay) : ' · <span style="color:var(--err)">chưa có năm</span>') + '</td></tr>';
  const rows = which === 'vc' ? [line('Hợp đồng vận chuyển', n.vc, 'BM-04, BM-09, BM-10'), line('Biên bản xác nhận khối lượng', n.xn, 'BM-09, BM-10')]
    : [...(direct ? [] : [line('Hợp đồng khai thác (giao khoán)', n.kt, 'BM-01, BM-14, BM-20'), line('Giấy ủy quyền', n.uq, 'BM-20')]), line('Biên bản nghiệm thu, thanh lý', n.nt, 'BM-14')];
  const need = cbs.filter(c => which === 'vc' ? /BM-04|BM-09/.test(c.label) : /BM-01|BM-14|BM-20/.test(c.label));
  return '<table><tr><th>Văn bản</th><th>Số đầy đủ sẽ in</th><th>Ghi chú</th></tr>' + rows.join('') + '</table>' +
    (need.length ? '<div class="msg warn" style="margin-top:6px">Chưa có năm trong số: ' + need.map(c => esc(c.label) + ' — bổ sung <b>' + esc(c.truong) + '</b> (dd/mm/yyyy, ngày có thật)').join('; ') + '. Năm được lấy từ ngày ký của chính hợp đồng, không ghi sẵn năm cố định.</div>' : '');
}
/* Màn hình "In hồ sơ đợt 2": việc cần làm ở trên cùng; bảng chi tiết từng mẫu/nhóm ở dưới, mỗi dòng chỉ hiện nút hợp với tình trạng */
const D2_SHORT = {trang: 'Giấy trắng', nen: 'In nền', thieu: 'Thiếu dữ liệu', de: 'In đè', cho: 'Chờ dữ liệu', kiemtra: 'Đối chiếu nền cũ', doibocuc: 'In lại nền hoặc giấy trắng'};
const D2_TONE = {trang: 'ok', nen: 'warn', thieu: 'err', de: 'ok', cho: 'warn', kiemtra: 'warn', doibocuc: 'err'};
const D2_TAB = {finfo: 'Thông tin rừng', nc: 'Nhân công', dx: 'Vận chuyển', xuat: 'Xuất hồ sơ'};
/* nhãn phân biệt các nhóm vận chuyển cùng tên: biển số xe và 4 số cuối CCCD */
function d2GroupLabel(rec, gr) { const xe = [...new Set(gr.xe.map(r => r.bienSo).filter(Boolean))];
return gr.ten + ' (' + gr.vaiTro.toLowerCase() + ')' + (xe.length ? ' · xe ' + xe.slice(0, 2).join(', ') + (xe.length > 2 ? ' +' + (xe.length - 2) : '') : '') + (gr.cccd ? ' · CCCD …' + String(gr.cccd).slice(-4) : ''); }
function d2Panel(rec) {
  const {list, plan, absent} = d2Eval(rec), IA = HAKInAn2;
  const ab = (act, label, o = {}) => '<button class="btn sm ' + (o.primary ? '' : 'ghost') + '" ' + (o.disabled ? 'disabled ' : '') + 'data-act="' + act + '"' + (o.mode ? ' data-mode="' + o.mode + '"' : '') + (o.keys ? ' data-keys="' + esc(o.keys.join('|')) + '"' : '') + (o.title ? ' title="' +
  esc(o.title) + '"' : '') + '>' + label + '</button>';
  const keysOf = a => a.map(x => x.key);
  const same = list.length > 0 && list.every(x => x.advice === list[0].advice);
  const rows = list.map(x => { const k = [x.key], adv = x.advice;
    const bNen = ab('d2dl', 'Tải nền', {mode: 'nen', keys: k, title: 'Tải mẫu nền của riêng mẫu này'}), bTrang = ab('d2dl', 'Tải giấy trắng', {mode: 'trang', keys: k, title: 'Tải bản đầy đủ, in một lần trên giấy trắng'}),
      bDe = ab('d2dl', 'Tải in đè', {mode: 'de', keys: k, title: 'Tải phần bổ sung để in đè lên tờ nền đã in'}), bConf = ab('d2confirm', 'Đã in nền', {keys: k, title: 'Xác nhận đã in tờ nền này (ghi nhận bố cục hiện tại)'}),
      bOld = ab('d2legacy', 'Đã có nền in từ trước', {keys: k, title: 'Tờ nền in trước khi có chức năng này: bắt buộc đối chiếu trước khi in đè'}), bUndo = ab('d2undo', 'Bỏ xác nhận', {keys: k, title: 'Tờ nền hỏng, mất hoặc muốn in lại trên giấy trắng'});
    const vis = {trang: [bTrang], nen: [bNen, bConf], thieu: [], de: [bDe], cho: [], kiemtra: [bDe], doibocuc: [bNen, bConf]}[adv];
    const more = {trang: [x.nenReady && bNen, bConf, bOld], nen: [bOld], thieu: [], de: [x.fullReady && bTrang, bUndo], cho: [bUndo], kiemtra: [x.fullReady && bTrang, bUndo], doibocuc: [x.fullReady && bTrang, bUndo]}[adv].filter(Boolean);
    const acts = vis.join(' ') + (more.length ? ' <details class="d2more"><summary>Khác</summary><div class="d2menu">' + more.join('') + '</div></details>' : '');
    const miss = x.fullMissing;
    const note = (adv === 'doibocuc' ? '<div class="msg warn">Bố cục mẫu đã khác lúc in nền' + (x.diff.length ? ' (' + x.diff.map(esc).join('; ') + ')' : ' (chữ cố định như tên, địa chỉ, số hợp đồng đã đổi)') +
    '. Tờ nền cũ không còn khớp: in lại mẫu nền rồi xác nhận lại, hoặc in đầy đủ trên giấy trắng.</div>' : '') +
      (adv === 'kiemtra' ? '<div class="msg warn">Chưa biết bố cục tờ nền in từ trước. Trước khi in đè, đối chiếu tờ nền với mẫu hiện tại (khổ giấy, hướng giấy, lề, chữ cố định, số dòng); app sẽ hỏi khi bạn bấm “Tải in đè”.</div>' : '') +
      (miss.length ? '<div class="mut">Còn thiếu để in đầy đủ: ' + miss.map(m => esc(m.text) + ' <button class="btn ghost sm" data-act="ktGo" data-go="' + esc(JSON.stringify(m.go)) + '">Mở ' + (D2_TAB[m.go.ftab] || 'tab') + '</button>').join('; ') + '</div>' : '');
    return '<tr data-d2="' + esc(x.key) + '" data-adv="' + adv + '"><td><b>' + esc(x.label) + '</b>' + note + '</td><td>' + (x.fullReady ? 'Đủ' : x.nenReady ? 'Đủ để in nền' : 'Chưa đủ') + '</td><td>' + (x.printed ? (x.legacy ? 'Nền in từ trước' : 'Đã in ' + esc((x.at || '').slice(0,
    10).split('-').reverse().join('/'))) : '—') + '</td>' + (same ? '' : '<td class="' + D2_TONE[adv] + '">' + D2_SHORT[adv] + '</td>') + '<td class="d2act">' + acts + '</td></tr>'; }).join('');
  const nT = plan.trang.length, nN = plan.nen.length, nD = plan.de.length + plan.kiemtra.length, full4 = plan.allFull && !absent.length;
  const absentTxt = absent.length ? '<div class="msg warn">Chưa có mục nào cho ' + absent.map(c => esc(IA.FORMS[c].label)).join(', ') + (absent.some(c => c === '09' || c === '10') ? ' (khai đội xe ở tab Vận chuyển)' : '') + '.</div>' : '';
  const summary = same ? '<div class="msg ' + D2_TONE[list[0].advice] + '" id="d2Sum">Cả ' + list.length + ' mục: ' + ({trang: 'đủ dữ liệu, chưa in nền. Nên in đầy đủ trên giấy trắng', nen: 'chưa đủ để in đầy đủ, đủ để in mẫu nền', thieu: 'chưa đủ dữ liệu để dựng cả mẫu nền',
  de: 'đã in nền, đủ dữ liệu. In đè phần bổ sung', cho: 'đã in nền, chờ bổ sung dữ liệu', kiemtra: 'nền in từ trước, cần đối chiếu', doibocuc: 'bố cục đã đổi sau khi in nền'}[list[0].advice]) + '.</div>' : '';
  const action = (title, sub, btns) => '<div class="docrow"><div><b>' + title + '</b><div class="mut">' + sub + '</div></div><div class="d2btns">' + btns + '</div></div>';
  return '<div class="card" id="d2Card"><h3 style="margin-top:0">In hồ sơ đợt 2 <span class="mut" style="font-weight:400">BM-08, BM-09, BM-10, BM-14</span></h3>' +
    '<p class="mut" style="margin:0 0 8px">Khi đủ dữ liệu, in đầy đủ một lần trên giấy trắng (cách A). Chưa đủ thì in mẫu nền trước, xác nhận đã in, rồi in đè phần bổ sung lên đúng tờ đó (cách B). Mẫu nền và phần in đè không có chữ “BẢN NHÁP”.</p>' +
    '<details class="d2help"><summary>Cách in chi tiết</summary><p class="mut">Cách B: in mẫu nền (số biên bản, ngày lập, khối lượng, tiền để trống), bấm “Xác nhận đã in mẫu nền”. Khi có số liệu, nạp lại tờ mẫu nền đã in vào máy in và in đè phần bổ sung, cùng khổ A4, tỉ lệ 100%, cùng máy in, đúng chiều giấy. Riêng BM-09, Bảng kê khối lượng đính kèm luôn in đầy đủ trên giấy mới. Tải file Word hoặc ZIP không làm đổi trạng thái; chỉ nút xác nhận mới ghi nhận đã in.</p></details>' +
    absentTxt + summary +
    action('Cách A: in đầy đủ đợt 2 trên giấy trắng', full4 && plan.nonePrinted ? 'Cả bốn biểu mẫu đủ điều kiện in chính thức, chưa in nền.' : nT ? nT + ' mục đủ điều kiện in chính thức (chưa in nền hoặc cần in lại).' : 'Chưa mục nào đủ điều kiện in chính thức.', ab('d2dl',
    'In đầy đủ đợt 2 – dùng giấy trắng', {primary: plan.primary === 'trang', mode: 'trang', keys: keysOf(plan.trang), disabled: !nT})) +
    action('Cách B, bước 1: in mẫu nền đợt 2', (nN ? nN + ' mục đủ dữ liệu để dựng nền.' : 'Chưa mục nào đủ dữ liệu để dựng nền.') + ' Sau khi in, bấm xác nhận để app nhớ.', ab('d2dl', 'In mẫu nền đợt 2', {
    primary: plan.primary === 'nen', mode: 'nen', keys: keysOf(plan.nen), disabled: !nN}) + ab('d2confirm', 'Xác nhận đã in mẫu nền', {keys: keysOf(plan.nen), disabled: !nN, title: 'Ghi nhận cả bộ đã in nền; có thể xác nhận từng mẫu ở bảng dưới'})) +
    action('Cách B, bước 2: in đè phần bổ sung',
    (nD ? nD + ' mục đã in nền, đủ dữ liệu' + (plan.kiemtra.length ? ' (' + plan.kiemtra.length + ' mục nền in từ trước, sẽ hỏi đối chiếu)' : '') + '. Nạp lại tờ nền đã in rồi in.' : 'Chưa mục nào vừa đã in nền vừa đủ dữ liệu.') + (plan.cho.length ? ' Đang chờ dữ liệu: ' + plan.cho.length +
    ' mục.' : ''),
    ab('d2dl', 'In đè phần bổ sung', {primary: plan.primary === 'de', mode: 'de', keys: plan.de.concat(plan.kiemtra).map(x => x.key), disabled: !nD})) +
    (plan.doibocuc.length ? '<div class="msg warn" id="d2Dirty">' + plan.doibocuc.length + ' mục đã đổi bố cục sau khi in nền: không dùng phần in đè cho các mục này.</div>' : '') +
    '<table class="tbl" id="d2Table" style="width:100%;margin-top:8px"><thead><tr><th>Biểu mẫu</th><th>Dữ liệu</th><th>Mẫu nền</th>' + (same ? '' : '<th>Nên dùng</th>') + '<th>Thao tác</th></tr></thead><tbody>' + rows + '</tbody></table></div>';
}
