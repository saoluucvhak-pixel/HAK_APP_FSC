'use strict';
const test = require('node:test'), assert = require('node:assert');
const C = require('../src/culy'), MH = require('../src/muahang');

test('haversine: 1 độ vĩ độ ≈ 111,2 km; Đà Nẵng đến Huế ≈ 80 km đường chim bay; cùng điểm = 0', () => {
  assert.ok(Math.abs(C.haversine(15, 108, 16, 108) - 111.19) < 0.1);
  const dn = C.haversine(16.0544, 108.2022, 16.4637, 107.5909); assert.ok(dn > 75 && dn < 85, String(dn));
  assert.strictEqual(C.haversine(15.5, 108.5, 15.5, 108.5), 0);
});
test('parseToaDo: dán từ Google Maps, dấu phẩy thập phân, sai dạng và ngoài miền giá trị', () => {
  assert.deepStrictEqual(C.parseToaDo('15.912345, 108.123456'), {lat: 15.912345, lng: 108.123456});
  assert.deepStrictEqual(C.parseToaDo('15,912345; 108,123456'), {lat: 15.912345, lng: 108.123456});
  assert.deepStrictEqual(C.parseToaDo('15,912345 108,123456'), {lat: 15.912345, lng: 108.123456});
  assert.strictEqual(C.parseToaDo(''), null); assert.strictEqual(C.parseToaDo('abc'), null); assert.strictEqual(C.parseToaDo('15.9'), null);
  assert.strictEqual(C.parseToaDo('95, 108'), null); assert.strictEqual(C.parseToaDo('15, 200'), null);
  assert.ok(C.inVN(15.9, 108.1) && !C.inVN(108.1, 15.9));   // đảo vĩ độ với kinh độ
});
test('cự ly hiệu lực: nhập tay được ưu tiên; không có thì tự tính từ tọa độ rừng đến tọa độ nơi giao; thiếu tọa độ thì nêu lý do', () => {
  const info = {lat: 15.5, lng: 108.0, muaHang: {lat: 15.5, lng: 108.4, ten: 'X'}};
  const a = C.eff(info); assert.strictEqual(a.nguon, 'tự tính'); assert.ok(Math.abs(a.km - 42.9) < 0.3, String(a.km)); assert.strictEqual(a.km, C.auto(info));
  assert.deepStrictEqual([C.eff({...info, cuLy: 60}).km, C.eff({...info, cuLy: 60}).nguon, C.eff({...info, cuLy: 60}).auto], [60, 'nhập tay', a.km]);
  assert.strictEqual(C.eff({...info, cuLy: 0}).nguon, 'tự tính');   // 0 hoặc trống: dùng số tự tính
  assert.strictEqual(C.eff({...info, cuLy: null}).nguon, 'tự tính');
  const noTo = C.eff({lat: 15.5, lng: 108, muaHang: {ten: 'X'}}); assert.deepStrictEqual([noTo.km, noTo.nguon], [null, '']); assert.ok(/tọa độ nơi giao/.test(noTo.thieu) && !/tọa độ rừng/.test(noTo.thieu));
  const none = C.eff({}); assert.ok(/tọa độ rừng.*tọa độ nơi giao/.test(none.thieu));
  assert.strictEqual(C.eff({lat: 15.5, lng: 108, muaHang: {lat: 15.5, lng: 108}}).km, null);   // hai điểm trùng
});
test('công ty mua hàng: tọa độ trụ sở và địa chỉ giao được giữ, kiểm tra miền giá trị, bản chụp mang tọa độ, đổi tọa độ trong danh mục là “thay đổi”', () => {
  const c = MH.clean({id: 'c1', ten: 'A', diaChi: 'Đ', lat: '15,5', lng: 108.4, diaChiGiao: [{id: 'k1', nhan: 'Kho', diaChi: 'Kho 1', lat: 16, lng: 108}]});
  assert.deepStrictEqual([c.lat, c.lng, c.diaChiGiao[0].lat, c.diaChiGiao[0].lng], [15.5, 108.4, 16, 108]);
  assert.deepStrictEqual(MH.validate(c, {}, 'c1').errors, []);
  assert.ok(MH.validate(MH.clean({...c, lat: 95}), {}, 'c1').errors.some(e => /vĩ độ/.test(e)));
  assert.ok(MH.validate(MH.clean({...c, lng: null}), {}, 'c1').errors.some(e => /thiếu vĩ độ hoặc kinh độ/.test(e)));
  assert.ok(MH.validate(MH.clean({...c, lat: 30, lng: 108}), {}, 'c1').warnings.some(w => /ngoài Việt Nam/.test(w)));
  const snap = MH.snapshot(c, 'k1', 'now'); assert.deepStrictEqual([snap.lat, snap.lng], [16, 108]);
  assert.deepStrictEqual([MH.snapshot(c, '', 'now').lat, MH.snapshot(c, '', 'now').lng], [15.5, 108.4]);
  const info = {muaHang: snap}; assert.deepStrictEqual([MH.diemDen(info, {}).lat, MH.diemDen(info, {}).lng], [16, 108]);
  assert.strictEqual(MH.drift(info, {c1: c}).state, 'ok');
  const moved = MH.drift(info, {c1: MH.clean({...c, diaChiGiao: [{id: 'k1', nhan: 'Kho', diaChi: 'Kho 1', lat: 16.2, lng: 108}]})}); assert.strictEqual(moved.state, 'thaydoi'); assert.ok(/tọa độ/.test(moved.why));
  assert.strictEqual(MH.clean({id: 'c2', ten: 'B', diaChi: 'Đ'}).lat, null);   // công ty cũ chưa có tọa độ
});
