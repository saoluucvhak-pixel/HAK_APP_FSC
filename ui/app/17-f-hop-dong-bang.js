/* ========== Dữ liệu Google Sheets theo MÃ HỢP ĐỒNG: bảng toàn bộ hợp đồng (màn đầu) ==========
 * Nguồn dữ liệu: tìm kiếm sẵn có (lookup:search, nhóm theo hợp đồng) gộp theo mã hợp đồng chuẩn hóa; từng dòng được bổ sung bằng lookup:buildHd
 * (ngày ký, số rừng, số phiếu, tổng tấn, trạng thái) theo từng lô nhỏ ở nền. Mọi giá trị từ Sheet đi vào HTML đều qua esc(). */
const GS_PAGE = 25;
const gsKey = v => String(v == null ? '' : v).replace(/\s+/g, ' ').trim().toUpperCase();   // cùng quy tắc chuẩn hóa mã hợp đồng của src/lookup.js
const gsDigits = v => String(v == null ? '' : v).replace(/\D/g, '');
const gsMask = c => { const s = gsDigits(c); return s.length > 6 ? s.slice(0, 3) + '…' + s.slice(-3) : s; };   // che giữa CCCD trong thông báo
const gsTan = kg => formatNumber((kg || 0) / 1000, 3);
const GS_ST = {ok: ['Đủ', 'ok'], warn: ['Cần xem', 'warn'], err: ['Lỗi dữ liệu', 'err']};
const gs = {sum: new Map(), byKey: new Map(), list: [], noHd: 0, setAt: '', page: 0, stat: '', run: 0, prog: null, m: null, opener: null, ask: null};

/* Tóm tắt một hợp đồng cho bảng: trạng thái Đủ / Cần xem / Lỗi dữ liệu (QĐ4: nhiều CCCD là cảnh báo nặng, hiện là “Lỗi dữ liệu”, vẫn mở được sau 2 lần xác nhận) */
function gsSummary(d) {
  if (!d || !d.ok) return {status: 'err', why: [(d && d.error) || 'Không đọc được hợp đồng'], ten: '', cccd: '', ngay: '', nRung: 0, nPhieu: 0, tan: 0};
  const own = Object.fromEntries((d.owner.fields || []).map(x => [x.key, x.value])), F = d.forests || [], why = [];
  const tan = Math.round(d.phieu.filter(p => !p.issue && !p.lechCccd).reduce((t, p) => t + (p.kl || 0), 0) * 1000) / 1000;
  let status = 'ok';
  if (d.canhBaoNang.length) { status = 'err'; why.push('thuộc ' + d.cccdList.length + ' CCCD khác nhau'); }
  else {
    if (d.lech.length || d.phieu.some(p => p.lechCccd)) why.push('lệch CCCD');
    if (d.phieu.some(p => p.issue)) why.push('phiếu cân lỗi');
    if (!F.some(x => x.dong != null)) why.push('thiếu HoSoRung');
    else if (!F.some(x => x.maRung)) why.push('thiếu ToaDoRung (chưa có mã rừng)');
    else if (F.some(x => x.dong != null && !x.maRung)) why.push('rừng chưa có mã');
    if (F.some(x => x.ghepTam)) why.push('ghép mã rừng tạm');
    if (F.length > 1 && F.some(x => x.dong != null && x.duKienKg == null)) why.push('thiếu hecta/định mức');
    if (F.some(x => x.gps.some(g => !g.ok))) why.push('tọa độ cần xem');
    if (why.length) status = 'warn';
  }
  return {status, why, ten: own.ten || '', cccd: d.cccd || '', ngay: own.ngayKyHopDong || '', nRung: F.length, nPhieu: d.phieu.length, tan, nCccd: (d.cccdList || []).length};
}

