/* ========== Thao tác ========== */
function openRs(id) { cur = id; curF = null; tab = 'info'; view = 'owner'; render(); }
function openForest(fid) { curF = fid; ftab = 'finfo'; tab = 'rung'; view = 'owner'; render(); }

function newRs() {
  const id = 'rs' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  db.rs[id] = {id, info: {ma: '', danhXung: 'Ông', ten: '', ngaySinh: '', cccd: '', ngayCap: '', noiCap: '', diaChi: ''}, forests: {}};
  persist();
  cur = id; curF = null; tab = 'info'; view = 'owner';
  note('Đã tạo chủ rừng mới. Nhập thông tin rồi bấm Lưu.');
}

function newForest() {
  const o = curOwner(); if (!o) return;
  const n = forestList(o).length + 1, base = (o.info.ma || 'CR') + '-R';
  let k = n, code = base + k;
  while (HAKLoRung.lotsByMa(db, code).length) code = base + (++k);
  const fid = newId('f');
  o.forests[fid] = {id: fid, info: {maRung: code, tenRung: 'Rừng ' + k, diaDiem: '', lat: null, lng: null, dienTich: null,
    dinhMucTanHa: null, cuLy: null, tuNgay: '', denNgay: '', donGia: null, giayTo: []},
    nc: [], dx: [], exp: {}, ncFile: '', ncAt: '', dxFile: '', dxAt: ''};
  curF = fid; ftab = 'finfo'; tab = 'rung';
  persist();
  note('Đã tạo rừng mới. Nhập thông tin rừng rồi bấm Lưu.');
}

function readForest(form) {
  const fd = new FormData(form);
  return {
    maRung: trim(fd.get('maRung')), tenRung: trim(fd.get('tenRung')), diaDiem: trim(fd.get('diaDiem')),
    lat: toDec(fd.get('lat')), lng: toDec(fd.get('lng')), dienTich: toDec(fd.get('dienTich')),
    dinhMucTanHa: toDec(fd.get('dinhMucTanHa')), dinhMucNgayHa: toDec(fd.get('dinhMucNgayHa')), soDoi: toDec(fd.get('soDoi')), cuLy: toDec(fd.get('cuLy')),
    tuNgay: trim(fd.get('tuNgay')), denNgay: trim(fd.get('denNgay')), khoiLuong: toDec(fd.get('khoiLuong')),
    donGia: toNum(fd.get('donGia'))   // để trống = null: giao khoán tự suy đơn giá khoán của tổ từ định biên nhân sự
  };
}

function readLuong(form) {
  const fd = new FormData(form);
  return {
    hinhThucLuong: ['ha', 'ngaycong'].includes(fd.get('hinhThucLuong')) ? fd.get('hinhThucLuong') : 'sanluong',
    donGiaHa: Object.fromEntries(chucDanhAll().map((cd, k) => [cd, toNum(fd.get('ha_' + k))])),
    donGiaNgay: Object.fromEntries(chucDanhAll().map((cd, k) => [cd, toNum(fd.get('dn_' + k))])),
    donGiaTan: Object.fromEntries(chucDanhAll().map((cd, k) => [cd, toNum(fd.get('dt_' + k))])),
    ngayBDLD: trim(fd.get('ngayBDLD')),
    moHinhKy: fd.get('moHinhKy') === 'tructiep' ? 'tructiep' : 'giaokhoan'
  };
}

function readVc(form) {
  const fd = new FormData(form), old = ((curForest() || {}).info || {}).vanChuyen || {};
  return {
    vanChuyen: {
      ...old,   // giữ dữ liệu bậc cũ (không dùng nữa) để không mất dữ liệu
      mode: ['tanKm', 'coDinh', 'tanDoan'].includes(fd.get('vcMode')) ? fd.get('vcMode') : 'tanKm',   // tanDoan chỉ còn khi hồ sơ cũ chưa chọn lại
      donGiaKm: toDec(fd.get('vcKm')), coDinh: toDec(fd.get('vcCoDinh')), tuNgay: trim(fd.get('vcTu'))
    }
  };
}

// Lỗi hiển thị ngay trong form, không render lại, để không mất dữ liệu đang nhập
function formMsg(form, text) {
  let m = form.querySelector('.formMsg');
  if (!m) { m = document.createElement('div'); m.className = 'formMsg msg err'; m.style.gridColumn = '1/-1'; form.prepend(m); }
  m.textContent = text;
}

