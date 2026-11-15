/* ========== Tìm kiếm toàn cục (bản 2.2, mục 5.1; src/timkiem.js): Ctrl+K hoặc nút trên thanh trên cùng ==========
 * Gõ tên người, CCCD, biển số, số phiếu cân, mã lô, chủ rừng, số hợp đồng, tên đối tác, MST; không cần gõ dấu. Bấm kết quả để mở đúng nơi. */
let tkOn = false, tkQ = '', tkSel = 0;
function tkTim() { return HAKTimKiem.tim(db, tkQ); }
function tkDiaTo(d) {
  tkDong();
  if (d.to === 'dm') { view = 'dm'; dmTab = d.tab; dmQ = d.q || ''; dmLs = null; return render(); }
  if (d.to === 'chu') { cur = d.oid; curF = null; tab = 'info'; view = 'owner'; return render(); }
  cur = d.oid; curF = d.fid; tab = 'rung'; ftab = d.ftab || 'finfo'; view = 'owner'; render();
}
function tkVe() {
  let box = document.getElementById('tkBox');
  if (!tkOn) { if (box) box.remove(); return; }
  const r = tkQ.trim().length >= 2 ? tkTim() : [], co = r.filter(x => x.ds.length), flat = []; co.forEach(g => g.ds.forEach(x => flat.push(x)));
  if (tkSel >= flat.length) tkSel = Math.max(0, flat.length - 1);
  let i = -1;
  const html = '<div id="tkPanel" role="dialog" aria-label="Tìm kiếm toàn cục" style="position:fixed;left:50%;top:10vh;transform:translateX(-50%);width:min(720px,94vw);max-height:78vh;overflow:auto;background:var(--card,#fff);color:var(--ink,#111);border:1px solid var(--line,#ccc);border-radius:12px;box-shadow:0 12px 40px rgba(0,0,0,.3);padding:12px;z-index:1000">' +
    '<input id="tkInput" type="search" autocomplete="off" placeholder="Tìm người, CCCD, biển số, số phiếu, mã lô, chủ rừng, số hợp đồng, đối tác, MST…" value="' + esc(tkQ) + '" style="width:100%;font-size:16px;padding:10px;box-sizing:border-box">' +
    (tkQ.trim().length < 2 ? '<p class="mut" style="margin:10px 2px 2px">Gõ ít nhất 2 ký tự. Không cần gõ dấu; biển số gõ liền hoặc có chấm đều được; CCCD và số phiếu tìm được theo đoạn cuối. Esc để đóng.</p>' :
      co.length ? co.map(g => '<h4 style="margin:12px 0 4px">' + esc(g.nhom) + ' <span class="mut">(' + g.tong + ')</span></h4>' + g.ds.map(x => { i++; return '<button class="item tkItem' + (i === tkSel ? ' on' : '') + '" data-tki="' + i + '" style="display:block;width:100%;text-align:left"><b>' + esc(x.nhan) + '</b><br><small class="mut">' + esc(x.ngu) + '</small></button>'; }).join('')).join('') : '<p class="mut" style="margin:10px 2px 2px">Không thấy kết quả cho “' + esc(tkQ) + '”.</p>') + '</div>';
  if (!box) { box = document.createElement('div'); box.id = 'tkBox'; box.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.35);z-index:999'; document.body.appendChild(box); box.addEventListener('mousedown', e => { if (e.target === box) tkDong(); }); }
  const keep = document.activeElement && document.activeElement.id === 'tkInput' ? document.getElementById('tkInput').selectionStart : null;
  box.innerHTML = html; box._flat = flat; const inp = document.getElementById('tkInput'); inp.focus(); if (keep != null) inp.setSelectionRange(keep, keep);
  inp.addEventListener('input', () => { tkQ = inp.value; tkSel = 0; tkVe(); });
  box.querySelectorAll('[data-tki]').forEach(b => b.addEventListener('click', () => tkDiaTo(flat[+b.dataset.tki].dich)));
}
function tkMo() { tkOn = true; tkQ = ''; tkSel = 0; tkVe(); }
function tkDong() { tkOn = false; tkVe(); }
document.addEventListener('keydown', e => {
  if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) { e.preventDefault(); return tkOn ? tkDong() : tkMo(); }
  if (!tkOn) return;
  const box = document.getElementById('tkBox'), flat = box && box._flat || [];
  if (e.key === 'Escape') { e.preventDefault(); return tkDong(); }
  if (e.key === 'ArrowDown' && flat.length) { e.preventDefault(); tkSel = (tkSel + 1) % flat.length; return tkVe(); }
  if (e.key === 'ArrowUp' && flat.length) { e.preventDefault(); tkSel = (tkSel - 1 + flat.length) % flat.length; return tkVe(); }
  if (e.key === 'Enter' && flat[tkSel]) { e.preventDefault(); tkDiaTo(flat[tkSel].dich); }
});
