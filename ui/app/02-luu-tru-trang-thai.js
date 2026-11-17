/* ========== Lưu trữ ========== */
let storeOk = true;
let migrated = false;
const newId = p => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
// Chuyển dữ liệu v1 (nhân công, đội xe nằm dưới chủ rừng) sang v2 (nằm dưới rừng). Mỗi chủ rừng cũ được tạo 1 rừng mặc định.
function migrateV1(o) {
  const out = {v: 2, rs: {}};
  Object.entries(o.rs).forEach(([id, r]) => {
    const old = r.info || {};
    const fid = newId('f');
    const forests = {};
    forests[fid] = {
      id: fid,
      info: {maRung: (old.ma || 'CR') + '-R1', tenRung: 'Rừng 1', diaDiem: old.diaDiem || '', lat: null, lng: null,
        dienTich: null, dinhMucTanHa: null, dinhMucNgayHa: null, cuLy: null, tuNgay: old.tuNgay || '', denNgay: old.denNgay || '',
        donGia: old.donGia ?? null, giayTo: []},
      nc: r.nc || [], dx: r.dx || [], exp: r.exp || {},
      ncFile: r.ncFile || '', ncAt: r.ncAt || '', dxFile: r.dxFile || '', dxAt: r.dxAt || ''
    };
    out.rs[id] = {id, info: {ma: old.ma || '', danhXung: old.danhXung || 'Ông', ten: old.ten || '', ngaySinh: old.ngaySinh || '',
      cccd: old.cccd || '', ngayCap: old.ngayCap || '', noiCap: old.noiCap || '', diaChi: old.diaChi || ''}, forests};
  });
  return out;
}
const HB = window.hak || null;   // cầu nối với bản desktop (SQLite); không có khi chạy trong trình duyệt
let dbInfo = null;
let pendingNotice = null;   // thông báo từ chương trình chính sau khi đổi thư mục dữ liệu
let dataIssueUi = null;   // vị trí dữ liệu đã cấu hình không mở được: hiện màn hình xử lý, KHÔNG làm việc trên bản trống/mặc định
function loadDb() {
  if (HB) {
    try {
      const r = HB.loadSync();
      if (r && r.unavailable) { dataIssueUi = r.issue || {path: '', reason: r.error || 'không mở được cơ sở dữ liệu', code: 'OPEN_FAILED'}; storeOk = false; dbInfo = {error: r.error}; }
      else if (!r || !r.ok) { storeOk = false; dbInfo = {error: (r && r.error) || 'không đọc được cơ sở dữ liệu'}; }
      else { dbInfo = r; { const e = document.getElementById('appVer'); if (e && r.version) e.textContent = ' · Phiên bản ' + r.version; }   // phiên bản bản cài (package.json) hiện ở đầu trang
        if (r.notice) pendingNotice = r.notice; const o = r.db; return withDefaults(o && o.v === 2 ? o : (o && o.rs && Object.keys(o.rs).length ? migrateV1(o) : {v: 2, rs: {}})); }
    } catch (e) { storeOk = false; dbInfo = {error: e.message}; }
    return withDefaults({v: 2, rs: {}});
  }
  try {
    const s = localStorage.getItem(KEY);
    if (s) { const o = JSON.parse(s); if (o && typeof o === 'object' && o.rs) return withDefaults(o); }
    else {
      const old = localStorage.getItem(KEY_OLD);
      if (old) { const o = JSON.parse(old); if (o && typeof o === 'object' && o.rs) { migrated = true; return withDefaults(migrateV1(o)); } }
    }
  } catch (e) { storeOk = false; }
  return withDefaults({v: 2, rs: {}});
}
let db = loadDb();
if (HB) { document.addEventListener('DOMContentLoaded', () => { document.querySelectorAll('.deskOnly').forEach(x => { x.hidden = false; }); }); }
let saveSt = {text: '', err: false}, saveTimer = null;
function showSave(text, err) { saveSt = {text, err: !!err}; const el = document.getElementById('saveSt'); if (el) { el.textContent = text; el.classList.toggle('err', !!err); } }
const hhmm = () => new Date().toLocaleTimeString('vi-VN');
/* Lưu vào SQLite (bản desktop). Lưu theo phần thay đổi (src/delta.js): giữ ảnh chụp chuỗi JSON từng chủ rừng / lô của lần lưu thành công gần nhất
 * cùng phiên bản `rev` của cơ sở dữ liệu, chỉ gửi dòng thêm / sửa / xóa. Chưa có ảnh chụp, trùng mã nội bộ, hoặc tiến trình chính báo STALE
 * (dữ liệu đã đổi từ nơi khác: khôi phục, đổi thư mục...) / MISMATCH (lệch số chủ / lô) thì lưu TOÀN BỘ như trước — không mất thay đổi nào.
 * Các lần lưu được xếp hàng (không chạy chồng); ảnh chụp lấy ngay trước khi gửi nên đúng với nội dung được ghi. */