/* Nút điền nhanh ở form Thông tin rừng: chỉ điền vào ô (chưa lưu); người dùng vẫn tự sửa được rồi bấm Lưu */
function forestFill(act, el) {
  const f = curForest(), form = document.getElementById('forestForm'); if (!f || !form) return;
  const setv = (name, v) => { const inp = form.elements[name]; inp.value = v; inp.dispatchEvent(new Event('input', {bubbles: true})); };
  const hint = t => { let h = document.getElementById('forestHint'); if (!h) { h = document.createElement('div'); h.id = 'forestHint'; h.className = 'msg warn'; h.style.gridColumn = '1/-1'; form.prepend(h); } h.textContent = t; };
  const pcs = (f.pc || []);
  if (act === 'soDoiAuto') { setv('soDoi', ''); const sn = document.getElementById('soDoiNote'); if (sn) sn.innerHTML = soDoiNote(readForest(form), (curForest() || {}).nc); const nt = document.getElementById('tgNote'); if (nt) nt.innerHTML = tgDuKienHtml(readForest(form), (curForest() || {}).pc, nDoiOf(readForest(form), (curForest() || {}).nc)); return; }
  if (act === 'tgDefault') { setv('dinhMucNgayHa', ''); const k = HAKDinhMuc.tgPick(db, trim(form.elements.tuNgay.value)); document.getElementById('tgDmNote').textContent = k.found ? 'Sẽ dùng định mức mặc định ' + fmtTan(k.item.ngayHa) + ' ngày/ha sau khi lưu.' : 'Chưa có định mức mặc định.'; return; }
  if (act === 'fillDenDk') { const ii = readForest(form), d = ngayHaEff(ii), n = d ? HAKDinhMuc.soNgay(haDoi(ii, nDoiOf(ii, (curForest() || {}).nc)), d.v) : null, kt = n && HAKDates.isValid(ii.tuNgay) ? HAKDinhMuc.ngayKetThuc(ii.tuNgay, n) : ''; if (!kt) return hint('Chưa tính được ngày kết thúc: cần diện tích, định mức thời gian khai thác và ngày bắt đầu hợp lệ.'); setv('denNgay', kt); return hint('Đã điền ngày kết thúc dự kiến ' + kt + ' (' + n + ' ngày khai thác, không tính Chủ nhật). Bấm Lưu thông tin rừng để ghi nhận, hoặc sửa ngày.'); }
  if (act === 'dmDefault') { setv('dinhMucTanHa', ''); const k = HAKDinhMuc.keoPick(db, trim(form.elements.tuNgay.value)); document.getElementById('dmNote').textContent = k.found ? 'Sẽ dùng định mức gỗ keo mặc định ' + fmtTan(k.item.tanHa) + ' tấn/ha sau khi lưu.' : 'Chưa có định mức mặc định.'; return; }
  if (act === 'fillKl') {
    const nums = pcs.map(p => p.kl).filter(x => typeof x === 'number' && x > 0); if (!nums.length) return hint('Chưa có phiếu cân nào của rừng này để lấy khối lượng.');
    const sum = Math.round(nums.reduce((a, b) => a + b, 0) * 1000) / 1000; setv('khoiLuong', String(sum).replace('.', ',')); return hint('Đã điền tổng ' + fmtTan(sum) + ' tấn từ ' + nums.length + ' phiếu cân. Bấm Lưu thông tin rừng để ghi nhận, hoặc sửa số.');
  }
  const ds = pcs.map(p => HAKDates.parse(p.ngay)).filter(Boolean); if (!ds.length) return hint('Chưa có phiếu cân có ngày hợp lệ của rừng này.');
  const pick = ds.reduce((a, b) => (act === 'fillTu' ? (b.key < a.key ? b : a) : (b.key > a.key ? b : a)));
  setv(act === 'fillTu' ? 'tuNgay' : 'denNgay', HAKDates.format(pick)); hint('Đã điền ' + (act === 'fillTu' ? 'ngày cân nhỏ nhất ' : 'ngày cân lớn nhất ') + HAKDates.format(pick) + ' (từ ' + ds.length + ' phiếu cân). Bấm Lưu thông tin rừng để ghi nhận, hoặc sửa ngày.');
}
function saveForest(form) {
  const f = curForest(); if (!f) return;
  const info = Object.assign({}, f.info, readForest(form));
  const errs = forestErrors(info, f.id);
  if (errs.length) { formMsg(form, 'Chưa lưu: ' + errs.join('; ')); return; }
  const maCu = trim(f.info.maRung);
  let msg = 'Đã lưu thông tin rừng.', kind = 'ok';
  if (maCu && maCu !== info.maRung) {   // đổi mã lô: nhân công, xe, phiếu cân mang mã cũ đổi theo để dữ liệu vẫn thuộc đúng lô
    const rn = HAKLoRung.renameLot(f, info.maRung);   // f còn mã cũ: các dòng mang mã cũ đổi theo mã mới
    f.info = info; f.nc = rn.forest.nc; f.dx = rn.forest.dx; f.pc = rn.forest.pc;
    msg = 'Đã đổi mã lô ' + maCu + ' → ' + info.maRung + ' và đổi theo ' + rn.doi.nc + ' dòng nhân công, ' + rn.doi.dx + ' xe, ' + rn.doi.pc + ' phiếu cân.' + (rn.khac.length ? ' Còn ' + rn.khac.length + ' dòng mang mã khác (' + [...new Set(rn.khac.map(x => x.ma))].join(', ') + '), không tự đổi: kiểm tra ở tab Nhân công / Vận chuyển.' : '');
    if (rn.khac.length) kind = 'warn';
  } else f.info = info;
  persist();
  note(msg, kind);
}

