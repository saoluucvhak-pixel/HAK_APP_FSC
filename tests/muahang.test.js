'use strict';
const test = require('node:test');
const assert = require('node:assert');
const M = require('../src/muahang.js');

const A = () => M.clean({id: 'c1', ten: '  CÔNG TY  CP DĂM A ', mst: '0123456789-001', diaChi: ' KCN Điện Nam ', nguoiDaiDien: 'Nguyễn A', chucVu: 'Giám đốc', sdt: '0905 123 456', email: 'a@x.vn',
  diaChiGiao: [{id: 'a1', nhan: 'Kho cảng', diaChi: 'Cảng Kỳ Hà'}, {id: '', nhan: '', diaChi: ''}]});

test('chuẩn hóa: cắt khoảng trắng, MST 13 số dạng 10-3, bỏ địa chỉ giao rỗng', () => {
  const c = A(); assert.strictEqual(c.ten, 'CÔNG TY CP DĂM A'); assert.strictEqual(c.diaChi, 'KCN Điện Nam'); assert.strictEqual(c.mst, '0123456789-001'); assert.strictEqual(c.diaChiGiao.length, 1);
  assert.strictEqual(M.normMst('0123 456.789-001'), '0123456789001'); assert.strictEqual(M.mstShow('0123456789'), '0123456789');
  assert.ok(M.mstValid('') && M.mstValid('0123456789') && M.mstValid('0123456789-001') && !M.mstValid('12345') && !M.mstValid('01234567890'));
});

test('bắt buộc tên và địa chỉ; MST trùng chỉ cảnh báo, không chặn', () => {
  assert.deepStrictEqual(M.validate(M.clean({ten: '', diaChi: ''}), {}, '').errors, ['Thiếu tên pháp lý của công ty', 'Thiếu địa chỉ công ty']);
  assert.deepStrictEqual(M.validate(M.clean({ten: 'X', diaChi: ''}), {}, '').errors, ['Thiếu địa chỉ công ty']);
  assert.deepStrictEqual(M.validate(M.clean({ten: 'X', diaChi: 'Y'}), {}, '').errors, []);
  const all = {c1: A(), c2: M.clean({id: 'c2', ten: 'CÔNG TY B', diaChi: 'KCN B', mst: '0123456789001'})};   // c2 trùng MST với c1 dù ghi khác dạng
  const v = M.validate(all.c2, all, 'c2'); assert.deepStrictEqual(v.errors, []); assert.ok(v.warnings.some(w => /Mã số thuế .* đã có ở công ty: CÔNG TY CP DĂM A/.test(w)));
  assert.strictEqual(M.validate(all.c1, {c1: all.c1}, 'c1').warnings.some(w => /đã có ở công ty/.test(w)), false);   // không tự trùng với chính nó
  assert.ok(M.validate(M.clean({ten: 'X', diaChi: 'Y', mst: '123', email: 'abc', sdt: 'x'}), {}, '').warnings.length >= 3);
  assert.ok(M.validate(M.clean({ten: 'X', diaChi: 'KCN A', diaChiGiao: [{id: 'a', nhan: 'k', diaChi: 'kcn a'}]}), {}, '').warnings.some(w => /trùng với một địa chỉ khác/.test(w)));
  assert.ok(M.validate({...M.newCompany(), ten: 'X', diaChi: 'Y', diaChiGiao: [{id: 'a', nhan: 'Kho', diaChi: ''}]}, {}, '').errors.some(e => /Kho/.test(e)));
});

test('nhiều địa chỉ: địa chỉ công ty luôn đầu tiên, chọn đúng địa chỉ giao', () => {
  const c = A(), ad = M.addressesOf(c);
  assert.deepStrictEqual(ad.map(a => [a.id, a.diaChi]), [['', 'KCN Điện Nam'], ['a1', 'Cảng Kỳ Hà']]);
  assert.strictEqual(M.addressOf(c, '').diaChi, 'KCN Điện Nam'); assert.strictEqual(M.addressOf(c, 'a1').nhan, 'Kho cảng'); assert.strictEqual(M.addressOf(c, 'zz'), null);
  const s = M.snapshot(c, 'a1', '2026-11-12T00:00:00Z'); assert.deepStrictEqual([s.congTyId, s.ten, s.diaChiId, s.diaChiNhan, s.diaChi], ['c1', 'CÔNG TY CP DĂM A', 'a1', 'Kho cảng', 'Cảng Kỳ Hà']);
  assert.strictEqual(M.snapshot(c, 'zz'), null);
});

