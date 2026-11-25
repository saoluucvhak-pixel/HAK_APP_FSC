/* ========== 3.5.1: Phân hệ “Bàn làm việc” (ERP Operations Hub) ==========
 * Tách khỏi màn Tổng quan: (1) sơ đồ đường ray 6 bước quy trình, mỗi bước là một trạm tương tác (Đã xong / Đang làm / Chờ xử lý / Bị khóa);
 * (2) các trạm công việc (bấm một bước ở sơ đồ thì cuộn tới và làm nổi trạm đó); (3) hàng đợi việc cần xử lý của lô đang chọn (mục chặn xuất, mục cần đối chiếu), mỗi dòng có nút mở thẳng nơi sửa.
 * Tình trạng các bước tính từ dữ liệu đang có (HAKTienIch.huongDan), hàng đợi lấy từ cùng bộ kiểm tra xuất hồ sơ (exportCheck): không lưu thêm dữ liệu. */
const bld = {sel: '', lo: ''};
const BLD_BUOC = {
  chu: ['👤', 'Hồ sơ Chủ rừng & Pháp lý', 'Tra cứu Google Sheets, CCCD, số hợp đồng mua bán gỗ'],
  lo: ['🌲', 'Lập Lô rừng & Khai thác', 'Mã lô, diện tích, thời gian khai thác'],
  nc: ['👷', 'Đội khai thác & Nhân công', 'Hợp đồng nhân công, tổ trưởng, công nhân, định mức'],
  dx: ['🚚', 'Đội xe & Vận chuyển', 'Hợp đồng vận chuyển, xe, tài xế, cước tấn/km'],
  pc: ['⚖️', 'Phiếu cân & Đối soát', 'Phiếu cân, khối lượng, khớp nhà máy'],
  xuat: ['📦', 'Hậu kiểm 2 chặn & Xuất hồ sơ FSC', 'Kiểm tra, xuất biểu mẫu BM-01 đến BM-20']
};
function bldLoList() { const a = []; Object.keys(db.rs || {}).forEach(oid => forestList(db.rs[oid]).forEach(f => a.push({oid, fid: f.id, o: db.rs[oid], f}))); return a; }
function bldChon() { const L = bldLoList(); return L.find(x => x.oid === NAV.cur && x.fid === NAV.curF) || L.find(x => x.oid + '|' + x.fid === bld.lo) || L[0] || null; }
function bldMucCho(x) { try { const kt = exportCheck(jobView(x.o, x.f)); return {chan: kt.chan, doi: kt.doi}; } catch (e) { return {chan: [], doi: []}; } }
function bldTrangThai(ds, i, chan) {
  const b = ds[i], tiep = ds.findIndex(x => !x.xong);
  if (b.xong) return ['Đã xong', 'ok'];
  if (b.id === 'xuat' && chan > 0 && tiep === i) return ['Bị khóa', 'err'];
  return i === tiep ? ['Đang làm', 'warn'] : ['Chờ xử lý', ''];
}
function panelBanLamViec() {
  const ds = HAKTienIch.huongDan(db), xong = ds.filter(x => x.xong).length, x = bldChon(), kt = x ? bldMucCho(x) : {chan: [], doi: []};
  if (!bld.sel || !ds.some(b => b.id === bld.sel)) bld.sel = (ds.find(b => !b.xong) || ds[ds.length - 1]).id;
  const tt = ds.map((b, i) => bldTrangThai(ds, i, kt.chan.length));
  const ray = '<ol class="bldRay" id="bldRay" aria-label="Quy trình 6 bước">' + ds.map((b, i) => '<li class="bldNode' + (b.id === bld.sel ? ' sel' : '') + '" data-tt="' + esc(tt[i][0]) + '"><button type="button" data-act="bldNode" data-buoc="' + b.id + '" aria-pressed="' + (b.id === bld.sel) + '">' +
    '<span class="bldIc" aria-hidden="true">' + BLD_BUOC[b.id][0] + '</span><span class="bldNhan"><small>Bước ' + (i + 1) + '</small><b>' + esc(BLD_BUOC[b.id][1]) + '</b></span><span class="pill ' + tt[i][1] + '">' + tt[i][0] + '</span></button></li>').join('') + '</ol>';
  const tram = ds.map((b, i) => '<section class="bldTram card' + (b.id === bld.sel ? ' sel' : '') + '" data-tram="' + b.id + '" id="bldTram_' + b.id + '"><div class="row" style="justify-content:space-between;align-items:center;gap:8px"><h3 style="margin:0">' + BLD_BUOC[b.id][0] + ' Bước ' + (i + 1) + ': ' + esc(b.ten) + '</h3><span class="pill ' + tt[i][1] + '">' + tt[i][0] + '</span></div>' +
    '<p class="mut" style="margin:6px 0">' + esc(BLD_BUOC[b.id][2]) + '. ' + esc(b.moTa) + '</p><button class="btn' + (b.xong ? ' ghost' : '') + ' sm" data-act="bldDi" data-buoc="' + b.id + '">' + (b.id === 'chu' && !b.xong ? '+ Chủ rừng mới' : b.xong ? 'Mở lại nơi làm bước này' : 'Mở nơi làm bước này') + '</button></section>').join('');
  const loSel = bldLoList().length ? '<label class="bldLo"><span>Lô đang xử lý</span><select data-bldlo="1" aria-label="Chọn lô">' + bldLoList().map(l => '<option value="' + esc(l.oid + '|' + l.fid) + '"' + (x && l.oid === x.oid && l.fid === x.fid ? ' selected' : '') + '>' + esc((l.o.info.ten || '(chưa đặt tên)') + ' · ' + (l.f.info.maRung || l.f.info.tenRung || '(chưa có mã)')) + '</option>').join('') + '</select></label>' : '';
  const muc = kt.chan.map(m => ['chan', m]).concat(kt.doi.map(m => ['doi', m])).slice(0, 40);
  const hang = !x ? '<p class="mut">Chưa có lô nào. Làm bước 1 và 2 để bắt đầu.</p>' : muc.length ? '<ul class="bldHang" id="bldHang">' + muc.map(([k, m]) => '<li class="' + k + '"><div><span class="pill ' + (k === 'chan' ? 'err' : 'warn') + '">' + (k === 'chan' ? 'Chặn xuất' : 'Cần đối chiếu') + '</span> ' + esc(m.text) + (m.nhom ? ' <small class="mut">· ' + esc(m.nhom) + '</small>' : '') + '</div>' +
    '<button class="btn sm' + (k === 'chan' ? '' : ' ghost') + '" data-act="bldXuLy" data-oid="' + esc(x.oid) + '" data-fid="' + esc(x.fid) + '" data-go="' + esc(JSON.stringify(m.go || m.noiSua || {})) + '">Xử lý ngay</button></li>').join('') + '</ul>' : '<div class="msg ok" id="bldHang">Không còn việc tồn đọng ở lô này.</div>';
  return '<div class="hero"><div><h2>💼 Bàn làm việc</h2><p class="mut">Quy trình khép kín 6 bước · đã xong <b>' + xong + '/' + ds.length + '</b> · ' + todayStr() + '</p></div><div class="row"><button class="btn" data-act="newRs">+ Chủ rừng mới</button></div></div>' +
    '<div class="card" id="bldQuyTrinh" data-xong="' + xong + '" data-tiep="' + ((ds.find(b => !b.xong) || {}).id || '') + '"><h3 style="margin-top:0">Sơ đồ quy trình</h3>' + ray + '</div>' +
    '<div class="bldCot"><div class="bldTrai">' + tram + '</div><aside class="card bldPhai" aria-label="Hàng đợi công việc"><h3 style="margin-top:0">Hàng đợi công việc' + (muc.length ? ' <span class="pill ' + (kt.chan.length ? 'err' : 'warn') + '">' + muc.length + '</span>' : '') + '</h3>' + loSel +
    '<p class="mut" style="margin:6px 0">Việc tồn đọng theo kiểm tra xuất hồ sơ của lô đang chọn: bấm “Xử lý ngay” để mở đúng nơi sửa.</p>' + hang + '</aside></div>';
}
function bldDi(buoc) {
  const x = bldChon(); if (!x) { NAV.view = 'owner'; NAV.cur = null; NAV.curF = null; return render(); }
  NAV.cur = x.oid; NAV.curF = x.fid; NAV.view = 'owner'; NAV.tab = 'rung';
  NAV.ftab = {lo: 'finfo', nc: 'nc', dx: 'dx', pc: 'dx', xuat: 'kt'}[buoc] || 'finfo';
  if (buoc === 'chu') { NAV.tab = 'info'; }
  if (buoc === 'pc') { const h = HAKModel.hdOrder({dx: x.f.dx || [], hdvc: x.f.hdvc || []})[0]; if (h) hdMoDat('dx', h.id); }
  render();
}
document.addEventListener('click', e => {
  const el = e.target && e.target.closest && e.target.closest('[data-act=bldNode],[data-act=bldDi],[data-act=bldXuLy],[data-act=openBld]'); if (!el) return;
  const a = el.dataset.act;
  if (a === 'openBld') { NAV.cur = null; NAV.curF = null; NAV.view = 'bld'; return render(); }
  if (a === 'bldNode') { bld.sel = el.dataset.buoc; render(); const t = document.getElementById('bldTram_' + bld.sel); if (t && t.scrollIntoView) t.scrollIntoView({block: 'nearest', behavior: 'smooth'}); return; }
  if (a === 'bldDi') { if (el.dataset.buoc === 'chu' && !HAKTienIch.huongDan(db)[0].xong) { NAV.cur = null; NAV.curF = null; NAV.view = 'owner'; newRs(); return render(); } return bldDi(el.dataset.buoc); }
  if (a === 'bldXuLy') {
    NAV.cur = el.dataset.oid; NAV.curF = el.dataset.fid; NAV.view = 'owner'; NAV.tab = 'rung';
    const b = document.createElement('button'); b.type = 'button'; b.dataset.act = 'ktGo'; b.dataset.go = el.dataset.go || '{}'; b.hidden = true; document.body.appendChild(b); try { b.click(); } finally { b.remove(); }
  }
});
document.addEventListener('change', e => { const t = e.target; if (t && t.dataset && t.dataset.bldlo) { bld.lo = t.value; const [o, f] = t.value.split('|'); NAV.cur = null; NAV.curF = null; bld.lo = o + '|' + f; render(); } });
