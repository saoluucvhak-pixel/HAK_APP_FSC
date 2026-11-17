'use strict';
/* Dùng chung cho các kịch bản e2e: nạp file hoặc đưa dữ liệu từ bản tra cứu nay chỉ vào BẢN NHÁP; hàm này bấm “Lưu dữ liệu vào lô” (gọi đúng hàm lưu của ứng dụng)
 * để các kịch bản kiểm tra dữ liệu đã lưu. Luồng bấm nút thật được kiểm ở scripts/e2e-luuvaolo.js. */
exports.saveStage = async w => { const r = await w.evaluate(async () => (window.__stDirty && window.__stDirty().length) ? await window.__stSaveCurrent() : null); await w.waitForTimeout(500); return r; };

/* File thử cũ chứa phiếu của nhiều hợp đồng. Xác nhận từng dòng có đúng một đích theo BKS trước khi lưu. */
exports.xacNhanHopDongPhieu = async w => {
  const doiDich = w.locator('#pcGanTbl tr:has([data-act=pgDoiHd])');
  const soDong = await doiDich.count();
  for (let i = 0; i < soDong; i++) {
    const row = doiDich.first();
    const options = row.locator('[data-act=pgDoiHd]');
    if (await options.count() !== 1) throw new Error('Phiếu thử có nhiều hợp đồng đích: ' + await row.innerText());
    await options.click();
  }
  if (await doiDich.count()) throw new Error('Còn phiếu thử chưa xác nhận được hợp đồng đích');
};

/* Thêm một xe vào BẢN NHÁP bằng hộp thoại (đang ở tab Vận chuyển): đủ trường bắt buộc của người ký là chủ xe */
exports.addXe = async (w, bienSo, chuXe) => {
  await w.click('[data-act=stAdd][data-kind=dx]'); await w.waitForSelector('#stForm');
  const set = async (k, v) => { const sel = await w.$('#stForm select[name=' + k + ']'); if (sel) await w.selectOption('#stForm select[name=' + k + ']', v); else await w.fill('#stForm input[name=' + k + ']', v); };
  const n = String(Math.abs([...bienSo].reduce((a, c) => a * 31 + c.charCodeAt(0), 7))).padStart(12, '0').slice(0, 12);
  for (const [k, v] of Object.entries({bienSo, chuXe: chuXe || 'CHỦ XE ' + bienSo, ngaySinh: '01/01/1980', cccd: n, ngayCap: '01/01/2021', noiCap: 'CA', diaChi: 'Đà Nẵng', sdt: '0905123456', nguoiKy: 'Chủ xe', loaiXe: 'Xe tải'})) await set(k, v);
  await w.click('#stForm [type=submit]'); await w.waitForTimeout(300);
};

/* Nhập một ô số / ngày văn bản (data-exp) ở ĐÚNG MÀN của đối tượng sở hữu nó (đội: tab Nhân công; vận chuyển: tab Vận chuyển; lô: tab Xuất hồ sơ),
 * rồi trở lại tab (và nhóm trong tab Xuất) đang xem để kịch bản tiếp tục như trước. */
exports.setExp = async (w, k, v) => {
  const back = await w.evaluate(() => ({ftab: (document.querySelector('[data-ftab].on') || {}).dataset?.ftab, xtab: (document.querySelector('[data-xtab].on') || {}).dataset?.xtab}));
  const go = await w.evaluate(k => window.__expTab(k), k);
  if (back.ftab !== go.ftab) await w.click('[data-ftab=' + go.ftab + ']');
  if (go.xtab && (back.ftab !== 'xuat' || back.xtab !== go.xtab)) await w.click('[data-xtab=' + go.xtab + ']');
  await w.fill('[data-exp=' + k + ']', v); await w.dispatchEvent('[data-exp=' + k + ']', 'change');
  await w.evaluate(() => window.__stSaveCurrent());   // một cách lưu: ô vào bản nháp của lô, người dùng bấm “Lưu dữ liệu vào lô”
  if (back.ftab && back.ftab !== go.ftab) { await w.click('[data-ftab=' + back.ftab + ']'); if (back.ftab === 'xuat' && back.xtab) await w.click('[data-xtab=' + back.xtab + ']'); }
  else if (back.ftab === 'xuat' && back.xtab && back.xtab !== go.xtab) await w.click('[data-xtab=' + back.xtab + ']');
};
