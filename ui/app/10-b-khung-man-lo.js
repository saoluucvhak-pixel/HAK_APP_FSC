const mucLoDaMo = new Map();
const mucLoKey = k => JSON.stringify([NAV.cur, NAV.curF, k, k === 'nc' || k === 'dx' ? hdMo(k) : null]);
const mucLoDangMo = (k, macDinh = 'chung') => mucLoDaMo.get(mucLoKey(k)) || macDinh;
CONG_KT.mucLo = (k, id) => { mucLoDaMo.set(mucLoKey(k), id); render(); };
CONG_KT.hdMo = (k, id) => { hdMoDat(k, id || null); render(); };   // kiểm thử đầu-cuối: mở / đóng trang chi tiết hợp đồng trong cùng lô (bản nháp của lô vẫn giữ)   // kiểm thử đầu-cuối: mở một mục nhập (không qua hộp hỏi lưu bản nháp — bản nháp của lô vẫn giữ)
function khungMucLo(k, cacMuc, macDinh = 'chung', opt = {}) {
  const active = mucLoDangMo(k, macDinh);
  const idx = Math.max(0, cacMuc.findIndex(x => x[0] === active)), muc = cacMuc[idx];
  const nextMuc = idx < cacMuc.length - 1 ? cacMuc[idx + 1] : null;
  const nextTabMap = {finfo: ['nc', 'Sang Bước 2: Nhân công →'], nc: ['dx', 'Sang Bước 3: Vận chuyển →'], dx: ['kt', 'Sang Bước 4: Kiểm tra →']};
  const menu = cacMuc.map(([id, ten, , dem, ok]) =>
    '<button type="button" data-muc-lo="' + id + '" data-lo-nhom="' + k + '"' +
    (id === muc[0] ? ' aria-current="page"' : '') + '>' +
    (ok === true ? '<span class="mucIc" style="color:var(--ok)">✓</span>' : ok === false ? '<span class="mucIc" style="color:var(--warnFg,#9a6700)">!</span>' : '<span class="mucIc"></span>') +
    '<span>' + esc(ten) + '</span>' + (dem == null ? '' : '<span class="pill">' + esc(dem) + '</span>') + '</button>').join('');
  const khoa = ['finfo', 'nc', 'dx'].includes(k) && loKhoa(curForest());
  const nextLabel = nextMuc ? 'Lưu & Tiếp tục: ' + nextMuc[1] + ' →' : (nextTabMap[k] ? 'Lưu & ' + nextTabMap[k][1] : 'Lưu');
  const footer = '<div class="hak-step-footer"><span class="mut" style="font-size:12px">Bước ' + (idx + 1) + '/' + cacMuc.length + ' · ' + esc(muc[1]) + '</span>' +
    '<div class="row">' +
    (khoa ? '' : '<button type="button" class="btn ghost sm" data-act="stepSave">Lưu</button>') +
    (nextMuc ? '<button type="button" class="btn sm" data-act="stepNext" data-lo-nhom="' + k + '" data-next-muc="' + esc(nextMuc[0]) + '">' + (khoa ? 'Tiếp tục: ' + esc(nextMuc[1]) + ' →' : esc(nextLabel)) + '</button>'
      : nextTabMap[k] ? '<button type="button" class="btn sm" data-act="stepNext" data-next-ftab="' + nextTabMap[k][0] + '">' + (khoa ? nextTabMap[k][1] : esc(nextLabel)) + '</button>' : '') +
    '</div></div>';
  const body = (khoa ? '<fieldset disabled id="loKhoaFs" class="mucKhoa">' + muc[2]() + '</fieldset>' : muc[2]()) + footer;
  if (opt && opt.inspector) {
    return '<nav class="hak-inspector-tabs mucNav" aria-label="Các mục nhập liệu">' + menu +
      '</nav><div class="hak-pane-body"><section class="mucNoiDung" aria-label="' + esc(muc[1]) + '">' + body + '</section></div>';
  }
  return '<div class="mucLayout"><nav class="mucNav" aria-label="Các mục nhập liệu">' + menu +
    '</nav><section class="mucNoiDung" aria-label="' + esc(muc[1]) + '">' + body + '</section></div>';
}
/* Đường dẫn từ chủ rừng đến mục nhập đang mở. */
function loCrumb(job) {
  const o = curOwner(), f = curForest(); if (!o || !f) return '';
  const man = {finfo: 'Thông tin rừng', nc: 'Nhân công', dx: 'Vận chuyển', kt: 'Kiểm tra trước khi xuất', xuat: 'Xuất hồ sơ', inpc: 'In phiếu cân'}[NAV.ftab] || '';
  let doi = '';
  if (NAV.ftab === 'nc' && job.doi && curTeam(f)) { const t = curTeam(f); doi = esc(tenDoiNc(job, t)); }   // cùng một tên đội với danh sách đội và khung “Chi tiết” (lô một đội chưa đặt tên: “Đội khai thác”)
  if (NAV.ftab === 'dx' && job.hdvc) { const h = job.hdvc.find(x => x.id === NAV.curHd); if (h) { const k = job.hdvc.indexOf(h); doi = 'Đội xe “' + esc(trim(h.ten) || 'Đội xe ' + (k + 1)) + '”'; } }
  const part = [['Chủ rừng “' + esc(o.info.ten || '') + '”', 'data-tab="info"'],
    ['Lô <b>' + esc(f.info.maRung || '(chưa có mã)') + '</b>', 'data-ftab="finfo"']];
  if (man && NAV.ftab !== 'finfo') part.push([man, doi ? 'data-act="hdQuayLai" data-kind="' + NAV.ftab + '"' : '']);
  if (doi) part.push([doi, 'data-muc-lo="chung" data-lo-nhom="' + NAV.ftab + '"']);
  return '<nav class="crumb" id="loCrumb" aria-label="Đường dẫn">' + part.map(([t, a], i) =>
    (i ? ' <span aria-hidden="true">›</span> ' : '') + (a ? '<button type="button" class="linkbtn" ' + a + '>' + t + '</button>' : '<span>' + t + '</span>')).join('') + '<span id="loCrumbMuc"></span></nav>';
}
function panelKiemTra(job) {
  const c = exportCheck(job), nhom = list => [...new Set(list.map(x => x.nhom))];
  const block = (title, cls, list) => !list.length ? '' : '<div class="card"><h3 style="margin:0 0 8px">' + title + ' (' + list.length + ')</h3>' + nhom(list).map(n => '<div style="margin-bottom:10px"><b>' + esc(n) + '</b>' +
    list.filter(x => x.nhom === n).map(x => '<div class="row" style="align-items:flex-start;gap:8px;margin-top:4px"><span class="pill ' + cls + '">' + (x.ref ? esc(x.ref) : '•') + '</span><span style="flex:1">' + (x.doiTuong && x.doiTuong.ten ? '<small class="mut">' + (x.doiTuong.loai === 'doiXe' ?
    'Đội xe' : 'Đội') + ' “' + esc(x.doiTuong.ten) + '”</small> ' : '') + esc(x.text) + (x.muc === 'chan' && x.bieuMau.length && x.bieuMau.length < HAKKiemTra.TAT_CA.length ? ' <small class="mut" data-bm="' + esc(x.bieuMau.join(',')) + '">· chặn ' + x.bieuMau.map(b => 'BM-' + b).join(', ') +
    '</small>' : '') + '</span><button class="btn ghost sm" data-act="ktGo" data-go="' + esc(JSON.stringify(x.go)) + '">Mở để sửa</button></div>').join('') + '</div>').join('') + '</div>';
  const ok = !c.chan.length;
  return '<div class="card"><div class="row" style="justify-content:space-between"><h3 style="margin:0">Kiểm tra hồ sơ trước khi xuất</h3><span class="pill ' + (ok ? 'ok' : 'err') + '">' + (ok ? 'Không có mục chặn xuất' : c.chan.length + ' mục chặn xuất') + '</span></div>' +
    '<p class="mut" style="margin:6px 0 0">Dùng lại checklist FSC và quy tắc kiểm tra của phần mềm. <b>Chặn xuất</b>: làm nút xuất hồ sơ bị khóa hoặc hồ sơ sai. <b>Cần đối chiếu</b>: vẫn xuất được nhưng nên kiểm tra. Bấm “Mở để sửa” để đến đúng tab.</p>' +
    (c.items.length ? '' : '<div class="msg ok">Hồ sơ lô này đạt mọi kiểm tra.</div>') + '</div>' +
    block('Chặn xuất', 'err', c.chan) + block('Cần đối chiếu', 'warn', c.doi);
}

