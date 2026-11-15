/* MỘT BỘ KIỂM TRA dữ liệu cho mỗi lô (hàm thuần, không phụ thuộc giao diện; dùng chung ở giao diện — nhúng khi build — và kiểm thử Node).
 *
 * Mọi quy tắc kiểm tra của lô (nhân công, xe, phiếu cân, cổng xuất, nhập liệu, bản nháp, checklist tiến độ) cùng sinh ra MỘT dạng mục:
 *   {muc: 'chan' | 'doi',          chặn xuất | cần đối chiếu (không chặn)
 *    nhom,                         tên nhóm hiển thị
 *    doiTuong: {loai, ten, dong},  loại: 'lo' | 'doi' (đội khai thác) | 'doiXe' | 'dong' (một dòng dữ liệu); ten: tên đội / đội xe nếu có; dong: số dòng nếu có
 *    bieuMau: [mã biểu mẫu bị ảnh hưởng: '01'...'20'],
 *    text, ref (chỗ cần xem: số dòng, số phiếu, tên mục), noiSua: {ftab, tab, view, focus...}}
 * Màn Kiểm tra trước khi xuất, cổng xuất từng biểu mẫu, tiến độ và thanh tổng quan chỉ ĐỌC từ danh sách này (tomTat, bieuMauBiChan, chanBieuMau, theoDoiTuong). */
(function (root) {
  const MUC = {CHAN: 'chan', DOI_CHIEU: 'doi'};
  const TAT_CA = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20'];
  const KHAI_THAC = ['01', '02', '03', '05', '06', '07', '08', '14', '20'];   // biểu mẫu theo đội khai thác: hợp đồng, BHLĐ, lao động, chấm công, danh sách đội, đào tạo, tiền công, nghiệm thu, ủy quyền
  const VAN_CHUYEN = ['04', '09', '10'];                                      // hợp đồng vận chuyển, xác nhận khối lượng, thanh toán vận chuyển
  /* nhóm → biểu mẫu bị ảnh hưởng khi mục thuộc nhóm đó bị chặn (nhóm lạ: không gắn biểu mẫu nào) */
  const BIEU_MAU_NHOM = {
    'Thông tin chủ rừng': TAT_CA, 'Thông tin rừng': TAT_CA, 'Mã lô trùng (dữ liệu cũ)': TAT_CA,
    'Hình thức, đơn giá': ['01', '08', '14', '20'], 'Nhân công': KHAI_THAC, 'Định mức BHLĐ': ['02'],
    'Đội xe': VAN_CHUYEN, 'Giấy tờ xe': VAN_CHUYEN, 'Giấy tờ xe hết hạn lúc chạy phiếu': ['09', '10'], 'Cước vận chuyển': VAN_CHUYEN,
    'Phiếu cân': ['08', '09', '10', '14'], 'Phiếu cân: ngày thiếu hoặc sai': ['08', '09', '10', '14'], 'Phiếu cân trùng số': ['09', '10'], 'Phiếu cân: biển số chưa ghép với xe': ['09', '10'],
    'Phiếu cân chưa gán đội': ['08', '14'], 'Chênh lệch sản lượng': ['08', '14'], 'Địa chỉ giao hàng': VAN_CHUYEN, 'Cự ly vận chuyển': VAN_CHUYEN,
    'Định mức nhân công': ['06'], 'Ủy quyền sau hợp đồng': ['20', '01'], 'Số văn bản trùng': [], 'Chéo lô: phiếu cân trùng': ['08', '09', '10', '14'], 'Chéo lô: xe trùng giờ cân': [], 'Chéo lô: người ở hai lô': [], 'Chéo lô: lệch sản lượng dự kiến': [], 'Thời gian khai thác': ['01', '08', '14'], 'Số đội': ['01', '08', '14'], 'Checklist FSC': []
  };
  const bieuMauCuaNhom = nhom => (BIEU_MAU_NHOM[nhom] || []).slice();
  const trim = s => String(s == null ? '' : s).replace(/\s+/g, ' ').trim();
  const LOAI = ['lo', 'doi', 'doiXe', 'dong'];
  /* chuẩn hóa một mục: mức hợp lệ, đối tượng mặc định (suy từ “Dòng n” ở ref/text, hoặc cả lô), biểu mẫu mặc định theo nhóm */
  function muc(it) {
    it = it || {};
    const m = it.muc === MUC.CHAN || it.kind === 'chan' ? MUC.CHAN : MUC.DOI_CHIEU;
    const dongMatch = /Dòng (\d+)/.exec(trim(it.ref) + ' ' + trim(it.text)), dt = it.doiTuong || {};
    const loai = LOAI.includes(dt.loai) ? dt.loai : dongMatch ? 'dong' : 'lo';
    return {muc: m, nhom: trim(it.nhom), doiTuong: {loai, ten: trim(dt.ten), dong: dt.dong != null ? dt.dong : dongMatch ? +dongMatch[1] : null},
      bieuMau: Array.isArray(it.bieuMau) ? it.bieuMau.slice() : bieuMauCuaNhom(trim(it.nhom)), text: trim(it.text), ref: trim(it.ref), noiSua: it.noiSua || it.go || {}};
  }
  /* tóm tắt: số mục theo mức, theo nhóm (kèm mức) và theo loại đối tượng */
  function tomTat(list) {
    const out = {chan: 0, doi: 0, tong: 0, theoNhom: {}, theoDoiTuong: {lo: 0, doi: 0, doiXe: 0, dong: 0}};
    (list || []).forEach(x => { out[x.muc === MUC.CHAN ? 'chan' : 'doi']++; out.tong++; const g = out.theoNhom[x.nhom] = out.theoNhom[x.nhom] || {chan: 0, doi: 0}; g[x.muc === MUC.CHAN ? 'chan' : 'doi']++; out.theoDoiTuong[x.doiTuong.loai]++; });
    return out;
  }
  /* biểu mẫu bị chặn: mã → các mục chặn gây ra (mọi mục 'chan' của nhóm có biểu mẫu đó). Biểu mẫu không có mục chặn nào thì không có trong kết quả */
  function bieuMauBiChan(list) {
    const out = {};
    (list || []).filter(x => x.muc === MUC.CHAN).forEach(x => x.bieuMau.forEach(code => { (out[code] = out[code] || []).push(x); }));
    return out;
  }
  const biChan = (list, code) => !!bieuMauBiChan(list)[code];
  /* các mục của MỘT đội / đội xe (theo tên) cộng với mục của cả lô: dùng khi chỉ biểu mẫu của đội đó bị ảnh hưởng */
  const theoDoiTuong = (list, loai, ten) => (list || []).filter(x => x.doiTuong.loai === 'lo' || (x.doiTuong.loai === loai && (!ten || x.doiTuong.ten === ten)));
  /* một dòng mô tả ngắn lý do biểu mẫu bị chặn, cho cổng xuất */
  const lyDoChan = (list, code, toiDa) => { const l = (bieuMauBiChan(list)[code] || []); return l.slice(0, toiDa || 3).map(x => x.nhom + ': ' + x.text).join('; ') + (l.length > (toiDa || 3) ? '… (+' + (l.length - (toiDa || 3)) + ')' : ''); };
  const api = {MUC, TAT_CA, BIEU_MAU_NHOM, bieuMauCuaNhom, muc, tomTat, bieuMauBiChan, biChan, theoDoiTuong, lyDoChan};
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.HAKKiemTra = api;
})(typeof self !== 'undefined' ? self : this);
