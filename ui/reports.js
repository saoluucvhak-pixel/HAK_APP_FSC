/* Mẫu báo cáo (dữ liệu thuần, không phụ thuộc giao diện) — dùng chung cho Word, Excel và kiểm thử.
 * Đầu vào: danh sách "bản ghi rừng" do giao diện dựng từ hồ sơ:
 *   {chuRung, maChu, cccd, maRung, tenRung, diaDiem, dienTich, dinhMuc, khoiLuongTT, tuNgay, denNgay,
 *    pc:[{ngay, bienSo, soPhieu, kl, noiGiao}], nc, dx, pct, thieu:[{label, hint, warn}]}
 * Đầu ra: mô hình báo cáo {id, title, orient, period, kpis, sections:[{heading, note, cols, rows, foot}], notes}
 *   cột: {h, w (tỉ lệ), al: left|center|right, f: n0|n1|n2|n3|pct}. Ô là chuỗi hoặc số (số được định dạng theo f). */
const HAKReports = (function () {
  'use strict';
  /* Quy tắc ngày lịch dùng chung (src/dates.js): ngày không có thật (31/02/2026) → 0, không lọt vào bất kỳ kỳ nào */
  const D = typeof HAKDates !== 'undefined' ? HAKDates : require('../src/dates.js');
  const dateKey = v => D.key(v);
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
  const inRange = (ngay, from, to) => D.inRange(ngay, from, to);
  const periodText = (from, to) => from && to ? 'Từ ngày ' + from + ' đến ngày ' + to : from ? 'Từ ngày ' + from : to ? 'Đến hết ngày ' + to : 'Toàn bộ thời gian';
  /* Phiếu cân dùng cho báo cáo: ngày phải CÓ THẬT và nằm trong kỳ. Phiếu ngày sai bị loại khỏi mọi tổng (kể cả không lọc kỳ) và được liệt kê riêng, không bị xóa. */
  function pcOf(r, o) { return (r.pc || []).filter(p => D.isValid(p.ngay) && inRange(p.ngay, o.from, o.to)); }
  function badPc(recs) {
    const out = [];
    recs.forEach(r => (r.pc || []).forEach(p => { if (!D.isValid(p.ngay)) out.push({rung: r.maRung, chu: r.chuRung, soPhieu: p.soPhieu || '(không số)', ngay: p.ngay || '', ly: D.why(p.ngay), kl: kt(p)}); }));
    return out;
  }
  const badNote = bad => bad.length ? bad.length + ' phiếu cân có ngày không hợp lệ bị loại khỏi tổng (' + bad.slice(0, 6).map(b => b.soPhieu + ': ' + b.ly).join('; ') + (bad.length > 6 ? '; …' : '') + '). Dữ liệu phiếu được giữ nguyên; sửa ngày ở tab Vận chuyển để tính lại.' : '';
  const rangeNote = o => D.range(o.from, o.to).problem;
  const kt = p => Math.round(num(p.kl) * 1000) / 1000;   // khối lượng một phiếu làm tròn đến kg (cùng quy tắc với biểu mẫu), để mọi tổng khớp nhau
  const sumKl = list => round(list.reduce((s, p) => s + kt(p), 0), 3);
  const yieldOf = r => (typeof r.dienTich === 'number' && typeof r.dinhMuc === 'number') ? round(r.dienTich * r.dinhMuc, 3) : null;
  const byName = (a, b) => String(a).localeCompare(String(b), 'vi');
  const nameOf = r => r.tenRung || r.maRung || '(chưa đặt tên)';

  /* Phiếu trùng số (giữa các rừng hoặc trong một rừng): KHÔNG tự loại khỏi tổng, chỉ đánh dấu và báo rõ cách tính. */
  function dupInfo(recs, o) {
    const seen = {}, dupKeys = {};
    recs.forEach(r => pcOf(r, o).forEach(p => { const k = String(p.soPhieu || '').trim().toUpperCase(); if (!k) return; seen[k] = (seen[k] || 0) + 1; if (seen[k] > 1) dupKeys[k] = true; }));
    let extra = 0, tons = 0; const first = {};
    recs.forEach(r => pcOf(r, o).forEach(p => { const k = String(p.soPhieu || '').trim().toUpperCase(); if (!dupKeys[k]) return; if (first[k]) { extra++; tons += kt(p); } else first[k] = true; }));
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
    const bad = badPc(sorted); if (bad.length) notes.unshift(badNote(bad)); if (rangeNote(o)) notes.unshift(rangeNote(o));
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
    recs.forEach(r => pcOf(r, o).forEach(p => all.push(Object.assign({}, p, {rung: r.maRung, chu: r.chuRung, dd: r.diemDen || null}))));
    all.sort((a, b) => dateKey(a.ngay) - dateKey(b.ngay) || String(a.soPhieu).localeCompare(String(b.soPhieu)));
    const MH = typeof HAKMuaHang !== 'undefined' ? HAKMuaHang : require('../src/muahang.js');
    const lech = p => p.dd && p.dd.src === 'congty' && !MH.noiGiaoKhop(p.noiGiao, p.dd);
    const dpi = dupInfo(recs, o), isDup = {}; dpi.keys.forEach(k => { isDup[k] = true; });
    const nz = v => (typeof v === 'number' && isFinite(v) ? v : '');
    const rows = all.map((p, i) => [i + 1, p.ngay, p.gioCan1 || '', p.gioCan2 || '', p.soPhieu, p.bienSo, p.khachHang || p.chu, p.rung, nz(p.can1), nz(p.can2), nz(p.klKg) !== '' ? p.klKg : Math.round(kt(p) * 1000), kt(p), p.noiGiao || '', isDup[String(p.soPhieu || '').trim().toUpperCase()] ? 'Trùng số phiếu' : '', (p.dd && p.dd.text) || '', lech(p) ? 'Khác điểm đến theo hồ sơ' : '']);
    const total = sumKl(all);
    const byPlate = {}, byDay = {}, byForest = {};
    all.forEach(p => {
      const k = String(p.bienSo || '(không có biển số)').toUpperCase();
      (byPlate[k] = byPlate[k] || {n: 0, t: 0}).n++; byPlate[k].t += kt(p);
      const d = p.ngay || '(không có ngày)'; (byDay[d] = byDay[d] || {n: 0, t: 0}).n++; byDay[d].t += kt(p);
      const f = p.rung || '(không có mã rừng)'; (byForest[f] = byForest[f] || {n: 0, t: 0}).n++; byForest[f].t += kt(p);
    });
    const tbl = (obj, label, keyCmp) => {
      const ks = Object.keys(obj).sort(keyCmp), tn = ks.reduce((s, k) => s + obj[k].n, 0), tt = round(ks.reduce((s, k) => s + obj[k].t, 0), 3);
      return {cols: [{h: 'STT', w: 6, al: 'center', f: 'n0'}, {h: label, w: 40, f: label === 'Ngày cân' ? 'date' : undefined}, {h: 'Số chuyến', w: 16, al: 'center', f: 'n0'}, {h: 'Khối lượng (tấn)', w: 20, al: 'right', f: 'n3'}],
        rows: ks.map((k, i) => [i + 1, k, obj[k].n, round(obj[k].t, 3)]), foot: ['', 'Cộng', tn, tt]};
    };
    const notes = [], bad = badPc(recs); if (rangeNote(o)) notes.push(rangeNote(o)); if (bad.length) notes.push(badNote(bad));
    if (dpi.extra) notes.push('Số phiếu cân xuất hiện nhiều lần (cần kiểm tra trùng): ' + dpi.keys.join(', ') + '. ' + dupNote(dpi));
    const nLech = all.filter(lech).length; if (nLech) notes.push(nLech + ' phiếu cân có “Nơi giao” khác điểm đến theo hồ sơ rừng (nội dung phiếu giữ nguyên theo nguồn; cần đối chiếu).');
    const noDest = [...new Set(recs.filter(r => !(r.diemDen && r.diemDen.text) && pcOf(r, o).length).map(r => r.maRung))]; if (noDest.length) notes.push('Rừng chưa có điểm đến vận chuyển (chưa chọn công ty mua hàng): ' + noDest.join(', ') + '.');
    const noPlate = all.filter(p => !p.bienSo).length; if (noPlate) notes.push(noPlate + ' phiếu cân chưa có biển kiểm soát.');
    return {id: 'phieucan', title: 'SỔ THEO DÕI PHIẾU CÂN – VẬN CHUYỂN GỖ KEO', orient: 'landscape', period: periodText(o.from, o.to),
      kpis: [{label: 'Số phiếu cân', value: all.length, f: 'n0'}, {label: 'Tổng khối lượng (tấn)', value: total, f: 'n3'}, {label: 'Số xe', value: Object.keys(byPlate).length, f: 'n0'},
        {label: 'Bình quân (tấn/chuyến)', value: all.length ? round(total / all.length, 3) : 0, f: 'n3'}, {label: 'Phiếu trùng số (đã tính vào tổng)', value: dpi.extra, f: 'n0'}, ...(bad.length ? [{label: 'Phiếu bị loại (ngày không hợp lệ)', value: bad.length, f: 'n0'}] : [])],
      sections: [
        {heading: 'I. Danh sách phiếu cân', cols: [{h: 'STT', w: 5, al: 'center', f: 'n0'}, {h: 'Ngày cân', w: 10, f: 'date'}, {h: 'Giờ cân 1', w: 7, al: 'center'}, {h: 'Giờ cân 2', w: 7, al: 'center'}, {h: 'Số phiếu cân', w: 9}, {h: 'Biển kiểm soát', w: 9, al: 'center'},
          {h: 'Khách hàng', w: 11}, {h: 'Mã rừng', w: 7}, {h: 'Cân lần 1 (kg)', w: 8, al: 'right', f: 'n0'}, {h: 'Cân lần 2 (kg)', w: 8, al: 'right', f: 'n0'}, {h: 'Khối lượng (kg)', w: 8, al: 'right', f: 'n0'}, {h: 'Khối lượng (tấn)', w: 8, al: 'right', f: 'n3'},
          {h: 'Nơi giao', w: 10}, {h: 'Ghi chú', w: 6}, {h: 'Điểm đến theo hồ sơ rừng', w: 10}, {h: 'Đối chiếu nơi giao', w: 8}], rows, foot: ['', 'TỔNG CỘNG', '', '', '', '', '', '', '', '', rows.reduce((x, r) => x + (r[10] || 0), 0), total, '', '', '', '']},
        Object.assign({heading: 'II. Tổng hợp theo rừng'}, tbl(byForest, 'Mã rừng', byName)),
        Object.assign({heading: 'III. Tổng hợp theo biển kiểm soát'}, tbl(byPlate, 'Biển kiểm soát', byName)),
        Object.assign({heading: 'IV. Tổng hợp theo ngày cân'}, tbl(byDay, 'Ngày cân', (a, b) => dateKey(a) - dateKey(b) || byName(a, b))),
        ...(bad.length ? [{heading: 'V. Phiếu cân bị loại (ngày không hợp lệ)', note: 'Không tính vào các bảng trên. Sửa ngày ở tab Vận chuyển.', cols: [{h: 'STT', w: 6, al: 'center', f: 'n0'}, {h: 'Số phiếu', w: 16}, {h: 'Ngày ghi trên phiếu', w: 16}, {h: 'Lý do', w: 38}, {h: 'Mã rừng', w: 12}, {h: 'Khối lượng (tấn)', w: 12, al: 'right', f: 'n3'}],
          rows: bad.map((b, i) => [i + 1, b.soPhieu, b.ngay, b.ly, b.rung, b.kl]), foot: ['', 'Cộng', '', '', '', round(bad.reduce((x, b) => x + b.kl, 0), 3)]}] : [])],
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
    badPc(recs).forEach(b => risks.push([b.chu, b.rung, 'Phiếu cân ngày không hợp lệ', 'Phiếu ' + b.soPhieu + ': ' + b.ly + ' — bị loại khỏi tổng']));
    const dpd = dupInfo(recs, o); if (dpd.extra) risks.push(['(nhiều rừng)', dpd.keys.join(', '), 'Trùng số phiếu cân', dpd.extra + ' phiếu, ' + fmtNum(dpd.tons, 3) + ' tấn đang tính trong tổng']);
    return {id: 'dieuhanh', title: 'BÁO CÁO TỔNG HỢP ĐIỀU HÀNH KHAI THÁC VÀ VẬN CHUYỂN GỖ KEO', orient: 'portrait', period: periodText(o.from, o.to),
      kpis: [{label: 'Chủ rừng', value: list.length, f: 'n0'}, {label: 'Số rừng', value: recs.length, f: 'n0'}, {label: 'Diện tích (ha)', value: totHa, f: 'n2'}, {label: 'Khối lượng vận chuyển (tấn)', value: totT, f: 'n3'},
        {label: 'Số chuyến', value: trips, f: 'n0'}, {label: 'Tiến độ hồ sơ TB', value: avg, f: 'pct'}],
      sections: [
        {heading: 'I. Tổng hợp theo chủ rừng', cols: [{h: 'STT', w: 6, al: 'center', f: 'n0'}, {h: 'Chủ rừng', w: 30}, {h: 'Số rừng', w: 10, al: 'center', f: 'n0'}, {h: 'Diện tích (ha)', w: 14, al: 'right', f: 'n2'}, {h: 'Số chuyến', w: 10, al: 'center', f: 'n0'},
          {h: 'Khối lượng (tấn)', w: 16, al: 'right', f: 'n3'}, {h: 'Tiến độ TB', w: 12, al: 'right', f: 'pct'}],
          rows: list.map((x, i) => [i + 1, x.ten, x.n, round(x.ha, 3), x.trips, round(x.t, 3), x.n ? round(x.pct / x.n, 1) : 0]), foot: ['', 'TỔNG CỘNG', recs.length, totHa, trips, totT, avg]},
        {heading: 'II. Vấn đề cần xử lý', cols: [{h: 'STT', w: 6, al: 'center', f: 'n0'}, {h: 'Chủ rừng', w: 22}, {h: 'Mã rừng', w: 16}, {h: 'Vấn đề', w: 26}, {h: 'Chi tiết', w: 30}], rows: risks.map((x, i) => [i + 1, ...x])}],
      notes: [...(rangeNote(o) ? [rangeNote(o)] : []), ...(risks.length ? [] : ['Không phát hiện vấn đề cần xử lý ở các tiêu chí đã kiểm tra.'])]};
  }

  /* Căn lề theo chuẩn: số → phải; ngày → giữa; văn bản/mã → trái. STT là số thứ tự (nhãn) nên giữ căn giữa. */
  const NUMERIC = {n0: 1, n1: 1, n2: 1, n3: 1, pct: 1};
  function finalize(m, unit) {
    m.unit = unit;
    m.sections.forEach(s => s.cols.forEach(c => {
      if (c.h === 'STT') c.al = 'center';
      else if (NUMERIC[c.f]) c.al = 'right';
      else if (c.f === 'date' || /^(Ngày|Thời gian)/.test(c.h)) c.al = 'center';
      else c.al = 'left';
    }));
    return m;
  }
  const withUnit = (fn, unit) => (recs, o) => finalize(fn(recs, o), unit);

  /* ---- 5. Bảng cha–con: chủ rừng → rừng → (tuỳ chọn) phiếu cân. Cha là tổng của con; không tính lại ở nơi khác. ---- */
  function chaCon(recs, o) {
    const owners = {}; recs.forEach(r => { const k = r.maChu || r.chuRung; (owners[k] = owners[k] || {ten: r.chuRung, ma: r.maChu, forests: []}).forests.push(r); });
    const list = Object.values(owners).sort((a, b) => byName(a.ten, b.ten));
    const rows = [], levels = [], tot = {ha: 0, t: 0, n: 0};
    list.forEach(ow => {
      const fs = ow.forests.slice().sort((a, b) => byName(a.maRung, b.maRung));
      const sums = fs.map(r => { const pcs = pcOf(r, o); return {r, pcs, t: sumKl(pcs), ha: num(r.dienTich)}; });
      const oh = round(sums.reduce((x, y) => x + y.ha, 0), 3), ot = round(sums.reduce((x, y) => x + y.t, 0), 3), on = sums.reduce((x, y) => x + y.pcs.length, 0);
      tot.ha += oh; tot.t += ot; tot.n += on;
      rows.push([ow.ten, ow.ma || '', fs.length + ' rừng', '', oh, on, ot, round(fs.reduce((x, r) => x + r.pct, 0) / fs.length, 1)]); levels.push(0);
      sums.forEach(x => {
        rows.push(['└ ' + nameOf(x.r), x.r.maRung, x.r.diaDiem || '', '', typeof x.r.dienTich === 'number' ? x.r.dienTich : '', x.pcs.length, x.t, x.r.pct]); levels.push(1);
        if (o.detail) x.pcs.slice().sort((a, b) => dateKey(a.ngay) - dateKey(b.ngay)).forEach(p => { rows.push(['• Phiếu ' + (p.soPhieu || '(không số)'), p.soPhieu || '', p.bienSo || '', p.ngay || '', '', 1, kt(p), '']); levels.push(2); });
      });
    });
    const dp = dupInfo(recs, o), notes = [], bad = badPc(recs);
    if (rangeNote(o)) notes.push(rangeNote(o)); if (bad.length) notes.push(badNote(bad));
    if (dp.extra) notes.push('Phiếu cân trùng số trong kỳ: ' + dp.keys.join(', ') + '. ' + dupNote(dp));
    notes.push('Dòng đậm là chủ rừng (cha) = tổng các rừng (con) bên dưới; rừng = tổng các phiếu cân của rừng đó trong kỳ.' + (o.detail ? '' : ' Bật “Kèm từng phiếu cân” để xem cấp phiếu.'));
    return {id: 'chacon', title: 'BẢNG CHA–CON: CHỦ RỪNG – RỪNG – PHIẾU CÂN', orient: 'landscape', period: periodText(o.from, o.to),
      kpis: [{label: 'Chủ rừng', value: list.length, f: 'n0'}, {label: 'Số rừng', value: recs.length, f: 'n0'}, {label: 'Diện tích (ha)', value: round(tot.ha, 3), f: 'n2'}, {label: 'Số chuyến', value: tot.n, f: 'n0'}, {label: 'Khối lượng (tấn)', value: round(tot.t, 3), f: 'n3'}],
      sections: [{heading: 'Chi tiết theo cấp', cols: [{h: 'Chủ rừng / Rừng / Phiếu cân', w: 24}, {h: 'Mã', w: 14}, {h: 'Địa điểm / Biển số', w: 17}, {h: 'Ngày cân', w: 10, f: 'date'}, {h: 'Diện tích (ha)', w: 9, f: 'n2'}, {h: 'Số chuyến', w: 8, f: 'n0'}, {h: 'Khối lượng (tấn)', w: 10, f: 'n3'}, {h: 'Tiến độ hồ sơ', w: 8, f: 'pct'}],
        rows, levels, foot: ['TỔNG CỘNG', '', '', '', round(tot.ha, 3), tot.n, round(tot.t, 3), '']}], notes};
  }

  /* ---- 6. Phiếu cân đã cập nhật biển số xe, theo từng lô rừng ---- */
  const isoVN = iso => { const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(String(iso || '')); return m ? m[3] + '/' + m[2] + '/' + m[1] + ' ' + m[4] + ':' + m[5] : String(iso || ''); };
  function bienSoDoi(recs, o) {
    const sorted = recs.slice().sort((a, b) => byName(a.maRung, b.maRung));
    const inP = e => D.isValid(e.ngay) && inRange(e.ngay, o.from, o.to);
    const per = sorted.map(r => ({r, log: (r.bienLog || []).filter(inP), tong: pcOf(r, o)}));
    const rows = [], det = [];
    per.forEach(x => {
      const so = new Set(x.log.map(e => String(e.soPhieu).toUpperCase())), kl = round(x.log.reduce((s, e) => s + kt(e), 0), 3);
      rows.push([rows.length + 1, x.r.maRung, x.r.chuRung, x.tong.length, so.size, x.tong.length ? round(so.size / x.tong.length * 100, 1) : 0, kl]);
      x.log.slice().sort((a, b) => dateKey(a.ngay) - dateKey(b.ngay) || String(a.soPhieu).localeCompare(String(b.soPhieu)) || String(a.at).localeCompare(String(b.at)))
        .forEach(e => det.push([det.length + 1, x.r.maRung, x.r.chuRung, e.soPhieu, e.ngay, e.cu || '(chưa có)', e.moi, kt(e), isoVN(e.at), e.nguon || '']));
    });
    const nLo = per.filter(x => x.log.length).length, nPh = per.reduce((s, x) => s + new Set(x.log.map(e => String(e.soPhieu).toUpperCase())).size, 0);
    const tot = per.reduce((s, x) => s + x.tong.length, 0), klAll = round(per.reduce((s, x) => s + x.log.reduce((t, e) => t + kt(e), 0), 0), 3);
    const notes = []; if (rangeNote(o)) notes.push(rangeNote(o));
    if (!det.length) notes.push('Chưa có phiếu cân nào được cập nhật biển số xe trong kỳ. Biển số được cập nhật ở màn Tra cứu Google Sheets (phiếu đổi biển được tích sẵn, giữ ô “Chỉ đổi biển số”, rồi Lưu vào hồ sơ) hoặc khi ghi lại phiếu cân đã có với biển số mới.');
    const multi = per.filter(x => { const c = {}; x.log.forEach(e => { const k = String(e.soPhieu).toUpperCase(); c[k] = (c[k] || 0) + 1; }); return Object.values(c).some(n => n > 1); }).map(x => x.r.maRung);
    if (multi.length) notes.push('Có phiếu cân được đổi biển số nhiều lần (xem đủ các dòng theo thời điểm cập nhật): lô ' + multi.join(', ') + '.');
    return {id: 'bienso', title: 'BÁO CÁO PHIẾU CÂN ĐÃ CẬP NHẬT BIỂN SỐ XE THEO LÔ RỪNG', orient: 'landscape', period: periodText(o.from, o.to),
      kpis: [{label: 'Số lô có phiếu cập nhật biển', value: nLo, f: 'n0'}, {label: 'Số phiếu đã cập nhật biển', value: nPh, f: 'n0'}, {label: 'Tổng số phiếu cân trong kỳ', value: tot, f: 'n0'}, {label: 'Khối lượng phiếu đã cập nhật (tấn)', value: klAll, f: 'n3'}],
      sections: [
        {heading: 'I. Tổng hợp theo lô rừng', cols: [{h: 'STT', w: 6, al: 'center', f: 'n0'}, {h: 'Mã rừng', w: 16}, {h: 'Chủ rừng', w: 28}, {h: 'Số phiếu cân', w: 12, al: 'right', f: 'n0'}, {h: 'Đã cập nhật biển', w: 14, al: 'right', f: 'n0'}, {h: 'Tỷ lệ', w: 10, al: 'right', f: 'pct'}, {h: 'Khối lượng đã cập nhật (tấn)', w: 18, al: 'right', f: 'n3'}],
          rows, foot: ['', 'TỔNG CỘNG', '', tot, nPh, tot ? round(nPh / tot * 100, 1) : 0, klAll]},
        {heading: 'II. Chi tiết phiếu cân đã cập nhật biển số xe (theo lô, ngày cân)', cols: [{h: 'STT', w: 5, al: 'center', f: 'n0'}, {h: 'Mã rừng', w: 12}, {h: 'Chủ rừng', w: 18}, {h: 'Số phiếu cân', w: 14}, {h: 'Ngày cân', w: 10, f: 'date'}, {h: 'Biển số cũ', w: 12, al: 'center'}, {h: 'Biển số mới', w: 12, al: 'center'}, {h: 'Khối lượng (tấn)', w: 10, al: 'right', f: 'n3'}, {h: 'Thời điểm cập nhật', w: 14}, {h: 'Nguồn', w: 12}],
          rows: det, foot: ['', 'CỘNG', '', '', '', '', '', round(det.reduce((s, r) => s + r[7], 0), 3), '', '']}],
      notes};
  }

  /* ---- 7. Danh sách lao động theo lô rừng ---- */
  const ageOn = (sinh, ref) => { const a = dateKey(sinh), b = dateKey(ref); return (a && b) ? Math.floor(b / 10000) - Math.floor(a / 10000) - (b % 10000 < a % 10000 ? 1 : 0) : null; };
  function laoDong(recs, o) {
    const sorted = recs.slice().sort((a, b) => byName(a.maRung, b.maRung)), ref = o.today || '';
    const POS = ['Tổ trưởng', 'Công nhân khai thác', 'Công nhân cưa'];
    const det = [], sum = [], minors = [], bad = [];
    sorted.forEach(r => {
      const L = (r.ncList || []).slice().sort((a, b) => (/^tổ trưởng/i.test(b.vaiTro || '') ? 1 : 0) - (/^tổ trưởng/i.test(a.vaiTro || '') ? 1 : 0) || String(a.stt).localeCompare(String(b.stt), 'vi', {numeric: true}));
      const cnt = {}; L.forEach(x => { const k = x.chucDanh || '(chưa có chức danh)'; cnt[k] = (cnt[k] || 0) + 1; });
      const nMin = L.filter(x => { const y = ageOn(x.ngaySinh, r.tuNgay && dateKey(r.tuNgay) ? r.tuNgay : ref); return y != null && y < 18; }).length;
      sum.push([sum.length + 1, r.maRung, r.chuRung, L.length, cnt['Tổ trưởng'] || 0, cnt['Công nhân khai thác'] || 0, cnt['Công nhân cưa'] || 0, L.length - POS.reduce((n, k) => n + (cnt[k] || 0), 0), nMin]);
      L.forEach(x => {
        const y = ageOn(x.ngaySinh, r.tuNgay && dateKey(r.tuNgay) ? r.tuNgay : ref);
        det.push([det.length + 1, r.maRung, r.chuRung, (x.danhXung ? x.danhXung + ' ' : '') + x.ten, x.vaiTro, x.chucDanh, x.ngaySinh, y == null ? '' : y, x.cccd, x.diaChi, x.ngayCap, x.noiCap, typeof x.rate === 'number' ? x.rate : '', r.donVi || '']);
        if (y != null && y < 18) minors.push([minors.length + 1, r.maRung, x.ten, x.ngaySinh, y]);
        if (!D.isValid(x.ngaySinh) || !/^\d{12}$/.test(String(x.cccd || ''))) bad.push([bad.length + 1, r.maRung, x.ten, !D.isValid(x.ngaySinh) ? 'Ngày sinh thiếu hoặc không có thật' : 'CCCD không đủ 12 chữ số']);
      });
    });
    const total = det.length, tt = sum.reduce((n, r) => n + r[4], 0);
    const notes = []; if (!total) notes.push('Chưa có nhân công nào. Nạp file nhân công ở tab Nhân công của từng lô.');
    if (minors.length) notes.push('Có ' + minors.length + ' người dưới 18 tuổi (tính tại ngày bắt đầu khai thác hoặc ngày lập báo cáo): không được ký hợp đồng lao động hoặc giấy ủy quyền.');
    const noTT = sorted.filter(r => (r.ncList || []).length && !(r.ncList || []).some(x => /^tổ trưởng/i.test(x.vaiTro || ''))).map(r => r.maRung); if (noTT.length) notes.push('Lô chưa có tổ trưởng: ' + noTT.join(', ') + '.');
    return {id: 'laodong', title: 'BÁO CÁO DANH SÁCH LAO ĐỘNG THEO LÔ RỪNG', orient: 'landscape', period: 'Tính đến ngày ' + (o.today || ''),
      kpis: [{label: 'Số lô có lao động', value: sum.filter(r => r[3]).length, f: 'n0'}, {label: 'Tổng số lao động', value: total, f: 'n0'}, {label: 'Số tổ trưởng', value: tt, f: 'n0'}, {label: 'Người dưới 18 tuổi', value: minors.length, f: 'n0'}],
      sections: [
        {heading: 'I. Tổng hợp theo lô rừng', cols: [{h: 'STT', w: 5, al: 'center', f: 'n0'}, {h: 'Mã rừng', w: 14}, {h: 'Chủ rừng', w: 24}, {h: 'Số lao động', w: 10, f: 'n0'}, {h: 'Tổ trưởng', w: 9, f: 'n0'}, {h: 'Công nhân khai thác', w: 12, f: 'n0'}, {h: 'Công nhân cưa', w: 11, f: 'n0'}, {h: 'Vị trí khác', w: 9, f: 'n0'}, {h: 'Dưới 18 tuổi', w: 9, f: 'n0'}],
          rows: sum, foot: ['', 'TỔNG CỘNG', '', total, tt, sum.reduce((n, r) => n + r[5], 0), sum.reduce((n, r) => n + r[6], 0), sum.reduce((n, r) => n + r[7], 0), minors.length]},
        {heading: 'II. Danh sách lao động theo lô', cols: [{h: 'STT', w: 5, al: 'center', f: 'n0'}, {h: 'Mã rừng', w: 8}, {h: 'Chủ rừng', w: 11}, {h: 'Họ và tên', w: 14}, {h: 'Vai trò', w: 8}, {h: 'Chức danh', w: 10}, {h: 'Ngày sinh', w: 10, f: 'date'}, {h: 'Tuổi', w: 5, f: 'n0'}, {h: 'CCCD', w: 13}, {h: 'Địa chỉ thường trú', w: 11}, {h: 'Ngày cấp CCCD', w: 10, f: 'date'}, {h: 'Nơi cấp CCCD', w: 8}, {h: 'Đơn giá', w: 8, f: 'n0'}, {h: 'Đơn vị giá', w: 6}],
          rows: det, foot: ['', 'TỔNG CỘNG', '', total, '', '', '', '', '', '', '', '', '', '']},
        ...(bad.length ? [{heading: 'III. Hồ sơ lao động cần bổ sung', note: 'Ngày sinh thiếu hoặc không có thật, hoặc CCCD không đủ 12 chữ số: sửa ở tab Nhân công rồi nạp lại.', cols: [{h: 'STT', w: 6, al: 'center', f: 'n0'}, {h: 'Mã rừng', w: 16}, {h: 'Họ và tên', w: 24}, {h: 'Vấn đề', w: 40}], rows: bad, foot: ['', 'Cộng', '', bad.length + ' mục']}] : [])],
      notes};
  }

  /* ---- 8. Danh sách xe vận chuyển theo lô rừng (kèm số chuyến, khối lượng theo phiếu cân) ---- */
  const plateKey = v => String(v || '').toUpperCase().replace(/[\s.\-]/g, '');
  function danhSachXe(recs, o) {
    const sorted = recs.slice().sort((a, b) => byName(a.maRung, b.maRung));
    const det = [], sum = [], unknown = [];
    sorted.forEach(r => {
      const pcs = pcOf(r, o), by = {}; pcs.forEach(p => { const k = plateKey(p.bienSo); (by[k] = by[k] || {n: 0, t: 0}).n++; by[k].t += kt(p); });
      const X = (r.dxList || []).slice().sort((a, b) => byName(a.bienSo, b.bienSo)); const known = new Set(X.map(x => plateKey(x.bienSo)));
      let nT = 0, tT = 0;
      X.forEach(x => {
        const m = by[plateKey(x.bienSo)] || {n: 0, t: 0}; nT += m.n; tT += m.t;
        const tx = x.nguoiKy === 'Tài xế';
        det.push([det.length + 1, r.maRung, r.chuRung, x.bienSo, x.loaiXe || '', x.chuXe, x.nguoiKy || 'Chủ xe', tx ? x.taiXe : '', tx ? x.cccdTx : x.cccd, x.sdt || '', x.hanBH || '', x.hanGplx || '', m.n, round(m.t, 3)]);
      });
      Object.keys(by).filter(k => k && !known.has(k)).forEach(k => unknown.push([unknown.length + 1, r.maRung, k, by[k].n, round(by[k].t, 3)]));
      sum.push([sum.length + 1, r.maRung, r.chuRung, X.length, nT, round(tT, 3)]);
    });
    const nXe = det.length, nT = det.reduce((n, r) => n + r[12], 0), tT = round(det.reduce((n, r) => n + r[13], 0), 3);
    const notes = []; if (rangeNote(o)) notes.push(rangeNote(o));
    if (!nXe) notes.push('Chưa có xe nào. Nạp file đội xe ở tab Vận chuyển của từng lô.');
    if (unknown.length) notes.push(unknown.length + ' biển số có trong phiếu cân nhưng chưa có trong danh sách xe của lô (xem mục III).');
    const noSdt = det.filter(r => !r[9]).length; if (noSdt) notes.push(noSdt + ' xe chưa có số điện thoại.');
    return {id: 'danhsachxe', title: 'BÁO CÁO DANH SÁCH XE VẬN CHUYỂN THEO LÔ RỪNG', orient: 'landscape', period: periodText(o.from, o.to),
      kpis: [{label: 'Số lô có xe', value: sum.filter(r => r[3]).length, f: 'n0'}, {label: 'Tổng số xe', value: nXe, f: 'n0'}, {label: 'Số chuyến (theo phiếu cân)', value: nT, f: 'n0'}, {label: 'Khối lượng (tấn)', value: tT, f: 'n3'}],
      sections: [
        {heading: 'I. Tổng hợp theo lô rừng', cols: [{h: 'STT', w: 6, al: 'center', f: 'n0'}, {h: 'Mã rừng', w: 16}, {h: 'Chủ rừng', w: 28}, {h: 'Số xe', w: 10, f: 'n0'}, {h: 'Số chuyến', w: 12, f: 'n0'}, {h: 'Khối lượng (tấn)', w: 16, f: 'n3'}],
          rows: sum, foot: ['', 'TỔNG CỘNG', '', nXe, nT, tT]},
        {heading: 'II. Danh sách xe', cols: [{h: 'STT', w: 5, al: 'center', f: 'n0'}, {h: 'Mã rừng', w: 8}, {h: 'Chủ rừng', w: 10}, {h: 'Biển kiểm soát', w: 9, al: 'center'}, {h: 'Loại xe', w: 7}, {h: 'Chủ xe', w: 11}, {h: 'Người ký HĐ vận chuyển', w: 8}, {h: 'Tên tài xế', w: 10}, {h: 'CCCD người ký', w: 13}, {h: 'SĐT', w: 11}, {h: 'Hạn bảo hiểm', w: 10, f: 'date'}, {h: 'Hạn GPLX', w: 10, f: 'date'}, {h: 'Số chuyến', w: 6, f: 'n0'}, {h: 'Khối lượng (tấn)', w: 8, f: 'n3'}],
          rows: det, foot: ['', 'TỔNG CỘNG', '', nXe, '', '', '', '', '', '', '', '', nT, tT]},
        ...(unknown.length ? [{heading: 'III. Biển số có trong phiếu cân nhưng chưa có trong danh sách xe', note: 'Thêm xe vào file đội xe của lô rồi nạp lại, hoặc sửa biển số phiếu cân.', cols: [{h: 'STT', w: 6, al: 'center', f: 'n0'}, {h: 'Mã rừng', w: 16}, {h: 'Biển số (đã chuẩn hóa)', w: 22}, {h: 'Số chuyến', w: 12, f: 'n0'}, {h: 'Khối lượng (tấn)', w: 16, f: 'n3'}], rows: unknown, foot: ['', 'Cộng', '', unknown.reduce((n, r) => n + r[3], 0), round(unknown.reduce((n, r) => n + r[4], 0), 3)]}] : [])],
      notes};
  }

  /* ---- 9. Đối chiếu bản tra cứu (Google Sheets / Excel): tọa độ, hồ sơ rừng, phiếu cân. Dữ liệu o.audit do tiến trình chính tính từ bản tra cứu đang dùng (src/lookup.js audit). ---- */
  function doiChieu(recs, o) {
    const a = o.audit, fold = s => String(s == null ? '' : s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/gi, 'd').toLowerCase();
    const words = fold(o.q || '').split(/\s+/).filter(Boolean), fl = o.flag || {};
    const keep = row => !words.length || words.every(w => fold(row.join(' ')).includes(w));
    const none = !a || !a.ok, G = x => (a && a.ok ? a[x] : []);
    const rowsOf = (list, fn) => list.map(fn).filter(keep).map((r, i) => [i + 1, ...r]);
    const KIND = {thieu: 'Thiếu tọa độ', sai: 'Tọa độ sai', thieuMa: 'Thiếu mã rừng'};
    const t1 = fl.onlyPhieu ? [] : rowsOf(G('rungThieuToaDo'), x => [x.ten, x.cccd, x.hd, x.maRung || '(chưa xác định)', KIND[x.kind] || '', x.diaChi, x.dong, x.soDongToaDo, x.lyDo]);
    const t5 = fl.onlyToaDo ? [] : rowsOf(G('phieuChuaXacDinhLo'), x => [x.ten, x.cccd, x.hd, x.loCoThe, 'HoSoKeo', x.dongKeo, x.soPhieu, x.tan, x.vd, x.lyDo]);
    const t2 = fl.onlyToaDo ? [] : rowsOf(G('phieuThieuHoSoRung'), x => [x.ten, x.cccd || '(trống)', x.hd || '(trống)', x.soPhieu, x.tan, x.tuNgay, x.denNgay, x.vd, x.goiY]);
    const t3 = fl.onlyPhieu || fl.onlyToaDo ? [] : rowsOf(G('toaDoThieuHoSoRung'), x => [x.ten, x.cccd, x.hd, x.maRung, x.soDongToaDo, x.goiY]);
    const t4 = fl.onlyPhieu || fl.onlyToaDo ? [] : rowsOf(G('rungChuaCoPhieu'), x => [x.ten, x.cccd, x.hd, x.maRung || '', x.diaChi, x.tinhTrang]);
    const phieu = G('phieuThieuHoSoRung').reduce((n, x) => n + x.soPhieu, 0), tan = round(G('phieuThieuHoSoRung').reduce((n, x) => n + x.tan, 0), 3);
    const notes = [];
    if (none) notes.push(a && a.noData ? 'Chưa có bản tra cứu. Vào Tra cứu Google Sheets, bấm Đồng bộ ngay hoặc nạp file Excel, rồi mở lại báo cáo này.' : 'Đang đọc bản tra cứu…');
    else { notes.push('Đối chiếu theo CCCD và mã hợp đồng giữa ba tab HoSoRung, ToaDoRung, HoSoKeo của bản tra cứu đang dùng (nạp lúc ' + (a.loadedAt ? a.loadedAt.replace('T', ' ').slice(0, 16) : '…') + '). Dữ liệu trên bảng tính gốc cần được sửa rồi đồng bộ lại.');
      if (words.length || fl.onlyPhieu || fl.onlyToaDo) notes.push('Báo cáo đang lọc theo từ khóa hoặc điều kiện riêng nên chỉ hiện phần khớp; KPI là toàn bộ bản tra cứu.'); }
    return {id: 'doichieu', title: 'BÁO CÁO ĐỐI CHIẾU BẢN TRA CỨU: TỌA ĐỘ – HỒ SƠ RỪNG – PHIẾU CÂN', orient: 'landscape', period: none ? '' : 'Bản tra cứu: ' + a.counts.HoSoRung + ' dòng HoSoRung, ' + a.counts.ToaDoRung + ' dòng ToaDoRung, ' + a.counts.HoSoKeo + ' dòng HoSoKeo',
      kpis: [{label: 'Rừng thiếu tọa độ', value: G('rungThieuToaDo').length, f: 'n0'}, {label: 'Phiếu cân thiếu hồ sơ rừng', value: phieu, f: 'n0'}, {label: 'Khối lượng phiếu thiếu hồ sơ (tấn)', value: tan, f: 'n3'}, {label: 'Rừng chưa có phiếu cân', value: G('rungChuaCoPhieu').length, f: 'n0'}, {label: 'Phiếu chưa xác định được lô', value: G('phieuChuaXacDinhLo').reduce((n, x) => n + x.soPhieu, 0), f: 'n0'}],
      sections: [
        {heading: 'I. Rừng (HoSoRung) thiếu tọa độ ở ToaDoRung hoặc tọa độ không dùng được', note: 'Hợp đồng có nhiều lô được kiểm tra từng lô (Mã rừng); lô có tọa độ không bị báo vì lô khác của cùng hợp đồng thiếu.', cols: [{h: 'STT', w: 6}, {h: 'Chủ rừng', w: 22}, {h: 'CCCD', w: 14}, {h: 'Mã hợp đồng', w: 11}, {h: 'Mã lô (Mã rừng)', w: 15}, {h: 'Loại lỗi', w: 12}, {h: 'Địa chỉ rừng', w: 24}, {h: 'Dòng HoSoRung', w: 9, f: 'n0'}, {h: 'Số dòng ToaDoRung', w: 9, f: 'n0'}, {h: 'Lý do', w: 34}], rows: t1},
        {heading: 'II. Phiếu cân (HoSoKeo) thiếu hồ sơ rừng ở HoSoRung', note: 'Gộp theo chủ rừng và mã hợp đồng ghi trên phiếu.', cols: [{h: 'STT', w: 6}, {h: 'Chủ rừng', w: 22}, {h: 'CCCD', w: 14}, {h: 'Mã hợp đồng', w: 12}, {h: 'Số phiếu cân', w: 9, f: 'n0'}, {h: 'Khối lượng (tấn)', w: 11, f: 'n3'}, {h: 'Từ ngày', w: 11}, {h: 'Đến ngày', w: 11}, {h: 'Ví dụ số phiếu', w: 24}, {h: 'Gợi ý', w: 32}], rows: t2},
        {heading: 'III. Phiếu cân chưa xác định được lô', note: 'Hợp đồng có từ 2 lô trở lên mà phiếu cân không ghi mã lô: phần mềm không tự gán lô. Cần ghi mã lô trên bảng tính hoặc chọn lô khi đưa phiếu vào hồ sơ.', cols: [{h: 'STT', w: 6}, {h: 'Chủ rừng', w: 20}, {h: 'CCCD', w: 14}, {h: 'Mã hợp đồng', w: 11}, {h: 'Các lô có thể', w: 22}, {h: 'Tab', w: 9}, {h: 'Dòng HoSoKeo', w: 14}, {h: 'Số phiếu cân', w: 9, f: 'n0'}, {h: 'Khối lượng (tấn)', w: 11, f: 'n3'}, {h: 'Ví dụ số phiếu', w: 22}, {h: 'Lý do', w: 30}], rows: t5},
        {heading: 'IV. Dòng tọa độ (ToaDoRung) thiếu hồ sơ rừng ở HoSoRung', cols: [{h: 'STT', w: 6}, {h: 'Chủ rừng', w: 24}, {h: 'CCCD', w: 14}, {h: 'Mã hợp đồng', w: 12}, {h: 'Mã rừng', w: 20}, {h: 'Số dòng ToaDoRung', w: 10, f: 'n0'}, {h: 'Gợi ý', w: 34}], rows: t3},
        {heading: 'V. Lô (HoSoRung) chưa có phiếu cân nào ở HoSoKeo', cols: [{h: 'STT', w: 6}, {h: 'Chủ rừng', w: 22}, {h: 'CCCD', w: 14}, {h: 'Mã hợp đồng', w: 12}, {h: 'Mã lô', w: 16}, {h: 'Địa chỉ rừng', w: 28}, {h: 'Tình trạng hợp đồng', w: 16}], rows: t4}],
      notes};
  }

  const REPORTS = [
    {id: 'dieuhanh', name: 'Tổng hợp điều hành', desc: 'Một trang cho lãnh đạo: số liệu chính theo chủ rừng và các vấn đề cần xử lý.', build: withUnit(dieuHanh, 'Đơn vị tính: diện tích ha; khối lượng tấn; tiến độ %')},
    {id: 'sanluong', name: 'Sản lượng khai thác theo rừng', desc: 'Diện tích, định mức, sản lượng dự kiến và thực tế theo phiếu cân; cảnh báo vượt định mức.', build: withUnit(sanLuong, 'Đơn vị tính: diện tích ha; định mức tấn/ha; sản lượng tấn')},
    {id: 'phieucan', name: 'Sổ theo dõi phiếu cân – vận chuyển', desc: 'Danh sách phiếu cân theo kỳ, tổng hợp theo rừng, biển số, ngày; phát hiện trùng phiếu.', build: withUnit(soPhieuCan, 'Đơn vị tính: khối lượng tấn (làm tròn 3 chữ số, theo phiếu cân ghi kg)')},
    {id: 'chacon', name: 'Bảng cha–con: chủ rừng – rừng – phiếu cân', desc: 'Chủ rừng (cha) là tổng các rừng (con), rừng là tổng các phiếu cân; có thể kèm từng phiếu.', build: withUnit(chaCon, 'Đơn vị tính: diện tích ha; khối lượng tấn')},
    {id: 'bienso', name: 'Phiếu cân đã cập nhật biển số xe', desc: 'Theo từng lô rừng: phiếu cân nào đã được cập nhật biển số xe mới (biển cũ, biển mới, thời điểm, nguồn).', build: withUnit(bienSoDoi, 'Đơn vị tính: khối lượng tấn; tỷ lệ %')},
    {id: 'laodong', name: 'Danh sách lao động theo lô', desc: 'Lao động của từng lô: vai trò, chức danh, ngày sinh, tuổi, CCCD, đơn giá; cảnh báo dưới 18 tuổi và thiếu thông tin.', build: withUnit(laoDong, 'Đơn vị tính: người; đơn giá theo cơ sở tính của lô (đồng/tấn, đồng/ha, đồng/công)')},
    {id: 'danhsachxe', name: 'Danh sách xe vận chuyển theo lô', desc: 'Xe của từng lô: biển số, loại xe, chủ xe, người ký, liên hệ, số chuyến và khối lượng theo phiếu cân.', build: withUnit(danhSachXe, 'Đơn vị tính: khối lượng tấn (theo phiếu cân)')},
    {id: 'doichieu', name: 'Đối chiếu bản tra cứu: tọa độ, hồ sơ rừng, phiếu cân', desc: 'Từ bản tra cứu Google Sheets: rừng thiếu tọa độ (HoSoRung với ToaDoRung), phiếu cân thiếu hồ sơ rừng (HoSoKeo với HoSoRung), tọa độ và rừng mồ côi.', build: withUnit(doiChieu, 'Đơn vị tính: khối lượng tấn; đối chiếu theo CCCD và mã hợp đồng')},
    {id: 'tiendo', name: 'Tiến độ hồ sơ và checklist FSC', desc: 'Tiến độ từng rừng và danh sách hạng mục còn thiếu để hoàn thiện hồ sơ.', build: withUnit(tienDo, 'Đơn vị tính: tiến độ %; số lượng theo từng cột')}
  ];

  /* Mô hình -> bảng dữ liệu phẳng (dùng cho Excel) */
  /* Chuỗi bắt đầu bằng = + - @ (hoặc tab/CR) sẽ bị Excel hiểu là công thức: thêm dấu ' để luôn là văn bản (chống chèn công thức). */
  const safeText = v => (typeof v === 'string' && /^[=+\-@\t\r]/.test(v) && !/^-?\d+([.,]\d+)?%?$/.test(v)) ? "'" + v : v;
  const toDate = v => { const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(v); return m ? new Date(Date.UTC(+m[3], +m[2] - 1, +m[1])) : v; };
  /* Mô hình -> bảng phẳng cho Excel. Trả về mảng dòng; thuộc tính phụ (meta) mô tả vị trí các bảng để áp bộ lọc tự động và nhóm dòng. */
  function toAoa(m, meta) {
    meta = meta || {};
    const a = [[meta.org || 'HAK GROUP'], [m.title], [m.period + (meta.scope ? ' · ' + meta.scope : '')], [m.unit || ''], ['Lập lúc ' + (meta.stamp || meta.today || '')], []];
    const tables = [];
    if (m.kpis.length) { a.push(['Chỉ tiêu tổng hợp']); m.kpis.forEach(k => a.push([k.label, k.value])); a.push([]); }
    m.sections.forEach(s => {
      a.push([s.heading]); const head = a.length; a.push(s.cols.map(c => c.h));
      s.rows.forEach((r, i) => a.push(r.map((v, k) => s.cols[k] && s.cols[k].f === 'date' ? toDate(v) : safeText(v))));
      tables.push({head, first: head + 1, last: head + s.rows.length, cols: s.cols.length, levels: s.levels || null});
      if (s.foot) a.push(s.foot.map(safeText));
      a.push([]);
    });
    m.notes.forEach(n => a.push([safeText('Ghi chú: ' + n)]));
    a.push([], ['Lập ngày ' + (meta.today || '')]);
    Object.defineProperty(a, 'tables', {value: tables, enumerable: false});
    return a;
  }

  return {REPORTS, chaCon, safeText, finalize, dateKey, fmtNum, fmtCell, toAoa, sanLuong, soPhieuCan, tienDo, dieuHanh, inRange, periodText};
})();
if (typeof module !== 'undefined' && module.exports) module.exports = HAKReports;
