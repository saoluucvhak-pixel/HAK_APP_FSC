/* ========== Kiểm tra hồ sơ trước khi xuất: dùng lại gate/checklist FSC, nhóm thành “chặn xuất” và “cần đối chiếu”, kèm số phiếu/trường và liên kết đến đúng tab ========== */
function exportCheck(job) {
  const g = gate(job), ex = job.exp || {}, i = job.info, items = [];
  const add = (kind, nhom, text, ref, go) => items.push({kind, nhom, text, ref: ref || '', go: go || {ftab: 'finfo'}});
  const pcRow = n => (job.pc || []).find(r => String(r._row) === String(n));
  // thông tin chủ rừng, rừng, đơn giá
  infoErrors(i, job.id).forEach(e => add('chan', 'Thông tin chủ rừng', e, '', {tab: 'info'}));
  forestErrors(i, job.fid).forEach(e => add('chan', 'Thông tin rừng', e, '', {ftab: 'finfo'}));
  giaErrors(i).forEach(e => add('chan', 'Hình thức, đơn giá', e, '', {ftab: 'nc'}));
  // mã lô trùng ở dữ liệu cũ: liệt kê đủ các lô khớp để đối chiếu, không tự sửa
  HAKLoRung.duplicateGroups(db).filter(x => x.lots.some(l => l.forest === job.fid)).forEach(x => add('chan', 'Mã lô trùng (dữ liệu cũ)', 'Mã “' + x.ma + '” đang dùng cho ' + x.lots.length + ' lô: ' + x.lots.map(l => l.lo + ' (chủ ' + l.chu + '; ' + l.nc + ' nhân công, ' + l.dx + ' xe, ' + l.pc + ' phiếu cân)').join('; ') + '. Đổi mã các lô thừa ở tab Thông tin rừng, dữ liệu không bị đổi trước khi bạn xác nhận.', x.ma, {ftab: 'finfo'}));
  // nhân công, định mức, tuổi
  g.nc.errs.forEach(e => add('chan', 'Nhân công', e, (e.match(/^Dòng \d+/) || [''])[0], {ftab: 'nc'}));
  g.normErrs.forEach(e => add('chan', 'Định mức BHLĐ', e, '', {view: 'norm'}));
  if (job.nc.length && minorsOf(job).length) add('chan', 'Nhân công', 'Có người dưới 18 tuổi: ' + minorsOf(job).map(r => r.ten).join(', '), '', {ftab: 'nc'});
  // vận chuyển
  g.dx.errs.forEach(e => add('chan', 'Đội xe', e, (e.match(/^Dòng \d+/) || [''])[0], {ftab: 'dx'}));
  g.dx.warns.forEach(e => add('doi', 'Giấy tờ xe', e, (e.match(/^Dòng \d+/) || [''])[0], {ftab: 'dx'}));
  const vcm = (i.vanChuyen || {}).mode;
  if (vcm === 'tanDoan') add('chan', 'Cước theo bậc cự ly (hồ sơ cũ)', 'Hồ sơ cũ còn dùng cước “theo bậc cự ly” (cách tính đã bỏ). Dữ liệu các bậc vẫn được giữ; hãy chọn lại cước cố định hoặc tấn/km.', 'Cách tính cước', {ftab: 'dx'});
  else g.vc.forEach(e => add('chan', 'Cước vận chuyển', e, 'Đơn giá vận chuyển', {ftab: 'dx'}));
  // phiếu cân: thiếu/sai ngày, trùng, biển số chưa ghép, khối lượng…
  g.pc.errs.forEach(e => {
    const m = /^Dòng (\d+): (.*)$/.exec(e), r = m && pcRow(m[1]), so = r ? (r.soPhieu || '(không số)') : '', msg = m ? m[2] : e;
    const nhom = /ngày|dd\/mm|không có thật/i.test(msg) ? 'Phiếu cân: ngày thiếu hoặc sai' : /trùng/i.test(msg) ? 'Phiếu cân trùng số' : /Biển|biển/.test(msg) ? 'Phiếu cân: biển số chưa ghép với xe' : 'Phiếu cân';
    add('chan', nhom, m ? 'Dòng ' + m[1] + ': ' + msg : msg, so ? 'Phiếu ' + so : '', {ftab: 'dx', focus: 'pc'});
  });
  g.pc.warns.forEach(e => add('doi', /lệch/.test(e) ? 'Chênh lệch sản lượng' : 'Phiếu cân', e, '', {ftab: 'dx', focus: 'pc'}));
  // điểm đến theo địa chỉ giao đã chốt
  const dd = destOf(job), dr = HAKMuaHang.drift(i, db.congTy), mis = HAKMuaHang.mismatches(job.pc || [], dd.src === 'congty' ? dd : null);
  if (!dd.text) add('doi', 'Địa chỉ giao hàng', 'Chưa chọn địa chỉ giao hàng đã chốt: BM-04, BM-09, BM-10 sẽ in dòng chấm.', 'Địa điểm vận chuyển đến', {ftab: 'dx', focus: 'mua'});
  else if (dd.src === 'thucong') add('doi', 'Địa chỉ giao hàng', 'Đang dùng điểm đến nhập tay cũ “' + dd.text + '”. Chọn địa chỉ giao của công ty để thay (chỉ đổi sau khi bạn xác nhận).', 'Địa điểm vận chuyển đến', {ftab: 'dx', focus: 'mua'});
  if (dr.state === 'thaydoi') add('doi', 'Địa chỉ giao hàng', 'Hồ sơ công ty đã đổi (' + dr.why + '). Hồ sơ rừng vẫn giữ “' + dr.saved.diaChi + '”; hồ sơ công ty hiện là “' + (dr.current.diaChi || '(không còn địa chỉ này)') + '”. Xem cũ/mới và xác nhận ở tab Vận chuyển.', 'Địa điểm vận chuyển đến', {ftab: 'dx', focus: 'mua'});
  if (mis.length) mis.forEach(p => add('doi', 'Nơi giao trên phiếu khác địa chỉ giao đã chốt', 'Nơi giao ghi trên phiếu: “' + p.noiGiao + '”; địa chỉ đã chốt: “' + dd.diaChi + '”. Nội dung phiếu giữ nguyên.', 'Phiếu ' + (p.soPhieu || '(không số)'), {ftab: 'dx', focus: 'pc'}));
  if (vcm === 'tanKm' && dd.text && (dr.state === 'thaydoi' || !(HAKCuLy.eff(i).km > 0))) add('doi', 'Cự ly vận chuyển', !(HAKCuLy.eff(i).km > 0) ? 'Cước tấn/km cần cự ly nhưng chưa có: ' + HAKCuLy.eff(i).thieu + '.' : 'Cước tính theo tấn/km: khi đổi điểm đến hãy kiểm tra lại cự ly (' + HAKCuLy.eff(i).km + ' km, ' + HAKCuLy.eff(i).nguon + '). Phần mềm không tự sửa cự ly nhập tay hay đơn giá.', 'Cự ly', {ftab: 'finfo'});
  { const ttN = (job.nc || []).filter(isTT).length, sd = job.info.soDoi; if (!isDirect(job.info) && typeof sd === 'number' && ttN >= 1 && sd !== ttN) add('doi', 'Số đội', 'Thông tin rừng khai ' + sd + ' đội làm song song nhưng tab Nhân công có ' + ttN + ' Tổ trưởng (' + ttN + ' đội): thời gian khai thác dự kiến tính theo ' + sd + ' đội, hồ sơ lập theo ' + ttN + ' đội.', 'Số đội khai thác', {ftab: 'finfo'}); }
  { const rows = HAKDinhBien.get(db).rows, bd = HAKDoi.build(job.nc || [], isTT);
    (bd.multi ? bd.doi.map(d => ({lb: ' của đội “' + d.ten + '”', nc: [d.tt, ...d.members]})) : [{lb: '', nc: job.nc || []}]).forEach(u => { const sc = HAKDinhBien.soSanh(rows, u.nc);
      if (u.nc.length && (sc.lech.length || sc.ngoai.length)) add('doi', 'Định mức nhân công', 'Số người' + u.lb + ' khác định mức (1 đội ' + sc.can + ' người, hiện có ' + sc.co + '): ' + HAKDinhBien.lechText(sc) + '.', 'Định mức nhân công', {ftab: 'nc'}); }); }
  { const L = tgLechOf(i, job.pc, nDoiOf(i, job.nc)); if (L && L.canhBao) add('doi', 'Thời gian khai thác', tgLechText(i, L), 'Thời gian khai thác', {ftab: 'finfo'}); }
  // mâu thuẫn, chồng lấn khi nhập liệu (ngày ở nhiều ô, khoảng ngày đảo, số/năm lệch, phiếu cân ngoài thời gian)
  HAKNhapLieu.kiemTra(job).forEach(x => add(x.kind, x.nhom, x.text, x.ref, x.go));
  // các mục checklist FSC còn lại chưa được xét ở trên
  const covered = ['Thông tin rừng đầy đủ', 'Nhân công hợp lệ', 'Hình thức, đơn giá lương', 'Định mức BHLĐ theo chức danh', 'Người lao động đủ 18 tuổi', 'Vận chuyển hợp lệ', 'Giấy tờ xe, GPLX còn hạn', 'Giá vận chuyển', 'Công ty mua hàng và điểm đến vận chuyển', 'Phiếu cân vận chuyển hợp lệ'];
  const goOf = lb => /Tọa độ|Giấy tờ pháp lý|Thời gian/.test(lb) ? {ftab: 'finfo'} : /Biên bản/.test(lb) ? {ftab: 'xuat'} : {ftab: 'finfo'};
  checklistRung(job).filter(x => !x.ok && !covered.includes(x.label)).forEach(x => add(x.warn ? 'doi' : 'doi', 'Checklist FSC', x.label + (x.hint ? ': ' + x.hint : ''), x.label, goOf(x.label)));
  // thiếu dữ liệu cơ bản (chưa nạp)
  if (!job.nc.length) add('doi', 'Nhân công', 'Chưa nạp nhân công của lô.', '', {ftab: 'nc'});
  if (!job.dx.length) add('doi', 'Đội xe', 'Chưa nạp đội xe của lô.', '', {ftab: 'dx'});
  if (!(job.pc || []).length) add('doi', 'Phiếu cân', 'Chưa nạp phiếu cân của lô.', '', {ftab: 'dx', focus: 'pc'});
  return {items, chan: items.filter(x => x.kind === 'chan'), doi: items.filter(x => x.kind === 'doi'), g};
}
function panelKiemTra(job) {
  const c = exportCheck(job), nhom = list => [...new Set(list.map(x => x.nhom))];
  const block = (title, cls, list) => !list.length ? '' : '<div class="card"><h3 style="margin:0 0 8px">' + title + ' (' + list.length + ')</h3>' + nhom(list).map(n => '<div style="margin-bottom:10px"><b>' + esc(n) + '</b>' +
    list.filter(x => x.nhom === n).map(x => '<div class="row" style="align-items:flex-start;gap:8px;margin-top:4px"><span class="pill ' + cls + '">' + (x.ref ? esc(x.ref) : '•') + '</span><span style="flex:1">' + esc(x.text) + '</span><button class="btn ghost sm" data-act="ktGo" data-go="' + esc(JSON.stringify(x.go)) + '">Mở để sửa</button></div>').join('') + '</div>').join('') + '</div>';
  const ok = !c.chan.length;
  return '<div class="card"><div class="row" style="justify-content:space-between"><h3 style="margin:0">Kiểm tra hồ sơ trước khi xuất</h3><span class="pill ' + (ok ? 'ok' : 'err') + '">' + (ok ? 'Không có mục chặn xuất' : c.chan.length + ' mục chặn xuất') + '</span></div>' +
    '<p class="mut" style="margin:6px 0 0">Dùng lại checklist FSC và quy tắc kiểm tra của phần mềm. <b>Chặn xuất</b>: làm nút xuất hồ sơ bị khóa hoặc hồ sơ sai. <b>Cần đối chiếu</b>: vẫn xuất được nhưng nên kiểm tra. Bấm “Mở để sửa” để đến đúng tab.</p>' +
    (c.items.length ? '' : '<div class="msg ok">Hồ sơ lô này đạt mọi kiểm tra.</div>') + '</div>' +
    block('Chặn xuất', 'err', c.chan) + block('Cần đối chiếu', 'warn', c.doi);
}

