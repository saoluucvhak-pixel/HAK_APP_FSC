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
  /* MÃ NHÓM CỐ ĐỊNH → {ten (hiển thị), bieuMau (biểu mẫu bị chặn khi có mục chặn thuộc nhóm), pc (nhóm về phiếu cân: không tính vào điều kiện in tờ nền)}.
   * Tên nhóm chỉ để hiển thị; mã mới là khóa. Nhóm nào sinh mục (gate, exportCheck, nhaplieu, cheolo, giayto) cũng PHẢI khai ở đây: tests/kiemtra.test.js quét mã nguồn và buộc điều đó.
   * Nhóm không có biểu mẫu bị chặn khai rõ bieuMau: [] (chỉ để đối chiếu). */
  const NC = ['01', '02', '03', '05', '06', '07', '08', '12', '13', '14', '15', '16', '18', '19', '20'];   // mọi biểu mẫu cần danh sách nhân công hợp lệ
  const PC4 = ['08', '09', '10', '14'];
  const NHOM = {
    'chu-rung': {ten: 'Thông tin chủ rừng', bieuMau: TAT_CA}, 'rung': {ten: 'Thông tin rừng', bieuMau: TAT_CA}, 'lo-trung-ma': {ten: 'Mã lô trùng (dữ liệu cũ)', bieuMau: TAT_CA},
    'ben-nhan-khoan': {ten: 'Bên nhận khoán thiếu thông tin', bieuMau: ['01', '14']},   /* 3.0: bản chụp bên nhận khoán thiếu thông tin in */
    'don-gia': {ten: 'Hình thức, đơn giá', bieuMau: ['01', '03', '08', '14', '20']}, 'nhan-cong': {ten: 'Nhân công', bieuMau: NC}, 'dinh-muc-bhld': {ten: 'Định mức BHLĐ', bieuMau: ['02']},
    'doi-xe': {ten: 'Đội xe', bieuMau: VAN_CHUYEN}, 'giay-to-xe': {ten: 'Giấy tờ xe', bieuMau: VAN_CHUYEN}, 'giay-to-xe-het-han': {ten: 'Giấy tờ xe hết hạn lúc chạy phiếu', bieuMau: ['09', '10'], pc: true},
    'cuoc-vc': {ten: 'Cước vận chuyển', bieuMau: VAN_CHUYEN},
    'phieu-can': {ten: 'Phiếu cân', bieuMau: PC4, pc: true}, 'phieu-can-ngay': {ten: 'Phiếu cân: ngày thiếu hoặc sai', bieuMau: PC4, pc: true}, 'phieu-can-trung-so': {ten: 'Phiếu cân trùng số', bieuMau: ['09', '10'], pc: true},
    'phieu-can-bien-so': {ten: 'Phiếu cân: biển số chưa ghép với xe', bieuMau: ['09', '10'], pc: true}, 'phieu-can-chua-gan-doi': {ten: 'Phiếu cân chưa gán đội', bieuMau: ['08', '14'], pc: true},
    'chenh-lech-san-luong': {ten: 'Chênh lệch sản lượng', bieuMau: ['08', '14'], pc: true}, 'dia-chi-giao': {ten: 'Địa chỉ giao hàng', bieuMau: VAN_CHUYEN}, 'cu-ly': {ten: 'Cự ly vận chuyển', bieuMau: VAN_CHUYEN},
    'dinh-muc-nhan-cong': {ten: 'Định mức nhân công', bieuMau: ['06']}, 'dinh-muc-ngay-sai': {ten: 'Định mức nhân công: ngày bắt đầu sai', bieuMau: ['06']}, 'uy-quyen-sau-hd': {ten: 'Ủy quyền sau hợp đồng', bieuMau: ['20', '01']},
    'so-vb-trung': {ten: 'Số văn bản trùng', bieuMau: []},
    'so-vb-doi-xe-trung': {ten: 'Số văn bản đội xe trùng', bieuMau: VAN_CHUYEN}, 'so-vb-doi-xe-chung': {ten: 'Số văn bản đội xe dùng chung', bieuMau: []},
    'cheo-pc-trung': {ten: 'Chéo lô: phiếu cân trùng', bieuMau: PC4, pc: true}, 'cheo-pc-cung-so': {ten: 'Chéo lô: phiếu cân cùng số và ngày ở lô khác', bieuMau: []}, 'cheo-xe-gio': {ten: 'Chéo lô: xe trùng giờ cân', bieuMau: []}, 'cheo-xe-ngay': {ten: 'Chéo lô: xe cùng ngày ở hai lô', bieuMau: []}, 'cheo-nguoi-hai-lo': {ten: 'Chéo lô: người ở hai lô', bieuMau: []},
    'cheo-lech-san-luong': {ten: 'Chéo lô: lệch sản lượng dự kiến', bieuMau: []},
    'nl-ngay-sai': {ten: 'Ngày nhập sai', bieuMau: TAT_CA}, 'nl-khoang-dao': {ten: 'Khoảng ngày bị đảo', bieuMau: TAT_CA}, 'nl-mot-ngay-hai-noi': {ten: 'Một ngày nhập ở hai nơi', bieuMau: TAT_CA},
    'nl-nam-so': {ten: 'Năm trong số khác năm của ngày', bieuMau: TAT_CA}, 'nl-thu-tu-ngay': {ten: 'Thứ tự ngày', bieuMau: TAT_CA}, 'nl-pc-ngoai-tg': {ten: 'Phiếu cân ngoài thời gian', bieuMau: PC4, pc: true},
    'so-doi': {ten: 'Số đội', bieuMau: []}, 'thoi-gian-khai-thac': {ten: 'Thời gian khai thác', bieuMau: []}, 'noi-giao-khac': {ten: 'Nơi giao trên phiếu khác địa chỉ giao đã chốt', bieuMau: []},
    'checklist-fsc': {ten: 'Checklist FSC', bieuMau: []}
  };
  const MA_THEO_TEN = {}; Object.keys(NHOM).forEach(ma => { MA_THEO_TEN[NHOM[ma].ten] = ma; });
  const maNhom = ten => MA_THEO_TEN[String(ten == null ? '' : ten).replace(/\s+/g, ' ').trim()] || '';
  /* tên → biểu mẫu (giữ cho nơi còn đọc theo tên) */
  const BIEU_MAU_NHOM = {}; Object.keys(NHOM).forEach(ma => { BIEU_MAU_NHOM[NHOM[ma].ten] = NHOM[ma].bieuMau; });
  const bieuMauCuaNhom = nhom => ((NHOM[nhom] || NHOM[maNhom(nhom)] || {}).bieuMau || []).slice();
  const trim = s => String(s == null ? '' : s).replace(/\s+/g, ' ').trim();
  const LOAI = ['lo', 'doi', 'doiXe', 'dong'];
  /* chuẩn hóa một mục: mức hợp lệ, đối tượng mặc định (suy từ “Dòng n” ở ref/text, hoặc cả lô), biểu mẫu mặc định theo nhóm */
  function muc(it) {
    it = it || {};
    const m = it.muc === MUC.CHAN || it.kind === 'chan' ? MUC.CHAN : MUC.DOI_CHIEU;
    const dongMatch = /Dòng (\d+)/.exec(trim(it.ref) + ' ' + trim(it.text)), dt = it.doiTuong || {};
    const loai = LOAI.includes(dt.loai) ? dt.loai : dongMatch ? 'dong' : 'lo';
    const ma = NHOM[it.ma] ? it.ma : maNhom(it.nhom);
    return {muc: m, ma, nhom: ma && !trim(it.nhom) ? NHOM[ma].ten : trim(it.nhom), doiTuong: {loai, ten: trim(dt.ten), dong: dt.dong != null ? dt.dong : dongMatch ? +dongMatch[1] : null},
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
  /* các mục CHẶN biểu mẫu `code` đối với một đối tượng xuất: pham = null (cả lô) hoặc {loai: 'doi' | 'doiXe', ten}. Mục của cả lô hoặc của một dòng chặn mọi đối tượng; mục của một đội / đội xe
   * chỉ chặn biểu mẫu của chính đội / đội xe đó (lỗi ở đội 2 không chặn biểu mẫu của đội 1). Mục thuộc loại đối tượng khác (đội khai thác so với đội xe) vẫn chặn, vì không phân biệt được. */
  const loaiHopCode = (x, code) => x.doiTuong.loai === 'doi' ? KHAI_THAC.includes(code) : x.doiTuong.loai === 'doiXe' ? VAN_CHUYEN.includes(code) : true;   // lỗi của một đội chỉ ảnh hưởng biểu mẫu khai thác, của một đội xe chỉ ảnh hưởng biểu mẫu vận chuyển
  const chanCho = (list, code, pham) => (list || []).filter(x => x.muc === MUC.CHAN && x.bieuMau.includes(code) && loaiHopCode(x, code) && (!pham || !pham.ten || x.doiTuong.loai !== pham.loai || !x.doiTuong.ten || x.doiTuong.ten === pham.ten));
  const BM_THEO = {doi: ['01', '05', '06', '07', '08', '14', '20'], doiXe: VAN_CHUYEN};   // biểu mẫu xuất thành TỪNG FILE riêng cho mỗi đội khai thác / đội xe (các biểu mẫu khác: một file cho cả lô)
  /* các mục của MỘT đội / đội xe (theo tên) cộng với mục của cả lô: dùng khi chỉ biểu mẫu của đội đó bị ảnh hưởng */
  const theoDoiTuong = (list, loai, ten) => (list || []).filter(x => x.doiTuong.loai === 'lo' || (x.doiTuong.loai === loai && (!ten || x.doiTuong.ten === ten)));
  /* một dòng mô tả ngắn lý do biểu mẫu bị chặn, cho cổng xuất */
  const lyDoChan = (list, code, toiDa) => { const l = (bieuMauBiChan(list)[code] || []); return l.slice(0, toiDa || 3).map(x => x.nhom + ': ' + x.text).join('; ') + (l.length > (toiDa || 3) ? '… (+' + (l.length - (toiDa || 3)) + ')' : ''); };
  const api = {MUC, TAT_CA, NHOM, NC, PC4, KHAI_THAC, VAN_CHUYEN, BM_THEO, maNhom, chanCho, BIEU_MAU_NHOM, bieuMauCuaNhom, muc, tomTat, bieuMauBiChan, biChan, theoDoiTuong, lyDoChan};
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.HAKKiemTra = api;
})(typeof self !== 'undefined' ? self : this);
