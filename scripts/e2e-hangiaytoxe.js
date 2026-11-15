'use strict';
/* Hạn giấy tờ xe so với NGÀY PHIẾU CÂN: phiếu chạy khi kiểm định, bảo hiểm hoặc GPLX đã hết hạn thì BM-09/BM-10 của đội xe đó bị chặn (Electron thật, SQLite thật).
 * Chạy: xvfb-run -a node scripts/e2e-hangiaytoxe.js */
const {_electron: electron} = require('playwright-core');
const path = require('path'), fs = require('fs'), os = require('os');
const JSZip = require('jszip');
const src = fs.readFileSync(path.join(__dirname, 'e2e-inan2.js'), 'utf8');
const {nv, xe, P, lot, seed} = new Function(src.slice(src.indexOf('const nv ='), src.indexOf('const plain =')) + '; return {nv, xe, P, lot, seed};')();
const root = path.join(__dirname, '..');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hakqn-han-')), out = path.join(dir, 'out'); fs.mkdirSync(out);
let fail = 0; const ok = (name, cond, extra) => { console.log((cond ? 'ĐẠT  ' : 'LỖI  ') + name + (!cond && extra ? ' — ' + extra : '')); if (!cond) fail++; };
const plain = xml => (xml.match(/<w:t[^>]*>([^<]*)<\/w:t>/g) || []).map(a => a.replace(/<[^>]+>/g, '')).join('');
(async () => {
  const app = await electron.launch({executablePath: require('electron'), args: [root, '--no-sandbox'], env: {...process.env, HAKQN_CLOSE: 'discard', HAKQN_DB: path.join(dir, 'd.sqlite'), HAKQN_USERDATA: path.join(dir, 'ud'), HAKQN_DOWNLOAD_DIR: out}});
  const w = await app.firstWindow(); const errs = []; w.on('pageerror', e => errs.push(e.message)); w.on('dialog', d => d.accept()); await w.waitForSelector('#side');
  const hang = {kdDen: '31/12/2027', hanBH: '31/12/2027'};
  // xe 1 (kiểm định hết hạn 06/10/2026, phiếu P3 cân 07/10) và xe 2 (đủ hạn): hai người ký khác nhau = hai đội xe
  const x1 = {...xe('92C-12345', '049000000077', 'LÊ VĂN MỘT'), ...hang, kdDen: '06/10/2026'}, x2 = {...xe('92C-67890', '049000000078', 'TRẦN VĂN HAI'), ...hang};
  const PCS = [P(1, '05/10/2026', '92C-12345', 'PA1', 12.5), P(2, '06/10/2026', '92C-67890', 'PA2', 9.25), P(3, '07/10/2026', '92C-12345', 'PA3', 8)];
  const A = lot('fa', 'R-A', {exp: {soKT: '015', ngayKy: '02/10/2026', soVC: '07', ntSo: '03', pcSo: '09', pcNgay: '20/12/2026', ntNgay: '20/12/2026'}, pc: PCS, dx: [x1, x2], kl: 29.75});
  const B = lot('fb', 'R-B', {exp: {soKT: '016', ngayKy: '02/10/2026', soVC: '08', ntSo: '04', pcSo: '10', pcNgay: '20/12/2026', ntNgay: '20/12/2026'}, pc: PCS.map(p => ({...p, maRung: 'R-B', soPhieu: 'B-' + p.soPhieu})), dx: [{...x1, kdDen: '07/10/2026', maRung: 'R-B'}, {...x2, maRung: 'R-B'}], kl: 29.75});
  B.nc = B.nc.map(r => ({...r, maRung: 'R-B'}));
  await w.evaluate(d => window.hak.save(d), seed([A, B])); await w.reload(); await w.waitForSelector('#side');
  const open = async fid => { await w.click('[data-open=own1]'); await w.click('[data-tab=rung]'); await w.click('[data-forest=' + fid + ']'); await w.waitForTimeout(300); };
  const zipNames = async () => { for (const f of fs.readdirSync(out)) fs.unlinkSync(path.join(out, f)); await w.click('[data-ftab=xuat]'); await w.waitForTimeout(300); await w.click('button[data-act=dl][data-kind=all]'); let f = null; for (let i = 0; i < 100 && !f; i++) { f = fs.readdirSync(out).find(x => x.endsWith('.zip')); await w.waitForTimeout(200); } await w.waitForTimeout(500); const z = await JSZip.loadAsync(fs.readFileSync(path.join(out, f))); return Object.keys(z.files).filter(n => !z.files[n].dir); };
  // 1. lô A: phiếu P3 cân 07/10 khi kiểm định xe 92C-12345 đã hết hạn 06/10
  await open('fa'); await w.click('[data-ftab=kt]'); await w.waitForTimeout(400); const kt = await w.innerText('#main');
  ok('Kiểm tra trước khi xuất: lỗi chặn nêu đội xe, số phiếu, ngày cân, giấy tờ và ngày hết hạn', /Giấy tờ xe hết hạn lúc chạy phiếu/.test(kt) && /LÊ VĂN MỘT/.test(kt) && /phiếu PA3 ngày 07\/10\/2026/.test(kt) && /kiểm định đã hết hạn từ 06\/10\/2026/.test(kt), kt.slice(0, 600));
  ok('bộ kiểm tra chung: mục chặn ghi đối tượng (Đội xe “LÊ VĂN MỘT”) và biểu mẫu bị chặn (chỉ BM-09, BM-10; không chặn BM-04)', /Đội xe “LÊ VĂN MỘT”/.test(kt) && /chặn BM-09, BM-10/.test(kt) && !/chặn BM-04/.test(kt), kt.slice(0, 500));
  ok('phiếu cân đúng hạn (PA1 05/10, PA2 của xe đủ hạn) không bị nêu', !/phiếu PA1 ngày/.test(kt) && !/phiếu PA2 ngày/.test(kt));
  let names = await zipNames(); const vc9 = names.filter(n => /09_XN_khoi_luong_VC\//.test(n)), vc10 = names.filter(n => /10_TT_tien_VC\//.test(n));
  ok('BM-09 và BM-10 chỉ còn của đội xe đủ hạn (TRẦN VĂN HAI); đội xe có giấy tờ hết hạn bị chặn', vc9.length === 1 && vc10.length === 1 && /TRAN_VAN_HAI|TRẦN_VĂN_HAI|TRAN-VAN-HAI|TRAN VAN HAI/i.test(vc9[0].normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/Đ/g, 'D')), names.join(', '));
  // 2. lô B: kiểm định hết hạn 07/10, phiếu cân 07/10 (đúng ngày hết hạn) vẫn hợp lệ
  await open('fb'); await w.click('[data-ftab=kt]'); await w.waitForTimeout(400);
  ok('lô B: cân đúng ngày hết hạn thì còn hiệu lực, không có lỗi giấy tờ hết hạn', !/Giấy tờ xe hết hạn lúc chạy phiếu/.test(await w.innerText('#main')));
  names = await zipNames();
  ok('lô B: đủ BM-09 và BM-10 của cả hai đội xe', names.filter(n => /09_XN_khoi_luong_VC\//.test(n)).length === 2 && names.filter(n => /10_TT_tien_VC\//.test(n)).length === 2, names.join(', '));
  ok('không có lỗi script trên màn hình', errs.length === 0, errs.join(' | '));
  await app.close(); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
