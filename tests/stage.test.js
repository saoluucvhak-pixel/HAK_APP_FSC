'use strict';
const test = require('node:test'), assert = require('node:assert');
const S = require('../src/stage');

const saved = () => ({
  nc: [{ten: 'TRẦN TỔ TRƯỞNG', cccd: '049085000001', chucDanh: 'Tổ trưởng'}, {ten: 'LÊ CÔNG NHÂN', cccd: '049085000002', chucDanh: 'Công nhân khai thác'}],
  dx: [{bienSo: '92C-123.45', chuXe: 'A'}, {bienSo: '92C-67890', chuXe: 'B'}],
  pc: [{soPhieu: 'P1', bienSo: '92C-12345', ngay: '05/10/2026', kl: 10.5}, {soPhieu: 'P2', bienSo: '92C-12345', ngay: '06/10/2026', kl: 5.25}, {soPhieu: 'P3', bienSo: '92C-67890', ngay: '07/10/2026', kl: 8}]
});
const tong = (st, k = 'kl') => Math.round(st.cur.pc.reduce((a, p) => a + p[k], 0) * 1000) / 1000;

test('bản nháp mới sạch: không dirty, không ghi gì cho đến khi có thay đổi', () => {
  const st = S.create(saved()); assert.strictEqual(S.dirty(st), false); assert.deepStrictEqual(S.dirtyKinds(st), []);
  assert.ok(st.cur.pc.every(r => r._id) && new Set(st.cur.pc.map(r => r._id)).size === 3);
});
test('thêm tay: dòng mới có trạng thái new, các dòng đã lưu giữ nguyên, lô khác không bị ảnh hưởng', () => {
  const a = S.create(saved()), b = S.create(saved()); S.addRow(a, 'nc', {ten: 'PHẠM CƯA', cccd: '049085000003'});
  assert.deepStrictEqual(S.counts(a, 'nc'), {new: 1, changed: 0, same: 2, removed: 0}); assert.ok(S.dirty(a, 'nc')); assert.ok(!S.dirty(a, 'dx')); assert.strictEqual(S.dirty(b), false);
});
test('gộp Excel theo khóa nghiệp vụ: dòng mới thêm, dòng đổi sửa, dòng giống bỏ qua, dòng đã lưu mà file không có được GIỮ', () => {
  const st = S.create(saved());
  const rep = S.merge(st, 'pc', [{soPhieu: 'p1', bienSo: '92C-12345', ngay: '05/10/2026', kl: 10.5}, {soPhieu: 'P2', bienSo: '92C-12345', ngay: '06/10/2026', kl: 6}, {soPhieu: 'P9', bienSo: '92C-12345', ngay: '08/10/2026', kl: 2}], {source: 'Excel: pc.xlsx'});
  assert.deepStrictEqual([rep.add, rep.upd, rep.same, rep.kept], [1, 1, 1, 1]);   // P3 không có trong file: giữ
  assert.strictEqual(st.cur.pc.length, 4); assert.ok(st.cur.pc.some(p => p.soPhieu === 'P3'));
  assert.deepStrictEqual(S.counts(st, 'pc'), {new: 1, changed: 1, same: 2, removed: 0});
  assert.strictEqual(st.cur.pc.find(p => p.soPhieu === 'P2').kl, 6);
});
test('nhập lại cùng nguồn hai lần không tính trùng (idempotent)', () => {
  const st = S.create(saved()), rows = [{soPhieu: 'P9', bienSo: '92C-12345', ngay: '08/10/2026', kl: 2}, {soPhieu: 'P10', bienSo: '92C-12345', ngay: '09/10/2026', kl: 3}];
  S.merge(st, 'pc', rows, {source: 'Excel'}); const n1 = st.cur.pc.length, t1 = tong(st); const rep = S.merge(st, 'pc', rows, {source: 'Excel'});
  assert.strictEqual(st.cur.pc.length, n1); assert.strictEqual(tong(st), t1); assert.deepStrictEqual([rep.add, rep.upd, rep.same], [0, 0, 2]);
});
test('cùng phiếu nhập tay, rồi Excel, rồi bản tra cứu: một dòng duy nhất, tổng không tăng', () => {
  const st = S.create({nc: [], dx: [{bienSo: '92C-12345'}], pc: []});
  S.addRow(st, 'pc', {soPhieu: '1001/2026/NK', bienSo: '92C-12345', ngay: '22/01/2026', kl: 2.84});
  S.merge(st, 'pc', [{soPhieu: '1001/2026/NK', bienSo: '92C-12345', ngay: '22/01/2026', kl: 2.84}], {source: 'Excel'});
  S.merge(st, 'pc', [{soPhieu: '1001/2026/NK', bienSo: '92C-12345', ngay: '22/01/2026', kl: 2.84, gioCan1: '08:15:00', can1: 6840, khachHang: 'NGUYỄN VĂN AN'}], {source: 'Google Sheets', keepBlank: true});
  assert.strictEqual(st.cur.pc.length, 1); assert.strictEqual(tong(st), 2.84); assert.strictEqual(st.cur.pc[0].gioCan1, '08:15:00'); assert.strictEqual(st.cur.pc[0].khachHang, 'NGUYỄN VĂN AN');
});
test('keepBlank: ô trống của bản tra cứu không xóa giá trị đã có', () => {
  const st = S.create({nc: [], dx: [], pc: [{soPhieu: 'P1', bienSo: 'B', ngay: '01/01/2026', kl: 1, donGia: 1250000, khachHang: 'X'}]});
  S.merge(st, 'pc', [{soPhieu: 'P1', bienSo: 'B', ngay: '01/01/2026', kl: 1, donGia: null, khachHang: ''}], {keepBlank: true});
  assert.strictEqual(st.cur.pc[0].donGia, 1250000); assert.strictEqual(st.cur.pc[0].khachHang, 'X'); assert.strictEqual(S.dirty(st), false);
});
test('dòng trùng khóa ngay trong file: cả hai vào bản nháp để bị báo trùng, không tự gộp', () => {
  const st = S.create({nc: [], dx: [], pc: []}), rep = S.merge(st, 'pc', [{soPhieu: 'A1', kl: 1}, {soPhieu: 'a1', kl: 2}]);
  assert.strictEqual(st.cur.pc.length, 2); assert.deepStrictEqual(rep.dupInFile, ['A1']);
});
test('xóa bản ghi đã lưu hiện là removed và hoàn tác được; bỏ dòng mới chưa lưu thì biến mất, không để dấu vết', () => {
  const st = S.create(saved()), id = st.cur.nc[1]._id; assert.ok(S.removeRow(st, 'nc', id).ok);
  assert.deepStrictEqual(S.counts(st, 'nc'), {new: 0, changed: 0, same: 1, removed: 1}); assert.ok(S.diff(st, 'nc').some(d => d.status === 'removed' && d.row.ten === 'LÊ CÔNG NHÂN'));
  assert.ok(S.restoreRow(st, 'nc', id)); assert.strictEqual(S.dirty(st), false);
  const nid = S.addRow(st, 'nc', {ten: 'MỚI', cccd: '049085000009'}); S.removeRow(st, 'nc', nid); assert.strictEqual(S.dirty(st), false);
});
test('đổi biển số xe: phiếu liên kết đổi theo, số chuyến, khối lượng và tổng KHÔNG đổi; có nhật ký đổi biển', () => {
  const st = S.create(saved()), xe = st.cur.dx[0], n0 = st.cur.pc.length, t0 = tong(st);
  assert.deepStrictEqual(S.linkedPc(st, xe.bienSo).map(p => p.soPhieu), ['P1', 'P2']);
  const r = S.updateRow(st, 'dx', xe._id, {...xe, bienSo: '92C-54321'}); assert.deepStrictEqual(r.linked, ['P1', 'P2']);
  assert.strictEqual(st.cur.pc.length, n0); assert.strictEqual(tong(st), t0); assert.ok(st.cur.pc.filter(p => p.bienSo === '92C-54321').length === 2);
  const c = S.commit(st); assert.strictEqual(c.bienLog.length, 2); assert.ok(c.bienLog.every(e => e.cu === '92C-12345' && e.moi === '92C-54321' && e.nguon === 'Sửa biển số xe'));
  assert.ok(c.lists.pc.every(p => !('_plateSrc' in p)) && c.lists.dx.every(x => !('_renamedFrom' in x)));
});
test('xóa xe còn phiếu liên kết bị chặn và nêu số phiếu; sau khi xử lý phiếu thì xóa được', () => {
  const st = S.create(saved()), xe = st.cur.dx[1];
  const r = S.removeRow(st, 'dx', xe._id); assert.strictEqual(r.ok, false); assert.deepStrictEqual(r.linked, ['P3']); assert.strictEqual(st.cur.dx.length, 2);
  S.removeRow(st, 'pc', st.cur.pc.find(p => p.soPhieu === 'P3')._id); assert.ok(S.removeRow(st, 'dx', xe._id).ok); assert.strictEqual(st.cur.dx.length, 1);
});
test('đổi biển số trên phiếu đã lưu ghi nhật ký với nguồn; xe thêm trong lượt sửa dùng được ngay cho phiếu', () => {
  const st = S.create(saved()), p = st.cur.pc[2]; const id = S.addRow(st, 'dx', {bienSo: '92C-99999', chuXe: 'C'});
  S.updateRow(st, 'pc', p._id, {...p, bienSo: '92C-99999'}); const c = S.commit(st);
  assert.strictEqual(c.lists.dx.length, 3); assert.deepStrictEqual(c.bienLog.map(e => [e.soPhieu, e.cu, e.moi, e.nguon]), [['P3', '92C-67890', '92C-99999', 'Sửa tay']]); assert.ok(id);
});
test('commit giữ nguyên _id và các dòng không đổi; bản nháp không làm đổi dữ liệu đã lưu truyền vào', () => {
  const s0 = saved(), snap = JSON.stringify(s0), st = S.create(s0); S.addRow(st, 'pc', {soPhieu: 'P4', bienSo: '92C-12345', ngay: '09/10/2026', kl: 1});
  const c = S.commit(st); assert.strictEqual(JSON.stringify(s0), snap); assert.strictEqual(c.lists.pc.length, 4); assert.deepStrictEqual(c.lists.pc.slice(0, 3).map(r => r._id), st.base.pc.map(r => r._id));
});

