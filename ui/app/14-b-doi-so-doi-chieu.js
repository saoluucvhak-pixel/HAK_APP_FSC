/* ========== Đổi số phiếu cân (thao tác riêng) và Đối chiếu / Mở dữ liệu Google Sheets ở màn chủ rừng, hồ sơ rừng ==========
 * Phần 1 — Đổi số phiếu: hộp thoại bắt lý do, chặn trùng số + ngày trong lô, cảnh báo trùng lô khác (xác nhận), chặn lô đã chốt/dừng; ghi vào bản nháp
 *   (HAKStage.doiSoPhieu: giữ _id, khối lượng, xe; số cũ vào soCu) và nhật ký lô f.soLog được nối ở stSave (11-d) khi bấm Lưu dữ liệu vào lô.
 * Phần 2 — hai nút ở màn Thêm/Sửa chủ rừng và hồ sơ rừng: “Mở dữ liệu Google Sheets” và “Đối chiếu với Google Sheets”. Đối chiếu CHỈ ĐỌC (không ghi db,
 *   không chặn lưu). Mở màn khác qua MỘT điểm vào: window.moDuLieuSheets({maHd}) (màn “Dữ liệu Google Sheets”); chưa có thì dùng phần ngắt dsMoTheoHopDong bên dưới.
 * Mọi giá trị từ Google Sheet và từ người dùng đưa vào HTML đều qua esc(). */

/* phép ghi đổi số cũng phải làm đổi phiên bản dữ liệu (bộ nhớ tạm kiểm tra theo dataVer, xem 02) */
{ const g = HAKStage.doiSoPhieu; if (typeof g === 'function' && !g._dv) { const w = function () { doiDuLieu(); try { return g.apply(this, arguments); } finally { doiDuLieu(); } }; w._dv = true; HAKStage.doiSoPhieu = w; } }

/* thứ tự nhập của rừng (QĐ8): theo taoLuc tăng dần, rừng cũ (không có taoLuc) xếp trước và giữ vị trí hiện có */
const forestListNhap = o => forestList(o).map((f, i) => [f, i]).sort((a, b) => String(a[0].taoLuc || '').localeCompare(String(b[0].taoLuc || '')) || a[1] - b[1]).map(x => x[0]);

/* chú thích số cũ ở bảng phiếu cân */
const soCuHtml = r => (r && Array.isArray(r.soCu) && r.soCu.length) ? '<br><small class="mut" title="Phiếu này đã đổi số: ' + esc(r.soCu.map(c => c.so + (c.lyDo ? ' (' + c.lyDo + ')' : '')).join('; ')) + '">trước đây: ' + esc(r.soCu.map(c => c.so).join(' → ')) + '</small>' : '';

