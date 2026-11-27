/* ========== Nhập theo hợp đồng từ Danh mục (bản 2.1, giai đoạn C) ==========
 * - Chọn người / xe từ danh mục khi thêm vào lô (lô chụp lại thông tin, hồ sơ đã in không đổi khi danh mục đổi sau này).
 * - Người / xe MỚI nhập trong lô được ghi luôn vào danh mục khi lưu lô (không nhập hai nơi).
 * - Nút “Cập nhật từ danh mục”: làm mới có chủ ý bản chụp trong bản nháp của lô. */
const dmNguonLd = () => {
  /* 3.0: trước hết người có chức vụ Nhân công trong Danh mục đối tượng (nhãn: đối tượng — người); sau đó danh mục lao động cũ và người đã có ở các lô (chưa có trong danh mục mới) */
  const moi = HAKDoiTuong.nguoiTheoVaiTro(dmDT(), 'nhanCong').filter(({dt, ng}) => HAKNganh.hopNganh(db, dt, ng, HAKNganh.KT)).map(({dt, ng}) => ({ngayCapNhat: dt.ngayCapNhat || '', cccd: HAKDanhMuc.cccdSo(ng.cccd), ten: ng.hoTen, gioiTinh: ng.gioiTinh || '', ngaySinh: ng.ngaySinh || '', diaChi: ng.diaChi || '', ngayCap: ng.ngayCap || '', noiCap: ng.noiCap || '',
  sdt: ng.sdt || '',
    chucVu: '', viTri: ten30(ng.viTriId), _ngId: ng.id, _viTriId: ng.viTriId || '', _nhan: HAKDoiTuong.nhanNguoi(dt, ng)})).filter(r => trim(r.ten));
  const coMoi = new Set(moi.map(r => r.cccd).filter(Boolean));
  const dm = HAKDanhMuc.laoDongHieuLuc(db.dmLaoDong || []).filter(r => !coMoi.has(HAKDanhMuc.cccdSo(r.cccd))), co = new Set(dm.map(r => HAKDanhMuc.cccdSo(r.cccd)).concat([...coMoi]));
  const them = HAKModel.nguoiDanhMuc(db.rs).filter(r => !co.has(HAKDanhMuc.cccdSo(r.cccd))).map(r => ({ngayCapNhat: '', cccd: HAKDanhMuc.cccdSo(r.cccd), ten: r.ten, gioiTinh: '', ngaySinh: r.ngaySinh || '', diaChi: r.diaChi || '', ngayCap: r.ngayCap || '', noiCap: r.noiCap || '', sdt: r.sdt || '',
  chucVu: r.vaiTro || '', viTri: r.chucDanh || ''}));
  return moi.concat(dm.concat(them).sort((a, b) => String(a.ten).localeCompare(String(b.ten), 'vi')));
};
const dmNguonXe = () => {
  /* 3.0: trước hết xe của Danh mục xe (chủ xe theo ID); sau đó danh mục xe cũ và xe đã có ở các lô */
  const xeId = b => (HAKXeDM.timBks(dmXE(), b) || {}).id || '', taiId = b => (HAKXeDM.timBks(dmXE(), b) || {}).taiXeId || '';   // taiId: tài xế thường chạy gắn ở Danh mục xe
  const cu = HAKDanhMuc.xeHieuLuc(db.dmXeVC || []).map(x => Object.assign({}, x, {_xeId: xeId(x.bienSo), _taiXeId: taiId(x.bienSo)})), coCu = new Set(cu.map(r => HAKDanhMuc.bienKey(r.bienSo)));   // dòng cũ đầy đủ hơn (tài xế, cà vẹt): giữ, nối ID xe mới
  const moi = dmCu().dmXeVC.filter(x => x.bienSo && !coCu.has(HAKDanhMuc.bienKey(x.bienSo))).map(x => Object.assign(x, {_xeId: xeId(x.bienSo), _taiXeId: taiId(x.bienSo)}));
  const dm = cu.concat(moi), co = new Set(dm.map(r => HAKDanhMuc.bienKey(r.bienSo)));
  const them = xeDanhMuc().filter(r => !co.has(HAKDanhMuc.bienKey(r.bienSo))).map(r => ({ngayCapNhat: '', bienSo: r.bienSo, chuXe: r.chuXe || '', taiXe: r.taiXe || '', cccdTx: r.cccdTx || '', diaChiTx: r.diaChiTx || '', ngayCapTx: r.ngayCapTx || '', noiCapTx: r.noiCapTx || '', gplx: r.gplx || '',
  hanGplx: r.hanGplx || '', hanDangKiem: r.kdDen || '', hanBaoHiem: r.hanBH || '', loaiXe: r.loaiXe || '', cccd: r.cccd || '', ngaySinh: r.ngaySinh || '', ngayCap: r.ngayCap || '', noiCap: r.noiCap || '', diaChi: r.diaChi || '', sdt: r.sdt || '', cavet: r.cavet || '', nguoiKy: r.nguoiKy || '',
  _goc: r}));   // _goc: các trường riêng của xe ở lô cũ (chủ xe, loại xe…) để điền sẵn
  return dm.concat(them).sort((a, b) => String(a.bienSo).localeCompare(String(b.bienSo)));
};
/* điền ô hộp thoại thêm người từ một dòng danh mục */
function dmDienNguoi(d) {
  const goc = Object.assign({}, stm.vals), r = HAKDanhMuc.chupLaoDong(d, goc);
  ['ten', 'cccd', 'ngaySinh', 'ngayCap', 'noiCap', 'diaChi', 'vaiTro', 'chucDanh'].forEach(k => { if (r[k] != null) stm.vals[k] = stStr(r[k]); });
  if (d.gioiTinh) stm.vals.danhXung = d.gioiTinh === 'Nữ' ? 'Bà' : 'Ông';
  if (d._ngId) { stm.vals.nguoiId = d._ngId; if (d._viTriId) stm.vals.viTriId = d._viTriId; }   // 3.0: dòng lô nối người của Danh mục đối tượng
  stm.vals._dmNgay = trim(d.ngayCapNhat);   // ngày của dòng danh mục vừa chọn (dòng lô lưu lại để biết khi nào danh mục mới hơn)
}
function dmDienXe(d) {
  const r = HAKDanhMuc.chupXe(d, Object.assign({}, stm.vals));
  if (d._goc) ST_FIELDS.dx.forEach(([k]) => { if (k !== 'stt' && d._goc[k] != null && d._goc[k] !== '') stm.vals[k] = stStr(d._goc[k]); });
  if (d._xeId) stm.vals.xeId = d._xeId;   // 3.0: dòng xe nối xe của Danh mục xe
  ['bienSo', 'chuXe', 'taiXe', 'cccdTx', 'diaChiTx', 'ngayCapTx', 'noiCapTx', 'gplx', 'hanGplx', 'kdDen', 'hanBH'].concat(HAKDanhMuc.CHU_XE).forEach(k => { if (r[k] != null && r[k] !== '') stm.vals[k] = stStr(r[k]); });
  if (d._taiXeId) {   // tài xế thường chạy của xe (Danh mục xe): chỉ điền khi dòng chưa có tài xế (từ dòng xe cũ / lô cũ), lô chụp lại — không đổi danh mục
    const tx = HAKXeDM.taiXe(dmDT(), d._taiXeId), dien = HAKXeDM.dienTaiXeLo(tx && tx.ng, Object.assign({}, d._goc || {}, HAKDanhMuc.chupXe(d, {})), d._taiXeId);   // “đã có” tính theo nguồn của dòng vừa chọn, không theo ô còn lại của xe chọn trước đó
    Object.keys(dien).forEach(k => { stm.vals[k] = stStr(dien[k]); });
  }
  stm.vals._dmNgay = trim(d.ngayCapNhat);
}
/* phiếu #05 (ND-05, A-06) + bước 3 Danh mục: người / xe MỚI của lô vừa lưu (chưa nối, chưa có trong Danh mục đối tượng / Danh mục xe) → mở HỘP THOẠI trong ứng dụng
 * liệt kê rõ từng người / xe kèm ô tích (mặc định tích hết); “Thêm vào danh mục” chỉ thêm các dòng được tích, “Chỉ lưu trong lô” không thêm gì (Esc = Chỉ lưu trong lô).
 * Không ghi danh mục cũ dmLaoDong / dmXeVC (bản lưu trữ, màn Danh mục không hiện). Thêm xong: dòng lô nối ID người / xe vừa thêm.
 * Hộp là bất đồng bộ nên dmGhiTuLo trả null; thông báo kết quả được xếp hàng khi người dùng chọn. */
