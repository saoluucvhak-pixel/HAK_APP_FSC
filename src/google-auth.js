'use strict';
/* Đăng nhập Google cho bảng tính giới hạn quyền xem — luồng "ứng dụng máy tính" (OAuth 2.0 + PKCE, chuyển hướng về 127.0.0.1).
 * - Chỉ xin quyền chỉ đọc: https://www.googleapis.com/auth/drive.readonly (cần để xuất bảng tính ra .xlsx).
 * - Không lưu mật khẩu. Mã làm mới (refresh token) chỉ lưu khi hệ điều hành mã hóa được (Electron safeStorage / Windows DPAPI).
 * - Cấu hình OAuth (client id/secret kiểu "Desktop app") đọc từ biến môi trường HAKQN_GOOGLE_CLIENT_ID / HAKQN_GOOGLE_CLIENT_SECRET
 *   hoặc file google-oauth.json trong thư mục dữ liệu người dùng. Không đưa vào mã nguồn.
 * Mọi địa chỉ máy chủ có thể thay (cfg.authUrl, cfg.tokenUrl, cfg.driveBase) để kiểm thử bằng máy chủ giả trên localhost. */
const http = require('http');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const SCOPE = 'https://www.googleapis.com/auth/drive.readonly';
const DEFAULTS = {authUrl: 'https://accounts.google.com/o/oauth2/v2/auth', tokenUrl: 'https://oauth2.googleapis.com/token', driveBase: 'https://www.googleapis.com/drive/v3'};
const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

class GoogleError extends Error { constructor(code, message) { super(message); this.code = code; } }
const b64u = b => Buffer.from(b).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

/* Mã tệp từ liên kết Google Sheets */
const fileIdOf = link => { const m = /\/spreadsheets\/d\/([A-Za-z0-9_-]+)/.exec(link || ''); return m ? m[1] : null; };

class GoogleAuth {
  /* opts: {dir (thư mục dữ liệu), fetch, openExternal(url), safeStorage (tùy chọn), env, now, ...DEFAULTS} */
  constructor(opts) {
    this.o = Object.assign({}, DEFAULTS, opts);
    this.fetch = this.o.fetch || globalThis.fetch;
    this.mem = null; // {access, exp, refresh?, email?}
    this.tokenFile = path.join(this.o.dir, 'google-token.bin');
  }

  config() {
    const env = this.o.env || process.env;
    let id = env.HAKQN_GOOGLE_CLIENT_ID, secret = env.HAKQN_GOOGLE_CLIENT_SECRET;
    if (!id) {
      try { const c = JSON.parse(fs.readFileSync(path.join(this.o.dir, 'google-oauth.json'), 'utf8')); id = c.clientId; secret = c.clientSecret; } catch (e) { /* chưa cấu hình */ }
    }
    return id ? {clientId: id, clientSecret: secret || ''} : null;
  }

  canPersist() { const s = this.o.safeStorage; return !!(s && s.isEncryptionAvailable && s.isEncryptionAvailable()); }
  loadRefresh() {
    if (!this.canPersist()) return null;
    try { return this.o.safeStorage.decryptString(fs.readFileSync(this.tokenFile)); } catch (e) { return null; }
  }
  saveRefresh(t) { if (this.canPersist() && t) { fs.mkdirSync(this.o.dir, {recursive: true}); fs.writeFileSync(this.tokenFile, this.o.safeStorage.encryptString(t)); } }
  clearRefresh() { try { fs.unlinkSync(this.tokenFile); } catch (e) { /* không có */ } }

  status() {
    const cfg = this.config();
    const refresh = (this.mem && this.mem.refresh) || this.loadRefresh();
    return {configured: !!cfg, signedIn: !!(this.mem && this.mem.access) || !!refresh, email: (this.mem && this.mem.email) || '', persistent: this.canPersist(), scope: SCOPE};
  }

