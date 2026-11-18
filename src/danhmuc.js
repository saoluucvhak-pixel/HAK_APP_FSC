/* Danh mục dùng chung của bản 2.1 (hàm thuần, không phụ thuộc giao diện; dùng chung ở giao diện — nhúng khi build — và kiểm thử Node).
 * Xem docs/THIET_KE_QUY_TRINH_2_1.md.
 *
 *  - Lao động (db.dmLaoDong): NHIỀU DÒNG theo NGÀY CẬP NHẬT cho mỗi CCCD; dùng dòng có ngày mới nhất (cùng ngày: dòng thêm sau).
 *    dòng = {ngayCapNhat, cccd (= mã công nhân), ten, gioiTinh, ngaySinh, diaChi, ngayCap, noiCap, sdt, chucVu, viTri}
 *  - Xe (db.dmXeVC): nhiều dòng theo ngày cập nhật cho mỗi biển số (so khớp bỏ dấu chấm, gạch, khoảng trắng); dùng dòng mới nhất.
 *    dòng = {ngayCapNhat, bienSo, chuXe, taiXe, cccdTx, diaChiTx, ngayCapTx, noiCapTx, gplx, hanGplx, hanDangKiem, hanBaoHiem}
 *  - Chức vụ: Tổ trưởng, Công nhân (CHUC_VU). Vị trí là danh mục vị trí (Định mức nhân công) nên chỉ KIỂM tên vị trí ở đây, không giữ danh sách riêng.
 *  - Ngày dạng dd/mm/yyyy (src/dates.js). Dòng thiếu ngày cập nhật coi là cũ nhất (ngày 0): dữ liệu chuyển từ bản cũ vẫn dùng được. */
