'use strict';
/* Phiếu #05 (ND-05, ND-06, ND-07, ND-09; rà soát 01: A-01…A-04, A-06, B-01, B-02, B-10).
 * Quyết định CHỦ: CCCD 9 hoặc 12 chữ số ở MỌI nơi (danh mục đối tượng, chủ rừng, thành viên trong lô). Cảnh báo không chặn: CCCD chủ rừng trùng, đối tượng trùng tên chưa có CCCD/MST,
 * người Nhân công/Tài xế thiếu giấy tờ. Khôi phục gói lô không nhân đôi thể nhân không CCCD. */
const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('fs'), path = require('path');
const K = require('../src/kiemtranhieudoi'), Dates = require('../src/dates'), DT = require('../src/doituong'), G = require('../src/goidm'), L = require('../src/lorung');
const src01 = fs.readFileSync(path.join(__dirname, '..', 'ui', 'app', '01-cau-hinh-tien-ich.js'), 'utf8');
const isCccd = new Function('return ' + /const isCccd = (s => [^;]+);/.exec(src01)[1])();   // đúng hàm giao diện dùng cho chủ rừng và thành viên
const ctx = db => ({db, trim: s => String(s == null ? '' : s).trim(), HAKDates: Dates, isCccd, numSwap: s => s, HAKLoRung: L});
const chu = (ma, cccd) => ({ma, ten: 'NGUYỄN VĂN AN', danhXung: 'Ông', cccd, ngayCap: '01/01/2021', noiCap: 'CA', diaChi: 'Đà Nẵng'});

test('A-01: chủ rừng CR-02 cùng CCCD với CR-01 — lưu được (không chặn) nhưng có cảnh báo nêu chủ rừng kia', () => {
  const api = K.create(ctx({rs: {o1: {info: chu('CR-01', '049067005459')}}}));
  assert.deepEqual(api.infoErrors(chu('CR-02', '049067005459'), 'o2'), []);
  const w = api.infoWarns(chu('CR-02', '049067005459'), 'o2'); assert.equal(w.length, 1); assert.match(w[0], /CCCD 049067005459 trùng chủ rừng CR-01 – NGUYỄN VĂN AN/);
  assert.deepEqual(api.infoWarns(chu('CR-01', '049067005459'), 'o1'), [], 'chính chủ đó: không cảnh báo');
});

test('A-02: mã chủ rừng so không phân biệt hoa thường, bỏ khoảng thừa (“cr-01”, “CR-01 ” trùng “CR-01”)', () => {
  const api = K.create(ctx({rs: {o1: {info: chu('CR-01', '049067005459')}}}));
  assert.ok(api.infoErrors(chu('cr-01', '049067005460'), 'o2').includes('Mã chủ rừng đã tồn tại'));
  assert.ok(api.infoErrors(chu(' CR-01 ', '049067005461'), 'o3').includes('Mã chủ rừng đã tồn tại'));
  assert.ok(!api.infoErrors(chu('CR-011', '049067005462'), 'o4').includes('Mã chủ rừng đã tồn tại'));
});

test('A-03: CCCD 9 hoặc 12 chữ số được nhận ở danh mục, chủ rừng và thành viên trong lô; số khác báo “9 hoặc 12 chữ số”', () => {
  assert.ok(isCccd('201234567') && isCccd('049067005459') && !isCccd('2012345678') && !isCccd('04906700545') && !isCccd(''));
  const api = K.create(ctx({rs: {}}));
  assert.ok(!api.infoErrors(chu('CR-09', '201234567'), 'o9').some(e => /CCCD/.test(e)), 'chủ rừng CMND 9 số');
  assert.ok(api.infoErrors(chu('CR-09', '20123456'), 'o9').includes('CCCD phải gồm 9 hoặc 12 chữ số'));
  const r = DT.luu([], {ten: 'LÊ VĂN B', nguoi: [{hoTen: 'LÊ VĂN B', cccd: '201234567', vaiTro: {nhanCong: true}}]}, ''); assert.ok(r.ok);
  assert.ok(DT.kiem([], {ten: 'X', nguoi: [{hoTen: 'X', cccd: '1234'}]}).some(e => /9 hoặc 12 chữ số/.test(e)));
  const src = fs.readFileSync(path.join(__dirname, '..', 'src', 'kiemtranhieudoi.js'), 'utf8');
  assert.ok(!/12 chữ số'/.test(src.replace(/9 hoặc 12 chữ số'/g, '')), 'không còn thông báo “đủ 12 chữ số” cho chủ rừng / thành viên');
});

