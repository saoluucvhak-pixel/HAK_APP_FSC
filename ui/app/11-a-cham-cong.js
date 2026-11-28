/* ========== Chấm công thực tế (tính lương theo ngày công; src/chamcong.js) ========== */
let ccMonth = '';
function ccMonths(rec) {
  const CC = HAKChamCong, set = new Set(CC.monthsBetween(parseVN(rec.info.tuNgay), parseVN(rec.info.denNgay)));
  Object.keys(rec.cc || {}).forEach(k => set.add(k)); return [...set].sort();
}
const ccCur = rec => { const m = ccMonths(rec); return m.includes(ccMonth) ? ccMonth : m[0] || ''; };
const ccPersons = rec => ncList(rec);
function panelChamCong(rec) {
  if (rec.info.hinhThucLuong !== 'ngaycong' || !rec.nc.length) return '';
  const CC = HAKChamCong, months = ccMonths(rec), has = CC.hasAny(rec.cc);
  const head = '<div class="card" id="ccCard"><h3 style="margin-top:0">Chấm công thực tế <span class="mut" style="font-weight:400">tiền công = số công × đơn giá công</span></h3>';
  if (!months.length) return head + '<div class="msg warn">Nhập Thời gian khai thác (từ ngày, đến ngày) ở tab Thông tin rừng để chọn tháng chấm công.</div></div>';
  const k = ccCur(rec), n = CC.daysIn(k), ps = ccPersons(rec);
  const th = Array.from({length: n}, (_, i) => '<th class="' + (CC.isSunday(k, i + 1) ? 'ccSun' : '') + '">' + (i + 1) + '</th>').join('');
  const body = ps.map(r => { const pk = CC.personKey(r);
    return '<tr data-ccp="' + esc(pk) + '"><td class="ccName">' + esc(r.ten) + '</td>' + Array.from({length: n}, (_, i) => { const d = i + 1, v = CC.get(rec.cc, k, pk, d);
      return '<td class="' + (CC.isSunday(k, d) ? 'ccSun' : '') + '"><input class="ccIn" inputmode="decimal" data-cc="' + d + '" value="' + (v == null ? '' : esc(fmtCong(v))) + '" aria-label="' + esc(r.ten) + ' ngày ' + displayInputDate(pad2(d) + '/' + k.slice(5) + '/' + k.slice(0, 4)) + '"></td>'; }).join('') +
      '<td class="ccTot" data-ccm="' + esc(pk) + '">' + fmtCong(CC.monthTotal(rec.cc, k, pk)) + '</td><td class="ccTot" data-cca="' + esc(pk) + '"><b>' + fmtCong(CC.total(rec.cc, pk)) + '</b></td></tr>'; }).join('');
  return head + '<p class="mut" style="margin:0 0 8px">Nhập số công mỗi ngày: <b>1</b> = đủ công, <b>' + fmtCong(0.5) + '</b> = nửa công, <b>0</b> hoặc để trống = nghỉ. Khi đã có số công chấm tay, <b>BM-08 dùng số công này cho từng người</b>; chưa nhập thì BM-08 tính theo thời gian khai thác (trừ Chủ nhật), mọi người bằng nhau. Hợp đồng (BM-01, BM-03) luôn dùng số công dự tính nên không đổi khi bạn chấm công.</p>' +
    '<div class="row" style="align-items:center;gap:8px;flex-wrap:wrap"><label style="margin:0">Tháng <select id="ccMonthSel">' + months.map(m => '<option value="' + m + '"' + (m === k ? ' selected' : '') + '>' + m.split('-')[1] + '/' + m.split('-')[0] + '</option>').join('') + '</select></label>' +
    '<button class="btn sm ghost" data-act="ccFill" title="Điền 1 công cho mọi người ở các ngày không phải Chủ nhật trong thời gian khai thác của tháng này">Điền đủ công (trừ Chủ nhật)</button>' +
    '<button class="btn sm ghost" data-act="ccClear">Xóa tháng này</button>' +
    '<button class="btn sm" data-act="ccPrint" title="Tải Bảng chấm công (BM-05) có số công đã nhập của tháng này">In bảng chấm công đã nhập</button></div>' +
    '<div class="msg ' + (has ? 'ok' : '') + '" id="ccNote" style="margin:8px 0">' + (has ? 'Đã có số công chấm tay: BM-08 dùng tổng công của từng người.' : 'Chưa chấm công: BM-08 dùng số công dự tính theo thời gian khai thác.') + '</div>' +
    '<div class="wrap"><table class="ccTbl"><thead><tr><th>Họ và tên</th>' + th + '<th>Tháng</th><th>Cả đợt</th></tr></thead><tbody>' + body + '</tbody></table></div></div>';
}
function ccCommit(note_) { persistLo(); const n = document.getElementById('ccNote'); if (n) { n.className = 'msg ok'; n.textContent = note_ || 'Đã có số công chấm tay: BM-08 dùng tổng công của từng người.'; } }
function ccRefreshTotals(f, k) {
  const CC = HAKChamCong; document.querySelectorAll('#ccCard tr[data-ccp]').forEach(tr => { const pk = tr.dataset.ccp; const a = tr.querySelector('[data-ccm]'), b = tr.querySelector('[data-cca]'); if (a) a.textContent = fmtCong(CC.monthTotal(f.cc, k, pk));
  if (b) b.innerHTML = '<b>' + fmtCong(CC.total(f.cc, pk)) + '</b>'; });
}
function ccAct(act) {
  const f = curForest(), rec = curRec(); if (!f || !rec) return; f.cc = f.cc || {}; const CC = HAKChamCong, k = ccCur(rec); if (!k) return;
  if (act === 'ccFill') { CC.fillWork(f.cc, k, ccPersons(rec).map(CC.personKey), parseVN(rec.info.tuNgay), parseVN(rec.info.denNgay)); persistLo(); return render(); }
  if (act === 'ccClear') { CC.clearMonth(f.cc, k); persistLo(); return render(); }
  if (act === 'ccPrint') return ccExport(rec, k);
}
async function ccExport(rec, k) {
  const ex = exOf(rec, 'day'); ex._ccMonth = k; docMode = 'day';
  try {
    const B = doiOf(rec);   // lô nhiều đội: mỗi đội một bảng chấm công
    for (const d of B.doi) { const sr = subRec(rec, B, d), f = {path: '05_Bang_cham_cong_' + slug(rec.info.ten) + (B.multi ? '_' + slug(d.ten) : '') + '_' + k + '.docx', blocks: docChamCong(sr, ex), land: true}; download(await makeDocx(f.blocks, docOpts(f, sr)), f.path.split('/').pop()); }
  }
  catch (err) { note('Lỗi khi tạo file: ' + err.message, 'err'); }
}
document.addEventListener('change', e => {
  const t = e.target; if (!t || !t.closest) return;
  if (t.id === 'ccMonthSel') { ccMonth = t.value; return render(); }
  if (!t.classList || !t.classList.contains('ccIn')) return;
  const f = curForest(); if (!f) return; const CC = HAKChamCong, tr = t.closest('tr'), k = ccCur(curRec()), pk = tr.dataset.ccp, d = t.dataset.cc, v = CC.parseCell(t.value);
  if (v === undefined) { const o = CC.get(f.cc, k, pk, d); t.value = o == null ? '' : fmtCong(o); t.classList.add('ccBad'); return ccCommit('Số công mỗi ngày từ 0 đến 3 (ví dụ 1 hoặc ' + fmtCong(0.5) + '): giá trị đã nhập không hợp lệ nên được giữ như cũ.'); }
  t.classList.remove('ccBad'); f.cc = f.cc || {}; CC.set(f.cc, k, pk, d, v); t.value = v == null ? '' : fmtCong(v); ccRefreshTotals(f, k); ccCommit();
});
