/* Cấu trúc dữ liệu bảng mẹ – bảng con (bản 2.0, docs/THIET_KE_BANG_ME_CON.md) — GIAI ĐOẠN 1: chuyển dữ liệu và dựng lại dạng cũ.
 * Hàm thuần, không phụ thuộc giao diện, dùng chung ở giao diện (nhúng khi build) và kiểm thử Node.
 *
 * Lô rừng dạng mới (cauTruc: 2):
 *   info  : thông tin của RỪNG (các trường thuộc đội / hợp đồng vận chuyển đã chuyển đi)
 *   doi   : [Đội] — mỗi đội: {id, ten, ttKey, hinhThuc: {hinhThucLuong, moHinhKy, donGiaTan, donGiaHa, donGiaNgay, donGia, ngayBDLD}, dienTich (null = mặc định),
 *            exp: {số/ngày hợp đồng khai thác, ủy quyền, nghiệm thu, kỳ thanh toán}, nc: [nhân công], ncPos: [vị trí trong danh sách cũ], cc: {chấm công của đội}}
 *   hdvc  : [Hợp đồng vận chuyển] — {id, donViId, donVi: {bản chụp bên ký lúc ký}, cuoc: {vanChuyen, cuLy}, exp: {số/ngày hợp đồng VC, xác nhận khối lượng…},
 *            xe: [{xeId, row: bản chụp dòng xe}], xePos}
 *   pc    : phiếu cân (giữ ở lô) + doiId khi lô chỉ có một đội
 *   exp   : các số/ngày của lô (FSC, thẩm định, đào tạo, cấp phát…)
 *   _cu   : phần dữ liệu cũ không thuộc bảng nào (chấm công của người không còn trong danh sách) — giữ để không mất
 * Danh mục mới của db: dmViTri (vị trí), dmDonViVC (đơn vị vận chuyển), dmXe (xe).
 *
 * Bất biến của giai đoạn này: legacyDb(migrateDb(db)) giống hệt db (mọi trường, mọi thứ tự dòng), nên biểu mẫu đọc dữ liệu y nguyên → bản in giống từng byte.
 * migrateDb chạy lại không đổi gì (lô đã cauTruc 2 bỏ qua; danh mục tính lại cùng kết quả). */
