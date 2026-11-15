'use strict';
/* Kiểm tra TOÀN VẸN hồ sơ đã chốt (src/vongdoi.js kiemGoi / kiemToanVen) và chặn khôi phục gói hỏng (src/lorung.js, src/store.js).
 * Hồi quy hai lỗi tái hiện ở cce3907: đổi riêng f.chot.hash mà nguyenVen() vẫn true; f.chot.goi = "{" làm nguyenVen() ném SyntaxError. */
const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('fs'), os = require('os'), path = require('path');
const V = require('../src/vongdoi'), M = require('../src/model'), L = require('../src/lorung');
const {Store} = require('../src/store');
const lo = (id = 'f1', ma = 'R-1') => M.ensureForest({id, info: {maRung: ma, tenRung: 'Rừng ' + ma}, nc: [{ten: 'A', cccd: '049085000001', vaiTro: 'Tổ trưởng'}], dx: [{bienSo: '92C-12345', chuXe: 'X'}], exp: {soKT: '01'},
  pc: [{soPhieu: ma + '-1', ngay: '01/11/2026', bienSo: '92C-12345', kl: 10}, {soPhieu: ma + '-2', ngay: '02/11/2026', bienSo: '92C-12345', kl: 12}]});
const chot = f => { assert.ok(V.chot(f, 'KT', '2026-11-01T00:00:00.000Z', []).ok); return f; };
const ma = (f, goi, kg) => V.kiemToanVen(f, goi, kg).ma;
const tmpDir = () => fs.mkdtempSync(path.join(os.tmpdir(), 'hakqn-toanven-'));

test('hồi quy cce3907: đổi riêng chot.hash → "dấu vân tay không khớp" (trước: nguyenVen vẫn true)', () => {
  const f = chot(lo()); assert.equal(ma(f), 'nguyen-ven');
  f.chot.hash = 'deadbeefdeadbeef';
  assert.equal(ma(f), 'hash-khong-khop'); assert.equal(V.nguyenVen(f), false);
  assert.match(V.kiemToanVen(f).lyDo, /deadbeefdeadbeef/);
});

test('hồi quy cce3907: gói JSON bị cắt dở ("{") → "gói hỏng", không ném lỗi (trước: SyntaxError)', () => {
  const f = chot(lo()); f.chot.goi = '{';
  assert.doesNotThrow(() => V.nguyenVen(f)); assert.equal(V.nguyenVen(f), false); assert.equal(ma(f), 'json-hong');
  const g = chot(lo()); g.chot.goi = g.chot.goi.slice(0, Math.floor(g.chot.goi.length / 2)); delete g.chot.hashDL;
  assert.equal(ma(g), 'json-hong');
});

test('JSON hợp lệ nhưng sai cấu trúc → "gói sai cấu trúc" (kể cả khi kẻ sửa tính lại dấu vân tay cho khớp)', () => {
  for (const goi of ['[]', '"x"', 'null', '{"x":1}', '{"info":{},"pc":{"a":1}}', '{"info":{"maRung":"R-1"},"chot":{}}', '{"id":"khac","info":{"maRung":"R-1"}}']) {
    const f = chot(lo()); f.chot.goi = goi; f.chot.hash = V.bam(goi); delete f.chot.hashDL;
    assert.equal(ma(f), 'sai-cau-truc', goi);
  }
});

test('dữ liệu nghiệp vụ hiện tại khác bản chụp → "dữ liệu khác"; đổi lại như cũ → nguyên vẹn', () => {
  const f = chot(lo());
  f.pc[0].kl = 99; assert.equal(ma(f), 'du-lieu-khac'); f.pc[0].kl = 10; assert.equal(ma(f), 'nguyen-ven');
  f.info.tenRung = 'ĐỔI'; assert.equal(ma(f), 'du-lieu-khac'); f.info.tenRung = 'Rừng R-1';
  f.exp.soKT = '02'; assert.equal(ma(f), 'du-lieu-khac');
});

test('thay đổi hợp lệ sau khi chốt (nhật ký, lưu trữ, thứ tự khóa) vẫn nguyên vẹn', () => {
  const f = chot(lo());
  assert.ok(V.luuTru(f, 't1').ok); f.nhatKy.push({at: 't2', hanh: 'ghichu', lyDo: 'x'});
  assert.equal(ma(f), 'nguyen-ven');
  const g = JSON.parse(JSON.stringify(f)), dao = Object.fromEntries(Object.entries(g).reverse()); dao.info = Object.fromEntries(Object.entries(g.info).reverse());
  assert.equal(ma(dao), 'nguyen-ven', 'chỉ khác thứ tự khóa');
});

