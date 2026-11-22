function panelVanChuyen(rec) {
  const list = HAKModel.hdOrder({dx: rec.dx, hdvc: rec.hdvc || []});
  if (list.length && !hdMoHopLe('dx', rec)) hdMoDat('dx', list[0].id);
  const h = rec.hdvc ? hdMoHopLe('dx', rec) : null;
  const xe = rec.dx.filter(r => !h || r.hdvcId === h.id);
  const pc = (rec.pc || []).filter(r => !h || r.hdvcId === h.id);
  const chuaGanCount = (rec.pc || []).filter(p => !(rec.hdvc || []).some(x => x.id === p.hdvcId)).length;
  const detail = khungMucLo('dx', [
    ...(h ? [['chung', 'Hợp đồng & cước', () => panelHdvc(rec), null, !!(h.benKy || h.donViId || h.ben)]] : []),
    ['xe', 'Xe và tài xế', () => panelDX(rec, h), xe.length, xe.length > 0],
    ['phieu', 'Phiếu cân', () => panelPhieuCan(rec), pc.length + ' · ' + fmtT(totalKg(pc)) + ' t', pc.length > 0],
    ['vanban', 'Số văn bản', () => panelHdvcVB(rec), null, !!(h && h.exp && (h.exp.soVC || h.exp.ngayVC))],
    ...(chuaGanCount ? [['doichieu', 'Phiếu chưa gán', () => panelDoiChieuPhieuChuaGan(rec), chuaGanCount, false]] : [])
  ], h ? 'chung' : pc.length ? 'phieu' : 'xe', {inspector: true});
  return '<div class="hak-master-detail">' +
    '<aside class="hak-master-pane">' + panelDsVC(rec, {master: true, selId: h ? h.id : ''}) + '</aside>' +
    '<section class="hak-detail-pane">' +
      '<div class="hak-pane-head" id="hdDau">' +
        (h ? '<button class="btn ghost sm" data-act="hdQuayLai" data-kind="dx" id="hdQuayLai" style="margin-right:8px">← Quay lại danh sách</button>' : '') +
        '<div class="hdDauTen"><h3>' + (h ? 'Chi tiết: <span id="hdDauTen">' + esc(tenDoiVc(rec, h)) + '</span>' + (soHdVc(rec, h) ? ' · <span id="hdDauSo">số ' + esc(soHdVc(rec, h)) + '</span>' : '') : 'Vận chuyển & Phiếu cân') + '</h3></div>' +
      '</div>' +
      detail +
    '</section></div>';
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
  const c = checkDX(rec), baseOnly = hMo && !xeTatCa ? r => r.hdvcId === hMo.id || !(rec.hdvc || []).some(h => h.id === r.hdvcId) : null;
  const baseDx = baseOnly ? (rec.dx || []).filter(baseOnly) : (rec.dx || []);
  const SF = HAKCore.sf, loaiOpts = [...new Set(baseDx.map(r => trim(r.loaiXe)).filter(Boolean))].sort();
  const sfCfg = {
    screenId: 'lo_xe', title: 'Xe và tài xế',
    searchPlaceholder: 'Tìm BKS, chủ xe, tài xế, loại xe…',
    quickFields: ['q', 'coLoi'],
    advancedFields: ['q', 'loaiXe', 'coLoi'],
    matchQ: (r, q) => SF.hay([r.bienSo, r.chuXe, r.taiXe, r.loaiXe]).includes(q),
    fields: [
      {key: 'loaiXe', label: 'Loại xe', type: 'multi', withNone: true, options: loaiOpts, match: (r, vals) => SF.inSet(vals, r.loaiXe)},
      {key: 'coLoi', label: 'Chỉ xe có lỗi / cảnh báo', type: 'bool', match: r => c.state[r._row] === 'err' || c.state[r._row] === 'warn'}
    ]
  };
  const sfRes = hakSfApply('lo_xe', sfCfg, baseDx), sfSet = new Set(sfRes.rows);
  const only = r => (!baseOnly || baseOnly(r)) && sfSet.has(r);
  const head = panelImport('dx', rec) + stBar('dx', rec) + (baseDx.length ? hakSfBarHtml('lo_xe', sfRes.total, sfRes.kept) : '') + stErrBox() +
    (hMo ? '<div class="row" style="margin:6px 0" id="xeLoc">' + (xeTatCa ? '<span class="mut">Đang xem mọi xe của rừng.</span> <button class="btn ghost sm" data-act="xeTheoHd">Chỉ xe của hợp đồng này</button>' :
    '<h3 class="sro">Xe và tài xế của hợp đồng</h3><button class="btn ghost sm" data-act="xeTatCa">Xem mọi xe của rừng</button>') + '</div>' : '');
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
  const basePc = hdOnly ? pc.filter(hdOnly) : pc;
  const SF = HAKCore.sf;
  const bksOpts = [...new Set(basePc.map(r => trim(r.bienSo)).filter(Boolean))].sort();
  const noiOpts = [...new Set(basePc.map(r => trim(r.noiGiao)).filter(Boolean))].sort();
  const sfCfg = {
    screenId: 'lo_phieu_can', title: 'Phiếu cân',
    searchPlaceholder: 'Tìm số phiếu, BKS, khách hàng, nơi giao…',
    quickFields: ['q', 'coLoi'],
    advancedFields: ['q', 'dates', 'bienSo', 'noiGiao', 'coLoi'],
    matchQ: (r, q) => SF.hay([r.soPhieu, r.bienSo, r.khachHang, r.noiGiao, r.ghiChu]).includes(q),
    matchDate: (r, tu, den) => { const iso = SF.parseVN(r.ngay); if (!iso) return false; if (tu && iso < tu) return false; if (den && iso > den) return false; return true; },
    fields: [
      {key: 'bienSo', label: 'Biển kiểm soát', type: 'multi', withNone: true, options: bksOpts, match: (r, vals) => SF.inSet(vals, r.bienSo)},
      {key: 'noiGiao', label: 'Nơi giao', type: 'multi', withNone: true, options: noiOpts, match: (r, vals) => SF.inSet(vals, r.noiGiao)},
      {key: 'coLoi', label: 'Chỉ phiếu lỗi / chưa gán', type: 'bool', match: r => !HAKDates.isValid(r.ngay) || !r.hdvcId || c.state[r._row] === 'err'}
    ]
  };
  const sfRes = hakSfApply('lo_phieu_can', sfCfg, basePc), sfSet = new Set(sfRes.rows);
  const rowFilter = r => (!hdOnly || hdOnly(r)) && sfSet.has(r);
  const sfBar = basePc.length ? hakSfBarHtml('lo_phieu_can', sfRes.total, sfRes.kept, '<b>' + fmtT(totalKg(sfRes.rows)) + ' tấn</b>') : '';
  const head = panelImport('pc', rec, hMo ? pcDauHd(rec, hMo) : '', pcCongCuHd(hMo)) + pcGanBaoHtml() + stBar('pc', rec) + sfBar;
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
  /* thứ tự cột (rà soát 21/11): khóa phiếu → thời điểm cân → xe → các cột khối lượng liền nhau (kg rồi tấn) → tiền, nơi giao; cùng thứ tự với Sổ phiếu cân và bảng xem trước HoSoKeo.
   * “Ngày cân 1/2” là NGÀY GIỜ, “Cân 1/2 (kg)” là KHỐI LƯỢNG (trước đây cùng gọi “Cân lần …”, dễ nhầm). KL (kg) không ghi trên phiếu thì hiện số suy ra từ tấn, chữ nhạt, có ghi chú. */
  const H = (t, d) => '<span title="' + d + '">' + t + '</span>', HR = (t, d) => R.replace('>', ' title="' + d + '">') + t + '</span>';
  const kgCell = r => typeof r.klKg === 'number' ? fmt(r.klKg) : (typeof r.kl === 'number' ? '<span class="mut" title="Phiếu không ghi khối lượng kg: suy ra từ khối lượng tấn × 1000">' + fmt(Math.round(r.kl * 1000)) + '</span>' : '');
  const t = stTable('pc', rec, [...(nhieu ? ['Đội'] : []), H('Số phiếu', 'Số phiếu cân'), H('Ngày cân 1', 'Ngày, giờ cân lần 1'), H('Ngày cân 2', 'Ngày, giờ cân lần 2'), H('BKS trên phiếu', 'Biển kiểm soát ghi trên phiếu cân'),
    ...(hMo ? ['Xe · hợp đồng'] : []), HR('Cân 1 (kg)', 'Khối lượng cân lần 1 (kg)'), HR('Cân 2 (kg)', 'Khối lượng cân lần 2 (kg)'), HR('KL (kg)', 'Khối lượng hàng (kg) = Cân 1 − Cân 2'), HR('KL (tấn)', 'Khối lượng hàng (tấn): số dùng để cộng tổng'),
    'Khách hàng', R + 'Đơn giá</span>', R + 'Thành tiền</span>', 'Nơi giao'],
    r => dCell(r) + '<td><b>' + esc(r.soPhieu) + '</b></td><td>' + (HAKDates.isValid(r.ngay) ? esc(r.ngay) : esc(r.ngay) + '<br><small style="color:var(--err)">' + esc(HAKDates.why(r.ngay)) + ' (bấm Sửa)</small>') + '<br><span class="mut">' + esc(r.gioCan1 || '') + '</span></td><td>' + ngay2Cell(r) +
    '<br><span class="mut">' + esc(r.gioCan2 || '') + '</span></td><td>' + esc(r.bienSo) + xCell(r) + '</td>' + (hMo ? pcCotHd(rec, r, hMo) : '') +
      '<td style="text-align:right">' + num(r.can1) + '</td><td style="text-align:right">' + num(r.can2) +
      '</td><td style="text-align:right">' + kgCell(r) + '</td><td style="text-align:right">' + (typeof r.kl === 'number' ? fmtT(Math.round(r.kl * 1000)) : esc(r.kl)) +
      '</td><td>' + esc(r.khachHang || '') + '</td><td style="text-align:right">' + num(r.donGia) + '</td><td style="text-align:right">' + num(r.thanhTien) + '</td><td>' + esc(r.noiGiao) + '</td>', c, null, rowFilter);
  return head + gan + issuesBox(c.errs, c.warns) + t.replace('</tbody></table></div>', '</tbody><tfoot><tr><td colspan="' + (9 + (nhieu ? 1 : 0) + (hMo ? 1 : 0)) + '"><b>Tổng ' + sfRes.rows.length + ' chuyến' + (sfRes.rows.length < pc.length ? ' đang xem' : '') + ' (bản ' + (stCur() ? 'nháp' :
  'đã lưu') + ')</b></td><td style="text-align:right"><b>' + fmtT(totalKg(sfRes.rows)) + ' tấn</b></td><td colspan="5"></td></tr></tfoot></table></div>');
}

