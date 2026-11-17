'use strict';
/* Vòng đời lô và Chốt hồ sơ (bản 2.2): lô chưa đủ điều kiện nêu việc còn thiếu; lô đã chốt là chỉ đọc; mở khóa bắt buộc lý do và ghi nhật ký; dừng lô và mở lại (Electron thật, SQLite thật).
 * Chạy: xvfb-run -a node scripts/e2e-chot-ho-so.js */
const {_electron: electron} = require('playwright-core');
const path = require('path'), fs = require('fs'), os = require('os');
const src = fs.readFileSync(path.join(__dirname, 'e2e-inan2.js'), 'utf8');
const {lot, seed, P} = new Function(src.slice(src.indexOf('const nv ='), src.indexOf('const plain =')) + '; return {lot, seed, P};')();
const V = require('../src/vongdoi');
const root = path.join(__dirname, '..');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hakqn-chot-'));
let fail = 0; const ok = (name, cond, extra) => { console.log((cond ? 'ĐẠT  ' : 'LỖI  ') + name + (!cond && extra ? ' — ' + extra : '')); if (!cond) fail++; };
(async () => {
  const app = await electron.launch({executablePath: require('electron'), args: [root, '--no-sandbox'], env: {...process.env, HAKQN_CLOSE: 'discard', HAKQN_DB: path.join(dir, 'd.sqlite'), HAKQN_USERDATA: path.join(dir, 'ud'), HAKQN_DOWNLOAD_DIR: path.join(dir, 'out')}});
  const w = require('./_hd30').boc(await app.firstWindow()); const errs = []; w.on('pageerror', e => errs.push(e.message)); w.on('dialog', d => d.accept()); await w.waitForSelector('#side');
  const A = lot('fa', 'R-A', {exp: {soKT: '015', ngayKy: '02/10/2026'}, pc: [P(1, '05/10/2026', '92C-12345', 'PA1', 12.5)], kl: null});
  const B = lot('fb', 'R-B', {exp: {}, pc: [], kl: null});
  const C = lot('fc', 'R-C', {exp: {}, pc: [], kl: null});
  const nv = JSON.parse(JSON.stringify(C)); V.chot(C, 'Người lập', '2026-11-15T01:00:00.000Z', []);
  const D = seed([A, B, C]);
  await w.evaluate(d => window.hak.save(d), D); await w.reload(); await w.waitForSelector('#side');
  const open = async (fid, ftab) => { await w.click('[data-open=own1]'); await w.click('[data-tab=rung]'); await w.click('[data-forest=' + fid + ']'); await w.click('[data-ftab=' + ftab + ']'); await w.waitForTimeout(400); };
  // 1. lô A chưa đủ điều kiện
  await open('fa', 'xuat'); await w.waitForSelector('#chotBox');
  ok('lô đang làm: trạng thái “Đang lập”, nêu việc còn thiếu, nút Chốt hồ sơ bị khóa', /Đang lập/.test(await w.innerText('#chotTT')) && (await w.$$('#chotThieu li')).length > 0 && await w.isDisabled('[data-act=chotLo]'));
  // 2. lô C đã chốt: chỉ đọc
  await open('fc', 'nc');
  ok('lô đã chốt: dải “Đã chốt … chỉ đọc” và ô nhập bị khóa', !!(await w.$('#loKhoaBar')) && !!(await w.$('#loKhoaFs')));
  ok('trong lô chốt không bấm được nút Thêm nhân công', await w.isDisabled('[data-act=stAdd][data-kind=nc]'));
  { // B5: gói đóng băng ở bảng chot_goi, lô đọc lên không mang gói; dải khóa không báo "khác bản đã chốt"; đọc gói qua IPC
    const L = (await w.evaluate(() => window.hak.loadSync().db)).rs.own1.forests.fc, g = await w.evaluate(() => window.hak.goiChot('fc'));
    ok('SQLite: lô đã chốt không mang gói trong dữ liệu lô, có dấu vân tay phần dữ liệu (hashDL)', L.chot && L.chot.goi === undefined && !!L.chot.hashDL, JSON.stringify(L.chot));
    ok('đọc gói đã chốt qua IPC (db:goiChot): đúng phiên bản và dấu vân tay', g.ok && g.goi && g.goi.phienBan === 1 && g.goi.hash === L.chot.hash && V.bam(g.goi.data) === L.chot.hash, JSON.stringify(g).slice(0, 200));
    const khac = V.bamDuLieu(L) !== V.bamDuLieu(g.goi.data);   // lô mẫu chốt trước khi chuẩn hóa đội nên dữ liệu đã khác gói; dải khóa phải nói đúng như so trực tiếp với gói
    ok('kiểm "còn nguyên" theo hashDL cho cùng kết quả như so với gói (không cần nạp gói)', khac === /khác bản đã chốt/.test(await w.innerText('#loKhoaBar')) && L.chot.hashDL === V.bamDuLieu(g.goi.data));
  }
  await w.click('[data-ftab=xuat]'); await w.waitForSelector('#chotBox');
  ok('tab Xuất hồ sơ của lô chốt: trạng thái Đã chốt, có nút Mở khóa', /Đã chốt/.test(await w.innerText('#chotTT')) && !!(await w.$('[data-act=chotMoKhoa]')));
  await w.click('[data-act=chotMoKhoa]'); await w.waitForTimeout(400);
  ok('mở khóa không có lý do: không mở được, báo lỗi', !!(await w.$('#loKhoaBar')) && /lý do/i.test(await w.innerText('#main')));
  await w.fill('#chotLyDo', 'Sửa số phiếu cân bị nhập nhầm'); await w.click('[data-act=chotMoKhoa]'); await w.waitForTimeout(500);
  ok('mở khóa có lý do: lô sửa được, hiện nhật ký', !(await w.$('#loKhoaBar')) && /Mở khóa/.test(await w.$eval('#chotBox', e => e.textContent)));
  const F = (await w.evaluate(() => window.hak.loadSync().db)).rs.own1.forests.fc;
  ok('SQLite: bỏ khóa, nhật ký có chốt và mở khóa kèm lý do', !F.chot && F.nhatKy.map(x => x.hanh).join() === 'chot,mokhoa' && F.nhatKy[1].lyDo === 'Sửa số phiếu cân bị nhập nhầm', JSON.stringify(F.nhatKy));
  // 3. dừng lô B
  await open('fb', 'xuat'); await w.fill('#chotLyDo', 'Chủ rừng không khai thác nữa'); await w.click('[data-act=chotDung]'); await w.waitForTimeout(500);
  ok('dừng lô: trạng thái Đã dừng, chỉ đọc', /Đã dừng/.test(await w.innerText('#chotTT')) && !!(await w.$('#loKhoaBar')));
  await w.click('[data-act=chotMoLai]'); await w.waitForTimeout(400);
  ok('mở lại lô cần lý do: chưa mở được khi để trống', /Đã dừng/.test(await w.innerText('#chotTT')));
  await w.fill('#chotLyDo', 'Tiếp tục khai thác'); await w.click('[data-act=chotMoLai]'); await w.waitForTimeout(500);
  ok('mở lại lô có lý do: trở về trạng thái suy ra', !/Đã dừng/.test(await w.innerText('#chotTT')) && !(await w.$('#loKhoaBar')));
  ok('không có lỗi script trên màn hình', errs.length === 0, errs.join(' | '));
  await app.close(); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