/* ---------- Phần 1: Đổi số phiếu ---------- */
let dsPhieu = null;   // {id, so, lyDo, xn, canhBao, loi, form}
function pcDoiSoCtx(f) {
  const lo = [];
  Object.values(db.rs || {}).forEach(ow => forestList(ow).forEach(ff => { if (ff.id === f.id) return; (ff.pc || []).forEach(p => lo.push({lo: (ff.info || {}).maRung || '?', p})); }));
  return {loKhoa: loKhoa(f), phieuLoKhac: lo, xacNhanLoKhac: !!(dsPhieu && dsPhieu.xn)};
}
function pcDoiSoMo(i, form) {
  const f = curForest(); if (!f) return; if (loKhoa(f)) return loKhoaNote(f);
  const st = stGet(true); if (!st) return;
  const r = st.cur.pc[i]; if (!r) return;
  if (!st.base.pc.some(b => b._id === r._id)) { note('Phiếu mới chưa lưu: sửa trực tiếp ô Số phiếu trong bản nháp, không cần đổi số có lý do.', 'warn'); return; }
  dsPhieu = {id: r._id, so: '', lyDo: '', xn: false, canhBao: null, loi: '', form: !!form};
  pcDoiSoVe();
}
function pcDoiSoVe() {
  const st = stCur(), r = st && dsPhieu && st.cur.pc.find(x => x._id === dsPhieu.id); if (!r) return;
  const D = dsPhieu;
  $('#stBody').innerHTML = '<div class="gh"><h2>Đổi số phiếu cân</h2><button class="btn ghost sm" data-act="pcDoiSoHuy">✕ Đóng</button></div>' +
    '<p class="mut" style="margin:0 0 8px">Cùng một chuyến, đổi số phiếu: khối lượng, xe và ngày cân giữ nguyên; số cũ được ghi lại (nhật ký đổi số) và vẫn nhận ra khi nạp lại từ Google Sheets / Excel. Thay đổi chỉ vào bản nháp đến khi bấm <b>Lưu dữ liệu vào lô</b>.</p>' +
    (D.loi ? '<div class="msg err" id="dsLoi">' + esc(D.loi) + '</div>' : '') +
    (D.canhBao ? '<div class="msg warn" id="dsCanhBao"><b>Cần xác nhận:</b><ul class="issues">' + D.canhBao.map(c => '<li>' + esc(c) + '</li>').join('') + '</ul><label style="flex-direction:row;gap:8px;color:var(--ink)"><input type="checkbox" id="dsXn"' + (D.xn ? ' checked' : '') + '> <span>Tôi đã đối chiếu (ngày, biển số, khối lượng) và vẫn đổi số.</span></label></div>' : '') +
    '<form id="dsForm" class="grid"><label><span>Số phiếu hiện tại</span><input value="' + esc(r.soPhieu) + '" readonly aria-readonly="true"></label>' +
    '<label><span>Ngày cân · khối lượng</span><input value="' + esc((r.ngay || '') + ' · ' + (typeof r.kl === 'number' ? formatNumber(r.kl, 3) + ' tấn' : '')) + '" readonly aria-readonly="true"></label>' +
    '<label><span class="req">Số phiếu mới</span><input name="soMoi" id="dsSoMoi" maxlength="64" autocomplete="off" value="' + esc(D.so) + '"></label>' +
    '<label style="grid-column:1/-1"><span class="req">Lý do đổi số (ít nhất 3 ký tự)</span><input name="lyDo" id="dsLyDo" maxlength="500" autocomplete="off" value="' + esc(D.lyDo) + '" placeholder="vd: trạm cân in lại phiếu, đổi số"></label>' +
    ((r.soCu || []).length ? '<div style="grid-column:1/-1" class="mut">Đã từng đổi số: ' + (r.soCu || []).map(c => esc(c.so) + (c.lyDo ? ' (' + esc(c.lyDo) + ')' : '')).join(' → ') + '</div>' : '') +
    '<div style="grid-column:1/-1" class="row"><button class="btn" type="submit" id="dsOk">Đổi số phiếu</button><button class="btn ghost" type="button" data-act="pcDoiSoHuy">Hủy</button></div></form>';
  $('#stBox').classList.add('on'); const el = $('#dsSoMoi'); if (el) el.focus();
}
function pcDoiSoDong() {
  const form = dsPhieu && dsPhieu.form; dsPhieu = null;
  if (form && stm && stm.kind === 'pc') return stRender();   // quay lại biểu mẫu Sửa phiếu đang mở dở
  $('#stBox').classList.remove('on');
}
function pcDoiSoGhi() {
  const f = curForest(), st = stCur(); if (!f || !st || !dsPhieu) return;
  const D = dsPhieu, fe = $('#dsForm'); if (fe) { const fd = new FormData(fe); D.so = String(fd.get('soMoi') || ''); D.lyDo = String(fd.get('lyDo') || ''); }
  const xn = $('#dsXn'); if (xn) D.xn = xn.checked;
  const r = HAKStage.doiSoPhieu(st, D.id, D.so, {lyDo: D.lyDo, nguon: {loai: 'tay'}, at: new Date().toISOString()}, pcDoiSoCtx(f));
  if (!r.ok) { D.loi = r.ma === 'CAN_XAC_NHAN' ? '' : r.error; D.canhBao = r.ma === 'CAN_XAC_NHAN' ? r.canhBao : null; if (r.ma === 'CAN_XAC_NHAN') D.xn = false; if (r.ma === 'LO_KHOA') { dsPhieu = null; $('#stBox').classList.remove('on'); return loKhoaNote(f); } return pcDoiSoVe(); }
  const moi = st.cur.pc.find(x => x._id === D.id), form = D.form; dsPhieu = null; stErrList = null;
  pushNote('Đã đổi số phiếu ' + r.entry.so + ' → ' + (moi ? moi.soPhieu : '') + ' trong bản nháp (khối lượng giữ nguyên). Bấm Lưu dữ liệu vào lô để ghi nhật ký đổi số.', 'ok');
  if (form && stm && stm.kind === 'pc' && stm.id === D.id) { stm.vals.soPhieu = moi ? moi.soPhieu : stm.vals.soPhieu; render(); return stRender(); }
  $('#stBox').classList.remove('on'); render();
}