test('điểm đến hiệu lực: công ty đã chọn ưu tiên, hồ sơ cũ dùng điểm đến nhập tay, mới thì rỗng', () => {
  const c = A(), snap = M.snapshot(c, 'a1');
  const d1 = M.diemDen({muaHang: snap}, {vcDiemDen: 'Nhà máy cũ'}); assert.strictEqual(d1.src, 'congty'); assert.strictEqual(d1.text, 'CÔNG TY CP DĂM A – Cảng Kỳ Hà'); assert.strictEqual(d1.diaChi, 'Cảng Kỳ Hà');
  const d2 = M.diemDen({}, {vcDiemDen: ' Nhà máy cũ '}); assert.deepStrictEqual([d2.src, d2.text, d2.ten], ['thucong', 'Nhà máy cũ', '']);
  assert.deepStrictEqual(M.diemDen({}, {}), {src: '', ten: '', diaChi: '', nhan: '', text: ''});
});

test('danh mục đổi địa chỉ: bản chụp trong hồ sơ giữ nguyên cho đến khi xác nhận; phát hiện đổi tên/địa chỉ, địa chỉ bị xóa, công ty bị xóa', () => {
  const c = A(), info = {muaHang: M.snapshot(c, 'a1')};
  assert.strictEqual(M.drift(info, {c1: c}).state, 'ok'); assert.strictEqual(M.drift({}, {c1: c}).state, 'none');
  const moved = {...c, diaChiGiao: [{id: 'a1', nhan: 'Kho cảng', diaChi: 'Cảng Chân Mây'}]};
  const d = M.drift(info, {c1: moved}); assert.strictEqual(d.state, 'thaydoi'); assert.strictEqual(d.saved.diaChi, 'Cảng Kỳ Hà'); assert.strictEqual(d.current.diaChi, 'Cảng Chân Mây'); assert.match(d.why, /địa chỉ/);
  assert.strictEqual(M.diemDen(info, {}).diaChi, 'Cảng Kỳ Hà');                               // điểm đến hiệu lực vẫn là bản đã lưu
  assert.match(M.drift(info, {c1: {...c, ten: 'TÊN MỚI'}}).why, /tên/);
  assert.strictEqual(M.drift(info, {c1: {...c, diaChiGiao: []}}).state, 'thaydoi');             // địa chỉ giao đã chọn bị xóa khỏi danh mục
  assert.strictEqual(M.drift(info, {}).state, 'xoa');
});

test('so “Nơi giao” trên phiếu với điểm đến theo hồ sơ: cảnh báo khi khác, bỏ qua khi trống, không phân biệt dấu/hoa thường', () => {
  const dd = M.diemDen({muaHang: M.snapshot(A(), '')}, {});   // CÔNG TY CP DĂM A – KCN Điện Nam
  assert.ok(M.noiGiaoKhop('', dd)); assert.ok(M.noiGiaoKhop('kcn dien nam', dd)); assert.ok(M.noiGiaoKhop('CÔNG TY CP DĂM A', dd)); assert.ok(M.noiGiaoKhop('Công ty CP dăm A, KCN Điện Nam', dd));
  assert.ok(!M.noiGiaoKhop('Cảng dăm Kỳ Hà', dd)); assert.ok(!M.noiGiaoKhop('Kho Điện Bàn', dd));
  const pc = [{soPhieu: '1', noiGiao: 'KCN Điện Nam'}, {soPhieu: '2', noiGiao: 'Cảng Kỳ Hà'}, {soPhieu: '3', noiGiao: ''}];
  assert.deepStrictEqual(M.mismatches(pc, dd).map(p => p.soPhieu), ['2']);
  assert.deepStrictEqual(M.mismatches(pc, M.diemDen({}, {})), []);                             // chưa có điểm đến: không có gì để đối chiếu
});
