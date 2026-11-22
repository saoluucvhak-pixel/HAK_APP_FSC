'use strict';
/* Khóa chỉ đọc ở MỌI đường ghi (Electron thật, SQLite thật): lô đã chốt — ô tab Xuất hồ sơ bị khóa, sự kiện giả lập vào ô không ghi được, tra cứu Google Sheets không áp vào được,
 * tầng lưu của giao diện và của tiến trình chính (LOCKED) từ chối; không còn trạng thái “Chưa lưu” treo; mở khóa (có lý do) thì sửa và lưu được.
 * Chạy: xvfb-run -a node scripts/e2e-khoa-chi-doc.js */
const {_electron: electron} = require('playwright-core');
const {saveStage: stSave} = require('./lib-stage');
const path = require('path'), fs = require('fs'), os = require('os');
const src = fs.readFileSync(path.join(__dirname, 'e2e-inan2.js'), 'utf8');
const {lot, seed, P} = new Function(src.slice(src.indexOf('const nv ='), src.indexOf('const plain =')) + '; return {lot, seed, P};')();
const V = require('../src/vongdoi');
const root = path.join(__dirname, '..'), FIX = path.join(root, 'tests', 'fixtures');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hakqn-khoa-'));
let fail = 0; const ok = (name, cond, extra) => { console.log((cond ? 'ĐẠT  ' : 'LỖI  ') + name + (!cond && extra ? ' — ' + extra : '')); if (!cond) fail++; };
(async () => {
  const app = await electron.launch({executablePath: require('electron'), args: [root, '--no-sandbox'], env: {...process.env, HAKQN_CLOSE: 'discard', HAKQN_DB: path.join(dir, 'd.sqlite'), HAKQN_USERDATA: path.join(dir, 'ud'), HAKQN_DOWNLOAD_DIR: path.join(dir, 'out'), HAKQN_SHEET_URL: 'http://127.0.0.1:9/none.xlsx'}});
  const w = require('./_hd30').boc(await app.firstWindow()); const errs = []; w.on('pageerror', e => errs.push(e.message)); w.on('dialog', d => d.accept()); await w.waitForSelector('#side');
  const A = lot('fa', 'R-A', {exp: {soKT: '015', ngayKy: '02/10/2026'}, pc: [P(1, '05/10/2026', '92C-12345', 'PA1', 12.5)], kl: null});
  V.chot(A, 'Người lập', '2026-11-15T01:00:00.000Z', []);
  await w.evaluate(d => window.hak.save(d), seed([A])); await w.reload(); await w.waitForSelector('#side');
  const loadDb = async () => (await w.evaluate(() => window.hak.loadSync().db));
  const lo = async () => (await loadDb()).rs.own1.forests.fa;
  const open = async ftab => { if (!(await w.$('[data-ftab=nc]'))) { await w.click('[data-open=own1]'); await w.click('[data-tab=rung]'); await w.click('[data-forest=fa]'); } await w.click('[data-ftab=' + ftab + ']'); await w.waitForTimeout(400); };
  const truoc = JSON.stringify(await lo());
  const dirty = async () => !!(await w.$('#loDirtyBar')) || (await w.evaluate(() => window.__hak.khoaTest.chuaLuu() + (window.__stDirty ? window.__stDirty().length : 0))) > 0;
  // 1. tab Xuất hồ sơ: ô nhập bị vô hiệu, vẫn tải được
  await open('xuat'); await w.waitForSelector('#chotBox');
  const nhap = await w.$$eval('#main [data-exp]', e => e.map(x => x.disabled));
  ok('tab Xuất hồ sơ của lô đã chốt: mọi ô nhập (ngày ký, số văn bản…) bị vô hiệu', nhap.length > 0 && nhap.every(Boolean), JSON.stringify(nhap));
  ok('nút tải biểu mẫu vẫn dùng được (đã chốt vẫn tải và in được)', await w.$$eval('#main [data-act=dl]', b => b.length > 0 && b.some(x => !x.disabled)));
  // 2. giả lập sửa ô (gỡ disabled rồi bắn sự kiện change): không ghi
  await w.evaluate(() => { const i = document.querySelector('#main [data-exp]'); i.disabled = false; i.value = 'SỬA TRÁI PHÉP'; i.dispatchEvent(new Event('change', {bubbles: true})); });
  await w.waitForTimeout(500);
  ok('sự kiện sửa ô của lô khóa bị chặn: dữ liệu lô không đổi, không treo “Chưa lưu”', JSON.stringify((await w.evaluate(() => window.__hak.khoaTest.lo().exp))) === JSON.stringify((JSON.parse(truoc)).exp) && !(await dirty()));
  ok('có thông báo lô chỉ đọc', /chỉ đọc/.test(await w.innerText('#main')));
  // 3. đường ghi trực tiếp vào lô (persistLo / persist): giao diện trả về bản đã lưu
  await w.evaluate(() => { const f = window.__hak.khoaTest.lo(); f.exp.soKT = '99'; f.info.diaDiem = 'TRÁI PHÉP'; window.__hak.khoaTest.persistLo(f); });
  await w.waitForTimeout(400);
  ok('persistLo trên lô khóa: trả về bản đã lưu, không còn “Chưa lưu”', (await w.evaluate(() => window.__hak.khoaTest.lo().info.diaDiem)) !== 'TRÁI PHÉP' && JSON.stringify(await w.evaluate(() => window.__hak.khoaTest.lo())) === JSON.stringify(await lo()) && !(await dirty()));
  await w.evaluate(() => { const f = window.__hak.khoaTest.lo(); f.info.diaDiem = 'TRÁI PHÉP 2'; window.__hak.khoaTest.persist(); });
  await w.waitForTimeout(900);
  ok('persist() thẳng: tầng lưu của giao diện từ chối, bộ nhớ về bản đã lưu, SQLite không đổi', (await w.evaluate(() => window.__hak.khoaTest.lo().info.diaDiem)) !== 'TRÁI PHÉP 2' && JSON.stringify(await lo()) === truoc);
  // 4. tiến trình chính: từ chối LOCKED (save trọn bộ)
  const D = await loadDb(); D.rs.own1.forests.fa.exp.soKT = '77';
  const r1 = await w.evaluate(d => window.hak.save(d), D);
  ok('Store.save từ chối sửa lô khóa: mã LOCKED, nêu mã lô', r1 && r1.ok === false && r1.code === 'LOCKED' && /R-A/.test(r1.error), JSON.stringify(r1));
  ok('SQLite không đổi sau lần ghi bị từ chối', JSON.stringify(await lo()) === truoc);
  // 5. áp bản tra cứu Google Sheets vào lô khóa
  const imp = await w.evaluate(p => window.hak.lookup.importExcel(p), path.join(FIX, 'gia_lap_HoSoKeo_QC.xlsx'));
  ok('nạp bản tra cứu giả lập', imp && imp.ok, JSON.stringify(imp).slice(0, 200));
  await w.click('header [data-act=lkOpen]'); await w.waitForSelector('#lkQ'); await w.click('[data-lklayout=flat]'); await w.click('[data-lktab=""]'); await w.fill('#lkQ', 'nguyen van an'); await w.click('[data-act=lkFind]'); await w.waitForTimeout(300);
  await w.click('[data-lkgrp]').catch(() => {}); await w.waitForTimeout(300); await w.click('[data-lkpick]').catch(() => {});
  await w.click('[data-act=lkModeFill]'); await w.waitForSelector('[data-act=lkApply]');
  await w.click('[data-act=lkApply]'); await w.waitForTimeout(600);
  ok('áp tra cứu vào lô đã chốt: bị chặn, báo lô chỉ đọc', /chỉ đọc/.test(await w.innerText('#lkBody')) && JSON.stringify(await lo()) === truoc, (await w.innerText('#lkBody')).slice(0, 200));
  await w.click('[data-act=lkClose]').catch(() => {}); await w.evaluate(() => document.getElementById('lkBox').classList.remove('on'));
  // 6. nút ghi bị vô hiệu; bấm bằng script cũng không ghi
  await open('nc');
  ok('tab Nhân công: nút Thêm bị vô hiệu', await w.isDisabled('[data-act=stAdd][data-kind=nc]'));
  await w.evaluate(() => { const b = document.querySelector('[data-act=stAdd][data-kind=nc]'); b.disabled = false; b.click(); });
  await w.waitForTimeout(300); ok('bấm Thêm bằng script: không mở hộp nhập, lô không đổi', !(await w.$('#stForm')) && JSON.stringify(await lo()) === truoc);
  // 7. thao tác vòng đời vẫn ghi được: mở khóa (có lý do) → sửa → lưu
  await open('xuat'); await w.fill('#chotLyDo', 'Sửa số văn bản'); await w.click('[data-act=chotMoKhoa]'); await w.waitForTimeout(600);
  ok('mở khóa có lý do: được ghi, nhật ký có lý do', !(await lo()).chot && (await lo()).nhatKy.some(x => x.hanh === 'mokhoa' && x.lyDo === 'Sửa số văn bản'));
  await w.evaluate(() => { const i = document.querySelector('#main [data-exp="soKT"]') || document.querySelector('#main [data-exp]'); i.disabled = false; i.value = '016'; i.dispatchEvent(new Event('change', {bubbles: true})); });
  await w.waitForTimeout(300); await w.click('button[data-act=stSave]').catch(() => {}); await w.waitForTimeout(700);
  ok('sau khi mở khóa: sửa và lưu được', /016/.test(JSON.stringify((await lo()).exp) + JSON.stringify((await lo()).doi.map(d => d.exp))) && !(await dirty()));
  // 8. tầng lưu cho lô đã dừng: save trọn bộ bị từ chối; mở lại thì được
  await open('xuat'); await w.fill('#chotLyDo', 'Dừng thử'); await w.click('[data-act=chotDung]'); await w.waitForTimeout(600);
  const D2 = await loadDb(); D2.rs.own1.forests.fa.info.diaDiem = 'X'; const r2 = await w.evaluate(d => window.hak.save(d), D2);
  ok('lô đã dừng: Store.save từ chối (LOCKED)', r2.ok === false && r2.code === 'LOCKED');
  await w.fill('#chotLyDo', 'Mở lại'); await w.click('[data-act=chotMoLai]'); await w.waitForTimeout(600);
  const D3 = await loadDb(); D3.rs.own1.forests.fa.info.diaDiem = 'Sửa sau khi mở lại'; const r3 = await w.evaluate(d => window.hak.save(d), D3);
  ok('mở lại lô: ghi được', r3.ok === true && (await lo()).info.diaDiem === 'Sửa sau khi mở lại');
  ok('không có lỗi script trên màn hình', errs.length === 0, errs.join(' | '));
  await app.close(); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
