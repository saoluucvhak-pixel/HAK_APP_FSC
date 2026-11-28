/* ========== 3.7.0: In bìa & mục lục hồ sơ FSC (Khổ A4) ==========
 * Cho phép xem trước và in / xuất PDF trang Bìa và Mục lục 20 biểu mẫu chuẩn FSC (BM-01 → BM-20).
 * Bố cục chuẩn in khổ A4 có ngắt trang page-break-after: always, tiêu đề, số trang.
 * Dùng lệnh in trực tiếp HB.inHtml(). */

function inTronBoHtml(rec, f) {
  const o = curOwner();
  const i = (f && f.info) || (rec && rec.info) || {};
  const oInfo = (o && o.info) || {};
  const maLo = i.maRung || '(chưa có mã)';
  const tenLo = i.tenRung || maLo;
  const chuRung = oInfo.ten || '(chưa đặt tên)';
  const cccd = oInfo.cccd || oInfo.ma || '—';
  const diaChi = oInfo.diaChi || i.diaDiem || '—';
  const dienTich = i.dienTich ? formatNumber(i.dienTich, 2) + ' ha' : '—';
  const slDuKien = forestYield(i) ? fmtTan(forestYield(i)) + ' tấn' : '—';
  const thucTe = f && f.pc && f.pc.length ? fmtTan(klPhieu(f.pc)) + ' tấn' : '—';
  const pcCount = (f && f.pc) ? f.pc.length : 0;
  const ncCount = (f && f.nc) ? f.nc.length : 0;
  const dxCount = (f && f.dx) ? f.dx.length : 0;
  const today = todayStr();
  const cty = (typeof theCompany === 'function' && theCompany()) || {};
  const noiLap = cty.noiLap || 'Quảng Nam';

  // Danh mục 20 biểu mẫu chuẩn FSC
  const bms = [
    ['BM-01', 'Hợp đồng khai thác (giao khoán)', 'Ký với tổ trưởng / đại diện tổ'],
    ['BM-02', 'Danh sách cấp phát BHLĐ', ncCount ? ncCount + ' nhân công' : '—'],
    ['BM-03', 'Hợp đồng lao động (trực tiếp)', 'Ký trực tiếp từng người'],
    ['BM-04', 'Hợp đồng vận chuyển gỗ keo', dxCount ? dxCount + ' xe vận chuyển' : '—'],
    ['BM-05', 'Bảng chấm công lao động khai thác', ncCount ? ncCount + ' nhân công' : '—'],
    ['BM-06', 'Danh sách tổ / đội khai thác', ncCount ? ncCount + ' người' : '—'],
    ['BM-07', 'Biên bản đào tạo an toàn lao động (ATLĐ)', 'Chủ rừng đào tạo'],
    ['BM-08', 'Bảng thanh toán tiền công khai thác', ncCount ? ncCount + ' người' : '—'],
    ['BM-09', 'Biên bản xác nhận khối lượng vận chuyển', pcCount ? pcCount + ' phiếu · ' + thucTe : '—'],
    ['BM-10', 'Biên bản thanh toán tiền vận chuyển', pcCount ? thucTe : '—'],
    ['BM-11', 'Cam kết nguồn gốc gỗ hợp pháp', 'Chủ rừng cam kết'],
    ['BM-12', 'Cam kết tuân thủ chính sách lao động', 'Không lao động dưới 18 tuổi'],
    ['BM-13', 'Biên bản kiểm tra hiện trường khai thác', 'Giám sát hiện trường'],
    ['BM-14', 'Biên bản nghiệm thu - thanh lý khai thác', 'Nghiệm thu thanh lý'],
    ['BM-15', 'Sổ theo dõi tai nạn lao động', 'Ghi nhận sự cố ATLĐ'],
    ['BM-16', 'Biên bản kiểm tra an toàn thiết bị', 'Cưa xăng, xe cộ, PCCC'],
    ['BM-17', 'Biên bản thẩm định điều kiện khai thác', 'Hội đồng thẩm định'],
    ['BM-18', 'Nhật ký truy xuất nguồn gốc của lô', 'Dòng thời gian đầy đủ của lô'],
    ['BM-19', 'Phổ biến chính sách quản lý rừng bền vững', 'Tuyên truyền FSC'],
    ['BM-20', 'Giấy ủy quyền đại diện tổ khai thác', 'Công nhân ủy quyền tổ trưởng']
  ];

  return `<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="utf-8">
<title>Bìa và mục lục hồ sơ - Lô ${esc(maLo)} - ${esc(chuRung)}</title>
<style>
  @page { size: A4 portrait; margin: 15mm; }
  body { font-family: 'Times New Roman', Times, serif; font-size: 13pt; line-height: 1.4; color: #000; background: #fff; margin: 0; padding: 20px; }
  .trangBia { page-break-after: always; text-align: center; padding-top: 50px; min-height: 90vh; box-sizing: border-box; }
  .trangBia h1 { font-size: 21pt; margin: 20px 0 10px; text-transform: uppercase; font-weight: bold; }
  .trangBia h2 { font-size: 16pt; margin: 10px 0 25px; font-weight: bold; }
  .khungThongTin { border: 2px double #000; padding: 20px; margin: 30px auto; max-width: 650px; text-align: left; }
  .khungThongTin p { margin: 7px 0; font-size: 12.5pt; }
  .trangNoiDung { page-break-after: always; padding-top: 10px; }
  .trangNoiDung:last-child { page-break-after: auto; }
  .tieuDeTrang { text-align: center; margin-bottom: 16px; }
  .tieuDeTrang h3 { margin: 0; font-size: 15pt; text-transform: uppercase; }
  .tieuDeTrang p { margin: 4px 0 0; font-style: italic; font-size: 11.5pt; }
  table.tblA4 { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 11pt; }
  table.tblA4 th, table.tblA4 td { border: 1px solid #000; padding: 4px 6px; vertical-align: middle; }
  table.tblA4 th { background: #f2f2f2; font-weight: bold; text-align: center; }
  .chuKyBox { display: flex; justify-content: space-between; margin-top: 30px; text-align: center; }
  .chuKyCol { width: 45%; }
  .chuKyCol b { display: block; margin-bottom: 50px; }
  @media print {
    body { padding: 0; }
  }
</style>
</head>
<body>
<!-- TRANG BÌA HỒ SƠ -->
<div class="trangBia">
  <div style="font-size:13pt;font-weight:bold;text-transform:uppercase">HỆ THỐNG QUẢN LÝ RỪNG BỀN VỮNG FSC</div>
  <div style="font-size:11.5pt;margin-top:4px">HỒ SƠ KHAI THÁC VÀ VẬN CHUYỂN GỖ RỪNG TRỒNG</div>
  <div style="font-size:24pt;margin:25px 0 10px">🌲 🪵 📦</div>
  <h1>TẬP HỒ SƠ LÔ RỪNG KHAI THÁC</h1>
  <h2>TIÊU CHUẨN CHỨNG CHỈ RỪNG QUỐC TẾ (FSC-FM/CoC)</h2>

  <div class="khungThongTin">
    <p><b>• Mã số lô rừng:</b> ${esc(maLo)}</p>
    <p><b>• Tên lô rừng / địa danh:</b> ${esc(tenLo)}</p>
    <p><b>• Chủ rừng (Bên A):</b> ${esc(chuRung)}</p>
    <p><b>• Số CCCD / Mã định danh:</b> ${esc(cccd)}</p>
    <p><b>• Địa chỉ thường trú:</b> ${esc(diaChi)}</p>
    <p><b>• Diện tích khai thác:</b> ${dienTich}</p>
    <p><b>• Sản lượng dự kiến:</b> ${slDuKien}</p>
    <p><b>• Khối lượng cân thực tế:</b> ${thucTe} (${pcCount} chuyến cân)</p>
    <p><b>• Lực lượng tác nghiệp:</b> ${ncCount} nhân công · ${dxCount} phương tiện</p>
  </div>

  <p style="margin-top:30px;font-style:italic">${esc(noiLap)}, ngày ${today}</p>
</div>

<!-- TRANG MỤC LỤC BIỂU MẪU -->
<div class="trangNoiDung">
  <div class="tieuDeTrang">
    <h3>MỤC LỤC HỒ SƠ LÔ RỪNG FSC</h3>
    <p>Danh mục 20 biểu mẫu quy định từ BM-01 đến BM-20</p>
  </div>
  <table class="tblA4">
    <thead>
      <tr>
        <th style="width:36px">STT</th>
        <th style="width:80px">Mã mẫu</th>
        <th>Tên văn bản / Biểu mẫu hồ sơ</th>
        <th style="width:190px">Số liệu thực tế của lô</th>
      </tr>
    </thead>
    <tbody>
      ${bms.map(([ma, ten, mota], idx) => `<tr>
        <td style="text-align:center">${idx + 1}</td>
        <td style="text-align:center"><b>${esc(ma)}</b></td>
        <td><b>${esc(ten)}</b></td>
        <td>${esc(mota)}</td>
      </tr>`).join('')}
    </tbody>
  </table>

  <div class="chuKyBox">
    <div class="chuKyCol">
      <p style="font-style:italic">Ngày … tháng … năm …</p>
      <b>ĐẠI DIỆN ĐƠN VỊ THU MUA / KHAI THÁC</b>
      <p>(Ký, ghi rõ họ tên)</p>
    </div>
    <div class="chuKyCol">
      <p style="font-style:italic">Ngày … tháng … năm …</p>
      <b>ĐẠI DIỆN CHỦ RỪNG</b>
      <p>(Ký, ghi rõ họ tên)</p>
      <br><br>
      <b>${esc(chuRung)}</b>
    </div>
  </div>
</div>
</body>
</html>`;
}

