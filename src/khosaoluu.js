'use strict';
/* KHO SAO LƯU: liệt kê, kiểm tra, khôi phục và dọn các bản sao lưu trong thư mục sao lưu (và thư mục sao lưu thứ hai). Không phụ thuộc Electron để kiểm thử được bằng Node.
 *
 * Các loại bản sao lưu phần mềm tạo ra (nhận theo TÊN FILE; file tên khác không được liệt kê, không bao giờ bị xóa):
 *   tu-dong-YYYY-MM-DD.sqlite            tự sao lưu hằng ngày (src/autobackup.js)
 *   HoSoKhaiThac_SaoLuu_*.sqlite|.json   sao lưu toàn bộ do người dùng bấm (src/backup.js)
 *   truoc-nang-cap-*.sqlite              trước khi nâng cấp cấu trúc dữ liệu
 *   truoc-khoi-phuc-*.sqlite             trước khi khôi phục toàn bộ
 *   truoc-khoi-phuc-lo-*.sqlite          trước khi khôi phục một lô
 *   truoc-xoa-*.sqlite                   trước lần lưu có xóa chủ rừng / lô
 *   truoc-cap-nhat-sheets-*.sqlite       trước lần lưu đầu tiên sau khi áp dữ liệu từ Google Sheets (PR D bước 2)
 *
 * KHÔI PHỤC TỪ BẢN .sqlite (khoiPhuc): KHÔNG chép đè file cơ sở dữ liệu đang dùng. Bản sao lưu được chép ra thư mục tạm, mở bằng Store (bản cấu trúc cũ được nâng cấp
 * TRÊN BẢN CHÉP, file sao lưu gốc không bị đụng), đọc thành dữ liệu hồ sơ rồi đi qua đúng đường "Khôi phục toàn bộ → thay toàn bộ" (Store.applyImport 'replace'):
 * kiểm toàn vẹn hồ sơ đã chốt, sao lưu file hiện tại (truoc-khoi-phuc-…) rồi ghi trong MỘT giao dịch. Lỗi ở bước nào dữ liệu đang dùng cũng còn nguyên.
 * Bản chụp của các lần chốt trước (bảng chot_goi) trong bản sao lưu được chép thêm cho các lô còn tồn tại, trong cùng giao dịch đó. Bản tra cứu Google Sheets của máy giữ nguyên. */
const fs = require('fs'), path = require('path'), os = require('os');
const DM = require('./datamove');

const LOAI = [
  {ma: 'tudong', ten: 'Tự động hằng ngày', re: /^tu-dong-\d{4}-\d{2}-\d{2}\.sqlite$/},
  {ma: 'tudong2gio', ten: 'Tự động mỗi 2 giờ', re: /^tu-dong-\d{4}-\d{2}-\d{2}-\d{2}00\.sqlite$/},   // phiếu #13a
  {ma: 'tudongtuan', ten: 'Tự động hằng tuần', re: /^tu-dong-tuan-\d{4}-W\d{2}\.sqlite$/},
  {ma: 'nhapngoai', ten: 'Nhập từ ngoài (USB, máy khác)', re: /^nhap-ngoai-[\w-]+\.sqlite$/},
  {ma: 'toanbo', ten: 'Sao lưu toàn bộ', re: /^HoSoKhaiThac_SaoLuu_[\w-]+\.(sqlite|json)$/},
  {ma: 'nangcap', ten: 'Trước khi nâng cấp', re: /^truoc-nang-cap-[\w-]+\.sqlite$/},
  {ma: 'khoiphuclo', ten: 'Trước khi khôi phục lô', re: /^truoc-khoi-phuc-lo-[\w-]+\.sqlite$/},
  {ma: 'khoiphuc', ten: 'Trước khi khôi phục', re: /^truoc-khoi-phuc-[\w-]+\.sqlite$/},
  {ma: 'xoa', ten: 'Trước khi xóa', re: /^truoc-xoa-[\w-]+\.sqlite$/},
  {ma: 'sheets', ten: 'Trước khi lưu dữ liệu từ Google Sheets', re: /^truoc-cap-nhat-sheets-[\w-]+\.sqlite$/}
];
const loaiCua = name => LOAI.find(l => l.re.test(name)) || null;
const cungFile = (a, b) => process.platform === 'win32' ? path.resolve(a).toLowerCase() === path.resolve(b).toLowerCase() : path.resolve(a) === path.resolve(b);

/* Danh sách bản sao lưu trong các thư mục `dirs` (bỏ thư mục trùng / trống / không đọc được), mới nhất trước.
 * Trả {items: [{file, name, dir, loai, tenLoai, dinhDang: 'sqlite' | 'json', size, mtime}], tong: {soBan, bytes}, loi: [{dir, error}]} — không ném lỗi. */