function panelRung(own) {
  const fl = forestList(own);
  const list = '<div class="card"><div class="row" style="justify-content:space-between"><h3 style="margin:0">Các rừng của chủ rừng</h3><button class="btn sm" data-act="newForest">+ Rừng mới</button></div>' +
    '<p class="mut">Mỗi rừng có tổ khai thác, vận chuyển, hợp đồng và hồ sơ xuất riêng.</p>' +
    (fl.length ? fl.map(f => '<button class="item ' + (f.id === curF ? 'on' : '') + '" data-forest="' + f.id + '"><span class="pill ' + (progressOf(jobView(own, f)).pct === 100 ? 'ok' : '') + '">' + progressOf(jobView(own, f)).pct + '%</span><b>' + esc(f.info.tenRung || f.info.maRung) +
      '</b><small>Mã ' + esc(f.info.maRung) + ' · ' + esc(f.info.diaDiem || 'chưa có địa điểm') + ' · ' + f.nc.length + ' người · ' + f.dx.length + ' xe</small></button>').join('')
      : '<p class="mut">Chưa có rừng. Bấm “+ Rừng mới”.</p>') + '</div>';
  const f = curForest();
  if (!f) return list;
  const job = curRec();
  const kt = exportCheck(job), ft = [['finfo', 'Thông tin rừng'], ['nc', 'Nhân công (' + f.nc.length + ')'], ['dx', 'Vận chuyển (' + f.dx.length + ')'], ['kt', 'Kiểm tra trước khi xuất (' + (kt.chan.length ? kt.chan.length + ' chặn' : kt.doi.length ? kt.doi.length + ' đối chiếu' : 'đạt') + ')'], ['xuat', 'Xuất hồ sơ']];
  return list +
    '<div class="row" style="justify-content:space-between"><h2>' + esc(f.info.tenRung || f.info.maRung) + '</h2><span class="row"><button class="btn ghost sm" data-act="lotBackup" id="lotBackupBtn" title="Lưu riêng lô này thành một file, dùng được khi mất mạng">Sao lưu lô rừng</button><button class="btn danger sm" data-act="delForest">Xóa rừng</button></span></div>' +
    panelTienDo(job) + '<div class="tabs">' + ft.map(([k, l]) => '<button class="' + (ftab === k ? 'on' : '') + '" data-ftab="' + k + '">' + l + '</button>').join('') + '</div>' +
    (ftab === 'finfo' ? panelForest(f) + panelGiay(f) : ftab === 'nc' ? panelNC(stJob(job)) : ftab === 'dx' ? panelDX(stJob(job)) + panelPhieuCan(stJob(job)) : ftab === 'kt' ? panelKiemTra(job) : '<div class="msg ' + (kt.chan.length ? 'err' : kt.doi.length ? 'warn' : 'ok') + '">' + (kt.chan.length ? 'Có <b>' + kt.chan.length + ' mục chặn xuất</b> và ' + kt.doi.length + ' mục cần đối chiếu.' : kt.doi.length ? 'Không có mục chặn xuất; còn <b>' + kt.doi.length + ' mục cần đối chiếu</b>.' : 'Hồ sơ đạt mọi kiểm tra.') + ' <button class="btn sm" data-act="ktGo" data-go="{&quot;ftab&quot;:&quot;kt&quot;}">Kiểm tra hồ sơ trước khi xuất</button></div>' + panelXuat(job));
}

