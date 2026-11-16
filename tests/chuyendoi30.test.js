'use strict';
/* Chuyển đổi 3.0 (src/lienket.js, SQLite v15): ID dòng, chấm công theo ID thành viên, liên kết danh mục khi khớp duy nhất, Cần đối chiếu, lô khóa không đổi. */
const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('fs'), os = require('os'), path = require('path');
const LK = require('../src/lienket'), CC = require('../src/chamcong'), M = require('../src/model'), V = require('../src/vongdoi');
const {Store, MIGRATIONS} = require('../src/store');
const {bo30} = require('./_bo30');
const clone = x => JSON.parse(JSON.stringify(x));
const nv = (ten, cccd, vaiTro, doi, chucDanh) => ({ten, cccd, vaiTro: vaiTro || 'Công nhân', doi: doi || '', chucDanh: chucDanh || 'Công nhân cưa'});
const lo = o => M.ensureForest(Object.assign({id: 'f1', info: {maRung: 'R-1', moHinhKy: 'giaokhoan'}, nc: [nv('TRẦN TỔ', '049000000001', 'Tổ trưởng', 'A', 'Tổ trưởng'), nv('LÊ CƯA', '049000000002', 'Công nhân', 'A')],
  dx: [{bienSo: '92C-123.45', chuXe: 'CHỦ XE', cccd: '049000000077', taiXe: 'TÀI XẾ', cccdTx: '049000000078', nguoiKy: 'Chủ xe'}],
  pc: [{soPhieu: 'P1', ngay: '01/11/2026', bienSo: '92c 12345', kl: 10}, {soPhieu: 'P2', ngay: '02/11/2026', bienSo: '', kl: 5}],
  cc: {'2026-11': {'049000000002': {1: 1, 2: 1}}}}, o || {}));

test('chuanLo: ID dòng tất định, chạy lại không đổi; chấm công đổi sang ID thành viên; bản in đọc đúng số công', () => {
  const f = lo(); const a = LK.chuanLo(f);
  assert.ok(a > 0); assert.deepEqual(f.nc.map(r => r.id), ['tv1', 'tv2']); assert.deepEqual(f.dx.map(r => r.id), ['xr1']); assert.deepEqual(f.pc.map(r => r.id), ['pc1', 'pc2']);
  assert.deepEqual(Object.keys(f.cc['2026-11']), ['tv2']); assert.equal(CC.total(f.cc, CC.personKey(f.nc[1])), 2);
  const g = clone(f); assert.equal(LK.chuanLo(g), 0); assert.deepEqual(g, f); assert.equal(LK.canChuan(f), false);
  const h = lo(); LK.chuanLo(h); assert.deepEqual(h, f, 'tất định: cùng dữ liệu cùng ID');
});
test('chuanLo: một người ở hai đội (hai dòng cùng CCCD) → chấm công cũ chép cho cả hai dòng (bản in không đổi) và vào Cần đối chiếu; không khớp ai → giữ, Cần đối chiếu', () => {
  const f = lo({nc: [nv('TRẦN TỔ', '049000000001', 'Tổ trưởng', 'A'), nv('LÊ CƯA', '049000000002', 'Công nhân', 'A'), nv('LÊ CƯA', '049000000002', 'Công nhân', 'A')], cc: {'2026-11': {'049000000002': {1: 1}, 'AI ĐÓ': {3: 1}}}});
  LK.chuanLo(f);
  assert.deepEqual(Object.keys(f.cc['2026-11']).sort(), ['AI ĐÓ', 'tv2', 'tv3']);
  assert.equal(CC.total(f.cc, 'tv2'), 1); assert.equal(CC.total(f.cc, 'tv3'), 1);
  assert.equal(f.canDoiChieu.length, 2); assert.match(f.canDoiChieu.map(x => x.lyDo).join('|'), /tính cho cả 2 dòng.*không khớp người nào|không khớp người nào.*tính cho cả 2/);
});
test('chuanLo: lô đã chốt / đã dừng không bị sửa', () => {
  const f = lo(); V.chot(f, 'KT', 't', []); const truoc = JSON.stringify(f); assert.equal(LK.chuanLo(f), 0); assert.equal(JSON.stringify(f), truoc); assert.equal(LK.canChuan(f), false);
  assert.ok(LK.chuanLo(clone(f), {batKe: true}) > 0, 'chỉ để so sánh khi kiểm khóa');
});

