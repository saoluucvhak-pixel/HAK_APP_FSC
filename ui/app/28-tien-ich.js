/* ========== Tiện ích bản 2.3 (src/tienich.js) ==========
 * Dán từ Excel · Mục lục gói in · Phụ lục in lại / ký lại · Gói “Chỉ xem” · In trong app · Hướng dẫn lần đầu.
 * Không đổi cách tính, cách lưu của hồ sơ: dán từ Excel đi qua đúng đường nạp file (importFile); các gói xuất chỉ đọc dữ liệu đã lưu. */

/* ---------- 1. Dán từ Excel ---------- */
const DAN_SPEC = {nc: ['NHAN_CONG', NC_REQ, 'nhân công'], dx: ['DOI_XE', DX_REQ, 'xe vận chuyển'], pc: ['PHIEU_CAN', PC_REQ, 'phiếu cân']};
function danMo(kind) {
  const f = curForest(); if (!f || !DAN_SPEC[kind]) return; if (kiemKhoa(f)) return;
  const sp = DAN_SPEC[kind];
  $('#impBody').innerHTML = '<h2>Dán ' + sp[2] + ' từ Excel</h2>' +
    '<p class="mut">Trong Excel hoặc Google Sheets: bôi đen vùng ô <b>gồm cả dòng tiêu đề</b> (tên cột như file mẫu), bấm Ctrl+C, rồi bấm vào ô bên dưới và Ctrl+V. Cột bắt buộc: <b>' + sp[1].map(esc).join(', ') + '</b>. Dữ liệu dán được kiểm tra và so với dữ liệu đang có như khi nạp file.</p>' +
    '<textarea id="danText" data-kind="' + kind + '" rows="12" style="width:100%;font-family:Consolas,monospace;font-size:12px;white-space:pre" placeholder="Dán vào đây (Ctrl+V)"></textarea>' +
    '<div id="danMsg" class="mut" style="margin:6px 0"></div>' +
    '<div class="row" style="justify-content:flex-end"><button class="btn ghost" data-act="danHuy">Hủy</button><button class="btn" data-act="danNap">Nạp dữ liệu đã dán</button></div>';
  $('#impBox').classList.add('on'); const t = document.getElementById('danText'); if (t) t.focus();
}
function danXemTruoc() {
  const t = document.getElementById('danText'), m = document.getElementById('danMsg'); if (!t || !m) return null;
  const sp = DAN_SPEC[t.dataset.kind], aoa = HAKTienIch.danParse(t.value), k = HAKTienIch.danKiem(aoa, sp[1]);
  m.className = k.ok ? 'msg ok' : (t.value.trim() ? 'msg err' : 'mut'); m.textContent = k.ok ? 'Đọc được ' + k.dong + ' dòng dữ liệu, ' + k.cot + ' cột.' : (t.value.trim() ? k.error : '');
  return k.ok ? {aoa, kind: t.dataset.kind, k} : null;
}
document.addEventListener('input', e => { if (e.target && e.target.id === 'danText') danXemTruoc(); });
async function danNap() {
  const r = danXemTruoc(); if (!r) return note('Chưa nạp: ' + ((document.getElementById('danMsg') || {}).textContent || 'vùng dán chưa đúng') , 'err');
  const sp = DAN_SPEC[r.kind], wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(r.aoa), sp[0]);
  const file = new File([XLSX.write(wb, {type: 'array', bookType: 'xlsx'})], 'Dán từ Excel (' + r.k.dong + ' dòng).xlsx');
  $('#impBox').classList.remove('on');
  await importFile(r.kind, file); render();
}

/* ---------- 2. Mục lục gói in ---------- */
const bmTen = ma => { const b = window.HAKBieuMau && HAKBieuMau.byMa(ma); return b ? b.ten : ((DOC_CODES[ma] || '').replace(/^BM-\d\d · /, '')); };
const bmSoBan = ma => { const b = window.HAKBieuMau && HAKBieuMau.byMa(ma); return b ? b.soBan : 1; };
async function mucLucDocx(rec, files, tenGoi) {
  const ml = HAKTienIch.mucLuc(files, bmTen, bmSoBan);
  const rows = [['STT', 'Mẫu', 'Tên biểu mẫu', 'Lập cho', 'Số bản', 'Tên file trong gói']].concat(ml.map(x => [String(x.stt), 'BM-' + x.ma, x.ten, x.doiTuong || 'Cả lô', String(x.soBan), x.file]));
  return makeDocx([P('MỤC LỤC HỒ SƠ', {al: 'center', b: true, sz: 30, after: 60}), P('Rừng ' + (rec.info.maRung || '') + ' · Chủ rừng ' + upper(rec.info.ten || ''), {al: 'center', after: 60}),
    P(tenGoi + ' · ' + ml.length + ' biểu mẫu · lập ngày ' + todayStr(), {al: 'center', i: true, after: 200}), T([700, 900, 3400, 1700, 800, 3700], rows, {head: true, sz: 22})],
  {landscape: true, footer: 'Mục lục hồ sơ · Rừng ' + (rec.info.maRung || '')});
}

