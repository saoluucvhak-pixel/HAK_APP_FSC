/* ========== 3.7.1: Hộp thoại “Chọn Bên nhận khoán từ Danh mục đối tượng” (hợp đồng nhân công của đội khai thác) ==========
 * Ô tìm tức thì (họ tên, CCCD, MST, SĐT), bộ lọc Tất cả / Cá nhân / Doanh nghiệp, danh sách sạch chỉ gồm đối tượng có quyền ký Nhân công (đúng ngành khai thác);
 * bấm “Chọn” một lần: gán vào đội (chụp thông tin để in như khi chọn trong ô chọn), lưu nháp của lô và vẽ lại màn. */
let bnkCtx = null;
const bnkDs = () => HAKDoiTuong.benKy(dmDT(), 'nhanCong').filter(({dt, ng}) => HAKNganh.hopNganh(db, dt, ng, HAKNganh.KT));
const bnkGt = x => x.ng ? 'ng:' + x.ng.id : 'dt:' + x.dt.id;
function bnkMo() {
  const f = curForest(), t = f && curTeam(f); if (!t || loKhoa(f)) return;
  bnkCtx = {q: '', loai: ''};
  dlgMo('<div id="bnkHop"><h3 style="margin-top:0" id="dlgBoxTitle">Chọn bên nhận khoán từ Danh mục đối tượng</h3>' +
    '<p class="mut" style="margin-top:0">Chỉ hiện đối tượng có quyền ký <b>Nhân công</b> thuộc ngành khai thác. Không thấy người cần tìm thì đóng hộp này và bấm “+ Thêm bên nhận khoán mới”.</p>' +
    '<div class="row" style="gap:8px;flex-wrap:wrap;align-items:flex-end;margin-bottom:8px"><label style="flex:1;min-width:220px"><span>Tìm kiếm</span><input type="search" id="bnkQ" placeholder="🔍 Họ tên, CCCD, MST hoặc số điện thoại…" autocomplete="off" aria-label="Tìm bên nhận khoán"></label>' +
    '<label><span>Loại đối tượng</span><select id="bnkLoai" aria-label="Loại đối tượng"><option value="">Tất cả</option><option value="thenhan">Cá nhân (thể nhân)</option><option value="phapnhan">Doanh nghiệp (pháp nhân)</option></select></label></div>' +
    '<div class="wrap" style="max-height:min(55vh,440px)" id="bnkDs"></div>' +
    '<div class="row" style="justify-content:flex-end;margin-top:12px"><button type="button" class="btn ghost" data-act="dlgDong" id="bnkDong">Đóng</button></div></div>');
  bnkVe(); const q = document.getElementById('bnkQ'); if (q) q.focus();
}
function bnkVe() {
  const box = document.getElementById('bnkDs'); if (!box || !bnkCtx) return;
  const f = curForest(), t = f && curTeam(f), cur = t ? benGiaTri(t.benNhanKhoan) : '', q = foldVi(trim(bnkCtx.q));
  const dong = bnkDs().map(x => {
    const ng = x.ng, dt = x.dt, pn = dt.loai === 'phapnhan';
    return {x, gt: bnkGt(x), pn, ten: x.nhan, so: pn ? (dt.mst ? 'MST ' + dt.mst : '') : (ng && ng.cccd ? 'CCCD ' + ng.cccd : (dt.cccd ? 'CCCD ' + dt.cccd : '')), sdt: (ng && ng.sdt) || dt.sdt || ''};
  }).filter(r => (!bnkCtx.loai || (bnkCtx.loai === 'phapnhan') === r.pn) && (!q || foldVi(r.ten + ' ' + r.so + ' ' + r.sdt).includes(q)));
  box.innerHTML = '<table class="normTbl" id="bnkBang" style="min-width:0;table-layout:auto"><thead><tr><th>Bên nhận khoán</th><th>Loại</th><th>CCCD / MST</th><th>Điện thoại</th><th style="text-align:right"><span class="sro">Chọn</span></th></tr></thead><tbody>' +
    (dong.length ? dong.map(r => '<tr data-bnk="' + esc(r.gt) + '"><td><b>' + esc(r.ten) + '</b></td><td><span class="pill' + (r.pn ? ' ok' : '') + '">' + (r.pn ? 'Doanh nghiệp' : 'Cá nhân') + '</span></td><td>' + (esc(r.so) || '<span class="mut">—</span>') + '</td><td>' + (esc(r.sdt) || '<span class="mut">—</span>') + '</td>' +
      '<td style="text-align:right;white-space:nowrap">' + (r.gt === cur ? '<span class="pill ok">Đang chọn</span> ' : '') + '<button type="button" class="btn sm" data-act="bnkChon" data-v="' + esc(r.gt) + '">Chọn</button></td></tr>').join('') :
      '<tr><td colspan="5" class="mut">' + (bnkDs().length ? 'Không có đối tượng nào khớp với tìm kiếm.' : 'Danh mục chưa có đối tượng nào có quyền ký Nhân công.') + '</td></tr>') + '</tbody></table>';
}
function bnkChon(v) {
  const f = curForest(), t = f && curTeam(f); if (!t || loKhoa(f)) return dlgDong();
  const x = bnkDs().find(y => bnkGt(y) === v); if (!x) return dlgDong();
  const fm = document.getElementById('doiForm'), sel = fm && fm.elements.benNK;
  if (sel) { let o = [...sel.options].find(z => z.value === v); if (!o) { o = document.createElement('option'); o.value = v; o.textContent = x.nhan; sel.append(o); } sel.value = v; }
  dlgDong(); bnkCtx = null;
  if (fm) saveDoi(fm, true);   // cùng đường lưu nháp của biểu mẫu đội: giữ tên đội, diện tích đang gõ; chụp thông tin bên mới
  else { t.benNhanKhoan = benTuGiaTri(v); t.benNhanKhoanBan = benNhanKhoanChup(t.benNhanKhoan); persistLo(); }
  const t2 = curForest() && curTeam(curForest()); if (!t2 || benGiaTri(t2.benNhanKhoan) !== v) return;   // biểu mẫu báo lỗi (vd diện tích sai): giữ nguyên màn để sửa
  render(); note('Đã chọn bên nhận khoán “' + x.nhan + '” cho đội (chưa lưu lô).', 'ok');
}
/* mở ngay khi nhấn chuột xuống: đang gõ dở tên đội mà bấm nút thì ô vừa rời đi vẽ lại biểu mẫu (sự kiện change), làm mất lần bấm; phím Enter / Space vẫn đi qua sự kiện click */
let bnkDaMo = false;
document.addEventListener('mousedown', e => {
  const el = e.button === 0 && e.target && e.target.closest && e.target.closest('[data-act=bnkMo]'); if (!el) return;
  bnkDaMo = true; setTimeout(() => { bnkDaMo = false; }, 600); bnkMo();
}, true);
document.addEventListener('click', e => {
  const el = e.target && e.target.closest && e.target.closest('[data-act=bnkMo],[data-act=bnkChon]'); if (!el) return;
  e.preventDefault(); if (el.dataset.act === 'bnkChon') return bnkChon(el.dataset.v);
  if (bnkDaMo) { bnkDaMo = false; return; } bnkMo();
});
document.addEventListener('input', e => { if (e.target && e.target.id === 'bnkQ' && bnkCtx) { bnkCtx.q = e.target.value; bnkVe(); } });
document.addEventListener('change', e => { if (e.target && e.target.id === 'bnkLoai' && bnkCtx) { bnkCtx.loai = e.target.value; bnkVe(); } });