(function (root) {
  const BKS = () => (typeof require === 'function' ? require('./bks.js') : root.HAKBks);   // một quy tắc chuẩn hóa BKS (src/bks.js)
  const D = typeof HAKDates !== 'undefined' ? HAKDates : (typeof require === 'function' ? require('./dates.js') : root.HAKDates);
  const trim = s => String(s == null ? '' : s).replace(/\s+/g, ' ').trim();
  const CHUC_VU = ['Tổ trưởng', 'Công nhân'];
  const NL = () => (typeof require === 'function' ? require('./nhaplieu.js') : root.HAKNhapLieu);   // quy tắc CCCD duy nhất (src/nhaplieu.js, phiếu #14): 9 hoặc 12 chữ số, không tự thêm số 0
  const cccdSo = v => NL().cccdSo(v), cccdHopLe = v => NL().cccdHopLe(v);
  const bienKey = v => BKS().khoa(v);
  const ngayKey = v => { const p = D.parse(trim(v)); return p ? p.key : 0; };
  const clone = x => JSON.parse(JSON.stringify(x));
  const LAO_DONG = ['ngayCapNhat', 'cccd', 'ten', 'gioiTinh', 'ngaySinh', 'diaChi', 'ngayCap', 'noiCap', 'sdt', 'chucVu', 'viTri'];
  /* thông tin CHỦ XE (người ký hợp đồng vận chuyển khi chủ xe là người ký): trùng tên với trường của dòng xe trong lô. Dữ liệu danh mục cũ thiếu các trường này vẫn đọc được (coi là trống). */
  const CHU_XE = ['cccd', 'ngaySinh', 'ngayCap', 'noiCap', 'diaChi', 'sdt', 'loaiXe', 'cavet', 'nguoiKy'];
  const XE = ['ngayCapNhat', 'bienSo', 'chuXe', 'taiXe', 'cccdTx', 'diaChiTx', 'ngayCapTx', 'noiCapTx', 'gplx', 'hanGplx', 'hanDangKiem', 'hanBaoHiem'].concat(CHU_XE);

  /* chọn dòng hiệu lực: ngày cập nhật lớn nhất; cùng ngày thì dòng ở vị trí sau (thêm sau) */
  function moiNhat(list, keyFn, k) {
    let best = null, bi = -1;
    (list || []).forEach((r, i) => { if (!r || keyFn(r) !== k) return; const t = ngayKey(r.ngayCapNhat); if (!best || t >= best.t) { best = {t, r}; bi = i; } });
    return best ? {row: best.r, index: bi} : null;
  }
  const layLaoDong = (list, cccd) => { const k = cccdSo(cccd); return cccdHopLe(k) ? moiNhat(list, r => cccdSo(r.cccd), k) : null; };
  const layXe = (list, bienSo) => { const k = bienKey(bienSo); return k ? moiNhat(list, r => bienKey(r.bienSo), k) : null; };
  /* mọi dòng của một khóa, mới nhất trước (xem lịch sử) */
  const lichSu = (list, keyFn, k) => (list || []).map((r, i) => ({r, i})).filter(x => x.r && keyFn(x.r) === k).sort((a, b) => ngayKey(b.r.ngayCapNhat) - ngayKey(a.r.ngayCapNhat) || b.i - a.i).map(x => x.r);
  const lichSuLaoDong = (list, cccd) => lichSu(list, r => cccdSo(r.cccd), cccdSo(cccd));
  const lichSuXe = (list, bienSo) => lichSu(list, r => bienKey(r.bienSo), bienKey(bienSo));
  /* danh sách hiệu lực: mỗi khóa MỘT dòng (mới nhất), sắp theo tên / biển số */
  function hieuLuc(list, keyFn, sortFn) {
    const keys = [...new Set((list || []).filter(Boolean).map(keyFn).filter(Boolean))];
    return keys.map(k => moiNhat(list, keyFn, k).row).sort(sortFn);
  }
  const laoDongHieuLuc = list => hieuLuc(list, r => { const k = cccdSo(r.cccd); return cccdHopLe(k) ? k : ''; }, (a, b) => String(a.ten).localeCompare(String(b.ten), 'vi'));
  const xeHieuLuc = list => hieuLuc(list, r => bienKey(r.bienSo), (a, b) => String(a.bienSo).localeCompare(String(b.bienSo), 'vi'));

  /* kiểm tra một dòng trước khi thêm; vi: danh sách tên vị trí hợp lệ (danh mục vị trí). Trả {ok, errs, row (đã chuẩn hóa)} */
  function kiemLaoDong(r, vi) {
    const o = {}; LAO_DONG.forEach(k => { o[k] = trim(r && r[k]); }); o.cccd = cccdSo(o.cccd); const errs = [];
    if (!o.ten) errs.push('thiếu họ tên');
    if (!cccdHopLe(o.cccd)) errs.push('CCCD phải có 9 hoặc 12 chữ số (mã công nhân)');
    if (!o.ngayCapNhat || !ngayKey(o.ngayCapNhat)) errs.push('ngày cập nhật phải đúng dd/mm/yyyy');
    ['ngaySinh', 'ngayCap'].forEach(k => { if (o[k] && !ngayKey(o[k])) errs.push(k === 'ngaySinh' ? 'ngày sinh không có thật' : 'ngày cấp CCCD không có thật'); });
    if (o.gioiTinh && !['Nam', 'Nữ'].includes(o.gioiTinh)) errs.push('giới tính là Nam hoặc Nữ');
    if (o.chucVu && !CHUC_VU.includes(o.chucVu)) errs.push('chức vụ phải chọn trong danh mục (' + CHUC_VU.join(', ') + ')');
    if (o.viTri && Array.isArray(vi) && !vi.some(x => trim(x).toLowerCase() === o.viTri.toLowerCase())) errs.push('vị trí “' + o.viTri + '” không có trong danh mục vị trí');
    return {ok: !errs.length, errs, row: o};
  }
  function kiemXe(r) {
    const o = {}; XE.forEach(k => { o[k] = trim(r && r[k]); }); o.bienSo = o.bienSo.toUpperCase(); o.cccdTx = cccdSo(o.cccdTx); const errs = [];
    if (!bienKey(o.bienSo)) errs.push('thiếu biển số');
    if (!o.ngayCapNhat || !ngayKey(o.ngayCapNhat)) errs.push('ngày cập nhật phải đúng dd/mm/yyyy');
    if (o.taiXe && !cccdHopLe(o.cccdTx)) errs.push('tài xế phải có CCCD 9 hoặc 12 chữ số');
    o.cccd = cccdSo(o.cccd); if (o.cccd && !cccdHopLe(o.cccd)) errs.push('CCCD chủ xe phải có 9 hoặc 12 chữ số');
    if (o.nguoiKy && !['Chủ xe', 'Tài xế'].includes(o.nguoiKy)) errs.push('người ký hợp đồng vận chuyển là Chủ xe hoặc Tài xế');
    ['ngaySinh', 'ngayCap', 'cavet'].forEach(k => { if (o[k] && !ngayKey(o[k])) errs.push(({ngaySinh: 'ngày sinh chủ xe', ngayCap: 'ngày cấp CCCD chủ xe', cavet: 'ngày cấp cà vẹt'})[k] + ' không có thật'); });
    ['ngayCapTx', 'hanGplx', 'hanDangKiem', 'hanBaoHiem'].forEach(k => { if (o[k] && !ngayKey(o[k])) errs.push(({ngayCapTx: 'ngày cấp CCCD tài xế', hanGplx: 'ngày hết hạn giấy phép', hanDangKiem: 'ngày hết hạn đăng kiểm', hanBaoHiem: 'ngày hết hạn bảo hiểm'})[k] + ' không có thật'); });
    return {ok: !errs.length, errs, row: o};
  }

  /* thêm một dòng vào danh mục (không sửa đầu vào). Cùng khóa và CÙNG ngày cập nhật: thay dòng đó; khác ngày: thêm dòng (giữ lịch sử).
   * Trả {list, them (true nếu thêm dòng mới, false nếu thay dòng cùng ngày)} */
  function themDong(list, row, keyFn) {
    const out = clone(list || []), k = keyFn(row), t = ngayKey(row.ngayCapNhat);
    const i = out.findIndex(r => r && keyFn(r) === k && ngayKey(r.ngayCapNhat) === t);
    if (i >= 0) { out[i] = row; return {list: out, them: false}; }
    out.push(row); return {list: out, them: true};
  }
  const themLaoDong = (list, row) => themDong(list, row, r => cccdSo(r.cccd));
  const themXe = (list, row) => themDong(list, row, r => bienKey(r.bienSo));

  /* BẢN CHỤP: chỉ chép trường danh mục CÓ giá trị (trim khác rỗng); trường trống giữ nguyên giá trị đang có trong lô (không bao giờ ghi đè bằng ô trống).
   * Mỗi dòng lô lưu NGÀY CHỤP (_dmNgay = ngày cập nhật của dòng danh mục đã chép) để chỉ đề nghị cập nhật khi danh mục mới hơn lần chụp. [khóa danh mục, khóa trong lô] */
  const MAP_LD = [['ten', 'ten'], ['cccd', 'cccd'], ['ngaySinh', 'ngaySinh'], ['ngayCap', 'ngayCap'], ['noiCap', 'noiCap'], ['diaChi', 'diaChi'], ['viTri', 'chucDanh'], ['chucVu', 'vaiTro'], ['sdt', 'sdt'], ['gioiTinh', 'gioiTinh']];
  const MAP_XE = [['bienSo', 'bienSo'], ['chuXe', 'chuXe'], ['taiXe', 'taiXe'], ['cccdTx', 'cccdTx'], ['diaChiTx', 'diaChiTx'], ['ngayCapTx', 'ngayCapTx'], ['noiCapTx', 'noiCapTx'], ['gplx', 'gplx'], ['hanGplx', 'hanGplx'], ['hanDangKiem', 'kdDen'], ['hanBaoHiem', 'hanBH']].concat(CHU_XE.map(k => [k, k]));
  const chep = (d, goc, map) => { const r = Object.assign({}, goc || {}); map.forEach(([dk, lk]) => { if (trim(d[dk])) r[lk] = d[dk]; }); r._dmNgay = trim(d.ngayCapNhat); return r; };
  const chupLaoDong = (d, goc) => chep(d, goc, MAP_LD);
  const chupXe = (d, goc) => chep(d, goc, MAP_XE);
  /* so bản chụp trong lô với dòng danh mục: chỉ các trường danh mục CÓ giá trị và khác lô (danh mục trống không bao giờ bị báo là “mới hơn”) */
  const khacMap = (r, d, cols) => cols.filter(([dk, lk]) => trim(d[dk]) && trim(r[lk]) !== trim(d[dk])).map(x => x[2]);
  const KHAC_LD = [['ten', 'ten', 'họ tên'], ['ngaySinh', 'ngaySinh', 'ngày sinh'], ['ngayCap', 'ngayCap', 'ngày cấp'], ['noiCap', 'noiCap', 'nơi cấp'], ['diaChi', 'diaChi', 'thường trú']];
  const KHAC_XE = [['chuXe', 'chuXe', 'chủ xe'], ['cccd', 'cccd', 'CCCD chủ xe'], ['taiXe', 'taiXe', 'tài xế'], ['cccdTx', 'cccdTx', 'CCCD tài xế'], ['gplx', 'gplx', 'số giấy phép'], ['hanGplx', 'hanGplx', 'hạn giấy phép'], ['hanDangKiem', 'kdDen', 'hạn đăng kiểm'], ['hanBaoHiem', 'hanBH', 'hạn bảo hiểm']];
  const khacLaoDong = (r, d) => khacMap(r, d, KHAC_LD);
  const khacXe = (r, d) => khacMap(r, d, KHAC_XE);
  /* dòng danh mục có ngày cập nhật MỚI HƠN lần chụp của dòng lô? (lô chưa có ngày chụp: coi là chụp từ rất lâu) */
  const moiHonChup = (r, d) => ngayKey(d && d.ngayCapNhat) > ngayKey(r && r._dmNgay);
  /* điều cần đề nghị cập nhật: chỉ khi danh mục mới hơn lần chụp VÀ có trường khác; lô sửa sau danh mục thì không đề nghị lùi về số cũ */
  const lechLaoDong = (r, d) => moiHonChup(r, d) ? khacLaoDong(r, d) : [];
  const lechXe = (r, d) => moiHonChup(r, d) ? khacXe(r, d) : [];
  const boDmNgay = x => { const c = Object.assign({}, x); delete c._dmNgay; return JSON.stringify(c); };

  /* DỰNG danh mục từ dữ liệu 2.0 (nâng cấp SQLite v7, một chiều): mỗi nhân công / xe của mỗi lô thành một dòng có ngày cập nhật = ngày bắt đầu khai thác của lô (lô chưa có ngày: để trống = cũ nhất). Tham số `homNay` dành cho nơi gọi cần ngày mặc định.
   * Lô mới hơn cho dòng mới hơn; cùng ngày thì thay dòng cũ. rs = db.rs (chủ rừng → forests). Trả {laoDong, xe} (không ghi đè danh mục đã có: người gọi chỉ dùng khi chưa có). */
  function dungTuLo(rs, homNay) {
    let ld = [], xe = [];
    const lots = []; Object.values(rs || {}).forEach(o => Object.values((o && o.forests) || {}).forEach(f => lots.push(f)));
    lots.sort((a, b) => ngayKey(a.info && a.info.tuNgay) - ngayKey(b.info && b.info.tuNgay));
    lots.forEach(f => {
      const ngay = trim(f.info && f.info.tuNgay) && ngayKey(f.info.tuNgay) ? trim(f.info.tuNgay) : '';   // lô chưa có ngày bắt đầu: dòng chưa rõ ngày (coi là cũ nhất, luôn thua dòng có ngày)
      (f.nc || []).forEach(r => {
        if (!r || !cccdHopLe(r.cccd) || !trim(r.ten)) return;
        const row = {ngayCapNhat: ngay, cccd: cccdSo(r.cccd), ten: trim(r.ten), gioiTinh: trim(r.gioiTinh), ngaySinh: trim(r.ngaySinh), diaChi: trim(r.diaChi), ngayCap: trim(r.ngayCap), noiCap: trim(r.noiCap), sdt: trim(r.sdt), chucVu: CHUC_VU.includes(trim(r.vaiTro)) ? trim(r.vaiTro) : '', viTri: trim(r.chucDanh)};
        ld = themLaoDong(ld, row).list;
      });
      (f.dx || []).forEach(r => {
        if (!r || !bienKey(r.bienSo)) return;
        const row = {ngayCapNhat: ngay, bienSo: trim(r.bienSo).toUpperCase(), chuXe: trim(r.chuXe), taiXe: trim(r.taiXe), cccdTx: cccdSo(r.cccdTx), diaChiTx: trim(r.diaChiTx), ngayCapTx: trim(r.ngayCapTx), noiCapTx: trim(r.noiCapTx), gplx: trim(r.gplx), hanGplx: trim(r.hanGplx), hanDangKiem: trim(r.kdDen), hanBaoHiem: trim(r.hanBH)};
        CHU_XE.forEach(k => { row[k] = k === 'cccd' ? cccdSo(r[k]) : trim(r[k]); });
        xe = themXe(xe, row).list;
      });
    });
    return {laoDong: ld, xe};
  }
  /* ĐỐI TÁC (bản 2.2, mục 1 điểm 3): mọi đội xe có MỘT đối tác ký. Doanh nghiệp: dòng của danh mục đơn vị vận chuyển (id 'dn:<donViId>'); cá nhân: người ký (chủ xe hoặc tài xế) theo CCCD (id 'ct:<CCCD>').
   * `doiTacKey(h)` suy ra khóa đối tác của một đội xe mà KHÔNG ghi gì vào lô (bản in không đổi). */
  /* id đối tác: 'dn:<mã>' doanh nghiệp, 'ct:<CCCD>' hoặc 'dt<N>' cá nhân. Đội xe cũ trỏ id của danh mục đơn vị vận chuyển ('dv1'): chuanDoiTacId đưa về 'dn:dv1', nên đội xe cũ vẫn trỏ đúng sau khi gộp mà KHÔNG phải sửa lô nào. */
  const chuanDoiTacId = id => { const v = trim(id); return /^dv\d+$/.test(v) ? 'dn:' + v : v; };
  const timDoiTac = (list, id) => { const k = chuanDoiTacId(id); return k ? (list || []).find(x => x && x.id === k) || null : null; };
  const doiTacKey = h => !h ? '' : h.donViId ? chuanDoiTacId(h.donViId) : (cccdSo(h.key) ? 'ct:' + cccdSo(h.key) : '');
  /* MỘT NGUỒN cho đối tác (bản 2.2 sửa lỗi, migration v10): doanh nghiệp của danh mục đơn vị vận chuyển cũ (dmDonViVC) được gộp vào dmDoiTac (id 'dn:<mã>') rồi dmDonViVC bỏ đi.
   * dmDonViVC là nơi duy nhất từng cho SỬA doanh nghiệp nên dòng 'dn:' có cùng mã được cập nhật theo nó (không mất dòng nào, không thêm trùng). Không sửa đầu vào. Trả {list, gop, them, lech}. */
  function hopNhatDoiTac(dmDonVi, dmDoiTac) {
    const list = clone(dmDoiTac || []), o = {list, gop: 0, them: 0, lech: 0};
    Object.entries(dmDonVi || {}).forEach(([k, d]) => {
      if (!d || !trim(d.ten)) return; const id = 'dn:' + trim(d.id || k), row = {id, loai: 'doanhnghiep', ten: trim(d.ten), mst: trim(d.mst), daiDien: trim(d.daiDien), chucVu: trim(d.chucVu), diaChi: trim(d.diaChi), sdt: trim(d.sdt)};
      const i = list.findIndex(x => x && x.id === id); o.gop++;
      if (i < 0) { list.push(row); o.them++; } else { if (JSON.stringify(list[i]) !== JSON.stringify(row)) o.lech++; list[i] = row; }
    });
    return o;
  }
  function dungDoiTac(rs, dmDonVi, hienCo) {
    const list = (hienCo || []).slice(), co = new Set(list.map(x => x.id)), cc = new Set(list.map(x => cccdSo(x.cccd)).filter(Boolean));
    Object.values(dmDonVi || {}).forEach(d => { if (!d || !trim(d.ten)) return; const id = 'dn:' + d.id; if (co.has(id)) return; co.add(id); list.push({id, loai: 'doanhnghiep', ten: trim(d.ten), mst: trim(d.mst), daiDien: trim(d.daiDien), chucVu: trim(d.chucVu), diaChi: trim(d.diaChi), sdt: trim(d.sdt)}); });
    Object.values(rs || {}).forEach(o => Object.values((o && o.forests) || {}).forEach(f => (f.hdvc || []).forEach(h => {
      if (!h || h.donViId) return; const k = cccdSo(h.key); if (!cccdHopLe(k) || cc.has(k)) return;
      const xs = (f.dx || []).filter(r => r && r.hdvcId === h.id); let p = null;
      xs.forEach(r => { if (p) return; if (cccdSo(r.cccd) === k && trim(r.chuXe)) p = {ten: trim(r.chuXe), ngaySinh: trim(r.ngaySinh), diaChi: trim(r.diaChi), ngayCap: trim(r.ngayCap), noiCap: trim(r.noiCap), sdt: trim(r.sdt), vaiTro: 'Chủ xe'}; else if (cccdSo(r.cccdTx) === k && trim(r.taiXe)) p = {ten: trim(r.taiXe), ngaySinh: trim(r.ngaySinhTx), diaChi: trim(r.diaChiTx), ngayCap: trim(r.ngayCapTx), noiCap: trim(r.noiCapTx), sdt: '', vaiTro: 'Tài xế'}; });
      if (!p) return; cc.add(k); list.push(Object.assign({id: 'ct:' + k, loai: 'nguoiKyVC', cccd: k}, p));
    })));
    return list;
  }
  /* TẠO LÔ TỪ LÔ CŨ (bản 2.2, mục 11.3 điểm 8): chép đội khai thác (hình thức, đơn giá theo vị trí), nhân công, đội xe, xe, cước, công ty mua; KHÔNG chép phiếu cân, chấm công,
   * số và ngày văn bản, trạng thái in, thời gian khai thác, diện tích, tọa độ. Người và xe lấy dòng MỚI NHẤT của danh mục (vai trò, vị trí, đội trong lô nguồn giữ nguyên).
   * src: lô nguồn (không bị sửa). o: {id, maRung, tenRung, dmLaoDong, dmXe}. Trả {f, nguoi, xe}: số người, xe được làm mới từ danh mục. */
  /* khóa của lô được chép sang lô mới (DANH SÁCH TRẮNG): mọi khóa khác — vòng đời (chot, luuTru, dung, nhatKy), nhật ký nạp, tham chiếu tra cứu, trạng thái in/ký, nhật ký biến động, lịch sử STT, tệp nhập — không bao giờ sang lô mới */
  const KHUNG_LO = ['id', 'info', 'doi', 'nc', 'hdvc', 'dx'];
  function loTuLoCu(src, o) {
    const copy = JSON.parse(JSON.stringify(src || {})), f = {}, ma = trim(o && o.maRung);
    KHUNG_LO.forEach(k => { if (k in copy) f[k] = copy[k]; });
    const inf = f.info = f.info || {};
    f.id = o.id; inf.maRung = ma; inf.tenRung = trim(o.tenRung) || ma;
    ['tuNgay', 'denNgay'].forEach(k => { inf[k] = ''; });
    ['dienTich', 'lat', 'lng', 'cuLy', 'dinhMucTanHa', 'dinhMucNgayHa', 'khoiLuong', 'klHoSoCu', '_klPC'].forEach(k => { if (k in inf) inf[k] = null; });
    inf.diaDiem = ''; inf.giayTo = []; if (inf.muaHang) inf.muaHang = Object.assign({}, inf.muaHang, {xacNhan: ''});
    f.pc = []; f.exp = {};
    (f.doi || []).forEach(d => { d.exp = {}; delete d.stt; d.dienTich = null; if (d.hinhThuc) d.hinhThuc.ngayBDLD = ''; });
    (f.hdvc || []).forEach(h => { h.exp = {}; delete h.stt; });
    let nguoi = 0, xe = 0;
    f.nc = (f.nc || []).map(r => {
      const x = Object.assign({}, r, {maRung: ma}); delete x._nguon; const m = layLaoDong(o.dmLaoDong || [], r.cccd);
      if (!m) return x; const moi = chupLaoDong(m.row, x); moi.vaiTro = r.vaiTro; moi.chucDanh = r.chucDanh; if (boDmNgay(moi) !== boDmNgay(x)) nguoi++; return moi;
    });
    f.dx = (f.dx || []).map(r => {
      const x = Object.assign({}, r, {maRung: ma}); delete x._nguon; const m = layXe(o.dmXe || [], r.bienSo);
      if (!m) return x; const moi = chupXe(m.row, x); if (boDmNgay(moi) !== boDmNgay(x)) xe++; return moi;
    });
    return {f, nguoi, xe};
  }
  /* NGƯỜI CHUNG (bản 2.2, mục 6.3): một người = một CCCD, dù là lao động, tài xế hay đối tác cá nhân. Dựng từ ba danh mục (không thêm bảng): thông tin lấy từ dòng MỚI NHẤT
   * (danh mục lao động và xe có ngày cập nhật; đối tác không có ngày thì coi là cũ nhất), chỗ trống bù từ các nguồn còn lại. vaiTro: các danh mục người đó có mặt. */
  function nguoiChung(db) {
    const by = new Map(), put = (cccd, vai, ngay, o) => {
      const k = cccdSo(cccd); if (!cccdHopLe(k)) return; const e = by.get(k) || {cccd: k, vaiTro: [], ds: []};
      if (!e.vaiTro.includes(vai)) e.vaiTro.push(vai); e.ds.push(Object.assign({k: ngayKey(ngay)}, o)); by.set(k, e);
    };
    (db.dmLaoDong || []).forEach(r => put(r.cccd, 'Lao động', r.ngayCapNhat, {ten: trim(r.ten), gioiTinh: trim(r.gioiTinh), ngaySinh: trim(r.ngaySinh), diaChi: trim(r.diaChi), ngayCap: trim(r.ngayCap), noiCap: trim(r.noiCap), sdt: trim(r.sdt)}));
    (db.dmXeVC || []).forEach(r => put(r.cccdTx, 'Tài xế', r.ngayCapNhat, {ten: trim(r.taiXe), diaChi: trim(r.diaChiTx), ngayCap: trim(r.ngayCapTx), noiCap: trim(r.noiCapTx)}));
    (db.dmDoiTac || []).filter(r => r && r.loai !== 'doanhnghiep').forEach(r => put(r.cccd, 'Đối tác', '', {ten: trim(r.ten), ngaySinh: trim(r.ngaySinh), diaChi: trim(r.diaChi), ngayCap: trim(r.ngayCap), noiCap: trim(r.noiCap), sdt: trim(r.sdt)}));
    return [...by.values()].map(e => {
      const ds = e.ds.slice().reverse().sort((a, b) => b.k - a.k), o = {cccd: e.cccd, vaiTro: e.vaiTro, ngayCapNhat: ''};
      ['ten', 'gioiTinh', 'ngaySinh', 'diaChi', 'ngayCap', 'noiCap', 'sdt'].forEach(f => { const x = ds.find(d => trim(d[f])); o[f] = x ? x[f] : ''; });
      return o;
    }).sort((a, b) => String(a.ten).localeCompare(String(b.ten), 'vi'));
  }
  const timNguoi = (db, cccd) => nguoiChung(db).find(x => x.cccd === cccdSo(cccd)) || null;
  /* GỘP HAI NGƯỜI: mọi dòng của CCCD `tu` (lao động, tài xế của xe, đối tác) chuyển sang CCCD `den`, giữ nguyên lịch sử. Không động tới bản chụp trong lô (hồ sơ đã in không đổi).
   * Trả {ok, error} hoặc {ok, db: {dmLaoDong, dmXeVC, dmDoiTac}, so: {laoDong, xe, doiTac}} — không sửa `db` truyền vào. */
  function gopNguoi(db, tu, den) {
    const a = cccdSo(tu), b = cccdSo(den);
    if (!cccdHopLe(a) || !cccdHopLe(b)) return {ok: false, error: 'Cả hai số CCCD phải có 9 hoặc 12 chữ số'};
    if (a === b) return {ok: false, error: 'Hai số CCCD giống nhau'};
    if (!timNguoi(db, a)) return {ok: false, error: 'Không có người mang CCCD ' + a + ' trong danh mục'};
    const so = {laoDong: 0, xe: 0, doiTac: 0}, cp = x => JSON.parse(JSON.stringify(x || []));
    let ld = cp(db.dmLaoDong).map(r => { if (cccdSo(r.cccd) === a) { so.laoDong++; return Object.assign(r, {cccd: b}); } return r; });
    const seen = new Set(); ld = ld.filter(r => { const k = cccdSo(r.cccd) + '|' + trim(r.ngayCapNhat); if (seen.has(k) && cccdSo(r.cccd) === b) return false; seen.add(k); return true; });   // cùng người cùng ngày sau khi gộp: giữ dòng đầu
    const xe = cp(db.dmXeVC).map(r => { if (cccdSo(r.cccdTx) === a) { so.xe++; return Object.assign(r, {cccdTx: b}); } return r; });
    let dt = cp(db.dmDoiTac).map(r => { if (r.loai !== 'doanhnghiep' && cccdSo(r.cccd) === a) { so.doiTac++; return Object.assign(r, {cccd: b}); } return r; });
    const sc = new Set(); dt = dt.filter(r => { if (r.loai === 'doanhnghiep') return true; const k = cccdSo(r.cccd); if (k === b && sc.has(k)) return false; if (k === b) sc.add(k); return true; });
    return {ok: true, db: {dmLaoDong: ld, dmXeVC: xe, dmDoiTac: dt}, so};
  }
  /* NGÀY CHỤP CHO DÒNG CŨ (bản 2.2, A4): nhân công / xe nhập trước khi có _dmNgay coi như đã chụp danh mục đúng lúc nâng cấp
   * (ngày cập nhật của dòng danh mục hiện hành khớp CCCD / biển số; dòng danh mục không có ngày hoặc không khớp: ngày nâng cấp `homNay`).
   * Nhờ vậy chỉ thay đổi danh mục SAU khi nâng cấp mới được đề nghị "Cập nhật từ danh mục". Sửa trực tiếp f; trả số dòng đã gán. Chạy lại không đổi. */
  function ganNgayChup(f, dmLaoDong, dmXe, homNay) {
    if (!f || f.chot || f.dung) return 0;   // lô đã chốt / đã dừng: không đổi dữ liệu (giữ nguyên dấu vân tay của gói đã chốt, không vướng khóa chỉ đọc)
    let n = 0; const hn = trim(homNay);
    const gan = (r, m) => { if (!r || typeof r !== 'object' || Object.prototype.hasOwnProperty.call(r, '_dmNgay')) return; const d = m && trim(m.row.ngayCapNhat) && ngayKey(m.row.ngayCapNhat) ? trim(m.row.ngayCapNhat) : hn; r._dmNgay = d; n++; };
    const can = r => r && typeof r === 'object' && !Object.prototype.hasOwnProperty.call(r, '_dmNgay');   // dòng đã có ngày chụp: không tra danh mục (mở app với danh mục lớn: mỗi lần tra duyệt cả danh mục)
    ((f && f.nc) || []).forEach(r => { if (can(r)) gan(r, layLaoDong(dmLaoDong || [], r.cccd)); });
    ((f && f.dx) || []).forEach(r => { if (can(r)) gan(r, layXe(dmXe || [], r.bienSo)); });
    return n;
  }
  const api = {ganNgayChup, chuanDoiTacId, timDoiTac, hopNhatDoiTac, KHUNG_LO, CHUC_VU, LAO_DONG, XE, cccdSo, bienKey, layLaoDong, layXe, lichSuLaoDong, lichSuXe, laoDongHieuLuc, xeHieuLuc, kiemLaoDong, kiemXe, themLaoDong, themXe, chupLaoDong, chupXe, khacLaoDong, khacXe, lechLaoDong, lechXe, moiHonChup, CHU_XE, dungTuLo, doiTacKey, dungDoiTac, loTuLoCu, nguoiChung, timNguoi, gopNguoi};
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.HAKDanhMuc = api;
})(typeof self !== 'undefined' ? self : this);