function saveLuong(form) {
  const f = curForest(); if (!f) return;
  const nl = readLuong(form);
  if (nl.ngayBDLD && !parseVN(nl.ngayBDLD)) { formMsg(form, 'Chưa lưu: ngày bắt đầu phải đúng dd/mm/yyyy'); return; }
  f.info = Object.assign({}, f.info, nl);
  persist();
  note('Đã lưu thông số hợp đồng lao động.');
}

function saveVc(form) {
  const f = curForest(); if (!f) return;
  const info = Object.assign({}, f.info, readVc(form));
  const vc = info.vanChuyen, e = [];
  if (vc.donGiaKm === 'x') e.push('Đơn giá vận chuyển (đ/tấn/km) không phải là số');
  if (vc.coDinh === 'x') e.push('Đơn giá vận chuyển cố định không phải là số');
  if (vc.tuNgay && !parseVN(vc.tuNgay)) e.push('ngày vận chuyển phải đúng dd/mm/yyyy');
  if (e.length) { formMsg(form, 'Chưa lưu: ' + e.join('; ')); return; }
  f.info = info;
  persist();
  note('Đã lưu thông số vận chuyển.');
}

function saveGiay(form) {
  const f = curForest(); if (!f) return;
  const rows = [], errs = [];
  form.querySelectorAll('.giayRow').forEach((row, idx) => {
    const v = k => trim(row.querySelector('[name=' + k + ']').value);
    const g = {loai: v('g_loai'), ten: v('g_ten'), so: v('g_so'), ngayCap: v('g_ngayCap'), coQuan: v('g_coQuan'), hanDen: v('g_hanDen')};
    if (!g.loai && !g.ten && !g.so && !g.ngayCap && !g.coQuan && !g.hanDen) return;
    if (!g.loai) errs.push('Giấy tờ dòng ' + (idx + 1) + ': chưa chọn loại');
    else if (g.loai === 'Khác' && !g.ten) errs.push('Giấy tờ dòng ' + (idx + 1) + ': nhập tên giấy');
    rows.push(g);
  });
  if (errs.length) { formMsg(form, 'Chưa lưu: ' + errs.join('; ')); return; }
  f.info.giayTo = rows;
  persist();
  note('Đã lưu hồ sơ pháp lý của rừng.');
}

function addGiayRow() {
  const list = $('#giayList'); if (!list) return;
  const p = list.querySelector('p'); if (p) p.remove();
  list.insertAdjacentHTML('beforeend', giayRowHtml({}));
}

function delForest() {
  const o = curOwner(), f = curForest(); if (!f) return;
  if (!confirm('Xóa rừng "' + (f.info.tenRung || f.info.maRung) + '" và toàn bộ nhân công, vận chuyển, hồ sơ xuất của rừng này?')) return;
  delete o.forests[f.id];
  curF = null; persist();
  note('Đã xóa rừng.');
}