let saveCache = null, saveChain = Promise.resolve();
/* MỘT CÁCH LƯU CHO LÔ (như chứng từ ERP): mọi thay đổi trong lô (thông tin, đội, đội xe, số văn bản, chấm công, gán phiếu cân…) vào BẢN NHÁP của lô;
 * nút “Lưu dữ liệu vào lô” (và nút Lưu của từng khung) lưu cả lô cùng các bảng nháp nhân công / xe / phiếu cân; “Bỏ thay đổi” về bản đã lưu.
 * Lưu danh mục, cài đặt, thông tin chủ rừng vẫn ghi ngay nhưng KHÔNG kéo theo thay đổi chưa lưu của lô (lô đó ghi theo bản đã lưu). */
const loDirty = new Set();   // id lô còn thay đổi chưa lưu ngoài các bảng nháp
let savedSnap = null;        // ảnh chụp đúng nội dung đã ghi thành công gần nhất (bản đã lưu của từng lô)
let nhapKhung = null;   // đang áp dụng một khung vào bản nháp: chỉ đánh dấu “Chưa lưu” khi dữ liệu của lô THỰC SỰ đổi (sự kiện change có thể chạy khi ô không đổi gì)
/* PHIÊN BẢN DỮ LIỆU (B7): tăng ở MỌI chỗ đổi dữ liệu hoặc bản nháp — persist, persistLo, persistNow, bỏ thay đổi, mọi thao tác bản nháp (HAKStage bọc bên dưới, đối tượng stages bọc
 * ở module 11). Kết quả kiểm tra (exportCheck) và chỉ mục chéo lô nhớ theo (lô, bản đã lưu / bản nháp, dataVer): vẽ lại khi dữ liệu không đổi thì không tính lại.
 * Thay đổi dữ liệu mà không qua các hàm này là lỗi (test tests/datacver.test.js quét mã). */
