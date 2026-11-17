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
  const goc = {click: w.click.bind(w), fill: w.fill.bind(w), check: w.check.bind(w), uncheck: w.uncheck.bind(w), selectOption: w.selectOption.bind(w), setInputFiles: w.setInputFiles.bind(w), $eval: w.$eval.bind(w), $$eval: w.$$eval.bind(w), waitForSelector: w.waitForSelector.bind(w)};   // waitForSelector không bọc: phần tử chờ xuất hiện
  const moChiTiet = async k => {
    if (!(await w.$(DS[k]))) return;
    const attr = k === 'nc' ? 'data-doi' : 'data-hd', sel = nho[k] && (await w.$(DS[k] + '[' + attr + '="' + nho[k] + '"]')) ? DS[k] + '[' + attr + '="' + nho[k] + '"]' : DS[k];
    await goc.click(sel); await w.waitForTimeout(150);
  };
  const ghiNho = async () => { try { const v = await w.evaluate(() => { const b = document.getElementById('hdQuayLai'); return b ? b.dataset.kind : null; }); return v; } catch (e) { return null; } };
  const truoc = async sel => {   // phần tử cần thao tác chưa có trên trang chi tiết: quay lại danh sách
    if (typeof sel !== 'string' || TAB.test(sel)) return;
    try { if (await w.$(sel)) return; } catch (e) { return; }
    if (!(await w.$('#hdQuayLai'))) {   // đang ở danh sách mà phần tử chỉ có ở trang chi tiết: mở hợp đồng đã nhớ (hoặc đầu tiên)
      const k = (await w.$(DS.nc)) ? 'nc' : (await w.$(DS.dx)) ? 'dx' : null; if (!k) return;
      if (await goc.waitForSelector(sel, {state: 'attached', timeout: 800}).then(() => true, () => false)) return;
      await moChiTiet(k); return;
    }
    if (await goc.waitForSelector(sel, {state: 'attached', timeout: 1500}).then(() => true, () => false)) return;   // phần tử vẽ chậm (sau thao tác bất đồng bộ): chờ một chút trước khi kết luận
    if (await w.$('[data-act=pcTatCa]')) { await goc.click('[data-act=pcTatCa]'); await w.waitForTimeout(150); if (await w.$(sel)) return; }   // phiếu của hợp đồng khác: xem mọi phiếu của rừng
    const k = await ghiNho(); await goc.click('#hdQuayLai'); await w.waitForTimeout(150);
    if (k && (await w.$(sel)) == null && (await w.$(DS[k]))) await moChiTiet(k);   // cũng không có ở danh sách: trở lại chi tiết
  };
  const sau = async sel => {
    const m = typeof sel === 'string' && TAB.exec(sel); if (m) await moChiTiet(m[1]);
    if (typeof sel === 'string' && /data-act=["']?(chonDoi|chonHd)/.test(sel)) {   // bấm chọn đội / đội xe ở danh sách: nhớ để lần sau mở lại đúng hợp đồng
      const k = /chonDoi/.test(sel) ? 'nc' : 'dx', v = /data-(doi|hd)=["']?([^"'\]]+)/.exec(sel); if (v) nho[k] = v[2];
    }
  };
  w.click = async (sel, o) => { await truoc(sel); const r = await goc.click(sel, o); await sau(sel); return r; };
  ['fill', 'check', 'uncheck', 'selectOption', 'setInputFiles', '$eval', '$$eval'].forEach(n => { w[n] = async (sel, ...a) => { await truoc(sel); return goc[n](sel, ...a); }; });
  return w;
}
module.exports = {boc};