/* ---------- 3. Phụ lục in lại, ký lại ---------- */
async function phuLucKyLai() {
  const f = curForest(), rec = curRec(); if (!f || !rec) return;
  const ds = HAKTienIch.kyLai((HAKQuyTrinh.peek(f) || {}).soIn || []); if (!ds.length) return note('Chưa có biểu mẫu nào in lại hoặc ký lại.', 'warn');
  const HANH = {in: 'In', ky: 'Ký', huyky: 'Bỏ ký', huyin: 'Bỏ xác nhận in'}, rows = [['Mẫu', 'Tên biểu mẫu', 'Việc', 'Lần', 'Thời điểm', 'Lý do']];
  ds.forEach(g => g.dong.forEach(x => rows.push(['BM-' + g.ma.replace(/:.*/, ''), bmTen(g.ma.slice(0, 2)), HANH[x.hanh] || x.hanh, x.lan ? String(x.lan) : '', new Date(x.at).toLocaleString('vi-VN'), x.lyDo])));
  download(await makeDocx([P('PHỤ LỤC THEO DÕI IN LẠI, KÝ LẠI BIỂU MẪU', {al: 'center', b: true, sz: 30, after: 60}), P('Rừng ' + (rec.info.maRung || '') + ' · Chủ rừng ' + upper(rec.info.ten || ''), {al: 'center', after: 60}),
    P('Gồm các biểu mẫu đã in từ lần thứ hai hoặc ký từ lần thứ hai (theo Sổ in của lô) · lập ngày ' + todayStr(), {al: 'center', i: true, after: 200}), T([900, 3300, 1300, 700, 2200, 3000], rows, {head: true, sz: 22}),
    P('Bản in, bản ký trước của các biểu mẫu trên không còn hiệu lực; lưu kèm hồ sơ để đối chiếu.', {i: true, before: 200})], {landscape: true, footer: 'Phụ lục in lại, ký lại · Rừng ' + (rec.info.maRung || '')}), 'Phu_luc_in_lai_ky_lai_' + slug(rec.info.maRung || '') + '.docx');
}

