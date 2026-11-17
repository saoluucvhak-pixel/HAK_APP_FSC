'use strict';
/* Bản 3.0: tab Nhân công / Vận chuyển của rừng mở DANH SÁCH hợp đồng, chọn một hợp đồng mới vào trang chi tiết.
 * Các kiểm thử đầu-cuối viết trước 3.0 thao tác thẳng trên màn chi tiết. Bọc trang Playwright để giữ nguyên các kiểm thử đó:
 *  - bấm tab Nhân công / Vận chuyển (data-ftab=nc|dx): nếu đang ở danh sách thì mở hợp đồng đã mở lần trước của tab đó (lần đầu: hợp đồng đầu tiên);
 *  - thao tác trên phần tử không có ở trang chi tiết (danh sách đội, thêm đội, cước chung của lô…): quay lại danh sách rồi làm tiếp.
 * Hành vi mới (danh sách, trang chi tiết, quay lại) được kiểm riêng ở e2e-hopdong30. */
const TAB = /\[data-ftab=["']?(nc|dx)["']?\]/;
const DS = {nc: '#dsHdNcTbl tbody tr[data-act=chonDoi]', dx: '#dsHdVcTbl tbody tr[data-act=chonHd]'};
function boc(w) {
  if (!w || w.__hd30) return w; w.__hd30 = true;
  const nho = {nc: null, dx: null};
  const goc = {click: w.click.bind(w), fill: w.fill.bind(w), check: w.check.bind(w), uncheck: w.uncheck.bind(w), selectOption: w.selectOption.bind(w), setInputFiles: w.setInputFiles.bind(w), $eval: w.$eval.bind(w), $$eval: w.$$eval.bind(w), waitForSelector: w.waitForSelector.bind(w), $: w.$.bind(w), $$: w.$$.bind(w), innerText: w.innerText.bind(w), inputValue: w.inputValue.bind(w), textContent: w.textContent.bind(w), getAttribute: w.getAttribute.bind(w), isChecked: w.isChecked.bind(w), isVisible: w.isVisible.bind(w), dispatchEvent: w.dispatchEvent.bind(w), focus: w.focus.bind(w), press: w.press.bind(w), type: w.type.bind(w), isDisabled: w.isDisabled.bind(w), isEnabled: w.isEnabled.bind(w), isEditable: w.isEditable.bind(w), hover: w.hover.bind(w), dblclick: w.dblclick.bind(w)};   // waitForSelector không bọc: phần tử chờ xuất hiện
  const moChiTiet = async k => {
    if (!(await goc.$(DS[k]))) return;
    const attr = k === 'nc' ? 'data-doi' : 'data-hd', sel = nho[k] && (await goc.$(DS[k] + '[' + attr + '="' + nho[k] + '"]')) ? DS[k] + '[' + attr + '="' + nho[k] + '"]' : DS[k];
    const id = await w.$eval(sel, (e, a) => e.getAttribute(a), attr);
    await w.evaluate(([k, id]) => window.__hdMo(k, id), [k, id]); await w.waitForTimeout(150);   // không qua hộp hỏi lưu bản nháp: cùng lô, bản nháp giữ nguyên
  };
  const quayLai = async () => { const k = await ghiNho(); if (k) await w.evaluate(k => window.__hdMo(k, null), k); else await goc.click('#hdQuayLai'); await w.waitForTimeout(150); return k; };
  const ghiNho = async () => { try { const v = await w.evaluate(() => { const b = document.getElementById('hdQuayLai'); return b ? b.dataset.kind : null; }); return v; } catch (e) { return null; } };
  /* 3.0 tách màn nhập thành các mục (.mucNav): chỉ mục đang mở được vẽ. Phần tử không có thì thử lần lượt các mục của màn đang mở. */
  const timMuc = async sel => {
    const ds = await w.evaluate(() => [...document.querySelectorAll('.mucNav [data-muc-lo]')].map(b => [b.dataset.loNhom, b.dataset.mucLo, b.hasAttribute('aria-current')])).catch(() => []);
    if (!ds.length) return false;
    const dangMo = ds.find(x => x[2]);
    for (const [k, id, on] of ds) {
      if (on) continue;
      await w.evaluate(([k, id]) => window.__mucLo(k, id), [k, id]); await w.waitForTimeout(60);
      if (await goc.$(sel)) return true;
    }
    if (dangMo) await w.evaluate(([k, id]) => window.__mucLo(k, id), dangMo);
    return false;
  };
  const truoc = async sel => {   // phần tử cần thao tác chưa có trên trang chi tiết: quay lại danh sách
    if (typeof sel !== 'string' || TAB.test(sel)) return;
    try { if (await goc.$(sel)) return; } catch (e) { return; }
    if (await timMuc(sel)) return;
    await truocCu(sel);
    try { if (await goc.$(sel)) return; } catch (e) { return; }
    await timMuc(sel);
  };
  const truocCu = async sel => {
    if (!(await goc.$('#hdQuayLai'))) {   // đang ở danh sách mà phần tử chỉ có ở trang chi tiết: mở hợp đồng đã nhớ (hoặc đầu tiên)
      const k = (await goc.$(DS.nc)) ? 'nc' : (await goc.$(DS.dx)) ? 'dx' : null; if (!k) return;
      if (await goc.waitForSelector(sel, {state: 'attached', timeout: 800}).then(() => true, () => false)) return;
      await moChiTiet(k); return;
    }
    if (await goc.waitForSelector(sel, {state: 'attached', timeout: 1500}).then(() => true, () => false)) return;   // phần tử vẽ chậm (sau thao tác bất đồng bộ): chờ một chút trước khi kết luận
    if (await goc.$('[data-act=pcTatCa]')) { await goc.click('[data-act=pcTatCa]'); await w.waitForTimeout(150); if (await goc.$(sel)) return; }   // phiếu của hợp đồng khác: xem mọi phiếu của rừng
    const k = await quayLai();
    if (k && (await goc.$(sel)) == null && (await goc.$(DS[k]))) await moChiTiet(k);   // cũng không có ở danh sách: trở lại chi tiết
  };
  const sau = async sel => {
    const m = typeof sel === 'string' && TAB.exec(sel); if (m) await moChiTiet(m[1]);
    if (typeof sel === 'string' && /data-act=["']?(chonDoi|chonHd)/.test(sel)) {   // bấm chọn đội / đội xe ở danh sách: nhớ để lần sau mở lại đúng hợp đồng
      const k = /chonDoi/.test(sel) ? 'nc' : 'dx', v = /data-(doi|hd)=["']?([^"'\]]+)/.exec(sel); if (v) nho[k] = v[2];
    }
  };
  /* 3.0: danh sách rừng của chủ rừng nằm trong khối gập (details.rungTomTat): mở khối gập chứa phần tử trước khi bấm */
  const moGap = async sel => { if (typeof sel === 'string') await w.evaluate(s => { let e; try { e = document.querySelector(s); } catch (x) { return; } for (let d = e && e.closest('details:not([open])'); d; d = d.parentElement && d.parentElement.closest('details:not([open])')) d.open = true; }, sel).catch(() => {}); };
  w.click = async (sel, o) => { await truoc(sel); await moGap(sel); const r = await goc.click(sel, o); await sau(sel); return r; };
  ['fill', 'check', 'uncheck', 'selectOption', 'setInputFiles', '$eval', '$$eval'].forEach(n => { w[n] = async (sel, ...a) => { await truoc(sel); return goc[n](sel, ...a); }; });
  /* đọc / thao tác khác: phần tử nằm ở mục chưa mở thì mở mục đó (không thấy ở mục nào thì giữ nguyên mục đang mở) */
  ['innerText', 'inputValue', 'textContent', 'getAttribute', 'isChecked', 'isDisabled', 'isEnabled', 'isEditable', 'dispatchEvent', 'focus', 'press', 'type', 'hover', 'dblclick'].forEach(n => { w[n] = async (sel, ...a) => { await truoc(sel); return goc[n](sel, ...a); }; });
  /* trước 3.0 một màn chứa mọi phần: đọc chữ của cả màn (#main, body) thì gộp chữ của mọi mục rồi trở lại mục đang mở */
  w.innerText = async (sel, ...a) => {
    if (sel !== '#main' && sel !== 'body') { await truoc(sel); return goc.innerText(sel, ...a); }
    const ds = await w.evaluate(() => [...document.querySelectorAll('.mucNav [data-muc-lo]')].map(b => [b.dataset.loNhom, b.dataset.mucLo, b.hasAttribute('aria-current')])).catch(() => []);
    const dau = await goc.innerText(sel, ...a); if (!ds.length) return dau;
    const parts = [dau], dangMo = ds.find(x => x[2]);
    for (const [k, id, on] of ds) { if (on) continue; await w.evaluate(([k, id]) => window.__mucLo(k, id), [k, id]); parts.push(await goc.innerText(sel, ...a)); }
    if (dangMo) await w.evaluate(([k, id]) => window.__mucLo(k, id), dangMo);
    return parts.join('\n');
  };
  w.$ = async sel => { const r = await goc.$(sel); if (r || typeof sel !== 'string' || TAB.test(sel)) return r; return (await timMuc(sel)) ? goc.$(sel) : null; };
  w.$$ = async sel => { const r = await goc.$$(sel); if (r.length || typeof sel !== 'string' || TAB.test(sel)) return r; return (await timMuc(sel)) ? goc.$$(sel) : r; };
  w.isVisible = async (sel, ...a) => { if (typeof sel === 'string' && !(await goc.$(sel))) await timMuc(sel); return goc.isVisible(sel, ...a); };
  w.waitForSelector = async (sel, o = {}) => {
    if (typeof sel !== 'string' || o.state === 'hidden' || o.state === 'detached') return goc.waitForSelector(sel, o);
    const t = o.timeout == null ? 30000 : o.timeout;
    const r = await goc.waitForSelector(sel, {...o, timeout: Math.min(t, 1500)}).catch(() => null); if (r) return r;
    await timMuc(sel); return goc.waitForSelector(sel, o);
  };
  return w;
}
module.exports = {boc};
