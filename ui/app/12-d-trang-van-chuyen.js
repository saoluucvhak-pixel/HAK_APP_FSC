function panelVanChuyen(rec) {
  const h = rec.hdvc ? hdMoHopLe('dx', rec) : null;
  if (!h && rec.hdvc?.length) return panelDsVC(rec) + '<button class="btn ghost sm" data-muc-lo="doichieu" data-lo-nhom="dx">Phiếu chưa thuộc hợp đồng</button>' +
    (mucLoDangMo('dx') === 'doichieu' ? panelDoiChieuPhieuChuaGan(rec) : panelPhieuCan(rec));
  const xe = rec.dx.filter(r => !h || r.hdvcId === h.id);
  const pc = (rec.pc || []).filter(r => !h || r.hdvcId === h.id);
  return (h ? hdDau('dx', rec, tenDoiVc(rec, h), soHdVc(rec, h)) : panelDsVC(rec)) + khungMucLo('dx', [
    ...(h ? [['chung', 'Hợp đồng, bên ký, cước', () => panelHdvc(rec)]] : []),   // phiếu #06 (D-08): nhãn ngắn, không xuống dòng ở 150%
    ['xe', 'Xe và tài xế', () => panelDX(rec, h), xe.length],
    ['phieu', 'Phiếu cân', () => panelPhieuCan(rec), pc.length + ' · ' + fmtTan(klPhieu(pc)) + ' tấn'],
    ['vanban', 'Số và ngày văn bản', () => panelHdvcVB(rec)]
  ], h ? 'chung' : pc.length ? 'phieu' : 'xe');
}
function panelDoiChieuPhieuChuaGan(rec) {
  const ids = new Set((rec.hdvc || []).map(h => h.id));
  const rows = (rec.pc || []).filter(p => !ids.has(p.hdvcId));
  return '<div class="card"><h3>Phiếu chưa thuộc hợp đồng (' + rows.length + ')</h3>' +
    (rows.length ? '<div class="wrap"><table><thead><tr><th>Số phiếu</th><th>Ngày cân</th><th>Biển kiểm soát</th><th>Hợp đồng và xe</th><th></th></tr></thead><tbody>' +
      rows.map(p => '<tr><td>' + esc(p.soPhieu) + '</td><td>' + esc(p.ngay) + '</td><td>' + esc(p.bienSo) + '</td>' + pcCotHd(rec, p) +
        '<td><button class="btn ghost sm" data-act="stEdit" data-kind="pc" data-i="' + rec.pc.indexOf(p) + '">Sửa phiếu</button></td></tr>').join('') + '</tbody></table></div>' : '<p>Không có phiếu cần gán.</p>') + '</div>';
}
function panelDX(rec, hMo) {
  const c = checkDX(rec);
  /* 3.0: tab mở danh sách hợp đồng vận chuyển (công ty mua hàng, cước chung của lô ở đây); chọn một hợp đồng → trang chi tiết (thông tin, xe và tài xế).
   * Rừng chưa có hợp đồng nào: thêm xe ngay dưới danh sách, xe tự vào hợp đồng theo người ký như trước. */
  const head = panelImport('dx', rec) + stBar('dx', rec) + stErrBox() +
    (hMo ? '<div class="row" style="margin:6px 0" id="xeLoc">' + (xeTatCa ? '<span class="mut">Đang xem mọi xe của rừng.</span> <button class="btn ghost sm" data-act="xeTheoHd">Chỉ xe của hợp đồng này</button>' :
    '<h3 style="margin:0 8px 0 0">Xe và tài xế của hợp đồng</h3><button class="btn ghost sm" data-act="xeTatCa">Xem mọi xe của rừng</button>') + '</div>' : '');
  if (!rec.dx.length && !stCur()) return head + '<div class="empty">Chưa có xe. Bấm “+ Thêm xe” để chọn từ Danh mục xe.</div>';
  const only = hMo && !xeTatCa ? r => r.hdvcId === hMo.id || !(rec.hdvc || []).some(h => h.id === r.hdvcId) : null;   // trang chi tiết: xe của hợp đồng này (và xe chưa thuộc hợp đồng nào)
  return head + issuesBox(c.errs, c.warns) + stTable('dx', rec, ['Chủ xe', 'Biển kiểm soát', 'Loại xe', 'Người ký HĐ', 'Đội xe', 'Tài xế', 'Số GPLX', 'Hạn GPLX', 'Hạn bảo hiểm', 'Kiểm định'],
    r => '<td>' + esc(r.chuXe) + '</td><td>' + esc(r.bienSo) + '</td><td>' + esc(r.loaiXe) + '</td><td>' + (driverSigns(r) ? 'Tài xế' : 'Chủ xe') + '</td><td>' + hdCell(rec,
    r) + '</td><td>' + esc(r.taiXe) + '</td><td>' + esc(r.gplx) + '</td><td>' + esc(r.hanGplx) + '</td><td>' + esc(r.hanBH) + '</td><td>' + esc((r.kdTu || r.kdDen) ? (r.kdTu || '…') + ' – ' + (r.kdDen || '…') : '') + '</td>', c, null, only);
}