/* Danh sách hợp đồng từ kết quả tìm kiếm nhóm theo hợp đồng, gộp theo mã hợp đồng chuẩn hóa (cùng mã ở nhiều CCCD thành một dòng) */
function gsFromGroups(r) {
  const at = lk.st && lk.st.active ? lk.st.active.loadedAt : '';
  if (gs.setAt !== at) { gs.sum.clear(); gs.setAt = at; }
  const m = new Map(); let noHd = 0;
  ((r && r.groups) || []).forEach(g => {
    if (!g.hd) { noHd++; return; }
    const k = gsKey(g.hd); let x = m.get(k);
    if (!x) { x = {key: k, hd: g.hd, ten: g.ten || '', cccds: new Set(), tinhTrang: g.tinhTrang || ''}; m.set(k, x); }
    if (g.cccd) x.cccds.add(g.cccd);
    if (!x.ten && g.ten) x.ten = g.ten;
  });
  gs.list = [...m.values()]; gs.byKey = m; gs.noHd = noHd; gs.page = 0;
  if (!lk.q) gs.list.sort((a, b) => a.hd.localeCompare(b.hd, 'vi', {numeric: true}));
}
async function gsEnrich() {
  const run = ++gs.run, todo = gs.list.filter(g => !gs.sum.has(g.key));
  if (!todo.length) { gs.prog = null; return; }
  gs.prog = {done: 0, total: todo.length};
  for (let i = 0; i < todo.length; i += 10) {
    if (run !== gs.run || !$('#lkBox').classList.contains('on')) return;
    const part = todo.slice(i, i + 10), res = await Promise.all(part.map(g => HB.lookup.buildHd(g.hd).catch(() => null)));
    if (run !== gs.run) return;
    part.forEach((g, j) => gs.sum.set(g.key, gsSummary(res[j])));
    gs.prog.done = Math.min(todo.length, i + 10); gsRefreshList();
  }
  if (run === gs.run) { gs.prog = null; gsRefreshList(); }
}
const gsFiltered = () => gs.stat ? gs.list.filter(g => (gs.sum.get(g.key) || {}).status === gs.stat) : gs.list;

function gsListInner() {
  const L = gsFiltered(), pages = Math.max(1, Math.ceil(L.length / GS_PAGE)); if (gs.page >= pages) gs.page = pages - 1; if (gs.page < 0) gs.page = 0;
  const cnt = {ok: 0, warn: 0, err: 0}; gs.list.forEach(g => { const s = gs.sum.get(g.key); if (s) cnt[s.status]++; });
  const chip = (k, l, n) => '<button type="button" class="gsChip' + (gs.stat === k ? ' on' : '') + '" data-gsstat="' + k + '" aria-pressed="' + (gs.stat === k) + '">' + l + (n == null ? '' : ' <span class="pill">' + fmt(n) + '</span>') + '</button>';
  const rows = L.slice(gs.page * GS_PAGE, gs.page * GS_PAGE + GS_PAGE).map(g => {
    const s = gs.sum.get(g.key), st = s ? GS_ST[s.status] : null, cccd = s && s.cccd ? s.cccd : [...g.cccds][0] || '';
    return '<tr class="gsRow" data-gsrow="' + esc(g.key) + '" tabindex="0" aria-label="Mở hợp đồng ' + esc(g.hd) + '"><td><b>' + esc(g.hd) + '</b></td><td>' + esc((s && s.ten) || g.ten) + '</td><td>' + esc(cccd) + (s && s.nCccd > 1 ? ' <span class="pill err" title="Mã hợp đồng thuộc nhiều CCCD">+' + (s.nCccd - 1) + '</span>' : '') +
      '</td><td>' + (s ? esc(s.ngay) : '…') + '</td><td class="num">' + (s ? s.nRung : '…') + '</td><td class="num">' + (s ? s.nPhieu : '…') + '</td><td class="num">' + (s ? numTxt(s.tan) : '…') + '</td><td>' +
      (st ? '<span class="pill ' + st[1] + '">' + st[0] + '</span>' + (s.why.length ? '<div class="mut gsWhy">' + s.why.slice(0, 2).map(esc).join('; ') + (s.why.length > 2 ? '…' : '') + '</div>' : '') : '<span class="mut">đang tính…</span>') + '</td></tr>';
  }).join('');
  return '<div class="row gsBar"><b>Trạng thái:</b>' + chip('', 'Tất cả', gs.list.length) + chip('ok', 'Đủ', cnt.ok) + chip('warn', 'Cần xem', cnt.warn) + chip('err', 'Lỗi dữ liệu', cnt.err) +
    (gs.prog ? '<span class="mut" role="status">Đang tính trạng thái ' + fmt(gs.prog.done) + '/' + fmt(gs.prog.total) + '…</span>' : '') + '</div>' +
    '<div class="wrap gsWrap"><table class="gsTbl"><thead><tr><th>Mã hợp đồng</th><th>Chủ rừng</th><th>CCCD</th><th>Ngày ký</th><th class="num">Rừng</th><th class="num">Phiếu</th><th class="num">Tổng tấn</th><th>Trạng thái</th></tr></thead><tbody>' +
    (rows || '<tr><td colspan="8" class="empty">Không có hợp đồng nào khớp. Đổi từ khóa, bộ lọc hoặc trạng thái.</td></tr>') + '</tbody></table></div>' +
    '<div class="row gsPg"><span>' + fmt(L.length) + ' hợp đồng' + (gs.stat ? ' (đang lọc theo trạng thái)' : '') + ' · trang ' + (gs.page + 1) + '/' + pages + '</span><button type="button" class="btn ghost sm" data-act="gsPage" data-d="-1"' + (gs.page ? '' : ' disabled') + ' aria-label="Trang trước">‹ Trước</button>' +
    '<button type="button" class="btn ghost sm" data-act="gsPage" data-d="1"' + (gs.page < pages - 1 ? '' : ' disabled') + ' aria-label="Trang sau">Sau ›</button></div>' +
    (gs.noHd ? '<p class="mut">' + fmt(gs.noHd) + ' dòng Sheet không có mã hợp đồng nên không nằm trong bảng này: xem ở chế độ “Theo dòng Sheet”.</p>' : '');
}
const gsListHtml = () => '<p class="mut" style="margin:2px 0 6px">Toàn bộ hợp đồng trên Google Sheets. Bấm một dòng (hoặc Enter) để xem hồ sơ rừng, tọa độ và phiếu cân của hợp đồng đó.</p><div id="gsList">' + gsListInner() + '</div>';
/* vẽ lại riêng bảng (không đụng ô tìm kiếm); giữ tiêu điểm theo mã hợp đồng; không vẽ khi đang mở hộp thoại hợp đồng */
function gsRefreshList() {
  const box = document.getElementById('gsList'), hb = document.getElementById('hdBox'); if (!box || (hb && hb.classList.contains('on'))) return;
  const a = document.activeElement, key = a && a.dataset ? a.dataset.gsrow : undefined, pg = a && a.dataset ? a.dataset.act === 'gsPage' : false;
  box.innerHTML = gsListInner();
  if (key !== undefined) { const n = [...box.querySelectorAll('[data-gsrow]')].find(x => x.dataset.gsrow === key); if (n) n.focus(); } else if (pg) { const n = box.querySelector('[data-act=gsPage]:not(:disabled)'); if (n) n.focus(); }
}