let dmHopCho = null;   // {nguoi, xe, cau, oid, fid}: lô vừa lưu đang chờ chọn
function dmHopHtml(c) {
  const hang = (kind, i, nhan, chiTiet) => '<li><label class="row" style="gap:8px;align-items:flex-start"><input type="checkbox" data-dmhop="' + kind + i + '" checked> <span>' + nhan + (chiTiet ? ' <span class="mut">' + chiTiet + '</span>' : '') + '</span></label></li>';
  const ng = c.nguoi.map((r, i) => hang('n', i, '<b>' + esc(trim(r.ten)) + '</b>', 'CCCD ' + esc(trim(r.cccd)) + ' · Vai trò: Nhân công' + (trim(r.chucDanh) ? ' (' + esc(trim(r.chucDanh)) + ')' : '')));
  const xe = c.xe.map((r, i) => hang('x', i, '<b>Xe ' + esc(trim(r.bienSo)) + '</b>', [trim(r.chuXe) ? 'Chủ xe: ' + esc(trim(r.chuXe)) : '', trim(r.taiXe) ? 'Tài xế: ' + esc(trim(r.taiXe)) : ''].filter(Boolean).join(' · ')));
  return '<div class="gh"><h2>Thêm vào danh mục để dùng lại?</h2></div><div id="dmHopDlg"><p>Lô vừa lưu có ' + esc(c.cau) + '. Chọn dòng cần thêm vào danh mục để dùng lại ở lô khác (bỏ tích dòng không cần).</p>' +
    (ng.length ? '<h3 style="margin:8px 0 4px">Người (Danh mục đối tượng)</h3><ul style="list-style:none;padding:0;margin:0">' + ng.join('') + '</ul>' : '') +
    (xe.length ? '<h3 style="margin:8px 0 4px">Xe (Danh mục xe)</h3><ul style="list-style:none;padding:0;margin:0">' + xe.join('') + '</ul>' : '') +
    '<p class="mut">“Chỉ lưu trong lô”: dòng vẫn nằm trong lô, không thêm vào danh mục; lần sau phải nhập lại.</p>' +
    '<div class="row" style="gap:8px;flex-wrap:wrap;justify-content:flex-end"><button type="button" class="btn ghost" data-act="dmHopLo">Chỉ lưu trong lô</button><button type="button" class="btn" data-act="dmHopThem">Thêm vào danh mục (<span id="dmHopDem">' + (ng.length + xe.length) + '</span>)</button></div></div>';
}
function dmHopChon() {   // các dòng đang được tích: {nguoi: [chỉ số], xe: [chỉ số]}
  const ds = [...document.querySelectorAll('#dmHopDlg [data-dmhop]')].filter(cb => cb.checked).map(cb => cb.dataset.dmhop);
  return {nguoi: ds.filter(x => x[0] === 'n').map(x => +x.slice(1)), xe: ds.filter(x => x[0] === 'x').map(x => +x.slice(1))};
}
function dmHopCapNhatDem() {
  const c = dmHopChon(), n = c.nguoi.length + c.xe.length, dem = document.getElementById('dmHopDem'), nut = document.querySelector('#dmHopDlg [data-act=dmHopThem]');
  if (dem) dem.textContent = String(n); if (nut) nut.disabled = !n;
}
document.addEventListener('change', e => { if (e.target && e.target.closest && e.target.closest('#dmHopDlg') && e.target.matches('[data-dmhop]')) dmHopCapNhatDem(); });
function dmHopXuLy(them) {
  const c = dmHopCho; if (!c) return;
  const chon = them ? dmHopChon() : {nguoi: [], xe: []}, tong = chon.nguoi.length + chon.xe.length;
  if (them && !tong) return;   // chưa tích dòng nào: nút “Thêm” đang khóa
  dmHopCho = null; dlgDong();
  if (c.daLuu) pushNote(c.daLuu, 'ok');   // thông báo “Đã lưu dữ liệu vào lô…” vẫn hiện cùng kết quả chọn, như khi còn hỏi bằng hộp của trình duyệt
  if (!tong) { pushNote('Chưa thêm ' + c.cau + ' vào danh mục (chỉ lưu trong lô).', 'warn'); return render(); }
  const moi = {nguoi: c.nguoi.filter((_, i) => chon.nguoi.includes(i)), xe: c.xe.filter((_, i) => chon.xe.includes(i))}, bo = c.nguoi.length + c.xe.length - tong;
  const hom = todayStr(), k = HAKDoiTuong.themTuLo(db.dmDoiTuong || [], db.dmXe || [], moi, hom), o = db.rs && db.rs[c.oid], f = o && o.forests && o.forests[c.fid];
  db.dmDoiTuong = k.dmDoiTuong; db.dmXe = k.dmXe;
  if (f) { k.nguoi.forEach(({r, id}) => { const x = (f.nc || []).find(y => y._id === r._id); if (x) { x.nguoiId = id; x._dmNgay = hom; } });
    k.xe.forEach(({r, id}) => { const x = (f.dx || []).find(y => y._id === r._id); if (x) { x.xeId = id; x._dmNgay = hom; } }); }
  persist();
  pushNote('Đã thêm ' + k.nguoi.length + ' người vào Danh mục đối tượng, ' + k.xe.length + ' xe vào Danh mục xe.' + (k.loi.length ? ' Chưa thêm được: ' + k.loi.join('; ') + '.' : '') + (bo ? ' ' + bo + ' dòng không chọn: chỉ lưu trong lô.' : ''), k.loi.length ? 'warn' : 'ok');
  render();
}
function dmGhiTuLo(st) {
  const bn = new Set(st.base.nc.map(b => b._id)), bx = new Set(st.base.dx.map(b => b._id));
  const moi = HAKDoiTuong.moiTuLo(db.dmDoiTuong || [], db.dmXe || [], st.cur.nc.filter(r => !bn.has(r._id)), st.cur.dx.filter(r => !bx.has(r._id)));
  const n = moi.nguoi.length, m = moi.xe.length; if (!n && !m) return null;
  const cau = (n ? n + ' người chưa có trong Danh mục đối tượng' : '') + (n && m ? ' và ' : '') + (m ? m + ' xe chưa có trong Danh mục xe' : '');
  dmHopCho = {nguoi: moi.nguoi, xe: moi.xe, cau, oid: NAV.cur, fid: NAV.curF};
  dlgMo(dmHopHtml(dmHopCho)); const nut = document.querySelector('#dmHopDlg [data-act=dmHopThem]'); if (nut) nut.focus();
  return null;
}
/* dòng của lô khác bản chụp so với dòng mới nhất của danh mục: [{row, d, khac}] */
function dmLechLo(kind, rows) {
  const out = [];
  (rows || []).forEach(r => {
    if (kind === 'nc') { const m = HAKDanhMuc.layLaoDong(db.dmLaoDong || [], r.cccd); if (!m) return; const k = HAKDanhMuc.lechLaoDong(r, m.row); if (k.length) out.push({row: r, d: m.row, khac: k}); }
    else { const m = HAKDanhMuc.layXe(db.dmXeVC || [], r.bienSo); if (!m) return; const k = HAKDanhMuc.lechXe(r, m.row); if (k.length) out.push({row: r, d: m.row, khac: k}); }
  });
  return out;
}
function dmThanhLech(kind) {
  const st = stCur(), rec = curRec(); const rows = st ? st.cur[kind] : (rec && rec[kind]) || [];
  const l = dmLechLo(kind, rows); if (!l.length) return '';
  return '<div class="msg warn" id="dmLech' + kind + '">Danh mục có thông tin <b>mới hơn</b> bản chụp trong lô cho ' + l.length + ' ' + (kind === 'nc' ? 'người' : 'xe') + ': ' + l.slice(0, 6).map(x => esc((kind === 'nc' ? x.row.ten : x.row.bienSo) + ' (' + x.khac.join(', ') + ')')).join('; ') +
  (l.length > 6 ? ' …' : '') + '. <button class="btn sm" data-act="dmCapNhatLo" data-kind="' + kind + '">Cập nhật từ danh mục</button> <span class="mut">Chỉ đổi trong bản nháp; hồ sơ lô đổi khi bấm “Lưu dữ liệu vào lô”.</span></div>';
}
function dmCapNhatLo(kind) {
  const st = stGet(true); if (!st) return;
  const l = dmLechLo(kind, st.cur[kind]); let n = 0;
  l.forEach(x => { const row = kind === 'nc' ? HAKDanhMuc.chupLaoDong(x.d, x.row) : HAKDanhMuc.chupXe(x.d, x.row); if (HAKStage.updateRow(st, kind, x.row._id, row).ok !== false) n++; });
  stErrList = null; note('Đã cập nhật ' + n + ' dòng từ danh mục vào bản nháp. Bấm “Lưu dữ liệu vào lô” để ghi.', 'ok'); render();
}
/* Lấy đơn giá theo vị trí từ đội khác của lô, không có thì từ lô gần nhất (theo ngày bắt đầu) cùng cách tính; chỉ điền vào ô (bản nháp), chưa lưu */
function luongLayDonGia() {
  const f = curForest(), rec = curRec(), fm = document.getElementById('luongForm'); if (!f || !rec || !fm) return;
  const cur = fm.elements.hinhThucLuong.value, B = BASIS[cur]; if (!B) return note('Chọn cơ sở tính đơn giá (tấn, ha hoặc ngày công) trước.', 'warn');
  const pre = {donGiaTan: 'dt_', donGiaHa: 'ha_', donGiaNgay: 'dn_'}[B.map], t = rec.doi && curTeam(f);
  const co = m => m && Object.values(m).some(v => +v > 0);
  const nguon = [];
  (rec.doi || []).forEach(d => { if (!t || d.id !== t.id) nguon.push({ten: 'đội “' + (d.ten || 'khác') + '” của lô này', m: (d.hinhThuc || {})[B.map]}); });
  const kh = ow => forestList(ow); const khac = [];
  Object.values(db.rs || {}).forEach(ow => kh(ow).forEach(ff => { if (ff.id === f.id) return; const dk = HAKDates.parse(ff.info && ff.info.tuNgay || ''); khac.push({ff, k: dk ? dk.y * 10000 + dk.m * 100 + dk.d : 0}); }));
  khac.sort((a, b) => b.k - a.k).forEach(({ff}) => { const ten = 'lô ' + (ff.info.maRung || '?'); (ff.doi || []).forEach(d => nguon.push({ten: ten + (d.ten ? ', đội “' + d.ten + '”' : ''), m: (d.hinhThuc || {})[B.map]})); nguon.push({ten, m: (ff.info || {})[B.map]}); });
  const s = nguon.find(x => co(x.m)); if (!s) return note('Chưa có đội hay lô nào khác có đơn giá ' + B.short + ' để lấy.', 'warn');
  let n = 0; chucDanhAll().forEach((cd, k) => { const el = fm.elements[pre + k], v = +(s.m || {})[cd]; if (el && v > 0) { el.value = String(v).replace('.', ','); n++; } });
  const msg = document.getElementById('luongLayMsg'); if (msg) msg.textContent = 'Đã điền ' + n + ' đơn giá từ ' + s.ten + '. Kiểm tra rồi bấm “Lưu dữ liệu vào lô”.';
  fm.elements.hinhThucLuong.dispatchEvent(new Event('change', {bubbles: true}));
}