/* Ô Định mức (tấn/ha) của rừng: để trống thì dùng định mức gỗ keo mặc định (hiệu lực theo ngày bắt đầu khai thác); tự điền thì dùng số của rừng */
function dmField(i) {
  const own = typeof i.dinhMucTanHa === 'number' && i.dinhMucTanHa > 0, k = HAKDinhMuc.keoPick(db, i.tuNgay || '');
  const ph = k.found ? 'mặc định ' + fmtTan(k.item.tanHa) + ' tấn/ha' : 'chưa có định mức mặc định';
  const note = own ? 'Đang dùng số riêng của rừng. <button type="button" class="linkbtn" data-act="dmDefault">Dùng mặc định</button>'
    : k.found ? 'Đang dùng định mức gỗ keo mặc định <b>' + fmtTan(k.item.tanHa) + ' tấn/ha</b> (hiệu lực từ ' + (k.item.tuNgay || '…') + '). Tự điền số khác nếu rừng khác định mức.'
    : 'Chưa có định mức mặc định: khai ở <b>Định mức → Định mức gỗ keo</b>, hoặc tự điền số cho rừng.';
  return '<label><span>Định mức (tấn/ha)</span><input name="dinhMucTanHa" value="' + esc(typeof i.dinhMucTanHa === 'number' ? String(i.dinhMucTanHa).replace('.', ',') : (i.dinhMucTanHa ?? '')) + '" placeholder="' + esc(ph) + '"><small class="mut" id="dmNote">' + note + '</small></label>';
}
/* Ô Định mức thời gian khai thác (ngày/ha) của rừng: để trống thì dùng định mức mặc định (hiệu lực theo ngày bắt đầu khai thác) */
function dmTgField(i) {
  const own = typeof i.dinhMucNgayHa === 'number' && i.dinhMucNgayHa > 0, k = HAKDinhMuc.tgPick(db, i.tuNgay || '');
  const ph = k.found ? 'mặc định ' + fmtTan(k.item.ngayHa) + ' ngày/ha' : 'chưa có định mức mặc định';
  const note = own ? 'Đang dùng số riêng của rừng. <button type="button" class="linkbtn" data-act="tgDefault">Dùng mặc định</button>'
    : k.found ? 'Đang dùng định mức mặc định <b>' + fmtTan(k.item.ngayHa) + ' ngày/ha</b> (hiệu lực từ ' + (k.item.tuNgay || '…') + ').' : 'Chưa có định mức mặc định: khai ở <b>Định mức → Định mức thời gian khai thác</b>, hoặc tự điền số cho rừng.';
  return '<label><span>Định mức thời gian khai thác (ngày/ha)</span><input name="dinhMucNgayHa" value="' + esc(typeof i.dinhMucNgayHa === 'number' ? String(i.dinhMucNgayHa).replace('.', ',') : (i.dinhMucNgayHa ?? '')) + '" placeholder="' + esc(ph) + '"><small class="mut" id="tgDmNote">' + note + '</small></label>';
}
/* Ô Số đội khai thác của rừng: các đội làm song song nên thời gian dự kiến chia cho số đội. Để trống thì lấy theo số Tổ trưởng ở tab Nhân công. */
function soDoiNote(i, nc) {
  const nn = nDoiNc(nc), own = typeof i.soDoi === 'number' && i.soDoi >= 1, tt = (nc || []).filter(isTT).length;
  if (!own) return 'Để trống: lấy theo số Tổ trưởng ở tab Nhân công (hiện ' + nn + ' đội). Khai số đội ở đây để tính thời gian khai thác dự kiến.';
  return 'Đang dùng <b>' + i.soDoi + ' đội</b> làm song song.' + (tt > 1 && tt !== i.soDoi ? ' <b style="color:var(--warn)">Tab Nhân công đang có ' + tt + ' Tổ trưởng (' + tt + ' đội): kiểm tra lại số đội.</b>' : '') + ' <button type="button" class="linkbtn" data-act="soDoiAuto">Theo nhân công</button>';
}
function soDoiField(i, nc) {
  return '<label><span>Số đội khai thác (làm song song)</span><input name="soDoi" inputmode="numeric" value="' + esc(typeof i.soDoi === 'number' ? String(i.soDoi) : (i.soDoi ?? '')) + '" placeholder="' + esc('theo nhân công: ' + nDoiNc(nc)) + '"><small class="mut" id="soDoiNote">' + soDoiNote(i, nc) + '</small></label>';
}
/* Thời gian khai thác dự kiến của rừng = diện tích × ngày/ha; có ngày bắt đầu thì hiện ngày kết thúc dự kiến (không tính Chủ nhật) */
function tgDuKienHtml(i, pcs, nd) {
  nd = nd || 1; const d = ngayHaEff(i), n = d ? HAKDinhMuc.soNgay(haDoi(i, nd), d.v) : null, tan = dinhMucEff(i), ns = d && tan ? HAKDinhMuc.nangSuat(tan.v, d.v) : null;
  if (n == null) return 'Chưa tính được thời gian khai thác dự kiến: cần <b>diện tích</b> và <b>định mức thời gian khai thác (ngày/ha)</b>.';
  const kt = i.tuNgay && HAKDates.isValid(i.tuNgay) ? HAKDinhMuc.ngayKetThuc(i.tuNgay, n) : '';
  const han = trim(i.denNgay || '');
  return 'Thời gian khai thác dự kiến: <b>' + n + ' ngày</b> (' + String(i.dienTich).replace('.', ',') + ' ha × ' + String(d.v).replace('.', ',') + ' ngày/ha' + (nd > 1 ? ' ÷ ' + nd + ' đội làm song song' : '') + ', không tính Chủ nhật' + (ns ? '; năng suất 1 ngày' + (nd > 1 ? ' của mỗi đội' : '') + ' ≈ ' + String(ns).replace('.', ',') + ' tấn' : '') + ').' +
    (kt ? ' Bắt đầu ' + esc(i.tuNgay) + ' → <b>kết thúc dự kiến ' + esc(kt) + '</b>' + (han && han !== kt ? ' (ô “đến ngày” đang là ' + esc(han) + ')' : '') + '. <button type="button" class="linkbtn" data-act="fillDenDk">Điền ngày kết thúc dự kiến</button>' : ' Nhập <b>từ ngày</b> để tính ngày kết thúc dự kiến.') + (() => { const L = tgLechOf(i, pcs, nd); return L && L.canhBao ? '<br><b class="tgWarn" id="tgLech">Cảnh báo: ' + esc(tgLechText(i, L)) + '</b>' : L && L.loi ? '<br><b class="tgWarn" id="tgLech">Cảnh báo: ' + esc(L.loi) + '.</b>' : ''; })();
}
const fillBtn = (act, label) => '<small class="mut"><button type="button" class="linkbtn" data-act="' + act + '">' + label + '</button></small>';
/* ghi chú dưới ô cự ly: đang dùng số nào, từ đâu, và vì sao chưa có */
function cuLyNote(i) {
  const e = HAKCuLy.eff(i), k = v => String(v).replace('.', ',') + ' km';
  if (e.nguon === 'nhập tay') return 'Đang dùng cự ly <b>nhập tay ' + k(e.km) + '</b>.' + (e.auto != null ? ' Tự tính từ tọa độ: ' + k(e.auto) + ' (đường chim bay). Xóa ô để dùng số tự tính.' : '');
  if (e.nguon === 'tự tính') return 'Đang dùng cự ly <b>tự tính ' + k(e.km) + '</b>: khoảng cách <b>đường chim bay</b> từ tọa độ rừng đến tọa độ nơi giao, chưa phải quãng đường xe chạy (thường dài hơn). Nhập số km thực tế vào ô trên nếu khác.';
  return 'Chưa có cự ly: ' + e.thieu + '.';
}
function panelForest(f) {
  const i = f.info || {};
  const inp = (k, label, o = {}) => '<label' + (o.wide ? ' style="grid-column:1/-1"' : '') + '><span class="' + (o.req ? 'req' : '') + '">' + label + '</span>' +
    '<input name="' + k + '" value="' + esc(typeof i[k] === 'number' && ['khoiLuong', 'dienTich', 'cuLy'].includes(k) ? String(i[k]).replace('.', ',') : (i[k] ?? '')) + '"' + (o.ph ? ' placeholder="' + esc(o.ph) + '"' : '') + '>' + (o.btn || '') + '</label>';
  const sl = forestYield(i);
  return '<div class="card"><h3 style="margin-top:0">Thông tin khai thác của rừng</h3>' +
    '<form id="forestForm" class="grid">' +
    inp('maRung', 'Mã rừng', {req: true}) + inp('tenRung', 'Tên rừng / lô') + inp('diaDiem', 'Địa điểm khai thác (rừng)', {req: true, wide: true}) +
    inp('lat', 'Vĩ độ WGS84 (điểm tâm)', {ph: 'vd: 15.912345'}) + inp('lng', 'Kinh độ WGS84 (điểm tâm)', {ph: 'vd: 108.123456'}) +
    inp('dienTich', 'Diện tích (ha)') + dmField(i) +
    dmTgField(i) + soDoiField(i, f.nc) + '<p class="mut" id="tgNote" style="grid-column:1/-1;margin:0">' + tgDuKienHtml(i, f.pc, nDoiOf(i, f.nc)) + '</p>' +
    '<label><span>Sản lượng dự kiến (tự tính = diện tích × định mức)</span><input id="slDuKien" value="' + (sl == null ? '' : fmt(Math.round(sl)) + ' tấn') + '" readonly placeholder="Nhập diện tích và định mức"></label>' +
    inp('khoiLuong', 'Khối lượng khai thác thực tế (tấn)', {ph: 'để trống thì dùng sản lượng dự kiến', btn: fillBtn('fillKl', 'Lấy tổng từ phiếu cân')}) +
    inp('tuNgay', 'Thời gian khai thác — từ ngày', {btn: fillBtn('fillTu', 'Lấy ngày cân nhỏ nhất')}) + inp('denNgay', 'Thời gian khai thác — đến ngày', {btn: fillBtn('fillDen', 'Lấy ngày cân lớn nhất')}) + inp('cuLy', 'Cự ly vận chuyển (km) — rừng đến nơi giao', {ph: HAKCuLy.auto(i) != null ? 'Để trống = tự tính ' + String(HAKCuLy.auto(i)).replace('.', ',') + ' km' : 'Để trống = tự tính từ tọa độ; hoặc nhập số km thực tế'}) + '<p class="mut" id="cuLyNote" style="grid-column:1/-1;margin:0">' + cuLyNote(i) + '</p>' +
    '<label><span>Đơn giá giao khoán Tổ trưởng (đồng/tấn)</span><input name="donGia" inputmode="numeric" style="text-align:right" value="' + esc(i.donGia > 0 ? fmt(i.donGia) : '') + '" placeholder="để trống: tự suy"><small class="mut">Để trống thì giao khoán tự suy đơn giá từ định biên nhân sự.</small></label>' +
    '<div style="grid-column:1/-1" class="row"><button class="btn" type="submit">Lưu thông tin rừng</button>' + (HB ? '<button class="btn ghost" type="button" data-act="lkOpen">Lấy dữ liệu từ Google Sheets</button>' : '') + '</div></form></div>';
}

