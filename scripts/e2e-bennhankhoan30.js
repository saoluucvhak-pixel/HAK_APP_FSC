'use strict';
/* Bản 3.0 — in đúng BÊN NHẬN KHOÁN (Electron thật, biểu mẫu Word xuất thực tế):
 *  - pháp nhân nhận khoán (người đại diện A, chức danh Giám đốc), Tổ trưởng của đội là B: BM-01 và BM-14 in tên pháp nhân, MST, địa chỉ trụ sở, người đại diện, chức danh;
 *    ô ký Bên B là A với chức danh; dòng Tổ trưởng B ở mục của đội; BM-20 (ủy quyền) vẫn cho Tổ trưởng B;
 *  - bản chụp: sửa danh mục sau khi chọn không đổi bản in; màn hợp đồng báo “danh mục đã sửa”, cập nhật có chủ ý;
 *  - thông tin bên ký còn thiếu: chặn xuất, nêu rõ phần cần bổ sung;
 *  - hồ sơ cũ (chưa chọn bên nhận khoán): in theo Tổ trưởng như trước.
 * Chạy: xvfb-run -a node scripts/e2e-bennhankhoan30.js */
const {_electron: electron} = require('playwright-core');
const path = require('path'), fs = require('fs'), os = require('os');
const JSZip = require('jszip');
const src = fs.readFileSync(path.join(__dirname, 'e2e-inan2.js'), 'utf8');
const {nv, lot, seed, PC, EXP1} = new Function(src.slice(src.indexOf('const nv ='), src.indexOf('const plain =')) + '; return {nv, lot, seed, PC, EXP1};')();
const root = path.join(__dirname, '..');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hakqn-bnk-')), out = path.join(dir, 'out'); fs.mkdirSync(out, {recursive: true});
let fail = 0; const ok = (name, cond, extra) => { console.log((cond ? 'ĐẠT  ' : 'LỖI  ') + name + (!cond && extra ? ' — ' + extra : '')); if (!cond) fail++; };
const plain = xml => (xml.match(/<w:t[^>]*>([^<]*)<\/w:t>/g) || []).map(a => a.replace(/<[^>]+>/g, '')).join('');