/* ========== Tự lưu bản nháp (bản 2.2, mục 11.1 điểm 1) ==========
 * Thay đổi chưa lưu của lô (thông tin lô, bảng nháp nhân công / xe / phiếu cân) được ghi tạm vào localStorage vài giây một lần. Mất điện hoặc treo máy:
 * mở lại sẽ hỏi “Khôi phục thay đổi chưa lưu?”. Lưu vào lô, bỏ thay đổi hoặc đóng có chọn “Bỏ thay đổi” thì xóa bản tạm. KHÔNG ghi vào SQLite. */
const NHAP_TAM_KEY = 'hakqn.nhapTam.v1';
function nhapTamDoc() { try { const s = localStorage.getItem(NHAP_TAM_KEY); return s ? JSON.parse(s) : null; } catch (e) { return null; } }
function nhapTamXoa() { try { localStorage.removeItem(NHAP_TAM_KEY); } catch (e) { /* không có localStorage: bỏ qua */ } }
let nhapTamTat = false, nhapTamLoiDaBao = false, nhapTamLastJson = '';   // đang đóng có chủ ý: không ghi lại bản tạm nữa
function nhapTamStageGon(st) {
  if (!st || typeof st !== 'object') return st;
  const nk = Array.isArray(st.nhatKy) ? st.nhatKy.map(({truoc: _t, ...rest}) => rest) : undefined;
  return Object.assign({}, st, nk ? {nhatKy: nk} : {});
}
function nhapTamGhi() {
  if (nhapTamTat) return;
  try {
    const ks = stDirtyList(); if (!ks.length) { if (!nhapTamCho && nhapTamLastJson) { nhapTamLastJson = ''; nhapTamXoa(); } return; }
    const {lots, moi, chu, alias} = HAKNhap.tamChup(db, nhapTT(), ks), sts = {};   // lõi thuần src/nhap.js (test mô hình)
    ks.forEach(k => { const [oid, fid] = k.split('|'), f = db.rs && db.rs[oid] && db.rs[oid].forests && db.rs[oid].forests[fid]; if (!f) return; if (stages[k] && HAKStage.dirty(stages[k])) sts[k] = nhapTamStageGon(stages[k]); });
    if (!Object.keys(lots).length && !Object.keys(sts).length) { if (nhapTamLastJson) { nhapTamLastJson = ''; nhapTamXoa(); } return; }
    const sheets = ks.map(k => k.split('|')[1]).filter(fid => loCanSaoLuuSheets.has(fid));
    const snapshot = {lots, stages: sts, chu, moi, alias, sheets};
    const body = JSON.stringify(snapshot);
    if (body === nhapTamLastJson) return;   // Lô 9b (T-21): không stringify/ghi lại khi bản nháp không đổi
    nhapTamLastJson = body;
    localStorage.setItem(NHAP_TAM_KEY, JSON.stringify({at: new Date().toISOString(), ...snapshot}));
  } catch (e) {
    if (!nhapTamLoiDaBao && typeof note === 'function') { nhapTamLoiDaBao = true; note('Không tự lưu tạm được bản nháp trên trình duyệt (đầy bộ nhớ tạm): hãy bấm “Lưu dữ liệu vào lô” để ghi trực tiếp vào cơ sở dữ liệu.', 'warn'); }
  }
}
let nhapTamCho = false;   // đang chờ người dùng trả lời khôi phục: chưa xóa bản tạm
function nhapTamKhoiPhuc() {
  const d = nhapTamDoc(); if (!d) return;
  const chu = d.chu || {}, moiSet = new Set(d.moi || []);   // lô / chủ rừng tạo từ bản nháp (QĐ7) chưa có trong dữ liệu đã lưu: khôi phục kèm chủ rừng
  const coLo = (oid, fid) => db.rs && db.rs[oid] && db.rs[oid].forests && db.rs[oid].forests[fid], coDich = k => { const [oid, fid] = k.split('|'); return coLo(oid, fid) || (moiSet.has(fid) && ((chu[oid] && chu[oid].o) || db.rs[oid])); };
  const ten = []; const lots = Object.entries(d.lots || {}).filter(([k]) => coDich(k));
  const sts = Object.entries(d.stages || {}).filter(([k]) => { const [oid, fid] = k.split('|'); return coLo(oid, fid) || (lots.some(([k2]) => k2 === k)); });
  if (!lots.length && !sts.length) return nhapTamXoa();
  const ma = new Set(); [...lots, ...sts].forEach(([k]) => { const [oid, fid] = k.split('|'); const f = coLo(oid, fid) || (d.lots && d.lots[k]) || {}; ma.add((f.info && f.info.maRung) || fid); });
  nhapTamCho = true;
  const ok = confirm('Lần làm việc trước còn thay đổi chưa lưu (tự lưu tạm lúc ' + (d.at ? new Date(d.at).toLocaleString('vi-VN') : '?') + ') ở lô: ' + [...ma].join(', ') + '.\n\nKhôi phục các thay đổi này vào bản nháp? (Chưa ghi vào dữ liệu; bấm “Lưu dữ liệu vào lô” mới ghi.)');
  nhapTamCho = false;
  if (!ok) return nhapTamXoa();
  if (!savedSnap) savedSnap = (saveCache && saveCache.snap) || HAKDelta.snapshot(dbGhi());
  doiDuLieu();
  lots.forEach(([k, f]) => HAKNhap.tamPhucHoiLo(db, nhapTT(), k, f, chu[k.split('|')[0]], moiSet));
  { const tt = nhapTT(); HAKNhap.tamPhucHoiAlias(db, tt, d.alias); if (tt.canGhi) persist(); }
  sts.forEach(([k, st]) => { stages[k] = st; });
  const sheets = new Set(d.sheets || []);
  [...lots, ...sts].forEach(([k]) => { const fid = k.split('|')[1]; if (sheets.has(fid)) loCanSaoLuuSheets.add(fid); });
  note('Đã khôi phục thay đổi chưa lưu của lô ' + [...ma].join(', ') + ' vào bản nháp. Kiểm tra rồi bấm “Lưu dữ liệu vào lô”.', 'warn');
  render();
}
window.__nhapTamXoa = () => { nhapTamTat = true; nhapTamXoa(); return 1; };   // tiến trình chính gọi khi đóng có chủ ý (lưu hoặc bỏ thay đổi)
setInterval(nhapTamGhi, 1000);   // và gọi ngay sau mỗi lần lưu / bỏ thay đổi: lưu xong thì xóa bản tạm tức thì (không để tải lại trang khôi phục bản cũ)
setTimeout(nhapTamKhoiPhuc, 400);

