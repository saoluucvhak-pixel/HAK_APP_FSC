'use strict';
/* FLT-04: Smart Filter cho Danh mục Vị trí và bảng chọn phiếu của Phân bổ khối lượng. Lọc chỉ ảnh hưởng HIỂN THỊ: không đổi dữ liệu, tổng tính trên toàn bộ. */
const test = require('node:test'), assert = require('node:assert/strict'), fs = require('fs'), path = require('path'), vm = require('vm');
const SFM = require('../ui/vendor/hak-smart-filter/index.js'), PB = require('../src/phanbo');
const doc = t => fs.readFileSync(path.join(__dirname, '..', 'ui', 'app', t), 'utf8');
const ctx = {document: {addEventListener() {}}, HAKCore: {sf: SFM.core}, HAKPhanBo: PB, trim: v => String(v == null ? '' : v).trim(), console};
vm.createContext(ctx);
vm.runInContext(doc('30-cai-dat-danh-muc.js').replace(/^const /gm, 'var ') + '\n' + doc('33-phan-bo.js') + '\n;this.__x = {vtSfCfg: typeof vtSfCfg === "function" ? vtSfCfg : null, pbSfCfg: typeof pbSfCfg === "function" ? pbSfCfg : null};', ctx);
const {vtSfCfg, pbSfCfg} = ctx.__x;
const loc = (cfg, rows, sua) => { const f = SFM.createFilter(cfg); sua(f); return Array.from(f.filter(rows).rows); };
const chu = s => f => f.setState(Object.assign({}, f.getState(), {q: s}));

test('FLT-04: Vị trí tìm theo tên hoặc mã, không dấu, từng từ', () => {
  const vt = [{id: 'VT01', ten: 'Công nhân cưa'}, {id: 'VT02', ten: 'Tổ trưởng'}, {id: 'VT03', ten: 'Công nhân bốc xếp'}];
  const q = s => loc(vtSfCfg(), vt, chu(s)).map(v => v.id);
  assert.deepEqual(q('cong nhan'), ['VT01', 'VT03']); assert.deepEqual(q('vt02'), ['VT02']); assert.deepEqual(q('to truong'), ['VT02']); assert.deepEqual(q(''), ['VT01', 'VT02', 'VT03']);
  assert.equal(vt.length, 3);   // dữ liệu không đổi
});
test('FLT-04: Phân bổ lọc phiếu theo đội, chưa phân bổ, chữ; giữ chỉ số gốc của phiếu; tổng phân bổ tính trên toàn bộ', () => {
  const rec = {doi: [{id: 'd1', ten: 'Đội A'}, {id: 'd2', ten: ''}], pc: [{soPhieu: 'P01', ngay: '01/11/2026', bienSo: '92C-111.11', kl: 10, doiId: 'd1'}, {soPhieu: 'P02', ngay: '02/11/2026', bienSo: '92C-222.22', kl: 20, doiId: 'd2'}, {soPhieu: 'P03', ngay: '03/11/2026', bienSo: '92C-333.33', kl: 30}]};
  const rows = rec.pc.map((p, i) => ({p, i})), cfg = pbSfCfg(rec);
  assert.deepEqual(loc(cfg, rows, f => f.setField('doi', 'd2')).map(r => r.i), [1]);
  assert.deepEqual(loc(cfg, rows, f => f.setField('chuaGan', true)).map(r => r.i), [2]);
  assert.deepEqual(loc(cfg, rows, chu('92c 111')).map(r => r.i), [0]);
  const truoc = JSON.stringify(rec);
  loc(cfg, rows, f => f.setField('doi', 'd1'));
  assert.equal(JSON.stringify(rec), truoc);   // lọc không đổi dữ liệu
  const pan = doc('33-phan-bo.js').match(/function panelPhanBo[\s\S]*?\n\}\n/)[0];
  assert.match(pan, /HAKPhanBo\.tinh\(f, cd\)/); assert.doesNotMatch(pan, /sfRes|hakSfApply/);   // tổng tính trên toàn bộ, không qua bộ lọc
});
