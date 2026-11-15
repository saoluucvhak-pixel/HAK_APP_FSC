'use strict';
/* Rà soát nghiệp vụ định mức – hợp đồng nhân công – vận chuyển (bản 1.4.37), Electron thật, dữ liệu giả lập:
 *  1. người dưới 18 tuổi: chặn mọi biểu mẫu có tên người đó (giao khoán: BM-01, BM-14, BM-20; trực tiếp: BM-03), báo đúng một lần;
 *  2. BM-01 điều khoản thanh toán đúng hình thức trả công (tấn / ha / ngày công);
 *  3. trả theo ngày công chưa chấm công thực tế: BM-08, BM-14 là bản nháp; có chấm công thì hết;
 *  4. khối lượng thực tế lệch tổng phiếu cân quá 1% (ngưỡng mặc định) được báo ở Kiểm tra trước khi xuất;
 *  5. ô đơn giá Tổ trưởng cũ chỉ hiện ở hồ sơ cũ; 6. vị trí của định mức nhân công có trong bảng đơn giá;
 *  7. cước tấn/km theo cự ly tự tính (đường chim bay): BM-04, BM-09, BM-10 là bản nháp; nhập tay thì hết;
 *  8. lô nhiều đội: khối lượng thực tế từng đội (tùy chọn) — nhập thiếu là bản nháp, nhập đủ và khớp thì BM-14 từng đội dùng số đó.
 * Chạy: xvfb-run -a node scripts/e2e-nghiepvu.js */
const {_electron: electron} = require('playwright-core');
const path = require('path'), fs = require('fs'), os = require('os');
const JSZip = require('jszip');
const root = path.join(__dirname, '..');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hakqn-nv-')), out = path.join(dir, 'out');
let fail = 0; const ok = (name, cond, extra) => { console.log((cond ? 'ĐẠT  ' : 'LỖI  ') + name + (!cond && extra ? ' — ' + extra : '')); if (!cond) fail++; };
const clone = x => JSON.parse(JSON.stringify(x));
const nv = (stt, vai, ten, cd, cccd, o) => Object.assign({_row: stt + 1, maRung: 'R-A', vaiTro: vai, stt: String(stt), danhXung: 'Ông', ten, ngaySinh: '01/01/1985', cccd, ngayCap: '01/01/2021', noiCap: 'CA', diaChi: 'Đà Nẵng', chucDanh: cd}, o || {});
const xe = {_row: 2, maRung: 'R-A', stt: '1', chuXe: 'LÊ VĂN XE', ngaySinh: '01/01/1980', cccd: '049000000077', ngayCap: '01/01/2021', noiCap: 'CA', diaChi: 'Đà Nẵng', bienSo: '92C-12345', loaiXe: 'Xe tải', nguoiKy: 'Chủ xe', sdt: '0905123456'};
const P = (i, kl) => ({_row: i + 1, maRung: 'R-A', stt: String(i), ngay: '0' + i + '/10/2026', bienSo: '92C-12345', soPhieu: 'P' + i, kl, noiGiao: 'KCN Thử, Đà Nẵng'});
const RATES = {'Tổ trưởng': 420000, 'Công nhân khai thác': 330000, 'Công nhân cưa': 380000};
const NC3 = [nv(1, 'Tổ trưởng', 'TRẦN TỔ TRƯỞNG', 'Tổ trưởng', '049085000001'), nv(2, 'Công nhân', 'LÊ CÔNG NHÂN', 'Công nhân khai thác', '049085000002'), nv(3, 'Công nhân', 'PHẠM CƯA', 'Công nhân cưa', '049085000003')];
const BASE = {v: 2, dinhMuc: {'Tổ trưởng': {qa: '1'}, 'Công nhân khai thác': {qa: '1'}, 'Công nhân cưa': {qa: '1'}}, congTy: {c1: {id: 'c1', ten: 'CÔNG TY MUA THỬ', mst: '', diaChi: 'KCN Thử, Đà Nẵng', diaChiGiao: [{id: 'main', nhan: 'Chính', diaChi: 'KCN Thử, Đà Nẵng', lat: 16.0, lng: 108.2}]}},
  rs: {own1: {id: 'own1', info: {ma: 'CR-01', ten: 'NGUYỄN VĂN MỘT', cccd: '049067005459', ngayCap: '15/08/2021', noiCap: 'CA', diaChi: 'Đà Nẵng', danhXung: 'Ông', ngayKyHopDong: '01/10/2026', soHopDong: 'HD-01'}, nc: [], dx: [], exp: {}, forests: {
    fa: {id: 'fa', info: {hinhThucLuong: 'sanluong', moHinhKy: 'giaokhoan', donGiaTan: clone(RATES), khoiLuong: 21.75, maRung: 'R-A', tenRung: 'Lô A', diaDiem: 'Thôn A', lat: 15.6, lng: 108.1, dienTich: 2, dinhMucTanHa: 80, cuLy: 45, tuNgay: '01/10/2026', denNgay: '20/10/2026', donGia: null, giayTo: [],
      vanChuyen: {mode: 'coDinh', coDinh: 52000, bac: []}, muaHang: {congTyId: 'c1', diaChiId: 'main', ten: 'CÔNG TY MUA THỬ', diaChi: 'KCN Thử, Đà Nẵng', lat: 16.0, lng: 108.2}},
    nc: clone(NC3), dx: [xe], pc: [P(1, 12.5), P(2, 9.25)], exp: {soKT: '015', ntNgay: '05/12/2026', pcNgay: '05/12/2026', ckNhan: 'CÔNG TY MUA THỬ'}}}}}};
