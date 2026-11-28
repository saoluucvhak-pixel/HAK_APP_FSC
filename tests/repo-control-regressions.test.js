'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const HAKDates = require('../src/dates');

function load(file, name, end, globals) {
  const s = fs.readFileSync(path.join(__dirname, '../ui/app', file), 'utf8');
  return vm.runInNewContext(s.slice(s.indexOf('function ' + name + '('), s.indexOf(end)) + '\n' + name, globals);
}

test('đối soát có phiếu cân tính ngày dự báo và bỏ qua Chủ nhật', () => {
  const forecast = load('32-b-doi-soat-san-luong.js', 'doiSoatSanLuongHtml', '{ const g = panelPhieuCan;', {
    HAKDates, HAKDinhMuc: require('../src/dinhmuc'), forestYield: () => 50, klPhieu: pc => pc.reduce((sum, p) => sum + p.kl, 0),
    todayStr: () => '27/11/2026', formatNumber: String, esc: String, pad2: n => String(n).padStart(2, '0')
  });
  const html = forecast({info: {denNgay: '02/12/2026'}, pc: [{ngay: '27/11/2026', kl: 20}]});
  assert.match(html, /30\/11\/2026/);
});

test('tạo lô kế thừa từ chối mã đã tồn tại ở lô khác trước khi ghi', () => {
  const owner = {id: 'o', info: {ma: 'CR'}, forests: {source: {info: {maRung: 'R-01'}}}};
  const fields = {ktNguonSel: {value: 'o|source'}, ktMaRung: {value: ' r-01 '}, ktTenRung: {value: 'Lô mới'}};
  for (const k of ['Nc', 'Dx', 'Luong', 'MuaHang']) fields['ktOpt' + k] = {checked: true};
  const messages = [];
  const create = load('20-nhap-tu-danh-muc.js', 'thucHienKeThuaRung', 'function loTuLoCuBox', {
    curOwner: () => owner, document: {getElementById: id => fields[id]}, db: {rs: {o: owner}},
    trim: s => s.trim(), HAKLoRung: require('../src/lorung'), newId: () => 'new',
    HAKDanhMuc: {loTuLoCu: () => ({f: {nc: [], dx: []}})}, NAV: {}, render() {},
    persist: () => assert.fail('Mã trùng không được đưa vào hàng đợi ghi'), note: message => messages.push(message)
  });
  create();
  assert.deepEqual(Object.keys(owner.forests), ['source']);
  assert.match(messages[0], /đã có|đã tồn tại/);
});

test('biên bản nội bộ không chấm điểm hay kết luận đạt khi kiểm tra thất bại', () => {
  const audit = load('33-in-tron-bo-pdf.js', 'inBienBanKiemToanFscHtml', 'async function inBienBanKiemToanFscMo', {
    curOwner: () => ({info: {ten: 'Chủ rừng'}}), forestYield: () => 0, esc: String, formatNumber: String,
    exportCheck() { throw new Error('Không kiểm tra được'); }
  });
  const html = audit({info: {maRung: 'R-A'}}, {info: {maRung: 'R-A'}});
  assert.match(html, /Chưa kiểm tra được/);
  assert.doesNotMatch(html, /100\/100|<b>ĐẠT<\/b>|Đủ điều kiện xuất bán/);
});

test('lưu giao diện chỉ dọn chủ rừng bị thiếu nếu hồ sơ đó hoàn toàn rỗng', () => {
  const {Store} = require('../src/store');
  const s = new Store(':memory:');
  try {
    s.save({v: 2, rs: {
      rong: {id: 'rong', info: {danhXung: 'Ông'}, forests: {}},
      diaChi: {id: 'diaChi', info: {diaChi: 'Địa chỉ hồ sơ'}, forests: {}},
      hopDong: {id: 'hopDong', info: {soHopDong: 'HD-01'}, forests: {}}
    }});
    const next = s.load();
    next.rs = {};
    s.save(next, {preserveMissingOwners: true});
    assert.deepEqual(Object.keys(s.load().rs).sort(), ['diaChi', 'hopDong']);
  } finally { s.close(); }
});
