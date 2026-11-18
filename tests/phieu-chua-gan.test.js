'use strict';
/* Phiếu #03 (ND-01, kịch bản C-02 của docs/RA_SOAT_01.md): phân bổ “theo phiếu” mà còn phiếu chưa gán đội.
 * Quyết định của CHỦ (18/11/2026): KHÔNG chặn xuất; cảnh báo, xác nhận lần hai thì vẫn xuất và khối lượng đội chia theo số người như hiện nay.
 * Lõi thuần: doiOf cho biết phiếu nào chưa gán (b.phieuChuaGan) và HAKPhanBo.chuaGanXuat(b) dựng nội dung cảnh báo. Số in (khoiLuong của đội) KHÔNG đổi. */
const test = require('node:test');
const assert = require('node:assert');
const K = require('../src/kiemtranhieudoi'), PB = require('../src/phanbo'), DM = require('../src/dinhmuc'), Dates = require('../src/dates'), Doi = require('../src/doi');

const api = K.create({db: {rs: {}}, trim: s => String(s == null ? '' : s).trim(), HAKDates: Dates, HAKDoi: Doi, HAKPhanBo: PB, isTT: r => /^tổ trưởng/i.test(r.vaiTro || ''), klPhieu: DM.tongPhieuTan, isCccd: () => true, numSwap: s => s});
const nv = (i, doiId, vai) => ({_row: i, ten: 'NGƯỜI ' + i, vaiTro: vai, doiId, cccd: '0490000000' + (10 + i)});
const rec = (pc, extra) => Object.assign({info: {_klPC: 30, dienTich: 2}, doi: [{id: 'd1', ten: 'Đội 1'}, {id: 'd2', ten: 'Đội 2'}], phanBo: {cheDo: 'theoPhieu'},
  nc: [nv(1, 'd1', 'Tổ trưởng'), nv(2, 'd1', 'Công nhân'), nv(3, 'd1', 'Công nhân'), nv(4, 'd2', 'Tổ trưởng')], pc}, extra || {});
const P = (so, kl, doiId) => ({soPhieu: so, ngay: '05/10/2026', bienSo: '92C-12345', kl, doiId});

test('C-02: theo phiếu, chưa gán phiếu nào → số in vẫn chia theo số người (22,5 / 7,5 t) và có cảnh báo nêu số phiếu, tổng tấn, tên từng phiếu', () => {
  const b = api.doiOf(rec([P('P1', 10), P('P2', 20)]));
  assert.deepStrictEqual(b.doi.map(d => d.khoiLuong), [22.5, 7.5], 'số in không đổi');
  assert.strictEqual(b.klNguon, 'songuoi');
  const c = PB.chuaGanXuat(b);
  assert.ok(c, 'phải có cảnh báo');
  assert.strictEqual(c.soPhieu, 2); assert.strictEqual(c.kg, 30000); assert.strictEqual(c.tan, 30);
  assert.deepStrictEqual(c.phieu.map(x => x.soPhieu), ['P1', 'P2']);
  assert.deepStrictEqual(c.chia.map(x => [x.ten, x.tan]), [['Đội 1', 22.5], ['Đội 2', 7.5]], 'nêu phần mỗi đội sẽ in');
  assert.strictEqual(c.nguon, 'songuoi');
});

test('gán một phần: cảnh báo chỉ nêu phiếu còn chưa gán; số in vẫn chia theo số người', () => {
  const b = api.doiOf(rec([P('P1', 10, 'd1'), P('P2', 20)]));
  assert.deepStrictEqual(b.doi.map(d => d.khoiLuong), [22.5, 7.5]);
  const c = PB.chuaGanXuat(b);
  assert.deepStrictEqual(c.phieu.map(x => x.soPhieu), ['P2']); assert.strictEqual(c.tan, 20); assert.strictEqual(c.soPhieu, 1);
});

test('không cảnh báo khi: gán đủ phiếu; chia đều; một đội; hồ sơ cũ có số nhập tay; không có phiếu nào', () => {
  const du = api.doiOf(rec([P('P1', 10, 'd1'), P('P2', 20, 'd2')]));
  assert.deepStrictEqual(du.doi.map(d => d.khoiLuong), [10, 20]); assert.strictEqual(PB.chuaGanXuat(du), null, 'gán đủ');
  assert.strictEqual(PB.chuaGanXuat(api.doiOf(rec([P('P1', 10), P('P2', 20)], {phanBo: {cheDo: 'chiaDeu'}}))), null, 'chia đều (không dùng phiếu)');
  const mot = api.doiOf(rec([P('P1', 10)], {doi: [{id: 'd1', ten: 'Đội 1'}], nc: [nv(1, 'd1', 'Tổ trưởng'), nv(2, 'd1', 'Công nhân')]}));
  assert.strictEqual(PB.chuaGanXuat(mot), null, 'một đội');
  const cu = api.doiOf(rec([P('P1', 10), P('P2', 20)], {doi: [{id: 'd1', ten: 'Đội 1', klHoSoCu: 20}, {id: 'd2', ten: 'Đội 2', klHoSoCu: 10}]}));
  assert.strictEqual(cu.klNguon, 'nhap'); assert.strictEqual(PB.chuaGanXuat(cu), null, 'số nhập tay của hồ sơ cũ: giữ như trước');
  assert.strictEqual(PB.chuaGanXuat(api.doiOf(rec([]))), null, 'chưa có phiếu');
  assert.strictEqual(PB.chuaGanXuat(null), null);
});

test('phiếu khối lượng 0 hoặc không hợp lệ chưa gán đội không gây cảnh báo (không ảnh hưởng số in)', () => {
  const b = api.doiOf(rec([P('P1', 10, 'd1'), P('P2', 20, 'd2'), P('P3', 0)]));
  assert.deepStrictEqual(b.doi.map(d => d.khoiLuong), [10, 20]); assert.strictEqual(PB.chuaGanXuat(b), null);
});

test('hàm cảnh báo không sửa dữ liệu và không đổi số in (gọi nhiều lần, kết quả như nhau)', () => {
  const r = rec([P('P1', 10), P('P2', 20)]), truoc = JSON.stringify(r);
  const a = api.doiOf(r).doi.map(d => d.khoiLuong); PB.chuaGanXuat(api.doiOf(r)); PB.chuaGanXuat(api.doiOf(r));
  assert.deepStrictEqual(api.doiOf(r).doi.map(d => d.khoiLuong), a); assert.strictEqual(JSON.stringify(r), truoc);
});

test('màn Phân bổ và danh sách hợp đồng nêu phần chưa gán thay cho “0 t” im lặng (dòng giải thích dùng cùng kết quả với cảnh báo)', () => {
  const c = PB.chuaGanXuat(api.doiOf(rec([P('P1', 10), P('P2', 20)])));
  const t = PB.chuaGanDong(c);
  assert.match(t, /30 t/); assert.match(t, /2 phiếu/); assert.match(t, /chưa gán đội/); assert.match(t, /chia theo số người/);
  assert.strictEqual(PB.chuaGanDong(null), '');
});
