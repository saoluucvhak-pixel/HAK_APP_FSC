'use strict';
/* G2 — TEST VIẾT TRƯỚC cho đổi số phiếu cân ở src/stage.js (doiSoPhieu, bí danh soCu trong merge/resolve, commit.soLog) và HAKBks.khoaTatCa.
 * Thiết kế mục 2.1, 2.2, 3.4, 3.5, 5.3. Dữ liệu GIẢ LẬP (HD-GL-0005). Test ghi [guard] là hành vi HIỆN CÓ phải giữ nguyên (xanh từ G2).
 * Ở G2 các test còn lại phải ĐỎ vì hàm/hành vi chưa có (S.doiSoPhieu is not a function, B.khoaTatCa is not a function, soLog vắng, bí danh chưa nhận). */
const test = require('node:test'), assert = require('node:assert');
const S = require('../src/stage'), B = require('../src/bks');

const NGAY = '12/11/2026';
const pc1 = (x) => Object.assign({_id: 'p1', id: 'pc1', soPhieu: 'GL5-0101', ngay: NGAY, bienSo: '43C-500.05', kl: 21.3, klKg: 21300, xeRowId: 'x1', hdvcId: 'h1', doiId: 'd1', _row: 2}, x || {});
const pc2 = (x) => Object.assign({_id: 'p2', id: 'pc2', soPhieu: 'GL5-0201', ngay: '13/11/2026', bienSo: '43C-500.06', kl: 20.5, _row: 3}, x || {});
const mk = (pcs) => S.create({nc: [], dx: [], pc: pcs || [pc1(), pc2()]});
const META = (x) => Object.assign({lyDo: 'Google Sheets đổi số, dòng 18', nguon: {loai: 'sheet', tab: 'HoSoKeo', row: 18, set: '2026-11-22T01:00:00.000Z'}, at: '2026-11-22T02:00:00.000Z'}, x || {});
const CTX = (x) => Object.assign({loKhoa: false, phieuLoKhac: [], xacNhanLoKhac: false}, x || {});
const tongKg = st => st.cur.pc.reduce((a, p) => a + Math.round((p.kl || 0) * 1000), 0);
const snap = st => JSON.stringify(st.cur);

