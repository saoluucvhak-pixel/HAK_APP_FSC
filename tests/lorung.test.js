'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs'), os = require('os'), path = require('path'), crypto = require('crypto');
const {Store} = require('../src/store');
const L = require('../src/lorung');
const sha = s => crypto.createHash('sha256').update(s).digest('hex');
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'hakqn-lo-'));
const clone = o => JSON.parse(JSON.stringify(o));

const pc = (so, kl, ngay = '05/10/2026') => ({_row: 2, stt: '1', ngay, bienSo: '92C-12345', soPhieu: so, kl, noiGiao: 'NM', ghiChu: ''});
const lot = (id, ma, kl) => ({id, info: {maRung: ma, tenRung: 'Lô ' + ma, vanChuyen: {mode: 'coDinh', coDinh: 52000, bac: []}, muaHang: {congTyId: 'c9', ten: 'CÔNG TY MUA', mst: '', diaChiId: '', diaChiNhan: 'Địa chỉ công ty', diaChi: 'KCN X', xacNhan: '2026-10-01T00:00:00.000Z'}},
  nc: [{ten: 'NV 1', chucDanh: 'Tổ trưởng'}], dx: [{bienSo: '92C-12345', chuXe: 'XE'}], pc: [pc('P1-' + ma, kl), pc('P2-' + ma, kl)], exp: {soVC: '07'}, ncFile: 'nc.xlsx', ncAt: '2026-10-02'});
const base = () => ({v: 2, dinhMuc: {'Tổ trưởng': {qa: '1 bộ'}, 'Phụ': {qa: 'x'}}, bienAlias: {'92c12345': '92C-12345', 'khac': '11A-1'}, congTy: {}, rs: {
  o1: {id: 'o1', info: {ma: 'CR-1', ten: 'CHỦ MỘT', cccd: '049000000001'}, forests: {fa: lot('fa', 'LO-A', 10), fb: lot('fb', 'LO-B', 20)}},
  o2: {id: 'o2', info: {ma: 'CR-2', ten: 'CHỦ HAI', cccd: '049000000002'}, forests: {fc: lot('fc', 'LO-C', 30)}}}});
const open = (d, name = 'a.sqlite') => { const s = new Store(path.join(d, name)); return s; };

test('ghi đè khi khôi phục chỉ thay ĐÚNG lô trùng, giữ lô khác của chủ và chủ khác', () => {
  const d = tmp(), s = open(d); s.save(base());
  const file = {v: 2, rs: {o1: {id: 'o1', info: {ma: 'CR-1', ten: 'CHỦ MỘT', cccd: '049000000001'}, forests: {fa: Object.assign(lot('fa', 'LO-A', 99), {})}}}};   // file chỉ có lô A
  const pv = s.previewImport(file), o = pv.plan.owners[0];
  assert.strictEqual(o.forests[0].state, 'trung'); assert.deepStrictEqual(o.giu.map(x => x.ma), ['LO-B'], 'xem trước báo lô B được GIỮ');
  const r = s.applyImport(file, 'overwrite'); assert.ok(fs.existsSync(r.backup));
  const db = s.load();
  assert.strictEqual(db.rs.o1.forests.fa.pc[0].kl, 99, 'lô A bị thay');
  assert.deepStrictEqual(db.rs.o1.forests.fb, base().rs.o1.forests.fb, 'lô B giữ nguyên');
  assert.deepStrictEqual(db.rs.o2, base().rs.o2, 'chủ khác giữ nguyên');
});

test('skip giữ bản trên máy; lô mới trong file được thêm vào ĐÚNG chủ đã có', () => {
  const s = open(tmp()); s.save(base());
  const file = {v: 2, rs: {o1: {id: 'o1', info: {ma: 'CR-1', ten: 'CHỦ MỘT', cccd: '049000000001'}, forests: {fa: lot('fa', 'LO-A', 99), fz: lot('fz', 'LO-Z', 5)}}}};
  const pv = s.previewImport(file).plan.owners[0]; assert.deepStrictEqual(pv.forests.map(f => f.state), ['trung', 'moi']);
  s.applyImport(file, 'skip'); const db = s.load();
  assert.strictEqual(db.rs.o1.forests.fa.pc[0].kl, 10); assert.ok(db.rs.o1.forests.fz); assert.ok(db.rs.o1.forests.fb);
});

