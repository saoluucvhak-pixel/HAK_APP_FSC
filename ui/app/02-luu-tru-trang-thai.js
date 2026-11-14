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
      else { dbInfo = r; if (r.notice) pendingNotice = r.notice; const o = r.db; return withDefaults(o && o.v === 2 ? o : (o && o.rs && Object.keys(o.rs).length ? migrateV1(o) : {v: 2, rs: {}})); }
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
if (HB) { document.addEventListener('DOMContentLoaded', () => { const l = document.getElementById('restoreLbl'); if (l) l.firstChild.textContent = 'Khôi phục toàn bộ dữ liệu (.json)'; document.querySelectorAll('.deskOnly').forEach(x => { x.hidden = false; }); }); }
let saveSt = {text: '', err: false}, saveTimer = null;
function showSave(text, err) { saveSt = {text, err: !!err}; const el = document.getElementById('saveSt'); if (el) { el.textContent = text; el.classList.toggle('err', !!err); } }
const hhmm = () => new Date().toLocaleTimeString('vi-VN');
function flushSave() {
  saveTimer = null;
  HB.save(db).then(r => {
    if (r && r.ok) { storeOk = true; showSave('Đã lưu vào máy lúc ' + hhmm()); }
    else { storeOk = false; showSave('Lỗi lưu: ' + ((r && r.error) || 'không rõ') + ' — hãy sao lưu ngay', true); render(); }
  }).catch(e => { storeOk = false; showSave('Lỗi lưu: ' + e.message, true); });
}
function persist() {
  if (dataIssueUi) return;   // chưa mở được cơ sở dữ liệu: không ghi gì
  if (HB) {
    showSave('… Đang lưu');
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(flushSave, 250);
    return;
  }
  try { localStorage.setItem(KEY, JSON.stringify(db)); storeOk = true; showSave('Lưu trong trình duyệt lúc ' + hhmm()); }
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
if (migrated) { persist(); notes.push({text: 'Đã chuyển dữ liệu sang cấu trúc Rừng. Dữ liệu cũ vẫn được giữ trong trình duyệt.', kind: 'ok'}); }

const note = (text, kind = 'ok') => { notes.push({text, kind}); render(); };
const pushNote = (text, kind = 'ok') => { notes.push({text, kind}); }; // chỉ xếp hàng, để lần render sau hiển thị
const curOwner = () => (cur && db.rs[cur]) || null;
const forestList = o => Object.values(o.forests || {});
/* Điểm đến vận chuyển hiệu lực của rừng: bản chụp công ty mua hàng, nếu chưa chọn thì điểm đến nhập tay cũ (src/muahang.js) */
const destOf = rec => HAKMuaHang.diemDen(rec.info, rec.exp);
const curForest = () => { const o = curOwner(); return (o && curF && o.forests[curF]) || null; };
// Hồ sơ làm việc của một rừng: thông tin chủ rừng + thông tin rừng, kèm nhân công/vận chuyển/thông tin xuất của rừng đó
function jobView(o, f) {
  return {id: o.id, fid: f.id, info: Object.assign({}, o.info, f.info), nc: f.nc, dx: f.dx, pc: f.pc || [], exp: f.exp, cc: f.cc || {},
    ncFile: f.ncFile, ncAt: f.ncAt, dxFile: f.dxFile, dxAt: f.dxAt, pcFile: f.pcFile, pcAt: f.pcAt};
}
const curRec = () => { const o = curOwner(), f = curForest(); return o && f ? jobView(o, f) : null; };
/* Định mức (tấn/ha) của rừng: giá trị rừng tự điền; chưa điền thì lấy định mức gỗ keo mặc định có hiệu lực theo ngày bắt đầu khai thác (Định mức BHLĐ → gỗ keo) */
const dinhMucEff = i => {
  if (typeof i.dinhMucTanHa === 'number' && i.dinhMucTanHa > 0) return {v: i.dinhMucTanHa, src: 'rừng'};
  const k = HAKDinhMuc.keoPick(db, i.tuNgay || ''); return k.found ? {v: k.item.tanHa, src: 'mặc định', tu: k.item.tuNgay} : null;
};
/* Định mức thời gian khai thác (ngày/ha) của rừng: số rừng tự điền, hoặc mặc định theo ngày bắt đầu (Định mức → Định mức thời gian khai thác) */
const nDoiNc = nc => Math.max(1, HAKDoi.build(nc || [], isTT).doi.length);   // số đội theo nhân công = số Tổ trưởng
const nDoiOf = (i, nc) => (typeof i.soDoi === 'number' && i.soDoi >= 1) ? i.soDoi : isDirect(i) ? 1 : nDoiNc(nc);   // số đội khai ở Thông tin rừng; chưa khai thì theo nhân công
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
const forestYield = i => { const d = dinhMucEff(i); return (typeof i.dienTich === 'number' && d) ? i.dienTich * d.v : null; };
const toDec = v => { const s = trim(v).replace(',', '.'); if (!s) return null; const n = Number(s); return isFinite(n) ? n : 'x'; };
const GIAY_LOAI = ['Giấy chứng nhận QSDĐ', 'Giấy xác nhận', 'Khác'];

