'use strict';
const test = require('node:test');
const assert = require('node:assert');
const http = require('http'), crypto = require('crypto'), fs = require('fs'), os = require('os'), path = require('path');
const {GoogleAuth, GoogleError, fileIdOf} = require('../src/google-auth');
const {Store} = require('../src/store');
const {Lookup} = require('../src/lookup');
const {build} = require('./fixtures/make-lookup');

/* Máy chủ Google giả (localhost): /token, /about, /files/:id/export. Dữ liệu giả lập, không có thông tin thật. */
async function fakeGoogle(opts = {}) {
  const st = {codes: {}, refreshUses: 0, exports: 0, challenge: null, accessN: 0, validAccess: new Set(), xlsx: opts.xlsx || build(), exportStatus: opts.exportStatus || 200, revoked: false};
  const srv = http.createServer((req, res) => {
    let body = ''; req.on('data', c => body += c); req.on('end', () => {
      const u = new URL(req.url, 'http://x');
      const json = (code, o) => { res.writeHead(code, {'content-type': 'application/json'}); res.end(JSON.stringify(o)); };
      if (u.pathname === '/token') {
        const p = new URLSearchParams(body);
        if (p.get('grant_type') === 'authorization_code') {
          const okPkce = st.codes[p.get('code')] && crypto.createHash('sha256').update(p.get('code_verifier')).digest('base64url') === st.challenge;
          if (!okPkce) return json(400, {error: 'invalid_grant'});
          const a = 'access-' + (++st.accessN); st.validAccess.add(a); return json(200, {access_token: a, refresh_token: 'refresh-1', expires_in: 3600});
        }
        st.refreshUses++;
        if (st.revoked || p.get('refresh_token') !== 'refresh-1') return json(400, {error: 'invalid_grant', error_description: 'Token has been expired or revoked.'});
        const a = 'access-' + (++st.accessN); st.validAccess.add(a); return json(200, {access_token: a, expires_in: 3600});
      }
      const tok = (req.headers.authorization || '').replace('Bearer ', '');
      if (u.pathname === '/drive/v3/about') return st.validAccess.has(tok) ? json(200, {user: {emailAddress: 'tester@example.test'}}) : json(401, {});
      if (/\/drive\/v3\/files\/.+\/export/.test(u.pathname)) {
        st.exports++;
        if (opts.expireFirst && st.exports === 1) { st.validAccess.delete(tok); }
        if (!st.validAccess.has(tok)) return json(401, {error: {code: 401}});
        if (st.exportStatus !== 200) return json(st.exportStatus, {error: {errors: [{reason: opts.reason || 'forbidden'}]}});
        res.writeHead(200, {'content-type': 'application/octet-stream'}); return res.end(st.xlsx);
      }
      res.writeHead(404).end();
    });
  });
  await new Promise(r => srv.listen(0, '127.0.0.1', r));
  const base = 'http://127.0.0.1:' + srv.address().port;
  return {st, base, close: () => new Promise(r => { srv.close(r); srv.closeAllConnections(); })};
}
const fakeSafe = {isEncryptionAvailable: () => true, encryptString: s => Buffer.from('ENC:' + s), decryptString: b => { const t = b.toString(); if (!t.startsWith('ENC:')) throw new Error('bad'); return t.slice(4); }};
const mk = (g, extra = {}) => {
  const dir = extra.dir || fs.mkdtempSync(path.join(os.tmpdir(), 'hakqn-ga-'));
  // "Trình duyệt" giả: lấy redirect_uri + state từ URL xin quyền rồi gọi về, kèm mã hợp lệ (hoặc lỗi)
  const openExternal = async url => {
    const u = new URL(url); g.st.challenge = u.searchParams.get('code_challenge');
    assert.strictEqual(u.searchParams.get('scope'), 'https://www.googleapis.com/auth/drive.readonly'); // chỉ đọc
    assert.strictEqual(u.searchParams.get('code_challenge_method'), 'S256');
    const back = new URL(u.searchParams.get('redirect_uri'));
    if (extra.badStateFirst) { await fetch(back + '?code=evil&state=wrong'); }
    if (extra.deny) back.searchParams.set('error', 'access_denied'); else { g.st.codes['good-code'] = true; back.searchParams.set('code', 'good-code'); }
    back.searchParams.set('state', u.searchParams.get('state'));
    if (!extra.noCallback) fetch(back).catch(() => {});
  };
  const a = new GoogleAuth({dir, fetch, openExternal, safeStorage: extra.safe === undefined ? fakeSafe : extra.safe, authUrl: g.base + '/auth', tokenUrl: g.base + '/token', driveBase: g.base + '/drive/v3',
    env: extra.env || {HAKQN_GOOGLE_CLIENT_ID: 'test-client', HAKQN_GOOGLE_CLIENT_SECRET: 'test-secret'}});
  return {a, dir};
};

test('liên kết -> mã tệp', () => {
  assert.strictEqual(fileIdOf('https://docs.google.com/spreadsheets/d/AbC_123-x/edit?usp=sharing'), 'AbC_123-x');
  assert.strictEqual(fileIdOf('https://example.com/'), null);
});

