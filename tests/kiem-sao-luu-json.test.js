'use strict';
/* Lô 2 (T-11, T-04) đợt sửa lỗi kiểm tra 4 agent của 3.1.0: khôi phục bản sao lưu toàn bộ .json phải KIỂM CẤU TRÚC và PHIÊN BẢN trước khi sao lưu hay ghi,
 * báo lỗi bằng tiếng Việt, không biến file v2 thiếu "v" thành dữ liệu v1 (làm mất rừng); hiển thị số không nguyên đúng kiểu Việt Nam; số tiền bằng chữ không ra "undefined". */
const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('fs'), os = require('os'), path = require('path');
const L = require('../src/lorung'), K = require('../src/khosaoluu'), {Store} = require('../src/store'), DP = require('../src/docphieucan');
const tmp = () => path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'hakqn-l2-')), 'hakqn.sqlite');
const lo = (id, ma) => ({id, info: {maRung: ma, tenRung: 'Rừng ' + ma}, nc: [], dx: [], pc: [], exp: {}});
const tot = () => ({v: 2, rs: {o1: {id: 'o1', info: {ma: 'C01', ten: 'NGUYEN VAN A', cccd: '049090001111'}, forests: {f1: lo('f1', 'R-1')}}}});
const XAU = {
  'lô là chuỗi': {v: 2, rs: {o1: {id: 'o1', info: {ten: 'A'}, forests: {f1: 'abc'}}}},
  'lô thiếu info': {v: 2, rs: {o1: {id: 'o1', info: {ten: 'A'}, forests: {f1: {id: 'f1', nc: []}}}}},
  'chủ rừng không có info': {v: 2, rs: {o1: {id: 'o1', forests: {}}}},
  'nhân công không phải danh sách đối tượng': {v: 2, rs: {o1: {id: 'o1', info: {ten: 'A'}, forests: {f1: Object.assign(lo('f1', 'R-1'), {nc: [1, 2]})}}}},
  'phiếu cân không phải danh sách': {v: 2, rs: {o1: {id: 'o1', info: {ten: 'A'}, forests: {f1: Object.assign(lo('f1', 'R-1'), {pc: 'x'})}}}},
  'danh sách chủ rừng là mảng': {v: 2, rs: [1]},
};

test('kiểm cấu trúc: file tốt qua, file v1 (chưa có rừng) được nhận ra là v1', () => {
  assert.deepEqual(L.kiemSaoLuu(tot()), {ok: true, v1: false, error: ''});
  assert.equal(L.kiemSaoLuu({rs: {o1: {id: 'o1', info: {ten: 'A'}, nc: [], dx: []}}}).v1, true);
  assert.equal(L.kiemSaoLuu({v: 2, rs: {}}).ok, true);
});

for (const [ten, o] of Object.entries(XAU)) {
  test('.json ' + ten + ': từ chối bằng tiếng Việt ở bước kiểm, xem trước và ghi; dữ liệu không đổi, không sinh bản "trước khi khôi phục"', () => {
    const k = L.kiemSaoLuu(o);
    assert.equal(k.ok, false); assert.match(k.error, /không đúng cấu trúc|không đúng định dạng/); assert.doesNotMatch(k.error, /[Uu]ndefined|Cannot read|is not/);
    const s = new Store(tmp()); s.save(tot()); const truoc = JSON.stringify(s.load());
    const dem = () => fs.existsSync(s.backupDir) ? fs.readdirSync(s.backupDir).filter(n => /truoc-khoi-phuc/.test(n)).length : 0;
    assert.throws(() => s.previewImport(o), /không đúng cấu trúc|không đúng định dạng/);
    for (const st of ['replace', 'skip', 'overwrite', 'both']) assert.throws(() => s.applyImport(o, st), /không đúng cấu trúc|không đúng định dạng/, st);
    assert.equal(JSON.stringify(s.load()), truoc); assert.equal(dem(), 0);
    s.close();
  });
}

test('.json v:3 (phiên bản mới hơn): từ chối, nêu phiên bản mới hơn; không chuyển như dữ liệu v1', () => {
  const o = Object.assign(tot(), {v: 3});
  const k = L.kiemSaoLuu(o); assert.equal(k.ok, false); assert.match(k.error, /phiên bản mới hơn/);
  const s = new Store(tmp()); s.save(tot());
  assert.throws(() => s.applyImport(o, 'replace'), /phiên bản mới hơn/);
  s.close();
});

