'use strict';
/* Hồi quy bốn lỗi (mốc tái hiện 2d2b3e2): STT văn bản đã cấp, ngày phiếu cân trùng giữa hai lô, ô Số người trống khác 0, chọn phiên bản định mức bằng ngày lịch hợp lệ. */
const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('fs'), os = require('os'), path = require('path');
const SV = require('../src/sovb'), C = require('../src/cheolo'), B = require('../src/dinhbien'), DM = require('../src/dinhmuc'), M = require('../src/model'), LR = require('../src/lorung');
const {Store, MIGRATIONS} = require('../src/store');

/* ---------- 1. STT văn bản đã cấp không được cấp lại ---------- */
const lo = () => ({id: 'f', info: {maRung: 'QS-07', tuNgay: '05/10/2026'}, exp: {ngayKy: '02/10/2026'}, doi: [{id: 'd1', ten: 'Đội 1', exp: {}}, {id: 'd2', ten: 'Đội 2', exp: {}}], hdvc: [{id: 'h1', ten: 'Xe 1', exp: {}}, {id: 'h2', ten: 'Xe 2', exp: {}}]});
const stt = (f, id, truong) => SV.deXuat(f).find(x => x.id === id && x.truong === truong).stt;
test('1a. cấp 01, 02 → xóa đội 01 → đội mới nhận 03 (đội khai thác); đội 02 giữ số; lịch sử lưu theo nhóm', () => {
  const f = lo(); SV.dien(f); assert.deepEqual([f.doi[0].stt, f.doi[1].stt, f.sttDaCap.doi.join()], [1, 2, '1,2']);
  const so2 = f.doi[1].exp.soKT; f.doi.shift(); f.doi.push({id: 'd3', ten: 'Đội mới', exp: {}});
  assert.equal(stt(f, 'd3', 'soKT'), 3, 'đội mới nhận 03, không nhận lại 01'); assert.equal(SV.deXuat(f).find(x => x.id === 'd3' && x.truong === 'soKT').deXuat, '03/2026/HĐGK-QS07');
  SV.dien(f); assert.equal(f.doi[1].exp.soKT, '03/2026/HĐGK-QS07'); assert.equal(f.doi[0].exp.soKT, so2, 'đội 02 giữ nguyên số'); assert.equal(f.doi[0].stt, 2);
});
test('1b. xem trước và xác nhận điền dùng CÙNG cách tính; chỉ điền ô trống, giữ số người dùng nhập và số đã in', () => {
  const f = lo(); f.doi[0].exp.soKT = 'TAY-15'; f.doi[1].exp.uqSo = 'UQ-DA-IN'; const xem = SV.deXuat(f).filter(x => x.deXuat).map(x => x.id + '|' + x.truong + '|' + x.deXuat).sort();
  SV.dien(f); const dien = []; [['doi', f.doi], ['doiXe', f.hdvc]].forEach(([, ds]) => ds.forEach(d => Object.entries(d.exp).forEach(([k, v]) => { if (!/^(TAY-15|UQ-DA-IN)$/.test(v)) dien.push(d.id + '|' + k + '|' + v); })));
  assert.deepEqual(dien.sort(), xem, 'số điền đúng bằng số xem trước'); assert.equal(f.doi[0].exp.soKT, 'TAY-15'); assert.equal(f.doi[1].exp.uqSo, 'UQ-DA-IN');
});
test('1c. đội xe: cùng quy tắc theo nhóm riêng (doiXe), không lẫn với đội khai thác', () => {
  const f = lo(); SV.dien(f); assert.equal(f.sttDaCap.doiXe.join(), '1,2'); f.hdvc.shift(); f.hdvc.push({id: 'h3', ten: 'Xe mới', exp: {}});
  assert.equal(stt(f, 'h3', 'soVC'), 3); assert.equal(stt(f, 'd1', 'soKT'), 1, 'nhóm đội khai thác không bị ảnh hưởng');
});
test('1d. model.removeTeam / removeHd giữ lịch sử STT của đội bị xóa', () => {
  const f = M.ensureForest({id: 'f', info: {maRung: 'A', tuNgay: '01/10/2026'}, nc: [], dx: [], pc: [], exp: {}}); const a = M.addTeam(f, 'Đội 2'); assert.ok(a.id || a.f);
  const g = a.f || f; g.doi[0].stt = 1; g.doi[1].stt = 2; const r = M.removeTeam(g, g.doi[0].id); assert.ok(r.ok, JSON.stringify(r)); assert.deepEqual(r.f.sttDaCap.doi, [1]);
  const h = M.addHd(r.f, 'Xe A'); const g2 = h.f; g2.hdvc[0].stt = 4; const r2 = M.removeHd(g2, g2.hdvc[0].id); assert.ok(r2.ok); assert.deepEqual(r2.f.sttDaCap.doiXe, [4]);
});
test('1e. dữ liệu cũ (chưa có sttDaCap): khởi tạo từ STT đang lưu và số văn bản đọc được; không đánh lại số cũ; nêu giới hạn', () => {
  const f = lo(); f.doi[0].exp.soKT = '02/2026/HĐGK-QS07'; f.doi[1].stt = 5; const truoc = JSON.stringify(f.doi);
  assert.equal(SV.khoiTaoLichSu(f), true); assert.deepEqual(f.sttDaCap.doi, [2, 5]); assert.equal(JSON.stringify(f.doi), truoc, 'không đổi số đã có'); assert.equal(SV.khoiTaoLichSu(f), false, 'chạy lại không đổi');
  assert.equal(SV.capStt(f, 'doi', [{id: 'x'}])[0], 1, 'giới hạn: STT 01 không có bằng chứng đã cấp nên có thể cấp (cảnh báo trùng lo phần còn lại)');
  const trung = lo(); trung.doi[0].exp.soKT = trung.doi[1].exp.soKT = '01/2026/HĐGK-QS07'; assert.equal(SV.trungTrongLo(trung).length, 1, 'số trùng trong lô được cảnh báo');
});
test('1f. SQLite v9: nâng cấp khởi tạo lịch sử từ số đang có; đóng mở lại vẫn còn; thêm đội mới sau đó nhận số chưa dùng', () => {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'hakqn-v9-')), file = path.join(d, 'x.sqlite'), f = lo(); f.doi[0].exp.soKT = '01/2026/HĐGK-QS07'; f.doi[1].exp.soKT = '02/2026/HĐGK-QS07';
  const s8 = new Store(file, {migrations: MIGRATIONS.slice(0, 8)}); s8.save({v: 2, rs: {o: {id: 'o', info: {ten: 'CHỦ', ma: 'C', cccd: '049067005459'}, forests: {f}}}}); s8.close();
  let s9 = new Store(file); let g = s9.load().rs.o.forests.f; assert.ok(MIGRATIONS.length >= 9); assert.deepEqual(g.sttDaCap.doi, [1, 2]); s9.close();
  s9 = new Store(file); g = s9.load().rs.o.forests.f; g.doi.shift(); g.doi.push({id: 'dm', ten: 'Mới', exp: {}}); assert.equal(stt(g, 'dm', 'soKT'), 3, 'sau khi mở lại, đội mới nhận 03'); s9.close();
});
test('1g. sao lưu rồi khôi phục lô: lịch sử STT đi theo', () => {
  const f = lo(); SV.dien(f); f.doi.shift(); const db = {rs: {o: {id: 'o', info: {ten: 'CHỦ', ma: 'C', cccd: '049067005459'}, forests: {f}}}};
  const pkg = LR.exportLot(db, 'o', 'f', {}); const kq = LR.applyLot({rs: {}}, JSON.parse(JSON.stringify(pkg)), 'thay'); const g = kq.next.rs[kq.ownerId].forests[kq.forestId];
  assert.deepEqual(g.sttDaCap.doi, [1, 2]); g.doi.push({id: 'dm', ten: 'Mới', exp: {}}); assert.equal(stt(g, 'dm', 'soKT'), 3);
});

