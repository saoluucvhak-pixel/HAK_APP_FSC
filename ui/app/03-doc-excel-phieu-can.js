/* ========== Đọc Excel ========== */
function parseSheet(file, sheetName, map, req, norm, alias) {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onerror = () => reject(new Error('Không đọc được file.'));
    fr.onload = () => {
      try {
        const wb = XLSX.read(fr.result, {type: 'array'});
        const name = wb.SheetNames.includes(sheetName) ? sheetName : wb.SheetNames[0];
        const aoa = XLSX.utils.sheet_to_json(wb.Sheets[name], {header: 1, defval: '', raw: true});
        if (!aoa.length) throw new Error('File trống.');
        const keyOf = h => map[h] || (alias || {})[h] || H_LEGACY[h];
        const hasAll = row => req.every(n => row.some(h => keyOf(trim(h)) === map[n]));
        let h0 = 0; for (let r = 0; r < Math.min(aoa.length, 15); r++) if (hasAll(aoa[r])) { h0 = r; break; }   // tiêu đề thường ở dòng 1; file của công cụ in phiếu cân có tiêu đề ở dòng 4
        const heads = aoa[h0].map(h => trim(h));
        const miss = req.filter(n => !heads.some(h => keyOf(h) === map[n]));
        if (miss.length) throw new Error('File thiếu cột: ' + miss.join(', ') + '. Hãy dùng đúng file mẫu.');
        const idx = {};
        heads.forEach((h, i) => { const k = keyOf(h); if (k && !(k in idx)) idx[k] = i; });
        const rows = [];
        for (let r = h0 + 1; r < aoa.length; r++) {
          const line = aoa[r];
          const o = {_row: r + 1};
          let any = false;
          for (const k in idx) {
            o[k] = line[idx[k]];
            if (trim(line[idx[k]]) !== '') any = true;
          }
          if (any) rows.push(norm(o));
        }
        resolve({sheet: name, rows});
      } catch (e) { reject(e); }
    };
    fr.readAsArrayBuffer(file);
  });
}
const normNC = o => ({
  _row: o._row, maRung: trim(o.maRung), vaiTro: trim(o.vaiTro), stt: trim(o.stt), danhXung: trim(o.danhXung),
  ten: trim(o.ten), ngaySinh: normDate(o.ngaySinh), cccd: normCccd(o.cccd), ngayCap: normDate(o.ngayCap),
  noiCap: trim(o.noiCap), diaChi: trim(o.diaChi), chucDanh: trim(o.chucDanh), doi: trim(o.doi)
});
const noneVal = v => /^(khong|khong co|n\/a|na|-+|x)$/.test(trim(v).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').toLowerCase()) ? '' : v;
const keyName = v => trim(v).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').toLowerCase();
const normDX0 = o => ({
  _row: o._row, maRung: trim(o.maRung), stt: trim(o.stt), chuXe: trim(o.chuXe), ngaySinh: normDate(o.ngaySinh),
  cccd: normCccd(o.cccd), ngayCap: normDate(o.ngayCap), noiCap: trim(o.noiCap), diaChi: trim(o.diaChi),
  bienSo: trim(o.bienSo).toUpperCase(), cavet: normDate(o.cavet), loaiXe: trim(o.loaiXe), nguoiKy: normNK(o.nguoiKy),
  taiXe: trim(o.taiXe), ngaySinhTx: normDate(o.ngaySinhTx), cccdTx: normCccd(o.cccdTx), ngayCapTx: normDate(o.ngayCapTx),
  noiCapTx: trim(o.noiCapTx), diaChiTx: trim(o.diaChiTx), gplx: trim(o.gplx), hanGplx: normDate(o.hanGplx),
  hanBH: normDate(o.hanBH), kdTu: normDate(o.kdTu), kdDen: normDate(o.kdDen), sdt: trim(o.sdt)
});
const normDX = o => {
  const r = normDX0(Object.assign({}, o, {ngaySinh: noneVal(o.ngaySinh), cccd: noneVal(o.cccd), ngayCap: noneVal(o.ngayCap), noiCap: noneVal(o.noiCap)}));
  // Người ký ghi bằng tên người: khớp tên tài xế hoặc tên chủ xe
  if (r.nguoiKy && r.nguoiKy !== 'Chủ xe' && r.nguoiKy !== 'Tài xế') {
    const k = keyName(r.nguoiKy);
    if (k && k === keyName(r.taiXe)) r.nguoiKy = 'Tài xế';
    else if (k && k === keyName(r.chuXe)) r.nguoiKy = 'Chủ xe';
  }
  return r;
};

/* giờ cân: ô giờ của Excel (phần ngày 0..1) → HH:MM:SS; chuỗi giữ nguyên */
const timeCell = v => {   // chỉ lấy PHẦN GIỜ: số giờ (0..1), ngày-giờ (46300,35) hoặc chữ “05/10/2026 08:25:30”; ô chỉ có ngày thì không có giờ
  if (typeof v === 'number') { const f = v - Math.floor(v); if (f < 1e-9 || !isFinite(v)) return ''; const t = Math.round(f * 86400) % 86400; return pad2(Math.floor(t / 3600)) + ':' + pad2(Math.floor(t % 3600 / 60)) + ':' + pad2(t % 60); }
  const t = trim(v), m = /(\d{1,2}):(\d{2})(?::(\d{2}))?/.exec(t); return m ? pad2(+m[1]) + ':' + m[2] + (m[3] ? ':' + m[3] : '') : /^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(t) ? '' : t;
};
/* Số tiền trong ô: bộ đọc chặt chẽ chung (src/money.js). Trống → null; số dương hợp lệ → số; còn lại → null kèm lý do ở giaLoi (không tự đoán) */
const moneyCell = v => HAKMoney.positive(v);
const normPC = o => {
  const c1 = toDec(o.can1), c2 = toDec(o.can2); let klKg = toDec(o.klKg);
  if (klKg == null && typeof c1 === 'number' && typeof c2 === 'number' && c1 > c2) klKg = c1 - c2;   // KL để trống: KL = Cân 1 − Cân 2 (như file mẫu in phiếu cân)
  let kl = typeof o.kl === 'number' ? (isFinite(o.kl) ? o.kl : 'x') : toDec(o.kl);
  if (kl == null && typeof klKg === 'number' && klKg > 0) kl = Math.round(klKg) / 1000;   // chỉ điền kg: tấn = kg ÷ 1000
  if (typeof kl === 'number' && isFinite(kl) && kl > 0) kl = Math.round(kl * 1000) / 1000;   // khối lượng lưu chính xác đến kg: mọi nơi cộng ra cùng một số
  const lbl = 'Phiếu ' + (trim(o.soPhieu) || '(không số)'), giaLoi = [['donGia', 'cột ĐG_AD / Đơn giá'], ['donGiaTC', 'cột Đơn giá_TC'], ['thanhTien', 'cột Thành tiền']].map(([k, n]) => HAKMoney.problem(lbl + ', ' + n, o[k])).filter(Boolean);
  let donGia = moneyCell(o.donGia); if (donGia == null) donGia = moneyCell(o.donGiaTC);   // ĐG_AD; trống thì dùng Đơn giá_TC
  return {
    _row: o._row, maRung: trim(o.maRung), stt: trim(o.stt), ngay: normDate(o.ngay), ngay2: o.ngay2 == null || trim(o.ngay2) === '' ? '' : normDate(o.ngay2), gioCan1: timeCell(o.gioCan1), gioCan2: timeCell(o.gioCan2), bienSo: trim(o.bienSo).toUpperCase(),
    soPhieu: typeof o.soPhieu === 'number' ? String(Math.round(o.soPhieu)) : trim(o.soPhieu), can1: c1, can2: c2, klKg,
    kl, khachHang: trim(o.khachHang), diaChi: trim(o.diaChi), nguonGoc: trim(o.nguonGoc), soCT: trim(o.soCT), trangThai: trim(o.trangThai), donGia, thanhTien: moneyCell(o.thanhTien), giaLoi, noiGiao: trim(o.noiGiao), ghiChu: trim(o.ghiChu)
  };
};

/* ========== Phiếu cân: khối lượng và tiền vận chuyển ========== */
const bienKey = v => String(v || '').toUpperCase().replace(/[\s.\-]/g, '');
/* Quy tắc ngày lịch dùng chung (src/dates.js): 31/02/2026 và 29/02/2026 không có thật, 29/02/2028 có thật; ngày không có thật → 0 */
const dateKey = v => HAKDates.key(v);
const totalKg = rows => rows.reduce((a, r) => a + (typeof r.kl === 'number' ? Math.round(r.kl * 1000) : 0), 0);
const fmtT = kg => { const [i, d] = (kg / 1000).toFixed(3).split('.'); return numSwap(fmtRaw(i) + ',' + d); };
const VN_D = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];
function words3(n, full) {
  const tr = Math.floor(n / 100), ch = Math.floor(n % 100 / 10), dv = n % 10;
  let t = '';
  if (full || tr > 0) t += VN_D[tr] + ' trăm';
  if (ch > 1) { t += ' ' + VN_D[ch] + ' mươi'; t += dv === 1 ? ' mốt' : dv === 5 ? ' lăm' : dv > 0 ? ' ' + VN_D[dv] : ''; }
  else if (ch === 1) { t += ' mười'; t += dv === 5 ? ' lăm' : dv > 0 ? ' ' + VN_D[dv] : ''; }
  else if (dv > 0) { if (full || tr > 0) t += ' lẻ'; t += ' ' + VN_D[dv]; }
  return t.trim();
}
function moneyWords(n) {
  if (!(n > 0)) return 'Không đồng.';
  const U = ['', ' nghìn', ' triệu', ' tỷ', ' nghìn tỷ', ' triệu tỷ'], parts = [];
  for (let x = n; x > 0; x = Math.floor(x / 1000)) parts.push(x % 1000);
  const out = [];
  for (let k = parts.length - 1; k >= 0; k--) if (parts[k]) out.push(words3(parts[k], k < parts.length - 1) + U[k]);
  const t = out.join(' ');
  return t.charAt(0).toUpperCase() + t.slice(1) + ' đồng chẵn.';
}
function checkPC(rec) {
  const errs = [], warns = [], state = {}, pc = rec.pc || [];
  const mark = (r, k, m) => { (k === 'err' ? errs : warns).push('Dòng ' + r._row + ': ' + m); if (k === 'err' || !state[r._row]) state[r._row] = k; };
  const keys = new Set(rec.dx.map(x => bienKey(x.bienSo))), seen = {};
  pc.forEach(r => {
    if (r.maRung && r.maRung !== rec.info.maRung) mark(r, 'err', 'Mã rừng "' + r.maRung + '" khác lô đang mở (' + rec.info.maRung + '): để trống ô Mã rừng hoặc sửa cho đúng lô');
    if (!HAKDates.isValid(r.ngay)) mark(r, 'err', 'Phiếu ' + (r.soPhieu || '(không số)') + ': ' + HAKDates.why(r.ngay).replace(/^thiếu ngày$/, 'thiếu ngày cân'));
    if (!r.bienSo) mark(r, 'err', 'Thiếu biển kiểm soát'); else if (!keys.has(bienKey(r.bienSo))) mark(r, 'err', 'Biển ' + r.bienSo + ' chưa có trong danh sách xe (tab Vận chuyển)');
    if (trim(r.ngay2) && !HAKDates.isValid(r.ngay2)) mark(r, 'err', 'Phiếu ' + (r.soPhieu || '(không số)') + ': ngày cân 2 ' + HAKDates.why(r.ngay2));
    else HAKPhieuCan.ngay2Warn(r).forEach(m => mark(r, 'warn', 'Phiếu ' + (r.soPhieu || '(không số)') + ': ' + m));
    if (!r.soPhieu) mark(r, 'err', 'Thiếu số phiếu cân');
    else { const k = r.soPhieu.toUpperCase(); if (seen[k]) mark(r, 'err', 'Số phiếu cân ' + r.soPhieu + ' trùng với dòng ' + seen[k]); else seen[k] = r._row; }
    if (r.kl == null) mark(r, 'err', 'Thiếu khối lượng'); else if (r.kl === 'x' || !(r.kl > 0)) mark(r, 'err', 'Khối lượng không hợp lệ');
    (r.giaLoi || []).forEach(m => mark(r, 'err', m + ' (sửa hoặc để trống ô này rồi nạp lại; giá trị đã lưu không bị đổi)'));
    [['can1', 'Cân lần 1'], ['can2', 'Cân lần 2'], ['klKg', 'Khối lượng (kg)']].forEach(([k, label]) => { if (r[k] === 'x' || (typeof r[k] === 'number' && r[k] < 0)) mark(r, 'err', label + ' phải là số không âm'); });
    if (typeof r.klKg === 'number' && typeof r.kl === 'number' && r.klKg > 0 && Math.abs(r.klKg / 1000 - r.kl) > 0.0005) mark(r, 'warn', 'Khối lượng kg (' + fmt(r.klKg) + ') và tấn (' + fmtT(Math.round(r.kl * 1000)) + ') không khớp nhau');
    if (typeof r.can1 === 'number' && typeof r.can2 === 'number' && typeof r.klKg === 'number' && r.klKg > 0 && Math.abs(Math.abs(r.can1 - r.can2) - r.klKg) > 1) mark(r, 'warn', 'Khối lượng kg không bằng chênh lệch cân lần 1 và cân lần 2');
  });
  const ng = parseFloat(String((rec.exp || {}).pcNguong || '').replace(',', '.')), vol = volumeOf(rec.info);
  if (pc.length && ng > 0 && vol) {
    const kg = totalKg(pc), lech = Math.abs(kg / 1000 - vol.v) / vol.v * 100;
    if (lech > ng) warns.push('Tổng khối lượng phiếu cân ' + fmtT(kg) + ' tấn lệch ' + lech.toFixed(1) + '% so với khối lượng khai thác ' + vol.src + ' ' + fmtT(Math.round(vol.v * 1000)) + ' tấn (ngưỡng ' + ng + '%)');
  }
  return {errs, warns, state};
}
function tripsOf(rec, g) {
  const ks = new Set(g.xe.map(x => bienKey(x.bienSo)));
  return (rec.pc || []).filter(r => ks.has(bienKey(r.bienSo))).sort((a, b) => dateKey(a.ngay) - dateKey(b.ngay));
}
function payVC(rec, g) {
  const rows = g.xe.map(x => {
    const t = (rec.pc || []).filter(r => bienKey(r.bienSo) === bienKey(x.bienSo)), kg = totalKg(t);
    return {bienSo: x.bienSo, n: t.length, kg, tien: Math.round(kg * g.donGia / 1000)};
  }).filter(r => r.n);
  return {rows, n: rows.reduce((a, r) => a + r.n, 0), kg: rows.reduce((a, r) => a + r.kg, 0), tien: rows.reduce((a, r) => a + r.tien, 0)};
}
const groupsPC = rec => groupsDX(rec).filter(g => tripsOf(rec, g).length);

