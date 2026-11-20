'use strict';
/* Phiếu #11: bản .json "Sao lưu toàn bộ" mang ĐỦ lịch sử bản chụp lô đã chốt (mọi phiên bản), khôi phục sang máy khác vẫn còn đủ — như bản .sqlite.
 * Bản chụp hỏng trong file bị bỏ qua và báo số lượng; file .json kiểu cũ (không có goiLichSu) khôi phục như trước. */
const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('fs'), os = require('os'), path = require('path');
const {Store} = require('../src/store');
const V = require('../src/vongdoi'), M = require('../src/model'), B = require('../src/backup');
const tmp = () => path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'hakqn-json-')), 'hakqn.sqlite');
const lo = (id, ma) => M.ensureForest({id, info: {maRung: ma, tenRung: 'Rừng ' + ma}, nc: [{ten: 'A', cccd: '049085000001'}], dx: [], exp: {},
  pc: Array.from({length: 5}, (_, i) => ({_id: 'p' + i, soPhieu: ma + '-' + i, ngay: '01/11/2026', bienSo: '92C-12345', kl: 10 + i}))});
/* máy A: lô f1 chốt hai lần (chốt → mở khóa → sửa → chốt lại), lô f2 chưa chốt */
function mayA() {
  const A = new Store(tmp());
  A.save({v: 2, rs: {r1: {id: 'r1', info: {ma: 'C', ten: 'CHỦ', cccd: '049067005459'}, forests: {f1: lo('f1', 'R-1'), f2: lo('f2', 'R-2')}}}});
  let db = A.load(); V.chot(db.rs.r1.forests.f1, 'KT', '2026-11-01T00:00:00Z', []); A.save(db);
  db = A.load(); V.moKhoa(db.rs.r1.forests.f1, 'sửa số', 'KT', '2026-11-02T00:00:00Z'); A.save(db);
  db = A.load(); db.rs.r1.forests.f1.pc[0].kl = 99; A.save(db);
  db = A.load(); V.chot(db.rs.r1.forests.f1, 'KT', '2026-11-03T00:00:00Z', []); A.save(db);
  return A;
}
async function saoLuuJson(A) {
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'hakqn-usb-'));
  const data = A.load({kemGoi: true}); data.goiLichSu = A.goiTatCa();
  const r = await B.backupAll({db: A.db, data, outDir: out});
  assert.ok(r.ok, r.message);
  return JSON.parse(fs.readFileSync(r.json.file, 'utf8'));
}

test('máy A có lịch sử [1, 2]; goiTatCa trả mọi bản chụp, đúng dấu vân tay', () => {
  const A = mayA();
  assert.deepEqual(A.dsGoi('f1').map(g => g.phienBan), [1, 2]);
  const all = A.goiTatCa();
  assert.equal(all.length, 2);
  all.forEach(g => assert.equal(V.bam(g.data), g.hash));
  A.close();
});

test('sao lưu JSON → khôi phục THAY TOÀN BỘ trên máy trống: lịch sử f1 đủ [1, 2], bản 1 đúng nội dung, lô vẫn nguyên vẹn và chỉ đọc', async () => {
  const A = mayA(), j = await saoLuuJson(A);
  assert.equal(j.goiLichSu.length, 2, 'file JSON mang 2 bản chụp');
  const Bm = new Store(tmp()); const kq = Bm.applyImport(j, 'replace');
  assert.equal(kq.goiBoQua, 0);
  assert.deepEqual(Bm.dsGoi('f1').map(g => g.phienBan), [1, 2]);
  assert.equal(Bm.docGoi('f1', 1).data, A.docGoi('f1', 1).data);
  assert.equal(Bm.kiemGoi('f1').ok, true);
  const f = Bm.load().rs.r1.forests.f1; assert.ok(V.nguyenVen(f, null, Bm.kiemGoi('f1')));
  assert.ok(!Bm.db.prepare("SELECT 1 FROM meta WHERE key='goiLichSu'").get(), 'goiLichSu không bị ghi vào meta');
  const d = Bm.load(); d.rs.r1.forests.f1.pc[1].kl = 1; assert.throws(() => Bm.save(d), e => e.code === 'LOCKED');
  A.close(); Bm.close();
});

test('khôi phục "giữ bản hiện có" lên máy trống (lô mới): lịch sử đi theo; lô đã có trên máy thì không chép lịch sử của file', async () => {
  const A = mayA(), j = await saoLuuJson(A);
  const B1 = new Store(tmp()); B1.applyImport(j, 'skip');
  assert.deepEqual(B1.dsGoi('f1').map(g => g.phienBan), [1, 2], 'lô mới: chép đủ');
  B1.close();
  const B2 = new Store(tmp()); B2.save({v: 2, rs: {r1: {id: 'r1', info: {ma: 'C', ten: 'CHỦ', cccd: '049067005459'}, forests: {f1: lo('f1', 'R-1')}}}});
  B2.applyImport(j, 'skip');
  assert.deepEqual(B2.dsGoi('f1'), [], 'lô f1 đã có và được giữ: không chép bản chụp của file');
  A.close(); B2.close();
});

test('một bản chụp trong file bị sửa: bỏ qua bản đó, báo số lượng, các bản khác vẫn khôi phục', async () => {
  const A = mayA(), j = await saoLuuJson(A);
  const g1 = j.goiLichSu.find(g => g.phien_ban === 1); g1.data = g1.data.replace('"kl":10', '"kl":11');
  const Bm = new Store(tmp()); const kq = Bm.applyImport(j, 'replace');
  assert.equal(kq.goiBoQua, 1);
  assert.deepEqual(Bm.dsGoi('f1').map(g => g.phienBan), [2]);
  A.close(); Bm.close();
});

test('file JSON kiểu cũ (không có goiLichSu) khôi phục như trước: chỉ bản chốt hiện hành', async () => {
  const A = mayA(), j = await saoLuuJson(A); delete j.goiLichSu;
  const Bm = new Store(tmp()); const kq = Bm.applyImport(j, 'replace');
  assert.equal(kq.goiBoQua, 0);
  assert.deepEqual(Bm.dsGoi('f1').map(g => g.phienBan), [2]);
  A.close(); Bm.close();
});
