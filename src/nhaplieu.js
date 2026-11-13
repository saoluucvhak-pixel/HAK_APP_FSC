/* Rà mâu thuẫn và chồng lấn khi nhập liệu của một lô: ngày ở nhiều ô khác nhau, khoảng ngày đảo, ngày phiếu cân ngoài thời gian khai thác…
 * Hàm thuần (không đọc giao diện/CSDL) để dùng chung cho màn "Kiểm tra trước khi xuất" và kiểm thử. Không tự sửa, chỉ báo.
 * kind 'chan' = nội dung in ra sẽ sai/vô nghĩa (ngày không có thật, khoảng bị đảo); kind 'doi' = có mâu thuẫn cần người dùng đối chiếu. */
(function (root) {
  const D = (typeof module !== 'undefined' && module.exports) ? require('./dates.js') : root.HAKDates;
  const NGAY_EXP = [['ngayKy', 'Ngày ký hợp đồng (Xuất hồ sơ)'], ['uqNgay', 'Giấy ủy quyền: ngày lập'], ['tuNgayTT', 'Bảng thanh toán tiền công: từ ngày'], ['denNgayTT', 'Bảng thanh toán tiền công: đến ngày'], ['ntNgay', 'Nghiệm thu, thanh lý: ngày lập'], ['pcNgay', 'Xác nhận khối lượng, thanh toán vận chuyển: ngày lập']];
  const NGAY_INFO = [['tuNgay', 'Thời gian khai thác: từ ngày'], ['denNgay', 'Thời gian khai thác: đến ngày'], ['ngayBDLD', 'Hợp đồng lao động từ ngày'], ['ngayKyHopDong', 'Ngày ký hợp đồng (Thông tin chủ rừng)']];
  const SO_EXP = [['soKT', 'số hợp đồng khai thác'], ['soVC', 'số hợp đồng vận chuyển'], ['uqSo', 'số giấy ủy quyền'], ['ntSo', 'số biên bản nghiệm thu'], ['pcSo', 'số biên bản xác nhận khối lượng']];
  const s = v => String(v == null ? '' : v).trim();

  function kiemTra(job) {
    const items = [], i = job.info || {}, ex = job.exp || {}, pc = job.pc || [];
    const add = (kind, nhom, text, ref, go) => items.push({kind, nhom, text, ref: ref || '', go: go || {ftab: 'xuat'}});
    const vc = i.vanChuyen || {};
    const k = v => D.key(v), has = v => s(v) !== '';
    // 1. Ngày không có thật (in thẳng ra biểu mẫu)
    const bad = new Set();
    NGAY_INFO.concat([['vcTuNgay', 'Vận chuyển: từ ngày']]).forEach(([f, lb]) => {
      const v = f === 'vcTuNgay' ? vc.tuNgay : i[f];
      if (has(v) && !D.isValid(v)) { bad.add(f); add('chan', 'Ngày nhập sai', lb + ': ' + D.why(v), lb, {ftab: 'finfo'}); }
    });
    NGAY_EXP.forEach(([f, lb]) => { if (has(ex[f]) && !D.isValid(ex[f])) { bad.add(f); add('chan', 'Ngày nhập sai', lb + ': ' + D.why(ex[f]), lb, {ftab: 'xuat'}); } });
    const ok = v => has(v) && D.isValid(v);
    // 2. Khoảng ngày bị đảo
    if (ok(i.tuNgay) && ok(i.denNgay) && k(i.tuNgay) > k(i.denNgay)) add('chan', 'Khoảng ngày bị đảo', 'Thời gian khai thác: từ ngày ' + i.tuNgay + ' sau đến ngày ' + i.denNgay + '.', 'Thời gian khai thác', {ftab: 'finfo'});
    if (ok(ex.tuNgayTT) && ok(ex.denNgayTT) && k(ex.tuNgayTT) > k(ex.denNgayTT)) add('chan', 'Khoảng ngày bị đảo', 'Bảng thanh toán tiền công: từ ngày ' + ex.tuNgayTT + ' sau đến ngày ' + ex.denNgayTT + '.', 'Bảng thanh toán tiền công', {ftab: 'xuat'});
    // 3. Cùng một ngày nhập ở hai nơi khác nhau
    if (ok(ex.ngayKy) && ok(i.ngayKyHopDong) && k(ex.ngayKy) !== k(i.ngayKyHopDong))
      add('doi', 'Một ngày nhập ở hai nơi', 'Ngày ký hợp đồng: Thông tin chủ rừng ghi ' + i.ngayKyHopDong + ' nhưng ô ở tab Xuất hồ sơ ghi ' + ex.ngayKy + '. Biểu mẫu dùng ' + ex.ngayKy + ' (ô Xuất hồ sơ được ưu tiên). Xóa một trong hai ô để tránh nhầm.', 'Ngày ký hợp đồng', {ftab: 'xuat'});
    if (ok(i.ngayBDLD) && ok(i.tuNgay) && k(i.ngayBDLD) !== k(i.tuNgay) && !(ok(i.denNgay) && k(i.ngayBDLD) >= k(i.tuNgay) && k(i.ngayBDLD) <= k(i.denNgay)))
      add('doi', 'Một ngày nhập ở hai nơi', 'Hợp đồng lao động từ ngày ' + i.ngayBDLD + ' nằm ngoài thời gian khai thác (' + i.tuNgay + (i.denNgay ? ' – ' + i.denNgay : '') + ').', 'Hợp đồng lao động', {ftab: 'finfo'});
    if (ok(vc.tuNgay) && ok(i.tuNgay) && k(vc.tuNgay) < k(i.tuNgay)) add('doi', 'Một ngày nhập ở hai nơi', 'Vận chuyển từ ngày ' + vc.tuNgay + ' sớm hơn ngày bắt đầu khai thác ' + i.tuNgay + '.', 'Vận chuyển', {ftab: 'dx'});
    // 4. Thứ tự các văn bản
    const ky = ok(ex.ngayKy) ? ex.ngayKy : ok(i.ngayKyHopDong) ? i.ngayKyHopDong : '';
    if (ky && ok(i.tuNgay) && k(ky) > k(i.tuNgay)) add('doi', 'Thứ tự ngày', 'Ngày ký hợp đồng ' + ky + ' sau ngày bắt đầu khai thác ' + i.tuNgay + '.', 'Ngày ký hợp đồng', {ftab: 'xuat'});
    if (ky && ok(ex.ntNgay) && k(ex.ntNgay) < k(ky)) add('doi', 'Thứ tự ngày', 'Ngày lập biên bản nghiệm thu ' + ex.ntNgay + ' trước ngày ký hợp đồng ' + ky + '.', 'Nghiệm thu', {ftab: 'xuat'});
    if (ok(ex.ntNgay) && ok(i.denNgay) && k(ex.ntNgay) < k(i.denNgay)) add('doi', 'Thứ tự ngày', 'Ngày lập biên bản nghiệm thu ' + ex.ntNgay + ' trước ngày kết thúc khai thác ' + i.denNgay + '.', 'Nghiệm thu', {ftab: 'xuat'});
    const dates = pc.map(r => D.key(r.ngay)).filter(Boolean), last = dates.length ? Math.max(...dates) : 0, first = dates.length ? Math.min(...dates) : 0;
    const f2 = n => { const d = String(n); return d.slice(6) + '/' + d.slice(4, 6) + '/' + d.slice(0, 4); };
    if (last && ok(ex.pcNgay) && k(ex.pcNgay) < last) add('doi', 'Thứ tự ngày', 'Ngày lập biên bản xác nhận khối lượng ' + ex.pcNgay + ' trước phiếu cân cuối cùng (' + f2(last) + ').', 'Xác nhận khối lượng', {ftab: 'xuat'});
    if (ok(ex.tuNgayTT) && ok(i.tuNgay) && k(ex.tuNgayTT) < k(i.tuNgay) || ok(ex.denNgayTT) && ok(i.denNgay) && k(ex.denNgayTT) > k(i.denNgay))
      add('doi', 'Thứ tự ngày', 'Kỳ thanh toán tiền công (' + (ex.tuNgayTT || '…') + ' – ' + (ex.denNgayTT || '…') + ') vượt ra ngoài thời gian khai thác (' + (i.tuNgay || '…') + ' – ' + (i.denNgay || '…') + ').', 'Bảng thanh toán tiền công', {ftab: 'xuat'});
    // 5. Ngày phiếu cân ngoài thời gian: gộp một dòng, không lặp theo từng phiếu
    const lo = ok(vc.tuNgay) ? k(vc.tuNgay) : ok(i.tuNgay) ? k(i.tuNgay) : 0;
    if (lo && first && first < lo) {
      const n = pc.filter(r => D.key(r.ngay) && D.key(r.ngay) < lo);
      add('doi', 'Phiếu cân ngoài thời gian', n.length + ' phiếu cân có ngày trước ' + f2(lo) + ' (ngày bắt đầu ' + (ok(vc.tuNgay) ? 'vận chuyển' : 'khai thác') + '), ví dụ phiếu ' + (n[0].soPhieu || '(không số)') + ' ngày ' + n[0].ngay + '.', 'Phiếu cân', {ftab: 'dx', focus: 'pc'});
    }
    // 6. Số hợp đồng đầy đủ có năm lệch với ngày của chính văn bản
    SO_EXP.forEach(([f, lb]) => {
      const m = /\/(\d{4})(?!\d)/.exec(s(ex[f]));
      const ngay = f === 'ntSo' ? ex.ntNgay : f === 'pcSo' ? ex.pcNgay : f === 'uqSo' ? (ex.uqNgay || ky) : ky;
      if (m && ok(ngay) && D.parse(ngay).y !== +m[1]) add('doi', 'Năm trong số khác năm của ngày', 'Số “' + ex[f] + '” (' + lb + ') có năm ' + m[1] + ' nhưng ngày của văn bản là ' + ngay + '.', lb, {ftab: 'xuat'});
    });
    return items;
  }
  const api = {kiemTra, NGAY_EXP, NGAY_INFO};
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.HAKNhapLieu = api;
})(typeof self !== 'undefined' ? self : this);