function panelRung(own, chuTab) {
  const fl = forestList(own), f = curForest();
  const add = '<button class="btn sm" data-act="newForest">+ Rừng mới</button>';
  const list = '<div class="card"><div class="row" style="justify-content:space-between"><h3 style="margin:0">Các rừng của chủ rừng</h3>' + (f ? '' : add) + '</div>' +
    '<p class="mut">Mỗi rừng có tổ khai thác, vận chuyển, hợp đồng và hồ sơ xuất riêng.</p>' + loTuLoCuBox(own) +
    (fl.length ? fl.map(f => '<button class="item ' + (f.id === NAV.curF ? 'on' : '') + '" data-forest="' + f.id + '"><span class="pill ' + (progressOf(jobView(own, f)).pct === 100 ? 'ok' : '') + '">' + progressOf(jobView(own, f)).pct + '%</span><b>' + esc(f.info.tenRung || f.info.maRung) +
      '</b><small>Mã ' + esc(f.info.maRung) + ' · ' + esc(f.info.diaDiem || 'chưa có địa điểm') + ' · ' + f.nc.length + ' người · ' + f.dx.length + ' xe</small></button>').join('')
      : '<p class="mut">Chưa có rừng. Bấm “+ Rừng mới”.</p>') + '</div>';
  if (!f) return list;
  const job = curRec(), g = gateRaw(job);
  const kt = exportCheck(job);
  const stFinfo = !g.info.length ? 'ok' : 'warn';
  const nc = f.nc || [], dx = f.dx || [], pc = f.pc || [];
  const stNc = nc.length && !(g.nc && g.nc.errs && g.nc.errs.length) ? 'ok' : nc.length ? 'warn' : '';
  const stDx = dx.length && pc.length && !(g.dx && g.dx.errs && g.dx.errs.length) && !(g.pc && g.pc.errs && g.pc.errs.length) ? 'ok' : (dx.length || pc.length) ? 'warn' : '';
  const stKt = kt.chan.length ? 'err' : kt.doi.length ? 'warn' : 'ok';
  const ft = [
    ['finfo', 'Thông tin rừng', stFinfo, stFinfo === 'ok' ? '✓' : '!'],
    ['nc', 'Nhân công (' + nc.length + ')', stNc, stNc === 'ok' ? '✓' : nc.length ? '!' : ''],
    ['dx', 'Vận chuyển (' + dx.length + ' xe · ' + pc.length + ' phiếu)', stDx, stDx === 'ok' ? '✓' : (dx.length || pc.length) ? '!' : ''],
    ['kt', 'Kiểm tra (' + (kt.chan.length ? kt.chan.length + ' chặn' : kt.doi.length ? kt.doi.length + ' đối chiếu' : 'đạt') + ')', stKt, stKt === 'ok' ? '✓' : stKt === 'err' ? '✕' : '!'],
    ['xuat', 'Xuất hồ sơ', f.chot ? 'ok' : '', f.chot ? 'Đã chốt' : '']
  ];
  /* phiếu #10 (gọn phần đầu lô): MỘT hàng — tên lô (h2) + đường dẫn, chip “Danh sách rừng · tiến độ” (khối gập, mở thì xuống hàng dưới), nút + Rừng mới, Sao lưu lô rừng; hàng sau là lộ trình 5 bước của lô. */
  return '<div class="loDau">' + (chuTab ? '<div class="tabs loDauTab">' + chuTab + '</div>' : '') + '<h2 class="sro">' + esc(f.info.tenRung || f.info.maRung) + '</h2>' + loCrumb(job) +
    '<details class="rungTomTat"><summary>Danh sách rừng · Tiến độ ' + progressOf(job).pct + '%</summary>' + list + panelTienDo(job) + '</details>' +
    '<span class="loDauNut">' + add + '<button class="btn ghost sm" data-act="lotBackup" id="lotBackupBtn" title="Lưu riêng lô này thành một file, dùng được khi mất mạng">Sao lưu lô rừng</button></span></div>' +
    loBar() + '<nav class="hak-steps rungTabs" aria-label="Quy trình nhập hồ sơ lô">' + ft.map(([k, l, st, badge], idx) =>
      '<button type="button" class="hak-step' + (NAV.ftab === k ? ' on' : '') + (st ? ' ' + st : '') + '" data-ftab="' + k + '">' +
      '<span class="hak-step-n">' + (st === 'ok' ? '✓' : idx + 1) + '</span><span>' + esc(l) + '</span>' +
      (badge && st !== 'ok' ? '<span class="hak-step-st">' + esc(badge) + '</span>' : '') + '</button>').join('') + '</nav>' +
    loKhoaBanner(f) +
    (NAV.ftab === 'inpc' ? panelInPhieuCan() : NAV.ftab === 'finfo' ? khungMucLo('finfo', [
      ['chung', 'Thông tin chung', () => panelForest(f, 'chung'), null, !g.info.length],
      ['toado', 'Tọa độ và cự ly', () => panelForest(f, 'toado'), null, f.info.lat != null && f.info.lng != null],
      ['dinhmuc', 'Định mức, sản lượng', () => panelForest(f, 'dinhmuc'), null, !!(f.info.dinhMuc || f.info.dienTichKhaiThac)],
      ['giay', 'Giấy tờ pháp lý', () => panelGiay(f), (f.info.giayTo || []).length],
      ['giaohang', 'Công ty, địa chỉ giao và cước', () => panelMua(job) + panelVc(job), null, !!(f.info.congTyMua || f.info.diaChiGiao || f.info.donGiaVC)],
      ['vanban', 'Số văn bản chung', () => soVanBanBox(job)]
    ]) : NAV.ftab === 'nc' ? panelNC(stJob(job)) : NAV.ftab === 'dx' ? panelVanChuyen(stJob(job)) : NAV.ftab === 'kt' ? panelKiemTra(job) : '<div class="msg ' + (kt.chan.length ? 'err' : kt.doi.length ? 'warn' : 'ok') + '">' + (kt.chan.length ? 'Có <b>' + kt.chan.length + ' mục chặn xuất</b> và ' +
    kt.doi.length + ' mục cần đối chiếu.' : kt.doi.length ? 'Không có mục chặn xuất; còn <b>' + kt.doi.length + ' mục cần đối chiếu.</b>' : 'Hồ sơ đạt mọi kiểm tra.') + ' <button class="btn sm" data-act="ktGo" data-go="{&quot;ftab&quot;:&quot;kt&quot;}">Kiểm tra hồ sơ trước khi xuất</button></div>' +
    chotBox(job) + soVanBanBox(job, true) + thuTuInBox(job) + tienIchBox(job) + panelXuat(job));
}