const luongOptions = (direct, cur) => {
  const opts = direct ? [['sanluong', 'Theo tấn (đ/tấn)'], ['ngaycong', 'Theo ngày công (đ/công, một ngày công bao nhiêu tiền)']] : [['sanluong', 'Khoán theo tấn (đ/tấn)'], ['ha', 'Khoán theo ha (đ/ha)'], ['ngaycong', 'Khoán, trả theo ngày công (đ/công; Tổ trưởng nhận thay cả tổ)']];
  const all = opts.some(o => o[0] === cur) ? opts : [...opts, [cur, '' + (BASIS[cur] ? BASIS[cur].short : cur) + ' — không áp dụng cho hình thức này, hãy chọn lại']];
  return all.map(([v, l]) => '<option value="' + v + '"' + (v === cur ? ' selected' : '') + '>' + l + '</option>').join('');
};
function panelLuong(rec) {
  const i = rec.info, direct = isDirect(i), cur = i.hinhThucLuong || 'sanluong';
  const rate = (pre, map, unit, legacyTt) => chucDanhAll().map((cd, k) => '<label><span>Đơn giá ' + esc(cd) + ' (' + unit + ')</span><input name="' + pre + k + '" value="' +
    esc(((map || {})[cd]) ?? ((legacyTt && k === 0 && i.donGia > 0) ? i.donGia : '')) + '"></label>').join('');
  const grp = (name, html) => '<div class="grid" data-grp="' + name + '" style="grid-column:1/-1;' + (cur === name ? '' : 'display:none') + '">' + html + '</div>';
  return '<div class="card"><h3 style="margin-top:0">Thông số hợp đồng và đơn giá</h3>' +
    '<p class="mut" style="margin-top:0">Danh sách nhân công nạp từ file Excel. <b>Giao khoán</b>: chủ rừng ký với Tổ trưởng, công nhân ký một Giấy ủy quyền cho Tổ trưởng; tính theo tấn, ha hoặc ngày công. <b>Trực tiếp</b>: chủ rừng ký hợp đồng lao động với tất cả nhân công; tính theo tấn hoặc ngày công. Sản lượng (tấn, ha) hoặc số công chia đều cho mọi người; đơn giá theo từng vai trò.</p>' +
    '<form id="luongForm" class="grid">' +
    '<label style="grid-column:1/-1"><span>Hình thức hợp đồng</span><select name="moHinhKy">' +
      '<option value="giaokhoan"' + (!direct ? ' selected' : '') + '>Giao khoán: chủ rừng ký với Tổ trưởng; công nhân ký một Giấy ủy quyền cho Tổ trưởng</option>' +
      '<option value="tructiep"' + (direct ? ' selected' : '') + '>Trực tiếp: chủ rừng ký hợp đồng lao động với tất cả nhân công</option></select></label>' +
    '<label style="grid-column:1/-1"><span>Cơ sở tính đơn giá</span><select name="hinhThucLuong">' + luongOptions(direct, cur) + '</select></label>' +
    grp('sanluong', rate('dt_', i.donGiaTan, 'đ/tấn', true)) + grp('ha', rate('ha_', i.donGiaHa, 'đ/ha')) + grp('ngaycong', rate('dn_', i.donGiaNgay, 'đ/công')) +
    '<label><span>Hợp đồng lao động từ ngày (dd/mm/yyyy)</span><input name="ngayBDLD" value="' + esc(i.ngayBDLD ?? '') + '" placeholder="' + esc(i.tuNgay || 'để trống nếu chưa biết') + '"></label>' +
    '<div style="grid-column:1/-1" class="row"><button class="btn" type="submit">Lưu thông số</button></div></form></div>';
}