const dbCu = () => ({dmLaoDong: [{ngayCapNhat: '01/01/2026', cccd: '049000000001', ten: 'TRẦN TỔ', chucVu: 'Tổ trưởng', viTri: 'Tổ trưởng'}, {ngayCapNhat: '01/01/2026', cccd: '049000000002', ten: 'LÊ CƯA', viTri: 'Công nhân cưa'}],
  dmXeVC: [{ngayCapNhat: '01/01/2026', bienSo: '92C-123.45', chuXe: 'CHỦ XE', cccd: '049000000077', taiXe: 'TÀI XẾ', cccdTx: '049000000078', gplx: '79'}],
  dmDoiTac: [{id: 'dn:dv1', loai: 'doanhnghiep', ten: 'CÔNG TY VT A', mst: '0401234567', daiDien: 'ÔNG B', chucVu: 'GĐ'}],
  dinhBien: [{chucDanh: 'Tổ trưởng', soNguoi: 1}, {chucDanh: 'Công nhân cưa', soNguoi: 2}]});
test('chuyenDoi: dựng danh mục đối tượng / xe / vị trí; nối nhân công, xe, tài xế, bên ký, phiếu → hợp đồng + xe khi khớp duy nhất; còn lại Cần đối chiếu', () => {
  const db = Object.assign(dbCu(), {rs: {o: {forests: {f1: lo()}}}}), bao = LK.chuyenDoi(db);
  assert.ok(LK.daChuyen(db)); assert.equal(bao.doiTuong.phapNhan, 1); assert.equal(bao.xe, 1);
  const f = db.rs.o.forests.f1, A = n => db.dmDoiTuong.flatMap(o => o.nguoi).find(p => p.cccd === n);
  assert.equal(f.nc[0].nguoiId, A('049000000001').id); assert.ok(f.nc[1].viTriId); assert.equal(f.dx[0].xeId, db.dmXe[0].id); assert.equal(f.dx[0].taiXeId, A('049000000078').id);
  assert.deepEqual(f.hdvc[0].benKy, {doiTuongId: db.dmDoiTuong.find(o => o.nguoi.some(p => p.cccd === '049000000077')).id, nguoiId: A('049000000077').id});
  assert.equal(f.doi[0].benNhanKhoan.nguoiId, A('049000000001').id);
  assert.deepEqual([f.pc[0].hdvcId, f.pc[0].xeRowId], [f.hdvc[0].id, 'xr1'], 'BKS khác cách viết vẫn khớp đúng một xe');
  assert.ok(!f.pc[1].hdvcId); assert.ok(f.canDoiChieu.some(c => c.loai === 'phieu' && /chưa có BKS/.test(c.lyDo)));
  assert.equal(f.pc[1].bienSo, '', 'dữ liệu gốc giữ nguyên');
  const lan2 = JSON.stringify(db); LK.chuyenDoi(db); assert.equal(JSON.stringify(db), lan2, 'chạy lại không đổi');
});
test('chuyenDoi: hợp đồng vận chuyển ký với doanh nghiệp cũ (donViId) nối sang pháp nhân; lô đã chốt không đổi', () => {
  const f = lo({hdvc: undefined}); f.hdvc[0].donViId = 'dv1'; f.hdvc[0].ben = {ten: 'CÔNG TY VT A'};
  const g = lo({id: 'f2'}); V.chot(g, 'KT', 't', []);
  const db = Object.assign(dbCu(), {rs: {o: {forests: {f1: f, f2: g}}}}), gTruoc = JSON.stringify(g); LK.chuyenDoi(db);
  assert.equal(db.rs.o.forests.f1.hdvc[0].benKy.doiTuongId, db.dmDoiTuong.find(o => o.loai === 'phapnhan').id);
  assert.equal(JSON.stringify(db.rs.o.forests.f2), gTruoc);
});

