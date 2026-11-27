'use strict';
const fs = require('node:fs');
const path = require('node:path');
const {randomBytes, scrypt, timingSafeEqual} = require('node:crypto');
const {promisify} = require('node:util');
const derive = promisify(scrypt);
const COST = {N: 131072, r: 8, p: 1, maxmem: 192 * 1024 * 1024};
const bad = error => ({ok: false, error});
const userName = value => typeof value === 'string' && value.length <= 256 ? value.normalize('NFKC').trim() : '';
const validPassword = value => typeof value === 'string' && value.length >= 8 && Buffer.byteLength(value) <= 256;

class LocalAccount {
  constructor(userDir, {requireSetup = false, now = Date.now} = {}) {
    this.file = path.join(userDir, 'local-account.json');
    this.now = now;
    this.failures = 0;
    this.retryAt = 0;
    this.busy = false;
    this.record = null;
    try {
      const r = JSON.parse(fs.readFileSync(this.file, 'utf8'));
      if (r?.version !== 1 || !['single', 'account'].includes(r.mode) ||
          (r.mode === 'account' && (!userName(r.user) || typeof r.salt !== 'string' || typeof r.hash !== 'string' ||
            !/^[\da-f]{64}$/.test(r.salt) || !/^[\da-f]{64}$/.test(r.hash)))) throw new Error('invalid account');
      this.record = r;
      this.mode = r.mode;
    } catch (e) {
      this.mode = e.code === 'ENOENT' ? (requireSetup ? 'setup' : 'single') : 'unavailable';
    }
    this.unlocked = this.mode === 'single';
  }

  status() {
    return {mode: this.mode, unlocked: this.unlocked,
      ...(this.mode === 'account' && this.unlocked && {user: this.record.user})};
  }

  persist(record) {
    const temp = this.file + '.' + randomBytes(8).toString('hex') + '.tmp';
    try {
      fs.mkdirSync(path.dirname(this.file), {recursive: true});
      fs.writeFileSync(temp, JSON.stringify(record) + '\n', {mode: 0o600, flag: 'wx'});
      fs.renameSync(temp, this.file);
    } finally {
      try { fs.rmSync(temp, {force: true}); } catch (_) { /* không ghi đè cấu hình đang dùng */ }
    }
    this.record = record;
    this.mode = record.mode;
    this.unlocked = true;
  }

  async request(action, credentials) {
    if (this.mode === 'unavailable') return bad('Không đọc được cấu hình tài khoản trên máy. Kiểm tra quyền truy cập hoặc liên hệ quản trị viên.');
    if (this.busy) return bad('Đang xử lý tài khoản. Vui lòng đợi.');
    const create = action === 'create' && (this.mode === 'single' || this.mode === 'setup');
    const verify = this.mode === 'account' && (action === 'login' ? !this.unlocked : action === 'disable' && this.unlocked);
    if (!create && !verify) return bad('Thao tác tài khoản không khả dụng ở chế độ hiện tại.');
    if (verify && this.retryAt > this.now()) return bad('Bạn đã nhập sai nhiều lần. Hãy đợi 30 giây rồi thử lại.');

    const user = userName(credentials?.user), password = credentials?.password;
    if (create && (!user || user.length > 64 || /[\p{Cc}\p{Cf}\s]/u.test(user))) return bad('Tên đăng nhập phải có 1–64 ký tự và không chứa khoảng trắng.');
    if (create && !validPassword(password)) return bad('Mật khẩu phải có ít nhất 8 ký tự và tối đa 256 byte.');
    if (create && password !== credentials.confirm) return bad('Mật khẩu nhập lại chưa khớp.');

    this.busy = true;
    try {
      if (create) {
        const salt = randomBytes(32).toString('hex');
        const hash = (await derive(password, Buffer.from(salt, 'hex'), 32, COST)).toString('hex');
        this.persist({version: 1, mode: 'account', user, salt, hash});
      } else {
        const candidate = validPassword(password) ? password : '';
        const hash = await derive(candidate, Buffer.from(this.record.salt, 'hex'), 32, COST);
        if (!timingSafeEqual(hash, Buffer.from(this.record.hash, 'hex')) || user !== this.record.user) {
          if (++this.failures >= 5) { this.retryAt = this.now() + 30000; this.failures = 0; }
          return bad('Tên đăng nhập hoặc mật khẩu không đúng.');
        }
        this.failures = 0;
        this.retryAt = 0;
        if (action === 'disable') this.persist({version: 1, mode: 'single'});
        else this.unlocked = true;
      }
      return {ok: true, ...this.status()};
    } catch (_) {
      return bad('Không xử lý được cấu hình tài khoản. Kiểm tra quyền ghi và dung lượng rồi thử lại.');
    } finally {
      this.busy = false;
    }
  }
}

module.exports = {LocalAccount};