let dataVer = 0;
function doiDuLieu() { dataVer++; }
['merge', 'addRow', 'updateRow', 'removeRow', 'restoreRow', 'resolve', 'commit'].forEach(k => { const g = HAKStage[k]; if (typeof g === 'function' && !g._dv) { const w = function () { doiDuLieu(); try { return g.apply(this, arguments); } finally { doiDuLieu(); } }; w._dv = true; HAKStage[k] = w; } });
/* khóa nhớ tạm cho hồ sơ dựng từ lô (jobView: bản đã lưu, stJob: bản nháp): thuộc tính ẩn, Object.assign không chép sang hồ sơ con (subRec…) */
const ganKhoaHoSo = (r, k) => { try { Object.defineProperty(r, '__vk', {value: k, enumerable: false}); } catch (e) { /* đối tượng đóng băng: bỏ qua, không nhớ tạm */ } return r; };
function persistLo(f) {
  doiDuLieu();
  f = f || curForest(); if (!f) return;
  if (typeof ktXoaNho === 'function') ktXoaNho();
  if (loKhoa(f)) { loVeBanDaLuu(f.id); loKhoaNote(f); return; }   // lô chỉ đọc: không bao giờ vào bản nháp (trả về bản đã lưu, không để trạng thái “Chưa lưu” treo)
  if (nhapKhung) { nhapKhung.can = true; return; }
  if (!savedSnap) savedSnap = (saveCache && saveCache.snap) || HAKDelta.snapshot(dbGhi());
  loDirty.add(f.id); showSave('Lô ' + ((f.info || {}).maRung || '') + ' còn thay đổi chưa lưu — bấm “Lưu dữ liệu vào lô”');
  if (typeof loBar === 'function') {   // hiện thanh “Chưa lưu” ngay, không vẽ lại cả trang (giữ ô đang nhập)
    const el = document.getElementById('loDirtyBar'), h = loBar();
    // thanh đã hiện thì giữ nguyên (đang bấm nút trên thanh thì không thay phần tử)
    if (!el && h) { const tb = document.querySelector('#main .tabs'); if (tb) tb.insertAdjacentHTML('beforebegin', h); }
  }
}
/* nội dung sẽ ghi: lô còn thay đổi chưa lưu giữ bản đã lưu (chưa có bản đã lưu — lô mới — thì ghi như hiện tại) */
function dbGhi() {
  if (!loDirty.size || !savedSnap) return db;
  const out = Object.assign({}, db, {rs: {}});
  Object.entries(db.rs || {}).forEach(([oid, o]) => { if (!o || typeof o !== 'object') { out.rs[oid] = o; return; } const fs = {}; Object.entries(o.forests || {}).forEach(([fid, f]) => { const b = loDirty.has(f && f.id || fid) && savedSnap.forests.get(f && f.id || fid); fs[fid] = b ? JSON.parse(b.json) : f; }); out.rs[oid] = Object.assign({}, o, {forests: fs}); });
  return out;
}
/* bỏ thay đổi chưa lưu của một lô: về đúng bản đã lưu */
function loHoan(fid) { return loDirty.has(fid) ? loVeBanDaLuu(fid) || true : false; }
function loVeBanDaLuu(fid) {
  doiDuLieu(); loDirty.delete(fid);
  const b = savedSnap && savedSnap.forests.get(fid); if (!b) return false;
  Object.values(db.rs || {}).forEach(o => { const k = Object.keys(o.forests || {}).find(x => (o.forests[x].id || x) === fid); if (k) { const f = o.forests[k], v = JSON.parse(b.json); Object.keys(f).forEach(x => { delete f[x]; }); Object.assign(f, v); } });
  return true;
}
window.__saveStats = {delta: 0, full: 0, fallback: 0, last: ''};   // kiểm thử đầu-cuối đọc để biết đường lưu đã dùng
/* lô nào chưa có đội hoặc có dòng nhân công thiếu doiId (lô mới, dòng mới) thì chuẩn hóa ngay trong bộ nhớ, đúng như tiến trình chính sẽ lưu */
function chuanHoaDb() { Object.values(db.rs || {}).forEach(o => Object.keys(o.forests || {}).forEach(k => { if (HAKModel.needsEnsure(o.forests[k])) Object.assign(o.forests[k], HAKModel.ensureForest(o.forests[k])); if (HAKLienKet.canChuan(o.forests[k])) HAKLienKet.chuanLo(o.forests[k]); }));
  if (Array.isArray(db.dmViTri)) { const vt = HAKViTri.dung(db); if (vt.length !== db.dmViTri.length) db.dmViTri = vt; } }   // 3.0: tên vị trí mới (định biên, định mức, đơn giá, dòng nhân công) vào Danh mục vị trí với mã ổn định   // 3.0: ID dòng, chấm công theo ID thành viên — giống hệt tầng lưu (src/store.js) để ảnh chụp khớp SQLite   // tại chỗ: nơi đang giữ tham chiếu lô vẫn đúng
