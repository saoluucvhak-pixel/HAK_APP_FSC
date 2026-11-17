'use strict';
/* A4: dòng nhân công nhập trước khi có ngày chụp danh mục (_dmNgay) không bị đề nghị "Cập nhật từ danh mục" lùi về số cũ;
 * chỉ khi danh mục có dòng MỚI HƠN lần chụp (sau nâng cấp) mới đề nghị, và chỉ trường có giá trị.
 * Chạy: xvfb-run -a node scripts/e2e-ngaychup.js */
const {_electron: electron} = require('playwright-core');
const path = require('path'), fs = require('fs'), os = require('os');
const src = fs.readFileSync(path.join(__dirname, 'e2e-inan2.js'), 'utf8');
const {nv, lot, seed} = new Function(src.slice(src.indexOf('const nv ='), src.indexOf('const plain =')) + '; return {nv, lot, seed};')();
const root = path.join(__dirname, '..');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hakqn-ngaychup-'));
let fail = 0; const ok = (name, cond, extra) => { console.log((cond ? 'ĐẠT  ' : 'LỖI  ') + name + (!cond && extra ? ' — ' + extra : '')); if (!cond) fail++; };
(async () => {
  const app = await electron.launch({executablePath: require('electron'), args: [root, '--no-sandbox'], env: {...process.env, HAKQN_CLOSE: 'discard', HAKQN_DB: path.join(dir, 'd.sqlite'), HAKQN_USERDATA: path.join(dir, 'ud')}});
  const w = require('./_hd30').boc(await app.firstWindow()); const errs = []; w.on('pageerror', e => errs.push(e.message)); w.on('dialog', d => d.accept()); await w.waitForSelector('#side');
  // lô cũ: người "LÊ CÔNG NHÂN" đã sửa tay địa chỉ trong lô, khác dòng danh mục ngày 01/01/2026; dòng lô chưa có _dmNgay (dữ liệu trước bản này)
  const A = lot('fa', 'R-A', {exp: {}, pc: [], kl: null});
  A.nc = A.nc.map(r => Object.assign({}, r)); const lc = A.nc.find(r => r.ten === 'LÊ CÔNG NHÂN'); lc.diaChi = 'Địa chỉ SỬA TAY trong lô';
  const D = seed([A]); D.dmLaoDong = [{ngayCapNhat: '01/01/2026', cccd: lc.cccd, ten: lc.ten, diaChi: 'Địa chỉ cũ của danh mục', ngaySinh: lc.ngaySinh, ngayCap: lc.ngayCap, noiCap: lc.noiCap}];
  await w.evaluate(d => window.hak.save(d), D); await w.reload(); await w.waitForSelector('#side');
  const open = async () => { await w.click('[data-open=own1]'); await w.click('[data-tab=rung]'); await w.click('[data-forest=fa]'); await w.click('[data-ftab=nc]'); await w.waitForTimeout(300); };
  await open();
  ok('dòng cũ sửa tay khác danh mục (danh mục không mới hơn): KHÔNG đề nghị cập nhật lùi về số cũ', !(await w.$('#dmLechnc')));
  // một lần ghi bất kỳ (ở đây: lưu Thông tin chủ rừng) ghi luôn ngày chụp vừa gán cho dòng cũ — như SQLite v11 khi nâng cấp thật
  await w.click('[data-tab=info]'); await w.click('#infoForm button[type=submit]'); await w.waitForTimeout(500);
  let db = await w.evaluate(() => window.hak.loadSync().db);
  ok('ngày chụp của dòng cũ = ngày cập nhật của dòng danh mục hiện hành (01/01/2026), đã ghi SQLite', db.rs.own1.forests.fa.nc.find(r => r.cccd === lc.cccd)._dmNgay === '01/01/2026');
  // danh mục có dòng mới hơn (cập nhật sau nâng cấp)
  db.dmLaoDong.push({ngayCapNhat: '01/01/2099', cccd: lc.cccd, ten: lc.ten, diaChi: 'Địa chỉ MỚI của danh mục', ngaySinh: '', ngayCap: '', noiCap: ''});
  await w.evaluate(d => window.hak.save(d), db); await w.reload(); await w.waitForSelector('#side'); await open();
  const t = await w.innerText('#dmLechnc').catch(() => '');
  ok('danh mục có dòng mới hơn lần chụp: đề nghị cập nhật, chỉ trường có giá trị (thường trú), không đụng ngày sinh / ngày cấp trống', /LÊ CÔNG NHÂN \(thường trú\)/.test(t) && !/ngày sinh|ngày cấp/.test(t), t);
  ok('không có lỗi JavaScript', errs.length === 0, errs.join('|'));
  await app.close(); console.log(fail ? 'CÓ ' + fail + ' LỖI' : 'TẤT CẢ ĐẠT'); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