/* ========== Tạo lô từ lô cũ (bản 2.2, mục 11.3 điểm 8) ========== */
let keThuaModalMo = false;
function keThuaRungMo() {
  keThuaModalMo = true;
  render();
}
function keThuaRungDong() {
  keThuaModalMo = false;
  render();
}
function keThuaRungModalHtml() {
  if (!keThuaModalMo) return '';
  const o = curOwner();
  if (!o) return '';
  const ds = [];
  Object.values(db.rs || {}).forEach(ow => forestList(ow).forEach(f => ds.push({f, ow})));
  if (!ds.length) {
    return '<div class="hak-modal-backdrop" id="keThuaModalBackdrop" style="position:fixed;inset:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:9999">' +
      '<div class="card" style="width:min(500px,94vw);background:var(--bg,#fff);border-radius:8px;padding:20px">' +
      '<h3>📋 Kế thừa lực lượng sang Rừng mới</h3><p class="mut">Chưa có rừng nào trong hệ thống để kế thừa. Vui lòng tạo rừng đầu tiên bằng nút "+ Rừng mới".</p>' +
      '<div class="row" style="justify-content:flex-end"><button class="btn" type="button" data-act="keThuaRungDong">Đóng</button></div></div></div>';
  }
  const base = (o.info.ma || 'CR') + '-R';
  let k = forestList(o).length + 1, code = base + k;
  while (HAKLoRung.lotsByMa(db, code).length) code = base + (++k);

  const opts = ds.map(x => {
    const ncCount = (x.f.nc || []).length, dxCount = (x.f.dx || []).length;
    const tenLo = x.f.info.tenRung || x.f.info.maRung || '(rừng chưa tên)';
    const chu = x.ow.info.ten || '(chưa tên)';
    return '<option value="' + esc(x.ow.id + '|' + x.f.id) + '">' +
      esc(x.f.info.maRung || '?') + ' · ' + esc(tenLo) + ' (' + esc(chu) + ') — ' + ncCount + ' NC, ' + dxCount + ' xe</option>';
  }).join('');

  return '<div class="hak-modal-backdrop" id="keThuaModalBackdrop" style="position:fixed;inset:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:9999">' +
    '<div class="card" style="width:min(640px,94vw);max-height:90vh;overflow-y:auto;background:var(--bg,#fff);box-shadow:0 8px 30px rgba(0,0,0,0.3);border-radius:8px;padding:20px">' +
    '<div class="row" style="justify-content:space-between;align-items:center;margin-bottom:12px">' +
    '<h3 style="margin:0">📋 Kế thừa lực lượng &amp; Đơn giá sang Rừng mới</h3>' +
    '<button class="btn ghost sm" type="button" data-act="keThuaRungDong">✕</button></div>' +
    '<p class="mut" style="margin:0 0 16px;font-size:13px">Tạo rừng mới cho chủ rừng <b>' + esc(o.info.ten || o.info.ma) + '</b> bằng cách sao chép lực lượng và cấu hình từ rừng đã làm. Phiếu cân và dữ liệu riêng của lô sẽ bắt đầu mới hoàn toàn.</p>' +
    '<form id="keThuaForm" style="display:flex;flex-direction:column;gap:12px">' +
    '<label><span>Rừng nguồn để kế thừa</span>' +
    '<select id="ktNguonSel" required style="width:100%">' + opts + '</select></label>' +
    '<div class="row" style="gap:12px">' +
    '<label style="flex:1"><span class="req">Mã rừng mới</span><input id="ktMaRung" value="' + esc(code) + '" required></label>' +
    '<label style="flex:2"><span>Tên rừng mới</span><input id="ktTenRung" value="Rừng ' + k + '" placeholder="Ví dụ: Rừng Khe Rinh..."></label>' +
    '</div>' +
    '<div style="background:var(--bg2,#f7f9fa);padding:12px;border-radius:6px;border:1px solid var(--border,#e1e4e8)">' +
    '<div style="font-weight:600;margin-bottom:8px">Chọn các hạng mục kế thừa:</div>' +
    '<label style="display:flex;align-items:center;gap:8px;margin-bottom:6px"><input type="checkbox" id="ktOptNc" checked> <span><b>Nhân công &amp; Tổ đội:</b> Sao chép toàn bộ công nhân, chức danh, CCCD, định mức BHLĐ</span></label>' +
    '<label style="display:flex;align-items:center;gap:8px;margin-bottom:6px"><input type="checkbox" id="ktOptDx" checked> <span><b>Đội xe &amp; Hợp đồng vận chuyển:</b> Sao chép danh sách xe, chủ xe, tài xế</span></label>' +
    '<label style="display:flex;align-items:center;gap:8px;margin-bottom:6px"><input type="checkbox" id="ktOptLuong" checked> <span><b>Bảng đơn giá &amp; Hình thức lương:</b> Kế thừa đơn giá khoán (tấn/ngày/ha)</span></label>' +
    '<label style="display:flex;align-items:center;gap:8px"><input type="checkbox" id="ktOptMuaHang" checked> <span><b>Công ty mua hàng &amp; Nơi giao:</b> Kế thừa thông tin bên mua và cự ly</span></label>' +
    '</div>' +
    '<div class="row" style="justify-content:flex-end;gap:8px;margin-top:8px">' +
    '<button class="btn ghost" type="button" data-act="keThuaRungDong">Hủy bỏ</button>' +
    '<button class="btn" type="submit" id="ktBtnSubmit">🚀 Tạo rừng &amp; Kế thừa ngay</button>' +
    '</div></form></div></div>';
}
function thucHienKeThuaRung() {
  const o = curOwner(), sel = document.getElementById('ktNguonSel');
  if (!o || !sel) return;
  const [oid, fid] = sel.value.split('|'), src = db.rs[oid] && db.rs[oid].forests && db.rs[oid].forests[fid];
  if (!src) return note('Không thấy rừng nguồn để kế thừa.', 'err');

  const ma = trim(document.getElementById('ktMaRung').value) || ((o.info.ma || 'CR') + '-R' + (forestList(o).length + 1));
  const ten = trim(document.getElementById('ktTenRung').value) || ma;
  const optNc = document.getElementById('ktOptNc').checked;
  const optDx = document.getElementById('ktOptDx').checked;
  const optLuong = document.getElementById('ktOptLuong').checked;
  const optMuaHang = document.getElementById('ktOptMuaHang').checked;

  const id = newId('f');
  const r = HAKDanhMuc.loTuLoCu(src, {id, maRung: ma, tenRung: ten, dmLaoDong: db.dmLaoDong, dmXe: db.dmXeVC});
  const newF = r.f;

  if (!optNc) { newF.nc = []; newF.doi = []; }
  if (!optDx) { newF.dx = []; newF.hdvc = []; }
  if (!optLuong && newF.info) {
    delete newF.info.hinhThucLuong;
    delete newF.info.donGiaTan;
    delete newF.info.donGiaHa;
    delete newF.info.donGiaNgay;
  }
  if (!optMuaHang && newF.info) {
    delete newF.info.muaHang;
    delete newF.info.cuLy;
  }

  newF.taoLuc = new Date().toISOString();
  o.forests[id] = newF;
  NAV.curF = id;
  NAV.ftab = 'finfo';
  NAV.tab = 'rung';
  keThuaModalMo = false;
  persist();
  note('🎉 Đã tạo rừng mới "' + ten + '" (' + ma + ') và kế thừa thành công ' + (newF.nc || []).length + ' nhân công, ' + (newF.dx || []).length + ' xe từ ' + (src.info.maRung || 'lô nguồn') + '!', 'ok');
  render();
}

