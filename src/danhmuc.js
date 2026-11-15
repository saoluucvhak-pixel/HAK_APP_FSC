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
  const D = typeof HAKDates !== 'undefined' ? HAKDates : (typeof require === 'function' ? require('./dates.js') : root.HAKDates);
  const trim = s => String(s == null ? '' : s).replace(/\s+/g, ' ').trim();
  const CHUC_VU = ['Tổ trưởng', 'Công nhân'];
  const cccdSo = v => String(v == null ? '' : v).replace(/\D/g, '');
  const bienKey = v => String(v == null ? '' : v).toUpperCase().replace(/[\s.\-]/g, '');
  const ngayKey = v => { const p = D.parse(trim(v)); return p ? p.key : 0; };
  const clone = x => JSON.parse(JSON.stringify(x));
  const LAO_DONG = ['ngayCapNhat', 'cccd', 'ten', 'gioiTinh', 'ngaySinh', 'diaChi', 'ngayCap', 'noiCap', 'sdt', 'chucVu', 'viTri'];
  const XE = ['ngayCapNhat', 'bienSo', 'chuXe', 'taiXe', 'cccdTx', 'diaChiTx', 'ngayCapTx', 'noiCapTx', 'gplx', 'hanGplx', 'hanDangKiem', 'hanBaoHiem'];

  /* chọn dòng hiệu lực: ngày cập nhật lớn nhất; cùng ngày thì dòng ở vị trí sau (thêm sau) */
  function moiNhat(list, keyFn, k) {
    let best = null, bi = -1;
    (list || []).forEach((r, i) => { if (!r || keyFn(r) !== k) return; const t = ngayKey(r.ngayCapNhat); if (!best || t >= best.t) { best = {t, r}; bi = i; } });
    return best ? {row: best.r, index: bi} : null;
  }
  const layLaoDong = (list, cccd) => { const k = cccdSo(cccd); return k.length === 12 ? moiNhat(list, r => cccdSo(r.cccd), k) : null; };
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
  const laoDongHieuLuc = list => hieuLuc(list, r => { const k = cccdSo(r.cccd); return k.length === 12 ? k : ''; }, (a, b) => String(a.ten).localeCompare(String(b.ten), 'vi'));
  const xeHieuLuc = list => hieuLuc(list, r => bienKey(r.bienSo), (a, b) => String(a.bienSo).localeCompare(String(b.bienSo), 'vi'));

  /* kiểm tra một dòng trước khi thêm; vi: danh sách tên vị trí hợp lệ (danh mục vị trí). Trả {ok, errs, row (đã chuẩn hóa)} */
  function kiemLaoDong(r, vi) {
    const o = {}; LAO_DONG.forEach(k => { o[k] = trim(r && r[k]); }); o.cccd = cccdSo(o.cccd); const errs = [];
    if (!o.ten) errs.push('thiếu họ tên');
    if (o.cccd.length !== 12) errs.push('CCCD phải đủ 12 chữ số (mã công nhân)');
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
    if (o.taiXe && o.cccdTx.length !== 12) errs.push('tài xế phải có CCCD 12 chữ số');
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

  /* chép thông tin dòng mới nhất vào bản ghi nhân công của lô (bản chụp): họ tên, ngày sinh, CCCD, ngày cấp, nơi cấp, thường trú, chức danh = vị trí, vai trò = chức vụ */
  function chupLaoDong(d, goc) {
    const r = Object.assign({}, goc || {});
    r.ten = d.ten; r.cccd = d.cccd; r.ngaySinh = d.ngaySinh; r.ngayCap = d.ngayCap; r.noiCap = d.noiCap; r.diaChi = d.diaChi;
    if (d.viTri) r.chucDanh = d.viTri; if (d.chucVu) r.vaiTro = d.chucVu; if (d.sdt) r.sdt = d.sdt; if (d.gioiTinh) r.gioiTinh = d.gioiTinh;
    return r;
  }
  /* chép dòng xe mới nhất vào bản ghi xe của lô: biển số, chủ xe, tài xế (CCCD, thường trú, ngày cấp, nơi cấp), giấy phép, hạn đăng kiểm, hạn bảo hiểm */
  function chupXe(d, goc) {
    const r = Object.assign({}, goc || {});
    r.bienSo = d.bienSo; r.chuXe = d.chuXe || r.chuXe; r.taiXe = d.taiXe; r.cccdTx = d.cccdTx; r.diaChiTx = d.diaChiTx; r.ngayCapTx = d.ngayCapTx; r.noiCapTx = d.noiCapTx;
    r.gplx = d.gplx; r.hanGplx = d.hanGplx; r.kdDen = d.hanDangKiem; r.hanBH = d.hanBaoHiem;
    return r;
  }
  /* so bản chụp trong lô với dòng mới nhất của danh mục: các trường khác nhau (để nhắc “Cập nhật từ danh mục”) */
  const khacLaoDong = (r, d) => [['ten', 'họ tên'], ['ngaySinh', 'ngày sinh'], ['ngayCap', 'ngày cấp'], ['noiCap', 'nơi cấp'], ['diaChi', 'thường trú']].filter(([k]) => trim(r[k]) !== trim(d[k])).map(x => x[1]);
  const khacXe = (r, d) => [['taiXe', 'tài xế'], ['cccdTx', 'CCCD tài xế'], ['gplx', 'số giấy phép'], ['hanGplx', 'hạn giấy phép'], ['kdDen', 'hạn đăng kiểm', 'hanDangKiem'], ['hanBH', 'hạn bảo hiểm', 'hanBaoHiem']].filter(([k, , dk]) => trim(r[k]) !== trim(d[dk || k])).map(x => x[1]);

  /* DỰNG danh mục từ dữ liệu 2.0 (nâng cấp SQLite v7, một chiều): mỗi nhân công / xe của mỗi lô thành một dòng có ngày cập nhật = ngày bắt đầu khai thác của lô (lô chưa có ngày: để trống = cũ nhất). Tham số `homNay` dành cho nơi gọi cần ngày mặc định.
   * Lô mới hơn cho dòng mới hơn; cùng ngày thì thay dòng cũ. rs = db.rs (chủ rừng → forests). Trả {laoDong, xe} (không ghi đè danh mục đã có: người gọi chỉ dùng khi chưa có). */
  function dungTuLo(rs, homNay) {
    let ld = [], xe = [];
    const lots = []; Object.values(rs || {}).forEach(o => Object.values((o && o.forests) || {}).forEach(f => lots.push(f)));
    lots.sort((a, b) => ngayKey(a.info && a.info.tuNgay) - ngayKey(b.info && b.info.tuNgay));
    lots.forEach(f => {
      const ngay = trim(f.info && f.info.tuNgay) && ngayKey(f.info.tuNgay) ? trim(f.info.tuNgay) : '';   // lô chưa có ngày bắt đầu: dòng chưa rõ ngày (coi là cũ nhất, luôn thua dòng có ngày)
      (f.nc || []).forEach(r => {
        if (!r || cccdSo(r.cccd).length !== 12 || !trim(r.ten)) return;
        const row = {ngayCapNhat: ngay, cccd: cccdSo(r.cccd), ten: trim(r.ten), gioiTinh: trim(r.gioiTinh), ngaySinh: trim(r.ngaySinh), diaChi: trim(r.diaChi), ngayCap: trim(r.ngayCap), noiCap: trim(r.noiCap), sdt: trim(r.sdt), chucVu: CHUC_VU.includes(trim(r.vaiTro)) ? trim(r.vaiTro) : '', viTri: trim(r.chucDanh)};
        ld = themLaoDong(ld, row).list;
      });
      (f.dx || []).forEach(r => {
        if (!r || !bienKey(r.bienSo)) return;
        const row = {ngayCapNhat: ngay, bienSo: trim(r.bienSo).toUpperCase(), chuXe: trim(r.chuXe), taiXe: trim(r.taiXe), cccdTx: cccdSo(r.cccdTx), diaChiTx: trim(r.diaChiTx), ngayCapTx: trim(r.ngayCapTx), noiCapTx: trim(r.noiCapTx), gplx: trim(r.gplx), hanGplx: trim(r.hanGplx), hanDangKiem: trim(r.kdDen), hanBaoHiem: trim(r.hanBH)};
        xe = themXe(xe, row).list;
      });
    });
    return {laoDong: ld, xe};
  }
  /* ĐỐI TÁC (bản 2.2, mục 1 điểm 3): mọi đội xe có MỘT đối tác ký. Doanh nghiệp: dòng của danh mục đơn vị vận chuyển (id 'dn:<donViId>'); cá nhân: người ký (chủ xe hoặc tài xế) theo CCCD (id 'ct:<CCCD>').
   * `doiTacKey(h)` suy ra khóa đối tác của một đội xe mà KHÔNG ghi gì vào lô (bản in không đổi). */
  const doiTacKey = h => !h ? '' : h.donViId ? 'dn:' + h.donViId : (cccdSo(h.key) ? 'ct:' + cccdSo(h.key) : '');
  function dungDoiTac(rs, dmDonVi, hienCo) {
    const list = (hienCo || []).slice(), co = new Set(list.map(x => x.id)), cc = new Set(list.map(x => cccdSo(x.cccd)).filter(Boolean));
    Object.values(dmDonVi || {}).forEach(d => { if (!d || !trim(d.ten)) return; const id = 'dn:' + d.id; if (co.has(id)) return; co.add(id); list.push({id, loai: 'doanhnghiep', ten: trim(d.ten), mst: trim(d.mst), daiDien: trim(d.daiDien), chucVu: trim(d.chucVu), diaChi: trim(d.diaChi), sdt: trim(d.sdt)}); });
    Object.values(rs || {}).forEach(o => Object.values((o && o.forests) || {}).forEach(f => (f.hdvc || []).forEach(h => {
      if (!h || h.donViId) return; const k = cccdSo(h.key); if (k.length !== 12 || cc.has(k)) return;
      const xs = (f.dx || []).filter(r => r && r.hdvcId === h.id); let p = null;
      xs.forEach(r => { if (p) return; if (cccdSo(r.cccd) === k && trim(r.chuXe)) p = {ten: trim(r.chuXe), ngaySinh: trim(r.ngaySinh), diaChi: trim(r.diaChi), ngayCap: trim(r.ngayCap), noiCap: trim(r.noiCap), sdt: trim(r.sdt)}; else if (cccdSo(r.cccdTx) === k && trim(r.taiXe)) p = {ten: trim(r.taiXe), ngaySinh: trim(r.ngaySinhTx), diaChi: trim(r.diaChiTx), ngayCap: trim(r.ngayCapTx), noiCap: trim(r.noiCapTx), sdt: ''}; });
      if (!p) return; cc.add(k); list.push(Object.assign({id: 'ct:' + k, loai: 'nguoiKyVC', cccd: k}, p));
    })));
    return list;
  }
  /* TẠO LÔ TỪ LÔ CŨ (bản 2.2, mục 11.3 điểm 8): chép đội khai thác (hình thức, đơn giá theo vị trí), nhân công, đội xe, xe, cước, công ty mua; KHÔNG chép phiếu cân, chấm công,
   * số và ngày văn bản, trạng thái in, thời gian khai thác, diện tích, tọa độ. Người và xe lấy dòng MỚI NHẤT của danh mục (vai trò, vị trí, đội trong lô nguồn giữ nguyên).
   * src: lô nguồn (không bị sửa). o: {id, maRung, tenRung, dmLaoDong, dmXe}. Trả {f, nguoi, xe}: số người, xe được làm mới từ danh mục. */
  function loTuLoCu(src, o) {
    const f = JSON.parse(JSON.stringify(src || {})), ma = trim(o && o.maRung), inf = f.info = f.info || {};
    f.id = o.id; inf.maRung = ma; inf.tenRung = trim(o.tenRung) || ma;
    ['tuNgay', 'denNgay'].forEach(k => { inf[k] = ''; });
    ['dienTich', 'lat', 'lng', 'cuLy', 'dinhMucTanHa', 'dinhMucNgayHa', 'khoiLuong', 'klHoSoCu', '_klPC'].forEach(k => { if (k in inf) inf[k] = null; });
    inf.diaDiem = ''; inf.giayTo = []; if (inf.muaHang) inf.muaHang = Object.assign({}, inf.muaHang, {xacNhan: ''});
    f.pc = []; delete f.cc; f.exp = {}; delete f.inDot2; delete f.inAn; delete f.bienLog;
    ['ncFile', 'ncAt', 'dxFile', 'dxAt', 'pcFile', 'pcAt'].forEach(k => { if (k in f) f[k] = ''; });
    (f.doi || []).forEach(d => { d.exp = {}; d.dienTich = null; if (d.hinhThuc) d.hinhThuc.ngayBDLD = ''; });
    (f.hdvc || []).forEach(h => { h.exp = {}; });
    let nguoi = 0, xe = 0;
    f.nc = (f.nc || []).map(r => {
      const x = Object.assign({}, r, {maRung: ma}); delete x._nguon; const m = layLaoDong(o.dmLaoDong || [], r.cccd);
      if (!m) return x; const moi = chupLaoDong(m.row, x); moi.vaiTro = r.vaiTro; moi.chucDanh = r.chucDanh; if (JSON.stringify(moi) !== JSON.stringify(x)) nguoi++; return moi;
    });
    f.dx = (f.dx || []).map(r => {
      const x = Object.assign({}, r, {maRung: ma}); delete x._nguon; const m = layXe(o.dmXe || [], r.bienSo);
      if (!m) return x; const moi = chupXe(m.row, x); if (JSON.stringify(moi) !== JSON.stringify(x)) xe++; return moi;
    });
    return {f, nguoi, xe};
  }
  /* NGƯỜI CHUNG (bản 2.2, mục 6.3): một người = một CCCD, dù là lao động, tài xế hay đối tác cá nhân. Dựng từ ba danh mục (không thêm bảng): thông tin lấy từ dòng MỚI NHẤT
   * (danh mục lao động và xe có ngày cập nhật; đối tác không có ngày thì coi là cũ nhất), chỗ trống bù từ các nguồn còn lại. vaiTro: các danh mục người đó có mặt. */
  function nguoiChung(db) {
    const by = new Map(), put = (cccd, vai, ngay, o) => {
      const k = cccdSo(cccd); if (k.length !== 12) return; const e = by.get(k) || {cccd: k, vaiTro: [], ds: []};
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
    if (a.length !== 12 || b.length !== 12) return {ok: false, error: 'Cả hai số CCCD phải đủ 12 chữ số'};
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
  const api = {CHUC_VU, LAO_DONG, XE, cccdSo, bienKey, layLaoDong, layXe, lichSuLaoDong, lichSuXe, laoDongHieuLuc, xeHieuLuc, kiemLaoDong, kiemXe, themLaoDong, themXe, chupLaoDong, chupXe, khacLaoDong, khacXe, dungTuLo, doiTacKey, dungDoiTac, loTuLoCu, nguoiChung, timNguoi, gopNguoi};
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.HAKDanhMuc = api;
})(typeof self !== 'undefined' ? self : this);