test('chưa cấu hình OAuth: báo rõ, không mở trình duyệt', async () => {
  const g = await fakeGoogle(); const {a} = mk(g, {env: {}});
  assert.strictEqual(a.status().configured, false);
  await assert.rejects(a.login(), e => e.code === 'no_config' && /OAuth/.test(e.message));
  await g.close();
});

test('đăng nhập PKCE chỉ đọc: lưu mã làm mới đã mã hóa, tải .xlsx, nạp đủ 3 tab vào bản tra cứu', async () => {
  const g = await fakeGoogle(); const {a, dir} = mk(g);
  const s = await a.login(5000);
  assert.deepStrictEqual([s.signedIn, s.email, s.persistent], [true, 'tester@example.test', true]);
  assert.ok(fs.readFileSync(path.join(dir, 'google-token.bin')).toString().startsWith('ENC:')); // không lưu dạng chữ rõ
  const buf = await a.exportXlsx('FILE1');
  const L = new Lookup(new Store(':memory:')); const r = L.load(buf, 'google', 'x');
  assert.ok(r.ok); assert.deepStrictEqual(r.counts, {HoSoKeo_QC: 8, HoSoRung_QC: 5, ToaDoRung_QC: 7});
  await g.close();
});

test('khởi động lại: dùng mã làm mới đã lưu; đăng xuất xóa mã', async () => {
  const g = await fakeGoogle(); const first = mk(g); await first.a.login(5000);
  const second = mk(g, {dir: first.dir});             // phiên mới, bộ nhớ trống
  assert.strictEqual(second.a.status().signedIn, true);
  assert.ok((await second.a.exportXlsx('F')).length > 100); assert.strictEqual(g.st.refreshUses, 1);
  second.a.logout(); assert.strictEqual(fs.existsSync(path.join(first.dir, 'google-token.bin')), false);
  await assert.rejects(second.a.exportXlsx('F'), e => e.code === 'not_signed_in');
  await g.close();
});

test('không mã hóa được: chỉ giữ trong bộ nhớ, không ghi mã ra đĩa', async () => {
  const g = await fakeGoogle(); const {a, dir} = mk(g, {safe: null});
  const s = await a.login(5000); assert.deepStrictEqual([s.signedIn, s.persistent], [true, false]);
  assert.strictEqual(fs.existsSync(path.join(dir, 'google-token.bin')), false);
  await g.close();
});

test('từ chối cấp quyền, trả sai state, hết thời gian chờ', async () => {
  const g = await fakeGoogle();
  await assert.rejects(mk(g, {deny: true}).a.login(5000), e => e.code === 'denied');
  const ok = await mk(g, {badStateFirst: true}).a.login(5000); assert.strictEqual(ok.signedIn, true); // yêu cầu sai state bị bỏ qua
  await assert.rejects(mk(g, {noCallback: true}).a.login(300), e => e.code === 'timeout');
  await g.close();
});

test('lỗi tải: token hết hạn giữa chừng tự làm mới 1 lần; thiếu quyền; sai id; vượt hạn mức', async () => {
  let g = await fakeGoogle({expireFirst: true}); let {a} = mk(g); await a.login(5000);
  assert.ok((await a.exportXlsx('F')).length > 100); assert.strictEqual(g.st.refreshUses, 1); await g.close();
  for (const [status, code, re, reason] of [[403, 'forbidden', /chưa được cấp quyền/, 'forbidden'], [404, 'not_found', /không có quyền/, ''], [403, 'quota', /giới hạn lượt tải/, 'rateLimitExceeded'], [500, 'http', /HTTP 500/, '']]) {
    g = await fakeGoogle({exportStatus: status, reason}); ({a} = mk(g)); await a.login(5000);
    await assert.rejects(a.exportXlsx('F'), e => e.code === code && re.test(e.message), status + ' ' + code); await g.close();
  }
});

test('hết phiên (bị thu hồi): báo yêu cầu đăng nhập lại và xóa mã; mất mạng: báo lỗi mạng', async () => {
  let g = await fakeGoogle(); let {a, dir} = mk(g); await a.login(5000);
  const b = mk(g, {dir}); g.st.revoked = true;
  await assert.rejects(b.a.exportXlsx('F'), e => e.code === 'expired' && /đăng nhập lại/.test(e.message));
  assert.strictEqual(fs.existsSync(path.join(dir, 'google-token.bin')), false); await g.close();
  g = await fakeGoogle(); ({a, dir} = mk(g)); await a.login(5000); const c = mk(g, {dir}); await g.close(); // máy chủ tắt
  c.a.mem = null; await assert.rejects(c.a.exportXlsx('F'), e => e.code === 'network');
});

test('tải về không phải bảng tính hoặc thiếu tab: không thay bản tra cứu cũ', async () => {
  const g = await fakeGoogle({xlsx: Buffer.from('PK-not-a-workbook')}); const {a} = mk(g); await a.login(5000);
  const buf = await a.exportXlsx('F');
  const L = new Lookup(new Store(':memory:')); L.load(build(), 'excel', 'cu.xlsx');
  const r = L.load(buf, 'google', 'x'); assert.strictEqual(r.ok, false); assert.strictEqual(L.status().active.detail, 'cu.xlsx');
  assert.strictEqual(L.search('', '').total, 20);
  await g.close();
});
