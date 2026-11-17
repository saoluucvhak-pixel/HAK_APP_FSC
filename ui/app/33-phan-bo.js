/* ========== 3.0: PHÂN BỔ KHỐI LƯỢNG NHÂN CÔNG (tab Nhân công, trang danh sách hợp đồng) ==========
 * Nguồn: phiếu cân ĐÃ LƯU của rừng (mọi hợp đồng vận chuyển), tính theo kg nguyên (src/phanbo.js).
 *  - một đội: nhận toàn bộ; hai đội: “Chọn phiếu theo đội” hoặc “Chia đều” (1 kg lẻ cho đội đứng trước); từ ba đội: theo phiếu.
 * Xem trước tổng, phần mỗi đội, phần chưa phân bổ; “Lưu phân bổ” ghi cách phân bổ vào lô (f.phanBo). Lô đã chốt dùng kết quả lúc chốt (chỉ xem).
 * Cùng một kết quả cho tổng hợp, biểu mẫu và tiền khoán (doiOf → doiKl). */
var pbNhap = null;   // {fid, cheDo} cách đang chọn trên màn, chưa lưu
function pbCheDoDangChon(f) { return pbNhap && pbNhap.fid === f.id ? pbNhap.cheDo : HAKPhanBo.cheDo(f); }
function panelPhanBo(rec) {
  const f = curForest(); if (!f || !rec.doi) return '';
  const khoa = loKhoa(f), cd = khoa ? HAKPhanBo.cheDo(f) : pbCheDoDangChon(f), kq = HAKPhanBo.tinh(f, cd), n = rec.doi.length, doi = pbNhap && pbNhap.fid === f.id && !khoa && pbNhap.cheDo !== HAKPhanBo.cheDo(f);
  const tenD = d => trim(d.ten) || (n > 1 ? 'Đội ' + (rec.doi.findIndex(x => x.id === d.id) + 1) : 'Đội khai thác');
  const chon = n === 2 && !khoa ? '<div class="row" style="gap:14px;flex-wrap:wrap;margin:6px 0" id="pbCach">' + ['theoPhieu', 'chiaDeu'].map(k => '<label style="flex-direction:row;align-items:center;gap:6px"><input type="radio" name="pbCheDo" value="' + k + '"' + (cd === k ? ' checked' : '') + '> ' + HAKPhanBo.CHE_DO[k] + '</label>').join('') + '</div>' : '';
  const bang = '<div class="wrap"><table id="pbTbl" style="min-width:420px"><thead><tr><th>Đội</th><th style="text-align:right">Khối lượng (tấn)</th><th style="text-align:right">Số phiếu</th></tr></thead><tbody>' +
    kq.doi.map(d => '<tr data-pbdoi="' + esc(d.id) + '"><td>' + esc(tenD(d)) + '</td><td style="text-align:right">' + fmtT(d.kg) + '</td><td style="text-align:right">' + (kq.cheDo === 'chiaDeu' ? '<small class="mut">chia đều</small>' : d.soPhieu) + '</td></tr>').join('') +
    '</tbody><tfoot><tr><td><b>Tổng phiếu cân của rừng</b></td><td style="text-align:right"><b id="pbTong">' + fmtT(kq.tongKg) + '</b></td><td style="text-align:right">' + kq.soPhieu + '</td></tr>' +
    (kq.chuaGanPhieu ? '<tr><td style="color:var(--err)">Chưa phân bổ</td><td style="text-align:right;color:var(--err)" id="pbChua">' + fmtT(kq.chuaGanKg) + '</td><td style="text-align:right;color:var(--err)">' + kq.chuaGanPhieu + '</td></tr>' : '') + '</tfoot></table></div>';
  const theoPhieu = kq.cheDo === 'theoPhieu' && !khoa && !stCur() ? pbPhieuHtml(rec, f) : '';
  return '<div class="card" id="pbBox"><div class="row" style="justify-content:space-between;flex-wrap:wrap;gap:8px"><h3 style="margin:0">Phân bổ khối lượng cho đội: ' + esc(kq.ten) + '</h3>' +
    (khoa ? '<span class="pill">lô đã chốt: kết quả lúc chốt</span>' : n === 2 ? '<button class="btn sm" data-act="pbLuu" id="pbLuu"' + (doi ? '' : ' disabled') + '>Lưu phân bổ</button>' : '') + '</div>' +
    '<p class="mut" style="margin:6px 0">Từ phiếu cân đã lưu của rừng (mọi hợp đồng vận chuyển). ' + (n <= 1 ? 'Một đội nhận toàn bộ khối lượng.' : n === 2 ? 'Hai đội: chọn phiếu cho từng đội, hoặc chia đều (1 kg lẻ cho đội đứng trước).' : 'Từ ba đội: chọn phiếu cho từng đội.') + ' Kết quả dùng chung cho tổng hợp, biểu mẫu và tiền khoán.</p>' +
    chon + (doi ? '<div class="msg warn" id="pbChuaLuu">Đang xem trước “' + esc(HAKPhanBo.CHE_DO[cd]) + '”: bấm “Lưu phân bổ” để áp dụng.</div>' : '') + bang + theoPhieu + '</div>';
}
/* chọn phiếu theo đội: mỗi phiếu tối đa một đội (pc.doiId); ghi ngay như ô Đội của bảng phiếu cân */
function pbPhieuHtml(rec, f) {
  const pc = rec.pc || []; if (!pc.length) return '<p class="mut">Rừng chưa có phiếu cân đã lưu.</p>';
  const tenD = d => trim(d.ten) || 'Đội ' + (rec.doi.indexOf(d) + 1);
  return '<details style="margin-top:8px" open id="pbPhieu"><summary>Chọn phiếu theo đội (' + pc.length + ' phiếu)</summary><div class="wrap" style="max-height:320px"><table id="pbPhieuTbl"><thead><tr><th>Số phiếu</th><th>Ngày</th><th>BKS</th><th style="text-align:right">KL (tấn)</th><th>Đội</th></tr></thead><tbody>' +
    pc.map((p, i) => { const d = rec.doi.find(x => x.id === p.doiId); return '<tr><td>' + esc(p.soPhieu) + '</td><td>' + esc(p.ngay) + '</td><td>' + esc(p.bienSo) + '</td><td style="text-align:right">' + (typeof p.kl === 'number' ? fmtT(Math.round(p.kl * 1000)) : esc(p.kl)) + '</td><td><select data-pcdoi="' + i + '">' + (d ? '' : '<option value="" selected>(chưa phân bổ)</option>') + rec.doi.map(x => '<option value="' + esc(x.id) + '"' + (x === d ? ' selected' : '') + '>' + esc(tenD(x)) + '</option>').join('') + '</select></td></tr>'; }).join('') +
    '</tbody></table></div></details>';
}
document.addEventListener('change', e => {
  const t = e.target; if (!t || t.name !== 'pbCheDo') return;
  const f = curForest(); if (!f) return; pbNhap = {fid: f.id, cheDo: t.value}; render();
});
document.addEventListener('click', e => {
  const el = e.target && e.target.closest && e.target.closest('[data-act=pbLuu]'); if (!el) return;
  const f = curForest(); if (!f || loKhoa(f) || !pbNhap || pbNhap.fid !== f.id) return;
  f.phanBo = Object.assign({}, f.phanBo || {}, {cheDo: pbNhap.cheDo}); pbNhap = null;
  persistLo(); luuLo().then(x => { if (x && x.ok) note('Đã lưu phân bổ khối lượng: ' + HAKPhanBo.CHE_DO[HAKPhanBo.cheDo(f)] + '.'); render(); });
});
