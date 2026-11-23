'use strict';
/* Giao diện V10.4 (phiếu UI-01..UI-04): kiểm tĩnh trên ui/app.src.html, ui/app/*.js, luxe.css.
 * UI-01 biến --sel; UI-02 màu chữ --mut-aa; UI-03 bảng compact (đo thực ở scripts/e2e-bang-gon.js); UI-04 aria-labelledby các hộp thoại. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path');
const R = p => fs.readFileSync(path.join(__dirname, '..', p), 'utf8');
const html = R('ui/app.src.html'), css = R('ui/vendor/hak-design-system/luxe.css');
const mọiJs = fs.readdirSync(path.join(__dirname, '..', 'ui', 'app')).filter(f => f.endsWith('.js')).map(f => R('ui/app/' + f)).join('\n');

function block(src, selector) {
  const vars = {};
  for (const m of src.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    if (m[1].trim() !== selector) continue;
    for (const v of m[2].matchAll(/--([\w-]+)\s*:\s*([^;]+)/g)) vars[v[1]] = v[2].trim();
  }
  return vars;
}
const lin = v => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
const rgb = h => { h = h.slice(1); if (h.length === 3) h = [...h].map(c => c + c).join(''); return [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16)); };
const lum = c => 0.2126 * lin(c[0] / 255) + 0.7152 * lin(c[1] / 255) + 0.0722 * lin(c[2] / 255);
const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
/* màu (hex hoặc rgba) pha lên nền hex */
function pha(v, nen) {
  const m = /^rgba\(\s*(\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)$/.exec(v);
  if (!m) return rgb(v);
  const a = +m[4], n = rgb(nen);
  return [0, 1, 2].map(i => Math.round(+m[i + 1] * a + n[i] * (1 - a)));
}
const LIGHT = {...block(css, ':root'), ...block(css, '[data-skin="luxe"]')};
const DARK = {...LIGHT, ...block(css, '[data-theme="dark"]'), ...block(css, '[data-skin="luxe"][data-theme="dark"]')};

test('UI-01: --sel định nghĩa chính thức ở sáng và tối, JS không còn fallback #eef5ee', () => {
  assert.match(html, /:root\{[^}]*--sel:var\(--accSoft,#eef5ee\)/, 'thiếu --sel ở :root (sáng)');
  assert.match(html, /:root\[data-theme=dark\]\{[^}]*--sel:var\(--hover,#1e3550\)/, 'thiếu --sel ở giao diện tối');
  for (const f of ['12-c-hop-dong-vc', '11-d-luu-ban-nhap']) {
    const s = R('ui/app/' + f + '.js');
    assert.ok(!/var\(--sel,\s*#eef5ee\)/.test(s), f + ' còn fallback cứng #eef5ee');
    assert.ok(!/background:var\(--sel/.test(s), f + ' còn inline background --sel (dùng class sel)');
  }
  assert.match(html, /tr\.sel\b[^{]*\{[^}]*background:var\(--sel\)/, 'thiếu quy tắc tr.sel');
  assert.match(R('ui/app/12-c-hop-dong-vc.js'), /class="' \+ \(sel && sel\.id === h\.id \? 'sel'/, 'hàng hợp đồng chưa dùng class sel');
});
test('UI-01: chữ trên nền hàng chọn đạt ≥ 4,5:1 (sáng và tối, giao diện luxe)', () => {
  const selS = pha(LIGHT.brandSoft, LIGHT.card);
  assert.ok(ratio(rgb(LIGHT.ink), selS) >= 4.5, 'sáng ' + ratio(rgb(LIGHT.ink), selS));
  assert.ok(ratio(rgb(DARK.ink), rgb(DARK.hover)) >= 4.5, 'tối ' + ratio(rgb(DARK.ink), rgb(DARK.hover)));
  assert.ok(ratio(rgb('#1e3550'), rgb(DARK.ink)) >= 4.5, 'tối (dự phòng #1e3550)');
});
test('UI-02: .rungTomTat và #loCrumb dùng --mut-aa; --mut-aa đủ tương phản trên nền thẻ', () => {
  assert.match(html, /\.rungTomTat\{[^}]*color:var\(--mut-aa\)/);
  assert.match(html, /#loCrumb\{[^}]*color:var\(--mut-aa\)/);
  assert.ok(!/\.rungTomTat\{[^}]*color:var\(--mut\)/.test(html));
  assert.ok(!/#loCrumb\{[^}]*color:var\(--mut\)/.test(html));
  assert.ok(ratio(rgb(LIGHT['mut-aa']), rgb(LIGHT.card)) >= 4.5, 'sáng');
  assert.match(css, /\[data-theme="dark"\]\{--mut-aa:var\(--mut\)\}/);
  assert.ok(ratio(rgb(DARK.mut), rgb(DARK.card)) >= 4.5, 'tối ' + ratio(rgb(DARK.mut), rgb(DARK.card)));
});
test('UI-03: quy tắc compact áp cho cả #stTbl_pc, #stTbl_nc, #stTbl_dx', () => {
  for (const id of ['pc', 'nc', 'dx']) {
    assert.match(html, new RegExp('#stTbl_' + id + ' th,#stTbl_' + id + ' td\\{padding:4px 7px;font-size:12\\.5px\\}'), id + ' thiếu padding/font compact');
    assert.match(html, new RegExp('\\.wrap:has\\(> #stTbl_' + id + '\\)\\{max-height:55vh;overflow:auto\\}'), id + ' thiếu max-height cuộn');
    assert.match(html, new RegExp('#stTbl_' + id + ' thead th\\{position:sticky;top:0'), id + ' thiếu sticky thead');
  }
});
test('UI-04: 5 hộp thoại có aria-labelledby trỏ tới id tiêu đề cố định có trong mã', () => {
  const nguon = html + mọiJs;
  for (const [box, id] of [['rpBox', 'rpBoxTitle'], ['impBox', 'impBoxTitle'], ['dlgBox', 'dlgBoxTitle'], ['stBox', 'stBoxTitle'], ['guideBox', 'guideBoxTitle']]) {
    assert.match(html, new RegExp('<div id="' + box + '" role="dialog" aria-modal="true"[^>]* aria-labelledby="' + id + '"'), box + ' thiếu aria-labelledby');
    assert.ok(nguon.includes('id="' + id + '"') || nguon.includes("'" + id + "'"), 'không có phần tử id=' + id);
  }
});
test('UI-04: mọi [role=dialog] có aria-label hoặc aria-labelledby', () => {
  const ds = [...html.matchAll(/<div id="(\w+)" role="dialog"([^>]*)>/g)];
  assert.ok(ds.length >= 8);
  for (const m of ds) assert.match(m[2], /aria-label(ledby)?="/, m[1] + ' thiếu nhãn');
});
