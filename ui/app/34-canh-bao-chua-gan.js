/* ========== Phiếu #03 (ND-01): cảnh báo khi xuất BM-08 / BM-14 còn phiếu cân chưa gán đội ==========
 * Ở chế độ “theo phiếu” mà còn phiếu chưa gán đội, màn Phân bổ chỉ nêu “chưa phân bổ” còn BM-08, BM-14 chia khối lượng THEO SỐ NGƯỜI của đội (doiOf) — hai nơi hai kết quả, không ai báo.
 * Quyết định của CHỦ (18/11/2026): KHÔNG chặn xuất. Cảnh báo lần 1 (số phiếu, tổng tấn, tên từng phiếu, phần mỗi đội sẽ in); chọn “Vẫn xuất, chia theo số người” thì xuất đúng như trước
 * (số in không đổi); chọn “Quay lại gán phiếu” thì không xuất và mở nơi gán phiếu theo đội (màn Phân bổ ở tab Nhân công).
 * Lựa chọn chỉ có hiệu lực cho MỘT lần bấm nút xuất (chuaGanDaHoi), không lưu lại. Lô đã chốt / đã dừng (chỉ đọc, không gán lại được) không hỏi: số đã đóng băng lúc chốt.
 * Logic quyết định cảnh báo nằm ở lõi thuần (src/phanbo.js chuaGanXuat, đọc kết quả doiOf) để kiểm thử được bằng Node. */