/* lô đã chốt / dừng (theo bản ĐÃ LƯU) mà trong bộ nhớ đã khác ngoài các khóa vòng đời: [mã lô]. Chỉ giải mã JSON của lô khóa. */
function loKhoaViPham() {
  const out = [];
  if (!savedSnap || !savedSnap.forests) return out;
  Object.values(db.rs || {}).forEach(o => Object.entries((o && o.forests) || {}).forEach(([fk, f]) => {
    const id = (f && f.id) || fk, b = savedSnap.forests.get(id); if (!b || !/"(chot|dung)":\{/.test(b.json)) return;
    try { if (JSON.stringify(f) === b.json) return; } catch (e) { /* không tuần tự hóa được: so đầy đủ bên dưới */ }   // giống hệt bản đã lưu: không vi phạm, khỏi giải mã và chuẩn hóa cả lô (lô lớn: hàng trăm ms mỗi lần lưu)
    let cu; try { cu = JSON.parse(b.json); } catch (e) { return; }
    if (!HAKVongDoi.chiDoc(f)) HAKLienKet.chuanLo(cu, {batKe: true});   // như tầng lưu: ID dòng gán tất định, lô vừa mở khóa không bị coi là sửa dữ liệu
    if (HAKVongDoi.viPhamKhoa(cu, f)) out.push(id);
  }));
  return out;
}
async function saveOnce() {
  chuanHoaDb();
  { const kh = loKhoaViPham(); if (kh.length) {   // tầng lưu của giao diện: không gửi thay đổi dữ liệu của lô khóa; trả về bản đã lưu
    const ma = kh.map(id => { let m = id; Object.values(db.rs || {}).forEach(o => Object.values((o && o.forests) || {}).forEach(f => { if (f && f.id === id) m = (f.info || {}).maRung || id; })); return m; });
    kh.forEach(id => loVeBanDaLuu(id));
    return {ok: false, code: 'LOCKED', error: 'Lô ' + ma.join(', ') + ' đã chốt hoặc đã dừng (chỉ đọc): không ghi thay đổi dữ liệu. Mở khóa (nhập lý do) hoặc mở lại lô trước khi sửa; thay đổi vừa rồi đã được bỏ.'};
  } }
  let r = null, snap = null;
  if (saveCache && HB.saveDelta) {
    const W = dbGhi(); snap = HAKDelta.snapshot(W);
    if (!snap.dup) {
      const d = HAKDelta.diff(saveCache.snap, snap);
      d.rev = saveCache.rev; d.counts = snap.counts;
      if (saveCache.snap.side && snap.side) d.sideD = HAKDelta.diffSide(saveCache.snap.side, snap.side); else d.side = HAKDelta.side(W);   // B6: chỉ các dòng danh mục / khóa meta đã đổi
      window.__saveStats.sideBytes = d.sideD ? JSON.stringify(d.sideD).length : -1;   // đo hiệu năng: cỡ phần ngoài hồ sơ đã gửi (-1: gửi đủ)
      r = await HB.saveDelta(d);
      if (r && !r.ok && (r.code === 'STALE' || r.code === 'MISMATCH')) { window.__saveStats.fallback++; r = null; }
      else if (r && r.ok) window.__saveStats.delta++;
    }
  }
  if (!r) {
    const W = dbGhi(); snap = HAKDelta.snapshot(W);   // chụp lại ngay trước khi gửi: db có thể đã đổi trong lúc chờ
    r = await HB.save(W);
    if (r && r.ok) window.__saveStats.full++;
  }
  window.__saveStats.last = r && r.ok ? r.mode || 'full' : 'error';
  saveCache = r && r.ok && r.rev && !snap.dup ? {rev: r.rev, snap} : null;
  if (r && r.ok && !snap.dup) savedSnap = snap;
  return r;
}
function storeSave() { const p = saveChain.then(saveOnce, saveOnce); saveChain = p.catch(() => {}); return p; }
function flushSave() {
  saveTimer = null;
  storeSave().then(r => {
    if (r && r.ok) { storeOk = true; showSave('Đã lưu vào máy lúc ' + hhmm()); }
    else if (r && r.code === 'LOCKED') { storeOk = true; showSave('Lô chỉ đọc: không ghi thay đổi', true); pushNote(r.error, 'err'); render(); }
    else { storeOk = false; showSave('Lỗi lưu: ' + ((r && r.error) || 'không rõ') + ' — hãy sao lưu ngay', true); render(); }
  }).catch(e => { storeOk = false; showSave('Lỗi lưu: ' + e.message, true); });
}
function persist() {
  doiDuLieu();
  if (typeof ktXoaNho === 'function') ktXoaNho();
  if (dataIssueUi) return;   // chưa mở được cơ sở dữ liệu: không ghi gì
  if (HB) {
    showSave('… Đang lưu');
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(flushSave, 250);
    return;
  }
  try { localStorage.setItem(KEY, JSON.stringify(dbGhi())); storeOk = true; showSave('Lưu trong trình duyệt lúc ' + hhmm()); }
  catch (e) { storeOk = false; showSave('Trình duyệt không lưu được', true); }
}
if (HB) window.addEventListener('beforeunload', () => { if (saveTimer) { clearTimeout(saveTimer); flushSave(); } });

/* ========== Trạng thái giao diện ========== */
let cur = null;      // id chủ rừng đang mở
let curF = null;     // id rừng đang mở (thuộc chủ rừng cur)
let tab = 'info';    // info | rung
let xtab = 'hd';     // trong tab Xuất hồ sơ: hd | ld | vc | fsc | all
let ftab = 'finfo';  // trong rừng: finfo | nc | dx | xuat
let notes = [];      // thông báo tạm thời
let view = 'owner';  // owner | norm (định mức BHLĐ)
try { savedSnap = HAKDelta.snapshot(db); } catch (e) { savedSnap = null; }   // bản đã lưu lúc mở app
if (migrated) { persist(); notes.push({text: 'Đã chuyển dữ liệu sang cấu trúc Rừng. Dữ liệu cũ vẫn được giữ trong trình duyệt.', kind: 'ok'}); }

const note = (text, kind = 'ok') => { notes.push({text, kind}); render(); };
const pushNote = (text, kind = 'ok') => { notes.push({text, kind}); }; // chỉ xếp hàng, để lần render sau hiển thị
const curOwner = () => (cur && db.rs[cur]) || null;
const forestList = o => Object.values(o.forests || {});
/* Điểm đến vận chuyển hiệu lực của rừng: bản chụp công ty mua hàng, nếu chưa chọn thì điểm đến nhập tay cũ (src/muahang.js) */
const destOf = rec => HAKMuaHang.diemDen(rec.info, rec.exp);
const curForest = () => { const o = curOwner(); return (o && curF && o.forests[curF]) || null; };
/* Đội đang chọn của lô đang mở (bảng con “Nhân công khai thác”); chưa chọn / không còn: đội đầu */
let curDoi = null, curHd = null, ncTatCa = false;   // đội / hợp đồng vận chuyển đang chọn của lô đang mở
const curTeam = f => { f = f || curForest(); if (!f) return null; if (HAKModel.needsEnsure(f)) Object.assign(f, HAKModel.ensureForest(f)); return f.doi.find(d => d.id === curDoi) || f.doi[0]; };
/* thông tin rừng + hình thức của đội đầu (để đọc ở form thông tin rừng; hồ sơ dùng jobView) */
const fInfo = f => Object.assign({}, (f && f.info) || {}, (((f && f.doi) || [])[0] || {}).hinhThuc || {});
/* ghi các trường của ĐỘI vào đội (mặc định đội đang chọn), còn lại vào lô; trả phần của lô */
function ghiDoi(f, patch, kind, d) {
  const keys = kind === 'exp' ? HAKModel.DOI_EXP : HAKModel.DOI_INFO, rest = {}, team = d || curTeam(f);
  Object.entries(patch).forEach(([k, v]) => { if (keys.includes(k) && team) { const o = kind === 'exp' ? (team.exp = team.exp || {}) : (team.hinhThuc = team.hinhThuc || {}); o[k] = v; } else rest[k] = v; });
  return rest;
}
// Hồ sơ làm việc của một rừng: thông tin chủ rừng + thông tin rừng, kèm nhân công/vận chuyển/thông tin xuất của rừng đó
/* Cấu trúc 2.0 (giai đoạn 3): hình thức, cách tính, đơn giá, số văn bản nằm ở ĐỘI (f.doi, src/model.js). Hồ sơ của lô lấy của ĐỘI ĐẦU làm mặc định
 * (lô một đội: đúng như bản cũ); từng đội dùng subRec(rec, doiOf(rec), đội) và từng người dùng infoRow(rec, người). */
/* nhân công chưa có đội (vừa nạp Excel, thêm trong bản nháp): gán đúng như khi lưu — lô nhiều đội: người không ghi cột Đội vào ĐỘI ĐANG CHỌN;
 * còn lại theo src/model.js (cột Đội khớp tên đội; lô một đội: đội đó; thay cả danh sách: chia đội theo cột Đội như bản cũ) */
function ganDoi(doi, nc) {
  if (!doi || !doi.length || !(nc || []).some(r => r && r.doiId === undefined)) return {doi, nc};
  const t = doi.length > 1 ? (doi.find(d => d.id === curDoi) || doi[0]) : null;
  const nc2 = t ? nc.map(r => r && r.doiId === undefined && !trim(r.doi) ? Object.assign({}, r, {doiId: t.id}) : r) : nc;
  const x = HAKModel.ensureForest({doi, nc: nc2}); return {doi: x.doi, nc: x.nc};
}
/* Ô số / ngày văn bản (data-exp): mỗi ô nằm ở MÀN CỦA ĐỐI TƯỢNG sở hữu nó — đội (tab Nhân công), đội xe / vận chuyển chung (tab Vận chuyển), lô (tab Xuất hồ sơ).
 * Ghi: ô của đội ghi vào đội đang chọn (ghiDoi), còn lại vào lô. */
const EXP_VC = ['soVC', 'vcChiPhi', 'pcSo', 'pcNgay', 'pcNguoiLap', 'pcNguong'];
const expTab = k => HAKModel.DOI_EXP.includes(k) ? {ftab: 'nc', muc: 'vanban'} : EXP_VC.includes(k) ? {ftab: 'finfo', muc: 'giaohang'} : {ftab: 'xuat', xtab: ['capNgay', 'capHan', 'capNguoi', 'dtNgay', 'dtDiaDiem', 'dtThoiLuong', 'dtNguoi', 'dtNoiDung', 'tbNgay', 'tbNguoi', 'tbSoBinh', 'thang'].includes(k) ? 'ld' : 'hd'};
window.__expTab = expTab;   // kiểm thử đầu-cuối: ô này nằm ở màn nào
function expInputs(list, ex) {
  return '<div class="grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:10px">' +
    list.map(x => '<label>' + x[1] + '<input data-exp="' + x[0] + '" value="' + esc(ex[x[0]] || '') + '" placeholder="' + esc(x[2] || '') + '"></label>').join('') + '</div>';
}
/* tham số xuất của lô kèm ngày ký mặc định (ngày ký HĐ mua bán gỗ ở Thông tin chủ rừng) — MỘT chỗ cho mọi nơi dùng */
const expLo = (rec, exo) => { const ex = Object.assign({}, exo || rec.exp || {}); if (!ex.ngayKy && rec.info.ngayKyHopDong) ex.ngayKy = rec.info.ngayKyHopDong; return ex; };
/* xe chưa thuộc hợp đồng vận chuyển (vừa nạp, thêm trong bản nháp): gán như khi lưu (src/model.js: theo người ký; xe trong hợp đồng với đơn vị giữ nguyên) */
function ganVC(hdvc, dx) {
  if (!hdvc) return {hdvc, dx};
  const F0 = {dx, hdvc};   // xe có cột Đội xe khớp tên một đội xe của lô: vào đội xe đó (ưu tiên hơn đội xe đang chọn)
  if ((dx || []).some(r => r && r.hdvcId === undefined && trim(r.doiXe))) dx = dx.map(r => { if (!r || r.hdvcId !== undefined || !trim(r.doiXe)) return r; const m = hdvc.find(h => hdTenKhop(F0, h, r.doiXe)); return m ? Object.assign({}, r, {hdvcId: m.id}) : r; });
  const t = curHd && hdvc.find(h => h.id === curHd);   // xe mới (chưa có đội xe) vào ĐỘI XE ĐANG CHỌN; chưa chọn đội: theo người ký (mỗi người ký một đội như trước)
  if (t && (dx || []).some(r => r && r.hdvcId === undefined)) dx = dx.map(r => r && r.hdvcId === undefined ? Object.assign({}, r, {hdvcId: t.id}) : r);
  const F = {doi: [{id: '_'}], nc: [], hdvc, dx};
  if (!HAKModel.needsEnsure(F)) return {hdvc, dx};
  const x = HAKModel.ensureForest(F); return {hdvc: x.hdvc, dx: x.dx};
}
/* phiếu cân chưa gắn đội (vừa nạp, bản nháp): gán như khi lưu (src/model.js: lô một đội → đội đó; nhiều đội → theo cột Đội, không thì chưa gán) */
function ganPC(doi, pc) {
  if (!doi || !doi.length || !(pc || []).some(r => r && r.doiId === undefined)) return pc;
  return HAKModel.ensureForest({doi, nc: [], pc, dx: [], hdvc: []}).pc;
}
/* khối lượng thực tế = tổng phiếu cân (tấn, làm tròn từng phiếu theo kg như các báo cáo) */
const klPhieu = pc => HAKDinhMuc.tongPhieuTan(pc);   // một định nghĩa với kiểm tra chéo lô (src/dinhmuc.js)
function jobView(o, f) {
  if (!Array.isArray(f.doi) || !f.doi.length) Object.assign(f, HAKModel.ensureForest(f));   // lô mới tạo (chưa lưu lần nào): có đội ngay, như SQLite sẽ lưu
  const d0 = (f.doi || [])[0], exp = d0 && Object.keys(d0.exp || {}).length ? Object.assign({}, f.exp, d0.exp) : f.exp;
  const g = ganDoi(f.doi, f.nc), v = ganVC(f.hdvc || null, f.dx), pc = ganPC(g.doi, f.pc || []);
  return {id: o.id, fid: f.id, info: Object.assign({}, o.info, f.info, d0 ? d0.hinhThuc : {}, {_klPC: klPhieu(pc)}), nc: g.nc, dx: v.dx, pc, exp, cc: f.cc || {}, doi: g.doi || null, hdvc: v.hdvc || null,
    phanBo: f.phanBo || null,   /* 3.0: cách phân bổ khối lượng cho đội (src/phanbo.js) */
    ncFile: f.ncFile, ncAt: f.ncAt, dxFile: f.dxFile, dxAt: f.dxAt, pcFile: f.pcFile, pcAt: f.pcAt};
}
/* jobView có khóa nhớ tạm: xem ganKhoaHoSo */
{ const jv = jobView; jobView = function (o, f) { return ganKhoaHoSo(jv(o, f), (f && f.id) + '|luu'); }; }
const curRec = () => { const o = curOwner(), f = curForest(); return o && f ? jobView(o, f) : null; };
/* Định mức (tấn/ha) của rừng: giá trị rừng tự điền; chưa điền thì lấy định mức gỗ keo mặc định có hiệu lực theo ngày bắt đầu khai thác (Định mức BHLĐ → gỗ keo) */
const dinhMucEff = i => HAKDinhMuc.dinhMucLo(db, i);   // một định nghĩa với kiểm tra chéo lô (src/dinhmuc.js)
/* Định mức thời gian khai thác (ngày/ha) của rừng: số rừng tự điền, hoặc mặc định theo ngày bắt đầu (Định mức → Định mức thời gian khai thác) */
const nDoiNc = nc => { const ids = new Set((nc || []).map(r => r && r.doiId).filter(Boolean)); return ids.size ? ids.size : Math.max(1, HAKDoi.build(nc || [], isTT).doi.length); };   // số đội = số đội có người (bảng Nhân công khai thác); hồ sơ chưa có đội: số Tổ trưởng
const nDoiOf = (i, nc) => (nc || []).some(r => r && r.doiId) ? nDoiNc(nc) : isDirect(i) ? 1 : nDoiNc(nc);   // không còn ô “Số đội” nhập tay: một nguồn là danh sách đội   // số đội khai ở Thông tin rừng; chưa khai thì theo nhân công
const haDoi = (i, nd) => typeof i.dienTich === 'number' ? i.dienTich / (nd || 1) : i.dienTich;   // diện tích tính cho một đội
const ngayHaEff = i => {
  if (typeof i.dinhMucNgayHa === 'number' && i.dinhMucNgayHa > 0) return {v: i.dinhMucNgayHa, src: 'rừng'};
  const k = HAKDinhMuc.tgPick(db, i.tuNgay || ''); return k.found ? {v: k.item.ngayHa, src: 'mặc định', tu: k.item.tuNgay} : null;
};
/* Ngày kết thúc THỰC TẾ so với dự kiến: lấy ô “đến ngày”; chưa có thì lấy ngày cân cuối cùng của phiếu cân. null khi chưa đủ dữ liệu */
function tgLechOf(i, pcs, nd) {
  const d = ngayHaEff(i), n = d ? HAKDinhMuc.soNgay(haDoi(i, nd), d.v) : null; if (!n || !HAKDates.isValid(i.tuNgay)) return null;
  let den = trim(i.denNgay || ''), nguon = 'ô “đến ngày”';
  if (!HAKDates.isValid(den)) { const ds = (pcs || []).map(p => HAKDates.parse(p.ngay)).filter(Boolean); if (!ds.length) return null; den = HAKDates.format(ds.reduce((a, b) => b.key > a.key ? b : a)); nguon = 'ngày cân cuối cùng'; }
  const r = HAKDinhMuc.lechThoiGian(i.tuNgay, den, n); return r ? Object.assign({den, nguon}, r) : null;
}
const tgLechText = (i, L) => 'Thời gian khai thác thực tế ' + L.thucTe + ' ngày (' + i.tuNgay + ' → ' + L.den + ' theo ' + L.nguon + ', không tính Chủ nhật) ' + (L.lech > 0 ? 'DÀI hơn' : 'NGẮN hơn') + ' dự kiến ' + L.duKien + ' ngày: ' + (L.lech > 0 ? '+' : '') + L.lech + ' ngày (' + (L.tyLe > 0 ? '+' : '') + String(L.tyLe).replace('.', ',') + '%). Ngưỡng cảnh báo: lệch quá ' + L.nguong + ' ngày (20% thời gian dự kiến, tối thiểu 3 ngày). Kiểm tra diện tích, định mức ngày/ha hoặc ngày kết thúc.';
const forestDays = (i, nd) => { const d = ngayHaEff(i); return d ? HAKDinhMuc.soNgay(haDoi(i, nd), d.v) : null; };
const forestYield = i => HAKDinhMuc.sanLuongDuKien(db, i);
const toDec = v => { const s = trim(v).replace(',', '.'); if (!s) return null; const n = Number(s); return isFinite(n) ? n : 'x'; };
const GIAY_LOAI = ['Giấy chứng nhận QSDĐ', 'Giấy xác nhận', 'Khác'];