/* ---------- 4. Gói “Chỉ xem” và 5. In trong app ---------- */
function chiXemData(rec, f, files) {
  const o = curOwner() || {info: {}}, i = rec.info || {}, F = {dx: rec.dx, hdvc: rec.hdvc}, fmtT = v => fmtTan(Math.round((v || 0) * 1000) / 1000);
  const tenD = id => { const d = (rec.doi || []).find(x => x.id === id); return d ? (trim(d.ten) || 'Đội ' + ((rec.doi || []).indexOf(d) + 1)) : ''; };
  const sdx = HAKSoVB.soDoiXe(f), soCua = (id, t) => (sdx.find(x => x.id === id && x.truong === t) || {}).in || '';
  const dxHd = r => { const h = rec.hdvc ? HAKModel.hdOrder(F).find(x => HAKModel.xeOf(F, x).includes(r)) : null; return h ? (trim(h.ten) || 'Đội xe ' + (HAKModel.hdOrder(F).indexOf(h) + 1)) : ''; };
  const HANH = {chot: 'Chốt', mokhoa: 'Mở khóa', luutru: 'Lưu trữ', boluutru: 'Bỏ lưu trữ', dung: 'Dừng lô', molai: 'Mở lại lô'};
  return {phanMem: 'HAKQN Desktop', phienBan: (dbInfo && dbInfo.version) || '', taoLuc: new Date().toLocaleString('vi-VN'),
    chu: {ten: o.info.ten, ma: o.info.ma, cccd: o.info.cccd, diaChi: o.info.diaChi},
    lo: {ma: i.maRung, ten: i.tenRung, diaDiem: i.diaDiem, dienTich: i.dienTich, tuNgay: i.tuNgay, denNgay: i.denNgay, trangThai: HAKVongDoi.TEN[loTrangThai(rec, f)] || ''},
    chot: f.chot ? {phienBan: f.chot.phienBan, hash: f.chot.hash, at: new Date(f.chot.at).toLocaleString('vi-VN')} : null,
    tong: {nc: (rec.nc || []).length, dx: (rec.dx || []).length, pc: (rec.pc || []).length, kl: fmtT(klPhieu(rec.pc || []))},
    doi: (rec.doi || []).map(d => { const ng = (rec.nc || []).filter(r => r.doiId === d.id), tt = ng.find(isTT); return {ten: tenD(d.id), toTruong: tt ? tt.ten : '', soNguoi: ng.length, kl: fmtT(klPhieu((rec.pc || []).filter(p => p.doiId === d.id)))}; }),
    doiXe: rec.hdvc ? groupsDX(rec).filter(g => g.hd).map(g => { const xs = HAKModel.xeOf(F, g.hd), bs = new Set(xs.map(r => trim(r.bienSo))); return {ten: trim(g.hd.ten) || 'Đội xe ' + (HAKModel.hdOrder(F).indexOf(g.hd) + 1), nguoiKy: g.ten, soXe: xs.length, soHD: soCua(g.hd.id, 'soVC'), soXN: soCua(g.hd.id, 'pcSo'), kl: fmtT(klPhieu((rec.pc || []).filter(p => bs.has(trim(p.bienSo)))))}; }) : [],
    nc: (rec.nc || []).map((r, k) => [k + 1, r.ten, r.vaiTro, r.chucDanh, tenD(r.doiId)]),
    dx: (rec.dx || []).map((r, k) => [k + 1, r.bienSo, r.chuXe, r.taiXe, dxHd(r)]),
    pc: (rec.pc || []).map((p, k) => [k + 1, p.ngay, p.soPhieu, p.bienSo, typeof p.kl === 'number' ? fmtTan(p.kl) : (p.kl || ''), tenD(p.doiId)]),
    nhatKy: (f.nhatKy || []).map(x => ({at: new Date(x.at).toLocaleString('vi-VN'), hanh: (HANH[x.hanh] || x.hanh) + (x.phienBan ? ' (phiên bản ' + x.phienBan + ')' : ''), lyDo: x.lyDo || ''})),
    files: files || []};
}
/* file biểu mẫu xuất được của lô (cùng nguồn chặn với nút “Tải toàn bộ hồ sơ”); lô còn mục chặn cả gói thì trả [] (gói Chỉ xem chỉ có trang tóm tắt) */
function chiXemFiles(rec) { try { const g = gate(rec); return kindOk(g).all ? buildFiles(rec, 'all').filter(x => !x.biChan && !x.draft) : []; } catch (e) { return []; } }
async function chiXemTai() {
  const f = curForest(), rec = curRec(); if (!f || !rec) return; if (stBlockNote()) return;
  docMode = 'day';
  try {
    const files = chiXemFiles(rec), z = new JSZip();
    for (const x of files) z.file('Bieu_mau/' + x.path, await makeDocx(x.blocks, docOpts(x, rec)));
    if (files.length) z.file('Bieu_mau/00_Muc_luc.docx', await mucLucDocx(rec, files, 'Gói chỉ xem'));
    z.file('XEM_HO_SO.html', HAKTienIch.chiXemHtml(chiXemData(rec, f, files.map(x => x.path))));
    download(await z.generateAsync({type: 'blob'}), 'HoSo_' + slug(rec.info.ten) + '_' + slug(rec.info.maRung || '') + '_CHI_XEM.zip');
    note('Đã tải gói Chỉ xem: mở file XEM_HO_SO.html bằng trình duyệt để xem' + (files.length ? '; thư mục Bieu_mau có ' + files.length + ' biểu mẫu và mục lục.' : '. Hồ sơ còn mục chặn nên gói chưa kèm biểu mẫu.') + ' Gói này không nhập lại được vào phần mềm.', 'ok');
  } catch (e) { note('Không tạo được gói Chỉ xem: ' + e.message, 'err'); } finally { docMode = 'day'; }
}
async function inHtml(html, ten) {
  if (!HB || !HB.inHtml) return note('In trong app cần bản cài trên Windows.', 'err');
  const r = await HB.inHtml(html, ten);
  if (r && r.canceled) return note('Đã hủy lệnh in.', 'warn');
  note(r && r.ok ? (r.file ? 'Đã tạo bản in: ' + r.file : 'Đã gửi lệnh in.') : 'Không in được: ' + ((r && r.error) || 'lỗi không rõ'), r && r.ok ? 'ok' : 'err');
}
function inTomTat() { const f = curForest(), rec = curRec(); if (!f || !rec) return; if (stBlockNote()) return; return inHtml(HAKTienIch.chiXemHtml(chiXemData(rec, f, [])), 'Tom_tat_ho_so_' + slug(rec.info.maRung || '')); }
function inBaoCao() {
  const b = document.getElementById('rpBody'); if (!b) return; const c = b.cloneNode(true);
  c.querySelectorAll('.gh, .rpl, .row, button, input, select, label, .msg, #rpFilter, details.rpF').forEach(x => x.remove());
  const html = '<!doctype html><html lang="vi"><head><meta charset="utf-8"><title>Báo cáo</title><style>body{font:13px/1.45 "Segoe UI",Arial,sans-serif;color:#111;margin:18px}h3{font-size:18px;margin:0 0 4px}table{border-collapse:collapse;width:100%;font-size:12px}th,td{border:1px solid #999;padding:3px 5px;text-align:left}thead th{background:#eee}.kpi{display:flex;flex-wrap:wrap;gap:6px 18px;margin:8px 0}.kpi div{font-size:12px}.kpi b{display:block;font-size:15px}.mut{color:#555}tr{break-inside:avoid}</style></head><body>' + c.innerHTML + '</body></html>';
  return inHtml(html, 'Bao_cao_' + rp.id);
}
function tienIchBox(rec) {
  const f = curForest(); if (!f) return '';
  const n = HAKTienIch.kyLai((HAKQuyTrinh.peek(f) || {}).soIn || []).length;
  return '<div class="card" id="tienIch" style="margin-bottom:10px"><div class="row" style="justify-content:space-between;flex-wrap:wrap;gap:8px"><div><b>Chia sẻ và in</b><div class="mut">Gói Chỉ xem: một trang tóm tắt mở bằng trình duyệt, kèm biểu mẫu và mục lục; người nhận không sửa được và không nhập lại được vào phần mềm.</div></div>' +
    '<div class="row" style="gap:8px;flex-wrap:wrap"><button class="btn sm" data-act="chiXemTai">Tải gói Chỉ xem (.zip)</button>' + (HB ? '<button class="btn sm ghost" data-act="inTomTat">In tóm tắt hồ sơ</button>' : '') +
    '<button class="btn sm ghost" data-act="phuLucKyLai"' + (n ? '' : ' disabled title="Chưa có biểu mẫu nào in lại hoặc ký lại"') + '>Phụ lục in lại, ký lại' + (n ? ' (' + n + ' mẫu)' : '') + '</button></div></div></div>';
}

