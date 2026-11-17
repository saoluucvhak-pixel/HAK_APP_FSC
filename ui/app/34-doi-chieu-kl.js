/* ========== 3.0: ĐỐI CHIẾU KHỐI LƯỢNG TRƯỚC KHI IN BM-09, BM-10 ==========
 * Phân loại mọi phiếu cân ĐÃ LƯU của rừng:
 *  - trong mẫu: phiếu vào biên bản / bảng thanh toán của một hợp đồng vận chuyển (xe hợp lệ của hợp đồng, hợp đồng có người ký, giấy tờ xe còn hạn);
 *  - cần xử lý: phiếu thuộc phạm vi mẫu (ngày cân và khối lượng hợp lệ) nhưng chưa vào mẫu vì thiếu xe hoặc hợp đồng, hợp đồng thiếu người ký, giấy tờ xe hết hạn;
 *  - ngoài phạm vi theo nghiệp vụ: ngày cân sai, khối lượng không có, phiếu giống hệt phiếu lô khác (không thuộc mẫu nào).
 * Bản đủ BM-09/10 thành BẢN NHÁP khi còn phiếu cần xử lý (src/bannhap.js pcDoiChieu); in đè / in đủ đợt 2 bị chặn kèm hướng xử lý; in nền theo trạng thái đã lưu. */