function loTuLoCuBox(own) {
  const ds = []; Object.values(db.rs || {}).forEach(ow => forestList(ow).forEach(f => ds.push({f, ow})));
  if (!ds.length) return '';
  return '<details id="loTuLoCu" style="margin:6px 0 10px"><summary class="mut" style="cursor:pointer">Tạo lô mới từ một lô đã làm</summary><div class="row" style="gap:8px;flex-wrap:wrap;align-items:flex-end;margin-top:6px">' +
    '<label>Lô nguồn <select id="loTuLoCuSel">' + ds.map(x => '<option value="' + esc(x.ow.id + '|' + x.f.id) + '">' + esc((x.f.info.maRung || '(chưa mã)') + ' · ' + (x.ow.info.ten || '')) + '</option>').join('') + '</select></label>' +
    '<button class="btn sm" data-act="loTuLoCu">Tạo lô mới</button></div><p class="mut" style="margin:6px 0 0">Chép đội khai thác, nhân công, đội xe, xe, đơn giá, cước, công ty mua. <b>Không</b> chép phiếu cân, chấm công, số và ngày văn bản, thời gian khai thác. Người và xe lấy thông tin mới nhất từ Danh mục.</p></details>';
}
function loTuLoCuTao() {
  const o = curOwner(), sel = document.getElementById('loTuLoCuSel'); if (!o || !sel) return;
  const [oid, fid] = sel.value.split('|'), src = db.rs[oid] && db.rs[oid].forests && db.rs[oid].forests[fid]; if (!src) return note('Không thấy lô nguồn.', 'err');
  const base = (o.info.ma || 'CR') + '-R'; let k = forestList(o).length + 1, code = base + k; while (HAKLoRung.lotsByMa(db, code).length) code = base + (++k);
  const id = newId('f'), r = HAKDanhMuc.loTuLoCu(src, {id, maRung: code, tenRung: 'Rừng ' + k, dmLaoDong: db.dmLaoDong, dmXe: db.dmXeVC});
  r.f.taoLuc = r.f.taoLuc || new Date().toISOString(); o.forests[id] = r.f; NAV.curF = id; NAV.ftab = 'finfo'; NAV.tab = 'rung'; persist();
  note('Đã tạo lô ' + code + ' từ lô ' + (src.info.maRung || '?') + ': ' + (r.f.nc || []).length + ' nhân công, ' + (r.f.dx || []).length + ' xe (làm mới từ Danh mục: ' + r.nguoi + ' người, ' + r.xe + ' xe). Nhập thông tin rừng, thời gian khai thác rồi Lưu; phiếu cân và số/ngày văn bản nhập mới.',
  'ok'); render();
}

