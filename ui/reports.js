/* Mẫu báo cáo (dữ liệu thuần, không phụ thuộc giao diện) — dùng chung cho Word, Excel và kiểm thử.
 * Đầu vào: danh sách "bản ghi rừng" do giao diện dựng từ hồ sơ:
 *   {chuRung, maChu, cccd, maRung, tenRung, diaDiem, dienTich, dinhMuc, khoiLuongTT, tuNgay, denNgay,
 *    pc:[{ngay, bienSo, soPhieu, kl, noiGiao}], nc, dx, pct, thieu:[{label, hint, warn}]}
 * Đầu ra: mô hình báo cáo {id, title, orient, period, kpis, sections:[{heading, note, cols, rows, foot}], notes}
 *   cột: {h, w (tỉ lệ), al: left|center|right, f: n0|n1|n2|n3|pct}. Ô là chuỗi hoặc số (số được định dạng theo f). */
const HAKReports = (function () {
  'use strict';
  const dateKey = v => { const m = String(v || '').match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/); return m ? +m[3] * 10000 + +m[2] * 100 + +m[1] : 0; };
  const num = v => typeof v === 'number' && isFinite(v) ? v : 0;
  const round = (v, d) => { const k = Math.pow(10, d); return Math.round(v * k + (v < 0 ? -1e-9 : 1e-9)) / k; };
  const group = s => String(s).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  function fmtNum(v, d) { // 1.234,567 (kiểu Việt Nam)
    if (typeof v !== 'number' || !isFinite(v)) return '';
    const [i, f] = Math.abs(v).toFixed(d).split('.');
    return (v < 0 ? '-' : '') + group(i) + (f ? ',' + f : '');
  }
  function fmtCell(v, f) {
    if (v == null || v === '') return '';
    if (typeof v !== 'number') return String(v);
    if (f === 'pct') return fmtNum(v, 1) + '%';
    const d = {n0: 0, n1: 1, n2: 2, n3: 3}[f];
    return fmtNum(v, d == null ? (Number.isInteger(v) ? 0 : 3) : d);
  }

  /* ---- Bộ lọc dữ liệu đầu vào ---- */
  function inRange(ngay, from, to) {
    const k = dateKey(ngay), a = dateKey(from), b = dateKey(to);
    if (!a && !b) return true;
    if (!k) return false;
    return (!a || k >= a) && (!b || k <= b);
  }
  const periodText = (from, to) => from && to ? 'Từ ngày ' + from + ' đến ngày ' + to : from ? 'Từ ngày ' + from : to ? 'Đến hết ngày ' + to : 'Toàn bộ thời gian';
  function pcOf(r, o) { return (r.pc || []).filter(p => inRange(p.ngay, o.from, o.to)); }
  const sumKl = list => round(list.reduce((s, p) => s + num(p.kl), 0), 3);
  const yieldOf = r => (typeof r.dienTich === 'number' && typeof r.dinhMuc === 'number') ? round(r.dienTich * r.dinhMuc, 3) : null;
  const byName = (a, b) => String(a).localeCompare(String(b), 'vi');
  const nameOf = r => r.tenRung || r.maRung || '(chưa đặt tên)';

  /* Phiếu trùng số (giữa các rừng hoặc trong một rừng): KHÔNG tự loại khỏi tổng, chỉ đánh dấu và báo rõ cách tính. */
  function dupInfo(recs, o) {
    const seen = {}, dupKeys = {};
    recs.forEach(r => pcOf(r, o).forEach(p => { const k = String(p.soPhieu || '').trim().toUpperCase(); if (!k) return; seen[k] = (seen[k] || 0) + 1; if (seen[k] > 1) dupKeys[k] = true; }));
    let extra = 0, tons = 0; const first = {};
    recs.forEach(r => pcOf(r, o).forEach(p => { const k = String(p.soPhieu || '').trim().toUpperCase(); if (!dupKeys[k]) return; if (first[k]) { extra++; tons += num(p.kl); } else first[k] = true; }));
    return {keys: Object.keys(dupKeys), extra, tons: round(tons, 3)};
  }
  const dupNote = d => 'Cách tính: phiếu trùng số vẫn được cộng vào tổng (hệ thống không tự xóa phiếu). Có ' + d.extra + ' phiếu trùng, tương ứng ' + fmtNum(d.tons, 3) + ' tấn; nếu xác minh là nhập trùng thì tổng thực tế giảm tương ứng.';

  /* ---- 1. Sản lượng khai thác theo rừng ---- */
  function sanLuong(recs, o) {
    const rows = [], tot = {dt: 0, dk: 0, tt: 0, trips: 0};
    const sorted = recs.slice().sort((a, b) => byName(a.chuRung, b.chuRung) || byName(a.maRung, b.maRung));
    sorted.forEach((r, i) => {
      const list = pcOf(r, o), tt = sumKl(list), dk = yieldOf(r);
      tot.dt += num(r.dienTich); tot.dk += num(dk); tot.tt += tt; tot.trips += list.length;
      rows.push([i + 1, r.chuRung, r.maRung, r.diaDiem || '', typeof r.dienTich === 'number' ? r.dienTich : '', typeof r.dinhMuc === 'number' ? r.dinhMuc : '',
        dk == null ? '' : dk, tt, dk ? round(tt / dk * 100, 1) : '', list.length, r.tuNgay ? r.tuNgay + (r.denNgay ? ' – ' + r.denNgay : '') : '']);
    });
    const vuot = sorted.filter(r => { const dk = yieldOf(r); return dk && sumKl(pcOf(r, o)) > dk * 1.05; });
    const chua = sorted.filter(r => !pcOf(r, o).length);
    const kpis = [
      {label: 'Số rừng', value: sorted.length, f: 'n0'}, {label: 'Tổng diện tích (ha)', value: round(tot.dt, 3), f: 'n2'},
      {label: 'Sản lượng dự kiến (tấn)', value: round(tot.dk, 3), f: 'n3'}, {label: 'Thực tế theo phiếu cân (tấn)', value: round(tot.tt, 3), f: 'n3'},
      {label: 'Số chuyến', value: tot.trips, f: 'n0'}];
    const notes = [];
    if (vuot.length) notes.push('Rừng có sản lượng thực tế vượt định mức trên 5%: ' + vuot.map(r => nameOf(r) + ' (' + r.maRung + ')').join('; ') + '. Cần đối chiếu diện tích, định mức và phiếu cân.');
    if (chua.length) notes.push('Rừng chưa có phiếu cân trong kỳ: ' + chua.map(r => r.maRung || nameOf(r)).join(', ') + '.');
    const dp = dupInfo(sorted, o); if (dp.extra) notes.push('Phiếu cân trùng số trong kỳ: ' + dp.keys.join(', ') + '. ' + dupNote(dp));
    notes.push('Sản lượng thực tế = tổng khối lượng các phiếu cân của rừng trong kỳ; sản lượng dự kiến = diện tích × định mức (tấn/ha).');
    return {id: 'sanluong', title: 'BÁO CÁO SẢN LƯỢNG KHAI THÁC THEO RỪNG', orient: 'landscape', period: periodText(o.from, o.to), kpis,
      sections: [{heading: 'Chi tiết theo rừng', cols: [
        {h: 'STT', w: 4, al: 'center', f: 'n0'}, {h: 'Chủ rừng', w: 15}, {h: 'Mã rừng', w: 11}, {h: 'Địa điểm khai thác', w: 20}, {h: 'Diện tích (ha)', w: 8, al: 'right', f: 'n2'},
        {h: 'Định mức (tấn/ha)', w: 8, al: 'right', f: 'n2'}, {h: 'Dự kiến (tấn)', w: 9, al: 'right', f: 'n3'}, {h: 'Thực tế (tấn)', w: 9, al: 'right', f: 'n3'},
        {h: '% so với dự kiến', w: 8, al: 'right', f: 'pct'}, {h: 'Số chuyến', w: 6, al: 'center', f: 'n0'}, {h: 'Thời gian khai thác', w: 12, al: 'center'}],
        rows, foot: ['', 'TỔNG CỘNG', '', '', round(tot.dt, 3), '', round(tot.dk, 3), round(tot.tt, 3), tot.dk ? round(tot.tt / tot.dk * 100, 1) : '', tot.trips, '']}],
      notes};
  }

  /* ---- 2. Sổ theo dõi phiếu cân – vận chuyển ---- */
  function soPhieuCan(recs, o) {
    const all = [];
    recs.forEach(r => pcOf(r, o).forEach(p => all.push(Object.assign({}, p, {rung: r.maRung, chu: r.chuRung}))));
    all.sort((a, b) => dateKey(a.ngay) - dateKey(b.ngay) || String(a.soPhieu).localeCompare(String(b.soPhieu)));
    const dpi = dupInfo(recs, o), isDup = {}; dpi.keys.forEach(k => { isDup[k] = true; });
    const rows = all.map((p, i) => [i + 1, p.ngay, p.soPhieu, p.bienSo, p.chu, p.rung, p.noiGiao || '', num(p.kl), isDup[String(p.soPhieu || '').trim().toUpperCase()] ? 'Trùng số phiếu' : '']);
    const total = sumKl(all);
    const byPlate = {}, byDay = {}, byForest = {};
    all.forEach(p => {
      const k = String(p.bienSo || '(không có biển số)').toUpperCase();
      (byPlate[k] = byPlate[k] || {n: 0, t: 0}).n++; byPlate[k].t += num(p.kl);
      const d = p.ngay || '(không có ngày)'; (byDay[d] = byDay[d] || {n: 0, t: 0}).n++; byDay[d].t += num(p.kl);
      const f = p.rung || '(không có mã rừng)'; (byForest[f] = byForest[f] || {n: 0, t: 0}).n++; byForest[f].t += num(p.kl);
    });
    const tbl = (obj, label, keyCmp) => {
      const ks = Object.keys(obj).sort(keyCmp), tn = ks.reduce((s, k) => s + obj[k].n, 0), tt = round(ks.reduce((s, k) => s + obj[k].t, 0), 3);
      return {cols: [{h: 'STT', w: 6, al: 'center', f: 'n0'}, {h: label, w: 40}, {h: 'Số chuyến', w: 16, al: 'center', f: 'n0'}, {h: 'Khối lượng (tấn)', w: 20, al: 'right', f: 'n3'}],
        rows: ks.map((k, i) => [i + 1, k, obj[k].n, round(obj[k].t, 3)]), foot: ['', 'Cộng', tn, tt]};
    };
    const notes = [];
    if (dpi.extra) notes.push('Số phiếu cân xuất hiện nhiều lần (cần kiểm tra trùng): ' + dpi.keys.join(', ') + '. ' + dupNote(dpi));
    const noPlate = all.filter(p => !p.bienSo).length; if (noPlate) notes.push(noPlate + ' phiếu cân chưa có biển kiểm soát.');
    return {id: 'phieucan', title: 'SỔ THEO DÕI PHIẾU CÂN – VẬN CHUYỂN GỖ KEO', orient: 'landscape', period: periodText(o.from, o.to),
      kpis: [{label: 'Số phiếu cân', value: all.length, f: 'n0'}, {label: 'Tổng khối lượng (tấn)', value: total, f: 'n3'}, {label: 'Số xe', value: Object.keys(byPlate).length, f: 'n0'},
        {label: 'Bình quân (tấn/chuyến)', value: all.length ? round(total / all.length, 3) : 0, f: 'n3'}, {label: 'Phiếu trùng số (đã tính vào tổng)', value: dpi.extra, f: 'n0'}],
      sections: [
        {heading: 'I. Danh sách phiếu cân', cols: [{h: 'STT', w: 5, al: 'center', f: 'n0'}, {h: 'Ngày cân', w: 10, al: 'center'}, {h: 'Số phiếu cân', w: 14}, {h: 'Biển kiểm soát', w: 12, al: 'center'},
          {h: 'Chủ rừng', w: 17}, {h: 'Mã rừng', w: 11}, {h: 'Nơi giao', w: 15}, {h: 'Khối lượng (tấn)', w: 11, al: 'right', f: 'n3'}, {h: 'Ghi chú', w: 10}], rows, foot: ['', 'TỔNG CỘNG', '', '', '', '', '', total, '']},
        Object.assign({heading: 'II. Tổng hợp theo rừng'}, tbl(byForest, 'Mã rừng', byName)),
        Object.assign({heading: 'III. Tổng hợp theo biển kiểm soát'}, tbl(byPlate, 'Biển kiểm soát', byName)),
        Object.assign({heading: 'IV. Tổng hợp theo ngày cân'}, tbl(byDay, 'Ngày cân', (a, b) => dateKey(a) - dateKey(b) || byName(a, b)))],
      notes};
  }

  /* ---- 3. Tiến độ hồ sơ và checklist FSC ---- */
  function tienDo(recs, o) {
    const sorted = recs.slice().sort((a, b) => a.pct - b.pct || byName(a.chuRung, b.chuRung));
    const avg = sorted.length ? round(sorted.reduce((s, r) => s + r.pct, 0) / sorted.length, 1) : 0;
    const full = sorted.filter(r => r.pct === 100).length, low = sorted.filter(r => r.pct < 50).length;
    const miss = []; const count = {};
    sorted.forEach(r => (r.thieu || []).forEach(t => {
      miss.push([miss.length + 1, r.chuRung, r.maRung, t.label, t.hint || '', t.warn ? 'Lưu ý' : 'Thiếu / lỗi']);
      const k = t.label; count[k] = (count[k] || 0) + 1;
    }));
    const top = Object.keys(count).sort((a, b) => count[b] - count[a] || byName(a, b)).slice(0, 8);
    return {id: 'tiendo', title: 'BÁO CÁO TIẾN ĐỘ HỒ SƠ VÀ CHECKLIST FSC', orient: 'landscape', period: 'Tính đến ngày ' + (o.today || ''),
      kpis: [{label: 'Số rừng', value: sorted.length, f: 'n0'}, {label: 'Tiến độ trung bình', value: avg, f: 'pct'}, {label: 'Hồ sơ đạt 100%', value: full, f: 'n0'}, {label: 'Hồ sơ dưới 50%', value: low, f: 'n0'}],
      sections: [
        {heading: 'I. Tiến độ từng rừng (xếp thấp → cao)', cols: [{h: 'STT', w: 5, al: 'center', f: 'n0'}, {h: 'Chủ rừng', w: 22}, {h: 'Mã rừng', w: 13}, {h: 'Tên rừng', w: 18},
          {h: 'Nhân công', w: 8, al: 'center', f: 'n0'}, {h: 'Xe', w: 6, al: 'center', f: 'n0'}, {h: 'Phiếu cân', w: 8, al: 'center', f: 'n0'}, {h: 'Hạng mục thiếu', w: 9, al: 'center', f: 'n0'}, {h: 'Tiến độ', w: 9, al: 'right', f: 'pct'}],
          rows: sorted.map((r, i) => [i + 1, r.chuRung, r.maRung, r.tenRung || '', num(r.nc), num(r.dx), (r.pc || []).length, (r.thieu || []).length, r.pct]), foot: ['', 'TRUNG BÌNH', '', '', '', '', '', '', avg]},
        {heading: 'II. Hạng mục còn thiếu theo rừng', cols: [{h: 'STT', w: 5, al: 'center', f: 'n0'}, {h: 'Chủ rừng', w: 18}, {h: 'Mã rừng', w: 12}, {h: 'Hạng mục', w: 22}, {h: 'Cần làm', w: 33}, {h: 'Mức độ', w: 10, al: 'center'}], rows: miss}],
      notes: top.length ? ['Hạng mục thiếu nhiều nhất: ' + top.map(k => k + ' (' + count[k] + ' rừng)').join('; ') + '.'] : ['Tất cả hồ sơ đã đạt đủ hạng mục.']};
  }

  /* ---- 4. Báo cáo tổng hợp điều hành ---- */
  function dieuHanh(recs, o) {
    const owners = {}; recs.forEach(r => { (owners[r.maChu || r.chuRung] = owners[r.maChu || r.chuRung] || {ten: r.chuRung, ma: r.maChu, n: 0, ha: 0, t: 0, trips: 0, pct: 0}); });
    recs.forEach(r => { const k = r.maChu || r.chuRung, ow = owners[k], list = pcOf(r, o); ow.n++; ow.ha += num(r.dienTich); ow.t += sumKl(list); ow.trips += list.length; ow.pct += r.pct; });
    const list = Object.values(owners).sort((a, b) => b.t - a.t || byName(a.ten, b.ten));
    const totT = round(list.reduce((s, x) => s + x.t, 0), 3), totHa = round(list.reduce((s, x) => s + x.ha, 0), 3), trips = list.reduce((s, x) => s + x.trips, 0);
    const avg = recs.length ? round(recs.reduce((s, r) => s + r.pct, 0) / recs.length, 1) : 0;
    const risks = [];
    recs.forEach(r => {
      const dk = yieldOf(r), tt = sumKl(pcOf(r, o));
      if (dk && tt > dk * 1.05) risks.push([r.chuRung, r.maRung, 'Sản lượng thực tế vượt định mức', 'Thực tế ' + fmtNum(tt, 3) + ' tấn / dự kiến ' + fmtNum(dk, 3) + ' tấn']);
      if (!r.pc || !r.pc.length) risks.push([r.chuRung, r.maRung, 'Chưa có phiếu cân', 'Chưa nạp dữ liệu vận chuyển']);
      if (r.pct < 50) risks.push([r.chuRung, r.maRung, 'Hồ sơ FSC dưới 50%', 'Tiến độ ' + fmtNum(r.pct, 1) + '%']);
      (r.thieu || []).filter(t => !t.warn && /Tọa độ|Giấy tờ pháp lý/.test(t.label)).forEach(t => risks.push([r.chuRung, r.maRung, 'Thiếu ' + t.label.toLowerCase(), t.hint || '']));
    });
    const dpd = dupInfo(recs, o); if (dpd.extra) risks.push(['(nhiều rừng)', dpd.keys.join(', '), 'Trùng số phiếu cân', dpd.extra + ' phiếu, ' + fmtNum(dpd.tons, 3) + ' tấn đang tính trong tổng']);
    return {id: 'dieuhanh', title: 'BÁO CÁO TỔNG HỢP ĐIỀU HÀNH KHAI THÁC VÀ VẬN CHUYỂN GỖ KEO', orient: 'portrait', period: periodText(o.from, o.to),
      kpis: [{label: 'Chủ rừng', value: list.length, f: 'n0'}, {label: 'Số rừng', value: recs.length, f: 'n0'}, {label: 'Diện tích (ha)', value: totHa, f: 'n2'}, {label: 'Khối lượng vận chuyển (tấn)', value: totT, f: 'n3'},
        {label: 'Số chuyến', value: trips, f: 'n0'}, {label: 'Tiến độ hồ sơ TB', value: avg, f: 'pct'}],
      sections: [
        {heading: 'I. Tổng hợp theo chủ rừng', cols: [{h: 'STT', w: 6, al: 'center', f: 'n0'}, {h: 'Chủ rừng', w: 30}, {h: 'Số rừng', w: 10, al: 'center', f: 'n0'}, {h: 'Diện tích (ha)', w: 14, al: 'right', f: 'n2'}, {h: 'Số chuyến', w: 10, al: 'center', f: 'n0'},
          {h: 'Khối lượng (tấn)', w: 16, al: 'right', f: 'n3'}, {h: 'Tiến độ TB', w: 12, al: 'right', f: 'pct'}],
          rows: list.map((x, i) => [i + 1, x.ten, x.n, round(x.ha, 3), x.trips, round(x.t, 3), x.n ? round(x.pct / x.n, 1) : 0]), foot: ['', 'TỔNG CỘNG', recs.length, totHa, trips, totT, avg]},
        {heading: 'II. Vấn đề cần xử lý', cols: [{h: 'STT', w: 6, al: 'center', f: 'n0'}, {h: 'Chủ rừng', w: 22}, {h: 'Mã rừng', w: 16}, {h: 'Vấn đề', w: 26}, {h: 'Chi tiết', w: 30}], rows: risks.map((x, i) => [i + 1, ...x])}],
      notes: risks.length ? [] : ['Không phát hiện vấn đề cần xử lý ở các tiêu chí đã kiểm tra.']};
  }

  const REPORTS = [
    {id: 'dieuhanh', name: 'Tổng hợp điều hành', desc: 'Một trang cho lãnh đạo: số liệu chính theo chủ rừng và các vấn đề cần xử lý.', build: dieuHanh},
    {id: 'sanluong', name: 'Sản lượng khai thác theo rừng', desc: 'Diện tích, định mức, sản lượng dự kiến và thực tế theo phiếu cân; cảnh báo vượt định mức.', build: sanLuong},
    {id: 'phieucan', name: 'Sổ theo dõi phiếu cân – vận chuyển', desc: 'Danh sách phiếu cân theo kỳ, tổng hợp theo rừng, biển số, ngày; phát hiện trùng phiếu.', build: soPhieuCan},
    {id: 'tiendo', name: 'Tiến độ hồ sơ và checklist FSC', desc: 'Tiến độ từng rừng và danh sách hạng mục còn thiếu để hoàn thiện hồ sơ.', build: tienDo}
  ];

  /* Mô hình -> bảng dữ liệu phẳng (dùng cho Excel) */
  function toAoa(m, meta) {
    meta = meta || {};
    const a = [[meta.org || 'HAK GROUP'], [m.title], [m.period + (meta.scope ? ' · ' + meta.scope : '')], []];
    if (m.kpis.length) { a.push(['Chỉ tiêu tổng hợp']); m.kpis.forEach(k => a.push([k.label, k.value])); a.push([]); }
    m.sections.forEach(s => {
      a.push([s.heading]); a.push(s.cols.map(c => c.h));
      s.rows.forEach(r => a.push(r.slice()));
      if (s.foot) a.push(s.foot.slice());
      a.push([]);
    });
    m.notes.forEach(n => a.push(['Ghi chú: ' + n]));
    a.push([], ['Lập ngày ' + (meta.today || '')]);
    return a;
  }

  return {REPORTS, dateKey, fmtNum, fmtCell, toAoa, sanLuong, soPhieuCan, tienDo, dieuHanh, inRange, periodText};
})();
if (typeof module !== 'undefined' && module.exports) module.exports = HAKReports;