/* ---------- 6. Hướng dẫn lần đầu ---------- */
/* khai bằng function (không dùng const / let) vì màn Tổng quan được vẽ lần đầu TRƯỚC khi module này chạy tới */
function hdAnRoi() { try { return localStorage.getItem('hakqn.huongDan.an') === '1'; } catch (e) { return false; } }
function hdDat(an) { try { if (an) localStorage.setItem('hakqn.huongDan.an', '1'); else localStorage.removeItem('hakqn.huongDan.an'); } catch (e) { /* không có localStorage: chỉ ẩn trong phiên này */ } window.__hdAnTam = !!an; }
function huongDanBox() {
  const ds = HAKTienIch.huongDan(db), xong = ds.filter(x => x.xong).length;
  if (hdAnRoi() || window.__hdAnTam || xong === ds.length) return '';
  const tiep = ds.find(x => !x.xong);
  return '<div class="card" id="huongDan" data-xong="' + xong + '" data-tiep="' + tiep.id + '"><div class="row" style="justify-content:space-between;align-items:center"><h3 style="margin:0">Hướng dẫn bắt đầu <span class="mut" style="font-weight:400">· xong ' + xong + '/' + ds.length + ' bước</span></h3><button class="btn ghost sm" data-act="hdAn">Ẩn hướng dẫn</button></div>' +
    '<ol style="line-height:1.9;margin:8px 0 0;padding-left:22px">' + ds.map(x => '<li data-buoc="' + x.id + '" data-xong="' + (x.xong ? 1 : 0) + '"' + (x.xong ? ' class="mut"' : '') + '>' + (x.xong ? '✓ ' : '') + '<b>' + esc(x.ten) + '</b>' + (x === tiep ? ' <span class="pill warn">làm tiếp</span>' : '') + '<br><span class="mut">' + esc(x.moTa) + '</span>' +
      (x === tiep ? ' <button class="btn sm" data-act="' + (x.id === 'chu' ? 'newRs' : 'hdDi') + '" data-buoc="' + x.id + '">' + (x.id === 'chu' ? '+ Chủ rừng mới' : 'Mở nơi làm bước này') + '</button>' : '') + '</li>').join('') + '</ol>' +
    '<p class="mut" style="margin:8px 0 0">Mở lại bất cứ lúc nào ở ⋯ Thêm → Hướng dẫn bắt đầu. Tài liệu đầy đủ: ⋯ Thêm → Hướng dẫn sử dụng.</p></div>';
}
function hdDi(buoc) {
  const oid = Object.keys(db.rs || {})[0]; if (!oid) return;
  const fid = Object.keys((db.rs[oid].forests) || {})[0];
  cur = oid; view = 'owner'; tab = 'rung'; curF = fid || null;
  if (fid) ftab = {lo: 'finfo', nc: 'nc', dx: 'dx', pc: 'dx', xuat: 'kt'}[buoc] || 'finfo';
  render();
}
window.__tienIch = {chiXemData: () => { const f = curForest(), rec = curRec(); return f && rec ? chiXemData(rec, f, []) : null; }};