  async tokenRequest(params) {
    const cfg = this.config();
    const body = new URLSearchParams(Object.assign({client_id: cfg.clientId}, cfg.clientSecret ? {client_secret: cfg.clientSecret} : {}, params));
    let res;
    try { res = await this.fetch(this.o.tokenUrl, {method: 'POST', headers: {'content-type': 'application/x-www-form-urlencoded'}, body}); }
    catch (e) { throw new GoogleError('network', 'Không kết nối được máy chủ Google (' + e.message + ')'); }
    let j = {}; try { j = await res.json(); } catch (e) { /* không phải JSON */ }
    if (!res.ok) {
      if (j.error === 'invalid_grant') throw new GoogleError('expired', 'Phiên đăng nhập Google đã hết hạn hoặc bị thu hồi. Hãy đăng nhập lại.');
      throw new GoogleError('token', 'Google từ chối yêu cầu đăng nhập (' + (j.error_description || j.error || 'HTTP ' + res.status) + ')');
    }
    return j;
  }

  /* Đăng nhập: mở trình duyệt, chờ mã về 127.0.0.1, đổi lấy token */
  async login(timeoutMs = 180000) {
    const cfg = this.config();
    if (!cfg) throw new GoogleError('no_config', 'Chưa cấu hình OAuth Google. Cần tạo "OAuth client ID" loại Desktop app và đặt client id/secret (xem docs/GOOGLE_OAUTH.md).');
    const verifier = b64u(crypto.randomBytes(32)), challenge = b64u(crypto.createHash('sha256').update(verifier).digest()), state = b64u(crypto.randomBytes(16));
    const code = await new Promise((resolve, reject) => {
      let done = false;
      const finish = (fn, v) => { if (done) return; done = true; clearTimeout(timer); srv.close(); srv.closeAllConnections(); fn(v); };
      const srv = http.createServer((req, res) => {
        const u = new URL(req.url, 'http://127.0.0.1');
        if (u.pathname !== '/cb') { res.writeHead(404).end(); return; }
        const err = u.searchParams.get('error'), c = u.searchParams.get('code');
        res.writeHead(200, {'content-type': 'text/html; charset=utf-8'});
        if (u.searchParams.get('state') !== state) { res.end('<p>Yêu cầu không hợp lệ.</p>'); return; } // bỏ qua, chờ đúng yêu cầu
        res.end('<p>' + (err ? 'Chưa đăng nhập được.' : 'Đã đăng nhập xong. Bạn có thể đóng cửa sổ này và quay lại HAKQN.') + '</p>');
        if (err) finish(reject, new GoogleError(err === 'access_denied' ? 'denied' : 'token', err === 'access_denied' ? 'Bạn đã từ chối cấp quyền đọc bảng tính.' : 'Google báo lỗi: ' + err));
        else if (c) finish(resolve, c);
      });
      const timer = setTimeout(() => finish(reject, new GoogleError('timeout', 'Hết thời gian chờ đăng nhập Google.')), timeoutMs);
      srv.on('error', e => finish(reject, new GoogleError('network', 'Không mở được cổng nhận kết quả đăng nhập: ' + e.message)));
      srv.listen(0, '127.0.0.1', () => {
        this.redirect = 'http://127.0.0.1:' + srv.address().port + '/cb';
        const url = this.o.authUrl + '?' + new URLSearchParams({client_id: cfg.clientId, redirect_uri: this.redirect, response_type: 'code', scope: SCOPE,
          code_challenge: challenge, code_challenge_method: 'S256', state, access_type: 'offline', prompt: 'consent'});
        Promise.resolve(this.o.openExternal(url)).catch(e => finish(reject, new GoogleError('browser', 'Không mở được trình duyệt: ' + e.message)));
      });
    });
    const t = await this.tokenRequest({grant_type: 'authorization_code', code, code_verifier: verifier, redirect_uri: this.redirect});
    this.mem = {access: t.access_token, exp: (this.o.now ? this.o.now() : Date.now()) + (t.expires_in || 3600) * 1000 - 60000, refresh: t.refresh_token || (this.mem && this.mem.refresh), email: ''};
    this.saveRefresh(this.mem.refresh);
    await this.fetchEmail();
    return this.status();
  }

