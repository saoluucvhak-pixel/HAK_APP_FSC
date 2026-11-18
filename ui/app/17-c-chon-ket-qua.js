/* ----- Bước 2: chọn kết quả và nơi ghi ----- */
async function lkPick(tab, row) {
  const c = await HB.lookup.candidates(tab, +row);
  if (!c.ok) { lk.msg = {kind: 'err', text: c.error}; return lkRender(); }
  lkSetCand(c);
}
async function lkContract(hd) {
  const c = await HB.lookup.build(lk.cand.cccd, hd);
  if (!c.ok) { lk.msg = {kind: 'err', text: c.error}; return lkRender(); }
  lkSetCand(c);
}
function lkSetCand(c) {
  lk.cand = c; lk.fi = 0; lk.view = 'cand'; lk.msg = null;
  const same = Object.values(db.rs).filter(o => o.info.cccd && o.info.cccd === c.cccd);
  lk.owner = same.length ? same[0].id : 'new';   // không trùng CCCD thì mặc định tạo chủ rừng mới, tránh ghi nhầm chủ
  lkRender();
}
const findForestByMa = ma => { const h = HAKLoRung.lotsByMa(db, ma)[0]; return h ? {o: db.rs[h.owner], f: db.rs[h.owner].forests[h.forest]} : null; };

function lkCandHtml() {
  const c = lk.cand, own = Object.fromEntries(c.owner.fields.map(x => [x.key, x.value])), F = c.forests[lk.fi];
  const openF = curForest(), openO = curOwner(), dupMa = F.maRung ? findForestByMa(F.maRung) : null;
  const owners = Object.values(db.rs).sort((a, b) => (b.info.cccd === c.cccd) - (a.info.cccd === c.cccd) || String(a.info.ten).localeCompare(b.info.ten, 'vi'));
  return '<button class="btn ghost sm" data-act="lkBack">← Kết quả tìm</button>' +
    '<h3>Chủ rừng: ' + esc(own.ten || '') + ' · CCCD ' + esc(c.cccd) + ' · Hợp đồng ' + esc(c.hd) + '</h3>' +
    c.warns.map(w => '<div class="msg warn">' + esc(w) + '</div>').join('') +
    (c.others.length ? '<p>Chủ rừng này còn hợp đồng khác: ' + c.others.map(o => '<button class="btn ghost sm" data-lkhd="' + esc(o.hd) + '">HĐ ' + esc(o.hd) + ' · ' + esc(o.diaChi) + ' · ' + numTxt(o.hecta) + ' ha' + (o.tinhTrang ? ' · ' + esc(o.tinhTrang) : '') + '</button>').join(' ') + '</p>' : '') +
    '<p><b>Chọn rừng (' + c.forests.length + '):</b></p>' +
    c.forests.map((f, i) => '<label style="flex-direction:row;gap:8px;color:var(--ink)"><input type="radio" name="lkF" value="' + i + '"' + (i === lk.fi ? ' checked' : '') + '> <span><b>' + esc(f.maRung || '(không có dòng trong ToaDoRung_QC)') + '</b> · ' +
      esc((f.fields.find(x => x.key === 'diaDiem') || {}).value || '') + ' · ' + f.gps.length + ' điểm GPS · ' + f.phieu.length + ' phiếu cân</span></label>').join('') +
    F.warns.map(w => '<div class="msg warn">' + esc(w) + '</div>').join('') +
    '<div class="card" style="margin-top:10px"><h3 style="margin-top:0">Ghi vào đâu?</h3>' +
    '<div class="row" style="align-items:flex-start;gap:20px">' +
    '<div style="flex:1;min-width:260px"><b>Điền vào rừng đang mở</b><br>' + (openF ? esc(openO.info.ten) + ' · ' + esc(openF.info.maRung) + ' (' + esc(openF.info.tenRung || '') + ')' +
      (dupMa && dupMa.f.id !== openF.id ? '<div class="msg warn">Mã rừng ' + esc(F.maRung) + ' đang thuộc rừng khác (' + esc(dupMa.o.info.ten) + ' · ' + esc(dupMa.f.info.tenRung || '') + ').</div>' : '') +
      '<br><button class="btn" style="margin-top:6px" data-act="lkModeFill">Điền vào rừng đang mở</button>' : '<span class="mut">Chưa mở rừng nào.</span>') +
      (dupMa && (!openF || dupMa.f.id !== openF.id) ? '<br><button class="btn ghost sm" style="margin-top:6px" data-act="lkOpenDup">Mở rừng ' + esc(F.maRung) + ' đã có để điền</button>' : '') + '</div>' +
    '<div style="flex:1;min-width:260px"><b>Tạo rừng mới từ kết quả</b><br><label><span>Chủ rừng</span><select id="lkOwner">' +
      '<option value="new"' + (lk.owner === 'new' ? ' selected' : '') + '>+ Tạo chủ rừng mới từ kết quả</option>' +
      owners.map(o => '<option value="' + o.id + '"' + (lk.owner === o.id ? ' selected' : '') + '>' + esc(o.info.ten || '(chưa đặt tên)') + ' · ' + esc(o.info.cccd || '') + (o.info.cccd === c.cccd ? ' (trùng CCCD)' : '') + '</option>').join('') + '</select></label>' +
      (dupMa ? '<div class="msg err">Không tạo mới được: mã rừng ' + esc(F.maRung) + ' đã có. Hãy mở rừng đó để điền.</div>' : '<button class="btn" style="margin-top:6px" data-act="lkModeNew">Xem trước để tạo rừng mới</button>') + '</div></div></div>';
}