test('A-04 / ND-09: danh mục lưu người Nhân công chỉ có họ tên + CCCD (không chặn) nhưng cảnh báo thiếu ngày sinh, ngày cấp, nơi cấp, địa chỉ', () => {
  const r = DT.luu([], {ten: 'PHẠM C', nguoi: [{hoTen: 'PHẠM C', cccd: '049000000123', vaiTro: {nhanCong: true}}]}, '');
  assert.ok(r.ok); assert.equal(r.canhBao.length, 1);
  assert.match(r.canhBao[0], /PHẠM C\): thiếu ngày sinh, ngày cấp, nơi cấp, địa chỉ thường trú — lô sẽ đòi khi chọn vào đội khai thác/);
  const tx = DT.luu([], {ten: 'TÀI X', nguoi: [{hoTen: 'TÀI X', cccd: '049000000124', gplx: 'G1', ngaySinh: '01/01/1990', ngayCap: '01/01/2021', noiCap: 'CA', vaiTro: {taiXe: true}}]}, '');
  assert.deepEqual(tx.canhBao.map(x => /thiếu địa chỉ thường trú — lô sẽ đòi khi chọn vào xe vận chuyển/.test(x)), [true]);
  const chuXe = DT.luu([], {ten: 'CHỦ', nguoi: [{hoTen: 'CHỦ', cccd: '049000000125', vaiTro: {chuXe: true}}]}, '');
  assert.deepEqual(chuXe.canhBao, [], 'chỉ Nhân công / Tài xế');
});

test('B-01: hai thể nhân cùng họ tên chưa có CCCD — vẫn lưu, có cảnh báo trùng tên', () => {
  const r1 = DT.luu([], {ten: 'NGUYỄN VĂN AN', nguoi: [{hoTen: 'NGUYỄN VĂN AN'}]}, ''); assert.deepEqual(r1.canhBao, []);
  const r2 = DT.luu(r1.dm, {ten: 'Nguyễn Văn An', nguoi: [{hoTen: 'Nguyễn Văn An'}]}, '');
  assert.ok(r2.ok); assert.equal(r2.dm.length, 2); assert.match(r2.canhBao[0], /^Thể nhân chưa có CCCD và trùng tên với “NGUYỄN VĂN AN” \(mã DT0001\)/);
  const r3 = DT.luu(r1.dm, {ten: 'NGUYỄN VĂN AN', nguoi: [{hoTen: 'NGUYỄN VĂN AN', cccd: '049000000126'}]}, ''); assert.deepEqual(r3.canhBao, [], 'có CCCD: phân biệt được, không cảnh báo');
});

test('B-02: hai pháp nhân cùng tên (khác hoa thường) chưa có MST — vẫn lưu, có cảnh báo', () => {
  const r1 = DT.luu([], {ten: 'CÔNG TY TNHH VẬN TẢI AN PHÁT', loai: 'phapnhan'}, '');
  const r2 = DT.luu(r1.dm, {ten: 'Công ty TNHH Vận tải An Phát', loai: 'phapnhan'}, '');
  assert.ok(r2.ok); assert.match(r2.canhBao[0], /^Pháp nhân chưa có mã số thuế và trùng tên với “CÔNG TY TNHH VẬN TẢI AN PHÁT”/);
});

test('B-10: khôi phục cùng gói lô hai lần không nhân đôi thể nhân không CCCD', () => {
  const tn = {id: 'dt7', ma: 'DT0007', ten: 'TRẦN VĂN BA', loai: 'thenhan', nguoi: [{id: 'ng9', hoTen: 'TRẦN VĂN BA', vaiTro: {taiXe: true}}]};
  const r1 = G.noi({dmDoiTuong: [], dmXe: [], dmViTri: []}, {doiTuong: [tn]}), r2 = G.noi(r1.dm, {doiTuong: [tn]});
  assert.equal(r2.dm.dmDoiTuong.length, 1); assert.equal(r2.doi.ng.ng9, r1.doi.ng.ng9); assert.deepEqual(r2.can, []);
});

