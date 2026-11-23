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
    await w.evaluate(([k, id]) => window.__hak.hdMo(k, id), [k, id]); await w.waitForTimeout(150);   // không qua hộp hỏi lưu bản nháp: cùng lô, bản nháp giữ nguyên
  };
  const quayLai = async () => { const k = await ghiNho(); if (k) await w.evaluate(k => window.__hak.hdMo(k, null), k); else await goc.click('#hdQuayLai'); await w.waitForTimeout(150); return k; };
  const ghiNho = async () => { try { const v = await w.evaluate(() => { const b = document.getElementById('hdQuayLai'); return b ? b.dataset.kind : null; }); return v; } catch (e) { return null; } };
  /* 3.0 tách màn nhập thành các mục (.mucNav): chỉ mục đang mở được vẽ. Phần tử không có thì thử lần lượt các mục của màn đang mở. */
  const thay = async (sel, hien) => { const e = await goc.$(sel); return !!e && (!hien || await e.isVisible().catch(() => true)); };
  /* đổi mục thì màn vẽ lại: giữ giá trị các ô đang gõ dở (chưa lưu) của mục đang mở để trả lại khi quay về */
  const chupNhap = () => w.evaluate(() => [...document.querySelectorAll('.mucNoiDung input, .mucNoiDung select, .mucNoiDung textarea')].filter(e => e.name && e.type !== 'file').map(e => [(e.form && e.form.id) || '', e.name, e.type, e.type === 'checkbox' || e.type === 'radio' ? e.checked : e.value, e.value])).catch(() => []);
  const veMuc = async (m, oNhap) => {
    await w.evaluate(([k, id]) => window.__hak.mucLo(k, id), m);
    if (oNhap && oNhap.length) await w.evaluate(ds => ds.forEach(([f, n, t, v, val]) => { const root = f ? document.getElementById(f) : document; if (!root) return; const els = [...(f ? root.elements : root.querySelectorAll('[name]'))].filter(e => e.name === n && (t !== 'radio' || e.value === val)); els.forEach(e => { if (t === 'checkbox' || t === 'radio') e.checked = v; else if (e.value !== v) e.value = v; }); }), oNhap).catch(() => {});
  };
  const timMuc = async (sel, hien) => {
    const ds = await w.evaluate(() => [...document.querySelectorAll('.mucNav [data-muc-lo]')].map(b => [b.dataset.loNhom, b.dataset.mucLo, b.hasAttribute('aria-current')])).catch(() => []);
    if (!ds.length) return false;
    const dangMo = ds.find(x => x[2]), oNhap = await chupNhap();
    for (const [k, id, on] of ds) {
      if (on) continue;
      await veMuc([k, id], oNhap); await w.waitForTimeout(60);   // ô cùng tên ở mục mới (form Thông tin rừng vẽ đủ ô, ẩn ô mục khác) nhận lại giá trị đang gõ dở
      if (await thay(sel, hien)) return true;
    }
    if (dangMo) await veMuc(dangMo, oNhap);
    return false;
  };
  /* PR C: “Sao lưu và khôi phục” chia tab con (Thao tác / Thư mục và lịch / Các bản sao lưu): phần tử nằm ở khung đang ẩn thì mở tab con chứa nó (chỉ đổi thao tác mở tab, như người dùng bấm tab) */
  const moTabCon = async sel => { if (typeof sel !== 'string') return; const k = await w.evaluate(s => { let e; try { e = document.querySelector(s); } catch (x) { return null; } const p = e && e.closest && e.closest('[data-sbpane][hidden]'); return p ? p.dataset.sbpane : null; }, sel).catch(() => null); if (k) { await goc.click('[data-sbtab="' + k + '"]'); await w.waitForTimeout(80); } };
  const truoc = async sel => {   // phần tử cần thao tác chưa có trên trang chi tiết: quay lại danh sách
    await moTabCon(sel);
    if (typeof sel !== 'string' || TAB.test(sel)) return;
    try { if (await goc.$(sel)) return; } catch (e) { return; }
    if (await timMuc(sel)) return;
    await truocCu(sel);
    try { if (await goc.$(sel)) return; } catch (e) { return; }
    await timMuc(sel);
  };
  /* trang Thông tin rừng 3.0 vẽ cả form nhưng ẩn ô không thuộc mục đang mở: ô bị ẩn (không phải ô chọn file, không nằm trong khối gập) thì tìm mục có ô hiện */
  const hienRa = async sel => {
    if (typeof sel !== 'string' || TAB.test(sel)) return;
    const can = await w.evaluate(s => { let e; try { e = document.querySelector(s); } catch (x) { return false; } if (!e || e.closest('details:not([open])') || (e.type === 'file') || e.type === 'hidden') return false; return !(e.offsetWidth || e.offsetHeight || e.getClientRects().length); }, sel).catch(() => false);
    if (can) await timMuc(sel, true);
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
  const moGap = async sel => { if (typeof sel === 'string') await w.evaluate(s => { let e; try { e = document.querySelector(s); } catch (x) { return; } for (let d = e && e.closest('details:not([open])'); d; d = d.parentElement && d.parentElement.closest('details:not([open])')) { const tieuDe = e.closest('summary'); if (!(tieuDe && tieuDe.parentElement === d)) d.open = true; } }, sel).catch(() => {}); };   // bấm chính tiêu đề khối gập thì để thao tác bấm tự mở
  /* phiếu #06b (D-05): màn Cài đặt ẩn cột chủ rừng; muốn mở một chủ rừng thì về Tổng quan trước (như người dùng) */
  const veTongQuan = async sel => { if (typeof sel !== 'string' || !/^\[data-open=/.test(sel)) return; try { const hien = await goc.$eval('#side', e => getComputedStyle(e).display !== 'none'); if (!hien) await goc.click('#navHome'); } catch (e) { /* không có cột chủ rừng để kiểm: bỏ qua */ } };
  w.click = async (sel, o) => { await veTongQuan(sel); await truoc(sel); await hienRa(sel); await moGap(sel); const r = await goc.click(sel, o); await sau(sel); return r; };
  ['fill', 'check', 'uncheck', 'selectOption', 'setInputFiles', '$eval', '$$eval'].forEach(n => { w[n] = async (sel, ...a) => { await truoc(sel); if (!/eval|setInputFiles/.test(n)) await hienRa(sel); return goc[n](sel, ...a); }; });
  /* đọc / thao tác khác: phần tử nằm ở mục chưa mở thì mở mục đó (không thấy ở mục nào thì giữ nguyên mục đang mở) */
  ['innerText', 'inputValue', 'textContent', 'getAttribute', 'isChecked', 'isDisabled', 'isEnabled', 'isEditable', 'dispatchEvent', 'focus', 'press', 'type', 'hover', 'dblclick'].forEach(n => { w[n] = async (sel, ...a) => { await truoc(sel); return goc[n](sel, ...a); }; });
  /* trước 3.0 một màn chứa mọi phần: đọc chữ của cả màn (#main, body) thì gộp chữ của mọi mục rồi trở lại mục đang mở */
  w.innerText = async (sel, ...a) => {
    if (sel !== '#main' && sel !== 'body') { await truoc(sel); return goc.innerText(sel, ...a); }
    const ds = await w.evaluate(() => [...document.querySelectorAll('.mucNav [data-muc-lo]')].map(b => [b.dataset.loNhom, b.dataset.mucLo, b.hasAttribute('aria-current')])).catch(() => []);
    const dau = await goc.innerText(sel, ...a); if (!ds.length) return dau;
    const parts = [dau], dangMo = ds.find(x => x[2]), oNhap = await chupNhap();
    for (const [k, id, on] of ds) { if (on) continue; await w.evaluate(([k, id]) => window.__hak.mucLo(k, id), [k, id]); parts.push(await goc.innerText(sel, ...a)); }
    if (dangMo) await veMuc(dangMo, oNhap);
    return parts.join('\n');
  };
  w.$ = async sel => { const r = await goc.$(sel); if (r || typeof sel !== 'string' || TAB.test(sel)) return r; return (await timMuc(sel)) ? goc.$(sel) : null; };
  w.$$ = async sel => { const r = await goc.$$(sel); if (r.length || typeof sel !== 'string' || TAB.test(sel)) return r; return (await timMuc(sel)) ? goc.$$(sel) : r; };
  w.isVisible = async (sel, ...a) => { if (typeof sel === 'string' && !(await goc.$(sel))) await timMuc(sel); return goc.isVisible(sel, ...a); };
  w.waitForSelector = async (sel, o = {}) => {
    if (typeof sel !== 'string' || o.state === 'hidden' || o.state === 'detached') return goc.waitForSelector(sel, o);
    const t = o.timeout == null ? 30000 : o.timeout;
    const r = await goc.waitForSelector(sel, {...o, timeout: Math.min(t, 1500)}).catch(() => null); if (r) return r;
    await timMuc(sel);
    let dung = false; const poll = (async () => { const dl = Date.now() + t; while (!dung && Date.now() < dl) { await moTabCon(sel); await w.waitForTimeout(200); } })();   // PR C: phần tử vẽ chậm, nằm ở tab con đang ẩn của Sao lưu và khôi phục: mở tab con chứa nó
    try { return await goc.waitForSelector(sel, o); } finally { dung = true; await poll.catch(() => {}); }
  };
  return w;
}
module.exports = {boc};
