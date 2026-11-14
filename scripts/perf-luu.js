'use strict';
/* Đo hiệu năng lưu/nạp cơ sở dữ liệu với dữ liệu giả lập nhiều cỡ (chủ rừng × lô × phiếu cân). Chạy bằng Node của Electron:
 *   ELECTRON_RUN_AS_NODE=1 npx electron scripts/perf-luu.js [chủ lô phiếu ...]   ví dụ: ... scripts/perf-luu.js 50 2 100 200 3 200
 * In: dung lượng JSON, thời gian lưu lần đầu / lưu không đổi / lưu khi đổi 1 phiếu, nạp, và sao chép qua IPC (structuredClone). */
const {Store} = require('../src/store');
const fs = require('fs'), os = require('os'), path = require('path');
const ms = f => { const a = process.hrtime.bigint(); const r = f(); return [Math.round(Number(process.hrtime.bigint() - a) / 1e6), r]; };
function sample(O, F, P) {
  const db = {v: 2, rs: {}};
  for (let o = 0; o < O; o++) {
    const forests = {};
    for (let f = 0; f < F; f++) {
      const id = 'f' + o + '_' + f;
      forests[id] = {id, info: {maRung: 'R' + o + '-' + f, tenRung: 'Rừng ' + o, dienTich: 2.5, giayTo: []},
        nc: Array.from({length: 12}, (_, i) => ({_id: 'n' + i, ten: 'NGUYỄN VĂN ' + i, cccd: '0490000' + String(i).padStart(5, '0'), vaiTro: 'Công nhân', diaChi: 'Thôn A, xã B, huyện C, tỉnh Quảng Nam'})),
        dx: Array.from({length: 4}, (_, i) => ({_id: 'd' + i, bienSo: '92C-' + (10000 + i), taiXe: 'TÀI XẾ ' + i})),
        pc: Array.from({length: P}, (_, i) => ({_id: 'p' + i, stt: i + 1, ngay: '05/01/2026', bienSo: '92C-10001', soPhieu: 'P' + o + '-' + f + '-' + i, kl: 12.345, klKg: 12345, can1: 30000, can2: 17655, gio1: '08:00:00', gio2: '09:00:00', khachHang: 'CÔNG TY TNHH DĂM AN PHÁT', noiGiao: 'KCN Điện Nam'})), exp: {}};
    }
    db.rs['o' + o] = {id: 'o' + o, info: {ma: 'CR' + o, ten: 'CHỦ RỪNG ' + o, cccd: '049' + String(o).padStart(9, '0')}, forests};
  }
  return db;
}
function measure(O, F, P) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hakqn-perf-')), s = new Store(path.join(dir, 'p.sqlite')), db = sample(O, F, P);
  const [first] = ms(() => s.save(db)), [same] = ms(() => s.save(db));
  db.rs.o0.forests.f0_0.pc[0].kl = 99; const [one, r] = ms(() => s.save(db));
  const [load] = ms(() => s.load()), [clone] = ms(() => structuredClone(db));
  s.close(); fs.rmSync(dir, {recursive: true, force: true});
  return {phieu: O * F * P, mb: Math.round(JSON.stringify(db).length / 104857.6) / 10, first, same, one, changed: r.changed, load, clone};
}
module.exports = {sample, measure};
if (require.main === module) {
  const a = process.argv.slice(2).map(Number), sizes = a.length >= 3 ? Array.from({length: Math.floor(a.length / 3)}, (_, i) => a.slice(i * 3, i * 3 + 3)) : [[50, 2, 100], [200, 3, 200]];
  for (const [O, F, P] of sizes) { const m = measure(O, F, P); console.log(`${O} chủ × ${F} lô × ${P} phiếu = ${m.phieu} phiếu cân | JSON ${m.mb} MB | lưu lần đầu ${m.first} ms | lưu không đổi ${m.same} ms | lưu đổi 1 phiếu ${m.one} ms (ghi ${m.changed} dòng) | nạp ${m.load} ms | sao chép IPC ${m.clone} ms`); }
}
