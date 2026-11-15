'use strict';
const test = require('node:test'), assert = require('node:assert');
const DB = require('../src/dinhbien'), DM = require('../src/dinhmuc');

test('định biên mặc định: 1 đội 8 người = 1 Tổ trưởng (kiêm bốc xếp) + 2 cưa + 3 bóc vỏ + 2 bốc xếp, mỗi vị trí có nhiệm vụ', () => {
  const g = DB.get({}); assert.strictEqual(g.saved, false); assert.strictEqual(DB.tong(g.rows), 8);
  assert.deepStrictEqual(g.rows.map(r => [r.chucDanh, r.soNguoi]), [['Tổ trưởng', 1], ['Công nhân cưa', 2], ['Công nhân bóc vỏ', 3], ['Công nhân bốc xếp', 2]]);
  assert.strictEqual(g.rows[0].kiemNhiem, 'Công nhân bốc xếp'); assert.ok(g.rows.every(r => r.nhiemVu.length > 20));
  assert.ok(/Hạ toàn bộ cây/.test(g.rows[1].nhiemVu) && /Bóc vỏ/.test(g.rows[2].nhiemVu) && /15–20 tấn/.test(g.rows[3].nhiemVu));
  assert.strictEqual(DB.check(g.rows).ok, true);
  const copy = DB.get({}); copy.rows[0].soNguoi = 9; assert.strictEqual(DB.get({}).rows[0].soNguoi, 1);   // bản mặc định không bị sửa
});
test('kiểm tra định mức nhân công: tên, số người nguyên 0–50 (0 = ngoài định biên chuẩn), trùng, nhiệm vụ bắt buộc khi có người, đúng một Tổ trưởng 1 người, kiêm nhiệm hợp lệ', () => {
  const ok = () => DB.get({}).rows, bad = (f, re) => { const r = ok(); f(r); const c = DB.check(r); assert.strictEqual(c.ok, false); assert.match(c.error, re); };
  bad(r => { r[1].soNguoi = -1; }, /Dòng 2: số người .* từ 0 đến 50/); bad(r => { r[1].soNguoi = 1.5; }, /số nguyên/);
  { const r = ok(); r[1].soNguoi = 0; r[1].nhiemVu = ''; assert.strictEqual(DB.check(r).ok, true, 'vị trí 0 người (ngoài định biên chuẩn) không bắt buộc nhiệm vụ'); } bad(r => { r[2].soNguoi = 51; }, /Dòng 3/);
  bad(r => { r[3].chucDanh = 'công nhân cưa'; }, /bị trùng/); bad(r => { r[2].nhiemVu = ''; }, /chưa ghi nhiệm vụ của “Công nhân bóc vỏ”/);
  bad(r => { r[0].soNguoi = 2; }, /đúng một vị trí “Tổ trưởng” và chỉ 1 người/); bad(r => { r.shift(); }, /đúng một vị trí “Tổ trưởng”/);
  bad(r => { r[0].kiemNhiem = 'Công nhân nấu ăn'; }, /không có trong định mức/); bad(r => { r[1].kiemNhiem = 'Công nhân cưa'; }, /không thể kiêm chính/);
  bad(r => { r[1].chucDanh = ''; }, /thiếu tên vị trí/); assert.strictEqual(DB.check([]).ok, false);
  const c = DB.check([{chucDanh: ' Tổ trưởng ', soNguoi: '1', nhiemVu: ' Điều hành '}, {chucDanh: 'Thợ phụ', soNguoi: '4', nhiemVu: 'Phụ việc'}]); assert.strictEqual(c.ok, true); assert.deepStrictEqual(c.rows.map(r => [r.chucDanh, r.soNguoi, r.nhiemVu]), [['Tổ trưởng', 1, 'Điều hành'], ['Thợ phụ', 4, 'Phụ việc']]);
});
test('so sánh nhân công thực tế với định biên: thiếu, thừa, vị trí ngoài định biên; câu nêu chênh lệch', () => {
  const rows = DB.get({}).rows, nv = cd => ({chucDanh: cd});
  const dung = [nv('Tổ trưởng'), nv('Công nhân cưa'), nv('Công nhân cưa'), nv('Công nhân bóc vỏ'), nv('Công nhân bóc vỏ'), nv('Công nhân bóc vỏ'), nv('Công nhân bốc xếp'), nv('Công nhân bốc xếp')];
  const a = DB.soSanh(rows, dung); assert.deepStrictEqual([a.can, a.co, a.lech.length, a.ngoai.length], [8, 8, 0, 0]); assert.strictEqual(DB.lechText(a), '');
  const b = DB.soSanh(rows, dung.slice(0, 5).concat([nv('Công nhân khai thác'), nv('Công nhân bốc xếp'), nv('Công nhân bốc xếp'), nv('Công nhân bốc xếp')]));
  assert.strictEqual(DB.lechText(b), 'thiếu 1 Công nhân bóc vỏ; thừa 1 Công nhân bốc xếp; 1 người giữ vị trí “Công nhân khai thác” không có trong định mức');
  const c = DB.soSanh(rows, []); assert.strictEqual(DB.lechText(c), 'thiếu 1 Tổ trưởng; thiếu 2 Công nhân cưa; thiếu 3 Công nhân bóc vỏ; thiếu 2 Công nhân bốc xếp');
});
test('lưu định mức nhân công: là danh mục vị trí (không còn ghi riêng vào danh sách chức danh); báo vị trí mới; lỗi thì không ghi gì', () => {
  const db = {}; assert.deepStrictEqual(DM.allPositions(db), ['Tổ trưởng', 'Công nhân khai thác', 'Công nhân cưa']);
  const r = DB.set(db, DB.get(db).rows, DM); assert.strictEqual(r.ok, true); assert.deepStrictEqual(r.them, ['Công nhân bóc vỏ', 'Công nhân bốc xếp']);
  assert.ok(!db.chucDanhThem, 'không ghi vào danh sách chức danh riêng'); assert.strictEqual(DB.get(db).saved, true);
  assert.deepStrictEqual(DB.danhMuc(db, ['Công nhân khai thác']).rows.map(r => r.chucDanh + ':' + r.soNguoi), ['Tổ trưởng:1', 'Công nhân cưa:2', 'Công nhân bóc vỏ:3', 'Công nhân bốc xếp:2', 'Công nhân khai thác:0'], 'đã lưu: đúng các dòng đã lưu + vị trí còn dùng (0 người)');
  const before = JSON.stringify(db), rows = DB.get(db).rows; rows[1].soNguoi = -1; assert.strictEqual(DB.set(db, rows, DM).ok, false); assert.strictEqual(JSON.stringify(db), before);
});

