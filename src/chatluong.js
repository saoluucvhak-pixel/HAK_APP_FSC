/* BÁO CÁO CHẤT LƯỢNG GOOGLE SHEET — CHỈ SỐ ĐẾM (PR D bước 3; CHỦ đã đồng ý ngày 23/11/2026).
 * Hàm THUẦN, KHÔNG đọc cơ sở dữ liệu, KHÔNG mang thông tin cá nhân ra ngoài:
 *   tinh(vao)  → {ok, so: {<khóa cố định>: số nguyên}, ...}  (chỉ các khóa trong KHOA, mỗi giá trị ép về số nguyên ≥ 0)
 *   bang(ra)   → văn bản nhiều dòng “Nhãn: số” để sao chép / xuất
 * Đầu vào mỗi hợp đồng chỉ cần các TRƯỜNG PHÂN LOẠI, không bao giờ được đưa vào đầu ra:
 *   vao = {hd: [{trangThai: 'ok'|'warn'|'err', nCccd, rung: [{maRung, ghepTam}], phieu: [{soPhieu, ngay, bienRaw, klKg, issue}],
 *                 phieuSheet: [{so, ngay, bks, kg}], phieuLo: [{id, so, ngay, bks, kg, soCu, lo}]}],
 *          dong: {HoSoRung, ToaDoRung, HoSoKeo}, ms}
 * “Nghi đổi số” (24/11/2026: dùng ĐÚNG quy tắc của màn cập nhật vào hồ sơ, src/doiso.js phatHienDoiSo): phiếu trên Sheet không khớp khóa (số phiếu + ngày) với phiếu nào đã có trong lô
 *   nhưng trùng ngày, biển số chuẩn hóa và khối lượng (lệch tối đa 1 kg) với một phiếu đã có trong lô mà chưa dòng Sheet nào nhận. Cần phiếu đã có trong lô của ứng dụng, nên đầu vào mỗi hợp đồng có thêm
 *   phieuSheet (các phiếu Sheet đủ điều kiện xét: không lệch CCCD, không lỗi, có số phiếu, không trùng khóa trong Sheet, biển số đã rõ) và phieuLo (phiếu đã có trong các lô cùng mã rừng).
 * “Cặp trùng khóa”: hai phiếu cùng khóa chuẩn hóa (số phiếu + ngày, HAKBks.khoaPhieu) trong cùng hợp đồng.
 * Tuyệt đối không xuất: CCCD, họ tên, địa chỉ, số hợp đồng, số phiếu, biển số, mã rừng, địa chỉ Sheet, khóa. Test bảo mật bắt buộc: tests/chat-luong-sheet.test.js. */
(function (root) {
  'use strict';
  /* DANH SÁCH TRẮNG: khóa → nhãn hiển thị. Đầu ra chỉ gồm các khóa này. */
  const KHOA = [
    ['hopDong', 'Số hợp đồng'], ['hdDu', 'Hợp đồng ở trạng thái Đủ'], ['hdCanXem', 'Hợp đồng ở trạng thái Cần xem'], ['hdLoi', 'Hợp đồng ở trạng thái Lỗi dữ liệu'],
    ['hdNhieuCccd', 'Hợp đồng có nhiều CCCD'], ['rung', 'Số rừng'], ['rungThieuMa', 'Số rừng thiếu mã rừng'], ['rungGhepTam', 'Số rừng ghép tạm'],
    ['phieu', 'Số phiếu'], ['phieuNgayLoi', 'Số phiếu có ngày không đọc được'], ['phieuThieuBienSo', 'Số phiếu thiếu biển số'], ['phieuNghiDoiSo', 'Số phiếu nghi đổi số (so với phiếu đã có trong lô)'],
    ['capTrungKhoa', 'Số cặp trùng khóa (số phiếu + ngày)'], ['dongHoSoRung', 'Số dòng tab HoSoRung'], ['dongToaDoRung', 'Số dòng tab ToaDoRung'], ['dongHoSoKeo', 'Số dòng tab HoSoKeo'],
    ['thoiGianMs', 'Thời gian tổng hợp (ms)']
  ];
  const BK = () => (typeof require === 'function' ? require('./bks.js') : root.HAKBks);
  const DS = () => (typeof require === 'function' ? require('./doiso.js') : root.HAKDoiSo);
  const so = v => { const n = Math.floor(Number(v)); return Number.isFinite(n) && n > 0 ? n : 0; };
  const s = v => (v == null ? '' : String(v)).trim();

  function tinh(vao) {
    const hds = vao && Array.isArray(vao.hd) ? vao.hd : [], dong = (vao && vao.dong) || {};
    const o = Object.fromEntries(KHOA.map(([k]) => [k, 0]));
    o.hopDong = hds.length;
    hds.forEach(h => {
      if (!h) return;
      if (h.trangThai === 'ok') o.hdDu++; else if (h.trangThai === 'warn') o.hdCanXem++; else o.hdLoi++;
      if (so(h.nCccd) > 1) o.hdNhieuCccd++;
      const rung = Array.isArray(h.rung) ? h.rung : [], phieu = Array.isArray(h.phieu) ? h.phieu : [];
      o.rung += rung.length; rung.forEach(r => { if (r && !s(r.maRung)) o.rungThieuMa++; if (r && r.ghepTam) o.rungGhepTam++; });
      o.phieu += phieu.length;
      const khoa = new Map();   // số phiếu|ngày → số lần
      phieu.forEach(p => {
        if (!p) return;
        if (!s(p.ngay)) o.phieuNgayLoi++;
        if (!s(p.bienRaw)) o.phieuThieuBienSo++;
        const k1 = BK().khoaPhieu({soPhieu: p.soPhieu, ngay: p.ngay}); if (k1) khoa.set(k1, (khoa.get(k1) || 0) + 1);   // khóa chuẩn hóa như màn cập nhật vào hồ sơ (số phiếu + ngày)
      });
      khoa.forEach(n => { if (n > 1) o.capTrungKhoa += n * (n - 1) / 2; });
      /* nghi đổi số: đúng hàm của phần mềm (src/doiso.js) trên phiếu Sheet đủ điều kiện xét và phiếu đã có trong lô */
      const sh = Array.isArray(h.phieuSheet) ? h.phieuSheet : [], lo = Array.isArray(h.phieuLo) ? h.phieuLo : [];
      if (sh.length && lo.length) {
        const rs = DS().phatHienDoiSo(sh.map((p, i) => ({idx: i, so: p && p.so, ngay: p && p.ngay, bks: p && p.bks, kg: p && p.kg})), lo);
        o.phieuNghiDoiSo += ((rs && rs.ketQua) || []).filter(k => k && k.tt === 'nghi-doi-so').length;
      }
    });
    o.dongHoSoRung = so(dong.HoSoRung); o.dongToaDoRung = so(dong.ToaDoRung); o.dongHoSoKeo = so(dong.HoSoKeo); o.thoiGianMs = so(vao && vao.ms);
    const out = {}; KHOA.forEach(([k]) => { out[k] = so(o[k]); });   // ép lại qua danh sách trắng: không khóa nào khác lọt ra
    return {ok: true, so: out};
  }
  function bang(ra) {
    const x = (ra && ra.so) || {};
    return KHOA.map(([k, nhan]) => nhan + ': ' + so(x[k])).join('\n');
  }
  const api = {KHOA, tinh, bang};
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.HAKChatLuong = api;
})(typeof self !== 'undefined' ? self : this);
