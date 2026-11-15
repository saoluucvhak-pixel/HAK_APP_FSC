/* TÌM KIẾM TOÀN CỤC (bản 2.2, mục 5.1): một ô tìm cho người, CCCD, biển số, số phiếu cân, mã lô, chủ rừng, số hợp đồng, đối tác, MST. Hàm thuần, chỉ ĐỌC dữ liệu.
 * Không phân biệt dấu tiếng Việt và hoa thường; biển số so khớp sau khi bỏ dấu chấm, gạch, khoảng trắng; số CCCD và số phiếu tìm được theo đoạn cuối.
 * Kết quả nhóm theo loại: {nhom: 'Lô' | 'Chủ rừng' | 'Người' | 'Xe' | 'Đối tác' | 'Phiếu cân' | 'Văn bản', ds: [{nhan, ngu, dich}]}; dich = nơi mở:
 *   {to: 'lo', oid, fid, ftab} | {to: 'chu', oid} | {to: 'dm', tab, q}. */
(function (root) {
  const s = v => String(v == null ? '' : v).trim();
  const fold = v => s(v).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();
  const plate = v => fold(v).replace(/[\s.\-]/g, '');
  const digits = v => s(v).replace(/\D/g, '');
  const NHOM = ['Lô', 'Chủ rừng', 'Người', 'Xe', 'Đối tác', 'Phiếu cân', 'Văn bản'];
  /* điểm khớp của một trường: 3 = bằng, 2 = đầu / đuôi (số), 1 = chứa, 0 = không */
  function diem(q, val, kind) {
    if (!s(val)) return 0;
    if (kind === 'bien') { const a = plate(q), b = plate(val); return !a ? 0 : a === b ? 3 : b.startsWith(a) ? 2 : b.includes(a) ? 1 : 0; }
    if (kind === 'so') { const a = digits(q), b = digits(val); if (a && a.length >= 3 && a.length === s(q).replace(/[\s.\-]/g, '').length) return a === b ? 3 : b.endsWith(a) ? 2 : b.includes(a) ? 1 : 0; }
    const a = fold(q), b = fold(val); return !a ? 0 : a === b ? 3 : b.startsWith(a) ? 2 : b.includes(a) ? 1 : 0;
  }
  const best = (q, specs) => specs.reduce((m, [v, k]) => Math.max(m, diem(q, v, k)), 0);
  function tim(db, q, opts) {
    const lim = (opts && opts.moiNhom) || 8, out = {}; NHOM.forEach(n => { out[n] = []; });
    q = s(q); if (q.length < 2) return NHOM.map(n => ({nhom: n, ds: []}));
    const add = (nhom, d, item) => { if (d > 0) out[nhom].push(Object.assign({d}, item)); };
    const tuy = a => q.split(/\s+/).filter(Boolean).every(w => a.some(v => fold(v).includes(fold(w))));   // nhiều từ: mọi từ phải có ở một trường nào đó
    Object.entries((db && db.rs) || {}).forEach(([oid, o]) => {
      const oi = (o && o.info) || {};
      const dChu = Math.max(best(q, [[oi.ten, 't'], [oi.ma, 't'], [oi.cccd, 'so'], [oi.sdt, 'so']]), tuy([oi.ten, oi.ma, oi.diaChi]) ? 1 : 0);
      add('Chủ rừng', dChu, {nhan: oi.ten || '(chưa đặt tên)', ngu: 'CCCD ' + s(oi.cccd) + (oi.ma ? ' · mã ' + oi.ma : ''), dich: {to: 'chu', oid}});
      Object.entries((o && o.forests) || {}).forEach(([fid, f]) => {
        const i = f.info || {}, ma = s(i.maRung), ctx = 'lô ' + (ma || fid) + ' · ' + (oi.ten || '');
        add('Lô', Math.max(best(q, [[i.maRung, 't'], [i.tenRung, 't'], [i.diaDiem, 't']]), tuy([i.maRung, i.tenRung, i.diaDiem, oi.ten]) ? 1 : 0), {nhan: ma || '(chưa có mã)', ngu: (i.tenRung || '') + (i.diaDiem ? ' · ' + i.diaDiem : '') + ' · chủ ' + (oi.ten || ''), dich: {to: 'lo', oid, fid, ftab: 'finfo'}});
        (f.nc || []).forEach(r => add('Người', best(q, [[r.ten, 't'], [r.cccd, 'so']]), {nhan: s(r.ten), ngu: 'CCCD ' + s(r.cccd) + ' · ' + s(r.chucDanh || r.vaiTro) + ' · ' + ctx, dich: {to: 'lo', oid, fid, ftab: 'nc'}}));
        (f.dx || []).forEach(r => {
          add('Xe', best(q, [[r.bienSo, 'bien'], [r.chuXe, 't'], [r.taiXe, 't'], [r.cccd, 'so'], [r.cccdTx, 'so']]), {nhan: s(r.bienSo), ngu: 'chủ xe ' + s(r.chuXe) + (r.taiXe ? ' · tài xế ' + r.taiXe : '') + ' · ' + ctx, dich: {to: 'lo', oid, fid, ftab: 'dx'}});
        });
        (f.pc || []).forEach(r => add('Phiếu cân', best(q, [[r.soPhieu, 'so'], [r.soPhieu, 't'], [r.bienSo, 'bien']]), {nhan: 'Phiếu ' + s(r.soPhieu), ngu: s(r.ngay) + ' · ' + s(r.bienSo) + ' · ' + (typeof r.kl === 'number' ? String(r.kl).replace('.', ',') + ' tấn' : '') + ' · ' + ctx, dich: {to: 'lo', oid, fid, ftab: 'dx'}}));
        const vb = []; const num = (e, ten) => Object.entries(e || {}).forEach(([k, v]) => { if (/^(so|uqSo|ntSo|pcSo)/.test(k) && s(v)) vb.push([k, s(v), ten]); });
        num(f.exp, ''); (f.doi || []).forEach(d => num(d.exp, d.ten || 'đội')); (f.hdvc || []).forEach(h => num(h.exp, h.ten || 'đội xe'));
        vb.forEach(([k, v, ten]) => add('Văn bản', best(q, [[v, 't']]), {nhan: 'Số ' + v, ngu: ({soKT: 'hợp đồng khai thác', uqSo: 'giấy ủy quyền', ntSo: 'nghiệm thu', soVC: 'hợp đồng vận chuyển', pcSo: 'phiếu cân'}[k] || k) + (ten ? ' (' + ten + ')' : '') + ' · ' + ctx, dich: {to: 'lo', oid, fid, ftab: 'xuat'}}));
      });
    });
    (db.dmLaoDong || []).forEach(r => add('Người', best(q, [[r.ten, 't'], [r.cccd, 'so']]), {nhan: s(r.ten), ngu: 'Danh mục lao động · CCCD ' + s(r.cccd) + ' · ' + s(r.viTri), dich: {to: 'dm', tab: 'laodong', q: s(r.cccd) || s(r.ten)}}));
    (db.dmXeVC || []).forEach(r => add('Xe', best(q, [[r.bienSo, 'bien'], [r.chuXe, 't'], [r.taiXe, 't'], [r.cccdTx, 'so']]), {nhan: s(r.bienSo), ngu: 'Danh mục xe · chủ xe ' + s(r.chuXe) + ' · tài xế ' + s(r.taiXe), dich: {to: 'dm', tab: 'xe', q: s(r.bienSo)}}));
    (db.dmDoiTac || []).forEach(r => add('Đối tác', best(q, [[r.ten, 't'], [r.cccd, 'so'], [r.mst, 'so']]), {nhan: s(r.ten), ngu: 'Danh mục đối tác · ' + (r.mst ? 'MST ' + r.mst : 'CCCD ' + s(r.cccd)), dich: {to: 'dm', tab: 'doitac', q: s(r.ten)}}));
    Object.values(db.dmDonViVC || {}).forEach(r => add('Đối tác', best(q, [[r.ten, 't'], [r.mst, 'so'], [r.daiDien, 't']]), {nhan: s(r.ten), ngu: 'Doanh nghiệp vận chuyển' + (r.mst ? ' · MST ' + r.mst : ''), dich: {to: 'dm', tab: 'doitac', q: s(r.ten)}}));
    // gộp trùng (cùng nhãn + nguồn), xếp theo điểm rồi theo nhãn, cắt mỗi nhóm
    return NHOM.map(n => { const seen = new Set(); const ds = out[n].filter(x => { const k = x.nhan + '|' + x.ngu; if (seen.has(k)) return false; seen.add(k); return true; }).sort((a, b) => b.d - a.d || a.nhan.localeCompare(b.nhan, 'vi')); return {nhom: n, tong: ds.length, ds: ds.slice(0, lim)}; });
  }
  const api = {tim, fold, plate, NHOM};
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.HAKTimKiem = api;
})(typeof self !== 'undefined' ? self : this);