/* ---------- 2. phiếu cân trùng: so ngày lịch, không so chuỗi ---------- */
const lp = (id, ngay, bien, so) => ({id, info: {maRung: id.toUpperCase(), tuNgay: '01/10/2026', denNgay: '30/11/2026'}, pc: [{soPhieu: so || 'P1', ngay, bienSo: bien, kl: 5, _row: 2}], nc: []});
const dbp = (a, b) => ({rs: {o: {id: 'o', forests: {a, b}}}});
const trung = (a, b) => C.kiemTra(dbp(a, b), 'o', 'b').filter(x => x.nhom === 'Chéo lô: phiếu cân trùng');
test('2a. “1/11/2026” và “01/11/2026” là cùng một ngày: phát hiện trùng, báo số phiếu và mã lô, không đổi dữ liệu gốc', () => {
  const a = lp('a', '1/11/2026', '92C-123.45'), b = lp('b', '01/11/2026', '92c12345'), truoc = JSON.stringify([a, b]);
  const r = trung(a, b); assert.equal(r.length, 1); assert.equal(r[0].kind, 'chan'); assert.match(r[0].text, /phiếu P1/); assert.match(r[0].text, /lô A/); assert.equal(JSON.stringify([a, b]), truoc, 'dữ liệu gốc không đổi');
  assert.equal(C.phieuTrung(dbp(a, b), 'o', 'b').length, 1, 'cổng xuất dùng cùng hàm'); assert.equal(trung(lp('a', '01/11/2026', '92C-1', ' p1 '), lp('b', '1/11/2026', '92c1', 'P1')).length, 1, 'số phiếu bỏ khoảng trắng và hoa thường');
});
test('2b. khác ngày, khác biển số: không trùng; ngày không có thật không làm căn cứ kết luận cùng chuyến', () => {
  assert.equal(trung(lp('a', '1/11/2026', '92C-1'), lp('b', '2/11/2026', '92C-1')).length, 0); assert.equal(trung(lp('a', '1/11/2026', '92C-1'), lp('b', '1/11/2026', '92C-2')).length, 0);
  assert.equal(trung(lp('a', '31/11/2026', '92C-1'), lp('b', '31/11/2026', '92C-1')).length, 0, 'ngày 31/11 không có thật: không dùng làm căn cứ');
  assert.equal(trung(lp('a', '', '92C-1'), lp('b', '', '92C-1')).length, 0, 'ngày thiếu'); assert.equal(trung(lp('a', '29/02/2027', '92C-1'), lp('b', '29/02/2027', '92C-1')).length, 0, '29/02 năm thường'); assert.equal(trung(lp('a', '29/02/2028', '92C-1'), lp('b', '29/02/2028', '92C-1')).length, 1, '29/02 năm nhuận');
});

