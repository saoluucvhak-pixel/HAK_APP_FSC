'use strict';
/* Chụp ảnh các màn chính ở cửa sổ hẹp và các mức phóng hiển thị Windows (100%, 125%, 150%) để soát bố cục: thanh chính, Cài đặt, danh mục,
 * hợp đồng, phiếu cân, phân bổ. Dữ liệu giả lập ở thư mục tạm. Mỗi ảnh kèm số đo tràn ngang (phần tử rộng hơn cửa sổ) để phát hiện lỗi bố cục.
 * Chạy: xvfb-run -a node scripts/anh-man-hinh.js [--out <thư mục>] [--rong 1024] [--cao 700] [--man home,settings,...]
 * Màn chưa có (bản cũ) thì bỏ qua và ghi vào ket-qua.json. */
const {_electron: electron} = require('playwright-core');
const path = require('path'), fs = require('fs'), os = require('os');
const root = path.join(__dirname, '..');
const arg = (k, d) => { const i = process.argv.indexOf(k); return i < 0 ? d : process.argv[i + 1]; };
const OUT = path.resolve(arg('--out', path.join(root, 'reports', 'anh-man-hinh')));
const RONG = +arg('--rong', 1024), CAO = +arg('--cao', 700);
const src = fs.readFileSync(path.join(__dirname, 'e2e-inan2.js'), 'utf8');
const {lot, seed, PC, EXP1} = new Function(src.slice(src.indexOf('const nv ='), src.indexOf('const plain =')) + '; return {lot, seed, PC, EXP1};')();

/* 3.0: danh sách rừng của chủ rừng nằm trong khối gập; mỗi tab của lô chia thành các mục (.mucNav) */
const moRung = async (w, tab) => {
  await w.click('[data-open=own1]'); await w.click('[data-tab=rung]');
  await w.evaluate(() => { const d = document.querySelector('.rungTomTat'); if (d) d.open = true; });
  await w.click('[data-forest=fa]'); await w.click('[data-ftab=' + tab + ']');
};
const muc = (w, k, id) => w.evaluate(([k, id]) => window.__hak.mucLo && window.__hak.mucLo(k, id), [k, id]);
/* các màn cần chụp: tên → hàm điều hướng (trả false nếu màn chưa có ở bản này) */
const MAN = {
  home: async w => { await w.click('[data-act=goHome]'); return true; },
  settings: async w => { const b = await w.$('#navSet'); if (!b) return false; await b.click(); return true; },
  rungNC: async w => { await moRung(w, 'nc'); return true; },
  rungDX: async w => { await moRung(w, 'dx'); return true; },
  rungXuat: async w => { await moRung(w, 'xuat'); return true; },
  rungThongTin: async w => { await moRung(w, 'finfo'); return true; },
  rungGiaoHang: async w => { await moRung(w, 'finfo'); await muc(w, 'finfo', 'giaohang'); return true; },
  danhMuc: async w => { const b = await w.$('#navDm'); if (b) { await b.click(); return true; } if (!(await w.$('#navSet'))) return false; await w.click('#navSet'); const t = await w.$('#setTab_setdt'); if (!t) return false; await t.click(); return true; },
  /* 3.0: danh mục xe, trang chi tiết hợp đồng nhân công / vận chuyển (có phiếu cân) */
  danhMucXe: async w => { if (!(await w.$('#navSet'))) return false; await w.click('#navSet'); const t = await w.$('#setTab_setxe'); if (!t) return false; await t.click(); return true; },
  hdNC: async w => { await MAN.rungNC(w); await w.waitForTimeout(150); const r = await w.$('#dsHdNcTbl tbody tr[data-act]'); if (r) await r.click(); else if (!(await w.$('#hdDau'))) return false; return true; } /* đã ở trang chi tiết (tab nhớ hợp đồng đang mở) thì giữ */,
  hdNCThanhVien: async w => { if (!(await MAN.hdNC(w))) return false; await muc(w, 'nc', 'thanhvien'); return true; },
  hdNCChamCong: async w => { if (!(await MAN.hdNC(w))) return false; await muc(w, 'nc', 'chamcong'); return true; },
  hdDX: async w => { await MAN.rungDX(w); await w.waitForTimeout(150); const r = await w.$('#dsHdVcTbl tbody tr[data-act]'); if (r) await r.click(); else if (!(await w.$('#hdDau'))) return false; return true; } /* đã ở trang chi tiết (tab nhớ hợp đồng đang mở) thì giữ */,
  hdDXXe: async w => { if (!(await MAN.hdDX(w))) return false; await muc(w, 'dx', 'xe'); return true; },
  hdDXPhieuCan: async w => { if (!(await MAN.hdDX(w))) return false; await muc(w, 'dx', 'phieu'); return true; }
};
/* đo tràn ngang: trang có cuộn ngang không, và các phần tử (không nằm trong khung cuộn) vượt mép phải cửa sổ */
const doTran = w => w.evaluate(() => {
  const vw = document.documentElement.clientWidth, out = [];
  const trongKhungCuon = el => { for (let p = el.parentElement; p; p = p.parentElement) { const s = getComputedStyle(p); if (/(auto|scroll)/.test(s.overflowX)) return true; } return false; };
  document.querySelectorAll('button, input, select, label, h2, h3, table, .card, .row').forEach(el => {
    const r = el.getBoundingClientRect(); if (!r.width || r.right <= vw + 1 || trongKhungCuon(el)) return;
    out.push((el.id ? '#' + el.id : el.tagName.toLowerCase() + (el.className && typeof el.className === 'string' ? '.' + el.className.split(' ')[0] : '')) + ' ' + Math.round(r.right - vw) + 'px');
  });
  return {cuonNgang: document.documentElement.scrollWidth > vw + 1, tran: [...new Set(out)].slice(0, 12)};
});