const lotOf = d => d.rs.own1.forests.fa;
const docText = buf => JSZip.loadAsync(buf).then(z => z.file('word/document.xml').async('string')).then(x => (x.match(/<w:t[^>]*>([^<]*)<\/w:t>/g) || []).map(a => a.replace(/<[^>]+>/g, '')).join(''));
(async () => {
  const app = await electron.launch({executablePath: require('electron'), args: [root, '--no-sandbox'], env: {...process.env, HAKQN_CLOSE: 'discard', HAKQN_DB: path.join(dir, 'n.sqlite'), HAKQN_USERDATA: path.join(dir, 'ud'), HAKQN_DOWNLOAD_DIR: out}});
  const w = await app.firstWindow(); const errs = []; w.on('pageerror', e => errs.push(e.message)); w.on('dialog', d => d.accept()); await w.waitForSelector('#side');
  const load = async (seed, ftab = 'xuat') => { await w.evaluate(d => window.hak.save(d, {allowBulkDelete: true}), seed); await w.reload(); await w.waitForSelector('#side'); await w.click('[data-open=own1]'); await w.click('[data-tab=rung]'); await w.click('[data-forest=fa]'); await w.click('[data-ftab=' + ftab + ']'); await w.waitForTimeout(200); };
  const draftCard = async seed => { await load(seed); await w.click('[data-xtab=all]'); return w.innerText('#draftCard'); };
  const ktText = async seed => { await load(seed, 'kt'); return w.innerText('#main'); };
  const btnState = async () => Object.fromEntries(await w.$$eval('button[data-act=dl]', bs => bs.map(b => [b.dataset.kind, b.disabled])));
  const grab = async (kind, xt) => { await w.click(`[data-xtab=${xt}]`); fs.mkdirSync(out, {recursive: true}); for (const f of fs.readdirSync(out)) fs.unlinkSync(path.join(out, f)); await w.click(`button[data-act=dl][data-kind=${kind}]`); let f = null; for (let i = 0; i < 80 && !f; i++) { f = fs.readdirSync(out).find(n => !/\.crdownload$/.test(n)); if (!f) await w.waitForTimeout(150); } await w.waitForTimeout(300); return f && path.join(out, f); };

  // 1. người dưới 18 tuổi
  const minor = nv(4, 'Công nhân', 'NGUYỄN NHỎ TUỔI', 'Công nhân khai thác', '049085000004', {ngaySinh: '01/06/2010'});
  let d = clone(BASE); lotOf(d).nc.push(minor);
  await load(d); let st = await btnState();
  ok('giao khoán có người 16 tuổi: khóa BM-01 hợp đồng giao khoán, BM-20 ủy quyền, BM-14 nghiệm thu', st.gk === true && st.uq === true && st.nttl === true, JSON.stringify(st));
  d = clone(BASE); lotOf(d).nc.push(minor); lotOf(d).info.moHinhKy = 'tructiep';
  await load(d); st = await btnState();
  ok('trực tiếp có người 16 tuổi: khóa BM-03 hợp đồng lao động', st.hdld === true, JSON.stringify(st));
  let kt = await ktText(d);
  ok('Kiểm tra trước khi xuất nêu người chưa đủ 18 tuổi đúng một lần, kèm ngày tham chiếu', (kt.match(/NGUYỄN NHỎ TUỔI chưa đủ 18 tuổi/g) || []).length === 1 && /bắt đầu khai thác 01\/10\/2026 \(16 tuổi\)/.test(kt), kt.slice(0, 400));
  await load(clone(BASE)); st = await btnState();
  ok('không có người dưới 18 tuổi: BM-01, BM-20 tải được', st.gk === false && st.uq === false, JSON.stringify(st));

  // 2. BM-01: điều khoản thanh toán theo hình thức trả công
  const bm01 = async patch => { const x = clone(BASE); Object.assign(lotOf(x).info, patch); await load(x); const f = await grab('gk', 'hd'); return f ? docText(fs.readFileSync(f)) : ''; };
  let t = await bm01({});
  ok('BM-01 trả theo tấn: giữ nguyên câu “Căn cứ theo số lượng bán cho nhà máy”', /2\.3\. Hình thức thanh toán: Căn cứ theo số lượng bán cho nhà máy, hai bên/.test(t) && /dựa trên khối lượng gỗ đã khai thác/.test(t), t.slice(0, 200));
  t = await bm01({hinhThucLuong: 'ha', donGiaHa: {'Tổ trưởng': 9000000, 'Công nhân khai thác': 7000000, 'Công nhân cưa': 8000000}});
  ok('BM-01 trả theo ha: căn cứ diện tích đã khai thác xong, không còn “số lượng bán cho nhà máy”', /Căn cứ diện tích đã khai thác xong và được hai bên nghiệm thu/.test(t) && /dựa trên diện tích đã khai thác xong được nghiệm thu/.test(t) && !/bán cho nhà máy/.test(t));
  t = await bm01({hinhThucLuong: 'ngaycong', donGiaNgay: {'Tổ trưởng': 400000, 'Công nhân khai thác': 300000, 'Công nhân cưa': 350000}});
  ok('BM-01 trả theo ngày công: căn cứ số công trong Bảng chấm công, không còn “số lượng bán cho nhà máy”', /Căn cứ số công thực tế của từng người ghi trong Bảng chấm công/.test(t) && !/bán cho nhà máy/.test(t));

  // 3. ngày công chưa chấm công → BM-08, BM-14 bản nháp
  d = clone(BASE); Object.assign(lotOf(d).info, {hinhThucLuong: 'ngaycong', donGiaNgay: {'Tổ trưởng': 400000, 'Công nhân khai thác': 300000, 'Công nhân cưa': 350000}});
  let card = await draftCard(d);
  ok('ngày công chưa có chấm công thực tế: BM-08 và BM-14 là bản nháp, nêu chỗ bổ sung', (card.match(/chưa có chấm công thực tế/g) || []).length >= 2 && /Chấm công thực tế/.test(card), card.slice(0, 500));
  lotOf(d).cc = {'2026-10': Object.fromEntries(NC3.map(r => [r.cccd, {'1': 1, '2': 1, '3': 1}]))};
  card = await draftCard(d);
  ok('đã chấm công thực tế: hết điều kiện chấm công', !/chưa có chấm công thực tế/.test(card), card.slice(0, 300));

  // 4. khối lượng thực tế lệch tổng phiếu cân (ngưỡng mặc định 1%)
  d = clone(BASE); lotOf(d).info.khoiLuong = 30;            // phiếu cân 21,75 tấn
  kt = await ktText(d);
  ok('khối lượng thực tế 30 tấn, phiếu cân 21,75 tấn: Kiểm tra trước khi xuất báo lệch theo ngưỡng mặc định', /lệch .*% so với khối lượng khai thác thực tế/.test(kt) && /ngưỡng 1% mặc định/.test(kt), kt.slice(0, 600));
  kt = await ktText(clone(BASE));
  ok('khối lượng thực tế bằng tổng phiếu cân: không báo lệch', !/so với khối lượng khai thác thực tế/.test(kt));
  d = clone(BASE); lotOf(d).info.khoiLuong = null; lotOf(d).pc = [P(1, 1)];
  kt = await ktText(d);
  ok('chưa nhập khối lượng thực tế (đang dùng số dự kiến) và không đặt ngưỡng: không báo lệch (lô đang khai thác dở)', !/so với khối lượng khai thác/.test(kt));

  // 5. ô đơn giá Tổ trưởng cũ
  await load(clone(BASE), 'finfo');
  ok('lô mới: không còn ô “Đơn giá giao khoán Tổ trưởng”', !/Đơn giá giao khoán Tổ trưởng|Đơn giá Tổ trưởng của hồ sơ cũ/.test(await w.innerText('#main')));
  d = clone(BASE); lotOf(d).info.donGia = 340000; lotOf(d).info.donGiaTan = {'Công nhân khai thác': 330000, 'Công nhân cưa': 380000}; await load(d, 'finfo');
  { const h = await w.evaluate(() => window.hak.loadSync().db.rs.own1.forests.fa.doi[0].hinhThuc);
    ok('hồ sơ cũ có đơn giá Tổ trưởng (SQLite v6): không còn ô cũ ở Thông tin rừng; giá 340.000 chuyển vào bảng đơn giá theo vị trí của đội và donGia bị bỏ', !/Đơn giá Tổ trưởng của hồ sơ cũ/.test(await w.innerText('#main')) && !(await w.$('#forestForm [name=donGia]')) && h.donGiaTan['Tổ trưởng'] === 340000 && !('donGia' in h), JSON.stringify(h)); }
  await w.click('#forestForm [type=submit]'); await w.waitForTimeout(500);
  ok('lưu Thông tin rừng: giá Tổ trưởng vẫn ở bảng đơn giá của đội, không sinh lại donGia', (await w.evaluate(() => window.hak.loadSync().db.rs.own1.forests.fa.doi[0].hinhThuc.donGiaTan['Tổ trưởng'])) === 340000 && !(await w.evaluate(() => 'donGia' in window.hak.loadSync().db.rs.own1.forests.fa.info)));

  // 6. vị trí của định mức nhân công có trong bảng đơn giá
  await load(clone(BASE), 'nc');
  const ncTxt = await w.innerText('#main');
  ok('bảng đơn giá có cả vị trí của định mức nhân công (Công nhân bóc vỏ, Công nhân bốc xếp)', /Đơn giá Công nhân bóc vỏ/.test(ncTxt) && /Đơn giá Công nhân bốc xếp/.test(ncTxt));

  // 7. cự ly tự tính (đường chim bay) → BM-04/09/10 bản nháp
  d = clone(BASE); Object.assign(lotOf(d).info, {cuLy: null, vanChuyen: {mode: 'tanKm', donGiaKm: 1000, bac: []}});
  card = await draftCard(d);
  ok('cước tấn/km dùng cự ly tự tính: BM-04, BM-09, BM-10 là bản nháp, nêu nhập quãng đường thực tế', (card.match(/đường chim bay/g) || []).length >= 3 && /Cự ly vận chuyển \(km\): nhập quãng đường thực tế/.test(card), card.slice(0, 600));
  lotOf(d).info.cuLy = 52; card = await draftCard(d);
  ok('nhập tay cự ly: hết điều kiện cự ly', !/đường chim bay/.test(card));
  card = await draftCard(clone(BASE));
  ok('cước cố định: không áp điều kiện cự ly', !/đường chim bay/.test(card));

  // 8. lô nhiều đội: khối lượng thực tế từng đội
  const NC2 = [nv(1, 'Tổ trưởng', 'TRẦN ĐỘI MỘT', 'Tổ trưởng', '049085000011', {doi: 'Đội 1'}), nv(2, 'Công nhân', 'LÊ MỘT', 'Công nhân khai thác', '049085000012', {doi: 'Đội 1'}),
    nv(3, 'Tổ trưởng', 'TRẦN ĐỘI HAI', 'Tổ trưởng', '049085000021', {doi: 'Đội 2'}), nv(4, 'Công nhân', 'LÊ HAI', 'Công nhân khai thác', '049085000022', {doi: 'Đội 2'})];
  d = clone(BASE); Object.assign(lotOf(d), {nc: NC2, pc: [P(1, 20), P(2, 10)]}); Object.assign(lotOf(d).info, {khoiLuong: 30, soDoi: 2});
  await load(d, 'finfo');
  ok('lô 2 đội chưa nhập khối lượng từng đội: không còn ô nhập (khối lượng đội = phiếu cân của đội)', (await w.$$('[data-kldoi]')).length === 0);
  card = await draftCard(d);
  ok('chưa nhập khối lượng từng đội: không có điều kiện khối lượng đội (chia theo số người như cũ)', !/khối lượng thực tế từng đội/.test(card));
  lotOf(d).info.klDoi = {'049085000011': 20}; card = await draftCard(d);
  ok('nhập thiếu một đội: BM-08, BM-14 là bản nháp, nêu chỗ sửa', /khối lượng thực tế từng đội nhập chưa đủ/.test(card) && /Thông tin rừng → Khối lượng thực tế từng đội/.test(card));
  kt = await ktText(d);
  ok('Kiểm tra trước khi xuất nêu “mới nhập cho 1/2 đội”', /mới nhập khối lượng thực tế cho 1\/2 đội/.test(kt));
  lotOf(d).info.klDoi = {'049085000011': 20, '049085000021': 15}; kt = await ktText(d);
  ok('tổng các đội (35) khác khối lượng của lô (30): báo lệch', /tổng khối lượng thực tế các đội 35 tấn khác khối lượng thực tế của lô 30 tấn/.test(kt));
  lotOf(d).info.klDoi = {'049085000011': 20, '049085000021': 10};
  card = await draftCard(d);
  ok('nhập đủ và khớp tổng (20 + 10 = 30): hết điều kiện khối lượng đội', !/khối lượng thực tế từng đội nhập chưa đủ/.test(card));
  if (process.env.DBG) console.log('DOI>>', JSON.stringify(await w.evaluate(() => { const f = window.hak.loadSync().db.rs.own1.forests.fa; return {doi: f.doi, info: f.info.klHoSoCu, klDoi: f.info.klDoi, nc: f.nc.map(r => [r.ten, r.cccd, r.doiId])}; })));
  const f = await grab('nttl', 'hd'), z = f && /\.zip$/.test(f) ? await JSZip.loadAsync(fs.readFileSync(f)) : null;
  const docs = z ? await Promise.all(Object.keys(z.files).filter(n => /\.docx$/.test(n)).map(async n => docText(await z.file(n).async('nodebuffer')))) : (f ? [await docText(fs.readFileSync(f))] : []);
  if (process.env.DBG) docs.forEach(x => console.log('DOC', (x.match(/.{0,60}tấn.{0,40}/g) || []).slice(0, 6).join(' | ')));
  ok("BM-14 từng đội dùng khối lượng nhập riêng ở cả mục 2.1 và 2.2: đội 1 ghi 20 tấn, đội 2 ghi 10 tấn (không phải 15/15 theo số người)", docs.length === 2 && docs.some(x => /TRẦN ĐỘI MỘT/.test(x) && /20,000/.test(x) && !/15,000/.test(x)) && docs.some(x => /TRẦN ĐỘI HAI/.test(x) && /10,000/.test(x) && !/15,000/.test(x)), docs.length + ' tài liệu');
  await w.click('[data-ftab=finfo]'); await w.waitForTimeout(300); { const t = await w.innerText('#forestForm');
    ok('khối lượng từng đội của hồ sơ cũ chỉ hiển thị (không còn ô nhập): Đội 1 = 20 tấn, Đội 2 = 10 tấn, có nút bỏ số hồ sơ cũ', /Khối lượng thực tế từng đội của hồ sơ cũ/.test(t) && !(await w.$('[data-kldoi]')) && /20 tấn/.test(t) && /10 tấn/.test(t) && !!(await w.$('[data-act=boKlCu]')), t.slice(0, 400)); }
  await w.click('[data-act=boKlCu]'); await w.waitForTimeout(400); await w.click('#loDirtyBar [data-act=stSave]'); await w.waitForTimeout(600);
  { const F = await w.evaluate(() => window.hak.loadSync().db.rs.own1.forests.fa);
    ok('bỏ số hồ sơ cũ: khối lượng lô và đội lấy theo phiếu cân (klHoSoCu của lô và của đội bị xóa)', !('klHoSoCu' in F.info) && F.doi.every(x => !('klHoSoCu' in x)), JSON.stringify(F.info.klHoSoCu)); }

  await app.close();
  ok('không có lỗi JavaScript', errs.length === 0, errs.join(' | '));
  console.log(fail ? fail + ' MỤC LỖI' : 'TẤT CẢ ĐẠT');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
