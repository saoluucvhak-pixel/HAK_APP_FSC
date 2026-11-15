/* ========== Người chung (bản 2.2, mục 6.3): một người một CCCD, dù là lao động, tài xế hay đối tác cá nhân ==========
 * Dựng từ ba danh mục (src/danhmuc.js nguoiChung): gõ CCCD ở bất kỳ danh mục nào, phần mềm nhận ra người đã có và điền sẵn chỗ trống; "Gộp hai người" khi nhập sai số CCCD. */
let dmGopTu = '';
const NGUOI_FORM = {
  dmLdForm: {cccd: 'cccd', dien: {ten: 'ten', gioiTinh: 'gioiTinh', ngaySinh: 'ngaySinh', diaChi: 'diaChi', ngayCap: 'ngayCap', noiCap: 'noiCap', sdt: 'sdt'}},
  dmXeForm: {cccd: 'cccdTx', dien: {ten: 'taiXe', diaChi: 'diaChiTx', ngayCap: 'ngayCapTx', noiCap: 'noiCapTx'}},
  dmDtForm: {cccd: 'cccd', dien: {ten: 'ten', ngaySinh: 'ngaySinh', diaChi: 'diaChi', ngayCap: 'ngayCap', noiCap: 'noiCap', sdt: 'sdt'}}
};
function dmTabNguoi() {
  const all = HAKDanhMuc.nguoiChung(db), rows = dmLoc(all, r => [r.ten, r.cccd, r.diaChi, r.sdt].join(' '));
  const gop = dmGopTu && all.find(x => x.cccd === dmGopTu);
  const form = gop ? '<form id="dmGopForm" class="card" style="margin:8px 0"><h4 style="margin:0 0 6px">Gộp người CCCD ' + esc(gop.cccd) + ' (' + esc(gop.ten) + ') vào người khác</h4>' +
    '<p class="mut" style="margin:0 0 6px">Dùng khi một người bị nhập thành hai CCCD (gõ sai hoặc đổi giấy tờ). Mọi dòng của số này (lao động, tài xế, đối tác) chuyển sang số bên dưới, giữ nguyên lịch sử. Hồ sơ đã in và bản chụp trong lô <b>không đổi</b>.</p>' +
    '<label>Gộp vào người (CCCD đúng) <select name="den">' + all.filter(x => x.cccd !== gop.cccd).map(x => '<option value="' + esc(x.cccd) + '">' + esc(x.ten + ' · ' + x.cccd) + '</option>').join('') + '</select></label> ' +
    '<button class="btn" type="submit">Gộp</button> <button class="btn ghost" type="button" data-dmgop="">Hủy</button></form>' : '';
  return '<p class="mut" style="margin:0">Mỗi người <b>một CCCD</b>, dù là lao động, tài xế hay đối tác cá nhân. Danh sách này dựng từ ba danh mục; gõ CCCD ở danh mục nào phần mềm cũng nhận ra người đã có và điền sẵn. Sửa thông tin: thêm dòng cập nhật ở danh mục của vai trò đó.</p>' + dmBoxLoc('họ tên, CCCD, thường trú, số điện thoại') + form +
    '<div class="wrap"><table class="normTbl" id="dmNguoiTbl" style="min-width:0;table-layout:auto"><thead><tr><th>CCCD</th><th>Họ và tên</th><th>Thường trú</th><th>Ngày cấp</th><th>Nơi cấp</th><th>SĐT</th><th>Vai trò</th><th></th></tr></thead><tbody>' +
    (rows.length ? rows.map(r => '<tr><td>' + esc(r.cccd) + '</td><td><b>' + esc(r.ten) + '</b></td><td>' + esc(r.diaChi) + '</td><td>' + esc(r.ngayCap) + '</td><td>' + esc(r.noiCap) + '</td><td>' + esc(r.sdt) + '</td><td>' + r.vaiTro.map(v => '<span class="pill">' + esc(v) + '</span>').join(' ') + '</td><td><button class="btn ghost sm" data-dmgop="' + esc(r.cccd) + '">Gộp vào người khác</button></td></tr>').join('') : '<tr><td colspan="8" class="mut">Chưa có người nào trong danh mục.</td></tr>') + '</tbody></table></div>';
}
document.addEventListener('click', e => { const b = e.target.closest && e.target.closest('[data-dmgop]'); if (b) { dmGopTu = b.dataset.dmgop; render(); } });
document.addEventListener('submit', e => {
  if (!e.target || e.target.id !== 'dmGopForm') return; e.preventDefault();
  const den = e.target.elements.den.value, tu = dmGopTu, a = HAKDanhMuc.timNguoi(db, tu), b = HAKDanhMuc.timNguoi(db, den);
  if (!confirm('Gộp ' + (a && a.ten) + ' (' + tu + ') vào ' + (b && b.ten) + ' (' + den + ')?\nCác dòng danh mục của số ' + tu + ' sẽ chuyển sang số ' + den + '. Hồ sơ đã in không đổi.')) return;
  const r = HAKDanhMuc.gopNguoi(db, tu, den); if (!r.ok) return note('Chưa gộp: ' + r.error, 'err');
  db.dmLaoDong = r.db.dmLaoDong; db.dmXeVC = r.db.dmXeVC; db.dmDoiTac = r.db.dmDoiTac; dmGopTu = ''; persist();
  note('Đã gộp ' + tu + ' vào ' + den + ': chuyển ' + r.so.laoDong + ' dòng lao động, ' + r.so.xe + ' xe (tài xế), ' + r.so.doiTac + ' đối tác.', 'ok');
});
/* gõ CCCD ở form danh mục: nhận ra người đã có, điền sẵn các ô còn trống (không ghi đè ô đã nhập) */
document.addEventListener('change', e => {
  const t = e.target, fm = t && t.form, cfg = fm && NGUOI_FORM[fm.id]; if (!cfg || t.name !== cfg.cccd) return;
  const p = HAKDanhMuc.timNguoi(db, t.value); if (!p) return; let n = 0;
  Object.entries(cfg.dien).forEach(([k, ten]) => { const el = fm.elements[ten]; if (el && !trim(el.value) && p[k]) { el.value = p[k]; n++; } });
  if (n) formMsg(fm, 'Đã nhận ra ' + p.ten + ' (' + p.vaiTro.join(', ') + '): điền sẵn ' + n + ' ô còn trống từ thông tin đã có.'), fm.querySelector('.formMsg').className = 'formMsg msg ok';
});