(async () => {
  const app = await electron.launch({executablePath: require('electron'), args: [root, '--no-sandbox'], env: {...process.env, HAKQN_CLOSE: 'discard', HAKQN_DB: path.join(dir, 'd.sqlite'), HAKQN_USERDATA: path.join(dir, 'ud'), HAKQN_DOWNLOAD_DIR: out}});
  const w = await app.firstWindow(); const errs = []; w.on('pageerror', e => errs.push(e.message)); w.on('dialog', d => d.accept()); await w.waitForSelector('#side');
  const p = (i, vai, ten, cd, ma) => ({...nv(i, vai, ten, cd, '04908500' + String(7000 + i)), maRung: ma});
  const EXP = Object.assign({}, EXP1, {ntNgay: '20/12/2026', pcNgay: '20/12/2026'});
  const A = lot('fa', 'R-A', {exp: EXP, pc: PC, kl: 29.75, nc: [p(1, 'Tổ trưởng', 'TRẦN TỔ TRƯỞNG', 'Tổ trưởng', 'R-A'), p(2, 'Công nhân', 'LÊ CÔNG NHÂN', 'Công nhân khai thác', 'R-A')]});
  const B = lot('fb', 'R-B', {exp: Object.assign({}, EXP, {soKT: '016', ntSo: '04', soVC: '08', pcSo: '10'}), pc: PC.map(x => ({...x, maRung: 'R-B', soPhieu: x.soPhieu + 'B'})), kl: 29.75, nc: [p(3, 'Tổ trưởng', 'PHẠM TỔ CŨ', 'Tổ trưởng', 'R-B'), p(4, 'Công nhân', 'VÕ CÔNG NHÂN', 'Công nhân khai thác', 'R-B')]});
  const D = seed([A, B]);
  D.dmDoiTuong = [{id: 'dt1', ma: 'DT0001', ten: 'CÔNG TY TNHH LÂM NGHIỆP XANH', loai: 'phapnhan', mst: '0401111222', diaChi: '12 Lê Lợi, Tam Kỳ', sdt: '0235111222', kyHD: {nhanCong: true}, daiDien: 'NGUYỄN ĐẠI DIỆN', chucVuDaiDien: 'Giám đốc', nguoi: []},
    {id: 'dt2', ma: 'DT0002', ten: 'CÔNG TY THIẾU THÔNG TIN', loai: 'phapnhan', mst: '', diaChi: '', kyHD: {nhanCong: true}, daiDien: 'AI ĐÓ', chucVuDaiDien: '', nguoi: []}];
  await w.evaluate(d => window.hak.save(d), D); await w.reload(); await w.waitForSelector('#side');
  const lotDb = async id => (await w.evaluate(() => window.hak.loadSync().db)).rs.own1.forests[id];
  const moRung = async (id, tab) => { await w.click('[data-open=own1]'); await w.click('[data-tab=rung]'); await w.click('[data-forest=' + id + ']'); await w.click('[data-ftab=' + tab + ']'); await w.waitForTimeout(200); };
  const chonBen = async v => { await moRung('fa', 'nc'); if (!(await w.$('#hdDau'))) { await w.click('#dsHdNcTbl tbody tr[data-act]'); await w.waitForTimeout(200); }
    await w.selectOption('#doiForm [name=benNK]', v); await w.press('#doiForm [name=ten]', 'Enter'); await w.waitForTimeout(300);
    if (await w.$('#loDirtyBar [data-act=stSave]')) { await w.click('#loDirtyBar [data-act=stSave]'); await w.waitForTimeout(600); } };
  const xuat = async id => {
    for (const x of fs.readdirSync(out)) fs.unlinkSync(path.join(out, x));
    await moRung(id, 'xuat'); await w.click('[data-xtab=all]').catch(() => {}); await w.waitForTimeout(300);
    const b = await w.$('button[data-act=dl][data-kind=all]:not([disabled])'); if (!b) { if (process.env.DBG) { await moRung(id, 'kt'); console.log('KT', (await w.innerText('#main')).slice(-1500)); } return null; }
    await b.click(); let zf = null; for (let i = 0; i < 120 && !zf; i++) { zf = fs.readdirSync(out).find(x => x.endsWith('.zip')); await w.waitForTimeout(200); } await w.waitForTimeout(400);
    const z = await JSZip.loadAsync(fs.readFileSync(path.join(out, zf))), t = {};
    for (const n of Object.keys(z.files).filter(n => /\.docx$/.test(n))) t[n] = plain(await (await JSZip.loadAsync(await z.file(n).async('nodebuffer'))).file('word/document.xml').async('string'));
    const lay = re => Object.keys(t).filter(n => re.test(n)).map(n => t[n]).join(' || ');
    return {gk: lay(/^01_/), nt: lay(/^14_/), uq: lay(/^20_/)};
  };

  // 1. chọn pháp nhân nhận khoán
  await chonBen('dt:dt1');
  const d0 = (await lotDb('fa')).doi[0];
  ok('lưu bên nhận khoán theo ID và bản chụp (tên, MST, địa chỉ, đại diện, chức danh)', d0.benNhanKhoan.doiTuongId === 'dt1' && d0.benNhanKhoanBan && d0.benNhanKhoanBan.mst === '0401111222' && d0.benNhanKhoanBan.daiDien === 'NGUYỄN ĐẠI DIỆN' && d0.benNhanKhoanBan.chucVu === 'Giám đốc', JSON.stringify(d0));
  let x = await xuat('fa');
  ok('xuất được gói hồ sơ', !!x && !!x.gk && !!x.nt, x ? '' : 'nút xuất bị khóa');
  if (x) {
    ok('BM-01: Bên B là pháp nhân — tên, MST, địa chỉ trụ sở, người đại diện A, chức vụ Giám đốc', /BÊN KHAI THÁC \(BÊN B\): CÔNG TY TNHH LÂM NGHIỆP XANH/.test(x.gk) && /Mã số thuế: 0401111222/.test(x.gk) && /Địa chỉ trụ sở: 12 Lê Lợi, Tam Kỳ/.test(x.gk) && /Người đại diện: NGUYỄN ĐẠI DIỆN – Chức vụ: Giám đốc/.test(x.gk), x.gk.slice(0, 900));
    ok('BM-01: Tổ trưởng B ở mục của đội; ô ký Bên B là người đại diện A kèm chức danh (không phải Tổ trưởng)', /Tổ trưởng tổ khai thác[^:]*: (ÔNG |BÀ )?TRẦN TỔ TRƯỞNG/.test(x.gk) && /ĐẠI DIỆN BÊN B[\s\S]{0,80}Giám đốc \(Ký, ghi rõ họ tên, đóng dấu\)[\s\S]{0,60}NGUYỄN ĐẠI DIỆN$/.test(x.gk) && !/BÊN KHAI THÁC \(BÊN B\): (ÔNG|BÀ) TRẦN TỔ TRƯỞNG/.test(x.gk), x.gk.slice(-500));
    ok('BM-14: Bên B là pháp nhân, ký người đại diện A', /BÊN KHAI THÁC \(BÊN B\): CÔNG TY TNHH LÂM NGHIỆP XANH/.test(x.nt) && /Mã số thuế: 0401111222/.test(x.nt) && /NGUYỄN ĐẠI DIỆN/.test(x.nt), x.nt.slice(0, 600));
    ok('BM-20 (giấy ủy quyền của người lao động): vẫn cho Tổ trưởng B', /TỔ TRƯỞNG/.test(x.uq) && /TRẦN TỔ TRƯỞNG/.test(x.uq) && !/LÂM NGHIỆP XANH/.test(x.uq), x.uq.slice(0, 400));
  }
  // 2. sửa danh mục sau khi chọn: bản in giữ bản chụp; màn hợp đồng báo, cập nhật có chủ ý
  { const d = await w.evaluate(() => window.hak.loadSync().db); d.dmDoiTuong[0].daiDien = 'LÊ ĐẠI DIỆN MỚI'; await w.evaluate(y => window.hak.save(y), d); await w.reload(); await w.waitForSelector('#side'); }
  x = await xuat('fa');
  ok('danh mục đổi người đại diện: bản in lại vẫn là người đại diện lúc chọn', !!x && /NGUYỄN ĐẠI DIỆN/.test(x.gk) && !/LÊ ĐẠI DIỆN MỚI/.test(x.gk));
  await moRung('fa', 'nc'); if (!(await w.$('#hdDau'))) { await w.click('#dsHdNcTbl tbody tr[data-act]'); await w.waitForTimeout(200); }
  ok('màn hợp đồng: báo danh mục đã sửa, có nút “Cập nhật theo danh mục”', await w.isVisible('#benNKDoi'));
  await w.click('[data-act=benNKCapNhat]'); await w.waitForTimeout(200); if (await w.$('#loDirtyBar [data-act=stSave]')) { await w.click('#loDirtyBar [data-act=stSave]'); await w.waitForTimeout(600); }
  ok('cập nhật có chủ ý: bản chụp nhận người đại diện mới', (await lotDb('fa')).doi[0].benNhanKhoanBan.daiDien === 'LÊ ĐẠI DIỆN MỚI');
  // 3. bên ký thiếu thông tin: chặn xuất, nêu rõ cần bổ sung
  await chonBen('dt:dt2');
  ok('bên nhận khoán thiếu MST, địa chỉ, chức danh: màn hợp đồng nêu rõ', /mã số thuế/.test(await w.innerText('#benNKThieu')) && /chức danh người đại diện/.test(await w.innerText('#benNKThieu')));
  await moRung('fa', 'kt'); const kt = await w.innerText('#main');
  ok('kiểm tra trước khi xuất: mục chặn “Bên nhận khoán thiếu thông tin”', /Bên nhận khoán thiếu thông tin/.test(kt) && /CÔNG TY THIẾU THÔNG TIN/.test(kt));
  // 4. hồ sơ cũ: in theo Tổ trưởng (xuất riêng BM-01)
  x = await (async () => { for (const y of fs.readdirSync(out)) fs.unlinkSync(path.join(out, y)); await moRung('fb', 'xuat'); await w.click('[data-xtab=hd]').catch(() => {}); await w.waitForTimeout(300);
    const b = await w.$('button[data-act=dl][data-kind=gk]:not([disabled])'); if (!b) return null; await b.click(); let f = null; for (let i = 0; i < 100 && !f; i++) { f = fs.readdirSync(out).find(n => /\.docx$/.test(n)); await w.waitForTimeout(150); } await w.waitForTimeout(300);
    return f ? {gk: plain(await (await JSZip.loadAsync(fs.readFileSync(path.join(out, f)))).file('word/document.xml').async('string'))} : null; })();
  ok('hồ sơ chưa chọn bên nhận khoán (cũ): BM-01 in Tổ trưởng là Bên B như trước', !!x && /BÊN KHAI THÁC \(BÊN B\): (ÔNG|BÀ) PHẠM TỔ CŨ/.test(x.gk) && /PHẠM TỔ CŨ/.test(x.gk.slice(-300)), x ? x.gk.slice(0, 600) : 'không xuất được');
  ok('không có lỗi script trên màn hình', errs.length === 0, errs.join(' | '));
  await app.close(); console.log(fail ? 'CÓ ' + fail + ' LỖI' : 'TẤT CẢ ĐẠT'); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
