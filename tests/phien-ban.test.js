'use strict';
/* Đồng bộ số phiên bản của bản phát hành: package.json, package-lock.json, tên bộ cài, CHANGELOG, ghi chú phát hành. */
const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..'), doc = f => fs.readFileSync(path.join(root, f), 'utf8');
const pkg = JSON.parse(doc('package.json')), lock = JSON.parse(doc('package-lock.json')), v = pkg.version;
const so = x => x.split('.').map(Number), lon = (a, b) => { const x = so(a), y = so(b); for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] > y[i]; return false; };
const CONG_KHAI = '3.5.1';   // bản phát hành công khai gần nhất (GitHub Releases)

test('package.json và package-lock.json cùng một số phiên bản dạng x.y.z', () => {
  assert.match(v, /^\d+\.\d+\.\d+$/); assert.equal(lock.version, v); assert.equal(lock.packages[''].version, v);
});
test('phiên bản lớn hơn bản công khai gần nhất (cài đè là nâng cấp, không phải hạ cấp)', () => { assert.ok(lon(v, CONG_KHAI), v + ' phải lớn hơn ' + CONG_KHAI); });
test('tên bộ cài lấy số phiên bản từ package.json', () => { assert.equal(pkg.build.nsis.artifactName || pkg.build.artifactName || (pkg.build.win || {}).artifactName, 'HAKQN-HoSoKhaiThac-Setup-${version}.exe'); });
test('CHANGELOG: mục đầu tiên là phiên bản hiện tại; không còn mục “Chưa phát hành” treo', () => {
  const heads = doc('CHANGELOG.md').split('\n').filter(l => l.startsWith('## '));
  assert.ok(heads[0].startsWith('## ' + v + ' '), heads[0]); assert.ok(!heads.some(h => /Chưa phát hành/.test(h)));
});
test('ghi chú phát hành của phiên bản hiện tại có sẵn, nêu đúng số phiên bản và tên bộ cài', () => {
  const t = doc('docs/GHI_CHU_PHAT_HANH_' + v + '.md');
  assert.ok(t.includes('HAKQN Desktop ' + v)); assert.ok(t.includes('HAKQN-HoSoKhaiThac-Setup-' + v + '.exe')); assert.ok(t.includes('v' + CONG_KHAI));
});
test('giao diện hiện phiên bản của bản cài ở đầu trang', () => {
  assert.ok(doc('ui/app.src.html').includes('id="appVer"')); assert.ok(/appVer[\s\S]{0,120}r\.version/.test(doc('ui/app/02-luu-tru-trang-thai.js')));
});

