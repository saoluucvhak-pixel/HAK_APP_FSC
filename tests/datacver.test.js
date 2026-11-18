'use strict';
/* B7: kết quả kiểm tra nhớ tạm theo PHIÊN BẢN DỮ LIỆU (dataVer, ui/app/02). Mọi hàm giao diện sửa dữ liệu lô hoặc db phải đi qua một hàm tăng phiên bản
 * (persist, persistLo, persistNow, luuLo, stSave, doiDuLieu, loVeBanDaLuu…), nếu không màn Kiểm tra có thể đọc kết quả cũ. Test quét mã nguồn; ngoại lệ ghi rõ lý do. */
const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('fs'), path = require('path');
const DIR = path.join(__dirname, '..', 'ui', 'app');
const MUT = /\b(f|f0|ff|fo)\.(nc|dx|pc|doi|hdvc|info|exp|cc|inDot2|inAn|chot|dung|luuTru|nhatKy|giayTo|bienLog)\s*=(?!=)|\bObject\.assign\((f|f0)\s*,|\bdb\.[a-zA-Z]+\s*=(?!=)|\bdb\s*=(?!=)/;
const OK = /\b(persist|persistLo|persistNow|luuLo|stSave|doiDuLieu|loVeBanDaLuu|luuLoTT)\s*\(/;
const NGOAI_LE = {
  'loadDb': 'nạp dữ liệu lúc mở app (chưa có kết quả nhớ tạm nào)',
  'curTeam': 'chuẩn hóa cấu trúc đội lúc đọc (ensureForest: không đổi nội dung, chạy lại không đổi)',
  'jobView': 'chuẩn hóa cấu trúc lúc đọc (lô mới chưa có đội); bọc thêm khóa nhớ tạm',
  'importGo': 'thay CẢ db (db = …): nhớ tạm so khớp đối tượng db nên tự tính lại; bỏ bản nháp qua stages (đã tăng phiên bản)',
  'lotGo': 'thay CẢ db sau khôi phục một lô: như importGo',
  'dbCard': 'không sửa dữ liệu: chuỗi HTML data-db="…" khớp mẫu tìm',
  'chuanHoaDb': 'chuẩn hóa ngay trước khi ghi (gọi trong lưu, sau persist đã tăng phiên bản): ID dòng, liên kết, Danh mục vị trí — xác định, chạy lại không đổi'
};
function quet() {
  const out = [];
  fs.readdirSync(DIR).filter(n => n.endsWith('.js')).forEach(n => {
    const lines = fs.readFileSync(path.join(DIR, n), 'utf8').split('\n'); let cur = null;
    const flush = () => { if (cur && MUT.test(cur.body) && !OK.test(cur.body)) out.push({file: n, line: cur.line, name: cur.name}); };
    lines.forEach((l, i) => {
      const m = /^(?:async\s+)?function\s+([A-Za-z0-9_$]+)|^(?:const|let)\s+([A-Za-z0-9_$]+)\s*=\s*(?:async\s*)?(?:\([^)]*\)|[A-Za-z_$][\w$]*)\s*=>|^document\.addEventListener\('(\w+)'/.exec(l);
      if (m) { flush(); cur = {name: m[1] || m[2] || ('listener:' + m[3]), line: i + 1, body: ''}; }
      if (cur) cur.body += l + '\n';
    });
    flush();
  });
  return out;
}

test('mọi hàm giao diện sửa dữ liệu lô / db đều tăng phiên bản dữ liệu (hoặc là ngoại lệ có lý do)', () => {
  const sai = quet().filter(x => !NGOAI_LE[x.name]);
  assert.deepStrictEqual(sai.map(x => x.file + ':' + x.line + ' ' + x.name), [], 'thêm lời gọi persistLo / persist / doiDuLieu, hoặc ghi ngoại lệ kèm lý do');
});

test('các đường đổi dữ liệu chung đều tăng phiên bản: persist, persistLo, persistNow, bỏ thay đổi, bản nháp (HAKStage bọc, stages là Proxy)', () => {
  const doc = n => fs.readFileSync(path.join(DIR, n), 'utf8');
  const {docUi} = require('./_ui');
  const m02 = doc('02-luu-tru-trang-thai.js'), m11 = doc('11-cham-cong-ban-nhap.js'), m17 = doc('17-tra-cuu-google-sheets.js'), m10 = docUi('10');
  assert.match(m02, /function persist\(\) \{\n  doiDuLieu\(\);/);
  assert.match(m02, /function persistLo\(f\) \{\n  doiDuLieu\(\);/);
  assert.match(m02, /function loVeBanDaLuu\(fid\) \{\n  doiDuLieu\(\);/);
  assert.match(m02, /\['merge', 'addRow', 'updateRow', 'removeRow', 'restoreRow', 'resolve', 'commit'\]\.forEach/);
  assert.match(m11, /const stages = new Proxy\(\{\}, \{set\(t, k, v\) \{ t\[k\] = v; doiDuLieu\(\);/);
  assert.match(m17, /async function persistNow\(\) \{\n  doiDuLieu\(\);/);
  assert.match(m10, /cheoNho\.ver !== dataVer/, 'chỉ mục chéo lô dựng lại khi dữ liệu đổi');
  assert.ok(!/Promise\.resolve\(\)\.then\(ktXoaNho\)/.test(m10), 'không còn xóa nhớ tạm sau mỗi vi tác vụ');
});
