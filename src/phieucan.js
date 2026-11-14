/* In phiếu cân bằng NGUYÊN BẢN công cụ PhieuCan (renderer/PhieuCan.html, giữ nguyên từng byte: bố cục tính theo mm, khổ giấy lỗ 240 × 279 mm,
 * đường xé giữa, dịch lề, hai liên…). Phần mềm KHÔNG vẽ lại phiếu: chỉ mở đúng file đó trong một cửa sổ riêng và nạp sẵn danh sách phiếu cân của rừng
 * bằng chính ô chọn file Excel của công cụ (tạo một bảng tính có đúng các cột công cụ yêu cầu), nên cách đọc dữ liệu, xem trước, in và tải PDF giống hệt bản gốc.
 * Hàm thuần: dùng ở giao diện (tạo bảng) và ở tiến trình chính (tạo mã nạp dữ liệu). */
(function (root) {
  const HEAD = ['Số phiếu', 'Ngày cân 1', 'Giờ cân 1', 'Ngày cân 2', 'Giờ cân 2', 'Biển số 1', 'Cân 1', 'Cân 2', 'KL', 'Khách hàng', 'Địa chỉ', 'ĐG_AD', 'Thành tiền', 'Trạng thái'];
  /* ===== Ngày cân 2 =====
   * Nguồn nhập (Excel, Google Sheets) thường chỉ có ngày cân 1 cùng giờ cân 1, giờ cân 2. Ngày cân 2 được SUY RA: giờ cân 2 sớm hơn giờ cân 1 nghĩa là cân qua nửa đêm
   * (ngày cân 2 = ngày cân 1 + 1), ngược lại cùng ngày. Có ngày cân 2 nhập thật thì dùng đúng số đã nhập. Thiếu giờ thì không suy ra được: lấy theo ngày cân 1 (như trước). */
  const pad2 = n => String(n).padStart(2, '0');
  const parseD = v => { const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(String(v == null ? '' : v).trim()); if (!m) return null; const d = new Date(Date.UTC(+m[3], +m[2] - 1, +m[1])); return d.getUTCFullYear() === +m[3] && d.getUTCMonth() === +m[2] - 1 && d.getUTCDate() === +m[1] ? d : null; };
  const fmtD = d => pad2(d.getUTCDate()) + '/' + pad2(d.getUTCMonth() + 1) + '/' + d.getUTCFullYear();
  const secOf = v => { const m = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(String(v == null ? '' : v).trim()); if (!m || +m[1] > 23 || +m[2] > 59 || (m[3] != null && +m[3] > 59)) return null; return +m[1] * 3600 + +m[2] * 60 + (m[3] ? +m[3] : 0); };
  function suyNgay2(ngay1, gio1, gio2) {
    const d = parseD(ngay1), a = secOf(gio1), b = secOf(gio2); if (!d || a == null || b == null) return '';
    return fmtD(new Date(d.getTime() + (b < a ? 864e5 : 0)));
  }
  /* Ghi ngày cân 2 vào CHÍNH phiếu cân khi nạp (Excel, Google Sheets) hoặc sửa tay, KHÔNG thêm trường nào khác: cấu trúc dữ liệu giữ y như file Excel nhập phiếu cân (cột ngay2).
   * Có ngày cân 2 thì giữ (nhập thật); để trống thì suy ra từ ngày cân 1 và giờ cân. old: phiếu trước khi sửa; ô ngày cân 2 vẫn đúng bằng số suy ra của phiếu cũ thì suy lại theo giờ mới
   * (đổi giờ cân thì ngày cân 2 đổi theo); người dùng gõ số khác thì giữ số đó. */
  function chuanHoaNgay2(p, old) {
    if (!p) return p;
    const cur = String(p.ngay2 == null ? '' : p.ngay2).trim(), oldSuy = old ? suyNgay2(old.ngay, old.gioCan1, old.gioCan2) : '';
    if (cur && !(old && cur === String(old.ngay2 || '').trim() && cur === oldSuy)) return p;   // nhập thật: giữ
    p.ngay2 = suyNgay2(p.ngay, p.gioCan1, p.gioCan2);
    return p;
  }
  /* {ngay, nguon}: nguon = 'nhập' (có ngày cân 2 thật), 'suy ra' (từ ngày cân 1 và giờ cân), 'theo ngày cân 1' (thiếu giờ) hoặc '' (không có ngày nào) */
  function ngay2Of(p) {
    p = p || {}; const e = parseD(p.ngay2); if (e) return {ngay: fmtD(e), nguon: 'nhập'};
    const s = suyNgay2(p.ngay, p.gioCan1, p.gioCan2); if (s) return {ngay: s, nguon: 'suy ra'};
    return p.ngay ? {ngay: String(p.ngay), nguon: 'theo ngày cân 1'} : {ngay: '', nguon: ''};
  }
  /* Cảnh báo khi ngày cân 2 NHẬP THẬT mâu thuẫn với ngày cân 1 và giờ cân (không chặn lưu) */
  function ngay2Warn(p) {
    p = p || {}; const e = parseD(p.ngay2), d = parseD(p.ngay); if (!e || !d) return [];
    const a = secOf(p.gioCan1), b = secOf(p.gioCan2), days = Math.round((e - d) / 864e5), w = [];
    if (days < 0) w.push('ngày cân 2 (' + fmtD(e) + ') trước ngày cân 1 (' + fmtD(d) + ')');
    else if (days > 1) w.push('ngày cân 2 (' + fmtD(e) + ') cách ngày cân 1 (' + fmtD(d) + ') ' + days + ' ngày');
    else if (a != null && b != null) {
      if (days === 0 && b < a) w.push('giờ cân 2 (' + p.gioCan2 + ') sớm hơn giờ cân 1 (' + p.gioCan1 + ') mà ngày cân 2 vẫn là ngày cân 1: cân qua nửa đêm thì ngày cân 2 phải là ' + fmtD(new Date(d.getTime() + 864e5)));
      if (days === 1 && b >= a) w.push('ngày cân 2 là ngày hôm sau nhưng giờ cân 2 (' + p.gioCan2 + ') không sớm hơn giờ cân 1 (' + p.gioCan1 + '): hai lần cân cách hơn 24 giờ');
    }
    return w;
  }
  const kgOf = p => (typeof p.klKg === 'number' && p.klKg > 0) ? p.klKg : (typeof p.kl === 'number' && p.kl > 0 ? Math.round(p.kl * 1000) : '');
  /* Bảng dữ liệu: dòng tiêu đề + mỗi phiếu cân một dòng. KL tính bằng kg; Địa chỉ = địa điểm rừng (in ở dòng “Địa chỉ rừng”); khách hàng trống thì lấy chủ rừng.
   * Đơn giá (đồng/tấn; dưới 100.000 là đồng/kg) và Thành tiền lấy từ phiếu cân (file nhập hoặc Google Sheets); thiếu thành tiền thì công cụ tự tính = khối lượng × đơn giá làm tròn xuống nghìn đồng; thiếu giá thì in 0. */
  function aoa(rec) {
    const info = rec.info || {}, owner = String(info.ten || '').trim();
    return [HEAD.slice()].concat((rec.pc || []).map(p => [String(p.soPhieu || ''), p.ngay || '', p.gioCan1 || '', ngay2Of(p).ngay, p.gioCan2 || '', p.bienSo || '', typeof p.can1 === 'number' ? p.can1 : '', typeof p.can2 === 'number' ? p.can2 : '', kgOf(p),
      p.khachHang || owner, p.diaChi || info.diaDiem || '', typeof p.donGia === 'number' && p.donGia > 0 ? p.donGia : '', typeof p.thanhTien === 'number' && p.thanhTien > 0 ? p.thanhTien : '', p.trangThai || '']));
  }
  /* Một khung nhìn chuẩn của phiếu cân để in, DÙNG CHUNG cho mọi nguồn (nhập file ở rừng, đưa từ Google Sheets, cập nhật biển số): chỉ đọc các trường chuẩn
   * soPhieu, ngay, gioCan1/2, bienSo, can1/2, klKg (hoặc kl tấn), khachHang. Phiếu thiếu trường nào vẫn in được (phần đó để trống) nhưng được báo để bổ sung. */
  const FIELDS = [['soPhieu', 'số phiếu'], ['ngay', 'ngày cân'], ['bienSo', 'biển số xe'], ['can1', 'cân lần 1'], ['can2', 'cân lần 2'], ['kl', 'khối lượng'], ['gioCan1', 'giờ cân 1'], ['gioCan2', 'giờ cân 2'], ['khachHang', 'khách hàng'], ['donGia', 'đơn giá'], ['thanhTien', 'thành tiền']];
  const has = (p, k) => k === 'thanhTien' ? ((typeof p.thanhTien === 'number' && p.thanhTien > 0) || (typeof p.donGia === 'number' && p.donGia > 0 && kgOf(p) !== '')) : k === 'donGia' ? (typeof p.donGia === 'number' && p.donGia > 0) : k === 'kl' ? kgOf(p) !== '' : k === 'can1' || k === 'can2' ? typeof p[k] === 'number' : String(p[k] == null ? '' : p[k]).trim() !== '';
  function gaps(pc) {
    const list = pc || [], by = {}, issues = [];
    list.forEach(p => { const miss = FIELDS.filter(([k]) => !has(p, k)).map(([, l]) => l); if (miss.length) { issues.push({soPhieu: String(p.soPhieu || '(chưa có số phiếu)'), missing: miss}); miss.forEach(m => { by[m] = (by[m] || 0) + 1; }); } });
    return {total: list.length, full: list.length - issues.length, issues, by};
  }
  /* Giao diện gọn: dữ liệu đã có trong hồ sơ nên bỏ phần chọn file Excel, tải mẫu, cột khách hàng, thông tin công ty (lấy từ Cài đặt); bố cục và cách in của công cụ giữ nguyên */
  const SIMPLE_CSS = '#drop,#getTpl,#fileinfo,#khWrap,#coBox,label:has(#soCol),label:has(#priceCol){display:none!important}';
  const SIMPLE_JS = 'var s=document.querySelector(".sec p");if(s)s.innerHTML="Chọn phiếu, tải PDF <b>PhieuCan.pdf</b> hoặc in.";var fi=document.getElementById("fileinfo");if(fi&&fi.parentElement)fi.parentElement.style.display="block";';
  /* Thông tin tiêu đề phiếu lấy từ hồ sơ công ty (Cài đặt → Công ty): tên, địa chỉ, điện thoại, fax, nơi lập. Chưa khai thì không gửi gì (công cụ dùng giá trị mặc định của nó) */
  const company = c => c && String(c.ten || '').trim() ? {coName: String(c.ten).trim(), coAddr: String(c.diaChi || '').trim(), coPhone: String(c.sdt || '').trim(), coFax: String(c.fax || '').trim(), place: String(c.noiLap || '').trim()} : {};
  /* Mã chạy trong cửa sổ công cụ sau khi tải xong: điền thông tin công ty vào các ô của công cụ, rồi đưa bảng vào ô chọn file như người dùng chọn một file .xlsx.
   * Ô nơi lập để trống thì giữ giá trị của công cụ; fax để trống thì phiếu không in FAX. */
  function inject(rows, co) {
    const set = Object.entries(co || {}).filter(([k, v]) => k === 'coFax' ? (co.coName || v) : v);   // công ty đã khai thì fax trống nghĩa là không in fax
    const fill = set.map(([k, v]) => 'var e=document.getElementById(' + JSON.stringify(k) + ');e.value=' + JSON.stringify(v) + ';e.dispatchEvent(new Event("input",{bubbles:true}));').join('');
    return '(function(){try{' + SIMPLE_JS + fill + (rows && rows.length > 1 ? 'var a=' + JSON.stringify(rows).replace(/\u2028|\u2029/g, '') + ';var ws=XLSX.utils.aoa_to_sheet(a),wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,"PHIEU_CAN");' +
      'var buf=XLSX.write(wb,{type:"array",bookType:"xlsx"});var f=new File([buf],"PhieuCan_HAKQN.xlsx",{type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"});var dt=new DataTransfer();dt.items.add(f);var i=document.getElementById("file");i.files=dt.files;i.dispatchEvent(new Event("change",{bubbles:true}));' : '') + 'return true}catch(e){return String(e&&e.message||e)}})()';
  }
  const api = {HEAD, aoa, inject, company, gaps, FIELDS, SIMPLE_CSS, suyNgay2, ngay2Of, ngay2Warn, chuanHoaNgay2};
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.HAKPhieuCan = api;
})(typeof window !== 'undefined' ? window : globalThis);