test('mâu thuẫn ID / mã lô / chủ rừng: dừng, không ghi, không sao lưu, liệt kê hồ sơ', () => {
  const d = tmp(), s = open(d); s.save(base()); const before = JSON.stringify(s.load());
  const cases = {
    'ID lô khớp A nhưng mã lô khớp B': {o1: {id: 'o1', info: {ma: 'CR-1', cccd: '049000000001', ten: 'x'}, forests: {fa: lot('fa', 'LO-B', 1)}}},
    'mã lô đã có dưới chủ khác': {o1: {id: 'o1', info: {ma: 'CR-1', cccd: '049000000001', ten: 'x'}, forests: {fq: lot('fq', 'LO-C', 1)}}},
    'chủ không khớp mà mã lô đã có trên máy': {oz: {id: 'oz', info: {ma: 'CR-9', cccd: '049000000009', ten: 'x'}, forests: {fq: lot('fq', 'LO-A', 1)}}},
    'ID chủ khớp chủ 1 nhưng CCCD khớp chủ 2': {o1: {id: 'o1', info: {ma: 'CR-1', cccd: '049000000002', ten: 'x'}, forests: {}}},
    'mã lô trùng hai lần trong file': {oz: {id: 'oz', info: {ma: 'CR-9', cccd: '049000000009', ten: 'x'}, forests: {f1: lot('f1', 'LO-N', 1), f2: lot('f2', 'LO-N', 2)}}}};
  for (const [name, rs] of Object.entries(cases)) {
    const pv = s.previewImport({v: 2, rs}); assert.ok(!pv.plan.ok && pv.plan.conflicts.length, 'xem trước phải báo mâu thuẫn: ' + name);
    for (const st of ['skip', 'overwrite', 'both']) assert.throws(() => s.applyImport({v: 2, rs}, st), /mâu thuẫn/, name + ' / ' + st);
  }
  assert.strictEqual(JSON.stringify(s.load()), before);
  assert.ok(!fs.existsSync(path.join(d, 'backups')) || fs.readdirSync(path.join(d, 'backups')).every(f => !f.startsWith('truoc-khoi-phuc')), 'không sao lưu/ghi khi dừng vì mâu thuẫn');
});

test('lỗi giữa giao dịch (ghi đè): hoàn tác toàn bộ, kể cả phần đã ghi trước đó', () => {
  const d = tmp(), s = open(d); s.save(base()); const before = JSON.stringify(s.load());
  s.db.exec("CREATE TRIGGER sap BEFORE UPDATE ON forests WHEN NEW.ma_rung='LO-A' BEGIN SELECT RAISE(ABORT, 'loi gia lap giua giao dich'); END;");
  const file = {v: 2, rs: {o7: {id: 'o7', info: {ma: 'CR-7', ten: 'CHỦ MỚI', cccd: '049000000007'}, forests: {}}, o1: {id: 'o1', info: {ma: 'CR-1', cccd: '049000000001', ten: 'x'}, forests: {fa: lot('fa', 'LO-A', 77)}}}};
  assert.throws(() => s.applyImport(file, 'overwrite'), /loi gia lap/);
  assert.strictEqual(JSON.stringify(s.load()), before, 'chủ mới ghi trước đó cũng phải được hoàn tác');
  assert.throws(() => s.applyLot(L.parsePackage(JSON.stringify(L.seal(L.exportLot((() => { const x = base(); x.rs.o1.forests.fa.pc[0].kl = 55; return x; })(), 'o1', 'fa'), sha)), sha).pkg, 'thay'), /loi gia lap/);
  assert.strictEqual(JSON.stringify(s.load()), before);
});