test('danh mục vị trí chưa lưu: Tổ trưởng, vị trí cũ theo đúng thứ tự cũ, rồi định biên mặc định; vị trí 0 người so sánh là ngoài định biên chuẩn', () => {
  const m = DB.danhMuc({}, ['Tổ trưởng', 'Công nhân khai thác', 'Công nhân cưa', 'Lái máy']).rows;
  assert.deepStrictEqual(m.map(r => r.chucDanh + ':' + r.soNguoi), ['Tổ trưởng:1', 'Công nhân khai thác:0', 'Công nhân cưa:2', 'Lái máy:0', 'Công nhân bóc vỏ:3', 'Công nhân bốc xếp:2']);
  const sc = DB.soSanh(m, [{chucDanh: 'Tổ trưởng'}, {chucDanh: 'Công nhân khai thác'}]);
  assert.strictEqual(sc.can, 8); assert.ok(sc.vt.every(v => v.can > 0));
  assert.match(DB.lechText(sc), /1 người giữ vị trí “Công nhân khai thác” ngoài định biên chuẩn \(số người 0\)/);
});

test('phiên bản định mức nhân công theo ngày: chưa có phiên bản có ngày thì như cũ; lô dùng phiên bản hiệu lực tại ngày bắt đầu; ảnh hưởng đúng lô; trùng ngày và ngày không có thật bị chặn', () => {
  const db = {};
  assert.strictEqual(DB.versions(db).length, 1); assert.strictEqual(DB.get(db, '01/10/2026').saved, false); assert.strictEqual(DB.tong(DB.get(db, '01/10/2026').rows), 8);
  assert.strictEqual(DB.addVersion(db, '31/02/2026').ok, false);
  const a = DB.addVersion(db, '01/11/2026'); assert.ok(a.ok); assert.strictEqual(DB.addVersion(db, '01/11/2026').ok, false);
  const rows = DB.get(db, '01/11/2026').rows.map(r => r.chucDanh === 'Công nhân cưa' ? {...r, soNguoi: 4} : r);
  assert.ok(DB.setVersion(db, a.id, rows, DM).ok);
  assert.strictEqual(DB.tong(DB.get(db, '15/10/2026').rows), 8, 'lô trước ngày hiệu lực giữ bản gốc');
  assert.strictEqual(DB.tong(DB.get(db, '01/11/2026').rows), 10, 'từ ngày hiệu lực dùng phiên bản mới');
  assert.strictEqual(DB.tong(DB.get(db, '').rows), 10, 'không có ngày: bản mới nhất');
  assert.deepStrictEqual(DB.anhHuong(db, a.id, [{maRung: 'A', tuNgay: '02/11/2026'}, {maRung: 'B', tuNgay: '30/10/2026'}, {maRung: 'C', tuNgay: ''}]).map(x => x.maRung), ['A', 'C']);
  assert.deepStrictEqual(DB.anhHuong(db, 'goc', [{maRung: 'A', tuNgay: '02/11/2026'}, {maRung: 'B', tuNgay: '30/10/2026'}]).map(x => x.maRung), ['B']);
  assert.strictEqual(DB.setVersion(db, a.id, rows.map(r => r.chucDanh === 'Tổ trưởng' ? {...r, soNguoi: 2} : r), DM).ok, false, 'vẫn kiểm đúng một Tổ trưởng 1 người');
  assert.ok(DB.delVersion(db, a.id).ok); assert.strictEqual(DB.versions(db).length, 1); assert.strictEqual(DB.delVersion(db, 'goc').ok, false);
});
