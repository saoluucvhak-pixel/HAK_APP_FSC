/* BẢNG KHAI BÁO BIỂU MẪU và THỨ TỰ IN (bản 2.2, mục 3.1–3.2). Hàm thuần.
 * Mỗi mẫu một dòng: mã, tên, đợt, nhóm in, cấp lập (lô | đội khai thác | đội xe | từng người), mẫu áp dụng cho hình thức nào, ký hiệu số văn bản, số bản in.
 * Thứ tự (đã xác nhận 15/11/2026): đợt 1 theo nhóm Lô → từng đội khai thác → từng đội xe → theo dõi; đợt 2: ĐỘI KHAI THÁC TRƯỚC (BM-08 → BM-14), ĐỘI XE SAU (BM-09 → BM-10).
 * Mẫu cùng nhóm sắp theo `thuTu`. Danh sách mã khớp src/quytrinh.js (FORMS): kiểm thử đối chiếu để không lệch. */
(function (root) {
  /* cap: 'lo' | 'doi' | 'doiXe' | 'nguoi' (một bản cho từng người trong đội); nhom: thứ tự nhóm in trong đợt (số nhỏ in trước) */
  const BM = [
    // đợt 1 — nhóm 1: các mẫu lập MỘT lần cho cả lô
    {ma: '17', ten: 'Thẩm định chủ rừng và rừng', dot: 1, nhom: 1, thuTu: 1, cap: 'lo', soBan: 1},
    {ma: '11', ten: 'Cam kết nguồn gốc', dot: 1, nhom: 1, thuTu: 2, cap: 'lo', soBan: 1},
    {ma: '12', ten: 'Cam kết lao động', dot: 1, nhom: 1, thuTu: 3, cap: 'lo', soBan: 1},
    {ma: '13', ten: 'Kiểm tra hiện trường', dot: 1, nhom: 1, thuTu: 4, cap: 'lo', soBan: 1},
    {ma: '19', ten: 'Phổ biến chính sách FSC', dot: 1, nhom: 1, thuTu: 5, cap: 'lo', soBan: 1},
    {ma: '15', ten: 'Sổ theo dõi tai nạn, sự cố', dot: 1, nhom: 1, thuTu: 6, cap: 'lo', soBan: 1},
    {ma: '16', ten: 'Kiểm tra, bảo dưỡng thiết bị', dot: 1, nhom: 1, thuTu: 7, cap: 'lo', soBan: 1},
    // đợt 1 — nhóm 2: từng đội khai thác (đội 1 xong mới đến đội 2): ủy quyền → hợp đồng → phân công → BHLĐ, đào tạo, danh sách, chấm công
    {ma: '20', ten: 'Giấy ủy quyền', dot: 1, nhom: 2, thuTu: 1, cap: 'doi', only: 'giaokhoan', soBan: 1, kyHieu: 'GUQ'},
    {ma: '01', ten: 'Hợp đồng khai thác (giao khoán)', dot: 1, nhom: 2, thuTu: 2, cap: 'doi', only: 'giaokhoan', soBan: 2, kyHieu: 'HĐGK'},
    {ma: '03', ten: 'Hợp đồng lao động', dot: 1, nhom: 2, thuTu: 2, cap: 'nguoi', only: 'tructiep', soBan: 2, kyHieu: 'HĐLĐ'},
    {ma: '06', ten: 'Danh sách đội khai thác', dot: 1, nhom: 2, thuTu: 3, cap: 'doi', soBan: 1},
    {ma: '02', ten: 'Cấp phát bảo hộ lao động', dot: 1, nhom: 2, thuTu: 4, cap: 'doi', soBan: 1},
    {ma: '07', ten: 'Xác nhận đào tạo ATLĐ', dot: 1, nhom: 2, thuTu: 5, cap: 'doi', soBan: 1},
    {ma: '05', ten: 'Bảng chấm công', dot: 1, nhom: 2, thuTu: 6, cap: 'doi', soBan: 1},
    // đợt 1 — nhóm 3: từng đội xe
    {ma: '04', ten: 'Hợp đồng vận chuyển', dot: 1, nhom: 3, thuTu: 1, cap: 'doiXe', soBan: 2, kyHieu: 'HĐVC'},
    // đợt 1 — nhóm 4: theo dõi (ghi tay trong quá trình khai thác)
    {ma: '18', ten: 'Nhật ký khai thác', dot: 1, nhom: 4, thuTu: 1, cap: 'lo', soBan: 1},
    // đợt 2 — nhóm 1: từng đội khai thác TRƯỚC
    {ma: '08', ten: 'Bảng thanh toán tiền công', dot: 2, nhom: 1, thuTu: 1, cap: 'doi', soBan: 2},
    {ma: '14', ten: 'Nghiệm thu, thanh lý khai thác', dot: 2, nhom: 1, thuTu: 2, cap: 'doi', soBan: 2},
    // đợt 2 — nhóm 2: từng đội xe SAU
    {ma: '09', ten: 'Xác nhận khối lượng vận chuyển', dot: 2, nhom: 2, thuTu: 1, cap: 'doiXe', soBan: 2},
    {ma: '10', ten: 'Thanh toán tiền vận chuyển', dot: 2, nhom: 2, thuTu: 2, cap: 'doiXe', soBan: 2}
  ];
  const byMa = m => BM.find(x => x.ma === m) || null;
  /* mẫu áp dụng cho hình thức hợp đồng mo ('giaokhoan' | 'tructiep'), đã xếp thứ tự in */
  const apDung = mo => BM.filter(x => !x.only || x.only === mo).sort((a, b) => a.dot - b.dot || a.nhom - b.nhom || a.thuTu - b.thuTu);
  /* DANH SÁCH IN THEO THỨ TỰ của một lô. lo = {mo: hình thức, doi: [{ten}], doiXe: [{ten}], nguoi: số người của đội (tùy chọn, cho BM-03)}; dot: 1 | 2 | 0 (cả hai).
   * Trả [{stt, ma, ten, dot, cap, doi (tên đội / đội xe nếu có), soBan}] — đội 1 in xong mới đến đội 2; cùng đội theo thứ tự ký. */
  function thuTuIn(lo, dot) {
    const mo = lo && lo.mo === 'tructiep' ? 'tructiep' : 'giaokhoan', doi = (lo && lo.doi && lo.doi.length) ? lo.doi : [{ten: ''}], dx = (lo && lo.doiXe && lo.doiXe.length) ? lo.doiXe : [{ten: ''}], out = [];
    const ds = apDung(mo).filter(x => !dot || x.dot === dot);
    [1, 2].forEach(d => {
      const nhoms = [...new Set(ds.filter(x => x.dot === d).map(x => x.nhom))].sort((a, b) => a - b);
      nhoms.forEach(n => {
        const g = ds.filter(x => x.dot === d && x.nhom === n), capNhom = g.map(x => x.cap);
        if (capNhom.every(c => c === 'lo')) g.forEach(x => out.push({ma: x.ma, ten: x.ten, dot: d, cap: x.cap, doi: '', soBan: x.soBan}));
        else if (capNhom.every(c => c === 'doiXe')) dx.forEach(h => g.forEach(x => out.push({ma: x.ma, ten: x.ten, dot: d, cap: x.cap, doi: h.ten || '', soBan: x.soBan})));
        else doi.forEach(t => g.forEach(x => out.push({ma: x.ma, ten: x.ten, dot: d, cap: x.cap, doi: t.ten || '', soBan: x.soBan})));
      });
    });
    return out.map((x, i) => Object.assign({stt: i + 1}, x));
  }
  const api = {BM, byMa, apDung, thuTuIn};
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.HAKBieuMau = api;
})(typeof self !== 'undefined' ? self : this);
