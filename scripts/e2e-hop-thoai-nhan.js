'use strict';
/* UI-04 (V10.4): mọi hộp thoại ([role=dialog] / [role=alertdialog]) có tên đọc được khi mở: aria-labelledby trỏ tới phần tử CÓ THẬT và có chữ, hoặc aria-label.
 *  - Báo cáo (rpBox) và Hướng dẫn (guideBox): mở bằng thao tác thật;
 *  - stBox, dlgBox, impBox: nội dung do nhiều nơi trong mã đổ vào, nên đổ thử tiêu đề h2 / h3 / không tiêu đề vào thân hộp (đúng cách mã thật làm) và kiểm nhãn.
 * Chạy: xvfb-run -a node scripts/e2e-hop-thoai-nhan.js */
const {_electron: electron} = require('playwright-core');
const path = require('path'), fs = require('fs'), os = require('os');
const src = fs.readFileSync(path.join(__dirname, 'e2e-inan2.js'), 'utf8');
const {lot, seed, PC, EXP1} = new Function(src.slice(src.indexOf('const nv ='), src.indexOf('const plain =')) + '; return {lot, seed, PC, EXP1};')();
const root = path.join(__dirname, '..'), dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hakqn-nhan-'));
let fail = 0; const ok = (name, cond, extra) => { console.log((cond ? 'ĐẠT  ' : 'LỖI  ') + name + (!cond && extra ? ' — ' + extra : '')); if (!cond) fail++; };

(async () => {
  const app = await electron.launch({executablePath: require('electron'), args: [root, '--no-sandbox'], env: {...process.env, HAKQN_CLOSE: 'discard', HAKQN_DB: path.join(dir, 'd.sqlite'), HAKQN_USERDATA: path.join(dir, 'ud')}});
  const w = await app.firstWindow(); const errs = []; w.on('pageerror', e => errs.push(e.message)); w.on('dialog', d => d.accept()); await w.waitForSelector('#side');
  await w.evaluate(d => window.hak.save(d), seed([lot('fa', 'R-A', {exp: EXP1, pc: PC, kl: 29.75})])); await w.reload(); await w.waitForSelector('#side');
  /* nhãn hiệu lực của hộp: tên đọc được và id trỏ tới tồn tại */
  const nhan = id => w.evaluate(i => {
    const b = document.getElementById(i), lb = b.getAttribute('aria-labelledby'), al = b.getAttribute('aria-label');
    const el = lb ? document.getElementById(lb) : null;
    return {lb, al, ten: el ? el.textContent.trim() : (al || ''), tonTai: lb ? !!el : !!al, role: b.getAttribute('role')};
  }, id);
  await w.click('[data-act=rpOpen]'); await w.waitForSelector('#rpBox.on'); await w.waitForTimeout(100);
  let m = await nhan('rpBox'); ok('Báo cáo (rpBox): aria-labelledby trỏ tới tiêu đề thật (' + m.ten + ')', m.tonTai && m.ten.length > 0, JSON.stringify(m));
  await w.evaluate(() => document.getElementById('rpBox').classList.remove('on'));
  await w.evaluate(() => document.getElementById('guideBox').classList.add('on'));
  m = await nhan('guideBox'); ok('Hướng dẫn (guideBox): aria-labelledby trỏ tới tiêu đề thật (' + m.ten + ')', m.lb === 'guideBoxTitle' && m.tonTai && m.ten.length > 0, JSON.stringify(m));
  await w.evaluate(() => document.getElementById('guideBox').classList.remove('on'));
  for (const [box, body, id] of [['stBox', 'stBody', 'stBoxTitle'], ['dlgBox', 'dlgBody', 'dlgBoxTitle'], ['impBox', 'impBody', 'impBoxTitle']]) {
    for (const [loai, html, ten] of [['h2', '<div class="gh"><h2>Tiêu đề thử</h2></div><p>Nội dung</p>', 'Tiêu đề thử'], ['h3', '<h3 style="margin-top:0">Hộp thử ba</h3><p>x</p>', 'Hộp thử ba']]) {
      await w.evaluate(([b, bd, h]) => { document.getElementById(bd).innerHTML = h; document.getElementById(b).classList.add('on'); }, [box, body, html]); await w.waitForTimeout(60);
      m = await nhan(box); ok(box + ' (' + loai + '): tên đọc được = “' + ten + '”', m.tonTai && m.ten === ten, JSON.stringify(m));
    }
    await w.evaluate(([b, bd]) => { document.getElementById(bd).innerHTML = '<p>Không có tiêu đề</p>'; }, [box, body]); await w.waitForTimeout(60);
    m = await nhan(box); ok(box + ' (không tiêu đề): vẫn có aria-label dự phòng', !m.lb && !!m.al, JSON.stringify(m));
    await w.evaluate(b => document.getElementById(b).classList.remove('on'), box);
  }
  /* quét chung: sáu hộp dựng sẵn trong trang (hdBox, hdAsk có tiêu đề do mã tạo lúc mở, đã có aria-labelledby từ trước) */
  const hong = await w.evaluate(() => ['rpBox', 'impBox', 'dlgBox', 'stBox', 'guideBox', 'lkBox'].map(i => document.getElementById(i)).filter(b => {
    const lb = b.getAttribute('aria-labelledby'); return !(b.getAttribute('aria-label') || (lb && document.getElementById(lb)));
  }).map(b => b.id));
  ok('sáu hộp dựng sẵn đều có nhãn hợp lệ (aria-label hoặc aria-labelledby trỏ tới phần tử có thật)', hong.length === 0, hong.join(','));
  ok('không có lỗi script trên màn hình', errs.length === 0, errs.join(' | '));
  await app.close(); console.log(fail ? 'CÓ ' + fail + ' LỖI' : 'TẤT CẢ ĐẠT'); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