const vcOptions = cur => {
  const opts = [['coDinh', 'Đơn giá cố định (đồng/tấn)'], ['tanKm', 'Đơn giá tấn/km (đồng/tấn/km × cự ly)']];
  const all = opts.some(o => o[0] === cur) ? opts : [...opts, [cur, 'Theo bậc cự ly — không còn áp dụng, hãy chọn lại']];
  return all.map(([v, l]) => '<option value="' + v + '"' + (v === cur ? ' selected' : '') + '>' + l + '</option>').join('');
};
function panelVc(rec) {
  const i = rec.info, vc = i.vanChuyen || {}, tp = transportPrice(i), cur = vc.mode || 'tanKm';
  const show = m => cur === m ? '' : 'display:none';
  return '<div class="card"><h3 style="margin-top:0">Thông số hợp đồng vận chuyển (chủ rừng trả bên vận chuyển)</h3>' +
    '<p class="mut" style="margin-top:0">Hai cách tính đơn giá: <b>cố định</b> (một giá đồng/tấn) hoặc <b>tấn/km</b> (đơn giá × cự ly). Cự ly vận chuyển của rừng: <b>' + (HAKCuLy.eff(i).km ? String(HAKCuLy.eff(i).km).replace('.', ',') + ' km (' + HAKCuLy.eff(i).nguon + ')' : 'chưa có') + '</b> (mặc định tự tính từ tọa độ rừng đến nơi giao, hoặc nhập tay ở tab Thông tin rừng; chỉ cần khi tính theo tấn/km).</p>' +
    '<form id="vcForm" class="grid">' +
    '<label style="grid-column:1/-1"><span>Cách tính đơn giá vận chuyển</span><select name="vcMode">' + vcOptions(cur) + '</select></label>' +
    '<label data-vcgrp="coDinh" style="' + show('coDinh') + '"><span>Đơn giá cố định (đồng/tấn)</span><input name="vcCoDinh" value="' + esc(vc.coDinh ?? '') + '"></label>' +
    '<label data-vcgrp="tanKm" style="' + show('tanKm') + '"><span>Đơn giá tấn/km (đồng/tấn/km)</span><input name="vcKm" value="' + esc(vc.donGiaKm ?? '') + '"></label>' +
    '<div data-vcgrp="tanKm" style="grid-column:1/-1;' + (cur === 'tanKm' ? '' : 'display:none') + '" class="mut">Cự ly vận chuyển: <b>' + (HAKCuLy.eff(i).km ? String(HAKCuLy.eff(i).km).replace('.', ',') + ' km (' + HAKCuLy.eff(i).nguon + (HAKCuLy.eff(i).nguon === 'tự tính' ? ', đường chim bay' : '') + ')' : 'chưa có') + '</b> · xem và sửa ở <button type="button" class="btn ghost sm" data-act="ktGo" data-go="{&quot;ftab&quot;:&quot;finfo&quot;}">tab Thông tin rừng → Cự ly vận chuyển (km)</button></div>' +
    '<label><span>Vận chuyển từ ngày (dd/mm/yyyy)</span><input name="vcTu" value="' + esc(vc.tuNgay ?? '') + '" placeholder="' + esc(i.tuNgay || 'để trống nếu chưa biết') + '"></label>' +
    '<div style="grid-column:1/-1" class="mut">' + (tp.loi ? 'Chưa tính được đơn giá vận chuyển: ' + esc(tp.loi) : 'Đơn giá vận chuyển hiện tại: ' + fmt(tp.gia) + ' đồng/tấn (' + esc(tp.text) + ')') + '</div>' +
    '<div style="grid-column:1/-1" class="row"><button class="btn" type="submit">Lưu thông số vận chuyển</button></div></form></div>';
}
function giayRowHtml(g) {
  g = g || {};
  const opts = '<option value="">— chọn —</option>' + GIAY_LOAI.map(o => '<option' + (g.loai === o ? ' selected' : '') + '>' + o + '</option>').join('');
  const txt = (k, label) => '<label>' + label + '<input name="' + k + '" value="' + esc(g[k.slice(2)] ?? '') + '"></label>';
  return '<div class="giayRow" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:8px;border:1px dashed var(--line);border-radius:6px;padding:8px;margin-bottom:8px">' +
    '<label>Loại giấy<select name="g_loai">' + opts + '</select></label>' +
    txt('g_ten', 'Tên giấy (bắt buộc nếu chọn Khác)') + txt('g_so', 'Số') + txt('g_ngayCap', 'Ngày cấp') + txt('g_coQuan', 'Cơ quan cấp') + txt('g_hanDen', 'Hạn đến (nếu có)') +
    '<div style="align-self:end"><button type="button" class="btn danger sm" data-act="delGiay">Xóa dòng</button></div></div>';
}