test('thay toàn bộ: bản sao lưu cũ chưa có danh mục công ty thì không xóa danh mục của máy; có sao lưu trước', () => {
  const s = open(tmp()); const b = base(); b.congTy = {c1: {id: 'c1', ten: 'X', diaChi: 'Y', diaChiGiao: []}}; s.save(b);
  const r = s.applyImport({v: 2, rs: {}}, 'replace'); assert.ok(fs.existsSync(r.backup));
  assert.deepStrictEqual(Object.keys(s.load().congTy), ['c1']); assert.strictEqual(Object.keys(s.load().rs).length, 0);
});

test('gói lô: đúng một lô, đủ dữ liệu, không lẫn lô/chủ khác, có loại, phiên bản, thời điểm, nhận diện chủ', () => {
  const db = base(), pkg = L.seal(L.exportLot(db, 'o1', 'fa', {now: '2026-10-20T01:00:00.000Z', version: '1.1.0'}), sha);
  assert.strictEqual(pkg.loai, 'HAKQN_LO_RUNG'); assert.strictEqual(pkg.dinhDang, 1); assert.strictEqual(pkg.xuatLuc, '2026-10-20T01:00:00.000Z'); assert.strictEqual(pkg.maLo, 'LO-A');
  assert.strictEqual(pkg.chuRung.info.cccd, '049000000001'); assert.ok(!pkg.chuRung.forests);
  assert.deepStrictEqual(pkg.lo, db.rs.o1.forests.fa, 'đủ dữ liệu lô: thông tin, nhân công, xe, phiếu cân, đơn giá, cấu hình biểu mẫu, dấu vết nhập, công ty đã chốt');
  assert.strictEqual(pkg.lo.info.muaHang.diaChi, 'KCN X');
  const txt = JSON.stringify(pkg);
  for (const kh of ['LO-B', 'LO-C', 'CHỦ HAI', '049000000002', 'lookup', 'token', 'refresh']) assert.ok(!txt.includes(kh), 'không chứa: ' + kh);
  assert.deepStrictEqual(Object.keys(pkg.dungChung.dinhMuc), ['Tổ trưởng'], 'chỉ định mức lô cần'); assert.deepStrictEqual(Object.keys(pkg.dungChung.bienAlias), ['92c12345']);
  assert.deepStrictEqual(pkg.kiemTra, {nc: 1, dx: 1, pc: 2, tongTan: 20});
  assert.strictEqual(L.fileName(pkg, '2026-10-20'), 'HAKQN_LoRung_LO-A_2026-10-20.json');
});

test('xuất A, sửa A, khôi phục A: A về đúng bản sao lưu, B và chủ khác giữ nguyên; mặc định giữ bản hiện có', () => {
  const d = tmp(), s = open(d); s.save(base());
  const pkg = L.seal(L.exportLot(s.load(), 'o1', 'fa'), sha);
  const db = s.load(); db.rs.o1.forests.fa.pc.push(pc('PX', 5)); db.rs.o1.forests.fa.info.tenRung = 'ĐÃ SỬA'; db.rs.o1.forests.fb.pc.push(pc('PB', 1)); s.save(db);
  const edited = JSON.stringify(s.load());
  let pv = s.previewLot(pkg); assert.strictEqual(pv.lo.state, 'trung'); assert.strictEqual(pv.existing.pc, 3); assert.strictEqual(pv.incoming.pc, 2); assert.deepStrictEqual(pv.giuTrongChu.map(x => x.ma), ['LO-B']);
  let r = s.applyLot(pkg); assert.strictEqual(r.doi, false, 'mặc định giữ bản hiện có'); assert.strictEqual(JSON.stringify(s.load()), edited);
  r = s.applyLot(pkg, 'thay'); assert.ok(r.doi && fs.existsSync(r.backup));
  const after = s.load();
  assert.deepStrictEqual(after.rs.o1.forests.fa, base().rs.o1.forests.fa, 'A trở lại đúng bản sao lưu');
  assert.strictEqual(after.rs.o1.forests.fb.pc.length, 3, 'B giữ nguyên (kể cả chỉnh sửa mới)'); assert.deepStrictEqual(after.rs.o2, base().rs.o2);
});