function saveInfo(form) {
  const rec = curOwner(); if (!rec) return;
  const fd = new FormData(form);
  const info = {
    ma: trim(fd.get('ma')), danhXung: trim(fd.get('danhXung')), ten: trim(fd.get('ten')),
    soHopDong: trim(fd.get('soHopDong')), ngayKyHopDong: trim(fd.get('ngayKyHopDong')), cccd: normCccd(fd.get('cccd')), ngayCap: trim(fd.get('ngayCap')),
    noiCap: trim(fd.get('noiCap')), diaChi: trim(fd.get('diaChi')), sdt: trim(fd.get('sdt'))
  };
  const errs = infoErrors(info, rec.id);
  if (errs.length) { formMsg(form, 'Chưa lưu: ' + errs.join('; ')); return; }
  rec.info = Object.assign({}, rec.info, info);   // giữ các trường cũ không còn hiển thị (ví dụ ngày sinh đã lưu)
  persist();
  note('Đã lưu thông tin chủ rừng.');
}

function delRs() {
  const rec = curOwner(); if (!rec) return;
  if (!confirm('Xóa chủ rừng "' + (rec.info.ten || '') + '" và toàn bộ nhân công, vận chuyển của hồ sơ này?')) return;
  delete db.rs[rec.id];
  cur = null; curF = null; persist();
  note('Đã xóa hồ sơ chủ rừng.');
}

// Mặc định nạp vào lô đang mở. File cũ có cột Mã rừng điền đúng một mã và lô đó tồn tại trong chủ rừng đang mở thì nạp vào lô đó; điền nhiều mã khác nhau thì nạp vào lô đang mở và báo lỗi các dòng lệch mã
function targetForestFor(rows, f) {
  const codes = [...new Set(rows.map(r => r.maRung).filter(Boolean))];   // chỉ tính các ô có điền mã (file mới không có cột này)
  const t = codes.length === 1 ? (forestList(curOwner()).find(x => x.info.maRung === codes[0]) || f) : f;
  rows.forEach(r => { if (!r.maRung) r.maRung = t.info.maRung; });   // ô trống: gán mã lô đích để các bản ghi luôn mang mã lô
  return t;
}

