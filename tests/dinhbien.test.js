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
test('kiểm tra định mức nhân công: tên, số người nguyên 1–50, trùng, nhiệm vụ bắt buộc, đúng một Tổ trưởng 1 người, kiêm nhiệm hợp lệ', () => {
  const ok = () => DB.get({}).rows, bad = (f, re) => { const r = ok(); f(r); const c = DB.check(r); assert.strictEqual(c.ok, false); assert.match(c.error, re); };
  bad(r => { r[1].soNguoi = 0; }, /Dòng 2: số người .* từ 1 đến 50/); bad(r => { r[1].soNguoi = 1.5; }, /số nguyên/); bad(r => { r[2].soNguoi = 51; }, /Dòng 3/);
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
test('lưu định mức nhân công: tự thêm vị trí mới vào danh sách chức danh; lỗi thì không ghi gì', () => {
  const db = {}; assert.deepStrictEqual(DM.allPositions(db), ['Tổ trưởng', 'Công nhân khai thác', 'Công nhân cưa']);
  const r = DB.set(db, DB.get(db).rows, DM); assert.strictEqual(r.ok, true); assert.deepStrictEqual(r.them, ['Công nhân bóc vỏ', 'Công nhân bốc xếp']);
  assert.deepStrictEqual(DM.allPositions(db), ['Tổ trưởng', 'Công nhân khai thác', 'Công nhân cưa', 'Công nhân bóc vỏ', 'Công nhân bốc xếp']); assert.strictEqual(DB.get(db).saved, true);
  assert.strictEqual(DB.set(db, DB.get(db).rows, DM).them.length, 0);   // lưu lại không thêm trùng
  const before = JSON.stringify(db), rows = DB.get(db).rows; rows[1].soNguoi = 0; assert.strictEqual(DB.set(db, rows, DM).ok, false); assert.strictEqual(JSON.stringify(db), before);
});