(async () => {
  fs.mkdirSync(OUT, {recursive: true});
  const ds = (arg('--man', Object.keys(MAN).join(','))).split(','), kq = [];
  for (const scale of [1, 1.25, 1.5]) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hakqn-anh-'));
    const app = await electron.launch({executablePath: require('electron'), args: [root, '--no-sandbox', '--force-device-scale-factor=' + scale], env: {...process.env, HAKQN_CLOSE: 'discard', HAKQN_DB: path.join(dir, 'd.sqlite'), HAKQN_USERDATA: path.join(dir, 'ud')}});
    const w = await app.firstWindow();   // không bọc _hd30: chụp đúng màn danh sách / chi tiết w.on('dialog', d => d.accept()); await w.waitForSelector('#side');
    await app.evaluate(({BrowserWindow}, s) => { const b = BrowserWindow.getAllWindows()[0]; b.setContentSize(s[0], s[1]); }, [RONG, CAO]);
    const A = lot('fa', 'R-A', {exp: EXP1, pc: PC, kl: 29.75}), B = lot('fb', 'R-B', {exp: {}, pc: []});
    await w.evaluate(d => window.hak.save(d), seed([A, B])); await w.reload(); await w.waitForSelector('#side');
    for (const m of ds) {
      const f = MAN[m]; if (!f) continue;
      let co = false; try { co = await f(w); } catch (e) { co = false; }
      if (!co) { kq.push({man: m, scale, coMan: false}); continue; }
      await w.waitForTimeout(350);
      const ten = m + '-' + Math.round(scale * 100) + '.png', d = await doTran(w);
      await w.screenshot({path: path.join(OUT, ten)});
      kq.push({man: m, scale, coMan: true, anh: ten, ...d});
    }
    await app.close();
  }
  fs.writeFileSync(path.join(OUT, 'ket-qua.json'), JSON.stringify({rong: RONG, cao: CAO, kq}, null, 1));
  kq.forEach(x => console.log((x.coMan ? (x.cuonNgang || x.tran.length ? 'TRÀN ' : 'ĐẠT  ') : 'CHƯA ') + x.man + ' @' + Math.round(x.scale * 100) + '%' + (x.tran && x.tran.length ? ' — ' + x.tran.join(', ') : '') + (x.cuonNgang ? ' (trang cuộn ngang)' : '')));
})().catch(e => { console.error(e); process.exit(2); });
