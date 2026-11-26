'use strict';
/* Phiếu #13a: "Khôi phục toàn bộ…" nhận file .sqlite ở BẤT KỲ ĐÂU (USB, máy khác) và file .json (Electron thật, SQLite thật, dữ liệu giả lập).
 * .sqlite ngoài kho: kiểm tra, CHÉP vào thư mục sao lưu SQLite thành nhap-ngoai-*.sqlite (file gốc không bị sửa), hiện trong kho, khôi phục qua đúng luồng kho;
 * file hỏng / sai loại: báo lỗi, không chép, dữ liệu không đổi. .json: trả nội dung cho màn xem trước khôi phục. Chu kỳ tự sao lưu đổi được và được nhớ.
 * Chạy: xvfb-run -a node scripts/e2e-khoi-phuc-ngoai.js */
const {_electron: electron} = require('playwright-core');
const path = require('path'), fs = require('fs'), os = require('os'), crypto = require('crypto');
const root = path.join(__dirname, '..');
const {Store} = require('../src/store');
const base = fs.mkdtempSync(path.join(os.tmpdir(), 'hakqn-kpn-')), ud = path.join(base, 'ud'), usb = path.join(base, 'usb');
fs.mkdirSync(usb, {recursive: true});
let fail = 0; const ok = (name, cond, extra) => { console.log((cond ? 'ĐẠT  ' : 'LỖI  ') + name + (!cond && extra ? ' — ' + extra : '')); if (!cond) fail++; };
const sha = f => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const launch = (file, extra) => electron.launch({executablePath: require('electron'), args: [root, '--no-sandbox'], env: {...process.env, HAKQN_USERDATA: ud, HAKQN_CLOSE: 'discard', HAKQN_RESTORE_FILE: file || '', ...(extra || {})}});
(async () => {
  // "máy khác": một cơ sở dữ liệu có 1 chủ rừng, 2 lô, đặt trên USB
  const ngoai = path.join(usb, 'may-khac.sqlite');
  const s = new Store(ngoai); s.save({v: 2, rs: {own9: {id: 'own9', info: {ma: 'CR-9', ten: 'CHỦ MÁY KHÁC', cccd: '049000000099'}, forests: {
    f1: {id: 'f1', info: {maRung: 'R-91', tenRung: 'Rừng 91'}, nc: [], dx: [], pc: [], exp: {}}, f2: {id: 'f2', info: {maRung: 'R-92', tenRung: 'Rừng 92'}, nc: [], dx: [], pc: [], exp: {}}}}}}); s.close();
  for (const x of ['-wal', '-shm']) { try { fs.unlinkSync(ngoai + x); } catch (e) { /* không có */ } }
  const truoc = sha(ngoai);
  const errs = [];
  let app = await launch(ngoai), w = await app.firstWindow(); w.on('pageerror', e => errs.push(e.message)); await w.waitForSelector('#side');
  const r = await w.evaluate(() => window.hak.restorePick());
  ok('chọn file .sqlite ngoài kho: được chép vào kho', r.ok && r.dinhDang === 'sqlite' && /^nhap-ngoai-\d{8}-\d{6}\.sqlite$/.test(r.name), JSON.stringify(r));
  ok('file gốc trên USB không bị sửa', sha(ngoai) === truoc);
  const ds = await w.evaluate(() => window.hak.saoLuu.list());
  const it = ds.items && ds.items.find(x => x.name === r.name);
  ok('bản vừa chép hiện trong kho, loại "Nhập từ ngoài"', !!it && it.loai === 'nhapngoai', JSON.stringify(ds.items && ds.items.map(x => x.name)));
  const pv = await w.evaluate(f => window.hak.saoLuu.preview(f), it && it.file);
  ok('xem trước: 1 chủ rừng, 2 lô trong bản sao lưu', pv.ok && pv.xem.trongBan.owners === 1 && pv.xem.trongBan.forests === 2, JSON.stringify(pv).slice(0, 200));
  const kp = await w.evaluate(f => window.hak.saoLuu.restore(f), it && it.file);
  ok('khôi phục qua luồng kho: dữ liệu trên máy là dữ liệu máy khác', kp.ok && Object.keys(kp.db.rs).length === 1 && kp.db.rs.own9 && Object.keys(kp.db.rs.own9.forests).length === 2, JSON.stringify(kp).slice(0, 200));
  await app.close();
  // file hỏng
  const hong = path.join(usb, 'hong.sqlite'); fs.writeFileSync(hong, 'không phải sqlite');
  app = await launch(hong); w = await app.firstWindow(); w.on('pageerror', e => errs.push(e.message)); await w.waitForSelector('#side');
  const nTruoc = (await w.evaluate(() => window.hak.saoLuu.list())).items.filter(x => x.loai === 'nhapngoai').length;
  const rh = await w.evaluate(() => window.hak.restorePick());
  const nSau = (await w.evaluate(() => window.hak.saoLuu.list())).items.filter(x => x.loai === 'nhapngoai').length;
  ok('file hỏng: báo lỗi, không chép thêm vào kho', !rh.ok && /không dùng được|SQLite/i.test(rh.error) && nSau === nTruoc, JSON.stringify(rh));
  await app.close();
  // file .json
  const js = path.join(usb, 'sao-luu.json'); fs.writeFileSync(js, JSON.stringify({v: 2, rs: {}}));
  app = await launch(js); w = await app.firstWindow(); w.on('pageerror', e => errs.push(e.message)); await w.waitForSelector('#side');
  const rj = await w.evaluate(() => window.hak.restorePick());
  ok('file .json: trả nội dung cho màn xem trước khôi phục', rj.ok && rj.dinhDang === 'json' && JSON.parse(rj.text).v === 2, JSON.stringify(rj).slice(0, 120));
  // chu kỳ tự sao lưu
  const c1 = await w.evaluate(() => window.hak.settings.setAutoChuKy('tuan'));
  ok('đổi chu kỳ tự sao lưu sang hằng tuần', c1.ok && c1.settings.auto.chuKy === 'tuan', JSON.stringify(c1).slice(0, 160));
  const c2 = await w.evaluate(() => window.hak.settings.setAutoChuKy('xyz'));
  ok('chu kỳ không hợp lệ bị từ chối', !c2.ok);
  await app.close();
  app = await launch(''); w = await app.firstWindow(); w.on('pageerror', e => errs.push(e.message)); await w.waitForSelector('#side');
  const st = await w.evaluate(() => window.hak.settings.get());
  ok('chu kỳ hằng tuần được nhớ qua lần mở lại', st.ok && st.settings.auto.chuKy === 'tuan');
  await app.close();
  // 3.7.2: cơ sở dữ liệu có sẵn 6 chủ rừng rỗng + 2 chủ rừng thật → mở app tự dọn sạch không báo lỗi BULK_DELETE, lưu lô bình thường; nút Lưu ra tệp/USB và khôi phục khi đang lọc hoạt động đúng
  { const dbf = path.join(ud, 'hakqn.sqlite'), s2 = new Store(dbf);
    const rong = id => ({id, info: {ma: '', danhXung: 'Ông', ten: '', ngaySinh: '', cccd: '', ngayCap: '', noiCap: '', diaChi: ''}, forests: {}});
    s2.save({v: 2, rs: {
      o1: {id: 'o1', info: {ma: 'CR-01', ten: 'LÊ QUỐC Ý', cccd: '049000000011'}, forests: {fa: {id: 'fa', info: {maRung: 'CR1-001-R1', tenRung: 'Rừng 1'}, nc: [], dx: [], pc: [], exp: {}}}},
      o2: {id: 'o2', info: {ma: 'CR-02', ten: 'LÊ VĂN QUẢNG', cccd: '049000000022'}, forests: {}},
      e1: rong('e1'), e2: rong('e2'), e3: rong('e3'), e4: rong('e4'), e5: rong('e5'), e6: rong('e6')
    }}, {allowBulkDelete: true});
    s2.close();
  }
  const outSaveAs = path.join(usb, 'xuat-ra-usb.sqlite');
  app = await launch(ngoai, {HAKQN_SAVEAS_FILE: outSaveAs}); w = await app.firstWindow(); w.on('pageerror', e => errs.push(e.message)); await w.waitForSelector('#side');
  await w.waitForTimeout(800);
  const body0 = await w.innerText('body');
  const keysSau = await w.evaluate(() => Object.keys(window.hak.loadSync().db.rs).sort());
  ok('3.7.2: tự dọn 6 chủ rừng rỗng trong SQLite lúc mở app, không báo lỗi BULK_DELETE', JSON.stringify(keysSau) === '["o1","o2"]' && !/Lần lưu này sẽ xóa|Lần ghi gần nhất/.test(body0), JSON.stringify(keysSau) + ' | ' + body0.slice(0, 160));
  await w.click('#navSet'); await w.click('#setTab_setbk'); await w.waitForSelector('#kslSaveAsBtn');
  await w.click('#kslSaveAsBtn'); await w.waitForTimeout(600);
  ok('3.7.2: nút “Lưu bản sao lưu ra tệp / USB…” xuất file .sqlite hợp lệ', fs.existsSync(outSaveAs) && /Đã lưu bản sao lưu toàn bộ ra tệp/.test(await w.innerText('body')));
  await w.click('#sbTab_ban'); await w.waitForSelector('#kslLoc'); await w.selectOption('#kslLoc', 'toanbo').catch(() => {});
  await w.click('#sbTab_thaotac'); await w.click('#restorePickBtn'); await w.waitForSelector('#kslXem', {timeout: 5000});
  ok('3.7.2: bấm Khôi phục toàn bộ khi đang bật bộ lọc vẫn mở ngay màn xem trước #kslXem', await w.isVisible('#kslXem'));
  ok('không có lỗi JavaScript', errs.length === 0, errs.join(' | '));
  await app.close();
  console.log(fail ? fail + ' MỤC LỖI' : 'ĐẠT HẾT'); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
