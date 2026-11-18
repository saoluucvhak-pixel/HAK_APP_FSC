/* Tiện ích bản 2.3 (hàm thuần, dùng chung giao diện và kiểm thử): dán từ Excel, mục lục gói in, theo dõi in lại / ký lại, trang “Chỉ xem”, hướng dẫn lần đầu.
 * Không đọc ghi file, không gọi mạng, không sửa dữ liệu truyền vào. */
(function (root) {
  'use strict';
  const s = v => (v == null ? '' : String(v)).trim();
  const esc = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));

  /* ---------- 1. DÁN TỪ EXCEL ----------
   * Chữ sao chép từ Excel / Google Sheets: mỗi dòng một hàng, các ô cách nhau bằng TAB; ô có xuống dòng hoặc TAB được bọc trong dấu nháy kép ("" là một dấu nháy).
   * danParse(text) → mảng các hàng (mảng ô). Ô số được đổi thành số theo cách ghi Việt Nam (12,5 · 1.234,5) hoặc dạng 12.5; chuỗi số có số 0 đứng đầu hoặc dài từ 9 chữ số
   * (CCCD, điện thoại, số phiếu) giữ nguyên là chữ; ngày dd/mm/yyyy giữ nguyên là chữ. Bỏ các dòng trống hoàn toàn. */
  function danO(v) {
    const t = s(v); if (t === '') return '';
    if (/^-?\d{1,3}(\.\d{3})+(,\d+)?$/.test(t)) return Number(t.replace(/\./g, '').replace(',', '.'));
    if (/^-?\d+,\d+$/.test(t)) return Number(t.replace(',', '.'));
    if (/^-?\d+(\.\d+)?$/.test(t) && !/^-?0\d/.test(t) && t.replace(/\D/g, '').length < 9) return Number(t);
    return t;
  }
  function danParse(text) {
    const src = String(text == null ? '' : text).replace(/\r\n?/g, '\n'), rows = []; let row = [], cell = '', q = false, i = 0, coNhay = false;
    const xongO = () => { row.push(coNhay ? cell : danO(cell)); cell = ''; coNhay = false; }, xongDong = () => { xongO(); if (row.some(c => s(c) !== '')) rows.push(row); row = []; };
    while (i < src.length) {
      const c = src[i];
      if (q) { if (c === '"') { if (src[i + 1] === '"') { cell += '"'; i += 2; continue; } q = false; i++; continue; } cell += c; i++; continue; }
      if (c === '"' && cell === '') { q = true; coNhay = true; i++; continue; }
      if (c === '\t') { xongO(); i++; continue; }
      if (c === '\n') { xongDong(); i++; continue; }
      cell += c; i++;
    }
    if (cell !== '' || row.length) xongDong();
    return rows;
  }
  /* kiểm nhanh trước khi nạp: có dòng tiêu đề chứa đủ các cột bắt buộc không. Trả {ok, error, dong: số dòng dữ liệu, cot: số cột} */
  function danKiem(aoa, batBuoc) {
    if (!aoa || !aoa.length) return {ok: false, error: 'Chưa có dữ liệu. Chép vùng ô trong Excel (gồm cả dòng tiêu đề) rồi dán vào đây.'};
    const h = aoa.findIndex(r => (batBuoc || []).every(n => r.some(c => s(c) === n)));
    if (h < 0) return {ok: false, error: 'Vùng dán thiếu dòng tiêu đề hoặc thiếu cột: ' + (batBuoc || []).filter(n => !aoa[0].some(c => s(c) === n)).join(', ') + '. Chép cả dòng tiêu đề của file mẫu.'};
    return {ok: true, error: '', dong: aoa.length - h - 1, cot: aoa[h].length};
  }

  /* ---------- 2. MỤC LỤC GÓI IN ----------
   * files: [{path, pham: {ten}}] theo đúng thứ tự trong gói; tenBM(ma) → tên biểu mẫu; soBan(ma) → số bản. Trả [{stt, ma, ten, doiTuong, file, soBan}] (bỏ chính tờ mục lục). */
  function mucLuc(files, tenBM, soBan) {
    return (files || []).filter(f => f && f.path && !/^00_/.test(f.path)).map((f, i) => { const ma = (/(?:^|\/)(\d\d)_/.exec(f.path) || [])[1] || '';
      return {stt: i + 1, ma, ten: (tenBM && tenBM(ma)) || '', doiTuong: s(f.pham && f.pham.ten), file: f.path, soBan: (soBan && soBan(ma)) || 1}; });
  }

  /* ---------- 3. THEO DÕI IN LẠI, KÝ LẠI (phụ lục) ----------
   * soIn: Sổ in của lô [{at, ma, hanh: 'in' | 'ky' | 'huyky' | 'huyin', lyDo}]. Trả các mẫu đã in từ lần thứ hai hoặc ký từ lần thứ hai:
   * [{ma, lanIn, lanKy, dong: [{at, hanh, lan, lyDo}]}] theo mã mẫu. Mẫu chỉ in và ký một lần không nằm trong phụ lục. */
  function kyLai(soIn) {
    const by = new Map();
    (soIn || []).forEach(x => { if (!x || !x.ma) return; if (!by.has(x.ma)) by.set(x.ma, {ma: x.ma, lanIn: 0, lanKy: 0, dong: []}); const g = by.get(x.ma);
      const lan = x.hanh === 'in' ? ++g.lanIn : x.hanh === 'ky' ? ++g.lanKy : 0; g.dong.push({at: x.at, hanh: x.hanh, lan, lyDo: s(x.lyDo)}); });
    return [...by.values()].filter(g => g.lanIn > 1 || g.lanKy > 1).sort((a, b) => a.ma.localeCompare(b.ma));
  }
  /* lý do ghi vào Sổ in khi đánh dấu đã ký: lần đầu “đã ký”, từ lần hai “ký lại lần N” */
  const lyDoKy = (soIn, ma) => { const n = (soIn || []).filter(x => x && x.ma === ma && x.hanh === 'ky').length; return n ? 'ký lại lần ' + (n + 1) : 'đã ký'; };

  /* ---------- 4. TRANG “CHỈ XEM” ----------
   * d = {phanMem, phienBan, taoLuc, chu: {ten, ma, cccd, diaChi}, lo: {ma, ten, diaDiem, dienTich, tuNgay, denNgay, trangThai}, chot: {phienBan, hash, at} | null,
   *      tong: {nc, dx, pc, kl}, doi: [{ten, toTruong, soNguoi, kl}], doiXe: [{ten, nguoiKy, soXe, soHD, soXN, kl}], nc: [[...]], dx: [[...]], pc: [[...]], nhatKy: [{at, hanh, lyDo}], files: [đường dẫn]}
   * Trả MỘT trang HTML tự đủ (không script, không tài nguyên ngoài): mở bằng trình duyệt bất kỳ, chỉ để xem và in; không nhập lại được vào phần mềm. Mọi giá trị đều được thoát ký tự HTML. */
  function chiXemHtml(d) {
    d = d || {}; const lo = d.lo || {}, chu = d.chu || {}, t = d.tong || {};
    const bang = (tieuDe, cot, dong, id) => '<h2>' + esc(tieuDe) + ' <small>(' + (dong || []).length + ')</small></h2>' + ((dong || []).length ? '<table id="' + id + '"><thead><tr>' + cot.map(c => '<th>' + esc(c) + '</th>').join('') + '</tr></thead><tbody>' +
      dong.map(r => '<tr>' + r.map(c => '<td>' + esc(c) + '</td>').join('') + '</tr>').join('') + '</tbody></table>' : '<p class="mut">Không có dữ liệu.</p>');
    const kv = rows => '<table class="kv">' + rows.filter(r => s(r[1]) !== '').map(r => '<tr><th>' + esc(r[0]) + '</th><td>' + esc(r[1]) + '</td></tr>').join('') + '</table>';
    return '<!doctype html>\n<html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>' + esc('Hồ sơ lô ' + s(lo.ma) + ' (chỉ xem)') + '</title><style>' +
      'body{font:14px/1.5 "Segoe UI",Arial,sans-serif;color:#1c2b22;margin:0;padding:24px 16px;background:#f5f7f5}main{max-width:1000px;margin:0 auto;background:#fff;padding:24px;border:1px solid #d7ded9;border-radius:8px}' +
      'h1{font-size:22px;margin:0 0 4px}h2{font-size:16px;margin:22px 0 6px;border-bottom:1px solid #d7ded9;padding-bottom:4px}small,.mut{color:#5d6b63;font-weight:400}' +
      '.nhan{display:inline-block;background:#fff4d6;border:1px solid #e3c768;border-radius:4px;padding:2px 8px;font-weight:600;margin:6px 0}' +
      'table{border-collapse:collapse;width:100%;margin:6px 0;font-size:13px}th,td{border:1px solid #d7ded9;padding:4px 6px;text-align:left;vertical-align:top}thead th{background:#eef3ef}.kv th{width:220px;background:#f5f7f5}' +
      '.wrap{overflow-x:auto}code{font-family:Consolas,monospace}@media print{body{background:#fff;padding:0}main{border:0;padding:0;max-width:none}h2{break-after:avoid}tr{break-inside:avoid}}' +
      '</style></head><body><main>' +
      '<h1>Hồ sơ khai thác lô ' + esc(lo.ma) + (s(lo.ten) ? ' – ' + esc(lo.ten) : '') + '</h1><div class="nhan" id="chiXemNhan">BẢN CHỈ XEM · không sửa được, không nhập lại vào phần mềm</div>' +
      '<p class="mut">Tạo lúc ' + esc(d.taoLuc) + ' bằng ' + esc(d.phanMem || 'HAKQN Desktop') + (s(d.phienBan) ? ' ' + esc(d.phienBan) : '') + '. Số liệu là dữ liệu đã lưu tại thời điểm tạo.</p>' +
      '<h2>Chủ rừng và lô</h2>' + kv([['Chủ rừng', s(chu.ten) + (s(chu.ma) ? ' · mã ' + s(chu.ma) : '')], ['CCCD', chu.cccd], ['Địa chỉ', chu.diaChi], ['Mã lô', lo.ma], ['Tên lô', lo.ten], ['Địa điểm', lo.diaDiem], ['Diện tích (ha)', lo.dienTich],
        ['Thời gian khai thác', s(lo.tuNgay) + (s(lo.denNgay) ? ' – ' + s(lo.denNgay) : '')], ['Trạng thái', lo.trangThai], ['Số nhân công', t.nc], ['Số xe', t.dx], ['Số phiếu cân', t.pc], ['Tổng khối lượng (tấn)', t.kl]]) +
      (d.chot ? '<h2>Chốt hồ sơ</h2>' + kv([['Phiên bản chốt', d.chot.phienBan], ['Dấu vân tay', d.chot.hash], ['Thời điểm chốt', d.chot.at]]) : '') +
      '<div class="wrap">' + bang('Đội khai thác', ['Đội', 'Tổ trưởng', 'Số người', 'Khối lượng (tấn)'], (d.doi || []).map(x => [x.ten, x.toTruong, x.soNguoi, x.kl]), 'cxDoi') + '</div>' +
      '<div class="wrap">' + bang('Đội xe', ['Đội xe', 'Người ký', 'Số xe', 'Số hợp đồng vận chuyển', 'Số biên bản xác nhận KL', 'Khối lượng (tấn)'], (d.doiXe || []).map(x => [x.ten, x.nguoiKy, x.soXe, x.soHD, x.soXN, x.kl]), 'cxDoiXe') + '</div>' +
      '<div class="wrap">' + bang('Nhân công', ['STT', 'Họ và tên', 'Vai trò', 'Chức danh', 'Đội'], d.nc, 'cxNc') + '</div>' +
      '<div class="wrap">' + bang('Xe vận chuyển', ['STT', 'Biển số', 'Chủ xe', 'Tài xế', 'Đội xe'], d.dx, 'cxDx') + '</div>' +
      '<div class="wrap">' + bang('Phiếu cân', ['STT', 'Ngày', 'Số phiếu', 'Biển số', 'Khối lượng (tấn)', 'Đội'], d.pc, 'cxPc') + '</div>' +
      '<div class="wrap">' + bang('Nhật ký vòng đời', ['Thời điểm', 'Việc', 'Lý do'], (d.nhatKy || []).map(x => [x.at, x.hanh, x.lyDo]), 'cxNhatKy') + '</div>' +
      ((d.files || []).length ? '<h2>Biểu mẫu kèm theo trong gói <small>(' + d.files.length + ')</small></h2><ol id="cxFiles">' + d.files.map(f => '<li>' + esc(f) + '</li>').join('') + '</ol>' : '') +
      '</main></body></html>\n';
  }

  /* ---------- 5. HƯỚNG DẪN LẦN ĐẦU ----------
   * Các bước và tình trạng tính từ dữ liệu đang có (không lưu gì): [{id, ten, moTa, xong, di: nơi mở}]. xong của bước sau không phụ thuộc bước trước (người dùng có thể làm lệch thứ tự). */
  function huongDan(db) {
    const rs = Object.values((db && db.rs) || {}), lots = []; rs.forEach(o => Object.values((o && o.forests) || {}).forEach(f => lots.push(f)));
    const co = fn => lots.some(fn), items = f => Object.keys(((f && f.inAn) || {}).items || {}).length + Object.keys(((f && f.inDot2) || {}).items || {}).length;
    return [
      {id: 'chu', ten: 'Tạo chủ rừng', moTa: 'Nhập họ tên, CCCD, địa chỉ của chủ rừng (hoặc lấy từ Tra cứu Google Sheets).', xong: rs.length > 0},
      {id: 'lo', ten: 'Tạo lô rừng', moTa: 'Trong hồ sơ chủ rừng, thêm lô: mã lô, địa điểm, diện tích, thời gian khai thác.', xong: lots.length > 0},
      {id: 'nc', ten: 'Nhập đội khai thác và nhân công', moTa: 'Tab Nhân công: chọn từ Danh mục, nạp file Excel hoặc dán từ Excel; khai đơn giá theo vị trí.', xong: co(f => (f.nc || []).length > 0)},
      {id: 'dx', ten: 'Nhập xe và đội xe', moTa: 'Tab Vận chuyển: thêm xe, người ký của từng đội xe, cước vận chuyển.', xong: co(f => (f.dx || []).length > 0)},
      {id: 'pc', ten: 'Nhập phiếu cân', moTa: 'Phiếu cân của hợp đồng vận chuyển: nạp file, dán từ Excel hoặc nhập từng phiếu; khối lượng của lô lấy từ phiếu cân.', xong: co(f => (f.pc || []).length > 0)},
      {id: 'xuat', ten: 'Kiểm tra và xuất hồ sơ', moTa: 'Tab Kiểm tra nêu mục còn thiếu; tab Xuất hồ sơ tải biểu mẫu Word, rồi đánh dấu đã in, đã ký.', xong: co(f => items(f) > 0)}
    ];
  }

  const api = {danParse, danO, danKiem, mucLuc, kyLai, lyDoKy, chiXemHtml, huongDan, esc};
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.HAKTienIch = api;
})(typeof self !== 'undefined' ? self : this);