test('ND-06: khôi phục gói — thể nhân không CCCD nối theo họ tên + ngày sinh khi khớp duy nhất; không khớp duy nhất → Cần đối chiếu, không thêm', () => {
  const may = [{id: 'dtA', ma: 'DT0001', ten: 'LÊ VĂN TƯ', loai: 'thenhan', nguoi: [{id: 'ngA', hoTen: 'LÊ VĂN TƯ', ngaySinh: '05/01/1980'}]},
    {id: 'dtB', ma: 'DT0002', ten: 'LÊ VĂN TƯ', loai: 'thenhan', nguoi: [{id: 'ngB', hoTen: 'LÊ VĂN TƯ', ngaySinh: '06/06/1990'}]}];
  const goi = ns => ({doiTuong: [{id: 'dtX', ten: 'Lê Văn Tư', loai: 'thenhan', nguoi: [{id: 'ngX', hoTen: 'Lê Văn Tư', ngaySinh: ns}]}]});
  const a = G.noi({dmDoiTuong: may}, goi('5/1/1980'));
  assert.equal(a.dm.dmDoiTuong.length, 2); assert.equal(a.doi.dt.dtX, 'dtA'); assert.equal(a.doi.ng.ngX, 'ngA');
  const b = G.noi({dmDoiTuong: may}, goi('01/01/2000'));
  assert.equal(b.dm.dmDoiTuong.length, 2, 'không tạo hồ sơ thứ ba'); assert.equal(b.can.length, 1); assert.match(b.can[0].lyDo, /cùng họ tên \(DT0001, DT0002\).*Cần đối chiếu|cùng họ tên \(DT0001, DT0002\)/);
  assert.equal(b.doi.dt.dtX, undefined);
  const c = G.noi({dmDoiTuong: []}, goi('01/01/2000')); assert.equal(c.dm.dmDoiTuong.length, 1, 'máy chưa có ai cùng tên: thêm như trước');
});

test('A-06 / ND-05: người / xe mới của lô → chỉ thêm vào Danh mục đối tượng / Danh mục xe (khi người dùng đồng ý), nối ID; không đụng danh mục cũ', () => {
  const nc = [{_id: 'r1', ten: 'NGUYỄN VĂN MỚI', danhXung: 'Ông', cccd: '049090000123', ngaySinh: '02/03/1990', ngayCap: '01/01/2022', noiCap: 'CA', diaChi: 'QN'},
    {_id: 'r2', ten: 'CŨ', cccd: '049090000999', nguoiId: 'ng1'}, {_id: 'r3', ten: 'CMND', cccd: '201234567'}, {_id: 'r4', ten: 'SAI', cccd: '123'}];
  const dx = [{_id: 'x1', bienSo: '92C-111.11', kdDen: '01/01/2030', hanBH: '01/06/2030', loaiXe: 'Tải'}, {_id: 'x2', bienSo: '92C-22222', xeId: 'xe1'}];
  const moi = DT.moiTuLo([], [{id: 'xe1', bks: '92C-22222'}], nc, dx);
  assert.deepEqual(moi.nguoi.map(r => r._id), ['r1', 'r3']); assert.deepEqual(moi.xe.map(r => r._id), ['x1']);
  const k = DT.themTuLo([], [{id: 'xe1', bks: '92C-22222'}], moi, '18/11/2026');
  assert.equal(k.dmDoiTuong.length, 2); assert.equal(k.dmXe.length, 2); assert.deepEqual(k.loi, []);
  const p = k.dmDoiTuong[0].nguoi[0]; assert.deepEqual([p.hoTen, p.cccd, p.gioiTinh, p.ngaySinh, p.vaiTro.nhanCong], ['NGUYỄN VĂN MỚI', '049090000123', 'Nam', '02/03/1990', true]);
  assert.equal(k.nguoi[0].id, p.id); assert.equal(k.dmXe[1].bks, '92C-111.11'); assert.equal(k.dmXe[1].hanKiemDinh, '01/01/2030');
  assert.deepEqual(DT.moiTuLo(k.dmDoiTuong, k.dmXe, nc, dx), {nguoi: [], xe: []}, 'lưu lại lô: không hỏi lại');
  const ui = fs.readFileSync(path.join(__dirname, '..', 'ui', 'app', '20-nhap-tu-danh-muc.js'), 'utf8'), f = ui.slice(ui.indexOf('function dmGhiTuLo'), ui.indexOf('function dmLechLo'));
  assert.ok(!/dmLaoDong|dmXeVC|themLaoDong|themXe\(/.test(f.replace(/\/\*[\s\S]*?\*\//g, '')), 'dmGhiTuLo không ghi danh mục cũ');
  assert.match(f, /confirm\(/);
});
