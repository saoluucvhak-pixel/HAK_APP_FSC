/* ----- Chọn địa chỉ giao hàng cho TỪNG rừng (tab Vận chuyển) ----- */
function mhSnapshotNow() { const c = theCompany(); return c ? MH.snapshot(c, mh.addrId) : null; }
function panelMua(rec) {
  const f = curForest(); if (!f) return '';
  if (mh.fid !== f.id) Object.assign(mh, {fid: f.id, open: false, addrId: '', msg: null});
  const i = rec.info, m = i.muaHang, co = theCompany(), dd = MH.diemDen(i, rec.exp), dr = MH.drift(i, db.congTy), vcMode = (i.vanChuyen || {}).mode || 'tanKm';
  const mis = MH.mismatches(rec.pc || [], dd.src === 'congty' ? dd : null);
  const msg = mh.msg; mh.msg = null;
  let cur;
  if (!co && !m) cur = '<div class="msg warn">Chưa khai thông tin công ty mua hàng. <button class="btn sm" data-act="openCty">Khai thông tin công ty</button></div>' + (dd.src === 'thucong' ? '<div class="msg warn">Đang dùng điểm đến nhập tay trước đây: <b>' + esc(dd.text) + '</b>.</div>' : '');
  else if (m) cur = '<div class="hint" style="display:block"><b>' + esc(m.ten) + '</b>' + (m.mst ? ' · MST ' + esc(m.mst) : '') + '<br>Địa chỉ giao hàng: <b>' + esc(m.diaChiNhan || 'Địa chỉ công ty') + '</b> — ' + esc(m.diaChi) + '<br><span class="mut">Đã xác nhận ' + esc(fmtDT(m.xacNhan)) + ' · lưu cùng hồ sơ rừng này</span></div>';
  else if (dd.src === 'thucong') cur = '<div class="msg warn">Rừng này chưa chọn địa chỉ giao của công ty. Đang dùng điểm đến nhập tay trước đây: <b>' + esc(dd.text) + '</b>. Chọn địa chỉ giao để dùng địa chỉ trong hồ sơ công ty.</div>';
  else cur = '<div class="msg warn">Chưa chọn địa chỉ giao hàng cho rừng này: địa điểm vận chuyển đến đang trống, các biểu mẫu cần điểm đến (BM-04, BM-09, BM-10) sẽ in dòng chấm.</div>';
  let drift = '';
  if (dr.state === 'thaydoi') drift = '<div class="msg warn">Thông tin công ty đã thay đổi (' + esc(dr.why) + '). Hồ sơ rừng vẫn GIỮ: <b>' + esc(dr.saved.ten) + ' – ' + esc(dr.saved.diaChi) + '</b>. Hồ sơ công ty hiện là: <b>' + esc(dr.current.ten) + (dr.current.diaChi ? ' – ' +
  esc(dr.current.diaChi) : '') + '</b>. <button class="btn sm" data-act="mhOpen">Xem và cập nhật</button></div>';
  else if (dr.state === 'xoa') drift = '<div class="msg warn">Hồ sơ công ty “' + esc(dr.saved.ten) + '” không còn trong phần mềm. Hồ sơ rừng vẫn giữ tên và địa chỉ đã lưu.</div>';
  const misBox = mis.length ? '<div class="msg warn">Nơi giao trên <b>' + mis.length + ' phiếu cân</b> khác địa chỉ giao đã chọn (' + esc([...new Set(mis.map(p => p.noiGiao))].slice(0, 4).join('; ')) + '). Nội dung gốc của phiếu được giữ nguyên; hãy đối chiếu phiếu hoặc điểm đến.</div>' : '';
  let pick = '';
  if (mh.open && co) {
    const addrs = MH.addressesOf(co), a = MH.addressOf(co, mh.addrId), snap = mhSnapshotNow(), oldT = dd.text, newT = snap ? snap.ten + ' – ' + snap.diaChi : '';
    pick = '<div class="card" style="border-color:var(--brand)"><h4 style="margin:0 0 8px">Chọn địa chỉ giao hàng của ' + esc(co.ten) + '</h4>' +
      '<label><span>Địa chỉ giao hàng</span><select id="mhAddr">' + addrs.map(x => '<option value="' + esc(x.id || '@main') + '"' + (x.id === (mh.addrId || '') ? ' selected' : '') + '>' + esc(x.nhan) + ' — ' + esc(x.diaChi) + '</option>').join('') + '</select></label>';
    if (a) {
      pick += '<div class="wrap" style="margin-top:8px"><table><tr><th></th><th>Địa điểm vận chuyển đến</th></tr>' +
        '<tr><td>' + (dd.src === 'thucong' ? 'Giá trị nhập tay cũ' : dd.src === 'congty' ? 'Hiện đang lưu trong hồ sơ' : 'Hiện tại') + '</td><td>' + (oldT ? esc(oldT) : '<span class="mut">(trống)</span>') + '</td></tr>' +
        '<tr><td><b>' + (dd.src ? 'Địa chỉ đề xuất / mới' : 'Địa chỉ mới') + '</b></td><td><b>' + esc(newT) + '</b>' + (oldT === newT ? ' <span class="pill ok">không thay đổi</span>' : '') + '</td></tr></table></div>';
      if (oldT !== newT && vcMode === 'tanKm') pick += '<div class="msg warn">Đơn giá vận chuyển đang tính <b>theo tấn/km</b> (cự ly ' + (typeof i.cuLy === 'number' ? fmt(i.cuLy) + ' km' : 'chưa nhập') + '). Đổi điểm đến <b>không tự sửa cự ly hay đơn giá</b>: hãy kiểm tra lại cự ly vận chuyển ở tab Thông tin rừng trước khi xuất hồ sơ.</div>';
      if (dd.src === 'thucong') pick += '<p class="mut" style="margin:6px 0 0">Xác nhận sẽ dùng địa chỉ trong hồ sơ công ty thay cho điểm đến nhập tay (giá trị nhập tay cũ vẫn được giữ trong hồ sơ nhưng không còn được dùng).</p>';
    }
    pick += '<div class="row" style="margin-top:8px"><button class="btn" data-act="mhConfirm">Xác nhận và lưu vào hồ sơ rừng</button><button class="btn ghost" data-act="mhCancel">Hủy</button></div></div>';
  }
  const ddBox = '<label style="margin-top:8px"><span>Địa điểm vận chuyển đến (tự điền từ địa chỉ giao đã chọn)</span><input id="mhDiemDen" readonly value="' + esc(dd.diaChi) + '" placeholder="Chưa có: chọn địa chỉ giao hàng"></label>';
  return '<div class="card"><div class="row" style="justify-content:space-between"><h3 style="margin:0">Địa chỉ giao hàng và điểm đến vận chuyển</h3>' + (co ? '<button class="btn' + (m ? ' ghost' : '') + '" data-act="mhOpen">' + (m ? 'Đổi địa chỉ giao' : 'Chọn địa chỉ giao hàng') + '</button>' :
  '') + '</div>' +
    '<p class="mut" style="margin:4px 0 8px">Công ty mua hàng khai một lần ở <b>Cài đặt → Công ty</b> (menu ngang trên cùng); mỗi rừng chọn địa chỉ giao của công ty đó. Địa chỉ đã chọn là địa điểm đến ở màn hình này, trong BM-04, BM-09, BM-10 và Sổ phiếu cân.</p>' +
    (msg ? '<div class="msg ' + msg.kind + '">' + esc(msg.text) + '</div>' : '') + cur + ddBox + drift + misBox + pick + '</div>';
}
/* Bảng con “Hợp đồng vận chuyển” của lô; xe là bảng con của hợp đồng (src/model.js). Hợp đồng theo người ký (chủ xe / tài xế) tự lập như bản cũ;
 * hợp đồng với doanh nghiệp chọn từ danh mục đơn vị vận chuyển (db.dmDonViVC) rồi chuyển xe vào. Cước, số văn bản: riêng từng hợp đồng hoặc dùng của lô. */
/* ĐỐI TÁC là MỘT nguồn (db.dmDoiTac): doanh nghiệp (loai 'doanhnghiep') và người ký cá nhân (loai 'nguoiKyVC'); đội xe cũ trỏ 'dv1' được hiểu là 'dn:dv1' */