test('.json thiếu "v" nhưng đã có rừng: là dữ liệu v2, giữ đủ rừng và công ty (không đi qua chuyển v1)', () => {
  const o = tot(); delete o.v; o.congTy = {ct1: {id: 'ct1', ten: 'CONG TY X'}};
  const k = L.kiemSaoLuu(o); assert.equal(k.ok, true); assert.equal(k.v1, false);
  const s = new Store(tmp()); s.applyImport(o, 'replace');
  const d = s.load(); assert.equal(d.rs.o1.forests.f1.info.maRung, 'R-1'); assert.equal(d.congTy.ct1.ten, 'CONG TY X');
  s.close();
});

test('kho sao lưu: .json cú pháp hỏng báo tiếng Việt, không lộ thông báo kỹ thuật tiếng Anh; .json sai cấu trúc bị kho báo không dùng được', () => {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'hakqn-l2k-')), f1 = path.join(d, 'HoSoKhaiThac_SaoLuu_a.json'), f2 = path.join(d, 'HoSoKhaiThac_SaoLuu_b.json');
  fs.writeFileSync(f1, '{"v":2,"rs":{"o1":{'); fs.writeFileSync(f2, JSON.stringify(XAU['lô là chuỗi']));
  const k1 = K.kiemTra(f1); assert.equal(k1.ok, false); assert.match(k1.error, /bị cắt dở/); assert.doesNotMatch(k1.error, /Expected|Unexpected|JSON at position/);
  const k2 = K.kiemTra(f2); assert.equal(k2.ok, false); assert.match(k2.error, /không đúng cấu trúc/);
});

test('giao diện: kiểm cấu trúc trước khi khôi phục .json, lỗi cú pháp tiếng Việt, không chọn sẵn "Thay toàn bộ" khi có mâu thuẫn', () => {
  const ui = f => fs.readFileSync(path.join(__dirname, '..', 'ui', 'app', f), 'utf8');
  const r = ui('15-du-lieu-cai-dat-sao-luu-lo.js'), fn = r.slice(r.indexOf('async function restoreAll'), r.indexOf('\n}\n', r.indexOf('async function restoreAll')));
  assert.match(fn, /HAKLoRung\.kiemSaoLuu\(/); assert.doesNotMatch(fn, /o\.v === 2 \? o : migrateV1\(o\)/);
  assert.match(fn, /bị cắt dở/);
  const t = ui('14-thao-tac.js'), imp = t.slice(t.indexOf('async function importWithPreview'), t.indexOf('async function importGo'));
  assert.doesNotMatch(imp, /value="replace"'[^\n]*blocked \? ' checked'/);
  assert.match(t.slice(t.indexOf('async function importGo')), /if \(!strat\) return note\(/);
});

test('hiển thị số không nguyên: fmt(1234.5) = "1.234,5"; fmt(0.12345) không còn "0.12.345"', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'ui', 'app', '01-cau-hinh-tien-ich.js'), 'utf8');
  const lay = n => src.split('\n').find(l => l.startsWith('const ' + n + ' =')) || '';
  const fn = new Function(src.slice(src.indexOf('const _nf'), src.indexOf('const formatVND')) + '\nconst trim = v => (v == null ? "" : String(v)).replace(/\\s+/g, " ").trim();\nconst formatVND = v => formatNumber(v, 0);\nlet numStyle = "vi";\n' +
    lay('numSwap') + '\n' + lay('fmtRaw') + '\n' + lay('fmt') + '\nreturn fmt;')();
  assert.equal(fn(1234.5), '1.234,5'); assert.equal(fn(1234567), '1.234.567'); assert.equal(fn(0.12345), '0,12345'); assert.equal(fn(12.5), '12,5');
  assert.equal(fn(''), ''); assert.equal(fn(null), ''); assert.equal(fn('12'), '12'); assert.equal(fn('1234'), '1.234');
});

test('số tiền bằng chữ: số lẻ phần thập phân không ra "undefined" (làm tròn đến đồng)', () => {
  const D = DP.create ? DP.create({}) : DP;
  const mw = D.moneyWords;
  assert.doesNotMatch(mw(12.5), /undefined/); assert.equal(mw(12.5), 'Mười ba đồng chẵn.');
  assert.equal(mw(1234567), 'Một triệu hai trăm ba mươi bốn nghìn năm trăm sáu mươi bảy đồng chẵn.');
  assert.doesNotMatch(mw(1000000.4), /undefined/);
});