function lietKe(dirs) {
  const items = [], loi = [], seen = [];
  (dirs || []).filter(Boolean).forEach(dir => {
    if (seen.some(d => cungFile(d, dir))) return; seen.push(dir);
    let names; try { names = fs.readdirSync(dir); } catch (e) { if (e.code !== 'ENOENT') loi.push({dir, error: e.message}); return; }
    names.forEach(name => {
      const l = loaiCua(name); if (!l) return;
      let st; try { st = fs.statSync(path.join(dir, name)); } catch (e) { return; }
      if (!st.isFile()) return;
      items.push({file: path.join(dir, name), name, dir, loai: l.ma, tenLoai: l.ten, dinhDang: name.endsWith('.json') ? 'json' : 'sqlite', size: st.size, mtime: st.mtime.toISOString()});
    });
  });
  items.sort((a, b) => a.mtime < b.mtime ? 1 : a.mtime > b.mtime ? -1 : a.name < b.name ? 1 : -1);
  return {items, tong: {soBan: items.length, bytes: items.reduce((s, x) => s + x.size, 0)}, loi};
}
/* Chỉ thao tác trên file ĐANG CÓ trong danh sách (đường dẫn do giao diện gửi lên không được tin): trả mục khớp hoặc ném lỗi */
function timTrongKho(dirs, file) {
  const it = typeof file === 'string' && file ? lietKe(dirs).items.find(x => cungFile(x.file, file)) : null;
  if (!it) throw Object.assign(new Error('Bản sao lưu không còn trong thư mục sao lưu (đã bị xóa hoặc chuyển đi). Hãy tải lại danh sách.'), {code: 'KHONG_CO'});
  return it;
}
const demHoSo = db => { const c = {owners: 0, forests: 0, nc: 0, dx: 0, pc: 0}; Object.values((db && db.rs) || {}).forEach(o => { c.owners++; Object.values((o && o.forests) || {}).forEach(f => { c.forests++; c.nc += (f.nc || []).length; c.dx += (f.dx || []).length; c.pc += (f.pc || []).length; }); }); return c; };

/* Kiểm tra MỘT bản sao lưu có dùng được không (chỉ đọc, không sửa file):
 *  - .sqlite: đúng file SQLite của HAKQN, qua kiểm tra toàn vẹn, phiên bản cấu trúc không mới hơn ứng dụng; kèm số chủ rừng / lô;
 *  - .json:   đọc được, đúng định dạng sao lưu toàn bộ; kèm số chủ rừng / lô / nhân công / xe / phiếu cân.
 * Trả {ok, dinhDang, version?, counts, size, mtime, error}. */
function kiemTra(file, supportedVersion) {
  if (/\.json$/i.test(file)) {
    try {
      const st = fs.statSync(file), o = JSON.parse(fs.readFileSync(file, 'utf8'));
      const k = require('./lorung').kiemSaoLuu(o);   // lô 2 (T-11): cùng quy tắc kiểm cấu trúc/phiên bản với bước khôi phục
      if (!k.ok) return {ok: false, dinhDang: 'json', counts: {}, size: st.size, mtime: st.mtime.toISOString(), error: k.error};
      return {ok: true, dinhDang: 'json', counts: demHoSo(o), size: st.size, mtime: st.mtime.toISOString(), error: ''};
    } catch (e) { return {ok: false, dinhDang: 'json', counts: {}, size: 0, mtime: null, error: e instanceof SyntaxError ? 'File JSON bị hỏng hoặc bị cắt dở, không đọc được nội dung.' : 'Không đọc được file' + (e.code === 'ENOENT' ? ': file không còn ở thư mục sao lưu.' : e.code === 'EACCES' || e.code === 'EPERM' ? ': không có quyền đọc.' : ' (' + (e.code || 'lỗi đọc') + ').')}; }
  }
  const i = DM.inspect(file, supportedVersion, {cleanSidecars: true});
  return {ok: i.ok, dinhDang: 'sqlite', version: i.version, counts: {owners: i.counts.owners || 0, forests: i.counts.forests || 0, companies: i.counts.companies || 0, chotGoi: i.counts.chot_goi || 0}, size: i.size, mtime: i.mtime, error: i.ok ? '' : i.error};
}

/* Đọc dữ liệu hồ sơ từ một bản sao lưu .sqlite mà KHÔNG đụng file gốc: chép ra thư mục tạm, mở bằng Store (tự nâng cấp bản chép nếu cấu trúc cũ), đọc kèm gói đã chốt.
 * Trả {data, goi: [{forest_id, phien_ban, hash, at, data}], version}; luôn dọn thư mục tạm. */