/* Ngày cân 2: số đã nhập thì hiện nguyên; không có thì suy từ ngày cân 1 và giờ cân (giờ cân 2 sớm hơn giờ cân 1 = qua nửa đêm, +1 ngày) và ghi “suy ra” */
function ngay2Cell(r) {
  const n = HAKPhieuCan.ngay2Of(r); if (!n.ngay) return '';
  return esc(n.ngay) + (n.nguon === 'suy ra' ? '<br><small class="mut" title="Phiếu chưa có ngày cân 2: suy ra từ ngày cân 1 và giờ cân 1, giờ cân 2">suy ra</small>' : n.nguon === 'theo ngày cân 1' ? '<br><small class="mut" title="Thiếu giờ cân nên lấy theo ngày cân 1">theo ngày cân 1</small>' : '');
}
function panelPhieuCan(rec) {
  const c = checkPC(rec), pc = rec.pc || [];
  /* 3.0: phiếu cân thuộc hợp đồng vận chuyển — ở trang danh sách chỉ nêu số phiếu; trang chi tiết có phần Phiếu cân của hợp đồng */
  const hMo = rec.hdvc && rec.hdvc.length ? (rec.hdvc.find(h => h.id === hdMo('dx')) || null) : null;
  if (rec.hdvc && rec.hdvc.length && !hMo) { const chua = pc.filter(p => !p.hdvcId).length;
  return '<div class="card" id="pcDs"><b>Phiếu cân của rừng: ' + pc.length + '</b> <span class="mut">— mở một hợp đồng vận chuyển để xem, nạp, thêm phiếu cân của hợp đồng đó.</span>' + (chua ? '<div class="msg warn" style="margin-top:6px">' + chua +
  ' phiếu chưa thuộc hợp đồng nào (BKS không khớp duy nhất một xe): mở hợp đồng để chọn.</div>' : '') + '</div>';
  }
  const hdOnly = hMo && !pcTatCa ? r => r.hdvcId === hMo.id || !r.hdvcId : null;
  const head = panelImport('pc', rec, hMo ? pcDauHd(rec, hMo) : '', hMo ? pcCongCuHd(hMo) : '') + pcGanBaoHtml() + stBar('pc', rec);
  if (!pc.length && !stCur()) return head + '<div class="empty">Chưa có phiếu cân. Bấm “+ Thêm phiếu cân”, hoặc “Tải file mẫu”, mỗi chuyến một dòng theo phiếu cân nhà máy, rồi nạp lại.</div>';
  const R = '<span style="display:block;text-align:right">', num = (v, f) => typeof v === 'number' ? fmt(v) : '';
  const nhieu = rec.doi && rec.doi.length > 1, tenD = d => d.ten || ('Đội ' + (rec.doi.indexOf(d) + 1));
  const dCell = r => { if (!nhieu) return ''; const d = rec.doi.find(x => x.id === r.doiId), ix = pc.indexOf(r);
    return '<td>' + (stCur() || ix < 0 ? (d ? esc(tenD(d)) : '<span class="pill err">chưa gán</span>') : '<select data-pcdoi="' + ix + '">' + (d ? '' : '<option value="" selected>(chưa gán)</option>') + rec.doi.map(x => '<option value="' + esc(x.id) + '"' + (x === d ? ' selected' : '') + '>' +
    esc(tenD(x)) + '</option>').join('') + '</select>') + '</td>';
    };
  const nxe = groupsDX(rec).length > 1, xCell = r => { if (!nxe) return ''; const d = doiXeOfPc(rec, r), t = d && d.hd ? doiXeTen(rec, d) : ''; return t ? '<br><small class="mut" title="Đội xe (suy ra từ xe của phiếu, chỉ xem)">Đội xe: ' + esc(t) + '</small>' : ''; };   // chỉ xem: đội xe suy ra từ xe của phiếu
  const gan = nhieu && !stCur() ? '<div class="card" id="pcGan"><h3 style="margin-top:0">Gán đội cho phiếu cân <span class="mut" style="font-weight:400">· khối lượng thực hiện của mỗi đội = tổng phiếu cân của đội</span></h3>' +
    '<div class="row" style="flex-wrap:wrap;gap:8px"><label>Từ ngày <input id="pgTu" placeholder="dd/mm/yyyy" style="width:110px"></label><label>Đến ngày <input id="pgDen" placeholder="dd/mm/yyyy" style="width:110px"></label>' +
    '<label>Biển số chứa <input id="pgBien" style="width:110px"></label><label>Số phiếu chứa <input id="pgSo" style="width:110px"></label><label><input type="checkbox" id="pgChua" checked> chỉ phiếu chưa gán</label>' +
    (nxe ? '<label>Đội xe <select id="pgXe"><option value="">(tất cả)</option>' + (rec.hdvc || []).map(h => { const g = groupsDX(rec).find(x => x.hd === h); return g ? '<option value="' + esc(h.id) + '">' + esc(g.ten) + '</option>' : ''; }).join('') + '</select></label>' : '') +
    '<label>Gán vào <select id="pgDoi">' + rec.doi.map(x => '<option value="' + esc(x.id) + '">' + esc(tenD(x)) + '</option>').join('') + '</select></label><button class="btn sm" data-act="pcGanLoat">Gán các phiếu đang lọc</button></div>' +
    '<div class="mut" style="margin-top:4px">' + rec.doi.map(x => esc(tenD(x)) + ': ' + pc.filter(p => p.doiId === x.id).length + ' phiếu, ' + fmtTan(klPhieu(pc.filter(p => p.doiId === x.id))) + ' tấn').join(' · ') + ' · chưa gán: ' + pc.filter(p => !rec.doi.some(x => x.id === p.doiId)).length +
    ' phiếu</div></div>' : '';
  const t = stTable('pc', rec, [...(nhieu ? ['Đội'] : []), ...(hMo ? ['Xe · hợp đồng'] : []), /* phiếu #06 (D-01): tiêu đề một dòng, tên đầy đủ ở title */ ...[['Cân lần 1', 'Cân lần 1: ngày, giờ'], ['Cân lần 2', 'Cân lần 2: ngày, giờ'], ['BKS', 'Biển kiểm soát'], ['Số phiếu', 'Số phiếu cân']].map(([t, d]) => '<span title="' + d + '">' + t + '</span>'),
  ...[['Cân 1 (kg)', 'Cân lần 1 (kg)'], ['Cân 2 (kg)', 'Cân lần 2 (kg)'], ['KL (kg)', 'Khối lượng (kg)'], ['KL (tấn)', 'Khối lượng (tấn)']].map(([t, d]) => R.replace('>', ' title="' + d + '">') + t + '</span>'),
  'Khách hàng', R + 'Đơn giá</span>', R + 'Thành tiền</span>', 'Nơi giao'],
    r => dCell(r) + (hMo ? pcCotHd(rec, r, hMo) : '') + '<td>' + (HAKDates.isValid(r.ngay) ? esc(r.ngay) : esc(r.ngay) + '<br><small style="color:var(--err)">' + esc(HAKDates.why(r.ngay)) + ' (bấm Sửa)</small>') + '<br><span class="mut">' + esc(r.gioCan1 || '') + '</span></td><td>' + ngay2Cell(r) +
    '<br><span class="mut">' + esc(r.gioCan2 || '') + '</span></td><td>' + esc(r.bienSo) + xCell(r) +
      '</td><td>' + esc(r.soPhieu) + '</td><td style="text-align:right">' + num(r.can1) + '</td><td style="text-align:right">' + num(r.can2) +
      '</td><td style="text-align:right">' + (typeof r.klKg === 'number' ? fmt(r.klKg) : (typeof r.kl === 'number' ? fmt(Math.round(r.kl * 1000)) : '')) + '</td><td style="text-align:right">' + (typeof r.kl === 'number' ? fmtT(Math.round(r.kl * 1000)) : esc(r.kl)) +
      '</td><td>' + esc(r.khachHang || '') + '</td><td style="text-align:right">' + num(r.donGia) + '</td><td style="text-align:right">' + num(r.thanhTien) + '</td><td>' + esc(r.noiGiao) + '</td>', c, null, hdOnly);
  return head + gan + issuesBox(c.errs, c.warns) + t.replace('</tbody></table></div>', '</tbody><tfoot><tr><td colspan="' + (9 + (nhieu ? 1 : 0) + (hMo ? 1 : 0)) + '"><b>Tổng ' + (hdOnly ? pc.filter(hdOnly) : pc).length + ' chuyến' + (hdOnly ? ' đang xem' : '') + ' (bản ' + (stCur() ? 'nháp' :
  'đã lưu') + ')</b></td><td style="text-align:right"><b>' + fmtT(totalKg(hdOnly ? pc.filter(hdOnly) : pc)) + ' tấn</b></td><td colspan="5"></td></tr></tfoot></table></div>');
}