function panelGiay(f) {
  const list = f.info.giayTo || [];
  return '<div class="card"><div class="row" style="justify-content:space-between"><h3 style="margin:0">Hồ sơ pháp lý của rừng</h3>' +
    '<button type="button" class="btn ghost sm" data-act="addGiay">+ Thêm giấy tờ</button></div>' +
    '<p class="mut">Chỉ lưu thông tin giấy tờ (loại, số, ngày cấp, cơ quan cấp), không lưu file scan.</p>' +
    '<form id="giayForm"><div id="giayList">' + (list.map(giayRowHtml).join('') || '<p class="mut">Chưa có giấy tờ.</p>') + '</div>' +
    '<button class="btn" type="submit">Lưu giấy tờ</button></form></div>';
}

let normSel = 'b';   // bản định mức đang xem/sửa ('b' = bản gốc, 'i0', 'i1'… = các bản hiệu lực từ ngày muộn hơn)
const normUsed = name => Object.values(db.rs || {}).some(o => Object.values(o.forests || {}).some(f => (f.nc || []).some(r => r.chucDanh === name)));
function panelNorm() {
  const vs = HAKDinhMuc.versions(db); if (!vs.some(v => v.id === normSel)) normSel = vs[vs.length - 1].id;
  const cur = HAKDinhMuc.byId(db, normSel), pos = chucDanhAll();
  const rows = pos.map((cd, k) => {
    const n = cur.dm[cd] || {}, extra = !CHUCDANH.includes(cd);
    return '<tr data-pos="' + esc(cd) + '"><td><b>' + esc(cd) + '</b>' + (extra ? ' <button class="btn ghost sm" type="button" data-act="normDelPos" data-name="' + esc(cd) + '" title="Xóa vị trí này (chỉ khi chưa có nhân công giữ vị trí)">Xóa</button>' : '') + '</td>' +
      BHLD_ITEMS.map(([key]) => '<td><input name="n_' + k + '_' + key + '" value="' + esc(n[key] || '') + '"></td>').join('') + '</tr>';
  }).join('');
  const label = v => (v.tuNgay ? 'Hiệu lực từ ' + v.tuNgay : 'Bản gốc (chưa đặt ngày hiệu lực)');
  return '<h2>Định mức</h2><div class="card"><h3 style="margin-top:0">Định mức BHLĐ theo vị trí</h3>' +
    '<p class="mut" style="margin-top:0">Mỗi bản định mức có <b>hiệu lực từ ngày</b>. Biểu mẫu dùng bản có ngày hiệu lực lớn nhất không vượt quá ngày của biểu mẫu: danh sách cấp phát BHLĐ (BM-02) theo <b>ngày cấp phát</b> (không nhập thì theo ngày bắt đầu khai thác), hợp đồng lao động theo ngày bắt đầu hợp đồng hoặc ngày ký. Ghi số lượng kèm đơn vị, ví dụ “1 bộ”; để trống nếu vị trí không được cấp mục đó.</p>' +
    '<div class="row" style="gap:12px;align-items:flex-end;flex-wrap:wrap"><label style="min-width:260px"><span>Bản định mức</span><select id="normVer">' + vs.map(v => '<option value="' + v.id + '"' + (v.id === normSel ? ' selected' : '') + '>' + esc(label(v)) + '</option>').join('') + '</select></label>' +
    '<button class="btn ghost sm" type="button" data-act="normDelVer"' + (cur.base ? ' disabled' : '') + '>Xóa bản này</button></div>' +
    '<form id="normForm" style="margin-top:12px"><label style="max-width:320px"><span class="req">Hiệu lực từ ngày (dd/mm/yyyy)</span><input name="tuNgay" value="' + esc(cur.tuNgay) + '" placeholder="' + (cur.base ? 'để trống = áp dụng từ trước đến nay' : 'dd/mm/yyyy') + '"></label>' +
    '<div class="wrap" style="margin-top:8px"><table class="normTbl"><thead><tr><th>Vị trí (chức danh)</th>' + BHLD_ITEMS.map(x => '<th>' + x[1] + '</th>').join('') + '</tr></thead><tbody>' + rows + '</tbody></table></div>' +
    '<div class="row" style="margin-top:12px"><button class="btn" type="submit">Lưu bản định mức này</button></div></form>' +
    '<div class="row" style="margin-top:16px;gap:8px;flex-wrap:wrap;align-items:flex-end"><label><span>Thêm bản mới, hiệu lực từ ngày</span><input id="normNewDate" placeholder="dd/mm/yyyy" style="width:160px"></label><button class="btn ghost" type="button" data-act="normAddVer">Thêm bản mới (sao chép bản đang chọn)</button></div>' +
    '<div class="row" style="margin-top:12px;gap:8px;flex-wrap:wrap;align-items:flex-end"><label><span>Thêm vị trí mới (áp dụng cho mọi bản)</span><input id="normNewPos" placeholder="VD: Công nhân phụ" style="width:260px"></label><button class="btn ghost" type="button" data-act="normAddPos">Thêm vị trí</button></div></div>' + dbCard() + keoCard() + tgCard();
}
/* Định mức gỗ keo: 1 ha = ? tấn, có hiệu lực từ ngày. Rừng lấy làm mặc định theo ngày bắt đầu khai thác; rừng tự điền số khác thì dùng số riêng */
function keoCard() {
  const items = HAKDinhMuc.keoItems(db);
  const row = (x, n) => '<tr data-keo="' + n + '"><td><input name="k_tu" value="' + esc(x.tuNgay) + '" placeholder="dd/mm/yyyy" style="width:150px"></td><td><input name="k_tan" value="' + esc(x.tanHa == null ? '' : String(x.tanHa).replace('.', ',')) + '" placeholder="VD: 80" style="width:130px;text-align:right"></td><td>' + (x.tuNgay ? '<button class="btn ghost sm" type="button" data-act="keoDel">Xóa</button>' : '') + '</td></tr>';
  return '<h2 style="margin-top:24px">Định mức gỗ keo: 1 ha = ? tấn</h2><div class="card"><form id="keoForm">' +
    '<p class="mut" style="margin-top:0">Mỗi định mức có <b>hiệu lực từ ngày</b>. Rừng lấy định mức này làm <b>mặc định</b> theo ngày bắt đầu khai thác của rừng (chưa có ngày thì dùng bản mới nhất). Rừng có định mức khác thì tự điền ở Thông tin rừng.</p>' +
    '<table class="normTbl" style="min-width:0;table-layout:auto;max-width:560px"><thead><tr><th>Hiệu lực từ ngày</th><th>1 ha = … tấn</th><th></th></tr></thead><tbody>' + items.map(row).join('') + row({tuNgay: '', tanHa: null}, 'new') + '</tbody></table>' +
    '<div class="row" style="margin-top:12px"><button class="btn" type="submit">Lưu định mức gỗ keo</button><span class="mut">Dòng cuối để thêm định mức mới.</span></div></form></div>';
}
/* Định mức nhân công: định biên một đội khai thác, số người và NHIỆM VỤ từng vị trí (src/dinhbien.js) */
function dbCard() {
  const g = HAKDinhBien.get(db), tong = HAKDinhBien.tong(g.rows);
  const row = (r, n) => '<tr data-db="' + n + '"><td><input name="b_cd" value="' + esc(r.chucDanh) + '" placeholder="VD: Công nhân bóc vỏ" style="width:190px"' + (r.chucDanh === HAKDinhBien.TO_TRUONG ? ' readonly title="Vị trí Tổ trưởng cố định: 1 người"' : '') + '></td>' +
    '<td><input name="b_so" value="' + esc(r.soNguoi == null ? '' : r.soNguoi) + '" placeholder="VD: 3" style="width:70px;text-align:right"' + (r.chucDanh === HAKDinhBien.TO_TRUONG ? ' readonly' : '') + '></td>' +
    '<td><input name="b_km" value="' + esc(r.kiemNhiem || '') + '" placeholder="(không)" style="width:170px" list="dbPos"></td>' +
    '<td><textarea name="b_nv" rows="4" placeholder="Nhiệm vụ của vị trí" style="width:100%;min-width:320px">' + esc(r.nhiemVu || '') + '</textarea></td>' +
    '<td>' + (r.chucDanh && r.chucDanh !== HAKDinhBien.TO_TRUONG ? '<button class="btn ghost sm" type="button" data-act="dbDel">Xóa</button>' : '') + '</td></tr>';
  return '<h2 style="margin-top:24px">Định mức nhân công: 1 đội = ' + tong + ' người</h2><div class="card"><form id="dbForm">' +
    '<p class="mut" style="margin-top:0">Định biên một đội khai thác và <b>nhiệm vụ từng vị trí</b>. Người <b>kiêm nhiệm</b> là một trong số người của vị trí gốc (ví dụ Tổ trưởng kiêm bốc xếp thì tổ bốc xếp có ' + (g.rows.find(r => r.chucDanh === 'Công nhân bốc xếp') ? g.rows.find(r => r.chucDanh === 'Công nhân bốc xếp').soNguoi + 1 : 'thêm 1') + ' người gồm cả Tổ trưởng). Vị trí mới được tự thêm vào danh sách chức danh ở tab Nhân công; <b>định mức BHLĐ và đơn giá của vị trí mới cần khai</b> ở các mục tương ứng. Tab Nhân công so sánh số người thực tế với định mức này (thiếu, thừa chỉ cảnh báo).' + (g.saved ? '' : ' <b>Đang hiển thị định mức mặc định, bấm Lưu để dùng.</b>') + '</p>' +
    '<div class="wrap"><table class="normTbl" style="min-width:0;table-layout:auto"><thead><tr><th>Vị trí</th><th>Số người</th><th>Kiêm nhiệm</th><th>Nhiệm vụ</th><th><span class="sro">Thao tác</span></th></tr></thead><tbody>' + g.rows.map(row).join('') + row({chucDanh: '', soNguoi: null, kiemNhiem: '', nhiemVu: ''}, 'new') + '</tbody></table></div>' +
    '<datalist id="dbPos">' + HAKDinhMuc.allPositions(db).map(x => '<option value="' + esc(x) + '">').join('') + '</datalist>' +
    '<div class="row" style="margin-top:12px;gap:8px;flex-wrap:wrap"><button class="btn" type="submit">Lưu định mức nhân công</button><button class="btn ghost" type="button" data-act="dbReset">Dùng định mức mặc định</button><span class="mut">Dòng cuối để thêm vị trí mới.</span></div></form></div>';
}
function saveDb(form) {
  const rows = [...form.querySelectorAll('tr[data-db]')].map(tr => ({chucDanh: trim(tr.querySelector('[name=b_cd]').value), soNguoi: trim(tr.querySelector('[name=b_so]').value), kiemNhiem: trim(tr.querySelector('[name=b_km]').value), nhiemVu: trim(tr.querySelector('[name=b_nv]').value)}));
  const r = HAKDinhBien.set(db, rows, HAKDinhMuc); if (!r.ok) { note('Chưa lưu định mức nhân công: ' + r.error, 'err'); return; }
  persist(); note('Đã lưu định mức nhân công: 1 đội ' + HAKDinhBien.tong(db.dinhBien) + ' người.' + (r.them.length ? ' Đã thêm vị trí vào danh sách chức danh: ' + r.them.join(', ') + '. Khai định mức BHLĐ và đơn giá cho các vị trí này.' : ''), r.them.length ? 'warn' : 'ok');
}
/* Định mức thời gian khai thác: 1 ha = ? ngày, hiệu lực từ ngày; kèm năng suất 1 ngày = ? tấn suy ra từ định mức gỗ keo */
function tgCard() {
  const items = HAKDinhMuc.tgItems(db);
  const row = (x, n) => '<tr data-tg="' + n + '"><td><input name="t_tu" value="' + esc(x.tuNgay) + '" placeholder="dd/mm/yyyy" style="width:150px"></td><td><input name="t_ngay" value="' + esc(x.ngayHa == null ? '' : String(x.ngayHa).replace('.', ',')) + '" placeholder="VD: 5" style="width:130px;text-align:right"></td><td class="mut">' + (typeof x.ngayHa === 'number' ? (() => { const k = HAKDinhMuc.keoPick(db, x.tuNgay), ns = k.found ? HAKDinhMuc.nangSuat(k.item.tanHa, x.ngayHa) : null; return ns ? '1 ngày ≈ ' + String(ns).replace('.', ',') + ' tấn' : ''; })() : '') + '</td><td>' + (x.tuNgay ? '<button class="btn ghost sm" type="button" data-act="keoDel">Xóa</button>' : '') + '</td></tr>';
  return '<h2 style="margin-top:24px">Định mức thời gian khai thác: 1 ha = ? ngày</h2><div class="card"><form id="tgForm">' +
    '<p class="mut" style="margin-top:0">Căn cứ <b>1 ha = … ngày</b> để suy ra <b>thời gian khai thác dự kiến</b> của từng rừng (diện tích × ngày/ha, làm tròn lên) và <b>ngày kết thúc dự kiến</b> từ ngày bắt đầu (không tính Chủ nhật). Mỗi định mức có <b>hiệu lực từ ngày</b>, rừng lấy theo ngày bắt đầu khai thác (chưa có ngày thì dùng bản mới nhất). Cột cuối là <b>năng suất 1 ngày = ? tấn</b> = định mức gỗ keo (tấn/ha) ÷ ngày/ha. Rừng có định mức khác thì tự điền ở Thông tin rừng.</p>' +
    '<table class="normTbl" style="min-width:0;table-layout:auto;max-width:620px"><thead><tr><th>Hiệu lực từ ngày</th><th>1 ha = … ngày</th><th>Năng suất</th><th><span class="sro">Thao tác</span></th></tr></thead><tbody>' + items.map(row).join('') + row({tuNgay: '', ngayHa: null}, 'new') + '</tbody></table>' +
    '<div class="row" style="margin-top:12px"><button class="btn" type="submit">Lưu định mức thời gian khai thác</button><span class="mut">Dòng cuối để thêm định mức mới.</span></div></form></div>';
}
function saveTg(form) {
  const rows = [...form.querySelectorAll('tr[data-tg]')].map(tr => ({tuNgay: trim(tr.querySelector('[name=t_tu]').value), ngayHa: trim(tr.querySelector('[name=t_ngay]').value)})).filter(r => r.tuNgay || r.ngayHa);
  const r = HAKDinhMuc.tgSetAll(db, rows); if (!r.ok) { note('Chưa lưu định mức thời gian khai thác: ' + r.error, 'err'); return; }
  persist(); note('Đã lưu định mức thời gian khai thác.');
}
function saveKeo(form) {
  const rows = [...form.querySelectorAll('tr[data-keo]')].map(tr => ({tuNgay: trim(tr.querySelector('[name=k_tu]').value), tanHa: trim(tr.querySelector('[name=k_tan]').value)})).filter(r => r.tuNgay || r.tanHa);
  const r = HAKDinhMuc.keoSetAll(db, rows); if (!r.ok) { note('Chưa lưu định mức gỗ keo: ' + r.error, 'err'); return; }
  persist(); note('Đã lưu định mức gỗ keo.');
}
function saveNorm(form) {
  const dm = {};
  chucDanhAll().forEach((cd, k) => { dm[cd] = {}; BHLD_ITEMS.forEach(([key]) => { dm[cd][key] = trim(form.querySelector('[name="n_' + k + '_' + key + '"]').value); }); });
  const d = HAKDinhMuc.setDate(db, normSel, form.querySelector('[name="tuNgay"]').value);
  if (!d.ok) { note('Chưa lưu: ' + d.error, 'err'); return; }
  HAKDinhMuc.setNorm(db, normSel, dm);
  // sau khi đổi ngày, bản có thể đổi thứ tự: tìm lại theo ngày
  persist();
  note('Đã lưu định mức BHLĐ.');
}
function normAction(act, el) {
  if (act === 'normAddVer') { const r = HAKDinhMuc.addVersion(db, ($('#normNewDate') || {}).value, normSel); if (!r.ok) return note(r.error, 'err'); normSel = r.id; persist(); return note('Đã thêm bản định mức mới, sao chép từ bản trước. Sửa nội dung rồi bấm Lưu.'); }
  if (act === 'normDelVer') { const r = HAKDinhMuc.removeVersion(db, normSel); if (!r.ok) return note(r.error, 'err'); normSel = 'b'; persist(); return note('Đã xóa bản định mức.'); }
  if (act === 'normAddPos') { const r = HAKDinhMuc.addPosition(db, ($('#normNewPos') || {}).value); if (!r.ok) return note(r.error, 'err'); persist(); return note('Đã thêm vị trí “' + r.name + '”. Nhập định mức BHLĐ và đơn giá cho vị trí này.'); }
  if (act === 'normDelPos') { const r = HAKDinhMuc.removePosition(db, el.dataset.name, normUsed); if (!r.ok) return note(r.error, 'err'); persist(); return note('Đã xóa vị trí “' + el.dataset.name + '”.'); }
}

