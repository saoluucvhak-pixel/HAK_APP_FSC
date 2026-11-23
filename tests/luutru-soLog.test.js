'use strict';
/* Lưu trữ dữ liệu đổi số phiếu: pc[].soCu, f.soLog, f.info.nguon, f.taoLuc (thiết kế THIET_KE_DU_LIEU_DOI_SO_PHAN_BO.md §2, §4, R5, R7).
 * Chỉ dùng hàm thuần và Store trong bộ nhớ; dữ liệu GIẢ LẬP. Test mới, không sửa test cũ. */
const test = require('node:test'), assert = require('node:assert');
const {Store, MIGRATIONS} = require('../src/store'), V = require('../src/vongdoi'), D = require('../src/delta'), S = require('../src/stage');
const clone = o => JSON.parse(JSON.stringify(o));

const SOCU = {so: 'GL5-0101', ngay: '12/11/2026', lyDo: 'Google Sheets đổi số, dòng 18', nguon: {loai: 'sheet', tab: 'HoSoKeo', row: 18, set: '2026-11-22T01:00:00.000Z'}, at: '2026-11-22T02:00:00.000Z'};
const SOLOG = {pid: 'pc1', soCu: 'GL5-0101', soMoi: 'GL5-0102', ngay: '12/11/2026', kl: 21.3, lyDo: SOCU.lyDo, nguon: SOCU.nguon, at: SOCU.at, nguoi: 'KT giả lập'};
const NGUON = {hd: 'HD-GL-0005', maRung: 'R-GL05-01', at: '2026-11-22T02:00:00.000Z', set: 'HoSoKeo'};
const pcCu = () => ({id: 'pc1', so: '1', soPhieu: 'GL5-0102', ngay: '12/11/2026', kl: 21.3, bienSo: '43C-500.05'});
const lo = (them) => Object.assign({id: 'f1', info: {maRung: 'R-GL05-01', tenRung: 'Rừng giả lập'}, nc: [{ten: 'Công nhân giả lập', cccd: '049000000011'}], dx: [], pc: [pcCu()], exp: {}}, them || {});
const db = (them) => ({v: 2, norm: {}, rs: {r1: {id: 'r1', info: {ma: 'CR-GL', ten: 'Chủ giả lập', cccd: '049000000010'}, forests: {f1: lo(them)}}}});
const moi = () => { const f = lo({soLog: [SOLOG], taoLuc: '2026-11-20T00:00:00.000Z'}); f.pc[0].soCu = [SOCU]; f.info.nguon = NGUON; return db({soLog: f.soLog, taoLuc: f.taoLuc, pc: f.pc, info: f.info}); };
const rowOf = (s, id) => s.db.prepare('SELECT data, hash FROM forests WHERE id=?').get(id);
const MOC = '2026-11-23T00:00:00Z';
const chotDuoc = f => { const r = V.chot(f, 'KT giả lập', MOC, []); assert.ok(r.ok, r.error); return f; };

