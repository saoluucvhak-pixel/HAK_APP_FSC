/* ========== Thứ tự in (bản 2.2, mục 3.2; src/bieumau.js) ==========
 * Danh sách mẫu của lô theo ĐÚNG thứ tự nên in: đợt 1 nhóm Lô → từng đội khai thác (ủy quyền trước hợp đồng) → từng đội xe → nhật ký; đợt 2 đội khai thác trước, đội xe sau.
 * Chỉ để xem và đối chiếu khi in; không đổi cách xuất. */
function thuTuInBox(rec) {
  if (!rec || !window.HAKBieuMau) return '';
  const i = rec.info || {}, doi = (rec.doi || []).map((d, k) => ({ten: trim(d.ten) || ((rec.doi || []).length > 1 ? 'Đội ' + (k + 1) : '')})), dx = (rec.hdvc || []).map((h, k) => ({ten: trim(h.ten) || ((rec.hdvc || []).length > 1 ? 'Đội xe ' + (k + 1) : '')}));
  const l = HAKBieuMau.thuTuIn({mo: i.moHinhKy === 'tructiep' ? 'tructiep' : 'giaokhoan', doi, doiXe: dx});
  const byDot = d => l.filter(x => x.dot === d).map(x => '<tr><td style="text-align:right">' + x.stt + '</td><td>BM-' + esc(x.ma) + '</td><td>' + esc(x.ten) + '</td><td>' + esc(({lo: 'Cả lô', doi: 'Đội khai thác', doiXe: 'Đội xe', nguoi: 'Từng người'})[x.cap]) + (x.doi ? ' “' + esc(x.doi) + '”' : '') + '</td><td style="text-align:center">' + x.soBan + '</td></tr>').join('');
  const bang = t => '<table class="normTbl" style="min-width:0;table-layout:auto;margin-bottom:8px"><caption style="text-align:left"><b>' + t[0] + '</b></caption><thead><tr><th>STT in</th><th>Mẫu</th><th>Tên</th><th>Lập cho</th><th>Số bản</th></tr></thead><tbody>' + byDot(t[1]) + '</tbody></table>';
  return '<details class="card" id="thuTuIn" style="margin-bottom:10px"><summary><b>Thứ tự in đề xuất</b> <span class="mut">(' + l.length + ' bản ghi; đội 1 in xong mới đến đội 2; ủy quyền trước hợp đồng; đợt 2: đội khai thác trước, đội xe sau)</span></summary>' + bang(['Đợt 1', 1]) + bang(['Đợt 2', 2]) + '</details>';
}