const INFO_FIELDS = [
  ['ma', 'Mã chủ rừng', 'text', true],
  ['danhXung', 'Danh xưng', 'select', true],
  ['ten', 'Họ và tên', 'text', true],
  ['soHopDong', 'Số hợp đồng', 'text', false],
  ['ngayKyHopDong', 'Ngày ký hợp đồng (dd/mm/yyyy)', 'text', false],
  ['cccd', 'CCCD', 'text', true],
  ['ngayCap', 'Ngày cấp CCCD', 'text', true],
  ['noiCap', 'Nơi cấp CCCD', 'text', true],
  ['sdt', 'Số điện thoại', 'text', false],
  ['diaChi', 'Địa chỉ thường trú', 'wide', true]
];
function panelInfo(rec) {
  const errs = rec.id ? infoErrors(rec.info, rec.id) : [];
  const field = ([k, label, type, req]) => {
    const v = rec.info[k] ?? '';
    const lab = '<span class="' + (req ? 'req' : '') + '">' + label + '</span>';
    if (type === 'select') return '<label>' + lab + '<select name="' + k + '"><option value="">—</option>' +
      ['Ông', 'Bà'].map(o => '<option' + (v === o ? ' selected' : '') + '>' + o + '</option>').join('') + '</select></label>';
    if (type === 'wide') return '<label style="grid-column:1/-1">' + lab + '<input name="' + k + '" value="' + esc(v) + '"></label>';
    return '<label>' + lab + '<input name="' + k + '" value="' + esc(v) + '"' + (type === 'number' ? ' inputmode="numeric"' : '') + '></label>';
  };
  return '<div class="card"><h3 style="margin-top:0">Thông tin chủ rừng</h3>' +
    '<p class="mut" style="margin-top:0">Hồ sơ mở theo chủ rừng. Thông tin này in vào bên A của mọi hợp đồng.</p>' +
    '<form id="infoForm" class="grid">' + INFO_FIELDS.map(field).join('') +
    '<div style="grid-column:1/-1" class="row"><button class="btn" type="submit">Lưu thông tin</button></div></form></div>' +
    (rec.info && errs.length && rec.id ? '<div class="msg warn">Còn thiếu: ' + esc(errs.join('; ')) + '</div>' : '');
}