function docBanSqlite(file, o) {
  const {Store} = require('./store');
  const tmpDir = fs.mkdtempSync(path.join((o && o.tmpDir) || os.tmpdir(), 'hakqn-kp-')), tmp = path.join(tmpDir, 'ban-sao.sqlite');
  let s = null;
  try {
    fs.copyFileSync(file, tmp);
    s = new Store(tmp, {backupDir: path.join(tmpDir, 'bk')});
    const data = s.load({kemGoi: true});
    const goi = s._coBangGoi() ? s.db.prepare('SELECT forest_id, phien_ban, hash, at, data FROM chot_goi').all() : [];
    return {data, goi, version: s.db.pragma('user_version', {simple: true})};
  } finally {
    if (s) { try { s.close(); } catch (e) { /* đã đóng */ } }
    try { fs.rmSync(tmpDir, {recursive: true, force: true, maxRetries: 5, retryDelay: 100}); } catch (e) { /* để hệ điều hành dọn thư mục tạm */ }
  }
}

/* Xem trước khi khôi phục từ bản .sqlite: số liệu trong bản sao lưu và đang có trên máy. Không ghi gì. */
function xemTruoc(store, file, supportedVersion) {
  const kt = kiemTra(file, supportedVersion);
  if (!kt.ok) throw Object.assign(new Error('Bản sao lưu không dùng được: ' + kt.error), {code: 'BAN_HONG'});
  const {Store} = require('./store'), b = docBanSqlite(file);
  return {trongBan: Store.counts(b.data), trenMay: Store.counts(store.load()), version: b.version, size: kt.size, mtime: kt.mtime};
}

/* Khôi phục TOÀN BỘ hồ sơ từ bản .sqlite (xem ghi chú đầu file). Trả {backup: file sao lưu trước khi ghi, counts, goiCu: số bản chụp cũ đã chép thêm}. */
function khoiPhuc(store, file, supportedVersion) {
  const kt = kiemTra(file, supportedVersion);
  if (!kt.ok) throw Object.assign(new Error('Bản sao lưu không dùng được: ' + kt.error + ' Dữ liệu trên máy chưa bị thay đổi.'), {code: 'BAN_HONG'});
  if (store.file !== ':memory:' && cungFile(store.file, file)) throw new Error('Đây chính là cơ sở dữ liệu đang dùng, không phải bản sao lưu.');
  const b = docBanSqlite(file);
  /* kiểm toàn vẹn lô đã chốt → sao lưu truoc-khoi-phuc → ghi hồ sơ VÀ lịch sử bản chụp của các lần chốt trước trong MỘT giao dịch (Store.save goiLichSu):
   * lỗi ở bất kỳ bước ghi nào thì hoàn tác tất cả, dữ liệu đang dùng và các bản chụp của nó còn nguyên. */
  const r = store.applyImport(b.data, 'replace', {goiLichSu: b.goi});
  return {backup: r.backup, counts: r.counts, goiCu: r.goiCu};
}

/* Xóa MỘT bản sao lưu trong kho (chỉ file đang có trong danh sách; không bao giờ xóa cơ sở dữ liệu đang dùng) */
function xoa(dirs, file, dbFile) {
  const it = timTrongKho(dirs, file);
  if (dbFile && cungFile(it.file, dbFile)) throw new Error('Không xóa cơ sở dữ liệu đang dùng.');
  fs.unlinkSync(it.file);
  for (const x of ['-wal', '-shm']) { try { fs.unlinkSync(it.file + x); } catch (e) { /* không có */ } }
  return {name: it.name, size: it.size};
}

/* Đọc dữ liệu hồ sơ từ bản sao lưu (.sqlite hoặc .json) */
function docDuLieuBanSao(file, supportedVersion) {
  if (/\.json$/i.test(file)) {
    const kt = kiemTra(file, supportedVersion);
    if (!kt.ok) throw Object.assign(new Error('Bản sao lưu không dùng được: ' + kt.error), {code: 'BAN_HONG'});
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    return {data, goi: Array.isArray(data.goiLichSu) ? data.goiLichSu : []};
  }
  const kt = kiemTra(file, supportedVersion);
  if (!kt.ok) throw Object.assign(new Error('Bản sao lưu không dùng được: ' + kt.error), {code: 'BAN_HONG'});
  return docBanSqlite(file);
}

