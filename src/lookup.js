'use strict';
/* Bản tra cứu: đọc 3 tab HoSoKeo_QC, HoSoRung_QC, ToaDoRung_QC (từ Google Sheets xuất .xlsx hoặc file Excel cùng cấu trúc),
 * kiểm tra tên tab + tiêu đề cột, lưu vào SQLite, tìm kiếm có dấu/không dấu và dựng "kết quả" để điền vào hồ sơ rừng. */
const XLSX = require('xlsx');
const D = require('./dates');   // quy tắc ngày lịch dùng chung (31/02/2026 không có thật)

const TABS = {
  HoSoKeo_QC: {
    req: ['Mã khách hàng', 'Mã hợp đồng', 'SỐ PHIẾU CÂN', 'Ngày nhập', 'SỐ XE', 'Biển số 1', 'KL hàng (KG)', 'Khối lượng (Tấn)', 'Đơn giá', 'Thanh toán', 'Họ và tên chủ rừng', 'ĐỊA CHỈ RỪNG'],
    text: ['Mã khách hàng', 'Mã hợp đồng', 'SỐ PHIẾU CÂN', 'SỐ PHIẾU CHI', 'SỐ XE', 'Biển số 1', 'Số BKLS'],
    cccd: ['Mã khách hàng'],
    search: ['Mã khách hàng', 'Mã hợp đồng', 'SỐ PHIẾU CÂN', 'SỐ XE', 'Biển số 1', 'Họ và tên chủ rừng', 'ĐỊA CHỈ RỪNG']
  },
  HoSoRung_QC: {
    req: ['Mã KH_CCCD', 'Họ và tên chủ rừng', 'Mã hợp đồng', 'Ngày ký hợp đồng', 'Địa chỉ thường trú', 'Địa chỉ hiện tại', 'Ngày cấp', 'Nơi cấp', 'SĐT', 'ĐỊA CHỈ RỪNG', 'HECTA', 'Định mức tấn/Ha', 'Pháp lý rừng'],
    text: ['Mã KH_CCCD', 'Mã hợp đồng', 'Mã thanh lý hợp đồng', 'SĐT'],
    cccd: ['Mã KH_CCCD'],
    search: ['Mã KH_CCCD', 'Họ và tên chủ rừng', 'Mã hợp đồng', 'ĐỊA CHỈ RỪNG', 'Địa chỉ thường trú']
  },
  ToaDoRung_QC: {
    req: ['Mã rừng', 'Số hợp đồng', 'HoVaTenChuRung', 'SoCCCD', 'ThuongTru', 'DiaChiRungTrong', 'DienTich_m2', 'HoSoNguonGoc', 'SoGiayTo', 'NgayGiayTo', 'Latitude_Vĩ độ', 'Longtitude_Kinh độ'],
    text: ['ID_RUNG', 'ID_GPS', 'Mã rừng', 'Số hợp đồng', 'SoCCCD', 'SoGiayTo'],
    cccd: ['SoCCCD'],
    search: ['Mã rừng', 'Số hợp đồng', 'HoVaTenChuRung', 'SoCCCD', 'DiaChiRungTrong', 'SoGiayTo']
  }
};
const TAB_NAMES = Object.keys(TABS);

const fold = s => String(s == null ? '' : s).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase().replace(/\s+/g, ' ').trim();
const clean = v => (v == null ? '' : String(v)).replace(/\s+/g, ' ').trim();
const pad2 = n => String(n).padStart(2, '0');
const baseCccd = v => clean(v).replace(/_\d+$/, '');
const stripSuffix = v => clean(v).replace(/_\d+$/, '');

/* Đọc 1 ô: ngày -> dd/mm/yyyy; cột văn bản -> chuỗi (giữ số 0 đầu; CCCD dạng số thì bù đủ 12 chữ số) */
function cellValue(cell, isText, isCccd) {
  if (!cell || cell.v == null || cell.v === '') return '';
  if (cell.t === 'd' || (cell.t === 'n' && cell.z && XLSX.SSF.is_date(cell.z))) {
    if (cell.t === 'd') { const d = cell.v; return pad2(d.getDate()) + '/' + pad2(d.getMonth() + 1) + '/' + d.getFullYear(); }
    const p = XLSX.SSF.parse_date_code(cell.v); if (!p) return '';
    const time = (p.H || p.M || p.S) && !p.y ? pad2(p.H) + ':' + pad2(p.M) + ':' + pad2(p.S) : '';
    return time || (pad2(p.d) + '/' + pad2(p.m) + '/' + p.y);
  }
  if (cell.t === 'n') {
    if (isCccd && Number.isInteger(cell.v) && String(cell.v).length <= 12) return String(cell.v).padStart(12, '0');
    if (isText) return Number.isInteger(cell.v) ? String(cell.v) : String(cell.v);
    return cell.v;
  }
  if (cell.t === 'b') return cell.v ? 'TRUE' : 'FALSE';
  return clean(cell.v);
}

/* Đọc workbook (Buffer) -> {tabs:{ten:[rows]}, errors:[]} — chỉ hợp lệ khi đủ 3 tab và đủ cột bắt buộc */
function parseWorkbook(buf) {
  const wb = XLSX.read(buf, {type: 'buffer', cellDates: false, cellNF: true, dense: false});
  const errors = [], tabs = {};
  TAB_NAMES.forEach(name => {
    const ws = wb.Sheets[name];
    if (!ws) { errors.push('Thiếu tab "' + name + '"'); return; }
    if (!ws['!ref']) { errors.push('Tab "' + name + '" trống'); return; }
    const rg = XLSX.utils.decode_range(ws['!ref']);
    const head = [];
    for (let c = rg.s.c; c <= rg.e.c; c++) { const h = ws[XLSX.utils.encode_cell({r: rg.s.r, c})]; head.push(h ? clean(h.v) : ''); }
    const miss = TABS[name].req.filter(h => !head.includes(h));
    if (miss.length) { errors.push('Tab "' + name + '" thiếu hoặc đổi tên cột: ' + miss.map(m => '"' + m + '"').join(', ')); return; }
    const T = new Set(TABS[name].text), C = new Set(TABS[name].cccd), rows = [];
    for (let r = rg.s.r + 1; r <= rg.e.r; r++) {
      const o = {}; let any = false;
      head.forEach((h, i) => {
        if (!h) return;
        const v = cellValue(ws[XLSX.utils.encode_cell({r, c: rg.s.c + i})], T.has(h), C.has(h));
        if (v !== '') any = true;
        o[h] = v;
      });
      if (any) { o._row = r + 1; rows.push(o); }
    }
    tabs[name] = rows;
  });
  return {tabs, errors};
}

