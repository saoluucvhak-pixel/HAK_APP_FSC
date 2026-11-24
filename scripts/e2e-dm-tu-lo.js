'use strict';
/* Phiếu #05 (ND-05; rà soát 01: A-06): lưu lô có người mới (chưa có trong Danh mục đối tượng) — Electron thật, SQLite thật.
 *  - KHÔNG ghi vào danh mục cũ dmLaoDong / dmXeVC (bản lưu trữ 3.0, màn Danh mục không hiện);
 *  - hỏi (hộp xác nhận) rồi mới thêm vào Danh mục đối tượng; đồng ý → có hồ sơ thể nhân mang CCCD đó, chức vụ Nhân công, dòng lô nối ID người;
 *  - từ chối → không thêm gì vào danh mục nào.
 * Chạy: xvfb-run -a node scripts/e2e-dm-tu-lo.js */
const {_electron: electron} = require('playwright-core');
const path = require('path'), fs = require('fs'), os = require('os');
const src = fs.readFileSync(path.join(__dirname, 'e2e-inan2.js'), 'utf8');
const {lot, seed} = new Function(src.slice(src.indexOf('const nv ='), src.indexOf('const plain =')) + '; return {lot, seed};')();
const root = path.join(__dirname, '..');
process.env.HAKQN_E2E_TAY_HOP = '1';   // bước 3: hỏi bằng hộp thoại trong ứng dụng; bộ này tự thao tác hộp (tắt bộ tự bấm của _hd30)
let fail = 0; const ok = (name, cond, extra) => { console.log((cond ? 'ĐẠT  ' : 'LỖI  ') + name + (!cond && extra ? ' — ' + extra : '')); if (!cond) fail++; };

async function chay(dongY) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hakqn-dmlo-'));
  const app = await electron.launch({executablePath: require('electron'), args: [root, '--no-sandbox'], env: {...process.env, HAKQN_CLOSE: 'discard', HAKQN_DB: path.join(dir, 'd.sqlite'), HAKQN_USERDATA: path.join(dir, 'ud'), HAKQN_DOWNLOAD_DIR: path.join(dir, 'out')}});
  const w = require('./_hd30').boc(await app.firstWindow()); const errs = [], hoi = []; w.on('pageerror', e => errs.push(e.message));
  w.on('dialog', d => { hoi.push(d.message()); d.accept(); });
  await w.waitForSelector('#side');
  await w.evaluate(d => window.hak.save(d), seed([lot('fa', 'R-A', {exp: {}, pc: [], kl: null})])); await w.reload(); await w.waitForSelector('#side');
  const db0 = await w.evaluate(() => window.hak.loadSync().db), ld0 = (db0.dmLaoDong || []).length, xe0 = (db0.dmXeVC || []).length, dt0 = (db0.dmDoiTuong || []).length;
  await w.click('[data-open=own1]'); await w.click('[data-tab=rung]'); await w.click('[data-forest=fa]'); await w.click('[data-ftab=nc]'); await w.waitForTimeout(300);
  await w.click('[data-act=stAdd][data-kind=nc]'); await w.waitForSelector('#stForm [name=ten]');
  await w.selectOption('#stForm [name=vaiTro]', 'Công nhân'); await w.selectOption('#stForm [name=danhXung]', 'Ông');
  for (const [k, v] of [['ten', 'NGUYỄN VĂN MỚI'], ['ngaySinh', '02/03/1990'], ['cccd', '049090000123'], ['ngayCap', '01/01/2022'], ['noiCap', 'Cục CS QLHC'], ['diaChi', 'Quế Sơn, Quảng Nam']]) await w.fill('#stForm [name=' + k + ']', v);
  await w.selectOption('#stForm [name=chucDanh]', 'Công nhân khai thác').catch(() => {});
  await w.click('#stForm [type=submit]'); await w.waitForTimeout(300);
  await w.click('button[data-act=stSave]'); await w.waitForSelector('#dmHopDlg', {timeout: 5000}).catch(() => {});
  const hop = await w.evaluate(() => (document.getElementById('dmHopDlg') || {}).innerText || '');   // hỏi bằng hộp thoại (thay confirm)
  await w.click(dongY ? '#dmHopDlg [data-act=dmHopThem]' : '#dmHopDlg [data-act=dmHopLo]').catch(() => {}); await w.waitForTimeout(900);
  const db = await w.evaluate(() => window.hak.loadSync().db), f = db.rs.own1.forests.fa, r = (f.nc || []).find(x => x.cccd === '049090000123');
  const tim = (db.dmDoiTuong || []).find(o => (o.nguoi || []).some(p => p.cccd === '049090000123'));
  await app.close();
  return {hop, ld: (db.dmLaoDong || []).length - ld0, xe: (db.dmXeVC || []).length - xe0, dt: (db.dmDoiTuong || []).length - dt0, r, tim, hoi, errs};
}

(async () => {
  const a = await chay(true);
  ok('lô đã lưu người mới NGUYỄN VĂN MỚI', !!a.r, JSON.stringify(a.hoi));
  ok('A-06: lưu lô KHÔNG ghi vào danh mục cũ dmLaoDong / dmXeVC', a.ld === 0 && a.xe === 0, 'dmLaoDong +' + a.ld + ', dmXeVC +' + a.xe);
  ok('có hỏi trước khi thêm vào Danh mục đối tượng', /Danh mục đối tượng/.test(a.hop) && /NGUYỄN VĂN MỚI/.test(a.hop), JSON.stringify(a.hop));
  ok('đồng ý: Danh mục đối tượng có hồ sơ thể nhân CCCD 049090000123, chức vụ Nhân công, đủ ngày sinh/ngày cấp/nơi cấp/địa chỉ', !!a.tim && a.tim.loai === 'thenhan' && a.tim.nguoi[0].vaiTro.nhanCong && a.tim.nguoi[0].ngaySinh === '02/03/1990' && a.tim.nguoi[0].noiCap === 'Cục CS QLHC' && a.tim.nguoi[0].diaChi === 'Quế Sơn, Quảng Nam', JSON.stringify(a.tim));
  ok('đồng ý: dòng lô nối ID người của danh mục', !!a.tim && !!a.r && a.r.nguoiId === a.tim.nguoi[0].id, JSON.stringify(a.r && a.r.nguoiId));
  const b = await chay(false);
  ok('Chỉ lưu trong lô (từ chối): không thêm vào danh mục nào (đối tượng, dmLaoDong, dmXeVC)', !!b.r && b.dt === 0 && b.ld === 0 && b.xe === 0 && !b.tim, JSON.stringify([b.dt, b.ld, b.xe]));
  ok('không có lỗi script trên màn hình', a.errs.length === 0 && b.errs.length === 0, a.errs.concat(b.errs).join(' | '));
  console.log(fail ? 'CÓ ' + fail + ' LỖI' : 'TẤT CẢ ĐẠT'); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