/* ---------- 3. ô Số người trống khác số 0 ---------- */
const rows = n => [{chucDanh: 'Tổ trưởng', soNguoi: 1, kiemNhiem: '', nhiemVu: 'Điều hành'}, {chucDanh: 'Công nhân cưa', soNguoi: n, kiemNhiem: '', nhiemVu: n === 0 || n === '0' ? '' : 'Cưa'}];
test('3a. trống, khoảng trắng, null: báo số dòng và tên vị trí, không coi là 0', () => {
  [['', ''], ['  ', ' '], [null, ''], [undefined, '']].forEach(([v]) => { const r = B.check(rows(v)); assert.equal(r.ok, false); assert.match(r.error, /Dòng 2/); assert.match(r.error, /Công nhân cưa/); assert.match(r.error, /chưa nhập số người/); });
});
test('3b. số 0 (số và chuỗi “0”) do người dùng nhập là hợp lệ; số dương hợp lệ; âm, lẻ, vượt giới hạn, chữ bị chặn', () => {
  [0, '0'].forEach(v => { const r = B.check(rows(v)); assert.ok(r.ok, JSON.stringify(r)); assert.equal(r.rows[1].soNguoi, 0); });
  [3, '3', '50'].forEach(v => assert.ok(B.check(rows(v)).ok)); [-1, '-1', 1.5, '1,5', 51, '51', 'abc'].forEach(v => assert.equal(B.check(rows(v)).ok, false, String(v)));
  assert.equal(B.check([{chucDanh: 'Tổ trưởng', soNguoi: 1, nhiemVu: 'x'}, {chucDanh: 'Cưa', soNguoi: 2, nhiemVu: ''}]).ok, false, 'vẫn cần nhiệm vụ khi có người');
});
test('3c. lưu định mức gốc và phiên bản có ngày: ô trống bị từ chối, giữ nguyên định mức đã lưu', () => {
  const db = {}; assert.ok(B.set(db, rows(2), DM).ok); const goc = JSON.stringify(db.dinhBien); assert.equal(B.set(db, rows(''), DM).ok, false); assert.equal(JSON.stringify(db.dinhBien), goc, 'bản gốc đã lưu không đổi');
  const a = B.addVersion(db, '01/12/2026'); assert.ok(a.ok); const ver = JSON.stringify(db.dinhBienVer); assert.equal(B.setVersion(db, a.id, rows(' '), DM).ok, false); assert.equal(JSON.stringify(db.dinhBienVer), ver, 'phiên bản đã lưu không đổi');
  assert.ok(B.setVersion(db, a.id, rows(0), DM).ok, 'số 0 chủ động nhập được lưu vào phiên bản'); assert.equal(db.dinhBienVer[0].rows[1].soNguoi, 0);
});