test('khoaTatCa: dòng không có soCu → chỉ khóa hiện hành; có soCu → thêm khóa bí danh theo ngày của chính bí danh (thiếu ngày lấy ngày phiếu)', () => {
  assert.deepStrictEqual(B.khoaTatCa({soPhieu: 'pa 1', ngay: '1/11/2026'}), [B.khoaPhieu({soPhieu: 'PA1', ngay: '01/11/2026'})]);
  const p = {soPhieu: 'B', ngay: '12/11/2026', soCu: [{so: 'a 1', ngay: '10/11/2026'}, {so: 'C'}]};
  assert.deepStrictEqual(B.khoaTatCa(p), [B.khoaPhieu({soPhieu: 'B', ngay: '12/11/2026'}), B.khoaPhieu({soPhieu: 'A1', ngay: '10/11/2026'}), B.khoaPhieu({soPhieu: 'C', ngay: '12/11/2026'})]);
});
test('ST-01 doiSoPhieu: giữ _id, id, kl, bienSo, xeRowId, hdvcId; thêm soCu đủ trường; số hiện hành là số mới; tổng tấn không đổi', () => {
  const st = mk(), before = tongKg(st);
  const r = S.doiSoPhieu(st, 'p1', 'GL5-0102', META(), CTX());
  assert.strictEqual(r.ok, true);
  const p = st.cur.pc.find(x => x._id === 'p1');
  assert.strictEqual(p.soPhieu, 'GL5-0102'); assert.strictEqual(p.id, 'pc1'); assert.strictEqual(p.kl, 21.3); assert.strictEqual(p.bienSo, '43C-500.05'); assert.strictEqual(p.xeRowId, 'x1'); assert.strictEqual(p.hdvcId, 'h1'); assert.strictEqual(p._row, 2);
  assert.strictEqual(p.soCu.length, 1);
  assert.deepStrictEqual(p.soCu[0], {so: 'GL5-0101', ngay: NGAY, lyDo: 'Google Sheets đổi số, dòng 18', nguon: {loai: 'sheet', tab: 'HoSoKeo', row: 18, set: '2026-11-22T01:00:00.000Z'}, at: '2026-11-22T02:00:00.000Z'});
  assert.strictEqual(tongKg(st), before); assert.strictEqual(st.cur.pc.length, 2); assert.strictEqual(S.dirty(st, 'pc'), true);
  assert.deepStrictEqual(r.entry, p.soCu[0]);
});
test('ST-02 [guard] "Là chuyến khác": phiếu Sheet khác số cùng ngày được thêm thành dòng mới qua merge → tổng tấn tăng đúng bằng kl phiếu mới', () => {
  const st = mk([pc1()]); S.merge(st, 'pc', [{soPhieu: 'GL5-0102', ngay: NGAY, bienSo: '43C-500.05', kl: 21.3}], {source: 'Google Sheets'});   // cùng ngày, khác số: thêm mới
  assert.strictEqual(st.cur.pc.length, 2); assert.strictEqual(tongKg(st), 42600);
});
test('ST-03 số mới trùng khóa (số + ngày) với dòng khác trong lô → TRUNG, không ghi gì', () => {
  const st = mk([pc1(), pc2({soPhieu: 'GL5-0102', ngay: NGAY})]), b = snap(st);
  const r = S.doiSoPhieu(st, 'p1', 'gl5-0102', META(), CTX()); assert.strictEqual(r.ok, false); assert.strictEqual(r.ma, 'TRUNG'); assert.strictEqual(snap(st), b);
});
test('ST-03b (SỬA CÓ CHỦ Ý theo quyết định STAFF_FSC, thiết kế §3.5 bước 5) pending khác ngày KHÔNG chặn; pending cùng số + cùng ngày → TRUNG', () => {
  const st2 = mk([pc1(), pc2()]); S.merge(st2, 'pc', [{soPhieu: 'GL5-0201', ngay: '13/11/2026', bienSo: '43C-500.06', kl: 99}], {source: 'x'});
  assert.strictEqual(S.pendingOf(st2, 'pc').length, 1);
  assert.strictEqual(S.doiSoPhieu(st2, 'p1', 'GL5-0201', META(), CTX()).ok, true, 'pending ngày 13/11, phiếu p1 ngày 12/11: khác khóa, không chặn');
  const st3 = mk([pc1({ngay: '13/11/2026'}), pc2()]); S.merge(st3, 'pc', [{soPhieu: 'GL5-0201', ngay: '13/11/2026', bienSo: '43C-500.06', kl: 99}], {source: 'x'});
  const b = snap(st3), r = S.doiSoPhieu(st3, 'p1', 'GL5-0201', META(), CTX()); assert.strictEqual(r.ok, false); assert.strictEqual(r.ma, 'TRUNG'); assert.strictEqual(snap(st3), b);
});
test('ST-04 số mới trùng BÍ DANH của dòng khác cùng ngày → chặn; khác ngày → cho đổi', () => {
  const alias = (ngay) => mk([pc1(), pc2({ngay: NGAY, soCu: [{so: 'GL5-0102', ngay, lyDo: 'abc', nguon: {loai: 'tay'}, at: '2026-11-01T00:00:00.000Z'}]})]);
  const a = alias(NGAY); const ra = S.doiSoPhieu(a, 'p1', 'GL5-0102', META(), CTX()); assert.strictEqual(ra.ok, false); assert.strictEqual(ra.ma, 'TRUNG');
  const b = alias('01/11/2026'); const rb = S.doiSoPhieu(b, 'p1', 'GL5-0102', META(), CTX()); assert.strictEqual(rb.ok, true);
});
test('ST-05 lô chốt/dừng (ctx.loKhoa) → LO_KHOA, không ghi; kiểm trước mọi kiểm tra khác', () => {
  const st = mk(), b = snap(st);
  assert.strictEqual(S.doiSoPhieu(st, 'p1', 'GL5-0102', META(), CTX({loKhoa: true})).ma, 'LO_KHOA');
  assert.strictEqual(S.doiSoPhieu(st, 'p1', '', META({lyDo: ''}), CTX({loKhoa: true})).ma, 'LO_KHOA'); assert.strictEqual(snap(st), b);
});
test('ST-06 thiếu lý do (< 3 ký tự sau trim) / số rỗng → THIEU; số không đổi (chỉ khác hoa-thường/khoảng trắng) → KHONG_DOI; id không có → KHONG_CO', () => {
  const st = mk(), b = snap(st), ma = (so, meta, id) => S.doiSoPhieu(st, id || 'p1', so, meta || META(), CTX()).ma;
  assert.strictEqual(ma('GL5-0102', META({lyDo: ''})), 'THIEU'); assert.strictEqual(ma('GL5-0102', META({lyDo: ' ab '})), 'THIEU'); assert.strictEqual(ma('   '), 'THIEU');
  assert.strictEqual(ma('gl5-0101'), 'KHONG_DOI'); assert.strictEqual(ma(' GL5 - 0101'.replace(' - ', '-')), 'KHONG_DOI'); assert.strictEqual(ma('GL5-0102', META(), 'khong-co'), 'KHONG_CO'); assert.strictEqual(snap(st), b);
});
test('ST-07 trùng ở lô khác: CAN_XAC_NHAN (kèm canhBao, chưa ghi) rồi ok sau khi xác nhận', () => {
  const st = mk(), other = [{lo: 'R-GL05-02', p: {soPhieu: 'GL5-0102', ngay: NGAY}}], b = snap(st);
  const r = S.doiSoPhieu(st, 'p1', 'GL5-0102', META(), CTX({phieuLoKhac: other})); assert.strictEqual(r.ok, false); assert.strictEqual(r.ma, 'CAN_XAC_NHAN'); assert.ok(Array.isArray(r.canhBao) && r.canhBao.length >= 1); assert.strictEqual(snap(st), b);
  const r2 = S.doiSoPhieu(st, 'p1', 'GL5-0102', META(), CTX({phieuLoKhac: other, xacNhanLoKhac: true})); assert.strictEqual(r2.ok, true); assert.strictEqual(st.cur.pc[0].soPhieu, 'GL5-0102');
  const bd = [{lo: 'R-GL05-02', p: {soPhieu: 'GL5-0102', ngay: '20/11/2026'}}]; assert.strictEqual(S.doiSoPhieu(mk(), 'p1', 'GL5-0102', META(), CTX({phieuLoKhac: bd})).ok, true, 'lô khác nhưng khác ngày: không cảnh báo');
});
test('ST-08 merge: Sheet vẫn mang số CŨ → khớp theo bí danh, rep.add = 0, số hiện hành giữ nguyên, không đổi gì (tải Sheet lần 2, tổng tấn không cộng đôi)', () => {
  const st = mk([pc1()]); S.doiSoPhieu(st, 'p1', 'GL5-0102', META(), CTX());
  const total = tongKg(st), rep = S.merge(st, 'pc', [{soPhieu: 'GL5-0101', ngay: NGAY, bienSo: '43C-500.05', kl: 21.3}], {source: 'Google Sheets'});
  assert.strictEqual(rep.add, 0); assert.strictEqual(st.cur.pc.length, 1); assert.strictEqual(st.cur.pc[0].soPhieu, 'GL5-0102'); assert.strictEqual(rep.pending, 0); assert.strictEqual(tongKg(st), total);
  const rep2 = S.merge(st, 'pc', [{soPhieu: 'GL5-0101', ngay: NGAY, bienSo: '43C-500.05', kl: 21.3}], {source: 'Google Sheets'}); assert.strictEqual(rep2.add, 0, 'áp dụng hai lần vẫn không thêm');
});
test('ST-08b merge: Sheet đổi theo sang số MỚI → khớp khóa hiện hành, soCu giữ nguyên, không thêm', () => {
  const st = mk([pc1()]); S.doiSoPhieu(st, 'p1', 'GL5-0102', META(), CTX());   // cần doiSoPhieu có thật
  const rep = S.merge(st, 'pc', [{soPhieu: 'GL5-0102', ngay: NGAY, bienSo: '43C-500.05', kl: 21.3}], {source: 'Google Sheets'});
  assert.strictEqual(rep.add, 0); assert.strictEqual(st.cur.pc[0].soCu.length, 1);
});
test('ST-08c merge: số cũ xuất hiện ở NGÀY KHÁC với soCu[].ngay là chuyến khác → thêm mới (số cũ được dùng lại hợp lệ)', () => {
  const st = mk([pc1()]); S.doiSoPhieu(st, 'p1', 'GL5-0102', META(), CTX());
  const rep = S.merge(st, 'pc', [{soPhieu: 'GL5-0101', ngay: '20/11/2026', bienSo: '43C-500.09', kl: 20}], {source: 'Google Sheets'}); assert.strictEqual(rep.add, 1); assert.strictEqual(st.cur.pc.length, 2);
});
test('ST-09 merge số cũ nhưng KL khác → pending "Cần đối chiếu" như cùng số phiếu thông thường, chưa đổi gì', () => {
  const st = mk([pc1()]); S.doiSoPhieu(st, 'p1', 'GL5-0102', META(), CTX());
  const rep = S.merge(st, 'pc', [{soPhieu: 'GL5-0101', ngay: NGAY, bienSo: '43C-500.05', kl: 25}], {source: 'Google Sheets'});
  assert.strictEqual(rep.add, 0); assert.strictEqual(rep.pending, 1); assert.strictEqual(S.pendingOf(st, 'pc').length, 1); assert.strictEqual(st.cur.pc[0].kl, 21.3);
});
test('ST-10 resolve(other) với số trùng BÍ DANH của dòng khác cùng ngày → báo "đã có trong lô"', () => {
  const st = mk([pc1({soCu: [{so: 'GL5-0099', ngay: NGAY, lyDo: 'abc', nguon: {loai: 'tay'}, at: '2026-11-01T00:00:00.000Z'}]}), pc2({soPhieu: 'ZZ-1', ngay: NGAY, bienSo: '43C-500.06', kl: 20.5})]);
  S.merge(st, 'pc', [{soPhieu: 'ZZ-1', ngay: NGAY, bienSo: '43C-500.06', kl: 22}], {source: 'x'});   // cùng số khác KL → pending (hành vi hiện có)
  const p = S.pendingOf(st, 'pc'); assert.strictEqual(p.length, 1);
  const r = S.resolve(st, p[0].pid, 'other', {soPhieu: 'GL5-0099'}); assert.strictEqual(r.ok, false); assert.match(r.error, /đã có trong lô/);
});
test('ST-10b [guard] resolve(other) với số trùng khóa hiện hành cùng ngày vẫn báo lỗi như trước', () => {
  const st = mk([pc1(), pc2({soPhieu: 'ZZ-1', ngay: NGAY, kl: 20.5})]); S.merge(st, 'pc', [{soPhieu: 'ZZ-1', ngay: NGAY, kl: 22}], {source: 'x'});
  const r = S.resolve(st, S.pendingOf(st, 'pc')[0].pid, 'other', {soPhieu: 'GL5-0101'}); assert.strictEqual(r.ok, false); assert.match(r.error, /đã có trong lô/);
});
test('ST-11 commit trả soLog: mỗi lần đổi số một mục {pid, soCu, soMoi, ngay, kl, lyDo, nguon, at}; pid = id ổn định (pc<N>) hoặc _id; dòng chỉ thêm mới không sinh mục', () => {
  const st = mk([pc1(), pc2({id: undefined})]); S.doiSoPhieu(st, 'p1', 'GL5-0102', META(), CTX()); S.doiSoPhieu(st, 'p2', 'GL5-0202', META({lyDo: 'Sửa số theo bản cân gốc'}), CTX()); S.addRow(st, 'pc', {soPhieu: 'NEW-1', ngay: NGAY, kl: 1});
  const c = S.commit(st); assert.ok(Array.isArray(c.soLog)); assert.strictEqual(c.soLog.length, 2);
  const a = c.soLog.find(x => x.soMoi === 'GL5-0102'); assert.deepStrictEqual(a, {pid: 'pc1', soCu: 'GL5-0101', soMoi: 'GL5-0102', ngay: NGAY, kl: 21.3, lyDo: 'Google Sheets đổi số, dòng 18', nguon: {loai: 'sheet', tab: 'HoSoKeo', row: 18, set: '2026-11-22T01:00:00.000Z'}, at: '2026-11-22T02:00:00.000Z'});
  assert.strictEqual(c.soLog.find(x => x.soMoi === 'GL5-0202').pid, 'p2'); assert.ok(c.lists.pc.every(p => !('_tay' in p)));
  assert.ok(Array.isArray(c.bienLog), 'bienLog giữ nguyên');
});
test('ST-11b commit không sinh soLog cho dòng đã có soCu từ trước nếu không đổi thêm; dữ liệu cũ không có soCu → soLog là mảng rỗng', () => {
  const had = pc1({soPhieu: 'GL5-0102', soCu: [{so: 'GL5-0101', ngay: NGAY, lyDo: 'abc', nguon: {loai: 'tay'}, at: '2026-11-01T00:00:00.000Z'}]});
  assert.deepStrictEqual(S.commit(S.create({nc: [], dx: [], pc: [had]})).soLog, []);
  assert.deepStrictEqual(S.commit(mk()).soLog, []);
});
test('ST-12 [guard] dòng chỉ đổi soCu được tính "changed" → dirty đúng', () => {
  const st = mk([pc1()]); st.cur.pc[0].soCu = [{so: 'X', ngay: NGAY, lyDo: 'abc', nguon: {loai: 'tay'}, at: 'z'}];
  assert.strictEqual(S.diff(st, 'pc')[0].status, 'changed'); assert.strictEqual(S.dirty(st, 'pc'), true);
});
test('ST-13 [guard] dòng không có soCu: merge/resolve/commit hoạt động như trước (cùng số+ngày khớp; số khác thì thêm)', () => {
  const st = mk([pc1()]);
  assert.strictEqual(S.merge(st, 'pc', [{soPhieu: 'gl5-0101', ngay: NGAY, bienSo: '43C-500.05', kl: 21.3}], {source: 'x'}).add, 0);
  assert.strictEqual(S.merge(st, 'pc', [{soPhieu: 'GL5-0555', ngay: NGAY, bienSo: '43C-500.05', kl: 21.3}], {source: 'x'}).add, 1);
  assert.strictEqual(S.commit(st).lists.pc.length, 2);
});
test('ST-14 soCu tối đa 20 mục: dòng đã có 20 mục, đổi thêm một lần → còn 20, mục cũ nhất bị loại, mục mới ở cuối; soLog vẫn có mục mới', () => {
  const soCu = Array.from({length: 20}, (_, i) => ({so: 'OLD-' + i, ngay: NGAY, lyDo: 'abc', nguon: {loai: 'tay'}, at: '2026-11-01T00:00:00.000Z'}));
  const st = S.create({nc: [], dx: [], pc: [pc1({soPhieu: 'CUR', soCu})]});
  assert.strictEqual(S.doiSoPhieu(st, 'p1', 'NEW', META(), CTX()).ok, true);
  const p = st.cur.pc[0]; assert.strictEqual(p.soCu.length, 20); assert.strictEqual(p.soCu[0].so, 'OLD-1'); assert.strictEqual(p.soCu[19].so, 'CUR');
  assert.strictEqual(S.commit(st).soLog.length, 1);
});
test('ST-15 chuỗi đổi số A→B→A: cho phép (số cũ của chính dòng không tự chặn); soCu = [A, B], số hiện hành A', () => {
  const st = mk([pc1({soPhieu: 'A'})]);
  assert.strictEqual(S.doiSoPhieu(st, 'p1', 'B', META(), CTX()).ok, true); assert.strictEqual(S.doiSoPhieu(st, 'p1', 'A', META({lyDo: 'đổi lại số cũ'}), CTX()).ok, true);
  assert.deepStrictEqual(st.cur.pc[0].soCu.map(c => c.so), ['A', 'B']); assert.strictEqual(st.cur.pc[0].soPhieu, 'A');
});
test('Q9 mặc định (CHƯA có quyết định CHỦ): updateRow đổi soPhieu của dòng ĐÃ LƯU tự ghi soCu với lý do "Sửa tay (không có lý do)", nguồn tay; dòng mới chưa lưu sửa tự do', () => {
  const st = mk([pc1()]); S.updateRow(st, 'pc', 'p1', Object.assign({}, st.cur.pc[0], {soPhieu: 'GL5-0199'}));
  const p = st.cur.pc[0]; assert.strictEqual(p.soPhieu, 'GL5-0199'); assert.strictEqual(p.soCu.length, 1); assert.strictEqual(p.soCu[0].so, 'GL5-0101'); assert.strictEqual(p.soCu[0].lyDo, 'Sửa tay (không có lý do)'); assert.strictEqual(p.soCu[0].nguon.loai, 'tay');
  const nid = S.addRow(st, 'pc', {soPhieu: 'N1', ngay: NGAY, kl: 1}); S.updateRow(st, 'pc', nid, {soPhieu: 'N2', ngay: NGAY, kl: 1}); assert.strictEqual(st.cur.pc.find(x => x._id === nid).soCu, undefined);
});

