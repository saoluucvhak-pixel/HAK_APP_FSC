/* In phiếu cân bằng NGUYÊN BẢN công cụ PhieuCan (renderer/PhieuCan.html, giữ nguyên từng byte: bố cục tính theo mm, khổ giấy lỗ 240 × 279 mm,
 * đường xé giữa, dịch lề, hai liên…). Phần mềm KHÔNG vẽ lại phiếu: chỉ mở đúng file đó trong một cửa sổ riêng và nạp sẵn danh sách phiếu cân của rừng
 * bằng chính ô chọn file Excel của công cụ (tạo một bảng tính có đúng các cột công cụ yêu cầu), nên cách đọc dữ liệu, xem trước, in và tải PDF giống hệt bản gốc.
 * Hàm thuần: dùng ở giao diện (tạo bảng) và ở tiến trình chính (tạo mã nạp dữ liệu). */
(function (root) {
  const HEAD = ['Số phiếu', 'Ngày cân 1', 'Giờ cân 1', 'Ngày cân 2', 'Giờ cân 2', 'Biển số 1', 'Cân 1', 'Cân 2', 'KL', 'Khách hàng', 'Địa chỉ', 'Đơn giá_TC', 'Thành tiền'];
  const kgOf = p => (typeof p.klKg === 'number' && p.klKg > 0) ? p.klKg : (typeof p.kl === 'number' && p.kl > 0 ? Math.round(p.kl * 1000) : '');
  /* Bảng dữ liệu: dòng tiêu đề + mỗi phiếu cân một dòng. KL tính bằng kg; Địa chỉ = địa điểm rừng (in ở dòng “Địa chỉ rừng”); khách hàng trống thì lấy chủ rừng.
   * Đơn giá và Thành tiền để trống (phiếu in “0”): hồ sơ khai thác chưa quản lý giá mua; cần giá thì nạp file Excel có cột giá ngay trong công cụ. */
  function aoa(rec) {
    const info = rec.info || {}, owner = String(info.ten || '').trim();
    return [HEAD.slice()].concat((rec.pc || []).map(p => [String(p.soPhieu || ''), p.ngay || '', p.gioCan1 || '', p.ngay || '', p.gioCan2 || '', p.bienSo || '', typeof p.can1 === 'number' ? p.can1 : '', typeof p.can2 === 'number' ? p.can2 : '', kgOf(p),
      p.khachHang || owner, info.diaDiem || '', '', '']));
  }
  /* Một khung nhìn chuẩn của phiếu cân để in, DÙNG CHUNG cho mọi nguồn (nhập file ở rừng, đưa từ Google Sheets, cập nhật biển số): chỉ đọc các trường chuẩn
   * soPhieu, ngay, gioCan1/2, bienSo, can1/2, klKg (hoặc kl tấn), khachHang. Phiếu thiếu trường nào vẫn in được (phần đó để trống) nhưng được báo để bổ sung. */
  const FIELDS = [['soPhieu', 'số phiếu'], ['ngay', 'ngày cân'], ['bienSo', 'biển số xe'], ['can1', 'cân lần 1'], ['can2', 'cân lần 2'], ['kl', 'khối lượng'], ['gioCan1', 'giờ cân 1'], ['gioCan2', 'giờ cân 2'], ['khachHang', 'khách hàng']];
  const has = (p, k) => k === 'kl' ? kgOf(p) !== '' : k === 'can1' || k === 'can2' ? typeof p[k] === 'number' : String(p[k] == null ? '' : p[k]).trim() !== '';
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
  const api = {HEAD, aoa, inject, company, gaps, FIELDS, SIMPLE_CSS};
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.HAKPhieuCan = api;
})(typeof window !== 'undefined' ? window : globalThis);
