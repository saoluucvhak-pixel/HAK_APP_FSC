'use strict';
/* Dùng chung cho các kịch bản e2e: nạp file hoặc đưa dữ liệu từ bản tra cứu nay chỉ vào BẢN NHÁP; hàm này bấm “Lưu dữ liệu vào lô” (gọi đúng hàm lưu của ứng dụng)
 * để các kịch bản kiểm tra dữ liệu đã lưu. Luồng bấm nút thật được kiểm ở scripts/e2e-luuvaolo.js. */
exports.saveStage = async w => { const r = await w.evaluate(async () => (window.__stDirty && window.__stDirty().length) ? await window.__stSaveCurrent() : null); await w.waitForTimeout(500); return r; };

/* Thêm một xe vào BẢN NHÁP bằng hộp thoại (đang ở tab Vận chuyển): đủ trường bắt buộc của người ký là chủ xe */
exports.addXe = async (w, bienSo, chuXe) => {
  await w.click('[data-act=stAdd][data-kind=dx]'); await w.waitForSelector('#stForm');
  const set = async (k, v) => { const sel = await w.$('#stForm select[name=' + k + ']'); if (sel) await w.selectOption('#stForm select[name=' + k + ']', v); else await w.fill('#stForm input[name=' + k + ']', v); };
  const n = String(Math.abs([...bienSo].reduce((a, c) => a * 31 + c.charCodeAt(0), 7))).padStart(12, '0').slice(0, 12);
  for (const [k, v] of Object.entries({bienSo, chuXe: chuXe || 'CHỦ XE ' + bienSo, ngaySinh: '01/01/1980', cccd: n, ngayCap: '01/01/2021', noiCap: 'CA', diaChi: 'Đà Nẵng', sdt: '0905123456', nguoiKy: 'Chủ xe', loaiXe: 'Xe tải'})) await set(k, v);
  await w.click('#stForm [type=submit]'); await w.waitForTimeout(300);
};