/* ---------- 4. chọn phiên bản bằng ngày lịch hợp lệ ---------- */
const mkv = () => { const db = {}; B.addVersion(db, '01/12/2026'); return db; };
test('4a. 30/11 → bản gốc; 01/12 (đúng ngày hiệu lực) → phiên bản mới; 31/11 không có thật → báo lỗi, không chọn bản nào', () => {
  const db = mkv(), truoc = JSON.stringify(db);
  assert.equal(B.get(db, '30/11/2026').id, 'goc'); assert.equal(B.get(db, '01/12/2026').id, '01/12/2026'); assert.equal(B.get(db, '1/12/2026').id, '01/12/2026', 'ngày viết 1 chữ số');
  const g = B.get(db, '31/11/2026'); assert.equal(g.id, ''); assert.match(g.ngayLoi, /31\/11\/2026/); assert.deepEqual(g.rows, []); assert.equal(JSON.stringify(db), truoc, 'không ghi lại định mức');
});
test('4b. ngày trống → bản mới nhất; chỉ có bản gốc thì ngày sai không đổi gì (hồ sơ cũ)', () => {
  const db = mkv(); assert.equal(B.get(db, '').id, '01/12/2026'); assert.equal(B.get(db, '   ').id, '01/12/2026'); assert.equal(B.get(db).id, '01/12/2026');
  const goc = {}; assert.equal(B.get(goc, '31/11/2026').id, 'goc'); assert.equal(B.get(goc, '31/11/2026').ngayLoi, undefined);
});
test('4c. 29/02 năm nhuận có thật, năm thường không; thêm phiên bản chỉ nhận ngày có thật', () => {
  const db = {}; assert.ok(B.addVersion(db, '29/02/2028').ok); assert.equal(B.addVersion(db, '29/02/2027').ok, false); assert.equal(B.addVersion(db, '31/11/2026').ok, false);
  assert.equal(B.get(db, '29/02/2028').id, '29/02/2028'); assert.equal(B.get(db, '28/02/2028').id, 'goc'); assert.match(B.get(db, '29/02/2027').ngayLoi, /29\/02\/2027/);
});
test('4d. lô bị ảnh hưởng: ngày sai tách riêng (không tính vào bản nào), ngày trống tính vào bản mới nhất', () => {
  const db = mkv(), lots = [{maRung: 'A', tuNgay: '30/11/2026'}, {maRung: 'B', tuNgay: '01/12/2026'}, {maRung: 'C', tuNgay: '31/11/2026'}, {maRung: 'D', tuNgay: ''}];
  assert.deepEqual(B.anhHuong(db, 'goc', lots).map(l => l.maRung), ['A']); assert.deepEqual(B.anhHuong(db, '01/12/2026', lots).map(l => l.maRung), ['B', 'D']);
  const ct = B.anhHuongChiTiet(db, '01/12/2026', lots); assert.deepEqual(ct.ngayLoi.map(l => l.maRung), ['C']); assert.equal(B.anhHuongChiTiet(db, 'goc', lots).ngayLoi.length, 1);
});