async function inTronBoPdfMo(rec) {
  const f = curForest();
  if (!f || !rec) return note('Chưa chọn lô rừng để in.', 'warn');
  const html = inTronBoHtml(rec, f);
  const tenFile = 'Bia_MucLuc_FSC_' + slug(f.info.maRung || f.id || 'lo');
  if (HB && HB.inHtml) {
    return inHtml(html, tenFile);
  }
  note('In trong app cần bản cài trên Windows.', 'err');
}

function inBienBanKiemToanFscHtml(rec, f) {
  const o = curOwner();
  const i = (f && f.info) || (rec && rec.info) || {};
  const oInfo = (o && o.info) || {};
  const maLo = i.maRung || '(chưa có mã)';
  const tenLo = i.tenRung || maLo;
  const chuRung = oInfo.ten || '(chưa đặt tên)';
  const cccd = oInfo.cccd || oInfo.ma || '—';
  const diaChi = oInfo.diaChi || i.diaDiem || '—';
  const dienTich = i.dienTich ? formatNumber(i.dienTich, 2) + ' ha' : '—';
  const slDuKien = forestYield(i) ? fmtTan(forestYield(i)) + ' tấn' : '—';
  const thucTe = f && f.pc && f.pc.length ? fmtTan(klPhieu(f.pc)) + ' tấn' : '—';
  const pcCount = (f && f.pc) ? f.pc.length : 0;
  const ncCount = (f && f.nc) ? f.nc.length : 0;
  const dxCount = (f && f.dx) ? f.dx.length : 0;
  const cty = (typeof theCompany === 'function' && theCompany()) || {};
  const noiLap = cty.noiLap || 'Quảng Nam';
  let kt;
  try { kt = exportCheck(rec); } catch (e) { kt = null; }
  const chan = kt?.chan || [], doi = kt?.doi || [];
  const diemFsc = Math.max(0, 100 - chan.length * 20 - doi.length * 5);
  const ketQua = kt
    ? '<b>' + diemFsc + '/100</b><br><small>' + chan.length + ' mục chặn xuất · ' + doi.length + ' mục cần đối chiếu</small>'
    : '<b>Chưa kiểm tra được</b><br><small>Mở màn Kiểm tra hồ sơ và thử lại trước khi sử dụng biên bản.</small>';

  return `<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="utf-8">
<title>Biên bản tự kiểm toán FSC - ${esc(maLo)}</title>
<style>
  @page { size: A4 portrait; margin: 18mm 15mm 15mm 15mm; }
  body { font-family: "Times New Roman", Times, serif; font-size: 13pt; line-height: 1.4; color: #111; margin: 0; padding: 0; }
  .hdTable { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
  .hdTable td { vertical-align: top; }
  .docTitle { text-align: center; margin: 18px 0 12px; }
  .docTitle h2 { font-size: 16pt; margin: 0; text-transform: uppercase; font-weight: bold; }
  .docTitle p { font-size: 11pt; font-style: italic; margin: 4px 0 0; }
  .scoreBox { border: 2px solid #2e7d32; background: #f1f8e9; padding: 10px 14px; border-radius: 6px; margin: 14px 0; text-align: center; }
  .scoreBox b { font-size: 15pt; color: #1b5e20; }
  .secH { font-size: 13pt; font-weight: bold; text-transform: uppercase; margin: 14px 0 6px; border-bottom: 1px solid #333; padding-bottom: 2px; }
  .tbl { width: 100%; border-collapse: collapse; margin: 8px 0; font-size: 11.5pt; }
  .tbl th, .tbl td { border: 1px solid #444; padding: 5px 8px; text-align: left; }
  .tbl th { background: #f0f0f0; }
  .chuKy { display: flex; justify-content: space-between; margin-top: 30px; text-align: center; font-size: 12pt; page-break-inside: avoid; }
  .chuKyCol { width: 30%; }
</style>
</head>
<body>
<table class="hdTable">
  <tr>
    <td style="width:50%;text-align:center">
      <b>${esc(cty.ten || 'HAK GROUP')}</b><br>
      <b>BAN QUẢN LÝ RỪNG BỀN VỮNG FSC</b><br>
      <small>Số: ……/KTNB-FSC</small>
    </td>
    <td style="width:50%;text-align:center">
      <b>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</b><br>
      <b>Độc lập – Tự do – Hạnh phúc</b><br>
      <small>-------------------</small>
    </td>
  </tr>
</table>

<div class="docTitle">
  <h2>BIÊN BẢN TỰ KIỂM TOÁN NỘI BỘ TIÊU CHUẨN FSC</h2>
  <p>(Đánh giá rủi ro pháp lý, chuỗi hành trình CoC và điều kiện khai thác trước thanh tra quốc tế)</p>
</div>

<div class="scoreBox">
  ĐIỂM KIỂM TRA NỘI BỘ: ${ketQua}
</div>

<div class="secH">I. THÔNG TIN LÔ RỪNG ĐƯỢC KIỂM TOÁN</div>
<table class="tbl">
  <tr><td style="width:25%"><b>Mã lô rừng:</b></td><td style="width:25%">${esc(maLo)}</td><td style="width:25%"><b>Tên rừng / vị trí:</b></td><td style="width:25%">${esc(tenLo)}</td></tr>
  <tr><td><b>Chủ rừng (Bên A):</b></td><td>${esc(chuRung)}</td><td><b>Số CCCD / Mã:</b></td><td>${esc(cccd)}</td></tr>
  <tr><td><b>Địa điểm khai thác:</b></td><td colspan="3">${esc(diaChi)}</td></tr>
  <tr><td><b>Diện tích hợp đồng:</b></td><td>${esc(dienTich)}</td><td><b>Sản lượng dự kiến:</b></td><td>${esc(slDuKien)}</td></tr>
  <tr><td><b>Sản lượng đã cân:</b></td><td>${esc(thucTe)} (${pcCount} phiếu)</td><td><b>Lực lượng khai thác:</b></td><td>${ncCount} người · ${dxCount} xe</td></tr>
</table>

<div class="secH">II. ĐỐI SOÁT CÁC TIÊU CHÍ CỐT LÕI (FSC CORE CRITERIA)</div>
<table class="tbl">
  <thead>
    <tr><th style="width:5%">STT</th><th style="width:30%">Tiêu chí FSC</th><th style="width:45%">Hiện trạng hồ sơ lô</th><th style="width:20%;text-align:center">Kết luận</th></tr>
  </thead>
  <tbody>
    <tr>
      <td style="text-align:center">1</td>
      <td><b>Tính hợp pháp đất đai & Hợp đồng</b></td>
      <td>Đối chiếu hợp đồng, giấy tờ đất và diện tích khảo sát.</td>
      <td style="text-align:center">Cần xác minh</td>
    </tr>
    <tr>
      <td style="text-align:center">2</td>
      <td><b>Giới hạn trữ lượng khai thác</b></td>
      <td>Khối lượng thực tế: ${esc(thucTe)} so với dự kiến: ${esc(slDuKien)}. Đối chiếu ranh giới và trữ lượng khai thác.</td>
      <td style="text-align:center">Cần xác minh</td>
    </tr>
    <tr>
      <td style="text-align:center">3</td>
      <td><b>An toàn lao động & BHLĐ (BM-02)</b></td>
      <td>Danh sách có ${ncCount} nhân công. Đối chiếu tuổi lao động và hồ sơ ký nhận BHLĐ.</td>
      <td style="text-align:center">Cần xác minh</td>
    </tr>
    <tr>
      <td style="text-align:center">4</td>
      <td><b>Chuỗi hành trình CoC & Đội xe</b></td>
      <td>Đội xe ${dxCount} phương tiện; kiểm tra hạn kiểm định, giấy phép lái xe và đối chiếu trạm cân.</td>
      <td style="text-align:center">Cần xác minh</td>
    </tr>
  </tbody>
</table>

${kt && (chan.length || doi.length) ? `
<div class="secH" style="color:#b71c1c">III. CÁC NỘI DUNG CẦN ĐỐI CHIẾU TRƯỚC THANH TRA</div>
<ul style="font-size:11pt;margin:6px 0;padding-left:22px">
  ${chan.map(c => '<li style="color:#b71c1c"><b>[CHẶN]:</b> ' + esc(c.text) + '</li>').join('')}
  ${doi.map(d => '<li style="color:#e65100"><b>[ĐỐI CHIẾU]:</b> ' + esc(d.text) + '</li>').join('')}
</ul>
` : `
<div class="secH" style="color:#1b5e20">III. KẾT LUẬN KIỂM TOÁN NỘI BỘ</div>
<p style="margin:6px 0;font-size:11.5pt">${kt ? 'Ứng dụng chưa phát hiện mục chặn xuất hoặc mục cần đối chiếu.' : 'Chưa kiểm tra được hồ sơ.'} Cán bộ kiểm soát xác minh hồ sơ gốc và ghi kết luận trước khi ký.</p>
`}

<div class="chuKy">
  <div class="chuKyCol">
    <b>CÁN BỘ KIỂM SOÁT FSC</b><br>
    <i>(Ký và ghi rõ họ tên)</i>
  </div>
  <div class="chuKyCol">
    <b>KẾ TOÁN TRƯỞNG</b><br>
    <i>(Ký và ghi rõ họ tên)</i>
  </div>
  <div class="chuKyCol">
    <i>${esc(noiLap)}, ngày … tháng … năm …</i><br>
    <b>GIÁM ĐỐC ĐIỀU HÀNH</b><br>
    <i>(Ký, đóng dấu)</i>
  </div>
</div>
</body>
</html>`;
}

async function inBienBanKiemToanFscMo(rec) {
  const f = curForest();
  if (!f || !rec) return note('Chưa chọn lô rừng để xuất biên bản kiểm toán.', 'warn');
  const html = inBienBanKiemToanFscHtml(rec, f);
  const tenFile = 'KiemToan_FSC_' + slug(f.info.maRung || f.id || 'lo');
  if (HB && HB.inHtml) {
    return inHtml(html, tenFile);
  }
  note('In trong app cần bản cài trên Windows.', 'err');
}