test('cùng ca, qua luồng nhập bản sao lưu toàn bộ cũ với lựa chọn ghi đè', () => {
  const s = open(tmp()); s.save(base()); const full = clone(s.load());                    // "bản sao lưu cũ" toàn bộ
  const db = s.load(); db.rs.o1.forests.fa.pc.push(pc('PX', 5)); db.rs.o1.forests.fb.pc.push(pc('PB', 1)); db.rs.o2.forests.fc.pc.push(pc('PC', 2)); s.save(db);
  const justA = {v: 2, rs: {o1: Object.assign(clone(full.rs.o1), {forests: {fa: full.rs.o1.forests.fa}})}};              // file chỉ chứa lô A
  s.applyImport(justA, 'overwrite'); const after = s.load();
  assert.deepStrictEqual(after.rs.o1.forests.fa, full.rs.o1.forests.fa); assert.strictEqual(after.rs.o1.forests.fb.pc.length, 3); assert.strictEqual(after.rs.o2.forests.fc.pc.length, 3);
  s.applyImport(full, 'overwrite'); assert.deepStrictEqual(s.load().rs.o1.forests.fb, full.rs.o1.forests.fb, 'ghi đè bằng bản sao lưu đầy đủ vẫn đúng');
});

test('chuyển sang máy mới: tạo chủ mới, đủ dữ liệu, tổng tấn khớp, thêm thiết lập dùng chung còn thiếu, giữ thiết lập của máy đích', () => {
  const src = open(tmp(), 's.sqlite'); src.save(base());
  const pkg = L.parsePackage(JSON.stringify(L.seal(L.exportLot(src.load(), 'o1', 'fa'), sha)), sha).pkg;
  const dst = open(tmp(), 'd.sqlite'); dst.save({v: 2, dinhMuc: {'Tổ trưởng': {qa: '2 bộ (máy đích)'}}, rs: {}, congTy: {}});
  const pv = dst.previewLot(pkg); assert.strictEqual(pv.chu.state, 'moi'); assert.strictEqual(pv.lo.state, 'moi');
  assert.ok(pv.dungChung.khac.some(x => /Tổ trưởng/.test(x))); assert.ok(pv.dungChung.them.some(x => /92c12345/.test(x))); assert.ok(pv.ghiChu.some(x => /CÔNG TY MUA/.test(x)));
  const r = dst.applyLot(pkg); assert.ok(r.doi); const db = dst.load();
  const oid = Object.keys(db.rs)[0]; assert.strictEqual(db.rs[oid].info.cccd, '049000000001');
  const f = Object.values(db.rs[oid].forests)[0]; assert.deepStrictEqual(f, base().rs.o1.forests.fa);
  assert.strictEqual(L.sumKl(f.pc), 20); assert.strictEqual(db.dinhMuc['Tổ trưởng'].qa, '2 bộ (máy đích)', 'giữ thiết lập của máy đích'); assert.strictEqual(db.bienAlias['92c12345'], '92C-12345');
  assert.strictEqual(f.info.muaHang.diaChi, 'KCN X');
});

test('máy đích chưa có định mức: không tạo khóa dinhMuc rỗng làm mất định mức mặc định', () => {
  const dst = open(tmp()); dst.save({v: 2, rs: {}}); const src = base(); src.dinhMuc = {};
  dst.applyLot(L.parsePackage(L.exportLot(src, 'o1', 'fa')).pkg); assert.ok(!('dinhMuc' in dst.load()) || Object.keys(dst.load().dinhMuc).length === 0);
});