test('LT-01 round-trip Store.save → load giữ nguyên soCu, soLog, info.nguon, taoLuc (không đổi thứ tự, không mất trường)', () => {
  const s = new Store(':memory:'); s.save(moi());
  const f = s.load().rs.r1.forests.f1;
  assert.deepStrictEqual(f.soLog, [SOLOG]); assert.deepStrictEqual(f.pc[0].soCu, [SOCU]); assert.deepStrictEqual(f.info.nguon, NGUON); assert.strictEqual(f.taoLuc, '2026-11-20T00:00:00.000Z');
  assert.strictEqual(s.save(s.load()).changed, 0, 'đọc rồi lưu lại không đổi dòng nào');
  s.close();
});
test('LT-01b round-trip qua saveDelta (đường lưu của giao diện): thêm soCu + soLog vào lô đã có chỉ ghi đúng 1 lô', () => {
  const s = new Store(':memory:'); s.save(db());
  const d0 = s.load(), snap0 = D.snapshot(d0), d1 = clone(d0), f = d1.rs.r1.forests.f1;
  f.pc[0].soCu = [SOCU]; f.soLog = [SOLOG];
  const dl = D.diff(snap0, D.snapshot(d1)); assert.deepStrictEqual(Object.keys(dl.upF), ['f1']); assert.deepStrictEqual(dl.upO, {}, 'hồ sơ chủ rừng không đổi');
  dl.rev = s.rev; dl.side = D.side(d1); dl.counts = D.snapshot(d1).counts; s.saveDelta(dl);
  const g = s.load().rs.r1.forests.f1; assert.deepStrictEqual(g.soLog, [SOLOG]); assert.deepStrictEqual(g.pc[0].soCu, [SOCU]);
  s.close();
});
test('LT-02 dữ liệu cũ (không có trường mới): đọc/ghi y nguyên, không tự thêm soCu/soLog/nguon/taoLuc, băm dòng không đổi, lưu lại changed = 0', () => {
  const s = new Store(':memory:'); s.save(db()); const h0 = rowOf(s, 'f1');
  const a = s.load(), f = a.rs.r1.forests.f1;
  ['soLog', 'taoLuc'].forEach(k => assert.ok(!(k in f), k + ' không được tự sinh')); assert.ok(!('nguon' in f.info)); assert.ok(f.pc.every(p => !('soCu' in p)));
  assert.strictEqual(s.save(a).changed, 0); assert.deepStrictEqual(rowOf(s, 'f1'), h0, 'cột data và hash không đổi');
  // delta: snapshot hai lần cùng dữ liệu cũ không sinh khác biệt
  assert.strictEqual(D.size(D.diff(D.snapshot(a), D.snapshot(clone(a)))), 0);
  assert.ok(!JSON.stringify(D.forestJson('f1', f)).includes('soLog'));
  s.close();
});
test('LT-02b MIGRATIONS không dài thêm: trường mới nằm trong JSON lô, không cần cột/bảng (thiết kế §0)', () => {
  assert.strictEqual(MIGRATIONS.length, 15);
});
test('LT-03 delta: thêm rồi bỏ soLog đưa lô về đúng chuỗi JSON cũ (diff rỗng) — lô chưa dùng tính năng mới không bị coi là đã sửa', () => {
  const a = db(), sA = D.snapshot(a), b = clone(a); b.rs.r1.forests.f1.soLog = [SOLOG];
  assert.deepStrictEqual(Object.keys(D.diff(sA, D.snapshot(b)).upF), ['f1']);
  delete b.rs.r1.forests.f1.soLog; assert.strictEqual(D.size(D.diff(sA, D.snapshot(b))), 0);
});
test('LT-04 stage.commit trên dữ liệu cũ: soLog rỗng, không dòng nào có soCu; round-trip qua Store giữ y nguyên', () => {
  const st = S.create({nc: [], dx: [], pc: [Object.assign({_id: 'p1', _row: 2, soPhieu: 'GL5-0101', ngay: '12/11/2026', kl: 21.3})]});
  const c = S.commit(st); assert.deepStrictEqual(c.soLog, []); assert.ok(c.lists.pc.every(p => !('soCu' in p)));
  const d = db({pc: c.lists.pc}), s = new Store(':memory:'); s.save(d); const g = s.load().rs.r1.forests.f1;
  assert.deepStrictEqual(g.pc.map(p => p.soPhieu), ['GL5-0101']); assert.ok(g.pc.every(p => !('soCu' in p))); s.close();
});
test('LT-05 đổi số → commit → ghi vào lô → Store: soLog khớp soCu, lưu/đọc lại giữ nguyên, lần commit sau không sinh trùng', () => {
  const st = S.create({nc: [], dx: [], pc: [{_id: 'p1', id: 'pc1', _row: 2, soPhieu: 'GL5-0101', ngay: '12/11/2026', kl: 21.3}]});
  const r = S.doiSoPhieu(st, 'p1', 'GL5-0102', {lyDo: 'Sheet đổi số', nguon: {loai: 'tay'}, at: '2026-11-22T02:00:00.000Z'}, {});
  assert.ok(r.ok); const c = S.commit(st); assert.strictEqual(c.soLog.length, 1);
  assert.deepStrictEqual([c.soLog[0].pid, c.soLog[0].soCu, c.soLog[0].soMoi, c.soLog[0].kl], ['pc1', 'GL5-0101', 'GL5-0102', 21.3]);
  const s = new Store(':memory:'), d = db({pc: c.lists.pc, soLog: c.soLog}); s.save(d); const g = s.load().rs.r1.forests.f1;
  assert.deepStrictEqual(g.soLog, c.soLog); assert.strictEqual(g.pc[0].soCu.length, 1);
  assert.strictEqual(S.commit(S.create({nc: [], dx: [], pc: g.pc})).soLog.length, 0, 'bản nháp mới dựng từ dữ liệu đã lưu không có gì mới');
  s.close();
});