/* Mở màn “Dữ liệu Google Sheets” và hộp thoại đúng hợp đồng (dùng cho nút “Mở dữ liệu Google Sheets” ở màn chủ rừng). Không có hợp đồng: báo lỗi, KHÔNG mở hộp thoại trống.
 * Trả {ok, error?}. */
async function lkMoHopDong(raw) {
  if (!HB) return {ok: false, error: 'Chỉ dùng được ở bản desktop.'};
  const k = gsKey(raw); if (!k) return {ok: false, error: 'Chưa có số hợp đồng để mở.'};
  const opener = document.activeElement;
  lk.q = String(raw).trim(); lk.tab = ''; lk.layout = 'hd'; lk.f = {from: '', to: '', minTan: '', maxTan: '', status: '', onlyIssues: false, sort: 'relevance'}; gs.stat = '';
  lk.res = null; await lkOpen();
  const d = await HB.lookup.buildHd(raw);
  if (!d || !d.ok) { const err = (d && d.error) || 'Không đọc được hợp đồng ' + String(raw).trim() + '.'; lk.msg = {kind: 'err', text: err + (lk.st && lk.st.active ? ' Bản tra cứu nạp lúc ' + fmtDT(lk.st.active.loadedAt) + '.' : '')}; lkRender(); return {ok: false, error: err}; }
  gsOpen(d, opener); return {ok: true};
}

document.addEventListener('click', e => {
  const t = e.target; if (!t.closest || !t.closest('#lkBox')) return;
  const row = t.closest('[data-gsrow]'); if (row) { const g = gs.byKey.get(row.dataset.gsrow); if (g) gsOpenHd(g.hd, row); return; }
  const chip = t.closest('[data-gsstat]'); if (chip) { gs.stat = gs.stat === chip.dataset.gsstat ? '' : chip.dataset.gsstat; gs.page = 0; gsRefreshList(); return; }
  const pg = t.closest('[data-act=gsPage]'); if (pg) { gs.page += +pg.dataset.d; gsRefreshList(); }
});
document.addEventListener('keydown', e => {
  if (e.key !== 'Enter' || !e.target.closest) return;
  const row = e.target.closest('tr[data-gsrow]'); if (!row || !row.closest('#lkBox')) return;
  e.preventDefault(); const g = gs.byKey.get(row.dataset.gsrow); if (g) gsOpenHd(g.hd, row);
});
async function gsOpenHd(raw, opener) {
  if (gs.busyOpen) return; gs.busyOpen = true;
  try {
    const d = await HB.lookup.buildHd(raw);
    if (!d || !d.ok) { lk.msg = {kind: 'err', text: (d && d.error) || 'Không đọc được hợp đồng.'}; lkRender(); return; }
    gsOpen(d, opener);
  } finally { gs.busyOpen = false; }
}
