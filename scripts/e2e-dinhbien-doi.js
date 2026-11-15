'use strict';
/* A1: so định mức nhân công theo TỪNG đội. Lô 2 đội: đội 1 đủ người, đội 2 chỉ có Tổ trưởng.
 * Cảnh báo lệch chỉ cho đội 2 (màn đội và Kiểm tra trước khi xuất, đối tượng là đội 2); bảng vị trí so với đội đang chọn.
 * Chạy: xvfb-run -a node scripts/e2e-dinhbien-doi.js */
const {_electron: electron} = require('playwright-core');
const path = require('path'), fs = require('fs'), os = require('os');
const src = fs.readFileSync(path.join(__dirname, 'e2e-inan2.js'), 'utf8');
const {nv, lot, seed} = new Function(src.slice(src.indexOf('const nv ='), src.indexOf('const plain =')) + '; return {nv, lot, seed};')();
const root = path.join(__dirname, '..');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hakqn-dbdoi-'));
let fail = 0; const ok = (name, cond, extra) => { console.log((cond ? 'ĐẠT  ' : 'LỖI  ') + name + (!cond && extra ? ' — ' + extra : '')); if (!cond) fail++; };
(async () => {
  const app = await electron.launch({executablePath: require('electron'), args: [root, '--no-sandbox'], env: {...process.env, HAKQN_CLOSE: 'discard', HAKQN_DB: path.join(dir, 'd.sqlite'), HAKQN_USERDATA: path.join(dir, 'ud')}});
  const w = await app.firstWindow(); const errs = []; w.on('pageerror', e => errs.push(e.message)); w.on('dialog', d => d.accept()); await w.waitForSelector('#side');
  const p = (i, vai, ten, cd, doi) => ({...nv(i, vai, ten, cd, '04908500' + String(5000 + i)), doi});
  const A = lot('fa', 'R-A', {exp: {}, pc: [], kl: null, nc: [p(1, 'Tổ trưởng', 'TRẦN MỘT', 'Tổ trưởng', 'Đội 1'), p(2, 'Công nhân', 'LÊ A', 'Công nhân khai thác', 'Đội 1'), p(3, 'Công nhân', 'LÊ B', 'Công nhân cưa', 'Đội 1'), p(4, 'Tổ trưởng', 'NGUYỄN HAI', 'Tổ trưởng', 'Đội 2')]});
  const D = seed([A]); D.dinhBien = [{chucDanh: 'Tổ trưởng', soNguoi: 1, nhiemVu: 'Điều hành'}, {chucDanh: 'Công nhân khai thác', soNguoi: 1, nhiemVu: 'Khai thác'}, {chucDanh: 'Công nhân cưa', soNguoi: 1, nhiemVu: 'Cưa'}];
  await w.evaluate(d => window.hak.save(d), D); await w.reload(); await w.waitForSelector('#side');
  await w.click('[data-open=own1]'); await w.click('[data-tab=rung]'); await w.click('[data-forest=fa]'); await w.click('[data-ftab=nc]'); await w.waitForTimeout(300);
  const all = await w.$$eval('.dbLechDoi', els => els.map(e => e.innerText)), lech = all.filter(x => /lệch định mức/.test(x));
  ok('cảnh báo lệch định mức chỉ cho đội 2; đội 1 ghi đúng định mức', lech.length === 1 && /Đội “Đội 2”/.test(lech[0]) && all.some(x => /Đội “Đội 1” đúng định mức/.test(x)), JSON.stringify(all));
  await w.click('[data-act=chonDoi][data-doi=doi1]'); await w.waitForTimeout(200); let t = await w.innerText('#dbPanel summary');
  ok('chọn đội 1: bảng vị trí so với đội 1', /so với đội “Đội 1”/.test(t), t);
  await w.click('[data-act=chonDoi][data-doi=doi2]'); await w.waitForTimeout(200); t = await w.innerText('#dbPanel summary');
  await w.click('#dbPanel summary'); const tb = await w.innerText('#dbPanel');
  ok('chọn đội 2: bảng vị trí so với đội 2, cột Hiện có của đội 2', /so với đội “Đội 2”/.test(t) && /Hiện có \(Đội 2\)/.test(tb), t + ' | ' + tb.slice(0, 200));
  await w.click('[data-ftab=kt]'); await w.waitForTimeout(300); const kt = await w.innerText('#main');
  ok('Kiểm tra trước khi xuất: lệch định mức của đội 2, không báo đội 1', /Số người của đội “Đội 2” khác định mức/.test(kt) && !/Số người của đội “Đội 1” khác định mức/.test(kt), kt.slice(0, 300));
  ok('không có lỗi JavaScript', errs.length === 0, errs.join('|'));
  await app.close(); console.log(fail ? 'CÓ ' + fail + ' LỖI' : 'TẤT CẢ ĐẠT'); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