test('THAP-3 lyDo/soMoi không phải chuỗi → THIEU; soMoi dài hơn 64 → KHONG_HOP_LE; không ghi gì', () => {
  const st = mk(), b = snap(st), ma = (so, meta) => S.doiSoPhieu(st, 'p1', so, meta, CTX()).ma;
  assert.strictEqual(ma({toString() { return 'GL5-0102'; }}, META()), 'THIEU'); assert.strictEqual(ma(12345, META()), 'THIEU');
  assert.strictEqual(ma('GL5-0102', META({lyDo: {toString() { return 'abcdef'; }}})), 'THIEU'); assert.strictEqual(ma('GL5-0102', META({lyDo: ['abcdef']})), 'THIEU');
  assert.strictEqual(ma('X'.repeat(65), META()), 'KHONG_HOP_LE'); assert.strictEqual(ma('X'.repeat(5 * 1024 * 1024), META()), 'KHONG_HOP_LE'); assert.strictEqual(snap(st), b);
  assert.strictEqual(S.doiSoPhieu(st, 'p1', 'X'.repeat(64), META(), CTX()).ok, true, '64 ký tự vẫn nhận');
});
test('THAP-3 lyDo 5 MB bị cắt còn 500 ký tự', () => {
  const st = mk(), r = S.doiSoPhieu(st, 'p1', 'GL5-0102', META({lyDo: 'a'.repeat(5 * 1024 * 1024)}), CTX());
  assert.strictEqual(r.ok, true); assert.strictEqual(st.cur.pc[0].soCu[0].lyDo.length, 500);
});
test('THAP-3 meta.nguon chỉ giữ whitelist {loai, tab, row, set}; chuỗi ≤ 64, row nguyên; vòng tròn/kiểu lạ không ném', () => {
  const st = mk(), cyc = {loai: 'sheet', tab: 'T', row: 3, set: 's', khac: 'bo', toBi: {}}; cyc.self = cyc; cyc.toBi.cyc = cyc;
  const r = S.doiSoPhieu(st, 'p1', 'GL5-0102', META({nguon: cyc}), CTX()); assert.strictEqual(r.ok, true);
  assert.deepStrictEqual(st.cur.pc[0].soCu[0].nguon, {loai: 'sheet', tab: 'T', row: 3, set: 's'});
  const st2 = mk(), r2 = S.doiSoPhieu(st2, 'p1', 'GL5-0102', META({nguon: {loai: 'x'.repeat(5000), tab: {a: 1}, row: 1.5, set: 7}}), CTX()); assert.strictEqual(r2.ok, true);
  assert.deepStrictEqual(st2.cur.pc[0].soCu[0].nguon, {loai: 'x'.repeat(64)});
  const st3 = mk(); assert.strictEqual(S.doiSoPhieu(st3, 'p1', 'GL5-0102', META({nguon: 'chuoi'}), CTX()).ok, true); assert.deepStrictEqual(st3.cur.pc[0].soCu[0].nguon, {loai: 'tay'});
  const st4 = mk(); S.doiSoPhieu(st4, 'p1', 'GL5-0102', META({nguon: {row: 18}}), CTX()); assert.deepStrictEqual(st4.cur.pc[0].soCu[0].nguon, {row: 18});
});
test('DON-4 merge khớp theo số cũ không được báo "thay đổi số phiếu" (kể cả sau commit, khi _tay đã bị bỏ): changes rỗng, số hiện hành giữ nguyên', () => {
  const st = mk([pc1()]); S.doiSoPhieu(st, 'p1', 'GL5-0102', META(), CTX());
  const st2 = S.create({nc: [], dx: [], pc: S.commit(st).lists.pc});
  const rep = S.merge(st2, 'pc', [{soPhieu: 'GL5-0101', ngay: NGAY, bienSo: '43C-500.05', kl: 21.3}], {source: 'Google Sheets'});
  assert.strictEqual(rep.same, 1); assert.deepStrictEqual(rep.changes, []); assert.strictEqual(st2.cur.pc[0].soPhieu, 'GL5-0102');
  const rep1 = S.merge(st, 'pc', [{soPhieu: 'GL5-0101', ngay: NGAY, bienSo: '43C-500.05', kl: 21.3}], {source: 'Google Sheets'}); assert.deepStrictEqual(rep1.changes, []);
});
