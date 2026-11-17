'use strict';
/* 3.0 — định danh phiếu giữa các nguồn và hợp đồng đích ở tầng lưu (src/stage.js, src/lienket.js) */
const test = require('node:test'), assert = require('node:assert/strict');
const S = require('../src/stage'), LK = require('../src/lienket');

test('cùng phiếu: lần đầu từ HoSoKeo, lần sau từ Excel với BKS đổi → nhận ra bản ghi đã có, không thêm phiếu mới', () => {
  const st = S.create({nc: [], dx: [], pc: []});
  const r1 = S.merge(st, 'pc', [{soPhieu: '1001/2026/NK', ngay: '05/10/2026', bienSo: '92C-12345', kl: 12.5, _src: {tab: 'HoSoKeo'}}], {source: 'Google Sheets', plateSource: 'Google Sheets'});
  assert.equal(r1.add, 1);
  const id = st.cur.pc[0]._id; st.cur.pc[0].hdvcId = 'hd1'; st.cur.pc[0].xeRowId = 'xr1'; st.cur.pc[0].id = 'pc1';   // đã lưu vào hợp đồng, có xe
  const r2 = S.merge(st, 'pc', [{soPhieu: '1001/2026/nk ', ngay: '05/10/2026', bienSo: '92C-67890', kl: 12.5}], {source: 'Excel: pc.xlsx'});
  assert.equal(r2.add, 0, 'không thêm phiếu mới'); assert.equal(st.cur.pc.length, 1);
  assert.ok(r2.pending === 1 || r2.upd === 1, 'BKS khác: chờ đối chiếu hoặc cập nhật — ' + JSON.stringify(r2));
  const p = st.cur.pc[0]; assert.equal(p._id, id); assert.equal(p.id, 'pc1'); assert.equal(p.hdvcId, 'hd1'); assert.equal(p.kl, 12.5);
});

test('tầng lưu: phiếu đã có hợp đồng chỉ tự gắn xe của hợp đồng đó — không tự chuyển sang hợp đồng có xe cùng BKS', () => {
  const f = {hdvc: [{id: 'hdA'}, {id: 'hdB'}], dx: [{id: 'xr1', bienSo: '92C-12345', hdvcId: 'hdA'}, {id: 'xr2', bienSo: '92C-67890', hdvcId: 'hdB'}],
    pc: [{id: 'pc1', soPhieu: 'P1', bienSo: '92C-67890', hdvcId: 'hdA', kl: 1}, {id: 'pc2', soPhieu: 'P2', bienSo: '92c 123.45', hdvcId: 'hdA', kl: 1}, {id: 'pc3', soPhieu: 'P3', bienSo: '92C-67890', kl: 1}]};
  LK.dongBoPhieu(f);
  assert.equal(f.pc[0].hdvcId, 'hdA'); assert.ok(!f.pc[0].xeRowId, 'P1 ở A, BKS chỉ có ở B: giữ A, không gắn xe của B');
  assert.equal(f.pc[1].xeRowId, 'xr1', 'P2 ở A khớp xe của A (BKS chuẩn hóa)');
  assert.equal(f.pc[2].hdvcId, 'hdB'); assert.equal(f.pc[2].xeRowId, 'xr2', 'phiếu chưa có hợp đồng (dữ liệu cũ): theo xe khớp duy nhất');
});

test('xe chọn tay giữ nguyên khi BKS phiếu đổi; xe tự gắn theo BKS mới', () => {
  const f = {hdvc: [{id: 'hdA'}], dx: [{id: 'xr1', bienSo: '92C-12345', hdvcId: 'hdA'}, {id: 'xr3', bienSo: '92C-55555', hdvcId: 'hdA'}],
    pc: [{id: 'pc1', bienSo: '92C-55555', hdvcId: 'hdA', xeRowId: 'xr1', xeTay: true}, {id: 'pc2', bienSo: '92C-55555', hdvcId: 'hdA', xeRowId: 'xr1'}]};
  LK.dongBoPhieu(f);
  assert.equal(f.pc[0].xeRowId, 'xr1'); assert.equal(f.pc[1].xeRowId, 'xr3');
});