const CHUA_GAN_KIND = ['tc', 'nttl', 'all', 'cuoi'];   // nút xuất BM-08, BM-14 và hai gói có chứa chúng (“Toàn bộ hồ sơ”, “Đợt 2”)
const chuaGanMaMau = ma => /^(08|14)(?:\b|:|_)/.test(String(ma || ''));   // mã mẫu hoặc khóa / đường dẫn file của BM-08, BM-14
let chuaGanDaHoi = false;   // một lần bấm nút xuất = một lần hỏi (chuỗi xuất nhiều gói không hỏi lại)
/* cảnh báo của lô đang mở (null: không có hoặc lô chỉ đọc) */
function chuaGanCuaLo(rec) {
  try { const f = curForest(); return rec && rec.doi && f && !loKhoa(f) ? (b => HAKPhanBo.chuaGanXuat(b) || HAKPhanBo.chuaPhieuXuat(b))(doiOf(rec)) : null; } catch (e) { return null; }   // phiếu #03: còn phiếu chưa gán; phiếu #09: có đội chưa có phiếu nào
}
/* chạy một thao tác xuất; cờ “đã hỏi” chỉ sống trong thao tác đó */
async function chuaGanTrong(fn) { chuaGanDaHoi = false; try { return await fn(); } finally { chuaGanDaHoi = false; } }
/* true = được xuất (không có cảnh báo, hoặc người dùng chọn “Vẫn xuất”); maMau: mã mẫu / khóa / đường dẫn sẽ xuất, hoặc nút xuất (kind) */
async function chuaGanKiemTra(rec, maMau) {
  if (chuaGanDaHoi) return true;
  const ds = Array.isArray(maMau) ? maMau : [maMau];
  if (!ds.some(m => CHUA_GAN_KIND.includes(m) || chuaGanMaMau(m))) return true;
  const c = chuaGanCuaLo(rec); if (!c) return true;
  const ok = await chuaGanHoi(c); if (ok) chuaGanDaHoi = true; return ok;
}
/* hộp cảnh báo (dùng khung #stBox như các hộp xác nhận khác); Promise<boolean> */
function chuaGanHoi(c) {
  return new Promise(res => {
    let xong = false;
    const dong = (ok, diGan) => { if (xong) return; xong = true; document.removeEventListener('keydown', phim, true); $('#stBox').classList.remove('on'); $('#stBox').removeAttribute('role'); if (diGan) chuaGanVeGan(); res(ok); };
    const phim = e => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); dong(false, false); } };
    const t = kg => fmtT(kg) + ' tấn';
    const dongDoi = !!c.doi;   // phiếu #09: đội chưa có phiếu cân nào (phiếu đã gán hết cho đội khác)
    const chia = c.chia.length ? ': ' + c.chia.map(x => esc(x.ten || 'Đội') + ' ' + fmtT(Math.round(x.tan * 1000)) + ' tấn').join(', ') : '';
    const hang = dongDoi ? c.chia.map(x => '<tr><td>' + esc(x.ten || 'Đội') + (c.doi.includes(x.ten || 'Đội') ? ' <span class="pill err">chưa có phiếu</span>' : '') + '</td><td style="text-align:right">' + t(Math.round(x.tan * 1000)) + '</td></tr>').join('') :
      c.phieu.slice(0, 200).map(p => '<tr><td>' + esc(p.soPhieu) + '</td><td>' + esc(p.ngay) + '</td><td>' + esc(p.bienSo) + '</td><td style="text-align:right">' + t(p.kg) + '</td></tr>').join('');
    $('#stBody').innerHTML = '<div class="gh"><h2 id="chuaGanTieuDe">' + (dongDoi ? 'Còn đội chưa có phiếu cân nào' : 'Còn phiếu cân chưa gán đội') + '</h2></div>' +
      (dongDoi ? '<div class="msg warn" id="chuaGanNoiDung"><b>Đội ' + c.doi.map(x => '“' + esc(x) + '”').join(', ') + ' chưa có phiếu cân nào.</b> Phiếu cân đã gán hết cho đội khác, nên khối lượng của đội này ở BM-08 và BM-14 không lấy được từ phiếu cân.<br>' +
        '<b>Nếu tiếp tục, khối lượng chia theo số người của đội</b>' + chia + '. Số này khác với màn Phân bổ.</div>' :
      '<div class="msg warn" id="chuaGanNoiDung"><b>' + c.soPhieu + ' phiếu cân, tổng ' + t(c.kg) + ', chưa gán đội.</b> Khối lượng từng đội ở BM-08 và BM-14 lấy theo phiếu cân đã gán; phiếu chưa gán không được tính cho đội nào.<br>' +
      '<b>Nếu tiếp tục, khối lượng chia theo số người của đội</b>' + chia + '. Số này khác với màn Phân bổ (đang ghi “chưa phân bổ”).</div>') +
      '<div class="wrap" style="max-height:240px;overflow:auto;margin:8px 0"><table id="chuaGanBang"><thead><tr>' + (dongDoi ? '<th>Đội</th><th style="text-align:right">Khối lượng sẽ in</th>' : '<th>Số phiếu</th><th>Ngày cân</th><th>Biển số</th><th style="text-align:right">Khối lượng</th>') + '</tr></thead><tbody>' + hang + '</tbody></table></div>' +
      (!dongDoi && c.phieu.length > 200 ? '<p class="mut">Còn ' + (c.phieu.length - 200) + ' phiếu nữa không hiện ở đây.</p>' : '') +
      '<p class="mut" style="margin:0 0 8px">Lựa chọn này chỉ áp dụng cho lần xuất này; lần sau phần mềm sẽ hỏi lại nếu ' + (dongDoi ? 'vẫn còn đội chưa có phiếu' : 'còn phiếu chưa gán') + '.</p>' +
      '<div class="row" style="justify-content:flex-end;gap:8px;flex-wrap:wrap"><button class="btn" id="chuaGanVe">Quay lại gán phiếu</button><button class="btn ghost" id="chuaGanXuat">Vẫn xuất, chia theo số người</button></div>';
    const box = $('#stBox'); box.classList.add('on'); box.setAttribute('role', 'alertdialog'); box.setAttribute('aria-labelledby', 'chuaGanTieuDe');
    $('#chuaGanVe').onclick = () => dong(false, true);
    $('#chuaGanXuat').onclick = () => dong(true, false);
    document.addEventListener('keydown', phim, true);
    $('#chuaGanVe').focus();   // nút an toàn là mặc định: Enter không xuất nhầm
  });
}
/* “Quay lại gán phiếu”: danh sách hợp đồng nhân công, nơi có bảng “Chọn phiếu theo đội” (mỗi phiếu gán một đội) */
function chuaGanVeGan() {
  hdMoDat('nc', null); NAV.ftab = 'nc'; render();
  setTimeout(() => { const d = document.getElementById('pbPhieu'); if (d) { d.open = true; d.scrollIntoView({block: 'center'}); } }, 0);
}
