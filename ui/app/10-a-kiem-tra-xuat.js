/* ========== Kiểm tra hồ sơ trước khi xuất: dùng lại gate/checklist FSC, nhóm thành “chặn xuất” và “cần đối chiếu”, kèm số phiếu/trường và liên kết đến đúng tab ========== */
/* exportCheck có nhớ tạm trong MỘT lượt xử lý (cùng đối tượng job, chưa có thay đổi dữ liệu nào xen vào): gate, nút tải, mục quy trình, gói ZIP cùng đọc một danh sách mà không tính lại */
/* B7: nhớ tạm theo PHIÊN BẢN DỮ LIỆU (dataVer, ui/app/02): hồ sơ dựng từ lô (jobView / stJob có khóa ẩn __vk) nhớ theo (khóa, dataVer, db); hồ sơ khác (hồ sơ con của đội…) nhớ theo chính đối tượng.
 * Dữ liệu đổi (dataVer tăng) hoặc db bị thay (khôi phục, nạp lại) thì tính lại. Chỉ mục chéo lô dựng một lần cho mỗi phiên bản dữ liệu. */
let ktNho = {ver: -1, db: null, theoKhoa: new Map(), theoDoiTuong: new WeakMap(), khac: new WeakMap()}, cheoNho = null;
const ktXoaNho = () => doiDuLieu();   // giữ tên cũ cho nơi đang gọi
const ktMoi = () => { if (ktNho.ver !== dataVer || ktNho.db !== db) ktNho = {ver: dataVer, db, theoKhoa: new Map(), theoDoiTuong: new WeakMap(), khac: new WeakMap()}; return ktNho; };
function cheoCtx() { if (!cheoNho || cheoNho.db !== db || cheoNho.ver !== dataVer) cheoNho = {db, ver: dataVer, ctx: HAKCheoLo.taoChiMuc(db)}; return cheoNho.ctx; }
/* nhớ tạm chung theo phiên bản dữ liệu cho các phép tính theo lô (ten phân biệt loại kết quả): gateRaw, tiến độ, … */
function nhoTam(ten, rec, fn) {
  const n = ktMoi(), k = rec && rec.__vk;
  const m = k ? n.theoKhoa : (rec && typeof rec === 'object' ? (n.khac.get(rec) || (n.khac.set(rec, new Map()), n.khac.get(rec))) : null);
  const kk = k ? ten + '|' + k : ten; if (m && m.has(kk)) return m.get(kk);
  const v = fn(); if (m && ktNho === n) m.set(kk, v); return v;
}
{ const g0 = gateRaw; gateRaw = rec => nhoTam('gateRaw', rec, () => g0(rec)); }   // gate, checklist, tiến độ của mọi lô ở danh sách bên trái: không tính lại khi dữ liệu không đổi
function exportCheck(job) {
  const n = ktMoi(), k = job && job.__vk;
  if (k) { const v = n.theoKhoa.get(k); if (v) return v; } else if (job && typeof job === 'object') { const v = n.theoDoiTuong.get(job); if (v) return v; }
  const kt = exportCheckTinh(job);
  if (ktNho === n) { if (k) n.theoKhoa.set(k, kt); else if (job && typeof job === 'object') n.theoDoiTuong.set(job, kt); }   // dữ liệu đổi trong lúc tính: không nhớ kết quả cũ
  return kt;
}
/* đối tượng xuất của một biểu mẫu: biểu mẫu theo đội khai thác → từng đội; theo đội xe → từng đội xe; còn lại cả lô (null) */
function bmPham(rec, code) {
  const K = HAKKiemTra;
  if (K.BM_THEO.doi.includes(code)) { const B = doiOf(rec); return B.multi ? B.doi.map(d => ({loai: 'doi', ten: trim(d.ten)})) : [null]; }
  if (K.BM_THEO.doiXe.includes(code)) { const gs = groupsDX(rec); return gs.length > 1 ? gs.map(x => ({loai: 'doiXe', ten: trim(x.ten)})) : [null]; }
  return [null];
}
/* biểu mẫu `code` còn xuất được cho ít nhất một đội / đội xe (hoặc cho cả lô) — quyết định DUY NHẤT từ danh sách mục chặn của exportCheck */
const bmConDuoc = (rec, kt, code) => bmPham(rec, code).some(p => !HAKKiemTra.chanCho(kt.chan, code, p).length);
/* nút của MỘT đội xe (gr) cho biểu mẫu `code`: không bị chặn đối với đúng đội xe đó */
const bmXeOk = (rec, code, gr) => !HAKKiemTra.chanCho(exportCheck(rec).chan, code, groupsDX(rec).length > 1 ? {loai: 'doiXe', ten: trim(gr.ten)} : null).length;
/* file của một lần xuất bị chặn không? f.path bắt đầu bằng mã biểu mẫu (NN_); f.pham = {loai, ten} của đội / đội xe nếu có */
function bmFileBiChan(kt, f) { const m = /^(\d\d)_/.exec(f && f.path || ''); return m ? HAKKiemTra.chanCho(kt.chan, m[1], f.pham || null).length > 0 : false; }
/* đánh dấu file bị chặn (f.biChan): xuất lẻ và gói ZIP bỏ file này, đợt 2 không tải; vị trí file trong danh sách không đổi (nút của từng đội xe dùng chỉ số) */
function bmDanhDau(rec, files) { const kt = exportCheck(rec); files.forEach(f => { if (bmFileBiChan(kt, f)) f.biChan = true; }); return files; }
function exportCheckTinh(job) {
  const g = gateRaw(job), ex = job.exp || {}, i = job.info, items = [];
  /* MỘT dạng mục cho mọi quy tắc (src/kiemtra.js): mức, nhóm, đối tượng (lô / đội / đội xe / dòng), biểu mẫu bị ảnh hưởng, nơi sửa. kind và go giữ cho các màn đang đọc tên cũ */
  const add = (kind, nhom, text, ref, go, doiTuong) => { const m = HAKKiemTra.muc({kind, nhom, text, ref, doiTuong, noiSua: go || {ftab: 'finfo'}}); items.push(Object.assign(m, {kind: m.muc, go: m.noiSua})); };
  const pcRow = n => (job.pc || []).find(r => String(r._row) === String(n));
  // thông tin chủ rừng, rừng, đơn giá
  infoErrors(i, job.id).forEach(e => add('chan', 'Thông tin chủ rừng', e, '', {tab: 'info'}));
  forestErrors(i, job.fid).forEach(e => add('chan', 'Thông tin rừng', e, '', {ftab: 'finfo'}));
  giaErrorsRec(job).forEach(e => { const m = /^Đội “([^”]*)”: /.exec(e); add('chan', 'Hình thức, đơn giá', e, '', {ftab: 'nc'}, m ? {loai: 'doi', ten: m[1]} : null); });   // từng đội theo hình thức của đội
  // mã lô trùng ở dữ liệu cũ: liệt kê đủ các lô khớp để đối chiếu, không tự sửa
  HAKLoRung.duplicateGroups(db).filter(x => x.lots.some(l => l.forest === job.fid)).forEach(x => add('chan', 'Mã lô trùng (dữ liệu cũ)',
  'Mã “' + x.ma + '” đang dùng cho ' + x.lots.length + ' lô: ' + x.lots.map(l => l.lo + ' (chủ ' + l.chu + '; ' + l.nc + ' nhân công, ' + l.dx + ' xe, ' + l.pc + ' phiếu cân)').join('; ') + '. Đổi mã các lô thừa ở tab Thông tin rừng, dữ liệu không bị đổi trước khi bạn xác nhận.', x.ma, {ftab: 'finfo'}));
  // chồng lấn giữa các lô (src/cheolo.js): phiếu cân trùng, xe trùng giờ, người ở hai lô, lệch sản lượng dự kiến
  try { HAKCheoLo.kiemTra(db, job.id, job.fid, {chiMuc: cheoCtx()}).forEach(x => add(x.kind, x.nhom, x.text, x.ref, x.go)); } catch (e) { /* không kiểm được chéo lô: bỏ qua, không chặn */ }
  try { HAKSoVB.trung(db, job.id, job.fid).forEach(x => add('doi', 'Số văn bản trùng', 'Số “' + x.so + '” cũng đang dùng ở lô ' + x.ma + ': hai văn bản không được trùng số.', x.so, {ftab: 'xuat'})); } catch (e) { /* bỏ qua */ }
  try { HAKSoVB.trungTrongLo(curForest() && curForest().id === job.fid ? curForest() : ((db.rs[job.id] || {}).forests || {})[job.fid] || {}).forEach(x => add('doi', 'Số văn bản trùng',
  'Hai đội của lô cùng dùng số “' + x.so + '” (đội “' + x.ten + '”): kiểm tra, số của đội đã xóa có thể bị cấp lại ở dữ liệu cũ.', x.so, {ftab: 'xuat'})); } catch (e) { /* bỏ qua */ }
  /* số văn bản theo đội xe (src/sovb.js): hai đội xe có SỐ RIÊNG trùng nhau → chặn BM-04, BM-09, BM-10 của các đội đó, nêu đủ các đội; các đội cùng in số chung của lô → đối chiếu, mời xác nhận số trên giấy / cấp số */
  try { const fLo = curForest() && curForest().id === job.fid ? curForest() : ((db.rs[job.id] || {}).forests || {})[job.fid] || {}, gs = job.hdvc ? groupsDX(job).filter(x => x.hd) : [], tenG = id => (gs.find(x => x.hd.id === id) || {}).ten || '';
    HAKSoVB.trungDoiXe(fLo, gs.map(x => x.hd.id)).forEach(x => { const ds = x.doi.map(d => '“' + d.ten + '”').join(', ');
      if (x.loai === 'rieng') x.doi.forEach(d => add('chan', 'Số văn bản đội xe trùng', 'Các đội xe ' + ds + ' cùng lưu số “' + x.so + '” cho ' + x.mau + ': mỗi đội xe là một bên vận chuyển riêng nên không được trùng số. Sửa số riêng của từng đội ở tab Vận chuyển (phần mềm không tự đổi số đã lưu).',
      x.so, {ftab: 'dx'}, {loai: 'doiXe', ten: tenG(d.id)}));
      else add('doi', 'Số văn bản đội xe dùng chung', 'Các đội xe ' + ds + ' đang cùng in số “' + x.so + '” cho ' + x.mau + ' (số chung của lô). Mở Sổ văn bản (tab Xuất hồ sơ): xác nhận số trên giấy cho đội đã in, hoặc cấp số riêng cho đội chưa có số.', x.so, {ftab: 'xuat'}); }); } catch (e) { /* bỏ qua */ }
  // nhân công, định mức, tuổi
  g.nc.errs.forEach(e => add('chan', 'Nhân công', e, (e.match(/^Dòng \d+/) || [''])[0], {ftab: 'nc'}));
  g.normErrs.forEach(e => add('chan', 'Định mức BHLĐ', e, '', {view: 'norm'}));
  // người dưới 18 tuổi: đã là lỗi của từng dòng nhân công (checkNC) nên chặn mọi biểu mẫu có tên người đó
  // vận chuyển
  g.dx.errs.forEach(e => add('chan', 'Đội xe', e, (e.match(/^Dòng \d+/) || [''])[0], {ftab: 'dx'}));
  groupsDX(job).forEach(gr => hanLoiOf(job, gr).forEach(v => add('chan', 'Giấy tờ xe hết hạn lúc chạy phiếu', 'Đội xe “' + gr.ten + '”: ' + HAKGiayTo.text(v) + '. BM-09 và BM-10 của đội xe này bị chặn: sửa hạn giấy tờ của xe hoặc ngày cân của phiếu nếu nhập sai.',
  'Phiếu ' + (v.soPhieu || '(không số)'), {ftab: 'dx', focus: 'pc'}, {loai: 'doiXe', ten: gr.ten})));
  g.dx.warns.forEach(e => add('doi', 'Giấy tờ xe', e, (e.match(/^Dòng \d+/) || [''])[0], {ftab: 'dx'}));
  const vcm = (i.vanChuyen || {}).mode;
  g.vc.forEach(e => add('chan', 'Cước vận chuyển', e, 'Đơn giá vận chuyển', {ftab: 'finfo', muc: 'giaohang'}));
  // phiếu cân: thiếu/sai ngày, trùng, biển số chưa ghép, khối lượng…
  g.pc.errs.forEach(e => {
    const m = /^Dòng (\d+): (.*)$/.exec(e), r = m && pcRow(m[1]), so = r ? (r.soPhieu || '(không số)') : '', msg = m ? m[2] : e;
    if (/giống hệt phiếu đã có ở lô/.test(msg)) return;   // đã có mục “Chéo lô: phiếu cân trùng” (src/cheolo.js)
    const nhom = /ngày|dd\/mm|không có thật/i.test(msg) ? 'Phiếu cân: ngày thiếu hoặc sai' : /trùng/i.test(msg) ? 'Phiếu cân trùng số' : /Biển|biển/.test(msg) ? 'Phiếu cân: biển số chưa ghép với xe' : 'Phiếu cân';
    add('chan', nhom, m ? 'Dòng ' + m[1] + ': ' + msg : msg, so ? 'Phiếu ' + so : '', {ftab: 'dx', focus: 'pc'});
  });
  g.pc.warns.forEach(e => add('doi', /lệch/.test(e) ? 'Chênh lệch sản lượng' : 'Phiếu cân', e, '', {ftab: 'dx', focus: 'pc'}));
  const pcVC = doiChieuPcVanChuyen(job);
  if (pcVC.canSua.length) {
    const first = pcVC.canSua[0], kg = totalKg(pcVC.canSua.map(x => x.p));
    add('chan', 'Phiếu cân: biển số chưa ghép với xe', pcVC.canSua.length + ' phiếu (' + fmt(kg) + ' kg) cần đối chiếu hợp đồng hoặc xe trước khi xuất BM-09/10.',
      'Phiếu ' + (first.p.soPhieu || '(không số)'), {ftab: 'dx', focus: 'pc', hdId: first.hdId, pcIndex: first.index});
  }
  // điểm đến theo địa chỉ giao đã chốt
  const dd = destOf(job), dr = HAKMuaHang.drift(i, db.congTy), mis = HAKMuaHang.mismatches(job.pc || [], dd.src === 'congty' ? dd : null);
  if (!dd.text) add('doi', 'Địa chỉ giao hàng', 'Chưa chọn địa chỉ giao hàng đã chốt: BM-04, BM-09, BM-10 sẽ in dòng chấm.', 'Địa điểm vận chuyển đến', {ftab: 'dx', focus: 'mua'});
  else if (dd.src === 'thucong') add('doi', 'Địa chỉ giao hàng', 'Đang dùng điểm đến nhập tay cũ “' + dd.text + '”. Chọn địa chỉ giao của công ty để thay (chỉ đổi sau khi bạn xác nhận).', 'Địa điểm vận chuyển đến', {ftab: 'finfo', focus: 'mua'});
  if (dr.state === 'thaydoi') add('doi', 'Địa chỉ giao hàng',
  'Hồ sơ công ty đã đổi (' + dr.why + '). Hồ sơ rừng vẫn giữ “' + dr.saved.diaChi + '”; hồ sơ công ty hiện là “' + (dr.current.diaChi || '(không còn địa chỉ này)') + '”. Xem cũ/mới và xác nhận ở Thông tin rừng → Công ty, địa chỉ giao và cước.', 'Địa điểm vận chuyển đến', {ftab: 'finfo', focus: 'mua'});
  if (mis.length) mis.forEach(p => add('doi', 'Nơi giao trên phiếu khác địa chỉ giao đã chốt', 'Nơi giao ghi trên phiếu: “' + p.noiGiao + '”; địa chỉ đã chốt: “' + dd.diaChi + '”. Nội dung phiếu giữ nguyên.', 'Phiếu ' + (p.soPhieu || '(không số)'), {ftab: 'dx', focus: 'pc'}));
  if (vcm === 'tanKm' && dd.text && (dr.state === 'thaydoi' || !(HAKCuLy.eff(i).km > 0))) add('doi', 'Cự ly vận chuyển',
  !(HAKCuLy.eff(i).km > 0) ? 'Cước tấn/km cần cự ly nhưng chưa có: ' + HAKCuLy.eff(i).thieu + '.' : 'Cước tính theo tấn/km: khi đổi điểm đến hãy kiểm tra lại cự ly (' + HAKCuLy.eff(i).km + ' km, ' + HAKCuLy.eff(i).nguon + '). Phần mềm không tự sửa cự ly nhập tay hay đơn giá.', 'Cự ly', {ftab: 'finfo'});
  ((job.doi) || []).forEach(d => { const c = d && d.benNhanKhoanBan; if (!c || isDirect(infoTeam(job, d))) return; const thieu = benNhanKhoanThieu(c);   // 3.0: bên nhận khoán đã chọn mà bản chụp thiếu thông tin in
    if (thieu.length) add('chan', 'Bên nhận khoán thiếu thông tin', 'Đội “' + (d.ten || 'khai thác') + '”: bên nhận khoán “' + c.ten + '” còn thiếu ' + thieu.join(', ') + ' — bổ sung ở Cài đặt → Danh mục đối tượng rồi bấm “Cập nhật theo danh mục” ở hợp đồng nhân công.', 'Bên nhận khoán', {
    ftab: 'nc'}); });
  { const bd = doiOf(job); if (bd.pcChuaGan) add('doi', 'Phiếu cân chưa gán đội',
  'Lô có ' + bd.doi.length + ' đội nhưng ' + bd.pcChuaGan + ' phiếu cân chưa gán đội: khối lượng từng đội đang ' + (bd.klNguon === 'nhap' ? 'theo số nhập tay của hồ sơ cũ' : 'chia theo số người') + '. Gán đội cho phiếu cân (gán hàng loạt theo bộ lọc) để khối lượng đội lấy đúng theo phiếu cân.', '', {
  ftab: 'dx', focus: 'pc'}); }
  { const bd = doiOf(job); if (bd.klLoi) add('doi', 'Số đội', 'Khối lượng thực tế từng đội: ' + bd.klLoi + '. BM-08 và BM-14 của từng đội sẽ là bản nháp cho đến khi sửa.', 'Khối lượng thực tế từng đội', {ftab: 'finfo'}); }
  { const rows = viTriRowsTai((job.info || {}).tuNgay), bd = doiOf(job);   // theo ĐỘI THẬT (bảng Nhân công khai thác), không chia lại theo cột chữ
    if (rows.ngayLoi) add('chan', 'Định mức nhân công: ngày bắt đầu sai', rows.ngayLoi, '', {ftab: 'finfo'}); else (bd.multi ? bd.doi.map(d => ({lb: ' của đội “' + d.ten + '”', ten: d.ten, nc: [d.tt, ...d.members]})) : [{lb: '', nc: job.nc || []}]).forEach(u => { const sc = HAKDinhBien.soSanh(rows, u.nc);
      if (u.nc.length && (sc.lech.length || sc.ngoai.length)) add('doi', 'Định mức nhân công', 'Số người' + u.lb + ' khác định mức (1 đội ' + sc.can + ' người, hiện có ' + sc.co + '): ' + HAKDinhBien.lechText(sc) + '.', 'Định mức nhân công', {ftab: 'nc'}, u.ten ? {loai: 'doi', ten: u.ten} : null);
      }); }
  { const L = tgLechOf(i, job.pc, nDoiOf(i, job.nc)); if (L && L.canhBao) add('doi', 'Thời gian khai thác', tgLechText(i, L), 'Thời gian khai thác', {ftab: 'finfo'}); }
  // mâu thuẫn, chồng lấn khi nhập liệu (ngày ở nhiều ô, khoảng ngày đảo, số/năm lệch, phiếu cân ngoài thời gian)
  g.nhapLieu.forEach(x => add(x.kind, x.nhom, x.text, x.ref, x.go, x.doiTuong));   // của lô, từng đội và từng đội xe
  // các mục checklist FSC còn lại chưa được xét ở trên
  const covered = ['Thông tin rừng đầy đủ', 'Nhân công hợp lệ', 'Hình thức, đơn giá lương', 'Định mức BHLĐ theo chức danh', 'Người lao động đủ 18 tuổi', 'Vận chuyển hợp lệ', 'Giấy tờ xe, GPLX còn hạn', 'Giá vận chuyển', 'Công ty mua hàng và điểm đến vận chuyển', 'Phiếu cân vận chuyển hợp lệ'];
  const goOf = lb => /Tọa độ/.test(lb) ? {ftab: 'finfo', muc: 'toado'} : /Giấy tờ pháp lý/.test(lb) ? {ftab: 'finfo', muc: 'giay'} : /Biên bản/.test(lb) ? {ftab: 'xuat'} : {ftab: 'finfo', muc: 'chung'};
  checklistRung(job).filter(x => !x.ok && !covered.includes(x.label)).forEach(x => add(x.warn ? 'doi' : 'doi', 'Checklist FSC', x.label + (x.hint ? ': ' + x.hint : ''), x.label, goOf(x.label)));
  // thiếu dữ liệu cơ bản (chưa nạp)
  if (!job.nc.length) add('doi', 'Nhân công', 'Chưa nạp nhân công của lô.', '', {ftab: 'nc'});
  if (!job.dx.length) add('doi', 'Đội xe', 'Chưa nạp đội xe của lô.', '', {ftab: 'dx'});
  if (!(job.pc || []).length) add('doi', 'Phiếu cân', 'Chưa nạp phiếu cân của lô.', '', {ftab: 'dx', focus: 'pc'});
  return {items, chan: items.filter(x => x.muc === 'chan'), doi: items.filter(x => x.muc === 'doi'), g, tomTat: HAKKiemTra.tomTat(items), bieuMauBiChan: HAKKiemTra.bieuMauBiChan(items)};
}