  async fetchEmail() {
    try {
      const r = await this.fetch(this.o.driveBase + '/about?fields=user(emailAddress)', {headers: {authorization: 'Bearer ' + this.mem.access}});
      if (r.ok) this.mem.email = ((await r.json()).user || {}).emailAddress || '';
    } catch (e) { /* không bắt buộc */ }
  }

  logout() { this.mem = null; this.clearRefresh(); return this.status(); }

  async accessToken(force) {
    const now = this.o.now ? this.o.now() : Date.now();
    if (!force && this.mem && this.mem.access && this.mem.exp > now) return this.mem.access;
    const refresh = (this.mem && this.mem.refresh) || this.loadRefresh();
    if (!refresh) throw new GoogleError('not_signed_in', 'Chưa đăng nhập Google (hoặc phiên đăng nhập không được lưu). Bấm "Đăng nhập Google".');
    if (!this.config()) throw new GoogleError('no_config', 'Chưa cấu hình OAuth Google.');
    try {
      const t = await this.tokenRequest({grant_type: 'refresh_token', refresh_token: refresh});
      this.mem = Object.assign({email: ''}, this.mem, {access: t.access_token, exp: now + (t.expires_in || 3600) * 1000 - 60000, refresh});
    } catch (e) { if (e.code === 'expired') this.logout(); throw e; }
    return this.mem.access;
  }

  /* Tải bảng tính dạng .xlsx qua Drive API (chỉ đọc). Trả về Buffer. */
  async exportXlsx(fileId, signal) {
    if (!fileId) throw new GoogleError('bad_link', 'Liên kết Google Sheets không hợp lệ');
    for (let attempt = 0; attempt < 2; attempt++) {
      const token = await this.accessToken(attempt > 0);
      let res;
      try { res = await this.fetch(this.o.driveBase + '/files/' + encodeURIComponent(fileId) + '/export?mimeType=' + encodeURIComponent(XLSX_MIME), {headers: {authorization: 'Bearer ' + token}, signal}); }
      catch (e) { throw new GoogleError(e.name === 'AbortError' ? 'timeout' : 'network', e.name === 'AbortError' ? 'Hết thời gian chờ kết nối' : 'Không kết nối được (' + e.message + ')'); }
      if (res.status === 401 && attempt === 0) continue; // token hết hạn giữa chừng: làm mới rồi thử lại một lần
      if (res.status === 401) throw new GoogleError('expired', 'Phiên đăng nhập Google không còn hiệu lực. Hãy đăng nhập lại.');
      if (res.status === 403) {
        let why = ''; try { why = (((await res.json()).error || {}).errors || [{}])[0].reason || ''; } catch (e) { /* bỏ qua */ }
        throw new GoogleError(/rateLimit|quota/i.test(why) ? 'quota' : 'forbidden', /rateLimit|quota/i.test(why) ? 'Google tạm giới hạn lượt tải, hãy thử lại sau ít phút.' : 'Tài khoản đang đăng nhập chưa được cấp quyền xem bảng tính này (hoặc Drive API chưa được bật cho ứng dụng).');
      }
      if (res.status === 404) throw new GoogleError('not_found', 'Không tìm thấy bảng tính hoặc tài khoản đang đăng nhập không có quyền truy cập.');
      if (!res.ok) throw new GoogleError('http', 'Máy chủ Google trả lỗi HTTP ' + res.status);
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.slice(0, 2).toString() !== 'PK') throw new GoogleError('format', 'Nội dung tải về không phải bảng tính.');
      return buf;
    }
  }
}

module.exports = {GoogleAuth, GoogleError, fileIdOf, SCOPE, XLSX_MIME};
