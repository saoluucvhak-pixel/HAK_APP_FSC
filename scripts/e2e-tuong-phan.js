'use strict';
/* Phiếu #10 mục 3 (tương phản màu, WCAG AA) — Electron thật, đo bằng màu tính được (getComputedStyle) trên đúng bảng màu của ứng dụng.
 * Mọi bảng màu (luxe, classic, neutral, champagne) × sáng / tối: nút bị khóa (“Chốt hồ sơ”), nhãn xám (.mut), chip trạng thái (.pill thường / ok / warn / err),
 * nút thường, nút viền, tab chưa chọn, tiêu đề cột, đường dẫn, khung thông báo (ok / warn / err), chip tiến độ phần đầu lô.
 * Ngưỡng: chữ thường ≥ 4,5:1 (mọi mục ở đây là chữ thường, cỡ < 18,66 px đậm / 24 px thường). In bảng số đo; IN=1: chỉ in.
 * Chạy: xvfb-run -a node scripts/e2e-tuong-phan.js */
const {_electron: electron} = require('playwright-core');
const path = require('path'), fs = require('fs'), os = require('os');
const root = path.join(__dirname, '..'), dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hakqn-tp-'));
let fail = 0; const ok = (name, cond, extra) => { console.log((cond ? 'ĐẠT  ' : 'LỖI  ') + name + (!cond && extra ? ' — ' + extra : '')); if (!cond) fail++; };
const MAU = [['Nút bị khóa (Chốt hồ sơ)', '<button class="btn" disabled>Chốt hồ sơ</button>'], ['Nhãn xám (.mut)', '<span class="mut">Nhãn xám</span>'],
  ['Chip trạng thái', '<span class="pill">Đã lưu</span>'], ['Chip đạt', '<span class="pill ok">Đạt</span>'], ['Chip cảnh báo', '<span class="pill warn">Sửa</span>'], ['Chip lỗi', '<span class="pill err">Sẽ xóa</span>'],
  ['Nút thường', '<button class="btn">Lưu</button>'], ['Nút viền', '<button class="btn ghost">Tải file mẫu</button>'],
  ['Tab chưa chọn', '<div class="tabs"><button>Nhân công</button></div>'], ['Tiêu đề cột', '<div class="wrap"><table><thead><tr><th>Số phiếu</th></tr></thead></table></div>'],
  ['Đường dẫn', '<nav class="crumb"><span>Phiếu cân</span></nav>'], ['Thông báo đạt', '<div class="msg ok">Đã lưu.</div>'], ['Thông báo cảnh báo', '<div class="msg warn">Cảnh báo.</div>'],
  ['Thông báo lỗi', '<div class="msg err">Lỗi.</div>'], ['Chip tiến độ đầu lô', '<div class="loDau"><details class="rungTomTat"><summary>Danh sách rừng · Tiến độ 73%</summary></details></div>']];
(async () => {
  const app = await electron.launch({executablePath: require('electron'), args: [root, '--no-sandbox'], env: {...process.env, HAKQN_CLOSE: 'discard', HAKQN_DB: path.join(dir, 'd.sqlite'), HAKQN_USERDATA: path.join(dir, 'ud')}});
  const w = await app.firstWindow(); const errs = []; w.on('pageerror', e => errs.push(e.message)); await w.waitForSelector('#side');
  const kq = [];
  for (const skin of ['luxe', 'classic', 'neutral', 'champagne']) for (const theme of ['light', 'dark']) {
    const r = await w.evaluate(([skin, theme, MAU]) => {
      document.documentElement.dataset.skin = skin; document.documentElement.dataset.theme = theme;
      const box = document.createElement('div'); box.className = 'card'; box.id = 'tpBox'; document.getElementById('main').prepend(box);
      box.innerHTML = MAU.map(([t, h], i) => '<div data-i="' + i + '" style="margin:4px 0">' + h + '</div>').join('');
      const rgba = v => { const m = (v.match(/[\d.]+/g) || []).map(Number), srgb = /^color\(srgb/.test(v), a = /\//.test(v) || (!srgb && m.length > 3) ? m[3] : 1; return {c: m.slice(0, 3).map(x => srgb ? x * 255 : x), a}; };   // rgb(), rgba() và color(srgb r g b / a) (color-mix trả về dạng này)
      const L = c => { const v = c.map(x => { x /= 255; return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); }); return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2]; };
      const nen = el => { const lop = []; for (let n = el; n; n = n.parentElement) { const b = rgba(getComputedStyle(n).backgroundColor); if (b.a > 0) { lop.push(b); if (b.a >= 1) break; } }
        let c = [255, 255, 255]; for (const b of lop.reverse()) c = c.map((x, i) => b.c[i] * b.a + x * (1 - b.a)); return c; };
      const out = MAU.map(([t], i) => { const wrap = box.querySelector('[data-i="' + i + '"]'), el = wrap.querySelector('summary, th, span, button, .msg') || wrap.firstElementChild;
        const cs = getComputedStyle(el), fg = rgba(cs.color), bg = nen(el), op = parseFloat(cs.opacity), mau = fg.c.map((x, k) => x * fg.a * op + bg[k] * (1 - fg.a * op));
        const a = L(mau), b = L(bg); return {t, tp: Math.round(((Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)) * 100) / 100}; });
      box.remove(); return out;
    }, [skin, theme, MAU]);
    kq.push({skin, theme, r});
  }
  console.log('| Mục | ' + kq.map(x => x.skin + ' ' + (x.theme === 'dark' ? 'tối' : 'sáng')).join(' | ') + ' |');
  MAU.forEach(([t], i) => console.log('| ' + t + ' | ' + kq.map(x => String(x.r[i].tp).replace('.', ',')).join(' | ') + ' |'));
  if (!process.env.IN) {
    const duoi = kq.flatMap(x => x.r.filter(y => y.tp < 4.5).map(y => x.skin + '/' + x.theme + ': ' + y.t + ' ' + y.tp));
    ok('mọi mục đạt AA (≥ 4,5:1) ở 4 bảng màu × sáng/tối', !duoi.length, duoi.join('; '));
    ok('không có lỗi script', errs.length === 0, errs.join(' | '));
  }
  await app.close(); console.log(process.env.IN ? '' : fail ? 'CÓ ' + fail + ' LỖI' : 'TẤT CẢ ĐẠT'); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
