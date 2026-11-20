/* Cấu trúc dữ liệu bảng mẹ – bảng con (bản 2.0, docs/THIET_KE_BANG_ME_CON.md).
 * Lưu dạng QUAN HỆ trong một lô: bảng con giữ khóa của bảng mẹ (như khóa ngoại), không lồng mảng.
 *
 * GIAI ĐOẠN 3 — ĐỘI KHAI THÁC:
 *   lô.doi = [{id, ten, hinhThuc: {hinhThucLuong, moHinhKy, donGiaTan, donGiaHa, donGiaNgay, donGia, ngayBDLD}, dienTich (null = mặc định), exp: {số/ngày HĐ khai thác, ủy quyền, nghiệm thu, kỳ thanh toán}}]
 *   lô.nc[i].doiId = id đội (bảng con “Nhân công” của đội); chấm công lô.cc theo người nên tự thuộc đội của người đó.
 *   Các trường của đội KHÔNG còn nằm ở lô.info / lô.exp (một nguồn duy nhất).
 * Hàm thuần, dùng chung ở giao diện (nhúng khi build), tiến trình chính và kiểm thử Node.
 *
 * Bất biến: lô cũ (1.4.x) sau khi chuẩn hóa rồi dựng lại dạng cũ (legacyForest) giống hệt ban đầu, và hồ sơ xuất ra không đổi.
 * ensureForest chạy lại không đổi gì. */