(function (root) {
  'use strict';
  const CAU_TRUC = 2;
  const clone = x => x === undefined ? undefined : JSON.parse(JSON.stringify(x));
  const has = (o, k) => !!o && Object.prototype.hasOwnProperty.call(o, k);
  const trim = s => String(s == null ? '' : s).replace(/\s+/g, ' ').trim();
  const fold = s => trim(s).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();
  const digits = s => String(s == null ? '' : s).replace(/\D/g, '');
  const bienKey = v => String(v || '').toUpperCase().replace(/[\s.\-]/g, '');
  const isTT = r => /^tổ trưởng/i.test((r && r.vaiTro) || '');
  const personKey = r => String((r && (r.cccd || r.ten)) || '').trim();
  const dateNum = v => { const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(trim(v)); return m ? +m[3] * 10000 + +m[2] * 100 + +m[1] : 0; };

  /* các trường của THÔNG TIN RỪNG chuyển về ĐỘI và về HỢP ĐỒNG VẬN CHUYỂN; các khóa của exp chuyển về đội / hợp đồng */
  const DOI_INFO = ['hinhThucLuong', 'moHinhKy', 'donGiaTan', 'donGiaHa', 'donGiaNgay', 'donGia', 'ngayBDLD'];
  const HD_INFO = ['vanChuyen', 'cuLy'];
  const DOI_EXP = ['soKT', 'uqSo', 'uqNgay', 'uqThuLao', 'ntSo', 'ntNgay', 'ntDaTT', 'tuNgayTT', 'denNgayTT', 'hdPhuCap', 'hdNangLuong'];
  const HD_EXP = ['soVC', 'pcSo', 'pcNgay', 'pcNguoiLap', 'vcChiPhi'];
  const CHUNG_EXP = ['ngayKy'];   // ngày ký chung của bản cũ: chép vào cả đội lẫn hợp đồng VC (bản mới mỗi văn bản một ngày ký)
  const pick = (o, keys) => { const out = {}; keys.forEach(k => { if (has(o, k)) out[k] = clone(o[k]); }); return out; };
  const omit = (o, keys) => { const out = {}; Object.keys(o || {}).forEach(k => { if (!keys.includes(k)) out[k] = o[k]; }); return out; };

  /* ===== Đội ===== chia nhân công thành đội đúng như src/doi.js (0–1 Tổ trưởng: một đội gồm mọi người; nhiều Tổ trưởng: theo cột Đội).
   * Dòng chưa thuộc đội nào (lỗi dữ liệu cũ) vào đội đầu tiên để không mất; giao diện mới sẽ báo. */
  function splitTeams(nc) {
    const tts = nc.map((r, i) => ({r, i})).filter(x => isTT(x.r));
    if (tts.length <= 1) return [{ttKey: tts.length ? personKey(tts[0].r) : '', ten: tts.length ? trim(tts[0].r.doi) : '', idx: nc.map((_, i) => i)}];
    const teams = [], byName = new Map();
    tts.forEach(t => { const k = fold(t.r.doi); const d = {ttKey: personKey(t.r), ten: trim(t.r.doi), idx: [t.i]}; teams.push(d); if (k && !byName.has(k)) byName.set(k, d); });
    nc.forEach((r, i) => { if (isTT(r)) return; const d = byName.get(fold(r.doi)) || teams[0]; d.idx.push(i); });
    teams.forEach(d => d.idx.sort((a, b) => a - b));
    return teams;
  }
  /* ===== Hợp đồng vận chuyển ===== gom xe theo người ký như bản cũ (groupsDX): người ký = tài xế nếu nguoiKy là “Tài xế”, không thì chủ xe */
  const driverSigns = r => trim(r.nguoiKy) === 'Tài xế';
  const signerOf = r => driverSigns(r)
    ? {loai: 'canhan', vaiTro: 'Tài xế', ten: r.taiXe || '', cccd: r.cccdTx || '', ngaySinh: r.ngaySinhTx || '', ngayCap: r.ngayCapTx || '', noiCap: r.noiCapTx || '', diaChi: r.diaChiTx || '', sdt: r.sdt || ''}
    : {loai: 'canhan', vaiTro: 'Chủ xe', ten: r.chuXe || '', cccd: r.cccd || '', ngaySinh: r.ngaySinh || '', ngayCap: r.ngayCap || '', noiCap: r.noiCap || '', diaChi: r.diaChi || '', sdt: r.sdt || ''};
  const signerKeyOf = s => digits(s.cccd) || ('ten:' + fold(s.ten));
  const donViIdOf = s => 'dv_' + signerKeyOf(s).replace(/[^a-z0-9]+/gi, '_');
  const xeIdOf = r => 'xe_' + (bienKey(r.bienSo) || 'khongbien');

  /* ===== chuyển một lô ===== */
  function migrateForest(f) {
    if (!f || f.cauTruc === CAU_TRUC) return clone(f);
    const info = f.info || {}, exp = f.exp || {}, nc = f.nc || [], dx = f.dx || [];
    const out = omit(clone(f), ['info', 'exp', 'nc', 'dx', 'cc']);
    out.cauTruc = CAU_TRUC;
    out.info = omit(clone(info), DOI_INFO.concat(HD_INFO));
    out.exp = omit(clone(exp), DOI_EXP.concat(HD_EXP, CHUNG_EXP));
    const hinhThuc = pick(info, DOI_INFO), doiExp = Object.assign(pick(exp, DOI_EXP), pick(exp, CHUNG_EXP));
    const cc = clone(f.cc), ccLeft = clone(f.cc) || {};
    out.doi = splitTeams(nc).map((t, k) => {
      const rows = t.idx.map(i => clone(nc[i])), keys = new Set(rows.map(personKey));
      let dcc; if (cc) { dcc = {}; Object.entries(cc).forEach(([ym, m]) => Object.entries(m || {}).forEach(([p, days]) => { if (keys.has(p)) { (dcc[ym] = dcc[ym] || {})[p] = clone(days); if (ccLeft[ym]) delete ccLeft[ym][p]; } })); }
      return {id: 'doi' + (k + 1), ten: t.ten, ttKey: t.ttKey, hinhThuc: clone(hinhThuc), dienTich: null, exp: clone(doiExp), nc: rows, ncPos: t.idx.slice(), ...(dcc ? {cc: dcc} : {})};
    });
    if (cc) {
      const left = {}; Object.entries(ccLeft).forEach(([ym, m]) => { if (m && Object.keys(m).length) left[ym] = m; });
      out._cu = {ccKeys: Object.keys(cc), ...(Object.keys(left).length ? {cc: left} : {})};   // thứ tự tháng và chấm công của người không còn trong danh sách
    }
    out._cu = Object.assign(out._cu || {}, {ccCo: has(f, 'cc'), ncCo: has(f, 'nc'), dxCo: has(f, 'dx'), expCo: has(f, 'exp')});
    const cuoc = pick(info, HD_INFO), hdExp = Object.assign(pick(exp, HD_EXP), pick(exp, CHUNG_EXP));
    const groups = [], by = new Map();
    dx.forEach((r, i) => { const s = signerOf(r), k = signerKeyOf(s); if (!by.has(k)) { const g = {s, idx: []}; by.set(k, g); groups.push(g); } by.get(k).idx.push(i); });
    out.hdvc = groups.map((g, k) => ({id: 'hd' + (k + 1), donViId: donViIdOf(g.s), donVi: clone(g.s), cuoc: clone(cuoc), exp: clone(hdExp),
      xe: g.idx.map(i => ({xeId: xeIdOf(dx[i]), row: clone(dx[i])})), xePos: g.idx.slice()}));
    // lô chưa có xe nhưng đã khai cước / số hợp đồng VC: giữ ở một hợp đồng chưa chọn đơn vị để không mất
    if (!out.hdvc.length && (Object.keys(cuoc).length || Object.keys(pick(exp, HD_EXP)).length)) out.hdvc.push({id: 'hd1', donViId: '', donVi: null, cuoc: clone(cuoc), exp: clone(hdExp), xe: [], xePos: [], _choDonVi: true});
    out._cu.ngayKyO = has(exp, 'ngayKy') ? (out.doi.length ? 'doi' : 'hd') : '';
    // phiếu cân: lô một đội thì gán luôn đội đó
    if (Array.isArray(out.pc) && out.doi.length === 1) out.pc = out.pc.map(p => Object.assign({}, p, {doiId: out.doi[0].id, _doiTuDong: true}));
    return out;
  }

  /* ===== dựng lại một lô dạng cũ (cho biểu mẫu hiện có) ===== */
  function legacyForest(f) {
    if (!f || f.cauTruc !== CAU_TRUC) return clone(f);
    const cu = f._cu || {}, out = omit(clone(f), ['cauTruc', 'doi', 'hdvc', '_cu', 'info', 'exp', 'pc']);
    const d0 = (f.doi || [])[0] || {}, h0 = (f.hdvc || [])[0] || {};
    out.info = Object.assign(clone(f.info) || {}, clone(d0.hinhThuc) || {}, clone(h0.cuoc) || {});
    const exp = Object.assign(clone(f.exp) || {}, omit(clone(d0.exp) || {}, CHUNG_EXP), omit(clone(h0.exp) || {}, CHUNG_EXP));
    const nk = cu.ngayKyO === 'doi' ? d0.exp : cu.ngayKyO === 'hd' ? h0.exp : null;
    if (nk && has(nk, 'ngayKy')) exp.ngayKy = nk.ngayKy;
    if (cu.expCo || Object.keys(exp).length) out.exp = exp;
    // nhân công theo đúng thứ tự cũ; dòng thêm mới (không có vị trí cũ) xếp sau, theo thứ tự đội
    const nc = [], extra = [];
    (f.doi || []).forEach(d => (d.nc || []).forEach((r, j) => { const p = (d.ncPos || [])[j]; if (p == null) extra.push(clone(r)); else nc[p] = clone(r); }));
    if (cu.ncCo || nc.length || extra.length) out.nc = nc.filter(x => x !== undefined).concat(extra);
    const dx = [], dxExtra = [];
    (f.hdvc || []).forEach(h => (h.xe || []).forEach((x, j) => { const p = (h.xePos || [])[j]; if (p == null) dxExtra.push(clone(x.row)); else dx[p] = clone(x.row); }));
    if (cu.dxCo || dx.length || dxExtra.length) out.dx = dx.filter(x => x !== undefined).concat(dxExtra);
    if (cu.ccCo) {
      const cc = {}, order = cu.ccKeys || [];
      const put = src => Object.entries(src || {}).forEach(([ym, m]) => Object.entries(m || {}).forEach(([p, days]) => { (cc[ym] = cc[ym] || {})[p] = clone(days); }));
      (f.doi || []).forEach(d => put(d.cc)); put(cu.cc);
      const ordered = {}; order.forEach(k => { ordered[k] = cc[k] || {}; }); Object.keys(cc).forEach(k => { if (!has(ordered, k)) ordered[k] = cc[k]; });
      out.cc = ordered;
    }
    if (has(f, 'pc')) out.pc = Array.isArray(f.pc) ? f.pc.map(p => { const q = Object.assign({}, p); if (q._doiTuDong) { delete q.doiId; delete q._doiTuDong; } return clone(q); }) : clone(f.pc);
    return out;
  }

  /* ===== danh mục ===== */
  /* vị trí: một nguồn duy nhất. Gom từ định biên (đúng thứ tự định biên), ba vị trí mặc định của bản cũ, vị trí thêm, khóa của định mức BHLĐ và đơn giá, chức danh nhân công */
  const BASE = ['Tổ trưởng', 'Công nhân khai thác', 'Công nhân cưa'];
  function buildViTri(db, dinhBienMacDinh) {
    const out = [], seen = new Map();
    const add = (ten, o) => { ten = trim(ten); if (!ten) return; const k = ten.toLowerCase(); if (seen.has(k)) { if (o) Object.assign(seen.get(k), o); return; } const v = {id: 'vt_' + fold(ten).replace(/[^a-z0-9]+/g, '_'), ten, soNguoi: 0, kiemNhiem: '', nhiemVu: '', ...(o || {})}; seen.set(k, v); out.push(v); };
    const db0 = Array.isArray(db.dinhBien) && db.dinhBien.length ? db.dinhBien : (dinhBienMacDinh || []);
    db0.forEach(r => add(r.chucDanh, {soNguoi: r.soNguoi || 0, kiemNhiem: r.kiemNhiem || '', nhiemVu: r.nhiemVu || ''}));
    BASE.forEach(t => add(t)); (db.chucDanhThem || []).forEach(t => add(t));
    Object.keys(db.dinhMuc || {}).forEach(t => add(t)); (db.dinhMucBan || []).forEach(v => Object.keys(v.dm || {}).forEach(t => add(t)));
    Object.values(db.rs || {}).forEach(o => Object.values(o.forests || {}).forEach(f => {
      const lots = f.cauTruc === CAU_TRUC ? (f.doi || []) : [{hinhThuc: f.info || {}, nc: f.nc || []}];
      lots.forEach(d => { ['donGiaTan', 'donGiaHa', 'donGiaNgay'].forEach(m => Object.keys((d.hinhThuc || {})[m] || {}).forEach(t => add(t))); (d.nc || []).forEach(r => add(r.chucDanh)); });
    }));
    return out;
  }
  /* đơn vị vận chuyển và xe: gộp giữa các lô theo CCCD/MST và theo biển số; trùng thì giữ bản của lô có ngày bắt đầu khai thác mới nhất
   * (hợp đồng của từng lô vẫn giữ bản chụp riêng nên bản in cũ không đổi) */
  function buildVanChuyen(db, dvCu, xeCu) {
    const dv = Object.assign({}, clone(dvCu) || {}), xe = Object.assign({}, clone(xeCu) || {}), stamp = {};
    Object.values(db.rs || {}).forEach(o => Object.values(o.forests || {}).forEach(f => {
      if (f.cauTruc !== CAU_TRUC) return;
      const when = dateNum((f.info || {}).tuNgay);
      (f.hdvc || []).forEach(h => {
        if (h.donViId && h.donVi && (!dv[h.donViId] || (stamp[h.donViId] || 0) <= when) && !(dvCu || {})[h.donViId]) { dv[h.donViId] = Object.assign({id: h.donViId}, clone(h.donVi)); stamp[h.donViId] = when; }
        (h.xe || []).forEach(x => {
          if (!x.xeId || (xeCu || {})[x.xeId]) return;
          const r = x.row || {}, s = 'x:' + x.xeId;
          if (!xe[x.xeId] || (stamp[s] || 0) <= when) { xe[x.xeId] = Object.assign({id: x.xeId, donViId: h.donViId}, omit(clone(r), ['_row', '_id', 'maRung', 'stt', '_src'])); stamp[s] = when; }
        });
      });
    }));
    return {dv, xe};
  }

  /* ===== cả cơ sở dữ liệu ===== dinhBienMacDinh: định biên mặc định (src/dinhbien.js MAC_DINH) khi db chưa lưu định biên */
  function migrateDb(db, dinhBienMacDinh) {
    const out = clone(db) || {}; out.rs = out.rs || {};
    Object.values(out.rs).forEach(o => { Object.keys(o.forests || {}).forEach(k => { o.forests[k] = migrateForest(o.forests[k]); }); });
    if (!has(out, '_cu2')) out._cu2 = {dmViTriCo: has(db, 'dmViTri'), dmDonViVCCo: has(db, 'dmDonViVC'), dmXeCo: has(db, 'dmXe')};
    out.dmViTri = has(db, 'dmViTri') ? clone(db.dmViTri) : buildViTri(out, dinhBienMacDinh);
    const vc = buildVanChuyen(out, db.dmDonViVC, db.dmXe); out.dmDonViVC = vc.dv; out.dmXe = vc.xe;
    return out;
  }
  function legacyDb(db2) {
    const out = clone(db2) || {}, cu = out._cu2 || {};
    Object.values(out.rs || {}).forEach(o => { Object.keys(o.forests || {}).forEach(k => { o.forests[k] = legacyForest(o.forests[k]); }); });
    if (!cu.dmViTriCo) delete out.dmViTri; if (!cu.dmDonViVCCo) delete out.dmDonViVC; if (!cu.dmXeCo) delete out.dmXe;
    delete out._cu2;
    return out;
  }

  const api = {CAU_TRUC, DOI_INFO, HD_INFO, DOI_EXP, HD_EXP, migrateForest, legacyForest, migrateDb, legacyDb, buildViTri, splitTeams, signerOf, donViIdOf, xeIdOf};
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.HAKModel = api;
})(typeof window !== 'undefined' ? window : globalThis);