test('gói do bản cũ tạo (chưa có đội, có nhật ký trong gói, chưa có hashDL) không bị báo nhầm', () => {
  const cu = {id: 'f9', info: {maRung: 'R-9', tenRung: 'Lô cũ'}, nc: [{ten: 'B', cccd: '049085000009', vaiTro: 'Công nhân'}], dx: [], pc: [{soPhieu: '1', ngay: '1/11/2026', bienSo: '92C-1', kl: 5}], nhatKy: [{at: 't0', hanh: 'mokhoa', lyDo: 'x'}]};
  const copy = JSON.parse(JSON.stringify(cu)), goi = JSON.stringify(copy);
  const f = M.ensureForest(Object.assign(JSON.parse(JSON.stringify(cu)), {chot: {at: 't', nguoi: 'KT', phienBan: 1, hash: V.bam(goi), goi}}));   // mở bằng bản mới: lô được chuẩn hóa có đội
  assert.ok(!JSON.parse(goi).doi && Array.isArray(f.doi), 'gói chưa có đội, lô hiện tại đã có');
  assert.equal(ma(f), 'nguyen-ven');
  f.pc[0].kl = 6; assert.equal(ma(f), 'du-lieu-khac', 'vẫn phát hiện thay đổi thật');
});

test('thiếu gói, thiếu dấu vân tay; hashDL ghi trong lô bị sửa → không khớp; lô chưa chốt → chưa chốt (ok)', () => {
  let f = chot(lo()); delete f.chot.goi; assert.equal(ma(f), 'thieu-goi');
  f = chot(lo()); f.chot.hash = ''; assert.equal(ma(f), 'thieu-hash');
  f = chot(lo()); f.chot.hashDL = '0000000000000000'; assert.equal(ma(f), 'hash-khong-khop');
  const k = V.kiemToanVen(lo()); assert.equal(k.ma, 'chua-chot'); assert.ok(k.ok);
  f = chot(lo()); f.chot.hash = 'x'; const r = V.kiemToanVen(f); assert.equal(r.maLo, 'R-1'); assert.equal(r.phienBan, 1); assert.ok(r.ten && r.lyDo);
});

test('kiểm tra không sửa lô: không mở khóa, không chốt lại, không tính dấu vân tay mới cho gói hỏng', () => {
  const f = chot(lo()); f.chot.goi = '{'; delete f.chot.hashDL; const truoc = JSON.stringify(f);
  V.kiemToanVen(f); V.nguyenVen(f); assert.equal(V.ganHashDL(f), false);
  assert.equal(JSON.stringify(f), truoc); assert.ok(V.chiDoc(f));
});

test('SQLite: gói hỏng trong chot_goi → kiemGoi báo json-hong; đọc dữ liệu và các lô khác vẫn bình thường; không tự sửa gói', () => {
  const s = new Store(':memory:'), db = {v: 2, rs: {r1: {id: 'r1', info: {ma: 'C', ten: 'CHỦ', cccd: '049067005459'}, forests: {f1: chot(lo('f1', 'R-1')), f2: chot(lo('f2', 'R-2')), f3: lo('f3', 'R-3')}}}};
  s.save(db);
  assert.equal(s.kiemGoi('f1').ma, 'ok'); assert.equal(s.kiemGoi('f3').ma, 'chua-chot');
  s.db.prepare("UPDATE chot_goi SET data='{' WHERE forest_id='f1'").run();
  const k = s.kiemGoi('f1'); assert.equal(k.ma, 'json-hong'); assert.equal(k.phienBan, 1);
  const D = s.load(); assert.equal(V.kiemToanVen(D.rs.r1.forests.f1, null, s.kiemGoi('f1')).ma, 'json-hong');
  assert.equal(V.kiemToanVen(D.rs.r1.forests.f2, null, s.kiemGoi('f2')).ma, 'nguyen-ven', 'lô khác không bị ảnh hưởng');
  assert.equal(s.save(D).changed, 0, 'lưu lại không đụng lô / gói'); assert.equal(s.docGoi('f1').data, '{', 'gói hỏng giữ nguyên để đối chiếu');
  s.db.prepare("UPDATE forests SET data=json_set(data, '$.chot.hash', 'zzz') WHERE id='f2'").run();
  assert.equal(s.kiemGoi('f2').ma, 'hash-khong-khop');
  s.close();
});

