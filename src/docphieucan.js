'use strict';
/* Đọc Excel và xử lý phiếu cân: chuẩn hóa nhân công, xe, phiếu cân; ghép phiếu với hợp đồng và xe vận chuyển; đối chiếu khối lượng BM-09/10.
 * Tách từ ui/app/03-doc-excel-phieu-can.js: mã giữ nguyên; mọi tên dùng từ phần còn lại của giao diện (cơ sở dữ liệu đang mở, tiện ích, các module khác)
 * đi qua đối tượng ctx do giao diện cấp (getter, đọc giá trị hiện tại lúc gọi). Kiểm thử đơn vị truyền ctx giả. */
(function (root) {
  const BKS = () => (typeof require === 'function' ? require('./bks.js') : root.HAKBks);   // một quy tắc chuẩn hóa BKS (src/bks.js)
  const SO = () => (typeof require === 'function' ? require('./so.js') : root.HAKSo);     // bộ đọc khối lượng dùng chung (src/so.js, lô 1)
  function create(ctx) {
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
            const keyOf = h => map[h] || (alias || {})[h] || ctx.H_LEGACY[h];
            const hasAll = row => req.every(n => row.some(h => keyOf(ctx.trim(h)) === map[n]));
            let h0 = 0; for (let r = 0; r < Math.min(aoa.length, 15); r++) if (hasAll(aoa[r])) { h0 = r; break; }   // tiêu đề thường ở dòng 1; file của công cụ in phiếu cân có tiêu đề ở dòng 4
            const heads = aoa[h0].map(h => ctx.trim(h));
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
                if (ctx.trim(line[idx[k]]) !== '') any = true;
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
      _row: o._row, maRung: ctx.trim(o.maRung), vaiTro: ctx.trim(o.vaiTro), stt: ctx.trim(o.stt), danhXung: ctx.trim(o.danhXung),
      ten: ctx.trim(o.ten), ngaySinh: ctx.normDate(o.ngaySinh), cccd: ctx.normCccd(o.cccd), ngayCap: ctx.normDate(o.ngayCap),
      noiCap: ctx.trim(o.noiCap), diaChi: ctx.trim(o.diaChi), chucDanh: ctx.trim(o.chucDanh), doi: ctx.trim(o.doi)
    });
    const noneVal = v => /^(khong|khong co|n\/a|na|-+|x)$/.test(ctx.trim(v).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').toLowerCase()) ? '' : v;
    const keyName = v => ctx.trim(v).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').toLowerCase();
    const normDX0 = o => ({
      _row: o._row, maRung: ctx.trim(o.maRung), stt: ctx.trim(o.stt), chuXe: ctx.trim(o.chuXe), ngaySinh: ctx.normDate(o.ngaySinh),
      cccd: ctx.normCccd(o.cccd), ngayCap: ctx.normDate(o.ngayCap), noiCap: ctx.trim(o.noiCap), diaChi: ctx.trim(o.diaChi),
      bienSo: ctx.trim(o.bienSo).toUpperCase(), cavet: ctx.normDate(o.cavet), loaiXe: ctx.trim(o.loaiXe), nguoiKy: ctx.normNK(o.nguoiKy),
      taiXe: ctx.trim(o.taiXe), ngaySinhTx: ctx.normDate(o.ngaySinhTx), cccdTx: ctx.normCccd(o.cccdTx), ngayCapTx: ctx.normDate(o.ngayCapTx),
      noiCapTx: ctx.trim(o.noiCapTx), diaChiTx: ctx.trim(o.diaChiTx), gplx: ctx.trim(o.gplx), hanGplx: ctx.normDate(o.hanGplx),
      hanBH: ctx.normDate(o.hanBH), kdTu: ctx.normDate(o.kdTu), kdDen: ctx.normDate(o.kdDen), sdt: ctx.trim(o.sdt), doiXe: ctx.trim(o.doiXe)
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
      if (typeof v === 'number') { const f = v - Math.floor(v); if (f < 1e-9 || !isFinite(v)) return ''; const t = Math.round(f * 86400) % 86400; return ctx.pad2(Math.floor(t / 3600)) + ':' + ctx.pad2(Math.floor(t % 3600 / 60)) + ':' + ctx.pad2(t % 60); }
      const t = ctx.trim(v), m = /(\d{1,2}):(\d{2})(?::(\d{2}))?/.exec(t); return m ? ctx.pad2(+m[1]) + ':' + m[2] + (m[3] ? ':' + m[3] : '') : /^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(t) ? '' : t;
    };
    /* Số tiền trong ô: bộ đọc chặt chẽ chung (src/money.js). Trống → null; số dương hợp lệ → số; còn lại → null kèm lý do ở giaLoi (không tự đoán) */
    const moneyCell = v => ctx.HAKMoney.positive(v);
    const normPC = o => {
      const S = SO(), c1 = S ? S.toDec(o.can1, {don: 'kg'}) : ctx.toDec(o.can1), c2 = S ? S.toDec(o.can2, {don: 'kg'}) : ctx.toDec(o.can2);
      let klKg = S ? S.toDec(o.klKg, {don: 'kg'}) : ctx.toDec(o.klKg);
      if (klKg == null && typeof c1 === 'number' && typeof c2 === 'number' && c1 > c2) klKg = c1 - c2;   // KL để trống: KL = Cân 1 − Cân 2 (như file mẫu in phiếu cân)
      let kl = typeof o.kl === 'number' ? (isFinite(o.kl) ? o.kl : 'x') : (S ? S.toDec(o.kl, {don: 'tan'}) : ctx.toDec(o.kl));
      if (kl === 0) kl = 0;   // -0 → +0 (===: -0 bằng 0)
      if (kl == null && typeof klKg === 'number' && isFinite(klKg) && klKg > 0) kl = Math.round(klKg) / 1000;   // chỉ điền kg: tấn = kg ÷ 1000
      if (typeof kl === 'number' && isFinite(kl) && kl > 0) kl = Math.round(kl * 1000) / 1000;   // khối lượng lưu chính xác đến kg: mọi nơi cộng ra cùng một số
      const lbl = 'Phiếu ' + (ctx.trim(o.soPhieu) || '(không số)'), giaLoi = [['donGia', 'cột ĐG_AD / Đơn giá'], ['donGiaTC', 'cột Đơn giá_TC'], ['thanhTien', 'cột Thành tiền']].map(([k, n]) => ctx.HAKMoney.problem(lbl + ', ' + n, o[k])).filter(Boolean);
      let donGia = moneyCell(o.donGia); if (donGia == null) donGia = moneyCell(o.donGiaTC);   // ĐG_AD; trống thì dùng Đơn giá_TC
      return {
        _row: o._row, maRung: ctx.trim(o.maRung), stt: ctx.trim(o.stt), ngay: ctx.normDate(o.ngay), ngay2: o.ngay2 == null || ctx.trim(o.ngay2) === '' ? '' : ctx.normDate(o.ngay2), gioCan1: timeCell(o.gioCan1), gioCan2: timeCell(o.gioCan2), bienSo: ctx.trim(o.bienSo).toUpperCase(),
        soPhieu: typeof o.soPhieu === 'number' ? String(Math.round(o.soPhieu)) : ctx.trim(o.soPhieu), can1: c1, can2: c2, klKg,
        kl, khachHang: ctx.trim(o.khachHang), diaChi: ctx.trim(o.diaChi), nguonGoc: ctx.trim(o.nguonGoc), soCT: ctx.trim(o.soCT), trangThai: ctx.trim(o.trangThai), donGia, thanhTien: moneyCell(o.thanhTien), giaLoi, noiGiao: ctx.trim(o.noiGiao), ghiChu: ctx.trim(o.ghiChu), doi: ctx.trim(o.doi)
      };
    };

    /* ========== Phiếu cân: khối lượng và tiền vận chuyển ========== */
    const bienKey = v => BKS().khoa(v);
    /* Quy tắc ngày lịch dùng chung (src/dates.js): 31/02/2026 và 29/02/2026 không có thật, 29/02/2028 có thật; ngày không có thật → 0 */
    const dateKey = v => ctx.HAKDates.key(v);
    const totalKg = rows => (typeof require === 'function' ? require('./dinhmuc.js') : root.HAKDinhMuc).tongPhieuKg(rows);   // một cách tính (src/dinhmuc.js)
    const fmtT = kg => { const [i, d] = (kg / 1000).toFixed(3).split('.'); return ctx.numSwap(ctx.fmtRaw(i) + ',' + d); };
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
      n = Math.round(n);   // lô 2 (T-04): số tiền đọc bằng chữ theo đồng (làm tròn), không còn “undefined” khi có phần lẻ
      if (!(n > 0)) return 'Không đồng.';
      const U = ['', ' nghìn', ' triệu', ' tỷ', ' nghìn tỷ', ' triệu tỷ'], parts = [];
      for (let x = n; x > 0; x = Math.floor(x / 1000)) parts.push(x % 1000);
      const out = [];
      for (let k = parts.length - 1; k >= 0; k--) if (parts[k]) out.push(words3(parts[k], k < parts.length - 1) + U[k]);
      const t = out.join(' ');
      return t.charAt(0).toUpperCase() + t.slice(1) + ' đồng chẵn.';
    }
    const PC_NGUONG_MAC_DINH = 1;   // % lệch tối đa giữa khối lượng thực tế và tổng phiếu cân khi chưa đặt ngưỡng riêng (cùng mức với cảnh báo ở Tổng quan)
    function checkPC(rec) {
      const errs = [], warns = [], state = {}, pc = rec.pc || [];
      const mark = (r, k, m) => { (k === 'err' ? errs : warns).push('Dòng ' + r._row + ': ' + m); if (k === 'err' || !state[r._row]) state[r._row] = k; };
      const keys = new Set(rec.dx.map(x => bienKey(x.bienSo))), seenP = new Map(), seenSo = new Map(), thieuKy = rec.hdvc ? doiXeThieuKy(rec) : new Set();
      /* phiếu GIỐNG HỆT phiếu ở lô khác (cùng số phiếu, ngày lịch, biển số): chặn BM-08, 09, 10, 14 ở mọi đường xuất; cùng số + ngày khác BKS chỉ là cảnh báo mềm (src/cheolo.js, lô 7b) */
      try { ctx.HAKCheoLo.phieuTrung(ctx.db, rec.id, rec.fid, pc, ctx.cheoCtx()).forEach(x => {
        if (x.khacBks) mark(x.p, 'warn', 'Phiếu ' + (x.p.soPhieu || '') + ' (' + x.p.ngay + ', BKS ' + (x.p.bienSo || 'trống') + ') có cùng số phiếu và ngày cân với phiếu ở lô ' + x.ma + ' (BKS ' + (x.bienKhac || 'trống') + '): kiểm tra có phải cùng một phiếu không');
        else mark(x.p, 'err', 'Phiếu ' + (x.p.soPhieu || '') + ' (' + x.p.ngay + ', ' + x.p.bienSo + ') giống hệt phiếu đã có ở lô ' + x.ma + ' (cùng số phiếu, ngày cân, biển số): một phiếu cân chỉ thuộc một lô');
      }); } catch (e) { /* không kiểm được chéo lô: bỏ qua */ }
      pc.forEach(r => {
        if (ctx.trim(r.doi) && rec.doi && rec.doi.length > 1 && !rec.doi.some(d => d.id === r.doiId) && !rec.doi.some(d => keyName(d.ten) === keyName(r.doi))) mark(r, 'err', 'Đội “' + ctx.trim(r.doi) + '” không có trong lô (tên đội ở tab Nhân công): sửa tên đội hoặc để trống ô Đội');
        { const d = thieuKy.size ? doiXeOfPc(rec, r) : null; if (d && d.hd && thieuKy.has(d.hd.id)) mark(r, 'err', 'Biển ' + r.bienSo + ' thuộc đội xe chưa có người ký (chủ xe hoặc tài xế): vào tab Vận chuyển chọn người ký cho đội xe này'); }
        if (r.maRung && r.maRung !== rec.info.maRung) mark(r, 'err', 'Mã rừng "' + r.maRung + '" khác lô đang mở (' + rec.info.maRung + '): để trống ô Mã rừng hoặc sửa cho đúng lô');
        if (!ctx.HAKDates.isValid(r.ngay)) mark(r, 'err', 'Phiếu ' + (r.soPhieu || '(không số)') + ': ' + ctx.HAKDates.why(r.ngay).replace(/^thiếu ngày$/, 'thiếu ngày cân'));
        const coXe = r.xeRowId && rec.dx.some(x => x.id === r.xeRowId);   // 3.0: phiếu đã chọn xe (ID dòng xe) — BKS ghi trên phiếu giữ nguyên dù khác
        if (!r.bienSo && !coXe) mark(r, 'err', 'Thiếu biển kiểm soát');
        else if (!coXe && !keys.has(bienKey(r.bienSo))) { if (r.hdvcId && (rec.hdvc || []).some(h => h.id === r.hdvcId)) mark(r, 'warn', 'Phiếu ' + (r.soPhieu || '') + ': BKS ' + r.bienSo + ' không khớp xe nào — chọn xe ở cột “Xe · hợp đồng” sau khi lưu'); else mark(r, 'err', 'Biển ' + r.bienSo + ' chưa có trong danh sách xe (tab Vận chuyển)'); }
        { const sai = typeof ctx.phieuSaiHd === 'function' ? ctx.phieuSaiHd(rec.dx, r) : null, f = ctx.curForest();   // 3.0: BKS chỉ khớp xe ở hợp đồng khác → chưa lưu được, xử lý ở khung xem trước
          if (sai) mark(r, 'err', 'Phiếu ' + (r.soPhieu || '') + ' (BKS ' + r.bienSo + '): Xe này thuộc hợp đồng ' + sai.map(id => f ? ctx.nhanHdId(f, id) : id).join(', ') + ' — chọn xe hợp lệ của hợp đồng ' + (f ? ctx.nhanHdId(f, r.hdvcId) : '') + ', thêm xe vào hợp đồng này, hoặc đổi hợp đồng đích (khung xem trước phiếu nạp)'); }
        if (ctx.trim(r.ngay2) && !ctx.HAKDates.isValid(r.ngay2)) mark(r, 'err', 'Phiếu ' + (r.soPhieu || '(không số)') + ': ngày cân 2 ' + ctx.HAKDates.why(r.ngay2));
        else ctx.HAKPhieuCan.ngay2Warn(r).forEach(m => mark(r, 'warn', 'Phiếu ' + (r.soPhieu || '(không số)') + ': ' + m));
        if (!r.soPhieu) mark(r, 'err', 'Thiếu số phiếu cân');
        else {   // một khóa phiếu cân (HAKBks.khoaPhieu = số phiếu chuẩn hóa + ngày): trùng hẳn thì chặn, cùng số khác ngày thì chỉ cảnh báo
          const kp = BKS().khoaPhieu(r), so = BKS().soPhieu(r.soPhieu), tenHd = x => { const f = ctx.curForest(); return x.hdvcId && f ? ' ở ' + ctx.nhanHdId(f, x.hdvcId) : ''; };
          if (kp && seenP.has(kp)) { const t = BKS().phieuDaCo([seenP.get(kp)], r)[0] || seenP.get(kp); mark(r, 'err', 'Số phiếu cân ' + r.soPhieu + ' trùng với dòng ' + t._row + tenHd(t) + ' (cùng số phiếu và cùng ngày cân ' + r.ngay + '): một phiếu cân chỉ nhập một lần; xóa dòng trùng hoặc sửa số phiếu / ngày nếu là chuyến khác'); }
          else {
            if (kp) { const t = seenSo.get(so); if (t) mark(r, 'warn', 'Phiếu ' + r.soPhieu + ' ngày ' + r.ngay + ': cùng số phiếu với dòng ' + t._row + tenHd(t) + ' (ngày ' + t.ngay + '). Cùng số phiếu khác ngày là hợp lệ; kiểm tra đúng là hai chuyến khác nhau'); if (!t) seenSo.set(so, r); seenP.set(kp, r); }
          }
        }
        const canDao = typeof r.can1 === 'number' && typeof r.can2 === 'number' && r.can1 > 0 && r.can2 > 0 && r.can1 <= r.can2;
        if (canDao) mark(r, 'err', 'Cân lần 1 phải lớn hơn cân lần 2 (hiệu là khối lượng hàng)');
        if (r.kl == null) { if (!canDao) mark(r, 'err', 'Thiếu khối lượng'); }
        else if (r.kl === 'x' || !(r.kl > 0)) mark(r, 'err', 'Khối lượng không hợp lệ');
        else if (typeof r.kl === 'number' && r.kl > ((SO() && SO().MAX_TAN_CHUYEN) || 60)) mark(r, 'warn', 'Khối lượng ' + ctx.fmt(r.kl) + ' tấn/chuyến vượt ngưỡng 60 tấn: kiểm tra lại đơn vị (tấn hay kg)');
        (r.giaLoi || []).forEach(m => mark(r, 'err', m + ' (sửa hoặc để trống ô này rồi nạp lại; giá trị đã lưu không bị đổi)'));
        [['can1', 'Cân lần 1'], ['can2', 'Cân lần 2'], ['klKg', 'Khối lượng (kg)']].forEach(([k, label]) => { if (r[k] === 'x' || (typeof r[k] === 'number' && r[k] < 0)) mark(r, 'err', label + ' phải là số không âm'); });
        if (typeof r.klKg === 'number' && typeof r.kl === 'number' && r.klKg > 0 && Math.abs(r.klKg / 1000 - r.kl) > 0.0005) mark(r, 'warn', 'Khối lượng kg (' + ctx.fmt(r.klKg) + ') và tấn (' + fmtT(Math.round(r.kl * 1000)) + ') không khớp nhau');
        if (typeof r.can1 === 'number' && typeof r.can2 === 'number' && typeof r.klKg === 'number' && r.klKg > 0 && !canDao && Math.abs((r.can1 - r.can2) - r.klKg) > 1) mark(r, 'warn', 'Khối lượng kg không bằng chênh lệch cân lần 1 và cân lần 2');
      });
      /* đối chiếu khối lượng khai thác với tổng phiếu cân (mục tiêu “nhất quán số liệu” của QT-FSC-01): ngưỡng người dùng đặt (pcNguong, %) áp dụng cho cả số dự kiến;
       * không đặt ngưỡng thì vẫn đối chiếu KHỐI LƯỢNG THỰC TẾ (số ghi vào BM-08, BM-14) với ngưỡng mặc định PC_NGUONG_MAC_DINH %, để biên bản không ghi khác tổng phiếu cân mà không ai biết */
      const ngDat = parseFloat(String((rec.exp || {}).pcNguong || '').replace(',', '.')), vol = ctx.volumeOf(rec.info);
      const ng = ngDat > 0 ? ngDat : (vol && vol.src === 'thực tế' ? PC_NGUONG_MAC_DINH : 0);
      if (pc.length && ng > 0 && vol) {
        const kg = totalKg(pc), lech = Math.abs(kg / 1000 - vol.v) / vol.v * 100;
        if (lech > ng) warns.push('Tổng khối lượng phiếu cân ' + fmtT(kg) + ' tấn lệch ' + lech.toFixed(1) + '% so với khối lượng khai thác ' + vol.src + ' ' + fmtT(Math.round(vol.v * 1000)) + ' tấn (ngưỡng ' + ng + '%' + (ngDat > 0 ? '' : ' mặc định; đổi ở Xuất hồ sơ → Cảnh báo lệch khối lượng') + '): kiểm tra lại khối lượng thực tế hoặc phiếu cân');
      }
      return {errs, warns, state};
    }
    /* phiếu cân của lô sắp theo ngày (sắp ổn định) và khóa biển số: dựng MỘT lần cho mỗi mảng phiếu và phiên bản dữ liệu (B7) — lọc sau khi sắp cho cùng thứ tự như sắp sau khi lọc */
    const pcSapNho = new WeakMap();
    function pcSapTheoNgay(pc) {
      const c = pcSapNho.get(pc); if (c && c.ver === ctx.dataVer && c.n === pc.length) return c.ds;
      const ds = pc.map((r, i) => ({r, i, d: dateKey(r.ngay), k: bienKey(r.bienSo)})).sort((a, b) => (a.d - b.d) || (a.i - b.i));
      pcSapNho.set(pc, {ver: ctx.dataVer, n: pc.length, ds}); return ds;
    }
    /* phiếu thuộc nhóm xe g: phiếu đã gắn hợp đồng (3.0) theo hợp đồng của phiếu; phiếu chưa gắn theo BKS của xe trong nhóm (như trước) */
    const pcThuocNhom = (r, g, ks, rec) => r.hdvcId && g.hd && (!rec || (rec.hdvc || []).some(h => h.id === r.hdvcId)) ? r.hdvcId === g.hd.id : ks.has(bienKey(r.bienSo));   // hợp đồng của phiếu không còn (vừa gộp / tách đội xe, chưa lưu): theo BKS
    const pcKhopXeVC = (p, x) => p.xeRowId ? p.xeRowId === x.id : !!bienKey(p.bienSo) && bienKey(p.bienSo) === bienKey(x.bienSo);
    function pcNgoaiPhamViVC(rec) {
      const pc = rec.pc || [];
      return nhoTheoPc(pc, 'ngoaiBM0910', JSON.stringify([rec.id, rec.fid]), () => {
        const lyDo = new Map();
        pc.forEach(p => {
          if (!ctx.HAKDates.isValid(p.ngay)) lyDo.set(p, 'Ngày cân không hợp lệ');
          else if (!Number.isFinite(p.kl) || Math.round(p.kl * 1000) <= 0) lyDo.set(p, 'Khối lượng không hợp lệ');
        });
        ctx.HAKCheoLo.phieuTrung(ctx.db, rec.id, rec.fid, pc, ctx.cheoCtx()).forEach(({p, ma, khacBks}) => {
          if (!khacBks && !lyDo.has(p)) lyDo.set(p, 'Phiếu trùng với lô ' + ma);
        });
        return lyDo;
      });
    }
    function tripsOf(rec, g) {
      const ks = new Set(g.xe.map(x => bienKey(x.bienSo)));
      const ngoai = pcNgoaiPhamViVC(rec);
      return pcSapTheoNgay(rec.pc || []).filter(({r}) => !ngoai.has(r) && pcThuocNhom(r, g, ks, rec) &&
        g.xe.filter(x => pcKhopXeVC(r, x)).length === 1).map(x => x.r);
    }
    function payVC(rec, g) {
      const cua = tripsOf(rec, g);
      const rows = g.xe.map(x => {
        const t = cua.filter(r => pcKhopXeVC(r, x)), kg = totalKg(t);
        return {bienSo: x.bienSo, n: t.length, kg, tien: Math.round(kg * g.donGia / 1000)};
      }).filter(r => r.n);
      return {rows, n: rows.reduce((a, r) => a + r.n, 0), kg: rows.reduce((a, r) => a + r.kg, 0), tien: rows.reduce((a, r) => a + r.tien, 0)};
    }
    /* Tên một đội xe để so với cột “Đội xe” của file: tên đội xe đã đặt, tên đơn vị vận chuyển (doanh nghiệp) hoặc tên người ký (chủ xe / tài xế) */
    const hdTenKhop = (F, h, ten) => ctx.HAKModel.hdTenKhop(F, h, ten);
    /* Phiếu cân → xe (khớp biển số) → đội xe (hợp đồng vận chuyển) của lô. Trả {hd, xe} hoặc null khi biển không thuộc xe nào của lô; lô cũ chưa có hdvc thì hd = null */
    function doiXeOfPc(rec, r) {
      const x = (r.xeRowId && (rec.dx || []).find(v => v.id === r.xeRowId)) || (rec.dx || []).find(v => bienKey(v.bienSo) === bienKey(r.bienSo)), hId = r.hdvcId || (x && x.hdvcId);   // 3.0: theo xe / hợp đồng đã gắn của phiếu
      if (!x && !hId) return null;
      return {xe: x || null, hd: (rec.hdvc || []).find(h => h.id === hId) || null};
    }
    /* tên đội xe để hiện ở bảng phiếu cân: đơn vị vận chuyển / người ký của đội xe */
    function doiXeTen(rec, d) {
      if (!d || !d.hd) return '';
      const h = d.hd, gs = typeof ctx.groupsDX === 'function' ? ctx.groupsDX(rec) : [], g = gs.find(x => x.hd === h);
      return g ? g.ten : (h.ben && h.ben.ten) || h.ten || '';
    }
    /* đội xe chưa có người ký: hợp đồng theo người ký mà trong đội không xác định được chủ xe / tài xế ký (src/model.js signerOf) */
    function doiXeThieuKy(rec) {
      const F = {dx: rec.dx || [], hdvc: rec.hdvc || []}, out = new Set();
      (rec.hdvc || []).forEach(h => { if (h.donViId) return; const xs = ctx.HAKModel.xeOf(F, h); if (xs.length && !ctx.HAKModel.signerOf(xs, h.key)) out.add(h.id); });
      return out;
    }
    /* Giấy tờ xe của một đội xe so với NGÀY CỦA TỪNG PHIẾU CÂN (src/giayto.js): phiếu chạy khi kiểm định, bảo hiểm hoặc GPLX đã hết hạn chặn BM-09 và BM-10 của đội xe đó */
    /* nhớ tạm theo (mảng phiếu cân, phiên bản dữ liệu): kết quả tính từ phiếu cân của một đội xe không đổi khi dữ liệu không đổi (B7) */
    const pcTheoDoiNho = new WeakMap();
    function nhoTheoPc(pc, ten, khoa, fn) {
      let c = pcTheoDoiNho.get(pc); if (!c || c.ver !== ctx.dataVer || c.n !== pc.length) { c = {ver: ctx.dataVer, n: pc.length, m: new Map()}; pcTheoDoiNho.set(pc, c); }
      const k = ten + '|' + khoa; if (c.m.has(k)) return c.m.get(k);
      const v = fn(); c.m.set(k, v); return v;
    }
    const khoaXe = g => JSON.stringify(g.xe.map(x => [String(x.bienSo || ''), x.kdDen || '', x.hanBH || '', x.hanGplx || '', x.taiXe || '']));
    const hanLoiOf = (rec, g) => nhoTheoPc(rec.pc || [], 'han', khoaXe(g), () => ctx.HAKGiayTo.quaHan(g.xe, tripsOf(rec, g)));
    const groupsPC = (rec, groups = ctx.groupsDX(rec)) => groups.filter(g => tripsOf(rec, g).length && !hanLoiOf(rec, g).length);

    /* Đối chiếu cùng phạm vi hợp đồng và quy tắc ghép xe mà BM-09/10 đang dùng. */
    function doiChieuPcVanChuyen(rec, groups = ctx.groupsDX(rec)) {
      const pc = rec.pc || [], ngoai = pcNgoaiPhamViVC(rec);
      const nhom = groups.map(g => ({g, ks: new Set(g.xe.map(x => bienKey(x.bienSo)))}));
      const thieuKy = doiXeThieuKy(rec), daGhep = [], canSua = [], hetHan = [], ngoaiPhamVi = [];
      pc.forEach((p, index) => {
        if (ngoai.has(p)) { ngoaiPhamVi.push({p, index, hdId: p.hdvcId, lyDo: ngoai.get(p), ngoai: true}); return; }
        const list = nhom.filter(({g, ks}) => pcThuocNhom(p, g, ks, rec)), g = list[0]?.g;
        const xe = g ? g.xe.filter(x => pcKhopXeVC(p, x)) : [];
        const hdId = (g && g.hd && g.hd.id) || p.hdvcId || '';
        const lyDo = list.length > 1 ? 'Phiếu khớp nhiều hợp đồng'
          : !g ? (p.hdvcId && (rec.hdvc || []).some(h => h.id === p.hdvcId) ? 'Hợp đồng chưa có xe' : 'Chưa xác định hợp đồng vận chuyển')
          : xe.length !== 1 ? (xe.length ? 'BKS khớp nhiều xe trong hợp đồng' : 'Chưa ghép xe trong hợp đồng')
          : thieuKy.has(hdId) ? 'Hợp đồng chưa có người ký' : '';
        if (lyDo) canSua.push({p, index, hdId, lyDo});
        else if (hanLoiOf(rec, g).length) hetHan.push({p, index, hdId, lyDo: 'Hợp đồng bị chặn do giấy tờ xe hết hạn'});
        else daGhep.push(p);
      });
      return {pc, daGhep, canSua, hetHan, ngoaiPhamVi};
    }
    return {PC_NGUONG_MAC_DINH, VN_D, bienKey, checkPC, dateKey, doiChieuPcVanChuyen, doiXeOfPc, doiXeTen, doiXeThieuKy, fmtT, groupsPC, hanLoiOf, hdTenKhop, keyName, khoaXe, moneyCell, moneyWords, nhoTheoPc, noneVal, normDX, normDX0, normNC, normPC, parseSheet, payVC, pcKhopXeVC, pcNgoaiPhamViVC, pcSapNho, pcSapTheoNgay, pcTheoDoiNho, pcThuocNhom, timeCell, totalKg, tripsOf, words3};
  }
  const api = {create, TEN_NGOAI: ["HAKCheoLo","HAKDates","HAKGiayTo","HAKModel","HAKMoney","HAKPhieuCan","H_LEGACY","cheoCtx","curForest","dataVer","db","fmt","fmtRaw","groupsDX","nhanHdId","normCccd","normDate","normNK","numSwap","pad2","phieuSaiHd","toDec","trim","volumeOf"]};
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.HAKDocPhieuCan = api;
})(typeof self !== 'undefined' ? self : this);
