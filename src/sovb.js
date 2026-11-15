/* QUY TẮC ĐÁNH SỐ VĂN BẢN (bản 2.2, mục 12.4). Hàm thuần.
 * Dạng `STT/NĂM/LOẠI-MÃLÔ`, ví dụ `01/2026/HĐGK-QS07`: STT hai chữ số là số thứ tự của đội khai thác hoặc đội xe trong lô (mọi văn bản của một đội cùng STT), NĂM là năm của ngày
 * văn bản, LOẠI là ký hiệu loại văn bản, MÃLÔ là mã lô viết gọn không dấu không khoảng trắng.
 * Bốn quy tắc: cấp một lần không đánh lại (đội giữ STT đã cấp: doi.stt); khóa số khi đã in (chỉ ĐIỀN Ô TRỐNG, không bao giờ ghi đè số đã có); kiểm trùng toàn phần mềm; lô cũ giữ số cũ (chỉ lô nào bấm
 * “Điền số theo quy tắc” mới có số mới). */
(function (root) {
  const s = v => String(v == null ? '' : v).trim();
  /* ký hiệu loại văn bản: mẫu → {truong: ô số, ngay: ô ngày, cap: 'doi' | 'doiXe', kyHieu} (sửa được trong Cài đặt sau này) */
  const LOAI = [
    {ma: '01', ten: 'Hợp đồng giao khoán', cap: 'doi', truong: 'soKT', ngay: null, kyHieu: 'HĐGK'},
    {ma: '20', ten: 'Giấy ủy quyền', cap: 'doi', truong: 'uqSo', ngay: 'uqNgay', kyHieu: 'GUQ'},
    {ma: '14', ten: 'Nghiệm thu, thanh lý', cap: 'doi', truong: 'ntSo', ngay: 'ntNgay', kyHieu: 'NTTL'},
    {ma: '04', ten: 'Hợp đồng vận chuyển', cap: 'doiXe', truong: 'soVC', ngay: null, kyHieu: 'HĐVC'},
    {ma: '09', ten: 'Xác nhận khối lượng vận chuyển', cap: 'doiXe', truong: 'pcSo', ngay: 'pcNgay', kyHieu: 'XNKL'}
  ];
  /* mã lô viết gọn: bỏ dấu tiếng Việt, bỏ khoảng trắng và ký tự lạ, viết hoa; “QS-07” → “QS07” */
  const maLo = v => s(v).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toUpperCase().replace(/[^A-Z0-9]/g, '');
  const nam = v => { const m = /(\d{4})$/.exec(s(v)); return m ? m[1] : ''; };
  const hai = n => String(n).padStart(2, '0');
  const so = (stt, y, kyHieu, ma) => hai(stt) + '/' + y + '/' + kyHieu + '-' + maLo(ma);
  /* Danh sách đề xuất cho một lô: [{cap, id, ten, stt, ma, ten mẫu, truong, hienCo, deXuat, nam}] — hienCo là số đang lưu; deXuat chỉ có khi ô trống.
   * STT: đội đã có `stt` thì giữ; đội mới nhận số nhỏ nhất chưa dùng (không dùng lại số của đội đã xóa nếu `sttDaCap` còn ghi). */
  function deXuat(f, homNay) {
    f = f || {}; const info = f.info || {}, y0 = nam(info.tuNgay) || String((homNay || new Date()).getFullYear()), ma = info.maRung || f.id || '', out = [];
    const cap = (ds) => { const dung = new Set(ds.map(d => d.stt).filter(Boolean)); let k = 0; return ds.map(d => { if (d.stt) return d.stt; do { k++; } while (dung.has(k)); dung.add(k); return k; }); };
    const them = (ds, capLoai, tenMac) => { const stts = cap(ds); ds.forEach((d, i) => LOAI.filter(l => l.cap === capLoai).forEach(l => { const ex = d.exp || {}, y = nam(l.ngay ? ex[l.ngay] : '') || nam((f.exp || {}).ngayKy) || y0, hien = s(ex[l.truong]); out.push({cap: capLoai, id: d.id, ten: s(d.ten) || tenMac + ' ' + (i + 1), stt: stts[i], ma: l.ma, mau: l.ten, truong: l.truong, hienCo: hien, deXuat: hien ? '' : so(stts[i], y, l.kyHieu, ma), nam: y}); })); };
    them(f.doi || [], 'doi', 'Đội'); them(f.hdvc || [], 'doiXe', 'Đội xe');
    return out;
  }
  /* điền các ô số còn TRỐNG theo quy tắc (không ghi đè số đã có, giữ STT đã cấp); trả số ô đã điền */
  function dien(f, homNay) {
    let n = 0; const ds = deXuat(f, homNay);
    ds.forEach(x => { const arr = x.cap === 'doi' ? f.doi : f.hdvc, d = (arr || []).find(y => y.id === x.id); if (!d) return; if (!d.stt) d.stt = x.stt; if (x.deXuat) { d.exp = d.exp || {}; if (!s(d.exp[x.truong])) { d.exp[x.truong] = x.deXuat; n++; } } });
    return n;
  }
  /* số văn bản trùng giữa các lô: cùng ô số, cùng nội dung ở lô khác. Trả [{so, truong, ma (lô kia)}] cho lô (oid, fid) */
  function trung(db, oid, fid) {
    const out = [], seen = new Map(), lots = [];
    Object.values((db && db.rs) || {}).forEach(o => Object.values((o && o.forests) || {}).forEach(f => lots.push({oid: o.id, fid: f.id, f, ma: s((f.info || {}).maRung) || f.id})));
    const me = lots.find(l => l.oid === oid && l.fid === fid); if (!me) return out;
    const nhan = f => { const r = []; (f.doi || []).forEach(d => LOAI.filter(l => l.cap === 'doi').forEach(l => { const v = s((d.exp || {})[l.truong]); if (v) r.push([l.truong, v]); })); (f.hdvc || []).forEach(h => LOAI.filter(l => l.cap === 'doiXe').forEach(l => { const v = s((h.exp || {})[l.truong]); if (v) r.push([l.truong, v]); })); return r; };
    lots.filter(l => l !== me).forEach(l => nhan(l.f).forEach(([t, v]) => { const k = t + '|' + v.toUpperCase(); if (!seen.has(k)) seen.set(k, l.ma); }));
    nhan(me.f).forEach(([t, v]) => { const k = t + '|' + v.toUpperCase(); if (seen.has(k) && !out.some(x => x.so === v && x.truong === t)) out.push({so: v, truong: t, ma: seen.get(k)}); });
    return out;
  }
  const api = {LOAI, maLo, so, deXuat, dien, trung};
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.HAKSoVB = api;
})(typeof self !== 'undefined' ? self : this);
