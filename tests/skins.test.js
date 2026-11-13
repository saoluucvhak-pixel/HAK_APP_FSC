'use strict';
/* Bốn bảng màu (classic xanh ngọc, luxe navy–champagne, neutral, champagne) × sáng/tối: chữ đạt WCAG AA (≥ 4,5:1) với đúng giá trị hiệu lực
   (cùng thứ tự chồng lớp như CSS: :root, [data-theme=dark], [data-skin], [data-skin][data-theme=dark]). */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const css = fs.readFileSync(path.join(__dirname, '..', 'ui', 'vendor', 'hak-design-system', 'luxe.css'), 'utf8') + '\n' + fs.readFileSync(path.join(__dirname, '..', 'ui', 'skins.css'), 'utf8');
const stripped = css.replace(/\/\*[\s\S]*?\*\//g, '');       // bỏ chú thích để bộ đọc khối không nhầm selector
function block(selector) {
  const vars = {};
  for (const m of stripped.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    if (m[1].trim() !== selector) continue;
    for (const v of m[2].matchAll(/--([\w-]+)\s*:\s*([^;]+)/g)) vars[v[1]] = v[2].trim();
  }
  return vars;
}
const root = block(':root'), dark = block('[data-theme="dark"]');
function theme(skin, isDark) {
  const s = skin === 'classic' ? {} : block(`[data-skin="${skin}"]`), sd = skin === 'classic' ? {} : block(`[data-skin="${skin}"][data-theme="dark"]`);
  const t = isDark ? {...root, ...dark, ...s, ...sd} : {...root, ...s};   // đúng thứ tự chồng lớp của CSS, không ép giá trị
  for (const k of Object.keys(t)) { const m = /^var\(--([\w-]+)\)$/.exec(t[k]); if (m && t[m[1]]) t[k] = t[m[1]]; }   // luxe.css: [data-theme=dark]{--mut-aa:var(--mut)}
  return t;
}
function lum(hex) {
  let h = hex.slice(1); if (h.length === 3) h = [...h].map(c => c + c).join('');
  const [r, g, b] = [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16) / 255).map(v => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
const isHex = v => typeof v === 'string' && /^#[0-9a-f]{3}([0-9a-f]{3})?$/i.test(v);
const BAR_INK = '#f1ede2';                                       // chữ thanh trên cùng (ui/app.src.html: --barInk) trên --deep
const PAIRS = [['ink', 'card'], ['ink', 'bg'], ['mut-aa', 'card'], ['mut-aa', 'bg'], ['mut-aa', 'th'], ['brand', 'card'], ['brand', 'bg'], ['onBrand', 'brand'], ['onBrand', 'brandH'],
  ['warnFg', 'warnBg'], ['okFg', 'okBg'], ['red', 'card']];

for (const skin of ['classic', 'luxe', 'neutral', 'champagne']) {
  for (const [name, isDark] of [['sáng', false], ['tối', true]]) {
    test(`${skin} ${name}: chữ đạt AA ≥ 4,5:1, thanh trên cùng đọc được`, () => {
      const T = theme(skin, isDark);
      for (const [fg, bg] of PAIRS) {
        const f = T[fg], b = T[bg];
        if (!isHex(f) || !isHex(b)) continue;                                 // nền dạng rgba: bỏ qua, không đoán màu
        assert.ok(ratio(f, b) >= 4.5, `${skin}/${name}: ${fg} trên ${bg} (${f} / ${b}) = ${ratio(f, b).toFixed(2)}:1`);
      }
      assert.ok(isHex(T.deep) && ratio(BAR_INK, T.deep) >= 4.5, `${skin}/${name}: chữ thanh trên cùng trên --deep ${T.deep}`);
    });
  }
}

test('bốn bảng màu khác nhau thật (màu chủ đạo và nền không trùng)', () => {
  const keys = ['classic', 'luxe', 'neutral', 'champagne'].map(s => { const t = theme(s, false); return t.brand + '|' + t.bg; });
  assert.strictEqual(new Set(keys).size, 4, keys.join(' ; '));
});