/* ---------- Phần 2: Đối chiếu / Mở dữ liệu Google Sheets ---------- */
const dcFold = s => String(s == null ? '' : s).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase().replace(/\s+/g, ' ').trim();
const dcSo = s => String(s == null ? '' : s).replace(/\D/g, '');
const dcHd = s => String(s == null ? '' : s).replace(/\s+/g, ' ').trim().toUpperCase();
const dcNgay = v => { const t = String(v == null ? '' : v).trim(); if (!t) return ''; const p = HAKDates.parse(t); return p && p.key != null ? String(p.key) : 't:' + dcFold(t); };
const dcCccdOk = c => /^(\d{9}|\d{12})$/.test(dcSo(c));
/* mã hợp đồng của lô: ưu tiên nơi ghi từ Google Sheets, rồi tham chiếu đã lưu */
const dcHdLo = f => dcHd(((f.info || {}).nguon || {}).hd || (f.ref || {}).hd || '');
/* các lô của chủ rừng đã lưu mã hợp đồng này */
const dcLoCuaHd = (o, hd) => forestList(o).filter(f => hd && dcHdLo(f) === hd);
const dcTan = lots => lots.reduce((t, f) => t + (klPhieu(f.pc || []) || 0), 0);
const dcFmtTan = v => v == null ? '—' : formatNumber(v, 3) + ' tấn';
const dcNutLyDo = ({cccd, hd}) => !dcCccdOk(cccd) && !hd ? 'Nhập CCCD hợp lệ (9 hoặc 12 số) và số hợp đồng để dùng hai nút này.' : !dcCccdOk(cccd) ? 'Nhập CCCD hợp lệ (9 hoặc 12 số) để dùng hai nút này.' : !hd ? 'Nhập số hợp đồng mua bán gỗ để dùng hai nút này.' : '';
function dcKhungHtml(id, nut) {
  if (!HB) return '';
  const why = dcNutLyDo(nut), dis = why ? ' disabled aria-disabled="true"' : '';
  return '<div class="card dcKhung" id="' + id + '"><h3 style="margin-top:0">Dữ liệu Google Sheets</h3>' +
    '<div class="row" style="flex-wrap:wrap"><button class="btn" type="button" data-act="dsMo"' + dis + '>Mở dữ liệu Google Sheets</button><button class="btn ghost" type="button" data-act="dsDoiChieu"' + dis + '>Đối chiếu với Google Sheets</button></div>' +
    '<p class="mut dcLyDo" style="margin:6px 0 0">' + esc(why || 'Đối chiếu chỉ so sánh, không ghi gì vào hồ sơ và không chặn lưu.') + '</p><div class="dcKetQua" aria-live="polite"></div></div>';
}
/* giá trị đang nhập ở màn chủ rừng (chưa cần lưu) */
function dcDocForm() { const fe = $('#infoForm'), o = curOwner(); if (!fe) return o ? {ten: o.info.ten || '', cccd: o.info.cccd || '', hd: dcHd(o.info.soHopDong), ngayKy: o.info.ngayKyHopDong || ''} : null; const fd = new FormData(fe); return {ten: trim(fd.get('ten')), cccd: normCccd(fd.get('cccd')), hd: dcHd(fd.get('soHopDong')), ngayKy: trim(fd.get('ngayKyHopDong'))}; }
function dcCapNhatNut() {
  const k = document.querySelector('#dcChu'); if (!k) return; const v = dcDocForm(); if (!v) return; const why = dcNutLyDo(v);
  k.querySelectorAll('[data-act=dsMo],[data-act=dsDoiChieu]').forEach(b => { b.disabled = !!why; if (why) b.setAttribute('aria-disabled', 'true'); else b.removeAttribute('aria-disabled'); });
  const p = k.querySelector('.dcLyDo'); if (p) p.textContent = why || 'Đối chiếu chỉ so sánh, không ghi gì vào hồ sơ và không chặn lưu.';
}
/* phiếu Sheet hợp lệ: cùng quy tắc gsSummary (bỏ phiếu lỗi và phiếu lệch CCCD) */
const dcPhieuHopLe = sh => (sh.phieu || []).filter(p => !p.issue && !p.lechCccd);
const dcTanSheet = sh => Math.round(dcPhieuHopLe(sh).reduce((t, p) => t + (p.kl > 0 ? p.kl : 0), 0) * 1000) / 1000;
/* hàm thuần: so từng mục. nhap = giá trị đã nhập; sh = kết quả lookup.buildHd; ctx = {lots} lô của chủ rừng đã lưu mã hợp đồng (rỗng: không so số rừng/tổng tấn) */
function dcSoSanh(nhap, sh, ctx) {
  const rows = [], so = (muc, nh, sv, lech, ghiChu) => rows.push({muc, nh, sv, lech: !!lech, ghiChu: ghiChu || ''});
  const fld = k => { const x = ((sh.owner || {}).fields || []).find(y => y.key === k); return x ? x.value : ''; };
  const tenS = fld('ten'), cccdS = (sh.cccdList && sh.cccdList.length ? sh.cccdList : [fld('cccd')]).filter(Boolean), ngayS = fld('ngayKyHopDong');
  if (tenS) so('Họ tên', nhap.ten, tenS, dcFold(nhap.ten) !== dcFold(tenS), 'không phân biệt dấu, hoa/thường'); else so('Họ tên', nhap.ten, '(Sheet không có)', false);
  if (cccdS.length) so('CCCD', nhap.cccd, cccdS.join(', '), !cccdS.some(c => dcSo(c) === dcSo(nhap.cccd)), sh.nhieuCccd ? 'hợp đồng thuộc nhiều CCCD trên Sheet' : ''); else so('CCCD', nhap.cccd, '(Sheet không có)', false);
  if (ngayS) so('Ngày ký hợp đồng', nhap.ngayKy, String(ngayS), dcNgay(nhap.ngayKy) !== dcNgay(ngayS)); else so('Ngày ký hợp đồng', nhap.ngayKy, '(Sheet không có)', false);
  const lots = (ctx && ctx.lots) || [];
  if (lots.length) {
    const tanS = dcTanSheet(sh), tanA = Math.round(dcTan(lots) * 1000) / 1000;
    so('Số rừng', String(lots.length), String((sh.forests || []).length), lots.length !== (sh.forests || []).length, 'lô của chủ rừng đã lưu mã hợp đồng này');
    so('Tổng tấn phiếu cân', dcFmtTan(tanA), dcFmtTan(tanS), Math.abs(tanA - tanS) > 0.0005, dcPhieuHopLe(sh).length + ' phiếu hợp lệ trên Sheet; phía hồ sơ chỉ tính phiếu đã lưu, chưa tính bản nháp');
  } else so('Số rừng · tổng tấn', '(chưa có lô lưu mã hợp đồng này)', '(không so)', false, 'chỉ so khi lô đã lưu mã hợp đồng');
  return rows;
}
/* hồ sơ rừng đã lưu: số rừng, tổng tấn, số phiếu của hợp đồng + từng trường của chính rừng này */
function dcSoSanhRung(o, f, sh, hd) {
  const rows = [], so = (muc, nh, sv, lech, ghiChu) => rows.push({muc, nh, sv, lech: !!lech, ghiChu: ghiChu || ''});
  const lots = dcLoCuaHd(o, hd), nLo = lots.length || 1, use = lots.length ? lots : [f];
  const tanS = dcTanSheet(sh), tanA = Math.round(dcTan(use) * 1000) / 1000;
  so('Số rừng của hợp đồng', String(nLo), String((sh.forests || []).length), nLo !== (sh.forests || []).length, lots.length ? '' : 'lô này chưa lưu mã hợp đồng: so theo một lô');
  so('Tổng tấn phiếu cân', dcFmtTan(tanA), dcFmtTan(tanS), Math.abs(tanA - tanS) > 0.0005, 'phía hồ sơ chỉ tính phiếu đã lưu, chưa tính bản nháp');
  const nP = use.reduce((n, x) => n + (x.pc || []).length, 0); so('Số phiếu cân', String(nP), String((sh.phieu || []).length), nP !== (sh.phieu || []).length);
  const i = f.info || {}, F = (sh.forests || []).find(x => dcHd(x.maRung) === dcHd(i.maRung) && x.maRung);
  if (!F) so('Rừng ' + (i.maRung || '?'), i.maRung || '', '(mã rừng không có trên Sheet)', true);
  else {
    const g = k => { const x = (F.fields || []).find(y => y.key === k); return x ? x.value : undefined; };
    if (g('diaDiem') !== undefined) so('Địa điểm khai thác', i.diaDiem, g('diaDiem'), dcFold(i.diaDiem) !== dcFold(g('diaDiem')));
    if (g('dinhMucTanHa') !== undefined) so('Định mức (tấn/ha)', typeof i.dinhMucTanHa === 'number' ? formatNumber(i.dinhMucTanHa, 3) : '', formatNumber(g('dinhMucTanHa'), 3), !(typeof i.dinhMucTanHa === 'number' && Math.abs(i.dinhMucTanHa - g('dinhMucTanHa')) < 0.0001));
    const ha = F.area && F.area[0] ? F.area[0].value : undefined; if (ha !== undefined) so('Diện tích (ha)', typeof i.dienTich === 'number' ? formatNumber(i.dienTich, 4) : '', formatNumber(ha, 4), !(typeof i.dienTich === 'number' && Math.abs(i.dienTich - ha) < 0.0001));
  }
  return rows;
}
function dcBangHtml(rows) {
  const n = rows.filter(r => r.lech).length;
  return (n ? '<div class="msg warn" id="dcTong"><b>' + n + ' chênh lệch</b> giữa dữ liệu đang có và Google Sheets. Chỉ cảnh báo: không ghi gì, vẫn lưu được.</div>' : '<div class="msg ok" id="dcTong">Khớp Google Sheets ở mọi mục đã so.</div>') +
    '<div class="wrap"><table class="dcBang" style="min-width:0;table-layout:auto"><thead><tr><th>Mục</th><th>Đã nhập</th><th>Trên Sheet</th><th>Kết luận</th></tr></thead><tbody>' +
    rows.map(r => '<tr' + (r.lech ? ' class="dcLech" data-lech="1" style="background:var(--warnBg)"' : '') + '><td>' + esc(r.muc) + '</td><td>' + esc(r.nh) + '</td><td>' + esc(r.sv) + '</td><td>' + (r.lech ? '<b>Chênh lệch</b>' : 'Khớp') + (r.ghiChu ? ' <small class="mut">' + esc(r.ghiChu) + '</small>' : '') + '</td></tr>').join('') + '</tbody></table></div>';
}
async function dcLanDongBo() { try { const s = await HB.lookup.status(); return s && s.active && s.active.loadedAt ? ' (đồng bộ lúc ' + fmtDT(s.active.loadedAt) + ')' : ''; } catch (e) { return ''; } }
/* điểm vào có tên rõ: mở màn “Dữ liệu Google Sheets” đúng hợp đồng. Không có hợp đồng → báo, KHÔNG mở khung trống. */
async function dsMoTheoHopDong(maHd) {
  if (!HB) return {ok: false, error: 'Chỉ có ở bản desktop.'};
  const hd = dcHd(maHd), r = await HB.lookup.buildHd(hd);
  if (!r || !r.ok) { const msg = (r && r.error) || 'Không tìm thấy hợp đồng ' + hd + ' trên Google Sheets.'; note(msg + (/Chưa có bản tra cứu/.test(msg) ? '' : await dcLanDongBo()), 'err'); return {ok: false, error: msg}; }
  if (typeof window.moDuLieuSheets === 'function') { await window.moDuLieuSheets({maHd: hd}); return {ok: true}; }
  /* PHẦN NGẮT: màn mới chưa nối. Queen nối bằng cách định nghĩa window.moDuLieuSheets({maHd}) ở 17-*; tạm mở màn Tra cứu hiện có, tìm sẵn theo mã hợp đồng */
  lk.q = 'hd:' + hd; lk.res = null; await lkOpen(); return {ok: true, stub: true};
}
async function dcChay(kind, el) {
  const kh = el.closest('.dcKhung'), kq = kh && kh.querySelector('.dcKetQua'); if (!kq) return;
  const o = curOwner(); if (!o) return;
  const chuRung = kh.id === 'dcChu', f = chuRung ? null : curForest();
  const nhap = chuRung ? dcDocForm() : {ten: o.info.ten || '', cccd: o.info.cccd || '', hd: dcHd(dcHdLo(f) || o.info.soHopDong), ngayKy: o.info.ngayKyHopDong || ''};
  if (!nhap || !nhap.hd) { kq.innerHTML = '<div class="msg err">Chưa có số hợp đồng.</div>'; return; }
  if (kind === 'mo') return dsMoTheoHopDong(nhap.hd);
  kq.innerHTML = '<div class="msg warn">Đang đối chiếu…</div>';
  let r; try { r = await HB.lookup.buildHd(nhap.hd); } catch (e) { r = {ok: false, error: String(e && e.message || e)}; }
  if (!r || !r.ok) { kq.innerHTML = '<div class="msg err" id="dcLoi">' + esc((r && r.error) || 'Không tìm thấy hợp đồng ' + nhap.hd + ' trên Google Sheets.') + esc(/Chưa có bản tra cứu/.test((r && r.error) || '') ? '' : await dcLanDongBo()) + '</div>'; return; }
  const rows = chuRung ? dcSoSanh(nhap, r, {lots: dcLoCuaHd(o, nhap.hd)}) : [].concat(dcSoSanh(nhap, r, {lots: []}).slice(0, 3), dcSoSanhRung(o, f, r, nhap.hd));
  kq.innerHTML = (r.canhBaoNang && r.canhBaoNang.length ? '<div class="msg err">Cảnh báo nặng: hợp đồng ' + esc(nhap.hd) + ' thuộc nhiều CCCD trên Sheet. Kiểm tra kỹ trước khi cập nhật.</div>' : '') + dcBangHtml(rows) +
    '<div class="row"><button class="btn sm" type="button" data-act="dsMoHd" data-hd="' + esc(nhap.hd) + '">Mở hợp đồng ' + esc(nhap.hd) + ' để xem và cập nhật</button></div>';
}