function mayDich() {
  const dir = tmpDir(), file = path.join(dir, 'd.sqlite'), s = new Store(file);
  s.save({v: 2, rs: {r1: {id: 'r1', info: {ma: 'C', ten: 'CHỦ', cccd: '049067005459'}, forests: {f1: chot(lo('f1', 'R-1')), f2: lo('f2', 'R-2')}}}});
  return {s, dir, bk: () => (fs.existsSync(path.join(dir, 'backups')) ? fs.readdirSync(path.join(dir, 'backups')).length : 0)};
}
const goiLo = (f, sua) => { const pkg = L.exportLot({rs: {r1: {id: 'r1', info: {ma: 'C', ten: 'CHỦ', cccd: '049067005459'}, forests: {[f.id]: f}}}}, 'r1', f.id, {now: 't'}); sua(pkg.lo); return pkg; };

test('khôi phục MỘT lô đã chốt: gói hỏng / dấu vân tay đổi / sai cấu trúc / dữ liệu khác → dừng ở xem trước và khi ghi; máy đích, lô khác, file nguồn giữ nguyên', () => {
  const ca = {
    'dấu vân tay bị đổi': x => { x.chot.hash = 'deadbeefdeadbeef'; },
    'JSON bị cắt': x => { x.chot.goi = x.chot.goi.slice(0, 20); },
    'JSON sai cấu trúc': x => { x.chot.goi = '{"x":1}'; x.chot.hash = V.bam(x.chot.goi); delete x.chot.hashDL; },
    'dữ liệu khác bản chụp': x => { x.pc[0].kl = 999; },
    'thiếu gói': x => { delete x.chot.goi; }
  };
  for (const [ten, sua] of Object.entries(ca)) {
    const {s, bk} = mayDich(), truoc = JSON.stringify(s.load()), b0 = bk();
    const f = chot(lo('f1', 'R-1')); const pkg = goiLo(f, sua), nguon = JSON.stringify(pkg);
    const P = s.previewLot(pkg);
    assert.equal(P.ok, false, ten); assert.ok(P.conflicts.some(c => c.loai === 'toanVen'), ten); assert.match(P.conflicts.find(c => c.loai === 'toanVen').moTa, /R-1/);
    assert.throws(() => s.applyLot(pkg, 'thay'), e => e.code === 'GOI_HONG', ten);
    assert.equal(JSON.stringify(s.load()), truoc, ten + ': SQLite không đổi'); assert.equal(bk(), b0, ten + ': không sao lưu / ghi gì');
    assert.equal(JSON.stringify(pkg), nguon, ten + ': gói nguồn không bị sửa');
    s.close();
  }
});

test('khôi phục MỘT lô đã chốt nguyên vẹn (kể cả nhật ký đổi sau khi chốt) vẫn được; sau khôi phục kiểm trên SQLite là nguyên vẹn', () => {
  const {s} = mayDich(), f = chot(lo('f1', 'R-1')); V.luuTru(f, 't9');
  const pkg = goiLo(f, () => {}); assert.ok(s.previewLot(pkg).ok);
  const r = s.applyLot(pkg, 'thay'); assert.ok(r.doi);
  assert.equal(V.kiemToanVen(s.load().rs.r1.forests.f1, null, s.kiemGoi('f1')).ma, 'nguyen-ven');
  s.close();
});

test('khôi phục TOÀN BỘ có lô đã chốt hỏng: xem trước báo mâu thuẫn; mọi cách xử lý (kể cả thay toàn bộ) dừng trước khi ghi', () => {
  const {s, bk} = mayDich(), truoc = JSON.stringify(s.load()), b0 = bk();
  const inc = JSON.parse(truoc); inc.rs.r1.forests.f1 = chot(lo('f1', 'R-1')); inc.rs.r1.forests.f1.chot.goi = '{';
  const p = s.previewImport(inc, {strategy: 'skip'}); assert.ok(p.plan.conflicts.some(c => c.loai === 'toanVen'));
  for (const st of ['skip', 'overwrite', 'both', 'replace']) assert.throws(() => s.applyImport(inc, st, {}), e => e.code === 'GOI_HONG', st);
  assert.equal(JSON.stringify(s.load()), truoc); assert.equal(bk(), b0);
  s.close();
});