test('thêm lô vào đúng chủ đã có (khớp theo CCCD dù khác ID); nhập lại cùng file không đổi gì', () => {
  const src = open(tmp(), 's.sqlite'); src.save(base()); const pkg = L.seal(L.exportLot(src.load(), 'o1', 'fb'), sha);
  const dst = open(tmp(), 'd.sqlite'); const b = base(); delete b.rs.o1.forests.fb; b.rs.o1x = b.rs.o1; delete b.rs.o1; b.rs.o1x.id = 'o1x'; dst.save(b);     // cùng chủ, khác ID nội bộ, chưa có lô B
  const pv = dst.previewLot(pkg); assert.strictEqual(pv.chu.state, 'co'); assert.strictEqual(pv.chu.existingId, 'o1x'); assert.strictEqual(pv.lo.state, 'moi');
  assert.ok(dst.applyLot(pkg).doi); assert.ok(dst.load().rs.o1x.forests.fb); assert.strictEqual(Object.keys(dst.load().rs).length, 2);
  const snap = JSON.stringify(dst.load()); assert.strictEqual(dst.previewLot(pkg).lo.state, 'trung'); assert.strictEqual(dst.applyLot(pkg).doi, false); assert.strictEqual(JSON.stringify(dst.load()), snap);
});

test('mã lô trùng dưới chủ khác: dừng, không ghi', () => {
  const src = open(tmp(), 's.sqlite'); src.save(base()); const pkg = L.exportLot(src.load(), 'o1', 'fa');
  const dst = open(tmp(), 'd.sqlite'); const b = base(); b.rs.o2.forests.fq = lot('fq', 'LO-A', 1); delete b.rs.o1.forests.fa; dst.save(b); const before = JSON.stringify(dst.load());   // LO-A thuộc chủ HAI trên máy đích
  const pv = dst.previewLot(pkg); assert.ok(!pv.ok); assert.match(pv.conflicts[0].moTa, /CHỦ HAI/);
  assert.throws(() => dst.applyLot(pkg, 'thay'), /đối chiếu/); assert.strictEqual(JSON.stringify(dst.load()), before);
});

test('file hỏng, sai loại, sai phiên bản, thiếu mã lô hoặc chủ, bị sửa: báo lỗi trước khi ghi', () => {
  const good = L.seal(L.exportLot(base(), 'o1', 'fa'), sha), txt = JSON.stringify(good), P = (o, h = sha) => L.parsePackage(typeof o === 'string' ? o : JSON.stringify(o), h);
  assert.ok(P(txt).ok);
  assert.match(P('{không phải json').error, /JSON/);
  assert.match(P(txt.slice(0, txt.length - 40)).error, /JSON/, 'file cắt dở');
  assert.match(P({v: 2, rs: {}}).error, /TOÀN BỘ/); assert.match(P({a: 1}).error, /không phải gói/);
  assert.match(P(Object.assign(clone(good), {dinhDang: 2})).error, /mới hơn/); assert.match(P(Object.assign(clone(good), {dinhDang: 0})).error, /Sai phiên bản/);
  const noMa = clone(good); noMa.lo.info.maRung = ''; assert.match(P(noMa).error, /mã lô/);
  const noOwner = clone(good); delete noOwner.chuRung; assert.match(P(noOwner).error, /chủ rừng/);
  const multi = clone(good); multi.lo.forests = {x: {}}; assert.match(P(multi).error, /đúng một lô/);
  const tamper = clone(good); tamper.lo.pc[0].kl = 999; assert.match(P(tamper).error, /hỏng|sửa/);
  const noSeal = clone(good); delete noSeal.maKiemTra; assert.match(P(noSeal).error, /hỏng|sửa/);
  const badNc = clone(good); badNc.lo.nc = 'x'; assert.match(L.parsePackage(badNc).error, /bị hỏng/);
  // bản sao lưu toàn bộ không đi qua luồng lô và ngược lại
  assert.ok(!P({v: 2, rs: {}}).ok);
});