/* ========== Nhật ký nạp và hoàn tác lần nạp (bản 2.2, mục 11.3 điểm 10) ==========
 * Mỗi lần nạp Excel vào bản nháp ghi: nguồn, thời điểm, số dòng thêm / cập nhật / giữ nguyên / lỗi, kèm ảnh chụp bản nháp TRƯỚC khi nạp để hoàn tác cả lần nạp.
 * Hoàn tác chỉ làm được khi chưa lưu vào lô (bản nháp còn); lưu rồi thì lần nạp ghi vào nhật ký của lô (f.nhatKyNap, 50 lần gần nhất). */
const NK_COPY = x => JSON.parse(JSON.stringify(x === undefined ? null : x));
function nhatKyNapChup(st, kind) { return {cur: NK_COPY(st.cur), src: NK_COPY(st.src), pending: NK_COPY(st.pending), report: NK_COPY(st.report), seq: st.seq}; }
function nhatKyNapGhi(st, kind, nguon, rep, snap) {
  st.nhatKy = st.nhatKy || [];
  st.nhatKy.push({at: new Date().toISOString(), kind, nguon, them: rep.add || 0, capNhat: rep.upd || 0, giu: rep.same || 0, loi: rep.errors || 0, truoc: snap});
  if (st.nhatKy.length > 20) st.nhatKy.shift();
}
function nhatKyNapBox(kind) {
  const st = stCur(), ds = st && (st.nhatKy || []).filter(x => x.kind === kind); if (!ds || !ds.length) return '';
  const g = ds[ds.length - 1];
  return '<div class="card" id="nhatKyNap" style="margin-top:8px"><b>Nhật ký nạp (' + ds.length + ' lần, chưa lưu vào lô)</b><ul style="margin:4px 0 6px">' + ds.slice(-5).reverse().map(x => '<li>' + esc(new Date(x.at).toLocaleTimeString('vi-VN')) + ' · ' + esc(x.nguon) + ': thêm ' + x.them +
  ', cập nhật ' + x.capNhat + ', giữ nguyên ' + x.giu + ', lỗi ' + x.loi + '</li>').join('') + '</ul>' +
    '<button class="btn ghost sm" data-act="napHoanTac" data-kind="' + kind + '">Hoàn tác lần nạp gần nhất (' + esc(g.nguon) + ')</button> <span class="mut">Trả bản nháp về như trước lần nạp đó; các sửa tay sau đó cũng mất.</span></div>';
}
function nhatKyNapHoanTac(kind) {
  const st = stCur(); if (!st) return; const i = (st.nhatKy || []).map(x => x.kind).lastIndexOf(kind); if (i < 0) return;
  const g = st.nhatKy[i]; if (!confirm('Hoàn tác lần nạp “' + g.nguon + '”?\nBản nháp trở về như trước lần nạp này; mọi thay đổi sau đó (kể cả sửa tay) trong bản nháp sẽ mất. Dữ liệu đã lưu vào lô không bị ảnh hưởng.')) return;
  const t = g.truoc; st.cur = NK_COPY(t.cur); st.src = NK_COPY(t.src); st.pending = NK_COPY(t.pending); st.report = NK_COPY(t.report); st.seq = t.seq;
  st.nhatKy = st.nhatKy.slice(0, i); stErrList = null; note('Đã hoàn tác lần nạp “' + g.nguon + '”: bản nháp về như trước đó.', 'ok'); render();
}

/* ========== Kiểu ô chuẩn (bản 2.2, mục 6.2): gõ ngày nhanh, CCCD sạch ==========
 * Chạy ở pha bắt sự kiện nên mọi trình xử lý `change` phía sau đều thấy giá trị đã chuẩn hóa. Chỉ đổi khi ra ngày có thật / CCCD toàn chữ số; còn lại để bộ kiểm tra báo lỗi. */
const NHAP_O_NGAY = /^(ngay|tuNgay|denNgay|han|kd|cavet|uqNgay|ntNgay|pcNgay|a_ngay|t_tu)/i, NHAP_O_CCCD = /^cccd/i;
document.addEventListener('change', e => {
  const t = e.target; if (!t || t.tagName !== 'INPUT' || (t.type && t.type !== 'text') || !t.name) return;
  const v = NHAP_O_NGAY.test(t.name) ? HAKNhapLieu.chuanHoaNgay(t.value) : NHAP_O_CCCD.test(t.name) ? HAKNhapLieu.chuanHoaCccd(t.value) : null;
  if (v != null && v !== t.value) t.value = v;
}, true);

