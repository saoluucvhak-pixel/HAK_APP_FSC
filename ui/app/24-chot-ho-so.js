/* ========== Vòng đời lô và Chốt hồ sơ (bản 2.2, mục 4.1–4.2; src/vongdoi.js) ==========
 * Lô đã chốt, lưu trữ hoặc đã dừng là CHỈ ĐỌC: không sửa được thông tin lô, nhân công, xe, phiếu cân; không đánh dấu in, ký. Chốt lưu gói đóng băng (bản chụp dữ liệu lô) kèm dấu vân tay;
 * mở khóa bắt buộc nhập lý do và ghi nhật ký; chốt lại là phiên bản kế tiếp. */
const loKhoa = f => !!f && HAKVongDoi.chiDoc(f);
function loKhoaNote(f) { note(f.dung ? 'Lô đã dừng (chỉ đọc). Mở lại lô để sửa.' : 'Lô đã chốt (chỉ đọc). Mở khóa (nhập lý do) để sửa.', 'warn'); return {ok: false, error: 'lô chỉ đọc'}; }
function loTrangThai(rec, f) { const q = qtEval(rec, f); return HAKVongDoi.trangThai(f, q.sum); }
/* TOÀN VẸN hồ sơ đã chốt (src/vongdoi.js kiemToanVen): gói đóng băng ở SQLite (bảng chot_goi) được kiểm ở tiến trình chính (cấu trúc, JSON, dấu vân tay), dữ liệu
 * hiện tại so tiếp ở đây. Gói còn trong bộ nhớ (vừa chốt, bản trình duyệt) thì kiểm tại chỗ. Nhớ tạm theo phiên bản dữ liệu. Không bao giờ ném lỗi: lô hỏng vẫn mở được (chỉ đọc). */
const tvNho = new Map();
function toanVenLo(f) {
  if (!f || !f.chot) return HAKVongDoi.kiemToanVen(f);
  const k = (f.id || '') + '|' + f.chot.phienBan + '|' + f.chot.hash + '|' + (f.chot.hashDL || '') + '|' + dataVer, c = tvNho.get(f.id);
  if (c && c.k === k && c.f === f) return c.r;
  let r;
  try {
    if (typeof f.chot.goi === 'string' || !HB || !HB.kiemGoiSync) r = HAKVongDoi.kiemToanVen(f);
    else { const kg = HB.kiemGoiSync(f.id); r = kg && kg.ma === 'chua-chot' ? HAKVongDoi.kiemToanVen(f) : HAKVongDoi.kiemToanVen(f, null, kg || {ok: false, ma: 'thieu-goi', lyDo: 'Không kiểm được gói trên máy'}); }
  } catch (e) { r = {ok: false, ma: 'thieu-goi', ten: HAKVongDoi.TEN_KT['thieu-goi'], lyDo: 'Không kiểm được gói: ' + e.message, maLo: (f.info || {}).maRung || f.id, phienBan: f.chot.phienBan || null}; }
  tvNho.set(f.id, {k, f, r}); return r;
}
const toanVenHtml = r => '<div class="msg err" id="toanVenLoi" data-ma="' + esc(r.ma) + '"><b>Hồ sơ đã chốt không toàn vẹn — ' + esc(r.ten) + '</b> · lô ' + esc(r.maLo) + (r.phienBan ? ' · phiên bản chốt ' + esc(r.phienBan) : '') + '<br>' + esc(r.lyDo) +
  '<br><small>Lô vẫn mở được ở chế độ chỉ đọc để đối chiếu; phần mềm không tự mở khóa, không tự chốt lại, không tính lại dấu vân tay. Đối chiếu với bản sao lưu (Thêm → Khôi phục lô rừng… chỉ xem trước), hoặc mở khóa có lý do rồi chốt lại sau khi kiểm tra.</small></div>';
function loKhoaBanner(f) {
  if (!loKhoa(f)) return '';
  const tv = f.chot ? toanVenLo(f) : {ok: true}, nv = tv.ok;
  return '<div class="msg warn" id="loKhoaBar"><b>' + (f.dung ? 'Lô đã dừng' + (f.dung.ngay ? ' ngày ' + esc(f.dung.ngay) : '') + ' · chỉ đọc' : 'Đã chốt ngày ' + esc(new Date(f.chot.at).toLocaleDateString('vi-VN')) + ' · phiên bản ' + f.chot.phienBan + ' · chỉ đọc') + '</b>' +
    (f.chot && !nv ? ' <span class="pill err">' + esc(tv.ma === 'du-lieu-khac' ? 'dữ liệu lô khác bản đã chốt' : tv.ten) + '</span>' : '') + ' Các ô nhập đã khóa. Mở khóa ở tab Xuất hồ sơ (nhập lý do).</div>' + (f.chot && !nv ? toanVenHtml(tv) : '');
}
/* LỊCH SỬ BẢN CHỤP của lô trên máy này (bảng chot_goi; src/store.js lichSuGoi): mỗi lần chốt một bản chụp, kiểm riêng từng bản. Bản chụp cũ chỉ có ở máy đã chốt và trong Sao lưu toàn bộ (.sqlite);
 * gói sao lưu riêng lô chỉ mang bản hiện hành. Nhớ tạm theo lô + nhật ký + phiên bản dữ liệu (không băm lại mỗi lần vẽ). */