function doiChieuKL(rec) {
  const pc = (rec.pc || []).filter(Boolean), kg = p => (typeof p.kl === 'number' && p.kl > 0 ? Math.round(p.kl * 1000) : 0);
  let trung = new Set(); try { trung = new Set(HAKCheoLo.phieuTrung(db, rec.id, rec.fid, pc, cheoCtx()).map(x => x.p)); } catch (e) { /* không đối chiếu chéo lô được: bỏ qua */ }
  const ngoaiNV = p => !HAKDates.isValid(p.ngay) || !kg(p) || trung.has(p);   // ngoài phạm vi mẫu theo nghiệp vụ: không tính vào mẫu dù khớp xe
  const trong = new Set(); groupsPC(rec).forEach(g => tripsOf(rec, g).forEach(p => { if (!ngoaiNV(p)) trong.add(p); }));
  const thieuKy = rec.hdvc ? doiXeThieuKy(rec) : new Set(), gs = groupsDX(rec), hdTen = id => { const h = (rec.hdvc || []).find(x => x.id === id); return h ? tenDoiVc(rec, h) + (soHdVc(rec, h) ? ' (số ' + soHdVc(rec, h) + ')' : '') : id; };
  const lyDo = p => {
    if (!HAKDates.isValid(p.ngay)) return {ngoai: true, ly: 'ngày cân không hợp lệ (' + (p.ngay || 'trống') + ')'};
    if (!kg(p)) return {ngoai: true, ly: 'không có khối lượng'};
    if (trung.has(p)) return {ngoai: true, ly: 'giống hệt phiếu đã có ở lô khác'};
    const d = doiXeOfPc(rec, p), coXe = d && d.xe && (!p.hdvcId || d.xe.hdvcId === p.hdvcId);
    if (!p.hdvcId && !d) return {ly: 'chưa có hợp đồng: BKS ' + (p.bienSo || '(trống)') + ' không khớp xe nào của rừng'};
    if (p.hdvcId && !coXe) return {ly: 'chưa có xe hợp lệ trong hợp đồng ' + hdTen(p.hdvcId)};
    const hId = p.hdvcId || (d && d.hd && d.hd.id);
    if (hId && thieuKy.has(hId)) return {ly: 'hợp đồng ' + hdTen(hId) + ' chưa có người ký'};
    const g = gs.find(x => x.hd && x.hd.id === hId); if (g && hanLoiOf(rec, g).length) return {ly: 'xe ' + (d && d.xe ? d.xe.bienSo : '') + ' hết hạn giấy tờ lúc chạy phiếu (hợp đồng ' + hdTen(hId) + ')'};
    return {ly: 'chưa vào biên bản của hợp đồng ' + hdTen(hId)};
  };
  const can = [], ngoai = [];
  pc.forEach(p => { if (trong.has(p)) return; const r = lyDo(p); (r.ngoai ? ngoai : can).push({p, ly: r.ly}); });
  const sum = a => a.reduce((s, x) => s + kg(x.p || x), 0);
  return {tong: {n: pc.length, kg: sum(pc)}, trong: {n: trong.size, kg: sum([...trong])}, can: {n: can.length, kg: sum(can), ds: can}, ngoai: {n: ngoai.length, kg: sum(ngoai), ds: ngoai}};
}
function doiChieuKLHtml(rec) {
  const d = doiChieuKL(rec); if (!d.tong.n) return '';
  const dong = (x, loai) => '<tr data-dcpc="' + esc(x.p.id || x.p._id || '') + '"><td>' + esc(x.p.soPhieu || '(không số)') + '</td><td>' + esc(x.p.bienSo || '') + '</td><td style="text-align:right">' + fmtT(Math.round((x.p.kl || 0) * 1000)) + '</td><td>' + esc(x.ly) + '</td><td>' +
    (loai === 'can' ? '<button class="btn ghost sm" data-act="pcMoDong" data-pc="' + esc(x.p.id || '') + '" data-so="' + esc(x.p.soPhieu || '') + '">Mở dòng</button>' : '') + '</td></tr>';
  return '<div class="card" id="dcKL"><h3 style="margin-top:0">Đối chiếu khối lượng trước khi in BM-09, BM-10</h3>' +
    '<table id="dcKLTong" style="max-width:640px"><tr><td>Phiếu cân đã lưu của rừng</td><td style="text-align:right"><b id="dcTongN">' + d.tong.n + '</b> phiếu</td><td style="text-align:right"><b id="dcTongKg">' + fmtT(d.tong.kg) + '</b> tấn</td></tr>' +
    '<tr><td>Đã vào mẫu (biên bản, bảng thanh toán)</td><td style="text-align:right"><b id="dcTrongN">' + d.trong.n + '</b> phiếu</td><td style="text-align:right"><b id="dcTrongKg">' + fmtT(d.trong.kg) + '</b> tấn</td></tr>' +
    '<tr' + (d.can.n ? ' style="color:var(--err)"' : '') + '><td>Thuộc phạm vi mẫu nhưng thiếu điều kiện (cần xử lý)</td><td style="text-align:right"><b id="dcCanN">' + d.can.n + '</b> phiếu</td><td style="text-align:right"><b id="dcCanKg">' + fmtT(d.can.kg) + '</b> tấn</td></tr>' +
    '<tr class="mut"><td>Ngoài phạm vi mẫu theo nghiệp vụ</td><td style="text-align:right"><b id="dcNgoaiN">' + d.ngoai.n + '</b> phiếu</td><td style="text-align:right"><b id="dcNgoaiKg">' + fmtT(d.ngoai.kg) + '</b> tấn</td></tr></table>' +
    (d.can.n ? '<div class="msg err" id="dcCanMsg">Còn ' + d.can.n + ' phiếu (' + fmtT(d.can.kg) + ' tấn) chưa vào BM-09/10: bản đủ là BẢN NHÁP, in đè và in đủ chính thức bị chặn. Mở từng dòng để chọn xe, hợp đồng, người ký hoặc giấy tờ xe rồi lưu.</div>' : '<div class="msg ok" id="dcDuMsg">Mọi phiếu thuộc phạm vi mẫu đã vào BM-09/10.</div>') +
    (d.can.n + d.ngoai.n ? '<div class="wrap" style="max-height:300px"><table id="dcKLDs"><thead><tr><th>Số phiếu</th><th>BKS nguồn</th><th style="text-align:right">KL (tấn)</th><th>Lý do</th><th></th></tr></thead><tbody>' + d.can.ds.map(x => dong(x, 'can')).join('') + d.ngoai.ds.map(x => dong(x, 'ngoai')).join('') + '</tbody></table></div>' : '') + '</div>';
}
/* mở đúng dòng phiếu: tab Vận chuyển, hợp đồng của phiếu (hoặc mọi phiếu của rừng), cuộn và đánh dấu dòng */
function pcMoDong(id, so) {
  const f = curForest(); if (!f) return; const p = (f.pc || []).find(x => (id && x.id === id) || (!id && x.soPhieu === so)); if (!p) return;
  ftab = 'dx'; if (p.hdvcId && (f.hdvc || []).some(h => h.id === p.hdvcId)) { hdMoDat('dx', p.hdvcId); pcTatCa = false; } else { const h = HAKModel.hdOrder({dx: f.dx || [], hdvc: f.hdvc || []})[0]; if (h) hdMoDat('dx', h.id); pcTatCa = true; }
  render();
  const tr = document.querySelector('#stTbl_pc tr[data-rid="' + (p.id || p._id) + '"]'); if (tr) { tr.classList.add('hlRow'); tr.scrollIntoView({block: 'center'}); const b = tr.querySelector('select,button'); if (b) b.focus(); }
}
document.addEventListener('click', e => { const el = e.target && e.target.closest && e.target.closest('[data-act=pcMoDong]'); if (el) pcMoDong(el.dataset.pc, el.dataset.so); });