/* ---- lô đã chốt (LOCKED, dấu vân tay hashDL) ---- */
test('LT-06 soLog và soCu nằm NGOÀI nhatKy → là dữ liệu nghiệp vụ: vào dấu vân tay (bamDuLieu), còn nhatKy/chot/luuTru/dung thì không', () => {
  assert.ok(!V.KHOA_VONG_DOI.includes('soLog') && !V.KHOA_VONG_DOI.includes('soCu'));
  const f = lo(), b0 = V.bamDuLieu(f);
  assert.notStrictEqual(V.bamDuLieu(Object.assign(lo(), {soLog: [SOLOG]})), b0, 'thêm soLog đổi dấu vân tay');
  const g = lo(); g.pc[0].soCu = [SOCU]; assert.notStrictEqual(V.bamDuLieu(g), b0, 'thêm soCu đổi dấu vân tay');
  const h = lo(); h.info.nguon = NGUON; assert.notStrictEqual(V.bamDuLieu(h), b0, 'info.nguon đổi dấu vân tay');
  const k = lo(); k.nhatKy = [{at: MOC, hanh: 'moKhoa', lyDo: 'x', nguoi: 'KT'}]; assert.strictEqual(V.bamDuLieu(k), b0, 'nhatKy ngoài dấu vân tay');
  assert.strictEqual(V.bamDuLieu(lo({soLog: []})) === b0, false, 'mảng rỗng khác vắng mặt (ghi rõ để không tự thêm soLog:[])');
});
test('LT-07 lô chốt từ bản cũ (không có trường mới) vẫn nguyên vẹn; sau chốt, chép thêm soLog/soCu làm kiemToanVen báo dữ liệu khác (không bị bỏ qua)', () => {
  const f = chotDuoc(lo()); assert.strictEqual(V.kiemToanVen(f).ma, 'nguyen-ven');
  const k = clone(f); k.nhatKy.push({at: MOC, hanh: 'luutru', lyDo: '', nguoi: ''}); assert.strictEqual(V.kiemToanVen(k).ma, 'nguyen-ven', 'sửa nhatKy sau chốt không đổi dấu vân tay');
  const a = clone(f); a.soLog = [SOLOG]; assert.strictEqual(V.kiemToanVen(a).ma, 'du-lieu-khac');
  const b = clone(f); b.pc[0].soCu = [SOCU]; assert.strictEqual(V.kiemToanVen(b).ma, 'du-lieu-khac');
  const c = clone(f); c.info.nguon = NGUON; assert.strictEqual(V.kiemToanVen(c).ma, 'du-lieu-khac');
});
test('LT-08 lô chốt có sẵn soLog/soCu: dấu vân tay gồm chúng; xóa soLog sau chốt cũng bị phát hiện (không âm thầm sửa lịch sử đổi số)', () => {
  const g = chotDuoc(lo({soLog: [SOLOG]})); assert.strictEqual(V.kiemToanVen(g).ma, 'nguyen-ven');
  const x = clone(g); delete x.soLog; assert.strictEqual(V.kiemToanVen(x).ma, 'du-lieu-khac');
  const y = clone(g); y.soLog[0].soMoi = 'SỬA'; assert.strictEqual(V.kiemToanVen(y).ma, 'du-lieu-khac');
});
test('LT-09 viPhamKhoa: lô chốt/dừng thêm soLog hoặc soCu hoặc info.nguon → vi phạm; chỉ sửa nhatKy → không; lô chưa khóa → không bao giờ', () => {
  const f = chotDuoc(lo());
  const them = fn => { const x = clone(f); fn(x); return V.viPhamKhoa(f, x); };
  assert.strictEqual(them(x => { x.soLog = [SOLOG]; }), true); assert.strictEqual(them(x => { x.pc[0].soCu = [SOCU]; }), true); assert.strictEqual(them(x => { x.info.nguon = NGUON; }), true);
  assert.strictEqual(them(x => { x.nhatKy.push({at: MOC, hanh: 'luutru'}); }), false);
  const u = lo(), u2 = clone(u); u2.soLog = [SOLOG]; assert.strictEqual(V.viPhamKhoa(u, u2), false);
  const d = lo({dung: {at: MOC, ngay: '01/11/2026', lyDo: 'x'}}), d2 = clone(d); d2.soLog = [SOLOG]; assert.strictEqual(V.viPhamKhoa(d, d2), true, 'lô đã dừng cũng khóa');
});
test('LT-10 Store: lô đã chốt từ chối ghi soLog/soCu (LOCKED, không ghi gì); sửa nhatKy sau chốt vẫn ghi được; mở khóa rồi ghi được', () => {
  const s = new Store(':memory:'); s.save(db()); let d = s.load(); chotDuoc(d.rs.r1.forests.f1); s.save(d);
  const h0 = rowOf(s, 'f1');
  d = s.load(); d.rs.r1.forests.f1.soLog = [SOLOG]; assert.throws(() => s.save(d), e => e.code === 'LOCKED');
  d = s.load(); d.rs.r1.forests.f1.pc[0].soCu = [SOCU]; assert.throws(() => s.save(d), e => e.code === 'LOCKED');
  d = s.load(); d.rs.r1.forests.f1.info.nguon = NGUON; assert.throws(() => s.save(d), e => e.code === 'LOCKED');
  // saveDelta cũng chặn
  d = s.load(); const snap0 = D.snapshot(d); d.rs.r1.forests.f1.soLog = [SOLOG];
  const dl = D.diff(snap0, D.snapshot(d)); dl.rev = s.rev; dl.side = D.side(d); dl.counts = D.snapshot(d).counts; assert.throws(() => s.saveDelta(dl), e => e.code === 'LOCKED');
  assert.deepStrictEqual(rowOf(s, 'f1'), h0, 'SQLite không đổi sau các lần bị chặn');
  d = s.load(); d.rs.r1.forests.f1.nhatKy.push({at: MOC, hanh: 'luutru', lyDo: '', nguoi: ''}); s.save(d);   // nhatKy sửa được sau chốt
  d = s.load(); assert.ok(V.moKhoa(d.rs.r1.forests.f1, 'sửa số phiếu', 'KT', MOC).ok); s.save(d);
  d = s.load(); d.rs.r1.forests.f1.soLog = [SOLOG]; s.save(d); assert.deepStrictEqual(s.load().rs.r1.forests.f1.soLog, [SOLOG]);
  s.close();
});
test('LT-11 chặn Đổi số trên lô đã chốt/dừng: doiSoPhieu với ctx.loKhoa trả LO_KHOA, không ghi gì; V.chiDoc cho đúng cờ khóa', () => {
  const mkSt = () => S.create({nc: [], dx: [], pc: [{_id: 'p1', id: 'pc1', _row: 2, soPhieu: 'GL5-0101', ngay: '12/11/2026', kl: 21.3}]});
  [chotDuoc(lo()), lo({dung: {at: MOC}})].forEach(f => {
    assert.strictEqual(V.chiDoc(f), true);
    const st = mkSt(), b = JSON.stringify(st.cur), r = S.doiSoPhieu(st, 'p1', 'GL5-0102', {lyDo: 'thử đổi số', nguon: {loai: 'tay'}}, {loKhoa: V.chiDoc(f)});
    assert.strictEqual(r.ok, false); assert.strictEqual(r.ma, 'LO_KHOA'); assert.strictEqual(JSON.stringify(st.cur), b); assert.strictEqual(S.dirty(st, 'pc'), false);
  });
  const st = mkSt(); assert.strictEqual(S.doiSoPhieu(st, 'p1', 'GL5-0102', {lyDo: 'thử đổi số', nguon: {loai: 'tay'}}, {loKhoa: V.chiDoc(lo())}).ok, true, 'lô chưa khóa đổi được');
});

/* ---- info.nguon.at: chỉ đổi khi dữ liệu thật đổi ---- */
test('LT-12 mức lưu trữ: info.nguon giữ nguyên "at" qua lưu/đọc/lưu lại; lưu lại không đổi băm dòng (nền cho quy tắc R7)', () => {
  const s = new Store(':memory:'); s.save(moi()); const h0 = rowOf(s, 'f1');
  for (let i = 0; i < 3; i++) s.save(s.load());
  assert.deepStrictEqual(rowOf(s, 'f1'), h0); assert.strictEqual(s.load().rs.r1.forests.f1.info.nguon.at, NGUON.at); s.close();
});
test.skip('LT-13 [THIẾU Ở GIAO DIỆN] info.nguon.at chỉ ghi khi dữ liệu lô thật đổi: áp dụng lần hai (T8) không đổi at/băm. Logic nằm ở ui/app/17-e-ghi-vao-ho-so.js (lkApply), hiện CHƯA ghi info.nguon và không có hàm thuần để gọi từ Node; bổ sung test khi có hàm thuần hoặc e2e (thiết kế LT-10, R7).', () => {});