/* Xem trước chi tiết nội dung danh sách chủ rừng & lô rừng trong bản sao lưu */
function docChiTiet(file, supportedVersion) {
  const {data} = docDuLieuBanSao(file, supportedVersion);
  const owners = Object.entries(data.rs || {}).map(([oid, o]) => {
    const info = o.info || {};
    const forests = Object.entries(o.forests || {}).map(([fid, f]) => {
      const fi = f.info || {};
      const pc = Array.isArray(f.pc) ? f.pc : [];
      const tongKg = pc.reduce((s, p) => s + (Number(p.klKg) || Math.round((Number(p.kl) || 0) * 1000) || 0), 0);
      return {
        id: f.id || fid,
        maRung: fi.maRung || '',
        tenRung: fi.tenRung || '',
        dienTich: fi.dienTich || 0,
        soDoi: (f.doi || []).length,
        soXe: (f.dx || []).length,
        soPhieu: pc.length,
        tongKg,
        trangThai: f.chot ? 'Đã chốt' : f.dung ? 'Đã dừng' : 'Đang làm'
      };
    });
    return {
      id: o.id || oid,
      ma: info.ma || '',
      ten: info.ten || '',
      cccd: info.cccd || '',
      danhXung: info.danhXung || '',
      soRung: forests.length,
      forests
    };
  });
  return {
    file: path.basename(file),
    dinhDang: /\.json$/i.test(file) ? 'json' : 'sqlite',
    soChuRong: owners.length,
    soLoRung: owners.reduce((s, o) => s + o.soRung, 0),
    owners
  };
}

/* Khôi phục trích xuất RIÊNG MỘT chủ rừng từ bản sao lưu (không ảnh hưởng chủ rừng khác) */
function khoiPhucChuRong(store, file, ownerId, strategy = 'overwrite', supportedVersion) {
  const b = docDuLieuBanSao(file, supportedVersion);
  const srcO = b.data.rs && b.data.rs[ownerId];
  if (!srcO) throw Object.assign(new Error('Không tìm thấy chủ rừng "' + ownerId + '" trong bản sao lưu.'), {code: 'KHONG_CO'});
  const usedCtyIds = new Set(Object.values(srcO.forests || {}).map(f => f.info?.muaHang?.congTyId).filter(Boolean));
  const incomingCongTy = {};
  if (b.data.congTy) {
    usedCtyIds.forEach(id => {
      if (b.data.congTy[id]) incomingCongTy[id] = b.data.congTy[id];
    });
  }
  const incoming = {
    v: 2,
    rs: {[ownerId]: srcO},
    goiLichSu: b.goi.filter(g => g && Object.hasOwn(srcO.forests || {}, String(g.forest_id))),
    congTy: incomingCongTy,
    ...(b.data.dmDoiTuong != null && {dmDoiTuong: b.data.dmDoiTuong}),
    ...(b.data.dmXe != null && {dmXe: b.data.dmXe}),
    ...(b.data.dmViTri != null && {dmViTri: b.data.dmViTri})
  };
  const r = store.applyImport(incoming, strategy, {khoiPhucRieng: true, preserveExistingCongTy: true});
  return {...r, ten: srcO.info?.ten || ownerId};
}

/* Khôi phục trích xuất RIÊNG MỘT lô rừng từ bản sao lưu (không ảnh hưởng lô khác) */
function khoiPhucLoRungTuBanSao(store, file, ownerId, forestId, strategy = 'overwrite', supportedVersion) {
  const b = docDuLieuBanSao(file, supportedVersion);
  const srcO = b.data.rs && b.data.rs[ownerId];
  if (!srcO) throw Object.assign(new Error('Không tìm thấy chủ rừng "' + ownerId + '" trong bản sao lưu.'), {code: 'KHONG_CO'});
  const srcF = srcO.forests && srcO.forests[forestId];
  if (!srcF) throw Object.assign(new Error('Không tìm thấy lô rừng "' + forestId + '" trong bản sao lưu.'), {code: 'KHONG_CO'});
  const {forests: _, ...ownerInfoOnly} = srcO;
  const usedCtyId = srcF.info?.muaHang?.congTyId;
  const incomingCongTy = {};
  if (usedCtyId && b.data.congTy && b.data.congTy[usedCtyId]) {
    incomingCongTy[usedCtyId] = b.data.congTy[usedCtyId];
  }
  const incoming = {
    v: 2,
    rs: {
      [ownerId]: {
        ...ownerInfoOnly,
        forests: {[forestId]: srcF}
      }
    },
    goiLichSu: b.goi.filter(g => g && String(g.forest_id) === String(forestId)),
    congTy: incomingCongTy,
    ...(b.data.dmDoiTuong != null && {dmDoiTuong: b.data.dmDoiTuong}),
    ...(b.data.dmXe != null && {dmXe: b.data.dmXe}),
    ...(b.data.dmViTri != null && {dmViTri: b.data.dmViTri})
  };
  const r = store.applyImport(incoming, strategy, {khoiPhucRieng: true, preserveExistingCongTy: true});
  return {...r, maRung: srcF.info?.maRung || forestId};
}

module.exports = {
  LOAI, loaiCua, lietKe, timTrongKho, kiemTra, xemTruoc, khoiPhuc, xoa,
  docBanSqlite, docDuLieuBanSao, docChiTiet, khoiPhucChuRong, khoiPhucLoRungTuBanSao
};
