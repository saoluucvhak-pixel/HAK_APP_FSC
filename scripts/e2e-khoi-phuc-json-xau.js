'use strict';
/* Lô 2 (T-11): "Khôi phục toàn bộ dữ liệu (.json)" với file xấu trong app thật (Electron, SQLite thật, dữ liệu giả lập):
 * mỗi file bị từ chối bằng tiếng Việt TRƯỚC màn xem trước, dữ liệu trên máy không đổi, không có lỗi JavaScript, Tổng quan vẫn vẽ được;
 * file có mâu thuẫn mở màn xem trước KHÔNG chọn sẵn "Thay toàn bộ dữ liệu". Chạy: xvfb-run -a node scripts/e2e-khoi-phuc-json-xau.js */
const {_electron: electron} = require('playwright-core');
const path = require('path'), fs = require('fs'), os = require('os');
const root = path.join(__dirname, '..');
const {Store} = require('../src/store');
const base = fs.mkdtempSync(path.join(os.tmpdir(), 'hakqn-jx-')), ud = path.join(base, 'ud');
let fail = 0; const ok = (name, cond, extra) => { console.log((cond ? 'ĐẠT  ' : 'LỖI  ') + name + (!cond && extra ? ' — ' + extra : '')); if (!cond) fail++; };
const lo = (id, ma) => ({id, info: {maRung: ma, tenRung: 'Rừng ' + ma}, nc: [], dx: [], pc: [], exp: {}});
(async () => {
  fs.mkdirSync(ud, {recursive: true});
  const dbf = path.join(base, 'd.sqlite'); { const s = new Store(dbf); s.save({v: 2, rs: {o1: {id: 'o1', info: {ma: 'C01', ten: 'NGUYEN VAN A', cccd: '049090001111'}, forests: {f1: lo('f1', 'R-1')}}}}); s.close(); }
  const app = await electron.launch({executablePath: require('electron'), args: [root, '--no-sandbox'], env: {...process.env, HAKQN_USERDATA: ud, HAKQN_DB: dbf, HAKQN_CLOSE: 'discard', ELECTRON_DISABLE_SECURITY_WARNINGS: '1'}});
  const w = await app.firstWindow(), errs = []; w.on('pageerror', e => errs.push(e.message)); await w.waitForSelector('#side');
  await w.click('#navSet'); await w.click('#setTab_setbk');
  let n = 0; const nap = async text => { const f = path.join(base, 'f' + (++n) + '.json'); fs.writeFileSync(f, text); await w.setInputFiles('input[data-file=restore]', f); await w.waitForTimeout(400); };
  const dem = () => w.evaluate(async () => { const r = await window.hak.saoLuu.list(); return (r.items || []).filter(x => /truoc-khoi-phuc/.test(x.name)).length; });
  const truoc = await w.evaluate(() => JSON.stringify(window.hak.loadSync().db));
  const bkTruoc = await dem();
  const XAU = {
    'lô là chuỗi': [JSON.stringify({v: 2, rs: {o1: {id: 'o1', info: {ten: 'B'}, forests: {f1: 'abc'}}}}), /không đúng cấu trúc/],
    'chủ rừng không có info': [JSON.stringify({v: 2, rs: {o9: {id: 'o9', forests: {}}}}), /không đúng cấu trúc/],
    'nhân công [1,2]': [JSON.stringify({v: 2, rs: {o1: {id: 'o1', info: {ten: 'B'}, forests: {f1: Object.assign(lo('f1', 'R-1'), {nc: [1, 2]})}}}}), /không đúng cấu trúc/],
    'phiên bản v3': [JSON.stringify({v: 3, rs: {}}), /phiên bản mới hơn/],
    'cú pháp hỏng': ['{"v":2,"rs":{"o1":{', /bị cắt dở/],
  };
  for (const [ten, [text, re]] of Object.entries(XAU)) {
    await nap(text);
    const msg = await w.evaluate(() => ({body: document.body.innerText, imp: document.querySelector('#impBox').classList.contains('on')}));
    ok('file ' + ten + ': báo lỗi tiếng Việt, không mở màn xem trước', re.test(msg.body) && !msg.imp && !/Expected|Unexpected token|undefined/.test(msg.body), msg.body.slice(0, 200));
  }
  const sau = await w.evaluate(() => JSON.stringify(window.hak.loadSync().db));
  ok('dữ liệu trên máy không đổi', truoc === sau && JSON.parse(sau).rs.o1.forests.f1.info.maRung === 'R-1');
  ok('không sinh bản "Trước khi khôi phục"', (await dem()) === bkTruoc);
  // file có mâu thuẫn (cùng ID chủ rừng, mã lô của lô khác): màn xem trước không chọn sẵn cách nào
  const mt = JSON.stringify({v: 2, rs: {o1: {id: 'o1', info: {ma: 'C01', ten: 'NGUYEN VAN A', cccd: '049090001111'}, forests: {f9: lo('f9', 'R-1')}}, o2: {id: 'o2', info: {ma: 'C02', ten: 'TRAN VAN B'}, forests: {f1: lo('f1', 'R-7')}}}});
  await nap(mt);
  const pv = await w.evaluate(() => { const on = document.querySelector('#impBox').classList.contains('on'); const chk = [...document.querySelectorAll('input[name=impStrat]')].filter(i => i.checked).map(i => i.value);
    const coMT = !!document.querySelector('input[name=impStrat][value=skip]') && document.querySelector('input[name=impStrat][value=skip]').disabled; return {on, chk, coMT}; });
  ok('file có mâu thuẫn: mở màn xem trước, các cách gộp bị khóa', pv.on && pv.coMT, JSON.stringify(pv));
  ok('file có mâu thuẫn: không chọn sẵn "Thay toàn bộ dữ liệu"', pv.on && pv.chk.length === 0, JSON.stringify(pv));
  await w.click('[data-act=impGo]'); await w.waitForTimeout(300);
  const go = await w.evaluate(() => { return {body: document.body.innerText, on: document.querySelector('#impBox').classList.contains('on')}; });
  ok('bấm Thực hiện khi chưa chọn: nhắc chọn cách xử lý, không ghi', /Chọn một cách xử lý/.test(go.body) && go.on);
  await w.evaluate(() => document.querySelector('#impBox').classList.remove('on'));
  const tq = await w.evaluate(async () => { const b = [...document.querySelectorAll('button,a')].find(x => /Tổng quan/.test(x.textContent)); if (b) b.click(); await new Promise(r => setTimeout(r, 300)); return document.body.innerText.length > 100; });
  ok('Tổng quan vẫn vẽ được', tq);
  ok('không có lỗi JavaScript', errs.length === 0, errs.join(' | '));
  await app.close();
  console.log(fail ? fail + ' MỤC LỖI' : 'ĐẠT HẾT'); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