/* ===== _id nội bộ duy nhất (lỗi 1.4.31: lưu rồi mở lại, dòng mới trùng _id dòng cũ nên Sửa/Xóa trúng nhầm dòng) ===== */
const ids = st => S.KINDS.flatMap(k => st.cur[k].map(r => r._id));
const chain = kind => {
  const row = {nc: n => ({ten: 'NV ' + n, cccd: '04908500' + String(1000 + n)}), dx: n => ({bienSo: '92C-0000' + n}), pc: n => ({soPhieu: 'P' + n, bienSo: '92C-1', kl: n})}[kind];
  let st = S.create({nc: [], dx: [], pc: []}); S.addRow(st, kind, row(1));
  const lists = S.commit(st).lists; st = S.create(lists);       // lưu rồi mở lại
  const id2 = S.addRow(st, kind, row(2));
  return {st, id2, row};
};
['nc', 'dx', 'pc'].forEach(kind => {
  test('lưu → mở lại → thêm dòng mới (' + kind + '): _id duy nhất; sửa và xóa dòng mới không chạm dòng cũ', () => {
    const {st, id2, row} = chain(kind), old = JSON.stringify(st.cur[kind][0]);
    assert.strictEqual(new Set(ids(st)).size, ids(st).length);
    const f = S.counts(st, kind); assert.deepStrictEqual(f, {new: 1, changed: 0, same: 1, removed: 0});
    const k2 = Object.keys(row(2))[0]; S.updateRow(st, kind, id2, Object.assign({}, st.cur[kind][1], {ghiChu: 'đã sửa'}));
    assert.strictEqual(JSON.stringify(st.cur[kind][0]), old); assert.strictEqual(st.cur[kind][1].ghiChu, 'đã sửa'); assert.ok(k2);
    assert.deepStrictEqual(S.counts(st, kind), {new: 1, changed: 0, same: 1, removed: 0});
    S.removeRow(st, kind, id2); assert.strictEqual(st.cur[kind].length, 1); assert.strictEqual(JSON.stringify(st.cur[kind][0]), old);
  });
});
test('dòng cũ chờ xóa (hoàn tác được): _id mới không trùng, hoàn tác đúng dòng', () => {
  let st = S.create({nc: [], dx: [], pc: [{soPhieu: 'P1', kl: 1}]}); const id1 = st.cur.pc[0]._id;
  S.removeRow(st, 'pc', id1); const idN = S.addRow(st, 'pc', {soPhieu: 'P2', kl: 2});
  assert.notStrictEqual(idN, id1); assert.ok(S.restoreRow(st, 'pc', id1));
  assert.deepStrictEqual(st.cur.pc.map(r => r.soPhieu).sort(), ['P1', 'P2']); assert.strictEqual(new Set(ids(st)).size, 2);
  assert.deepStrictEqual(S.counts(st, 'pc'), {new: 1, changed: 0, same: 1, removed: 0});
});
test('dữ liệu cũ thiếu hoặc trùng _id (kể cả giữa nhân công, xe, phiếu): chuẩn hóa khi tạo bản nháp, không đổi nội dung, thứ tự, liên kết; chưa dirty', () => {
  const lg = {nc: [{ten: 'A', _id: 'n1'}, {ten: 'B', _id: 'n1'}], dx: [{bienSo: '92C-1', _id: 'n1'}], pc: [{soPhieu: '1', bienSo: '92C-1'}, {soPhieu: '2', bienSo: '92C-1', _id: 'n2'}, {soPhieu: '3', bienSo: '92C-1', _id: 'n2'}]};
  const before = JSON.stringify(lg, (k, v) => k === '_id' ? undefined : v);
  const st = S.create(lg); assert.strictEqual(new Set(ids(st)).size, 6); assert.deepStrictEqual(S.idConflicts(st), []);
  assert.strictEqual(st.cur.nc[0]._id, 'n1'); assert.strictEqual(st.cur.pc[1]._id, 'n2');   // _id hợp lệ đầu tiên được giữ
  assert.strictEqual(JSON.stringify(S.commit(st).lists, (k, v) => k === '_id' ? undefined : v), before);
  assert.strictEqual(S.dirty(st), false);
  const id = S.addRow(st, 'pc', {soPhieu: '4'}); assert.ok(!ids(st).slice(0, -1).includes(id));
  S.updateRow(st, 'pc', st.cur.pc[2]._id, Object.assign({}, st.cur.pc[2], {kl: 9}));   // phiếu 3 (trùng cũ) sửa riêng được
  assert.deepStrictEqual(st.cur.pc.map(p => p.kl), [undefined, undefined, 9, undefined]);
});
test('Excel + nhập tay xen kẽ rồi lưu → mở lại: mọi _id vẫn duy nhất; cập nhật dòng có sẵn giữ nguyên _id', () => {
  let st = S.create({nc: [], dx: [], pc: []});
  S.addRow(st, 'pc', {soPhieu: 'P1', kl: 1}); S.merge(st, 'pc', [{soPhieu: 'P2', kl: 2}, {soPhieu: 'P3', kl: 3}], {source: 'Excel: a.xlsx'});
  const idP2 = st.cur.pc.find(p => p.soPhieu === 'P2')._id;
  st = S.create(S.commit(st).lists); S.addRow(st, 'pc', {soPhieu: 'P4', kl: 4});
  S.merge(st, 'pc', [{soPhieu: 'P2', kl: 22}, {soPhieu: 'P5', kl: 5}], {source: 'Google Sheets', keepBlank: true});
  assert.strictEqual(st.cur.pc.find(p => p.soPhieu === 'P2')._id, idP2); assert.strictEqual(new Set(ids(st)).size, 5);
  assert.deepStrictEqual(S.counts(st, 'pc'), {new: 2, changed: 1, same: 2, removed: 0});
});
test('hai lô cùng chủ: thao tác lô A không ảnh hưởng lô B', () => {
  const a = S.create({nc: [], dx: [], pc: []}), b = S.create({nc: [], dx: [], pc: []});
  S.addRow(a, 'pc', {soPhieu: 'P1', kl: 1}); S.addRow(b, 'pc', {soPhieu: 'P1', kl: 7});
  S.updateRow(a, 'pc', a.cur.pc[0]._id, {soPhieu: 'P1', kl: 2}); assert.strictEqual(b.cur.pc[0].kl, 7); assert.ok(S.dirty(b));
});
test('idConflicts: _id trùng hoặc thiếu trong bản sắp ghi bị phát hiện, nêu rõ nhóm và dòng', () => {
  const st = S.create({nc: [], dx: [{bienSo: 'X'}], pc: [{soPhieu: '1'}, {soPhieu: '2'}]});
  st.cur.pc[1]._id = st.cur.pc[0]._id; delete st.cur.dx[0]._id;
  const c = S.idConflicts(st); assert.strictEqual(c.length, 2);
  const pc = c.find(x => x.kind === 'pc'); assert.strictEqual(pc.group, 'phiếu cân'); assert.strictEqual(pc.rows.length, 2); assert.ok(/phiếu 2/.test(pc.rows[1]));
  assert.strictEqual(c.find(x => x.kind === 'dx').group, 'xe');
});