/* ========== Chọn nhiều người / nhiều xe từ Danh mục đưa thẳng vào hợp đồng của lô ========== */
const dmPickState = {kind: '', list: [], sel: new Set(), q: '', loaiXe: '', taiXe: '', viTri: '', cccd: '', gioiTinh: ''};
function dmChonNhieuMo(kind) {
  const st = stGet(true), rec = curRec(); if (!st || !rec) return;
  dmPickState.kind = kind; dmPickState.sel = new Set(); dmPickState.q = '';
  dmPickState.loaiXe = ''; dmPickState.taiXe = ''; dmPickState.viTri = ''; dmPickState.cccd = ''; dmPickState.gioiTinh = '';
  if (kind === 'nc') {
    const t = curTeam(), dId = t ? t.id : '';
    const daCoCccd = new Set(st.cur.nc.filter(r => !rec.doi || rec.doi.length < 2 || r.doiId === dId).map(r => HAKModel.cccdSo(r.cccd)).filter(Boolean));
    const daCoId = new Set(st.cur.nc.filter(r => !rec.doi || rec.doi.length < 2 || r.doiId === dId).map(r => r.nguoiId).filter(Boolean));
    dmPickState.list = dmNguonLd().filter(r => !(r.cccd && daCoCccd.has(HAKModel.cccdSo(r.cccd))) && !(r._ngId && daCoId.has(r._ngId)));
  } else {
    const hId = hdMo('dx');
    const daCo = new Set(st.cur.dx.filter(r => !hId || r.hdvcId === hId).map(r => HAKStage.bienKey(r.bienSo)));
    /* xe đã thuộc ĐỘI XE KHÁC của cùng lô: vẫn hiện nhưng không chọn được (một biển số chỉ một dòng trong lô; chọn vào sẽ bị chặn lưu vì trùng BKS) */
    const khac = new Map(st.cur.dx.filter(r => hId && r.hdvcId !== hId).map(r => [HAKStage.bienKey(r.bienSo), r.hdvcId ? tenDoiVc(rec, (rec.hdvc || []).find(h => h.id === r.hdvcId) || {}) : 'xe chưa thuộc đội xe nào']));
    dmPickState.list = dmNguonXe().filter(x => !daCo.has(HAKStage.bienKey(x.bienSo))).map(x => khac.has(HAKStage.bienKey(x.bienSo)) ? Object.assign({}, x, {_oKhac: khac.get(HAKStage.bienKey(x.bienSo))}) : x);
  }
  dmChonNhieuRender();
}
function dmChonNhieuRender() {
  const kind = dmPickState.kind, q = trim(dmPickState.q).toLowerCase();
  const dsLoaiXe = kind === 'dx' ? [...new Set(dmPickState.list.map(x => trim(x.loaiXe)).filter(Boolean))] : [];
  const dsViTri = kind === 'nc' ? [...new Set(dmPickState.list.map(r => trim(r.viTri || r.chucVu || '')).filter(Boolean))] : [];
  const items = dmPickState.list.map((r, i) => ({r, i})).filter(({r}) => {
    if (q && !foldVi(JSON.stringify(r)).includes(foldVi(q))) return false;
    if (kind === 'dx') {
      if (dmPickState.loaiXe && trim(r.loaiXe) !== dmPickState.loaiXe) return false;
      if (dmPickState.taiXe === 'co' && !trim(r.taiXe)) return false;
      if (dmPickState.taiXe === 'chua' && trim(r.taiXe)) return false;
    } else if (kind === 'nc') {
      if (dmPickState.viTri && trim(r.viTri || r.chucVu || '') !== dmPickState.viTri) return false;
      if (dmPickState.cccd === 'co' && !trim(r.cccd)) return false;
      if (dmPickState.cccd === 'chua' && trim(r.cccd)) return false;
      if (dmPickState.gioiTinh === 'nam' && trim(r.gioiTinh || '') === 'Nữ') return false;
      if (dmPickState.gioiTinh === 'nu' && trim(r.gioiTinh || '') !== 'Nữ') return false;
    }
    return true;
  });
  const title = kind === 'nc' ? 'Chọn nhân công từ Danh mục đối tượng' : 'Chọn xe từ Danh mục xe vận chuyển';
  const rows = items.length ? items.map(({r, i}) => {
    const chk = dmPickState.sel.has(i) ? ' checked' : '';
    if (kind === 'nc') {
      return '<tr><td><input type="checkbox" data-dmpick="' + i + '"' + chk + '></td><td><b>' + esc(r.ten) + '</b>' + (r._nhan ? '<br><small class="mut">' + esc(r._nhan) + '</small>' : '') + '</td><td>' + (r.cccd ? esc(r.cccd) : '<span class="pill warn">chưa có CCCD</span>') + '</td><td>' + esc(r.viTri || r.chucVu || '') + '</td></tr>';
    }
    return '<tr' + (r._oKhac ? ' class="mut"' : '') + '><td><input type="checkbox" data-dmpick="' + i + '"' + (r._oKhac ? ' disabled title="Xe đã có trong lô ở ' + esc(r._oKhac) + '"' : chk) + '></td><td><b>' + esc(r.bienSo) + '</b>' + (r._oKhac ? ' <span class="pill warn" data-xe-khac>đã ở ' + esc(r._oKhac) + '</span>' : '') + '</td><td>' + esc(r.chuXe || '') + '</td><td>' + esc(r.taiXe || '') + '</td><td>' + esc(r.loaiXe || '') + '</td></tr>';
  }).join('') : '<tr><td colspan="5" class="mut">Không còn mục nào chưa có trong hợp đồng này (hoặc không khớp tìm kiếm / bộ lọc). Bạn có thể bấm “+ Nhập mới” hoặc mở Danh mục để thêm trước.</td></tr>';
  
  const filterHtml = '<div class="row" style="gap:8px;margin-bottom:8px;flex-wrap:wrap;align-items:center">' +
    '<input id="dmPickQ" value="' + esc(dmPickState.q) + '" placeholder="Tìm theo tên, CCCD, biển số…" style="flex:2;min-width:180px">' +
    (kind === 'dx' ?
      '<select data-dmfilter="loaiXe" style="flex:1;min-width:120px" aria-label="Lọc loại xe"><option value="">-- Mọi loại xe --</option>' + dsLoaiXe.map(l => '<option value="' + esc(l) + '"' + (l === dmPickState.loaiXe ? ' selected' : '') + '>' + esc(l) + '</option>').join('') + '</select>' +
      '<select data-dmfilter="taiXe" style="flex:1;min-width:120px" aria-label="Lọc tài xế"><option value="">-- Mọi tài xế --</option><option value="co"' + (dmPickState.taiXe === 'co' ? ' selected' : '') + '>Đã có tài xế</option><option value="chua"' + (dmPickState.taiXe === 'chua' ? ' selected' : '') + '>Chưa có tài xế</option></select>'
    : '') +
    (kind === 'nc' ?
      '<select data-dmfilter="viTri" style="flex:1;min-width:120px" aria-label="Lọc vị trí"><option value="">-- Mọi vị trí --</option>' + dsViTri.map(v => '<option value="' + esc(v) + '"' + (v === dmPickState.viTri ? ' selected' : '') + '>' + esc(v) + '</option>').join('') + '</select>' +
      '<select data-dmfilter="cccd" style="flex:1;min-width:110px" aria-label="Lọc CCCD"><option value="">-- Mọi CCCD --</option><option value="co"' + (dmPickState.cccd === 'co' ? ' selected' : '') + '>Đã có CCCD</option><option value="chua"' + (dmPickState.cccd === 'chua' ? ' selected' : '') + '>Chưa có CCCD</option></select>' +
      '<select data-dmfilter="gioiTinh" style="flex:1;min-width:100px" aria-label="Lọc giới tính"><option value="">-- Giới tính --</option><option value="nam"' + (dmPickState.gioiTinh === 'nam' ? ' selected' : '') + '>Nam</option><option value="nu"' + (dmPickState.gioiTinh === 'nu' ? ' selected' : '') + '>Nữ</option></select>'
    : '') +
    '<button type="button" class="btn ghost sm" data-act="dmPickAll">Chọn tất cả đang hiện (' + items.length + ')</button>' +
    '</div>';

  dlgMo('<h3 style="margin-top:0">' + title + '</h3>' +
    filterHtml +
    '<div class="hak-pick-wrap"><table><thead><tr><th style="width:36px"></th>' +
      (kind === 'nc' ? '<th>Họ và tên / Đối tượng</th><th>CCCD</th><th>Vị trí mặc định</th>' : '<th>Biển kiểm soát</th><th>Chủ xe</th><th>Tài xế</th><th>Loại xe</th>') +
    '</tr></thead><tbody>' + rows + '</tbody></table></div>' +
    '<div class="row" style="justify-content:space-between;align-items:center;margin-top:10px">' +
      '<span class="mut">Đã chọn: <b id="dmPickCount">' + dmPickState.sel.size + '</b></span>' +
      '<span class="row" style="gap:8px"><button type="button" class="btn ghost" data-act="dlgDong">Hủy</button><button type="button" class="btn" data-act="dmChonNhieuLuu"' + (dmPickState.sel.size ? '' : ' disabled') + '>Đưa vào hợp đồng & Lưu</button></span>' +
    '</div>');
}
async function dmChonNhieuLuu() {
  const kind = dmPickState.kind, st = stGet(true), rec = curRec(); if (!st || !rec) return;
  const chon = [...dmPickState.sel].map(i => dmPickState.list[i]).filter(r => r && !r._oKhac);
  if (!chon.length) return;
  const t = curTeam();
  let maxRow = st.cur[kind].reduce((m, r) => Math.max(m, +r._row || 0), 1);
  chon.forEach(d => {
    const vals = {};
    if (kind === 'nc') {
      const r = HAKDanhMuc.chupLaoDong(d, {vaiTro: 'Công nhân', danhXung: d.gioiTinh === 'Nữ' ? 'Bà' : 'Ông'});
      Object.assign(vals, r, {maRung: rec.info.maRung});
      if (d._ngId) vals.nguoiId = d._ngId;
      if (d._viTriId) vals.viTriId = d._viTriId;
    } else {
      const r = HAKDanhMuc.chupXe(d, {});
      Object.assign(vals, d._goc || {}, r, {maRung: rec.info.maRung});
      if (d._xeId) vals.xeId = d._xeId;
    }
    const row = ST_NORM[kind](vals);
    row._row = ++maxRow;
    row._nguon = 'Danh mục';
    if (vals.nguoiId) row.nguoiId = vals.nguoiId;
    if (vals.viTriId) row.viTriId = vals.viTriId;
    if (vals.xeId) row.xeId = vals.xeId;
    if (d.ngayCapNhat) row._dmNgay = trim(d.ngayCapNhat);
    if (kind === 'nc' && rec.doi && t) row.doiId = t.id;
    if (kind === 'dx') pgSauThemXe(st, row);
    HAKStage.addRow(st, kind, row);
  });
  st.src[kind] = 'Danh mục'; skGhi(st, kind, 'Danh mục', chon.length);
  dlgDong();
  await stSave();
}
document.addEventListener('change', e => {
  const cb = e.target && e.target.closest && e.target.closest('#dlgBox [data-dmpick]'); if (!cb) return;
  const idx = +cb.dataset.dmpick;
  if (cb.checked) dmPickState.sel.add(idx); else dmPickState.sel.delete(idx);
  const cnt = document.getElementById('dmPickCount'); if (cnt) cnt.textContent = String(dmPickState.sel.size);
  const btn = document.querySelector('#dlgBox [data-act=dmChonNhieuLuu]'); if (btn) btn.disabled = !dmPickState.sel.size;
});
document.addEventListener('change', e => {
  const sel = e.target && e.target.closest && e.target.closest('#dlgBox select[data-dmfilter]'); if (!sel) return;
  const k = sel.dataset.dmfilter;
  dmPickState[k] = sel.value;
  dmChonNhieuRender();
});
document.addEventListener('input', e => {
  if (!e.target || e.target.id !== 'dmPickQ') return;
  dmPickState.q = e.target.value;
  const pos = e.target.selectionStart;
  dmChonNhieuRender();
  const qEl = document.getElementById('dmPickQ');
  if (qEl) { qEl.focus(); if (pos != null) qEl.setSelectionRange(pos, pos); }
});
/* 3.5.1: một chạm — thêm mọi xe của Danh mục xe chưa có trong đội xe đang mở (xe đang ở đội khác của lô được bỏ qua), rồi lưu vào lô như “Chọn từ Danh mục” */
async function dmThemTatCaXe() {
  const st = stGet(true), rec = curRec(); if (!st || !rec) return;
  dmChonNhieuMo('dx');
  const L = dmPickState.list.map((r, i) => [r, i]).filter(([r]) => r && !r._oKhac);
  if (!L.length) { dlgDong(); return note('Mọi xe trong Danh mục xe đã có trong đội xe này (hoặc đang thuộc đội xe khác của lô). Không còn xe nào để thêm.', 'warn'); }
  if (!confirm('Thêm ' + L.length + ' xe từ Danh mục xe vào đội xe đang mở?\n\n' + L.slice(0, 12).map(([r]) => '• ' + r.bienSo + (r.chuXe ? ' · ' + r.chuXe : '')).join('\n') + (L.length > 12 ? '\n• … và ' + (L.length - 12) + ' xe khác' : '') + '\n\nChủ xe và tài xế thường chạy được điền theo danh mục.')) { dlgDong(); return; }
  dmPickState.sel = new Set(L.map(([, i]) => i));
  return dmChonNhieuLuu();
}
document.addEventListener('click', e => { const b = e.target && e.target.closest && e.target.closest('[data-act=dmThemTatCaXe]'); if (!b) return; e.preventDefault(); dmThemTatCaXe(); });
/* 3.5.1: một chạm — quét biển số trong phiếu cân chưa có trong đội xe: xe đã có trong Danh mục xe thì gán đủ thông tin; xe chưa có thì tạo nhanh trong Danh mục xe (chỉ biển số) và thêm vào bản nháp để hoàn thiện sau */
function stThemXeTuPhieu() {
  const st = stGet(true), rec = curRec(); if (!st || !rec) return;
  const miss = [...new Set(st.cur.pc.map(p => p.bienSo).filter(b => b && !st.cur.dx.some(x => HAKStage.bienKey(x.bienSo) === HAKStage.bienKey(b))))];
  if (!miss.length) return note('Mọi biển số trong phiếu cân đã có trong đội xe.', 'ok');
  const src = dmNguonXe(); let maxRow = st.cur.dx.reduce((m, r) => Math.max(m, +r._row || 0), 1), coSan = 0, moi = 0;
  miss.forEach(b => {
    const k = HAKStage.bienKey(b), d = src.find(x => HAKStage.bienKey(x.bienSo) === k); let vals;
    if (d) { vals = Object.assign({}, d._goc || {}, HAKDanhMuc.chupXe(d, {}), {maRung: rec.info.maRung}); if (d._xeId) vals.xeId = d._xeId; coSan++; }
    else {
      vals = {bienSo: b, maRung: rec.info.maRung};
      const r = HAKXeDM.luu(dmXE(), {id: '', bks: b, ngayCapNhat: todayStr(), hanKiemDinh: '', hanBaoHiem: '', loaiXe: '', chuXeId: ''}, dmDT());
      if (r.ok) { db.dmXe = r.dm; vals.xeId = r.xe.id; moi++; }
    }
    const row = ST_NORM.dx(vals); row._row = ++maxRow; row._nguon = d ? 'Danh mục' : 'Từ phiếu cân';
    if (vals.xeId) row.xeId = vals.xeId; if (d && d.ngayCapNhat) row._dmNgay = trim(d.ngayCapNhat);
    pgSauThemXe(st, row); HAKStage.addRow(st, 'dx', row);
  });
  if (moi) persist();
  skGhi(st, 'dx', 'phiếu cân (gán tự động; ' + moi + ' xe tạo nhanh)', miss.length);
  st.src.dx = st.src.dx || 'Từ phiếu cân'; stErrList = null;
  note('Đã thêm ' + miss.length + ' xe vào bản nháp của lô (' + coSan + ' xe từ Danh mục, ' + moi + ' xe tạo nhanh trong Danh mục xe). Xe tạo nhanh cần bổ sung chủ xe, tài xế, giấy tờ rồi bấm “Lưu dữ liệu vào lô”.', moi ? 'warn' : 'ok');
}
document.addEventListener('click', e => { const b = e.target && e.target.closest && e.target.closest('[data-act=stThemXeTuPhieu]'); if (!b) return; e.preventDefault(); stThemXeTuPhieu(); });
