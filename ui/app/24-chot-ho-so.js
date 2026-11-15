/* ========== Vòng đời lô và Chốt hồ sơ (bản 2.2, mục 4.1–4.2; src/vongdoi.js) ==========
 * Lô đã chốt, lưu trữ hoặc đã dừng là CHỈ ĐỌC: không sửa được thông tin lô, nhân công, xe, phiếu cân; không đánh dấu in, ký. Chốt lưu gói đóng băng (bản chụp dữ liệu lô) kèm dấu vân tay;
 * mở khóa bắt buộc nhập lý do và ghi nhật ký; chốt lại là phiên bản kế tiếp. */
const loKhoa = f => !!f && HAKVongDoi.chiDoc(f);
function loKhoaNote(f) { note(f.dung ? 'Lô đã dừng (chỉ đọc). Mở lại lô để sửa.' : 'Lô đã chốt (chỉ đọc). Mở khóa (nhập lý do) để sửa.', 'warn'); return {ok: false, error: 'lô chỉ đọc'}; }
function loTrangThai(rec, f) { const q = qtEval(rec, f); return HAKVongDoi.trangThai(f, q.sum); }
function loKhoaBanner(f) {
  if (!loKhoa(f)) return '';
  const nv = HAKVongDoi.nguyenVen(f);
  return '<div class="msg warn" id="loKhoaBar"><b>' + (f.dung ? 'Lô đã dừng' + (f.dung.ngay ? ' ngày ' + esc(f.dung.ngay) : '') + ' · chỉ đọc' : 'Đã chốt ngày ' + esc(new Date(f.chot.at).toLocaleDateString('vi-VN')) + ' · phiên bản ' + f.chot.phienBan + ' · chỉ đọc') + '</b>' +
    (f.chot && !nv ? ' <span class="pill err">dữ liệu lô khác bản đã chốt</span>' : '') + ' Các ô nhập đã khóa. Mở khóa ở tab Xuất hồ sơ (nhập lý do).</div>';
}
function chotBox(rec) {
  const f = curForest(); if (!f) return '';
  const q = qtEval(rec, f), tt = HAKVongDoi.trangThai(f, q.sum), bd = doiOf(rec), kt = exportCheck(rec);
  const thieu = HAKVongDoi.dieuKienChot({f, sum: q.sum, chan: kt.chan.length, pcChuaGan: bd.pcChuaGan || 0}), sach = !stDirtyOf(stKey());
  const nk = (f.nhatKy || []).slice().reverse().slice(0, 8), HANH = {chot: 'Chốt', mokhoa: 'Mở khóa', luutru: 'Lưu trữ', boluutru: 'Bỏ lưu trữ', dung: 'Dừng lô', molai: 'Mở lại lô'};
  let act = '';
  if (f.dung) act = '<button class="btn" data-act="chotMoLai">Mở lại lô</button>';
  else if (f.chot) act = '<button class="btn" data-act="chotMoKhoa">Mở khóa (nhập lý do)</button> ' + (f.luuTru ? '<button class="btn ghost" data-act="chotBoLuuTru">Bỏ lưu trữ</button>' : '<button class="btn ghost" data-act="chotLuuTru">Lưu trữ</button>');
  else act = '<button class="btn" data-act="chotLo"' + (thieu.length || !sach ? ' disabled' : '') + '>Chốt hồ sơ</button> <button class="btn ghost" data-act="chotDung">Dừng lô</button>';
  return '<div class="card" id="chotBox" data-tt="' + tt + '" style="margin-bottom:10px"><h3 style="margin-top:0">Vòng đời lô: <span class="pill ' + (HAKVongDoi.CHI_DOC.has(tt) ? 'warn' : 'ok') + '" id="chotTT">' + esc(HAKVongDoi.TEN[tt]) + '</span></h3>' +
    (!f.chot && !f.dung ? (thieu.length ? '<p class="mut" style="margin:0 0 6px">Để chốt hồ sơ còn thiếu:</p><ul id="chotThieu" style="margin:0 0 8px">' + thieu.map(x => '<li>' + esc(x) + '</li>').join('') + '</ul>' : '<p class="mut" style="margin:0 0 8px">Đủ điều kiện chốt: không còn mục chặn, mọi mẫu đã in và ký, mọi phiếu cân đã gán đội.</p>') + (sach ? '' : '<p class="msg warn">Còn thay đổi chưa lưu: bấm “Lưu dữ liệu vào lô” trước khi chốt.</p>') : '') +
    (true ? '<div class="row" style="gap:8px;flex-wrap:wrap;align-items:flex-end;margin-bottom:8px"><label style="flex:1;min-width:260px">Lý do (bắt buộc khi mở khóa, dừng lô, mở lại lô)<input id="chotLyDo" style="width:100%" placeholder="Ví dụ: sửa số phiếu cân bị nhập nhầm"></label>' + (f.chot || f.dung ? '' : '<label>Ngày dừng <input id="chotNgay" value="' + esc(todayStr()) + '" style="width:120px"></label>') + '</div>' : '') +
    '<div class="row" style="gap:8px;flex-wrap:wrap">' + act + '</div>' +
    (nk.length ? '<details style="margin-top:8px"><summary class="mut">Nhật ký vòng đời (' + (f.nhatKy || []).length + ')</summary><ul style="margin:6px 0">' + nk.map(x => '<li>' + esc(new Date(x.at).toLocaleString('vi-VN')) + ' · <b>' + esc(HANH[x.hanh] || x.hanh) + '</b>' + (x.phienBan ? ' (phiên bản ' + x.phienBan + ')' : '') + (x.lyDo ? ' · ' + esc(x.lyDo) : '') + (x.nguoi ? ' · ' + esc(x.nguoi) : '') + '</li>').join('') + '</ul></details>' : '') + '</div>';
}
/* lý do nhập ở ô trong khung Vòng đời lô (Electron không có hộp nhập prompt) */
const lyDoNhap = () => ((document.getElementById('chotLyDo') || {}).value || '').trim();
function chotAct(act) {
  const f = curForest(), rec = curRec(); if (!f || !rec) return; const now = new Date().toISOString(), ng = (theCompany() || {}).nguoiLap || '';
  let r = {ok: true};
  if (act === 'chotLo') {
    if (stDirtyOf(stKey())) return note('Còn thay đổi chưa lưu: bấm “Lưu dữ liệu vào lô” trước khi chốt.', 'warn');
    const q = qtEval(rec, f), bd = doiOf(rec), thieu = HAKVongDoi.dieuKienChot({f, sum: q.sum, chan: exportCheck(rec).chan.length, pcChuaGan: bd.pcChuaGan || 0});
    if (!confirm('Chốt hồ sơ lô ' + (f.info.maRung || '') + '?\nLô sẽ KHÓA (chỉ đọc) và lưu gói đóng băng. Mở khóa sau này phải nhập lý do.')) return;
    r = HAKVongDoi.chot(f, ng, now, thieu);
  } else if (act === 'chotMoKhoa') r = HAKVongDoi.moKhoa(f, lyDoNhap(), ng, now);
  else if (act === 'chotLuuTru') r = HAKVongDoi.luuTru(f, now);
  else if (act === 'chotBoLuuTru') r = HAKVongDoi.boLuuTru(f, now);
  else if (act === 'chotDung') r = HAKVongDoi.dung(f, lyDoNhap(), HAKNhapLieu.chuanHoaNgay((document.getElementById('chotNgay') || {}).value || todayStr()), ng, now);
  else if (act === 'chotMoLai') r = HAKVongDoi.moLai(f, lyDoNhap(), ng, now);
  if (!r.ok) return note('Chưa thực hiện được: ' + r.error, 'err');
  persist(); note({chotLo: 'Đã chốt hồ sơ: lô khóa chỉ đọc, gói đóng băng đã lưu.', chotMoKhoa: 'Đã mở khóa lô. Sửa xong phải chốt lại (phiên bản mới).', chotLuuTru: 'Đã lưu trữ lô.', chotBoLuuTru: 'Đã bỏ lưu trữ.', chotDung: 'Đã dừng lô (chỉ đọc).', chotMoLai: 'Đã mở lại lô.'}[act], 'ok'); render();
}
