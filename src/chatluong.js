/* BÁO CÁO CHẤT LƯỢNG GOOGLE SHEET — CHỈ SỐ ĐẾM (PR D bước 3; CHỦ đã đồng ý ngày 23/11/2026).
 * Hàm THUẦN, KHÔNG đọc cơ sở dữ liệu, KHÔNG mang thông tin cá nhân ra ngoài:
 *   tinh(vao)  → {ok, so: {<khóa cố định>: số nguyên}, ...}  (chỉ các khóa trong KHOA, mỗi giá trị ép về số nguyên ≥ 0)
 *   bang(ra)   → văn bản nhiều dòng “Nhãn: số” để sao chép / xuất
 * Đầu vào mỗi hợp đồng chỉ cần các TRƯỜNG PHÂN LOẠI, không bao giờ được đưa vào đầu ra:
 *   vao = {hd: [{trangThai: 'ok'|'warn'|'err', nCccd, rung: [{maRung, ghepTam}], phieu: [{soPhieu, ngay, bienRaw, klKg, issue}]}],
 *          dong: {HoSoRung, ToaDoRung, HoSoKeo}, ms}
 * “Nghi đổi số”: hai phiếu cùng ngày, cùng biển số, cùng khối lượng kg nhưng KHÁC số phiếu (có thể bị đánh số lại).
 * “Cặp trùng khóa”: hai phiếu cùng số phiếu và cùng ngày trong cùng hợp đồng.
 * Tuyệt đối không xuất: CCCD, họ tên, địa chỉ, số hợp đồng, số phiếu, biển số, mã rừng, địa chỉ Sheet, khóa. Test bảo mật bắt buộc: tests/chat-luong-sheet.test.js. */
(function (root) {
  'use strict';
  /* DANH SÁCH TRẮNG: khóa → nhãn hiển thị. Đầu ra chỉ gồm các khóa này. */
  const KHOA = [
    ['hopDong', 'Số hợp đồng'], ['hdDu', 'Hợp đồng ở trạng thái Đủ'], ['hdCanXem', 'Hợp đồng ở trạng thái Cần xem'], ['hdLoi', 'Hợp đồng ở trạng thái Lỗi dữ liệu'],
    ['hdNhieuCccd', 'Hợp đồng có nhiều CCCD'], ['rung', 'Số rừng'], ['rungThieuMa', 'Số rừng thiếu mã rừng'], ['rungGhepTam', 'Số rừng ghép tạm'],
    ['phieu', 'Số phiếu'], ['phieuNgayLoi', 'Số phiếu có ngày không đọc được'], ['phieuThieuBienSo', 'Số phiếu thiếu biển số'], ['phieuNghiDoiSo', 'Số phiếu nghi đổi số'],
    ['capTrungKhoa', 'Số cặp trùng khóa (số phiếu + ngày)'], ['dongHoSoRung', 'Số dòng tab HoSoRung'], ['dongToaDoRung', 'Số dòng tab ToaDoRung'], ['dongHoSoKeo', 'Số dòng tab HoSoKeo'],
    ['thoiGianMs', 'Thời gian tổng hợp (ms)']
  ];
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
      const khoa = new Map(), dang = new Map();   // số phiếu|ngày → số lần; ngày|biển|kg → tập số phiếu
      phieu.forEach(p => {
        if (!p) return;
        if (!s(p.ngay)) o.phieuNgayLoi++;
        if (!s(p.bienRaw)) o.phieuThieuBienSo++;
        const k1 = s(p.soPhieu) + '|' + s(p.ngay); khoa.set(k1, (khoa.get(k1) || 0) + 1);
        if (s(p.ngay) && s(p.bienRaw) && so(p.klKg)) { const k2 = s(p.ngay) + '|' + s(p.bienRaw) + '|' + so(p.klKg); if (!dang.has(k2)) dang.set(k2, new Set()); dang.get(k2).add(s(p.soPhieu)); }
      });
      khoa.forEach(n => { if (n > 1) o.capTrungKhoa += n * (n - 1) / 2; });
      /* nghi đổi số: mỗi phiếu thuộc nhóm (cùng ngày, biển, kg) có từ 2 số phiếu khác nhau */
      phieu.forEach(p => { if (!p || !s(p.ngay) || !s(p.bienRaw) || !so(p.klKg)) return; const t = dang.get(s(p.ngay) + '|' + s(p.bienRaw) + '|' + so(p.klKg)); if (t && t.size > 1) o.phieuNghiDoiSo++; });
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