function panelImport(kind, rec) {
  const M = {nc: {name: 'NHAN_CONG', at: 'ncAt', file: 'ncFile', arr: 'nc', title: 'Nạp file nhân công'},
    dx: {name: 'DOI_XE', at: 'dxAt', file: 'dxFile', arr: 'dx', title: 'Nạp file vận chuyển'},
    pc: {name: 'PHIEU_CAN', at: 'pcAt', file: 'pcFile', arr: 'pc', title: 'Nạp file phiếu cân (mỗi chuyến một dòng)'}}[kind];
  const name = M.name, at = rec[M.at], file = rec[M.file], count = (rec[M.arr] || []).length;
  return '<div class="card"><div class="row" style="justify-content:space-between">' +
    '<div><h3 style="margin:0">' + M.title + '</h3>' +
    '<div class="mut">Sheet ' + name + '. ' + (count ? 'Đã nạp ' + count + ' dòng' + (file ? ' từ ' + esc(file) : '') + (at ? ' lúc ' + esc(at) : '') : 'Chưa có dữ liệu.') + '</div></div>' +
    '<div class="row"><button class="btn ghost sm" data-act="tpl" data-kind="' + kind + '" title="File mẫu có trang HUONG_DAN giải thích từng cột, danh sách chọn và ví dụ">Tải file mẫu (có hướng dẫn)</button>' +
    '<label class="btn sm" style="cursor:pointer">Chọn file Excel<input type="file" accept=".xlsx,.xls" data-file="' + kind + '" hidden></label>' +
    (count ? '<button class="btn danger sm" data-act="clear" data-kind="' + kind + '">Xóa dữ liệu</button>' : '') + '</div></div></div>';
}