test('SQLite v15: sao lưu trước; dựng danh mục mới; lô chưa khóa có ID + liên kết, dữ liệu in không đổi; lô khóa giữ nguyên từng byte; chạy lại không đổi', () => {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'hakqn-v15-')), file = path.join(d, 'x.sqlite');
  const s14 = new Store(file, {migrations: MIGRATIONS.slice(0, 14)});
  const g = lo({id: 'f2', info: {maRung: 'R-2'}}); V.chot(g, 'KT', 't', []);
  s14.save(Object.assign(dbCu(), {v: 2, rs: {o: {id: 'o', info: {ten: 'CHỦ', ma: 'C', cccd: '049067005459'}, forests: {f1: lo(), f2: g}}}}));
  // mốc: dữ liệu như bản 2.3.0 lưu (Store mới đã gán ID khi lưu: gỡ ra để có dạng cũ)
  const raw = new (require('better-sqlite3'))(file); const gRow = raw.prepare("SELECT data, hash FROM forests WHERE id='f2'").get(); raw.close();
  const truoc = bo30(s14.load()); s14.close();
  const s = new Store(file);
  assert.equal(s.db.pragma('user_version', {simple: true}), 15);
  assert.ok(fs.readdirSync(path.join(d, 'backups')).some(n => /truoc-nang-cap-v14-len-v15/.test(n)), 'sao lưu trước khi chuyển đổi');
  const db = s.load();
  assert.ok(db.dmDoiTuong.length >= 4 && db.dmXe.length === 1 && db.dmViTri.length >= 2);
  assert.deepEqual(bo30(db).rs, truoc.rs, 'phần dữ liệu dùng để in không đổi');
  assert.ok(db.rs.o.forests.f1.nc.every(r => r.id && r.nguoiId));
  const g2 = s.db.prepare("SELECT data, hash FROM forests WHERE id='f2'").get(); assert.deepEqual(g2, gRow, 'lô đã chốt giữ nguyên từng byte');
  assert.equal(V.kiemToanVen(db.rs.o.forests.f2, null, s.kiemGoi('f2')).ma, 'nguyen-ven');
  const ds = JSON.stringify(s.load()); MIGRATIONS[14](s.db); assert.equal(JSON.stringify(s.load()), ds, 'chạy lại v15 không đổi');
  assert.equal(s.save(s.load()).changed, 0, 'lưu ngay sau đó không ghi gì');
  s.close();
});
test('mở khóa lô chốt từ bản cũ (chưa có ID) rồi lưu: không bị chặn LOCKED; thao tác vòng đời khi còn khóa vẫn ghi được', () => {
  const s = new Store(':memory:'), f = lo(); V.chot(f, 'KT', 't', []);
  s.save({v: 2, rs: {o: {id: 'o', info: {ten: 'C'}, forests: {f1: f}}}});
  let d = s.load(); V.luuTru(d.rs.o.forests.f1, 't2'); s.save(d); assert.ok(s.load().rs.o.forests.f1.luuTru);
  d = s.load(); V.moKhoa(d.rs.o.forests.f1, 'sửa', 'KT', 't3'); s.save(d);
  d = s.load(); assert.equal(d.rs.o.forests.f1.nc[0].id, 'tv1'); d.rs.o.forests.f1.pc[0].kl = 11; s.save(d); assert.equal(s.load().rs.o.forests.f1.pc[0].kl, 11);
});
