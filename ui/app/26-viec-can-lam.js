/* ========== Việc cần làm trên màn Tổng quan (bản 2.2; src/vieccanlam.js) ==========
 * Gom việc của mọi lô: phiếu cân chưa gán đội (chặn), giấy tờ xe sắp hết hạn (cảnh báo), mẫu nợ in hoặc chưa ký, lô lâu không có phiếu mới, lô chưa chốt (nhắc). Mỗi dòng bấm để đến đúng tab của lô. */
function viecCanLamBox(recs) {
  let ds = []; const td = {};
  (recs || []).forEach(r => { td[r.fid] = {noIn: r.noIn || 0, chuaKy: r.chuaKy || 0, trangThai: r.trangThai || ''}; });
  try { ds = HAKViecCanLam.viecCanLam(Object.assign({}, db, dmCu()), {homNay: new Date(), tienDo: td}); } catch (e) { ds = []; }
  const NH = {chan: ['pill err', 'Chặn'], canh: ['pill warn', 'Cảnh báo'], nhac: ['pill', 'Nhắc việc']}, dem = m => ds.filter(x => x.muc === m).length;
  if (!ds.length) return '<div class="card" id="vclBox" style="margin-bottom:10px"><h3 style="margin-top:0">Việc cần làm</h3><p class="mut" style="margin:0">Không có việc nào cần xử lý ngay.</p></div>';
  return '<div class="card" id="vclBox" style="margin-bottom:10px"><h3 style="margin-top:0">Việc cần làm <span class="mut" style="font-weight:400">· ' + dem('chan') + ' chặn · ' + dem('canh') + ' cảnh báo · ' + dem('nhac') + ' nhắc việc</span></h3>' +
    '<div class="dlist">' + ds.slice(0, 12).map(x => '<button class="drow" data-act="vclMo" data-vcl="' + esc(x.oid + '|' + x.fid + '|' + x.ftab) + '"><span><span class="' + NH[x.muc][0] + '">' + NH[x.muc][1] + '</span> <b>' + esc(x.ma) + '</b> <span class="mut">· ' + esc(x.text) + '</span></span><span>›</span></button>').join('') + '</div>' +
    (ds.length > 12 ? '<p class="mut" style="margin:6px 0 0">… và ' + (ds.length - 12) + ' việc khác.</p>' : '') + '</div>';
}