function keysOf(tab, o) {
  if (tab === 'HoSoKeo_QC') return {cccd: baseCccd(o['Mã khách hàng']), hd: clean(o['Mã hợp đồng']), rung: '', phieu: clean(o['SỐ PHIẾU CÂN'])};
  if (tab === 'HoSoRung_QC') return {cccd: baseCccd(o['Mã KH_CCCD']), hd: clean(o['Mã hợp đồng']), rung: '', phieu: ''};
  return {cccd: baseCccd(o['SoCCCD']), hd: clean(o['Số hợp đồng']), rung: clean(o['Mã rừng']), phieu: ''};
}

/* ===== Tọa độ ===== */
const VN = {lat: [8, 24], lng: [102, 110]};
function parseCoord(v, kind) {
  if (v === '' || v == null) return {ok: false, reason: 'trống'};
  if (typeof v === 'number') return checkRange(v, kind, false, v);
  const s = clean(v).toUpperCase();
  const dec = s.replace(',', '.');
  if (/^-?\d+(\.\d+)?$/.test(dec)) return checkRange(Number(dec), kind, false, v);
  // Độ thập phân kèm chữ bán cầu: 15.605254N, 108.104989E
  const h = /^(\d+(?:\.\d+)?)\s*([NSEW])$/.exec(dec);
  if (h) return checkRange((h[2] === 'S' || h[2] === 'W' ? -1 : 1) * Number(h[1]), kind, true, v);
  // Độ-phút-giây: 15.48.56.109N | 15°48'56.109"N | 15 48 56.109 N
  const m = /^(\d{1,3})[°.\s]+(\d{1,2})['′.\s]+(\d{1,2}(?:[.,]\d+)?)["″]?\s*([NSEW])?$/.exec(s);
  if (m && +m[2] < 60 && parseFloat(m[3].replace(',', '.')) < 60) {
    let d = +m[1] + +m[2] / 60 + parseFloat(m[3].replace(',', '.')) / 3600;
    if (m[4] === 'S' || m[4] === 'W') d = -d;
    return checkRange(Math.round(d * 1e6) / 1e6, kind, true, v);
  }
  return {ok: false, reason: 'không đọc được "' + s + '"'};
}
function checkRange(n, kind, converted, raw) {
  const [lo, hi] = VN[kind];
  if (!(n >= lo && n <= hi)) {
    const other = kind === 'lat' ? VN.lng : VN.lat;
    return {ok: false, value: n, reason: (n >= other[0] && n <= other[1] ? 'có thể nhầm cột vĩ độ/kinh độ' : 'ngoài phạm vi Việt Nam') + ' (' + raw + ')'};
  }
  return {ok: true, value: n, converted, raw: String(raw)};
}

/* ===== Biển số ===== */
const plateKey = v => clean(v).toUpperCase().replace(/[\s.\-]/g, '');
const isPlate = v => /^\d{2}[A-Z]{1,2}\d?\d{3,5}$/.test(plateKey(v));

/* ===== Lưu trữ trong SQLite ===== */
const MIGRATION = db => db.exec(`
  CREATE TABLE lookup_sets (id INTEGER PRIMARY KEY AUTOINCREMENT, source TEXT NOT NULL, detail TEXT NOT NULL, loaded_at TEXT NOT NULL, counts TEXT NOT NULL, active INTEGER NOT NULL DEFAULT 0);
  CREATE TABLE lookup_rows (set_id INTEGER NOT NULL REFERENCES lookup_sets(id) ON DELETE CASCADE, tab TEXT NOT NULL, row_no INTEGER NOT NULL,
    data TEXT NOT NULL, search TEXT NOT NULL, k_cccd TEXT NOT NULL, k_hd TEXT NOT NULL, k_rung TEXT NOT NULL, k_phieu TEXT NOT NULL);
  CREATE INDEX idx_lr_tab ON lookup_rows(set_id, tab);
  CREATE INDEX idx_lr_cccd ON lookup_rows(set_id, k_cccd);
  CREATE INDEX idx_lr_hd ON lookup_rows(set_id, k_hd);
  CREATE INDEX idx_lr_rung ON lookup_rows(set_id, k_rung);
  CREATE INDEX idx_lr_phieu ON lookup_rows(set_id, k_phieu);`);

/* ===== Tìm kiếm thông minh ===== */
const FIELD_ALIAS = {cccd: 'cccd', cmnd: 'cccd', hd: 'hd', hopdong: 'hd', rung: 'rung', marung: 'rung', phieu: 'phieu', sophieu: 'phieu', bien: 'bien', xe: 'bien', ten: 'ten', chu: 'ten', churung: 'ten', dc: 'dc', diachi: 'dc', tinhtrang: 'tinhtrang', tt: 'tinhtrang'};
function parseQuery(q) {
  const out = {terms: [], fields: [], not: []};
  const re = /(^|\s)(-)?(?:([a-z]+):(?=\S))?(?:"([^"]+)"|(\S+))/g; let m;
  let text = fold(q);
  if ((text.match(/"/g) || []).length % 2) { const i = text.lastIndexOf('"'); text = text.slice(0, i) + text.slice(i + 1); } // dấu ngoặc kép lẻ: bỏ dấu cuối
  text = text.replace(/(^|\s)([a-z]+):\s+(?=\S)/g, '$1$2:');                                                         // "hd: 101" = "hd:101"
  text = text.replace(/(^|\s)(\d{3,4})[ .-](\d{3,4})[ .-](\d{3,4})(?=\s|$)/g, (all, sp, a, b, c) => (a + b + c).length === 12 ? sp + a + b + c : all); // CCCD gõ có dấu cách/chấm
  while ((m = re.exec(text))) {
    const neg = !!m[2], field = m[3] && FIELD_ALIAS[m[3]], val = (m[4] || m[5] || '').trim();
    let value = val, fname = field;
    if (m[3] && !field) { value = (m[3] + ':' + val); fname = null; } // "abc:xyz" không phải trường đã biết: coi như từ thường
    if (!value || /^-+$/.test(value)) continue;
    if (neg) { out.not.push(value); continue; }
    if (fname) { out.fields.push({f: fname, v: value, raw: m[3] + ':' + (m[4] ? '"' + value + '"' : value)}); continue; }
    if (/^\d{12}$/.test(value)) out.fields.push({f: 'cccd', v: value, raw: value, auto: true});
    else if (/^\d{10,11}$/.test(value)) out.fields.push({f: 'cccd', v: value.padStart(12, '0'), raw: value, auto: true}); // CCCD bị mất số 0 đầu
    else if (isPlate(value)) out.fields.push({f: 'bien', v: value, raw: value, auto: true});
    else out.terms.push({v: value, raw: m[4] ? '"' + value + '"' : value});
  }
  return out;
}
function viDate(v) { // dd/mm/yyyy hoặc yyyy-mm-dd -> yyyymmdd; 0 nếu không có thật
  const s = String(v || '').trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? D.key(D.fromIso(s)) : D.key(s);
}
function normAdv(o) {
  const warns = [];
  const num = (v, label) => { if (v === '' || v == null) return null; const n = Number(String(v).replace(',', '.')); if (isFinite(n)) return n; warns.push(label + ' “' + v + '” không phải số nên bị bỏ qua.'); return null; };
  const date = (v, label) => { if (v === '' || v == null) return 0; const d = viDate(v); if (!d) warns.push(label + ' “' + v + '” không đúng định dạng ngày (dd/mm/yyyy) nên bị bỏ qua.'); return d; };
  const a = {from: date(o.from, 'Ngày bắt đầu'), to: date(o.to, 'Ngày kết thúc'), minTan: num(o.minTan, 'Khối lượng tối thiểu'), maxTan: num(o.maxTan, 'Khối lượng tối đa'), status: fold(o.status || ''), onlyIssues: !!o.onlyIssues};
  if (a.from && a.to && a.from > a.to) warns.push('Ngày bắt đầu sau ngày kết thúc: không có phiếu cân nào thỏa.');
  if (a.minTan != null && a.maxTan != null && a.minTan > a.maxTan) warns.push('Khối lượng tối thiểu lớn hơn tối đa: không có phiếu cân nào thỏa.');
  Object.defineProperty(a, 'warns', {value: warns, enumerable: false});
  return a;
}
const hasAdv = a => !!(a.from || a.to || a.minTan != null || a.maxTan != null || a.status || a.onlyIssues);

/* Tóm tắt 1 dòng + cờ chất lượng dữ liệu */
function describe(tab, o) {
  const base = summary(tab, o), flags = [];
  if (tab === 'HoSoKeo_QC') {
    const tan = typeof o['Khối lượng (Tấn)'] === 'number' ? o['Khối lượng (Tấn)'] : null, kg = typeof o['KL hàng (KG)'] === 'number' ? o['KL hàng (KG)'] : null;
    base.kg = kg; base.dk = viDate(o['Ngày nhập']);
    base.tanNum = tan > 0 ? tan : kg > 0 ? Math.round(kg) / 1000 : null;
    if (!(base.tanNum > 0)) flags.push('Thiếu khối lượng');
    else if (tan > 0 && kg > 0 && Math.abs(kg / 1000 - tan) > 0.0005) flags.push('Lệch tấn–kg');
    if (!base.dk) flags.push(clean(o['Ngày nhập']) ? 'Ngày cân không có thật' : 'Thiếu ngày cân');
    if (base.bien && !isPlate(base.bien)) flags.push('Biển số là tên xe');
    if (!base.bien) flags.push('Thiếu biển số');
    if (!base.cccd) flags.push('Thiếu CCCD');
  } else if (tab === 'HoSoRung_QC') {
    base.tinhTrang = clean(o['Tình trạng Hợp đồng']);
    if (!/^\d{12}$/.test(base.cccd)) flags.push('CCCD không đủ 12 số');
    if (typeof o['HECTA'] !== 'number') flags.push('Thiếu diện tích');
  } else {
    const la = parseCoord(o['Latitude_Vĩ độ'], 'lat'), lo = parseCoord(o['Longtitude_Kinh độ'], 'lng');
    if (!(la.ok && lo.ok)) flags.push('Tọa độ không dùng được');
    if (!base.maRung) flags.push('Thiếu mã rừng');
  }
  base.flags = flags;
  return base;
}
const wordStart = (h, t) => (' ' + h).includes(' ' + t);
function fieldTexts(tab, d, f) {
  const k = f === 'ten' ? d.ten : f === 'cccd' ? d.cccd : f === 'hd' ? d.hd : f === 'rung' ? d.maRung : f === 'phieu' ? d.phieu : f === 'bien' ? d.bien : f === 'dc' ? d.diaChi : f === 'tinhtrang' ? d.tinhTrang : '';
  return k == null ? null : fold(k);
}
function termScore(d, t) { // điểm cho 1 từ khóa: khớp chính xác trường khóa > bắt đầu > đầu từ > chứa
  let best = 0;
  [['cccd', 5], ['hd', 4], ['maRung', 4], ['phieu', 4], ['bien', 4], ['ten', 3], ['diaChi', 1]].forEach(([k, w]) => {
    const h = fold(d[k] || ''); if (!h) return;
    const exactPlate = k === 'bien' && plateKey(h) === plateKey(t);
    const sc = (h === t || exactPlate) ? 10 : h.startsWith(t) ? 6 : wordStart(h, t) ? 4 : h.includes(t) ? 2 : 0;
    if (sc) best = Math.max(best, sc * w);
  });
  return best;
}

/* Gom các dòng tìm được theo hợp đồng (CCCD + mã hợp đồng) thành "cha"; dòng của 3 tab là các "con" của cha đó. Dòng không đủ khóa tự thành một cha riêng. */
function groupContracts(rows) {
  const m = new Map(), rank = {HoSoRung_QC: 0, ToaDoRung_QC: 1, HoSoKeo_QC: 2};
  rows.forEach(r => {
    const key = r.cccd && r.hd ? r.cccd + '|' + r.hd : r.tab + '#' + r.row;
    let g = m.get(key);
    if (!g) { g = {key, cccd: r.cccd || '', hd: r.hd || '', ten: '', diaChi: '', tinhTrang: '', hecta: null, rungs: [], phieu: 0, tan: 0, flags: 0, matched: {HoSoKeo_QC: 0, HoSoRung_QC: 0, ToaDoRung_QC: 0}, pick: null, score: 0}; m.set(key, g); }
    g.matched[r.tab]++;
    if (!g.ten && r.ten) g.ten = r.ten;
    if (r.tab === 'HoSoRung_QC') { g.tinhTrang = g.tinhTrang || r.tinhTrang || ''; if (g.hecta == null && typeof r.hecta === 'number') g.hecta = r.hecta; if (r.diaChi) g.diaChi = r.diaChi; }
    else if (!g.diaChi && r.diaChi) g.diaChi = r.diaChi;
    if (r.tab === 'ToaDoRung_QC' && r.maRung && !g.rungs.includes(r.maRung)) g.rungs.push(r.maRung);
    if (r.tab === 'HoSoKeo_QC') { g.phieu++; g.tan = Math.round((g.tan + (r.tanNum || 0)) * 1000) / 1000; }
    if (r.flags && r.flags.length) g.flags++;
    if (!g.pick || rank[r.tab] < rank[g.pick.tab]) g.pick = {tab: r.tab, row: r.row};
    if ((r.score || 0) > g.score) g.score = r.score;
  });
  return Array.from(m.values());
}

function runSearch(db, setId, pq, tab, adv, sort, limit, group) {
  const conds = [], args = [setId];
  const esc = t => '%' + t.replace(/[\\%_]/g, m => '\\' + m) + '%';
  pq.terms.forEach(t => { conds.push("search LIKE ? ESCAPE '\\'"); args.push(esc(t.v)); });
  pq.fields.forEach(f => { if (f.f !== 'bien' && f.f !== 'tinhtrang') { conds.push("search LIKE ? ESCAPE '\\'"); args.push(esc(f.v)); } });
  pq.not.forEach(t => { conds.push("search NOT LIKE ? ESCAPE '\\'"); args.push(esc(t)); });
  const needJs = !!group || pq.fields.length || hasAdv(adv) || (sort && sort !== 'relevance') || pq.terms.length || pq.not.length;
  const where = 'set_id=?' + (conds.length ? ' AND ' + conds.join(' AND ') : '');
  const empty = {tab: {}, status: {}, issues: 0};
  // Đường nhanh: không từ khóa, không bộ lọc -> đếm bằng SQL, chỉ đọc số dòng cần hiển thị
  if (!needJs) {
    const facetTab = {}; db.prepare('SELECT tab, COUNT(*) c FROM lookup_rows WHERE set_id=? GROUP BY tab').all(setId).forEach(r => { facetTab[r.tab] = r.c; });
    const total = tab && TABS[tab] ? (facetTab[tab] || 0) : Object.values(facetTab).reduce((x, y) => x + y, 0);
    const rows = limit ? db.prepare('SELECT tab, row_no, data FROM lookup_rows WHERE set_id=?' + (tab && TABS[tab] ? ' AND tab=?' : '') + ' ORDER BY tab, row_no LIMIT ' + limit).all(...(tab && TABS[tab] ? [setId, tab] : [setId]))
      .map(r => ({tab: r.tab, row: r.row_no, ...describe(r.tab, JSON.parse(r.data))})) : [];
    return {rows, total, facets: {tab: facetTab, status: {}, issues: 0}, stats: {phieu: 0, tan: 0}, relax: [], fast: true};
  }
  const raw = db.prepare('SELECT tab, row_no, data FROM lookup_rows WHERE ' + where).all(...args);
  const hits = [];
  for (const r of raw) {
    const d = describe(r.tab, JSON.parse(r.data));
    let score = r.tab === 'HoSoRung_QC' ? 3 : r.tab === 'ToaDoRung_QC' ? 1 : 0, ok = true;
    for (const t of pq.terms) { const sc = termScore(d, t.v); score += sc; }
    for (const f of pq.fields) {
      if (f.f === 'tinhtrang' && r.tab !== 'HoSoRung_QC') { ok = false; break; }
      if ((f.f === 'bien' || f.f === 'phieu') && r.tab !== 'HoSoKeo_QC') { ok = false; break; }
      if (f.f === 'rung' && r.tab === 'HoSoKeo_QC') { ok = false; break; }
      const h = fieldTexts(r.tab, d, f.f);
      if (!h) { ok = false; break; }
      const match = f.f === 'bien' ? plateKey(h).includes(plateKey(f.v)) : h.includes(f.v);
      if (!match) { ok = false; break; }
      score += (h === f.v || (f.f === 'bien' && plateKey(h) === plateKey(f.v))) ? 60 : 30;
    }
    if (!ok) continue;
    // Từ khóa trong SQL đã khớp cột tìm kiếm; từ không khớp trường nào vẫn hợp lệ (ví dụ cột phụ) nên không loại.
    if ((adv.from || adv.to || adv.minTan != null || adv.maxTan != null) && r.tab !== 'HoSoKeo_QC') continue;
    if (r.tab === 'HoSoKeo_QC') {
      if (adv.from && !(d.dk >= adv.from)) continue;
      if (adv.to && !(d.dk && d.dk <= adv.to)) continue;
      if (adv.minTan != null && !(d.tanNum != null && d.tanNum >= adv.minTan)) continue;
      if (adv.maxTan != null && !(d.tanNum != null && d.tanNum <= adv.maxTan)) continue;
    }
    hits.push({tab: r.tab, row: r.row_no, score, ...d});
  }
  const passStatus = h => !adv.status || (h.tab === 'HoSoRung_QC' && fold(h.tinhTrang) === adv.status);
  const passIssue = h => !adv.onlyIssues || h.flags.length > 0;
  const passTab = h => !tab || h.tab === tab;
  const facets = {tab: {}, status: {}, issues: 0};
  hits.forEach(h => {
    if (passStatus(h) && passIssue(h)) facets.tab[h.tab] = (facets.tab[h.tab] || 0) + 1;
    if (passTab(h) && passIssue(h) && h.tab === 'HoSoRung_QC' && h.tinhTrang) facets.status[h.tinhTrang] = (facets.status[h.tinhTrang] || 0) + 1;
    if (passTab(h) && passStatus(h) && h.flags.length) facets.issues++;
  });
  const out = hits.filter(h => passTab(h) && passStatus(h) && passIssue(h));
  const cmp = {
    relevance: (x, y) => y.score - x.score || (x.tab < y.tab ? -1 : x.tab > y.tab ? 1 : 0) || x.row - y.row,
    ngay: (x, y) => (y.dk || 0) - (x.dk || 0) || x.row - y.row,
    tan: (x, y) => (y.tanNum || 0) - (x.tanNum || 0) || x.row - y.row,
    ten: (x, y) => String(x.ten).localeCompare(String(y.ten), 'vi') || x.row - y.row
  }[sort] || null;
  if (cmp) out.sort(cmp);
  const keo = out.filter(h => h.tab === 'HoSoKeo_QC');
  const stats = {phieu: keo.length, tan: Math.round(keo.reduce((s, h) => s + (h.tanNum || 0), 0) * 1000) / 1000};
  const rows = (limit ? out.slice(0, limit) : []).map(h => { const {score, dk, tanNum, ...rest} = h; return {...rest, tanNum, dk, score}; });
  const res = {rows, total: out.length, facets: facets.tab && facets, stats, relax: []};
  if (group === 'contract') { const gs = groupContracts(out); res.groupTotal = gs.length; res.groups = limit ? gs.slice(0, limit) : []; res.rows = []; }
  return res;
}

class Lookup {
  constructor(store) { this.db = store.db; }

  setMeta(k, v) { this.db.prepare('INSERT INTO meta(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').run('lk:' + k, JSON.stringify(v)); }
  getMeta(k) { const r = this.db.prepare('SELECT value FROM meta WHERE key=?').get('lk:' + k); return r ? JSON.parse(r.value) : null; }
  activeSet() { return this.db.prepare('SELECT * FROM lookup_sets WHERE active=1 ORDER BY id DESC LIMIT 1').get() || null; }

  status() {
    const a = this.activeSet();
    return {active: a ? {source: a.source, detail: a.detail, loadedAt: a.loaded_at, counts: JSON.parse(a.counts)} : null, last: this.getMeta('lastAttempt')};
  }

  /* Nạp workbook: chỉ thay bản đang dùng khi đọc + kiểm tra thành công cả 3 tab. Lỗi thì giữ bản cũ. */
  load(buf, source, detail) {
    const at = new Date().toISOString();
    let parsed;
    try { parsed = parseWorkbook(buf); } catch (e) { parsed = {errors: ['Không đọc được file: ' + e.message]}; }
    if (parsed.errors.length) {
      this.setMeta('lastAttempt', {at, source, detail, ok: false, error: parsed.errors.join('; ')});
      return {ok: false, errors: parsed.errors, status: this.status()};
    }
    const counts = {}; TAB_NAMES.forEach(t => { counts[t] = parsed.tabs[t].length; });
    const ins = this.db.prepare('INSERT INTO lookup_rows(set_id,tab,row_no,data,search,k_cccd,k_hd,k_rung,k_phieu) VALUES(?,?,?,?,?,?,?,?,?)');
    this.db.transaction(() => {
      const id = this.db.prepare('INSERT INTO lookup_sets(source,detail,loaded_at,counts,active) VALUES(?,?,?,?,0)').run(source, detail, at, JSON.stringify(counts)).lastInsertRowid;
      TAB_NAMES.forEach(t => parsed.tabs[t].forEach(o => {
        const k = keysOf(t, o);
        const search = fold(TABS[t].search.map(h => o[h]).join(' | ') + ' | ' + k.cccd);
        ins.run(id, t, o._row, JSON.stringify(o), search, k.cccd, k.hd, k.rung, k.phieu);
      }));
      this.db.prepare('DELETE FROM lookup_sets WHERE id<>?').run(id);
      this.db.prepare('UPDATE lookup_sets SET active=1 WHERE id=?').run(id);
    })();
    this.setMeta('lastAttempt', {at, source, detail, ok: true});
    return {ok: true, counts, status: this.status()};
  }

  failAttempt(source, detail, error) {
    this.setMeta('lastAttempt', {at: new Date().toISOString(), source, detail, ok: false, error});
    return {ok: false, errors: [error], status: this.status()};
  }

  rows(where, args) {
    const a = this.activeSet(); if (!a) return [];
    return this.db.prepare('SELECT tab, row_no, data FROM lookup_rows WHERE set_id=? AND ' + where + ' ORDER BY tab, row_no').all(a.id, ...args)
      .map(r => Object.assign(JSON.parse(r.data), {_tab: r.tab, _row: r.row_no}));
  }

  /* Tìm kiếm thông minh.
   * q: từ khóa (không phân biệt dấu). Cú pháp: nhiều từ = phải có đủ; "cụm từ"; -từ loại trừ; trường:giá trị
   *    (cccd: hd: rung: phieu: bien: ten: dc: tinhtrang:); số 12 chữ số tự nhận là CCCD, biển số tự nhận là biển số.
   * opts: {limit, from, to (ngày cân), minTan, maxTan, status (tình trạng hợp đồng), onlyIssues, sort: relevance|ngay|tan|ten}
   * Trả về {rows, total, facets:{tab,status,issues}, stats:{phieu,tan}, relax:[...]}. */
  search(q, tab, opts) {
    if (typeof opts === 'number') opts = {limit: opts};
    opts = opts || {};
    const a = this.activeSet(); if (!a) return {rows: [], total: 0, facets: {tab: {}, status: {}, issues: 0}, stats: {phieu: 0, tan: 0}, relax: []};
    const pq = parseQuery(q);
    const adv = normAdv(opts);
    const res = runSearch(this.db, a.id, pq, tab, adv, opts.sort || 'relevance', +opts.limit > 0 ? +opts.limit | 0 : 300, opts.group);
    res.warns = adv.warns.slice();
    if (!res.total && !opts._noRelax) {
      const parts = [...pq.terms, ...pq.fields.map(f => ({raw: f.raw}))];
      if (parts.length >= 2 || (parts.length === 1 && (pq.not.length || hasAdv(adv) || tab))) {
        const tries = [];
        parts.forEach((p, i) => {
          const rest = parts.filter((_, j) => j !== i).map(x => x.raw).concat(pq.not.map(n => '-' + n)).join(' ');
          const r = runSearch(this.db, a.id, parseQuery(rest), tab, adv, 'relevance', 0);
          if (r.total) tries.push({drop: p.raw, q: rest, total: r.total});
        });
        tries.sort((x, y) => x.total - y.total); // ít kết quả nhất = còn sát ý tìm nhất
        res.relax = tries.slice(0, 3);
        if (!tries.length && (tab || hasAdv(adv))) {
          const r = runSearch(this.db, a.id, pq, '', {}, 'relevance', 0);
          if (r.total) res.relax = [{drop: 'bộ lọc', q, total: r.total, clearFilters: true}];
        }
      }
    }
    return res;
  }

  /* Dựng các kết quả (mỗi kết quả = 1 rừng đề xuất) từ 1 dòng tìm được */
  candidates(tab, row) {
    const hit = this.rows('tab=? AND row_no=?', [tab, row])[0];
    if (!hit) return {ok: false, error: 'Không tìm thấy dòng ' + row + ' của tab ' + tab + ' trong bản tra cứu.'};
    const k = keysOf(tab, hit);
    if (!k.cccd) return {ok: false, error: 'Dòng ' + row + ' (' + tab + ') không có CCCD / mã khách hàng nên không xác định được chủ rừng.'};
    if (!k.hd && tab !== 'ToaDoRung_QC') return {ok: false, error: 'Dòng ' + row + ' (' + tab + ') không có mã hợp đồng.'};
    return {ok: true, hit: {tab, row}, ...this.build(k.cccd, k.hd, tab === 'ToaDoRung_QC' ? k.rung : '')};
  }

  build(cccd, hd, rungHint) {
    const rung = this.rows('tab=? AND k_cccd=? AND k_hd=?', ['HoSoRung_QC', cccd, hd]);
    const toado = this.rows('tab=? AND k_cccd=? AND k_hd=?', ['ToaDoRung_QC', cccd, hd]);
    const keo = this.rows('tab=? AND k_cccd=? AND k_hd=?', ['HoSoKeo_QC', cccd, hd]);
    const sameHdOther = this.db.prepare("SELECT DISTINCT k_cccd FROM lookup_rows WHERE set_id=? AND k_hd=? AND k_cccd<>'' AND k_cccd<>?").all(this.activeSet().id, hd, cccd).map(r => r.k_cccd);
    const others = this.rows('tab=? AND k_cccd=? AND k_hd<>?', ['HoSoRung_QC', cccd, hd]).map(r => ({hd: clean(r['Mã hợp đồng']), diaChi: dedupe(r['ĐỊA CHỈ RỪNG']), hecta: r['HECTA'], tinhTrang: r['Tình trạng Hợp đồng'] || ''}));
    const byRung = {};
    toado.forEach(r => { const m = clean(r['Mã rừng']); (byRung[m] = byRung[m] || []).push(r); });
    const rungCodes = Object.keys(byRung);
    const R = rung[0] || null;
    const warns = [];
    if (rung.length > 1) warns.push('HoSoRung_QC có ' + rung.length + ' dòng cùng CCCD và hợp đồng ' + hd + ': dùng dòng ' + R._row + '.');
    if (sameHdOther.length) warns.push('Số hợp đồng ' + hd + ' cũng được dùng cho ' + sameHdOther.length + ' CCCD khác: chỉ lấy dữ liệu đúng CCCD ' + cccd + '.');
    const owner = ownerOf(cccd, R, toado[0], keo[0]);
    const list = (rungCodes.length ? rungCodes : ['']).map(code => forestOf(code, byRung[code] || [], R, keo, rungCodes.length, hd));
    if (rungHint) list.sort((a, b) => (b.maRung === rungHint) - (a.maRung === rungHint));
    return {cccd, hd, owner, forests: list, others, warns};
  }
}

function dedupe(v) {
  const s = clean(v); if (!s) return '';
  const parts = s.split(/\s*,\s*/); const half = parts.length / 2;
  if (parts.length % 2 === 0 && parts.slice(0, half).join(', ') === parts.slice(half).join(', ')) return parts.slice(0, half).join(', ');
  return [...new Set(parts)].join(', ') === s ? s : (parts.length === 2 && parts[0] === parts[1] ? parts[0] : s);
}
const src = (tab, row, col) => ({tab, row, col});
function summary(tab, o) {
  if (tab === 'HoSoKeo_QC') return {cccd: baseCccd(o['Mã khách hàng']), ten: stripSuffix(o['Họ và tên chủ rừng']), hd: clean(o['Mã hợp đồng']), maRung: '', diaChi: clean(o['ĐỊA CHỈ RỪNG']), phieu: clean(o['SỐ PHIẾU CÂN']), bien: clean(o['Biển số 1']), ngay: o['Ngày nhập'] || '', tan: o['Khối lượng (Tấn)']};
  if (tab === 'HoSoRung_QC') return {cccd: baseCccd(o['Mã KH_CCCD']), ten: stripSuffix(o['Họ và tên chủ rừng']), hd: clean(o['Mã hợp đồng']), maRung: '', diaChi: dedupe(o['ĐỊA CHỈ RỪNG']), hecta: o['HECTA']};
  return {cccd: baseCccd(o['SoCCCD']), ten: stripSuffix(o['HoVaTenChuRung']), hd: clean(o['Số hợp đồng']), maRung: clean(o['Mã rừng']), diaChi: clean(o['DiaChiRungTrong']), gps: clean(o['ID_GPS'])};
}
const field = (key, label, value, s, note) => ({key, label, value, src: s, note: note || ''});

function ownerOf(cccd, R, T, K) {
  const f = [];
  const name = R ? stripSuffix(R['Họ và tên chủ rừng']) : T ? stripSuffix(T['HoVaTenChuRung']) : K ? stripSuffix(K['Họ và tên chủ rừng']) : '';
  const nameSrc = R ? src('HoSoRung_QC', R._row, 'Họ và tên chủ rừng') : T ? src('ToaDoRung_QC', T._row, 'HoVaTenChuRung') : src('HoSoKeo_QC', K._row, 'Họ và tên chủ rừng');
  if (name) f.push(field('ten', 'Họ và tên', name, nameSrc));
  const rawId = R ? baseCccd(R['Mã KH_CCCD']) : T ? baseCccd(T['SoCCCD']) : cccd;
  if (/^\d{12}$/.test(rawId)) f.push(field('cccd', 'CCCD', rawId, R ? src('HoSoRung_QC', R._row, 'Mã KH_CCCD') : src('ToaDoRung_QC', T._row, 'SoCCCD')));
  if (R) {
    if (R['Ngày cấp']) f.push(field('ngayCap', 'Ngày cấp CCCD', R['Ngày cấp'], src('HoSoRung_QC', R._row, 'Ngày cấp')));
    if (clean(R['Mã hợp đồng'])) f.push(field('soHopDong', 'Số hợp đồng', clean(R['Mã hợp đồng']), src('HoSoRung_QC', R._row, 'Mã hợp đồng')));
    if (R['Ngày ký hợp đồng']) f.push(field('ngayKyHopDong', 'Ngày ký hợp đồng', R['Ngày ký hợp đồng'], src('HoSoRung_QC', R._row, 'Ngày ký hợp đồng')));
    if (R['Nơi cấp']) f.push(field('noiCap', 'Nơi cấp CCCD', clean(R['Nơi cấp']), src('HoSoRung_QC', R._row, 'Nơi cấp')));
    if (R['Địa chỉ thường trú']) f.push(field('diaChi', 'Địa chỉ thường trú', clean(R['Địa chỉ thường trú']), src('HoSoRung_QC', R._row, 'Địa chỉ thường trú')));
  } else if (T && T['ThuongTru']) f.push(field('diaChi', 'Địa chỉ thường trú', clean(T['ThuongTru']), src('ToaDoRung_QC', T._row, 'ThuongTru')));
  const ref = [];
  if (R && R['Địa chỉ hiện tại']) ref.push(field('diaChiHienTai', 'Địa chỉ hiện tại', clean(R['Địa chỉ hiện tại']), src('HoSoRung_QC', R._row, 'Địa chỉ hiện tại')));
  if (R && clean(R['SĐT']) && clean(R['SĐT']) !== '0') ref.push(field('sdt', 'SĐT', clean(R['SĐT']), src('HoSoRung_QC', R._row, 'SĐT')));
  return {code: cccd, fields: f, ref};
}

function forestOf(code, T, R, keo, nRung, hd) {
  const f = [], ref = [], warns = [], T0 = T[0];
  if (code) f.push(field('maRung', 'Mã rừng', code, src('ToaDoRung_QC', T0._row, 'Mã rừng')));
  const diaR = R ? dedupe(R['ĐỊA CHỈ RỪNG']) : '';
  if (diaR) f.push(field('diaDiem', 'Địa điểm khai thác (rừng)', diaR, src('HoSoRung_QC', R._row, 'ĐỊA CHỈ RỪNG')));
  else if (T0 && clean(T0['DiaChiRungTrong'])) f.push(field('diaDiem', 'Địa điểm khai thác (rừng)', clean(T0['DiaChiRungTrong']), src('ToaDoRung_QC', T0._row, 'DiaChiRungTrong')));
  // Diện tích: hai nguồn
  const area = [];
  if (R && typeof R['HECTA'] === 'number') area.push({value: R['HECTA'], label: R['HECTA'] + ' ha (HECTA)', src: src('HoSoRung_QC', R._row, 'HECTA')});
  if (T0 && typeof T0['DienTich_m2'] === 'number') {
    const ha = Math.round(T0['DienTich_m2'] / 10000 * 1e6) / 1e6;
    area.push({value: ha, label: ha + ' ha (= ' + T0['DienTich_m2'] + ' m² ÷ 10.000)', src: src('ToaDoRung_QC', T0._row, 'DienTich_m2')});
  }
  const areaConflict = area.length === 2 && Math.abs(area[0].value - area[1].value) > 0.0001;
  if (areaConflict) warns.push('Diện tích khác nhau giữa hai nguồn: ' + area.map(a => a.label).join(' và ') + '. Hãy chọn giá trị đúng.');
  if (nRung > 1 && R && area[0] && area[0].src.tab === 'HoSoRung_QC') warns.push('HECTA trong HoSoRung_QC là của cả hợp đồng ' + hd + ' (' + nRung + ' rừng).');
  if (R && typeof R['Định mức tấn/Ha'] === 'number') f.push(field('dinhMucTanHa', 'Định mức (tấn/ha)', R['Định mức tấn/Ha'], src('HoSoRung_QC', R._row, 'Định mức tấn/Ha')));
  // Điểm GPS
  const gps = T.map(r => {
    const la = parseCoord(r['Latitude_Vĩ độ'], 'lat'), lo = parseCoord(r['Longtitude_Kinh độ'], 'lng');
    const ok = la.ok && lo.ok;
    return {id: clean(r['ID_GPS']) || String(r._row), row: r._row, lat: la.value, lng: lo.value, ok, converted: ok && (la.converted || lo.converted),
      reason: ok ? '' : [la.ok ? '' : 'vĩ độ ' + la.reason, lo.ok ? '' : 'kinh độ ' + lo.reason].filter(Boolean).join('; '),
      raw: clean(r['Latitude_Vĩ độ']) + ', ' + clean(r['Longtitude_Kinh độ']), noi: clean(r['Địa điểm tra GPS'] || '')};
  });
  // Giấy tờ nguồn gốc
  const docs = [], seen = new Set();
  T.forEach(r => {
    const loaiSrc = clean(r['HoSoNguonGoc']), so = clean(r['SoGiayTo']), ngay = r['NgayGiayTo'] || '';
    if (!loaiSrc && !so) return;
    const key = fold(loaiSrc) + '|' + so; if (seen.has(key)) return; seen.add(key);
    docs.push({...mapDoc(loaiSrc), so, ngayCap: ngay, src: src('ToaDoRung_QC', r._row, 'HoSoNguonGoc / SoGiayTo / NgayGiayTo')});
  });
  if (!docs.length && R && clean(R['Pháp lý rừng'])) [...new Set(clean(R['Pháp lý rừng']).split(/\s*,\s*/))].forEach(l => docs.push({...mapDoc(l), so: '', ngayCap: '', src: src('HoSoRung_QC', R._row, 'Pháp lý rừng')}));
  // Thông tin hợp đồng: giữ để đối chiếu
  if (R) {
    [['Mã hợp đồng', 'Mã hợp đồng'], ['Ngày ký hợp đồng', 'Ngày ký hợp đồng'], ['Ngày thanh lý', 'Ngày thanh lý'], ['Mã thanh lý hợp đồng', 'Mã thanh lý hợp đồng'], ['Tình trạng Hợp đồng', 'Tình trạng hợp đồng'],
      ['Định mức quy đổi Tấn/M3', 'Định mức quy đổi tấn/m³'], ['Quy cách đường kính', 'Quy cách đường kính'], ['Quy cách chiều dài', 'Quy cách chiều dài'], ['Phương án khai thác', 'Phương án khai thác'], ['Năm trồng', 'Năm trồng'], ['Tọa độ', 'Tọa độ (HoSoRung_QC)']]
      .forEach(([c, l]) => { const v = R[c]; if (v !== '' && v != null) ref.push(field('hd:' + c, l, v, src('HoSoRung_QC', R._row, c))); });
  } else if (T0) ref.push(field('hd:Số hợp đồng', 'Số hợp đồng', clean(T0['Số hợp đồng']), src('ToaDoRung_QC', T0._row, 'Số hợp đồng')));
  if (T0 && T0['ID_RUNG'] && clean(T0['ID_RUNG']) !== code) ref.push(field('ID_RUNG', 'ID_RUNG (không dùng làm mã rừng)', clean(T0['ID_RUNG']), src('ToaDoRung_QC', T0._row, 'ID_RUNG')));
  // Phiếu cân
  const assignable = nRung <= 1;
  if (!assignable && keo.length) warns.push('Hợp đồng ' + hd + ' có ' + nRung + ' rừng nhưng phiếu cân không ghi mã rừng: phiếu cân không được chọn sẵn, hãy chọn đúng phiếu của rừng này.');
  const phieu = keo.map(r => {
    const tan = typeof r['Khối lượng (Tấn)'] === 'number' ? r['Khối lượng (Tấn)'] : null;
    const kg = typeof r['KL hàng (KG)'] === 'number' ? r['KL hàng (KG)'] : null;
    let kl = null, issue = '';
    if (tan > 0) kl = tan; else if (kg > 0) kl = Math.round(kg) / 1000;
    if (tan > 0 && kg > 0 && Math.abs(kg / 1000 - tan) > 0.0005) issue = 'Khối lượng lệch: ' + tan + ' tấn và ' + kg + ' kg';
    if (!(kl > 0)) issue = issue || 'Không có khối lượng hợp lệ';
    const ngay = D.isValid(r['Ngày nhập']) ? r['Ngày nhập'] : '';
    if (!ngay && !issue) issue = clean(r['Ngày nhập']) ? 'Ngày cân sai: ' + D.why(r['Ngày nhập']) : 'Không có ngày cân (Ngày nhập)';
    const bienRaw = clean(r['Biển số 1'] || r['SỐ XE']);
    return {soPhieu: clean(r['SỐ PHIẾU CÂN']), ngay, bienRaw, isPlate: isPlate(bienRaw), kl, donGia: r['Đơn giá'], thanhToan: r['Thanh toán'], issue, row: r._row, assignable};
  });
  return {maRung: code, fields: f, area, areaConflict, gps, docs, ref, phieu, warns};
}
function mapDoc(l) {
  const f = fold(l);
  if (/quyen su dung dat|qsdd|giay chung nhan/.test(f)) return {loai: 'Giấy chứng nhận QSDĐ', ten: ''};
  if (/xac nhan/.test(f)) return {loai: 'Giấy xác nhận', ten: clean(l)};
  return {loai: 'Khác', ten: clean(l) || 'Khác'};
}

module.exports = {parseQuery, Lookup, MIGRATION, TABS, TAB_NAMES, parseWorkbook, parseCoord, isPlate, plateKey, fold, dedupe};