(function (root) {
  const NL = () => (typeof require === 'function' ? require('./nhaplieu.js') : root.HAKNhapLieu);   // quy tắc CCCD duy nhất (src/nhaplieu.js, phiếu #14): 9 hoặc 12 chữ số
  'use strict';
  const clone = x => x === undefined ? undefined : JSON.parse(JSON.stringify(x));
  const has = (o, k) => !!o && Object.prototype.hasOwnProperty.call(o, k);
  const trim = s => String(s == null ? '' : s).replace(/\s+/g, ' ').trim();
  const fold = s => trim(s).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();
  const tenKey = s => trim(s).normalize('NFC').toLowerCase();   // lô 7b (T-16): so tên đội / đội xe bằng NFC + gộp khoảng trắng + không phân biệt hoa thường nhưng GIỮ DẤU ("Đội Hà" ≠ "Đội Hạ")
  const isTT = r => /^tổ trưởng/i.test((r && r.vaiTro) || '');

  /* trường của ĐỘI (trước nằm ở thông tin rừng / thông số xuất của lô) */
  const DOI_INFO = ['hinhThucLuong', 'moHinhKy', 'donGiaTan', 'donGiaHa', 'donGiaNgay', 'donGia', 'ngayBDLD'];
  const DOI_EXP = ['soKT', 'uqSo', 'uqNgay', 'uqThuLao', 'ntSo', 'ntNgay', 'ntDaTT', 'tuNgayTT', 'denNgayTT', 'hdPhuCap', 'hdNangLuong'];
  const pick = (o, keys) => { const out = {}; keys.forEach(k => { if (has(o, k)) out[k] = clone(o[k]); }); return out; };

  /* Chia nhân công thành đội đúng như bản cũ (src/doi.js):
   *  - trực tiếp (không có hợp đồng giao khoán) hoặc 0–1 Tổ trưởng: một đội gồm mọi người;
   *  - giao khoán, nhiều Tổ trưởng: mỗi Tổ trưởng một đội theo cột Đội; người ghi đội không có Tổ trưởng → CHƯA THUỘC ĐỘI NÀO (bản cũ báo lỗi, bản mới cũng báo).
   * Trả [{ten, idx: [chỉ số dòng]}] và danh sách chỉ số chưa thuộc đội. */
  function splitTeams(nc, direct) {
    const tts = nc.map((r, i) => ({r, i})).filter(x => isTT(x.r));
    if (direct || tts.length <= 1) return {teams: [{ten: tts.length ? trim(tts[0].r.doi) : '', idx: nc.map((_, i) => i)}], orphans: []};
    const teams = [], byName = new Map(), orphans = [];
    tts.forEach(t => { const k = fold(t.r.doi), d = {ten: trim(t.r.doi), idx: [t.i]}; teams.push(d); if (k && !byName.has(k)) byName.set(k, d); });
    nc.forEach((r, i) => { if (isTT(r)) return; const d = byName.get(fold(r.doi)); if (d) d.idx.push(i); else orphans.push(i); });
    return {teams, orphans};
  }

  /* Chuẩn hóa một lô sang cấu trúc có ĐỘI. Lô đã có doi: chỉ bổ sung cho dòng nhân công thiếu doiId (lô một đội → đội đó; nhiều đội → '' = chưa thuộc đội). */
  function ensureDoi(f) {
    if (!f || typeof f !== 'object') return clone(f);
    const out = clone(f);
    if (Array.isArray(out.doi) && out.doi.length) {
      const nc = Array.isArray(out.nc) ? out.nc.filter(Boolean) : [];
      if (nc.length && nc.every(r => !has(r, 'doiId'))) {
        /* thay CẢ danh sách (nhập Excel cho cả lô): chia đội theo cột Đội như bản cũ; đội cùng tên (hoặc cùng vị trí) giữ nguyên id, hình thức, số văn bản */
        const d0 = out.doi[0], sp = splitTeams(nc, (d0.hinhThuc || {}).moHinhKy === 'tructiep'), used = new Set();
        const doi = sp.teams.map((t, k) => {
          let d = out.doi.find(x => !used.has(x.id) && fold(x.ten) && fold(x.ten) === fold(t.ten)) || (out.doi[k] && !used.has(out.doi[k].id) && !fold(out.doi[k].ten) ? out.doi[k] : null);   // đội chưa đặt tên: dùng lại theo vị trí
          if (!d) { d = {id: '', ten: t.ten, hinhThuc: clone(d0.hinhThuc) || {}, dienTich: null, exp: {}}; }
          else if (!trim(d.ten) && t.ten) d = Object.assign({}, d, {ten: t.ten});
          if (d.id) used.add(d.id);
          return d;
        });
        doi.filter(d => !d.id).forEach(d => { let k = 1; while (used.has('doi' + k)) k++; d.id = 'doi' + k; used.add(d.id); });
        out.doi = doi;
        sp.teams.forEach((t, k) => t.idx.forEach(i => { nc[i].doiId = doi[k].id; }));
        sp.orphans.forEach(i => { nc[i].doiId = ''; });
        return out;
      }
      /* thêm dòng lẻ: theo tên ở cột Đội nếu khớp đội; lô một đội → đội đó; còn lại chưa thuộc đội */
      nc.forEach(r => { if (has(r, 'doiId')) return; const m = fold(r.doi) && out.doi.find(d => fold(d.ten) === fold(r.doi)); r.doiId = m ? m.id : out.doi.length === 1 ? out.doi[0].id : ''; });
      return out;
    }
    const info = out.info || {}, exp = out.exp || {}, nc = Array.isArray(out.nc) ? out.nc : [];
    const hinhThuc = pick(info, DOI_INFO), dexp = pick(exp, DOI_EXP);
    const sp = splitTeams(nc, info.moHinhKy === 'tructiep');
    out.doi = sp.teams.map((t, k) => ({id: 'doi' + (k + 1), ten: t.ten, hinhThuc: clone(hinhThuc), dienTich: null, exp: clone(dexp)}));
    sp.teams.forEach((t, k) => t.idx.forEach(i => { nc[i].doiId = out.doi[k].id; }));
    sp.orphans.forEach(i => { nc[i].doiId = ''; });
    if (out.info) DOI_INFO.forEach(k => { delete out.info[k]; });
    if (out.exp) DOI_EXP.forEach(k => { delete out.exp[k]; });
    out._doiTu = {info: Object.keys(hinhThuc), exp: Object.keys(dexp)};   // khóa nào lấy từ dữ liệu cũ (để dựng lại dạng cũ đúng y nguyên)
    return out;
  }

  /* GIAI ĐOẠN 4 — ĐỘI XE và HỢP ĐỒNG VẬN CHUYỂN (bảng con của lô; xe là bảng con của đội xe), KÝ THEO ĐỘI XE như đội khai thác:
   *   lô.hdvc = [{id, ten, key, donViId, ben, cuoc, exp}] (mỗi đội xe một hợp đồng), lô.dx[i].hdvcId.
   *   - Xe đã thuộc đội xe thì GIỮ đội (đổi chủ xe / người ký của xe không tự chuyển đội); xe mới chưa có đội: vào đội có cùng người ký,
   *     không có thì lập đội mới cho người ký đó (dữ liệu cũ: mỗi người ký một đội, đúng như bản cũ gom xe theo người ký).
   *   - Người ký của đội: một người trong đội (key = CCCD chủ xe hoặc tài xế của một xe trong đội), hoặc một ĐƠN VỊ trong danh mục db.dmDonViVC
   *     (donViId, ben = thông tin chụp lại lúc chọn, ví dụ doanh nghiệp). Người ký không còn trong đội → người ký của xe đầu tiên.
   *   - cuoc (null = cước chung của lô) và exp (số HĐ, chi phí khác, số/ngày xác nhận khối lượng; trống = của lô): riêng từng đội xe.
   *   Đội xe không còn xe và không có gì riêng (tên, đơn vị, cước, số) thì bỏ. Thứ tự in = thứ tự xe đầu tiên. */
  const digits = v => String(v == null ? '' : v).replace(/\D/g, '');
  const vcKey = r => { const raw = trim(r && r.nguoiKy) === 'Tài xế' ? r.cccdTx : r.cccd; return String(digits(raw) || raw); };
  const HD_EXP = ['soVC', 'vcChiPhi', 'pcSo', 'pcNgay'];
  const hdRieng = h => !!(h && (trim(h.ten) || h.donViId || h.cuoc || Object.keys(h.exp || {}).length));
  /* người ký (cá nhân) của đội xe: xe trong đội có người ký trùng key (theo cột Người ký của xe), không có thì chủ xe / tài xế có CCCD trùng key */
  const signerOf = (xs, key) => {
    let r = xs.find(x => vcKey(x) === key); if (r) return {r, tx: trim(r.nguoiKy) === 'Tài xế'};
    r = xs.find(x => digits(x.cccd) && digits(x.cccd) === key); if (r) return {r, tx: false};
    r = xs.find(x => trim(x.taiXe) && digits(x.cccdTx) && digits(x.cccdTx) === key); if (r) return {r, tx: true};
    return null;
  };
  function ensureVC(out) {
    const dx = Array.isArray(out.dx) ? out.dx : [];
    const hd = Array.isArray(out.hdvc) ? out.hdvc : [];
    const byId = new Map(hd.map(h => [h.id, h])), used = new Set(hd.map(h => h.id));
    const nid = () => { let k = 1; while (used.has('hd' + k)) k++; used.add('hd' + k); return 'hd' + k; };
    dx.forEach(r => {
      if (!r || byId.get(r.hdvcId)) return;
      const k = vcKey(r);
      let h = hd.find(x => !x.donViId && x.key === k);
      if (!h) { h = {id: nid(), ten: '', key: k, donViId: null, ben: null, cuoc: null, exp: {}}; hd.push(h); byId.set(h.id, h); }
      r.hdvcId = h.id;
    });
    hd.forEach(h => { if (h.donViId) return; const xs = dx.filter(r => r && r.hdvcId === h.id); if (xs.length && !signerOf(xs, h.key)) h.key = vcKey(xs[0]); });
    const co = new Set(dx.map(r => r && r.hdvcId));
    out.hdvc = hd.filter(h => co.has(h.id) || hdRieng(h));
    return out;
  }
  const needsVC = f => {
    if (!Array.isArray(f.hdvc)) return true;
    const byId = new Map(f.hdvc.map(h => [h.id, h])), dx = Array.isArray(f.dx) ? f.dx : [];
    if (dx.some(r => r && !byId.get(r.hdvcId))) return true;
    const co = new Set(dx.map(r => r && r.hdvcId));
    return f.hdvc.some(h => (!co.has(h.id) && !hdRieng(h)) || (!h.donViId && co.has(h.id) && !signerOf(dx.filter(r => r && r.hdvcId === h.id), h.key)));
  };
  /* GIAI ĐOẠN 5 — PHIẾU CÂN GẮN ĐỘI (khối lượng thực hiện của đội = tổng phiếu cân của đội): lô.pc[i].doiId.
   * Lô một đội: phiếu tự thuộc đội đó. Lô nhiều đội: phiếu mới theo cột Đội (nếu khớp tên đội), không thì '' = chưa gán (gán ở bảng phiếu cân, có gán hàng loạt theo bộ lọc).
   * Phiếu cũ của lô nhiều đội: chưa gán → khối lượng đội vẫn tính như bản cũ cho đến khi gán đủ. */
  const needsPC = f => Array.isArray(f.pc) && f.pc.some(r => r && !has(r, 'doiId'));
  function ensurePC(out) {
    const doi = out.doi || [];
    (out.pc || []).forEach(r => { if (!r || has(r, 'doiId')) return; const m = trim(r.doi) && doi.find(d => fold(d.ten) === fold(r.doi)); r.doiId = doi.length === 1 ? doi[0].id : m ? m.id : ''; });
    return out;
  }
  /* ===== GIAI ĐOẠN 6: BỎ TRƯỜNG CŨ ĐÃ ĐƯỢC THAY (một chiều, chạy lại không đổi gì; SQLite v6 chạy hàm này cho mọi lô sau khi sao lưu file) =====
   *  - info.soDoi                : bỏ (số đội luôn lấy từ danh sách đội)
   *  - info.khoiLuong (nhập tay) : → info.klHoSoCu, CHỈ HIỂN THỊ ở Thông tin rừng (có nút Bỏ); còn số này thì khối lượng lô vẫn lấy số đó như trước nên bản in không đổi
   *  - info.klDoi (theo khóa Tổ trưởng) : → doi[].klHoSoCu của đội có Tổ trưởng đó; cùng quy tắc với khối lượng lô
   *  - đơn giá Tổ trưởng hồ sơ cũ (donGia, đ/tấn) : → bảng đơn giá theo vị trí của đội (donGiaTan['Tổ trưởng']) khi cách tính theo tấn và bảng chưa có giá này; bỏ donGia
   *  - vanChuyen.mode 'tanDoan' (bậc cự ly) : → 'tanKm'; dữ liệu bậc giữ ở vanChuyen.bacCu (không mất)
   *  - chữ ở cột Đội của nhân công / phiếu cân, cột Đội xe của xe : bỏ khi dòng đã có doiId / hdvcId (chỉ dùng lúc nhập Excel); dòng chưa thuộc đội giữ chữ để báo lỗi */
  /* tên có khớp một đội xe không: tên đội xe, tên đơn vị vận chuyển (doanh nghiệp) hoặc tên người ký (chủ xe / tài xế) — dùng cho cột Đội xe của file xe */
  const hdTenKhop = (F, h, ten) => {
    const k = fold(ten); if (!k || !h) return false;
    const sg = h.donViId ? null : signerOf(xeOf(F, h), h.key);
    return [h.ten, h.ben && h.ben.ten, sg && (sg.tx ? sg.r.taiXe : sg.r.chuXe)].some(v => v && fold(v) === k);
  };
  const CU_INFO = ['soDoi', 'donGia', 'klDoi', 'khoiLuong'];
  function coTruongCu(f) {
    if (!f || typeof f !== 'object') return false;
    const info = f.info || {};
    if (CU_INFO.some(k => has(info, k)) || (info.vanChuyen && info.vanChuyen.mode === 'tanDoan')) return true;
    if ((f.doi || []).some(d => d && d.hinhThuc && has(d.hinhThuc, 'donGia'))) return true;
    return (f.nc || []).some(r => r && has(r, 'doi') && r.doiId) || (f.pc || []).some(r => r && has(r, 'doi') && r.doiId) || (f.dx || []).some(r => r && has(r, 'doiXe') && r.hdvcId && (!trim(r.doiXe) || hdTenKhop({dx: f.dx, hdvc: f.hdvc || []}, (f.hdvc || []).find(h => h.id === r.hdvcId), r.doiXe)));
  }
  function xoaTruongCu(out) {
    if (!out || typeof out !== 'object') return out;
    const info = out.info || (out.info = {}), doi = Array.isArray(out.doi) ? out.doi : [];
    delete info.soDoi;
    if (has(info, 'khoiLuong')) { if (typeof info.khoiLuong === 'number' && info.khoiLuong > 0) info.klHoSoCu = info.khoiLuong; delete info.khoiLuong; }
    if (has(info, 'klDoi')) {
      const m = info.klDoi || {};
      doi.forEach(d => { const tt = (out.nc || []).find(r => r && r.doiId === d.id && isTT(r)), k = tt ? String(tt.cccd || tt.ten || '') : '', v = m[k]; if (typeof v === 'number' && isFinite(v) && v >= 0) d.klHoSoCu = v; });
      delete info.klDoi;
    }
    const chep = h => {
      if (!h || !has(h, 'donGia')) return;
      const g = h.donGia; if (typeof g === 'number' && g > 0 && (!h.hinhThucLuong || h.hinhThucLuong === 'sanluong')) { const t = Object.assign({}, h.donGiaTan); if (!(t['Tổ trưởng'] > 0)) t['Tổ trưởng'] = g; h.donGiaTan = t; }
      delete h.donGia;
    };
    chep(info); doi.forEach(d => chep(d && d.hinhThuc));
    if (info.vanChuyen && info.vanChuyen.mode === 'tanDoan') { const v = info.vanChuyen; v.mode = 'tanKm'; if (has(v, 'bac')) { v.bacCu = v.bac; delete v.bac; } }
    (out.nc || []).forEach(r => { if (r && has(r, 'doi') && r.doiId) delete r.doi; });
    (out.pc || []).forEach(r => { if (r && has(r, 'doi') && r.doiId) delete r.doi; });
    { const F = {dx: out.dx || [], hdvc: out.hdvc || []}; (out.dx || []).forEach(r => { if (r && has(r, 'doiXe') && r.hdvcId && (!trim(r.doiXe) || hdTenKhop(F, F.hdvc.find(h => h.id === r.hdvcId), r.doiXe))) delete r.doiXe; }); }   // tên không khớp đội xe nào: giữ chữ để báo lỗi dòng
    return out;
  }
  function ensureForest(f) { const out = ensureDoi(f); if (out && typeof out === 'object') { if (needsVC(out)) ensureVC(out); if (needsPC(out)) ensurePC(out); if (coTruongCu(out)) xoaTruongCu(out); } return out; }
  /* gán đội cho phiếu cân (chỉ số dòng); id '' = bỏ gán */
  function assignPc(f, idxs, id) {
    const out = ensureForest(f); if (id && !out.doi.some(d => d.id === id)) return {ok: false, error: 'Không có đội này'};
    let n = 0; idxs.forEach(i => { const r = out.pc && out.pc[i]; if (r && r.doiId !== id) { r.doiId = id; n++; } }); return {ok: true, f: out, n};
  }

  /* Dựng lại dạng 1.4.x của một lô (thông tin và số văn bản của đội đầu; bỏ doiId) — để kiểm chứng chuyển dữ liệu không mất gì */
  function legacyForest(f) {
    if (!f || !Array.isArray(f.doi)) return clone(f);
    const out = clone(f), d0 = f.doi[0] || {}, tu = f._doiTu || {info: Object.keys(d0.hinhThuc || {}), exp: Object.keys(d0.exp || {})};
    delete out.doi; delete out._doiTu;
    if (tu.info.length) { out.info = out.info || {}; tu.info.forEach(k => { if (has(d0.hinhThuc, k)) out.info[k] = clone(d0.hinhThuc[k]); }); }
    if (tu.exp.length) { out.exp = out.exp || {}; tu.exp.forEach(k => { if (has(d0.exp, k)) out.exp[k] = clone(d0.exp[k]); }); }
    if (Array.isArray(out.nc)) out.nc.forEach(r => { if (r) delete r.doiId; });
    delete out.hdvc; if (Array.isArray(out.dx)) out.dx.forEach(r => { if (r) delete r.hdvcId; });
    if (Array.isArray(out.pc)) out.pc.forEach(r => { if (r) delete r.doiId; });
    return out;
  }

  /* lô cần chuẩn hóa? (chưa có đội, hoặc có dòng nhân công thiếu doiId) — để chỉ chuẩn hóa lô cần, khỏi sao chép cả cơ sở dữ liệu mỗi lần lưu */
  const needsEnsure = f => !!f && typeof f === 'object' && (!Array.isArray(f.doi) || !f.doi.length || (Array.isArray(f.nc) && f.nc.some(r => r && !has(r, 'doiId'))) || needsVC(f) || needsPC(f) || coTruongCu(f));
  const eachForest = (db, fn) => { const out = clone(db) || {}; Object.values(out.rs || {}).forEach(o => Object.keys(o.forests || {}).forEach(k => { o.forests[k] = fn(o.forests[k]); })); return out; };
  const ensureDb = db => eachForest(db, ensureForest);
  const legacyDb = db => eachForest(db, legacyForest);

  /* ===== truy vấn ===== */
  const teamOf = (f, r) => ((f && f.doi) || []).find(d => d.id === (r && r.doiId)) || null;
  const membersOf = (f, d) => ((f && f.nc) || []).filter(r => r && r.doiId === d.id);
  /* thông tin dùng cho người / đội: thông tin lô + hình thức của đội (đội không có thì đội đầu) */
  const infoOf = (info, d) => Object.assign({}, info, (d && d.hinhThuc) || {});
  /* lỗi cấu trúc đội của một lô: dòng chưa thuộc đội, đội không / nhiều Tổ trưởng (giao khoán), tên đội trống / trùng khi nhiều đội */
  function teamErrors(f) {
    const errs = [], doi = (f && f.doi) || [], nc = (f && f.nc) || [], multi = doi.length > 1;
    nc.forEach(r => { if (!teamOf(f, r)) errs.push({row: r._row, text: (trim(r.doi) ? 'Đội “' + trim(r.doi) + '” của “' + (r.ten || '(không tên)') + '” không có Tổ trưởng' : '“' + (r.ten || '(không tên)') + '” chưa thuộc đội nào') + (multi ? ': chọn đội cho người này (lô có ' + doi.length + ' đội)' : '')}); });
    const names = new Map();
    doi.forEach((d, k) => {
      const m = membersOf(f, d), tts = m.filter(isTT), direct = (d.hinhThuc || {}).moHinhKy === 'tructiep';
      const lb = 'Đội ' + (d.ten ? '“' + d.ten + '”' : (k + 1));
      if (multi && !trim(d.ten)) errs.push({row: tts[0] && tts[0]._row, text: lb + (tts[0] ? ' (Tổ trưởng “' + tts[0].ten + '”) chưa ghi tên đội' : ' chưa có tên') + ': lô có nhiều đội thì mỗi đội một tên'});
      const nk = tenKey(d.ten); if (multi && nk) { if (names.has(nk)) errs.push({text: 'Tên đội “' + d.ten + '” trùng với đội khác'}); else names.set(nk, true); }
      if (m.length && !tts.length) errs.push({text: lb + ' chưa có Tổ trưởng'});
      if (!direct && tts.length > 1) errs.push({text: lb + ' có ' + tts.length + ' Tổ trưởng: mỗi đội giao khoán chỉ một Tổ trưởng (tách thành đội riêng)'});
    });
    return errs;
  }

  /* ===== thao tác trên đội (trả lô mới, không sửa đầu vào) ===== */
  const newTeamId = f => { const used = new Set(((f && f.doi) || []).map(d => d.id)); let k = used.size + 1; while (used.has('doi' + k)) k++; return 'doi' + k; };
  /* thêm đội: hình thức, cách tính, đơn giá chép từ đội `fromId` (mặc định đội đầu) để khỏi nhập lại; tên, số văn bản để trống */
  function addTeam(f, ten, fromId) {
    const out = ensureForest(f), src = out.doi.find(d => d.id === fromId) || out.doi[0] || {};
    const d = {id: newTeamId(out), ten: trim(ten), hinhThuc: clone(src.hinhThuc) || {}, dienTich: null, exp: {}};
    out.doi.push(d); return {f: out, id: d.id};
  }
  /* xóa đội: chặn nếu còn nhân công (chuyển hoặc xóa họ trước); không xóa đội cuối cùng */
  /* lịch sử STT văn bản đã cấp theo lô và theo nhóm (doi | doiXe), cùng quy tắc src/sovb.js: f.sttDaCap = {doi: [..], doiXe: [..]} */
  function ghiSttDaCap(f, nhom, stt) { if (!(stt > 0)) return; f.sttDaCap = f.sttDaCap && typeof f.sttDaCap === 'object' ? f.sttDaCap : {}; const l = Array.isArray(f.sttDaCap[nhom]) ? f.sttDaCap[nhom] : []; if (!l.includes(stt)) l.push(stt); l.sort((a, b) => a - b); f.sttDaCap[nhom] = l; }
  function removeTeam(f, id) {
    const out = ensureForest(f), d = out.doi.find(x => x.id === id);
    if (!d) return {ok: false, error: 'Không có đội này'};
    if (out.doi.length <= 1) return {ok: false, error: 'Lô phải có ít nhất một đội'};
    const n = membersOf(out, d).length; if (n) return {ok: false, error: 'Đội còn ' + n + ' nhân công: chuyển họ sang đội khác hoặc xóa trước khi xóa đội'};
    const np = (out.pc || []).filter(r => r && r.doiId === id).length; if (np) return {ok: false, error: 'Đội còn ' + np + ' phiếu cân: gán phiếu sang đội khác trước khi xóa đội'};
    ghiSttDaCap(out, 'doi', d.stt);   // đội bị xóa vẫn giữ STT đã cấp: đội mới không nhận lại số này
    out.doi = out.doi.filter(x => x.id !== id); return {ok: true, f: out};
  }
  /* kiểm tra tên đội khai thác / đội xe (lô 7b, T-16): chặn rỗng khi lô có nhiều đội (hoặc đội xe), chặn trùng theo tenKey (NFC, giữ dấu). Trả chuỗi lỗi hoặc '' */
  function tenDoiLoi(f, ten, selfId, loai) {
    const t = trim(ten), k = tenKey(t), isHd = loai === 'hdvc', ds = ((f && (isHd ? f.hdvc : f.doi)) || []).filter(x => x && x.id !== selfId);
    const label = isHd ? 'đội xe' : 'đội';
    if (!t) {
      if (isHd || ds.length >= 1) return 'Tên ' + label + ' không được để trống';
      return '';
    }
    const hit = ds.find(x => tenKey(x.ten) === k);
    if (hit) return 'Đã có ' + label + ' tên “' + trim(hit.ten) + '” trong lô';
    return '';
  }
  function tenHdLoi(f, ten, selfId) { return tenDoiLoi(f, ten, selfId, 'hdvc'); }
  /* cập nhật thông tin đội (tên, hình thức, diện tích, số văn bản) */
  function updateTeam(f, id, patch) {
    const out = ensureForest(f), d = out.doi.find(x => x.id === id); if (!d) return {ok: false, error: 'Không có đội này'};
    if (has(patch, 'ten')) {
      const loi = tenDoiLoi(out, patch.ten, id, 'doi');
      if (loi) return {ok: false, error: loi};
      const cu = d.ten; d.ten = trim(patch.ten); if (d.ten && d.ten !== cu) membersOf(out, d).forEach(r => { r.doi = d.ten; });
    }   // đổi tên đội: cột Đội của người trong đội đổi theo
    if (patch.hinhThuc) d.hinhThuc = Object.assign({}, d.hinhThuc, clone(patch.hinhThuc));
    if (has(patch, 'dienTich')) d.dienTich = typeof patch.dienTich === 'number' && patch.dienTich >= 0 ? patch.dienTich : null;
    if (has(patch, 'benNhanKhoan')) { if (patch.benNhanKhoan && patch.benNhanKhoan.doiTuongId) d.benNhanKhoan = {doiTuongId: String(patch.benNhanKhoan.doiTuongId), nguoiId: String(patch.benNhanKhoan.nguoiId || '')}; else delete d.benNhanKhoan; }
    if (has(patch, 'benNhanKhoanBan')) { if (patch.benNhanKhoanBan && d.benNhanKhoan) d.benNhanKhoanBan = clone(patch.benNhanKhoanBan); else delete d.benNhanKhoanBan; }   // bản chụp thông tin bên nhận khoán để in (danh mục đổi sau không làm sai bản in lại)   // 3.0: bên nhận khoán (ID Danh mục đối tượng)
    if (patch.exp) d.exp = Object.assign({}, d.exp, clone(patch.exp));
    return {ok: true, f: out};
  }
  /* chuyển nhân công (theo chỉ số dòng) sang đội khác */
  function moveMembers(f, idxs, id) {
    const out = ensureForest(f); if (!out.doi.some(d => d.id === id)) return {ok: false, error: 'Không có đội này'};
    const d = out.doi.find(x => x.id === id);
    idxs.forEach(i => { const r = out.nc && out.nc[i]; if (!r) return; r.doiId = id; if (trim(d.ten)) r.doi = d.ten; }); return {ok: true, f: out};   // cột Đội (chữ) theo đội thật: sửa người sau đó không về đội cũ
  }

  /* ===== hợp đồng vận chuyển ===== */
  const hdOf = (f, r) => ((f && f.hdvc) || []).find(h => h.id === (r && r.hdvcId)) || null;
  const xeOf = (f, h) => ((f && f.dx) || []).filter(r => r && r.hdvcId === h.id);
  /* hợp đồng theo thứ tự in: xe đầu tiên của hợp đồng (như bản cũ gom xe theo người ký); hợp đồng chưa có xe ở cuối */
  const hdOrder = f => { const hd = (f && f.hdvc) || [], dx = (f && f.dx) || [], first = h => { const i = dx.findIndex(r => r && r.hdvcId === h.id); return i < 0 ? Infinity : i; }; return hd.map((h, k) => ({h, k, i: first(h)})).sort((a, b) => a.i - b.i || a.k - b.k).map(x => x.h); };
  const newHdId = f => { const used = new Set(((f && f.hdvc) || []).map(h => h.id)); let k = 1; while (used.has('hd' + k)) k++; return 'hd' + k; };
  /* thêm đội xe (chưa có xe); người ký chọn sau (một người trong đội hoặc một đơn vị trong danh mục) */
  function addHd(f, ten) { const out = ensureForest(f), h = {id: newHdId(out), ten: trim(ten), key: '', donViId: null, ben: null, cuoc: null, exp: {}}; out.hdvc.push(h); return {f: out, id: h.id}; }
  /* đội xe ký với một đơn vị trong danh mục (doanh nghiệp…): chụp lại thông tin đơn vị lúc chọn */
  function addHdDonVi(f, dv) { const out = ensureForest(f), h = {id: newHdId(out), ten: '', key: '', donViId: dv.id, ben: clone(dv), cuoc: null, exp: {}}; out.hdvc.push(h); return {f: out, id: h.id}; }
  /* cập nhật đội xe: tên, người ký ({key} = người trong đội | {donVi} = đơn vị danh mục), cước, số văn bản */
  function updateHd(f, id, patch) {
    const out = ensureForest(f), h = out.hdvc.find(x => x.id === id); if (!h) return {ok: false, error: 'Không có đội xe này'};
    if (has(patch, 'ten')) {
      const t = trim(patch.ten);
      if (!t && (trim(h.ten) || !h.donViId)) return {ok: false, error: 'Tên đội xe không được để trống'};
      if (t) { const loi = tenDoiLoi(out, t, id, 'hdvc'); if (loi) return {ok: false, error: loi}; }
      h.ten = t;
    }
    if (has(patch, 'cuoc')) h.cuoc = patch.cuoc ? clone(patch.cuoc) : null;
    if (patch.exp) { h.exp = Object.assign({}, h.exp); Object.entries(patch.exp).forEach(([k, v]) => { if (trim(v)) h.exp[k] = trim(v); else delete h.exp[k]; }); }
    if (patch.donVi) { h.donViId = patch.donVi.id; h.ben = clone(patch.donVi); h.key = ''; }
    else if (has(patch, 'key')) { h.donViId = null; h.ben = null; h.key = String(patch.key || ''); }
    if (has(patch, 'ben') && h.donViId) h.ben = clone(patch.ben);
    return {ok: true, f: ensureForest(out)};
  }
  /* chuyển xe (chỉ số dòng) sang đội xe khác */
  function moveXe(f, idxs, id) {
    const out = ensureForest(f), h = out.hdvc.find(x => x.id === id); if (!h) return {ok: false, error: 'Không có đội xe này'};
    idxs.forEach(i => { const r = out.dx && out.dx[i]; if (r) r.hdvcId = h.id; });
    return {ok: true, f: ensureForest(out)};
  }
  function removeHd(f, id) {
    const out = ensureForest(f), h = out.hdvc.find(x => x.id === id); if (!h) return {ok: false, error: 'Không có đội xe này'};
    const n = xeOf(out, h).length; if (n) return {ok: false, error: 'Đội xe còn ' + n + ' xe: chuyển xe sang đội khác trước'};
    const phieu = (out.pc || []).filter(p => p?.hdvcId === id).length;
    if (phieu) return {ok: false, error: 'Đội xe còn ' + phieu + ' phiếu cân: chuyển phiếu sang hợp đồng khác trước'};
    ghiSttDaCap(out, 'doiXe', h.stt);
    out.hdvc = out.hdvc.filter(x => x !== h); return {ok: true, f: out};
  }
  /* những người ký được của đội xe: chủ xe và tài xế (có CCCD) của các xe trong đội, không trùng */
  function signersOf(f, h) {
    const out = [], seen = new Set();
    xeOf(f, h).forEach(r => [[r.cccd, r.chuXe, 'Chủ xe'], [r.cccdTx, r.taiXe, 'Tài xế']].forEach(([c, t, v]) => { const k = digits(c); if (k && trim(t) && !seen.has(k)) { seen.add(k); out.push({key: k, ten: trim(t), vaiTro: v, bienSo: r.bienSo}); } }));
    return out;
  }

  /* DANH MỤC NGƯỜI LAO ĐỘNG dùng chung (như danh mục xe): người đã nhập ở mọi lô, gộp theo CCCD 9 hoặc 12 số; thông tin khác nhau giữa các lô thì lô có ngày bắt đầu khai thác MỚI NHẤT thắng (bằng nhau: lô duyệt sau).
   * Mỗi lô vẫn chụp lại thông tin người trong lô: danh mục chỉ để điền sẵn khi thêm người, không bao giờ sửa ngược lô khác. rs = db.rs (chủ rừng → forests). Bỏ người thiếu họ tên hoặc CCCD không đủ 12 số. */
  const cccdSo = v => String(v == null ? '' : v).replace(/\D/g, '');
  const ngayKey = v => { const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(trim(v)); return m ? (+m[3]) * 10000 + (+m[2]) * 100 + (+m[1]) : 0; };
  function nguoiDanhMuc(rs) {
    const by = new Map();
    Object.values(rs || {}).forEach(o => Object.values((o && o.forests) || {}).forEach(f => (f.nc || []).forEach(r => {
      const k = cccdSo(r && r.cccd); if (!r || !NL().cccdHopLe(k) || !trim(r.ten)) return;
      const t = ngayKey(f.info && f.info.tuNgay), cur = by.get(k); if (!cur || t >= cur.t) by.set(k, {t, r});
    })));
    return [...by.values()].map(x => x.r).sort((a, b) => String(a.ten).localeCompare(String(b.ten), 'vi'));
  }
  /* TRẠNG THÁI IN ĐỢT 2 CỦA BM-09 / BM-10 THEO ĐỘI XE (A3): khóa mới 'hd:<id đội xe>' (đổi người ký, đổi tên doanh nghiệp không mất lịch sử in);
   * khóa cũ là CCCD (hoặc tên) của người ký, đúng như ui/app/07 groupsDX dựng: doanh nghiệp / đối tác → ben.cccd || ben.ten; người trong đội → CCCD (hoặc tên) chủ xe / tài xế ký. */
  const khoaInVC = h => 'hd:' + h.id;
  function khoaInCuVC(f, h) {
    const xs = xeOf(f, h); if (!xs.length) return '';
    if (h.donViId) { const b = h.ben || {}; return String(b.cccd || b.ten || ''); }
    const sg = signerOf(xs, h.key), r = sg ? sg.r : xs[0], tx = sg ? sg.tx : trim(r.nguoiKy) === 'Tài xế';
    return String((tx ? r.cccdTx : r.cccd) || (tx ? r.taiXe : r.chuXe) || '');
  }
  /* đổi khóa cũ sang khóa đội xe trong f.inDot2 (sửa trực tiếp f; trả số mục đã đổi). Lô đã chốt / đã dừng: không đổi (giữ dấu vân tay; giao diện vẫn đọc được khóa cũ). Chạy lại không đổi. */
  function doiKhoaInVC(f) {
    if (!f || f.chot || f.dung || !f.inDot2 || !f.inDot2.items || !Array.isArray(f.hdvc)) return 0;
    const it = f.inDot2.items; let n = 0;
    f.hdvc.forEach(h => { const cu = khoaInCuVC(f, h); if (!cu) return; ['09', '10'].forEach(code => { const a = code + ':' + cu, b = code + ':' + khoaInVC(h); if (has(it, a) && !has(it, b)) { it[b] = it[a]; delete it[a]; n++; } }); });
    return n;
  }
  const api = {tenKey, tenDoiLoi, tenHdLoi, khoaInVC, khoaInCuVC, doiKhoaInVC, hdTenKhop, xoaTruongCu, coTruongCu, nguoiDanhMuc, cccdSo, assignPc, HD_EXP, vcKey, signerOf, signersOf, hdOf, xeOf, hdOrder, addHd, addHdDonVi, updateHd, moveXe, removeHd, DOI_INFO, DOI_EXP, splitTeams, needsEnsure, ensureForest, legacyForest, ensureDb, legacyDb, teamOf, membersOf, infoOf, teamErrors, addTeam, removeTeam, updateTeam, moveMembers, isTT};
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.HAKModel = api;
})(typeof window !== 'undefined' ? window : globalThis);
