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
  /* STT đã cấp của một nhóm (doi | doiXe) trong lô — hợp của: lịch sử f.sttDaCap[nhom] (kể cả đội đã xóa), STT đang lưu của các đội còn lại, và STT đọc được từ các số văn bản đã có theo dạng
   * NN/NĂM/… (lịch sử có thể xác minh khi dữ liệu cũ chưa có sttDaCap). Không bao giờ cấp lại số trong tập này. */
  const sttTuSo = v => { const m = /^(\d{1,3})(?:-\d+)?\/\d{4}\//.exec(s(v)); return m ? +m[1] : 0; };
  function daCap(f, nhom) {
    const used = new Set(), h = f && f.sttDaCap && Array.isArray(f.sttDaCap[nhom]) ? f.sttDaCap[nhom] : [];
    h.forEach(n => { if (n > 0) used.add(n); });
    ((nhom === 'doi' ? f.doi : f.hdvc) || []).forEach(d => { if (d.stt > 0) used.add(d.stt); LOAI.filter(l => l.cap === nhom).forEach(l => { const n = sttTuSo((d.exp || {})[l.truong]); if (n > 0) used.add(n); }); });
    return used;
  }
  /* cấp STT cho các đội chưa có: nhỏ nhất chưa từng dùng (không dùng lại số của đội đã xóa). Hàm thuần: xem trước và xác nhận dùng CHUNG hàm này. Trả mảng STT theo thứ tự ds. */
  function capStt(f, nhom, ds) {
    const used = daCap(f, nhom), tuSo = d => { for (const l of LOAI.filter(x => x.cap === nhom)) { const n = sttTuSo((d.exp || {})[l.truong]); if (n > 0) return n; } return 0; };   // đội chưa có STT nhưng đã có số văn bản dạng NN/NĂM/…: giữ STT đó (xác minh được), không đánh lại
    return ds.map(d => { if (d.stt > 0) return d.stt; const n = tuSo(d); if (n > 0) return n; let k = 1; while (used.has(k)) k++; used.add(k); return k; });
  }
  /* Danh sách đề xuất cho một lô: [{cap, id, ten, stt, ma, mau, truong, hienCo, deXuat, nam}] — hienCo là số đang lưu; deXuat chỉ có khi ô trống. Không sửa f. */
  function deXuat(f, homNay) {
    f = f || {}; const info = f.info || {}, y0 = nam(info.tuNgay) || String((homNay || new Date()).getFullYear()), ma = info.maRung || f.id || '', out = [];
    const them = (ds, capLoai, tenMac) => { const stts = capStt(f, capLoai, ds); ds.forEach((d, i) => LOAI.filter(l => l.cap === capLoai).forEach(l => { const ex = d.exp || {}, y = nam(l.ngay ? ex[l.ngay] : '') || nam((f.exp || {}).ngayKy) || y0, hien = s(ex[l.truong]); out.push({cap: capLoai, id: d.id, ten: s(d.ten) || tenMac + ' ' + (i + 1), stt: stts[i], ma: l.ma, mau: l.ten, truong: l.truong, hienCo: hien, deXuat: hien ? '' : so(stts[i], y, l.kyHieu, ma), nam: y}); })); };
    them(f.doi || [], 'doi', 'Đội'); them(f.hdvc || [], 'doiXe', 'Đội xe');
    return out;
  }
  const ghiStt = (f, nhom, stt) => { if (!(stt > 0)) return; f.sttDaCap = f.sttDaCap && typeof f.sttDaCap === 'object' ? f.sttDaCap : {}; const l = Array.isArray(f.sttDaCap[nhom]) ? f.sttDaCap[nhom] : []; if (!l.includes(stt)) l.push(stt); l.sort((a, b) => a - b); f.sttDaCap[nhom] = l; };
  /* ĐIỀN: gán STT cho đội chưa có (giữ STT đang có), ghi lịch sử, và điền các ô số còn TRỐNG theo quy tắc. Không ghi đè số đã có (kể cả số đã in, số người dùng nhập). Lịch sử nằm trong f nên chỉ có hiệu lực
   * khi lô được LƯU (bỏ bản nháp thì lịch sử cũng bị bỏ). Trả số ô số đã điền. */
  function dien(f, homNay) {
    let n = 0; const ds = deXuat(f, homNay);
    ds.forEach(x => { const arr = x.cap === 'doi' ? f.doi : f.hdvc, d = (arr || []).find(y => y.id === x.id); if (!d) return; if (!(d.stt > 0)) d.stt = x.stt; ghiStt(f, x.cap, d.stt); if (x.deXuat) { d.exp = d.exp || {}; if (!s(d.exp[x.truong])) { d.exp[x.truong] = x.deXuat; n++; } } });
    return n;
  }
  /* khởi tạo lịch sử cho dữ liệu cũ (nâng cấp SQLite): từ STT đang lưu và STT đọc được từ số văn bản; KHÔNG đánh lại số cũ. Trả true nếu có thay đổi. */
  function khoiTaoLichSu(f) {
    let dd = false; ['doi', 'doiXe'].forEach(nhom => { const truoc = JSON.stringify((f.sttDaCap || {})[nhom] || []); daCap(f, nhom).forEach(n => ghiStt(f, nhom, n)); if (JSON.stringify((f.sttDaCap || {})[nhom] || []) !== truoc) dd = true; });
    return dd;
  }
  /* số văn bản trùng NGAY TRONG một lô (cùng ô số, hai đội khác nhau cùng số): cảnh báo, vì dữ liệu cũ có thể đã dùng lại số của đội đã xóa */
  function trungTrongLo(f) {
    const out = [], by = new Map(); [['doi', f.doi], ['doiXe', f.hdvc]].forEach(([cap, ds]) => (ds || []).forEach(d => LOAI.filter(l => l.cap === cap).forEach(l => { const v = s((d.exp || {})[l.truong]); if (!v) return; const k = l.truong + '|' + v.toUpperCase(); if (by.has(k) && by.get(k) !== d.id) { if (!out.some(x => x.so === v)) out.push({so: v, truong: l.truong, ten: s(d.ten) || 'đội'}); } else by.set(k, d.id); })));
    return out;
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
  const api = {LOAI, maLo, so, capStt, daCap, deXuat, dien, khoiTaoLichSu, trungTrongLo, trung};
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.HAKSoVB = api;
})(typeof self !== 'undefined' ? self : this);