/* khung ở màn chủ rừng (sau biểu mẫu thông tin) và ở hồ sơ rừng đã lưu: bọc hàm vẽ có sẵn, không đổi hàm gốc */
{ const g = panelInfo; panelInfo = function (rec) { return g(rec) + dcKhungHtml('dcChu', {cccd: (rec.info || {}).cccd, hd: dcHd((rec.info || {}).soHopDong)}); }; }
{ const g = panelForest; panelForest = function (f, muc) { const o = curOwner(), hd = dcHd(dcHdLo(f) || (o && o.info.soHopDong)); return g(f, muc) + dcKhungHtml('dcRung', {cccd: o && o.info.cccd, hd}); }; }

document.addEventListener('click', e => {
  const el = e.target && e.target.closest && e.target.closest('[data-act]'); if (!el) return; const a = el.dataset.act;
  if (a === 'pcDoiSo') { e.preventDefault(); return pcDoiSoMo(+el.dataset.i, false); }
  if (a === 'pcDoiSoForm') { e.preventDefault(); stRead(); const st = stCur(), i = st ? st.cur.pc.findIndex(x => x._id === stm.id) : -1; return i >= 0 ? pcDoiSoMo(i, true) : undefined; }
  if (a === 'pcDoiSoHuy') { e.preventDefault(); return pcDoiSoDong(); }
  if (a === 'dsMo' || a === 'dsDoiChieu') { e.preventDefault(); if (el.disabled) return; return dcChay(a === 'dsMo' ? 'mo' : 'doichieu', el); }
  if (a === 'dsMoHd') { e.preventDefault(); return dsMoTheoHopDong(el.dataset.hd); }
});
document.addEventListener('submit', e => { if (e.target && e.target.id === 'dsForm') { e.preventDefault(); e.stopPropagation(); pcDoiSoGhi(); } }, true);
document.addEventListener('input', e => { const fe = e.target && e.target.form; if (fe && fe.id === 'infoForm') dcCapNhatNut(); });
CONG_KT.doiChieu = {soSanh: dcSoSanh, soSanhRung: dcSoSanhRung};
