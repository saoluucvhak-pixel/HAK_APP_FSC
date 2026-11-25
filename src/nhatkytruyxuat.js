/* Nhật ký truy xuất nguồn gốc của một lô rừng (hàm thuần, dùng chung giao diện và kiểm thử).
 * Gom MỘT dòng thời gian từ các nhật ký đã có sẵn trong lô, không ghi gì và không sửa dữ liệu truyền vào:
 *   - f.taoLuc            → tạo lô
 *   - f.nhatKyNap[]       → nạp / thêm nhân công, xe, phiếu cân (Excel, dán, Google Sheets, Danh mục, nhập tay, từ phiếu cân)
 *   - f.soLog[]           → đổi số phiếu cân (số cũ → số mới, lý do)
 *   - f.bienLog[]         → đổi biển số của phiếu cân (gán lại xe)
 *   - f.inAn / f.inDot2   → in, ký, bỏ xác nhận in của từng biểu mẫu (soIn[])
 *   - f.nhatKy[]          → vòng đời lô (chốt, mở khóa, lưu trữ…)
 * Kết quả: [{at (ISO), loai, text, nguoi}] xếp theo thời gian tăng dần; dòng không có thời điểm hợp lệ xếp cuối. */
(function (root) {
  'use strict';
  const s = v => (v == null ? '' : String(v)).trim();
  const LOAI = {tao: 'Tạo lô', nap: 'Nạp dữ liệu', doiSo: 'Đổi số phiếu', doiBien: 'Đổi biển số / gán xe', in: 'In ấn', ky: 'Ký', hoan: 'Bỏ xác nhận', vongDoi: 'Vòng đời lô'};
  const DOI_TUONG = {nc: 'nhân công', dx: 'xe', pc: 'phiếu cân'};
  const HANH_VD = {chot: 'Chốt lô', mokhoa: 'Mở khóa lô', luutru: 'Lưu trữ lô', boluutru: 'Bỏ lưu trữ lô', dung: 'Dừng lô', molai: 'Mở lại lô'};
  const ok = at => { const t = Date.parse(at); return isFinite(t) ? t : null; };
  const nguonTxt = n => { if (!n) return ''; if (typeof n === 'string') return n; return [n.tab, n.row != null ? 'dòng ' + n.row : '', n.col].filter(Boolean).join(' · '); };
  function build(f, opt) {
    const o = opt || {}, tenBM = o.tenBM || (m => m), ev = [], add = (at, loai, text, nguoi) => ev.push({at: s(at), loai, text: s(text), nguoi: s(nguoi)});
    if (!f) return ev;
    if (f.taoLuc) add(f.taoLuc, 'tao', 'Tạo lô rừng ' + s((f.info || {}).maRung));
    (f.nhatKyNap || []).forEach(x => {
      const kind = DOI_TUONG[x.kind] || s(x.kind), n = k => (typeof x[k] === 'number' ? x[k] : 0);
      const kq = [n('them') ? 'thêm ' + n('them') : '', n('capNhat') ? 'cập nhật ' + n('capNhat') : '', n('giu') ? 'giữ nguyên ' + n('giu') : '', n('loi') ? 'lỗi ' + n('loi') : ''].filter(Boolean).join(', ');
      add(x.at, 'nap', 'Nạp ' + kind + (x.nguon ? ' từ ' + s(x.nguon) : '') + (kq ? ': ' + kq : ''));
    });
    (f.soLog || []).forEach(x => add(x.at, 'doiSo', 'Đổi số phiếu ' + s(x.soCu) + ' → ' + s(x.soMoi) + (x.ngay ? ' (ngày cân ' + s(x.ngay) + ')' : '') + (x.lyDo ? ' — lý do: ' + s(x.lyDo) : '') + (nguonTxt(x.nguon) ? ' · nguồn: ' + nguonTxt(x.nguon) : ''), x.nguoi));
    (f.bienLog || []).forEach(x => add(x.at, 'doiBien', 'Phiếu ' + s(x.soPhieu) + (x.ngay ? ' (' + s(x.ngay) + ')' : '') + ': biển số ' + s(x.cu) + ' → ' + s(x.moi) + (nguonTxt(x.nguon) ? ' · nguồn: ' + nguonTxt(x.nguon) : '')));
    [f.inAn, f.inDot2].forEach(st => ((st && st.soIn) || []).forEach(x => {
      const ten = tenBM(s(x.ma)), loai = x.hanh === 'ky' ? 'ky' : x.hanh === 'in' ? 'in' : 'hoan';
      const viec = {in: 'In', ky: 'Ký', huyky: 'Bỏ ký', huyin: 'Bỏ xác nhận in'}[x.hanh] || s(x.hanh);
      add(x.at, loai, viec + ' ' + ten + (x.lyDo ? ' — ' + s(x.lyDo) : ''));
    }));
    (f.nhatKy || []).forEach(x => add(x.at, 'vongDoi', (HANH_VD[x.hanh] || s(x.hanh)) + (x.phienBan ? ' (phiên bản ' + s(x.phienBan) + ')' : '') + (x.lyDo ? ' — ' + s(x.lyDo) : ''), x.nguoi));
    return ev.map((e, i) => Object.assign(e, {i})).sort((a, b) => { const x = ok(a.at), y = ok(b.at); if (x == null && y == null) return a.i - b.i; if (x == null) return 1; if (y == null) return -1; return x - y || a.i - b.i; }).map(e => ({at: e.at, loai: e.loai, text: e.text, nguoi: e.nguoi}));
  }
  const api = {build, LOAI};
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.HAKNhatKyTX = api;
})(typeof self !== 'undefined' ? self : this);