/* Trước khi ghi: số dòng hợp lệ/lỗi theo số dòng, và khi nạp lại thì số bản ghi sẽ thêm / cập nhật / giữ nguyên / bỏ */
const ROW_KEY = {nc: r => normCccd(r.cccd) || foldKey(r.ten), dx: r => bienKey(r.bienSo), pc: r => String(r.soPhieu || '').toUpperCase()};
const foldKey = v => trim(v).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const rowSig = r => JSON.stringify(Object.keys(r).filter(k => k[0] !== '_').sort().map(k => [k, r[k]]));
function confirmImport(kind, f, rows, fileName) {
  const label = {nc: 'nhân công', dx: 'xe', pc: 'phiếu cân'}[kind];
  const chk = {nc: checkNC, dx: checkDX, pc: checkPC}[kind](jobView(curOwner(), Object.assign({}, f, {[kind]: rows})));
  const badRows = new Set(chk.errs.map(m => (m.match(/^Dòng (\d+)/) || [])[1]).filter(Boolean));
  const old = f[kind] || [], key = ROW_KEY[kind];
  const oldMap = new Map(old.map(r => [key(r), r])), newKeys = new Set(rows.map(key));
  let add = 0, upd = 0, same = 0;
  rows.forEach(r => { const o = oldMap.get(key(r)); if (!o) add++; else if (rowSig(o) === rowSig(r)) same++; else upd++; });
  const gone = old.filter(r => !newKeys.has(key(r))), goneSrc = gone.filter(r => r._src).length;
  const lines = ['Nạp ' + rows.length + ' dòng ' + label + ' từ ' + fileName + ' vào ' + (f.info.tenRung || f.info.maRung) + ':',
    '• Hợp lệ: ' + (rows.length - badRows.size) + ' dòng; có lỗi: ' + badRows.size + ' dòng' + (badRows.size ? ' (' + chk.errs.slice(0, 5).join('; ') + (chk.errs.length > 5 ? '; …' : '') + ')' : '')];
  if (old.length) lines.push('• So với dữ liệu đang có: thêm ' + add + ', cập nhật ' + upd + ', giữ nguyên ' + same + ', bỏ ' + gone.length + ' bản ghi không có trong file' + (goneSrc ? ' (gồm ' + goneSrc + ' phiếu lấy từ tra cứu Google Sheets)' : '') + '.');
  if (kind === 'pc') {   // phiếu mới có ngày không có thật: CHẶN lưu cả file (không ghi dở), nêu số phiếu và lý do để sửa file rồi nạp lại
    const badDate = rows.filter(r => !HAKDates.isValid(r.ngay));
    if (badDate.length) { alert('Chưa nạp file ' + fileName + ': có ' + badDate.length + ' phiếu cân sai ngày, dữ liệu hồ sơ giữ nguyên.\n\n' + badDate.slice(0, 15).map(r => '• Dòng ' + r._row + ', phiếu ' + (r.soPhieu || '(không số)') + ': ' + HAKDates.why(r.ngay)).join('\n') + (badDate.length > 15 ? '\n• …' : '') + '\n\nSửa ngày trong file Excel rồi nạp lại.'); return false; }
  }
  if (!old.length && !badRows.size) return true;
  return confirm(lines.join('\n') + '\n\nGhi vào hồ sơ?');
}
async function importFile(kind, file) {
  const f0 = curForest(); if (!f0) return;
  const tgt = {o: cur, f: curF, ma: f0.info.maRung, epoch: dbEpoch};   // lô đích cố định ngay khi chọn file: không phụ thuộc lô đang mở khi đọc xong
  try {
    const spec = {nc: ['NHAN_CONG', H_NC, NC_REQ, normNC], dx: ['DOI_XE', H_DX, DX_REQ, normDX], pc: ['PHIEU_CAN', H_PC, PC_REQ, normPC, PC_ALIAS]}[kind];
    const r = await parseSheet(file, spec[0], spec[1], spec[2], spec[3], spec[4]);
    const o1 = db.rs[tgt.o], f1 = o1 && o1.forests && o1.forests[tgt.f];
    if (tgt.epoch !== dbEpoch || !f1) { pushNote('Đã dừng nạp file ' + file.name + ': lô ' + tgt.ma + ' không còn như lúc chọn file (đã bị xóa hoặc dữ liệu vừa được khôi phục). Không có gì được đưa vào bản nháp.', 'err'); return; }
    const ma = f1.info.maRung, other = [...new Set(r.rows.map(x => x.maRung).filter(x => x && x !== ma))];   // file mang mã lô khác lô đích: KHÔNG tự chuyển lô, báo lỗi ở bản nháp
    r.rows.forEach(x => { if (!x.maRung) x.maRung = ma; if (kind === 'pc') { const co = !!String(x.ngay2 || '').trim(); HAKPhieuCan.chuanHoaNgay2(x); if (!co && x.ngay2) x._ngay2Suy = true; } });   // file không có hoặc để trống ngày cân 2: suy ra (cờ tạm _ngay2Suy chỉ dùng khi gộp, không lưu)
    stErrList = null; const st = stGetFor(tgt.o, tgt.f, true), rep = HAKStage.merge(st, kind, r.rows, {source: 'Excel: ' + file.name, suyNgay2: HAKPhieuCan.suyNgay2});
    const here = cur === tgt.o && curF === tgt.f;
    const msg = 'Đã đưa ' + r.rows.length + ' dòng ' + ST_LABEL[kind] + ' từ ' + file.name + ' vào BẢN NHÁP của lô ' + ma + ' (chưa lưu): thêm ' + rep.add + ', cập nhật ' + rep.upd + ', giữ nguyên ' + rep.same + (rep.kept ? ', giữ ' + rep.kept + ' bản ghi đã lưu không có trong file' : '') + (rep.pending ? ', CẦN ĐỐI CHIẾU ' + rep.pending + ' dòng trùng số phiếu nhưng khác dữ liệu (chưa áp dụng)' : '') + (rep.errors ? ', ' + rep.errors + ' ô sai định dạng (giữ giá trị cũ, xem chi tiết)' : '') + (other.length ? '. Cảnh báo: file có mã rừng khác lô này (' + other.join(', ') + ') nên các dòng đó báo lỗi' : '') + '. Xem trước, chỉnh sửa rồi bấm “Lưu dữ liệu vào lô”.';
    if (!here) { pushNote('Lô ' + ma + ' có dữ liệu chờ xem trước (' + ST_LABEL[kind] + ' từ ' + file.name + '). Bạn đang xem lô khác nên màn hình giữ nguyên; mở lại lô ' + ma + ' để xem trước và lưu.', 'warn'); return; }
    ftab = ST_TAB[kind]; pushNote(msg, rep.pending || rep.errors ? 'warn' : 'ok');   // hiển thị ở lần vẽ lại sau khi hàm này xong (.then(render))
  } catch (e) {
    pushNote('Không nạp được file: ' + e.message, 'err');
  }
}
const stamp = () => { const d = new Date(); return pad2(d.getHours()) + ':' + pad2(d.getMinutes()) + ' ' + pad2(d.getDate()) + '/' + pad2(d.getMonth() + 1); };

