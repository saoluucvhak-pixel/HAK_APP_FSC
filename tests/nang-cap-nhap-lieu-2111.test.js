'use strict';
/* Nâng cấp theo rà soát ngày 21/11/2026 (chỉ đạo trực tiếp của CHỦ): chống trùng khi nhập (lõi thuần, không cần Electron).
 *  - A3: nhân công CHƯA có CCCD chỉ ghép được theo họ tên → hai người trùng tên mà ngày sinh khác nhau không được ghi đè lên nhau khi nạp file;
 *        cùng tên, cùng ngày sinh (khác cách viết ngày) hoặc thiếu ngày sinh thì vẫn là một người như trước.
 *  - A6: cân đảo (Cân 1 ≤ Cân 2) đã là lỗi riêng; không báo thêm cảnh báo “kg không bằng chênh lệch” dựa trên |Cân 1 − Cân 2| (hai quy tắc trái nhau).
 * Phần giao diện (bộ lọc, chọn xe từ danh mục, kiểm trùng lô khác khi lưu, tiêu đề, cột kg) kiểm bằng scripts/e2e-nang-cap-2111.js. */
const test = require('node:test'), assert = require('node:assert');
const S = require('../src/stage');
const K = require('../src/docphieucan'), Money = require('../src/money'), Dates = require('../src/dates'), PC = require('../src/phieucan');
const trim = s => String(s == null ? '' : s).trim();
const {toDec} = require('../src/so');

test('A3: hai nhân công trùng tên, chưa có CCCD, ngày sinh khác nhau → nạp file thêm người mới, không ghi đè người cũ', () => {
  const st = S.create({nc: [{_id: 'a', _row: 1, ten: 'Nguyễn Văn A', cccd: '', ngaySinh: '01/02/1990', vaiTro: 'Công nhân'}], dx: [], pc: []});
  const rep = S.merge(st, 'nc', [{ten: 'NGUYEN VAN A', cccd: '', ngaySinh: '05/06/1985', vaiTro: 'Tổ trưởng'}], {source: 'nc.xlsx'});
  assert.strictEqual(rep.add, 1); assert.strictEqual(rep.upd, 0);
  assert.strictEqual(st.cur.nc.find(r => r._id === 'a').vaiTro, 'Công nhân', 'người cũ giữ nguyên vai trò');
  assert.strictEqual(st.cur.nc.length, 2);
});

test('A3: cùng tên, cùng ngày sinh (1/2/1990 và 01/02/1990) hoặc một bên thiếu ngày sinh → vẫn là một người (cập nhật như trước)', () => {
  const st = S.create({nc: [{_id: 'a', _row: 1, ten: 'Nguyễn Văn A', cccd: '', ngaySinh: '01/02/1990', vaiTro: 'Công nhân'}], dx: [], pc: []});
  const r1 = S.merge(st, 'nc', [{ten: 'Nguyễn Văn A', cccd: '', ngaySinh: '1/2/1990', vaiTro: 'Tổ trưởng'}], {source: 'a.xlsx'});
  assert.strictEqual(r1.add, 0); assert.strictEqual(st.cur.nc.length, 1);
  const r2 = S.merge(st, 'nc', [{ten: 'Nguyễn Văn A', cccd: '', ngaySinh: '', vaiTro: 'Công nhân'}], {source: 'b.xlsx'});
  assert.strictEqual(r2.add, 0); assert.strictEqual(st.cur.nc.length, 1);
});

test('A3: người có CCCD vẫn ghép theo CCCD, không bị ảnh hưởng bởi ngày sinh', () => {
  const st = S.create({nc: [{_id: 'a', _row: 1, ten: 'Nguyễn Văn A', cccd: '049067005459', ngaySinh: '01/02/1990', vaiTro: 'Công nhân'}], dx: [], pc: []});
  const rep = S.merge(st, 'nc', [{ten: 'Nguyễn Văn A', cccd: '049067005459', ngaySinh: '02/02/1990', vaiTro: 'Công nhân'}], {source: 'c.xlsx'});
  assert.strictEqual(rep.add, 0); assert.strictEqual(st.cur.nc.length, 1);
});

test('A6: cân đảo (Cân 1 < Cân 2) chỉ báo MỘT lỗi cân đảo, không kèm cảnh báo “kg không bằng chênh lệch” (trị tuyệt đối)', () => {
  const api = K.create({trim, pad2: n => (n < 10 ? '0' : '') + n, numSwap: s => s, fmtRaw: n => String(n), fmt: n => String(n), toDec, normDate: s => trim(s), HAKMoney: Money, HAKDates: Dates, HAKPhieuCan: PC,
    volumeOf: () => null, curForest: () => ({}), nhanHdId: (f, id) => id, phieuSaiHd: () => null, cheoCtx: () => ({}), db: {rs: {}}});
  const rec = {info: {maRung: 'R-A'}, exp: {}, doi: [], hdvc: [{id: 'h1', donViId: 'u'}], dx: [{id: 'x1', bienSo: '92C-12345'}],
    pc: [{_row: 2, soPhieu: 'P1', ngay: '05/10/2026', bienSo: '92C-12345', can1: 10000, can2: 22000, klKg: 11000, kl: 11, xeRowId: 'x1', hdvcId: 'h1'}]};
  const c = api.checkPC(rec);
  assert.ok(c.errs.some(m => /Cân lần 1 phải lớn hơn cân lần 2/.test(m)), c.errs.join(' | '));
  assert.ok(!c.warns.some(m => /không bằng chênh lệch/.test(m)), c.warns.join(' | '));
});

test('A6: cân đúng chiều mà kg ghi lệch chênh lệch Cân 1 − Cân 2 vẫn cảnh báo như trước', () => {
  const api = K.create({trim, pad2: n => (n < 10 ? '0' : '') + n, numSwap: s => s, fmtRaw: n => String(n), fmt: n => String(n), toDec, normDate: s => trim(s), HAKMoney: Money, HAKDates: Dates, HAKPhieuCan: PC,
    volumeOf: () => null, curForest: () => ({}), nhanHdId: (f, id) => id, phieuSaiHd: () => null, cheoCtx: () => ({}), db: {rs: {}}});
  const rec = {info: {maRung: 'R-A'}, exp: {}, doi: [], hdvc: [{id: 'h1', donViId: 'u'}], dx: [{id: 'x1', bienSo: '92C-12345'}],
    pc: [{_row: 2, soPhieu: 'P1', ngay: '05/10/2026', bienSo: '92C-12345', can1: 22000, can2: 10000, klKg: 11000, kl: 11, xeRowId: 'x1', hdvcId: 'h1'}]};
  const c = api.checkPC(rec);
  assert.ok(c.warns.some(m => /không bằng chênh lệch/.test(m)), c.warns.join(' | '));
});