const lsGoiNho = new Map();
function lichSuGoiHtml(f) {
  const chots = (f.nhatKy || []).filter(x => x.hanh === 'chot' && x.phienBan); if (!chots.length || !HB || !HB.lichSuGoiSync) return '';
  const k = (f.chot ? f.chot.hash : '') + '|' + chots.length + '|' + dataVer, c = lsGoiNho.get(f.id); let ds;
  if (c && c.k === k) ds = c.ds; else { try { ds = HB.lichSuGoiSync(f.id) || []; } catch (e) { ds = []; } lsGoiNho.set(f.id, {k, ds}); }
  const hong = ds.filter(x => !x.ok), thieu = chots.filter(x => !ds.some(d => d.phienBan === x.phienBan));
  return '<div id="lichSuGoi" data-co="' + ds.length + '" data-hong="' + hong.length + '" data-thieu="' + thieu.length + '" style="margin-top:8px"><b>Bản chụp các lần chốt lưu trên máy này</b>' +
    (hong.length ? '<div class="msg err" id="lichSuGoiLoi">' + hong.map(x => 'Bản chụp hỏng — lô ' + esc((f.info || {}).maRung || f.id) + ' · phiên bản chốt ' + x.phienBan + ' · ' + esc(HAKVongDoi.TEN_KT[x.ma] || x.ma) + ': ' + esc(x.lyDo)).join('<br>') + '<br><small>Phần mềm không tự sửa bản chụp. Đối chiếu với bản Sao lưu toàn bộ (.sqlite).</small></div>' : '') +
    '<ul style="margin:6px 0">' + ds.map(x => '<li data-pb="' + x.phienBan + '" data-ok="' + (x.ok ? 1 : 0) + '">Phiên bản ' + x.phienBan + (x.hienHanh ? ' <span class="pill">hiện hành</span>' : '') + ' · dấu vân tay <code>' + esc(x.hash) + '</code> · chốt ' + esc(new Date(x.at).toLocaleString('vi-VN')) + ' · ' + (x.ok ? 'nguyên vẹn' : '<span class="pill err">hỏng</span>') + '</li>').join('') +
    thieu.map(x => '<li data-pb="' + x.phienBan + '" data-ok="-1" class="mut">Phiên bản ' + x.phienBan + ' · dấu vân tay <code>' + esc(x.hash || '') + '</code> (theo nhật ký) · không có bản chụp trên máy này</li>').join('') + '</ul>' +
    '<small class="mut">Gói sao lưu riêng lô chỉ mang bản chốt hiện hành. Muốn phục hồi cả các bản chụp cũ: dùng Sao lưu toàn bộ (file .sqlite).</small></div>';
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
  const tvC = f.chot ? toanVenLo(f) : null;
  return '<div class="card" id="chotBox" data-tt="' + tt + '" data-toanven="' + (tvC ? esc(tvC.ma) : '') + '" style="margin-bottom:10px"><h3 style="margin-top:0">Vòng đời lô: <span class="pill ' + (HAKVongDoi.CHI_DOC.has(tt) ? 'warn' : 'ok') + '" id="chotTT">' + esc(HAKVongDoi.TEN[tt]) + '</span></h3>' +
    (!f.chot && !f.dung ? (thieu.length ? '<p class="mut" style="margin:0 0 6px">Để chốt hồ sơ còn thiếu:</p><ul id="chotThieu" style="margin:0 0 8px">' + thieu.map(x => '<li>' + esc(x) + '</li>').join('') + '</ul>' : '<p class="mut" style="margin:0 0 8px">Đủ điều kiện chốt: không còn mục chặn, mọi mẫu đã in và ký, mọi phiếu cân đã gán đội.</p>') + (sach ? '' : '<p class="msg warn">Còn thay đổi chưa lưu: bấm “Lưu dữ liệu vào lô” trước khi chốt.</p>') : '') +
    (true ? '<div class="row" style="gap:8px;flex-wrap:wrap;align-items:flex-end;margin-bottom:8px"><label style="flex:1;min-width:260px">Lý do (bắt buộc khi mở khóa, dừng lô, mở lại lô)<input id="chotLyDo" style="width:100%" placeholder="Ví dụ: sửa số phiếu cân bị nhập nhầm"></label>' + (f.chot || f.dung ? '' : '<label>Ngày dừng <input id="chotNgay" value="' + esc(todayStr()) + '" style="width:120px"></label>') + '</div>' : '') +
    '<div class="row" style="gap:8px;flex-wrap:wrap">' + act + '</div>' +
    (nk.length ? '<details style="margin-top:8px"><summary class="mut">Nhật ký vòng đời (' + (f.nhatKy || []).length + ')</summary><ul style="margin:6px 0">' + nk.map(x => '<li>' + esc(new Date(x.at).toLocaleString('vi-VN')) + ' · <b>' + esc(HANH[x.hanh] || x.hanh) + '</b>' + (x.phienBan ? ' (phiên bản ' + x.phienBan + ')' : '') + (x.lyDo ? ' · ' + esc(x.lyDo) : '') + (x.nguoi ? ' · ' + esc(x.nguoi) : '') + '</li>').join('') + '</ul></details>' : '') + lichSuGoiHtml(f) + '</div>';
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

/* ========== MỘT CỬA KHÓA CHỈ ĐỌC cho mọi đường ghi của lô (bản 2.2 sửa lỗi) ==========
 * Lô đã chốt hoặc đã dừng không nhận thay đổi dữ liệu từ BẤT KỲ đường nào, không chỉ ô nhập: kiemKhoa(f) được gọi ở mọi handler ghi lô (cửa chặn sự kiện bên dưới và trong từng hàm ghi),
 * persistLo trả lô về bản đã lưu, saveOnce (giao diện) và Store.save / saveDelta (tiến trình chính, mã LOCKED) từ chối thay đổi dữ liệu của lô khóa.
 * Ngoại lệ duy nhất: thao tác vòng đời (chốt, mở khóa, lưu trữ, bỏ lưu trữ, dừng, mở lại: chotAct) và các khóa chot / luuTru / dung / nhatKy. */
function kiemKhoa(f) { f = f || curForest(); if (!loKhoa(f)) return false; loKhoaNote(f); return true; }
const ACT_GHI_LO = /^(themDoi|xoaDoi|themHd|xoaHd|hdCapNhatDv|pcGanLoat|addGiay|delGiay|luongLay|fillTu|fillDen|boKlCu|dmDefault|tgDefault|fillDenDk|ccFill|ccClear|stAdd|stAddXe|stEdit|stDel|stRestore|stPend|stSave|d2confirm|d2legacy|d2undo|clear|pcFixDate|mhConfirm|dmCapNhatLo|svbDien|svbGiuSo|napHoanTac|qtKy|qtHuyKy|qtMark|qtUnmark|delForest)$/;
const NHAP_GHI_LO = '[data-exp],[data-pcdoi],[data-xehd],[data-ncdoi],[data-pcfix],.ccIn';
document.addEventListener('click', e => {
  const el = e.target && e.target.closest && e.target.closest('[data-act]'); if (!el) return;
  const act = el.dataset.act, f = curForest();
  if (act === 'delRs') { const o = curOwner(); if (o && Object.values(o.forests || {}).some(x => loKhoa(x))) { e.stopPropagation(); e.preventDefault(); note('Chủ rừng còn lô đã chốt hoặc đã dừng (chỉ đọc): mở khóa hoặc mở lại lô trước khi xóa.', 'warn'); } return; }
  if (!ACT_GHI_LO.test(act) || !f || !loKhoa(f)) return;
  e.stopPropagation(); e.preventDefault(); loKhoaNote(f);
}, true);
['change', 'submit'].forEach(ev => document.addEventListener(ev, e => {
  const t = e.target, f = curForest(); if (!t || !f || !loKhoa(f)) return;
  const fm = t.id ? t : t.form, ghi = (t.matches && t.matches(NHAP_GHI_LO)) || (fm && fm.id && (typeof KHUNG_LO !== 'undefined' && KHUNG_LO[fm.id] || fm.id === 'stForm'));
  if (!ghi) return;
  e.stopPropagation(); e.preventDefault(); loKhoaNote(f);
}, true));
/* sau mỗi lần vẽ: ô nhập và nút ghi của lô khóa bị vô hiệu (tab Xuất hồ sơ vẫn tải và in được bản đã chốt) */
function loKhoaVoHieu() {
  const f = curForest(); if (!f || !loKhoa(f)) return;
  document.querySelectorAll('#main ' + NHAP_GHI_LO.split(',').join(', #main ')).forEach(x => { x.disabled = true; x.title = 'Lô chỉ đọc'; });
  document.querySelectorAll('#main [data-act]').forEach(b => { if (ACT_GHI_LO.test(b.dataset.act)) { b.disabled = true; b.title = 'Lô chỉ đọc'; } });
}
CONG_KT.khoaTest = {lo: () => curForest(), persistLo: f => persistLo(f), persist: () => persist(), chuaLuu: () => loDirty.size};   // chỉ cho kiểm thử đầu-cuối