/* File mẫu có định dạng, danh sách chọn và trang HUONG_DAN giải thích từng cột (src/xlsxmau.js); phần mềm chỉ đọc trang dữ liệu */
async function downloadTemplate(kind) {
  try {
    const bytes = await HAKXlsxMau.build(kind, JSZip, {version: dbInfo && dbInfo.version, chucDanh: chucDanhAll()});
    download(new Blob([bytes], {type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}), HAKXlsxMau.SPECS[kind].file);
    note('Đã tạo file mẫu ' + HAKXlsxMau.SPECS[kind].file + '. Mở trang HUONG_DAN để xem cách điền từng cột, điền dữ liệu ở trang ' + HAKXlsxMau.SPECS[kind].sheet + '.', 'ok');
  } catch (e) { note('Không tạo được file mẫu: ' + e.message, 'err'); }
}

let backupBusy = false;
async function backupAll() {
  if (HB) {
    if (backupBusy) return note('Đang sao lưu, vui lòng đợi xong rồi bấm lại.', 'warn');
    backupBusy = true; note('Đang sao lưu và kiểm tra hai file…', 'warn');
    try {
      const r = await HB.backupTo();
      if (r.canceled) return;
      // chỉ báo thành công khi cả hai file (JSON và SQLite) đã ghi và qua kiểm tra; ngược lại nêu rõ file nào dùng được
      return note(r.ok ? 'Đã sao lưu và kiểm tra xong: ' + r.jsonFile + ' và ' + r.sqlFile + '.' : 'Sao lưu chưa đầy đủ: ' + (r.message || r.error || 'lỗi không rõ'), r.ok ? 'ok' : 'err');
    } finally { backupBusy = false; }
  }
  const blob = new Blob([JSON.stringify(db, null, 2)], {type: 'application/json'});
  download(blob, 'HoSoKhaiThac_SaoLuu_' + new Date().toISOString().slice(0, 10) + '.json');
}
const LO_ST = {moi: ['ok', 'THÊM'], trung: ['warn', 'TRÙNG']};
/* Giữ cả hai: mỗi lô trùng phải có mã mới; gợi ý sẵn, kiểm tra cùng quy tắc với lúc ghi (src/lorung.js: maTrung) */
function impMaHtml(plan) {
  const dup = plan.owners.flatMap(o => o.forests.filter(f => f.state === 'trung').map(f => Object.assign({chu: o.ten}, f)));
  if (!dup.length || plan.conflicts.length) return '';
  return '<div id="impMa" class="card" style="margin:6px 0 6px 22px"><div class="mut">Nhập mã mới cho từng lô được nhân bản. Mã phải chưa có ở lô nào trên máy và khác các lô khác trong file. Nhân công, xe, phiếu cân của lô được đổi theo mã mới.</div>' +
    dup.map(f => '<div class="row" style="margin-top:6px"><span style="min-width:200px">' + esc(f.chu) + ' · <b>' + esc(f.ma) + '</b> ' + esc(f.ten) + '</span> → <input data-mamoi="' + esc(f.id) + '" value="' + esc(f.maMoi || f.maGoiY) + '" size="16" aria-label="Mã mới cho lô ' + esc(f.ma) + '"> <span class="pill ' + (f.maLoi && f.maMoi ? 'err' : 'ok') + '" data-maloi="' + esc(f.id) + '">' + (f.maLoi && f.maMoi ? esc(f.maLoi) : 'hợp lệ') + '</span></div>').join('') + '</div>';
}
const impMaMoi = () => Object.fromEntries([...document.querySelectorAll('#impMa [data-mamoi]')].map(i => [i.dataset.mamoi, trim(i.value)]));
let impMaTimer = null;
function impMaCheck() {   // kiểm tra lại mã mới ngay khi gõ, bằng đúng quy tắc của bước ghi
  clearTimeout(impMaTimer);
  impMaTimer = setTimeout(async () => {
    if (!window.__imp || !HB) return;
    const r = await HB.importPreview(window.__imp, {strategy: 'both', maMoi: impMaMoi()});
    if (!r.ok) return;
    window.__plan = r.plan;
    r.plan.owners.forEach(o => o.forests.forEach(f => { const el = document.querySelector('#impMa [data-maloi="' + f.id + '"]'); if (el) { const bad = f.state === 'trung' && f.maLoi; el.className = 'pill ' + (bad ? 'err' : 'ok'); el.textContent = bad ? f.maLoi : 'hợp lệ'; } }));
  }, 200);
}
function impPlanHtml(plan) {
  if (!plan) return '';
  const conf = plan.conflicts.length ? '<div class="msg err"><b>Dừng: có ' + plan.conflicts.length + ' hồ sơ mâu thuẫn, cần đối chiếu trước khi khôi phục</b> (không có gì bị ghi):<br>' + plan.conflicts.slice(0, 10).map(c => '• ' + esc(c.moTa)).join('<br>') + (plan.conflicts.length > 10 ? '<br>• …' : '') + '</div>' : '';
  const rows = plan.owners.map(o => '<tr><td><b>' + esc(o.ten) + '</b><br><small class="mut">' + (o.state === 'trung' ? 'chủ đã có trên máy: giữ hồ sơ chủ rừng của máy' : 'chủ mới: sẽ thêm cùng các lô') + '</small></td><td>' +
    o.forests.map(f => '<div><span class="pill ' + (o.state === 'moi' ? 'ok' : LO_ST[f.state][0]) + '">' + (o.state === 'moi' ? 'THÊM' : LO_ST[f.state][1]) + '</span> ' + esc(f.ma || '(không mã)') + ' ' + esc(f.ten) + ' <small class="mut">· ' + f.nc + ' nhân công, ' + f.dx + ' xe, ' + f.pc + ' phiếu cân</small>' + (f.loi ? ' <span class="pill err">mâu thuẫn</span>' : '') + '</div>').join('') +
    o.giu.map(g => '<div><span class="pill">GIỮ</span> ' + esc(g.ma) + ' ' + esc(g.ten) + ' <small class="mut">· lô trên máy không có trong file, không bị đụng tới</small></div>').join('') + '</td></tr>').join('');
  return conf + '<div class="wrap" style="max-height:230px;overflow:auto"><table><tr><th>Chủ rừng</th><th>Lô: sẽ làm gì với lựa chọn “Giữ bản trên máy / Ghi đè / Giữ cả hai”</th></tr>' + rows + '</table></div>' +
    '<p class="mut" style="margin:6px 0">Lô TRÙNG: giữ bản trên máy (mặc định), hoặc ghi đè <b>đúng lô đó</b> bằng bản trong file. Lô THÊM luôn được thêm. Lô GIỮ không bao giờ bị xóa.</p>';
}
async function importWithPreview(inc) {
  const p = await HB.importPreview(inc, {strategy: 'both', maMoi: {}});
  if (!p.ok) return note('Không đọc được bản sao lưu: ' + p.error, 'err');
  const row = (l, a, b) => '<tr><td>' + l + '</td><td style="text-align:right">' + fmt(a) + '</td><td style="text-align:right">' + fmt(b) + '</td></tr>';
  const I = p.incoming, E = p.existing, blocked = p.plan.conflicts.length > 0;
  $('#impBody').innerHTML = '<h2>Khôi phục bản sao lưu toàn bộ</h2><table><tr><th></th><th style="text-align:right">Trong file</th><th style="text-align:right">Đang có trên máy</th></tr>' +
    row('Chủ rừng', I.owners, E.owners) + row('Rừng', I.forests, E.forests) + row('Nhân công', I.nc, E.nc) + row('Xe', I.dx, E.dx) + row('Phiếu cân', I.pc, E.pc) + '</table>' + impPlanHtml(p.plan) +
    '<p><b>Cách xử lý:</b></p>' +
    '<label><input type="radio" name="impStrat" value="skip"' + (blocked ? ' disabled' : ' checked') + '> Giữ bản trên máy, chỉ thêm lô/chủ mới</label>' +
    '<label><input type="radio" name="impStrat" value="overwrite"' + (blocked ? ' disabled' : '') + '> Ghi đè các lô TRÙNG bằng dữ liệu trong file (lô khác của chủ được giữ)</label>' +
    '<label><input type="radio" name="impStrat" value="both"' + (blocked ? ' disabled' : '') + '> Giữ cả hai (lô trùng trong file được thêm thành lô MỚI với <b>mã lô mới do bạn xác nhận</b>)</label>' + impMaHtml(p.plan) +
    '<hr><label><input type="radio" name="impStrat" value="replace"' + (blocked ? ' checked' : '') + '> <b>Thay toàn bộ dữ liệu</b> trên máy bằng file này (khôi phục toàn bộ: xóa ' + fmt(E.owners) + ' chủ rừng và ' + fmt(E.forests) + ' lô hiện có trên máy)</label>' +
    '<p class="mut">Phần mềm tự sao lưu cơ sở dữ liệu hiện tại trước khi ghi và ghi trong một giao dịch: lỗi giữa chừng thì không đổi gì. Bản tra cứu Google Sheets không bị đổi.</p>' +
    '<div class="row" style="justify-content:flex-end"><button class="btn ghost" data-act="impCancel">Hủy</button><button class="btn" data-act="impGo">Thực hiện</button></div>';
  window.__imp = inc; window.__plan = p.plan; $('#impBox').classList.add('on');
}
async function importGo() {
  const strat = (document.querySelector('input[name=impStrat]:checked') || {}).value;
  if (!strat) return;
  const E = window.__plan ? window.__plan.owners : [];
  if (strat === 'replace' && !confirm('THAY TOÀN BỘ dữ liệu hồ sơ trên máy bằng file này?\n\nTất cả chủ rừng và lô hiện có trên máy sẽ bị thay bằng nội dung file (' + E.length + ' chủ rừng, ' + E.reduce((n, o) => n + o.forests.length, 0) + ' lô trong file). Lô nào có trên máy mà không có trong file sẽ MẤT khỏi ứng dụng (vẫn còn trong bản sao lưu tự động trước khi ghi).\n\nTiếp tục?')) return;
  let opts;
  if (strat === 'both') {   // giữ cả hai: xác nhận mã mới, kiểm tra trước khi ghi
    opts = {strategy: 'both', maMoi: impMaMoi()};
    const chk = await HB.importPreview(window.__imp, opts);
    if (chk.ok && chk.plan.maLoi.length) return note('Chưa ghi: ' + chk.plan.maLoi.slice(0, 4).map(m => 'lô ' + m.ma + ': ' + m.moTa).join(' | '), 'err');
    const nb = Object.entries(opts.maMoi);
    if (nb.length && !confirm('Giữ cả hai: ' + nb.length + ' lô trong file sẽ được thêm thành lô MỚI với mã đã xác nhận:\n' + chk.plan.owners.flatMap(o => o.forests.filter(f => f.state === 'trung').map(f => '• ' + f.ma + ' → ' + (opts.maMoi[f.id] || '?'))).join('\n') + '\n\nLô hiện có trên máy giữ nguyên. Tiếp tục?')) return;
  }
  const r = await HB.importApply(window.__imp, strat, opts);
  $('#impBox').classList.remove('on'); window.__imp = null; window.__plan = null;
  if (!r.ok) return note('Không nhập được, dữ liệu cũ giữ nguyên: ' + r.error, 'err');
  db = withDefaults(r.db); dbEpoch++; Object.keys(stages).forEach(k => delete stages[k]); cur = null; curF = null;   // dữ liệu vừa được thay: bản nháp cũ không còn đích
  note('Đã nhập xong: ' + r.counts.owners + ' chủ rừng, ' + r.counts.forests + ' rừng, ' + r.counts.nc + ' nhân công, ' + r.counts.dx + ' xe, ' + r.counts.pc + ' phiếu cân. Bản sao lưu trước khi nhập: ' + r.backup);
}



